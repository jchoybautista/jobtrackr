"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { signUpSchema, firstErrors } from "@/lib/auth/schemas";
import { authErrorMessage } from "@/lib/auth/messages";
import { AuthCard } from "./AuthCard";
import { AuthField } from "./AuthField";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = signUpSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next = firstErrors(parsed);
      setErrors(next);
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setErrors({});
    setBusy(true);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signUp({
      ...parsed.data,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });

    setBusy(false);
    if (error) { setFormError(authErrorMessage(error.message)); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Check your inbox" subtitle={`We sent a confirmation link to ${email}.`}>
        <div aria-live="polite" className="flex flex-col items-center gap-3 py-2 text-center">
          <MailCheck className="h-8 w-8 text-ink-2" aria-hidden />
          <p className="text-base text-ink-2">
            Click the link to finish creating your account, then sign in.
          </p>
          <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline">
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Track every application in one place."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-ink underline">Sign in</Link></>}
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
          error={errors.password} autoComplete="new-password" required />
        {/* The hint gives way to the error: two lines both saying "at least 8
            characters" is noise, and the error is the one that matters. */}
        {!errors.password && (
          <p className="mb-5 -mt-2 text-sm text-ink-3">At least 8 characters.</p>
        )}

        <Button type="submit" disabled={busy} aria-busy={busy} className="h-11 w-full">
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
