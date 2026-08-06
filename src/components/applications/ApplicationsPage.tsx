"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { filterApplications } from "@/lib/selectors";
import { filterByStatus, sortApplications, type Outcome, type SortKey } from "@/lib/table";
import { formatSalary, shortDate, relativeDays } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { DetailPanel } from "@/components/detail/DetailPanel";

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "won", label: "Offer" },
  { value: "lost", label: "Rejected" },
];

export function ApplicationsPage() {
  const s = useApp();
  const nowIso = new Date().toISOString();
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [stageIds, setStageIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("applied");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const stageById = useMemo(() => new Map(s.stages.map((st) => [st.id, st])), [s.stages]);

  const rows = useMemo(() => {
    const base = filterApplications(s.applications, s.filters);
    const scoped = filterByStatus(base, stageIds, outcomes, s.stages);
    return sortApplications(scoped, sortKey, dir, s.stages, nowIso);
  }, [s.applications, s.filters, s.stages, stageIds, outcomes, sortKey, dir, nowIso]);

  const toggleOutcome = (o: Outcome) =>
    setOutcomes((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]));
  const toggleStage = (id: string) =>
    setStageIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const sortBy = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setDir("asc"); }
  };

  const th = (key: SortKey, label: string) => (
    <th className="px-3 py-2 text-left font-semibold">
      <button type="button" onClick={() => sortBy(key)} className="hover:underline"
        aria-label={`Sort by ${label}`}>
        {label}{sortKey === key ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <div className="px-5 pt-6 lg:px-7">
      <h1 className="text-2xl font-extrabold tracking-tight">Applications</h1>
      <p className="mb-5 text-xs text-ink-3">Every application, filterable by status and outcome.</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {OUTCOMES.map((o) => (
          <Button key={o.value} size="sm"
            variant={outcomes.includes(o.value) ? "primary" : "secondary"}
            aria-pressed={outcomes.includes(o.value)}
            onClick={() => toggleOutcome(o.value)}>{o.label}</Button>
        ))}
        <span className="mx-1 w-px self-stretch bg-line-2" aria-hidden />
        {s.stages.map((st) => (
          <Button key={st.id} size="sm"
            variant={stageIds.includes(st.id) ? "primary" : "secondary"}
            aria-pressed={stageIds.includes(st.id)}
            onClick={() => toggleStage(st.id)}>{st.name}</Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line-2 bg-surface">
        <table className="w-full text-xs">
          <thead className="border-b border-line-2 text-ink-3">
            <tr>
              {th("company", "Company")}{th("role", "Role")}{th("status", "Status")}
              {th("source", "Source")}{th("salary", "Salary")}{th("applied", "Applied")}
              {th("silent", "Silent")}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const st = stageById.get(a.stageId);
              return (
                <tr key={a.id} className="border-b border-line last:border-0 hover:bg-sunken">
                  <td className="px-3 py-2">
                    <button type="button" aria-label={`Open ${a.company}`}
                      onClick={() => s.selectApp(a.id)} className="font-semibold hover:underline">
                      {a.company}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-ink-2">{a.role}</td>
                  <td className="px-3 py-2">{st?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-2">{a.source ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-2">{formatSalary(a) ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-2">{a.appliedAt ? shortDate(a.appliedAt) : "—"}</td>
                  <td className="px-3 py-2 text-ink-2">{relativeDays(a.updatedAt, nowIso)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-3">No applications match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailPanel />
    </div>
  );
}
