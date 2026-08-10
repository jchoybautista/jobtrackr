import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/routes";

/**
 * Lands both email-confirmation and password-recovery links. Exchanges the
 * one-time token for a session, then forwards to `next` (the reset form) or
 * the board.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // This route establishes a session before it redirects, so an untrusted
  // `next` (e.g. "//evil.com") is an open redirect with session fixation on
  // top — run it through the same guard the sign-in flow uses.
  const next = safeNextPath(searchParams.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=link", origin));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) return NextResponse.redirect(new URL("/login?error=link", origin));
  return NextResponse.redirect(new URL(next, origin));
}
