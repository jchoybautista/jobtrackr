import type { ActivityEvent, Application, Snapshot, Stage } from "./types";
import { DEFAULT_STAGES } from "./seed";

const DEFAULT_IDS = new Set(DEFAULT_STAGES.map((s) => s.id));

export function needsMigration(snap: Snapshot): boolean {
  const stagesUnstamped = !snap.stages.some((s) => s.role);
  const settingsMissing = typeof snap.settings.ghostDays !== "number";
  return stagesUnstamped || settingsMissing;
}

function migrateStages(existing: Stage[]): Stage[] {
  // Canonical defaults, preserving any existing color for matched ids.
  const canonical: Stage[] = DEFAULT_STAGES.map((d) => {
    const match = existing.find((e) => e.id === d.id);
    return match ? { ...d, color: match.color } : { ...d };
  });
  // Legacy custom stages (roleless, non-default ids), kept in their existing order.
  const customs = existing
    .filter((e) => !DEFAULT_IDS.has(e.id))
    .sort((a, b) => a.order - b.order)
    .map((e) => ({ ...e, role: undefined, pinned: undefined }));

  const rejectedIdx = canonical.findIndex((s) => s.role === "rejected");
  const withCustoms = [
    ...canonical.slice(0, rejectedIdx),
    ...customs,
    ...canonical.slice(rejectedIdx),
  ];
  return withCustoms.map((s, i) => ({ ...s, order: i }));
}

export function backfillFurthest(
  app: Application, events: ActivityEvent[], stages: Stage[],
): string | undefined {
  const names = new Map(stages.map((s) => [s.name, s]));
  const candidates: Stage[] = [];
  const current = stages.find((s) => s.id === app.stageId);
  if (current) candidates.push(current);
  for (const ev of events) {
    if (ev.applicationId !== app.id || ev.kind !== "stage_move") continue;
    const name = ev.message.replace(/^Moved to /, "");
    const st = names.get(name);
    if (st) candidates.push(st);
  }
  const deepest = candidates
    .filter((s) => s.kind === "pipeline")
    .sort((a, b) => b.order - a.order)[0];
  return deepest?.id;
}

export function migrateSnapshot(snap: Snapshot): Snapshot {
  const stages = migrateStages(snap.stages);
  const applications = snap.applications.map((a) => ({
    ...a, furthestStageId: backfillFurthest(a, snap.events, stages),
  }));
  const settings = {
    ...snap.settings,
    ghostDays: typeof snap.settings.ghostDays === "number" ? snap.settings.ghostDays : 14,
  };
  return { ...snap, stages, applications, settings };
}
