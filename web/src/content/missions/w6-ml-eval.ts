import { viviendasCsv } from "../datasets";
import { py, type Mission } from "../types";

// Mundo 6 · evaluar y mejorar modelos: curva ROC y umbral por costes, calibración de
// probabilidades, curvas de validación y de aprendizaje, e ingeniería de variables.
// Cada cálculo hecho a mano se compara en las pruebas con su equivalente de scikit-learn.

const DATOS_ROC = py`rng = np.random.default_rng(3)
Y = rng.integers(0, 2, 200)
PUNTUACIONES = np.round(1 / (1 + np.exp(-(1.2 * Y - 0.6 + rng.normal(0, 1, 200)))), 3)`;

const DATOS_CALIBRACION = py`X, y = make_classification(n_samples=2000, n_features=8, n_informative=4, n_redundant=3, random_state=0)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.5, random_state=0)
MODELOS = {
    "logistica": LogisticRegression(max_iter=1000).fit(X_tr, y_tr),
    "bayes_ingenuo": GaussianNB().fit(X_tr, y_tr),
}`;

const DATOS_CURVAS = py`rng = np.random.default_rng(7)
X = rng.uniform(0, 6, size=(300, 1))
y = np.sin(X[:, 0]) * 2 + 0.5 * X[:, 0] + rng.normal(0, 0.45, 300)
CV = KFold(n_splits=5, shuffle=True, random_state=0)`;

