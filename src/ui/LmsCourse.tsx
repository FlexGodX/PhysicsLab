import { useState } from "react";
import { lmsEntries, lmsGroups, lmsCourseUrl } from "../content/lms/catalog";
import type { Workspace } from "../content/types";
import { customScore } from "../studio/modules";
export function LmsCourse({
  data,
  onOpen,
}: {
  data: Workspace;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("");
  const completed = lmsEntries.filter(
    ({ module: m }) =>
      customScore(m, data.customRuns, data.customRead[m.id] ?? [])
        .completion === 100,
  ).length;
  const visible = lmsEntries.filter(
    (e) =>
      (!group || e.groupId === group) &&
      `${e.module.title} ${e.module.objective}`
        .toLocaleLowerCase("ru")
        .includes(query.trim().toLocaleLowerCase("ru")),
  );
  return (
    <section className="panel" data-testid="lms-course">
      <div className="eyebrow">КУРС ЮФУ · 3 РАЗДЕЛА · 27 ТЕМ</div>
      <h2>Материалы по физике для задолжников 2026</h2>
      <p>
        Объяснения, разобранные примеры и 135 вопросов по материалам курса.
        Близкие лекции и файлы объединены в темы. Пройдено {completed} из 27 тем
        ({Math.round((completed / 27) * 100)}%).
      </p>
      <p>
        <a href={lmsCourseUrl} target="_blank" rel="noopener noreferrer">
          Открыть исходный курс в LMS ЮФУ
        </a>
        . Прогресс здесь ведётся отдельно от LMS.
      </p>
      <div className="parameter-grid">
        <label>
          Найти тему курса
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Например, момент инерции"
          />
        </label>
        <label>
          Раздел курса
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">Все разделы</option>
            {lmsGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status">Показано тем: {visible.length} из 27</p>
      {lmsGroups
        .filter((g) => visible.some((e) => e.groupId === g.id))
        .map((g) => (
          <section key={g.id} aria-label={g.title}>
            <h3>{g.title}</h3>
            {visible
              .filter((e) => e.groupId === g.id)
              .map(({ module: m }) => {
                const score = customScore(
                  m,
                  data.customRuns,
                  data.customRead[m.id] ?? [],
                );
                return (
                  <article className="custom-course-row" key={m.id}>
                    <div>
                      <h4>{m.title}</h4>
                      <p>{m.objective}</p>
                      <p className="small muted">
                        Пройдено {score.completion}% · Баллы:{" "}
                        {score.points ?? "—"} / 100 · 5 вопросов
                      </p>
                    </div>
                    <button
                      aria-label={`Открыть тему: ${m.title}`}
                      onClick={() => onOpen(m.id)}
                    >
                      Изучить тему
                    </button>
                  </article>
                );
              })}
          </section>
        ))}
      {!visible.length && (
        <p>По этому запросу тем нет. Измените поиск или раздел.</p>
      )}
    </section>
  );
}
