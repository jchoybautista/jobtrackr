"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useApp } from "@/lib/store";

export function AddColumn() {
  const addStage = useApp((s) => s.addStage);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) { setAdding(false); return; }
    void addStage(trimmed);
    setName(""); setAdding(false);
  }

  return (
    <section aria-label="Add column" className="flex w-[248px] shrink-0 snap-start flex-col">
      {adding ? (
        <div className="rounded-2xl border border-line-2 bg-surface p-2">
          <label htmlFor="new-column" className="sr-only">New column name</label>
          <input
            id="new-column" autoFocus value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") { setAdding(false); setName(""); }
            }}
            onBlur={() => { setAdding(false); setName(""); }}
            placeholder="Column name"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <button
          type="button" onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-2xl border border-dashed border-line px-3 py-2.5 text-xs font-medium text-ink-3 hover:bg-sunken"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add column
        </button>
      )}
    </section>
  );
}
