"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useSignOut } from "./useSignOut";

/** `email` is resolved server-side (see `resolveIdentity`) and threaded down
 *  through AppShell — null means the demo sandbox, not "still loading". */
export function AccountMenu({ email }: { email: string | null }) {
  const signOut = useSignOut();

  if (!email) {
    return (
      <div className="mt-auto border-t border-line pt-3">
        <p className="hidden px-2 text-sm font-semibold text-ink-2 lg:block">Demo mode</p>
        <Link href="/signup"
          className="mt-1 flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-sm font-semibold text-ink underline lg:no-underline">
          <span className="hidden lg:inline">Create an account</span>
          <span className="lg:hidden" aria-hidden>+</span>
          <span className="sr-only lg:hidden">Create an account</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-auto border-t border-line pt-3">
      <p className="hidden truncate px-2 text-sm font-semibold text-ink-2 lg:block" title={email}>{email}</p>
      <button type="button" onClick={() => void signOut()}
        className="mt-1 flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-base text-ink-2 hover:bg-sunken">
        <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
        <span className="hidden lg:inline">Sign out</span>
        <span className="sr-only lg:hidden">Sign out</span>
      </button>
    </div>
  );
}
