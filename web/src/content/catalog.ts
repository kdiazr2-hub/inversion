// Builds the mission catalog: the light part of every mission plus, for each world, the mission
// files that hold its full content. scripts/build-catalog.ts writes it to catalog.generated.ts and
// catalog.test.ts checks that the written file matches the missions.
import { text, type Misconception, type Mission, type MissionMeta, type WorldId } from "./types";

export interface Catalog {
  missions: MissionMeta[];
  /** Mission files (names inside content/missions) to load for each world. */
  modules: Partial<Record<WorldId, string[]>>;
}

const isMission = (x: unknown): x is Mission => typeof x === "object" && x !== null && "id" in x && "tests" in x && "world" in x;

/** Missions exported (as arrays) by one mission file. */
export function missionsIn(mod: Record<string, unknown>): Mission[] {
  return Object.values(mod).flatMap((v) => (Array.isArray(v) && v.every(isMission) ? v : []));
}

export function toMeta(m: Mission): MissionMeta {
  const probes = [...new Set(m.quiz.options.flatMap((o) => (o.misconception ? [o.misconception] : [])))] as Misconception[];
  const meta: MissionMeta = {
    id: m.id,
    world: m.world,
    zone: m.zone,
    title: m.title,
    kind: m.kind,
    difficulty: m.difficulty,
    skills: m.skills,
    requires: m.requires,
    objective: text(m.objective),
    hintCount: m.hints.length,
    probes,
    fileNames: Object.keys(m.files ?? {}),
    xp: m.xp,
    coins: m.coins,
  };
  if (m.series) meta.series = m.series;
  if (m.packages) meta.packages = m.packages;
  if (m.project) meta.project = { dataset: m.project.dataset, stages: m.project.stages, portfolio: m.project.portfolio };
  if (m.lab) meta.lab = m.lab;
  if (m.advanced) meta.advanced = { title: m.advanced.title };
  return meta;
}

/** `ordered` is the curriculum order; `modules` maps a mission file name to its exports. */
export function buildCatalog(ordered: Mission[], modules: Record<string, Record<string, unknown>>): Catalog {
  const fileOf = new Map<string, string>();
  for (const [file, mod] of Object.entries(modules)) for (const m of missionsIn(mod)) fileOf.set(m.id, file);
  const perWorld = new Map<WorldId, Set<string>>();
  for (const m of ordered) {
    const file = fileOf.get(m.id);
    if (!file) throw new Error(`La misión ${m.id} no está exportada por ningún archivo de content/missions`);
    if (!perWorld.has(m.world)) perWorld.set(m.world, new Set());
    perWorld.get(m.world)!.add(file);
  }
  const modulesByWorld: Catalog["modules"] = {};
  for (const [w, files] of [...perWorld].sort(([a], [b]) => a.localeCompare(b))) modulesByWorld[w] = [...files].sort();
  return { missions: ordered.map(toMeta), modules: modulesByWorld };
}
