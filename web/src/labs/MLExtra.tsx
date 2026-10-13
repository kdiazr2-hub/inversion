// ML simulators: polynomial over/underfitting, k-means step by step and PCA in two dimensions.
import { useEffect, useMemo, useState } from "react";
import { ChartCard, fmt, intTick, Legend, pow10Tick, SERIES, XYChart } from "../components/Charts";
import * as A from "../engine/actions";
import { useGame } from "../engine/store";
import { LabLayout, Slider, Stat } from "./controls";
import { kmeansHistory, makeBlobs, makeCorrelated, makeWave, mse, pca2, polyFit, sample, truth } from "./numeric";

function useLabVisit(id: string) {
  const { update } = useGame();
  useEffect(() => {
    update((s) => A.recordLab(s, id));
  }, [id, update]);
}

// ------------------------------------------------------------------ polynomial regression
export function PolySim() {
  useLabVisit("ml-polinomios");
  const [n, setN] = useState(15);
  const [noise, setNoise] = useState(0.25);
  const [deg, setDeg] = useState(3);
  const [logLambda, setLogLambda] = useState(-8);
  const [seed, setSeed] = useState(1);
  const lambda = logLambda <= -8 ? 0 : 10 ** logLambda;
  const train = useMemo(() => makeWave(n, noise, seed), [n, noise, seed]);
  const test = useMemo(() => makeWave(200, noise, seed + 1000), [noise, seed]);
  const model = useMemo(() => polyFit(train, deg, lambda), [train, deg, lambda]);
  const curve = useMemo(
    () =>
      Array.from({ length: 13 }, (_, d) => {
        const m = polyFit(train, d, lambda);
        return { d, tr: mse(m, train), te: mse(m, test) };
      }),
    [train, test, lambda],
  );
  const best = curve.reduce((a, b) => (b.te < a.te ? b : a));
  const fitPts = sample(model, 0, 1, 200).map((p) => ({ x: p.x, y: Math.max(-2.5, Math.min(2.5, p.y)) }));
  const irreducible = noise * noise;
  return (
    <LabLayout
      controls={
        <>
          <Slider label="Puntos de entrenamiento" value={n} min={5} max={80} onChange={setN} />
          <Slider label="Ruido (σ)" value={noise} min={0} max={0.8} step={0.05} onChange={setNoise} format={(v) => v.toFixed(2)} />
          <Slider label="Grado del polinomio" value={deg} min={0} max={12} onChange={setDeg} />
          <Slider label="Regularización ridge λ" value={logLambda} min={-8} max={1} step={0.25} onChange={setLogLambda} format={() => (lambda === 0 ? "0 (sin)" : lambda.toExponential(1))} />
          <button className="btn-sky self-start" onClick={() => setSeed((s) => s + 1)}>
            ↻ Nueva muestra
          </button>
        </>
      }
      explain={
        <>
          <p>
            Los datos salen de y = sen(2πx) más ruido. Un polinomio de grado bajo no puede seguir la curva (<strong>subajuste</strong>, sesgo alto). Uno de grado alto pasa por los puntos de entrenamiento, ruido incluido, y oscila entre ellos (<strong>sobreajuste</strong>, varianza alta).
          </p>
          <p className="mt-2">
            El error de entrenamiento siempre baja al subir el grado; el de prueba (200 puntos nuevos) baja y luego sube. Ningún modelo puede bajar del ruido: su varianza σ² = {fmt(irreducible, 3)} es el <strong>error irreducible</strong>.
          </p>
          <p className="mt-2 text-muted">Más datos o regularización (ridge penaliza coeficientes grandes) permiten usar modelos más flexibles sin sobreajustar. Las variables se reescalan a [−1, 1] antes de ajustar.</p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="ECM entrenamiento" value={fmt(mse(model, train), 4)} />
        <Stat label="ECM prueba" value={fmt(mse(model, test), 4)} />
        <Stat label="Grado con menor ECM de prueba" value={best.d} />
        <Stat label="Error irreducible σ²" value={fmt(irreducible, 4)} />
      </div>
      <ChartCard title={`Ajuste de grado ${deg}`} legend={<Legend items={[{ name: "Entrenamiento", color: SERIES[0] }, { name: "Función real", color: SERIES[2], dashed: true }, { name: "Modelo", color: SERIES[1] }]} />} table={{ head: ["x", "y"], rows: train.map((p) => [fmt(p.x, 3), fmt(p.y, 3)]) }}>
        <XYChart
          ariaLabel={`Polinomio de grado ${deg} ajustado a ${n} puntos`}
          x={[0, 1]}
          y={[-2.5, 2.5]}
          series={[
            { name: "Función real", color: SERIES[2], points: sample(truth, 0, 1, 120), dashed: true },
            { name: "Modelo", color: SERIES[1], points: fitPts },
            { name: "Entrenamiento", color: SERIES[0], points: train, kind: "dots" },
          ]}
        />
      </ChartCard>
      <ChartCard title="Error según la complejidad" subtitle="Error cuadrático medio (log₁₀) para grados 0–12" legend={<Legend items={[{ name: "Entrenamiento", color: SERIES[0] }, { name: "Prueba", color: SERIES[1] }]} />} table={{ head: ["Grado", "ECM entrenamiento", "ECM prueba"], rows: curve.map((c) => [c.d, fmt(c.tr, 4), fmt(c.te, 4)]) }}>
        <XYChart
          ariaLabel="Curva de error de entrenamiento y prueba según el grado"
          height={200}
          x={[0, 12]}
          y={[-4, 2]}
          series={[
            { name: "Entrenamiento", color: SERIES[0], points: curve.map((c) => ({ x: c.d, y: Math.max(-4, Math.min(2, Math.log10(c.tr + 1e-12))) })) },
            { name: "Prueba", color: SERIES[1], points: curve.map((c) => ({ x: c.d, y: Math.max(-4, Math.min(2, Math.log10(c.te + 1e-12))) })) },
          ]}
          segments={irreducible > 0 ? [{ x0: 0, x1: 12, y0: Math.log10(irreducible), y1: Math.log10(irreducible), color: "#5f6f94", width: 1 }] : []}
          vlines={[{ x: deg, label: "actual" }]}
          formatX={intTick}
          formatY={pow10Tick}
        />
      </ChartCard>
    </LabLayout>
  );
}

// ------------------------------------------------------------------ k-means
const CLUSTER_COLORS = [SERIES[0], SERIES[1], SERIES[2], SERIES[3], "#8f6fd8", "#d65f9a"];

export function KMeansSim() {
  useLabVisit("ml-kmeans");
  const [groups, setGroups] = useState(3);
  const [k, setK] = useState(3);
  const [spread, setSpread] = useState(0.8);
  const [seed, setSeed] = useState(4);
  const [init, setInit] = useState(1);
  const [step, setStep] = useState(0);
  const pts = useMemo(() => makeBlobs(180, groups, spread, seed), [groups, spread, seed]);
  const hist = useMemo(() => kmeansHistory(pts, k, init), [pts, k, init]);
  useEffect(() => setStep(0), [hist]);
  const st = hist[Math.min(step, hist.length - 1)];
  const phase = step === 0 ? "Inicio: centroides en puntos al azar y asignación" : step % 2 === 1 ? "Paso de actualización: cada centroide se mueve a la media de su grupo" : "Paso de asignación: cada punto va al centroide más cercano";
  const elbow = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ x: i + 1, y: kmeansHistory(pts, i + 1, init).at(-1)!.inertia })), [pts, init]);
  return (
    <LabLayout
      controls={
        <>
          <Slider label="Grupos reales en los datos" value={groups} min={1} max={6} onChange={setGroups} />
          <Slider label="Dispersión de cada grupo" value={spread} min={0.2} max={2} step={0.1} onChange={setSpread} format={(v) => v.toFixed(1)} />
          <Slider label="k (grupos que buscamos)" value={k} min={1} max={6} onChange={setK} />
          <div className="flex gap-2 flex-wrap">
            <button className="btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              ◀ Atrás
            </button>
            <button className="btn-gold" onClick={() => setStep((s) => Math.min(hist.length - 1, s + 1))} disabled={step >= hist.length - 1}>
              Paso ▶
            </button>
            <button className="btn-ghost" onClick={() => setStep(hist.length - 1)}>
              Hasta el final
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn-sky" onClick={() => setInit((s) => s + 1)}>
              ↻ Otros centroides iniciales
            </button>
            <button className="btn-ghost" onClick={() => setSeed((s) => s + 1)}>
              Nuevos datos
            </button>
          </div>
        </>
      }
      explain={
        <>
          <p>
            <strong>K-means</strong> alterna dos pasos hasta que nada cambia: asignar cada punto al centroide más cercano y mover cada centroide a la media de sus puntos. Cada paso reduce (o mantiene) la <strong>inercia</strong>: la suma de distancias al cuadrado de cada punto a su centroide.
          </p>
          <p className="mt-2">
            Converge siempre, pero a un mínimo <strong>local</strong>: con otros centroides iniciales puede acabar en otra solución (por eso scikit-learn repite con varias inicializaciones, <code>n_init</code>). La inercia siempre baja al aumentar k, así que no sirve para elegir k por sí sola: busca el «codo» o usa la silueta.
          </p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Paso" value={`${step} / ${hist.length - 1}`} />
        <Stat label="Inercia" value={fmt(st.inertia, 1)} />
        <Stat label="Inercia final" value={fmt(hist.at(-1)!.inertia, 1)} />
        <Stat label="Convergió" value={step >= hist.length - 1 ? "sí" : "aún no"} />
      </div>
      <ChartCard title={phase} legend={<Legend items={Array.from({ length: k }, (_, i) => ({ name: `Grupo ${i + 1}`, color: CLUSTER_COLORS[i] }))} />}>
        <XYChart
          ariaLabel={`K-means con k = ${k}, paso ${step}`}
          height={320}
          x={[-7, 7]}
          y={[-7, 7]}
          series={[
            ...Array.from({ length: k }, (_, j) => ({ name: `Grupo ${j + 1}`, color: CLUSTER_COLORS[j], points: pts.filter((_, i) => st.labels[i] === j), kind: "dots" as const })),
          ]}
          markers={st.centroids.map((c, j) => ({ x: c.x, y: c.y, color: CLUSTER_COLORS[j] }))}
        />
        <p className="text-xs text-muted mt-1">Las × son los centroides.</p>
      </ChartCard>
      <ChartCard title="Método del codo" subtitle="Inercia final para k = 1…6 (misma inicialización)" table={{ head: ["k", "Inercia"], rows: elbow.map((e) => [e.x, fmt(e.y, 1)]) }}>
        <XYChart ariaLabel="Inercia según k" height={180} x={[1, 6]} y={[0, Math.max(...elbow.map((e) => e.y)) * 1.1]} series={[{ name: "Inercia", color: SERIES[0], points: elbow }]} vlines={[{ x: k, label: "k actual" }]} formatX={intTick} />
      </ChartCard>
    </LabLayout>
  );
}

