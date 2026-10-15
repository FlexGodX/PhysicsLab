import {
  figureControls,
  figureValues,
  measureFigure,
  type FigureSpec,
  type VisualizationSample,
} from "../figures/experiment";
const f = (n: number | null) =>
  n === null
    ? "не определено"
    : n.toLocaleString("ru-RU", { maximumSignificantDigits: 6 });
export function VisualizationMeasurements({
  figure,
  samples,
}: {
  figure: FigureSpec;
  samples: VisualizationSample[];
}) {
  if (!samples.length) return null;
  const controls = figureControls(figure);
  const readings = measureFigure(figure, figureValues(figure));
  return (
    <div
      className="table-wrap"
      role="region"
      aria-label="Измерения визуализации"
      tabIndex={0}
    >
      <table>
        <caption>Условия и показания каждого измерения</caption>
        <thead>
          <tr>
            <th scope="col">№</th>
            {controls.map((c) => (
              <th scope="col" key={c.id}>
                {c.label}
              </th>
            ))}
            {readings.map((r, i) => (
              <th scope="col" key={i}>
                {r.label}
                {r.unit ? `, ${r.unit}` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samples.map((s, i) => (
            <tr key={i}>
              <th scope="row">{i + 1}</th>
              {controls.map((c) => (
                <td key={c.id}>{f(s.parameters[c.id])}</td>
              ))}
              {s.readings.map((v, j) => (
                <td key={j}>{f(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
