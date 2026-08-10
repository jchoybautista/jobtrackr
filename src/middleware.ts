import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { decideRoute, DEMO_COOKIE } from "@/lib/auth/routes";

export async function middleware(request: NextRequest) {
  // TEMPORARY DIAGNOSTIC — remove once the Vercel env issue is settled.
  // Reports only presence, never values. Runs before updateSession so it
  // answers even while the env check is throwing.
  if (request.nextUrl.searchParams.has("__envcheck")) {
    const dynamic = (name: string) => process.env[name];
    return NextResponse.json({
      // Static access: Next replaces this with a literal at build time.
      staticUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "unset",
      staticKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "unset",
      // Dynamic access: only satisfied by the runtime environment.
      dynamicUrl: dynamic("NEXT_PUBLIC_SUPABASE_URL") ? "set" : "unset",
      dynamicKey: dynamic("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "set" : "unset",
      publicKeysVisible: Object.keys(process.env).filter((k) =>
        k.startsWith("NEXT_PUBLIC"),
      ),
      vercelEnv: process.env.VERCEL_ENV ?? "none",
    });
  }

  const { response, hasSession } = await updateSession(request);

  // decideRoute matches auth paths by exact equality, so "/login/" would slip
  // past the auth-path branch and land in the protected-route one. Normalize
  // the trailing slash rather than loosening the matcher.
  const raw = request.nextUrl.pathname;
  const path = raw.length > 1 ? raw.replace(/\/+$/, "") : raw;

  const decision = decideRoute({
    path,
    hasSession,
    hasDemoCookie: request.cookies.has(DEMO_COOKIE),
  });

  if (decision.action === "pass") return response;

  const target = new URL(decision.to, request.url);
  const redirect = NextResponse.redirect(target);
  // Carry over any refreshed session cookies, or the redirect drops them and
  // the next request looks signed out again.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: [
    // Everything except Next internals, static assets, and the two things that
    // must stay reachable without a session: the OG image (or every social
    // preview redirects to the sign-in page) and the .ttf files react-pdf
    // fetches at render time (which would otherwise cost a getUser() round
    // trip per font, per render).
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|woff|woff2)$).*)",
  ],
};
