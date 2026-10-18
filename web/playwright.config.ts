import { defineConfig } from "@playwright/test";

// Lets context.route() also see requests made by the service worker (offline.spec.ts serves
// Pyodide locally through it). Set before the test workers start, which inherit it.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  // Service workers are off except in offline.spec.ts, so the other tests always hit the network.
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure", serviceWorkers: "block" },
  webServer: { command: "npx vite preview --port 4173 --strictPort", port: 4173, reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 860 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
