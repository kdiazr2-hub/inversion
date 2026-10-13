// Math laboratory: derivatives, gradient descent, linear maps and numerical integration.
// Every number on screen is computed from the chosen parameters (see numeric.ts and its tests).
import { useEffect, useMemo, useRef, useState } from "react";
import { ChartCard, fmt, intTick, Legend, pow10Tick, SERIES, XYChart } from "../components/Charts";
import { LAB_TABS } from "../content/labs";
import * as A from "../engine/actions";
import { useGame } from "../engine/store";
import { LabLayout, Select, Slider, Stat } from "./controls";
import { apply2, centralDiff, det2, eigen2, forwardDiff, FUNCTIONS, gradientDescent, integrate, monteCarlo, sample, SURFACES, type Mat2, type Rule } from "./numeric";

// ------------------------------------------------------------------ 1. functions and derivatives
function Derivatives() {
  const [fid, setFid] = useState("cubica");
  const fn = FUNCTIONS.find((f) => f.id === fid)!;
  const [a, b] = fn.domain;
  const [t, setT] = useState(0.35);
  const [logH, setLogH] = useState(-1);
  const x0 = a + t * (b - a);
  const h = 10 ** logH;
  const y0 = fn.f(x0);
  const exact = fn.df(x0);
  const fwd = forwardDiff(fn.f, x0, h);
  const cen = centralDiff(fn.f, x0, h);
  const curve = sample(fn.f, a, b, 240);
  const ys = curve.map((p) => p.y);
  const yLo = Math.min(...ys);
  const yHi = Math.max(...ys);
  const pad = (yHi - yLo) * 0.1 || 1;
  const span = (b - a) * 0.25;
  const tangent = [x0 - span, x0 + span].map((x) => ({ x, y: y0 + exact * (x - x0) }));
  const secant = [x0, x0 + h].map((x) => ({ x, y: fn.f(x) }));
  const errs = Array.from({ length: 13 }, (_, i) => {
    const lh = -i * 0.75;
    const hh = 10 ** lh;
    return { lh, fwd: Math.log10(Math.abs(forwardDiff(fn.f, x0, hh) - exact) + 1e-17), cen: Math.log10(Math.abs(centralDiff(fn.f, x0, hh) - exact) + 1e-17) };
  });
  return (
    <LabLayout
      controls={
        <>
          <Select label="Función" value={fid} onChange={setFid} options={FUNCTIONS.map((f) => ({ value: f.id, label: f.label }))} />
          <Slider label="Punto x₀" value={t} min={0} max={1} step={0.005} onChange={setT} format={() => fmt(x0, 3)} />
          <Slider label="Paso h (escala logarítmica)" value={logH} min={-8} max={0} step={0.25} onChange={setLogH} format={() => h.toExponential(1)} />
        </>
      }
      explain={
        <>
          <p>
            La <strong>derivada</strong> es la pendiente de la recta tangente: el límite de la pendiente de la secante (f(x₀ + h) − f(x₀)) / h cuando h → 0. Con un ordenador no podemos tomar el límite: elegimos un h pequeño.
          </p>
          <p className="mt-2">
            La <strong>diferencia hacia delante</strong> tiene un error proporcional a h; la <strong>diferencia central</strong> (f(x₀ + h) − f(x₀ − h)) / 2h, proporcional a h². Pero si h es demasiado pequeño, el redondeo de la aritmética de coma flotante domina y el error vuelve a crecer: mira la curva de errores.
          </p>
          <p className="mt-2 text-muted">Esto es lo que hace el descenso de gradiente en machine learning: usar la pendiente para decidir hacia dónde moverse.</p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="f(x₀)" value={fmt(y0, 4)} />
        <Stat label="Derivada exacta f′(x₀)" value={fmt(exact, 6)} />
        <Stat label="Hacia delante" value={fmt(fwd, 6)} note={`error ${Math.abs(fwd - exact).toExponential(1)}`} />
        <Stat label="Central" value={fmt(cen, 6)} note={`error ${Math.abs(cen - exact).toExponential(1)}`} />
      </div>
      <ChartCard title={fn.label} subtitle="Curva, recta tangente en x₀ y secante con el paso h" legend={<Legend items={[{ name: "f(x)", color: SERIES[0] }, { name: "Tangente", color: SERIES[2] }, { name: "Secante (h)", color: SERIES[1] }]} />}>
        <XYChart
          ariaLabel={`Gráfica de ${fn.label} con su tangente en x = ${fmt(x0, 2)}`}
          x={[a, b]}
          y={[yLo - pad, yHi + pad]}
          series={[
            { name: "f(x)", color: SERIES[0], points: curve },
            { name: "Tangente", color: SERIES[2], points: tangent.map((p) => ({ x: p.x, y: Math.max(yLo - pad, Math.min(yHi + pad, p.y)) })) },
            { name: "Secante", color: SERIES[1], points: secant, kind: "dots" },
          ]}
          vlines={[{ x: x0, label: "x₀" }]}
        />
      </ChartCard>
      <ChartCard
        title="Error de la derivada numérica según h"
        subtitle="Ejes en log₁₀: la pendiente de cada recta indica el orden del error"
        legend={<Legend items={[{ name: "Hacia delante", color: SERIES[1] }, { name: "Central", color: SERIES[2] }]} />}
        table={{ head: ["log₁₀ h", "log₁₀ error (delante)", "log₁₀ error (central)"], rows: errs.map((e) => [fmt(e.lh, 2), fmt(e.fwd, 2), fmt(e.cen, 2)]) }}
      >
        <XYChart
          ariaLabel="Error de la derivada numérica en función de h"
          height={200}
          x={[-9, 0]}
          y={[Math.min(...errs.map((e) => e.cen), -12), 1]}
          series={[
            { name: "Hacia delante", color: SERIES[1], points: errs.map((e) => ({ x: e.lh, y: e.fwd })) },
            { name: "Central", color: SERIES[2], points: errs.map((e) => ({ x: e.lh, y: e.cen })) },
          ]}
          vlines={[{ x: logH, label: "h actual" }]}
          formatX={pow10Tick}
          formatY={pow10Tick}
        />
      </ChartCard>
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 2. gradient descent
function Landscape({ sid, path }: { sid: string; path: { x: number; y: number }[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const s = SURFACES.find((x) => x.id === sid)!;
  const [x0, x1, y0, y1] = s.range;
  const W = 360;
  const H = Math.round((W * (y1 - y0)) / (x1 - x0));
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const G = 90;
    const cw = W / G;
    const ch = H / G;
    const vals: number[] = [];
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) vals.push(Math.log10(1e-3 + s.f(x0 + ((i + 0.5) / G) * (x1 - x0), y1 - ((j + 0.5) / G) * (y1 - y0))));
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    vals.forEach((v, k) => {
      const tt = (v - lo) / (hi - lo || 1);
      // Single-hue sequential ramp: dark (low loss) → light (high loss).
      const l = 12 + tt * 58;
      ctx.fillStyle = `hsl(215 60% ${l}%)`;
      ctx.fillRect((k % G) * cw, Math.floor(k / G) * ch, cw + 0.5, ch + 0.5);
    });
    const px = (x: number) => ((x - x0) / (x1 - x0)) * W;
    const py = (y: number) => ((y1 - y) / (y1 - y0)) * H;
    ctx.strokeStyle = "#f2c14e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    path.forEach((p, i) => (i ? ctx.lineTo(px(p.x), py(p.y)) : ctx.moveTo(px(p.x), py(p.y))));
    ctx.stroke();
    ctx.fillStyle = "#f2c14e";
    for (const p of path.slice(0, 60)) ctx.fillRect(px(p.x) - 2, py(p.y) - 2, 4, 4);
    ctx.strokeStyle = "#e9eef8";
    ctx.lineWidth = 2;
    const [mx, my] = s.minimum;
    ctx.beginPath();
    ctx.moveTo(px(mx) - 6, py(my) - 6);
    ctx.lineTo(px(mx) + 6, py(my) + 6);
    ctx.moveTo(px(mx) + 6, py(my) - 6);
    ctx.lineTo(px(mx) - 6, py(my) + 6);
    ctx.stroke();
  }, [s, path, H, x0, x1, y0, y1]);
  return <canvas ref={ref} width={W} height={H} className="w-full max-w-[360px] rounded-[2px] [image-rendering:pixelated]" role="img" aria-label={`Superficie ${s.label} con la trayectoria del descenso de gradiente (${path.length - 1} pasos)`} />;
}

function Gradient() {
  const [sid, setSid] = useState("valle");
  const s = SURFACES.find((x) => x.id === sid)!;
  const [lr, setLr] = useState(0.09);
  const [steps, setSteps] = useState(60);
  const [mom, setMom] = useState(0);
  const path = useMemo(() => gradientDescent(s, lr, steps, mom), [s, lr, steps, mom]);
  const last = path[path.length - 1];
  const diverged = !isFinite(last.loss) || last.loss > path[0].loss;
  const curve = path.map((p, i) => ({ x: i, y: Math.log10(Math.max(1e-12, Math.min(1e12, p.loss))) }));
  const maxLr = sid === "rosenbrock" ? 0.05 : 1.2 * (s.maxRate ?? 1);
  return (
    <LabLayout
      controls={
        <>
          <Select label="Superficie de pérdida" value={sid} onChange={(v) => (setSid(v), setLr(v === "rosenbrock" ? 0.01 : v === "valle" ? 0.09 : 0.2))} options={SURFACES.map((x) => ({ value: x.id, label: x.label }))} />
          <Slider label="Tasa de aprendizaje α" value={lr} min={0.001} max={maxLr} step={0.001} onChange={setLr} format={(v) => v.toFixed(3)} />
          <Slider label="Pasos" value={steps} min={1} max={sid === "rosenbrock" ? 3000 : 300} onChange={setSteps} />
          <Slider label="Momento β" value={mom} min={0} max={0.95} step={0.05} onChange={setMom} format={(v) => v.toFixed(2)} />
        </>
      }
      explain={
        <>
          <p>
            El <strong>descenso de gradiente</strong> repite x ← x − α·∇f(x): da un paso en la dirección de máxima bajada. Así se entrenan la regresión logística y las redes neuronales.
          </p>
          <p className="mt-2">
            Para una pérdida cuadrática con curvatura máxima L, el método converge solo si α &lt; 2/L{s.maxRate ? ` (aquí, α < ${fmt(s.maxRate, 2)})` : ""}. Por encima, cada paso se pasa del mínimo y la pérdida <strong>crece</strong>. En el valle alargado las dos direcciones tienen curvaturas muy distintas: un α seguro para la dirección empinada avanza muy lento en la plana (zigzag). Escalar las variables o añadir <strong>momento</strong> lo mejora.
          </p>
          <p className="mt-2 text-muted">La × blanca marca el mínimo exacto. Los colores oscuros son pérdidas bajas (escala logarítmica).</p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Pérdida inicial" value={fmt(path[0].loss, 4)} />
        <Stat label="Pérdida final" value={isFinite(last.loss) ? (last.loss < 1e-4 ? last.loss.toExponential(2) : fmt(last.loss, 4)) : "∞"} note={diverged ? "diverge" : "converge"} />
        <Stat label="Posición final" value={`(${fmt(last.x, 3)}, ${fmt(last.y, 3)})`} />
        <Stat label="Límite teórico 2/L" value={s.maxRate ? fmt(s.maxRate, 3) : "no cuadrática"} />
      </div>
      <div className="grid xl:grid-cols-[auto_minmax(0,1fr)] gap-4 items-start">
        <figure className="px-panel p-4">
          <figcaption className="font-bold mb-2">Trayectoria sobre la superficie</figcaption>
          <Landscape sid={sid} path={path} />
        </figure>
        <ChartCard title="Pérdida por iteración" subtitle="Eje vertical en log₁₀" table={{ head: ["Paso", "x", "y", "Pérdida"], rows: path.filter((_, i) => i % Math.max(1, Math.floor(path.length / 40)) === 0).map((p, i) => [i, fmt(p.x, 4), fmt(p.y, 4), p.loss.toExponential(3)]) }}>
          <XYChart ariaLabel="Pérdida en función de la iteración" height={220} x={[0, Math.max(1, path.length - 1)]} y={[Math.min(...curve.map((c) => c.y)) - 0.5, Math.max(...curve.map((c) => c.y)) + 0.5]} series={[{ name: "log₁₀ pérdida", color: SERIES[0], points: curve }]} formatY={pow10Tick} formatX={intTick} />
        </ChartCard>
      </div>
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 3. linear maps
const PRESETS: { id: string; label: string; m: Mat2 }[] = [
  { id: "identidad", label: "Identidad", m: [1, 0, 0, 1] },
  { id: "escala", label: "Escalado (2, 0,5)", m: [2, 0, 0, 0.5] },
  { id: "cizalla", label: "Cizalla", m: [1, 1, 0, 1] },
  { id: "rotacion", label: "Rotación 30°", m: [Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6), Math.sin(Math.PI / 6), Math.cos(Math.PI / 6)] },
  { id: "simetrica", label: "Simétrica [[2, 1], [1, 3]]", m: [2, 1, 1, 3] },
  { id: "singular", label: "Singular (aplasta el plano)", m: [1, 2, 0.5, 1] },
];

function Matrices() {
  const [m, setM] = useState<Mat2>([2, 1, 1, 3]);
  const e = eigen2(m);
  const d = det2(m);
  const set = (i: number, v: number) => setM((old) => old.map((x, j) => (j === i ? v : x)) as Mat2);
  const S = 300;
  const R = 4;
  const p = (v: [number, number]) => [S / 2 + (v[0] / R) * (S / 2), S / 2 - (v[1] / R) * (S / 2)] as const;
  const lines: { a: [number, number]; b: [number, number] }[] = [];
  for (let k = -3; k <= 3; k++) {
    lines.push({ a: apply2(m, [k, -3]), b: apply2(m, [k, 3]) });
    lines.push({ a: apply2(m, [-3, k]), b: apply2(m, [3, k]) });
  }
  const square = ([[0, 0], [1, 0], [1, 1], [0, 1]] as [number, number][]).map((v) => apply2(m, v));
  const i1 = apply2(m, [1, 0]);
  const j1 = apply2(m, [0, 1]);
  return (
    <LabLayout
      controls={
        <>
          <Select label="Ejemplo" value={PRESETS.find((x) => x.m.every((v, i) => Math.abs(v - m[i]) < 1e-9))?.id ?? "propia"} onChange={(id) => setM(PRESETS.find((x) => x.id === id)?.m ?? m)} options={[...PRESETS.map((x) => ({ value: x.id, label: x.label })), { value: "propia", label: "Matriz propia" }]} />
          {(["a (fila 1, col 1)", "b (fila 1, col 2)", "c (fila 2, col 1)", "d (fila 2, col 2)"] as const).map((lab, i) => (
            <Slider key={lab} label={lab} value={m[i]} min={-3} max={3} step={0.1} onChange={(v) => set(i, v)} format={(v) => fmt(v, 2)} />
          ))}
        </>
      }
      explain={
        <>
          <p>
            Una matriz 2×2 <strong>transforma el plano</strong>: sus columnas dicen adónde van los vectores (1, 0) y (0, 1). La rejilla deformada muestra qué le pasa a todo el plano.
          </p>
          <p className="mt-2">
            El <strong>determinante</strong> es el factor por el que se multiplica el área (el cuadrado unidad, en dorado). Si es 0, el plano se aplasta sobre una recta y el sistema A·x = b no tiene solución única. Si es negativo, la orientación se invierte.
          </p>
          <p className="mt-2">
            Los <strong>autovectores</strong> son las direcciones que solo se estiran (A·v = λ·v). En las matrices de covarianza son las <strong>componentes principales</strong> del PCA, y los autovalores, la varianza en cada dirección. Una rotación no tiene autovectores reales.
          </p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Determinante" value={fmt(d, 3)} note={Math.abs(d) < 1e-9 ? "singular" : d < 0 ? "invierte la orientación" : "conserva la orientación"} />
        <Stat label="Traza" value={fmt(m[0] + m[3], 3)} />
        <Stat label="Autovalor λ₁" value={e.real ? fmt(e.values[0], 3) : `${fmt(e.values[0], 3)} + ${fmt(e.imag, 3)}i`} />
        <Stat label="Autovalor λ₂" value={e.real ? fmt(e.values[1], 3) : `${fmt(e.values[1], 3)} − ${fmt(e.imag, 3)}i`} />
      </div>
      <figure className="px-panel p-4">
        <figcaption className="font-bold mb-2">El plano transformado</figcaption>
        <Legend items={[{ name: "A·(1, 0)", color: SERIES[0] }, { name: "A·(0, 1)", color: SERIES[1] }, { name: "Autovectores", color: SERIES[2], dashed: true }]} />
        <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[360px] mt-2" role="img" aria-label={`Rejilla transformada por la matriz [[${fmt(m[0])}, ${fmt(m[1])}], [${fmt(m[2])}, ${fmt(m[3])}]], determinante ${fmt(d, 2)}`}>
          <rect width={S} height={S} fill="#141f3a" />
          {lines.map((l, k) => {
            const [ax, ay] = p(l.a);
            const [bx, by] = p(l.b);
            return <line key={k} x1={ax} y1={ay} x2={bx} y2={by} stroke="#2c3f6b" strokeWidth={1} />;
          })}
          <line x1={0} y1={S / 2} x2={S} y2={S / 2} stroke="#5f6f94" strokeWidth={1} />
          <line x1={S / 2} y1={0} x2={S / 2} y2={S} stroke="#5f6f94" strokeWidth={1} />
          <polygon points={square.map((v) => p(v).join(",")).join(" ")} fill="#f2c14e" fillOpacity={0.25} stroke="#f2c14e" strokeWidth={2} />
          {e.real &&
            e.vectors.map((v, k) => {
              const [ax, ay] = p([-v[0] * 4, -v[1] * 4]);
              const [bx, by] = p([v[0] * 4, v[1] * 4]);
              return <line key={k} x1={ax} y1={ay} x2={bx} y2={by} stroke={SERIES[2]} strokeWidth={2} strokeDasharray="6 4" />;
            })}
          {[i1, j1].map((v, k) => {
            const [bx, by] = p(v);
            return <line key={k} x1={S / 2} y1={S / 2} x2={bx} y2={by} stroke={SERIES[k]} strokeWidth={3} strokeLinecap="round" />;
          })}
        </svg>
        <p className="text-xs text-muted mt-2">Área del cuadrado transformado = |det| = {fmt(Math.abs(d), 3)}.</p>
      </figure>
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 4. numerical integration
const INTEGRANDS: { id: string; label: string; f: (x: number) => number; a: number; b: number; exact: number; note: string }[] = [
  { id: "normal", label: "Densidad normal estándar en [−1, 1]", f: (x) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI), a: -1, b: 1, exact: 0.6826894921370859, note: "P(−1 ≤ Z ≤ 1): la regla del 68 %." },
  { id: "gauss", label: "e^(−x²) en [0, 2]", f: (x) => Math.exp(-x * x), a: 0, b: 2, exact: 0.8820813907624215, note: "No tiene primitiva elemental: √π/2·erf(2)." },
  { id: "cuadrado", label: "x² en [0, 3]", f: (x) => x * x, a: 0, b: 3, exact: 9, note: "Primitiva x³/3: (27 − 0)/3 = 9." },
  { id: "seno", label: "sen x en [0, π]", f: Math.sin, a: 0, b: Math.PI, exact: 2, note: "−cos π + cos 0 = 2." },
  { id: "exponencial", label: "Densidad exponencial (λ = 1) en [0, 2]", f: (x) => Math.exp(-x), a: 0, b: 2, exact: 1 - Math.exp(-2), note: "P(T ≤ 2) = 1 − e⁻²: probabilidad acumulada de un tiempo de espera." },
];
const RULES: { id: Rule; label: string }[] = [
  { id: "izquierda", label: "Rectángulos (izquierda)" },
  { id: "punto-medio", label: "Punto medio" },
  { id: "trapecios", label: "Trapecios" },
  { id: "simpson", label: "Simpson" },
];

function Integrals() {
  const [iid, setIid] = useState("normal");
  const [rule, setRule] = useState<Rule>("izquierda");
  const [n, setN] = useState(8);
  const g = INTEGRANDS.find((x) => x.id === iid)!;
  const val = integrate(g.f, g.a, g.b, n, rule);
  const mc = monteCarlo(g.f, g.a, g.b, n * 50, 7);
  const h = (g.b - g.a) / n;
  const bars =
    rule === "simpson"
      ? []
      : Array.from({ length: n }, (_, i) => {
          const x0 = g.a + i * h;
          const y = rule === "izquierda" ? g.f(x0) : rule === "punto-medio" ? g.f(x0 + h / 2) : (g.f(x0) + g.f(x0 + h)) / 2;
          return { x0, x1: x0 + h, y, color: SERIES[0], label: `[${fmt(x0, 2)}, ${fmt(x0 + h, 2)}]: ${fmt(y * h, 4)}` };
        });
  const curve = sample(g.f, g.a, g.b, 200);
  const ymax = Math.max(...curve.map((p) => p.y));
  const conv = [2, 4, 8, 16, 32, 64, 128, 256].map((k) => ({ k, ...Object.fromEntries(RULES.map((r) => [r.id, Math.log10(Math.abs(integrate(g.f, g.a, g.b, k, r.id) - g.exact) + 1e-16)])) }) as { k: number } & Record<Rule, number>);
  return (
    <LabLayout
      controls={
        <>
          <Select label="Integral" value={iid} onChange={setIid} options={INTEGRANDS.map((x) => ({ value: x.id, label: x.label }))} />
          <Select label="Regla" value={rule} onChange={setRule} options={RULES.map((r) => ({ value: r.id, label: r.label }))} />
          <Slider label="Subintervalos n" value={n} min={1} max={64} onChange={setN} />
        </>
      }
      explain={
        <>
          <p>
            La <strong>integral</strong> es el área bajo la curva. Se aproxima partiendo [a, b] en n trozos: rectángulos, trapecios o parábolas (Simpson). Con más trozos el error baja, y lo hace más rápido cuanto mejor es la regla: rectángulos ∝ 1/n, trapecios y punto medio ∝ 1/n², Simpson ∝ 1/n⁴.
          </p>
          <p className="mt-2">
            En estadística, el área bajo una <strong>densidad</strong> es una <strong>probabilidad</strong>. {g.note}
          </p>
          <p className="mt-2 text-muted">Monte Carlo estima la misma área con puntos al azar (aquí {n * 50}): su error baja como 1/√n, mucho más lento, pero no empeora con la dimensión.</p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Valor exacto" value={fmt(g.exact, 6)} />
        <Stat label={RULES.find((r) => r.id === rule)!.label} value={fmt(val, 6)} note={`error ${Math.abs(val - g.exact).toExponential(1)}`} />
        <Stat label={`Monte Carlo (${n * 50} puntos)`} value={fmt(mc.value, 4)} note={`± ${fmt(1.96 * mc.se, 4)} (IC 95 %)`} />
        <Stat label="Ancho de cada trozo" value={fmt(h, 4)} />
      </div>
      <ChartCard title="Área bajo la curva" subtitle={rule === "simpson" ? "Simpson ajusta parábolas por cada par de trozos (no se dibujan)" : "Cada barra es la contribución de un trozo"}>
        <XYChart ariaLabel={`Aproximación de la integral de ${g.label} con ${n} trozos`} x={[g.a, g.b]} y={[Math.min(0, ...curve.map((p) => p.y)), ymax * 1.15]} bars={bars} series={[{ name: "f(x)", color: SERIES[1], points: curve }]} />
      </ChartCard>
      <ChartCard
        title="Convergencia de cada regla"
        subtitle="log₁₀ del error frente al número de trozos"
        legend={<Legend items={RULES.map((r, i) => ({ name: r.label, color: SERIES[i] }))} />}
        table={{ head: ["n", ...RULES.map((r) => `Error ${r.label.toLowerCase()}`)], rows: conv.map((c) => [c.k, ...RULES.map((r) => (10 ** c[r.id]).toExponential(2))]) }}
      >
        <XYChart ariaLabel="Error de integración según el número de trozos" height={200} x={[1, 8]} y={[-16, 1]} series={RULES.map((r, i) => ({ name: r.label, color: SERIES[i], points: conv.map((c, k) => ({ x: k + 1, y: c[r.id] })) }))} formatX={(v) => (Number.isInteger(v) && v >= 1 && v <= 8 ? String(2 ** v) : "")} formatY={pow10Tick} />
      </ChartCard>
    </LabLayout>
  );
}

const PANELS: Record<string, JSX.Element> = { funciones: <Derivatives />, gradiente: <Gradient />, matrices: <Matrices />, integrales: <Integrals /> };

export function MathLab({ initial }: { initial?: string }) {
  const { update } = useGame();
  const tabs = LAB_TABS.matematicas;
  const [tab, setTab] = useState(tabs.some((t) => t.id === initial) ? initial! : tabs[0].id);
  useEffect(() => {
    update((s) => A.recordLab(s, `math-${tab}`));
  }, [tab, update]);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="px-title text-gold text-2xl">Laboratorio matemático</h1>
        <p className="text-muted text-sm">Las matemáticas que sostienen la estadística y el machine learning, para tocarlas: derivadas, optimización, matrices e integrales. Todo se calcula en el momento.</p>
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
