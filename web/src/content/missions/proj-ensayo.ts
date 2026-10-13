import { ensayoCsv } from "../datasets";
import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 4: análisis completo de un ensayo clínico sintético, en cuatro
// etapas. Cada etapa amplía el código de la anterior (la solución de la etapa n empieza por la
// de la etapa n − 1).

const SERIES = { id: "ensayo-clinico", title: "Proyecto progresivo: el ensayo del colesterol", of: 4 };
const FILES = { "ensayo.csv": ensayoCsv() };
const PACKAGES = ["numpy", "pandas", "scipy", "statsmodels", "matplotlib"];

const SPEC: ProjectSpec = {
  requirements: [
    "Formular la pregunta en formato PICO antes de mirar los resultados.",
    "Documentar la limpieza y el flujo de pacientes (aleatorizados, completados, abandonos).",
    "Describir los grupos sin contrastes de hipótesis sobre las variables basales.",
    "Estimar el efecto con intervalo de confianza, tamaño del efecto y efecto absoluto (NNT).",
    "Ajustar por la medida basal, revisar supuestos y hacer un análisis de sensibilidad por los abandonos.",
    "Redactar un informe con conclusiones proporcionadas a la evidencia y sus limitaciones.",
  ],
  dataset: "ensayo.csv: 240 pacientes aleatorizados por bloques a fármaco o placebo en tres centros, con LDL basal y a las 12 semanas, eventos adversos y abandonos (datos sintéticos, uso educativo).",
  stages: [
    "Pregunta, población y calidad de datos",
    "Tabla 1, balance y estimación del efecto",
    "Contraste, respondedores, tamaño del efecto y seguridad",
    "Modelo ajustado, supuestos, sensibilidad e informe",
  ],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Cada cifra del informe se calcula con código, no se copia a mano.",
    "Las conclusiones distinguen significación, magnitud y relevancia clínica.",
    "Las limitaciones mencionan los abandonos y el carácter sintético de los datos.",
  ],
  extensions: [
    "Imputación múltiple de los abandonos (statsmodels.imputation.mice) y comparación con el análisis de sensibilidad.",
    "Ajuste adicional por la edad (desequilibrada por azar, DME ≈ 0,4) y comparación con el efecto principal.",
    "Efecto por centro (interacción brazo × centro) con su interpretación prudente.",
    "Informe reproducible en Markdown generado desde el propio código.",
  ],
  portfolio: "Análisis estadístico completo de un ensayo aleatorizado: calidad de datos, flujo de pacientes, estimación con IC, NNT, ANCOVA, supuestos, sensibilidad e informe con limitaciones.",
};

const S1 = py`import numpy as np
import pandas as pd

PREGUNTA = {
    "poblacion": "Adultos con colesterol LDL elevado atendidos en tres centros",
    "intervencion": "Fármaco hipolipemiante durante 12 semanas",
    "comparador": "Placebo",
    "desenlace": "Cambio del LDL (mg/dL) entre el inicio y la semana 12",
}

def cargar(ruta):
    return pd.read_csv(ruta)

def limpiar(df):
    duplicados = int(df.duplicated().sum())
    limpio = df.drop_duplicates().copy()
    invalidas = ~limpio["edad"].between(18, 90)
    limpio.loc[invalidas, "edad"] = np.nan
    limpio["sexo"] = limpio["sexo"].str.upper()
    informe = {"duplicados": duplicados, "edades_invalidas": int(invalidas.sum()), "n": len(limpio)}
    return limpio, informe

def flujo(datos):
    g = datos.groupby("brazo")
    tabla = pd.DataFrame({"aleatorizados": g.size(), "completaron": g["ldl_12s"].count()})
    tabla["abandonos"] = tabla["aleatorizados"] - tabla["completaron"]
    tabla["pct_abandono"] = 100 * tabla["abandonos"] / tabla["aleatorizados"]
    return tabla

datos, informe = limpiar(cargar("ensayo.csv"))`;

const S2 = py`from scipy import stats
import matplotlib.pyplot as plt

def tabla1(datos):
    g = datos.groupby("brazo")
    return pd.DataFrame({
        "n": g.size(),
        "edad_media": g["edad"].mean(),
        "edad_de": g["edad"].std(),
        "pct_mujeres": 100 * g["sexo"].apply(lambda s: (s == "F").mean()),
        "imc_media": g["imc"].mean(),
        "ldl_basal_media": g["ldl_basal"].mean(),
    })

def dme(datos, variable):
    a = datos.loc[datos.brazo == "farmaco", variable].dropna()
    b = datos.loc[datos.brazo == "placebo", variable].dropna()
    return (a.mean() - b.mean()) / np.sqrt((a.var() + b.var()) / 2)

def con_cambio(datos):
    c = datos.dropna(subset=["ldl_12s"]).copy()
    c["cambio"] = c["ldl_12s"] - c["ldl_basal"]
    return c

def estimar(datos):
    c = con_cambio(datos)
    a = c.loc[c.brazo == "farmaco", "cambio"]
    b = c.loc[c.brazo == "placebo", "cambio"]
    v1, v2 = a.var() / len(a), b.var() / len(b)
    ee = np.sqrt(v1 + v2)
    gl = (v1 + v2) ** 2 / (v1 ** 2 / (len(a) - 1) + v2 ** 2 / (len(b) - 1))
    dif = a.mean() - b.mean()
    q = stats.t.ppf(0.975, gl)
    return {"dif": dif, "ee": ee, "ic": (dif - q * ee, dif + q * ee), "n_farmaco": len(a), "n_placebo": len(b)}

fig, ax = plt.subplots()
_c = con_cambio(datos)
ax.boxplot([_c.loc[_c.brazo == "placebo", "cambio"], _c.loc[_c.brazo == "farmaco", "cambio"]])
ax.set_xticks([1, 2], ["Placebo", "Fármaco"])
ax.set_ylabel("Cambio de LDL (mg/dL)")
ax.set_title("Cambio de LDL a las 12 semanas")`;

