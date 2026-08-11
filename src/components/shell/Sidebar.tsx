"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, KanbanSquare, Table2, FileText, Bell, Settings } from "lucide-react";
import { useApp } from "@/lib/store";
import { dueReminders } from "@/lib/selectors";
import { AccountMenu } from "./AccountMenu";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", short: "Stats", icon: LayoutDashboard },
  { href: "/", label: "Board", short: "Board", icon: KanbanSquare },
  { href: "/applications", label: "Applications", short: "Apps", icon: Table2 },
  { href: "/cv", label: "CV Builder", short: "CV", icon: FileText },
  { href: "/reminders", label: "Reminders", short: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings },
];

export function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const reminders = useApp((s) => s.reminders);
  const dueCount = dueReminders(reminders, new Date().toISOString()).length;

  return (
    <nav aria-label="Main menu"
      className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col overflow-y-auto bg-[#f2f2f2] px-3 py-5 md:flex lg:w-56">
      <Link href="/" className="mb-7 flex items-center gap-2.5 px-2" aria-label="JobTrackr home">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink text-base font-extrabold text-white">J</span>
        <span className="hidden text-base font-extrabold tracking-tight lg:inline">JobTrackr</span>
      </Link>
      <p className="mb-2 hidden px-2 text-xs font-semibold uppercase tracking-wider text-ink-3 lg:block">
        Main menu
      </p>
      <ul className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-2.5 rounded-xl px-2.5 text-base transition-colors ${
                  active ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-sunken"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                <span className="hidden flex-1 lg:inline">{label}</span>
                {label === "Reminders" && dueCount > 0 && (
                  <span className="hidden rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white lg:inline">
                    {dueCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <AccountMenu email={email} />
    </nav>
  );
}
