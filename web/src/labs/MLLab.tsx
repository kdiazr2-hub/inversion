import { useEffect, useMemo, useRef, useState } from "react";
import { LAB_TABS } from "../content/labs";
import { KMeansSim, PcaSim, PolySim } from "./MLExtra";
import { ChartCard, fmt, Legend, SERIES, XYChart } from "../components/Charts";
import * as A from "../engine/actions";
import { useGame } from "../engine/store";
import { LabLayout, Select, Slider, Stat } from "./controls";
import { knn, logistic, majorityBaseline, makeData, metrics, split, tree, type Model, type P2, type Shape } from "./ml";

type Kind = "knn" | "logistica" | "arbol";
const pct = (v: number) => (isFinite(v) ? `${Math.round(v * 100)} %` : "—");

function build(kind: Kind, train: P2[], param: number, lambda: number): Model {
  if (kind === "knn") return knn(train, param);
  if (kind === "logistica") return logistic(train, param, lambda);
  return tree(train, param);
}

const PARAM: Record<Kind, { label: string; min: number; max: number; init: number; curve: number[] }> = {
  knn: { label: "k vecinos", min: 1, max: 40, init: 7, curve: [1, 2, 3, 5, 7, 9, 12, 15, 20, 25, 30, 40] },
  logistica: { label: "Grado polinómico", min: 1, max: 5, init: 1, curve: [1, 2, 3, 4, 5] },
  arbol: { label: "Profundidad máxima", min: 1, max: 14, init: 3, curve: [1, 2, 3, 4, 5, 6, 8, 10, 12, 14] },
};

function Regions({ model, train, test, onAdd }: { model: Model; train: P2[]; test: P2[]; onAdd: (x: number, y: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const G = 64;
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const W = 384;
    const cell = W / G;
    for (let i = 0; i < G; i++)
      for (let j = 0; j < G; j++) {
        const p = model((i + 0.5) / G, 1 - (j + 0.5) / G);
        const a = 0.16 + Math.abs(p - 0.5) * 0.5;
        ctx.fillStyle = p >= 0.5 ? `rgba(217,89,38,${a})` : `rgba(57,135,229,${a})`;
        ctx.fillRect(i * cell, j * cell, cell + 0.5, cell + 0.5);
      }
    const dot = (p: P2, hollow: boolean) => {
      const cx = p.x * W;
      const cy = (1 - p.y) * W;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      if (hollow) {
        ctx.strokeStyle = p.c ? "#ffb08a" : "#9cc6ff";
        ctx.stroke();
      } else {
        ctx.fillStyle = p.c ? SERIES[1] : SERIES[0];
        ctx.fill();
        ctx.strokeStyle = "#141f3a";
        ctx.stroke();
      }
    };
    train.forEach((p) => dot(p, false));
    test.forEach((p) => dot(p, true));
  }, [model, train, test]);
  return (
    <canvas
      ref={ref}
      width={384}
      height={384}
      className="w-full max-w-[384px] aspect-square rounded-[2px] bg-ink cursor-crosshair"
      role="img"
      aria-label="Regiones de decisión del modelo con los puntos de entrenamiento (rellenos) y de prueba (huecos)"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onAdd((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
      }}
    />
  );
}

