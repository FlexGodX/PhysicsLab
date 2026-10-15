import { test, expect } from "@playwright/test";
test("DOCX создаёт модуль, прохождение сохраняется и появляется в результатах", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Создать модуль", exact: true })
    .click();
  await page
    .getByLabel("PDF или DOCX")
    .setInputFiles("e2e/fixtures/physics.docx");
  await expect(page.getByLabel("Текст документа")).toContainText(
    "Сила упругости",
  );
  await page.getByLabel("Название модуля").fill("Упругая сила");
  await page.getByRole("button", { name: "Добавить модуль чтения" }).click();
  await expect(
    page.getByRole("heading", { name: "Упругая сила", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Раздел прочитан").click();
  await expect(page.getByLabel("Раздел прочитан")).toBeChecked();
  await expect(page.getByText("Пройдено 100%", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Упругая сила", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Пройдено 100%", { exact: true })).toBeVisible();
});
test("PDF извлекается, генерация через API создаёт проверяемый модуль", async ({
  page,
  browser,
}) => {
  await page.route("**/api/ai/chat", (route) =>
    route.fulfill({
      json: {
        provider: "lmstudio",
        draft: {
          title: "Закон Гука",
          objective: "Понять упругость",
          sections: [
            { title: "Смысл закона", body: "Сила пропорциональна удлинению." },
          ],
          example: "При k=100 Н/м и x=0,02 м F=2 Н.",
          questions: Array.from({ length: 5 }, (_, i) => ({
            prompt: `Вопрос ${i + 1}: единица силы?`,
            options: ["Ньютон", "Метр"],
            correctIndex: 0,
            explanation: "Сила измеряется в ньютонах.",
          })),
          visualizations: [],
        },
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Создать модуль", exact: true })
    .click();
  await page
    .getByLabel("PDF или DOCX")
    .setInputFiles("e2e/fixtures/physics.pdf");
  await expect(page.getByLabel("Текст документа")).toContainText("Hooke law");
  await page.getByRole("button", { name: "Создать с ИИ", exact: true }).click();
  await page
    .getByRole("button", { name: "Добавить в курс", exact: true })
    .click();
  await page.getByLabel("Раздел прочитан").click();
  await expect(page.getByLabel("Раздел прочитан")).toBeChecked();
  await page
    .getByRole("button", { name: "Проверка модуля", exact: true })
    .click();
  for (let i = 1; i <= 5; i++)
    await page
      .getByRole("group", { name: `Вопрос ${i}: единица силы?` })
      .getByLabel("Ньютон", { exact: true })
      .check();
  await page.getByRole("button", { name: "Завершить проверку" }).click();
  await expect(
    page.getByText("Баллы: 100 / 100", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Пройдено 100%", { exact: true })).toBeVisible();
  const backupEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать резервную копию", exact: true })
    .click();
  const backup = await backupEvent;
  const target = await browser.newContext();
  const second = await target.newPage();
  await second.goto("/");
  await second.getByRole("button", { name: "Настройки", exact: true }).click();
  await second.getByLabel("Импорт JSON").setInputFiles((await backup.path())!);
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
  await second.getByRole("button", { name: "Закрыть настройки" }).click();
  await second.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    second.getByText("Баллы: 100 / 100", { exact: true }),
  ).toBeVisible();
  await expect(
    second.getByText("Пройдено 100%", { exact: true }),
  ).toBeVisible();
  await expect(
    second.getByRole("button", { name: "Печатать отчёт" }),
  ).toBeEnabled();
  await target.close();
});
test("чат сохраняет обсуждение темы и экранирует ответ модели", async ({
  page,
}) => {
  await page.route("**/api/ai/chat", (route) =>
    route.fulfill({
      json: {
        text: "Сила F=kx. <script>window.hacked=true</script>",
        provider: "lmstudio",
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Обсудить с ИИ", exact: true })
    .click();
  await page.getByLabel("Ваш вопрос").fill("Почему пружина растягивается?");
  await page.getByRole("button", { name: "Отправить вопрос" }).click();
  await expect(page.getByRole("log")).toContainText("Сила F=kx.");
  expect(await page.evaluate(() => "hacked" in window)).toBe(false);
  await page.reload();
  await page
    .getByRole("button", { name: "Обсудить с ИИ", exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText(
    "Почему пружина растягивается?",
  );
});
test("Anatomy управляется клавиатурой, сохраняет новую иллюстрацию и помещается на телефоне", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/ai/chat", (route) =>
    route.fulfill({
      json: {
        visualization: {
          title: "Работа при растяжении",
          mechanism: "spring",
          caption: "Энергия растёт как квадрат удлинения.",
        },
        provider: "lmstudio",
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Мастерская", exact: true }).click();
  await page
    .getByText("Пример того, что можно создать", { exact: true })
    .click();
  const slider = page.getByLabel("Удлинение, мм").first();
  await slider.focus();
  await slider.press("End");
  await expect(page.locator(".anatomy-readout output").first()).toContainText(
    "F = 10.00 Н",
  );
  await page
    .getByText("Пример того, что можно создать", { exact: true })
    .click();
  await page
    .getByLabel("Что показать в дополнительной визуализации?")
    .fill("Энергия пружины");
  await page
    .getByRole("button", { name: "Создать визуализацию", exact: true })
    .click();
  await expect(
    page.getByText("Работа при растяжении", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Сохранить визуализацию", exact: true })
    .click();
  await expect(
    page.getByText("Визуализация сохранена.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Мастерская", exact: true }).click();
  await expect(
    page.getByText("Работа при растяжении", { exact: true }),
  ).toBeVisible();
});
test("новая Anatomy-сцена связывает детали, формулу и сохранение", async ({
  page,
}) => {
  const scene = {
    controls: [
      { id: "x", label: "Перемещение, м", min: 0, max: 10, value: 2, step: 1 },
    ],
    parts: Array.from({ length: 40 }, (_, i) => ({
      name: `Деталь ${i + 1}`,
      x: (i % 10) * 12,
      y: Math.floor(i / 10) * 15,
      z: 0,
      w: 10,
      d: 10,
      h: 5,
      lit: i === 0,
      move: i === 0 ? { control: "x", axis: "x", scale: 2 } : null,
    })),
    readouts: [{ label: "Работа", expression: "5*x", unit: "Дж" }],
  };
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/ai/chat", (route) =>
    route.fulfill({
      json: {
        visualization: {
          title: "Работа постоянной силы",
          mechanism: "custom",
          caption: "Сила 5 Н направлена вдоль перемещения.",
          scene,
        },
        provider: "lmstudio",
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Мастерская", exact: true }).click();
  await page
    .getByLabel("Что показать в дополнительной визуализации?")
    .fill("Работа силы");
  await page
    .getByRole("button", { name: "Создать визуализацию", exact: true })
    .click();
  await expect(
    page.getByText("Работа постоянной силы", { exact: true }),
  ).toBeVisible();
  const slider = page.getByLabel("Перемещение, м");
  await slider.focus();
  await slider.press("End");
  await expect(page.locator(".anatomy-readout output").first()).toHaveText(
    "Работа: 50 Дж",
  );
  await page.getByText("Править показания модели", { exact: true }).click();
  const formula = page.getByLabel("Формула: Работа (Дж)", { exact: true });
  await formula.fill("1/0");
  await page
    .getByRole("button", { name: "Сохранить визуализацию", exact: true })
    .click();
  await expect(
    page.getByText("Проверьте название, объяснение и формулы показаний:", {
      exact: false,
    }),
  ).toBeVisible();
  await formula.fill("10*x");
  await expect(page.locator(".anatomy-readout output").first()).toHaveText(
    "Работа: 100 Дж",
  );
  await page
    .getByRole("button", { name: "Сохранить визуализацию", exact: true })
    .click();
  await expect(
    page.getByText("Визуализация сохранена.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Мастерская", exact: true }).click();
  await expect(
    page.getByText("Работа постоянной силы", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Исследовать на площадке", exact: true })
    .click();
  await expect(page.locator(".anatomy-readout output").first()).toHaveText(
    "Работа: 20 Дж",
  );
});
