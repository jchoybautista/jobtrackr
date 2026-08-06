# Pipeline Overhaul + Connected Analytics + Applications Table — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5-stage pipeline with 7 role-anchored default stages (Jira-style board management), add connected dashboard analytics (passing rates, ghosted, redrawn funnel), and add a filterable Applications table page — all driven by one source of truth.

**Architecture:** Stages gain a hidden `role` and `pinned` flag; each application records the deepest pipeline stage it has reached (`furthestStageId`), maintained on every move and backfilled by a one-time data migration. All analytics derive from stages-by-role + `furthestStageId`, so the Board, Dashboard, and Applications table always agree. Local-only app (IndexedDB via Dexie, Zustand store, Next.js App Router).

**Tech Stack:** TypeScript, Next.js (App Router), React, Zustand, Dexie, @dnd-kit, Recharts, Tailwind, Vitest + Testing Library.

## Global Constraints

- Local-only: no backend, no network calls. All persistence via `src/lib/repo.ts` → Dexie.
- Palette colors must be valid `PaletteKey`: `pink peach yellow mint sky lavender orchid gray sage blush`.
- Default stage IDs are stable and MUST match existing ones where they already exist: `stage-saved`, `stage-interview`, `stage-offer`, `stage-rejected`. New: `stage-screening`, `stage-technical`, `stage-final`.
- The seven `StageRole` values, verbatim: `saved screening interview technical final rejected offer`.
- Default column order (left→right): **Saved · Screening · Interview · Technical · Final interview · Rejected · Offer**. Saved pinned first, Offer pinned last.
- `ghostDays` default = `14`; `nudgeDays` default stays `7`.
- Ghosted = past Saved, currently in a `pipeline` stage, silent ≥ `ghostDays` days (by `updatedAt`).
- Passing rate with a zero denominator returns `null` and renders as `"—"`.
- WCAG AA: keep existing patterns (semantic elements, `aria-label` on icon-only buttons, visible focus, labelled inputs). New sidebar nav item and table must be keyboard operable.
- Tests live beside code as `*.test.ts(x)` (Vitest, jsdom). Run all tests with `npx vitest run`.
- Type-check with `npx tsc --noEmit`. Every task's final commit must pass both.
- Commit messages end with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

## PHASE 1 — Pipeline model

### Task 1: Types, default stages, default settings

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/seed.ts:7-13` (DEFAULT_STAGES)
- Modify: `src/lib/repo.ts:9-11` (DEFAULT_SETTINGS)
- Test: `src/lib/__tests__/defaults.test.ts`

**Interfaces:**
- Produces:
  - `type StageRole = "saved" | "screening" | "interview" | "technical" | "final" | "rejected" | "offer"`
  - `Stage` gains `role?: StageRole` and `pinned?: boolean`
  - `Application` gains `furthestStageId?: string`
  - `SettingsDoc` gains `ghostDays: number`
  - `DEFAULT_STAGES: Stage[]` — the 7 stages below
  - `DEFAULT_SETTINGS` gains `ghostDays: 14`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/defaults.test.ts
import { describe, it, expect } from "vitest";
import { DEFAULT_STAGES } from "@/lib/seed";
import { DEFAULT_SETTINGS } from "@/lib/repo";

describe("DEFAULT_STAGES", () => {
  it("has the 7 role-anchored stages in order, Saved pinned first, Offer pinned last", () => {
    expect(DEFAULT_STAGES.map((s) => s.role)).toEqual([
      "saved", "screening", "interview", "technical", "final", "rejected", "offer",
    ]);
    expect(DEFAULT_STAGES.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const saved = DEFAULT_STAGES[0];
    const offer = DEFAULT_STAGES[DEFAULT_STAGES.length - 1];
    expect(saved).toMatchObject({ id: "stage-saved", pinned: true, kind: "pipeline" });
    expect(offer).toMatchObject({ id: "stage-offer", pinned: true, kind: "won" });
    expect(DEFAULT_STAGES.find((s) => s.role === "rejected")).toMatchObject({ kind: "lost" });
  });
});

describe("DEFAULT_SETTINGS", () => {
  it("defaults ghostDays to 14 and nudgeDays to 7", () => {
    expect(DEFAULT_SETTINGS.ghostDays).toBe(14);
    expect(DEFAULT_SETTINGS.nudgeDays).toBe(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/defaults.test.ts`
Expected: FAIL — `ghostDays` missing / roles undefined.

- [ ] **Step 3: Implement types**

In `src/lib/types.ts`, add above `Stage`:

```ts
export type StageRole =
  | "saved" | "screening" | "interview" | "technical" | "final" | "rejected" | "offer";
```

Extend `Stage`:

```ts
export interface Stage {
  id: string;
  name: string;
  color: PaletteKey;
  order: number;
  kind: StageKind;
  role?: StageRole;   // default stages only; anchors analytics
  pinned?: boolean;   // saved/offer: not draggable, not deletable
}
```

Extend `Application` (add after `archived?: boolean;`):

```ts
  furthestStageId?: string; // deepest pipeline stage ever reached
```

Extend `SettingsDoc`:

```ts
export interface SettingsDoc {
  id: "singleton";
  nudgeDays: number;
  ghostDays: number;
  currency: string;
  theme: "light";
  demo: boolean;
}
```

- [ ] **Step 4: Implement default stages**

Replace `DEFAULT_STAGES` in `src/lib/seed.ts`:

```ts
export const DEFAULT_STAGES: Stage[] = [
  { id: "stage-saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
  { id: "stage-screening", name: "Screening", color: "sky", order: 1, kind: "pipeline", role: "screening" },
  { id: "stage-interview", name: "Interview", color: "yellow", order: 2, kind: "pipeline", role: "interview" },
  { id: "stage-technical", name: "Technical", color: "peach", order: 3, kind: "pipeline", role: "technical" },
  { id: "stage-final", name: "Final interview", color: "orchid", order: 4, kind: "pipeline", role: "final" },
  { id: "stage-rejected", name: "Rejected", color: "gray", order: 5, kind: "lost", role: "rejected" },
  { id: "stage-offer", name: "Offer", color: "mint", order: 6, kind: "won", role: "offer", pinned: true },
];
```

- [ ] **Step 5: Implement default settings**

In `src/lib/repo.ts`, update `DEFAULT_SETTINGS`:

```ts
export const DEFAULT_SETTINGS: SettingsDoc = {
  id: "singleton", nudgeDays: 7, ghostDays: 14, currency: "USD", theme: "light", demo: false,
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/defaults.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/seed.ts src/lib/repo.ts src/lib/__tests__/defaults.test.ts
git commit -m "feat: role-anchored default stages, ghostDays setting, furthestStageId field"
```

---

### Task 2: Furthest-reached + role helpers

**Files:**
- Create: `src/lib/furthest.ts`
- Test: `src/lib/__tests__/furthest.test.ts`

**Interfaces:**
- Consumes: `Stage`, `Application`, `StageRole` from `./types`.
- Produces:
  - `stageByRole(stages: Stage[], role: StageRole): Stage | undefined`
  - `orderOfRole(stages: Stage[], role: StageRole): number | undefined`
  - `furthestOrderOf(app: Application, stages: Stage[]): number` — order of `furthestStageId` if it is a pipeline stage; else the current stage's order if pipeline; else `-1`.
  - `nextFurthestStageId(app: Application, toStage: Stage, stages: Stage[]): string | undefined` — the new value after moving into `toStage`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/furthest.test.ts
import { describe, it, expect } from "vitest";
import { stageByRole, orderOfRole, furthestOrderOf, nextFurthestStageId } from "@/lib/furthest";
import type { Application, Stage } from "@/lib/types";

