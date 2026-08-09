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
