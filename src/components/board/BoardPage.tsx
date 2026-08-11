"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, SlidersHorizontal, Search, Inbox, FilterX } from "lucide-react";
import { useApp } from "@/lib/store";
import { computeNudges, dueReminders, filterApplications, upcomingInterviews } from "@/lib/selectors";
import { EMPTY_FILTERS, type Interview } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Column } from "./Column";
import { AddColumn } from "./AddColumn";
import { DragBoard } from "./DragBoard";
import { AddJobDialog } from "./AddJobDialog";
import { CommandK } from "./CommandK";
import { FiltersPopover, countActiveFilters } from "./FiltersPopover";
import { DetailPanel } from "@/components/detail/DetailPanel";

export function BoardPage() {
  const s = useApp();
  const router = useRouter();
  const nowIso = new Date().toISOString();
  const [addOpen, setAddOpen] = useState(false);
  const [quickAddStage, setQuickAddStage] = useState<string | undefined>(undefined);
  const [kOpen, setKOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = countActiveFilters(s.filters);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setKOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(
    () => filterApplications(s.applications, s.filters),
    [s.applications, s.filters],
  );
  const nudges = useMemo(
    () => computeNudges(filtered, s.stages, s.settings.nudgeDays, nowIso),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, s.stages, s.settings.nudgeDays],
  );
  const nextInterviewByApp = useMemo(() => {
    const m = new Map<string, Interview>();
    for (const i of upcomingInterviews(s.interviews, nowIso)) {
      if (!m.has(i.applicationId)) m.set(i.applicationId, i);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.interviews]);
  const noteCountByApp = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of s.notes) m.set(n.applicationId, (m.get(n.applicationId) ?? 0) + 1);
    return m;
  }, [s.notes]);
  const docCountByApp = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of s.cvdocs) {
      if (c.applicationId) m.set(c.applicationId, (m.get(c.applicationId) ?? 0) + 1);
    }
    return m;
  }, [s.cvdocs]);
  const tagById = useMemo(() => new Map(s.tags.map((t) => [t.id, t])), [s.tags]);

  const activeCount = s.applications.filter((a) => {
    const st = s.stages.find((x) => x.id === a.stageId);
    return st?.kind === "pipeline";
  }).length;
  const dueCount = dueReminders(s.reminders, nowIso).length + nudges.size;

  return (
    <div className="flex h-full flex-col px-5 pt-6 lg:px-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Board</h1>
          <p className="text-sm text-ink-3">
            {activeCount} active application{activeCount === 1 ? "" : "s"}
            {dueCount > 0 && ` · ${dueCount} need${dueCount === 1 ? "s" : ""} attention`}
          </p>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          <Button variant="secondary" aria-label="Search (Cmd+K)" onClick={() => setKOpen(true)}>
            <Search className="h-4 w-4" aria-hidden /> Search
            <kbd className="rounded-md bg-sunken px-1.5 text-xs text-ink-3">⌘K</kbd>
          </Button>
          <Button variant="secondary" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((v) => !v)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
            {activeFilters > 0 && (
              <span className="rounded-full bg-ink px-1.5 py-0.5 text-xs font-bold text-white">{activeFilters}</span>
            )}
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Add job
          </Button>
          <FiltersPopover open={filtersOpen} onClose={() => setFiltersOpen(false)} />
        </div>
      </div>

      {s.settings.demo && (
        <div className="mb-4 flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-sm text-ink-2">
            You&rsquo;re looking at demo data — create an account to start tracking your own hunt.
          </p>
          {/* "Create an account" now lives once, in the sidebar's AccountMenu —
              this banner repeated it right next to it. */}
          <Button variant="ghost" size="sm" className="whitespace-nowrap"
            onClick={async () => {
              // Leaving the sandbox mid-session — without this they can carry on
              // entering real applications into a demo database they're already
              // locked out of, stranding the data in jobtrackr-demo.
              await s.clearDemo();
              router.push("/login");
            }}>
            Clear demo data
          </Button>
        </div>
      )}

      {s.applications.length === 0 ? (
        <EmptyState
          className="mb-4 bg-surface"
          icon={Inbox}
          title="Your board is empty"
          body="Add the first role you're chasing — drag its card between the columns below as things progress."
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add your first job
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          className="mb-4 bg-surface"
          icon={FilterX}
          title="No cards match your filters"
          body={`All ${s.applications.length} applications are hidden by the filters you have on.`}
          action={
            <Button variant="secondary" size="sm" onClick={() => s.setFilters(EMPTY_FILTERS)}>
              <FilterX className="h-3.5 w-3.5" aria-hidden /> Clear filters
            </Button>
          }
        />
      ) : null}

      <DragBoard>
        <div className="flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto pb-6">
          {s.stages.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              apps={filtered.filter((a) => a.stageId === stage.id).sort((a, b) => a.order - b.order)}
              tagById={tagById}
              nudges={nudges}
              nextInterviewByApp={nextInterviewByApp}
              noteCountByApp={noteCountByApp}
              docCountByApp={docCountByApp}
              onCardClick={(id) => s.selectApp(id)}
              onQuickAdd={(stageId) => { setQuickAddStage(stageId); setAddOpen(true); }}
            />
          ))}
          <AddColumn />
        </div>
      </DragBoard>

      <AddJobDialog
        open={addOpen}
        onClose={() => { setAddOpen(false); setQuickAddStage(undefined); }}
        initialStageId={quickAddStage}
      />
      <CommandK open={kOpen} onClose={() => setKOpen(false)} onAddJob={() => setAddOpen(true)} />
      <DetailPanel />
    </div>
  );
}
