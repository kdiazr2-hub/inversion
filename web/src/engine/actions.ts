// Pure state transitions. Each returns a new SaveState; the React store persists it.
import type { Mission } from "../content/types";
import { CATALOG, itemById } from "./catalog";
import type { Content } from "./derive";
import { isMissionUnlocked, summarize } from "./derive";
import { dayKey, emptyRecord, type Avatar, type SaveState, type Settings } from "./state";

const MAX_LOG = 5000;
const trim = <T,>(xs: T[]) => (xs.length > MAX_LOG ? xs.slice(xs.length - MAX_LOG) : xs);

function touchDay(s: SaveState, now: Date, patch: { ms?: number; runs?: number; done?: number }): SaveState["activity"] {
  const k = dayKey(now);
  const cur = s.activity[k] ?? { ms: 0, runs: 0, done: 0 };
  return {
    ...s.activity,
    [k]: {
      ms: Math.min(86_400_000, cur.ms + (patch.ms ?? 0)),
      runs: cur.runs + (patch.runs ?? 0),
      done: cur.done + (patch.done ?? 0),
    },
  };
}

export function setProfile(s: SaveState, name: string, avatar: Avatar): SaveState {
  return { ...s, profile: { name: name.trim().slice(0, 40) || "Aventurera", avatar } };
}

export interface CheckOutcome {
  passed: number;
  total: number;
  ok: boolean;
  errorType?: string;
}

/** A plain "Run" (no tests): only counts as activity. */
export function recordRun(s: SaveState, now = new Date()): SaveState {
  return { ...s, totalRuns: s.totalRuns + 1, activity: touchDay(s, now, { runs: 1 }) };
}

/**
 * A "Check" against the mission tests. Completion is only granted when every test passes
 * and the mission is unlocked; rewards are then derived from the record.
 */
export function recordCheck(
  s: SaveState,
  content: Content,
  m: Mission,
  out: CheckOutcome,
  opts: { advanced?: boolean; review?: boolean; code?: string } = {},
  now = new Date(),
): SaveState {
  const rec = { ...(s.missions[m.id] ?? emptyRecord()) };
  const unlocked = isMissionUnlocked(s, content, m);
  rec.attempts += 1;
  if (opts.code !== undefined) {
    if (opts.advanced) rec.advancedCode = opts.code;
    else rec.code = opts.code;
  }
  let newlyDone = 0;
  if (out.ok && unlocked && !opts.review) {
    if (opts.advanced) {
      if (rec.done && !rec.advancedDone) rec.advancedDone = now.toISOString();
    } else if (!rec.done) {
      rec.done = now.toISOString();
      newlyDone = 1;
    }
  }
  const attempt = {
    m: m.id,
    at: now.toISOString(),
    ok: out.ok,
    passed: out.passed,
    total: out.total,
    hints: rec.hints,
    ...(out.errorType ? { err: out.errorType.slice(0, 40) } : {}),
    ...(opts.advanced ? { adv: true } : {}),
    ...(opts.review ? { review: true } : {}),
  };
  return {
    ...s,
    totalRuns: s.totalRuns + 1,
    missions: { ...s.missions, [m.id]: rec },
    attempts: trim([...s.attempts, attempt]),
    activity: touchDay(s, now, { runs: 1, done: newlyDone }),
  };
}

export function saveDraft(s: SaveState, missionId: string, code: string, advanced = false): SaveState {
  const rec = { ...(s.missions[missionId] ?? emptyRecord()) };
  if (advanced) rec.advancedCode = code;
  else rec.code = code;
  return { ...s, missions: { ...s.missions, [missionId]: rec } };
}

export function saveNotes(s: SaveState, missionId: string, notes: string): SaveState {
  const rec = { ...(s.missions[missionId] ?? emptyRecord()), notes: notes.slice(0, 20_000) };
  return { ...s, missions: { ...s.missions, [missionId]: rec } };
}

/** Hints only count against the bonus while the mission is still unsolved. */
export function revealHint(s: SaveState, missionId: string, upTo: number): SaveState {
  const rec = { ...(s.missions[missionId] ?? emptyRecord()) };
  if (rec.done) return s;
  rec.hints = Math.max(rec.hints, upTo);
  return { ...s, missions: { ...s.missions, [missionId]: rec } };
}

/** The reference solution opens only after a genuine try: two checks or all hints used. */
export function canSeeSolution(s: SaveState, m: Mission): boolean {
  const rec = s.missions[m.id];
  if (!rec) return false;
  return Boolean(rec.done) || rec.attempts >= 2 || rec.hints >= m.hints.length;
}

export function revealSolution(s: SaveState, m: Mission): SaveState {
  if (!canSeeSolution(s, m)) return s;
  const rec = { ...(s.missions[m.id] ?? emptyRecord()) };
  if (!rec.done) rec.sawSolution = true;
  return { ...s, missions: { ...s.missions, [m.id]: rec } };
}

export function answerQuiz(s: SaveState, m: Mission, choice: number, now = new Date()): SaveState {
  const ok = choice === m.quiz.answer;
  const tag = ok ? undefined : m.quiz.options[choice]?.misconception;
  return { ...s, quizzes: trim([...s.quizzes, { m: m.id, at: now.toISOString(), choice, ok, ...(tag ? { tag } : {}) }]) };
}

export function recordReview(s: SaveState, missionId: string, grade: "good" | "hard" | "again", now = new Date()): SaveState {
  if (!s.missions[missionId]?.done) return s;
  return {
    ...s,
    reviews: trim([...s.reviews, { m: missionId, at: now.toISOString(), grade }]),
    activity: touchDay(s, now, { done: grade === "again" ? 0 : 1 }),
  };
}

export function addTime(s: SaveState, ms: number, now = new Date()): SaveState {
  if (ms <= 0) return s;
  return { ...s, activity: touchDay(s, now, { ms: Math.min(ms, 5 * 60_000) }) };
}

export function recordLab(s: SaveState, lab: string): SaveState {
  return { ...s, labs: { ...s.labs, [lab]: (s.labs[lab] ?? 0) + 1 } };
}

export type BuyResult = { ok: true; state: SaveState } | { ok: false; reason: string };

export function buy(s: SaveState, content: Content, itemId: string): BuyResult {
  const item = itemById[itemId];
  if (!item) return { ok: false, reason: "Ese objeto no existe." };
  if (s.owned.includes(itemId)) return { ok: false, reason: "Ya tienes este objeto." };
  const sum = summarize(s, content);
  if (item.level && sum.level.level < item.level) return { ok: false, reason: `Necesitas nivel ${item.level}.` };
  if (sum.coins < item.price) return { ok: false, reason: `Te faltan ${item.price - sum.coins} monedas.` };
  return { ok: true, state: { ...s, owned: [...s.owned, itemId] } };
}

export function setSettings(s: SaveState, patch: Partial<Settings>): SaveState {
  return { ...s, settings: { ...s.settings, ...patch } };
}

export function setPlacement(s: SaveState, worlds: string[], now = new Date()): SaveState {
  return { ...s, placement: { at: now.toISOString(), worlds } };
}

export function issueCertificate(s: SaveState, worldId: string, now = new Date()): SaveState {
  if (!s.profile || s.certificates[worldId]) return s;
  return { ...s, certificates: { ...s.certificates, [worldId]: { issuedAt: now.toISOString(), name: s.profile.name } } };
}

export const CATALOG_IDS = new Set(CATALOG.map((i) => i.id));
