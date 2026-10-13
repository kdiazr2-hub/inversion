// Tiny, transparent ML models for the lab (2 features, binary labels).
import { rng } from "../stats/math";

export interface P2 {
  x: number;
  y: number;
  c: 0 | 1;
}

export type Shape = "manchas" | "lunas" | "xor" | "circulos";

export function makeData(shape: Shape, n: number, noise: number, seed: number): P2[] {
  const r = rng(seed);
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const c = (i % 2) as 0 | 1;
    let x = 0;
    let y = 0;
    if (shape === "manchas") {
      x = (c ? 0.65 : 0.35) + r.normal(0, 0.1 + noise * 0.25);
      y = (c ? 0.6 : 0.4) + r.normal(0, 0.1 + noise * 0.25);
    } else if (shape === "lunas") {
      // the classic two interleaving half-moons, rescaled into the unit square
      const t = Math.PI * r.next();
      const mx = c ? 1 - Math.cos(t) : Math.cos(t);
      const my = c ? 0.5 - Math.sin(t) : Math.sin(t);
      x = ((mx + 1) / 3) * 0.8 + 0.1 + r.normal(0, noise * 0.12);
      y = ((my + 0.5) / 1.5) * 0.8 + 0.1 + r.normal(0, noise * 0.12);
    } else if (shape === "xor") {
      const a = r.next() < 0.5;
      const b = c ? !a : a;
      x = (a ? 0.72 : 0.28) + r.normal(0, 0.08 + noise * 0.15);
      y = (b ? 0.72 : 0.28) + r.normal(0, 0.08 + noise * 0.15);
    } else {
      const t = 2 * Math.PI * r.next();
      const rad = (c ? 0.33 : 0.13) + r.normal(0, 0.03 + noise * 0.12);
      x = 0.5 + rad * Math.cos(t);
      y = 0.5 + rad * Math.sin(t);
    }
    out.push({ x, y, c });
  }
  return out;
}

export function split<T>(data: T[], testFrac: number, seed: number) {
  const r = rng(seed);
  const idx = data.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const cut = Math.round(data.length * (1 - testFrac));
  return { train: idx.slice(0, cut).map((i) => data[i]), test: idx.slice(cut).map((i) => data[i]) };
}

export type Model = (x: number, y: number) => number; // returns P(class 1)

export function knn(train: P2[], k: number): Model {
  return (x, y) => {
    const d = train.map((p) => ({ d: (p.x - x) ** 2 + (p.y - y) ** 2, c: p.c })).sort((a, b) => a.d - b.d);
    const kk = Math.min(k, d.length);
    let s = 0;
    for (let i = 0; i < kk; i++) s += d[i].c;
    return kk ? s / kk : 0.5;
  };
}

function poly(x: number, y: number, deg: number): number[] {
  const f: number[] = [1];
  for (let d = 1; d <= deg; d++) for (let i = 0; i <= d; i++) f.push((x - 0.5) ** (d - i) * (y - 0.5) ** i * 2 ** d);
  return f;
}

/** Logistic regression with polynomial features and L2 penalty, batch gradient descent. */
export function logistic(train: P2[], deg: number, lambda: number, iters = 600, lr = 0.8): Model {
  const X = train.map((p) => poly(p.x, p.y, deg));
  const m = X[0]?.length ?? 1;
  const w = new Array(m).fill(0);
  const n = train.length || 1;
  for (let it = 0; it < iters; it++) {
    const g = new Array(m).fill(0);
    for (let i = 0; i < X.length; i++) {
      const z = X[i].reduce((s, v, j) => s + v * w[j], 0);
      const p = 1 / (1 + Math.exp(-z));
      const e = p - train[i].c;
      for (let j = 0; j < m; j++) g[j] += e * X[i][j];
    }
    for (let j = 0; j < m; j++) w[j] -= lr * (g[j] / n + (j ? lambda * w[j] : 0));
  }
  return (x, y) => 1 / (1 + Math.exp(-poly(x, y, deg).reduce((s, v, j) => s + v * w[j], 0)));
}

interface Node {
  leaf?: number;
  f?: "x" | "y";
  t?: number;
  l?: Node;
  r?: Node;
}

const gini = (pts: P2[]) => {
  if (!pts.length) return 0;
  const p = pts.filter((q) => q.c === 1).length / pts.length;
  return 2 * p * (1 - p);
};

function grow(pts: P2[], depth: number, minLeaf: number): Node {
  const p1 = pts.length ? pts.filter((q) => q.c === 1).length / pts.length : 0.5;
  if (depth === 0 || pts.length < 2 * minLeaf || p1 === 0 || p1 === 1) return { leaf: p1 };
  let best: { f: "x" | "y"; t: number; score: number } | null = null;
  for (const f of ["x", "y"] as const) {
    const vals = [...new Set(pts.map((q) => q[f]))].sort((a, b) => a - b);
    for (let i = 1; i < vals.length; i++) {
      const t = (vals[i - 1] + vals[i]) / 2;
      const L = pts.filter((q) => q[f] <= t);
      const R = pts.filter((q) => q[f] > t);
      if (L.length < minLeaf || R.length < minLeaf) continue;
      const score = (L.length * gini(L) + R.length * gini(R)) / pts.length;
      if (!best || score < best.score) best = { f, t, score };
    }
  }
  if (!best || best.score >= gini(pts) - 1e-12) return { leaf: p1 };
  return { f: best.f, t: best.t, l: grow(pts.filter((q) => q[best!.f] <= best!.t), depth - 1, minLeaf), r: grow(pts.filter((q) => q[best!.f] > best!.t), depth - 1, minLeaf) };
}

export function tree(train: P2[], maxDepth: number, minLeaf = 1): Model {
  const root = grow(train, maxDepth, minLeaf);
  return (x, y) => {
    let n = root;
    while (n.leaf === undefined) n = (n.f === "x" ? x : y) <= n.t! ? n.l! : n.r!;
    return n.leaf;
  };
}

export function metrics(model: Model, pts: P2[]) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const p of pts) {
    const pred = model(p.x, p.y) >= 0.5 ? 1 : 0;
    if (pred === 1 && p.c === 1) tp++;
    else if (pred === 1) fp++;
    else if (p.c === 0) tn++;
    else fn++;
  }
  const n = pts.length || 1;
  const precision = tp + fp ? tp / (tp + fp) : NaN;
  const recall = tp + fn ? tp / (tp + fn) : NaN;
  return { tp, fp, tn, fn, accuracy: (tp + tn) / n, precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : NaN };
}

export function majorityBaseline(train: P2[], test: P2[]) {
  const ones = train.filter((p) => p.c === 1).length;
  const cls = ones * 2 >= train.length ? 1 : 0;
  return test.length ? test.filter((p) => p.c === cls).length / test.length : NaN;
}
