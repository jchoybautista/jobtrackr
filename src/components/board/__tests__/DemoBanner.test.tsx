import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BoardPage } from "@/components/board/BoardPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/store", () => ({
  useApp: Object.assign(
    () => ({
      stages: [], applications: [], tags: [], reminders: [], interviews: [], notes: [], cvdocs: [],
      filters: { search: "", tagIds: [], sources: [], hasSalary: null },
      settings: { demo: true, nudgeDays: 7, ghostDays: 14, currency: "USD" },
      clearDemo: vi.fn(), moveApplication: vi.fn(), selectApp: vi.fn(), setFilters: vi.fn(),
    }),
    { getState: () => ({}) },
  ),
}));

describe("demo banner", () => {
  it("mentions creating an account without duplicating the sidebar's link", () => {
    // The sidebar's AccountMenu already carries a "Create an account" link
    // beside "Exit demo" — this banner repeated it right next to the same
    // control, so the banner keeps only the copy, not a second CTA.
    render(<BoardPage />);
    expect(screen.getByText(/create an account to start tracking/i)).toBeDefined();
    expect(screen.queryByRole("link", { name: /create an account/i })).toBeNull();
  });

  it("still offers to clear the demo data", () => {
    render(<BoardPage />);
    expect(screen.getByRole("button", { name: /clear demo data/i })).toBeDefined();
  });
});
