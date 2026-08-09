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
