import { useEffect, useState } from "react";
import { aiRequest, type CodexStatus, type CodexLogin } from "../studio/api";

export function CodexConnection({ disabled = false }: { disabled?: boolean }) {
  const [status, setStatus] = useState<CodexStatus | null>(null);
  const [login, setLogin] = useState<CodexLogin>({ state: "idle" });
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    void aiRequest<CodexStatus>("codex/status", undefined, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setStatus(value);
        // The start response may arrive before the status endpoint has observed it.
        setLogin(value.login);
        setError("");
        if (value.login.state === "starting" || value.login.state === "pending")
          timer = setTimeout(() => setRevision((v) => v + 1), 2500);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError((e as Error).message);
      });
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [revision]);
  async function action(path: string) {
    setBusy(true);
    setError("");
    try {
      const value = await aiRequest<CodexLogin>(path, {});
      setLogin(value);
      if (value.state === "connected") setRevision((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (login.state !== "starting" && login.state !== "pending") return;
    const timer = setTimeout(() => setRevision((v) => v + 1), 2500);
    return () => clearTimeout(timer);
  }, [login.state]);
  const pending = login.state === "pending" || login.state === "starting";
  return (
    <section className="callout" aria-label="Подключение Codex по подписке">
      <h3>Codex по подписке ChatGPT</h3>
      <p>
        Используется Codex, установленный на этом компьютере, и ваш вход
        ChatGPT. API-ключ не нужен. Запросы расходуют лимиты вашего плана.
      </p>
      <p role="status">{status?.message ?? "Проверяем установленный Codex…"}</p>
      {status && !status.installed && (
        <p>
          Установите{" "}
          <a
            href="https://developers.openai.com/codex/cli"
            target="_blank"
            rel="noreferrer"
          >
            Codex CLI
          </a>
          , затем повторите проверку.
        </p>
      )}
      {pending && (
        <div>
          {login.code && (
            <p>
              Код для входа: <strong>{login.code}</strong>
            </p>
          )}
          {login.url === "https://auth.openai.com/codex/device" && (
            <a href={login.url} target="_blank" rel="noreferrer">
              Открыть страницу входа
            </a>
          )}
          <p>
            Введите код на странице OpenAI, подтвердите аккаунт и вернитесь
            сюда. Статус обновится автоматически.
          </p>
        </div>
      )}
      {login.message && (
        <p role={login.state === "error" ? "alert" : "status"}>
          {login.message}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="row">
        <button
          disabled={disabled || busy}
          onClick={() => setRevision((v) => v + 1)}
        >
          Проверить вход Codex
        </button>
        {status?.installed && !status.authenticated && !pending && (
          <button
            disabled={disabled || busy}
            onClick={() => void action("codex/login")}
          >
            Войти через ChatGPT
          </button>
        )}
        {pending && (
          <button
            disabled={disabled || busy}
            onClick={() => void action("codex/cancel-login")}
          >
            Отменить вход
          </button>
        )}
      </div>
      <p className="small muted">
        Вход сохраняется в Codex на этом компьютере. Для входа можно также
        выполнить «codex login» в терминале. Выход выполняется в Codex; закрытие
        этой панели не отключает аккаунт.
      </p>
    </section>
  );
}
