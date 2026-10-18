import { gastosCsv } from "../datasets";
import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 3: un analizador de gastos personales sobre un extracto bancario
// sintético con formato español («;», dd/mm/aaaa, «-1.234,56»). Limpieza, categorización por
// reglas, pagos recurrentes, atípicos y presupuesto, previsión e informe con gráfico.

const SERIES = { id: "analizador-gastos", title: "Proyecto progresivo: el analizador de gastos del Reino", of: 4 };

const FILES = { "gastos.csv": gastosCsv() };

const SPEC: ProjectSpec = {
  requirements: [
    "Leer un extracto bancario con formato español (separador «;», fechas dd/mm/aaaa, importes «-1.234,56») sin perder ni inventar dinero.",
    "Eliminar los movimientos exportados dos veces y normalizar los conceptos.",
    "Clasificar cada movimiento en una categoría con reglas explícitas y resumir el gasto por mes y categoría.",
    "Detectar pagos recurrentes (y si siguen activos), gastos atípicos y meses por encima del presupuesto.",
    "Prever el gasto del mes siguiente y comunicar los resultados con un gráfico y un informe breve.",
  ],
  dataset: "gastos.csv: extracto sintético de 2024 (359 líneas) de una persona ficticia: nómina, alquiler, recibos, suscripciones, compras, una devolución, un gasto atípico y algunas líneas duplicadas por el banco.",
  stages: ["Carga y limpieza del extracto", "Categorías y resumen mensual", "Pagos recurrentes, atípicos y presupuesto", "Previsión, gráfico e informe"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Los totales coinciden al céntimo con un cálculo independiente sobre el texto original.",
    "Ningún movimiento queda sin categoría («otros» vacío) y las reglas están en un único diccionario.",
    "Los atípicos se buscan solo entre los gastos variables, no entre los pagos fijos.",
  ],
  extensions: [
    "Leer las reglas de categorías desde un archivo JSON editable por el usuario.",
    "Detectar recibos bimestrales o trimestrales (luz, agua) además de los mensuales.",
    "Exportar el resumen mensual a CSV con formato español para abrirlo en una hoja de cálculo.",
  ],
  portfolio: "Analizador de gastos personales con pandas: lectura de extractos bancarios con formato español, deduplicación, categorización por reglas, tabla mensual por categoría, tasa de ahorro, detección de pagos recurrentes y de atípicos, alertas de presupuesto, previsión e informe con gráfico.",
};

const S1 = py`import pandas as pd


def importe_a_float(texto):
    texto = str(texto).strip().replace(".", "").replace(",", ".")
    return float(texto)


def normalizar_concepto(texto):
    return " ".join(str(texto).upper().split())


def cargar_movimientos(ruta):
    df = pd.read_csv(ruta, sep=";", dtype=str)
    df["fecha"] = pd.to_datetime(df["fecha"], format="%d/%m/%Y")
    df["concepto"] = df["concepto"].map(normalizar_concepto)
    df["importe"] = df["importe"].map(importe_a_float)
    antes = len(df)
    df = df.drop_duplicates().sort_values("fecha", kind="stable").reset_index(drop=True)
    df["tipo"] = df["importe"].map(lambda v: "ingreso" if v > 0 else "gasto")
    df["mes"] = df["fecha"].dt.strftime("%Y-%m")
    return df, antes - len(df)


movimientos, duplicados = cargar_movimientos("gastos.csv")
resumen_anual = {
    "ingresos": round(movimientos.loc[movimientos["importe"] > 0, "importe"].sum(), 2),
    "gastos": round(-movimientos.loc[movimientos["importe"] < 0, "importe"].sum(), 2),
}
resumen_anual["ahorro"] = round(resumen_anual["ingresos"] - resumen_anual["gastos"], 2)`;

const S2 = py`REGLAS = {
    "vivienda": ["ALQUILER", "IBERDROLA", "CANAL AGUA", "MOVISTAR"],
    "suscripciones": ["NETFLIX", "SPOTIFY", "GIMNASIO", "APP PREMIUM"],
    "supermercado": ["MERCADONA", "CARREFOUR", "LIDL"],
    "restaurantes": ["BAR ", "RESTAURANTE", "GLOVO"],
    "transporte": ["REPSOL", "TAXI", "METRO"],
    "compras": ["AMAZON", "ZARA", "DECATHLON", "MEDIAMARKT"],
    "ingresos": ["NOMINA", "BIZUM", "DEVOLUCION"],
}


def categorizar(concepto):
    for categoria, claves in REGLAS.items():
        if categoria == "compras" and "DEVOLUCION" in concepto:
            continue
        if any(clave in concepto for clave in claves):
            return categoria
    return "otros"


movimientos["categoria"] = movimientos["concepto"].map(categorizar)
gastos = movimientos[movimientos["importe"] < 0].assign(gasto=lambda d: -d["importe"])
tabla_mensual = gastos.pivot_table(index="mes", columns="categoria", values="gasto", aggfunc="sum", fill_value=0).round(2)
por_mes = movimientos.groupby(["mes", "tipo"])["importe"].sum().unstack(fill_value=0)
tasa_ahorro = ((por_mes["ingreso"] + por_mes["gasto"]) / por_mes["ingreso"]).round(3)`;

