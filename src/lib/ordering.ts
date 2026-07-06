import type { Application, Stage } from "./types";

export function moveCard(
  apps: Application[], appId: string, toStageId: string, toIndex: number, nowIso: string,
): Application[] {
  const moving = apps.find((a) => a.id === appId);
  if (!moving) return apps;
  const fromStageId = moving.stageId;

  const byOrder = (a: Application, b: Application) => a.order - b.order;
  const source = apps.filter((a) => a.stageId === fromStageId && a.id !== appId).sort(byOrder);
  const target = fromStageId === toStageId
    ? source
    : apps.filter((a) => a.stageId === toStageId).sort(byOrder);

  const idx = Math.max(0, Math.min(toIndex, target.length));
  const moved: Application = { ...moving, stageId: toStageId, updatedAt: nowIso };
  const newTarget = [...target.slice(0, idx), moved, ...target.slice(idx)];

  const updated = new Map<string, Application>();
  newTarget.forEach((a, i) => updated.set(a.id, { ...a, order: i }));
  if (fromStageId !== toStageId) {
    source.forEach((a, i) => updated.set(a.id, { ...a, order: i }));
  }
  return apps.map((a) => updated.get(a.id) ?? a);
}

export function reorderStages(stages: Stage[], stageId: string, toIndex: number): Stage[] {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const moving = sorted.find((s) => s.id === stageId);
  if (!moving) return stages;
  const rest = sorted.filter((s) => s.id !== stageId);
  const idx = Math.max(0, Math.min(toIndex, rest.length));
  const next = [...rest.slice(0, idx), moving, ...rest.slice(idx)];
  return next.map((s, i) => ({ ...s, order: i }));
}
