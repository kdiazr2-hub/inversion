// Guest-mode persistence (localStorage) plus validated JSON export/import.
import { CATALOG_IDS } from "./actions";
import { itemById } from "./catalog";
import type { WorldId } from "../content/types";
import { certificateMissions } from "./certificates";
import { type Content, summarize } from "./derive";
import { newSave, SaveSchema, type SaveState } from "./state";

export const STORAGE_KEY = "python-quest-save-v1";

export interface ImportResult {
  ok: boolean;
  state?: SaveState;
  errors: string[];
  warnings: string[];
}

/**
 * Validate and clean a save that came from outside (a file or old localStorage data).
 * The client cannot be fully trusted, so anything inconsistent with the content and the
 * rules is dropped rather than accepted: unknown missions, future dates, reviews of
 * unfinished missions, purchases the earned coins cannot cover, unearned certificates.
 */
export function sanitize(raw: unknown, content: Content, now = new Date()): ImportResult {
  const parsed = SaveSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`);
    return { ok: false, errors, warnings: [] };
  }
  const s: SaveState = structuredClone(parsed.data);
  const warnings: string[] = [];
  const known = new Set(content.missions.map((m) => m.id));
  const nowIso = now.toISOString();

  for (const id of Object.keys(s.missions)) {
    const r = s.missions[id];
    if (!known.has(id)) {
      delete s.missions[id];
      warnings.push(`Se ignoró la misión desconocida «${id}».`);
      continue;
    }
    if (r.done && r.done > nowIso) {
      r.done = null;
      warnings.push(`La misión «${id}» tenía una fecha futura y se marcó como pendiente.`);
    }
    if (r.advancedDone && (!r.done || r.advancedDone > nowIso)) r.advancedDone = null;
  }
  const isDone = (id: string) => Boolean(s.missions[id]?.done);
  s.attempts = s.attempts.filter((a) => known.has(a.m) && a.at <= nowIso);
  s.quizzes = s.quizzes.filter((q) => known.has(q.m) && q.at <= nowIso);
  const before = s.reviews.length;
  s.reviews = s.reviews.filter((r) => isDone(r.m) && r.at <= nowIso && r.at >= (s.missions[r.m]!.done as string));
  if (s.reviews.length !== before) warnings.push(`Se descartaron ${before - s.reviews.length} repasos incoherentes.`);

  const unknownItems = s.owned.filter((id) => !CATALOG_IDS.has(id));
  if (unknownItems.length) warnings.push(`Se ignoraron objetos desconocidos: ${unknownItems.join(", ")}.`);
  s.owned = [...new Set(s.owned.filter((id) => CATALOG_IDS.has(id)))];
  let sum = summarize(s, content, now);
  while (sum.coins < 0 && s.owned.length) {
    const removed = s.owned.pop()!;
    warnings.push(`Se retiró «${itemById[removed]?.name ?? removed}»: las monedas ganadas no cubren la compra.`);
    sum = summarize(s, content, now);
  }

  for (const w of Object.keys(s.certificates)) {
    // Missions removed from the curriculum since issuing are not required any more.
    const required = certificateMissions(s, content, w as WorldId).filter((id) => known.has(id));
    if (required.length === 0 || !required.every(isDone)) {
      delete s.certificates[w];
      warnings.push(`Se retiró el certificado del mundo ${w}: la ruta no está completa.`);
    }
  }
  return { ok: true, state: s, errors: [], warnings };
}

export function loadSave(content: Content, storage: Storage | undefined = globalThis.localStorage): { state: SaveState; warning?: string } {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return { state: newSave() };
    const res = sanitize(JSON.parse(raw), content);
    if (res.ok && res.state) return { state: res.state, warning: res.warnings.length ? res.warnings.join(" ") : undefined };
    return { state: newSave(), warning: "No se pudo leer tu progreso guardado; se empezó una partida nueva. " + res.errors.join("; ") };
  } catch {
    return { state: newSave(), warning: "El almacenamiento local no está disponible: el progreso no se guardará entre sesiones." };
  }
}

export function persist(state: SaveState, storage: Storage | undefined = globalThis.localStorage): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportSave(state: SaveState): string {
  return JSON.stringify({ app: "python-quest", exportedAt: new Date().toISOString(), save: state }, null, 2);
}

export function importSave(text: string, content: Content): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["El archivo no es JSON válido."], warnings: [] };
  }
  const save = (data as { app?: string; save?: unknown })?.app === "python-quest" ? (data as { save: unknown }).save : data;
  return sanitize(save, content);
}
