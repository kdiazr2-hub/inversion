// Data lab: pick a synthetic dataset, inspect a column profile computed in the page,
// then analyse it with real pandas/matplotlib code running in Pyodide.
import { useMemo, useState } from "react";
import { dataset, DATASETS, parseCsv } from "../content/datasets";
import { py } from "../content/types";
import { fmt } from "../components/Charts";
import { CodeEditor } from "../components/CodeEditor";
import { OutputPanel, RunnerStatus, useRunner, type PanelResult } from "../components/PythonPanel";
import * as A from "../engine/actions";
import { useGame } from "../engine/store";
import { python } from "../python/runner";
import * as S from "../stats/math";

const SNIPPETS = (file: string): Record<string, string> => ({
  "Primer vistazo": py`import pandas as pd

df = pd.read_csv("${file}")
print(df.shape)
print(df.dtypes)
print(df.head())
print(df.isna().sum())`,
  "Resumen numérico": py`import pandas as pd

df = pd.read_csv("${file}")
print(df.describe().round(2).T)`,
  "Histograma": py`import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("${file}")
col = df.select_dtypes("number").columns[-1]
df[col].plot.hist(bins=25, color="#3987e5", edgecolor="white")
plt.title(f"Distribución de {col}")
plt.xlabel(col)`,
  "Agrupar": py`import pandas as pd

df = pd.read_csv("${file}")
cat = df.select_dtypes("object").columns
num = df.select_dtypes("number").columns
if len(cat):
    print(df.groupby(cat[0])[num[-1]].agg(["count", "mean", "median", "std"]).round(2))
else:
    print("Este dataset no tiene columnas de texto para agrupar.")`,
});

interface Profile {
  name: string;
  kind: "número" | "texto";
  missing: number;
  unique: number;
  mean?: number;
  sd?: number;
  min?: number;
  median?: number;
  max?: number;
  top?: string;
}

function profile(header: string[], rows: string[][]): Profile[] {
  return header.map((name, j) => {
    const vals = rows.map((r) => r[j] ?? "");
    const present = vals.filter((v) => v.trim() !== "");
    const nums = present.map(Number);
    const numeric = present.length > 0 && nums.every((v) => isFinite(v));
    const p: Profile = { name, kind: numeric ? "número" : "texto", missing: vals.length - present.length, unique: new Set(present).size };
    if (numeric) Object.assign(p, { mean: S.mean(nums), sd: nums.length > 1 ? S.sd(nums) : NaN, min: Math.min(...nums), median: S.median(nums), max: Math.max(...nums) });
    else {
      const counts = new Map<string, number>();
      present.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
      const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      p.top = best ? `${best[0]} (${best[1]})` : "—";
    }
    return p;
  });
}

export function DataLab() {
  const { state, update } = useGame();
  const runner = useRunner();
  const [file, setFile] = useState<string>(DATASETS[0].file);
  const [code, setCode] = useState(SNIPPETS(DATASETS[0].file)["Primer vistazo"]);
  const [out, setOut] = useState<PanelResult>(null);
  const csv = dataset(file);
  const { header, rows } = useMemo(() => parseCsv(csv), [csv]);
  const prof = useMemo(() => profile(header, rows), [header, rows]);
  const busy = runner.state === "running" || runner.state === "packages";
  const info = DATASETS.find((d) => d.file === file)!;

  const run = async () => {
    if (python.busy) return;
    python.timeoutMs = Math.max(30, state.settings.timeoutSec) * 1000;
    try {
      const files = Object.fromEntries(DATASETS.map((d) => [d.file, dataset(d.file)]));
      const result = await python.run({ code, files });
      setOut({ result, checked: false });
      update((s) => A.recordLab(A.recordRun(s), "datos"));
    } catch (e) {
      setOut({ failure: (e as Error).message });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="px-title text-gold text-2xl">Laboratorio de datos</h1>
        <p className="text-muted text-sm">Datasets sintéticos generados por Python Quest (sin personas reales). Todos están disponibles como archivos CSV en la carpeta de trabajo de Python.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Datasets">
        {DATASETS.map((d) => (
          <button
            key={d.file}
            role="tab"
            aria-selected={file === d.file}
            className={`chip text-sm px-3 py-1 ${file === d.file ? "bg-gold text-ink" : ""}`}
            onClick={() => {
              setFile(d.file);
              setCode(SNIPPETS(d.file)["Primer vistazo"]);
              setOut(null);
            }}
          >
            {d.file}
          </button>
        ))}
      </div>
      <div className="px-panel p-4">
        <div className="font-bold">{info.title}</div>
        <p className="text-sm text-muted">
          {info.description} · {rows.length} filas × {header.length} columnas
        </p>
        <div className="overflow-x-auto mt-3">
          <table className="text-xs tabular-nums w-full">
            <thead>
              <tr className="text-left text-muted">
                {["Columna", "Tipo", "Faltantes", "Únicos", "Media", "DE", "Mín", "Mediana", "Máx", "Más frecuente"].map((h) => (
                  <th key={h} className="p-1 border-b border-line whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prof.map((p) => (
                <tr key={p.name} className="border-b border-line/40">
                  <td className="p-1 font-mono text-sky">{p.name}</td>
                  <td className="p-1">{p.kind}</td>
                  <td className={`p-1 ${p.missing ? "text-ember" : ""}`}>{p.missing}</td>
                  <td className="p-1">{p.unique}</td>
                  <td className="p-1">{p.mean !== undefined ? fmt(p.mean, 2) : ""}</td>
                  <td className="p-1">{p.sd !== undefined ? fmt(p.sd, 2) : ""}</td>
                  <td className="p-1">{p.min !== undefined ? fmt(p.min, 2) : ""}</td>
                  <td className="p-1">{p.median !== undefined ? fmt(p.median, 2) : ""}</td>
                  <td className="p-1">{p.max !== undefined ? fmt(p.max, 2) : ""}</td>
                  <td className="p-1">{p.top ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-sky">Ver las primeras filas</summary>
          <div className="overflow-x-auto mt-2">
            <table className="text-xs font-mono">
              <thead>
                <tr>{header.map((h) => <th key={h} className="p-1 text-left text-muted">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 12).map((r, i) => (
                  <tr key={i}>{r.map((c, j) => <td key={j} className="p-1 whitespace-nowrap">{c === "" ? <span className="text-ember">vacío</span> : c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {Object.entries(SNIPPETS(file)).map(([k, v]) => (
            <button key={k} className="chip text-sm px-3 py-1" onClick={() => setCode(v)}>
              {k}
            </button>
          ))}
        </div>
        <RunnerStatus />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-3 min-w-0">
          <div className="px-panel overflow-hidden">
            <CodeEditor value={code} onChange={setCode} onRun={run} onCheck={run} label="Editor del laboratorio de datos" theme={state.settings.editorTheme} fontSize={state.settings.fontSize} minHeight={300} />
          </div>
          <div>
            {busy ? (
              <button className="btn-ember" onClick={() => python.stop()}>
                ■ Detener
              </button>
            ) : (
              <button className="btn-sky" onClick={run}>
                ▶ Ejecutar análisis
              </button>
            )}
          </div>
        </div>
        <div className="bg-night rounded-[2px] shadow-px min-w-0">
          <OutputPanel out={out} emptyText="Elige un fragmento o escribe tu análisis y pulsa Ejecutar. La primera vez se descargan pandas y matplotlib." />
        </div>
      </div>
    </div>
  );
}
