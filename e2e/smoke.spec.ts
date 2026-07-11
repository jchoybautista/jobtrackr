import { test, expect } from "@playwright/test";

test("core flow: add job, see it on board and dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Board", exact: true })).toBeVisible();

  // demo data seeded
  await expect(page.getByText("Stripe", { exact: false }).first()).toBeVisible();

  // add a job
  await page.getByRole("button", { name: "Add job" }).click();
  await page.getByLabel("Company *").fill("Acme Corp");
  await page.getByLabel("Role *").fill("QA Engineer");
  // topbar + dialog submit share the name "Add job"; the dialog submit is last in the DOM
  await page.getByRole("button", { name: "Add job" }).last().click();
  // the card is wrapped in a dnd-kit sortable (div role="button"); target the inner
  // button precisely via its aria-label so the two don't collide in strict mode
  const card = page.getByLabel("QA Engineer at Acme Corp — open details");
  await expect(card).toBeVisible();

  // open detail panel
  await card.click();
  await expect(page.getByRole("dialog", { name: /QA Engineer at Acme Corp/ })).toBeVisible();
  await page.keyboard.press("Escape");

  // dashboard reflects data
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Active applications")).toBeVisible();

  // reminders page renders
  await page.getByRole("link", { name: "Reminders" }).click();
  await expect(page.getByRole("heading", { name: "Reminders" })).toBeVisible();
});
