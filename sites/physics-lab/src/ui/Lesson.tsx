import { ModuleScore } from "./ModuleScore";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  PencilLine,
  CheckCircle2,
} from "lucide-react";
import type { Attempt, Experiment, Workspace } from "../content/types";
import type { LinearParams } from "../physics/linear";
import { unitSymbols } from "./symbols";
import { Formula } from "./Formula";
import { LinearLab } from "./LinearLab";
import { k1Tasks } from "../content/k1";
import { Assessment } from "./Assessment";
export function Lesson({
  data,
  writable,
  onUpdate,
  replay,
}: {
  data: Workspace;
  writable: boolean;
  onUpdate: (data: Workspace) => Promise<boolean>;
  replay?: LinearParams;
}) {
  const [step, setStep] = useState(replay ? 1 : 0);
  const [round] = useState(
    new Set(
      data.attempts
        .filter((a) => k1Tasks.some((t) => t.id === a.taskId))
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
  const saveExperiment = (e: Experiment) =>
    onUpdate({ ...data, experiments: [...data.experiments, e] });
  function select(i: number) {
    setStep(i);
    if (i === 0 && !data.materialOpenedAt && writable)
      void onUpdate({ ...data, materialOpenedAt: new Date().toISOString() });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">МЕХАНИКА · МОДУЛЬ K1</div>
          <h1>Разгон и торможение</h1>
          <p>Поймите, как ускорение меняет скорость и пройденный путь.</p>
        </div>
        <span className="badge">15–25 минут</span>
      </div>
      <ModuleScore data={data} id={"K1"} />
      <div className="lesson-steps" role="tablist" aria-label="Шаги занятия">
        {steps.map((s, i) => (
          <button
            key={s.name}
            role="tab"
            aria-selected={step === i}
            className={step === i ? "active" : ""}
            onClick={() => select(i)}
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
            <div className="eyebrow">НАЧНЁМ С ПОНЯТНОГО</div>
            <h2>Скорость в конце — ещё не весь путь</h2>
            <p className="lead">
              Представьте тележку, которая трогается с места. Сначала она едва
              движется, затем каждую секунду едет быстрее. Можно ли считать, что
              всю дорогу она двигалась с последней скоростью?
            </p>
            <div className="story-steps">
              {[1, 3, 5, 7].map((n, i) => (
                <div key={n}>
                  <span>{i + 1}-я секунда</span>
                  <div className={`distance-bar distance-${n}`} />
                  <strong>{n} м</strong>
                </div>
              ))}
            </div>
            <p>
              При ускорении <strong>2 м/с²</strong> скорость вдоль оси каждую
              секунду увеличивается на <strong>2 м/с</strong>. За 4 секунды она
              вырастет от 0 до 8 м/с.
            </p>
            <div className="callout">
              <strong>Почему 16 м, а не 32 м?</strong>
              <p>
                8 м/с — скорость только в конце четвёртой секунды. При
                постоянном ускорении средняя скорость равна (0 + 8) / 2 = 4 м/с.
                Поэтому путь 4 · 4 = 16 м. На графике v(t) это площадь
                треугольника.
              </p>
            </div>
            <Formula
              symbols={unitSymbols["K1"]}
              expression="v = v_0 + at"
              words="К начальной скорости прибавляем её изменение: ускорение, умноженное на время."
              units="v и v₀ — скорость, м/с; a — ускорение, м/с²; t — время, с."
              condition="Одна ось и постоянное ускорение на всём рассматриваемом интервале."
            />
            <Formula
              symbols={unitSymbols["K1"]}
              expression="x-x_0 = v_0t + \frac{at^2}{2}"
              words="Перемещение складывается из вклада начальной скорости и вклада ускорения."
              units="x и x₀ — координаты, м. Оба слагаемых справа также измеряются в метрах."
              condition="Постоянное ускорение. При развороте путь считаем отдельно по участкам; перемещение может быть нулевым."
            />
            <h3>Три отличия, которые пригодятся</h3>
            <details>
              <summary>Путь и перемещение</summary>
              <p>
                Пройти 3 м вперёд и 3 м назад — путь 6 м, перемещение 0 м. Путь
                неотрицателен; знак перемещения показывает направление от
                начальной к конечной точке.
              </p>
            </details>
            <details>
              <summary>Скорость и ускорение</summary>
              <p>
                Скорость показывает изменение координаты за время. Ускорение
                показывает изменение скорости за время. При остановке скорость
                может равняться нулю, хотя ускорение остаётся ненулевым и затем
                разворачивает тело.
              </p>
            </details>
            <details>
              <summary>Средняя скорость и средний модуль</summary>
              <p>
                Средняя проекция скорости — перемещение, делённое на время.
                Средний модуль — путь, делённый на время. При развороте они
                различаются. Среднее начальной и конечной скорости работает
                только при постоянном ускорении.
              </p>
            </details>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={!!data.selfMarkedAt}
                disabled={!writable}
                onChange={(e) =>
                  void onUpdate({
                    ...data,
                    selfMarkedAt: e.target.checked
                      ? new Date().toISOString()
                      : null,
                  })
                }
              />
              Моя оценка: я разобрался с объяснением
            </label>
            <p className="small muted">
              Самооценка сохраняется отдельно от подтверждения заданиями.
            </p>
            <button className="primary" onClick={() => select(1)}>
              Проверить в эксперименте <ArrowRight size={16} />
            </button>
          </section>
          <aside>
            <section className="model-card">
              <div className="eyebrow">ВАША ЦЕЛЬ</div>
              <h3>Объяснить путь при разгоне на новом примере</h3>
              <p>
                После опыта вы решите задачу с другими числами и проверите
                единицы ускорения.
              </p>
              <ul>
                <li>Путь и перемещение</li>
                <li>Скорость и ускорение</li>
                <li>Единицы величин</li>
                <li>Площадь под графиком</li>
              </ul>
            </section>
            <section className="panel source-card">
              <BookOpen size={21} />
              <h3>На чём основана модель</h3>
              <p>
                Кинематика с постоянным ускорением, открытый учебник OpenStax.
              </p>
              <a
                href="https://openstax.org/books/university-physics-volume-1/pages/3-4-motion-with-constant-acceleration"
                target="_blank"
                rel="noreferrer"
              >
                Открыть источник ↗
              </a>
              <small>Материал K1 · версия 1</small>
            </section>
          </aside>
        </div>
      </div>
      <div hidden={step !== 1}>
        <LinearLab
          writable={writable}
          onSave={saveExperiment}
          previous={data.experiments.at(-1)}
          initial={replay}
        />
      </div>
      <div hidden={step !== 2}>
        <Assessment
          key="practice"
          mode="practice"
          round={0}
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
      <div hidden={step !== 3}>
        <Assessment
          key="assessment"
          mode="assessment"
          round={round}
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
    </>
  );
}
