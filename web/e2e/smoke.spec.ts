import { expect, test } from "@playwright/test";
import { servePyodideLocally } from "./pyodide";

test("first mission end to end", async ({ page, context }) => {
  await servePyodideLocally(context);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("link", { name: "Crear mi personaje" }).click();
  await page.getByLabel(/Nombre/).fill("Ada");
  await page.getByRole("button", { name: "Comenzar la aventura" }).click();
  await expect(page.getByRole("heading", { name: /Evaluación inicial/ })).toBeVisible();
  await page.screenshot({ path: "test-results/placement.png", fullPage: true });
  await page.getByRole("button", { name: /Saltar/ }).click();
  await expect(page.getByRole("heading", { name: "Mapa de mundos" })).toBeVisible();
  await page.screenshot({ path: "test-results/map.png", fullPage: true });
  await page.goto("/#/mision/py-hola");
  await expect(page.getByRole("heading", { name: /El primer hechizo/ })).toBeVisible();
  await page.screenshot({ path: "test-results/mission.png", fullPage: true });
  expect(errors).toEqual([]);
});
