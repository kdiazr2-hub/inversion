// Practice drills for World 5 (SQL with SQLite, nested JSON and data validation).
import { py, type Drill } from "../types";
import { CIUDADES, fnTests, lit, NOMBRES, PALABRAS, PRODUCTOS, sqlTests, type Case } from "./kit";

const byName = (a: { nombre: string }, b: { nombre: string }) => (a.nombre < b.nombre ? -1 : a.nombre > b.nombre ? 1 : 0);
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
/** Python repr of a list of tuples, for prompts. */
const tuples = (rows: unknown[][]) => `[${rows.map((x) => `(${x.map(lit).join(", ")}${x.length === 1 ? "," : ""})`).join(", ")}]`;

/** Starter/solution body that builds the example database from a literal. */
const exampleDb = (schema: string, inserts: string[], names: string[], tables: unknown[][][]) => py`import sqlite3

${names.map((n, i) => `${n} = ${lit(tables[i])}`).join("\n")}


def crear_bd():
    con = sqlite3.connect(":memory:")
    con.executescript(${lit(schema)})
${inserts.map((sql, i) => `    con.executemany(${lit(sql)}, [tuple(f) for f in ${names[i]}])`).join("\n")}
    return con`;

export const DRILLS_W5: Drill[] = [
  {
    id: "g-sql-filtro",
    mission: "db-sql",
    title: "Consultas con WHERE y ORDER BY",
    skills: ["sql"],
    difficulty: 2,
    packages: ["sqlite3"],
    hints: ["Escribe la consulta por partes: SELECT columnas FROM tabla WHERE condición ORDER BY columnas.", "Ejecuta con con.execute(sql).fetchall(): devuelve una lista de tuplas."],
    make(r) {
      type P = { nombre: string; categoria: string; precio: number; stock: number };
      const cats = r.sample(["herramientas", "comida", "ropa", "libros"], 3);
      const table = (): P[] => r.sample(PRODUCTOS.concat(PALABRAS), r.int(6, 10)).map((nombre) => ({ nombre, categoria: r.pick(cats), precio: r.int(100, 9999) / 100, stock: r.pick([0, 0, r.int(1, 30), r.int(1, 30)]) }));
      const c = r.pick(cats);
      const k = r.int(1, 10);
      const a = r.int(10, 40);
      const b = a + r.int(15, 50);
      const n = r.int(2, 3);
      const kinds = [
        { text: `los productos de la categoría \`${c}\` con \`stock\` mayor que ${k}, del más caro al más barato (si empatan, por nombre). Columnas: \`nombre\`, \`precio\``, sql: `SELECT nombre, precio FROM productos WHERE categoria = '${c}' AND stock > ${k} ORDER BY precio DESC, nombre`, f: (t: P[]) => t.filter((x) => x.categoria === c && x.stock > k).sort((x, y) => y.precio - x.precio || byName(x, y)).map((x) => [x.nombre, x.precio]) },
        { text: `los productos con precio entre ${a} y ${b} (ambos incluidos), por nombre. Columnas: \`nombre\`, \`categoria\``, sql: `SELECT nombre, categoria FROM productos WHERE precio BETWEEN ${a} AND ${b} ORDER BY nombre`, f: (t: P[]) => t.filter((x) => x.precio >= a && x.precio <= b).sort(byName).map((x) => [x.nombre, x.categoria]) },
        { text: `los productos agotados (\`stock\` 0) **o** con precio mayor que ${b}, ordenados por categoría y nombre. Columnas: \`nombre\``, sql: `SELECT nombre FROM productos WHERE stock = 0 OR precio > ${b} ORDER BY categoria, nombre`, f: (t: P[]) => t.filter((x) => x.stock === 0 || x.precio > b).sort((x, y) => cmp(x.categoria, y.categoria) || byName(x, y)).map((x) => [x.nombre]) },
        { text: `los ${n} productos más baratos de la categoría \`${c}\` (si empatan, por nombre). Columnas: \`nombre\`, \`precio\``, sql: `SELECT nombre, precio FROM productos WHERE categoria = '${c}' ORDER BY precio, nombre LIMIT ${n}`, f: (t: P[]) => t.filter((x) => x.categoria === c).sort((x, y) => x.precio - y.precio || byName(x, y)).slice(0, n).map((x) => [x.nombre, x.precio]) },
      ];
      const kd = r.pick(kinds);
      const schema = "CREATE TABLE productos (nombre TEXT, categoria TEXT, precio REAL, stock INTEGER);";
      const insert = "INSERT INTO productos VALUES (?, ?, ?, ?)";
      let tables: P[][];
      do tables = Array.from({ length: 4 }, table);
      while (kd.f(tables[0]).length === 0);
      const asRows = (t: P[]) => t.map((x) => [x.nombre, x.categoria, x.precio, x.stock]);
      const cases = tables.map((t) => ({ tables: [asRows(t)], expected: kd.f(t) }));
      const db = exampleDb(schema, [insert], ["PRODUCTOS"], [asRows(tables[0])]);
      return {
        prompt: [`La tabla \`productos(nombre, categoria, precio, stock)\` está en una base SQLite. Escribe \`consulta(con)\` que devuelva, como lista de tuplas, ${kd.text}.`, "", `Con la base de ejemplo (\`crear_bd()\`), \`consulta(crear_bd())\` devuelve \`${tuples(cases[0].expected)}\`.`],
        starter: py`${db}


def consulta(con):
    return []
`,
        solution: py`${db}


def consulta(con):
    return con.execute("${kd.sql}").fetchall()
`,
        tests: sqlTests("consulta", schema, [insert], cases),
      };
    },
  },
  {
    id: "g-sql-agrupar",
    mission: "db-sql",
    title: "GROUP BY y HAVING",
    skills: ["sql", "agrupacion"],
    difficulty: 3,
    packages: ["sqlite3"],
    hints: ["GROUP BY columna junta las filas de cada grupo; COUNT(*), SUM(), AVG() y MAX() resumen cada grupo.", "HAVING filtra grupos después de agregar (WHERE filtra filas antes)."],
    make(r) {
      type V = { region: string; producto: string; importe: number };
      const regiones = r.sample(["norte", "sur", "este", "oeste", "centro"], 4);
      const prods = r.sample(PRODUCTOS, 4);
      const table = (): V[] => Array.from({ length: r.int(7, 14) }, () => ({ region: r.pick(regiones), producto: r.pick(prods), importe: r.int(100, 9999) / 100 }));
      const k = r.int(2, 3);
      const s = r.int(4, 12) * 10;
      const group = (t: V[], by: "region" | "producto") => {
        const g: Record<string, number[]> = {};
        for (const x of t) (g[x[by]] ??= []).push(x.importe);
        return Object.entries(g);
      };
      const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
      const kinds = [
        { text: `para cada región con al menos ${k} ventas, cuántas ventas tiene. Columnas: \`region\`, \`n\`; ordenadas por \`n\` descendente y región`, sql: `SELECT region, COUNT(*) AS n FROM ventas GROUP BY region HAVING COUNT(*) >= ${k} ORDER BY n DESC, region`, f: (t: V[]) => group(t, "region").filter(([, xs]) => xs.length >= k).map(([g, xs]) => [g, xs.length] as [string, number]).sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])) },
        { text: `para cada producto cuyo importe total supera ${s}, ese total. Columnas: \`producto\`, \`total\`; ordenados por total descendente`, sql: `SELECT producto, SUM(importe) AS total FROM ventas GROUP BY producto HAVING SUM(importe) > ${s} ORDER BY total DESC`, f: (t: V[]) => group(t, "producto").map(([g, xs]) => [g, sum(xs)] as [string, number]).filter(([, v]) => v > s).sort((a, b) => b[1] - a[1]) },
        { text: "el importe medio de cada región. Columnas: `region`, `media`; ordenadas por región", sql: "SELECT region, AVG(importe) AS media FROM ventas GROUP BY region ORDER BY region", f: (t: V[]) => group(t, "region").map(([g, xs]) => [g, sum(xs) / xs.length] as [string, number]).sort((a, b) => cmp(a[0], b[0])) },
        { text: "el importe máximo de cada producto. Columnas: `producto`, `maximo`; ordenados por producto", sql: "SELECT producto, MAX(importe) AS maximo FROM ventas GROUP BY producto ORDER BY producto", f: (t: V[]) => group(t, "producto").map(([g, xs]) => [g, Math.max(...xs)] as [string, number]).sort((a, b) => cmp(a[0], b[0])) },
      ];
      const kd = r.pick(kinds);
      const schema = "CREATE TABLE ventas (region TEXT, producto TEXT, importe REAL);";
      const insert = "INSERT INTO ventas VALUES (?, ?, ?)";
      let tables: V[][];
      do tables = Array.from({ length: 4 }, table);
      while (kd.f(tables[0]).length === 0 || tables.some((t) => new Set(kd.f(t).map((x) => x[1])).size !== kd.f(t).length && kd.sql.includes("total DESC")));
      const asRows = (t: V[]) => t.map((x) => [x.region, x.producto, x.importe]);
      const cases = tables.map((t) => ({ tables: [asRows(t)], expected: kd.f(t) }));
      const db = exampleDb(schema, [insert], ["VENTAS"], [asRows(tables[0])]);
      return {
        prompt: [`La tabla \`ventas(region, producto, importe)\` está en una base SQLite. Escribe \`resumen(con)\` que devuelva, como lista de tuplas, ${kd.text}.`, "", `Con la base de ejemplo, \`resumen(crear_bd())\` devuelve ${cases[0].expected.length} filas; la primera es \`(${lit(cases[0].expected[0][0])}, ${Number((cases[0].expected[0][1] as number).toFixed(4))})\`${Number.isInteger(cases[0].expected[0][1]) ? "" : " (redondeado aquí a 4 decimales)"}.`],
        starter: py`${db}


def resumen(con):
    return []
`,
        solution: py`${db}


def resumen(con):
    return con.execute("${kd.sql}").fetchall()
`,
        tests: sqlTests("resumen", schema, [insert], cases),
      };
    },
  },
  {
    id: "g-sql-join",
    mission: "db-joins",
    title: "Unir tablas con JOIN",
    skills: ["sql", "uniones"],
    difficulty: 3,
    packages: ["sqlite3"],
    hints: ["INNER JOIN solo deja las filas con pareja en las dos tablas; LEFT JOIN conserva todas las de la izquierda.", "COUNT(p.id) cuenta solo las filas con pedido (NULL no cuenta); COUNT(*) contaría también la fila vacía del LEFT JOIN."],
    make(r) {
      const kinds = [
        { text: "**todos** los clientes con su número de pedidos (0 si no tienen). Columnas: `nombre`, `pedidos`; ordenados por nombre", sql: "SELECT c.nombre, COUNT(p.id) AS pedidos FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id GROUP BY c.id ORDER BY c.nombre", key: "left-count" },
        { text: "los clientes que tienen pedidos, con su importe total. Columnas: `nombre`, `total`; ordenados por total descendente", sql: "SELECT c.nombre, SUM(p.importe) AS total FROM clientes c JOIN pedidos p ON p.cliente_id = c.id GROUP BY c.id ORDER BY total DESC", key: "inner-sum" },
        { text: "los clientes **sin** ningún pedido. Columnas: `nombre`; ordenados por nombre", sql: "SELECT c.nombre FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL ORDER BY c.nombre", key: "left-none" },
      ] as const;
      const kd = r.pick(kinds);
      const dataset = () => {
        const clientes = r.sample(NOMBRES, r.int(4, 7)).map((nombre, i) => ({ id: i + 1, nombre }));
        const conPedidos = r.sample(clientes, r.int(1, clientes.length - 1));
        const pedidos = Array.from({ length: r.int(conPedidos.length, conPedidos.length + 5) }, (_, i) => ({ id: i + 1, cliente_id: (i < conPedidos.length ? conPedidos[i] : r.pick(conPedidos)).id, importe: r.int(100, 9999) / 100 }));
        let expected: unknown[][];
        const total = (id: number) => pedidos.filter((p) => p.cliente_id === id).reduce((s, p) => s + p.importe, 0);
        const count = (id: number) => pedidos.filter((p) => p.cliente_id === id).length;
        if (kd.key === "left-count") expected = [...clientes].sort(byName).map((c) => [c.nombre, count(c.id)]);
        else if (kd.key === "inner-sum") expected = clientes.filter((c) => count(c.id) > 0).map((c) => [c.nombre, total(c.id)]).sort((a, b) => (b[1] as number) - (a[1] as number));
        else expected = [...clientes].filter((c) => count(c.id) === 0).sort(byName).map((c) => [c.nombre]);
        return { tables: [clientes.map((c) => [c.id, c.nombre]), pedidos.map((p) => [p.id, p.cliente_id, p.importe])], expected };
      };
      const schema = "CREATE TABLE clientes (id INTEGER PRIMARY KEY, nombre TEXT); CREATE TABLE pedidos (id INTEGER PRIMARY KEY, cliente_id INTEGER, importe REAL);";
      const inserts = ["INSERT INTO clientes VALUES (?, ?)", "INSERT INTO pedidos VALUES (?, ?, ?)"];
      const cases = Array.from({ length: 4 }, dataset);
      const db = exampleDb(schema, inserts, ["CLIENTES", "PEDIDOS"], cases[0].tables);
      return {
        prompt: [`Las tablas \`clientes(id, nombre)\` y \`pedidos(id, cliente_id, importe)\` están en una base SQLite. Escribe \`informe(con)\` que devuelva, como lista de tuplas, ${kd.text}.`, "", `Con la base de ejemplo, \`informe(crear_bd())\` devuelve ${cases[0].expected.length} filas${cases[0].expected.length ? `; la primera es para ${lit((cases[0].expected[0] as unknown[])[0])}` : ""}.`],
        starter: py`${db}


def informe(con):
    return []
`,
        solution: py`${db}


def informe(con):
    return con.execute("${kd.sql}").fetchall()
`,
        tests: sqlTests("informe", schema, inserts, cases),
      };
    },
  },
  {
    id: "g-sql-parametros",
    mission: "db-sql",
    title: "Consultas seguras con parámetros",
    skills: ["sql", "seguridad"],
    difficulty: 3,
    packages: ["sqlite3"],
    hints: ["Nunca pegues el texto del usuario dentro del SQL: escribe ? en su lugar y pasa los valores como tupla en execute.", "Para LIKE, el patrón con % se construye en Python: (f\"%{texto}%\",)."],
    make(r) {
      const kinds = [
        { text: "cuyo `nombre` **contiene** `texto`", col: "nombre", pat: 'f"%{texto}%"', bad: "'%\" + texto + \"%'", f: (x: string, s: string) => x.toLowerCase().includes(s.toLowerCase()) },
        { text: "cuya `ciudad` **empieza por** `texto`", col: "ciudad", pat: 'f"{texto}%"', bad: "'\" + texto + \"%'", f: (x: string, s: string) => x.toLowerCase().startsWith(s.toLowerCase()) },
        { text: "cuyo `nombre` **termina en** `texto`", col: "nombre", pat: 'f"%{texto}"', bad: "'%\" + texto + \"'", f: (x: string, s: string) => x.toLowerCase().endsWith(s.toLowerCase()) },
      ];
      const kd = r.pick(kinds);
      const ascii = (s: string) => /^[A-Za-z ]+$/.test(s);
      const personas = () => r.sample(NOMBRES.filter(ascii), r.int(5, 9)).map((nombre) => [nombre, r.pick(CIUDADES.filter(ascii))]);
      const searches = (rows: string[][]) => {
        const pick = r.pick(rows)[kd.col === "nombre" ? 0 : 1];
        const len = r.int(1, Math.min(3, pick.length));
        return kd.text.includes("termina") ? pick.slice(-len) : kd.text.includes("empieza") ? pick.slice(0, len) : pick.slice(r.int(0, pick.length - len), undefined).slice(0, len);
      };
      const inj = "' OR 1=1 --";
      const datasets = Array.from({ length: 3 }, personas);
      const cases = [
        ...datasets.map((rows) => {
          const s = searches(rows);
          return { tables: [rows], args: [s], expected: rows.filter((x) => kd.f(x[kd.col === "nombre" ? 0 : 1], s)).map((x) => x[0]).sort(cmp) };
        }),
        { tables: [datasets[0]], args: [inj], expected: [] as string[] },
      ];
      const schema = "CREATE TABLE personas (nombre TEXT, ciudad TEXT);";
      const insert = "INSERT INTO personas VALUES (?, ?)";
      const db = exampleDb(schema, [insert], ["PERSONAS"], [datasets[0]]);
      return {
        prompt: [
          `Esta función funciona, pero es vulnerable a **inyección SQL**: pega el texto del usuario dentro de la consulta. Reescríbela con parámetros \`?\`. \`buscar(con, texto)\` devuelve la lista de nombres de las personas ${kd.text}, ordenada por nombre (LIKE en SQLite no distingue mayúsculas en letras sin tilde).`,
          "",
          `Con la base de ejemplo, \`buscar(crear_bd(), ${lit(cases[0].args[0])})\` devuelve \`${lit(cases[0].expected)}\`, y \`buscar(crear_bd(), ${lit(inj)})\` debe devolver \`[]\` (con la versión vulnerable devuelve a todo el mundo).`,
        ],
        starter: py`${db}


def buscar(con, texto):
    sql = "SELECT nombre FROM personas WHERE ${kd.col} LIKE ${kd.bad} ORDER BY nombre"
    return [fila[0] for fila in con.execute(sql)]
`,
        solution: py`${db}


def buscar(con, texto):
    sql = "SELECT nombre FROM personas WHERE ${kd.col} LIKE ? ORDER BY nombre"
    return [fila[0] for fila in con.execute(sql, (${kd.pat},))]
`,
        tests:
          sqlTests("buscar", schema, [insert], cases) +
          py`
def test_parametros():
    """Usa parámetros en lugar de pegar el texto"""
    assert "?" in t.code, "Escribe ? en la consulta y pasa el valor como parámetro de execute."
`,
      };
    },
  },
  {
    id: "g-sql-ventana",
    mission: "db-ventanas",
    title: "Funciones de ventana",
    skills: ["sql", "analitica"],
    difficulty: 4,
    packages: ["sqlite3"],
    hints: ["Una función de ventana se escribe FUNCIÓN() OVER (PARTITION BY grupo ORDER BY orden) y conserva cada fila.", "SUM(x) OVER (PARTITION BY a ORDER BY b) acumula; LAG(x) trae la fila anterior; RANK() y ROW_NUMBER() numeran."],
    make(r) {
      type F = { jugador: string; partida: number; puntos: number };
      const table = (): F[] => {
        const js = r.sample(NOMBRES, r.int(2, 4));
        const rows: F[] = [];
        for (const j of js) {
          const pts = r.sample(Array.from({ length: 60 }, (_, i) => i + 1), r.int(2, 4));
          pts.forEach((p, i) => rows.push({ jugador: j, partida: i + 1, puntos: p }));
        }
        return r.shuffle(rows);
      };
      const byJP = (a: F, b: F) => cmp(a.jugador, b.jugador) || a.partida - b.partida;
      const kinds = [
        { text: "para cada fila, los puntos acumulados del jugador hasta esa partida. Columnas: `jugador`, `partida`, `acumulado`; ordenadas por jugador y partida", sql: "SELECT jugador, partida, SUM(puntos) OVER (PARTITION BY jugador ORDER BY partida) AS acumulado FROM partidas ORDER BY jugador, partida", f: (t: F[]) => { const acc: Record<string, number> = {}; return [...t].sort(byJP).map((x) => [x.jugador, x.partida, (acc[x.jugador] = (acc[x.jugador] ?? 0) + x.puntos)]); } },
        { text: "para cada fila, la diferencia de puntos con la partida anterior del mismo jugador (`None` en su primera partida). Columnas: `jugador`, `partida`, `diferencia`; ordenadas por jugador y partida", sql: "SELECT jugador, partida, puntos - LAG(puntos) OVER (PARTITION BY jugador ORDER BY partida) AS diferencia FROM partidas ORDER BY jugador, partida", f: (t: F[]) => { const prev: Record<string, number> = {}; return [...t].sort(byJP).map((x) => { const d = x.jugador in prev ? x.puntos - prev[x.jugador] : null; prev[x.jugador] = x.puntos; return [x.jugador, x.partida, d]; }); } },
        { text: "la mejor partida (más puntos) de cada jugador, con `ROW_NUMBER()`. Columnas: `jugador`, `partida`, `puntos`; ordenadas por jugador", sql: "SELECT jugador, partida, puntos FROM (SELECT jugador, partida, puntos, ROW_NUMBER() OVER (PARTITION BY jugador ORDER BY puntos DESC) AS rn FROM partidas) WHERE rn = 1 ORDER BY jugador", f: (t: F[]) => { const best: Record<string, F> = {}; for (const x of t) if (!best[x.jugador] || x.puntos > best[x.jugador].puntos) best[x.jugador] = x; return Object.values(best).sort((a, b) => cmp(a.jugador, b.jugador)).map((x) => [x.jugador, x.partida, x.puntos]); } },
        { text: "para cada número de partida, el jugador con más puntos (o todos los empatados en cabeza), usando `RANK()`. Columnas: `partida`, `jugador`, `puntos`; ordenadas por partida y jugador", sql: "SELECT partida, jugador, puntos FROM (SELECT partida, jugador, puntos, RANK() OVER (PARTITION BY partida ORDER BY puntos DESC) AS puesto FROM partidas) WHERE puesto = 1 ORDER BY partida, jugador", f: (t: F[]) => { const top: Record<number, number> = {}; for (const x of t) top[x.partida] = Math.max(top[x.partida] ?? -1, x.puntos); return t.filter((x) => x.puntos === top[x.partida]).sort((a, b) => a.partida - b.partida || cmp(a.jugador, b.jugador)).map((x) => [x.partida, x.jugador, x.puntos]); } },
      ];
      const kd = r.pick(kinds);
      const schema = "CREATE TABLE partidas (jugador TEXT, partida INTEGER, puntos INTEGER);";
      const insert = "INSERT INTO partidas VALUES (?, ?, ?)";
      const tables = Array.from({ length: 4 }, table);
      const asRows = (t: F[]) => t.map((x) => [x.jugador, x.partida, x.puntos]);
      const cases = tables.map((t) => ({ tables: [asRows(t)], expected: kd.f(t) }));
      const db = exampleDb(schema, [insert], ["PARTIDAS"], [asRows(tables[0])]);
      const first = cases[0].expected[0] as unknown[];
      return {
        prompt: [`La tabla \`partidas(jugador, partida, puntos)\` guarda los puntos de cada jugador en cada partida. Escribe \`ventana(con)\` que devuelva, como lista de tuplas, ${kd.text}.`, "", `Con la base de ejemplo la primera fila es \`${tuples([first]).slice(1, -1)}\`.`],
        starter: py`${db}


def ventana(con):
    return []
`,
        solution: py`${db}


def ventana(con):
    return con.execute("${kd.sql}").fetchall()
`,
        tests:
          sqlTests("ventana", schema, [insert], cases) +
          py`
def test_ventana():
    """Usa una función de ventana"""
    assert "OVER" in t.code.upper(), "Resuélvelo con una función de ventana (... OVER (...))."
`,
      };
    },
  },
  {
    id: "g-json-aplanar",
    mission: "db-json-anidado",
    title: "Aplanar diccionarios anidados",
    skills: ["json", "recursion"],
    difficulty: 3,
    hints: ["Recorre las claves: si el valor es un diccionario, aplánalo también y añade el prefijo a sus claves.", "Una función recursiva con un parámetro prefijo (vacío al principio) lo resuelve en pocas líneas."],
    make(r) {
      const sep = r.pick(["_", ".", "__", "/"]);
      type N = { [k: string]: number | string | N };
      const nested = (depth: number): N => Object.fromEntries(r.sample(PALABRAS, r.int(1, 3)).map((k) => [k, depth > 0 && r.next() < 0.45 ? nested(depth - 1) : r.next() < 0.5 ? r.int(0, 99) : r.pick(CIUDADES)]));
      const flat = (o: N, prefix = ""): Record<string, number | string> => Object.entries(o).reduce<Record<string, number | string>>((acc, [k, v]) => (typeof v === "object" ? { ...acc, ...flat(v, prefix + k + sep) } : { ...acc, [prefix + k]: v }), {});
      const cases: Case[] = Array.from({ length: 5 }, (_, i) => {
        let o: N;
        do o = nested(3);
        while (i === 0 && !Object.values(o).some((v) => typeof v === "object"));
        return { args: [o], expected: flat(o) };
      });
      return {
        prompt: [`Escribe \`aplanar(registro)\` que convierta un diccionario anidado en uno plano: las claves anidadas se unen con \`${lit(sep)}\` y los valores que no son diccionarios se copian tal cual.`, "", `Por ejemplo, \`aplanar(${lit(cases[0].args[0])})\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def aplanar(registro):
    return {}
`,
        solution: py`def aplanar(registro, prefijo=""):
    plano = {}
    for clave, valor in registro.items():
        if isinstance(valor, dict):
            plano.update(aplanar(valor, prefijo + clave + ${lit(sep)}))
        else:
            plano[prefijo + clave] = valor
    return plano
`,
        tests: fnTests("aplanar", cases),
      };
    },
  },
  {
    id: "g-validar",
    mission: "db-calidad",
    title: "Validar registros",
    skills: ["calidad-datos", "validacion"],
    difficulty: 3,
    hints: ["Recorre las filas y añade el id de las que incumplen la regla, en el orden en que aparecen.", "Para fechas, datetime.strptime(texto, \"%Y-%m-%d\") lanza ValueError si la fecha no existe: captúralo con try/except."],
    make(r) {
      const pad = (n: number) => String(n).padStart(2, "0");
      const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      const days = (y: number, m: number) => [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
      const kinds = [
        {
          text: "la `fecha` no es una fecha real con formato `AAAA-MM-DD`",
          field: "fecha",
          good: () => { const y = r.int(2020, 2026); const m = r.int(1, 12); return `${y}-${pad(m)}-${pad(r.int(1, days(y, m)))}`; },
          bad: () => r.pick(["2025-02-30", "2025-13-01", "2023-02-29", "2025/03/01", "ayer", "", "2025-04-31", "01-02-2025"]),
          code: 'try:\n            datetime.strptime(fila["fecha"], "%Y-%m-%d")\n        except ValueError:\n            malos.append(fila["id"])',
          imports: "from datetime import datetime\n\n\n",
        },
        {
          text: "el `importe` no es un número o es negativo",
          field: "importe",
          good: () => String(r.int(0, 99999) / 100),
          bad: () => r.pick(["-5", "-0.5", "doce", "", "1,5", "N/A"]),
          code: 'try:\n            if float(fila["importe"]) < 0:\n                malos.append(fila["id"])\n        except ValueError:\n            malos.append(fila["id"])',
          imports: "",
        },
        {
          text: "el `correo` no tiene la forma `algo@algo.algo` (sin espacios ni más de una arroba)",
          field: "correo",
          good: () => `${r.pick(PALABRAS)}${r.int(1, 99)}@${r.pick(["correo", "gremio", "reino"])}.${r.pick(["es", "com", "org"])}`,
          bad: () => r.pick(["sin-arroba.com", "a@b", "dos@@arrobas.es", "con espacio@x.es", "@vacio.com", ""]),
          code: 'if not re.fullmatch(r"[^@\\s]+@[^@\\s]+\\.[^@\\s]+", fila["correo"]):\n            malos.append(fila["id"])',
          imports: "import re\n\n\n",
        },
      ];
      const kd = r.pick(kinds);
      const dataset = () => {
        const n = r.int(4, 8);
        const nBad = r.int(1, Math.min(3, n - 1));
        const badIdx = new Set(r.sample(Array.from({ length: n }, (_, i) => i), nBad));
        const rows = Array.from({ length: n }, (_, i) => ({ id: i + 1, [kd.field]: badIdx.has(i) ? kd.bad() : kd.good() }));
        return { rows, expected: rows.filter((_, i) => badIdx.has(i)).map((x) => x.id) };
      };
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const d = dataset();
        return { args: [d.rows], expected: d.expected };
      });
      return {
        prompt: [`Cada registro es un diccionario con \`id\` y \`${kd.field}\` (todo como texto, tal como llega de un CSV). Escribe \`invalidos(filas)\` que devuelva la lista de ids de los registros en los que ${kd.text}, en el orden en que aparecen.`, "", `Por ejemplo, \`invalidos(${lit(cases[0].args[0])})\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`${kd.imports}def invalidos(filas):
    malos = []
    return malos
`,
        solution: py`${kd.imports}def invalidos(filas):
    malos = []
    for fila in filas:
        ${kd.code}
    return malos
`,
        tests: fnTests("invalidos", cases),
      };
    },
  },
];
