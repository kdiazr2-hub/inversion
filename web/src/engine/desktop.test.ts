import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DESKTOP_PACKAGES, DESKTOP_PYTHON, importedModules, requirementsFor } from "./desktop";

const root = new URL("../../../", import.meta.url);

describe("desktop versions", () => {
  it("are the versions CI tests the content with", () => {
    const dev = Object.fromEntries(
      readFileSync(new URL("requirements-dev.txt", root), "utf-8")
        .split("\n")
        .map((l) => /^([A-Za-z0-9_.-]+)==(\S+)/.exec(l.trim()))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => [m[1]!.toLowerCase(), m[2]!]),
    );
    for (const pkg of Object.values(DESKTOP_PACKAGES)) expect([pkg.dist, dev[pkg.dist]]).toEqual([pkg.dist, pkg.version]);
    const ci = readFileSync(new URL(".github/workflows/ci.yml", root), "utf-8");
    expect(ci).toContain(`python-version: "${DESKTOP_PYTHON}"`);
  });

  it("finds the imported modules", () => {
    const code = ["import numpy as np, pandas as pd  # datos", "from sklearn.linear_model import LinearRegression", "    import os.path", "from . import vecino", 'texto = "import nada"'].join("\n");
    expect(importedModules(code).sort()).toEqual(["numpy", "os", "pandas", "sklearn"]);
  });

  it("pins the packages and what they import", () => {
    expect(requirementsFor("import seaborn as sns\n")).toBe("matplotlib==3.9.4\nnumpy==2.2.5\npandas==2.3.1\nseaborn==0.13.2\n");
    expect(requirementsFor("from sklearn.tree import DecisionTreeRegressor\n")).toBe("joblib==1.4.2\nnumpy==2.2.5\nscikit-learn==1.7.0\nscipy==1.14.1\n");
    expect(requirementsFor("import json\nimport math\n")).toBe("");
  });
});
