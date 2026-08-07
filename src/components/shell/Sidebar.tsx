"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, KanbanSquare, Table2, FileText, Bell, Settings } from "lucide-react";
import { useApp } from "@/lib/store";
import { dueReminders } from "@/lib/selectors";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "Board", icon: KanbanSquare },
  { href: "/applications", label: "Applications", icon: Table2 },
  { href: "/cv", label: "CV Builder", icon: FileText },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const reminders = useApp((s) => s.reminders);
  const dueCount = dueReminders(reminders, new Date().toISOString()).length;

  return (
    <nav aria-label="Main menu" className="hidden md:flex md:w-16 lg:w-56 shrink-0 flex-col bg-[#f2f2f2] px-3 py-5">
      <Link href="/" className="mb-7 flex items-center gap-2.5 px-2" aria-label="JobTrackr home">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink text-sm font-extrabold text-white">J</span>
        <span className="hidden text-[15px] font-extrabold tracking-tight lg:inline">JobTrackr</span>
      </Link>
      <p className="mb-2 hidden px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-3 lg:block">
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
                className={`flex h-10 items-center gap-2.5 rounded-xl px-2.5 text-sm transition-colors ${
                  active ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-sunken"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                <span className="hidden flex-1 lg:inline">{label}</span>
                {label === "Reminders" && dueCount > 0 && (
                  <span className="hidden rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white lg:inline">
                    {dueCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
