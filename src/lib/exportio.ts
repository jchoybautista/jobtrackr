import { z } from "zod";
import type { Snapshot } from "./types";

// CV builder data (profile/cvdocs) is intentionally excluded from JSON/CSV export.
type ExportSnapshot = Omit<Snapshot, "profile" | "cvdocs">;

const paletteKey = z.enum(["pink","peach","yellow","mint","sky","lavender","orchid","gray","sage","blush"]);

const snapshotSchema = z.object({
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
});

const fileSchema = z.object({ version: z.literal(1), exportedAt: z.string(), data: snapshotSchema });

export function toJson(snap: ExportSnapshot): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: snap }, null, 2);
}

export function fromJson(json: string): ExportSnapshot {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw new Error("Invalid file: not valid JSON."); }
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid JobTrackr export file: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
  }
  return parsed.data.data as ExportSnapshot;
}

const csvCell = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(snap: ExportSnapshot): string {
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