function Classification() {
  const { update } = useGame();
  const [shape, setShape] = useState<Shape>("lunas");
  const [n, setN] = useState(200);
  const [noise, setNoise] = useState(0.3);
  const [testFrac, setTestFrac] = useState(0.3);
  const [kind, setKind] = useState<Kind>("knn");
  const [param, setParam] = useState(PARAM.knn.init);
  const [lambda, setLambda] = useState(0.001);
  const [seed, setSeed] = useState(1);
  const [extra, setExtra] = useState<P2[]>([]);
  const [addClass, setAddClass] = useState<"0" | "1">("1");
  useEffect(() => setParam(PARAM[kind].init), [kind]);
  useEffect(() => {
    update((s) => A.recordLab(s, "ml"));
  }, [update]);
  const { train, test } = useMemo(() => split(makeData(shape, n, noise, seed), testFrac, seed + 1), [shape, n, noise, seed, testFrac]);
  const trainAll = useMemo(() => [...train, ...extra], [train, extra]);
  const model = useMemo(() => build(kind, trainAll, param, lambda), [kind, trainAll, param, lambda]);
  const mTrain = metrics(model, trainAll);
  const mTest = metrics(model, test);
  const base = majorityBaseline(trainAll, test);
  const curve = useMemo(
    () => PARAM[kind].curve.map((v) => { const m = build(kind, trainAll, v, lambda); return { v, tr: metrics(m, trainAll).accuracy, te: metrics(m, test).accuracy }; }),
    [kind, trainAll, test, lambda],
  );
  const P = PARAM[kind];
  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted text-sm">Clasificación binaria con dos variables. Haz clic en el mapa para añadir puntos.</p>
      <LabLayout
        controls={
          <>
            <Select label="Forma de los datos" value={shape} onChange={(v) => (setShape(v), setExtra([]))} options={[{ value: "manchas", label: "Dos manchas" }, { value: "lunas", label: "Dos lunas" }, { value: "xor", label: "XOR (cuadrantes)" }, { value: "circulos", label: "Círculos concéntricos" }]} />
            <Slider label="Puntos" value={n} min={40} max={600} step={20} onChange={setN} />
            <Slider label="Ruido" value={noise} min={0} max={1} step={0.05} onChange={setNoise} format={(v) => v.toFixed(2)} />
            <Slider label="Proporción de prueba" value={testFrac} min={0.1} max={0.6} step={0.05} onChange={setTestFrac} format={pct} />
            <Select label="Modelo" value={kind} onChange={setKind} options={[{ value: "knn", label: "k vecinos más cercanos" }, { value: "logistica", label: "Regresión logística" }, { value: "arbol", label: "Árbol de decisión" }]} />
            <Slider label={P.label} value={Math.min(param, P.max)} min={P.min} max={P.max} onChange={setParam} />
            {kind === "logistica" && <Slider label="Regularización L2 (λ)" value={lambda} min={0} max={0.1} step={0.001} onChange={setLambda} format={(v) => v.toFixed(3)} />}
            <Select label="Clic en el mapa añade puntos de clase" value={addClass} onChange={setAddClass} options={[{ value: "0", label: "Azul (0)" }, { value: "1", label: "Naranja (1)" }]} />
            <div className="flex gap-2 flex-wrap">
              <button className="btn-sky" onClick={() => (setSeed((s) => s + 1), setExtra([]))}>
                ↻ Nuevos datos
              </button>
              {extra.length > 0 && (
                <button className="btn-ghost" onClick={() => setExtra([])}>
                  Quitar mis {extra.length} puntos
                </button>
              )}
            </div>
          </>
        }
        explain={
          <>
            <p>
              <strong>Evalúa siempre fuera de muestra.</strong> La exactitud en entrenamiento mide memoria; la de prueba, generalización. Con k = 1 o un árbol muy profundo el modelo acierta casi todo el entrenamiento y falla más en prueba: eso es <strong>sobreajuste</strong>. Con k muy grande o profundidad 1 ambos son bajos: <strong>subajuste</strong>.
            </p>
            <p className="mt-2">
              Compara con la <strong>línea base</strong> (predecir siempre la clase mayoritaria): un modelo que no la supera no aporta nada. La regresión logística de grado 1 traza una frontera recta: no puede resolver XOR ni círculos sin términos polinómicos.
            </p>
            <p className="mt-2 text-muted">Para elegir k, profundidad o grado de forma honesta se usa validación cruzada sobre el entrenamiento; el conjunto de prueba se reserva para la evaluación final. Mirarlo repetidamente para ajustar es una forma de fuga de datos.</p>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Exactitud entrenamiento" value={pct(mTrain.accuracy)} />
          <Stat label="Exactitud prueba" value={pct(mTest.accuracy)} />
          <Stat label="Línea base (mayoritaria)" value={pct(base)} />
          <Stat label="F1 en prueba" value={fmt(mTest.f1, 3)} />
        </div>
        <div className="grid xl:grid-cols-[auto_minmax(0,1fr)] gap-4 items-start">
          <figure className="px-panel p-4">
            <figcaption className="font-bold mb-2">Regiones de decisión</figcaption>
            <Regions model={model} train={trainAll} test={test} onAdd={(x, y) => setExtra((e) => [...e, { x, y, c: Number(addClass) as 0 | 1 }])} />
            <p className="text-xs text-muted mt-2">Rellenos: entrenamiento · huecos: prueba. Intensidad = confianza del modelo.</p>
          </figure>
          <div className="flex flex-col gap-4 min-w-0">
            <ChartCard title={`Exactitud según ${P.label.toLowerCase()}`} legend={<Legend items={[{ name: "Entrenamiento", color: SERIES[0] }, { name: "Prueba", color: SERIES[1] }]} />} table={{ head: [P.label, "Entrenamiento", "Prueba"], rows: curve.map((c) => [c.v, c.tr, c.te]) }}>
              <XYChart ariaLabel="Curva de complejidad: exactitud de entrenamiento y prueba" height={200} x={[P.curve[0], P.curve[P.curve.length - 1]]} y={[Math.max(0, Math.min(base, ...curve.map((c) => c.te)) - 0.1), 1]} series={[{ name: "Entrenamiento", color: SERIES[0], points: curve.map((c) => ({ x: c.v, y: c.tr })) }, { name: "Prueba", color: SERIES[1], points: curve.map((c) => ({ x: c.v, y: c.te })) }]} segments={[{ x0: P.curve[0], x1: P.curve[P.curve.length - 1], y0: base, y1: base, color: "#5f6f94", width: 1 }]} vlines={[{ x: param, label: "actual" }]} formatY={(v) => `${Math.round(v * 100)}%`} formatX={(v) => fmt(v, 0)} />
            </ChartCard>
            <figure className="px-panel p-4">
              <figcaption className="font-bold mb-2">Matriz de confusión (prueba)</figcaption>
              <table className="text-sm tabular-nums">
                <thead>
                  <tr className="text-muted">
                    <th className="p-2" />
                    <th className="p-2">Predicho 0</th>
                    <th className="p-2">Predicho 1</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="p-2 text-muted text-left">Real 0</th>
                    <td className="p-2 text-leaf">{mTest.tn} VN</td>
                    <td className="p-2 text-ember">{mTest.fp} FP</td>
                  </tr>
                  <tr>
                    <th className="p-2 text-muted text-left">Real 1</th>
                    <td className="p-2 text-ember">{mTest.fn} FN</td>
                    <td className="p-2 text-leaf">{mTest.tp} VP</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-sm mt-2">
                Precisión {fmt(mTest.precision, 3)} · Recall (sensibilidad) {fmt(mTest.recall, 3)} · F1 {fmt(mTest.f1, 3)}
              </p>
            </figure>
          </div>
        </div>
      </LabLayout>
    </div>
  );
}

const PANELS: Record<string, JSX.Element> = { clasificacion: <Classification />, polinomios: <PolySim />, kmeans: <KMeansSim />, pca: <PcaSim /> };

export function MLLab({ initial }: { initial?: string }) {
  const tabs = LAB_TABS.ml;
  const [tab, setTab] = useState(tabs.some((t) => t.id === initial) ? initial! : tabs[0].id);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="px-title text-gold text-2xl">Laboratorio de machine learning</h1>
        <p className="text-muted text-sm">Los modelos se entrenan en tu navegador con código abierto y comprobado; nada se envía a ningún servidor.</p>
      </div>
      <div role="tablist" aria-label="Simuladores" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`chip text-sm px-3 py-1 ${tab === t.id ? "bg-gold text-ink" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{PANELS[tab]}</div>
    </div>
  );
}
