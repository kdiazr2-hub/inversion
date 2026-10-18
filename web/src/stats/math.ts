// Numerical statistics for the labs. Implementations follow Numerical Recipes / Abramowitz-Stegun
// style algorithms and are verified against SciPy reference values in math.test.ts.

// ------------------------------------------------------------------ random numbers

/** Mulberry32: small, fast, seedable PRNG so simulations are reproducible. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  const normal = (mu = 0, sd = 1) => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return mu + sd * s;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = next() * 2 - 1;
      v = next() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const f = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * f;
    return mu + sd * u * f;
  };
  const exponential = (rate = 1) => -Math.log(1 - next()) / rate;
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const binomial = (n: number, p: number) => {
    let k = 0;
    for (let i = 0; i < n; i++) if (next() < p) k++;
    return k;
  };
  const poisson = (lambda: number) => {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= next();
    } while (p > L);
    return k - 1;
  };
  return { next, normal, exponential, int, binomial, poisson };
}
export type Rng = ReturnType<typeof rng>;

// ------------------------------------------------------------------ descriptive

export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
export const mean = (xs: number[]) => sum(xs) / xs.length;
/** Variance; ddof = 1 for the sample (Bessel) estimator, 0 for the population. */
export function variance(xs: number[], ddof = 1) {
  const m = mean(xs);
  return sum(xs.map((x) => (x - m) ** 2)) / (xs.length - ddof);
}
export const sd = (xs: number[], ddof = 1) => Math.sqrt(variance(xs, ddof));
/** Quantile with linear interpolation (NumPy's default, "type 7"). */
export function quantile(xs: number[], q: number) {
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
export const median = (xs: number[]) => quantile(xs, 0.5);

export function histogram(xs: number[], lo: number, hi: number, bins: number) {
  const w = (hi - lo) / bins;
  const counts = new Array(bins).fill(0);
  for (const x of xs) {
    const i = Math.floor((x - lo) / w);
    if (i >= 0 && i < bins) counts[i]++;
    else if (x === hi) counts[bins - 1]++;
  }
  return counts.map((c, i) => ({ x0: lo + i * w, x1: lo + (i + 1) * w, count: c, density: c / (xs.length * w) }));
}

// ------------------------------------------------------------------ special functions

const LANCZOS = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

export function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  for (let i = 0; i < 8; i++) a += LANCZOS[i] / (x + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

export const lchoose = (n: number, k: number) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
export const choose = (n: number, k: number) => (k < 0 || k > n ? 0 : Math.round(Math.exp(lchoose(n, k))));

/** Regularized lower incomplete gamma P(a, x). */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let ap = a;
    let del = 1 / a;
    let s = del;
    for (let n = 0; n < 500; n++) {
      ap++;
      del *= x / ap;
      s += del;
      if (Math.abs(del) < Math.abs(s) * 1e-15) break;
    }
    return s * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  // continued fraction for Q
  let b = x + 1 - a;
  let c = 1 / 1e-300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

function betacf(a: number, b: number, x: number) {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-300) d = 1e-300;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 500; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
export function betaI(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Find x in [lo, hi] with f(x) = target for monotone increasing f (bisection). */
export function invert(f: (x: number) => number, target: number, lo: number, hi: number, iters = 200) {
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ------------------------------------------------------------------ distributions

export const normalPdf = (x: number, mu = 0, s = 1) => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

/** Normal CDF via erfc with ~1e-14 accuracy (W. J. Cody style rational approximation through gammaP). */
export function normalCdf(x: number, mu = 0, s = 1) {
  const z = (x - mu) / (s * Math.SQRT2);
  const p = gammaP(0.5, z * z);
  return z >= 0 ? 0.5 * (1 + p) : 0.5 * (1 - p);
}

/** Inverse normal CDF (Acklam's algorithm refined with one Newton step). */
export function normalInv(p: number, mu = 0, s = 1) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let x: number;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - pl) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = normalCdf(x) - p;
  x -= e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return mu + s * x;
}

export const tPdf = (t: number, df: number) => Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2) - 0.5 * Math.log(df * Math.PI) - ((df + 1) / 2) * Math.log(1 + (t * t) / df));
export function tCdf(t: number, df: number) {
  const x = df / (df + t * t);
  const tail = 0.5 * betaI(df / 2, 0.5, x);
  return t >= 0 ? 1 - tail : tail;
}
export const tInv = (p: number, df: number) => invert((t) => tCdf(t, df), p, -1e3, 1e3);

