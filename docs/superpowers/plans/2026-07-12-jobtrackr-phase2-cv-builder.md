# JobTrackr Phase 2 (CV Builder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the JobTrackr CV builder — master profile, tailored CV versions, 3 react-pdf templates, live A4 preview, client-side PDF export, tracker linkage — per the approved spec (`docs/superpowers/specs/2026-07-12-jobtrackr-phase2-cv-builder-design.md`).

**Architecture:** New `src/cv/` domain module (types, dates, fonts, templates) + `src/components/cv/` UI + `/cv` routes. Dexie bumps to schema v2 (additive `profile` + `cvdocs` tables); repo/store/export extend the Phase 1 patterns. All PDF work is client-side via `@react-pdf/renderer` (deterministic, text-based, offline). Content forms are shared between the profile editor and the CV editor — both edit a `CvContent`.

**Tech Stack:** Existing Phase 1 stack + `@react-pdf/renderer` 4.x, `@expo-google-fonts/plus-jakarta-sans` + `@expo-google-fonts/lora` (static TTFs copied to `public/fonts/`).

## Global Constraints

- Everything from the Phase 1 plan's Global Constraints still binds (tokens-only colors in app UI, Plus Jakarta Sans app font, pill buttons, labeled inputs, aria on icon buttons, reduced-motion, ISO dates, `crypto.randomUUID()` ids, commit per task).
- CV feature loads via **dynamic import** (`next/dynamic`, `ssr: false`) so react-pdf never bloats Board/Dashboard bundles or runs during SSR.
- Templates never fetch remote assets: fonts registered from same-origin `/fonts/*.ttf` (or a filesystem base path in tests).
- Classic template NEVER renders a photo, regardless of `showPhoto`.
- Empty sections never render in a PDF even when `visible: true`.
- Accent colors come exclusively from the Phase 1 `PALETTE` (PaletteKey); templates receive the resolved hex.
- Photo upload: accept `image/jpeg|png|webp`, max 2 MB, stored as Blob on `Profile`.
- Chrome DevTools MCP live verification required for every UI task (implementer and reviewer).
- Mobile bottom bar becomes 5 tabs (CV Builder added); each tab ≥44px touch target at 390px width.

## File Structure

```
src/cv/types.ts               — CvContent + entry types, SectionKey, SECTION_LABELS, DEFAULT_SECTIONS, emptyCvContent()
src/cv/dates.ts               — formatMonthYear, formatRange
src/cv/fonts.ts               — registerCvFonts(base?)
src/cv/templates/shared.tsx   — react-pdf building blocks (SectionTitle, BulletList, styles helpers)
src/cv/templates/classic.tsx  — Classic template
src/cv/templates/modern.tsx   — Modern template
src/cv/templates/elegant.tsx  — Elegant template
src/cv/templates/index.ts     — CvTemplate contract + TEMPLATES registry
src/cv/pdf.ts                 — renderCvBlob(cv, profilePhotoUrl?), downloadCv()
src/lib/db.ts                 — version(2) additive tables (modify)
src/lib/types.ts              — re-export CV types into Snapshot (modify)
src/lib/repo.ts               — profile/cvdocs persistence (modify)
src/lib/exportio.ts           — v2 schema, photo base64, v1-compat import (modify)
src/lib/store.ts              — profile + cvdoc actions (modify)
src/components/cv/content-forms/ContactForm.tsx, SummaryForm.tsx, ExperienceForm.tsx,
  EducationForm.tsx, SkillsForm.tsx, SimpleListForms.tsx (projects/certs/languages/awards/volunteer/interests/references)
src/components/cv/form-kit.tsx — Field, TextArea, EntryShell (add/remove/reorder wrapper) shared helpers
src/components/cv/CvLibraryPage.tsx, NewCvDialog.tsx
src/components/cv/ProfileEditorPage.tsx, PhotoUpload.tsx
src/components/cv/CvEditorPage.tsx, SectionRail.tsx, CvPreview.tsx, CvToolbar.tsx
src/app/cv/page.tsx, src/app/cv/profile/page.tsx, src/app/cv/[id]/page.tsx
src/components/detail/DetailPanel.tsx — Documents section (modify)
src/components/shell/Sidebar.tsx — nav item (modify)
e2e/smoke.spec.ts — CV flow (modify)
```

---

### Task 1: CV domain types + date formatting

**Files:**
- Create: `src/cv/types.ts`, `src/cv/dates.ts`
- Test: `src/cv/__tests__/dates.test.ts`

**Interfaces:**
- Consumes: `PaletteKey` from `@/lib/types`.
- Produces (exact — every later task imports these):

```ts
// src/cv/types.ts
export interface ProfileLink { id: string; label: string; url: string }
export interface ExperienceEntry { id: string; role: string; company: string; location?: string; startDate?: string; endDate?: string; bullets: string[] }
export interface EducationEntry { id: string; school: string; degree?: string; field?: string; startDate?: string; endDate?: string; notes?: string }
export interface SkillGroup { id: string; name: string; skills: string[] }
export interface ProjectEntry { id: string; name: string; url?: string; description?: string; bullets: string[] }
export interface CertEntry { id: string; name: string; issuer?: string; date?: string }
export interface LanguageEntry { id: string; name: string; level?: string }
export interface AwardEntry { id: string; name: string; issuer?: string; date?: string }
export interface VolunteerEntry { id: string; role: string; org: string; startDate?: string; endDate?: string; description?: string }
export interface ReferenceEntry { id: string; name: string; role?: string; company?: string; email?: string; phone?: string }

export interface CvContent {
  fullName: string; headline?: string; email?: string; phone?: string; location?: string;
  links: ProfileLink[]; summary?: string;
  experience: ExperienceEntry[]; education: EducationEntry[]; skills: SkillGroup[];
  projects: ProjectEntry[]; certifications: CertEntry[]; languages: LanguageEntry[];
  awards: AwardEntry[]; volunteer: VolunteerEntry[]; interests?: string;
  references: ReferenceEntry[]; referencesOnRequest: boolean;
}

export type SectionKey =
  | "summary" | "experience" | "education" | "skills" | "projects"
  | "certifications" | "languages" | "awards" | "volunteer" | "interests" | "references";

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Professional Summary", experience: "Work Experience", education: "Education",
  skills: "Skills", projects: "Projects", certifications: "Certifications",
  languages: "Languages", awards: "Awards", volunteer: "Volunteer Experience",
  interests: "Interests", references: "References",
};

export interface CvSection { key: SectionKey; visible: boolean }
export const DEFAULT_SECTIONS: CvSection[] = [
  { key: "summary", visible: true }, { key: "skills", visible: true },
  { key: "experience", visible: true }, { key: "education", visible: true },
  { key: "projects", visible: true }, { key: "certifications", visible: false },
  { key: "languages", visible: false }, { key: "awards", visible: false },
  { key: "volunteer", visible: false }, { key: "interests", visible: false },
  { key: "references", visible: false },
];

export type TemplateId = "classic" | "modern" | "elegant";

export interface Profile { id: "singleton"; content: CvContent; photo?: Blob; updatedAt: string }

export interface CvDoc {
  id: string; name: string; templateId: TemplateId;
  accent: import("@/lib/types").PaletteKey; showPhoto: boolean;
  content: CvContent; sections: CvSection[];
  applicationId?: string; createdAt: string; updatedAt: string;
}

export function emptyCvContent(): CvContent {
  return {
    fullName: "", links: [], experience: [], education: [], skills: [],
    projects: [], certifications: [], languages: [], awards: [],
    volunteer: [], references: [], referencesOnRequest: false,
  };
}
```

