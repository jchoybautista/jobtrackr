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
    expect(t.cardBg).toBe(mixWithWhite("#f4b8c1", 0.3));
    expect(t.cardBorder).toBe(mixWithWhite("#f4b8c1", 0.55));
    expect(t.headerTint).toBe(mixWithWhite("#f4b8c1", 0.22));
  });

  it("columnTints derives textStrong and textMuted as dark shades of the pastel", () => {
    const t = columnTints("pink");
    expect(t.textStrong).toBe(mixWithBlack("#f4b8c1", 0.4));
    expect(t.textMuted).toBe(mixWithBlack("#f4b8c1", 0.48));
  });

  it("textStrong and textMuted hold WCAG AA contrast (4.5:1) against cardBg for every palette color", () => {
    function luminance(hex: string) {
      const n = parseInt(hex.slice(1), 16);
      const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    function contrast(a: string, b: string) {
      const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (l1 + 0.05) / (l2 + 0.05);
    }
    for (const key of PALETTE_KEYS) {
      const t = columnTints(key);
      expect(contrast(t.textStrong, t.cardBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.textMuted, t.cardBg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
