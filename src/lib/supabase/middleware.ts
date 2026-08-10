import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

/**
 * Refreshes the Supabase session cookie and reports whether the request is
 * authenticated. Uses getUser() rather than getSession() — getUser revalidates
 * against the auth server, so a forged or stale cookie cannot pass for a session.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; hasSession: boolean }> {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  return { response, hasSession: data.user != null };
}
