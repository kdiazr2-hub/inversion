// What the app imports: the mission catalog (light, always loaded) and the on-demand loader of
// full missions. Scripts and tests that need every mission's content import ./full instead.
import { CATALOG } from "./catalog.generated";
import type { Mission, MissionMeta, WorldId } from "./types";
import { WORLDS } from "./worlds";

/** Every mission in curriculum order (catalog entries). */
export const MISSIONS: MissionMeta[] = CATALOG.missions;

export const missionById: Record<string, MissionMeta> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

export const missionsByWorld = (world: WorldId) => MISSIONS.filter((m) => m.world === world);

export { WORLDS };
export { loadedWorld, loadWorld } from "./load";

/** All stages of a progressive project, in order. */
export const seriesStages = (seriesId: string) =>
  MISSIONS.filter((m) => m.series?.id === seriesId).sort((a, b) => a.series!.stage - b.series!.stage);

/** Stage n − 1 of a progressive project (undefined for stage 1 and ordinary missions). */
export const previousStage = (m: Pick<MissionMeta, "series">): MissionMeta | undefined =>
  m.series && m.series.stage > 1 ? MISSIONS.find((x) => x.series?.id === m.series!.id && x.series.stage === m.series!.stage - 1) : undefined;

/**
 * Starting code of a stage: the code carried from the previous stage (the learner's, or the
 * reference solution of `prev`) followed by this stage's skeleton.
 */
export const stageStartCode = (m: Mission, prev: Mission | undefined, carried?: string): string => {
  if (!prev) return m.starter;
  return `${(carried ?? prev.solution).trimEnd()}\n\n${m.starter}`;
};

/** Short stage name from a stage title ("Proyecto · 2: tabla 1 y …" → "Tabla 1 y …"). */
export const stageLabel = (m: Pick<MissionMeta, "title">) => {
  const s = m.title.replace(/^.*?:\s*/, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
