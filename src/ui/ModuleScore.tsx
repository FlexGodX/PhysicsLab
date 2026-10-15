import type { Workspace } from "../content/types";
import type { ExtraUnitId } from "../content/modules";
import { moduleScore } from "../learning/scores";
export function ModuleScore({
  data,
  id,
}: {
  data: Workspace;
  id: "K1" | ExtraUnitId;
}) {
  const s = moduleScore(data, id);
  return (
    <section className="module-score" aria-label={`Прогресс модуля ${id}`}>
      <div>
        <strong>{s.points === null ? "—" : s.points} / 100 баллов</strong>
        <small>Последняя завершённая проверка</small>
      </div>
      <div>
        <strong>Пройдено {s.completion}%</strong>
        <progress
          aria-label={`Прохождение ${id}`}
          max={100}
          value={s.completion}
        />
      </div>
      <p>
        Три этапа: открыть объяснение, сохранить учебный опыт, пройти
        самостоятельную проверку. Баллы и подтверждение знаний учитываются
        отдельно.
      </p>
    </section>
  );
}
