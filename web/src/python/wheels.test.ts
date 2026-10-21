import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WHEELS } from "./wheels";

describe("ruedas incluidas en el juego", () => {
  it("cada rueda declarada está en public/wheels y el validador usa las mismas", () => {
    const validador = readFileSync("scripts/validate-pyodide.mjs", "utf-8");
    for (const [mod, file] of Object.entries(WHEELS)) {
      expect(existsSync(`public/wheels/${file}`), file).toBe(true);
      expect(validador.includes(`${mod}: "${file}"`), `validate-pyodide.mjs debe instalar ${file}`).toBe(true);
    }
  });
});
