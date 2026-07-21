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

beforeEach(async () => {
  await clearAll();
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