const S3 = py`def contraste(datos):
    c = con_cambio(datos)
    r = stats.ttest_ind(c.loc[c.brazo == "farmaco", "cambio"], c.loc[c.brazo == "placebo", "cambio"], equal_var=False)
    return {"t": r.statistic, "p": r.pvalue}

def respondedores(datos, umbral=30):
    c = con_cambio(datos)
    c["responde"] = (c["ldl_basal"] - c["ldl_12s"]) >= umbral
    g = c.groupby("brazo")["responde"]
    return pd.DataFrame({"n": g.size(), "k": g.sum().astype(int), "proporcion": g.mean()})

def riesgos(tabla):
    p1, n1 = tabla.loc["farmaco", "proporcion"], tabla.loc["farmaco", "n"]
    p2, n2 = tabla.loc["placebo", "proporcion"], tabla.loc["placebo", "n"]
    dr = p1 - p2
    ee = np.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
    return {"rr": p1 / p2, "dr": dr, "ic_dr": (dr - 1.96 * ee, dr + 1.96 * ee), "nnt": 1 / dr}

def d_cohen(datos):
    c = con_cambio(datos)
    a = c.loc[c.brazo == "farmaco", "cambio"]
    b = c.loc[c.brazo == "placebo", "cambio"]
    sp = np.sqrt(((len(a) - 1) * a.var() + (len(b) - 1) * b.var()) / (len(a) + len(b) - 2))
    return (a.mean() - b.mean()) / sp

def seguridad(datos):
    g = datos.groupby("brazo")["evento_adverso"]
    tabla = pd.DataFrame({"n": g.size(), "eventos": g.sum().astype(int)})
    tabla["proporcion"] = tabla["eventos"] / tabla["n"]
    m = [[tabla.loc[b, "eventos"], tabla.loc[b, "n"] - tabla.loc[b, "eventos"]] for b in ["farmaco", "placebo"]]
    return tabla, stats.fisher_exact(m).pvalue

tabla_resp = respondedores(datos)
_m = [[tabla_resp.loc[b, "k"], tabla_resp.loc[b, "n"] - tabla_resp.loc[b, "k"]] for b in ["farmaco", "placebo"]]
p_fisher = stats.fisher_exact(_m).pvalue`;

const S4 = py`import statsmodels.formula.api as smf

def ancova(datos):
    return smf.ols("cambio ~ C(brazo, Treatment('placebo')) + ldl_basal", data=con_cambio(datos)).fit()

def efecto_ajustado(modelo):
    nombre = "C(brazo, Treatment('placebo'))[T.farmaco]"
    lo, hi = modelo.conf_int().loc[nombre]
    return {"efecto": modelo.params[nombre], "ic": (lo, hi), "p": modelo.pvalues[nombre]}

def supuestos(modelo, datos):
    c = con_cambio(datos)
    return {
        "shapiro_p": stats.shapiro(modelo.resid).pvalue,
        "levene_p": stats.levene(c.loc[c.brazo == "farmaco", "cambio"], c.loc[c.brazo == "placebo", "cambio"]).pvalue,
    }

def sensibilidad(datos):
    todos = datos.copy()
    todos["cambio"] = (todos["ldl_12s"] - todos["ldl_basal"]).fillna(0)
    a = todos.loc[todos.brazo == "farmaco", "cambio"]
    b = todos.loc[todos.brazo == "placebo", "cambio"]
    r = stats.ttest_ind(a, b, equal_var=False)
    ic = r.confidence_interval()
    return {"dif": a.mean() - b.mean(), "ic": (ic.low, ic.high)}

modelo = ancova(datos)
_est = estimar(datos)
_aj = efecto_ajustado(modelo)
_seg, _p_seg = seguridad(datos)
informe_final = {
    "pregunta": PREGUNTA,
    "efecto_principal": _est["dif"],
    "ic95": _est["ic"],
    "p": contraste(datos)["p"],
    "efecto_ajustado": _aj["efecto"],
    "sensibilidad": sensibilidad(datos)["dif"],
    "nnt": riesgos(respondedores(datos))["nnt"],
    "eventos_adversos": _seg["proporcion"].to_dict(),
    "conclusion": (
        f"En este ensayo sintético el fármaco redujo el LDL {abs(_est['dif']):.1f} mg/dL más que el placebo "
        f"(IC 95 %: {abs(_est['ic'][1]):.1f} a {abs(_est['ic'][0]):.1f}); el resultado se mantiene al ajustar por el LDL basal "
        f"y en el análisis de sensibilidad, a costa de más eventos adversos."
    ),
    "limitaciones": [
        "Datos sintéticos generados con fines educativos: no permiten conclusiones clínicas.",
        "Los abandonos fueron más frecuentes con el fármaco; el análisis principal solo incluye a quienes completaron.",
        "Seguimiento de 12 semanas: no informa sobre eventos cardiovasculares ni efectos a largo plazo.",
    ],
}`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

