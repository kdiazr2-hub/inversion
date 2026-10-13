// Writes all missions to web/content.json so pytest can validate them under CPython.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MISSIONS, WORLDS } from "../src/content";
import { text } from "../src/content/types";

const out = {
  worlds: WORLDS.map((w) => ({ id: w.id, unlock: w.unlock })),
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
};
const target = fileURLToPath(new URL("../content.json", import.meta.url));
writeFileSync(target, JSON.stringify(out, null, 1));
console.log(`Exported ${out.missions.length} missions to ${target}`);
