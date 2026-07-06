# JobTrackr — Phase 1 (Job Tracker) Design Spec

**Date:** 2026-07-06
**Status:** Approved by Jonathan (brainstorming session, visual companion mockups in `.superpowers/brainstorm/`)
**Source concept:** [CONCEPT.md](../../../CONCEPT.md)

## 1. Product summary

JobTrackr is a job-application tracker built as a desktop-first, mobile-responsive web app. Phase 1 delivers the complete tracker experience — kanban board, application records, dashboard analytics, reminders, and settings — as a polished portfolio-grade product. The bar is "award-winning": distinctive visual design, real motion design, and UX details competitors lack. It must not read as "another Jira."

### Phasing (decided)

- **Phase 1 (this spec):** tracker — Board, Dashboard, Reminders, Settings, application detail. Local-first, no auth, no backend.
- **Phase 2:** CV builder — prebuilt templates (no freeform theme editing; scrapped by decision), structured sections, all optional/toggleable, A4 PDF export.
- **Phase 3:** cover letter generator + AI features (backend LLM proxy, rate-limited).
- **Phase 4:** auth pages (sign in, sign up, forgot/remember password) + Supabase sync with local-data migration on first sign-in; PWA polish; dark mode toggle.

Each later phase gets its own spec. Nothing in Phase 1 may block these: colors are tokenized for dark mode, the data layer is isolated for future sync, and the app shell reserves nav space for future sections.

## 2. Tech stack (decided)

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS, semantic design tokens as CSS custom properties |
| Font | Plus Jakarta Sans via `next/font` (self-hosted, `font-display: swap`) |
| Icons | Lucide (`lucide-react`) |
| Drag & drop | dnd-kit (pointer + keyboard sensors) |
| Animation | Motion (Framer Motion) + canvas-confetti for the Offer celebration |
| State | Zustand |
| Persistence | IndexedDB via Dexie (local-first; no backend in Phase 1) |
| Charts | Recharts (or hand-rolled SVG where it looks better) |
| Tests | Vitest (units) + Playwright (smoke) |
| Deploy target | Vercel (free tier) |

## 3. Visual system

- **Canvas:** white / near-white (`#FDFDFD`), generous whitespace.
- **Radii:** cards 14–18px, buttons/pills fully rounded, inputs 10–12px.
- **Buttons:** primary = black bg / white text; secondary = white bg / hairline border / black text. Pill-shaped.
- **Typography:** Plus Jakarta Sans everywhere. Strict scale (e.g. 11/12/14/16/19/24/32) and a 4px spacing grid — consistency of font and spacing was an explicit requirement.
- **Column colors:** each pipeline column has a user-personalizable color chosen from a **curated palette of 10 soft pastels we provide** (no freeform color input). Picker opens by clicking the colored dot beside the column name. Palette (approx values, tune during build): pink `#F4B8C1`, peach `#F5C9A8`, yellow `#F0D97A`, mint `#B5DFC0`, sky `#A8D8E8`, lavender `#C9BCF2`, orchid `#E8BCE0`, gray `#D8D8D8`, sage `#DCE3B8`, blush `#F2C4C4`.
- **Card tinting — "soft tint" (decided over full-tint and tinted-well options):** cards are near-white with a whisper of the column color as background + a slightly stronger tinted border, derived automatically from the column color (e.g. mix ~8% for bg, ~25% for border). Text stays dark → WCAG AA effortless.
- **Tags:** white pills, hairline gray border, dark text (decided: white background, not tinted).
- **Dark mode readiness:** every color used via semantic tokens (`--surface`, `--surface-raised`, `--text-primary`, `--text-secondary`, `--border`, etc.); column tints computed from the pastel + a mix function. Dark mode later = token swap, no repaint. Phase 1 ships light-only; Settings shows an appearance section with the toggle slot disabled/"coming soon".
- **Logo:** black rounded square with white "J" + "JobTrackr" wordmark (name locked in).

## 4. Information architecture / pages

App shell: left sidebar (logo, Main menu: Dashboard, Board, Reminders w/ badge, Settings; user identity block at bottom) + main content area with a top bar per page.

