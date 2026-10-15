import { test, expect } from "@playwright/test";
test("K1: опыт сохраняется и восстанавливается; число и единица проверяются отдельно", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать занятие" }).click();
  await page.getByRole("tab", { name: "Эксперимент", exact: false }).click();
  await page
    .getByLabel("Мой прогноз")
    .fill("Думаю, тележка проедет 16 метров.");
  await page.getByRole("button", { name: "К концу опыта" }).click();
  await expect(page.getByTestId("distance-value")).toHaveText("16 м");
  await expect(page.getByTestId("velocity-value")).toHaveText("8 м/с");
  await page
    .getByLabel("Мои наблюдения")
    .fill("Каждую секунду путь растёт: 1, 3, 5, 7 м.");
  await page
    .getByLabel("Мой вывод")
    .fill("При разгоне нужна средняя, а не конечная скорость.");
  await page.getByRole("button", { name: "Сохранить опыт" }).click();
  await expect(page.getByText("Опыт сохранён.")).toBeVisible();
  await page.getByRole("tab", { name: "Тренировка", exact: false }).click();
  await page.getByLabel("Число").fill("4");
  await page
    .getByRole("combobox", { name: "Единица ответа" })
    .selectOption("м/с²");
  await page.getByRole("button", { name: "Проверить ответ" }).click();
  await expect(
    page.getByText("Число верное. Проверьте единицу измерения."),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    page.getByText("При разгоне нужна средняя, а не конечная скорость.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("20 м за 5 с", { exact: false })).toBeVisible();
});
test("страница работает при ширине 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Начать занятие" }).click();
  await page.getByRole("tab", { name: "Эксперимент", exact: false }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("пять самостоятельных ответов подтверждают K1; следующая проверка меняет вариант", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать занятие" }).click();
  await page.getByRole("tab", { name: "Проверка" }).click();
  for (const answer of ["Путь 6 м, перемещение 0 м", "Влево", "м/с²"]) {
    await page.getByRole("radio", { name: answer, exact: true }).check();
    await page.getByRole("button", { name: "Проверить ответ" }).click();
    await page.getByRole("button", { name: "Следующее задание" }).click();
  }
  await page.getByRole("textbox", { name: "Число", exact: true }).fill("24");
  await page
    .getByRole("combobox", { name: "Единица ответа" })
    .selectOption("м");
  await page.getByRole("button", { name: "Проверить ответ" }).click();
  await page.getByRole("button", { name: "Следующее задание" }).click();
  await page
    .getByRole("radio", { name: "Увеличится в 4 раза", exact: true })
    .check();
  await page.getByRole("button", { name: "Проверить ответ" }).click();
  await page.getByRole("button", { name: "Показать итог" }).click();
  await expect(
    page.getByRole("heading", { name: "Понимание подтверждено заданиями" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Другой вариант" }).click();
  await expect(page.getByRole("heading", { name: /5 м влево/ })).toBeVisible();
});
test("подсказка не забывается при переходе к объяснению", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать занятие" }).click();
  await page.getByRole("tab", { name: "Проверка" }).click();
  await page.getByRole("button", { name: "Подсказка 0/3" }).click();
  await page.getByRole("tab", { name: "Объяснение" }).click();
  await page.getByRole("tab", { name: "Проверка" }).click();
  await expect(
    page.getByRole("button", { name: "Подсказка 1/3" }),
  ).toBeVisible();
});
test("пауза блокирует время, изменение условий начинает новый опыт", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать занятие" }).click();
  await page.getByRole("tab", { name: "Эксперимент" }).click();
  await page.getByLabel("Мой прогноз").fill("Тележка ускорится");
  await page.getByRole("button", { name: "Запустить", exact: true }).click();
  await expect(
    page.getByLabel("Начальная скорость v₀, м/с", { exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  const t = await page
    .getByLabel("Момент времени", { exact: true })
    .inputValue();
  await page
    .getByLabel("Мои наблюдения")
    .fill("После паузы время остановилось");
  expect(
    await page.getByLabel("Момент времени", { exact: true }).inputValue(),
  ).toBe(t);
  await page.getByLabel("Сценарий", { exact: true }).selectOption("Разворот");
  await expect(page.getByLabel("Мой прогноз")).toHaveValue("");
  await expect(page.getByLabel("Момент времени", { exact: true })).toHaveValue(
    "0",
  );
});
test("вторая вкладка читает, после закрытия первой получает запись", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Данные хранятся в этом браузере", { exact: true }),
  ).toBeVisible();
  const second = await context.newPage();
  await second.goto("/");
  await expect(
    second.getByText("Режим чтения.", { exact: false }),
  ).toBeVisible();
  await page.close();
  await expect(
    second.getByText("Данные хранятся в этом браузере", { exact: true }),
  ).toBeVisible();
});
test("подсказка остаётся учебной после перезагрузки страницы", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать занятие" }).click();
  await page.getByRole("tab", { name: "Проверка" }).click();
  await page.getByRole("button", { name: "Подсказка 0/3" }).click();
  await expect(
    page.getByRole("button", { name: "Подсказка 1/3" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Начать занятие" }).click();
  await page.getByRole("tab", { name: "Проверка" }).click();
  await expect(
    page.getByRole("button", { name: "Подсказка 1/3" }),
  ).toBeVisible();
  await page
    .getByRole("radio", { name: "Путь 6 м, перемещение 0 м", exact: true })
    .check();
  await page.getByRole("button", { name: "Проверить ответ" }).click();
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    page.getByText("Учебная попытка с подсказкой", { exact: false }),
  ).toBeVisible();
});
test("восстановительный разбор остаётся учебным и возвращает к другому варианту", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать занятие" }).click();
  await page.getByRole("tab", { name: "Проверка" }).click();
  await page
    .getByRole("radio", { name: "Путь 0 м, перемещение 0 м", exact: true })
    .check();
  await page.getByRole("button", { name: "Проверить ответ" }).click();
  await page
    .getByRole("button", { name: "Разобрать и потренироваться" })
    .click();
  await expect(
    page.getByText(
      "Восстановительная тренировка · без самостоятельного зачёта",
    ),
  ).toBeVisible();
  await page
    .getByRole("radio", { name: "Путь 6 м, перемещение 0 м", exact: true })
    .check();
  await page.getByRole("button", { name: "Проверить ответ" }).click();
  await page
    .getByRole("button", { name: "Вернуться к проверке: новый вариант" })
    .click();
  await expect(page.getByRole("heading", { name: /5 м влево/ })).toBeVisible();
});
