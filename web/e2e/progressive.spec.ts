// A progressive project in the real UI: stage 1 is solved, the Projects screen shows the progress
// and stage 2 opens with the learner's stage-1 code followed by the new skeleton.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { FULL_DISTRIBUTION, servePyodideLocally } from "./pyodide";

interface M {
  id: string;
  solution: string;
  starter: string;
}
const content = JSON.parse(readFileSync("content.json", "utf-8")) as { missions: M[] };
const byId = (id: string) => content.missions.find((m) => m.id === id)!;

test("un proyecto progresivo arrastra el código de una etapa a la siguiente", async ({ page, context }, info) => {
  test.skip(!FULL_DISTRIBUTION, "Necesita pandas: define PYODIDE_DIST con una distribución completa de Pyodide");
  test.skip(info.project.name !== "desktop", "Solo en escritorio");
  test.setTimeout(10 * 60_000);
  await servePyodideLocally(context);
  const now = new Date().toISOString();
  const stage = /^pa-sensores-/;
  const save = {
    version: 1,
    createdAt: now,
    profile: { name: "QA", avatar: { skin: 1, hair: "corto", hairColor: "#3b2a1e", outfit: "tunica", outfitColor: "#3b82c4", pet: null, frame: null } },
    missions: Object.fromEntries(content.missions.filter((m) => !stage.test(m.id)).map((m) => [m.id, { done: now, hints: 0, sawSolution: false, attempts: 1, advancedDone: null }])),
    attempts: [],
    quizzes: [],
    reviews: [],
    activity: {},
    owned: [],
    labs: {},
    placement: null,
    certificates: {},
    settings: { editorTheme: "noche", fontSize: 15, reducedMotion: true, dailyGoalMin: 15, timeoutSec: 15, pauses: [] },
    totalRuns: 1,
  };
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("pq-seeded")) {
      localStorage.setItem("python-quest-save-v1", s);
      sessionStorage.setItem("pq-seeded", "1");
    }
  }, JSON.stringify(save));
  const editor = page.getByRole("textbox", { name: /Editor de Python/ });
  const replaceCode = async (code: string) => {
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Delete");
    await page.keyboard.insertText(code);
  };
  const check = async () => {
    await page.getByTestId("check").click();
    await expect(page.getByTestId("tests").or(page.getByTestId("py-error")).first()).toBeVisible({ timeout: 180_000 });
    return page.getByTestId("output").innerText();
  };
  const dismiss = async () => {
    const cont = page.getByRole("button", { name: "Continuar" });
    while (await cont.isVisible().catch(() => false)) await cont.click();
  };

  // Stage 1
  await page.goto("/#/mision/pa-sensores-1");
  await expect(page.getByRole("navigation", { name: "Etapas del proyecto" })).toContainText("Etapa 1 de 4");
  await replaceCode(byId("pa-sensores-1").solution);
  expect(await check()).toMatch(/Pruebas: 4 \/ 4/i);
  await dismiss();

  // Projects screen shows the progress.
  await page.goto("/#/proyectos");
  const card = page.getByTestId("series-card").filter({ hasText: "detector de anomalías" });
  await expect(card.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  await expect(card.getByRole("link", { name: "Continuar: etapa 2" })).toBeVisible();

  // Stage 2 starts from the learner's stage-1 code plus the new skeleton.
  await card.getByRole("link", { name: "Continuar: etapa 2" }).click();
  await expect(page.getByTestId("stage-carry")).toBeVisible();
  // CodeMirror only renders the visible lines: read the whole document from the editor state.
  const text = await editor.evaluate((el) => (el as unknown as { cmView: { view: { state: { doc: { toString(): string } } } } }).cmView.view.state.doc.toString());
  expect(text).toContain("def regularizar(df, max_hueco=3):");
  expect(text).toContain("def z_robusto(x):");
  const parcial = await check();
  // The carried code plus the skeleton runs; only the new tests fail.
  await expect(page.getByTestId("py-error")).toHaveCount(0);
  const m = parcial.match(/Pruebas: (\d+) \/ (\d+)/i)!;
  expect(Number(m[1])).toBeLessThan(Number(m[2]));

  await replaceCode(byId("pa-sensores-2").solution);
  await page.getByTestId("check").click();
  await expect(page.getByTestId("output")).toContainText(/Pruebas: 4 \/ 4/i, { timeout: 180_000 });
});
