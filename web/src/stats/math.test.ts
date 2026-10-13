// Reference values computed with SciPy 1.18 / statsmodels / scikit-learn (see README).
import { describe, expect, it } from "vitest";
import * as S from "./math";

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol * Math.max(1, Math.abs(b)));

describe("distributions match SciPy", () => {
  it("normal", () => {
    close(S.normalCdf(1.96), 0.975002104852);
    close(S.normalCdf(-2.5), 0.00620966532578);
    close(S.normalInv(0.975), 1.95996398454);
    close(S.normalInv(0.001), -3.09023230617);
  });
  it("t, chi-square, F", () => {
    close(S.tCdf(2.1, 7), 0.963064401894);
    close(S.tInv(0.975, 10), 2.22813885199);
    close(S.tInv(0.975, 3.5), 2.94008863798);
    close(S.chi2Cdf(3.84, 1), 0.949956478751);
    close(S.chi2Cdf(10, 4), 0.959572318005);
    close(S.chi2Inv(0.95, 3), 7.81472790325);
    close(S.fCdf(2.5, 3, 20), 0.911156248062);
    close(S.fPdf(1.2, 4, 15), 0.389176450942);
  });
  it("discrete and other continuous", () => {
    close(S.binomPmf(3, 10, 0.3), 0.266827932);
    close(S.poissonPmf(4, 2.5), 0.133601885781);
    close(S.hypergeomPmf(2, 50, 10, 8), 0.321724657891);
    close(S.gammaPdf(2, 3, 1.5), 0.156205711476);
    close(S.betaPdf(0.3, 2, 5), 2.1609);
    close(S.betaInv(0.025, 8, 4), 0.390257440428);
    close(S.lgamma(4.5), 2.45373657084);
    close(S.lgamma(0.3), 1.09579799482);
    expect(S.choose(10, 3)).toBe(120);
  });
});

describe("inference matches SciPy/statsmodels", () => {
  const a = [5.1, 4.9, 6.2, 5.8, 6.0, 5.5, 5.3];
  const b = [4.1, 4.5, 5.0, 4.8, 4.2, 4.9];
  it("one-sample t", () => {
    const r = S.tTestOne(a, 5);
    close(r.t, 2.99792459332);
    close(r.p, 0.0240725943948);
    close(r.ci[0], 5.09977609295);
    close(r.ci[1], 5.98593819276);
  });
  it("Welch", () => {
    const r = S.welch(a, b);
    close(r.t, 4.04031597542);
    close(r.p, 0.00196775729131);
    close(r.df, 10.943082651);
    close(r.ci[0], 0.43648585377);
  });
  it("Wilson interval and power", () => {
    const [lo, hi] = S.wilson(18, 50);
    close(lo, 0.241387496518);
    close(hi, 0.498589831239);
    close(S.powerTwoSample(0.5, 64), 0.807430419433);
  });
});

describe("regression, correlation, ROC, survival", () => {
  it("OLS", () => {
    const r = S.ols([1, 2, 3, 4, 5, 6, 7, 8], [2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1]);
    close(r.slope, 1.99761904762);
    close(r.intercept, 0.0357142857143);
    close(r.r2, 0.998839286601);
    close(r.seSlope, 0.0278004442669);
    close(r.seIntercept, 0.140385362081);
    close(r.pSlope, 4.88893361255e-10, 1e-3);
  });
  it("Pearson and Spearman (ties)", () => {
    close(S.pearson([1, 2, 3, 4, 5, 6, 7, 8], [1, 3, 2, 5, 4, 7, 6, 9]), 0.928587494238);
    close(S.spearman([1, 2, 2, 4, 5], [3, 1, 4, 4, 9]), 0.763157894737);
  });
  it("AUC equals scikit-learn (with tied scores)", () => {
    close(S.roc([0.1, 0.4, 0.35, 0.8, 0.2, 0.9, 0.5, 0.5], [0, 0, 1, 1, 0, 1, 1, 0]).auc, 0.84375);
  });
  it("Kaplan-Meier by hand", () => {
    // times 3, 5+, 5, 8, 10+, 12. At t=5 five are at risk (1 event); at t=8 three are at risk.
    const km = S.kaplanMeier([3, 5, 5, 8, 10, 12], [1, 0, 1, 1, 0, 1]);
    close(km[0].s, 5 / 6);
    expect(km[1]).toMatchObject({ atRisk: 5, events: 1, censored: 1 });
    close(km[1].s, (5 / 6) * (4 / 5));
    close(km[2].s, (5 / 6) * (4 / 5) * (2 / 3));
    close(km[4].s, 0);
  });
  it("seeded RNG is reproducible and roughly normal", () => {
    const r1 = S.rng(42);
    const r2 = S.rng(42);
    expect(r1.next()).toBe(r2.next());
    const g = S.rng(7);
    const xs = Array.from({ length: 20000 }, () => g.normal(10, 2));
    expect(Math.abs(S.mean(xs) - 10)).toBeLessThan(0.05);
    expect(Math.abs(S.sd(xs) - 2)).toBeLessThan(0.05);
  });
  it("sample vs population variance", () => {
    expect(S.variance([2, 4, 4, 4, 5, 5, 7, 9], 0)).toBe(4);
    close(S.variance([2, 4, 4, 4, 5, 5, 7, 9], 1), 32 / 7);
    expect(S.quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
  });
});
