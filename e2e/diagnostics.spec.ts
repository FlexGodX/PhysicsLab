import { test, expect } from "@playwright/test";
test("диагностика сохраняет пропуск отдельно от незнания и не подтверждает модуль", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Пройти диагностику", exact: true })
    .click();
  await page.getByRole("button", { name: "Начать 8 вопросов" }).click();
  await page.getByRole("button", { name: "Пропустить вопрос" }).click();
  await page.getByRole("button", { name: "Не знаю", exact: true }).click();
  for (let i = 0; i < 6; i++)
    await page.getByRole("button", { name: "Пропустить вопрос" }).click();
  await expect(
    page.getByRole("heading", { name: "Отправная точка сохранена" }),
  ).toBeVisible();
  await expect(page.getByText("Нет данных: 7")).toBeVisible();
  await expect(page.getByText("Нужен разбор: 1")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Результаты", exact: true }).click();
  await expect(page.getByText("Пропущено — нет данных").first()).toBeVisible();
  await expect(page.getByText("Не знаю — нужен разбор").first()).toBeVisible();
});
