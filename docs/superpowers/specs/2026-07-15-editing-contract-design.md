# Editing Contract — Explicit Save, Consistent Actions, Drag to Reorder

Date: 2026-07-15
Status: Approved (pending spec review)
Surfaces: `src/components/detail/DetailPanel.tsx`, `src/components/settings/SettingsPage.tsx`, `src/components/cv/SectionRail.tsx`

## Problem

Three screens edit records three different ways, and none of them tells the user when data is written.

1. **Silent autosave is destructive.** Overview fields in the detail panel commit on `blur` (`DetailPanel.tsx:99-126`); so do stage and tag renames in settings (`SettingsPage.tsx:77`, `:112`); preferences commit on every keystroke (`:143`, `:149`). The app has no undo. A fat-fingered edit to a salary, a company name, or a column name silently overwrites the stored value with nothing to fall back on. For a job tracker, the clobbered data is the data the user is relying on to get hired.

2. **The only visible button lies.** Notes renders a `Save` button (`DetailPanel.tsx:281`) that appends a note. Because everything else saves invisibly, it is the only save-shaped thing on screen, so it reads as "save the application." The app's own author misread it.

3. **Buttons sit beside fields, so no field is the same width.** Every add-form places its button in the same flex row as its inputs — `DetailPanel.tsx:160`, `:191`, `:219`, `:271`, and `SettingsPage.tsx:91`, `:121`. The inputs shrink to make room, by different amounts in each row, and the icon-only `+` buttons land at different sizes because the rows are `items-end` over fields of unequal height. The result reads as scattered blobs down the right edge of every card and panel.

4. **Two different reorder idioms.** The CV builder reorders by drag (`SectionRail.tsx:23-31`: grip handle, dnd-kit, pointer + keyboard sensors). The settings pipeline reorders by up/down arrow buttons (`SettingsPage.tsx:79-82`). The good pattern already exists; one screen never got it.

## The contract

Five rules. They apply to every editing surface in the app, including ones not yet built.

### Rule 1 — Typed fields that edit an existing record buffer

They write to a local draft and commit only on an explicit **Save changes**, with **Cancel** beside it. Nothing reaches the store on blur.

| Surface | Buffered fields |
|---|---|
| Detail panel | `company`, `role`, `location`, `workMode`, `salaryMin`, `salaryMax`, `source`, `tagIds` |
| Settings › Pipeline | stage names |
| Settings › Tags | tag names |
| Settings › Preferences | `nudgeDays`, `currency` |

**Not buffered** — these commit immediately, and each is safe to do so because it is one-click reversible and impossible to trigger by accident:

- Drag-reorder (stages, CV sections, board cards). A drag cannot be fat-fingered, and dragging back undoes it.
- Colour-pick on a stage dot. Visible instantly, reversible by picking again.
- The stage dropdown in the detail panel header — dragging a card on the board already changes stage instantly, and a buffered dropdown next to an unbuffered drag would be two rules for one field.
- Adding or removing a list item (interview, contact, reminder, note, CV link, stage, tag). Each is a deliberate press of a labeled button, and each is individually removable afterward.

**Dirty check:** field-by-field comparison of draft against stored, with empty string normalized to `undefined` so clearing an already-empty optional field does not register as dirty, and `tagIds` compared as a set. Re-seed the draft whenever the edited record's `id` changes, so no state bleeds between applications.

**Half-typed add-forms are not dirty.** Text sitting in the "Add a note" box with the button unpressed is an unstarted action, not a pending edit. Treating it as dirty would gate Escape behind a confirm for an empty gesture. Accepted trade: closing discards un-submitted add-form text, as it does today.

### Rule 2 — The save footer

One shared component, identical in the detail panel and in each buffered settings card. **Always rendered**, never conditional on dirty — its presence is what teaches the form model before the user has typed anything.

```
┌──────────────────────────────────────────────────┐
│ No changes              [ Cancel ] [ Save changes ] │   clean — both disabled
│ ● Unsaved changes       [ Cancel ] [ Save changes ] │   dirty — both live
└──────────────────────────────────────────────────┘
```

