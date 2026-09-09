import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(r"C:\Users\wsy11\Downloads\ShowJCR-master\中科院分区表及JCR原始数据文件")
OUT = ROOT / "public" / "data" / "jcr-if.json"

def norm_issn(value: str) -> str:
    return re.sub(r"[^0-9xX]", "", value or "").upper()

def norm_name(value: str) -> str:
    return re.sub(r"[^a-z0-9\u4e00-\u9fff]", "", (value or "").lower())

result = {}
for path in sorted(SOURCE.glob("JCR*-UTF8.csv")):
    match = re.search(r"JCR(\d{4})", path.name)
    if not match:
        continue
    year = match.group(1)
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            issn = norm_issn(row.get("ISSN", "")) or norm_issn(row.get("EISSN", ""))
            name_key = f"name:{norm_name(row.get('Journal', ''))}"
            if not issn and name_key == "name:":
                continue
            if not row.get("Journal"):
                continue
            if_key = next((field for field in row if re.fullmatch(r"IF\s*\(?(\d{4})\)?", field.strip()) and re.search(r"\d{4}", field).group(0) == year), None)
            raw = (row.get(if_key, "") or "").strip() if if_key else ""
            try:
                value = float(raw)
            except ValueError:
                continue
            result.setdefault(name_key, {})[year] = value
            if issn:
                result.setdefault(f"issn:{issn}", {})[year] = value

OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(json.dumps({"journals": len(result), "years": sorted({year for values in result.values() for year in values})}, ensure_ascii=False))
