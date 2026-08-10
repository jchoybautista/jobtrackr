// @vitest-environment node
//
// Runs in the node environment, not the project-default jsdom. jsdom's Blob is
// a distinct class that Node's structuredClone cannot clone, so a Blob written
// to (fake-)IndexedDB under jsdom comes back as `{}` — bytes and type gone. That
// is a jsdom artifact, not real browser behavior: browsers structured-clone
// Blobs into IndexedDB losslessly. This module is DOM-free data code, so running
// its test under node lets it assert what actually ships.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { clearAll, putCvThumb, getCvThumb, deleteCvThumb } from "@/lib/repo";
import * as repo from "@/lib/repo";
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

  it("duplicateCv restamps the copied thumbnail to the copy's own revision", async () => {
    // The copy's content is a clone, so the source image is already correct for
    // it. Carrying the source's older stamp would read as stale against the
    // copy's fresh `updatedAt` and force a pointless re-render on first open.
    const cv = await useApp.getState().createCv("Src3", "classic");
    await putCvThumb({
      id: cv.id,
      blob: new Blob(["img"], { type: "image/webp" }),
      updatedAt: "2020-01-01T00:00:00.000Z", // deliberately ancient
    });
    const copy = await useApp.getState().duplicateCv(cv.id);
    const copiedThumb = await getCvThumb(copy!.id);
    expect(copiedThumb!.updatedAt).toBe(copy!.updatedAt);
    expect(copiedThumb!.updatedAt >= copy!.updatedAt).toBe(true);
  });

  it("duplicateCv writes the copied thumbnail before the new doc is published to store state (regression)", async () => {
    // Guards the ordering in `duplicateCv`: the thumb copy must happen BEFORE
    // `set(...)` publishes the new doc, because the new card reads its
    // thumbnail once on mount. If the two statements were swapped, the doc
    // would appear in `cvdocs` state before its thumbnail row exists, and a
    // mounted card would read a miss and sit on the wireframe fallback.
    //
    // Verified this test actually catches that regression by temporarily
    // swapping the `set(...)` call and the thumb-copy block in
    // `duplicateCv` (src/lib/store.ts) and re-running: this test failed
    // with "expected doc-published order index to be after thumb-write" —
    // then swapped back and it passed again.
    const cv = await useApp.getState().createCv("Src3", "classic");
    await putCvThumb({ id: cv.id, blob: new Blob(["img"], { type: "image/webp" }), updatedAt: "2026-07-20T00:00:00.000Z" });

    const order: string[] = [];
    const realPutCvThumb = repo.putCvThumb;
    const putCvThumbSpy = vi.spyOn(repo, "putCvThumb").mockImplementation((x) => {
      order.push(`thumb-write:${x.id}`);
      return realPutCvThumb(x);
    });

    const unsubscribe = useApp.subscribe((state, prevState) => {
      if (state.cvdocs.length > prevState.cvdocs.length) {
        order.push("doc-published");
      }
    });

    const copy = await useApp.getState().duplicateCv(cv.id);

    unsubscribe();
    putCvThumbSpy.mockRestore();

    expect(copy).toBeTruthy();
    expect(order).toEqual([`thumb-write:${copy!.id}`, "doc-published"]);
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
