import { describe, expect, it } from "vitest";
import { toMeta } from "../content/catalog";
import { DRILL_VARIANTS } from "../content/practice/kit";
import type { DrillMeta, Mission, MissionMeta, World } from "../content/types";
import * as A from "./actions";
import { certificateId, verifyCertificate } from "./certificates";
import {
  buildSession,
  computeStreak,
  DRILL_COINS,
  DRILL_DAILY_XP_CAP,
  DRILL_XP,
  drillRewards,
  pickSeed,
  REVIEW_XP,
  isMissionUnlocked,
  isWorldUnlocked,
  levelFromXp,
  misconceptionStats,
  recommendNext,
  recordUnlocks,
  reviewCards,
  skillMastery,
  summarize,
  xpForLevel,
  type Content,
} from "./derive";
import { newSave } from "./state";
import { exportSave, importSave } from "./storage";

// A test mission carries both its full content (for actions) and its catalog fields (for the engine).
type TestMission = Mission & MissionMeta;
const mk = (id: string, world: "w1" | "w2", requires: string[] = [], extra: Partial<Mission> = {}): TestMission => {
  const full: Mission = {
  id,
  world,
  zone: "Z",
  title: id,
  kind: "lesson",
  difficulty: 1,
  skills: ["bucles"],
  requires,
  story: "",
  objective: "",
  before: [],
  intuition: "",
  example: { code: "", lines: [] },
  challenge: "",
  starter: "",
  solution: "",
  tests: "",
  hints: ["a", "b"],
  errors: [],
  quiz: { question: "?", options: [{ text: "ok" }, { text: "no", misconception: "p-valor" }], answer: 0, explanation: "" },
  review: "",
  xp: 100,
  coins: 10,
  ...extra,
  };
  return { ...full, ...toMeta(full), project: full.project, advanced: full.advanced };
};

const worlds: World[] = [
  { id: "w1", order: 1, name: "W1", short: "W1", goal: "", theme: "forest", syllabus: [], unlock: [], certificate: { title: "", competencies: [] } },
  { id: "w2", order: 2, name: "W2", short: "W2", goal: "", theme: "mountains", syllabus: [], unlock: [{ world: "w1", fraction: 0.5 }], certificate: { title: "", competencies: [] } },
];
const testMissions = [mk("a", "w1"), mk("b", "w1", ["a"]), mk("c", "w2")];
const content: Content = { worlds, missions: testMissions };
const [a, b] = testMissions;
const pass = { passed: 3, total: 3, ok: true };
const fail = { passed: 1, total: 3, ok: false, errorType: "NameError" };
const T0 = new Date("2026-03-02T10:00:00");

describe("levels", () => {
  it("uses a triangular XP curve", () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 100, 300, 600]);
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(299).level).toBe(2);
    expect(levelFromXp(300)).toMatchObject({ level: 3, intoLevel: 0, levelSpan: 300 });
  });
});

