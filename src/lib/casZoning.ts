export type CasYear = { large: string; small: string[]; top: boolean };
export type CasSeries = Record<string, CasYear>;
let cache: Record<string, CasSeries> | null = null;
function normalize(value: string) { return value.replace(/[^0-9xX]/g, "").toUpperCase(); }
export async function fetchCasSeries(issn: string): Promise<CasSeries> {
  if (!issn || issn === "/") return {};
  if (!cache) { const response = await fetch(`${import.meta.env.BASE_URL}data/cas-zoning.json`); if (!response.ok) return {}; cache = await response.json() as Record<string, CasSeries>; }
  return cache[`issn:${normalize(issn)}`] || {};
}
