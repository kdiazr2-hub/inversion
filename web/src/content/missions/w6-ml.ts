import { clientesCsv, estudiantesCsv } from "../datasets";
import { py, type Mission } from "../types";

// Mundo 6 · El Laboratorio de Machine Learning.

const EST = { "estudiantes.csv": estudiantesCsv() };
const CLI = { "clientes.csv": clientesCsv() };

export const W6: Mission[] = [
  {
    id: "ml-intro",
    world: "w6",
    zone: "Fundamentos",
    title: "El primer autómata: entrenamiento, prueba y línea base",
    kind: "lesson",
    difficulty: 3,
    skills: ["ml", "evaluacion", "linea-base"],
    requires: [],
    story: "El laboratorio construye autómatas que aprenden de ejemplos. El primero debe predecir qué clientes se darán de baja. Antes de presumir de su precisión, el maestro pregunta: «¿y comparado con no hacer nada inteligente?».",
    objective: "Distinguir IA, machine learning y deep learning; separar datos de entrenamiento y prueba; y comparar un modelo con una línea base.",
    before: ["pandas", "Regresión logística (Mundo 4)", "Probabilidad condicional"],
    packages: ["pandas", "scikit-learn"],
    files: CLI,
    intuition: [
      "- **IA**: sistemas que realizan tareas que asociamos a la inteligencia. **Machine learning**: aprender patrones a partir de datos. **Deep learning**: ML con redes neuronales profundas.",
      "- **Aprendizaje supervisado**: hay una variable **objetivo** (y) que predecir a partir de **predictoras** (X). **No supervisado**: buscar estructura sin etiquetas.",
      "",
      "Regla de oro: el modelo se evalúa en datos que **no vio** al entrenar. `train_test_split(X, y, test_size=0.25, stratify=y, random_state=...)` reserva una parte para la prueba final (`stratify` mantiene la proporción de clases).",
      "",
      "Una **línea base** (predecir siempre la clase mayoritaria con `DummyClassifier`) marca el mínimo que un modelo debe superar. Con un 72 % de clientes que no se van, ¡acertar el 72 % no tiene mérito!",
      "",
      "Antes de modelar: examina los datos y decide **cómo vas a evaluar**.",
    ],
    example: {
      code: py`import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyClassifier
df = pd.read_csv("clientes.csv")
print(df["baja"].value_counts(normalize=True).round(3))
X, y = df[["antiguedad_meses", "cuota_mensual"]], df["baja"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)
print(DummyClassifier(strategy="most_frequent").fit(X_tr, y_tr).score(X_te, y_te))`,
      lines: ["pandas.", "División entrenamiento/prueba.", "Modelo de referencia.", "Datos de 1200 clientes ficticios.", "Proporción de bajas (~28 %).", "Predictoras y objetivo.", "75 % para entrenar, 25 % para probar, estratificado.", "La línea base acierta ~72 % sin aprender nada."],
    },
    challenge: [
      "Con `clientes.csv` y las predictoras numéricas `antiguedad_meses`, `cuota_mensual`, `llamadas_soporte`, `fibra`:",
      "1. Divide en `X_tr, X_te, y_tr, y_te` (25 % prueba, estratificado, `random_state=42`).",
      "2. `base`: exactitud en prueba de `DummyClassifier(strategy=\"most_frequent\")`.",
      "3. `modelo`: `LogisticRegression(max_iter=1000)` entrenado solo con entrenamiento; `exact_modelo`: su exactitud en prueba.",
      "4. `mejora`: exact_modelo − base.",
      "5. `fuga_detectada`: True si la exactitud del modelo **en entrenamiento** es mayor que en prueba (es lo habitual: optimismo dentro de muestra).",
    ],
    starter: py`import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

df = pd.read_csv("clientes.csv")
X = df[["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]]
y = df["baja"]
modelo = LogisticRegression(max_iter=1000).fit(X, y)
exact_modelo = modelo.score(X, y)
base = 0
mejora = 0
fuga_detectada = False`,
    solution: py`import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

df = pd.read_csv("clientes.csv")
X = df[["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]]
y = df["baja"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)
base = DummyClassifier(strategy="most_frequent").fit(X_tr, y_tr).score(X_te, y_te)
modelo = LogisticRegression(max_iter=1000).fit(X_tr, y_tr)
exact_modelo = modelo.score(X_te, y_te)
mejora = exact_modelo - base
fuga_detectada = modelo.score(X_tr, y_tr) > exact_modelo
print(round(base, 3), round(exact_modelo, 3), round(mejora, 3))`,
    tests: py`
import numpy as np

def test_division():
    "División estratificada 75/25"
    Xtr, Xte, ytr, yte = (t.get(n) for n in ("X_tr", "X_te", "y_tr", "y_te"))
    assert len(Xte) == 300 and len(Xtr) == 900
    assert abs(ytr.mean() - yte.mean()) < 0.01, "Usa stratify=y"
    assert not set(Xtr.index) & set(Xte.index)

def test_base_modelo():
    "El modelo se evalúa en prueba y supera la línea base"
    yte = t.get("y_te")
    assert approx(t.get("base"), max(yte.mean(), 1 - yte.mean()))
    m = t.get("modelo")
    assert approx(t.get("exact_modelo"), m.score(t.get("X_te"), yte))
    assert t.get("mejora") > 0.03

def test_entrenado_sin_prueba():
    "El modelo no vio los datos de prueba"
    m, Xtr, ytr = t.get("modelo"), t.get("X_tr"), t.get("y_tr")
    from sklearn.linear_model import LogisticRegression
    ref = LogisticRegression(max_iter=1000).fit(Xtr, ytr)
    assert np.allclose(m.coef_, ref.coef_, atol=1e-4), "Entrena solo con X_tr, y_tr"
`,
    hints: [
      "`train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)` devuelve cuatro objetos.",
      "Entrena con `.fit(X_tr, y_tr)` y evalúa con `.score(X_te, y_te)`.",
      "La línea base también se ajusta con los datos de entrenamiento.",
    ],
    errors: [
      { error: "Evaluar en los mismos datos con que se entrenó", fix: "Mide memoria, no generalización. Reserva siempre un conjunto de prueba." },
      { error: "Olvidar stratify con clases desbalanceadas", fix: "La proporción de clases puede variar mucho entre conjuntos por azar." },
    ],
    quiz: {
      question: "Tu modelo de detección de fraude acierta el 98 %. El 98 % de las transacciones son legítimas. ¿Qué concluyes?",
      options: [
        { text: "Nada aún: una línea base que diga «nunca hay fraude» también acierta el 98 %" },
        { text: "Es un modelo excelente", misconception: "accuracy-desbalance" },
        { text: "Detecta el 98 % de los fraudes", misconception: "sens-espec" },
        { text: "Hay que publicar el modelo" },
      ],
      answer: 0,
      explanation: "Con clases desbalanceadas la exactitud engaña. Compara con la línea base y usa métricas como recall, precisión o AUC.",
    },
    review: "Repasa por qué se evalúa fuera de muestra y se compara con una línea base.",
    xp: 80,
    coins: 12,
  },
  {
    id: "ml-regresion",
    world: "w6",
    zone: "Fundamentos",
    title: "El autómata que estima: regresión y métricas de error",
    kind: "lesson",
    difficulty: 3,
    skills: ["ml", "regresion", "metricas"],
    requires: ["ml-intro"],
    story: "El autómata debe estimar la nota final de cada aprendiz. No hay acierto o fallo: hay errores de distinto tamaño. ¿Cómo se mide si estima bien?",
    objective: "Entrenar una regresión lineal con scikit-learn, evaluarla con MAE, MSE, RMSE y R² en prueba y compararla con una línea base, relacionándola con la regresión estadística.",
    before: ["Regresión lineal (Mundo 4)", "Entrenamiento y prueba"],
    packages: ["pandas", "scikit-learn", "numpy"],
    files: EST,
    intuition: [
      "- **MAE**: error absoluto medio, en las unidades de y; robusto a errores grandes ocasionales.",
      "- **MSE**: error cuadrático medio; penaliza mucho los errores grandes. **RMSE** = √MSE, en unidades de y.",
      "- **R²** en prueba: 1 − SSE/SST; puede ser negativo si el modelo es peor que predecir la media.",
      "- Línea base: `DummyRegressor(strategy=\"mean\")` predice la media de entrenamiento.",
      "",
      "La `LinearRegression` de scikit-learn estima los mismos coeficientes que la OLS de statsmodels; la diferencia es el enfoque: statsmodels prioriza la **inferencia** (EE, IC, valores p) y scikit-learn la **predicción** fuera de muestra.",
    ],
    formal: "MAE = (1/n)Σ|yᵢ − ŷᵢ|; RMSE = √((1/n)Σ(yᵢ − ŷᵢ)²); R² = 1 − Σ(yᵢ − ŷᵢ)²/Σ(yᵢ − ȳ)².",
    example: {
      code: py`import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error
y = np.array([3, 5, 7, 9])
pred = np.array([4, 5, 6, 12])
print(mean_absolute_error(y, pred), mean_squared_error(y, pred), round(np.sqrt(mean_squared_error(y, pred)), 3))`,
      lines: ["NumPy.", "Métricas de scikit-learn.", "Valores reales.", "Predicciones: un error grande de 3.", "MAE 1,25; MSE 2,75; RMSE 1,658: el cuadrado castiga el error grande."],
    },
    challenge: [
      "1. Implementa a mano `mae(y, p)`, `rmse(y, p)` y `r2(y, p)`.",
      "2. Con `estudiantes.csv`, predictoras `horas_estudio`, `asistencia`, `nota_previa` y objetivo `nota_final`: divide 80/20 con `random_state=0`.",
      "3. `metricas`: diccionario `{\"base\": {...}, \"lineal\": {...}}` con `mae`, `rmse` y `r2` en prueba para `DummyRegressor` y `LinearRegression`.",
      "4. `coefs`: diccionario variable → coeficiente del modelo lineal.",
    ],
    starter: py`import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

def mae(y, p):
    return 0

def rmse(y, p):
    return 0

def r2(y, p):
    return 0

metricas = {}
coefs = {}`,
    solution: py`import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

def mae(y, p):
    return float(np.mean(np.abs(np.asarray(y) - np.asarray(p))))

def rmse(y, p):
    return float(np.sqrt(np.mean((np.asarray(y) - np.asarray(p)) ** 2)))

def r2(y, p):
    y, p = np.asarray(y, float), np.asarray(p, float)
    return float(1 - ((y - p) ** 2).sum() / ((y - y.mean()) ** 2).sum())

df = pd.read_csv("estudiantes.csv")
cols = ["horas_estudio", "asistencia", "nota_previa"]
X_tr, X_te, y_tr, y_te = train_test_split(df[cols], df["nota_final"], test_size=0.2, random_state=0)
metricas = {}
for nombre, m in (("base", DummyRegressor(strategy="mean")), ("lineal", LinearRegression())):
    p = m.fit(X_tr, y_tr).predict(X_te)
    metricas[nombre] = {"mae": mae(y_te, p), "rmse": rmse(y_te, p), "r2": r2(y_te, p)}
    if nombre == "lineal":
        coefs = dict(zip(cols, m.coef_))
print(metricas, coefs)`,
    tests: py`
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def test_metricas_mano():
    "Métricas a mano"
    y, p = [3, 5, 7, 9], [4, 5, 6, 12]
    assert approx(t.get("mae", "function")(y, p), 1.25) and approx(t.get("rmse", "function")(y, p), np.sqrt(2.75)) and approx(t.get("r2", "function")(y, p), r2_score(y, p))

def test_comparacion():
    "El modelo lineal supera claramente a la base"
    m = t.get("metricas")
    assert m["lineal"]["rmse"] < m["base"]["rmse"] * 0.8 and m["lineal"]["r2"] > 0.4 and abs(m["base"]["r2"]) < 0.05

def test_coefs():
    "Coeficientes positivos e interpretables"
    c = t.get("coefs")
    assert set(c) == {"horas_estudio", "asistencia", "nota_previa"} and all(v > 0 for v in c.values())
`,
    hints: [
      "Usa NumPy: `np.mean(np.abs(y - p))`.",
      "R²: 1 − suma de cuadrados del error / suma de cuadrados respecto a la media de y (de prueba).",
      "Recorre los dos modelos con un bucle y guarda sus métricas.",
    ],
    errors: [
      { error: "Calcular R² con la media de entrenamiento", fix: "La fórmula estándar usa la media de los y evaluados (r2_score). Mantén la convención." },
      { error: "Comparar RMSE de modelos evaluados en conjuntos distintos", fix: "Usa el mismo conjunto de prueba para todos los modelos." },
    ],
    quiz: {
      question: "Un modelo tiene R² = −0,2 en prueba. ¿Qué significa?",
      options: [
        { text: "Predice peor que usar simplemente la media" },
        { text: "Explica el 20 % de la varianza" },
        { text: "Hay un error de cálculo: R² no puede ser negativo" },
        { text: "Es un buen modelo con relación inversa" },
      ],
      answer: 0,
      explanation: "Fuera de muestra, R² es negativo cuando el error del modelo supera al de predecir la media: típico de sobreajuste o de un modelo inadecuado.",
    },
    review: "Repasa MAE, RMSE y R² y la diferencia entre inferencia y predicción.",
    xp: 80,
    coins: 12,
  },
  {
    id: "ml-clasificacion",
    lab: { lab: "estadistica", tab: "roc", label: "Curva ROC" },
    world: "w6",
    zone: "Fundamentos",
    title: "El autómata que decide: clasificación, probabilidades y umbral",
    kind: "lesson",
    difficulty: 3,
    skills: ["ml", "clasificacion", "umbral"],
    requires: ["ml-regresion"],
    story: "El autómata no solo dice «se irá» o «se quedará»: calcula una probabilidad. Elegir a partir de qué probabilidad actuar es una decisión de negocio, no del modelo.",
    objective: "Entrenar un clasificador, obtener probabilidades con `predict_proba`, construir la matriz de confusión y estudiar cómo cambian los errores con el umbral.",
    before: ["Regresión logística", "Sensibilidad y especificidad"],
    packages: ["pandas", "scikit-learn", "numpy"],
    files: CLI,
    intuition: [
      "- `predict` usa el umbral 0,5 por defecto; `predict_proba` devuelve la probabilidad estimada de cada clase.",
      "- **Matriz de confusión**: VN, FP / FN, VP. En scikit-learn `confusion_matrix(y, pred)` ordena las filas como clase real 0, 1.",
      "- Bajar el umbral aumenta la **sensibilidad (recall)** y los falsos positivos; subirlo hace lo contrario.",
      "- El umbral se elige según los **costes**: si perder un cliente cuesta 10 veces más que una llamada de retención innecesaria, compensa un umbral bajo.",
    ],
    example: {
      code: py`import numpy as np
from sklearn.metrics import confusion_matrix
y = np.array([0, 0, 1, 1, 0, 1])
p = np.array([0.2, 0.6, 0.55, 0.9, 0.1, 0.3])
for u in (0.5, 0.25):
    print(u, confusion_matrix(y, (p >= u).astype(int)).ravel())`,
      lines: ["NumPy.", "Matriz de confusión.", "Clases reales.", "Probabilidades estimadas.", "Para dos umbrales…", "…VN, FP, FN, VP: con 0,25 se detectan todos los positivos a costa de más falsos positivos."],
    },
    challenge: [
      "Con `clientes.csv`, predictoras numéricas `antiguedad_meses`, `cuota_mensual`, `llamadas_soporte`, `fibra`, división 75/25 estratificada con `random_state=1`, y `LogisticRegression(max_iter=1000)`:",
      "1. `probs`: probabilidad de baja en prueba.",
      "2. `matriz(y, probs, umbral)`: diccionario `{\"vn\", \"fp\", \"fn\", \"vp\"}`.",
      "3. `coste(y, probs, umbral, coste_fp, coste_fn)`: coste total de los errores.",
      "4. `mejor_umbral`: el umbral de `np.arange(0.05, 0.96, 0.05)` (redondeado a 2) con menor coste si un FN cuesta 10 y un FP cuesta 1.",
    ],
    starter: py`import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

probs = None

def matriz(y, probs, umbral):
    return {}

def coste(y, probs, umbral, coste_fp, coste_fn):
    return 0

mejor_umbral = 0.5`,
    solution: py`import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

df = pd.read_csv("clientes.csv")
X = df[["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]]
y = df["baja"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=1)
modelo = LogisticRegression(max_iter=1000).fit(X_tr, y_tr)
probs = modelo.predict_proba(X_te)[:, 1]

def matriz(y, probs, umbral):
    y, pred = np.asarray(y), (np.asarray(probs) >= umbral).astype(int)
    return {"vn": int(((y == 0) & (pred == 0)).sum()), "fp": int(((y == 0) & (pred == 1)).sum()),
            "fn": int(((y == 1) & (pred == 0)).sum()), "vp": int(((y == 1) & (pred == 1)).sum())}

def coste(y, probs, umbral, coste_fp, coste_fn):
    m = matriz(y, probs, umbral)
    return m["fp"] * coste_fp + m["fn"] * coste_fn

umbrales = np.round(np.arange(0.05, 0.96, 0.05), 2)
mejor_umbral = float(min(umbrales, key=lambda u: coste(y_te, probs, u, 1, 10)))
print(matriz(y_te, probs, 0.5), mejor_umbral)`,
    tests: py`
import numpy as np
from sklearn.metrics import confusion_matrix

def test_matriz():
    "Matriz igual que scikit-learn"
    y, p = [0, 0, 1, 1, 0, 1], [0.2, 0.6, 0.55, 0.9, 0.1, 0.3]
    m = t.get("matriz", "function")(y, p, 0.5)
    vn, fp, fn, vp = confusion_matrix(y, (np.array(p) >= 0.5).astype(int)).ravel()
    assert m == {"vn": vn, "fp": fp, "fn": fn, "vp": vp}

def test_probs():
    "Probabilidades de prueba"
    p = np.asarray(t.get("probs"))
    assert p.shape == (300,) and 0 <= p.min() and p.max() <= 1

def test_coste_umbral():
    "Con FN caro, el umbral óptimo es bajo"
    y = t.get("y_te")
    u = t.get("mejor_umbral")
    c = t.get("coste", "function")
    assert u < 0.5 and c(y, t.get("probs"), u, 1, 10) < c(y, t.get("probs"), 0.5, 1, 10)
`,
    hints: [
      "`modelo.predict_proba(X_te)[:, 1]` da la probabilidad de la clase 1.",
      "Predicción con umbral: `(probs >= umbral).astype(int)`.",
      "Usa `min(umbrales, key=lambda u: coste(...))`.",
    ],
    errors: [
      { error: "Usar siempre el umbral 0,5", fix: "Es arbitrario. Elige el umbral según los costes y la capacidad de actuar (cuántas llamadas puedes hacer)." },
      { error: "Elegir el umbral con el conjunto de prueba y luego informar el rendimiento en ese mismo conjunto", fix: "En un proyecto real, elige el umbral con validación y reserva la prueba para el final." },
    ],
    quiz: {
      question: "¿Qué ocurre al bajar el umbral de decisión de 0,5 a 0,2?",
      options: [
        { text: "Aumenta el recall (se detectan más positivos) y aumentan los falsos positivos" },
        { text: "Mejoran todas las métricas" },
        { text: "Cambian las probabilidades predichas" },
        { text: "Disminuyen los falsos positivos" },
      ],
      answer: 0,
      explanation: "El modelo y sus probabilidades no cambian; cambia la regla de decisión y, con ella, el equilibrio entre tipos de error.",
    },
    review: "Repasa probabilidades, matriz de confusión y elección de umbral por costes.",
    xp: 85,
    coins: 12,
  },
  {
    id: "ml-metricas",
    world: "w6",
    zone: "Evaluación",
    title: "La balanza trucada: precisión, recall, F1 y clases desbalanceadas",
    kind: "lesson",
    difficulty: 4,
    skills: ["ml", "metricas", "desbalance"],
    requires: ["ml-clasificacion"],
    story: "Una balanza trucada siempre marca «legítimo» y acierta el 97 % con las transacciones del reino. Los inspectores necesitan otras medidas para atrapar a los falsificadores.",
    objective: "Calcular precisión, recall, F1 y AUC, mostrar por qué la exactitud engaña con clases desbalanceadas y comparar estrategias (`class_weight`).",
    before: ["Matriz de confusión", "ROC y AUC (Mundo 4)"],
    packages: ["numpy", "scikit-learn"],
    intuition: [
      "- **Precisión** = VP/(VP + FP): de lo que marco como positivo, ¿cuánto lo es?",
      "- **Recall** (sensibilidad) = VP/(VP + FN): de los positivos reales, ¿cuántos encuentro?",
      "- **F1**: media armónica de precisión y recall; útil cuando ambas importan.",
      "- **AUC-ROC**: capacidad de ordenar positivos por encima de negativos, independiente del umbral. Con mucho desbalance, la curva **precisión-recall** (average precision) es más informativa.",
      "",
      "Con 3 % de positivos, predecir siempre negativo da 97 % de exactitud y 0 de recall. `class_weight=\"balanced\"` hace que los errores en la clase minoritaria pesen más al entrenar.",
    ],
    formal: "F1 = 2·P·R/(P + R). La AUC equivale a P(puntuación de un positivo > puntuación de un negativo).",
    example: {
      code: py`import numpy as np
from sklearn.metrics import accuracy_score, recall_score
y = np.array([0] * 97 + [1] * 3)
siempre_cero = np.zeros(100, dtype=int)
print(accuracy_score(y, siempre_cero), recall_score(y, siempre_cero))`,
      lines: ["NumPy.", "Métricas.", "97 legítimas y 3 fraudes.", "Un «modelo» que nunca detecta fraude.", "Exactitud 0,97 y recall 0: inútil."],
    },
    challenge: [
      "El código inicial genera `X, y` con ~4 % de positivos (fraude) y divide en entrenamiento y prueba.",
      "1. `precision_recall_f1(y, pred)`: tupla calculada a mano (0 si el denominador es 0).",
      "2. `resultados`: diccionario con tres entradas, `\"siempre_cero\"`, `\"logistica\"` (`LogisticRegression(max_iter=1000)`) y `\"balanceada\"` (`class_weight=\"balanced\"`), cada una con `exactitud`, `precision`, `recall`, `f1` en prueba y, para los dos modelos, `auc` y `ap` (average precision) con `predict_proba`.",
      "3. `mejor_por_recall`: nombre del modelo con mayor recall.",
    ],
    starter: py`import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import train_test_split

X, y = make_classification(n_samples=4000, n_features=8, n_informative=4, weights=[0.96], flip_y=0.01, class_sep=1.0, random_state=3)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=y, random_state=3)

def precision_recall_f1(y, pred):
    return (0, 0, 0)

resultados = {}
mejor_por_recall = ""`,
    solution: py`import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import train_test_split

X, y = make_classification(n_samples=4000, n_features=8, n_informative=4, weights=[0.96], flip_y=0.01, class_sep=1.0, random_state=3)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=y, random_state=3)

def precision_recall_f1(y, pred):
    y, pred = np.asarray(y), np.asarray(pred)
    vp = int(((y == 1) & (pred == 1)).sum())
    fp = int(((y == 0) & (pred == 1)).sum())
    fn = int(((y == 1) & (pred == 0)).sum())
    p = vp / (vp + fp) if vp + fp else 0.0
    r = vp / (vp + fn) if vp + fn else 0.0
    f1 = 2 * p * r / (p + r) if p + r else 0.0
    return (p, r, f1)

def evaluar(pred, prob=None):
    p, r, f1 = precision_recall_f1(y_te, pred)
    res = {"exactitud": float(np.mean(pred == y_te)), "precision": p, "recall": r, "f1": f1}
    if prob is not None:
        res["auc"] = float(roc_auc_score(y_te, prob))
        res["ap"] = float(average_precision_score(y_te, prob))
    return res

resultados = {"siempre_cero": evaluar(np.zeros_like(y_te))}
for nombre, m in (("logistica", LogisticRegression(max_iter=1000)), ("balanceada", LogisticRegression(max_iter=1000, class_weight="balanced"))):
    m.fit(X_tr, y_tr)
    resultados[nombre] = evaluar(m.predict(X_te), m.predict_proba(X_te)[:, 1])
mejor_por_recall = max(resultados, key=lambda k: resultados[k]["recall"])
for k, v in resultados.items():
    print(k, {m: round(x, 3) for m, x in v.items()})`,
    tests: py`
from sklearn.metrics import f1_score, precision_score, recall_score

def test_mano():
    "Precisión, recall y F1 a mano"
    y, p = [1, 0, 1, 1, 0, 0, 1], [1, 1, 0, 1, 0, 0, 1]
    r = t.get("precision_recall_f1", "function")(y, p)
    assert approx(r[0], precision_score(y, p)) and approx(r[1], recall_score(y, p)) and approx(r[2], f1_score(y, p))
    assert t.get("precision_recall_f1")([0, 0], [0, 0]) == (0, 0, 0)

def test_paradoja():
    "La línea base tiene gran exactitud y recall nulo"
    r = t.get("resultados")
    assert r["siempre_cero"]["exactitud"] > 0.93 and r["siempre_cero"]["recall"] == 0

def test_balanceada():
    "class_weight='balanced' mejora mucho el recall"
    r = t.get("resultados")
    assert r["balanceada"]["recall"] > r["logistica"]["recall"] + 0.2
    assert r["balanceada"]["auc"] > 0.8 and 0 < r["logistica"]["ap"] < 1
    assert t.get("mejor_por_recall") == "balanceada"
`,
    hints: [
      "Cuenta VP, FP y FN con máscaras booleanas y protege las divisiones entre 0.",
      "AUC y AP necesitan probabilidades: `predict_proba(X_te)[:, 1]`.",
      "`max(resultados, key=lambda k: resultados[k][\"recall\"])`.",
    ],
    errors: [
      { error: "Optimizar la exactitud con clases desbalanceadas", fix: "Elige la métrica según el problema: recall si perder positivos es grave, precisión si los falsos positivos son caros." },
      { error: "Sobremuestrear antes de dividir", fix: "Duplicar positivos antes del split filtra copias al conjunto de prueba. Equilibra solo el entrenamiento." },
    ],
    quiz: {
      question: "En un cribado de una enfermedad grave y rara, ¿qué métrica priorizarías inicialmente?",
      options: [
        { text: "El recall (sensibilidad): perder un caso es muy costoso; los positivos se confirman con otra prueba" },
        { text: "La exactitud", misconception: "accuracy-desbalance" },
        { text: "La precisión exclusivamente" },
        { text: "Ninguna: basta con el valor p del modelo", misconception: "prediccion-vs-significacion" },
      ],
      answer: 0,
      explanation: "En cribado se tolera un número mayor de falsos positivos a cambio de no perder casos, siempre que haya una prueba de confirmación.",
    },
    review: "Repasa precisión, recall, F1 y por qué la exactitud engaña con desbalance.",
    xp: 90,
    coins: 13,
  },
  {
    id: "ml-pipeline",
    world: "w6",
    zone: "Evaluación",
    title: "La cadena de montaje: preprocesamiento, pipelines y fuga de datos",
    kind: "lesson",
    difficulty: 4,
    skills: ["ml", "preprocesamiento", "pipelines", "data-leakage"],
    requires: ["ml-metricas"],
    story: "En la cadena de montaje del laboratorio, cada pieza se transforma en orden: escalar, codificar, entrenar. Si una estación espía las piezas del examen final, todo el control de calidad queda invalidado.",
    objective: "Codificar variables categóricas, escalar numéricas con `ColumnTransformer` dentro de un `Pipeline`, e identificar la fuga de datos por preprocesar antes de dividir.",
    before: ["Entrenamiento y prueba", "Variables categóricas"],
    packages: ["pandas", "scikit-learn"],
    files: CLI,
    intuition: [
      "- **OneHotEncoder**: convierte una categoría en columnas 0/1 (`handle_unknown=\"ignore\"` para categorías nuevas).",
      "- **StandardScaler**: resta la media y divide entre la DE. Importa en modelos basados en distancias o con regularización.",
      "- **SimpleImputer**: rellena faltantes (con la mediana, por ejemplo).",
      "- `ColumnTransformer` aplica cada transformación a sus columnas; `Pipeline` encadena preprocesamiento y modelo.",
      "",
      "**Fuga de datos (data leakage)**: usar información del conjunto de prueba al entrenar. Calcular la media para escalar o imputar con **todos** los datos antes de dividir es una fuga sutil. En un `Pipeline`, `fit` solo aprende de los datos de entrenamiento.",
    ],
    example: {
      code: py`import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
df = pd.DataFrame({"contrato": ["mensual", "anual", "mensual"], "cuota": [70, 50, 90]})
ct = ColumnTransformer([("cat", OneHotEncoder(), ["contrato"]), ("num", StandardScaler(), ["cuota"])])
print(ct.fit_transform(df))`,
      lines: ["pandas.", "Transformador por columnas.", "Codificador y escalador.", "Una variable categórica y una numérica.", "One-hot para la categoría, estandarización para la cuota.", "Matriz resultante: columnas anual, mensual y cuota estandarizada."],
    },
    challenge: [
      "Con `clientes.csv` (incluida `contrato` y `gasto_total`, que tiene faltantes):",
      "1. `preprocesador`: `ColumnTransformer` que aplique a `contrato` un `OneHotEncoder(handle_unknown=\"ignore\")` y a las numéricas (`antiguedad_meses`, `cuota_mensual`, `llamadas_soporte`, `fibra`, `gasto_total`) un `Pipeline` de `SimpleImputer(strategy=\"median\")` + `StandardScaler()`.",
      "2. `pipe`: `Pipeline` con el preprocesador y `LogisticRegression(max_iter=1000)`, entrenado con una división 75/25 estratificada (`random_state=7`).",
      "3. `auc_pipe`: AUC en prueba.",
      "4. `media_escalador_sin_fuga`: la media aprendida por el escalador para `cuota_mensual` dentro del pipeline (debe coincidir con la media de **entrenamiento**).",
      "5. `es_fuga(paso)`: devuelve True para los pasos que filtran información: `\"escalar_todo_antes_de_dividir\"`, `\"usar_gasto_futuro\"`, `\"seleccionar_variables_con_todo\"`; False para `\"escalar_en_pipeline\"`, `\"imputar_con_mediana_de_entrenamiento\"`.",
    ],
    starter: py`import pandas as pd
from sklearn.preprocessing import StandardScaler

df = pd.read_csv("clientes.csv")
X = df.drop(columns=["cliente", "baja"])
X_escalado = StandardScaler().fit_transform(X.select_dtypes("number"))
preprocesador = None
pipe = None
auc_pipe = 0
media_escalador_sin_fuga = 0

def es_fuga(paso):
    return False`,
    solution: py`import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

df = pd.read_csv("clientes.csv")
numericas = ["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra", "gasto_total"]
X, y = df[["contrato"] + numericas], df["baja"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=7)

preprocesador = ColumnTransformer([
    ("cat", OneHotEncoder(handle_unknown="ignore"), ["contrato"]),
    ("num", Pipeline([("imputar", SimpleImputer(strategy="median")), ("escalar", StandardScaler())]), numericas),
])
pipe = Pipeline([("prep", preprocesador), ("modelo", LogisticRegression(max_iter=1000))]).fit(X_tr, y_tr)
auc_pipe = roc_auc_score(y_te, pipe.predict_proba(X_te)[:, 1])
escalador = pipe.named_steps["prep"].named_transformers_["num"].named_steps["escalar"]
media_escalador_sin_fuga = float(escalador.mean_[numericas.index("cuota_mensual")])

FUGAS = {"escalar_todo_antes_de_dividir", "usar_gasto_futuro", "seleccionar_variables_con_todo"}

def es_fuga(paso):
    return paso in FUGAS

print(round(auc_pipe, 3), media_escalador_sin_fuga)`,
    tests: py`
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

def test_estructura():
    "Pipeline con ColumnTransformer"
    p = t.get("pipe")
    assert isinstance(p, Pipeline) and isinstance(p.steps[0][1], ColumnTransformer)

def test_auc():
    "Buen rendimiento en prueba"
    assert 0.7 < t.get("auc_pipe") < 1

def test_sin_fuga():
    "El escalador solo aprendió de entrenamiento"
    import pandas as pd
    from sklearn.model_selection import train_test_split
    df = pd.read_csv("clientes.csv")
    X_tr, X_te = train_test_split(df, test_size=0.25, stratify=df["baja"], random_state=7)
    assert approx(t.get("media_escalador_sin_fuga"), X_tr["cuota_mensual"].mean(), 1e-9)
    assert not approx(t.get("media_escalador_sin_fuga"), df["cuota_mensual"].mean(), 1e-9)

def test_fugas():
    "Clasifica fugas de datos"
    f = t.get("es_fuga", "function")
    assert f("escalar_todo_antes_de_dividir") and f("usar_gasto_futuro") and f("seleccionar_variables_con_todo")
    assert not f("escalar_en_pipeline") and not f("imputar_con_mediana_de_entrenamiento")
`,
    hints: [
      "Anida un `Pipeline` (imputar + escalar) dentro del `ColumnTransformer` para las numéricas.",
      "Divide **antes** de ajustar nada; `pipe.fit(X_tr, y_tr)` ajusta todo con entrenamiento.",
      "El escalador está en `pipe.named_steps[\"prep\"].named_transformers_[\"num\"].named_steps[\"escalar\"]`; su `.mean_` guarda las medias.",
    ],
    errors: [
      { error: "ValueError: could not convert string to float: 'mensual'", fix: "Los modelos necesitan números: codifica las categóricas con OneHotEncoder." },
      { error: "Escalar o imputar antes de train_test_split", fix: "Las estadísticas de la prueba se filtran al entrenamiento. Mete todo el preprocesamiento en el Pipeline." },
    ],
    quiz: {
      question: "¿Por qué meter el escalado dentro de un Pipeline en vez de hacerlo antes de dividir?",
      options: [
        { text: "Para que media y DE se calculen solo con los datos de entrenamiento en cada ajuste, evitando fuga de información" },
        { text: "Porque el Pipeline es más rápido" },
        { text: "Porque StandardScaler no funciona fuera de un Pipeline" },
        { text: "No importa en absoluto", misconception: "data-leakage" },
      ],
      answer: 0,
      explanation: "Además, en validación cruzada el Pipeline reajusta el preprocesamiento en cada pliegue, lo que mantiene la evaluación honesta.",
    },
    review: "Repasa ColumnTransformer, Pipeline y los tipos de fuga de datos.",
    xp: 95,
    coins: 14,
  },
  {
    id: "ml-arboles",
    lab: { lab: "ml", tab: "clasificacion", label: "Fronteras de clasificación" },
    world: "w6",
    zone: "Modelos",
    title: "El árbol de las decisiones: árboles, profundidad y sobreajuste",
    kind: "lesson",
    difficulty: 3,
    skills: ["ml", "arboles", "sobreajuste"],
    requires: ["ml-pipeline"],
    story: "El árbol sabio hace preguntas sencillas: «¿contrato mensual? ¿más de 3 llamadas?». Si le dejas hacer infinitas preguntas, aprende de memoria a cada cliente… y falla con los nuevos.",
    objective: "Entrenar árboles de decisión, leer sus reglas, estudiar la curva de complejidad (profundidad frente a error) y reconocer sobreajuste y subajuste.",
    before: ["Clasificación", "Entrenamiento y prueba"],
    packages: ["pandas", "scikit-learn", "numpy"],
    files: CLI,
    intuition: [
      "Un **árbol de decisión** divide los datos con preguntas del tipo «x ≤ umbral» que hacen los grupos lo más puros posible (índice de Gini o entropía).",
      "",
      "- Poco profundo: reglas simples, puede **subajustar** (error alto en entrenamiento y prueba).",
      "- Muy profundo: memoriza ruido, **sobreajusta** (error casi 0 en entrenamiento y alto en prueba).",
      "- Controles: `max_depth`, `min_samples_leaf`, poda (`ccp_alpha`).",
      "",
      "Ventajas: interpretable, no necesita escalado, capta interacciones. Inconveniente: inestable (pequeños cambios en los datos cambian el árbol). Visualízalo en el Laboratorio de ML.",
    ],
    example: {
      code: py`import pandas as pd
from sklearn.tree import DecisionTreeClassifier, export_text
df = pd.read_csv("clientes.csv")
X = pd.get_dummies(df[["contrato", "antiguedad_meses", "llamadas_soporte"]], dtype=int)
arbol = DecisionTreeClassifier(max_depth=2, random_state=0).fit(X, df["baja"])
print(export_text(arbol, feature_names=list(X.columns)))`,
      lines: ["pandas.", "Árbol y exportación de reglas.", "Datos.", "Codificación one-hot rápida con pandas.", "Árbol de profundidad 2.", "Reglas legibles del árbol."],
    },
    challenge: [
      "Con `clientes.csv` (usa `pd.get_dummies` en `contrato` y las numéricas `antiguedad_meses`, `cuota_mensual`, `llamadas_soporte`, `fibra`), división 75/25 estratificada `random_state=0`:",
      "1. `curva`: lista de tuplas `(profundidad, exact_entrenamiento, exact_prueba)` para profundidades 1 a 15 (`random_state=0`).",
      "2. `prof_optima`: profundidad con mayor exactitud en prueba (en empate, la menor). *En un proyecto real se elegiría con validación cruzada, no con la prueba.*",
      "3. `sobreajuste_15`: diferencia entrenamiento − prueba con profundidad 15.",
      "4. `primera_regla`: nombre de la variable usada en la raíz del árbol de profundidad `prof_optima`.",
    ],
    starter: py`import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

curva = []
prof_optima = 1
sobreajuste_15 = 0
primera_regla = ""`,
    solution: py`import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

df = pd.read_csv("clientes.csv")
X = pd.get_dummies(df[["contrato", "antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]], dtype=int)
y = df["baja"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)
curva = []
for prof in range(1, 16):
    a = DecisionTreeClassifier(max_depth=prof, random_state=0).fit(X_tr, y_tr)
    curva.append((prof, a.score(X_tr, y_tr), a.score(X_te, y_te)))
prof_optima = max(curva, key=lambda c: (c[2], -c[0]))[0]
sobreajuste_15 = curva[-1][1] - curva[-1][2]
mejor = DecisionTreeClassifier(max_depth=prof_optima, random_state=0).fit(X_tr, y_tr)
primera_regla = X.columns[mejor.tree_.feature[0]]
for c in curva:
    print(c)`,
    tests: py`
def test_curva():
    "Curva de complejidad"
    c = t.get("curva")
    assert [x[0] for x in c] == list(range(1, 16))
    assert c[-1][1] > 0.97, "Un árbol profundo casi memoriza el entrenamiento"
    assert c[-1][1] >= c[0][1]

def test_optima():
    "Profundidad óptima moderada y sobreajuste visible"
    c = t.get("curva")
    po = t.get("prof_optima")
    assert po == max(c, key=lambda x: (x[2], -x[0]))[0] and po < 10
    assert t.get("sobreajuste_15") > 0.15

def test_raiz():
    "La raíz usa una variable con sentido"
    import pandas as pd
    assert t.get("primera_regla") in ("antiguedad_meses", "contrato_mensual", "llamadas_soporte", "contrato_bianual", "cuota_mensual")
`,
    hints: [
      "Entrena un árbol por profundidad en un bucle y guarda `score` en entrenamiento y prueba.",
      "`max(curva, key=lambda c: (c[2], -c[0]))` elige la mayor exactitud de prueba y, en empate, la menor profundidad.",
      "La variable de la raíz es `X.columns[arbol.tree_.feature[0]]`.",
    ],
    errors: [
      { error: "Elegir la profundidad mirando la prueba y luego informar esa misma exactitud", fix: "Es optimista. Usa validación cruzada para elegir y reserva la prueba para el final." },
      { error: "Interpretar la importancia de un árbol inestable como verdad", fix: "Repite con otras semillas o usa ensambles y permutation importance." },
    ],
    quiz: {
      question: "Un árbol tiene 100 % de exactitud en entrenamiento y 70 % en prueba. ¿Qué ocurre?",
      options: [
        { text: "Sobreajuste: ha memorizado particularidades del entrenamiento" },
        { text: "Subajuste" },
        { text: "Es el modelo ideal" },
        { text: "Hay fuga de datos necesariamente", misconception: "data-leakage" },
      ],
      answer: 0,
      explanation: "Una gran diferencia entre entrenamiento y prueba es la firma del sobreajuste. Limitar la profundidad o usar ensambles ayuda.",
    },
    review: "Repasa la curva de complejidad y las señales de sobreajuste y subajuste.",
    xp: 85,
    coins: 12,
  },
  {
    id: "ml-ensambles",
    world: "w6",
    zone: "Modelos",
    title: "El concilio de los árboles: Random Forest, Gradient Boosting e importancia",
    kind: "lesson",
    difficulty: 4,
    skills: ["ml", "ensambles", "interpretabilidad"],
    requires: ["ml-arboles"],
    story: "Un solo árbol se equivoca con facilidad. Un concilio de cientos, cada uno con una visión parcial, decide mucho mejor. Y algunos concilios aprenden de los errores de los anteriores.",
    objective: "Comparar un árbol, Random Forest y Gradient Boosting, y medir la importancia de las variables con importancia por permutación.",
    before: ["Árboles de decisión", "Pipelines"],
    packages: ["pandas", "scikit-learn", "numpy"],
    files: CLI,
    intuition: [
      "- **Random Forest** (bagging): muchos árboles entrenados con muestras bootstrap y subconjuntos de variables; se promedian sus votos. Reduce la varianza.",
      "- **Gradient Boosting**: árboles pequeños en secuencia, cada uno corrige los errores del anterior. Suele ser muy preciso; requiere ajustar tasa de aprendizaje y número de árboles.",
      "- **Importancia por permutación**: cuánto empeora la métrica en prueba al barajar una variable. Es más fiable que la importancia por impureza (que favorece variables con muchos valores).",
      "",
      "Importancia ≠ causalidad: indica en qué se apoya el modelo para predecir, no qué ocurriría si cambiaras la variable.",
    ],
    example: {
      code: py`from sklearn.datasets import make_classification
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score
X, y = make_classification(n_samples=500, n_features=6, random_state=0)
print(cross_val_score(RandomForestClassifier(n_estimators=100, random_state=0), X, y, cv=5).mean().round(3))`,
      lines: ["Datos sintéticos.", "Bosque aleatorio.", "Validación cruzada.", "500 casos y 6 variables.", "Exactitud media en 5 pliegues."],
    },
    challenge: [
      "Con `clientes.csv` (dummies de `contrato` + numéricas sin `gasto_total` ni `cliente`), división 75/25 estratificada `random_state=0`:",
      "1. `aucs`: diccionario con la AUC en prueba de `DecisionTreeClassifier(max_depth=4)`, `RandomForestClassifier(n_estimators=200, min_samples_leaf=5)` y `GradientBoostingClassifier()` (todos con `random_state=0`), con claves `\"arbol\"`, `\"bosque\"`, `\"boosting\"`.",
      "2. `importancias`: Series con la importancia por permutación (media de la caída de AUC, `n_repeats=10`, `random_state=0`, `scoring=\"roc_auc\"`) del bosque en prueba, ordenada de mayor a menor.",
      "3. `top2`: los dos nombres de variable más importantes.",
    ],
    starter: py`import pandas as pd
from sklearn.model_selection import train_test_split

aucs = {}
importancias = None
top2 = []`,
    solution: py`import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

df = pd.read_csv("clientes.csv")
X = pd.get_dummies(df[["contrato", "antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]], dtype=int)
y = df["baja"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)
modelos = {
    "arbol": DecisionTreeClassifier(max_depth=4, random_state=0),
    "bosque": RandomForestClassifier(n_estimators=200, min_samples_leaf=5, random_state=0),
    "boosting": GradientBoostingClassifier(random_state=0),
}
aucs = {}
for nombre, m in modelos.items():
    m.fit(X_tr, y_tr)
    aucs[nombre] = roc_auc_score(y_te, m.predict_proba(X_te)[:, 1])
pi = permutation_importance(modelos["bosque"], X_te, y_te, n_repeats=10, random_state=0, scoring="roc_auc")
importancias = pd.Series(pi.importances_mean, index=X.columns).sort_values(ascending=False)
top2 = list(importancias.index[:2])
print(aucs)
print(importancias.round(4))`,
    tests: py`
def test_aucs():
    "Los ensambles superan al árbol"
    a = t.get("aucs")
    assert set(a) == {"arbol", "bosque", "boosting"}
    assert a["bosque"] > a["arbol"] and a["boosting"] > a["arbol"] - 0.01 and a["bosque"] > 0.75

def test_importancias():
    "Importancia por permutación"
    imp = t.get("importancias")
    assert imp.is_monotonic_decreasing and len(imp) == 7
    assert set(t.get("top2")) & {"antiguedad_meses", "llamadas_soporte", "contrato_mensual"}
`,
    hints: [
      "Usa un diccionario de modelos y un bucle para entrenar y evaluar.",
      "`permutation_importance(modelo, X_te, y_te, n_repeats=10, random_state=0, scoring=\"roc_auc\")`.",
      "Construye la Series con `index=X.columns` y ordénala.",
    ],
    errors: [
      { error: "Calcular la importancia por permutación en entrenamiento", fix: "En entrenamiento refleja lo que el modelo memorizó. Hazlo en datos de prueba o validación." },
      { error: "Leer la importancia como efecto causal", fix: "Variables correlacionadas se reparten la importancia y no indican qué pasaría si intervienes." },
    ],
    quiz: {
      question: "Dos variables muy correlacionadas tienen importancia por permutación baja cada una. ¿Por qué puede pasar?",
      options: [
        { text: "Al barajar una, el modelo usa la otra, que contiene casi la misma información" },
        { text: "Porque ninguna de las dos es útil" },
        { text: "Por un error del algoritmo" },
        { text: "Porque las variables correlacionadas siempre tienen importancia 0" },
      ],
      answer: 0,
      explanation: "La importancia mide la contribución marginal. Con redundancia, conviene permutar grupos de variables o interpretarlas juntas.",
    },
    review: "Repasa bagging frente a boosting y cómo interpretar la importancia por permutación.",
    xp: 95,
    coins: 14,
  },
  {
    id: "ml-validacion",
    lab: { lab: "ml", tab: "polinomios", label: "Sobreajuste en regresión" },
    world: "w6",
    zone: "Evaluación",
    title: "Los cinco jueces: validación cruzada y ajuste de hiperparámetros",
    kind: "lesson",
    difficulty: 4,
    skills: ["ml", "validacion-cruzada", "hiperparametros"],
    requires: ["ml-ensambles"],
    story: "Un solo juez puede tener un mal día. Cinco jueces, cada uno evaluando con una parte distinta de los datos, dan un veredicto más estable. Y el examen final se reserva para el último momento.",
    objective: "Usar validación cruzada estratificada, buscar hiperparámetros con `GridSearchCV` sobre un pipeline y evaluar una sola vez en el conjunto de prueba.",
    before: ["Pipelines", "Árboles y ensambles"],
    packages: ["pandas", "scikit-learn", "numpy"],
    files: CLI,
    intuition: [
      "**Validación cruzada (k pliegues)**: divide el entrenamiento en k partes; entrena con k − 1 y valida con la restante, k veces. La media estima el rendimiento; la DE, su variabilidad.",
      "",
      "Flujo honesto:",
      "1. Separa la **prueba** al principio y no la toques.",
      "2. Con el entrenamiento, usa **validación cruzada** para comparar modelos e hiperparámetros (`GridSearchCV`).",
      "3. Reentrena el mejor con todo el entrenamiento (GridSearchCV lo hace con `refit=True`).",
      "4. Evalúa **una vez** en la prueba.",
      "",
      "Con series temporales usa `TimeSeriesSplit`; con grupos (varios registros por paciente), `GroupKFold`.",
    ],
    example: {
      code: py`from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
X, y = make_classification(n_samples=300, random_state=1)
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=1)
s = cross_val_score(LogisticRegression(max_iter=1000), X, y, cv=cv, scoring="roc_auc")
print(s.round(3), round(s.mean(), 3), round(s.std(), 3))`,
      lines: ["Datos sintéticos.", "Modelo.", "Herramientas de validación.", "300 casos.", "5 pliegues estratificados y barajados.", "AUC en cada pliegue.", "Cinco valores, su media y su dispersión."],
    },
    challenge: [
      "Con `clientes.csv` (dummies de `contrato` + `antiguedad_meses`, `cuota_mensual`, `llamadas_soporte`, `fibra`), separa un 20 % de prueba estratificado `random_state=0`.",
      "1. `cv_scores`: AUC de validación cruzada (5 pliegues estratificados, `shuffle=True`, `random_state=0`) de un `Pipeline` con `StandardScaler` + `LogisticRegression(max_iter=1000)` sobre el entrenamiento.",
      "2. `busqueda`: `GridSearchCV` sobre un `RandomForestClassifier(random_state=0)` con `n_estimators` en [40] y `min_samples_leaf` en [1, 5, 20], `max_depth` en [None, 6], mismo `cv`, `scoring=\"roc_auc\"`, entrenado solo con entrenamiento.",
      "3. `mejores`: `busqueda.best_params_`; `auc_cv_mejor`: `best_score_`.",
      "4. `auc_prueba`: AUC del mejor modelo en prueba (una sola evaluación).",
    ],
    starter: py`import pandas as pd
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_score, train_test_split

cv_scores = []
busqueda = None
mejores = {}
auc_cv_mejor = 0
auc_prueba = 0`,
    solution: py`import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

df = pd.read_csv("clientes.csv")
X = pd.get_dummies(df[["contrato", "antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]], dtype=int)
y = df["baja"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=0)
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
cv_scores = cross_val_score(Pipeline([("esc", StandardScaler()), ("lr", LogisticRegression(max_iter=1000))]), X_tr, y_tr, cv=cv, scoring="roc_auc")
rejilla = {"n_estimators": [40], "min_samples_leaf": [1, 5, 20], "max_depth": [None, 6]}
busqueda = GridSearchCV(RandomForestClassifier(random_state=0), rejilla, cv=cv, scoring="roc_auc").fit(X_tr, y_tr)
mejores = busqueda.best_params_
auc_cv_mejor = busqueda.best_score_
auc_prueba = roc_auc_score(y_te, busqueda.predict_proba(X_te)[:, 1])
print(cv_scores.round(3), mejores, round(auc_cv_mejor, 3), round(auc_prueba, 3))`,
    tests: py`
import numpy as np

def test_cv():
    "Cinco puntuaciones razonables"
    s = np.asarray(t.get("cv_scores"))
    assert s.shape == (5,) and 0.7 < s.mean() < 1 and s.std() < 0.06

def test_busqueda():
    "GridSearchCV con 6 combinaciones"
    b = t.get("busqueda")
    assert len(b.cv_results_["params"]) == 6 and b.n_splits_ == 5
    assert t.get("mejores") == b.best_params_ and approx(t.get("auc_cv_mejor"), b.best_score_)
    assert t.get("mejores")["min_samples_leaf"] in (5, 20), "Las hojas grandes regularizan el bosque"

def test_prueba():
    "Evaluación final en prueba, coherente con la validación"
    a = t.get("auc_prueba")
    assert 0.7 < a < 1 and abs(a - t.get("auc_cv_mejor")) < 0.08
`,
    hints: [
      "`StratifiedKFold(n_splits=5, shuffle=True, random_state=0)` como `cv`.",
      "`GridSearchCV(modelo, rejilla, cv=cv, scoring=\"roc_auc\").fit(X_tr, y_tr)`.",
      "Tras `fit`, `busqueda` se comporta como el mejor modelo reentrenado: usa `busqueda.predict_proba(X_te)`.",
    ],
    errors: [
      { error: "Hacer GridSearchCV con todos los datos y evaluar en una parte de ellos", fix: "La búsqueda ya vio esa parte. Separa la prueba antes de cualquier ajuste." },
      { error: "Probar cientos de combinaciones e informar el mejor CV como rendimiento esperado", fix: "La mejor puntuación de CV es optimista. La estimación honesta es la de la prueba (o una CV anidada)." },
    ],
    quiz: {
      question: "¿Por qué no se elige el hiperparámetro con el conjunto de prueba?",
      options: [
        { text: "Porque el rendimiento en prueba quedaría sesgado al alza: habríamos ajustado el modelo a ese conjunto" },
        { text: "Porque el conjunto de prueba es demasiado pequeño siempre" },
        { text: "Porque scikit-learn no lo permite" },
        { text: "No hay inconveniente", misconception: "data-leakage" },
      ],
      answer: 0,
      explanation: "Cada decisión tomada mirando la prueba la convierte en parte del entrenamiento. Es una forma de fuga de información.",
    },
    review: "Repasa el flujo prueba reservada → validación cruzada → evaluación final.",
    xp: 100,
    coins: 15,
  },
  {
    id: "ml-knn-svm",
    lab: { lab: "ml", tab: "clasificacion", label: "Fronteras de clasificación" },
    world: "w6",
    zone: "Modelos",
    title: "Los vecinos y la frontera: k-NN desde cero y SVM",
    kind: "lesson",
    difficulty: 4,
    skills: ["ml", "knn", "svm", "escalado"],
    requires: ["ml-validacion"],
    story: "En la aldea, para adivinar el oficio de alguien basta con mirar a sus vecinos más cercanos. Pero si mides la distancia en metros y en gramos a la vez, los vecinos engañan.",
    objective: "Programar k vecinos más cercanos desde cero, compararlo con scikit-learn, mostrar el efecto del escalado y entrenar una SVM.",
    before: ["Vectores y distancias", "Pipelines"],
    packages: ["numpy", "scikit-learn"],
    intuition: [
      "- **k-NN**: para un punto nuevo, busca los k ejemplos más cercanos y vota su clase. Sin entrenamiento real: guarda los datos.",
      "- k pequeño → frontera irregular (sobreajuste); k grande → frontera suave (subajuste).",
      "- Usa **distancias**: si una variable va de 0 a 100 000 y otra de 0 a 1, la primera domina. **Escala** las variables.",
      "- **SVM**: busca la frontera con el máximo margen entre clases; con kernels (RBF) traza fronteras no lineales. También sensible a la escala.",
      "",
      "Experimenta con k en el Laboratorio de ML.",
    ],
    example: {
      code: py`import numpy as np
a = np.array([1.0, 50000.0])
b = np.array([0.0, 50100.0])
c = np.array([1.0, 51000.0])
print(np.linalg.norm(a - b), np.linalg.norm(a - c))`,
      lines: ["NumPy.", "Persona A: (tiene coche, ingreso).", "B difiere en coche, casi igual ingreso.", "C igual coche, ingreso algo distinto.", "Sin escalar, el ingreso domina: B parece mucho más cercana a A."],
    },
    challenge: [
      "El código inicial crea `X, y` (dos lunas) con una tercera columna de ruido a escala enorme, y los divide.",
      "1. `knn_predecir(X_tr, y_tr, X_nuevos, k)`: k-NN a mano (distancia euclídea, voto mayoritario; en empate, clase 1).",
      "2. `coincide`: proporción de predicciones iguales entre tu k-NN y `KNeighborsClassifier(n_neighbors=5)` en `X_te` (con datos **escalados**).",
      "3. `exactitudes`: diccionario con la exactitud en prueba de k-NN (k=5) `\"sin_escalar\"` y `\"escalado\"` (con `StandardScaler` dentro de un `Pipeline`), y de `\"svm_rbf\"` (`SVC(kernel=\"rbf\")` escalado).",
    ],
    starter: py`import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split

X2, y = make_moons(n_samples=600, noise=0.25, random_state=0)
ruido = np.random.default_rng(0).normal(0, 1000, size=(600, 1))
X = np.hstack([X2, ruido])
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=0)

def knn_predecir(X_tr, y_tr, X_nuevos, k):
    return np.zeros(len(X_nuevos), dtype=int)

coincide = 0
exactitudes = {}`,
    solution: py`import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

X2, y = make_moons(n_samples=600, noise=0.25, random_state=0)
ruido = np.random.default_rng(0).normal(0, 1000, size=(600, 1))
X = np.hstack([X2, ruido])
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=0)

def knn_predecir(X_tr, y_tr, X_nuevos, k):
    X_tr, y_tr = np.asarray(X_tr, float), np.asarray(y_tr)
    preds = []
    for x in np.asarray(X_nuevos, float):
        d = np.sqrt(((X_tr - x) ** 2).sum(axis=1))
        vecinos = y_tr[np.argsort(d, kind="stable")[:k]]
        preds.append(1 if vecinos.sum() * 2 >= k else 0)
    return np.array(preds)

esc = StandardScaler().fit(X_tr)
mio = knn_predecir(esc.transform(X_tr), y_tr, esc.transform(X_te), 5)
sk = KNeighborsClassifier(n_neighbors=5).fit(esc.transform(X_tr), y_tr).predict(esc.transform(X_te))
coincide = float(np.mean(mio == sk))
exactitudes = {
    "sin_escalar": KNeighborsClassifier(n_neighbors=5).fit(X_tr, y_tr).score(X_te, y_te),
    "escalado": make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=5)).fit(X_tr, y_tr).score(X_te, y_te),
    "svm_rbf": make_pipeline(StandardScaler(), SVC(kernel="rbf")).fit(X_tr, y_tr).score(X_te, y_te),
}
print(coincide, exactitudes)`,
    tests: py`
import numpy as np

def test_knn_simple():
    "k-NN a mano en un caso sencillo"
    f = t.get("knn_predecir", "function")
    Xtr = [[0, 0], [0, 1], [5, 5], [6, 5]]
    ytr = [0, 0, 1, 1]
    assert list(f(Xtr, ytr, [[0.2, 0.3], [5.5, 5.2]], 1)) == [0, 1]
    assert list(f(Xtr, ytr, [[3, 3]], 4)) == [1], "En empate gana la clase 1"

def test_coincide():
    "Coincide con scikit-learn"
    assert t.get("coincide") > 0.97

def test_escalado():
    "Escalar es crucial con variables a escalas distintas"
    e = t.get("exactitudes")
    assert e["escalado"] > e["sin_escalar"] + 0.15 and e["svm_rbf"] > 0.8
`,
    hints: [
      "Distancias de un punto a todos: `np.sqrt(((X_tr - x) ** 2).sum(axis=1))`.",
      "Los k más cercanos: `np.argsort(d)[:k]`.",
      "Usa `make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=5))`.",
    ],
    errors: [
      { error: "No escalar en modelos basados en distancias", fix: "Una variable con escala grande domina la distancia. Escala dentro de un pipeline." },
      { error: "k-NN lento con muchos datos", fix: "Predice comparando con todos los ejemplos; scikit-learn usa estructuras como KD-trees para acelerar." },
    ],
    quiz: {
      question: "¿Por qué k-NN y SVM necesitan escalar las variables y los árboles no?",
      options: [
        { text: "Porque k-NN y SVM usan distancias o productos escalares; los árboles solo comparan cada variable con un umbral" },
        { text: "Porque los árboles escalan internamente" },
        { text: "Porque los árboles son más modernos" },
        { text: "Ningún modelo necesita escalar" },
      ],
      answer: 0,
      explanation: "Un umbral sobre una variable no depende de su escala; una distancia que mezcla variables sí.",
    },
    review: "Repasa k-NN, el papel del escalado y la idea de margen en SVM.",
    xp: 95,
    coins: 14,
  },
  {
    id: "ml-no-supervisado",
    lab: { lab: "ml", tab: "kmeans", label: "K-means paso a paso" },
    world: "w6",
    zone: "Modelos",
    title: "Los gremios ocultos: k-means y PCA",
    kind: "lesson",
    difficulty: 4,
    skills: ["ml", "no-supervisado", "kmeans", "pca"],
    requires: ["ml-knn-svm"],
    story: "Nadie etiquetó a los clientes en gremios, pero los gremios existen: patrones de uso que se repiten. Y con cien medidas por cliente, hace falta un mapa que resuma lo esencial.",
    objective: "Agrupar con k-means eligiendo k con la silueta, interpretar centroides y reducir dimensionalidad con PCA (varianza explicada).",
    before: ["Escalado", "Álgebra lineal", "Varianza"],
    packages: ["numpy", "scikit-learn"],
    intuition: [
      "- **k-means**: elige k centroides y alterna (1) asignar cada punto al centroide más cercano y (2) mover cada centroide a la media de su grupo. Minimiza la inercia (suma de distancias al cuadrado).",
      "- Elegir k: el «codo» de la inercia o el coeficiente de **silueta** (cercanía al propio grupo frente al vecino; de −1 a 1).",
      "- Supone grupos más o menos esféricos y de tamaño similar; escala antes.",
      "- **PCA**: nuevas variables (componentes) ortogonales que capturan la máxima varianza. La **varianza explicada** indica cuánta información conserva cada una. Útil para visualizar y reducir ruido; los componentes son combinaciones de variables, menos interpretables.",
    ],
    example: {
      code: py`import numpy as np
from sklearn.decomposition import PCA
rng = np.random.default_rng(0)
z = rng.normal(size=(300, 1))
X = np.hstack([z, 2 * z + rng.normal(0, 0.1, (300, 1)), rng.normal(size=(300, 1))])
print(PCA().fit(X).explained_variance_ratio_.round(3))`,
      lines: ["NumPy.", "PCA.", "Semilla.", "Una variable latente.", "Dos columnas casi redundantes y una independiente.", "La primera componente explica ~86 %: las dos columnas redundantes se resumen en una."],
    },
    challenge: [
      "El código inicial genera `X` con 4 grupos en 6 dimensiones (`make_blobs`).",
      "1. `siluetas`: diccionario k → silueta media para k = 2…7 con `KMeans(n_clusters=k, n_init=10, random_state=0)` sobre `X` escalado.",
      "2. `k_elegido`: k con mayor silueta.",
      "3. `kmeans_mano(X, k, iteraciones, semilla)`: implementación propia que inicializa con k puntos aleatorios distintos (`rng.choice(len(X), k, replace=False)`) y devuelve (etiquetas, centroides). Su inercia con k_elegido debe estar cerca de la de scikit-learn.",
      "4. `var_2_componentes`: proporción de varianza explicada por las dos primeras componentes de PCA (sobre `X` escalado).",
    ],
    starter: py`import numpy as np
from sklearn.datasets import make_blobs
from sklearn.preprocessing import StandardScaler

X, _ = make_blobs(n_samples=600, centers=4, n_features=6, cluster_std=1.2, random_state=4)
Xs = StandardScaler().fit_transform(X)

siluetas = {}
k_elegido = 2

def kmeans_mano(X, k, iteraciones, semilla):
    return np.zeros(len(X), dtype=int), np.zeros((k, X.shape[1]))

var_2_componentes = 0`,
    solution: py`import numpy as np
from sklearn.cluster import KMeans
from sklearn.datasets import make_blobs
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

X, _ = make_blobs(n_samples=600, centers=4, n_features=6, cluster_std=1.2, random_state=4)
Xs = StandardScaler().fit_transform(X)

siluetas = {k: float(silhouette_score(Xs, KMeans(n_clusters=k, n_init=10, random_state=0).fit_predict(Xs))) for k in range(2, 8)}
k_elegido = max(siluetas, key=siluetas.get)

def kmeans_mano(X, k, iteraciones, semilla):
    X = np.asarray(X, float)
    rng = np.random.default_rng(semilla)
    centroides = X[rng.choice(len(X), k, replace=False)]
    for _ in range(iteraciones):
        d = ((X[:, None, :] - centroides[None, :, :]) ** 2).sum(axis=2)
        etiquetas = d.argmin(axis=1)
        nuevos = np.array([X[etiquetas == j].mean(axis=0) if np.any(etiquetas == j) else centroides[j] for j in range(k)])
        if np.allclose(nuevos, centroides):
            break
        centroides = nuevos
    return etiquetas, centroides

var_2_componentes = float(PCA(n_components=2).fit(Xs).explained_variance_ratio_.sum())
print(siluetas, k_elegido, var_2_componentes)`,
    tests: py`
import numpy as np
from sklearn.cluster import KMeans

def test_siluetas():
    "La silueta recupera los 4 grupos"
    s = t.get("siluetas")
    assert sorted(s) == [2, 3, 4, 5, 6, 7] and t.get("k_elegido") == 4

def test_kmeans_mano():
    "k-means propio con inercia similar a scikit-learn"
    Xs = t.get("Xs")
    mejor = None
    for semilla in range(5):
        et, c = t.get("kmeans_mano", "function")(Xs, 4, 100, semilla)
        inercia = ((Xs - c[et]) ** 2).sum()
        mejor = inercia if mejor is None else min(mejor, inercia)
    ref = KMeans(n_clusters=4, n_init=10, random_state=0).fit(Xs).inertia_
    assert mejor <= ref * 1.02

def test_pca():
    "Varianza explicada"
    v = t.get("var_2_componentes")
    assert 0.5 < v < 1
`,
    hints: [
      "`silhouette_score(Xs, etiquetas)` para cada k.",
      "Distancias de todos los puntos a todos los centroides: `((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)`.",
      "`PCA(n_components=2).fit(Xs).explained_variance_ratio_.sum()`.",
    ],
    errors: [
      { error: "Interpretar los grupos de k-means como «tipos naturales» indiscutibles", fix: "k-means siempre devuelve k grupos, haya o no estructura. Valida con siluetas, estabilidad y conocimiento del dominio." },
      { error: "PCA sin escalar variables de distinta escala", fix: "La variable de mayor varianza dominará la primera componente solo por sus unidades." },
    ],
    quiz: {
      question: "PCA conserva el 95 % de la varianza con 3 de 20 componentes. ¿Qué puedes afirmar?",
      options: [
        { text: "Que las variables están muy correlacionadas: 3 direcciones resumen casi toda la variabilidad" },
        { text: "Que 17 variables son inútiles y pueden borrarse" },
        { text: "Que el modelo predictivo mejorará siempre" },
        { text: "Que las 3 componentes son variables originales" },
      ],
      answer: 0,
      explanation: "Las componentes son combinaciones de todas las variables; la varianza no siempre equivale a utilidad para predecir un objetivo concreto.",
    },
    review: "Repasa k-means, la silueta y la varianza explicada en PCA.",
    xp: 95,
    coins: 14,
  },
  {
    id: "ml-fuga",
    world: "w6",
    zone: "Evaluación",
    title: "El espía en el laboratorio: fuga de datos e interpretabilidad",
    kind: "lesson",
    difficulty: 4,
    skills: ["ml", "data-leakage", "interpretabilidad", "mlops"],
    requires: ["ml-no-supervisado"],
    story: "Un modelo obtiene un AUC de 0,99. El maestro sospecha: ningún autómata es tan bueno. Investigando, descubre un espía: una variable que solo existe después de que el cliente se haya ido.",
    objective: "Detectar fugas de datos (variables posteriores al evento, duplicados entre conjuntos) e introducir buenas prácticas de despliegue (MLOps): versionar, monitorizar la deriva y documentar.",
    before: ["Pipelines", "Validación cruzada", "Importancia por permutación"],
    packages: ["pandas", "scikit-learn", "numpy"],
    files: CLI,
    intuition: [
      "Señales de fuga:",
      "- Rendimiento «demasiado bueno para ser verdad».",
      "- Una variable con importancia desproporcionada.",
      "- Variables que **no estarán disponibles en el momento de predecir** (registradas después del evento).",
      "- Registros duplicados o de la misma persona en entrenamiento y prueba.",
      "",
      "**MLOps** (introducción): versionar datos, código y modelos; automatizar entrenamiento y evaluación; monitorizar en producción la **deriva** (cambios en la distribución de las entradas o en la relación con el objetivo); documentar el uso previsto y las limitaciones (fichas de modelo).",
    ],
    example: {
      code: py`import pandas as pd
df = pd.read_csv("clientes.csv")
df["dias_desde_baja"] = df["baja"] * 30
print(df[["baja", "dias_desde_baja"]].corr().iloc[0, 1])`,
      lines: ["pandas.", "Datos.", "Una variable «espía»: solo tiene valor si el cliente ya se fue.", "Correlación perfecta: incluirla daría un modelo inútil en producción."],
    },
    challenge: [
      "1. Añade a `df` la variable espía `motivo_baja_registrado` = baja (registrada por el centro de atención tras la baja).",
      "2. `auc_con_espia` y `auc_sin_espia`: AUC en prueba de `RandomForestClassifier(n_estimators=150, random_state=0)` con y sin esa variable (resto: numéricas + dummies de contrato; división 75/25 estratificada `random_state=0`).",
      "3. `sospechosas(X, y, umbral=0.95)`: lista de columnas cuyo AUC individual (usando la columna como puntuación; si < 0,5, usar 1 − AUC) supera el umbral.",
      "4. `duplicados_cruzados(X_tr, X_te)`: número de filas de prueba idénticas a alguna de entrenamiento.",
      "5. `deriva(ref, nuevo)`: diferencia de medias estandarizada (por la DE de referencia) entre dos muestras de una variable; > 0,2 sugiere deriva.",
    ],
    starter: py`import numpy as np
import pandas as pd

df = pd.read_csv("clientes.csv")
auc_con_espia = 0
auc_sin_espia = 0

def sospechosas(X, y, umbral=0.95):
    return []

def duplicados_cruzados(X_tr, X_te):
    return 0

def deriva(ref, nuevo):
    return 0`,
    solution: py`import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

df = pd.read_csv("clientes.csv")
df["motivo_baja_registrado"] = df["baja"]
base = pd.get_dummies(df[["contrato", "antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]], dtype=int)
y = df["baja"]

def auc_rf(X):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)
    m = RandomForestClassifier(n_estimators=150, random_state=0).fit(X_tr, y_tr)
    return roc_auc_score(y_te, m.predict_proba(X_te)[:, 1])

auc_con_espia = auc_rf(base.assign(motivo_baja_registrado=df["motivo_baja_registrado"]))
auc_sin_espia = auc_rf(base)

def sospechosas(X, y, umbral=0.95):
    salida = []
    for c in X.columns:
        a = roc_auc_score(y, X[c])
        if max(a, 1 - a) > umbral:
            salida.append(c)
    return salida

def duplicados_cruzados(X_tr, X_te):
    entrenamiento = set(map(tuple, np.asarray(X_tr).tolist()))
    return sum(tuple(fila) in entrenamiento for fila in np.asarray(X_te).tolist())

def deriva(ref, nuevo):
    ref, nuevo = np.asarray(ref, float), np.asarray(nuevo, float)
    return float((nuevo.mean() - ref.mean()) / ref.std(ddof=1))

print(auc_con_espia, auc_sin_espia)`,
    tests: py`
import numpy as np
import pandas as pd

def test_espia():
    "La variable espía infla el AUC"
    assert t.get("auc_con_espia") > 0.99 and 0.7 < t.get("auc_sin_espia") < 0.95

def test_sospechosas():
    "Detecta la columna espía"
    df = t.get("df")
    X = df[["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "motivo_baja_registrado"]]
    assert t.get("sospechosas", "function")(X, df["baja"]) == ["motivo_baja_registrado"]

def test_duplicados():
    "Filas repetidas entre conjuntos"
    a = pd.DataFrame({"x": [1, 2, 3], "y": [4, 5, 6]})
    b = pd.DataFrame({"x": [2, 9, 3], "y": [5, 9, 7]})
    assert t.get("duplicados_cruzados", "function")(a, b) == 1

def test_deriva():
    "Detecta deriva"
    rng = np.random.default_rng(1)
    ref = rng.normal(60, 10, 1000)
    assert abs(t.get("deriva", "function")(ref, rng.normal(60, 10, 1000))) < 0.1
    assert t.get("deriva")(ref, rng.normal(65, 10, 1000)) > 0.3
`,
    hints: [
      "Escribe una función auxiliar que entrene y devuelva el AUC para un conjunto de columnas.",
      "`roc_auc_score(y, X[col])` usa la columna como puntuación.",
      "Convierte las filas en tuplas para compararlas en un conjunto.",
    ],
    errors: [
      { error: "Celebrar un AUC de 0,99 sin investigar", fix: "Rendimientos extraordinarios suelen indicar fuga. Revisa qué variables lo explican y cuándo se registran." },
      { error: "Desplegar sin monitorizar", fix: "Los datos cambian (nuevos productos, nuevas políticas). Vigila la deriva y reentrena con criterios definidos." },
    ],
    quiz: {
      question: "Un modelo de reingresos hospitalarios usa la variable «número de días del reingreso». ¿Qué problema hay?",
      options: [
        { text: "Fuga: esa información solo existe si ya hubo reingreso; no estará disponible al predecir" },
        { text: "Ninguno, mejora el modelo" },
        { text: "Multicolinealidad" },
        { text: "Subajuste" },
      ],
      answer: 0,
      explanation: "Una predictora debe estar disponible en el momento de la predicción. Si depende del resultado, el modelo hace trampa.",
    },
    review: "Repasa las señales de fuga y las prácticas básicas de MLOps.",
    xp: 100,
    coins: 15,
  },
  {
    id: "proj-modelo-predictivo",
    world: "w6",
    zone: "Proyecto del Laboratorio",
    title: "Proyecto: predecir las bajas de clientes",
    kind: "project",
    difficulty: 5,
    skills: ["ml", "pipelines", "validacion-cruzada", "metricas", "comunicacion"],
    requires: ["ml-fuga"],
    story: [
      "La compañía quiere un modelo para anticipar qué clientes se darán de baja y ofrecerles retención. Cada llamada cuesta 5 monedas; perder un cliente, 60.",
      "Debes entregar un modelo honesto: comparado con una línea base, validado sin fugas, con un umbral elegido por costes y con sus limitaciones documentadas.",
    ],
    objective: "Desarrollar un modelo predictivo de principio a fin: exploración, estrategia de evaluación, línea base, pipeline, validación cruzada, comparación de modelos, umbral por costes, evaluación final y ficha del modelo.",
    before: ["Pipelines", "Validación cruzada", "Métricas", "Fuga de datos"],
    packages: ["pandas", "scikit-learn", "numpy"],
    files: CLI,
    intuition: [
      "Plan de trabajo de un proyecto de ML responsable:",
      "",
      "1. **Explorar**: tamaño, proporción de clases, faltantes, variables disponibles al predecir.",
      "2. **Estrategia de evaluación**: prueba reservada estratificada + validación cruzada en entrenamiento; métrica principal (AUC) y coste de negocio.",
      "3. **Línea base** y **modelos candidatos** en pipelines.",
      "4. **Selección** por validación cruzada.",
      "5. **Umbral** según costes (con predicciones de validación cruzada, no con la prueba).",
      "6. **Evaluación final** única en prueba.",
      "7. **Ficha del modelo**: uso previsto, datos, métricas, limitaciones y riesgos.",
    ],
    example: {
      code: py`import pandas as pd
df = pd.read_csv("clientes.csv")
print(df.shape, df["baja"].mean().round(3))
print(df.isna().sum()[df.isna().sum() > 0])`,
      lines: ["pandas.", "Datos.", "1200 clientes; 28 % de bajas.", "Columnas con faltantes: gasto_total."],
    },
    challenge: [
      "Define (las pruebas evalúan cada etapa):",
      "1. **Exploración** → `n_clientes`, `tasa_baja` y `variables` (lista de predictoras disponibles al predecir: contrato, antigüedad, cuota, llamadas, fibra, gasto_total; **no** `cliente` ni `baja`).",
      "2. **Estrategia** → `X_tr, X_te, y_tr, y_te` (20 % prueba, estratificado, `random_state=0`) y `cv` (`StratifiedKFold(5, shuffle=True, random_state=0)`).",
      "3. **Modelos** → `resultados_cv`: diccionario nombre → AUC media en CV para `\"base\"` (DummyClassifier `strategy=\"prior\"`), `\"logistica\"` y `\"bosque\"`, cada uno en un Pipeline con preprocesamiento (one-hot + imputación + escalado); `mejor_modelo` (nombre del de mayor AUC CV, que no sea base).",
      "4. **Umbral** → `umbral`: el de `np.round(np.arange(0.05, 0.95, 0.05), 2)` que minimiza el coste (FP = 5, FN = 60) usando probabilidades de validación cruzada (`cross_val_predict(..., method=\"predict_proba\")`) del mejor modelo en entrenamiento.",
      "5. **Evaluación final** → `final`: diccionario con `auc`, `recall`, `precision` y `coste` en prueba con ese umbral, y `coste_sin_modelo` = coste de no llamar a nadie en prueba (todos FN).",
      "6. **Ficha** → `ficha`: diccionario con las claves `uso_previsto`, `datos`, `metricas`, `limitaciones` (lista ≥ 3) y `no_usar_para`.",
    ],
    starter: py`import numpy as np
import pandas as pd

df = pd.read_csv("clientes.csv")

# 1. Exploración
n_clientes = 0
tasa_baja = 0
variables = []

# 2. Estrategia
X_tr = X_te = y_tr = y_te = None
cv = None

# 3. Modelos
resultados_cv = {}
mejor_modelo = ""

# 4. Umbral
umbral = 0.5

# 5. Evaluación final
final = {}

# 6. Ficha del modelo
ficha = {}`,
    solution: py`import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

df = pd.read_csv("clientes.csv")

# 1. Exploración
n_clientes = len(df)
tasa_baja = float(df["baja"].mean())
variables = ["contrato", "antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra", "gasto_total"]

# 2. Estrategia
X, y = df[variables], df["baja"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=0)
cv = StratifiedKFold(5, shuffle=True, random_state=0)

# 3. Modelos
numericas = variables[1:]
def prep():
    return ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore"), ["contrato"]),
        ("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("esc", StandardScaler())]), numericas),
    ])
candidatos = {
    "base": Pipeline([("prep", prep()), ("m", DummyClassifier(strategy="prior"))]),
    "logistica": Pipeline([("prep", prep()), ("m", LogisticRegression(max_iter=1000))]),
    "bosque": Pipeline([("prep", prep()), ("m", RandomForestClassifier(n_estimators=200, min_samples_leaf=10, random_state=0))]),
}
resultados_cv = {n: float(cross_val_score(m, X_tr, y_tr, cv=cv, scoring="roc_auc").mean()) for n, m in candidatos.items()}
mejor_modelo = max((n for n in resultados_cv if n != "base"), key=resultados_cv.get)

# 4. Umbral (con predicciones de validación cruzada)
modelo = candidatos[mejor_modelo]
p_cv = cross_val_predict(modelo, X_tr, y_tr, cv=cv, method="predict_proba")[:, 1]
def coste(y, p, u):
    pred = p >= u
    return 5 * int(((~np.asarray(y, bool)) & pred).sum()) + 60 * int((np.asarray(y, bool) & ~pred).sum())
umbral = float(min(np.round(np.arange(0.05, 0.95, 0.05), 2), key=lambda u: coste(y_tr, p_cv, u)))

# 5. Evaluación final
modelo.fit(X_tr, y_tr)
p_te = modelo.predict_proba(X_te)[:, 1]
pred = (p_te >= umbral).astype(int)
final = {
    "auc": float(roc_auc_score(y_te, p_te)),
    "recall": float(recall_score(y_te, pred)),
    "precision": float(precision_score(y_te, pred)),
    "coste": coste(y_te, p_te, umbral),
    "coste_sin_modelo": 60 * int(y_te.sum()),
}

# 6. Ficha
ficha = {
    "uso_previsto": "Priorizar clientes para llamadas de retención voluntarias.",
    "datos": f"{n_clientes} clientes sintéticos; {tasa_baja:.0%} de bajas; prueba reservada del 20 %.",
    "metricas": f"AUC en prueba {final['auc']:.2f}; recall {final['recall']:.2f} con umbral {umbral}.",
    "limitaciones": [
        "Datos sintéticos: el rendimiento no se trasladará tal cual a clientes reales.",
        "El modelo identifica asociaciones, no causas de la baja.",
        "Los costes de 5 y 60 son supuestos y el umbral cambia si cambian.",
        "Requiere monitorizar deriva y recalibrar periódicamente.",
    ],
    "no_usar_para": "Decisiones automáticas que perjudiquen a clientes (precios, denegación de servicio).",
}
print(resultados_cv, mejor_modelo, umbral, final)`,
    tests: py`
import numpy as np
import pandas as pd

def test_etapa1_exploracion():
    "Etapa 1: exploración y variables disponibles"
    assert t.get("n_clientes") == 1200 and approx(t.get("tasa_baja"), pd.read_csv("clientes.csv")["baja"].mean())
    v = t.get("variables")
    assert "baja" not in v and "cliente" not in v and {"contrato", "antiguedad_meses", "llamadas_soporte"} <= set(v)

def test_etapa2_estrategia():
    "Etapa 2: prueba reservada y CV estratificada"
    assert len(t.get("X_te")) == 240 and abs(t.get("y_tr").mean() - t.get("y_te").mean()) < 0.01
    assert t.get("cv").get_n_splits() == 5

def test_etapa3_modelos():
    "Etapa 3: los modelos superan a la línea base"
    r = t.get("resultados_cv")
    assert set(r) == {"base", "logistica", "bosque"} and approx(r["base"], 0.5, 1e-9)
    assert r[t.get("mejor_modelo")] > 0.78 and t.get("mejor_modelo") != "base"

def test_etapa4_umbral():
    "Etapa 4: umbral bajo por el coste de perder clientes"
    assert 0.05 <= t.get("umbral") < 0.4

def test_etapa5_final():
    "Etapa 5: el modelo ahorra frente a no hacer nada"
    f = t.get("final")
    assert f["auc"] > 0.75 and f["recall"] > 0.7 and f["coste"] < 0.75 * f["coste_sin_modelo"]

def test_etapa6_ficha():
    "Etapa 6: ficha del modelo completa"
    fi = t.get("ficha")
    assert {"uso_previsto", "datos", "metricas", "limitaciones", "no_usar_para"} <= set(fi)
    assert len(fi["limitaciones"]) >= 3 and all(len(x) > 20 for x in fi["limitaciones"])
`,
    hints: [
      "Define una función `prep()` que cree un preprocesador nuevo para cada pipeline.",
      "`cross_val_predict(modelo, X_tr, y_tr, cv=cv, method=\"predict_proba\")[:, 1]` da probabilidades sin fuga para elegir el umbral.",
      "Coste = 5 × FP + 60 × FN.",
    ],
    errors: [
      { error: "Elegir el umbral con la prueba", fix: "Usa predicciones de validación cruzada en entrenamiento. La prueba solo se usa al final." },
      { error: "Omitir la línea base", fix: "Sin ella no sabes cuánto aporta el modelo." },
    ],
    quiz: {
      question: "El modelo final tiene AUC 0,83. ¿Qué falta para decidir si desplegarlo?",
      options: [
        { text: "Valorar el beneficio real con el umbral elegido (costes), la estabilidad, la equidad entre grupos y un plan de monitorización" },
        { text: "Nada: un AUC > 0,8 basta" },
        { text: "Un valor p del modelo", misconception: "prediccion-vs-significacion" },
        { text: "Volver a ajustarlo con la prueba para subir el AUC", misconception: "data-leakage" },
      ],
      answer: 0,
      explanation: "La métrica técnica es solo una parte. El valor depende de la decisión que habilita, de sus costes y de sus riesgos.",
    },
    review: "Repasa el flujo completo de un proyecto de ML honesto.",
    project: {
      requirements: ["Línea base", "Pipelines sin fuga", "Selección por validación cruzada", "Umbral elegido por costes sin usar la prueba", "Ficha del modelo"],
      dataset: "clientes.csv: 1200 clientes sintéticos generados por Python Quest.",
      stages: ["Exploración", "Estrategia de evaluación", "Modelos y línea base", "Umbral por costes", "Evaluación final", "Ficha del modelo"],
      criteria: ["Las seis etapas pasan sus pruebas", "La prueba se usa una sola vez", "Las limitaciones son específicas"],
      extensions: ["Calibración de probabilidades (CalibratedClassifierCV)", "Análisis de equidad por tipo de contrato", "Curva de ganancia acumulada", "Servir el modelo con una API (Mundo 8)"],
      portfolio: "Modelo de predicción de bajas con pipeline de scikit-learn, validación cruzada, umbral optimizado por costes y ficha del modelo.",
    },
    xp: 400,
    coins: 80,
  },
];