// ------------------------------------------------------------------ PCA
export function PcaSim() {
  useLabVisit("ml-pca");
  const [rho, setRho] = useState(0.8);
  const [sx, setSx] = useState(1);
  const [sy, setSy] = useState(1.5);
  const [seed, setSeed] = useState(1);
  const pts = useMemo(() => makeCorrelated(250, rho, sx, sy, seed), [rho, sx, sy, seed]);
  const p = useMemo(() => pca2(pts), [pts]);
  const L = 4.5;
  const axis = (v: [number, number], s: number) => ({ x0: p.mean.x - v[0] * s, y0: p.mean.y - v[1] * s, x1: p.mean.x + v[0] * s, y1: p.mean.y + v[1] * s });
  const projected = pts.map((_, i) => ({ x: p.mean.x + p.scores[i] * p.components[0][0], y: p.mean.y + p.scores[i] * p.components[0][1] }));
  return (
    <LabLayout
      controls={
        <>
          <Slider label="Correlación ρ" value={rho} min={-0.99} max={0.99} step={0.01} onChange={setRho} format={(v) => v.toFixed(2)} />
          <Slider label="Desviación de x" value={sx} min={0.2} max={2} step={0.1} onChange={setSx} format={(v) => v.toFixed(1)} />
          <Slider label="Desviación de y" value={sy} min={0.2} max={2} step={0.1} onChange={setSy} format={(v) => v.toFixed(1)} />
          <button className="btn-sky self-start" onClick={() => setSeed((s) => s + 1)}>
            ↻ Nueva muestra
          </button>
        </>
      }
      explain={
        <>
          <p>
            El <strong>PCA</strong> busca la dirección en la que los datos varían más (primera componente) y, perpendicular a ella, la siguiente. Son los <strong>autovectores de la matriz de covarianza</strong>; sus autovalores son la varianza en cada dirección.
          </p>
          <p className="mt-2">
            Si x e y están muy correlacionadas, casi toda la información está en una sola dirección: proyectar sobre la primera componente (puntos claros) reduce de 2 a 1 dimensión perdiendo poca varianza. Con ρ ≈ 0 y desviaciones iguales, ninguna dirección destaca y reducir pierde la mitad.
          </p>
          <p className="mt-2 text-muted">El PCA depende de la escala: si una variable se mide en unidades mayores domina las componentes. Por eso normalmente se estandariza antes.</p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Varianza explicada CP1" value={`${fmt(p.explained[0] * 100, 1)} %`} />
        <Stat label="Varianza explicada CP2" value={`${fmt(p.explained[1] * 100, 1)} %`} />
        <Stat label="Autovalores" value={`${fmt(p.variances[0], 3)} · ${fmt(p.variances[1], 3)}`} />
        <Stat label="CP1 (dirección)" value={`(${fmt(p.components[0][0], 3)}, ${fmt(p.components[0][1], 3)})`} />
      </div>
      <ChartCard
        title="Datos y componentes principales"
        legend={<Legend items={[{ name: "Datos", color: SERIES[0] }, { name: "Proyección sobre CP1", color: SERIES[3] }, { name: "CP1", color: SERIES[1] }, { name: "CP2", color: SERIES[2] }]} />}
        table={{ head: ["", "x", "y"], rows: [["Covarianza fila 1", fmt(p.cov[0], 4), fmt(p.cov[1], 4)], ["Covarianza fila 2", fmt(p.cov[2], 4), fmt(p.cov[3], 4)], ["CP1", fmt(p.components[0][0], 4), fmt(p.components[0][1], 4)], ["CP2", fmt(p.components[1][0], 4), fmt(p.components[1][1], 4)]] }}
      >
        <XYChart
          ariaLabel={`Nube de puntos con correlación ${rho.toFixed(2)} y sus componentes principales`}
          height={340}
          x={[-L, L]}
          y={[-L, L]}
          series={[
            { name: "Datos", color: SERIES[0], points: pts, kind: "dots" },
            { name: "Proyección sobre CP1", color: SERIES[3], points: projected, kind: "dots" },
          ]}
          segments={[
            { ...axis(p.components[0], 2 * Math.sqrt(p.variances[0])), color: SERIES[1], width: 3 },
            { ...axis(p.components[1], 2 * Math.sqrt(p.variances[1])), color: SERIES[2], width: 3 },
          ]}
        />
      </ChartCard>
    </LabLayout>
  );
}
