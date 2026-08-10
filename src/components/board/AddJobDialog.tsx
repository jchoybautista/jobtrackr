"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { parseQuickAdd } from "@/lib/quickadd";
import type { WorkMode } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";

const input = "w-full rounded-xl border border-line px-3.5 py-2.5 text-sm placeholder:text-ink-3";
const label = "mb-1.5 block text-xs font-semibold text-ink-2";

const EMPTY = {
  company: "", role: "", location: "", workMode: "" as WorkMode | "",
  salaryMin: "", salaryMax: "", source: "", url: "", stageId: "", jdSnapshot: "",
  tagIds: [] as string[],
};

export function AddJobDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { stages, tags, addApplication } = useApp();
  const [form, setForm] = useState(EMPTY);
  const [paste, setPaste] = useState("");
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));

  function applyPaste(text: string) {
    setPaste(text);
    const p = parseQuickAdd(text);
    set({
      company: p.company ?? form.company, role: p.role ?? form.role,
      workMode: p.workMode ?? form.workMode, url: p.url ?? form.url,
      source: p.source ?? form.source, jdSnapshot: p.jdSnapshot ?? form.jdSnapshot,
      salaryMin: p.salaryMin ? String(p.salaryMin) : form.salaryMin,
      salaryMax: p.salaryMax ? String(p.salaryMax) : form.salaryMax,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) return;
    const stageId = form.stageId || stages[0]?.id;
    const appliedStage = stages.find((s) => s.id === stageId);
    await addApplication({
      company: form.company.trim(), role: form.role.trim(),
      location: form.location.trim() || undefined,
      workMode: form.workMode || undefined,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      source: form.source.trim() || undefined,
      url: form.url.trim() || undefined,
      jdSnapshot: form.jdSnapshot || undefined,
      tagIds: form.tagIds, stageId,
      appliedAt: appliedStage && appliedStage.order > 0 ? new Date().toISOString() : undefined,
    });
    toast(`${form.company.trim()} added to ${appliedStage?.name ?? "board"}`, "success");
    setForm(EMPTY); setPaste("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add job" maxWidth="max-w-xl">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="paste" className={label}>
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-ink-3" aria-hidden />
            Paste a job link or description — I&rsquo;ll fill what I can
          </label>
          <textarea
            id="paste" rows={2} value={paste} onChange={(e) => applyPaste(e.target.value)}
            placeholder="e.g. Senior Product Designer at Stripe — Remote — $120k–$140k"
            className={input}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="company" className={label}>Company *</label>
            <input id="company" required value={form.company} onChange={(e) => set({ company: e.target.value })} className={input} />
          </div>
          <div>
            <label htmlFor="role" className={label}>Role *</label>
            <input id="role" required value={form.role} onChange={(e) => set({ role: e.target.value })} className={input} />
          </div>
          <div>
            <label htmlFor="location" className={label}>Location</label>
            <input id="location" value={form.location} onChange={(e) => set({ location: e.target.value })} className={input} />
          </div>
          <div>
            <label htmlFor="workMode" className={label}>Work mode</label>
            <Select id="workMode" value={form.workMode} onChange={(e) => set({ workMode: e.target.value as WorkMode | "" })} className={input}>
              <option value="">—</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </Select>
          </div>
          <div>
            <label htmlFor="salaryMin" className={label}>Salary min</label>
            <input id="salaryMin" type="number" inputMode="numeric" value={form.salaryMin} onChange={(e) => set({ salaryMin: e.target.value })} className={input} />
          </div>
          <div>
            <label htmlFor="salaryMax" className={label}>Salary max</label>
            <input id="salaryMax" type="number" inputMode="numeric" value={form.salaryMax} onChange={(e) => set({ salaryMax: e.target.value })} className={input} />
          </div>
          <div>
            <label htmlFor="source" className={label}>Source</label>
            <input id="source" value={form.source} onChange={(e) => set({ source: e.target.value })} placeholder="LinkedIn, referral…" className={input} />
          </div>
          <div>
            <label htmlFor="stage" className={label}>Column</label>
            <Select id="stage" value={form.stageId || stages[0]?.id} onChange={(e) => set({ stageId: e.target.value })} className={input}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div className="col-span-2">
            <label htmlFor="url" className={label}>Posting URL</label>
            <input id="url" type="url" value={form.url} onChange={(e) => set({ url: e.target.value })} className={input} />
          </div>
        </div>

        <fieldset>
          <legend className={label}>Tags</legend>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const on = form.tagIds.includes(t.id);
              return (
                <button
                  key={t.id} type="button" aria-pressed={on}
                  onClick={() => set({ tagIds: on ? form.tagIds.filter((x) => x !== t.id) : [...form.tagIds, t.id] })}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:bg-sunken"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!form.company.trim() || !form.role.trim()}>Add job</Button>
        </div>
      </form>
    </Dialog>
  );
}
