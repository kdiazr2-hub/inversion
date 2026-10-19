// Practice drills for World 7 (artificial intelligence): the pieces of neural networks, language
// models and responsible AI, written by hand in plain Python.
import { py, type Drill } from "../types";
import { callText, eq, fnTests, lit, NOMBRES, PALABRAS, type Case } from "./kit";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => sum(xs) / xs.length;
const vec = (r: { int(a: number, b: number): number }, n: number, lo = -30, hi = 30) => Array.from({ length: n }, () => r.int(lo, hi) / 10);

export const DRILLS_W7: Drill[] = [
  {
    id: "g-activaciones",
    mission: "ai-neurona",
    title: "Funciones de activación",
    skills: ["redes-neuronales"],
    difficulty: 2,
    hints: ["Aplica la fórmula a cada número de la lista con una comprensión: [f(z) for z in valores].", "math.exp, math.tanh y max(0, z) son todo lo que necesitas."],
    make(r) {
      const alpha = r.pick([0.01, 0.05, 0.1, 0.2]);
      const kinds = [
        { name: "sigmoide", text: "la **sigmoide**: 1 / (1 + e^(−z))", f: (z: number) => 1 / (1 + Math.exp(-z)), code: "1 / (1 + math.exp(-z))" },
        { name: "relu", text: "la **ReLU**: max(0, z)", f: (z: number) => Math.max(0, z), code: "max(0, z)" },
        { name: "tanh", text: "la **tangente hiperbólica**: tanh(z)", f: (z: number) => Math.tanh(z), code: "math.tanh(z)" },
        { name: "leaky_relu", text: `la **Leaky ReLU** con pendiente ${alpha}: z si z > 0, ${alpha}·z si no`, f: (z: number) => (z > 0 ? z : alpha * z), code: `z if z > 0 else ${alpha} * z` },
        { name: "softplus", text: "la **softplus**: ln(1 + e^z)", f: (z: number) => Math.log(1 + Math.exp(z)), code: "math.log(1 + math.exp(z))" },
      ];
      const kd = r.pick(kinds);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const zs = vec(r, r.int(3, 6));
        return { args: [zs], expected: zs.map(kd.f) };
      });
      return {
        prompt: [`Escribe \`${kd.name}(valores)\` que aplique a cada número de la lista ${kd.text}, y devuelva la lista de resultados.`, "", `Por ejemplo, \`${callText(kd.name, cases[0].args)}\` devuelve \`${lit((cases[0].expected as number[]).map((x) => Number(x.toFixed(4))))}\` (redondeado aquí a 4 decimales).`],
        starter: py`import math


def ${kd.name}(valores):
    return valores
`,
        solution: py`import math


def ${kd.name}(valores):
    return [${kd.code} for z in valores]
`,
        tests: fnTests(kd.name, cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-perdidas",
    mission: "ai-neurona",
    title: "Funciones de pérdida",
    skills: ["redes-neuronales", "metricas"],
    difficulty: 2,
    hints: ["Recorre las parejas (real, predicho) con zip y promedia el error de cada una.", "La entropía cruzada binaria de una pareja es −[y·ln(p) + (1 − y)·ln(1 − p)]."],
    make(r) {
      const delta = r.pick([0.5, 1, 2]);
      const kinds = [
        { name: "mse", text: "el **error cuadrático medio**: la media de (y − ŷ)²", bin: false, f: (y: number[], p: number[]) => mean(y.map((v, i) => (v - p[i]) ** 2)), code: "return sum((a - b) ** 2 for a, b in zip(y, y_pred)) / len(y)" },
        { name: "entropia_cruzada", text: "la **entropía cruzada binaria**: la media de −[y·ln(ŷ) + (1 − y)·ln(1 − ŷ)], con `y` en {0, 1} y `ŷ` entre 0 y 1", bin: true, f: (y: number[], p: number[]) => mean(y.map((v, i) => -(v * Math.log(p[i]) + (1 - v) * Math.log(1 - p[i])))), code: "return sum(-(a * math.log(b) + (1 - a) * math.log(1 - b)) for a, b in zip(y, y_pred)) / len(y)" },
        { name: "huber", text: `la **pérdida de Huber** con δ = ${delta}: para cada error e = y − ŷ, e²/2 si |e| ≤ δ y δ·(|e| − δ/2) si no; devuelve la media`, bin: false, f: (y: number[], p: number[]) => mean(y.map((v, i) => { const e = Math.abs(v - p[i]); return e <= delta ? (e * e) / 2 : delta * (e - delta / 2); })), code: `total = 0\n    for a, b in zip(y, y_pred):\n        e = abs(a - b)\n        total += e * e / 2 if e <= ${delta} else ${delta} * (e - ${delta} / 2)\n    return total / len(y)` },
      ];
      const kd = r.pick(kinds);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const n = r.int(3, 7);
        if (kd.bin) {
          const y = Array.from({ length: n }, () => r.int(0, 1));
          const p = y.map(() => r.int(5, 95) / 100);
          return { args: [y, p], expected: kd.f(y, p) };
        }
        const y = vec(r, n, -50, 50);
        const p = y.map((v) => Number((v + r.int(-30, 30) / 10).toFixed(1)));
        return { args: [y, p], expected: kd.f(y, p) };
      });
      return {
        prompt: [`Escribe \`${kd.name}(y, y_pred)\` que devuelva ${kd.text}.`, "", `Por ejemplo, \`${callText(kd.name, cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
        starter: py`import math


def ${kd.name}(y, y_pred):
    pass
`,
        solution: py`import math


def ${kd.name}(y, y_pred):
    ${kd.code}
`,
        tests: fnTests(kd.name, cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-softmax",
    mission: "ai-atencion",
    title: "Softmax con temperatura",
    skills: ["transformers", "probabilidad"],
    difficulty: 3,
    hints: ["softmax(z)ᵢ = e^(zᵢ/T) / Σⱼ e^(zⱼ/T). Divide primero cada puntuación entre la temperatura.", "Para no desbordar con números grandes, resta el máximo antes de exponenciar: el resultado no cambia."],
    make(r) {
      const T = r.pick([0.5, 1, 2, 5]);
      const softmax = (z: number[]) => {
        const s = z.map((v) => v / T);
        const m = Math.max(...s);
        const e = s.map((v) => Math.exp(v - m));
        const tot = sum(e);
        return e.map((v) => v / tot);
      };
      const cases: Case[] = Array.from({ length: 5 }, (_, i) => {
        const z = i === 4 ? [1000, 1001, 999] : vec(r, r.int(3, 6), -40, 40);
        return { args: [z], expected: softmax(z) };
      });
      return {
        prompt: [`Escribe \`softmax(puntuaciones)\` que convierta una lista de puntuaciones en probabilidades con softmax y **temperatura ${T}**: eᶻⁱ/ᵀ dividido entre la suma de todos los eᶻʲ/ᵀ. Debe funcionar también con puntuaciones muy grandes, como 1000 (resta el máximo antes de exponenciar).`, "", `Por ejemplo, \`${callText("softmax", cases[0].args)}\` devuelve \`${lit((cases[0].expected as number[]).map((x) => Number(x.toFixed(4))))}\` (redondeado aquí a 4 decimales).`],
        starter: py`import math


def softmax(puntuaciones):
    exps = [math.exp(z) for z in puntuaciones]
    return [e / sum(exps) for e in exps]
`,
        solution: py`import math


def softmax(puntuaciones):
    escaladas = [z / ${T} for z in puntuaciones]
    maximo = max(escaladas)
    exps = [math.exp(z - maximo) for z in escaladas]
    total = sum(exps)
    return [e / total for e in exps]
`,
        tests: fnTests("softmax", cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-similitud",
    mission: "ai-embeddings",
    title: "Buscar por similitud de vectores",
    skills: ["embeddings", "busqueda"],
    difficulty: 3,
    hints: ["Similitud del coseno: a·b / (‖a‖·‖b‖), con a·b = Σ aᵢbᵢ y ‖a‖ = √(Σ aᵢ²).", "Calcula la puntuación de cada documento, ordena de mayor a menor y quédate con los k primeros ids."],
    make(r) {
      const kinds = [
        { text: "la **similitud del coseno**", desc: true, f: (a: number[], b: number[]) => sum(a.map((v, i) => v * b[i])) / (Math.sqrt(sum(a.map((v) => v * v))) * Math.sqrt(sum(b.map((v) => v * v)))), code: "dot = sum(x * y for x, y in zip(a, b))\n    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))", order: "de mayor a menor similitud" },
        { text: "el **producto escalar**", desc: true, f: (a: number[], b: number[]) => sum(a.map((v, i) => v * b[i])), code: "return sum(x * y for x, y in zip(a, b))", order: "de mayor a menor producto" },
        { text: "la **distancia euclídea** (aquí, cuanto menor, más parecido)", desc: false, f: (a: number[], b: number[]) => Math.sqrt(sum(a.map((v, i) => (v - b[i]) ** 2))), code: "return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))", order: "de menor a mayor distancia" },
      ];
      const kd = r.pick(kinds);
      const k = r.int(1, 3);
      const dim = r.int(2, 4);
      const cases: Case[] = [];
      while (cases.length < 5) {
        const ids = r.sample(PALABRAS, r.int(k + 2, 7));
        const docs = Object.fromEntries(ids.map((id) => [id, vec(r, dim, -9, 9).map((v) => (v === 0 ? 0.5 : v))]));
        const q = vec(r, dim, -9, 9).map((v) => (v === 0 ? 0.5 : v));
        const scored = ids.map((id) => ({ id, s: kd.f(q, docs[id]) })).sort((a, b) => (kd.desc ? b.s - a.s : a.s - b.s));
        // No ties around the cut, so the top k is unambiguous.
        if (Math.abs(scored[k - 1].s - scored[k].s) < 1e-9) continue;
        cases.push({ args: [q, docs, k], expected: scored.slice(0, k).map((x) => x.id) });
      }
      return {
        prompt: [`\`documentos\` es un diccionario id → vector (embedding). Escribe \`mas_parecidos(consulta, documentos, k)\` que devuelva la lista de los \`k\` ids más parecidos a la consulta según ${kd.text}, ordenados ${kd.order}. Escribe primero la función auxiliar \`puntuacion(a, b)\`.`, "", `Por ejemplo, \`${callText("mas_parecidos", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`import math


def puntuacion(a, b):
    pass


def mas_parecidos(consulta, documentos, k):
    return list(documentos)[:k]
`,
        solution: py`import math


def puntuacion(a, b):
    ${kd.code}


def mas_parecidos(consulta, documentos, k):
    orden = sorted(documentos, key=lambda d: puntuacion(consulta, documentos[d]), reverse=${kd.desc ? "True" : "False"})
    return orden[:k]
`,
        tests: fnTests("mas_parecidos", cases),
      };
    },
  },
  {
    id: "g-tokens",
    mission: "ai-tokens",
    title: "Tokenizar texto",
    skills: ["nlp", "tokenizacion"],
    difficulty: 2,
    hints: ["Pasa el texto a minúsculas y quita la puntuación (por ejemplo, reemplazando cada signo por un espacio) antes de split().", "Para n-gramas, recorre las posiciones i y toma tokens[i:i + n]."],
    make(r) {
      const n = r.pick([2, 3]);
      const minf = r.pick([2, 3]);
      const PUNT = ",.;:!?";
      const tok = (s: string) => s.toLowerCase().split("").map((c) => (PUNT.includes(c) ? " " : c)).join("").split(/\s+/).filter(Boolean);
      const kinds = [
        { name: "tokenizar", text: "la lista de palabras en minúsculas, sin los signos `, . ; : ! ?`", f: (s: string) => tok(s), code: "return limpio.split()" },
        { name: "ngramas", text: `la lista de ${n}-gramas de palabras (palabras en minúsculas y sin puntuación, unidas por un espacio), en orden`, f: (s: string) => { const t = tok(s); return Array.from({ length: Math.max(0, t.length - n + 1) }, (_, i) => t.slice(i, i + n).join(" ")); }, code: `tokens = limpio.split()\n    return [" ".join(tokens[i:i + ${n}]) for i in range(len(tokens) - ${n} + 1)]` },
        { name: "vocabulario", text: `la lista ordenada alfabéticamente de las palabras (en minúsculas y sin puntuación) que aparecen al menos ${minf} veces`, f: (s: string) => { const c: Record<string, number> = {}; for (const w of tok(s)) c[w] = (c[w] ?? 0) + 1; return Object.keys(c).filter((w) => c[w] >= minf).sort(); }, code: `conteo = {}\n    for t in limpio.split():\n        conteo[t] = conteo.get(t, 0) + 1\n    return sorted(t for t, c in conteo.items() if c >= ${minf})` },
      ];
      const kd = r.pick(kinds);
      const sentence = () => {
        const pool = r.sample(PALABRAS, 5);
        return Array.from({ length: r.int(5, 11) }, (_, i) => {
          const w = r.pick(pool);
          const cased = i === 0 || r.next() < 0.2 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
          return cased + (r.next() < 0.25 ? r.pick([",", ".", ";", "!", "?", ":"]) : "");
        }).join(" ");
      };
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const s = sentence();
        return { args: [s], expected: kd.f(s) };
      });
      return {
        prompt: [`Escribe \`${kd.name}(texto)\` que devuelva ${kd.text}.`, "", `Por ejemplo, \`${callText(kd.name, cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def ${kd.name}(texto):
    return texto.split()
`,
        solution: py`def ${kd.name}(texto):
    limpio = texto.lower()
    for signo in ${lit(PUNT)}:
        limpio = limpio.replace(signo, " ")
    ${kd.code}
`,
        tests: fnTests(kd.name, cases),
      };
    },
  },
  {
    id: "g-equidad",
    mission: "ai-equidad",
    title: "Métricas de equidad",
    skills: ["equidad", "metricas"],
    difficulty: 3,
    hints: ["Separa las filas de cada grupo y calcula la tasa en cada uno; después compáralas.", "Tasa de selección = fracción con predicción 1. Tasa de verdaderos positivos = de los que tienen y = 1, fracción con predicción 1."],
    make(r) {
      const [ga, gb] = r.sample(["A", "B", "C", "D"], 2);
      const kinds = [
        { name: "diferencia_paridad", text: `la **diferencia de paridad demográfica**: tasa de selección del grupo \`${ga}\` menos la del grupo \`${gb}\``, f: (g: string[], _y: number[], p: number[]) => rate(p, g, ga) - rate(p, g, gb), code: `return tasa("${ga}") - tasa("${gb}")`, needY: false },
        { name: "razon_impacto", text: `la **razón de impacto dispar**: tasa de selección del grupo \`${gb}\` dividida entre la del grupo \`${ga}\``, f: (g: string[], _y: number[], p: number[]) => rate(p, g, gb) / rate(p, g, ga), code: `return tasa("${gb}") / tasa("${ga}")`, needY: false },
        { name: "diferencia_oportunidad", text: `la **diferencia de igualdad de oportunidades**: tasa de verdaderos positivos del grupo \`${ga}\` menos la del grupo \`${gb}\``, f: (g: string[], y: number[], p: number[]) => tpr(y, p, g, ga) - tpr(y, p, g, gb), code: `return tvp("${ga}") - tvp("${gb}")`, needY: true },
      ];
      function rate(p: number[], g: string[], k: string) {
        const xs = p.filter((_, i) => g[i] === k);
        return sum(xs) / xs.length;
      }
      function tpr(y: number[], p: number[], g: string[], k: string) {
        const xs = p.filter((_, i) => g[i] === k && y[i] === 1);
        return sum(xs) / xs.length;
      }
      const kd = r.pick(kinds);
      const cases: Case[] = [];
      while (cases.length < 5) {
        const n = r.int(8, 16);
        const g = Array.from({ length: n }, () => r.pick([ga, gb]));
        const y = g.map(() => r.int(0, 1));
        const p = y.map((v) => (r.next() < 0.7 ? v : 1 - v));
        const ok = [ga, gb].every((k) => g.some((x, i) => x === k && y[i] === 1) && p.some((v, i) => g[i] === k && v === 1));
        if (!ok) continue;
        cases.push({ args: [g, y, p], expected: kd.f(g, y, p) });
      }
      return {
        prompt: [`\`grupo\`, \`y\` (resultado real, 0/1) y \`pred\` (decisión del modelo, 0/1) son listas paralelas. Escribe \`${kd.name}(grupo, y, pred)\` que devuelva ${kd.text}.`, "", `Por ejemplo, \`${callText(kd.name, cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
        starter: py`def ${kd.name}(grupo, y, pred):
    return 0.0
`,
        solution: py`def ${kd.name}(grupo, y, pred):
    def tasa(g):
        valores = [p for gr, p in zip(grupo, pred) if gr == g]
        return sum(valores) / len(valores)

    def tvp(g):
        valores = [p for gr, real, p in zip(grupo, y, pred) if gr == g and real == 1]
        return sum(valores) / len(valores)

    ${kd.code}
`,
        tests: fnTests(kd.name, cases, { tol: 1e-12 }),
      };
    },
  },
  {
    id: "g-privacidad",
    mission: "ai-seguridad",
    title: "Ocultar datos personales",
    skills: ["ia-responsable", "regex", "privacidad"],
    difficulty: 3,
    hints: ["re.sub(patron, reemplazo, texto) sustituye todas las coincidencias.", "Escribe un patrón por tipo de dato y aplícalos uno tras otro."],
    make(r) {
      const kinds = [
        { what: "los correos electrónicos por `[CORREO]`", pat: String.raw`[\w.]+@\w+\.\w+`, tok: "[CORREO]", gen: () => `${r.pick(PALABRAS)}.${r.pick(PALABRAS)}${r.int(1, 99)}@${r.pick(["correo", "gremio"])}.${r.pick(["es", "com"])}` },
        { what: "los teléfonos (9 cifras, opcionalmente agrupadas de 3 en 3 con espacios) por `[TELEFONO]`", pat: String.raw`\b\d{3} ?\d{3} ?\d{3}\b`, tok: "[TELEFONO]", gen: () => { const d = () => String(r.int(100, 999)); return r.next() < 0.5 ? `${d()} ${d()} ${d()}` : `${d()}${d()}${d()}`; } },
        { what: "los DNI (8 cifras y una letra mayúscula) por `[DNI]`", pat: String.raw`\b\d{8}[A-Z]\b`, tok: "[DNI]", gen: () => `${r.int(10000000, 99999999)}${String.fromCharCode(65 + r.int(0, 25))}` },
      ];
      const kd = r.pick(kinds);
      const make = () => {
        const parts: string[] = [];
        const items: string[] = [];
        for (let i = 0; i < r.int(1, 3); i++) {
          const x = kd.gen();
          items.push(x);
          parts.push(`${r.pick(NOMBRES)} ${r.pick(["escribió desde", "dio el dato", "contacto:", "registró"])} ${x}`);
        }
        parts.push(`pedido ${r.int(10, 9999)}`);
        const text = r.shuffle(parts).join(", ") + ".";
        let out = text;
        for (const x of items) out = out.split(x).join(kd.tok);
        return { text, out };
      };
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const m = make();
        return { args: [m.text], expected: m.out };
      });
      return {
        prompt: [`Antes de enviar texto a un modelo de lenguaje hay que quitar los datos personales. Escribe \`anonimizar(texto)\` que reemplace ${kd.what} y deje el resto igual (los números de pedido, por ejemplo, no se tocan).`, "", `Por ejemplo, \`${callText("anonimizar", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`import re


def anonimizar(texto):
    return texto
`,
        solution: py`import re


def anonimizar(texto):
    return re.sub(r"${kd.pat}", ${lit(kd.tok)}, texto)
`,
        tests: fnTests("anonimizar", cases),
      };
    },
  },
  {
    id: "g-derivadas",
    mission: "ai-autograd",
    title: "Derivadas como las calcula autograd",
    skills: ["autograd", "derivadas"],
    difficulty: 3,
    hints: ["Regla de la cadena: si y = f(g(x)), dy/dx = f'(g(x))·g'(x).", "Comprueba tu resultado con una diferencia central: (f(x + h) − f(x − h)) / (2h) con h pequeño."],
    make(r) {
      const a = r.int(1, 4);
      const b = r.int(-3, 3) || 1;
      const kinds = [
        { text: `f(x) = (${a}x + ${b})³`, f: (x: number) => 3 * (a * x + b) ** 2 * a, code: `3 * (${a} * x + ${b}) ** 2 * ${a}` },
        { text: `f(x) = e^(${a}x) · x`, f: (x: number) => Math.exp(a * x) * (a * x + 1), code: `math.exp(${a} * x) * (${a} * x + 1)` },
        { text: `f(x) = sigmoide(${a}x + ${b}) = 1 / (1 + e^(−(${a}x + ${b})))`, f: (x: number) => { const s = 1 / (1 + Math.exp(-(a * x + b))); return s * (1 - s) * a; }, code: `(1 / (1 + math.exp(-(${a} * x + ${b})))) * (1 - 1 / (1 + math.exp(-(${a} * x + ${b})))) * ${a}` },
        { text: `f(x) = ln(x² + ${a})`, f: (x: number) => (2 * x) / (x * x + a), code: `2 * x / (x * x + ${a})` },
        { text: `f(x) = sin(${a}x)²`, f: (x: number) => 2 * Math.sin(a * x) * Math.cos(a * x) * a, code: `2 * math.sin(${a} * x) * math.cos(${a} * x) * ${a}` },
      ];
      const kd = r.pick(kinds);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const x = r.int(-20, 20) / 10;
        return { args: [x], expected: kd.f(x) };
      });
      return {
        prompt: [`Para ${kd.text}, escribe \`derivada(x)\` que devuelva el valor **exacto** de f'(x), obtenido con la regla de la cadena (no con una aproximación numérica).`, "", `Por ejemplo, \`${callText("derivada", cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
        starter: py`import math


def derivada(x):
    pass
`,
        solution: py`import math


def derivada(x):
    return ${kd.code}
`,
        tests: fnTests("derivada", cases, { tol: 1e-9 }),
      };
    },
  },
];

