import { describe, it, expect } from "vitest";
import { PALETTE, PALETTE_KEYS, mixWithWhite, mixWithBlack, columnTints } from "@/lib/palette";

describe("palette", () => {
  it("has exactly 10 pastel colors", () => {
    expect(PALETTE_KEYS).toHaveLength(10);
    for (const key of PALETTE_KEYS) {
      expect(PALETTE[key].hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("mixWithWhite(hex, 1) returns the color, (hex, 0) returns white", () => {
    expect(mixWithWhite("#f4b8c1", 1)).toBe("#f4b8c1");
    expect(mixWithWhite("#f4b8c1", 0)).toBe("#ffffff");
  });

  it("mixWithWhite blends channels linearly toward white", () => {
    expect(mixWithWhite("#000000", 0.5)).toBe("#808080");
  });

  it("mixWithBlack blends channels linearly toward black", () => {
    expect(mixWithBlack("#ffffff", 0.5)).toBe("#808080");
  });

  it("mixWithBlack(hex, 1) returns the color", () => {
    expect(mixWithBlack("#a8d8e8", 1)).toBe("#a8d8e8");
  });

  it("columnTints derives dot, cardBg, cardBorder, headerTint from the pastel", () => {
    const t = columnTints("pink");
    expect(t.dot).toBe("#f4b8c1");
    expect(t.cardBg).toBe(mixWithWhite("#f4b8c1", 0.08));
    expect(t.cardBorder).toBe(mixWithWhite("#f4b8c1", 0.3));
    expect(t.headerTint).toBe(mixWithWhite("#f4b8c1", 0.15));
  });
});
