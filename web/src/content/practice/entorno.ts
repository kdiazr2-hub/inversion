// Practice drills for the "Fuera del navegador" zone: paths, version requirements and Git.
import { py, type Drill, type Rng } from "../types";
import { callText, fnTests, lit, NOMBRES, PALABRAS, type Case } from "./kit";

/** Absolute path ("/a/b") after applying ``ruta`` from ``actual``, as a shell would. */
function normalize(actual: string, ruta: string, home: string): string {
  let text = ruta;
  if (text === "~" || text.startsWith("~/")) text = home + text.slice(1);
  const parts = text.startsWith("/") ? [] : actual.split("/").filter(Boolean);
  for (const p of text.split("/")) {
    if (p === "" || p === ".") continue;
    if (p === "..") parts.pop();
    else parts.push(p);
  }
  return "/" + parts.join("/");
}

function relative(desde: string, hasta: string): string {
  const a = desde.split("/").filter(Boolean);
  const b = hasta.split("/").filter(Boolean);
  let common = 0;
  while (common < a.length && common < b.length && a[common] === b[common]) common++;
  const out = [...Array(a.length - common).fill(".."), ...b.slice(common)];
  return out.length ? out.join("/") : ".";
}

const DIRS = ["datos", "src", "informes", "fotos", "proyecto", "notas", "copias", "pruebas", "docs", "scripts"];

function absPath(r: Rng, min: number, max: number): string {
  return "/" + r.sample(DIRS, r.int(min, max)).join("/");
}

type Version = number[];
const parseV = (v: string): Version => v.split(".").map(Number);
function cmpV(a: string, b: string): number {
  const x = parseV(a);
  const y = parseV(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return Math.sign(d);
  }
  return 0;
}
const OPS: Record<string, (c: number) => boolean> = {
  "==": (c) => c === 0,
  "!=": (c) => c !== 0,
  ">=": (c) => c >= 0,
  "<=": (c) => c <= 0,
  ">": (c) => c > 0,
  "<": (c) => c < 0,
};
function satisfies(version: string, condition: string): boolean {
  return condition.split(",").every((part) => {
    const m = /^(==|!=|>=|<=|>|<)(.+)$/.exec(part.trim())!;
    return OPS[m[1]!]!(cmpV(version, m[2]!));
  });
}

function randomVersion(r: Rng): string {
  const parts = [r.int(0, 3), r.int(0, 12)];
  if (r.next() < 0.6) parts.push(r.int(0, 15));
  return parts.join(".");
}

const MENSAJES = ["Primer commit", "Añade los datos de lluvia", "Corrige el cálculo de la media", "Separa la limpieza en una función", "Añade pruebas", "Documenta el README", "Ignora la carpeta .venv", "Cambia el formato de salida", "Añade el gráfico mensual", "Elimina código sin usar", "Renombra variables", "Actualiza las dependencias"];

function shortId(r: Rng, used: Set<string>): string {
  for (;;) {
    const id = Array.from({ length: 7 }, () => "0123456789abcdef"[r.int(0, 15)]).join("");
    if (!used.has(id)) {
      used.add(id);
      return id;
    }
  }
}

