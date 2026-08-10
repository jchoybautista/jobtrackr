import type { Application, Stage, StageRole } from "./types";

export function stageByRole(stages: Stage[], role: StageRole): Stage | undefined {
  return stages.find((s) => s.role === role);
}

export function orderOfRole(stages: Stage[], role: StageRole): number | undefined {
  return stageByRole(stages, role)?.order;
}

export function furthestOrderOf(app: Application, stages: Stage[]): number {
  const byId = (id: string | undefined) => (id ? stages.find((s) => s.id === id) : undefined);
  const furthest = byId(app.furthestStageId);
  if (furthest && furthest.kind === "pipeline") return furthest.order;
  const current = byId(app.stageId);
  if (current && current.kind === "pipeline") return current.order;
  return -1;
}

export function nextFurthestStageId(
  app: Application, toStage: Stage, stages: Stage[],
): string | undefined {
  if (toStage.kind !== "pipeline") return app.furthestStageId;
  const currentOrder = app.furthestStageId
    ? stages.find((s) => s.id === app.furthestStageId)?.order ?? -1
    : -1;
  return toStage.order > currentOrder ? toStage.id : app.furthestStageId;
}

export function applyFurthestOnMove(
  app: Application, toStageId: string, stages: Stage[],
): Application {
  const toStage = stages.find((s) => s.id === toStageId);
  if (!toStage) return app;
  return { ...app, furthestStageId: nextFurthestStageId(app, toStage, stages) };
}
