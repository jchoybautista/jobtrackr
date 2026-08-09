# JobTrackr Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real user accounts to JobTrackr — Supabase email/password auth, four auth pages, middleware route protection, per-account local databases, and a demo link that needs no account.

**Architecture:** Supabase Auth with `@supabase/ssr` cookie sessions, read in middleware and server components. Existing pages move into an `(app)` route group so auth pages don't inherit the sidebar; URLs are unchanged. The Dexie database name becomes scope-dependent (`jobtrackr-<uid>` or `jobtrackr-demo`), resolved server-side in the `(app)` layout and passed into `AppShell`. No sync — signing in identifies you and isolates your local data; it does not move data anywhere.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19, TypeScript, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Dexie 4, Zustand 5, zod 4, Tailwind, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-10-jobtrackr-auth-design.md`

## Global Constraints

- **Auth method:** email + password only. No OAuth, no magic links, no MFA.
- **No cloud sync in this plan.** Do not write any table-mirroring, upload, or reconciliation code.
- **No new Postgres tables.** Identity lives in `auth.users`. Therefore no RLS surface in this plan.
- **Password minimum:** 8 characters. Applied identically in `/signup` and `/reset-password`.
- **Demo cookie:** name `jobtrackr-demo`, 30 days, `SameSite=Lax`, `Secure` in production, **not** `httpOnly`.
- **Database names:** `jobtrackr-<uid>` for accounts, `jobtrackr-demo` for demo, `jobtrackr` is the legacy pre-auth database.
- **Non-disclosure:** sign-in and password-reset responses must never reveal whether an email is registered.
- **Secrets:** only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may reach the browser. The service-role key must never appear anywhere in `src/`.
- **Accessibility (WCAG 2.1 AA):** every input has a real `<label>`; errors wired with `aria-invalid` + `aria-describedby`; form-level errors in `role="alert"`; correct `autoComplete` tokens; submit disabled + `aria-busy` while in flight; 44×44px minimum targets; visible focus rings.
- **SEO:** all four auth pages export `robots: { index: false, follow: false }`.
- **Existing conventions:** use `Button` from `@/components/ui/Button`, `inputClass`/`labelClass` from `@/components/cv/form-kit`, `toast()` from `@/components/ui/Toast`. Card surfaces are `rounded-2xl border border-line-2 bg-surface`.
- **The four auth forms stay independent** — no shared `useAuthForm` hook or form abstraction. Ruled on by the project owner during pre-flight: the forms diverge (two have inbox states, one has a demo link, one has no email field), and each staying readable start to finish beats one helper flexing for four shapes. Repeated `useState`/submit/error-banner scaffolding across the four is therefore intended, not a defect. Shared *presentation* stays factored (`AuthCard`, `AuthField`).
- **Commit style:** conventional commits, and every commit message ends with the `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` trailer.
- **Verification gate:** `npx tsc --noEmit` and `npx vitest run` must both pass before any commit.

---

## File Structure

**Create:**

| File | Responsibility |
|---|---|
| `.env.example` | Committed placeholders for the two public env vars |
| `src/lib/supabase/env.ts` | Reads + validates env vars, throws one clear configuration error |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server-component Supabase client (async cookies) |
| `src/lib/supabase/middleware.ts` | `updateSession()` — refreshes the session cookie in middleware |
| `src/lib/auth/routes.ts` | Cookie/path constants + `decideRoute()`, the pure redirect decision |
| `src/lib/auth/schemas.ts` | zod schemas for all four forms |
| `src/lib/auth/messages.ts` | Supabase error → plain-language, non-disclosing message |
| `src/lib/auth/scope.ts` | Server-only: resolve `DbScope` from session or demo cookie |
| `src/lib/legacy.ts` | One-time adoption of the pre-auth `jobtrackr` database |
| `src/middleware.ts` | Middleware: refresh session, apply `decideRoute`. Must live in `src/`, not the repo root — this project keeps its App Router at `src/app`, and Next never invokes a root-level middleware in that layout (verified empirically during Task 3). |
| `src/components/auth/AuthCard.tsx` | Shared auth page shell (logo, heading, card) |
| `src/components/auth/AuthField.tsx` | Labelled input with full error wiring |
| `src/components/auth/LoginForm.tsx` | Sign-in form + demo link |
| `src/components/auth/SignupForm.tsx` | Sign-up form + inbox state |
| `src/components/auth/ForgotPasswordForm.tsx` | Reset-request form + inbox state |
| `src/components/auth/ResetPasswordForm.tsx` | New-password form |
| `src/components/shell/AccountMenu.tsx` | Sidebar footer: email + sign out |
| `src/app/(auth)/layout.tsx` | Centered, chrome-free layout |
| `src/app/(auth)/{login,signup,forgot-password,reset-password}/page.tsx` | Four route entries + metadata |
| `src/app/(app)/layout.tsx` | Resolves scope, renders `AppShell` |
| `src/app/auth/demo/route.ts` | GET: set demo cookie → redirect `/` |
| `src/app/auth/confirm/route.ts` | GET: verify email-confirm / recovery token |
| `src/app/auth/signout/route.ts` | POST: sign out → redirect `/login` |

**Modify:**

| File | Change |
|---|---|
| `src/lib/db.ts` | Module singleton → scope-keyed `openDb`/`currentDb`; add `meta` table (v4) |
| `src/lib/repo.ts` | `db.` → `currentDb().` (56 call sites) |
| `src/lib/seed.ts` | Same substitution (one call site) |
| `src/lib/store.ts` | `hydrate(scope)`, add `resetLocal()` |
| `src/components/shell/AppShell.tsx` | Accept `scope` prop, pass to `hydrate` |
| `src/components/shell/Sidebar.tsx` | Render `AccountMenu` |
| `src/app/layout.tsx` | Drop `AppShell` |
| `src/app/{page,dashboard,applications,cv,reminders,settings}` | Move into `(app)/` |
| `src/components/board/BoardPage.tsx` | Demo banner gains "Create an account" |
| `e2e/smoke.spec.ts` | Demo-cookie fixture |
| `README.md` | Setup prerequisites |

---

## Task 1: Supabase dependencies, env config, and clients

**Files:**
- Create: `.env.example`, `src/lib/supabase/env.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
- Test: `src/lib/supabase/__tests__/env.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `supabaseEnv(): { url: string; anonKey: string }` — throws `Error` with a setup message when either var is missing or blank.
  - `createBrowserSupabase(): SupabaseClient` (from `client.ts`)
  - `createServerSupabase(): Promise<SupabaseClient>` (from `server.ts`)

- [ ] **Step 1: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/supabase/__tests__/env.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { supabaseEnv } from "@/lib/supabase/env";

const ORIGINAL = { ...process.env };
afterEach(() => { process.env = { ...ORIGINAL }; });

describe("supabaseEnv", () => {
  it("returns both values when configured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    expect(supabaseEnv()).toEqual({ url: "https://abc.supabase.co", anonKey: "anon-key" });
  });

  it("names the missing variable and points at .env.example", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    expect(() => supabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => supabaseEnv()).toThrow(/\.env\.example/);
  });

  it("treats whitespace-only values as missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "   ";
    expect(() => supabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/supabase/__tests__/env.test.ts`
Expected: FAIL — cannot resolve `@/lib/supabase/env`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/supabase/env.ts`:

```ts
/**
 * The two public Supabase identifiers. Both ship to the browser by design —
 * they identify the project, they don't authorize anything. Access control is
 * RLS's job, never these keys'.
 */
export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `${name} is not set. JobTrackr needs a Supabase project to run: copy ` +
      `.env.example to .env.local and fill in the values from your project's ` +
      `API settings.`,
    );
  }
  return value;
}

export function supabaseEnv(): SupabaseEnv {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/supabase/__tests__/env.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Write the two clients**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

export function createBrowserSupabase() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient(url, anonKey);
}
```

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

export async function createServerSupabase() {
  // cookies() first, deliberately. It is what tells Next this route renders
  // dynamically; if the env check threw ahead of it, `next build` would die
  // trying to prerender the app routes instead of marking them dynamic.
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        // Server Components cannot set cookies; middleware refreshes the
        // session instead, so swallowing here is correct rather than lazy.
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          /* called from a Server Component — middleware handles the refresh */
        }
      },
    },
  });
}
```

- [ ] **Step 7: Write `.env.example`**

Create `.env.example`:

```bash
# Supabase — Project Settings → API. Both values are public identifiers that
# ship to the browser; access control is enforced by RLS, not by these keys.
# Copy this file to .env.local and fill in your project's values.
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Never put the service_role key in this project. It bypasses RLS and this app
# has no server-side use for it.
```

- [ ] **Step 8: Verify `.env.local` cannot be committed**

Run: `git check-ignore -v .env.local && git check-ignore -v .env.example; echo "exit=$?"`
Expected: `.env.local` matches a `.gitignore` rule; `.env.example` does **not** (exit 1 on the second call, which is correct — it must stay committed).

- [ ] **Step 9: Typecheck and commit**

```bash
npx tsc --noEmit && npx vitest run
git add package.json package-lock.json .env.example src/lib/supabase
git commit -m "$(cat <<'EOF'
feat(auth): add Supabase clients and validated env config

Fails with a setup message naming the missing variable rather than a
stack trace, since a missing project now stops the whole app.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: The route decision function

The whole redirect policy as one pure function, so it is testable without Next's runtime.

**Files:**
- Create: `src/lib/auth/routes.ts`
- Test: `src/lib/auth/__tests__/routes.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `DEMO_COOKIE = "jobtrackr-demo"`
  - `AUTH_PATHS: readonly string[]`
  - `decideRoute(ctx: RouteContext): RouteDecision`
  - `RouteContext = { path: string; hasSession: boolean; hasDemoCookie: boolean }`
  - `RouteDecision = { action: "pass" } | { action: "redirect"; to: string }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/auth/__tests__/routes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { decideRoute, DEMO_COOKIE } from "@/lib/auth/routes";

const ctx = (over: Partial<Parameters<typeof decideRoute>[0]> = {}) => ({
  path: "/", hasSession: false, hasDemoCookie: false, ...over,
});

describe("decideRoute", () => {
  it("names the demo cookie consistently", () => {
    expect(DEMO_COOKIE).toBe("jobtrackr-demo");
  });

  it("lets a signed-in user reach app routes", () => {
    expect(decideRoute(ctx({ path: "/dashboard", hasSession: true }))).toEqual({ action: "pass" });
  });

  it("lets a demo visitor reach app routes without a session", () => {
    expect(decideRoute(ctx({ path: "/dashboard", hasDemoCookie: true }))).toEqual({ action: "pass" });
  });

  it("sends a signed-out visitor to login, preserving where they were going", () => {
    expect(decideRoute(ctx({ path: "/dashboard" })))
      .toEqual({ action: "redirect", to: "/login?next=%2Fdashboard" });
  });

  it("does not add a next param for the board itself", () => {
    expect(decideRoute(ctx({ path: "/" }))).toEqual({ action: "redirect", to: "/login" });
  });

  it("bounces a signed-in user off the auth pages", () => {
    for (const path of ["/login", "/signup", "/forgot-password"]) {
      expect(decideRoute(ctx({ path, hasSession: true }))).toEqual({ action: "redirect", to: "/" });
    }
  });

  it("always allows reset-password, session or not", () => {
    // A recovery link establishes a session; bouncing it to / would make the
    // reset form unreachable for exactly the people who need it.
    expect(decideRoute(ctx({ path: "/reset-password", hasSession: true }))).toEqual({ action: "pass" });
    expect(decideRoute(ctx({ path: "/reset-password" }))).toEqual({ action: "pass" });
  });

  it("lets signed-out visitors see the auth pages", () => {
    expect(decideRoute(ctx({ path: "/login" }))).toEqual({ action: "pass" });
  });

  it("never intercepts /auth/* route handlers", () => {
    for (const path of ["/auth/demo", "/auth/confirm", "/auth/signout"]) {
      expect(decideRoute(ctx({ path }))).toEqual({ action: "pass" });
      expect(decideRoute(ctx({ path, hasSession: true }))).toEqual({ action: "pass" });
    }
  });

  it("encodes query strings in the next param", () => {
    expect(decideRoute(ctx({ path: "/cv/demo-cv-2" })))
      .toEqual({ action: "redirect", to: "/login?next=%2Fcv%2Fdemo-cv-2" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/auth/__tests__/routes.test.ts`
