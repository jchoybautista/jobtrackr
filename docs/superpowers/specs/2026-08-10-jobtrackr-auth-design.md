# JobTrackr — Authentication Design Spec

**Date:** 2026-08-10
**Status:** Approved by Jonathan (design presented and accepted in session)
**Builds on:** Phase 1 tracker (`2026-07-06-jobtrackr-phase1-tracker-design.md`), Phase 2 CV builder (`2026-07-12-jobtrackr-phase2-cv-builder-design.md`)
**Supersedes:** the auth half of "Phase 4" as sketched in the Phase 1 spec

## 1. Summary

Real user accounts for JobTrackr via Supabase Auth (email + password), four auth pages, cookie-backed sessions, and route protection. Local Dexie data becomes namespaced per account so two people sharing a browser never see each other's job hunt. A demo link on the sign-in page opens the app with the seeded dataset without creating any account.

Decisions locked during brainstorming:

- **Real auth, not a UI shell.** Supabase Auth with `@supabase/ssr` cookie sessions.
- **Email + password only.** No OAuth providers, no magic links.
- **Auth only — cloud sync is a separate spec.** Signing in establishes identity and isolates local data; it does not yet move data anywhere.
- **The app is gated.** Signed-out visitors land on `/login`.
- **Demo login creates no account.** A cookie-scoped local sandbox, seeded from the existing demo dataset.
- **Local data is namespaced per account** (`jobtrackr-<uid>`), which is also the seam the sync spec will build on.

**Out of scope:** cloud sync and local→remote migration (next spec), OAuth providers, magic links, MFA, account settings / delete account, email template design, organization or multi-user features.

## 2. Why sync is deliberately excluded

Sync is where the data-loss risk lives: a device already holding applications, CVs, and a master profile signs into an account that may also hold data, and something has to decide what survives. That deserves its own design pass. This spec ships the identity layer and, critically, leaves behind a per-user local store — exactly the shape sync needs to reconcile against a per-user row set in Postgres.

**Blocking precondition for the sync spec:** every table mirrored to Postgres must have RLS enabled with per-user policies *before* the first row is written. This spec creates no tables, so it introduces no RLS surface; that is not a reason to forget it later.

## 3. Route architecture

`AppShell` (sidebar, mobile tabs, toaster, store hydration) currently wraps every route from the root layout, so an auth page would inherit the app chrome. Split via route groups — no URL changes:

```
src/app/
  layout.tsx              fonts, JSON-LD, skip link          (no AppShell)
  (app)/
    layout.tsx            AppShell
    page.tsx              board            → /
    dashboard/page.tsx                     → /dashboard
    applications/page.tsx                  → /applications
    cv/page.tsx, cv/[id]/page.tsx, cv/profile/page.tsx
    reminders/page.tsx, settings/page.tsx
  (auth)/
    layout.tsx            centered card, no chrome
    login/page.tsx                         → /login
    signup/page.tsx                        → /signup
    forgot-password/page.tsx               → /forgot-password
    reset-password/page.tsx                → /reset-password
  auth/confirm/route.ts   verifies email-confirm + recovery tokens, then redirects
  auth/demo/route.ts      GET: sets the demo cookie, redirects to /
middleware.ts             refreshes the session cookie, enforces redirects
```

Moving the existing pages into `(app)/` is a file move only; their contents are unchanged.

### Middleware rules

Runs on every request except static assets, `_next/*`, and image files.

| Request | Session | Demo cookie | Result |
|---|---|---|---|
| app route | yes | — | pass through |
| app route | no | yes | pass through (demo sandbox) |
| app route | no | no | redirect `/login?next=<path>` |
| auth route | yes | — | redirect `/` |
| auth route | no | — | pass through |
| `/reset-password` | recovery session | — | always pass through |

Middleware also refreshes the Supabase session cookie on every pass, which is what keeps server components and the client in agreement about who is signed in.

## 4. Demo login

`/login` carries a **"Explore the demo →"** link pointing at `/auth/demo`, a GET route handler that:

1. Sets a `jobtrackr-demo` cookie — 30 days, `SameSite=Lax`, `Secure` in production. Not `httpOnly`: it grants nothing but access to a local sandbox.
2. Redirects to `/`, where the store hydrates against the `jobtrackr-demo` Dexie namespace and seeds the existing demo dataset if empty.

Middleware does not intercept `/auth/*` at all — those handlers manage their own cookies and redirects. `/auth/demo` makes its own decision instead: a visitor who already has a session is sent to `/` without a cookie being set, because scope resolution puts an account ahead of the demo cookie and nobody with a real board should land in a sandbox.

No Supabase user is created, so there is nothing to rate limit, reset, or clean up, and no MAU cost.

The existing demo banner on the board gains a **"Create an account"** link to `/signup`, alongside copy reading "…create an account to start tracking your own hunt." Legacy adoption only covers the un-namespaced `jobtrackr` database, so demo data never carries forward into a new account — the banner must not promise to "keep this" data, since it doesn't. "Clear demo data" additionally drops the demo cookie and returns to `/login`.

Demo and account data never collide: they are different databases.

## 5. Per-account local data

`src/lib/db.ts` currently exports a module-level `new Dexie("jobtrackr")`. It is imported by exactly two modules — `src/lib/repo.ts` and `src/lib/seed.ts` — so the change is contained.

```ts
// db.ts
export type DbScope = { kind: "user"; userId: string } | { kind: "demo" };
export function dbNameFor(scope: DbScope): string;   // jobtrackr-<uid> | jobtrackr-demo
export function openDb(scope: DbScope): JobTrackrDb; // memoized per name
export function currentDb(): JobTrackrDb;            // throws if no scope is set
export function setScope(scope: DbScope): void;
export function closeDb(): void;
```

