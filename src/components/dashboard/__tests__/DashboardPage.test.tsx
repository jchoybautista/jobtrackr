import { render, screen } from "@testing-library/react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { useApp } from "@/lib/store";
import { DEFAULT_STAGES } from "@/lib/seed";
import { DEFAULT_SETTINGS } from "@/lib/repo";
import type { Application } from "@/lib/types";
import { beforeEach, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const app = (id: string, stageId: string, furthestStageId?: string): Application => ({
  id, company: id, role: "r", tagIds: [], stageId, order: 0,
  createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
  furthestStageId: furthestStageId ?? stageId,
});

beforeEach(() => {
  useApp.setState({
    stages: DEFAULT_STAGES, settings: { ...DEFAULT_SETTINGS, ghostDays: 14 },
    applications: [app("i", "stage-interview"), app("o", "stage-offer", "stage-final")],
    tags: [], interviews: [], contacts: [], events: [], notes: [], reminders: [],
    profile: null, cvdocs: [], ready: true,
  });
});

it("shows pass-rate cards and the outcomes strip", () => {
  render(<DashboardPage />);
  expect(screen.getByText("Interview pass rate")).toBeTruthy();
  expect(screen.getByText("Technical pass rate")).toBeTruthy();
  expect(screen.getByText("Ghosted")).toBeTruthy();
  expect(screen.getByText("Rejected")).toBeTruthy();
});

it("gives every card an empty state when there is no data", () => {
  useApp.setState({ applications: [], interviews: [], reminders: [] });
  render(<DashboardPage />);
  expect(screen.getByText("Nothing in the pipeline")).toBeTruthy();
  expect(screen.getByText("No applications logged yet")).toBeTruthy();
  expect(screen.getByText("No salary figures yet")).toBeTruthy();
  expect(screen.getByText("Nothing scheduled")).toBeTruthy();
  expect(screen.getByText("Nothing to chase yet")).toBeTruthy();
});

it("words the attention card differently once applications exist", () => {
  // These demo apps are past the nudge window, so the card has rows rather than
  // an empty state — the first-run copy must not be what a stocked board shows.
  render(<DashboardPage />);
  expect(screen.queryByText("Nothing to chase yet")).toBeNull();
});