### 4.1 Board (default route `/`)

- Kanban columns from user's pipeline stages. Defaults: **Saved → Applied → Interview → Offer → Rejected** (user can rename/add/reorder/recolor/delete in Settings or via column ⋮ menu; "Ghosted" and "Withdrawn" available as suggested extra stages).
- Top bar: page title + live subtitle ("12 active applications · 3 need a follow-up"), ⌘K search, Filters button (white secondary, active-filter count badge), black **+ Add job** button.
- **Filters:** by tag, stage, source, company, salary presence/range, date applied. Filter state visible as removable chips.
- **Search (⌘K):** command palette — fuzzy-find applications, jump to pages, quick actions (add job, go to settings).
- **Cards** show: role (bold), company · location · salary, tag pills, and contextual footer: applied date, attachment count, and **nudges** — "N days silent — follow up?" (amber), upcoming interview (tinted info row), offer deadline (green, bold). Rejected/Ghosted cards render dimmed.
- **Quick-add:** the + Add job flow accepts pasting a job-posting URL or raw JD text and pre-fills company/role/location where parseable (client-side heuristics only in Phase 1 — no scraping backend); JD text is stored as the snapshot.
- **Column header:** color dot (click → pastel picker popover), name, count badge, ⋮ menu (rename, recolor, add card, delete).
- Empty states designed, not default-blank: friendly illustration + CTA per column; brand-new users get seeded demo data (dismissible "clear demo data" banner).

### 4.2 Application detail

Slide-over panel from the right (board stays visible, dimmed). Sections:

- **Overview:** all fields editable inline — company, role, location, work mode, salary range, source, posting URL, date applied, stage, tags.
- **Timeline:** auto-logged activity (created, stage moves, edits) + manual entries ("sent thank-you email"). Newest first.
- **Notes:** freeform rich-ish text (markdown-lite).
- **Contacts:** name, role, email, LinkedIn per application.
- **Interviews:** multiple rounds per application — type (phone screen / technical / panel / final / other), datetime, location/link, notes. Feeds Board nudges, Reminders, and Dashboard.
- **JD snapshot:** the saved job-description text from quick-add (postings die; the snapshot survives).

### 4.3 Dashboard

- Stat cards with animated count-up: active applications, response rate, interview conversion, offers.
- **Pipeline funnel** (applied → screen → interview → offer) — conversion percentages between stages.
- Applications per week (bar/area chart).
- Upcoming interviews list.
- "Needs attention" list — silent > N days, overdue reminders, offer deadlines approaching.

### 4.4 Reminders

- List view: due + upcoming follow-ups and interviews. Actions: complete, snooze (1d/3d/1w), jump to application.
- Auto-generated: follow-up nudge N days after last activity (default 7, configurable), interview reminders. Manual reminders can be added from the application detail panel.
- Sidebar bell badge = count of due items. In-app only for Phase 1 (web push is a later-phase concern).

### 4.5 Settings

- **Pipeline:** rename/add/reorder (drag)/recolor/delete stages.
- **Tags:** manage presets + custom tags (create, rename, delete). Presets: Dream job, High priority, Low priority, Remote, Referral, Onsite.
- **Preferences:** follow-up nudge threshold (days), default currency for salary.
- **Appearance:** light theme active; dark mode toggle slot visible but "coming soon".
- **Data:** export JSON (full fidelity) + CSV (applications flat table); import JSON (merge or replace, with confirmation); danger zone — clear all data (typed confirmation).

### 4.6 Explicitly out of Phase 1 scope

Auth pages, Supabase/sync, CV builder, cover letters, AI features, Gmail auto-tracking, web push notifications, PWA installability, dark mode toggle (tokens ready only), browser extension.

## 5. Data model (Dexie/IndexedDB)

