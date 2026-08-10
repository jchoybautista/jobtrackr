import { cache } from "react";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEMO_COOKIE } from "./routes";
import type { DbScope } from "@/lib/db";

export interface Identity {
  scope: DbScope;
  /** Null in the demo sandbox; the signed-in user's email for a real account. */
  email: string | null;
}

/**
 * Who is this request, as far as local storage is concerned, plus what to show
 * for it in the UI. An account wins over the demo cookie — someone who signed
 * in should see their own board even if they poked at the demo first.
 *
 * Resolved once, server-side, and threaded down through AppShell — client
 * components must not re-derive this with their own getUser() call, or a slow
 * or failed round trip flashes the wrong identity at someone who is already
 * signed in.
 */
export const resolveIdentity = cache(async (): Promise<Identity | null> => {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    return { scope: { kind: "user", userId: data.user.id }, email: data.user.email ?? null };
  }

  const store = await cookies();
  return store.has(DEMO_COOKIE) ? { scope: { kind: "demo" }, email: null } : null;
  // cache(): /settings resolves this in both the layout and the page, and
  // without memoization that is two Supabase round trips for one render.
});
