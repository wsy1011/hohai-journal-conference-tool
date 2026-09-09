import csv, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SOURCE=Path(r"C:\Users\wsy11\Downloads\ShowJCR-master\中科院分区表及JCR原始数据文件")
OUT=ROOT/"public/data/cas-zoning.json"
def norm(v): return re.sub(r"[^0-9xX]","",v or "").upper()
def add(result,key,year,large,small,top):
    if not key: return
    entry=result.setdefault(f"issn:{key}",{}).setdefault(year,{"large":"","small":[],"top":False})
    entry["large"]=large
    entry["small"]=[x for x in small if x]
    entry["top"]=top
def zone_text(category, zone):
    category=(category or '').strip(); zone=(zone or '').strip()
    if not category or not zone: return ''
    chinese=re.search(r'[\u4e00-\u9fff].*$', category)
    if chinese: category=chinese.group(0).strip()
    zone=re.sub(r"\s*\[.*?\]", "", zone).strip()
    if zone.endswith('区'): return f"{category}{zone}"
    return f"{category}{zone}区"
result={}
for path in sorted(SOURCE.glob("FQBJCR*.csv")):
    m=re.search(r"FQBJCR(\d{4})",path.name)
    if not m: continue
    year=m.group(1)
    with path.open(encoding="utf-8-sig",newline="") as f:
        for row in csv.DictReader(f):
            ids=[norm(x) for x in (row.get("ISSN") or row.get("ISSN/EISSN") or "").split("/")]
            large=zone_text(row.get('大类'), row.get('大类分区'))
            small=[]
            for i in range(1,7):
                name=(row.get(f"小类{i}") or '').strip(); zone=(row.get(f"小类{i}分区") or '').strip()
                if name and zone: small.append(zone_text(name, zone))
            top=(row.get("Top") or '').strip() == "是"
            for key in ids: add(result,key,year,large,small,top)
OUT.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print(json.dumps({"journals":len(result),"years":sorted({y for x in result.values() for y in x})},ensure_ascii=False))
