export type Discipline = "natural" | "computer" | "social";
export type CatalogType = "期刊" | "会议" | "其他";

export type CatalogItem = {
  id: string;
  type: CatalogType;
  name: string;
  aliases: string[];
  issn: string;
  publisher: string;
  grades: Record<string, string>;
  status: string;
  direction: string;
  relatedTopics: string[];
  sourcePages: Record<string, string>;
};

export type CatalogManifestEntry = { id: Discipline; label: string; yearColumns: string[]; columnLabels: Record<string, string>; note: string; count: number };
export type CatalogManifest = Record<Discipline, CatalogManifestEntry>;

export async function loadCatalogBundle(discipline: Discipline): Promise<{ items: CatalogItem[]; meta: CatalogManifestEntry }> {
  const base = import.meta.env.BASE_URL;
  const [manifestResponse, catalogResponse] = await Promise.all([fetch(`${base}data/catalog-manifest.json`), fetch(`${base}data/catalog-${discipline}.json`)]);
  if (!manifestResponse.ok || !catalogResponse.ok) throw new Error(`${discipline} 目录数据加载失败`);
  const manifest = await manifestResponse.json() as CatalogManifest;
  const items = await catalogResponse.json() as CatalogItem[];
  if (!manifest[discipline]) throw new Error(`未知学科目录：${discipline}`);
  return { items, meta: manifest[discipline] };
}

export function gradeRank(value: string): number {
  const grade = value.split("/")[0]?.trim();
  return { "A+": 4, A: 3, B: 2, C: 1 }[grade as "A+" | "A" | "B" | "C"] || 0;
}
// Within a grade: Latin titles A–Z, then Chinese titles by pinyin.
const titleCollator = new Intl.Collator('zh-CN-u-co-pinyin', { sensitivity: 'base', numeric: true });
export function compareCatalogNames(a: string, b: string): number {
  const latinA = /^[A-Za-z]/.test(a.trim());
  const latinB = /^[A-Za-z]/.test(b.trim());
  return Number(latinB) - Number(latinA) || titleCollator.compare(a, b);
}
export function compare2026(a: CatalogItem, b: CatalogItem): number {
  return gradeRank(b.grades['2026'] || '') - gradeRank(a.grades['2026'] || '') || compareCatalogNames(a.name, b.name);
}
