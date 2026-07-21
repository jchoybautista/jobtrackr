// @vitest-environment node
//
// Covers only `generateCvThumb`'s cache guard — the decision to skip work when
// the stored thumbnail already covers the current revision. Rasterization itself
// needs a real canvas and worker and is verified live in Chrome, not here.
//
// `pdfjs-dist` is mocked purely as the observable boundary: the whole point of
// the guard is to return BEFORE that ~1.4 MB import, so "was pdfjs reached?" is
// exactly the behaviour under test, not a stand-in for it.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";

const getDocument = vi.fn(() => ({ promise: Promise.reject(new Error("not a real pdf")) }));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: (...args: unknown[]) => getDocument(...(args as [])),
}));

const { clearAll, getCvThumb, putCvThumb } = await import("@/lib/repo");
const { generateCvThumb } = await import("@/cv/thumbnail");

const blob = () => new Blob(["pretend-pdf"], { type: "application/pdf" });

beforeEach(async () => {
  await clearAll();
  getDocument.mockClear();
});

describe("generateCvThumb cache guard", () => {
  it("skips before importing pdfjs when the cached stamp covers the revision", async () => {
    await putCvThumb({
      id: "cv1",
      blob: new Blob(["cached"], { type: "image/webp" }),
      updatedAt: "2026-07-22T10:00:00.000Z",
    });

    await generateCvThumb("cv1", blob(), "2026-07-22T10:00:00.000Z");

    expect(getDocument).not.toHaveBeenCalled();
    // the cached row must survive untouched
    const row = await getCvThumb("cv1");
    expect(await row!.blob.text()).toBe("cached");
    expect(row!.updatedAt).toBe("2026-07-22T10:00:00.000Z");
  });

  it("skips when the cached stamp is newer than the revision", async () => {
    await putCvThumb({
      id: "cv1",
      blob: new Blob(["cached"], { type: "image/webp" }),
      updatedAt: "2026-07-22T12:00:00.000Z",
    });

    await generateCvThumb("cv1", blob(), "2026-07-22T10:00:00.000Z");

    expect(getDocument).not.toHaveBeenCalled();
  });

  it("proceeds when the cached stamp is older than the revision", async () => {
    await putCvThumb({
      id: "cv1",
      blob: new Blob(["stale"], { type: "image/webp" }),
      updatedAt: "2026-07-22T09:00:00.000Z",
    });

    await generateCvThumb("cv1", blob(), "2026-07-22T10:00:00.000Z");

    expect(getDocument).toHaveBeenCalledTimes(1);
  });

  it("proceeds when no thumbnail is cached at all", async () => {
    await generateCvThumb("cv-never-seen", blob(), "2026-07-22T10:00:00.000Z");

    expect(getDocument).toHaveBeenCalledTimes(1);
  });

  it("still never throws when generation fails downstream", async () => {
    // getDocument rejects — the guard let it through, and the swallow must hold.
    await expect(
      generateCvThumb("cv1", blob(), "2026-07-22T10:00:00.000Z"),
    ).resolves.toBeUndefined();
  });
});
