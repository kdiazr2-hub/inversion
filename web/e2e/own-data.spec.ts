// The free console reads the learner's own data files.
import { expect, test } from "@playwright/test";
import { FULL_DISTRIBUTION, servePyodideLocally } from "./pyodide";

test("la consola libre lee un CSV propio", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop", "Solo en escritorio");
  test.setTimeout(180_000);
  await servePyodideLocally(context);
  await page.goto("/");
  await page.getByRole("link", { name: "Crear mi personaje" }).click();
  await page.getByLabel(/Nombre/).fill("Datos");
  await page.getByRole("button", { name: "Comenzar la aventura" }).click();
  await page.getByRole("button", { name: /Saltar/ }).click();
  await page.goto("/#/labs/python");

  const box = page.getByTestId("own-files");
  const csv = "ciudad,ventas\nLima,120\nCórdoba,95\nQuito,80\n";
  await box.locator('input[type="file"]').setInputFiles([
    { name: "ventas.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf-8") },
    { name: "foto.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]) },
  ]);
  await expect(box.getByRole("status")).toContainText("ventas.csv: añadido");
  await expect(box.getByRole("status")).toContainText("foto.png: no es un archivo de texto");

  if (FULL_DISTRIBUTION) {
    await box.getByRole("button", { name: "Código para explorarlo" }).click();
  } else {
    // Without the scientific packages, read it with the standard library.
    await page.locator(".cm-content").click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Delete");
    await page.keyboard.insertText('import csv\nwith open("ventas.csv", encoding="utf-8") as f:\n    filas = list(csv.DictReader(f))\nprint(len(filas), filas[1]["ciudad"], sum(int(r["ventas"]) for r in filas))');
  }
  await page.getByRole("button", { name: "▶ Ejecutar" }).click();
  const out = page.getByTestId("stdout");
  await expect(out).toContainText(FULL_DISTRIBUTION ? "(3, 2)" : "3 Córdoba 295", { timeout: 150_000 });
});
