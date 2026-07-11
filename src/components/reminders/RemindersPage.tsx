"use client";

import { useRouter } from "next/navigation";
import { AlarmClock, CalendarClock, BellRing, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { dueReminders } from "@/lib/selectors";
import { relativeDays } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import type { Reminder } from "@/lib/types";

const DAY = 86_400_000;
const typeIcon = {
  follow_up: <AlarmClock className="h-4 w-4 text-warn" aria-hidden />,
  interview: <CalendarClock className="h-4 w-4 text-ink-2" aria-hidden />,
  custom: <BellRing className="h-4 w-4 text-ink-2" aria-hidden />,
};

function Row({ r, due }: { r: Reminder; due: boolean }) {
  const s = useApp();
  const router = useRouter();
  const app = r.applicationId ? s.applications.find((a) => a.id === r.applicationId) : null;
  const nowIso = new Date().toISOString();
  const snooze = (days: number) =>
    void s.snoozeReminder(r.id, new Date(Date.now() + days * DAY).toISOString());

  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${
      due ? "border-warn-line bg-warn-bg" : "border-line-2 bg-surface"}`}>
      {typeIcon[r.type]}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{r.title}</p>
        <p className="text-xs text-ink-3">
          {due ? `was due ${relativeDays(r.dueAt, nowIso)}` : `due ${relativeDays(r.snoozedUntil ?? r.dueAt, nowIso)}`}
          {app && (
            <button type="button" className="ml-2 font-semibold text-ink-2 underline"
              onClick={() => { s.selectApp(app.id); router.push("/"); }}>
              {app.company} · {app.role}
            </button>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {[["1d", 1], ["3d", 3], ["1w", 7]].map(([lbl, d]) => (
          <Button key={lbl} variant="ghost" size="sm" onClick={() => snooze(d as number)}
            aria-label={`Snooze ${r.title} for ${lbl}`}>
            {lbl}
          </Button>
        ))}
        <Button variant="secondary" size="sm" onClick={() => void s.completeReminder(r.id)}
          aria-label={`Mark ${r.title} done`}>
          <Check className="h-3.5 w-3.5" aria-hidden /> Done
        </Button>
      </div>
    </li>
  );
}

export function RemindersPage() {
  const s = useApp();
  const nowIso = new Date().toISOString();
  const due = dueReminders(s.reminders, nowIso);
  const dueIds = new Set(due.map((r) => r.id));
  const upcoming = s.reminders
    .filter((r) => !r.done && !dueIds.has(r.id))
    .sort((a, b) => (a.snoozedUntil ?? a.dueAt).localeCompare(b.snoozedUntil ?? b.dueAt));

  return (
    <div className="mx-auto max-w-3xl px-5 pt-6 lg:px-7">
      <h1 className="text-2xl font-extrabold tracking-tight">Reminders</h1>
      <p className="mb-6 text-xs text-ink-3">Follow-ups and interviews, so nothing slips</p>

      <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-3">Due now</h2>
      <ul className="mb-6 flex flex-col gap-2">
        {due.map((r) => <Row key={r.id} r={r} due />)}
        {due.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
            Nothing due — you’re on top of it. 🎯
          </li>
        )}
      </ul>

      <h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-3">Upcoming</h2>
      <ul className="flex flex-col gap-2 pb-8">
        {upcoming.map((r) => <Row key={r.id} r={r} due={false} />)}
        {upcoming.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
            No upcoming reminders.
          </li>
        )}
      </ul>
    </div>
  );
}
