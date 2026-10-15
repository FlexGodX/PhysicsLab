import { AISettings } from "./AISettings";
import { useEffect, useRef, useState } from "react";
import { Download, Upload, X } from "lucide-react";
import type { Workspace } from "../content/types";
import { validateImport } from "../persistence/schema";
import { downloadBackup } from "../persistence/store";
export function Settings({
  data,
  writable,
  onUpdate,
  onClose,
}: {
  data: Workspace;
  writable: boolean;
  onUpdate: (w: Workspace) => Promise<boolean>;
  onClose: () => void;
}) {
  const [candidate, setCandidate] = useState<{
    data: Workspace;
    name: string;
  } | null>(null);
  const readGeneration = useRef(0);
  useEffect(
    () => () => {
      readGeneration.current += 1;
    },
    [],
  );
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  async function read(file: File | undefined) {
    const generation = ++readGeneration.current;
    setCandidate(null);
    setConfirmed(false);
    setMessage("");
    if (!file) return;
    setMessage(`Чтение файла: ${file.name}`);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("too large");
      const text = await file.text();
      if (generation !== readGeneration.current) return;
      setCandidate({ data: validateImport(text), name: file.name });
      setMessage("");
    } catch {
      if (generation !== readGeneration.current) return;
      setMessage(
        "Файл не прошёл проверку: проверьте формат, версию, записи и размер до 10 МБ. Текущие данные не изменены.",
      );
    }
  }
  async function replace() {
    if (!candidate || !confirmed || busy || !writable) return;
    setBusy(true);
    if (await onUpdate(candidate.data)) {
      setMessage("Данные заменены проверенной копией.");
      setCandidate(null);
    } else setMessage("Не удалось заменить данные. Прежняя история сохранена.");
    setBusy(false);
  }
  return (
    <section className="panel settings">
      <div className="panel-heading">
        <h2>Настройки и резервная копия</h2>
        <button
          aria-label="Закрыть настройки"
          onClick={onClose}
          disabled={busy}
        >
          <X size={18} />
        </button>
      </div>
      <p>
        Результаты хранятся только в этом браузере и на этом адресе. Очистка
        данных браузера может их удалить. Для переноса на другое устройство или
        адрес скачайте JSON.
      </p>
      {writable && <AISettings />}
      <div className="row">
        <button onClick={() => downloadBackup(data)}>
          <Download size={17} />
          Скачать текущую копию
        </button>
        <label className="file-button">
          <Upload size={17} />
          Выбрать JSON
          <input
            type="file"
            accept="application/json,.json"
            aria-label="Импорт JSON"
            disabled={!writable || busy}
            onChange={(e) => void read(e.target.files?.[0])}
          />
        </label>
      </div>
      {candidate && (
        <div className="callout">
          <h3>Проверка пройдена</h3>
          <p>Проверенный файл: {candidate.name}</p>
          <ul data-testid="import-summary">
            <li>Попытки: {candidate.data.attempts.length}</li>
            <li>
              Опыты:{" "}
              {candidate.data.experiments.length +
                candidate.data.modelExperiments.length +
                candidate.data.visualizationExperiments.length}
            </li>
            <li>Диагностики: {candidate.data.diagnostics.length}</li>
            <li>Личные модули: {candidate.data.customModules.length}</li>
            <li>
              Проверки учебных и личных модулей:{" "}
              {candidate.data.customRuns.length}
            </li>
            <li>Беседы: {candidate.data.studyChats.length}</li>
            <li>Визуализации: {candidate.data.visualizations.length}</li>
            <li>
              Исследования визуализаций:{" "}
              {candidate.data.visualizationExperiments.length}
            </li>
          </ul>
          <p>Текущие записи будут заменены. Слияния нет.</p>
          <button onClick={() => downloadBackup(data)}>
            Скачать копию перед заменой
          </button>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Подтверждаю замену текущих данных
          </label>
          <button
            className="primary"
            disabled={!confirmed || busy || !writable}
            onClick={() => void replace()}
          >
            Заменить данные
          </button>
        </div>
      )}
      <p role="status">{message}</p>
      <hr />
      <h3>Доступность</h3>
      <p>
        Анимация запускается вручную. Системная настройка уменьшения движения
        отключает непрерывное воспроизведение; шаги и числа остаются доступны.
        Для чисел можно использовать точку или запятую.
      </p>
      <small>
        Версия приложения 0.2.0 · Схема данных 1 · Материалы K1/K2/M1/T1/R1/E1
        v1
      </small>
    </section>
  );
}
