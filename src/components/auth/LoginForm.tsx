"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { signInSchema, firstErrors } from "@/lib/auth/schemas";
import { authErrorMessage } from "@/lib/auth/messages";
import { safeNextPath } from "@/lib/auth/routes";
import { AuthCard } from "./AuthCard";
import { AuthField } from "./AuthField";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
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

        <Button type="submit" disabled={busy} aria-busy={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-5 border-t border-line pt-4 text-center">
        <Link href="/auth/demo" className="inline-flex min-h-11 items-center justify-center gap-1 text-sm font-semibold text-ink underline">
          Explore the demo instead <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <p className="mt-1 text-sm text-ink-3">No account needed.</p>
      </div>
    </AuthCard>
  );
}
