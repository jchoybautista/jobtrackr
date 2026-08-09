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

  it("falls back to something actionable, never a raw code", () => {
    const msg = authErrorMessage("AuthApiError: unexpected_failure");
    expect(msg).toMatch(/try again/i);
    expect(msg).not.toMatch(/AuthApiError/);
  });

  it("handles null", () => {
    expect(authErrorMessage(null)).toMatch(/try again/i);
  });
});
