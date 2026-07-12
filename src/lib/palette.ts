import type { PaletteKey } from "./types";

export const PALETTE: Record<PaletteKey, { name: string; hex: string }> = {
  pink: { name: "Pink", hex: "#f4b8c1" },
  peach: { name: "Peach", hex: "#f5c9a8" },
  yellow: { name: "Yellow", hex: "#f0d97a" },
  mint: { name: "Mint", hex: "#b5dfc0" },
  sky: { name: "Sky", hex: "#a8d8e8" },
  lavender: { name: "Lavender", hex: "#c9bcf2" },
  orchid: { name: "Orchid", hex: "#e8bce0" },
  gray: { name: "Gray", hex: "#d8d8d8" },
  sage: { name: "Sage", hex: "#dce3b8" },
  blush: { name: "Blush", hex: "#f2c4c4" },
};

export const PALETTE_KEYS = Object.keys(PALETTE) as PaletteKey[];

/** weight: fraction of the color kept; 0 = white, 1 = the color itself */
export function mixWithWhite(hex: string, weight: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(255 + (c - 255) * weight);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** weight: fraction of the color kept; 0 = black, 1 = the color itself */
export function mixWithBlack(hex: string, weight: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c * weight);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function columnTints(key: PaletteKey) {
  const hex = PALETTE[key].hex;
  return {
    dot: hex,
    cardBg: mixWithWhite(hex, 0.08),
    cardBorder: mixWithWhite(hex, 0.3),
    headerTint: mixWithWhite(hex, 0.15),
  };
}
