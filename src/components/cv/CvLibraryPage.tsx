"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Copy, Download, Trash2, UserPen, FileText } from "lucide-react";
import { useApp } from "@/lib/store";
import { getTemplate } from "@/cv/templates";
import { downloadCv } from "@/cv/pdf";
import { PALETTE } from "@/lib/palette";
import { relativeDays } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Toast";
import { MiniMock, AtsBadge } from "./MiniMock";
import { NewCvDialog } from "./NewCvDialog";
import type { CvDoc, Profile } from "@/cv/types";

const pillBase =
  "inline-flex items-center justify-center gap-1.5 rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer";
const linkSecondaryMd = `${pillBase} border border-line bg-surface text-ink hover:bg-sunken text-sm font-semibold px-5 h-10`;
const linkPrimaryMd = `${pillBase} bg-ink text-white hover:opacity-85 text-sm font-semibold px-5 h-10`;
const linkSecondarySm = `${pillBase} flex-1 border border-line bg-surface text-ink hover:bg-sunken text-xs font-semibold px-3.5 h-8`;

function CvCard({ cv, profile }: { cv: CvDoc; profile: Profile | null }) {
  const { applications, updateCv, duplicateCv } = useApp();
  const [busy, setBusy] = useState(false);
  const template = getTemplate(cv.templateId);
  const linkedApp = cv.applicationId ? applications.find((a) => a.id === cv.applicationId) : null;
  const nowIso = new Date().toISOString();

  function commitName(value: string) {
    const next = value.trim();
    if (next && next !== cv.name) void updateCv(cv.id, { name: next });
  }

  async function handleDownload() {
    setBusy(true);
    const photoUrl = profile?.photo ? URL.createObjectURL(profile.photo) : undefined;
    try {
      await downloadCv(cv, photoUrl);
      toast(`“${cv.name}” downloaded`, "success");
    } catch {
      toast("Could not generate PDF", "error");
    } finally {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setBusy(false);
    }
  }

  async function handleDuplicate() {
    const copy = await duplicateCv(cv.id);
    if (copy) toast(`“${copy.name}” created`, "success");
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line-2 bg-surface p-4">
      <Link href={`/cv/${cv.id}`} aria-label={`Edit ${cv.name}`}>
        <MiniMock templateId={cv.templateId} accent={PALETTE[cv.accent].hex} className="w-full" />
      </Link>

      <div className="flex flex-col gap-1">
        <input
          defaultValue={cv.name}
          aria-label="CV name"
          onBlur={(e) => commitName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          className="w-full rounded-lg bg-transparent px-1 py-0.5 text-sm font-bold hover:bg-sunken focus:bg-sunken focus:outline-2 focus:outline-ink"
        />
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs text-ink-3">{template.name}</span>
          <AtsBadge atsSafe={template.atsSafe} />
        </div>
        <p className="px-1 text-xs text-ink-3">
          {linkedApp ? `${linkedApp.company} · ` : ""}Updated {relativeDays(cv.updatedAt, nowIso)}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Link href={`/cv/${cv.id}`} className={linkSecondarySm}>
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
        </Link>
        <Button variant="ghost" size="sm" onClick={handleDuplicate} aria-label={`Duplicate ${cv.name}`}>
          <Copy className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload} disabled={busy} aria-label={`Download ${cv.name} as PDF`}>
          <Download className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <DeleteCvButton cv={cv} />
      </div>
    </li>
  );
}

function DeleteCvButton({ cv }: { cv: CvDoc }) {
  const removeCv = useApp((s) => s.removeCv);
  const [open, setOpen] = useState(false);

  async function confirm() {
    await removeCv(cv.id);
    setOpen(false);
    toast(`“${cv.name}” deleted`, "info");
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Delete ${cv.name}`}>
        <Trash2 className="h-3.5 w-3.5 text-danger" aria-hidden />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete CV" maxWidth="max-w-sm">
        <p className="mb-5 text-sm text-ink-2">
          Delete “{cv.name}”? This can’t be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirm}>Delete</Button>
        </div>
      </Dialog>
    </>
  );
}

export function CvLibraryPage() {
  const { cvdocs, profile } = useApp();
  const [newOpen, setNewOpen] = useState(false);
  const hasProfile = profile != null && profile.content.fullName.trim().length > 0;

  return (
    <div className="mx-auto max-w-5xl px-5 pt-6 lg:px-7">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">CV Builder</h1>
          <p className="text-xs text-ink-3">Tailored CVs from your master profile</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cv/profile" className={linkSecondaryMd}>
            <UserPen className="h-4 w-4" aria-hidden /> Edit profile
          </Link>
          <Button onClick={() => setNewOpen(true)} disabled={!hasProfile}>
            <Plus className="h-4 w-4" aria-hidden /> New CV
          </Button>
        </div>
      </div>

      {!hasProfile ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-ink-3" aria-hidden />
          <h2 className="text-base font-bold">Set up your profile first</h2>
          <p className="mx-auto mt-1 mb-5 max-w-md text-sm text-ink-3">
            Your master profile holds your experience, skills, and education. Every CV starts as a copy of it.
          </p>
          <Link href="/cv/profile" className={linkPrimaryMd}>
            <UserPen className="h-4 w-4" aria-hidden /> Set up profile
          </Link>
        </div>
      ) : cvdocs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-ink-3" aria-hidden />
          <h2 className="text-base font-bold">Create your first CV</h2>
          <p className="mx-auto mt-1 mb-5 max-w-md text-sm text-ink-3">
            Pick a template and give it a name — you can tailor the content per role afterwards.
          </p>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden /> New CV
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 pb-8 sm:grid-cols-2 lg:grid-cols-3">
          {cvdocs.map((cv) => <CvCard key={cv.id} cv={cv} profile={profile} />)}
        </ul>
      )}

      <NewCvDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
