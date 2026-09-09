import type { CatalogManifestEntry, Discipline } from "../data/catalog";

type Props = { manifest: Record<Discipline, CatalogManifestEntry>; onChoose: (discipline: Discipline) => void };

export function DisciplineChooser({ manifest, onChoose }: Props) {
  const entries: Discipline[] = ["computer", "natural", "social"];
  return <main className="discipline-chooser"><div className="chooser-mark" aria-hidden="true" /><h1 className="chooser-title">河海大学高质量论文期刊及学术会议目录查询工具</h1><p className="chooser-intro">请选择你要检索的学科类型。不同学科使用各自的目录口径。选择后进入对应数据库，可随时切换。</p><div className="discipline-grid">{entries.map((id) => { const entry = manifest[id]; return <button key={id} className={`discipline-card discipline-${id}`} onClick={() => onChoose(id)}><span className="card-kicker">{entry.yearColumns.join(" · ")}</span><strong>{entry.label}</strong><span>{entry.note}</span><small>{entry.count.toLocaleString()} 条目录条目</small><span className="card-arrow">→</span></button>; })}</div></main>;
}
