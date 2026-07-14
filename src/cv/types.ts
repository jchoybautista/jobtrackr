export interface ProfileLink { id: string; label: string; url: string }
export interface ExperienceEntry { id: string; role: string; company: string; location?: string; startDate?: string; endDate?: string; bullets: string[] }
export interface EducationEntry { id: string; school: string; degree?: string; field?: string; startDate?: string; endDate?: string; notes?: string }
export interface SkillGroup { id: string; name: string; skills: string[] }
export interface ProjectEntry { id: string; name: string; url?: string; description?: string; bullets: string[] }
export interface CertEntry { id: string; name: string; issuer?: string; date?: string }
export interface LanguageEntry { id: string; name: string; level?: string }
export interface AwardEntry { id: string; name: string; issuer?: string; date?: string }
export interface VolunteerEntry { id: string; role: string; org: string; startDate?: string; endDate?: string; description?: string }
export interface ReferenceEntry { id: string; name: string; role?: string; company?: string; email?: string; phone?: string }

export interface CvContent {
  fullName: string; headline?: string; email?: string; phone?: string; location?: string;
  links: ProfileLink[]; summary?: string;
  experience: ExperienceEntry[]; education: EducationEntry[]; skills: SkillGroup[];
  projects: ProjectEntry[]; certifications: CertEntry[]; languages: LanguageEntry[];
  awards: AwardEntry[]; volunteer: VolunteerEntry[]; interests?: string;
  references: ReferenceEntry[]; referencesOnRequest: boolean;
}

export type SectionKey =
  | "summary" | "experience" | "education" | "skills" | "projects"
  | "certifications" | "languages" | "awards" | "volunteer" | "interests" | "references";

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Professional Summary", experience: "Work Experience", education: "Education",
  skills: "Skills", projects: "Projects", certifications: "Certifications",
  languages: "Languages", awards: "Awards", volunteer: "Volunteer Experience",
  interests: "Interests", references: "References",
};

export interface CvSection { key: SectionKey; visible: boolean }
export const DEFAULT_SECTIONS: CvSection[] = [
  { key: "summary", visible: true }, { key: "skills", visible: true },
  { key: "experience", visible: true }, { key: "education", visible: true },
  { key: "projects", visible: true }, { key: "certifications", visible: false },
  { key: "languages", visible: false }, { key: "awards", visible: false },
  { key: "volunteer", visible: false }, { key: "interests", visible: false },
  { key: "references", visible: false },
];

export type TemplateId = "classic" | "modern" | "elegant";

/**
 * react-pdf-FREE template metadata (display name + ATS-safety flag).
 * Lives here — a module with no react-pdf dependency — so Board/Dashboard code
 * can read a template's name without pulling the ~1.4MB @react-pdf/renderer
 * chunk. The full TEMPLATES registry (src/cv/templates) mirrors these values.
 */
export const TEMPLATE_META: Record<TemplateId, { name: string; atsSafe: boolean }> = {
  classic: { name: "Classic", atsSafe: true },
  modern: { name: "Modern", atsSafe: false },
  elegant: { name: "Elegant", atsSafe: false },
};

export interface Profile { id: "singleton"; content: CvContent; photo?: Blob; updatedAt: string }

export interface CvDoc {
  id: string; name: string; templateId: TemplateId;
  accent: import("@/lib/types").PaletteKey; showPhoto: boolean;
  content: CvContent; sections: CvSection[];
  applicationId?: string; createdAt: string; updatedAt: string;
}

export function emptyCvContent(): CvContent {
  return {
    fullName: "", links: [], experience: [], education: [], skills: [],
    projects: [], certifications: [], languages: [], awards: [],
    volunteer: [], references: [], referencesOnRequest: false,
  };
}
