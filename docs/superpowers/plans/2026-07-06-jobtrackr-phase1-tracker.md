# JobTrackr Phase 1 (Tracker) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete JobTrackr Phase 1 tracker — kanban board with pastel columns and drag-and-drop, application detail panel, dashboard, reminders, and settings — as a local-first Next.js app per the approved spec (`docs/superpowers/specs/2026-07-06-jobtrackr-phase1-tracker-design.md`).

**Architecture:** Next.js App Router SPA-style app (all pages `"use client"` where interactive), Zustand store as runtime source of truth hydrated from IndexedDB via Dexie through a thin repository layer. Pure logic (ordering, selectors, parsing, import/export) lives in `src/lib` as testable functions; UI composes them. Semantic color tokens in CSS custom properties for future dark mode.

**Tech Stack:** Next.js 16 + TypeScript, Tailwind CSS 4, Zustand, Dexie 4, dnd-kit, Motion (framer-motion successor), Lucide icons, cmdk, canvas-confetti, Recharts, Zod, Vitest + fake-indexeddb, Playwright.

## Global Constraints

- Fonts: **Plus Jakarta Sans only**, via `next/font`, `--font-jakarta` variable. Type scale: 11/12/14/16/19/24/32px. Spacing on a 4px grid.
- Colors ONLY via semantic tokens defined in `globals.css` `@theme` (`bg-canvas`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-line`, etc.) or computed column tints from `columnTints()`. No ad-hoc hex in components (exceptions: the palette definition itself, chart fills derived from tokens).
- Buttons: primary = black pill (`bg-ink text-white`), secondary = white pill with `border-line`. Card radius 14–18px (`rounded-2xl`), pills fully rounded.
- Column pastel palette is the fixed 10-color set in `src/lib/palette.ts` — users never enter freeform colors.
- Tags render as **white pills** with hairline border, never tinted.
- Every animation gated by `prefers-reduced-motion` (global CSS kill-switch is in Task 1; JS effects like confetti must also check `matchMedia`).
- WCAG 2.1 AA: focus-visible rings everywhere, real `<button>`/`<a>`, labels on all inputs, `aria-label` on icon-only buttons, 44px min touch targets on mobile, text contrast ≥ 4.5:1 (use `text-ink-3` `#6B6B6B` as the lightest body-text color).
- All entity dates are ISO-8601 strings. IDs from `crypto.randomUUID()`.
- Commit after every task (message style: `feat: …` / `test: …` / `chore: …`).
- App name/branding: **JobTrackr**. `<html lang="en">`.

## File Structure

```
src/
  app/layout.tsx            — root layout: font, tokens, shell, skip link, metadata
  app/globals.css           — Tailwind 4 @theme tokens + resets
  app/page.tsx              — Board (default route)
  app/dashboard/page.tsx    — Dashboard
  app/reminders/page.tsx    — Reminders
  app/settings/page.tsx     — Settings
  lib/types.ts              — all entity + Snapshot + Filters types
  lib/id.ts                 — newId()
  lib/palette.ts            — 10 pastels, mixWithWhite, columnTints
  lib/db.ts                 — Dexie schema
  lib/repo.ts               — loadAll/put*/delete*/clearAll/importSnapshot
  lib/seed.ts               — defaults + demo data, seedIfEmpty, clearDemoData
  lib/ordering.ts           — moveCard, reorderStages (pure)
  lib/selectors.ts          — nudges, due reminders, filters, metrics (pure)
  lib/quickadd.ts           — parseQuickAdd (pure)
  lib/exportio.ts           — toJson/fromJson/toCsv (pure)
  lib/store.ts              — Zustand store, hydrate + write-through actions
  lib/format.ts             — date/salary display helpers
  components/ui/Button.tsx, TagPill.tsx, Dialog.tsx, Toast.tsx
  components/shell/Sidebar.tsx, Topbar.tsx, MobileTabs.tsx, AppShell.tsx
  components/board/BoardPage.tsx, Column.tsx, JobCard.tsx, ColorPicker.tsx,
                   ColumnMenu.tsx, AddJobDialog.tsx, FiltersPopover.tsx, CommandK.tsx
  components/detail/DetailPanel.tsx
  components/dashboard/DashboardPage.tsx
  components/reminders/RemindersPage.tsx
  components/settings/SettingsPage.tsx
src/lib/__tests__/*.test.ts — Vitest unit tests (colocated per module)
e2e/smoke.spec.ts           — Playwright smoke test
```

---

### Task 1: Scaffold Next.js app, design tokens, fonts, test infra

**Files:**
- Create: entire Next.js scaffold, `src/app/globals.css`, `src/app/layout.tsx`, `vitest.config.ts`
- Modify: `package.json` (scripts), `.gitignore` (keep ours)

**Interfaces:**
- Produces: token utility classes (`bg-canvas`, `bg-surface`, `bg-sunken`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-line`, `border-line-2`, `text-danger`, `text-success`, `bg-warn-bg`, `border-warn-line`, `text-warn`), font var `--font-jakarta`, `npm test` (vitest), `npm run dev`.

- [ ] **Step 1: Scaffold into temp dir and merge** (directory isn't empty, create-next-app refuses)

```bash
cd /Users/jonathanbautista/Documents/Work/AI/jobtrackr
npx create-next-app@latest jobtrackr-tmp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
rsync -a jobtrackr-tmp/ ./ --exclude .git --exclude .gitignore --exclude README.md
rm -rf jobtrackr-tmp
```

- [ ] **Step 2: Install dependencies**

```bash
npm i dexie zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities motion lucide-react canvas-confetti recharts zod cmdk
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event fake-indexeddb @types/canvas-confetti @playwright/test
```

- [ ] **Step 3: Replace `src/app/globals.css`** with tokens:

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-jakarta), ui-sans-serif, system-ui, sans-serif;
  --color-canvas: #fdfdfd;
  --color-surface: #ffffff;
  --color-sunken: #f5f5f5;
  --color-ink: #1a1a1a;
  --color-ink-2: #595959;
  --color-ink-3: #6b6b6b;
  --color-line: #e5e5e5;
  --color-line-2: #f0f0f0;
  --color-danger: #c4544f;
  --color-danger-bg: #fdecec;
  --color-success: #3e7a50;
  --color-success-bg: #eef7f0;
  --color-warn: #8a6d2b;
  --color-warn-bg: #fff7e8;
  --color-warn-line: #f5e5c0;
}

:root { color-scheme: light; }
/* dark mode later: [data-theme="dark"] { redefine the same tokens } */

body { background: var(--color-canvas); color: var(--color-ink); -webkit-font-smoothing: antialiased; }

:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; border-radius: 4px; }

.skip-link { position: absolute; left: -9999px; top: 8px; z-index: 100; }
.skip-link:focus { left: 8px; background: var(--color-ink); color: #fff; padding: 8px 16px; border-radius: 9999px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JobTrackr — Track every job application",
  description:
    "A beautiful job hunt tracker: kanban pipeline, follow-up reminders, and insights that help you land the offer.",
  openGraph: {
    title: "JobTrackr — Track every job application",
    description:
      "A beautiful job hunt tracker: kanban pipeline, follow-up reminders, and insights.",
    type: "website",
    url: "https://jobtrackr.app",
  },
  twitter: { card: "summary_large_image", title: "JobTrackr" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans`}>
        <a href="#main" className="skip-link">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Create `vitest.config.ts`** and add scripts

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

In `package.json` scripts add: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 6: Verify** — `npm run dev` serves a page at localhost:3000 with no console errors; `npm test` reports "no test files found" exit 0 (or passes trivially); `npm run build` succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with design tokens, fonts, and test infra"
```

---

### Task 2: Types, IDs, and pastel palette with tint derivation

**Files:**
- Create: `src/lib/types.ts`, `src/lib/id.ts`, `src/lib/palette.ts`
- Test: `src/lib/__tests__/palette.test.ts`

**Interfaces:**
- Produces:
  - All types below (exact names/fields — later tasks import these verbatim).
  - `newId(): string`
  - `PALETTE: Record<PaletteKey, { name: string; hex: string }>`, `PALETTE_KEYS: PaletteKey[]`
  - `mixWithWhite(hex: string, weight: number): string` (weight = fraction of the color, 0 → white, 1 → the color; returns lowercase `#rrggbb`)
  - `columnTints(key: PaletteKey): { dot: string; cardBg: string; cardBorder: string; headerTint: string }`

- [ ] **Step 1: Create `src/lib/types.ts`** (complete file):

```ts
export type PaletteKey =
  | "pink" | "peach" | "yellow" | "mint" | "sky"
  | "lavender" | "orchid" | "gray" | "sage" | "blush";

export type StageKind = "pipeline" | "won" | "lost";

export interface Stage {
  id: string;
  name: string;
  color: PaletteKey;
  order: number;
  kind: StageKind;
}

export type WorkMode = "remote" | "hybrid" | "onsite";

export interface Application {
  id: string;
  company: string;
  role: string;
  location?: string;
  workMode?: WorkMode;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  url?: string;
  source?: string;
  jdSnapshot?: string;
  tagIds: string[];
  stageId: string;
  order: number;
  appliedAt?: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export interface Tag { id: string; name: string; preset: boolean; }

export type InterviewRound = "phone" | "technical" | "panel" | "final" | "other";

export interface Interview {
  id: string;
  applicationId: string;
  roundType: InterviewRound;
  scheduledAt: string;
  locationOrLink?: string;
  notes?: string;
}

export interface Contact {
  id: string;
  applicationId: string;
  name: string;
  role?: string;
  email?: string;
  linkedin?: string;
}

export type ActivityKind = "created" | "stage_move" | "edit" | "note" | "manual";

export interface ActivityEvent {
  id: string;
  applicationId: string;
  kind: ActivityKind;
  message: string;
  at: string;
}

export interface NoteDoc {
  id: string;
  applicationId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type ReminderType = "follow_up" | "interview" | "custom";

export interface Reminder {
  id: string;
  applicationId?: string;
  type: ReminderType;
  title: string;
  dueAt: string;
  done: boolean;
  snoozedUntil?: string;
}

export interface SettingsDoc {
  id: "singleton";
  nudgeDays: number;
  currency: string;
  theme: "light";
  demo: boolean;
}

export interface Snapshot {
  stages: Stage[];
  applications: Application[];
  tags: Tag[];
  interviews: Interview[];
  contacts: Contact[];
  events: ActivityEvent[];
  notes: NoteDoc[];
  reminders: Reminder[];
  settings: SettingsDoc;
}

export interface Filters {
  search: string;
  tagIds: string[];
  sources: string[];
  hasSalary: boolean | null;
}

export const EMPTY_FILTERS: Filters = { search: "", tagIds: [], sources: [], hasSalary: null };
```

- [ ] **Step 2: Create `src/lib/id.ts`**

```ts
export function newId(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 3: Write failing test `src/lib/__tests__/palette.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { PALETTE, PALETTE_KEYS, mixWithWhite, columnTints } from "@/lib/palette";

describe("palette", () => {
  it("has exactly 10 pastel colors", () => {
    expect(PALETTE_KEYS).toHaveLength(10);
    for (const key of PALETTE_KEYS) {
      expect(PALETTE[key].hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("mixWithWhite(hex, 1) returns the color, (hex, 0) returns white", () => {
    expect(mixWithWhite("#f4b8c1", 1)).toBe("#f4b8c1");
    expect(mixWithWhite("#f4b8c1", 0)).toBe("#ffffff");
  });

  it("mixWithWhite blends channels linearly toward white", () => {
    expect(mixWithWhite("#000000", 0.5)).toBe("#808080");
  });

  it("columnTints derives dot, cardBg, cardBorder, headerTint from the pastel", () => {
    const t = columnTints("pink");
    expect(t.dot).toBe("#f4b8c1");
    expect(t.cardBg).toBe(mixWithWhite("#f4b8c1", 0.08));
    expect(t.cardBorder).toBe(mixWithWhite("#f4b8c1", 0.3));
    expect(t.headerTint).toBe(mixWithWhite("#f4b8c1", 0.15));
  });
});
```

- [ ] **Step 4: Run to verify failure** — `npm test` → FAIL (cannot resolve `@/lib/palette`).

- [ ] **Step 5: Create `src/lib/palette.ts`**

```ts
import type { PaletteKey } from "./types";

export const PALETTE: Record<PaletteKey, { name: string; hex: string }> = {
  pink: { name: "Pink", hex: "#f4b8c1" },
  peach: { name: "Peach", hex: "#f5c9a8" },
  yellow: { name: "Yellow", hex: "#f0d97a" },
  mint: { name: "Mint", hex: "#b5dfc0" },
  sky: { name: "Sky", hex: "#a8d8e8" },
  lavender: { name: "Lavender", hex: "#c9bcf2" },
  orchid: { name: "Orchid", hex: "#e8bce0" },
  gray: { name: "Gray", hex: "#d8d8d8" },
  sage: { name: "Sage", hex: "#dce3b8" },
  blush: { name: "Blush", hex: "#f2c4c4" },
};

export const PALETTE_KEYS = Object.keys(PALETTE) as PaletteKey[];

/** weight: fraction of the color kept; 0 = white, 1 = the color itself */
export function mixWithWhite(hex: string, weight: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(255 + (c - 255) * weight);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function columnTints(key: PaletteKey) {
  const hex = PALETTE[key].hex;
  return {
    dot: hex,
    cardBg: mixWithWhite(hex, 0.08),
    cardBorder: mixWithWhite(hex, 0.3),
    headerTint: mixWithWhite(hex, 0.15),
  };
}
```

- [ ] **Step 6: Run to verify pass** — `npm test` → 4 tests PASS.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: entity types, id helper, pastel palette with tint derivation"`

---

### Task 3: Dexie database + repository layer

**Files:**
- Create: `src/lib/db.ts`, `src/lib/repo.ts`
- Test: `src/lib/__tests__/repo.test.ts`

**Interfaces:**
- Consumes: all types from Task 2.
- Produces:
  - `db` — Dexie instance with tables `stages, applications, tags, interviews, contacts, events, notes, reminders, settings`.
  - `loadAll(): Promise<Snapshot>` (arrays sorted: stages by `order`, applications by `order`, events by `at` desc; `settings` falls back to `DEFAULT_SETTINGS` if missing).
  - `DEFAULT_SETTINGS: SettingsDoc` = `{ id: "singleton", nudgeDays: 7, currency: "USD", theme: "light", demo: false }`.
  - `putStage/putApplication/putTag/putInterview/putContact/putEvent/putNote/putReminder(x): Promise<void>`, `putApplications(xs: Application[]): Promise<void>`, `putStages(xs: Stage[]): Promise<void>`, `putSettings(s: SettingsDoc): Promise<void>`.
  - `deleteStage/deleteApplication/deleteTag/deleteInterview/deleteContact/deleteNote/deleteReminder(id: string): Promise<void>` — `deleteApplication` cascades (interviews, contacts, events, notes, reminders of that app).
  - `clearAll(): Promise<void>`, `importSnapshot(snap: Snapshot, mode: "replace" | "merge"): Promise<void>` (merge = upsert by id; replace = clearAll then insert).

- [ ] **Step 1: Write failing test `src/lib/__tests__/repo.test.ts`** (fake-indexeddb import MUST be first):

```ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import {
  loadAll, putStage, putApplication, putInterview, deleteApplication,
  clearAll, importSnapshot, DEFAULT_SETTINGS,
} from "@/lib/repo";
import type { Application, Snapshot, Stage } from "@/lib/types";

const stage = (o: Partial<Stage> = {}): Stage =>
  ({ id: "s1", name: "Applied", color: "pink", order: 0, kind: "pipeline", ...o });

const app = (o: Partial<Application> = {}): Application => ({
  id: "a1", company: "Stripe", role: "Designer", tagIds: [], stageId: "s1",
  order: 0, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z", ...o,
});

beforeEach(async () => { await clearAll(); });

describe("repo", () => {
  it("loadAll returns empty snapshot with default settings on fresh db", async () => {
    const snap = await loadAll();
    expect(snap.applications).toEqual([]);
    expect(snap.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips entities and sorts stages/applications by order", async () => {
    await putStage(stage({ id: "s2", order: 1, name: "Interview" }));
    await putStage(stage());
    await putApplication(app({ id: "a2", order: 1 }));
    await putApplication(app());
    const snap = await loadAll();
    expect(snap.stages.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(snap.applications.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("deleteApplication cascades to child records", async () => {
    await putApplication(app());
    await putInterview({ id: "i1", applicationId: "a1", roundType: "phone", scheduledAt: "2026-07-08T10:00:00.000Z" });
    await deleteApplication("a1");
    const snap = await loadAll();
    expect(snap.interviews).toEqual([]);
  });

  it("importSnapshot replace mode swaps all data", async () => {
    await putApplication(app());
    const incoming: Snapshot = {
      stages: [stage({ id: "sx" })], applications: [app({ id: "ax", stageId: "sx" })],
      tags: [], interviews: [], contacts: [], events: [], notes: [], reminders: [],
      settings: { ...DEFAULT_SETTINGS, nudgeDays: 10 },
    };
    await importSnapshot(incoming, "replace");
    const snap = await loadAll();
    expect(snap.applications.map((a) => a.id)).toEqual(["ax"]);
    expect(snap.settings.nudgeDays).toBe(10);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL (no `@/lib/db`).

- [ ] **Step 3: Create `src/lib/db.ts`**

```ts
import Dexie, { type EntityTable } from "dexie";
import type {
  Stage, Application, Tag, Interview, Contact,
  ActivityEvent, NoteDoc, Reminder, SettingsDoc,
} from "./types";

export const db = new Dexie("jobtrackr") as Dexie & {
  stages: EntityTable<Stage, "id">;
  applications: EntityTable<Application, "id">;
  tags: EntityTable<Tag, "id">;
  interviews: EntityTable<Interview, "id">;
  contacts: EntityTable<Contact, "id">;
  events: EntityTable<ActivityEvent, "id">;
  notes: EntityTable<NoteDoc, "id">;
  reminders: EntityTable<Reminder, "id">;
  settings: EntityTable<SettingsDoc, "id">;
};

db.version(1).stores({
  stages: "id, order",
  applications: "id, stageId, updatedAt",
  tags: "id",
  interviews: "id, applicationId, scheduledAt",
  contacts: "id, applicationId",
  events: "id, applicationId, at",
  notes: "id, applicationId",
  reminders: "id, dueAt, done",
  settings: "id",
});
```

- [ ] **Step 4: Create `src/lib/repo.ts`**

```ts
import { db } from "./db";
import type {
  Stage, Application, Tag, Interview, Contact,
  ActivityEvent, NoteDoc, Reminder, SettingsDoc, Snapshot,
} from "./types";

export const DEFAULT_SETTINGS: SettingsDoc = {
  id: "singleton", nudgeDays: 7, currency: "USD", theme: "light", demo: false,
};

const ALL_TABLES = [
  db.stages, db.applications, db.tags, db.interviews, db.contacts,
  db.events, db.notes, db.reminders, db.settings,
];

export async function loadAll(): Promise<Snapshot> {
  const [stages, applications, tags, interviews, contacts, events, notes, reminders, settings] =
    await Promise.all([
      db.stages.orderBy("order").toArray(),
      db.applications.orderBy("order").toArray(),
      db.tags.toArray(),
      db.interviews.toArray(),
      db.contacts.toArray(),
      db.events.orderBy("at").reverse().toArray(),
      db.notes.toArray(),
      db.reminders.toArray(),
      db.settings.get("singleton"),
    ]);
  return { stages, applications, tags, interviews, contacts, events, notes, reminders,
    settings: settings ?? DEFAULT_SETTINGS };
}

export const putStage = (x: Stage) => db.stages.put(x).then(() => {});
export const putStages = (xs: Stage[]) => db.stages.bulkPut(xs).then(() => {});
export const putApplication = (x: Application) => db.applications.put(x).then(() => {});
export const putApplications = (xs: Application[]) => db.applications.bulkPut(xs).then(() => {});
export const putTag = (x: Tag) => db.tags.put(x).then(() => {});
export const putInterview = (x: Interview) => db.interviews.put(x).then(() => {});
export const putContact = (x: Contact) => db.contacts.put(x).then(() => {});
export const putEvent = (x: ActivityEvent) => db.events.put(x).then(() => {});
export const putNote = (x: NoteDoc) => db.notes.put(x).then(() => {});
export const putReminder = (x: Reminder) => db.reminders.put(x).then(() => {});
export const putSettings = (x: SettingsDoc) => db.settings.put(x).then(() => {});

export const deleteStage = (id: string) => db.stages.delete(id);
export const deleteTag = (id: string) => db.tags.delete(id);
export const deleteInterview = (id: string) => db.interviews.delete(id);
export const deleteContact = (id: string) => db.contacts.delete(id);
export const deleteNote = (id: string) => db.notes.delete(id);
export const deleteReminder = (id: string) => db.reminders.delete(id);

export async function deleteApplication(id: string): Promise<void> {
  await db.transaction("rw", ALL_TABLES, async () => {
    await db.applications.delete(id);
    for (const t of [db.interviews, db.contacts, db.events, db.notes] as const) {
      await t.where("applicationId").equals(id).delete();
    }
    await db.reminders.filter((r) => r.applicationId === id).delete();
  });
}

export async function clearAll(): Promise<void> {
  await db.transaction("rw", ALL_TABLES, async () => {
    for (const t of ALL_TABLES) await t.clear();
  });
}

export async function importSnapshot(snap: Snapshot, mode: "replace" | "merge"): Promise<void> {
  await db.transaction("rw", ALL_TABLES, async () => {
    if (mode === "replace") for (const t of ALL_TABLES) await t.clear();
    await db.stages.bulkPut(snap.stages);
    await db.applications.bulkPut(snap.applications);
    await db.tags.bulkPut(snap.tags);
    await db.interviews.bulkPut(snap.interviews);
    await db.contacts.bulkPut(snap.contacts);
    await db.events.bulkPut(snap.events);
    await db.notes.bulkPut(snap.notes);
    await db.reminders.bulkPut(snap.reminders);
    await db.settings.put(snap.settings);
  });
}
```

- [ ] **Step 5: Run to verify pass** — `npm test` → repo tests PASS.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: dexie schema and repository layer with cascade delete and import"`

---

### Task 4: Seed module (defaults + demo data)

**Files:**
- Create: `src/lib/seed.ts`
- Test: `src/lib/__tests__/seed.test.ts`

**Interfaces:**
- Consumes: repo (Task 3), palette keys, types.
- Produces:
  - `DEFAULT_STAGES: Stage[]` — Saved(lavender,0,pipeline), Applied(pink,1,pipeline), Interview(yellow,2,pipeline), Offer(mint,3,won), Rejected(gray,4,lost); ids `stage-saved`, `stage-applied`, `stage-interview`, `stage-offer`, `stage-rejected`.
  - `PRESET_TAGS: Tag[]` — Dream job, High priority, Low priority, Remote, Referral, Onsite; ids `tag-dream`, `tag-high`, `tag-low`, `tag-remote`, `tag-referral`, `tag-onsite`; `preset: true`.
  - `seedIfEmpty(now?: Date): Promise<boolean>` — returns true if it seeded (fresh db); seeds stages, preset tags, settings with `demo: true`, ~6 demo applications (ids prefixed `demo-`) spread across stages with tags, 1 interview, 1 follow-up reminder, activity events.
  - `clearDemoData(): Promise<void>` — deletes every application whose id starts with `demo-` (cascade) and sets `settings.demo = false`.

- [ ] **Step 1: Write failing test `src/lib/__tests__/seed.test.ts`**

```ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll, loadAll } from "@/lib/repo";
import { seedIfEmpty, clearDemoData, DEFAULT_STAGES, PRESET_TAGS } from "@/lib/seed";

beforeEach(async () => { await clearAll(); });

describe("seed", () => {
  it("seeds a fresh db with stages, preset tags, and demo apps", async () => {
    const seeded = await seedIfEmpty();
    expect(seeded).toBe(true);
    const snap = await loadAll();
    expect(snap.stages).toHaveLength(DEFAULT_STAGES.length);
    expect(snap.tags).toHaveLength(PRESET_TAGS.length);
    expect(snap.applications.length).toBeGreaterThanOrEqual(5);
    expect(snap.settings.demo).toBe(true);
  });

  it("is idempotent — second call does nothing", async () => {
    await seedIfEmpty();
    const seeded = await seedIfEmpty();
    expect(seeded).toBe(false);
  });

  it("clearDemoData removes demo apps and their children but keeps stages", async () => {
    await seedIfEmpty();
    await clearDemoData();
    const snap = await loadAll();
    expect(snap.applications).toEqual([]);
    expect(snap.interviews).toEqual([]);
    expect(snap.stages).toHaveLength(DEFAULT_STAGES.length);
    expect(snap.settings.demo).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL (no `@/lib/seed`).

- [ ] **Step 3: Create `src/lib/seed.ts`**

```ts
import { db } from "./db";
import {
  DEFAULT_SETTINGS, deleteApplication, importSnapshot, loadAll, putSettings,
} from "./repo";
import type { Application, Stage, Tag, Snapshot } from "./types";

export const DEFAULT_STAGES: Stage[] = [
  { id: "stage-saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline" },
  { id: "stage-applied", name: "Applied", color: "pink", order: 1, kind: "pipeline" },
  { id: "stage-interview", name: "Interview", color: "yellow", order: 2, kind: "pipeline" },
  { id: "stage-offer", name: "Offer", color: "mint", order: 3, kind: "won" },
  { id: "stage-rejected", name: "Rejected", color: "gray", order: 4, kind: "lost" },
];

export const PRESET_TAGS: Tag[] = [
  { id: "tag-dream", name: "Dream job", preset: true },
  { id: "tag-high", name: "High priority", preset: true },
  { id: "tag-low", name: "Low priority", preset: true },
  { id: "tag-remote", name: "Remote", preset: true },
  { id: "tag-referral", name: "Referral", preset: true },
  { id: "tag-onsite", name: "Onsite", preset: true },
];

const daysAgo = (now: Date, n: number) =>
  new Date(now.getTime() - n * 86_400_000).toISOString();
const daysAhead = (now: Date, n: number) =>
  new Date(now.getTime() + n * 86_400_000).toISOString();

function demoApp(
  now: Date, id: string, company: string, role: string, stageId: string,
  order: number, extra: Partial<Application> = {},
): Application {
  return {
    id: `demo-${id}`, company, role, tagIds: [], stageId, order,
    createdAt: daysAgo(now, 14), updatedAt: daysAgo(now, 2), ...extra,
  };
}

export async function seedIfEmpty(now: Date = new Date()): Promise<boolean> {
  const count = await db.stages.count();
  if (count > 0) return false;

  const applications: Application[] = [
    demoApp(now, "vercel", "Vercel", "UX Engineer", "stage-saved", 0,
      { location: "Remote", workMode: "remote", tagIds: ["tag-remote"], jdSnapshot: "Vercel is looking for a UX Engineer to craft polished product surfaces…" }),
    demoApp(now, "framer", "Framer", "Design Engineer", "stage-saved", 1, { location: "Amsterdam" }),
    demoApp(now, "stripe", "Stripe", "Product Designer", "stage-applied", 0,
      { location: "Remote", workMode: "remote", salaryMin: 120000, salaryMax: 140000, currency: "USD", source: "LinkedIn", tagIds: ["tag-dream"], appliedAt: daysAgo(now, 8) }),
    demoApp(now, "linear", "Linear", "Frontend Engineer", "stage-applied", 1,
      { location: "Hybrid · SF", workMode: "hybrid", source: "Referral", tagIds: ["tag-referral"], appliedAt: daysAgo(now, 9), updatedAt: daysAgo(now, 9) }),
    demoApp(now, "canva", "Canva", "Software Engineer", "stage-interview", 0,
      { location: "Manila", workMode: "onsite", source: "JobStreet", tagIds: ["tag-high"], appliedAt: daysAgo(now, 12) }),
    demoApp(now, "shopify", "Shopify", "Web Developer", "stage-offer", 0,
      { location: "Remote", workMode: "remote", salaryMin: 135000, currency: "USD", tagIds: ["tag-dream"], appliedAt: daysAgo(now, 20) }),
    demoApp(now, "grab", "Grab", "iOS Developer", "stage-rejected", 0,
      { location: "Singapore", appliedAt: daysAgo(now, 25) }),
  ];

  const snap: Snapshot = {
    stages: DEFAULT_STAGES,
    tags: PRESET_TAGS,
    applications,
    interviews: [{
      id: "demo-int-1", applicationId: "demo-canva", roundType: "technical",
      scheduledAt: daysAhead(now, 3), locationOrLink: "Google Meet",
    }],
    contacts: [{
      id: "demo-contact-1", applicationId: "demo-stripe", name: "Alex Rivera",
      role: "Recruiter", email: "alex@stripe.com",
    }],
    events: applications.map((a, i) => ({
      id: `demo-ev-${i}`, applicationId: a.id, kind: "created" as const,
      message: "Application created", at: a.createdAt,
    })),
    notes: [],
    reminders: [{
      id: "demo-rem-1", applicationId: "demo-linear", type: "follow_up",
      title: "Follow up with Linear", dueAt: daysAgo(now, 1), done: false,
    }],
    settings: { ...DEFAULT_SETTINGS, demo: true },
  };
  await importSnapshot(snap, "replace");
  return true;
}

export async function clearDemoData(): Promise<void> {
  const snap = await loadAll();
  for (const a of snap.applications.filter((a) => a.id.startsWith("demo-"))) {
    await deleteApplication(a.id);
  }
  await putSettings({ ...snap.settings, demo: false });
}
```

- [ ] **Step 4: Run to verify pass** — `npm test` → seed tests PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: seed module with default stages, preset tags, and demo data"`

---

### Task 5: Pure ordering logic (card moves, stage reorder)

**Files:**
- Create: `src/lib/ordering.ts`
- Test: `src/lib/__tests__/ordering.test.ts`

**Interfaces:**
- Consumes: types.
- Produces:
  - `moveCard(apps: Application[], appId: string, toStageId: string, toIndex: number, nowIso: string): Application[]` — returns a NEW array; moved card gets `stageId`, `updatedAt = nowIso`; `order` re-indexed 0..n in both affected columns; toIndex clamps.
  - `reorderStages(stages: Stage[], stageId: string, toIndex: number): Stage[]` — new array, `order` re-indexed 0..n.

- [ ] **Step 1: Write failing test `src/lib/__tests__/ordering.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { moveCard, reorderStages } from "@/lib/ordering";
import type { Application, Stage } from "@/lib/types";

const NOW = "2026-07-06T12:00:00.000Z";
const app = (id: string, stageId: string, order: number): Application => ({
  id, company: id, role: "r", tagIds: [], stageId, order,
  createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
});

const board = [app("a", "s1", 0), app("b", "s1", 1), app("c", "s1", 2), app("x", "s2", 0)];

const inStage = (apps: Application[], s: string) =>
  apps.filter((a) => a.stageId === s).sort((a, b) => a.order - b.order).map((a) => a.id);

describe("moveCard", () => {
  it("reorders within a column", () => {
    const out = moveCard(board, "c", "s1", 0, NOW);
    expect(inStage(out, "s1")).toEqual(["c", "a", "b"]);
    expect(out.find((a) => a.id === "c")!.updatedAt).toBe(NOW);
  });

  it("moves across columns and reindexes both", () => {
    const out = moveCard(board, "a", "s2", 1, NOW);
    expect(inStage(out, "s1")).toEqual(["b", "c"]);
    expect(inStage(out, "s2")).toEqual(["x", "a"]);
    expect(out.find((a) => a.id === "b")!.order).toBe(0);
  });

  it("clamps toIndex beyond column length", () => {
    const out = moveCard(board, "a", "s2", 99, NOW);
    expect(inStage(out, "s2")).toEqual(["x", "a"]);
  });

  it("does not mutate the input array", () => {
    moveCard(board, "a", "s2", 0, NOW);
    expect(inStage(board, "s1")).toEqual(["a", "b", "c"]);
  });
});

describe("reorderStages", () => {
  const stages: Stage[] = [
    { id: "s1", name: "A", color: "pink", order: 0, kind: "pipeline" },
    { id: "s2", name: "B", color: "mint", order: 1, kind: "pipeline" },
    { id: "s3", name: "C", color: "gray", order: 2, kind: "lost" },
  ];
  it("moves a stage and reindexes", () => {
    const out = reorderStages(stages, "s3", 0);
    expect(out.sort((a, b) => a.order - b.order).map((s) => s.id)).toEqual(["s3", "s1", "s2"]);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Create `src/lib/ordering.ts`**

```ts
import type { Application, Stage } from "./types";

export function moveCard(
  apps: Application[], appId: string, toStageId: string, toIndex: number, nowIso: string,
): Application[] {
  const moving = apps.find((a) => a.id === appId);
  if (!moving) return apps;
  const fromStageId = moving.stageId;

  const byOrder = (a: Application, b: Application) => a.order - b.order;
  const source = apps.filter((a) => a.stageId === fromStageId && a.id !== appId).sort(byOrder);
  const target = fromStageId === toStageId
    ? source
    : apps.filter((a) => a.stageId === toStageId).sort(byOrder);

  const idx = Math.max(0, Math.min(toIndex, target.length));
  const moved: Application = { ...moving, stageId: toStageId, updatedAt: nowIso };
  const newTarget = [...target.slice(0, idx), moved, ...target.slice(idx)];

  const updated = new Map<string, Application>();
  newTarget.forEach((a, i) => updated.set(a.id, { ...a, order: i }));
  if (fromStageId !== toStageId) {
    source.forEach((a, i) => updated.set(a.id, { ...a, order: i }));
  }
  return apps.map((a) => updated.get(a.id) ?? a);
}

export function reorderStages(stages: Stage[], stageId: string, toIndex: number): Stage[] {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const moving = sorted.find((s) => s.id === stageId);
  if (!moving) return stages;
  const rest = sorted.filter((s) => s.id !== stageId);
  const idx = Math.max(0, Math.min(toIndex, rest.length));
  const next = [...rest.slice(0, idx), moving, ...rest.slice(idx)];
  return next.map((s, i) => ({ ...s, order: i }));
}
```

- [ ] **Step 4: Run to verify pass** — `npm test` → ordering tests PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: pure card move and stage reorder logic"`

---

### Task 6: Pure selectors — nudges, due reminders, filtering, metrics, formatting

**Files:**
- Create: `src/lib/selectors.ts`, `src/lib/format.ts`
- Test: `src/lib/__tests__/selectors.test.ts`

**Interfaces:**
- Consumes: types.
- Produces (`selectors.ts`):
  - `computeNudges(apps: Application[], stages: Stage[], nudgeDays: number, nowIso: string): Map<string, number>` — appId → whole days silent. Rule: stage `kind === "pipeline"` AND `stage.order > 0` AND not archived AND `floor((now - updatedAt)/86400000) >= nudgeDays`.
  - `dueReminders(reminders: Reminder[], nowIso: string): Reminder[]` — `!done` and effective due (`snoozedUntil ?? dueAt`) `<= now`, sorted oldest first.
  - `upcomingInterviews(interviews: Interview[], nowIso: string): Interview[]` — `scheduledAt >= now`, sorted soonest first.
  - `filterApplications(apps: Application[], filters: Filters): Application[]` — search matches company OR role (case-insensitive substring); tagIds = app has ANY selected tag; sources = app.source in list; hasSalary true = has salaryMin or salaryMax, false = has neither, null = ignore.
  - `computeMetrics(snap: Snapshot, nowIso: string): Metrics` where `Metrics = { total: number; active: number; offers: number; applied: number; responseRate: number; interviewRate: number; weekly: { label: string; count: number }[]; funnel: { label: string; count: number; pct: number }[] }`. Definitions: `active` = apps in `kind==="pipeline"` stages; `offers` = apps in `kind==="won"` stages; `applied` = apps whose stage is not the first pipeline stage (i.e. `stage.kind !== "pipeline" || stage.order > 0`); responded = applied apps that have ≥1 interview OR are in won/lost stage; `responseRate = responded/applied` (0 when applied=0); `interviewRate` = applied apps with ≥1 interview / applied; `weekly` = count of apps by `appliedAt ?? createdAt` for the last 8 ISO weeks, labels "Mon D" of week start; `funnel` = `[{Applied}, {Interviewed}, {Offer}]` with pct relative to applied (Applied pct = 100 when applied > 0).
- Produces (`format.ts`):
  - `formatSalary(a: Application): string | null` — "$120k–140k" style (`k` for thousands, currency symbol $ for USD else code prefix), single value "„$135k", null when no salary.
  - `relativeDays(iso: string, nowIso: string): string` — "today", "1d ago", "Nd ago", or "in Nd".
  - `shortDate(iso: string): string` — "Jul 6".

- [ ] **Step 1: Write failing test `src/lib/__tests__/selectors.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { computeNudges, dueReminders, filterApplications, computeMetrics } from "@/lib/selectors";
import { formatSalary, relativeDays } from "@/lib/format";
import type { Application, Snapshot, Stage } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/repo";

const NOW = "2026-07-06T12:00:00.000Z";
const stages: Stage[] = [
  { id: "saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline" },
  { id: "applied", name: "Applied", color: "pink", order: 1, kind: "pipeline" },
  { id: "interview", name: "Interview", color: "yellow", order: 2, kind: "pipeline" },
  { id: "offer", name: "Offer", color: "mint", order: 3, kind: "won" },
  { id: "rejected", name: "Rejected", color: "gray", order: 4, kind: "lost" },
];
const app = (id: string, stageId: string, o: Partial<Application> = {}): Application => ({
  id, company: id, role: "Engineer", tagIds: [], stageId, order: 0,
  createdAt: "2026-06-20T00:00:00.000Z", updatedAt: "2026-06-20T00:00:00.000Z", ...o,
});

describe("computeNudges", () => {
  it("nudges silent apps past threshold, skips Saved and terminal stages", () => {
    const apps = [
      app("quiet", "applied"),                                   // 16 days silent
      app("fresh", "applied", { updatedAt: "2026-07-05T12:00:00.000Z" }),
      app("saved", "saved"),
      app("done", "rejected"),
    ];
    const nudges = computeNudges(apps, stages, 7, NOW);
    expect(nudges.get("quiet")).toBe(16);
    expect(nudges.has("fresh")).toBe(false);
    expect(nudges.has("saved")).toBe(false);
    expect(nudges.has("done")).toBe(false);
  });
});

describe("dueReminders", () => {
  it("returns undone due reminders, respecting snooze", () => {
    const rs = [
      { id: "r1", type: "follow_up" as const, title: "a", dueAt: "2026-07-05T00:00:00.000Z", done: false },
      { id: "r2", type: "follow_up" as const, title: "b", dueAt: "2026-07-05T00:00:00.000Z", done: false, snoozedUntil: "2026-07-09T00:00:00.000Z" },
      { id: "r3", type: "follow_up" as const, title: "c", dueAt: "2026-07-01T00:00:00.000Z", done: true },
    ];
    expect(dueReminders(rs, NOW).map((r) => r.id)).toEqual(["r1"]);
  });
});

describe("filterApplications", () => {
  const apps = [
    app("a", "applied", { company: "Stripe", role: "Designer", tagIds: ["tag-dream"], salaryMin: 120000 }),
    app("b", "applied", { company: "Linear", role: "Engineer", source: "Referral" }),
  ];
  it("matches search on company or role, case-insensitive", () => {
    expect(filterApplications(apps, { search: "stri", tagIds: [], sources: [], hasSalary: null })).toHaveLength(1);
    expect(filterApplications(apps, { search: "engineer", tagIds: [], sources: [], hasSalary: null })[0].id).toBe("b");
  });
  it("filters by tag, source, salary presence", () => {
    expect(filterApplications(apps, { search: "", tagIds: ["tag-dream"], sources: [], hasSalary: null })[0].id).toBe("a");
    expect(filterApplications(apps, { search: "", tagIds: [], sources: ["Referral"], hasSalary: null })[0].id).toBe("b");
    expect(filterApplications(apps, { search: "", tagIds: [], sources: [], hasSalary: true })[0].id).toBe("a");
  });
});

describe("computeMetrics", () => {
  it("computes rates from stages and interviews", () => {
    const snap: Snapshot = {
      stages,
      applications: [
        app("s1", "saved"), app("a1", "applied"), app("a2", "applied"),
        app("i1", "interview"), app("o1", "offer"), app("r1", "rejected"),
      ],
      tags: [], contacts: [], events: [], notes: [], reminders: [],
      interviews: [{ id: "iv", applicationId: "i1", roundType: "phone", scheduledAt: NOW }],
      settings: DEFAULT_SETTINGS,
    };
    const m = computeMetrics(snap, NOW);
    expect(m.total).toBe(6);
    expect(m.active).toBe(4);      // saved, a1, a2, i1
    expect(m.offers).toBe(1);
    expect(m.applied).toBe(5);     // all but "s1"
    expect(m.responseRate).toBeCloseTo(3 / 5); // i1 (interview) + o1 + r1
    expect(m.interviewRate).toBeCloseTo(1 / 5);
    expect(m.funnel[0]).toEqual({ label: "Applied", count: 5, pct: 100 });
  });
});

describe("format", () => {
  it("formats salary ranges compactly", () => {
    expect(formatSalary(app("x", "applied", { salaryMin: 120000, salaryMax: 140000, currency: "USD" }))).toBe("$120k–140k");
    expect(formatSalary(app("y", "applied", { salaryMin: 135000, currency: "USD" }))).toBe("$135k");
    expect(formatSalary(app("z", "applied"))).toBeNull();
  });
  it("renders relative days", () => {
    expect(relativeDays("2026-07-06T09:00:00.000Z", NOW)).toBe("today");
    expect(relativeDays("2026-06-28T12:00:00.000Z", NOW)).toBe("8d ago");
    expect(relativeDays("2026-07-09T12:00:00.000Z", NOW)).toBe("in 3d");
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Create `src/lib/selectors.ts`**

```ts
import type {
  Application, Filters, Interview, Reminder, Snapshot, Stage,
} from "./types";

const DAY = 86_400_000;

export function computeNudges(
  apps: Application[], stages: Stage[], nudgeDays: number, nowIso: string,
): Map<string, number> {
  const byId = new Map(stages.map((s) => [s.id, s]));
  const now = Date.parse(nowIso);
  const out = new Map<string, number>();
  for (const a of apps) {
    const stage = byId.get(a.stageId);
    if (!stage || stage.kind !== "pipeline" || stage.order === 0 || a.archived) continue;
    const days = Math.floor((now - Date.parse(a.updatedAt)) / DAY);
    if (days >= nudgeDays) out.set(a.id, days);
  }
  return out;
}

export function dueReminders(reminders: Reminder[], nowIso: string): Reminder[] {
  const now = Date.parse(nowIso);
  return reminders
    .filter((r) => !r.done && Date.parse(r.snoozedUntil ?? r.dueAt) <= now)
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

export function upcomingInterviews(interviews: Interview[], nowIso: string): Interview[] {
  const now = Date.parse(nowIso);
  return interviews
    .filter((i) => Date.parse(i.scheduledAt) >= now)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
}

export function filterApplications(apps: Application[], f: Filters): Application[] {
  const q = f.search.trim().toLowerCase();
  return apps.filter((a) => {
    if (q && !a.company.toLowerCase().includes(q) && !a.role.toLowerCase().includes(q)) return false;
    if (f.tagIds.length && !f.tagIds.some((t) => a.tagIds.includes(t))) return false;
    if (f.sources.length && !(a.source && f.sources.includes(a.source))) return false;
    const hasSalary = a.salaryMin != null || a.salaryMax != null;
    if (f.hasSalary === true && !hasSalary) return false;
    if (f.hasSalary === false && hasSalary) return false;
    return true;
  });
}

export interface Metrics {
  total: number; active: number; offers: number; applied: number;
  responseRate: number; interviewRate: number;
  weekly: { label: string; count: number }[];
  funnel: { label: string; count: number; pct: number }[];
}

export function computeMetrics(snap: Snapshot, nowIso: string): Metrics {
  const stageById = new Map(snap.stages.map((s) => [s.id, s]));
  const withInterview = new Set(snap.interviews.map((i) => i.applicationId));
  const apps = snap.applications;

  const stageOf = (a: Application) => stageById.get(a.stageId);
  const active = apps.filter((a) => stageOf(a)?.kind === "pipeline");
  const offers = apps.filter((a) => stageOf(a)?.kind === "won");
  const appliedApps = apps.filter((a) => {
    const s = stageOf(a);
    return s && (s.kind !== "pipeline" || s.order > 0);
  });
  const responded = appliedApps.filter((a) => {
    const s = stageOf(a)!;
    return withInterview.has(a.id) || s.kind === "won" || s.kind === "lost";
  });
  const interviewed = appliedApps.filter((a) => withInterview.has(a.id));

  const now = new Date(nowIso);
  const weekly: { label: string; count: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = new Date(now.getTime() - (now.getUTCDay() || 7 - 1) * 0); // anchor below
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - now.getUTCDay() + 1 - w * 7));
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY);
    const count = apps.filter((a) => {
      const t = Date.parse(a.appliedAt ?? a.createdAt);
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    }).length;
    weekly.push({
      label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      count,
    });
    void start;
  }

  const applied = appliedApps.length;
  const pct = (n: number) => (applied === 0 ? 0 : Math.round((n / applied) * 100));
  return {
    total: apps.length,
    active: active.length,
    offers: offers.length,
    applied,
    responseRate: applied === 0 ? 0 : responded.length / applied,
    interviewRate: applied === 0 ? 0 : interviewed.length / applied,
    weekly,
    funnel: [
      { label: "Applied", count: applied, pct: pct(applied) },
      { label: "Interviewed", count: interviewed.length, pct: pct(interviewed.length) },
      { label: "Offer", count: offers.length, pct: pct(offers.length) },
    ],
  };
}
```

(Clean up the `weekly` loop when implementing — compute `weekStart` as Monday of the current UTC week minus `w` weeks; the test doesn't pin exact weekly buckets, only the funnel/rates.)

- [ ] **Step 4: Create `src/lib/format.ts`**

```ts
import type { Application } from "./types";

const DAY = 86_400_000;

function money(n: number, currency?: string): string {
  const sym = !currency || currency === "USD" ? "$" : `${currency} `;
  const compact = n >= 1000 && n % 1000 === 0 ? `${n / 1000}k` : n.toLocaleString("en-US");
  return `${sym}${compact}`;
}

export function formatSalary(a: Application): string | null {
  if (a.salaryMin != null && a.salaryMax != null) {
    const max = a.salaryMax >= 1000 && a.salaryMax % 1000 === 0
      ? `${a.salaryMax / 1000}k` : a.salaryMax.toLocaleString("en-US");
    return `${money(a.salaryMin, a.currency)}–${max}`;
  }
  const single = a.salaryMin ?? a.salaryMax;
  return single != null ? money(single, a.currency) : null;
}

export function relativeDays(iso: string, nowIso: string): string {
  const days = Math.floor((Date.parse(nowIso) - Date.parse(iso)) / DAY);
  if (days === 0) return "today";
  if (days > 0) return `${days}d ago`;
  return `in ${-days}d`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
```

- [ ] **Step 5: Run to verify pass** — `npm test` → selectors + format tests PASS.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: pure selectors (nudges, reminders, filters, metrics) and formatters"`

---

### Task 7: Quick-add parser

**Files:**
- Create: `src/lib/quickadd.ts`
- Test: `src/lib/__tests__/quickadd.test.ts`

**Interfaces:**
- Consumes: types (`WorkMode`).
- Produces: `parseQuickAdd(text: string): { company?: string; role?: string; location?: string; workMode?: WorkMode; salaryMin?: number; salaryMax?: number; url?: string; source?: string; jdSnapshot?: string }`. `jdSnapshot` = the full input text when it has > 1 non-empty line.

- [ ] **Step 1: Write failing test `src/lib/__tests__/quickadd.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { parseQuickAdd } from "@/lib/quickadd";

describe("parseQuickAdd", () => {
  it("parses 'Role at Company' with salary, mode, and URL", () => {
    const p = parseQuickAdd(
      "Senior Product Designer at Stripe\nRemote · $120k–$140k\nhttps://www.linkedin.com/jobs/view/123",
    );
    expect(p.role).toBe("Senior Product Designer");
    expect(p.company).toBe("Stripe");
    expect(p.workMode).toBe("remote");
    expect(p.salaryMin).toBe(120000);
    expect(p.salaryMax).toBe(140000);
    expect(p.url).toBe("https://www.linkedin.com/jobs/view/123");
    expect(p.source).toBe("LinkedIn");
    expect(p.jdSnapshot).toContain("Senior Product Designer");
  });

  it("detects source from known job-board hostnames", () => {
    expect(parseQuickAdd("https://ph.indeed.com/viewjob?jk=1").source).toBe("Indeed");
    expect(parseQuickAdd("https://boards.greenhouse.io/acme/jobs/1").source).toBe("Company site");
  });

  it("handles a bare URL only", () => {
    const p = parseQuickAdd("https://jobs.example.com/postings/42");
    expect(p.url).toBe("https://jobs.example.com/postings/42");
    expect(p.role).toBeUndefined();
    expect(p.jdSnapshot).toBeUndefined();
  });

  it("parses full-number salaries", () => {
    const p = parseQuickAdd("Engineer at Acme\n$120,000 - $150,000 a year");
    expect(p.salaryMin).toBe(120000);
    expect(p.salaryMax).toBe(150000);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Create `src/lib/quickadd.ts`**

```ts
import type { WorkMode } from "./types";

const SOURCE_MAP: [RegExp, string][] = [
  [/linkedin\./i, "LinkedIn"],
  [/indeed\./i, "Indeed"],
  [/jobstreet\./i, "JobStreet"],
  [/glassdoor\./i, "Glassdoor"],
  [/wellfound\.|angel\.co/i, "Wellfound"],
  [/greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com/i, "Company site"],
];

export interface QuickAddParse {
  company?: string; role?: string; location?: string; workMode?: WorkMode;
  salaryMin?: number; salaryMax?: number; url?: string; source?: string; jdSnapshot?: string;
}

export function parseQuickAdd(text: string): QuickAddParse {
  const out: QuickAddParse = {};
  const trimmed = text.trim();
  if (!trimmed) return out;

  const urlMatch = trimmed.match(/https?:\/\/[^\s)>\]]+/);
  if (urlMatch) {
    out.url = urlMatch[0];
    try {
      const host = new URL(out.url).hostname;
      const hit = SOURCE_MAP.find(([re]) => re.test(host));
      if (hit) out.source = hit[1];
    } catch { /* unparseable URL — keep raw string, skip source */ }
  }

  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  const textLines = lines.filter((l) => !/^https?:\/\//.test(l));

  const atLine = textLines.find((l) => /\s+at\s+/i.test(l));
  if (atLine) {
    const m = atLine.match(/^(.+?)\s+at\s+(.+)$/i);
    if (m) {
      out.role = m[1].trim();
      out.company = m[2].trim().replace(/[.,;]$/, "");
    }
  }

  if (/\bremote\b/i.test(trimmed)) out.workMode = "remote";
  else if (/\bhybrid\b/i.test(trimmed)) out.workMode = "hybrid";
  else if (/\bon-?site\b/i.test(trimmed)) out.workMode = "onsite";

  // "$120k–$140k" or "$120,000 - $150,000"
  const kRange = trimmed.match(/\$?(\d{2,3})k\s*[-–—]\s*\$?(\d{2,3})k/i);
  const fullRange = trimmed.match(/\$(\d{1,3}(?:,\d{3})+)\s*[-–—]\s*\$(\d{1,3}(?:,\d{3})+)/);
  if (kRange) {
    out.salaryMin = parseInt(kRange[1], 10) * 1000;
    out.salaryMax = parseInt(kRange[2], 10) * 1000;
  } else if (fullRange) {
    out.salaryMin = parseInt(fullRange[1].replace(/,/g, ""), 10);
    out.salaryMax = parseInt(fullRange[2].replace(/,/g, ""), 10);
  }

  if (textLines.length > 1) out.jdSnapshot = trimmed;
  return out;
}
```

- [ ] **Step 4: Run to verify pass** — `npm test` → quickadd tests PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: quick-add text/URL parser"`

---

### Task 8: Export / import (JSON + CSV)

**Files:**
- Create: `src/lib/exportio.ts`
- Test: `src/lib/__tests__/exportio.test.ts`

**Interfaces:**
- Consumes: types, Zod.
- Produces:
  - `toJson(snap: Snapshot): string` — pretty JSON `{ version: 1, exportedAt: string, data: Snapshot }`.
  - `fromJson(json: string): Snapshot` — Zod-validated; throws `Error` with readable message on invalid input.
  - `toCsv(snap: Snapshot): string` — applications flat table with header `Company,Role,Stage,Tags,Location,Work mode,Salary min,Salary max,Currency,Source,URL,Applied at,Created at`; stage/tag names resolved; RFC-4180 quoting.

- [ ] **Step 1: Write failing test `src/lib/__tests__/exportio.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { toJson, fromJson, toCsv } from "@/lib/exportio";
import { DEFAULT_SETTINGS } from "@/lib/repo";
import type { Snapshot } from "@/lib/types";

const snap: Snapshot = {
  stages: [{ id: "s1", name: "Applied", color: "pink", order: 0, kind: "pipeline" }],
  applications: [{
    id: "a1", company: 'Big "Co", Inc', role: "Engineer", tagIds: ["t1"], stageId: "s1",
    order: 0, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
  }],
  tags: [{ id: "t1", name: "Dream job", preset: true }],
  interviews: [], contacts: [], events: [], notes: [], reminders: [],
  settings: DEFAULT_SETTINGS,
};

describe("exportio", () => {
  it("JSON round-trips losslessly", () => {
    expect(fromJson(toJson(snap))).toEqual(snap);
  });

  it("fromJson rejects garbage with a readable error", () => {
    expect(() => fromJson('{"nope": true}')).toThrow(/invalid/i);
  });

  it("CSV resolves names and quotes fields containing commas/quotes", () => {
    const csv = toCsv(snap);
    const [header, row] = csv.split("\n");
    expect(header).toContain("Company,Role,Stage,Tags");
    expect(row).toContain('"Big ""Co"", Inc"');
    expect(row).toContain("Applied");
    expect(row).toContain("Dream job");
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Create `src/lib/exportio.ts`**

```ts
import { z } from "zod";
import type { Snapshot } from "./types";

const paletteKey = z.enum(["pink","peach","yellow","mint","sky","lavender","orchid","gray","sage","blush"]);

const snapshotSchema = z.object({
  stages: z.array(z.object({
    id: z.string(), name: z.string(), color: paletteKey,
    order: z.number(), kind: z.enum(["pipeline", "won", "lost"]),
  })),
  applications: z.array(z.object({
    id: z.string(), company: z.string(), role: z.string(),
    location: z.string().optional(), workMode: z.enum(["remote","hybrid","onsite"]).optional(),
    salaryMin: z.number().optional(), salaryMax: z.number().optional(),
    currency: z.string().optional(), url: z.string().optional(), source: z.string().optional(),
    jdSnapshot: z.string().optional(), tagIds: z.array(z.string()), stageId: z.string(),
    order: z.number(), appliedAt: z.string().optional(),
    createdAt: z.string(), updatedAt: z.string(), archived: z.boolean().optional(),
  })),
  tags: z.array(z.object({ id: z.string(), name: z.string(), preset: z.boolean() })),
  interviews: z.array(z.object({
    id: z.string(), applicationId: z.string(),
    roundType: z.enum(["phone","technical","panel","final","other"]),
    scheduledAt: z.string(), locationOrLink: z.string().optional(), notes: z.string().optional(),
  })),
  contacts: z.array(z.object({
    id: z.string(), applicationId: z.string(), name: z.string(),
    role: z.string().optional(), email: z.string().optional(), linkedin: z.string().optional(),
  })),
  events: z.array(z.object({
    id: z.string(), applicationId: z.string(),
    kind: z.enum(["created","stage_move","edit","note","manual"]),
    message: z.string(), at: z.string(),
  })),
  notes: z.array(z.object({
    id: z.string(), applicationId: z.string(), body: z.string(),
    createdAt: z.string(), updatedAt: z.string(),
  })),
  reminders: z.array(z.object({
    id: z.string(), applicationId: z.string().optional(),
    type: z.enum(["follow_up","interview","custom"]), title: z.string(),
    dueAt: z.string(), done: z.boolean(), snoozedUntil: z.string().optional(),
  })),
  settings: z.object({
    id: z.literal("singleton"), nudgeDays: z.number(), currency: z.string(),
    theme: z.literal("light"), demo: z.boolean(),
  }),
});

const fileSchema = z.object({ version: z.literal(1), exportedAt: z.string(), data: snapshotSchema });

export function toJson(snap: Snapshot): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: snap }, null, 2);
}

export function fromJson(json: string): Snapshot {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw new Error("Invalid file: not valid JSON."); }
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid JobTrackr export file: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
  }
  return parsed.data.data as Snapshot;
}

