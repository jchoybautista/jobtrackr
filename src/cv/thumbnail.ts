import type { PDFDocumentProxy } from "pdfjs-dist";
import { putCvThumb } from "@/lib/repo";

const THUMB_WIDTH = 600; // 2× card display; height derives from the page aspect ratio.

/**
 * Rasterize page 1 of a rendered CV PDF and cache it in `cvthumbs`.
 * Fire-and-forget: never throws — a missing/stale thumbnail is harmless
 * (the library card falls back to the MiniMock wireframe).
 */
export async function generateCvThumb(id: string, pdfBlob: Blob): Promise<void> {
  let doc: PDFDocumentProxy | undefined;
  try {
    const pdfjs = await import("pdfjs-dist");
    // Bundle the worker from the same package (no CDN, works offline / under CSP).
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

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/webp", 0.85);
    });
    const finalBlob =
      blob ??
      (await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
      }));
    if (!finalBlob) return;

    await putCvThumb({ id, blob: finalBlob, updatedAt: new Date().toISOString() });
  } catch {
    // Swallow — thumbnail is best-effort.
  } finally {
    // Always release the worker/doc, even if rendering or storage failed above.
    // Guarded separately so a cleanup failure can't violate the never-throws contract.
    try {
      await doc?.cleanup();
      await doc?.destroy();
    } catch {
      // Swallow — best-effort cleanup only.
    }
  }
}