```ts
Stage        { id, name, color /* palette key */, order }
Application  { id, company, role, location, workMode?, salaryMin?, salaryMax?,
               currency?, url?, source?, jdSnapshot?, tagIds[], stageId,
               order /* within column */, appliedAt?, createdAt, updatedAt,
               archived?: boolean }
Tag          { id, name, preset: boolean }
Interview    { id, applicationId, roundType, scheduledAt, locationOrLink?, notes? }
Contact      { id, applicationId, name, role?, email?, linkedin? }
ActivityEvent{ id, applicationId, kind /* created|stage_move|edit|note|manual|... */,
               payload, at }
Note         { id, applicationId, body, createdAt, updatedAt }
Reminder     { id, applicationId?, type /* follow_up|interview|custom */,
               dueAt, done: boolean, snoozedUntil? }
SettingsDoc  { id: 'singleton', nudgeDays, currency, theme: 'light' }
```

- Zustand store is the runtime source of truth; Dexie persists. A thin repository layer isolates persistence so Phase 4 can add Supabase sync + local-migration without touching UI.
- Derived data (dashboard metrics, nudges, due reminders) computed via selectors — never stored.
- Seed module provides realistic demo data on first run.

## 6. Motion design

All powered by Motion + dnd-kit; every effect has a `prefers-reduced-motion: reduce` fallback (instant transitions, no confetti).

- **Drag:** card lifts (scale ~1.03), tilts ~3°, shadow blooms; placeholder ghost stays in origin.
- **Drop targets:** column softly glows/tints when a card hovers over it.
- **Drop:** spring settle (slight overshoot); neighboring cards animate apart/together.
- **Hover:** subtle lift + shadow on cards, micro-transitions on buttons/nav.
- **Offer celebration:** confetti burst when a card lands in the Offer stage.
- **Dashboard:** stat count-ups, charts draw in on mount.
- **Panel/modal:** slide-over eases in; backdrop fades.

## 7. Accessibility (WCAG 2.1 AA) & SEO

- Keyboard-complete: dnd-kit keyboard sensor for card moves (space to lift, arrows to move, space to drop), logical tab order, visible focus rings (never removed without replacement), skip link.
- Contrast: dark text on soft tints passes 4.5:1 (the soft-tint decision guarantees headroom); placeholder text styled to pass; UI components ≥ 3:1.
- Semantics: real `<button>`/`<a>`/`<nav>`/`<main>`; ARIA only where native falls short (dialog for slide-over, `aria-live` for drag announcements + toasts, `aria-expanded` on menus, labels on icon-only buttons).
- 44px minimum touch targets; board on mobile = horizontally snap-scrolling columns.
- `<html lang="en">`, per-page `<title>` + meta description, OG/Twitter tags, JSON-LD WebSite/WebPage schema. (Single-app SEO baseline; marketing/landing page is a later concern.)

## 8. Responsive behavior

Desktop-first. Breakpoints: full sidebar ≥1024px; collapsed icon rail 768–1024px; mobile <768px = bottom tab bar (Dashboard, Board, Reminders, Settings), board columns snap-scroll horizontally, detail panel becomes full-screen sheet.

## 9. Error handling

- All writes optimistic with store rollback + toast on Dexie failure.
- Import validates against schema (Zod); a bad file reports errors and changes nothing.
- IndexedDB unavailable (private browsing edge cases): app runs in-memory with a persistent warning banner.
- Destructive actions (delete stage with cards, clear all data, replace-import) require explicit confirmation; deletes offer a brief undo toast where feasible.

## 10. Testing

- **Vitest:** stage move ordering, nudge/due-reminder logic, dashboard metric selectors, JSON/CSV export–import round-trip, quick-add parsing heuristics.
- **Playwright smoke:** add job → drag to Interview → nudge/reminder appears → dashboard reflects it → export succeeds.
- Manual pass: keyboard-only run-through and iOS Safari check before calling Phase 1 done.

## 11. Repo & project hygiene

- Fresh git repo (`main`). `.gitignore` includes `node_modules`, `.next`, `.env*` (with committed `.env.example` once any env var exists — none needed in Phase 1), and `.superpowers/`.
- No paid services in Phase 1 → no budget-cap concerns yet; revisit at Phase 3 (LLM) and Phase 4 (Supabase).
