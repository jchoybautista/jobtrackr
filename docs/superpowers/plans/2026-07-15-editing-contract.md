# Editing Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace silent blur-autosave with explicit Save/Cancel across the detail panel and settings, give every add-form the same layout, and make pipeline reordering a drag instead of arrow buttons.

**Architecture:** Three shared pieces carry the whole contract. A pure `draft.ts` module does dirty-detection and patch-building (unit-testable with no DOM). A `SaveFooter` component renders the status line plus Cancel/Save. A `SortableList` component lifts the existing dnd-kit wiring out of `SectionRail` so both the CV rail and the settings pipeline consume it. `AddRow` standardizes the stacked-fields-then-button layout. The two screens are then rewired to use them.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Tailwind, `@dnd-kit/core` + `@dnd-kit/sortable` (already a dependency), Zustand-style store in `src/lib/store.ts`, Vitest + Testing Library (`npm test`), Playwright (`npm run e2e`).

**Spec:** `docs/superpowers/specs/2026-07-15-editing-contract-design.md`

## Global Constraints

- Buffered fields commit **only** on Save. No `onBlur` may call the store for a buffered field.
- The save footer is **always rendered**, never conditional on dirty. Clean state disables both buttons.
- Dirty state must be conveyed as **text** (`No changes` / `Unsaved changes`) in an `aria-live="polite"` region, never by colour alone.
- Disabled buttons must retain **≥3:1 contrast**. The current `disabled:opacity-40` on `Button` fails this and is fixed in Task 1.
- No button ever shares a flex row with the field it submits. Fields are full-width; the button sits below, right-aligned.
- Add buttons carry **visible text labels** (`+ Add note`, `+ Add column`, …). No icon-only `+` buttons remain.
- The word **"Save"** appears nowhere except the footer.
- Reordering is drag-only. `ArrowUp`/`ArrowDown` reorder buttons are deleted, and drag handles keep keyboard support.
- Touch targets ≥ 44×44px.
- Run `npm test` and `npm run lint` before every commit.

---

### Task 1: Draft primitives + disabled-button contrast

**Files:**
- Create: `src/lib/draft.ts`
- Create: `src/lib/__tests__/draft.test.ts`
- Modify: `src/components/ui/Button.tsx:22`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `isDirty<T extends object>(draft: T, source: T): boolean`
  - `changedFields<T extends object>(draft: T, source: T): Partial<T>`
  Both used by Tasks 2, 5, 6, 7.

Empty string, `null`, and `undefined` all normalize to `undefined`, so clearing an already-empty optional field is not a change. Arrays (only `tagIds`) compare as sets, so toggling a tag on and back off returns to clean.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/draft.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isDirty, changedFields } from "@/lib/draft";

describe("isDirty", () => {
  it("is false when draft matches source", () => {
    expect(isDirty({ role: "Engineer", salaryMin: 100 }, { role: "Engineer", salaryMin: 100 })).toBe(false);
  });

  it("is true when a field differs", () => {
    expect(isDirty({ role: "Engineer" }, { role: "Designer" })).toBe(true);
  });

  it("treats empty string, null and undefined as the same absent value", () => {
    expect(isDirty({ location: "" }, { location: undefined })).toBe(false);
    expect(isDirty({ location: "" }, { location: null })).toBe(false);
  });

  it("compares arrays as sets, ignoring order", () => {
    expect(isDirty({ tagIds: ["a", "b"] }, { tagIds: ["b", "a"] })).toBe(false);
    expect(isDirty({ tagIds: ["a"] }, { tagIds: ["a", "b"] })).toBe(true);
  });
});