```ts
// src/cv/dates.ts
export function formatMonthYear(iso?: string): string        // "2026-07" | "2026-07-12" → "Jul 2026"; undefined/"" → ""
export function formatRange(start?: string, end?: string): string
// both set → "Jul 2024 – Jan 2026"; start only → "Jul 2024 – Present"; neither → ""; end only → "Jan 2026"
```

- [ ] **Step 1: Write failing test `src/cv/__tests__/dates.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { formatMonthYear, formatRange } from "@/cv/dates";

describe("cv dates", () => {
  it("formats YYYY-MM and full ISO to Mon YYYY", () => {
    expect(formatMonthYear("2026-07")).toBe("Jul 2026");
    expect(formatMonthYear("2024-01-15")).toBe("Jan 2024");
    expect(formatMonthYear(undefined)).toBe("");
    expect(formatMonthYear("")).toBe("");
  });

  it("formats ranges with Present fallback", () => {
    expect(formatRange("2024-07", "2026-01")).toBe("Jul 2024 – Jan 2026");
    expect(formatRange("2024-07", undefined)).toBe("Jul 2024 – Present");
    expect(formatRange(undefined, "2026-01")).toBe("Jan 2026");
    expect(formatRange(undefined, undefined)).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL (no `@/cv/dates`).

- [ ] **Step 3: Create `src/cv/dates.ts`**

```ts
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatMonthYear(iso?: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})/);
  if (!m) return "";
  const month = MONTHS[parseInt(m[2], 10) - 1];
  return month ? `${month} ${m[1]}` : "";
}

