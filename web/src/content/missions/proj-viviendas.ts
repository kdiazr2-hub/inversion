import { viviendasCsv } from "../datasets";
import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 6: un modelo de precios de viviendas, de la estrategia de
// evaluación a la ficha del modelo.

const SERIES = { id: "tasador-viviendas", title: "Proyecto progresivo: el tasador de viviendas", of: 4 };
const FILES = { "viviendas.csv": viviendasCsv() };
const PACKAGES = ["numpy", "pandas", "scikit-learn", "matplotlib"];

const SPEC: ProjectSpec = {
  requirements: [
    "Separar el conjunto de prueba antes de explorar y no usarlo hasta la evaluación final.",
    "Comparar siempre con una línea base y decidir con validación cruzada en el entrenamiento.",
    "Preprocesar dentro de un pipeline (codificación, imputación y escalado) para evitar fugas.",
    "Ajustar hiperparámetros de un modelo no lineal con búsqueda en rejilla.",
    "Evaluar una única vez en prueba, analizar errores por grupos e interpretar con importancia por permutación.",
    "Documentar el modelo en una ficha con métricas y limitaciones.",
  ],
  dataset: "viviendas.csv: 1500 viviendas ficticias con barrio, superficie, habitaciones, baños, antigüedad (con faltantes), planta, ascensor, distancia al centro y precio en miles de euros (con algunos errores de tecleo).",
  stages: ["Estrategia de evaluación, exploración y línea base", "Modelo lineal con pipeline y diagnóstico de residuos", "Gradient boosting y ajuste de hiperparámetros", "Evaluación final, interpretabilidad y ficha del modelo"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "El conjunto de prueba solo se usa en la etapa 4.",
    "El modelo final mejora claramente a la línea base y al modelo lineal en validación cruzada.",
    "La ficha explica qué variables pesan más y dónde se equivoca más el modelo.",
  ],
  extensions: [
    "Modelo lineal sobre log(precio) con log(superficie) e interpretación de los coeficientes como porcentajes.",
    "Intervalos de predicción con regresión cuantílica (HistGradientBoostingRegressor(loss=\"quantile\")).",
    "Curva de aprendizaje: ¿mejoraría el modelo con más viviendas?",
  ],
  portfolio: "Modelo de valoración inmobiliaria con estrategia de evaluación sin fugas, pipeline de preprocesado, comparación con línea base y modelo lineal, ajuste de hiperparámetros, importancia por permutación y ficha del modelo.",
};

const S1 = py`import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.model_selection import KFold, cross_val_score, train_test_split

def cargar(ruta):
    return pd.read_csv(ruta)

def corregir(df):
    out = df.copy()
    errores = out["superficie_m2"] > 600
    out.loc[errores, "superficie_m2"] = np.nan
    return out, int(errores.sum())

def dividir(df):
    X = df.drop(columns=["id", "precio_miles"])
    y = df["precio_miles"]
    return train_test_split(X, y, test_size=0.2, random_state=42)

def explorar(X, y):
    numericas = X.select_dtypes("number")
    return {
        "n": len(X),
        "faltantes": X.isna().sum().to_dict(),
        "correlaciones": numericas.corrwith(y, method="spearman").sort_values(key=abs, ascending=False),
        "mediana_por_barrio": y.groupby(X["barrio"]).median().sort_values(ascending=False),
    }

viviendas, n_corregidos = corregir(cargar("viviendas.csv"))
X_tr, X_te, y_tr, y_te = dividir(viviendas)
exploracion = explorar(X_tr, y_tr)
cv = KFold(n_splits=5, shuffle=True, random_state=0)

def mae_cv(modelo):
    return -cross_val_score(modelo, X_tr, y_tr, cv=cv, scoring="neg_mean_absolute_error").mean()

resultados = {"base": mae_cv(DummyRegressor(strategy="median"))}`;

const S2 = py`from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
import matplotlib.pyplot as plt

CATEGORICAS = ["barrio"]
NUMERICAS = ["superficie_m2", "habitaciones", "banos", "antiguedad", "planta", "ascensor", "distancia_centro_km"]

def preprocesador():
    return ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAS),
        ("num", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), NUMERICAS),
    ])

modelo_lineal = make_pipeline(preprocesador(), LinearRegression())
resultados["lineal"] = mae_cv(modelo_lineal)

def coeficientes(modelo, X, y):
    modelo.fit(X, y)
    nombres = modelo[0].get_feature_names_out()
    return pd.Series(modelo[-1].coef_, index=nombres)

pred_cv = cross_val_predict(modelo_lineal, X_tr, y_tr, cv=cv)
fig, ax = plt.subplots()
ax.scatter(pred_cv, y_tr - pred_cv, s=8, alpha=0.5)
ax.axhline(0, color="black", linewidth=1)
ax.set_xlabel("Precio predicho (miles de €)")
ax.set_ylabel("Residuo (miles de €)")
ax.set_title("Residuos del modelo lineal (validación cruzada)")`;

