// Everything the UI shows about progress is computed here from the stored facts.
import type { Misconception, Mission, World, WorldId } from "../content/types";
import { itemById } from "./catalog";
import { dayKey, type ReviewLog, type SaveState } from "./state";

export interface Content {
  missions: Mission[];
  worlds: World[];
}

// ---------------------------------------------------------------- rewards

export const NO_HINT_BONUS = 0.25;
export const ADVANCED_BONUS = 0.5;
export const SOLUTION_PENALTY = 0.5;
export const QUIZ_XP = 10;
export const REVIEW_XP = 10;
export const ACHIEVEMENT_COINS = 20;

export interface MissionReward {
  xp: number;
  coins: number;
  parts: { label: string; xp: number; coins: number }[];
}

/** Reward for a mission given its record. Pure: the same record always yields the same reward. */
export function missionReward(m: Mission, state: SaveState): MissionReward {
  const r = state.missions[m.id];
  const parts: MissionReward["parts"] = [];
  if (!r?.done) return { xp: 0, coins: 0, parts };
  const base = r.sawSolution ? Math.round(m.xp * SOLUTION_PENALTY) : m.xp;
  parts.push({ label: r.sawSolution ? "Misión (con solución vista)" : "Misión completada", xp: base, coins: m.coins });
  if (r.hints === 0 && !r.sawSolution) {
    parts.push({ label: "Sin pistas", xp: Math.round(m.xp * NO_HINT_BONUS), coins: 2 });
  }
  if (r.advancedDone) parts.push({ label: "Reto avanzado", xp: Math.round(m.xp * ADVANCED_BONUS), coins: Math.ceil(m.coins / 2) });
  const firstQuiz = state.quizzes.find((q) => q.m === m.id);
  if (firstQuiz?.ok) parts.push({ label: "Interpretación correcta al primer intento", xp: QUIZ_XP, coins: 1 });
  return {
    xp: parts.reduce((s, p) => s + p.xp, 0),
    coins: parts.reduce((s, p) => s + p.coins, 0),
    parts,
  };
}

/** Total XP needed to *reach* a level: 0, 100, 300, 600, 1000, … */
export const xpForLevel = (level: number) => 50 * level * (level - 1);

export function levelFromXp(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, intoLevel: xp - floor, levelSpan: next - floor, nextAt: next };
}

// ---------------------------------------------------------------- streaks

export interface StreakInfo {
  current: number;
  best: number;
  freezes: number;
  activeToday: boolean;
}

const addDays = (key: string, n: number) => {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + n));
};

/**
 * Healthy streaks: every 7 active days earn a rest token (max 2). A missed day spends a
 * token instead of resetting the streak, declared pauses never count against it, and
 * today only counts once you have studied (an unfinished day never breaks a streak).
 */
export function computeStreak(state: SaveState, now = new Date()): StreakInfo {
  const days = Object.keys(state.activity)
    .filter((k) => state.activity[k].runs > 0 || state.activity[k].done > 0 || state.activity[k].ms >= 60_000)
    .sort();
  const today = dayKey(now);
  if (!days.length) return { current: 0, best: 0, freezes: 0, activeToday: false };
  const active = new Set(days);
  const paused = (k: string) => state.settings.pauses.some((p) => p.from <= k && k <= p.to);
  let streak = 0;
  let best = 0;
  let freezes = 0;
  for (let k = days[0]; k <= today; k = addDays(k, 1)) {
    if (active.has(k)) {
      streak++;
      if (streak % 7 === 0 && freezes < 2) freezes++;
    } else if (k === today || paused(k)) {
      // neutral
    } else if (freezes > 0) {
      freezes--;
    } else {
      streak = 0;
    }
    best = Math.max(best, streak);
  }
  return { current: streak, best, freezes, activeToday: active.has(today) };
}

// ---------------------------------------------------------------- spaced repetition

export interface ReviewCard {
  m: string;
  due: string; // YYYY-MM-DD
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
}