describe("missions and rewards", () => {
  it("unlocks missions in order and worlds by fraction", () => {
    let s = newSave(T0);
    expect(isMissionUnlocked(s, content, a)).toBe(true);
    expect(isMissionUnlocked(s, content, b)).toBe(false);
    expect(isWorldUnlocked(s, content, worlds[1])).toBe(false);
    s = A.recordCheck(s, content, a, pass, {}, T0);
    expect(isMissionUnlocked(s, content, b)).toBe(true);
    expect(isWorldUnlocked(s, content, worlds[1])).toBe(true); // 1/2 of w1
  });

  it("keeps a world open when new content lowers the unlock fraction", () => {
    let s = A.recordCheck(newSave(T0), content, a, pass, {}, T0);
    s = A.recordCheck(s, content, mk("c", "w2"), pass, {}, T0);
    expect(s.missions.c.done).not.toBeNull();
    const grown: Content = { worlds, missions: [...content.missions, mk("a2", "w1", ["b"]), mk("a3", "w1", ["a2"])] };
    // w1 is now at 1/4 < 0.5, but the learner already completed a mission in w2.
    expect(isWorldUnlocked(s, grown, worlds[1])).toBe(true);
    expect(isWorldUnlocked(A.recordCheck(newSave(T0), grown, a, pass, {}, T0), grown, worlds[1])).toBe(false);
  });

  it("does not let a new project lower the unlock fraction", () => {
    const s = A.recordCheck(newSave(T0), content, a, pass, {}, T0); // 1/2 of w1
    const withProjects: Content = { worlds, missions: [...content.missions, mk("p1", "w1", ["b"], { kind: "project" }), mk("p2", "w1", ["p1"], { kind: "project" })] };
    // 1/4 of every mission, but still 1/2 of the lessons.
    expect(isWorldUnlocked(s, withProjects, worlds[1])).toBe(true);
  });

  it("records opened worlds so later content never closes them", () => {
    const s = A.recordCheck(newSave(T0), content, a, pass, {}, T0);
    const recorded = recordUnlocks(s, content);
    expect(recorded.unlockedWorlds).toEqual(["w2"]);
    expect(recordUnlocks(recorded, content)).toBe(recorded); // nothing new: same object
    const grown: Content = { worlds, missions: [...content.missions, mk("a2", "w1", ["b"]), mk("a3", "w1", ["a2"])] };
    expect(isWorldUnlocked(s, grown, worlds[1])).toBe(false); // 1/4 without the record
    expect(isWorldUnlocked(recorded, grown, worlds[1])).toBe(true);
    expect(recordUnlocks(newSave(T0), content).unlockedWorlds).toBeUndefined();
  });

  it("drops imported unlocks that no progress supports", () => {
    const fake = { ...newSave(T0), unlockedWorlds: ["w2", "w9", "w2"] };
    const res = importSave(exportSave(fake), content);
    expect(res.ok && res.state!.unlockedWorlds).toEqual([]);
    const real = recordUnlocks(A.recordCheck(newSave(T0), content, a, pass, {}, T0), content);
    const back = importSave(exportSave(real), content);
    expect(back.ok && back.state!.unlockedWorlds).toEqual(["w2"]);
    expect(back.warnings).toEqual([]);
  });

  it("does not complete a locked mission even if tests pass", () => {
    const s = A.recordCheck(newSave(T0), content, b, pass, {}, T0);
    expect(s.missions.b.done).toBeNull();
    expect(s.missions.b.attempts).toBe(1);
  });

  it("derives XP: base + no-hint bonus, hints remove bonus, solution halves base", () => {
    let s = A.recordCheck(newSave(T0), content, a, pass, {}, T0);
    expect(summarize(s, content, T0).xp).toBe(125);
    let h = A.revealHint(newSave(T0), "a", 1);
    h = A.recordCheck(h, content, a, pass, {}, T0);
    expect(summarize(h, content, T0).xp).toBe(100);
    let sol = A.recordCheck(newSave(T0), content, a, fail, {}, T0);
    sol = A.recordCheck(sol, content, a, fail, {}, T0);
    expect(A.canSeeSolution(sol, a)).toBe(true);
    sol = A.revealSolution(sol, a);
    sol = A.recordCheck(sol, content, a, pass, {}, T0);
    expect(summarize(sol, content, T0).xp).toBe(50);
    // hints after completion do not change the reward
    s = A.revealHint(s, "a", 2);
    expect(summarize(s, content, T0).xp).toBe(125);
  });

  it("solution stays hidden until a genuine attempt", () => {
    const s = A.recordCheck(newSave(T0), content, a, fail, {}, T0);
    expect(A.canSeeSolution(s, a)).toBe(false);
    expect(A.revealSolution(s, a).missions.a.sawSolution).toBe(false);
  });

  it("advanced challenge only counts after the main one", () => {
    let s = A.recordCheck(newSave(T0), content, a, pass, { advanced: true }, T0);
    expect(s.missions.a.advancedDone).toBeNull();
    s = A.recordCheck(s, content, a, pass, {}, T0);
    s = A.recordCheck(s, content, a, pass, { advanced: true }, T0);
    expect(s.missions.a.advancedDone).not.toBeNull();
    expect(summarize(s, content, T0).xp).toBe(175);
  });

  it("shop never lets coins go negative and respects level", () => {
    let s = A.recordCheck(newSave(T0), content, a, pass, {}, T0);
    // 10 + 2 (no hints) + 20 achievement "primer programa" = 32 coins
    expect(summarize(s, content, T0).coins).toBe(32);
    expect(A.buy(s, content, "armadura").ok).toBe(false);
    const r = A.buy(s, content, "coleta");
    expect(r.ok).toBe(true);
    if (r.ok) s = r.state;
    expect(summarize(s, content, T0).coins).toBe(7);
    expect(A.buy(s, content, "coleta").ok).toBe(false);
    expect(A.buy(s, content, "toga")).toMatchObject({ ok: false });
  });
});

