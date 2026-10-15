import { DayPlan } from "./DayPlan";
import { LmsCourse } from "./LmsCourse";
import { customScore } from "../studio/modules";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  FlaskConical,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { Diagnostics } from "./Diagnostics";
import { ReviewPanel } from "./ReviewPanel";
import { CourseCoverage } from "./CourseCoverage";
import type { Workspace } from "../content/types";
import { deriveProgress } from "../learning/progress";
import { learningUnits, type ExtraUnitId } from "../content/modules";
import { deriveUnitProgress } from "../learning/unitProgress";
export function Course({
  data,
  onCreate,
  onCustom,
  onStart,
  onOpenUnit,
  writable,
  onUpdate,
}: {
  data: Workspace;
  onCreate: () => void;
  onCustom: (id: string) => void;
  writable: boolean;
  onUpdate: (d: Workspace) => Promise<boolean>;
  onStart: () => void;
  onOpenUnit: (id: ExtraUnitId) => void;
}) {
  const p = deriveProgress(data.attempts, data.experiments);
  const allProgress = [
    p,
    ...Object.values(learningUnits).map((u) =>
      deriveUnitProgress(u.id, data.attempts, data.modelExperiments),
    ),
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ВАША ЛИЧНАЯ ЛАБОРАТОРИЯ</div>
          <h1>
            Физика становится понятнее,
            <br />
            <span className="muted-heading">когда её можно проверить.</span>
          </h1>
          <p>Короткое объяснение. Ваш эксперимент. Самостоятельное решение.</p>
        </div>
        <span className="version-label">Версия 0.2</span>
      </div>
      <div className="overview">
        <div>
          <BookOpen size={19} />
          <span>Лабораторные маршруты</span>
          <strong>
            6 <small>из 6 модулей</small>
          </strong>
        </div>
        <div>
          <CheckCircle2 size={19} />
          <span>Подтверждено заданиями</span>
          <strong>
            {allProgress.filter((p) => p.demonstrated).length}{" "}
            <small>/ 6</small>
          </strong>
        </div>
        <div>
          <FlaskConical size={19} />
          <span>Завершено маршрутов</span>
          <strong>
            {allProgress.filter((p) => p.completed).length} <small>/ 6</small>
          </strong>
        </div>
      </div>
      <DayPlan data={data} onOpen={onCustom} />
      <LmsCourse data={data} onOpen={onCustom} />
      <section className="panel">
        <div className="panel-heading">
          <h2>Мои модули</h2>
          <button className="primary" onClick={onCreate}>
            Создать модуль
          </button>
        </div>
        <p>Добавьте PDF/DOCX или опишите тему для нового занятия.</p>
        {data.customModules.map((m) => {
          const s = customScore(
            m,
            data.customRuns,
            data.customRead[m.id] ?? [],
          );
          return (
            <div key={m.id} className="custom-course-row">
              <div>
                <h3>{m.title}</h3>
                <p>
                  Пройдено {s.completion}% · Баллы: {s.points ?? "—"} / 100
                </p>
              </div>
              <button onClick={() => onCustom(m.id)}>Открыть {m.title}</button>
            </div>
          );
        })}
      </section>
      <Diagnostics
        data={data}
        writable={writable}
        onUpdate={onUpdate}
        onOpen={(id) => (id === "K1" ? onStart() : onOpenUnit(id))}
      />
      <section className="course-hero">
        <div>
          <span className="hero-label">
            <span className="dot" />
            РЕКОМЕНДУЕМЫЙ ПЕРВЫЙ ШАГ
          </span>
          <h2>Разгон и торможение</h2>
          <p>
            Почему тележка со скоростью 8 м/с в конце четвёртой секунды проехала
            только 16 метров?
          </p>
          <div className="hero-meta">
            <span>
              <Clock3 size={15} />
              15–25 минут
            </span>
            <span>
              <FlaskConical size={15} />
              Один опыт
            </span>
            <span>5 заданий</span>
          </div>
          <button className="primary" onClick={onStart}>
            Начать занятие <ArrowRight size={18} />
          </button>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          <svg viewBox="0 0 400 210">
            <defs>
              <pattern
                id="heroGrid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M32 0H0V32"
                  fill="none"
                  stroke="#d6e1f4"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect
              x="10"
              y="10"
              width="380"
              height="190"
              fill="url(#heroGrid)"
            />
            <path
              d="M45 165 L325 165 M45 165 L45 35"
              fill="none"
              stroke="#8295b2"
            />
            <path d="M45 165 L310 48 L310 165 Z" fill="#d1e1fa" />
            <path
              d="M45 165 L310 48"
              fill="none"
              stroke="#2563c5"
              strokeWidth="3"
            />
            <circle cx="310" cy="48" r="6" fill="#2563c5" />
            <text x="322" y="48" fill="#2563c5">
              8 м/с
            </text>
            <text x="165" y="143" fill="#345e9d" fontSize="26">
              16 м
            </text>
            <text x="28" y="30">
              v
            </text>
            <text x="331" y="171">
              t
            </text>
            <text x="43" y="188">
              0
            </text>
            <text x="298" y="188">
              4 с
            </text>
          </svg>
          <span>Путь — площадь под графиком скорости</span>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <h2>Ваш учебный маршрут</h2>
          <p>От простого движения к измерениям, энергии и времени.</p>
        </div>
        <span className="badge">6 доступных модулей</span>
      </div>
      <div className="module-grid">
        <button className="module-card available" onClick={onStart}>
          <div className="module-top">
            <span className="module-id">K1</span>
            <span className="badge green">Доступен</span>
            <ArrowUpRight size={19} />
          </div>
          <small>L1 · Механика</small>
          <h3>Прямая и графики</h3>
          <p>Различайте путь, скорость и ускорение на собственном опыте.</p>
          <span className="module-footer">
            {p.demonstrated
              ? "Подтверждено заданиями"
              : data.selfMarkedAt
                ? "Отмечено изученным · моя оценка"
                : data.materialOpenedAt
                  ? "Материал открыт"
                  : "Начать с основ"}{" "}
            <ArrowRight size={16} />
          </span>
        </button>
        {Object.values(learningUnits).map((unit) => {
          const progress = deriveUnitProgress(
            unit.id,
            data.attempts,
            data.modelExperiments,
          );
          return (
            <button
              className="module-card available"
              key={unit.id}
              aria-label={`Открыть ${unit.id}`}
              onClick={() => onOpenUnit(unit.id)}
            >
              <div className="module-top">
                <span className="module-id">{unit.id}</span>
                <span className="badge green">Доступен</span>
                <ArrowUpRight size={19} />
              </div>
              <small>{unit.coverage}</small>
              <h3>{unit.title}</h3>
              <p>{unit.intro}</p>
              <span className="module-footer">
                {progress.demonstrated
                  ? "Подтверждено заданиями"
                  : data.moduleMarks[unit.id]?.selfMarkedAt
                    ? "Отмечено изученным · моя оценка"
                    : data.moduleMarks[unit.id]?.openedAt
                      ? "Материал открыт"
                      : "Начать изучение"}
                <ArrowRight size={16} />
              </span>
            </button>
          );
        })}
      </div>
      <ReviewPanel
        data={data}
        writable={writable}
        onUpdate={onUpdate}
        onOpen={(id) => (id === "K1" ? onStart() : onOpenUnit(id))}
      />
      <CourseCoverage />
      <div className="bottom-grid">
        <section className="panel">
          <div className="eyebrow">ПОВТОРЕНИЕ</div>
          <h3>
            {p.nextReviewAt
              ? p.reviewNeeded
                ? "K1 пора повторить"
                : "Следующий шаг назначен"
              : "Знаниям нужно время"}
          </h3>
          <p>
            {p.nextReviewAt
              ? `Повторение K1: ${new Date(p.nextReviewAt).toLocaleDateString("ru-RU")}. Прежний успех остаётся в истории.`
              : "После самостоятельной проверки здесь появится дата повторения. Интервалы — 1, 3 и 7 дней."}
          </p>
          {p.nextReviewAt && (
            <button onClick={onStart}>
              Открыть K1 <ArrowRight size={15} />
            </button>
          )}
        </section>
        <section className="panel">
          <div className="eyebrow">ЧЕСТНЫЙ ПРОГРЕСС</div>
          <h3>Открыть ≠ понять</h3>
          <p>
            Прочитанный материал, ваша самооценка и результаты проверки показаны
            отдельно. Подтверждение каждого модуля опирается на самостоятельные
            ответы.
          </p>
          <details>
            <summary>Границы покрытия курса</summary>
            <p>
              Курс LMS представлен 27 темами в трёх разделах. Шесть лабораторных
              маршрутов дополняют его отдельными опытами. Проверки приложения
              относятся к подготовленной адаптации материала; они не заменяют
              контрольные задания и оценки LMS.
            </p>
          </details>
        </section>
      </div>
    </>
  );
}
