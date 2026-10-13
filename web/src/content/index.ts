import type { Mission, WorldId } from "./types";
import { WORLDS } from "./worlds";
import { W1_A } from "./missions/w1-basics-a";
import { W1_B } from "./missions/w1-basics-b";
import { W2 } from "./missions/w2-logic";
import { W3 } from "./missions/w3-data";
import { W4_A } from "./missions/w4-math-desc";
import { W4_B } from "./missions/w4-prob";
import { W4_C } from "./missions/w4-inference";
import { W6 } from "./missions/w6-ml";
import { W7 } from "./missions/w7-ai";
import { W5 } from "./missions/w5-data-eng";
import { W8, W9 } from "./missions/w8-w9";

/** Every mission in curriculum order. New mission files only need to be added here. */
export const MISSIONS: Mission[] = [...W1_A, ...W1_B, ...W2, ...W3, ...W4_A, ...W4_B, ...W4_C, ...W5, ...W6, ...W7, ...W8, ...W9];

export const missionById: Record<string, Mission> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

export const missionsByWorld = (world: WorldId) => MISSIONS.filter((m) => m.world === world);

export { WORLDS };
