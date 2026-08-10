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
  it("offers a route to a real account", () => {
    render(<BoardPage />);
    const cta = screen.getByRole("link", { name: /create an account/i });
    expect(cta.getAttribute("href")).toBe("/signup");
  });

  it("still offers to clear the demo data", () => {
    render(<BoardPage />);
    expect(screen.getByRole("button", { name: /clear demo data/i })).toBeDefined();
  });
});
