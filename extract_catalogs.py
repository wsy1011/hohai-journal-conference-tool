import json
import re
from pathlib import Path

from pypdf import PdfReader


def extract_pdf(path: Path) -> dict:
    reader = PdfReader(str(path))
    pages = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = text.replace("\u00a0", " ").replace("\r", "")
        pages.append({"page": page_number, "text": text})
    return {
        "file": path.name,
        "year": int(re.match(r"(\d{4})", path.name).group(1)),
        "page_count": len(reader.pages),
        "pages": pages,
    }


def main() -> None:
    catalogs = [extract_pdf(path) for path in sorted(Path(".").glob("*.pdf"))]
    Path("catalog_pages.json").write_text(
        json.dumps(catalogs, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    for catalog in catalogs:
        output = []
        for page in catalog["pages"]:
            output.append(f"\n===== PAGE {page['page']} =====\n")
            output.append(page["text"])
        Path(f"{catalog['year']}_extracted.txt").write_text(
            "".join(output), encoding="utf-8"
        )
    print(
        json.dumps(
            [
                {
                    "year": item["year"],
                    "file": item["file"],
                    "pages": item["page_count"],
                }
                for item in catalogs
            ],
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
