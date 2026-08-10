"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { DEMO_COOKIE } from "@/lib/auth/routes";

/**
 * Shared by every sign-out affordance (desktop AccountMenu, mobile account
 * menu) so there is exactly one place that has to get the sequencing right.
 */
export function useSignOut() {
  const router = useRouter();
  const resetLocal = useApp((s) => s.resetLocal);

  return async function signOut() {
    // Never let a network failure trap someone in a session they asked to
    // leave: clearing local state and navigating must happen regardless. The
    // server cookie is already gone or will expire; what matters here is that
    // this browser stops showing the account's data.
    try {
      await createBrowserSupabase().auth.signOut();
    } catch {
      /* offline or Supabase unreachable — carry on with the local sign-out */
    }
    // Scope resolution puts an account ahead of the demo cookie, so this never
    // mattered while signed in — but leaving it behind means the next visitor
    // on this browser drops straight back into the demo sandbox instead of
    // landing on the sign-in page.
    document.cookie = `${DEMO_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    // Empty the store before navigating, or the next account briefly sees the
    // previous one's board while its own data loads.
    resetLocal();
    router.push("/login");
    router.refresh();
  };
}