Expected: FAIL — cannot resolve `@/lib/auth/routes`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/auth/routes.ts`:

```ts
/** Grants access to the local demo sandbox and nothing else, so it does not
 *  need to be httpOnly. */
export const DEMO_COOKIE = "jobtrackr-demo";

export const AUTH_PATHS = [
  "/login", "/signup", "/forgot-password", "/reset-password",
] as const;

/** Reached from an emailed recovery link, which itself establishes a session —
 *  so the "signed in users leave auth pages" rule must not apply to it. */
const ALWAYS_OPEN = "/reset-password";

export interface RouteContext {
  path: string;
  hasSession: boolean;
  hasDemoCookie: boolean;
}

export type RouteDecision =
  | { action: "pass" }
  | { action: "redirect"; to: string };

const PASS: RouteDecision = { action: "pass" };

export function decideRoute({ path, hasSession, hasDemoCookie }: RouteContext): RouteDecision {
  // Route handlers manage their own cookies and redirects.
  if (path.startsWith("/auth/")) return PASS;
  if (path === ALWAYS_OPEN) return PASS;

  if ((AUTH_PATHS as readonly string[]).includes(path)) {
    return hasSession ? { action: "redirect", to: "/" } : PASS;
  }

  if (hasSession || hasDemoCookie) return PASS;

  const to = path === "/" ? "/login" : `/login?next=${encodeURIComponent(path)}`;
  return { action: "redirect", to };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/auth/__tests__/routes.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/lib/auth
git commit -m "$(cat <<'EOF'
feat(auth): add pure route decision function

The redirect policy as a pure function over {path, session, demo cookie},
so the whole table is unit-testable without Next's runtime.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Middleware wiring

**Files:**
- Create: `src/lib/supabase/middleware.ts`, `src/middleware.ts`

**Interfaces:**
- Consumes: `supabaseEnv()` (Task 1), `decideRoute`, `DEMO_COOKIE` (Task 2).
- Produces: `updateSession(request: NextRequest): Promise<{ response: NextResponse; hasSession: boolean }>`

- [ ] **Step 1: Write the session refresher**

Create `src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

/**
 * Refreshes the Supabase session cookie and reports whether the request is
 * authenticated. Uses getUser() rather than getSession() — getUser revalidates
 * against the auth server, so a forged or stale cookie cannot pass for a session.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; hasSession: boolean }> {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  return { response, hasSession: data.user != null };
}
```

- [ ] **Step 2: Write the middleware**

Create `src/middleware.ts` (in `src/`, beside `app/` — NOT the repo root; with an `src/app` layout Next silently never invokes a root-level middleware):

```ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { decideRoute, DEMO_COOKIE } from "@/lib/auth/routes";

export async function middleware(request: NextRequest) {
  const { response, hasSession } = await updateSession(request);

  // decideRoute matches auth paths by exact equality, so "/login/" would slip
  // past the auth-path branch and land in the protected-route one. Normalize
  // the trailing slash rather than loosening the matcher.
  const raw = request.nextUrl.pathname;
  const path = raw.length > 1 ? raw.replace(/\/+$/, "") : raw;

  const decision = decideRoute({
    path,
    hasSession,
    hasDemoCookie: request.cookies.has(DEMO_COOKIE),
  });

  if (decision.action === "pass") return response;

  const target = new URL(decision.to, request.url);
  const redirect = NextResponse.redirect(target);
  // Carry over any refreshed session cookies, or the redirect drops them and
  // the next request looks signed out again.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: [
    // Everything except Next internals, static assets, and the two things that
    // must stay reachable without a session: the OG image (or every social
    // preview redirects to the sign-in page) and the .ttf files react-pdf
    // fetches at render time (which would otherwise cost a getUser() round
    // trip per font, per render).
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|woff|woff2)$).*)",
  ],
};
```

- [ ] **Step 3: Verify the typecheck passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify middleware loads without a Supabase project**

Run: `npm run dev` (no `.env.local` present), then `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/`
Expected: `500` — and the dev server log names `NEXT_PUBLIC_SUPABASE_URL`, not an opaque stack trace. This confirms the Task 1 error message reaches a real failure path. Stop the server afterwards.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/lib/supabase/middleware.ts
git commit -m "$(cat <<'EOF'
feat(auth): protect routes in middleware

getUser() rather than getSession() so a forged cookie cannot pass, and
refreshed cookies are copied onto redirects so sessions survive them.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Form schemas and error messages

**Files:**
- Create: `src/lib/auth/schemas.ts`, `src/lib/auth/messages.ts`
- Test: `src/lib/auth/__tests__/schemas.test.ts`, `src/lib/auth/__tests__/messages.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `signInSchema`, `signUpSchema`, `forgotSchema`, `resetSchema` (all zod objects)
  - `firstErrors(result): Record<string, string>` — field name → first message
  - `authErrorMessage(raw: string | null | undefined): string`

- [ ] **Step 1: Write the failing schema test**

Create `src/lib/auth/__tests__/schemas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { signInSchema, signUpSchema, forgotSchema, resetSchema, firstErrors } from "@/lib/auth/schemas";

describe("auth schemas", () => {
  it("accepts a valid sign-in", () => {
    expect(signInSchema.safeParse({ email: "a@b.com", password: "hunter22" }).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const r = signInSchema.safeParse({ email: "not-an-email", password: "hunter22" });
    expect(r.success).toBe(false);
    expect(firstErrors(r).email).toMatch(/valid email/i);
  });

  it("requires a password on sign-in but does not impose a length rule", () => {
    // Length rules on sign-in leak policy and annoy people with legacy passwords.
    expect(signInSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    const r = signInSchema.safeParse({ email: "a@b.com", password: "" });
    expect(firstErrors(r).password).toMatch(/password/i);
  });

  it("enforces 8 characters on sign-up", () => {
    const r = signUpSchema.safeParse({ email: "a@b.com", password: "short7!" });
    expect(r.success).toBe(false);
    expect(firstErrors(r).password).toMatch(/8 characters/);
    expect(signUpSchema.safeParse({ email: "a@b.com", password: "eightchr" }).success).toBe(true);
  });

  it("enforces the same 8 characters on reset", () => {
    expect(resetSchema.safeParse({ password: "short7!" }).success).toBe(false);
    expect(resetSchema.safeParse({ password: "eightchr" }).success).toBe(true);
  });

  it("trims and lowercases the email on forgot-password", () => {
    const r = forgotSchema.safeParse({ email: "  A@B.COM  " });
    expect(r.success && r.data.email).toBe("a@b.com");
  });

  it("returns one message per field", () => {
    const r = signUpSchema.safeParse({ email: "nope", password: "x" });
    expect(Object.keys(firstErrors(r)).sort()).toEqual(["email", "password"]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/auth/__tests__/schemas.test.ts`
Expected: FAIL — cannot resolve `@/lib/auth/schemas`.

- [ ] **Step 3: Write the schemas**

Create `src/lib/auth/schemas.ts`:

```ts
import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(
  z.string().min(1, "Enter your email address").email("Enter a valid email address"),
);

/** Sign-up and reset only. Sign-in deliberately has no length rule — it would
 *  leak the policy and lock out anyone whose password predates it. */
const newPassword = z.string().min(8, "Password must be at least 8 characters");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z.object({ email, password: newPassword });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ password: newPassword });

/** One message per field, which is all a form can show at once. */
export function firstErrors(result: z.ZodSafeParseResult<unknown>): Record<string, string> {
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/auth/__tests__/schemas.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Write the failing message test**

Create `src/lib/auth/__tests__/messages.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { authErrorMessage } from "@/lib/auth/messages";

describe("authErrorMessage", () => {
  it("keeps bad credentials non-disclosing", () => {
    const msg = authErrorMessage("Invalid login credentials");
    expect(msg).toMatch(/email or password/i);
    // Must not confirm whether the account exists.
    expect(msg).not.toMatch(/no account|not registered|does not exist/i);
  });

  it("explains an unconfirmed email", () => {
    expect(authErrorMessage("Email not confirmed")).toMatch(/confirm/i);
  });

  it("explains rate limiting in human terms", () => {
    expect(authErrorMessage("Email rate limit exceeded")).toMatch(/too many/i);
    expect(authErrorMessage("For security purposes, you can only request this after 41 seconds"))
      .toMatch(/too many/i);
  });

  it("explains a weak password", () => {
    expect(authErrorMessage("Password should be at least 6 characters"))
      .toMatch(/8 characters/);
  });

  it("tells a returning user to sign in instead, in both Supabase phrasings", () => {
    // Reachable from the public sign-up form. Pinned because four later tasks
    // assert against this exact copy.
    for (const raw of [
      "User already registered",
      "A user with this email address has already been registered",
    ]) {
      expect(authErrorMessage(raw)).toMatch(/already registered/i);
    }
  });

  it("recognises every phrasing Supabase uses for a dead link", () => {
    for (const raw of [
      "Token has expired",
      "Email link is invalid or has expired",
      "Invalid token",
    ]) {
      expect(authErrorMessage(raw)).toMatch(/expired/i);
    }
  });

  it("falls back to something actionable, never a raw code", () => {
    const msg = authErrorMessage("AuthApiError: unexpected_failure");
    expect(msg).toMatch(/try again/i);
    expect(msg).not.toMatch(/AuthApiError/);
  });

  it("handles null", () => {
    expect(authErrorMessage(null)).toMatch(/try again/i);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/lib/auth/__tests__/messages.test.ts`
Expected: FAIL — cannot resolve `@/lib/auth/messages`.

- [ ] **Step 7: Write the message mapping**

Create `src/lib/auth/messages.ts`:

```ts
/**
 * Supabase error strings → copy a person can act on.
 *
 * The credentials case is deliberately vague: saying "no account with that
 * email" would turn the sign-in form into an account-existence oracle.
 */
const RULES: { match: RegExp; message: string }[] = [
  { match: /invalid login credentials/i,
    message: "That email or password isn't right. Check both and try again." },
  { match: /email not confirmed/i,
    message: "Confirm your email first — check your inbox for the link we sent when you signed up." },
  { match: /rate limit|only request this after|too many requests/i,
    message: "Too many attempts. Wait a minute or two, then try again." },
  { match: /password should be at least/i,
    message: "Password must be at least 8 characters." },
  { match: /user already registered|already been registered/i,
    message: "That email is already registered. Try signing in instead." },
  // Supabase phrases expired links several ways ("Token has expired", "Email
  // link is invalid or has expired"); all of them must reach the same copy, or
  // the reset flow tells people "something went wrong" for its commonest failure.
  { match: /token has expired|invalid.*token|link is invalid|link has expired/i,
    message: "That link has expired. Request a new one." },
];

export function authErrorMessage(raw: string | null | undefined): string {
  if (raw) {
    for (const { match, message } of RULES) if (match.test(raw)) return message;
  }
  return "Something went wrong. Try again in a moment.";
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/lib/auth/__tests__/messages.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 9: Commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/lib/auth
git commit -m "$(cat <<'EOF'
feat(auth): add form schemas and non-disclosing error copy

Sign-in failures never reveal whether an account exists, so the form
cannot be used as an account-existence oracle.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Scope the Dexie database per account

The largest mechanical change. `db.ts` is imported by exactly two modules, which is what makes it tractable.

**Files:**
- Modify: `src/lib/db.ts`, `src/lib/repo.ts`, `src/lib/seed.ts`
- Test: `src/lib/__tests__/db-scope.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (from `src/lib/db.ts`):
  - `type DbScope = { kind: "user"; userId: string } | { kind: "demo" }`
  - `dbNameFor(scope: DbScope): string`
  - `openDb(scope: DbScope): JobTrackrDb` — memoized per database name
  - `currentDb(): JobTrackrDb` — throws if no scope is set
  - `setScope(scope: DbScope): void`
  - `closeDb(): void`
  - `LEGACY_DB_NAME = "jobtrackr"`
  - `type JobTrackrDb` — the Dexie type previously inlined on `db`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/db-scope.test.ts`:

```ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { dbNameFor, openDb, currentDb, setScope, closeDb, LEGACY_DB_NAME } from "@/lib/db";

beforeEach(() => { closeDb(); });

describe("database scoping", () => {
  it("names an account database after the user id", () => {
    expect(dbNameFor({ kind: "user", userId: "abc-123" })).toBe("jobtrackr-abc-123");
  });

  it("gives the demo its own sandbox", () => {
    expect(dbNameFor({ kind: "demo" })).toBe("jobtrackr-demo");
  });

  it("keeps the pre-auth name reserved as legacy", () => {
    expect(LEGACY_DB_NAME).toBe("jobtrackr");
    expect(dbNameFor({ kind: "user", userId: "x" })).not.toBe(LEGACY_DB_NAME);
    expect(dbNameFor({ kind: "demo" })).not.toBe(LEGACY_DB_NAME);
  });

  it("returns the same instance for the same scope", () => {
    const a = openDb({ kind: "user", userId: "u1" });
    const b = openDb({ kind: "user", userId: "u1" });
    expect(a).toBe(b);
  });

  it("returns different instances for different accounts", () => {
    const a = openDb({ kind: "user", userId: "u1" });
    const b = openDb({ kind: "user", userId: "u2" });
    expect(a).not.toBe(b);
    expect(a.name).toBe("jobtrackr-u1");
    expect(b.name).toBe("jobtrackr-u2");
  });

  it("throws a clear error when used before a scope is set", () => {
    expect(() => currentDb()).toThrow(/scope/i);
  });

  it("returns the scoped instance once set", () => {
    setScope({ kind: "demo" });
    expect(currentDb().name).toBe("jobtrackr-demo");
  });

  it("keeps two accounts' data apart", async () => {
    setScope({ kind: "user", userId: "u1" });
    await currentDb().tags.put({ id: "t1", name: "Only in u1", preset: false });

    setScope({ kind: "user", userId: "u2" });
    expect(await currentDb().tags.count()).toBe(0);

    setScope({ kind: "user", userId: "u1" });
    expect(await currentDb().tags.count()).toBe(1);
  });

  it("forgets the scope on close", () => {
    setScope({ kind: "demo" });
    closeDb();
    expect(() => currentDb()).toThrow(/scope/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/__tests__/db-scope.test.ts`
Expected: FAIL — `dbNameFor` is not exported from `@/lib/db`.

- [ ] **Step 3: Rewrite `src/lib/db.ts`**

Replace the whole file. The schema versions 1–3 are unchanged; version 4 adds the `meta` table Task 6 needs.

```ts
import Dexie, { type EntityTable } from "dexie";
import type {
  Stage, Application, Tag, Interview, Contact,
  ActivityEvent, NoteDoc, Reminder, SettingsDoc,
} from "./types";
import type { Profile, CvDoc } from "@/cv/types";

export interface CvThumb {
  id: string;
  blob: Blob;
  updatedAt: string;
}

/** Single-row bookkeeping that must travel with the data it describes. */
export interface MetaRecord {
  id: "legacy";
  claimedBy: string;
  claimedAt: string;
}

export type JobTrackrDb = Dexie & {
  stages: EntityTable<Stage, "id">;
  applications: EntityTable<Application, "id">;
  tags: EntityTable<Tag, "id">;
  interviews: EntityTable<Interview, "id">;
  contacts: EntityTable<Contact, "id">;
  events: EntityTable<ActivityEvent, "id">;
  notes: EntityTable<NoteDoc, "id">;
  reminders: EntityTable<Reminder, "id">;
  settings: EntityTable<SettingsDoc, "id">;
  profile: EntityTable<Profile, "id">;
  cvdocs: EntityTable<CvDoc, "id">;
  cvthumbs: EntityTable<CvThumb, "id">;
  meta: EntityTable<MetaRecord, "id">;
};

/** The pre-auth database name. Reserved: no scope may ever resolve to it. */
export const LEGACY_DB_NAME = "jobtrackr";

export type DbScope =
  | { kind: "user"; userId: string }
  | { kind: "demo" };

export function dbNameFor(scope: DbScope): string {
  return scope.kind === "demo" ? "jobtrackr-demo" : `jobtrackr-${scope.userId}`;
}

const V1_V3 = {
  stages: "id, order",
  applications: "id, stageId, order, updatedAt",
  tags: "id",
  interviews: "id, applicationId, scheduledAt",
  contacts: "id, applicationId",
  events: "id, applicationId, at",
  notes: "id, applicationId",
  reminders: "id, dueAt, done",
  settings: "id",
};

export function createDb(name: string): JobTrackrDb {
  const db = new Dexie(name) as JobTrackrDb;
  db.version(1).stores({ ...V1_V3 });
  db.version(2).stores({ ...V1_V3, profile: "id", cvdocs: "id, applicationId, updatedAt" });
  db.version(3).stores({ ...V1_V3, profile: "id", cvdocs: "id, applicationId, updatedAt", cvthumbs: "id" });
  db.version(4).stores({
    ...V1_V3, profile: "id", cvdocs: "id, applicationId, updatedAt", cvthumbs: "id", meta: "id",
  });
  return db;
}

const instances = new Map<string, JobTrackrDb>();
let active: JobTrackrDb | null = null;

/** Memoized per database name — opening the same Dexie name twice would give
 *  two connections fighting over the same upgrade transaction. */
export function openDb(scope: DbScope): JobTrackrDb {
  const name = dbNameFor(scope);
  let db = instances.get(name);
  if (!db) {
    db = createDb(name);
    instances.set(name, db);
  }
  return db;
}

export function setScope(scope: DbScope): void {
  active = openDb(scope);
}

export function currentDb(): JobTrackrDb {
  if (!active) {
    throw new Error(
      "No database scope is set — call setScope() with the signed-in user or " +
      "the demo scope before reading or writing.",
    );
  }
  return active;
}

/** Sign-out: drop the handle, keep every byte on disk. */
export function closeDb(): void {
  active = null;
}
```

- [ ] **Step 4: Run to verify the scoping test passes**

Run: `npx vitest run src/lib/__tests__/db-scope.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Point `repo.ts` at the active database**

In `src/lib/repo.ts`, change the import and every `db.` reference. Replace the import line:

```ts
import { currentDb, type JobTrackrDb } from "./db";
import type { CvThumb } from "./db";
```

`ALL_TABLES` and every export currently read `db.x` at module scope, which no longer works — the tables must be resolved per call. Rewrite the table list as a function and the exports as arrow functions that call `currentDb()`:

```ts
const allTables = (db: JobTrackrDb) => [
  db.stages, db.applications, db.tags, db.interviews, db.contacts,
  db.events, db.notes, db.reminders, db.settings, db.profile, db.cvdocs,
  db.cvthumbs, db.meta,
];
```

Then apply this substitution across the file: every `db.` becomes `currentDb().`, and every use of `ALL_TABLES` becomes `allTables(db)` with `const db = currentDb();` at the top of that function. For example `loadAll` becomes:

```ts
export async function loadAll(): Promise<Snapshot> {
  const db = currentDb();
  const [stages, applications, tags, interviews, contacts, events, notes, reminders, settings, profile, cvdocs] =
    await Promise.all([
      db.stages.orderBy("order").toArray(),
      db.applications.orderBy("order").toArray(),
      db.tags.toArray(),
      db.interviews.toArray(),
      db.contacts.toArray(),
      db.events.orderBy("at").reverse().toArray(),
      db.notes.toArray(),
      db.reminders.toArray(),
      db.settings.get("singleton"),
      db.profile.get("singleton"),
      db.cvdocs.orderBy("updatedAt").reverse().toArray(),
    ]);
  return { stages, applications, tags, interviews, contacts, events, notes, reminders,
    settings: settings ?? DEFAULT_SETTINGS, profile: profile ?? null, cvdocs };
}
```

and every one-liner export becomes, in full — this is the complete list, so no call site is missed:

```ts
export const putStage = (x: Stage) => currentDb().stages.put(x).then(() => {});
export const putStages = (xs: Stage[]) => currentDb().stages.bulkPut(xs).then(() => {});
export const putApplication = (x: Application) => currentDb().applications.put(x).then(() => {});
export const putApplications = (xs: Application[]) => currentDb().applications.bulkPut(xs).then(() => {});
export const putTag = (x: Tag) => currentDb().tags.put(x).then(() => {});
export const putInterview = (x: Interview) => currentDb().interviews.put(x).then(() => {});
export const putContact = (x: Contact) => currentDb().contacts.put(x).then(() => {});
export const putEvent = (x: ActivityEvent) => currentDb().events.put(x).then(() => {});
export const putNote = (x: NoteDoc) => currentDb().notes.put(x).then(() => {});
export const putReminder = (x: Reminder) => currentDb().reminders.put(x).then(() => {});
export const putSettings = (x: SettingsDoc) => currentDb().settings.put(x).then(() => {});
export const putProfile = (x: Profile) => currentDb().profile.put(x).then(() => {});
export const deleteProfile = () => currentDb().profile.delete("singleton");
export const putCvDoc = (x: CvDoc) => currentDb().cvdocs.put(x).then(() => {});
export const deleteCvDoc = (id: string) => currentDb().cvdocs.delete(id);
export const putCvThumb = (x: CvThumb) => currentDb().cvthumbs.put(x).then(() => {});
export const getCvThumb = (id: string) => currentDb().cvthumbs.get(id);
export const deleteCvThumb = (id: string) => currentDb().cvthumbs.delete(id);
export const deleteStage = (id: string) => currentDb().stages.delete(id);
export const deleteTag = (id: string) => currentDb().tags.delete(id);
export const deleteInterview = (id: string) => currentDb().interviews.delete(id);
export const deleteContact = (id: string) => currentDb().contacts.delete(id);
export const deleteNote = (id: string) => currentDb().notes.delete(id);
export const deleteReminder = (id: string) => currentDb().reminders.delete(id);
```

and the transactional helpers take the local `db`:

```ts
export async function deleteApplication(id: string): Promise<void> {
  const db = currentDb();
  await db.transaction("rw", allTables(db), async () => {
    await db.applications.delete(id);
    for (const t of [db.interviews, db.contacts, db.events, db.notes] as const) {
      await t.where("applicationId").equals(id).delete();
    }
    await db.reminders.filter((r) => r.applicationId === id).delete();
    await db.cvdocs.where("applicationId").equals(id).modify((c) => { delete c.applicationId; });
  });
}

export async function clearAll(): Promise<void> {
  const db = currentDb();
  await db.transaction("rw", allTables(db), async () => {
    for (const t of allTables(db)) await t.clear();
  });
}
```

Apply the same treatment to `importSnapshot`.

- [ ] **Step 6: Point `seed.ts` at the active database**

In `src/lib/seed.ts`, change `import { db } from "./db";` to `import { currentDb } from "./db";` and the single usage inside `seedIfEmpty`:

```ts
export async function seedIfEmpty(now: Date = new Date()): Promise<boolean> {
  const count = await currentDb().stages.count();
  if (count > 0) return false;
  await importSnapshot(demoSnapshot(now), "replace");
  return true;
}
```

- [ ] **Step 7: Set a scope in the existing test suites**

Every existing test that touches Dexie now needs a scope. Add to `src/test/setup.ts`:

```ts
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { setScope } from "@/lib/db";

// Vitest is configured without `globals`, so Testing Library's automatic
// cleanup never registers. Without this, renders leak between tests and
// queries match elements left behind by earlier cases.
afterEach(cleanup);

// Repo calls now resolve a scoped database. Tests get their own so they never
// depend on which account happened to be active.
beforeEach(() => { setScope({ kind: "user", userId: "test-user" }); });
```

- [ ] **Step 8: Run the whole suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS — all 164 existing tests plus the 9 new ones. If a repo test fails with "No database scope is set", that test imports `db` directly and needs the same `currentDb()` substitution.

- [ ] **Step 9: Commit**

```bash
git add src/lib/db.ts src/lib/repo.ts src/lib/seed.ts src/test/setup.ts src/lib/__tests__/db-scope.test.ts
git commit -m "$(cat <<'EOF'
feat(auth): scope the local database per account

Each account gets its own Dexie database and the demo gets a sandbox, so
two people sharing a browser never see each other's job hunt. Sign-out
drops the handle without deleting anything.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Adopt the pre-auth database

Without this, everyone using JobTrackr today opens the app after deploy and finds an empty board.

**Files:**
- Create: `src/lib/legacy.ts`
- Test: `src/lib/__tests__/legacy.test.ts`

**Interfaces:**
- Consumes: `createDb`, `openDb`, `dbNameFor`, `LEGACY_DB_NAME`, `MetaRecord` (Task 5).
- Produces: `adoptLegacyDatabase(userId: string): Promise<"adopted" | "skipped">`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/legacy.test.ts`:

```ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import Dexie from "dexie";
import { createDb, openDb, LEGACY_DB_NAME } from "@/lib/db";
import { adoptLegacyDatabase } from "@/lib/legacy";

async function seedLegacy() {
  const legacy = createDb(LEGACY_DB_NAME);
  await legacy.tags.put({ id: "t1", name: "From the old database", preset: false });
  await legacy.applications.put({
    id: "a1", company: "Acme", role: "Dev", tagIds: [], stageId: "stage-saved", order: 0,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  });
  legacy.close();
}

beforeEach(async () => {
  for (const name of await Dexie.getDatabaseNames()) await Dexie.delete(name);
});

describe("adoptLegacyDatabase", () => {
  it("copies the legacy data into an empty account database", async () => {
    await seedLegacy();
    expect(await adoptLegacyDatabase("u1")).toBe("adopted");

    const mine = openDb({ kind: "user", userId: "u1" });
    expect(await mine.tags.count()).toBe(1);
    expect((await mine.applications.get("a1"))?.company).toBe("Acme");
  });

  it("leaves the legacy database in place rather than deleting it", async () => {
    await seedLegacy();
    await adoptLegacyDatabase("u1");
    expect(await Dexie.exists(LEGACY_DB_NAME)).toBe(true);
  });

  it("records who claimed it", async () => {
    await seedLegacy();
    await adoptLegacyDatabase("u1");
    const legacy = createDb(LEGACY_DB_NAME);
    expect((await legacy.meta.get("legacy"))?.claimedBy).toBe("u1");
  });

  it("does nothing for a second account on the same device", async () => {
    await seedLegacy();
    await adoptLegacyDatabase("u1");
    expect(await adoptLegacyDatabase("u2")).toBe("skipped");
    expect(await openDb({ kind: "user", userId: "u2" }).tags.count()).toBe(0);
  });

  it("never overwrites an account that already has data", async () => {
    await seedLegacy();
    const mine = openDb({ kind: "user", userId: "u1" });
    await mine.tags.put({ id: "mine", name: "Already here", preset: false });

    expect(await adoptLegacyDatabase("u1")).toBe("skipped");
    expect(await mine.tags.count()).toBe(1);
    expect((await mine.tags.get("mine"))?.name).toBe("Already here");
  });

  it("does nothing when there is no legacy database", async () => {
    expect(await adoptLegacyDatabase("u1")).toBe("skipped");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/__tests__/legacy.test.ts`
Expected: FAIL — cannot resolve `@/lib/legacy`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/legacy.ts`:

```ts
import Dexie from "dexie";
import { createDb, openDb, LEGACY_DB_NAME, type JobTrackrDb } from "./db";

const COPIED = [
  "stages", "applications", "tags", "interviews", "contacts",
  "events", "notes", "reminders", "settings", "profile", "cvdocs", "cvthumbs",
] as const;

async function isEmpty(db: JobTrackrDb): Promise<boolean> {
  const counts = await Promise.all(COPIED.map((t) => db.table(t).count()));
  return counts.every((n) => n === 0);
}

/**
 * Moves data from the pre-auth `jobtrackr` database into the first account to
 * sign in on this device.
 *
 * Two guards, deliberately: the claim record, and the target being empty. The
 * claim can be lost if a user clears site data for that database alone, and a
 * populated account must survive that anyway.
 */
export async function adoptLegacyDatabase(userId: string): Promise<"adopted" | "skipped"> {
  if (!(await Dexie.exists(LEGACY_DB_NAME))) return "skipped";

  const legacy = createDb(LEGACY_DB_NAME);
  try {
    await legacy.open();
    if (await legacy.meta.get("legacy")) return "skipped";
    if (await isEmpty(legacy)) return "skipped";

    const target = openDb({ kind: "user", userId });
    await target.open();
    if (!(await isEmpty(target))) return "skipped";

    for (const name of COPIED) {
      const rows = await legacy.table(name).toArray();
      if (rows.length) await target.table(name).bulkPut(rows);
    }

    await legacy.meta.put({ id: "legacy", claimedBy: userId, claimedAt: new Date().toISOString() });
    return "adopted";
  } finally {
    legacy.close();
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/__tests__/legacy.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/lib/legacy.ts src/lib/__tests__/legacy.test.ts
git commit -m "$(cat <<'EOF'
feat(auth): adopt the pre-auth database on first sign-in

Without this, every existing user opens a scoped database for the first
time and finds an empty board. Two guards, non-destructive, one-way.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Scope-aware store hydration

**Files:**
- Modify: `src/lib/store.ts`, `src/components/shell/AppShell.tsx`
- Test: `src/lib/__tests__/hydrate-scope.test.ts`

**Interfaces:**
- Consumes: `DbScope`, `setScope`, `closeDb` (Task 5); `adoptLegacyDatabase` (Task 6).
- Produces:
  - `hydrate(scope: DbScope): Promise<void>` — replaces the no-argument version
  - `resetLocal(): void` — closes the database and empties the store
  - `AppShell` prop: `{ scope: DbScope }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/hydrate-scope.test.ts`:

```ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import Dexie from "dexie";
import { useApp } from "@/lib/store";
import { currentDb } from "@/lib/db";

beforeEach(async () => {
  for (const name of await Dexie.getDatabaseNames()) await Dexie.delete(name);
  useApp.setState({ ready: false, applications: [], stages: [], cvdocs: [], profile: null });
});

describe("hydrate(scope)", () => {
  it("seeds the demo dataset in the demo sandbox", async () => {
    await useApp.getState().hydrate({ kind: "demo" });
    expect(useApp.getState().applications.length).toBeGreaterThan(30);
    expect(useApp.getState().settings.demo).toBe(true);
    expect(currentDb().name).toBe("jobtrackr-demo");
  });

  it("gives a new account an empty board, not the demo", async () => {
    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    expect(useApp.getState().applications).toEqual([]);
    expect(useApp.getState().settings.demo).toBe(false);
    expect(useApp.getState().stages.length).toBeGreaterThan(0);
    expect(currentDb().name).toBe("jobtrackr-u1");
  });

  it("keeps two accounts' boards apart", async () => {
    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    await useApp.getState().addApplication({ company: "Acme", role: "Dev" });

    await useApp.getState().hydrate({ kind: "user", userId: "u2" });
    expect(useApp.getState().applications).toEqual([]);

    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    expect(useApp.getState().applications).toHaveLength(1);
  });

  it("resetLocal empties the store without deleting data", async () => {
    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    await useApp.getState().addApplication({ company: "Acme", role: "Dev" });

    useApp.getState().resetLocal();
    expect(useApp.getState().applications).toEqual([]);
    expect(useApp.getState().ready).toBe(false);

    await useApp.getState().hydrate({ kind: "user", userId: "u1" });
    expect(useApp.getState().applications).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/__tests__/hydrate-scope.test.ts`
Expected: FAIL — `hydrate` takes no arguments; `resetLocal` does not exist.

- [ ] **Step 3: Update the store**

In `src/lib/store.ts`, add the import:

```ts
import { setScope, closeDb, type DbScope } from "./db";
import { adoptLegacyDatabase } from "./legacy";
```

Change the interface declarations:

```ts
  hydrate(scope: DbScope): Promise<void>;
  resetLocal(): void;
```

Replace the `hydrate` implementation:

```ts
  async hydrate(scope) {
    try {
      setScope(scope);
      // First sign-in on a device that predates accounts: claim the old data
      // before anything reads an empty board and seeds over the top of it.
      if (scope.kind === "user") await adoptLegacyDatabase(scope.userId);

      // Only the demo sandbox gets sample data — a real account starts empty.
      if (scope.kind === "demo") await seedIfEmpty();
      else await ensureBaseline();

      let snap = await repo.loadAll();
      if (needsMigration(snap)) {
        snap = migrateSnapshot(snap);
        await repo.importSnapshot(snap, "replace");
        snap = await repo.loadAll();
      }
      set(() => ({ ...snap, ready: true }));
    } catch {
      set(() => ({
        stages: DEFAULT_STAGES, tags: PRESET_TAGS,
        settings: repo.DEFAULT_SETTINGS, profile: null, cvdocs: [],
        ready: true, persistBroken: true,
      }));
    }
  },

  resetLocal() {
    closeDb();
    set(() => ({
      stages: [], applications: [], tags: [], interviews: [], contacts: [],
      events: [], notes: [], reminders: [], settings: repo.DEFAULT_SETTINGS,
      profile: null, cvdocs: [], ready: false, selectedAppId: null,
      filters: EMPTY_FILTERS,
    }));
  },
```

Add `ensureBaseline` beside `logEvent` near the top of the file — a real account needs stages and preset tags, but no sample applications:

```ts
/** A new account needs a usable board — default stages and preset tags — but
 *  none of the demo's sample applications. */
async function ensureBaseline(): Promise<void> {
  if ((await repo.loadAll()).stages.length > 0) return;
  await repo.putStages(DEFAULT_STAGES);
  for (const t of PRESET_TAGS) await repo.putTag(t);
  await repo.putSettings({ ...repo.DEFAULT_SETTINGS });
}
```

- [ ] **Step 4: Update `AppShell` to take the scope**

Rewrite `src/components/shell/AppShell.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import type { DbScope } from "@/lib/db";
import { Sidebar } from "./Sidebar";
import { MobileTabs } from "./MobileTabs";
import { Toaster } from "@/components/ui/Toast";

export function AppShell({ scope, children }: { scope: DbScope; children: React.ReactNode }) {
  const ready = useApp((s) => s.ready);
  const persistBroken = useApp((s) => s.persistBroken);
  const hydrate = useApp((s) => s.hydrate);

  const scopeKey = scope.kind === "demo" ? "demo" : scope.userId;
  useEffect(() => { void hydrate(scope); },
    // Re-hydrating on identity change is the point; the object identity of
    // `scope` changes on every render, so key off its contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hydrate, scopeKey]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main id="main" className="min-w-0 flex-1 pb-16 md:pb-0">
        {persistBroken && (
          <p role="alert" className="border-b border-warn-line bg-warn-bg px-6 py-2 text-sm font-medium text-warn">
            Storage is unavailable in this browser — changes won’t survive a reload.
          </p>
        )}
        {ready ? children : (
          <div className="p-8" aria-busy="true">
            <div className="h-6 w-40 animate-pulse rounded-full bg-sunken" />
          </div>
        )}
      </main>
      <MobileTabs />
      <Toaster />
    </div>
  );
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/__tests__/hydrate-scope.test.ts`
Expected: PASS (4 tests).

Then run the full suite: `npx vitest run`
Expected: `src/lib/__tests__/cvrepo.test.ts` fails — it calls `hydrate()` with no argument. Fix its `beforeEach`:

```ts
beforeEach(async () => {
  await clearAll();
  useApp.setState({ ready: false, profile: null, cvdocs: [] });
  await useApp.getState().hydrate({ kind: "demo" });
});
```

- [ ] **Step 6: Verify everything passes**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/store.ts src/components/shell/AppShell.tsx src/lib/__tests__
git commit -m "$(cat <<'EOF'
feat(auth): hydrate the store against a scoped database

A real account starts with stages and preset tags but no sample data —
only the demo sandbox seeds the 37-application dataset.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Route group restructure

Pure file moves plus two new layouts. URLs do not change.

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/app/(auth)/layout.tsx`, `src/lib/auth/scope.ts`
- Move: every existing page into `src/app/(app)/`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `createServerSupabase` (Task 1), `DEMO_COOKIE` (Task 2), `DbScope` (Task 5).
- Produces: `resolveScope(): Promise<DbScope | null>` from `src/lib/auth/scope.ts`

- [ ] **Step 1: Move the pages**

```bash
mkdir -p "src/app/(app)"
git mv src/app/page.tsx "src/app/(app)/page.tsx"
for d in dashboard applications cv reminders settings; do git mv "src/app/$d" "src/app/(app)/$d"; done
```

Leave `layout.tsx`, `globals.css`, `favicon.ico`, and `opengraph-image.tsx` at `src/app/`.

- [ ] **Step 2: Write the scope resolver**

Create `src/lib/auth/scope.ts`:

```ts
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEMO_COOKIE } from "./routes";
import type { DbScope } from "@/lib/db";

/**
 * Who is this request, as far as local storage is concerned? An account wins
 * over the demo cookie — someone who signed in should see their own board even
 * if they poked at the demo first.
 */
export async function resolveScope(): Promise<DbScope | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (data.user) return { kind: "user", userId: data.user.id };

  const store = await cookies();
  return store.has(DEMO_COOKIE) ? { kind: "demo" } : null;
}
```

- [ ] **Step 3: Write the `(app)` layout**

Create `src/app/(app)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { resolveScope } from "@/lib/auth/scope";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const scope = await resolveScope();
  // Middleware normally catches this; belt and braces, because rendering the
  // app with no scope would throw deep inside the store instead.
  if (!scope) redirect("/login");
  return <AppShell scope={scope}>{children}</AppShell>;
}
```

- [ ] **Step 4: Write the `(auth)` layout**

Create `src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-sunken px-5 py-10">
      {children}
    </main>
  );
}
```

- [ ] **Step 5: Strip `AppShell` from the root layout**

In `src/app/layout.tsx`, remove the `AppShell` import and replace the body content:

```tsx
      <body className={`${jakarta.variable} font-sans`}>
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a href="#main" className="skip-link">Skip to main content</a>
        {children}
      </body>
```

- [ ] **Step 6: Verify the build and URLs**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds; the route list shows `/`, `/dashboard`, `/applications`, `/cv`, `/cv/[id]`, `/cv/profile`, `/reminders`, `/settings` — route groups must not appear in any path. Those routes are now marked dynamic (ƒ) rather than static (○), because the layout reads cookies.

The build must succeed **without** `.env.local` present. If it fails with the `NEXT_PUBLIC_SUPABASE_URL is not set` message, `createServerSupabase` is calling `supabaseEnv()` before `await cookies()` — fix the order (Task 1), don't add env vars to make the build pass.

- [ ] **Step 7: Commit**

```bash
git add -A src/app src/lib/auth/scope.ts
git commit -m "$(cat <<'EOF'
refactor(auth): split app and auth route groups

AppShell moves out of the root layout so auth pages don't inherit the
sidebar and mobile tabs. URLs are unchanged.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Auth UI primitives

**Files:**
- Create: `src/components/auth/AuthCard.tsx`, `src/components/auth/AuthField.tsx`
- Test: `src/components/auth/__tests__/AuthField.test.tsx`

**Interfaces:**
- Consumes: `inputClass`, `labelClass` from `@/components/cv/form-kit`.
- Produces:
  - `<AuthCard title, subtitle?, children, footer?>`
  - `<AuthField id, label, type, value, onChange, error?, autoComplete, required?, autoFocus?>`

- [ ] **Step 1: Write the failing test**

Create `src/components/auth/__tests__/AuthField.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthField } from "@/components/auth/AuthField";

const base = {
  id: "email", label: "Email", type: "email" as const, value: "",
  onChange: () => {}, autoComplete: "email",
};

describe("AuthField", () => {
  it("associates the label with the input", () => {
    render(<AuthField {...base} />);
    expect(screen.getByLabelText("Email")).toBeDefined();
  });

  it("is clean when there is no error", () => {
    render(<AuthField {...base} />);
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBeNull();
  });

  it("wires the error to the input for screen readers", () => {
    render(<AuthField {...base} error="Enter a valid email address" />);
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBe("email-error");
    expect(document.getElementById("email-error")?.textContent).toBe("Enter a valid email address");
  });

  it("marks required fields for assistive tech", () => {
    render(<AuthField {...base} required />);
    expect(screen.getByLabelText("Email").getAttribute("aria-required")).toBe("true");
  });

  it("passes the autoComplete token through", () => {
    render(<AuthField {...base} type="password" autoComplete="current-password" label="Password" id="password" />);
    expect(screen.getByLabelText("Password").getAttribute("autocomplete")).toBe("current-password");
  });

  it("reports typing", () => {
    const onChange = vi.fn();
    render(<AuthField {...base} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    expect(onChange).toHaveBeenCalledWith("a@b.com");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/auth/__tests__/AuthField.test.tsx`
Expected: FAIL — cannot resolve `@/components/auth/AuthField`.

- [ ] **Step 3: Write `AuthField`**

Create `src/components/auth/AuthField.tsx`:

```tsx
"use client";

import { inputClass, labelClass } from "@/components/cv/form-kit";

export function AuthField({
  id, label, type, value, onChange, error, autoComplete, required = false, autoFocus = false,
}: {
  id: string;
  label: string;
  type: "email" | "password" | "text";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="mb-4">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} h-11 ${error ? "border-danger" : ""}`}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-danger">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/auth/__tests__/AuthField.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Write `AuthCard`**

Create `src/components/auth/AuthCard.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full max-w-sm">
      <Link href="/login" className="mb-6 flex items-center justify-center gap-2.5" aria-label="JobTrackr">
        <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-ink text-base font-extrabold text-white">J</span>
        <span className="text-lg font-extrabold tracking-tight">JobTrackr</span>
      </Link>

      <div className="rounded-2xl border border-line-2 bg-surface p-6">
        <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 mb-5 text-sm text-ink-3">{subtitle}</p>}
        <div className={subtitle ? "" : "mt-5"}>{children}</div>
      </div>

      {footer && <div className="mt-4 text-center text-sm text-ink-2">{footer}</div>}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/components/auth
git commit -m "$(cat <<'EOF'
feat(auth): add auth card and field primitives

AuthField owns the aria-invalid/aria-describedby wiring so no form can
ship an error a screen reader cannot reach.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Sign-in page with the demo link

**Files:**
- Create: `src/components/auth/LoginForm.tsx`, `src/app/(auth)/login/page.tsx`
- Test: `src/components/auth/__tests__/LoginForm.test.tsx`

**Interfaces:**
- Consumes: `AuthCard`, `AuthField` (Task 9); `signInSchema`, `firstErrors` (Task 4); `authErrorMessage` (Task 4); `createBrowserSupabase` (Task 1).
- Produces: `<LoginForm />`; `safeNextPath(raw: string | null): string` added to `src/lib/auth/routes.ts`.

### Step 0: close the open redirect first

`decideRoute` writes `?next=%2Fdashboard`, and this form reads it back to decide where to land. `encodeURIComponent` protects the *write*; nothing protects the *read*. An attacker sends `https://jobtrackr.app/login?next=//evil.com`, the victim signs in, and `router.push("//evil.com")` follows a protocol-relative URL straight off-site. Validate before navigating.

- [ ] **Step 0a: Write the failing test**

Append to `src/lib/auth/__tests__/routes.test.ts`:

```ts
import { safeNextPath } from "@/lib/auth/routes";

describe("safeNextPath", () => {
  it("keeps an ordinary in-app path", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/cv/demo-cv-2")).toBe("/cv/demo-cv-2");
  });

  it("falls back to the board when there is no next param", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it("refuses a protocol-relative URL", () => {
    // The open-redirect vector: router.push("//evil.com") leaves the site.
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
  });

  it("refuses an absolute URL", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("refuses anything not rooted at a single slash", () => {
    expect(safeNextPath("dashboard")).toBe("/");
    expect(safeNextPath("../etc/passwd")).toBe("/");
  });

  it("does not bounce a signed-in user back to an auth page", () => {
    // Landing on /login straight after signing in reads as a failed sign-in.
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath("/signup")).toBe("/");
  });
});
```

- [ ] **Step 0b: Run it to verify it fails**

Run: `npx vitest run src/lib/auth/__tests__/routes.test.ts`
Expected: FAIL — `safeNextPath` is not exported.

- [ ] **Step 0c: Implement it**

Append to `src/lib/auth/routes.ts`:

```ts
/**
 * Where to land after signing in, given an untrusted `next` param.
 *
 * decideRoute encodes this value on the way out; nothing guarantees what comes
 * back. A protocol-relative value like "//evil.com" is a working open redirect
 * once it reaches router.push, so anything that is not plainly an in-app path
 * falls back to the board.
 */
export function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  // Single leading slash only: "//" and "/\" are both protocol-relative.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if ((AUTH_PATHS as readonly string[]).includes(raw)) return "/";
  return raw;
}
```

- [ ] **Step 0d: Run it to verify it passes**

Run: `npx vitest run src/lib/auth/__tests__/routes.test.ts`
Expected: PASS (16 tests — the original 10 plus 6 new).

- [ ] **Step 1: Write the failing test**

Create `src/components/auth/__tests__/LoginForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "@/components/auth/LoginForm";

const push = vi.fn();
const signInWithPassword = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({ auth: { signInWithPassword } }),
}));

beforeEach(() => { push.mockClear(); signInWithPassword.mockReset(); });

describe("LoginForm", () => {
  it("offers a demo route that needs no account", () => {
    render(<LoginForm />);
    const demo = screen.getByRole("link", { name: /demo/i });
    expect(demo.getAttribute("href")).toBe("/auth/demo");
  });

  it("blocks submission of an invalid email without calling Supabase", async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nope" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "hunter22" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(/valid email address/i)).toBeDefined();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in and lands on the board", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "hunter22" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com", password: "hunter22",
    }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("announces a failure without revealing whether the account exists", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/email or password/i);
    expect(alert.textContent).not.toMatch(/no account/i);
    expect(push).not.toHaveBeenCalled();
  });

  it("links to sign-up and password recovery", () => {
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: /create an account/i }).getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("link", { name: /forgot/i }).getAttribute("href")).toBe("/forgot-password");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/auth/__tests__/LoginForm.test.tsx`
Expected: FAIL — cannot resolve `@/components/auth/LoginForm`.

- [ ] **Step 3: Write the form**

Create `src/components/auth/LoginForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { signInSchema, firstErrors } from "@/lib/auth/schemas";
import { authErrorMessage } from "@/lib/auth/messages";
import { safeNextPath } from "@/lib/auth/routes";
import { AuthCard } from "./AuthCard";
import { AuthField } from "./AuthField";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next = firstErrors(parsed);
      setErrors(next);
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setErrors({});
    setBusy(true);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      setFormError(authErrorMessage(error.message));
      setBusy(false);
      return;
    }
    // safeNextPath, not the raw param: "//evil.com" would otherwise walk the
    // user off the site the moment they signed in.
    // refresh() so the server layout re-resolves the scope before we land.
    router.push(safeNextPath(params.get("next")));
    router.refresh();
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Pick up your job hunt where you left off."
      footer={<>New here? <Link href="/signup" className="font-semibold text-ink underline">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <p role="alert" className="mb-4 rounded-xl border border-danger bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
            {formError}
          </p>
        )}

        <AuthField id="email" label="Email" type="email" value={email} onChange={setEmail}
          error={errors.email} autoComplete="email" required autoFocus />
        <AuthField id="password" label="Password" type="password" value={password} onChange={setPassword}
          error={errors.password} autoComplete="current-password" required />

        <div className="mb-5 text-right">
          <Link href="/forgot-password" className="text-sm font-semibold text-ink-2 underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={busy} aria-busy={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-5 border-t border-line pt-4 text-center">
        <Link href="/auth/demo" className="inline-flex min-h-11 items-center justify-center gap-1 text-sm font-semibold text-ink underline">
          Explore the demo instead <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <p className="mt-1 text-sm text-ink-3">No account needed.</p>
      </div>
    </AuthCard>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/auth/__tests__/LoginForm.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the page**

Create `src/app/(auth)/login/page.tsx`:

```tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — JobTrackr",
  description: "Sign in to JobTrackr to track your job applications, follow-ups, and interviews.",
  robots: { index: false, follow: false },
};

export default function Page() {
  // useSearchParams needs a Suspense boundary to keep the route static.
  return <Suspense><LoginForm /></Suspense>;
}
```

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/components/auth src/app/\(auth\)/login
git commit -m "$(cat <<'EOF'
feat(auth): add the sign-in page with a demo entry point

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: The demo route handler

**Files:**
- Create: `src/app/auth/demo/route.ts`
- Test: `src/app/auth/demo/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `DEMO_COOKIE` (Task 2), `createServerSupabase` (Task 1).
- Produces: `GET(request: Request): Promise<NextResponse>` — sets the cookie, redirects to `/`.

Middleware passes `/auth/*` through untouched, so this handler makes its own call about signed-in visitors: scope resolution puts an account ahead of the demo cookie, so setting one for a signed-in user would be a lie that changes nothing.

- [ ] **Step 1: Write the failing test**

Create `src/app/auth/demo/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/auth/demo/route";
import { DEMO_COOKIE } from "@/lib/auth/routes";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ auth: { getUser } }),
}));

beforeEach(() => { getUser.mockResolvedValue({ data: { user: null } }); });

describe("GET /auth/demo", () => {
  it("redirects to the board", async () => {
    const res = await GET(new Request("http://localhost:3000/auth/demo"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("sets a demo cookie that middleware will accept", async () => {
    const res = await GET(new Request("http://localhost:3000/auth/demo"));
    const cookie = res.cookies.get(DEMO_COOKIE);
    expect(cookie?.value).toBe("1");
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.maxAge).toBe(60 * 60 * 24 * 30);
  });

  it("does not make the cookie httpOnly — it grants only a local sandbox", async () => {
    const res = await GET(new Request("http://localhost:3000/auth/demo"));
    expect(res.cookies.get(DEMO_COOKIE)?.httpOnly).toBeFalsy();
  });

  it("sends a signed-in visitor to their own board without a demo cookie", async () => {
    // resolveScope puts an account ahead of the cookie, so setting one here
    // would change nothing and leave a misleading cookie behind.
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await GET(new Request("http://localhost:3000/auth/demo"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
    expect(res.cookies.get(DEMO_COOKIE)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/app/auth/demo/__tests__/route.test.ts`
Expected: FAIL — cannot resolve `@/app/auth/demo/route`.

- [ ] **Step 3: Write the handler**

Create `src/app/auth/demo/route.ts`:

```ts
import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/auth/routes";
import { createServerSupabase } from "@/lib/supabase/server";

export const DEMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));

  // Someone with an account gets their own board; a demo cookie would be a
  // lie, since scope resolution ignores it once a session exists.
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (data.user) return response;

  response.cookies.set({
    name: DEMO_COOKIE,
    value: "1",
    maxAge: DEMO_COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    // Deliberately not httpOnly: it unlocks a local sandbox, nothing else.
    httpOnly: false,
  });
  return response;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/app/auth/demo/__tests__/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/app/auth/demo
git commit -m "$(cat <<'EOF'
feat(auth): add the demo entry route

Sets a scoped cookie and lands on the board — no Supabase user is
created, so there is nothing to rate limit, reset, or clean up.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Sign-up page

**Files:**
- Create: `src/components/auth/SignupForm.tsx`, `src/app/(auth)/signup/page.tsx`
- Test: `src/components/auth/__tests__/SignupForm.test.tsx`

**Interfaces:**
- Consumes: `AuthCard`, `AuthField`, `signUpSchema`, `firstErrors`, `authErrorMessage`, `createBrowserSupabase`.
- Produces: `<SignupForm />`.

- [ ] **Step 1: Write the failing test**

Create `src/components/auth/__tests__/SignupForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignupForm } from "@/components/auth/SignupForm";

const signUp = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => ({ auth: { signUp } }) }));

beforeEach(() => { signUp.mockReset(); });

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
};

describe("SignupForm", () => {
  it("rejects a password under 8 characters before calling Supabase", async () => {
    render(<SignupForm />);
    fill("a@b.com", "short7!");
    expect(await screen.findByText(/at least 8 characters/i)).toBeDefined();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("tells the user to check their inbox on success", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    render(<SignupForm />);
    fill("a@b.com", "eightchars");

    expect(await screen.findByText(/check your inbox/i)).toBeDefined();
    // The form is replaced by the confirmation state.
    expect(screen.queryByLabelText("Password")).toBeNull();
  });

  it("sends the confirmation link back to the app", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    render(<SignupForm />);
    fill("a@b.com", "eightchars");

    await waitFor(() => expect(signUp).toHaveBeenCalled());
    const arg = signUp.mock.calls[0][0];
    expect(arg.email).toBe("a@b.com");
    expect(arg.options.emailRedirectTo).toMatch(/\/auth\/confirm$/);
  });

  it("surfaces a Supabase failure as plain language", async () => {
    signUp.mockResolvedValue({ data: null, error: { message: "User already registered" } });
    render(<SignupForm />);
    fill("a@b.com", "eightchars");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/already registered/i);
  });

  it("links back to sign in", () => {
    render(<SignupForm />);
    expect(screen.getByRole("link", { name: /sign in/i }).getAttribute("href")).toBe("/login");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/auth/__tests__/SignupForm.test.tsx`
Expected: FAIL — cannot resolve `@/components/auth/SignupForm`.

- [ ] **Step 3: Write the form**

Create `src/components/auth/SignupForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { signUpSchema, firstErrors } from "@/lib/auth/schemas";
import { authErrorMessage } from "@/lib/auth/messages";
import { AuthCard } from "./AuthCard";
import { AuthField } from "./AuthField";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = signUpSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next = firstErrors(parsed);
      setErrors(next);
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setErrors({});
    setBusy(true);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signUp({
      ...parsed.data,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });

    setBusy(false);
    if (error) { setFormError(authErrorMessage(error.message)); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Check your inbox" subtitle={`We sent a confirmation link to ${email}.`}>
        <div aria-live="polite" className="flex flex-col items-center gap-3 py-2 text-center">
          <MailCheck className="h-8 w-8 text-ink-2" aria-hidden />
          <p className="text-base text-ink-2">
            Click the link to finish creating your account, then sign in.
          </p>
          <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline">
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Track every application in one place."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-ink underline">Sign in</Link></>}
    >
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <p role="alert" className="mb-4 rounded-xl border border-danger bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
            {formError}
          </p>
        )}

        <AuthField id="email" label="Email" type="email" value={email} onChange={setEmail}
          error={errors.email} autoComplete="email" required autoFocus />
        <AuthField id="password" label="Password" type="password" value={password} onChange={setPassword}
          error={errors.password} autoComplete="new-password" required />
        <p className="mb-5 -mt-2 text-sm text-ink-3">At least 8 characters.</p>

        <Button type="submit" disabled={busy} aria-busy={busy} className="w-full">
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/auth/__tests__/SignupForm.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the page**

Create `src/app/(auth)/signup/page.tsx`:

```tsx
import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create an account — JobTrackr",
  description: "Create a JobTrackr account to track applications, follow-ups, and interviews in one place.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SignupForm />;
}
```

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/components/auth src/app/\(auth\)/signup
git commit -m "$(cat <<'EOF'
feat(auth): add the sign-up page

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Password recovery — request, confirm, reset

**Files:**
- Create: `src/components/auth/ForgotPasswordForm.tsx`, `src/components/auth/ResetPasswordForm.tsx`, `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`, `src/app/auth/confirm/route.ts`
- Test: `src/components/auth/__tests__/ForgotPasswordForm.test.tsx`, `src/components/auth/__tests__/ResetPasswordForm.test.tsx`

**Interfaces:**
- Consumes: `AuthCard`, `AuthField`, `forgotSchema`, `resetSchema`, `firstErrors`, `authErrorMessage`, `createBrowserSupabase`, `createServerSupabase`.
- Produces: `<ForgotPasswordForm />`, `<ResetPasswordForm />`, `GET /auth/confirm`.

- [ ] **Step 1: Write the failing forgot-password test**

Create `src/components/auth/__tests__/ForgotPasswordForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

const resetPasswordForEmail = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({ auth: { resetPasswordForEmail } }),
}));

beforeEach(() => { resetPasswordForEmail.mockReset(); });

const submit = (email: string) => {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
};

describe("ForgotPasswordForm", () => {
  it("validates the email before sending", async () => {
    render(<ForgotPasswordForm />);
    submit("nope");
    expect(await screen.findByText(/valid email address/i)).toBeDefined();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("points the reset link at /reset-password", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    render(<ForgotPasswordForm />);
    submit("a@b.com");
    await waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalled());
    const [emailArg, options] = resetPasswordForEmail.mock.calls[0];
    expect(emailArg).toBe("a@b.com");
    expect(options.redirectTo).toMatch(/\/auth\/confirm\?next=%2Freset-password$/);
  });

  it("gives the same answer whether or not the account exists", async () => {
    // Non-disclosure: an unknown address must not produce a different screen.
    resetPasswordForEmail.mockResolvedValue({ error: { message: "User not found" } });
    render(<ForgotPasswordForm />);
    submit("ghost@nowhere.com");
    expect(await screen.findByText(/check your inbox/i)).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still reports rate limiting, which is not a disclosure", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: { message: "Email rate limit exceeded" } });
    render(<ForgotPasswordForm />);
    submit("a@b.com");
    expect((await screen.findByRole("alert")).textContent).toMatch(/too many/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/auth/__tests__/ForgotPasswordForm.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the forgot-password form**

Create `src/components/auth/ForgotPasswordForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { forgotSchema, firstErrors } from "@/lib/auth/schemas";
import { authErrorMessage } from "@/lib/auth/messages";
import { AuthCard } from "./AuthCard";
import { AuthField } from "./AuthField";

/** Rate limiting is the one failure worth showing: it says nothing about
 *  whether the address exists, and silence would look like a broken button. */
const DISCLOSING = /user not found|not registered|no user/i;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = forgotSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(firstErrors(parsed));
      document.getElementById("email")?.focus();
      return;
    }
    setErrors({});
    setBusy(true);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=%2Freset-password`,
    });

    setBusy(false);
    if (error && !DISCLOSING.test(error.message)) {
      setFormError(authErrorMessage(error.message));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Check your inbox" subtitle={`If ${email} has an account, a reset link is on its way.`}>
        <div aria-live="polite" className="flex flex-col items-center gap-3 py-2 text-center">
          <MailCheck className="h-8 w-8 text-ink-2" aria-hidden />
          <p className="text-base text-ink-2">The link expires after an hour.</p>
          <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline">
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
      footer={<Link href="/login" className="font-semibold text-ink underline">Back to sign in</Link>}
    >
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <p role="alert" className="mb-4 rounded-xl border border-danger bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
            {formError}
          </p>
        )}
        <AuthField id="email" label="Email" type="email" value={email} onChange={setEmail}
          error={errors.email} autoComplete="email" required autoFocus />
        <Button type="submit" disabled={busy} aria-busy={busy} className="w-full">
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
```

- [ ] **Step 4: Write the failing reset test**

Create `src/components/auth/__tests__/ResetPasswordForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

const push = vi.fn();
const updateUser = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createBrowserSupabase: () => ({ auth: { updateUser } }) }));

beforeEach(() => { push.mockClear(); updateUser.mockReset(); });

const submit = (password: string) => {
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /update password/i }));
};

describe("ResetPasswordForm", () => {
  it("enforces the 8-character minimum", async () => {
    render(<ResetPasswordForm />);
    submit("short7!");
    expect(await screen.findByText(/at least 8 characters/i)).toBeDefined();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updates the password and lands on the board", async () => {
    updateUser.mockResolvedValue({ error: null });
    render(<ResetPasswordForm />);
    submit("eightchars");
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "eightchars" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("explains an expired link", async () => {
    updateUser.mockResolvedValue({ error: { message: "Token has expired" } });
    render(<ResetPasswordForm />);
    submit("eightchars");
    expect((await screen.findByRole("alert")).textContent).toMatch(/expired/i);
  });
});
```

- [ ] **Step 5: Run both tests to verify they fail**

Run: `npx vitest run src/components/auth/__tests__/ResetPasswordForm.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 6: Write the reset form**

Create `src/components/auth/ResetPasswordForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { resetSchema, firstErrors } from "@/lib/auth/schemas";
import { authErrorMessage } from "@/lib/auth/messages";
import { AuthCard } from "./AuthCard";
import { AuthField } from "./AuthField";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = resetSchema.safeParse({ password });
    if (!parsed.success) {
      setErrors(firstErrors(parsed));
      document.getElementById("password")?.focus();
      return;
    }
    setErrors({});
    setBusy(true);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

    if (error) {
      setFormError(authErrorMessage(error.message));
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard title="Set a new password" subtitle="You'll be signed in once it's saved.">
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <p role="alert" className="mb-4 rounded-xl border border-danger bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
            {formError}
          </p>
        )}
        <AuthField id="password" label="New password" type="password" value={password} onChange={setPassword}
          error={errors.password} autoComplete="new-password" required autoFocus />
        <p className="mb-5 -mt-2 text-sm text-ink-3">At least 8 characters.</p>
        <Button type="submit" disabled={busy} aria-busy={busy} className="w-full">
          {busy ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
```

- [ ] **Step 7: Run both tests to verify they pass**

Run: `npx vitest run src/components/auth/__tests__/ForgotPasswordForm.test.tsx src/components/auth/__tests__/ResetPasswordForm.test.tsx`
Expected: PASS (7 tests total).

- [ ] **Step 8: Write the two pages**

Create `src/app/(auth)/forgot-password/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password — JobTrackr",
  description: "Request a link to set a new JobTrackr password.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ForgotPasswordForm />;
}
```

Create `src/app/(auth)/reset-password/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password — JobTrackr",
  description: "Choose a new password for your JobTrackr account.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ResetPasswordForm />;
}
```

- [ ] **Step 9: Write the token-confirmation handler**

Create `src/app/auth/confirm/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Lands both email-confirmation and password-recovery links. Exchanges the
 * one-time token for a session, then forwards to `next` (the reset form) or
 * the board.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=link", origin));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) return NextResponse.redirect(new URL("/login?error=link", origin));
  return NextResponse.redirect(new URL(next, origin));
}
```

- [ ] **Step 10: Surface the expired-link case on the sign-in page**

In `src/components/auth/LoginForm.tsx`, initialise `formError` from the query param so a dead link explains itself:

```tsx
  const [formError, setFormError] = useState<string | null>(
    params.get("error") === "link"
      ? "That link has expired or was already used. Request a new one."
      : null,
  );
