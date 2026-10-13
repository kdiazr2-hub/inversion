import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// `base` is relative so the built app works from any folder (GitHub Pages, file server, subpath).
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "@harness": fileURLToPath(new URL("../harness", import.meta.url)) },
  },
  server: { fs: { allow: [".."] } },
  worker: { format: "iife" },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
