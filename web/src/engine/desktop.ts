/**
 * Versions for running the learner's code on their own computer. They are the versions CI tests
 * every mission with on CPython (requirements-dev.txt and the Python of the CI workflow;
 * desktop.test.ts keeps them in sync).
 */

export const DESKTOP_PYTHON = "3.13";

/**
 * Python versions for which every pinned package publishes wheels for Windows (64 bits), macOS
 * (Intel, and Apple Silicon from macOS 12) and Linux x86-64; checked with ``pip download
 * --only-binary=:all:``. Python 3.14 is not: numpy 2.2.5 has no wheels for it.
 */
export const DESKTOP_PYTHON_RANGE = "3.10 a 3.13";

interface DesktopPackage {
  /** Name on PyPI (what pip installs). */
  dist: string;
  version: string;
  /** Other pinned packages it imports, pinned too so the code behaves as in the game. */
  needs?: string[];
  /** Version in the game (Pyodide) when the desktop pin has to differ, and why. */
  game?: { version: string; reason: string };
}

/** Third-party modules the missions import, by import name. */
export const DESKTOP_PACKAGES: Record<string, DesktopPackage> = {
  numpy: { dist: "numpy", version: "2.2.5" },
  pandas: { dist: "pandas", version: "2.3.1", needs: ["numpy"] },
  scipy: { dist: "scipy", version: "1.14.1", needs: ["numpy"] },
  sklearn: { dist: "scikit-learn", version: "1.7.0", needs: ["numpy", "scipy", "joblib"] },
  joblib: { dist: "joblib", version: "1.4.2" },
  statsmodels: { dist: "statsmodels", version: "0.14.4", needs: ["numpy", "pandas", "scipy"] },
  matplotlib: {
    dist: "matplotlib",
    version: "3.9.4",
    needs: ["numpy"],
    game: { version: "3.8.4", reason: "la 3.8.4 no publica paquetes para Python 3.13" },
  },
  seaborn: { dist: "seaborn", version: "0.13.2", needs: ["numpy", "pandas", "matplotlib"] },
  pydantic: { dist: "pydantic", version: "2.10.6" },
  networkx: { dist: "networkx", version: "3.4.2" },
  packaging: { dist: "packaging", version: "24.2" },
};

/** Top-level modules a Python source imports (``import a.b as c, d`` and ``from a.b import c``). */
export function importedModules(code: string): string[] {
  const found = new Set<string>();
  for (const line of code.split("\n")) {
    const from = /^\s*from\s+([A-Za-z_]\w*)[\w.]*\s+import\b/.exec(line);
    if (from) {
      found.add(from[1]!);
      continue;
    }
    const imp = /^\s*import\s+(.+)$/.exec(line);
    if (!imp) continue;
    for (const part of imp[1]!.split("#")[0]!.split(",")) {
      const name = /^\s*([A-Za-z_]\w*)/.exec(part);
      if (name) found.add(name[1]!);
    }
  }
  return [...found];
}

/** The pinned packages ``code`` needs, with their dependencies, by import name. */
export function desktopPackages(code: string): string[] {
  const out = new Set<string>();
  const add = (mod: string) => {
    const pkg = DESKTOP_PACKAGES[mod];
    if (!pkg || out.has(mod)) return;
    out.add(mod);
    pkg.needs?.forEach(add);
  };
  importedModules(code).forEach(add);
  return [...out].sort((a, b) => DESKTOP_PACKAGES[a]!.dist.localeCompare(DESKTOP_PACKAGES[b]!.dist));
}

/** requirements.txt for ``code``: one ``name==version`` line per package; "" when it needs none. */
export function requirementsFor(code: string): string {
  return desktopPackages(code)
    .map((m) => `${DESKTOP_PACKAGES[m]!.dist}==${DESKTOP_PACKAGES[m]!.version}\n`)
    .join("");
}
