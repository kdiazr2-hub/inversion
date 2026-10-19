// Building blocks for practice drills: the seeded generator, Python literals and the test code
// shared by most drills. Expected values are computed here in TypeScript and written into the
// tests; CI then runs every variant's reference solution against them, so a wrong expected value
// (or a wrong worked example in the prompt, which is always one of the test cases) fails the build.
import { py, type Rng } from "../types";

/** Number of variants of every drill. All of them are validated in CI. */
export const DRILL_VARIANTS = 40;

/** FNV-1a: a stable number from a drill id, so two drills never share their sequence of variants. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const shuffle = <T,>(xs: readonly T[]) => {
    const out = [...xs];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return {
    next,
    int,
    pick: (xs) => xs[int(0, xs.length - 1)],
    sample: (xs, k) => shuffle(xs).slice(0, k),
    shuffle,
  };
}

/** Python literal for JSON-like values (numbers, strings, booleans, null, arrays, plain objects). */
export function lit(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error(`Número no representable: ${v}`);
    return String(v);
  }
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(lit).join(", ")}]`;
  if (typeof v === "object") return `{${Object.entries(v as Record<string, unknown>).map(([k, x]) => `${JSON.stringify(k)}: ${lit(x)}`).join(", ")}}`;
  throw new Error(`Tipo no admitido: ${typeof v}`);
}

/** Python call text for prompts: f(3, "a"). */
export const callText = (name: string, args: unknown[]) => `${name}(${args.map(lit).join(", ")})`;

/** Rounds like a careful human would write the number (no float noise), for prompts. */
export const show = (x: number, digits = 6) => String(Number(x.toFixed(digits)));

/** A number for a prompt in code style, saying "aproximadamente" when the rounding hides digits. */
export const eq = (x: number, digits = 6) => (Number(x.toFixed(digits)) === x ? `\`${show(x, digits)}\`` : `aproximadamente \`${show(x, digits)}\``);

// Helpers available to every drill test. `_cerca` compares numbers with a tolerance and sequences
// and dicts element by element; `_comprobar` calls the learner's function with copies of the
// arguments and explains the usual mistake of printing instead of returning.
export const PREAMBLE = py`
import copy
import numbers


def _cerca(a, b, tol):
    if isinstance(b, bool):
        return a in (True, False) and bool(a) == b
    if b is None or isinstance(b, str):
        return a == b
    if isinstance(b, numbers.Real):
        return isinstance(a, numbers.Real) and not isinstance(a, bool) and approx(a, b, tol)
    if isinstance(b, (list, tuple)):
        return isinstance(a, (list, tuple)) and len(a) == len(b) and all(_cerca(x, y, tol) for x, y in zip(a, b))
    if isinstance(b, dict):
        return isinstance(a, dict) and set(a) == set(b) and all(_cerca(a[k], b[k], tol) for k in b)
    return a == b


def _llamada(nombre, args):
    return nombre + "(" + ", ".join(repr(a) for a in args) + ")"


def _comprobar(nombre, casos, tol):
    for args, esperado in casos:
        r, salida = t.call(nombre, *copy.deepcopy(args))
        if r is None and esperado is not None and salida.strip():
            raise AssertionError(f"{_llamada(nombre, args)} muestra {salida.strip()!r} con print, pero no devuelve nada: usa return.")
        assert _cerca(r, esperado, tol), f"{_llamada(nombre, args)} debería devolver {esperado!r}, pero devolvió {r!r}."
`;

export interface Case {
  args: unknown[];
  expected: unknown;
  /** Python literals when lit() cannot write the value (e.g. dicts with int keys). */
  expectedPy?: string;
  argsPy?: string;
}

/**
 * Tests for a function drill: the first case is the prompt's worked example, the rest use other
 * data so that hard-coding the example does not pass. `tol` is the relative tolerance for numbers.
 */
export function fnTests(name: string, cases: Case[], opts: { tol?: number; extra?: string } = {}): string {
  const tol = opts.tol ?? 1e-9;
  const rows = (cs: Case[]) => `[${cs.map((c) => `(${c.argsPy ?? lit(c.args)}, ${c.expectedPy ?? lit(c.expected)})`).join(", ")}]`;
  return `${PREAMBLE}

def test_ejemplo():
    """El ejemplo del enunciado"""
    _comprobar(${lit(name)}, ${rows(cases.slice(0, 1))}, ${tol})


def test_otros_datos():
    """Funciona con otros datos"""
    _comprobar(${lit(name)}, ${rows(cases.slice(1))}, ${tol})
${opts.extra ? `\n${opts.extra.trim()}\n` : ""}`;
}