export const chi2Pdf = (x: number, k: number) => (x <= 0 ? 0 : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - lgamma(k / 2)));
export const chi2Cdf = (x: number, k: number) => gammaP(k / 2, Math.max(0, x / 2));
export const chi2Inv = (p: number, k: number) => invert((x) => chi2Cdf(x, k), p, 0, 1e4);

export const fCdf = (x: number, d1: number, d2: number) => (x <= 0 ? 0 : betaI(d1 / 2, d2 / 2, (d1 * x) / (d1 * x + d2)));
export const fPdf = (x: number, d1: number, d2: number) =>
  x <= 0 ? 0 : Math.exp(0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x) - (lgamma(d1 / 2) + lgamma(d2 / 2) - lgamma((d1 + d2) / 2)));

export const binomPmf = (k: number, n: number, p: number) => (k < 0 || k > n ? 0 : Math.exp(lchoose(n, k) + (k ? k * Math.log(p) : 0) + (n - k ? (n - k) * Math.log(1 - p) : 0)));
export const poissonPmf = (k: number, l: number) => (k < 0 ? 0 : Math.exp(k * Math.log(l) - l - lgamma(k + 1)));
export const geomPmf = (k: number, p: number) => (k < 1 ? 0 : (1 - p) ** (k - 1) * p);
export const hypergeomPmf = (k: number, N: number, K: number, n: number) => (k < Math.max(0, n - (N - K)) || k > Math.min(n, K) ? 0 : Math.exp(lchoose(K, k) + lchoose(N - K, n - k) - lchoose(N, n)));
export const expPdf = (x: number, rate: number) => (x < 0 ? 0 : rate * Math.exp(-rate * x));
export const gammaPdf = (x: number, k: number, theta: number) => (x <= 0 ? 0 : Math.exp((k - 1) * Math.log(x) - x / theta - lgamma(k) - k * Math.log(theta)));
export const betaPdf = (x: number, a: number, b: number) => (x <= 0 || x >= 1 ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - (lgamma(a) + lgamma(b) - lgamma(a + b))));
export const betaInv = (p: number, a: number, b: number) => invert((x) => betaI(a, b, x), p, 0, 1);
export const lognormPdf = (x: number, mu: number, s: number) => (x <= 0 ? 0 : normalPdf(Math.log(x), mu, s) / x);
export const uniformPdf = (x: number, a: number, b: number) => (x < a || x > b ? 0 : 1 / (b - a));

// ------------------------------------------------------------------ inference

export interface TTest {
  t: number;
  df: number;
  p: number;
  diff: number;
  se: number;
  ci: [number, number];
}

/** One-sample t test and CI for the mean. */
export function tTestOne(xs: number[], mu0 = 0, conf = 0.95): TTest {
  const n = xs.length;
  const m = mean(xs);
  const se = sd(xs) / Math.sqrt(n);
  const t = (m - mu0) / se;
  const df = n - 1;
  const q = tInv(1 - (1 - conf) / 2, df);
  return { t, df, p: 2 * (1 - tCdf(Math.abs(t), df)), diff: m - mu0, se, ci: [m - q * se, m + q * se] };
}

/** Welch two-sample t test (unequal variances). */
export function welch(a: number[], b: number[], conf = 0.95): TTest {
  const va = variance(a) / a.length;
  const vb = variance(b) / b.length;
  const se = Math.sqrt(va + vb);
  const diff = mean(a) - mean(b);
  const t = diff / se;
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
  const q = tInv(1 - (1 - conf) / 2, df);
  return { t, df, p: 2 * (1 - tCdf(Math.abs(t), df)), diff, se, ci: [diff - q * se, diff + q * se] };
}

/** Cohen's d with pooled standard deviation. */
export function cohenD(a: number[], b: number[]) {
  const sp = Math.sqrt(((a.length - 1) * variance(a) + (b.length - 1) * variance(b)) / (a.length + b.length - 2));
  return (mean(a) - mean(b)) / sp;
}

