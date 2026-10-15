import { formatNumber as f } from "../physics/units";
export interface XYPoint {
  x: number;
  y: number;
}
export function XYGraph({
  points,
  current,
  label,
  xLabel,
  yLabel,
  shade = false,
}: {
  points: XYPoint[];
  current?: XYPoint;
  label: string;
  xLabel: string;
  yLabel: string;
  shade?: boolean;
}) {
  let minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x));
  let minY = Math.min(0, ...points.map((p) => p.y)),
    maxY = Math.max(0, ...points.map((p) => p.y));
  if (minX === maxX) maxX = minX + 1;
  if (minY === maxY) maxY = minY + 1;
  const padding = (maxY - minY) * 0.12;
  maxY += padding;
  minY -= padding;
  const x = (v: number) => 50 + ((v - minX) / (maxX - minX)) * 360,
    y = (v: number) => 20 + ((maxY - v) / (maxY - minY)) * 155;
  const path = points
    .map((p, i) => `${i ? "L" : "M"}${x(p.x)},${y(p.y)}`)
    .join(" ");
  const area = `${path} L${x(points.at(-1)!.x)},${y(0)} L${x(points[0].x)},${y(0)} Z`;
  return (
    <div className="xy-graph">
      <h3>{label}</h3>
      <svg
        viewBox="0 0 440 218"
        role="img"
        aria-label={`${label}; горизонтальная ось ${xLabel}, вертикальная ${yLabel}`}
      >
        {[0, 0.5, 1].map((r) => (
          <g key={r}>
            <line
              x1="50"
              x2="410"
              y1={20 + r * 155}
              y2={20 + r * 155}
              stroke="#dce3ed"
            />
            <text x="43" y={24 + r * 155} textAnchor="end">
              {f(maxY - r * (maxY - minY), 2)}
            </text>
            <text x={50 + r * 360} y="193" textAnchor="middle">
              {f(minX + r * (maxX - minX), 2)}
            </text>
          </g>
        ))}
        {shade && <path d={area} fill="#dce8fa" />}
        <path d={path} fill="none" stroke="#2563c5" strokeWidth="2.5" />
        {current && (
          <circle cx={x(current.x)} cy={y(current.y)} r="5" fill="#a24b16" />
        )}
        <text x="50" y="12">
          {yLabel}
        </text>
        <text x="410" y="214" textAnchor="end">
          {xLabel}
        </text>
      </svg>
    </div>
  );
}
