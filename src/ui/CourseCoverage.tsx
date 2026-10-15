import {
  lmsEntries,
  lmsGroups,
  lmsSources,
  lmsVerifiedDate,
} from "../content/lms/catalog";
export function CourseCoverage() {
  return (
    <section className="panel course-coverage">
      <div className="eyebrow">ИСТОЧНИКИ И ГРАНИЦЫ</div>
      <h2>Покрытие курса LMS ЮФУ</h2>
      <p>
        Каталог сверён {lmsVerifiedDate} через Safari: 24 файла и 22 ссылки на
        лекции объединены в 27 учебных тем. Каждая тема содержит объяснение,
        пример и пять собственных вопросов приложения.
      </p>
      <ul>
        {lmsGroups.map((g) => (
          <li key={g.id}>
            {g.title}: {lmsEntries.filter((e) => e.groupId === g.id).length}{" "}
            тем.
          </li>
        ))}
      </ul>
      <p>
        Это краткая учебная адаптация, а не полная копия слайдов и оцениваемых
        заданий LMS. Шесть лабораторных маршрутов покрывают отдельные опыты.
        Открытие темы и успешная проверка учитываются отдельно от
        университетского курса.
      </p>
      <details>
        <summary>Все 46 исходных материалов</summary>
        <ul>
          {lmsSources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>{" "}
              · {s.kind === "resource" ? "файл" : "лекция"}
            </li>
          ))}
        </ul>
        <p>
          Оригиналы доступны в LMS с вашей учётной записью ЮФУ. Файлы
          «Внутренняя энергия…» и «Начала термодинамики» содержат одинаковый
          PDF; темы первого начала и внутренней энергии разделены по содержанию.
        </p>
      </details>
    </section>
  );
}
