import { test, expect } from "@playwright/test";

test("Codex подключается без API-ключа и отвечает в учебном чате", async ({
  page,
}) => {
  let active = "lmstudio";
  await page.route("**/api/ai/config", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({ provider: "codex", model: "" });
      expect(body.apiKey ?? "").toBe("");
      active = "codex";
    }
    await route.fulfill({
      json: {
        active,
        providers: Object.fromEntries(
          [
            "lmstudio",
            "openrouter",
            "openai",
            "anthropic",
            "gemini",
            "codex",
          ].map((p) => [
            p,
            { model: "", baseUrl: "", hasKey: false, fastMode: false },
          ]),
        ),
      },
    });
  });
  let connected = false;
  await page.route("**/api/ai/codex/status", (route) =>
    route.fulfill({
      json: {
        installed: true,
        authenticated: connected,
        authMode: connected ? "chatgpt" : "none",
        message: connected
          ? "Codex подключён через ChatGPT."
          : "Войдите в Codex через ChatGPT.",
        login: { state: connected ? "connected" : "idle" },
      },
    }),
  );
  await page.route("**/api/ai/codex/login", (route) =>
    route.fulfill({
      json: {
        state: "pending",
        url: "https://auth.openai.com/codex/device",
        code: "ABCD-12345",
      },
    }),
  );
  await page.route("**/api/ai/chat", (route) =>
    route.fulfill({
      json: {
        text: "Средняя скорость равна 4 м/с, путь — 16 м.",
        provider: "codex",
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Сервис", exact: true })
    .selectOption("codex");
  await expect(page.getByLabel("Ключ API", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Сохранить подключение", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Войти через ChatGPT", exact: true })
    .click();
  await expect(page.getByText("ABCD-12345", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Открыть страницу входа", exact: true }),
  ).toHaveAttribute("href", "https://auth.openai.com/codex/device");
  connected = true;
  await page
    .getByRole("button", { name: "Проверить вход Codex", exact: true })
    .click();
  await expect(
    page.getByText("Codex подключён через ChatGPT.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Сохранить подключение", exact: true })
    .click();
  await expect(
    page.getByText("Настройки сохранены.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Закрыть настройки", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Обсудить с ИИ", exact: true })
    .first()
    .click();
  await expect(page.getByText(/^Codex · модель по умолчанию\./)).toBeVisible();
  await page.getByLabel("Ваш вопрос").fill("Почему путь 16 м?");
  await page
    .getByRole("button", { name: "Отправить вопрос", exact: true })
    .click();
  await expect(
    page.getByText("Средняя скорость равна 4 м/с, путь — 16 м.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("загрузка настроек не позволяет позднему ответу сбросить выбор сервиса", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/ai/config", async (route) => {
    await gate;
    await route.fulfill({
      json: {
        active: "lmstudio",
        providers: Object.fromEntries(
          [
            "lmstudio",
            "openrouter",
            "openai",
            "anthropic",
            "gemini",
            "codex",
          ].map((p) => [
            p,
            { model: "", baseUrl: "", hasKey: false, fastMode: false },
          ]),
        ),
      },
    });
  });
  await page.route("**/api/ai/codex/status", (route) =>
    route.fulfill({
      json: {
        installed: true,
        authenticated: true,
        authMode: "chatgpt",
        message: "Codex подключён через ChatGPT.",
        login: { state: "idle" },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  const service = page.getByRole("combobox", { name: "Сервис", exact: true });
  await expect(service).toBeDisabled();
  release();
  await expect(service).toBeEnabled();
  await service.selectOption("codex");
  await expect(
    page.getByText("Codex подключён через ChatGPT.", { exact: true }),
  ).toBeVisible();
  await expect(service).toHaveValue("codex");
});
