import { describe, expect, it } from "vitest";
import { knn, logistic, majorityBaseline, makeData, metrics, split, tree } from "./ml";

describe("lab ML models", () => {
  const data = makeData("manchas", 300, 0.1, 3);
  const { train, test } = split(data, 0.3, 1);
  it("splits without overlap", () => {
    expect(train.length + test.length).toBe(300);
    expect(new Set([...train, ...test]).size).toBe(300);
  });
  it("all models beat the majority baseline on separable blobs", () => {
    const base = majorityBaseline(train, test);
    for (const m of [knn(train, 7), logistic(train, 1, 0.001), tree(train, 3)]) expect(metrics(m, test).accuracy).toBeGreaterThan(base + 0.2);
  });
  it("1-NN and a deep tree memorise the training set (overfitting signal)", () => {
    const noisy = makeData("xor", 200, 0.6, 9);
    const s = split(noisy, 0.3, 2);
    expect(metrics(knn(s.train, 1), s.train).accuracy).toBe(1);
    expect(metrics(tree(s.train, 30), s.train).accuracy).toBe(1);
    expect(metrics(knn(s.train, 1), s.test).accuracy).toBeLessThan(1);
  });
  it("linear logistic fails on XOR while degree 2 succeeds", () => {
    const x = makeData("xor", 300, 0, 4);
    const s = split(x, 0.3, 5);
    expect(metrics(logistic(s.train, 1, 0), s.test).accuracy).toBeLessThan(0.7);
    expect(metrics(logistic(s.train, 2, 0, 1500), s.test).accuracy).toBeGreaterThan(0.9);
  });
  it("confusion matrix counts add up", () => {
    const m = metrics(knn(train, 5), test);
    expect(m.tp + m.fp + m.tn + m.fn).toBe(test.length);
  });
});
