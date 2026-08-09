import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationsPage } from "@/components/applications/ApplicationsPage";
import { useApp } from "@/lib/store";
import { DEFAULT_STAGES } from "@/lib/seed";
import { DEFAULT_SETTINGS } from "@/lib/repo";
import type { Application } from "@/lib/types";
import { beforeEach, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const app = (id: string, company: string, stageId: string): Application => ({
  id, company, role: "Engineer", tagIds: [], stageId, order: 0,
  createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z", furthestStageId: stageId,
});

beforeEach(() => {
  useApp.setState({
    stages: DEFAULT_STAGES, settings: DEFAULT_SETTINGS,
    applications: [app("1", "Stripe", "stage-interview"), app("2", "Grab", "stage-rejected")],
    tags: [], interviews: [], contacts: [], events: [], notes: [], reminders: [],
    filters: { search: "", tagIds: [], sources: [], hasSalary: null },
    profile: null, cvdocs: [], selectedAppId: null, ready: true,
  });
});

it("lists applications and filters by outcome", async () => {
  render(<ApplicationsPage />);
  expect(screen.getByText("Stripe")).toBeTruthy();
  expect(screen.getByText("Grab")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Outcome: All" }));
  await userEvent.click(screen.getByRole("checkbox", { name: "Rejected" }));
  expect(screen.queryByText("Stripe")).toBeNull();
  expect(screen.getByText("Grab")).toBeTruthy();
});

it("keeps several outcomes selected at once", async () => {
  render(<ApplicationsPage />);
  await userEvent.click(screen.getByRole("button", { name: "Outcome: All" }));
  await userEvent.click(screen.getByRole("checkbox", { name: "Rejected" }));
  await userEvent.click(screen.getByRole("checkbox", { name: "Active" }));
  expect((screen.getByRole("checkbox", { name: "Rejected" }) as HTMLInputElement).checked).toBe(true);
  expect((screen.getByRole("checkbox", { name: "Active" }) as HTMLInputElement).checked).toBe(true);
  expect(screen.getByRole("button", { name: /Outcome: Active \+1/ })).toBeTruthy();
  expect(screen.getByText("Stripe")).toBeTruthy();
  expect(screen.getByText("Grab")).toBeTruthy();
});

it("offers a way out when filters match nothing", async () => {
  useApp.setState({ applications: [app("1", "Stripe", "stage-interview")] });
  render(<ApplicationsPage />);
  await userEvent.click(screen.getByRole("button", { name: "Outcome: All" }));
  await userEvent.click(screen.getByRole("checkbox", { name: "Offer" }));
  await userEvent.keyboard("{Escape}");
  expect(screen.getByText("No applications match these filters")).toBeTruthy();
  const escapes = screen.getAllByRole("button", { name: /clear filters/i });
  await userEvent.click(escapes[escapes.length - 1]);
  expect(screen.getByText("Stripe")).toBeTruthy();
});

it("shows a first-run empty state with no applications", () => {
  useApp.setState({ applications: [] });
  render(<ApplicationsPage />);
  expect(screen.getByText("No applications yet")).toBeTruthy();
  expect(screen.getByRole("button", { name: /add job/i })).toBeTruthy();
});

it("marks the sorted column for assistive tech", async () => {
  render(<ApplicationsPage />);
  const company = screen.getByRole("columnheader", { name: /company/i });
  expect(company.getAttribute("aria-sort")).toBe("none");
  await userEvent.click(screen.getByRole("button", { name: "Sort by Company" }));
  expect(screen.getByRole("columnheader", { name: /company/i }).getAttribute("aria-sort"))
    .toBe("ascending");
  await userEvent.click(screen.getByRole("button", { name: /Sort by Company, currently ascending/ }));
  expect(screen.getByRole("columnheader", { name: /company/i }).getAttribute("aria-sort"))
    .toBe("descending");
});

it("selects an app when a row is clicked", async () => {
  const selectApp = vi.fn();
  useApp.setState({ selectApp } as never);
  render(<ApplicationsPage />);
  await userEvent.click(screen.getByRole("button", { name: /open Stripe/i }));
  expect(selectApp).toHaveBeenCalledWith("1");
});
