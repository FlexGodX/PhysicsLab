import { test, expect } from "@playwright/test";
test("восемь провайдеров: ключ сохраняется на сервере, модель выбирается, настройки переносятся и ключ удаляется", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await expect(page.getByLabel("Сервис").locator("option")).toHaveCount(8);
  await page.getByLabel("Сервис").selectOption("deepseek");
  await page.getByLabel("API-ключ", { exact: true }).fill("fake-e2e-key");
  await page.getByLabel("Модель", { exact: true }).fill("deepseek-test");
  await page
    .getByRole("button", { name: "Сохранить настройки ИИ", exact: true })
    .click();
  await expect(
    page.getByText("Ключ сервиса сохранён.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("API-ключ", { exact: true })).toHaveValue("");
  await page.route("**/api/ai/models?provider=deepseek", (r) =>
    r.fulfill({
      json: {
        provider: "deepseek",
        models: [
          { id: "deepseek-test", name: "DeepSeek test" },
          { id: "deepseek-other", name: "DeepSeek other" },
        ],
      },
    }),
  );
  await page
    .getByRole("button", { name: "Загрузить модели", exact: true })
    .click();
  await page.getByLabel("Доступные модели").selectOption("deepseek-other");
  await page
    .getByRole("button", { name: "Сохранить настройки ИИ", exact: true })
    .click();
  await expect(
    page.getByText(
      "Настройки сохранены. Можно использовать чат и мастерскую.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Сервис").selectOption("nvidia");
  await expect(page.getByLabel("Модель", { exact: true })).toHaveValue("");
  await page.getByLabel("Сервис").selectOption("deepseek");
  await expect(page.getByLabel("Модель", { exact: true })).toHaveValue(
    "deepseek-other",
  );
  await page.reload();
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await expect(page.getByLabel("Сервис")).toHaveValue("deepseek");
  await expect(page.getByLabel("Модель", { exact: true })).toHaveValue(
    "deepseek-other",
  );
  await expect(page.getByLabel("API-ключ", { exact: true })).toHaveValue("");
  await page
    .getByRole("button", { name: "Удалить API-ключ", exact: true })
    .click();
  await expect(page.getByText("Ключ удалён.", { exact: true })).toBeVisible();
  await page.getByLabel("Сервис").selectOption("ollama");
  await page.getByLabel("Адрес сервера Ollama").fill("http://localhost:11434");
  await page
    .getByRole("button", { name: "Сохранить настройки ИИ", exact: true })
    .click();
  await expect(
    page.getByText(/Ollama: укажите общедоступный HTTPS-адрес/),
  ).toBeVisible();
});

test("без входа настройки предлагают авторизацию и не принимают ключ", async ({
  page,
}) => {
  await page.route("**/api/ai/config", (r) =>
    r.fulfill({
      status: 401,
      json: { error: "Войдите в сайт через ChatGPT." },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await expect(
    page.getByRole("link", {
      name: "Войти через ChatGPT для личных настроек ИИ",
    }),
  ).toHaveAttribute("href", "/signin-with-chatgpt?return_to=%2F");
  await expect(page.getByLabel("API-ключ", { exact: true })).toBeDisabled();
});
