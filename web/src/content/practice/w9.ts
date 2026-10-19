// Practice drills for World 9 (applications): finance, forecasting, graphs, bioinformatics,
// recommendation, hierarchical Bayes and optimization, in plain Python.
import { py, type Drill } from "../types";
import { callText, eq, fnTests, lit, NOMBRES, PALABRAS, type Case } from "./kit";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => sum(xs) / xs.length;
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export const DRILLS_W9: Drill[] = [
  {
    id: "g-rentabilidad",
    mission: "mv-finanzas",
    title: "Rentabilidad y riesgo de una serie de precios",
    skills: ["finanzas", "series-temporales"],
    difficulty: 3,
    hints: ["La rentabilidad simple del periodo t es precio[t] / precio[t − 1] − 1.", "La caída máxima recorre los precios llevando el máximo visto hasta ese momento y guarda la mayor caída relativa desde ese máximo."],
    make(r) {
      const per = r.pick([12, 52, 252]);
      const kinds = [
        { name: "rentabilidades", text: "la lista de rentabilidades simples de cada periodo: precio[t] / precio[t − 1] − 1", f: (p: number[]) => p.slice(1).map((v, i) => v / p[i] - 1), code: "return [precios[t] / precios[t - 1] - 1 for t in range(1, len(precios))]", list: true },
        { name: "rentabilidad_total", text: "la rentabilidad total del periodo: último / primero − 1", f: (p: number[]) => p[p.length - 1] / p[0] - 1, code: "return precios[-1] / precios[0] - 1", list: false },
        { name: "caida_maxima", text: "la **caída máxima** (*drawdown*): la mayor caída relativa desde un máximo previo, como número positivo (0 si nunca baja)", f: (p: number[]) => { let peak = p[0]; let worst = 0; for (const v of p) { peak = Math.max(peak, v); worst = Math.max(worst, (peak - v) / peak); } return worst; }, code: "maximo = precios[0]\n    peor = 0\n    for p in precios:\n        maximo = max(maximo, p)\n        peor = max(peor, (maximo - p) / maximo)\n    return peor", list: false },
        { name: "volatilidad", text: `la **volatilidad anualizada**: la desviación típica muestral (n − 1) de las rentabilidades simples multiplicada por √${per} (${per} periodos al año)`, f: (p: number[]) => { const rs = p.slice(1).map((v, i) => v / p[i] - 1); const m = mean(rs); return Math.sqrt(sum(rs.map((x) => (x - m) ** 2)) / (rs.length - 1)) * Math.sqrt(per); }, code: `r = [precios[t] / precios[t - 1] - 1 for t in range(1, len(precios))]\n    media = sum(r) / len(r)\n    return math.sqrt(sum((x - media) ** 2 for x in r) / (len(r) - 1)) * math.sqrt(${per})`, list: false },
      ];
      const kd = r.pick(kinds);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        let p = r.int(50, 200);
        const ps = Array.from({ length: r.int(4, 10) }, () => (p = Math.max(1, Math.round(p * (1 + r.int(-12, 12) / 100) * 100) / 100)));
        return { args: [ps], expected: kd.f(ps) };
      });
      const shown = kd.list ? `\`${lit((cases[0].expected as number[]).map((x) => Number(x.toFixed(4))))}\` (redondeado aquí a 4 decimales)` : eq(cases[0].expected as number);
      return {
        prompt: [`Escribe \`${kd.name}(precios)\` que reciba una lista de precios ordenados en el tiempo y devuelva ${kd.text}.`, "", `Por ejemplo, \`${callText(kd.name, cases[0].args)}\` devuelve ${shown}.`],
        starter: py`import math


def ${kd.name}(precios):
    pass
`,
        solution: py`import math


def ${kd.name}(precios):
    ${kd.code}
`,
        tests: fnTests(kd.name, cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-pronostico",
    mission: "mv-pronosticos",
    title: "Pronósticos de referencia",
    skills: ["pronostico", "series-temporales"],
    difficulty: 3,
    hints: ["Un pronóstico de referencia usa reglas simples: repetir el último valor, repetir la última temporada o promediar los últimos valores.", "Construye la lista de h valores futuros con un bucle o una comprensión."],
    make(r) {
      const s = r.pick([4, 7, 12]);
      const k = r.int(2, 5);
      const kinds = [
        { text: "el **pronóstico ingenuo**: cada valor futuro es el último valor observado", f: (y: number[], h: number) => Array(h).fill(y[y.length - 1]), code: "return [serie[-1]] * h" },
        { text: `el **pronóstico estacional ingenuo** con periodo ${s}: el valor futuro i (empezando en 0) es el observado ${s} pasos antes de él, repitiendo la última temporada completa`, f: (y: number[], h: number) => Array.from({ length: h }, (_, i) => y[y.length - s + (i % s)]), code: `return [serie[len(serie) - ${s} + (i % ${s})] for i in range(h)]`, minLen: s },
        { text: `la **media móvil** de los últimos ${k} valores, repetida en todos los pasos futuros`, f: (y: number[], h: number) => Array(h).fill(mean(y.slice(-k))), code: `return [sum(serie[-${k}:]) / ${k}] * h` },
        { text: "el **pronóstico con deriva**: el último valor más i veces la pendiente media (último − primero) / (n − 1), para i = 1, …, h", f: (y: number[], h: number) => Array.from({ length: h }, (_, i) => y[y.length - 1] + ((i + 1) * (y[y.length - 1] - y[0])) / (y.length - 1)), code: "pendiente = (serie[-1] - serie[0]) / (len(serie) - 1)\n    return [serie[-1] + i * pendiente for i in range(1, h + 1)]" },
      ];
      const kd = r.pick(kinds);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const n = r.int(Math.max(kd.minLen ?? 0, 5) + 1, Math.max(kd.minLen ?? 0, 5) + 12);
        const y = Array.from({ length: n }, (_, i) => r.int(10, 40) + (i % s) * r.int(0, 3));
        const h = r.int(1, 2 * s);
        return { args: [y, h], expected: kd.f(y, h) };
      });
      return {
        prompt: [`Escribe \`pronosticar(serie, h)\` que devuelva la lista de los \`h\` valores siguientes según ${kd.text}.`, "", `Por ejemplo, \`${callText("pronosticar", cases[0].args)}\` devuelve \`${lit((cases[0].expected as number[]).map((x) => Number(x.toFixed(4))))}\`${(cases[0].expected as number[]).every((x) => Number(x.toFixed(4)) === x) ? "" : " (redondeado aquí a 4 decimales)"}.`],
        starter: py`def pronosticar(serie, h):
    return []
`,
        solution: py`def pronosticar(serie, h):
    ${kd.code}
`,
        tests: fnTests("pronosticar", cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-grafos",
    mission: "mv-redes",
    title: "Recorrer un grafo",
    skills: ["grafos", "algoritmos"],
    difficulty: 3,
    hints: ["Construye primero la lista de vecinos de cada nodo a partir de las aristas (el grafo no es dirigido: cada arista va en los dos sentidos).", "La búsqueda en anchura usa una cola (collections.deque): visita primero los vecinos a distancia 1, después a distancia 2…"],
    make(r) {
      const kinds = [
        { name: "distancia", sig: "aristas, origen, destino", text: "el número mínimo de aristas para ir de `origen` a `destino`, o `-1` si no hay camino" },
        { name: "componentes", sig: "nodos, aristas", text: "cuántas **componentes conexas** tiene el grafo (grupos de nodos conectados entre sí; un nodo aislado es su propia componente)" },
        { name: "a_distancia", sig: "aristas, origen, d", text: "la lista ordenada de los nodos a distancia **como mucho** `d` del `origen` (sin incluir el origen)" },
      ] as const;
      const kd = r.pick(kinds);
      const graph = () => {
        const nodes = r.sample(NOMBRES.filter((n) => /^[A-Za-z]+$/.test(n)), r.int(5, 9)).sort(cmp);
        const edges: [string, string][] = [];
        for (let i = 0; i < r.int(nodes.length - 2, nodes.length + 2); i++) {
          const [a, b] = r.sample(nodes, 2);
          if (!edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) edges.push([a, b]);
        }
        return { nodes, edges };
      };
      const bfs = (edges: [string, string][], src: string) => {
        const adj: Record<string, string[]> = {};
        for (const [a, b] of edges) {
          (adj[a] ??= []).push(b);
          (adj[b] ??= []).push(a);
        }
        const dist: Record<string, number> = { [src]: 0 };
        const q = [src];
        while (q.length) {
          const u = q.shift()!;
          for (const v of adj[u] ?? []) if (!(v in dist)) { dist[v] = dist[u] + 1; q.push(v); }
        }
        return dist;
      };
      const d = r.int(1, 2);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const g = graph();
        if (kd.name === "componentes") {
          const seen = new Set<string>();
          let comps = 0;
          for (const n of g.nodes) if (!seen.has(n)) { comps++; for (const k of Object.keys(bfs(g.edges, n))) seen.add(k); }
          return { args: [g.nodes, g.edges], expected: comps };
        }
        const [src, dst] = r.sample(g.nodes, 2);
        const dist = bfs(g.edges, src);
        if (kd.name === "distancia") return { args: [g.edges, src, dst], expected: dist[dst] ?? -1 };
        return { args: [g.edges, src, d], expected: Object.keys(dist).filter((n) => n !== src && dist[n] <= d).sort(cmp) };
      });
      const solutions: Record<string, string> = {
        distancia: py`from collections import deque


def distancia(aristas, origen, destino):
    vecinos = {}
    for a, b in aristas:
        vecinos.setdefault(a, []).append(b)
        vecinos.setdefault(b, []).append(a)
    dist = {origen: 0}
    cola = deque([origen])
    while cola:
        u = cola.popleft()
        for v in vecinos.get(u, []):
            if v not in dist:
                dist[v] = dist[u] + 1
                cola.append(v)
    return dist.get(destino, -1)
`,
        componentes: py`def componentes(nodos, aristas):
    vecinos = {n: [] for n in nodos}
    for a, b in aristas:
        vecinos[a].append(b)
        vecinos[b].append(a)
    vistos, total = set(), 0
    for n in nodos:
        if n in vistos:
            continue
        total += 1
        pila = [n]
        while pila:
            u = pila.pop()
            if u not in vistos:
                vistos.add(u)
                pila.extend(vecinos[u])
    return total
`,
        a_distancia: py`from collections import deque


def a_distancia(aristas, origen, d):
    vecinos = {}
    for a, b in aristas:
        vecinos.setdefault(a, []).append(b)
        vecinos.setdefault(b, []).append(a)
    dist = {origen: 0}
    cola = deque([origen])
    while cola:
        u = cola.popleft()
        for v in vecinos.get(u, []):
            if v not in dist:
                dist[v] = dist[u] + 1
                cola.append(v)
    return sorted(n for n, k in dist.items() if 0 < k <= d)
`,
      };
      return {
        prompt: [`Un grafo no dirigido se da como lista de aristas (parejas de nodos). Escribe \`${kd.name}(${kd.sig})\` que devuelva ${kd.text}${kd.name === "a_distancia" ? `; las pruebas usan d = ${d}` : ""}. No uses networkx.`, "", `Por ejemplo, \`${callText(kd.name, cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def ${kd.name}(${kd.sig}):
    pass
`,
        solution: solutions[kd.name],
        tests: fnTests(kd.name, cases) + py`
def test_sin_networkx():
    """Sin networkx"""
    assert "networkx" not in t.code, "Aquí se practica el algoritmo: resuélvelo sin networkx."
`,
      };
    },
  },
  {
    id: "g-dijkstra",
    mission: "mv-redes",
    title: "El camino más corto con pesos",
    skills: ["grafos", "algoritmos"],
    difficulty: 4,
    hints: ["Algoritmo de Dijkstra: una cola de prioridad (heapq) con (distancia, nodo); saca siempre el más cercano y relaja sus aristas.", "Si sacas un nodo con una distancia mayor que la ya conocida, ignóralo."],
    make(r) {
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const nodes = r.sample(["A", "B", "C", "D", "E", "F", "G", "H"], r.int(4, 7));
        const edges: [string, string, number][] = [];
        for (let i = 0; i < r.int(nodes.length - 1, nodes.length + 4); i++) {
          const [a, b] = r.sample(nodes, 2);
          if (!edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) edges.push([a, b, r.int(1, 15)]);
        }
        const [src, dst] = r.sample(nodes, 2);
        const dist: Record<string, number> = Object.fromEntries(nodes.map((n) => [n, Infinity]));
        dist[src] = 0;
        const done = new Set<string>();
        for (;;) {
          const u = nodes.filter((n) => !done.has(n) && dist[n] < Infinity).sort((a, b) => dist[a] - dist[b])[0];
          if (!u) break;
          done.add(u);
          for (const [a, b, w] of edges) {
            const v = a === u ? b : b === u ? a : null;
            if (v && dist[u] + w < dist[v]) dist[v] = dist[u] + w;
          }
        }
        return { args: [edges, src, dst], expected: Number.isFinite(dist[dst]) ? dist[dst] : null };
      });
      return {
        prompt: ["Las carreteras entre ciudades se dan como tuplas `(a, b, km)` (se pueden recorrer en los dos sentidos). Escribe `distancia_minima(carreteras, origen, destino)` que devuelva los kilómetros del camino más corto, o `None` si no se puede llegar.", "", `Por ejemplo, \`${callText("distancia_minima", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`import heapq


def distancia_minima(carreteras, origen, destino):
    pass
`,
        solution: py`import heapq


def distancia_minima(carreteras, origen, destino):
    vecinos = {}
    for a, b, km in carreteras:
        vecinos.setdefault(a, []).append((b, km))
        vecinos.setdefault(b, []).append((a, km))
    dist = {origen: 0}
    cola = [(0, origen)]
    while cola:
        d, u = heapq.heappop(cola)
        if d > dist.get(u, float("inf")):
            continue
        for v, km in vecinos.get(u, []):
            if d + km < dist.get(v, float("inf")):
                dist[v] = d + km
                heapq.heappush(cola, (d + km, v))
    return dist.get(destino)
`,
        tests: fnTests("distancia_minima", cases),
      };
    },
  },
  {
    id: "g-adn",
    mission: "mv-bioinformatica",
    title: "Trabajar con secuencias de ADN",
    skills: ["bioinformatica", "cadenas"],
    difficulty: 2,
    hints: ["Un diccionario {\"A\": \"T\", \"T\": \"A\", \"C\": \"G\", \"G\": \"C\"} traduce cada base a su complementaria.", "Para contar subcadenas de longitud k, recorre las posiciones i y toma secuencia[i:i + k]."],
    make(r) {
      const k = r.int(2, 4);
      const comp: Record<string, string> = { A: "T", T: "A", C: "G", G: "C" };
      const kinds = [
        { name: "complemento_inverso", text: "el **complemento inverso**: cada base cambiada por su complementaria (A↔T, C↔G) y la cadena leída al revés", f: (s: string) => [...s].reverse().map((c) => comp[c]).join(""), code: 'pares = {"A": "T", "T": "A", "C": "G", "G": "C"}\n    return "".join(pares[b] for b in reversed(secuencia))' },
        { name: "contenido_gc", text: "el **contenido GC**: el porcentaje (de 0 a 100) de bases que son G o C", f: (s: string) => ([...s].filter((c) => c === "G" || c === "C").length / s.length) * 100, code: 'return (secuencia.count("G") + secuencia.count("C")) / len(secuencia) * 100' },
        { name: "kmer_frecuente", text: `el **${k}-mer** (subcadena de ${k} bases, contando las que se solapan) que más se repite; si hay empate, el primero en orden alfabético`, f: (s: string) => { const c: Record<string, number> = {}; for (let i = 0; i + k <= s.length; i++) { const w = s.slice(i, i + k); c[w] = (c[w] ?? 0) + 1; } return Object.keys(c).sort().reduce((a, b) => (c[b] > c[a] ? b : a)); }, code: `conteo = {}\n    for i in range(len(secuencia) - ${k} + 1):\n        trozo = secuencia[i:i + ${k}]\n        conteo[trozo] = conteo.get(trozo, 0) + 1\n    return min(conteo, key=lambda t: (-conteo[t], t))` },
        { name: "mutaciones", text: "la **distancia de Hamming** entre las dos secuencias de igual longitud: en cuántas posiciones difieren", f: (s: string, t?: string) => [...s].filter((c, i) => c !== t![i]).length, code: "return sum(1 for a, b in zip(secuencia, otra) if a != b)", two: true },
      ];
      const kd = r.pick(kinds);
      const seq = (n: number) => Array.from({ length: n }, () => r.pick(["A", "C", "G", "T"])).join("");
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const s = seq(r.int(8, 24));
        if (kd.two) {
          const t = [...s].map((c) => (r.next() < 0.2 ? r.pick(["A", "C", "G", "T"]) : c)).join("");
          return { args: [s, t], expected: (kd.f as (a: string, b: string) => number)(s, t) };
        }
        return { args: [s], expected: (kd.f as (a: string) => unknown)(s) };
      });
      const sig = kd.two ? "secuencia, otra" : "secuencia";
      return {
        prompt: [`Escribe \`${kd.name}(${sig})\` que devuelva ${kd.text}.`, "", `Por ejemplo, \`${callText(kd.name, cases[0].args)}\` devuelve ${typeof cases[0].expected === "number" ? eq(cases[0].expected) : `\`${lit(cases[0].expected)}\``}.`],
        starter: py`def ${kd.name}(${sig}):
    pass
`,
        solution: py`def ${kd.name}(${sig}):
    ${kd.code}
`,
        tests: fnTests(kd.name, cases, { tol: 1e-12 }),
      };
    },
  },
  {
    id: "g-recomendar",
    mission: "mv-recomendador",
    title: "Recomendar por usuarios parecidos",
    skills: ["recomendacion", "similitud"],
    difficulty: 3,
    hints: ["Similitud de Jaccard entre dos conjuntos: |A ∩ B| / |A ∪ B|.", "Busca el usuario más parecido (sin contarte a ti mismo) y recomienda lo que le gustó a él y no a ti."],
    make(r) {
      const kinds = [
        { name: "mas_parecido", text: "el nombre del **otro** usuario con mayor similitud de Jaccard con `usuario`; si hay empate, el primero en orden alfabético" },
        { name: "recomendar", text: "la lista ordenada alfabéticamente de los elementos que le gustan al usuario más parecido (mayor Jaccard; empate → primero en orden alfabético) y que `usuario` todavía no tiene" },
      ] as const;
      const kd = r.pick(kinds);
      const jac = (a: string[], b: string[]) => { const A = new Set(a); const B = new Set(b); const inter = [...A].filter((x) => B.has(x)).length; const uni = new Set([...a, ...b]).size; return uni ? inter / uni : 0; };
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const items = r.sample(PALABRAS, 8);
        const users = r.sample(NOMBRES.filter((n) => /^[A-Za-z]+$/.test(n)), r.int(3, 6));
        const gustos = Object.fromEntries(users.map((u) => [u, r.sample(items, r.int(2, 5)).sort(cmp)]));
        const me = r.pick(users);
        const best = users.filter((u) => u !== me).sort(cmp).reduce((a, b) => (jac(gustos[me], gustos[b]) > jac(gustos[me], gustos[a]) ? b : a));
        const expected = kd.name === "mas_parecido" ? best : gustos[best].filter((x) => !gustos[me].includes(x)).sort(cmp);
        return { args: [me, gustos], expected };
      });
      return {
        prompt: [`\`gustos\` es un diccionario usuario → lista de elementos que le gustan. Escribe \`${kd.name}(usuario, gustos)\` que devuelva ${kd.text}.`, "", `Por ejemplo, \`${callText(kd.name, cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def jaccard(a, b):
    pass


def ${kd.name}(usuario, gustos):
    pass
`,
        solution: py`def jaccard(a, b):
    a, b = set(a), set(b)
    return len(a & b) / len(a | b) if a | b else 0


def mas_parecido(usuario, gustos):
    mejor, similitud = None, -1
    for otro in sorted(gustos):
        if otro != usuario and jaccard(gustos[usuario], gustos[otro]) > similitud:
            mejor, similitud = otro, jaccard(gustos[usuario], gustos[otro])
    return mejor
${kd.name === "recomendar" ? `

def recomendar(usuario, gustos):
    vecino = mas_parecido(usuario, gustos)
    return sorted(set(gustos[vecino]) - set(gustos[usuario]))
` : ""}`,
        tests: fnTests(kd.name, cases),
      };
    },
  },
  {
    id: "g-contraccion",
    mission: "mv-bayes-jerarquico",
    title: "Contraer estimaciones hacia la media",
    skills: ["estadistica-bayesiana", "estimacion"],
    difficulty: 3,
    hints: ["Con una distribución previa Beta(a, b), la media posterior de una tasa con x éxitos en n intentos es (x + a) / (n + a + b).", "Los grupos con pocos datos se acercan mucho a la media previa; los que tienen muchos apenas se mueven."],
    make(r) {
      const kind = r.pick(["beta", "empirica"] as const);
      const a = r.int(1, 6);
      const b = r.int(2, 12);
      const m = r.pick([10, 20, 50]);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const n = Array.from({ length: r.int(3, 6) }, () => r.pick([r.int(2, 10), r.int(20, 300)]));
        const x = n.map((v) => r.int(0, v));
        const p0 = sum(x) / sum(n);
        const est = kind === "beta" ? x.map((v, i) => (v + a) / (n[i] + a + b)) : x.map((v, i) => (v + m * p0) / (n[i] + m));
        return { args: [x, n], expected: est };
      });
      const text =
        kind === "beta"
          ? `la media posterior de la tasa de cada grupo con una distribución previa Beta(${a}, ${b}): (éxitos + ${a}) / (intentos + ${a + b})`
          : `la estimación de **Bayes empírico** de cada grupo: (éxitos + ${m}·p₀) / (intentos + ${m}), donde p₀ es la tasa global (todos los éxitos entre todos los intentos)`;
      return {
        prompt: [`Varios hospitales tienen \`exitos[i]\` de \`intentos[i]\` tratamientos con éxito. La tasa bruta de un hospital con pocos casos es muy inestable. Escribe \`contraer(exitos, intentos)\` que devuelva la lista con ${text}.`, "", `Por ejemplo, \`${callText("contraer", cases[0].args)}\` devuelve \`${lit((cases[0].expected as number[]).map((v) => Number(v.toFixed(4))))}\` (redondeado aquí a 4 decimales).`],
        starter: py`def contraer(exitos, intentos):
    return [x / n for x, n in zip(exitos, intentos)]
`,
        solution:
          kind === "beta"
            ? py`def contraer(exitos, intentos):
    return [(x + ${a}) / (n + ${a + b}) for x, n in zip(exitos, intentos)]
`
            : py`def contraer(exitos, intentos):
    p0 = sum(exitos) / sum(intentos)
    return [(x + ${m} * p0) / (n + ${m}) for x, n in zip(exitos, intentos)]
`,
        tests: fnTests("contraer", cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-optimizar",
    mission: "mv-optimizacion",
    title: "Optimizar la producción",
    skills: ["optimizacion", "algoritmos"],
    difficulty: 3,
    hints: ["Con cantidades enteras y pocas opciones, puedes probar todas las combinaciones (a, b) con dos bucles anidados.", "Descarta las combinaciones que superan algún recurso y quédate con la de mayor beneficio; si empatan, la primera que encontraste."],
    make(r) {
      const [p1, p2] = r.sample(["espadas", "escudos", "arcos", "cascos", "botas"], 2);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const g = [r.int(3, 30), r.int(3, 30)];
        const uso = [
          [r.int(1, 5), r.int(1, 5)],
          [r.int(1, 5), r.int(1, 5)],
        ];
        const cap = [r.int(10, 40), r.int(10, 40)];
        let best: [number, number] = [0, 0];
        let bestV = -1;
        for (let x = 0; x * Math.min(uso[0][0], uso[1][0]) <= Math.max(...cap); x++)
          for (let y = 0; y * Math.min(uso[0][1], uso[1][1]) <= Math.max(...cap); y++) {
            if (uso[0][0] * x + uso[0][1] * y > cap[0] || uso[1][0] * x + uso[1][1] * y > cap[1]) continue;
            const v = g[0] * x + g[1] * y;
            if (v > bestV) {
              bestV = v;
              best = [x, y];
            }
          }
        return { args: [g, uso, cap], expected: [best, bestV] };
      });
      return {
        prompt: [
          `Una forja fabrica ${p1} y ${p2} (en unidades enteras). \`beneficio = [b1, b2]\` es la ganancia por unidad; \`uso[r] = [u1, u2]\` es lo que consume cada unidad del recurso r; \`capacidad[r]\` es lo disponible de cada recurso. Escribe \`mejor_plan(beneficio, uso, capacidad)\` que devuelva \`((x, y), ganancia)\`: las cantidades de cada producto que maximizan la ganancia sin pasarse de ningún recurso.`,
          "",
          `Prueba x = 0, 1, 2… y, para cada x, y = 0, 1, 2…, mientras quepan; si dos planes dan la misma ganancia, quédate con el primero que encontraste en ese orden. Por ejemplo, \`${callText("mejor_plan", cases[0].args)}\` devuelve \`((${(cases[0].expected as [number[], number])[0].join(", ")}), ${(cases[0].expected as [number[], number])[1]})\`.`,
        ],
        starter: py`def mejor_plan(beneficio, uso, capacidad):
    return ((0, 0), 0)
`,
        solution: py`def mejor_plan(beneficio, uso, capacidad):
    mejor, ganancia = (0, 0), -1
    x = 0
    while all(uso[r][0] * x <= capacidad[r] for r in range(2)):
        y = 0
        while all(uso[r][0] * x + uso[r][1] * y <= capacidad[r] for r in range(2)):
            valor = beneficio[0] * x + beneficio[1] * y
            if valor > ganancia:
                mejor, ganancia = (x, y), valor
            y += 1
        x += 1
    return (mejor, ganancia)
`,
        tests: fnTests("mejor_plan", cases),
      };
    },
  },
];
