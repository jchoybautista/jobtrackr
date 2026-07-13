"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { newId } from "@/lib/id";
import type { ProfileLink } from "@/cv/types";
import { EntryShell, Field, replaceAt, removeAt, moveItem, type ContentFormProps } from "../form-kit";

export function ContactForm({ content, onChange }: ContentFormProps) {
  const links = content.links;
  const patchLink = (i: number, patch: Partial<ProfileLink>) =>
    onChange({ links: replaceAt(links, i, { ...links[i], ...patch }) });

  return (
    <div className="flex flex-col gap-3">
      <Field id="contact-fullName" label="Full name" value={content.fullName}
        onCommit={(v) => onChange({ fullName: v })} placeholder="Alex Rivera" />
      <Field id="contact-headline" label="Headline" value={content.headline ?? ""}
        onCommit={(v) => onChange({ headline: v })} placeholder="Senior Product Designer" />
      <div className="grid grid-cols-2 gap-3">
        <Field id="contact-email" label="Email" type="email" value={content.email ?? ""}
          onCommit={(v) => onChange({ email: v })} />
        <Field id="contact-phone" label="Phone" type="tel" value={content.phone ?? ""}
          onCommit={(v) => onChange({ phone: v })} />
      </div>
      <Field id="contact-location" label="Location" value={content.location ?? ""}
        onCommit={(v) => onChange({ location: v })} placeholder="Manila, PH" />

      {links.map((link, i) => (
        <EntryShell key={link.id} title={link.label || "Link"}
          onRemove={() => onChange({ links: removeAt(links, i) })}
          onMoveUp={i > 0 ? () => onChange({ links: moveItem(links, i, i - 1) }) : undefined}
          onMoveDown={i < links.length - 1 ? () => onChange({ links: moveItem(links, i, i + 1) }) : undefined}>
          <div className="grid grid-cols-2 gap-3">
            <Field id={`link-${link.id}-label`} label="Label" value={link.label}
              onCommit={(v) => patchLink(i, { label: v })} placeholder="Portfolio" />
            <Field id={`link-${link.id}-url`} label="URL" type="url" value={link.url}
              onCommit={(v) => patchLink(i, { url: v })} placeholder="https://…" />
          </div>
        </EntryShell>
      ))}
      <Button type="button" variant="secondary" size="sm" className="self-start"
        onClick={() => onChange({ links: [...links, { id: newId(), label: "", url: "" }] })}>
        <Plus className="h-3.5 w-3.5" aria-hidden /> Add link
      </Button>
    </div>
  );
}
