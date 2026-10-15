import { modelMetrics } from "../content/modelMetrics";
import {
  generateMeasurements,
  type MeasurementParams,
} from "../physics/measurements";
import { modelCatalog, type ModelParams } from "../physics/catalog";
import type { ModelExperiment } from "../content/types";
import { formatNumber as f } from "../physics/units";
export function ModelResults({
  records,
  selected,
  onSelect,
  onReplay,
  demo,
}: {
  records: ModelExperiment[];
  selected: Set<string>;
  onSelect: (id: string) => void;
  onReplay: (e: ModelExperiment) => void;
  demo: boolean;
}) {
  return (
    <>
      {[...records]
        .reverse()
        .filter((e) => !demo || selected.has(e.id))
        .map((e) => (
          <article
            key={e.id}
            className={`panel result-card ${selected.has(e.id) ? "" : "excluded-print"}`}
          >
            <div className="panel-heading">
              <h3>
                {modelCatalog[e.modelId].title} ·{" "}
                {e.context === "playground"
                  ? "Игровая площадка"
                  : modelCatalog[e.modelId].unitId}
              </h3>
              <span className="small muted">
                {new Date(e.createdAt).toLocaleString("ru-RU")}
              </span>
            </div>
            {!demo && (
              <label className="checkbox no-print">
                <input
                  type="checkbox"
                  checked={selected.has(e.id)}
                  onChange={() => onSelect(e.id)}
                />
                Включить в отчёт
              </label>
            )}
            <p>
              {modelCatalog[e.modelId].parameters
                .map(
                  (q) =>
                    `${q.label}: ${f(Number(e.parameters[q.key]) / (q.factor ?? 1), 5)}`,
                )
                .join(" · ")}
            </p>
            {e.modelId === "circular" &&
              e.modelVersion === 1 &&
              e.parameters.releaseAt !== null && (
                <p className="callout">
                  Архив модели v1: после отпускания в снимке оставался период
                  прежней окружности. Он не описывает свободное движение. Новый
                  запуск использует исправленную модель v2.
                </p>
              )}
            <p className="small muted">
              Модель {e.modelId} v{e.modelVersion}.{" "}
              {e.modelId === "measurements"
                ? e.manualValues
                  ? "Ручные данные"
                  : "Виртуальные данные · seed " + e.parameters.seed
                : ""}
            </p>
            <div className="result-values">
              {modelMetrics[e.modelId].map(([key, label, unit, factor]) => (
                <p key={key}>
                  {label}:{" "}
                  <strong>
                    {e.samples.at(-1)!.values[key] === null
                      ? "не определено"
                      : f(e.samples.at(-1)!.values[key]! * factor, 6)}{" "}
                    {unit}
                  </strong>
                </p>
              ))}
            </div>
            {e.modelId === "measurements" && (
              <p>
                Исходная серия, м:{" "}
                {(
                  e.manualValues ??
                  generateMeasurements(
                    e.parameters as unknown as MeasurementParams,
                  )
                )
                  .map((v) => String(v).replace(".", ","))
                  .join("; ")}
              </p>
            )}
            {e.modelId === "gas" && (
              <p>
                Процесс:{" "}
                {e.parameters.process === "isochoric"
                  ? "изохора"
                  : e.parameters.process === "isobaric"
                    ? "изобара"
                    : "изотерма"}
              </p>
            )}
            {e.modelId === "circular" && (
              <p>
                Направление:{" "}
                {e.parameters.direction === 1
                  ? "против часовой стрелки"
                  : "по часовой стрелке"}
                . Отпускание:{" "}
                {e.parameters.releaseAt === null
                  ? "нет"
                  : `${e.parameters.releaseAt} с`}
                .
              </p>
            )}
            {e.modelId === "circuit" && (
              <p>Цепь {e.parameters.closed ? "замкнута" : "разомкнута"}.</p>
            )}
            <dl>
              <dt>Прогноз</dt>
              <dd>{e.prediction}</dd>
              <dt>Наблюдения</dt>
              <dd>{e.observations}</dd>
              <dt>Мой вывод</dt>
              <dd>{e.conclusion}</dd>
            </dl>
            <p className="small muted">
              Числа проверены моделью. Самопроверка вывода:{" "}
              {e.selfReview ? "отмечена пользователем" : "не отмечена"}.
              Автоматической оценки свободного текста нет.
            </p>
            <details>
              <summary>Параметры и контрольные состояния (СИ)</summary>
              <pre>
                {JSON.stringify(
                  {
                    parameters: e.parameters as ModelParams,
                    manualValues: e.manualValues,
                    initial: e.samples[0],
                    final: e.samples.at(-1),
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
            {!demo && (
              <button className="no-print" onClick={() => onReplay(e)}>
                Воспроизвести отдельной копией
              </button>
            )}
          </article>
        ))}
    </>
  );
}
