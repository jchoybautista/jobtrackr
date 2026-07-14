# JobTrackr

A beautiful job-hunt tracker: pastel kanban pipeline, follow-up nudges,
interview tracking, and insights. Local-first — your data stays in your browser.

## Features
- **Board** — pastel kanban pipeline with drag-and-drop stages
- **Reminders** — follow-up nudges and interview tracking
- **Dashboard** — insights across your applications
- **CV builder** — a master profile you edit once, then spin off tailored
  versions per role; three polished templates (Classic, Modern, Elegant), a
  live A4 preview that re-renders as you type, and one-click client-side PDF
  export. CVs link back to applications, so each job carries its documents.

## Stack
Next.js 16 · TypeScript · Tailwind 4 · Zustand · Dexie (IndexedDB) · dnd-kit · Motion · Recharts

## Develop
```
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (Vitest)
npm run e2e        # smoke test (Playwright)
npm run build      # production build
```

## Roadmap
Phase 3: cover letters + AI ·
Phase 4: auth + cloud sync, dark mode, PWA
