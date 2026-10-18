// Numerical methods behind the math lab and the new ML simulations. Pure functions, verified
// against NumPy/SciPy reference values in numeric.test.ts.
import { rng } from "../stats/math";

// ------------------------------------------------------------------ functions and derivatives

export interface Fn1 {
  id: string;
  label: string;
  f: (x: number) => number;
  /** Exact derivative, to compare with the numerical one. */
  df: (x: number) => number;
  domain: [number, number];
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export const FUNCTIONS: Fn1[] = [
  { id: "cuadratica", label: "f(x) = x²", f: (x) => x * x, df: (x) => 2 * x, domain: [-3, 3] },
  { id: "cubica", label: "f(x) = x³ − 3x", f: (x) => x ** 3 - 3 * x, df: (x) => 3 * x * x - 3, domain: [-2.5, 2.5] },
  { id: "cuartica", label: "f(x) = x⁴ − 3x³ + 2", f: (x) => x ** 4 - 3 * x ** 3 + 2, df: (x) => 4 * x ** 3 - 9 * x * x, domain: [-1.5, 3.5] },
  { id: "seno", label: "f(x) = sen x", f: Math.sin, df: Math.cos, domain: [-2 * Math.PI, 2 * Math.PI] },
  { id: "exponencial", label: "f(x) = eˣ", f: Math.exp, df: Math.exp, domain: [-2, 2] },
  { id: "logaritmo", label: "f(x) = ln x", f: Math.log, df: (x) => 1 / x, domain: [0.1, 5] },
  { id: "sigmoide", label: "f(x) = 1 / (1 + e⁻ˣ) (sigmoide)", f: sigmoid, df: (x) => sigmoid(x) * (1 - sigmoid(x)), domain: [-6, 6] },
];

export const forwardDiff = (f: (x: number) => number, x: number, h: number) => (f(x + h) - f(x)) / h;
export const centralDiff = (f: (x: number) => number, x: number, h: number) => (f(x + h) - f(x - h)) / (2 * h);

/** Samples of f over [a, b] (n + 1 points), skipping non-finite values. */
export function sample(f: (x: number) => number, a: number, b: number, n = 200) {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    const y = f(x);
    if (isFinite(y)) out.push({ x, y });
  }
  return out;
}

// ------------------------------------------------------------------ gradient descent

export interface Surface {
  id: string;
  label: string;
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => [number, number];
  start: [number, number];
  range: [number, number, number, number];
  /** Largest learning rate that still converges (2 / L for a quadratic with curvature L), if known. */
  maxRate?: number;
  minimum: [number, number];
}

export const SURFACES: Surface[] = [
  {
    id: "cuenco",
    label: "Cuenco redondo: x² + y²",
    f: (x, y) => x * x + y * y,
    grad: (x, y) => [2 * x, 2 * y],
    start: [2.5, 2],
    range: [-3, 3, -3, 3],
    maxRate: 1,
    minimum: [0, 0],
  },
  {
    id: "valle",
    label: "Valle alargado: x² + 10y²",
    f: (x, y) => x * x + 10 * y * y,
    grad: (x, y) => [2 * x, 20 * y],
    start: [2.6, 1.2],
    range: [-3, 3, -1.6, 1.6],
    maxRate: 0.1,
    minimum: [0, 0],
  },
  {
    id: "rosenbrock",
    label: "Rosenbrock: (1 − x)² + 10(y − x²)²",
    f: (x, y) => (1 - x) ** 2 + 10 * (y - x * x) ** 2,
    grad: (x, y) => [-2 * (1 - x) - 40 * x * (y - x * x), 20 * (y - x * x)],
    start: [-1.5, 2],
    range: [-2, 2, -1, 3],
    minimum: [1, 1],
  },
];

export interface GdStep {
  x: number;
  y: number;
  loss: number;
}

/** Gradient descent with optional (heavy-ball) momentum. Stops early if the iterate blows up. */
export function gradientDescent(s: Surface, lr: number, steps: number, momentum = 0, start = s.start): GdStep[] {
  let [x, y] = start;
  let vx = 0;
  let vy = 0;
  const path: GdStep[] = [{ x, y, loss: s.f(x, y) }];
  for (let i = 0; i < steps; i++) {
    const [gx, gy] = s.grad(x, y);
    vx = momentum * vx - lr * gx;
    vy = momentum * vy - lr * gy;
    x += vx;
    y += vy;
    const loss = s.f(x, y);
    path.push({ x, y, loss });
    if (!isFinite(loss) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6) break;
  }
  return path;
}

// ------------------------------------------------------------------ 2×2 linear maps

export type Mat2 = [number, number, number, number]; // [a, b, c, d] = [[a, b], [c, d]]

export const apply2 = ([a, b, c, d]: Mat2, [x, y]: [number, number]): [number, number] => [a * x + b * y, c * x + d * y];
export const det2 = ([a, b, c, d]: Mat2) => a * d - b * c;

