"use client";

import { useEffect, useMemo, useRef } from "react";
import { useApp } from "@/lib/store";
import { EMPTY_FILTERS } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export function countActiveFilters(f: typeof EMPTY_FILTERS): number {
  return (f.search ? 1 : 0) + f.tagIds.length + f.sources.length + (f.hasSalary !== null ? 1 : 0);
}

export function FiltersPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { filters, setFilters, tags, applications } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const sources = useMemo(
    () => Array.from(new Set(applications.map((a) => a.source).filter((s): s is string => !!s))),
    [applications],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open, onClose]);

  if (!open) return null;
  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
      on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:bg-sunken"}`;

  return (
    <div ref={ref} role="group" aria-label="Filters"
      className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-line-2 bg-surface p-4 shadow-xl">
      <div className="mb-3">
        <label htmlFor="filter-search" className="mb-1.5 block text-sm font-semibold text-ink-2">Search</label>
        <input id="filter-search" value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Company or role…" className="w-full rounded-xl border border-line px-3 py-2 text-base placeholder:text-ink-3" />
      </div>
      <fieldset className="mb-3">
        <legend className="mb-1.5 text-sm font-semibold text-ink-2">Tags</legend>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const on = filters.tagIds.includes(t.id);
            return (
              <button key={t.id} type="button" aria-pressed={on} className={chip(on)}
                onClick={() => setFilters({ ...filters, tagIds: on ? filters.tagIds.filter((x) => x !== t.id) : [...filters.tagIds, t.id] })}>
                {t.name}
              </button>
            );
          })}
        </div>
      </fieldset>
      {sources.length > 0 && (
        <fieldset className="mb-3">
          <legend className="mb-1.5 text-sm font-semibold text-ink-2">Source</legend>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((src) => {
              const on = filters.sources.includes(src);
              return (
                <button key={src} type="button" aria-pressed={on} className={chip(on)}
                  onClick={() => setFilters({ ...filters, sources: on ? filters.sources.filter((x) => x !== src) : [...filters.sources, src] })}>
                  {src}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <fieldset className="mb-4">
        <legend className="mb-1.5 text-sm font-semibold text-ink-2">Salary</legend>
        <div className="flex gap-1.5">
          {([["Any", null], ["Has salary", true], ["No salary", false]] as const).map(([lbl, val]) => (
            <button key={lbl} type="button" aria-pressed={filters.hasSalary === val} className={chip(filters.hasSalary === val)}
              onClick={() => setFilters({ ...filters, hasSalary: val })}>
              {lbl}
            </button>
          ))}
        </div>
      </fieldset>
      <Button variant="ghost" size="sm" className="w-full" onClick={() => setFilters(EMPTY_FILTERS)}>
        Clear all filters
      </Button>
    </div>
  );
}
