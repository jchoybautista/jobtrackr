"use client";

import { useRef, useState } from "react";
import { Download, Moon, Trash2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { toCsv } from "@/lib/exportio";
import { PALETTE } from "@/lib/palette";
import { isDirty, changedFields } from "@/lib/draft";
import type { PaletteKey } from "@/lib/types";
import { ColorPicker } from "@/components/board/ColorPicker";
import { AddRow } from "@/components/ui/AddRow";
import { Button } from "@/components/ui/Button";
import { SaveFooter } from "@/components/ui/SaveFooter";
import { SortableList } from "@/components/ui/SortableList";
import { toast } from "@/components/ui/Toast";

const input = "rounded-xl border border-line px-3 py-2 text-sm";
const card = "rounded-2xl border border-line-2 bg-surface p-5";
/** Footers span the full card width and sit flush with its rounded bottom. */
const cardFooter = "-mx-5 -mb-5 mt-4 rounded-b-2xl";
const h2 = "mb-1 text-sm font-bold";
const sub = "mb-4 text-xs text-ink-3";

/** List rows reserve space for a grip, a colour dot and a delete button, so an
 *  add-field placed in a bare row would not share their left and right edges.
 *  These clone the real controls and hide them, keeping every text field in a
 *  card on one column without hard-coding the gutter widths. */
const GripSpacer = () => <span className="invisible shrink-0 p-1.5" aria-hidden><span className="block h-4 w-4" /></span>;
const DotSpacer = () => <span className="invisible h-5 w-5 shrink-0" aria-hidden />;
const DeleteSpacer = () => (
  <Button variant="ghost" size="sm" className="invisible" tabIndex={-1} aria-hidden>
    <Trash2 className="h-3.5 w-3.5" aria-hidden />
  </Button>
);

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const s = useApp();
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [newStage, setNewStage] = useState("");
  const [newTag, setNewTag] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const fileRef = useRef<HTMLInputElement>(null);
  const dotRef = useRef<HTMLButtonElement>(null);
  const sorted = [...s.stages].sort((a, b) => a.order - b.order);

  // Each buffered card holds an overlay of pending edits on top of the stored
  // values, rather than a copy of them. Nothing needs re-seeding when the store
  // changes: clearing the overlay is what "clean" means, so Cancel and a
  // completed Save are the same gesture, and no state is synced in an effect.
  const [stageEdits, setStageEdits] = useState<Record<string, string>>({});
  const [tagEdits, setTagEdits] = useState<Record<string, string>>({});
  const [prefEdits, setPrefEdits] = useState<Partial<{ nudgeDays: number; ghostDays: number; currency: string }>>({});
  const [confirmStage, setConfirmStage] = useState<string | null>(null);
  const [confirmTag, setConfirmTag] = useState<string | null>(null);

  // Stage NAMES buffer behind Save. Reorder, colour, add and delete stay
  // immediate — see the editing contract spec.
  const stageNames = Object.fromEntries(sorted.map((st) => [st.id, st.name]));
  const stageDraft = { ...stageNames, ...stageEdits };
  const stagesDirty = isDirty(stageDraft, stageNames);

  const saveStages = () => {
    for (const st of sorted) {
      const next = (stageDraft[st.id] ?? "").trim();
      if (next && next !== st.name) void s.renameStage(st.id, next);
    }
    setStageEdits({});
    toast("Saved", "success");
  };

  // Tag names buffer the same way. Tags do not reorder, so no SortableList.
  const tagNames = Object.fromEntries(s.tags.map((t) => [t.id, t.name]));
  const tagDraft = { ...tagNames, ...tagEdits };
  const tagsDirty = isDirty(tagDraft, tagNames);

  const saveTags = () => {
    for (const t of s.tags) {
      const next = (tagDraft[t.id] ?? "").trim();
      if (next && next !== t.name) void s.renameTag(t.id, next);
    }
    setTagEdits({});
    toast("Saved", "success");
  };

  // Preferences used to commit on every keystroke.
  const prefs = { nudgeDays: s.settings.nudgeDays, ghostDays: s.settings.ghostDays, currency: s.settings.currency };
  const prefDraft = { ...prefs, ...prefEdits };
  const prefsDirty = isDirty(prefDraft, prefs);

  const savePrefs = () => {
    void s.updateSettings(changedFields(prefDraft, prefs));
    setPrefEdits({});
    toast("Saved", "success");
  };

  async function onImportFile(file: File) {
    try {
      await s.importData(await file.text(), importMode);
      toast("Import complete", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Import failed", "error");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function exportCsv() {
    download("jobtrackr-applications.csv", toCsv(s), "text/csv");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 pt-6 pb-10 lg:px-7">
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>

      <section aria-label="Pipeline" className={card}>
        <h2 className={h2}>Pipeline</h2>
        <p className={sub}>Rename, reorder, recolor, or add columns. Colors come from the JobTrackr pastel set.</p>
        <SortableList
          items={sorted}
          getId={(st) => st.id}
          getLabel={(st) => st.name}
          onReorder={(_next, moved) => void s.moveStage(moved.id, moved.toIndex)}
          className="mb-3 flex flex-col gap-2"
          itemClassName="relative flex items-center gap-2.5"
          isDraggable={(st) => !st.pinned}
        >
            {(st, handle) => (
              <>
                {handle ?? <GripSpacer />}
                <button
                  ref={pickerFor === st.id ? dotRef : undefined}
                  type="button" aria-label={`Change ${st.name} color`} aria-expanded={pickerFor === st.id}
                  onClick={() => setPickerFor(pickerFor === st.id ? null : st.id)}
                  className="h-5 w-5 shrink-0 rounded-full transition-transform hover:scale-110"
                  style={{ background: PALETTE[st.color].hex }}
                />
                {pickerFor === st.id && (
                  <ColorPicker
                    value={st.color}
                    onChange={(c: PaletteKey) => void s.recolorStage(st.id, c)}
                    onClose={() => setPickerFor(null)}
                    excludeRef={dotRef}
                  />
                )}
                <label htmlFor={`stage-${st.id}`} className="sr-only">{st.name} column name</label>
                <input id={`stage-${st.id}`} value={stageDraft[st.id] ?? ""}
                  onChange={(e) => setStageEdits({ ...stageEdits, [st.id]: e.target.value })}
                  disabled={!!st.role} title={st.role ? "Default stage names are fixed" : undefined}
                  className={`${input} flex-1 disabled:cursor-not-allowed disabled:opacity-60`} />
                {st.pinned ? <DeleteSpacer /> : (
                  <Button variant="ghost" size="sm" aria-label={`Delete ${st.name} column`}
                    onClick={() => setConfirmStage(st.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-danger" aria-hidden />
                  </Button>
                )}
              </>
            )}
        </SortableList>

        {confirmStage && (
          <div role="alertdialog" aria-modal="true" aria-label="Delete column"
            className="mb-3 rounded-xl border border-danger-bg bg-danger-bg/40 p-4">
            <p className="mb-3 text-xs font-medium">
              Delete the “{sorted.find((st) => st.id === confirmStage)?.name}” column? Any cards move to the column on its left.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" autoFocus onClick={() => setConfirmStage(null)}>Keep it</Button>
              <Button variant="danger" size="sm" onClick={async () => {
                await s.removeStage(confirmStage);
                setConfirmStage(null);
              }}>Delete column</Button>
            </div>
          </div>
        )}

        <AddRow label="Add column" onSubmit={() => {
          if (!newStage.trim()) return;
          void s.addStage(newStage.trim());
          setNewStage("");
        }}>
          <div className="flex items-center gap-2.5 sm:col-span-2">
            <GripSpacer />
            <DotSpacer />
            <label htmlFor="new-stage" className="sr-only">New column name</label>
            <input id="new-stage" value={newStage} onChange={(e) => setNewStage(e.target.value)}
              placeholder="New column (e.g. Ghosted, Withdrawn)" className={`${input} flex-1`} />
            <DeleteSpacer />
          </div>
        </AddRow>

        <SaveFooter dirty={stagesDirty} onSave={saveStages}
          onCancel={() => setStageEdits({})} className={cardFooter} />
      </section>

      <section aria-label="Tags" className={card}>
        <h2 className={h2}>Tags</h2>
        <p className={sub}>Tags appear as white pills on cards. Rename inline or add your own.</p>
        <ul className="mb-3 flex flex-col gap-2">
          {s.tags.map((t) => (
            <li key={t.id} className="flex items-center gap-2.5">
              <label htmlFor={`tag-${t.id}`} className="sr-only">{t.name} tag name</label>
              <input id={`tag-${t.id}`} value={tagDraft[t.id] ?? ""}
                onChange={(e) => setTagEdits({ ...tagEdits, [t.id]: e.target.value })}
                className={`${input} flex-1`} />
              <Button variant="ghost" size="sm" aria-label={`Delete tag ${t.name}`}
                onClick={() => setConfirmTag(t.id)}>
                <Trash2 className="h-3.5 w-3.5 text-danger" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>

        {confirmTag && (
          <div role="alertdialog" aria-modal="true" aria-label="Delete tag"
            className="mb-3 rounded-xl border border-danger-bg bg-danger-bg/40 p-4">
            <p className="mb-3 text-xs font-medium">
              Delete the “{s.tags.find((t) => t.id === confirmTag)?.name}” tag? It is removed from every application.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" autoFocus onClick={() => setConfirmTag(null)}>Keep it</Button>
              <Button variant="danger" size="sm"
                onClick={() => { void s.removeTag(confirmTag); setConfirmTag(null); }}>Delete tag</Button>
            </div>
          </div>
        )}

        <AddRow label="Add tag" onSubmit={() => {
          if (!newTag.trim()) return;
          void s.addTag(newTag.trim());
          setNewTag("");
        }}>
          <div className="flex items-center gap-2.5 sm:col-span-2">
            <label htmlFor="new-tag" className="sr-only">New tag name</label>
            <input id="new-tag" value={newTag} onChange={(e) => setNewTag(e.target.value)}
              placeholder="New tag (e.g. Visa sponsor)" className={`${input} flex-1`} />
            <DeleteSpacer />
          </div>
        </AddRow>

        <SaveFooter dirty={tagsDirty} onSave={saveTags}
          onCancel={() => setTagEdits({})} className={cardFooter} />
      </section>

      <section aria-label="Preferences" className={card}>
        <h2 className={h2}>Preferences</h2>
        <p className={sub}>Tune how JobTrackr nudges you.</p>
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="nudge-days" className="mb-1 block text-xs font-semibold text-ink-2">
              Follow-up nudge after (days)
            </label>
            <input id="nudge-days" type="number" min={1} max={60} value={prefDraft.nudgeDays}
              onChange={(e) => setPrefEdits({ ...prefEdits, nudgeDays: Math.max(1, Number(e.target.value) || 7) })}
              className={`${input} w-28`} />
          </div>
          <div>
            <label htmlFor="ghost-days" className="mb-1 block text-xs font-semibold text-ink-2">
              Ghosted after (days)
            </label>
            <input id="ghost-days" type="number" min={1} max={90} value={prefDraft.ghostDays}
              onChange={(e) => setPrefEdits({ ...prefEdits, ghostDays: Math.max(1, Number(e.target.value) || 14) })}
              className={`${input} w-28`} />
          </div>
          <div>
            <label htmlFor="currency" className="mb-1 block text-xs font-semibold text-ink-2">Default currency</label>
            <input id="currency" value={prefDraft.currency}
              onChange={(e) => setPrefEdits({ ...prefEdits, currency: e.target.value.toUpperCase() })}
              className={`${input} w-28`} />
          </div>
        </div>

        <SaveFooter dirty={prefsDirty} onSave={savePrefs}
          onCancel={() => setPrefEdits({})} className={cardFooter} />
      </section>

      <section aria-label="Appearance" className={card}>
        <h2 className={h2}>Appearance</h2>
        <p className={sub}>Light mode today. Dark mode is on the roadmap — the whole app is already token-ready.</p>
        <Button variant="secondary" disabled aria-disabled="true">
          <Moon className="h-4 w-4" aria-hidden /> Dark mode — coming soon
        </Button>
      </section>

      <section aria-label="Data" className={card}>
        <h2 className={h2}>Data</h2>
        <p className={sub}>Your data lives in this browser. Export it anytime — it’s yours.</p>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm"
            onClick={async () => download("jobtrackr-export.json", await s.exportJson(), "application/json")}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Export JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Export CSV
          </Button>
        </div>
        <fieldset className="mb-4">
          <legend className="mb-1.5 text-xs font-semibold text-ink-2">Import JSON</legend>
          <div className="mb-2 flex gap-3 text-xs">
            {(["merge", "replace"] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5">
                <input type="radio" name="import-mode" value={m} checked={importMode === m}
                  onChange={() => setImportMode(m)} />
                {m === "merge" ? "Merge into current data" : "Replace everything"}
              </label>
            ))}
          </div>
          <label htmlFor="import-file" className="sr-only">Choose JSON file</label>
          <input id="import-file" ref={fileRef} type="file" accept="application/json"
            onChange={(e) => e.target.files?.[0] && void onImportFile(e.target.files[0])}
            className="text-xs" />
        </fieldset>
        <div className="rounded-xl border border-danger-bg bg-danger-bg/40 p-4">
          <p className="mb-2 text-xs font-bold text-danger">Danger zone</p>
          <p className="mb-2 text-xs text-ink-2">Type <strong>DELETE</strong> to enable the button. This wipes every application, note, and reminder.</p>
          <div className="flex gap-2">
            <label htmlFor="confirm-delete" className="sr-only">Type DELETE to confirm</label>
            <input id="confirm-delete" value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE" className={`${input} w-32`} />
            <Button variant="danger" size="sm" disabled={confirmText !== "DELETE"}
              onClick={() => { void s.resetAllData(); setConfirmText(""); toast("All data cleared", "info"); }}>
              Clear all data
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
