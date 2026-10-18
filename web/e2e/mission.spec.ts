import { expect, test, type Page } from "@playwright/test";
import { servePyodideLocally } from "./pyodide";

async function createHero(page: Page) {
  await page.goto("/#/crear");
  await page.getByLabel(/Nombre/).fill("Ada");
  await page.getByRole("button", { name: "Comenzar la aventura" }).click();
  await page.getByRole("button", { name: /Saltar/ }).click();
  await expect(page.getByRole("heading", { name: "Mapa de mundos" })).toBeVisible();
}

async function dismissCelebrations(page: Page) {
  const btn = page.getByRole("button", { name: "Continuar" });
  for (let i = 0; i < 5 && (await btn.isVisible()); i++) await btn.click();
}

/** Opens a mission and waits for its content, which loads with its world. */
async function openMission(page: Page, path: string) {
  await page.goto(`/#/mision/${path}`);
  await page.locator("#historia").waitFor({ state: "attached" });
}

async function typeCode(page: Page, code: string) {
  await dismissCelebrations(page);
  const editor = page.getByRole("textbox", { name: /Editor de Python/ });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  // insertText avoids auto-closing brackets and auto-indent interfering with typed code
  await page.keyboard.insertText(code);
}

test("solve the first mission with real Python, earn rewards, survive a reload", async ({ page, context }) => {
  await servePyodideLocally(context);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await createHero(page);
  await openMission(page, "py-hola");
  const code = page.locator("main");
  if (await page.getByRole("tab", { name: "Código" }).isVisible()) await page.getByRole("tab", { name: "Código" }).click();

  // A wrong program: tests run and fail with readable messages.
  await typeCode(page, 'print("hola")');
  await page.getByTestId("check").click();
  await expect(page.getByTestId("tests")).toContainText("Pruebas: 1 / 3", { timeout: 90_000 });

  // A syntax error is explained in Spanish with its line number.
  await typeCode(page, 'print("Hola, Python!"\n');
  await dismissCelebrations(page);
  await page.getByRole("button", { name: /Ejecutar$/ }).first().click();
  await expect(page.getByTestId("py-error")).toContainText("SyntaxError");

  // The correct program completes the mission.
  await typeCode(page, 'print("Hola, Python!")\nprint("Mi aventura empieza hoy")');
  await dismissCelebrations(page);
  await page.getByTestId("check").click();
  await expect(page.getByRole("heading", { name: "¡Misión completada!" })).toBeVisible();
  await page.screenshot({ path: `test-results/complete-${test.info().project.name}.png` });
  await dismissCelebrations(page);
  await expect(code).toContainText("Misión completada");

  // Interpretation question appears after solving.
  await openMission(page, "py-hola");
  if (await page.getByRole("tab", { name: "Lección" }).isVisible()) await page.getByRole("tab", { name: "Lección" }).click();
  await page.getByRole("radio", { name: "De arriba abajo, una tras otra" }).click();
  await page.getByRole("button", { name: "Responder" }).click();
  await expect(page.getByText("+10 XP por acertar al primer intento")).toBeVisible();

  // Progress persists across reloads; the next mission is unlocked.
  await page.reload();
  await page.goto("/#/mundo/w1");
  await expect(page.getByRole("link", { name: /Cofres con nombre/ })).toBeVisible();
  await page.goto("/#/progreso");
  await expect(page.getByText("Misiones completadas", { exact: true }).locator("..")).toContainText("1");
  await page.screenshot({ path: `test-results/progress-${test.info().project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test("infinite loops are stopped and the interpreter recovers", async ({ page, context }) => {
  await servePyodideLocally(context);
  await createHero(page);
  await page.goto("/#/ajustes");
  await page.getByLabel("Tiempo máximo de ejecución").selectOption("5");
  await page.goto("/#/labs/python");
  const editor = page.getByRole("textbox", { name: /Consola libre/ });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText("while True:\n    pass");
  await page.getByRole("button", { name: /Ejecutar/ }).click();
  await expect(page.getByRole("alert")).toContainText("tardó más de 5 s", { timeout: 90_000 });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText("print(sum(range(10)))");
  await page.getByRole("button", { name: /Ejecutar/ }).click();
  await expect(page.getByTestId("stdout")).toHaveText("45", { timeout: 90_000 });
});
