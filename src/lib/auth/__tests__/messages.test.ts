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

  it("does not treat a stale sign-in session as an expired link", () => {
    // Surfaced on the sign-in form itself, not the email-link flow — must not
    // get "That link has expired", which would be actively misleading there.
    const msg = authErrorMessage("Invalid Refresh Token: Refresh Token Not Found");
    expect(msg).not.toMatch(/link has expired/i);
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
