import { describe, it, expect } from "vitest";
import { formatMonthYear, formatRange } from "@/cv/dates";

describe("cv dates", () => {
  it("formats YYYY-MM and full ISO to Mon YYYY", () => {
    expect(formatMonthYear("2026-07")).toBe("Jul 2026");
    expect(formatMonthYear("2024-01-15")).toBe("Jan 2024");
    expect(formatMonthYear(undefined)).toBe("");
    expect(formatMonthYear("")).toBe("");
  });

  it("formats ranges with Present fallback", () => {
    expect(formatRange("2024-07", "2026-01")).toBe("Jul 2024 – Jan 2026");
    expect(formatRange("2024-07", undefined)).toBe("Jul 2024 – Present");
    expect(formatRange(undefined, "2026-01")).toBe("Jan 2026");
    expect(formatRange(undefined, undefined)).toBe("");
  });
});