const S3 = py`import re


def comercio(concepto):
    """Clave del comercio: el concepto sin números ni símbolos sueltos."""
    return " ".join(p for p in re.sub(r"[^A-ZÑ ]", " ", concepto).split() if len(p) > 1)


def recurrentes(df, fin=None):
    fin = fin or df["fecha"].max()
    filas = []
    for clave, grupo in df[df["importe"] < 0].groupby(df["concepto"].map(comercio)):
        if grupo["mes"].nunique() < 3:
            continue
        importes = -grupo["importe"]
        dias = grupo["fecha"].sort_values().diff().dt.days.dropna()
        if importes.std(ddof=0) / importes.mean() < 0.05 and 25 <= dias.median() <= 35:
            ultimo = grupo["fecha"].max()
            filas.append({"comercio": clave, "importe": round(importes.median(), 2), "pagos": len(grupo),
                          "desde": grupo["fecha"].min(), "hasta": ultimo, "activa": (fin - ultimo).days <= 35})
    return pd.DataFrame(filas).sort_values("importe", ascending=False).reset_index(drop=True)


def atipicos(gastos_df, fijos, k=3):
    """Gastos variables muy por encima de lo habitual en su categoría (Q3 + k·RIC)."""
    variables = gastos_df[~gastos_df["concepto"].map(comercio).isin(fijos)]
    marcas = []
    for _, grupo in variables.groupby("categoria"):
        q1, q3 = grupo["gasto"].quantile([0.25, 0.75])
        marcas.append(grupo[grupo["gasto"] > q3 + k * (q3 - q1)])
    return pd.concat(marcas).sort_values("fecha")


def alertas(tabla, presupuesto):
    filas = []
    for categoria, limite in presupuesto.items():
        for mes, valor in tabla[categoria].items():
            if valor > limite:
                filas.append({"mes": mes, "categoria": categoria, "gasto": valor, "exceso": round(valor - limite, 2)})
    return pd.DataFrame(filas, columns=["mes", "categoria", "gasto", "exceso"])


pagos_fijos = recurrentes(movimientos)
coste_fijo_mensual = round(pagos_fijos.loc[pagos_fijos["activa"], "importe"].sum(), 2)
raros = atipicos(gastos, set(pagos_fijos["comercio"]))
PRESUPUESTO = {"supermercado": 450, "restaurantes": 120, "compras": 150}
avisos = alertas(tabla_mensual, PRESUPUESTO)`;

const S4 = py`import matplotlib.pyplot as plt


def proyeccion(gastos_df, excluir, meses=3):
    """Gasto esperado del mes siguiente por categoría: media de los últimos meses sin atípicos."""
    limpio = gastos_df.drop(index=excluir)
    tabla = limpio.pivot_table(index="mes", columns="categoria", values="gasto", aggfunc="sum", fill_value=0)
    return tabla.tail(meses).mean().round(2)


def grafico(tabla, por_mes_df):
    fig, (izq, der) = plt.subplots(1, 2, figsize=(11, 4))
    izq.plot(por_mes_df.index, por_mes_df["ingreso"], marker="o", label="Ingresos")
    izq.plot(por_mes_df.index, -por_mes_df["gasto"], marker="o", label="Gastos")
    izq.set_title("Ingresos y gastos por mes")
    izq.set_ylabel("euros")
    izq.tick_params(axis="x", rotation=60)
    izq.legend()
    totales = tabla.sum().sort_values()
    der.barh(totales.index, totales.values)
    der.set_title("Gasto anual por categoría")
    der.set_xlabel("euros")
    fig.tight_layout()
    return fig


def informe(resumen, tasa, fijos_df, avisos_df, prevision):
    lineas = [
        f"Ingresos: {resumen['ingresos']:.2f} €; gastos: {resumen['gastos']:.2f} €; ahorro: {resumen['ahorro']:.2f} €.",
        f"Tasa de ahorro mensual: mediana {tasa.median():.1%}, peor mes {tasa.idxmin()} ({tasa.min():.1%}).",
        f"Pagos fijos activos ({fijos_df.loc[fijos_df['activa'], 'importe'].sum():.2f} € al mes): {', '.join(fijos_df.loc[fijos_df['activa'], 'comercio'])}.",
        f"Meses por encima del presupuesto: {len(avisos_df)}.",
        f"Previsión del mes siguiente: {prevision.sum():.2f} €.",
    ]
    return "\n".join(lineas)


prevision = proyeccion(gastos, raros.index)
figura = grafico(tabla_mensual, por_mes)
texto_informe = informe(resumen_anual, tasa_ahorro, pagos_fijos, avisos, prevision)
print(texto_informe)`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

const REFERENCIA = py`
import csv
from decimal import Decimal

def lineas_unicas():
    with open("gastos.csv", encoding="utf-8") as f:
        filas = [tuple(r) for r in csv.reader(f, delimiter=";")][1:]
    return list(dict.fromkeys(filas))

def importe(texto):
    return Decimal(texto.replace(".", "").replace(",", "."))
`;

