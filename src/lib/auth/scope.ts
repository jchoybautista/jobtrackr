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
