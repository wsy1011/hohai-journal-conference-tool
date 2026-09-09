import type { OpenAlexYearCount } from "../lib/openAlex";

export function AnnualWorksChart({ counts }: { counts: OpenAlexYearCount[] }) {
  const data = [...counts].sort((a, b) => a.year - b.year);
  const width = 500, height = 190, left = 34, right = 16, top = 18, bottom = 34;
  const max = Math.max(...data.map((item) => item.worksCount), 1);
  const x = (index: number) => left + index * (width - left - right) / Math.max(data.length - 1, 1);
  const y = (value: number) => top + (1 - value / max) * (height - top - bottom);
  const points = data.map((item, index) => `${x(index)},${y(item.worksCount)}`).join(" ");
  const step = Math.max(1, Math.ceil(data.length / 8));
  const peak = Math.max(...data.map((item) => item.worksCount));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(max * ratio));
  return <div className="annual-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="期刊年发文量折线图"><line x1={left} y1={top} x2={left} y2={height - bottom} className="chart-axis" /><line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} className="chart-axis" />{ticks.map((tick, index) => { const tickY = y(tick); return <g key={`${tick}-${index}`}><line x1={left - 3} y1={tickY} x2={left} y2={tickY} className="chart-tick" /><text x={left - 7} y={tickY + 3} textAnchor="end" className="chart-value">{tick.toLocaleString()}</text></g>; })}<polyline points={points} className="chart-line" fill="none" />{data.map((item, index) => { const isPeak = item.worksCount === peak; return <g key={item.year}><circle cx={x(index)} cy={y(item.worksCount)} r="3.5" className="chart-dot"><title>{`${item.year}：${item.worksCount.toLocaleString()} 篇`}</title></circle>{isPeak && <text x={x(index)} y={Math.max(12, y(item.worksCount) - 9)} textAnchor="middle" className="chart-peak">{item.year}：{item.worksCount.toLocaleString()} 篇</text>}{(index % step === 0 || index === data.length - 1) && <text x={x(index)} y={height - 12} textAnchor="middle" className="chart-year">{item.year}</text>}</g>; })}</svg><div className="chart-caption">纵轴为发文量（篇）；鼠标悬停数据点查看详情</div></div>;
}
