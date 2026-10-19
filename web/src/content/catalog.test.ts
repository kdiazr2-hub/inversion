import { describe, expect, it } from "vitest";
import { buildCatalog, toMeta } from "./catalog";
import { CATALOG } from "./catalog.generated";
import { MISSIONS as FULL } from "./full";
import { DRILLS } from "./practice";
import { loadedWorld, loadWorld } from "./load";
import { WORLDS } from "./worlds";

const files = import.meta.glob<Record<string, unknown>>("./missions/*.ts", { eager: true });
const modules = Object.fromEntries(Object.entries(files).map(([path, mod]) => [path.replace("./missions/", ""), mod]));

describe("catálogo de misiones", () => {
  it("coincide con las misiones (si falla: npm run catalog)", () => {
    expect(CATALOG).toEqual(buildCatalog(FULL, modules, DRILLS));
  });

  it("cada mundo carga exactamente sus misiones completas", async () => {
    for (const w of WORLDS) {
      const loaded = await loadWorld(w.id);
      const expected = FULL.filter((m) => m.world === w.id);
      expect(Object.keys(loaded).sort()).toEqual(expected.map((m) => m.id).sort());
      for (const m of expected) expect(loaded[m.id]).toBe(m);
      expect(loadedWorld(w.id)).toBe(loaded);
    }
  });

  it("las etapas de un proyecto progresivo están en el mismo mundo", () => {
    // A stage starts from the previous stage's solution, which must arrive with the same world.
    for (const m of FULL.filter((x) => x.series && x.series.stage > 1)) {
      const prev = FULL.find((x) => x.series?.id === m.series!.id && x.series.stage === m.series!.stage - 1)!;
      expect(prev.world, m.id).toBe(m.world);
    }
  });

  it("resume los campos que usa el motor", () => {
    const m = FULL.find((x) => x.quiz.options.some((o) => o.misconception) && x.files && x.advanced)!;
    const meta = toMeta(m);
    expect(meta.hintCount).toBe(m.hints.length);
    expect(meta.fileNames).toEqual(Object.keys(m.files!));
    expect(meta.probes.length).toBeGreaterThan(0);
    expect(meta.advanced).toEqual({ title: m.advanced!.title });
    expect(meta).not.toHaveProperty("tests");
    expect(meta).not.toHaveProperty("solution");
  });
});
