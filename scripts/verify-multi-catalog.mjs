import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("public/data/catalog-manifest.json", "utf8"));
for (const discipline of ["natural", "computer", "social"]) {
  const items = JSON.parse(await readFile(`public/data/catalog-${discipline}.json`, "utf8"));
  if (!items.length) throw new Error(`${discipline} 数据为空`);
  if (items.length !== manifest[discipline].count) throw new Error(`${discipline} count 不一致`);
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`${discipline} ID 重复`);
  for (const item of items) {
    if (!item.id || !item.name || !item.type || !item.grades || !item.sourcePages) throw new Error(`${discipline} 存在不完整条目`);
    if (!["期刊", "会议", "其他"].includes(item.type)) throw new Error(`${discipline} 类型非法：${item.type}`);
    for (const year of ["2022", "2024", "2026"]) if (!(year in item.grades)) throw new Error(`${discipline} 缺少 ${year} 字段`);
  }
}
console.log(`Multi-catalog verification OK: ${Object.entries(manifest).map(([key, value]) => `${key}=${value.count}`).join(", ")}`);
