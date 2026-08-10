"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import type { DbScope } from "@/lib/db";
import { Sidebar } from "./Sidebar";
import { MobileTabs } from "./MobileTabs";
import { Toaster } from "@/components/ui/Toast";

export function AppShell({ scope, email, children }: {
  scope: DbScope;
  email: string | null;
  children: React.ReactNode;
}) {
  const ready = useApp((s) => s.ready);
  const persistBroken = useApp((s) => s.persistBroken);
  const hydrate = useApp((s) => s.hydrate);

  const scopeKey = scope.kind === "demo" ? "demo" : scope.userId;
  useEffect(() => { void hydrate(scope); },
    // Re-hydrating on identity change is the point; the object identity of
    // `scope` changes on every render, so key off its contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hydrate, scopeKey]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar email={email} />
      <main id="main" className="min-w-0 flex-1 pb-16 md:pb-0">
        {persistBroken && (
          <p role="alert" className="border-b border-warn-line bg-warn-bg px-6 py-2 text-sm font-medium text-warn">
            Storage is unavailable in this browser — changes won’t survive a reload.
          </p>
        )}
        {ready ? children : (
          <div className="p-8" aria-busy="true">
            <div className="h-6 w-40 animate-pulse rounded-full bg-sunken" />
          </div>
        )}
      </main>
      <MobileTabs />
      <Toaster />
    </div>
  );
}
