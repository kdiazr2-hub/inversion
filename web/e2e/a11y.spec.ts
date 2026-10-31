// Automated accessibility audit (axe-core, WCAG 2.0–2.2 A and AA rules) of every screen.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

interface M {
  id: string;
  solution: string;
}
const content = JSON.parse(readFileSync("content.json", "utf-8")) as { missions: M[] };
const byId = (id: string) => content.missions.find((m) => m.id === id)!;

function save() {
  const now = new Date().toISOString();
  const done = (id: string) => [id, { done: now, hints: 0, sawSolution: false, attempts: 1, advancedDone: null, code: byId(id).solution }];
  const stages = ["pd-servicio-1", "pd-servicio-2", "pd-servicio-3", "pd-servicio-4"];
  return {
    version: 1,
    createdAt: now,
    profile: { name: "QA", avatar: { skin: 1, hair: "corto", hairColor: "#3b2a1e", outfit: "tunica", outfitColor: "#3b82c4", pet: null, frame: null } },
    missions: Object.fromEntries([...content.missions.slice(0, 6).map((m) => m.id), ...stages].map(done)),
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
}

async function audit(page: Page, route: string) {
  await page.goto(`/#/${route}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  // The audit really looked at the screen: rules such as colour contrast were checked on its content.
  expect(result.passes.length, `${route}: axe no comprobó nada`).toBeGreaterThan(10);
  expect(result.passes.some((p) => p.id === "color-contrast") || result.incomplete.some((p) => p.id === "color-contrast")).toBe(true);
  return result.violations.map((v) => `${route || "inicio"} · ${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.slice(0, 4).map((n) => n.target.join(" ") + " — " + n.failureSummary?.split("\n").slice(1, 2).join("")).join("\n    ")}`);
}

const first = content.missions[0]!.id;
const ROUTES = ["", "mapa", "mundo/w1", `mision/${first}`, "gimnasio", "repaso", "labs", "labs/estadistica", "labs/ml", "labs/python", "proyectos", "progreso", "inventario", "portafolio", "certificados", "ajustes", "entorno"];

test("las pantallas no tienen fallos de accesibilidad detectables", async ({ page }) => {
  test.setTimeout(120_000);
  const found: string[] = [];
  found.push(...(await audit(page, "")));
  await page.addInitScript((s) => localStorage.setItem("python-quest-save-v1", s), JSON.stringify(save()));
  for (const route of ROUTES) found.push(...(await audit(page, route)));
  expect(found, found.join("\n")).toEqual([]);
});

test("el editor de código se puede abandonar con el teclado", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Teclado físico: escritorio");
  await page.addInitScript((s) => localStorage.setItem("python-quest-save-v1", s), JSON.stringify(save()));
  await page.goto(`/#/mision/${first}`);
  const editor = page.locator(".cm-content").first();
  await editor.click();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveAttribute("aria-describedby", /.+/);
  // Tab indents inside the editor…
  await page.keyboard.press("Tab");
  await expect(editor).toBeFocused();
  // …and Escape followed by Tab moves the focus to the next control.
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  await expect(editor).not.toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toMatch(/BUTTON|A|INPUT|SELECT|TEXTAREA/);
});

test("los puntos del laboratorio de regresión se añaden sin ratón", async ({ page }) => {
  await page.addInitScript((s) => localStorage.setItem("python-quest-save-v1", s), JSON.stringify(save()));
  await page.goto("/#/labs/estadistica/regresion");
  await page.getByRole("button", { name: "Restaurar datos" }).click();
  await page.getByRole("button", { name: "Ver tabla" }).first().click();
  const rows = page.locator("table tbody tr");
  await expect(rows.first()).toBeVisible();
  const before = await rows.count();
  await page.getByLabel("x (0 a 10)").fill("9,5");
  await page.getByLabel("y (0 a 10)").fill("1");
  await page.getByLabel("y (0 a 10)").press("Enter");
  await expect(rows).toHaveCount(before + 1);
  await page.getByRole("button", { name: "Quitar el último punto" }).click();
  await expect(rows).toHaveCount(before);
});

test("las pantallas caben en 320 px de ancho sin desplazamiento horizontal", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Basta con una pasada");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript((s) => localStorage.setItem("python-quest-save-v1", s), JSON.stringify(save()));
  const wide: string[] = [];
  const labs = ["labs/estadistica/regresion", "labs/matematicas", "labs/datos", "labs/ia", "practica/g-rutas/1"];
  for (const route of [...ROUTES, ...labs]) {
    await page.goto(`/#/${route}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    if (width > 320) wide.push(`${route || "inicio"}: ${width} px`);
  }
  expect(wide, wide.join("\n")).toEqual([]);
});
