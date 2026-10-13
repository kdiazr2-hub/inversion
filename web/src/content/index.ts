import type { Mission, WorldId } from "./types";
import { WORLDS } from "./worlds";
import { W1_A } from "./missions/w1-basics-a";
import { W1_B } from "./missions/w1-basics-b";
import { W2 } from "./missions/w2-logic";
import { W3 } from "./missions/w3-data";
import { W4_A } from "./missions/w4-math-desc";
import { W4_MATH } from "./missions/w4-math-extra";
import { W4_B } from "./missions/w4-prob";
import { W4_C } from "./missions/w4-inference";
import { W4_COMP } from "./missions/w4-computational";
import { W6 } from "./missions/w6-ml";
import { W6_EXTRA } from "./missions/w6-ml-extra";
import { W7 } from "./missions/w7-ai";
import { W5 } from "./missions/w5-data-eng";
import { W8, W9 } from "./missions/w8-w9";

/** Every mission in curriculum order. New mission files only need to be added here. */
export const MISSIONS: Mission[] = [...W1_A, ...W1_B, ...W2, ...W3, ...W4_A, ...W4_MATH, ...W4_B, ...W4_C.filter((m) => m.kind !== "project"), ...W4_COMP, ...W4_C.filter((m) => m.kind === "project"), ...W5, ...W6.filter((m) => m.kind !== "project"), ...W6_EXTRA, ...W6.filter((m) => m.kind === "project"), ...W7, ...W8, ...W9];

export const missionById: Record<string, Mission> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

export const missionsByWorld = (world: WorldId) => MISSIONS.filter((m) => m.world === world);

export { WORLDS };

/** All stages of a progressive project, in order. */
export const seriesStages = (seriesId: string) =>
  MISSIONS.filter((m) => m.series?.id === seriesId).sort((a, b) => a.series!.stage - b.series!.stage);

/** Stage n − 1 of a progressive project (undefined for stage 1 and ordinary missions). */
export const previousStage = (m: Mission): Mission | undefined =>
  m.series && m.series.stage > 1 ? MISSIONS.find((x) => x.series?.id === m.series!.id && x.series.stage === m.series!.stage - 1) : undefined;

/** Starting code of a stage: the code carried from the previous stage followed by this stage's skeleton. */
export const stageStartCode = (m: Mission, carried?: string): string => {
  const prev = previousStage(m);
  if (!prev) return m.starter;
  return `${(carried ?? prev.solution).trimEnd()}\n\n${m.starter}`;
};
