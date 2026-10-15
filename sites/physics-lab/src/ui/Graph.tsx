import type { LinearState } from "../physics/linear";
import { formatNumber as f } from "../physics/units";
export function Graph({
  samples,
  current,
  field,
  label,
  unit,
}: {
  samples: LinearState[];
  current: LinearState;
  field: "x" | "v" | "a";
  label: string;
  unit: string;
}) {
  const width = 320,
    height = 166,
    left = 43,
    right = 12,
    top = 18,
    bottom = 28;
  const values = samples.map((s) => s[field]);
  let min = Math.min(0, ...values),
    max = Math.max(0, ...values);
  if (max - min < 1) {
    min -= 0.5;
    max += 0.5;
  }
  const span = max - min;
  min -= span * 0.12;
  max += span * 0.12;
  const duration = samples.at(-1)!.t;
  const x = (t: number) => left + (t / duration) * (width - left - right);
  const y = (v: number) =>
    top + ((max - v) / (max - min)) * (height - top - bottom);
  const path = samples
    .map((s, i) => `${i ? "L" : "M"}${x(s.t)},${y(s[field])}`)
    .join(" ");
  const elapsed = [...samples.filter((s) => s.t < current.t), current];
  const area =
    `M${x(0)},${y(0)} ` +
    elapsed.map((s) => `L${x(s.t)},${y(s[field])}`).join(" ") +
    ` L${x(current.t)},${y(0)} Z`;
  const color =
    field === "v" ? "#2563c5" : field === "a" ? "#a24b16" : "#16806a";
  return (
    <div className="graph">
      <div className="graph-title">
        <strong>{label}</strong>
        <span>{unit}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}. Время ${f(current.t)} с, значение ${f(current[field])} ${unit}`}
      >
        {[0, 0.5, 1].map((r) => (
          <g key={r}>
            <line
              x1={left}
              x2={width - right}
              y1={top + r * (height - top - bottom)}
              y2={top + r * (height - top - bottom)}
              stroke="#dde3ec"
            />
            <text
              x={left - 7}
              y={top + r * (height - top - bottom) + 4}
              textAnchor="end"
            >
              {f(max - r * (max - min), 1)}
            </text>
          </g>
        ))}
        {[0, 0.5, 1].map((r) => (
          <g key={r}>
            <line
              x1={x(r * duration)}
              x2={x(r * duration)}
              y1={top}
              y2={height - bottom}
              stroke="#e8ecf1"
            />
            <text x={x(r * duration)} y={height - 9} textAnchor="middle">
              {f(r * duration, 1)}
            </text>
          </g>
        ))}
        <line
          x1={left}
          x2={width - right}
          y1={y(0)}
          y2={y(0)}
          stroke="#8993a3"
        />
        {field === "v" && <path d={area} fill="#2563c5" opacity=".12" />}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={field === "a" ? "6 3" : undefined}
        />
        <line
          x1={x(current.t)}
          x2={x(current.t)}
          y1={top}
          y2={height - bottom}
          stroke="#607088"
          strokeDasharray="3 3"
        />
        <circle cx={x(current.t)} cy={y(current[field])} r="4" fill={color} />
        <text x={width - 2} y={height - 9} textAnchor="end">
          с
        </text>
      </svg>
    </div>
  );
}
