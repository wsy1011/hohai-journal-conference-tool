import type { QueryState, SortMode } from "../hooks/useCatalogQuery";
import type { CatalogManifestEntry } from "../data/catalog";

type Props = { state: QueryState; total: number; meta: CatalogManifestEntry; onUpdate: (patch: Partial<QueryState>) => void; onSwitch: () => void };

const grades = ["A+", "A", "B", "C"];

export function SearchControls({ state, total, meta, onUpdate, onSwitch }: Props) {
  return <>
    <section className="hero-row">
      <div><div className="discipline-heading"><button className="discipline-switch" onClick={onSwitch}>切换学科</button></div><h1>{meta.label}目录</h1><p>按名称、CN/ISSN、等级和目录变化快速定位。</p></div>
    </section>
    <section className="search-row">
      <label className="search-box"><span aria-hidden="true">⌕</span><input value={state.q} onChange={(event) => onUpdate({ q: event.target.value })} placeholder="搜索刊物、会议、CN/ISSN 或研究主题" aria-label="搜索刊物、会议、CN/ISSN 或研究主题" /></label>
    </section>
    <section className="filters" aria-label="目录筛选">
      <span className="filter-label">类型</span>{["全部", "期刊", "会议", "其他"].map((type) => <button key={type} className={`pill ${state.type === type ? "selected" : ""}`} onClick={() => onUpdate({ type: type as QueryState["type"] })}>{type}</button>)}
      <span className="filter-label">等级</span>{grades.map((grade) => <button key={grade} className={`pill ${state.grades.includes(grade) ? "selected" : ""}`} onClick={() => onUpdate({ grades: state.grades.includes(grade) ? state.grades.filter((value) => value !== grade) : [...state.grades, grade] })}>{grade}</button>)}
      <span className="filter-label">状态</span>{["等级变化", "新增", "部分年份收录"].map((status) => <button key={status} className={`pill ${state.status === status ? "selected" : ""}`} onClick={() => onUpdate({ status: state.status === status ? "" : status })}>{status}</button>)}
      <span className="filter-spacer" /><label className="sort-select">排序 <select value={state.sort} onChange={(event) => onUpdate({ sort: event.target.value as SortMode })}><option value="relevance">相关度</option><option value="name">名称</option><option value="gradeFirst">{meta.columnLabels[meta.yearColumns[0]]}</option><option value="gradeLast">{meta.columnLabels[meta.yearColumns.at(-1) || ""]}</option><option value="status">状态</option></select></label>
    </section>
    <div className="scope-note"><strong>目录口径</strong><span>{meta.note}</span></div>
    <div className="result-meta"><strong>检索到 {total.toLocaleString()} 条结果</strong><span>{meta.yearColumns.map((year) => meta.columnLabels[year]).join(" · ")}</span></div>
  </>;
}
