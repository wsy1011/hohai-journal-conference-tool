export function IfTrendChart({ series }: { series: Record<string, number> }) {
  const data = Object.entries(series).sort(([a], [b]) => Number(a) - Number(b));
  if (!data.length) return null;
  const width = 500, height = 180, left = 34, right = 16, top = 18, bottom = 32;
  const max = Math.max(...data.map(([, value]) => value), 1);
  const x = (index: number) => left + index * (width - left - right) / Math.max(data.length - 1, 1);
  const y = (value: number) => top + (1 - value / max) * (height - top - bottom);
  const points = data.map(([, value], index) => `${x(index)},${y(value)}`).join(" ");
  return <div className="if-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="多年影响因子折线图"><line x1={left} y1={top} x2={left} y2={height - bottom} className="chart-axis" /><line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} className="chart-axis" /><polyline points={points} className="chart-line" fill="none" />{data.map(([year, value], index) => <g key={year}><circle cx={x(index)} cy={y(value)} r="3.5" className="chart-dot"><title>{`${year}：${value}`}</title></circle><text x={x(index)} y={height - 10} textAnchor="middle" className="chart-year">{year}</text></g>)}</svg></div>;
}
