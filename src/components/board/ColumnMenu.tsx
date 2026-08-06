"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { Stage } from "@/lib/types";
import { useApp } from "@/lib/store";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export function ColumnMenu({ stage }: { stage: Stage }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(stage.name);
  const ref = useRef<HTMLDivElement>(null);
  const { renameStage, removeStage } = useApp();
  const locked = !!stage.role;
  const pinned = !!stage.pinned;
  const hasActions = !locked || !pinned;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!hasActions) return null;

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button" aria-label={`${stage.name} column menu`} aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-1.5 text-ink-3 hover:bg-sunken"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-40 rounded-2xl border border-line-2 bg-surface p-1.5 shadow-xl">
          {!locked && (
            <button type="button"
              onClick={() => { setRenaming(true); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium hover:bg-sunken">
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Rename
            </button>
          )}
          {!pinned && (
            <button type="button"
              onClick={() => { setOpen(false); setConfirmDelete(true); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-danger hover:bg-danger-bg">
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
            </button>
          )}
        </div>
      )}

      <Dialog open={renaming} onClose={() => setRenaming(false)} title="Rename column">
        <form onSubmit={(e) => { e.preventDefault(); void renameStage(stage.id, name.trim() || stage.name); setRenaming(false); }}>
          <label htmlFor={`rename-${stage.id}`} className="mb-1.5 block text-xs font-semibold text-ink-2">Column name</label>
          <input
            id={`rename-${stage.id}`} value={name} onChange={(e) => setName(e.target.value)}
            className="mb-4 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm" autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRenaming(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete column?">
        <p className="mb-4 text-sm text-ink-2">“{stage.name}” will be removed; any cards move to the column on its left.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { void removeStage(stage.id); setConfirmDelete(false); }}>Delete</Button>
        </div>
      </Dialog>
    </div>
  );
}
