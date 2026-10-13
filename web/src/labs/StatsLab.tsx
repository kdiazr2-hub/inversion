// Statistical laboratory: every chart is computed from the chosen parameters (seeded simulations).
import { useEffect, useMemo, useState } from "react";
import { ChartCard, fmt, Legend, SERIES, XYChart, type Pt } from "../components/Charts";
import * as A from "../engine/actions";
import { useGame } from "../engine/store";
import * as S from "../stats/math";
import { LabLayout, Select, Slider, Stat } from "./controls";

const pct = (v: number, d = 1) => `${(v * 100).toLocaleString("es", { maximumFractionDigits: d })} %`;

function useSeed() {
  const [seed, setSeed] = useState(1);
  return { seed, again: () => setSeed((s) => s + 1) };
}

function NewSample({ again }: { again: () => void }) {
  return (
    <button className="btn-sky" onClick={again}>
      ↻ Nueva simulación
    </button>
  );
}

// ------------------------------------------------------------------ 1. coins & dice (LLN)
function CoinsDice() {
  const { seed, again } = useSeed();
  const [kind, setKind] = useState<"moneda" | "dado">("moneda");
  const [n, setN] = useState(500);
  const [p, setP] = useState(0.5);
  const sim = useMemo(() => {
    const r = S.rng(seed);
    const pts: Pt[] = [];
    let hits = 0;
    const faces = new Array(6).fill(0);
    for (let i = 1; i <= n; i++) {
      if (kind === "moneda") hits += r.next() < p ? 1 : 0;
      else {
        const f = r.int(1, 6);
        faces[f - 1]++;
        hits += f === 6 ? 1 : 0;
      }
      if (i < 50 || i % Math.ceil(n / 300) === 0 || i === n) pts.push({ x: i, y: hits / i });
    }
    return { pts, hits, faces };
  }, [seed, kind, n, p]);
  const theo = kind === "moneda" ? p : 1 / 6;
  return (
    <LabLayout
      controls={
        <>
          <Select label="Experimento" value={kind} onChange={setKind} options={[{ value: "moneda", label: "Lanzar una moneda" }, { value: "dado", label: "Lanzar un dado (¿sale 6?)" }]} />
          <Slider label="Lanzamientos" value={n} min={10} max={5000} step={10} onChange={setN} />
          {kind === "moneda" && <Slider label="P(cara)" value={p} min={0.05} max={0.95} step={0.05} onChange={setP} format={(v) => v.toFixed(2)} />}
          <NewSample again={again} />
        </>
      }
      explain={
        <p>
          <strong>Ley de los grandes números:</strong> la proporción observada se acerca a la probabilidad teórica ({fmt(theo, 3)}) a medida que crece el número de lanzamientos, pero nunca de forma garantizada en una serie concreta. Con pocos lanzamientos, las diferencias grandes son normales. El error típico de la proporción es √(p(1−p)/n) = {fmt(Math.sqrt((theo * (1 - theo)) / n), 4)}: se reduce con la raíz de n, no con n.
        </p>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Proporción observada" value={fmt(sim.hits / n, 4)} />
        <Stat label="Probabilidad teórica" value={fmt(theo, 4)} />
        <Stat label="Diferencia" value={fmt(sim.hits / n - theo, 4)} />
      </div>
      <ChartCard title="Proporción acumulada de éxitos" subtitle="La línea horizontal es la probabilidad teórica" table={{ head: ["Lanzamiento", "Proporción"], rows: sim.pts.map((p) => [p.x, p.y]) }}>
        <XYChart ariaLabel="Proporción acumulada frente al número de lanzamientos" x={[1, n]} y={[0, 1]} xLabel="Lanzamientos" yLabel="Proporción" series={[{ name: "Observada", color: SERIES[0], points: sim.pts }]} segments={[{ x0: 1, x1: n, y0: theo, y1: theo, color: SERIES[3] }]} formatX={(v) => fmt(v, 0)} />
      </ChartCard>
      {kind === "dado" && (
        <ChartCard title="Frecuencia de cada cara" subtitle={`Esperado por cara: ${fmt(n / 6, 1)}`} table={{ head: ["Cara", "Veces"], rows: sim.faces.map((f, i) => [i + 1, f]) }}>
          <XYChart ariaLabel="Columnas de frecuencia por cara" x={[0.5, 6.5]} y={[0, Math.max(...sim.faces) * 1.2]} bars={sim.faces.map((f, i) => ({ x0: i + 0.6, x1: i + 1.4, y: f, color: SERIES[0], label: `Cara ${i + 1}: ${f}` }))} segments={[{ x0: 0.5, x1: 6.5, y0: n / 6, y1: n / 6, color: SERIES[3] }]} formatX={(v) => (Number.isInteger(v) ? String(v) : "")} />
        </ChartCard>
      )}
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 2. CLT
type Pop = "uniforme" | "exponencial" | "bimodal" | "lognormal" | "bernoulli";
const POPS: Record<Pop, { label: string; draw: (r: S.Rng) => number; mu: number; sigma: number; range: [number, number] }> = {
  uniforme: { label: "Uniforme (0, 10)", draw: (r) => r.next() * 10, mu: 5, sigma: 10 / Math.sqrt(12), range: [0, 10] },
  exponencial: { label: "Exponencial (media 2)", draw: (r) => r.exponential(0.5), mu: 2, sigma: 2, range: [0, 12] },
  bimodal: { label: "Bimodal (mezcla de normales)", draw: (r) => (r.next() < 0.5 ? r.normal(2, 0.7) : r.normal(7, 0.7)), mu: 4.5, sigma: Math.sqrt(0.49 + 6.25), range: [0, 9.5] },
  lognormal: { label: "Lognormal (muy asimétrica)", draw: (r) => Math.exp(r.normal(0.5, 0.8)), mu: Math.exp(0.5 + 0.32), sigma: Math.sqrt((Math.exp(0.64) - 1) * Math.exp(1 + 0.64)), range: [0, 15] },
  bernoulli: { label: "Bernoulli (p = 0,2)", draw: (r) => (r.next() < 0.2 ? 1 : 0), mu: 0.2, sigma: Math.sqrt(0.16), range: [-0.1, 1.1] },
};

function CLT() {
  const { seed, again } = useSeed();
  const [pop, setPop] = useState<Pop>("exponencial");
  const [n, setN] = useState(10);
  const [reps, setReps] = useState(2000);
  const P = POPS[pop];
  const sim = useMemo(() => {
    const r = S.rng(seed * 7 + 1);
    const popSample = Array.from({ length: 4000 }, () => P.draw(r));
    const means = Array.from({ length: reps }, () => {
      let s = 0;
      for (let i = 0; i < n; i++) s += P.draw(r);
      return s / n;
    });
    return { popSample, means };
  }, [seed, pop, n, reps, P]);
  const se = P.sigma / Math.sqrt(n);
  const lo = Math.min(P.mu - 4.5 * se, S.quantile(sim.means, 0.001));
  const hi = Math.max(P.mu + 4.5 * se, S.quantile(sim.means, 0.999));
  const h = S.histogram(sim.means, lo, hi, 40);
  const curve = Array.from({ length: 120 }, (_, i) => {
    const x = lo + ((hi - lo) * i) / 119;
    return { x, y: S.normalPdf(x, P.mu, se) };
  });
  const ph = S.histogram(sim.popSample, P.range[0], P.range[1], 40);
  return (
    <LabLayout
      controls={
        <>
          <Select label="Población" value={pop} onChange={setPop} options={(Object.keys(POPS) as Pop[]).map((k) => ({ value: k, label: POPS[k].label }))} />
          <Slider label="Tamaño de cada muestra (n)" value={n} min={1} max={200} onChange={setN} />
          <Slider label="Número de muestras" value={reps} min={100} max={10000} step={100} onChange={setReps} />
          <NewSample again={again} />
        </>
      }
      explain={
        <>
          <p>
            <strong>Teorema central del límite:</strong> si las observaciones son independientes y la población tiene varianza finita, la distribución de la media muestral se aproxima a una normal con media μ y desviación σ/√n cuando n crece. Lo que se vuelve normal es la <em>media</em>, no los datos: el histograma de la población sigue igual de asimétrico.
          </p>
          <p className="mt-2">
            Cuánto n hace falta depende de la forma de la población: con la uniforme basta n ≈ 5; con la lognormal o una Bernoulli con p pequeña hacen falta muchos más. Compara la DE de las medias simuladas con el error estándar teórico.
          </p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="μ de la población" value={fmt(P.mu, 3)} />
        <Stat label="Media de las medias" value={fmt(S.mean(sim.means), 3)} />
        <Stat label="EE teórico σ/√n" value={fmt(se, 4)} />
        <Stat label="DE de las medias" value={fmt(S.sd(sim.means), 4)} />
      </div>
      <div className="grid xl:grid-cols-2 gap-4">
        <ChartCard title="Población" subtitle="4 000 observaciones individuales">
          <XYChart ariaLabel="Histograma de la población" height={200} x={P.range} y={[0, Math.max(...ph.map((b) => b.density)) * 1.15]} bars={ph.map((b) => ({ x0: b.x0, x1: b.x1, y: b.density, color: SERIES[1] }))} formatY={(v) => fmt(v, 2)} />
        </ChartCard>
        <ChartCard
          title={`Medias de ${reps} muestras de tamaño ${n}`}
          subtitle="Histograma de densidad y curva normal N(μ, σ/√n)"
          legend={<Legend items={[{ name: "Medias simuladas", color: SERIES[0] }, { name: "Aproximación normal", color: SERIES[3] }]} />}
          table={{ head: ["Desde", "Hasta", "Frecuencia"], rows: h.map((b) => [b.x0, b.x1, b.count]) }}
        >
          <XYChart ariaLabel="Histograma de medias muestrales con curva normal" height={200} x={[lo, hi]} y={[0, Math.max(...h.map((b) => b.density), ...curve.map((c) => c.y)) * 1.15]} bars={h.map((b) => ({ x0: b.x0, x1: b.x1, y: b.density, color: SERIES[0] }))} series={[{ name: "Normal", color: SERIES[3], points: curve }]} formatY={(v) => fmt(v, 2)} />
        </ChartCard>
      </div>
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 3. distributions
type Dist = "binomial" | "poisson" | "geometrica" | "hipergeometrica" | "normal" | "exponencial" | "uniforme" | "gamma" | "beta" | "t" | "chi2" | "f" | "lognormal";
interface DistDef {
  label: string;
  discrete: boolean;
  params: { key: string; label: string; min: number; max: number; step: number; init: number }[];
  pdf: (x: number, p: number[]) => number;
  range: (p: number[]) => [number, number];
  mean: (p: number[]) => number;
  variance: (p: number[]) => number;
  use: string;
  formula: string;
}
const DISTS: Record<Dist, DistDef> = {
  binomial: { label: "Binomial", discrete: true, params: [{ key: "n", label: "n ensayos", min: 1, max: 60, step: 1, init: 20 }, { key: "p", label: "p éxito", min: 0.01, max: 0.99, step: 0.01, init: 0.3 }], pdf: (k, [n, p]) => S.binomPmf(k, n, p), range: ([n]) => [0, n], mean: ([n, p]) => n * p, variance: ([n, p]) => n * p * (1 - p), use: "Número de éxitos en n ensayos independientes con la misma probabilidad (pacientes que responden de n tratados).", formula: "P(X=k) = C(n,k) pᵏ (1−p)ⁿ⁻ᵏ" },
  poisson: { label: "Poisson", discrete: true, params: [{ key: "l", label: "λ (tasa)", min: 0.2, max: 25, step: 0.1, init: 4 }], pdf: (k, [l]) => S.poissonPmf(k, l), range: ([l]) => [0, Math.ceil(l + 5 * Math.sqrt(l) + 3)], mean: ([l]) => l, variance: ([l]) => l, use: "Conteos de eventos raros en un intervalo fijo (llamadas por hora, mutaciones por gen). Supone eventos independientes y tasa constante; si la varianza supera mucho a la media hay sobredispersión.", formula: "P(X=k) = λᵏ e^(−λ) / k!" },
  geometrica: { label: "Geométrica", discrete: true, params: [{ key: "p", label: "p éxito", min: 0.03, max: 0.9, step: 0.01, init: 0.2 }], pdf: (k, [p]) => S.geomPmf(k, p), range: ([p]) => [1, Math.ceil(Math.log(0.002) / Math.log(1 - p))], mean: ([p]) => 1 / p, variance: ([p]) => (1 - p) / (p * p), use: "Número de intentos hasta el primer éxito (intentos hasta aprobar).", formula: "P(X=k) = (1−p)ᵏ⁻¹ p, k = 1, 2, …" },
  hipergeometrica: { label: "Hipergeométrica", discrete: true, params: [{ key: "N", label: "N población", min: 10, max: 200, step: 1, init: 50 }, { key: "K", label: "K éxitos en la población", min: 1, max: 100, step: 1, init: 10 }, { key: "n", label: "n extraídos sin reemplazo", min: 1, max: 60, step: 1, init: 8 }], pdf: (k, [N, K, n]) => S.hypergeomPmf(k, N, Math.min(K, N), Math.min(n, N)), range: ([N, K, n]) => [0, Math.min(Math.min(K, N), Math.min(n, N))], mean: ([N, K, n]) => (Math.min(n, N) * Math.min(K, N)) / N, variance: ([N, K, n]) => { const k = Math.min(K, N); const m = Math.min(n, N); return (m * k * (N - k) * (N - m)) / (N * N * (N - 1)); }, use: "Éxitos al extraer sin reemplazo de una población finita (control de calidad, prueba exacta de Fisher).", formula: "P(X=k) = C(K,k) C(N−K,n−k) / C(N,n)" },
  normal: { label: "Normal", discrete: false, params: [{ key: "mu", label: "μ", min: -10, max: 10, step: 0.5, init: 0 }, { key: "s", label: "σ", min: 0.2, max: 5, step: 0.1, init: 1 }], pdf: (x, [m, s]) => S.normalPdf(x, m, s), range: ([m, s]) => [m - 4 * s, m + 4 * s], mean: ([m]) => m, variance: ([, s]) => s * s, use: "Suma de muchos efectos pequeños e independientes (errores de medida, medias muestrales). No la asumas para datos acotados, conteos o tiempos.", formula: "f(x) = 1/(σ√(2π)) · exp(−(x−μ)²/(2σ²))" },
  exponencial: { label: "Exponencial", discrete: false, params: [{ key: "r", label: "λ (tasa)", min: 0.1, max: 4, step: 0.1, init: 1 }], pdf: (x, [r]) => S.expPdf(x, r), range: ([r]) => [0, 6 / r], mean: ([r]) => 1 / r, variance: ([r]) => 1 / (r * r), use: "Tiempo hasta un evento con tasa constante (sin memoria). Base de muchos modelos de supervivencia simples.", formula: "f(x) = λ e^(−λx), x ≥ 0" },
  uniforme: { label: "Uniforme", discrete: false, params: [{ key: "a", label: "a", min: -5, max: 5, step: 0.5, init: 0 }, { key: "w", label: "ancho (b − a)", min: 0.5, max: 10, step: 0.5, init: 4 }], pdf: (x, [a, w]) => S.uniformPdf(x, a, a + w), range: ([a, w]) => [a - w * 0.2, a + w * 1.2], mean: ([a, w]) => a + w / 2, variance: ([, w]) => (w * w) / 12, use: "Todos los valores de un intervalo igual de probables (números aleatorios, redondeo).", formula: "f(x) = 1/(b−a) en [a, b]" },
  gamma: { label: "Gamma", discrete: false, params: [{ key: "k", label: "k (forma)", min: 0.5, max: 12, step: 0.5, init: 2 }, { key: "t", label: "θ (escala)", min: 0.2, max: 4, step: 0.1, init: 1.5 }], pdf: (x, [k, t]) => S.gammaPdf(x, k, t), range: ([k, t]) => [0, k * t + 5 * Math.sqrt(k) * t], mean: ([k, t]) => k * t, variance: ([k, t]) => k * t * t, use: "Tiempos de espera hasta k eventos, cantidades positivas asimétricas (costes, lluvias). Previa conjugada de la tasa de Poisson.", formula: "f(x) = x^(k−1) e^(−x/θ) / (Γ(k) θᵏ)" },
  beta: { label: "Beta", discrete: false, params: [{ key: "a", label: "α", min: 0.3, max: 20, step: 0.1, init: 2 }, { key: "b", label: "β", min: 0.3, max: 20, step: 0.1, init: 5 }], pdf: (x, [a, b]) => S.betaPdf(x, a, b), range: () => [0, 1], mean: ([a, b]) => a / (a + b), variance: ([a, b]) => (a * b) / ((a + b) ** 2 * (a + b + 1)), use: "Proporciones y probabilidades en [0, 1]; previa conjugada de la binomial en estadística bayesiana.", formula: "f(x) = x^(α−1)(1−x)^(β−1) / B(α, β)" },
  t: { label: "t de Student", discrete: false, params: [{ key: "df", label: "grados de libertad", min: 1, max: 60, step: 1, init: 5 }], pdf: (x, [df]) => S.tPdf(x, df), range: () => [-5, 5], mean: ([df]) => (df > 1 ? 0 : NaN), variance: ([df]) => (df > 2 ? df / (df - 2) : NaN), use: "Distribución del estadístico t cuando σ se estima con la muestra. Colas más pesadas que la normal; converge a ella al crecer los grados de libertad.", formula: "f(t) ∝ (1 + t²/ν)^(−(ν+1)/2)" },
  chi2: { label: "Chi-cuadrado", discrete: false, params: [{ key: "k", label: "grados de libertad", min: 1, max: 30, step: 1, init: 4 }], pdf: (x, [k]) => S.chi2Pdf(x, k), range: ([k]) => [0, k + 5 * Math.sqrt(2 * k) + 2], mean: ([k]) => k, variance: ([k]) => 2 * k, use: "Suma de k normales estándar al cuadrado; base de las pruebas de independencia, bondad de ajuste y de varianzas.", formula: "f(x) = x^(k/2−1) e^(−x/2) / (2^(k/2) Γ(k/2))" },
  f: { label: "F de Fisher-Snedecor", discrete: false, params: [{ key: "d1", label: "gl numerador", min: 1, max: 30, step: 1, init: 3 }, { key: "d2", label: "gl denominador", min: 2, max: 100, step: 1, init: 20 }], pdf: (x, [a, b]) => S.fPdf(x, a, b), range: () => [0, 5], mean: ([, d2]) => (d2 > 2 ? d2 / (d2 - 2) : NaN), variance: ([d1, d2]) => (d2 > 4 ? (2 * d2 * d2 * (d1 + d2 - 2)) / (d1 * (d2 - 2) ** 2 * (d2 - 4)) : NaN), use: "Cociente de dos varianzas estimadas; se usa en ANOVA y para comparar modelos anidados.", formula: "F = (χ²₁/d₁) / (χ²₂/d₂)" },
  lognormal: { label: "Lognormal", discrete: false, params: [{ key: "mu", label: "μ del logaritmo", min: -1, max: 2, step: 0.1, init: 0 }, { key: "s", label: "σ del logaritmo", min: 0.1, max: 1.5, step: 0.05, init: 0.6 }], pdf: (x, [m, s]) => S.lognormPdf(x, m, s), range: ([m, s]) => [0, Math.exp(m + 3 * s)], mean: ([m, s]) => Math.exp(m + (s * s) / 2), variance: ([m, s]) => (Math.exp(s * s) - 1) * Math.exp(2 * m + s * s), use: "Variables positivas que resultan de efectos multiplicativos (ingresos, concentraciones, tiempos de reparación). Su logaritmo es normal.", formula: "ln X ~ N(μ, σ²)" },
};

function Distributions() {
  const [d, setD] = useState<Dist>("binomial");
  const def = DISTS[d];
  const [vals, setVals] = useState<number[]>(def.params.map((p) => p.init));
  useEffect(() => setVals(DISTS[d].params.map((p) => p.init)), [d]);
  const p = vals.length === def.params.length ? vals : def.params.map((x) => x.init);
  const [lo, hi] = def.range(p);
  let pts: Pt[];
  if (def.discrete) pts = Array.from({ length: Math.max(0, Math.round(hi - lo)) + 1 }, (_, i) => ({ x: lo + i, y: def.pdf(lo + i, p) }));
  else pts = Array.from({ length: 200 }, (_, i) => { const x = lo + ((hi - lo) * i) / 199; return { x, y: def.pdf(x, p) }; }).filter((q) => isFinite(q.y));
  let accum = 0;
  const cdf = def.discrete ? pts.map((q) => ({ x: q.x, y: (accum += q.y) })) : pts.map((q, i) => ({ x: q.x, y: (accum += i ? ((q.y + pts[i - 1].y) / 2) * (q.x - pts[i - 1].x) : 0) }));
  const ymax = Math.min(Math.max(...pts.map((q) => q.y)) * 1.15, d === "beta" || d === "f" || d === "chi2" || d === "gamma" ? 6 : Infinity) || 1;
  return (
    <LabLayout
      controls={
        <>
          <Select label="Distribución" value={d} onChange={setD} options={(Object.keys(DISTS) as Dist[]).map((k) => ({ value: k, label: `${DISTS[k].label} (${DISTS[k].discrete ? "discreta" : "continua"})` }))} />
          {def.params.map((q, i) => (
            <Slider key={d + q.key} label={q.label} value={p[i]} min={q.min} max={q.max} step={q.step} onChange={(v) => setVals(p.map((x, j) => (j === i ? v : x)))} format={(v) => fmt(v, 2)} />
          ))}
        </>
      }
      explain={
        <>
          <p>
            <strong>Cuándo usarla:</strong> {def.use}
          </p>
          <p className="mt-2">
            <strong>{def.discrete ? "Función de masa" : "Densidad"}:</strong> <code className="font-mono text-sky">{def.formula}</code>
          </p>
          <p className="mt-2 text-muted">
            {def.discrete ? "En una distribución discreta, la altura de cada barra es una probabilidad: suman 1." : "En una continua, la altura no es una probabilidad: el área bajo la curva entre dos puntos sí lo es, y el área total es 1."} La función acumulada F(x) = P(X ≤ x) se muestra debajo.
          </p>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Media (teórica)" value={fmt(def.mean(p), 4)} />
        <Stat label="Varianza (teórica)" value={fmt(def.variance(p), 4)} />
      </div>
      <ChartCard title={`${def.label}: ${def.discrete ? "función de masa" : "densidad"}`} table={{ head: ["x", def.discrete ? "P(X=x)" : "f(x)"], rows: pts.filter((_, i) => def.discrete || i % 10 === 0).map((q) => [q.x, q.y]) }}>
        <XYChart
          ariaLabel={`Gráfico de la distribución ${def.label}`}
          x={def.discrete ? [lo - 0.5, hi + 0.5] : [lo, hi]}
          y={[0, ymax]}
          bars={def.discrete ? pts.map((q) => ({ x0: q.x - 0.4, x1: q.x + 0.4, y: q.y, color: SERIES[0], label: `P(X=${q.x}) = ${fmt(q.y, 4)}` })) : []}
          series={def.discrete ? [] : [{ name: "f(x)", color: SERIES[0], points: pts, kind: "area" }]}
          vlines={[{ x: def.mean(p), label: "media", color: SERIES[3] }].filter((v) => isFinite(v.x))}
          formatY={(v) => fmt(v, 3)}
        />
      </ChartCard>
      <ChartCard title="Función de distribución acumulada F(x)">
        <XYChart ariaLabel="Función acumulada" height={180} x={def.discrete ? [lo - 0.5, hi + 0.5] : [lo, hi]} y={[0, 1.02]} series={[{ name: "F(x)", color: SERIES[2], points: cdf, kind: def.discrete ? "step" : "line" }]} formatY={(v) => fmt(v, 2)} />
      </ChartCard>
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 4. confidence intervals
function ConfidenceIntervals() {
  const { seed, again } = useSeed();
  const [n, setN] = useState(20);
  const [conf, setConf] = useState(0.95);
  const [k, setK] = useState(100);
  const mu = 50;
  const sigma = 10;
  const sim = useMemo(() => {
    const r = S.rng(seed * 31 + 5);
    return Array.from({ length: k }, () => {
      const xs = Array.from({ length: n }, () => r.normal(mu, sigma));
      const t = S.tTestOne(xs, mu, conf);
      return { lo: t.ci[0], hi: t.ci[1], m: S.mean(xs), hit: t.ci[0] <= mu && mu <= t.ci[1] };
    });
  }, [seed, n, conf, k]);
  const cover = sim.filter((s) => s.hit).length / k;
  const width = S.mean(sim.map((s) => s.hi - s.lo));
  return (
    <LabLayout
      controls={
        <>
          <Slider label="Tamaño muestral n" value={n} min={3} max={200} onChange={setN} />
          <Slider label="Nivel de confianza" value={conf} min={0.5} max={0.99} step={0.01} onChange={setConf} format={(v) => pct(v, 0)} />
          <Slider label="Intervalos simulados" value={k} min={20} max={200} step={10} onChange={setK} />
          <NewSample again={again} />
        </>
      }
      explain={
        <>
          <p>
            Simulamos {k} muestras de una población normal con μ = 50 y σ = 10 y calculamos un intervalo t para cada una. En rojo, los intervalos que <strong>no</strong> contienen μ.
          </p>
          <p className="mt-2">
            El {pct(conf, 0)} describe el <em>procedimiento</em>: a largo plazo, esa proporción de intervalos construidos así cubre el parámetro. Un intervalo concreto ya calculado lo contiene o no; no tiene un {pct(conf, 0)} de probabilidad de contenerlo (eso sería una afirmación bayesiana sobre μ, que requiere una distribución previa).
          </p>
          <p className="mt-2 text-muted">Prueba a subir n: la cobertura se mantiene, pero los intervalos se estrechan (la anchura cae aproximadamente con 1/√n).</p>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Cobertura observada" value={pct(cover)} note={`objetivo ${pct(conf, 0)}`} />
        <Stat label="Intervalos que fallan" value={sim.filter((s) => !s.hit).length} />
        <Stat label="Anchura media" value={fmt(width, 2)} />
      </div>
      <ChartCard title="Intervalos de confianza simulados" subtitle="Cada segmento es un intervalo; la línea vertical es el μ real" legend={<Legend items={[{ name: "Contiene μ", color: SERIES[0] }, { name: "No contiene μ", color: SERIES[1] }]} />}>
        <XYChart
          ariaLabel="Intervalos de confianza simulados"
          height={Math.max(260, k * 3 + 40)}
          x={[mu - 25, mu + 25]}
          y={[0, k + 1]}
          segments={sim.map((s, i) => ({ x0: Math.max(mu - 25, s.lo), x1: Math.min(mu + 25, s.hi), y0: i + 1, y1: i + 1, color: s.hit ? SERIES[0] : SERIES[1], width: k > 120 ? 1.5 : 2 }))}
          vlines={[{ x: mu, label: "μ = 50", color: "#e9eef8" }]}
          formatY={() => ""}
        />
      </ChartCard>
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 5. errors & power
function Power() {
  const [d, setD] = useState(0.5);
  const [n, setN] = useState(30);
  const [alpha, setAlpha] = useState(0.05);
  const z = S.normalInv(1 - alpha / 2);
  const ncp = d * Math.sqrt(n / 2);
  const power = S.powerTwoSample(d, n, alpha);
  const lo = Math.min(-4, ncp - 4);
  const hi = Math.max(4, ncp + 4);
  const xs = Array.from({ length: 240 }, (_, i) => lo + ((hi - lo) * i) / 239);
  const h0 = xs.map((x) => ({ x, y: S.normalPdf(x) }));
  const h1 = xs.map((x) => ({ x, y: S.normalPdf(x, ncp) }));
  const curve = Array.from({ length: 60 }, (_, i) => ({ x: 5 + i * 5, y: S.powerTwoSample(d, 5 + i * 5, alpha) }));
  const n80 = curve.find((c) => c.y >= 0.8);
  return (
    <LabLayout
      controls={
        <>
          <Slider label="Tamaño del efecto d (Cohen)" value={d} min={0} max={1.5} step={0.05} onChange={setD} format={(v) => v.toFixed(2)} />
          <Slider label="n por grupo" value={n} min={5} max={300} onChange={setN} />
          <Slider label="α (nivel de significación)" value={alpha} min={0.001} max={0.2} step={0.001} onChange={setAlpha} format={(v) => v.toFixed(3)} />
        </>
      }
      explain={
        <>
          <p>
            Comparación de dos grupos con una prueba bilateral. La curva azul es la distribución del estadístico si <strong>H₀ es cierta</strong>; la naranja, si existe un efecto d. Rechazamos H₀ cuando el estadístico supera ±{fmt(z, 3)}.
          </p>
          <ul className="list-[square] pl-5 mt-2">
            <li>
              <strong>Error tipo I (α = {fmt(alpha, 3)}):</strong> rechazar H₀ siendo cierta (área de la curva azul más allá de los umbrales).
            </li>
            <li>
              <strong>Error tipo II (β = {fmt(1 - power, 3)}):</strong> no rechazar H₀ cuando hay efecto (área naranja entre los umbrales).
            </li>
            <li>
              <strong>Potencia (1 − β = {pct(power)}):</strong> probabilidad de detectar el efecto si existe.
            </li>
          </ul>
          <p className="mt-2 text-muted">Bajar α reduce los falsos positivos pero también la potencia. Con efecto 0 la potencia es igual a α: solo hay falsos positivos. Esta es la aproximación normal; con n pequeño la prueba t tiene algo menos de potencia.</p>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Potencia" value={pct(power)} />
        <Stat label="β (error tipo II)" value={fmt(1 - power, 3)} />
        <Stat label="n por grupo para 80 %" value={n80 ? `≈ ${Math.ceil((2 * (z + S.normalInv(0.8)) ** 2) / (d * d || 1e-9))}` : d === 0 ? "∞" : "> 300"} />
      </div>
      <ChartCard title="Distribuciones del estadístico bajo H₀ y bajo H₁" legend={<Legend items={[{ name: "Bajo H₀", color: SERIES[0] }, { name: "Bajo H₁", color: SERIES[1] }]} />}>
        <XYChart
          ariaLabel="Distribuciones bajo hipótesis nula y alternativa"
          x={[lo, hi]}
          y={[0, 0.45]}
          bands={[
            { x0: lo, x1: -z, color: "rgba(57,135,229,0.15)" },
            { x0: z, x1: hi, color: "rgba(57,135,229,0.15)" },
          ]}
          series={[
            { name: "H₀", color: SERIES[0], points: h0, kind: "area" },
            { name: "H₁", color: SERIES[1], points: h1 },
          ]}
          vlines={[
            { x: -z, label: "−z crítico", color: "#e9eef8" },
            { x: z, label: "z crítico", color: "#e9eef8" },
          ]}
          formatY={(v) => fmt(v, 2)}
        />
      </ChartCard>
      <ChartCard title="Curva de potencia según n" subtitle="Para el efecto y α elegidos" table={{ head: ["n por grupo", "Potencia"], rows: curve.map((c) => [c.x, c.y]) }}>
        <XYChart ariaLabel="Potencia en función del tamaño muestral" height={200} x={[5, 300]} y={[0, 1]} series={[{ name: "Potencia", color: SERIES[2], points: curve }]} segments={[{ x0: 5, x1: 300, y0: 0.8, y1: 0.8, color: SERIES[3], width: 1 }]} vlines={[{ x: n, label: `n = ${n}` }]} formatY={(v) => pct(v, 0)} formatX={(v) => fmt(v, 0)} />
      </ChartCard>
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 6. bootstrap
function Bootstrap() {
  const { seed, again } = useSeed();
  const [raw, setRaw] = useState("12, 15, 9, 22, 14, 13, 41, 16, 11, 18, 15, 12, 60, 14, 17");
  const [B, setB] = useState(2000);
  const [stat, setStat] = useState<"media" | "mediana">("mediana");
  const data = raw.split(/[\s,;]+/).map(Number).filter((v) => isFinite(v));
  const f = stat === "media" ? S.mean : S.median;
  const boot = useMemo(() => {
    if (data.length < 2) return [];
    const r = S.rng(seed * 13 + 3);
    return Array.from({ length: B }, () => f(Array.from({ length: data.length }, () => data[r.int(0, data.length - 1)])));
  }, [seed, raw, B, stat]); // eslint-disable-line react-hooks/exhaustive-deps
  const ci = boot.length ? [S.quantile(boot, 0.025), S.quantile(boot, 0.975)] : [NaN, NaN];
  const lo = boot.length ? Math.min(...boot) : 0;
  const hi = boot.length ? Math.max(...boot) : 1;
  const h = boot.length ? S.histogram(boot, lo, hi + 1e-9, 30) : [];
  return (
    <LabLayout
      controls={
        <>
          <label className="text-sm text-muted" htmlFor="boot-data">
            Datos (separados por comas)
          </label>
          <textarea id="boot-data" className="input font-mono text-sm h-28" value={raw} onChange={(e) => setRaw(e.target.value)} />
          <Select label="Estadístico" value={stat} onChange={setStat} options={[{ value: "mediana", label: "Mediana" }, { value: "media", label: "Media" }]} />
          <Slider label="Remuestras B" value={B} min={200} max={10000} step={100} onChange={setB} />
          <NewSample again={again} />
        </>
      }
      explain={
        <>
          <p>
            <strong>Bootstrap:</strong> tratamos la muestra como si fuera la población y remuestreamos con reemplazo muchas veces. La variabilidad del estadístico entre remuestras aproxima su error estándar, sin suponer normalidad.
          </p>
          <p className="mt-2">El intervalo percentil del 95 % toma los percentiles 2,5 y 97,5 de la distribución bootstrap. Funciona mal con muestras muy pequeñas o estadísticos extremos (máximo), y no corrige un muestreo sesgado: si la muestra no representa a la población, el bootstrap tampoco.</p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="n" value={data.length} />
        <Stat label={`${stat} observada`} value={data.length ? fmt(f(data), 3) : "—"} />
        <Stat label="EE bootstrap" value={boot.length ? fmt(S.sd(boot), 3) : "—"} />
        <Stat label="IC 95 % percentil" value={boot.length ? `[${fmt(ci[0], 2)}, ${fmt(ci[1], 2)}]` : "—"} />
      </div>
      {boot.length > 0 ? (
        <ChartCard title={`Distribución bootstrap de la ${stat}`} subtitle={`${B} remuestras con reemplazo`} table={{ head: ["Desde", "Hasta", "Frecuencia"], rows: h.map((b) => [b.x0, b.x1, b.count]) }}>
          <XYChart ariaLabel="Histograma bootstrap" x={[lo, hi]} y={[0, Math.max(...h.map((b) => b.count)) * 1.15]} bars={h.map((b) => ({ x0: b.x0, x1: b.x1, y: b.count, color: SERIES[0] }))} vlines={[{ x: ci[0], label: "2,5 %" }, { x: ci[1], label: "97,5 %" }]} formatY={(v) => fmt(v, 0)} />
        </ChartCard>
      ) : (
        <p className="px-panel p-4 text-ember">Introduce al menos dos números.</p>
      )}
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 7. regression & correlation
const BASE_POINTS: Pt[] = [
  { x: 1, y: 2.3 }, { x: 2, y: 2.9 }, { x: 2.5, y: 4.1 }, { x: 3, y: 3.8 }, { x: 4, y: 5.2 }, { x: 4.5, y: 4.6 }, { x: 5, y: 6.1 }, { x: 6, y: 6.4 }, { x: 6.5, y: 7.6 }, { x: 7, y: 7.1 }, { x: 8, y: 8.7 }, { x: 8.5, y: 8.2 },
];
function Regression() {
  const [pts, setPts] = useState<Pt[]>(BASE_POINTS);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const ok = pts.length >= 3 && new Set(xs).size > 1;
  const fit = ok ? S.ols(xs, ys) : null;
  const r = ok ? S.pearson(xs, ys) : NaN;
  const rho = ok ? S.spearman(xs, ys) : NaN;
  return (
    <LabLayout
      controls={
        <>
          <p className="text-sm text-muted">Haz clic en el gráfico para {mode === "add" ? "añadir un punto" : "quitar el punto más cercano"}.</p>
          <Select label="Modo" value={mode} onChange={setMode} options={[{ value: "add", label: "Añadir puntos" }, { value: "remove", label: "Quitar puntos" }]} />
          <button className="btn-ghost" onClick={() => setPts([...BASE_POINTS, { x: 9.5, y: 1 }])}>
            Añadir un atípico influyente
          </button>
          <button className="btn-ghost" onClick={() => setPts(BASE_POINTS)}>
            Restaurar datos
          </button>
          <button className="btn-ghost" onClick={() => setPts([])}>
            Vaciar
          </button>
        </>
      }
      explain={
        <>
          <p>
            La recta de mínimos cuadrados minimiza la suma de residuos al cuadrado. La pendiente indica cuánto cambia y, en promedio, por cada unidad de x <em>en estos datos</em>; no implica que cambiar x cause ese cambio en y.
          </p>
          <p className="mt-2">
            Añade el atípico: Pearson (sensible a valores extremos) cae mucho más que Spearman (basado en rangos), y la pendiente cambia. Revisa siempre el gráfico de residuos: un patrón (curva, abanico) indica que el modelo lineal o la varianza constante no son adecuados.
          </p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Pendiente" value={fit ? fmt(fit.slope, 3) : "—"} note={fit ? `IC 95 % [${fmt(fit.ciSlope[0], 2)}, ${fmt(fit.ciSlope[1], 2)}]` : undefined} />
        <Stat label="R²" value={fit ? fmt(fit.r2, 3) : "—"} />
        <Stat label="r de Pearson" value={fmt(r, 3)} />
        <Stat label="ρ de Spearman" value={fmt(rho, 3)} />
      </div>
      <ChartCard title="Datos y recta ajustada" subtitle={fit ? `ŷ = ${fmt(fit.intercept, 3)} + ${fmt(fit.slope, 3)}·x · valor p de la pendiente ${fit.pSlope < 0.001 ? "< 0,001" : fmt(fit.pSlope, 3)}` : "Necesitas al menos 3 puntos con x distintos"} table={{ head: ["x", "y", "residuo"], rows: pts.map((p, i) => [p.x, p.y, fit ? fit.residuals[i] : "—"]) }}>
        <XYChart
          ariaLabel="Diagrama de dispersión con recta de regresión"
          x={[0, 10]}
          y={[0, 10]}
          series={[{ name: "Datos", color: SERIES[0], points: pts, kind: "dots" }]}
          segments={fit ? [{ x0: 0, x1: 10, y0: fit.intercept, y1: fit.intercept + 10 * fit.slope, color: SERIES[1] }] : []}
          onPlotClick={(p) => {
            if (mode === "add") setPts((ps) => [...ps, { x: +p.x.toFixed(2), y: +p.y.toFixed(2) }]);
            else if (pts.length) {
              let best = 0;
              pts.forEach((q, i) => {
                if (Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(pts[best].x - p.x, pts[best].y - p.y)) best = i;
              });
              setPts((ps) => ps.filter((_, i) => i !== best));
            }
          }}
        />
      </ChartCard>
      {fit && (
        <ChartCard title="Residuos frente a valores ajustados" subtitle="Deberían dispersarse sin patrón alrededor de 0">
          <XYChart ariaLabel="Gráfico de residuos" height={180} x={[Math.min(...fit.fitted) - 0.5, Math.max(...fit.fitted) + 0.5]} y={[Math.min(-1, ...fit.residuals) * 1.2, Math.max(1, ...fit.residuals) * 1.2]} series={[{ name: "Residuo", color: SERIES[2], points: fit.fitted.map((f, i) => ({ x: f, y: fit.residuals[i] })), kind: "dots" }]} segments={[{ x0: -100, x1: 100, y0: 0, y1: 0, color: "#e9eef8", width: 1 }]} />
        </ChartCard>
      )}
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 8. Bayesian updating
function Bayes() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(2);
  const [n, setN] = useState(20);
  const [k, setK] = useState(14);
  const kk = Math.min(k, n);
  const pa = a + kk;
  const pb = b + n - kk;
  const xs = Array.from({ length: 201 }, (_, i) => 0.0005 + (0.999 * i) / 200);
  const prior = xs.map((x) => ({ x, y: S.betaPdf(x, a, b) }));
  const post = xs.map((x) => ({ x, y: S.betaPdf(x, pa, pb) }));
  const likRaw = xs.map((x) => S.binomPmf(kk, n, x));
  const likScale = (n + 1) || 1; // binomial likelihood integrates to 1/(n+1) over p
  const lik = xs.map((x, i) => ({ x, y: likRaw[i] * likScale }));
  const ci = [S.betaInv(0.025, pa, pb), S.betaInv(0.975, pa, pb)];
  const freq = S.wilson(kk, n);
  const ymax = Math.min(25, Math.max(...post.map((p) => p.y), ...prior.map((p) => p.y), ...lik.map((p) => p.y)) * 1.1);
  return (
    <LabLayout
      controls={
        <>
          <div className="label">Distribución previa Beta(α, β)</div>
          <Slider label="α previa" value={a} min={0.5} max={50} step={0.5} onChange={setA} format={(v) => fmt(v, 1)} />
          <Slider label="β previa" value={b} min={0.5} max={50} step={0.5} onChange={setB} format={(v) => fmt(v, 1)} />
          <div className="label mt-2">Datos observados</div>
          <Slider label="Ensayos n" value={n} min={0} max={200} onChange={(v) => (setN(v), setK(Math.min(k, v)))} />
          <Slider label="Éxitos k" value={kk} min={0} max={n} onChange={setK} />
          <div className="flex flex-wrap gap-2">
            <button className="chip" onClick={() => (setA(1), setB(1))}>Previa plana</button>
            <button className="chip" onClick={() => (setA(2), setB(2))}>Débilmente informativa</button>
            <button className="chip" onClick={() => (setA(30), setB(70))}>Informativa (≈ 0,3)</button>
          </div>
        </>
      }
      explain={
        <>
          <p>
            Con previa Beta(α, β) y k éxitos en n ensayos binomiales, la posterior es <strong>Beta(α + k, β + n − k)</strong> (familias conjugadas). La posterior combina lo que creías antes con la verosimilitud de los datos: con pocos datos pesa la previa; con muchos, dominan los datos.
          </p>
          <p className="mt-2">
            El <strong>intervalo creíble del 95 %</strong> [{fmt(ci[0], 3)}, {fmt(ci[1], 3)}] sí admite la lectura «dados la previa y los datos, hay un 95 % de probabilidad de que p esté aquí». El intervalo de confianza de Wilson [{fmt(freq[0], 3)}, {fmt(freq[1], 3)}] tiene una interpretación distinta (cobertura del procedimiento), aunque con previas planas y muchos datos los números se parecen.
          </p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Posterior" value={`Beta(${fmt(pa, 1)}, ${fmt(pb, 1)})`} />
        <Stat label="Media posterior" value={fmt(pa / (pa + pb), 3)} />
        <Stat label="Creíble 95 %" value={`[${fmt(ci[0], 3)}, ${fmt(ci[1], 3)}]`} />
        <Stat label="P(p > 0,5 | datos)" value={(() => { const v = 1 - S.betaI(pa, pb, 0.5); return v > 0.999 ? "> 99,9 %" : v < 0.001 ? "< 0,1 %" : pct(v); })()} />
      </div>
      <ChartCard title="Previa, verosimilitud y posterior" subtitle="La verosimilitud está reescalada para compararla con las densidades" legend={<Legend items={[{ name: "Previa", color: SERIES[3] }, { name: "Verosimilitud (escalada)", color: SERIES[2], dashed: true }, { name: "Posterior", color: SERIES[0] }]} />}>
        <XYChart
          ariaLabel="Distribución previa, verosimilitud y posterior"
          x={[0, 1]}
          y={[0, ymax]}
          series={[
            { name: "Previa", color: SERIES[3], points: prior },
            ...(n > 0 ? [{ name: "Verosimilitud", color: SERIES[2], points: lik, dashed: true }] : []),
            { name: "Posterior", color: SERIES[0], points: post, kind: "area" as const },
          ]}
          bands={[{ x0: ci[0], x1: ci[1], color: "rgba(57,135,229,0.10)" }]}
          formatX={(v) => fmt(v, 2)}
          formatY={(v) => fmt(v, 1)}
        />
      </ChartCard>
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 9. diagnostic tests
function Diagnostic() {
  const [sens, setSens] = useState(0.9);
  const [spec, setSpec] = useState(0.95);
  const [prev, setPrev] = useState(0.01);
  const N = 10000;
  const sick = prev * N;
  const tp = sens * sick;
  const fn = sick - tp;
  const tn = spec * (N - sick);
  const fp = N - sick - tn;
  const d = S.diagnostic(sens, spec, prev);
  return (
    <LabLayout
      controls={
        <>
          <Slider label="Sensibilidad" value={sens} min={0.5} max={0.999} step={0.001} onChange={setSens} format={(v) => pct(v)} />
          <Slider label="Especificidad" value={spec} min={0.5} max={0.999} step={0.001} onChange={setSpec} format={(v) => pct(v)} />
          <Slider label="Prevalencia" value={prev} min={0.001} max={0.5} step={0.001} onChange={setPrev} format={(v) => pct(v)} />
        </>
      }
      explain={
        <>
          <p>
            <strong>Sensibilidad</strong> = P(test + | enfermedad) y <strong>especificidad</strong> = P(test − | sin enfermedad) son propiedades de la prueba. El <strong>valor predictivo positivo</strong> = P(enfermedad | test +) depende además de la prevalencia: con una enfermedad rara, incluso una prueba muy específica produce muchos falsos positivos.
          </p>
          <p className="mt-2">Las razones de verosimilitud no dependen de la prevalencia: multiplican las odds previas para obtener las posteriores (Bayes en forma de odds). Ejemplo educativo con datos hipotéticos; no es una recomendación clínica.</p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="VPP" value={pct(d.ppv)} note="P(enfermo | +)" />
        <Stat label="VPN" value={pct(d.npv, 2)} note="P(sano | −)" />
        <Stat label="RV+" value={fmt(d.lrPos, 2)} />
        <Stat label="RV−" value={fmt(d.lrNeg, 3)} />
      </div>
      <figure className="px-panel p-4 overflow-x-auto">
        <figcaption className="font-bold mb-2">Frecuencias naturales en {N.toLocaleString("es")} personas</figcaption>
        <table className="text-sm tabular-nums w-full min-w-[22rem]">
          <thead>
            <tr className="text-muted text-left">
              <th className="p-2" />
              <th className="p-2">Con enfermedad</th>
              <th className="p-2">Sin enfermedad</th>
              <th className="p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line">
              <th className="p-2 text-left text-muted">Test +</th>
              <td className="p-2 text-leaf">{fmt(tp, 0)} verdaderos +</td>
              <td className="p-2 text-ember">{fmt(fp, 0)} falsos +</td>
              <td className="p-2">{fmt(tp + fp, 0)}</td>
            </tr>
            <tr className="border-t border-line">
              <th className="p-2 text-left text-muted">Test −</th>
              <td className="p-2 text-ember">{fmt(fn, 0)} falsos −</td>
              <td className="p-2 text-leaf">{fmt(tn, 0)} verdaderos −</td>
              <td className="p-2">{fmt(fn + tn, 0)}</td>
            </tr>
            <tr className="border-t border-line">
              <th className="p-2 text-left text-muted">Total</th>
              <td className="p-2">{fmt(sick, 0)}</td>
              <td className="p-2">{fmt(N - sick, 0)}</td>
              <td className="p-2">{N.toLocaleString("es")}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm mt-3">
          De las {fmt(tp + fp, 0)} personas con test positivo, solo {fmt(tp, 0)} tienen la enfermedad: VPP = {fmt(tp, 0)} / {fmt(tp + fp, 0)} = {pct(d.ppv)}.
        </p>
      </figure>
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 10. ROC
function Roc() {
  const { seed, again } = useSeed();
  const [sep, setSep] = useState(1.2);
  const [n, setN] = useState(200);
  const [thr, setThr] = useState(0.6);
  const sim = useMemo(() => {
    const r = S.rng(seed * 101 + 9);
    const neg = Array.from({ length: n }, () => r.normal(0, 1));
    const pos = Array.from({ length: n }, () => r.normal(sep, 1));
    const scores = [...neg, ...pos];
    const labels = [...neg.map(() => 0 as const), ...pos.map(() => 1 as const)];
    return { neg, pos, ...S.roc(scores, labels) };
  }, [seed, sep, n]);
  const tp = sim.pos.filter((s) => s >= thr).length;
  const fp = sim.neg.filter((s) => s >= thr).length;
  const sens = tp / n;
  const spec = 1 - fp / n;
  const theoAuc = S.normalCdf(sep / Math.SQRT2);
  const hn = S.histogram(sim.neg, -4, sep + 4, 36);
  const hp = S.histogram(sim.pos, -4, sep + 4, 36);
  return (
    <LabLayout
      controls={
        <>
          <Slider label="Separación entre grupos (DE)" value={sep} min={0} max={4} step={0.1} onChange={setSep} format={(v) => v.toFixed(1)} />
          <Slider label="Casos por grupo" value={n} min={20} max={1000} step={10} onChange={setN} />
          <Slider label="Umbral de decisión" value={thr} min={-3} max={sep + 3} step={0.05} onChange={setThr} format={(v) => v.toFixed(2)} />
          <NewSample again={again} />
        </>
      }
      explain={
        <>
          <p>
            Cada umbral da un par (1 − especificidad, sensibilidad). La <strong>curva ROC</strong> recorre todos los umbrales; el <strong>AUC</strong> es la probabilidad de que un caso positivo elegido al azar tenga mayor puntuación que un negativo. AUC = 0,5 equivale al azar.
          </p>
          <p className="mt-2 text-muted">El AUC resume la discriminación, no la calibración ni el umbral adecuado: elegir el umbral depende del coste relativo de falsos positivos y falsos negativos.</p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="AUC observada" value={fmt(sim.auc, 3)} note={`teórica ${fmt(theoAuc, 3)}`} />
        <Stat label="Sensibilidad" value={pct(sens)} />
        <Stat label="Especificidad" value={pct(spec)} />
        <Stat label="Exactitud" value={pct((tp + (n - fp)) / (2 * n))} />
      </div>
      <div className="grid xl:grid-cols-2 gap-4">
        <ChartCard title="Puntuaciones por grupo" legend={<Legend items={[{ name: "Negativos", color: SERIES[0] }, { name: "Positivos", color: SERIES[1] }]} />}>
          <XYChart ariaLabel="Distribución de puntuaciones por grupo" height={220} x={[-4, sep + 4]} y={[0, Math.max(...hn.map((b) => b.count), ...hp.map((b) => b.count)) * 1.15]} series={[{ name: "Negativos", color: SERIES[0], points: hn.map((b) => ({ x: (b.x0 + b.x1) / 2, y: b.count })), kind: "area" }, { name: "Positivos", color: SERIES[1], points: hp.map((b) => ({ x: (b.x0 + b.x1) / 2, y: b.count })), kind: "area" }]} vlines={[{ x: thr, label: "umbral" }]} formatY={(v) => fmt(v, 0)} />
        </ChartCard>
        <ChartCard title="Curva ROC" table={{ head: ["Umbral", "1 − especificidad", "Sensibilidad"], rows: sim.points.filter((_, i) => i % 10 === 0).map((p) => [isFinite(p.threshold) ? p.threshold : "∞", p.fpr, p.tpr]) }}>
          <XYChart ariaLabel="Curva ROC" height={220} x={[0, 1]} y={[0, 1]} xLabel="1 − especificidad" yLabel="Sensibilidad" series={[{ name: "ROC", color: SERIES[2], points: sim.points.map((p) => ({ x: p.fpr, y: p.tpr })), kind: "area" }, { name: "Umbral actual", color: SERIES[3], points: [{ x: 1 - spec, y: sens }], kind: "dots" }]} segments={[{ x0: 0, y0: 0, x1: 1, y1: 1, color: "#5f6f94", width: 1 }]} formatX={(v) => fmt(v, 1)} formatY={(v) => fmt(v, 1)} />
        </ChartCard>
      </div>
    </LabLayout>
  );
}

// ------------------------------------------------------------------ 11. Kaplan-Meier
function KaplanMeier() {
  const { seed, again } = useSeed();
  const [n, setN] = useState(60);
  const [hr, setHr] = useState(0.6);
  const [cens, setCens] = useState(0.3);
  const base = 0.1;
  const sim = useMemo(() => {
    const r = S.rng(seed * 17 + 2);
    const group = (rate: number) => {
      const times: number[] = [];
      const ev: (0 | 1)[] = [];
      for (let i = 0; i < n; i++) {
        const t = r.exponential(rate);
        const c = cens > 0 ? r.exponential((rate * cens) / (1 - cens)) : Infinity;
        const end = Math.min(24, t, c);
        times.push(+end.toFixed(2));
        ev.push(t <= c && t <= 24 ? 1 : 0);
      }
      return S.kaplanMeier(times, ev);
    };
    return { ctrl: group(base), trt: group(base * hr) };
  }, [seed, n, hr, cens]);
  const steps = (km: S.KmStep[]) => [{ x: 0, y: 1 }, ...km.map((s) => ({ x: s.t, y: s.s }))];
  const medianOf = (km: S.KmStep[]) => km.find((s) => s.s <= 0.5)?.t;
  const mc = medianOf(sim.ctrl);
  const mt = medianOf(sim.trt);
  return (
    <LabLayout
      controls={
        <>
          <Slider label="Pacientes por grupo" value={n} min={10} max={300} step={5} onChange={setN} />
          <Slider label="Razón de riesgos (HR) del tratamiento" value={hr} min={0.2} max={1.5} step={0.05} onChange={setHr} format={(v) => v.toFixed(2)} />
          <Slider label="Proporción aprox. de censura" value={cens} min={0} max={0.8} step={0.05} onChange={setCens} format={(v) => pct(v, 0)} />
          <NewSample again={again} />
        </>
      }
      explain={
        <>
          <p>
            El estimador de <strong>Kaplan-Meier</strong> multiplica, en cada tiempo con eventos, la probabilidad de sobrevivir a ese instante entre quienes seguían en riesgo: S(t) = Π (1 − dᵢ/nᵢ). Los pacientes <strong>censurados</strong> (seguimiento terminado sin evento) cuentan como en riesgo hasta su salida y luego dejan de contar: no se tratan como eventos ni se descartan.
          </p>
          <p className="mt-2 text-muted">Datos sintéticos: tiempos exponenciales con tasa de control 0,1/mes y seguimiento máximo de 24 meses. Un HR &lt; 1 indica menor riesgo instantáneo en el grupo tratado. Para comparar curvas formalmente se usa la prueba log-rank o un modelo de Cox.</p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Mediana control" value={mc !== undefined ? `${fmt(mc, 1)} m` : "no alcanzada"} />
        <Stat label="Mediana tratamiento" value={mt !== undefined ? `${fmt(mt, 1)} m` : "no alcanzada"} />
        <Stat label="Eventos control" value={sim.ctrl.reduce((s, x) => s + x.events, 0)} />
        <Stat label="Eventos tratamiento" value={sim.trt.reduce((s, x) => s + x.events, 0)} />
      </div>
      <ChartCard title="Curvas de supervivencia de Kaplan-Meier" legend={<Legend items={[{ name: "Control", color: SERIES[1] }, { name: "Tratamiento", color: SERIES[0] }]} />} table={{ head: ["Tiempo", "En riesgo", "Eventos", "Censurados", "S(t)"], rows: sim.trt.map((s) => [s.t, s.atRisk, s.events, s.censored, s.s]) }}>
        <XYChart ariaLabel="Curvas de Kaplan-Meier de dos grupos" x={[0, 24]} y={[0, 1.02]} xLabel="Meses" yLabel="Supervivencia" series={[{ name: "Control", color: SERIES[1], points: steps(sim.ctrl), kind: "step" }, { name: "Tratamiento", color: SERIES[0], points: steps(sim.trt), kind: "step" }]} segments={[{ x0: 0, x1: 24, y0: 0.5, y1: 0.5, color: "#5f6f94", width: 1 }]} formatY={(v) => pct(v, 0)} formatX={(v) => fmt(v, 0)} />
      </ChartCard>
    </LabLayout>
  );
}

const TABS = [
  { id: "monedas", label: "Monedas y dados", el: <CoinsDice /> },
  { id: "tcl", label: "Teorema central del límite", el: <CLT /> },
  { id: "distribuciones", label: "Distribuciones", el: <Distributions /> },
  { id: "intervalos", label: "Intervalos de confianza", el: <ConfidenceIntervals /> },
  { id: "potencia", label: "Errores y potencia", el: <Power /> },
  { id: "bootstrap", label: "Bootstrap", el: <Bootstrap /> },
  { id: "regresion", label: "Regresión y correlación", el: <Regression /> },
  { id: "bayes", label: "Actualización bayesiana", el: <Bayes /> },
  { id: "diagnostico", label: "Pruebas diagnósticas", el: <Diagnostic /> },
  { id: "roc", label: "Curva ROC", el: <Roc /> },
  { id: "km", label: "Kaplan-Meier", el: <KaplanMeier /> },
];

export function StatsLab({ initial }: { initial?: string }) {
  const { update } = useGame();
  const [tab, setTab] = useState(TABS.some((t) => t.id === initial) ? initial! : "monedas");
  useEffect(() => {
    update((s) => A.recordLab(s, `stats-${tab}`));
  }, [tab, update]);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="px-title text-gold text-2xl">Laboratorio estadístico</h1>
        <p className="text-muted text-sm">Cambia parámetros y observa resultados calculados en el momento. Las simulaciones usan una semilla: «Nueva simulación» genera otra muestra.</p>
      </div>
      <div role="tablist" aria-label="Simuladores" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`chip text-sm px-3 py-1 ${tab === t.id ? "bg-gold text-ink" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{TABS.find((t) => t.id === tab)!.el}</div>
    </div>
  );
}
