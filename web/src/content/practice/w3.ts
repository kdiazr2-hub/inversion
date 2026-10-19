// Practice drills for World 3 (NumPy and pandas). Data are generated per variant; the expected
// results are computed here and checked against real NumPy/pandas when CI runs every variant.
import { py, type Drill } from "../types";
import { CIUDADES, lit, NOMBRES, PRODUCTOS, show } from "./kit";

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmtDict = (d: Record<string, number>) => `{${Object.entries(d).map(([k, v]) => `${lit(k)}: ${show(v)}`).join(", ")}}`;

/** Test helpers for functions that return a dict or a pandas Series. */
const DICT_TESTS = py`
def _como_dict(r):
    if hasattr(r, "to_dict") and not hasattr(r, "columns"):
        r = r.to_dict()
    assert isinstance(r, dict), f"Devuelve un diccionario o una Serie de pandas, no {type(r).__name__}."
    return {str(k): v for k, v in r.items()}


def _igual_dict(r, esperado, contexto):
    r = _como_dict(r)
    assert set(r) == set(esperado), f"{contexto}: las claves deberían ser {sorted(esperado)}, pero son {sorted(r)}."
    for k, v in esperado.items():
        assert approx(r[k], v, 1e-9), f"{contexto}: para {k!r} se esperaba {v!r}, pero obtuviste {r[k]!r}."
`;

