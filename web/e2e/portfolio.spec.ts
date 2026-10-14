// The Portfolio lets the learner download a finished project as a .py script and its data files.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

interface M {
  id: string;
  solution: string;
  files?: Record<string, string>;
}
const content = JSON.parse(readFileSync("content.json", "utf-8")) as { missions: M[] };
const byId = (id: string) => content.missions.find((m) => m.id === id)!;

test("el portafolio descarga el código y los datos de un proyecto", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Solo en escritorio");
  const now = new Date().toISOString();
  const last = byId("pd-servicio-4");
  const stages = ["pd-servicio-1", "pd-servicio-2", "pd-servicio-3", "pd-servicio-4"];
  const save = {
    version: 1,
    createdAt: now,
    profile: { name: "QA", avatar: { skin: 1, hair: "corto", hairColor: "#3b2a1e", outfit: "tunica", outfitColor: "#3b82c4", pet: null, frame: null } },
    missions: Object.fromEntries(
      stages.map((id) => [id, { done: now, hints: 0, sawSolution: false, attempts: 1, advancedDone: null, code: id === last.id ? last.solution : byId(id).solution, notes: id === last.id ? "Servicio probado y vigilado." : undefined }]),
    ),
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
  await page.addInitScript((s) => localStorage.setItem("python-quest-save-v1", s), JSON.stringify(save));
  await page.goto("/#/portafolio");

  const item = page.getByTestId("portfolio-item").filter({ hasText: "servicio de la torre" });
  await expect(item).toHaveCount(1);

  const [script] = await Promise.all([page.waitForEvent("download"), item.getByRole("button", { name: "Descargar código (.py)" }).click()]);
  expect(script.suggestedFilename()).toBe("proyecto_progresivo_el_servicio_de_la_torre.py");
  const text = readFileSync((await script.path())!, "utf-8");
  expect(text.startsWith("# Proyecto progresivo: el servicio de la torre\n")).toBe(true);
  expect(text).toContain("# Servicio probado y vigilado.");
  expect(text.endsWith(`\n\n${last.solution}\n`)).toBe(true);

  const [data] = await Promise.all([page.waitForEvent("download"), item.getByRole("button", { name: "Descargar clientes.csv" }).click()]);
  expect(data.suggestedFilename()).toBe("clientes.csv");
  expect(readFileSync((await data.path())!, "utf-8")).toBe(last.files!["clientes.csv"]);
});
