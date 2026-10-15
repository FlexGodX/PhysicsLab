import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("курс, объяснение и лаборатория проходят автоматическую проверку доступности", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Начать занятие" }).waitFor();
  for (const screen of ["course", "theory", "lab"]) {
    if (screen === "theory")
      await page.getByRole("button", { name: "Начать занятие" }).click();
    if (screen === "lab")
      await page.getByRole("tab", { name: "Эксперимент" }).click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(result.violations, screen).toEqual([]);
  }
});
test("все учебные объяснения доступны на экране 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  for (const id of ["K1", "K2", "M1", "T1", "R1", "E1"]) {
    await page
      .getByRole("button", {
        name: id === "K1" ? "Начать занятие" : `Открыть ${id}`,
        exact: true,
      })
      .click();
    await page.locator(".katex").first().waitFor();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(result.violations, id).toEqual([]);
    await page.getByRole("button", { name: "Курс", exact: true }).click();
  }
});
