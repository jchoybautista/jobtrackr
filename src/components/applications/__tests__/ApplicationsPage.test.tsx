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
  // "Rejected" matches both the outcome filter and the stage-named toggle
  // (DEFAULT_STAGES has a stage literally named "Rejected"); the outcome
  // button renders first in DOM order.
  await userEvent.click(screen.getAllByRole("button", { name: /rejected/i })[0]);
  expect(screen.queryByText("Stripe")).toBeNull();
  expect(screen.getByText("Grab")).toBeTruthy();
});

it("selects an app when a row is clicked", async () => {
  const selectApp = vi.fn();
  useApp.setState({ selectApp } as never);
  render(<ApplicationsPage />);
  await userEvent.click(screen.getByRole("button", { name: /open Stripe/i }));
  expect(selectApp).toHaveBeenCalledWith("1");
});
