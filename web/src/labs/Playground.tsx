// Free Python sandbox ("Consola libre"): write anything, run it, see output and plots.
import { useState } from "react";
import { py } from "../content/types";
import { CodeEditor } from "../components/CodeEditor";
import { OutputPanel, RunnerStatus, useRunner, type PanelResult } from "../components/PythonPanel";
import * as A from "../engine/actions";
import { useGame } from "../engine/store";
import { python } from "../python/runner";

const SNIPPETS: Record<string, string> = {
  "Hola mundo": py`nombre = "Python Quest"
print(f"Hola desde {nombre}!")`,
  "Simular dados": py`import random
from collections import Counter

tiradas = [random.randint(1, 6) + random.randint(1, 6) for _ in range(10_000)]
frec = Counter(tiradas)
for suma in range(2, 13):
    print(f"{suma:>2} {frec[suma] / len(tiradas):.3f} {'#' * (frec[suma] // 50)}")`,
  "NumPy y gráfico": py`import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(1)
x = rng.normal(170, 8, size=500)
print("media", x.mean().round(2), "DE", x.std(ddof=1).round(2))
plt.hist(x, bins=25, color="#3987e5", edgecolor="white")
plt.title("Estaturas simuladas (cm)")`,
  "pandas": py`import pandas as pd

df = pd.DataFrame({
    "ciudad": ["Lima", "Quito", "Lima", "Bogotá", "Quito"],
    "ventas": [120, 80, 150, 95, 60],
})
print(df.groupby("ciudad")["ventas"].agg(["count", "mean", "sum"]))`,
};

export function Playground() {
  const { state, update } = useGame();
  const runner = useRunner();
  const [code, setCode] = useState(SNIPPETS["Hola mundo"]);
  const [stdin, setStdin] = useState("");
  const [out, setOut] = useState<PanelResult>(null);
  const busy = runner.state === "running" || runner.state === "packages";
  const run = async () => {
    if (python.busy) return;
    python.timeoutMs = state.settings.timeoutSec * 1000;
    try {
      const result = await python.run({ code, stdin: stdin ? stdin.split("\n") : [] });
      setOut({ result, checked: false });
      update((s) => A.recordLab(A.recordRun(s), "python"));
    } catch (e) {
      setOut({ failure: (e as Error).message });
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {Object.keys(SNIPPETS).map((k) => (
            <button key={k} className="chip text-sm px-3 py-1" onClick={() => setCode(SNIPPETS[k])}>
              {k}
            </button>
          ))}
        </div>
        <RunnerStatus />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-3 min-w-0">
          <div className="px-panel overflow-hidden">
            <CodeEditor value={code} onChange={setCode} onRun={run} onCheck={run} label="Consola libre de Python" theme={state.settings.editorTheme} fontSize={state.settings.fontSize} minHeight={320} />
          </div>
          <label className="text-sm">
            <span className="label">Entradas para input() (una por línea)</span>
            <textarea id="playground-stdin" className="input font-mono text-sm h-20 mt-1" value={stdin} onChange={(e) => setStdin(e.target.value)} />
          </label>
          <div className="flex gap-2">
            {busy ? (
              <button className="btn-ember" onClick={() => python.stop()}>
                ■ Detener
              </button>
            ) : (
              <button className="btn-sky" onClick={run}>
                ▶ Ejecutar
              </button>
            )}
          </div>
        </div>
        <div className="bg-night rounded-[2px] shadow-px min-w-0">
          <OutputPanel out={out} />
        </div>
      </div>
      <p className="text-xs text-muted">
        Disponibles en el navegador: la biblioteca estándar y los paquetes de Pyodide (numpy, pandas, scipy, matplotlib, scikit-learn, statsmodels, sqlite3…). Se descargan la primera vez que los importas. No hay acceso a la red ni a tus archivos locales; los archivos que crees viven solo durante la ejecución.
      </p>
    </div>
  );
}
