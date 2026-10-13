// Persisted state. Only *facts* are stored (what happened and when); XP, coins, level,
// streaks, review schedules and mastery are always derived from them. That keeps the
// save file small, consistent, and impossible to "edit" into extra XP without faking events.
import { z } from "zod";

export const SAVE_VERSION = 1;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoTime = z.string().datetime({ offset: true });

export const AvatarSchema = z.object({
  skin: z.number().int().min(0).max(5),
  hair: z.string().max(32),
  hairColor: z.string().max(32),
  outfit: z.string().max(32),
  outfitColor: z.string().max(32),
  pet: z.string().max(32).nullable(),
  frame: z.string().max(32).nullable(),
});

export const MissionRecordSchema = z.object({
  /** When the main challenge was first passed. */
  done: isoTime.nullable(),
  /** Hints revealed before the first pass. */
  hints: z.number().int().min(0).max(50),
  /** Reference solution was revealed before the first pass. */
  sawSolution: z.boolean(),
  attempts: z.number().int().min(0).max(100000),
  advancedDone: isoTime.nullable(),
  /** Last code typed (drafts survive reloads). */
  code: z.string().max(100_000).optional(),
  advancedCode: z.string().max(100_000).optional(),
  notes: z.string().max(20_000).optional(),
});

export const AttemptSchema = z.object({
  m: z.string().max(64),
  at: isoTime,
  ok: z.boolean(),
  passed: z.number().int().min(0),
  total: z.number().int().min(0),
  hints: z.number().int().min(0),
  err: z.string().max(40).optional(),
  adv: z.boolean().optional(),
  review: z.boolean().optional(),
});

export const QuizLogSchema = z.object({
  m: z.string().max(64),
  at: isoTime,
  choice: z.number().int().min(0),
  ok: z.boolean(),
  tag: z.string().max(40).optional(),
});

export const ReviewLogSchema = z.object({
  m: z.string().max(64),
  at: isoTime,
  grade: z.enum(["good", "hard", "again"]),
});

export const ActivitySchema = z.object({
  ms: z.number().min(0).max(86_400_000),
  runs: z.number().int().min(0),
  done: z.number().int().min(0),
});

export const SettingsSchema = z.object({
  editorTheme: z.string().max(32),
  fontSize: z.number().int().min(12).max(24),
  reducedMotion: z.boolean(),
  dailyGoalMin: z.number().int().min(5).max(240),
  timeoutSec: z.number().int().min(5).max(120),
  pauses: z.array(z.object({ from: isoDate, to: isoDate })).max(50),
});

export const SaveSchema = z.object({
  version: z.literal(SAVE_VERSION),
  createdAt: isoTime,
  profile: z.object({ name: z.string().min(1).max(40), avatar: AvatarSchema }).nullable(),
  missions: z.record(z.string().max(64), MissionRecordSchema),
  attempts: z.array(AttemptSchema).max(20_000),
  quizzes: z.array(QuizLogSchema).max(20_000),
  reviews: z.array(ReviewLogSchema).max(20_000),
  activity: z.record(isoDate, ActivitySchema),
  owned: z.array(z.string().max(32)).max(200),
  labs: z.record(z.string().max(32), z.number().int().min(0)),
  placement: z.object({ at: isoTime, worlds: z.array(z.string().max(4)) }).nullable(),
  certificates: z.record(
    z.string().max(4),
    z.object({
      issuedAt: isoTime,
      name: z.string().max(40),
      /** Missions of the route when it was issued: adding content later must not invalidate it. */
      missions: z.array(z.string().max(64)).max(1000).optional(),
    }),
  ),
  settings: SettingsSchema,
  totalRuns: z.number().int().min(0),
});

export type Avatar = z.infer<typeof AvatarSchema>;
export type MissionRecord = z.infer<typeof MissionRecordSchema>;
export type Attempt = z.infer<typeof AttemptSchema>;
export type QuizLog = z.infer<typeof QuizLogSchema>;
export type ReviewLog = z.infer<typeof ReviewLogSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type SaveState = z.infer<typeof SaveSchema>;

export const DEFAULT_AVATAR: Avatar = {
  skin: 1,
  hair: "corto",
  hairColor: "#3b2a1e",
  outfit: "tunica",
  outfitColor: "#3b82c4",
  pet: null,
  frame: null,
};

export const DEFAULT_SETTINGS: Settings = {
  editorTheme: "noche",
  fontSize: 15,
  reducedMotion: false,
  dailyGoalMin: 15,
  timeoutSec: 15,
  pauses: [],
};

export function newSave(now = new Date()): SaveState {
  return {
    version: SAVE_VERSION,
    createdAt: now.toISOString(),
    profile: null,
    missions: {},
    attempts: [],
    quizzes: [],
    reviews: [],
    activity: {},
    owned: [],
    labs: {},
    placement: null,
    certificates: {},
    settings: { ...DEFAULT_SETTINGS },
    totalRuns: 0,
  };
}

export const emptyRecord = (): MissionRecord => ({
  done: null,
  hints: 0,
  sawSolution: false,
  attempts: 0,
  advancedDone: null,
});

/** Local calendar day (YYYY-MM-DD) for a timestamp, in the learner's timezone. */
export function dayKey(d: Date | string = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
