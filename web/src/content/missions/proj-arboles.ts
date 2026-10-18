import { arbolesCsv } from "../datasets";
import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 4: un estudio completo de correlación y regresión sobre un
// inventario forestal sintético (altura frente a diámetro, ley de potencias distinta por especie).
// Limpieza, correlación con intervalos, regresión simple con diagnóstico, transformación log-log,
// puntos influyentes, confusión por especie, interacción, validación cruzada y predicción en metros.

const SERIES = { id: "estudio-regresion", title: "Proyecto progresivo: el estudio de los árboles", of: 4 };

const FILES = { "arboles.csv": arbolesCsv() };

const SPEC: ProjectSpec = {
  requirements: [
    "Revisar los datos antes de correlacionar: un solo valor mal registrado puede anular una correlación.",
    "Acompañar cada correlación de su intervalo (Fisher y bootstrap) y comparar Pearson, Spearman y la escala logarítmica.",
    "Programar la regresión simple, sus errores estándar, el apalancamiento y la distancia de Cook, y verificarlos contra statsmodels.",
    "Detectar heterocedasticidad y no linealidad, y justificar la transformación log-log (una ley de potencias).",
    "Incluir la especie, contrastar la interacción, elegir el modelo por validación cruzada y predecir en metros con intervalos que se comprueban en datos reservados.",
  ],
  dataset: "arboles.csv: inventario sintético de 302 árboles (pino, roble y haya) con parcela, diámetro a la altura del pecho (cm), altura (m) y edad estimada. Incluye una altura anotada en centímetros, un diámetro sin registrar, un árbol gigante y uno con la copa rota.",
  stages: ["Limpieza y correlación con intervalos", "Regresión simple, diagnóstico y escala log-log", "Especie: confusión, interacción y validación cruzada", "Predicción en metros, figura e informe"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Los cálculos propios coinciden con SciPy y statsmodels.",
    "Cada decisión (corregir, transformar, añadir términos) se apoya en un diagnóstico o en validación cruzada.",
    "Los intervalos de predicción se evalúan en árboles que el modelo no vio.",
  ],
  extensions: [
    "Ajustar el modelo sin el árbol de copa rota y documentar cómo cambian el exponente y los intervalos.",
    "Usar errores estándar robustos (HC3) y compararlos con los clásicos.",
    "Comparar con un modelo no lineal ajustado con scipy.optimize.curve_fit en la escala original.",
  ],
  portfolio: "Estudio de correlación y regresión sobre un inventario forestal: limpieza guiada por el diagnóstico, correlaciones con intervalos de Fisher y bootstrap, regresión simple programada a mano con apalancamiento y Cook, ley de potencias en escala log-log, confusión por especie e interacción, selección por validación cruzada y predicciones en metros con corrección de Duan e intervalos comprobados en datos reservados.",
};

const S1 = py`import numpy as np
import pandas as pd
from scipy import stats

crudo = pd.read_csv("arboles.csv")


def limpiar(df, altura_maxima=60):
    """Alturas imposibles (> altura_maxima m) se interpretan como centímetros; sin diámetro, fuera."""
    df = df.copy()
    en_cm = df["altura_m"] > altura_maxima
    df.loc[en_cm, "altura_m"] = df.loc[en_cm, "altura_m"] / 100
    registro = {"alturas_en_cm": df.loc[en_cm, "arbol"].tolist(), "sin_diametro": df.loc[df["diametro_cm"].isna(), "arbol"].tolist()}
    df = df.dropna(subset=["diametro_cm"]).reset_index(drop=True)
    df["log_d"] = np.log(df["diametro_cm"])
    df["log_h"] = np.log(df["altura_m"])
    return df, registro


def ic_pearson(x, y, conf=0.95):
    """Intervalo de r por la transformación z de Fisher."""
    r = np.corrcoef(x, y)[0, 1]
    z, ee = np.arctanh(r), 1 / np.sqrt(len(x) - 3)
    q = stats.norm.ppf(1 - (1 - conf) / 2)
    return float(r), (float(np.tanh(z - q * ee)), float(np.tanh(z + q * ee)))


def ic_bootstrap_r(x, y, B=2000, semilla=0, conf=0.95):
    x, y = np.asarray(x), np.asarray(y)
    idx = np.random.default_rng(semilla).integers(0, len(x), size=(B, len(x)))
    xs, ys = x[idx], y[idx]
    xc, yc = xs - xs.mean(axis=1, keepdims=True), ys - ys.mean(axis=1, keepdims=True)
    rs = (xc * yc).sum(axis=1) / np.sqrt((xc**2).sum(axis=1) * (yc**2).sum(axis=1))
    a = (1 - conf) / 2
    return float(np.quantile(rs, a)), float(np.quantile(rs, 1 - a))


arboles, registro_limpieza = limpiar(crudo)
correlaciones = {
    "pearson_crudo_sin_limpiar": crudo.dropna()[["diametro_cm", "altura_m"]].corr().iloc[0, 1],
    "pearson": arboles[["diametro_cm", "altura_m"]].corr().iloc[0, 1],
    "spearman": arboles[["diametro_cm", "altura_m"]].corr(method="spearman").iloc[0, 1],
    "pearson_log": arboles[["log_d", "log_h"]].corr().iloc[0, 1],
}
r_log, ic_fisher = ic_pearson(arboles["log_d"], arboles["log_h"])
ic_boot = ic_bootstrap_r(arboles["log_d"], arboles["log_h"])
print({k: round(v, 3) for k, v in correlaciones.items()}, np.round(ic_fisher, 3), np.round(ic_boot, 3))`;

