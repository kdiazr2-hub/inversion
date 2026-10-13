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
