# Detail Panel — Explicit Save, Consistent Actions

Date: 2026-07-15
Status: Approved (pending spec review)
Component: `src/components/detail/DetailPanel.tsx`

## Problem

Two defects, one root cause: the panel gives no legible model of when data is written.

1. **Silent autosave is destructive.** Overview fields commit on `blur` (`DetailPanel.tsx:99-126`). The app has no undo. An accidental tab-through or fat-fingered edit to a company name, salary, or source silently overwrites the stored value with no confirmation and no way back. For a job tracker this is a real cost — the data being clobbered is the data the user is relying on to get hired.

2. **The one visible button lies.** Notes renders a `Save` button (`DetailPanel.tsx:281`). It appends a note. Because every other field autosaves invisibly, `Save` is the only save-shaped affordance on screen, so it reads as "save the whole application." The author of the app misread it; users will too.

Compounding both: the four add-forms (interviews, contacts, reminders, notes) each hang an icon-only `+` button off the right edge of a `flex items-end` row. The fields have different natural heights, so the buttons land at four different sizes and offsets, and the inputs are squeezed to odd widths to make room. The right edge of the panel reads as scattered black blobs.

## Design

### 1. Buffered edits — Save / Cancel

**Buffered (draft state, committed only on Save):**
- Overview fields: `company`, `role`, `location`, `workMode`, `salaryMin`, `salaryMax`, `source`
- Tags (`tagIds`)

These are edits to the application *record* — the values changeable by accident. They read from a `draft` object seeded from `app` and reset whenever `app.id` changes. Nothing calls `updateApplication` until Save.

**Immediate (unchanged):**
- Add/remove interview, contact, reminder, note; link/unlink CV doc.
  Rationale: each is a discrete deliberate action behind its own labeled button, and each is individually removable afterward — a mistake is recoverable. Buffering them would break the interaction (type a note, press "Add note", see nothing happen).
- Stage dropdown. Rationale: dragging a card on the board already changes stage instantly. A buffered dropdown alongside an unbuffered drag is two rules for one field.
- Delete. Already gated by its own confirm step.

**Dirty check:** field-by-field comparison of `draft` against `app` (including set-comparison of `tagIds`). Normalize empty string → `undefined` so that clearing an already-empty optional field does not read as dirty.

**Half-typed add-forms do not count as dirty.** Text sitting in the "Add a note" box with the button unpressed is not a pending edit to the record — it is an unstarted action. Treating it as dirty would block Escape behind a confirm for an empty gesture. Accepted trade: closing the panel discards un-submitted add-form text, as it does today.

### 2. Footer — always visible

Sticky at the panel bottom, always rendered (not conditional on dirty).

```
┌──────────────────────────────────────────────────┐
│ No changes              [ Cancel ] [ Save changes ] │   clean  — both disabled
│ ● Unsaved changes       [ Cancel ] [ Save changes ] │   dirty  — both live
└──────────────────────────────────────────────────┘
```

- Persistent presence teaches the form model on first open, before the user has edited anything.
- **Cancel is disabled when clean.** An enabled Cancel with nothing to revert invites "does this close the panel?" — the exact ambiguity being removed. The header `X` remains the only close affordance.
- Save commits one `updateApplication` call with the full patch, fires a `Saved` toast, and returns to clean.
- Cancel reverts `draft` to the stored `app` values.

### 3. Discard protection

Escape and backdrop-click currently close the panel unconditionally (`DetailPanel.tsx:31`, `:57`). While dirty, both instead raise a confirm: **Discard unsaved changes?** → `Keep editing` / `Discard`. This is the protection that makes buffering worth doing; without it, the draft is lost as silently as autosave overwrote.

Reuses the existing in-panel confirm pattern established by `confirmDelete`.

### 4. Add-form actions — one consistent shape

Every add-form (interview, contact, reminder, note) becomes:

- Fields stacked in a consistent full-width grid — no width sacrificed to make room for a side button.
- A single bordered secondary button **below** the fields, right-aligned, with a real text label: `+ Add interview`, `+ Add contact`, `+ Add reminder`, `+ Add note`.
- Identical shape and position in all four sections.

Removes the bare `+` icon buttons and the `flex items-end` baseline hack entirely. The Notes button is relabeled `Add note` — the word "Save" no longer appears anywhere except the footer, so nothing can be mistaken for it.

## Accessibility

- Footer status is a text string (`No changes` / `Unsaved changes`) in an `aria-live="polite"` region — dirty state is not conveyed by button colour alone.
- Disabled buttons retain ≥3:1 contrast against the footer background; they must remain visible, not vanish.
- Discard confirm receives focus on open; Escape within it maps to `Keep editing` (the non-destructive choice).
- All add buttons carry visible text labels, so no `aria-label`-only icon buttons remain in the add-forms.
- Buttons meet the 44×44px touch-target minimum on mobile.

## Testing

- Editing a buffered field does not write to the store until Save.
- Cancel restores the previous values and returns the footer to clean.
- Save issues exactly one `updateApplication` call carrying every changed field.
- Escape and backdrop-click while dirty raise the discard confirm rather than closing; while clean they close as before.
- Switching to a different application resets the draft (no bleed between records).
- Each add-form still creates its entity and clears its inputs.
- Toggling a tag on and back off returns to clean (no phantom dirty state).
- Axe pass on clean, dirty, and discard-confirm states.

## Out of scope

Section spacing/scroll length; moving delete out of the header; panel tabs. All deferred.
