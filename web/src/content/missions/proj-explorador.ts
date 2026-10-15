import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 4: explorar un conjunto de datos público real, el «Wine» del
// repositorio UCI que scikit-learn incluye (no necesita descarga). Se empieza por la fuente y su
// documentación (que tiene descuidos verificables), se describen las variables, se comparan los
// tres cultivares con ANOVA, Kruskal-Wallis y Holm, y se resume todo con un PCA hecho a mano.

const SERIES = { id: "explorador-datos-publicos", title: "Proyecto progresivo: el explorador de datos públicos", of: 4 };

const PAQUETES = ["pandas", "scikit-learn", "scipy", "matplotlib"];

const SPEC: ProjectSpec = {
  requirements: [
    "Trabajar con un conjunto de datos público real, citando su origen y leyendo su documentación antes de analizarlo.",
    "Verificar la documentación contra los datos y distinguir errores de los datos de descuidos de la documentación.",
    "Describir distribuciones, atípicos y relaciones entre variables con métodos que no dependan de la normalidad.",
    "Comparar los grupos con pruebas adecuadas, corregir por comparaciones múltiples y ordenar por tamaño del efecto.",
    "Resumir la estructura con componentes principales calculadas a mano y verificadas contra scikit-learn.",
  ],
  dataset: "Wine (repositorio UCI; Forina et al., PARVUS), incluido en scikit-learn como load_wine: 178 vinos de tres cultivares de una misma región de Italia y 13 medidas químicas. Su documentación pide citar el repositorio (Lichman, 2013); consulta las condiciones de uso actuales en la página del repositorio UCI antes de redistribuirlo.",
  stages: ["La fuente: ficha y verificación de la documentación", "Distribuciones, atípicos y correlaciones", "¿Se distinguen los cultivares? ANOVA, Kruskal y Holm", "Componentes principales e informe"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Las discrepancias con la documentación se cuantifican y se explican, no se ocultan.",
    "Cada p-valor va acompañado de un tamaño del efecto y del ajuste por comparaciones múltiples.",
    "El PCA propio coincide con el de scikit-learn y el informe se genera desde los resultados.",
  ],
  extensions: [
    "Repetir el análisis con load_breast_cancer o load_diabetes, que también incluye scikit-learn.",
    "Usar ANOVA de Welch para las variables con varianzas desiguales (p de Levene pequeño).",
    "Entrenar un clasificador y comparar su exactitud con la del centroide más cercano en 2 componentes.",
  ],
  portfolio: "Exploración reproducible del conjunto público Wine (UCI): verificación de la documentación contra los datos, perfil de distribuciones y atípicos, correlaciones de Pearson y Spearman, comparación de tres cultivares con ANOVA, Kruskal-Wallis, Holm y η², pruebas de Tukey y un PCA hecho a mano verificado contra scikit-learn.",
};

const S1 = py`import pandas as pd
from sklearn.datasets import load_wine

datos = load_wine(as_frame=True)
vinos = datos.frame.rename(columns={"target": "cultivar"})
VARIABLES = list(datos.feature_names)


def resumen_documentado(descr):
    """Tabla «Summary Statistics» de la documentación: {nombre: (min, max, media, de)} como texto."""
    bloque = descr.split(":Summary Statistics:")[1].split(":Missing Attribute Values:")[0]
    tabla = {}
    for linea in bloque.splitlines():
        if ":" in linea and not linea.strip().startswith("="):
            nombre, valores = linea.split(":", 1)
            tabla[nombre.strip()] = tuple(valores.split())
    return tabla


def decimales(texto):
    return len(texto.split(".")[1]) if "." in texto else 0


def comparar_con_documentacion(df, documentado):
    filas = []
    for variable, valores in zip(VARIABLES, documentado.values()):
        reales = (df[variable].min(), df[variable].max(), df[variable].mean(), df[variable].std())
        for estadistico, texto, real in zip(("min", "max", "media", "de"), valores, reales):
            unidad = 10 ** -decimales(texto)
            diferencia = abs(real - float(texto))
            filas.append({
                "variable": variable, "estadistico": estadistico, "documentado": float(texto), "real": real,
                "redondeo_ok": diferencia <= unidad / 2 + 1e-9,
                "truncado_ok": 0 <= real - float(texto) < unidad + 1e-9,
            })
    return pd.DataFrame(filas)


def creador_documentado(descr):
    for linea in descr.splitlines():
        if linea.startswith(":Creator:"):
            return linea.split(":Creator:")[1].strip()
    return None


documentado = resumen_documentado(datos.DESCR)
comparacion = comparar_con_documentacion(vinos, documentado)
discrepancias = comparacion[~comparacion["redondeo_ok"]]
ficha = {
    "filas": len(vinos),
    "variables": len(VARIABLES),
    "faltantes": int(vinos.isna().sum().sum()),
    "duplicados": int(vinos.duplicated().sum()),
    "por_cultivar": vinos["cultivar"].value_counts().sort_index().to_dict(),
    "discrepancias_explicadas_por_truncado": bool(discrepancias["truncado_ok"].all()),
    "creador_documentado": creador_documentado(datos.DESCR),
    "creador_entre_autores_originales": creador_documentado(datos.DESCR) in datos.DESCR.split("Original Owners:")[1].split("Citation:")[0],
}
print(discrepancias[["variable", "estadistico", "documentado", "real"]].round(4).to_string(index=False))`;