const S3 = py`from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import GridSearchCV
from sklearn.pipeline import Pipeline

busqueda = GridSearchCV(
    Pipeline([("pre", preprocesador()), ("modelo", HistGradientBoostingRegressor(random_state=0))]),
    {"modelo__max_leaf_nodes": [7, 15, 31]},
    cv=cv,
    scoring="neg_mean_absolute_error",
).fit(X_tr, y_tr)
resultados["boosting"] = -busqueda.best_score_
mejor_modelo = busqueda.best_estimator_
tabla_resultados = pd.Series(resultados).sort_values()`;

const S4 = py`from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error

pred_te = mejor_modelo.predict(X_te)
mae_prueba = mean_absolute_error(y_te, pred_te)
mae_base_prueba = mean_absolute_error(y_te, DummyRegressor(strategy="median").fit(X_tr, y_tr).predict(X_te))
_pi = permutation_importance(mejor_modelo, X_te, y_te, n_repeats=5, random_state=0, scoring="neg_mean_absolute_error")
importancias = pd.Series(_pi.importances_mean, index=X_te.columns).sort_values(ascending=False)
errores_por_barrio = (pd.Series(np.abs(pred_te - y_te.to_numpy()), index=X_te.index).groupby(X_te["barrio"]).mean().sort_values(ascending=False))
error_relativo_mediano = float(np.median(np.abs(pred_te - y_te) / y_te))
ficha = {
    "modelo": "HistGradientBoostingRegressor con preprocesado en pipeline",
    "hiperparametros": busqueda.best_params_,
    "mae_cv": resultados["boosting"],
    "mae_prueba": mae_prueba,
    "mejora_sobre_base": 100 * (1 - mae_prueba / mae_base_prueba),
    "variables_clave": list(importancias.index[:3]),
    "barrio_mas_dificil": errores_por_barrio.index[0],
    "limitaciones": [
        "Datos sintéticos de una ciudad imaginaria: no sirve para tasar viviendas reales.",
        f"El error medio es mayor en {errores_por_barrio.index[0]} ({errores_por_barrio.iloc[0]:.0f} mil €); conviene revisar esas tasaciones a mano.",
        "No incluye el estado de conservación ni la orientación, que afectan al precio real.",
    ],
}`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

// Independent reference used by the tests.
const REF = py`
import numpy as np
import pandas as pd
from sklearn.model_selection import KFold, train_test_split

def _ref():
    v = pd.read_csv("viviendas.csv")
    v.loc[v.superficie_m2 > 600, "superficie_m2"] = np.nan
    X = v.drop(columns=["id", "precio_miles"])
    return train_test_split(X, v.precio_miles, test_size=0.2, random_state=42)

CV = KFold(n_splits=5, shuffle=True, random_state=0)
`;