export const PROJ_GASTOS: Mission[] = [
  {
    id: "pg-gastos-1",
    world: "w3",
    zone: "Proyecto del Reino",
    title: "El analizador de gastos del Reino · 1: carga y limpieza del extracto",
    kind: "project",
    difficulty: 2,
    skills: ["pandas", "limpieza", "importacion", "series-temporales"],
    requires: ["w3-limpieza"],
    series: { ...SERIES, stage: 1 },
    packages: ["pandas"],
    files: FILES,
    story: "Una ciudadana del Reino ha descargado el extracto de su cuenta de 2024 y quiere saber en qué se le va el dinero. El banco exporta con formato español: punto y coma, fechas día/mes/año y «1.234,56». Y, por un fallo, algunas líneas aparecen dos veces.",
    objective: "Leer el extracto con los separadores y formatos correctos, convertir importes y fechas, normalizar los conceptos, eliminar duplicados exactos y calcular ingresos, gastos y ahorro del año.",
    before: ["pandas: leer CSV", "Limpieza de datos", "Fechas en pandas"],
    intuition: [
      "Un CSV «español» trae tres trampas: el separador es `;` (porque la coma es el separador decimal), las fechas van como día/mes/año y los importes usan el punto para los miles: `-1.234,56`.",
      "",
      "Leer los importes como texto (`dtype=str`) y convertirlos tú evita sorpresas: quitar los puntos de miles y cambiar la coma por un punto. **El orden importa**: al revés, «1.234,56» se convertiría en 1,23456.",
      "",
      "Las fechas se convierten con un **formato explícito** (`%d/%m/%Y`): sin él, 03/04/2024 podría leerse como el 4 de marzo.",
      "",
      "Antes de buscar duplicados hay que **normalizar** los conceptos (mayúsculas y espacios), pero un duplicado es una línea idéntica en fecha, concepto **e** importe.",
    ],
    formal: "«-1.234,56» → quitar «.» → «-1234,56» → «,» por «.» → -1234.56 · ahorro = Σ importes > 0 − Σ |importes < 0|",
    example: {
      code: py`import pandas as pd
texto = "-1.234,56"
print(float(texto.replace(".", "").replace(",", ".")))
print(pd.to_datetime("03/04/2024", format="%d/%m/%Y").strftime("%d de %B"))`,
      lines: [
        "pandas.",
        "Un importe con formato español.",
        "-1234.56: primero se quitan los puntos de miles y después la coma decimal pasa a ser un punto.",
        "03 de April: con el formato explícito, 03/04 es el 3 de abril.",
      ],
    },
    challenge: [
      "1. `importe_a_float(texto)` y `normalizar_concepto(texto)` (mayúsculas y un solo espacio entre palabras).",
      "2. `cargar_movimientos(ruta)`: lee con `sep=\";\"` y `dtype=str`; convierte `fecha` (formato `%d/%m/%Y`), `concepto` e `importe`; elimina las filas duplicadas, ordena por fecha (orden estable), reinicia el índice y añade `tipo` (`\"ingreso\"` si el importe es positivo, `\"gasto\"` si no) y `mes` (texto `\"2024-01\"`). Devuelve `(df, numero_de_duplicados_eliminados)`.",
      "3. `movimientos, duplicados = cargar_movimientos(\"gastos.csv\")` y `resumen_anual` con `ingresos`, `gastos` (en positivo) y `ahorro`, redondeados a 2 decimales.",
    ],
    starter: py`import pandas as pd


def importe_a_float(texto):
    return 0.0


def normalizar_concepto(texto):
    return texto


def cargar_movimientos(ruta):
    df = pd.read_csv(ruta)
    return df, 0


movimientos, duplicados = cargar_movimientos("gastos.csv")
resumen_anual = {"ingresos": 0.0, "gastos": 0.0, "ahorro": 0.0}`,
    solution: SOL1,
    tests: py`${REFERENCIA}
import pandas as pd

def test_conversiones():
    "Importes y conceptos"
    f, n = t.get("importe_a_float", "function"), t.get("normalizar_concepto", "function")
    assert f("-1.234,56") == -1234.56 and f("3.700,00") == 3700.0 and f("12,5") == 12.5 and f(" -0,99 ") == -0.99
    assert n("  mercadona   2341 ") == "MERCADONA 2341"

def test_movimientos():
    "Tipos, orden, duplicados y columnas nuevas"
    df, dup = t.get("movimientos", pd.DataFrame), t.get("duplicados")
    unicas = lineas_unicas()
    assert len(df) == 356 and dup == 3 and len(unicas) == len(df)
    assert str(df["fecha"].dtype).startswith("datetime64") and df["fecha"].is_monotonic_increasing
    assert df["importe"].dtype == float and list(df.index) == list(range(len(df)))
    fechas = sorted(pd.to_datetime([f[0] for f in unicas], format="%d/%m/%Y"))
    assert df["fecha"].min() == fechas[0] and df["fecha"].max() == fechas[-1]
    assert set(df["tipo"]) == {"ingreso", "gasto"} and (df.loc[df["tipo"] == "ingreso", "importe"] > 0).all()
    assert df["mes"].nunique() == 12 and df["mes"].iloc[0] == "2024-01"
    assert (df["concepto"] == df["concepto"].str.upper()).all() and not df["concepto"].str.contains("  ").any()

def test_resumen_anual():
    "Totales al céntimo"
    r = t.get("resumen_anual", dict)
    vals = [importe(f[2]) for f in lineas_unicas()]
    ingresos, gastos = sum(v for v in vals if v > 0), -sum(v for v in vals if v < 0)
    assert abs(r["ingresos"] - float(ingresos)) < 0.005 and abs(r["gastos"] - float(gastos)) < 0.005
    assert abs(r["ahorro"] - float(ingresos - gastos)) < 0.005
`,
    hints: [
      "importe_a_float: `str(texto).strip().replace(\".\", \"\").replace(\",\", \".\")` y después `float(...)`.",
      "cargar_movimientos: `pd.read_csv(ruta, sep=\";\", dtype=str)`; `pd.to_datetime(df[\"fecha\"], format=\"%d/%m/%Y\")`; `df[\"importe\"].map(importe_a_float)`.",
      "Cuenta las filas antes y después de `drop_duplicates()`; luego `sort_values(\"fecha\", kind=\"stable\").reset_index(drop=True)` y `df[\"fecha\"].dt.strftime(\"%Y-%m\")` para el mes.",
    ],
    errors: [
      { error: "Leer con sep=\",\" un CSV con «;»", fix: "Obtendrías una sola columna con todo el texto. Mira la primera línea del archivo antes de leerlo." },
      { error: "Cambiar la coma por punto antes de quitar los puntos de miles", fix: "«1.234,56» pasaría a «1.234.56» y float() fallaría (o, sin miles, se mezclarían separadores). Primero los miles, después el decimal." },
      { error: "Dejar que pandas adivine el formato de fecha", fix: "03/04/2024 es el 3 de abril en España; indica format=\"%d/%m/%Y\"." },
    ],
    quiz: {
      question: "El extracto tiene dos líneas idénticas: «05/03/2024;MERCADONA 2341;-23,40». ¿Es seguro borrar una?",
      options: [
        { text: "Es lo más probable (el banco las exportó dos veces), pero dos compras iguales el mismo día también serían idénticas: conviene cotejarlo con el saldo o con otra exportación" },
        { text: "Siempre: dos líneas iguales son siempre un error" },
        { text: "Nunca: un analista no debe borrar datos" },
        { text: "Solo si el importe es pequeño" },
      ],
      answer: 0,
      explanation: "Eliminar duplicados exactos es una decisión razonable aquí, pero es una suposición: hay que documentarla y, si se puede, validarla con otra fuente.",
    },
    project: SPEC,
    review: "Repasa: sep=\";\" y dtype=str; miles antes que decimales; formato de fecha explícito; duplicados exactos.",
    xp: 100,
    coins: 15,
  },
  {
    id: "pg-gastos-2",
    world: "w3",
    zone: "Proyecto del Reino",
    title: "El analizador de gastos del Reino · 2: categorías y resumen mensual",
    kind: "project",
    difficulty: 2,
    skills: ["pandas", "agrupacion", "transformacion"],
    requires: ["pg-gastos-1", "w3-agrupar"],
    series: { ...SERIES, stage: 2 },
    packages: ["pandas"],
    files: FILES,
    story: "«¿Cuánto gasto en restaurantes?» El extracto no lo dice: solo trae conceptos como «GLOVO*PEDIDO 8812» o «BAR LA PLAZA». Hay que enseñarle al programa a reconocerlos.",
    objective: "Clasificar cada movimiento con reglas de palabras clave, construir la tabla de gasto por mes y categoría y calcular la tasa de ahorro mensual.",
    before: ["Etapa 1", "groupby y pivot_table", "Funciones aplicadas con map"],
    intuition: [
      "Una **regla** asocia palabras clave con una categoría: si el concepto contiene «MERCADONA», es supermercado. Todas las reglas viven en un único diccionario, fácil de leer y de ampliar.",
      "",
      "El **orden** de las reglas importa cuando un concepto encaja en dos: «AMAZON DEVOLUCION» contiene «AMAZON» (compras), pero es un ingreso. La regla de compras debe saltarse las devoluciones.",
      "",
      "Una **tabla dinámica** (`pivot_table`) pone los meses en filas y las categorías en columnas: cada celda es el gasto de esa categoría en ese mes.",
      "",
      "**Tasa de ahorro** = (ingresos − gastos) / ingresos de cada mes. En los meses con paga extra sube mucho; un gasto grande puede hacerla negativa.",
    ],
    formal: "categoría(c) = primera categoría cuyas claves aparecen en c · tasa de ahorro_m = (ingresos_m − gastos_m) / ingresos_m",
    example: {
      code: py`import pandas as pd
df = pd.DataFrame({"mes": ["01", "01", "02"], "cat": ["a", "b", "a"], "gasto": [10, 5, 7]})
print(df.pivot_table(index="mes", columns="cat", values="gasto", aggfunc="sum", fill_value=0))`,
      lines: [
        "pandas.",
        "Tres gastos de dos meses y dos categorías.",
        "Meses en filas, categorías en columnas, sumas en las celdas y 0 donde no hubo gasto.",
      ],
    },
    challenge: [
      "1. `REGLAS`: diccionario categoría → lista de claves con estas categorías y claves: vivienda (ALQUILER, IBERDROLA, CANAL AGUA, MOVISTAR), suscripciones (NETFLIX, SPOTIFY, GIMNASIO, APP PREMIUM), supermercado (MERCADONA, CARREFOUR, LIDL), restaurantes (\"BAR \", RESTAURANTE, GLOVO), transporte (REPSOL, TAXI, METRO), compras (AMAZON, ZARA, DECATHLON, MEDIAMARKT) e ingresos (NOMINA, BIZUM, DEVOLUCION).",
      "2. `categorizar(concepto)`: la primera categoría (en ese orden) con alguna clave contenida en el concepto, saltando «compras» si el concepto contiene DEVOLUCION; `\"otros\"` si ninguna encaja.",
      "3. Añade la columna `categoria` a `movimientos` y crea `gastos`: solo los importes negativos, con una columna `gasto` en positivo.",
      "4. `tabla_mensual`: `pivot_table` de `gasto` con meses en filas y categorías en columnas (suma, 0 si falta), redondeada a 2 decimales.",
      "5. `por_mes`: suma de importes por mes y tipo (columnas `ingreso` y `gasto`) y `tasa_ahorro` por mes, redondeada a 3 decimales.",
    ],
    starter: py`REGLAS = {}


def categorizar(concepto):
    return "otros"


movimientos["categoria"] = movimientos["concepto"].map(categorizar)
gastos = movimientos
tabla_mensual = None
por_mes = None
tasa_ahorro = None`,
    solution: SOL2,
    tests: py`
import pandas as pd

def test_categorizar():
    "Reglas y orden"
    c = t.get("categorizar", "function")
    assert c("GLOVO*PEDIDO 8812") == "restaurantes" and c("BAR LA PLAZA") == "restaurantes"
    assert c("AMAZON MKTPLACE") == "compras" and c("AMAZON DEVOLUCION") == "ingresos"
    assert c("RECIBO IBERDROLA LUZ") == "vivienda" and c("NETFLIX.COM") == "suscripciones"
    assert c("BARBERIA PACO") == "otros", "La clave \"BAR \" lleva un espacio para no confundir BARBERIA con un bar"
    assert c("LIBRERIA CENTRAL") == "otros"

def test_categorias_del_extracto():
    "Todo clasificado"
    m = t.get("movimientos", pd.DataFrame)
    assert (m["categoria"] != "otros").all(), m.loc[m["categoria"] == "otros", "concepto"].unique()
    assert (m.loc[m["categoria"] == "ingresos", "importe"] > 0).all()
    assert (m.loc[m["categoria"] != "ingresos", "importe"] < 0).all()

def test_tabla_mensual():
    "La tabla reparte todos los gastos"
    tm, g = t.get("tabla_mensual", pd.DataFrame), t.get("gastos", pd.DataFrame)
    assert tm.shape == (12, 6) and "ingresos" not in tm.columns
    assert abs(tm.values.sum() - g["gasto"].sum()) < 0.05 and (g["gasto"] > 0).all()
    m = t.get("movimientos", pd.DataFrame)
    noviembre = -m[(m["mes"] == "2024-11") & (m["categoria"] == "compras")]["importe"].sum()
    assert abs(tm.loc["2024-11", "compras"] - noviembre) < 0.005

def test_tasa_ahorro():
    "Ahorro mensual"
    ta = t.get("tasa_ahorro", pd.Series)
    m = t.get("movimientos", pd.DataFrame)
    for mes in ("2024-03", "2024-11"):
        sub = m[m["mes"] == mes]["importe"]
        esperado = round(sub.sum() / sub[sub > 0].sum(), 3)
        assert abs(ta[mes] - esperado) < 1e-9, mes
    assert ta.idxmin() == "2024-11" and ta["2024-11"] < 0
    assert ta.nlargest(2).index.tolist() == ["2024-12", "2024-06"], "Los meses con paga extra"
`,
    hints: [
      "categorizar: recorre `REGLAS.items()`; usa `any(clave in concepto for clave in claves)`; con `continue` salta compras si \"DEVOLUCION\" está en el concepto.",
      "gastos: `movimientos[movimientos[\"importe\"] < 0].assign(gasto=lambda d: -d[\"importe\"])`.",
      "por_mes: `movimientos.groupby([\"mes\", \"tipo\"])[\"importe\"].sum().unstack(fill_value=0)`; la tasa es `(por_mes[\"ingreso\"] + por_mes[\"gasto\"]) / por_mes[\"ingreso\"]` (los gastos ya son negativos).",
    ],
    errors: [
      { error: "Buscar «BAR» sin espacio", fix: "Coincidiría con BARBERIA o BARCELONA. Las claves cortas necesitan contexto (un espacio, el principio del texto…)." },
      { error: "Sumar los gastos con su signo negativo en la tabla", fix: "Para leer «cuánto gasto» conviene una columna en positivo; guarda el signo solo en el importe original." },
    ],
    quiz: {
      question: "En noviembre la tasa de ahorro es −33 %. ¿Qué conclusión es razonable?",
      options: [
        { text: "Ese mes se gastó más de lo que se ingresó; hay que mirar qué lo explica (la tabla muestra una compra grande) antes de sacar conclusiones sobre el hábito de gasto" },
        { text: "La persona gasta siempre un 33 % más de lo que gana" },
        { text: "La tabla está mal: una tasa de ahorro no puede ser negativa" },
        { text: "Noviembre es un mes caro para todo el mundo" },
      ],
      answer: 0,
      explanation: "Un mes no es un hábito: la tabla por categorías señala la compra de 899 € en compras. La mediana del año (≈ 19 %) describe mejor lo habitual.",
    },
    project: SPEC,
    review: "Repasa: reglas en un diccionario; el orden decide los empates; pivot_table; tasa de ahorro mensual.",
    xp: 100,
    coins: 15,
  },
  {
    id: "pg-gastos-3",
    world: "w3",
    zone: "Proyecto del Reino",
    title: "El analizador de gastos del Reino · 3: pagos recurrentes, atípicos y presupuesto",
    kind: "project",
    difficulty: 3,
    skills: ["pandas", "series-temporales", "atipicos", "agrupacion"],
    requires: ["pg-gastos-2", "w3-eda"],
    series: { ...SERIES, stage: 3 },
    packages: ["pandas"],
    files: FILES,
    story: "La ciudadana jura que dio de baja el gimnasio y no recuerda haberse apuntado a ninguna aplicación de pago. Además, quiere saber qué meses se pasó del presupuesto y qué gasto fue realmente excepcional.",
    objective: "Detectar pagos recurrentes por comercio, regularidad del importe y periodicidad, saber si siguen activos, buscar atípicos entre los gastos variables y comparar cada mes con un presupuesto.",
    before: ["Etapas 1 y 2", "Fechas y diferencias de tiempo", "Rango intercuartílico"],
    intuition: [
      "Un **pago recurrente** cumple tres cosas: es del mismo comercio, cuesta casi lo mismo cada vez (coeficiente de variación pequeño) y llega cada mes (unos 30 días entre pagos). «NETFLIX.COM» y «SPOTIFY P1A2B3» se agrupan por una **clave de comercio**: el concepto sin números ni símbolos.",
      "",
      "Está **activo** si el último pago es reciente (35 días o menos antes del final del extracto). Así aparecen el gimnasio dado de baja en julio y la aplicación que empezó a cobrar en septiembre.",
      "",
      "Un **atípico** se busca por categoría con la regla Q3 + 3·RIC, pero **solo entre los gastos variables**: dentro de «suscripciones», 39,90 € parecería raro frente a 12,99 € y no lo es. Por eso primero se apartan los pagos fijos.",
      "",
      "El **presupuesto** fija un límite por categoría; cada mes que lo supera genera un aviso con el exceso.",
    ],
    formal: "recurrente ⇔ ≥ 3 meses ∧ CV(importe) < 0,05 ∧ 25 ≤ mediana(días entre pagos) ≤ 35 · atípico ⇔ gasto > Q3 + 3·(Q3 − Q1) dentro de su categoría",
    example: {
      code: py`import pandas as pd
fechas = pd.to_datetime(["2024-01-05", "2024-02-05", "2024-03-05", "2024-04-07"])
dias = pd.Series(fechas).diff().dt.days.dropna()
print(dias.tolist(), dias.median())`,
      lines: [
        "pandas.",
        "Cuatro cargos de un mismo comercio.",
        "Días entre cargos consecutivos (el primero no tiene anterior).",
        "[31.0, 29.0, 33.0] y mediana 31: llega cada mes.",
      ],
    },
    challenge: [
      "1. `comercio(concepto)`: cambia lo que no sea letra (A-Z, Ñ) o espacio por un espacio y une las palabras de más de una letra: «NETFLIX.COM» → «NETFLIX COM», «GLOVO*PEDIDO 8812» → «GLOVO PEDIDO».",
      "2. `recurrentes(df, fin=None)`: por comercio, entre los gastos, los que aparecen en al menos 3 meses, con CV (desviación típica poblacional / media) < 0,05 y mediana de días entre pagos entre 25 y 35. DataFrame ordenado por importe descendente con `comercio`, `importe` (mediana), `pagos`, `desde`, `hasta` y `activa` (último pago a 35 días o menos de `fin`, por defecto la última fecha del extracto).",
      "3. `atipicos(gastos_df, fijos, k=3)`: gastos cuyo comercio no está en `fijos` y que superan Q3 + k·RIC de su categoría, ordenados por fecha.",
      "4. `alertas(tabla, presupuesto)`: DataFrame con `mes`, `categoria`, `gasto` y `exceso` (redondeado a 2 decimales) por cada mes que supera el límite.",
      "5. `pagos_fijos = recurrentes(movimientos)`, `coste_fijo_mensual` (suma de los importes activos, 2 decimales), `raros = atipicos(gastos, set(pagos_fijos[\"comercio\"]))`, `PRESUPUESTO = {\"supermercado\": 450, \"restaurantes\": 120, \"compras\": 150}` y `avisos`.",
    ],
    starter: py`import re


def comercio(concepto):
    return concepto


def recurrentes(df, fin=None):
    return pd.DataFrame(columns=["comercio", "importe", "pagos", "desde", "hasta", "activa"])


def atipicos(gastos_df, fijos, k=3):
    return gastos_df.iloc[0:0]


def alertas(tabla, presupuesto):
    return pd.DataFrame(columns=["mes", "categoria", "gasto", "exceso"])


pagos_fijos = recurrentes(movimientos)
coste_fijo_mensual = 0.0
raros = atipicos(gastos, set(pagos_fijos["comercio"]))
PRESUPUESTO = {"supermercado": 450, "restaurantes": 120, "compras": 150}
avisos = alertas(tabla_mensual, PRESUPUESTO)`,
    solution: SOL3,
    tests: py`
import pandas as pd

def test_comercio():
    "Clave de comercio"
    c = t.get("comercio", "function")
    assert c("NETFLIX.COM") == "NETFLIX COM" and c("GLOVO*PEDIDO 8812") == "GLOVO PEDIDO"
    assert c("MERCADONA 2341") == "MERCADONA" and c("SPOTIFY P1A2B3") == "SPOTIFY" and c("BAR LA PLAZA") == "BAR LA PLAZA"

def test_recurrentes():
    "Pagos fijos del extracto"
    p = t.get("pagos_fijos", pd.DataFrame)
    assert list(p.columns[:6]) == ["comercio", "importe", "pagos", "desde", "hasta", "activa"]
    fila = p.set_index("comercio")
    assert set(fila.index) == {"RECIBO ALQUILER PISO", "MOVISTAR FIBRA", "GIMNASIO FITNESS PARK", "METRO RECARGA TARJETA", "NETFLIX COM", "SPOTIFY", "APP PREMIUM STUDIO"}
    assert not fila.loc["GIMNASIO FITNESS PARK", "activa"] and fila.loc["GIMNASIO FITNESS PARK", "pagos"] == 7
    assert fila.loc["APP PREMIUM STUDIO", "activa"] and fila.loc["APP PREMIUM STUDIO", "desde"] == pd.Timestamp("2024-09-20")
    assert p["importe"].is_monotonic_decreasing
    assert abs(t.get("coste_fijo_mensual") - (650 + 45.9 + 20 + 12.99 + 10.99 + 4.99)) < 0.005
    r = t.get("recurrentes", "function")
    m = t.get("movimientos", pd.DataFrame)
    assert set(r(m, fin=pd.Timestamp("2024-08-01"))["activa"]) == {True}, "Con fin = 1 de agosto, el gimnasio seguía activo"

def test_atipicos():
    "Solo el gasto excepcional"
    raros = t.get("raros", pd.DataFrame)
    assert raros["concepto"].tolist() == ["MEDIAMARKT 0021"] and raros["gasto"].iloc[0] == 899
    at, g = t.get("atipicos", "function"), t.get("gastos", pd.DataFrame)
    assert "GIMNASIO FITNESS PARK" in at(g, set())["concepto"].tolist(), "Sin apartar los fijos, el gimnasio parecería atípico"

def test_avisos():
    "Meses por encima del presupuesto"
    a, tm = t.get("avisos", pd.DataFrame), t.get("tabla_mensual", pd.DataFrame)
    esperado = sum(int((tm[c] > lim).sum()) for c, lim in {"supermercado": 450, "restaurantes": 120, "compras": 150}.items())
    assert len(a) == esperado == 10
    nov = a[(a["mes"] == "2024-11") & (a["categoria"] == "compras")]
    assert abs(nov["exceso"].iloc[0] - round(tm.loc["2024-11", "compras"] - 150, 2)) < 1e-9
`,
    hints: [
      "comercio: `re.sub(r\"[^A-ZÑ ]\", \" \", concepto)` y después `\" \".join(p for p in ....split() if len(p) > 1)`.",
      "recurrentes: agrupa los gastos con `groupby(df[\"concepto\"].map(comercio))`; los días entre pagos son `grupo[\"fecha\"].sort_values().diff().dt.days.dropna()`.",
      "atipicos: filtra con `~gastos_df[\"concepto\"].map(comercio).isin(fijos)`; por categoría, `q1, q3 = grupo[\"gasto\"].quantile([0.25, 0.75])`.",
    ],
    errors: [
      { error: "Buscar atípicos mezclando pagos fijos y variables", fix: "Los fijos tienen importes casi constantes y un RIC diminuto: cualquier otro importe parecería atípico." },
      { error: "Agrupar por el concepto exacto", fix: "«NETFLIX.COM» y «NETFLIX COM» o un número de tienda distinto romperían la serie: agrupa por una clave normalizada." },
      { error: "Dar por activa una suscripción solo porque aparece en el extracto", fix: "Mira la fecha del último pago respecto al final del periodo." },
    ],
    quiz: {
      question: "La regla Q3 + 3·RIC marca la compra de 899 € como atípica. ¿Qué significa?",
      options: [
        { text: "Que es excepcional respecto a lo habitual en su categoría; no que sea un error ni un fraude: hay que preguntar qué fue" },
        { text: "Que es un error del banco y debe eliminarse" },
        { text: "Que es un fraude" },
        { text: "Que la persona gasta demasiado en compras" },
      ],
      answer: 0,
      explanation: "Un atípico es una señal para revisar, no un veredicto. Aquí es un televisor real: no se borra, pero se aparta al prever los meses siguientes.",
    },
    project: SPEC,
    review: "Repasa: clave de comercio; recurrente = mismo comercio, importe estable, cada mes; activo según el último pago; atípicos solo entre gastos variables.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pg-gastos-4",
    world: "w3",
    zone: "Proyecto del Reino",
    title: "El analizador de gastos del Reino · 4: previsión, gráfico e informe",
    kind: "project",
    difficulty: 3,
    skills: ["visualizacion", "matplotlib", "comunicacion", "pandas"],
    requires: ["pg-gastos-3", "w3-graficos"],
    series: { ...SERIES, stage: 4 },
    packages: ["pandas", "matplotlib"],
    files: FILES,
    story: "La ciudadana no quiere tablas: quiere un gráfico y cinco frases. ¿Cuánto ahorra, qué mes fue malo y por qué, qué paga cada mes sin darse cuenta y cuánto debería reservar para el mes que viene?",
    objective: "Prever el gasto del mes siguiente por categoría sin dejar que el atípico la distorsione, dibujar ingresos, gastos y gasto por categoría, y redactar un informe breve generado a partir de los datos.",
    before: ["Etapas 1 a 3", "matplotlib", "f-strings con formato"],
    intuition: [
      "Una **previsión sencilla** y honesta: la media de los últimos 3 meses por categoría. Sin quitar la compra de 899 €, la previsión de compras para enero se dispararía.",
      "",
      "Dos gráficos responden dos preguntas: una línea de **ingresos y gastos por mes** (¿cuándo se ahorra?) y barras horizontales del **gasto anual por categoría**, ordenadas (¿en qué se va el dinero?). Cada eje con su unidad.",
      "",
      "El **informe** se genera con los datos: si mañana cambia el extracto, las frases cambian solas. Nada de copiar números a mano.",
    ],
    formal: "previsión_c = media de los gastos de la categoría c en los 3 últimos meses, sin atípicos",
    example: {
      code: py`import matplotlib.pyplot as plt
fig, ax = plt.subplots(figsize=(4, 2))
ax.barh(["b", "a"], [3, 7])
ax.set_xlabel("euros")
print(len(fig.axes), ax.get_xlabel())`,
      lines: [
        "matplotlib.",
        "Una figura con un eje.",
        "Barras horizontales: buenas para comparar categorías con nombres largos.",
        "La unidad en el eje.",
        "1 euros: la figura tiene un eje y su etiqueta.",
      ],
    },
    challenge: [
      "1. `proyeccion(gastos_df, excluir, meses=3)`: quita las filas de `excluir` (índices), haz la tabla mes × categoría y devuelve la media de los últimos `meses` meses (redondeada a 2 decimales).",
      "2. `grafico(tabla, por_mes_df)`: figura con dos ejes: a la izquierda ingresos y gastos (en positivo) por mes, con título, eje y en «euros» y leyenda; a la derecha barras horizontales del gasto anual por categoría, ordenadas, con eje x en «euros». Devuelve la figura.",
      "3. `informe(resumen, tasa, fijos_df, avisos_df, prevision)`: cinco líneas con ingresos/gastos/ahorro del año, la tasa de ahorro mediana y el peor mes, los pagos fijos activos y su coste, el número de avisos de presupuesto y la previsión total.",
      "4. `prevision = proyeccion(gastos, raros.index)`, `figura = grafico(tabla_mensual, por_mes)`, `texto_informe` e imprímelo.",
    ],
    starter: py`import matplotlib.pyplot as plt


def proyeccion(gastos_df, excluir, meses=3):
    return pd.Series(dtype=float)


def grafico(tabla, por_mes_df):
    fig = plt.figure()
    return fig


def informe(resumen, tasa, fijos_df, avisos_df, prevision):
    return ""


prevision = proyeccion(gastos, raros.index)
figura = grafico(tabla_mensual, por_mes)
texto_informe = informe(resumen_anual, tasa_ahorro, pagos_fijos, avisos, prevision)
print(texto_informe)`,
    solution: SOL4,
    tests: py`
import pandas as pd

def test_proyeccion():
    "Media de los tres últimos meses sin el atípico"
    p, g = t.get("prevision", pd.Series), t.get("gastos", pd.DataFrame)
    sin = g.drop(index=t.get("raros", pd.DataFrame).index)
    ultimos = sin[sin["mes"].isin(["2024-10", "2024-11", "2024-12"])]
    esperado = ultimos.groupby("categoria")["gasto"].sum() / 3
    for categoria, valor in esperado.items():
        assert abs(p[categoria] - round(valor, 2)) < 0.006, categoria
    con = t.get("proyeccion", "function")(g, [])
    assert con["compras"] - p["compras"] > 250, "Con el atípico, la previsión de compras se dispara"

def test_grafico():
    "Dos ejes, con títulos y unidades"
    fig = t.get("figura")
    assert len(fig.axes) == 2
    izq, der = fig.axes
    assert izq.get_title() and izq.get_ylabel() == "euros" and izq.get_legend() is not None and len(izq.lines) == 2
    assert der.get_xlabel() == "euros" and len(der.patches) == 6
    anchos = [b.get_width() for b in der.patches]
    assert anchos == sorted(anchos), "Barras ordenadas de menor a mayor"
    assert len(t.figures()) >= 1

def test_informe():
    "Frases generadas a partir de los datos"
    texto = t.get("texto_informe", str)
    r = t.get("resumen_anual", dict)
    assert len(texto.splitlines()) == 5 and texto in t.out
    assert f"{r['ahorro']:.2f}" in texto and "2024-11" in texto and "744.87" in texto
    assert "GIMNASIO" not in texto and "APP PREMIUM STUDIO" in texto
    assert f"{t.get('prevision', pd.Series).sum():.2f}" in texto
`,
    hints: [
      "proyeccion: `gastos_df.drop(index=excluir)`, luego `pivot_table(index=\"mes\", columns=\"categoria\", values=\"gasto\", aggfunc=\"sum\", fill_value=0)` y `.tail(meses).mean().round(2)`.",
      "grafico: `fig, (izq, der) = plt.subplots(1, 2, figsize=(11, 4))`; para las barras, `totales = tabla.sum().sort_values()` y `der.barh(totales.index, totales.values)`.",
      "informe: usa f-strings con formato (`{valor:.2f}`, `{tasa:.1%}`) y `\"\\n\".join(lineas)`.",
    ],
    errors: [
      { error: "Prever con el año entero", fix: "Los hábitos cambian (el gimnasio ya no se paga): para el mes siguiente pesan más los meses recientes." },
      { error: "Escribir las cifras del informe a mano", fix: "Genera el texto desde los datos: el informe sigue siendo correcto si se corrige el extracto." },
      { error: "Gráficos sin unidades", fix: "Un eje sin «euros» obliga al lector a adivinar qué mide." },
    ],
    quiz: {
      question: "¿Por qué la previsión excluye la compra de 899 € pero el resumen anual la incluye?",
      options: [
        { text: "Porque el resumen describe lo que pasó (y pasó), mientras que la previsión intenta anticipar lo habitual, y esa compra no se repite cada mes" },
        { text: "Porque la compra es un error y debería borrarse de todas partes" },
        { text: "Es una incoherencia: deberían tratarse igual" },
        { text: "Porque las previsiones nunca incluyen compras" },
      ],
      answer: 0,
      explanation: "Describir y predecir son tareas distintas. El dato no se borra; se decide, y se documenta, cómo tratarlo según la pregunta.",
    },
    project: SPEC,
    review: "Repasa: previsiones simples y honestas; atípicos fuera de la previsión; un gráfico por pregunta, con unidades; informes generados desde los datos.",
    xp: 130,
    coins: 20,
  },
];
