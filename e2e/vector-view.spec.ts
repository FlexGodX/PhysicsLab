import { test, expect } from "@playwright/test";
for (const model of ["linear", "circular"])
  test(`${model}: вид векторов меняется без сброса условий и времени`, async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Игровая площадка", exact: true })
      .click();
    await page.getByLabel("Модель эксперимента").selectOption(model);
    await page
      .getByLabel("Мой прогноз")
      .fill("Сохранить этот прогноз при настройке вида.");
    if (model === "linear")
      await page
        .getByRole("button", { name: "К концу опыта", exact: true })
        .click();
    else
      await page
        .getByRole("button", { name: "Шаг модели", exact: true })
        .click();
    const scrubber = page.getByRole("slider", {
      name: model === "linear" ? "Момент времени" : "Момент времени, с",
    });
    const value = await scrubber.inputValue();
    const speed = page.getByTestId(
      model === "linear" ? "velocity-value" : "metric-speed",
    );
    const before = await speed.textContent();
    await page.getByText("Вид векторов", { exact: true }).click();
    const arrow = page.locator('line[data-vector="velocity"]');
    await expect(arrow).toBeAttached();
    const length = async () =>
      arrow.evaluate((e) =>
        Math.hypot(
          Number(e.getAttribute("x2")) - Number(e.getAttribute("x1")),
          Number(e.getAttribute("y2")) - Number(e.getAttribute("y1")),
        ),
      );
    const initial = await length();
    await page.getByLabel("Масштаб стрелки скорости").selectOption("0.5");
    expect(await length()).toBeCloseTo(initial / 2, 5);
    await expect(speed).toHaveText(before!);
    await expect(scrubber).toHaveValue(value);
    await page.getByLabel("Показывать скорость v").uncheck();
    await expect(arrow).toHaveCount(0);
    await page.getByLabel("Показывать ускорение a").uncheck();
    await expect(page.locator('line[data-vector="acceleration"]')).toHaveCount(
      0,
    );
    await page.getByLabel("Подписи векторов").uncheck();
    await expect(page.locator("[data-vector-label]")).toHaveCount(0);
    await expect(speed).toHaveText(before!);
    await expect(scrubber).toHaveValue(value);
    await expect(page.getByLabel("Мой прогноз")).toHaveValue(
      "Сохранить этот прогноз при настройке вида.",
    );
  });
test("управление видом доступно во время движения и помещается на телефоне", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page.getByLabel("Модель эксперимента").selectOption("circular");
  await page.getByText("Вид векторов", { exact: true }).click();
  await page.getByRole("button", { name: "Запустить", exact: true }).click();
  const scrubber = page.getByRole("slider", { name: "Момент времени, с" });
  await expect
    .poll(async () => Number(await scrubber.inputValue()))
    .toBeGreaterThan(0.2);
  const before = Number(await scrubber.inputValue());
  await page.getByLabel("Показывать скорость v").uncheck();
  expect(Number(await scrubber.inputValue())).toBeGreaterThanOrEqual(before);
  await expect(
    page.getByRole("button", { name: "Пауза", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Масштаб стрелки ускорения").selectOption("1.25");
  await expect
    .poll(async () => Number(await scrubber.inputValue()))
    .toBeGreaterThan(before + 0.2);
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
