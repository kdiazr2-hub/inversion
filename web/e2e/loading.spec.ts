// Mission content loads per world: the home page downloads none of it, and a failed download
// shows the error and a reload instead of a blank screen.
import { expect, test, type Page } from "@playwright/test";

const MISSION_CHUNK = /\/assets\/(w\d[\w-]*|proj-[\w-]+)-[\w-]{8}\.js$/;

async function createHero(page: Page) {
  await page.goto("/#/crear");
  await page.getByLabel(/Nombre/).fill("Ada");
  await page.getByRole("button", { name: "Comenzar la aventura" }).click();
  await page.getByRole("button", { name: /Saltar/ }).click();
  await expect(page.getByRole("heading", { name: "Mapa de mundos" })).toBeVisible();
}

test("el mapa y el inicio no descargan el contenido de las misiones", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Solo en escritorio");
  const chunks: string[] = [];
  page.on("request", (r) => {
    if (MISSION_CHUNK.test(new URL(r.url()).pathname)) chunks.push(r.url());
  });
  await createHero(page);
  await page.goto("/#/");
  await expect(page.getByText("Próxima misión recomendada")).toBeVisible();
  await page.goto("/#/progreso");
  await expect(page.getByRole("heading", { name: "Estadísticas de progreso" })).toBeVisible();
  expect(chunks).toEqual([]);

  // Opening a mission of world 1 downloads world 1's files and nothing from other worlds.
  await page.goto("/#/mision/py-hola");
  await page.locator("#historia").waitFor({ state: "attached" });
  const names = chunks.map((u) => new URL(u).pathname.split("/").pop()!.replace(/-[\w-]{8}\.js$/, ""));
  expect(names.sort()).toEqual(["proj-preguntas", "w1-basics-a", "w1-basics-b"]);
});

test("si falla la descarga de un mundo se muestra el error y recargar lo resuelve", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Solo en escritorio");
  await createHero(page);
  let block = true;
  await page.route(MISSION_CHUNK, (route) => (block ? route.abort("internetdisconnected") : route.continue()));
  await page.goto("/#/mision/py-hola");
  await expect(page.getByRole("heading", { name: "No se pudo cargar la misión" })).toBeVisible();
  block = false;
  await page.getByRole("button", { name: "Recargar la página" }).click();
  await expect(page.locator("#historia")).toBeAttached();
  await expect(page.getByRole("heading", { name: "El primer hechizo: print()" })).toBeVisible();
});
