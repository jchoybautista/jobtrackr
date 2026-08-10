"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { forgotSchema, firstErrors } from "@/lib/auth/schemas";
import { authErrorMessage } from "@/lib/auth/messages";
import { AuthCard } from "./AuthCard";
import { AuthField } from "./AuthField";

/** Rate limiting is the one failure worth showing: it says nothing about
 *  whether the address exists, and silence would look like a broken button. */
const DISCLOSING = /user not found|not registered|no user/i;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = forgotSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(firstErrors(parsed));
      document.getElementById("email")?.focus();
      return;
    }
    setErrors({});
    setBusy(true);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=%2Freset-password`,
    });

    setBusy(false);
    if (error && !DISCLOSING.test(error.message)) {
      setFormError(authErrorMessage(error.message));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Check your inbox" subtitle={`If ${email} has an account, a reset link is on its way.`}>
        <div aria-live="polite" className="flex flex-col items-center gap-3 py-2 text-center">
          <MailCheck className="h-8 w-8 text-ink-2" aria-hidden />
          <p className="text-base text-ink-2">The link expires after an hour.</p>
          <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline">
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
      footer={<Link href="/login" className="font-semibold text-ink underline">Back to sign in</Link>}
    >
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <p role="alert" className="mb-4 rounded-xl border border-danger bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
            {formError}
          </p>
        )}
        <AuthField id="email" label="Email" type="email" value={email} onChange={setEmail}
          error={errors.email} autoComplete="email" required autoFocus />
        <Button type="submit" disabled={busy} aria-busy={busy} className="h-11 w-full">
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