const csvCell = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(snap: Snapshot): string {
  const stageName = new Map(snap.stages.map((s) => [s.id, s.name]));
  const tagName = new Map(snap.tags.map((t) => [t.id, t.name]));
  const header = "Company,Role,Stage,Tags,Location,Work mode,Salary min,Salary max,Currency,Source,URL,Applied at,Created at";
  const rows = snap.applications.map((a) => [
    a.company, a.role, stageName.get(a.stageId) ?? "",
    a.tagIds.map((t) => tagName.get(t) ?? "").filter(Boolean).join("; "),
    a.location, a.workMode, a.salaryMin, a.salaryMax, a.currency,
    a.source, a.url, a.appliedAt, a.createdAt,
  ].map(csvCell).join(","));
  return [header, ...rows].join("\n");
}
```

- [ ] **Step 4: Run to verify pass** — `npm test` → exportio tests PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: JSON export/import with zod validation and CSV export"`

---

### Task 9: Zustand store (hydrate + write-through actions)

**Files:**
- Create: `src/lib/store.ts`
- Test: `src/lib/__tests__/store.test.ts`

**Interfaces:**
- Consumes: repo, seed, ordering, id, types.
- Produces `useApp` (zustand hook) with state `Snapshot & { ready: boolean; filters: Filters; selectedAppId: string | null }` and actions (all persist via repo, all synchronous-optimistic then await persistence):
  - `hydrate(): Promise<void>` — `seedIfEmpty()` then `loadAll()`, sets `ready: true`. Guard: never throws to UI; on IndexedDB failure sets `ready: true` with in-memory defaults (stages/tags from seed constants) and `persistBroken: true` flag.
  - `addApplication(input: Partial<Application> & { company: string; role: string }): Promise<Application>` — new app at END of its stage (default first stage), sets timestamps, logs `created` event.
  - `updateApplication(id: string, patch: Partial<Application>): Promise<void>` — merges, bumps `updatedAt`, logs `edit` event with message "Details updated".
  - `removeApplication(id: string): Promise<void>` — cascade via repo.
  - `moveApplication(id: string, toStageId: string, toIndex: number): Promise<void>` — uses `moveCard`, logs `stage_move` event "Moved to <stage name>"; when target stage `kind === "won"` the return value flags it: returns `Promise<{ won: boolean }>`.
  - Stage actions: `addStage(name: string): Promise<void>` (appended before terminal stages? No — appended at end, color cycles through `PALETTE_KEYS`, `kind: "pipeline"`), `renameStage(id, name)`, `recolorStage(id, color: PaletteKey)`, `moveStage(id, toIndex)` (uses `reorderStages`), `removeStage(id): Promise<boolean>` — refuses (returns false) if stage has applications.
  - Tag actions: `addTag(name): Promise<Tag>`, `renameTag(id, name)`, `removeTag(id)` — also strips the tag id from all applications.
  - Child-record actions: `addInterview(x: Omit<Interview,"id">)` — also creates an `interview` reminder due 1 day before `scheduledAt` titled "Interview: <company>"; `removeInterview(id)`; `addContact(x: Omit<Contact,"id">)`; `removeContact(id)`; `addNote(applicationId, body)` (logs `note` event "Note added"); `updateNote(id, body)`; `removeNote(id)`; `addManualActivity(applicationId, message)` (kind `manual`).
  - Reminder actions: `addReminder(x: Omit<Reminder,"id"|"done">)`, `completeReminder(id)`, `snoozeReminder(id, untilIso: string)`.
  - Settings: `updateSettings(patch: Partial<SettingsDoc>)`; `clearDemo()` (calls `clearDemoData` then reloads); `resetAllData()` (clearAll + reseed defaults WITHOUT demo apps: stages + preset tags + settings `demo:false`); `importData(json: string, mode: "replace"|"merge")` (fromJson → importSnapshot → loadAll).
  - UI state: `setFilters(f: Filters)`, `selectApp(id: string | null)`.

