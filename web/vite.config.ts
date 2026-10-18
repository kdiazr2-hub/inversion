import { defineConfig } from "vitest/config";
import { loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pyodideUrl } from "./src/python/pyodideUrl";

/**
 * Emits sw.js: the service worker template (sw/service-worker.js) preceded by this build's
 * configuration, so the worker precaches exactly the files of the build it belongs to.
 */
function serviceWorker(pyodide: string): Plugin {
  return {
    name: "pq-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      // Fonts are left out: the CSS lists every subset and the browser only fetches the ones a page uses.
      const precache = Object.keys(bundle)
        .filter((f) => /\.(js|css)$/.test(f))
        .sort();
      const build = createHash("sha256").update(precache.join("\n")).digest("hex").slice(0, 12);
      const template = readFileSync(fileURLToPath(new URL("./sw/service-worker.js", import.meta.url)), "utf-8");
      const config = JSON.stringify({ build, precache, pyodide });
      this.emitFile({ type: "asset", fileName: "sw.js", source: `const CONFIG = ${config};\n${template}` });
    },
  };
}

// `base` is relative so the built app works from any folder (GitHub Pages, file server, subpath).
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react(), serviceWorker(pyodideUrl(loadEnv(mode, process.cwd(), "VITE_").VITE_PYODIDE_URL))],
  resolve: {
    alias: { "@harness": fileURLToPath(new URL("../harness", import.meta.url)) },
  },
  server: { fs: { allow: [".."] } },
  worker: { format: "iife" },
  build: {
    rollupOptions: {
      output: {
        // Libraries and the mission catalog change at different times than the app code, so each
        // gets its own long-cached file; mission content and CodeMirror load on demand.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler|zod)\//.test(id)) return "vendor";
          if (id.includes("/content/catalog.generated")) return "catalog";
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
}));
