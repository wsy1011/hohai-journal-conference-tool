import json
import re
import unicodedata
from collections import Counter
from pathlib import Path


GRADE_RE = re.compile(r"^(.+?)\s+(\S+)\s+(A\+|A|B|C)$")
ROW_RE = re.compile(r"^(\d+)\s+(.+)$")
CODE_RE = re.compile(r"^(?:/|\d{4}-\d{3}[\dXx]|\d{2}-\d{4}/[A-Za-z0-9]+)$")


def clean_line(line: str) -> str:
    line = line.replace("\x00", "").replace("\u00a0", " ").strip()
    return re.sub(r"\s+", " ", line)


def normalize_name(name: str) -> str:
    text = unicodedata.normalize("NFKC", name).casefold()
    text = text.replace("&", "and")
    text = re.sub(r"[（(].*?(?:原|formerly).*?[）)]", "", text)
    text = re.sub(r"[^0-9a-z\u4e00-\u9fff]+", "", text)
    return text


def parse_section(catalog: dict, section: str, first_page: int, last_page: int) -> tuple[list, list]:
    rows = []
    failures = []
    pending = None

    def finish_pending() -> None:
        nonlocal pending
        if not pending:
            return
        combined = clean_line(" ".join(pending["parts"]))
        match = GRADE_RE.match(combined)
        if match and CODE_RE.match(match.group(2)):
            name, code, grade = match.groups()
            rows.append(
                {
                    "year": catalog["year"],
                    "section": section,
                    "sequence": pending["sequence"],
                    "name": name.strip(),
                    "code": code.upper(),
                    "grade": grade,
                    "page": pending["page"],
                    "normalized_name": normalize_name(name),
                }
            )
        else:
            failures.append(
                {
                    "page": pending["page"],
                    "sequence": pending["sequence"],
                    "text": combined,
                }
            )
        pending = None

    for page in catalog["pages"]:
        if not first_page <= page["page"] <= last_page:
            continue
        for raw_line in page["text"].splitlines():
            line = clean_line(raw_line)
            if not line:
                continue
            if line.startswith("序号 ") or line in {
                "河海大学高质量论文期刊及学术会议目录",
                "（自然科学类）",
                "(自然科学类)",
                "附件1-1",
                "附件1-2",
            }:
                continue
            if line.startswith("备注：") or line.startswith("CCF目录") or line.startswith("学科按照"):
                finish_pending()
                continue
            if re.fullmatch(r"\d+", line):
                number = int(line)
                if number != page["page"] and number > catalog["page_count"]:
                    finish_pending()
                    pending = {"sequence": number, "page": page["page"], "parts": []}
                continue
            match = ROW_RE.match(line)
            if match:
                finish_pending()
                pending = {
                    "sequence": int(match.group(1)),
                    "page": page["page"],
                    "parts": [match.group(2)],
                }
            elif pending:
                if line.startswith("（信息与通信工程") or line.startswith("软件工程、智能科学"):
                    continue
                pending["parts"].append(line)
        finish_pending()
    return rows, failures


def main() -> None:
    catalogs = json.loads(Path("catalog_pages.json").read_text(encoding="utf-8"))
    all_rows = []
    all_failures = []
    for catalog in catalogs:
        if catalog["year"] == 2024:
            sections = [("2024目录", 1, catalog["page_count"])]
        else:
            sections = [("2026综合目录", 1, 96), ("2026计算机专项目录", 97, 125)]
        for section, first_page, last_page in sections:
            rows, failures = parse_section(catalog, section, first_page, last_page)
            all_rows.extend(rows)
            all_failures.extend(
                {"year": catalog["year"], "section": section, **item} for item in failures
            )

    Path("catalog_rows.json").write_text(
        json.dumps(all_rows, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    Path("catalog_parse_failures.json").write_text(
        json.dumps(all_failures, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    counts = Counter((row["year"], row["section"]) for row in all_rows)
    print(json.dumps({"counts": {str(k): v for k, v in counts.items()}, "failures": len(all_failures)}, ensure_ascii=False))
    if all_failures:
        print(json.dumps(all_failures[:20], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
