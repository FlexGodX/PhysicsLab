import { test, expect } from "@playwright/test";
import { emptyWorkspace } from "../src/persistence/schema";
import { createReadingModule } from "../src/studio/modules";
test("медленное чтение первой копии не подменяет последнюю; сводка показывает личные записи", async ({
  page,
}) => {
  const first = emptyWorkspace(),
    second = emptyWorkspace();
  second.customModules = [
    createReadingModule(
      "Последняя выбранная копия",
      "Материал для чтения.",
      "lecture.pdf",
    ),
  ];
  second.studyChats = [
    {
      id: "chat",
      topicId: "K1",
      messages: [
        { role: "user", content: "Что такое скорость?" },
        {
          role: "assistant",
          content: "Изменение координаты за единицу времени.",
        },
      ],
      updatedAt: new Date().toISOString(),
    },
  ];
  second.visualizations = [
    {
      id: "figure",
      title: "Пружина из копии",
      mechanism: "spring",
      caption: "Сила пропорциональна удлинению.",
    },
  ];
  await page.addInitScript(() => {
    const original = File.prototype.text;
    File.prototype.text = async function () {
      const text = await original.call(this);
      if (this.name === "first.json") {
        await new Promise<void>((resolve) => {
          (window as any).releaseFirstRead = resolve;
        });
      }
      return text;
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  const input = page.getByLabel("Импорт JSON");
  await input.setInputFiles({
    name: "first.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(first)),
  });
  await expect
    .poll(() => page.evaluate(() => typeof (window as any).releaseFirstRead))
    .toBe("function");
  await input.setInputFiles({
    name: "second.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(second)),
  });
  await expect(
    page.getByText("Проверка пройдена", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => (window as any).releaseFirstRead());
  await page.waitForTimeout(100);
  await expect(
    page.getByText("Проверенный файл: second.json", { exact: true }),
  ).toBeVisible();
  const summary = page.getByTestId("import-summary");
  await expect(summary).toContainText("Личные модули: 1");
  await expect(summary).toContainText("Беседы: 1");
  await expect(summary).toContainText("Визуализации: 1");
  await page.getByLabel("Подтверждаю замену текущих данных").check();
  await page
    .getByRole("button", { name: "Заменить данные", exact: true })
    .click();
  await expect(
    page.getByText("Данные заменены проверенной копией.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Закрыть настройки" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Последняя выбранная копия",
      exact: true,
    }),
  ).toBeVisible();
});
