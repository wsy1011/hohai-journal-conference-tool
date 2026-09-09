import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("public/data/catalog-manifest.json", "utf8"));
for (const discipline of ["natural", "computer", "social"]) {
  const items = JSON.parse(await readFile(`public/data/catalog-${discipline}.json`, "utf8"));
  if (items.length !== manifest[discipline].count) throw new Error(`${discipline} manifest count mismatch`);
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`${discipline} IDs are not unique`);
  for (const item of items) {
    for (const field of ["id", "name", "type", "grades", "sourcePages", "status", "relatedTopics"]) if (!(field in item)) throw new Error(`Missing ${field} in ${discipline}`);
    if (!["期刊", "会议", "其他"].includes(item.type)) throw new Error(`Invalid type in ${item.name}`);
  }
}
console.log(`Catalog shape OK: ${Object.values(manifest).map((entry) => `${entry.label} ${entry.count}`).join("；")}`);
