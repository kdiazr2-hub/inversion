// Reference values computed with NumPy 2.2.5, SciPy 1.14.1 and scikit-learn 1.7.0.
import { describe, expect, it } from "vitest";
import { centralDiff, eigen2, forwardDiff, FUNCTIONS, gradientDescent, integrate, kmeansHistory, makeBlobs, makeCorrelated, monteCarlo, mse, pca2, polyFit, solve, SURFACES, type XY } from "./numeric";

const close = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);
// Eigenvectors are defined up to sign.
const sameDir = (u: [number, number], v: number[], tol = 1e-9) => expect(Math.min(Math.hypot(u[0] - v[0], u[1] - v[1]), Math.hypot(u[0] + v[0], u[1] + v[1]))).toBeLessThan(tol);

describe("derivatives", () => {
  it("central differences are O(h²), forward differences O(h)", () => {
    for (const fn of FUNCTIONS) {
      const x = fn.domain[0] + 0.37 * (fn.domain[1] - fn.domain[0]);
      const ec1 = Math.abs(centralDiff(fn.f, x, 1e-2) - fn.df(x));
      const ec2 = Math.abs(centralDiff(fn.f, x, 1e-3) - fn.df(x));
      const ef = Math.abs(forwardDiff(fn.f, x, 1e-3) - fn.df(x));
      expect(ec2).toBeLessThan(1e-5);
      if (ec1 > 1e-9) expect(ec2 / ec1).toBeLessThan(0.02); // h ÷ 10 → error ÷ ~100
      expect(ec2).toBeLessThanOrEqual(ef + 1e-12);
    }
  });
});

describe("gradient descent", () => {
  it("converges below 2/L and diverges above it on quadratics", () => {
    for (const s of SURFACES.filter((x) => x.maxRate)) {
      const ok = gradientDescent(s, s.maxRate! * 0.9, 300);
      expect(ok[ok.length - 1].loss).toBeLessThan(1e-6);
      const bad = gradientDescent(s, s.maxRate! * 1.1, 300);
      expect(bad[bad.length - 1].loss).toBeGreaterThan(bad[0].loss);
    }
  });
  it("reaches the Rosenbrock minimum (1, 1) with a small rate", () => {
    const s = SURFACES.find((x) => x.id === "rosenbrock")!;
    const p = gradientDescent(s, 0.01, 20000);
    close(p[p.length - 1].x, 1, 1e-3);
    close(p[p.length - 1].y, 1, 1e-3);
  });
  it("momentum speeds up the elongated valley", () => {
    const s = SURFACES.find((x) => x.id === "valle")!;
    const plain = gradientDescent(s, 0.05, 60);
    const mom = gradientDescent(s, 0.05, 60, 0.8);
    expect(mom[mom.length - 1].loss).toBeLessThan(plain[plain.length - 1].loss);
  });
});

