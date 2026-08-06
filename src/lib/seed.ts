import { db } from "./db";
import {
  DEFAULT_SETTINGS, deleteApplication, importSnapshot, loadAll, putSettings,
} from "./repo";
import type { Application, Stage, Tag, Snapshot } from "./types";

export const DEFAULT_STAGES: Stage[] = [
  { id: "stage-saved", name: "Saved", color: "lavender", order: 0, kind: "pipeline", role: "saved", pinned: true },
  { id: "stage-screening", name: "Screening", color: "sky", order: 1, kind: "pipeline", role: "screening" },
  { id: "stage-interview", name: "Interview", color: "yellow", order: 2, kind: "pipeline", role: "interview" },
  { id: "stage-technical", name: "Technical", color: "peach", order: 3, kind: "pipeline", role: "technical" },
  { id: "stage-final", name: "Final interview", color: "orchid", order: 4, kind: "pipeline", role: "final" },
  { id: "stage-rejected", name: "Rejected", color: "gray", order: 5, kind: "lost", role: "rejected" },
  { id: "stage-offer", name: "Offer", color: "mint", order: 6, kind: "won", role: "offer", pinned: true },
];

export const PRESET_TAGS: Tag[] = [
  { id: "tag-dream", name: "Dream job", preset: true },
  { id: "tag-high", name: "High priority", preset: true },
  { id: "tag-low", name: "Low priority", preset: true },
  { id: "tag-remote", name: "Remote", preset: true },
  { id: "tag-referral", name: "Referral", preset: true },
  { id: "tag-onsite", name: "Onsite", preset: true },
];

const daysAgo = (now: Date, n: number) =>
  new Date(now.getTime() - n * 86_400_000).toISOString();
const daysAhead = (now: Date, n: number) =>
  new Date(now.getTime() + n * 86_400_000).toISOString();

function demoApp(
  now: Date, id: string, company: string, role: string, stageId: string,
  order: number, extra: Partial<Application> = {},
): Application {
  return {
    id: `demo-${id}`, company, role, tagIds: [], stageId, order,
    createdAt: daysAgo(now, 14), updatedAt: daysAgo(now, 2), ...extra,
  };
}

export async function seedIfEmpty(now: Date = new Date()): Promise<boolean> {
  const count = await db.stages.count();
  if (count > 0) return false;

  const applications: Application[] = [
    demoApp(now, "vercel", "Vercel", "UX Engineer", "stage-saved", 0,
      { location: "Remote", workMode: "remote", tagIds: ["tag-remote"], jdSnapshot: "Vercel is looking for a UX Engineer to craft polished product surfaces…" }),
    demoApp(now, "framer", "Framer", "Design Engineer", "stage-saved", 1, { location: "Amsterdam" }),
    demoApp(now, "stripe", "Stripe", "Product Designer", "stage-screening", 0,
      { location: "Remote", workMode: "remote", salaryMin: 120000, salaryMax: 140000, currency: "USD", source: "LinkedIn", tagIds: ["tag-dream"], appliedAt: daysAgo(now, 8) }),
    demoApp(now, "linear", "Linear", "Frontend Engineer", "stage-screening", 1,
      { location: "Hybrid · SF", workMode: "hybrid", source: "Referral", tagIds: ["tag-referral"], appliedAt: daysAgo(now, 9), updatedAt: daysAgo(now, 9) }),
    demoApp(now, "canva", "Canva", "Software Engineer", "stage-interview", 0,
      { location: "Manila", workMode: "onsite", source: "JobStreet", tagIds: ["tag-high"], appliedAt: daysAgo(now, 12) }),
    demoApp(now, "shopify", "Shopify", "Web Developer", "stage-offer", 0,
      { location: "Remote", workMode: "remote", salaryMin: 135000, currency: "USD", tagIds: ["tag-dream"], appliedAt: daysAgo(now, 20) }),
    demoApp(now, "grab", "Grab", "iOS Developer", "stage-rejected", 0,
      { location: "Singapore", appliedAt: daysAgo(now, 25) }),
  ];

  const snap: Snapshot = {
    stages: DEFAULT_STAGES,
    tags: PRESET_TAGS,
    applications,
    interviews: [{
      id: "demo-int-1", applicationId: "demo-canva", roundType: "technical",
      scheduledAt: daysAhead(now, 3), locationOrLink: "Google Meet",
    }],
    contacts: [{
      id: "demo-contact-1", applicationId: "demo-stripe", name: "Alex Rivera",
      role: "Recruiter", email: "alex@stripe.com",
    }],
    events: applications.map((a, i) => ({
      id: `demo-ev-${i}`, applicationId: a.id, kind: "created" as const,
      message: "Application created", at: a.createdAt,
    })),
    notes: [],
    reminders: [{
      id: "demo-rem-1", applicationId: "demo-linear", type: "follow_up",
      title: "Follow up with Linear", dueAt: daysAgo(now, 1), done: false,
    }],
    settings: { ...DEFAULT_SETTINGS, demo: true },
    profile: null, cvdocs: [],
  };
  await importSnapshot(snap, "replace");
  return true;
}

export async function clearDemoData(): Promise<void> {
  const snap = await loadAll();
  for (const a of snap.applications.filter((a) => a.id.startsWith("demo-"))) {
    await deleteApplication(a.id);
  }
  await putSettings({ ...snap.settings, demo: false });
}
