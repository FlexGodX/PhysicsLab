import { test, expect } from "@playwright/test";
test("активная сцена отображает рассчитанное состояние в текущем кадре", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame.bind(window);
    (window as any).__sceneFrameCommits = 0;
    window.requestAnimationFrame = (callback) =>
      original((time) => {
        const point = document.querySelector('.model-scene circle[r="7"]');
        const before = point?.getAttribute("cy");
        callback(time);
        if (point && point.isConnected && point.getAttribute("cy") !== before)
          (window as any).__sceneFrameCommits++;
      });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Игровая площадка", exact: true })
    .click();
  await page.getByLabel("Модель эксперимента").selectOption("circular");
  await page.getByRole("button", { name: "Запустить", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__sceneFrameCommits), {
      timeout: 2000,
    })
    .toBeGreaterThan(3);
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  const state = await page.locator(".model-scene").getAttribute("aria-label");
  await page.waitForTimeout(100);
  await expect(page.locator(".model-scene")).toHaveAttribute(
    "aria-label",
    state!,
  );
});