export const PROJ_VIVIENDAS: Mission[] = [
  {
    id: "pv-viviendas-1",
    world: "w6",
    zone: "Proyecto del Laboratorio",
    title: "El tasador de viviendas · 1: estrategia de evaluación, exploración y línea base",
    kind: "project",
    difficulty: 3,
    skills: ["estrategia-evaluacion", "eda", "linea-base", "validacion-cruzada"],
    requires: ["ml-validacion"],
    series: { ...SERIES, stage: 1 },
    story: "La agencia de la ciudad quiere un tasador automático. Antes de entrenar nada, el jefe del laboratorio te para: «¿Cómo sabremos si funciona? Decide eso primero, y aparta datos que nadie toque hasta el final».",
    objective: "Corregir errores evidentes, separar el conjunto de prueba antes de explorar, explorar solo el entrenamiento y fijar una línea base evaluada con validación cruzada.",
    before: ["Validación cruzada (ml-validacion)", "Línea base", "Correlación de Spearman"],
    packages: ["numpy", "pandas", "scikit-learn"],
    files: FILES,
    intuition: [
      "El orden importa:",
      "",
      "1. **Corregir** errores evidentes con una regla fija (una vivienda de 1740 m² con 3 habitaciones es un cero de más). Una regla que no aprende de los datos puede aplicarse antes de dividir.",
      "2. **Separar la prueba** (20 %) y no mirarla. Todo lo que aprendas mirando la prueba (qué variables importan, qué modelo gana) contamina la evaluación final.",
      "3. **Explorar** el entrenamiento: faltantes, relación de cada variable con el precio (Spearman capta relaciones monótonas aunque no sean lineales), precio por barrio.",
      "4. Fijar la **métrica** y la **línea base**. El MAE (error absoluto medio) está en miles de euros, fácil de explicar. La línea base predice siempre la mediana: cualquier modelo debe mejorarla.",
      "5. Decidir con **validación cruzada** en el entrenamiento.",
    ],
    formal: "MAE = (1/n) Σ |yᵢ − ŷᵢ|. Con K pliegues, MAE_CV = media de los K MAE obtenidos entrenando en K − 1 pliegues y evaluando en el restante.",
    example: {
      code: py`import pandas as pd
v = pd.read_csv("viviendas.csv")
print(v.shape)
print(v.isna().sum()[lambda s: s > 0].to_dict())
print(v.sort_values("superficie_m2").tail(2)[["superficie_m2", "habitaciones", "precio_miles"]])`,
      lines: [
        "pandas.",
        "Las 1500 viviendas.",
        "Filas y columnas.",
        "Solo la antigüedad tiene faltantes.",
        "Las superficies más grandes delatan errores de tecleo: miles de m² con pocas habitaciones y precios normales.",
      ],
    },
    challenge: [
      "1. `cargar(ruta)` y `corregir(df)`: tupla (copia con `superficie_m2` = NaN cuando supera 600, número de valores corregidos).",
      "2. `dividir(df)`: `X` = todas las columnas salvo `id` y `precio_miles`, `y` = `precio_miles`; devuelve `train_test_split(X, y, test_size=0.2, random_state=42)`.",
      "3. `explorar(X, y)`: diccionario con `n`, `faltantes` (columna → número), `correlaciones` (Spearman de cada columna numérica con y, ordenadas por valor absoluto descendente) y `mediana_por_barrio` (ordenada de mayor a menor).",
      "4. `viviendas, n_corregidos`, `X_tr, X_te, y_tr, y_te`, `exploracion = explorar(X_tr, y_tr)` y `cv = KFold(n_splits=5, shuffle=True, random_state=0)`.",
      "5. `mae_cv(modelo)`: MAE medio de validación cruzada en el entrenamiento con `cv`; y `resultados = {\"base\": mae_cv(DummyRegressor(strategy=\"median\"))}`.",
    ],
    starter: py`import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.model_selection import KFold, cross_val_score, train_test_split

def cargar(ruta):
    return pd.read_csv(ruta)

def corregir(df):
    return df, 0

def dividir(df):
    return df, df, df["precio_miles"], df["precio_miles"]

def explorar(X, y):
    return {}

viviendas, n_corregidos = corregir(cargar("viviendas.csv"))
X_tr, X_te, y_tr, y_te = dividir(viviendas)
exploracion = explorar(X_tr, y_tr)
cv = None

def mae_cv(modelo):
    return 0

resultados = {}`,
    solution: SOL1,
    tests: `${REF}
from sklearn.dummy import DummyRegressor
from sklearn.model_selection import cross_val_score

def test_correccion():
    "Errores de superficie a NaN, sin borrar viviendas"
    v, n = t.get("corregir", "function")(pd.read_csv("viviendas.csv"))
    assert n == 5 and v.superficie_m2.isna().sum() == 5 and len(v) == 1500
    assert pd.read_csv("viviendas.csv").superficie_m2.max() > 600

def test_division():
    "Prueba apartada con la semilla indicada"
    X_tr, X_te, y_tr, y_te = _ref()
    assert list(t.get("X_tr").index) == list(X_tr.index) and list(t.get("X_te").index) == list(X_te.index)
    assert "precio_miles" not in t.get("X_tr").columns and "id" not in t.get("X_tr").columns

def test_exploracion():
    "Exploración solo del entrenamiento"
    X_tr, _, y_tr, _ = _ref()
    e = t.get("exploracion")
    assert e["n"] == len(X_tr) == 1200
    assert e["faltantes"]["antiguedad"] == int(X_tr.antiguedad.isna().sum())
    c = e["correlaciones"]
    assert c.index[0] == "superficie_m2" and approx(c["superficie_m2"], X_tr.superficie_m2.corr(y_tr, method="spearman"))
    assert list(np.abs(c.values)) == sorted(np.abs(c.values), reverse=True)
    assert e["mediana_por_barrio"].index[0] == y_tr.groupby(X_tr.barrio).median().idxmax()

def test_linea_base():
    "MAE de validación cruzada de la línea base"
    X_tr, _, y_tr, _ = _ref()
    ref = -cross_val_score(DummyRegressor(strategy="median"), X_tr, y_tr, cv=CV, scoring="neg_mean_absolute_error").mean()
    assert approx(t.get("resultados")["base"], ref, 1e-9)
    assert approx(t.get("mae_cv", "function")(DummyRegressor(strategy="mean")), -cross_val_score(DummyRegressor(), X_tr, y_tr, cv=CV, scoring="neg_mean_absolute_error").mean(), 1e-9)
`,
    hints: [
      "corregir: crea la máscara `out[\"superficie_m2\"] > 600` y asigna `np.nan` con `.loc`.",
      "explorar: `X.select_dtypes(\"number\").corrwith(y, method=\"spearman\")` y ordena con `sort_values(key=abs, ascending=False)`.",
      "mae_cv: `cross_val_score(..., scoring=\"neg_mean_absolute_error\")` devuelve MAE con signo negativo; cambia el signo de la media.",
    ],
    errors: [
      { error: "Explorar todo el conjunto antes de dividir", fix: "Las decisiones que tomes mirando la prueba (variables, transformaciones) la contaminan." },
      { error: "Borrar las filas con superficie errónea", fix: "El precio y el resto de variables son válidos: marca solo el valor erróneo como faltante y deja que el pipeline lo impute." },
    ],
    quiz: {
      question: "Pruebas diez modelos y eliges el que mejor MAE tiene en el conjunto de prueba. ¿Qué problema hay?",
      options: [
        { text: "El MAE del elegido es optimista: has usado la prueba para seleccionar y ya no mide el rendimiento con datos nuevos" },
        { text: "Ninguno, para eso está el conjunto de prueba", misconception: "data-leakage" },
        { text: "Que diez modelos son pocos" },
        { text: "Que el MAE no sirve para comparar modelos" },
      ],
      answer: 0,
      explanation: "Seleccionar con la prueba convierte la prueba en validación. Con muchos candidatos, el mejor suele ser algo afortunado en esa partición. Se elige con validación cruzada en el entrenamiento y se evalúa una vez en prueba.",
    },
    project: SPEC,
    review: "Repasa: corrige con reglas fijas, separa la prueba primero, explora el entrenamiento, línea base y validación cruzada.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pv-viviendas-2",
    world: "w6",
    zone: "Proyecto del Laboratorio",
    title: "El tasador de viviendas · 2: modelo lineal con pipeline y residuos",
    kind: "project",
    difficulty: 4,
    skills: ["pipelines", "regresion", "preprocesado", "diagnostico-residuos"],
    requires: ["pv-viviendas-1", "ml-pipeline"],
    series: { ...SERIES, stage: 2 },
    story: "Primer modelo serio: una regresión lineal. Para que sea honesto, cada transformación (codificar el barrio, imputar la antigüedad, escalar) tiene que aprenderse dentro de cada pliegue de la validación.",
    objective: "Construir un preprocesador con ColumnTransformer, evaluar un modelo lineal en un pipeline, leer sus coeficientes y diagnosticar sus residuos.",
    before: ["Etapa 1", "Pipelines y ColumnTransformer (ml-pipeline)", "Residuos (ec-ols)"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "Un **pipeline** encadena preprocesado y modelo: al llamar a `fit`, la imputación aprende la mediana y el escalador la media **solo con los datos de entrenamiento** de cada pliegue. Hacerlo antes, con todos los datos, filtra información de validación (fuga).",
      "",
      "- `OneHotEncoder` convierte el barrio en columnas 0/1.",
      "- `SimpleImputer(strategy=\"median\")` rellena la antigüedad que falta.",
      "- `StandardScaler` pone las numéricas en la misma escala, lo que hace comparables los coeficientes (en «miles de euros por desviación típica»).",
      "",
      "Cuidado al leer coeficientes: habitaciones y superficie están muy correlacionadas (más metros, más habitaciones) y el modelo **reparte** el efecto entre ambas. Es la multicolinealidad del Mundo 4: el coeficiente de una variable depende de qué otras hay en el modelo.",
      "",
      "Los **residuos** obtenidos con validación cruzada (`cross_val_predict`) muestran dónde falla el modelo. Un patrón (un embudo, una curva) indica que la relación no es lineal o que el error crece con el precio.",
    ],
    formal: "ŷ = β₀ + Σⱼ βⱼ·zⱼ, con zⱼ las variables codificadas y estandarizadas. Residuo = y − ŷ (fuera de muestra).",
    example: {
      code: py`import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
ct = ColumnTransformer([("cat", OneHotEncoder(), ["barrio"])], remainder="passthrough")
df = pd.DataFrame({"barrio": ["Centro", "Puerto", "Centro"], "m2": [80, 60, 95]})
print(ct.fit_transform(df))
print(ct.get_feature_names_out())`,
      lines: [
        "pandas.",
        "ColumnTransformer aplica transformaciones distintas a columnas distintas.",
        "OneHotEncoder para categorías.",
        "Codifica el barrio y deja pasar el resto de columnas.",
        "Tres viviendas de ejemplo.",
        "Matriz con una columna por barrio y la superficie.",
        "Nombres de las columnas generadas.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `CATEGORICAS = [\"barrio\"]` y `NUMERICAS` (las demás columnas de X).",
      "2. `preprocesador()`: un `ColumnTransformer` **nuevo** con `OneHotEncoder(handle_unknown=\"ignore\")` para las categóricas y `make_pipeline(SimpleImputer(strategy=\"median\"), StandardScaler())` para las numéricas.",
      "3. `modelo_lineal = make_pipeline(preprocesador(), LinearRegression())` y `resultados[\"lineal\"] = mae_cv(modelo_lineal)`.",
      "4. `coeficientes(modelo, X, y)`: entrena el pipeline y devuelve una Serie con los coeficientes indexada por `modelo[0].get_feature_names_out()`.",
      "5. `pred_cv`: predicciones de `cross_val_predict(modelo_lineal, X_tr, y_tr, cv=cv)` y `fig`: residuos frente a predicciones con una línea en 0, título y etiquetas.",
    ],
    starter: py`from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
import matplotlib.pyplot as plt

CATEGORICAS = ["barrio"]
NUMERICAS = []

def preprocesador():
    return None

modelo_lineal = LinearRegression()

def coeficientes(modelo, X, y):
    return pd.Series(dtype=float)

pred_cv = None
fig, ax = plt.subplots()`,
    solution: SOL2,
    tests: `${REF}
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import cross_val_score, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

def _pre():
    num = ["superficie_m2", "habitaciones", "banos", "antiguedad", "planta", "ascensor", "distancia_centro_km"]
    return ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), ["barrio"]), ("num", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), num)])

def test_preprocesador():
    "Codificación, imputación y escalado"
    X_tr, _, _, _ = _ref()
    p = t.get("preprocesador", "function")()
    assert p is not t.get("preprocesador", "function")(), "Cada llamada debe crear un preprocesador nuevo"
    Z = p.fit_transform(X_tr)
    assert Z.shape == (1200, 12) and not np.isnan(Z).any()
    assert set(t.get("NUMERICAS")) == set(X_tr.columns) - {"barrio"}

def test_lineal():
    "Mejora a la línea base"
    X_tr, _, y_tr, _ = _ref()
    ref = -cross_val_score(make_pipeline(_pre(), LinearRegression()), X_tr, y_tr, cv=CV, scoring="neg_mean_absolute_error").mean()
    r = t.get("resultados")
    assert approx(r["lineal"], ref, 1e-6) and r["lineal"] < 0.6 * r["base"]

def test_coeficientes():
    "Coeficientes con nombres"
    X_tr, _, y_tr, _ = _ref()
    c = t.get("coeficientes", "function")(make_pipeline(_pre(), LinearRegression()), X_tr, y_tr)
    assert "num__superficie_m2" in c.index and "cat__barrio_Centro" in c.index
    assert c["num__superficie_m2"] > 0 and c["num__antiguedad"] < 0

def test_residuos():
    "Residuos fuera de muestra"
    X_tr, _, y_tr, _ = _ref()
    ref = cross_val_predict(make_pipeline(_pre(), LinearRegression()), X_tr, y_tr, cv=CV)
    assert np.allclose(t.get("pred_cv"), ref, atol=1e-6)
    ax = t.get("fig").axes[0]
    assert len(ax.collections[0].get_offsets()) == 1200 and ax.get_title() and ax.get_xlabel()
`,
    hints: [
      "NUMERICAS: todas las columnas de `X_tr` menos `barrio`, por ejemplo `[c for c in X_tr.columns if c != \"barrio\"]`.",
      "preprocesador debe **devolver** un objeto nuevo cada vez: un pipeline no debe compartirse entre modelos distintos.",
      "Coeficientes: `modelo[0]` es el preprocesador ajustado y `modelo[-1]` la regresión.",
    ],
    errors: [
      { error: "Escalar o imputar con todos los datos antes de la validación cruzada", fix: "Es una fuga sutil: la media y la mediana incluirían datos de validación. Hazlo dentro del pipeline." },
      { error: "Comparar coeficientes de variables sin escalar", fix: "Un coeficiente por m² y otro por planta no son comparables; estandarizados sí (por desviación típica)." },
    ],
    quiz: {
      question: "Los residuos del modelo lineal se abren a medida que sube el precio predicho. ¿Qué indica y qué puedes probar?",
      options: [
        { text: "El error crece con el precio (efecto multiplicativo): un modelo no lineal o modelar log(precio) puede ajustarse mejor" },
        { text: "Que el modelo es perfecto porque los residuos están centrados en 0", misconception: "supuestos" },
        { text: "Que hay que eliminar las viviendas caras" },
        { text: "Que hay sobreajuste porque el modelo es demasiado complejo", misconception: "sobreajuste" },
      ],
      answer: 0,
      explanation: "En los precios los efectos suelen ser multiplicativos (un barrio caro encarece cada m²). Una recta suma efectos y su error crece con el nivel. Un modelo lineal con 12 coeficientes y 1200 viviendas no está sobreajustando: le falta flexibilidad.",
    },
    project: SPEC,
    review: "Repasa: preprocesado dentro del pipeline; coeficientes estandarizados; residuos con cross_val_predict.",
    xp: 130,
    coins: 20,
  },
  {
    id: "pv-viviendas-3",
    world: "w6",
    zone: "Proyecto del Laboratorio",
    title: "El tasador de viviendas · 3: gradient boosting y ajuste de hiperparámetros",
    kind: "project",
    difficulty: 4,
    skills: ["ensambles", "hiperparametros", "validacion-cruzada", "pipelines"],
    requires: ["pv-viviendas-2", "ml-ensambles"],
    series: { ...SERIES, stage: 3 },
    story: "El modelo lineal se queda corto en los barrios caros. El laboratorio prueba un modelo capaz de captar interacciones: un ensamble de árboles que se corrigen unos a otros.",
    objective: "Ajustar un HistGradientBoostingRegressor dentro del mismo pipeline, elegir su complejidad con GridSearchCV y comparar con la línea base y el modelo lineal usando la misma validación cruzada.",
    before: ["Etapas 1 y 2", "Random Forest y Gradient Boosting (ml-ensambles)", "GridSearchCV"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "El **gradient boosting** suma árboles pequeños: cada uno corrige los errores de los anteriores. Capta relaciones no lineales e interacciones (el efecto de la planta depende de si hay ascensor) sin que tengas que escribirlas.",
      "",
      "`HistGradientBoostingRegressor` es la versión rápida de scikit-learn. Su complejidad la controla, entre otros, `max_leaf_nodes` (hojas por árbol): pocas hojas, árboles simples; muchas, árboles que pueden memorizar.",
      "",
      "**GridSearchCV** prueba cada valor con la misma validación cruzada y se queda con el mejor; después reentrena con todo el entrenamiento. Para que la comparación sea justa, todos los modelos se evalúan con los **mismos pliegues** (`cv`).",
    ],
    formal: "F_m(x) = F_{m−1}(x) + η·h_m(x), donde h_m es un árbol ajustado a los residuos (gradiente negativo de la pérdida) de F_{m−1} y η la tasa de aprendizaje.",
    example: {
      code: py`import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
x = np.linspace(0, 6, 200).reshape(-1, 1)
y = np.sin(x).ravel()
m = HistGradientBoostingRegressor(max_leaf_nodes=7, random_state=0).fit(x, y)
print(round(float(np.mean(np.abs(m.predict(x) - y))), 3))`,
      lines: [
        "NumPy.",
        "El modelo de boosting de scikit-learn.",
        "Una variable.",
        "Una relación curva que una recta no puede seguir.",
        "Árboles con como mucho 7 hojas.",
        "Error absoluto medio pequeño: la suma de árboles reproduce la curva.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `busqueda`: `GridSearchCV` sobre `Pipeline([(\"pre\", preprocesador()), (\"modelo\", HistGradientBoostingRegressor(random_state=0))])` con `{\"modelo__max_leaf_nodes\": [7, 15, 31]}`, `cv=cv` y `scoring=\"neg_mean_absolute_error\"`, entrenada con `X_tr`, `y_tr`.",
      "2. `resultados[\"boosting\"]`: el MAE de validación cruzada del mejor (`-busqueda.best_score_`) y `mejor_modelo = busqueda.best_estimator_`.",
      "3. `tabla_resultados`: Serie con `resultados` ordenada de menor a mayor MAE.",
    ],
    starter: py`from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import GridSearchCV
from sklearn.pipeline import Pipeline

busqueda = None
mejor_modelo = None
tabla_resultados = pd.Series(resultados)`,
    solution: SOL3,
    tests: `${REF}
def test_busqueda():
    "Rejilla, mismos pliegues y métrica"
    b = t.get("busqueda")
    assert [p["modelo__max_leaf_nodes"] for p in b.cv_results_["params"]] == [7, 15, 31]
    assert b.n_splits_ == 5 and b.scoring == "neg_mean_absolute_error"
    assert b.best_estimator_.named_steps["modelo"].random_state == 0

def test_comparacion():
    "El boosting mejora al lineal en validación cruzada"
    r = t.get("resultados")
    assert approx(r["boosting"], -t.get("busqueda").best_score_)
    assert r["boosting"] < r["lineal"] < r["base"], r
    tb = t.get("tabla_resultados")
    assert list(tb.index) == ["boosting", "lineal", "base"]

def test_mejor_modelo():
    "El mejor modelo está reentrenado y listo"
    X_tr, _, y_tr, _ = _ref()
    m = t.get("mejor_modelo")
    assert m is t.get("busqueda").best_estimator_ and len(m.predict(X_tr.head(3))) == 3
`,
    hints: [
      "Los parámetros de un paso del pipeline se nombran `paso__parametro`: aquí `modelo__max_leaf_nodes`.",
      "GridSearchCV reentrena el mejor con todo el entrenamiento: `best_estimator_` ya está listo para predecir.",
      "`pd.Series(resultados).sort_values()` ordena de menor a mayor.",
    ],
    errors: [
      { error: "Usar pliegues distintos para cada modelo", fix: "Las diferencias podrían deberse a la partición y no al modelo. Reutiliza el mismo `cv`." },
      { error: "Ajustar hiperparámetros con la prueba", fix: "Para eso está la validación cruzada dentro del entrenamiento." },
    ],
    quiz: {
      question: "El boosting tiene un MAE de validación cruzada de unos 26 mil € y el lineal de unos 34 mil €. ¿Qué puedes afirmar?",
      options: [
        { text: "Que, con estos pliegues, el boosting predice mejor; la evaluación definitiva será en el conjunto de prueba" },
        { text: "Que el boosting acertará cada precio con un error de 26 mil €" },
        { text: "Que las variables del boosting causan los precios", misconception: "correlacion-causalidad" },
        { text: "Que la diferencia es estadísticamente significativa con p < 0,05", misconception: "prediccion-vs-significacion" },
      ],
      answer: 0,
      explanation: "El MAE es un promedio: unas viviendas tendrán errores mucho mayores. Mejor predicción no implica causalidad, y comparar dos MAE de validación cruzada no es un contraste de hipótesis.",
    },
    project: SPEC,
    review: "Repasa: boosting = árboles que corrigen errores; GridSearchCV con el mismo cv; comparar siempre con base y lineal.",
    xp: 130,
    coins: 20,
  },
  {
    id: "pv-viviendas-4",
    world: "w6",
    zone: "Proyecto del Laboratorio",
    title: "El tasador de viviendas · 4: evaluación final, interpretabilidad y ficha del modelo",
    kind: "project",
    difficulty: 5,
    skills: ["evaluacion", "interpretabilidad", "comunicacion", "mlops"],
    requires: ["pv-viviendas-3", "ml-mlops"],
    series: { ...SERIES, stage: 4 },
    story: "Llega el momento de abrir el sobre: el conjunto de prueba. Una sola evaluación, sin vuelta atrás. Después, explicar a la agencia qué mira el modelo, dónde se equivoca más y qué no debe pedirle.",
    objective: "Evaluar una única vez en prueba, compararlo con la línea base, medir la importancia de las variables por permutación, analizar el error por barrio y redactar la ficha del modelo.",
    before: ["Etapas 1 a 3", "Importancia por permutación", "Ficha del modelo (ml-mlops)"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "La **evaluación final** en prueba estima cómo funcionará el modelo con viviendas nuevas. Debe parecerse al MAE de validación cruzada; si es mucho peor, algo se filtró o la prueba es distinta.",
      "",
      "La **importancia por permutación** baraja una variable en el conjunto de prueba y mide cuánto empeora el MAE. Si empeora mucho, el modelo depende de ella. Se calcula sobre datos que el modelo no ha visto y no depende del tipo de modelo. Ojo: dice qué usa el modelo para **predecir**, no qué **causa** el precio.",
      "",
      "Un MAE global esconde diferencias: analizar el error **por grupos** (barrios) muestra dónde no fiarse. Todo termina en una **ficha**: qué es, cómo se evaluó, qué variables pesan y cuáles son sus límites.",
    ],
    formal: "Importancia(j) = MAE(prueba con la columna j permutada) − MAE(prueba original), promediada sobre varias permutaciones.",
    example: {
      code: py`import numpy as np
rng = np.random.default_rng(0)
x = np.array([1.0, 2, 3, 4, 5])
y = 2 * x
print(np.mean(np.abs(2 * x - y)), np.mean(np.abs(2 * rng.permutation(x) - y)))`,
      lines: [
        "NumPy.",
        "Generador con semilla.",
        "Una variable.",
        "Una respuesta que depende de ella.",
        "Error 0 con la variable intacta frente a un error grande al barajarla: el modelo dependía de x.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `pred_te` (predicciones de `mejor_modelo` en `X_te`), `mae_prueba` y `mae_base_prueba` (DummyRegressor de la mediana entrenado con `X_tr`, `y_tr`).",
      "2. `importancias`: Serie con `importances_mean` de `permutation_importance(mejor_modelo, X_te, y_te, n_repeats=5, random_state=0, scoring=\"neg_mean_absolute_error\")`, indexada por las columnas de `X_te` y ordenada de mayor a menor.",
      "3. `errores_por_barrio`: MAE de prueba por barrio, de mayor a menor. `error_relativo_mediano`: mediana de |pred − y|/y.",
      "4. `ficha`: diccionario con `modelo`, `hiperparametros` (los mejores), `mae_cv`, `mae_prueba`, `mejora_sobre_base` (% de reducción del MAE frente a la base en prueba), `variables_clave` (las 3 más importantes), `barrio_mas_dificil` y `limitaciones` (al menos 3).",
    ],
    starter: py`from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error

pred_te = None
mae_prueba = mae_base_prueba = 0
importancias = pd.Series(dtype=float)
errores_por_barrio = pd.Series(dtype=float)
error_relativo_mediano = 0
ficha = {}`,
    solution: SOL4,
    tests: `${REF}
from sklearn.dummy import DummyRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error

def test_evaluacion_final():
    "Una evaluación en prueba, coherente con la validación"
    _, X_te, _, y_te = _ref()
    m = t.get("mejor_modelo")
    assert np.allclose(t.get("pred_te"), m.predict(X_te))
    assert approx(t.get("mae_prueba"), mean_absolute_error(y_te, m.predict(X_te)))
    assert abs(t.get("mae_prueba") - t.get("resultados")["boosting"]) < 5, "Prueba y validación cruzada deberían parecerse"
    X_tr, _, y_tr, _ = _ref()
    assert approx(t.get("mae_base_prueba"), mean_absolute_error(y_te, DummyRegressor(strategy="median").fit(X_tr, y_tr).predict(X_te)))

def test_importancias():
    "Importancia por permutación en prueba"
    _, X_te, _, y_te = _ref()
    ref = permutation_importance(t.get("mejor_modelo"), X_te, y_te, n_repeats=5, random_state=0, scoring="neg_mean_absolute_error")
    imp = t.get("importancias")
    assert np.allclose(imp.reindex(X_te.columns).to_numpy(), ref.importances_mean)
    assert list(imp.values) == sorted(imp.values, reverse=True) and imp.index[0] == "superficie_m2"

def test_errores():
    "Error por barrio y relativo"
    _, X_te, _, y_te = _ref()
    pred = t.get("mejor_modelo").predict(X_te)
    ref = pd.Series(np.abs(pred - y_te.to_numpy()), index=X_te.index).groupby(X_te.barrio).mean()
    e = t.get("errores_por_barrio")
    assert np.allclose(e.reindex(ref.index), ref) and list(e.values) == sorted(e.values, reverse=True)
    assert approx(t.get("error_relativo_mediano"), np.median(np.abs(pred - y_te) / y_te))

def test_ficha():
    "Ficha del modelo con cifras calculadas"
    f = t.get("ficha", dict)
    assert f["hiperparametros"] == t.get("busqueda").best_params_
    assert approx(f["mae_prueba"], t.get("mae_prueba")) and approx(f["mae_cv"], t.get("resultados")["boosting"])
    assert approx(f["mejora_sobre_base"], 100 * (1 - t.get("mae_prueba") / t.get("mae_base_prueba")))
    assert f["variables_clave"] == list(t.get("importancias").index[:3])
    assert f["barrio_mas_dificil"] == t.get("errores_por_barrio").index[0]
    assert len(f["limitaciones"]) >= 3 and all(isinstance(x, str) and len(x) > 15 for x in f["limitaciones"])
`,
    hints: [
      "El DummyRegressor de la base se entrena con el **entrenamiento** y se evalúa en prueba, como el modelo.",
      "`permutation_importance` devuelve un objeto con `importances_mean`; crea la Serie con `index=X_te.columns` y ordénala.",
      "Error por barrio: Serie de errores absolutos con el índice de `X_te`, `groupby(X_te[\"barrio\"]).mean()` y ordenar.",
    ],
    errors: [
      { error: "Volver a ajustar el modelo después de ver el resultado en prueba", fix: "Entonces la prueba deja de ser una evaluación independiente. Si cambias algo, necesitas datos nuevos para evaluarlo." },
      { error: "Leer la importancia como causalidad", fix: "Si dos variables están correlacionadas (barrio y distancia), la importancia se reparte o se concentra en una de forma arbitraria." },
    ],
    quiz: {
      question: "La distancia al centro tiene mucha importancia por permutación. ¿Qué puedes decir?",
      options: [
        { text: "Que el modelo se apoya en ella para predecir; no que acercar una vivienda al centro aumente su precio en esa cantidad" },
        { text: "Que alejarse del centro causa la bajada de precio que indica el modelo", misconception: "correlacion-causalidad" },
        { text: "Que su coeficiente es significativo con p < 0,05", misconception: "prediccion-vs-significacion" },
        { text: "Que el resto de variables no importan" },
      ],
      answer: 0,
      explanation: "La importancia por permutación mide dependencia del modelo, no efectos causales. La distancia está muy ligada al barrio: parte de su importancia es la del barrio. Para efectos causales harían falta un diseño y supuestos que este proyecto no tiene.",
    },
    project: SPEC,
    review: "Repasa: una sola evaluación en prueba; importancia por permutación ≠ causalidad; error por grupos; ficha con limitaciones.",
    xp: 160,
    coins: 25,
  },
];
