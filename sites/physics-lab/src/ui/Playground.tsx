import { useState } from "react";
import { ModelLab } from "./ModelLab";
import { modelCatalog, type ModelId } from "../physics/catalog";
import type { ModelExperiment } from "../content/types";
import { LinearLab } from "./LinearLab";
import type { Workspace } from "../content/types";
import type {
  FigureSpec,
  VisualizationExperiment,
} from "../figures/experiment";
import { VisualStudio } from "./VisualStudio";
import { VisualizationLab } from "./VisualizationLab";
export function Playground({
  data,
  writable,
  onUpdate,
  initial,
  initialFigure,
  initialResearch,
}: {
  data: Workspace;
  writable: boolean;
  onUpdate: (w: Workspace) => Promise<boolean>;
  initial?: ModelExperiment;
  initialFigure?: FigureSpec;
  initialResearch?: VisualizationExperiment;
}) {
  const [mode, setMode] = useState(
    initialFigure || initialResearch ? "anatomy" : "models",
  );
  const [research, setResearch] = useState<{
    figure: FigureSpec;
    initial?: VisualizationExperiment;
    key: string;
  } | null>(() =>
    initialResearch
      ? {
          figure: initialResearch.figureSnapshot,
          initial: initialResearch,
          key: initialResearch.id,
        }
      : initialFigure
        ? { figure: initialFigure, key: "initial" }
        : null,
  );
  const [model, setModel] = useState<ModelId | "linear">(
    initial?.modelId ?? "linear",
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">СВОБОДНЫЕ ЭКСПЕРИМЕНТЫ</div>
          <h1>Игровая площадка</h1>
          <p>
            Создайте свои условия, сравните движение и узнайте, какой закон его
            объясняет.
          </p>
        </div>
        <span className="badge">Независимо от курса</span>
      </div>
      <div className="row playground-modes" aria-label="Вид свободного опыта">
        <button
          aria-pressed={mode === "models"}
          onClick={() => setMode("models")}
        >
          Лабораторные модели
        </button>
        <button
          aria-pressed={mode === "anatomy"}
          onClick={() => setMode("anatomy")}
        >
          Визуализации Anatomy
        </button>
      </div>
      <div hidden={mode !== "anatomy"}>
        {research ? (
          <VisualizationLab
            key={research.key}
            figure={research.figure}
            initial={research.initial}
            data={data}
            writable={writable}
            onUpdate={onUpdate}
            onBack={() => setResearch(null)}
          />
        ) : mode === "anatomy" ? (
          <VisualStudio
            data={data}
            writable={writable}
            onUpdate={onUpdate}
            onUse={(figure) =>
              setResearch({ figure, key: crypto.randomUUID() })
            }
          />
        ) : null}
      </div>
      {mode === "models" && (
        <>
          <section className="panel playground-intro">
            <label>
              Модель
              <select
                aria-label="Модель эксперимента"
                value={model}
                onChange={(e) => setModel(e.target.value as ModelId | "linear")}
              >
                <option value="linear">
                  Движение по прямой · разгон, торможение, разворот
                </option>
                {Object.values(modelCatalog).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted small">
              Выберите исходный сценарий и изменяйте параметры. Прогноз здесь
              необязателен для запуска. Подсказки справа зависят от выбранных
              условий. Для сохранения личного опыта запишите прогноз до запуска,
              наблюдения и вывод.
            </p>
          </section>
          {model === "linear" ? (
            <LinearLab
              mode="playground"
              writable={writable}
              onSave={(e) =>
                onUpdate({ ...data, experiments: [...data.experiments, e] })
              }
              previous={data.experiments.at(-1)}
            />
          ) : (
            <ModelLab
              key={model}
              id={model}
              writable={writable}
              initial={initial?.modelId === model ? initial : undefined}
              previous={data.modelExperiments
                .filter((e) => e.modelId === model)
                .at(-1)}
              onSave={(e) =>
                onUpdate({
                  ...data,
                  modelExperiments: [...data.modelExperiments, e],
                })
              }
            />
          )}
        </>
      )}
    </>
  );
}
