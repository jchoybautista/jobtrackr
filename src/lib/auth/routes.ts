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