const S2 = py`import numpy as np
import matplotlib.pyplot as plt


def perfil(df, variables, k=1.5):
    filas = []
    for v in variables:
        x = df[v]
        q1, q3 = x.quantile([0.25, 0.75])
        fuera = ((x < q1 - k * (q3 - q1)) | (x > q3 + k * (q3 - q1))).sum()
        filas.append({"variable": v, "media": x.mean(), "mediana": x.median(), "asimetria": x.skew(), "atipicos": int(fuera)})
    return pd.DataFrame(filas).set_index("variable")


def pares_correlacion(df, variables, metodo="pearson", n=5):
    r = df[variables].corr(method=metodo)
    pares = [(a, b, r.loc[a, b]) for i, a in enumerate(variables) for b in variables[i + 1:]]
    pares.sort(key=lambda p: abs(p[2]), reverse=True)
    return pd.DataFrame(pares[:n], columns=["a", "b", "r"])


def histogramas(df, variables):
    filas = int(np.ceil(len(variables) / 4))
    fig, ejes = plt.subplots(filas, 4, figsize=(12, 2.6 * filas))
    for eje, v in zip(ejes.flat, variables):
        eje.hist(df[v], bins=20)
        eje.set_title(v, fontsize=9)
    for eje in list(ejes.flat)[len(variables):]:
        eje.set_visible(False)
    fig.tight_layout()
    return fig


tabla_perfil = perfil(vinos, VARIABLES)
mas_asimetricas = tabla_perfil["asimetria"].abs().sort_values(ascending=False).index[:3].tolist()
top_pearson = pares_correlacion(vinos, VARIABLES)
spearman = vinos[VARIABLES].corr(method="spearman")
top_pearson["spearman"] = [spearman.loc[a, b] for a, b in zip(top_pearson["a"], top_pearson["b"])]
figura_hist = histogramas(vinos, VARIABLES)`;

const S3 = py`from scipy import stats


def eta_cuadrado(df, variable, grupo="cultivar"):
    total = ((df[variable] - df[variable].mean()) ** 2).sum()
    entre = sum(len(g) * (g[variable].mean() - df[variable].mean()) ** 2 for _, g in df.groupby(grupo))
    return entre / total


def holm(pvalores):
    """Ajuste de Holm-Bonferroni: devuelve los p ajustados en el orden original."""
    p = np.asarray(pvalores, dtype=float)
    m = len(p)
    orden = np.argsort(p)
    ajustados = np.empty(m)
    maximo = 0.0
    for rango, i in enumerate(orden):
        maximo = max(maximo, (m - rango) * p[i])
        ajustados[i] = min(1.0, maximo)
    return ajustados


def comparar_grupos(df, variables, grupo="cultivar"):
    filas = []
    for v in variables:
        muestras = [g[v].to_numpy() for _, g in df.groupby(grupo)]
        filas.append({
            "variable": v,
            "F": stats.f_oneway(*muestras).statistic,
            "p_anova": stats.f_oneway(*muestras).pvalue,
            "p_kruskal": stats.kruskal(*muestras).pvalue,
            "p_levene": stats.levene(*muestras).pvalue,
            "eta2": eta_cuadrado(df, v, grupo),
        })
    tabla = pd.DataFrame(filas).set_index("variable")
    tabla["p_holm"] = holm(tabla["p_anova"])
    return tabla.sort_values("eta2", ascending=False)


medias_por_cultivar = vinos.groupby("cultivar")[VARIABLES].mean().round(3)
contrastes = comparar_grupos(vinos, VARIABLES)
mejor = contrastes.index[0]
tukey = stats.tukey_hsd(*[g[mejor].to_numpy() for _, g in vinos.groupby("cultivar")])`;

const S4 = py`def pca_manual(df, variables):
    X = df[variables].to_numpy(dtype=float)
    Z = (X - X.mean(axis=0)) / X.std(axis=0, ddof=0)
    U, s, Vt = np.linalg.svd(Z, full_matrices=False)
    varianza = s**2 / (s**2).sum()
    componentes = Z @ Vt.T
    return componentes, varianza, Vt


def centroide_mas_cercano(componentes, grupos, k=2):
    """Exactitud de clasificar cada vino por el centroide más cercano en las k primeras componentes (dejando uno fuera)."""
    puntos = componentes[:, :k]
    grupos = np.asarray(grupos)
    aciertos = 0
    for i in range(len(puntos)):
        resto = np.ones(len(puntos), dtype=bool)
        resto[i] = False
        etiquetas = np.unique(grupos[resto])
        centroides = np.array([puntos[resto & (grupos == g)].mean(axis=0) for g in etiquetas])
        aciertos += etiquetas[np.argmin(((centroides - puntos[i]) ** 2).sum(axis=1))] == grupos[i]
    return aciertos / len(puntos)


def dispersion_pca(componentes, grupos, nombres):
    fig, eje = plt.subplots(figsize=(6, 5))
    for g, nombre in enumerate(nombres):
        sel = np.asarray(grupos) == g
        eje.scatter(componentes[sel, 0], componentes[sel, 1], s=18, label=nombre)
    eje.set_xlabel("Componente 1")
    eje.set_ylabel("Componente 2")
    eje.set_title("Vinos en el plano de las dos primeras componentes")
    eje.legend()
    return fig


componentes, varianza_explicada, cargas = pca_manual(vinos, VARIABLES)
exactitud_pca2 = centroide_mas_cercano(componentes, vinos["cultivar"], k=2)
figura_pca = dispersion_pca(componentes, vinos["cultivar"], [f"cultivar {g}" for g in range(3)])
informe_explorador = "\n".join([
    f"Fuente: conjunto Wine (UCI), incluido en scikit-learn: {ficha['filas']} vinos, {ficha['variables']} variables químicas, sin faltantes ni duplicados.",
    f"Documentación: {len(discrepancias)} valores del resumen no coinciden con el redondeo"
    + (" y sí con un truncamiento" if ficha["discrepancias_explicadas_por_truncado"] else "")
    + ("" if ficha["creador_entre_autores_originales"] else f"; el campo «Creator» ({ficha['creador_documentado']}) no aparece entre los propietarios originales citados")
    + ".",
    f"Variables más asimétricas: {', '.join(mas_asimetricas)}.",
    f"Par más correlacionado: {top_pearson.loc[0, 'a']} y {top_pearson.loc[0, 'b']} (r = {top_pearson.loc[0, 'r']:.2f}).",
    f"Variable que más separa los cultivares: {mejor} (η² = {contrastes.loc[mejor, 'eta2']:.2f}, p de Holm = {contrastes.loc[mejor, 'p_holm']:.1e}).",
    f"Dos componentes principales explican el {varianza_explicada[:2].sum():.0%} de la varianza y clasifican el {exactitud_pca2:.0%} de los vinos por el centroide más cercano.",
])
print(informe_explorador)`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

