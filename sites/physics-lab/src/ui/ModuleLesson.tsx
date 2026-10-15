import { ModuleScore } from "./ModuleScore";
import { useState } from "react";
import {
  BookOpen,
  FlaskConical,
  PencilLine,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { learningUnits, type ExtraUnitId } from "../content/modules";
import type { Workspace, Attempt } from "../content/types";
import { modelCatalog } from "../physics/catalog";
import { unitSymbols, formulaWords } from "./symbols";
import { Formula } from "./Formula";
import { ModelLab } from "./ModelLab";
import { Assessment } from "./Assessment";
export function ModuleLesson({
  id,
  data,
  writable,
  onUpdate,
}: {
  id: ExtraUnitId;
  data: Workspace;
  writable: boolean;
  onUpdate: (d: Workspace) => Promise<boolean>;
}) {
  const unit = learningUnits[id];
  const [step, setStep] = useState(0);
  const [round] = useState(
    new Set(
      data.attempts
        .filter((a) => a.taskId.startsWith(`${id}-`))
        .map((a) => a.assessmentId)
        .filter(Boolean),
    ).size,
  );
  const steps = [
    { name: "Объяснение", icon: BookOpen },
    { name: "Эксперимент", icon: FlaskConical },
    { name: "Тренировка", icon: PencilLine },
    { name: "Проверка", icon: CheckCircle2 },
  ];
  const saveAttempt = (a: Attempt) =>
    onUpdate({ ...data, attempts: [...data.attempts, a] });
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">МОДУЛЬ {id} · ВЕРСИЯ 1</div>
          <h1>{unit.title}</h1>
          <p>{unit.intro}</p>
        </div>
        <span className="badge">15–25 минут</span>
      </div>
      <ModuleScore data={data} id={id} />
      <div className="lesson-steps" role="tablist" aria-label="Шаги занятия">
        {steps.map((s, i) => (
          <button
            key={s.name}
            role="tab"
            aria-selected={step === i}
            className={step === i ? "active" : ""}
            onClick={() => setStep(i)}
          >
            <s.icon size={18} />
            <span>
              <small>0{i + 1}</small>
              {s.name}
            </span>
          </button>
        ))}
      </div>
      <div hidden={step !== 0}>
        <div className="theory-layout">
          <section className="panel theory">
            <div className="eyebrow">ОТ НАБЛЮДЕНИЯ К ЗАКОНУ</div>
            <h2>Как устроена модель</h2>
            {unit.theory.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <div className="callout">
              <strong>Разобранный пример</strong>
              <p>{unit.example}</p>
            </div>
            <Formula
              symbols={unitSymbols[id]}
              expression={unit.formula}
              words={formulaWords[id]}
              units={unit.units}
              condition={unit.conditions}
            />
            <label className="checkbox">
              <input
                type="checkbox"
                disabled={!writable}
                checked={!!data.moduleMarks[id]?.selfMarkedAt}
                onChange={(e) =>
                  void onUpdate({
                    ...data,
                    moduleMarks: {
                      ...data.moduleMarks,
                      [id]: {
                        openedAt:
                          data.moduleMarks[id]?.openedAt ??
                          new Date().toISOString(),
                        selfMarkedAt: e.target.checked
                          ? new Date().toISOString()
                          : null,
                      },
                    },
                  })
                }
              />
              Моя оценка: я разобрался с объяснением
            </label>
            <p className="small muted">
              Самооценка сохраняется отдельно от подтверждения заданиями.
            </p>
            <button className="primary" onClick={() => setStep(1)}>
              Проверить в эксперименте <ArrowRight size={16} />
            </button>
          </section>
          <aside>
            <section className="model-card">
              <div className="eyebrow">ЧЕМУ НАУЧИТЬСЯ</div>
              <ul>
                {unit.outcomes.map((o) => (
                  <li key={o.id}>{o.title}</li>
                ))}
              </ul>
              <h3>Перед началом</h3>
              <p>{unit.prerequisites.join(" · ")}</p>
              <p>
                Можно открыть модуль сразу; зависимости служат рекомендацией.
              </p>
            </section>
            <section className="panel source-card">
              <h3>Границы материала</h3>
              <p>{unit.coverage}</p>
              <p>{unit.conditions}</p>
              <a
                href={modelCatalog[unit.modelId].source}
                target="_blank"
                rel="noreferrer"
              >
                Открыть источник ↗
              </a>
            </section>
          </aside>
        </div>
      </div>
      <div hidden={step !== 1}>
        <ModelLab
          id={unit.modelId}
          mode="lesson"
          writable={writable}
          previous={data.modelExperiments
            .filter((e) => e.modelId === unit.modelId)
            .at(-1)}
          onSave={(e) =>
            onUpdate({
              ...data,
              modelExperiments: [...data.modelExperiments, e],
            })
          }
        />
      </div>
      {(["practice", "assessment"] as const).map((mode, i) => (
        <div key={mode} hidden={step !== i + 2}>
          <Assessment
            unitId={id}
            mode={mode}
            round={mode === "assessment" ? round : 0}
            writable={writable}
            onAttempt={saveAttempt}
            hintHistory={data.hintHistory}
            onHint={(key, count) =>
              onUpdate({
                ...data,
                hintHistory: { ...data.hintHistory, [key]: count },
              })
            }
          />
        </div>
      ))}
    </>
  );
}
