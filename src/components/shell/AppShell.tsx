"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { MobileTabs } from "./MobileTabs";
import { Toaster } from "@/components/ui/Toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const ready = useApp((s) => s.ready);
  const persistBroken = useApp((s) => s.persistBroken);
  const hydrate = useApp((s) => s.hydrate);

  useEffect(() => { void hydrate(); }, [hydrate]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
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
