export type ArticleShare = { articles: number; reviews: number; ratio: number | null };
export type WorkStatistics = {
  countsByYear: { year: number; worksCount: number }[];
  annualCountsStatus: "success" | "error";
  articleShare: ArticleShare | null;
  articleShareStatus: "success" | "error";
};
type Group = { key: string; count: number };
type Request = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

function readGroups(payload: unknown): Group[] {
  if (!payload || typeof payload !== "object" || !("group_by" in payload) || !Array.isArray(payload.group_by)) {
    throw new Error("OpenAlex did not return grouped counts");
  }
  return payload.group_by.map((entry: unknown) => {
    if (!entry || typeof entry !== "object" || !("key" in entry) || !("count" in entry) ||
      typeof entry.key !== "string" || typeof entry.count !== "number" ||
      !Number.isSafeInteger(entry.count) || entry.count < 0) throw new Error("Invalid OpenAlex group");
    return { key: entry.key, count: entry.count };
  });
}

export function summarizeTypes(payload: unknown): ArticleShare {
  const groups = readGroups(payload);
  const count = (type: string) => groups.filter(g => g.key === type || g.key.endsWith("/" + type))
    .reduce((total, group) => total + group.count, 0);
  const articles = count("article"), reviews = count("review");
  return { articles, reviews, ratio: articles + reviews > 0 ? articles / (articles + reviews) : null };
}

export async function fetchWorkStatistics(source: string, request: Request = url => fetch(url, { signal: AbortSignal.timeout(15000) })): Promise<WorkStatistics> {
  const empty: WorkStatistics = { countsByYear: [], annualCountsStatus: "error", articleShare: null, articleShareStatus: "error" };
  const sourceId = source.split("/").pop();
  if (!sourceId || !/^S\d+$/.test(sourceId)) return empty;
  const grouped = async (groupBy: string) => {
    const params = new URLSearchParams({
      filter: `primary_location.source.id:${sourceId},type:article|review`,
      group_by: groupBy, "per-page": "200",
    });
    // Fixed timeout prevents one unavailable endpoint from holding the whole detail view.
    const response = await request(`https://api.openalex.org/works?${params}`);
    if (!response.ok) throw new Error("OpenAlex Works query failed");
    return response.json();
  };
  const [annual, types] = await Promise.allSettled([grouped("publication_year"), grouped("type")]);
  const result = { ...empty };
  if (annual.status === "fulfilled") {
    try {
      result.countsByYear = readGroups(annual.value)
        .filter(g => /^\d{4}$/.test(g.key))
        .map(g => ({ year: Number(g.key), worksCount: g.count })).sort((a, b) => b.year - a.year);
      result.annualCountsStatus = "success";
    } catch { /* do not substitute unfiltered Sources counts */ }
  }
  if (types.status === "fulfilled") {
    try { result.articleShare = summarizeTypes(types.value); result.articleShareStatus = "success"; }
    catch { /* unavailable counts are not zero counts */ }
  }
  return result;
}