export const PROJ_ENSAYO: Mission[] = [
  {
    id: "pe-ensayo-1",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El ensayo del colesterol · 1: pregunta, población y calidad de datos",
    kind: "project",
    difficulty: 3,
    skills: ["diseno-estudio", "limpieza-datos", "pandas", "estadistica-clinica"],
    requires: ["c-experimentos", "w3-limpieza"],
    series: { ...SERIES, stage: 1 },
    story: "El comité del Imperio recibe los datos de un ensayo: un fármaco nuevo para bajar el colesterol frente a placebo. Antes de calcular nada, exige saber qué se pregunta exactamente, a quién se estudió y si los datos son de fiar.",
    objective: "Formular la pregunta en formato PICO, limpiar los datos documentando cada decisión y describir el flujo de pacientes de cada brazo.",
    before: ["Diseño experimental y aleatorización", "Limpieza de datos con pandas", "groupby"],
    packages: ["numpy", "pandas"],
    files: FILES,
    intuition: [
      "Un análisis empieza **antes** de los datos: con una pregunta precisa. El formato **PICO** la fija: Población, Intervención, Comparador y desenlace (Outcome). Escribirla primero evita elegir la pregunta a la vista de los resultados.",
      "",
      "Después, la **calidad de datos**: filas duplicadas, edades imposibles, etiquetas incoherentes (`f` y `F`). Cada corrección debe quedar registrada: un informe de limpieza permite que otra persona reproduzca y critique tus decisiones.",
      "",
      "Por último, el **flujo de pacientes** (el diagrama CONSORT de los ensayos): cuántos se aleatorizaron, cuántos completaron y cuántos abandonaron en cada brazo. Si los abandonos difieren entre brazos, analizar solo a quienes completaron puede sesgar el resultado.",
    ],
    formal: "Corregir un valor imposible: marcarlo como faltante (NaN), no inventarlo ni borrar al paciente. Abandono = aleatorizado sin medida final.",
    example: {
      code: py`import pandas as pd
df = pd.read_csv("ensayo.csv")
print(df.shape, df.duplicated().sum())
print(df["sexo"].value_counts().to_dict())
print(df["edad"].describe()[["min", "max"]].to_dict())`,
      lines: [
        "pandas.",
        "Cargamos el ensayo.",
        "Filas, columnas y filas duplicadas exactas.",
        "Las etiquetas de sexo revelan minúsculas inconsistentes.",
        "El mínimo y el máximo de edad delatan errores de registro.",
      ],
    },
    challenge: [
      "1. `PREGUNTA`: diccionario con `poblacion`, `intervencion`, `comparador` y `desenlace` (textos; el desenlace debe nombrar el LDL y el comparador, el placebo).",
      "2. `cargar(ruta)`: el DataFrame del CSV.",
      "3. `limpiar(df)`: tupla (limpio, informe). Elimina duplicados exactos, pone `NaN` en edades fuera de [18, 90], pasa `sexo` a mayúsculas. `informe` = {\"duplicados\", \"edades_invalidas\", \"n\"}.",
      "4. `flujo(datos)`: DataFrame indexado por brazo con `aleatorizados`, `completaron` (con `ldl_12s`), `abandonos` y `pct_abandono`.",
      "5. `datos, informe = limpiar(cargar(\"ensayo.csv\"))`.",
    ],
    starter: py`import numpy as np
import pandas as pd

PREGUNTA = {}

def cargar(ruta):
    return pd.read_csv(ruta)

def limpiar(df):
    return df, {}

def flujo(datos):
    return datos.groupby("brazo").size()

datos, informe = limpiar(cargar("ensayo.csv"))`,
    solution: SOL1,
    tests: py`
import numpy as np
import pandas as pd

def test_pregunta():
    "Pregunta PICO completa"
    p = t.get("PREGUNTA", dict)
    for k in ("poblacion", "intervencion", "comparador", "desenlace"):
        assert isinstance(p.get(k), str) and len(p[k]) > 5, f"Falta {k}"
    assert "ldl" in p["desenlace"].lower() and "placebo" in p["comparador"].lower()

def test_limpieza():
    "Duplicados, edades imposibles y etiquetas"
    crudo = pd.read_csv("ensayo.csv")
    limpio, inf = t.get("limpiar", "function")(crudo)
    assert inf["duplicados"] == int(crudo.duplicated().sum()) == 2
    assert inf["edades_invalidas"] == 2 and limpio["edad"].isna().sum() == 2
    assert inf["n"] == len(limpio) == len(crudo) - 2
    assert set(limpio["sexo"].unique()) == {"F", "M"}
    assert len(crudo) == 242, "limpiar no debe modificar el DataFrame original"

def test_flujo():
    "Flujo de pacientes por brazo"
    d = t.get("datos")
    f = t.get("flujo", "function")(d)
    for b in ("farmaco", "placebo"):
        s = d[d.brazo == b]
        assert f.loc[b, "aleatorizados"] == len(s)
        assert f.loc[b, "completaron"] == s.ldl_12s.notna().sum()
        assert f.loc[b, "abandonos"] == s.ldl_12s.isna().sum()
        assert approx(f.loc[b, "pct_abandono"], 100 * s.ldl_12s.isna().mean())
`,
    hints: [
      "`df.duplicated().sum()` cuenta los duplicados; `drop_duplicates()` los quita. Trabaja sobre una copia.",
      "Edades: `~limpio[\"edad\"].between(18, 90)` marca las inválidas; asígnales `np.nan` con `.loc`.",
      "Flujo: `groupby(\"brazo\")` y `.size()` para aleatorizados, `[\"ldl_12s\"].count()` para quienes tienen medida final (count ignora NaN).",
    ],
    errors: [
      { error: "Borrar a los pacientes con edad imposible", fix: "Su LDL es válido: marca solo la edad como faltante." },
      { error: "Decidir la pregunta después de ver qué sale significativo", fix: "Es una forma de p-hacking. La pregunta y el desenlace principal se fijan antes." },
      { error: "Contar abandonos con `size()` sobre la columna final", fix: "`size` cuenta filas con NaN; `count` solo las que tienen valor." },
    ],
    quiz: {
      question: "En este ensayo abandona el 11,7 % del brazo con fármaco y el 5,8 % del placebo, y los eventos adversos son más frecuentes con el fármaco. ¿Qué riesgo tiene analizar solo a quienes completaron?",
      options: [
        { text: "Que los que completaron no sean comparables entre brazos: si abandonan los que peor toleran el fármaco, se pierde la protección de la aleatorización" },
        { text: "Ninguno: la aleatorización garantiza la comparabilidad pase lo que pase después" },
        { text: "Solo pierde potencia; nunca introduce sesgo" },
        { text: "Que el valor p deja de poder calcularse" },
      ],
      answer: 0,
      explanation: "La aleatorización equilibra los grupos en el momento de asignar. Si después los abandonos dependen del tratamiento y del pronóstico, los completadores ya no son grupos aleatorios. Por eso se hacen análisis por intención de tratar y de sensibilidad (etapa 4).",
    },
    project: SPEC,
    review: "Repasa: PICO antes de los datos; documenta cada corrección; flujo de pacientes por brazo.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pe-ensayo-2",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El ensayo del colesterol · 2: tabla 1, balance y estimación del efecto",
    kind: "project",
    difficulty: 4,
    skills: ["estadistica-descriptiva", "intervalos-confianza", "estadistica-clinica", "visualizacion"],
    requires: ["pe-ensayo-1", "ec-welch"],
    series: { ...SERIES, stage: 2 },
    story: "Con los datos limpios, el comité quiere ver a los dos grupos lado a lado y la primera estimación: ¿cuánto más baja el LDL con el fármaco, y con qué precisión?",
    objective: "Construir la «tabla 1» del ensayo, valorar el balance basal con diferencias de medias estandarizadas y estimar la diferencia de cambios con su intervalo de confianza.",
    before: ["Etapa 1 del proyecto", "Prueba t de Welch (ec-welch)", "Boxplots"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "La **tabla 1** describe a los grupos al inicio. En un ensayo aleatorizado **no se hacen pruebas de hipótesis** sobre las variables basales: si la aleatorización fue correcta, cualquier diferencia es azar por definición. Se mira la **magnitud** con la diferencia de medias estandarizada (DME); valores por encima de ~0,1 merecen atención.",
      "",
      "El desenlace es el **cambio** de LDL (final − basal) en quienes completaron. La estimación principal es la diferencia de cambios medios (fármaco − placebo) con su **IC 95 %** de Welch: dice el tamaño del efecto y su precisión.",
      "",
      "Un **boxplot** por brazo muestra mediana, dispersión y atípicos de un vistazo, antes de cualquier número.",
    ],
    formal: "DME = (x̄_f − x̄_p) / √((s_f² + s_p²)/2) · IC = (x̄_f − x̄_p) ± t_{ν; 0,975}·√(s_f²/n_f + s_p²/n_p)",
    example: {
      code: py`import pandas as pd
df = pd.read_csv("ensayo.csv").drop_duplicates()
print(df.groupby("brazo")[["ldl_basal", "imc"]].mean().round(1))
cambio = df["ldl_12s"] - df["ldl_basal"]
print(cambio.groupby(df["brazo"]).mean().round(1))`,
      lines: [
        "pandas.",
        "Datos sin duplicados.",
        "Medias basales por brazo: deberían parecerse.",
        "Cambio de LDL (NaN para quien abandonó).",
        "Cambio medio por brazo: la primera pista del efecto.",
      ],
    },
    challenge: [
      "Tu código de la etapa 1 ya está en el editor. Añade:",
      "1. `tabla1(datos)`: DataFrame indexado por brazo con `n`, `edad_media`, `edad_de`, `pct_mujeres`, `imc_media` y `ldl_basal_media`.",
      "2. `dme(datos, variable)`: diferencia de medias estandarizada fármaco − placebo (ignorando NaN).",
      "3. `con_cambio(datos)`: copia con solo quienes completaron y la columna `cambio` = ldl_12s − ldl_basal.",
      "4. `estimar(datos)`: diccionario con `dif` (fármaco − placebo), `ee`, `ic` (IC 95 % de Welch), `n_farmaco`, `n_placebo`.",
      "5. `fig`: boxplot del cambio por brazo con título y etiqueta en el eje y.",
    ],
    starter: py`from scipy import stats
import matplotlib.pyplot as plt

def tabla1(datos):
    return datos.describe()

def dme(datos, variable):
    return 0.0

def con_cambio(datos):
    return datos

def estimar(datos):
    return {"dif": 0, "ee": 1, "ic": (0, 0), "n_farmaco": 0, "n_placebo": 0}

fig, ax = plt.subplots()`,
    solution: SOL2,
    tests: py`
import numpy as np
import pandas as pd
from scipy import stats

def _limpio():
    return t.get("datos")

def test_tabla1():
    "Descripción por brazo"
    d = _limpio()
    tb = t.get("tabla1", "function")(d)
    for b in ("farmaco", "placebo"):
        s = d[d.brazo == b]
        assert tb.loc[b, "n"] == len(s)
        assert approx(tb.loc[b, "edad_media"], s.edad.mean()) and approx(tb.loc[b, "edad_de"], s.edad.std())
        assert approx(tb.loc[b, "pct_mujeres"], 100 * (s.sexo == "F").mean())
        assert approx(tb.loc[b, "ldl_basal_media"], s.ldl_basal.mean()) and approx(tb.loc[b, "imc_media"], s.imc.mean())

def test_dme():
    "Diferencia de medias estandarizada"
    d = _limpio()
    a, b = d[d.brazo == "farmaco"].imc, d[d.brazo == "placebo"].imc
    assert approx(t.get("dme", "function")(d, "imc"), (a.mean() - b.mean()) / np.sqrt((a.var() + b.var()) / 2))
    e = d.dropna(subset=["edad"])
    a, b = e[e.brazo == "farmaco"].edad, e[e.brazo == "placebo"].edad
    assert approx(t.get("dme", "function")(d, "edad"), (a.mean() - b.mean()) / np.sqrt((a.var() + b.var()) / 2)), "Ignora las edades faltantes"

def test_cambio_y_estimacion():
    "IC de Welch igual que SciPy"
    d = _limpio()
    c = t.get("con_cambio", "function")(d)
    assert len(c) == d.ldl_12s.notna().sum() and approx(c.cambio.iloc[0], c.ldl_12s.iloc[0] - c.ldl_basal.iloc[0])
    e = t.get("estimar", "function")(d)
    a, b = c[c.brazo == "farmaco"].cambio, c[c.brazo == "placebo"].cambio
    ref = stats.ttest_ind(a, b, equal_var=False).confidence_interval()
    assert approx(e["dif"], a.mean() - b.mean()) and approx(e["ic"][0], ref.low, 1e-9) and approx(e["ic"][1], ref.high, 1e-9)
    assert e["n_farmaco"] == len(a) and e["n_placebo"] == len(b)
    assert e["ic"][1] < 0, "El fármaco reduce el LDL más que el placebo"

def test_etapa_anterior_intacta():
    "La etapa 1 sigue funcionando"
    assert t.get("informe")["duplicados"] == 2

def test_figura():
    "Boxplot por brazo"
    ax = t.get("fig").axes[0]
    assert ax.get_title() and ax.get_ylabel()
    assert len(ax.get_xticklabels()) == 2
`,
    hints: [
      "tabla1: `g = datos.groupby(\"brazo\")` y construye un DataFrame con `g.size()`, `g[\"edad\"].mean()`, etc. Para el % de mujeres: `g[\"sexo\"].apply(lambda s: (s == \"F\").mean())`.",
      "con_cambio: `dropna(subset=[\"ldl_12s\"])` y después la nueva columna.",
      "estimar: reutiliza las fórmulas de Welch de la misión ec-welch (varianza / n de cada grupo, grados de libertad de Welch-Satterthwaite).",
    ],
    errors: [
      { error: "Hacer pruebas t de las variables basales", fix: "En un ensayo aleatorizado, H₀ es cierta por diseño: un p < 0,05 sería un falso positivo. Usa la DME." },
      { error: "Comparar los LDL finales en vez de los cambios", fix: "El cambio (o un ajuste por el basal) elimina la variabilidad entre pacientes que ya existía al principio." },
    ],
    quiz: {
      question: "En este ensayo la DME de la edad entre brazos es 0,42 (el grupo del fármaco es unos 4 años mayor). ¿Qué haces?",
      options: [
        { text: "Describirlo como un desequilibrio basal por azar y comprobar si el efecto cambia al ajustar por la edad (análisis de sensibilidad)" },
        { text: "Hacer una prueba t de la edad y, si p < 0,05, invalidar el ensayo", misconception: "p-valor" },
        { text: "Eliminar pacientes hasta que la DME sea 0" },
        { text: "Nada: la aleatorización garantiza que el IMC es idéntico en ambos grupos" },
      ],
      answer: 0,
      explanation: "La aleatorización equilibra en promedio, no en cada ensayo: con 120 pacientes por brazo, diferencias así ocurren por azar. No invalidan el estudio; se describen y, si la variable es pronóstica, se valora ajustar (idealmente preespecificado). La extensión del proyecto propone ese ajuste.",
    },
    project: SPEC,
    review: "Repasa: tabla 1 sin p-valores; DME para el balance; efecto = diferencia de cambios con IC de Welch.",
    xp: 130,
    coins: 20,
  },
  {
    id: "pe-ensayo-3",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El ensayo del colesterol · 3: contraste, respondedores, tamaño del efecto y seguridad",
    kind: "project",
    difficulty: 4,
    skills: ["pruebas-hipotesis", "tamano-efecto", "riesgos", "estadistica-clinica"],
    requires: ["pe-ensayo-2", "cl-riesgos"],
    series: { ...SERIES, stage: 3 },
    story: "El comité pregunta lo que preguntaría un paciente: ¿cuántas personas tengo que tratar para que una más consiga una bajada importante? ¿Y a cambio de qué efectos adversos?",
    objective: "Contrastar el efecto principal, traducirlo a respondedores, riesgo relativo, diferencia de riesgos con IC y NNT, medir el tamaño del efecto y comparar la seguridad de los brazos.",
    before: ["Etapas 1 y 2", "Riesgos relativos y NNT (cl-riesgos)", "Prueba exacta de Fisher"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "Una diferencia media de −21,7 mg/dL es abstracta. Los clínicos la traducen a **respondedores**: pacientes que bajan al menos 30 mg/dL. Con dos proporciones se calculan:",
      "",
      "- **Riesgo relativo** (RR): cuántas veces más probable es responder con el fármaco.",
      "- **Diferencia de riesgos** (DR): cuántos puntos porcentuales más responden. Es la medida absoluta.",
      "- **NNT** = 1/DR: cuántos pacientes hay que tratar para conseguir un respondedor más.",
      "- **d de Cohen**: el efecto en desviaciones típicas.",
      "",
      "Todo beneficio se pesa contra el daño: los **eventos adversos** se comparan con todos los aleatorizados (no solo con quienes completaron).",
      "",
      "Dicotomizar una variable continua pierde información; aquí se hace como resultado secundario, porque es más interpretable.",
    ],
    formal: "RR = p_f/p_p · DR = p_f − p_p, IC ≈ DR ± 1,96·√(p_f(1 − p_f)/n_f + p_p(1 − p_p)/n_p) · NNT = 1/DR",
    example: {
      code: py`p_farmaco, p_placebo = 0.44, 0.11
print(round(p_farmaco / p_placebo, 2))
print(round(p_farmaco - p_placebo, 2))
print(round(1 / (p_farmaco - p_placebo), 1))`,
      lines: [
        "Proporciones de respondedores de ejemplo.",
        "RR = 4,0: responder es cuatro veces más probable…",
        "…pero la diferencia absoluta es de 33 puntos.",
        "NNT ≈ 3: tratar a tres pacientes para un respondedor más.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `contraste(datos)`: diccionario con `t` y `p` de Welch para el cambio (fármaco frente a placebo).",
      "2. `respondedores(datos, umbral=30)`: DataFrame por brazo con `n`, `k` (bajan al menos `umbral` mg/dL) y `proporcion`, entre quienes completaron.",
      "3. `riesgos(tabla)`: a partir de esa tabla, diccionario con `rr`, `dr`, `ic_dr` (Wald 95 %) y `nnt`.",
      "4. `d_cohen(datos)`: d de Cohen del cambio con desviación combinada.",
      "5. `seguridad(datos)`: tupla (tabla por brazo con `n`, `eventos`, `proporcion` de `evento_adverso` sobre **todos** los aleatorizados, p de Fisher).",
      "6. `tabla_resp = respondedores(datos)` y `p_fisher`: p de la prueba exacta de Fisher para respondedores.",
    ],
    starter: py`def contraste(datos):
    return {"t": 0, "p": 1}

def respondedores(datos, umbral=30):
    return None

def riesgos(tabla):
    return {"rr": 1, "dr": 0, "ic_dr": (0, 0), "nnt": float("inf")}

def d_cohen(datos):
    return 0

def seguridad(datos):
    return None, 1

tabla_resp = respondedores(datos)
p_fisher = 1`,
    solution: SOL3,
    tests: py`
import numpy as np
import pandas as pd
from scipy import stats

def _c():
    d = t.get("datos").dropna(subset=["ldl_12s"]).copy()
    d["cambio"] = d.ldl_12s - d.ldl_basal
    return d

def test_contraste():
    "Welch sobre el cambio"
    c = _c()
    r = stats.ttest_ind(c[c.brazo == "farmaco"].cambio, c[c.brazo == "placebo"].cambio, equal_var=False)
    out = t.get("contraste", "function")(t.get("datos"))
    assert approx(out["t"], r.statistic) and approx(out["p"], r.pvalue, 1e-9)

def test_respondedores_y_riesgos():
    "Respondedores, RR, DR, IC y NNT"
    c = _c()
    tb = t.get("tabla_resp")
    for b in ("farmaco", "placebo"):
        s = c[c.brazo == b]
        k = int(((s.ldl_basal - s.ldl_12s) >= 30).sum())
        assert tb.loc[b, "n"] == len(s) and tb.loc[b, "k"] == k and approx(tb.loc[b, "proporcion"], k / len(s))
    r = t.get("riesgos", "function")(tb)
    p1, n1, p2, n2 = tb.loc["farmaco", "proporcion"], tb.loc["farmaco", "n"], tb.loc["placebo", "proporcion"], tb.loc["placebo", "n"]
    ee = np.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
    assert approx(r["rr"], p1 / p2) and approx(r["dr"], p1 - p2) and approx(r["nnt"], 1 / (p1 - p2))
    assert approx(r["ic_dr"][0], p1 - p2 - 1.96 * ee) and approx(r["ic_dr"][1], p1 - p2 + 1.96 * ee)
    m = [[tb.loc[b, "k"], tb.loc[b, "n"] - tb.loc[b, "k"]] for b in ("farmaco", "placebo")]
    assert approx(t.get("p_fisher"), stats.fisher_exact(m).pvalue, 1e-9)

def test_umbral():
    "El umbral es un parámetro"
    tb = t.get("respondedores", "function")(t.get("datos"), umbral=10)
    assert tb.loc["farmaco", "k"] > t.get("tabla_resp").loc["farmaco", "k"]

def test_d():
    "Tamaño del efecto"
    c = _c()
    a, b = c[c.brazo == "farmaco"].cambio, c[c.brazo == "placebo"].cambio
    sp = np.sqrt(((len(a) - 1) * a.var() + (len(b) - 1) * b.var()) / (len(a) + len(b) - 2))
    assert approx(t.get("d_cohen", "function")(t.get("datos")), (a.mean() - b.mean()) / sp)

def test_seguridad():
    "Eventos adversos sobre todos los aleatorizados"
    d = t.get("datos")
    tb, p = t.get("seguridad", "function")(d)
    for b in ("farmaco", "placebo"):
        s = d[d.brazo == b]
        assert tb.loc[b, "n"] == len(s) and tb.loc[b, "eventos"] == s.evento_adverso.sum()
    m = [[tb.loc[b, "eventos"], tb.loc[b, "n"] - tb.loc[b, "eventos"]] for b in ("farmaco", "placebo")]
    assert approx(p, stats.fisher_exact(m).pvalue, 1e-9)
    assert tb.loc["farmaco", "proporcion"] > tb.loc["placebo", "proporcion"]

def test_etapas_anteriores():
    "Las etapas 1 y 2 siguen funcionando"
    assert t.get("estimar", "function")(t.get("datos"))["ic"][1] < 0
`,
    hints: [
      "respondedores: sobre `con_cambio(datos)`, crea `responde = (ldl_basal − ldl_12s) >= umbral` y agrupa por brazo: `size`, `sum` y `mean`.",
      "riesgos: lee las proporciones con `tabla.loc[\"farmaco\", \"proporcion\"]`; el IC de Wald usa 1,96 por el error estándar de la diferencia.",
      "Fisher: la tabla 2×2 es [[respondedores, no respondedores] del fármaco, [ídem] del placebo].",
    ],
    errors: [
      { error: "Calcular los eventos adversos solo en quienes completaron", fix: "Quien abandonó por un efecto adverso desaparecería del recuento: subestimarías el daño." },
      { error: "Informar solo del RR", fix: "Un RR de 4 puede ser pasar del 1 % al 4 %. La diferencia absoluta y el NNT dicen cuánto cambia para los pacientes." },
    ],
    quiz: {
      question: "En este ensayo el NNT para responder es ≈ 3 y el NNH para un evento adverso ≈ 7,5 (16,7 % frente a 3,3 %). ¿Cómo se interpreta?",
      options: [
        { text: "Por cada 30 pacientes tratados, unos 10 responden gracias al fármaco y unos 4 sufren un evento adverso atribuible: el balance depende de la gravedad de esos eventos" },
        { text: "El fármaco es inútil porque causa eventos adversos" },
        { text: "Como el NNT es menor que el NNH, el fármaco es seguro para todos" },
        { text: "El NNT es la probabilidad de que un paciente concreto responda" },
      ],
      answer: 0,
      explanation: "NNT y NNH ponen beneficio y daño en la misma escala (pacientes). La decisión exige valorar cuán importantes son la respuesta y los eventos adversos; no es una regla automática.",
    },
    project: SPEC,
    review: "Repasa: RR (relativo) frente a DR y NNT (absolutos); seguridad sobre todos los aleatorizados; d de Cohen.",
    xp: 130,
    coins: 20,
  },
  {
    id: "pe-ensayo-4",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El ensayo del colesterol · 4: modelo ajustado, supuestos, sensibilidad e informe",
    kind: "project",
    difficulty: 5,
    skills: ["regresion", "supuestos", "analisis-sensibilidad", "comunicacion", "estadistica-clinica"],
    requires: ["pe-ensayo-3", "ec-ols"],
    series: { ...SERIES, stage: 4 },
    story: "Última sesión del comité. Quieren saber si el resultado resiste: ajustando por el colesterol de partida, revisando los supuestos y suponiendo lo peor de quienes abandonaron. Y quieren un informe que diga exactamente lo que los datos permiten decir.",
    objective: "Estimar el efecto ajustado por el LDL basal (ANCOVA), revisar los supuestos, hacer un análisis de sensibilidad por los abandonos y redactar un informe con conclusión y limitaciones.",
    before: ["Etapas 1 a 3", "Regresión con statsmodels (ec-ols)", "Supuestos de los modelos lineales"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "**ANCOVA**: regresión del cambio sobre el brazo y el LDL basal. Ajustar por una variable pronóstica medida antes de aleatorizar **no introduce sesgo** y estrecha el intervalo. El coeficiente del brazo es el efecto ajustado.",
      "",
      "**Supuestos**: residuos aproximadamente normales (Shapiro-Wilk, mejor acompañado de un gráfico) y varianzas parecidas entre brazos (Levene). Un p > 0,05 en estas pruebas no demuestra que el supuesto se cumpla; solo que no hay evidencia fuerte en contra.",
      "",
      "**Sensibilidad**: el análisis principal excluye a quienes abandonaron. ¿Y si no mejoraron nada? Imputar cambio = 0 a todos los abandonos es una hipótesis pesimista. Si la conclusión se mantiene, es más creíble.",
      "",
      "**Informe**: cada cifra sale del código, la conclusión no va más allá de la evidencia y las limitaciones se dicen claramente.",
    ],
    formal: "cambio = β₀ + β₁·fármaco + β₂·LDL_basal + ε. β₁ es la diferencia de medias entre brazos a igual LDL basal.",
    example: {
      code: py`import pandas as pd
import statsmodels.formula.api as smf
df = pd.read_csv("ensayo.csv").drop_duplicates().dropna(subset=["ldl_12s"])
df["cambio"] = df["ldl_12s"] - df["ldl_basal"]
m = smf.ols("cambio ~ C(brazo, Treatment('placebo')) + ldl_basal", data=df).fit()
print(m.params.round(2))`,
      lines: [
        "pandas.",
        "Fórmulas de statsmodels.",
        "Completadores sin duplicados.",
        "Desenlace.",
        "C(…, Treatment('placebo')) toma el placebo como referencia.",
        "El coeficiente [T.farmaco] es el efecto ajustado por el LDL basal.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `ancova(datos)`: el modelo `cambio ~ C(brazo, Treatment('placebo')) + ldl_basal` ajustado con `smf.ols` sobre `con_cambio(datos)`.",
      "2. `efecto_ajustado(modelo)`: diccionario con `efecto`, `ic` (tupla) y `p` del término del fármaco.",
      "3. `supuestos(modelo, datos)`: diccionario con `shapiro_p` (residuos) y `levene_p` (cambio por brazo).",
      "4. `sensibilidad(datos)`: con **todos** los aleatorizados, cambio = ldl_12s − ldl_basal y 0 para los abandonos; diccionario con `dif` e `ic` de Welch.",
      "5. `modelo = ancova(datos)` e `informe_final`: diccionario con `pregunta` (tu PREGUNTA), `efecto_principal`, `ic95`, `p`, `efecto_ajustado`, `sensibilidad` (la dif), `nnt`, `eventos_adversos` (proporción por brazo), `conclusion` (texto) y `limitaciones` (al menos tres). Todas las cifras calculadas con tus funciones.",
    ],
    starter: py`import statsmodels.formula.api as smf

def ancova(datos):
    return None

def efecto_ajustado(modelo):
    return {"efecto": 0, "ic": (0, 0), "p": 1}

def supuestos(modelo, datos):
    return {}

def sensibilidad(datos):
    return {"dif": 0, "ic": (0, 0)}

modelo = ancova(datos)
informe_final = {}`,
    solution: SOL4,
    tests: py`
import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.formula.api as smf

NOMBRE = "C(brazo, Treatment('placebo'))[T.farmaco]"

def _c():
    d = t.get("datos").dropna(subset=["ldl_12s"]).copy()
    d["cambio"] = d.ldl_12s - d.ldl_basal
    return d

def test_ancova():
    "Efecto ajustado por el LDL basal"
    ref = smf.ols("cambio ~ C(brazo, Treatment('placebo')) + ldl_basal", data=_c()).fit()
    e = t.get("efecto_ajustado", "function")(t.get("modelo"))
    assert approx(e["efecto"], ref.params[NOMBRE]) and approx(e["p"], ref.pvalues[NOMBRE], 1e-9)
    assert approx(e["ic"][0], ref.conf_int().loc[NOMBRE, 0]) and approx(e["ic"][1], ref.conf_int().loc[NOMBRE, 1])

def test_supuestos():
    "Shapiro y Levene"
    s = t.get("supuestos", "function")(t.get("modelo"), t.get("datos"))
    c = _c()
    assert approx(s["shapiro_p"], stats.shapiro(t.get("modelo").resid).pvalue, 1e-9)
    assert approx(s["levene_p"], stats.levene(c[c.brazo == "farmaco"].cambio, c[c.brazo == "placebo"].cambio).pvalue, 1e-9)

def test_sensibilidad():
    "Abandonos con cambio 0: todos los aleatorizados"
    d = t.get("datos").copy()
    d["cambio"] = (d.ldl_12s - d.ldl_basal).fillna(0)
    a, b = d[d.brazo == "farmaco"].cambio, d[d.brazo == "placebo"].cambio
    s = t.get("sensibilidad", "function")(t.get("datos"))
    ic = stats.ttest_ind(a, b, equal_var=False).confidence_interval()
    assert approx(s["dif"], a.mean() - b.mean()) and approx(s["ic"][0], ic.low, 1e-9) and approx(s["ic"][1], ic.high, 1e-9)
    assert s["ic"][1] < 0, "La conclusión resiste el escenario pesimista"

def test_informe():
    "Cifras calculadas, conclusión y limitaciones"
    inf = t.get("informe_final", dict)
    est = t.get("estimar", "function")(t.get("datos"))
    assert inf["pregunta"] == t.get("PREGUNTA")
    assert approx(inf["efecto_principal"], est["dif"]) and approx(inf["ic95"][0], est["ic"][0])
    assert approx(inf["p"], t.get("contraste", "function")(t.get("datos"))["p"], 1e-9)
    assert approx(inf["efecto_ajustado"], t.get("efecto_ajustado", "function")(t.get("modelo"))["efecto"])
    assert approx(inf["sensibilidad"], t.get("sensibilidad", "function")(t.get("datos"))["dif"])
    assert approx(inf["nnt"], t.get("riesgos", "function")(t.get("respondedores", "function")(t.get("datos")))["nnt"])
    assert set(inf["eventos_adversos"]) == {"farmaco", "placebo"}
    assert isinstance(inf["conclusion"], str) and len(inf["conclusion"]) > 60
    assert len(inf["limitaciones"]) >= 3 and all(isinstance(x, str) and len(x) > 15 for x in inf["limitaciones"])
`,
    hints: [
      "ancova: `smf.ols(\"cambio ~ C(brazo, Treatment('placebo')) + ldl_basal\", data=con_cambio(datos)).fit()`. El término del fármaco se llama `C(brazo, Treatment('placebo'))[T.farmaco]`.",
      "IC del término: `modelo.conf_int().loc[nombre]` devuelve sus dos extremos.",
      "sensibilidad: `(datos.ldl_12s - datos.ldl_basal).fillna(0)` sobre una copia de **todos** los datos, y Welch con `confidence_interval()`.",
    ],
    errors: [
      { error: "Ajustar por variables medidas después de aleatorizar", fix: "Una variable afectada por el tratamiento (por ejemplo, el peso a las 12 semanas) puede absorber parte del efecto. Ajusta solo por variables basales." },
      { error: "Concluir «el fármaco es seguro y eficaz para todos»", fix: "La evidencia es de un ensayo, sintético, de 12 semanas y con abandonos: la conclusión debe decir eso." },
      { error: "Copiar cifras a mano en el informe", fix: "Si cambian los datos o la limpieza, el informe queda desactualizado. Calcula cada cifra desde las funciones." },
    ],
    quiz: {
      question: "El efecto ajustado es −22,0 mg/dL (IC 95 % −27,8 a −16,3) y el análisis pesimista da −18,9. ¿Qué conclusión es la más adecuada?",
      options: [
        { text: "El fármaco reduce el LDL frente a placebo en este ensayo; la magnitud se mantiene en un escenario pesimista para los abandonos, con más eventos adversos que valorar" },
        { text: "El fármaco reducirá el LDL en 22 mg/dL a cada paciente que lo tome", misconception: "ic-interpretacion" },
        { text: "Como hay abandonos, el ensayo no permite ninguna conclusión" },
        { text: "Hay un 95 % de probabilidad de que el efecto verdadero esté entre −27,8 y −16,3", misconception: "ic-vs-creible" },
      ],
      answer: 0,
      explanation: "El efecto es un promedio de grupo, no una predicción individual. El IC frecuentista describe la fiabilidad del procedimiento, no una probabilidad sobre el parámetro. Los abandonos se abordan con análisis de sensibilidad, no invalidan automáticamente el ensayo.",
    },
    project: SPEC,
    review: "Repasa: ANCOVA con variables basales; los supuestos se revisan, no se demuestran; sensibilidad para los abandonos; informe con limitaciones.",
    xp: 160,
    coins: 25,
  },
];