const S2 = py`import statsmodels.formula.api as smf
from statsmodels.stats.diagnostic import het_breuschpagan


def ols(x, y):
    """Mínimos cuadrados a mano: pendiente, ordenada, errores estándar, R² y residuos."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    n = len(x)
    sxx = ((x - x.mean()) ** 2).sum()
    b = ((x - x.mean()) * (y - y.mean())).sum() / sxx
    a = y.mean() - b * x.mean()
    res = y - (a + b * x)
    s2 = (res**2).sum() / (n - 2)
    return {"a": a, "b": b, "ee_b": np.sqrt(s2 / sxx), "ee_a": np.sqrt(s2 * (1 / n + x.mean() ** 2 / sxx)),
            "r2": 1 - (res**2).sum() / ((y - y.mean()) ** 2).sum(), "residuos": res, "sigma": np.sqrt(s2)}


def influencia(x):
    """Apalancamiento h_ii de una regresión simple."""
    x = np.asarray(x, float)
    return 1 / len(x) + (x - x.mean()) ** 2 / ((x - x.mean()) ** 2).sum()


def distancia_cook(ajuste, h):
    e = ajuste["residuos"]
    return e**2 / (2 * ajuste["sigma"] ** 2) * h / (1 - h) ** 2


lineal = ols(arboles["diametro_cm"], arboles["altura_m"])
loglog = ols(arboles["log_d"], arboles["log_h"])
modelo_lineal = smf.ols("altura_m ~ diametro_cm", data=arboles).fit()
modelo_loglog = smf.ols("log_h ~ log_d", data=arboles).fit()
bp = {
    "lineal": het_breuschpagan(modelo_lineal.resid, modelo_lineal.model.exog)[1],
    "loglog": het_breuschpagan(modelo_loglog.resid, modelo_loglog.model.exog)[1],
}
h = influencia(arboles["log_d"])
cook = distancia_cook(loglog, h)
mas_influyente = int(arboles.loc[np.argmax(cook), "arbol"])
mas_apalancado = int(arboles.loc[np.argmax(h), "arbol"])
sin_influyente = ols(arboles.loc[cook < cook.max(), "log_d"], arboles.loc[cook < cook.max(), "log_h"])
exponente = {"con_todos": loglog["b"], "sin_influyente": sin_influyente["b"],
             "ic95": (loglog["b"] - stats.t.ppf(0.975, len(arboles) - 2) * loglog["ee_b"], loglog["b"] + stats.t.ppf(0.975, len(arboles) - 2) * loglog["ee_b"])}`;

const S3 = py`from statsmodels.stats.anova import anova_lm
from statsmodels.stats.outliers_influence import variance_inflation_factor

FORMULAS = {
    "simple": "log_h ~ log_d",
    "especie": "log_h ~ log_d + C(especie)",
    "interaccion": "log_h ~ log_d * C(especie)",
    "con_edad": "log_h ~ log_d * C(especie) + edad",
}


def pendientes_por_especie(df):
    return {e: ols(g["log_d"], g["log_h"])["b"] for e, g in df.groupby("especie")}


def rmse_cv(formula, df, k=5, semilla=0):
    """RMSE (en escala logarítmica) por validación cruzada con k bloques barajados.

    La matriz de diseño se construye una vez con la fórmula; cada bloque se ajusta con lstsq."""
    modelo = smf.ols(formula, data=df)
    X, y = modelo.exog, modelo.endog
    pliegue = np.random.default_rng(semilla).permutation(len(df)) % k
    cuadrados = np.empty(len(df))
    for f in range(k):
        dentro = pliegue != f
        beta = np.linalg.lstsq(X[dentro], y[dentro], rcond=None)[0]
        cuadrados[~dentro] = (y[~dentro] - X[~dentro] @ beta) ** 2
    return float(np.sqrt(cuadrados.mean()))


def vif(df, columnas):
    X = np.column_stack([np.ones(len(df))] + [df[c] for c in columnas])
    return {c: variance_inflation_factor(X, i + 1) for i, c in enumerate(columnas)}


ajustes = {nombre: smf.ols(f, data=arboles).fit() for nombre, f in FORMULAS.items()}
pendientes = pendientes_por_especie(arboles)
comparacion_anova = anova_lm(ajustes["simple"], ajustes["especie"], ajustes["interaccion"])
cv = {nombre: rmse_cv(f, arboles) for nombre, f in FORMULAS.items()}
mejor_modelo = min(cv, key=cv.get)
inflacion = vif(arboles, ["log_d", "edad"])
r2_ajustado = {nombre: m.rsquared_adj for nombre, m in ajustes.items()}`;

const S4 = py`import matplotlib.pyplot as plt


def particion(df, fraccion=0.25, semilla=1):
    prueba = np.random.default_rng(semilla).random(len(df)) < fraccion
    return df[~prueba].reset_index(drop=True), df[prueba].reset_index(drop=True)


def predecir_altura(modelo, nuevos, conf=0.95):
    """Predicción en metros: mediana exp(ŷ), media con el factor de Duan e intervalo de predicción."""
    p = modelo.get_prediction(nuevos).summary_frame(alpha=1 - conf)
    duan = np.mean(np.exp(modelo.resid))
    return pd.DataFrame({
        "mediana": np.exp(p["mean"]),
        "media": np.exp(p["mean"]) * duan,
        "bajo": np.exp(p["obs_ci_lower"]),
        "alto": np.exp(p["obs_ci_upper"]),
    })


def figura_estudio(df, modelo):
    fig, (izq, der) = plt.subplots(1, 2, figsize=(11, 4.2))
    malla = np.linspace(df["log_d"].min(), df["log_d"].max(), 50)
    for especie, g in df.groupby("especie"):
        izq.scatter(g["diametro_cm"], g["altura_m"], s=12, label=especie)
        linea = modelo.predict(pd.DataFrame({"log_d": malla, "especie": especie}))
        izq.plot(np.exp(malla), np.exp(linea))
    izq.set_xscale("log")
    izq.set_yscale("log")
    izq.set_xlabel("Diámetro (cm, escala log)")
    izq.set_ylabel("Altura (m, escala log)")
    izq.set_title("Altura frente a diámetro por especie")
    izq.legend()
    der.scatter(modelo.fittedvalues, modelo.resid, s=10)
    der.axhline(0, color="gray", linewidth=1)
    der.set_xlabel("Valor ajustado (log altura)")
    der.set_ylabel("Residuo")
    der.set_title("Residuos del modelo elegido")
    fig.tight_layout()
    return fig


entreno, reserva = particion(arboles)
modelo_final = smf.ols(FORMULAS[mejor_modelo], data=entreno).fit()
pred = predecir_altura(modelo_final, reserva)
cobertura = float(((reserva["altura_m"] >= pred["bajo"]) & (reserva["altura_m"] <= pred["alto"])).mean())
ingenua = float(np.mean(reserva["altura_m"] - pred["mediana"]))
corregida = float(np.mean(reserva["altura_m"] - pred["media"]))
ejemplo = predecir_altura(modelo_final, pd.DataFrame({"log_d": [np.log(30.0)] * 3, "especie": ["pino", "roble", "haya"]}))
figura = figura_estudio(arboles, ajustes[mejor_modelo])
informe = "\n".join([
    f"Datos: {len(arboles)} árboles tras corregir {len(registro_limpieza['alturas_en_cm'])} altura en centímetros y quitar {len(registro_limpieza['sin_diametro'])} sin diámetro.",
    f"Correlación en escala log: r = {r_log:.3f} (IC 95 % {ic_fisher[0]:.3f}-{ic_fisher[1]:.3f}).",
    f"Exponente conjunto {exponente['con_todos']:.3f}; por especie: " + ", ".join(f"{e} {b:.2f}" for e, b in pendientes.items()) + ".",
    f"Modelo elegido por validación cruzada: {mejor_modelo} (RMSE log {cv[mejor_modelo]:.4f} frente a {cv['simple']:.4f} del simple).",
    f"Intervalos de predicción al 95 % en árboles reservados: cubren el {cobertura:.0%}.",
    f"Un árbol de 30 cm mide en mediana: " + ", ".join(f"{e} {m:.1f} m" for e, m in zip(["pino", "roble", "haya"], ejemplo["mediana"])) + ".",
])
print(informe)`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