describe("streaks", () => {
  const withDays = (days: string[]) => {
    const s = newSave(T0);
    for (const d of days) s.activity[d] = { ms: 0, runs: 1, done: 0 };
    return s;
  };
  it("counts consecutive days and does not break on an unfinished today", () => {
    const s = withDays(["2026-03-01", "2026-03-02", "2026-03-03"]);
    expect(computeStreak(s, new Date("2026-03-04T08:00:00")).current).toBe(3);
  });
  it("resets after a missed day without rest tokens", () => {
    const s = withDays(["2026-03-01", "2026-03-03"]);
    expect(computeStreak(s, new Date("2026-03-03T20:00:00")).current).toBe(1);
  });
  it("spends a rest token earned after 7 days instead of resetting", () => {
    const days = Array.from({ length: 7 }, (_, i) => `2026-03-0${i + 1}`).concat(["2026-03-09"]);
    const st = computeStreak(withDays(days), new Date("2026-03-09T20:00:00"));
    expect(st.current).toBe(8);
    expect(st.freezes).toBe(0);
  });
  it("ignores declared pauses", () => {
    const s = withDays(["2026-03-01", "2026-03-05"]);
    s.settings.pauses = [{ from: "2026-03-02", to: "2026-03-04" }];
    expect(computeStreak(s, new Date("2026-03-05T20:00:00")).current).toBe(2);
  });
});

describe("spaced repetition and mastery", () => {
  it("schedules first review in 3 days for clean solves, grows on good, resets on again", () => {
    let s = A.recordCheck(newSave(T0), content, a, pass, {}, T0);
    expect(reviewCards(s, content.missions)[0]).toMatchObject({ due: "2026-03-05", interval: 3 });
    s = A.recordReview(s, "a", "good", new Date("2026-03-05T10:00:00"));
    expect(reviewCards(s, content.missions)[0]).toMatchObject({ interval: 8, due: "2026-03-13" });
    s = A.recordReview(s, "a", "again", new Date("2026-03-13T10:00:00"));
    expect(reviewCards(s, content.missions)[0]).toMatchObject({ interval: 1, lapses: 1, due: "2026-03-14" });
  });
  it("recommends due reviews before new missions", () => {
    const s = A.recordCheck(newSave(T0), content, a, pass, {}, T0);
    expect(recommendNext(s, content, T0)).toMatchObject({ kind: "mission", mission: { id: "b" } });
    expect(recommendNext(s, content, new Date("2026-03-06T10:00:00"))).toMatchObject({ kind: "review", mission: { id: "a" } });
  });
  it("tracks misconceptions until a later correct answer", () => {
    let s = A.answerQuiz(newSave(T0), a, 1, T0);
    let st = misconceptionStats(s, content.missions);
    expect(st[0]).toMatchObject({ tag: "p-valor", count: 1, active: true });
    s = A.answerQuiz(s, b, 0, new Date("2026-03-03T10:00:00"));
    st = misconceptionStats(s, content.missions);
    expect(st[0].active).toBe(false);
  });
  it("mastery is the average evidence across missions of a skill", () => {
    const s = A.recordCheck(newSave(T0), content, a, pass, {}, T0);
    const m = skillMastery(s, content.missions, T0).find((x) => x.skill === "bucles")!;
    expect(m.value).toBeCloseTo(1 / 3);
  });
});

