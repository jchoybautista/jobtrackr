"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Trash2, X, Plus, ExternalLink } from "lucide-react";
import { useApp } from "@/lib/store";
import type { InterviewRound, WorkMode } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { relativeDays, shortDate } from "@/lib/format";

const input = "w-full rounded-xl border border-line px-3 py-2 text-sm placeholder:text-ink-3";
const label = "mb-1 block text-[11px] font-semibold text-ink-2";
const sectionTitle = "mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-3";

export function DetailPanel() {
  const s = useApp();
  const app = s.applications.find((a) => a.id === s.selectedAppId) ?? null;
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [ivDraft, setIvDraft] = useState({ roundType: "phone" as InterviewRound, scheduledAt: "", locationOrLink: "" });
  const [contactDraft, setContactDraft] = useState({ name: "", role: "", email: "" });

  useEffect(() => {
    if (!app) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") s.selectApp(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app?.id]);

  if (!app) return null;
  const nowIso = new Date().toISOString();
  const interviews = s.interviews.filter((i) => i.applicationId === app.id)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const contacts = s.contacts.filter((c) => c.applicationId === app.id);
  const notes = s.notes.filter((n) => n.applicationId === app.id);
  const events = s.events.filter((e) => e.applicationId === app.id);

  const save = (patch: Parameters<typeof s.updateApplication>[1]) =>
    void s.updateApplication(app.id, patch);

  return (
    <AnimatePresence>
      <motion.div key="backdrop" className="fixed inset-0 z-40 bg-ink/25"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => s.selectApp(null)} aria-hidden />
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
              {app.url && (
                <a href={app.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-0.5 font-semibold text-ink-2 underline">
                  posting <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <label htmlFor="detail-stage" className="sr-only">Stage</label>
            <select id="detail-stage" value={app.stageId} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold"
              onChange={(e) => void s.moveApplication(app.id, e.target.value, 0)}>
              {s.stages.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
            <button type="button" aria-label="Delete application" onClick={() => setConfirmDelete(true)}
              className="rounded-full p-2 text-ink-3 hover:bg-danger-bg hover:text-danger">
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" aria-label="Close details" onClick={() => s.selectApp(null)}
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
                <input id="f-company" defaultValue={app.company} onBlur={(e) => e.target.value !== app.company && save({ company: e.target.value })} className={input} /></div>
              <div><label htmlFor="f-role" className={label}>Role</label>
                <input id="f-role" defaultValue={app.role} onBlur={(e) => e.target.value !== app.role && save({ role: e.target.value })} className={input} /></div>
              <div><label htmlFor="f-location" className={label}>Location</label>
                <input id="f-location" defaultValue={app.location ?? ""} onBlur={(e) => e.target.value !== (app.location ?? "") && save({ location: e.target.value || undefined })} className={input} /></div>
              <div><label htmlFor="f-mode" className={label}>Work mode</label>
                <select id="f-mode" value={app.workMode ?? ""} onChange={(e) => save({ workMode: (e.target.value || undefined) as WorkMode | undefined })} className={input}>
                  <option value="">—</option><option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option><option value="onsite">Onsite</option>
                </select></div>
              <div><label htmlFor="f-smin" className={label}>Salary min</label>
                <input id="f-smin" type="number" defaultValue={app.salaryMin ?? ""} onBlur={(e) => save({ salaryMin: e.target.value ? Number(e.target.value) : undefined })} className={input} /></div>
              <div><label htmlFor="f-smax" className={label}>Salary max</label>
                <input id="f-smax" type="number" defaultValue={app.salaryMax ?? ""} onBlur={(e) => save({ salaryMax: e.target.value ? Number(e.target.value) : undefined })} className={input} /></div>
              <div className="col-span-2"><label htmlFor="f-source" className={label}>Source</label>
                <input id="f-source" defaultValue={app.source ?? ""} onBlur={(e) => save({ source: e.target.value || undefined })} className={input} /></div>
            </div>
          </section>

          <section aria-label="Tags">
            <h3 className={sectionTitle}>Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {s.tags.map((t) => {
                const on = app.tagIds.includes(t.id);
                return (
                  <button key={t.id} type="button" aria-pressed={on}
                    onClick={() => save({ tagIds: on ? app.tagIds.filter((x) => x !== t.id) : [...app.tagIds, t.id] })}
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
            <form className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!ivDraft.scheduledAt) return;
                void s.addInterview({ applicationId: app.id, roundType: ivDraft.roundType,
                  scheduledAt: new Date(ivDraft.scheduledAt).toISOString(),
                  locationOrLink: ivDraft.locationOrLink || undefined });
                setIvDraft({ roundType: "phone", scheduledAt: "", locationOrLink: "" });
              }}>
              <div><label htmlFor="iv-type" className={label}>Round</label>
                <select id="iv-type" value={ivDraft.roundType} onChange={(e) => setIvDraft({ ...ivDraft, roundType: e.target.value as InterviewRound })} className={input}>
                  {(["phone", "technical", "panel", "final", "other"] as const).map((r) => <option key={r} value={r}>{r}</option>)}
                </select></div>
              <div><label htmlFor="iv-at" className={label}>When</label>
                <input id="iv-at" type="datetime-local" required value={ivDraft.scheduledAt} onChange={(e) => setIvDraft({ ...ivDraft, scheduledAt: e.target.value })} className={input} /></div>
              <Button type="submit" size="sm" aria-label="Add interview"><Plus className="h-3.5 w-3.5" aria-hidden /></Button>
            </form>
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
            <form className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!contactDraft.name.trim()) return;
                void s.addContact({ applicationId: app.id, name: contactDraft.name.trim(),
                  role: contactDraft.role || undefined, email: contactDraft.email || undefined });
                setContactDraft({ name: "", role: "", email: "" });
              }}>
              <div className="flex-1"><label htmlFor="c-name" className={label}>Name</label>
                <input id="c-name" required value={contactDraft.name} onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })} className={input} /></div>
              <div className="flex-1"><label htmlFor="c-email" className={label}>Email</label>
                <input id="c-email" type="email" value={contactDraft.email} onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} className={input} /></div>
              <Button type="submit" size="sm" aria-label="Add contact"><Plus className="h-3.5 w-3.5" aria-hidden /></Button>
            </form>
          </section>

          <section aria-label="Notes">
            <h3 className={sectionTitle}>Notes</h3>
            <form className="mb-3 flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!noteDraft.trim()) return;
                void s.addNote(app.id, noteDraft.trim());
                setNoteDraft("");
              }}>
              <div className="flex-1"><label htmlFor="note" className={label}>Add a note</label>
                <textarea id="note" rows={2} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Interview questions, impressions, follow-up plan…" className={input} /></div>
              <Button type="submit" size="sm">Save</Button>
            </form>
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

        {confirmDelete && (
          <div className="sticky bottom-0 border-t border-line-2 bg-surface px-6 py-4">
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