export interface ProgramCase {
  stdin: string[];
  lines: string[];
}

/** Tests for a program that reads input() and prints: every case reruns the whole program. */
export function programTests(cases: ProgramCase[]): string {
  const rows = (cs: ProgramCase[]) => `[${cs.map((c) => `(${lit(c.stdin)}, ${lit(c.lines)})`).join(", ")}]`;
  return py`
def _comprobar_programa(casos):
    for entradas, esperadas in casos:
        salida = t.rerun(entradas)
        # input() repeats its prompt and the typed value in the output: compare the final lines.
        lineas = [linea.rstrip() for linea in salida.strip().splitlines()][-len(esperadas):]
        assert lineas == esperadas, (
            f"Con las entradas {entradas!r} se esperaba:\n" + "\n".join(esperadas)
            + "\npero tu programa mostró:\n" + (salida.strip() or "(nada)")
        )


def test_ejemplo():
    """El ejemplo del enunciado"""
    _comprobar_programa(${rows(cases.slice(0, 1))})


def test_otros_datos():
    """Funciona con otras entradas"""
    _comprobar_programa(${rows(cases.slice(1))})
`;
}

/** Static check appended to tests: the program must contain one of these syntax nodes. */
export const requireSyntax = (nodes: string[], message: string) => py`
def test_herramienta():
    """Usa la herramienta que se practica"""
    assert t.uses(${nodes.map(lit).join(", ")}), ${lit(message)}
`;

export const NOMBRES = ["Ada", "Alan", "Grace", "Linus", "Margaret", "Guido", "Katherine", "Hedy", "Barbara", "Dennis", "Frances", "Radia", "Donald", "Lucía", "Mateo", "Valentina", "Hugo", "Sofía", "Martín", "Elena"];
export const CIUDADES = ["Lima", "Quito", "Bogotá", "Madrid", "Sevilla", "Córdoba", "Montevideo", "Santiago", "Cusco", "Valparaíso", "Rosario", "Mendoza", "Cali", "Granada", "Bilbao"];
export const PALABRAS = ["sol", "luna", "rio", "bosque", "camino", "piedra", "nube", "fuego", "agua", "viento", "montana", "lago", "arbol", "estrella", "mapa", "llave", "puerta", "torre", "barco", "isla", "trigo", "plata", "hierro", "mar"];
export const PRODUCTOS = ["pan", "queso", "manzanas", "arroz", "leche", "café", "tomates", "aceite", "huevos", "lentejas", "yogur", "harina"];

/**
 * Tests for a function that receives a SQLite connection: each case builds an in-memory database
 * with `schema`, fills each table with its `inserts[i]` statement and `tables[i]` rows, calls the
 * function and compares the rows it returns (order matters).
 */
export function sqlTests(name: string, schema: string, inserts: string[], cases: { tables: unknown[][][]; args?: unknown[]; expected: unknown }[]): string {
  const rows = (cs: typeof cases) => `[${cs.map((c) => `(${lit(c.tables)}, ${lit(c.args ?? [])}, ${lit(c.expected)})`).join(", ")}]`;
  return `${PREAMBLE}
import sqlite3


def _bd(tablas):
    con = sqlite3.connect(":memory:")
    con.executescript(${lit(schema)})
    for sql, filas in zip(${lit(inserts)}, tablas):
        con.executemany(sql, [tuple(f) for f in filas])
    return con


def _comprobar_sql(casos):
    for tablas, args, esperado in casos:
        r, salida = t.call(${lit(name)}, _bd(tablas), *args)
        if r is None and salida.strip():
            raise AssertionError("Tu función muestra el resultado con print, pero no lo devuelve: usa return.")
        r = [list(x) if isinstance(x, (tuple, list)) else x for x in (r or [])]
        assert _cerca(r, esperado, 1e-9), f"Con los datos {tablas!r}{' y argumentos ' + repr(args) if args else ''} se esperaba {esperado!r}, pero obtuviste {r!r}."


def test_ejemplo():
    """El ejemplo del enunciado"""
    _comprobar_sql(${rows(cases.slice(0, 1))})


def test_otros_datos():
    """Funciona con otras tablas"""
    _comprobar_sql(${rows(cases.slice(1))})
`;
}
