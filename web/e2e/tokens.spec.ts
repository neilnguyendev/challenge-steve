import { expect, test } from "@playwright/test";

/**
 * Tailwind 4 dropped the `rounded-[--var]` shorthand that Tailwind 3 accepted.
 * It does not error — it emits nothing — so a whole set of radii and the
 * checkbox colour went missing while every unit test stayed green. This guards
 * the class of failure, not just the instances that were found.
 */
test("utilities built from design tokens actually reach the page", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".recharts-wrapper");

  const applied = await page.evaluate(() => {
    const checkbox = document.querySelector('input[type="checkbox"]')!;
    const card = document.querySelector("article")!;
    return {
      accent: getComputedStyle(checkbox).accentColor,
      cardRadius: getComputedStyle(card).borderRadius,
    };
  });

  // "auto" means the accent utility produced nothing and the browser default
  // is showing through; 0px means the radius utility did the same.
  expect(applied.accent).not.toBe("auto");
  expect(applied.cardRadius).not.toBe("0px");
});

test("every clickable thing says so under the cursor", async ({ page }) => {
  // Labels bound to an input focus it on click, so they are clickable too —
  // and they are the ones that quietly keep the default arrow.
  for (const path of ["/", "/admin/login"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const wrong = await page.evaluate(() =>
      [...document.querySelectorAll("button, a, label, input[type=checkbox]")]
        .filter((el) => !(el as HTMLButtonElement).disabled)
        .filter((el) => getComputedStyle(el).cursor !== "pointer")
        .map((el) => `${el.tagName}: ${(el.textContent || "").trim().slice(0, 20)}`),
    );

    expect(wrong, `on ${path}`).toEqual([]);
  }
});
