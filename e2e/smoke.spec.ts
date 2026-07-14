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

test("cv builder: profile → new cv → pdf download", async ({ page }) => {
  // Seed the master profile — a non-empty full name is what unlocks "New CV".
  await page.goto("/cv/profile");
  const fullName = page.getByLabel("Full name");
  await fullName.fill("E2E Tester");
  await fullName.blur();

  // Library: header + empty-state both expose "New CV"; take the first.
  await page.goto("/cv");
  await page.getByRole("button", { name: "New CV" }).first().click();

  // New-CV dialog: name it, pick Classic (button's accessible name starts with
  // the template name), create.
  await page.getByLabel("CV name").fill("Smoke CV");
  await page.getByRole("button", { name: /^Classic/ }).click();
  await page.getByRole("button", { name: "Create CV" }).click();

  // Lands on the per-CV editor with a live react-pdf preview iframe.
  await expect(page).toHaveURL(/\/cv\/[^/]+$/);
  await expect(page.getByTitle("CV preview (PDF)")).toBeVisible({ timeout: 15000 });

  // Client-side PDF export names the file after the CV.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Smoke CV.pdf");
});