- [ ] **Step 1: Write failing test `src/lib/__tests__/store.test.ts`**

```ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll } from "@/lib/repo";
import { useApp } from "@/lib/store";

beforeEach(async () => {
  await clearAll();
  useApp.setState({ ready: false });
});

describe("store", () => {
  it("hydrate seeds and loads a snapshot", async () => {
    await useApp.getState().hydrate();
    const s = useApp.getState();
    expect(s.ready).toBe(true);
    expect(s.stages.length).toBe(5);
    expect(s.applications.length).toBeGreaterThan(0);
  });

  it("addApplication appends to the first stage and logs an event", async () => {
    await useApp.getState().hydrate();
    const app = await useApp.getState().addApplication({ company: "Acme", role: "Dev" });
    const s = useApp.getState();
    expect(s.applications.find((a) => a.id === app.id)).toBeTruthy();
    expect(app.stageId).toBe(s.stages[0].id);
    expect(s.events.some((e) => e.applicationId === app.id && e.kind === "created")).toBe(true);
  });

  it("moveApplication persists the move and reports won", async () => {
    await useApp.getState().hydrate();
    const app = await useApp.getState().addApplication({ company: "Acme", role: "Dev" });
    const offer = useApp.getState().stages.find((st) => st.kind === "won")!;
    const { won } = await useApp.getState().moveApplication(app.id, offer.id, 0);
    expect(won).toBe(true);
    expect(useApp.getState().applications.find((a) => a.id === app.id)!.stageId).toBe(offer.id);
  });

  it("removeStage refuses when the stage has cards", async () => {
    await useApp.getState().hydrate();
    const s = useApp.getState();
    const stageWithCards = s.stages.find((st) =>
      s.applications.some((a) => a.stageId === st.id))!;
    expect(await s.removeStage(stageWithCards.id)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Create `src/lib/store.ts`** (complete file):

```ts
"use client";