- `repo.ts` keeps its exported API unchanged and resolves `currentDb()` per call.
- The store's `hydrate()` resolves the scope from the Supabase session (`user.id`) or the demo cookie, calls `setScope`, then loads as it does today.
- Sign-out calls `closeDb()` and resets the store to its empty state. **No data is deleted** — signing back in on that device restores it.
- The Dexie schema (versions 1–3) is unchanged; only the database *name* varies.

### Legacy database adoption

Anyone using JobTrackr today has data in the un-namespaced `jobtrackr` database, which the new naming would orphan. On first successful sign-in:

- if `jobtrackr` exists **and** `jobtrackr-<uid>` is absent or empty → copy every table across, then record the claim and leave the legacy database in place rather than deleting it;
- otherwise → do nothing.

The claim is written into the legacy database itself, via a schema version that adds a single-row `meta` table (`{ id: "legacy", claimedBy: <uid>, claimedAt: <iso> }`) — it travels with the data rather than sitting in separately-clearable storage. Both guards are checked, so a cleared claim still cannot overwrite a populated target.

One-time, one-way, non-destructive. A second account signing in on the same device finds the legacy database already claimed and starts empty.

## 6. Pages

All four are built from the existing kit: `Button`, `inputClass`/`labelClass` from `form-kit`, `rounded-2xl border border-line-2 bg-surface` cards, `toast()` for success feedback. Centered single-column layout, app logo at top, no sidebar.

| Route | Fields | Primary action | Secondary |
|---|---|---|---|
| `/login` | email, password | Sign in | Forgot password? · Create an account · **Explore the demo →** |
| `/signup` | email, password (min 8) | Create account → "check your inbox" state | Already have an account? |
| `/forgot-password` | email | Send reset link → inbox state | Back to sign in |
| `/reset-password` | new password (min 8) | Update password → redirect `/` | — |

Validation with zod schemas shared between client and any future server use. Errors are surfaced per field; Supabase failures (bad credentials, rate limited, unconfirmed email) map to plain-language form-level messages that never disclose whether an email is registered.

### Accessibility (WCAG 2.1 AA)

- Every input has a real `<label>`; required fields carry `aria-required`, invalid ones `aria-invalid` plus `aria-describedby` pointing at the error text.
- Form-level errors render in `role="alert"`; inbox-confirmation states in `aria-live="polite"`.
- `autoComplete`: `email`, `current-password`, `new-password`.
- On failed submit, focus moves to the first invalid field.
- Submit buttons disable while in flight and expose `aria-busy`; spinners respect `prefers-reduced-motion`.
- 44×44px minimum targets, visible focus rings on every control, body text ≥ 4.5:1 including placeholders.

### SEO

Per-page `<title>` and description; `robots: { index: false, follow: false }` on all four auth pages — they are not content and must not be indexed.

## 7. Security

- **RLS** — no tables are created; identity lives in `auth.users`. No RLS surface today. Blocking precondition recorded for the sync spec (§2).
- **Rate limiting** — no custom backend routes exist; all auth traffic hits Supabase's own endpoints. Their per-hour limits for sign-in attempts and transactional email are to be set explicitly in project config rather than inherited as defaults. Client-side, submit is locked while a request is in flight.
- **Secrets** — only `NEXT_PUBLIC_SUPABASE_URL` and the publishable (anon) key reach the browser; both are public identifiers whose safety rests on RLS. The service-role key never enters the app. `.env.example` is committed with placeholders (none exists today); `.env*` is already gitignored correctly.
- **Sessions** — cookie-based via `@supabase/ssr`, `httpOnly` where the library sets them, `Secure` in production, refreshed in middleware.
- **Disclosure** — sign-in and password-reset responses are uniform whether or not the email exists.
- **Billing** — set a Supabase spend cap and billing alert before this is deployed publicly.

## 8. Testing

**Unit (vitest)**
- `dbNameFor` scope resolution: user → `jobtrackr-<uid>`, demo → `jobtrackr-demo`.
- Legacy adoption: adopts when legacy exists and target is empty; no-ops when target has data; no-ops when already claimed.
- zod schemas: email shape, password minimum, mismatch and empty cases.
- Middleware decision table (§3) as a pure function over `{ path, hasSession, hasDemoCookie }`.

**Component (testing-library)**
- Each form renders labelled fields, blocks invalid submits, announces errors, and disables submit in flight.
- `/login` renders the demo link pointing at `/auth/demo`.

**E2E (playwright)**
- Demo path: `/login` → demo link → board shows the seeded 37-application dataset.
- Signed-out visit to `/dashboard` redirects to `/login?next=/dashboard`.
- Sign-out from the app returns to `/login` and a subsequent `/` visit stays there.

Account creation and sign-in against live Supabase are **not** wired into CI — that needs a dedicated test project and credentials in the runner. Those paths are covered by unit and component tests, then verified manually against the real project before deploy. The existing three E2E specs must be updated: they currently assume the board is reachable at `/` with no session, and will need the demo cookie set in a fixture.

## 9. Consequences

- The board is gated. On a fresh browser, `/login` comes first; an account or the demo link is required to get in. This includes local development.
- A Supabase project must exist before the app runs at all — `.env.local` with URL and publishable key becomes a prerequisite for `npm run dev`. The auth pages should fail with a clear configuration error rather than a stack trace when the keys are absent.
- Existing local data survives via the adoption path (§5), but only for the first account to sign in on that device.
- The Supabase MCP connector is not authorized in the current session, so project creation and configuration are manual dashboard steps unless it is authorized via `/mcp`.

## 10. Deferred

Cloud sync and local→remote migration (next spec), OAuth providers, magic links, MFA, account settings and delete-account, custom email templates, PWA/offline auth behavior, dark mode.
