// Writes all missions to web/content.json so pytest can validate them under CPython.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MISSIONS } from "../src/content/full";
import { WORLDS } from "../src/content/worlds";
import { LAB_TABS } from "../src/content/labs";
import { text } from "../src/content/types";
import { DRILLS, DRILL_VARIANTS, drillVariant } from "../src/content/practice";

const out = {
  worlds: WORLDS.map((w) => ({ id: w.id, unlock: w.unlock })),
  labs: Object.fromEntries(Object.entries(LAB_TABS).map(([k, v]) => [k, v.map((t) => t.id)])),
  missions: MISSIONS.map((m) => ({
    ...m,
    story: text(m.story),
    objective: text(m.objective),
    intuition: text(m.intuition),
    formal: text(m.formal),
    challenge: text(m.challenge),
    review: text(m.review),
    quiz: { ...m.quiz, explanation: text(m.quiz.explanation) },
    advanced: m.advanced ? { ...m.advanced, prompt: text(m.advanced.prompt) } : null,
  })),
  // Every variant the practice gym can show, so each one is validated.
  drills: DRILLS.flatMap((d) =>
    Array.from({ length: DRILL_VARIANTS }, (_, i) => {
      const v = drillVariant(d, i + 1);
      return { id: d.id, seed: i + 1, mission: d.mission, title: d.title, hints: d.hints, packages: d.packages ?? [], ...v, prompt: text(v.prompt) };
    }),
  ),
};
const target = fileURLToPath(new URL("../content.json", import.meta.url));
writeFileSync(target, JSON.stringify(out, null, 1));
console.log(`Exported ${out.missions.length} missions and ${out.drills.length} drill variants to ${target}`);