/** Power of a two-sided two-sample z test with equal n per group, effect d in SD units. */
export function powerTwoSample(d: number, nPerGroup: number, alpha = 0.05) {
  const z = normalInv(1 - alpha / 2);
  const ncp = d * Math.sqrt(nPerGroup / 2);
  return 1 - normalCdf(z - ncp) + normalCdf(-z - ncp);
}

/** Wilson score interval for a proportion. */
export function wilson(k: number, n: number, conf = 0.95): [number, number] {
  const z = normalInv(1 - (1 - conf) / 2);
  const p = k / n;
  const den = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / den;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [c - h, c + h];
}

// ------------------------------------------------------------------ correlation & regression

export function pearson(x: number[], y: number[]) {
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

export function ranks(xs: number[]) {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r as number[];
}
export const spearman = (x: number[], y: number[]) => pearson(ranks(x), ranks(y));

export interface Ols {
  intercept: number;
  slope: number;
  r2: number;
  seSlope: number;
  seIntercept: number;
  sigma: number;
  pSlope: number;
  ciSlope: [number, number];
  residuals: number[];
  fitted: number[];
}

export function ols(x: number[], y: number[]): Ols {
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const fitted = x.map((v) => intercept + slope * v);
  const residuals = y.map((v, i) => v - fitted[i]);
  const sse = sum(residuals.map((r) => r * r));
  const sst = sum(y.map((v) => (v - my) ** 2));
  const sigma = Math.sqrt(sse / (n - 2));
  const seSlope = sigma / Math.sqrt(sxx);
  const seIntercept = sigma * Math.sqrt(1 / n + (mx * mx) / sxx);
  const t = slope / seSlope;
  const q = tInv(0.975, n - 2);
  return { intercept, slope, r2: 1 - sse / sst, seSlope, seIntercept, sigma, pSlope: 2 * (1 - tCdf(Math.abs(t), n - 2)), ciSlope: [slope - q * seSlope, slope + q * seSlope], residuals, fitted };
}

// ------------------------------------------------------------------ diagnostics

export interface RocPoint {
  threshold: number;
  tpr: number;
  fpr: number;
}

/** ROC curve from scores (higher = more likely positive) and binary labels; AUC by trapezoids. */
export function roc(scores: number[], labels: (0 | 1)[]) {
  const P = labels.filter((l) => l === 1).length;
  const N = labels.length - P;
  const order = scores.map((s, i) => [s, labels[i]] as const).sort((a, b) => b[0] - a[0]);
  const pts: RocPoint[] = [{ threshold: Infinity, tpr: 0, fpr: 0 }];
  let tp = 0;
  let fp = 0;
  for (let i = 0; i < order.length; i++) {
    if (order[i][1] === 1) tp++;
    else fp++;
    if (i === order.length - 1 || order[i + 1][0] !== order[i][0]) pts.push({ threshold: order[i][0], tpr: tp / P, fpr: fp / N });
  }
  let auc = 0;
  for (let i = 1; i < pts.length; i++) auc += ((pts[i].fpr - pts[i - 1].fpr) * (pts[i].tpr + pts[i - 1].tpr)) / 2;
  return { points: pts, auc };
}

export function diagnostic(sens: number, spec: number, prev: number) {
  const ppv = (sens * prev) / (sens * prev + (1 - spec) * (1 - prev));
  const npv = (spec * (1 - prev)) / (spec * (1 - prev) + (1 - sens) * prev);
  return { ppv, npv, lrPos: sens / (1 - spec), lrNeg: (1 - sens) / spec };
}

// ------------------------------------------------------------------ survival

export interface KmStep {
  t: number;
  atRisk: number;
  events: number;
  censored: number;
  s: number;
}

/** Kaplan-Meier estimator; event = 1 for the event, 0 for censoring. */
export function kaplanMeier(times: number[], event: (0 | 1)[]): KmStep[] {
  const data = times.map((t, i) => ({ t, e: event[i] })).sort((a, b) => a.t - b.t);
  const uniq = [...new Set(data.map((d) => d.t))];
  let atRisk = data.length;
  let s = 1;
  const out: KmStep[] = [];
  for (const t of uniq) {
    const here = data.filter((d) => d.t === t);
    const events = here.filter((d) => d.e === 1).length;
    const censored = here.length - events;
    if (events > 0) s *= 1 - events / atRisk;
    out.push({ t, atRisk, events, censored, s });
    atRisk -= here.length;
  }
  return out;
}
