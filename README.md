# JobTrackr

A beautiful, local-first job-hunt tracker: a pastel kanban pipeline, follow-up
nudges, interview tracking, insights, and a built-in CV builder. Your data stays
in your browser — no account, no backend.

<!-- Replace the URL below with your Vercel deployment once main is deployed. -->
**[Live demo →](https://YOUR-PROJECT.vercel.app)**

![JobTrackr board](docs/screenshots/board.png)

## Features

- **Board** — pastel kanban pipeline with pointer-accurate drag-and-drop across
  stages, editable columns, and per-application detail with buffered save (edits
  commit only when you choose, so nothing is lost by accident).
- **Reminders** — follow-up nudges after N days of silence and interview tracking.
- **Dashboard** — response rate, interview conversion, and other insights across
  your applications.
- **CV builder** — a master profile you edit once, then spin off tailored versions
  per role; three templates (Classic, Modern, Elegant) with a live A4 preview that
  re-renders as you type, and one-click client-side PDF export. Each CV links back
  to its application, so every job carries its documents.

Built desktop-first with responsive support, and to WCAG 2.1 AA — full keyboard
operation, visible focus, live-region status, and audited contrast.

## Stack

Next.js 16 · TypeScript · Tailwind 4 · Zustand · Dexie (IndexedDB) · dnd-kit ·
Motion · Recharts. Tested with Vitest + Testing Library and Playwright.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (Vitest)
npm run e2e        # smoke tests (Playwright)
npm run build      # production build
```

No environment variables required — the app is entirely client-side.

## Roadmap

- **Phase 3** — Cover Letter Generator (reuses the CV template system, tied to
  each application).
- **Phase 4** — AI: CV bullet-point polishing and cover-letter drafting via a
  rate-limited backend endpoint.
- **Later** — auth + cloud sync, dark mode, PWA install.
