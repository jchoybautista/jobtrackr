"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./Sidebar";

export function MobileTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main menu" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface md:hidden">
      {NAV.map(({ href, short, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
              active ? "text-ink" : "text-ink-3"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {short}
          </Link>
        );
      })}
    </nav>
  );
}
