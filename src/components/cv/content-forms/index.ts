import type { ComponentType } from "react";
import type { SectionKey } from "@/cv/types";
import type { ContentFormProps } from "../form-kit";
import { SummaryForm } from "./SummaryForm";
import { ExperienceForm } from "./ExperienceForm";
import { EducationForm } from "./EducationForm";
import { SkillsForm } from "./SkillsForm";
import {
  ProjectsForm, CertificationsForm, LanguagesForm, AwardsForm,
  VolunteerForm, InterestsForm, ReferencesForm,
} from "./SimpleListForms";

export type { ContentFormProps };
export { ContactForm } from "./ContactForm";
export { SummaryForm } from "./SummaryForm";
export { ExperienceForm } from "./ExperienceForm";
export { EducationForm } from "./EducationForm";
export { SkillsForm } from "./SkillsForm";
export {
  ProjectsForm, CertificationsForm, LanguagesForm, AwardsForm,
  VolunteerForm, InterestsForm, ReferencesForm,
} from "./SimpleListForms";

/** Every SectionKey maps to its editor form; `contact` is not a SectionKey —
 *  ContactForm is rendered separately by the editor pages. */
export const CONTENT_FORMS: Record<SectionKey, ComponentType<ContentFormProps>> = {
  summary: SummaryForm,
  experience: ExperienceForm,
  education: EducationForm,
  skills: SkillsForm,
  projects: ProjectsForm,
  certifications: CertificationsForm,
  languages: LanguagesForm,
  awards: AwardsForm,
  volunteer: VolunteerForm,
  interests: InterestsForm,
  references: ReferencesForm,
};
