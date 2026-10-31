// The guide "Programar en tu ordenador" shows the commands of the chosen operating system.
import { expect, test } from "@playwright/test";

test("la guía muestra las órdenes del sistema elegido", async ({ page }) => {
  const now = new Date().toISOString();
  const save = {
    version: 1,
    createdAt: now,
    profile: { name: "QA", avatar: { skin: 1, hair: "corto", hairColor: "#3b2a1e", outfit: "tunica", outfitColor: "#3b82c4", pet: null, frame: null } },
    missions: {},
    attempts: [],
    quizzes: [],
    reviews: [],
    activity: {},
    owned: [],
    labs: {},
    placement: null,
    certificates: {},
    settings: { editorTheme: "noche", fontSize: 15, reducedMotion: true, dailyGoalMin: 15, timeoutSec: 15, pauses: [] },
    totalRuns: 0,
  };
  await page.addInitScript((s) => localStorage.setItem("python-quest-save-v1", s), JSON.stringify(save));
  await page.goto("/#/entorno");
  await expect(page.getByRole("heading", { name: "Programar en tu ordenador" })).toBeVisible();

  await page.getByRole("tab", { name: "Windows" }).click();
  await expect(page.getByText("winget install Python.Python.3.13")).toBeVisible();
  await expect(page.getByText(".venv\\Scripts\\Activate.ps1").first()).toBeVisible();

  await page.getByRole("tab", { name: "macOS" }).click();
  await expect(page.getByRole("tab", { name: "macOS" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("brew install python@3.13")).toBeVisible();
  await expect(page.getByText("winget install Python.Python.3.13")).toHaveCount(0);

  // The choice is remembered.
  await page.reload();
  await expect(page.getByRole("tab", { name: "macOS" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("link", { name: "La consola del refugio: la terminal, las rutas y los archivos" }).click();
  await expect(page).toHaveURL(/#\/mision\/w2-terminal$/);
});