export interface Eigen2 {
  real: boolean;
  values: [number, number];
  /** Imaginary part when the eigenvalues are complex (λ = re ± i·im). */
  imag: number;
  /** Unit eigenvectors (only for real eigenvalues). */
  vectors: [number, number][];
}

/** Eigenvalues/vectors of a 2×2 matrix from the characteristic polynomial λ² − tr·λ + det = 0. */
export function eigen2(m: Mat2): Eigen2 {
  const [a, b, c, d] = m;
  const tr = a + d;
  const det = det2(m);
  const disc = (tr * tr) / 4 - det;
  if (disc < -1e-12) {
    return { real: false, values: [tr / 2, tr / 2], imag: Math.sqrt(-disc), vectors: [] };
  }
  const r = Math.sqrt(Math.max(0, disc));
  const values: [number, number] = [tr / 2 + r, tr / 2 - r];
  const vec = (l: number): [number, number] => {
    // (A − λI)v = 0: pick the better-conditioned row.
    let v: [number, number];
    if (Math.abs(b) > 1e-12 || Math.abs(a - l) > 1e-12) v = Math.abs(b) >= Math.abs(c) ? [b, l - a] : [l - d, c];
    else v = Math.abs(c) > 1e-12 ? [l - d, c] : [1, 0];
    if (Math.hypot(v[0], v[1]) < 1e-12) v = [1, 0];
    const n = Math.hypot(v[0], v[1]);
    return [v[0] / n, v[1] / n];
  };
  const v1 = vec(values[0]);
  let v2 = vec(values[1]);
  // Repeated eigenvalue of a multiple of the identity: every vector is an eigenvector.
  if (Math.abs(values[0] - values[1]) < 1e-12 && Math.abs(b) < 1e-12 && Math.abs(c) < 1e-12) v2 = [0, 1];
  return { real: true, values, imag: 0, vectors: [v1, v2] };
}

// ------------------------------------------------------------------ numerical integration

export type Rule = "izquierda" | "derecha" | "punto-medio" | "trapecios" | "simpson";

export function integrate(f: (x: number) => number, a: number, b: number, n: number, rule: Rule): number {
  const h = (b - a) / n;
  let s = 0;
  if (rule === "izquierda") for (let i = 0; i < n; i++) s += f(a + i * h);
  else if (rule === "derecha") for (let i = 1; i <= n; i++) s += f(a + i * h);
  else if (rule === "punto-medio") for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * h);
  else if (rule === "trapecios") {
    s = (f(a) + f(b)) / 2;
    for (let i = 1; i < n; i++) s += f(a + i * h);
  } else {
    const m = n % 2 === 0 ? n : n + 1; // Simpson needs an even number of subintervals
    const hs = (b - a) / m;
    s = f(a) + f(b);
    for (let i = 1; i < m; i++) s += (i % 2 ? 4 : 2) * f(a + i * hs);
    return (s * hs) / 3;
  }
  return s * h;
}

/** Monte Carlo estimate of ∫ₐᵇ f: (b − a) times the mean of f at uniform points, with its standard error. */
export function monteCarlo(f: (x: number) => number, a: number, b: number, n: number, seed = 1) {
  const r = rng(seed);
  let s = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    const y = f(a + (b - a) * r.next());
    s += y;
    s2 += y * y;
  }
  const m = s / n;
  const v = n > 1 ? (s2 - n * m * m) / (n - 1) : 0;
  return { value: (b - a) * m, se: (b - a) * Math.sqrt(Math.max(0, v) / n) };
}

// ------------------------------------------------------------------ linear algebra helpers

/** Solves A x = b by Gaussian elimination with partial pivoting. */
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-14) throw new Error("Sistema singular");
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = col + 1; r < n; r++) {
      const k = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= k * M[col][c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let c = r + 1; c < n; c++) s -= M[r][c] * x[c];
    x[r] = s / M[r][r];
  }
  return x;
}

// ------------------------------------------------------------------ polynomial regression

export interface XY {
  x: number;
  y: number;
}

/** Noisy samples of y = sin(2πx) on [0, 1]: the classic over/underfitting example. */
export function makeWave(n: number, noise: number, seed: number): XY[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const x = r.next();
    return { x, y: Math.sin(2 * Math.PI * x) + r.normal(0, noise) };
  });
}

export const truth = (x: number) => Math.sin(2 * Math.PI * x);

/**
 * Least-squares polynomial fit with optional ridge penalty λ‖w‖² (intercept not penalised).
 * x is centred and scaled to [−1, 1] internally so the normal equations stay well conditioned.
 * Returns a predictor.
 */