```

- [ ] **Step 11: Verify and commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/components/auth src/app/\(auth\) src/app/auth/confirm
git commit -m "$(cat <<'EOF'
feat(auth): add password recovery flow

The reset request answers identically whether or not the address has an
account; only rate limiting is surfaced, which discloses nothing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Account menu and sign-out

**Files:**
- Create: `src/components/shell/AccountMenu.tsx`, `src/app/auth/signout/route.ts`
- Modify: `src/components/shell/Sidebar.tsx`
- Test: `src/components/shell/__tests__/AccountMenu.test.tsx`

**Interfaces:**
- Consumes: `resetLocal` (Task 7), `createBrowserSupabase` (Task 1).
- Produces: `<AccountMenu />`; `POST /auth/signout`.

- [ ] **Step 1: Write the failing test**

Create `src/components/shell/__tests__/AccountMenu.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AccountMenu } from "@/components/shell/AccountMenu";

const push = vi.fn();
const signOut = vi.fn();
const resetLocal = vi.fn();
const getUser = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({ auth: { signOut, getUser } }),
}));
vi.mock("@/lib/store", () => ({ useApp: (sel: (s: unknown) => unknown) => sel({ resetLocal }) }));

beforeEach(() => {
  push.mockClear(); signOut.mockReset(); resetLocal.mockClear();
  getUser.mockResolvedValue({ data: { user: { email: "mika@example.com" } } });
});

