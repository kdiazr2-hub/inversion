// The practice gym: a completed mission unlocks its drills, a variant is solved with real Python
// and pays XP once, and a due review can be done with a new variant.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { servePyodideLocally } from "./pyodide";

interface Variant {
  id: string;
  seed: number;
  solution: string;
  starter: string;
}
const content = JSON.parse(readFileSync("content.json", "utf-8")) as { drills: Variant[] };
const variant = (id: string, seed: number) => content.drills.find((d) => d.id === id && d.seed === seed)!;

async function typeCode(page: Page, code: string) {
  const editor = page.getByRole("textbox", { name: /Editor de Python/ });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
}

async function seedFromUrl(page: Page, id: string) {
  await expect(page).toHaveURL(new RegExp(`#/practica/${id}/\\d+`));
  return Number(new URL(page.url()).hash.split("/")[3]);
}

test("el gimnasio: practicar una variante, sumar XP y repasar con una variante nueva", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop", "Solo en escritorio");
  await servePyodideLocally(context);
  const now = Date.now();
  const fiveDaysAgo = new Date(now - 5 * 86_400_000).toISOString();
  const save = {
    version: 1,
    createdAt: fiveDaysAgo,
    profile: { name: "QA", avatar: { skin: 1, hair: "corto", hairColor: "#3b2a1e", outfit: "tunica", outfitColor: "#3b82c4", pet: null, frame: null } },
    missions: { "py-for": { done: fiveDaysAgo, hints: 0, sawSolution: false, attempts: 1, advancedDone: null } },
    attempts: [],
    quizzes: [],
    reviews: [],
    drills: [],
    activity: {},
    owned: [],
    labs: {},
    placement: null,
    certificates: {},
    settings: { editorTheme: "noche", fontSize: 15, reducedMotion: true, dailyGoalMin: 15, timeoutSec: 15, pauses: [] },
    totalRuns: 1,
  };
  await page.addInitScript((s) => localStorage.setItem("python-quest-save-v1", s), JSON.stringify(save));
  await page.goto("/#/gimnasio");

  const forCard = page.getByTestId("drill-card").filter({ hasText: "Acumular con for" });
  await expect(forCard.getByRole("button", { name: "Practicar" })).toBeVisible();
  await expect(page.getByTestId("drill-card").filter({ hasText: "Pensar en recursivo" })).toContainText("Se abre al completar");
  await expect(page.getByTestId("gym-xp")).toContainText("Hoy: 0 de 50 XP");

  // Practice: the starter fails, the reference solution of this variant passes.
  await forCard.getByRole("button", { name: "Practicar" }).click();
  const seed = await seedFromUrl(page, "g-bucle-for");
  const v = variant("g-bucle-for", seed);
  await expect(page.getByTestId("drill-prompt")).toContainText("cuenta(n)");
  await typeCode(page, v.starter);
  await page.getByTestId("check").click();
  await expect(page.getByTestId("tests")).toContainText("Pruebas:", { timeout: 90_000 });
  await expect(page.getByTestId("drill-solved")).toHaveCount(0);
  await typeCode(page, v.solution);
  await page.getByTestId("check").click();
  await expect(page.getByTestId("drill-solved")).toBeVisible();
  await expect(page.getByText("+5 XP")).toBeVisible();

  // "Otra variante" opens a different seed of the same drill.
  await page.getByRole("button", { name: "Otra variante" }).click();
  const other = await seedFromUrl(page, "g-bucle-for");
  expect(other).not.toBe(seed);

  await page.goto("/#/gimnasio");
  await expect(page.getByTestId("gym-xp")).toContainText("Hoy: 5 de 50 XP");

  // The review of py-for is due: do it with a new variant.
  await page.goto("/#/repaso");
  await expect(page.getByRole("heading", { name: "Pendientes hoy (1)" })).toBeVisible();
  await page.getByRole("button", { name: "Ejercicio nuevo" }).click();
  await expect(page).toHaveURL(/#\/practica\/g-bucle-for\/\d+\/repaso\/py-for$/);
  const reviewSeed = Number(new URL(page.url()).hash.split("/")[3]);
  expect(reviewSeed).not.toBe(seed);
  await typeCode(page, variant("g-bucle-for", reviewSeed).solution);
  await page.getByTestId("check").click();
  await expect(page.getByTestId("drill-solved")).toContainText("Repaso registrado.");
  await page.getByRole("link", { name: "Volver a los repasos" }).click();
  await expect(page.getByRole("heading", { name: "Pendientes hoy (0)" })).toBeVisible();

  // A quick session starts with an unlocked drill.
  await page.goto("/#/gimnasio");
  await page.getByTestId("gym-session").click();
  await seedFromUrl(page, "g-bucle-for");
});