export const W6_EVAL: Mission[] = [
  {
    id: "ml-roc",
    world: "w6",
    zone: "Evaluación",
    title: "El vigía y sus falsas alarmas: curva ROC y umbral por costes",
    kind: "lesson",
    difficulty: 4,
    skills: ["metricas", "roc", "umbral"],
    requires: ["ml-metricas"],
    story: "El vigía de la torre da la alarma cuando la sospecha supera un umbral. Muy bajo: falsas alarmas cada noche. Muy alto: el enemigo entra sin aviso. La curva ROC muestra todos los umbrales a la vez; los costes deciden cuál usar.",
    objective: "Construir la curva ROC a mano recorriendo los umbrales, calcular el AUC por trapecios y elegir el umbral que minimiza el coste esperado cuando un falso positivo y un falso negativo no cuestan lo mismo.",
    before: ["Matriz de confusión, precisión y recall", "NumPy"],
    packages: ["numpy", "scikit-learn"],
    intuition: [
      "Un clasificador da una **puntuación**; el umbral la convierte en decisión (positivo si puntuación ≥ umbral). Cada umbral produce una matriz de confusión y dos tasas:",
      "",
      "- **TPR** (sensibilidad) = VP / positivos reales.",
      "- **FPR** = FP / negativos reales = 1 − especificidad.",
      "",
      "La **curva ROC** une los puntos (FPR, TPR) de todos los umbrales, desde (0, 0) —umbral tan alto que nadie es positivo— hasta (1, 1). El **AUC** es su área: la probabilidad de que un positivo al azar puntúe más que un negativo al azar. 0,5 es azar; 1, separación perfecta.",
      "",
      "El AUC resume la capacidad de **ordenar**, pero no elige el umbral. Si un falso negativo cuesta 10 veces más que un falso positivo (no detectar una enfermedad frente a repetir una prueba), conviene un umbral más bajo: **coste = c_FP · FP + c_FN · FN**, y se elige el umbral que lo minimiza (en datos de validación, nunca en los de prueba).",
    ],
    formal: ["AUC ≈ Σᵢ (FPRᵢ − FPRᵢ₋₁) · (TPRᵢ + TPRᵢ₋₁) / 2 (regla del trapecio sobre los puntos de la curva)."],
    example: {
      code: py`y = [0, 0, 1, 1, 0, 1]
s = [0.1, 0.4, 0.35, 0.8, 0.2, 0.9]
pred = [int(x >= 0.3) for x in s]
vp = sum(p and t for p, t in zip(pred, y))
fp = sum(p and not t for p, t in zip(pred, y))
print(pred, vp / sum(y), fp / (len(y) - sum(y)))`,
      lines: [
        "Etiquetas reales: tres positivos y tres negativos.",
        "Puntuaciones del modelo.",
        "Con umbral 0,3: positivo si la puntuación es al menos 0,3.",
        "Verdaderos positivos: predichos 1 que eran 1.",
        "Falsos positivos: predichos 1 que eran 0.",
        "[0, 1, 1, 1, 0, 1] 1.0 0.3333333333333333: TPR = 3/3 y FPR = 1/3, un punto de la curva ROC.",
      ],
    },
    challenge: [
      "`Y` (0/1) y `PUNTUACIONES` son las etiquetas y las puntuaciones de un modelo en 200 casos de validación.",
      "",
      "1. `curva_roc(y, puntuaciones)`: devuelve `(fpr, tpr)` como arrays. Empieza en (0, 0) y añade un punto por cada puntuación distinta, de mayor a menor, usando «positivo si puntuación ≥ umbral».",
      "2. `auc_trapecios(fpr, tpr)`: el área bajo la curva con la regla del trapecio.",
      "3. `umbral_optimo(y, puntuaciones, coste_fp, coste_fn)`: entre las puntuaciones distintas, el umbral con menor coste total `coste_fp · FP + coste_fn · FN`. Devuelve `(umbral, coste)`; si hay empate, el umbral más alto.",
    ],
    starter: py`import numpy as np

${DATOS_ROC}


def curva_roc(y, puntuaciones):
    return np.array([0.0]), np.array([0.0])


def auc_trapecios(fpr, tpr):
    return 0.0


def umbral_optimo(y, puntuaciones, coste_fp, coste_fn):
    return None
`,
    solution: py`import numpy as np

${DATOS_ROC}


def curva_roc(y, puntuaciones):
    y, s = np.asarray(y), np.asarray(puntuaciones)
    positivos, negativos = (y == 1).sum(), (y == 0).sum()
    fpr, tpr = [0.0], [0.0]
    for umbral in np.unique(s)[::-1]:
        pred = s >= umbral
        tpr.append((pred & (y == 1)).sum() / positivos)
        fpr.append((pred & (y == 0)).sum() / negativos)
    return np.array(fpr), np.array(tpr)


def auc_trapecios(fpr, tpr):
    return float(sum((fpr[i] - fpr[i - 1]) * (tpr[i] + tpr[i - 1]) / 2 for i in range(1, len(fpr))))


def umbral_optimo(y, puntuaciones, coste_fp, coste_fn):
    y, s = np.asarray(y), np.asarray(puntuaciones)
    mejor = None
    for umbral in np.unique(s)[::-1]:
        pred = s >= umbral
        coste = coste_fp * (pred & (y == 0)).sum() + coste_fn * (~pred & (y == 1)).sum()
        if mejor is None or coste < mejor[1]:
            mejor = (float(umbral), int(coste))
    return mejor


fpr, tpr = curva_roc(Y, PUNTUACIONES)
print(round(auc_trapecios(fpr, tpr), 4))
print(umbral_optimo(Y, PUNTUACIONES, 1, 1), umbral_optimo(Y, PUNTUACIONES, 1, 10))
`,
    tests: py`
import numpy as np
from sklearn.metrics import roc_auc_score, roc_curve


def test_curva():
    "Coincide con sklearn.metrics.roc_curve"
    y, s = t.get("Y"), t.get("PUNTUACIONES")
    fpr, tpr = t.get("curva_roc", "function")(y, s)
    ref_f, ref_t, _ = roc_curve(y, s, drop_intermediate=False)
    assert len(fpr) == len(ref_f), f"La curva debería tener {len(ref_f)} puntos (incluido el (0, 0) inicial), no {len(fpr)}."
    assert np.allclose(fpr, ref_f) and np.allclose(tpr, ref_t), "Los puntos (FPR, TPR) no coinciden con roc_curve."


def test_auc():
    "El área coincide con roc_auc_score"
    y, s = t.get("Y"), t.get("PUNTUACIONES")
    fpr, tpr = t.get("curva_roc")(y, s)
    auc = t.get("auc_trapecios", "function")(fpr, tpr)
    assert approx(auc, roc_auc_score(y, s)), f"AUC {auc}, pero roc_auc_score da {roc_auc_score(y, s)}."
    assert approx(t.get("auc_trapecios")(np.array([0.0, 0.0, 1.0]), np.array([0.0, 1.0, 1.0])), 1.0), "Una curva que sube hasta (0, 1) tiene área 1."


def _fuerza_bruta(y, s, cfp, cfn):
    mejor = None
    for u in sorted(set(s.tolist()), reverse=True):
        fp = sum(1 for a, b in zip(s, y) if a >= u and b == 0)
        fn = sum(1 for a, b in zip(s, y) if a < u and b == 1)
        c = cfp * fp + cfn * fn
        if mejor is None or c < mejor[1]:
            mejor = (u, c)
    return mejor


def test_umbral():
    "Umbral de coste mínimo con costes simétricos y asimétricos"
    y, s = t.get("Y"), t.get("PUNTUACIONES")
    f = t.get("umbral_optimo", "function")
    for cfp, cfn in [(1, 1), (1, 10), (10, 1), (3, 2)]:
        r = f(y, s, cfp, cfn)
        esperado = _fuerza_bruta(y, s, cfp, cfn)
        assert r is not None and approx(r[0], esperado[0]) and r[1] == esperado[1], f"Con coste_fp={cfp} y coste_fn={cfn} se esperaba {esperado}, pero devolviste {r}."
    assert f(y, s, 1, 10)[0] < f(y, s, 10, 1)[0], "Si los falsos negativos cuestan más, el umbral óptimo debe bajar."
`,
    hints: [
      "Recorre `np.unique(puntuaciones)[::-1]` (de mayor a menor) y calcula TPR y FPR con `pred = s >= umbral`.",
      "Trapecio entre dos puntos consecutivos: base `fpr[i] − fpr[i−1]` por la altura media `(tpr[i] + tpr[i−1]) / 2`.",
      "FN son los positivos reales con `pred` falso: `(~pred & (y == 1)).sum()`. Actualiza el mejor solo si el coste es estrictamente menor para quedarte con el umbral más alto en los empates.",
    ],
    errors: [
      { error: "La curva no empieza en (0, 0)", fix: "Añade el punto inicial: un umbral por encima de todas las puntuaciones no marca a nadie como positivo." },
      { error: "Elegir el umbral con los datos de prueba", fix: "El umbral es un hiperparámetro: elígelo en validación y evalúa una sola vez en prueba." },
      { error: "Usar siempre 0,5 como umbral", fix: "0,5 solo es razonable con costes iguales y probabilidades bien calibradas. Con costes distintos, minimiza el coste esperado." },
    ],
    quiz: {
      question: "Dos modelos tienen el mismo AUC. ¿Significa que darán los mismos errores con tu umbral?",
      options: [
        { text: "No: el AUC resume todos los umbrales; en el umbral concreto pueden tener tasas de error muy distintas" },
        { text: "Sí: el AUC determina la matriz de confusión" },
        { text: "Sí, si los dos usan 0,5", misconception: "accuracy-desbalance" },
      ],
      answer: 0,
      explanation: "Las curvas pueden cruzarse: uno puede ser mejor con umbrales bajos y el otro con altos. Compara en la zona de umbrales que vas a usar.",
    },
    lab: { lab: "estadistica", tab: "roc", label: "Mover el umbral y ver la curva ROC" },
    review: "Dibuja de memoria una curva ROC, explica qué es un punto y cómo elegirías el umbral con costes 1 y 10.",
    xp: 95,
    coins: 13,
  },
  {
    id: "ml-calibracion",
    world: "w6",
    zone: "Evaluación",
    title: "Las promesas del oráculo: probabilidades calibradas",
    kind: "lesson",
    difficulty: 4,
    skills: ["metricas", "calibracion", "probabilidad"],
    requires: ["ml-roc"],
    story: "Un oráculo dice «70 % de lluvia». Si de todos los días en que lo dijo llovió en 7 de cada 10, sus promesas son fiables. Muchos modelos ordenan bien los casos pero prometen probabilidades exageradas.",
    objective: "Medir la calibración de un clasificador con la puntuación de Brier y la tabla de fiabilidad (probabilidad media predicha frente a frecuencia observada por intervalos), y distinguir calibración de capacidad de ordenar (AUC).",
    before: ["Curva ROC y AUC", "Probabilidad"],
    packages: ["numpy", "scikit-learn"],
    intuition: [
      "Un modelo está **calibrado** si, entre los casos a los que da probabilidad p, la proporción de positivos es aproximadamente p. Importa cuando la probabilidad se usa como tal: calcular costes esperados, priorizar recursos o comunicar riesgos.",
      "",
      "- **Puntuación de Brier**: media de (p − y)². 0 es perfecto; predecir siempre 0,5 da 0,25.",
      "- **Tabla de fiabilidad**: se agrupan las predicciones en intervalos (0–0,1, 0,1–0,2…) y en cada uno se compara la probabilidad media predicha con la frecuencia observada. Un modelo calibrado queda cerca de la diagonal.",
      "",
      "**Ordenar no es calibrar**: el AUC solo mira el orden de las puntuaciones. Cualquier transformación creciente de las probabilidades deja el AUC igual y puede estropear (o arreglar) la calibración. El clasificador bayesiano ingenuo suele ordenar bien pero empujar las probabilidades hacia 0 y 1. Si hace falta, se recalibra con `CalibratedClassifierCV` usando datos que el modelo no vio al entrenar.",
    ],
    example: {
      code: py`y = [1, 0, 1]
p = [0.9, 0.2, 0.6]
brier = sum((pi - yi) ** 2 for pi, yi in zip(p, y)) / len(y)
print(round(brier, 4))`,
      lines: ["Tres casos reales.", "Probabilidades predichas de ser positivo.", "Media de los errores al cuadrado: (0,01 + 0,04 + 0,16) / 3.", "0.07"],
    },
    challenge: [
      "`MODELOS` tiene dos clasificadores ya entrenados (`\"logistica\"` y `\"bayes_ingenuo\"`); `X_te`, `y_te` son datos de prueba.",
      "",
      "1. `brier(y, p)`: la puntuación de Brier.",
      "2. `tabla_fiabilidad(y, p, bins=10)`: lista de tuplas `(prob_media, frecuencia, n)` para cada intervalo **no vacío** de los `bins` intervalos iguales de [0, 1], en orden. Un valor justo en un borde interior va al intervalo de la izquierda (`np.searchsorted(bordes[1:-1], p)` da el intervalo de cada valor).",
      "3. `mejor_calibrado(modelos, X, y)`: el nombre del modelo con menor Brier en esos datos.",
    ],
    starter: py`import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB

${DATOS_CALIBRACION}


def brier(y, p):
    return 0.0


def tabla_fiabilidad(y, p, bins=10):
    return []


def mejor_calibrado(modelos, X, y):
    return None
`,
    solution: py`import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB

${DATOS_CALIBRACION}


def brier(y, p):
    y, p = np.asarray(y, dtype=float), np.asarray(p, dtype=float)
    return float(np.mean((p - y) ** 2))


def tabla_fiabilidad(y, p, bins=10):
    y, p = np.asarray(y), np.asarray(p)
    bordes = np.linspace(0, 1, bins + 1)
    grupo = np.searchsorted(bordes[1:-1], p)
    filas = []
    for g in range(bins):
        dentro = grupo == g
        if dentro.any():
            filas.append((float(p[dentro].mean()), float(y[dentro].mean()), int(dentro.sum())))
    return filas


def mejor_calibrado(modelos, X, y):
    return min(modelos, key=lambda nombre: brier(y, modelos[nombre].predict_proba(X)[:, 1]))


for nombre, modelo in MODELOS.items():
    p = modelo.predict_proba(X_te)[:, 1]
    print(nombre, "Brier", round(brier(y_te, p), 3), "AUC", round(roc_auc_score(y_te, p), 3))
print("Mejor calibrado:", mejor_calibrado(MODELOS, X_te, y_te))
`,
    tests: py`
import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import brier_score_loss


def _p(nombre):
    return t.get("MODELOS")[nombre].predict_proba(t.get("X_te"))[:, 1]


def test_brier():
    "Coincide con brier_score_loss"
    f = t.get("brier", "function")
    y = t.get("y_te")
    for nombre in ("logistica", "bayes_ingenuo"):
        p = _p(nombre)
        assert approx(f(y, p), brier_score_loss(y, p)), f"Brier de {nombre}: {f(y, p)} frente a {brier_score_loss(y, p)}."
    assert approx(f([1, 0], [0.5, 0.5]), 0.25)


def test_tabla():
    "Coincide con calibration_curve"
    f = t.get("tabla_fiabilidad", "function")
    y = t.get("y_te")
    for nombre in ("logistica", "bayes_ingenuo"):
        p = _p(nombre)
        tabla = f(y, p)
        frec, media = calibration_curve(y, p, n_bins=10)
        assert len(tabla) == len(media), f"{nombre}: {len(tabla)} intervalos, pero hay {len(media)} no vacíos."
        assert np.allclose([x[0] for x in tabla], media) and np.allclose([x[1] for x in tabla], frec), f"{nombre}: la tabla no coincide con calibration_curve."
        assert sum(x[2] for x in tabla) == len(y), "Cada caso debe caer en un intervalo."


def test_bordes():
    "Los valores en un borde van al intervalo de la izquierda"
    tabla = t.get("tabla_fiabilidad")(np.array([0, 1, 0, 1]), np.array([0.1, 0.2, 0.15, 0.95]), 10)
    assert [(round(a, 3), b, n) for a, b, n in tabla] == [(0.1, 0.0, 1), (0.175, 0.5, 2), (0.95, 1.0, 1)], f"Obtuviste {tabla}."


def test_mejor():
    "Elige el modelo mejor calibrado"
    f = t.get("mejor_calibrado", "function")
    assert f(t.get("MODELOS"), t.get("X_te"), t.get("y_te")) == "logistica"
`,
    hints: [
      "Brier: `np.mean((p - y) ** 2)` con `y` y `p` como arrays de float.",
      "`bordes = np.linspace(0, 1, bins + 1)` y `grupo = np.searchsorted(bordes[1:-1], p)`; después, para cada grupo no vacío, la media de `p` y la de `y`.",
      "`min(modelos, key=...)` recorre los nombres y devuelve el que minimiza la clave.",
    ],
    errors: [
      { error: "Concluir que el modelo con más AUC da mejores probabilidades", fix: "El AUC mide el orden; la calibración se mide con Brier y la tabla de fiabilidad. Aquí el bayesiano ingenuo tiene más AUC y peor calibración." },
      { error: "Recalibrar con los mismos datos de entrenamiento", fix: "El modelo ya se ajustó a ellos; recalibra con validación cruzada o con un conjunto aparte." },
    ],
    quiz: {
      question: "El bayesiano ingenuo tiene aquí más AUC que la regresión logística, pero peor Brier. ¿Qué uso le darías?",
      options: [
        { text: "Para ordenar casos sirve; para usar sus probabilidades como riesgos, habría que recalibrarlo" },
        { text: "Es mejor en todo porque su AUC es mayor" },
        { text: "Es inservible porque su Brier es peor" },
      ],
      answer: 0,
      explanation: "Ordenar y calibrar son propiedades distintas. Una recalibración monótona conserva el AUC y puede mejorar mucho el Brier.",
    },
    review: "Explica qué es un modelo calibrado, cómo se lee una tabla de fiabilidad y por qué el AUC no lo mide.",
    xp: 95,
    coins: 13,
  },
  {
    id: "ml-curvas",
    world: "w6",
    zone: "Evaluación",
    title: "El mapa del sesgo y la varianza: curvas de validación y de aprendizaje",
    kind: "lesson",
    difficulty: 4,
    skills: ["validacion", "sobreajuste", "diagnostico"],
    requires: ["ml-validacion"],
    story: "Antes de pedir más datos o un modelo más complejo, el alquimista dibuja dos mapas: cómo cambia el rendimiento con la complejidad y cómo cambia con la cantidad de datos. Juntos dicen qué remedio sirve.",
    objective: "Calcular una curva de validación (rendimiento frente a un hiperparámetro) y una curva de aprendizaje (rendimiento frente al tamaño de entrenamiento) con validación cruzada, elegir la complejidad y diagnosticar sesgo alto o varianza alta.",
    before: ["Validación cruzada", "Árboles de decisión"],
    packages: ["numpy", "pandas", "scikit-learn"],
    intuition: [
      "**Curva de validación**: para cada valor de un hiperparámetro (la profundidad de un árbol), el rendimiento medio en entrenamiento y en validación cruzada.",
      "",
      "- Poca complejidad: los dos son bajos y parecidos → **sesgo alto** (el modelo no capta el patrón).",
      "- Mucha complejidad: entrenamiento casi perfecto y validación peor → **varianza alta** (memoriza el ruido).",
      "- El mejor valor es el que maximiza la validación.",
      "",
      "**Curva de aprendizaje**: con una complejidad fija, el rendimiento según cuántos datos de entrenamiento se usan. Si la validación sigue subiendo al final, más datos ayudarán; si las dos curvas ya se juntaron en un valor bajo, más datos no arreglan un modelo demasiado simple.",
      "",
      "En scikit-learn: `validation_curve` y `learning_curve`, con el mismo esquema de validación cruzada para comparar.",
    ],
    example: {
      code: py`import numpy as np
from sklearn.model_selection import validation_curve
from sklearn.tree import DecisionTreeRegressor
X = np.arange(40).reshape(-1, 1)
y = (X[:, 0] % 7) * 1.0
tr, va = validation_curve(DecisionTreeRegressor(random_state=0), X, y, param_name="max_depth", param_range=[1, 8], cv=4)
print(tr.shape, tr.mean(axis=1).round(2))`,
      lines: [
        "NumPy.",
        "La función que calcula la curva de validación.",
        "Un árbol de regresión.",
        "40 puntos con una sola variable.",
        "Un patrón que se repite cada 7 valores.",
        "Rendimiento (R²) de árboles de profundidad 1 y 8 con validación cruzada de 4 partes.",
        "(2, 4) [0.1  0.91]: una fila por profundidad y una columna por parte; el R² medio de entrenamiento sube de 0,1 con profundidad 1 a 0,91 con profundidad 8.",
      ],
    },
    challenge: [
      "`X`, `y` son 300 puntos con una relación no lineal y ruido; `CV` es una validación cruzada de 5 partes con barajado. Usa `DecisionTreeRegressor(random_state=0)` y la métrica R².",
      "",
      "1. `curva_validacion(X, y, profundidades)`: DataFrame con las columnas `profundidad`, `entrenamiento` y `validacion` (R² medio de las 5 partes) para cada `max_depth` de la lista.",
      "2. `mejor_profundidad(tabla)`: la profundidad con mayor R² de validación (si hay empate, la menor).",
      "3. `curva_aprendizaje(X, y, profundidad, tamanos)`: DataFrame con las columnas `tamano`, `entrenamiento` y `validacion` para esos tamaños de entrenamiento, con un árbol de esa profundidad.",
    ],
    starter: py`import numpy as np
import pandas as pd
from sklearn.model_selection import KFold, learning_curve, validation_curve
from sklearn.tree import DecisionTreeRegressor

${DATOS_CURVAS}


def curva_validacion(X, y, profundidades):
    return pd.DataFrame()


def mejor_profundidad(tabla):
    return None


def curva_aprendizaje(X, y, profundidad, tamanos):
    return pd.DataFrame()
`,
    solution: py`import numpy as np
import pandas as pd
from sklearn.model_selection import KFold, learning_curve, validation_curve
from sklearn.tree import DecisionTreeRegressor

${DATOS_CURVAS}


def curva_validacion(X, y, profundidades):
    tr, va = validation_curve(
        DecisionTreeRegressor(random_state=0), X, y,
        param_name="max_depth", param_range=profundidades, cv=CV, scoring="r2",
    )
    return pd.DataFrame({"profundidad": profundidades, "entrenamiento": tr.mean(axis=1), "validacion": va.mean(axis=1)})


def mejor_profundidad(tabla):
    orden = tabla.sort_values(["validacion", "profundidad"], ascending=[False, True])
    return int(orden.iloc[0]["profundidad"])


def curva_aprendizaje(X, y, profundidad, tamanos):
    n, tr, va = learning_curve(
        DecisionTreeRegressor(max_depth=profundidad, random_state=0), X, y,
        train_sizes=tamanos, cv=CV, scoring="r2",
    )
    return pd.DataFrame({"tamano": n, "entrenamiento": tr.mean(axis=1), "validacion": va.mean(axis=1)})


tabla = curva_validacion(X, y, [1, 2, 3, 4, 6, 8, 12, 20])
print(tabla.round(3))
print("Mejor profundidad:", mejor_profundidad(tabla))
print(curva_aprendizaje(X, y, 4, [20, 50, 100, 160, 240]).round(3))
`,
    tests: py`
import numpy as np
from sklearn.model_selection import cross_validate
from sklearn.tree import DecisionTreeRegressor

PROF = [1, 2, 3, 4, 6, 8, 12, 20]


def test_curva_validacion():
    "Coincide con una validación cruzada hecha aparte"
    X, y, cv = t.get("X"), t.get("y"), t.get("CV")
    tabla = t.get("curva_validacion", "function")(X, y, PROF)
    assert list(tabla.columns) == ["profundidad", "entrenamiento", "validacion"], f"Columnas: {list(tabla.columns)}"
    for d, tr, va in zip(tabla["profundidad"], tabla["entrenamiento"], tabla["validacion"]):
        ref = cross_validate(DecisionTreeRegressor(max_depth=int(d), random_state=0), X, y, cv=cv, scoring="r2", return_train_score=True)
        assert approx(tr, ref["train_score"].mean()) and approx(va, ref["test_score"].mean()), f"Profundidad {d}: ({tr:.4f}, {va:.4f}) frente a ({ref['train_score'].mean():.4f}, {ref['test_score'].mean():.4f})."


def test_diagnostico():
    "Sesgo alto con poca profundidad y varianza alta con mucha"
    tabla = t.get("curva_validacion")(t.get("X"), t.get("y"), PROF).set_index("profundidad")
    assert tabla.loc[1, "entrenamiento"] < 0.5 and tabla.loc[1, "validacion"] < 0.5
    assert tabla.loc[20, "entrenamiento"] > 0.99 and tabla.loc[20, "validacion"] < tabla["validacion"].max() - 0.05


def test_mejor():
    "Elige la profundidad con mejor validación"
    f = t.get("mejor_profundidad", "function")
    assert f(t.get("curva_validacion")(t.get("X"), t.get("y"), PROF)) == 4
    import pandas as pd
    empate = pd.DataFrame({"profundidad": [5, 2, 9], "entrenamiento": [0.9, 0.8, 1.0], "validacion": [0.7, 0.7, 0.6]})
    assert f(empate) == 2, "Con empate en validación, elige la profundidad menor (el modelo más simple)."


def test_aprendizaje():
    "Curva de aprendizaje con los tamaños pedidos"
    tabla = t.get("curva_aprendizaje", "function")(t.get("X"), t.get("y"), 4, [20, 50, 100, 160, 240])
    assert list(tabla.columns) == ["tamano", "entrenamiento", "validacion"], f"Columnas: {list(tabla.columns)}"
    assert [int(x) for x in tabla["tamano"]] == [20, 50, 100, 160, 240]
    assert tabla["validacion"].iloc[-1] > tabla["validacion"].iloc[0] + 0.1, "Con más datos la validación debería mejorar claramente."
`,
    hints: [
      "`validation_curve(modelo, X, y, param_name=\"max_depth\", param_range=profundidades, cv=CV, scoring=\"r2\")` devuelve dos matrices (valores × partes): haz la media por filas con `.mean(axis=1)`.",
      "Para el empate, ordena por validación descendente y profundidad ascendente con `sort_values([...], ascending=[False, True])`.",
      "`learning_curve(modelo, X, y, train_sizes=tamanos, cv=CV, scoring=\"r2\")` devuelve tamaños, entrenamiento y validación.",
    ],
    errors: [
      { error: "Elegir la profundidad con mejor R² de entrenamiento", fix: "El entrenamiento siempre mejora con la complejidad; la decisión se toma con la validación." },
      { error: "Pedir más datos para un modelo con sesgo alto", fix: "Si entrenamiento y validación ya coinciden en un valor bajo, más datos no ayudan: hace falta un modelo más flexible o mejores variables." },
    ],
    quiz: {
      question: "Un modelo tiene R² 0,99 en entrenamiento y 0,63 en validación. ¿Qué probarías primero?",
      options: [
        { text: "Reducir la complejidad (o regularizar) o conseguir más datos: es varianza alta" },
        { text: "Un modelo más complejo, porque 0,63 es bajo", misconception: "sobreajuste" },
        { text: "Nada: el R² de entrenamiento demuestra que funciona", misconception: "sobreajuste" },
      ],
      answer: 0,
      explanation: "La gran diferencia entre entrenamiento y validación es la marca del sobreajuste.",
    },
    lab: { lab: "ml", tab: "polinomios", label: "Ver el sobreajuste al subir la complejidad" },
    review: "Dibuja de memoria las curvas de validación de un modelo con sesgo alto y de uno con varianza alta.",
    xp: 95,
    coins: 13,
  },
  {
    id: "ml-variables",
    world: "w6",
    zone: "Modelos",
    title: "El orfebre de los datos: ingeniería de variables",
    kind: "lesson",
    difficulty: 4,
    skills: ["ingenieria-variables", "regresion", "pipelines"],
    requires: ["ml-pipeline"],
    story: "El tasador de la ciudad tiene un modelo lineal mediocre. No le hace falta un algoritmo nuevo: le hacen falta variables que expresen lo que sabe del mercado.",
    objective: "Crear variables nuevas a partir de las existentes (transformaciones logarítmicas, cocientes, indicadores de interacción, categorías codificadas) y medir con validación cruzada cuánto mejoran un modelo, sin usar el objetivo para construirlas.",
    before: ["Pipelines y ColumnTransformer", "Validación cruzada", "Logaritmos"],
    packages: ["numpy", "pandas", "scikit-learn"],
    intuition: [
      "Un modelo lineal solo suma efectos. Las variables le permiten expresar más:",
      "",
      "- **Transformaciones**: si el precio crece de forma proporcional a la superficie, modelar `log(precio)` con `log(superficie)` convierte esa relación en una recta.",
      "- **Cocientes**: metros por habitación distinguen un piso amplio de uno con muchas habitaciones pequeñas.",
      "- **Interacciones**: «planta alta **y** sin ascensor» es peor que la suma de sus partes; un indicador lo recoge.",
      "- **Categorías**: el barrio, codificado con one-hot.",
      "",
      "Dos reglas: las variables **nunca** se calculan con el objetivo (eso es fuga de datos) y su efecto se mide con **validación cruzada**, con el preprocesamiento dentro del pipeline.",
    ],
    example: {
      code: py`import numpy as np
superficie = np.array([50, 100, 200])
precio = 3 * superficie ** 0.9
print(np.diff(precio).round(1), np.diff(np.log(precio)).round(3))`,
      lines: [
        "NumPy.",
        "Tres superficies, cada una el doble que la anterior.",
        "Un precio proporcional a la superficie elevada a 0,9.",
        "[ 87.9 163.9] [0.624 0.624]: en precio los saltos crecen; en logaritmos son iguales, una recta frente a log(superficie).",
      ],
    },
    challenge: [
      "`viviendas.csv` tiene `barrio`, `superficie_m2`, `habitaciones`, `banos`, `antiguedad` (con huecos), `planta`, `ascensor`, `distancia_centro_km` y `precio_miles`. El objetivo es `log(precio_miles)`.",
      "",
      "1. `nuevas_variables(df)`: devuelve una copia con tres columnas más: `log_superficie` (logaritmo natural de la superficie), `m2_por_habitacion` y `alto_sin_ascensor` (1 si la planta es 3 o más y no hay ascensor; 0 si no). No modifiques `df`.",
      "2. `r2_modelo(df, numericas, categoricas)`: R² medio con `cross_val_score` y `CV` de un pipeline `ColumnTransformer` (`SimpleImputer(strategy=\"median\")` para las numéricas y, si hay categóricas, `OneHotEncoder(handle_unknown=\"ignore\")`) seguido de `LinearRegression`, prediciendo `np.log(df[\"precio_miles\"])`.",
      "3. `comparar(df)`: diccionario con el R² de tres modelos: `\"base\"` (las numéricas de `BASE`), `\"con_barrio\"` (BASE y barrio) y `\"con_variables\"` (BASE, las tres variables nuevas y barrio).",
    ],
    starter: py`import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder

DF = pd.read_csv("viviendas.csv")
BASE = ["superficie_m2", "habitaciones", "banos", "antiguedad", "planta", "ascensor", "distancia_centro_km"]
CV = KFold(n_splits=5, shuffle=True, random_state=0)


def nuevas_variables(df):
    return df


def r2_modelo(df, numericas, categoricas):
    return 0.0


def comparar(df):
    return {}
`,
    solution: py`import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder

DF = pd.read_csv("viviendas.csv")
BASE = ["superficie_m2", "habitaciones", "banos", "antiguedad", "planta", "ascensor", "distancia_centro_km"]
CV = KFold(n_splits=5, shuffle=True, random_state=0)


def nuevas_variables(df):
    df = df.copy()
    df["log_superficie"] = np.log(df["superficie_m2"])
    df["m2_por_habitacion"] = df["superficie_m2"] / df["habitaciones"]
    df["alto_sin_ascensor"] = ((df["planta"] >= 3) & (df["ascensor"] == 0)).astype(int)
    return df


def r2_modelo(df, numericas, categoricas):
    partes = [("num", SimpleImputer(strategy="median"), numericas)]
    if categoricas:
        partes.append(("cat", OneHotEncoder(handle_unknown="ignore"), categoricas))
    modelo = make_pipeline(ColumnTransformer(partes), LinearRegression())
    return float(cross_val_score(modelo, df, np.log(df["precio_miles"]), cv=CV, scoring="r2").mean())


def comparar(df):
    nuevo = nuevas_variables(df)
    return {
        "base": r2_modelo(df, BASE, []),
        "con_barrio": r2_modelo(df, BASE, ["barrio"]),
        "con_variables": r2_modelo(nuevo, BASE + ["log_superficie", "m2_por_habitacion", "alto_sin_ascensor"], ["barrio"]),
    }


print({k: round(v, 3) for k, v in comparar(DF).items()})
`,
    tests: py`
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder

NUEVAS = ["log_superficie", "m2_por_habitacion", "alto_sin_ascensor"]


def test_variables():
    "Las tres variables nuevas, sin tocar el original"
    df = t.get("DF")
    columnas = list(df.columns)
    nuevo = t.get("nuevas_variables", "function")(df)
    assert list(df.columns) == columnas, "nuevas_variables no debe modificar el DataFrame original: trabaja sobre una copia."
    for c in NUEVAS:
        assert c in nuevo.columns, f"Falta la columna {c}."
    assert np.allclose(nuevo["log_superficie"], np.log(df["superficie_m2"]))
    assert np.allclose(nuevo["m2_por_habitacion"], df["superficie_m2"] / df["habitaciones"])
    esperado = ((df["planta"] >= 3) & (df["ascensor"] == 0)).astype(int)
    assert (nuevo["alto_sin_ascensor"].astype(int) == esperado).all(), "alto_sin_ascensor: 1 si planta >= 3 y ascensor == 0."


def test_sin_fuga():
    "Las variables no usan el precio"
    df = t.get("DF").copy()
    a = t.get("nuevas_variables")(df)[NUEVAS]
    df["precio_miles"] = 1.0
    b = t.get("nuevas_variables")(df)[NUEVAS]
    assert np.allclose(a.values.astype(float), b.values.astype(float)), "Las variables cambian si cambia el precio: eso es fuga de datos."


def _ref(df, num, cat):
    partes = [("num", SimpleImputer(strategy="median"), num)] + ([("cat", OneHotEncoder(handle_unknown="ignore"), cat)] if cat else [])
    return cross_val_score(make_pipeline(ColumnTransformer(partes), LinearRegression()), df, np.log(df["precio_miles"]), cv=t.get("CV"), scoring="r2").mean()


def test_r2_modelo():
    "R² con validación cruzada"
    df = t.get("DF")
    f = t.get("r2_modelo", "function")
    assert approx(f(df, t.get("BASE"), []), _ref(df, t.get("BASE"), [])), "El R² base no coincide con un pipeline de referencia."
    assert approx(f(df, ["superficie_m2"], ["barrio"]), _ref(df, ["superficie_m2"], ["barrio"]))


def test_comparar():
    "Las variables mejoran el modelo"
    r = t.get("comparar", "function")(t.get("DF"))
    assert set(r) == {"base", "con_barrio", "con_variables"}, f"Claves: {set(r)}"
    assert r["base"] < r["con_barrio"] < r["con_variables"], f"Se esperaba una mejora en cada paso: {r}"
    assert r["con_variables"] - r["base"] > 0.2, f"Las variables nuevas deberían mejorar el R² en más de 0,2: {r}"
`,
    files: { "viviendas.csv": viviendasCsv() },
    hints: [
      "Empieza con `df = df.copy()` y añade columnas con operaciones vectorizadas: `np.log(df[\"superficie_m2\"])`.",
      "El indicador: `((df[\"planta\"] >= 3) & (df[\"ascensor\"] == 0)).astype(int)`.",
      "En `r2_modelo`, construye la lista de transformadores y añade el OneHotEncoder solo si hay categóricas; luego `cross_val_score(modelo, df, np.log(df[\"precio_miles\"]), cv=CV, scoring=\"r2\").mean()`.",
    ],
    errors: [
      { error: "Crear «precio por metro» como variable", fix: "Usa el objetivo: es fuga de datos. En producción no conocerías el precio al predecir." },
      { error: "Imputar la mediana antes de la validación cruzada", fix: "Hazlo dentro del pipeline: así cada parte calcula la mediana solo con su entrenamiento." },
      { error: "SettingWithCopyWarning o el DataFrame original cambia", fix: "Trabaja sobre `df.copy()`." },
    ],
    quiz: {
      question: "Añadir `log_superficie` mejora mucho el R² de un modelo lineal para log(precio). ¿Por qué?",
      options: [
        { text: "Porque si el precio es proporcional a una potencia de la superficie, log(precio) es lineal en log(superficie)" },
        { text: "Porque los logaritmos siempre mejoran cualquier modelo" },
        { text: "Porque así el modelo ve el precio", misconception: "data-leakage" },
      ],
      answer: 0,
      explanation: "La transformación adecuada convierte una relación multiplicativa en una suma, que es lo que un modelo lineal sabe ajustar.",
    },
    review: "Propón tres variables nuevas para un problema que conozcas y explica cómo comprobarías que ayudan sin fuga de datos.",
    xp: 95,
    coins: 13,
  },
];
