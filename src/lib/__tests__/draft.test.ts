import { describe, it, expect } from "vitest";
import { isDirty, changedFields } from "@/lib/draft";

describe("isDirty", () => {
  it("is false when draft matches source", () => {
    expect(isDirty({ role: "Engineer", salaryMin: 100 }, { role: "Engineer", salaryMin: 100 })).toBe(false);
  });

  it("is true when a field differs", () => {
    expect(isDirty({ role: "Engineer" }, { role: "Designer" })).toBe(true);
  });

  it("treats empty string, null and undefined as the same absent value", () => {
    expect(isDirty({ location: "" }, { location: undefined })).toBe(false);
    expect(isDirty({ location: "" }, { location: null })).toBe(false);
  });

  it("compares arrays as sets, ignoring order", () => {
    expect(isDirty({ tagIds: ["a", "b"] }, { tagIds: ["b", "a"] })).toBe(false);
    expect(isDirty({ tagIds: ["a"] }, { tagIds: ["a", "b"] })).toBe(true);
  });
});

describe("changedFields", () => {
  it("returns only the fields that changed", () => {
    const patch = changedFields(
      { role: "Engineer", company: "Linear" },
      { role: "Designer", company: "Linear" },
    );
    expect(patch).toEqual({ role: "Engineer" });
  });

  it("normalizes a cleared field to undefined", () => {
    const patch = changedFields({ location: "" }, { location: "Remote" });
    expect(patch).toEqual({ location: undefined });
    expect("location" in patch).toBe(true);
  });

  it("returns an empty object when nothing changed", () => {
    expect(changedFields({ role: "Engineer" }, { role: "Engineer" })).toEqual({});
  });
});