export const DRILLS_W3: Drill[] = [
  {
    id: "g-numpy",
    mission: "w3-numpy",
    title: "Transformar un array sin bucles",
    skills: ["numpy", "vectorizacion"],
    difficulty: 2,
    packages: ["numpy"],
    hints: ["Las operaciones con arrays se aplican a todos los elementos a la vez: datos - datos.mean() resta la media a cada uno.", "Mira los métodos del array: mean(), std(ddof=…), min(), max() y sum()."],
    make(r) {
      const ops = [
        { text: "reescale los datos al intervalo [0, 1]: (x − mínimo) / (máximo − mínimo)", f: (xs: number[]) => { const lo = Math.min(...xs), hi = Math.max(...xs); return xs.map((x) => (x - lo) / (hi - lo)); }, code: "(datos - datos.min()) / (datos.max() - datos.min())" },
        { text: "calcule la puntuación z de cada dato usando la desviación típica **poblacional** (divide entre n)", f: (xs: number[]) => { const m = mean(xs); const sd = Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); return xs.map((x) => (x - m) / sd); }, code: "(datos - datos.mean()) / datos.std()" },
        { text: "calcule la puntuación z de cada dato usando la desviación típica **muestral** (divide entre n − 1)", f: (xs: number[]) => { const m = mean(xs); const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); return xs.map((x) => (x - m) / sd); }, code: "(datos - datos.mean()) / datos.std(ddof=1)" },
        { text: "exprese cada dato como proporción del total (cada dato dividido entre la suma de todos)", f: (xs: number[]) => { const s = xs.reduce((a, b) => a + b, 0); return xs.map((x) => x / s); }, code: "datos / datos.sum()" },
        { text: "centre los datos: reste la media a cada uno", f: (xs: number[]) => { const m = mean(xs); return xs.map((x) => x - m); }, code: "datos - datos.mean()" },
      ];
      const op = r.pick(ops);
      const cases = Array.from({ length: 5 }, () => {
        let xs: number[];
        do xs = Array.from({ length: r.int(4, 10) }, () => r.int(1, 100));
        while (Math.min(...xs) === Math.max(...xs));
        return { datos: xs, esperado: op.f(xs) };
      });
      return {
        prompt: [`Escribe \`normaliza(datos)\` que reciba un array de NumPy y devuelva otro array que ${op.text}. Hazlo con operaciones de arrays, **sin bucles**.`, "", `Por ejemplo, con \`np.array(${lit(cases[0].datos)})\` devuelve \`array(${lit(cases[0].esperado.map((x) => Number(x.toFixed(4))))})\` (redondeado aquí a 4 decimales).`],
        starter: py`import numpy as np


def normaliza(datos):
    return datos
`,
        solution: py`import numpy as np


def normaliza(datos):
    return ${op.code}
`,
        tests: py`
import numpy as np


def _comprobar(datos, esperado):
    r, _ = t.call("normaliza", np.array(datos, dtype=float))
    assert isinstance(r, np.ndarray), f"Devuelve un array de NumPy, no {type(r).__name__}."
    assert r.shape == (len(datos),), f"El resultado debería tener {len(datos)} elementos, pero tiene forma {r.shape}."
    assert np.allclose(r, esperado, rtol=1e-9, atol=1e-12), f"Con {datos} se esperaba {np.round(esperado, 6).tolist()}, pero obtuviste {np.round(r, 6).tolist()}."


def test_ejemplo():
    """El ejemplo del enunciado"""
    _comprobar(${lit(cases[0].datos)}, ${lit(cases[0].esperado)})


def test_otros_datos():
    """Funciona con otros datos"""
    for datos, esperado in ${lit(cases.slice(1).map((c) => [c.datos, c.esperado]))}:
        _comprobar(datos, esperado)


def test_sin_bucles():
    """Sin bucles: operaciones vectorizadas"""
    assert not t.uses("For", "While", "ListComp", "GeneratorExp"), "Resuélvelo sin bucles ni comprensiones: opera con el array entero."
`,
      };
    },
  },
  {
    id: "g-pandas-filtrar",
    mission: "w3-filtrar",
    title: "Filtrar filas de un DataFrame",
    skills: ["pandas", "transformacion"],
    difficulty: 2,
    packages: ["pandas"],
    hints: ["Una condición sobre una columna da una Serie de True/False: df[df[\"edad\"] >= 30] se queda con las filas True.", "Combina condiciones con & (y) y | (o), cada una entre paréntesis. Para «está en esta lista» usa .isin([...])."],
    make(r) {
      type Row = { nombre: string; ciudad: string; edad: number; gasto: number };
      const ciudades = r.sample(CIUDADES, 3);
      const a = r.int(25, 50);
      const g = r.int(20, 80) * 5;
      const [c1, c2] = ciudades;
      const conds = [
        { text: `las personas de **${c1}** con al menos ${a} años`, f: (x: Row) => x.ciudad === c1 && x.edad >= a, code: `df[(df["ciudad"] == ${lit(c1)}) & (df["edad"] >= ${a})]` },
        { text: `las personas que gastaron más de ${g} € **o** tienen menos de ${a} años`, f: (x: Row) => x.gasto > g || x.edad < a, code: `df[(df["gasto"] > ${g}) | (df["edad"] < ${a})]` },
        { text: `las personas de **${c1}** o de **${c2}** que gastaron como mucho ${g} €`, f: (x: Row) => (x.ciudad === c1 || x.ciudad === c2) && x.gasto <= g, code: `df[df["ciudad"].isin([${lit(c1)}, ${lit(c2)}]) & (df["gasto"] <= ${g})]` },
        { text: `las personas que **no** son de ${c1} y tienen entre ${a} y ${a + 15} años (ambos incluidos)`, f: (x: Row) => x.ciudad !== c1 && x.edad >= a && x.edad <= a + 15, code: `df[(df["ciudad"] != ${lit(c1)}) & df["edad"].between(${a}, ${a + 15})]` },
      ];
      const cond = r.pick(conds);
      const frame = (): Row[] => r.sample(NOMBRES, r.int(6, 12)).map((nombre) => ({ nombre, ciudad: r.pick(ciudades), edad: r.int(18, 75), gasto: r.int(0, 100) * 5 }));
      const frames = Array.from({ length: 4 }, frame);
      const asDict = (rows: Row[]) => ({ nombre: rows.map((x) => x.nombre), ciudad: rows.map((x) => x.ciudad), edad: rows.map((x) => x.edad), gasto: rows.map((x) => x.gasto) });
      const csv = "nombre,ciudad,edad,gasto\n" + frames[0].map((x) => `${x.nombre},${x.ciudad},${x.edad},${x.gasto}`).join("\n") + "\n";
      const expected0 = frames[0].filter(cond.f).map((x) => x.nombre);
      return {
        prompt: [`El archivo \`clientes.csv\` tiene las columnas \`nombre\`, \`ciudad\`, \`edad\` y \`gasto\`. Escribe \`filtra(df)\` que reciba un DataFrame con esas columnas y devuelva otro con solo ${cond.text}, en el orden original.`, "", `Con \`pd.read_csv("clientes.csv")\`, la columna \`nombre\` del resultado es \`${lit(expected0)}\`.`],
        starter: py`import pandas as pd


def filtra(df):
    return df
`,
        solution: py`import pandas as pd


def filtra(df):
    return ${cond.code}
`,
        tests: py`
import pandas as pd


def _comprobar(df, esperado, contexto):
    r, _ = t.call("filtra", df.copy())
    assert isinstance(r, pd.DataFrame), f"Devuelve un DataFrame, no {type(r).__name__}."
    assert list(r["nombre"]) == esperado, f"{contexto}: se esperaban las filas de {esperado}, pero obtuviste {list(r['nombre'])}."


def test_ejemplo():
    """El ejemplo del enunciado"""
    _comprobar(pd.read_csv("clientes.csv"), ${lit(expected0)}, "Con clientes.csv")


def test_otros_datos():
    """Funciona con otros clientes"""
    for datos, esperado in ${lit(frames.slice(1).map((f) => [asDict(f), f.filter(cond.f).map((x) => x.nombre)]))}:
        _comprobar(pd.DataFrame(datos), esperado, "Con otros datos")
`,
        files: { "clientes.csv": csv },
      };
    },
  },
  {
    id: "g-pandas-agrupar",
    mission: "w3-agrupar",
    title: "Agrupar y resumir",
    skills: ["pandas", "agrupacion"],
    difficulty: 3,
    packages: ["pandas"],
    hints: ["df.groupby(\"columna\")[\"otra\"] agrupa; después aplica .sum(), .mean(), .max(), .min() o .count().", "El resultado es una Serie cuyo índice son los grupos: puedes devolverla tal cual o convertirla con .to_dict()."],
    make(r) {
      type Row = { region: string; producto: string; importe: number };
      const regiones = r.sample(["norte", "sur", "este", "oeste", "centro"], 3);
      const productos = r.sample(PRODUCTOS, 3);
      const by = r.pick(["region", "producto"] as const);
      const aggs = [
        { name: "sum", text: "la suma de `importe`", f: (xs: number[]) => xs.reduce((a, b) => a + b, 0) },
        { name: "mean", text: "la media de `importe`", f: mean },
        { name: "max", text: "el `importe` máximo", f: (xs: number[]) => Math.max(...xs) },
        { name: "min", text: "el `importe` mínimo", f: (xs: number[]) => Math.min(...xs) },
        { name: "count", text: "cuántas ventas hay", f: (xs: number[]) => xs.length },
      ];
      const agg = r.pick(aggs);
      const frame = (): Row[] => Array.from({ length: r.int(6, 14) }, () => ({ region: r.pick(regiones), producto: r.pick(productos), importe: r.int(100, 9999) / 100 }));
      const summary = (rows: Row[]) => {
        const groups: Record<string, number[]> = {};
        for (const x of rows) (groups[x[by]] ??= []).push(x.importe);
        return Object.fromEntries(Object.entries(groups).map(([k, xs]) => [k, agg.f(xs)]));
      };
      const frames = Array.from({ length: 4 }, frame);
      const csv = "region,producto,importe\n" + frames[0].map((x) => `${x.region},${x.producto},${x.importe}`).join("\n") + "\n";
      const asDict = (rows: Row[]) => ({ region: rows.map((x) => x.region), producto: rows.map((x) => x.producto), importe: rows.map((x) => x.importe) });
      return {
        prompt: [`El archivo \`ventas.csv\` tiene las columnas \`region\`, \`producto\` e \`importe\`. Escribe \`resumen(df)\` que devuelva, para cada \`${by}\`, ${agg.text}.`, "", `Con \`pd.read_csv("ventas.csv")\` el resultado es \`${fmtDict(summary(frames[0]))}\` (como Serie o como diccionario; el orden no importa).`],
        starter: py`import pandas as pd


def resumen(df):
    pass
`,
        solution: py`import pandas as pd


def resumen(df):
    return df.groupby(${lit(by)})["importe"].${agg.name}()
`,
        tests: `${DICT_TESTS}
import pandas as pd


def test_ejemplo():
    """El ejemplo del enunciado"""
    r, _ = t.call("resumen", pd.read_csv("ventas.csv"))
    _igual_dict(r, ${lit(summary(frames[0]))}, "Con ventas.csv")


def test_otros_datos():
    """Funciona con otras ventas"""
    for datos, esperado in ${lit(frames.slice(1).map((f) => [asDict(f), summary(f)]))}:
        r, _ = t.call("resumen", pd.DataFrame(datos))
        _igual_dict(r, esperado, "Con otros datos")
`,
        files: { "ventas.csv": csv },
      };
    },
  },
  {
    id: "g-pandas-limpieza",
    mission: "w3-limpieza",
    title: "Limpiar duplicados y vacíos",
    skills: ["pandas", "limpieza"],
    difficulty: 3,
    packages: ["pandas"],
    hints: ["df.drop_duplicates() quita las filas repetidas (idénticas en todas las columnas).", "Para los vacíos: df[\"gasto\"].fillna(valor) los rellena y df.dropna(subset=[\"gasto\"]) elimina esas filas. Calcula la mediana o la media después de quitar duplicados.", "Si pandas avisa con SettingWithCopyWarning, trabaja sobre una copia: df = df.drop_duplicates().copy()."],
    make(r) {
      const modes = [
        { text: "rellena los vacíos de `gasto` con la **mediana** de esa columna", fill: (xs: number[]) => median(xs), code: 'df["gasto"] = df["gasto"].fillna(df["gasto"].median())' },
        { text: "rellena los vacíos de `gasto` con la **media** de esa columna", fill: (xs: number[]) => mean(xs), code: 'df["gasto"] = df["gasto"].fillna(df["gasto"].mean())' },
        { text: "rellena los vacíos de `gasto` con **0**", fill: () => 0, code: 'df["gasto"] = df["gasto"].fillna(0)' },
        { text: "**elimina** las filas que no tienen `gasto`", fill: null, code: 'df = df.dropna(subset=["gasto"])' },
      ];
      const mode = r.pick(modes);
      const dataset = () => {
        const base = r.sample(NOMBRES, r.int(5, 9)).map((n) => `${n},${r.pick(CIUDADES)},${r.next() < 0.3 ? "" : r.int(10, 400)}`);
        // Guarantee at least one gap and one known value, then add exact duplicates.
        base[0] = base[0].replace(/,[^,]*$/, ",");
        base[1] = base[1].replace(/,[^,]*$/, `,${r.int(10, 400)}`);
        const dups = Array.from({ length: r.int(1, 3) }, () => r.pick(base));
        const lines = [...base];
        for (const d of dups) lines.splice(r.int(1, lines.length), 0, d);
        return "nombre,ciudad,gasto\n" + lines.join("\n") + "\n";
      };
      const expect = (csv: string) => {
        const lines = csv.trim().split("\n").slice(1);
        const unique = lines.filter((l, i) => lines.indexOf(l) === i);
        const gastos = unique.map((l) => l.split(",")[2]);
        const known = gastos.filter((g) => g !== "").map(Number);
        if (!mode.fill) return { filas: known.length, suma: known.reduce((a, b) => a + b, 0) };
        const v = mode.fill(known);
        return { filas: unique.length, suma: gastos.reduce((s, g) => s + (g === "" ? v : Number(g)), 0) };
      };
      const csvs = Array.from({ length: 4 }, dataset);
      const e0 = expect(csvs[0]);
      return {
        prompt: [`El archivo \`gastos.csv\` tiene filas repetidas y huecos en la columna \`gasto\`. Escribe \`limpia(df)\` que primero quite las filas duplicadas y después ${mode.text}. Devuelve el DataFrame limpio.`, "", `Con \`pd.read_csv("gastos.csv")\` el resultado tiene ${e0.filas} filas y su columna \`gasto\` suma ${show(e0.suma)}.`],
        starter: py`import pandas as pd


def limpia(df):
    return df
`,
        solution: py`import pandas as pd


def limpia(df):
    df = df.drop_duplicates().copy()
    ${mode.code}
    return df
`,
        tests: py`
import io
import pandas as pd


def _comprobar(texto, filas, suma, contexto):
    r, _ = t.call("limpia", pd.read_csv(io.StringIO(texto)))
    assert isinstance(r, pd.DataFrame), f"Devuelve un DataFrame, no {type(r).__name__}."
    assert len(r) == filas, f"{contexto}: el resultado debería tener {filas} filas, pero tiene {len(r)}."
    assert r["gasto"].isna().sum() == 0, f"{contexto}: quedan {r['gasto'].isna().sum()} huecos en gasto."
    assert approx(r["gasto"].sum(), suma, 1e-9), f"{contexto}: la columna gasto debería sumar {suma}, pero suma {r['gasto'].sum()}."


def test_ejemplo():
    """El ejemplo del enunciado"""
    with open("gastos.csv", encoding="utf-8") as f:
        _comprobar(f.read(), ${e0.filas}, ${lit(e0.suma)}, "Con gastos.csv")


def test_otros_datos():
    """Funciona con otros datos"""
    for texto, filas, suma in ${lit(csvs.slice(1).map((c) => { const e = expect(c); return [c, e.filas, e.suma]; }))}:
        _comprobar(texto, filas, suma, "Con otros datos")
`,
        files: { "gastos.csv": csvs[0] },
      };
    },
  },
  {
    id: "g-pandas-unir",
    mission: "w3-unir",
    title: "Unir dos tablas",
    skills: ["pandas", "uniones"],
    difficulty: 3,
    packages: ["pandas"],
    hints: ["pd.merge(izquierda, derecha, left_on=\"id\", right_on=\"cliente_id\", how=…) une las tablas; how=\"inner\" solo deja coincidencias y how=\"left\" conserva toda la tabla izquierda.", "Después agrupa por nombre y resume el importe; los clientes sin pedidos quedan con NaN, que puedes cambiar por 0 con fillna(0)."],
    make(r) {
      const modes = [
        { text: "el importe total de cada cliente que tiene pedidos", key: "inner-sum" },
        { text: "el importe total de **todos** los clientes (0 para quien no tiene pedidos)", key: "left-sum" },
        { text: "cuántos pedidos tiene cada cliente que tiene pedidos", key: "inner-count" },
      ] as const;
      const mode = r.pick(modes);
      const dataset = () => {
        const names = r.sample(NOMBRES, r.int(3, 6));
        const clientes = names.map((n, i) => ({ id: i + 1 + r.int(0, 1) * 100, nombre: n }));
        const pedidos = Array.from({ length: r.int(3, 9) }, () => ({ cliente_id: r.pick(clientes.slice(0, Math.max(1, clientes.length - 1))).id, importe: r.int(100, 9999) / 100 }));
        const totals: Record<string, number> = {};
        for (const c of clientes) {
          const mine = pedidos.filter((p) => p.cliente_id === c.id);
          if (mode.key === "left-sum") totals[c.nombre] = mine.reduce((s, p) => s + p.importe, 0);
          else if (mine.length) totals[c.nombre] = mode.key === "inner-sum" ? mine.reduce((s, p) => s + p.importe, 0) : mine.length;
        }
        return {
          clientes: { id: clientes.map((c) => c.id), nombre: clientes.map((c) => c.nombre) },
          pedidos: { cliente_id: pedidos.map((p) => p.cliente_id), importe: pedidos.map((p) => p.importe) },
          esperado: totals,
          csvC: "id,nombre\n" + clientes.map((c) => `${c.id},${c.nombre}`).join("\n") + "\n",
          csvP: "cliente_id,importe\n" + pedidos.map((p) => `${p.cliente_id},${p.importe}`).join("\n") + "\n",
        };
      };
      const sets = Array.from({ length: 4 }, dataset);
      const code =
        mode.key === "inner-sum"
          ? 'unidas = pd.merge(clientes, pedidos, left_on="id", right_on="cliente_id", how="inner")\n    return unidas.groupby("nombre")["importe"].sum()'
          : mode.key === "inner-count"
            ? 'unidas = pd.merge(clientes, pedidos, left_on="id", right_on="cliente_id", how="inner")\n    return unidas.groupby("nombre")["importe"].count()'
            : 'unidas = pd.merge(clientes, pedidos, left_on="id", right_on="cliente_id", how="left")\n    return unidas.groupby("nombre")["importe"].sum()';
      return {
        prompt: [`\`clientes.csv\` tiene las columnas \`id\` y \`nombre\`; \`pedidos.csv\`, \`cliente_id\` e \`importe\`. Escribe \`total_por_cliente(clientes, pedidos)\` que reciba los dos DataFrames y devuelva, por nombre de cliente, ${mode.text}.`, "", `Con los dos archivos el resultado es \`${fmtDict(sets[0].esperado)}\` (como Serie o diccionario).`],
        starter: py`import pandas as pd


def total_por_cliente(clientes, pedidos):
    pass
`,
        solution: py`import pandas as pd


def total_por_cliente(clientes, pedidos):
    ${code}
`,
        tests: `${DICT_TESTS}
import pandas as pd


def test_ejemplo():
    """El ejemplo del enunciado"""
    r, _ = t.call("total_por_cliente", pd.read_csv("clientes.csv"), pd.read_csv("pedidos.csv"))
    _igual_dict(r, ${lit(sets[0].esperado)}, "Con los archivos")


def test_otros_datos():
    """Funciona con otras tablas"""
    for clientes, pedidos, esperado in ${lit(sets.slice(1).map((s) => [s.clientes, s.pedidos, s.esperado]))}:
        r, _ = t.call("total_por_cliente", pd.DataFrame(clientes), pd.DataFrame(pedidos))
        _igual_dict(r, esperado, "Con otras tablas")
`,
        files: { "clientes.csv": sets[0].csvC, "pedidos.csv": sets[0].csvP },
      };
    },
  },
  {
    id: "g-pandas-fechas",
    mission: "w3-fechas",
    title: "Resumir una serie por meses",
    skills: ["pandas", "series-temporales"],
    difficulty: 3,
    packages: ["pandas"],
    hints: ["Convierte la columna con pd.to_datetime y úsala como índice: df.set_index(\"fecha\").", "resample(\"ME\") agrupa por mes natural; después aplica sum(), mean() o max()."],
    make(r) {
      const aggs = [
        { name: "sum", text: "el total de unidades", f: (xs: number[]) => xs.reduce((a, b) => a + b, 0) },
        { name: "mean", text: "la media diaria de unidades", f: mean },
        { name: "max", text: "el máximo diario de unidades", f: (xs: number[]) => Math.max(...xs) },
      ];
      const agg = r.pick(aggs);
      const series = () => {
        const start = Date.UTC(2024, r.int(0, 9), r.int(1, 28));
        const days = r.int(35, 100);
        const rows = Array.from({ length: days }, (_, i) => ({ fecha: new Date(start + i * 86_400_000).toISOString().slice(0, 10), unidades: r.int(0, 60) }));
        const groups: Record<string, number[]> = {};
        for (const x of rows) (groups[x.fecha.slice(0, 7)] ??= []).push(x.unidades);
        const months = Object.keys(groups).sort();
        return { rows, months, values: months.map((m) => agg.f(groups[m])) };
      };
      const sets = Array.from({ length: 4 }, series);
      const csv = (s: ReturnType<typeof series>) => "fecha,unidades\n" + s.rows.map((x) => `${x.fecha},${x.unidades}`).join("\n") + "\n";
      return {
        prompt: [`El archivo \`ventas_diarias.csv\` tiene las columnas \`fecha\` (texto \`AAAA-MM-DD\`) y \`unidades\`, un día por fila. Escribe \`por_mes(df)\` que devuelva una Serie con ${agg.text} de cada mes, en orden cronológico.`, "", `Con \`pd.read_csv("ventas_diarias.csv")\` (meses ${sets[0].months.join(", ")}) los valores son \`${lit(sets[0].values.map((v) => Number(v.toFixed(4))))}\`${agg.name === "mean" ? " (redondeados aquí a 4 decimales)" : ""}.`],
        starter: py`import pandas as pd


def por_mes(df):
    pass
`,
        solution: py`import pandas as pd


def por_mes(df):
    df = df.copy()
    df["fecha"] = pd.to_datetime(df["fecha"])
    return df.set_index("fecha")["unidades"].resample("ME").${agg.name}()
`,
        tests: py`
import io
import pandas as pd


def _comprobar(texto, esperado, contexto):
    r, _ = t.call("por_mes", pd.read_csv(io.StringIO(texto)))
    assert isinstance(r, pd.Series), f"Devuelve una Serie de pandas, no {type(r).__name__}."
    valores = [float(v) for v in r.values]
    assert len(valores) == len(esperado), f"{contexto}: debería haber {len(esperado)} meses, pero hay {len(valores)}."
    for i, (a, b) in enumerate(zip(valores, esperado)):
        assert approx(a, b, 1e-9), f"{contexto}: el mes {i + 1} debería valer {b}, pero vale {a}."


def test_ejemplo():
    """El ejemplo del enunciado"""
    with open("ventas_diarias.csv", encoding="utf-8") as f:
        _comprobar(f.read(), ${lit(sets[0].values)}, "Con ventas_diarias.csv")


def test_otros_datos():
    """Funciona con otras series"""
    for texto, esperado in ${lit(sets.slice(1).map((s) => [csv(s), s.values]))}:
        _comprobar(texto, esperado, "Con otra serie")
`,
        files: { "ventas_diarias.csv": csv(sets[0]) },
      };
    },
  },
];
