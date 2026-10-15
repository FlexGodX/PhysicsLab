import { spawn } from "node:child_process";

export interface CodexProcessOptions {
  executable?: string;
  environment?: NodeJS.ProcessEnv;
}

export function runCodex(
  args: string[],
  options: CodexProcessOptions & {
    cwd: string;
    input?: string;
    signal?: AbortSignal;
    timeoutMs: number;
    onOutput?: (text: string) => void;
  },
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  if (options.signal?.aborted)
    return Promise.reject(new DOMException("Запрос отменён", "AbortError"));
  const source = options.environment ?? process.env;
  const env: NodeJS.ProcessEnv = {};
  for (const key of [
    "PATH",
    "HOME",
    "USERPROFILE",
    "USER",
    "LOGNAME",
    "TMPDIR",
    "TMP",
    "TEMP",
    "SYSTEMROOT",
    "WINDIR",
    "CODEX_HOME",
    "LANG",
    "LC_ALL",
    "SSL_CERT_FILE",
    "SSL_CERT_DIR",
    "NODE_EXTRA_CA_CERTS",
    "HTTPS_PROXY",
    "HTTP_PROXY",
    "ALL_PROXY",
    "NO_PROXY",
    "https_proxy",
    "http_proxy",
    "all_proxy",
    "no_proxy",
  ])
    if (source[key]) env[key] = source[key];
  return new Promise((resolve, reject) => {
    const child = spawn(
      options.executable ?? process.env.PHYSICS_CODEX_BIN ?? "codex",
      args,
      {
        cwd: options.cwd,
        env,
        shell: false,
        detached: process.platform !== "win32",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stdout = "",
      stderr = "",
      bytes = 0;
    let failure: Error | undefined;
    let force: ReturnType<typeof setTimeout> | undefined;
    const kill = (signal: NodeJS.Signals) => {
      try {
        if (process.platform !== "win32" && child.pid)
          process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {
        /* The process may have already closed. */
      }
    };
    const stop = (error: Error) => {
      if (failure) return;
      failure = error;
      kill("SIGTERM");
      force = setTimeout(() => kill("SIGKILL"), 1000);
      force.unref();
    };
    const abort = () => stop(new DOMException("Запрос отменён", "AbortError"));
    const timer = setTimeout(
      () =>
        stop(
          new DOMException(
            "Codex не ответил за отведённое время",
            "TimeoutError",
          ),
        ),
      options.timeoutMs,
    );
    const cleanup = () => {
      clearTimeout(timer);
      clearTimeout(force);
      options.signal?.removeEventListener("abort", abort);
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();
    for (const [stream, kind] of [
      [child.stdout, "stdout"],
      [child.stderr, "stderr"],
    ] as const) {
      stream.setEncoding("utf8");
      stream.on("data", (text: string) => {
        bytes += Buffer.byteLength(text);
        if (bytes > 2 * 1024 * 1024) {
          stop(new Error("Ответ Codex слишком большой. Сократите запрос."));
          return;
        }
        if (kind === "stdout") stdout += text;
        else stderr += text;
        options.onOutput?.(text);
      });
    }
    child.stdin.on("error", () => {});
    child.on("error", (error: NodeJS.ErrnoException) => {
      cleanup();
      reject(
        new Error(
          error.code === "ENOENT"
            ? "Codex CLI не установлен или не найден. Установите Codex CLI и повторите проверку."
            : "Не удалось запустить Codex CLI. Проверьте установку.",
        ),
      );
    });
    child.on("close", (code) => {
      cleanup();
      if (failure) reject(failure);
      else resolve({ code, stdout, stderr });
    });
    child.stdin.end(options.input ?? "");
  });
}
