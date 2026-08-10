# Pipeline overhaul + connected analytics + applications table

**Date:** 2026-08-07
**Status:** Approved (design), pending implementation plan

## Summary

Three connected pieces of work, designed together, built in phases:

1. **Pipeline model** — 7 default stages anchored by a hidden `role`, with Jira-style
   management on the Board (add column, drag-reorder, quick-add card) alongside the
   existing Settings editor.
2. **Dashboard analytics** — funnel redrawn to the real stages, plus Screening / Rejected /
   Ghosted counts and Interview / Technical passing rates, all derived from one source of truth.
3. **Applications table** — a new sidebar page with a sortable, filterable table of every
   application.

Everything derives from the same stages, roles, and per-application furthest-reached data,
so the Board, Dashboard, and Table always agree.

## Context

JobTrackr is a local-only app (IndexedDB via Dexie, no backend). Current model:

- `Stage { id, name, color, order, kind }`, `kind ∈ {pipeline, won, lost}`.
- Current defaults: `Saved · Applied · Interview · Offer(won) · Rejected(lost)`.
- Any stage can be renamed/recolored/reordered/deleted; delete is blocked only when the
  stage still holds cards. No "default/locked" concept exists.
- `Interview` entities carry a `roundType ∈ {phone, technical, panel, final, other}` — a
  scheduling concept, separate from pipeline stages.
- Stage moves are already logged as `ActivityEvent` with `kind: "stage_move"`.
- Metrics live in a single `computeMetrics` selector (`src/lib/selectors.ts`).
- The Board (kanban) is the only list view; `filterApplications` exists
  (search/tags/sources/salary) and is reused by the new table.

## Data model changes

### `Stage.role?: StageRole`

```
type StageRole = "saved" | "screening" | "interview" | "technical" | "final" | "rejected" | "offer";
```

- The 7 default stages each carry a stable `role`. Custom stages have `role: undefined`.
- Analytics locate stages by `role`, never by `name` or `order`, so recolor/reorder never
  breaks metrics.
- **Default stage names are locked** (cannot be renamed). Custom stages rename freely.
  Rationale: the name is the human label for an analytic role; locking it keeps the
  dashboard meaningful. (Internally a rename would be safe because we anchor by role, but
  we lock the name in the UI to avoid confusing the dashboard labels.)

### `Stage.pinned?: boolean`

- `saved` and `offer` are `pinned`: **not draggable and not deletable**. Saved is the entry
  point (new apps land there); Offer is the success terminal.
- Every other stage — default or custom — can be recolored, reordered, and deleted.
- Deleting a non-empty stage moves its cards to the previous stage (by current order).

### `Application.furthestStageId?: string`

- The id of the deepest **pipeline-kind** stage the app has ever entered.
- Updated on every stage move: if the destination stage is `kind === "pipeline"` and its
  current `order` is greater than the current furthest's order, set `furthestStageId` to it.
  Moves into terminal stages (`won`/`lost`) do **not** change `furthestStageId`.
