import csv,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SOURCE=Path(r"C:\Users\wsy11\Downloads\ShowJCR-master\中科院分区表及JCR原始数据文件\XR2026-UTF8.csv")
OUT=ROOT/"public/data/xr-zoning.json"
def norm(v): return re.sub(r"[^0-9xX]","",v or "").upper()
def zone(cat, value):
    cat=(cat or '').strip(); value=(value or '').strip()
    m=re.search(r'[\u4e00-\u9fff].*$',cat)
    if m: cat=m.group(0).strip()
    value=re.sub(r'\s*\[[^\]]*\]','',value).strip()
    return f'{cat}{value}' if cat and value else ''
result={}
with SOURCE.open(encoding='utf-8-sig',newline='') as f:
    for row in csv.DictReader(f):
        ids=[norm(row.get('ISSN','')),norm(row.get('EISSN',''))]
        large=zone(row.get('大类中文名'),row.get('大类新锐分区'))
        small=[]
        for i in range(1,7):
            value=zone(row.get(f'小类{i}中文名'),row.get(f'小类{i}新锐分区'))
            if value: small.append(value)
        entry={'large':large,'small':small,'top':(row.get('Top') or '').strip() in {'是','Top'}}
        for key in ids:
            if key: result[f'issn:{key}']=entry
OUT.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'journals':len(result),'year':'2026'},ensure_ascii=False))
