import { expect, test } from "@playwright/test";

test("every statistical simulator renders and reacts to its controls", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/crear");
  await page.getByLabel(/Nombre/).fill("Lab");
  await page.getByRole("button", { name: "Comenzar la aventura" }).click();
  await page.getByRole("button", { name: /Saltar/ }).click();
  await page.goto("/#/labs/estadistica");
  const tabs = page.getByRole("tab");
  await expect(tabs.first()).toBeVisible();
  const n = await tabs.count();
  expect(n).toBeGreaterThanOrEqual(11);
  for (let i = 0; i < n; i++) {
    const name = (await tabs.nth(i).innerText()).trim();
    await tabs.nth(i).click();
    await expect(page.getByRole("tabpanel").locator("svg[role=img], table").first()).toBeVisible();
    // move the first slider to exercise recomputation
    const slider = page.getByRole("tabpanel").locator("input[type=range]").first();
    if (await slider.count()) await slider.fill(await slider.getAttribute("max") ?? "1");
    if (test.info().project.name === "desktop") await page.screenshot({ path: `test-results/lab-${i}-${name.replace(/\W+/g, "_")}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});

test("ML, AI and data labs work offline", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/crear");
  await page.getByLabel(/Nombre/).fill("Lab");
  await page.getByRole("button", { name: "Comenzar la aventura" }).click();
  await page.getByRole("button", { name: /Saltar/ }).click();
  const shot = async (name: string) => {
    if (test.info().project.name === "desktop") await page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
  };

  await page.goto("/#/labs/ml");
  await expect(page.getByText("Exactitud prueba")).toBeVisible();
  await page.getByLabel("Modelo", { exact: true }).selectOption("arbol");
  await expect(page.getByText("Matriz de confusión (prueba)")).toBeVisible();
  await shot("lab-ml");

  await page.goto("/#/labs/ia");
  await expect(page.getByText(/Subpalabras \(BPE\)/)).toBeVisible();
  await page.getByRole("tab", { name: "Mini RAG con citas" }).click();
  await expect(page.getByText("Respuesta con citas")).toBeVisible();
  await page.getByLabel("Pregunta").fill("¿Quién ganó el mundial de fútbol?");
  await expect(page.getByText("Respuesta (se abstiene)")).toBeVisible();
  await shot("lab-ia");

  await page.goto("/#/labs/datos");
  await expect(page.getByRole("cell", { name: "unidades" })).toBeVisible();
  await shot("lab-datos");
  expect(errors).toEqual([]);
});