/** SM-2-style schedule rebuilt from the completion and review history. */
export function reviewCards(state: SaveState, missions: Mission[]): ReviewCard[] {
  const byMission = new Map<string, ReviewLog[]>();
  for (const r of state.reviews) {
    if (!byMission.has(r.m)) byMission.set(r.m, []);
    byMission.get(r.m)!.push(r);
  }
  const cards: ReviewCard[] = [];
  for (const m of missions) {
    const rec = state.missions[m.id];
    if (!rec?.done) continue;
    const clean = rec.hints === 0 && !rec.sawSolution;
    let interval = clean ? 3 : 1;
    let ease = clean ? 2.5 : 2.2;
    let last = dayKey(rec.done);
    let reps = 0;
    let lapses = 0;
    for (const r of (byMission.get(m.id) ?? []).sort((a, b) => a.at.localeCompare(b.at))) {
      last = dayKey(r.at);
      reps++;
      if (r.grade === "good") {
        interval = Math.max(interval + 1, Math.round(interval * ease));
        ease = Math.min(3, ease + 0.05);
      } else if (r.grade === "hard") {
        interval = Math.max(1, Math.round(interval * 1.2));
        ease = Math.max(1.3, ease - 0.15);
      } else {
        interval = 1;
        lapses++;
        ease = Math.max(1.3, ease - 0.2);
      }
    }
    cards.push({ m: m.id, due: addDays(last, interval), interval, ease, reps, lapses });
  }
  return cards;
}

export const dueReviews = (cards: ReviewCard[], now = new Date()) =>
  cards.filter((c) => c.due <= dayKey(now)).sort((a, b) => a.due.localeCompare(b.due) || b.lapses - a.lapses);

// ---------------------------------------------------------------- misconceptions & mastery

export const MISCONCEPTIONS: Record<Misconception, { title: string; fix: string }> = {
  "indice-cero": { title: "Índices que empiezan en 0", fix: "El primer elemento es [0] y el último [len-1]; range(a, b) no incluye b." },
  "asignacion-igualdad": { title: "Asignar frente a comparar", fix: "`=` guarda un valor; `==` pregunta si dos valores son iguales." },
  "print-vs-return": { title: "Mostrar frente a devolver", fix: "print muestra texto; return entrega un valor que el resto del programa puede usar." },
  "tipos-texto-numero": { title: "Texto que parece número", fix: "\"5\" es texto: input() y los archivos devuelven texto que hay que convertir." },
  mutabilidad: { title: "Mutabilidad", fix: "Las cadenas son inmutables; las listas se modifican en su sitio y pueden compartirse entre variables." },
  "media-vs-mediana": { title: "Media frente a mediana", fix: "La media se desplaza con los valores extremos; la mediana es robusta. Con asimetría, informa de ambas." },
  "varianza-muestral": { title: "Varianza poblacional frente a muestral", fix: "Con una muestra, divide entre n−1 (corrección de Bessel) para estimar la varianza de la población." },
  "de-vs-ee": { title: "Desviación estándar frente a error estándar", fix: "La DE describe la dispersión de los datos; el EE (DE/√n) describe la incertidumbre de una estimación." },
  "p-valor": { title: "Qué es (y qué no es) un valor p", fix: "Es la probabilidad de observar datos tan extremos o más si H0 fuera cierta; no es la probabilidad de que H0 sea cierta." },
  "ic-vs-creible": { title: "Intervalo de confianza frente a intervalo creíble", fix: "El IC habla del procedimiento (95 % de los intervalos construidos así cubren el parámetro); el creíble da probabilidad posterior al parámetro." },
  "ic-interpretacion": { title: "Interpretar un intervalo de confianza", fix: "No hay un 95 % de probabilidad de que este intervalo concreto contenga el parámetro: el 95 % describe el método." },
  "correlacion-causalidad": { title: "Correlación no implica causalidad", fix: "Una asociación puede deberse a confusión, azar, causalidad inversa o selección. Hace falta diseño o supuestos causales." },
  supuestos: { title: "Elegir pruebas sin revisar supuestos", fix: "Antes de una prueba revisa diseño, tipo de variable, independencia, normalidad aproximada y varianzas." },
  "normalidad-universal": { title: "Suponer normalidad siempre", fix: "Conteos, tiempos y proporciones suelen seguir otras distribuciones. Mira los datos antes de asumir." },
  "significacion-relevancia": { title: "Significación frente a relevancia", fix: "Un efecto diminuto puede ser significativo con n grande. Informa del tamaño del efecto y su intervalo." },
  "sens-espec": { title: "Sensibilidad y especificidad", fix: "Sensibilidad = P(test+ | enfermo); especificidad = P(test− | sano). No dependen de la prevalencia." },
  "base-rate": { title: "Ignorar la prevalencia", fix: "El valor predictivo positivo depende de la prevalencia: con enfermedades raras, muchos positivos son falsos." },
  "prediccion-vs-significacion": { title: "Predicción frente a significación", fix: "Un coeficiente significativo no garantiza buena predicción fuera de muestra, ni al revés." },
  "accuracy-desbalance": { title: "Exactitud con clases desbalanceadas", fix: "Si el 95 % es negativo, predecir siempre negativo da 95 % de exactitud. Usa recall, precisión, F1 o AUC." },
  "data-leakage": { title: "Fuga de datos", fix: "Cualquier información del conjunto de prueba (o del futuro) usada al entrenar infla las métricas." },
  sobreajuste: { title: "Sobreajuste", fix: "Un modelo que memoriza el entrenamiento rinde peor en datos nuevos. Evalúa siempre fuera de muestra." },
  alucinacion: { title: "Confiar en respuestas sin fuente", fix: "Un modelo de lenguaje puede inventar datos plausibles. Exige citas y verifica contra los documentos." },
};

