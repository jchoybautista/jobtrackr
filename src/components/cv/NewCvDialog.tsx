"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { TEMPLATES } from "@/cv/templates";
import { PALETTE } from "@/lib/palette";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { MiniMock, AtsBadge } from "./MiniMock";
import type { TemplateId } from "@/cv/types";

export function NewCvDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createCv = useApp((s) => s.createCv);
  const router = useRouter();
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>("classic");
  const trimmed = name.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    const cv = await createCv(trimmed, templateId);
    toast(`“${cv.name}” created`, "success");
    setName(""); setTemplateId("classic");
    onClose();
    router.push(`/cv/${cv.id}`);
  }

  return (
    <Dialog open={open} onClose={onClose} title="New CV" maxWidth="max-w-2xl">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="cv-name" className="mb-1.5 block text-xs font-semibold text-ink-2">
            CV name
          </label>
          <input
            id="cv-name" autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Product Designer — Stripe"
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm placeholder:text-ink-3"
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 block text-xs font-semibold text-ink-2">Template</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TEMPLATES.map((t) => {
              const on = t.id === templateId;
              return (
                <button
                  key={t.id} type="button" aria-pressed={on}
                  onClick={() => setTemplateId(t.id)}
                  className={`flex flex-col gap-2 rounded-2xl border p-3 text-left transition-colors ${
                    on ? "border-ink bg-sunken" : "border-line-2 bg-surface hover:bg-sunken"
                  }`}
                >
                  <MiniMock templateId={t.id} accent={PALETTE.sky.hex} className="w-full" />
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-bold">{t.name}</span>
                    <AtsBadge atsSafe={t.atsSafe} />
                  </div>
                  <span className="text-[11px] leading-snug text-ink-3">{t.note}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!trimmed}>Create CV</Button>
        </div>
      </form>
    </Dialog>
  );
}
