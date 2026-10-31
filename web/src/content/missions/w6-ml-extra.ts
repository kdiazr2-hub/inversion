import { clientesCsv, estudiantesCsv } from "../datasets";
import { py, type Mission } from "../types";

// Mundo 6: el puente con las matemáticas del Mundo 4 (descenso de gradiente, regularización)
// y una introducción práctica a MLOps.

export const W6_EXTRA: Mission[] = [
  {
    id: "ml-gradiente",
    world: "w6",
    zone: "Fundamentos",
    title: "El descenso del autómata: entrenar una regresión con descenso de gradiente",
    kind: "lesson",
    difficulty: 4,
    skills: ["descenso-gradiente", "regresion", "derivadas", "verificacion"],
    requires: ["ml-regresion", "m-derivadas"],
    story: "El autómata del laboratorio no conoce las ecuaciones normales: aprende dando pasitos cuesta abajo sobre su error. Vas a programar su forma de aprender y comprobar que llega al mismo sitio que scikit-learn.",
    objective: "Implementar el ECM y su gradiente, entrenar una regresión lineal con descenso de gradiente, verificar el gradiente numéricamente y contra LinearRegression, y estudiar el efecto de la tasa de aprendizaje.",
    before: ["Derivadas y descenso de gradiente (Mundo 4)", "Regresión lineal y ECM", "Arrays de NumPy"],
    packages: ["numpy", "pandas", "scikit-learn", "matplotlib"],
    files: { "estudiantes.csv": estudiantesCsv() },
    intuition: [
      "Entrenar un modelo es **minimizar una función de pérdida**. Para la regresión lineal la pérdida es el error cuadrático medio (ECM) y existe fórmula cerrada; para redes neuronales no, y se usa el **descenso de gradiente**: repetir w ← w − α·∇ECM(w).",
      "",
      "- El **gradiente** dice en qué dirección sube más la pérdida; se avanza en la contraria.",
      "- La **tasa de aprendizaje** α: demasiado pequeña, avanza muy lento; demasiado grande, se pasa del mínimo y **diverge**.",
      "- **Estandarizar** las variables (media 0, desviación 1) hace que la superficie de pérdida sea más redonda y que un mismo α sirva para todas las direcciones.",
      "- **Verificación del gradiente**: compara tu derivada analítica con diferencias finitas. Es la prueba estándar antes de confiar en un entrenamiento.",
    ],
    formal: [
      "ŷ = Xw + b · ECM = (1/n) Σ (ŷᵢ − yᵢ)²",
      "",
      "∂ECM/∂w = (2/n) Xᵀ(ŷ − y) · ∂ECM/∂b = (2/n) Σ (ŷᵢ − yᵢ)",
      "",
      "Para una pérdida cuadrática converge si α < 2/λ_max, con λ_max el mayor autovalor de (2/n)XᵀX.",
    ],
    example: {
      code: py`import numpy as np
x = np.array([1.0, 2.0, 3.0, 4.0])
y = 3 * x + 1
w, b = 0.0, 0.0
for _ in range(2000):
    error = w * x + b - y
    w -= 0.05 * 2 * np.mean(error * x)
    b -= 0.05 * 2 * np.mean(error)
print(round(w, 4), round(b, 4))`,
      lines: [
        "NumPy.",
        "Una predictora.",
        "Respuesta exacta y = 3x + 1 (sin ruido).",
        "Empezamos con pesos nulos.",
        "Dos mil pasos de descenso.",
        "Error de cada predicción.",
        "Paso en w: α por la derivada del ECM respecto a w.",
        "Paso en b: α por la derivada respecto a b.",
        "Llega a 3.0 y 1.0: el descenso encuentra los coeficientes verdaderos.",
      ],
    },
    challenge: [
      "Con `estudiantes.csv`, predictoras `horas_estudio`, `asistencia`, `nota_previa` y objetivo `nota_final`:",
      "1. `estandarizar(X)`: tupla (Z, medias, desviaciones) con Z = (X − media)/desviación por columna (desviación con ddof = 0). Acepta arrays de NumPy.",
      "2. `ecm_y_gradiente(w, b, X, y)`: tupla (ecm, dw, db) con las fórmulas de arriba.",
      "3. `descenso(X, y, alfa=0.1, pasos=500)`: empieza en w = 0, b = 0 y devuelve (w, b, historial) con el ECM **antes** de cada paso y el final (longitud pasos + 1).",
      "4. `Z` estandarizada, `w, b, historial = descenso(Z, y, 0.1, 500)`, `lr = LinearRegression().fit(Z, y)` y `coinciden`: True si coeficientes e intercepto difieren menos de 1e-4.",
      "5. `alfa_divergente`: el **menor** α de `[0.01, 0.1, 0.5, 1.5]` para el que el ECM final (500 pasos) es mayor que el inicial.",
      "6. `fig`: ECM por iteración para α = 0,01, 0,1 y 0,5 (tres líneas con leyenda) con el eje vertical en escala logarítmica (`set_yscale(\"log\")`).",
    ],
    starter: py`import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
import matplotlib.pyplot as plt

df = pd.read_csv("estudiantes.csv")
X = df[["horas_estudio", "asistencia", "nota_previa"]].to_numpy()
y = df["nota_final"].to_numpy()

def estandarizar(X):
    return X, 0, 1

def ecm_y_gradiente(w, b, X, y):
    error = X @ w + b - y
    return np.mean(error ** 2), X.T @ error, error.sum()

def descenso(X, y, alfa=0.1, pasos=500):
    return np.zeros(X.shape[1]), 0.0, []

Z, medias, desv = estandarizar(X)
w, b, historial = descenso(Z, y)
lr = LinearRegression().fit(Z, y)
coinciden = False
alfa_divergente = None
fig, ax = plt.subplots()`,
    solution: py`import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
import matplotlib.pyplot as plt

df = pd.read_csv("estudiantes.csv")
X = df[["horas_estudio", "asistencia", "nota_previa"]].to_numpy()
y = df["nota_final"].to_numpy()

def estandarizar(X):
    X = np.asarray(X, dtype=float)
    medias, desv = X.mean(axis=0), X.std(axis=0)
    return (X - medias) / desv, medias, desv

def ecm_y_gradiente(w, b, X, y):
    n = len(y)
    error = X @ w + b - y
    return np.mean(error ** 2), 2 / n * X.T @ error, 2 / n * error.sum()

def descenso(X, y, alfa=0.1, pasos=500):
    w, b = np.zeros(X.shape[1]), 0.0
    historial = []
    for _ in range(pasos):
        ecm, dw, db = ecm_y_gradiente(w, b, X, y)
        historial.append(ecm)
        w, b = w - alfa * dw, b - alfa * db
    historial.append(ecm_y_gradiente(w, b, X, y)[0])
    return w, b, historial

Z, medias, desv = estandarizar(X)
w, b, historial = descenso(Z, y, 0.1, 500)
lr = LinearRegression().fit(Z, y)
coinciden = bool(np.allclose(w, lr.coef_, atol=1e-4) and abs(b - lr.intercept_) < 1e-4)

alfa_divergente = None
for alfa in [0.01, 0.1, 0.5, 1.5]:
    h = descenso(Z, y, alfa, 500)[2]
    if h[-1] > h[0]:
        alfa_divergente = alfa
        break

fig, ax = plt.subplots()
for alfa in [0.01, 0.1, 0.5]:
    ax.plot(descenso(Z, y, alfa, 500)[2], label=f"α = {alfa}")
ax.set_yscale("log")
ax.set_xlabel("Iteración")
ax.set_ylabel("ECM")
ax.legend()`,
    tests: py`
import numpy as np
from sklearn.linear_model import LinearRegression

def test_estandarizar():
    "Media 0 y desviación 1 por columna"
    Z, m, s = t.get("estandarizar", "function")(np.array([[1.0, 10], [2, 20], [3, 60]]))
    assert np.allclose(Z.mean(axis=0), 0) and np.allclose(Z.std(axis=0), 1)
    assert np.allclose(m, [2, 30])

def test_gradiente_numerico():
    "El gradiente coincide con diferencias finitas"
    f = t.get("ecm_y_gradiente", "function")
    rng = np.random.default_rng(0)
    X, y = rng.normal(size=(30, 3)), rng.normal(size=30)
    w, b = rng.normal(size=3), 0.3
    ecm, dw, db = f(w, b, X, y)
    assert approx(ecm, np.mean((X @ w + b - y) ** 2))
    h = 1e-6
    for j in range(3):
        e = np.zeros(3); e[j] = h
        num = (f(w + e, b, X, y)[0] - f(w - e, b, X, y)[0]) / (2 * h)
        assert abs(num - dw[j]) < 1e-6, f"dw[{j}]: analítico {dw[j]}, numérico {num}"
    num_b = (f(w, b + h, X, y)[0] - f(w, b - h, X, y)[0]) / (2 * h)
    assert abs(num_b - db) < 1e-6

def test_descenso():
    "Historial correcto y convergencia"
    d = t.get("descenso", "function")
    rng = np.random.default_rng(1)
    X = rng.normal(size=(80, 2)); y = X @ np.array([1.5, -2.0]) + 0.7
    w, b, h = d(X, y, 0.1, 300)
    assert len(h) == 301 and h[-1] < h[0]
    assert np.allclose(w, [1.5, -2.0], atol=1e-3) and abs(b - 0.7) < 1e-3

def test_verificacion():
    "Mismos coeficientes que LinearRegression"
    Z = t.get("Z"); y = t.get("y")
    ref = LinearRegression().fit(Z, y)
    assert np.allclose(t.get("w"), ref.coef_, atol=1e-4) and t.get("coinciden") is True

def test_divergencia():
    "Tasa de aprendizaje demasiado grande"
    assert t.get("alfa_divergente") == 1.5

def test_figura():
    "Tres curvas en escala logarítmica"
    ax = t.get("fig").axes[0]
    assert len(ax.get_lines()) == 3 and ax.get_yscale() == "log" and ax.get_legend() is not None
`,
    hints: [
      "estandarizar: `X.mean(axis=0)` y `X.std(axis=0)` dan un valor por columna; NumPy los aplica fila a fila al restar y dividir.",
      "Gradiente: con error = Xw + b − y, dw = (2/n)·Xᵀ·error y db = (2/n)·Σ error.",
      "descenso: guarda el ECM antes de cada actualización y añade el final al terminar el bucle.",
    ],
    errors: [
      { error: "Olvidar el factor 2/n", fix: "Sin él, el gradiente es n/2 veces mayor y un α razonable diverge." },
      { error: "No estandarizar", fix: "Con variables en escalas muy distintas, el α que sirve para una hace diverger a otra: la superficie es un valle alargado." },
      { error: "Actualizar w antes de calcular db con el w antiguo", fix: "Calcula los dos gradientes con los mismos parámetros y actualiza después." },
    ],
    quiz: {
      question: "Con α = 1,5 el ECM crece en cada iteración. ¿Qué ocurre?",
      options: [
        { text: "Cada paso se pasa del mínimo y cae más lejos al otro lado: α supera el límite de estabilidad 2/λ_max" },
        { text: "Hay que entrenar más iteraciones para que acabe bajando" },
        { text: "Los datos tienen demasiado ruido para ajustar una recta" },
        { text: "El modelo está sobreajustando los datos de entrenamiento", misconception: "sobreajuste" },
      ],
      answer: 0,
      explanation: "En una pérdida cuadrática el descenso multiplica la distancia al mínimo por (1 − α·λ) en cada dirección. Si |1 − α·λ| > 1, la distancia crece sin límite: más iteraciones lo empeoran. No tiene nada que ver con el sobreajuste, que se mide con datos nuevos.",
    },
    lab: { lab: "matematicas", tab: "gradiente", label: "Descenso de gradiente" },
    review: "Repasa: ∇ECM = (2/n)Xᵀ(ŷ − y); α demasiado grande diverge; estandariza; verifica el gradiente con diferencias finitas.",
    xp: 100,
    coins: 15,
  },
  {
    id: "ml-regularizacion",
    world: "w6",
    zone: "Modelos",
    title: "Las riendas del modelo: Ridge, Lasso y selección de variables",
    kind: "lesson",
    difficulty: 4,
    skills: ["regularizacion", "seleccion-variables", "validacion-cruzada", "verificacion"],
    requires: ["ml-validacion", "ec-ols"],
    story: "El autómata tiene treinta palancas pero solo cinco mueven algo. Sin riendas, las ajusta todas y memoriza ruido. Ridge y Lasso le ponen límites; la validación cruzada decide cuánto apretar.",
    objective: "Comparar mínimos cuadrados con Ridge y Lasso cuando hay muchas variables irrelevantes, verificar Ridge con su fórmula cerrada, elegir la penalización por validación cruzada y usar Lasso para seleccionar variables.",
    before: ["Regresión lineal y ecuaciones normales", "Validación cruzada", "Estandarización"],
    packages: ["numpy", "scikit-learn"],
    intuition: [
      "Con muchas variables y pocos datos, mínimos cuadrados ajusta el ruido: error bajo en entrenamiento y alto en prueba. La **regularización** añade a la pérdida un castigo por coeficientes grandes.",
      "",
      "- **Ridge** (L2): castiga Σβⱼ². Encoge todos los coeficientes hacia 0, ninguno exactamente a 0. Estabiliza cuando hay colinealidad.",
      "- **Lasso** (L1): castiga Σ|βⱼ|. Lleva algunos coeficientes **exactamente a 0**: selecciona variables.",
      "- λ (en scikit-learn, `alpha`) regula la fuerza: 0 = mínimos cuadrados; muy grande = todo a 0. Se elige con **validación cruzada**.",
      "- Hay que **estandarizar** antes: el castigo depende de la escala de cada variable.",
      "",
      "Conexión con el Mundo 4: Ridge equivale a añadir λ a la diagonal de XᵀX, lo que la aleja de ser singular. También es la estimación bayesiana con una previa normal centrada en 0.",
    ],
    formal: [
      "Ridge: β̂ = argmin ‖y − Xβ‖² + λ‖β‖² = (XᵀX + λI)⁻¹Xᵀy",
      "",
      "Lasso: β̂ = argmin (1/2n)‖y − Xβ‖² + λ‖β‖₁ (sin fórmula cerrada; descenso por coordenadas)",
    ],
    example: {
      code: py`import numpy as np
from sklearn.linear_model import Ridge
X = np.array([[1.0, 1.01], [2.0, 1.98], [3.0, 3.02], [4.0, 3.99]])
y = np.array([2.0, 4.1, 5.9, 8.0])
print(np.linalg.lstsq(X, y, rcond=None)[0].round(2))
print(Ridge(alpha=1.0, fit_intercept=False).fit(X, y).coef_.round(2))`,
      lines: [
        "NumPy.",
        "Ridge de scikit-learn.",
        "Dos columnas casi idénticas (colinealidad).",
        "Respuesta ≈ 2·x.",
        "Mínimos cuadrados reparte el efecto de forma inestable entre las dos columnas (6,04 y −4,05): dos coeficientes grandes y de signo contrario que casi se anulan.",
        "Ridge lo reparte de forma estable (≈ 0,98 y 0,98): la suma sigue siendo ≈ 2.",
      ],
    },
    challenge: [
      "El código inicial genera `X` (120 × 30) y `y`, donde solo las 5 primeras columnas influyen.",
      "1. `X_tr, X_te, y_tr, y_te` con `train_test_split(X, y, test_size=0.3, random_state=0)`.",
      "2. `ecm_ols`: diccionario {\"entrenamiento\": …, \"prueba\": …} con el ECM de `LinearRegression`.",
      "3. `ridge`: `make_pipeline(StandardScaler(), RidgeCV(alphas=np.logspace(-3, 3, 25)))` entrenado; `ecm_ridge_prueba`.",
      "4. `lasso`: `make_pipeline(StandardScaler(), LassoCV(cv=5, random_state=0))` entrenado; `ecm_lasso_prueba`; `seleccionadas`: lista ordenada de índices con coeficiente Lasso distinto de 0.",
      "5. `ridge_manual(X, y, lam)`: coeficientes (XᵀX + λI)⁻¹Xᵀy (sin intercepto) resolviendo el sistema.",
      "6. `ruta`: diccionario {α: número de coeficientes no nulos} de `Lasso(alpha=α)` sobre `X_tr` estandarizado (`StandardScaler().fit_transform(X_tr)`) para α en [0.01, 0.1, 0.5, 2.0].",
    ],
    starter: py`import numpy as np
from sklearn.linear_model import Lasso, LassoCV, LinearRegression, RidgeCV
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(42)
X = rng.normal(size=(120, 30))
beta = np.zeros(30)
beta[:5] = [3, -2, 1.5, 1, -1]
y = X @ beta + rng.normal(scale=2, size=120)

X_tr, X_te, y_tr, y_te = X, X, y, y
ecm_ols = {"entrenamiento": 0, "prueba": 0}
ridge = lasso = None
ecm_ridge_prueba = ecm_lasso_prueba = 0
seleccionadas = list(range(30))

def ridge_manual(X, y, lam):
    return np.linalg.solve(X.T @ X, X.T @ y)

ruta = {}`,
    solution: py`import numpy as np
from sklearn.linear_model import Lasso, LassoCV, LinearRegression, RidgeCV
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

rng = np.random.default_rng(42)
X = rng.normal(size=(120, 30))
beta = np.zeros(30)
beta[:5] = [3, -2, 1.5, 1, -1]
y = X @ beta + rng.normal(scale=2, size=120)

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=0)
ols = LinearRegression().fit(X_tr, y_tr)
ecm_ols = {"entrenamiento": mean_squared_error(y_tr, ols.predict(X_tr)), "prueba": mean_squared_error(y_te, ols.predict(X_te))}
ridge = make_pipeline(StandardScaler(), RidgeCV(alphas=np.logspace(-3, 3, 25))).fit(X_tr, y_tr)
ecm_ridge_prueba = mean_squared_error(y_te, ridge.predict(X_te))
lasso = make_pipeline(StandardScaler(), LassoCV(cv=5, random_state=0)).fit(X_tr, y_tr)
ecm_lasso_prueba = mean_squared_error(y_te, lasso.predict(X_te))
seleccionadas = sorted(int(i) for i in np.flatnonzero(lasso[-1].coef_))

def ridge_manual(X, y, lam):
    X = np.asarray(X, dtype=float)
    return np.linalg.solve(X.T @ X + lam * np.eye(X.shape[1]), X.T @ np.asarray(y, dtype=float))

Z_tr = StandardScaler().fit_transform(X_tr)
ruta = {a: int(np.count_nonzero(Lasso(alpha=a).fit(Z_tr, y_tr).coef_)) for a in [0.01, 0.1, 0.5, 2.0]}`,
    tests: py`
import numpy as np
from sklearn.linear_model import Ridge

def test_division():
    "70/30 con random_state=0"
    assert len(t.get("X_tr")) == 84 and len(t.get("X_te")) == 36

def test_sobreajuste_ols():
    "Mínimos cuadrados con 30 variables sobreajusta"
    e = t.get("ecm_ols")
    assert e["prueba"] > 1.5 * e["entrenamiento"], e

def test_regularizacion_ayuda():
    "Ridge y Lasso mejoran en prueba"
    e = t.get("ecm_ols")["prueba"]
    assert t.get("ecm_ridge_prueba") < e and t.get("ecm_lasso_prueba") < e
    assert hasattr(t.get("ridge")[-1], "alpha_"), "Usa RidgeCV dentro del pipeline"

def test_seleccion():
    "Lasso conserva las 5 variables reales y descarta muchas irrelevantes"
    s = t.get("seleccionadas")
    assert all(i in s for i in range(5)), s
    assert len(s) < 20, f"Seleccionó {len(s)} variables"
    assert s == sorted(s)

def test_ridge_manual():
    "Fórmula cerrada = sklearn Ridge sin intercepto"
    f = t.get("ridge_manual", "function")
    rng = np.random.default_rng(3)
    X, y = rng.normal(size=(40, 6)), rng.normal(size=40)
    for lam in (0.1, 5.0, 100.0):
        assert np.allclose(f(X, y, lam), Ridge(alpha=lam, fit_intercept=False).fit(X, y).coef_, atol=1e-8)

def test_ruta():
    "Más penalización, menos variables"
    r = t.get("ruta")
    vals = [r[a] for a in [0.01, 0.1, 0.5, 2.0]]
    assert all(a >= b for a, b in zip(vals, vals[1:])) and vals[0] > vals[-1], vals
`,
    hints: [
      "`make_pipeline(StandardScaler(), RidgeCV(...)).fit(X_tr, y_tr)`; el último paso del pipeline es `ridge[-1]`.",
      "Coeficientes no nulos de Lasso: `np.flatnonzero(lasso[-1].coef_)`.",
      "Ridge manual: `np.linalg.solve(X.T @ X + lam * np.eye(p), X.T @ y)`.",
    ],
    errors: [
      { error: "Regularizar sin estandarizar", fix: "Una variable medida en miles tendría coeficientes diminutos y casi no se castigaría; otra en milésimas se castigaría muchísimo." },
      { error: "Elegir α mirando el error de prueba", fix: "Es fuga de información: elige α por validación cruzada dentro del entrenamiento (RidgeCV, LassoCV)." },
      { error: "Interpretar que Lasso encuentra «las variables causales»", fix: "Con predictoras correlacionadas Lasso elige una casi al azar; selecciona para predecir, no para explicar causas." },
    ],
    quiz: {
      question: "Lasso deja a 0 el coeficiente de una variable. ¿Qué puedes concluir?",
      options: [
        { text: "Que, con esa penalización, la variable no mejora la predicción lo suficiente dadas las demás; no que no tenga relación con la respuesta" },
        { text: "Que la variable no tiene ningún efecto causal sobre la respuesta", misconception: "correlacion-causalidad" },
        { text: "Que su p-valor es mayor que 0,05", misconception: "prediccion-vs-significacion" },
        { text: "Que hay que eliminarla del conjunto de datos para siempre" },
      ],
      answer: 0,
      explanation: "La selección de Lasso depende de λ, de las otras variables (si dos están correlacionadas, puede quedarse solo con una) y de la muestra. Es una herramienta de predicción: no prueba ausencia de efecto ni equivale a un contraste de hipótesis.",
    },
    lab: { lab: "ml", tab: "polinomios", label: "Sobreajuste en regresión" },
    review: "Repasa: Ridge = (XᵀX + λI)⁻¹Xᵀy, encoge; Lasso pone ceros; estandariza; elige λ con validación cruzada.",
    xp: 100,
    coins: 15,
  },
  {
    id: "ml-mlops",
    world: "w6",
    zone: "Evaluación",
    title: "El taller del ingeniero: guardar, versionar y vigilar un modelo",
    kind: "lesson",
    difficulty: 4,
    skills: ["mlops", "deriva-datos", "reproducibilidad", "pipelines"],
    requires: ["ml-fuga"],
    story: "Un modelo que solo vive en un cuaderno no sirve a nadie. El taller exige que se guarde, que se pueda identificar exactamente qué versión está en uso y que avise cuando el mundo cambia y los datos nuevos dejan de parecerse a los de entrenamiento.",
    objective: "Persistir un pipeline con joblib, identificarlo con una huella SHA-256, documentarlo con una ficha de modelo y detectar deriva de datos con el PSI y la prueba de Kolmogorov-Smirnov.",
    before: ["Pipelines de scikit-learn", "AUC", "Distribuciones y cuantiles"],
    packages: ["numpy", "pandas", "scipy", "scikit-learn"],
    files: { "clientes.csv": clientesCsv() },
    intuition: [
      "**MLOps** es la ingeniería que rodea al modelo: reproducirlo, desplegarlo, versionarlo y vigilarlo.",
      "",
      "- **Persistencia**: guardar el pipeline completo (preprocesado + modelo) con `joblib`. Guardar solo el modelo sin el escalador es un error clásico.",
      "- **Versionado**: la huella SHA-256 del archivo identifica exactamente qué modelo está en producción.",
      "- **Ficha del modelo** (model card): qué datos usó, con qué métrica se evaluó y cuáles son sus limitaciones.",
      "- **Deriva de datos**: si la distribución de una variable cambia (subida de precios, nueva campaña), el modelo puede degradarse sin dar ningún error. Se vigila comparando los datos nuevos con los de referencia.",
      "",
      "El **PSI** (índice de estabilidad poblacional) compara proporciones por intervalos: < 0,1 estable, 0,1–0,2 vigilar, > 0,2 cambio importante (umbrales convencionales, no leyes). La prueba **KS** compara las distribuciones completas; con muestras grandes detecta diferencias minúsculas, así que hay que mirar también el tamaño del cambio.",
      "",
      "Recuerda (Mundo 4): joblib/pickle pueden ejecutar código al cargar: carga solo archivos de origen confiable.",
    ],
    formal: "PSI = Σₖ (aₖ − rₖ)·ln(aₖ/rₖ), con rₖ y aₖ las proporciones de referencia y actuales en el intervalo k (intervalos por deciles de la referencia).",
    example: {
      code: py`import hashlib
import joblib
from sklearn.linear_model import LogisticRegression
modelo = LogisticRegression().fit([[0], [1], [2], [3]], [0, 0, 1, 1])
joblib.dump(modelo, "mini.joblib")
huella = hashlib.sha256(open("mini.joblib", "rb").read()).hexdigest()
print(huella[:12], joblib.load("mini.joblib").predict([[2.5]]))`,
      lines: [
        "Hash criptográfico de la biblioteca estándar.",
        "joblib guarda objetos de Python (incluidos modelos) en disco.",
        "Un modelo cualquiera.",
        "Entrenado con cuatro puntos.",
        "Se guarda en un archivo.",
        "La huella del archivo: cambia si cambia un solo bit del modelo.",
        "Los primeros caracteres identifican la versión; el modelo cargado predice igual.",
      ],
    },
    challenge: [
      "Con `clientes.csv`, predictoras `antiguedad_meses`, `cuota_mensual`, `llamadas_soporte`, `fibra` y objetivo `baja`, división 75/25 estratificada `random_state=0`:",
      "1. `pipeline`: `make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))` entrenado. Guárdalo en `modelo.joblib` y cárgalo en `cargado`. `mismas_predicciones`: True si `predict_proba` coincide en prueba.",
      "2. `ficha`: diccionario con `version` (los 12 primeros caracteres del SHA-256 del archivo), `variables` (lista), `n_entrenamiento`, `auc_prueba` y `limitaciones` (lista con al menos dos textos).",
      "3. `psi(referencia, actual, bins=10)`: PSI con los cortes en los cuantiles de la referencia (`np.quantile` con `np.linspace(0, 1, bins + 1)`; el primer corte −∞ y el último +∞), y proporciones con un mínimo de 1e-6 para evitar log(0).",
      "4. El código inicial crea `nuevos` (un mes con la cuota subida un 25 %). `psis`: diccionario variable → PSI entre `X_tr` y `nuevos` para las cuatro predictoras; `alertas`: lista de variables con PSI > 0,2.",
      "5. `ks_cuota`: valor p de `stats.ks_2samp(X_tr.cuota_mensual, nuevos.cuota_mensual)`.",
    ],
    starter: py`import hashlib
import joblib
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

df = pd.read_csv("clientes.csv")
variables = ["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]
nuevos = df.sample(400, random_state=1)[variables].assign(cuota_mensual=lambda d: d.cuota_mensual * 1.25)

pipeline = LogisticRegression()
cargado = pipeline
mismas_predicciones = True
ficha = {}

def psi(referencia, actual, bins=10):
    return abs(np.mean(actual) - np.mean(referencia))

psis = {}
alertas = []
ks_cuota = 1.0`,
    solution: py`import hashlib
import joblib
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

df = pd.read_csv("clientes.csv")
variables = ["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]
nuevos = df.sample(400, random_state=1)[variables].assign(cuota_mensual=lambda d: d.cuota_mensual * 1.25)

X_tr, X_te, y_tr, y_te = train_test_split(df[variables], df["baja"], test_size=0.25, stratify=df["baja"], random_state=0)
pipeline = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)).fit(X_tr, y_tr)
joblib.dump(pipeline, "modelo.joblib")
cargado = joblib.load("modelo.joblib")
mismas_predicciones = bool(np.allclose(pipeline.predict_proba(X_te), cargado.predict_proba(X_te)))

with open("modelo.joblib", "rb") as fh:
    huella = hashlib.sha256(fh.read()).hexdigest()
ficha = {
    "version": huella[:12],
    "variables": variables,
    "n_entrenamiento": len(X_tr),
    "auc_prueba": roc_auc_score(y_te, cargado.predict_proba(X_te)[:, 1]),
    "limitaciones": [
        "Datos sintéticos de una sola compañía: no generaliza a otros mercados.",
        "No incluye el tipo de contrato, una variable muy predictiva.",
        "Las probabilidades no se han calibrado; revisar si cambian los precios.",
    ],
}

def psi(referencia, actual, bins=10):
    referencia, actual = np.asarray(referencia, dtype=float), np.asarray(actual, dtype=float)
    cortes = np.quantile(referencia, np.linspace(0, 1, bins + 1))
    cortes[0], cortes[-1] = -np.inf, np.inf
    cortes = np.unique(cortes)
    r = np.histogram(referencia, cortes)[0] / len(referencia)
    a = np.histogram(actual, cortes)[0] / len(actual)
    r, a = np.clip(r, 1e-6, None), np.clip(a, 1e-6, None)
    return float(np.sum((a - r) * np.log(a / r)))

psis = {v: psi(X_tr[v], nuevos[v]) for v in variables}
alertas = [v for v in variables if psis[v] > 0.2]
ks_cuota = stats.ks_2samp(X_tr.cuota_mensual, nuevos.cuota_mensual).pvalue`,
    tests: py`
import hashlib
import os
import numpy as np

def test_persistencia():
    "Pipeline completo guardado y recargado"
    p = t.get("pipeline")
    assert hasattr(p, "steps") and len(p.steps) == 2, "Guarda el pipeline completo (escalador + modelo)"
    assert os.path.exists("modelo.joblib")
    assert t.get("mismas_predicciones") is True

def test_ficha():
    "Ficha del modelo con versión verificable"
    f = t.get("ficha")
    with open("modelo.joblib", "rb") as fh:
        assert f["version"] == hashlib.sha256(fh.read()).hexdigest()[:12]
    assert f["variables"] == ["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]
    assert f["n_entrenamiento"] == 900 and 0.6 < f["auc_prueba"] < 0.95
    assert len(f["limitaciones"]) >= 2 and all(isinstance(x, str) and len(x) > 10 for x in f["limitaciones"])

def test_psi():
    "PSI: 0 sin cambios, positivo con cambios, simétrico en lo esencial"
    f = t.get("psi", "function")
    rng = np.random.default_rng(0)
    ref = rng.normal(0, 1, 5000)
    assert f(ref, ref) < 1e-9
    assert f(ref, rng.normal(0, 1, 5000)) < 0.02
    assert f(ref, rng.normal(0.5, 1, 5000)) > 0.15
    cortes = np.quantile(ref, np.linspace(0, 1, 11)); cortes[0], cortes[-1] = -np.inf, np.inf
    act = rng.normal(1, 1, 3000)
    r = np.clip(np.histogram(ref, cortes)[0] / 5000, 1e-6, None); a = np.clip(np.histogram(act, cortes)[0] / 3000, 1e-6, None)
    assert approx(f(ref, act), np.sum((a - r) * np.log(a / r)), 1e-9)

def test_deriva():
    "Detecta la subida de la cuota y nada más"
    assert t.get("alertas") == ["cuota_mensual"], t.get("psis")
    assert t.get("psis")["antiguedad_meses"] < 0.1
    assert t.get("ks_cuota") < 1e-6
`,
    hints: [
      "`joblib.dump(pipeline, \"modelo.joblib\")` y `joblib.load(\"modelo.joblib\")`. La huella: `hashlib.sha256(open(..., \"rb\").read()).hexdigest()`.",
      "PSI: calcula los cortes con los cuantiles de la referencia, cambia los extremos por ±∞ (para que entren valores nuevos fuera del rango) y usa `np.histogram` con esos cortes en ambas muestras.",
      "Las variables con pocos valores distintos (como `fibra`) dan cortes repetidos: `np.unique(cortes)` lo resuelve.",
    ],
    errors: [
      { error: "Guardar solo el modelo y no el escalador", fix: "En producción los datos llegarían sin escalar y las predicciones serían absurdas sin ningún error visible." },
      { error: "Cortes del PSI calculados con los datos nuevos", fix: "Los intervalos se fijan con la referencia; si no, cada mes se mediría con una regla distinta." },
      { error: "Cargar archivos .joblib o .pkl de cualquier origen", fix: "Deserializar puede ejecutar código arbitrario: solo archivos que tú o tu equipo hayáis generado." },
    ],
    quiz: {
      question: "Con 100 000 clientes nuevos, la prueba KS da p = 10⁻⁹ para la edad, pero el PSI es 0,01. ¿Qué haces?",
      options: [
        { text: "Probablemente nada urgente: con muestras enormes KS detecta diferencias minúsculas; el PSI indica que el cambio es pequeño" },
        { text: "Reentrenar inmediatamente: p < 0,05 significa que el modelo ya no sirve", misconception: "significacion-relevancia" },
        { text: "Ignorar el PSI porque no tiene valor p" },
        { text: "Concluir que la edad causa las bajas", misconception: "correlacion-causalidad" },
      ],
      answer: 0,
      explanation: "La significación no mide la magnitud. Para decidir si reentrenar importan el tamaño del cambio (PSI, diferencias en cuantiles) y, sobre todo, si el rendimiento del modelo ha empeorado cuando llegan las etiquetas reales.",
    },
    review: "Repasa: guarda el pipeline entero; versiona con la huella; ficha con métricas y limitaciones; PSI y KS para la deriva, mirando la magnitud.",
    xp: 100,
    coins: 15,
  },
];
