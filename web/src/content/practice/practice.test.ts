import { describe, expect, it } from "vitest";
import { MISSIONS } from "../full";
import { text } from "../types";
import { DRILLS, DRILL_VARIANTS, drillVariant } from ".";
import { lit, makeRng } from "./kit";

describe("ejercicios del gimnasio", () => {
  it("tienen identificadores únicos y practican una misión existente", () => {
    expect(new Set(DRILLS.map((d) => d.id)).size).toBe(DRILLS.length);
    const ids = new Set(MISSIONS.map((m) => m.id));
    // Distinct namespaces: a drill id never names a mission (logs and routes would be ambiguous).
    for (const d of DRILLS) expect(ids.has(d.id), d.id).toBe(false);
    for (const d of DRILLS) {
      expect(ids.has(d.mission), d.id).toBe(true);
      expect(d.hints.length, d.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("cada semilla da siempre el mismo ejercicio", () => {
    for (const d of DRILLS) for (const seed of [1, 17, DRILL_VARIANTS]) expect(drillVariant(d, seed)).toEqual(drillVariant(d, seed));
  });

  it("las variantes cambian de verdad", () => {
    for (const d of DRILLS) {
      const prompts = new Set(Array.from({ length: DRILL_VARIANTS }, (_, i) => text(drillVariant(d, i + 1).prompt)));
      expect(prompts.size, d.id).toBeGreaterThanOrEqual(DRILL_VARIANTS / 2);
    }
  });

  it("no acepta semillas fuera del rango validado", () => {
    expect(() => drillVariant(DRILLS[0], 0)).toThrow();
    expect(() => drillVariant(DRILLS[0], DRILL_VARIANTS + 1)).toThrow();
  });

  it("el código inicial y la solución son distintos y las pruebas existen", () => {
    for (const d of DRILLS)
      for (let seed = 1; seed <= DRILL_VARIANTS; seed++) {
        const v = drillVariant(d, seed);
        expect(v.starter.trim(), `${d.id}#${seed}`).not.toBe(v.solution.trim());
        expect(v.tests, `${d.id}#${seed}`).toMatch(/def test_/);
      }
  });

  it("genera literales de Python y números pseudoaleatorios reproducibles", () => {
    expect(lit({ a: [1, 2.5, true, null, "x\"y"] })).toBe('{"a": [1, 2.5, True, None, "x\\"y"]}');
    const r1 = makeRng(42);
    const r2 = makeRng(42);
    const xs = Array.from({ length: 5 }, () => r1.int(1, 6));
    expect(xs).toEqual(Array.from({ length: 5 }, () => r2.int(1, 6)));
    for (const x of xs) expect(x >= 1 && x <= 6).toBe(true);
  });
});
