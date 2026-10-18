// With the service worker, a mission already opened (with Python) works after going offline.
import { expect, test, type Page } from "@playwright/test";
import { servePyodideLocally } from "./pyodide";

test.use({ serviceWorkers: "allow" });

async function createHero(page: Page) {
  await page.goto("/#/crear");
  await page.getByLabel(/Nombre/).fill("Ada");
  await page.getByRole("button", { name: "Comenzar la aventura" }).click();
  await page.getByRole("button", { name: /Saltar/ }).click();
  await expect(page.getByRole("heading", { name: "Mapa de mundos" })).toBeVisible();
}

async function runFirstMission(page: Page) {
  await page.goto("/#/mision/py-hola");
  await page.locator("#historia").waitFor({ state: "attached" });
  const editor = page.getByRole("textbox", { name: /Editor de Python/ });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText('print("sin red", 6 * 7)');
  await page.getByRole("button", { name: /Ejecutar$/ }).first().click();
  await expect(page.getByTestId("stdout")).toContainText("sin red 42", { timeout: 90_000 });
}

test("una misión ya abierta funciona sin conexión", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop", "Solo en escritorio");
  await servePyodideLocally(context);
  await createHero(page);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 60_000 });
  // The Python worker started during the first visit predates the service worker, so Pyodide is
  // stored from the next load on.
  await page.reload();
  await runFirstMission(page);

  // From here on nothing serves Pyodide but the service worker's cache.
  await context.unrouteAll({ behavior: "ignoreErrors" });
  await context.setOffline(true);
  await page.reload();
  await runFirstMission(page);
  await page.goto("/#/ajustes");
  await expect(page.getByTestId("offline")).toContainText("Activo.");
  await expect(page.getByTestId("offline")).toContainText(/Archivos de Python y paquetes guardados: [1-9]/);
});
