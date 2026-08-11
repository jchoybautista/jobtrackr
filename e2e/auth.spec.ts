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
  // The sidebar offers a way out of demo mode, not a pitch to sign up —
  // the demo already stands in for an account.
  await expect(page.getByRole("button", { name: /exit demo/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /create an account/i })).toHaveCount(0);
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
  //
  // Narrow viewport deliberately: it hides the sidebar, so the account surface
  // under test can only be the one on Settings — the mobile path, which had no
  // sign-out at all until the final review. At desktop width the sidebar's own
  // button resolves first and this would silently exercise the wrong element.
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/login");
  await page.getByRole("link", { name: /explore the demo/i }).click();
  await expect(page.getByRole("heading", { name: "Board", exact: true })).toBeVisible();

  await page.goto("/settings");
  const account = page.getByRole("region", { name: "Account" });
  await expect(account).toBeVisible();
  // Non-destructive exit: leaves the demo board intact, unlike Clear demo
  // data below. Scoped to the section so this cannot silently resolve to
  // the sidebar's own button the way an unscoped locator did.
  await account.getByRole("button", { name: /exit demo/i }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Back into the demo, then clear it: the cookie must go with the data.
  await page.getByRole("link", { name: /explore the demo/i }).click();
  await page.getByRole("button", { name: /clear demo data/i }).click();
  await expect(page).toHaveURL(/\/login$/);

  // And the gate holds on a fresh navigation.
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