import { create } from "zustand";
import type {
  Application, Contact, Filters, Interview, NoteDoc, PaletteKey,
  Reminder, SettingsDoc, Snapshot, Tag,
} from "./types";
import { EMPTY_FILTERS } from "./types";
import { newId } from "./id";
import { moveCard, reorderStages } from "./ordering";
import { PALETTE_KEYS } from "./palette";
import * as repo from "./repo";
import { fromJson } from "./exportio";
import { seedIfEmpty, clearDemoData, DEFAULT_STAGES, PRESET_TAGS } from "./seed";

const nowIso = () => new Date().toISOString();

interface AppState extends Snapshot {
  ready: boolean;
  persistBroken: boolean;
  filters: Filters;
  selectedAppId: string | null;

  hydrate(): Promise<void>;
  addApplication(input: Partial<Application> & { company: string; role: string }): Promise<Application>;
  updateApplication(id: string, patch: Partial<Application>): Promise<void>;
  removeApplication(id: string): Promise<void>;
  moveApplication(id: string, toStageId: string, toIndex: number): Promise<{ won: boolean }>;
  addStage(name: string): Promise<void>;
  renameStage(id: string, name: string): Promise<void>;
  recolorStage(id: string, color: PaletteKey): Promise<void>;
  moveStage(id: string, toIndex: number): Promise<void>;
  removeStage(id: string): Promise<boolean>;
  addTag(name: string): Promise<Tag>;
  renameTag(id: string, name: string): Promise<void>;
  removeTag(id: string): Promise<void>;
  addInterview(x: Omit<Interview, "id">): Promise<void>;
  removeInterview(id: string): Promise<void>;
  addContact(x: Omit<Contact, "id">): Promise<void>;
  removeContact(id: string): Promise<void>;
  addNote(applicationId: string, body: string): Promise<void>;
  updateNote(id: string, body: string): Promise<void>;
  removeNote(id: string): Promise<void>;
  addManualActivity(applicationId: string, message: string): Promise<void>;
  addReminder(x: Omit<Reminder, "id" | "done">): Promise<void>;
  completeReminder(id: string): Promise<void>;
  snoozeReminder(id: string, untilIso: string): Promise<void>;
  updateSettings(patch: Partial<SettingsDoc>): Promise<void>;
  clearDemo(): Promise<void>;
  resetAllData(): Promise<void>;
  importData(json: string, mode: "replace" | "merge"): Promise<void>;
  exportJson(): string;
  setFilters(f: Filters): void;
  selectApp(id: string | null): void;
}

async function logEvent(
  set: (fn: (s: AppState) => Partial<AppState>) => void,
  applicationId: string, kind: "created" | "stage_move" | "edit" | "note" | "manual", message: string,
) {
  const ev = { id: newId(), applicationId, kind, message, at: nowIso() };
  set((s) => ({ events: [ev, ...s.events] }));
  await repo.putEvent(ev).catch(() => {});
}

export const useApp = create<AppState>()((set, get) => ({
  stages: [], applications: [], tags: [], interviews: [], contacts: [],
  events: [], notes: [], reminders: [],
  settings: repo.DEFAULT_SETTINGS,
  ready: false, persistBroken: false,
  filters: EMPTY_FILTERS, selectedAppId: null,

  async hydrate() {
    try {
      await seedIfEmpty();
      const snap = await repo.loadAll();
      set(() => ({ ...snap, ready: true }));
    } catch {
      set(() => ({
        stages: DEFAULT_STAGES, tags: PRESET_TAGS,
        settings: repo.DEFAULT_SETTINGS, ready: true, persistBroken: true,
      }));
    }
  },

  async addApplication(input) {
    const s = get();
    const stageId = input.stageId ?? s.stages[0]?.id ?? "stage-saved";
    const order = s.applications.filter((a) => a.stageId === stageId).length;
    const app: Application = {
      tagIds: [], ...input, id: newId(), stageId, order,
      createdAt: nowIso(), updatedAt: nowIso(),
    };
    set((st) => ({ applications: [...st.applications, app] }));
    await repo.putApplication(app).catch(() => {});
    await logEvent(set, app.id, "created", "Application created");
    return app;
  },

  async updateApplication(id, patch) {
    let next: Application | undefined;
    set((s) => ({
      applications: s.applications.map((a) => {
        if (a.id !== id) return a;
        next = { ...a, ...patch, id, updatedAt: nowIso() };
        return next;
      }),
    }));
    if (next) {
      await repo.putApplication(next).catch(() => {});
      await logEvent(set, id, "edit", "Details updated");
    }
  },

  async removeApplication(id) {
    set((s) => ({
      applications: s.applications.filter((a) => a.id !== id),
      interviews: s.interviews.filter((i) => i.applicationId !== id),
      contacts: s.contacts.filter((c) => c.applicationId !== id),
      events: s.events.filter((e) => e.applicationId !== id),
      notes: s.notes.filter((n) => n.applicationId !== id),
      reminders: s.reminders.filter((r) => r.applicationId !== id),
      selectedAppId: s.selectedAppId === id ? null : s.selectedAppId,
    }));
    await repo.deleteApplication(id).catch(() => {});
  },

  async moveApplication(id, toStageId, toIndex) {
    const s = get();
    const stage = s.stages.find((st) => st.id === toStageId);
    const before = s.applications.find((a) => a.id === id);
    const moved = moveCard(s.applications, id, toStageId, toIndex, nowIso());
    set(() => ({ applications: moved }));
    const changed = moved.filter((a, i) => a !== s.applications[i]);
    await repo.putApplications(changed).catch(() => {});
    if (stage && before && before.stageId !== toStageId) {
      await logEvent(set, id, "stage_move", `Moved to ${stage.name}`);
    }
    return { won: stage?.kind === "won" && before?.stageId !== toStageId };
  },

  async addStage(name) {
    const s = get();
    const color = PALETTE_KEYS[s.stages.length % PALETTE_KEYS.length];
    const stage = { id: newId(), name, color, order: s.stages.length, kind: "pipeline" as const };
    set((st) => ({ stages: [...st.stages, stage] }));
    await repo.putStage(stage).catch(() => {});
  },

  async renameStage(id, name) {
    set((s) => ({ stages: s.stages.map((st) => (st.id === id ? { ...st, name } : st)) }));
    const st = get().stages.find((x) => x.id === id);
    if (st) await repo.putStage(st).catch(() => {});
  },

  async recolorStage(id, color) {
    set((s) => ({ stages: s.stages.map((st) => (st.id === id ? { ...st, color } : st)) }));
    const st = get().stages.find((x) => x.id === id);
    if (st) await repo.putStage(st).catch(() => {});
  },

  async moveStage(id, toIndex) {
    const next = reorderStages(get().stages, id, toIndex);
    set(() => ({ stages: next }));
    await repo.putStages(next).catch(() => {});
  },

  async removeStage(id) {
    if (get().applications.some((a) => a.stageId === id)) return false;
    set((s) => ({ stages: s.stages.filter((st) => st.id !== id) }));
    await repo.deleteStage(id).catch(() => {});
    return true;
  },

  async addTag(name) {
    const tag: Tag = { id: newId(), name, preset: false };
    set((s) => ({ tags: [...s.tags, tag] }));
    await repo.putTag(tag).catch(() => {});
    return tag;
  },

  async renameTag(id, name) {
    set((s) => ({ tags: s.tags.map((t) => (t.id === id ? { ...t, name } : t)) }));
    const t = get().tags.find((x) => x.id === id);
    if (t) await repo.putTag(t).catch(() => {});
  },

  async removeTag(id) {
    set((s) => ({
      tags: s.tags.filter((t) => t.id !== id),
      applications: s.applications.map((a) =>
        a.tagIds.includes(id) ? { ...a, tagIds: a.tagIds.filter((t) => t !== id) } : a),
    }));
    await repo.deleteTag(id).catch(() => {});
    const touched = get().applications.filter((a) => !a.tagIds.includes(id));
    await repo.putApplications(touched).catch(() => {});
  },

  async addInterview(x) {
    const interview: Interview = { ...x, id: newId() };
    const app = get().applications.find((a) => a.id === x.applicationId);
    const reminder: Reminder = {
      id: newId(), applicationId: x.applicationId, type: "interview",
      title: `Interview: ${app?.company ?? "upcoming"}`,
      dueAt: new Date(Date.parse(x.scheduledAt) - 86_400_000).toISOString(), done: false,
    };
    set((s) => ({ interviews: [...s.interviews, interview], reminders: [...s.reminders, reminder] }));
    await repo.putInterview(interview).catch(() => {});
    await repo.putReminder(reminder).catch(() => {});
  },

  async removeInterview(id) {
    set((s) => ({ interviews: s.interviews.filter((i) => i.id !== id) }));
    await repo.deleteInterview(id).catch(() => {});
  },

  async addContact(x) {
    const contact: Contact = { ...x, id: newId() };
    set((s) => ({ contacts: [...s.contacts, contact] }));
    await repo.putContact(contact).catch(() => {});
  },

  async removeContact(id) {
    set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) }));
    await repo.deleteContact(id).catch(() => {});
  },

  async addNote(applicationId, body) {
    const note: NoteDoc = { id: newId(), applicationId, body, createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ notes: [note, ...s.notes] }));
    await repo.putNote(note).catch(() => {});
    await logEvent(set, applicationId, "note", "Note added");
  },

  async updateNote(id, body) {
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, body, updatedAt: nowIso() } : n)) }));
    const n = get().notes.find((x) => x.id === id);
    if (n) await repo.putNote(n).catch(() => {});
  },

  async removeNote(id) {
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    await repo.deleteNote(id).catch(() => {});
  },

  async addManualActivity(applicationId, message) {
    await logEvent(set, applicationId, "manual", message);
  },

  async addReminder(x) {
    const r: Reminder = { ...x, id: newId(), done: false };
    set((s) => ({ reminders: [...s.reminders, r] }));
    await repo.putReminder(r).catch(() => {});
  },

  async completeReminder(id) {
    set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, done: true } : r)) }));
    const r = get().reminders.find((x) => x.id === id);
    if (r) await repo.putReminder(r).catch(() => {});
  },

  async snoozeReminder(id, untilIso) {
    set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, snoozedUntil: untilIso } : r)) }));
    const r = get().reminders.find((x) => x.id === id);
    if (r) await repo.putReminder(r).catch(() => {});
  },

  async updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    set(() => ({ settings }));
    await repo.putSettings(settings).catch(() => {});
  },

  async clearDemo() {
    await clearDemoData();
    const snap = await repo.loadAll();
    set(() => ({ ...snap }));
  },

  async resetAllData() {
    await repo.clearAll();
    await repo.putStages(DEFAULT_STAGES);
    for (const t of PRESET_TAGS) await repo.putTag(t);
    await repo.putSettings({ ...repo.DEFAULT_SETTINGS });
    const snap = await repo.loadAll();
    set(() => ({ ...snap, selectedAppId: null }));
  },

  async importData(json, mode) {
    const snap = fromJson(json); // throws on invalid — caller shows toast
    await repo.importSnapshot(snap, mode);
    const loaded = await repo.loadAll();
    set(() => ({ ...loaded }));
  },

  exportJson() {
    const s = get();
    const { stages, applications, tags, interviews, contacts, events, notes, reminders, settings } = s;
    // toJson imported lazily to avoid circular import at module load
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { toJson } = require("./exportio") as typeof import("./exportio");
    return toJson({ stages, applications, tags, interviews, contacts, events, notes, reminders, settings });
  },

  setFilters(f) { set(() => ({ filters: f })); },
  selectApp(id) { set(() => ({ selectedAppId: id })); },
}));
```

Note: if `require` bothers the linter, import `toJson` normally at the top — there is no true circular dependency (`exportio` doesn't import `store`); use a plain top-level import.

- [ ] **Step 4: Run to verify pass** — `npm test` → store tests PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: zustand store with hydrate and write-through actions"`

---