const stages: Stage[] = [
  { id: "saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
  { id: "screening", name: "Screening", color: "sky", order: 1, kind: "pipeline", role: "screening" },
  { id: "interview", name: "Interview", color: "yellow", order: 2, kind: "pipeline", role: "interview" },
  { id: "technical", name: "Technical", color: "peach", order: 3, kind: "pipeline", role: "technical" },
  { id: "final", name: "Final", color: "orchid", order: 4, kind: "pipeline", role: "final" },
  { id: "rejected", name: "Rejected", color: "gray", order: 5, kind: "lost", role: "rejected" },
  { id: "offer", name: "Offer", color: "mint", order: 6, kind: "won", role: "offer", pinned: true },
];
const app = (o: Partial<Application>): Application => ({
  id: "a", company: "c", role: "r", tagIds: [], stageId: "saved", order: 0,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...o,
});

describe("role helpers", () => {
  it("finds stages and orders by role", () => {
    expect(stageByRole(stages, "technical")?.id).toBe("technical");
    expect(orderOfRole(stages, "technical")).toBe(3);
    expect(orderOfRole(stages, "screening")).toBe(1);
  });
});

describe("furthestOrderOf", () => {
  it("uses furthestStageId when set", () => {
    expect(furthestOrderOf(app({ stageId: "rejected", furthestStageId: "technical" }), stages)).toBe(3);
  });
  it("falls back to current pipeline stage when unset", () => {
    expect(furthestOrderOf(app({ stageId: "interview" }), stages)).toBe(2);
  });
  it("returns -1 for a terminal app with no furthest recorded", () => {
    expect(furthestOrderOf(app({ stageId: "rejected" }), stages)).toBe(-1);
  });
});

describe("nextFurthestStageId", () => {
  const technical = stages[3];
  const screening = stages[1];
  const rejected = stages[5];
  it("deepens when moving into a deeper pipeline stage", () => {
    expect(nextFurthestStageId(app({ furthestStageId: "screening" }), technical, stages)).toBe("technical");
  });
  it("does not shrink when moving backward", () => {
    expect(nextFurthestStageId(app({ furthestStageId: "technical" }), screening, stages)).toBe("technical");
  });
  it("is unchanged when moving into a terminal stage", () => {
    expect(nextFurthestStageId(app({ furthestStageId: "technical" }), rejected, stages)).toBe("technical");
  });
  it("initializes from undefined", () => {
    expect(nextFurthestStageId(app({ furthestStageId: undefined }), screening, stages)).toBe("screening");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/furthest.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/furthest.ts
import type { Application, Stage, StageRole } from "./types";

export function stageByRole(stages: Stage[], role: StageRole): Stage | undefined {
  return stages.find((s) => s.role === role);
}

export function orderOfRole(stages: Stage[], role: StageRole): number | undefined {
  return stageByRole(stages, role)?.order;
}

export function furthestOrderOf(app: Application, stages: Stage[]): number {
  const byId = (id: string | undefined) => (id ? stages.find((s) => s.id === id) : undefined);
  const furthest = byId(app.furthestStageId);
  if (furthest && furthest.kind === "pipeline") return furthest.order;
  const current = byId(app.stageId);
  if (current && current.kind === "pipeline") return current.order;
  return -1;
}

export function nextFurthestStageId(
  app: Application, toStage: Stage, stages: Stage[],
): string | undefined {
  if (toStage.kind !== "pipeline") return app.furthestStageId;
  const currentOrder = app.furthestStageId
    ? stages.find((s) => s.id === app.furthestStageId)?.order ?? -1
    : -1;
  return toStage.order > currentOrder ? toStage.id : app.furthestStageId;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/furthest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/furthest.ts src/lib/__tests__/furthest.test.ts
git commit -m "feat: furthest-reached and stage-by-role helpers"
```

---

### Task 3: One-time data migration

**Files:**
- Create: `src/lib/migrate.ts`
- Test: `src/lib/__tests__/migrate.test.ts`

**Interfaces:**
- Consumes: `Snapshot`, `Stage`, `Application`, `ActivityEvent` from `./types`; `DEFAULT_STAGES` from `./seed`.
- Produces:
  - `needsMigration(snap: Snapshot): boolean` — true when stored data predates roles/ghostDays.
  - `migrateSnapshot(snap: Snapshot): Snapshot` — returns a fully migrated snapshot (idempotent).
  - `backfillFurthest(app: Application, events: ActivityEvent[], stages: Stage[]): string | undefined`

**Migration rules:**
- Stages: rebuild from `DEFAULT_STAGES` (canonical role/name/kind/pinned/order), preserving each existing stage's `color` when an id matches. Any existing stage whose id is NOT one of the seven defaults (e.g. legacy `stage-applied`) is kept as a roleless custom stage, inserted just before the Rejected stage, in its existing relative order. Orders are reindexed 0..n-1.
- Applications: set `furthestStageId` via `backfillFurthest` (deepest pipeline stage among the app's current stage + any stage named in its `stage_move` events).
- Settings: set `ghostDays` to 14 if missing.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/migrate.test.ts
import { describe, it, expect } from "vitest";
import { needsMigration, migrateSnapshot, backfillFurthest } from "@/lib/migrate";
import type { ActivityEvent, Application, Snapshot, Stage } from "@/lib/types";
import { DEFAULT_STAGES } from "@/lib/seed";

const legacyStages: Stage[] = [
  { id: "stage-saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline" },
  { id: "stage-applied", name: "Applied", color: "pink", order: 1, kind: "pipeline" },
  { id: "stage-interview", name: "Interview", color: "blush", order: 2, kind: "pipeline" },
  { id: "stage-offer", name: "Offer", color: "mint", order: 3, kind: "won" },
  { id: "stage-rejected", name: "Rejected", color: "gray", order: 4, kind: "lost" },
];
const legacySettings = { id: "singleton" as const, nudgeDays: 7, currency: "USD", theme: "light" as const, demo: false };
const app = (o: Partial<Application>): Application => ({
  id: "a", company: "c", role: "r", tagIds: [], stageId: "stage-saved", order: 0,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...o,
});
const snap = (o: Partial<Snapshot> = {}): Snapshot => ({
  stages: legacyStages, applications: [], tags: [], interviews: [], contacts: [],
  events: [], notes: [], reminders: [], settings: legacySettings as Snapshot["settings"],
  profile: null, cvdocs: [], ...o,
});

describe("needsMigration", () => {
  it("true when no stage has a role", () => {
    expect(needsMigration(snap())).toBe(true);
  });
  it("false once stages are role-anchored and ghostDays is set", () => {
    expect(needsMigration(snap({
      stages: DEFAULT_STAGES,
      settings: { ...legacySettings, ghostDays: 14 } as Snapshot["settings"],
    }))).toBe(false);
  });
});

describe("migrateSnapshot", () => {
  it("stamps roles, keeps legacy Applied as custom before Rejected, pins ends", () => {
    const m = migrateSnapshot(snap());
    // Saved first pinned, Offer last pinned
    expect(m.stages[0]).toMatchObject({ id: "stage-saved", role: "saved", pinned: true, order: 0 });
    expect(m.stages[m.stages.length - 1]).toMatchObject({ id: "stage-offer", role: "offer", pinned: true });
    // all 7 default roles present
    expect(new Set(m.stages.map((s) => s.role))).toEqual(
      new Set(["saved", "screening", "interview", "technical", "final", "rejected", "offer", undefined]),
    );
    // legacy Applied preserved, roleless, immediately before Rejected
    const applied = m.stages.find((s) => s.id === "stage-applied")!;
    const rejected = m.stages.find((s) => s.role === "rejected")!;
    expect(applied.role).toBeUndefined();
    expect(applied.order).toBe(rejected.order - 1);
    // existing color preserved for a matched default
    expect(m.stages.find((s) => s.id === "stage-interview")!.color).toBe("blush");
    // orders are contiguous
    expect(m.stages.map((s) => s.order)).toEqual(m.stages.map((_, i) => i));
    expect(m.settings.ghostDays).toBe(14);
  });

  it("is idempotent", () => {
    const once = migrateSnapshot(snap());
    const twice = migrateSnapshot(once);
    expect(twice.stages).toEqual(once.stages);
  });
});

describe("backfillFurthest", () => {
  const migrated = migrateSnapshot(snap()).stages;
  it("recovers the deepest pipeline stage from stage_move events for a rejected app", () => {
    const events: ActivityEvent[] = [
      { id: "e1", applicationId: "a", kind: "stage_move", message: "Moved to Screening", at: "x" },
      { id: "e2", applicationId: "a", kind: "stage_move", message: "Moved to Technical", at: "y" },
      { id: "e3", applicationId: "a", kind: "stage_move", message: "Moved to Rejected", at: "z" },
    ];
    const id = backfillFurthest(app({ stageId: "stage-rejected" }), events, migrated);
    expect(migrated.find((s) => s.id === id)!.role).toBe("technical");
  });
  it("uses current pipeline stage when there is no history", () => {
    const id = backfillFurthest(app({ stageId: "stage-interview" }), [], migrated);
    expect(migrated.find((s) => s.id === id)!.role).toBe("interview");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/migrate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/migrate.ts
import type { ActivityEvent, Application, Snapshot, Stage } from "./types";
import { DEFAULT_STAGES } from "./seed";

const DEFAULT_IDS = new Set(DEFAULT_STAGES.map((s) => s.id));

export function needsMigration(snap: Snapshot): boolean {
  const stagesUnstamped = !snap.stages.some((s) => s.role);
  const settingsMissing = typeof snap.settings.ghostDays !== "number";
  return stagesUnstamped || settingsMissing;
}

function migrateStages(existing: Stage[]): Stage[] {
  // Canonical defaults, preserving any existing color for matched ids.
  const canonical: Stage[] = DEFAULT_STAGES.map((d) => {
    const match = existing.find((e) => e.id === d.id);
    return match ? { ...d, color: match.color } : { ...d };
  });
  // Legacy custom stages (roleless, non-default ids), kept in their existing order.
  const customs = existing
    .filter((e) => !DEFAULT_IDS.has(e.id))
    .sort((a, b) => a.order - b.order)
    .map((e) => ({ ...e, role: undefined, pinned: undefined }));

  const rejectedIdx = canonical.findIndex((s) => s.role === "rejected");
  const withCustoms = [
    ...canonical.slice(0, rejectedIdx),
    ...customs,
    ...canonical.slice(rejectedIdx),
  ];
  return withCustoms.map((s, i) => ({ ...s, order: i }));
}

export function backfillFurthest(
  app: Application, events: ActivityEvent[], stages: Stage[],
): string | undefined {
  const names = new Map(stages.map((s) => [s.name, s]));
  const candidates: Stage[] = [];
  const current = stages.find((s) => s.id === app.stageId);
  if (current) candidates.push(current);
  for (const ev of events) {
    if (ev.applicationId !== app.id || ev.kind !== "stage_move") continue;
    const name = ev.message.replace(/^Moved to /, "");
    const st = names.get(name);
    if (st) candidates.push(st);
  }
  const deepest = candidates
    .filter((s) => s.kind === "pipeline")
    .sort((a, b) => b.order - a.order)[0];
  return deepest?.id;
}

export function migrateSnapshot(snap: Snapshot): Snapshot {
  const stages = migrateStages(snap.stages);
  const applications = snap.applications.map((a) => ({
    ...a, furthestStageId: backfillFurthest(a, snap.events, stages),
  }));
  const settings = {
    ...snap.settings,
    ghostDays: typeof snap.settings.ghostDays === "number" ? snap.settings.ghostDays : 14,
  };
  return { ...snap, stages, applications, settings };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/migrate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/migrate.ts src/lib/__tests__/migrate.test.ts
git commit -m "feat: one-time migration to role-anchored stages with furthest backfill"
```

---

### Task 4: Wire migration into hydrate + maintain furthest on writes

**Files:**
- Modify: `src/lib/store.ts` (`hydrate`, `addApplication`, `moveApplication`)
- Test: `src/lib/__tests__/store-furthest.test.ts`

**Interfaces:**
- Consumes: `nextFurthestStageId` (Task 2); `needsMigration`, `migrateSnapshot` (Task 3); `repo.importSnapshot`, `repo.loadAll`, `repo.putApplications`.
- Produces: store behavior — after `hydrate`, legacy data is migrated & persisted; `addApplication` sets `furthestStageId`; `moveApplication` updates it.

- [ ] **Step 1: Write the failing test**

The store persists through `repo` → Dexie. Test the two pure-ish behaviors that don't need IndexedDB by extracting a helper, then assert wiring by reading the module. First add a small pure helper used by the store and test it directly.

```ts
// src/lib/__tests__/store-furthest.test.ts
import { describe, it, expect } from "vitest";
import { applyFurthestOnMove } from "@/lib/furthest";
import type { Application, Stage } from "@/lib/types";

const stages: Stage[] = [
  { id: "saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
  { id: "technical", name: "Technical", color: "peach", order: 3, kind: "pipeline", role: "technical" },
  { id: "rejected", name: "Rejected", color: "gray", order: 5, kind: "lost", role: "rejected" },
];
const base: Application = {
  id: "a", company: "c", role: "r", tagIds: [], stageId: "saved", order: 0,
  createdAt: "x", updatedAt: "x", furthestStageId: "saved",
};

describe("applyFurthestOnMove", () => {
  it("deepens furthest when moving forward", () => {
    const out = applyFurthestOnMove(base, "technical", stages);
    expect(out.furthestStageId).toBe("technical");
  });
  it("keeps furthest when moving into terminal", () => {
    const moved = { ...base, furthestStageId: "technical" };
    expect(applyFurthestOnMove(moved, "rejected", stages).furthestStageId).toBe("technical");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/store-furthest.test.ts`
Expected: FAIL — `applyFurthestOnMove` not exported.

- [ ] **Step 3: Add the helper to `src/lib/furthest.ts`**

```ts
export function applyFurthestOnMove(
  app: Application, toStageId: string, stages: Stage[],
): Application {
  const toStage = stages.find((s) => s.id === toStageId);
  if (!toStage) return app;
  return { ...app, furthestStageId: nextFurthestStageId(app, toStage, stages) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/store-furthest.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire migration into `hydrate`**

In `src/lib/store.ts`, add imports:

```ts
import { needsMigration, migrateSnapshot } from "./migrate";
import { applyFurthestOnMove } from "./furthest";
```

Replace the body of `hydrate`:

```ts
  async hydrate() {
    try {
      await seedIfEmpty();
      let snap = await repo.loadAll();
      if (needsMigration(snap)) {
        snap = migrateSnapshot(snap);
        await repo.importSnapshot(snap, "replace");
        snap = await repo.loadAll();
      }
      set(() => ({ ...snap, ready: true }));
    } catch {
      set(() => ({
        stages: DEFAULT_STAGES, tags: PRESET_TAGS,
        settings: repo.DEFAULT_SETTINGS, profile: null, cvdocs: [],
        ready: true, persistBroken: true,
      }));
    }
  },
```

- [ ] **Step 6: Set furthest in `addApplication`**

In `addApplication`, after computing `stageId` and before building `app`, compute the initial furthest and include it:

```ts
    const stage = s.stages.find((st) => st.id === stageId);
    const furthestStageId = stage?.kind === "pipeline" ? stageId : undefined;
    const app: Application = {
      tagIds: [], furthestStageId, ...input, id: newId(), stageId, order,
      createdAt: nowIso(), updatedAt: nowIso(),
    };
```

(Placing `...input` after `furthestStageId` lets an explicit input override it if ever provided.)

- [ ] **Step 7: Update furthest in `moveApplication`**

Replace the persistence portion of `moveApplication` so the moved app's `furthestStageId` is updated:

```ts
  async moveApplication(id, toStageId, toIndex) {
    const s = get();
    const stage = s.stages.find((st) => st.id === toStageId);
    const before = s.applications.find((a) => a.id === id);
    let moved = moveCard(s.applications, id, toStageId, toIndex, nowIso());
    moved = moved.map((a) => (a.id === id ? applyFurthestOnMove(a, toStageId, s.stages) : a));
    set(() => ({ applications: moved }));
    const changed = moved.filter((a, i) => a !== s.applications[i]);
    await repo.putApplications(changed).catch(() => {});
    if (stage && before && before.stageId !== toStageId) {
      await logEvent(set, id, "stage_move", `Moved to ${stage.name}`);
    }
    return { won: stage?.kind === "won" && before?.stageId !== toStageId };
  },
```

- [ ] **Step 8: Run the full suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS. (Existing `selectors.test.ts` still passes here — it is rewritten in Task 9.)

- [ ] **Step 9: Commit**

```bash
git add src/lib/store.ts src/lib/furthest.ts src/lib/__tests__/store-furthest.test.ts
git commit -m "feat: run stage migration on hydrate and maintain furthestStageId on writes"
```

---

### Task 5: Pin-aware stage ordering + delete-with-reassign

**Files:**
- Modify: `src/lib/ordering.ts`
- Modify: `src/lib/store.ts` (`addStage`, `moveStage`, `removeStage`)
- Test: `src/lib/__tests__/ordering-pins.test.ts`

**Interfaces:**
- Consumes: `Stage`, `Application` from `./types`; existing `reorderStages`.
- Produces:
  - `reorderStagesPinned(stages: Stage[], stageId: string, toIndex: number): Stage[]`
  - `reassignStageCards(apps: Application[], fromStageId: string, toStageId: string): Application[]`
  - Store: `addStage` inserts before the pinned-last stage; `moveStage` uses `reorderStagesPinned`; `removeStage` blocks pinned, otherwise moves cards to the previous stage then deletes. `removeStage` returns `false` only when the stage is pinned.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/ordering-pins.test.ts
import { describe, it, expect } from "vitest";
import { reorderStagesPinned, reassignStageCards } from "@/lib/ordering";
import type { Application, Stage } from "@/lib/types";

const stages: Stage[] = [
  { id: "saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
  { id: "a", name: "A", color: "sky", order: 1, kind: "pipeline" },
  { id: "b", name: "B", color: "yellow", order: 2, kind: "pipeline" },
  { id: "rejected", name: "Rejected", color: "gray", order: 3, kind: "lost", role: "rejected" },
  { id: "offer", name: "Offer", color: "mint", order: 4, kind: "won", role: "offer", pinned: true },
];

describe("reorderStagesPinned", () => {
  it("keeps a pinned stage from moving", () => {
    expect(reorderStagesPinned(stages, "saved", 3)).toEqual(stages);
  });
  it("clamps a move past the pinned-last stage", () => {
    const out = reorderStagesPinned(stages, "a", 4); // try to drop after Offer
    expect(out[out.length - 1].id).toBe("offer"); // Offer still last
    expect(out.map((s) => s.order)).toEqual([0, 1, 2, 3, 4]);
    expect(out.find((s) => s.id === "a")!.order).toBe(3); // just before rejected
  });
  it("clamps a move before the pinned-first stage", () => {
    const out = reorderStagesPinned(stages, "b", 0);
    expect(out[0].id).toBe("saved"); // Saved still first
    expect(out.find((s) => s.id === "b")!.order).toBe(1);
  });
});

describe("reassignStageCards", () => {
  const apps: Application[] = [
    { id: "x", company: "c", role: "r", tagIds: [], stageId: "a", order: 0, createdAt: "t", updatedAt: "t" },
    { id: "y", company: "c", role: "r", tagIds: [], stageId: "b", order: 0, createdAt: "t", updatedAt: "t" },
  ];
  it("moves cards from one stage to another", () => {
    const out = reassignStageCards(apps, "a", "b");
    expect(out.find((a) => a.id === "x")!.stageId).toBe("b");
    expect(out.find((a) => a.id === "y")!.stageId).toBe("b");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ordering-pins.test.ts`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement in `src/lib/ordering.ts`**

Append:

```ts
export function reorderStagesPinned(stages: Stage[], stageId: string, toIndex: number): Stage[] {
  const moving = stages.find((s) => s.id === stageId);
  if (!moving || moving.pinned) return stages;
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const lo = sorted[0]?.pinned ? 1 : 0;
  const hi = sorted[sorted.length - 1]?.pinned ? sorted.length - 2 : sorted.length - 1;
  const clamped = Math.max(lo, Math.min(toIndex, hi));
  return reorderStages(stages, stageId, clamped);
}

export function reassignStageCards(
  apps: Application[], fromStageId: string, toStageId: string,
): Application[] {
  const base = apps.filter((a) => a.stageId === toStageId).length;
  let n = 0;
  return apps.map((a) =>
    a.stageId === fromStageId ? { ...a, stageId: toStageId, order: base + n++ } : a);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ordering-pins.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the store**

In `src/lib/store.ts` add import:

```ts
import { moveCard, reorderStages, reorderStagesPinned, reassignStageCards } from "./ordering";
```

Replace `addStage` so new columns land just before the pinned-last stage:

```ts
  async addStage(name) {
    const s = get();
    const color = PALETTE_KEYS[s.stages.length % PALETTE_KEYS.length];
    const stage = { id: newId(), name, color, order: s.stages.length, kind: "pipeline" as const };
    const sorted = [...s.stages, stage].sort((a, b) => a.order - b.order);
    const lastPinned = sorted[sorted.length - 2]?.pinned ? sorted.length - 1 : sorted.length;
    const next = reorderStages(sorted, stage.id, lastPinned - 1);
    set(() => ({ stages: next }));
    await repo.putStages(next).catch(() => {});
  },
```

Replace `moveStage`:

```ts
  async moveStage(id, toIndex) {
    const next = reorderStagesPinned(get().stages, id, toIndex);
    set(() => ({ stages: next }));
    await repo.putStages(next).catch(() => {});
  },
```

Replace `removeStage` (pinned blocked; otherwise move cards to previous stage, then delete & reindex):

```ts
  async removeStage(id) {
    const s = get();
    const stage = s.stages.find((st) => st.id === id);
    if (!stage || stage.pinned) return false;
    const sorted = [...s.stages].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((st) => st.id === id);
    const target = sorted[idx - 1] ?? sorted[idx + 1]; // previous, else next
    let apps = s.applications;
    if (target) apps = reassignStageCards(apps, id, target.id);
    const stages = sorted.filter((st) => st.id !== id).map((st, i) => ({ ...st, order: i }));
    set(() => ({ stages, applications: apps }));
    await repo.putStages(stages).catch(() => {});
    const moved = apps.filter((a, i) => a !== s.applications[i]);
    if (moved.length) await repo.putApplications(moved).catch(() => {});
    await repo.deleteStage(id).catch(() => {});
    return true;
  },
```

- [ ] **Step 6: Run the full suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ordering.ts src/lib/store.ts src/lib/__tests__/ordering-pins.test.ts
git commit -m "feat: pin-aware stage reordering and delete-with-card-reassign"
```

---

### Task 6: Settings UI — lock default names, pins, delete-with-cards

**Files:**
- Modify: `src/components/settings/SettingsPage.tsx`
- Modify: `src/components/ui/SortableList.tsx` (support a per-item non-draggable flag) — inspect first; if it lacks a disable option, add an optional `isDraggable?: (item) => boolean` prop.
- Test: `src/components/settings/__tests__/SettingsPage.test.tsx` (extend existing)

**Interfaces:**
- Consumes: store `stages` with `role`/`pinned`; `removeStage` now moves cards; `settings.ghostDays`.
- Produces: default stages show a disabled (locked) name input; pinned stages are not draggable and show no delete button; the delete confirmation copy no longer claims cards must be moved out first; Preferences gains a Ghosted-after (days) input bound to `ghostDays`.

- [ ] **Step 1: Read `SortableList` to learn its API**

Run: `sed -n '1,80p' src/components/ui/SortableList.tsx`
Note whether items can be made non-draggable. If not, add an optional prop `isDraggable?: (item: T) => boolean` (default `() => true`) that, when false, renders the row without drag listeners/handle.

- [ ] **Step 2: Write the failing test**

```tsx
// add to src/components/settings/__tests__/SettingsPage.test.tsx
import { render, screen } from "@testing-library/react";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { useApp } from "@/lib/store";
import { DEFAULT_STAGES } from "@/lib/seed";
import { DEFAULT_SETTINGS } from "@/lib/repo";
import { beforeEach, it, expect } from "vitest";

beforeEach(() => {
  useApp.setState({
    stages: DEFAULT_STAGES, applications: [], tags: [], settings: DEFAULT_SETTINGS,
    interviews: [], contacts: [], events: [], notes: [], reminders: [],
    profile: null, cvdocs: [], ready: true,
  });
});

it("locks default stage name inputs and hides delete on pinned stages", () => {
  render(<SettingsPage />);
  const savedInput = screen.getByLabelText("Saved column name") as HTMLInputElement;
  expect(savedInput).toBeDisabled();
  expect(screen.queryByLabelText("Delete Saved column")).toBeNull();   // pinned → no delete
  expect(screen.queryByLabelText("Delete Offer column")).toBeNull();   // pinned → no delete
  expect(screen.getByLabelText("Delete Screening column")).toBeInTheDocument(); // default, deletable
});

it("exposes a Ghosted-after preference bound to ghostDays", () => {
  render(<SettingsPage />);
  const input = screen.getByLabelText(/Ghosted after/i) as HTMLInputElement;
  expect(input.value).toBe("14");
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/settings/__tests__/SettingsPage.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implement**

In `SettingsPage.tsx`, inside the `SortableList` render callback:
- Add `disabled={!!st.role}` to the stage name `<input>` and, when locked, a `title="Default stage names are fixed"`.
- Wrap the delete `<Button>` in `{!st.pinned && ( … )}`.
- Pass `isDraggable={(st) => !st.pinned}` to `SortableList` (and render the grip only when draggable).

Update the delete confirmation block copy:

```tsx
<p className="mb-3 text-xs font-medium">
  Delete the “{sorted.find((st) => st.id === confirmStage)?.name}” column? Any cards move to the column on its left.
</p>
```

And simplify the confirm handler (delete no longer fails on cards; it only returns false for pinned, which have no delete button):

```tsx
<Button variant="danger" size="sm" onClick={async () => {
  await s.removeStage(confirmStage);
  setConfirmStage(null);
}}>Delete column</Button>
```

Add the Ghosted-after preference to the Preferences section. Extend the `prefs`/`prefDraft` objects (currently `{ nudgeDays, currency }`) to include `ghostDays`:

```tsx
const prefs = { nudgeDays: s.settings.nudgeDays, ghostDays: s.settings.ghostDays, currency: s.settings.currency };
```

And add a field next to the nudge input:

```tsx
<div>
  <label htmlFor="ghost-days" className="mb-1 block text-xs font-semibold text-ink-2">
    Ghosted after (days)
  </label>
  <input id="ghost-days" type="number" min={1} max={90} value={prefDraft.ghostDays}
    onChange={(e) => setPrefEdits({ ...prefEdits, ghostDays: Math.max(1, Number(e.target.value) || 14) })}
    className={`${input} w-28`} />
</div>
```

`setPrefEdits`'s type widens automatically from `Partial<{ nudgeDays; currency }>` — update the `useState` generic to `Partial<{ nudgeDays: number; ghostDays: number; currency: string }>`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/settings/__tests__/SettingsPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/settings/SettingsPage.tsx src/components/ui/SortableList.tsx src/components/settings/__tests__/SettingsPage.test.tsx
git commit -m "feat: lock default stage names, protect pinned stages in Settings"
```

---

### Task 7: Board column — lock rename, delete-with-cards, quick-add card

**Files:**
- Modify: `src/components/board/ColumnMenu.tsx`
- Modify: `src/components/board/Column.tsx`
- Modify: `src/components/board/AddJobDialog.tsx` (accept `initialStageId`)
- Modify: `src/components/board/BoardPage.tsx` (wire quick-add)
- Test: `src/components/board/__tests__/ColumnMenu.test.tsx`

**Interfaces:**
- Consumes: store; `Stage.role`/`pinned`.
- Produces:
  - `ColumnMenu`: Rename hidden when `stage.role` set; Delete hidden when `stage.pinned`; Delete no longer blocked by cards (opens confirm directly).
  - `AddJobDialog` gains prop `initialStageId?: string` that seeds the Column select and resets to it on open.
  - `Column` gains prop `onQuickAdd: (stageId: string) => void`; a hover-revealed "+ Add" button at the bottom of the card list calls it.
  - `BoardPage` holds `quickAddStage` state, passes `onQuickAdd`, and renders `<AddJobDialog … initialStageId={quickAddStage} />`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/board/__tests__/ColumnMenu.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColumnMenu } from "@/components/board/ColumnMenu";
import { useApp } from "@/lib/store";
import type { Stage } from "@/lib/types";
import { beforeEach, it, expect } from "vitest";

const stage = (o: Partial<Stage>): Stage =>
  ({ id: "s", name: "Screening", color: "sky", order: 1, kind: "pipeline", ...o });

beforeEach(() => {
  useApp.setState({ applications: [], stages: [], ready: true });
});

it("hides Rename for default (role) stages", async () => {
  render(<ColumnMenu stage={stage({ role: "screening" })} />);
  await userEvent.click(screen.getByLabelText("Screening column menu"));
  expect(screen.queryByText("Rename")).toBeNull();
  expect(screen.getByText("Delete")).toBeInTheDocument();
});

it("hides Delete for pinned stages", async () => {
  render(<ColumnMenu stage={stage({ name: "Offer", role: "offer", pinned: true, kind: "won" })} />);
  await userEvent.click(screen.getByLabelText("Offer column menu"));
  expect(screen.queryByText("Delete")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/board/__tests__/ColumnMenu.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `ColumnMenu`**

- Compute `const locked = !!stage.role;` and `const pinned = !!stage.pinned;`.
- Render the Rename button only when `!locked`.
- Render the Delete button only when `!pinned`, and its `onClick` opens the confirm dialog directly (drop the `hasCards` guard/toast):

```tsx
{!pinned && (
  <button type="button"
    onClick={() => { setOpen(false); setConfirmDelete(true); }}
    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-danger hover:bg-danger-bg">
    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
  </button>
)}
```

Update the confirm dialog copy:

```tsx
<p className="mb-4 text-sm text-ink-2">“{stage.name}” will be removed; any cards move to the column on its left.</p>
```

Remove the now-unused `hasCards`/`toast` references if no longer used.

- [ ] **Step 4: Implement `AddJobDialog` `initialStageId`**

Change the signature and seed the form when the dialog opens:

```tsx
export function AddJobDialog(
  { open, onClose, initialStageId }: { open: boolean; onClose: () => void; initialStageId?: string },
) {
  const { stages, tags, addApplication } = useApp();
  const [form, setForm] = useState(EMPTY);
  useEffect(() => {
    if (open) setForm({ ...EMPTY, stageId: initialStageId ?? "" });
  }, [open, initialStageId]);
  // …rest unchanged
```

Add `import { useEffect, useState } from "react";` (merge with existing import).

- [ ] **Step 5: Implement `Column` quick-add**

Add `onQuickAdd: (stageId: string) => void;` to `ColumnProps`. At the end of the card-list `<div>` (after the `apps.length === 0` block), add:

```tsx
          <button
            type="button"
            onClick={() => onQuickAdd(stage.id)}
            className="mt-0.5 flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium text-ink-3 opacity-0 transition-opacity hover:bg-sunken focus-visible:opacity-100 group-hover/col:opacity-100"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add
          </button>
```

Add `import { Plus } from "lucide-react";`. Add `group/col` to the column `<section>` className so the hover reveal works: change the section class to include `group/col`.

- [ ] **Step 6: Wire `BoardPage`**

Add state and pass-through:

```tsx
const [quickAddStage, setQuickAddStage] = useState<string | undefined>(undefined);
```

In each `<Column … />`, add `onQuickAdd={(stageId) => { setQuickAddStage(stageId); setAddOpen(true); }}`.

Change the dialog to `<AddJobDialog open={addOpen} onClose={() => { setAddOpen(false); setQuickAddStage(undefined); }} initialStageId={quickAddStage} />`.

- [ ] **Step 7: Run test + typecheck**

Run: `npx vitest run src/components/board/__tests__/ColumnMenu.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/board/ColumnMenu.tsx src/components/board/Column.tsx src/components/board/AddJobDialog.tsx src/components/board/BoardPage.tsx src/components/board/__tests__/ColumnMenu.test.tsx
git commit -m "feat: board column rename lock, delete-with-cards, hover quick-add card"
```

---

### Task 8: Board — add-column affordance + drag-reorder columns

**Files:**
- Create: `src/components/board/AddColumn.tsx`
- Modify: `src/components/board/BoardPage.tsx`
- Modify: `src/components/board/DragBoard.tsx` (handle column drags)
- Modify: `src/components/board/Column.tsx` (make header a column drag handle)
- Test: `src/components/board/__tests__/AddColumn.test.tsx`

**Interfaces:**
- Consumes: store `addStage`, `moveStage`; `Stage.pinned`.
- Produces:
  - `<AddColumn />` — a far-right ghost column; click reveals an inline input; submit calls `addStage`.
  - Column drag: non-pinned column headers are draggable (sortable id = `col:<stageId>`); dropping reorders via `moveStage`. Card drags (id = plain app id) are unaffected.

**Design notes for column drag:** In `DragBoard`, columns and cards share one `DndContext`. Distinguish by id prefix: column sortable ids are `col:<stageId>`; card ids are plain application ids. In `onDragEnd`, if `active.id` starts with `col:`, resolve a column reorder; otherwise run the existing card logic. Wrap the column row in a horizontal `SortableContext` whose items are `col:<stageId>` for every stage; pinned stages use `useSortable({ id, disabled: true })`.

- [ ] **Step 1: Write the failing test (add-column)**

```tsx
// src/components/board/__tests__/AddColumn.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddColumn } from "@/components/board/AddColumn";
import { useApp } from "@/lib/store";
import { beforeEach, it, expect, vi } from "vitest";

beforeEach(() => {
  useApp.setState({ stages: [], applications: [], ready: true });
});

it("adds a column via the inline input", async () => {
  const addStage = vi.fn().mockResolvedValue(undefined);
  useApp.setState({ addStage } as never);
  render(<AddColumn />);
  await userEvent.click(screen.getByRole("button", { name: /add column/i }));
  await userEvent.type(screen.getByLabelText("New column name"), "Take-home");
  await userEvent.keyboard("{Enter}");
  expect(addStage).toHaveBeenCalledWith("Take-home");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/board/__tests__/AddColumn.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `AddColumn`**

```tsx
// src/components/board/AddColumn.tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useApp } from "@/lib/store";

export function AddColumn() {
  const addStage = useApp((s) => s.addStage);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) { setAdding(false); return; }
    void addStage(trimmed);
    setName(""); setAdding(false);
  }

  return (
    <section aria-label="Add column" className="flex w-[248px] shrink-0 snap-start flex-col">
      {adding ? (
        <div className="rounded-2xl border border-line-2 bg-surface p-2">
          <label htmlFor="new-column" className="sr-only">New column name</label>
          <input
            id="new-column" autoFocus value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setAdding(false); }}
            onBlur={submit}
            placeholder="Column name"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <button
          type="button" onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-2xl border border-dashed border-line px-3 py-2.5 text-xs font-medium text-ink-3 hover:bg-sunken"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add column
        </button>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/board/__tests__/AddColumn.test.tsx`
Expected: PASS.

- [ ] **Step 5: Render `AddColumn` on the board**

In `BoardPage.tsx`, import it and place it after the `s.stages.map(...)` inside the flex row:

```tsx
          ))}
          <AddColumn />
        </div>
```

- [ ] **Step 6: Add column drag-reorder to `DragBoard`**

Wrap `children` in a horizontal `SortableContext` and branch `onDragEnd` on the `col:` prefix. Add imports:

```tsx
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
```

At the top of `onDragEnd`, before the existing card logic:

```tsx
    if (String(active.id).startsWith("col:")) {
      const fromId = String(active.id).slice(4);
      const overId = String(over.id).startsWith("col:") ? String(over.id).slice(4) : null;
      if (!overId || overId === fromId) return;
      const sorted = [...s.stages].sort((a, b) => a.order - b.order);
      const toIndex = sorted.findIndex((st) => st.id === overId);
      await s.moveStage(fromId, toIndex);
      return;
    }
```

Wrap the rendered board. In `BoardPage`, wrap the column row's `SortableContext` OR add it in `DragBoard` around `{children}`:

```tsx
      <SortableContext
        items={s.stages.map((st) => `col:${st.id}`)}
        strategy={horizontalListSortingStrategy}
      >
        {children}
      </SortableContext>
```

(`s` here is the store already read at the top of `DragBoard`.)

- [ ] **Step 7: Make the column header a drag handle**

In `Column.tsx`, import `useSortable`:

```tsx
import { useSortable } from "@dnd-kit/sortable";
```

Inside `Column`, add:

```tsx
  const sortable = useSortable({ id: `col:${stage.id}`, disabled: !!stage.pinned });
```

Apply to the `<section>`: `ref={sortable.setNodeRef}` and a style merging `CSS.Transform.toString(sortable.transform)` + `sortable.transition`. Spread `{...sortable.attributes} {...sortable.listeners}` onto the `<h2>` title (so dragging the title moves the column, while the color dot and menu buttons stay clickable). Pinned columns (`disabled`) render without a grabbable title (guard the listeners spread with `!stage.pinned`).

- [ ] **Step 8: Manual verification (drag needs a real browser)**

Column drag can't be exercised in jsdom. Verify in Task 14's live check. Here, just confirm the suite + typecheck pass.

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/board/AddColumn.tsx src/components/board/BoardPage.tsx src/components/board/DragBoard.tsx src/components/board/Column.tsx src/components/board/__tests__/AddColumn.test.tsx
git commit -m "feat: add-column affordance and drag-reorder columns on the board"
```

---

## PHASE 2 — Dashboard analytics

### Task 9: Metrics — passing rates, ghosted, redrawn funnel

**Files:**
- Modify: `src/lib/selectors.ts` (`Metrics`, `computeMetrics`)
- Modify: `src/lib/__tests__/selectors.test.ts` (rewrite the `computeMetrics` block to the new model + stages)
- Test: same file

**Interfaces:**
- Consumes: `furthestOrderOf`, `orderOfRole`, `stageByRole` (Task 2); `SettingsDoc.ghostDays`.
- Produces — extended `Metrics`:

```ts
export interface Metrics {
  total: number; active: number; offers: number; applied: number;
  responseRate: number;
  interviewPassRate: number | null;
  technicalPassRate: number | null;
  screeningCount: number;
  rejectedCount: number;
  ghostedCount: number;
  weekly: { label: string; count: number }[];
  funnel: { label: string; count: number; pct: number }[];
}
```

**Definitions (verbatim):**
- `appliedApps` — apps where current stage `kind !== "pipeline"` OR current stage `order > 0`.
- `reached(role)` — `furthestOrderOf(app) >= orderOfRole(role)` (both defined).
- `passed(role)` — `furthestOrderOf(app) > orderOfRole(role)` OR current stage `kind === "won"`.
- `passRate(role)` — `denom = count(reached(role))`; `num = count(passed(role))`; `denom === 0 ? null : num / denom`.
- `ghosted` — current stage `kind === "pipeline"` AND `role !== "saved"` (past Saved) AND `(now - Date.parse(updatedAt)) / DAY >= ghostDays`.
- `responseRate` — among `appliedApps`: `reached("screening")` OR current `kind === "won"` OR current `kind === "lost"`; `applied === 0 ? 0 : responded / applied`.
- Funnel rows (only for roles whose stage exists), pct of `applied`: Applied = `applied`; Screening/Interview/Technical/Final = `count(reached(role))`; Offer = `offers`.

- [ ] **Step 1: Rewrite the `computeMetrics` test block**

Replace the `describe("computeMetrics", …)` block in `src/lib/__tests__/selectors.test.ts`, and replace the top-of-file `stages` array with the 7 role-anchored stages (mirror Task 2's array, ids equal to roles). Keep the other describe blocks (`computeNudges`, `dueReminders`, `filterApplications`, `format`) but update their local `stages`/app `stageId` references to the new ids where needed (`applied` → `screening`).

```ts
describe("computeMetrics", () => {
  const withFurthest = (id: string, stageId: string, furthestStageId?: string, o: Partial<Application> = {}) =>
    app(id, stageId, { furthestStageId: furthestStageId ?? stageId, ...o });

  it("computes passing rates from furthest reached", () => {
    const snap: Snapshot = {
      stages,
      applications: [
        withFurthest("saved1", "saved"),
        withFurthest("scr1", "screening"),
        withFurthest("int1", "interview"),
        withFurthest("tech1", "technical"),
        // rejected after reaching technical → counts against technical + interview denominators
        withFurthest("rejTech", "rejected", "technical"),
        withFurthest("offer1", "offer", "final"),
      ],
      tags: [], contacts: [], events: [], notes: [], reminders: [],
      interviews: [],
      settings: { ...DEFAULT_SETTINGS, ghostDays: 14 },
      profile: null, cvdocs: [],
    };
    const m = computeMetrics(snap, NOW);
    expect(m.applied).toBe(5); // all but saved1
    expect(m.offers).toBe(1);
    // reached interview: int1, tech1, rejTech, offer1 = 4; passed interview: tech1, rejTech, offer1 = 3
    expect(m.interviewPassRate).toBeCloseTo(3 / 4);
    // reached technical: tech1, rejTech, offer1 = 3; passed technical: offer1 = 1
    expect(m.technicalPassRate).toBeCloseTo(1 / 3);
    expect(m.funnel[0]).toEqual({ label: "Applied", count: 5, pct: 100 });
    expect(m.funnel.find((f) => f.label === "Offer")).toEqual({ label: "Offer", count: 1, pct: 20 });
  });

  it("returns null pass rate when nobody reached the stage", () => {
    const snap: Snapshot = {
      stages, applications: [app("s", "saved", { furthestStageId: "saved" })],
      tags: [], contacts: [], events: [], notes: [], reminders: [], interviews: [],
      settings: { ...DEFAULT_SETTINGS, ghostDays: 14 }, profile: null, cvdocs: [],
    };
    expect(computeMetrics(snap, NOW).technicalPassRate).toBeNull();
  });

  it("counts ghosted apps past Saved and silent beyond ghostDays", () => {
    const snap: Snapshot = {
      stages,
      applications: [
        app("ghost", "screening", { furthestStageId: "screening", updatedAt: "2026-06-01T00:00:00.000Z" }),
        app("fresh", "screening", { furthestStageId: "screening", updatedAt: NOW }),
        app("savedGhost", "saved", { furthestStageId: "saved", updatedAt: "2026-06-01T00:00:00.000Z" }),
      ],
      tags: [], contacts: [], events: [], notes: [], reminders: [], interviews: [],
      settings: { ...DEFAULT_SETTINGS, ghostDays: 14 }, profile: null, cvdocs: [],
    };
    const m = computeMetrics(snap, NOW);
    expect(m.ghostedCount).toBe(1); // only "ghost"
    expect(m.screeningCount).toBe(2); // ghost + fresh currently in screening
  });
});
```

Ensure the file imports `DEFAULT_SETTINGS` (already imported) and that `app(...)` passes `furthestStageId` through `o`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/selectors.test.ts`
Expected: FAIL — new `Metrics` fields undefined.

- [ ] **Step 3: Implement `computeMetrics`**

Add imports at the top of `src/lib/selectors.ts`:

```ts
import { furthestOrderOf, orderOfRole, stageByRole } from "./furthest";
import type { StageRole } from "./types";
```

Replace the `Metrics` interface with the one above, and replace `computeMetrics`:

```ts
export function computeMetrics(snap: Snapshot, nowIso: string): Metrics {
  const stages = snap.stages;
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const apps = snap.applications;
  const now = Date.parse(nowIso);
  const ghostDays = snap.settings.ghostDays ?? 14;

  const stageOf = (a: Application) => stageById.get(a.stageId);
  const active = apps.filter((a) => stageOf(a)?.kind === "pipeline");
  const offers = apps.filter((a) => stageOf(a)?.kind === "won");
  const appliedApps = apps.filter((a) => {
    const s = stageOf(a);
    return s && (s.kind !== "pipeline" || s.order > 0);
  });

  const reached = (a: Application, role: StageRole) => {
    const ro = orderOfRole(stages, role);
    return ro != null && furthestOrderOf(a, stages) >= ro;
  };
  const passed = (a: Application, role: StageRole) => {
    const ro = orderOfRole(stages, role);
    if (ro == null) return false;
    return furthestOrderOf(a, stages) > ro || stageOf(a)?.kind === "won";
  };
  const rate = (role: StageRole): number | null => {
    const denom = apps.filter((a) => reached(a, role)).length;
    if (denom === 0) return null;
    return apps.filter((a) => passed(a, role)).length / denom;
  };

  const responded = appliedApps.filter((a) => {
    const k = stageOf(a)?.kind;
    return reached(a, "screening") || k === "won" || k === "lost";
  });

  const ghostedCount = apps.filter((a) => {
    const s = stageOf(a);
    if (!s || s.kind !== "pipeline" || s.role === "saved") return false;
    return (now - Date.parse(a.updatedAt)) / DAY >= ghostDays;
  }).length;

  const screeningStage = stageByRole(stages, "screening");
  const screeningCount = screeningStage
    ? apps.filter((a) => a.stageId === screeningStage.id).length : 0;
  const rejectedCount = apps.filter((a) => stageOf(a)?.kind === "lost").length;

  const applied = appliedApps.length;
  const pct = (n: number) => (applied === 0 ? 0 : Math.round((n / applied) * 100));
  const reachedCount = (role: StageRole) => apps.filter((a) => reached(a, role)).length;

  const funnelRoles: { role: StageRole; label: string; count: number }[] = [
    { role: "screening", label: "Screening", count: reachedCount("screening") },
    { role: "interview", label: "Interview", count: reachedCount("interview") },
    { role: "technical", label: "Technical", count: reachedCount("technical") },
    { role: "final", label: "Final", count: reachedCount("final") },
  ];
  const funnel = [
    { label: "Applied", count: applied, pct: 100 },
    ...funnelRoles
      .filter((r) => stageByRole(stages, r.role))
      .map((r) => ({ label: r.label, count: r.count, pct: pct(r.count) })),
    ...(stageByRole(stages, "offer") ? [{ label: "Offer", count: offers.length, pct: pct(offers.length) }] : []),
  ];

  // Last 8 UTC weeks (Monday week-start), oldest first.
  const thisMonday = mondayUtc(new Date(nowIso));
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const weekStart = thisMonday - (7 - i) * 7 * DAY;
    const weekEnd = weekStart + 7 * DAY;
    const count = apps.filter((a) => {
      const t = Date.parse(a.appliedAt ?? a.createdAt);
      return t >= weekStart && t < weekEnd;
    }).length;
    return {
      label: new Date(weekStart).toLocaleDateString("en-US", {
        month: "short", day: "numeric", timeZone: "UTC",
      }),
      count,
    };
  });

  return {
    total: apps.length,
    active: active.length,
    offers: offers.length,
    applied,
    responseRate: applied === 0 ? 0 : responded.length / applied,
    interviewPassRate: rate("interview"),
    technicalPassRate: rate("technical"),
    screeningCount,
    rejectedCount,
    ghostedCount,
    weekly,
    funnel,
  };
}
```

- [ ] **Step 4: Run the full suite to verify it passes**

Run: `npx vitest run`
Expected: PASS (the rewritten selectors test + all others).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: `DashboardPage.tsx` will error (it still reads `interviewRate`). That's fixed in Task 10 — proceed, but do NOT commit a broken typecheck. Instead, do Task 10 before committing, OR temporarily keep the commit limited to selectors and fix Dashboard immediately after. Recommended: implement Task 10 in the same working session and commit together. Mark this task's commit step as combined with Task 10.

- [ ] **Step 6: (Deferred commit)** — commit together with Task 10.

---

### Task 10: Dashboard layout — pass rates, outcomes strip, redrawn funnel

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`
- Test: `src/components/dashboard/__tests__/DashboardPage.test.tsx` (create)

**Interfaces:**
- Consumes: extended `Metrics` (Task 9).
- Produces: dashboard renders Interview/Technical pass-rate stat cards and a Screening/Rejected/Ghosted outcomes strip; funnel uses `metrics.funnel` unchanged in shape.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/dashboard/__tests__/DashboardPage.test.tsx
import { render, screen } from "@testing-library/react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { useApp } from "@/lib/store";
import { DEFAULT_STAGES } from "@/lib/seed";
import { DEFAULT_SETTINGS } from "@/lib/repo";
import type { Application } from "@/lib/types";
import { beforeEach, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const app = (id: string, stageId: string, furthestStageId?: string): Application => ({
  id, company: id, role: "r", tagIds: [], stageId, order: 0,
  createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
  furthestStageId: furthestStageId ?? stageId,
});

beforeEach(() => {
  useApp.setState({
    stages: DEFAULT_STAGES, settings: { ...DEFAULT_SETTINGS, ghostDays: 14 },
    applications: [app("i", "stage-interview"), app("o", "stage-offer", "stage-final")],
    tags: [], interviews: [], contacts: [], events: [], notes: [], reminders: [],
    profile: null, cvdocs: [], ready: true,
  });
});

it("shows pass-rate cards and the outcomes strip", () => {
  render(<DashboardPage />);
  expect(screen.getByText("Interview pass rate")).toBeInTheDocument();
  expect(screen.getByText("Technical pass rate")).toBeInTheDocument();
  expect(screen.getByText("Ghosted")).toBeInTheDocument();
  expect(screen.getByText("Rejected")).toBeInTheDocument();
  expect(screen.getByText("Screening")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/dashboard/__tests__/DashboardPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `DashboardPage.tsx`:

- Add a helper to format a nullable rate:

```tsx
const pctText = (r: number | null) => (r == null ? "—" : `${Math.round(r * 100)}%`);
```

- Replace the stat row. `StatCard` animates a number; for pass rates that may be `null`, render a simpler card. Add a lightweight `TextStat`:

```tsx
function TextStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line-2 bg-surface p-5">
      <p className="text-xs font-semibold text-ink-3">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}
```

- Stat row:

```tsx
<div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
  <StatCard label="Active applications" value={metrics.active} />
  <StatCard label="Response rate" value={Math.round(metrics.responseRate * 100)} suffix="%" />
  <TextStat label="Interview pass rate" value={pctText(metrics.interviewPassRate)} />
  <TextStat label="Technical pass rate" value={pctText(metrics.technicalPassRate)} />
</div>
```

- Add an outcomes strip below the funnel/chart grid (before the interviews/attention grid):

```tsx
<div className="mb-6 grid grid-cols-3 gap-3">
  <TextStat label="Screening" value={String(metrics.screeningCount)} />
  <TextStat label="Rejected" value={String(metrics.rejectedCount)} />
  <TextStat label="Ghosted" value={String(metrics.ghostedCount)} />
</div>
```

- The funnel section already maps `metrics.funnel`; no change needed (still `{label,count,pct}`).

- [ ] **Step 4: Run test + full suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit (covers Tasks 9 + 10)**

```bash
git add src/lib/selectors.ts src/lib/__tests__/selectors.test.ts src/components/dashboard/DashboardPage.tsx src/components/dashboard/__tests__/DashboardPage.test.tsx
git commit -m "feat: dashboard passing rates, ghosted, screening/rejected, redrawn funnel"
```

---

## PHASE 3 — Applications table

### Task 11: Table selectors — status/outcome filter + sort

**Files:**
- Create: `src/lib/table.ts`
- Test: `src/lib/__tests__/table.test.ts`

**Interfaces:**
- Consumes: `Application`, `Stage` from `./types`.
- Produces:
  - `type Outcome = "active" | "won" | "lost"`
  - `filterByStatus(apps: Application[], stageIds: string[], outcomes: Outcome[], stages: Stage[]): Application[]` — AND across the two filters; empty array = no constraint for that filter.
  - `type SortKey = "company" | "role" | "status" | "source" | "salary" | "applied" | "silent"`
  - `sortApplications(apps: Application[], key: SortKey, dir: "asc" | "desc", stages: Stage[], nowIso: string): Application[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/table.test.ts
import { describe, it, expect } from "vitest";
import { filterByStatus, sortApplications } from "@/lib/table";
import type { Application, Stage } from "@/lib/types";

const stages: Stage[] = [
  { id: "saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
  { id: "interview", name: "Interview", color: "yellow", order: 2, kind: "pipeline", role: "interview" },
  { id: "rejected", name: "Rejected", color: "gray", order: 5, kind: "lost", role: "rejected" },
  { id: "offer", name: "Offer", color: "mint", order: 6, kind: "won", role: "offer", pinned: true },
];
const app = (id: string, stageId: string, o: Partial<Application> = {}): Application => ({
  id, company: id, role: "r", tagIds: [], stageId, order: 0,
  createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z", ...o,
});
const apps = [app("a", "saved"), app("b", "interview"), app("c", "rejected"), app("d", "offer")];

describe("filterByStatus", () => {
  it("no filters returns all", () => {
    expect(filterByStatus(apps, [], [], stages)).toHaveLength(4);
  });
  it("filters by stage ids", () => {
    expect(filterByStatus(apps, ["interview"], [], stages).map((a) => a.id)).toEqual(["b"]);
  });
  it("filters by outcome", () => {
    expect(filterByStatus(apps, [], ["won"], stages).map((a) => a.id)).toEqual(["d"]);
    expect(filterByStatus(apps, [], ["active"], stages).map((a) => a.id).sort()).toEqual(["a", "b"]);
  });
  it("ANDs stage and outcome", () => {
    expect(filterByStatus(apps, ["offer"], ["lost"], stages)).toHaveLength(0);
  });
});

describe("sortApplications", () => {
  const NOW = "2026-07-01T00:00:00.000Z";
  it("sorts by company ascending and descending", () => {
    const asc = sortApplications(apps, "company", "asc", stages, NOW).map((a) => a.id);
    expect(asc).toEqual(["a", "b", "c", "d"]);
    const desc = sortApplications(apps, "company", "desc", stages, NOW).map((a) => a.id);
    expect(desc).toEqual(["d", "c", "b", "a"]);
  });
  it("sorts by status using stage order", () => {
    const asc = sortApplications(apps, "status", "asc", stages, NOW).map((a) => a.id);
    expect(asc).toEqual(["a", "b", "c", "d"]); // order 0,2,5,6
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/table.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/table.ts
import type { Application, Stage } from "./types";

export type Outcome = "active" | "won" | "lost";
export type SortKey = "company" | "role" | "status" | "source" | "salary" | "applied" | "silent";

const DAY = 86_400_000;
const outcomeOf = (stage: Stage | undefined): Outcome | undefined =>
  stage?.kind === "won" ? "won" : stage?.kind === "lost" ? "lost" : stage?.kind === "pipeline" ? "active" : undefined;

export function filterByStatus(
  apps: Application[], stageIds: string[], outcomes: Outcome[], stages: Stage[],
): Application[] {
  const byId = new Map(stages.map((s) => [s.id, s]));
  return apps.filter((a) => {
    if (stageIds.length && !stageIds.includes(a.stageId)) return false;
    if (outcomes.length) {
      const o = outcomeOf(byId.get(a.stageId));
      if (!o || !outcomes.includes(o)) return false;
    }
    return true;
  });
}

export function sortApplications(
  apps: Application[], key: SortKey, dir: "asc" | "desc", stages: Stage[], nowIso: string,
): Application[] {
  const byId = new Map(stages.map((s) => [s.id, s]));
  const now = Date.parse(nowIso);
  const salaryOf = (a: Application) => a.salaryMax ?? a.salaryMin ?? -Infinity;
  const appliedOf = (a: Application) => Date.parse(a.appliedAt ?? a.createdAt);
  const silentOf = (a: Application) => (now - Date.parse(a.updatedAt)) / DAY;
  const cmp = (a: Application, b: Application): number => {
    switch (key) {
      case "company": return a.company.localeCompare(b.company);
      case "role": return a.role.localeCompare(b.role);
      case "status": return (byId.get(a.stageId)?.order ?? 0) - (byId.get(b.stageId)?.order ?? 0);
      case "source": return (a.source ?? "").localeCompare(b.source ?? "");
      case "salary": return salaryOf(a) - salaryOf(b);
      case "applied": return appliedOf(a) - appliedOf(b);
      case "silent": return silentOf(a) - silentOf(b);
    }
  };
  const sorted = [...apps].sort(cmp);
  return dir === "asc" ? sorted : sorted.reverse();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/table.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/table.ts src/lib/__tests__/table.test.ts
git commit -m "feat: applications table status/outcome filter and sort selectors"
```

---

### Task 12: Applications page + route + sidebar nav

**Files:**
- Create: `src/components/applications/ApplicationsPage.tsx`
- Create: `src/app/applications/page.tsx`
- Modify: `src/components/shell/Sidebar.tsx` (add nav item)
- Test: `src/components/applications/__tests__/ApplicationsPage.test.tsx`

**Interfaces:**
- Consumes: store; `filterApplications` (existing); `filterByStatus`, `sortApplications` (Task 11); `DetailPanel` (existing); `selectApp`.
- Produces: `/applications` route rendering a filterable, sortable table; clicking a row selects the app and opens `DetailPanel`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/applications/__tests__/ApplicationsPage.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationsPage } from "@/components/applications/ApplicationsPage";
import { useApp } from "@/lib/store";
import { DEFAULT_STAGES } from "@/lib/seed";
import { DEFAULT_SETTINGS } from "@/lib/repo";
import type { Application } from "@/lib/types";
import { beforeEach, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const app = (id: string, company: string, stageId: string): Application => ({
  id, company, role: "Engineer", tagIds: [], stageId, order: 0,
  createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z", furthestStageId: stageId,
});

beforeEach(() => {
  useApp.setState({
    stages: DEFAULT_STAGES, settings: DEFAULT_SETTINGS,
    applications: [app("1", "Stripe", "stage-interview"), app("2", "Grab", "stage-rejected")],
    tags: [], interviews: [], contacts: [], events: [], notes: [], reminders: [],
    filters: { search: "", tagIds: [], sources: [], hasSalary: null },
    profile: null, cvdocs: [], selectedAppId: null, ready: true,
  });
});

it("lists applications and filters by outcome", async () => {
  render(<ApplicationsPage />);
  expect(screen.getByText("Stripe")).toBeInTheDocument();
  expect(screen.getByText("Grab")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /rejected/i }));
  expect(screen.queryByText("Stripe")).toBeNull();
  expect(screen.getByText("Grab")).toBeInTheDocument();
});

it("selects an app when a row is clicked", async () => {
  const selectApp = vi.fn();
  useApp.setState({ selectApp } as never);
  render(<ApplicationsPage />);
  await userEvent.click(screen.getByRole("button", { name: /open Stripe/i }));
  expect(selectApp).toHaveBeenCalledWith("1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/applications/__tests__/ApplicationsPage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ApplicationsPage`**

```tsx
// src/components/applications/ApplicationsPage.tsx
"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { filterApplications } from "@/lib/selectors";
import { filterByStatus, sortApplications, type Outcome, type SortKey } from "@/lib/table";
import { formatSalary, shortDate, relativeDays } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { DetailPanel } from "@/components/detail/DetailPanel";

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "won", label: "Offer" },
  { value: "lost", label: "Rejected" },
];

export function ApplicationsPage() {
  const s = useApp();
  const nowIso = new Date().toISOString();
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [stageIds, setStageIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("applied");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const stageById = useMemo(() => new Map(s.stages.map((st) => [st.id, st])), [s.stages]);

  const rows = useMemo(() => {
    const base = filterApplications(s.applications, s.filters);
    const scoped = filterByStatus(base, stageIds, outcomes, s.stages);
    return sortApplications(scoped, sortKey, dir, s.stages, nowIso);
  }, [s.applications, s.filters, s.stages, stageIds, outcomes, sortKey, dir, nowIso]);

  const toggleOutcome = (o: Outcome) =>
    setOutcomes((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]));
  const toggleStage = (id: string) =>
    setStageIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const sortBy = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setDir("asc"); }
  };

  const th = (key: SortKey, label: string) => (
    <th className="px-3 py-2 text-left font-semibold">
      <button type="button" onClick={() => sortBy(key)} className="hover:underline"
        aria-label={`Sort by ${label}`}>
        {label}{sortKey === key ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <div className="px-5 pt-6 lg:px-7">
      <h1 className="text-2xl font-extrabold tracking-tight">Applications</h1>
      <p className="mb-5 text-xs text-ink-3">Every application, filterable by status and outcome.</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {OUTCOMES.map((o) => (
          <Button key={o.value} size="sm"
            variant={outcomes.includes(o.value) ? "primary" : "secondary"}
            aria-pressed={outcomes.includes(o.value)}
            onClick={() => toggleOutcome(o.value)}>{o.label}</Button>
        ))}
        <span className="mx-1 w-px self-stretch bg-line-2" aria-hidden />
        {s.stages.map((st) => (
          <Button key={st.id} size="sm"
            variant={stageIds.includes(st.id) ? "primary" : "secondary"}
            aria-pressed={stageIds.includes(st.id)}
            onClick={() => toggleStage(st.id)}>{st.name}</Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line-2 bg-surface">
        <table className="w-full text-xs">
          <thead className="border-b border-line-2 text-ink-3">
            <tr>
              {th("company", "Company")}{th("role", "Role")}{th("status", "Status")}
              {th("source", "Source")}{th("salary", "Salary")}{th("applied", "Applied")}
              {th("silent", "Silent")}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const st = stageById.get(a.stageId);
              return (
                <tr key={a.id} className="border-b border-line last:border-0 hover:bg-sunken">
                  <td className="px-3 py-2">
                    <button type="button" aria-label={`Open ${a.company}`}
                      onClick={() => s.selectApp(a.id)} className="font-semibold hover:underline">
                      {a.company}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-ink-2">{a.role}</td>
                  <td className="px-3 py-2">{st?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-2">{a.source ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-2">{formatSalary(a) ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-2">{a.appliedAt ? shortDate(a.appliedAt) : "—"}</td>
                  <td className="px-3 py-2 text-ink-2">{relativeDays(a.updatedAt, nowIso)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-3">No applications match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailPanel />
    </div>
  );
}
```

Note: confirm `Button` supports `variant="primary"` and `size="sm"` (check `src/components/ui/Button.tsx`); if the default variant is unnamed, use that instead of `"primary"`. Confirm `formatSalary`, `shortDate`, `relativeDays` exports in `src/lib/format.ts`.

- [ ] **Step 4: Create the route**

```tsx
// src/app/applications/page.tsx
import type { Metadata } from "next";
import { ApplicationsPage } from "@/components/applications/ApplicationsPage";

export const metadata: Metadata = {
  title: "Applications — JobTrackr",
  description: "Every job application in one filterable, sortable table — filter by status or outcome and open any application's details.",
};

export default function Page() {
  return <ApplicationsPage />;
}
```

- [ ] **Step 5: Add sidebar nav item**

In `src/components/shell/Sidebar.tsx`, import a table icon and insert the nav entry after Board:

```tsx
import { LayoutDashboard, KanbanSquare, Table2, FileText, Bell, Settings } from "lucide-react";
```

```tsx
export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "Board", icon: KanbanSquare },
  { href: "/applications", label: "Applications", icon: Table2 },
  { href: "/cv", label: "CV Builder", icon: FileText },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];
```

- [ ] **Step 6: Run test + typecheck**

Run: `npx vitest run src/components/applications/__tests__/ApplicationsPage.test.tsx && npx tsc --noEmit`
Expected: PASS. (If `Button` variant names differ, adjust and re-run.)

- [ ] **Step 7: Commit**

```bash
git add src/components/applications/ src/app/applications/page.tsx src/components/shell/Sidebar.tsx
git commit -m "feat: applications table page with status/outcome filters and sorting"
```

---

### Task 13: Seed refresh — populate new stages + ghosted + furthest

**Files:**
- Modify: `src/lib/seed.ts` (demo applications, interviews, events)
- Test: `src/lib/__tests__/seed.test.ts` (create)

**Interfaces:**
- Consumes: new `DEFAULT_STAGES` ids/roles.
- Produces: demo data spanning Saved/Screening/Interview/Technical/Final/Rejected/Offer, at least one ghosted app (past Saved, `updatedAt` > 14 days ago), and `furthestStageId` set on demo apps to reflect their journey.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/seed.test.ts
import { describe, it, expect } from "vitest";
import { DEFAULT_STAGES } from "@/lib/seed";
import { computeMetrics } from "@/lib/selectors";
import { DEFAULT_SETTINGS } from "@/lib/repo";

// Rebuild the demo snapshot the way seedIfEmpty does, without touching IndexedDB.
// seed.ts must export a pure `demoSnapshot(now: Date)` used by seedIfEmpty.
import { demoSnapshot } from "@/lib/seed";

const NOW = new Date("2026-08-07T12:00:00.000Z");

describe("demo data", () => {
  it("spans the new stages and yields meaningful analytics", () => {
    const snap = demoSnapshot(NOW);
    const roles = new Set(snap.applications.map((a) => {
      return DEFAULT_STAGES.find((s) => s.id === a.stageId)?.role;
    }));
    expect(roles.has("screening")).toBe(true);
    expect(roles.has("technical")).toBe(true);
    expect(roles.has("final")).toBe(true);

    const m = computeMetrics({ ...snap, settings: { ...DEFAULT_SETTINGS, ghostDays: 14 } }, NOW.toISOString());
    expect(m.ghostedCount).toBeGreaterThanOrEqual(1);
    expect(m.interviewPassRate).not.toBeNull();
    expect(m.technicalPassRate).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/seed.test.ts`
Expected: FAIL — `demoSnapshot` not exported.

- [ ] **Step 3: Refactor `seedIfEmpty` to use a pure `demoSnapshot`**

Extract the snapshot construction currently inside `seedIfEmpty` into an exported pure function, and have `seedIfEmpty` call it:

```ts
export function demoSnapshot(now: Date): Snapshot {
  const applications: Application[] = [
    demoApp(now, "vercel", "Vercel", "UX Engineer", "stage-saved", 0,
      { location: "Remote", workMode: "remote", tagIds: ["tag-remote"], furthestStageId: "stage-saved",
        jdSnapshot: "Vercel is looking for a UX Engineer to craft polished product surfaces…" }),
    demoApp(now, "framer", "Framer", "Design Engineer", "stage-saved", 1,
      { location: "Amsterdam", furthestStageId: "stage-saved" }),
    demoApp(now, "stripe", "Stripe", "Product Designer", "stage-screening", 0,
      { location: "Remote", workMode: "remote", salaryMin: 120000, salaryMax: 140000, currency: "USD",
        source: "LinkedIn", tagIds: ["tag-dream"], appliedAt: daysAgo(now, 8), furthestStageId: "stage-screening" }),
    // Ghosted: past Saved, silent > 14 days
    demoApp(now, "linear", "Linear", "Frontend Engineer", "stage-screening", 1,
      { location: "Hybrid · SF", workMode: "hybrid", source: "Referral", tagIds: ["tag-referral"],
        appliedAt: daysAgo(now, 21), updatedAt: daysAgo(now, 20), furthestStageId: "stage-screening" }),
    demoApp(now, "canva", "Canva", "Software Engineer", "stage-interview", 0,
      { location: "Manila", workMode: "onsite", source: "JobStreet", tagIds: ["tag-high"],
        appliedAt: daysAgo(now, 12), furthestStageId: "stage-interview" }),
    demoApp(now, "figma", "Figma", "Product Engineer", "stage-technical", 0,
      { location: "Remote", workMode: "remote", source: "LinkedIn", appliedAt: daysAgo(now, 15),
        furthestStageId: "stage-technical" }),
    demoApp(now, "notion", "Notion", "Full-stack Engineer", "stage-final", 0,
      { location: "Remote", workMode: "remote", source: "Referral", appliedAt: daysAgo(now, 18),
        furthestStageId: "stage-final" }),
    demoApp(now, "shopify", "Shopify", "Web Developer", "stage-offer", 0,
      { location: "Remote", workMode: "remote", salaryMin: 135000, currency: "USD", tagIds: ["tag-dream"],
        appliedAt: daysAgo(now, 20), furthestStageId: "stage-final" }),
    // Rejected after reaching Technical → counts against the technical rate
    demoApp(now, "grab", "Grab", "iOS Developer", "stage-rejected", 0,
      { location: "Singapore", appliedAt: daysAgo(now, 25), furthestStageId: "stage-technical" }),
  ];

  return {
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
    profile: null, cvdocs: [],
  };
}

export async function seedIfEmpty(now: Date = new Date()): Promise<boolean> {
  const count = await db.stages.count();
  if (count > 0) return false;
  await importSnapshot(demoSnapshot(now), "replace");
  return true;
}
```

Keep the existing `clearDemoData` unchanged.

- [ ] **Step 4: Run test + full suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seed.ts src/lib/__tests__/seed.test.ts
git commit -m "feat: refresh demo data across the new stages with ghosted + furthest"
```

---

### Task 14: Full verification (build + live browser check)

**Files:** none (verification only).

- [ ] **Step 1: Type-check and full test suite**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds with no type/lint errors.

- [ ] **Step 3: Live browser verification (Chrome DevTools MCP)**

Reset local demo data so the migration path and fresh seed both get exercised, then start the dev server and verify each surface in Chrome (this project requires live UI verification, not just tests):

- **Board**: 7 columns Saved→Offer with Saved first, Offer last; a demo card in Screening/Technical/Final; hover a column shows "+ Add" at the bottom; the far-right "Add column" affordance works; drag a middle column to reorder (Saved/Offer don't move); default columns have no Rename in the column menu; Offer/Saved have no Delete.
- **Settings → Pipeline**: default name inputs disabled; Saved/Offer have no delete and no drag grip; deleting a non-empty custom column moves its cards left.
- **Dashboard**: Interview/Technical pass-rate cards show percentages (not "—" with the demo data); outcomes strip shows Screening/Rejected/Ghosted counts; funnel lists Applied→Offer.
- **Applications**: sidebar item present; table lists all demo apps; outcome and status filters narrow rows; a column header sorts; clicking a row opens the detail panel.

- [ ] **Step 4: Record results**

If everything passes, note it in the PR description. If anything fails, open a systematic-debugging pass before claiming completion.

- [ ] **Step 5: (No commit)** — verification only. Any fixes get their own commits.

---

## Self-Review

**Spec coverage:**
- 7 role-anchored defaults, Saved-first/Offer-last pins → Task 1 (defaults), Task 5 (pins), Task 3 (migration order).
- Default names locked; recolor/reorder/delete allowed → Task 6 (Settings), Task 7 (ColumnMenu).
- Saved/Offer non-deletable/non-draggable → Tasks 5, 6, 7, 8.
- Delete moves cards to previous stage → Task 5 (`reassignStageCards` + `removeStage`).
- `furthestStageId` maintained + backfilled → Tasks 2, 3, 4.
- Board add-column / drag-reorder / quick-add card → Tasks 7, 8.
- `ghostDays` setting (14) → Task 1; ghosted metric → Task 9.
- Passing rates from furthest reached (offer = passed all) → Task 9.
- Redrawn funnel, screening/rejected/ghosted, response rate → Tasks 9, 10.
- Applications table page, filters, sorting, row→detail, sidebar → Tasks 11, 12.
- Seed spans new stages + ghosted → Task 13.
- `ghostDays` editable in Settings → Task 6 (Preferences input + test, added).
- Cross-surface consistency + live verification → Task 14.

**Placeholder scan:** No TBD/TODO; every code step has concrete code. Component drag (Task 8) is explicitly deferred to live verification because jsdom can't simulate pointer drags — the pure reorder logic it relies on is unit-tested in Task 5.

**Type consistency:** `furthestStageId?: string`, `StageRole`, `ghostDays: number`, `Outcome`, `SortKey` are defined once and reused verbatim. `Metrics` fields (`interviewPassRate`, `technicalPassRate`, `screeningCount`, `rejectedCount`, `ghostedCount`) match between Task 9 (producer) and Task 10 (consumer). Store helper `applyFurthestOnMove` defined in Task 4 lives in `furthest.ts` beside its siblings.

**Note added to Task 6:** include the `ghostDays` Preferences input (spec requires it be configurable).
