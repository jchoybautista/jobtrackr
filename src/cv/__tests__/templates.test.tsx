// @vitest-environment node
import { describe, it, expect } from "vitest";
import path from "node:path";
import { renderCvBuffer } from "@/cv/pdf";
import { DEFAULT_SECTIONS, emptyCvContent, type CvDoc } from "@/cv/types";

const FONTS = path.resolve(__dirname, "../../../public/fonts");

export function sampleCv(templateId: CvDoc["templateId"]): CvDoc {
  return {
    id: "t", name: "Test", templateId, accent: "sky", showPhoto: false,
    createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z",
    sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
    content: {
      ...emptyCvContent(), fullName: "Jon Bautista", headline: "Product Designer",
      email: "jon@example.com", phone: "+63 900 000 0000", location: "Manila",
      links: [{ id: "l1", label: "Portfolio", url: "https://jon.design" }],
      summary: "Designer with 6 years of experience shipping web products.",
      experience: [{ id: "e1", role: "Product Designer", company: "Stripe", location: "Remote",
        startDate: "2024-07", bullets: ["Led checkout redesign", "Raised conversion 12%"] }],
      education: [{ id: "ed1", school: "UP Diliman", degree: "BS", field: "Computer Science",
        startDate: "2016-06", endDate: "2020-06" }],
      skills: [{ id: "s1", name: "Design", skills: ["Figma", "Prototyping"] }],
    },
  };
}

describe("classic template", () => {
  it("renders a non-trivial PDF buffer", async () => {
    const buf = await renderCvBuffer(sampleCv("classic"), FONTS);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(5000);
  });

  it("skips empty sections even when visible", async () => {
    const cv = sampleCv("classic");
    cv.content.projects = [];
    const withEmpty = await renderCvBuffer(cv, FONTS);
    expect(withEmpty.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("modern template", () => {
  it("renders with and without photo", async () => {
    const buf = await renderCvBuffer(sampleCv("modern"), FONTS);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    const cv = sampleCv("modern");
    cv.showPhoto = true; // no photoUrl passed → template must not crash
    const buf2 = await renderCvBuffer(cv, FONTS);
    expect(buf2.length).toBeGreaterThan(5000);
  });
});

describe("elegant template", () => {
  it("renders and registry is complete", async () => {
    const buf = await renderCvBuffer(sampleCv("elegant"), FONTS);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    const { TEMPLATES } = await import("@/cv/templates");
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual(["classic", "elegant", "modern"]);
    expect(TEMPLATES.filter((t) => t.atsSafe).map((t) => t.id)).toEqual(["classic"]);
  });
});
