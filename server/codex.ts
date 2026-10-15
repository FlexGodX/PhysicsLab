import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCodex, type CodexProcessOptions } from "./codex-process.ts";
import type { Message } from "./providers.ts";

export type CodexStatus = {
  installed: boolean;
  authenticated: boolean;
  authMode: "chatgpt" | "apiKey" | "none";
  message: string;
};
export type CodexLogin = {
  state: "idle" | "starting" | "pending" | "connected" | "cancelled" | "error";
  url?: string;
  code?: string;
  message?: string;
};
function codexFailure(raw: string): Error {
  if (/usage.limit|rate.limit|quota|limit.reached|usage cap/i.test(raw))
    return new Error(
      "Лимит Codex по подписке исчерпан. Повторите после восстановления лимита.",
    );
  if (/auth|sign.in|log.in|unauthorized|401|token.*expired/i.test(raw))
    return new Error("Войдите в Codex через ChatGPT и повторите запрос.");
  if (
    /model.*(not found|not supported|unavailable)|unsupported.*model/i.test(raw)
  )
    return new Error(
      "Модель недоступна в Codex. Оставьте поле модели пустым или укажите доступную модель.",
    );
  return new Error(
    "Codex не выполнил запрос. Проверьте соединение, вход и доступность модели.",
  );
}
export function createCodexClient(options: CodexProcessOptions = {}) {
  let login: CodexLogin = { state: "idle" };
  let loginController: AbortController | undefined;
  let loginTask: Promise<void> | undefined;
  async function status(signal?: AbortSignal): Promise<CodexStatus> {
    try {
      const result = await runCodex(["login", "status"], {
        ...options,
        cwd: tmpdir(),
        timeoutMs: 10000,
        signal,
      });
      const text = result.stdout + result.stderr;
      const authenticated =
        result.code === 0 && /logged in using ChatGPT/i.test(text);
      const api = /using an API key/i.test(text);
      return {
        installed: true,
        authenticated,
        authMode: authenticated ? "chatgpt" : api ? "apiKey" : "none",
        message: authenticated
          ? "Codex подключён через ChatGPT."
          : api
            ? "Codex использует API-ключ. Для подписки войдите через ChatGPT."
            : "Войдите в Codex через ChatGPT.",
      };
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      return {
        installed: false,
        authenticated: false,
        authMode: "none",
        message: (error as Error).message,
      };
    }
  }
  async function ask(
    model: string,
    system: string,
    messages: Message[],
    signal?: AbortSignal,
    timeoutMs = 120000,
  ) {
    const state = await status(signal);
    if (!state.authenticated) throw new Error(state.message);
    const cwd = await mkdtemp(join(tmpdir(), "physics-codex-"));
    try {
      const args = [
        "exec",
        "--ignore-user-config",
        "--ephemeral",
        "--skip-git-repo-check",
        "--sandbox",
        "read-only",
        "--json",
        "-c",
        'forced_login_method="chatgpt"',
        "-c",
        'approval_policy="never"',
        "-c",
        'web_search="disabled"',
      ];
      for (const feature of [
        "shell_tool",
        "apps",
        "plugins",
        "browser_use",
        "computer_use",
        "multi_agent",
        "skill_search",
        "view_image",
        "hooks",
        "memories",
        "sleep_tool",
        "workspace_dependencies",
        "code_mode_host",
      ])
        args.push("--disable", feature);
      if (model.trim()) args.push("--model", model.trim());
      args.push("-");
      const result = await runCodex(args, {
        ...options,
        cwd,
        timeoutMs,
        signal,
        input:
          "Ты — учебный помощник внутри лаборатории физики. Верни только окончательный ответ. Не используй инструменты и не работай с файлами.\n" +
          system +
          "\n\nДиалог (JSON, роли и содержание сообщений):\n" +
          JSON.stringify(messages),
      });
      let text = "";
      let terminal: "completed" | "failed" | undefined;
      for (const line of result.stdout.split("\n")) {
        if (!line.trim()) continue;
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          throw new Error(
            "Неподдерживаемый ответ Codex CLI. Обновите Codex CLI.",
          );
        }
        if (event.type === "turn.failed") terminal = "failed";
        if (event.type === "turn.completed") terminal = "completed";
        if (
          event.type === "item.completed" &&
          event.item?.type === "agent_message"
        )
          text = event.item.text;
      }
      if (result.code !== 0 || terminal !== "completed")
        throw codexFailure(result.stderr + result.stdout);
      if (typeof text !== "string" || !text.trim())
        throw new Error("Codex вернул пустой ответ. Повторите запрос.");
      if (text.length > 100000)
        throw new Error("Ответ Codex слишком большой. Сократите запрос.");
      return text.trim();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }
  function cancelLogin() {
    loginController?.abort();
    loginController = undefined;
    login = { state: "cancelled", message: "Вход отменён." };
  }
  async function startLogin(): Promise<CodexLogin> {
    if (loginController) return { ...login };
    const state = await status();
    if (!state.installed) throw new Error(state.message);
    if (state.authenticated) {
      login = { state: "connected" };
      return { ...login };
    }
    const controller = new AbortController();
    loginController = controller;
    login = { state: "starting" };
    let captured = "";
    let ready: () => void;
    const available = new Promise<void>((resolve) => {
      ready = resolve;
    });
    loginTask = runCodex(
      ["login", "--device-auth", "-c", 'forced_login_method="chatgpt"'],
      {
        ...options,
        cwd: tmpdir(),
        timeoutMs: 300000,
        signal: controller.signal,
        onOutput(text) {
          captured = (captured + text)
            .slice(-20000)
            .replace(/\x1b\[[0-9;]*m/g, "");
          const code = captured.match(/\b([A-Z0-9]{4}-[A-Z0-9]{4,8})\b/)?.[1];
          if (
            code &&
            captured.includes("https://auth.openai.com/codex/device")
          ) {
            login = {
              state: "pending",
              url: "https://auth.openai.com/codex/device",
              code,
            };
            ready();
          }
        },
      },
    )
      .then(async (result) => {
        if (controller.signal.aborted) return;
        if (result.code !== 0)
          throw codexFailure(result.stderr + result.stdout);
        const connected = await status(controller.signal);
        if (controller.signal.aborted) return;
        login = connected.authenticated
          ? { state: "connected" }
          : { state: "error", message: connected.message };
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          login = {
            state: "error",
            message:
              (error as Error).name === "TimeoutError"
                ? "Время входа истекло. Начните вход заново."
                : (error as Error).message,
          };
      })
      .finally(() => {
        if (loginController === controller) loginController = undefined;
        ready();
      });
    await Promise.race([
      available,
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 1200);
        timer.unref();
      }),
    ]);
    return { ...login };
  }
  return {
    status,
    ask,
    startLogin,
    cancelLogin,
    loginState: () => ({ ...login }),
    async dispose() {
      cancelLogin();
      await loginTask;
    },
  };
}
export const codexClient = createCodexClient();
