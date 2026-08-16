import { expect, test } from "@playwright/test";

async function layout(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const main = document.querySelector("main")!.getBoundingClientRect();
    const chart = document.querySelector("main .recharts-wrapper")?.getBoundingClientRect();
    return {
      mainWidth: Math.round(main.width),
      mainLeft: Math.round(main.left),
      chartWidth: chart ? Math.round(chart.width) : null,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".recharts-wrapper");
});

test("the content keeps its width and position when comparison is turned on", async ({
  page,
}) => {
  // Regression guard. `main` is a flex item of a column-flex body, where
  // `mx-auto` cancels stretch and lets the box shrink to its content — so the
  // longer compare-mode legend silently widened the whole page.
  const before = await layout(page);

  await page.getByRole("button", { name: /compare to previous/i }).click();
  await expect(
    page.getByRole("heading", { name: /vs Previous Period/ }),
  ).toBeVisible();
  await page.waitForTimeout(500);

  expect(await layout(page)).toEqual(before);
});

test("comparison draws the previous period with symmetrical labels", async ({ page }) => {
  // Scoped to the legend: the header checkboxes carry the same three names, and
  // an unscoped match would find those instead.
  const legend = page.locator("figcaption");

  await expect(legend.getByText("POS Revenue", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /compare to previous/i }).click();

  await expect(legend.getByText("POS Revenue (Previous)")).toBeVisible();
  await expect(legend.getByText("Eatclub Revenue (Previous)")).toBeVisible();
  // The prototype's labels; deliberately not used — see docs/adr/0006.
  await expect(legend.getByText(/Total Revenue/)).toHaveCount(0);
  await expect(legend.getByText(/Direct Revenue/)).toHaveCount(0);
});

test("hiding a series removes its bars and its legend entry", async ({ page }) => {
  const legend = page.locator("figcaption");
  const drawnBefore = await page.locator(".recharts-rectangle").count();
  const seriesBefore = await page.locator(".recharts-bar").count();

  await page.getByRole("checkbox", { name: "Labour Costs" }).uncheck();

  // The checkbox keeps its label; it is the legend entry that goes.
  await expect(legend.getByText(/Labour Costs/)).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Labour Costs" })).toBeVisible();

  // Seven fewer rectangles are drawn, but the series itself stays mounted so
  // the remaining bars keep their slots. Both halves matter: if the series
  // unmounted, Recharts would re-centre the group and every bar would move.
  expect(await page.locator(".recharts-rectangle").count()).toBe(drawnBefore - 7);
  expect(await page.locator(".recharts-bar").count()).toBe(seriesBefore);
});
