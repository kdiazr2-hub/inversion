// Practice drills for the topics added last: tidy data for Seaborn, concurrency limits,
// convolution and pooling, and dispatching an agent's tool calls.
import { py, type Drill } from "../types";
import { callText, fnTests, lit, NOMBRES, type Case } from "./kit";

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export const DRILLS_TEMAS: Drill[] = [
  {
    id: "g-formato",
    mission: "w3-seaborn",
    title: "Formato largo y formato ancho",
    skills: ["pandas", "transformacion"],
    difficulty: 2,
    packages: ["pandas"],
    hints: ["De ancho a largo: df.melt(id_vars=..., var_name=..., value_name=...).", "De largo a ancho: df.pivot(index=..., columns=..., values=...)."],
    make(r) {
      const idCol = r.pick(["tienda", "alumno", "ciudad"]);
      const varCol = r.pick(["mes", "trimestre", "anio"]);
      const valCol = r.pick(["valor", "ventas", "nota"]);
      const varNames = varCol === "mes" ? ["ene", "feb", "mar", "abr"] : varCol === "trimestre" ? ["t1", "t2", "t3", "t4"] : ["a2023", "a2024", "a2025"];
      const kind = r.pick(["largo", "ancho"] as const);
      const make = () => {
        const ids = r.sample(NOMBRES.filter((n) => /^[A-Za-z]+$/.test(n)), r.int(2, 4));
        const vars = varNames.slice(0, r.int(2, varNames.length));
        const vals = ids.map(() => vars.map(() => r.int(0, 99)));
        return { ids, vars, vals };
      };
      const datasets = Array.from({ length: 4 }, make);
      if (kind === "largo") {
        const wide = (d: ReturnType<typeof make>) => ({ [idCol]: d.ids, ...Object.fromEntries(d.vars.map((v, j) => [v, d.vals.map((row) => row[j])])) });
        const rows = (d: ReturnType<typeof make>) => d.ids.flatMap((id, i) => d.vars.map((v, j) => [id, v, d.vals[i][j]])).sort((a, b) => cmp(String(a[0]), String(b[0])) || cmp(String(a[1]), String(b[1])));
        return {
          prompt: [`Escribe \`a_largo(df)\` que reciba una tabla ancha con la columna \`${idCol}\` y una columna por cada ${varCol}, y devuelva la tabla en formato largo con las columnas \`${idCol}\`, \`${varCol}\` y \`${valCol}\` (una fila por ${idCol} y ${varCol}; el orden de las filas no importa).`, "", `Por ejemplo, con \`pd.DataFrame(${lit(wide(datasets[0]))})\` el resultado tiene ${rows(datasets[0]).length} filas, entre ellas \`${lit(rows(datasets[0])[0])}\`.`],
          starter: py`import pandas as pd


def a_largo(df):
    return df
`,
          solution: py`import pandas as pd


def a_largo(df):
    return df.melt(id_vars=${lit(idCol)}, var_name=${lit(varCol)}, value_name=${lit(valCol)})
`,
          tests: py`
import pandas as pd


def _comprobar(datos, esperado):
    r, _ = t.call("a_largo", pd.DataFrame(datos))
    assert isinstance(r, pd.DataFrame), f"Devuelve un DataFrame, no {type(r).__name__}."
    assert list(r.columns) == ${lit([idCol, varCol, valCol])}, f"Las columnas deberían ser ${lit([idCol, varCol, valCol]).replace(/"/g, "'")}, no {list(r.columns)}."
    filas = sorted([str(a), str(b), int(c)] for a, b, c in r.values.tolist())
    assert filas == esperado, f"Se esperaban las filas {esperado}, pero hay {filas}."


def test_ejemplo():
    """El ejemplo del enunciado"""
    _comprobar(${lit(wide(datasets[0]))}, ${lit(rows(datasets[0]))})


def test_otros_datos():
    """Funciona con otras tablas"""
    for datos, esperado in ${lit(datasets.slice(1).map((d) => [wide(d), rows(d)]))}:
        _comprobar(datos, esperado)
`,
        };
      }
      const long = (d: ReturnType<typeof make>) => ({ [idCol]: d.ids.flatMap((id) => d.vars.map(() => id)), [varCol]: d.ids.flatMap(() => d.vars), [valCol]: d.vals.flat() });
      const nested = (d: ReturnType<typeof make>) => Object.fromEntries(d.vars.map((v, j) => [v, Object.fromEntries(d.ids.map((id, i) => [id, d.vals[i][j]]))]));
      return {
        prompt: [`Escribe \`a_ancho(df)\` que reciba una tabla larga con las columnas \`${idCol}\`, \`${varCol}\` y \`${valCol}\`, y devuelva la tabla ancha: una fila por ${idCol} (como índice) y una columna por cada ${varCol}.`, "", `Por ejemplo, con \`pd.DataFrame(${lit(long(datasets[0]))})\`, \`a_ancho(df).to_dict()\` es \`${lit(nested(datasets[0]))}\`.`],
        starter: py`import pandas as pd


def a_ancho(df):
    return df
`,
        solution: py`import pandas as pd


def a_ancho(df):
    return df.pivot(index=${lit(idCol)}, columns=${lit(varCol)}, values=${lit(valCol)})
`,
        tests: py`
import pandas as pd


def _comprobar(datos, esperado):
    r, _ = t.call("a_ancho", pd.DataFrame(datos))
    assert isinstance(r, pd.DataFrame), f"Devuelve un DataFrame, no {type(r).__name__}."
    obtenido = {str(c): {str(i): int(v) for i, v in col.items()} for c, col in r.to_dict().items()}
    assert obtenido == esperado, f"Se esperaba {esperado}, pero to_dict() da {obtenido}."


def test_ejemplo():
    """El ejemplo del enunciado"""
    _comprobar(${lit(long(datasets[0]))}, ${lit(nested(datasets[0]))})


def test_otros_datos():
    """Funciona con otras tablas"""
    for datos, esperado in ${lit(datasets.slice(1).map((d) => [long(d), nested(d)]))}:
        _comprobar(datos, esperado)
`,
      };
    },
  },
  {
    id: "g-concurrencia",
    mission: "eng-async",
    title: "Tareas con un límite de concurrencia",
    skills: ["asincronia", "concurrencia"],
    difficulty: 3,
    hints: ["Lleva una lista con el instante en que queda libre cada hueco (al principio, todos en 0).", "Cada tarea, en el orden de la lista, ocupa el hueco que antes quede libre: empieza entonces y termina tras su duración (heapq ayuda a sacar el mínimo)."],
    make(r) {
      const kind = r.pick(["fines", "total"] as const);
      const schedule = (ds: number[], k: number) => {
        const slots = Array(k).fill(0);
        return ds.map((d) => {
          let m = 0;
          for (let i = 1; i < k; i++) if (slots[i] < slots[m]) m = i;
          slots[m] += d;
          return slots[m];
        });
      };
      const cases: Case[] = Array.from({ length: 5 }, (_, i) => {
        const ds = Array.from({ length: r.int(3, 8) }, () => r.int(1, 9));
        const k = i === 1 ? 1 : i === 2 ? ds.length : r.int(2, Math.max(2, ds.length - 1));
        const fines = schedule(ds, k);
        return { args: [ds, k], expected: kind === "fines" ? fines : Math.max(...fines) };
      });
      const name = kind === "fines" ? "instantes_de_fin" : "tiempo_total";
      const what = kind === "fines" ? "la lista con el instante en que termina cada tarea" : "el instante en que termina la última tarea";
      return {
        prompt: [`Como con \`asyncio.Semaphore(limite)\`, solo pueden ejecutarse a la vez \`limite\` tareas. Las tareas, con las duraciones de la lista, empiezan en ese orden en cuanto queda un hueco libre (todas están listas en el instante 0). Escribe \`${name}(duraciones, limite)\` que devuelva ${what}.`, "", `Por ejemplo, \`${callText(name, cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`. Con límite 1 se ejecutan una detrás de otra; sin límite efectivo, todas a la vez.`],
        starter: py`import heapq


def ${name}(duraciones, limite):
    pass
`,
        solution: py`import heapq


def ${name}(duraciones, limite):
    libres = [0] * limite
    fines = []
    for d in duraciones:
        inicio = heapq.heappop(libres)
        fines.append(inicio + d)
        heapq.heappush(libres, inicio + d)
    return ${kind === "fines" ? "fines" : "max(fines)"}
`,
        tests: fnTests(name, cases),
      };
    },
  },
  {
    id: "g-convolucion",
    mission: "mv-vision",
    title: "Convolución y pooling a mano",
    skills: ["vision", "matrices"],
    difficulty: 3,
    hints: ["Recorre las posiciones de la salida con dos bucles y, en cada una, el trozo de la imagen que le corresponde.", "Las listas de listas se indexan como imagen[fila][columna]."],
    make(r) {
      const kinds = [
        { name: "correlacion", text: "la correlación **válida** (sin relleno) de la imagen con el núcleo de 2×2 `nucleo`: en cada posición, la suma de los productos elemento a elemento", sig: "imagen, nucleo" },
        { name: "max_pooling", text: "el **max-pooling** de 2×2 con paso 2: la imagen (de dimensiones pares) se divide en bloques de 2×2 y de cada bloque se queda el máximo", sig: "imagen" },
        { name: "relleno", text: "la imagen **rellenada** con un marco de ceros de 1 píxel alrededor (como el relleno «same» de una convolución de 3×3)", sig: "imagen" },
      ] as const;
      const kd = r.pick(kinds);
      const corr = (img: number[][], k: number[][]) => img.slice(0, img.length - 1).map((row, i) => row.slice(0, row.length - 1).map((_, j) => img[i][j] * k[0][0] + img[i][j + 1] * k[0][1] + img[i + 1][j] * k[1][0] + img[i + 1][j + 1] * k[1][1]));
      const pool = (img: number[][]) => Array.from({ length: img.length / 2 }, (_, i) => Array.from({ length: img[0].length / 2 }, (_, j) => Math.max(img[2 * i][2 * j], img[2 * i][2 * j + 1], img[2 * i + 1][2 * j], img[2 * i + 1][2 * j + 1])));
      const pad = (img: number[][]) => [Array(img[0].length + 2).fill(0), ...img.map((row) => [0, ...row, 0]), Array(img[0].length + 2).fill(0)];
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const h = kd.name === "max_pooling" ? 2 * r.int(1, 3) : r.int(2, 5);
        const w = kd.name === "max_pooling" ? 2 * r.int(1, 3) : r.int(2, 5);
        const img = Array.from({ length: h }, () => Array.from({ length: w }, () => r.int(0, 9)));
        if (kd.name === "correlacion") {
          const k = [[r.int(-2, 2), r.int(-2, 2)], [r.int(-2, 2), r.int(-2, 2)]];
          return { args: [img, k], expected: corr(img, k) };
        }
        return { args: [img], expected: kd.name === "max_pooling" ? pool(img) : pad(img) };
      });
      const solutions: Record<string, string> = {
        correlacion: py`def correlacion(imagen, nucleo):
    salida = []
    for i in range(len(imagen) - 1):
        fila = []
        for j in range(len(imagen[0]) - 1):
            fila.append(sum(imagen[i + a][j + b] * nucleo[a][b] for a in range(2) for b in range(2)))
        salida.append(fila)
    return salida
`,
        max_pooling: py`def max_pooling(imagen):
    return [
        [max(imagen[i][j], imagen[i][j + 1], imagen[i + 1][j], imagen[i + 1][j + 1]) for j in range(0, len(imagen[0]), 2)]
        for i in range(0, len(imagen), 2)
    ]
`,
        relleno: py`def relleno(imagen):
    ancho = len(imagen[0]) + 2
    return [[0] * ancho] + [[0] + fila + [0] for fila in imagen] + [[0] * ancho]
`,
      };
      return {
        prompt: [`Una imagen pequeña es una lista de listas de enteros (filas). Escribe \`${kd.name}(${kd.sig})\` que devuelva ${kd.text}, como lista de listas y sin NumPy.`, "", `Por ejemplo, \`${callText(kd.name, cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def ${kd.name}(${kd.sig}):
    return imagen
`,
        solution: solutions[kd.name],
        tests: fnTests(kd.name, cases),
      };
    },
  },
  {
    id: "g-herramientas",
    mission: "mv-agentes",
    title: "Despachar llamadas a herramientas",
    skills: ["agentes", "json", "seguridad"],
    difficulty: 3,
    hints: ["Para cada texto: json.loads dentro de try/except, comprueba que es un diccionario y que la herramienta está permitida.", "Llama con herramientas[nombre](**argumentos) y captura TypeError para los argumentos que no encajan."],
    make(r) {
      const all: Record<string, { args: string[]; f: (...xs: number[]) => number; py: string }> = {
        sumar: { args: ["a", "b"], f: (a, b) => a + b, py: "def sumar(a, b):\n    return a + b" },
        restar: { args: ["a", "b"], f: (a, b) => a - b, py: "def restar(a, b):\n    return a - b" },
        doble: { args: ["x"], f: (x) => 2 * x, py: "def doble(x):\n    return 2 * x" },
        maximo: { args: ["a", "b"], f: (a, b) => Math.max(a, b), py: "def maximo(a, b):\n    return max(a, b)" },
      };
      const names = Object.keys(all);
      const prefix = r.pick(["ok", "resultado", "obs"]);
      const allowed = r.sample(names, r.int(2, 3));
      const call = (): [string, string] => {
        const roll = r.next();
        if (roll < 0.12) return [r.pick(["{no es json", "42", "[\"sumar\"]"]), "error: JSON inválido"];
        const name = r.next() < 0.75 ? r.pick(allowed) : r.pick(names.concat(["borrar", "enviar_correo"]));
        if (!allowed.includes(name)) return [JSON.stringify({ herramienta: name, argumentos: {} }), `error: herramienta no permitida: ${name}`];
        const spec = all[name];
        if (r.next() < 0.2) return [JSON.stringify({ herramienta: name, argumentos: { z: 1 } }), `error: argumentos inválidos para ${name}`];
        const vals = spec.args.map(() => r.int(-20, 50));
        return [JSON.stringify({ herramienta: name, argumentos: Object.fromEntries(spec.args.map((a, i) => [a, vals[i]])) }), `${prefix}: ${spec.f(...vals)}`];
      };
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const calls = Array.from({ length: r.int(2, 5) }, call);
        return { args: [calls.map((c) => c[0])], expected: calls.map((c) => c[1]) };
      });
      return {
        prompt: [
          `Un agente recibe del modelo varias llamadas como texto JSON (\`{"herramienta": ..., "argumentos": {...}}\`). Solo están permitidas ${allowed.map((n) => `\`${n}\``).join(", ")} (ya definidas en \`PERMITIDAS\`). Escribe \`despachar(llamadas)\` que devuelva una observación por llamada, en orden:`,
          "",
          `- \`"${prefix}: <valor>"\` si se pudo ejecutar;`,
          "- `\"error: JSON inválido\"` si el texto no es JSON o no es un objeto;",
          "- `\"error: herramienta no permitida: <nombre>\"` si no está permitida;",
          "- `\"error: argumentos inválidos para <nombre>\"` si sus argumentos no encajan.",
          "",
          `Por ejemplo, \`${callText("despachar", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`,
        ],
        starter: py`import json

${names.map((n) => all[n].py).join("\n\n\n")}


PERMITIDAS = {${allowed.map((n) => `${lit(n)}: ${n}`).join(", ")}}


def despachar(llamadas):
    return [str(eval(llamada)) for llamada in llamadas]
`,
        solution: py`import json

${names.map((n) => all[n].py).join("\n\n\n")}


PERMITIDAS = {${allowed.map((n) => `${lit(n)}: ${n}`).join(", ")}}


def despachar(llamadas):
    salida = []
    for texto in llamadas:
        try:
            datos = json.loads(texto)
        except json.JSONDecodeError:
            datos = None
        if not isinstance(datos, dict):
            salida.append("error: JSON inválido")
            continue
        nombre = datos.get("herramienta")
        if nombre not in PERMITIDAS:
            salida.append(f"error: herramienta no permitida: {nombre}")
            continue
        try:
            salida.append(f"${prefix}: {PERMITIDAS[nombre](**datos.get('argumentos', {}))}")
        except TypeError:
            salida.append(f"error: argumentos inválidos para {nombre}")
    return salida
`,
        tests:
          fnTests("despachar", cases) +
          py`
def test_sin_eval():
    """No ejecuta el texto del modelo"""
    assert not t.calls("eval") and not t.calls("exec"), "Nunca uses eval/exec con lo que escribe el modelo: interpreta el JSON."
`,
      };
    },
  },
];
