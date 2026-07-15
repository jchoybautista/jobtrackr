"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Trash2, X, ExternalLink, BellRing, FileText } from "lucide-react";
import { useApp } from "@/lib/store";
import type { Application, InterviewRound, WorkMode } from "@/lib/types";
import { TEMPLATE_META } from "@/cv/types";
import { Button } from "@/components/ui/Button";
import { AddRow } from "@/components/ui/AddRow";
import { Select } from "@/components/ui/Select";
import { SaveFooter } from "@/components/ui/SaveFooter";
import { toast } from "@/components/ui/Toast";
import { isDirty, changedFields } from "@/lib/draft";
import { relativeDays, shortDate } from "@/lib/format";

const input = "w-full rounded-xl border border-line px-3 py-2 text-sm placeholder:text-ink-3";
const label = "mb-1 block text-[11px] font-semibold text-ink-2";
const sectionTitle = "mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-3";

/** The fields that buffer. Everything else in the panel (stage, list
 *  add/remove, delete) commits immediately — see the editing contract spec. */
type Draft = Pick<Application,
  "company" | "role" | "location" | "workMode" | "salaryMin" | "salaryMax" | "source" | "tagIds">;

const seed = (a: Application): Draft => ({
  company: a.company, role: a.role, location: a.location, workMode: a.workMode,
  salaryMin: a.salaryMin, salaryMax: a.salaryMax, source: a.source, tagIds: a.tagIds,
});

export function DetailPanel() {
  const s = useApp();
  const app = s.applications.find((a) => a.id === s.selectedAppId) ?? null;
  if (!app) return null;
  // Keying on the id remounts the body when a different application is
  // selected, so the draft is re-seeded without syncing state in an effect.
  return <PanelBody key={app.id} app={app} />;
}

