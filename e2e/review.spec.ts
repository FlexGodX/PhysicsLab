import { test, expect } from "@playwright/test";
test("короткое повторение состоит из вопроса и задачи и не подменяет проверку модуля", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Короткая проверка K1" }).click();
  await page
    .getByRole("radio", { name: "Путь 6 м, перемещение 0 м", exact: true })
    .check();
  await page.getByRole("button", { name: "Проверить ответ" }).click();
  await page.getByRole("button", { name: "Следующее задание" }).click();
  await page.getByLabel("Число", { exact: true }).fill("4");
  await page.getByLabel("Единица ответа").selectOption("м/с");
  await page.getByRole("button", { name: "Проверить ответ" }).click();
  await page.getByRole("button", { name: "Показать итог" }).click();
  await expect(
    page.getByRole("heading", { name: "Тренировка сохранена" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(
    page.getByText("Подтверждено заданиями: 0 / 6.", { exact: false }),
  ).toBeVisible();
});
