import { describe, it, expect } from "vitest";
import { registerCvFonts } from "@/cv/fonts";

describe("cv fonts", () => {
  it("registers idempotently without throwing", () => {
    expect(() => {
      registerCvFonts("/fonts");
      registerCvFonts("/fonts");
    }).not.toThrow();
  });
});
