import type React from "react";
import type { CvContent, CvSection, SectionKey, TemplateId } from "@/cv/types";

export interface TemplateProps {
  content: CvContent;
  sections: CvSection[];
  accent: string;
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
export const TEMPLATES: CvTemplate[] = [];

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
