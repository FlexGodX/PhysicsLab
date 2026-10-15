import { findStudyModule } from "../studio/moduleCatalog";
import type { VisualizationExperiment } from "../figures/experiment";
import type { Workspace } from "../content/types";
import { unitIds, unitTitle } from "../learning/review";
import { VisualizationMeasurements } from "./VisualizationMeasurements";
export function VisualizationResults({
  records,
  data,
  selected,
  onSelect,
  onReplay,
  demo,
}: {
  records: VisualizationExperiment[];
  data: Workspace;
  selected: Set<string>;
  onSelect: (id: string) => void;
  onReplay: (record: VisualizationExperiment) => void;
  demo: boolean;
}) {
  if (!records.length) return null;
  return (
    <section aria-label="Исследования визуализаций">
      <h2>Исследования Anatomy</h2>
      {[...records]
        .reverse()
        .filter((e) => !demo || selected.has(e.id))
        .map((e) => (
          <article
            key={e.id}
            data-testid="visualization-result"
            className={`panel result-card ${selected.has(e.id) ? "" : "excluded-print"}`}
          >
            <div className="panel-heading">
              <h3>{e.figureSnapshot.title}</h3>
              <span className="small muted">
                {new Date(e.createdAt).toLocaleString("ru-RU")}
              </span>
            </div>
            <p className="badge">Игровая площадка · Anatomy</p>
            {e.topicId && (
              <p>
                Тема:{" "}
                {findStudyModule(data, e.topicId)?.title ??
                  unitIds
                    .filter((id) => id === e.topicId)
                    .map((id) => `${id} · ${unitTitle(id)}`)
                    .join("")}
              </p>
            )}
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
            <dl>
              <dt>Вопрос исследования</dt>
              <dd>{e.question}</dd>
              <dt>Предположение до измерений</dt>
              <dd>{e.prediction}</dd>
              <dt>Наблюдения</dt>
              <dd>{e.observations}</dd>
              <dt>Мой вывод</dt>
              <dd>{e.conclusion}</dd>
            </dl>
            <p>{e.figureSnapshot.caption}</p>
            <VisualizationMeasurements
              figure={e.figureSnapshot}
              samples={e.samples}
            />
            <p className="small muted">
              Расчёт по сохранённой модели v{e.modelVersion}. Это виртуальные
              данные, а не реальные измерения. Самопроверка:{" "}
              {e.selfReview ? "отмечена пользователем" : "не отмечена"}.
              Свободный вывод и физическая достоверность новой модели
              автоматически не оцениваются.
            </p>
            <details>
              <summary>Промпт и снимок модели</summary>
              {e.figureSnapshot.sourcePrompt && (
                <p className="study-text">{e.figureSnapshot.sourcePrompt}</p>
              )}
              <pre>{JSON.stringify(e.figureSnapshot, null, 2)}</pre>
            </details>
            {!demo && (
              <button className="no-print" onClick={() => onReplay(e)}>
                Повторить исследование
              </button>
            )}
          </article>
        ))}
    </section>
  );
}
