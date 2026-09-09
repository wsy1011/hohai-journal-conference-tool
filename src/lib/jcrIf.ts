export type JcrIfSeries = Record<string, number>;
let cache: Record<string, JcrIfSeries> | null = null;

function normalizeIssn(value: string): string { return value.replace(/[^0-9xX]/g, "").toUpperCase(); }
function normalizeName(value: string): string { return value.toLocaleLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, ""); }

export async function fetchJcrIfSeries(issn: string, name = ""): Promise<JcrIfSeries> {
  if (!issn || issn === "/") return {};
  if (!cache) {
    const response = await fetch(`${import.meta.env.BASE_URL}data/jcr-if.json`);
    if (!response.ok) return {};
    cache = await response.json() as Record<string, JcrIfSeries>;
  }
  return { ...(cache[`name:${normalizeName(name)}`] || {}), ...(cache[`issn:${normalizeIssn(issn)}`] || {}) };
}