export function formatRange(start?: string, end?: string): string {
  const s = formatMonthYear(start);
  const e = formatMonthYear(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `${s} – Present`;
  return e;
}
```

- [ ] **Step 4: Create `src/cv/types.ts`** with the exact content from the Interfaces block above.

- [ ] **Step 5: Run to verify pass** — `npm test` → dates tests PASS; `npx tsc --noEmit` clean.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: cv domain types and date formatting"`

---

### Task 2: Dexie schema v2 + repo/store persistence for profile & CV docs

**Files:**
- Modify: `src/lib/db.ts`, `src/lib/types.ts`, `src/lib/repo.ts`, `src/lib/store.ts`
- Test: `src/lib/__tests__/cvrepo.test.ts`

**Interfaces:**
- Consumes: `Profile`, `CvDoc`, `emptyCvContent`, `DEFAULT_SECTIONS` from `@/cv/types`; `newId`; existing repo/store patterns.
- Produces:
  - `db.profile: EntityTable<Profile, "id">`, `db.cvdocs: EntityTable<CvDoc, "id">` via `db.version(2).stores({ ...all v1 tables unchanged..., profile: "id", cvdocs: "id, applicationId, updatedAt" })`. **Copy the v1 stores object verbatim into version(2)** (Dexie requires the full schema per version; v1 declaration stays for upgraders).
  - `Snapshot` (in `src/lib/types.ts`) gains `profile: Profile | null; cvdocs: CvDoc[]` (import types from `@/cv/types`; re-export them from `@/lib/types` for convenience).
  - Repo: `putProfile(p: Profile)`, `putCvDoc(x: CvDoc)`, `deleteCvDoc(id: string)`; `loadAll()` returns the extended Snapshot (`profile` null when absent; `cvdocs` sorted by `updatedAt` desc); `clearAll`/`importSnapshot` cover the new tables; `deleteApplication` additionally **nulls `applicationId`** on linked cvdocs (modify, not delete).
  - Store state gains `profile: Profile | null; cvdocs: CvDoc[]` and actions:
    - `saveProfile(content: CvContent): Promise<void>` — upserts singleton, bumps updatedAt
    - `setProfilePhoto(photo: Blob | undefined): Promise<void>`
    - `createCv(name: string, templateId: TemplateId): Promise<CvDoc>` — content = **deep copy** of profile content (or `emptyCvContent()` when no profile), `sections: DEFAULT_SECTIONS` copy, `accent: "sky"`, `showPhoto: templateId !== "classic"`
    - `duplicateCv(id: string): Promise<CvDoc | null>` — copy with `name: "<name> (copy)"`, new id/timestamps
    - `updateCv(id: string, patch: Partial<Pick<CvDoc, "name" | "templateId" | "accent" | "showPhoto" | "applicationId">>): Promise<void>`
    - `updateCvContent(id: string, patch: Partial<CvContent>): Promise<void>` — merges into `content`, bumps updatedAt
    - `setCvSections(id: string, sections: CvSection[]): Promise<void>`
    - `removeCv(id: string): Promise<void>`
  - Store `removeApplication` also nulls `applicationId` on linked cvdocs in memory (mirror of repo cascade).

- [ ] **Step 1: Write failing test `src/lib/__tests__/cvrepo.test.ts`**

```ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll, loadAll } from "@/lib/repo";
import { useApp } from "@/lib/store";

beforeEach(async () => {
  await clearAll();
  useApp.setState({ ready: false, profile: null, cvdocs: [] });
  await useApp.getState().hydrate();
});

describe("cv persistence", () => {
  it("saveProfile upserts the singleton and loadAll returns it", async () => {
    await useApp.getState().saveProfile({ ...profileContent() });
    const snap = await loadAll();
    expect(snap.profile?.content.fullName).toBe("Jon B");
    expect(snap.cvdocs).toEqual([]);
  });

  it("createCv snapshots the profile content independently", async () => {
    await useApp.getState().saveProfile({ ...profileContent() });
    const cv = await useApp.getState().createCv("Stripe CV", "modern");
    expect(cv.content.fullName).toBe("Jon B");
    expect(cv.showPhoto).toBe(true);
    // mutating the CV must not touch the profile
    await useApp.getState().updateCvContent(cv.id, { fullName: "Tailored Name" });
    const s = useApp.getState();
    expect(s.cvdocs.find((c) => c.id === cv.id)!.content.fullName).toBe("Tailored Name");
    expect(s.profile!.content.fullName).toBe("Jon B");
  });

  it("classic CVs default showPhoto false", async () => {
    const cv = await useApp.getState().createCv("Plain", "classic");
    expect(cv.showPhoto).toBe(false);
  });

  it("deleting a linked application nulls the cv link but keeps the cv", async () => {
    const app = await useApp.getState().addApplication({ company: "Acme", role: "Dev" });
    const cv = await useApp.getState().createCv("Acme CV", "classic");
    await useApp.getState().updateCv(cv.id, { applicationId: app.id });
    await useApp.getState().removeApplication(app.id);
    const snap = await loadAll();
    const kept = snap.cvdocs.find((c) => c.id === cv.id);
    expect(kept).toBeTruthy();
    expect(kept!.applicationId).toBeUndefined();
  });
});

function profileContent() {
  return {
    fullName: "Jon B", links: [], experience: [], education: [], skills: [],
    projects: [], certifications: [], languages: [], awards: [], volunteer: [],
    references: [], referencesOnRequest: false,
  };
}
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL (missing tables/actions).

- [ ] **Step 3: Modify `src/lib/db.ts`** — add table types to the cast and:

```ts
import type { Profile, CvDoc } from "@/cv/types";
// cast gains: profile: EntityTable<Profile, "id">; cvdocs: EntityTable<CvDoc, "id">;

db.version(2).stores({
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
});
```

(keep the existing `db.version(1).stores({...})` line above it, unchanged).

- [ ] **Step 4: Modify `src/lib/types.ts`** — extend Snapshot and re-export:

```ts
import type { Profile, CvDoc } from "@/cv/types";
export type { Profile, CvDoc } from "@/cv/types";
// Snapshot gains:
//   profile: Profile | null;
//   cvdocs: CvDoc[];
```

- [ ] **Step 5: Modify `src/lib/repo.ts`**

```ts
// loadAll(): add to the Promise.all — db.profile.get("singleton"), db.cvdocs.orderBy("updatedAt").reverse().toArray()
// return { ...existing, profile: profile ?? null, cvdocs };
export const putProfile = (x: Profile) => db.profile.put(x).then(() => {});
export const putCvDoc = (x: CvDoc) => db.cvdocs.put(x).then(() => {});
export const deleteCvDoc = (id: string) => db.cvdocs.delete(id);
// ALL_TABLES gains db.profile, db.cvdocs (clearAll + transactions cover them)
// importSnapshot: bulkPut snap.cvdocs; if snap.profile, put it
// deleteApplication: inside the transaction, also:
//   await db.cvdocs.where("applicationId").equals(id).modify((c) => { delete c.applicationId; });
```

- [ ] **Step 6: Modify `src/lib/store.ts`** — add state defaults (`profile: null, cvdocs: []`) and the actions from the Interfaces block, following the existing optimistic write-through pattern, e.g.:

```ts
async saveProfile(content) {
  const profile: Profile = { id: "singleton", content, photo: get().profile?.photo, updatedAt: nowIso() };
  set(() => ({ profile }));
  await repo.putProfile(profile).catch(() => {});
},
async setProfilePhoto(photo) {
  const cur = get().profile;
  const profile: Profile = { id: "singleton", content: cur?.content ?? emptyCvContent(), photo, updatedAt: nowIso() };
  set(() => ({ profile }));
  await repo.putProfile(profile).catch(() => {});
},
async createCv(name, templateId) {
  const src = get().profile?.content ?? emptyCvContent();
  const cv: CvDoc = {
    id: newId(), name, templateId, accent: "sky", showPhoto: templateId !== "classic",
    content: structuredClone(src), sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
    createdAt: nowIso(), updatedAt: nowIso(),
  };
  set((s) => ({ cvdocs: [cv, ...s.cvdocs] }));
  await repo.putCvDoc(cv).catch(() => {});
  return cv;
},
async duplicateCv(id) {
  const src = get().cvdocs.find((c) => c.id === id);
  if (!src) return null;
  const cv: CvDoc = { ...structuredClone(src), id: newId(), name: `${src.name} (copy)`,
    createdAt: nowIso(), updatedAt: nowIso() };
  set((s) => ({ cvdocs: [cv, ...s.cvdocs] }));
  await repo.putCvDoc(cv).catch(() => {});
  return cv;
},
async updateCv(id, patch) {
  let next: CvDoc | undefined;
  set((s) => ({ cvdocs: s.cvdocs.map((c) => (c.id === id ? (next = { ...c, ...patch, id, updatedAt: nowIso() }) : c)) }));
  if (next) await repo.putCvDoc(next).catch(() => {});
},
async updateCvContent(id, patch) {
  let next: CvDoc | undefined;
  set((s) => ({ cvdocs: s.cvdocs.map((c) =>
    (c.id === id ? (next = { ...c, content: { ...c.content, ...patch }, updatedAt: nowIso() }) : c)) }));
  if (next) await repo.putCvDoc(next).catch(() => {});
},
async setCvSections(id, sections) {
  let next: CvDoc | undefined;
  set((s) => ({ cvdocs: s.cvdocs.map((c) => (c.id === id ? (next = { ...c, sections, updatedAt: nowIso() }) : c)) }));
  if (next) await repo.putCvDoc(next).catch(() => {});
},
async removeCv(id) {
  set((s) => ({ cvdocs: s.cvdocs.filter((c) => c.id !== id) }));
  await repo.deleteCvDoc(id).catch(() => {});
},
// removeApplication additionally:
//   cvdocs: s.cvdocs.map((c) => c.applicationId === id ? { ...c, applicationId: undefined } : c),
```

`hydrate()` needs no change beyond the snapshot spread already covering the new fields; the persistBroken fallback adds `profile: null, cvdocs: []`.

- [ ] **Step 7: Run to verify pass** — `npm test` → cvrepo tests PASS, all prior suites green; `npx tsc --noEmit` clean. (`structuredClone` exists in Node 18+/browsers/jsdom.)

- [ ] **Step 8: Commit** — `git add -A && git commit -m "feat: dexie v2 schema, profile and cv doc persistence with store actions"`

---

### Task 3: Export/import v2 (cvdocs + profile with base64 photo, v1-compatible import)

**Files:**
- Modify: `src/lib/exportio.ts`
- Test: extend `src/lib/__tests__/exportio.test.ts`

**Interfaces:**
- Consumes: extended `Snapshot`; `CvContent` types.
- Produces:
  - Export file becomes `{ version: 2, exportedAt, data: SnapshotJson }` where `SnapshotJson` = Snapshot with `profile` serialized as `{ id, content, updatedAt, photoBase64?: string, photoType?: string }` (Blob → base64 via `blob.arrayBuffer()`).
  - `toJson(snap: Snapshot): Promise<string>` — **becomes async** (photo encoding). Update the Settings caller signature note: Task 20 (Phase 1 Settings) calls `s.exportJson()`; store's `exportJson` becomes `exportJson(): Promise<string>` and SettingsPage awaits it in the download handler.
  - `fromJson(json: string): Snapshot` — accepts version 1 files (defaults `profile: null, cvdocs: []`) AND version 2 (decodes base64 back to Blob; `atob` in browser/jsdom). URL http(s) refine from the final Phase 1 fix stays.
  - CSV unchanged.

- [ ] **Step 1: Write failing tests** (append to `src/lib/__tests__/exportio.test.ts`):

```ts
it("v2 round-trips cvdocs and profile with photo blob", async () => {
  const photo = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" });
  const snap2: Snapshot = {
    ...snap,
    profile: { id: "singleton", content: emptyCvContent(), photo, updatedAt: "2026-07-12T00:00:00.000Z" },
    cvdocs: [{
      id: "cv1", name: "Test CV", templateId: "classic", accent: "sky", showPhoto: false,
      content: { ...emptyCvContent(), fullName: "Jon" }, sections: DEFAULT_SECTIONS,
      createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z",
    }],
  };
  const out = fromJson(await toJson(snap2));
  expect(out.cvdocs[0].content.fullName).toBe("Jon");
  expect(out.profile?.photo).toBeInstanceOf(Blob);
  expect(out.profile?.photo?.type).toBe("image/png");
  expect(new Uint8Array(await out.profile!.photo!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
});

it("accepts version-1 export files (no cv fields)", async () => {
  const v1 = JSON.stringify({ version: 1, exportedAt: "x", data: legacyV1Data() });
  const out = fromJson(v1);
  expect(out.profile).toBeNull();
  expect(out.cvdocs).toEqual([]);
});
```

(`legacyV1Data()` = the existing test `snap` minus `profile`/`cvdocs`, serialized as before; `snap` in the existing file must gain `profile: null, cvdocs: []` to keep older tests compiling.)

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement in `src/lib/exportio.ts`**

```ts
// zod additions (compose from small schemas; keep url refine):
const cvContentSchema = z.object({
  fullName: z.string(), headline: z.string().optional(), email: z.string().optional(),
  phone: z.string().optional(), location: z.string().optional(),
  links: z.array(z.object({ id: z.string(), label: z.string(), url: z.string() })),
  summary: z.string().optional(),
  experience: z.array(z.object({ id: z.string(), role: z.string(), company: z.string(),
    location: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional(),
    bullets: z.array(z.string()) })),
  education: z.array(z.object({ id: z.string(), school: z.string(), degree: z.string().optional(),
    field: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional(),
    notes: z.string().optional() })),
  skills: z.array(z.object({ id: z.string(), name: z.string(), skills: z.array(z.string()) })),
  projects: z.array(z.object({ id: z.string(), name: z.string(), url: z.string().optional(),
    description: z.string().optional(), bullets: z.array(z.string()) })),
  certifications: z.array(z.object({ id: z.string(), name: z.string(), issuer: z.string().optional(), date: z.string().optional() })),
  languages: z.array(z.object({ id: z.string(), name: z.string(), level: z.string().optional() })),
  awards: z.array(z.object({ id: z.string(), name: z.string(), issuer: z.string().optional(), date: z.string().optional() })),
  volunteer: z.array(z.object({ id: z.string(), role: z.string(), org: z.string(),
    startDate: z.string().optional(), endDate: z.string().optional(), description: z.string().optional() })),
  interests: z.string().optional(),
  references: z.array(z.object({ id: z.string(), name: z.string(), role: z.string().optional(),
    company: z.string().optional(), email: z.string().optional(), phone: z.string().optional() })),
  referencesOnRequest: z.boolean(),
});

const cvDocSchema = z.object({
  id: z.string(), name: z.string(), templateId: z.enum(["classic", "modern", "elegant"]),
  accent: paletteKey, showPhoto: z.boolean(), content: cvContentSchema,
  sections: z.array(z.object({ key: z.enum([
    "summary","experience","education","skills","projects","certifications",
    "languages","awards","volunteer","interests","references"]), visible: z.boolean() })),
  applicationId: z.string().optional(), createdAt: z.string(), updatedAt: z.string(),
});

const profileJsonSchema = z.object({
  id: z.literal("singleton"), content: cvContentSchema, updatedAt: z.string(),
  photoBase64: z.string().optional(), photoType: z.string().optional(),
});

// v2 file schema: version literal 2, data = v1 snapshot schema + { profile: profileJsonSchema.nullable(), cvdocs: z.array(cvDocSchema) }
// fromJson: try v2 schema; on version===1 parse with v1 schema and return { ...data, profile: null, cvdocs: [] }.
// photo decode: photoBase64 → Uint8Array.from(atob(b64), c => c.charCodeAt(0)) → new Blob([bytes], { type: photoType })

export async function toJson(snap: Snapshot): Promise<string> {
  const { profile, ...rest } = snap;
  let profileJson: unknown = null;
  if (profile) {
    const { photo, ...p } = profile;
    profileJson = photo
      ? { ...p, photoBase64: btoa(String.fromCharCode(...new Uint8Array(await photo.arrayBuffer()))), photoType: photo.type }
      : p;
  }
  return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(),
    data: { ...rest, profile: profileJson } }, null, 2);
}
```

Update `store.ts` `exportJson` to `async` returning `toJson(...)` (include `profile`/`cvdocs` in the destructure) and `SettingsPage.tsx` download handler to `onClick={async () => download("jobtrackr-export.json", await s.exportJson(), "application/json")}`.

- [ ] **Step 4: Run to verify pass** — `npm test` all green; `npx tsc --noEmit` clean; `npm run build` clean.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: v2 export/import with cv docs and base64 profile photo, v1 compat"`

---

### Task 4: Fonts + template shared building blocks + registry contract

**Files:**
- Create: `src/cv/fonts.ts`, `src/cv/templates/shared.tsx`, `src/cv/templates/index.ts` (registry stub filled by Tasks 5–7), `public/fonts/*.ttf`
- Test: `src/cv/__tests__/fonts.test.ts` (registration idempotence only)

**Interfaces:**
- Consumes: `@react-pdf/renderer` (`Font`, `StyleSheet`, `Text`, `View`), `@expo-google-fonts/*` TTFs, `SECTION_LABELS`, `formatRange`, CvContent types.
- Produces:
  - `registerCvFonts(base?: string): void` — registers families `"Jakarta"` (400/700 + italic 400) and `"Lora"` (400/700) from `${base ?? "/fonts"}/<file>.ttf`; idempotent (guards on a module flag).
  - Font files copied into `public/fonts/`: `PlusJakartaSans-Regular.ttf`, `PlusJakartaSans-Bold.ttf`, `PlusJakartaSans-Italic.ttf`, `Lora-Regular.ttf`, `Lora-Bold.ttf`.
  - `shared.tsx` exports (react-pdf components): `SectionTitle({ children, accent, serif? })`, `BulletList({ items })` (renders "•  " rows, skips empty strings), `Row`, `MetaText`, and `baseStyles` (A4 page padding 36pt, 10pt body, 1.45 line height), `PageFooter` (renders `Page X of Y` via `<Text render={({pageNumber,totalPages}) => totalPages > 1 ? \`Page ${pageNumber} of ${totalPages}\` : ""} fixed />`).
  - `index.ts`: `export interface TemplateProps { content: CvContent; sections: CvSection[]; accent: string; photoUrl?: string }` ; `export interface CvTemplate { id: TemplateId; name: string; atsSafe: boolean; note: string; render: (p: TemplateProps) => React.ReactElement }` ; `export const TEMPLATES: CvTemplate[]` (empty array now; Tasks 5–7 push entries) ; `export const getTemplate = (id: TemplateId) => TEMPLATES.find((t) => t.id === id)!` ; helper `visibleSections(p: TemplateProps): SectionKey[]` returning ordered visible keys whose content is non-empty (switch over SectionKey checking array lengths / trimmed strings; `references` counts as non-empty when `references.length > 0 || referencesOnRequest`).

- [ ] **Step 1: Install + copy fonts**

```bash
npm i @react-pdf/renderer @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/lora
mkdir -p public/fonts
cp node_modules/@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf public/fonts/PlusJakartaSans-Regular.ttf
cp node_modules/@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf public/fonts/PlusJakartaSans-Bold.ttf
cp node_modules/@expo-google-fonts/plus-jakarta-sans/400Regular_Italic/PlusJakartaSans_400Regular_Italic.ttf public/fonts/PlusJakartaSans-Italic.ttf
cp node_modules/@expo-google-fonts/lora/400Regular/Lora_400Regular.ttf public/fonts/Lora-Regular.ttf
cp node_modules/@expo-google-fonts/lora/700Bold/Lora_700Bold.ttf public/fonts/Lora-Bold.ttf
```

(If the package layout differs, `find node_modules/@expo-google-fonts -name "*.ttf"` and adjust — the five destination filenames above are the contract.)

- [ ] **Step 2: Create `src/cv/fonts.ts`**

```ts
import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerCvFonts(base: string = "/fonts"): void {
  if (registered) return;
  registered = true;
  Font.register({
    family: "Jakarta",
    fonts: [
      { src: `${base}/PlusJakartaSans-Regular.ttf` },
      { src: `${base}/PlusJakartaSans-Bold.ttf`, fontWeight: 700 },
      { src: `${base}/PlusJakartaSans-Italic.ttf`, fontStyle: "italic" },
    ],
  });
  Font.register({
    family: "Lora",
    fonts: [
      { src: `${base}/Lora-Regular.ttf` },
      { src: `${base}/Lora-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]); // no mid-word breaks in CVs
}
```

- [ ] **Step 3: Create `src/cv/templates/shared.tsx`**

```tsx
import { StyleSheet, Text, View } from "@react-pdf/renderer";

