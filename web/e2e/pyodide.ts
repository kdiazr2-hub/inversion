// The CDN is not reachable from CI sandboxes: serve Pyodide's core files from node_modules.
// Scientific packages (numpy, pandas…) are only available when the real CDN is reachable.
import type { BrowserContext } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOCAL = join(process.cwd(), "node_modules", "pyodide");

export async function servePyodideLocally(context: BrowserContext) {
  await context.route(/cdn\.jsdelivr\.net\/pyodide\/v[\d.]+\/full\/(.+)$/, async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop()!;
    const file = join(LOCAL, name);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "not available offline" });
    const type = name.endsWith(".wasm") ? "application/wasm" : name.endsWith(".json") ? "application/json" : name.endsWith(".zip") ? "application/zip" : "text/javascript";
    await route.fulfill({ status: 200, body: readFileSync(file), headers: { "content-type": type, "access-control-allow-origin": "*" } });
  });
}
