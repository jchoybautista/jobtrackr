import { describe, it, expect } from "vitest";
import { decideRoute, safeNextPath, DEMO_COOKIE } from "@/lib/auth/routes";

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

  it("still honours /reset-password, the recovery flow's own next", () => {
    // /auth/confirm?next=%2Freset-password is how a password-recovery email
    // reaches the reset form; it must survive this guard even though every
    // other auth page is excluded above.
    expect(safeNextPath("/reset-password")).toBe("/reset-password");
  });
});