function PanelBody({ app }: { app: Application }) {
  const s = useApp();
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => seed(app));
  const [noteDraft, setNoteDraft] = useState("");
  const [ivDraft, setIvDraft] = useState({ roundType: "phone" as InterviewRound, scheduledAt: "", locationOrLink: "" });
  const [contactDraft, setContactDraft] = useState({ name: "", role: "", email: "" });
  const [reminderDraft, setReminderDraft] = useState({ title: "", dueAt: "" });

  const stored = seed(app);
  const dirty = isDirty(draft, stored);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Re-registered when `dirty` flips so Escape always sees current state —
  // cheaper and safer than smuggling the handler through a ref.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dirty) setConfirmDiscard(true);
      else s.selectApp(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dirty, s]);

  const nowIso = new Date().toISOString();
  const interviews = s.interviews.filter((i) => i.applicationId === app.id)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const contacts = s.contacts.filter((c) => c.applicationId === app.id);
  const notes = s.notes.filter((n) => n.applicationId === app.id);
  const events = s.events.filter((e) => e.applicationId === app.id);
  const reminders = s.reminders.filter((r) => r.applicationId === app.id && !r.done)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const linkedDocs = s.cvdocs.filter((c) => c.applicationId === app.id);
  const unlinkedDocs = s.cvdocs.filter((c) => !c.applicationId);
  const hasLink = /^https?:\/\//.test(app.url ?? "");

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  const saveChanges = () => {
    void s.updateApplication(app.id, changedFields(draft, stored));
    toast("Saved", "success");
  };

  const requestClose = () => {
    if (dirty) { setConfirmDiscard(true); return; }
    s.selectApp(null);
  };

  return (
    <AnimatePresence>
      <motion.div key="backdrop" className="fixed inset-0 z-40 bg-ink/25"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={requestClose} aria-hidden />
      <motion.div
        key={app.id} ref={panelRef} tabIndex={-1}
        role="dialog" aria-modal="true" aria-label={`${app.role} at ${app.company} details`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto bg-surface shadow-2xl outline-none max-md:inset-x-0 max-md:top-12 max-md:rounded-t-3xl"
        initial={{ x: 48, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 48, opacity: 0 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line-2 bg-surface px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold tracking-tight">{app.role}</h2>
            <p className="text-xs text-ink-3">
              {app.company}
              {hasLink && (
                <a href={app.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-0.5 font-semibold text-ink-2 underline">
                  posting <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <label htmlFor="detail-stage" className="sr-only">Stage</label>
            <Select id="detail-stage" value={app.stageId} wrapperClassName="inline-flex"
              className="rounded-full border border-line bg-surface py-1.5 pl-3.5 text-xs font-semibold"
              onChange={(e) => void s.moveApplication(app.id, e.target.value, 0)}>
              {s.stages.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </Select>
            <button type="button" aria-label="Delete application" onClick={() => setConfirmDelete(true)}
              className="rounded-full p-2 text-ink-3 hover:bg-danger-bg hover:text-danger">
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" aria-label="Close details" onClick={requestClose}
              className="rounded-full p-2 text-ink-3 hover:bg-sunken">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 px-6 py-5">
          <section aria-label="Overview">
            <h3 className={sectionTitle}>Overview</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="f-company" className={label}>Company</label>
                <input id="f-company" value={draft.company}
                  onChange={(e) => set({ company: e.target.value })} className={input} /></div>
              <div><label htmlFor="f-role" className={label}>Role</label>
                <input id="f-role" value={draft.role}
                  onChange={(e) => set({ role: e.target.value })} className={input} /></div>
              <div><label htmlFor="f-location" className={label}>Location</label>
                <input id="f-location" value={draft.location ?? ""}
                  onChange={(e) => set({ location: e.target.value })} className={input} /></div>
              <div><label htmlFor="f-mode" className={label}>Work mode</label>
                <Select id="f-mode" value={draft.workMode ?? ""}
                  onChange={(e) => set({ workMode: (e.target.value || undefined) as WorkMode | undefined })}
                  className={input}>
                  <option value="">—</option><option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option><option value="onsite">Onsite</option>
                </Select></div>
              <div><label htmlFor="f-smin" className={label}>Salary min</label>
                <input id="f-smin" type="number" value={draft.salaryMin ?? ""}
                  onChange={(e) => set({ salaryMin: e.target.value ? Number(e.target.value) : undefined })}
                  className={input} /></div>
              <div><label htmlFor="f-smax" className={label}>Salary max</label>
                <input id="f-smax" type="number" value={draft.salaryMax ?? ""}
                  onChange={(e) => set({ salaryMax: e.target.value ? Number(e.target.value) : undefined })}
                  className={input} /></div>
              <div className="col-span-2"><label htmlFor="f-source" className={label}>Source</label>
                <input id="f-source" value={draft.source ?? ""}
                  onChange={(e) => set({ source: e.target.value })} className={input} /></div>
            </div>
          </section>

          <section aria-label="Tags">
            <h3 className={sectionTitle}>Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {s.tags.map((t) => {
                const on = draft.tagIds.includes(t.id);
                return (
                  <button key={t.id} type="button" aria-pressed={on}
                    onClick={() => set({ tagIds: on ? draft.tagIds.filter((x) => x !== t.id) : [...draft.tagIds, t.id] })}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:bg-sunken"}`}>
                    {t.name}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-label="Interviews">
            <h3 className={sectionTitle}>Interviews</h3>
            <ul className="mb-3 flex flex-col gap-2">
              {interviews.map((iv) => (
                <li key={iv.id} className="flex items-center justify-between rounded-xl border border-line-2 px-3 py-2 text-sm">
                  <span><span className="font-semibold capitalize">{iv.roundType}</span>
                    <span className="text-ink-3"> · {shortDate(iv.scheduledAt)}{iv.locationOrLink ? ` · ${iv.locationOrLink}` : ""}</span></span>
                  <button type="button" aria-label="Remove interview" onClick={() => void s.removeInterview(iv.id)}
                    className="rounded-full p-1.5 text-ink-3 hover:bg-sunken"><X className="h-3.5 w-3.5" aria-hidden /></button>
                </li>
              ))}
              {interviews.length === 0 && <li className="text-xs text-ink-3">No interviews scheduled yet.</li>}
            </ul>
            <AddRow label="Add interview" onSubmit={() => {
              if (!ivDraft.scheduledAt) return;
              void s.addInterview({ applicationId: app.id, roundType: ivDraft.roundType,
                scheduledAt: new Date(ivDraft.scheduledAt).toISOString(),
                locationOrLink: ivDraft.locationOrLink || undefined });
              setIvDraft({ roundType: "phone", scheduledAt: "", locationOrLink: "" });
            }}>
              <div><label htmlFor="iv-type" className={label}>Round</label>
                <Select id="iv-type" value={ivDraft.roundType}
                  onChange={(e) => setIvDraft({ ...ivDraft, roundType: e.target.value as InterviewRound })}
                  className={input}>
                  {(["phone", "technical", "panel", "final", "other"] as const).map((r) => <option key={r} value={r}>{r}</option>)}
                </Select></div>
              <div><label htmlFor="iv-at" className={label}>When</label>
                <input id="iv-at" type="datetime-local" required value={ivDraft.scheduledAt}
                  onChange={(e) => setIvDraft({ ...ivDraft, scheduledAt: e.target.value })} className={input} /></div>
            </AddRow>
          </section>

          <section aria-label="Contacts">
            <h3 className={sectionTitle}>Contacts</h3>
            <ul className="mb-3 flex flex-col gap-2">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl border border-line-2 px-3 py-2 text-sm">
                  <span><span className="font-semibold">{c.name}</span>
                    <span className="text-ink-3"> {c.role && `· ${c.role}`} {c.email && `· ${c.email}`}</span></span>
                  <button type="button" aria-label={`Remove contact ${c.name}`} onClick={() => void s.removeContact(c.id)}
                    className="rounded-full p-1.5 text-ink-3 hover:bg-sunken"><X className="h-3.5 w-3.5" aria-hidden /></button>
                </li>
              ))}
            </ul>
            <AddRow label="Add contact" onSubmit={() => {
              if (!contactDraft.name.trim()) return;
              void s.addContact({ applicationId: app.id, name: contactDraft.name.trim(),
                role: contactDraft.role || undefined, email: contactDraft.email || undefined });
              setContactDraft({ name: "", role: "", email: "" });
            }}>
              <div><label htmlFor="c-name" className={label}>Name</label>
                <input id="c-name" required value={contactDraft.name}
                  onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })} className={input} /></div>
              <div><label htmlFor="c-email" className={label}>Email</label>
                <input id="c-email" type="email" value={contactDraft.email}
                  onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} className={input} /></div>
            </AddRow>
          </section>

          <section aria-label="Reminders">
            <h3 className={sectionTitle}>Reminders</h3>
            <ul className="mb-3 flex flex-col gap-2">
              {reminders.map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-xl border border-line-2 px-3 py-2 text-sm">
                  <BellRing className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                  <span className="min-w-0 flex-1 truncate"><span className="font-semibold">{r.title}</span>
                    <span className="text-ink-3"> · due {shortDate(r.dueAt)}</span></span>
                </li>
              ))}
              {reminders.length === 0 && <li className="text-xs text-ink-3">No reminders yet.</li>}
            </ul>
            <AddRow label="Add reminder" onSubmit={() => {
              if (!reminderDraft.title.trim() || !reminderDraft.dueAt) return;
              void s.addReminder({ applicationId: app.id, type: "custom",
                title: reminderDraft.title.trim(),
                dueAt: new Date(reminderDraft.dueAt).toISOString() });
              setReminderDraft({ title: "", dueAt: "" });
            }}>
              <div><label htmlFor="rem-title" className={label}>Reminder</label>
                <input id="rem-title" required value={reminderDraft.title}
                  onChange={(e) => setReminderDraft({ ...reminderDraft, title: e.target.value })}
                  placeholder="Send thank-you note" className={input} /></div>
              <div><label htmlFor="rem-at" className={label}>Due</label>
                <input id="rem-at" type="datetime-local" required value={reminderDraft.dueAt}
                  onChange={(e) => setReminderDraft({ ...reminderDraft, dueAt: e.target.value })} className={input} /></div>
            </AddRow>
          </section>

          <section aria-label="Documents">
            <h3 className={sectionTitle}>Documents</h3>
            <ul className="mb-3 flex flex-col gap-2">
              {linkedDocs.map((cv) => (
                <li key={cv.id} className="flex items-center justify-between gap-2 rounded-xl border border-line-2 px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                    <span className="min-w-0 truncate"><span className="font-semibold">{cv.name}</span>
                      <span className="text-ink-3"> · {TEMPLATE_META[cv.templateId].name}</span></span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Link href={`/cv/${cv.id}`}
                      className="rounded-full px-2 py-1 text-xs font-semibold text-ink-2 hover:bg-sunken">Open</Link>
                    <button type="button" aria-label={`Unlink ${cv.name}`} onClick={() => void s.updateCv(cv.id, { applicationId: undefined })}
                      className="rounded-full p-1.5 text-ink-3 hover:bg-sunken"><X className="h-3.5 w-3.5" aria-hidden /></button>
                  </span>
                </li>
              ))}
              {linkedDocs.length === 0 && <li className="text-xs text-ink-3">No documents linked yet.</li>}
            </ul>
            {unlinkedDocs.length > 0 && (
              <>
                <label htmlFor="attach-cv" className="sr-only">Attach a CV</label>
                <Select id="attach-cv" value="" className={input}
                  onChange={(e) => { if (e.target.value) void s.updateCv(e.target.value, { applicationId: app.id }); }}>
                  <option value="">Attach a CV…</option>
                  {unlinkedDocs.map((cv) => <option key={cv.id} value={cv.id}>{cv.name} · {TEMPLATE_META[cv.templateId].name}</option>)}
                </Select>
              </>
            )}
          </section>

          <section aria-label="Notes">
            <h3 className={sectionTitle}>Notes</h3>
            <div className="mb-3">
              <AddRow label="Add note" onSubmit={() => {
                if (!noteDraft.trim()) return;
                void s.addNote(app.id, noteDraft.trim());
                setNoteDraft("");
              }}>
                <div className="sm:col-span-2"><label htmlFor="note" className={label}>Add a note</label>
                  <textarea id="note" rows={2} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Interview questions, impressions, follow-up plan…" className={input} /></div>
              </AddRow>
            </div>
            <ul className="flex flex-col gap-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-sunken px-3 py-2.5 text-sm">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <span className="mt-1 flex items-center justify-between text-[10px] text-ink-3">
                    {relativeDays(n.createdAt, nowIso)}
                    <button type="button" onClick={() => void s.removeNote(n.id)} className="font-semibold hover:text-danger">Delete</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {app.jdSnapshot && (
            <section aria-label="Job description snapshot">
              <details className="rounded-xl border border-line-2 px-4 py-3">
                <summary className="cursor-pointer text-xs font-bold text-ink-2">Job description snapshot</summary>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink-2">{app.jdSnapshot}</p>
              </details>
            </section>
          )}

          <section aria-label="Activity">
            <h3 className={sectionTitle}>Activity</h3>
            <ol className="flex flex-col gap-0">
              {events.map((ev) => (
                <li key={ev.id} className="relative border-l-2 border-line-2 pb-3 pl-4 last:pb-0">
                  <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-ink" aria-hidden />
                  <p className="text-xs font-medium">{ev.message}</p>
                  <p className="text-[10px] text-ink-3">{relativeDays(ev.at, nowIso)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <SaveFooter
          dirty={dirty}
          onSave={saveChanges}
          onCancel={() => setDraft(stored)}
          className="sticky bottom-0 z-10"
        />

        {confirmDiscard && (
          <div role="alertdialog" aria-modal="true" aria-label="Discard unsaved changes"
            className="sticky bottom-0 z-20 border-t border-line-2 bg-surface px-6 py-4">
            <p className="mb-3 text-sm font-medium">Discard unsaved changes?</p>
            <div className="flex justify-end gap-2">
              {/* Focus rests on the non-destructive choice, so a reflexive
                  second Escape or Enter cannot destroy the draft. */}
              <Button variant="secondary" size="sm" autoFocus onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </Button>
              <Button variant="danger" size="sm"
                onClick={() => { setConfirmDiscard(false); s.selectApp(null); }}>
                Discard
              </Button>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="sticky bottom-0 z-20 border-t border-line-2 bg-surface px-6 py-4">
            <p className="mb-3 text-sm font-medium">Delete this application and all its notes, contacts, and interviews?</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="danger" size="sm"
                onClick={() => { void s.removeApplication(app.id); toast("Application deleted", "info"); }}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
