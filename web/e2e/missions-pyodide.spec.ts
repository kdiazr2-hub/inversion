// Runs every mission that needs no extra packages through the real UI and the real
// Pyodide interpreter: paste the reference solution, press "Comprobar", expect all tests green.
// Missions that import numpy/pandas/scipy… need the Pyodide CDN and are validated by pytest instead.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { servePyodideLocally } from "./pyodide";

interface M {
  id: string;
  solution: string;
  packages?: string[];
  tests: string;
}

const content = JSON.parse(readFileSync("content.json", "utf-8")) as { missions: M[] };
const solo = process.env.PQ_MISSIONS?.split(",");
// Packages from the Pyodide distribution (downloaded from the CDN on first import), whether the
// student's code or the mission's tests import them.
const CIENTIFICOS = /^\s*(?:import|from)\s+(?:numpy|pandas|scipy|sklearn|statsmodels|matplotlib|seaborn)\b/m;
const puras = content.missions.filter(
  (m) => !m.packages?.length && !CIENTIFICOS.test(m.solution) && !CIENTIFICOS.test(m.tests) && (!solo || solo.includes(m.id)),
);

test.describe.configure({ mode: "serial" });

test(`las ${puras.length} misiones de Python puro pasan en Pyodide`, async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop", "Solo en escritorio: es lento");
  test.setTimeout(30 * 60_000);
  await servePyodideLocally(context);
  const now = new Date().toISOString();
  const save = {
    version: 1,
    createdAt: now,
    profile: { name: "QA", avatar: { skin: 1, hair: "corto", hairColor: "#3b2a1e", outfit: "tunica", outfitColor: "#3b82c4", pet: null, frame: null } },
    missions: Object.fromEntries(content.missions.map((m) => [m.id, { done: now, hints: 0, sawSolution: false, attempts: 1, advancedDone: null }])),
    attempts: [],
    quizzes: [],
    reviews: [],
    activity: {},
    owned: [],
    labs: {},
    placement: null,
    certificates: {},
    settings: { editorTheme: "noche", fontSize: 15, reducedMotion: true, dailyGoalMin: 15, timeoutSec: 60, pauses: [] },
    totalRuns: 1,
  };
  await page.addInitScript((s) => localStorage.setItem("python-quest-save-v1", s), JSON.stringify(save));
  const fallos: string[] = [];
  for (const m of puras) {
    const t0 = Date.now();
    await page.goto(`/#/mision/${m.id}`);
    const editor = page.getByRole("textbox", { name: /Editor de Python/ });
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Delete");
    await page.keyboard.insertText(m.solution);
    await page.getByTestId("check").click();
    const tests = page.getByTestId("tests");
    const error = page.getByTestId("py-error");
    await expect(tests.or(error).or(page.getByRole("alert")).first()).toBeVisible({ timeout: 120_000 });
    const salida = page.getByTestId("output").or(page.getByRole("alert")).first();
    const texto = (await salida.innerText({ timeout: 5_000 }).catch(() => "")) || "";
    const m2 = texto.match(/Pruebas: (\d+) \/ (\d+)/i);
    const ok = !!m2 && m2[1] === m2[2];
    if (!ok) fallos.push(`${m.id}: ${texto.slice(0, 400)}`);
    console.log(`${ok ? "ok  " : "FALLA"} ${m.id} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
  expect(fallos, fallos.join("\n\n")).toEqual([]);
});