export const DRILLS_ENTORNO: Drill[] = [
  {
    id: "g-rutas",
    mission: "w2-terminal",
    title: "Rutas como las resuelve la terminal",
    skills: ["rutas", "terminal"],
    difficulty: 2,
    hints: [
      "Trabaja con una lista de carpetas: parte de la carpeta actual (o vacía si la ruta empieza por /) y recorre los trozos de ruta.split(\"/\").",
      "Salta los trozos vacíos y los \".\"; con \"..\" quita la última carpeta (si queda alguna); el resto se añade. Al final, \"/\" + \"/\".join(lista).",
    ],
    make(r) {
      const kind = r.pick(["normalizar", "relativa"] as const);
      if (kind === "normalizar") {
        const user = r.pick(NOMBRES.filter((n) => /^[A-Za-z]+$/.test(n))).toLowerCase();
        const home = `/home/${user}`;
        const tokens = () => {
          const segs: string[] = [];
          const n = r.int(2, 4);
          for (let i = 0; i < n; i++) segs.push(r.pick(["..", ".", r.pick(DIRS), r.pick(DIRS), ""]));
          return segs;
        };
        const ruta = (forceDots: boolean) => {
          const segs = tokens();
          if (forceDots) segs.splice(r.int(0, segs.length), 0, "..");
          const lead = r.pick(["", "", "/", "~/"]);
          const body = segs.join("/") || r.pick(DIRS);
          return lead === "~/" && r.next() < 0.2 ? "~" : lead + body;
        };
        const cases: Case[] = [];
        for (let i = 0; i < 6; i++) {
          const actual = i === 0 ? absPath(r, 2, 3) : r.next() < 0.2 ? "/" : absPath(r, 1, 3);
          const rt = i === 0 ? r.pick(DIRS) + "/../" + r.pick(DIRS) : i === 1 ? "../".repeat(r.int(4, 5)) + r.pick(DIRS) : ruta(i === 2);
          cases.push({ args: [actual, rt], expected: normalize(actual, rt, home) });
        }
        const ex = cases[0]!;
        return {
          prompt: [
            `Escribe \`normalizar(actual, ruta)\`: la ruta absoluta a la que lleva \`ruta\` desde la carpeta \`actual\`, como haría \`cd\`.`,
            "",
            `- Si \`ruta\` empieza por \`/\` es absoluta; \`~\` es la carpeta personal \`${home}\`.`,
            "- `.` y las barras repetidas no cambian nada; `..` sube un nivel, pero nunca por encima de `/`.",
            "- El resultado empieza por `/` y no termina en `/` (salvo que sea la raíz, `\"/\"`).",
            "",
            `Por ejemplo, \`${callText("normalizar", ex.args)}\` devuelve \`${lit(ex.expected)}\`.`,
          ],
          starter: py`def normalizar(actual, ruta):
    return actual + "/" + ruta
`,
          solution: py`def normalizar(actual, ruta):
    if ruta == "~" or ruta.startswith("~/"):
        ruta = ${lit(home)} + ruta[1:]
    partes = [] if ruta.startswith("/") else [p for p in actual.split("/") if p]
    for parte in ruta.split("/"):
        if parte in ("", "."):
            continue
        if parte == "..":
            if partes:
                partes.pop()
        else:
            partes.append(parte)
    return "/" + "/".join(partes)
`,
          tests: fnTests("normalizar", cases),
        };
      }
      const cases: Case[] = [];
      for (let i = 0; i < 6; i++) {
        const base = absPath(r, 1, 2);
        const desde = i === 4 ? base : base + (r.next() < 0.8 ? absPath(r, 1, 2) : "");
        const hasta = i === 4 ? base : i === 5 ? absPath(r, 1, 2) : base + absPath(r, 1, 2);
        cases.push({ args: [desde, hasta], expected: relative(desde, hasta) });
      }
      const ex = cases.find((c) => String(c.expected).startsWith("..")) ?? cases[0]!;
      cases.splice(cases.indexOf(ex), 1);
      cases.unshift(ex);
      return {
        prompt: [
          "Escribe `relativa(desde, hasta)`: la ruta relativa que lleva de la carpeta `desde` a `hasta` (las dos absolutas), como la que escribirías en la terminal.",
          "",
          "Quita la parte inicial que comparten; por cada carpeta que le quede a `desde`, sube con `..`; después baja por las carpetas que le queden a `hasta`. Si son la misma carpeta, devuelve `\".\"`.",
          "",
          `Por ejemplo, \`${callText("relativa", ex.args)}\` devuelve \`${lit(ex.expected)}\`.`,
        ],
        starter: py`def relativa(desde, hasta):
    return hasta
`,
        solution: py`def relativa(desde, hasta):
    a = [p for p in desde.split("/") if p]
    b = [p for p in hasta.split("/") if p]
    comunes = 0
    while comunes < len(a) and comunes < len(b) and a[comunes] == b[comunes]:
        comunes += 1
    partes = [".."] * (len(a) - comunes) + b[comunes:]
    return "/".join(partes) or "."
`,
        tests: fnTests("relativa", cases),
      };
    },
  },
  {
    id: "g-versiones",
    mission: "w2-entornos",
    title: "Comparar versiones",
    skills: ["versiones", "dependencias"],
    difficulty: 2,
    hints: [
      "Convierte cada versión en una lista de enteros: [int(x) for x in v.split(\".\")]. Así 10 es mayor que 9.",
      "Para que 1.4 y 1.4.0 sean iguales, rellena con ceros la más corta antes de comparar.",
    ],
    make(r) {
      const kind = r.pick(["cumple", "reciente"] as const);
      if (kind === "cumple") {
        const conds = (): string => {
          const base = randomVersion(r);
          const shape = r.int(0, 4);
          if (shape === 0) return `==${base}`;
          if (shape === 1) return `!=${base}`;
          if (shape === 2) {
            const top = `${parseV(base)[0]! + 1}`;
            return `>=${base},<${top}`;
          }
          return `${r.pick([">", "<", ">=", "<="])}${base}`;
        };
        const cases: Case[] = [];
        // A version that differs only in trailing zeros and the 9 < 10 trap are always tested.
        const v = randomVersion(r);
        const padded = `${v}.0`;
        cases.push({ args: [`1.${r.int(10, 19)}.${r.int(0, 5)}`, `>=1.${r.int(2, 9)}`], expected: true });
        cases.push({ args: [padded, `==${v}`], expected: true });
        cases.push({ args: [`2.${r.int(2, 9)}`, `<2.${r.int(10, 19)}`], expected: true });
        while (cases.length < 9) {
          const c = conds();
          const version = r.next() < 0.5 ? randomVersion(r) : c.split(",")[0]!.replace(/^[<>=!]+/, "");
          cases.push({ args: [version, c], expected: satisfies(version, c) });
        }
        if (cases.every((c) => c.expected === true)) cases.push({ args: ["0.9", ">=1.0"], expected: false });
        const ex = cases[0]!;
        return {
          prompt: [
            "Escribe `cumple(version, condicion)`: `True` si la versión cumple todas las condiciones, separadas por comas, como en `requirements.txt`.",
            "",
            "- Las versiones son números separados por puntos y se comparan número a número: `1.10` es posterior a `1.9`.",
            "- `1.4` y `1.4.0` son la misma versión.",
            "- Operadores: `==`, `!=`, `>=`, `<=`, `>` y `<`.",
            "",
            `Por ejemplo, \`${callText("cumple", ex.args)}\` devuelve \`${lit(ex.expected)}\`.`,
          ],
          starter: py`def cumple(version, condicion):
    return True
`,
          solution: py`def _numeros(v, largo):
    partes = [int(x) for x in v.split(".")]
    return partes + [0] * (largo - len(partes))


def comparar(a, b):
    largo = max(len(a.split(".")), len(b.split(".")))
    x, y = _numeros(a, largo), _numeros(b, largo)
    return (x > y) - (x < y)


def cumple(version, condicion):
    for parte in condicion.split(","):
        parte = parte.strip()
        for op in ("==", "!=", ">=", "<=", ">", "<"):
            if parte.startswith(op):
                c = comparar(version, parte[len(op):])
                ok = {"==": c == 0, "!=": c != 0, ">=": c >= 0, "<=": c <= 0, ">": c > 0, "<": c < 0}[op]
                if not ok:
                    return False
                break
    return True
`,
          tests: fnTests("cumple", cases),
        };
      }
      const cases: Case[] = [];
      for (let i = 0; i < 5; i++) {
        let vs: string[];
        if (i === 0) {
          const major = r.int(0, 3);
          vs = r.shuffle([`${major}.9`, `${major}.${r.int(10, 19)}`, `${major}.${r.int(2, 8)}.${r.int(1, 9)}`]);
        } else {
          const n = r.int(2, 5);
          const seen = new Set<string>();
          vs = [];
          while (vs.length < n) {
            const v = randomVersion(r);
            const key = parseV(v).concat([0, 0, 0]).slice(0, 3).join(".");
            if (!seen.has(key)) {
              seen.add(key);
              vs.push(v);
            }
          }
        }
        cases.push({ args: [vs], expected: vs.reduce((a, b) => (cmpV(a, b) >= 0 ? a : b)) });
      }
      const ex = cases[0]!;
      return {
        prompt: [
          "Escribe `mas_reciente(versiones)`: la versión más reciente de la lista, tal como aparece en ella.",
          "",
          "Las versiones son números separados por puntos y se comparan número a número (`1.10` es posterior a `1.9`; a una versión corta le faltan ceros: `2.1` es `2.1.0`). No hay dos versiones iguales.",
          "",
          `Por ejemplo, \`${callText("mas_reciente", ex.args)}\` devuelve \`${lit(ex.expected)}\`.`,
        ],
        starter: py`def mas_reciente(versiones):
    return max(versiones)
`,
        solution: py`def mas_reciente(versiones):
    def clave(v):
        partes = [int(x) for x in v.split(".")]
        return partes + [0] * (3 - len(partes))

    return max(versiones, key=clave)
`,
        tests: fnTests("mas_reciente", cases),
      };
    },
  },
  {
    id: "g-git",
    mission: "w2-git",
    title: "Estado e historial de un repositorio",
    skills: ["git", "control-de-versiones"],
    difficulty: 3,
    hints: [
      "Para el estado: un archivo es nuevo si no estaba en el último commit, eliminado si ya no está en la carpeta y modificado si está en los dos con distinto contenido. Devuelve listas ordenadas.",
      "Para el historial: empieza en el commit indicado y sigue el campo \"padre\" hasta llegar a None, guardando el mensaje de cada commit.",
    ],
    make(r) {
      const kind = r.pick(["estado", "historial"] as const);
      if (kind === "estado") {
        const make = () => {
          const names = r.sample([...PALABRAS.map((p) => `${p}.py`), "LEEME.md", "datos.csv", "notas.txt", "requirements.txt", ".gitignore"], r.int(4, 7));
          const confirmado: Record<string, string> = {};
          const trabajo: Record<string, string> = {};
          for (const n of names) {
            const roll = r.int(0, 3);
            const content = `${r.pick(PALABRAS)} ${r.int(1, 99)}\n`;
            if (roll === 0) trabajo[n] = content; // new
            else if (roll === 1) confirmado[n] = content; // deleted
            else if (roll === 2) {
              confirmado[n] = content;
              trabajo[n] = content.replace(/\d+/, (d) => String(Number(d) + r.int(1, 9)));
            } else confirmado[n] = trabajo[n] = content;
          }
          const sorted = (xs: string[]) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
          return {
            args: [confirmado, trabajo],
            expected: {
              nuevos: sorted(Object.keys(trabajo).filter((n) => !(n in confirmado))),
              modificados: sorted(Object.keys(trabajo).filter((n) => n in confirmado && confirmado[n] !== trabajo[n])),
              eliminados: sorted(Object.keys(confirmado).filter((n) => !(n in trabajo))),
            },
          };
        };
        const cases: Case[] = Array.from({ length: 5 }, make);
        let ex = cases[0]!;
        const busy = (c: Case) => Object.values(c.expected as Record<string, string[]>).filter((l) => l.length).length;
        for (let tries = 0; busy(ex) < 2 && tries < 20; tries++) ex = make();
        cases[0] = ex;
        return {
          prompt: [
            "Escribe `estado(confirmado, trabajo)`, como `git status`: los dos argumentos son diccionarios nombre de archivo → contenido (el último commit y la carpeta de trabajo).",
            "",
            "Devuelve `{\"nuevos\": [...], \"modificados\": [...], \"eliminados\": [...]}` con los nombres ordenados: nuevos son los que no estaban en el commit, eliminados los que ya no están en la carpeta y modificados los que están en los dos con distinto contenido.",
            "",
            `Por ejemplo, \`${callText("estado", ex.args)}\` devuelve \`${lit(ex.expected)}\`.`,
          ],
          starter: py`def estado(confirmado, trabajo):
    return {"nuevos": [], "modificados": [], "eliminados": []}
`,
          solution: py`def estado(confirmado, trabajo):
    return {
        "nuevos": sorted(n for n in trabajo if n not in confirmado),
        "modificados": sorted(n for n in trabajo if n in confirmado and trabajo[n] != confirmado[n]),
        "eliminados": sorted(n for n in confirmado if n not in trabajo),
    }
`,
          tests: fnTests("estado", cases),
        };
      }
      const make = () => {
        const used = new Set<string>();
        const msgs = r.shuffle(MENSAJES);
        const commits: Record<string, { padre: string | null; mensaje: string }> = {};
        const main: string[] = [];
        let parent: string | null = null;
        for (let i = 0, n = r.int(3, 6); i < n; i++) {
          const id = shortId(r, used);
          commits[id] = { padre: parent, mensaje: msgs.pop()! };
          main.push(id);
          parent = id;
        }
        const branch: string[] = [];
        let bp: string | null = main[r.int(0, main.length - 2)]!;
        for (let i = 0, n = r.int(1, 2); i < n; i++) {
          const id = shortId(r, used);
          commits[id] = { padre: bp, mensaje: msgs.pop()! };
          branch.push(id);
          bp = id;
        }
        const head = r.next() < 0.6 ? main[main.length - 1]! : branch[branch.length - 1]!;
        const log: string[] = [];
        for (let c: string | null = head; c; c = commits[c]!.padre) log.push(commits[c]!.mensaje);
        const shuffled = Object.fromEntries(r.shuffle(Object.entries(commits)));
        return { args: [shuffled, head], expected: log };
      };
      const cases: Case[] = Array.from({ length: 5 }, make);
      const ex = cases[0]!;
      return {
        prompt: [
          "Escribe `historial(commits, inicio)`, como `git log`: `commits` es un diccionario identificador → `{\"padre\": identificador o None, \"mensaje\": texto}`.",
          "",
          "Devuelve la lista de mensajes desde el commit `inicio` hacia atrás, siguiendo los padres hasta el primer commit (el que tiene `None`). Los commits de otras ramas no aparecen.",
          "",
          `Por ejemplo, \`${callText("historial", ex.args)}\` devuelve \`${lit(ex.expected)}\`.`,
        ],
        starter: py`def historial(commits, inicio):
    return [c["mensaje"] for c in commits.values()]
`,
        solution: py`def historial(commits, inicio):
    mensajes = []
    actual = inicio
    while actual is not None:
        mensajes.append(commits[actual]["mensaje"])
        actual = commits[actual]["padre"]
    return mensajes
`,
        tests: fnTests("historial", cases),
      };
    },
  },
];
