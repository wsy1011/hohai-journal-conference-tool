import type { WorkStatistics } from "../lib/openAlexWorks";
import { AnnualWorksChart } from "./AnnualWorksChart";

export function AnnualWorksSection({ statistics }: { statistics: WorkStatistics }) {
  const { articleShare: share, articleShareStatus, annualCountsStatus, countsByYear } = statistics;
  return <section className="annual-works" aria-labelledby="annual-works-title">
    <h4 id="annual-works-title">年发文量</h4>
    <div className="article-share">
      <div className="article-share-heading"><span>研究类文章占比</span>
        <strong>{share?.ratio != null ? new Intl.NumberFormat("zh-CN", {
          style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1,
        }).format(share.ratio) : "\\"}</strong>
      </div>
      {share && <p>文章 {share.articles.toLocaleString()} 篇 · 综述 {share.reviews.toLocaleString()} 篇</p>}
      <p>文章 ÷（文章 + 综述）</p>
      <p className="article-share-note">OpenAlex 全部收录年份（含当年），非单一年份；按 article / review 文献类型计算。</p>
      {articleShareStatus === "error" && <p className="article-share-note">占比查询暂未成功，不影响年发文量图。</p>}
      {share?.ratio === null && <p className="article-share-note">没有可计算的文章或综述，暂不计算占比。</p>}
    </div>
    {annualCountsStatus === "success" && countsByYear.length > 0
      ? <AnnualWorksChart counts={countsByYear} />
      : <p className="article-share-note">{annualCountsStatus === "error" ? "年发文量查询暂未成功。" : "暂无年发文量数据。"}</p>}
    <p className="article-share-note">年发文量仅统计 article + review；当年数据可能尚不完整。</p>
  </section>;
}