export function polyFit(pts: XY[], degree: number, lambda = 0): (x: number) => number {
  const xs = pts.map((p) => p.x);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const c = (lo + hi) / 2;
  const s = (hi - lo) / 2 || 1;
  const feats = (x: number) => {
    const z = (x - c) / s;
    return Array.from({ length: degree + 1 }, (_, k) => z ** k);
  };
  const p = degree + 1;
  const XtX = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty = new Array<number>(p).fill(0);
  for (const pt of pts) {
    const f = feats(pt.x);
    for (let i = 0; i < p; i++) {
      Xty[i] += f[i] * pt.y;
      for (let j = 0; j < p; j++) XtX[i][j] += f[i] * f[j];
    }
  }
  for (let i = 1; i < p; i++) XtX[i][i] += lambda;
  // A tiny jitter keeps exact interpolation (degree ≥ n − 1) solvable.
  for (let i = 0; i < p; i++) XtX[i][i] += 1e-10;
  const w = solve(XtX, Xty);
  return (x: number) => feats(x).reduce((acc, v, i) => acc + v * w[i], 0);
}

export const mse = (model: (x: number) => number, pts: XY[]) => pts.reduce((acc, p) => acc + (model(p.x) - p.y) ** 2, 0) / pts.length;

// ------------------------------------------------------------------ k-means

export interface KmState {
  centroids: XY[];
  labels: number[];
  inertia: number;
}

const nearest = (p: XY, cs: XY[]) => {
  let best = 0;
  let bd = Infinity;
  cs.forEach((c, i) => {
    const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return { label: best, d: bd };
};

/** Gaussian blobs around k random centres (for the k-means simulator). */
export function makeBlobs(n: number, centers: number, spread: number, seed: number): XY[] {
  const r = rng(seed);
  const cs = Array.from({ length: centers }, () => ({ x: r.next() * 8 - 4, y: r.next() * 8 - 4 }));
  return Array.from({ length: n }, (_, i) => {
    const c = cs[i % centers];
    return { x: r.normal(c.x, spread), y: r.normal(c.y, spread) };
  });
}

/**
 * Lloyd's algorithm, recording every half-step: state 0 = initial centroids (k distinct data
 * points chosen with the seed) and assignment; then alternately "move centroids" and "reassign".
 */
export function kmeansHistory(pts: XY[], k: number, seed: number, maxIter = 30): KmState[] {
  const r = rng(seed);
  const idx = new Set<number>();
  while (idx.size < Math.min(k, pts.length)) idx.add(Math.floor(r.next() * pts.length));
  let centroids = [...idx].map((i) => ({ ...pts[i] }));
  const assign = (cs: XY[]) => {
    let inertia = 0;
    const labels = pts.map((p) => {
      const n = nearest(p, cs);
      inertia += n.d;
      return n.label;
    });
    return { labels, inertia };
  };
  let a = assign(centroids);
  const hist: KmState[] = [{ centroids, ...a }];
  for (let it = 0; it < maxIter; it++) {
    centroids = centroids.map((c, j) => {
      const mine = pts.filter((_, i) => a.labels[i] === j);
      return mine.length ? { x: mine.reduce((s, p) => s + p.x, 0) / mine.length, y: mine.reduce((s, p) => s + p.y, 0) / mine.length } : c;
    });
    const moved = { centroids, labels: a.labels, inertia: pts.reduce((s, p, i) => s + (p.x - centroids[a.labels[i]].x) ** 2 + (p.y - centroids[a.labels[i]].y) ** 2, 0) };
    hist.push(moved);
    const next = assign(centroids);
    const changed = next.labels.some((l, i) => l !== a.labels[i]);
    a = next;
    hist.push({ centroids, ...a });
    if (!changed) break;
  }
  return hist;
}

// ------------------------------------------------------------------ PCA in two dimensions

export interface Pca2 {
  mean: XY;
  /** Covariance matrix (sample, ddof = 1). */
  cov: Mat2;
  /** Variances along the components, largest first. */
  variances: [number, number];
  components: [[number, number], [number, number]];
  explained: [number, number];
  /** Scores (coordinates on the first component). */
  scores: number[];
}

export function pca2(pts: XY[]): Pca2 {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of pts) {
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  const cov: Mat2 = [sxx / (n - 1), sxy / (n - 1), sxy / (n - 1), syy / (n - 1)];
  const e = eigen2(cov);
  const total = e.values[0] + e.values[1];
  // Sign convention: first non-zero coordinate positive (deterministic output).
  const fix = (v: [number, number]): [number, number] => (v[0] < -1e-12 || (Math.abs(v[0]) <= 1e-12 && v[1] < 0) ? [-v[0], -v[1]] : v);
  const c1 = fix(e.vectors[0]);
  const c2 = fix(e.vectors[1]);
  return {
    mean: { x: mx, y: my },
    cov,
    variances: e.values,
    components: [c1, c2],
    explained: [e.values[0] / total, e.values[1] / total],
    scores: pts.map((p) => (p.x - mx) * c1[0] + (p.y - my) * c1[1]),
  };
}

/** Correlated 2-D normal sample (for the PCA simulator). */
export function makeCorrelated(n: number, rho: number, sx: number, sy: number, seed: number): XY[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const z1 = r.normal();
    const z2 = r.normal();
    return { x: sx * z1, y: sy * (rho * z1 + Math.sqrt(1 - rho * rho) * z2) };
  });
}