export interface MisconceptionStat {
  tag: Misconception;
  count: number;
  last: string;
  /** Still active if the latest quiz on a mission that probes this tag was wrong. */
  active: boolean;
}

export function misconceptionStats(state: SaveState, missions: Mission[]): MisconceptionStat[] {
  const stats = new Map<Misconception, MisconceptionStat>();
  for (const q of state.quizzes) {
    if (q.ok || !q.tag || !(q.tag in MISCONCEPTIONS)) continue;
    const tag = q.tag as Misconception;
    const s = stats.get(tag) ?? { tag, count: 0, last: q.at, active: true };
    s.count++;
    if (q.at > s.last) s.last = q.at;
    stats.set(tag, s);
  }
  // A later correct answer on any mission probing the same idea clears the "active" flag.
  for (const s of stats.values()) {
    const probing = new Set(missions.filter((m) => m.quiz.options.some((o) => o.misconception === s.tag)).map((m) => m.id));
    const later = state.quizzes.filter((q) => probing.has(q.m) && q.at > s.last);
    s.active = !later.some((q) => q.ok);
  }
  return [...stats.values()].sort((a, b) => Number(b.active) - Number(a.active) || b.count - a.count);
}

export interface SkillMastery {
  skill: string;
  value: number; // 0..1
  missions: number;
  evidence: number;
}

/**
 * Estimated mastery per skill tag. Each mission contributes a score from 0 to 1:
 * 1 if solved with no help, 0.8 with hints, 0.5 after seeing the solution, 0.15 if only attempted,
 * then nudged by review outcomes and by a decay when a review is overdue. It is an
 * approximation from observed performance, not a measurement of knowledge.
 */
export function skillMastery(state: SaveState, missions: Mission[], now = new Date()): SkillMastery[] {
  const cards = new Map(reviewCards(state, missions).map((c) => [c.m, c]));
  const today = dayKey(now);
  const bySkill = new Map<string, { sum: number; n: number; evidence: number }>();
  for (const m of missions) {
    const r = state.missions[m.id];
    let score = 0;
    let evidence = 0;
    if (r?.done) {
      score = r.sawSolution ? 0.5 : r.hints > 0 ? 0.8 : 1;
      evidence = 1 + state.reviews.filter((x) => x.m === m.id).length;
      for (const rv of state.reviews.filter((x) => x.m === m.id)) {
        score = rv.grade === "good" ? Math.min(1, score + 0.1) : rv.grade === "hard" ? score : Math.max(0.3, score - 0.25);
      }
      const card = cards.get(m.id);
      if (card && card.due < today) {
        const overdue = (Date.parse(today) - Date.parse(card.due)) / 86_400_000;
        score *= Math.max(0.6, 1 - overdue / (card.interval * 10 + 30));
      }
    } else if (r && r.attempts > 0) {
      score = 0.15;
      evidence = 1;
    }
    for (const skill of m.skills) {
      const s = bySkill.get(skill) ?? { sum: 0, n: 0, evidence: 0 };
      s.sum += score;
      s.n += 1;
      s.evidence += evidence;
      bySkill.set(skill, s);
    }
  }
  return [...bySkill.entries()].map(([skill, s]) => ({ skill, value: s.sum / s.n, missions: s.n, evidence: s.evidence }));
}

// ---------------------------------------------------------------- unlocking