- Compared by looking up the referenced stage's *current* `order`, so it survives column
  reordering. If the referenced stage was deleted, treat furthest as unknown (fall back to
  the app's current pipeline stage if it is in one).
- **Backfill on migration**: for each existing app, scan its `stage_move` events plus its
  current stage and record the deepest pipeline stage seen.

### `SettingsDoc.ghostDays: number`

- Default `14`. Drives the Ghosted metric. Lives beside the existing `nudgeDays` (7) and is
  editable in Settings → Preferences.

## Default pipeline & protection

Default order (left → right), with roles and kinds:

| Order | Name            | role       | kind     | pinned |
|-------|-----------------|------------|----------|--------|
| 0     | Saved           | saved      | pipeline | yes    |
| 1     | Screening       | screening  | pipeline | no     |
| 2     | Interview       | interview  | pipeline | no     |
| 3     | Technical       | technical  | pipeline | no     |
| 4     | Final interview | final      | pipeline | no     |
| 5     | Rejected        | rejected   | lost     | no     |
| 6     | Offer           | offer      | won      | yes    |

- Saved pinned first, Offer pinned last. Rejected sits just before Offer.
- **Migration for existing users**: add the missing default stages; stamp `role` onto any
  existing stage whose identity matches (`stage-saved → saved`, `stage-interview →
  interview`, `stage-offer → offer`, `stage-rejected → rejected`). The old `Applied` stage
  (if present) is left as a custom, roleless stage the user can keep or delete — we do not
  silently delete user stages. Reorder so Saved is first and Offer is last.

### Protection rules (enforced in store + Settings/Board UI)

- Pinned stages (`saved`, `offer`): reorder disabled, delete disabled.
- Default stages (has `role`): name input disabled (locked). Recolor, reorder, delete allowed
  (subject to pin rules).
- Custom stages (no `role`): fully editable.
- Reorder must always keep a pinned-first stage first and pinned-last stage last; drag logic
  clamps positions accordingly.

## Board (pipeline page) — Jira-style management

- **Add column**: a ghost "+ Add column" affordance at the far right of the column row.
  Clicking reveals an inline name input; submit creates a `pipeline` stage (roleless) placed
  before the pinned-last Offer column.
- **Drag-to-reorder columns** on the board (today this lives only in Settings). Uses the same
  reorder logic and pin clamping.
- **Quick-add card**: hovering a column reveals a "+ Add" row at the bottom of its card list.
  Clicking opens the existing Add Job dialog pre-set to that column's stage.
- Settings retains its full pipeline editor; the Board is the fast inline path.

## Dashboard — connected analytics

All metrics derive from stages (by role), `furthestStageId`, and `ghostDays`.

### Definitions

- **appliedApps** — apps past Saved (furthest reached ≥ Screening) or in any terminal stage.
  (An app can be terminal without having a recorded pipeline depth; still counts as applied.)
- **reached(role)** — `furthestOrder(app) ≥ order(role)`, using current stage orders.
- **passed(role)** — `furthestOrder(app) > order(role)` **OR** the app is currently in the
  `won` (Offer) stage. Reaching Offer means it passed every earlier stage.
- **Interview passing rate** — `count(passed(interview)) / count(reached(interview))`.
- **Technical passing rate** — `count(passed(technical)) / count(reached(technical))`.
- **Ghosted** — app has left Saved (furthest ≥ Screening or currently in a non-Saved pipeline
  stage), is **not** terminal (not won/lost), and has had no update in ≥ `ghostDays` days.
- **Response rate** — of applied apps, the share that got any company response: reached
  Screening or beyond, or is in Offer, or is Rejected (a rejection is a response). The
  complement among applied is effectively the silent/ghosted set.

Rates with a zero denominator (e.g. no app has reached Technical yet) display as "—", not 0%.

### Layout

- **Stat row (4 cards)**: Active · Response rate · Interview pass rate · Technical pass rate.
- **Pipeline funnel** (redrawn): Applied → Screening → Interview → Technical → Final → Offer.
  Each row shows count + % of applied. Row sources: **Applied** = `count(appliedApps)`;
  **Screening/Interview/Technical/Final** = `count(reached(role))`; **Offer** = `count(won)`
  (Offer is terminal, so it comes from the won stage, not `furthestStageId`). Because
  furthest-reached is monotonic, each pipeline row is ≤ the one above it.
- **Outcomes strip**: Screening (count currently in the Screening stage) · Rejected (count) ·
  Ghosted (derived count).
- **Applications per week** chart, **Upcoming interviews**, **Needs attention** — unchanged.

Interview *round types* (scheduling) remain orthogonal to Interview/Technical *stages*
(analytics). Stages drive the funnel and passing rates; rounds drive the calendar.

## Applications table — new sidebar page

- New **"Applications"** item in the sidebar (`/applications`).
- Sortable table columns: **Company · Role · Status (stage pill) · Source · Salary · Applied ·
  Days silent · Tags**.
- **Filters**:
  - Status: by stage (multi-select of stage names).
  - Outcome/pipeline: active (`pipeline`) / won / lost.
  - Reuse existing search, tags, and source filters via `filterApplications`.
- Sorting: click a column header to sort asc/desc (default: Applied, newest first).
- Row click opens the same detail panel the Board uses (`selectApp`).
- Empty state mirrors the Board's tone.

## Seed & cross-app consistency

- Demo data updated to populate the new stages: at least one app in Screening, one in
  Technical, one in Final interview, one Ghosted-by-silence (past Saved, `updatedAt` > 14
  days ago, non-terminal), plus existing Offer/Rejected examples — so the dashboard rates and
  table filters render meaningfully out of the box.
- Single source of truth: stages/roles + `furthestStageId` feed the Board, Dashboard, and
  Table identically. No metric is computed from a divergent code path.

## Testing

- **Selectors (unit)**: furthest-reached comparison (incl. after reorder and after
  deletion of the referenced stage), Interview/Technical passing rates (incl. rejected-from-
  technical counting against the technical rate, offer counting as passed), ghosted
  derivation at the `ghostDays` boundary, redrawn funnel monotonicity, response rate.
- **Migration/backfill (unit)**: existing snapshot → roles stamped, defaults added, Saved
  first / Offer last, `furthestStageId` backfilled from `stage_move` history.
- **Protection (component)**: pinned stages can't move or delete; default names locked;
  custom stages fully editable.
- **Table (component)**: status and outcome filters, column sorting, row → detail.

## Build phases

1. **Pipeline model**: `role`/`pinned`/`furthestStageId`/`ghostDays`, migration + backfill,
   new defaults, protection rules, Board management (add column, drag-reorder, quick-add
   card), Settings updates.
2. **Dashboard analytics**: new/redrawn selectors and dashboard layout.
3. **Applications table**: new page, filters, sorting, detail wiring.

## Open decisions already made

- Saved and Offer are **pinned and non-deletable** (structural). All other stages deletable.
- Order is **Rejected before Offer** (Offer pinned as the literal last column).
- Passing rates use a recorded **furthest-reached** field, not current position alone, so
  terminal apps count correctly.
- Default stage **names are locked**; recolor/reorder/delete allowed (subject to pins).
