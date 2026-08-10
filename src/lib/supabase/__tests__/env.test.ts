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
