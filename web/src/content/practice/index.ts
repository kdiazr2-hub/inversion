// Every practice drill, and the function that turns a drill and a seed into an exercise.
// Only scripts, tests and the lazily loaded gym import this file.
import type { Drill, DrillVariant } from "../types";
import { DRILL_VARIANTS, hashString, makeRng } from "./kit";
import { DRILLS_W1 } from "./w1";
import { DRILLS_W2 } from "./w2";
import { DRILLS_W3 } from "./w3";
import { DRILLS_W4 } from "./w4";

export { DRILL_VARIANTS };

export const DRILLS: Drill[] = [...DRILLS_W1, ...DRILLS_W2, ...DRILLS_W3, ...DRILLS_W4];

export const drillById: Record<string, Drill> = Object.fromEntries(DRILLS.map((d) => [d.id, d]));

/** Variant `seed` (1..DRILL_VARIANTS) of a drill. Same drill and seed, same exercise. */
export function drillVariant(drill: Drill, seed: number): DrillVariant {
  if (!Number.isInteger(seed) || seed < 1 || seed > DRILL_VARIANTS) throw new Error(`Variante fuera de rango: ${seed}`);
  return drill.make(makeRng((hashString(drill.id) ^ Math.imul(seed, 0x9e3779b1)) >>> 0));
}
