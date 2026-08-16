import { expect, test } from "@playwright/test";

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "password123";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test("the dashboard offers a way into the admin area", async ({ page }) => {
  // Discoverability: without this link the only way in is knowing the URL.
  await page.goto("/");
  await page.waitForSelector(".recharts-wrapper");

  await page.getByRole("link", { name: /edit figures/i }).click();

  // Not signed in, so the guard steps in and remembers the destination.
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Ftrading-days/);

  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // ... and the journey finishes where it started out for.
  await expect(page).toHaveURL(/\/admin\/trading-days/);
  await expect(page.getByRole("heading", { name: "Trading figures" })).toBeVisible();
});

test("admin pages are distinguishable from the public one by title alone", async ({
  page,
}) => {
  // A manager with several tabs open should be able to tell them apart from
  // the tab strip, without clicking through to look.
  await page.goto("/");
  await expect(page).toHaveTitle("Revenue Trend Dashboard");

  await page.goto("/admin/login");
  await expect(page).toHaveTitle("Admin · Sign in · Revenue Trend Dashboard");

  await page.goto("/admin/trading-days");
  await expect(page).toHaveTitle("Admin · Trading figures · Revenue Trend Dashboard");
});

test("an admin page cannot be reached without signing in", async ({ page }) => {
  await page.goto("/admin/trading-days");

  await expect(page).toHaveURL(/\/admin\/login\?next=/);
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
});

test("the wrong password keeps the manager on the page", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Invalid email or password",
  );
  await expect(page).toHaveURL(/\/admin\/login/);
  // The email survives so only the password has to be retyped.
  await expect(page.getByLabel("Email")).toHaveValue(EMAIL);
});

test("AS-021: what the admin saves is what the dashboard shows", async ({ page }) => {
  // The brief's pass/fail condition, driven through the real browser against
  // the real API and database. Nothing here is stubbed.
  await page.goto("/");
  await page.waitForSelector(".recharts-wrapper");
  const totalBefore = await page
    .locator("article", { hasText: "Total Revenue" })
    .locator("span")
    .first()
    .innerText();

  await signIn(page);
  await expect(page).toHaveURL(/\/admin\/trading-days/);

  const wednesday = page.getByLabel(/^POS Revenue \d{4}-\d{2}-\d{2}$/).nth(2);
  const original = Number(await wednesday.inputValue());
  const updated = original + 500;

  await wednesday.fill(String(updated));
  await page.getByRole("button", { name: /save week/i }).click();
  await expect(page.locator("form").getByRole("status")).toContainText(/week saved/i);

  await page.goto("/");
  await page.waitForSelector(".recharts-wrapper");

  const totalAfter = await page
    .locator("article", { hasText: "Total Revenue" })
    .locator("span")
    .first()
    .innerText();

  const money = (text: string) => Number(text.replace(/[^0-9]/g, ""));
  expect(money(totalAfter)).toBe(money(totalBefore) + 500);

  // Put it back so the test can be run again.
  await signIn(page);
  await page.getByLabel(/^POS Revenue \d{4}-\d{2}-\d{2}$/).nth(2).fill(String(original));
  await page.getByRole("button", { name: /save week/i }).click();
  await expect(page.locator("form").getByRole("status")).toContainText(/week saved/i);
});

test("AS-022: one bad figure is refused and nothing is saved", async ({ page }) => {
  await signIn(page);

  const friday = page.getByLabel(/^Labour Costs \d{4}-\d{2}-\d{2}$/).nth(4);
  const wednesday = page.getByLabel(/^POS Revenue \d{4}-\d{2}-\d{2}$/).nth(2);
  const wednesdayBefore = await wednesday.inputValue();

  await wednesday.fill(String(Number(wednesdayBefore) + 100));
  await friday.fill("-1");
  await page.getByRole("button", { name: /save week/i }).click();

  // The browser refuses the negative figure before anything is sent, so the
  // manager is stopped at the offending field rather than after a round trip.
  // The server enforces the same rule for anything that bypasses the form —
  // see api/spec/.../trading_days_spec.rb AS-017 / C-005.
  await expect(friday).toHaveJSProperty("validity.valid", false);
  await expect(page.locator("form").getByRole("status")).toHaveCount(0);

  // The valid edit in the same attempt must not have landed on its own.
  await page.reload();
  await expect(wednesday).toHaveValue(wednesdayBefore);
});
