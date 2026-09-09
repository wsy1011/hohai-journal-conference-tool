import json
import re
from collections import defaultdict
from pathlib import Path


GRADE_ORDER = {"A+": 4, "A": 3, "B": 2, "C": 1}
CONFERENCE_WORDS = re.compile(
    r"conference|symposium|workshop|congress|meeting|forum|colloquium|seminar|"
    r"school|challenge|competition|会议|大会|论坛|研讨会",
    re.IGNORECASE,
)
JOURNAL_WORDS = re.compile(
    r"journal|transactions|proceedings|magazine|letters|review|bulletin",
    re.IGNORECASE,
)


def entry_key(row: dict) -> str:
    if row["code"] != "/":
        return f"code:{row['code'].upper()}"
    return f"name:{row['normalized_name']}"


def item_type(rows: list[dict]) -> str:
    if all(row["code"] == "/" for row in rows):
        if any(JOURNAL_WORDS.search(row["name"]) for row in rows):
            return "期刊"
        return "会议"
    return "期刊"


def joined(values) -> str:
    return " / ".join(sorted(set(values), key=lambda value: (-GRADE_ORDER.get(value, 0), value)))


def page_list(rows: list[dict]) -> str:
    return ", ".join(str(value) for value in sorted({row["page"] for row in rows}))


def main() -> None:
    rows = json.loads(Path("catalog_rows.json").read_text(encoding="utf-8"))
    grouped = defaultdict(list)
    for row in rows:
        grouped[entry_key(row)].append(row)

    merged = []
    for key, items in grouped.items():
        by_section = defaultdict(list)
        for item in items:
            by_section[item["section"]].append(item)

        rows_2024 = by_section.get("2024目录", [])
        rows_general = by_section.get("2026综合目录", [])
        rows_ccf = by_section.get("2026计算机专项目录", [])
        rows_2026 = rows_general + rows_ccf
        names = rows_general or rows_ccf or rows_2024
        name = names[0]["name"]
        aliases = []
        for item in items:
            if item["name"] != name and item["name"] not in aliases:
                aliases.append(item["name"])

        grade_2024 = joined(row["grade"] for row in rows_2024)
        grade_general = joined(row["grade"] for row in rows_general)
        grade_ccf = joined(row["grade"] for row in rows_ccf)
        grades_2026 = {row["grade"] for row in rows_2026}
        grades_2024 = {row["grade"] for row in rows_2024}

        if rows_2024 and not rows_2026:
            status = "2026未收录"
        elif rows_2026 and not rows_2024:
            status = "2026新增"
        elif grades_2024 == grades_2026:
            status = "等级未变"
        else:
            status = "等级变化"

        change_parts = []
        if grade_2024:
            change_parts.append(f"2024：{grade_2024}")
        if grade_general:
            change_parts.append(f"2026综合：{grade_general}")
        if grade_ccf:
            change_parts.append(f"2026计算机专项：{grade_ccf}")

        direction = ""
        if status == "等级变化" and len(grades_2024) == 1 and len(grades_2026) == 1:
            old = next(iter(grades_2024))
            new = next(iter(grades_2026))
            if GRADE_ORDER[new] > GRADE_ORDER[old]:
                direction = "上调"
            elif GRADE_ORDER[new] < GRADE_ORDER[old]:
                direction = "下调"
        elif status == "等级变化":
            direction = "分目录等级不同"

        merged.append(
            {
                "key": key,
                "type": item_type(items),
                "name": name,
                "aliases": "；".join(aliases),
                "code": next((row["code"] for row in items if row["code"] != "/"), "/"),
                "grade_2024": grade_2024,
                "grade_2026_general": grade_general,
                "grade_2026_ccf": grade_ccf,
                "status": status,
                "direction": direction,
                "change_detail": "；".join(change_parts),
                "page_2024": page_list(rows_2024),
                "page_2026_general": page_list(rows_general),
                "page_2026_ccf": page_list(rows_ccf),
            }
        )

    status_order = {"等级变化": 0, "2026新增": 1, "2026未收录": 2, "等级未变": 3}
    merged.sort(key=lambda item: (status_order[item["status"]], item["type"], item["name"].casefold()))
    changed_journals = [item for item in merged if item["type"] == "期刊" and item["status"] == "等级变化"]

    Path("catalog_merged.json").write_text(
        json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    Path("changed_journals.json").write_text(
        json.dumps(changed_journals, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    summary = {
        "raw_rows": len(rows),
        "unique_items": len(merged),
        "journals": sum(item["type"] == "期刊" for item in merged),
        "conferences": sum(item["type"] == "会议" for item in merged),
        "changed_journals": len(changed_journals),
        "status_counts": {
            status: sum(item["status"] == status for item in merged)
            for status in status_order
        },
        "direction_counts": {
            direction: sum(item["direction"] == direction for item in changed_journals)
            for direction in ["上调", "下调", "分目录等级不同"]
        },
    }
    Path("catalog_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False))
    print(json.dumps(changed_journals[:15], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
