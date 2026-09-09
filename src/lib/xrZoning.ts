import type { CasYear } from "./casZoning";
let cache: Record<string, CasYear> | null = null;
function normalize(value: string) { return value.replace(/[^0-9xX]/g, "").toUpperCase(); }
export async function fetchXrSeries(issn: string): Promise<CasYear | null> {
  if (!issn || issn === "/") return null;
  if (!cache) { const response = await fetch(`${import.meta.env.BASE_URL}data/xr-zoning.json`); if (!response.ok) return null; cache = await response.json() as Record<string, CasYear>; }
  return cache[`issn:${normalize(issn)}`] || null;
}
