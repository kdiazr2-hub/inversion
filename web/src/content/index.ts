import type { Mission, WorldId } from "./types";
import { WORLDS } from "./worlds";
import { W1_A } from "./missions/w1-basics-a";
import { W1_B } from "./missions/w1-basics-b";
import { W2 } from "./missions/w2-logic";
import { PROJ_CALCULADORA } from "./missions/proj-calculadora";
import { PROJ_GASTOS } from "./missions/proj-gastos";
import { PROJ_PREGUNTAS } from "./missions/proj-preguntas";
import { PROJ_OBSERVATORIO } from "./missions/proj-observatorio";
import { PROJ_EXPLORADOR } from "./missions/proj-explorador";
import { PROJ_ARBOLES } from "./missions/proj-arboles";
import { PROJ_CINE } from "./missions/proj-cine";
import { PROJ_PENDULO } from "./missions/proj-pendulo";
import { W3 } from "./missions/w3-data";
import { W4_A } from "./missions/w4-math-desc";
import { W4_MATH } from "./missions/w4-math-extra";
import { W4_B } from "./missions/w4-prob";
import { W4_C } from "./missions/w4-inference";
import { W4_COMP } from "./missions/w4-computational";
import { PROJ_ENSAYO } from "./missions/proj-ensayo";
import { PROJ_PROBABILIDADES } from "./missions/proj-probabilidades";
import { W6 } from "./missions/w6-ml";
import { W6_EXTRA } from "./missions/w6-ml-extra";
import { PROJ_VIVIENDAS } from "./missions/proj-viviendas";
import { W7 } from "./missions/w7-ai";
import { W7_EXTRA } from "./missions/w7-extra";
import { PROJ_TEXTO } from "./missions/proj-texto";
import { W5 } from "./missions/w5-data-eng";
import { PROJ_SENSORES } from "./missions/proj-sensores";
import { W8, W9 } from "./missions/w8-w9";
import { W8_EXTRA } from "./missions/w8-extra";
import { PROJ_SERVICIO } from "./missions/proj-servicio";
import { PROJ_DEMANDA } from "./missions/proj-demanda";
import { W9_EXTRA } from "./missions/w9-extra";

/** Every mission in curriculum order. New mission files only need to be added here. */
export const MISSIONS: Mission[] = [...W1_A, ...W1_B, ...PROJ_PREGUNTAS, ...W2, ...PROJ_CALCULADORA, ...W3, ...PROJ_GASTOS, ...W4_A, ...W4_MATH, ...W4_B, ...W4_C.filter((m) => m.kind !== "project"), ...W4_COMP, ...W4_C.filter((m) => m.kind === "project"), ...PROJ_ENSAYO, ...PROJ_PROBABILIDADES, ...PROJ_OBSERVATORIO, ...PROJ_EXPLORADOR, ...PROJ_ARBOLES, ...W5, ...PROJ_SENSORES, ...W6.filter((m) => m.kind !== "project"), ...W6_EXTRA, ...W6.filter((m) => m.kind === "project"), ...PROJ_VIVIENDAS, ...W7, ...W7_EXTRA, ...PROJ_TEXTO, ...W8, ...W8_EXTRA, ...PROJ_SERVICIO, ...W9, ...W9_EXTRA, ...PROJ_DEMANDA, ...PROJ_CINE, ...PROJ_PENDULO];

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

/** Short stage name from a stage title ("Proyecto · 2: tabla 1 y …" → "Tabla 1 y …"). */
export const stageLabel = (m: Mission) => {
  const s = m.title.replace(/^.*?:\s*/, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
