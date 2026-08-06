import { describe, it, expect } from "vitest";
import { DEFAULT_STAGES } from "@/lib/seed";
import { DEFAULT_SETTINGS } from "@/lib/repo";

describe("DEFAULT_STAGES", () => {
  it("has the 7 role-anchored stages in order, Saved pinned first, Offer pinned last", () => {
    expect(DEFAULT_STAGES.map((s) => s.role)).toEqual([
      "saved", "screening", "interview", "technical", "final", "rejected", "offer",
    ]);
    expect(DEFAULT_STAGES.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const saved = DEFAULT_STAGES[0];
    const offer = DEFAULT_STAGES[DEFAULT_STAGES.length - 1];
    expect(saved).toMatchObject({ id: "stage-saved", pinned: true, kind: "pipeline" });
    expect(offer).toMatchObject({ id: "stage-offer", pinned: true, kind: "won" });
    expect(DEFAULT_STAGES.find((s) => s.role === "rejected")).toMatchObject({ kind: "lost" });
  });

  it("regression: demo seed does not use orphaned stage-applied", () => {
    // Verify the new stage-screening exists in defaults
    expect(DEFAULT_STAGES.some((s) => s.id === "stage-screening")).toBe(true);
    // Ensure old stage-applied is not in defaults (would cause demo apps to vanish)
    expect(DEFAULT_STAGES.some((s) => s.id === "stage-applied")).toBe(false);
  });
});

describe("DEFAULT_SETTINGS", () => {
  it("defaults ghostDays to 14 and nudgeDays to 7", () => {
    expect(DEFAULT_SETTINGS.ghostDays).toBe(14);
    expect(DEFAULT_SETTINGS.nudgeDays).toBe(7);
  });
});
