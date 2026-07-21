# CV Library Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic wireframe on CV library cards with a cached raster thumbnail of page 1 of each CV's real PDF, generated as a side effect of the editor's preview render.

**Architecture:** A new `cvthumbs` Dexie table (separate from `CvDoc` to avoid a render loop) stores one WebP/JPEG blob per CV. The editor's existing debounced `renderCvBlob` produces the PDF; a lazy-imported `pdfjs-dist` rasterizes page 1 and writes the blob fire-and-forget. Library cards read the blob and show an `<img>`, falling back to the existing `MiniMock` wireframe when no thumbnail exists.

**Tech Stack:** TypeScript, Next 16, Dexie 4, `@react-pdf/renderer` (existing), `pdfjs-dist` (new), Vitest + fake-indexeddb.

## Global Constraints

- Thumbnail writes MUST NOT mutate `CvDoc` (would retrigger the editor render effect — infinite loop). Store only in the `cvthumbs` table.
- Thumbnail generation errors MUST be swallowed silently — a missing/stale thumbnail is harmless (wireframe fallback).
- `pdfjs-dist` MUST be lazy-imported (dynamic `import()`) inside the thumbnail module only — never in the library page bundle.
- Card display MUST NOT import react-pdf or pdfjs.
- Thumbnail dimensions: ~600×848 px (2× card display size, A4 ratio). Format WebP q0.85, JPEG q0.85 fallback if `toBlob` yields `null`.
- `alt=""` on the thumbnail image (decorative — card title names the CV). Explicit aspect ratio to avoid layout shift.

---

### Task 1: Add `cvthumbs` Dexie table + repo helpers

**Files:**
- Modify: `src/lib/db.ts` (add table typing + `db.version(3)`)
- Modify: `src/lib/repo.ts` (add thumb helpers near line 48-49)
- Test: `src/lib/__tests__/cvthumb.test.ts` (create)

**Interfaces:**
- Produces:
  - Table row type `CvThumb = { id: string; blob: Blob; updatedAt: string }`
  - `putCvThumb(x: CvThumb): Promise<void>`
  - `getCvThumb(id: string): Promise<CvThumb | undefined>`
  - `deleteCvThumb(id: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/cvthumb.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/cvthumb.test.ts`
Expected: FAIL — `putCvThumb` / `getCvThumb` / `deleteCvThumb` not exported from `@/lib/repo`.

- [ ] **Step 3: Add the table to the Dexie schema**

In `src/lib/db.ts`, add `CvThumb` to the type block and a v3 migration.

Add the type import (top of file, after the existing `import type { Profile, CvDoc } from "@/cv/types";`):

```ts
export interface CvThumb {
  id: string;
  blob: Blob;
  updatedAt: string;
}
```

Add the table field to the `db` typed union (after `cvdocs: EntityTable<CvDoc, "id">;`):

```ts
  cvthumbs: EntityTable<CvThumb, "id">;
```

Append a new version **after** the existing `db.version(2)` block (do not edit v2):

```ts
db.version(3).stores({
  stages: "id, order",
  applications: "id, stageId, order, updatedAt",
  tags: "id",
  interviews: "id, applicationId, scheduledAt",
  contacts: "id, applicationId",
  events: "id, applicationId, at",
  notes: "id, applicationId",
  reminders: "id, dueAt, done",
  settings: "id",
  profile: "id",
  cvdocs: "id, applicationId, updatedAt",
  cvthumbs: "id",
});
```

- [ ] **Step 4: Add repo helpers**

In `src/lib/repo.ts`, add the `CvThumb` type import near the top with the other imports (the file already imports `db` from `./db`):

```ts
import type { CvThumb } from "./db";
```

Add the helpers after the existing `deleteCvDoc` (line 49):

```ts
export const putCvThumb = (x: CvThumb) => db.cvthumbs.put(x).then(() => {});
export const getCvThumb = (id: string) => db.cvthumbs.get(id);
export const deleteCvThumb = (id: string) => db.cvthumbs.delete(id);
```

Also add `db.cvthumbs` to the `ALL_TABLES` array (line 12-15) so `clearAll()` / `clearDemo` and the test `beforeEach` wipe thumbnails too:

```ts
const ALL_TABLES = [
  db.stages, db.applications, db.tags, db.interviews, db.contacts,
  db.events, db.notes, db.reminders, db.settings, db.profile, db.cvdocs,
  db.cvthumbs,
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/cvthumb.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts src/lib/repo.ts src/lib/__tests__/cvthumb.test.ts
git commit -m "feat: add cvthumbs Dexie table and repo helpers"
```

---

### Task 2: Wire thumb lifecycle into the store (duplicate copies, remove deletes)

**Files:**
- Modify: `src/lib/store.ts` (`duplicateCv` ~line 314, `removeCv` ~line 351)
- Test: `src/lib/__tests__/cvthumb.test.ts` (extend)

