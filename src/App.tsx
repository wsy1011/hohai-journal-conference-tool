import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { DisciplineChooser } from "./components/DisciplineChooser";
import { JournalDrawer } from "./components/JournalDrawer";
import { ResultsTable } from "./components/ResultsTable";
import { SearchControls } from "./components/SearchControls";
import { SettingsDialog } from "./components/SettingsDialog";
import { loadCatalogBundle, type CatalogItem, type CatalogManifest, type Discipline } from "./data/catalog";
import { useCatalogQuery } from "./hooks/useCatalogQuery";
import { loadDefaultSecretKey } from "./lib/easyScholar";

const KEY_STORAGE = "hohai-journal-index:easyscholar-secret";
const DISCIPLINES: Discipline[] = ["natural", "computer", "social"];

function readDiscipline(): Discipline | null {
  const params = new URLSearchParams(location.hash.replace(/^#\/?/, ""));
  const value = params.get("discipline");
  return DISCIPLINES.includes(value as Discipline) ? value as Discipline : null;
}

function AppContent({ items, meta, onSwitch }: { items: CatalogItem[]; meta: CatalogManifest[Discipline]; onSwitch: () => void }) {
  const { state, result, update, setPage } = useCatalogQuery(items, meta.yearColumns);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  useEffect(() => { (async () => { const saved = localStorage.getItem(KEY_STORAGE); const value = saved ?? await loadDefaultSecretKey(); setSecretKey(value); setDraftKey(value); })(); }, []);
  const closeDrawer = useCallback(() => setSelected(null), []);
  const openSettings = useCallback(() => { setDraftKey(secretKey); setSettingsOpen(true); }, [secretKey]);
  const saveSettings = () => { const value = draftKey.trim(); setSecretKey(value); localStorage.setItem(KEY_STORAGE, value); setSettingsOpen(false); };
  const clearSettings = async () => { localStorage.removeItem(KEY_STORAGE); const value = await loadDefaultSecretKey(); setSecretKey(value); setDraftKey(value); setSettingsOpen(false); };
  const pageNumbers = useMemo(() => { const start = Math.max(1, result.page - 2); const end = Math.min(result.pageCount, start + 4); return Array.from({ length: end - start + 1 }, (_, index) => start + index); }, [result.page, result.pageCount]);
  return <><Header /><main className="app-main"><SearchControls state={state} total={result.filtered.length} meta={meta} onUpdate={update} onSwitch={onSwitch} /><ResultsTable rows={result.rows} yearColumns={meta.yearColumns} columnLabels={meta.columnLabels} onSelect={setSelected} /><nav className="pagination" aria-label="结果分页"><button disabled={result.page === 1} onClick={() => setPage(result.page - 1)}>上一页</button>{pageNumbers.map((page) => <button key={page} className={page === result.page ? "current" : ""} onClick={() => setPage(page)}>{page}</button>)}<button disabled={result.page === result.pageCount} onClick={() => setPage(result.page + 1)}>下一页</button><span>第 {result.page} / {result.pageCount} 页</span></nav></main><JournalDrawer item={selected} secretKey={secretKey} onClose={closeDrawer} onSettings={openSettings} /><SettingsDialog open={settingsOpen} value={draftKey} onChange={setDraftKey} onSave={saveSettings} onClear={clearSettings} onClose={() => setSettingsOpen(false)} /></>;
}

export default function App() {
  const [discipline, setDiscipline] = useState<Discipline | null>(readDiscipline);
  const [manifest, setManifest] = useState<CatalogManifest | null>(null);
  const [bundle, setBundle] = useState<{ items: CatalogItem[]; meta: CatalogManifest[Discipline] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}data/catalog-manifest.json`).then((response) => response.json()).then(setManifest).catch(() => setError("目录清单加载失败")); }, []);
  useEffect(() => { const onHash = () => setDiscipline(readDiscipline()); window.addEventListener("hashchange", onHash); return () => window.removeEventListener("hashchange", onHash); }, []);
  useEffect(() => { if (!discipline) { setBundle(null); return; } setBundle(null); loadCatalogBundle(discipline).then(setBundle).catch((reason: Error) => setError(reason.message)); }, [discipline]);
  const choose = (next: Discipline) => { window.location.hash = `discipline=${next}`; };
  const switchDiscipline = () => { history.replaceState(null, "", location.pathname); setDiscipline(null); };
  if (error) return <div className="startup-state"><strong>目录加载失败</strong><span>{error}</span></div>;
  if (!manifest) return <div className="startup-state"><span className="spinner" /><strong>正在载入目录清单…</strong></div>;
  if (!discipline) return <DisciplineChooser manifest={manifest} onChoose={choose} />;
  if (!bundle) return <div className="startup-state"><span className="spinner" /><strong>正在载入{manifest[discipline].label}目录…</strong></div>;
  return <AppContent items={bundle.items} meta={bundle.meta} onSwitch={switchDiscipline} />;
}
