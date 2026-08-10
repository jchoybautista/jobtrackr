import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/auth/routes";
import { createServerSupabase } from "@/lib/supabase/server";

export const DEMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));

  // Someone with an account gets their own board; a demo cookie would be a
  // lie, since scope resolution ignores it once a session exists.
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (data.user) return response;

  response.cookies.set({
    name: DEMO_COOKIE,
    value: "1",
    maxAge: DEMO_COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    // Deliberately not httpOnly: it unlocks a local sandbox, nothing else.
    httpOnly: false,
  });
  return response;
}