export function worldProgress(state: SaveState, missions: Mission[], world: WorldId) {
  const list = missions.filter((m) => m.world === world);
  const done = list.filter((m) => state.missions[m.id]?.done).length;
  return { done, total: list.length, fraction: list.length ? done / list.length : 0 };
}

export function isWorldUnlocked(state: SaveState, content: Content, world: World): boolean {
  if (state.placement?.worlds.includes(world.id)) return true;
  // Adding content must never close a world again: once opened it is recorded (recordUnlocks), and
  // progress already made in a world keeps it open even for saves from before that record existed.
  if (state.unlockedWorlds?.includes(world.id)) return true;
  if (content.missions.some((m) => m.world === world.id && state.missions[m.id]?.done)) return true;
  return world.unlock.every((u) => {
    // Projects are optional capstones: the fraction over the lessons alone also counts, so adding
    // a project to a world never lowers the progress that opens the next one.
    const all = worldProgress(state, content.missions, u.world);
    const lessons = worldProgress(state, content.missions.filter((m) => m.kind !== "project"), u.world);
    return [all, lessons].some((p) => p.total > 0 && p.fraction >= u.fraction - 1e-9);
  });
}

/** Adds every world currently open to ``state.unlockedWorlds`` (same object when nothing changes). */
export function recordUnlocks(state: SaveState, content: Content): SaveState {
  const have = new Set(state.unlockedWorlds ?? []);
  const fresh = content.worlds.filter((w) => !have.has(w.id) && w.unlock.length > 0 && isWorldUnlocked(state, content, w)).map((w) => w.id);
  return fresh.length ? { ...state, unlockedWorlds: [...have, ...fresh] } : state;
}

export function isMissionUnlocked(state: SaveState, content: Content, m: Mission): boolean {
  const world = content.worlds.find((w) => w.id === m.world);
  if (!world || !isWorldUnlocked(state, content, world)) return false;
  // Placement can skip the in-world chain for worlds it unlocked.
  if (state.placement?.worlds.includes(m.world) && m.world !== "w1") return true;
  return m.requires.every((id) => state.missions[id]?.done);
}

// ---------------------------------------------------------------- achievements

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const doneIn = (s: SaveState, ms: Mission[], pred: (m: Mission) => boolean) => {
  const list = ms.filter(pred);
  return list.length > 0 && list.every((m) => s.missions[m.id]?.done);
};
const countDone = (s: SaveState, ms: Mission[], pred: (m: Mission) => boolean) =>
  ms.filter((m) => pred(m) && s.missions[m.id]?.done).length;

