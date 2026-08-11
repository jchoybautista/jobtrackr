"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import {
  emptyCvContent, DEFAULT_SECTIONS, SECTION_LABELS,
  type CvContent,
} from "@/cv/types";
import { CONTENT_FORMS, ContactForm } from "./content-forms";
import { PhotoUpload } from "./PhotoUpload";

export function ProfileEditorPage({ accountEmail }: { accountEmail: string | null }) {
  const profile = useApp((s) => s.profile);
  const saveProfile = useApp((s) => s.saveProfile);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live view of the master content — uncontrolled fields commit on blur.
  // Nobody has saved a profile yet: default to only what account creation
  // actually collected (an email), not the fuller shape a saved profile has.
  // Once anything is saved, `content` comes from `profile` from then on, so
  // this never overwrites a real edit — including a deliberately blanked email.
  const content = profile?.content ??
    { ...emptyCvContent(), ...(accountEmail ? { email: accountEmail } : {}) };

  function handleChange(patch: Partial<CvContent>) {
    void saveProfile({ ...content, ...patch });
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1600);
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6 pb-16 lg:px-7">
      <Link
        href="/cv"
        className="inline-flex items-center gap-1.5 rounded-full text-sm font-semibold text-ink-2 hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to CV Builder
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Master Profile</h1>
          <p className="text-sm text-ink-3">Every CV starts as a copy of this. Changes save automatically.</p>
        </div>
        <p
          aria-live="polite"
          className={`inline-flex items-center gap-1 text-sm font-semibold text-success transition-opacity duration-300 ${
            savedFlash ? "opacity-100" : "opacity-0"
          }`}
        >
          {savedFlash && (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden /> Saved
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <section aria-label="Contact details" className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-ink">Contact details</h2>
          <PhotoUpload />
          <ContactForm content={content} onChange={handleChange} />
        </section>

        {DEFAULT_SECTIONS.map(({ key }) => {
          const Form = CONTENT_FORMS[key];
          return (
            <section key={key} aria-label={SECTION_LABELS[key]} className="flex flex-col gap-4">
              <h2 className="text-base font-bold text-ink">{SECTION_LABELS[key]}</h2>
              <Form content={content} onChange={handleChange} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
