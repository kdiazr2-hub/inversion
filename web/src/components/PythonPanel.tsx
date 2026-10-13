// Console + test report for a Python run, and a hook exposing the interpreter status.
import { useEffect, useState } from "react";
import { PYODIDE_VERSION, python, type RunnerState } from "../python/runner";
import type { RunResult } from "../python/types";

export function useRunner() {
  const [st, setSt] = useState<{ state: RunnerState; detail: string }>({ state: python.state, detail: python.detail });
  useEffect(() => {
    const unsub = python.subscribe((state, detail = "") => setSt({ state, detail }));
    return () => {
      unsub();
    };
  }, []);
  return st;
}

export function RunnerStatus() {
  const { state, detail } = useRunner();
  const text: Record<RunnerState, string> = {
    idle: "Python se cargará al ejecutar",
    loading: "Cargando Python (Pyodide)… la primera vez tarda unos segundos",
    ready: `Python listo · Pyodide ${PYODIDE_VERSION}`,
    packages: `Descargando paquetes: ${detail}`,
    running: "Ejecutando…",
    error: `Python no pudo iniciarse: ${detail}`,
  };
  const color = state === "error" ? "text-ember" : state === "ready" ? "text-leaf" : state === "idle" ? "text-muted" : "text-gold";
  return (
    <div className={`flex items-center gap-2 text-xs ${color}`} role="status" aria-live="polite">
      <span className={`inline-block w-2 h-2 ${state === "running" || state === "loading" || state === "packages" ? "animate-pulse" : ""}`} style={{ background: "currentColor" }} />
      {text[state]}
    </div>
  );
}

export type PanelResult = { result: RunResult; checked: boolean } | { failure: string } | null;

export function OutputPanel({ out, emptyText = "Pulsa Ejecutar para ver la salida de tu programa." }: { out: PanelResult; emptyText?: string }) {
  if (!out) return <div className="text-sm text-muted font-mono p-3">{emptyText}</div>;
  if ("failure" in out)
    return (
      <div className="p-3 text-sm text-ember" role="alert">
        {out.failure}
      </div>
    );
  const { result, checked } = out;
  const passed = result.tests.filter((t) => t.passed).length;
  return (
    <div className="flex flex-col gap-3 p-3" data-testid="output">
      <div>
        <div className="label mb-1">Consola</div>
        <pre className="font-mono text-[13px] whitespace-pre-wrap break-words bg-ink p-3 rounded-[2px] max-h-72 overflow-auto shadow-[inset_0_0_0_2px_#2c3f6b]" data-testid="stdout">
          {result.stdout || <span className="text-muted">(sin salida)</span>}
        </pre>
      </div>
      {result.error && (
        <div className="bg-ember/10 border-2 border-ember rounded-[2px] p-3" role="alert" data-testid="py-error">
          <div className="font-mono text-sm text-ember font-bold">
            {result.error.type}
            {result.error.line ? ` · línea ${result.error.line}` : ""}: {result.error.message}
          </div>
          <p className="text-sm mt-1">{result.error.hint}</p>
        </div>
      )}
      {result.figures.length > 0 && (
        <div>
          <div className="label mb-1">Gráficos</div>
          <div className="grid gap-2">
            {result.figures.map((f, i) => (
              <img key={i} src={`data:image/png;base64,${f}`} alt={`Gráfico ${i + 1} generado por tu programa`} className="bg-white rounded-[2px] max-w-full" />
            ))}
          </div>
        </div>
      )}
      {checked && result.tests.length > 0 && (
        <div data-testid="tests">
          <div className="label mb-1">
            Pruebas: {passed} / {result.tests.length}
          </div>
          <ul className="flex flex-col gap-1">
            {result.tests.map((t) => (
              <li key={t.name} className={`flex gap-2 text-sm p-2 rounded-[2px] ${t.passed ? "bg-leaf/10" : "bg-ember/10"}`}>
                <span className={`font-pixel ${t.passed ? "text-leaf" : "text-ember"}`} aria-hidden>
                  {t.passed ? "✔" : "✘"}
                </span>
                <span>
                  <span className="sr-only">{t.passed ? "Superada:" : "Fallida:"}</span>
                  {t.description}
                  {!t.passed && t.message && <span className="block text-muted">{t.message}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {checked && result.error && <p className="text-sm text-muted">Las pruebas se ejecutan cuando el programa termina sin errores.</p>}
      <div className="text-[11px] text-muted">Tiempo de ejecución: {result.durationMs} ms</div>
    </div>
  );
}
