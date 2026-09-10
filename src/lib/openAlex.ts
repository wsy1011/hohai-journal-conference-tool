import { fetchWorkStatistics, type WorkStatistics } from "./openAlexWorks";
export type OpenAlexYearCount = { year: number; worksCount: number };
export type OpenAlexState = { status: "idle" | "loading" } | { status: "success"; homepageUrl: string | null; countsByYear: OpenAlexYearCount[]; annualCountsStatus: WorkStatistics["annualCountsStatus"]; articleShare: WorkStatistics["articleShare"]; articleShareStatus: WorkStatistics["articleShareStatus"]; issn: string[]; publisher: string; foundingYear: number | null; isOa: boolean | null; isInDoaj: boolean | null; doajSinceYear: number | null; apcUsd: number | null } | { status: "not-found" | "error" };
export async function fetchJournalHomepage(name: string): Promise<OpenAlexState> {
  try {
    const response = await fetch(`https://api.openalex.org/sources?search=${encodeURIComponent(name)}&per-page=5&select=id,display_name,homepage_url,counts_by_year,issn_l,issn,host_organization_name,first_publication_year,ids,is_oa,is_in_doaj,is_in_doaj_since_year,apc_usd`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) return { status: "error" };
    const payload = await response.json() as { results?: { id?: string; display_name?: string; homepage_url?: string | null; counts_by_year?: { year?: number; works_count?: number }[]; issn_l?: string | null; issn?: string[]; host_organization_name?: string | null; first_publication_year?: number | null; ids?: { wikidata?: string | null }; is_oa?: boolean | null; is_in_doaj?: boolean | null; is_in_doaj_since_year?: number | null; apc_usd?: number | null }[] };
    const normalized = name.toLocaleLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
    const match = (payload.results || []).find((source) => {
      const candidate = (source.display_name || "").toLocaleLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
      return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate);
    });
    if (!match) return { status: "not-found" };
    const statistics = await fetchWorkStatistics(match.id || "");
    const issn = [...new Set([match.issn_l || "", ...(match.issn || [])].filter(Boolean))];
    let foundingYear = match.first_publication_year || null;
    const wikidataId = match.ids?.wikidata?.split("/").pop();
    if (wikidataId) {
      try {
        const wd = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`);
        const entity = await wd.json() as { entities?: Record<string, { claims?: Record<string, { mainsnak?: { datavalue?: { value?: { time?: string } } } }[]> }> };
        const time = entity.entities?.[wikidataId]?.claims?.P571?.[0]?.mainsnak?.datavalue?.value?.time;
        const year = time ? Number(time.slice(1, 5)) : NaN;
        if (Number.isFinite(year)) foundingYear = year;
      } catch { /* keep OpenAlex fallback year */ }
    }
    return { status: "success", homepageUrl: match.homepage_url || null, ...statistics, issn, publisher: match.host_organization_name || "", foundingYear, isOa: match.is_oa ?? null, isInDoaj: match.is_in_doaj ?? null, doajSinceYear: match.is_in_doaj_since_year ?? null, apcUsd: typeof match.apc_usd === "number" ? match.apc_usd : null };
  } catch { return { status: "error" }; }
}
