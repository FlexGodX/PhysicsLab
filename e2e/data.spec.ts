import { test, expect } from "@playwright/test";
async function attempt(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать занятие" }).click();
  await page.getByRole("tab", { name: "Тренировка" }).click();
  await page.getByLabel("Число", { exact: true }).fill("4");
  await page.getByLabel("Единица ответа").selectOption("м/с");
  await page.getByRole("button", { name: "Проверить ответ" }).click();
  await expect(page.getByText("Верно.", { exact: true })).toBeVisible();
}
test("JSON переносит ответ в чистый профиль; повреждённый импорт его не меняет", async ({
  page,
  browser,
}) => {
  await attempt(page);
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать резервную копию", exact: true })
    .click();
  const download = await downloadEvent;
  const path = await download.path();
  const target = await browser.newContext();
  const second = await target.newPage();
  await second.goto("/");
  await second.getByRole("button", { name: "Настройки", exact: true }).click();
  await second.getByLabel("Импорт JSON").setInputFiles(path!);
  await expect(
    second.getByText("Проверка пройдена", { exact: true }),
  ).toBeVisible();
  await second.getByLabel("Подтверждаю замену текущих данных").check();
  await second
    .getByRole("button", { name: "Заменить данные", exact: true })
    .click();
  await expect(
    second.getByText("Данные заменены проверенной копией."),
  ).toBeVisible();
  await second.getByLabel("Импорт JSON").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{oops"),
  });
  await expect(
    second.getByText("Файл не прошёл проверку:", { exact: false }),
  ).toBeVisible();
  await second.getByRole("button", { name: "Закрыть настройки" }).click();
  await second.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    second.getByRole("heading", { name: /20 м за 5 с/ }),
  ).toBeVisible();
  await target.close();
});
test("печать исключает невыбранные записи и сохраняет сведения о самостоятельности", async ({
  page,
}) => {
  await attempt(page);
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    page.getByText("Самостоятельная попытка", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Включить в отчёт").uncheck();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".result-card")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Личная лаборатория · отчёт" }),
  ).toBeVisible();
});
test("отказ IndexedDB оставляет рабочую тренировку и доступный экспорт", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new Error("storage unavailable");
      },
    }),
  );
  await attempt(page);
  await expect(page.getByRole("alert")).toContainText("только в памяти");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать резервную копию", exact: true })
    .click();
  expect((await downloaded).suggestedFilename()).toContain("physics-lab");
});
test("уменьшение движения сохраняет доступный с клавиатуры шаг", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Начать занятие" }).click();
  await page.getByRole("tab", { name: "Эксперимент" }).click();
  await page.getByLabel("Мой прогноз").fill("Скорость начнёт расти");
  await expect(
    page.getByRole("button", { name: "Запустить", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Шаг 0,1 секунды" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("velocity-value")).toHaveText("0,2 м/с");
});
test("отказ записи во время замены оставляет прежнюю историю в интерфейсе", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<typeof original>
    ) {
      if ((window as unknown as { failWrites: boolean }).failWrites)
        throw new DOMException("Quota", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await attempt(page);
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать резервную копию", exact: true })
    .click();
  const backup = await event;
  const { readFile } = await import("node:fs/promises");
  const imported = JSON.parse(await readFile((await backup.path())!, "utf8"));
  imported.attempts = [];
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page
    .getByLabel("Импорт JSON")
    .setInputFiles({
      name: "replacement.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(imported)),
    });
  await page.getByLabel("Подтверждаю замену текущих данных").check();
  await page.evaluate(() => {
    (window as unknown as { failWrites: boolean }).failWrites = true;
  });
  await page
    .getByRole("button", { name: "Заменить данные", exact: true })
    .click();
  await expect(
    page.getByText("Не удалось заменить данные. Прежняя история сохранена."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Закрыть настройки" }).click();
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /20 м за 5 с/ }),
  ).toBeVisible();
});
