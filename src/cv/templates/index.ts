import type React from "react";
import type { CvContent, CvSection, SectionKey, TemplateId } from "@/cv/types";
import { ClassicTemplate } from "./classic";
import { ElegantTemplate } from "./elegant";
import { ModernTemplate } from "./modern";

export interface TemplateProps {
  content: CvContent;
  sections: CvSection[];
  /** Darkened, text-safe accent — use for any accent-colored text. */
  accent: string;
  /** Raw pastel accent — decorative rules/fills only, never text. */
  accentSoft: string;
  photoUrl?: string;
}

export interface CvTemplate {
  id: TemplateId;
  name: string;
  atsSafe: boolean;
  note: string;
  render: (p: TemplateProps) => React.ReactElement;
}

/** Populated by Tasks 5–7 via TEMPLATES.push(...). */
export const TEMPLATES: CvTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    atsSafe: true,
    note: "Single column, standard headings — parses cleanly in every ATS.",
    render: ClassicTemplate,
  },
  {
    id: "modern",
    name: "Modern",
    atsSafe: false,
    note: "Two-column layout with photo — great for human readers; some ATS parsers struggle with columns.",
    render: ModernTemplate,
  },
  {
    id: "elegant",
    name: "Elegant",
    atsSafe: false,
    note: "Serif headings and generous whitespace — a quiet, premium read.",
    render: ElegantTemplate,
  },
];

export const getTemplate = (id: TemplateId): CvTemplate => TEMPLATES.find((t) => t.id === id)!;

/** True when the section's underlying content has something worth rendering. */
function hasContent(key: SectionKey, content: CvContent): boolean {
  switch (key) {
    case "summary":
      return !!content.summary && content.summary.trim().length > 0;
    case "interests":
      return !!content.interests && content.interests.trim().length > 0;
    case "references":
      return content.references.length > 0 || content.referencesOnRequest;
    case "experience":
      return content.experience.length > 0;
    case "education":
      return content.education.length > 0;
    case "skills":
      return content.skills.length > 0;
    case "projects":
      return content.projects.length > 0;
    case "certifications":
      return content.certifications.length > 0;
    case "languages":
      return content.languages.length > 0;
    case "awards":
      return content.awards.length > 0;
    case "volunteer":
      return content.volunteer.length > 0;
  }
}

/** Ordered visible section keys whose underlying content is non-empty. */
export function visibleSections(p: TemplateProps): SectionKey[] {
  return p.sections
    .filter((s) => s.visible && hasContent(s.key, p.content))
    .map((s) => s.key);
}
