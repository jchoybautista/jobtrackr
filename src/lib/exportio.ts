import { z } from "zod";
import type { Snapshot, Profile } from "./types";

const paletteKey = z.enum(["pink","peach","yellow","mint","sky","lavender","orchid","gray","sage","blush"]);

const cvContentSchema = z.object({
  fullName: z.string(), headline: z.string().optional(), email: z.string().optional(),
  phone: z.string().optional(), location: z.string().optional(),
  links: z.array(z.object({ id: z.string(), label: z.string(), url: z.string() })),
  summary: z.string().optional(),
  experience: z.array(z.object({ id: z.string(), role: z.string(), company: z.string(),
    location: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional(),
    bullets: z.array(z.string()) })),
  education: z.array(z.object({ id: z.string(), school: z.string(), degree: z.string().optional(),
    field: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional(),
    notes: z.string().optional() })),
  skills: z.array(z.object({ id: z.string(), name: z.string(), skills: z.array(z.string()) })),
  projects: z.array(z.object({ id: z.string(), name: z.string(), url: z.string().optional(),
    description: z.string().optional(), bullets: z.array(z.string()) })),
  certifications: z.array(z.object({ id: z.string(), name: z.string(), issuer: z.string().optional(), date: z.string().optional() })),
  languages: z.array(z.object({ id: z.string(), name: z.string(), level: z.string().optional() })),
  awards: z.array(z.object({ id: z.string(), name: z.string(), issuer: z.string().optional(), date: z.string().optional() })),
  volunteer: z.array(z.object({ id: z.string(), role: z.string(), org: z.string(),
    startDate: z.string().optional(), endDate: z.string().optional(), description: z.string().optional() })),
  interests: z.string().optional(),
  references: z.array(z.object({ id: z.string(), name: z.string(), role: z.string().optional(),
    company: z.string().optional(), email: z.string().optional(), phone: z.string().optional() })),
  referencesOnRequest: z.boolean(),
});

const cvDocSchema = z.object({
  id: z.string(), name: z.string(), templateId: z.enum(["classic", "modern", "elegant"]),
  accent: paletteKey, showPhoto: z.boolean(), content: cvContentSchema,
  sections: z.array(z.object({ key: z.enum([
    "summary","experience","education","skills","projects","certifications",
    "languages","awards","volunteer","interests","references"]), visible: z.boolean() })),
  applicationId: z.string().optional(), createdAt: z.string(), updatedAt: z.string(),
});

const profileJsonSchema = z.object({
  id: z.literal("singleton"), content: cvContentSchema, updatedAt: z.string(),
  photoBase64: z.string().optional(), photoType: z.string().optional(),
});