export const PROJ_EXPLORADOR: Mission[] = [
  {
    id: "px-vinos-1",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El explorador de datos públicos · 1: la fuente, su ficha y su documentación",
    kind: "project",
    difficulty: 2,
    skills: ["eda", "documentacion", "verificacion", "estadistica-descriptiva"],
    requires: ["e-cajas"],
    series: { ...SERIES, stage: 1 },
    packages: PAQUETES,
    story: "El archivo del Imperio guarda un conjunto de datos público famoso: el análisis químico de 178 vinos de tres cultivares italianos. Antes de sacar conclusiones, la archivera exige dos cosas: saber de dónde vienen los datos y comprobar que su documentación dice la verdad.",
    objective: "Cargar el conjunto Wine incluido en scikit-learn, construir su ficha (tamaño, faltantes, duplicados, clases) y comparar cada estadístico de la documentación con el calculado, distinguiendo el redondeo de otros desajustes.",
    before: ["Estadística descriptiva", "pandas", "Cadenas de texto"],
    intuition: [
      "Un conjunto de datos público trae su **documentación** (en scikit-learn, el texto `DESCR`): origen, autores, variables y un resumen numérico. Leerla es el primer paso del análisis… y comprobarla, el segundo.",
      "",
      "La tabla de la documentación da valores redondeados (13,0; 0,74; 746). Un valor es **compatible con el redondeo** si dista del real como mucho media unidad de su última cifra: 13,001 es compatible con «13.0», pero 2,3665 no lo es con «2.36» (redondeado sería 2,37).",
      "",
      "Si las discrepancias desaparecen al suponer que se **truncó** (se cortaron cifras en lugar de redondear), no hay un error en los datos: hay un descuido en la documentación. Y la documentación tiene otro: su campo «Creator» no coincide con los autores originales que cita más abajo.",
      "",
      "Conclusión práctica: ni los datos ni su documentación se aceptan sin comprobarlos.",
    ],
    formal: "compatible con redondeo ⇔ |real − doc| ≤ ½·10^(−d) · compatible con truncado ⇔ 0 ≤ real − doc < 10^(−d), con d = decimales del valor documentado",
    example: {
      code: py`texto = "746"
real = 746.8933
decimales = len(texto.split(".")[1]) if "." in texto else 0
unidad = 10 ** -decimales
print(abs(real - float(texto)) <= unidad / 2, 0 <= real - float(texto) < unidad)`,
      lines: [
        "Un valor documentado sin decimales.",
        "La media real de proline.",
        "Cuántas cifras decimales tiene el texto: 0.",
        "La unidad de la última cifra: 1.",
        "False True: no es un redondeo de 746,89 (sería 747), pero sí un truncado.",
      ],
    },
    challenge: [
      "1. `datos = load_wine(as_frame=True)`, `vinos` (su `frame` con la columna `target` renombrada a `cultivar`) y `VARIABLES` (los nombres de las 13 variables).",
      "2. `resumen_documentado(descr)`: de la sección «:Summary Statistics:» (hasta «:Missing Attribute Values:»), un diccionario nombre → tupla de 4 textos (min, max, media, de), sin las líneas de `=`.",
      "3. `decimales(texto)` y `comparar_con_documentacion(df, documentado)`: emparejando en orden las variables con las filas documentadas, un DataFrame con `variable`, `estadistico` (`min`, `max`, `media`, `de`), `documentado`, `real` (la desviación típica con ddof = 1), `redondeo_ok` y `truncado_ok`.",
      "4. `creador_documentado(descr)`: el texto tras «:Creator:» (o `None`).",
      "5. `documentado`, `comparacion`, `discrepancias` (filas sin `redondeo_ok`) y `ficha` con `filas`, `variables`, `faltantes`, `duplicados`, `por_cultivar` (dict), `discrepancias_explicadas_por_truncado`, `creador_documentado` y `creador_entre_autores_originales` (si el creador aparece en la sección «Original Owners:» … «Citation:»). Imprime las discrepancias.",
    ],
    starter: py`import pandas as pd
from sklearn.datasets import load_wine

datos = load_wine(as_frame=True)
vinos = datos.frame
VARIABLES = list(datos.feature_names)


def resumen_documentado(descr):
    return {}


def decimales(texto):
    return 0


def comparar_con_documentacion(df, documentado):
    return pd.DataFrame(columns=["variable", "estadistico", "documentado", "real", "redondeo_ok", "truncado_ok"])


def creador_documentado(descr):
    return None


documentado = resumen_documentado(datos.DESCR)
comparacion = comparar_con_documentacion(vinos, documentado)
discrepancias = comparacion[~comparacion["redondeo_ok"].astype(bool)]
ficha = {}`,
    solution: SOL1,
    tests: py`
import pandas as pd

def test_carga():
    "El conjunto y su columna de clase"
    v = t.get("vinos", pd.DataFrame)
    assert v.shape == (178, 14) and "cultivar" in v.columns and "target" not in v.columns
    assert len(t.get("VARIABLES", list)) == 13

def test_resumen_documentado():
    "La tabla de la documentación"
    d = t.get("documentado", dict)
    assert len(d) == 13
    assert list(d.values())[0] == ("11.0", "14.8", "13.0", "0.8")
    assert list(d.values())[-1] == ("278", "1680", "746", "315")
    dec = t.get("decimales", "function")
    assert (dec("0.8"), dec("315"), dec("5.80")) == (1, 0, 2)

def test_comparacion():
    "Tres medias truncadas y nada más"
    c, d = t.get("comparacion", pd.DataFrame), t.get("discrepancias", pd.DataFrame)
    assert len(c) == 52 and set(c["estadistico"]) == {"min", "max", "media", "de"}
    v = t.get("vinos", pd.DataFrame)
    fila = c[(c["variable"] == "proline") & (c["estadistico"] == "de")].iloc[0]
    assert abs(fila["real"] - v["proline"].std()) < 1e-9, "Usa la desviación típica muestral (ddof = 1)"
    assert sorted(d["variable"]) == ["ash", "proline", "total_phenols"] and set(d["estadistico"]) == {"media"}
    assert d["truncado_ok"].all()
    alterado = v.assign(alcohol=v["alcohol"] * 2)
    otra = t.get("comparar_con_documentacion", "function")(alterado, t.get("documentado"))
    assert (~otra.loc[otra["variable"] == "alcohol", "redondeo_ok"]).all()

def test_ficha():
    "La ficha del conjunto"
    f = t.get("ficha", dict)
    assert (f["filas"], f["variables"], f["faltantes"], f["duplicados"]) == (178, 13, 0, 0)
    assert f["por_cultivar"] == {0: 59, 1: 71, 2: 48}
    assert f["discrepancias_explicadas_por_truncado"] is True
    assert f["creador_documentado"] == "R.A. Fisher" and f["creador_entre_autores_originales"] is False
`,
    hints: [
      "resumen_documentado: `descr.split(\":Summary Statistics:\")[1].split(\":Missing Attribute Values:\")[0]`; en cada línea con `:` que no empiece por `=`, `nombre, valores = linea.split(\":\", 1)` y `tuple(valores.split())`.",
      "comparar_con_documentacion: `zip(VARIABLES, documentado.values())` empareja en orden; los reales son `(x.min(), x.max(), x.mean(), x.std())`; la unidad es `10 ** -decimales(texto)`.",
      "creador_entre_autores_originales: `ficha[\"creador_documentado\"] in descr.split(\"Original Owners:\")[1].split(\"Citation:\")[0]`.",
    ],
    errors: [
      { error: "Comparar con == valores reales y documentados", fix: "La documentación redondea: compara con una tolerancia de media unidad de su última cifra." },
      { error: "Concluir que los datos están mal porque no coinciden con la documentación", fix: "Primero busca la explicación más simple (redondeo, truncado, otra fórmula de la desviación); aquí los datos están bien." },
      { error: "Usar la documentación sin leerla", fix: "Dice de dónde vienen los datos, qué mide cada variable y cómo citarlos; y puede contener errores." },
    ],
    quiz: {
      question: "La documentación dice que la media de proline es 746 y tú obtienes 746,89. ¿Qué haces?",
      options: [
        { text: "Compruebo si la diferencia se explica por cómo se escribió el número (aquí, truncado) y, si es así, lo anoto como descuido de la documentación" },
        { text: "Corrijo los datos para que la media sea 746" },
        { text: "Descarto el conjunto de datos porque no es fiable" },
        { text: "Lo ignoro: una diferencia menor de 1 nunca importa" },
      ],
      answer: 0,
      explanation: "Las discrepancias se explican antes de decidir. Aquí las tres diferencias encajan con un truncamiento: los datos son correctos y la documentación, algo descuidada.",
    },
    project: SPEC,
    review: "Repasa: leer y citar la fuente; tolerancia de redondeo de la última cifra; redondear frente a truncar; documentar las discrepancias.",
    xp: 100,
    coins: 15,
  },
  {
    id: "px-vinos-2",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El explorador de datos públicos · 2: distribuciones, atípicos y correlaciones",
    kind: "project",
    difficulty: 3,
    skills: ["eda", "forma", "correlacion", "visualizacion"],
    requires: ["px-vinos-1", "r-correlacion"],
    series: { ...SERIES, stage: 2 },
    packages: PAQUETES,
    story: "Con la fuente verificada, la archivera quiere un retrato de cada variable y de cómo se relacionan: ¿cuáles son asimétricas?, ¿hay valores raros?, ¿qué medidas químicas van de la mano?",
    objective: "Resumir cada variable con media, mediana, asimetría y número de atípicos por la regla de Tukey, encontrar los pares más correlacionados con Pearson y Spearman y dibujar los histogramas.",
    before: ["Etapa 1", "Forma de una distribución", "Correlación"],
    intuition: [
      "Cuando la **media** se separa de la **mediana**, la distribución es asimétrica. La **asimetría** lo cuantifica: positiva si hay una cola larga a la derecha (magnesium, malic_acid).",
      "",
      "La regla de **Tukey** marca como atípico lo que queda a más de 1,5 RIC de los cuartiles. Es una señal para revisar, no una orden de borrar: en datos químicos un valor alto puede ser real.",
      "",
      "Con 13 variables hay 13·12/2 = 78 pares. Ordenarlos por |r| muestra las relaciones fuertes. **Spearman** (correlación de rangos) mide relaciones monótonas y resiste mejor los atípicos: si se parece a Pearson, la relación es aproximadamente lineal.",
      "",
      "Fenoles totales y flavonoides tienen r ≈ 0,86: los flavonoides son un tipo de fenol, así que una correlación alta no sorprende y no implica que una cause la otra.",
    ],
    formal: "atípico ⇔ x < Q1 − 1,5·RIC ∨ x > Q3 + 1,5·RIC · asimetría ajustada G₁ = √(n(n − 1))/(n − 2) · m₃/m₂^(3/2) (pandas .skew()) · Spearman = Pearson de los rangos",
    example: {
      code: py`import pandas as pd
x = pd.Series([1, 2, 2, 3, 3, 3, 4, 20])
q1, q3 = x.quantile([0.25, 0.75])
print(x.mean(), x.median(), round(x.skew(), 2), x[x > q3 + 1.5 * (q3 - q1)].tolist())`,
      lines: [
        "pandas.",
        "Ocho valores con uno muy grande.",
        "Primer y tercer cuartil.",
        "Media 4,75 frente a mediana 3, asimetría positiva grande y el 20 marcado como atípico.",
      ],
    },
    challenge: [
      "1. `perfil(df, variables, k=1.5)`: DataFrame indexado por variable con `media`, `mediana`, `asimetria` (`.skew()` de pandas) y `atipicos` (número de valores fuera de las vallas de Tukey).",
      "2. `pares_correlacion(df, variables, metodo=\"pearson\", n=5)`: los n pares distintos (sin repetir a-b y b-a) con mayor |r|, como DataFrame `a`, `b`, `r` ordenado por |r| descendente.",
      "3. `histogramas(df, variables)`: una figura con un histograma (20 intervalos) por variable en una rejilla de 4 columnas, cada eje titulado con su variable; oculta los ejes sobrantes.",
      "4. `tabla_perfil`, `mas_asimetricas` (las 3 variables con mayor |asimetría|), `top_pearson` con una columna `spearman` añadida para los mismos pares, y `figura_hist`.",
    ],
    starter: py`import numpy as np
import matplotlib.pyplot as plt


def perfil(df, variables, k=1.5):
    return pd.DataFrame()


def pares_correlacion(df, variables, metodo="pearson", n=5):
    return pd.DataFrame(columns=["a", "b", "r"])


def histogramas(df, variables):
    return plt.figure()


tabla_perfil = perfil(vinos, VARIABLES)
mas_asimetricas = []
top_pearson = pares_correlacion(vinos, VARIABLES)
figura_hist = histogramas(vinos, VARIABLES)`,
    solution: SOL2,
    tests: py`
import numpy as np
import pandas as pd
from scipy import stats

def test_perfil():
    "Resumen de cada variable"
    p, v = t.get("tabla_perfil", pd.DataFrame), t.get("vinos", pd.DataFrame)
    assert len(p) == 13 and {"media", "mediana", "asimetria", "atipicos"} <= set(p.columns)
    for var in ("magnesium", "hue"):
        x = v[var]
        q1, q3 = x.quantile([0.25, 0.75])
        fuera = int(((x < q1 - 1.5 * (q3 - q1)) | (x > q3 + 1.5 * (q3 - q1))).sum())
        assert p.loc[var, "atipicos"] == fuera and abs(p.loc[var, "asimetria"] - stats.skew(x, bias=False)) < 1e-9
        assert abs(p.loc[var, "mediana"] - x.median()) < 1e-12
    esperado = p["asimetria"].abs().sort_values(ascending=False).index[:3].tolist()
    assert t.get("mas_asimetricas", list) == esperado == ["magnesium", "malic_acid", "color_intensity"]

def test_pares():
    "Pares más correlacionados, sin repeticiones"
    pc, v, vs = t.get("pares_correlacion", "function"), t.get("vinos", pd.DataFrame), t.get("VARIABLES", list)
    top = pc(v, vs, n=10)
    assert len(top) == 10 and len({frozenset(x) for x in zip(top["a"], top["b"])}) == 10
    assert all(a != b for a, b in zip(top["a"], top["b"]))
    assert list(top["r"].abs()) == sorted(top["r"].abs(), reverse=True)
    assert {top.loc[0, "a"], top.loc[0, "b"]} == {"total_phenols", "flavanoids"}
    assert abs(top.loc[0, "r"] - np.corrcoef(v["total_phenols"], v["flavanoids"])[0, 1]) < 1e-12
    assert len(pc(v, vs, n=78)) == 78

def test_spearman():
    "Spearman para los mismos pares"
    tp, v = t.get("top_pearson", pd.DataFrame), t.get("vinos", pd.DataFrame)
    assert len(tp) == 5
    for a, b, s in zip(tp["a"], tp["b"], tp["spearman"]):
        assert abs(s - stats.spearmanr(v[a], v[b]).statistic) < 1e-12

def test_histogramas():
    "Un histograma por variable"
    fig = t.get("figura_hist")
    visibles = [ax for ax in fig.axes if ax.get_visible()]
    assert len(visibles) == 13 and sorted(ax.get_title() for ax in visibles) == sorted(t.get("VARIABLES"))
    assert all(len(ax.patches) == 20 for ax in visibles)
`,
    hints: [
      "perfil: por variable, `q1, q3 = x.quantile([0.25, 0.75])` y cuenta `((x < q1 - k * ric) | (x > q3 + k * ric)).sum()`.",
      "pares_correlacion: `r = df[variables].corr(method=metodo)` y recorre `for i, a in enumerate(variables): for b in variables[i + 1:]` para no repetir pares; ordena con `key=lambda p: abs(p[2])`.",
      "histogramas: `fig, ejes = plt.subplots(filas, 4, ...)` y `zip(ejes.flat, variables)`; los ejes sobrantes con `eje.set_visible(False)`.",
    ],
    errors: [
      { error: "Ordenar las correlaciones por r en lugar de |r|", fix: "Una correlación de −0,8 es tan fuerte como una de 0,8: ordena por el valor absoluto." },
      { error: "Contar cada par dos veces (a-b y b-a) o el par de una variable consigo misma", fix: "Recorre solo el triángulo superior de la matriz." },
      { error: "Borrar los atípicos de Tukey sin más", fix: "Son valores a revisar; en datos de laboratorio pueden ser perfectamente reales." },
    ],
    quiz: {
      question: "Fenoles totales y flavonoides tienen r = 0,86. ¿Qué puedes concluir?",
      options: [
        { text: "Que suben y bajan juntos de forma casi lineal en estos vinos; no que uno cause el otro (además, los flavonoides son parte de los fenoles)" },
        { text: "Que añadir fenoles a un vino aumentará sus flavonoides", misconception: "correlacion-causalidad" },
        { text: "Que el 86 % de los flavonoides se explica por los fenoles" },
        { text: "Nada, porque la correlación solo sirve con datos normales", misconception: "normalidad-universal" },
      ],
      answer: 0,
      explanation: "La correlación describe asociación. r² ≈ 0,75 sería la proporción de varianza compartida en un modelo lineal, no el 86 %. Spearman (0,88) confirma que la relación es monótona.",
    },
    lab: { lab: "estadistica", tab: "regresion", label: "Regresión y correlación" },
    project: SPEC,
    review: "Repasa: media frente a mediana y asimetría; vallas de Tukey; pares por |r| sin repetir; Spearman como contraste de Pearson.",
    xp: 120,
    coins: 18,
  },
  {
    id: "px-vinos-3",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El explorador de datos públicos · 3: ¿se distinguen los cultivares?",
    kind: "project",
    difficulty: 4,
    skills: ["anova", "comparaciones-multiples", "tamano-efecto", "no-parametricas"],
    requires: ["px-vinos-2", "i-chi2-anova"],
    series: { ...SERIES, stage: 3 },
    packages: PAQUETES,
    story: "La pregunta del archivo: ¿la química distingue los tres cultivares? Con 13 variables y tres grupos hay muchas comparaciones posibles, y la archivera ha visto demasiados informes que encuentran «algo significativo» a fuerza de probar.",
    objective: "Comparar los tres cultivares en cada variable con ANOVA y Kruskal-Wallis, revisar la igualdad de varianzas, ajustar los p-valores por comparaciones múltiples con el método de Holm, ordenar por η² y localizar con Tukey qué pares difieren en la variable que más separa.",
    before: ["Etapas 1 y 2", "ANOVA de un factor", "Comparaciones múltiples y tamaño del efecto"],
    intuition: [
      "**ANOVA** compara la variación entre las medias de los grupos con la variación dentro de ellos. **Kruskal-Wallis** hace la pregunta equivalente con rangos, sin suponer normalidad. Si coinciden, la conclusión es robusta.",
      "",
      "**Levene** comprueba si las varianzas son parecidas; si no lo son, conviene tenerlo presente (o usar ANOVA de Welch).",
      "",
      "Con 13 pruebas, la probabilidad de algún falso positivo crece. **Holm** ordena los p-valores de menor a mayor, multiplica el k-ésimo por (m − k + 1) y fuerza que no disminuyan: controla el error de tipo I de toda la familia sin ser tan severo como Bonferroni.",
      "",
      "Con 178 vinos casi todo sale «significativo»: por eso se ordena por el **tamaño del efecto**, η² = SC entre / SC total (la proporción de la variación que explican los cultivares). Para ANOVA de un factor se cumple η² = F·gl₁ / (F·gl₁ + gl₂).",
      "",
      "ANOVA dice que *algún* grupo difiere; **Tukey HSD** dice *cuáles*.",
    ],
    formal: "η² = Σ nⱼ(x̄ⱼ − x̄)² / Σ (xᵢ − x̄)² · Holm: p̃₍ₖ₎ = máx_{j ≤ k} min(1, (m − j + 1)·p₍ⱼ₎)",
    example: {
      code: py`import numpy as np
p = np.array([0.01, 0.04, 0.03, 0.005])
orden = np.argsort(p)
print(orden, [round((len(p) - rango) * p[i], 3) for rango, i in enumerate(orden)])`,
      lines: [
        "NumPy.",
        "Cuatro p-valores sin ajustar.",
        "De menor a mayor: posiciones 3, 0, 2, 1.",
        "Multiplicados por 4, 3, 2 y 1: 0,02; 0,03; 0,06; 0,04. Holm impone que no bajen, así que el último pasa a 0,06.",
      ],
    },
    challenge: [
      "1. `eta_cuadrado(df, variable, grupo=\"cultivar\")`: SC entre grupos / SC total.",
      "2. `holm(pvalores)`: los p ajustados por Holm (monótonos y como mucho 1) en el orden original, como array de NumPy.",
      "3. `comparar_grupos(df, variables, grupo=\"cultivar\")`: DataFrame indexado por variable con `F`, `p_anova` (`stats.f_oneway`), `p_kruskal`, `p_levene`, `eta2` y `p_holm` (Holm sobre los 13 `p_anova`), ordenado por `eta2` descendente.",
      "4. `medias_por_cultivar` (medias por cultivar, 3 decimales), `contrastes`, `mejor` (la variable con mayor η²) y `tukey = stats.tukey_hsd(...)` con los tres cultivares en esa variable.",
    ],
    starter: py`from scipy import stats


def eta_cuadrado(df, variable, grupo="cultivar"):
    return 0.0


def holm(pvalores):
    return np.asarray(pvalores, dtype=float)


def comparar_grupos(df, variables, grupo="cultivar"):
    return pd.DataFrame()


medias_por_cultivar = None
contrastes = comparar_grupos(vinos, VARIABLES)
mejor = None
tukey = None`,
    solution: SOL3,
    tests: py`
import numpy as np
import pandas as pd
from scipy import stats

def test_holm():
    "Holm a mano"
    h = t.get("holm", "function")
    assert np.allclose(h([0.01, 0.04, 0.03, 0.005]), [0.03, 0.06, 0.06, 0.02])
    assert np.allclose(h([0.5, 0.6]), [1.0, 1.0]) and np.allclose(h([0.2]), [0.2])
    p = np.random.default_rng(1).uniform(0, 0.1, size=20)
    a = h(p)
    orden = np.argsort(p)
    assert np.all(np.diff(a[orden]) >= -1e-15) and np.all(a >= p)

def test_eta():
    "η² y su relación con F"
    e, v = t.get("eta_cuadrado", "function"), t.get("vinos", pd.DataFrame)
    for var in ("alcohol", "ash"):
        muestras = [g[var] for _, g in v.groupby("cultivar")]
        F = stats.f_oneway(*muestras).statistic
        assert abs(e(v, var) - 2 * F / (2 * F + 175)) < 1e-12

def test_contrastes():
    "ANOVA, Kruskal, Levene y Holm por variable"
    c, v = t.get("contrastes", pd.DataFrame), t.get("vinos", pd.DataFrame)
    assert len(c) == 13 and list(c["eta2"]) == sorted(c["eta2"], reverse=True)
    muestras = [g["proline"] for _, g in v.groupby("cultivar")]
    assert abs(c.loc["proline", "p_kruskal"] - stats.kruskal(*muestras).pvalue) < 1e-15
    assert abs(c.loc["proline", "F"] - stats.f_oneway(*muestras).statistic) < 1e-9
    assert np.allclose(c["p_holm"], t.get("holm")(c["p_anova"]))
    assert t.get("mejor") == c.index[0] == "flavanoids" and c["p_holm"].max() < 0.001
    assert t.get("medias_por_cultivar").shape == (3, 13)

def test_tukey():
    "Qué cultivares difieren en la variable que más separa"
    tk = t.get("tukey")
    v = t.get("vinos", pd.DataFrame)
    ref = stats.tukey_hsd(*[g["flavanoids"].to_numpy() for _, g in v.groupby("cultivar")])
    assert np.allclose(tk.pvalue, ref.pvalue) and (tk.pvalue[~np.eye(3, dtype=bool)] < 0.001).all()
`,
    hints: [
      "eta_cuadrado: `total = ((x - x.mean()) ** 2).sum()` y `entre = sum(len(g) * (g[variable].mean() - x.mean()) ** 2 for _, g in df.groupby(grupo))`.",
      "holm: `orden = np.argsort(p)`; recorre `enumerate(orden)` acumulando `maximo = max(maximo, (m - rango) * p[i])` y guarda `min(1.0, maximo)` en la posición `i`.",
      "comparar_grupos: `muestras = [g[v].to_numpy() for _, g in df.groupby(grupo)]` y `stats.f_oneway(*muestras)`, `stats.kruskal(*muestras)`, `stats.levene(*muestras)`.",
    ],
    errors: [
      { error: "Informar 13 p-valores sin ajustar y quedarse con los pequeños", fix: "Con muchas pruebas, algún p pequeño aparece por azar: ajusta (Holm) y dilo." },
      { error: "Ordenar las variables por p-valor", fix: "Con muestras grandes los p son diminutos para casi todo; el tamaño del efecto (η²) dice cuánto separa cada variable." },
      { error: "Concluir del ANOVA que los tres grupos difieren entre sí", fix: "ANOVA solo dice que alguno difiere; usa Tukey para ver qué pares." },
    ],
    quiz: {
      question: "Magnesio da p de Holm < 0,001 pero η² = 0,12. ¿Cómo lo describes?",
      options: [
        { text: "Hay una diferencia entre cultivares muy improbable por azar, pero el cultivar explica solo un 12 % de la variación del magnesio: separa poco" },
        { text: "Como p < 0,001, el magnesio es una de las mejores variables para distinguir cultivares", misconception: "significacion-relevancia" },
        { text: "El p-valor indica que hay un 0,1 % de probabilidad de que no haya diferencias", misconception: "p-valor" },
        { text: "Los resultados se contradicen: uno de los dos cálculos está mal" },
      ],
      answer: 0,
      explanation: "Significación y relevancia son cosas distintas. Con 178 vinos un efecto pequeño ya es significativo; η² cuantifica cuánto importa.",
    },
    project: SPEC,
    review: "Repasa: ANOVA y Kruskal; Levene; Holm para muchas pruebas; ordenar por η²; Tukey para localizar diferencias.",
    xp: 140,
    coins: 20,
  },
  {
    id: "px-vinos-4",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El explorador de datos públicos · 4: componentes principales e informe",
    kind: "project",
    difficulty: 4,
    skills: ["pca", "algebra-lineal", "visualizacion", "comunicacion"],
    requires: ["px-vinos-3", "m-matrices"],
    series: { ...SERIES, stage: 4 },
    packages: PAQUETES,
    story: "Trece medidas no caben en un gráfico. La archivera pide una imagen que resuma el conjunto y un informe de seis líneas que cualquiera pueda verificar ejecutando tu código.",
    objective: "Calcular las componentes principales con la descomposición en valores singulares de los datos estandarizados, verificarlas contra scikit-learn, medir cuánto separan los cultivares dos componentes y redactar un informe generado desde los resultados.",
    before: ["Etapas 1 a 3", "Matrices", "Varianza"],
    intuition: [
      "Las variables tienen escalas muy distintas (proline ronda 750; hue, 1). Antes del **PCA** se **estandarizan**: cada una con media 0 y desviación 1, para que ninguna domine por sus unidades.",
      "",
      "La descomposición en valores singulares Z = U·S·Vᵀ da las direcciones principales (filas de Vᵀ) y la varianza que recoge cada una (proporcional a S²). Proyectar Z sobre Vᵀ da las **componentes**: nuevas variables no correlacionadas.",
      "",
      "Aquí, dos componentes recogen algo más de la mitad de la variación y, en su plano, los tres cultivares forman nubes casi separadas. Para cuantificarlo: clasificar cada vino por el **centroide más cercano** calculado **sin ese vino** (dejando uno fuera), para no evaluarse con sus propios datos.",
      "",
      "El **informe** se genera con f-strings a partir de las variables del análisis: si cambian los datos, cambia el informe.",
    ],
    formal: "Z = (X − x̄)/s · Z = U S Vᵀ · componentes = Z V · varianza explicada_k = s_k² / Σ s_j²",
    example: {
      code: py`import numpy as np
X = np.array([[1.0, 2.0], [2.0, 4.1], [3.0, 5.9], [4.0, 8.0]])
Z = (X - X.mean(axis=0)) / X.std(axis=0)
s = np.linalg.svd(Z, compute_uv=False)
print((s**2 / (s**2).sum()).round(4))`,
      lines: [
        "NumPy.",
        "Dos variables casi proporcionales.",
        "Estandarizadas.",
        "Solo los valores singulares.",
        "[9.998e-01 2.000e-04], es decir, 0,9998 y 0,0002: una sola componente recoge casi toda la variación.",
      ],
    },
    challenge: [
      "1. `pca_manual(df, variables)`: estandariza (desviación con ddof = 0), aplica `np.linalg.svd(Z, full_matrices=False)` y devuelve `(componentes, varianza_explicada, Vt)`.",
      "2. `centroide_mas_cercano(componentes, grupos, k=2)`: exactitud de asignar cada punto al grupo cuyo centroide (en las k primeras componentes y calculado sin ese punto) está más cerca.",
      "3. `dispersion_pca(componentes, grupos, nombres)`: dispersión de las dos primeras componentes, un color por grupo, ejes «Componente 1» y «Componente 2», título y leyenda.",
      "4. `componentes, varianza_explicada, cargas`, `exactitud_pca2`, `figura_pca` e `informe_explorador`: seis líneas (fuente; documentación; variables más asimétricas; par más correlacionado; variable que más separa con η² y p de Holm; varianza de dos componentes y exactitud), generadas desde los resultados. Imprímelo.",
    ],
    starter: py`def pca_manual(df, variables):
    return None, None, None


def centroide_mas_cercano(componentes, grupos, k=2):
    return 0.0


def dispersion_pca(componentes, grupos, nombres):
    return plt.figure()


componentes, varianza_explicada, cargas = pca_manual(vinos, VARIABLES)
exactitud_pca2 = 0.0
figura_pca = None
informe_explorador = ""
print(informe_explorador)`,
    solution: SOL4,
    tests: py`
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

def test_pca():
    "Igual que scikit-learn"
    comp, var = t.get("componentes"), t.get("varianza_explicada")
    v, vs = t.get("vinos", pd.DataFrame), t.get("VARIABLES", list)
    ref = PCA().fit(StandardScaler().fit_transform(v[vs]))
    assert np.allclose(var, ref.explained_variance_ratio_) and abs(var.sum() - 1) < 1e-12
    proy = ref.transform(StandardScaler().fit_transform(v[vs]))
    for j in range(3):
        assert np.allclose(np.abs(comp[:, j]), np.abs(proy[:, j])), "Las componentes coinciden salvo el signo"
    c = np.cov(comp[:, :4], rowvar=False)
    assert np.allclose(c - np.diag(np.diag(c)), 0, atol=1e-10), "Las componentes no están correlacionadas"

def test_centroide():
    "Clasificación dejando uno fuera"
    cmc = t.get("centroide_mas_cercano", "function")
    puntos = np.array([[0.0, 0.0], [0.2, 0.0], [0.0, 0.2], [5.0, 5.0], [5.2, 5.0], [5.0, 5.2], [0.1, 0.1]])
    assert cmc(puntos, [0, 0, 0, 1, 1, 1, 1], k=2) == 6 / 7
    e = t.get("exactitud_pca2")
    assert 0.9 < e <= 1 and e == cmc(t.get("componentes"), t.get("vinos")["cultivar"], k=2)

def test_figura():
    "El plano de las dos primeras componentes"
    fig = t.get("figura_pca")
    ax = fig.axes[0]
    assert ax.get_xlabel() == "Componente 1" and ax.get_ylabel() == "Componente 2" and ax.get_title()
    assert len(ax.collections) == 3 and len(ax.get_legend().get_texts()) == 3

def test_informe():
    "Seis líneas generadas desde el análisis"
    texto = t.get("informe_explorador", str)
    lineas = texto.splitlines()
    assert len(lineas) == 6 and texto in t.out
    assert "R.A. Fisher" in lineas[1] and "truncamiento" in lineas[1]
    assert "flavanoids" in lineas[4] and "magnesium" in lineas[2]
    var = t.get("varianza_explicada")
    assert f"{var[:2].sum():.0%}" in lineas[5] and f"{t.get('exactitud_pca2'):.0%}" in lineas[5]
`,
    hints: [
      "pca_manual: `Z = (X - X.mean(axis=0)) / X.std(axis=0, ddof=0)`, `U, s, Vt = np.linalg.svd(Z, full_matrices=False)`, `varianza = s**2 / (s**2).sum()` y `componentes = Z @ Vt.T`.",
      "centroide_mas_cercano: para cada i, una máscara `resto` sin i; los centroides son las medias de `puntos[resto & (grupos == g)]`; elige el de menor distancia al cuadrado.",
      "informe: construye una lista de f-strings con los resultados (`ficha`, `discrepancias`, `mas_asimetricas`, `top_pearson`, `contrastes`, `varianza_explicada`) y únela con saltos de línea.",
    ],
    errors: [
      { error: "Hacer el PCA sin estandarizar", fix: "Proline (cientos) dominaría la primera componente solo por sus unidades." },
      { error: "Evaluar el centroide más cercano incluyendo el propio punto", fix: "El punto atrae su centroide hacia sí y la exactitud sale optimista: déjalo fuera." },
      { error: "Esperar el mismo signo que scikit-learn", fix: "El signo de cada componente es arbitrario: compara valores absolutos." },
    ],
    quiz: {
      question: "Dos componentes explican el 55 % de la varianza y separan el 97 % de los vinos. ¿Qué significa?",
      options: [
        { text: "Que el plano resume algo más de la mitad de la variación química y que, en ese plano, los cultivares forman grupos casi separados; el 45 % restante no se ve en el gráfico" },
        { text: "Que las otras 11 variables no sirven y se pueden borrar" },
        { text: "Que el 97 % de la varianza está en dos componentes" },
        { text: "Que el PCA ha descubierto los cultivares por sí solo, sin usar las etiquetas, con un 97 % de acierto" },
      ],
      answer: 0,
      explanation: "La varianza explicada y la separación de grupos son cosas distintas. El PCA no usa las etiquetas, pero la exactitud sí: mide cuánto separan los cultivares en el plano que el PCA encontró.",
    },
    lab: { lab: "ml", tab: "pca", label: "Componentes principales" },
    project: SPEC,
    review: "Repasa: estandarizar antes del PCA; SVD; varianza explicada; evaluación dejando uno fuera; informes generados desde los datos.",
    xp: 150,
    coins: 22,
  },
];
