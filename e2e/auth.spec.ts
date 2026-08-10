import { test, expect } from "@playwright/test";

test("signed-out visitors are sent to sign in, remembering where they were going", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("the demo link opens the app with seeded data and no account", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /explore the demo/i }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Board", exact: true })).toBeVisible();
  // The seeded dataset is there.
  await expect(page.getByText("Stripe").first()).toBeVisible();
  // And the banner offers the way out of demo mode. Not name-matched to a
  // single locator: the AccountMenu and the demo-mode banner both expose a
  // "Create an account" link on this page, so take the first.
  await expect(page.getByRole("link", { name: /create an account/i }).first()).toBeVisible();
});

test("the demo survives a reload", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /explore the demo/i }).click();
  await expect(page.getByRole("heading", { name: "Board", exact: true })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Board", exact: true })).toBeVisible();
});

test("sign-up validates before it ever calls the network", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("short7!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText(/valid email address/i)).toBeVisible();
  await expect(page).toHaveURL(/\/signup$/);
});

test("auth pages carry no app chrome", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("navigation", { name: "Main menu" })).toHaveCount(0);
});

test("leaving the demo returns to sign in and stays there", async ({ page }) => {
  // The spec asked for this and it was never written — which is exactly how
  // sign-out came to leave the demo cookie behind, silently dropping the next
  // visitor back into the sandbox instead of the sign-in page.
  await page.goto("/login");
  await page.getByRole("link", { name: /explore the demo/i }).click();
  await expect(page.getByRole("heading", { name: "Board", exact: true })).toBeVisible();

  await page.goto("/settings");
  await page.getByRole("link", { name: /create an account/i }).click();
  await expect(page).toHaveURL(/\/signup$/);

  // Back to the demo, then clear it: the cookie must go with the data.
  await page.goto("/");
  await page.getByRole("button", { name: /clear demo data/i }).click();
  await expect(page).toHaveURL(/\/login$/);

  // And the gate holds on a fresh navigation.
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
