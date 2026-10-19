// Loads the full content of a world on demand. Each mission file is its own chunk, so the first
// visit downloads only the catalog and the missions of the worlds the learner opens.
import { CATALOG } from "./catalog.generated";
import { missionsIn } from "./catalog";
import type { Mission, WorldId } from "./types";

const FILES = import.meta.glob<Record<string, unknown>>("./missions/*.ts");

const cache = new Map<WorldId, Promise<Record<string, Mission>>>();

async function fetchWorld(world: WorldId): Promise<Record<string, Mission>> {
  const files = CATALOG.modules[world] ?? [];
  const mods = await Promise.all(
    files.map((f) => {
      const load = FILES[`./missions/${f}`];
      if (!load) throw new Error(`Falta el archivo de misiones ${f}`);
      return load();
    }),
  );
  const out: Record<string, Mission> = {};
  for (const m of mods.flatMap(missionsIn)) if (m.world === world) out[m.id] = m;
  return out;
}

const ready = new Map<WorldId, Record<string, Mission>>();

/** Full missions of a world, by id. A failed download is not kept, so a later call tries again. */
export function loadWorld(world: WorldId): Promise<Record<string, Mission>> {
  let p = cache.get(world);
  if (!p) {
    p = fetchWorld(world).then((r) => {
      ready.set(world, r);
      return r;
    });
    cache.set(world, p);
    p.catch(() => cache.delete(world));
  }
  return p;
}

/** A world that already finished loading (undefined otherwise), for rendering without a flash. */
export const loadedWorld = (world: WorldId): Record<string, Mission> | undefined => ready.get(world);

/** The practice gym's drill generators (one chunk, loaded when the gym opens). */
export const loadPractice = () => import("./practice");
