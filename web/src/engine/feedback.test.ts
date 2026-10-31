import { describe, expect, it } from "vitest";
import { saveFeedback } from "./actions";
import { feedbackCsv, feedbackRows } from "./feedback";
import { newSave, SaveSchema } from "./state";
import type { MissionMeta } from "../content/types";

const meta = (id: string, title: string) => ({ id, title, world: "w1" }) as MissionMeta;

describe("mission feedback", () => {
  it("stores only the fields given and stays a valid save", () => {
    let s = newSave();
    s = saveFeedback(s, "py-hola", { clarity: "confusa", stuck: "  no entiendo print  " }, new Date("2026-10-31T10:00:00Z"));
    expect(s.feedback).toEqual({ "py-hola": { at: "2026-10-31T10:00:00.000Z", clarity: "confusa", stuck: "no entiendo print" } });
    expect(SaveSchema.safeParse(s).success).toBe(true);
    expect(SaveSchema.safeParse({ ...s, feedback: undefined }).success).toBe(true);
  });

  it("reports opinions with the recorded attempts and hints", () => {
    let s = newSave();
    s = saveFeedback(s, "b", { difficulty: "dificil", stuck: 'dije "hola", y; falló' });
    s = { ...s, attempts: [{ m: "b", at: s.createdAt, ok: false, passed: 0, total: 3, hints: 0 }, { m: "b", at: s.createdAt, ok: true, passed: 3, total: 3, hints: 1 }, { m: "a", at: s.createdAt, ok: true, passed: 1, total: 1, hints: 0 }] };
    s = { ...s, missions: { b: { done: s.createdAt, hints: 1, sawSolution: false, attempts: 2, advancedDone: null } } };
    const rows = feedbackRows(s, [meta("a", "Primera"), meta("b", "Segunda")]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ mision: "b", dificultad: "dificil", comprobaciones: 2, pistas: 1, completada: true });
    const csv = feedbackCsv(rows);
    expect(csv.startsWith("﻿mision,titulo,")).toBe(true);
    expect(csv).toContain('"dije ""hola"", y; falló"');
  });
});
