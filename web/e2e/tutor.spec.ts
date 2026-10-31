// The optional tutor. The Anthropic API is replaced by a recorded-shape SSE response, so the test
// spends nothing and checks what the browser sends: the learner's key, the model, the mission and
// the code, and never the reference solution.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const content = JSON.parse(readFileSync("content.json", "utf-8")) as { missions: { id: string; solution: string; title: string }[] };
const mission = content.missions.find((m) => m.id === "py-variables")!;
const KEY = "sk-ant-api03-prueba-no-es-una-clave-real";

function sse(text: string, stop = "end_turn") {
  const ev = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
  const msg = { id: "msg_prueba", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } };
  const half = Math.ceil(text.length / 2);
  return [
    ev("message_start", { message: msg }),
    ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }),
    ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: text.slice(0, half) } }),
    ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: text.slice(half) } }),
    ev("content_block_stop", { index: 0 }),
    ev("message_delta", { delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 12 } }),
    ev("message_stop", {}),
  ].join("");
}

test("el tutor responde con pistas usando la clave propia", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Solo en escritorio");
  const now = new Date().toISOString();
  const save = {
    version: 1,
    createdAt: now,
    profile: { name: "QA", avatar: { skin: 1, hair: "corto", hairColor: "#3b2a1e", outfit: "tunica", outfitColor: "#3b82c4", pet: null, frame: null } },
    missions: { "py-hola": { done: now, hints: 0, sawSolution: false, attempts: 1, advancedDone: null } },
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
  await page.addInitScript((s) => {
    if (!localStorage.getItem("python-quest-save-v1")) localStorage.setItem("python-quest-save-v1", s);
  }, JSON.stringify(save));
  const requests: { headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  let reply = sse("Mira qué tipo devuelve `input()`: ¿es un número o un texto?");
  await page.route("https://api.anthropic.com/v1/messages*", async (route) => {
    const r = route.request();
    if (r.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST" } });
    requests.push({ headers: r.headers(), body: r.postDataJSON() });
    await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream", "access-control-allow-origin": "*" }, body: reply });
  });

  // Without a key the mission only points to Ajustes.
  await page.goto(`/#/mision/${mission.id}`);
  await expect(page.getByTestId("tutor")).toContainText("Puedes activarlo en Ajustes");

  await page.goto("/#/ajustes");
  const settings = page.getByTestId("tutor-settings");
  await settings.getByLabel("Clave de la API de Anthropic").fill("no-es-una-clave");
  await settings.getByRole("button", { name: "Activar tutor" }).click();
  await expect(settings).not.toContainText("Tutor activado.");
  await settings.getByLabel("Clave de la API de Anthropic").fill(KEY);
  await settings.getByRole("button", { name: "Activar tutor" }).click();
  await expect(settings).toContainText("Tutor activado.");

  await page.goto(`/#/mision/${mission.id}`);
  const tutor = page.getByTestId("tutor");
  await tutor.getByText("Pregunta al tutor").click();
  await tutor.getByLabel("Tu pregunta").fill("¿Por qué no me suma los números?");
  await tutor.getByRole("button", { name: "Preguntar" }).click();
  await expect(tutor.getByRole("list", { name: "Conversación con el tutor" })).toContainText("¿es un número o un texto?");

  expect(requests).toHaveLength(1);
  const { headers, body } = requests[0]!;
  expect(headers["x-api-key"]).toBe(KEY);
  expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
  expect(headers["anthropic-beta"]).toContain("server-side-fallback-2026-07-01");
  expect(body.model).toBe("claude-opus-5-5");
  expect(body.stream).toBe(true);
  expect(body.fallbacks).toBe("default");
  const sent = JSON.stringify(body);
  expect(sent).toContain(mission.title);
  expect(sent).toContain("¿Por qué no me suma los números?");
  expect(sent).not.toContain(mission.solution.trim());

  // A second question carries the conversation; a refusal is reported, not shown as an answer.
  reply = sse("", "refusal");
  await tutor.getByLabel("Tu pregunta").fill("Dame la solución");
  await tutor.getByRole("button", { name: "Preguntar" }).click();
  await expect(tutor.getByRole("alert")).toContainText("no puede responder");
  expect((requests[1]!.body.messages as unknown[]).length).toBe(4);

  // A rejected key is explained.
  await page.unroute("https://api.anthropic.com/v1/messages*");
  await page.route("https://api.anthropic.com/v1/messages*", (route) =>
    route.fulfill({ status: 401, headers: { "content-type": "application/json", "access-control-allow-origin": "*" }, body: JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }) }),
  );
  await tutor.getByRole("button", { name: "Preguntar" }).click();
  await expect(tutor.getByRole("alert")).toContainText("La clave de la API no es válida");
});
