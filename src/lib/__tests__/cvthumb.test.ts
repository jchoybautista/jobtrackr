// @vitest-environment node
//
// Runs in the node environment, not the project-default jsdom. jsdom's Blob is
// a distinct class that Node's structuredClone cannot clone, so a Blob written
// to (fake-)IndexedDB under jsdom comes back as `{}` — bytes and type gone. That
// is a jsdom artifact, not real browser behavior: browsers structured-clone
// Blobs into IndexedDB losslessly. This module is DOM-free data code, so running
// its test under node lets it assert what actually ships.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll, putCvThumb, getCvThumb, deleteCvThumb } from "@/lib/repo";
import { useApp } from "@/lib/store";

beforeEach(async () => {
  await clearAll();
  useApp.setState({ ready: false, profile: null, cvdocs: [] });
  await useApp.getState().hydrate();
});

describe("cvthumbs repo", () => {
  it("put then get round-trips the blob", async () => {
    const blob = new Blob(["fake-image-bytes"], { type: "image/webp" });
    await putCvThumb({ id: "cv1", blob, updatedAt: "2026-07-20T00:00:00.000Z" });
    const row = await getCvThumb("cv1");
    expect(row?.id).toBe("cv1");
    expect(row?.updatedAt).toBe("2026-07-20T00:00:00.000Z");
    // Assert the bytes survive, not just the MIME type: a thumbnail that comes
    // back type-correct but empty is the exact failure this table exists to avoid.
    expect(row?.blob).toBeInstanceOf(Blob);
    expect(row?.blob.type).toBe("image/webp");
    expect(await row!.blob.text()).toBe("fake-image-bytes");
  });

  it("delete removes the row", async () => {
    const blob = new Blob(["x"], { type: "image/webp" });
    await putCvThumb({ id: "cv2", blob, updatedAt: "2026-07-20T00:00:00.000Z" });
    await deleteCvThumb("cv2");
    expect(await getCvThumb("cv2")).toBeUndefined();
  });

  it("getCvThumb returns undefined for a missing id", async () => {
    expect(await getCvThumb("nope")).toBeUndefined();
  });
});

describe("cvthumbs store lifecycle", () => {
  it("duplicateCv copies the source thumbnail to the new id", async () => {
    const cv = await useApp.getState().createCv("Src", "classic");
    await putCvThumb({ id: cv.id, blob: new Blob(["img"], { type: "image/webp" }), updatedAt: "2026-07-20T00:00:00.000Z" });
    const copy = await useApp.getState().duplicateCv(cv.id);
    expect(copy).toBeTruthy();
    const copiedThumb = await getCvThumb(copy!.id);
    expect(copiedThumb?.blob.type).toBe("image/webp");
  });

  it("duplicateCv with no source thumbnail leaves the copy without one", async () => {
    const cv = await useApp.getState().createCv("Src2", "classic");
    const copy = await useApp.getState().duplicateCv(cv.id);
    expect(await getCvThumb(copy!.id)).toBeUndefined();
  });

  it("removeCv deletes the thumbnail", async () => {
    const cv = await useApp.getState().createCv("Doomed", "classic");
    await putCvThumb({ id: cv.id, blob: new Blob(["img"], { type: "image/webp" }), updatedAt: "2026-07-20T00:00:00.000Z" });
    await useApp.getState().removeCv(cv.id);
    expect(await getCvThumb(cv.id)).toBeUndefined();
  });
});
