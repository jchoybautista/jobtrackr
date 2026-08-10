"use client";

import { useRef, useState } from "react";
import { Download, ImageOff, Image as ImageIcon } from "lucide-react";
import { useApp } from "@/lib/store";
import { TEMPLATES } from "@/cv/templates";
import { PALETTE } from "@/lib/palette";
import { ColorPicker } from "@/components/board/ColorPicker";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { downloadCv } from "@/cv/pdf";
import { MiniMock } from "./MiniMock";
import type { CvDoc } from "@/cv/types";
import type { PaletteKey } from "@/lib/types";

export function CvToolbar({ cv, photoUrl }: { cv: CvDoc; photoUrl?: string }) {
  const updateCv = useApp((s) => s.updateCv);
  const applications = useApp((s) => s.applications);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const dotRef = useRef<HTMLButtonElement>(null);

  const isClassic = cv.templateId === "classic";
  const accentHex = PALETTE[cv.accent].hex;
  const sortedApps = [...applications].sort((a, b) => a.company.localeCompare(b.company));

  async function handleDownload() {
    setBusy(true);
    try {
      await downloadCv(cv, photoUrl);
      toast(`“${cv.name}” downloaded`, "success");
    } catch {
      toast("Could not generate PDF", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line-2 bg-surface px-4 py-3 lg:px-6">
      {/* Template switcher */}
      <div
        role="group"
        aria-label="Template"
        className="flex items-center gap-1.5"
      >
        {TEMPLATES.map((t) => {
          const on = t.id === cv.templateId;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              aria-label={`${t.name} template`}
              title={t.name}
              onClick={() => void updateCv(cv.id, { templateId: t.id })}
              className={`rounded-lg p-1 transition-colors focus-visible:outline-2 focus-visible:outline-ink ${
                on ? "bg-sunken ring-2 ring-ink" : "hover:bg-sunken"
              }`}
            >
              <MiniMock templateId={t.id} accent={accentHex} className="w-9" />
            </button>
          );
        })}
      </div>

      {/* Accent color */}
      <div className="relative flex items-center gap-2">
        <span className="text-xs font-semibold text-ink-2">Accent</span>
        <button
          ref={dotRef}
          type="button"
          aria-label="Change accent color"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
          className="h-5 w-5 rounded-full ring-1 ring-line transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ink"
          style={{ background: accentHex }}
        />
        {pickerOpen && (
          <ColorPicker
            value={cv.accent}
            onChange={(c: PaletteKey) => void updateCv(cv.id, { accent: c })}
            onClose={() => setPickerOpen(false)}
            excludeRef={dotRef}
          />
        )}
      </div>

      {/* Photo toggle — Classic ignores photos entirely. */}
      <button
        type="button"
        aria-pressed={cv.showPhoto}
        disabled={isClassic}
        title={
          isClassic
            ? "The Classic template doesn’t use a photo"
            : cv.showPhoto
              ? "Hide photo"
              : "Show photo"
        }
        onClick={() => void updateCv(cv.id, { showPhoto: !cv.showPhoto })}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-40 ${
          cv.showPhoto && !isClassic
            ? "border-ink bg-ink text-white"
            : "border-line bg-surface text-ink-2 hover:bg-sunken"
        }`}
      >
        {cv.showPhoto && !isClassic ? (
          <ImageIcon className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <ImageOff className="h-3.5 w-3.5" aria-hidden />
        )}
        Photo
      </button>

      {/* Link to application */}
      <div className="flex items-center gap-2">
        <label htmlFor="cv-link-app" className="text-xs font-semibold text-ink-2">
          Linked to
        </label>
        <Select
          id="cv-link-app"
          value={cv.applicationId ?? ""}
          onChange={(e) => void updateCv(cv.id, { applicationId: e.target.value || undefined })}
          wrapperClassName="max-w-44"
          className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink focus-visible:outline-2 focus-visible:outline-ink"
        >
          <option value="">Not linked</option>
          {sortedApps.map((a) => (
            <option key={a.id} value={a.id}>
              {a.company} — {a.role}
            </option>
          ))}
        </Select>
      </div>

      {/* Download */}
      <Button
        size="sm"
        className="ml-auto"
        onClick={handleDownload}
        disabled={busy}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        {busy ? "Preparing…" : "Download PDF"}
      </Button>
    </div>
  );
}
