import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

export async function createServerSupabase() {
  // cookies() first, deliberately. It is what tells Next this route renders
  // dynamically; if the env check threw ahead of it, `next build` would die
  // trying to prerender the app routes instead of marking them dynamic.
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        // Server Components cannot set cookies; middleware refreshes the
        // session instead, so swallowing here is correct rather than lazy.
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          /* called from a Server Component — middleware handles the refresh */
        }
      },
    },
  });
}