export const PROJ_ARBOLES: Mission[] = [
  {
    id: "pf-arboles-1",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El estudio de los árboles · 1: limpieza y correlación con intervalos",
    kind: "project",
    difficulty: 3,
    skills: ["correlacion", "limpieza", "intervalos-confianza", "bootstrap"],
    requires: ["r-correlacion"],
    series: { ...SERIES, stage: 1 },
    packages: ["numpy", "pandas", "scipy"],
    files: FILES,
    story: "Los guardas forestales del Imperio han medido 302 árboles. Quieren saber cómo crece la altura con el grosor del tronco para estimar la madera sin trepar. El primer cálculo da una correlación de 0,005: «¿no tienen nada que ver?». Mira los datos antes de creértelo.",
    objective: "Encontrar y corregir los errores de registro, calcular Pearson y Spearman en las escalas original y logarítmica y dar un intervalo de confianza para la correlación con la transformación de Fisher y con bootstrap.",
    before: ["Correlación de Pearson y Spearman", "Intervalos de confianza", "Bootstrap"],
    intuition: [
      "Una altura de 910 m es imposible: alguien la anotó en **centímetros**. Ese único valor, mil veces más grande que los demás, domina las sumas de Pearson y hunde la correlación hasta casi 0. Spearman, que usa rangos, se resiente mucho menos.",
      "",
      "Corregir no es borrar: si la explicación es clara (cm en lugar de m), se corrige y se **anota en un registro**. Si falta el dato (un diámetro sin medir), esa fila no sirve para esta pregunta.",
      "",
      "El crecimiento sigue una **ley de potencias** (altura ∝ diámetro^b): en escala logarítmica se vuelve una recta, y la correlación de log-altura con log-diámetro es mayor.",
      "",
      "Un r sin intervalo dice poco. **Fisher:** z = atanh(r) es casi normal con error estándar 1/√(n − 3); el intervalo de z se devuelve a r con tanh. El **bootstrap** remuestrea pares (x, y) y no necesita esa aproximación.",
    ],
    formal: "z = atanh(r), EE(z) = 1/√(n − 3) · IC(r) = tanh(z ± z₁₋α/₂ · EE) · log h = log a + b·log d",
    example: {
      code: py`import numpy as np
x = np.arange(1.0, 11.0)
y = 2 * x + np.array([0.3, -0.2, 0.1, 0.4, -0.3, 0.2, -0.1, 0.0, 0.2, -0.4])
print(round(np.corrcoef(x, y)[0, 1], 4))
y[3] = 800
print(round(np.corrcoef(x, y)[0, 1], 4))`,
      lines: [
        "NumPy.",
        "Diez valores de x.",
        "Una relación casi perfecta.",
        "r ≈ 0,9991.",
        "Un solo error de registro…",
        "…y r cae a ≈ −0,15: Pearson es muy sensible a los valores extremos.",
      ],
    },
    challenge: [
      "1. `crudo`: el CSV tal cual. `limpiar(df, altura_maxima=60)`: sin modificar `df`, divide entre 100 las alturas mayores que `altura_maxima` (centímetros), quita las filas sin diámetro, añade `log_d` y `log_h` (logaritmo natural) y devuelve `(df_limpio, registro)` con las listas de árboles `alturas_en_cm` y `sin_diametro`.",
      "2. `ic_pearson(x, y, conf=0.95)`: `(r, (bajo, alto))` por Fisher.",
      "3. `ic_bootstrap_r(x, y, B=2000, semilla=0, conf=0.95)`: índices `default_rng(semilla).integers(0, n, size=(B, n))`, r de cada remuestra (vectorizado) y percentiles.",
      "4. `arboles, registro_limpieza`; `correlaciones` con `pearson_crudo_sin_limpiar` (en `crudo` sin las filas con faltantes), `pearson`, `spearman` y `pearson_log`; `r_log, ic_fisher` e `ic_boot` para log_d y log_h.",
    ],
    starter: py`import numpy as np
import pandas as pd
from scipy import stats

crudo = pd.read_csv("arboles.csv")


def limpiar(df, altura_maxima=60):
    return df, {"alturas_en_cm": [], "sin_diametro": []}


def ic_pearson(x, y, conf=0.95):
    return 0.0, (0.0, 0.0)


def ic_bootstrap_r(x, y, B=2000, semilla=0, conf=0.95):
    return 0.0, 0.0


arboles, registro_limpieza = limpiar(crudo)
correlaciones = {}
r_log, ic_fisher = 0.0, (0.0, 0.0)
ic_boot = (0.0, 0.0)`,
    solution: SOL1,
    tests: py`
import numpy as np
import pandas as pd
from scipy import stats

def test_limpieza():
    "Corregir, registrar y no tocar el original"
    a, reg, c = t.get("arboles", pd.DataFrame), t.get("registro_limpieza", dict), t.get("crudo", pd.DataFrame)
    assert reg == {"alturas_en_cm": [42], "sin_diametro": [151]}
    assert len(a) == 301 and a["altura_m"].max() < 60 and not a["diametro_cm"].isna().any()
    assert abs(a.loc[a["arbol"] == 42, "altura_m"].iloc[0] - c.loc[c["arbol"] == 42, "altura_m"].iloc[0] / 100) < 1e-12
    assert c["altura_m"].max() > 60, "limpiar no debe modificar el DataFrame original"
    assert np.allclose(a["log_d"], np.log(a["diametro_cm"])) and np.allclose(a["log_h"], np.log(a["altura_m"]))

def test_correlaciones():
    "Un error de registro anula Pearson; la escala log la mejora"
    c = t.get("correlaciones", dict)
    assert abs(c["pearson_crudo_sin_limpiar"]) < 0.1 and c["pearson"] > 0.8
    assert c["pearson_log"] > c["pearson"] and c["spearman"] > c["pearson"]

def test_fisher():
    "Intervalo de Fisher igual al de SciPy"
    a = t.get("arboles", pd.DataFrame)
    r, (lo, hi) = t.get("ic_pearson", "function")(a["log_d"], a["log_h"])
    ref = stats.pearsonr(a["log_d"], a["log_h"])
    ci = ref.confidence_interval()
    assert abs(r - ref.statistic) < 1e-12 and abs(lo - ci.low) < 1e-12 and abs(hi - ci.high) < 1e-12
    r90 = t.get("ic_pearson")(a["log_d"], a["log_h"], conf=0.9)[1]
    assert r90[0] > lo and r90[1] < hi

def test_bootstrap():
    "Bootstrap reproducible y parecido a Fisher"
    a = t.get("arboles", pd.DataFrame)
    x, y = a["log_d"].to_numpy(), a["log_h"].to_numpy()
    idx = np.random.default_rng(4).integers(0, len(x), size=(500, len(x)))
    rs = [np.corrcoef(x[i], y[i])[0, 1] for i in idx]
    lo, hi = t.get("ic_bootstrap_r", "function")(x, y, B=500, semilla=4)
    assert abs(lo - np.quantile(rs, 0.025)) < 1e-12 and abs(hi - np.quantile(rs, 0.975)) < 1e-12
    fb, ff = t.get("ic_boot"), t.get("ic_fisher")
    assert abs(fb[0] - ff[0]) < 0.03 and abs(fb[1] - ff[1]) < 0.03
`,
    hints: [
      "limpiar: `df = df.copy()`; `en_cm = df[\"altura_m\"] > altura_maxima`; anota `df.loc[en_cm, \"arbol\"].tolist()` antes de corregir y quitar filas.",
      "ic_pearson: `z, ee = np.arctanh(r), 1 / np.sqrt(n - 3)` y `q = stats.norm.ppf(1 - (1 - conf) / 2)`; vuelve con `np.tanh`.",
      "ic_bootstrap_r: con `xs, ys = x[idx], y[idx]` (matrices B × n), centra por filas y calcula r como suma de productos entre la raíz del producto de sumas de cuadrados.",
    ],
    errors: [
      { error: "Concluir que no hay relación porque r ≈ 0", fix: "Mira los datos: un error de registro puede anular la correlación. Haz un diagrama de dispersión antes de interpretar r." },
      { error: "Borrar el valor raro sin más", fix: "Si la causa es evidente (unidades), corrígelo y anótalo; si no lo es, decide y documenta qué haces con él." },
      { error: "Calcular el intervalo de r como r ± 1,96·EE", fix: "La distribución de r es asimétrica cerca de ±1: usa la transformación de Fisher o el bootstrap." },
    ],
    quiz: {
      question: "Tras limpiar, r = 0,87 en escala log (IC 95 % 0,84-0,89). ¿Qué afirmación es correcta?",
      options: [
        { text: "La asociación lineal entre los logaritmos es fuerte y el intervalo indica que se ha estimado con bastante precisión" },
        { text: "El diámetro causa el 87 % de la altura", misconception: "correlacion-causalidad" },
        { text: "Hay un 95 % de probabilidad de que la r verdadera esté entre 0,84 y 0,89", misconception: "ic-interpretacion" },
        { text: "Como r < 1, la relación no es lineal" },
      ],
      answer: 0,
      explanation: "r mide asociación, no causa ni porcentaje de causa. El IC es una afirmación sobre el método; r² ≈ 0,76 sería la proporción de varianza que comparten los logaritmos.",
    },
    lab: { lab: "estadistica", tab: "regresion", label: "Regresión y correlación" },
    project: SPEC,
    review: "Repasa: mirar antes de correlacionar; corregir y registrar; Pearson frente a Spearman; ley de potencias en log; IC de Fisher y bootstrap.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pf-arboles-2",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El estudio de los árboles · 2: regresión simple, diagnóstico y escala log-log",
    kind: "project",
    difficulty: 4,
    skills: ["regresion", "diagnostico-residuos", "supuestos", "statsmodels"],
    requires: ["pf-arboles-1", "r-lineal"],
    series: { ...SERIES, stage: 2 },
    packages: ["numpy", "pandas", "scipy", "statsmodels"],
    files: FILES,
    story: "Los guardas ajustan una recta: altura = 6,7 + 0,24·diámetro. Pero los residuos forman un abanico y la recta se pasa con los árboles pequeños. Además, dos árboles llaman la atención: un roble gigante y un haya con la copa rota. ¿Cuál de los dos manda en el ajuste?",
    objective: "Programar la regresión simple con sus errores estándar y R², compararla con la regresión en escala log-log, contrastar la heterocedasticidad con Breusch-Pagan y localizar el punto más influyente con el apalancamiento y la distancia de Cook.",
    before: ["Etapa 1", "Regresión lineal", "Supuestos y residuos"],
    intuition: [
      "La recta en escala original falla de dos formas: los residuos se **abren** al crecer el diámetro (heterocedasticidad) y se **curvan** (no linealidad). Breusch-Pagan cuantifica lo primero.",
      "",
      "En escala log-log, el modelo log h = a + b·log d es una ley de potencias: **b es el exponente alométrico** (si el diámetro se duplica, la altura se multiplica por 2^b).",
      "",
      "No todos los puntos pesan igual. El **apalancamiento** h_ii mide lo lejos que está x del centro: el roble gigante tiene el mayor. La **distancia de Cook** combina apalancamiento y residuo: mide cuánto cambiaría el ajuste sin ese punto. Un punto extremo que **sigue la ley** no influye; uno que se aparta de ella sí.",
      "",
      "Programar las fórmulas y compararlas con statsmodels comprueba que entiendes qué hace la biblioteca.",
    ],
    formal: "b = Sxy/Sxx · EE(b) = s/√Sxx · h_ii = 1/n + (x_i − x̄)²/Sxx · D_i = e_i²/(p·s²) · h_ii/(1 − h_ii)², p = 2",
    example: {
      code: py`import numpy as np
x = np.array([1.0, 2.0, 3.0, 4.0, 20.0])
h = 1 / len(x) + (x - x.mean()) ** 2 / ((x - x.mean()) ** 2).sum()
print(h.round(3), round(h.sum(), 6))`,
      lines: [
        "NumPy.",
        "Cuatro valores juntos y uno muy alejado.",
        "Apalancamiento de cada punto en una regresión simple.",
        "El punto en x = 20 tiene casi todo el apalancamiento (0,98); la suma siempre es 2, el número de parámetros.",
      ],
    },
    challenge: [
      "1. `ols(x, y)`: diccionario con `a`, `b`, `ee_a`, `ee_b`, `r2`, `residuos` y `sigma` (s con n − 2).",
      "2. `influencia(x)` (apalancamiento) y `distancia_cook(ajuste, h)`.",
      "3. `lineal` (altura ~ diámetro) y `loglog` (log_h ~ log_d) con tu `ols`; `modelo_lineal` y `modelo_loglog` con `smf.ols`; `bp`: p-valor de Breusch-Pagan de cada uno (`het_breuschpagan(resid, exog)`).",
      "4. `h`, `cook` (del modelo log-log), `mas_influyente` y `mas_apalancado` (ids de árbol), `sin_influyente` (ajuste log-log sin el punto de mayor Cook) y `exponente` con `con_todos`, `sin_influyente` e `ic95` (con t de n − 2 grados de libertad).",
    ],
    starter: py`import statsmodels.formula.api as smf
from statsmodels.stats.diagnostic import het_breuschpagan


def ols(x, y):
    return {"a": 0.0, "b": 0.0, "ee_a": 0.0, "ee_b": 0.0, "r2": 0.0, "residuos": np.zeros(len(x)), "sigma": 0.0}


def influencia(x):
    return np.zeros(len(x))


def distancia_cook(ajuste, h):
    return np.zeros(len(h))


lineal = ols(arboles["diametro_cm"], arboles["altura_m"])
loglog = ols(arboles["log_d"], arboles["log_h"])
modelo_lineal = smf.ols("altura_m ~ diametro_cm", data=arboles).fit()
modelo_loglog = smf.ols("log_h ~ log_d", data=arboles).fit()
bp = {}
h = influencia(arboles["log_d"])
cook = distancia_cook(loglog, h)
mas_influyente = None
mas_apalancado = None
sin_influyente = None
exponente = {}`,
    solution: SOL2,
    tests: py`
import numpy as np
import pandas as pd

def test_ols_contra_statsmodels():
    "Coeficientes, errores estándar y R²"
    for nombre, modelo in (("lineal", "modelo_lineal"), ("loglog", "modelo_loglog")):
        mio, ref = t.get(nombre, dict), t.get(modelo)
        assert np.allclose([mio["a"], mio["b"]], ref.params.values) and np.allclose([mio["ee_a"], mio["ee_b"]], ref.bse.values)
        assert abs(mio["r2"] - ref.rsquared) < 1e-12 and np.allclose(mio["residuos"], ref.resid.values)
    assert t.get("loglog")["r2"] > t.get("lineal")["r2"]

def test_influencia():
    "Apalancamiento y Cook iguales a statsmodels"
    inf = t.get("modelo_loglog").get_influence()
    assert np.allclose(t.get("h"), inf.hat_matrix_diag) and np.allclose(t.get("cook"), inf.cooks_distance[0])
    assert abs(t.get("h").sum() - 2) < 1e-9
    assert t.get("mas_apalancado") == 301 and t.get("mas_influyente") == 302, "El gigante tiene apalancamiento; el de copa rota, influencia"

def test_diagnostico():
    "Heterocedasticidad en la escala original"
    bp = t.get("bp", dict)
    assert bp["lineal"] < 1e-6 and bp["loglog"] > bp["lineal"]
    e = t.get("exponente", dict)
    ci = t.get("modelo_loglog").conf_int().loc["log_d"].values
    assert np.allclose(e["ic95"], ci) and abs(e["con_todos"] - t.get("loglog")["b"]) < 1e-12
    assert e["sin_influyente"] > e["con_todos"], "Quitar el árbol de copa rota sube el exponente"
    assert len(t.get("sin_influyente")["residuos"]) == len(t.get("arboles")) - 1
`,
    hints: [
      "ols: `sxx = ((x - x.mean()) ** 2).sum()`, `b = ((x - x.mean()) * (y - y.mean())).sum() / sxx`, `s2 = (res ** 2).sum() / (n - 2)` y `ee_a = sqrt(s2 * (1/n + x.mean()**2 / sxx))`.",
      "Breusch-Pagan: `het_breuschpagan(modelo.resid, modelo.model.exog)[1]` es el p-valor del estadístico LM.",
      "Para el ajuste sin el punto más influyente, filtra con `cook < cook.max()`.",
    ],
    errors: [
      { error: "Confundir apalancamiento con influencia", fix: "Un punto lejano en x que sigue la tendencia tiene mucho apalancamiento y poca influencia; lo que pesa es la combinación con su residuo (Cook)." },
      { error: "Quitar el punto influyente para «mejorar» el modelo", fix: "Mide cuánto cambia el resultado y decide con un motivo (aquí, una copa rota mide otra cosa). Informa de ambos." },
      { error: "Comparar los R² de modelos con respuestas distintas como si nada", fix: "R² en log y en metros miden cosas distintas: compáralos con cautela y apóyate en los residuos." },
    ],
    quiz: {
      question: "El exponente alométrico es b = 0,57 (IC 95 % 0,54-0,61). ¿Qué significa en la práctica?",
      options: [
        { text: "Que, en promedio, al duplicar el diámetro la altura se multiplica por unos 2^0,57 ≈ 1,49: crece menos que proporcionalmente" },
        { text: "Que cada centímetro de diámetro añade 0,57 m de altura" },
        { text: "Que el 57 % de la altura se debe al diámetro", misconception: "correlacion-causalidad" },
        { text: "Que la altura y el diámetro no están relacionados porque b < 1" },
      ],
      answer: 0,
      explanation: "En un modelo log-log el coeficiente es una elasticidad: un 1 % más de diámetro se asocia con un 0,57 % más de altura. La interpretación en centímetros sería la del modelo lineal.",
    },
    project: SPEC,
    review: "Repasa: fórmulas de la regresión simple; residuos en abanico y Breusch-Pagan; log-log y exponente; apalancamiento frente a Cook.",
    xp: 140,
    coins: 20,
  },
  {
    id: "pf-arboles-3",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El estudio de los árboles · 3: especie, confusión, interacción y validación cruzada",
    kind: "project",
    difficulty: 4,
    skills: ["regresion", "causalidad", "seleccion-variables", "validacion-cruzada"],
    requires: ["pf-arboles-2", "c-simpson"],
    series: { ...SERIES, stage: 3 },
    packages: ["numpy", "pandas", "scipy", "statsmodels"],
    files: FILES,
    story: "Un botánico mira el exponente de 0,57 y frunce el ceño: «Los pinos crecen casi proporcionalmente, los robles mucho menos. Y los pinos de este bosque son delgados, las hayas gruesas. Esa recta común mezcla especies».",
    objective: "Comparar la pendiente conjunta con las de cada especie, contrastar con F si la especie y la interacción mejoran el modelo, elegir entre cuatro modelos por validación cruzada y medir la colinealidad entre diámetro y edad con el VIF.",
    before: ["Etapas 1 y 2", "Paradoja de Simpson y confusión", "Validación cruzada"],
    intuition: [
      "La especie influye en el diámetro (pinos delgados, hayas gruesas) **y** en la altura: es una variable de **confusión**. La pendiente conjunta mezcla «crecer dentro de una especie» con «pasar de una especie a otra».",
      "",
      "Añadir `C(especie)` da a cada especie su propia ordenada; la **interacción** `log_d * C(especie)` le da además su propia pendiente. La prueba **F de modelos anidados** dice si cada paso reduce el error más de lo esperable por azar.",
      "",
      "La **validación cruzada** responde a otra pregunta: ¿predice mejor en datos nuevos? Los términos que solo ajustan ruido empeoran el RMSE fuera de la muestra. Añadir la edad apenas cambia nada: está muy correlacionada con el diámetro.",
      "",
      "El **VIF** cuantifica esa colinealidad: VIF = 1/(1 − R²) de explicar una variable con las demás. Un VIF de 6 significa que la varianza de su coeficiente se multiplica por 6.",
    ],
    formal: "F = [(SCR₀ − SCR₁)/Δgl] / [SCR₁/gl₁] · VIF_j = 1/(1 − R²_j) · RMSE_CV = √(Σ_k Σ_{i ∈ k} (y_i − ŷ_i^(−k))² / n)",
    example: {
      code: py`import numpy as np
grupo = np.repeat([0, 1], 50)
x = np.where(grupo == 0, 1.0, 3.0) + np.random.default_rng(0).normal(0, 0.3, 100)
y = np.where(grupo == 0, 0.0, -3.0) + 1.0 * x + np.random.default_rng(1).normal(0, 0.1, 100)
print(round(np.polyfit(x, y, 1)[0], 2), [round(np.polyfit(x[grupo == g], y[grupo == g], 1)[0], 2) for g in (0, 1)])`,
      lines: [
        "NumPy.",
        "Dos grupos de 50.",
        "El grupo 1 tiene x mayores.",
        "Dentro de cada grupo la pendiente es 1, pero el grupo 1 está 3 unidades más abajo.",
        "La pendiente conjunta sale negativa (≈ −0,4) aunque dentro de cada grupo es ≈ 1: la confusión puede incluso invertir el signo.",
      ],
    },
    challenge: [
      "1. `FORMULAS`: `simple` (log_h ~ log_d), `especie` (+ C(especie)), `interaccion` (log_d * C(especie)) y `con_edad` (interacción + edad).",
      "2. `pendientes_por_especie(df)`: con tu `ols`, la pendiente log-log de cada especie.",
      "3. `rmse_cv(formula, df, k=5, semilla=0)`: pliegue de cada fila = `default_rng(semilla).permutation(n) % k`; construye una vez la matriz de diseño con `smf.ols(formula, data=df).exog` y ajusta cada pliegue con `np.linalg.lstsq`. Devuelve el RMSE de todas las predicciones fuera de pliegue.",
      "4. `vif(df, columnas)`: con `variance_inflation_factor` sobre una matriz con constante.",
      "5. `ajustes` (los cuatro modelos ajustados con todos los datos), `pendientes`, `comparacion_anova` (`anova_lm` de simple, especie e interacción), `cv`, `mejor_modelo` (menor RMSE), `inflacion` (VIF de log_d y edad) y `r2_ajustado`.",
    ],
    starter: py`from statsmodels.stats.anova import anova_lm
from statsmodels.stats.outliers_influence import variance_inflation_factor

FORMULAS = {}


def pendientes_por_especie(df):
    return {}


def rmse_cv(formula, df, k=5, semilla=0):
    return 0.0


def vif(df, columnas):
    return {}


ajustes = {}
pendientes = pendientes_por_especie(arboles)
comparacion_anova = None
cv = {}
mejor_modelo = None
inflacion = vif(arboles, ["log_d", "edad"])
r2_ajustado = {}`,
    solution: SOL3,
    tests: py`
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf

def test_pendientes():
    "La pendiente conjunta no es la de ninguna especie"
    p, a = t.get("pendientes", dict), t.get("arboles", pd.DataFrame)
    assert set(p) == {"pino", "roble", "haya"}
    for especie, b in p.items():
        ref = smf.ols("log_h ~ log_d", data=a[a["especie"] == especie]).fit().params["log_d"]
        assert abs(b - ref) < 1e-12
    conjunta = t.get("exponente")["con_todos"]
    assert p["pino"] > conjunta and p["haya"] > conjunta

def test_anova():
    "F de modelos anidados"
    tabla, aj = t.get("comparacion_anova"), t.get("ajustes", dict)
    s1, s2 = aj["especie"].ssr, aj["interaccion"].ssr
    F = ((s1 - s2) / 2) / (s2 / aj["interaccion"].df_resid)
    assert abs(tabla["F"].iloc[2] - F) < 1e-9 and tabla["Pr(>F)"].iloc[1] < 1e-10 and tabla["Pr(>F)"].iloc[2] < 0.01

def test_validacion_cruzada():
    "RMSE fuera de pliegue igual al de reajustar con la fórmula"
    rc, a, f = t.get("rmse_cv", "function"), t.get("arboles", pd.DataFrame), t.get("FORMULAS", dict)
    pliegue = np.random.default_rng(3).permutation(len(a)) % 4
    cuadrados = []
    for k in range(4):
        m = smf.ols(f["especie"], data=a[pliegue != k]).fit()
        cuadrados.extend((a[pliegue == k]["log_h"] - m.predict(a[pliegue == k])) ** 2)
    assert abs(rc(f["especie"], a, k=4, semilla=3) - np.sqrt(np.mean(cuadrados))) < 1e-10
    cv = t.get("cv", dict)
    assert set(cv) == {"simple", "especie", "interaccion", "con_edad"} and t.get("mejor_modelo") == min(cv, key=cv.get) == "interaccion"
    assert cv["simple"] > cv["especie"] > cv["interaccion"]

def test_colinealidad():
    "VIF y R² ajustado"
    v, a = t.get("inflacion", dict), t.get("arboles", pd.DataFrame)
    r2 = smf.ols("log_d ~ edad", data=a).fit().rsquared
    assert abs(v["log_d"] - 1 / (1 - r2)) < 1e-9 and v["edad"] > 5
    r2a = t.get("r2_ajustado", dict)
    assert abs(r2a["con_edad"] - t.get("ajustes")["con_edad"].rsquared_adj) < 1e-12
    assert r2a["con_edad"] - r2a["interaccion"] < 0.002, "La edad apenas añade nada"
`,
    hints: [
      "pendientes_por_especie: `{e: ols(g[\"log_d\"], g[\"log_h\"])[\"b\"] for e, g in df.groupby(\"especie\")}`.",
      "rmse_cv: `modelo = smf.ols(formula, data=df)`; `X, y = modelo.exog, modelo.endog`; para cada pliegue, `beta = np.linalg.lstsq(X[dentro], y[dentro], rcond=None)[0]`.",
      "vif: `X = np.column_stack([np.ones(len(df))] + [df[c] for c in columnas])` y `variance_inflation_factor(X, i + 1)` (el índice 0 es la constante).",
    ],
    errors: [
      { error: "Interpretar la pendiente conjunta como la de todas las especies", fix: "Mezcla dos efectos; si un grupo cambia x y y a la vez, ajusta por él o modela por grupo." },
      { error: "Elegir el modelo con más R²", fix: "R² nunca baja al añadir términos. Usa la validación cruzada (o al menos el R² ajustado)." },
      { error: "Ajustar la validación cruzada barajando de nuevo en cada modelo", fix: "Usa los mismos pliegues para todos: así las diferencias son del modelo, no del reparto." },
    ],
    quiz: {
      question: "La interacción es significativa (p < 0,001) y mejora el RMSE de validación de 0,138 a 0,134. ¿Cómo lo resumes?",
      options: [
        { text: "Las especies crecen con exponentes distintos; la interacción es real y mejora algo la predicción, aunque la mayor parte de la mejora viene de separar las especies" },
        { text: "La interacción explica el 0,1 % de la altura y es irrelevante", misconception: "significacion-relevancia" },
        { text: "Como p < 0,001, el modelo con interacción es el correcto y los demás están mal" },
        { text: "La validación cruzada contradice a la prueba F" },
      ],
      answer: 0,
      explanation: "La F y la validación cruzada coinciden aquí. Mirar cuánto mejora cada paso (simple → especie → interacción) ayuda a contar la historia con proporción.",
    },
    project: SPEC,
    review: "Repasa: confusión por grupo; especie como factor e interacción; F de modelos anidados; validación cruzada con los mismos pliegues; VIF.",
    xp: 150,
    coins: 22,
  },
  {
    id: "pf-arboles-4",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El estudio de los árboles · 4: predicción en metros, figura e informe",
    kind: "project",
    difficulty: 4,
    skills: ["intervalos-prediccion", "regresion", "visualizacion", "comunicacion"],
    requires: ["pf-arboles-3", "ec-ols"],
    series: { ...SERIES, stage: 4 },
    packages: ["numpy", "pandas", "scipy", "statsmodels", "matplotlib"],
    files: FILES,
    story: "El objetivo final de los guardas: medir el tronco de un árbol y decir cuánto mide de alto, en metros y con un margen. Y comprobar que ese margen es honesto con árboles que el modelo no ha visto.",
    objective: "Reservar árboles para comprobar, predecir en metros a partir del modelo logarítmico (mediana, media con el factor de Duan e intervalo de predicción), medir la cobertura real del intervalo y comunicar el estudio con una figura de dos paneles y un informe.",
    before: ["Etapas 1 a 3", "Intervalos de confianza y de predicción", "Escalas logarítmicas en matplotlib"],
    intuition: [
      "El modelo predice log(altura). exp(ŷ) es la **mediana** de la altura, no su media: como exp es convexa, deshacer el logaritmo sin más **subestima** la media. El factor de **Duan** (la media de exp(residuos)) lo corrige sin suponer normalidad.",
      "",
      "El **intervalo de predicción** (para un árbol concreto) incluye la incertidumbre del modelo **y** la variación entre árboles: es mucho más ancho que el de confianza de la recta. En log es simétrico; en metros, asimétrico.",
      "",
      "La forma honesta de comprobarlo es reservar árboles al azar, ajustar sin ellos y contar cuántos caen dentro: lo esperado es en torno al 95 %. Aquí sale algo más, porque el árbol de copa rota infla la dispersión estimada: los intervalos quedan algo anchos.",
      "",
      "La figura en ejes **logarítmicos** muestra las tres leyes como rectas; el panel de residuos confirma que ya no hay abanico ni curva.",
    ],
    formal: "mediana = exp(ŷ) · media ≈ exp(ŷ)·(1/n)Σ exp(eᵢ) (Duan) · IP = exp(ŷ ± t·√(EE(ŷ)² + s²))",
    example: {
      code: py`import numpy as np
log_alturas = np.random.default_rng(0).normal(np.log(15), 0.3, 100000)
alturas = np.exp(log_alturas)
print(round(np.exp(log_alturas.mean()), 2), round(alturas.mean(), 2), round(np.exp(log_alturas.mean()) * np.mean(np.exp(log_alturas - log_alturas.mean())), 2))`,
      lines: [
        "NumPy.",
        "Log-alturas normales alrededor de log(15) con desviación 0,3.",
        "Las alturas en metros.",
        "exp(media del log) ≈ 15,0 subestima la media real ≈ 15,7; el factor de Duan la recupera.",
      ],
    },
    challenge: [
      "1. `particion(df, fraccion=0.25, semilla=1)`: reserva las filas con `default_rng(semilla).random(n) < fraccion`; devuelve `(entreno, reserva)` con índices reiniciados.",
      "2. `predecir_altura(modelo, nuevos, conf=0.95)`: con `modelo.get_prediction(nuevos).summary_frame(alpha=...)`, un DataFrame con `mediana`, `media` (Duan), `bajo` y `alto` (intervalo de predicción en metros).",
      "3. `figura_estudio(df, modelo)`: a la izquierda, dispersión por especie en ejes logarítmicos con la línea de cada especie, etiquetas y leyenda; a la derecha, residuos frente a valores ajustados con una línea en 0.",
      "4. `entreno, reserva`, `modelo_final` (el `mejor_modelo` ajustado con `entreno`), `pred`, `cobertura`, `ingenua` y `corregida` (error medio en metros de la mediana y de la media en `reserva`), `ejemplo` (árboles de 30 cm de cada especie), `figura` (con el mejor modelo ajustado con todos) e `informe` de seis líneas, impreso.",
    ],
    starter: py`import matplotlib.pyplot as plt


def particion(df, fraccion=0.25, semilla=1):
    return df, df.iloc[0:0]


def predecir_altura(modelo, nuevos, conf=0.95):
    return pd.DataFrame(columns=["mediana", "media", "bajo", "alto"])


def figura_estudio(df, modelo):
    return plt.figure()


entreno, reserva = particion(arboles)
modelo_final = None
pred = None
cobertura = 0.0
ingenua = 0.0
corregida = 0.0
ejemplo = None
figura = None
informe = ""
print(informe)`,
    solution: SOL4,
    tests: py`
import numpy as np
import pandas as pd
from scipy import stats

def test_particion():
    "Reserva reproducible"
    pa, a = t.get("particion", "function"), t.get("arboles", pd.DataFrame)
    e, r = pa(a, semilla=1)
    mascara = np.random.default_rng(1).random(len(a)) < 0.25
    assert len(r) == mascara.sum() and len(e) + len(r) == len(a)
    assert set(r["arbol"]) == set(a.loc[mascara, "arbol"]) and list(r.index) == list(range(len(r)))

def test_prediccion():
    "Mediana, Duan e intervalo en metros"
    pr, m = t.get("pred", pd.DataFrame), t.get("modelo_final")
    r = t.get("reserva", pd.DataFrame)
    yhat = m.predict(r)
    assert np.allclose(pr["mediana"], np.exp(yhat))
    duan = np.mean(np.exp(m.resid))
    assert duan > 1 and np.allclose(pr["media"], np.exp(yhat) * duan)
    se = m.get_prediction(r).se_mean
    tq = stats.t.ppf(0.975, m.df_resid)
    assert np.allclose(pr["bajo"], np.exp(yhat - tq * np.sqrt(se ** 2 + m.scale)))
    assert (pr["bajo"] < pr["mediana"]).all() and (pr["alto"] - pr["mediana"] > pr["mediana"] - pr["bajo"]).all(), "En metros el intervalo es asimétrico"

def test_cobertura_y_sesgo():
    "Intervalos honestos y sesgo corregido"
    assert t.get("cobertura") >= 0.9
    assert abs(t.get("corregida")) < abs(t.get("ingenua")) and t.get("ingenua") > 0, "La mediana retransformada subestima la altura media"
    ej = t.get("ejemplo", pd.DataFrame)
    assert len(ej) == 3 and ej["mediana"].iloc[0] > ej["mediana"].iloc[2] > ej["mediana"].iloc[1], "Con 30 cm, pino > haya > roble"

def test_figura_e_informe():
    "Dos paneles y seis líneas"
    fig = t.get("figura")
    izq, der = fig.axes
    assert izq.get_xscale() == "log" and izq.get_yscale() == "log" and len(izq.collections) == 3 and len(izq.lines) == 3
    assert izq.get_legend() is not None and der.get_xlabel() and der.get_ylabel()
    inf = t.get("informe", str)
    assert len(inf.splitlines()) == 6 and inf in t.out
    assert "interaccion" in inf and f"{t.get('cobertura'):.0%}" in inf and f"{t.get('r_log'):.3f}" in inf
`,
    hints: [
      "predecir_altura: `p = modelo.get_prediction(nuevos).summary_frame(alpha=1 - conf)`; las columnas `mean`, `obs_ci_lower` y `obs_ci_upper` están en log; aplica `np.exp`.",
      "Duan: `np.mean(np.exp(modelo.resid))`.",
      "figura: para cada especie, `modelo.predict(pd.DataFrame({\"log_d\": malla, \"especie\": especie}))` da la línea en log; dibuja `np.exp(malla)` frente a `np.exp(linea)` y pon `set_xscale(\"log\")` y `set_yscale(\"log\")`.",
    ],
    errors: [
      { error: "Dar exp(ŷ) como la altura media", fix: "Es la mediana; para la media multiplica por el factor de Duan (o por exp(s²/2) si los errores son normales)." },
      { error: "Usar el intervalo de confianza de la recta para un árbol concreto", fix: "Un árbol varía alrededor de la recta: usa el intervalo de predicción (obs_ci)." },
      { error: "Comprobar la cobertura con los mismos árboles del ajuste", fix: "Saldría optimista: reserva árboles antes de ajustar." },
    ],
    quiz: {
      question: "Para un pino de 30 cm el intervalo de predicción al 95 % va de 12,9 a 22,6 m, con mediana 17,1 m. ¿Por qué no es simétrico?",
      options: [
        { text: "Porque es simétrico en escala logarítmica y al volver a metros con exp se estira hacia arriba" },
        { text: "Porque está mal calculado: los intervalos siempre son simétricos" },
        { text: "Porque los pinos tienden a ser más altos que la mediana" },
        { text: "Porque el 95 % de los pinos miden exactamente 17,1 m" },
      ],
      answer: 0,
      explanation: "Un margen multiplicativo (×/÷ un factor) se vuelve asimétrico en la escala original. Es lo esperable con crecimiento en ley de potencias.",
    },
    project: SPEC,
    review: "Repasa: retransformar desde log (mediana, Duan); intervalos de predicción; cobertura en datos reservados; figuras en ejes log; informes generados.",
    xp: 160,
    coins: 24,
  },
];