describe("AccountMenu", () => {
  it("shows the signed-in email", async () => {
    render(<AccountMenu />);
    expect(await screen.findByText("mika@example.com")).toBeDefined();
  });

  it("signs out, clears the local store, and returns to login", async () => {
    signOut.mockResolvedValue({ error: null });
    render(<AccountMenu />);
    fireEvent.click(await screen.findByRole("button", { name: /sign out/i }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    // Order matters: the store must be emptied so the next account never sees
    // the previous one's board flash on screen.
    await waitFor(() => expect(resetLocal).toHaveBeenCalled());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });

  it("says Demo when there is no account", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(<AccountMenu />);
    expect(await screen.findByText(/demo/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /create an account/i }).getAttribute("href")).toBe("/signup");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/shell/__tests__/AccountMenu.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `src/components/shell/AccountMenu.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useApp } from "@/lib/store";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function AccountMenu() {
  const router = useRouter();
  const resetLocal = useApp((s) => s.resetLocal);
  const [email, setEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    void createBrowserSupabase().auth.getUser().then(({ data }) => {
      if (!alive) return;
      setEmail(data.user?.email ?? null);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  async function onSignOut() {
    await createBrowserSupabase().auth.signOut();
    // Empty the store before navigating, or the next account briefly sees the
    // previous one's board while its own data loads.
    resetLocal();
    router.push("/login");
    router.refresh();
  }

  if (!loaded) return null;

  if (!email) {
    return (
      <div className="mt-auto border-t border-line pt-3">
        <p className="hidden px-2 text-sm font-semibold text-ink-2 lg:block">Demo mode</p>
        <Link href="/signup"
          className="mt-1 flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-sm font-semibold text-ink underline lg:no-underline">
          <span className="hidden lg:inline">Create an account</span>
          <span className="lg:hidden" aria-hidden>+</span>
          <span className="sr-only lg:hidden">Create an account</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-auto border-t border-line pt-3">
      <p className="hidden truncate px-2 text-sm font-semibold text-ink-2 lg:block" title={email}>{email}</p>
      <button type="button" onClick={onSignOut}
        className="mt-1 flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-base text-ink-2 hover:bg-sunken">
        <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
        <span className="hidden lg:inline">Sign out</span>
        <span className="sr-only lg:hidden">Sign out</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/shell/__tests__/AccountMenu.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Mount it in the sidebar**

In `src/components/shell/Sidebar.tsx`, import the component and render it after the `</ul>`, and make the nav a flex column that pushes it to the bottom (the `mt-auto` on `AccountMenu` needs a flex parent, which `<nav>` already is):

```tsx
import { AccountMenu } from "./AccountMenu";
```

```tsx
      </ul>
      <AccountMenu />
    </nav>
```

- [ ] **Step 6: Add the server sign-out route**

Create `src/app/auth/signout/route.ts` — used by non-JS fallbacks and by the E2E suite:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEMO_COOKIE } from "@/lib/auth/routes";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.delete(DEMO_COOKIE);
  return response;
}
```

- [ ] **Step 7: Verify and commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/components/shell src/app/auth/signout
git commit -m "$(cat <<'EOF'
feat(auth): add the account menu and sign-out

Sign-out empties the store before navigating so the next account never
sees the previous one's board flash on screen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Demo banner conversion path

**Files:**
- Modify: `src/components/board/BoardPage.tsx`, `src/lib/store.ts`
- Test: `src/components/board/__tests__/DemoBanner.test.tsx`

**Interfaces:**
- Consumes: `DEMO_COOKIE` (Task 2), `clearDemo` (existing store action).
- Produces: no new exports; `clearDemo()` additionally drops the demo cookie.

- [ ] **Step 1: Write the failing test**

Create `src/components/board/__tests__/DemoBanner.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BoardPage } from "@/components/board/BoardPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/store", () => ({
  useApp: Object.assign(
    () => ({
      stages: [], applications: [], tags: [], reminders: [], filters: { search: "", tagIds: [], sources: [], hasSalary: null },
      settings: { demo: true, nudgeDays: 7, ghostDays: 14, currency: "USD" },
      clearDemo: vi.fn(), moveApplication: vi.fn(), selectApp: vi.fn(), setFilters: vi.fn(),
    }),
    { getState: () => ({}) },
  ),
}));

describe("demo banner", () => {
  it("offers a route to a real account", () => {
    render(<BoardPage />);
    const cta = screen.getByRole("link", { name: /create an account/i });
    expect(cta.getAttribute("href")).toBe("/signup");
  });

  it("still offers to clear the demo data", () => {
    render(<BoardPage />);
    expect(screen.getByRole("button", { name: /clear demo data/i })).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/board/__tests__/DemoBanner.test.tsx`
Expected: FAIL — no "Create an account" link exists.

- [ ] **Step 3: Update the banner**

In `src/components/board/BoardPage.tsx`, replace the demo banner block:

```tsx
      {s.settings.demo && (
        <div className="mb-4 flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-sm text-ink-2">
            You&rsquo;re looking at demo data — create an account to start tracking your own hunt.
          </p>
          <div className="flex items-center gap-1">
            <Link href="/signup"
              className="inline-flex h-8 items-center justify-center rounded-full bg-ink px-3.5 text-sm font-semibold text-white hover:opacity-85">
              Create an account
            </Link>
            <Button variant="ghost" size="sm" className="whitespace-nowrap" onClick={() => void s.clearDemo()}>
              Clear demo data
            </Button>
          </div>
        </div>
      )}
```

Add `import Link from "next/link";` at the top if it is not already imported.

- [ ] **Step 4: Drop the demo cookie when the demo is cleared**

In `src/lib/store.ts`, update `clearDemo` so leaving the demo also leaves demo mode:

```ts
  async clearDemo() {
    await clearDemoData();
    // Leaving the demo means leaving demo mode; without this the cookie keeps
    // waving the visitor past the sign-in page forever.
    if (typeof document !== "undefined") {
      document.cookie = `${DEMO_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    }
    const snap = await repo.loadAll();
    set(() => ({ ...snap }));
  },
```

Add the import: `import { DEMO_COOKIE } from "./auth/routes";`

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/components/board/__tests__/DemoBanner.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/components/board src/lib/store.ts
git commit -m "$(cat <<'EOF'
feat(auth): give the demo banner a route to a real account

Clearing the demo also drops the cookie — otherwise it keeps waving the
visitor past the sign-in page forever.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: End-to-end coverage and documentation

The existing three E2E specs all assume the board is reachable with no session. They are the regression net for this whole change, so they must pass against the gated app.

**Files:**
- Modify: `e2e/smoke.spec.ts`, `README.md`
- Create: `e2e/auth.spec.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing importable.

- [ ] **Step 1: Give the existing specs a demo session**

At the top of `e2e/smoke.spec.ts`, after the imports, add a fixture so every existing test enters through the demo door:

```ts
import { test, expect } from "@playwright/test";

// The app is gated now. These specs exercise the tracker, not auth, so they
// enter through the demo door rather than provisioning an account per run.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{
    name: "jobtrackr-demo",
    value: "1",
    url: baseURL ?? "http://localhost:3100",
  }]);
});
```

The third spec navigates to `/cv/profile` directly and fills the profile; that still works, because the demo cookie satisfies middleware.

- [ ] **Step 2: Run the existing E2E suite**

Run: `E2E_PORT=3000 npx playwright test`
Expected: 3 passed. If the CV spec fails because the demo profile is already populated, change its `fullName.fill(...)` to overwrite rather than append — `fill` already replaces, so this should pass unchanged.

- [ ] **Step 3: Write the auth E2E spec**

Create `e2e/auth.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("signed-out visitors are sent to sign in, remembering where they were going", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("the demo link opens the app with seeded data and no account", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /explore the demo/i }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Board", exact: true })).toBeVisible();
  // The seeded dataset is there.
  await expect(page.getByText("Stripe").first()).toBeVisible();
  // And the banner offers the way out of demo mode.
  await expect(page.getByRole("link", { name: /create an account/i })).toBeVisible();
});

test("the demo survives a reload", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /explore the demo/i }).click();
  await expect(page.getByRole("heading", { name: "Board", exact: true })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Board", exact: true })).toBeVisible();
});

test("sign-up validates before it ever calls the network", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("short7!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText(/valid email address/i)).toBeVisible();
  await expect(page).toHaveURL(/\/signup$/);
});

test("auth pages carry no app chrome", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("navigation", { name: "Main menu" })).toHaveCount(0);
});
```

- [ ] **Step 4: Run the new spec**

Run: `E2E_PORT=3000 npx playwright test e2e/auth.spec.ts`
Expected: 5 passed.

- [ ] **Step 5: Run the whole E2E suite**

Run: `E2E_PORT=3000 npx playwright test`
Expected: 8 passed.

- [ ] **Step 6: Document the setup step**

In `README.md`, add a Getting started section before the existing content (adjust the surrounding prose to fit):

```markdown
## Getting started

JobTrackr needs a Supabase project for authentication:

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in the URL and anon key from
   **Project Settings → API**.
3. In **Authentication → Providers**, keep Email enabled. In
   **Authentication → Rate limits**, set explicit per-hour limits for sign-in
   attempts and transactional email rather than leaving the defaults.
4. Set a spend cap and billing alert under **Organization → Billing** before
   deploying publicly.
5. `npm install && npm run dev`

No account needed to look around — the sign-in page has an **Explore the demo**
link that opens the app with a full sample dataset, stored only in your browser.
```

Also update the roadmap line: `- **Later** — auth + cloud sync, dark mode, PWA install.` becomes:

```markdown
- **Now** — accounts with per-device data isolation. Cloud sync is next.
- **Later** — dark mode, PWA install.
```

- [ ] **Step 7: Final verification**

```bash
npx tsc --noEmit
npx vitest run
npx eslint src
E2E_PORT=3000 npx playwright test
npm run build
```
Expected: typecheck clean, all unit tests pass, no new lint errors, 8 E2E pass, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add e2e README.md
git commit -m "$(cat <<'EOF'
test(auth): cover the gate, the demo path, and sign-up validation

Existing specs enter through the demo door — they exercise the tracker,
not auth, and provisioning an account per run would be slower and flakier.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Manual verification (not automatable in CI)

Account creation against live Supabase is deliberately outside the E2E suite. Run this once against a real project before deploying:

- [ ] Sign up with a real address → confirmation email arrives → link lands on the board.
- [ ] Sign out → sign in with the same credentials → the board is as you left it.
- [ ] Sign in as a second account in the same browser → empty board, no trace of the first.
- [ ] Sign back in as the first account → data intact.
- [ ] Forgot password → email arrives → link opens `/reset-password` → new password works.
- [ ] Request a reset for an address with no account → identical "check your inbox" screen, no email.
- [ ] With existing pre-auth data in the browser, sign in for the first time → the old board is adopted.
- [ ] Keyboard-only pass over all four forms: every control reachable, focus visible, errors announced.

---

## Spec Coverage

| Spec section | Task |
|---|---|
| §3 Route architecture | 8 |
| §3 Middleware rules | 2, 3 |
| §4 Demo login | 10, 11, 15 |
| §5 Per-account local data | 5, 7 |
| §5 Legacy adoption | 6 |
| §6 Pages + a11y + SEO | 9, 10, 12, 13 |
| §7 RLS (no tables → nothing to do) | — (asserted in Global Constraints) |
| §7 Rate limiting, billing | 16 (README setup steps) |
| §7 Secrets / env | 1 |
| §7 Non-disclosure | 4, 10, 13 |
| §8 Testing | every task; 16 for E2E |
| §9 Consequence: config error not stack trace | 1, 3 |