describe("persistence", () => {
  it("round-trips through export/import", () => {
    let s = A.setProfile(newSave(T0), "Ada", { skin: 1, hair: "corto", hairColor: "#000", outfit: "tunica", outfitColor: "#00f", pet: null, frame: null });
    s = A.recordCheck(s, content, a, pass, {}, T0);
    const back = importSave(exportSave(s), content);
    expect(back.ok).toBe(true);
    expect(back.state).toEqual(s);
  });
  it("rejects malformed files and cleans inconsistent ones", () => {
    expect(importSave("{nope", content).ok).toBe(false);
    expect(importSave(JSON.stringify({ version: 1 }), content).ok).toBe(false);
    const s = newSave(T0);
    s.missions.zzz = { done: T0.toISOString(), hints: 0, sawSolution: false, attempts: 1, advancedDone: null };
    s.missions.a = { done: "2999-01-01T00:00:00.000Z", hints: 0, sawSolution: false, attempts: 1, advancedDone: null };
    s.owned = ["dragon", "inventado"];
    s.reviews = [{ m: "b", at: T0.toISOString(), grade: "good" }];
    s.certificates = { w1: { issuedAt: T0.toISOString(), name: "x" } };
    const r = importSave(JSON.stringify(s), content);
    expect(r.ok).toBe(true);
    expect(r.state!.missions.zzz).toBeUndefined();
    expect(r.state!.missions.a.done).toBeNull();
    expect(r.state!.owned).toEqual([]);
    expect(r.state!.reviews).toEqual([]);
    expect(r.state!.certificates).toEqual({});
    expect(r.warnings.length).toBeGreaterThan(3);
  });
});

