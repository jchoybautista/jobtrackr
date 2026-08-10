import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEMO_COOKIE } from "@/lib/auth/routes";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.delete(DEMO_COOKIE);
  return response;
}