export const baseStyles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 42, paddingHorizontal: 40, fontFamily: "Jakarta", fontSize: 10, lineHeight: 1.45, color: "#1a1a1a" },
  meta: { fontSize: 9, color: "#555555" },
  footer: { position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "#999999" },
});

export function SectionTitle({ children, accent, serif = false }: { children: string; accent: string; serif?: boolean }) {
  return (
    <Text style={{
      fontFamily: serif ? "Lora" : "Jakarta", fontWeight: 700, fontSize: 11,
      letterSpacing: 0.8, textTransform: "uppercase", color: accent,
      borderBottomWidth: 0.75, borderBottomColor: accent, paddingBottom: 2, marginBottom: 6, marginTop: 12,
    }}>
      {children}
    </Text>
  );
}

export function BulletList({ items }: { items: string[] }) {
  const list = items.map((b) => b.trim()).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <View style={{ marginTop: 2 }}>
      {list.map((b, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: 1.5 }}>
          <Text style={{ width: 10 }}>•</Text>
          <Text style={{ flex: 1 }}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

export function Row({ left, right }: { left: string; right?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
      <Text style={{ fontWeight: 700, fontSize: 10.5, flex: 1 }}>{left}</Text>
      {right ? <Text style={baseStyles.meta}>{right}</Text> : null}
    </View>
  );
}

export function PageFooter() {
  return (
    <Text
      style={baseStyles.footer}
      render={({ pageNumber, totalPages }) => (totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : "")}
      fixed
    />
  );
}
```

- [ ] **Step 4: Create `src/cv/templates/index.ts`** per the Interfaces block (with `visibleSections` fully implemented: a `hasContent(key, content)` switch — summary/interests check trimmed strings, references checks `references.length > 0 || referencesOnRequest`, everything else checks `content[key].length > 0`).

- [ ] **Step 5: Write + pass test `src/cv/__tests__/fonts.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { registerCvFonts } from "@/cv/fonts";

describe("cv fonts", () => {
  it("registers idempotently without throwing", () => {
    expect(() => { registerCvFonts("/fonts"); registerCvFonts("/fonts"); }).not.toThrow();
  });
});
```

- [ ] **Step 6: Verify** — `npm test` green; `npx tsc --noEmit` clean; the 5 TTFs exist in `public/fonts/` (`ls`).

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: cv fonts, react-pdf shared components, template registry contract"`

---

### Task 5: Classic template (ATS-safe) + PDF render pipeline

**Files:**
- Create: `src/cv/templates/classic.tsx`, `src/cv/pdf.ts`
- Modify: `src/cv/templates/index.ts` (register entry)
- Test: `src/cv/__tests__/templates.test.tsx`

**Interfaces:**
- Consumes: shared.tsx, registry contract, dates, fonts.
- Produces:
  - `TEMPLATES` gains `{ id: "classic", name: "Classic", atsSafe: true, note: "Single column, standard headings — parses cleanly in every ATS.", render: ClassicTemplate }`.
  - `src/cv/pdf.ts`:
    - `renderCvBlob(cv: CvDoc, photoUrl?: string): Promise<Blob>` — `registerCvFonts()`, resolve accent hex via `PALETTE[cv.accent].hex`, call `pdf(getTemplate(cv.templateId).render({ content: cv.content, sections: cv.sections, accent, photoUrl: cv.showPhoto ? photoUrl : undefined })).toBlob()`.
    - `renderCvBuffer(cv, fontBase, photoUrl?)` — Node variant for tests using `renderToBuffer` and `registerCvFonts(fontBase)`.
    - `downloadCv(cv: CvDoc, photoUrl?: string): Promise<void>` — blob → anchor download `${cv.name || "cv"}.pdf`, revokes URL.
  - Classic layout: centered name (16pt bold) + headline; one-line contact row (email · phone · location · link labels+urls); sections in `cv.sections` order via `visibleSections`; experience = `Row(role — company, formatRange)` + location meta + BulletList; education = Row(school, range) + degree/field meta; skills = one line per group "Name: a, b, c"; projects/certs/languages/awards/volunteer/interests/references rendered as compact rows; references honors `referencesOnRequest` ("References available on request."). No photo, no columns, accent used only for SectionTitle color/rule. `PageFooter` included.

- [ ] **Step 1: Write failing test `src/cv/__tests__/templates.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import path from "node:path";
import { renderCvBuffer } from "@/cv/pdf";
import { DEFAULT_SECTIONS, emptyCvContent, type CvDoc } from "@/cv/types";

const FONTS = path.resolve(__dirname, "../../../public/fonts");

export function sampleCv(templateId: CvDoc["templateId"]): CvDoc {
  return {
    id: "t", name: "Test", templateId, accent: "sky", showPhoto: false,
    createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z",
    sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
    content: {
      ...emptyCvContent(), fullName: "Jon Bautista", headline: "Product Designer",
      email: "jon@example.com", phone: "+63 900 000 0000", location: "Manila",
      links: [{ id: "l1", label: "Portfolio", url: "https://jon.design" }],
      summary: "Designer with 6 years of experience shipping web products.",
      experience: [{ id: "e1", role: "Product Designer", company: "Stripe", location: "Remote",
        startDate: "2024-07", bullets: ["Led checkout redesign", "Raised conversion 12%"] }],
      education: [{ id: "ed1", school: "UP Diliman", degree: "BS", field: "Computer Science",
        startDate: "2016-06", endDate: "2020-06" }],
      skills: [{ id: "s1", name: "Design", skills: ["Figma", "Prototyping"] }],
    },
  };
}

describe("classic template", () => {
  it("renders a non-trivial PDF buffer", async () => {
    const buf = await renderCvBuffer(sampleCv("classic"), FONTS);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(5000);
  });

  it("skips empty sections even when visible", async () => {
    const cv = sampleCv("classic");
    cv.content.projects = [];
    const withEmpty = await renderCvBuffer(cv, FONTS);
    expect(withEmpty.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
```

- [ ] **Step 2: Run to verify failure** — FAIL (no `@/cv/pdf`).

- [ ] **Step 3: Create `src/cv/templates/classic.tsx`** (complete component — Document/Page from `@react-pdf/renderer`, structure per the Interfaces block; ~120 lines; use `visibleSections`, `SectionTitle`, `Row`, `BulletList`, `PageFooter`, `formatRange`; contact line joins non-empty parts with " · "; links rendered as `Link` with `src` for real hyperlinks).

- [ ] **Step 4: Create `src/cv/pdf.ts`**

```ts
import { pdf, renderToBuffer } from "@react-pdf/renderer";
import { PALETTE } from "@/lib/palette";
import { registerCvFonts } from "./fonts";
import { getTemplate } from "./templates";
import type { CvDoc } from "./types";

function element(cv: CvDoc, photoUrl?: string) {
  const accent = PALETTE[cv.accent].hex;
  return getTemplate(cv.templateId).render({
    content: cv.content, sections: cv.sections, accent,
    photoUrl: cv.showPhoto ? photoUrl : undefined,
  });
}

export async function renderCvBlob(cv: CvDoc, photoUrl?: string): Promise<Blob> {
  registerCvFonts();
  return pdf(element(cv, photoUrl)).toBlob();
}

export async function renderCvBuffer(cv: CvDoc, fontBase: string, photoUrl?: string) {
  registerCvFonts(fontBase);
  return renderToBuffer(element(cv, photoUrl));
}

export async function downloadCv(cv: CvDoc, photoUrl?: string): Promise<void> {
  const blob = await renderCvBlob(cv, photoUrl);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cv.name.trim() || "cv"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 5: Run to verify pass** — `npm test` green (react-pdf runs in Node; if jsdom environment trips it, set `// @vitest-environment node` at the top of the template test file).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: classic ATS-safe cv template and pdf render pipeline"`

---

### Task 6: Modern template (two-column, photo + accent sidebar)

**Files:**
- Create: `src/cv/templates/modern.tsx`
- Modify: `src/cv/templates/index.ts` (register), Test: extend `src/cv/__tests__/templates.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 4–5 (`sampleCv` exported from the test file).
- Produces: `TEMPLATES` gains `{ id: "modern", name: "Modern", atsSafe: false, note: "Two-column layout with photo — great for human readers; some ATS parsers struggle with columns.", render: ModernTemplate }`.
- Layout: left sidebar 176pt wide, background `mixWithWhite(accent-as-given, …)` — the template receives the accent hex; compute the tint inline with the same `mixWithWhite` from `@/lib/palette` at 0.25 weight; sidebar holds (in order): photo (72pt circle, only when `photoUrl`), contact block, links, skills groups, languages. Main column: name (18pt bold) + headline, then remaining visible sections (summary, experience, education, projects, certifications, awards, volunteer, interests, references) in `cv.sections` order, skipping the sidebar-owned keys (`skills`, `languages`). `PageFooter` included.

- [ ] **Step 1: Failing test** (append):

```tsx
describe("modern template", () => {
  it("renders with and without photo", async () => {
    const buf = await renderCvBuffer(sampleCv("modern"), FONTS);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    const cv = sampleCv("modern");
    cv.showPhoto = true; // no photoUrl passed → template must not crash
    const buf2 = await renderCvBuffer(cv, FONTS);
    expect(buf2.length).toBeGreaterThan(5000);
  });
});
```

- [ ] **Step 2: Verify failure** → **Step 3: implement `modern.tsx`** (complete component; `Image` from react-pdf for the photo with `src={photoUrl}` guarded on truthiness) → **Step 4: verify pass** → **Step 5: Commit** `feat: modern two-column cv template`.

---

### Task 7: Elegant template (serif, understated)

**Files:**
- Create: `src/cv/templates/elegant.tsx`
- Modify: `src/cv/templates/index.ts` (register), Test: extend templates test.

**Interfaces:**
- Produces: `TEMPLATES` gains `{ id: "elegant", name: "Elegant", atsSafe: false, note: "Serif headings and generous whitespace — a quiet, premium read.", render: ElegantTemplate }`.
- Layout: single column; header row = name in Lora 20pt + headline italic, optional photo 56pt square top-right (`photoUrl` guard); hairline rule under header; `SectionTitle` with `serif` variant (small-caps feel via letterSpacing 1.2, Lora 700, color `#1a1a1a`, accent used only for the thin rule); body in Jakarta; entries like Classic but with more `marginTop`. `PageFooter` included.

- [ ] **Step 1: Failing test** (append):

```tsx
describe("elegant template", () => {
  it("renders and registry is complete", async () => {
    const buf = await renderCvBuffer(sampleCv("elegant"), FONTS);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    const { TEMPLATES } = await import("@/cv/templates");
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual(["classic", "elegant", "modern"]);
    expect(TEMPLATES.filter((t) => t.atsSafe).map((t) => t.id)).toEqual(["classic"]);
  });
});
```

- [ ] **Steps 2–5:** verify fail → implement `elegant.tsx` (complete component) → verify pass → commit `feat: elegant serif cv template`.

---

### Task 8: Form kit + shared content forms

**Files:**
- Create: `src/components/cv/form-kit.tsx`, `src/components/cv/content-forms/ContactForm.tsx`, `SummaryForm.tsx`, `ExperienceForm.tsx`, `EducationForm.tsx`, `SkillsForm.tsx`, `SimpleListForms.tsx`
- Test: `src/components/cv/__tests__/forms.test.tsx` (Testing Library)

**Interfaces:**
- Consumes: CV types, `newId`, Phase 1 `Button`, Lucide icons.
- Produces:
  - `form-kit.tsx`: `Field({ id, label, value, onCommit, type?, placeholder? })` — labeled input committing on blur (uncontrolled `defaultValue` keyed externally, matching the DetailPanel pattern); `Area({ id, label, value, onCommit, rows? })` — textarea variant; `EntryShell({ title, onRemove, onMoveUp?, onMoveDown?, children })` — bordered card with aria-labeled icon buttons; `BulletsEditor({ bullets, onChange })` — one textarea per bullet + add/remove.
  - Every content form has the SAME signature — this is the contract the two editor pages rely on:
    `({ content, onChange }: { content: CvContent; onChange: (patch: Partial<CvContent>) => void })`
  - `ContactForm` edits fullName/headline/email/phone/location/links (links = EntryShell list of label+url pairs). `SummaryForm` = one Area. `ExperienceForm` = EntryShell list (role, company, location, startDate/endDate as `type="month"` Fields, BulletsEditor) + "Add experience" button; move up/down reorders entries. `EducationForm`, `SkillsForm` (group name + comma-separated skills input parsed on commit) analogous. `SimpleListForms.tsx` exports `ProjectsForm`, `CertificationsForm`, `LanguagesForm`, `AwardsForm`, `VolunteerForm`, `InterestsForm` (single Area), `ReferencesForm` (entries + "available on request" checkbox) — all following the same EntryShell pattern.
  - `CONTENT_FORMS: Record<SectionKey, React.ComponentType<ContentFormProps>>` exported from `content-forms/index.ts` (create it) mapping every SectionKey to its form; `contact` is NOT a SectionKey — ContactForm is rendered separately by the pages.

- [ ] **Step 1: Write failing test `src/components/cv/__tests__/forms.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExperienceForm } from "@/components/cv/content-forms/ExperienceForm";
import { SkillsForm } from "@/components/cv/content-forms/SkillsForm";
import { emptyCvContent } from "@/cv/types";

describe("content forms", () => {
  it("adds an experience entry and commits a field on blur", () => {
    const onChange = vi.fn();
    render(<ExperienceForm content={emptyCvContent()} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add experience/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const patch = onChange.mock.calls[0][0];
    expect(patch.experience).toHaveLength(1);
  });

  it("parses comma-separated skills on commit", () => {
    const onChange = vi.fn();
    const content = { ...emptyCvContent(), skills: [{ id: "g1", name: "Design", skills: [] }] };
    render(<SkillsForm content={content} onChange={onChange} />);
    const input = screen.getByLabelText(/skills \(comma-separated\)/i);
    fireEvent.change(input, { target: { value: "Figma, Prototyping , User research" } });
    fireEvent.blur(input);
    const patch = onChange.mock.calls.at(-1)![0];
    expect(patch.skills[0].skills).toEqual(["Figma", "Prototyping", "User research"]);
  });
});
```

- [ ] **Step 2: Verify failure** → **Step 3: implement all files** (complete code; each form is small and pattern-repetitive; token classes reused from Phase 1: `rounded-xl border border-line px-3 py-2 text-sm` inputs, `mb-1 block text-[11px] font-semibold text-ink-2` labels) → **Step 4: `npm test` green, tsc clean** → **Step 5: Commit** `feat: cv form kit and shared content forms`.

---

### Task 9: CV library page (/cv) + New CV dialog + nav item

**Files:**
- Create: `src/components/cv/CvLibraryPage.tsx`, `src/components/cv/NewCvDialog.tsx`, `src/app/cv/page.tsx`
- Modify: `src/components/shell/Sidebar.tsx` (NAV gains `{ href: "/cv", label: "CV Builder", icon: FileText }` between Board and Reminders — MobileTabs updates automatically since it imports NAV)

**Interfaces:**
- Consumes: store (`cvdocs`, `profile`, `applications`, `createCv`, `duplicateCv`, `removeCv`, `updateCv`), `TEMPLATES`, `downloadCv`, `Dialog`, `Button`, `toast`, router.
- Produces: `/cv` route (metadata title "CV Builder — JobTrackr", description 120–160 chars). Library grid: each CvDoc card shows a mini style-mock (small div rendition per templateId — Classic: stacked gray lines; Modern: two-column with accent block; Elegant: serif "Aa" header lines — pure CSS, no PDF), name (inline-rename on blur), template name + ATS badge, linked application company (from `applications`), `relativeDays(updatedAt)`, and actions: Edit (→ `/cv/[id]`), Duplicate, Download (calls `downloadCv` with profile photo URL — create/revoke via `URL.createObjectURL(profile.photo)`), Delete (confirm Dialog). "New CV" black button → `NewCvDialog`: name input + 3 template cards (mini-mock + name + ATS badge + note, radio behavior `aria-pressed`) → `createCv` → router.push(`/cv/${cv.id}`). "Edit profile" secondary button → `/cv/profile`. Empty states: no profile yet → prompt card linking to profile editor; profile but no CVs → "Create your first CV".
- The route component must load the library via `next/dynamic` with `ssr: false` (react-pdf import chain stays client-only):

```tsx
// src/app/cv/page.tsx
import type { Metadata } from "next";
import { CvLibraryClient } from "@/components/cv/CvLibraryClient";
export const metadata: Metadata = { title: "CV Builder — JobTrackr", description: "Build tailored CVs from your master profile — three polished templates with live A4 preview and one-click PDF export." };
export default function Page() { return <CvLibraryClient />; }
```

```tsx
// src/components/cv/CvLibraryClient.tsx ("use client")
import dynamic from "next/dynamic";
export const CvLibraryClient = () => null; // replace: const Lib = dynamic(() => import("./CvLibraryPage").then(m => m.CvLibraryPage), { ssr: false, loading: () => <div className="p-8" aria-busy="true"><div className="h-6 w-40 animate-pulse rounded-full bg-sunken" /></div> }); return <Lib />;
```

(Write it as the real two-liner, not the stub comment.)

- [ ] **Step 1: Implement all files** (complete code per above).
- [ ] **Step 2: Verify with Chrome DevTools MCP** — dev server: sidebar shows CV Builder; `/cv` renders empty-state prompting profile; nav badge/mobile tabs still fine at 390px (5 tabs ≥44px); console clean; `npm run build` clean; `npm test` green.
- [ ] **Step 3: Commit** — `feat: cv library page, new-cv dialog, nav integration`

---

### Task 10: Profile editor (/cv/profile) with photo upload

**Files:**
- Create: `src/components/cv/ProfileEditorPage.tsx`, `src/components/cv/PhotoUpload.tsx`, `src/app/cv/profile/page.tsx` (+ `ProfileEditorClient.tsx` dynamic wrapper, same pattern as Task 9)

**Interfaces:**
- Consumes: store (`profile`, `saveProfile`, `setProfilePhoto`), `CONTENT_FORMS`, `ContactForm`, `SECTION_LABELS`, `Button`, `toast`.
- Produces: `/cv/profile` (metadata title "Profile — JobTrackr", unique description). Page = ContactForm + PhotoUpload at top, then every SectionKey's form in DEFAULT_SECTIONS order under `<section aria-label>` headings. All edits call `saveProfile({ ...profile.content, ...patch })` (autosave on commit, toast-free; a subtle "Saved" inline flash text with `aria-live="polite"` after each save). PhotoUpload: labeled file input (`accept="image/jpeg,image/png,image/webp"`), rejects >2 MB or wrong type with error toast, circular preview via object URL (revoked on change/unmount), Remove button; alt text "Profile photo preview".
- Back link to `/cv`.

- [ ] **Step 1: Implement** (complete code).
- [ ] **Step 2: Verify with Chrome DevTools MCP** — fill name/headline/summary, add an experience with 2 bullets, add a skill group; reload → persisted; upload a small PNG (generate one via `evaluate_script` canvas → File if no fixture is handy) → preview appears, persists after reload; oversize/wrong-type rejected with toast; console clean; build + tests green.
- [ ] **Step 3: Commit** — `feat: profile editor with photo upload`

---

### Task 11: CV editor (/cv/[id]) — section rail + content forms

**Files:**
- Create: `src/components/cv/CvEditorPage.tsx`, `src/components/cv/SectionRail.tsx`, `src/app/cv/[id]/page.tsx` (+ `CvEditorClient.tsx` dynamic wrapper receiving the route `id` param)

**Interfaces:**
- Consumes: store (`cvdocs`, `updateCv`, `updateCvContent`, `setCvSections`), `CONTENT_FORMS`, `ContactForm`, `SECTION_LABELS`, form kit.
- Produces: `/cv/[id]` two-pane layout (left 480px scrollable pane, right flexible preview pane — preview itself lands in Task 12; render a placeholder panel "Preview loads here" this task). Left pane: CV name inline edit (updateCv), ContactForm, then `SectionRail` — one row per `cv.sections` entry: visibility eye-toggle (`aria-pressed`, EyeOff icon when hidden), `SECTION_LABELS[key]`, up/down reorder buttons (disabled at ends, aria-labels) — wired to `setCvSections`; below the rail, the visible sections' forms in order (each wrapped in `<section aria-label>`), wired to `updateCvContent`. Unknown id → "CV not found" empty state with back link. Route file passes `params.id` (Next 16: `params` is a Promise — `const { id } = await params;` in the server component, pass down as prop).

- [ ] **Step 1: Implement** (complete code).
- [ ] **Step 2: Verify with Chrome DevTools MCP** — from /cv create a CV (after Task 10's profile exists) → editor opens prefilled; hide a section → it disappears from the form list; reorder sections with arrows; edit a bullet → persists after reload; console clean; build/tests green.
- [ ] **Step 3: Commit** — `feat: cv editor with section rail and content forms`

---

### Task 12: Live PDF preview + toolbar (template switch, accent, photo, link, download)

**Files:**
- Create: `src/components/cv/CvPreview.tsx`, `src/components/cv/CvToolbar.tsx`
- Modify: `src/components/cv/CvEditorPage.tsx` (mount both, drop placeholder)

**Interfaces:**
- Consumes: `renderCvBlob`, `downloadCv`, `TEMPLATES`, `ColorPicker` (with `excludeRef`), store (`profile`, `applications`, `updateCv`), `Button`, `toast`, Motion.
- Produces:
  - `CvPreview({ cv, photoUrl })`: debounced (500ms) effect → `renderCvBlob` → object URL → `<iframe title="CV preview (PDF)" className="h-full w-full rounded-2xl border border-line-2 bg-white">`; revokes previous URL; wrapped in an error boundary (class component `PreviewErrorBoundary` with retry button + message "Preview failed to render — your data is safe."); subtle "Rendering…" overlay with `aria-live="polite"` while regenerating; `useTransition` so typing stays responsive.
  - `CvToolbar({ cv })`: template switcher (3 mini-mock buttons, `aria-pressed`, switching calls `updateCv(id, { templateId })` and — when switching TO classic — leaves `showPhoto` untouched since Classic ignores it); accent dot → `ColorPicker` with excludeRef; photo toggle (`aria-pressed`, disabled with a title note on classic); link-to-application `<select>` (options = applications sorted by company, value "" = unlinked) → `updateCv(id, { applicationId: v || undefined })`; **Download PDF** black button → `downloadCv(cv, photoUrl)` with success toast.
  - photoUrl derivation lives in CvEditorPage: `useMemo` object URL from `profile?.photo` (revoked on unmount/photo change), passed to both.

- [ ] **Step 1: Implement** (complete code).
- [ ] **Step 2: Verify with Chrome DevTools MCP** — preview iframe shows the actual PDF and updates ~0.5s after edits; switching templates re-renders visibly differently (screenshot each of the 3); accent change recolors headings; photo toggle affects Modern/Elegant only; linking an application persists and shows on the library card; Download produces a .pdf (verify a download event / no console errors); reduced-motion emulation: no spinner animation issues; console clean; build/tests green.
- [ ] **Step 3: Commit** — `feat: live pdf preview and cv toolbar`

---

### Task 13: Tracker integration — Documents section in detail panel + card doc count

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx` (Documents section), `src/components/board/JobCard.tsx` + `src/components/board/BoardPage.tsx` (doc count), `src/components/board/Column.tsx` (pass-through prop)

**Interfaces:**
- Consumes: store `cvdocs`, `updateCv`; router.
- Produces:
  - DetailPanel gains a "Documents" section (between Interviews and Notes): lists CVs where `applicationId === app.id` — name + template name, "Open" (router.push `/cv/${id}`), "Unlink" (aria-labeled X → `updateCv(id, { applicationId: undefined })`); plus a `<select>` "Attach a CV…" listing unlinked cvdocs → `updateCv(cvId, { applicationId: app.id })`; empty state "No documents linked yet."
  - JobCard footer count: new optional prop `docCount?: number`; renders a `FileText` icon + count when > 0 (alongside the existing note count). BoardPage builds `docCountByApp` from `cvdocs` and threads it through Column → JobCard (extend `ColumnProps` and `JobCardProps`).

- [ ] **Step 1: Implement** (complete code for each modified block).
- [ ] **Step 2: Verify with Chrome DevTools MCP** — link a CV to the Stripe app via the editor toolbar; open Stripe's detail panel → Documents lists it; unlink → gone; re-attach via the panel select; board card shows the doc badge; console clean; build/tests green.
- [ ] **Step 3: Commit** — `feat: cv documents in application detail and board doc counts`

---

### Task 14: E2E extension, sweep, README

**Files:**
- Modify: `e2e/smoke.spec.ts`, `README.md`

**Interfaces:**
- Produces: e2e covers the CV happy path; README mentions the CV builder; all gates green.

- [ ] **Step 1: Append to `e2e/smoke.spec.ts`:**

```ts
test("cv builder: profile → new cv → pdf download", async ({ page }) => {
  await page.goto("/cv/profile");
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Full name").blur();
  await page.goto("/cv");
  await page.getByRole("button", { name: "New CV" }).click();
  await page.getByLabel("CV name").fill("Smoke CV");
  await page.getByRole("button", { name: /^Classic/ }).click();
  await page.getByRole("button", { name: "Create CV" }).click();
  await expect(page).toHaveURL(/\/cv\//);
  await expect(page.getByTitle("CV preview (PDF)")).toBeVisible({ timeout: 15000 });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Smoke CV.pdf");
});
```

(Adapt selectors to the real DOM as built — the scenario is the contract.)

- [ ] **Step 2: Manual sweep with Chrome DevTools MCP** — keyboard-only pass across /cv, /cv/profile, /cv/[id] (all reorder/toggle/upload controls reachable, dialogs escapable); axe scan on the three new routes (fix small findings, report structural); 390px check (5 mobile tabs ≥44px, editor panes stack vertically); reduced motion; per-route titles/descriptions present.
- [ ] **Step 3: Update README** — feature list gains "CV builder: master profile, tailored versions, 3 templates, live A4 preview, client-side PDF export"; Roadmap drops Phase 2.
- [ ] **Step 4: All gates** — `npm run lint`, `npm test`, `npm run build`, `npm run e2e` all clean/green.
- [ ] **Step 5: Commit** — `test: cv builder e2e, a11y sweep, README update`

---

## Plan Self-Review (completed)

- **Spec coverage:** §3 data model → T1/T2; export v2 → T3; §5 templates + fonts + registry + ATS badges → T4–T7; §4 pages (/cv, /cv/profile, /cv/[id]) → T9–T12; shared content forms → T8; §6 pipeline (debounce, error boundary, download) → T12; tracker integration (Documents, doc count) → T13; dynamic import/bundle isolation → T9–T11 wrappers; §7 quality bar → per-task DevTools steps + T14; mobile 5-tab constraint → T9 + T14 sweep.
- **Known simplifications vs spec (accepted):** library thumbnails are CSS style-mocks not PDF renders (spec sanctioned); photo lives only on Profile (spec sanctioned); Web Worker rendering deferred (spec's stated escape hatch).
- **Type consistency:** `CvTemplate.render(TemplateProps)` uniform T4–T7/T12; content-form signature `{ content, onChange(patch) }` uniform T8/T10/T11; store action names (`createCv/duplicateCv/updateCv/updateCvContent/setCvSections/removeCv/saveProfile/setProfilePhoto`) consistent T2 producers → T9–T13 consumers; `toJson` async change propagated to store + SettingsPage in T3.


