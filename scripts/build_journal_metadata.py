import csv, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(r"C:\Users\wsy11\Downloads\ShowJCR-master\中科院分区表及JCR原始数据文件\XR2026-UTF8.csv")
OUT = ROOT / "public/data/journal-metadata.json"
def norm(v): return re.sub(r"[^0-9xX]", "", v or "").upper()
data = {}
with SOURCE.open(encoding="utf-8-sig", newline="") as f:
    for row in csv.DictReader(f):
        issn, eissn = norm(row.get("ISSN")), norm(row.get("EISSN"))
        value = {"issn": row.get("ISSN") or "", "eissn": row.get("EISSN") or "", "publisher": row.get("出版机构") or ""}
        for key in [issn, eissn]:
            if key: data[f"issn:{key}"] = value
OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(json.dumps({"journals": len(data)}, ensure_ascii=False))