**Interfaces:**
- Consumes: `putCvThumb`, `getCvThumb`, `deleteCvThumb` from Task 1.
- Produces: no new exports — behavior only. `duplicateCv(id)` copies the source thumb to the new id; `removeCv(id)` deletes the thumb.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/cvthumb.test.ts` (add `useApp` + `getCvThumb`/`putCvThumb` are already imported; add `useApp` import and a `hydrate` in `beforeEach`). Replace the top of the file's imports/`beforeEach` with:

```ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll, putCvThumb, getCvThumb, deleteCvThumb } from "@/lib/repo";
import { useApp } from "@/lib/store";

beforeEach(async () => {
  await clearAll();
  useApp.setState({ ready: false, profile: null, cvdocs: [] });
  await useApp.getState().hydrate();
});
```

Then add this `describe` block at the end of the file:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/cvthumb.test.ts`
Expected: FAIL — `duplicateCv` does not copy the thumb; `removeCv` does not delete it.

- [ ] **Step 3: Import repo thumb helpers in the store**

In `src/lib/store.ts`, find the existing `import * as repo from "./repo";` (or the named repo import) and confirm `repo.getCvThumb`, `repo.putCvThumb`, `repo.deleteCvThumb` are reachable via the `repo` namespace. (They are, since Task 1 exported them from `repo.ts`. No import change needed if the file uses `import * as repo`.)

- [ ] **Step 4: Copy the thumb in `duplicateCv`**

In `duplicateCv` (~line 314), after `await repo.putCvDoc(cv).catch(() => {});` and before `return cv;`, add:

```ts
    const srcThumb = await repo.getCvThumb(id).catch(() => undefined);
    if (srcThumb) {
      await repo.putCvThumb({ ...srcThumb, id: cv.id }).catch(() => {});
    }
```

- [ ] **Step 5: Delete the thumb in `removeCv`**

In `removeCv` (~line 351), after `await repo.deleteCvDoc(id).catch(() => {});`, add:

```ts
    await repo.deleteCvThumb(id).catch(() => {});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/cvthumb.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/store.ts src/lib/__tests__/cvthumb.test.ts
git commit -m "feat: copy/delete cv thumbnails on duplicate/remove"
```

---

### Task 3: Thumbnail generation module (PDF blob → raster blob)

**Files:**
- Create: `src/cv/thumbnail.ts`
- Modify: `package.json` (add `pdfjs-dist` dependency)

**Interfaces:**
- Consumes: `putCvThumb` from Task 1.
- Produces: `generateCvThumb(id: string, pdfBlob: Blob): Promise<void>` — rasterizes page 1 of `pdfBlob` and stores it in `cvthumbs` under `id`. Never throws (swallows all errors).

> **Note on testing:** `pdfjs-dist` needs a real canvas + worker, which jsdom does not provide, so this module is verified live in Chrome (Task 5), not via a unit test. Keep the module tiny and side-effect-isolated so there is nothing else to unit-test here.

- [ ] **Step 1: Add the dependency**

Run: `npm install pdfjs-dist@^4`
Expected: `pdfjs-dist` appears in `package.json` dependencies; lockfile updated.

- [ ] **Step 2: Write the module**

Create `src/cv/thumbnail.ts`:

```ts
import { putCvThumb } from "@/lib/repo";

const THUMB_WIDTH = 600; // 2× card display; height derives from the page aspect ratio.

/**
 * Rasterize page 1 of a rendered CV PDF and cache it in `cvthumbs`.
 * Fire-and-forget: never throws — a missing/stale thumbnail is harmless
 * (the library card falls back to the MiniMock wireframe).
 */
export async function generateCvThumb(id: string, pdfBlob: Blob): Promise<void> {
  try {
    const pdfjs = await import("pdfjs-dist");
    // Bundle the worker from the same package (no CDN, works offline / under CSP).
    pdfjs.GlobalWorkerOptions.workerSrc = (
      await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
    ).default;

    const data = await pdfBlob.arrayBuffer();
    const doc = await pdfjs.getDocument({ data }).promise;
    const page = await doc.getPage(1);

    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

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

    doc.cleanup();
    await doc.destroy();
  } catch {
    // Swallow — thumbnail is best-effort.
  }
}
```

> During Task 5 live verification, confirm the `?url` worker import resolves under Next 16 + Turbopack. If it does not, the fallback is `pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();` — try that variant before anything else, and adjust the `page.render` args if the installed `pdfjs-dist@4` minor rejects the `canvas` field (older 4.x omit it).

- [ ] **Step 3: Typecheck the module**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/cv/thumbnail.ts`. (If `pdf.worker.min.mjs?url` has no type, add a `declare module "*.mjs?url"` ambient decl in `src/types/` or use the `new URL(...)` variant — resolve during live verification.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/cv/thumbnail.ts
git commit -m "feat: add CV PDF page-1 rasterizer (pdfjs-dist)"
```

---

### Task 4: Trigger generation from the editor preview

**Files:**
- Modify: `src/components/cv/CvPreview.tsx` (the `.then((blob) => {...})` in `PreviewInner`, ~lines 69-76)

**Interfaces:**
- Consumes: `generateCvThumb(id, pdfBlob)` from Task 3.
- Produces: no exports — on every successful preview render, the CV's thumbnail is refreshed as a side effect.

- [ ] **Step 1: Import the generator**

