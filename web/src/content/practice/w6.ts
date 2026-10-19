// Practice drills for World 6 (machine learning metrics and methods written by hand).
import { py, type Drill } from "../types";
import { callText, eq, fnTests, lit, type Case } from "./kit";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => sum(xs) / xs.length;

/** Labels and predictions with at least one of each kind of outcome (no division by zero). */
function labelsAndPreds(r: { int(a: number, b: number): number; next(): number }) {
  for (;;) {
    const n = r.int(8, 20);
    const y = Array.from({ length: n }, () => (r.next() < 0.45 ? 1 : 0));
    const p = y.map((v) => (r.next() < 0.75 ? v : 1 - v));
    const vp = y.filter((v, i) => v === 1 && p[i] === 1).length;
    const vn = y.filter((v, i) => v === 0 && p[i] === 0).length;
    const fp = y.filter((v, i) => v === 0 && p[i] === 1).length;
    const fn = y.filter((v, i) => v === 1 && p[i] === 0).length;
    if (vp && vn && fp && fn) return { y, p, vp, vn, fp, fn };
  }
}

export const DRILLS_W6: Drill[] = [
  {
    id: "g-metricas",
    mission: "ml-metricas",
    title: "Métricas de clasificación a mano",
    skills: ["metricas"],
    difficulty: 2,
    hints: ["Cuenta primero VP, FP, FN y VN recorriendo las parejas con zip(y_real, y_pred).", "Precisión = VP/(VP+FP); recall = VP/(VP+FN); especificidad = VN/(VN+FP); F1 = 2·P·R/(P+R)."],
    make(r) {
      const kinds = [
        { name: "precision", text: "la **precisión**: de los casos predichos como positivos, qué fracción lo era", f: (c: ReturnType<typeof labelsAndPreds>) => c.vp / (c.vp + c.fp), code: "return vp / (vp + fp)" },
        { name: "recall", text: "el **recall** (sensibilidad): de los positivos reales, qué fracción se detectó", f: (c: ReturnType<typeof labelsAndPreds>) => c.vp / (c.vp + c.fn), code: "return vp / (vp + fn)" },
        { name: "especificidad", text: "la **especificidad**: de los negativos reales, qué fracción se predijo como negativa", f: (c: ReturnType<typeof labelsAndPreds>) => c.vn / (c.vn + c.fp), code: "return vn / (vn + fp)" },
        { name: "f1", text: "el **F1**: la media armónica de precisión y recall", f: (c: ReturnType<typeof labelsAndPreds>) => { const p = c.vp / (c.vp + c.fp); const rc = c.vp / (c.vp + c.fn); return (2 * p * rc) / (p + rc); }, code: "p = vp / (vp + fp)\n    r = vp / (vp + fn)\n    return 2 * p * r / (p + r)" },
        { name: "exactitud", text: "la **exactitud**: la fracción de aciertos", f: (c: ReturnType<typeof labelsAndPreds>) => (c.vp + c.vn) / c.y.length, code: "return (vp + vn) / len(y_real)" },
      ];
      const kd = r.pick(kinds);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const c = labelsAndPreds(r);
        return { args: [c.y, c.p], expected: kd.f(c) };
      });
      return {
        prompt: [`Escribe \`${kd.name}(y_real, y_pred)\` (dos listas de 0 y 1) que devuelva ${kd.text}, sin usar scikit-learn.`, "", `Por ejemplo, \`${callText(kd.name, cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
        starter: py`def ${kd.name}(y_real, y_pred):
    pass
`,
        solution: py`def ${kd.name}(y_real, y_pred):
    vp = sum(1 for a, b in zip(y_real, y_pred) if a == 1 and b == 1)
    vn = sum(1 for a, b in zip(y_real, y_pred) if a == 0 and b == 0)
    fp = sum(1 for a, b in zip(y_real, y_pred) if a == 0 and b == 1)
    fn = sum(1 for a, b in zip(y_real, y_pred) if a == 1 and b == 0)
    ${kd.code}
`,
        tests: fnTests(kd.name, cases, { tol: 1e-12 }),
      };
    },
  },
  {
    id: "g-confusion-umbral",
    mission: "ml-clasificacion",
    title: "Del umbral a la matriz de confusión",
    skills: ["clasificacion", "umbral"],
    difficulty: 2,
    hints: ["Con el umbral, cada probabilidad se convierte en 1 si es mayor o igual que el umbral y en 0 si no.", "Después compara cada predicción con su etiqueta real y cuenta los cuatro casos."],
    make(r) {
      const u = r.pick([0.3, 0.4, 0.5, 0.6, 0.7]);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const n = r.int(6, 14);
        const y = Array.from({ length: n }, () => (r.next() < 0.5 ? 1 : 0));
        const p = y.map((v) => Math.min(0.99, Math.max(0.01, Math.round((v ? 0.62 : 0.38) * 100 + r.int(-35, 35)) / 100)));
        let vp = 0, fp = 0, fn = 0, vn = 0;
        y.forEach((v, i) => {
          const pred = p[i] >= u ? 1 : 0;
          if (v && pred) vp++;
          else if (!v && pred) fp++;
          else if (v && !pred) fn++;
          else vn++;
        });
        return { args: [y, p, u], expected: [vp, fp, fn, vn] };
      });
      return {
        prompt: [`Escribe \`confusion(y_real, probabilidades, umbral)\` que prediga 1 cuando la probabilidad es **mayor o igual** que el umbral y devuelva la tupla \`(VP, FP, FN, VN)\`.`, "", `Por ejemplo, \`${callText("confusion", cases[0].args)}\` devuelve \`(${(cases[0].expected as number[]).join(", ")})\`.`],
        starter: py`def confusion(y_real, probabilidades, umbral):
    return (0, 0, 0, 0)
`,
        solution: py`def confusion(y_real, probabilidades, umbral):
    vp = fp = fn = vn = 0
    for real, prob in zip(y_real, probabilidades):
        pred = 1 if prob >= umbral else 0
        if real == 1 and pred == 1:
            vp += 1
        elif real == 0 and pred == 1:
            fp += 1
        elif real == 1 and pred == 0:
            fn += 1
        else:
            vn += 1
    return (vp, fp, fn, vn)
`,
        tests: fnTests("confusion", cases),
      };
    },
  },
  {
    id: "g-metricas-regresion",
    mission: "ml-regresion",
    title: "Errores de un modelo de regresión",
    skills: ["regresion", "metricas"],
    difficulty: 2,
    hints: ["Calcula los residuos real − predicho con zip(y_real, y_pred).", "MAE = media de |residuo|; RMSE = raíz de la media de residuo²; R² = 1 − Σresiduo² / Σ(real − media)²."],
    make(r) {
      const kinds = [
        { name: "mae", text: "el **error absoluto medio** (MAE)", f: (y: number[], p: number[]) => mean(y.map((v, i) => Math.abs(v - p[i]))), code: "return sum(abs(a - b) for a, b in zip(y_real, y_pred)) / len(y_real)" },
        { name: "rmse", text: "la **raíz del error cuadrático medio** (RMSE)", f: (y: number[], p: number[]) => Math.sqrt(mean(y.map((v, i) => (v - p[i]) ** 2))), code: "return math.sqrt(sum((a - b) ** 2 for a, b in zip(y_real, y_pred)) / len(y_real))" },
        { name: "r2", text: "el **coeficiente de determinación** R²", f: (y: number[], p: number[]) => { const m = mean(y); return 1 - sum(y.map((v, i) => (v - p[i]) ** 2)) / sum(y.map((v) => (v - m) ** 2)); }, code: "media = sum(y_real) / len(y_real)\n    ss_res = sum((a - b) ** 2 for a, b in zip(y_real, y_pred))\n    ss_tot = sum((a - media) ** 2 for a in y_real)\n    return 1 - ss_res / ss_tot" },
        { name: "mape", text: "el **error porcentual absoluto medio** (MAPE, en %): la media de |real − predicho| / |real|, por 100", f: (y: number[], p: number[]) => mean(y.map((v, i) => Math.abs(v - p[i]) / Math.abs(v))) * 100, code: "return sum(abs(a - b) / abs(a) for a, b in zip(y_real, y_pred)) / len(y_real) * 100" },
      ];
      const kd = r.pick(kinds);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        let y: number[];
        do y = Array.from({ length: r.int(4, 10) }, () => r.int(10, 200));
        while (Math.min(...y) === Math.max(...y));
        const p = y.map((v) => v + r.int(-25, 25));
        return { args: [y, p], expected: kd.f(y, p) };
      });
      return {
        prompt: [`Escribe \`${kd.name}(y_real, y_pred)\` que devuelva ${kd.text}, sin usar scikit-learn.`, "", `Por ejemplo, \`${callText(kd.name, cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
        starter: py`import math


def ${kd.name}(y_real, y_pred):
    pass
`,
        solution: py`import math


def ${kd.name}(y_real, y_pred):
    ${kd.code}
`,
        tests: fnTests(kd.name, cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-escalado",
    mission: "ml-pipeline",
    title: "Escalar sin fuga de datos",
    skills: ["preprocesamiento", "data-leakage"],
    difficulty: 3,
    hints: ["Los parámetros del escalado (media, desviación, mínimo, máximo) se calculan **solo** con los datos de entrenamiento.", "Después se aplican esos mismos parámetros a los datos de prueba, aunque el resultado se salga de [0, 1] o tenga otra media."],
    make(r) {
      const kinds = [
        { text: "estandarizado: (x − media) / desviación típica, con la media y la desviación típica **poblacional** (divide entre n) del entrenamiento", f: (tr: number[], te: number[]) => { const m = mean(tr); const sd = Math.sqrt(mean(tr.map((x) => (x - m) ** 2))); return te.map((x) => (x - m) / sd); }, code: "media = sum(entrenamiento) / len(entrenamiento)\n    desv = math.sqrt(sum((x - media) ** 2 for x in entrenamiento) / len(entrenamiento))\n    return [(x - media) / desv for x in prueba]" },
        { text: "reescalado al intervalo [0, 1] con el mínimo y el máximo del entrenamiento: (x − mín) / (máx − mín)", f: (tr: number[], te: number[]) => { const lo = Math.min(...tr), hi = Math.max(...tr); return te.map((x) => (x - lo) / (hi - lo)); }, code: "minimo, maximo = min(entrenamiento), max(entrenamiento)\n    return [(x - minimo) / (maximo - minimo) for x in prueba]" },
      ];
      const kd = r.pick(kinds);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        let tr: number[];
        do tr = Array.from({ length: r.int(4, 9) }, () => r.int(0, 100));
        while (Math.min(...tr) === Math.max(...tr));
        const te = Array.from({ length: r.int(2, 5) }, () => r.int(-20, 130));
        return { args: [tr, te], expected: kd.f(tr, te) };
      });
      return {
        prompt: [`Escribe \`escalar(entrenamiento, prueba)\` que devuelva la lista \`prueba\` ${kd.text}. No uses los datos de prueba para calcular nada: eso sería **fuga de datos**.`, "", `Por ejemplo, \`${callText("escalar", cases[0].args)}\` devuelve \`${lit((cases[0].expected as number[]).map((x) => Number(x.toFixed(4))))}\` (redondeado aquí a 4 decimales).`],
        starter: py`import math


def escalar(entrenamiento, prueba):
    return prueba
`,
        solution: py`import math


def escalar(entrenamiento, prueba):
    ${kd.code}
`,
        tests: fnTests("escalar", cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-kfold",
    mission: "ml-validacion",
    title: "Repartir datos en pliegues",
    skills: ["validacion"],
    difficulty: 3,
    hints: ["Con n datos y k pliegues, los primeros n % k pliegues tienen n // k + 1 datos y el resto n // k.", "Recorre los pliegues llevando la cuenta de dónde empieza cada uno; los índices de prueba de un pliegue son consecutivos."],
    make(r) {
      const folds = (n: number, k: number) => {
        const out: number[][] = [];
        let start = 0;
        for (let i = 0; i < k; i++) {
          const size = Math.floor(n / k) + (i < n % k ? 1 : 0);
          out.push(Array.from({ length: size }, (_, j) => start + j));
          start += size;
        }
        return out;
      };
      const kind = r.pick(["todos", "uno"] as const);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const k = r.int(2, 6);
        const n = r.int(k, 23);
        if (kind === "todos") return { args: [n, k], expected: folds(n, k) };
        const i = r.int(0, k - 1);
        const test = folds(n, k)[i];
        return { args: [n, k, i], expected: [Array.from({ length: n }, (_, j) => j).filter((j) => !test.includes(j)), test] };
      });
      const text =
        kind === "todos"
          ? "`pliegues(n, k)` que devuelva la lista de los `k` grupos de índices de prueba"
          : "`particion(n, k, i)` que devuelva la tupla `(entrenamiento, prueba)` con las listas de índices del pliegue `i` (empezando en 0)";
      const name = kind === "todos" ? "pliegues" : "particion";
      return {
        prompt: [`La validación cruzada en k pliegues **sin barajar** reparte los índices 0, 1, …, n − 1 en k grupos consecutivos; si no caben exactos, los primeros grupos llevan uno más (como \`KFold\` de scikit-learn). Escribe ${text}.`, "", `Por ejemplo, \`${callText(name, cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def ${name}(${kind === "todos" ? "n, k" : "n, k, i"}):
    pass
`,
        solution:
          kind === "todos"
            ? py`def pliegues(n, k):
    grupos, inicio = [], 0
    for i in range(k):
        tam = n // k + (1 if i < n % k else 0)
        grupos.append(list(range(inicio, inicio + tam)))
        inicio += tam
    return grupos
`
            : py`def particion(n, k, i):
    inicio = 0
    for j in range(i):
        inicio += n // k + (1 if j < n % k else 0)
    tam = n // k + (1 if i < n % k else 0)
    prueba = list(range(inicio, inicio + tam))
    entrenamiento = [x for x in range(n) if x not in prueba]
    return (entrenamiento, prueba)
`,
        tests: fnTests(name, cases),
      };
    },
  },
  {
    id: "g-knn",
    mission: "ml-knn-svm",
    title: "Clasificar con k vecinos",
    skills: ["knn", "distancias"],
    difficulty: 3,
    hints: ["Calcula la distancia euclídea del punto nuevo a cada punto de entrenamiento: √((x1 − x2)² + (y1 − y2)²).", "Ordena por distancia, quédate con los k primeros y devuelve la clase más frecuente entre ellos."],
    make(r) {
      const k = r.pick([1, 3, 5]);
      const clases = r.sample(["roja", "azul", "verde", "gris"], 2);
      const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      let cases: Case[] = [];
      // Some case must answer something other than the first point's class, so a constant guess fails.
      while (cases.length < 5 || cases.every((c) => c.expected === (c.args[1] as string[])[0])) {
        if (cases.length === 5) cases = [];
        const pts = Array.from({ length: r.int(k + 3, 12) }, () => [r.int(0, 20), r.int(0, 20)]);
        const labels = pts.map((p) => (p[0] + p[1] + r.int(-6, 6) > 20 ? clases[0] : clases[1]));
        const q = [r.int(0, 20), r.int(0, 20)];
        const ds = pts.map((p) => dist(p, q)).sort((a, b) => a - b);
        // Avoid ambiguous cases: the k-th and (k+1)-th neighbours must not be at the same distance.
        if (ds[k - 1] === ds[k]) continue;
        const near = pts.map((p, i) => ({ d: dist(p, q), c: labels[i] })).sort((a, b) => a.d - b.d).slice(0, k);
        const votes = near.filter((x) => x.c === clases[0]).length;
        cases.push({ args: [pts, labels, q, k], expected: votes * 2 > k ? clases[0] : clases[1] });
      }
      return {
        prompt: [`Escribe \`knn(puntos, clases, nuevo, k)\` que clasifique el punto \`nuevo\` (una pareja [x, y]) con los \`k\` vecinos más cercanos por distancia euclídea: devuelve la clase más frecuente entre ellos. Con k impar y dos clases no hay empates.`, "", `Por ejemplo, \`${callText("knn", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`import math


def knn(puntos, clases, nuevo, k):
    return clases[0]
`,
        solution: py`import math


def knn(puntos, clases, nuevo, k):
    distancias = sorted((math.dist(p, nuevo), c) for p, c in zip(puntos, clases))
    vecinos = [c for _, c in distancias[:k]]
    return max(set(vecinos), key=vecinos.count)
`,
        tests: fnTests("knn", cases),
      };
    },
  },
  {
    id: "g-auc",
    mission: "ml-roc",
    title: "El AUC como probabilidad",
    skills: ["roc", "metricas"],
    difficulty: 3,
    hints: ["Separa las puntuaciones de los positivos y de los negativos.", "Recorre todas las parejas (positivo, negativo): suma 1 si el positivo puntúa más, 0,5 si empatan; divide entre el número de parejas."],
    make(r) {
      const cases: Case[] = Array.from({ length: 5 }, () => {
        let y: number[];
        do y = Array.from({ length: r.int(5, 12) }, () => (r.next() < 0.5 ? 1 : 0));
        while (!y.includes(0) || !y.includes(1));
        const s = y.map((v) => Math.round((v ? 0.6 : 0.4) * 20 + r.int(-6, 6)) / 20);
        const pos = s.filter((_, i) => y[i] === 1);
        const neg = s.filter((_, i) => y[i] === 0);
        let tot = 0;
        for (const a of pos) for (const b of neg) tot += a > b ? 1 : a === b ? 0.5 : 0;
        return { args: [y, s], expected: tot / (pos.length * neg.length) };
      });
      return {
        prompt: ["El AUC es la probabilidad de que un positivo elegido al azar tenga más puntuación que un negativo elegido al azar (los empates cuentan la mitad). Escribe `auc(y_real, puntuaciones)` que lo calcule comparando todas las parejas positivo–negativo.", "", `Por ejemplo, \`${callText("auc", cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
        starter: py`def auc(y_real, puntuaciones):
    return 0.5
`,
        solution: py`def auc(y_real, puntuaciones):
    pos = [s for s, y in zip(puntuaciones, y_real) if y == 1]
    neg = [s for s, y in zip(puntuaciones, y_real) if y == 0]
    total = 0
    for a in pos:
        for b in neg:
            total += 1 if a > b else 0.5 if a == b else 0
    return total / (len(pos) * len(neg))
`,
        tests: fnTests("auc", cases, { tol: 1e-12 }),
      };
    },
  },
  {
    id: "g-gradiente",
    mission: "ml-gradiente",
    title: "Pasos de descenso de gradiente",
    skills: ["optimizacion", "gradiente"],
    difficulty: 4,
    hints: ["Para la recta ŷ = w·x + b y el error cuadrático medio, las derivadas son dw = (2/n) Σ (ŷ − y)·x y db = (2/n) Σ (ŷ − y).", "En cada paso calcula las dos derivadas con los valores actuales y después actualiza a la vez: w −= tasa·dw y b −= tasa·db."],
    make(r) {
      const lr = r.pick([0.001, 0.002, 0.005, 0.01]);
      const pasos = r.int(1, 5);
      const step = (x: number[], y: number[], n: number) => {
        let w = 0;
        let b = 0;
        for (let k = 0; k < n; k++) {
          let gw = 0;
          let gb = 0;
          for (let i = 0; i < x.length; i++) {
            const e = w * x[i] + b - y[i];
            gw += e * x[i];
            gb += e;
          }
          gw = (2 / x.length) * gw;
          gb = (2 / x.length) * gb;
          w = w - lr * gw;
          b = b - lr * gb;
        }
        return [w, b];
      };
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const x = Array.from({ length: r.int(3, 7) }, () => r.int(0, 10));
        const y = x.map((v) => 2 * v + r.int(-3, 5));
        const n = r.int(1, 6);
        return { args: [x, y, n], expected: step(x, y, n) };
      });
      cases[0] = { args: [cases[0].args[0], cases[0].args[1], pasos], expected: step(cases[0].args[0] as number[], cases[0].args[1] as number[], pasos) };
      return {
        prompt: [`Ajusta la recta ŷ = w·x + b minimizando el error cuadrático medio con descenso de gradiente. Escribe \`descenso(x, y, pasos)\` que empiece en w = 0, b = 0, dé \`pasos\` pasos con tasa de aprendizaje ${lr} y devuelva la tupla \`(w, b)\`.`, "", `Por ejemplo, \`${callText("descenso", cases[0].args)}\` devuelve aproximadamente \`(${(cases[0].expected as number[]).map((v) => Number(v.toFixed(6))).join(", ")})\`.`],
        starter: py`def descenso(x, y, pasos):
    w, b = 0.0, 0.0
    return (w, b)
`,
        solution: py`def descenso(x, y, pasos):
    w, b = 0.0, 0.0
    n = len(x)
    for _ in range(pasos):
        errores = [w * xi + b - yi for xi, yi in zip(x, y)]
        dw = 2 / n * sum(e * xi for e, xi in zip(errores, x))
        db = 2 / n * sum(errores)
        w, b = w - ${lr} * dw, b - ${lr} * db
    return (w, b)
`,
        tests: fnTests("descenso", cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-brier",
    mission: "ml-calibracion",
    title: "Puntuar probabilidades",
    skills: ["calibracion", "metricas"],
    difficulty: 3,
    hints: ["Brier: media de (p − y)². Log-loss: media de −[y·log(p) + (1 − y)·log(1 − p)].", "Recorre las parejas con zip(y_real, probabilidades) y usa math.log para el logaritmo natural."],
    make(r) {
      const kind = r.pick(["brier", "log_loss"] as const);
      const f = (y: number[], p: number[]) => (kind === "brier" ? mean(y.map((v, i) => (p[i] - v) ** 2)) : mean(y.map((v, i) => -(v * Math.log(p[i]) + (1 - v) * Math.log(1 - p[i])))));
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const n = r.int(3, 9);
        const y = Array.from({ length: n }, () => (r.next() < 0.5 ? 1 : 0));
        const p = y.map((v) => Math.min(0.99, Math.max(0.01, Math.round((v ? 0.65 : 0.35) * 100 + r.int(-30, 30)) / 100)));
        return { args: [y, p], expected: f(y, p) };
      });
      const text = kind === "brier" ? "la **puntuación de Brier**: la media de (p − y)²" : "la **pérdida logarítmica** (log-loss): la media de −[y·log(p) + (1 − y)·log(1 − p)] con logaritmo natural";
      return {
        prompt: [`Escribe \`${kind}(y_real, probabilidades)\` que devuelva ${text}. Cuanto menor, mejores son las probabilidades.`, "", `Por ejemplo, \`${callText(kind, cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
        starter: py`import math


def ${kind}(y_real, probabilidades):
    pass
`,
        solution:
          kind === "brier"
            ? py`import math


def brier(y_real, probabilidades):
    return sum((p - y) ** 2 for y, p in zip(y_real, probabilidades)) / len(y_real)
`
            : py`import math


def log_loss(y_real, probabilidades):
    total = sum(-(y * math.log(p) + (1 - y) * math.log(1 - p)) for y, p in zip(y_real, probabilidades))
    return total / len(y_real)
`,
        tests: fnTests(kind, cases, { tol: 1e-9 }),
      };
    },
  },
];
