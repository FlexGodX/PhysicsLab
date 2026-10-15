import { dayEntries, daySourceName } from "../content/day-plan/catalog";
import type { Workspace } from "../content/types";
import { customScore } from "../studio/modules";
export function DayPlan({
  data,
  onOpen,
}: {
  data: Workspace;
  onOpen: (id: string) => void;
}) {
  const entries = dayEntries.map((e) => ({
    ...e,
    score: customScore(
      e.module,
      data.customRuns,
      data.customRead[e.module.id] ?? [],
    ),
  }));
  const completed = entries.filter((e) => e.score.completion === 100).length;
  const percent = Math.round(
    entries.reduce((sum, e) => sum + e.score.completion, 0) / entries.length,
  );
  const next = entries.find((e) => e.score.completion < 100);
  return (
    <section className="panel" data-testid="day-plan">
      <div className="eyebrow">ПЛАН ПОДГОТОВКИ · 16 ОКТЯБРЯ · 10 МОДУЛЕЙ</div>
      <h2>Физика за один день: от основ к пробной пересдаче</h2>
      <p>
        Маршрут по вашему PDF: основа, шесть опорных блоков, короткий обзор и
        две части итоговой тренировки. Для начала с почти нулевого уровня.
        Полные темы курса доступны из каждого блока.
      </p>
      <p role="status">
        Пройдено {completed} из 10 модулей · Прохождение маршрута {percent}% ·
        53 тренировочных вопроса
      </p>
      <progress
        max={100}
        value={percent}
        aria-label="Прохождение плана подготовки"
      />
      {next ? (
        <p>
          <button className="primary" onClick={() => onOpen(next.module.id)}>
            Продолжить подготовку
          </button>{" "}
          <span className="small muted">
            Следующий шаг: {next.module.title}
          </span>
        </p>
      ) : (
        <p className="callout">
          Маршрут завершён. Повторите два самых сложных объяснения и решите
          задачи с новыми числами.
        </p>
      )}
      <details>
        <summary>Расписание, сокращённый вариант и способ работы</summary>
        <p>
          Окно из документа: 09:30–18:50. 7 ч 45 мин работы, включая исправления
          и лист формул; 1 ч 35 мин перерывов. Время — ориентир из плана, начать
          можно в любой момент.
        </p>
        <ol>
          {dayEntries.map((e) => (
            <li key={e.module.id}>
              {e.time} · {e.module.title} · {e.minutes} мин
            </li>
          ))}
        </ol>
        <p>
          Перерывы: 10:40–10:50; 11:40–11:50; обед 12:35–13:05; 13:50–14:00;
          15:00–15:10; 16:20–16:35; 17:20–17:30. После проверки: 18:15–18:40
          исправить две ошибки, 18:40–18:50 составить лист формул.
        </p>
        <p>
          Если всего 6 часов: основа 15 мин; А 35, Б 35, В 30, Г 30, Д 45, Е 50;
          обзор 30; проверка 30; исправления 15; перерывы суммарно 45 мин.
          Сокращайте длинные выводы и второй пример, сохраняя каждый раздел и
          итоговую проверку.
        </p>
        <p>
          Цикл блока: понять → закрыть текст и объяснить → решить самостоятельно
          → изменить число → проверить. Пробная пересдача: шесть устных ответов
          за 12 мин, шесть задач за 24 мин, сверка за 9 мин. Самооценка 0–24 в
          тетради и автоматические баллы 0–100 различаются. Это подготовка по
          минимуму плана, без прогноза экзаменационной оценки.
        </p>
        <p className="small muted">
          Источник: {daySourceName}, страницы 1–15. Страницы 16–17 — навигация
          по исходным лекциям. Разделы курса используются с разной глубиной;
          расчёт сложных полей и длинные выводы не покрыты полностью.
        </p>
      </details>
      {entries.map(({ module: m, minutes, pages, score }, i) => (
        <article className="custom-course-row" key={m.id}>
          <div>
            <p className="small muted">
              ШАГ {i + 1} · {minutes} мин · PDF, с. {pages.join(", ")}
            </p>
            <h3>{m.title}</h3>
            <p>{m.objective}</p>
            <p className="small muted">
              Пройдено {score.completion}% · Баллы: {score.points ?? "—"} / 100
              · {m.questions.length} вопросов
            </p>
          </div>
          <button
            aria-label={`Открыть блок: ${m.title}`}
            onClick={() => onOpen(m.id)}
          >
            Изучить блок
          </button>
        </article>
      ))}
    </section>
  );
}
