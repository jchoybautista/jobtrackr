"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, FilterX, Inbox, Plus } from "lucide-react";
import { useApp } from "@/lib/store";
import { filterApplications } from "@/lib/selectors";
import { filterByStatus, sortApplications, type Outcome, type SortKey } from "@/lib/table";
import { formatSalary, shortDate, relativeDays } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { AddJobDialog } from "@/components/board/AddJobDialog";
import { DetailPanel } from "@/components/detail/DetailPanel";

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "won", label: "Offer" },
  { value: "lost", label: "Rejected" },
];

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "company", label: "Company" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source" },
  { key: "salary", label: "Salary" },
  { key: "applied", label: "Applied" },
  { key: "silent", label: "Silent (days)" },
];

export function ApplicationsPage() {
  const s = useApp();
  const nowIso = new Date().toISOString();
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [stageIds, setStageIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("applied");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [addOpen, setAddOpen] = useState(false);
  const stageById = useMemo(() => new Map(s.stages.map((st) => [st.id, st])), [s.stages]);

  const rows = useMemo(() => {
    const base = filterApplications(s.applications, s.filters);
    const scoped = filterByStatus(base, stageIds, outcomes, s.stages);
    return sortApplications(scoped, sortKey, dir, s.stages, nowIso);
  }, [s.applications, s.filters, s.stages, stageIds, outcomes, sortKey, dir, nowIso]);

  const filtersActive = outcomes.length > 0 || stageIds.length > 0;
  const clearFilters = () => { setOutcomes([]); setStageIds([]); };
  const sortBy = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setDir("asc"); }
  };

  const th = (key: SortKey, label: string) => {
    const active = sortKey === key;
    return (
      <th
        key={key}
        scope="col"
        className="px-3 py-2 text-left font-semibold"
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <button
          type="button"
          onClick={() => sortBy(key)}
          title={`Sort by ${label}`}
          aria-label={`Sort by ${label}${active ? (dir === "asc" ? ", currently ascending" : ", currently descending") : ""}`}
          className="group/sort inline-flex items-center gap-1 rounded-md hover:text-ink"
        >
          <span className="group-hover/sort:underline">{label}</span>
          {active ? (
            dir === "asc"
              ? <ArrowUp className="h-3 w-3 shrink-0 text-ink" aria-hidden />
              : <ArrowDown className="h-3 w-3 shrink-0 text-ink" aria-hidden />
          ) : (
            /* Held in the layout at zero opacity so the hint appears on hover or
               keyboard focus without nudging the header text sideways. */
            <ChevronsUpDown
              className="h-3 w-3 shrink-0 opacity-0 transition-opacity duration-150 group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100 motion-reduce:transition-none"
              aria-hidden
            />
          )}
        </button>
      </th>
    );
  };

  return (
    <div className="px-5 pt-6 lg:px-7">
      <h1 className="text-2xl font-extrabold tracking-tight">Applications</h1>
      <p className="mb-5 text-sm text-ink-3">Every application, filterable by status and outcome.</p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <MultiSelect
          label="Outcome"
          allLabel="All"
          options={OUTCOMES}
          selected={outcomes}
          onChange={(next) => setOutcomes(next as Outcome[])}
        />
        <MultiSelect
          label="Stage"
          allLabel="All"
          options={s.stages.map((st) => ({ value: st.id, label: st.name }))}
          selected={stageIds}
          onChange={setStageIds}
        />
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <FilterX className="h-3.5 w-3.5" aria-hidden /> Clear filters
          </Button>
        )}
        <p className="ml-auto text-sm text-ink-3" aria-live="polite">
          {rows.length} of {s.applications.length} shown
        </p>
      </div>

      {s.applications.length === 0 ? (
        <EmptyState
          size="page"
          icon={Inbox}
          title="No applications yet"
          body="Add the first role you're chasing and it shows up here with its stage, source, salary and how long it has been quiet."
          action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" aria-hidden /> Add job</Button>}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          size="page"
          icon={FilterX}
          title="No applications match these filters"
          body="Nothing fits the outcome and stage you picked. Widen the filters to see the rest of your pipeline."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              <FilterX className="h-4 w-4" aria-hidden /> Clear filters
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line-2 bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line-2 text-ink-3">
              <tr>{COLUMNS.map((c) => th(c.key, c.label))}</tr>
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
            </tbody>
          </table>
        </div>
      )}

      <AddJobDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <DetailPanel />
    </div>
  );
}
