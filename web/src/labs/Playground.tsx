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

const MAX_FILE = 5 * 1024 * 1024;
const MAX_TOTAL = 20 * 1024 * 1024;

/** Starter code to look at an uploaded file. */
function snippetFor(name: string): string {
  if (/\.(csv|tsv)$/i.test(name)) {
    const sep = /\.tsv$/i.test(name) ? ', sep="\\t"' : "";
    return `import pandas as pd\n\ndf = pd.read_csv(${JSON.stringify(name)}${sep})\nprint(df.shape)\nprint(df.dtypes)\nprint(df.head())\nprint(df.describe())\n`;
  }
  if (/\.json$/i.test(name)) return `import json\n\nwith open(${JSON.stringify(name)}, encoding="utf-8") as f:\n    datos = json.load(f)\nprint(type(datos).__name__, len(datos))\n`;
  return `with open(${JSON.stringify(name)}, encoding="utf-8") as f:\n    texto = f.read()\nprint(len(texto.splitlines()), "líneas")\nprint(texto[:500])\n`;
}

export function Playground() {
  const { state, update } = useGame();
  const runner = useRunner();
  const [code, setCode] = useState(SNIPPETS["Hola mundo"]);
  const [stdin, setStdin] = useState("");
  const [out, setOut] = useState<PanelResult>(null);
  // The learner's own text files, written next to the program on every run (kept in memory only).
  const [files, setFiles] = useState<Record<string, string>>({});
  const [fileMsg, setFileMsg] = useState<string[]>([]);
  const addFiles = async (list: FileList | null) => {
    const msgs: string[] = [];
    const next = { ...files };
    for (const f of Array.from(list ?? [])) {
      const total = Object.values(next).reduce((n, c) => n + c.length, 0);
      if (f.size > MAX_FILE) {
        msgs.push(`${f.name}: ocupa más de 5 MB; usa una parte de los datos.`);
        continue;
      }
      if (total + f.size > MAX_TOTAL) {
        msgs.push(`${f.name}: entre todos los archivos superarían 20 MB.`);
        continue;
      }
      const content = await f.text();
      if (content.includes("\u0000")) {
        msgs.push(`${f.name}: no es un archivo de texto (CSV, TXT, JSON…). Las hojas de Excel se guardan antes como CSV.`);
        continue;
      }
      if (content.includes("\uFFFD")) msgs.push(`${f.name}: tiene caracteres que no están en UTF-8 y se ven como «�». Guárdalo como «CSV UTF-8» y vuelve a añadirlo.`);
      next[f.name] = content;
      msgs.push(`${f.name}: añadido (${content.split("\n").length} líneas).`);
    }
    setFiles(next);
    setFileMsg(msgs);
  };
  const busy = runner.state === "running" || runner.state === "packages";
  const run = async () => {
    if (python.busy) return;
    python.timeoutMs = state.settings.timeoutSec * 1000;
    try {
      const result = await python.run({ code, stdin: stdin ? stdin.split("\n") : [], files });
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
          <fieldset className="px-panel p-3 flex flex-col gap-2" data-testid="own-files">
            <legend className="label px-1">Tus archivos de datos</legend>
            <p className="text-xs text-muted">Añade archivos de texto (CSV, TSV, JSON, TXT) de tu ordenador: tu código los abre por su nombre, como <code>pd.read_csv("ventas.csv")</code>. Se quedan en esta pestaña; no se envían a ningún sitio ni se guardan al recargar.</p>
            <label className="btn-ghost text-sm self-start cursor-pointer">
              Añadir archivos…
              <input type="file" multiple accept=".csv,.tsv,.txt,.json,.md,.py,text/*,application/json" className="sr-only" onChange={(e) => (void addFiles(e.target.files), (e.target.value = ""))} />
            </label>
            {Object.keys(files).length > 0 && (
              <ul className="text-sm flex flex-col gap-1">
                {Object.entries(files).map(([name, content]) => (
                  <li key={name} className="flex flex-wrap items-center gap-2">
                    <code>{name}</code>
                    <span className="text-xs text-muted">{(content.length / 1024).toFixed(1)} KB</span>
                    <button className="chip text-xs" onClick={() => setCode(snippetFor(name))}>
                      Código para explorarlo
                    </button>
                    <button className="chip text-xs" aria-label={`Quitar ${name}`} onClick={() => setFiles(({ [name]: _, ...rest }) => rest)}>
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {fileMsg.length > 0 && (
              <ul className="text-xs" role="status">
                {fileMsg.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
          </fieldset>
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
        Disponibles en el navegador: la biblioteca estándar y los paquetes de Pyodide (numpy, pandas, scipy, matplotlib, scikit-learn, statsmodels, sqlite3…). Se descargan la primera vez que los importas. No hay acceso a la red ni a tus carpetas: solo a los archivos que añadas arriba. Los archivos que cree tu programa viven solo durante la ejecución.
      </p>
    </div>
  );
}
