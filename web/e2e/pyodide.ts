// The CDN is not reachable from CI sandboxes: serve Pyodide from a local copy instead.
// By default that is the core in node_modules (pure Python only). With PYODIDE_DIST pointing at a
// full distribution (pyodide-0.28.3.tar.bz2 from the GitHub releases, extracted) the scientific
// packages are served too.
import type { BrowserContext } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOCAL = process.env.PYODIDE_DIST ?? join(process.cwd(), "node_modules", "pyodide");
export const FULL_DISTRIBUTION = Boolean(process.env.PYODIDE_DIST);

export async function servePyodideLocally(context: BrowserContext) {
  await context.route(/cdn\.jsdelivr\.net\/pyodide\/v[\d.]+\/full\/(.+)$/, async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop()!;
    const file = join(LOCAL, name);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "not available offline" });
    const type = name.endsWith(".wasm") ? "application/wasm" : name.endsWith(".json") ? "application/json" : /\.(zip|whl|tar)$/.test(name) ? "application/zip" : "text/javascript";
    await route.fulfill({ status: 200, body: readFileSync(file), headers: { "content-type": type, "access-control-allow-origin": "*" } });
  });
}