export const ACHIEVEMENTS: (Achievement & { earned: (s: SaveState, c: Content) => boolean })[] = [
  { id: "primer-programa", title: "Primer programa ejecutado", description: "Ejecutaste tu primer programa de Python.", icon: "spark", earned: (s) => s.totalRuns > 0 },
  { id: "maestro-bucles", title: "Maestro de los bucles", description: "Completaste todas las misiones de bucles.", icon: "loop", earned: (s, c) => doneIn(s, c.missions, (m) => m.skills.includes("bucles")) },
  {
    id: "cazador-errores",
    title: "Cazador de errores",
    description: "Superaste 5 misiones después de haber visto un error en tu código.",
    icon: "bug",
    earned: (s) => {
      const withError = new Set(s.attempts.filter((a) => a.err).map((a) => a.m));
      return [...withError].filter((id) => s.missions[id]?.done).length >= 5;
    },
  },
  { id: "domador-dataframes", title: "Domador de DataFrames", description: "Completaste 5 misiones con pandas.", icon: "table", earned: (s, c) => countDone(s, c.missions, (m) => m.skills.includes("pandas")) >= 5 },
  {
    id: "explorador-probabilidades",
    title: "Explorador de probabilidades",
    description: "Completaste la zona de probabilidad y usaste un simulador.",
    icon: "dice",
    earned: (s, c) => doneIn(s, c.missions, (m) => m.zone === "Probabilidad") && Object.keys(s.labs).length > 0,
  },
  { id: "maestro-inferencia", title: "Maestro de la inferencia", description: "Completaste la zona de inferencia estadística.", icon: "scale", earned: (s, c) => doneIn(s, c.missions, (m) => m.zone === "Inferencia") },
  { id: "arquitecto-estadistico", title: "Arquitecto estadístico", description: "Terminaste el proyecto final de estadística.", icon: "column", earned: (s) => Boolean(s.missions["proj-estudio-estadistico"]?.done) },
  { id: "analista-datos", title: "Analista de datos", description: "Completaste el Reino de los Datos.", icon: "chart", earned: (s, c) => doneIn(s, c.missions, (m) => m.world === "w3") },
  { id: "entrenador-modelos", title: "Entrenador de modelos", description: "Completaste 5 misiones de machine learning.", icon: "gear", earned: (s, c) => countDone(s, c.missions, (m) => m.world === "w6") >= 5 },
  { id: "constructor-ia", title: "Constructor de IA", description: "Completaste la Fortaleza de la IA.", icon: "brain", earned: (s, c) => doneIn(s, c.missions, (m) => m.world === "w7") },
  { id: "ingeniero-python", title: "Ingeniero Python", description: "Completaste el Bosque y las Montañas.", icon: "tower", earned: (s, c) => doneIn(s, c.missions, (m) => m.world === "w1" || m.world === "w2") },
  {
    id: "obra-por-etapas",
    title: "Obra por etapas",
    description: "Terminaste todas las etapas de un proyecto progresivo.",
    icon: "column",
    earned: (s, c) => {
      const finals = c.missions.filter((m) => m.series && m.series.stage === m.series.of);
      return finals.some((m) => c.missions.filter((x) => x.series?.id === m.series!.id).every((x) => s.missions[x.id]?.done));
    },
  },
  { id: "sin-ayuda", title: "Mente independiente", description: "Diez misiones resueltas sin pistas ni solución.", icon: "star", earned: (s) => Object.values(s.missions).filter((r) => r.done && r.hints === 0 && !r.sawSolution).length >= 10 },
  { id: "memoria", title: "Memoria de elefante", description: "Diez repasos superados.", icon: "book", earned: (s) => s.reviews.filter((r) => r.grade !== "again").length >= 10 },
  { id: "constancia", title: "Constancia", description: "Una racha de 7 días.", icon: "flame", earned: (s) => computeStreak(s).best >= 7 },
];

// ---------------------------------------------------------------- summary

export interface Summary {
  xp: number;
  coinsEarned: number;
  coinsSpent: number;
  coins: number;
  level: ReturnType<typeof levelFromXp>;
  completed: number;
  total: number;
  achievements: Achievement[];
  streak: StreakInfo;
  cards: ReviewCard[];
  due: ReviewCard[];
}

export function summarize(state: SaveState, content: Content, now = new Date()): Summary {
  let xp = 0;
  let coinsEarned = 0;
  let completed = 0;
  for (const m of content.missions) {
    const r = missionReward(m, state);
    xp += r.xp;
    coinsEarned += r.coins;
    if (state.missions[m.id]?.done) completed++;
  }
  const passedReviews = state.reviews.filter((r) => r.grade !== "again").length;
  xp += passedReviews * REVIEW_XP;
  coinsEarned += passedReviews * 2;
  const achievements = ACHIEVEMENTS.filter((a) => a.earned(state, content));
  coinsEarned += achievements.length * ACHIEVEMENT_COINS;
  const coinsSpent = state.owned.reduce((s, id) => s + (itemById[id]?.price ?? 0), 0);
  const cards = reviewCards(state, content.missions);
  return {
    xp,
    coinsEarned,
    coinsSpent,
    coins: coinsEarned - coinsSpent,
    level: levelFromXp(xp),
    completed,
    total: content.missions.length,
    achievements: achievements.map(({ earned: _e, ...a }) => a),
    streak: computeStreak(state, now),
    cards,
    due: dueReviews(cards, now),
  };
}

/** Next thing to do: a due review first, then the earliest unlocked unfinished mission. */
export function recommendNext(state: SaveState, content: Content, now = new Date()): { kind: "review" | "mission"; mission: Mission } | null {
  const due = dueReviews(reviewCards(state, content.missions), now);
  if (due.length) {
    const m = content.missions.find((x) => x.id === due[0].m);
    if (m) return { kind: "review", mission: m };
  }
  const worlds = [...content.worlds].sort((a, b) => a.order - b.order);
  for (const w of worlds) {
    const m = content.missions.find((x) => x.world === w.id && !state.missions[x.id]?.done && isMissionUnlocked(state, content, x));
    if (m) return { kind: "mission", mission: m };
  }
  return null;
}
