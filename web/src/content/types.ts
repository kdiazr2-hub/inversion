// Content schema. Adding a mission = adding one object of type Mission to a world file;
// the engine, map, review system and tests pick it up without code changes.

export type WorldId = "w1" | "w2" | "w3" | "w4" | "w5" | "w6" | "w7" | "w8" | "w9";

export type Misconception =
  | "indice-cero"
  | "asignacion-igualdad"
  | "print-vs-return"
  | "tipos-texto-numero"
  | "mutabilidad"
  | "media-vs-mediana"
  | "varianza-muestral"
  | "de-vs-ee"
  | "p-valor"
  | "ic-vs-creible"
  | "ic-interpretacion"
  | "correlacion-causalidad"
  | "supuestos"
  | "normalidad-universal"
  | "significacion-relevancia"
  | "sens-espec"
  | "base-rate"
  | "prediccion-vs-significacion"
  | "accuracy-desbalance"
  | "data-leakage"
  | "sobreajuste"
  | "alucinacion";

/** Prose: a string or lines joined with "\n". Lightweight markdown (see components/Markdown). */
export type Text = string | string[];

export const text = (t: Text | undefined): string => (Array.isArray(t) ? t.join("\n") : t ?? "");

/** Tag for Python sources: keeps backslashes literal (\n stays \n in the Python code). */
export const py = String.raw;

export interface QuizOption {
  text: string;
  /** Wrong options can name the misconception they reveal; the review system tracks it. */
  misconception?: Misconception;
}

export interface Quiz {
  question: string;
  options: QuizOption[];
  answer: number;
  explanation: Text;
}

export interface AdvancedChallenge {
  title: string;
  prompt: Text;
  starter: string;
  solution: string;
  tests: string;
  stdin?: string[];
}

export interface ProjectSpec {
  requirements: string[];
  dataset: string;
  stages: string[];
  criteria: string[];
  extensions: string[];
  portfolio: string;
}

/** Stage of a progressive project: stage n > 1 starts from the learner's code of stage n − 1. */
export interface SeriesRef {
  id: string;
  title: string;
  stage: number;
  of: number;
}

export type LabId = "estadistica" | "ml" | "matematicas";

/** Interactive simulator that lets the learner experiment with the mission's idea. */
export interface LabLink {
  lab: LabId;
  tab: string;
  label: string;
}

export interface Mission {
  id: string;
  world: WorldId;
  zone: string;
  title: string;
  kind: "lesson" | "project";
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Skill tags used for mastery estimates and spaced repetition. */
  skills: string[];
  /** Missions that must be completed first. Empty = first of its zone. */
  requires: string[];
  story: Text;
  objective: Text;
  /** Concepts the learner should already know (plain language). */
  before: string[];
  /** Intuition first: lightweight markdown (paragraphs, **bold**, `code`, lists, ```code```). */
  intuition: Text;
  /** Formal statement / formula when it adds something. */
  formal?: Text;
  example: { code: string; lines: string[]; stdin?: string[] };
  challenge: Text;
  starter: string;
  solution: string;
  /** Python source defining test_* functions that receive a TestContext `t`. */
  tests: string;
  stdin?: string[];
  files?: Record<string, string>;
  /** Pyodide packages the mission downloads on first run (informational, shown in the UI). */
  packages?: string[];
  hints: string[];
  errors: { error: string; fix: string }[];
  quiz: Quiz;
  advanced?: AdvancedChallenge;
  review: Text;
  project?: ProjectSpec;
  series?: SeriesRef;
  lab?: LabLink;
  xp: number;
  coins: number;
}

/** One concrete exercise of the practice gym: what a seed of a Drill produces. */
export interface DrillVariant {
  prompt: Text;
  starter: string;
  solution: string;
  tests: string;
  stdin?: string[];
  files?: Record<string, string>;
}

/**
 * Practice exercise with variants. `make` turns a seeded random generator into one concrete
 * exercise (other numbers, data or wording); the gym offers seeds 1..DRILL_VARIANTS, and every one
 * of them is validated (reference solution passes, starter fails) in CI.
 */
export interface Drill {
  id: string;
  /** Mission that teaches the concept: it unlocks the drill and is the card a drill review counts for. */
  mission: string;
  title: string;
  skills: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  packages?: string[];
  hints: string[];
  make: (r: Rng) => DrillVariant;
}

/** Deterministic pseudo-random source for drill variants. */
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Integer in [a, b], both included. */
  int(a: number, b: number): number;
  pick<T>(xs: readonly T[]): T;
  /** k distinct elements in random order. */
  sample<T>(xs: readonly T[], k: number): T[];
  shuffle<T>(xs: readonly T[]): T[];
}

/** Catalog entry of a drill (the gym list and reviews need no generator). */
export interface DrillMeta {
  id: string;
  mission: string;
  world: WorldId;
  title: string;
  skills: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  packages?: string[];
  hintCount: number;
}

/** Fields of a mission the engine needs to compute progress, unlocks and rewards. */
export type MissionCore = Pick<Mission, "id" | "world" | "zone" | "title" | "kind" | "difficulty" | "skills" | "requires" | "series" | "xp" | "coins">;

/**
 * Catalog entry: what the map, progress, review calendar and portfolio show without the
 * full mission. The complete mission (prose, code, tests, data files) loads with its world.
 */
export interface MissionMeta extends MissionCore {
  objective: string;
  packages?: string[];
  project?: Pick<ProjectSpec, "dataset" | "stages" | "portfolio">;
  lab?: LabLink;
  hintCount: number;
  /** Misconceptions named by the quiz's wrong options. */
  probes: Misconception[];
  advanced?: { title: string };
  fileNames: string[];
}

export interface World {
  id: WorldId;
  order: number;
  name: string;
  short: string;
  goal: string;
  theme: SceneTheme;
  /** Curriculum overview, including topics not yet turned into missions. */
  syllabus: string[];
  /** World unlocks when each listed world reaches the given completed fraction. */
  unlock: { world: WorldId; fraction: number }[];
  certificate: { title: string; competencies: string[] };
}

export type SceneTheme = "forest" | "mountains" | "castle" | "observatory" | "city" | "lab" | "fortress" | "tower" | "multiverse";