In `src/components/cv/CvPreview.tsx`, add to the imports (near `import { renderCvBlob } from "@/cv/pdf";`):

```ts
import { generateCvThumb } from "@/cv/thumbnail";
```

- [ ] **Step 2: Fire generation on successful render**

In `PreviewInner`, inside the debounced effect's `.then((blob) => { ... })` block, after `startTransition(() => setUrl(next));` add a fire-and-forget thumbnail refresh. The block becomes:

```ts
        .then((blob) => {
          if (cancelled) return; // superseded before commit — blob is GC'd, never URL'd
          const next = URL.createObjectURL(blob);
          if (liveUrl.current) staleUrls.current.push(liveUrl.current);
          liveUrl.current = next;
          startTransition(() => setUrl(next));
          void generateCvThumb(cv.id, blob); // best-effort cache; never awaited, never throws
        })
```

> `generateCvThumb` reads the blob via `arrayBuffer()` (a copy), so it does not interfere with the object URL the iframe consumes.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/cv/CvPreview.tsx
git commit -m "feat: refresh CV thumbnail on each editor preview render"
```

---

### Task 5: `CvThumb` display component with wireframe fallback

**Files:**
- Create: `src/components/cv/CvThumb.tsx`
- Modify: `src/components/cv/CvLibraryPage.tsx` (swap `MiniMock` usage in the card, ~line 57-58)

**Interfaces:**
- Consumes: `getCvThumb` from Task 1; `MiniMock` from `./MiniMock`.
- Produces: `CvThumb` React component — props `{ cvId: string; templateId: TemplateId; accent: string; className?: string }`. Shows the cached image if present, else `MiniMock`.

- [ ] **Step 1: Write the component**

Create `src/components/cv/CvThumb.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { getCvThumb } from "@/lib/repo";
import { MiniMock } from "./MiniMock";
import type { TemplateId } from "@/cv/types";

/**
 * Library-card thumbnail. Reads the cached page-1 raster from `cvthumbs`
 * once on mount and shows it as an <img>. Falls back to the MiniMock
 * wireframe when no thumbnail exists yet (new/never-opened CVs, or a CV
 * whose render was interrupted before its first thumbnail was written).
 *
 * Never imports react-pdf or pdfjs — the library page stays light.
 */
export function CvThumb({
  cvId, templateId, accent, className = "",
}: { cvId: string; templateId: TemplateId; accent: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    getCvThumb(cvId)
      .then((row) => {
        if (cancelled || !row) return;
        objectUrl = URL.createObjectURL(row.blob);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cvId]);

  if (!url) {
    return <MiniMock templateId={templateId} accent={accent} className={className} />;
  }

  return (
    <img
      src={url}
      alt=""
      className={`aspect-[1/1.414] w-full rounded-lg border border-line-2 bg-white object-cover object-top ${className}`}
    />
  );
}
```

- [ ] **Step 2: Use it in the card**

In `src/components/cv/CvLibraryPage.tsx`:

Replace the `MiniMock` import (line 14) — change:

```tsx
import { MiniMock, AtsBadge } from "./MiniMock";
```
to:
```tsx
import { AtsBadge } from "./MiniMock";
import { CvThumb } from "./CvThumb";
```

Replace the card usage (~line 58):

```tsx
        <MiniMock templateId={cv.templateId} accent={PALETTE[cv.accent].hex} className="w-full" />
```
with:
```tsx
        <CvThumb cvId={cv.id} templateId={cv.templateId} accent={PALETTE[cv.accent].hex} className="w-full" />
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx next lint --file src/components/cv/CvThumb.tsx`
Expected: no errors.

- [ ] **Step 4: Live verification in Chrome (DevTools MCP)**

Per project convention (JobTrackr UI tasks are verified live, not just build/curl):

1. `npm run dev` and open the app.
2. Open a CV in the editor, make an edit, wait for the preview to render (>500 ms debounce).
3. Navigate back to `/cv`. Confirm that card now shows a **real render** of the CV (name/content visible), not the wireframe.
4. Confirm a **never-opened** CV still shows the wireframe.
5. Duplicate a CV with a thumbnail → the copy shows the same thumbnail immediately.
6. Delete a CV → no orphaned thumb (re-create with same content renders fresh).
7. Check the console: no unhandled pdfjs/worker errors; confirm the `?url` worker import resolved (else apply the `new URL(...)` fallback from Task 3).
8. Confirm no horizontal scroll / layout shift on the card grid.

- [ ] **Step 5: Commit**

```bash
git add src/components/cv/CvThumb.tsx src/components/cv/CvLibraryPage.tsx
git commit -m "feat: show cached CV thumbnails on library cards"
```

---

### Task 6: Full regression pass

- [ ] **Step 1: Run the whole test suite**

Run: `npx vitest run`
Expected: all pass (including the new `cvthumb.test.ts`).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds; no error about `pdfjs-dist` in the library/route bundle (it should only appear in the editor chunk via dynamic import).

- [ ] **Step 3: Commit any fixups**

```bash
git add -A
git commit -m "test: regression pass for cv thumbnails" || echo "nothing to commit"
```
