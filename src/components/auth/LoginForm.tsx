"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { signInSchema, firstErrors } from "@/lib/auth/schemas";
import { authErrorMessage } from "@/lib/auth/messages";
import { safeNextPath } from "@/lib/auth/routes";
import { AuthCard } from "./AuthCard";
import { AuthField } from "./AuthField";

// Lucide has no pointing-hand glyph; this is Material Design Icons'
// "hand-pointing-right", rendered in the site's ink color.
function PointingHandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M21,9A1,1 0 0,1 22,10A1,1 0 0,1 21,11H16.53L16.4,12.21L14.2,17.15C14,17.65 13.47,18 12.86,18H8.5C7.7,18 7,17.27 7,16.5V10C7,9.61 7.16,9.26 7.43,9L11.63,4.1L12.4,4.84C12.6,5.03 12.72,5.29 12.72,5.58L12.69,5.8L11,9H21M2,18V10H5V18H2Z" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(
    params.get("error") === "link"
      ? "That link has expired or was already used. Request a new one."
      : null,
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next = firstErrors(parsed);
      setErrors(next);
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setErrors({});
    setBusy(true);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      setFormError(authErrorMessage(error.message));
      setBusy(false);
      return;
    }
    // safeNextPath, not the raw param: "//evil.com" would otherwise walk the
    // user off the site the moment they signed in.
    // refresh() so the server layout re-resolves the scope before we land.
    router.push(safeNextPath(params.get("next")));
    router.refresh();
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Pick up your job hunt where you left off."
      footer={<>New here? <Link href="/signup" className="font-semibold text-ink underline">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <p role="alert" className="mb-4 rounded-xl border border-danger bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
            {formError}
          </p>
        )}

        <AuthField id="email" label="Email" type="email" value={email} onChange={setEmail}
          error={errors.email} autoComplete="email" required autoFocus />
        <AuthField id="password" label="Password" type="password" value={password} onChange={setPassword}
          error={errors.password} autoComplete="current-password" required />

        <div className="mb-5 text-right">
          <Link href="/forgot-password" className="text-sm font-semibold text-ink-2 underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={busy} aria-busy={busy} className="h-11 w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-5 border-t border-line pt-4 text-center">
        <Link href="/auth/demo" className="inline-flex min-h-11 items-center justify-center gap-3 text-sm font-semibold text-ink underline">
          <PointingHandIcon className="icon-nudge h-6 w-6 shrink-0 text-ink" aria-hidden />
          Explore the demo instead
        </Link>
        <p className="mt-1 text-sm text-ink-3">No account needed.</p>
      </div>
    </AuthCard>
  );
}
