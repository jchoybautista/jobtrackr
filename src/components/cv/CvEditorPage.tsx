"use client";

import Link from "next/link";
import { ArrowLeft, FileQuestion, FileText } from "lucide-react";
import { useApp } from "@/lib/store";
import { SECTION_LABELS, type CvContent, type CvSection } from "@/cv/types";
import { CONTENT_FORMS, ContactForm } from "./content-forms";
import { SectionRail } from "./SectionRail";

const backLink =
  "inline-flex items-center gap-1.5 rounded-full text-xs font-semibold text-ink-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink";

export function CvEditorPage({ id }: { id: string }) {
  const cv = useApp((s) => s.cvdocs.find((c) => c.id === id));
  const updateCv = useApp((s) => s.updateCv);
  const updateCvContent = useApp((s) => s.updateCvContent);
  const setCvSections = useApp((s) => s.setCvSections);

  // AppShell already gates children on hydration, so a missing cv here is a
  // genuine unknown id — not a pre-load flash.
  if (!cv) {
    return (
      <div className="mx-auto max-w-md px-5 pt-16 text-center">
        <FileQuestion className="mx-auto mb-3 h-8 w-8 text-ink-3" aria-hidden />
        <h1 className="text-lg font-bold">CV not found</h1>
        <p className="mx-auto mt-1 mb-5 max-w-xs text-sm text-ink-3">
          This CV doesn’t exist or was deleted.
        </p>
        <Link href="/cv" className={backLink}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to CV Builder
        </Link>
      </div>
    );
  }

  const content = cv.content;
  const handleContent = (patch: Partial<CvContent>) => void updateCvContent(cv.id, patch);
  const handleSections = (sections: CvSection[]) => void setCvSections(cv.id, sections);

  function commitName(value: string) {
    const next = value.trim();
    if (next && next !== cv!.name) void updateCv(cv!.id, { name: next });
  }

  return (
    <div className="lg:flex lg:h-dvh">
      {/* Left pane — 480px, scrolls independently on desktop */}
      <div className="flex flex-col gap-6 px-5 pt-6 pb-16 lg:w-[480px] lg:shrink-0 lg:overflow-y-auto lg:px-6">
        <div className="flex flex-col gap-3">
          <Link href="/cv" className={backLink}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to CV Builder
          </Link>
          <label htmlFor="cv-name" className="sr-only">CV name</label>
          <input
            key={cv.id}
            id="cv-name"
            defaultValue={cv.name}
            onBlur={(e) => commitName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="w-full rounded-lg bg-transparent px-1 py-0.5 text-2xl font-extrabold tracking-tight hover:bg-sunken focus:bg-sunken focus:outline-2 focus:outline-ink"
          />
        </div>

        {/* Keyed by cv.id so uncontrolled defaultValue fields reset when the
            document changes (Task 8 review requirement). */}
        <div key={cv.id} className="flex flex-col gap-8">
          <section aria-label="Contact details" className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-ink">Contact details</h2>
            <ContactForm content={content} onChange={handleContent} />
          </section>

          <section aria-label="Sections" className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-bold text-ink">Sections</h2>
              <p className="text-xs text-ink-3">Toggle visibility and reorder how they appear.</p>
            </div>
            <SectionRail sections={cv.sections} onChange={handleSections} />
          </section>

          {cv.sections.filter((s) => s.visible).map(({ key }) => {
            const Form = CONTENT_FORMS[key];
            return (
              <section key={key} aria-label={SECTION_LABELS[key]} className="flex flex-col gap-4">
                <h2 className="text-sm font-bold text-ink">{SECTION_LABELS[key]}</h2>
                <Form content={content} onChange={handleContent} />
              </section>
            );
          })}
        </div>
      </div>

      {/* Right pane — live preview placeholder (real react-pdf preview: Task 12) */}
      <div className="flex min-h-64 flex-1 items-center justify-center bg-sunken p-8 lg:h-dvh">
        <div className="text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-ink-3" aria-hidden />
          <p className="text-sm font-semibold text-ink-2">Preview loads here</p>
          <p className="mt-1 text-xs text-ink-3">Live A4 preview arrives in the next step.</p>
        </div>
      </div>
    </div>
  );
}
