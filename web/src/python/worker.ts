/// <reference lib="webworker" />
// Classic worker: Pyodide is loaded with importScripts from the configured index URL.
import type { WorkerIn, WorkerOut } from "./types";

declare const self: DedicatedWorkerGlobalScope;
declare function loadPyodide(opts: { indexURL: string }): Promise<any>;

let py: any = null;

const post = (msg: WorkerOut) => self.postMessage(msg);

async function init(indexURL: string, harness: string) {
  try {
    self.importScripts(indexURL + "pyodide.js");
    py = await loadPyodide({ indexURL });
    py.FS.mkdirTree("/home/pyodide/pq");
    py.FS.writeFile("/home/pyodide/pq/pq_harness.py", harness);
    py.runPython(`
import sys, json
sys.path.insert(0, "/home/pyodide/pq")
import pq_harness
def pq_run(payload):
    p = json.loads(payload)
    return json.dumps(pq_harness.run(p["code"], p.get("tests", ""), p.get("stdin"), p.get("files")))
`);
    post({ kind: "ready", version: py.version });
  } catch (e) {
    post({ kind: "init-error", message: String((e as Error)?.message ?? e) });
  }
}

// Packages that live on PyPI rather than in the Pyodide distribution.
const MICROPIP = ["seaborn"];
const installed = new Set<string>();

async function run(msg: Extract<WorkerIn, { kind: "run" }>) {
  const { id, code, tests = "", stdin = [], files = {} } = msg;
  try {
    const source = code + "\n" + tests;
    // loadPackagesFromImports is a no-op for modules already present; it only reports when downloading.
    await py.loadPackagesFromImports(source, {
      messageCallback: (m: string) => {
        if (m.startsWith("Loading")) post({ kind: "status", id, phase: "packages", detail: m.replace(/^Loading /, "") });
      },
      errorCallback: () => {},
    });
    const imports: string[] = py.pyodide_py.code.find_imports(source).toJs();
    const extra = imports.filter((m) => MICROPIP.includes(m) && !installed.has(m));
    if (extra.length) {
      post({ kind: "status", id, phase: "packages", detail: extra.join(", ") });
      await py.loadPackage("micropip");
      await py.pyimport("micropip").install(extra);
      extra.forEach((m) => installed.add(m));
    }
    post({ kind: "status", id, phase: "running" });
    const t0 = performance.now();
    const pqRun = py.globals.get("pq_run");
    const raw: string = pqRun(JSON.stringify({ code, tests, stdin, files }));
    pqRun.destroy();
    const result = JSON.parse(raw);
    result.durationMs = Math.round(performance.now() - t0);
    post({ kind: "result", id, result });
  } catch (e) {
    post({ kind: "run-error", id, message: String((e as Error)?.message ?? e) });
  }
}

self.onmessage = (ev: MessageEvent<WorkerIn>) => {
  const msg = ev.data;
  if (msg.kind === "init") void init(msg.indexURL, msg.harness);
  else if (msg.kind === "run") void run(msg);
};
