// Main-thread facade over the Pyodide worker: one run at a time, hard timeout by
// terminating the worker (the only reliable way to stop an infinite loop in the browser).
import harnessSource from "@harness/pq_harness.py?raw";
import type { RunRequest, RunResult, WorkerOut } from "./types";

import { pyodideUrl, PYODIDE_VERSION } from "./pyodideUrl";
import { WHEELS } from "./wheels";

export { PYODIDE_VERSION };
export const PYODIDE_URL: string = pyodideUrl(import.meta.env.VITE_PYODIDE_URL as string | undefined);

export type RunnerState = "idle" | "loading" | "ready" | "packages" | "running" | "error";

type Listener = (state: RunnerState, detail?: string) => void;

interface Pending {
  id: number;
  resolve: (r: RunResult) => void;
  reject: (e: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
}

export class RunTimeout extends Error {}
export class RunStopped extends Error {}

class PythonRunner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private pending: Pending | null = null;
  private seq = 0;
  private listeners = new Set<Listener>();
  state: RunnerState = "idle";
  detail = "";
  version = "";
  timeoutMs = 15000;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.state, this.detail);
    return () => this.listeners.delete(fn);
  }

  private set(state: RunnerState, detail = "") {
    this.state = state;
    this.detail = detail;
    this.listeners.forEach((l) => l(state, detail));
  }

  /** Start loading Pyodide (idempotent). */
  boot(): Promise<void> {
    if (this.ready) return this.ready;
    this.set("loading", "Descargando el intérprete de Python…");
    const worker = new Worker(new URL("./worker.ts", import.meta.url));
    this.worker = worker;
    this.ready = new Promise<void>((resolve, reject) => {
      worker.onmessage = (ev: MessageEvent<WorkerOut>) => {
        const msg = ev.data;
        if (msg.kind === "ready") {
          this.version = msg.version;
          this.set("ready");
          resolve();
        } else if (msg.kind === "init-error") {
          this.set("error", msg.message);
          this.ready = null;
          reject(new Error(msg.message));
        } else this.onRunMessage(msg);
      };
      worker.onerror = (e) => {
        this.set("error", e.message || "No se pudo iniciar el worker de Python");
        this.ready = null;
        reject(new Error(e.message));
      };
    });
    // Bundled wheels are served next to the app: resolve them against the page, not the worker.
    const wheels = Object.fromEntries(Object.entries(WHEELS).map(([mod, file]) => [mod, new URL(`wheels/${file}`, document.baseURI).href]));
    worker.postMessage({ kind: "init", indexURL: PYODIDE_URL, harness: harnessSource, wheels });
    return this.ready;
  }

  private onRunMessage(msg: WorkerOut) {
    const p = this.pending;
    if (!p || !("id" in msg) || msg.id !== p.id) return;
    if (msg.kind === "status") {
      if (msg.phase === "packages") this.set("packages", msg.detail);
      else {
        this.set("running");
        // The clock starts once packages are in place: downloads must not count as an infinite loop.
        p.timer = setTimeout(() => this.kill(new RunTimeout(`Tu programa tardó más de ${this.timeoutMs / 1000} s. ¿Hay un bucle infinito?`)), this.timeoutMs);
      }
    } else if (msg.kind === "result") {
      this.finish();
      p.resolve(msg.result);
    } else if (msg.kind === "run-error") {
      this.finish();
      p.reject(new Error(msg.message));
    }
  }

  private finish() {
    if (this.pending?.timer) clearTimeout(this.pending.timer);
    this.pending = null;
    this.set("ready");
  }

  private kill(err: Error) {
    const p = this.pending;
    if (p?.timer) clearTimeout(p.timer);
    this.pending = null;
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this.set("idle");
    p?.reject(err);
    void this.boot(); // warm a fresh interpreter for the next run
  }

  stop() {
    if (this.pending) this.kill(new RunStopped("Ejecución detenida."));
  }

  get busy() {
    return this.pending !== null;
  }

  async run(req: RunRequest): Promise<RunResult> {
    if (this.pending) throw new Error("Ya hay un programa ejecutándose.");
    await this.boot();
    const id = ++this.seq;
    return new Promise<RunResult>((resolve, reject) => {
      this.pending = { id, resolve, reject };
      this.worker!.postMessage({ kind: "run", id, ...req });
    });
  }
}

export const python = new PythonRunner();