describe("changedFields", () => {
  it("returns only the fields that changed", () => {
    const patch = changedFields(
      { role: "Engineer", company: "Linear" },
      { role: "Designer", company: "Linear" },
    );
    expect(patch).toEqual({ role: "Engineer" });
  });

  it("normalizes a cleared field to undefined", () => {
    const patch = changedFields({ location: "" }, { location: "Remote" });
    expect(patch).toEqual({ location: undefined });
    expect("location" in patch).toBe(true);
  });

  it("returns an empty object when nothing changed", () => {
    expect(changedFields({ role: "Engineer" }, { role: "Engineer" })).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/__tests__/draft.test.ts`
Expected: FAIL — cannot resolve `@/lib/draft`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/draft.ts`:

```ts
/** Absent values are interchangeable: clearing an already-empty optional
 *  field is not an edit. */
const norm = (v: unknown) => (v === "" || v === null ? undefined : v);

const sameSet = (a: unknown[], b: unknown[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

function equal(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return sameSet(a, b);
  return norm(a) === norm(b);
}

/** True when any key of `draft` differs from `source`. */
export function isDirty<T extends object>(draft: T, source: T): boolean {
  return (Object.keys(draft) as (keyof T)[]).some((k) => !equal(draft[k], source[k]));
}

/** The minimal patch carrying every changed key. Cleared fields are
 *  present with an `undefined` value so the store can unset them. */
export function changedFields<T extends object>(draft: T, source: T): Partial<T> {
  const patch: Partial<T> = {};
  for (const k of Object.keys(draft) as (keyof T)[]) {
    if (!equal(draft[k], source[k])) patch[k] = norm(draft[k]) as T[keyof T];
  }
  return patch;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/__tests__/draft.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Fix the disabled-button contrast**

The footer relies on disabled buttons staying readable. `opacity-40` on light grey drops below 3:1.

In `src/components/ui/Button.tsx:22`, change the class string:

```
disabled:opacity-40 disabled:pointer-events-none
```

to:

```
disabled:opacity-100 disabled:bg-sunken disabled:text-ink-3 disabled:border-line disabled:cursor-not-allowed disabled:pointer-events-none
```

- [ ] **Step 6: Verify nothing regressed and commit**

Run: `npm test && npm run lint`
Expected: all suites pass, no lint errors.

```bash
git add src/lib/draft.ts src/lib/__tests__/draft.test.ts src/components/ui/Button.tsx
git commit -m "feat: draft dirty-tracking primitives; legible disabled buttons"
```

---

### Task 2: SaveFooter

**Files:**
- Create: `src/components/ui/SaveFooter.tsx`
- Create: `src/components/ui/__tests__/SaveFooter.test.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/Button`.
- Produces:
  ```ts
  export function SaveFooter(props: {
    dirty: boolean;
    onSave: () => void;
    onCancel: () => void;
    className?: string;
  }): JSX.Element
  ```
  Used by Tasks 5, 7, 8.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/SaveFooter.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SaveFooter } from "@/components/ui/SaveFooter";

describe("SaveFooter", () => {
  it("renders when clean, with both buttons disabled", () => {
    render(<SaveFooter dirty={false} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/no changes/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /save changes/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /cancel/i }).hasAttribute("disabled")).toBe(true);
  });

  it("announces dirty state as text, not colour alone", () => {
    render(<SaveFooter dirty onSave={vi.fn()} onCancel={vi.fn()} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/unsaved changes/i);
  });

  it("enables both buttons when dirty and fires their handlers", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<SaveFooter dirty onSave={onSave} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/ui/__tests__/SaveFooter.test.tsx`
Expected: FAIL — cannot resolve `@/components/ui/SaveFooter`.

- [ ] **Step 3: Write the implementation**

Create `src/components/ui/SaveFooter.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/Button";

/** The one save affordance in the app. Always rendered — its presence when
 *  clean is what teaches the user that edits need saving. Both buttons are
 *  disabled while clean: an enabled Cancel with nothing to revert reads as
 *  "close", which is the ambiguity this component exists to remove. */
export function SaveFooter({ dirty, onSave, onCancel, className = "" }: {
  dirty: boolean;
  onSave: () => void;
  onCancel: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 border-t border-line-2 bg-surface px-6 py-3 ${className}`}>
      <p role="status" aria-live="polite"
        className={`text-xs font-semibold ${dirty ? "text-ink" : "text-ink-3"}`}>
        {dirty ? "● Unsaved changes" : "No changes"}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="secondary" size="sm" disabled={!dirty} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" disabled={!dirty} onClick={onSave}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/ui/__tests__/SaveFooter.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/SaveFooter.tsx src/components/ui/__tests__/SaveFooter.test.tsx
git commit -m "feat: SaveFooter — always-present save affordance with text dirty state"
```

---

### Task 3: AddRow

**Files:**
- Create: `src/components/ui/AddRow.tsx`
- Create: `src/components/ui/__tests__/AddRow.test.tsx`

**Interfaces:**
- Consumes: `Button`.
- Produces:
  ```ts
  export function AddRow(props: {
    label: string;          // e.g. "Add note" — rendered as "+ Add note"
    onSubmit: () => void;   // called on form submit; parent validates + clears
    children: React.ReactNode; // the full-width fields
  }): JSX.Element
  ```
  Used by Tasks 6, 7, 8.

This is the component that fixes the field-width problem: fields are children in a full-width stack, and the button is a sibling *below* them — never in the same flex row.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/AddRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddRow } from "@/components/ui/AddRow";

describe("AddRow", () => {
  it("submits with a visibly labeled button", () => {
    const onSubmit = vi.fn();
    render(
      <AddRow label="Add note" onSubmit={onSubmit}>
        <input aria-label="Note" />
      </AddRow>,
    );
    const button = screen.getByRole("button", { name: /add note/i });
    expect(button.textContent).toMatch(/add note/i);
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not reload the page on submit", () => {
    const onSubmit = vi.fn();
    render(<AddRow label="Add tag" onSubmit={onSubmit}><input aria-label="Tag" /></AddRow>);
    const form = screen.getByRole("button", { name: /add tag/i }).closest("form")!;
    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/ui/__tests__/AddRow.test.tsx`
Expected: FAIL — cannot resolve `@/components/ui/AddRow`.

- [ ] **Step 3: Write the implementation**

Create `src/components/ui/AddRow.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Fields stack full-width; the submit button sits BELOW them, right-aligned.
 *  Keeping the button out of the field row is what stops inputs from being
 *  squeezed to a different width in every section. */
export function AddRow({ label, onSubmit, children }: {
  label: string;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
    >
      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-2">{children}</div>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" size="sm">
          <Plus className="h-3.5 w-3.5" aria-hidden /> {label}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/ui/__tests__/AddRow.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/AddRow.tsx src/components/ui/__tests__/AddRow.test.tsx
git commit -m "feat: AddRow — fields full-width, labeled add button below"
```

---

### Task 4: Extract SortableList and rewire SectionRail

**Files:**
- Create: `src/components/ui/SortableList.tsx`
- Modify: `src/components/cv/SectionRail.tsx` (replace its dnd-kit wiring; keep its row rendering)
- Create: `src/components/ui/__tests__/SortableList.test.tsx`

**Interfaces:**
- Consumes: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (already installed).
- Produces:
  ```ts
  export function SortableList<T>(props: {
    items: T[];
    getId: (item: T) => string;
    getLabel: (item: T) => string;          // the handle's accessible name
    onReorder: (items: T[], moved: { id: string; toIndex: number }) => void;
    children: (item: T, handle: React.ReactNode) => React.ReactNode;
  }): JSX.Element
  ```
  `handle` is a fully wired grip button the consumer places wherever it likes in its row.

  `onReorder` hands back **both** the reordered array and the identity of the item that moved. `SectionRail` needs the array (it owns the whole ordered list). The settings pipeline needs the moved item, because its store API is `moveStage(id, toIndex)` — a single call for the one dragged column. Without `moved`, settings would have to infer the drag by diffing indices, and a single splice shifts every item in between, so it would fire a cascade of conflicting moves. Used by `SectionRail` here and by the pipeline list in Task 7.

The reorder semantics, the 4px `PointerSensor` activation constraint, and the `KeyboardSensor` all come straight from the current `SectionRail.tsx:56-74` — behaviour must not change for the CV rail.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/SortableList.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SortableList } from "@/components/ui/SortableList";

const items = [{ id: "a", name: "Saved" }, { id: "b", name: "Applied" }];

const renderList = () =>
  render(
    <SortableList
      items={items}
      getId={(i) => i.id}
      getLabel={(i) => i.name}
      onReorder={vi.fn()}
    >
      {(item, handle) => <li>{handle}<span>{item.name}</span></li>}
    </SortableList>,
  );

describe("SortableList", () => {
  it("renders a keyboard-reachable drag handle per item", () => {
    renderList();
    expect(screen.getByRole("button", { name: /reorder saved/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /reorder applied/i })).toBeDefined();
  });

  it("renders every item's content", () => {
    renderList();
    expect(screen.getByText("Saved")).toBeDefined();
    expect(screen.getByText("Applied")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/ui/__tests__/SortableList.test.tsx`
Expected: FAIL — cannot resolve `@/components/ui/SortableList`.

- [ ] **Step 3: Write the implementation**

Create `src/components/ui/SortableList.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor,
  closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

function Row({ id, label, children }: {
  id: string;
  label: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const handle = (
    <button
      type="button"
      aria-label={`Reorder ${label} (drag, or use arrow keys)`}
      className="cursor-grab touch-none rounded-full p-1.5 text-ink-3 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-ink active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
    >
      {children(handle)}
    </div>
  );
}

/** Vertical drag-to-reorder list. The single reorder idiom in the app —
 *  no up/down arrow buttons anywhere. Keyboard users get the same capability
 *  through the handle's dnd-kit KeyboardSensor bindings.
 *
 *  `onReorder` reports the reordered array AND which item moved where: a list
 *  owner (SectionRail) wants the array, while a store with a `move(id, index)`
 *  API (the settings pipeline) wants the one moved item, since a splice shifts
 *  every item in between and diffing indices would fire a cascade of moves. */
export function SortableList<T>({ items, getId, getLabel, onReorder, children }: {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onReorder: (items: T[], moved: { id: string; toIndex: number }) => void;
  children: (item: T, handle: ReactNode) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => getId(i) === active.id);
    const to = items.findIndex((i) => getId(i) === over.id);
    if (from === -1 || to === -1) return;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next, { id: getId(moved), toIndex: to });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(getId)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <Row key={getId(item)} id={getId(item)} label={getLabel(item)}>
            {(handle) => children(item, handle)}
          </Row>
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/ui/__tests__/SortableList.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Rewire SectionRail onto the shared component**

Replace the whole body of `src/components/cv/SectionRail.tsx` with:

```tsx
"use client";

import { Eye, EyeOff } from "lucide-react";
import { SortableList } from "@/components/ui/SortableList";
import { SECTION_LABELS, type CvSection } from "@/cv/types";

/** Ordered list of a CV's sections: toggle visibility and drag to reorder.
 *  Every mutation produces a fresh array handed back via `onChange`. */
export function SectionRail({ sections, onChange }: {
  sections: CvSection[];
  onChange: (sections: CvSection[]) => void;
}) {
  const toggle = (key: CvSection["key"]) =>
    onChange(sections.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s)));

  return (
    <ul className="flex flex-col gap-0.5">
      <SortableList
        items={sections}
        getId={(s) => s.key}
        getLabel={(s) => SECTION_LABELS[s.key]}
        onReorder={onChange}
      >
        {(s, handle) => {
          const label = SECTION_LABELS[s.key];
          return (
            <li className="flex items-center gap-1 rounded-xl py-0.5">
              {handle}
              <button
                type="button"
                aria-pressed={s.visible}
                aria-label={s.visible ? `Hide ${label}` : `Show ${label}`}
                onClick={() => toggle(s.key)}
                className="rounded-full p-1.5 text-ink-3 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-ink"
              >
                {s.visible
                  ? <Eye className="h-4 w-4" aria-hidden />
                  : <EyeOff className="h-4 w-4" aria-hidden />}
              </button>
              <span className={`flex-1 truncate text-sm ${s.visible ? "font-semibold text-ink" : "text-ink-3"}`}>
                {label}
              </span>
            </li>
          );
        }}
      </SortableList>
    </ul>
  );
}
```

- [ ] **Step 6: Verify the CV rail did not regress, then commit**

Run: `npm test && npm run lint`
Expected: every existing suite still passes — the CV builder's behaviour is unchanged.

```bash
git add src/components/ui/SortableList.tsx src/components/ui/__tests__/SortableList.test.tsx src/components/cv/SectionRail.tsx
git commit -m "refactor: extract SortableList; SectionRail consumes it"
```

---

### Task 5: DetailPanel — buffered overview + tags, footer, discard guard

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`
- Create: `src/components/detail/__tests__/DetailPanel.test.tsx`

**Interfaces:**
- Consumes: `isDirty`, `changedFields` (Task 1); `SaveFooter` (Task 2).
- Produces: nothing new for later tasks.

Buffered: `company`, `role`, `location`, `workMode`, `salaryMin`, `salaryMax`, `source`, `tagIds`.
Still immediate: the stage dropdown, delete, and every add-form.

- [ ] **Step 1: Write the failing test**

Create `src/components/detail/__tests__/DetailPanel.test.tsx`. The store is a hook; stub it so the test asserts on the store call, not on persistence.

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DetailPanel } from "@/components/detail/DetailPanel";

const updateApplication = vi.fn();

const app = {
  id: "app1", stageId: "s1", company: "Linear", role: "Frontend Engineer",
  location: "Remote", tagIds: [] as string[], createdAt: "2026-07-01T00:00:00.000Z",
};

vi.mock("@/lib/store", () => ({
  useApp: () => ({
    applications: [app], selectedAppId: "app1",
    stages: [{ id: "s1", name: "Applied", order: 0, color: "lilac" }],
    tags: [{ id: "t1", name: "Remote" }],
    interviews: [], contacts: [], notes: [], events: [], reminders: [], cvdocs: [],
    updateApplication, moveApplication: vi.fn(), selectApp: vi.fn(),
    addNote: vi.fn(), addInterview: vi.fn(), addContact: vi.fn(), addReminder: vi.fn(),
    removeApplication: vi.fn(), removeInterview: vi.fn(), removeContact: vi.fn(),
    removeNote: vi.fn(), updateCv: vi.fn(),
  }),
}));

beforeEach(() => updateApplication.mockClear());

describe("DetailPanel buffered editing", () => {
  it("starts clean with a disabled save", () => {
    render(<DetailPanel />);
    expect(screen.getByText(/no changes/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /save changes/i }).hasAttribute("disabled")).toBe(true);
  });

  it("does NOT write to the store on blur", () => {
    render(<DetailPanel />);
    const role = screen.getByLabelText(/^role$/i);
    fireEvent.change(role, { target: { value: "Staff Engineer" } });
    fireEvent.blur(role);
    expect(updateApplication).not.toHaveBeenCalled();
    expect(screen.getByText(/unsaved changes/i)).toBeDefined();
  });

  it("commits every changed field in one call on Save", () => {
    render(<DetailPanel />);
    fireEvent.change(screen.getByLabelText(/^role$/i), { target: { value: "Staff Engineer" } });
    fireEvent.change(screen.getByLabelText(/^company$/i), { target: { value: "Vercel" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(updateApplication).toHaveBeenCalledTimes(1);
    expect(updateApplication).toHaveBeenCalledWith("app1", { role: "Staff Engineer", company: "Vercel" });
  });

  it("reverts the draft on Cancel and writes nothing", () => {
    render(<DetailPanel />);
    const role = screen.getByLabelText(/^role$/i) as HTMLInputElement;
    fireEvent.change(role, { target: { value: "Staff Engineer" } });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect((screen.getByLabelText(/^role$/i) as HTMLInputElement).value).toBe("Frontend Engineer");
    expect(updateApplication).not.toHaveBeenCalled();
    expect(screen.getByText(/no changes/i)).toBeDefined();
  });

  it("returns to clean when a tag is toggled on and back off", () => {
    render(<DetailPanel />);
    const tag = screen.getByRole("button", { name: "Remote" });
    fireEvent.click(tag);
    expect(screen.getByText(/unsaved changes/i)).toBeDefined();
    fireEvent.click(tag);
    expect(screen.getByText(/no changes/i)).toBeDefined();
  });

  it("asks before discarding when Escape is pressed dirty", () => {
    render(<DetailPanel />);
    fireEvent.change(screen.getByLabelText(/^role$/i), { target: { value: "Staff Engineer" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByText(/discard unsaved changes/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/detail/__tests__/DetailPanel.test.tsx`
Expected: FAIL — no `Save changes` button exists; blur still calls `updateApplication`.

- [ ] **Step 3: Add draft state and remove the blur-writes**

In `src/components/detail/DetailPanel.tsx`:

Add the imports:

```tsx
import { isDirty, changedFields } from "@/lib/draft";
import { SaveFooter } from "@/components/ui/SaveFooter";
```

Define the buffered shape and seed it. Place this next to the existing `useState` declarations (around line 22-26):

```tsx
type Draft = Pick<Application,
  "company" | "role" | "location" | "workMode" | "salaryMin" | "salaryMax" | "source" | "tagIds">;

const seed = (a: Application): Draft => ({
  company: a.company, role: a.role, location: a.location, workMode: a.workMode,
  salaryMin: a.salaryMin, salaryMax: a.salaryMax, source: a.source, tagIds: a.tagIds,
});
```

(`Application` is already exported from `@/lib/types` — add it to the existing type import.)

Inside the component:

```tsx
const [draft, setDraft] = useState<Draft | null>(null);
const [confirmDiscard, setConfirmDiscard] = useState(false);

// Re-seed whenever a different application is selected, so no state bleeds
// between records.
useEffect(() => {
  if (app) setDraft(seed(app));
  setConfirmDiscard(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [app?.id]);
```

Guard the render: `if (!app || !draft) return null;` (replacing the current `if (!app) return null;`).

Then:

```tsx
const dirty = isDirty(draft, seed(app));
const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

const saveChanges = () => {
  void s.updateApplication(app.id, changedFields(draft, seed(app)));
  toast("Saved", "success");
};
const cancelChanges = () => setDraft(seed(app));

const requestClose = () => {
  if (dirty) { setConfirmDiscard(true); return; }
  s.selectApp(null);
};
```

Delete the `save` helper at lines 50-51 entirely — nothing may write on blur any more.

- [ ] **Step 4: Rewire the Escape key and the backdrop through `requestClose`**

Replace the Escape handler (currently line 31):

```tsx
const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") requestCloseRef.current(); };
```

`requestClose` changes identity every render, so hold it in a ref to keep the listener stable:

```tsx
const requestCloseRef = useRef(() => {});
requestCloseRef.current = requestClose;
```

Change the backdrop's handler (line 57) from `onClick={() => s.selectApp(null)}` to `onClick={() => requestCloseRef.current()}`.

Leave the header `X` button (line 87) pointing at `requestClose` too — it must guard as well.

- [ ] **Step 5: Point the Overview fields and Tags at the draft**

Every Overview field becomes controlled by `draft` and writes only to `set`. Replace the whole `<div className="grid grid-cols-2 gap-3">` block (lines 97-127) with:

```tsx
<div className="grid grid-cols-2 gap-3">
  <div><label htmlFor="f-company" className={label}>Company</label>
    <input id="f-company" value={draft.company}
      onChange={(e) => set({ company: e.target.value })} className={input} /></div>
  <div><label htmlFor="f-role" className={label}>Role</label>
    <input id="f-role" value={draft.role}
      onChange={(e) => set({ role: e.target.value })} className={input} /></div>
  <div><label htmlFor="f-location" className={label}>Location</label>
    <input id="f-location" value={draft.location ?? ""}
      onChange={(e) => set({ location: e.target.value })} className={input} /></div>
  <div><label htmlFor="f-mode" className={label}>Work mode</label>
    <select id="f-mode" value={draft.workMode ?? ""}
      onChange={(e) => set({ workMode: (e.target.value || undefined) as WorkMode | undefined })}
      className={input}>
      <option value="">—</option><option value="remote">Remote</option>
      <option value="hybrid">Hybrid</option><option value="onsite">Onsite</option>
    </select></div>
  <div><label htmlFor="f-smin" className={label}>Salary min</label>
    <input id="f-smin" type="number" value={draft.salaryMin ?? ""}
      onChange={(e) => set({ salaryMin: e.target.value ? Number(e.target.value) : undefined })}
      className={input} /></div>
  <div><label htmlFor="f-smax" className={label}>Salary max</label>
    <input id="f-smax" type="number" value={draft.salaryMax ?? ""}
      onChange={(e) => set({ salaryMax: e.target.value ? Number(e.target.value) : undefined })}
      className={input} /></div>
  <div className="col-span-2"><label htmlFor="f-source" className={label}>Source</label>
    <input id="f-source" value={draft.source ?? ""}
      onChange={(e) => set({ source: e.target.value })} className={input} /></div>
</div>
```

In the Tags section (lines 133-143), the toggle now edits the draft. Replace the `onClick` and the `on` binding:

```tsx
const on = draft.tagIds.includes(t.id);
// …
onClick={() => set({ tagIds: on ? draft.tagIds.filter((x) => x !== t.id) : [...draft.tagIds, t.id] })}
```

- [ ] **Step 6: Render the footer and the discard confirm**

The panel is a flex column with a scrolling body. Make the footer sticky at the bottom, directly before the existing `confirmDelete` block (line 319):

```tsx
<SaveFooter
  dirty={dirty}
  onSave={saveChanges}
  onCancel={cancelChanges}
  className="sticky bottom-0 z-10"
/>

{confirmDiscard && (
  <div role="alertdialog" aria-modal="true" aria-label="Discard unsaved changes"
    className="sticky bottom-0 z-20 border-t border-line-2 bg-surface px-6 py-4">
    <p className="mb-3 text-sm font-medium">Discard unsaved changes?</p>
    <div className="flex justify-end gap-2">
      <Button variant="secondary" size="sm" autoFocus onClick={() => setConfirmDiscard(false)}>
        Keep editing
      </Button>
      <Button variant="danger" size="sm"
        onClick={() => { setConfirmDiscard(false); s.selectApp(null); }}>
        Discard
      </Button>
    </div>
  </div>
)}
```

`autoFocus` on **Keep editing** puts focus on the non-destructive choice, so a reflexive second Escape or Enter cannot destroy the draft.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- src/components/detail/__tests__/DetailPanel.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 8: Full suite, lint, commit**

Run: `npm test && npm run lint`

```bash
git add src/components/detail/DetailPanel.tsx src/components/detail/__tests__/DetailPanel.test.tsx
git commit -m "feat: detail panel buffers edits behind explicit save with discard guard"
```

---

### Task 6: DetailPanel — add-forms onto AddRow

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx` (the four add-forms)
- Modify: `src/components/detail/__tests__/DetailPanel.test.tsx` (append cases)

**Interfaces:**
- Consumes: `AddRow` (Task 3).
- Produces: nothing.

This removes the last icon-only `+` buttons and the ambiguous `Save` on the notes form.

- [ ] **Step 1: Write the failing test**

Append to `src/components/detail/__tests__/DetailPanel.test.tsx`:

```tsx
describe("DetailPanel add-forms", () => {
  it("labels every add action explicitly and never says 'Save' outside the footer", () => {
    render(<DetailPanel />);
    expect(screen.getByRole("button", { name: /add interview/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /add contact/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /add reminder/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /add note/i })).toBeDefined();

    const saveish = screen.getAllByRole("button").filter((b) => /save/i.test(b.textContent ?? ""));
    expect(saveish).toHaveLength(1);
    expect(saveish[0].textContent).toMatch(/save changes/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/detail/__tests__/DetailPanel.test.tsx`
Expected: FAIL — the add buttons are icon-only (`aria-label="Add interview"` exists, but Notes still renders a second button reading `Save`).

- [ ] **Step 3: Convert the four forms**

Import `AddRow` and drop the now-unused `Plus` import if nothing else uses it.

Interviews (replace the `<form>` at lines 160-176):

```tsx
<AddRow label="Add interview" onSubmit={() => {
  if (!ivDraft.scheduledAt) return;
  void s.addInterview({ applicationId: app.id, roundType: ivDraft.roundType,
    scheduledAt: new Date(ivDraft.scheduledAt).toISOString(),
    locationOrLink: ivDraft.locationOrLink || undefined });
  setIvDraft({ roundType: "phone", scheduledAt: "", locationOrLink: "" });
}}>
  <div><label htmlFor="iv-type" className={label}>Round</label>
    <select id="iv-type" value={ivDraft.roundType}
      onChange={(e) => setIvDraft({ ...ivDraft, roundType: e.target.value as InterviewRound })}
      className={input}>
      {(["phone", "technical", "panel", "final", "other"] as const).map((r) => <option key={r} value={r}>{r}</option>)}
    </select></div>
  <div><label htmlFor="iv-at" className={label}>When</label>
    <input id="iv-at" type="datetime-local" required value={ivDraft.scheduledAt}
      onChange={(e) => setIvDraft({ ...ivDraft, scheduledAt: e.target.value })} className={input} /></div>
</AddRow>
```

Contacts (replace the `<form>` at lines 191-204):

```tsx
<AddRow label="Add contact" onSubmit={() => {
  if (!contactDraft.name.trim()) return;
  void s.addContact({ applicationId: app.id, name: contactDraft.name.trim(),
    role: contactDraft.role || undefined, email: contactDraft.email || undefined });
  setContactDraft({ name: "", role: "", email: "" });
}}>
  <div><label htmlFor="c-name" className={label}>Name</label>
    <input id="c-name" required value={contactDraft.name}
      onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })} className={input} /></div>
  <div><label htmlFor="c-email" className={label}>Email</label>
    <input id="c-email" type="email" value={contactDraft.email}
      onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} className={input} /></div>
</AddRow>
```

Reminders (replace the `<form>` at lines 219-234):

```tsx
<AddRow label="Add reminder" onSubmit={() => {
  if (!reminderDraft.title.trim() || !reminderDraft.dueAt) return;
  void s.addReminder({ applicationId: app.id, type: "custom",
    title: reminderDraft.title.trim(), dueAt: new Date(reminderDraft.dueAt).toISOString() });
  setReminderDraft({ title: "", dueAt: "" });
}}>
  <div><label htmlFor="rem-title" className={label}>Reminder</label>
    <input id="rem-title" required value={reminderDraft.title}
      onChange={(e) => setReminderDraft({ ...reminderDraft, title: e.target.value })}
      placeholder="Send thank-you note" className={input} /></div>
  <div><label htmlFor="rem-at" className={label}>Due</label>
    <input id="rem-at" type="datetime-local" required value={reminderDraft.dueAt}
      onChange={(e) => setReminderDraft({ ...reminderDraft, dueAt: e.target.value })} className={input} /></div>
</AddRow>
```

Notes (replace the `<form>` at lines 271-282). The textarea spans both columns:

```tsx
<div className="mb-3">
  <AddRow label="Add note" onSubmit={() => {
    if (!noteDraft.trim()) return;
    void s.addNote(app.id, noteDraft.trim());
    setNoteDraft("");
  }}>
    <div className="sm:col-span-2"><label htmlFor="note" className={label}>Add a note</label>
      <textarea id="note" rows={2} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
        placeholder="Interview questions, impressions, follow-up plan…" className={input} /></div>
  </AddRow>
</div>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components/detail/__tests__/DetailPanel.test.tsx`
Expected: PASS, 7 tests. The "only one save-ish button" assertion is the one that proves the ambiguity is gone.

- [ ] **Step 5: Full suite, lint, commit**

Run: `npm test && npm run lint`

```bash
git add src/components/detail/DetailPanel.tsx src/components/detail/__tests__/DetailPanel.test.tsx
git commit -m "feat: detail panel add-forms use AddRow with explicit labels"
```

---

### Task 7: Settings — Pipeline card

**Files:**
- Modify: `src/components/settings/SettingsPage.tsx` (the Pipeline section, lines 54-102)
- Create: `src/components/settings/__tests__/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `isDirty` (Task 1), `SaveFooter` (Task 2), `AddRow` (Task 3), `SortableList` (Task 4).
- Produces: nothing.

Buffered: stage **names** only. Immediate: drag-reorder (`moveStage`), colour (`recolorStage`), add (`addStage`), delete (`removeStage`, now behind a confirm).

- [ ] **Step 1: Write the failing test**

Create `src/components/settings/__tests__/SettingsPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsPage } from "@/components/settings/SettingsPage";

const renameStage = vi.fn();
const removeStage = vi.fn(async () => true);

vi.mock("@/lib/store", () => ({
  useApp: () => ({
    stages: [
      { id: "s1", name: "Saved", order: 0, color: "lilac" },
      { id: "s2", name: "Applied", order: 1, color: "blush" },
    ],
    tags: [{ id: "t1", name: "Remote" }],
    settings: { nudgeDays: 7, currency: "USD" },
    renameStage, removeStage, addStage: vi.fn(), moveStage: vi.fn(), recolorStage: vi.fn(),
    renameTag: vi.fn(), addTag: vi.fn(), removeTag: vi.fn(),
    updateSettings: vi.fn(), exportJson: vi.fn(), importData: vi.fn(), resetAllData: vi.fn(),
  }),
}));

beforeEach(() => { renameStage.mockClear(); removeStage.mockClear(); });

describe("Settings pipeline", () => {
  it("reorders by drag handle, not arrow buttons", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("button", { name: /reorder saved/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /move saved up/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /move saved down/i })).toBeNull();
  });

  it("does not rename on blur", () => {
    render(<SettingsPage />);
    const field = screen.getByLabelText(/saved column name/i);
    fireEvent.change(field, { target: { value: "Shortlist" } });
    fireEvent.blur(field);
    expect(renameStage).not.toHaveBeenCalled();
  });

  it("renames every changed column on one Save", () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText(/saved column name/i), { target: { value: "Shortlist" } });
    fireEvent.change(screen.getByLabelText(/applied column name/i), { target: { value: "Submitted" } });
    fireEvent.click(screen.getAllByRole("button", { name: /save changes/i })[0]);
    expect(renameStage).toHaveBeenCalledTimes(2);
    expect(renameStage).toHaveBeenCalledWith("s1", "Shortlist");
    expect(renameStage).toHaveBeenCalledWith("s2", "Submitted");
  });

  it("confirms before deleting a column", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /delete saved column/i }));
    expect(removeStage).not.toHaveBeenCalled();
    expect(screen.getByText(/delete the .*saved.* column/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/settings/__tests__/SettingsPage.test.tsx`
Expected: FAIL — arrow buttons still exist, blur still renames.

- [ ] **Step 3: Add the pipeline draft state**

In `src/components/settings/SettingsPage.tsx`, add imports:

```tsx
import { SaveFooter } from "@/components/ui/SaveFooter";
import { AddRow } from "@/components/ui/AddRow";
import { SortableList } from "@/components/ui/SortableList";
```

Drop `ArrowDown`, `ArrowUp`, and `Plus` from the lucide import (`AddRow` owns the `+` now).

Inside the component, keyed by stage id:

```tsx
const stageNames = Object.fromEntries(sorted.map((st) => [st.id, st.name]));
const [stageDraft, setStageDraft] = useState<Record<string, string>>(stageNames);
const [confirmStage, setConfirmStage] = useState<string | null>(null);

// Re-seed when the set of stages changes (add / delete / reorder).
useEffect(() => {
  setStageDraft(Object.fromEntries(sorted.map((st) => [st.id, st.name])));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [sorted.map((st) => `${st.id}:${st.name}`).join("|")]);

const stagesDirty = isDirty(stageDraft, stageNames);

const saveStages = () => {
  for (const st of sorted) {
    const next = (stageDraft[st.id] ?? "").trim();
    if (next && next !== st.name) void s.renameStage(st.id, next);
  }
  toast("Saved", "success");
};
```

Add `useEffect` to the React import and `isDirty` to the draft import.

- [ ] **Step 4: Rebuild the Pipeline card**

Replace the `<ul>` (lines 57-90) and the `<form>` (lines 91-101) with:

```tsx
<ul className="mb-3 flex flex-col gap-2">
  <SortableList
    items={sorted}
    getId={(st) => st.id}
    getLabel={(st) => st.name}
    onReorder={(_next, moved) => void s.moveStage(moved.id, moved.toIndex)}
  >
    {(st, handle) => (
      <li className="relative flex items-center gap-2.5 py-0.5">
        {handle}
        <button
          ref={pickerFor === st.id ? dotRef : undefined}
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
            excludeRef={dotRef}
          />
        )}
        <label htmlFor={`stage-${st.id}`} className="sr-only">{st.name} column name</label>
        <input id={`stage-${st.id}`} value={stageDraft[st.id] ?? ""}
          onChange={(e) => setStageDraft({ ...stageDraft, [st.id]: e.target.value })}
          className={`${input} flex-1`} />
        <Button variant="ghost" size="sm" aria-label={`Delete ${st.name} column`}
          onClick={() => setConfirmStage(st.id)}>
          <Trash2 className="h-3.5 w-3.5 text-danger" aria-hidden />
        </Button>
      </li>
    )}
  </SortableList>
</ul>

{confirmStage && (
  <div role="alertdialog" aria-modal="true" aria-label="Delete column"
    className="mb-3 rounded-xl border border-danger-bg bg-danger-bg/40 p-4">
    <p className="mb-3 text-xs font-medium">
      Delete the “{sorted.find((st) => st.id === confirmStage)?.name}” column? Its cards must be moved out first.
    </p>
    <div className="flex justify-end gap-2">
      <Button variant="secondary" size="sm" autoFocus onClick={() => setConfirmStage(null)}>Keep it</Button>
      <Button variant="danger" size="sm" onClick={async () => {
        const ok = await s.removeStage(confirmStage);
        if (!ok) toast("Move or delete this column’s cards first.", "error");
        setConfirmStage(null);
      }}>Delete column</Button>
    </div>
  </div>
)}

<AddRow label="Add column" onSubmit={() => {
  if (!newStage.trim()) return;
  void s.addStage(newStage.trim());
  setNewStage("");
}}>
  <div className="sm:col-span-2">
    <label htmlFor="new-stage" className="sr-only">New column name</label>
    <input id="new-stage" value={newStage} onChange={(e) => setNewStage(e.target.value)}
      placeholder="New column (e.g. Ghosted, Withdrawn)" className={`${input} w-full`} />
  </div>
</AddRow>

<SaveFooter
  dirty={stagesDirty}
  onSave={saveStages}
  onCancel={() => setStageDraft(stageNames)}
  className="-mx-5 -mb-5 mt-4 rounded-b-2xl"
/>
```

The negative margins let the footer span the card's full width and sit flush with its rounded bottom edge.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/components/settings/__tests__/SettingsPage.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Full suite, lint, commit**

Run: `npm test && npm run lint`

```bash
git add src/components/settings/SettingsPage.tsx src/components/settings/__tests__/SettingsPage.test.tsx
git commit -m "feat: settings pipeline — drag reorder, buffered renames, delete confirm"
```

---

### Task 8: Settings — Tags and Preferences cards

**Files:**
- Modify: `src/components/settings/SettingsPage.tsx` (Tags section lines 104-132; Preferences section lines 134-153)
- Modify: `src/components/settings/__tests__/SettingsPage.test.tsx` (append cases)

**Interfaces:**
- Consumes: `isDirty`, `changedFields`, `SaveFooter`, `AddRow`.
- Produces: nothing.

Tags do not reorder — no `SortableList` here, just buffered renames plus a delete confirm and an `AddRow`.

- [ ] **Step 1: Write the failing test**

Append to `src/components/settings/__tests__/SettingsPage.test.tsx`:

```tsx
describe("Settings tags and preferences", () => {
  it("gives every card its own save footer", () => {
    render(<SettingsPage />);
    // Pipeline, Tags, Preferences.
    expect(screen.getAllByRole("button", { name: /save changes/i })).toHaveLength(3);
  });

  it("adds a tag with an explicitly labeled button", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("button", { name: /add tag/i })).toBeDefined();
  });

  it("confirms before deleting a tag", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /delete tag remote/i }));
    expect(screen.getByText(/delete the .*remote.* tag/i)).toBeDefined();
  });

  it("buffers preference edits behind save", () => {
    render(<SettingsPage />);
    const days = screen.getByLabelText(/follow-up nudge after/i);
    fireEvent.change(days, { target: { value: "14" } });
    const footers = screen.getAllByRole("button", { name: /save changes/i });
    // The Preferences footer is the last one on the page.
    expect(footers[footers.length - 1].hasAttribute("disabled")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/settings/__tests__/SettingsPage.test.tsx`
Expected: FAIL — only one footer exists (Pipeline's, from Task 7).

- [ ] **Step 3: Buffer the Tags card**

Add state:

```tsx
const tagNames = Object.fromEntries(s.tags.map((t) => [t.id, t.name]));
const [tagDraft, setTagDraft] = useState<Record<string, string>>(tagNames);
const [confirmTag, setConfirmTag] = useState<string | null>(null);

useEffect(() => {
  setTagDraft(Object.fromEntries(s.tags.map((t) => [t.id, t.name])));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [s.tags.map((t) => `${t.id}:${t.name}`).join("|")]);

const tagsDirty = isDirty(tagDraft, tagNames);

const saveTags = () => {
  for (const t of s.tags) {
    const next = (tagDraft[t.id] ?? "").trim();
    if (next && next !== t.name) void s.renameTag(t.id, next);
  }
  toast("Saved", "success");
};
```

Replace the Tags `<ul>` rows' input and delete button:

```tsx
<li key={t.id} className="flex items-center gap-2.5">
  <label htmlFor={`tag-${t.id}`} className="sr-only">{t.name} tag name</label>
  <input id={`tag-${t.id}`} value={tagDraft[t.id] ?? ""}
    onChange={(e) => setTagDraft({ ...tagDraft, [t.id]: e.target.value })}
    className={`${input} flex-1`} />
  <Button variant="ghost" size="sm" aria-label={`Delete tag ${t.name}`}
    onClick={() => setConfirmTag(t.id)}>
    <Trash2 className="h-3.5 w-3.5 text-danger" aria-hidden />
  </Button>
</li>
```

Add the confirm and replace the add-form, after the `</ul>`:

```tsx
{confirmTag && (
  <div role="alertdialog" aria-modal="true" aria-label="Delete tag"
    className="mb-3 rounded-xl border border-danger-bg bg-danger-bg/40 p-4">
    <p className="mb-3 text-xs font-medium">
      Delete the “{s.tags.find((t) => t.id === confirmTag)?.name}” tag? It is removed from every application.
    </p>
    <div className="flex justify-end gap-2">
      <Button variant="secondary" size="sm" autoFocus onClick={() => setConfirmTag(null)}>Keep it</Button>
      <Button variant="danger" size="sm"
        onClick={() => { void s.removeTag(confirmTag); setConfirmTag(null); }}>Delete tag</Button>
    </div>
  </div>
)}

<AddRow label="Add tag" onSubmit={() => {
  if (!newTag.trim()) return;
  void s.addTag(newTag.trim());
  setNewTag("");
}}>
  <div className="sm:col-span-2">
    <label htmlFor="new-tag" className="sr-only">New tag name</label>
    <input id="new-tag" value={newTag} onChange={(e) => setNewTag(e.target.value)}
      placeholder="New tag (e.g. Visa sponsor)" className={`${input} w-full`} />
  </div>
</AddRow>

<SaveFooter dirty={tagsDirty} onSave={saveTags} onCancel={() => setTagDraft(tagNames)}
  className="-mx-5 -mb-5 mt-4 rounded-b-2xl" />
```

- [ ] **Step 4: Buffer the Preferences card**

Preferences currently writes on every keystroke (lines 143, 149). Add state:

```tsx
const prefs = { nudgeDays: s.settings.nudgeDays, currency: s.settings.currency };
const [prefDraft, setPrefDraft] = useState(prefs);

useEffect(() => {
  setPrefDraft({ nudgeDays: s.settings.nudgeDays, currency: s.settings.currency });
}, [s.settings.nudgeDays, s.settings.currency]);

const prefsDirty = isDirty(prefDraft, prefs);

const savePrefs = () => {
  void s.updateSettings(changedFields(prefDraft, prefs));
  toast("Saved", "success");
};
```

Rewire the two inputs and append the footer inside the Preferences `<section>`:

```tsx
<div className="flex flex-wrap gap-4">
  <div>
    <label htmlFor="nudge-days" className="mb-1 block text-xs font-semibold text-ink-2">
      Follow-up nudge after (days)
    </label>
    <input id="nudge-days" type="number" min={1} max={60} value={prefDraft.nudgeDays}
      onChange={(e) => setPrefDraft({ ...prefDraft, nudgeDays: Math.max(1, Number(e.target.value) || 7) })}
      className={`${input} w-28`} />
  </div>
  <div>
    <label htmlFor="currency" className="mb-1 block text-xs font-semibold text-ink-2">Default currency</label>
    <input id="currency" value={prefDraft.currency}
      onChange={(e) => setPrefDraft({ ...prefDraft, currency: e.target.value.toUpperCase() })}
      className={`${input} w-28`} />
  </div>
</div>

<SaveFooter dirty={prefsDirty} onSave={savePrefs} onCancel={() => setPrefDraft(prefs)}
  className="-mx-5 -mb-5 mt-4 rounded-b-2xl" />
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/components/settings/__tests__/SettingsPage.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 6: Full suite, lint, commit**

Run: `npm test && npm run lint`

```bash
git add src/components/settings/SettingsPage.tsx src/components/settings/__tests__/SettingsPage.test.tsx
git commit -m "feat: settings tags + preferences buffer behind save; tag delete confirms"
```

---

### Task 9: End-to-end proof and live verification

**Files:**
- Modify: `e2e/smoke.spec.ts` (append a spec)

**Interfaces:**
- Consumes: the finished UI.
- Produces: nothing.

The unit tests mock the store, so they prove the component's contract but not that data actually persists. This task proves the round trip against the real app.

- [ ] **Step 1: Write the failing e2e spec**

Append to `e2e/smoke.spec.ts`:

```ts
test("detail panel edits persist only after Save", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /frontend engineer/i }).first().click();

  const role = page.getByLabel("Role", { exact: true });
  await role.fill("Staff Engineer");

  // Dirty, but nothing written yet.
  await expect(page.getByText(/unsaved changes/i)).toBeVisible();

  // Escape must not silently discard.
  await page.keyboard.press("Escape");
  await expect(page.getByText(/discard unsaved changes/i)).toBeVisible();
  await page.getByRole("button", { name: /keep editing/i }).click();

  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText(/no changes/i)).toBeVisible();

  await page.getByRole("button", { name: /close details/i }).click();
  await page.reload();
  await expect(page.getByText("Staff Engineer").first()).toBeVisible();
});
```

- [ ] **Step 2: Run it**

Run: `npm run e2e -- --grep "persist only after Save"`
Expected: PASS. If the seeded board has no "Frontend Engineer" card, adjust the opening selector to a card that exists in `src/lib/seed.ts` rather than weakening the assertions.

- [ ] **Step 3: Verify live in Chrome**

Per the project's standing rule, UI work is confirmed in a real browser, not only by tests. Run `npm run dev`, then with Chrome DevTools MCP:

1. Open a board card. Confirm the footer reads **No changes** with both buttons visibly disabled but still legible — this is the contrast fix from Task 1.
2. Edit the salary, confirm the status flips to **Unsaved changes**, press Cancel, confirm the old value returns.
3. Edit again, press Escape, confirm the discard prompt appears and **Keep editing** holds focus.
4. Confirm the four `+ Add …` buttons all sit below their fields and share one right edge, and that every field in a section is the same width.
5. On Settings, drag a pipeline column by its grip handle and confirm the order persists after a reload. Confirm no up/down arrows remain anywhere.
6. Run a Lighthouse accessibility audit on both `/` (with the panel open) and `/settings`. Expected: no new violations; specifically no contrast failures on the disabled footer buttons.

- [ ] **Step 4: Commit**

```bash
git add e2e/smoke.spec.ts
git commit -m "test: e2e proof that panel edits persist only after Save"
```

---

## Self-Review

**Spec coverage.** Rule 1 (buffered typed fields) → Tasks 5, 7, 8. Rule 2 (always-present footer, disabled when clean, text dirty state) → Task 2, applied in 5/7/8. Rule 3 (add button below full-width fields, labeled) → Task 3, applied in 6/7/8. Rule 4 (drag not arrows, shared component) → Task 4, applied in 7. Rule 5 (destructive confirms) → Tasks 7 and 8. Discard protection → Task 5. Shared components `SaveFooter`/`SortableList`/`AddRow` → Tasks 2/4/3. Accessibility requirements → the disabled-contrast fix in Task 1, the `role="status"`/`aria-live` region in Task 2, `autoFocus` on the non-destructive choice in Tasks 5/7/8, the preserved handle `aria-label` in Task 4, and the Lighthouse pass in Task 9. Testing list → Tasks 1, 2, 3, 5, 6, 7, 8, 9.

**Naming consistency.** `isDirty` / `changedFields` are defined in Task 1 and used under those exact names in 5, 7, 8. `SaveFooter` takes `dirty` / `onSave` / `onCancel` / `className` in Task 2 and is called with exactly those props everywhere. `SortableList` takes `items` / `getId` / `getLabel` / `onReorder` / `children` in Task 4 and is called with exactly those in Task 7 and in the rewired `SectionRail`. `AddRow` takes `label` / `onSubmit` / `children` in Task 3 and is called with those in 6, 7, 8.

**Known ordering constraint.** Tasks 1-4 build the shared pieces and must land before 5-8, which consume them. Task 6 edits the same file as Task 5 and must follow it. Task 8 edits the same file as Task 7 and must follow it.
