import type { PDFDocumentProxy } from "pdfjs-dist";
import { getCvThumb, putCvThumb } from "@/lib/repo";

const THUMB_WIDTH = 600; // 2× card display; height derives from the page aspect ratio.

/**
 * Rasterize page 1 of a rendered CV PDF and cache it in `cvthumbs`.
 * Fire-and-forget: never throws — a missing/stale thumbnail is harmless
 * (the library card falls back to the MiniMock wireframe).
 *
 * `sourceStamp` identifies the CV revision this render came from; it is stored
 * verbatim on the row so a later call can tell whether the cache already covers
 * the current revision and skip the work entirely. Callers must fold in every
 * input that changes the rendered page — notably the profile's `updatedAt`,
 * since swapping the profile photo alters the PDF without touching the CV doc.
 */
export async function generateCvThumb(
  id: string,
  pdfBlob: Blob,
  sourceStamp: string,
): Promise<void> {
  let doc: PDFDocumentProxy | undefined;
  try {
    // Bail before importing pdfjs (~1.4 MB) when the cache already covers this
    // revision — otherwise merely opening an unmodified CV pays the full cost of
    // the import, a worker spawn, and a rasterization to reproduce a byte-identical
    // image. Rows written before `sourceStamp` existed carry a wall-clock write
    // time, which is always >= the revision they rendered, so they read as fresh.
    const cached = await getCvThumb(id).catch(() => undefined);
    if (cached && cached.updatedAt >= sourceStamp) return;

    const pdfjs = await import("pdfjs-dist");
    // Resolve the worker from the same package (no CDN, works offline / under CSP).
    // Must be `new URL(..., import.meta.url)`: Turbopack does not honour a `?url`
    // import suffix here — it returns the worker's module namespace, whose
    // `default` is undefined, and pdfjs then throws "Invalid `workerSrc` type".
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    const data = await pdfBlob.arrayBuffer();
    doc = await pdfjs.getDocument({ data }).promise;
    const page = await doc.getPage(1);

    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const toBlob = (type: string) =>
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), type, 0.85);
      });

    // `toBlob` silently falls back to PNG for unsupported types rather than
    // returning null, so detect that by the resulting type and retry as JPEG.
    let finalBlob = await toBlob("image/webp");
    if (!finalBlob || finalBlob.type !== "image/webp") {
      finalBlob = (await toBlob("image/jpeg")) ?? finalBlob;
    }
    if (!finalBlob) return;

    await putCvThumb({ id, blob: finalBlob, updatedAt: sourceStamp });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[cvthumb] generation failed", err);
    }
    // Swallow — thumbnail is best-effort; the card falls back to the wireframe.
  } finally {
    // Always release the worker/doc, even if rendering or storage failed above.
    // Guarded separately so a cleanup failure can't violate the never-throws contract.
    try {
      await doc?.cleanup();
      await doc?.destroy();
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[cvthumb] cleanup failed", err);
      }
      // Swallow — best-effort cleanup only.
    }
  }
}