const baseSnapshotShape = {
  stages: z.array(z.object({
    id: z.string(), name: z.string(), color: paletteKey,
    order: z.number(), kind: z.enum(["pipeline", "won", "lost"]),
  })),
  applications: z.array(z.object({
    id: z.string(), company: z.string(), role: z.string(),
    location: z.string().optional(), workMode: z.enum(["remote","hybrid","onsite"]).optional(),
    salaryMin: z.number().optional(), salaryMax: z.number().optional(),
    currency: z.string().optional(),
    url: z.string().refine((u) => /^https?:\/\//.test(u), "URL must start with http:// or https://").optional(),
    source: z.string().optional(),
    jdSnapshot: z.string().optional(), tagIds: z.array(z.string()), stageId: z.string(),
    order: z.number(), appliedAt: z.string().optional(),
    createdAt: z.string(), updatedAt: z.string(), archived: z.boolean().optional(),
  })),
  tags: z.array(z.object({ id: z.string(), name: z.string(), preset: z.boolean() })),
  interviews: z.array(z.object({
    id: z.string(), applicationId: z.string(),
    roundType: z.enum(["phone","technical","panel","final","other"]),
    scheduledAt: z.string(), locationOrLink: z.string().optional(), notes: z.string().optional(),
  })),
  contacts: z.array(z.object({
    id: z.string(), applicationId: z.string(), name: z.string(),
    role: z.string().optional(), email: z.string().optional(), linkedin: z.string().optional(),
  })),
  events: z.array(z.object({
    id: z.string(), applicationId: z.string(),
    kind: z.enum(["created","stage_move","edit","note","manual"]),
    message: z.string(), at: z.string(),
  })),
  notes: z.array(z.object({
    id: z.string(), applicationId: z.string(), body: z.string(),
    createdAt: z.string(), updatedAt: z.string(),
  })),
  reminders: z.array(z.object({
    id: z.string(), applicationId: z.string().optional(),
    type: z.enum(["follow_up","interview","custom"]), title: z.string(),
    dueAt: z.string(), done: z.boolean(), snoozedUntil: z.string().optional(),
  })),
  settings: z.object({
    id: z.literal("singleton"), nudgeDays: z.number(), currency: z.string(),
    theme: z.literal("light"), demo: z.boolean(),
  }),
};

// Version 1: no cv fields (profile/cvdocs).
const v1SnapshotSchema = z.object(baseSnapshotShape);
const v1FileSchema = z.object({ version: z.literal(1), exportedAt: z.string(), data: v1SnapshotSchema });

// Version 2: adds profile (photo as base64) + cvdocs.
const v2SnapshotSchema = z.object({
  ...baseSnapshotShape,
  profile: profileJsonSchema.nullable(),
  cvdocs: z.array(cvDocSchema),
});
const v2FileSchema = z.object({ version: z.literal(2), exportedAt: z.string(), data: v2SnapshotSchema });

type ProfileJson = z.infer<typeof profileJsonSchema>;

function decodeProfile(p: ProfileJson): Profile {
  const { photoBase64, photoType, ...rest } = p;
  if (!photoBase64) return rest;
  const bytes = Uint8Array.from(atob(photoBase64), (c) => c.charCodeAt(0));
  return { ...rest, photo: new Blob([bytes], { type: photoType }) };
}

export async function toJson(snap: Snapshot): Promise<string> {
  const { profile, ...rest } = snap;
  let profileJson: ProfileJson | null = null;
  if (profile) {
    const { photo, ...p } = profile;
    if (photo) {
      const buf = new Uint8Array(await photo.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) {
        bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      }
      profileJson = { ...p, photoBase64: btoa(bin), photoType: photo.type };
    } else {
      profileJson = p;
    }
  }
  return JSON.stringify({
    version: 2, exportedAt: new Date().toISOString(),
    data: { ...rest, profile: profileJson },
  }, null, 2);
}

export function fromJson(json: string): Snapshot {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw new Error("Invalid file: not valid JSON."); }

  // Version 1 files predate the CV builder — default profile/cvdocs.
  if (typeof raw === "object" && raw !== null && (raw as { version?: unknown }).version === 1) {
    const parsed = v1FileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid JobTrackr export file: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
    }
    return { ...parsed.data.data, profile: null, cvdocs: [] };
  }

  const parsed = v2FileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid JobTrackr export file: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
  }
  const { profile, ...rest } = parsed.data.data;
  return { ...rest, profile: profile ? decodeProfile(profile) : null };
}

const csvCell = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(snap: Snapshot): string {
  const stageName = new Map(snap.stages.map((s) => [s.id, s.name]));
  const tagName = new Map(snap.tags.map((t) => [t.id, t.name]));
  const header = "Company,Role,Stage,Tags,Location,Work mode,Salary min,Salary max,Currency,Source,URL,Applied at,Created at";
  const rows = snap.applications.map((a) => [
    a.company, a.role, stageName.get(a.stageId) ?? "",
    a.tagIds.map((t) => tagName.get(t) ?? "").filter(Boolean).join("; "),
    a.location, a.workMode, a.salaryMin, a.salaryMax, a.currency,
    a.source, a.url, a.appliedAt, a.createdAt,
  ].map(csvCell).join(","));
  return [header, ...rows].join("\n");
}