describe("certificates", () => {
  it("issues a verifiable ID that changes if the record changes", async () => {
    let s = A.setProfile(newSave(T0), "Ada", { skin: 1, hair: "corto", hairColor: "#000", outfit: "tunica", outfitColor: "#00f", pet: null, frame: null });
    s = A.recordCheck(s, content, a, pass, {}, T0);
    s = A.recordCheck(s, content, b, pass, {}, T0);
    s = A.issueCertificate(s, content, "w1", T0);
    const id = await certificateId(s, content, "w1");
    expect(id).toMatch(/^PQ-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(await verifyCertificate(s, content, id!.toLowerCase())).toBe("w1");
    const tampered = structuredClone(s);
    tampered.certificates.w1.name = "Otra";
    expect(await verifyCertificate(tampered, content, id!)).toBeNull();
  });

  it("is only issued for a complete route", () => {
    let s = A.setProfile(newSave(T0), "Ada", { skin: 1, hair: "corto", hairColor: "#000", outfit: "tunica", outfitColor: "#00f", pet: null, frame: null });
    s = A.recordCheck(s, content, a, pass, {}, T0);
    expect(A.issueCertificate(s, content, "w1", T0).certificates).toEqual({});
  });

  it("stays valid when missions are added to the route later", async () => {
    let s = A.setProfile(newSave(T0), "Ada", { skin: 1, hair: "corto", hairColor: "#000", outfit: "tunica", outfitColor: "#00f", pet: null, frame: null });
    s = A.recordCheck(s, content, a, pass, {}, T0);
    s = A.recordCheck(s, content, b, pass, {}, T0);
    s = A.issueCertificate(s, content, "w1", T0);
    const id = await certificateId(s, content, "w1");
    const grown = { ...content, missions: [...content.missions, mk("nueva", "w1", ["b"])] };
    const r = importSave(exportSave(s), grown);
    expect(r.ok).toBe(true);
    expect(r.state!.certificates.w1).toBeDefined();
    expect(await certificateId(r.state!, grown, "w1")).toBe(id);
    expect(await verifyCertificate(r.state!, grown, id!)).toBe("w1");
  });
});

describe("practice gym", () => {
  const drill = (id: string, mission: string, skill: string): DrillMeta => ({ id, mission, world: "w1", title: id, skills: [skill], difficulty: 1, hintCount: 2 });
  const at = (h: number) => new Date(T0.getTime() + h * 3_600_000);

  it("pays each variant once, not after seeing the solution, and caps XP per day", () => {
    let s = newSave(T0);
    s = A.recordDrill(s, "d1", 1, { hints: 0, sol: false }, at(0));
    s = A.recordDrill(s, "d1", 1, { hints: 0, sol: false }, at(1)); // same variant again: no XP
    s = A.recordDrill(s, "d1", 2, { hints: 3, sol: true }, at(2)); // with the solution: no XP
    expect(drillRewards(s, at(2))).toMatchObject({ xp: DRILL_XP, coins: DRILL_COINS, variants: 2 });
    for (let seed = 3; seed < 3 + 20; seed++) s = A.recordDrill(s, "d1", seed, { hints: 0, sol: false }, at(3));
    const r = drillRewards(s, at(3));
    expect(r.xp).toBe(DRILL_DAILY_XP_CAP);
    expect(r.capReached).toBe(true);
    // The next day pays again.
    s = A.recordDrill(s, "d1", 30, { hints: 0, sol: false }, at(30));
    expect(drillRewards(s, at(30))).toMatchObject({ xp: DRILL_DAILY_XP_CAP + DRILL_XP, xpToday: DRILL_XP, capReached: false });
    expect(summarize(s, content, at(30)).practice.xp).toBe(DRILL_DAILY_XP_CAP + DRILL_XP);
  });

  it("a drill solved as a review grades the mission's card instead of paying drill XP", () => {
    let s = A.recordCheck(newSave(T0), content, a, pass, {}, T0);
    const xpBefore = summarize(s, content, T0).xp;
    s = A.recordDrill(s, "d1", 4, { hints: 0, sol: false, review: "a" }, at(72));
    s = A.recordDrill(s, "d1", 5, { hints: 2, sol: false, review: "a" }, at(200));
    expect(s.reviews.map((r) => r.grade)).toEqual(["good", "hard"]);
    expect(drillRewards(s).xp).toBe(0);
    expect(summarize(s, content, at(200)).xp).toBe(xpBefore + 2 * REVIEW_XP);
    // A review for a mission that is not done is not recorded.
    expect(A.recordDrill(newSave(T0), "d1", 1, { hints: 0, sol: false, review: "a" }, T0).reviews).toEqual([]);
  });

  it("picks variants not solved yet, and any variant once all are solved", () => {
    let s = newSave(T0);
    for (let seed = 1; seed < DRILL_VARIANTS; seed++) s = A.recordDrill(s, "d1", seed, { hints: 0, sol: false }, T0);
    expect(pickSeed(s, "d1", () => 0.99)).toBe(DRILL_VARIANTS);
    s = A.recordDrill(s, "d1", DRILL_VARIANTS, { hints: 0, sol: false }, T0);
    const seed = pickSeed(s, "d1", () => 0.5);
    expect(seed).toBeGreaterThanOrEqual(1);
    expect(seed).toBeLessThanOrEqual(DRILL_VARIANTS);
  });

  it("builds sessions from unlocked drills, due reviews first, interleaving skills", () => {
    let s = A.recordCheck(newSave(T0), content, a, pass, {}, T0);
    s = A.recordCheck(s, content, b, pass, {}, T0);
    const drills = [drill("x1", "a", "bucles"), drill("x2", "a", "bucles"), drill("y1", "b", "listas"), drill("z1", "c", "otra")];
    const later = at(24 * 4); // card of "a" and "b" due after 3 days
    const session = buildSession(s, content, drills, 3, later, () => 0);
    expect(session).not.toContain("z1"); // mission c not done: locked
    expect(session).toHaveLength(3);
    expect(session[0]).not.toBe(undefined);
    // No two consecutive drills share a skill when an alternative exists.
    for (let i = 1; i < session.length - 1; i++) expect(drills.find((d) => d.id === session[i])!.skills[0]).not.toBe(drills.find((d) => d.id === session[i - 1])!.skills[0]);
  });

  it("old saves without a drill log still load", () => {
    const old = JSON.parse(exportSave(newSave(T0)));
    delete old.drills;
    const r = importSave(JSON.stringify(old), content);
    expect(r.ok).toBe(true);
    expect(drillRewards(r.state!).xp).toBe(0);
  });
});
