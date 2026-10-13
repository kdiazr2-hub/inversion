import type { Mission, WorldId } from "./types";
import { WORLDS } from "./worlds";
import { W1_A } from "./missions/w1-basics-a";

/** Every mission in curriculum order. New mission files only need to be added here. */
export const MISSIONS: Mission[] = [...W1_A];

export const missionById: Record<string, Mission> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

export const missionsByWorld = (world: WorldId) => MISSIONS.filter((m) => m.world === world);

export { WORLDS };
