"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { animate, useReducedMotion } from "motion/react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/lib/store";
import { computeMetrics, computeNudges, dueReminders, upcomingInterviews } from "@/lib/selectors";
import { sortApplications } from "@/lib/table";
import { formatSalary, shortDate } from "@/lib/format";

const pctText = (r: number | null) => (r == null ? "—" : `${Math.round(r * 100)}%`);

function TextStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line-2 bg-surface p-5">
      <p className="text-xs font-semibold text-ink-3">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

function StatCard({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) { el.textContent = `${value}${suffix}`; return; }
    const controls = animate(0, value, {
      duration: 0.8, ease: "easeOut",
      onUpdate: (v) => { el.textContent = `${Math.round(v)}${suffix}`; },
    });
    return () => controls.stop();
  }, [value, suffix, reduced]);
  return (
    <div className="rounded-2xl border border-line-2 bg-surface p-5">
      <p className="text-xs font-semibold text-ink-3">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight"><span ref={ref}>0</span></p>
    </div>
  );
}

export function DashboardPage() {
  const s = useApp();
  const router = useRouter();
  const nowIso = new Date().toISOString();
  const metrics = useMemo(() => computeMetrics(s, nowIso), [s, nowIso]);
  const nudges = useMemo(
    () => computeNudges(s.applications, s.stages, s.settings.nudgeDays, nowIso),
    [s.applications, s.stages, s.settings.nudgeDays, nowIso],
  );
  const due = dueReminders(s.reminders, nowIso);
  const interviews = upcomingInterviews(s.interviews, nowIso).slice(0, 5);
  const appById = new Map(s.applications.map((a) => [a.id, a]));
  const stageById = useMemo(() => new Map(s.stages.map((st) => [st.id, st])), [s.stages]);
  const topOffers = useMemo(() => {
    const withSalary = s.applications.filter((a) => a.salaryMin != null || a.salaryMax != null);
    return sortApplications(withSalary, "salary", "desc", s.stages, nowIso).slice(0, 5);
  }, [s.applications, s.stages, nowIso]);

  const openApp = (id: string) => { s.selectApp(id); router.push("/"); };

  return (
    <div className="px-5 pt-6 lg:px-7">
      <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
      <p className="mb-6 text-xs text-ink-3">Your job hunt at a glance</p>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active applications" value={metrics.active} />
        <StatCard label="Response rate" value={Math.round(metrics.responseRate * 100)} suffix="%" />
        <TextStat label="Interview pass rate" value={pctText(metrics.interviewPassRate)} />
        <TextStat label="Technical pass rate" value={pctText(metrics.technicalPassRate)} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section aria-label="Pipeline funnel" className="rounded-2xl border border-line-2 bg-surface p-5">
          <h2 className="mb-4 text-sm font-bold">Pipeline funnel</h2>
          <div className="flex flex-col gap-3">
            {metrics.funnel.map((f) => (
              <div key={f.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold">{f.label}</span>
                  <span className="text-ink-3">{f.count} · {f.pct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
                  <div className="h-full rounded-full bg-ink transition-[width] duration-700"
                    style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Applications per week" className="rounded-2xl border border-line-2 bg-surface p-5">
          <h2 className="mb-4 text-sm font-bold">Applications per week</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.weekly} margin={{ top: 0, right: 0, bottom: 0, left: -28 }} barCategoryGap="18%">
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b6b6b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6b6b6b" }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                <Tooltip cursor={{ fill: "#f5f5f5" }} contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12 }} />
                <Bar dataKey="count" fill="#1a1a1a" radius={[6, 6, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <TextStat label="Screening" value={String(metrics.screeningCount)} />
        <TextStat label="Rejected" value={String(metrics.rejectedCount)} />
        <TextStat label="Ghosted" value={String(metrics.ghostedCount)} />
      </div>

      <section aria-label="Top offers" className="mb-6 rounded-2xl border border-line-2 bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold">Top offers</h2>
        {topOffers.length === 0 ? (
          <p className="text-xs text-ink-3">No salary figures yet — add an expected or offered amount to an application to see it ranked here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line-2 text-ink-3">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-semibold">Company</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold">Role</th>
                  <th className="px-2 py-2 text-left text-xs font-semibold">Status</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold">Offer</th>
                </tr>
              </thead>
              <tbody>
                {topOffers.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0 hover:bg-sunken">
                    <td className="px-2 py-2">
                      <button type="button" aria-label={`Open ${a.company}`} onClick={() => openApp(a.id)}
                        className="font-semibold hover:underline">{a.company}</button>
                    </td>
                    <td className="px-2 py-2 text-ink-2">{a.role}</td>
                    <td className="px-2 py-2 text-ink-2">{stageById.get(a.stageId)?.name ?? "—"}</td>
                    <td className="px-2 py-2 text-right font-semibold">{formatSalary(a) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 pb-8 lg:grid-cols-2">
        <section aria-label="Upcoming interviews" className="rounded-2xl border border-line-2 bg-surface p-5">
          <h2 className="mb-3 text-sm font-bold">Upcoming interviews</h2>
          <ul className="flex flex-col gap-2">
            {interviews.map((iv) => {
              const app = appById.get(iv.applicationId);
              return (
                <li key={iv.id}>
                  <button type="button" onClick={() => openApp(iv.applicationId)}
                    className="flex w-full items-center justify-between rounded-xl border border-line-2 px-3 py-2.5 text-left text-sm hover:bg-sunken">
                    <span><span className="font-semibold">{app?.company}</span>
                      <span className="text-ink-3"> · {iv.roundType} round</span></span>
                    <span className="text-xs font-semibold text-ink-2">{shortDate(iv.scheduledAt)}</span>
                  </button>
                </li>
              );
            })}
            {interviews.length === 0 && <li className="text-xs text-ink-3">Nothing scheduled — go get one! 💪</li>}
          </ul>
        </section>

        <section aria-label="Needs attention" className="rounded-2xl border border-line-2 bg-surface p-5">
          <h2 className="mb-3 text-sm font-bold">Needs attention</h2>
          <ul className="flex flex-col gap-2">
            {[...nudges.entries()].map(([appId, days]) => {
              const app = appById.get(appId);
              if (!app) return null;
              return (
                <li key={appId}>
                  <button type="button" onClick={() => openApp(appId)}
                    className="flex w-full items-center justify-between rounded-xl border border-warn-line bg-warn-bg px-3 py-2.5 text-left text-sm hover:opacity-80">
                    <span className="font-semibold">{app.company} · {app.role}</span>
                    <span className="text-xs font-semibold text-warn">{days}d silent</span>
                  </button>
                </li>
              );
            })}
            {due.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => r.applicationId ? openApp(r.applicationId) : router.push("/reminders")}
                  className="flex w-full items-center justify-between rounded-xl border border-line-2 px-3 py-2.5 text-left text-sm hover:bg-sunken">
                  <span className="font-semibold">{r.title}</span>
                  <span className="text-xs text-danger">due {shortDate(r.dueAt)}</span>
                </button>
              </li>
            ))}
            {nudges.size === 0 && due.length === 0 && (
              <li className="text-xs text-ink-3">All caught up — nothing needs your attention. ✨</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
