import { useEffect, useRef, useState } from "react";
import type { Workspace } from "../content/types";
import { emptyWorkspace, validateWorkspace } from "../persistence/schema";
import { loadWorkspace, saveWorkspace } from "../persistence/store";
export function useWorkspace() {
  const [data, setData] = useState<Workspace>(emptyWorkspace);
  const [ready, setReady] = useState(false);
  const [writable, setWritable] = useState(false);
  const [status, setStatus] = useState("Загрузка данных…");
  const [memory, setMemory] = useState(false);
  const current = useRef(data);
  const memoryRef = useRef(false);
  const busy = useRef(false);
  useEffect(() => {
    let disposed = false;
    let release: (() => void) | undefined;
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("physics-lab-updates")
        : null;
    const read = async () => {
      try {
        const loaded = await loadWorkspace();
        if (!disposed) {
          current.current = loaded;
          setData(loaded);
        }
      } catch {
        if (!disposed) {
          memoryRef.current = true;
          setMemory(true);
          setStatus(
            "Работа в памяти. Скачайте резервную копию до закрытия страницы.",
          );
        }
      } finally {
        if (!disposed) setReady(true);
      }
    };
    void read();
    channel?.addEventListener("message", () => {
      void read();
    });
    if (navigator.locks) {
      setStatus("Ожидание доступа к записи…");
      void navigator.locks.request("physics-lab-writer", async () => {
        if (disposed) return;
        await read();
        if (disposed) return;
        setWritable(true);
        if (!memoryRef.current) setStatus("Данные хранятся в этом браузере");
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      });
    } else {
      setStatus(
        "Браузер не поддерживает защиту от одновременной записи. Доступно чтение и экспорт.",
      );
    }
    return () => {
      disposed = true;
      release?.();
      channel?.close();
    };
  }, []);
  async function update(
    next: Workspace,
    atomicReplace = false,
  ): Promise<boolean> {
    if (!writable || busy.current) return false;
    if (atomicReplace && memoryRef.current) {
      setStatus(
        "Импорт недоступен: хранилище не отвечает. Прежние данные сохранены.",
      );
      return false;
    }
    try {
      next = validateWorkspace(next);
    } catch {
      setStatus("Данные не прошли проверку. Прежние записи сохранены.");
      return false;
    }
    busy.current = true;
    setStatus("Сохраняем…");
    try {
      if (!memoryRef.current) await saveWorkspace(next);
      current.current = next;
      setData(next);
      setStatus(
        memoryRef.current
          ? "Работа в памяти. Скачайте резервную копию."
          : "Сохранено на устройстве",
      );
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("physics-lab-updates");
        channel.postMessage("changed");
        channel.close();
      }
      return true;
    } catch {
      if (atomicReplace) {
        setStatus("Импорт не выполнен. Прежние данные сохранены.");
        return false;
      }
      memoryRef.current = true;
      setMemory(true);
      current.current = next;
      setData(next);
      setStatus(
        "Не удалось записать на устройство. Данные в памяти — скачайте копию.",
      );
      return true;
    } finally {
      busy.current = false;
    }
  }
  return { data, ready, writable, status, memory, update };
}
