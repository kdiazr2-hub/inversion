// Practice drills for World 4 (mathematics and statistics). Pure Python: each formula is written by
// hand, and where the standard library has the same quantity (statistics, math.comb, NormalDist)
// the tests compare against it too, so the learner's result is checked by two independent routes.
import { py, type Drill } from "../types";
import { callText, fnTests, lit, eq, show, type Case } from "./kit";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => sum(xs) / xs.length;
const comb = (n: number, k: number) => {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return Math.round(c);
};

/** Tests forbidding ready-made functions, so the drill practises the formula itself. */
const forbid = (names: string[], what: string) => py`
def test_a_mano():
    """Calcula la fórmula tú mismo"""
    usadas = [n for n in ${lit(names)} if t.calls(n)]
    assert not usadas, f"Aquí se practica la fórmula: calcula ${what} sin usar {', '.join(usadas)}."
`;

export const DRILLS_W4: Drill[] = [
  {
    id: "g-porcentajes",
    mission: "m-porcentajes",
    title: "Porcentajes y cambios sucesivos",
    skills: ["porcentajes", "proporciones"],
    difficulty: 2,
    hints: ["Subir un p % es multiplicar por (1 + p/100); bajar un p % es multiplicar por (1 − p/100).", "La variación porcentual de a a b es (b − a) / a · 100."],
    make(r) {
      const kind = r.pick(["variacion", "sucesivos", "parte"] as const);
      let name: string;
      let sig: string;
      let text: string;
      let code: string;
      let cases: Case[];
      if (kind === "variacion") {
        name = "variacion";
        sig = "antes, despues";
        text = "la variación porcentual de `antes` a `despues` (positiva si sube, negativa si baja)";
        code = "return (despues - antes) / antes * 100";
        cases = Array.from({ length: 5 }, () => {
          const a = r.int(20, 500);
          const b = r.int(10, 800);
          return { args: [a, b], expected: ((b - a) / a) * 100 };
        });
      } else if (kind === "sucesivos") {
        name = "precio_final";
        sig = "precio, subida, bajada";
        text = "el precio después de subirlo un `subida` % y, sobre ese nuevo precio, bajarlo un `bajada` %";
        code = "return precio * (1 + subida / 100) * (1 - bajada / 100)";
        cases = Array.from({ length: 5 }, () => {
          const p = r.int(10, 400);
          const s = r.int(1, 60);
          const b = r.int(1, 60);
          return { args: [p, s, b], expected: p * (1 + s / 100) * (1 - b / 100) };
        });
      } else {
        name = "porcentaje";
        sig = "parte, total";
        text = "qué porcentaje del `total` representa `parte`";
        code = "return parte / total * 100";
        cases = Array.from({ length: 5 }, () => {
          const t = r.int(20, 900);
          const p = r.int(0, t);
          return { args: [p, t], expected: (p / t) * 100 };
        });
      }
      return {
        prompt: [`Escribe \`${name}(${sig})\` que devuelva ${text}, sin redondear.`, "", `Por ejemplo, \`${callText(name, cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`, ...(kind === "sucesivos" ? ["", "Fíjate en que subir y luego bajar el mismo porcentaje **no** deja el precio igual."] : [])],
        starter: py`def ${name}(${sig}):
    pass
`,
        solution: py`def ${name}(${sig}):
    ${code}
`,
        tests: fnTests(name, cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-centro",
    mission: "e-centro",
    title: "Medidas de centro a mano",
    skills: ["tendencia-central"],
    difficulty: 2,
    hints: ["Para la mediana ordena primero con sorted(). Con n impar es el dato central; con n par, la media de los dos centrales.", "Para la media ponderada: suma de valor × peso, dividida entre la suma de los pesos."],
    make(r) {
      const kind = r.pick(["mediana", "ponderada", "moda"] as const);
      if (kind === "mediana") {
        const med = (xs: number[]) => {
          const s = [...xs].sort((a, b) => a - b);
          const m = Math.floor(s.length / 2);
          return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
        };
        const cases = Array.from({ length: 6 }, (_, i) => {
          const xs = Array.from({ length: i === 5 ? 1 : r.int(4, 11) }, () => r.int(0, 100));
          return { args: [xs], expected: med(xs) };
        });
        return {
          prompt: ["Escribe `mediana(datos)` que devuelva la mediana de una lista de números (desordenada), sin usar `statistics` ni `numpy`.", "", `Por ejemplo, \`${callText("mediana", cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
          starter: py`def mediana(datos):
    pass
`,
          solution: py`def mediana(datos):
    s = sorted(datos)
    n = len(s)
    m = n // 2
    if n % 2 == 1:
        return s[m]
    return (s[m - 1] + s[m]) / 2
`,
          tests:
            fnTests("mediana", cases) +
            forbid(["median"], "la mediana") +
            py`
def test_coincide_con_statistics():
    """Coincide con statistics.median"""
    import statistics
    for datos in ${lit(cases.map((c) => c.args[0]))}:
        r, _ = t.call("mediana", list(datos))
        assert approx(r, statistics.median(datos), 1e-12), f"Con {datos} statistics.median da {statistics.median(datos)}, pero tu función da {r}."
`,
        };
      }
      if (kind === "ponderada") {
        const cases = Array.from({ length: 5 }, () => {
          const n = r.int(2, 6);
          const v = Array.from({ length: n }, () => r.int(0, 10));
          const w = Array.from({ length: n }, () => r.int(1, 5));
          return { args: [v, w], expected: sum(v.map((x, i) => x * w[i])) / sum(w) };
        });
        return {
          prompt: ["Una nota final se calcula con pesos distintos para cada examen. Escribe `media_ponderada(valores, pesos)` que devuelva Σ valor·peso / Σ peso.", "", `Por ejemplo, \`${callText("media_ponderada", cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
          starter: py`def media_ponderada(valores, pesos):
    pass
`,
          solution: py`def media_ponderada(valores, pesos):
    total = sum(v * p for v, p in zip(valores, pesos))
    return total / sum(pesos)
`,
          tests: fnTests("media_ponderada", cases, { tol: 1e-12 }),
        };
      }
      // Moda: data built so that exactly one value is the most frequent.
      const cases = Array.from({ length: 5 }, () => {
        const vals = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], r.int(3, 5));
        const counts = vals.map((_, i) => (i === 0 ? r.int(3, 5) : r.int(1, 2)));
        const xs = r.shuffle(vals.flatMap((v, i) => Array(counts[i]).fill(v)));
        return { args: [xs], expected: vals[0] };
      });
      return {
        prompt: ["Escribe `moda(datos)` que devuelva el valor que más se repite en la lista (en estas listas siempre hay uno solo), sin usar `statistics` ni `collections`.", "", `Por ejemplo, \`${callText("moda", cases[0].args)}\` devuelve \`${cases[0].expected}\`.`],
        starter: py`def moda(datos):
    pass
`,
        solution: py`def moda(datos):
    conteo = {}
    for x in datos:
        conteo[x] = conteo.get(x, 0) + 1
    return max(conteo, key=conteo.get)
`,
        tests: fnTests("moda", cases) + forbid(["mode", "multimode", "Counter"], "la moda"),
      };
    },
  },
  {
    id: "g-dispersion",
    mission: "e-dispersion",
    title: "Varianza y desviación típica a mano",
    skills: ["dispersion", "varianza"],
    difficulty: 3,
    hints: ["Primero la media; después la suma de (x − media)² para todos los datos.", "Divide entre n para la varianza de una población y entre n − 1 para la de una muestra; la desviación típica es su raíz cuadrada."],
    make(r) {
      const kinds = [
        { name: "varianza_muestral", text: "la varianza **muestral** (divide entre n − 1)", f: (xs: number[]) => { const m = mean(xs); return sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1); }, code: "return sum((x - m) ** 2 for x in datos) / (len(datos) - 1)", lib: "statistics.variance" },
        { name: "varianza_poblacional", text: "la varianza **poblacional** (divide entre n)", f: (xs: number[]) => { const m = mean(xs); return sum(xs.map((x) => (x - m) ** 2)) / xs.length; }, code: "return sum((x - m) ** 2 for x in datos) / len(datos)", lib: "statistics.pvariance" },
        { name: "desviacion_muestral", text: "la desviación típica **muestral** (raíz de la varianza que divide entre n − 1)", f: (xs: number[]) => { const m = mean(xs); return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1)); }, code: "return math.sqrt(sum((x - m) ** 2 for x in datos) / (len(datos) - 1))", lib: "statistics.stdev" },
        { name: "desviacion_poblacional", text: "la desviación típica **poblacional** (raíz de la varianza que divide entre n)", f: (xs: number[]) => { const m = mean(xs); return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / xs.length); }, code: "return math.sqrt(sum((x - m) ** 2 for x in datos) / len(datos))", lib: "statistics.pstdev" },
      ];
      const k = r.pick(kinds);
      const cases = Array.from({ length: 5 }, () => {
        const xs = Array.from({ length: r.int(3, 10) }, () => r.int(0, 50));
        return { args: [xs], expected: k.f(xs) };
      });
      return {
        prompt: [`Escribe \`${k.name}(datos)\` que devuelva ${k.text} de una lista de números, sin usar \`statistics\` ni \`numpy\`.`, "", `Por ejemplo, \`${callText(k.name, cases[0].args)}\` devuelve ${eq(cases[0].expected)}.`],
        starter: py`import math


def ${k.name}(datos):
    m = sum(datos) / len(datos)
    pass
`,
        solution: py`import math


def ${k.name}(datos):
    m = sum(datos) / len(datos)
    ${k.code}
`,
        tests:
          fnTests(k.name, cases, { tol: 1e-9 }) +
          forbid(["variance", "pvariance", "stdev", "pstdev", "var", "std"], "la dispersión") +
          py`
def test_coincide_con_statistics():
    """Coincide con ${k.lib}"""
    import statistics
    for datos in ${lit(cases.map((c) => c.args[0]))}:
        r, _ = t.call(${lit(k.name)}, list(datos))
        ref = ${k.lib}(datos)
        assert approx(r, ref, 1e-9), f"Con {datos}, ${k.lib} da {ref}, pero tu función da {r}."
`,
      };
    },
  },
  {
    id: "g-posicion",
    mission: "e-posicion",
    title: "Puntuación z y rango percentil",
    skills: ["cuantiles", "puntuaciones-z"],
    difficulty: 3,
    hints: ["z = (x − media) / desviación típica: cuántas desviaciones se aleja x de la media.", "El rango percentil cuenta qué porcentaje de los datos es menor o igual que x."],
    make(r) {
      const kind = r.pick(["z", "percentil"] as const);
      if (kind === "z") {
        const cases = Array.from({ length: 5 }, () => {
          let xs: number[];
          do xs = Array.from({ length: r.int(4, 10) }, () => r.int(40, 100));
          while (Math.min(...xs) === Math.max(...xs));
          const x = r.int(30, 110);
          const m = mean(xs);
          const sd = Math.sqrt(sum(xs.map((v) => (v - m) ** 2)) / (xs.length - 1));
          return { args: [x, xs], expected: (x - m) / sd };
        });
        return {
          prompt: ["Escribe `puntuacion_z(x, datos)` que devuelva la puntuación z de `x` respecto a los datos, usando la media y la desviación típica **muestral** (n − 1) de los datos.", "", `Por ejemplo, \`${callText("puntuacion_z", cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
          starter: py`import math


def puntuacion_z(x, datos):
    pass
`,
          solution: py`import math


def puntuacion_z(x, datos):
    n = len(datos)
    m = sum(datos) / n
    s = math.sqrt(sum((v - m) ** 2 for v in datos) / (n - 1))
    return (x - m) / s
`,
          tests: fnTests("puntuacion_z", cases, { tol: 1e-9 }),
        };
      }
      const cases = Array.from({ length: 5 }, () => {
        const xs = Array.from({ length: r.int(5, 12) }, () => r.int(0, 30));
        const x = r.next() < 0.6 ? r.pick(xs) : r.int(0, 30);
        return { args: [x, xs], expected: (xs.filter((v) => v <= x).length / xs.length) * 100 };
      });
      return {
        prompt: ["Escribe `rango_percentil(x, datos)` que devuelva el porcentaje de datos **menores o iguales** que `x` (un número de 0 a 100).", "", `Por ejemplo, \`${callText("rango_percentil", cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
        starter: py`def rango_percentil(x, datos):
    pass
`,
        solution: py`def rango_percentil(x, datos):
    menores = sum(1 for v in datos if v <= x)
    return menores / len(datos) * 100
`,
        tests: fnTests("rango_percentil", cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-conteo",
    mission: "p-conteo",
    title: "Contar sin enumerar",
    skills: ["conteo", "combinatoria"],
    difficulty: 3,
    hints: ["¿Importa el orden? Si importa, son variaciones n!/(n−k)!; si no, combinaciones n!/(k!(n−k)!).", "¿Se pueden repetir elementos? Con repetición y orden, son n^k posibilidades."],
    make(r) {
      const kinds = [
        { text: "De un grupo de `n` personas se elige un **comité** de `k` (no hay cargos: el orden no importa). ¿Cuántos comités distintos hay?", f: (n: number, k: number) => comb(n, k), code: "math.comb(n, k)", lib: "math.comb(n, k)" },
        { text: "En una carrera con `n` participantes se reparten `k` medallas distintas (oro, plata…). ¿De cuántas formas puede quedar el podio?", f: (n: number, k: number) => comb(n, k) * fact(k), code: "math.perm(n, k)", lib: "math.perm(n, k)" },
        { text: "Un código tiene `k` posiciones y cada una puede ser cualquiera de `n` símbolos (se pueden repetir). ¿Cuántos códigos hay?", f: (n: number, k: number) => n ** k, code: "n ** k", lib: "n ** k" },
        { text: "De `n` personas se elige un comité de `k` en el que **una persona concreta tiene que estar**. ¿Cuántos comités hay?", f: (n: number, k: number) => comb(n - 1, k - 1), code: "math.comb(n - 1, k - 1)", lib: "math.comb(n - 1, k - 1)" },
      ];
      const kd = r.pick(kinds);
      const cases = Array.from({ length: 5 }, () => {
        const n = r.int(4, 15);
        const k = r.int(1, Math.min(n, 6));
        return { args: [n, k], expected: kd.f(n, k) };
      });
      return {
        prompt: [kd.text, "", `Escribe \`formas(n, k)\` que devuelva ese número. Puedes usar el módulo \`math\`.`, "", `Por ejemplo, \`${callText("formas", cases[0].args)}\` devuelve \`${cases[0].expected}\`.`],
        starter: py`import math


def formas(n, k):
    pass
`,
        solution: py`import math


def formas(n, k):
    return ${kd.code}
`,
        tests:
          fnTests("formas", cases) +
          py`
def test_formula():
    """Coincide con la fórmula para otros n y k"""
    import math
    for n, k in ${lit(Array.from({ length: 6 }, () => { const n = r.int(4, 20); return [n, r.int(1, Math.min(n, 7))]; }))}:
        r, _ = t.call("formas", n, k)
        esperado = ${kd.lib}
        assert r == esperado, f"formas({n}, {k}) debería ser {esperado}, pero devolvió {r!r}."
`,
      };
    },
  },
  {
    id: "g-bayes",
    mission: "p-bayes",
    title: "Valores predictivos de una prueba",
    skills: ["bayes", "diagnostico"],
    difficulty: 3,
    hints: ["Imagina 1 000 personas: cuántas están enfermas (prevalencia), cuántas de ellas dan positivo (sensibilidad) y cuántas sanas dan positivo (1 − especificidad).", "VPP = verdaderos positivos / todos los positivos. VPN = verdaderos negativos / todos los negativos."],
    make(r) {
      const kind = r.pick(["vpp", "vpn"] as const);
      const f = (p: number, se: number, es: number) => (kind === "vpp" ? (se * p) / (se * p + (1 - es) * (1 - p)) : (es * (1 - p)) / (es * (1 - p) + (1 - se) * p));
      const cases = Array.from({ length: 5 }, () => {
        const p = r.pick([0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.3]);
        const se = r.int(70, 99) / 100;
        const es = r.int(70, 99) / 100;
        return { args: [p, se, es], expected: f(p, se, es) };
      });
      const name = kind;
      const what = kind === "vpp" ? "el **valor predictivo positivo**: la probabilidad de estar enfermo si la prueba da positivo" : "el **valor predictivo negativo**: la probabilidad de estar sano si la prueba da negativo";
      return {
        prompt: [`Escribe \`${name}(prevalencia, sensibilidad, especificidad)\` (las tres como proporciones entre 0 y 1) que devuelva ${what}.`, "", `Por ejemplo, \`${callText(name, cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
        starter: py`def ${name}(prevalencia, sensibilidad, especificidad):
    pass
`,
        solution:
          kind === "vpp"
            ? py`def vpp(prevalencia, sensibilidad, especificidad):
    verdaderos_pos = sensibilidad * prevalencia
    falsos_pos = (1 - especificidad) * (1 - prevalencia)
    return verdaderos_pos / (verdaderos_pos + falsos_pos)
`
            : py`def vpn(prevalencia, sensibilidad, especificidad):
    verdaderos_neg = especificidad * (1 - prevalencia)
    falsos_neg = (1 - sensibilidad) * prevalencia
    return verdaderos_neg / (verdaderos_neg + falsos_neg)
`,
        tests: fnTests(name, cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-binomial",
    mission: "d-discretas",
    title: "Probabilidades binomiales",
    skills: ["distribuciones", "binomial"],
    difficulty: 3,
    hints: ["P(X = k) = C(n, k) · pᵏ · (1 − p)ⁿ⁻ᵏ, con C(n, k) = math.comb(n, k).", "Para P(X ≤ k) suma P(X = i) para i de 0 a k; para P(X ≥ k), de k a n."],
    make(r) {
      const kinds = [
        { text: "P(X = k)", f: (n: number, p: number, k: number) => pmf(n, p, k), code: "return math.comb(n, k) * p ** k * (1 - p) ** (n - k)" },
        { text: "P(X ≤ k)", f: (n: number, p: number, k: number) => sum(Array.from({ length: k + 1 }, (_, i) => pmf(n, p, i))), code: "return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(0, k + 1))" },
        { text: "P(X ≥ k)", f: (n: number, p: number, k: number) => sum(Array.from({ length: n - k + 1 }, (_, i) => pmf(n, p, k + i))), code: "return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k, n + 1))" },
      ];
      const kd = r.pick(kinds);
      const cases = Array.from({ length: 5 }, () => {
        const n = r.int(3, 25);
        const p = r.int(5, 95) / 100;
        const k = r.int(0, n);
        return { args: [n, p, k], expected: kd.f(n, p, k) };
      });
      return {
        prompt: [`X sigue una distribución binomial con \`n\` ensayos y probabilidad de éxito \`p\`. Escribe \`prob(n, p, k)\` que devuelva ${kd.text}, sin \`scipy\`.`, "", `Por ejemplo, \`${callText("prob", cases[0].args)}\` devuelve ${eq(cases[0].expected as number, 8)}.`],
        starter: py`import math


def prob(n, p, k):
    pass
`,
        solution: py`import math


def prob(n, p, k):
    ${kd.code}
`,
        tests: fnTests("prob", cases, { tol: 1e-9 }) + forbid(["pmf", "cdf", "sf"], "la probabilidad"),
      };
    },
  },
  {
    id: "g-normal",
    mission: "d-normal",
    title: "Probabilidades con la normal",
    skills: ["distribuciones", "normal"],
    difficulty: 3,
    hints: ["statistics.NormalDist(media, desviacion) crea la distribución; su método cdf(x) da P(X ≤ x).", "P(a < X < b) = cdf(b) − cdf(a) y P(X > x) = 1 − cdf(x)."],
    make(r) {
      const kinds = [
        { text: "P(X < x)", args: (m: number, s: number) => [m + s * r.int(-25, 25) / 10], f: (m: number, s: number, x: number) => phi((x - m) / s), code: "return NormalDist(media, desviacion).cdf(x)", sig: "x" },
        { text: "P(X > x)", args: (m: number, s: number) => [m + s * r.int(-25, 25) / 10], f: (m: number, s: number, x: number) => 1 - phi((x - m) / s), code: "return 1 - NormalDist(media, desviacion).cdf(x)", sig: "x" },
        { text: "P(a < X < b)", args: (m: number, s: number) => { const a = r.int(-25, 15) / 10; return [m + s * a, m + s * (a + r.int(2, 15) / 10)]; }, f: (m: number, s: number, a: number, b: number) => phi((b - m) / s) - phi((a - m) / s), code: "d = NormalDist(media, desviacion)\n    return d.cdf(b) - d.cdf(a)", sig: "a, b" },
      ];
      const kd = r.pick(kinds);
      const contexts = [
        { what: "la estatura (cm) de un grupo", m: [160, 180], s: [5, 10] },
        { what: "la duración (horas) de una batería", m: [20, 40], s: [2, 5] },
        { what: "la nota de un examen", m: [55, 75], s: [8, 15] },
      ];
      const ctx = r.pick(contexts);
      const cases = Array.from({ length: 5 }, () => {
        const m = r.int(ctx.m[0], ctx.m[1]);
        const s = r.int(ctx.s[0], ctx.s[1]);
        const xs = kd.args(m, s).map((v) => Number(v.toFixed(6)));
        return { args: [m, s, ...xs], expected: (kd.f as (...a: number[]) => number)(m, s, ...xs) };
      });
      const ex = cases[0];
      const shown = (ex.expected as number).toFixed(4);
      return {
        prompt: [`Supón que ${ctx.what} sigue una normal de media \`media\` y desviación típica \`desviacion\`. Escribe \`prob(media, desviacion, ${kd.sig})\` que devuelva ${kd.text}. Usa \`statistics.NormalDist\`.`, "", `Por ejemplo, \`${callText("prob", ex.args)}\` devuelve aproximadamente \`${shown}\`.`],
        starter: py`from statistics import NormalDist


def prob(media, desviacion, ${kd.sig}):
    pass
`,
        solution: py`from statistics import NormalDist


def prob(media, desviacion, ${kd.sig}):
    ${kd.code}
`,
        tests:
          fnTests("prob", cases, { tol: 1e-7 }) +
          py`
def test_ejemplo_redondeado():
    """El valor del enunciado está bien redondeado"""
    r, _ = t.call("prob", *${lit(ex.args)})
    assert f"{r:.4f}" == ${lit(shown)}, f"Redondeado a 4 decimales debería dar ${shown}, pero da {r:.4f}."
`,
      };
    },
  },
  {
    id: "g-intervalo",
    mission: "i-intervalos",
    title: "Intervalos de confianza",
    skills: ["intervalos-confianza"],
    difficulty: 3,
    hints: ["Un intervalo es estimación ± z · error estándar.", "Para una proporción, el error estándar es √(p̂(1 − p̂)/n); para una media con σ conocida, σ/√n."],
    make(r) {
      const levels = [
        { level: 90, z: 1.645 },
        { level: 95, z: 1.96 },
        { level: 99, z: 2.576 },
      ];
      const L = r.pick(levels);
      const kind = r.pick(["proporcion", "media"] as const);
      if (kind === "proporcion") {
        const cases = Array.from({ length: 5 }, () => {
          const n = r.int(30, 2000);
          const x = r.int(Math.ceil(n * 0.05), Math.floor(n * 0.95));
          const p = x / n;
          const e = L.z * Math.sqrt((p * (1 - p)) / n);
          return { args: [x, n], expected: [p - e, p + e] };
        });
        const [lo, hi] = cases[0].expected as number[];
        return {
          prompt: [`En una encuesta, \`exitos\` de \`n\` personas responden «sí». Escribe \`intervalo(exitos, n)\` que devuelva una tupla \`(inferior, superior)\` con el intervalo de confianza del ${L.level} % para la proporción (método de Wald, z = ${L.z}).`, "", `Por ejemplo, \`${callText("intervalo", cases[0].args)}\` devuelve aproximadamente \`(${lo.toFixed(4)}, ${hi.toFixed(4)})\`.`],
          starter: py`import math


def intervalo(exitos, n):
    p = exitos / n
    pass
`,
          solution: py`import math


def intervalo(exitos, n):
    p = exitos / n
    error = ${L.z} * math.sqrt(p * (1 - p) / n)
    return (p - error, p + error)
`,
          tests: fnTests("intervalo", cases, { tol: 1e-9 }),
        };
      }
      const cases = Array.from({ length: 5 }, () => {
        const n = r.int(10, 400);
        const m = r.int(500, 3000) / 10;
        const s = r.int(20, 300) / 10;
        const e = (L.z * s) / Math.sqrt(n);
        return { args: [m, s, n], expected: [m - e, m + e] };
      });
      const [lo, hi] = cases[0].expected as number[];
      return {
        prompt: [`Escribe \`intervalo(media, sigma, n)\` que devuelva una tupla \`(inferior, superior)\` con el intervalo de confianza del ${L.level} % para la media de la población, conociendo su desviación típica \`sigma\` (z = ${L.z}).`, "", `Por ejemplo, \`${callText("intervalo", cases[0].args)}\` devuelve aproximadamente \`(${lo.toFixed(4)}, ${hi.toFixed(4)})\`.`],
        starter: py`import math


def intervalo(media, sigma, n):
    pass
`,
        solution: py`import math


def intervalo(media, sigma, n):
    error = ${L.z} * sigma / math.sqrt(n)
    return (media - error, media + error)
`,
        tests: fnTests("intervalo", cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-correlacion",
    mission: "r-correlacion",
    title: "Correlación de Pearson a mano",
    skills: ["correlacion"],
    difficulty: 3,
    hints: ["r = Σ(x − x̄)(y − ȳ) / √(Σ(x − x̄)² · Σ(y − ȳ)²).", "Calcula primero las dos medias y recorre las parejas con zip(x, y)."],
    make(r) {
      const cases = Array.from({ length: 5 }, () => {
        const n = r.int(4, 12);
        const slope = r.pick([-3, -2, -1, -0.5, 0.5, 1, 2, 3]);
        let x: number[];
        let y: number[];
        do {
          x = Array.from({ length: n }, () => r.int(0, 50));
          y = x.map((v) => Math.round(slope * v + r.int(-30, 30)));
        } while (Math.min(...x) === Math.max(...x) || Math.min(...y) === Math.max(...y));
        const mx = mean(x);
        const my = mean(y);
        const sxy = sum(x.map((v, i) => (v - mx) * (y[i] - my)));
        const sxx = sum(x.map((v) => (v - mx) ** 2));
        const syy = sum(y.map((v) => (v - my) ** 2));
        return { args: [x, y], expected: sxy / Math.sqrt(sxx * syy) };
      });
      return {
        prompt: ["Escribe `pearson(x, y)` que devuelva el coeficiente de correlación de Pearson entre dos listas de la misma longitud, sin usar `statistics`, `numpy` ni `scipy`.", "", `Por ejemplo, \`${callText("pearson", cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
        starter: py`import math


def pearson(x, y):
    mx = sum(x) / len(x)
    my = sum(y) / len(y)
    pass
`,
        solution: py`import math


def pearson(x, y):
    mx = sum(x) / len(x)
    my = sum(y) / len(y)
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    sxx = sum((a - mx) ** 2 for a in x)
    syy = sum((b - my) ** 2 for b in y)
    return sxy / math.sqrt(sxx * syy)
`,
        tests:
          fnTests("pearson", cases, { tol: 1e-9 }) +
          forbid(["correlation", "corrcoef", "pearsonr", "corr"], "la correlación") +
          py`
def test_coincide_con_statistics():
    """Coincide con statistics.correlation"""
    import statistics
    for x, y in ${lit(cases.map((c) => c.args))}:
        r, _ = t.call("pearson", list(x), list(y))
        ref = statistics.correlation(x, y)
        assert approx(r, ref, 1e-9), f"statistics.correlation da {ref}, pero tu función da {r}."
`,
      };
    },
  },
  {
    id: "g-regresion",
    mission: "r-lineal",
    title: "La recta de mínimos cuadrados",
    skills: ["regresion"],
    difficulty: 3,
    hints: ["Pendiente b = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)².", "La recta pasa por el punto de medias: el intercepto es ȳ − b·x̄."],
    make(r) {
      const cases = Array.from({ length: 5 }, () => {
        const n = r.int(4, 12);
        const b = r.int(-40, 40) / 10;
        const a = r.int(-20, 50);
        let x: number[];
        do x = Array.from({ length: n }, () => r.int(0, 30));
        while (Math.min(...x) === Math.max(...x));
        const y = x.map((v) => Math.round((a + b * v + r.int(-8, 8)) * 10) / 10);
        const mx = mean(x);
        const my = mean(y);
        const slope = sum(x.map((v, i) => (v - mx) * (y[i] - my))) / sum(x.map((v) => (v - mx) ** 2));
        return { args: [x, y], expected: [slope, my - slope * mx] };
      });
      const [b0, a0] = cases[0].expected as number[];
      return {
        prompt: ["Escribe `recta(x, y)` que devuelva una tupla `(pendiente, intercepto)` con la recta de mínimos cuadrados que predice `y` a partir de `x`, sin `statistics`, `numpy` ni `scipy`.", "", `Por ejemplo, \`${callText("recta", cases[0].args)}\` devuelve \`(${show(b0)}, ${show(a0)})\`.`],
        starter: py`def recta(x, y):
    mx = sum(x) / len(x)
    my = sum(y) / len(y)
    pass
`,
        solution: py`def recta(x, y):
    mx = sum(x) / len(x)
    my = sum(y) / len(y)
    pendiente = sum((a - mx) * (b - my) for a, b in zip(x, y)) / sum((a - mx) ** 2 for a in x)
    return (pendiente, my - pendiente * mx)
`,
        tests:
          fnTests("recta", cases, { tol: 1e-9 }) +
          forbid(["linear_regression", "polyfit", "linregress", "lstsq"], "la recta") +
          py`
def test_coincide_con_statistics():
    """Coincide con statistics.linear_regression"""
    import statistics
    for x, y in ${lit(cases.map((c) => c.args))}:
        r, _ = t.call("recta", list(x), list(y))
        ref = statistics.linear_regression(x, y)
        assert approx(r[0], ref.slope, 1e-9) and approx(r[1], ref.intercept, 1e-9), f"statistics.linear_regression da pendiente {ref.slope} e intercepto {ref.intercept}, pero tu función da {r}."
`,
      };
    },
  },
  {
    id: "g-riesgos",
    mission: "cl-riesgos",
    title: "Medidas de efecto en una tabla 2×2",
    skills: ["clinica", "riesgo-relativo", "odds-ratio", "nnt"],
    difficulty: 3,
    hints: ["Riesgo en tratados = a / (a + b); riesgo en controles = c / (c + d).", "RR divide los riesgos; OR divide las odds (a/b entre c/d); la diferencia de riesgos (RAR) los resta, y NNT = 1 / |RAR|."],
    make(r) {
      const kinds = [
        { name: "riesgo_relativo", text: "el **riesgo relativo** (riesgo en tratados / riesgo en controles)", f: (a: number, b: number, c: number, d: number) => a / (a + b) / (c / (c + d)), code: "return (a / (a + b)) / (c / (c + d))" },
        { name: "odds_ratio", text: "la **odds ratio** ((a/b) / (c/d))", f: (a: number, b: number, c: number, d: number) => a / b / (c / d), code: "return (a / b) / (c / d)" },
        { name: "reduccion_absoluta", text: "la **reducción absoluta del riesgo** (riesgo en controles − riesgo en tratados)", f: (a: number, b: number, c: number, d: number) => c / (c + d) - a / (a + b), code: "return c / (c + d) - a / (a + b)" },
        { name: "nnt", text: "el **número necesario a tratar**, 1 / |riesgo en controles − riesgo en tratados|, sin redondear", f: (a: number, b: number, c: number, d: number) => 1 / Math.abs(c / (c + d) - a / (a + b)), code: "return 1 / abs(c / (c + d) - a / (a + b))" },
      ];
      const kd = r.pick(kinds);
      const cases = Array.from({ length: 5 }, () => {
        let a: number, b: number, c: number, d: number;
        do {
          a = r.int(1, 60);
          b = r.int(20, 300);
          c = r.int(1, 90);
          d = r.int(20, 300);
        } while (a * d === b * c);
        return { args: [a, b, c, d], expected: kd.f(a, b, c, d) };
      });
      return {
        prompt: [
          "En un ensayo, `a` tratados tuvieron el evento y `b` no; en el grupo control, `c` lo tuvieron y `d` no.",
          "",
          "| | Evento | Sin evento |",
          "|---|---|---|",
          "| Tratados | a | b |",
          "| Control | c | d |",
          "",
          `Escribe \`${kd.name}(a, b, c, d)\` que devuelva ${kd.text}.`,
          "",
          `Por ejemplo, \`${callText(kd.name, cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`,
        ],
        starter: py`def ${kd.name}(a, b, c, d):
    pass
`,
        solution: py`def ${kd.name}(a, b, c, d):
    ${kd.code}
`,
        tests: fnTests(kd.name, cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-esperanza",
    mission: "p-variables-aleatorias",
    title: "Esperanza y varianza de una variable discreta",
    skills: ["variables-aleatorias", "esperanza"],
    difficulty: 3,
    hints: ["E[X] = Σ x · P(X = x).", "Var[X] = Σ (x − E[X])² · P(X = x), o también E[X²] − E[X]²."],
    make(r) {
      const kind = r.pick(["esperanza", "varianza"] as const);
      const cases = Array.from({ length: 5 }, () => {
        const vals = r.sample([-5, -2, -1, 0, 1, 2, 3, 4, 5, 10, 20, 50], r.int(2, 5)).sort((a, b) => a - b);
        // Probabilities with denominator 20 that add up to exactly 1.
        const cuts = r.sample(Array.from({ length: 19 }, (_, i) => i + 1), vals.length - 1).sort((a, b) => a - b);
        const ws = [...cuts, 20].map((c, i) => c - (i ? cuts[i - 1] : 0));
        const ps = ws.map((w) => w / 20);
        const dist = vals.map((v, i) => [v, ps[i]] as [number, number]);
        const e = sum(vals.map((v, i) => v * ps[i]));
        const v = sum(vals.map((x, i) => (x - e) ** 2 * ps[i]));
        return { dist, expected: kind === "esperanza" ? e : v };
      });
      const pyDict = (d: [number, number][]) => `{${d.map(([k, v]) => `${k}: ${v}`).join(", ")}}`;
      const name = kind;
      return {
        prompt: [`Una variable aleatoria discreta se describe con un diccionario \`{valor: probabilidad}\`. Escribe \`${name}(distribucion)\` que devuelva su ${kind === "esperanza" ? "esperanza E[X]" : "varianza Var[X]"}.`, "", `Por ejemplo, \`${name}(${pyDict(cases[0].dist)})\` devuelve ${eq(cases[0].expected)}.`],
        starter: py`def ${name}(distribucion):
    pass
`,
        solution:
          kind === "esperanza"
            ? py`def esperanza(distribucion):
    return sum(x * p for x, p in distribucion.items())
`
            : py`def varianza(distribucion):
    media = sum(x * p for x, p in distribucion.items())
    return sum((x - media) ** 2 * p for x, p in distribucion.items())
`,
        tests: fnTests(name, cases.map((c) => ({ args: [], argsPy: `[${pyDict(c.dist)}]`, expected: c.expected })), { tol: 1e-9 }),
      };
    },
  },
];

function fact(n: number) {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

function pmf(n: number, p: number, k: number) {
  return comb(n, k) * p ** k * (1 - p) ** (n - k);
}

/** Standard normal CDF via erf: Taylor series for |z| ≤ 3 (all drill values), accurate to ~1e-13. */
function phi(z: number) {
  const x = z / Math.SQRT2;
  let term = x;
  let s = x;
  for (let n = 1; n < 200; n++) {
    term *= (-x * x) / n;
    const add = term / (2 * n + 1);
    s += add;
    if (Math.abs(add) < 1e-17) break;
  }
  return 0.5 * (1 + (2 / Math.sqrt(Math.PI)) * s);
}
