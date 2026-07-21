import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";

// jsdom's Blob can't survive a real (fake-)IndexedDB round-trip (see
// src/lib/__tests__/cvthumb.test.ts: it comes back type-and-bytes-stripped),
// so this file substitutes the storage layer at the module boundary rather
// than faking the behavior under test. getCvThumb is the seam between
// CvThumb and Dexie — mocking exactly there still exercises CvThumb's own
// object-URL creation, revocation, and render-swap logic for real.
vi.mock("@/lib/repo", () => ({
  getCvThumb: vi.fn(async () => ({
    id: "has-thumb",
    blob: new Blob(["fake-bytes"], { type: "image/webp" }),
    updatedAt: "2026-07-20T00:00:00.000Z",
  })),
}));

import { CvThumb } from "@/components/cv/CvThumb";

describe("CvThumb — cached image path (mocked repo)", () => {
  let created = 0;

  beforeEach(() => {
    created = 0;
    // jsdom does not implement URL.createObjectURL/revokeObjectURL.
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => `blob:mock/${created++}`),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("shows the cached image (decorative alt) and revokes its object URL on unmount", async () => {
    const { container, unmount } = render(
      <CvThumb cvId="has-thumb" templateId="classic" accent="#000000" />
    );

    let img: HTMLImageElement | null = null;
    await waitFor(() => {
      img = container.querySelector("img");
      expect(img).not.toBeNull();
    });
    expect(img!.getAttribute("alt")).toBe("");
    expect(img!.src).toContain("blob:mock/");
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    const src = img!.src;
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(src);
  });

  it("never creates an object URL if unmounted before getCvThumb resolves", async () => {
    const repo = await import("@/lib/repo");
    let resolveThumb!: (row: { id: string; blob: Blob; updatedAt: string }) => void;
    // The mock in this file's factory returns a plain Promise; the real
    // getCvThumb's type (Dexie's PromiseExtended) doesn't structurally match,
    // hence the cast — the mock's runtime shape is what CvThumb consumes.
    vi.mocked(repo.getCvThumb).mockReturnValueOnce(
      new Promise((resolve) => { resolveThumb = resolve; }) as ReturnType<typeof repo.getCvThumb>
    );

    const { unmount } = render(
      <CvThumb cvId="slow" templateId="classic" accent="#000000" />
    );
    unmount();
    resolveThumb({ id: "slow", blob: new Blob(["x"], { type: "image/webp" }), updatedAt: "2026-07-20T00:00:00.000Z" });
    await Promise.resolve();
    await Promise.resolve();

    // Guarded by the `cancelled` flag: the resolved row is discarded before
    // URL.createObjectURL is ever called, so there is nothing left to leak.
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});
