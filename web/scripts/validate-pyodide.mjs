// Runs every mission through the real Pyodide interpreter (WebAssembly) in Node, using the same
// harness as the browser: reference solution and advanced solution must pass all tests, and the
// worked example must run without errors.
//
// Needs a full Pyodide distribution (with numpy, pandas, scipy… wheels), e.g. extracted from
//   https://github.com/pyodide/pyodide/releases/download/0.28.3/pyodide-0.28.3.tar.bz2
// Usage:  PYODIDE_DIST=/ruta/a/pyodide node scripts/validate-pyodide.mjs [id-mision …]
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

const dist = process.env.PYODIDE_DIST;
if (!dist || !existsSync(join(dist, "pyodide-lock.json"))) {
  console.error("Define PYODIDE_DIST con la carpeta de una distribución completa de Pyodide 0.28.3.");
  process.exit(2);
}

execSync("npx tsx scripts/export-content.ts", { stdio: "inherit" });
const { missions } = JSON.parse(readFileSync("content.json", "utf-8"));
const only = process.argv.slice(2);
const selected = only.length ? missions.filter((m) => only.includes(m.id)) : missions;

const { loadPyodide } = await import(pathToFileURL(join(resolve(dist), "pyodide.mjs")).href);
const py = await loadPyodide({ indexURL: resolve(dist) + "/" });
py.FS.mkdirTree("/home/pyodide/pq");
py.FS.writeFile("/home/pyodide/pq/pq_harness.py", readFileSync("../harness/pq_harness.py", "utf-8"));
py.runPython(`
import sys, json
sys.path.insert(0, "/home/pyodide/pq")
import pq_harness
def pq_warm(names_json):
    return json.dumps(pq_harness.warm_imports(json.loads(names_json)))
def pq_run(payload):
    p = json.loads(payload)
    return json.dumps(pq_harness.run(p["code"], p.get("tests", ""), p.get("stdin"), p.get("files")))
`);
const pqRun = py.globals.get("pq_run");
const pqWarm = py.globals.get("pq_warm");

// Runs slower than this (package downloads excluded) risk the browser's default 15 s limit.
const SLOW_MS = 5000;
const slow = [];
let current = "";

async function run(code, tests, stdin, files) {
  const source = code + "\n" + (tests ?? "");
  await py.loadPackagesFromImports(source, { messageCallback: () => {}, errorCallback: (e) => console.error(e) });
  // Same as the browser worker: heavy imports happen before the clock starts.
  pqWarm(JSON.stringify(py.pyodide_py.code.find_imports(source).toJs()));
  const t0 = performance.now();
  const out = JSON.parse(pqRun(JSON.stringify({ code, tests: tests ?? "", stdin: stdin ?? [], files: files ?? {} })));
  const ms = performance.now() - t0;
  if (ms > SLOW_MS) slow.push(`${current}: ${(ms / 1000).toFixed(1)} s`);
  return out;
}

const describe = (r) =>
  r.error
    ? `${r.error.type} (línea ${r.error.line ?? "?"}): ${r.error.message}`
    : r.tests.filter((t) => !t.passed).map((t) => `${t.description}: ${t.message}`).join(" | ");

const failures = [];
const t0 = Date.now();
for (const m of selected) {
  const checks = [
    ["solución", () => run(m.solution, m.tests, m.stdin, m.files), (r) => r.passed],
    ["ejemplo", () => run(m.example.code, "", m.example.stdin ?? m.stdin, m.files), (r) => !r.error],
  ];
  if (m.advanced)
    checks.push(["avanzado", () => run(m.advanced.solution, m.advanced.tests, m.advanced.stdin ?? m.stdin, m.files), (r) => r.passed]);
  for (const [what, exec, ok] of checks) {
    current = `${m.id} · ${what}`;
    let r;
    try {
      r = await exec();
    } catch (e) {
      r = { error: { type: "HarnessError", message: String(e).slice(0, 300) }, tests: [] };
    }
    if (!ok(r)) failures.push(`${m.id} · ${what}: ${describe(r)}`);
  }
  process.stdout.write(".");
}
console.log(`\n${selected.length} misiones en Pyodide ${py.version} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
if (slow.length) console.log(`\nEjecuciones lentas (> ${SLOW_MS / 1000} s):\n` + slow.join("\n"));
if (failures.length) {
  console.log(`\n${failures.length} fallos:\n` + failures.join("\n"));
  process.exit(1);
}
console.log("Todas las soluciones, ejemplos y retos avanzados pasan en Pyodide.");
