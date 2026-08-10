import type { Application, Stage } from "./types";

export type Outcome = "active" | "won" | "lost";
export type SortKey = "company" | "role" | "status" | "source" | "salary" | "applied" | "silent";

const DAY = 86_400_000;
const outcomeOf = (stage: Stage | undefined): Outcome | undefined =>
  stage?.kind === "won" ? "won" : stage?.kind === "lost" ? "lost" : stage?.kind === "pipeline" ? "active" : undefined;

export function filterByStatus(
  apps: Application[], stageIds: string[], outcomes: Outcome[], stages: Stage[],
): Application[] {
  const byId = new Map(stages.map((s) => [s.id, s]));
  return apps.filter((a) => {
    if (stageIds.length && !stageIds.includes(a.stageId)) return false;
    if (outcomes.length) {
      const o = outcomeOf(byId.get(a.stageId));
      if (!o || !outcomes.includes(o)) return false;
    }
    return true;
  });
}

export function sortApplications(
  apps: Application[], key: SortKey, dir: "asc" | "desc", stages: Stage[], nowIso: string,
): Application[] {
  const byId = new Map(stages.map((s) => [s.id, s]));
  const now = Date.parse(nowIso);
  const salaryOf = (a: Application) => a.salaryMax ?? a.salaryMin ?? -Infinity;
  const appliedOf = (a: Application) => Date.parse(a.appliedAt ?? a.createdAt);
  const silentOf = (a: Application) => (now - Date.parse(a.updatedAt)) / DAY;
  const cmp = (a: Application, b: Application): number => {
    switch (key) {
      case "company": return a.company.localeCompare(b.company);
      case "role": return a.role.localeCompare(b.role);
      case "status": return (byId.get(a.stageId)?.order ?? 0) - (byId.get(b.stageId)?.order ?? 0);
      case "source": return (a.source ?? "").localeCompare(b.source ?? "");
      case "salary": return salaryOf(a) - salaryOf(b);
      case "applied": return appliedOf(a) - appliedOf(b);
      case "silent": return silentOf(a) - silentOf(b);
    }
  };
  const sorted = [...apps].sort(cmp);
  return dir === "asc" ? sorted : sorted.reverse();
}
