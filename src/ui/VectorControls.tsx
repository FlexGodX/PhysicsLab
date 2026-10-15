export interface VectorView {
  velocity: boolean;
  acceleration: boolean;
  labels: boolean;
  velocityScale: number;
  accelerationScale: number;
}
export const defaultVectorView: VectorView = {
  velocity: true,
  acceleration: true,
  labels: true,
  velocityScale: 1,
  accelerationScale: 1,
};
export function VectorControls({
  value,
  onChange,
}: {
  value: VectorView;
  onChange: (value: VectorView) => void;
}) {
  return (
    <details className="vector-controls no-print">
      <summary>Вид векторов</summary>
      <div className="parameter-grid">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={value.velocity}
            onChange={(e) => onChange({ ...value, velocity: e.target.checked })}
          />
          Показывать скорость v
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={value.acceleration}
            onChange={(e) =>
              onChange({ ...value, acceleration: e.target.checked })
            }
          />
          Показывать ускорение a
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={value.labels}
            onChange={(e) => onChange({ ...value, labels: e.target.checked })}
          />
          Подписи векторов
        </label>
        {(
          [
            ["velocityScale", "Масштаб стрелки скорости"],
            ["accelerationScale", "Масштаб стрелки ускорения"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <select
              value={value[key]}
              onChange={(e) =>
                onChange({ ...value, [key]: Number(e.target.value) })
              }
            >
              {[0.5, 1, 1.25].map((n) => (
                <option key={n} value={n}>
                  {n * 100}%
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p className="small muted">
        Размер стрелок задан относительно обычного вида. Точный масштаб для
        каждой величины подписан под сценой.
      </p>
    </details>
  );
}