### Task 10: UI primitives — Button, TagPill, Dialog, Toast

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/TagPill.tsx`, `src/components/ui/Dialog.tsx`, `src/components/ui/Toast.tsx`

**Interfaces:**
- Produces:
  - `<Button variant="primary" | "secondary" | "ghost" | "danger" size="md" | "sm">` — native `<button>`, pill-shaped.
  - `<TagPill name={string} onRemove?={() => void} />` — white pill, hairline border.
  - `<Dialog open onClose title children maxWidth?>` — accessible modal (`role="dialog"`, `aria-modal`, focus trap via native `<dialog>` element, ESC/backdrop close, Motion fade/scale-in).
  - `toast(message: string, kind?: "info" | "success" | "error")` global function + `<Toaster />` mounted once in the shell; `aria-live="polite"` region.

- [ ] **Step 1: Create `src/components/ui/Button.tsx`**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

const styles: Record<Variant, string> = {
  primary: "bg-ink text-white hover:opacity-85",
  secondary: "bg-surface text-ink border border-line hover:bg-sunken",
  ghost: "bg-transparent text-ink-2 hover:bg-sunken",
  danger: "bg-danger-bg text-danger hover:opacity-85",
};
const sizes: Record<Size, string> = {
  md: "text-sm font-semibold px-5 h-10",
  sm: "text-xs font-semibold px-3.5 h-8",
};

export const Button = forwardRef<HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ variant = "primary", size = "md", className = "", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${styles[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
});
```

- [ ] **Step 2: Create `src/components/ui/TagPill.tsx`**

