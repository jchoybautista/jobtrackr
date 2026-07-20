# CV Library Thumbnails — Design

**Date:** 2026-07-20
**Status:** Approved

## Problem

CV Builder library cards render `MiniMock` — a pure-CSS wireframe of the *template* (generic gray bars). The user's actual CV content never appears in the card, which reads as broken/unfinished. A live PDF render per card was ruled out: it would load react-pdf on the library page and render N documents just to paint the grid.

## Solution

Cache a raster thumbnail of page 1 of the real PDF, generated as a side effect of the editor's existing preview render. Library cards show the cached image; the wireframe remains the fallback.

## Storage

New Dexie table in `src/lib/db.ts`, added as `db.version(3)`:

```ts
cvthumbs: "id"   // id = CvDoc.id
```

Row shape: `{ id: string; blob: Blob; updatedAt: string }`.

**Why a separate table, not a field on `CvDoc`:** the editor's preview effect re-renders whenever the `cv` object changes ([CvPreview.tsx](../../../src/components/cv/CvPreview.tsx) `useEffect` dep `[cv, photoUrl]`). A thumbnail written onto `CvDoc` would mutate `cv` → retrigger render → write again → infinite loop. A separate table also avoids false `updatedAt` bumps ("Updated 5d ago") and keeps the doc that is rewritten on every keystroke small.

Lifecycle wiring in the store (`src/lib/store.ts`):

- `duplicateCv(id)` — copy the source's `cvthumbs` row to the new id (if present).
- `removeCv(id)` — delete the `cvthumbs` row.

## Generation (editor only)

Hook into `PreviewInner`'s existing debounced (500 ms) render in `CvPreview.tsx`. On each **successful** `renderCvBlob` (the same blob shown in the preview iframe), fire-and-forget:

1. Lazy `import("pdfjs-dist")` (set `GlobalWorkerOptions.workerSrc` via `new URL(...)`; confirm under Next 16/turbopack during implementation).
2. Render page 1 to a canvas at ~600×848 px (2× card display size, A4 ratio).
3. `canvas.toBlob("image/webp", 0.85)`; if the browser returns `null` (Safari without WebP encode), fall back to `"image/jpeg"`, 0.85.
4. `db.cvthumbs.put({ id: cv.id, blob, updatedAt: new Date().toISOString() })`.

Errors are swallowed silently — a missing/stale thumbnail is harmless (wireframe fallback), and the preview pipeline already surfaces render errors through its error boundary.

`pdfjs-dist` is a new dependency, lazy-imported inside the thumbnail module only, so it is never in the library page bundle.

## Display (library page)

New small `CvThumb` component used by the card in `CvLibraryPage.tsx`:

- On mount, `db.cvthumbs.get(cv.id)`.
- Blob found → `<img>` with an object URL (revoked on unmount), `alt=""` (decorative — the card title names the CV), explicit aspect ratio to avoid layout shift.
- No blob → render existing `MiniMock` wireframe unchanged.

No react-pdf or pdfjs on the library page. Thumbnails are read once on mount; live cross-tab updates are out of scope.

## Accepted trade-offs

- A CV never opened in the editor (or freshly created) shows the wireframe until first opened; self-heals on next edit.
- A thumbnail can be one debounce-cycle stale if the tab is closed mid-edit; self-heals on next edit.

## Testing

- Store/db plumbing with existing `fake-indexeddb` + vitest setup: duplicate copies the thumb row; delete removes it; `CvThumb` falls back to `MiniMock` when no row exists.
- Rasterization quality and end-to-end behavior verified live in Chrome (DevTools MCP) per project convention.
