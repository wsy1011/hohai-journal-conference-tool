import { useMemo, useState } from "react";
import type { CatalogItem } from "../data/catalog";
import { gradeRank, compareCatalogNames, compare2026 } from "../data/catalog";
import { scoreResearchRelevance } from "../data/researchTopics";

export type SortMode = "relevance" | "name" | "gradeFirst" | "gradeLast" | "status";
export type QueryState = { q: string; type: "全部" | "期刊" | "会议" | "其他"; grades: string[]; status: string; researchOnly: boolean; sort: SortMode; page: number };
const PAGE_SIZE = 50;

function readHash(): Partial<QueryState> {
  const params = new URLSearchParams(location.hash.replace(/^#\/?/, ""));
  const rawStatus = params.get("status") || "";
  const status = rawStatus === "2026新增" ? "新增" : rawStatus === "2026未收录" || rawStatus === "2024未收录" || rawStatus === "2022未收录" ? "未收录" : rawStatus;
  return {
    q: params.get("q") || undefined,
    type: (params.get("type") as QueryState["type"]) || undefined,
    grades: params.get("grades")?.split(",").filter(Boolean),
    status: status || undefined,
    researchOnly: params.get("research") === "1" ? true : undefined,
    sort: (params.get("sort") as SortMode) || undefined,
    page: Number(params.get("page")) || undefined,
  };
}

function writeHash(state: QueryState) {
  const params = new URLSearchParams();
  const discipline = new URLSearchParams(location.hash.replace(/^#\/?/, "")).get("discipline");
  if (discipline) params.set("discipline", discipline);
  if (state.q) params.set("q", state.q);
  if (state.type !== "全部") params.set("type", state.type);
  if (state.grades.length) params.set("grades", state.grades.join(","));
  if (state.status) params.set("status", state.status);
  if (state.researchOnly) params.set("research", "1");
  if (state.sort !== "gradeLast") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  history.replaceState(null, "", params.toString() ? `#${params}` : location.pathname);
}

export function useCatalogQuery(items: CatalogItem[], yearColumns: string[]) {
  const initial = readHash();
  const [state, setState] = useState<QueryState>({ q: initial.q || "", type: initial.type || "全部", grades: initial.grades || [], status: initial.status || "", researchOnly: initial.researchOnly || false, sort: initial.sort || "gradeLast", page: initial.page || 1 });
  const result = useMemo(() => {
    const query = state.q.trim().toLocaleLowerCase();
    const filtered = items.map((item) => ({ item, relevance: scoreResearchRelevance(item) })).filter(({ item, relevance }) => {
      const searchable = [item.name, ...item.aliases, item.issn, ...item.relatedTopics, ...relevance.topics].join(" ").toLocaleLowerCase();
      const gradeMatch = !state.grades.length || state.grades.some((grade) => yearColumns.some((year) => (item.grades[year] || "").split("/").map(value => value.trim()).includes(grade)));
      return (!query || searchable.includes(query)) && (state.type === "全部" || item.type === state.type) && gradeMatch && (!state.status || item.status === state.status) && (!state.researchOnly || relevance.score > 0);
    });
    filtered.sort((a, b) => {
      if (state.sort === "name") return compareCatalogNames(a.item.name, b.item.name);
      if (state.sort === "gradeFirst") return gradeRank(b.item.grades[yearColumns[0]] || "") - gradeRank(a.item.grades[yearColumns[0]] || "");
      if (state.sort === "gradeLast") return compare2026(a.item, b.item);
      if (state.sort === "status") return a.item.status.localeCompare(b.item.status);
      return b.relevance.score - a.relevance.score || a.item.name.localeCompare(b.item.name);
    });
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const page = Math.min(state.page, pageCount);
    return { filtered, pageCount, page, rows: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
  }, [items, state, yearColumns]);

  function update(patch: Partial<QueryState>) {
    setState((previous) => {
      const next = { ...previous, ...patch, page: patch.page ?? 1 };
      writeHash(next);
      return next;
    });
  }
  function setPage(page: number) { update({ page }); }
  return { state, result, update, setPage, pageSize: PAGE_SIZE };
}
