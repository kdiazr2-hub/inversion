/**
 * Pilot report: the learner's opinions of each mission next to what the save already records
 * (attempts, hints, whether the solution was viewed). Everything comes from the learner's own
 * save; the report is only a file they download and choose to share.
 */
import type { MissionMeta } from "../content/types";
import type { SaveState } from "./state";

export interface FeedbackRow {
  mision: string;
  titulo: string;
  mundo: string;
  claridad: string;
  dificultad: string;
  atasco: string;
  comprobaciones: number;
  pistas: number;
  vio_solucion: boolean;
  completada: boolean;
  fecha: string;
}

/** One row per mission with an opinion, in curriculum order. */
export function feedbackRows(state: SaveState, missions: MissionMeta[]): FeedbackRow[] {
  const fb = state.feedback ?? {};
  return missions
    .filter((m) => fb[m.id])
    .map((m) => {
      const f = fb[m.id]!;
      const rec = state.missions[m.id];
      return {
        mision: m.id,
        titulo: m.title,
        mundo: m.world,
        claridad: f.clarity ?? "",
        dificultad: f.difficulty ?? "",
        atasco: f.stuck ?? "",
        comprobaciones: state.attempts.filter((a) => a.m === m.id && !a.adv && !a.review).length,
        pistas: rec?.hints ?? 0,
        vio_solucion: rec?.sawSolution ?? false,
        completada: Boolean(rec?.done),
        fecha: f.at,
      };
    });
}

const csvCell = (v: string | number | boolean) => {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV (comma separated, UTF-8 with BOM so spreadsheets read the accents) of the rows. */
export function feedbackCsv(rows: FeedbackRow[]): string {
  const head: (keyof FeedbackRow)[] = ["mision", "titulo", "mundo", "claridad", "dificultad", "atasco", "comprobaciones", "pistas", "vio_solucion", "completada", "fecha"];
  return "﻿" + [head.join(","), ...rows.map((r) => head.map((k) => csvCell(r[k])).join(","))].join("\r\n") + "\r\n";
}