```tsx
import { X } from "lucide-react";

export function TagPill({ name, onRemove }: { name: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink-2">
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${name}`}
          className="-mr-1 rounded-full p-0.5 hover:bg-sunken"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      )}
    </span>
  );
}
```

- [ ] **Step 3: Create `src/components/ui/Dialog.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export function Dialog({
  open, onClose, title, children, maxWidth = "max-w-lg",
}: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; maxWidth?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <dialog
          ref={ref}
          aria-label={title}
          onClose={onClose}
          onClick={(e) => { if (e.target === ref.current) onClose(); }}
          className="m-auto w-[calc(100vw-32px)] rounded-2xl bg-transparent p-0 backdrop:bg-ink/30"
          style={{ maxWidth: "inherit" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.2 }}
            className={`mx-auto w-full ${maxWidth} rounded-2xl bg-surface p-6 shadow-2xl`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">{title}</h2>
              <button
                type="button" onClick={onClose} aria-label="Close dialog"
                className="rounded-full p-2 text-ink-3 hover:bg-sunken"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {children}
          </motion.div>
        </dialog>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Create `src/components/ui/Toast.tsx`** (tiny global store, no dependency):

```tsx
"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";

interface ToastItem { id: number; message: string; kind: "info" | "success" | "error"; }
const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
let counter = 0;

export function toast(message: string, kind: ToastItem["kind"] = "info") {
  const id = ++counter;
  useToasts.setState((s) => ({ items: [...s.items, { id, message, kind }] }));
  setTimeout(() => {
    useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) }));
  }, 3500);
}

const icons = {
  info: <Info className="h-4 w-4" aria-hidden />,
  success: <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />,
  error: <AlertTriangle className="h-4 w-4 text-danger" aria-hidden />,
};

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium shadow-lg"
          >
            {icons[t.kind]} {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 5: Verify** — `npm run build` compiles clean (components are consumed starting next task).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: UI primitives — button, tag pill, dialog, toast"`

---

### Task 11: App shell — Sidebar, Topbar, MobileTabs, hydration boundary

**Files:**
- Create: `src/components/shell/AppShell.tsx`, `src/components/shell/Sidebar.tsx`, `src/components/shell/MobileTabs.tsx`
- Modify: `src/app/layout.tsx` (wrap children in `<AppShell>`)

**Interfaces:**
- Consumes: `useApp` (hydrate, reminders, settings), `dueReminders`, `Toaster`.
- Produces: `<AppShell>{children}</AppShell>` — renders Sidebar (desktop ≥1024px full, 768–1024px icon rail via CSS classes), MobileTabs (<768px bottom bar), `<main id="main">`, calls `hydrate()` once, shows nothing until `ready` (brief skeleton), shows persistent warning banner when `persistBroken`.

- [ ] **Step 1: Create `src/components/shell/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, KanbanSquare, Bell, Settings } from "lucide-react";
import { useApp } from "@/lib/store";
import { dueReminders } from "@/lib/selectors";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "Board", icon: KanbanSquare },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const reminders = useApp((s) => s.reminders);
  const dueCount = dueReminders(reminders, new Date().toISOString()).length;

  return (
    <nav aria-label="Main menu" className="hidden md:flex md:w-16 lg:w-56 shrink-0 flex-col border-r border-line-2 bg-surface px-3 py-5">
      <Link href="/" className="mb-7 flex items-center gap-2.5 px-2" aria-label="JobTrackr home">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink text-sm font-extrabold text-white">J</span>
        <span className="hidden text-[15px] font-extrabold tracking-tight lg:inline">JobTrackr</span>
      </Link>
      <p className="mb-2 hidden px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-3 lg:block">
        Main menu
      </p>
      <ul className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-2.5 rounded-xl px-2.5 text-sm transition-colors ${
                  active ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-sunken"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                <span className="hidden flex-1 lg:inline">{label}</span>
                {label === "Reminders" && dueCount > 0 && (
                  <span className="hidden rounded-full bg-danger-bg px-2 py-0.5 text-[10px] font-bold text-danger lg:inline">
                    {dueCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Create `src/components/shell/MobileTabs.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./Sidebar";

export function MobileTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main menu" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface md:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
              active ? "text-ink" : "text-ink-3"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Create `src/components/shell/AppShell.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { MobileTabs } from "./MobileTabs";
import { Toaster } from "@/components/ui/Toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const ready = useApp((s) => s.ready);
  const persistBroken = useApp((s) => s.persistBroken);
  const hydrate = useApp((s) => s.hydrate);

  useEffect(() => { void hydrate(); }, [hydrate]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main id="main" className="min-w-0 flex-1 pb-16 md:pb-0">
        {persistBroken && (
          <p role="alert" className="border-b border-warn-line bg-warn-bg px-6 py-2 text-xs font-medium text-warn">
            Storage is unavailable in this browser — changes won’t survive a reload.
          </p>
        )}
        {ready ? children : (
          <div className="p-8" aria-busy="true">
            <div className="h-6 w-40 animate-pulse rounded-full bg-sunken" />
          </div>
        )}
      </main>
      <MobileTabs />
      <Toaster />
    </div>
  );
}
```

- [ ] **Step 4: Modify `src/app/layout.tsx`** — wrap children:

```tsx
import { AppShell } from "@/components/shell/AppShell";
// inside <body>, replace {children} with:
<AppShell>{children}</AppShell>
```

- [ ] **Step 5: Verify** — `npm run dev`: sidebar renders with active state on `/`, demo data hydrates (check `Reminders` badge shows ≥1 from seed), bottom tabs at <768px, skip link focusable via Tab. `npm test` still green.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: app shell with sidebar, mobile tabs, and hydration boundary"`

---

### Task 12: Board page — static render (columns, cards, nudges, empty states)

**Files:**
- Create: `src/components/board/JobCard.tsx`, `src/components/board/Column.tsx`, `src/components/board/BoardPage.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: store, selectors (`computeNudges`, `filterApplications`, `upcomingInterviews`), `columnTints`, format helpers, `TagPill`, `Button`.
- Produces:
  - `<JobCard app tags nudgeDays interview dimmed onClick />` where `tags: Tag[]` (resolved for this app), `nudgeDays?: number`, `interview?: Interview`, `dimmed: boolean`.
  - `<Column stage apps tagById nudges nextInterviewByApp onCardClick />` — Task 13 replaces this file with the sortable version.
  - `<BoardPage />` — page-level client component; Task 13/15/16 extend it.

- [ ] **Step 1: Create `src/components/board/JobCard.tsx`**

```tsx
"use client";

import type { Application, Interview, Tag } from "@/lib/types";
import { formatSalary, relativeDays, shortDate } from "@/lib/format";
import { TagPill } from "@/components/ui/TagPill";
import { AlarmClock, CalendarClock, StickyNote } from "lucide-react";

export interface JobCardProps {
  app: Application;
  tags: Tag[];
  tints: { cardBg: string; cardBorder: string };
  nudgeDays?: number;
  interview?: Interview;
  noteCount?: number;
  dimmed?: boolean;
  onClick?: () => void;
}

export function JobCard({
  app, tags, tints, nudgeDays, interview, noteCount = 0, dimmed, onClick,
}: JobCardProps) {
  const salary = formatSalary(app);
  const meta = [app.company, app.location, salary].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${app.role} at ${app.company} — open details`}
      className={`group w-full rounded-2xl border p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${dimmed ? "opacity-60" : ""}`}
      style={{ background: tints.cardBg, borderColor: tints.cardBorder }}
    >
      {tags.length > 0 && (
        <span className="mb-2 flex flex-wrap gap-1">
          {tags.map((t) => <TagPill key={t.id} name={t.name} />)}
        </span>
      )}
      <span className="block text-sm font-bold leading-snug">{app.role}</span>
      <span className="mt-0.5 block text-xs text-ink-3">{meta}</span>

      {nudgeDays != null && (
        <span className="mt-2 flex items-center gap-1.5 rounded-lg border border-warn-line bg-warn-bg px-2 py-1 text-[11px] font-medium text-warn">
          <AlarmClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {nudgeDays} days silent — follow up?
        </span>
      )}
      {interview && (
        <span className="mt-2 flex items-center gap-1.5 rounded-lg bg-surface/70 px-2 py-1 text-[11px] font-medium text-ink-2">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {interview.roundType} round · {shortDate(interview.scheduledAt)}
        </span>
      )}

      <span className="mt-2.5 flex items-center justify-between text-[11px] text-ink-3">
        <span>{app.appliedAt ? `Applied ${relativeDays(app.appliedAt, new Date().toISOString())}` : `Saved ${relativeDays(app.createdAt, new Date().toISOString())}`}</span>
        {noteCount > 0 && (
          <span className="flex items-center gap-1">
            <StickyNote className="h-3 w-3" aria-hidden />
            {noteCount}
          </span>
        )}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/board/Column.tsx`** (static version — replaced in Task 13):

```tsx
"use client";

import type { Application, Interview, Stage, Tag } from "@/lib/types";
import { columnTints } from "@/lib/palette";
import { JobCard } from "./JobCard";

export interface ColumnProps {
  stage: Stage;
  apps: Application[];
  tagById: Map<string, Tag>;
  nudges: Map<string, number>;
  nextInterviewByApp: Map<string, Interview>;
  noteCountByApp: Map<string, number>;
  onCardClick: (id: string) => void;
}

export function Column({
  stage, apps, tagById, nudges, nextInterviewByApp, noteCountByApp, onCardClick,
}: ColumnProps) {
  const tints = columnTints(stage.color);
  return (
    <section aria-label={`${stage.name} column, ${apps.length} applications`}
      className="flex w-[248px] shrink-0 snap-start flex-col">
      <header className="mb-2.5 flex items-center gap-2 px-0.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: tints.dot }} aria-hidden />
        <h2 className="text-[13px] font-bold">{stage.name}</h2>
        <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold text-ink-3">
          {String(apps.length).padStart(2, "0")}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2.5">
        {apps.map((app) => (
          <JobCard
            key={app.id} app={app} tints={tints}
            tags={app.tagIds.map((t) => tagById.get(t)).filter((t): t is Tag => !!t)}
            nudgeDays={nudges.get(app.id)}
            interview={nextInterviewByApp.get(app.id)}
            noteCount={noteCountByApp.get(app.id) ?? 0}
            dimmed={stage.kind === "lost"}
            onClick={() => onCardClick(app.id)}
          />
        ))}
        {apps.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line px-3 py-6 text-center text-xs text-ink-3">
            Nothing here yet
          </p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `src/components/board/BoardPage.tsx`**

```tsx
"use client";

import { useMemo } from "react";
import { Plus, SlidersHorizontal, Search } from "lucide-react";
import { useApp } from "@/lib/store";
import { computeNudges, dueReminders, filterApplications, upcomingInterviews } from "@/lib/selectors";
import type { Interview } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Column } from "./Column";

export function BoardPage() {
  const s = useApp();
  const nowIso = new Date().toISOString();

  const filtered = useMemo(
    () => filterApplications(s.applications, s.filters),
    [s.applications, s.filters],
  );
  const nudges = useMemo(
    () => computeNudges(filtered, s.stages, s.settings.nudgeDays, nowIso),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, s.stages, s.settings.nudgeDays],
  );
  const nextInterviewByApp = useMemo(() => {
    const m = new Map<string, Interview>();
    for (const i of upcomingInterviews(s.interviews, nowIso)) {
      if (!m.has(i.applicationId)) m.set(i.applicationId, i);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.interviews]);
  const noteCountByApp = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of s.notes) m.set(n.applicationId, (m.get(n.applicationId) ?? 0) + 1);
    return m;
  }, [s.notes]);
  const tagById = useMemo(() => new Map(s.tags.map((t) => [t.id, t])), [s.tags]);

  const activeCount = s.applications.filter((a) => {
    const st = s.stages.find((x) => x.id === a.stageId);
    return st?.kind === "pipeline";
  }).length;
  const dueCount = dueReminders(s.reminders, nowIso).length + nudges.size;

  return (
    <div className="flex h-full flex-col px-5 pt-6 lg:px-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Board</h1>
          <p className="text-xs text-ink-3">
            {activeCount} active application{activeCount === 1 ? "" : "s"}
            {dueCount > 0 && ` · ${dueCount} need${dueCount === 1 ? "s" : ""} attention`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" aria-label="Search (Cmd+K)">
            <Search className="h-4 w-4" aria-hidden /> Search
            <kbd className="rounded-md bg-sunken px-1.5 text-[10px] text-ink-3">⌘K</kbd>
          </Button>
          <Button variant="secondary">
            <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
          </Button>
          <Button>
            <Plus className="h-4 w-4" aria-hidden /> Add job
          </Button>
        </div>
      </div>

      {s.settings.demo && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-2.5">
          <p className="text-xs text-ink-2">You’re looking at demo data — clear it when you’re ready to track your own hunt.</p>
          <Button variant="ghost" size="sm" onClick={() => void s.clearDemo()}>Clear demo data</Button>
        </div>
      )}

      <div className="flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto pb-6">
        {s.stages.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            apps={filtered.filter((a) => a.stageId === stage.id).sort((a, b) => a.order - b.order)}
            tagById={tagById}
            nudges={nudges}
            nextInterviewByApp={nextInterviewByApp}
            noteCountByApp={noteCountByApp}
            onCardClick={(id) => s.selectApp(id)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace `src/app/page.tsx`**

```tsx
import { BoardPage } from "@/components/board/BoardPage";

export default function Page() {
  return <BoardPage />;
}
```

- [ ] **Step 5: Verify** — `npm run dev`: board renders 5 pastel columns with seeded cards; Linear card shows the silent nudge (seed sets `updatedAt` 9 days back); Canva card shows the interview row; rejected Grab card dimmed; demo banner visible and "Clear demo data" empties the board. `npm run build` clean.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: board page with pastel columns, job cards, nudges, and demo banner"`

---

### Task 13: Drag & drop with motion effects + confetti

**Files:**
- Create: `src/components/board/DragBoard.tsx`
- Modify: `src/components/board/Column.tsx` (make sortable), `src/components/board/BoardPage.tsx` (wrap columns in DragBoard)

**Interfaces:**
- Consumes: dnd-kit (`DndContext`, `DragOverlay`, `PointerSensor`, `KeyboardSensor`, `closestCorners`, `SortableContext`, `useSortable`, `sortableKeyboardCoordinates`, `verticalListSortingStrategy`), `useApp.moveApplication`, canvas-confetti.
- Produces: `<DragBoard>{columns}</DragBoard>` owning DndContext + overlay; Column renders `SortableContext` + `useDroppable` glow; JobCard gets wrapped by a new `SortableCard` inside Column (JobCard itself unchanged).

- [ ] **Step 1: Create `src/components/board/DragBoard.tsx`**

```tsx
"use client";

import { useState } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor,
  closestCorners, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useApp } from "@/lib/store";
import { columnTints } from "@/lib/palette";
import { JobCard } from "./JobCard";
import { toast } from "@/components/ui/Toast";

async function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const confetti = (await import("canvas-confetti")).default;
  confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 }, scalar: 0.9 });
}

export function DragBoard({ children }: { children: React.ReactNode }) {
  const s = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    const activeApp = s.applications.find((a) => a.id === active.id);
    if (!activeApp) return;

    let toStageId: string;
    let toIndex: number;
    const overApp = s.applications.find((a) => a.id === overId);
    if (overApp) {
      toStageId = overApp.stageId;
      const column = s.applications
        .filter((a) => a.stageId === toStageId && a.id !== activeApp.id)
        .sort((a, b) => a.order - b.order);
      toIndex = column.findIndex((a) => a.id === overId);
      if (toIndex === -1) toIndex = column.length;
    } else if (s.stages.some((st) => st.id === overId)) {
      toStageId = overId;
      toIndex = s.applications.filter((a) => a.stageId === overId).length;
    } else {
      return;
    }

    if (toStageId === activeApp.stageId && toIndex === activeApp.order) return;
    const { won } = await s.moveApplication(activeApp.id, toStageId, toIndex);
    if (won) {
      void celebrate();
      toast(`${activeApp.company} moved to offer — congrats! 🎉`, "success");
    }
  }

  const activeApp = activeId ? s.applications.find((a) => a.id === activeId) : null;
  const activeStage = activeApp ? s.stages.find((st) => st.id === activeApp.stageId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {children}
      <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.15)" }}>
        {activeApp && activeStage && (
          <div className="rotate-3 scale-[1.04] shadow-2xl motion-reduce:rotate-0 motion-reduce:scale-100">
            <JobCard
              app={activeApp}
              tags={activeApp.tagIds
                .map((t) => s.tags.find((x) => x.id === t))
                .filter((t): t is NonNullable<typeof t> => !!t)}
              tints={columnTints(activeStage.color)}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 2: Replace `src/components/board/Column.tsx`** with the sortable version:

```tsx
"use client";

import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Application, Interview, Stage, Tag } from "@/lib/types";
import { columnTints, mixWithWhite, PALETTE } from "@/lib/palette";
import { JobCard, type JobCardProps } from "./JobCard";

export interface ColumnProps {
  stage: Stage;
  apps: Application[];
  tagById: Map<string, Tag>;
  nudges: Map<string, number>;
  nextInterviewByApp: Map<string, Interview>;
  noteCountByApp: Map<string, number>;
  onCardClick: (id: string) => void;
}

function SortableCard(props: JobCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.app.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-30" : undefined}
      {...attributes}
      {...listeners}
    >
      <JobCard {...props} />
    </div>
  );
}

export function Column({
  stage, apps, tagById, nudges, nextInterviewByApp, noteCountByApp, onCardClick,
}: ColumnProps) {
  const tints = columnTints(stage.color);
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <section aria-label={`${stage.name} column, ${apps.length} applications`}
      className="flex w-[248px] shrink-0 snap-start flex-col">
      <header className="mb-2.5 flex items-center gap-2 px-0.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: tints.dot }} aria-hidden />
        <h2 className="text-[13px] font-bold">{stage.name}</h2>
        <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold text-ink-3">
          {String(apps.length).padStart(2, "0")}
        </span>
      </header>
      <SortableContext items={apps.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex min-h-24 flex-1 flex-col gap-2.5 rounded-2xl p-1 transition-all duration-200"
          style={isOver ? {
            background: mixWithWhite(PALETTE[stage.color].hex, 0.18),
            boxShadow: `0 0 0 2px ${mixWithWhite(PALETTE[stage.color].hex, 0.6)}`,
          } : undefined}
        >
          {apps.map((app) => (
            <SortableCard
              key={app.id} app={app} tints={tints}
              tags={app.tagIds.map((t) => tagById.get(t)).filter((t): t is Tag => !!t)}
              nudgeDays={nudges.get(app.id)}
              interview={nextInterviewByApp.get(app.id)}
              noteCount={noteCountByApp.get(app.id) ?? 0}
              dimmed={stage.kind === "lost"}
              onClick={() => onCardClick(app.id)}
            />
          ))}
          {apps.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line px-3 py-6 text-center text-xs text-ink-3">
              Drop a card here
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
```

- [ ] **Step 3: Modify `src/components/board/BoardPage.tsx`** — import `DragBoard` and wrap the columns container:

```tsx
import { DragBoard } from "./DragBoard";
// replace the columns wrapper:
<DragBoard>
  <div className="flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto pb-6">
    {s.stages.map((stage) => ( /* …unchanged Column mapping… */ ))}
  </div>
</DragBoard>
```

- [ ] **Step 4: Verify by hand** — `npm run dev`:
  1. Pointer drag: card lifts into tilted overlay, origin ghost dims, target column glows, drop settles with the springy ease.
  2. Drag any card into Offer → confetti + success toast.
  3. Keyboard: Tab to a card, Space lifts, arrows move, Space drops (dnd-kit announces via screen reader by default).
  4. Click (without drag) still opens nothing yet — `selectApp` is wired, panel comes in Task 17. No console errors.
  5. Reload — order persists.

- [ ] **Step 5: Run tests** — `npm test` still green (ordering logic already covered).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: drag-and-drop board with tilt overlay, column glow, and offer confetti"`

---

### Task 14: Column color picker + column menu

**Files:**
- Create: `src/components/board/ColorPicker.tsx`, `src/components/board/ColumnMenu.tsx`
- Modify: `src/components/board/Column.tsx` (dot becomes picker trigger; header gets menu)

**Interfaces:**
- Consumes: `PALETTE`, `PALETTE_KEYS`, store stage actions, `Dialog`, `Button`, `toast`.
- Produces:
  - `<ColorPicker value onChange onClose />` — popover grid of the 10 swatches; each swatch is a `<button aria-label="{color name}" aria-pressed>`; Escape/outside click closes.
  - `<ColumnMenu stage />` — ⋮ dropdown with Rename (inline Dialog with text input), Delete (refuses via toast when the column has cards, confirm Dialog otherwise).

- [ ] **Step 1: Create `src/components/board/ColorPicker.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { PALETTE, PALETTE_KEYS } from "@/lib/palette";
import type { PaletteKey } from "@/lib/types";

export function ColorPicker({
  value, onChange, onClose,
}: { value: PaletteKey; onChange: (c: PaletteKey) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Column color"
      className="absolute left-0 top-7 z-30 w-44 rounded-2xl border border-line-2 bg-surface p-3 shadow-xl"
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-3">Column color</p>
      <div className="grid grid-cols-5 gap-2">
        {PALETTE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={PALETTE[key].name}
            aria-pressed={key === value}
            onClick={() => { onChange(key); onClose(); }}
            className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
              key === value ? "ring-2 ring-ink ring-offset-2" : ""
            }`}
            style={{ background: PALETTE[key].hex }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/board/ColumnMenu.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { Stage } from "@/lib/types";
import { useApp } from "@/lib/store";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export function ColumnMenu({ stage }: { stage: Stage }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(stage.name);
  const ref = useRef<HTMLDivElement>(null);
  const { renameStage, removeStage, applications } = useApp();
  const hasCards = applications.some((a) => a.stageId === stage.id);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button" aria-label={`${stage.name} column menu`} aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-1.5 text-ink-3 hover:bg-sunken"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-40 rounded-2xl border border-line-2 bg-surface p-1.5 shadow-xl">
          <button type="button"
            onClick={() => { setRenaming(true); setOpen(false); }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium hover:bg-sunken">
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Rename
          </button>
          <button type="button"
            onClick={() => {
              setOpen(false);
              if (hasCards) { toast("Move or delete this column’s cards first.", "error"); return; }
              setConfirmDelete(true);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-danger hover:bg-danger-bg">
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
          </button>
        </div>
      )}

      <Dialog open={renaming} onClose={() => setRenaming(false)} title="Rename column">
        <form onSubmit={(e) => { e.preventDefault(); void renameStage(stage.id, name.trim() || stage.name); setRenaming(false); }}>
          <label htmlFor={`rename-${stage.id}`} className="mb-1.5 block text-xs font-semibold text-ink-2">Column name</label>
          <input
            id={`rename-${stage.id}`} value={name} onChange={(e) => setName(e.target.value)}
            className="mb-4 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm" autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRenaming(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete column?">
        <p className="mb-4 text-sm text-ink-2">“{stage.name}” will be removed from your pipeline.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { void removeStage(stage.id); setConfirmDelete(false); }}>Delete</Button>
        </div>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Modify `src/components/board/Column.tsx` header** — replace the plain dot `<span>` and add the menu (exact replacement for the `<header>` block):

```tsx
import { useState } from "react";
import type { PaletteKey } from "@/lib/types";
import { useApp } from "@/lib/store";
import { ColorPicker } from "./ColorPicker";
import { ColumnMenu } from "./ColumnMenu";

// inside Column():
const [pickerOpen, setPickerOpen] = useState(false);
const recolorStage = useApp((s) => s.recolorStage);

<header className="relative mb-2.5 flex items-center gap-2 px-0.5">
  <button
    type="button"
    aria-label={`Change ${stage.name} column color`}
    aria-expanded={pickerOpen}
    onClick={() => setPickerOpen((v) => !v)}
    className="h-2.5 w-2.5 rounded-full transition-transform hover:scale-125"
    style={{ background: tints.dot }}
  />
  {pickerOpen && (
    <ColorPicker
      value={stage.color}
      onChange={(c: PaletteKey) => void recolorStage(stage.id, c)}
      onClose={() => setPickerOpen(false)}
    />
  )}
  <h2 className="text-[13px] font-bold">{stage.name}</h2>
  <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold text-ink-3">
    {String(apps.length).padStart(2, "0")}
  </span>
  <ColumnMenu stage={stage} />
</header>
```

- [ ] **Step 4: Verify by hand** — click a column dot → picker opens, choose a pastel → column tint, card backgrounds, and glow color all update live and persist across reload; rename works; deleting a populated column shows the error toast; deleting an empty one works.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: column color picker with curated pastels and column menu"`

---

### Task 15: Add job dialog with quick-add parsing

**Files:**
- Create: `src/components/board/AddJobDialog.tsx`
- Modify: `src/components/board/BoardPage.tsx` (wire the + Add job button)

**Interfaces:**
- Consumes: `parseQuickAdd`, `useApp.addApplication`, `Dialog`, `Button`, `TagPill`, `toast`.
- Produces: `<AddJobDialog open onClose />`. Two-part form: a "paste anything" textarea at top (URL or JD text → live-parses into the fields below on blur/change), then structured fields: company*, role*, location, work mode select, salary min/max, source, URL, tags (toggleable preset+custom pills), stage select (defaults to first stage). Submit = `addApplication` + success toast.

- [ ] **Step 1: Create `src/components/board/AddJobDialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { parseQuickAdd } from "@/lib/quickadd";
import type { WorkMode } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

const input = "w-full rounded-xl border border-line px-3.5 py-2.5 text-sm placeholder:text-ink-3";
const label = "mb-1.5 block text-xs font-semibold text-ink-2";

const EMPTY = {
  company: "", role: "", location: "", workMode: "" as WorkMode | "",
  salaryMin: "", salaryMax: "", source: "", url: "", stageId: "", jdSnapshot: "",
  tagIds: [] as string[],
};

export function AddJobDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { stages, tags, addApplication } = useApp();
  const [form, setForm] = useState(EMPTY);
  const [paste, setPaste] = useState("");
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));

  function applyPaste(text: string) {
    setPaste(text);
    const p = parseQuickAdd(text);
    set({
      company: p.company ?? form.company, role: p.role ?? form.role,
      workMode: p.workMode ?? form.workMode, url: p.url ?? form.url,
      source: p.source ?? form.source, jdSnapshot: p.jdSnapshot ?? form.jdSnapshot,
      salaryMin: p.salaryMin ? String(p.salaryMin) : form.salaryMin,
      salaryMax: p.salaryMax ? String(p.salaryMax) : form.salaryMax,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) return;
    const stageId = form.stageId || stages[0]?.id;
    const appliedStage = stages.find((s) => s.id === stageId);
    await addApplication({
      company: form.company.trim(), role: form.role.trim(),
      location: form.location.trim() || undefined,
      workMode: form.workMode || undefined,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      source: form.source.trim() || undefined,
      url: form.url.trim() || undefined,
      jdSnapshot: form.jdSnapshot || undefined,
      tagIds: form.tagIds, stageId,
      appliedAt: appliedStage && appliedStage.order > 0 ? new Date().toISOString() : undefined,
    });
    toast(`${form.company.trim()} added to ${appliedStage?.name ?? "board"}`, "success");
    setForm(EMPTY); setPaste("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add job" maxWidth="max-w-xl">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="paste" className={label}>
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-ink-3" aria-hidden />
            Paste a job link or description — I’ll fill what I can
          </label>
          <textarea
            id="paste" rows={2} value={paste} onChange={(e) => applyPaste(e.target.value)}
            placeholder="e.g. Senior Product Designer at Stripe — Remote — $120k–$140k"
            className={input}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="company" className={label}>Company *</label>
            <input id="company" required value={form.company} onChange={(e) => set({ company: e.target.value })} className={input} />
          </div>
          <div>
            <label htmlFor="role" className={label}>Role *</label>
            <input id="role" required value={form.role} onChange={(e) => set({ role: e.target.value })} className={input} />
          </div>
          <div>
            <label htmlFor="location" className={label}>Location</label>
            <input id="location" value={form.location} onChange={(e) => set({ location: e.target.value })} className={input} />
          </div>
          <div>
            <label htmlFor="workMode" className={label}>Work mode</label>
            <select id="workMode" value={form.workMode} onChange={(e) => set({ workMode: e.target.value as WorkMode | "" })} className={input}>
              <option value="">—</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
          </div>
          <div>
            <label htmlFor="salaryMin" className={label}>Salary min</label>
            <input id="salaryMin" type="number" inputMode="numeric" value={form.salaryMin} onChange={(e) => set({ salaryMin: e.target.value })} className={input} />
          </div>
          <div>
            <label htmlFor="salaryMax" className={label}>Salary max</label>
            <input id="salaryMax" type="number" inputMode="numeric" value={form.salaryMax} onChange={(e) => set({ salaryMax: e.target.value })} className={input} />
          </div>
          <div>
            <label htmlFor="source" className={label}>Source</label>
            <input id="source" value={form.source} onChange={(e) => set({ source: e.target.value })} placeholder="LinkedIn, referral…" className={input} />
          </div>
          <div>
            <label htmlFor="stage" className={label}>Column</label>
            <select id="stage" value={form.stageId || stages[0]?.id} onChange={(e) => set({ stageId: e.target.value })} className={input}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="url" className={label}>Posting URL</label>
            <input id="url" type="url" value={form.url} onChange={(e) => set({ url: e.target.value })} className={input} />
          </div>
        </div>

        <fieldset>
          <legend className={label}>Tags</legend>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const on = form.tagIds.includes(t.id);
              return (
                <button
                  key={t.id} type="button" aria-pressed={on}
                  onClick={() => set({ tagIds: on ? form.tagIds.filter((x) => x !== t.id) : [...form.tagIds, t.id] })}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:bg-sunken"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!form.company.trim() || !form.role.trim()}>Add job</Button>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire into `src/components/board/BoardPage.tsx`**

```tsx
import { useState } from "react";
import { AddJobDialog } from "./AddJobDialog";
// in BoardPage():
const [addOpen, setAddOpen] = useState(false);
// the Add job button:
<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" aria-hidden /> Add job</Button>
// before closing tag:
<AddJobDialog open={addOpen} onClose={() => setAddOpen(false)} />
```

- [ ] **Step 3: Verify by hand** — paste `Senior Product Designer at Stripe\nRemote · $120k–$140k\nhttps://linkedin.com/jobs/view/1` into the textarea → company/role/mode/salary/source auto-fill; submit → card appears in chosen column with toast; reload persists.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: add-job dialog with quick-add parsing and tag selection"`

---

### Task 16: Filters popover + ⌘K command palette

**Files:**
- Create: `src/components/board/FiltersPopover.tsx`, `src/components/board/CommandK.tsx`
- Modify: `src/components/board/BoardPage.tsx` (wire both buttons + global shortcut)

**Interfaces:**
- Consumes: `useApp` (filters/setFilters, applications, tags, selectApp), `EMPTY_FILTERS`, cmdk's `Command` components, `Button`.
- Produces:
  - `<FiltersPopover open onClose />` — tag toggles, source toggles (distinct `app.source` values), salary radio (Any/Has salary/No salary), search text box, Clear all. Writes `setFilters` live.
  - `<CommandK open onClose onAddJob />` — cmdk dialog: type-to-filter applications (Enter → `selectApp`), actions (Add job, Go to Dashboard/Board/Reminders/Settings via `router.push`).
  - BoardPage binds `⌘K`/`Ctrl+K` keydown → opens palette; Filters button shows active-filter count badge.

- [ ] **Step 1: Create `src/components/board/FiltersPopover.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useApp } from "@/lib/store";
import { EMPTY_FILTERS } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export function countActiveFilters(f: typeof EMPTY_FILTERS): number {
  return (f.search ? 1 : 0) + f.tagIds.length + f.sources.length + (f.hasSalary !== null ? 1 : 0);
}

export function FiltersPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { filters, setFilters, tags, applications } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const sources = useMemo(
    () => Array.from(new Set(applications.map((a) => a.source).filter((s): s is string => !!s))),
    [applications],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open, onClose]);

  if (!open) return null;
  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
      on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:bg-sunken"}`;

  return (
    <div ref={ref} role="group" aria-label="Filters"
      className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-line-2 bg-surface p-4 shadow-xl">
      <div className="mb-3">
        <label htmlFor="filter-search" className="mb-1.5 block text-xs font-semibold text-ink-2">Search</label>
        <input id="filter-search" value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Company or role…" className="w-full rounded-xl border border-line px-3 py-2 text-sm placeholder:text-ink-3" />
      </div>
      <fieldset className="mb-3">
        <legend className="mb-1.5 text-xs font-semibold text-ink-2">Tags</legend>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const on = filters.tagIds.includes(t.id);
            return (
              <button key={t.id} type="button" aria-pressed={on} className={chip(on)}
                onClick={() => setFilters({ ...filters, tagIds: on ? filters.tagIds.filter((x) => x !== t.id) : [...filters.tagIds, t.id] })}>
                {t.name}
              </button>
            );
          })}
        </div>
      </fieldset>
      {sources.length > 0 && (
        <fieldset className="mb-3">
          <legend className="mb-1.5 text-xs font-semibold text-ink-2">Source</legend>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((src) => {
              const on = filters.sources.includes(src);
              return (
                <button key={src} type="button" aria-pressed={on} className={chip(on)}
                  onClick={() => setFilters({ ...filters, sources: on ? filters.sources.filter((x) => x !== src) : [...filters.sources, src] })}>
                  {src}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <fieldset className="mb-4">
        <legend className="mb-1.5 text-xs font-semibold text-ink-2">Salary</legend>
        <div className="flex gap-1.5">
          {([["Any", null], ["Has salary", true], ["No salary", false]] as const).map(([lbl, val]) => (
            <button key={lbl} type="button" aria-pressed={filters.hasSalary === val} className={chip(filters.hasSalary === val)}
              onClick={() => setFilters({ ...filters, hasSalary: val })}>
              {lbl}
            </button>
          ))}
        </div>
      </fieldset>
      <Button variant="ghost" size="sm" className="w-full" onClick={() => setFilters(EMPTY_FILTERS)}>
        Clear all filters
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/board/CommandK.tsx`**

```tsx
"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Briefcase, LayoutDashboard, KanbanSquare, Bell, Settings, Plus } from "lucide-react";
import { useApp } from "@/lib/store";
import { Dialog } from "@/components/ui/Dialog";

export function CommandK({
  open, onClose, onAddJob,
}: { open: boolean; onClose: () => void; onAddJob: () => void }) {
  const router = useRouter();
  const { applications, selectApp } = useApp();

  const go = (fn: () => void) => { onClose(); fn(); };
  const item = "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm data-[selected=true]:bg-sunken";

  return (
    <Dialog open={open} onClose={onClose} title="Search" maxWidth="max-w-md">
      <Command label="Command menu">
        <Command.Input
          placeholder="Search jobs or jump to…" autoFocus
          className="mb-2 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm placeholder:text-ink-3"
        />
        <Command.List className="max-h-72 overflow-y-auto">
          <Command.Empty className="px-3 py-6 text-center text-sm text-ink-3">No results.</Command.Empty>
          <Command.Group heading="Applications" className="text-[10px] font-bold uppercase tracking-wider text-ink-3 [&_[cmdk-group-items]]:mt-1">
            {applications.map((a) => (
              <Command.Item key={a.id} value={`${a.company} ${a.role}`} className={item}
                onSelect={() => go(() => { router.push("/"); selectApp(a.id); })}>
                <Briefcase className="h-4 w-4 text-ink-3" aria-hidden />
                <span className="font-semibold">{a.role}</span>
                <span className="text-ink-3">{a.company}</span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Actions" className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-3 [&_[cmdk-group-items]]:mt-1">
            <Command.Item className={item} onSelect={() => go(onAddJob)}>
              <Plus className="h-4 w-4 text-ink-3" aria-hidden /> Add job
            </Command.Item>
            {([["Dashboard", "/dashboard", LayoutDashboard], ["Board", "/", KanbanSquare],
               ["Reminders", "/reminders", Bell], ["Settings", "/settings", Settings]] as const
            ).map(([label, href, Icon]) => (
              <Command.Item key={href} className={item} onSelect={() => go(() => router.push(href))}>
                <Icon className="h-4 w-4 text-ink-3" aria-hidden /> Go to {label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </Dialog>
  );
}
```

- [ ] **Step 3: Wire into `src/components/board/BoardPage.tsx`**

```tsx
import { useEffect, useState } from "react";
import { CommandK } from "./CommandK";
import { FiltersPopover, countActiveFilters } from "./FiltersPopover";
// in BoardPage():
const [kOpen, setKOpen] = useState(false);
const [filtersOpen, setFiltersOpen] = useState(false);
const activeFilters = countActiveFilters(s.filters);

useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setKOpen((v) => !v);
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);

// buttons area becomes relative container:
<div className="relative flex items-center gap-2">
  <Button variant="secondary" aria-label="Search (Cmd+K)" onClick={() => setKOpen(true)}>
    <Search className="h-4 w-4" aria-hidden /> Search
    <kbd className="rounded-md bg-sunken px-1.5 text-[10px] text-ink-3">⌘K</kbd>
  </Button>
  <Button variant="secondary" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((v) => !v)}>
    <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
    {activeFilters > 0 && (
      <span className="rounded-full bg-ink px-1.5 py-0.5 text-[9px] font-bold text-white">{activeFilters}</span>
    )}
  </Button>
  <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" aria-hidden /> Add job</Button>
  <FiltersPopover open={filtersOpen} onClose={() => setFiltersOpen(false)} />
</div>
// before closing tag:
<CommandK open={kOpen} onClose={() => setKOpen(false)} onAddJob={() => setAddOpen(true)} />
```

- [ ] **Step 4: Verify by hand** — ⌘K opens palette, typing "stri" surfaces the Stripe demo app, Enter opens board selection (panel in next task); filters narrow columns live with count badge; Clear all resets.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: board filters popover and command palette"`

---

### Task 17: Application detail slide-over panel

**Files:**
- Create: `src/components/detail/DetailPanel.tsx`
- Modify: `src/components/board/BoardPage.tsx` (mount `<DetailPanel />` once)

**Interfaces:**
- Consumes: `useApp` (selectedAppId, selectApp, updateApplication, removeApplication, notes/contacts/interviews/events + their actions), `Dialog`, `Button`, `TagPill`, format helpers, Motion.
- Produces: `<DetailPanel />` — self-contained; renders nothing when `selectedAppId` is null. Slide-over from right (`role="dialog"`, `aria-modal`, Escape closes, backdrop click closes, focus moves into panel on open). Sections: header (role/company + stage select + delete), editable overview fields (inline inputs saved on blur), tags (toggle pills), interviews (list + add form + remove), contacts (list + add form + remove), notes (add textarea + list + delete), activity timeline (events, newest first), JD snapshot (collapsible `<details>`).

- [ ] **Step 1: Create `src/components/detail/DetailPanel.tsx`** (complete file — long but single-responsibility: everything about one application):

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Trash2, X, Plus, ExternalLink } from "lucide-react";
import { useApp } from "@/lib/store";
import type { InterviewRound, WorkMode } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { relativeDays, shortDate } from "@/lib/format";

const input = "w-full rounded-xl border border-line px-3 py-2 text-sm placeholder:text-ink-3";
const label = "mb-1 block text-[11px] font-semibold text-ink-2";
const sectionTitle = "mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-3";

export function DetailPanel() {
  const s = useApp();
  const app = s.applications.find((a) => a.id === s.selectedAppId) ?? null;
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [ivDraft, setIvDraft] = useState({ roundType: "phone" as InterviewRound, scheduledAt: "", locationOrLink: "" });
  const [contactDraft, setContactDraft] = useState({ name: "", role: "", email: "" });

  useEffect(() => {
    if (!app) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") s.selectApp(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app?.id]);

  if (!app) return null;
  const nowIso = new Date().toISOString();
  const interviews = s.interviews.filter((i) => i.applicationId === app.id)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const contacts = s.contacts.filter((c) => c.applicationId === app.id);
  const notes = s.notes.filter((n) => n.applicationId === app.id);
  const events = s.events.filter((e) => e.applicationId === app.id);

  const save = (patch: Parameters<typeof s.updateApplication>[1]) =>
    void s.updateApplication(app.id, patch);

  return (
    <AnimatePresence>
      <motion.div key="backdrop" className="fixed inset-0 z-40 bg-ink/25"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => s.selectApp(null)} aria-hidden />
      <motion.div
        key={app.id} ref={panelRef} tabIndex={-1}
        role="dialog" aria-modal="true" aria-label={`${app.role} at ${app.company} details`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto bg-surface shadow-2xl outline-none max-md:inset-x-0 max-md:top-12 max-md:rounded-t-3xl"
        initial={{ x: 48, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 48, opacity: 0 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line-2 bg-surface px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold tracking-tight">{app.role}</h2>
            <p className="text-xs text-ink-3">
              {app.company}
              {app.url && (
                <a href={app.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-0.5 font-semibold text-ink-2 underline">
                  posting <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <label htmlFor="detail-stage" className="sr-only">Stage</label>
            <select id="detail-stage" value={app.stageId} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold"
              onChange={(e) => void s.moveApplication(app.id, e.target.value, 0)}>
              {s.stages.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
            <button type="button" aria-label="Delete application" onClick={() => setConfirmDelete(true)}
              className="rounded-full p-2 text-ink-3 hover:bg-danger-bg hover:text-danger">
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" aria-label="Close details" onClick={() => s.selectApp(null)}
              className="rounded-full p-2 text-ink-3 hover:bg-sunken">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 px-6 py-5">
          <section aria-label="Overview">
            <h3 className={sectionTitle}>Overview</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="f-company" className={label}>Company</label>
                <input id="f-company" defaultValue={app.company} onBlur={(e) => e.target.value !== app.company && save({ company: e.target.value })} className={input} /></div>
              <div><label htmlFor="f-role" className={label}>Role</label>
                <input id="f-role" defaultValue={app.role} onBlur={(e) => e.target.value !== app.role && save({ role: e.target.value })} className={input} /></div>
              <div><label htmlFor="f-location" className={label}>Location</label>
                <input id="f-location" defaultValue={app.location ?? ""} onBlur={(e) => e.target.value !== (app.location ?? "") && save({ location: e.target.value || undefined })} className={input} /></div>
              <div><label htmlFor="f-mode" className={label}>Work mode</label>
                <select id="f-mode" value={app.workMode ?? ""} onChange={(e) => save({ workMode: (e.target.value || undefined) as WorkMode | undefined })} className={input}>
                  <option value="">—</option><option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option><option value="onsite">Onsite</option>
                </select></div>
              <div><label htmlFor="f-smin" className={label}>Salary min</label>
                <input id="f-smin" type="number" defaultValue={app.salaryMin ?? ""} onBlur={(e) => save({ salaryMin: e.target.value ? Number(e.target.value) : undefined })} className={input} /></div>
              <div><label htmlFor="f-smax" className={label}>Salary max</label>
                <input id="f-smax" type="number" defaultValue={app.salaryMax ?? ""} onBlur={(e) => save({ salaryMax: e.target.value ? Number(e.target.value) : undefined })} className={input} /></div>
              <div className="col-span-2"><label htmlFor="f-source" className={label}>Source</label>
                <input id="f-source" defaultValue={app.source ?? ""} onBlur={(e) => save({ source: e.target.value || undefined })} className={input} /></div>
            </div>
          </section>

          <section aria-label="Tags">
            <h3 className={sectionTitle}>Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {s.tags.map((t) => {
                const on = app.tagIds.includes(t.id);
                return (
                  <button key={t.id} type="button" aria-pressed={on}
                    onClick={() => save({ tagIds: on ? app.tagIds.filter((x) => x !== t.id) : [...app.tagIds, t.id] })}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:bg-sunken"}`}>
                    {t.name}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-label="Interviews">
            <h3 className={sectionTitle}>Interviews</h3>
            <ul className="mb-3 flex flex-col gap-2">
              {interviews.map((iv) => (
                <li key={iv.id} className="flex items-center justify-between rounded-xl border border-line-2 px-3 py-2 text-sm">
                  <span><span className="font-semibold capitalize">{iv.roundType}</span>
                    <span className="text-ink-3"> · {shortDate(iv.scheduledAt)}{iv.locationOrLink ? ` · ${iv.locationOrLink}` : ""}</span></span>
                  <button type="button" aria-label="Remove interview" onClick={() => void s.removeInterview(iv.id)}
                    className="rounded-full p-1.5 text-ink-3 hover:bg-sunken"><X className="h-3.5 w-3.5" aria-hidden /></button>
                </li>
              ))}
              {interviews.length === 0 && <li className="text-xs text-ink-3">No interviews scheduled yet.</li>}
            </ul>
            <form className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!ivDraft.scheduledAt) return;
                void s.addInterview({ applicationId: app.id, roundType: ivDraft.roundType,
                  scheduledAt: new Date(ivDraft.scheduledAt).toISOString(),
                  locationOrLink: ivDraft.locationOrLink || undefined });
                setIvDraft({ roundType: "phone", scheduledAt: "", locationOrLink: "" });
              }}>
              <div><label htmlFor="iv-type" className={label}>Round</label>
                <select id="iv-type" value={ivDraft.roundType} onChange={(e) => setIvDraft({ ...ivDraft, roundType: e.target.value as InterviewRound })} className={input}>
                  {(["phone", "technical", "panel", "final", "other"] as const).map((r) => <option key={r} value={r}>{r}</option>)}
                </select></div>
              <div><label htmlFor="iv-at" className={label}>When</label>
                <input id="iv-at" type="datetime-local" required value={ivDraft.scheduledAt} onChange={(e) => setIvDraft({ ...ivDraft, scheduledAt: e.target.value })} className={input} /></div>
              <Button type="submit" size="sm" aria-label="Add interview"><Plus className="h-3.5 w-3.5" aria-hidden /></Button>
            </form>
          </section>

          <section aria-label="Contacts">
            <h3 className={sectionTitle}>Contacts</h3>
            <ul className="mb-3 flex flex-col gap-2">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl border border-line-2 px-3 py-2 text-sm">
                  <span><span className="font-semibold">{c.name}</span>
                    <span className="text-ink-3"> {c.role && `· ${c.role}`} {c.email && `· ${c.email}`}</span></span>
                  <button type="button" aria-label={`Remove contact ${c.name}`} onClick={() => void s.removeContact(c.id)}
                    className="rounded-full p-1.5 text-ink-3 hover:bg-sunken"><X className="h-3.5 w-3.5" aria-hidden /></button>
                </li>
              ))}
            </ul>
            <form className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!contactDraft.name.trim()) return;
                void s.addContact({ applicationId: app.id, name: contactDraft.name.trim(),
                  role: contactDraft.role || undefined, email: contactDraft.email || undefined });
                setContactDraft({ name: "", role: "", email: "" });
              }}>
              <div className="flex-1"><label htmlFor="c-name" className={label}>Name</label>
                <input id="c-name" required value={contactDraft.name} onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })} className={input} /></div>
              <div className="flex-1"><label htmlFor="c-email" className={label}>Email</label>
                <input id="c-email" type="email" value={contactDraft.email} onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} className={input} /></div>
              <Button type="submit" size="sm" aria-label="Add contact"><Plus className="h-3.5 w-3.5" aria-hidden /></Button>
            </form>
          </section>

          <section aria-label="Notes">
            <h3 className={sectionTitle}>Notes</h3>
            <form className="mb-3 flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!noteDraft.trim()) return;
                void s.addNote(app.id, noteDraft.trim());
                setNoteDraft("");
              }}>
              <div className="flex-1"><label htmlFor="note" className={label}>Add a note</label>
                <textarea id="note" rows={2} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Interview questions, impressions, follow-up plan…" className={input} /></div>
              <Button type="submit" size="sm">Save</Button>
            </form>
            <ul className="flex flex-col gap-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-sunken px-3 py-2.5 text-sm">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <span className="mt-1 flex items-center justify-between text-[10px] text-ink-3">
                    {relativeDays(n.createdAt, nowIso)}
                    <button type="button" onClick={() => void s.removeNote(n.id)} className="font-semibold hover:text-danger">Delete</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {app.jdSnapshot && (
            <section aria-label="Job description snapshot">
              <details className="rounded-xl border border-line-2 px-4 py-3">
                <summary className="cursor-pointer text-xs font-bold text-ink-2">Job description snapshot</summary>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink-2">{app.jdSnapshot}</p>
              </details>
            </section>
          )}

          <section aria-label="Activity">
            <h3 className={sectionTitle}>Activity</h3>
            <ol className="flex flex-col gap-0">
              {events.map((ev) => (
                <li key={ev.id} className="relative border-l-2 border-line-2 pb-3 pl-4 last:pb-0">
                  <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-ink" aria-hidden />
                  <p className="text-xs font-medium">{ev.message}</p>
                  <p className="text-[10px] text-ink-3">{relativeDays(ev.at, nowIso)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {confirmDelete && (
          <div className="sticky bottom-0 border-t border-line-2 bg-surface px-6 py-4">
            <p className="mb-3 text-sm font-medium">Delete this application and all its notes, contacts, and interviews?</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="danger" size="sm"
                onClick={() => { void s.removeApplication(app.id); toast("Application deleted", "info"); }}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Mount in `src/components/board/BoardPage.tsx`** — add `<DetailPanel />` next to `<CommandK …/>` (`import { DetailPanel } from "@/components/detail/DetailPanel";`).

- [ ] **Step 3: Verify by hand** — click a card → panel springs in over dimmed board; edit fields (blur saves, timeline logs "Details updated"); change stage from the select → board reflects; add interview → appears + reminder created (check Reminders badge); add note/contact; JD snapshot collapsible on the Stripe demo card; Escape and backdrop close; delete flow works.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: application detail slide-over with timeline, interviews, contacts, notes"`

---

### Task 18: Dashboard page

**Files:**
- Create: `src/components/dashboard/DashboardPage.tsx`, `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `computeMetrics`, `computeNudges`, `dueReminders`, `upcomingInterviews`, store, Recharts (`BarChart`), Motion (count-up), format helpers.
- Produces: `/dashboard` route — stat cards (count-up), funnel bars, weekly applications chart, upcoming interviews list, needs-attention list (links select the app and route to board).

- [ ] **Step 1: Create `src/components/dashboard/DashboardPage.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { animate, useReducedMotion } from "motion/react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/lib/store";
import { computeMetrics, computeNudges, dueReminders, upcomingInterviews } from "@/lib/selectors";
import { shortDate } from "@/lib/format";

function StatCard({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) { el.textContent = `${value}${suffix}`; return; }
    const controls = animate(0, value, {
      duration: 0.8, ease: "easeOut",
      onUpdate: (v) => { el.textContent = `${Math.round(v)}${suffix}`; },
    });
    return () => controls.stop();
  }, [value, suffix, reduced]);
  return (
    <div className="rounded-2xl border border-line-2 bg-surface p-5">
      <p className="text-xs font-semibold text-ink-3">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight"><span ref={ref}>0</span></p>
    </div>
  );
}

export function DashboardPage() {
  const s = useApp();
  const router = useRouter();
  const nowIso = new Date().toISOString();
  const metrics = useMemo(() => computeMetrics(s, nowIso), [s, nowIso]);
  const nudges = useMemo(
    () => computeNudges(s.applications, s.stages, s.settings.nudgeDays, nowIso),
    [s.applications, s.stages, s.settings.nudgeDays, nowIso],
  );
  const due = dueReminders(s.reminders, nowIso);
  const interviews = upcomingInterviews(s.interviews, nowIso).slice(0, 5);
  const appById = new Map(s.applications.map((a) => [a.id, a]));

  const openApp = (id: string) => { s.selectApp(id); router.push("/"); };

  return (
    <div className="px-5 pt-6 lg:px-7">
      <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
      <p className="mb-6 text-xs text-ink-3">Your job hunt at a glance</p>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active applications" value={metrics.active} />
        <StatCard label="Response rate" value={Math.round(metrics.responseRate * 100)} suffix="%" />
        <StatCard label="Interview rate" value={Math.round(metrics.interviewRate * 100)} suffix="%" />
        <StatCard label="Offers" value={metrics.offers} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section aria-label="Pipeline funnel" className="rounded-2xl border border-line-2 bg-surface p-5">
          <h2 className="mb-4 text-sm font-bold">Pipeline funnel</h2>
          <div className="flex flex-col gap-3">
            {metrics.funnel.map((f) => (
              <div key={f.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold">{f.label}</span>
                  <span className="text-ink-3">{f.count} · {f.pct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
                  <div className="h-full rounded-full bg-ink transition-[width] duration-700"
                    style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Applications per week" className="rounded-2xl border border-line-2 bg-surface p-5">
          <h2 className="mb-4 text-sm font-bold">Applications per week</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.weekly} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b6b6b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6b6b6b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#f5f5f5" }} contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }} />
                <Bar dataKey="count" fill="#1a1a1a" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-4 pb-8 lg:grid-cols-2">
        <section aria-label="Upcoming interviews" className="rounded-2xl border border-line-2 bg-surface p-5">
          <h2 className="mb-3 text-sm font-bold">Upcoming interviews</h2>
          <ul className="flex flex-col gap-2">
            {interviews.map((iv) => {
              const app = appById.get(iv.applicationId);
              return (
                <li key={iv.id}>
                  <button type="button" onClick={() => openApp(iv.applicationId)}
                    className="flex w-full items-center justify-between rounded-xl border border-line-2 px-3 py-2.5 text-left text-sm hover:bg-sunken">
                    <span><span className="font-semibold">{app?.company}</span>
                      <span className="text-ink-3"> · {iv.roundType} round</span></span>
                    <span className="text-xs font-semibold text-ink-2">{shortDate(iv.scheduledAt)}</span>
                  </button>
                </li>
              );
            })}
            {interviews.length === 0 && <li className="text-xs text-ink-3">Nothing scheduled — go get one! 💪</li>}
          </ul>
        </section>

        <section aria-label="Needs attention" className="rounded-2xl border border-line-2 bg-surface p-5">
          <h2 className="mb-3 text-sm font-bold">Needs attention</h2>
          <ul className="flex flex-col gap-2">
            {[...nudges.entries()].map(([appId, days]) => {
              const app = appById.get(appId);
              if (!app) return null;
              return (
                <li key={appId}>
                  <button type="button" onClick={() => openApp(appId)}
                    className="flex w-full items-center justify-between rounded-xl border border-warn-line bg-warn-bg px-3 py-2.5 text-left text-sm hover:opacity-80">
                    <span className="font-semibold">{app.company} · {app.role}</span>
                    <span className="text-xs font-semibold text-warn">{days}d silent</span>
                  </button>
                </li>
              );
            })}
            {due.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => r.applicationId ? openApp(r.applicationId) : router.push("/reminders")}
                  className="flex w-full items-center justify-between rounded-xl border border-line-2 px-3 py-2.5 text-left text-sm hover:bg-sunken">
                  <span className="font-semibold">{r.title}</span>
                  <span className="text-xs text-danger">due {shortDate(r.dueAt)}</span>
                </button>
              </li>
            ))}
            {nudges.size === 0 && due.length === 0 && (
              <li className="text-xs text-ink-3">All caught up — nothing needs your attention. ✨</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/dashboard/page.tsx`**

```tsx
import type { Metadata } from "next";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export const metadata: Metadata = { title: "Dashboard — JobTrackr" };

export default function Page() {
  return <DashboardPage />;
}
```

- [ ] **Step 3: Verify by hand** — stats count up on load; funnel bars animate to widths; weekly chart renders; both lists route to board and open the right application panel.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: dashboard with animated stats, funnel, weekly chart, attention lists"`

---

### Task 19: Reminders page

**Files:**
- Create: `src/components/reminders/RemindersPage.tsx`, `src/app/reminders/page.tsx`

**Interfaces:**
- Consumes: store (reminders + completeReminder/snoozeReminder/selectApp), `dueReminders`, format helpers, `Button`.
- Produces: `/reminders` route — two groups: **Due now** (`dueReminders`) and **Upcoming** (undone, not yet due, sorted by effective due date). Row: type icon, title, linked app (click → open on board), due date, actions Done / Snooze 1d / 3d / 1w.

- [ ] **Step 1: Create `src/components/reminders/RemindersPage.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { AlarmClock, CalendarClock, BellRing, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { dueReminders } from "@/lib/selectors";
import { relativeDays } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import type { Reminder } from "@/lib/types";

const DAY = 86_400_000;
const typeIcon = {
  follow_up: <AlarmClock className="h-4 w-4 text-warn" aria-hidden />,
  interview: <CalendarClock className="h-4 w-4 text-ink-2" aria-hidden />,
  custom: <BellRing className="h-4 w-4 text-ink-2" aria-hidden />,
};

function Row({ r, due }: { r: Reminder; due: boolean }) {
  const s = useApp();
  const router = useRouter();
  const app = r.applicationId ? s.applications.find((a) => a.id === r.applicationId) : null;
  const nowIso = new Date().toISOString();
  const snooze = (days: number) =>
    void s.snoozeReminder(r.id, new Date(Date.now() + days * DAY).toISOString());

  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${
      due ? "border-warn-line bg-warn-bg" : "border-line-2 bg-surface"}`}>
      {typeIcon[r.type]}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{r.title}</p>
        <p className="text-xs text-ink-3">
          {due ? `was due ${relativeDays(r.dueAt, nowIso)}` : `due ${relativeDays(r.snoozedUntil ?? r.dueAt, nowIso)}`}
          {app && (
            <button type="button" className="ml-2 font-semibold text-ink-2 underline"
              onClick={() => { s.selectApp(app.id); router.push("/"); }}>
              {app.company} · {app.role}
            </button>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {[["1d", 1], ["3d", 3], ["1w", 7]].map(([lbl, d]) => (
          <Button key={lbl} variant="ghost" size="sm" onClick={() => snooze(d as number)}
            aria-label={`Snooze ${r.title} for ${lbl}`}>
            {lbl}
          </Button>
        ))}
        <Button variant="secondary" size="sm" onClick={() => void s.completeReminder(r.id)}
          aria-label={`Mark ${r.title} done`}>
          <Check className="h-3.5 w-3.5" aria-hidden /> Done
        </Button>
      </div>
    </li>
  );
}

export function RemindersPage() {
  const s = useApp();
  const nowIso = new Date().toISOString();
  const due = dueReminders(s.reminders, nowIso);
  const dueIds = new Set(due.map((r) => r.id));
  const upcoming = s.reminders
    .filter((r) => !r.done && !dueIds.has(r.id))
    .sort((a, b) => (a.snoozedUntil ?? a.dueAt).localeCompare(b.snoozedUntil ?? b.dueAt));

  return (
    <div className="mx-auto max-w-3xl px-5 pt-6 lg:px-7">
      <h1 className="text-2xl font-extrabold tracking-tight">Reminders</h1>
      <p className="mb-6 text-xs text-ink-3">Follow-ups and interviews, so nothing slips</p>

      <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-3">Due now</h2>
      <ul className="mb-6 flex flex-col gap-2">
        {due.map((r) => <Row key={r.id} r={r} due />)}
        {due.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
            Nothing due — you’re on top of it. 🎯
          </li>
        )}
      </ul>

      <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-3">Upcoming</h2>
      <ul className="flex flex-col gap-2 pb-8">
        {upcoming.map((r) => <Row key={r.id} r={r} due={false} />)}
        {upcoming.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
            No upcoming reminders.
          </li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/reminders/page.tsx`**

```tsx
import type { Metadata } from "next";
import { RemindersPage } from "@/components/reminders/RemindersPage";

export const metadata: Metadata = { title: "Reminders — JobTrackr" };

export default function Page() {
  return <RemindersPage />;
}
```

- [ ] **Step 3: Verify by hand** — seeded Linear follow-up shows under Due now (amber); Done removes it and sidebar badge decrements; Snooze 3d moves it to Upcoming; app link opens the panel on the board.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: reminders page with due/upcoming groups, snooze, and complete"`

---

### Task 20: Settings page

**Files:**
- Create: `src/components/settings/SettingsPage.tsx`, `src/app/settings/page.tsx`

**Interfaces:**
- Consumes: store (stages/tags/settings + all their actions, `resetAllData`, `importData`, `exportJson`), `toCsv`, `ColorPicker`, `Button`, `Dialog`, `toast`, `moveStage`.
- Produces: `/settings` — sections: **Pipeline** (per-stage row: color dot → ColorPicker, name input, up/down reorder buttons, delete; Add column form), **Tags** (rename inline, delete, add), **Preferences** (nudgeDays number input, currency text input), **Appearance** (disabled dark-mode toggle "coming soon"), **Data** (Export JSON / Export CSV download buttons, Import JSON file input with merge/replace radio, Danger zone: clear all data typing `DELETE` to confirm).

- [ ] **Step 1: Create `src/components/settings/SettingsPage.tsx`** (complete file):

```tsx
"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, Moon, Plus, Trash2, Upload } from "lucide-react";
import { useApp } from "@/lib/store";
import { toCsv } from "@/lib/exportio";
import { PALETTE } from "@/lib/palette";
import type { PaletteKey } from "@/lib/types";
import { ColorPicker } from "@/components/board/ColorPicker";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

const input = "rounded-xl border border-line px-3 py-2 text-sm";
const card = "rounded-2xl border border-line-2 bg-surface p-5";
const h2 = "mb-1 text-sm font-bold";
const sub = "mb-4 text-xs text-ink-3";

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const s = useApp();
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [newStage, setNewStage] = useState("");
  const [newTag, setNewTag] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const fileRef = useRef<HTMLInputElement>(null);
  const sorted = [...s.stages].sort((a, b) => a.order - b.order);

  async function onImportFile(file: File) {
    try {
      await s.importData(await file.text(), importMode);
      toast("Import complete", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Import failed", "error");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 pt-6 pb-10 lg:px-7">
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>

      <section aria-label="Pipeline" className={card}>
        <h2 className={h2}>Pipeline</h2>
        <p className={sub}>Rename, reorder, recolor, or add columns. Colors come from the JobTrackr pastel set.</p>
        <ul className="mb-3 flex flex-col gap-2">
          {sorted.map((st, i) => (
            <li key={st.id} className="relative flex items-center gap-2.5">
              <button
                type="button" aria-label={`Change ${st.name} color`} aria-expanded={pickerFor === st.id}
                onClick={() => setPickerFor(pickerFor === st.id ? null : st.id)}
                className="h-5 w-5 shrink-0 rounded-full transition-transform hover:scale-110"
                style={{ background: PALETTE[st.color].hex }}
              />
              {pickerFor === st.id && (
                <ColorPicker
                  value={st.color}
                  onChange={(c: PaletteKey) => void s.recolorStage(st.id, c)}
                  onClose={() => setPickerFor(null)}
                />
              )}
              <label htmlFor={`stage-${st.id}`} className="sr-only">{st.name} column name</label>
              <input id={`stage-${st.id}`} defaultValue={st.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== st.name && void s.renameStage(st.id, e.target.value.trim())}
                className={`${input} flex-1`} />
              <Button variant="ghost" size="sm" aria-label={`Move ${st.name} up`} disabled={i === 0}
                onClick={() => void s.moveStage(st.id, i - 1)}><ArrowUp className="h-3.5 w-3.5" aria-hidden /></Button>
              <Button variant="ghost" size="sm" aria-label={`Move ${st.name} down`} disabled={i === sorted.length - 1}
                onClick={() => void s.moveStage(st.id, i + 1)}><ArrowDown className="h-3.5 w-3.5" aria-hidden /></Button>
              <Button variant="ghost" size="sm" aria-label={`Delete ${st.name} column`}
                onClick={async () => {
                  const ok = await s.removeStage(st.id);
                  if (!ok) toast("Move or delete this column’s cards first.", "error");
                }}><Trash2 className="h-3.5 w-3.5 text-danger" aria-hidden /></Button>
            </li>
          ))}
        </ul>
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          if (!newStage.trim()) return;
          void s.addStage(newStage.trim());
          setNewStage("");
        }}>
          <label htmlFor="new-stage" className="sr-only">New column name</label>
          <input id="new-stage" value={newStage} onChange={(e) => setNewStage(e.target.value)}
            placeholder="New column (e.g. Ghosted, Withdrawn)" className={`${input} flex-1`} />
          <Button type="submit" variant="secondary" size="sm"><Plus className="h-3.5 w-3.5" aria-hidden /> Add</Button>
        </form>
      </section>

      <section aria-label="Tags" className={card}>
        <h2 className={h2}>Tags</h2>
        <p className={sub}>Tags appear as white pills on cards. Rename inline or add your own.</p>
        <ul className="mb-3 flex flex-col gap-2">
          {s.tags.map((t) => (
            <li key={t.id} className="flex items-center gap-2.5">
              <label htmlFor={`tag-${t.id}`} className="sr-only">{t.name} tag name</label>
              <input id={`tag-${t.id}`} defaultValue={t.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== t.name && void s.renameTag(t.id, e.target.value.trim())}
                className={`${input} flex-1`} />
              <Button variant="ghost" size="sm" aria-label={`Delete tag ${t.name}`}
                onClick={() => void s.removeTag(t.id)}>
                <Trash2 className="h-3.5 w-3.5 text-danger" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          if (!newTag.trim()) return;
          void s.addTag(newTag.trim());
          setNewTag("");
        }}>
          <label htmlFor="new-tag" className="sr-only">New tag name</label>
          <input id="new-tag" value={newTag} onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag (e.g. Visa sponsor)" className={`${input} flex-1`} />
          <Button type="submit" variant="secondary" size="sm"><Plus className="h-3.5 w-3.5" aria-hidden /> Add</Button>
        </form>
      </section>

      <section aria-label="Preferences" className={card}>
        <h2 className={h2}>Preferences</h2>
        <p className={sub}>Tune how JobTrackr nudges you.</p>
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="nudge-days" className="mb-1 block text-xs font-semibold text-ink-2">
              Follow-up nudge after (days)
            </label>
            <input id="nudge-days" type="number" min={1} max={60} value={s.settings.nudgeDays}
              onChange={(e) => void s.updateSettings({ nudgeDays: Math.max(1, Number(e.target.value) || 7) })}
              className={`${input} w-28`} />
          </div>
          <div>
            <label htmlFor="currency" className="mb-1 block text-xs font-semibold text-ink-2">Default currency</label>
            <input id="currency" value={s.settings.currency}
              onChange={(e) => void s.updateSettings({ currency: e.target.value.toUpperCase() })}
              className={`${input} w-28`} />
          </div>
        </div>
      </section>

      <section aria-label="Appearance" className={card}>
        <h2 className={h2}>Appearance</h2>
        <p className={sub}>Light mode today. Dark mode is on the roadmap — the whole app is already token-ready.</p>
        <Button variant="secondary" disabled aria-disabled="true">
          <Moon className="h-4 w-4" aria-hidden /> Dark mode — coming soon
        </Button>
      </section>

      <section aria-label="Data" className={card}>
        <h2 className={h2}>Data</h2>
        <p className={sub}>Your data lives in this browser. Export it anytime — it’s yours.</p>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm"
            onClick={() => download("jobtrackr-export.json", s.exportJson(), "application/json")}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Export JSON
          </Button>
          <Button variant="secondary" size="sm"
            onClick={() => download("jobtrackr-applications.csv", toCsv(s), "text/csv")}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Export CSV
          </Button>
        </div>
        <fieldset className="mb-4">
          <legend className="mb-1.5 text-xs font-semibold text-ink-2">Import JSON</legend>
          <div className="mb-2 flex gap-3 text-xs">
            {(["merge", "replace"] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5">
                <input type="radio" name="import-mode" value={m} checked={importMode === m}
                  onChange={() => setImportMode(m)} />
                {m === "merge" ? "Merge into current data" : "Replace everything"}
              </label>
            ))}
          </div>
          <label htmlFor="import-file" className="sr-only">Choose JSON file</label>
          <input id="import-file" ref={fileRef} type="file" accept="application/json"
            onChange={(e) => e.target.files?.[0] && void onImportFile(e.target.files[0])}
            className="text-xs" />
        </fieldset>
        <div className="rounded-xl border border-danger-bg bg-danger-bg/40 p-4">
          <p className="mb-2 text-xs font-bold text-danger">Danger zone</p>
          <p className="mb-2 text-xs text-ink-2">Type <strong>DELETE</strong> to enable the button. This wipes every application, note, and reminder.</p>
          <div className="flex gap-2">
            <label htmlFor="confirm-delete" className="sr-only">Type DELETE to confirm</label>
            <input id="confirm-delete" value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE" className={`${input} w-32`} />
            <Button variant="danger" size="sm" disabled={confirmText !== "DELETE"}
              onClick={() => { void s.resetAllData(); setConfirmText(""); toast("All data cleared", "info"); }}>
              Clear all data
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
```

Note for the implementer: `toCsv(s)` — pass a `Snapshot`-shaped object; the store state includes extra fields (`ready`, `filters`…) which `toCsv` ignores, but TypeScript may complain. If it does, destructure exactly the nine snapshot fields into a literal first.

- [ ] **Step 2: Create `src/app/settings/page.tsx`**

```tsx
import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/SettingsPage";

export const metadata: Metadata = { title: "Settings — JobTrackr" };

export default function Page() {
  return <SettingsPage />;
}
```

- [ ] **Step 3: Verify by hand** — add a "Ghosted" column → appears on board with cycled pastel; reorder with arrows reflects on board; recolor via picker; rename tag propagates to cards; nudge days change updates board nudges; export JSON then Clear all (typed DELETE) then import the JSON back (replace) → everything restored; CSV opens in a spreadsheet with correct quoting.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: settings — pipeline editor, tags, preferences, data export/import"`

---

### Task 21: Playwright smoke test, SEO/a11y sweep, README

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `README.md` (replace scaffold one)
- Modify: `package.json` (e2e script)

**Interfaces:**
- Consumes: the running app.
- Produces: `npm run e2e` green; final quality gates checked.

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Create `e2e/smoke.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("core flow: add job, see it on board and dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Board", exact: true })).toBeVisible();

  // demo data seeded
  await expect(page.getByText("Stripe", { exact: false }).first()).toBeVisible();

  // add a job
  await page.getByRole("button", { name: "Add job" }).click();
  await page.getByLabel("Company *").fill("Acme Corp");
  await page.getByLabel("Role *").fill("QA Engineer");
  await page.getByRole("button", { name: "Add job" }).last().click();
  await expect(page.getByRole("button", { name: /QA Engineer at Acme Corp/ })).toBeVisible();

  // open detail panel
  await page.getByRole("button", { name: /QA Engineer at Acme Corp/ }).click();
  await expect(page.getByRole("dialog", { name: /QA Engineer at Acme Corp/ })).toBeVisible();
  await page.keyboard.press("Escape");

  // dashboard reflects data
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Active applications")).toBeVisible();

  // reminders page renders
  await page.getByRole("link", { name: "Reminders" }).click();
  await expect(page.getByRole("heading", { name: "Reminders" })).toBeVisible();
});
```

Add script: `"e2e": "playwright test"`. Run `npx playwright install chromium` once.

- [ ] **Step 3: Run** — `npm run e2e` → PASS. `npm test` → all unit tests PASS. `npm run build` → clean.

- [ ] **Step 4: Manual quality sweep** (fix anything that fails before committing):
  1. Keyboard-only run: Tab through board — skip link first, then nav, then cards; card drag via Space+arrows; all dialogs escapable; focus visible everywhere.
  2. `npx @axe-core/cli http://localhost:3000` (or browser axe) — no critical violations.
  3. iOS-width check (DevTools 390px): bottom tabs show, columns snap-scroll, detail panel is a full sheet, tap targets ≥44px.
  4. Reduced motion (DevTools emulation): no confetti, no tilt, instant transitions.
  5. Page titles: each route has its own `<title>` (Board inherits root "JobTrackr — Track every job application").

- [ ] **Step 5: Replace `README.md`**

```markdown
# JobTrackr

A beautiful job-hunt tracker: pastel kanban pipeline, follow-up nudges,
interview tracking, and insights. Local-first — your data stays in your browser.

## Stack
Next.js 16 · TypeScript · Tailwind 4 · Zustand · Dexie (IndexedDB) · dnd-kit · Motion · Recharts

## Develop
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (Vitest)
npm run e2e        # smoke test (Playwright)
npm run build      # production build

## Roadmap
Phase 2: CV builder (prebuilt templates, A4 PDF export) ·
Phase 3: cover letters + AI ·
Phase 4: auth + cloud sync, dark mode, PWA
```

- [ ] **Step 6: Commit** — `git add -A && git commit -m "test: playwright smoke test, a11y/SEO sweep, README"`

---

## Plan Self-Review (completed)

- **Spec coverage:** visual system → T1/T2/T12; column personalization → T14; tags white pills → T10/T12; filters + ⌘K → T16; quick-add → T7/T15; detail panel incl. JD snapshot/timeline/interviews/contacts → T17; dashboard funnel/weekly/attention → T18; reminders w/ snooze → T19; settings incl. pipeline editor/tag manager/preferences/appearance slot/export-import/danger zone → T20; motion (tilt/glow/spring/confetti/count-up) → T13/T18; reduced motion → T1 global + per-feature checks; a11y/SEO/responsive → T1/T11/T21; error handling (import validation, persistBroken banner, optimistic writes with `.catch`) → T8/T9/T11; demo seed + clear → T4/T12; testing → per-task + T21.
- **Known simplifications vs spec (accepted):** no live cross-column reflow during drag (drop-target glow + overlay instead — revisit post-MVP if drag feel needs it); delete offers confirm dialogs rather than undo toasts; manual timeline entries exist via `addManualActivity` but no dedicated UI input (notes cover the need); offer-deadline field not modeled (use a custom reminder).
- **Type consistency check:** `columnTints` consumed in T12–T14/T20 matches T2 signature; `moveApplication` returns `{ won }` consistently (T9 def, T13/T17 consumers); `Filters`/`EMPTY_FILTERS` shape consistent T2/T6/T16; store action names consistent across T9 consumers (T14–T20).






