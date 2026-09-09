import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXTRACTED = ROOT / "extra_extracted"
PUBLIC = ROOT / "public" / "data"

SOURCES = {
    ("social", 2022): EXTRACTED / "2022_social.txt",
    ("social", 2024): EXTRACTED / "2024_social.txt",
    ("social", 2026): EXTRACTED / "2026_social.txt",
    ("natural", 2022): EXTRACTED / "2022_natural.txt",
    ("computer", 2022): EXTRACTED / "2022_computer.txt",
}

# Existing 2024/2026 natural-science and computer-special catalog rows are
# already normalized in public/data/catalog.json and are added below.

def clean(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "").replace("\u00a0", " ")
    return re.sub(r"\s+", " ", value).strip()


def norm_name(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold().replace("&", "and")
    return re.sub(r"[^0-9a-z\u4e00-\u9fff]+", "", value)


def classify_type(name: str) -> str:
    if re.search(r"检索论文|分区列表|期刊分区|人民日报|光明日报|经济日报|新华文摘|复印资料|社会科学文摘|政策建议|咨询报告|全文转载", name):
        return "其他"
    if re.search(r"journal|transactions|magazine|letters|review|bulletin", name, re.I):
        return "期刊"
    if re.search(r"conference|symposium|workshop|forum|大会|会议|研讨会", name, re.I):
        return "会议"
    return "期刊"


SOURCE_AUDIT = []


def parse_pdf(path: Path, year: int, discipline: str):
    import pdfplumber
    if year == 2022:
        number = {"natural": "1", "computer": "2", "social": "3"}[discipline]
        pdf = next((ROOT.parent / str(year)).glob(f"附件{number}*.pdf"))
    else:
        pdf = next((ROOT.parent / str(year)).glob("*.pdf"))
    rows, failures, sequences = [], [], []
    with pdfplumber.open(pdf) as document:
        for page_no, page in enumerate(document.pages, 1):
            for table in page.extract_tables():
                for cells in table:
                    if not cells or not re.fullmatch(r"\d+", clean(cells[0])):
                        continue
                    seq = int(clean(cells[0]))
                    sequences.append(seq)
                    if len(cells) != 4:
                        failures.append({"sequence": seq, "page": page_no, "cells": cells})
                        continue
                    name = clean(cells[1])
                    # A line wrap between Chinese characters is not part of the title.
                    name = re.sub(r"(?<=[\u4e00-\u9fff]) (?=[\u4e00-\u9fff])", "", name)
                    grade = clean(cells[3]).removesuffix("类").replace(" ", "")
                    if not name or grade not in {"A+", "A", "B", "C"}:
                        failures.append({"sequence": seq, "page": page_no, "cells": cells})
                        continue
                    rows.append({"name": name, "aliases": [], "issn": "/" if year == 2022 else clean(cells[2]),
                                 "publisher": "", "type": classify_type(name), "year": year,
                                 "grade": grade, "sourcePage": str(page_no), "sequence": seq})
    expected = {("natural", 2022): 497, ("computer", 2022): 683, ("social", 2022): 419,
                ("social", 2024): 1836, ("social", 2026): 1771}[(discipline, year)]
    missing = sorted(set(range(1, expected + 1)) - set(sequences))
    if missing or len(sequences) != expected:
        failures.append({"missingSequences": missing, "expected": expected, "observed": len(sequences)})
    SOURCE_AUDIT.append({"discipline": discipline, "year": year, "file": pdf.name,
                         "expected": expected, "parsed": len(rows), "failures": failures})
    return rows, failures


def key_for(item):
    if item.get("forceNameKey"):
        return f"name:{norm_name(item['name'])}"
    code = item.get("issn", "/")
    return f"code:{code}" if code and code != "/" else f"name:{norm_name(item['name'])}"


def add_row(store, row):
    key = key_for(row)
    if row.get("issn", "/") == "/" and not row.get("forceNameKey"):
        candidate = norm_name(row["name"])
        matches = [existing_key for existing_key, existing_item in store.items()
                   if candidate in {norm_name(n) for n in [existing_item["name"], *existing_item["aliases"]]}]
        if len(matches) == 1:
            key = matches[0]
    item = store.setdefault(key, {"id": key, "name": row["name"], "aliases": [], "type": row["type"], "issn": row.get("issn", "/"), "publisher": row.get("publisher", ""), "grades": {"2022": "", "2024": "", "2026": ""}, "sourcePages": {"2022": "", "2024": "", "2026": ""}, "relatedTopics": []})
    if row["name"] != item["name"] and row["name"].casefold() != item["name"].casefold() and row["name"] not in item["aliases"]:
        item["aliases"].append(row["name"])
    if row.get("publisher") and not item.get("publisher"):
        item["publisher"] = row["publisher"]
    for alias in row.get("aliases", []):
        if alias != item["name"] and alias not in item["aliases"]:
            item["aliases"].append(alias)
    year = str(row["year"])
    previous = item["grades"][year]
    grade_set = set(previous.split(" / ")) | set(row["grade"].split(" / "))
    item["grades"][year] = " / ".join(g for g in ["A+", "A", "B", "C"] if g in grade_set)
    item["sourcePages"][str(row["year"])] = row.get("sourcePage", "")
    if item["type"] == "期刊" and row["type"] != "期刊":
        item["type"] = row["type"]


def finalize(items):
    for item in items.values():
        grades = [item["grades"][str(year)] for year in (2022, 2024, 2026)]
        present = [bool(value) for value in grades]
        changes = any(grades[i] and grades[i + 1] and grades[i] != grades[i + 1] for i in range(2))
        if changes:
            status = "等级变化"
        elif present[0] and not present[1] and not present[2]:
            status = "未收录"
        elif not present[0] and present[1] and not present[2]:
            status = "部分年份收录"
        elif not present[0] and not present[1] and present[2]:
            status = "新增"
        elif not present[0] or not present[1] or not present[2]:
            status = "部分年份收录"
        else:
            status = "等级未变"
        item["status"] = status
        item["direction"] = ""
        item["relatedTopics"] = []
    return sorted(items.values(), key=lambda item: item["name"].casefold())


existing = json.loads((PUBLIC / "catalog.json").read_text(encoding="utf-8"))
datasets = {"natural": {}, "computer": {}, "social": {}}
failures = []

# Seed the normalized 2024/2026 natural and computer records first. This lets
# legacy 2022 rows match the canonical journal title even when the PDF places
# the publisher or institute name on the same visual line.
for old in existing:
    if old.get("grade2024") or old.get("grade2026General"):
        seed = {"name": old["name"], "aliases": [], "issn": old.get("issn", "/"), "publisher": "", "type": old.get("type", "期刊"), "year": 2024, "grade": old.get("grade2024", ""), "sourcePage": old.get("sourcePages", {}).get("year2024", "")}
        if seed["grade"]:
            add_row(datasets["natural"], seed)
        if old.get("grade2026General"):
            add_row(datasets["natural"], {**seed, "year": 2026, "grade": old["grade2026General"], "sourcePage": old.get("sourcePages", {}).get("year2026General", "")})
        for alias in old.get("aliases", []):
            if re.search(r"[\u4e00-\u9fff]", alias) != re.search(r"[\u4e00-\u9fff]", old["name"]):
                add_row(datasets["natural"], {**seed, "name": alias, "forceNameKey": True})
                if old.get("grade2026General"):
                    add_row(datasets["natural"], {**seed, "name": alias, "forceNameKey": True, "year": 2026, "grade": old["grade2026General"]})
    if old.get("grade2026Computer"):
        seed = {"name": old["name"], "aliases": [], "issn": old.get("issn", "/"), "publisher": "", "type": old.get("type", "期刊"), "year": 2026, "grade": old["grade2026Computer"], "sourcePage": old.get("sourcePages", {}).get("year2026Computer", "")}
        add_row(datasets["computer"], seed)
        if old.get("grade2024"):
            add_row(datasets["computer"], {**seed, "year": 2024, "grade": old["grade2024"], "sourcePage": old.get("sourcePages", {}).get("year2024", "")})
        for alias in old.get("aliases", []):
            if re.search(r"[\u4e00-\u9fff]", alias) != re.search(r"[\u4e00-\u9fff]", old["name"]):
                add_row(datasets["computer"], {**seed, "name": alias, "forceNameKey": True})

for (discipline, year), path in sorted(SOURCES.items(), key=lambda entry: -entry[0][1]):
    rows, errors = parse_pdf(path, year, discipline)
    failures.extend({"discipline": discipline, "year": year, **error} for error in errors)
    for row in rows:
        add_row(datasets[discipline], row)

(ROOT / "catalog_multi_failures.json").write_text(json.dumps(failures, ensure_ascii=False, indent=2), encoding="utf-8")
(ROOT / "catalog_multi_audit.json").write_text(json.dumps(SOURCE_AUDIT, ensure_ascii=False, indent=2), encoding="utf-8")
if failures:
    raise RuntimeError("PDF extraction failed; see catalog_multi_failures.json")

manifest = {
    "natural": {"id": "natural", "label": "自然科学", "yearColumns": ["2022", "2024", "2026"], "columnLabels": {"2022": "2022 等级", "2024": "2024 等级", "2026": "2026 等级"}, "note": "自然科学类目录，2022 年不含计算机科学与技术、软件工程学科。"},
    "computer": {"id": "computer", "label": "计算机专项", "yearColumns": ["2022", "2024", "2026"], "columnLabels": {"2022": "2022 计算机专项", "2024": "2024 自然科学综合目录", "2026": "2026 计算机专项"}, "note": "2024 年没有独立计算机专项，使用 2024 自然科学综合目录作为参考。"},
    "social": {"id": "social", "label": "人文社科", "yearColumns": ["2022", "2024", "2026"], "columnLabels": {"2022": "2022 等级", "2024": "2024 等级", "2026": "2026 等级"}, "note": "人文社科类目录，含期刊、会议及其他成果。"},
}
for discipline, store in datasets.items():
    data = finalize(store)
    manifest[discipline]["count"] = len(data)
    (PUBLIC / f"catalog-{discipline}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
(PUBLIC / "catalog-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
(ROOT / "catalog_multi_failures.json").write_text(json.dumps(failures, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"counts": {key: value["count"] for key, value in manifest.items()}, "failures": len(failures)}, ensure_ascii=False))
