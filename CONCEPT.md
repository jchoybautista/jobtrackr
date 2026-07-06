# JobTrackr — App Concept

Status: **Ideation stage only.** No code written, no tech stack chosen, no repo initialized yet. Purpose right now is a portfolio project to showcase Claude Code skills — not aimed at App Store/Play Store release in the near term.

## What is this app?

A job hunt tracker, built as a **mobile-responsive website** (not a native mobile app — see Platform Decision below). The core is tracking job applications end-to-end; a CV/resume builder and a cover letter generator are bundled in as supporting features, each tied back to the specific application they were used for.

## Platform Decision: Website, not native app

Decided: build as a **web app, desktop-first with mobile-responsive support** — not native/React Native/Flutter — at least for now.

Usage pattern: users will primarily use this on PC/desktop (it's a job-search + document-editing workflow, which fits a bigger screen), with mobile used occasionally — e.g. checking status on the go. Design desktop-first, then add responsive breakpoints for mobile, rather than mobile-first.

Reasoning:
- No feature here needs native device APIs (no camera, no background location) — it's CRUD + document generation + AI text generation, all of which work fine on the web
- Much faster to build/iterate: one codebase, no app-store review cycle, free/cheap hosting
- Easier to share as a portfolio piece — a link beats asking someone to sideload a TestFlight build or APK
- Can be built as a **PWA** (installable to home screen, works offline-ish) to get most of the "feels like an app" experience without app-store distribution

Tradeoff accepted: no native App Store/Play Store listing for now, and push notifications are a bit clunkier on iOS Safari than a true native app.

Future path if app-store distribution is ever wanted: wrap the same web app with **Capacitor** (or similar) to ship it natively without a full rewrite — this doesn't block the Monetization Plan below, it just delays native-specific work until it's justified.

## Core Feature: Job Hunt Tracker

- Application pipeline / Kanban view: Saved → Applied → Phone Screen → Interview → Offer → Rejected
- Per-application record: company, role, salary range, job posting link, date applied, source (LinkedIn, referral, etc.)
- Follow-up reminders — nudge after N days of silence, before interviews
- Contacts/notes per application — recruiter/interviewer names, interview notes, questions asked
- Analytics dashboard — response rate, interview conversion rate, time-to-offer, applications/week

### Explored, not decided: Gmail auto-tracking
- Idea: parse Gmail for application confirmation / rejection / interview-invite emails to auto-update status
- Feasible via Gmail API (keyword/sender matching, optionally LLM classification for messy phrasing)
- Blockers to revisit: requires Google's sensitive-scope (`gmail.readonly`) security review (CASA assessment) before production use; needs a privacy policy; auto-detected status should be user-confirmable, not silently authoritative (companies phrase these emails very differently)

## Template System (shared by CV Builder & Cover Letter Generator)

- **Page size:** standard **A4**, for both CV and cover letter documents — so exports are print-ready, not just screen-ready
- **Prebuilt templates:** a library of modern CV templates and cover letter templates, designed and built by us (not third-party)
- **Full template editing, not just text:**
  - Edit all text content (obviously)
  - Upload/replace images — e.g. swap the profile photo on a CV template
  - Change colors (accent color, text color, etc.)
  - Change backgrounds
- This makes the editor closer to a lightweight design tool (Canva-lite) than a plain fill-in-the-blanks form — bigger scope than a basic template picker, worth sizing accordingly when building
- **Technical notes for later:**
  - Reliable pixel-perfect A4 export across browsers/devices is hard with browser print alone — plan on **server-side PDF rendering** (e.g. Puppeteer/Playwright rendering the HTML template to PDF) for consistent output, rather than relying purely on the browser's print-to-PDF
  - Image uploads need file type/size validation and a storage solution (e.g. object storage/bucket) — flag for RLS/access-control setup when using a backend like Supabase, so one user can't access another's uploaded images

## Feature: CV / Resume Builder

- Uses the Template System above — prebuilt modern templates, A4, fully editable (text, photo, colors, background)
- Section-based editor — experience, education, skills, projects, certifications, languages — with drag-and-drop reordering
- Export to PDF (DOCX optional)
- Multiple CV versions — duplicate/tailor per application, linked back to the tracker entry

### AI sub-feature: bullet-point polishing
- Flow: user pastes a job description + a rough bullet point → AI returns several rewritten, quantified/achievement-oriented variants
- Cost is trivial per generation (fractions of a cent on a cheap model like Claude Haiku 4.5); not literally "free" since API usage is token-billed, but cheap enough to absorb
- **Decision:** since this is a portfolio project right now, avoid linking any payment method — use a no-card-required free-tier LLM API instead (Google AI Studio/Gemini free tier, Groq, or OpenRouter's free-tagged models). Re-evaluate the provider's current terms before committing, and note free tiers may use input data for training — worth checking given resumes contain real personal info.
- **Architecture note:** keep this feature behind an isolated service/module so it can be removed or swapped out later without touching the rest of the app (e.g. if publishing to app stores without wanting an ongoing paid dependency)
- **Security note:** never call the LLM API directly from the client (browser) with an embedded key — route through a backend endpoint, and rate-limit that endpoint (it's user-triggered and costs money per call)
- **Monetization note:** for the portfolio version this stays free (no-card LLM). If/when this goes live for real users, gate this behind a Pro tier — see Monetization Plan below.

### Differentiators discussed, not yet built
- ATS compatibility checker — flag layout choices (tables, columns, graphics) that break automated parsing
- Job-description keyword gap analysis
- LinkedIn import to prefill a CV

## Feature: Cover Letter Generator

- Uses the Template System above — prebuilt modern templates, A4, fully editable (text, colors, background)
- Manual option — user writes their own
- AI-generated option — user enters company + role (consider also accepting an optional job description or a few key highlights, same pattern as the CV polishing feature, for less generic output) → AI drafts a letter using the CV's data
- Tied to the specific job application, alongside the CV version used — closes the loop: each tracked application can show exactly which CV + cover letter were sent
- AI-generated option is also a Pro-tier candidate once published (see Monetization Plan below) — same underlying AI service as the CV bullet-point polishing feature

## Monetization Plan (future — only relevant once this is live for real users)

- **Free tier:** job tracker, CV builder, manual cover letter writing — all core, non-AI functionality
- **Pro tier:** AI features gated behind a paid tier/subscription — AI bullet-point polishing and AI-generated cover letters
- Rationale: AI calls are the only feature with a real per-use cost (LLM API tokens); gating them behind Pro is what funds moving off the free-tier/no-card LLM provider onto a paid one (e.g. Claude API) with better quality and reliability once there's revenue to cover it
- Not relevant for the current portfolio build — the whole app, AI included, stays free and card-free for now
- If native app-store distribution is ever pursued (via the Capacitor wrap mentioned in Platform Decision), this Pro tier plan carries over unchanged

## App Naming

Direction settled on: the name should make the app's purpose legible on sight (not abstract/clever).

Candidates discussed:
- **JobTrackr** — front-runner; literal, plus keyword-heavy names tend to help App Store search discoverability
- ApplyTrack
- CareerTrack Hub — leans into the "hub/suite" framing since CV + cover letter are bundled in
- JobHunt HQ

Not finalized — revisit next session.

## Next steps when resuming

- Finalize the app name
- Pick a web tech stack (framework, PWA-capable, mobile-responsive design)
- Set up project scaffold + repo
- Design the data model (Application, CVVersion, CoverLetter entities, and how they relate)
- Design core screens/flows (pipeline board, CV editor, cover letter generator)
- Design the prebuilt CV & cover letter templates (A4, modern styles)
- Build the template editor (text, image upload, color/background customization) and the A4 PDF export pipeline (server-side rendering)
- Wire up the chosen free-tier LLM provider for the AI features
- When ready to monetize/go live: implement Pro-tier paywall/subscription and swap the AI backend to a paid provider
- If native distribution is wanted later: wrap with Capacitor (or similar) rather than rewriting
