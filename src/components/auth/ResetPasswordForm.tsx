"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { resetSchema, firstErrors } from "@/lib/auth/schemas";
import { authErrorMessage } from "@/lib/auth/messages";
import { AuthCard } from "./AuthCard";
import { AuthField } from "./AuthField";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = resetSchema.safeParse({ password });
    if (!parsed.success) {
      setErrors(firstErrors(parsed));
      document.getElementById("password")?.focus();
      return;
    }
    setErrors({});
    setBusy(true);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

    if (error) {
      setFormError(authErrorMessage(error.message));
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard title="Set a new password" subtitle="You'll be signed in once it's saved.">
      <form onSubmit={onSubmit} noValidate>
        {formError && (
          <p role="alert" className="mb-4 rounded-xl border border-danger bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
            {formError}
          </p>
        )}
        <AuthField id="password" label="New password" type="password" value={password} onChange={setPassword}
          error={errors.password} autoComplete="new-password" required autoFocus />
        {/* The hint gives way to the error: two lines both saying "at least 8
            characters" is noise, and the error is the one that matters. */}
        {!errors.password && (
          <p className="mb-5 -mt-2 text-sm text-ink-3">At least 8 characters.</p>
        )}
        <Button type="submit" disabled={busy} aria-busy={busy} className="h-11 w-full">
          {busy ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
