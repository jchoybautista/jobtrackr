import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard for a bug that only a real browser could catch: Next.js
 * inlines NEXT_PUBLIC_* into the client bundle only when the property is
 * accessed statically (`process.env.NEXT_PUBLIC_X`). A dynamic lookup
 * (`process.env[name]`) is invisible to the bundler, so the browser sees an
 * empty `process.env` and every client-side Supabase call throws "not set" —
 * even though `.env.local` is correct and every unit test passes, because
 * Node's real `process.env` makes the dynamic form work fine outside a
 * bundler. A runtime test in Node cannot detect a bundler-inlining failure
 * (this file's own `process.env['NEXT_PUBLIC_...']` would "work" under
 * vitest too), so this asserts against the source text instead.
 */
describe("supabaseEnv static access", () => {
  it("never reads NEXT_PUBLIC_* via dynamic process.env[...] access", () => {
    const source = readFileSync(join(__dirname, "..", "env.ts"), "utf-8");
    // Strip comments first — the surrounding prose is allowed to name the
    // dynamic form as the thing being avoided; only actual code may not use it.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/process\.env\[/);
  });
});
