# JobTrackr — Phase 2 (CV Builder) Design Spec

**Date:** 2026-07-12
**Status:** Approved by Jonathan (design presented and accepted in session; autonomous execution authorized)
**Builds on:** Phase 1 tracker (merged to main at `aeb07b8`); spec `2026-07-06-jobtrackr-phase1-tracker-design.md`

## 1. Summary

A CV/resume builder inside JobTrackr: fill a master profile once, spawn tailored CV versions per application, pick one of three prebuilt templates, toggle/reorder sections, and export a deterministic text-based A4 PDF — fully client-side, keeping the app local-first with zero backend.

Decisions locked during brainstorming:
- **3 templates** (Classic / Modern / Elegant) with ATS-safety badges.
- **Profile + versions** model: master profile is the single source of truth; each CV version snapshots it at creation and is tailored independently.
- **PDF engine: `@react-pdf/renderer`, client-side** — deterministic cross-browser output, real selectable text (ATS-parseable), offline, no server. (Supersedes the concept doc's server-side Puppeteer idea; the fidelity problem it solved is solved better by react-pdf's own layout engine.)
- No freeform theme editing (scrapped in Phase 1 brainstorming). Personalization = template choice + accent color from the existing 10-pastel palette + photo on/off + section visibility/order.

**Out of scope:** AI features (Phase 3), cover letters (Phase 3), DOCX export, auth/sync (Phase 4), template marketplace.

## 2. Research inputs (2026 ATS conventions)

- ATS-safe = single column, no photos/icons/tables, standard section headings ("Work Experience", "Education", "Skills", "Certifications"), Month Year date format, text-based PDF.
- Reverse-chronological is the default ordering; professional summary (2–4 sentences) over objective statements; skills section near the top.
- Photos/two-column layouts are human-reader features and regional (common in EU/Asia markets, avoided in US) — hence per-CV photo toggle and the ATS badge system: Classic = "ATS-safe"; Modern/Elegant = "Human-reader optimized" with a one-line caution.

## 3. Data model (Dexie schema version 2 — additive migration)

```ts
ProfileLink   { label: string; url: string }                    // portfolio, LinkedIn, GitHub…
ExperienceEntry { id, role, company, location?, startDate, endDate?/* undefined = present */, bullets: string[] }
EducationEntry  { id, school, degree, field?, startDate?, endDate?, notes? }
SkillGroup      { id, name, skills: string[] }                  // "Design: Figma, Prototyping…"
ProjectEntry    { id, name, url?, description, bullets: string[] }
CertEntry       { id, name, issuer?, date? }
LanguageEntry   { id, name, level? }
AwardEntry      { id, name, issuer?, date? }
VolunteerEntry  { id, role, org, startDate?, endDate?, description? }
ReferenceEntry  { id, name, role?, company?, email?, phone? }

CvContent {
  fullName, headline?, email?, phone?, location?, links: ProfileLink[],
  summary?, experience: ExperienceEntry[], education: EducationEntry[],
  skills: SkillGroup[], projects: ProjectEntry[], certifications: CertEntry[],
  languages: LanguageEntry[], awards: AwardEntry[], volunteer: VolunteerEntry[],
  interests?: string, references: ReferenceEntry[],
  referencesOnRequest: boolean,        // renders "References available on request"
}

Profile { id: "singleton"; content: CvContent; photo?: Blob; updatedAt }

SectionKey = "summary" | "experience" | "education" | "skills" | "projects"
           | "certifications" | "languages" | "awards" | "volunteer"
           | "interests" | "references"

CvDoc {
  id, name,                             // "Stripe — Product Designer"
  templateId: "classic" | "modern" | "elegant",
  accent: PaletteKey,                   // reuses Phase 1 palette
  showPhoto: boolean,                   // ignored by Classic (never renders photo)
  content: CvContent,                   // snapshot, independent after creation
  sections: { key: SectionKey; visible: boolean }[],   // ordered
  applicationId?: string,               // link to tracker
  createdAt, updatedAt,
}
```

- Photo stored as a Blob on `Profile` (IndexedDB handles Blobs natively); `CvDoc` uses the profile photo at render time (no per-CV photo copies — YAGNI).
- Dexie `version(2).stores(...)` adds `profile` and `cvdocs` tables; version-1 data untouched. `Snapshot`/export format bumps to include them (import accepts v1 files — new tables default empty).
- Repo layer gains `putProfile/loadProfile/putCvDoc/deleteCvDoc`; store gains matching actions; export/import (JSON) round-trips the new tables (photo serialized as base64 in exports).
- Deleting an Application nulls `applicationId` on linked CvDocs (no cascade delete of CVs).

