import { useEffect, useState } from "react";
import type { CatalogItem } from "../data/catalog";
import {
  EASY_SCHOLAR_FIELDS,
  CAS_ZONING_FIELDS,
  OTHER_SEARCH_FIELDS,
  fetchPublicationRank,
  type EasyScholarState,
} from "../lib/easyScholar";

import { JournalFieldHeading } from "./JournalFieldHeading";
import { formatJournalValue } from "../lib/journalFieldInfo";
import { AnnualWorksSection } from "./AnnualWorksSection";
import { JournalOpenAccess } from "./JournalOpenAccess";
import { fetchJournalHomepage, type OpenAlexState } from "../lib/openAlex";
import { fetchJcrIfSeries, type JcrIfSeries } from "../lib/jcrIf";
import { IfTrendChart } from "./IfTrendChart";
import { fetchCasSeries, type CasSeries } from "../lib/casZoning";
import { fetchXrSeries } from "../lib/xrZoning";
import { fetchJournalMetadata, type JournalMetadata } from "../lib/journalMetadata";

type Props = { item: CatalogItem | null; secretKey: string; onClose: () => void; onSettings: () => void };
function cleanCasZone(value: string): string {
  const text = value.replace(/\s*\[[^\]]*\]/g, "").trim();
  return text.replace(/([1-4])区?$/, "$1区");
}
function casValue(cas: CasSeries, key: string): string | null {
  const years = Object.keys(cas).sort((a, b) => Number(b) - Number(a));
  if (!years.length) return null;
  return years
    .map((year) => {
      const entry = cas[year];
      if (key === "sciUp") return `${cleanCasZone(entry.large)}（${year}）`;
      if (key === "sciUpSmall") return entry.small.map((value) => `${cleanCasZone(value)}（${year}）`).join("\n");
      if (key === "sciUpTop") return entry.top ? `是（${year}）` : `\\（${year}）`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}
function CasYearCard({ year, entry }: { year: string; entry: CasSeries[string] }) {
  return (
    <div className={`cas-year-card cas-year-card-${year}`}>
      <h4>{year.includes("新锐") ? "2026年（新锐）" : `${year}年（中科院）`}</h4>
      <div>
        <span>大类</span>
        <strong>{cleanCasZone(entry.large) || "\\"}</strong>
      </div>
      <div>
        <span>小类</span>
        <strong>{entry.small.length ? entry.small.map(cleanCasZone).join("\n") : "\\"}</strong>
      </div>
      <div>
        <span>TOP</span>
        <strong>{entry.top ? "是" : "\\"}</strong>
      </div>
    </div>
  );
}

export function JournalDrawer({ item, secretKey, onClose, onSettings }: Props) {
  const [state, setState] = useState<EasyScholarState>({ status: "idle" });
  const [openAlex, setOpenAlex] = useState<OpenAlexState>({ status: "idle" });
  const [jcrIf, setJcrIf] = useState<JcrIfSeries>({});
  const [cas, setCas] = useState<CasSeries>({});
  const [xr, setXr] = useState<CasSeries[string] | null>(null);
  const [metadata, setMetadata] = useState<JournalMetadata | null>(null);
  useEffect(() => {
    if (!item || item.type !== "期刊") return;
    let active = true;
    setState({ status: "loading" });
    fetchPublicationRank(secretKey, item.name).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [item, secretKey]);
  useEffect(() => {
    if (!item || item.type !== "期刊") return;
    let active = true;
    setOpenAlex({ status: "loading" });
    fetchJournalHomepage(item.name).then((next) => {
      if (active) setOpenAlex(next);
    });
    return () => {
      active = false;
    };
  }, [item]);
  useEffect(() => {
    if (!item || item.type !== "期刊") return;
    let active = true;
    setJcrIf({});
    fetchJcrIfSeries(item.issn, item.name).then((next) => {
      if (active) setJcrIf(next);
    });
    return () => {
      active = false;
    };
  }, [item]);
  useEffect(() => {
    if (!item || item.type !== "期刊") return;
    let active = true;
    setCas({});
    fetchCasSeries(item.issn).then((next) => {
      if (active) setCas(next);
    });
    return () => {
      active = false;
    };
  }, [item]);
  useEffect(() => {
    if (!item || item.type !== "期刊") return;
    let active = true;
    setXr(null);
    fetchXrSeries(item.issn).then((next) => {
      if (active) setXr(next);
    });
    return () => {
      active = false;
    };
  }, [item]);
  useEffect(() => {
    if (!item || item.type !== "期刊") return;
    let active = true;
    setMetadata(null);
    fetchJournalMetadata(item.issn).then((next) => {
      if (active) setMetadata(next);
    });
    return () => {
      active = false;
    };
  }, [item]);
  useEffect(() => {
    if (!item) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);
  if (!item) return null;
  const gradeEntries = Object.entries(item.grades);
  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <aside className="journal-drawer" role="dialog" aria-modal="true" aria-labelledby="journal-title">
        <div className="drawer-header">
          <div>
            <span className="eyebrow">{item.type === "期刊" ? "期刊详情" : "目录条目"}</span>
            <div className="journal-title-row">
              <h2 id="journal-title">{item.name}</h2>
              {openAlex.status === "success" && openAlex.homepageUrl && (
                <a className="homepage-button" href={openAlex.homepageUrl} target="_blank" rel="noreferrer" aria-label="打开期刊官网">
                  官网 ↗
                </a>
              )}
            </div>
          </div>
          <button className="close-button" onClick={onClose} aria-label="关闭详情">
            ×
          </button>
        </div>
        <div className="drawer-scroll">
          <div className="identity-line">
            <span>{item.issn || "\\"}</span>
            <span className="type-badge">{item.type}</span>
          </div>
          <section className="detail-section hhu-grade-section">
            <h3>河海大学分级</h3>
            <div className="detail-grid">
              {gradeEntries.map(([year, grade]) => (
                <div key={year}>
                  <span>{year} 等级</span>
                  <strong>{grade || "\\"}</strong>
                </div>
              ))}
            </div>
          </section>
          {item.aliases.length > 0 && (
            <section className="detail-section">
              <h3>其他名称</h3>
              <p>{item.aliases.join(" · ")}</p>
            </section>
          )}
          {item.type === "期刊" ? (
            <>
              <section className="detail-section">
                <div className="section-heading">
                  <h3>期刊信息</h3>
                </div>
                <div className="impact-inline">
                  <h3>影响因子</h3>
                  <div className="impact-summary">
                    <div>
                      <span>最新影响因子</span>
                      <strong>
                        {Object.keys(jcrIf).length > 0 ? jcrIf[Object.keys(jcrIf).sort((a, b) => Number(b) - Number(a))[0]] : "\\"}
                      </strong>
                    </div>
                    <div>
                      <span>五年影响因子</span>
                      <strong>{state.status === "success" ? formatJournalValue(state.values.sciif5, "sciif5") : "\\"}</strong>
                    </div>
                  </div>
                  {Object.keys(jcrIf).length > 0 ? <IfTrendChart series={jcrIf} /> : <span className="muted">\\</span>}
                </div>
                {openAlex.status === "success" && <AnnualWorksSection statistics={openAlex} />}
                <div className="metadata-grid">
                  <div>
                    <span>ISSN</span>
                    <strong>{metadata?.issn || item.issn || "\\"}</strong>
                  </div>
                  <div>
                    <span>EISSN</span>
                    <strong>{metadata?.eissn || "\\"}</strong>
                  </div>
                  <div>
                    <span>出版社</span>
                    <strong>{metadata?.publisher || (openAlex.status === "success" ? openAlex.publisher : "") || "\\"}</strong>
                  </div>
                  <div>
                    <span>创刊时间</span>
                    <strong>{openAlex.status === "success" && openAlex.foundingYear ? openAlex.foundingYear : "\\"}</strong>
                  </div>
                </div>
                {openAlex.status === "success" && <JournalOpenAccess state={openAlex} />}
                {state.status === "loading" && (
                  <div className="loading-state">
                    <span className="spinner" />
                    正在查询 EasyScholar…
                  </div>
                )}
                {state.status === "error" && (
                  <div className="api-error">
                    <strong>
                      {state.kind === "invalid-key" ? "SecretKey 无效" : state.kind === "missing-key" ? "需要 SecretKey" : "查询未完成"}
                    </strong>
                    <span>{state.message}</span>
                    {state.kind === "missing-key" && (
                      <button className="secondary-button" onClick={onSettings}>
                        打开设置
                      </button>
                    )}
                  </div>
                )}
                {state.status === "success" && (
                  <>
                    <div className="easy-grid">
                      {EASY_SCHOLAR_FIELDS.filter(({ key }) => key !== "sciif5" && key !== "sciif").map(({ key, label }) => (
                        <div key={key}>
                          <JournalFieldHeading field={key} label={label} />
                          <strong>
                            {(casValue(cas, key) || formatJournalValue(state.values[key], key)).split("\n").map((line, index) => (
                              <span
                                key={`${key}-${index}`}
                                className={`cas-year-value ${line.match(/（(2021|2022|2023|2025)）/) ? `cas-year-${line.match(/（(2021|2022|2023|2025)）/)?.[1]}` : ""}`}
                              >
                                {index > 0 && <br />}
                                {line}
                              </span>
                            ))}
                          </strong>
                        </div>
                      ))}
                    </div>
                    <section className="cas-zoning-section">
                      <h3>期刊分区表</h3>
                      <div className="cas-year-grid">
                        {xr && <CasYearCard year="2026 新锐" entry={xr} />}
                        {Object.entries(cas)
                          .sort(([a], [b]) => Number(b) - Number(a))
                          .map(([year, entry]) => (
                            <CasYearCard key={year} year={year} entry={entry} />
                          ))}
                      </div>
                    </section>
                    <section className="other-search-section">
                      <h3>其他检索类型</h3>
                      <div className="easy-grid">
                        {OTHER_SEARCH_FIELDS.map(({ key, label }) => (
                          <div key={key}>
                            <JournalFieldHeading field={key} label={label} />
                            <strong>
                              {(casValue(cas, key) || formatJournalValue(state.values[key], key)).split("\n").map((line, index) => (
                                <span
                                  key={`${key}-other-${index}`}
                                  className={`cas-year-value ${line.match(/（(2021|2022|2023|2025)）/) ? `cas-year-${line.match(/（(2021|2022|2023|2025)）/)?.[1]}` : ""}`}
                                >
                                  {index > 0 && <br />}
                                  {line}
                                </span>
                              ))}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </section>
            </>
          ) : (
            <section className="detail-section">
              <p>该条目不是期刊，不查询 EasyScholar。</p>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