describe("2×2 eigen decomposition", () => {
  it("matches numpy.linalg.eig", () => {
    const e = eigen2([2, 1, 1, 3]);
    close(e.values[0], 3.61803399, 1e-8);
    close(e.values[1], 1.38196601, 1e-8);
    sameDir(e.vectors[0], [-0.52573111, -0.85065081], 1e-7);
    sameDir(e.vectors[1], [-0.85065081, 0.52573111], 1e-7);
    const f = eigen2([4, 1, 2, 3]);
    expect(f.values).toEqual([5, 2]);
    sameDir(f.vectors[0], [0.70710678, 0.70710678], 1e-7);
    sameDir(f.vectors[1], [-0.4472136, 0.89442719], 1e-7);
  });
  it("detects complex eigenvalues (rotations)", () => {
    const r = eigen2([0, -1, 1, 0]);
    expect(r.real).toBe(false);
    close(r.values[0], 0);
    close(r.imag, 1);
  });
  it("A v = λ v for the returned pairs", () => {
    for (const m of [[1, 2, 0, 1], [3, 0, 0, 3], [0.5, -1.5, 2, 1], [2, 1, 1, 3]] as const) {
      const e = eigen2([...m]);
      if (!e.real) continue;
      e.vectors.forEach((v, i) => {
        close(m[0] * v[0] + m[1] * v[1], e.values[i] * v[0], 1e-9);
        close(m[2] * v[0] + m[3] * v[1], e.values[i] * v[1], 1e-9);
      });
    }
  });
  it("solves linear systems like numpy.linalg.solve", () => {
    solve([[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], [8, -11, -3]).forEach((v, i) => close(v, [2, 3, -1][i], 1e-12));
  });
});

describe("numerical integration", () => {
  const g = (x: number) => Math.exp(-x * x);
  it("trapezoid and Simpson match numpy/scipy with 10 subintervals", () => {
    close(integrate(g, 0, 2, 10, "trapecios"), 0.8818388107987755, 1e-12);
    close(integrate(g, 0, 2, 10, "simpson"), 0.882074876854494, 1e-12);
  });
  it("errors shrink with n and Simpson beats the others", () => {
    const exact = 0.8820813907624215; // √π/2 · erf(2)
    for (const rule of ["izquierda", "derecha", "punto-medio", "trapecios", "simpson"] as const) {
      expect(Math.abs(integrate(g, 0, 2, 200, rule) - exact)).toBeLessThan(Math.abs(integrate(g, 0, 2, 10, rule) - exact));
    }
    expect(Math.abs(integrate(g, 0, 2, 10, "simpson") - exact)).toBeLessThan(Math.abs(integrate(g, 0, 2, 10, "trapecios") - exact));
  });
  it("the area under the normal density between −1 and 1 is 0.6827", () => {
    const phi = (x: number) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
    close(integrate(phi, -1, 1, 100, "simpson"), 0.6826894921370859, 1e-8);
    const mc = monteCarlo(phi, -1, 1, 20000, 3);
    expect(Math.abs(mc.value - 0.6826894921370859)).toBeLessThan(4 * mc.se);
  });
});

describe("polynomial regression", () => {
  const xs = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1];
  const noise = [0.1, -0.2, 0.05, 0, 0.15, -0.1, 0.2, -0.05];
  const pts: XY[] = xs.map((x, i) => ({ x, y: Math.sin(2 * Math.PI * x) + noise[i] }));
  it("matches numpy.polyfit", () => {
    const ref: Record<number, [number, number, number]> = {
      1: [0.23016792930156732, -0.11959503563584317, 0.25433730148150907],
      3: [0.8263804103515242, -0.5004929302123179, 0.03298099245727158],
      5: [1.0163859012050687, -0.6984456996803615, 0.005001031925079648],
    };
    for (const [d, [a, b, m]] of Object.entries(ref)) {
      const f = polyFit(pts, Number(d));
      close(f(0.3), a, 1e-7);
      close(f(0.62), b, 1e-7);
      close(mse(f, pts), m, 1e-8);
    }
  });
  it("ridge on standardised features matches the closed form (XᵀX + λP)⁻¹Xᵀy", () => {
    close(polyFit(pts, 3, 0.5)(0.3), 0.3229263367614679, 1e-7);
  });
  it("training error never increases with the degree", () => {
    let prev = Infinity;
    for (let d = 0; d <= 7; d++) {
      const m = mse(polyFit(pts, d), pts);
      expect(m).toBeLessThanOrEqual(prev + 1e-9);
      prev = m;
    }
  });
});

describe("k-means", () => {
  it("inertia never increases and the algorithm converges", () => {
    const pts = makeBlobs(150, 3, 0.6, 5);
    const h = kmeansHistory(pts, 3, 2);
    for (let i = 1; i < h.length; i++) expect(h[i].inertia).toBeLessThanOrEqual(h[i - 1].inertia + 1e-9);
    const last = h[h.length - 1];
    expect(last.labels).toEqual(h[h.length - 2].labels);
  });
  it("finds the obvious two groups", () => {
    const pts = [{ x: 0, y: 0 }, { x: 0.2, y: 0.1 }, { x: 0.1, y: -0.1 }, { x: 5, y: 5 }, { x: 5.1, y: 4.9 }, { x: 4.9, y: 5.2 }];
    const last = kmeansHistory(pts, 2, 7).at(-1)!;
    expect(new Set(last.labels.slice(0, 3)).size).toBe(1);
    expect(new Set(last.labels.slice(3)).size).toBe(1);
    expect(last.labels[0]).not.toBe(last.labels[3]);
    close(last.inertia, [...pts.slice(0, 3), ...pts.slice(3)].reduce((s, p, i) => {
      const c = last.centroids[last.labels[i]];
      return s + (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
    }, 0));
  });
});

describe("PCA", () => {
  it("matches numpy.cov / eigh and sklearn.decomposition.PCA", () => {
    const pts = [[1, 2], [2, 3.5], [3, 3.9], [4, 6.1], [5, 6.8], [2.5, 4.2]].map(([x, y]) => ({ x, y }));
    const p = pca2(pts);
    [2.041666666666667, 2.461666666666667, 2.461666666666667, 3.101666666666666].forEach((v, i) => close(p.cov[i], v, 1e-12));
    close(p.variances[0], 5.0897418795580105, 1e-10);
    close(p.variances[1], 0.05359145377532457, 1e-10);
    close(p.explained[0], 0.9895804043210645, 1e-10);
    sameDir(p.components[0], [0.6282999982042125, 0.7779711513009891]);
    sameDir(p.components[1], [0.7779711513009891, -0.6282999982042125]);
  });
  it("components are orthonormal and explain all the variance", () => {
    const p = pca2(makeCorrelated(300, 0.8, 1, 2, 1));
    close(p.components[0][0] * p.components[1][0] + p.components[0][1] * p.components[1][1], 0, 1e-9);
    close(Math.hypot(...p.components[0]), 1, 1e-12);
    close(p.explained[0] + p.explained[1], 1, 1e-12);
  });
});