## 4. Pages & UX

- **Sidebar:** new "CV Builder" item (FileText icon) between Board and Reminders. Mobile bottom bar becomes 5 tabs (5 × 78px at 390px width still exceeds the 44px touch-target minimum).
- **`/cv` — CV library:** grid of CvDoc cards (name, template badge, linked application, updated date, actions: edit/duplicate/delete/download) + "New CV" (template picker dialog with ATS badges → creates prefilled from Profile) + "Edit profile" button. Empty state prompts profile setup first.
- **`/cv/profile` — profile editor:** one form per section (matching the section library), photo upload (file input, validated type/size ≤ 2MB, preview, remove), autosaved on blur like the detail panel.
- **`/cv/[id]` — CV editor:** two-pane. Left: section list with visibility toggles + up/down reorder (same pattern as Settings pipeline editor) and per-section entry forms (add/remove/reorder entries, edit fields, bullet editors). Right: live A4 preview — the actual react-pdf output in an `<iframe>`, regenerated debounced ~500ms after edits. Toolbar: name (inline edit), template switcher (3 thumbnails), accent ColorPicker (reused, with excludeRef), photo toggle, link-to-application `<select>`, black **Download PDF** button.
- **Tracker integration:** Application detail panel gains a "Documents" section listing linked CVs (name + open link + unlink); JobCard's doc/note footer count includes linked CVs.

## 5. Templates (`src/cv/templates/`)

Shared contract:

```ts
interface TemplateProps { content: CvContent; sections: { key: SectionKey; visible: boolean }[];
  accent: string /* hex */; photoUrl?: string }
type CvTemplate = { id, name, atsSafe: boolean, note: string,
  render: (p: TemplateProps) => ReactElement /* react-pdf <Document> */ }
```

- **Classic** — ATS-safe: single column, no photo ever, standard headings, Plus Jakarta Sans, accent used only for thin rules/heading color (prints fine in grayscale).
- **Modern** — two-column: narrow accent-tinted sidebar (photo, contact, links, skills, languages) + main column (summary, experience, education…). Plus Jakarta Sans.
- **Elegant** — single column with serif display headings (Lora), small-caps section titles, optional photo top-right, generous whitespace.
- Fonts registered via `Font.register` with **bundled** TTFs (no external fetch — works offline; Plus Jakarta Sans + Lora, regular/bold/italic subsets).
- Shared section renderers per template family where sensible; date formatting "Mon YYYY – Mon YYYY / Present"; empty sections never render (even if visible=true but contentless).
- A4 page size, sensible margins, automatic page breaks (react-pdf `wrap`); every template renders "Page X of Y" in the footer only when the document exceeds one page.

## 6. PDF pipeline

- `pdf(<Template …/>).toBlob()` in a debounced effect → object URL → `<iframe title="CV preview">`; revoke stale URLs.
- Download = same blob via anchor `download="{cv.name}.pdf"`.
- Thumbnails on `/cv` cards: render first page to canvas via `pdfjs-dist`? — **No (YAGNI):** use a lightweight HTML/CSS mini-mock of the template style (static, cheap) instead of real PDF thumbnails.
- Errors: template render failures caught by an error boundary around the preview pane with a retry + "report" message; the editor forms never lose data on preview failure.

## 7. Quality bar

- App-side UI uses Phase 1 tokens/components exclusively (Button, Dialog, TagPill patterns, toast). WCAG AA: labeled inputs, aria-pressed toggles, keyboard-operable reorder buttons, focus management in dialogs, alt text on photo preview.
- Vitest: schema v2 migration (v1 data survives), profile→CV snapshot independence, section visibility/order logic, export/import round-trip incl. base64 photo, date formatter.
- Playwright smoke extension: create profile → new CV → toggle a section → PDF blob non-empty → appears in library.
- Chrome DevTools MCP live verification required for every UI task (implementers AND reviewers, per standing instruction).

## 8. Risks / notes

- `@react-pdf/renderer` bundle is heavy (~1MB+): load the entire CV feature via dynamic import so Board/Dashboard bundles are unaffected.
- react-pdf renders in the main thread; debounce + `useTransition` keeps typing responsive. If preview regeneration proves janky on large CVs, move rendering to a Web Worker (react-pdf supports it) — noted as an escape hatch, not built preemptively.
- Photo Blob in exports: base64 inflates file size (~33%); acceptable.
