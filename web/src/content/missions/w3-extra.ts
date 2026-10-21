import { py, type Mission } from "../types";

// Mundo 3 · visualización estadística con Seaborn (rueda incluida en el juego, sin PyPI).

const VENTAS_ANCHO = `tienda,ene,feb,mar,abr,may,jun
Centro,120,135,150,160,170,190
Puerto,90,85,95,100,120,140
Norte,60,70,65,80,75,90
Sur,150,140,160,155,165,170
Este,40,55,50,70,85,95
`;

export const W3_EXTRA: Mission[] = [
  {
    id: "w3-seaborn",
    world: "w3",
    zone: "Visualización",
    title: "Los tapices del consejo: visualización estadística con Seaborn",
    kind: "lesson",
    difficulty: 3,
    skills: ["visualizacion", "seaborn", "pandas"],
    requires: ["w3-graficos"],
    story: "El consejo del reino quiere ver de un vistazo cómo se reparten las ventas de sus tiendas. Seaborn teje gráficos estadísticos completos a partir de una tabla, siempre que la tabla esté en el formato que espera.",
    objective: "Pasar una tabla de formato ancho a formato largo con `melt`, dibujar con Seaborn un diagrama de cajas por grupo y un mapa de calor de correlaciones con una escala de color adecuada, y comprobar los gráficos leyendo sus elementos.",
    before: ["pandas: agrupar y transformar", "Matplotlib: figuras y ejes", "Correlación"],
    packages: ["pandas", "matplotlib", "seaborn"],
    intuition: [
      "Seaborn está construido sobre Matplotlib y trabaja con **DataFrames en formato largo** (*tidy*): una fila por observación y una columna por variable. Así basta con decir qué columna va en cada eje y cuál define el color:",
      "",
      "```python",
      "sns.boxplot(data=largo, x=\"mes\", y=\"ventas\")",
      "sns.scatterplot(data=df, x=\"superficie\", y=\"precio\", hue=\"barrio\")",
      "```",
      "",
      "Una tabla **ancha** (una columna por mes) se convierte en larga con `df.melt(id_vars=\"tienda\", var_name=\"mes\", value_name=\"ventas\")`.",
      "",
      "- **Distribuciones**: `histplot`, `kdeplot`, `boxplot`, `violinplot`.",
      "- **Relaciones**: `scatterplot`, `regplot` (con su recta y banda de confianza), `lineplot`.",
      "- **Matrices**: `heatmap`. Para correlaciones usa una escala **divergente** centrada en 0 y fija sus límites en −1 y 1: así el mismo color significa siempre lo mismo.",
      "",
      "Cada función devuelve el objeto `Axes` de Matplotlib: con él se ponen título y etiquetas, y se puede inspeccionar lo dibujado (las cajas, los textos, la escala de color).",
      "",
      "Seaborn no viene en la distribución de Pyodide: el juego incluye su rueda oficial (versión 0.13.2) y la instala la primera vez que la importas.",
    ],
    example: {
      code: py`import pandas as pd
import seaborn as sns
df = pd.DataFrame({"grupo": list("aabbb"), "valor": [1, 3, 2, 5, 4]})
ax = sns.barplot(data=df, x="grupo", y="valor", errorbar=None)
print([round(float(b.get_height()), 2) for b in ax.patches])`,
      lines: [
        "pandas.",
        "Seaborn, con su alias habitual.",
        "Una tabla larga: cada fila es una observación de un grupo.",
        "barplot agrupa por x y dibuja la media de y de cada grupo (sin barras de error).",
        "[2.0, 3.67]: la media del grupo a es (1 + 3)/2 y la del b, (2 + 5 + 4)/3.",
      ],
    },
    challenge: [
      "`ventas_tiendas.csv` tiene una fila por tienda y una columna por mes (`ene` … `jun`).",
      "",
      "1. `a_formato_largo(df)`: DataFrame con las columnas `tienda`, `mes` y `ventas`, una fila por tienda y mes.",
      "2. `grafico_cajas(largo)`: dibuja con Seaborn un diagrama de cajas de `ventas` por `mes` en una figura nueva, con título `\"Ventas por mes\"` y etiquetas `\"Mes\"` y `\"Ventas (unidades)\"`. Devuelve el `Axes`.",
      "3. `mapa_correlacion(df)`: mapa de calor de la matriz de correlación entre los meses (sin la columna `tienda`), con los valores escritos con dos decimales (`annot=True, fmt=\".2f\"`), límites de color −1 y 1 y la paleta divergente `\"vlag\"`. Devuelve el `Axes`.",
    ],
    starter: py`import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

ANCHO = pd.read_csv("ventas_tiendas.csv")


def a_formato_largo(df):
    return df


def grafico_cajas(largo):
    fig, ax = plt.subplots()
    return ax


def mapa_correlacion(df):
    fig, ax = plt.subplots()
    return ax
`,
    solution: py`import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

ANCHO = pd.read_csv("ventas_tiendas.csv")


def a_formato_largo(df):
    return df.melt(id_vars="tienda", var_name="mes", value_name="ventas")


def grafico_cajas(largo):
    fig, ax = plt.subplots()
    sns.boxplot(data=largo, x="mes", y="ventas", ax=ax)
    ax.set_title("Ventas por mes")
    ax.set_xlabel("Mes")
    ax.set_ylabel("Ventas (unidades)")
    return ax


def mapa_correlacion(df):
    corr = df.drop(columns="tienda").corr()
    fig, ax = plt.subplots()
    sns.heatmap(corr, annot=True, fmt=".2f", vmin=-1, vmax=1, cmap="vlag", ax=ax)
    return ax


largo = a_formato_largo(ANCHO)
grafico_cajas(largo)
mapa_correlacion(ANCHO)
plt.show()
`,
    tests: py`
import matplotlib.pyplot as plt
import pandas as pd

MESES = ["ene", "feb", "mar", "abr", "may", "jun"]


def test_formato_largo():
    "Una fila por tienda y mes"
    largo = t.get("a_formato_largo", "function")(t.get("ANCHO"))
    assert list(largo.columns) == ["tienda", "mes", "ventas"], f"Columnas: {list(largo.columns)}"
    assert len(largo) == 30, f"5 tiendas × 6 meses son 30 filas, no {len(largo)}."
    fila = largo[(largo["tienda"] == "Puerto") & (largo["mes"] == "abr")]
    assert len(fila) == 1 and int(fila["ventas"].iloc[0]) == 100, "Puerto vendió 100 en abril."


def test_cajas():
    "Diagrama de cajas con título y etiquetas"
    plt.close("all")
    ax = t.get("grafico_cajas", "function")(t.get("a_formato_largo")(t.get("ANCHO")))
    assert ax.get_title() == "Ventas por mes", f"Título: {ax.get_title()!r}"
    assert ax.get_xlabel() == "Mes" and ax.get_ylabel() == "Ventas (unidades)", f"Etiquetas: {ax.get_xlabel()!r}, {ax.get_ylabel()!r}"
    assert [x.get_text() for x in ax.get_xticklabels()] == MESES, "El eje x debe tener los seis meses en su orden."
    assert len(ax.patches) == 6, f"Debería haber 6 cajas (una por mes), no {len(ax.patches)}: usa sns.boxplot."


def test_mapa():
    "Mapa de calor de correlaciones con escala fija"
    plt.close("all")
    ancho = t.get("ANCHO")
    ax = t.get("mapa_correlacion", "function")(ancho)
    esperado = ancho.drop(columns="tienda").corr()
    textos = [x.get_text() for x in ax.texts]
    assert len(textos) == 36, f"Una matriz 6×6 tiene 36 valores escritos; hay {len(textos)} (usa annot=True)."
    assert textos == [f"{v:.2f}" for v in esperado.values.ravel()], "Los valores escritos no coinciden con la correlación con dos decimales."
    assert ax.collections and tuple(round(v, 6) for v in ax.collections[0].get_clim()) == (-1.0, 1.0), "Fija la escala de color entre −1 y 1 (vmin=-1, vmax=1)."
    assert ax.collections[0].get_cmap().name == "vlag", "Usa la paleta divergente vlag."


def test_usa_seaborn():
    "Usa Seaborn"
    assert t.calls("boxplot") and t.calls("heatmap"), "Dibuja con sns.boxplot y sns.heatmap."
    assert t.calls("melt"), "Pasa a formato largo con melt."
`,
    files: { "ventas_tiendas.csv": VENTAS_ANCHO },
    hints: [
      "`df.melt(id_vars=\"tienda\", var_name=\"mes\", value_name=\"ventas\")` deja una fila por tienda y mes.",
      "Crea la figura con `fig, ax = plt.subplots()` y pasa `ax=ax` a la función de Seaborn; después usa `ax.set_title` y `ax.set_xlabel`.",
      "Para el mapa: `corr = df.drop(columns=\"tienda\").corr()` y `sns.heatmap(corr, annot=True, fmt=\".2f\", vmin=-1, vmax=1, cmap=\"vlag\", ax=ax)`.",
    ],
    errors: [
      { error: "ValueError: Could not interpret value `ventas` for `y`", fix: "La tabla está en formato ancho: no hay columna ventas. Pásala a formato largo con melt." },
      { error: "Un mapa de correlaciones con colores que cambian de significado", fix: "Sin vmin y vmax, la escala se ajusta a los datos: un rojo puede ser 0,3 en un gráfico y 0,9 en otro. Fija −1 y 1." },
      { error: "TypeError: could not convert string to float: 'Centro'", fix: "corr() solo admite números: quita antes la columna tienda." },
    ],
    quiz: {
      question: "Las ventas de todos los meses están muy correlacionadas entre sí (≈ 0,95). ¿Qué es lo más probable?",
      options: [
        { text: "Que las tiendas grandes venden mucho todos los meses y las pequeñas poco: el tamaño de la tienda domina" },
        { text: "Que las ventas de un mes causan las del mes siguiente", misconception: "correlacion-causalidad" },
        { text: "Que el gráfico está mal hecho" },
      ],
      answer: 0,
      explanation: "Con cinco tiendas de tamaños muy distintos, la correlación entre columnas refleja sobre todo esa diferencia de escala. Correlación no es causalidad.",
    },
    review: "Explica qué es el formato largo y por qué Seaborn lo necesita; dibuja de memoria un boxplot por grupos.",
    xp: 85,
    coins: 12,
  },
];
