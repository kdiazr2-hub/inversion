// The opinion given in a mission is kept and exported from Ajustes as CSV.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("la opinión de una misión se guarda y se exporta", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Solo en escritorio");
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
  await page.addInitScript((s) => {
    if (!localStorage.getItem("python-quest-save-v1")) localStorage.setItem("python-quest-save-v1", s);
  }, JSON.stringify(save));
  await page.goto("/#/mision/py-hola");
  const box = page.getByTestId("mission-feedback");
  await box.getByRole("radio", { name: "Confusa" }).click();
  await box.getByRole("radio", { name: "Difícil" }).click();
  await box.getByLabel("¿Dónde te atascaste o qué no se entendía?").fill('No sé qué hace "print", la verdad');
  await box.getByRole("button", { name: "Guardar opinión" }).click();
  await expect(box.getByRole("status")).toHaveText("Guardada. ¡Gracias!");

  await page.reload();
  await expect(page.getByTestId("mission-feedback").getByRole("radio", { name: "Confusa" })).toHaveAttribute("aria-checked", "true");

  await page.goto("/#/ajustes");
  const pilot = page.getByTestId("pilot");
  await expect(pilot).toContainText("Opiniones guardadas: 1.");
  const [file] = await Promise.all([page.waitForEvent("download"), pilot.getByRole("button", { name: "Descargar opiniones (.csv)" }).click()]);
  const csv = readFileSync((await file.path())!, "utf-8");
  const [head, row] = csv.replace(/^﻿/, "").trim().split("\r\n");
  expect(head).toBe("mision,titulo,mundo,claridad,dificultad,atasco,comprobaciones,pistas,vio_solucion,completada,fecha");
  expect(row).toContain('py-hola,');
  expect(row).toContain(',confusa,dificil,"No sé qué hace ""print"", la verdad",0,0,false,false,');
});
