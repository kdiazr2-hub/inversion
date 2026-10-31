// Keeping the progress: the reminder on the home screen and the automatic copy to a file.
// Playwright cannot answer the browser's "save as" dialog, so showSaveFilePicker is replaced by a
// file of the origin private file system: a real FileSystemFileHandle that the game stores in
// IndexedDB and writes with createWritable, exactly as with a file the learner picks.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const now = new Date().toISOString();
const done = { done: now, hints: 0, sawSolution: false, attempts: 1, advancedDone: null };
const save = {
  version: 1,
  createdAt: now,
  profile: { name: "QA", avatar: { skin: 1, hair: "corto", hairColor: "#3b2a1e", outfit: "tunica", outfitColor: "#3b82c4", pet: null, frame: null } },
  missions: { "py-hola": done, "py-variables": done, "py-tipos": done },
  attempts: [],
  quizzes: [],
  reviews: [],
  activity: {},
  owned: [],
  labs: {},
  placement: null,
  certificates: {},
  settings: { editorTheme: "noche", fontSize: 15, reducedMotion: true, dailyGoalMin: 15, timeoutSec: 15, pauses: [] },
  totalRuns: 3,
};

test("recordatorio de copia y copia automática a un archivo", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "La copia automática es de navegadores de escritorio");
  test.setTimeout(60_000);
  await page.addInitScript((s) => {
    if (!localStorage.getItem("python-quest-save-v1")) localStorage.setItem("python-quest-save-v1", s);
    (window as unknown as { showSaveFilePicker: () => Promise<FileSystemFileHandle> }).showSaveFilePicker = async () => (await navigator.storage.getDirectory()).getFileHandle("copia.json", { create: true });
  }, JSON.stringify(save));
  const readCopy = () => page.evaluate(async () => (await (await (await navigator.storage.getDirectory()).getFileHandle("copia.json")).getFile()).text());

  await page.goto("/#/");
  const reminder = page.getByTestId("backup-reminder");
  await expect(reminder).toContainText("Todavía no has guardado ninguna copia");
  const [file] = await Promise.all([page.waitForEvent("download"), reminder.getByRole("button", { name: "Descargar copia" }).click()]);
  expect(JSON.parse(readFileSync((await file.path())!, "utf-8")).save.missions["py-tipos"].done).toBe(now);
  await expect(reminder).toHaveCount(0);

  await page.goto("/#/ajustes");
  const panel = page.getByTestId("backup");
  await expect(panel).toContainText("Última copia:");
  await panel.getByRole("button", { name: "Activar copia automática" }).click();
  await expect(panel).toContainText("Copia automática activa.");
  expect(JSON.parse(await readCopy()).save.missions["py-hola"].done).toBe(now);

  // A later change reaches the file a few seconds after it happens, also after a reload.
  await page.reload();
  await page.goto("/#/mision/py-hola");
  const box = page.getByTestId("mission-feedback");
  await box.getByRole("radio", { name: "Clara" }).click();
  await box.getByRole("button", { name: "Guardar opinión" }).click();
  await expect.poll(async () => JSON.parse(await readCopy()).save.feedback?.["py-hola"]?.clarity, { timeout: 15_000 }).toBe("clara");
});