- **Cancel is disabled when clean.** With nothing to revert, an enabled Cancel invites "does this close the panel?" — the exact ambiguity being removed. In the detail panel, the header `X` stays the only close affordance.
- Save issues one store call carrying every changed field, fires a `Saved` toast, returns to clean.
- Cancel reverts the draft to stored values.
- In the detail panel the footer is sticky at the bottom. In settings it sits at the bottom-right of its own card, scoping each card to its own form.

### Rule 3 — Adding to a list

Fields full-width, stacked; a single bordered secondary button **below** them, right-aligned, with a real text label — `+ Add interview`, `+ Add contact`, `+ Add reminder`, `+ Add note`, `+ Add column`, `+ Add tag`.

No button ever shares a row with the field it submits. This is the rule that keeps every field in a card the same width. The bare `+` icon buttons and the `items-end` baseline hack are removed entirely; after this the word "Save" appears nowhere except the footer, so nothing can be mistaken for it.

### Rule 4 — Reordering is drag, never arrows

Extract the sortable-list pattern out of `SectionRail` into a shared component. It carries the grip handle, dnd-kit `DndContext`/`SortableContext`, `PointerSensor` (4px activation) and `KeyboardSensor`, and the reorder-on-drop logic. `SectionRail` and the settings pipeline list both consume it. The `ArrowUp`/`ArrowDown` buttons are deleted.

### Rule 5 — Destructive actions confirm

Already true for delete-application and the danger zone. Extend to stage and tag deletion, which currently fire on a single click. Stage deletion keeps its existing guard (refuses while the column holds cards) — the confirm sits in front of it.

## Discard protection

**Detail panel:** Escape and backdrop-click currently close unconditionally (`DetailPanel.tsx:31`, `:57`). While dirty, both raise a confirm — **Discard unsaved changes?** → `Keep editing` / `Discard`. This is what makes buffering worth doing; without it the draft is lost as silently as autosave overwrote. Reuses the in-panel confirm pattern already established by `confirmDelete`.

**Settings:** no route guard. Navigating away from settings with an unsaved rename loses the *edit*, not the *record* — the stored value is untouched, which is the safe direction and the whole point of the change. A router-level "unsaved changes" interception is deliberately out of scope.

## Shared components to add

- `SaveFooter` — status text + Cancel + Save, driven by an `isDirty` flag. Consumed by the detail panel and three settings cards.
- `SortableList` — the dnd-kit wiring lifted from `SectionRail`, consumed by `SectionRail` and the pipeline list.
- `AddRow` — the stacked-fields-plus-button-below layout, consumed by all six add-forms.

Three components carry all four rules, so a future screen inherits the contract by using them rather than by remembering it.

## Accessibility

- Footer status is text (`No changes` / `Unsaved changes`) in an `aria-live="polite"` region — dirty state is never conveyed by button colour alone.
- Disabled buttons keep ≥3:1 contrast against their background. They must read as present-but-inactive, not vanish.
- The discard confirm takes focus on open; Escape inside it maps to `Keep editing`, the non-destructive choice.
- Drag handles keep `SectionRail`'s existing keyboard support and its `aria-label` phrasing (`Reorder {name} (drag, or use arrow keys)`), so removing the arrow buttons removes no keyboard capability.
- Every add button carries a visible text label; no `aria-label`-only icon buttons remain in add-forms.
- All buttons meet the 44×44px touch-target minimum on mobile.

## Testing

- Editing a buffered field does not write to the store until Save; Save issues exactly one update call with every changed field.
- Cancel restores previous values and returns the footer to clean.
- Escape and backdrop-click while dirty raise the discard confirm; while clean they close as before.
- Switching applications re-seeds the draft — no bleed between records.
- Toggling a tag on and back off returns to clean (no phantom dirty state).
- Renaming two stages and pressing Save once persists both.
- Pipeline reorder works by pointer drag and by keyboard, and persists.
- Each add-form still creates its entity and clears its inputs.
- Stage and tag deletion prompt before destroying; stage deletion still refuses while the column holds cards.
- Axe pass on clean, dirty, and discard-confirm states in both surfaces.

## Out of scope

Detail-panel section spacing and scroll length; moving delete out of the panel header; panel tabs; a router guard for unsaved settings edits.
