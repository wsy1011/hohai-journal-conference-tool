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


def script_variant(name: str) -> str:
    # 中文刊名条目与英文刊名条目视为两条独立记录。
    return "zh" if re.search(r"[\u4e00-\u9fff]", name) else "latin"


def key_for(item):
    # 同一 ISSN 可能以中英文两个刊名分别列出（例如 Chinese Chemical Letters /
    # 中国化学快报（英文版）），等级各按各自的条目；同一刊名的写法差异（大小写、
    # 标点、"The" 等）仍归并到同一条记录。
    code = clean(str(item.get("issn", "/"))) or "/"
    if code != "/":
        return f"code:{code}|{script_variant(item['name'])}"
    return f"name:{norm_name(item['name'])}"


def add_row(store, row):
    key = key_for(row)
    if row.get("issn", "/") == "/":
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


def propagate_single_variant_grade(store):
    """某一年目录里只出现了一种刊名时，把该等级同步给同 ISSN 的另一条刊名记录。

    例如 2026 年综合目录只列了「地质学报（英文版）」，那么同刊的英文记录也显示
    2026 的等级；反之亦然。若某年两种刊名都列了（2024 年的大部分重复条目就是
    这种情况），两条记录各自保留自己那一行的等级，不做合并。
    """
    by_code = {}
    for item in store.values():
        code = clean(str(item.get("issn", "/")))
        if code and code != "/":
            by_code.setdefault(code, []).append(item)
    for group in by_code.values():
        if len(group) < 2:
            continue
        for year in ("2022", "2024", "2026"):
            values = {item["grades"][year] for item in group if item["grades"][year]}
            if len(values) != 1:
                continue
            value = values.pop()
            for item in group:
                if not item["grades"][year]:
                    item["grades"][year] = value


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


ROWS_FILE = ROOT / "catalog_rows.json"
if not ROWS_FILE.exists():
    raise SystemExit(
        "缺少 catalog_rows.json：该文件不入库，需要先用 extract_catalogs.py 与 parse_catalogs.py "
        "从本地原始目录 PDF 生成（或从备份恢复）后再运行 data:build；"
        "public/data 下的三份 catalog-*.json 已是可直接使用的最终数据。"
    )
rows_catalog = json.loads(ROWS_FILE.read_text(encoding="utf-8"))
datasets = {"natural": {}, "computer": {}, "social": {}}
failures = []

JOURNAL_NAME_RE = re.compile(r"journal|transactions|proceedings|magazine|letters|review|bulletin|学报|杂志|通报|评论", re.I)


def row_type(row):
    # 与 analyze_catalogs.item_type 一致：带 CN/ISSN 的按期刊处理，纯名称条目再按关键词判断。
    if clean(str(row.get("code", "/"))) not in {"", "/"}:
        return "期刊"
    return "期刊" if JOURNAL_NAME_RE.search(row["name"]) else "会议"


def row_seed(row, year):
    return {"name": row["name"], "aliases": [], "issn": clean(str(row.get("code", "/"))) or "/",
            "publisher": "", "type": row_type(row), "year": year,
            "grade": row["grade"], "sourcePage": str(row.get("page", ""))}


# Seed the 2024/2026 natural-science and computer records from the per-row parse
# (catalog_rows.json) so each listed title keeps its own grade and page.
rows_2024 = [row for row in rows_catalog if str(row.get("year")) == "2024"]
rows_2026_general = [row for row in rows_catalog if row.get("section") == "2026综合目录"]
rows_2026_computer = [row for row in rows_catalog if row.get("section") == "2026计算机专项目录"]

for row in rows_2026_computer:
    add_row(datasets["computer"], row_seed(row, 2026))
for row in rows_2026_general:
    add_row(datasets["natural"], row_seed(row, 2026))
for row in rows_2024:
    add_row(datasets["natural"], row_seed(row, 2024))
# 计算机专项目录没有 2024 版，沿用 2024 自然科学综合目录里同 ISSN 的条目
# （中英文刊名各自成一条记录）。
computer_issns = {item["issn"] for item in datasets["computer"].values() if item["issn"] != "/"}
for row in rows_2024:
    seed = row_seed(row, 2024)
    if seed["issn"] in computer_issns or key_for(seed) in datasets["computer"]:
        add_row(datasets["computer"], seed)

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
    propagate_single_variant_grade(store)
    data = finalize(store)
    manifest[discipline]["count"] = len(data)
    (PUBLIC / f"catalog-{discipline}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
(PUBLIC / "catalog-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
(ROOT / "catalog_multi_failures.json").write_text(json.dumps(failures, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"counts": {key: value["count"] for key, value in manifest.items()}, "failures": len(failures)}, ensure_ascii=False))
