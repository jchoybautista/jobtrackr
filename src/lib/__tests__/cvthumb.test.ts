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
    expect(row?.blob.type).toBe("image/webp");
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
