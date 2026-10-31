import { clientesCsv, estudiantesCsv, pacientesCsv } from "../datasets";
import { py, type Mission } from "../types";

// Mundo 4 · Zona 11: Estadística computacional con Python. Cada técnica sigue el mismo ciclo:
// intuición → fórmula → significado de los términos → ejemplo resuelto → implementación manual →
// implementación con bibliotecas → verificación → visualización → interpretación → reto.

const ZONE = "Estadística computacional con Python";

export const W4_COMP: Mission[] = [
  {
    id: "ec-welch",
    world: "w4",
    zone: ZONE,
    title: "El escriba y el oráculo: la prueba t de Welch a mano y con SciPy",
    kind: "lesson",
    difficulty: 3,
    skills: ["pruebas-hipotesis", "scipy", "verificacion", "tamano-efecto"],
    requires: ["i-dos-grupos"],
    story: "El oráculo de SciPy da respuestas en una línea, pero el escriba del Imperio no firma nada que no haya calculado él mismo. Tu misión: reproducir a mano la prueba t de Welch del ensayo clínico y demostrar que coincide con la biblioteca.",
    objective: "Implementar la prueba t de Welch (estadístico, grados de libertad, valor p e intervalo de confianza), verificarla contra scipy.stats, visualizar los grupos e interpretar el tamaño del efecto.",
    before: ["Prueba t para dos grupos", "Error estándar", "pandas: filtrar y crear columnas"],
    packages: ["numpy", "pandas", "scipy", "matplotlib"],
    files: { "pacientes.csv": pacientesCsv() },
    intuition: [
      "La prueba t compara la diferencia de medias con su **ruido esperado** (el error estándar). Welch no supone varianzas iguales: es la opción por defecto razonable.",
      "",
      "**Significado de los términos**",
      "",
      "- x̄₁, x̄₂: medias de cada grupo. s₁², s₂²: varianzas muestrales (ddof = 1). n₁, n₂: tamaños.",
      "- EE = √(s₁²/n₁ + s₂²/n₂): error estándar de la diferencia de medias.",
      "- t = (x̄₁ − x̄₂)/EE: cuántos errores estándar separan las medias.",
      "- ν (grados de libertad de Welch-Satterthwaite): ajustan la distribución t cuando las varianzas difieren; no suelen ser enteros.",
      "- p: probabilidad, **si H₀ fuera cierta**, de una |t| al menos tan grande como la observada.",
      "- d de Cohen: diferencia de medias en unidades de desviación típica (tamaño del efecto, independiente de n).",
      "",
      "Implementar a mano y comparar con la biblioteca es una **verificación**: si coinciden, entiendes la fórmula y la biblioteca hace lo que crees.",
    ],
    formal: [
      "t = (x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂)",
      "",
      "ν = (s₁²/n₁ + s₂²/n₂)² / [ (s₁²/n₁)²/(n₁ − 1) + (s₂²/n₂)²/(n₂ − 1) ]",
      "",
      "p = 2·P(T_ν ≥ |t|) · IC: (x̄₁ − x̄₂) ± t_{ν; 0,975}·EE · d = (x̄₁ − x̄₂)/s_p, s_p = √[((n₁−1)s₁² + (n₂−1)s₂²)/(n₁ + n₂ − 2)]",
    ],
    example: {
      code: py`import numpy as np
from scipy import stats
a = np.array([5.1, 4.8, 6.0, 5.5, 5.9])
b = np.array([4.2, 4.0, 4.9, 3.8])
ee = np.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
t = (a.mean() - b.mean()) / ee
print(round(t, 6), round(stats.ttest_ind(a, b, equal_var=False).statistic, 6))`,
      lines: [
        "NumPy para los cálculos.",
        "SciPy para la versión de biblioteca.",
        "Grupo 1 (resuelto a mano, sin datos reales).",
        "Grupo 2.",
        "Error estándar de la diferencia: cada varianza dividida por su n.",
        "Estadístico t: diferencia de medias en unidades de error estándar.",
        "Los dos valores coinciden (3.7255): la fórmula es la que usa SciPy con equal_var=False.",
      ],
    },
    challenge: [
      "Con `pacientes.csv`, crea `cambio` = pas_final − pas_inicial y descarta filas sin pas_final.",
      "1. `cambio_t` y `cambio_c`: arrays de NumPy con el cambio en tratamiento y control.",
      "2. `welch_manual(a, b)`: diccionario con `t`, `gl`, `p` (bilateral, puedes usar `stats.t.sf`), `ic` (tupla del IC 95 % de la diferencia a − b, con `stats.t.ppf`) y `d` (d de Cohen con desviación combinada). Sin usar `ttest_ind`.",
      "3. `manual = welch_manual(cambio_t, cambio_c)` y `biblioteca = stats.ttest_ind(cambio_t, cambio_c, equal_var=False)`.",
      "4. `coinciden`: True si t, p y los extremos del IC (usa `biblioteca.confidence_interval()`) difieren menos de 1e-9.",
      "5. `fig`: un histograma de cada grupo en el mismo eje (con `alpha`), una línea vertical en cada media (`axvline`) y leyenda.",
    ],
    starter: py`import numpy as np
import pandas as pd
from scipy import stats
import matplotlib.pyplot as plt

df = pd.read_csv("pacientes.csv")
cambio_t = df[df.grupo == "tratamiento"].pas_final.to_numpy()
cambio_c = df[df.grupo == "control"].pas_final.to_numpy()

def welch_manual(a, b):
    t = (a.mean() - b.mean()) / np.sqrt(a.var() + b.var())
    return {"t": t, "gl": len(a) + len(b) - 2, "p": 0.05, "ic": (0, 0), "d": 0}

manual = welch_manual(cambio_t, cambio_c)
biblioteca = stats.ttest_ind(cambio_t, cambio_c)
coinciden = True
fig, ax = plt.subplots()`,
    solution: py`import numpy as np
import pandas as pd
from scipy import stats
import matplotlib.pyplot as plt

df = pd.read_csv("pacientes.csv").dropna(subset=["pas_final"])
df["cambio"] = df.pas_final - df.pas_inicial
cambio_t = df[df.grupo == "tratamiento"].cambio.to_numpy()
cambio_c = df[df.grupo == "control"].cambio.to_numpy()

def welch_manual(a, b):
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    n1, n2 = len(a), len(b)
    v1, v2 = a.var(ddof=1) / n1, b.var(ddof=1) / n2
    ee = np.sqrt(v1 + v2)
    dif = a.mean() - b.mean()
    t = dif / ee
    gl = (v1 + v2) ** 2 / (v1 ** 2 / (n1 - 1) + v2 ** 2 / (n2 - 1))
    p = 2 * stats.t.sf(abs(t), gl)
    q = stats.t.ppf(0.975, gl)
    sp = np.sqrt(((n1 - 1) * a.var(ddof=1) + (n2 - 1) * b.var(ddof=1)) / (n1 + n2 - 2))
    return {"t": t, "gl": gl, "p": p, "ic": (dif - q * ee, dif + q * ee), "d": dif / sp}

manual = welch_manual(cambio_t, cambio_c)
biblioteca = stats.ttest_ind(cambio_t, cambio_c, equal_var=False)
ic_lib = biblioteca.confidence_interval()
coinciden = bool(
    abs(manual["t"] - biblioteca.statistic) < 1e-9
    and abs(manual["p"] - biblioteca.pvalue) < 1e-9
    and abs(manual["ic"][0] - ic_lib.low) < 1e-9
    and abs(manual["ic"][1] - ic_lib.high) < 1e-9
)

fig, ax = plt.subplots()
ax.hist(cambio_c, bins=15, alpha=0.6, label="Control")
ax.hist(cambio_t, bins=15, alpha=0.6, label="Tratamiento")
ax.axvline(cambio_c.mean(), linestyle="--", label="Media control")
ax.axvline(cambio_t.mean(), linestyle="--", label="Media tratamiento")
ax.set_xlabel("Cambio en la presión sistólica (mmHg)")
ax.set_title("Cambio de PAS por grupo")
ax.legend()`,
    tests: py`
import numpy as np
import pandas as pd
from scipy import stats

def _ref():
    df = pd.read_csv("pacientes.csv").dropna(subset=["pas_final"])
    df["c"] = df.pas_final - df.pas_inicial
    return df[df.grupo == "tratamiento"].c.to_numpy(), df[df.grupo == "control"].c.to_numpy()

def test_datos():
    "Cambio por grupo, sin faltantes"
    a, b = _ref()
    ct, cc = t.get("cambio_t"), t.get("cambio_c")
    assert len(ct) == len(a) and len(cc) == len(b), "Descarta las filas sin pas_final"
    assert np.allclose(np.sort(ct), np.sort(a)) and np.allclose(np.sort(cc), np.sort(b))

def test_manual_contra_scipy():
    "Tu Welch reproduce scipy en datos nuevos"
    f = t.get("welch_manual", "function")
    rng = np.random.default_rng(11)
    x, y = rng.normal(3, 1, 12), rng.normal(2, 3, 30)
    r = f(x, y)
    ref = stats.ttest_ind(x, y, equal_var=False)
    ic = ref.confidence_interval()
    assert approx(r["t"], ref.statistic, 1e-10) and approx(r["p"], ref.pvalue, 1e-10)
    assert approx(r["gl"], ref.df, 1e-10), "Revisa los grados de libertad de Welch-Satterthwaite"
    assert approx(r["ic"][0], ic.low, 1e-9) and approx(r["ic"][1], ic.high, 1e-9)
    sp = np.sqrt((11 * x.var(ddof=1) + 29 * y.var(ddof=1)) / 40)
    assert approx(r["d"], (x.mean() - y.mean()) / sp, 1e-10)

def test_verificacion():
    "Comparación con la biblioteca en el ensayo"
    a, b = _ref()
    ref = stats.ttest_ind(a, b, equal_var=False)
    assert t.get("coinciden") is True
    assert approx(t.get("biblioteca").statistic, ref.statistic, 1e-10), "biblioteca debe ser Welch (equal_var=False)"
    assert approx(t.get("manual")["t"], ref.statistic, 1e-10)

def test_figura():
    "Dos histogramas, dos medias y leyenda"
    ax = t.get("fig").axes[0]
    assert len(ax.patches) >= 20, "Dibuja un histograma por grupo"
    assert len(ax.get_lines()) >= 2, "Marca la media de cada grupo con axvline"
    assert ax.get_legend() is not None
`,
    hints: [
      "Primero `dropna(subset=[\"pas_final\"])`, después crea la columna `cambio` y filtra por grupo.",
      "En `welch_manual` usa `var(ddof=1)`: la varianza muestral. Calcula v1 = s₁²/n₁ y v2 = s₂²/n₂ y reutilízalas para EE y para los grados de libertad.",
      "p = 2·stats.t.sf(|t|, gl); IC = dif ± stats.t.ppf(0.975, gl)·EE.",
    ],
    errors: [
      { error: "Usar var() sin ddof=1", fix: "NumPy usa ddof = 0 por defecto (varianza poblacional): el t no coincidirá con SciPy." },
      { error: "Llamar a ttest_ind sin equal_var=False", fix: "Por defecto SciPy hace la t de Student con varianza combinada, que supone varianzas iguales." },
      { error: "Comparar decimales con ==", fix: "Dos cálculos correctos pueden diferir en el último bit: compara con una tolerancia." },
    ],
    quiz: {
      question: "El tratamiento reduce la PAS 8 mmHg más que el control (IC 95 %: 5,3 a 10,8; p < 0,001; d ≈ 0,9). ¿Qué conclusión es correcta?",
      options: [
        { text: "Si no hubiera diferencia real, una diferencia así sería muy improbable; el efecto estimado es grande y el IC excluye diferencias pequeñas" },
        { text: "Hay menos de un 0,1 % de probabilidad de que el tratamiento no funcione", misconception: "p-valor" },
        { text: "El 95 % de los pacientes tratados bajará entre 5,3 y 10,8 mmHg", misconception: "ic-interpretacion" },
        { text: "Como p es muy pequeño, el efecto es clínicamente importante sin necesidad de mirar su tamaño", misconception: "significacion-relevancia" },
      ],
      answer: 0,
      explanation: "El valor p se calcula suponiendo H₀ cierta; no es la probabilidad de H₀. El IC habla de la diferencia de medias, no de pacientes individuales. La relevancia clínica se juzga con el tamaño del efecto y su intervalo, no con p.",
    },
    advanced: {
      title: "El IC bootstrap de la diferencia",
      prompt: "Escribe `ic_bootstrap(a, b, reps=4000, semilla=0)` que remuestree cada grupo con reemplazo (con `np.random.default_rng(semilla)`) y devuelva el IC percentil 95 % de la diferencia de medias. En el ensayo debería parecerse mucho al de Welch.",
      starter: py`import numpy as np

def ic_bootstrap(a, b, reps=4000, semilla=0):
    d = np.mean(a) - np.mean(b)
    return (d, d)`,
      solution: py`import numpy as np

def ic_bootstrap(a, b, reps=4000, semilla=0):
    rng = np.random.default_rng(semilla)
    a, b = np.asarray(a), np.asarray(b)
    difs = [rng.choice(a, len(a)).mean() - rng.choice(b, len(b)).mean() for _ in range(reps)]
    return tuple(np.percentile(difs, [2.5, 97.5]))`,
      tests: py`
import numpy as np
from scipy import stats

def test_boot():
    "Parecido al IC de Welch con datos normales"
    f = t.get("ic_bootstrap", "function")
    rng = np.random.default_rng(5)
    x, y = rng.normal(10, 2, 60), rng.normal(8, 2, 60)
    lo, hi = f(x, y)
    ref = stats.ttest_ind(x, y, equal_var=False).confidence_interval()
    assert abs(lo - ref.low) < 0.25 and abs(hi - ref.high) < 0.25, ((lo, hi), ref)
    assert f(x, y, semilla=3) == f(x, y, semilla=3), "Con la misma semilla debe dar lo mismo"
`,
    },
    lab: { lab: "estadistica", tab: "potencia", label: "Errores y potencia" },
    review: "Repasa: EE de Welch, gl de Welch-Satterthwaite, p calculado bajo H₀, y verificar siempre contra la biblioteca con tolerancia.",
    xp: 90,
    coins: 13,
  },
  {
    id: "ec-ols",
    world: "w4",
    zone: ZONE,
    title: "Los engranajes de la recta: mínimos cuadrados a mano y con statsmodels",
    kind: "lesson",
    difficulty: 4,
    skills: ["regresion", "algebra-lineal", "statsmodels", "verificacion", "supuestos"],
    requires: ["ec-welch", "r-lineal", "m-matrices"],
    story: "La gran máquina del Imperio calcula regresiones, pero sus engranajes están ocultos. Vas a construir los tuyos con álgebra lineal, comprobar que giran igual que los de statsmodels y revisar si los supuestos se cumplen.",
    objective: "Calcular coeficientes, errores estándar, t, intervalos y R² de una regresión múltiple con matrices; verificarlos contra statsmodels; diagnosticar los residuos.",
    before: ["Regresión lineal simple y múltiple", "Ecuaciones normales (m-matrices)", "Distribución t"],
    packages: ["numpy", "pandas", "scipy", "statsmodels", "matplotlib"],
    files: { "estudiantes.csv": estudiantesCsv() },
    intuition: [
      "Mínimos cuadrados elige los coeficientes β que hacen **mínima la suma de residuos al cuadrado**. Geométricamente, ŷ = Xβ̂ es la proyección de y sobre el espacio de las columnas de X.",
      "",
      "**Significado de los términos**",
      "",
      "- X: matriz de diseño (una columna de unos para el intercepto y una por predictora). n filas, p columnas.",
      "- β̂: coeficientes. Cada uno es el cambio esperado en y por unidad de su predictora **manteniendo fijas las demás**.",
      "- e = y − Xβ̂: residuos. RSS = Σeᵢ²; σ̂² = RSS/(n − p): varianza residual.",
      "- EE(β̂ⱼ) = √(σ̂²·[(XᵀX)⁻¹]ⱼⱼ); t = β̂ⱼ/EE; IC = β̂ⱼ ± t_{n−p; 0,975}·EE.",
      "- R² = 1 − RSS/TSS: proporción de la variabilidad de y explicada por el modelo.",
      "",
      "Los EE y los p valen si se cumplen los **supuestos**: linealidad, independencia, varianza constante de los residuos y (para muestras pequeñas) normalidad. El gráfico de residuos frente a ajustados es la primera revisión.",
    ],
    formal: [
      "β̂ = (XᵀX)⁻¹Xᵀy · Var(β̂) = σ̂²(XᵀX)⁻¹ · σ̂² = RSS/(n − p)",
      "",
      "R² = 1 − Σ(yᵢ − ŷᵢ)² / Σ(yᵢ − ȳ)²",
    ],
    example: {
      code: py`import numpy as np
x = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
y = np.array([2.1, 3.9, 6.2, 7.8, 10.1])
X = np.column_stack([np.ones(5), x])
beta = np.linalg.solve(X.T @ X, X.T @ y)
residuos = y - X @ beta
print(beta.round(3), round(1 - (residuos ** 2).sum() / ((y - y.mean()) ** 2).sum(), 4))`,
      lines: [
        "NumPy.",
        "Predictora.",
        "Respuesta (casi y = 2x).",
        "Matriz de diseño: columna de unos (intercepto) y x.",
        "Ecuaciones normales resueltas sin invertir.",
        "Residuos: lo que el modelo no explica.",
        "β ≈ [0.05, 1.99] y R² ≈ 0,997.",
      ],
    },
    challenge: [
      "Con `estudiantes.csv` y el modelo nota_final ~ horas_estudio + asistencia + nota_previa:",
      "1. `ols_manual(X, y)`: X es un DataFrame **sin** columna de unos. Devuelve un DataFrame indexado por `[\"const\", *X.columns]` con columnas `coef`, `ee`, `t`, `p`, `ic_inf`, `ic_sup`, calculado con matrices (puedes usar `stats.t`). Añade el atributo `r2` al resultado: `tabla.attrs[\"r2\"] = …`.",
      "2. `tabla = ols_manual(...)` con los datos y `modelo = smf.ols(\"nota_final ~ horas_estudio + asistencia + nota_previa\", data=df).fit()`.",
      "3. `coinciden`: True si coeficientes, EE, p e intervalos coinciden con `modelo.params`, `modelo.bse`, `modelo.pvalues` y `modelo.conf_int()` (tolerancia 1e-8), y R² con `modelo.rsquared`.",
      "4. `fig`: residuos frente a valores ajustados (`scatter`) con una línea horizontal en 0 (`axhline`), título y etiquetas.",
    ],
    starter: py`import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.formula.api as smf
import matplotlib.pyplot as plt

df = pd.read_csv("estudiantes.csv")
predictoras = ["horas_estudio", "asistencia", "nota_previa"]

def ols_manual(X, y):
    beta = np.linalg.solve(X.T @ X, X.T @ y)
    tabla = pd.DataFrame({"coef": beta}, index=X.columns)
    tabla.attrs["r2"] = 0
    return tabla

tabla = ols_manual(df[predictoras], df.nota_final)
modelo = smf.ols("nota_final ~ horas_estudio", data=df).fit()
coinciden = False
fig, ax = plt.subplots()`,
    solution: py`import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.formula.api as smf
import matplotlib.pyplot as plt

df = pd.read_csv("estudiantes.csv")
predictoras = ["horas_estudio", "asistencia", "nota_previa"]

def ols_manual(X, y):
    nombres = ["const", *X.columns]
    Xd = np.column_stack([np.ones(len(X)), X.to_numpy(dtype=float)])
    y = np.asarray(y, dtype=float)
    n, p = Xd.shape
    XtX = Xd.T @ Xd
    beta = np.linalg.solve(XtX, Xd.T @ y)
    residuos = y - Xd @ beta
    sigma2 = residuos @ residuos / (n - p)
    ee = np.sqrt(sigma2 * np.diag(np.linalg.inv(XtX)))
    tval = beta / ee
    q = stats.t.ppf(0.975, n - p)
    tabla = pd.DataFrame(
        {"coef": beta, "ee": ee, "t": tval, "p": 2 * stats.t.sf(np.abs(tval), n - p), "ic_inf": beta - q * ee, "ic_sup": beta + q * ee},
        index=nombres,
    )
    tabla.attrs["r2"] = 1 - residuos @ residuos / ((y - y.mean()) @ (y - y.mean()))
    return tabla

tabla = ols_manual(df[predictoras], df.nota_final)
modelo = smf.ols("nota_final ~ horas_estudio + asistencia + nota_previa", data=df).fit()
nombres = ["Intercept", *predictoras]
ic = modelo.conf_int().loc[nombres].to_numpy()
coinciden = bool(
    np.allclose(tabla.coef, modelo.params[nombres], atol=1e-8)
    and np.allclose(tabla.ee, modelo.bse[nombres], atol=1e-8)
    and np.allclose(tabla.p, modelo.pvalues[nombres], atol=1e-8)
    and np.allclose(tabla[["ic_inf", "ic_sup"]].to_numpy(), ic, atol=1e-8)
    and abs(tabla.attrs["r2"] - modelo.rsquared) < 1e-8
)

fig, ax = plt.subplots()
ax.scatter(modelo.fittedvalues, modelo.resid, s=12)
ax.axhline(0, color="black", linewidth=1)
ax.set_xlabel("Valor ajustado")
ax.set_ylabel("Residuo")
ax.set_title("Residuos frente a ajustados")`,
    tests: py`
import numpy as np
import pandas as pd
import statsmodels.api as sm

def test_manual_en_datos_nuevos():
    "Tu OLS reproduce statsmodels en otros datos"
    f = t.get("ols_manual", "function")
    rng = np.random.default_rng(2)
    X = pd.DataFrame(rng.normal(size=(40, 2)), columns=["a", "b"])
    y = 1 + 2 * X.a - 0.5 * X.b + rng.normal(scale=0.7, size=40)
    tab = f(X, y)
    ref = sm.OLS(y, sm.add_constant(X)).fit()
    assert list(tab.index) == ["const", "a", "b"], list(tab.index)
    assert np.allclose(tab.coef, ref.params, atol=1e-10) and np.allclose(tab.ee, ref.bse, atol=1e-10)
    assert np.allclose(tab.t, ref.tvalues, atol=1e-8) and np.allclose(tab.p, ref.pvalues, atol=1e-10)
    assert np.allclose(tab[["ic_inf", "ic_sup"]].to_numpy(), ref.conf_int().to_numpy(), atol=1e-10)
    assert approx(tab.attrs["r2"], ref.rsquared, 1e-10)

def test_verificacion():
    "Comparación con statsmodels en estudiantes.csv"
    m = t.get("modelo")
    assert len(m.params) == 4, "El modelo de statsmodels debe tener las tres predictoras"
    assert t.get("coinciden") is True
    assert np.allclose(t.get("tabla").coef.to_numpy(), m.params.to_numpy(), atol=1e-8)

def test_residuos():
    "Gráfico de diagnóstico"
    ax = t.get("fig").axes[0]
    assert ax.collections and len(ax.collections[0].get_offsets()) == 200, "Un punto por estudiante"
    assert any(np.allclose(l.get_ydata(), 0) for l in ax.get_lines()), "Falta la línea horizontal en 0"
    assert ax.get_title() and ax.get_xlabel() and ax.get_ylabel()
`,
    hints: [
      "Matriz de diseño: `np.column_stack([np.ones(len(X)), X.to_numpy(dtype=float)])`. n − p son los grados de libertad residuales.",
      "Los EE salen de la diagonal de σ̂²·(XᵀX)⁻¹. Aquí sí necesitas la inversa (solo su diagonal).",
      "statsmodels llama `Intercept` al término constante en las fórmulas: compara por posición o reordena con `.loc`.",
    ],
    errors: [
      { error: "Dividir RSS entre n", fix: "σ̂² = RSS/(n − p): se pierden p grados de libertad al estimar p coeficientes." },
      { error: "Olvidar la columna de unos", fix: "Sin ella la recta está obligada a pasar por el origen y todos los coeficientes cambian." },
      { error: "Interpretar un coeficiente de regresión múltiple como el efecto total", fix: "Es el efecto manteniendo constantes las demás predictoras del modelo; con otras predictoras cambia." },
    ],
    quiz: {
      question: "El gráfico de residuos frente a ajustados muestra un embudo: los residuos se abren a medida que crece el valor ajustado. ¿Qué implica?",
      options: [
        { text: "Heterocedasticidad: los coeficientes pueden seguir siendo razonables, pero los EE, los p y los IC habituales no son fiables" },
        { text: "Que el modelo es perfecto porque los residuos están centrados en cero", misconception: "supuestos" },
        { text: "Que hay que transformar las predictoras a normales" },
        { text: "Que el R² es necesariamente bajo" },
      ],
      answer: 0,
      explanation: "La fórmula de Var(β̂) supone varianza constante. Con heterocedasticidad se usan errores estándar robustos (HC3), se transforma la respuesta o se modela la varianza. Lo que se supone normal son los residuos, no las predictoras.",
    },
    lab: { lab: "estadistica", tab: "regresion", label: "Regresión y correlación" },
    review: "Repasa: β̂ = (XᵀX)⁻¹Xᵀy, σ̂² = RSS/(n − p), EE desde la diagonal; los EE dependen de los supuestos.",
    xp: 100,
    coins: 15,
  },
  {
    id: "ec-permutaciones",
    world: "w4",
    zone: ZONE,
    title: "La lotería del tribunal: pruebas de permutación",
    kind: "lesson",
    difficulty: 3,
    skills: ["pruebas-hipotesis", "simulacion", "verificacion"],
    requires: ["ec-welch"],
    story: "El tribunal sospecha de las fórmulas: «¿Y si los datos no son normales?». Propones algo que cualquiera entiende: si el tratamiento no hiciera nada, las etiquetas serían intercambiables. Barajemos y veamos.",
    objective: "Construir una prueba de permutación, verificarla con la enumeración exacta en datos pequeños y compararla con la prueba t.",
    before: ["Valor p", "Prueba t de Welch (misión anterior)", "Generadores aleatorios con semilla"],
    packages: ["numpy", "pandas", "scipy", "matplotlib"],
    files: { "pacientes.csv": pacientesCsv() },
    intuition: [
      "Bajo H₀ («el grupo no influye») la asignación de etiquetas es arbitraria. Si barajamos las etiquetas muchas veces y recalculamos la diferencia de medias, obtenemos su **distribución bajo H₀** sin suponer normalidad.",
      "",
      "**Significado de los términos**",
      "",
      "- Diferencia observada: x̄_trat − x̄_ctrl con las etiquetas reales.",
      "- Permutación: reasignar al azar las etiquetas manteniendo los tamaños de grupo.",
      "- p de permutación: proporción de permutaciones con |diferencia| ≥ |observada|. Con B permutaciones aleatorias se usa (k + 1)/(B + 1) para no obtener nunca p = 0 y para que la prueba sea válida.",
      "- Prueba **exacta**: con pocos datos se pueden enumerar todas las asignaciones posibles (combinaciones).",
      "",
      "Verificar que la versión aleatoria se acerca a la exacta en un caso pequeño es la forma de comprobar que el código es correcto.",
    ],
    formal: "p = (1 + #{b : |D_b| ≥ |D_obs|}) / (B + 1). Número de asignaciones distintas: C(n₁ + n₂, n₁).",
    example: {
      code: py`import numpy as np
a = np.array([12.0, 15.0, 14.0])
b = np.array([9.0, 10.0, 11.0, 8.0])
todo = np.concatenate([a, b])
rng = np.random.default_rng(0)
barajado = rng.permutation(todo)
print(a.mean() - b.mean(), barajado[:3].mean() - barajado[3:].mean())`,
      lines: [
        "NumPy.",
        "Grupo A.",
        "Grupo B.",
        "Juntamos los datos: bajo H₀ las etiquetas no importan.",
        "Generador con semilla: el resultado es reproducible.",
        "Una permutación: reparte los mismos valores al azar.",
        "Diferencia real (4.17) frente a la de un reparto al azar.",
      ],
    },
    challenge: [
      "1. `p_exacto(a, b)`: valor p bilateral exacto enumerando **todas** las formas de elegir len(a) elementos de los datos combinados (`itertools.combinations` de índices). Cuenta las asignaciones con |dif| ≥ |dif observada| − 1e-12.",
      "2. `permutacion(a, b, n_perm=10000, semilla=0)`: diccionario con `dif` (observada), `p` = (k + 1)/(n_perm + 1) y `distribucion` (array con las n_perm diferencias), usando `np.random.default_rng(semilla).permutation`.",
      "3. Con `pacientes.csv` (cambio = pas_final − pas_inicial, sin faltantes): `resultado = permutacion(cambio_t, cambio_c)` y `p_welch` de `stats.ttest_ind(..., equal_var=False)`.",
      "4. `fig`: histograma de `resultado[\"distribucion\"]` con líneas verticales en ±dif observada.",
    ],
    starter: py`import itertools
import numpy as np
import pandas as pd
from scipy import stats
import matplotlib.pyplot as plt

def p_exacto(a, b):
    return 0.5

def permutacion(a, b, n_perm=10000, semilla=0):
    return {"dif": np.mean(a) - np.mean(b), "p": 0.05, "distribucion": np.zeros(n_perm)}

df = pd.read_csv("pacientes.csv")
cambio_t = cambio_c = np.zeros(3)
resultado = permutacion(cambio_t, cambio_c)
p_welch = 1.0
fig, ax = plt.subplots()`,
    solution: py`import itertools
import numpy as np
import pandas as pd
from scipy import stats
import matplotlib.pyplot as plt

def p_exacto(a, b):
    todo = np.concatenate([a, b]).astype(float)
    n1 = len(a)
    obs = abs(np.mean(a) - np.mean(b))
    total = extremos = 0
    for idx in itertools.combinations(range(len(todo)), n1):
        mascara = np.zeros(len(todo), dtype=bool)
        mascara[list(idx)] = True
        d = abs(todo[mascara].mean() - todo[~mascara].mean())
        total += 1
        extremos += d >= obs - 1e-12
    return extremos / total

def permutacion(a, b, n_perm=10000, semilla=0):
    rng = np.random.default_rng(semilla)
    todo = np.concatenate([a, b]).astype(float)
    n1 = len(a)
    obs = np.mean(a) - np.mean(b)
    dist = np.empty(n_perm)
    for i in range(n_perm):
        x = rng.permutation(todo)
        dist[i] = x[:n1].mean() - x[n1:].mean()
    k = np.sum(np.abs(dist) >= abs(obs) - 1e-12)
    return {"dif": obs, "p": (k + 1) / (n_perm + 1), "distribucion": dist}

df = pd.read_csv("pacientes.csv").dropna(subset=["pas_final"])
df["cambio"] = df.pas_final - df.pas_inicial
cambio_t = df[df.grupo == "tratamiento"].cambio.to_numpy()
cambio_c = df[df.grupo == "control"].cambio.to_numpy()
resultado = permutacion(cambio_t, cambio_c)
p_welch = stats.ttest_ind(cambio_t, cambio_c, equal_var=False).pvalue

fig, ax = plt.subplots()
ax.hist(resultado["distribucion"], bins=40, alpha=0.8, label="Diferencias al barajar")
ax.axvline(resultado["dif"], color="black", label="Observada")
ax.axvline(-resultado["dif"], color="black", linestyle="--")
ax.set_title("Distribución de la diferencia bajo H0")
ax.legend()`,
    tests: py`
import itertools
import numpy as np
import pandas as pd
from scipy import stats

A = np.array([12.0, 15.0, 14.0, 13.0])
B = np.array([9.0, 10.0, 11.0, 8.0, 12.0])

def _exacto(a, b):
    todo = np.concatenate([a, b]); n1 = len(a); obs = abs(a.mean() - b.mean()); k = n = 0
    for idx in itertools.combinations(range(len(todo)), n1):
        m = np.zeros(len(todo), bool); m[list(idx)] = True
        k += abs(todo[m].mean() - todo[~m].mean()) >= obs - 1e-12; n += 1
    return k / n

def test_exacto():
    "Enumeración completa"
    f = t.get("p_exacto", "function")
    assert approx(f(A, B), _exacto(A, B), 1e-12), f(A, B)
    assert approx(f(np.array([1.0, 2.0]), np.array([1.5, 2.5, 1.0])), _exacto(np.array([1.0, 2.0]), np.array([1.5, 2.5, 1.0])), 1e-12)

def test_aleatoria_se_acerca_a_exacta():
    "Verificación: permutaciones al azar ≈ exacta"
    f = t.get("permutacion", "function")
    r = f(A, B, n_perm=20000, semilla=1)
    assert len(r["distribucion"]) == 20000
    assert abs(r["p"] - _exacto(A, B)) < 0.01, (r["p"], _exacto(A, B))
    assert approx(r["dif"], A.mean() - B.mean())
    assert f(A, B, 500, 7)["p"] == f(A, B, 500, 7)["p"], "Con la misma semilla, el mismo resultado"
    assert f(A, A + 0.0, 999, 2)["p"] >= 0.5 and f(A, B, 99, 3)["p"] > 0, "p nunca es 0"

def test_ensayo():
    "Coherente con Welch en el ensayo"
    r = t.get("resultado")
    df = pd.read_csv("pacientes.csv").dropna(subset=["pas_final"])
    c = df.pas_final - df.pas_inicial
    a, b = c[df.grupo == "tratamiento"], c[df.grupo == "control"]
    assert approx(r["dif"], a.mean() - b.mean())
    assert approx(t.get("p_welch"), stats.ttest_ind(a, b, equal_var=False).pvalue, 1e-10)
    assert r["p"] <= 2 / 10001, "Ninguna permutación debería igualar una diferencia tan grande"
    assert abs(np.mean(r["distribucion"])) < 0.3, "Bajo H0 la distribución está centrada en 0"

def test_figura():
    "Histograma y diferencia observada"
    ax = t.get("fig").axes[0]
    assert len(ax.patches) >= 20 and len(ax.get_lines()) >= 2
`,
    hints: [
      "Exacta: `for idx in itertools.combinations(range(n), len(a))` crea una máscara booleana con esos índices; el resto es el otro grupo.",
      "Aleatoria: en cada vuelta `x = rng.permutation(todo)`; los primeros len(a) son el grupo A.",
      "El +1 en numerador y denominador cuenta la propia asignación observada como una de las posibles.",
    ],
    errors: [
      { error: "Crear el generador dentro del bucle con la misma semilla", fix: "Todas las permutaciones serían idénticas. Crea `rng` una vez y llama a `rng.permutation` en cada vuelta." },
      { error: "Usar k/B sin el +1", fix: "Puede dar p = 0, que es imposible: la asignación observada es una de las posibles." },
      { error: "Comparar diferencias sin valor absoluto en una prueba bilateral", fix: "Cuenta los extremos en ambas colas con |dif| ≥ |observada|." },
    ],
    quiz: {
      question: "¿Qué supone una prueba de permutación para dos grupos?",
      options: [
        { text: "Que bajo H₀ las observaciones son intercambiables entre grupos (por ejemplo, gracias a la aleatorización)" },
        { text: "Que los datos siguen una distribución normal", misconception: "normalidad-universal" },
        { text: "Nada en absoluto: no tiene supuestos" },
        { text: "Que los dos grupos tienen el mismo tamaño" },
      ],
      answer: 0,
      explanation: "No necesita normalidad, pero sí intercambiabilidad bajo H₀. Si los grupos difieren en varianza o en otras características aunque las medias sean iguales, el p puede no tener el significado que se le da. La aleatorización del ensayo es lo que la justifica.",
    },
    lab: { lab: "estadistica", tab: "bootstrap", label: "Bootstrap" },
    review: "Repasa: permutar etiquetas = simular H₀; p = (k + 1)/(B + 1); verificar contra la versión exacta en datos pequeños.",
    xp: 85,
    coins: 12,
  },
  {
    id: "ec-verosimilitud",
    world: "w4",
    zone: ZONE,
    title: "El cazador de parámetros: máxima verosimilitud",
    kind: "lesson",
    difficulty: 4,
    skills: ["verosimilitud", "optimizacion", "scipy", "verificacion"],
    requires: ["ec-permutaciones", "m-integrales"],
    story: "Las llamadas al servicio de soporte del reino llegan de forma irregular. El cazador de parámetros busca el valor de λ que hace los datos observados lo más plausibles posible, y lo encuentra subiendo una colina.",
    objective: "Escribir funciones de log-verosimilitud, maximizarlas numéricamente con scipy.optimize, comprobar que coinciden con las fórmulas cerradas y estimar su error estándar con la curvatura.",
    before: ["Distribuciones de Poisson y normal", "Derivadas", "Logaritmos"],
    packages: ["numpy", "pandas", "scipy", "matplotlib"],
    files: { "clientes.csv": clientesCsv() },
    intuition: [
      "La **verosimilitud** L(θ) responde: si el parámetro valiera θ, ¿qué probabilidad tendrían exactamente estos datos? El estimador de **máxima verosimilitud** (EMV) es el θ que la hace mayor.",
      "",
      "**Significado de los términos**",
      "",
      "- ℓ(θ) = log L(θ) = Σ log f(xᵢ; θ): se usa el logaritmo porque convierte productos en sumas y evita números diminutos.",
      "- θ̂: el máximo de ℓ. Se encuentra con una derivada igual a 0 (fórmula cerrada) o con un optimizador (minimizando −ℓ).",
      "- Información observada I(θ̂) = −ℓ″(θ̂): la curvatura en el máximo. Una colina estrecha = datos muy informativos.",
      "- EE(θ̂) ≈ 1/√I(θ̂).",
      "",
      "Para la Poisson el EMV es la media; para la normal, la media y la desviación con divisor n (no n − 1). Comprobarlo numéricamente es una verificación del optimizador y de tu ℓ.",
    ],
    formal: [
      "Poisson: ℓ(λ) = Σ [xᵢ log λ − λ − log xᵢ!] ⇒ λ̂ = x̄, I(λ̂) = n/λ̂",
      "",
      "Normal: ℓ(μ, σ) = −n log σ − Σ(xᵢ − μ)²/(2σ²) − (n/2) log 2π ⇒ μ̂ = x̄, σ̂² = Σ(xᵢ − x̄)²/n",
    ],
    example: {
      code: py`import numpy as np
from scipy import optimize, stats
x = np.array([2, 0, 3, 1, 4, 2])
neg = lambda lam: -stats.poisson.logpmf(x, lam).sum()
res = optimize.minimize_scalar(neg, bounds=(0.01, 20), method="bounded")
print(round(res.x, 5), x.mean())`,
      lines: [
        "NumPy.",
        "SciPy: optimizador y distribuciones.",
        "Recuentos observados.",
        "Menos la log-verosimilitud (los optimizadores minimizan).",
        "Busca el mínimo en un intervalo.",
        "2.0 frente a la media 2.0: el EMV de la Poisson es la media.",
      ],
    },
    challenge: [
      "1. `logver_poisson(lam, x)`: Σ [xᵢ log λ − λ − log xᵢ!] escrita por ti (usa `scipy.special.gammaln(x + 1)` para log x!).",
      "2. `emv_poisson(x)`: λ̂ maximizando numéricamente tu `logver_poisson` con `optimize.minimize_scalar(..., bounds=(1e-6, max(x) + 1), method=\"bounded\")`.",
      "3. `ee_numerico(logver, theta, x, h=1e-4)`: EE = 1/√(−ℓ″(θ)), con ℓ″ por diferencias centrales: [ℓ(θ + h) − 2ℓ(θ) + ℓ(θ − h)]/h².",
      "4. `emv_normal(x)`: tupla (μ̂, σ̂) minimizando −ℓ con `optimize.minimize` sobre (μ, log σ) (así σ siempre es positiva).",
      "5. Con `clientes.csv`: `lam_hat` = EMV de `llamadas_soporte` y `ee_lam` su error estándar numérico.",
      "6. `fig`: curva de ℓ(λ) para λ en [1, 3] con una línea vertical en λ̂.",
    ],
    starter: py`import numpy as np
import pandas as pd
from scipy import optimize, special
import matplotlib.pyplot as plt

def logver_poisson(lam, x):
    return np.sum(x * np.log(lam))

def emv_poisson(x):
    return np.median(x)

def ee_numerico(logver, theta, x, h=1e-4):
    return 1 / np.sqrt(len(x))

def emv_normal(x):
    return np.mean(x), np.std(x, ddof=1)

df = pd.read_csv("clientes.csv")
lam_hat = emv_poisson(df.llamadas_soporte.to_numpy())
ee_lam = 0
fig, ax = plt.subplots()`,
    solution: py`import numpy as np
import pandas as pd
from scipy import optimize, special
import matplotlib.pyplot as plt

def logver_poisson(lam, x):
    x = np.asarray(x, dtype=float)
    return float(np.sum(x * np.log(lam) - lam - special.gammaln(x + 1)))

def emv_poisson(x):
    res = optimize.minimize_scalar(lambda lam: -logver_poisson(lam, x), bounds=(1e-6, max(x) + 1), method="bounded", options={"xatol": 1e-10})
    return res.x

def ee_numerico(logver, theta, x, h=1e-4):
    segunda = (logver(theta + h, x) - 2 * logver(theta, x) + logver(theta - h, x)) / h ** 2
    return 1 / np.sqrt(-segunda)

def emv_normal(x):
    x = np.asarray(x, dtype=float)
    def neg(par):
        mu, log_s = par
        s = np.exp(log_s)
        return len(x) * np.log(s) + np.sum((x - mu) ** 2) / (2 * s ** 2)
    res = optimize.minimize(neg, x0=[np.median(x), np.log(np.std(x) + 1e-9)], method="Nelder-Mead", options={"xatol": 1e-10, "fatol": 1e-12, "maxiter": 5000})
    return res.x[0], float(np.exp(res.x[1]))

df = pd.read_csv("clientes.csv")
llamadas = df.llamadas_soporte.to_numpy()
lam_hat = emv_poisson(llamadas)
ee_lam = ee_numerico(logver_poisson, lam_hat, llamadas)

fig, ax = plt.subplots()
grid = np.linspace(1, 3, 200)
ax.plot(grid, [logver_poisson(g, llamadas) for g in grid], label="log-verosimilitud")
ax.axvline(lam_hat, linestyle="--", label="EMV")
ax.set_xlabel("λ")
ax.set_title("La colina de la verosimilitud")
ax.legend()`,
    tests: py`
import numpy as np
import pandas as pd
from scipy import stats

def test_logver():
    "Igual que scipy.stats.poisson.logpmf"
    f = t.get("logver_poisson", "function")
    x = np.array([0, 1, 4, 2, 7, 3])
    for lam in (0.5, 2.0, 6.3):
        assert approx(f(lam, x), stats.poisson.logpmf(x, lam).sum(), 1e-10)

def test_emv_poisson():
    "El optimizador encuentra la media"
    f = t.get("emv_poisson", "function")
    x = np.random.default_rng(4).poisson(3.7, 300)
    assert abs(f(x) - x.mean()) < 1e-6

def test_ee():
    "Curvatura: EE = √(λ̂/n)"
    lv = t.get("logver_poisson", "function")
    ee = t.get("ee_numerico", "function")
    x = np.random.default_rng(8).poisson(2.5, 400)
    lam = x.mean()
    assert abs(ee(lv, lam, x) - np.sqrt(lam / len(x))) < 1e-4

def test_emv_normal():
    "μ̂ = media, σ̂ con divisor n (como stats.norm.fit)"
    f = t.get("emv_normal", "function")
    x = np.random.default_rng(1).normal(50, 8, 250)
    mu, s = f(x)
    ref_mu, ref_s = stats.norm.fit(x)
    assert abs(mu - ref_mu) < 1e-5 and abs(s - ref_s) < 1e-5, ((mu, s), (ref_mu, ref_s))
    assert s < np.std(x, ddof=1), "El EMV de σ usa n, no n − 1"

def test_clientes():
    "Llamadas a soporte"
    x = pd.read_csv("clientes.csv").llamadas_soporte
    assert abs(t.get("lam_hat") - x.mean()) < 1e-6
    assert abs(t.get("ee_lam") - np.sqrt(x.mean() / len(x))) < 1e-4

def test_figura():
    "Curva con su máximo marcado"
    ax = t.get("fig").axes[0]
    lineas = ax.get_lines()
    assert len(lineas) >= 2
    curva = max(lineas, key=lambda l: len(l.get_xdata()))
    xs, ys = np.asarray(curva.get_xdata()), np.asarray(curva.get_ydata())
    assert abs(xs[np.argmax(ys)] - t.get("lam_hat")) < 0.02, "El máximo de la curva debe estar en λ̂"
`,
    hints: [
      "logver: `np.sum(x * np.log(lam) - lam - special.gammaln(x + 1))`.",
      "Los optimizadores **minimizan**: pasa `lambda lam: -logver_poisson(lam, x)`.",
      "emv_normal: optimiza `par = [mu, log_sigma]` y usa `s = np.exp(log_sigma)` dentro de la función. Nelder-Mead no necesita derivadas.",
    ],
    errors: [
      { error: "Maximizar con minimize sin cambiar el signo", fix: "Devolvería el mínimo de la verosimilitud (el peor parámetro posible)." },
      { error: "Multiplicar probabilidades en lugar de sumar logaritmos", fix: "Con cientos de datos el producto se redondea a 0. La suma de logaritmos es estable." },
      { error: "Dejar que σ tome valores negativos", fix: "Optimiza log σ o pon cotas: σ debe ser positiva." },
    ],
    quiz: {
      question: "En los datos de llamadas la varianza (≈ 1,96) es algo mayor que la media (≈ 1,79). ¿Qué indica para el modelo de Poisson?",
      options: [
        { text: "Posible sobredispersión: la Poisson exige varianza = media, así que su EE (√(λ̂/n)) podría ser algo optimista" },
        { text: "Nada: el EMV siempre es correcto aunque el modelo no lo sea" },
        { text: "Que la media no es el EMV de λ" },
        { text: "Que los datos son normales" },
      ],
      answer: 0,
      explanation: "El EMV es el mejor parámetro **dentro del modelo**. Si el modelo no describe bien la variabilidad (aquí hay una mezcla de contratos con tasas distintas), los errores estándar basados en él subestiman la incertidumbre. Una binomial negativa o un modelo con el tipo de contrato lo resolverían.",
    },
    advanced: {
      title: "Intervalo de verosimilitud perfil",
      prompt: "Escribe `ic_verosimilitud(x)` para la Poisson: los dos valores de λ donde ℓ(λ) cae 1,92 unidades (χ²₁;0,95 / 2) por debajo del máximo, encontrados con `optimize.brentq` a cada lado de λ̂. Compáralo con λ̂ ± 1,96·EE.",
      starter: py`import numpy as np

def ic_verosimilitud(x):
    m = np.mean(x)
    return (m - 1, m + 1)`,
      solution: py`import numpy as np
from scipy import optimize, special

def ic_verosimilitud(x):
    x = np.asarray(x, dtype=float)
    ll = lambda lam: np.sum(x * np.log(lam) - lam - special.gammaln(x + 1))
    lam = x.mean()
    tope = ll(lam) - 1.920729410347062
    g = lambda v: ll(v) - tope
    return (optimize.brentq(g, 1e-9, lam), optimize.brentq(g, lam, lam * 10 + 10))`,
      tests: py`
import numpy as np
from scipy import optimize, special

def test_ic():
    "Puntos de corte de la verosimilitud"
    f = t.get("ic_verosimilitud", "function")
    x = np.random.default_rng(6).poisson(2, 50)
    lo, hi = f(x)
    ll = lambda lam: np.sum(x * np.log(lam) - lam - special.gammaln(x + 1))
    assert abs(ll(lo) - (ll(x.mean()) - 1.9207)) < 1e-3 and abs(ll(hi) - (ll(x.mean()) - 1.9207)) < 1e-3
    assert lo < x.mean() < hi
`,
    },
    lab: { lab: "estadistica", tab: "distribuciones", label: "Distribuciones" },
    review: "Repasa: ℓ = Σ log f; minimizar −ℓ; EMV de Poisson = media; EE ≈ 1/√(−ℓ″); el EMV de σ usa n.",
    xp: 100,
    coins: 15,
  },
  {
    id: "ec-simulacion",
    world: "w4",
    zone: ZONE,
    title: "El laboratorio de los mil mundos: simular para comprobar los métodos",
    kind: "lesson",
    difficulty: 4,
    skills: ["simulacion", "intervalos-confianza", "error-tipo-i", "supuestos", "verificacion"],
    requires: ["ec-verosimilitud", "i-intervalos"],
    story: "En el laboratorio de los mil mundos se puede crear una población cuyo parámetro verdadero conoces y repetir el experimento miles de veces. Así se descubre si un método cumple lo que promete… o si solo lo cumple cuando sus supuestos son ciertos.",
    objective: "Usar simulación Monte Carlo para medir la cobertura real de un intervalo de confianza y la tasa real de error tipo I de una prueba, y ver qué pasa cuando se violan los supuestos.",
    before: ["Intervalos de confianza", "Errores tipo I y II", "Prueba t de Student y de Welch"],
    packages: ["numpy", "scipy", "matplotlib"],
    intuition: [
      "Un IC del 95 % **promete** que, repitiendo el estudio muchas veces, el 95 % de los intervalos contendrá el parámetro. Una prueba con α = 0,05 **promete** rechazar H₀ cierta solo el 5 % de las veces. Las promesas dependen de supuestos.",
      "",
      "Con simulación podemos **comprobarlo**: generamos muchas muestras de una población conocida y contamos.",
      "",
      "**Significado de los términos**",
      "",
      "- Cobertura: proporción de intervalos simulados que contienen el valor verdadero.",
      "- Error tipo I real: proporción de p < α cuando H₀ es cierta por construcción.",
      "- Error Monte Carlo: la propia estimación tiene incertidumbre √(p(1 − p)/R) con R repeticiones; con R = 2000 y p = 0,95 es ≈ 0,005.",
      "",
      "Descubrirás dos cosas: con n pequeño y datos muy asimétricos el IC t cubre menos del 95 %, y la t de Student con varianzas y tamaños distintos rechaza H₀ cierta mucho más del 5 %. Welch no.",
      "",
      "**Vectorizar**: en vez de un bucle de miles de vueltas, genera una matriz de forma (repeticiones, n), una fila por estudio, y calcula medias, desviaciones o pruebas t con `axis=1`. Es decenas de veces más rápido, también en el navegador.",
    ],
    formal: "Cobertura estimada ĉ = (1/R) Σ 1{θ ∈ ICᵣ}, EE(ĉ) = √(ĉ(1 − ĉ)/R). Media de una lognormal(0, 1): e^{1/2}.",
    example: {
      code: py`import numpy as np
from scipy import stats
rng = np.random.default_rng(0)
x = rng.normal(10, 2, size=(1000, 15))
medias, ee = x.mean(axis=1), x.std(axis=1, ddof=1) / np.sqrt(15)
q = stats.t.ppf(0.975, 14)
aciertos = (medias - q * ee <= 10) & (10 <= medias + q * ee)
print(aciertos.mean())`,
      lines: [
        "NumPy.",
        "SciPy.",
        "Un generador con semilla para que la simulación sea reproducible.",
        "Mil «estudios» de 15 datos cada uno: una fila por estudio, media verdadera 10.",
        "Media y error estándar de cada fila de una vez (axis=1).",
        "Cuantil t para el 95 % con 14 grados de libertad.",
        "Un vector de True/False: ¿cada intervalo contiene el valor verdadero?",
        "La media de True/False es la proporción: cercana a 0,95.",
      ],
    },
    challenge: [
      "1. `cobertura(generador, valor_real, n, reps=2000, semilla=0)`: proporción de IC t del 95 % que contienen `valor_real`. `generador(rng, forma)` devuelve una matriz con esa forma; usa `rng = np.random.default_rng(semilla)` y `forma = (reps, n)`, **sin bucles**.",
      "2. `cob_normal` = cobertura con muestras N(10, 2) de tamaño 10 y `cob_lognormal` = cobertura con muestras lognormales(0, 1) de tamaño 10 (valor real e^0,5).",
      "3. `error_tipo1(welch, n1, n2, s1, s2, reps=2000, semilla=0)`: proporción de p < 0,05 de `stats.ttest_ind(x, y, axis=1, equal_var=not welch)` con x = `rng.normal(0, s1, (reps, n1))` e y = `rng.normal(0, s2, (reps, n2))`, generadas en ese orden (H₀ cierta).",
      "4. `alfa_student` y `alfa_welch` para n1 = 10, n2 = 40, s1 = 4, s2 = 1.",
      "5. `fig`: gráfico de barras con las cuatro tasas (`bar`) y líneas horizontales en 0,95 y 0,05.",
    ],
    starter: py`import numpy as np
from scipy import stats
import matplotlib.pyplot as plt

def cobertura(generador, valor_real, n, reps=2000, semilla=0):
    return 0.95

cob_normal = cob_lognormal = 0.95

def error_tipo1(welch, n1, n2, s1, s2, reps=2000, semilla=0):
    return 0.05

alfa_student = alfa_welch = 0.05
fig, ax = plt.subplots()`,
    solution: py`import numpy as np
from scipy import stats
import matplotlib.pyplot as plt

def cobertura(generador, valor_real, n, reps=2000, semilla=0):
    rng = np.random.default_rng(semilla)
    x = generador(rng, (reps, n))
    m, ee = x.mean(axis=1), x.std(axis=1, ddof=1) / np.sqrt(n)
    q = stats.t.ppf(0.975, n - 1)
    return float(np.mean((m - q * ee <= valor_real) & (valor_real <= m + q * ee)))

cob_normal = cobertura(lambda r, forma: r.normal(10, 2, forma), 10, 10)
cob_lognormal = cobertura(lambda r, forma: r.lognormal(0, 1, forma), np.exp(0.5), 10)

def error_tipo1(welch, n1, n2, s1, s2, reps=2000, semilla=0):
    rng = np.random.default_rng(semilla)
    x = rng.normal(0, s1, (reps, n1))
    y = rng.normal(0, s2, (reps, n2))
    p = stats.ttest_ind(x, y, axis=1, equal_var=not welch).pvalue
    return float(np.mean(p < 0.05))

alfa_student = error_tipo1(False, 10, 40, 4, 1)
alfa_welch = error_tipo1(True, 10, 40, 4, 1)

fig, ax = plt.subplots()
ax.bar(["Cobertura normal", "Cobertura lognormal", "α Student", "α Welch"], [cob_normal, cob_lognormal, alfa_student, alfa_welch])
ax.axhline(0.95, linestyle="--", color="gray")
ax.axhline(0.05, linestyle="--", color="gray")
ax.set_title("¿Cumplen los métodos lo que prometen?")`,
    tests: py`
import numpy as np
from scipy import stats

def test_cobertura_funcion():
    "Mide la cobertura de verdad"
    f = t.get("cobertura", "function")
    g = lambda r, forma: r.normal(0, 1, forma)
    c = f(g, 0, 20, reps=3000, semilla=9)
    assert abs(c - 0.95) < 0.02, c
    assert f(g, 5, 20, reps=500, semilla=9) == 0, "Un valor lejano casi nunca se cubre"
    assert f(g, 0, 20, reps=500, semilla=4) == f(g, 0, 20, reps=500, semilla=4), "Misma semilla, mismo resultado"

def test_coberturas():
    "Normal ≈ 0,95; lognormal con n = 10, por debajo"
    cn, cl = t.get("cob_normal"), t.get("cob_lognormal")
    assert abs(cn - 0.95) < 0.02, cn
    assert cl < 0.91, f"La cobertura lognormal ({cl}) debería quedar claramente por debajo de 0,95"

def test_error_tipo1():
    "Student se infla; Welch respeta α"
    f = t.get("error_tipo1", "function")
    assert abs(f(True, 15, 15, 1, 1, reps=2000, semilla=3) - 0.05) < 0.02
    a_s, a_w = t.get("alfa_student"), t.get("alfa_welch")
    assert a_s > 0.15, a_s
    assert abs(a_w - 0.05) < 0.02, a_w

def test_figura():
    "Cuatro barras y las referencias"
    ax = t.get("fig").axes[0]
    assert len(ax.patches) == 4
    ys = sorted(round(float(l.get_ydata()[0]), 2) for l in ax.get_lines())
    assert 0.05 in ys and 0.95 in ys
`,
    hints: [
      "`x = generador(rng, (reps, n))` da una fila por estudio; `x.mean(axis=1)` y `x.std(axis=1, ddof=1)` resumen cada fila.",
      "IC t: media ± t_{0,975; n−1}·s/√n. Combina las dos condiciones con `&` y haz la media del vector booleano.",
      "`stats.ttest_ind(x, y, axis=1, equal_var=not welch).pvalue` da un valor p por fila.",
    ],
    errors: [
      { error: "Un bucle de Python con miles de pruebas", fix: "Funciona, pero es lento (sobre todo en el navegador). Genera todas las muestras en una matriz y usa axis=1." },
      { error: "Pocas repeticiones", fix: "Con 100 repeticiones el error Monte Carlo de una cobertura del 95 % es ±0,02: no distinguirías 0,93 de 0,95." },
      { error: "Usar el valor real equivocado para la lognormal", fix: "La media de una lognormal(μ, σ) es e^(μ + σ²/2), no e^μ." },
      { error: "Concluir que el método «falla siempre» con datos asimétricos", fix: "Con n grande el TCL acerca la cobertura al 95 %: prueba n = 100." },
    ],
    quiz: {
      question: "Simulas 2000 IC del 95 % con datos lognormales y n = 10, y cubren el valor real el 85 % de las veces. ¿Qué concluyes?",
      options: [
        { text: "Con muestras pequeñas y muy asimétricas, el IC t no cumple su nivel nominal; conviene un n mayor, transformar o usar bootstrap" },
        { text: "Que cada intervalo concreto tiene un 85 % de probabilidad de contener la media", misconception: "ic-interpretacion" },
        { text: "Que la simulación está mal porque un IC del 95 % siempre cubre el 95 %", misconception: "supuestos" },
        { text: "Que hay que usar un IC del 99 % para conseguir el 95 %" },
      ],
      answer: 0,
      explanation: "La cobertura nominal depende de los supuestos (normalidad de la media muestral). Con n = 10 y una lognormal, el TCL aún no ha actuado. La cobertura es una propiedad del procedimiento a largo plazo, no de un intervalo concreto.",
    },
    advanced: {
      title: "¿Cuánto n hace falta?",
      prompt: "Escribe `n_minimo(objetivo=0.93, ns=(10, 20, 40, 80, 160), reps=2000)` que devuelva el primer n de la lista cuya cobertura lognormal (con tu `cobertura`, semilla 0) alcance el objetivo, o None si ninguno lo alcanza.",
      starter: py`def n_minimo(objetivo=0.93, ns=(10, 20, 40, 80, 160), reps=2000):
    return ns[0]`,
      solution: py`import numpy as np
from scipy import stats

def _cob(n, reps, semilla=0):
    x = np.random.default_rng(semilla).lognormal(0, 1, (reps, n))
    m, ee = x.mean(axis=1), x.std(axis=1, ddof=1) / np.sqrt(n)
    q = stats.t.ppf(0.975, n - 1)
    return float(np.mean((m - q * ee <= np.exp(0.5)) & (np.exp(0.5) <= m + q * ee)))

def n_minimo(objetivo=0.93, ns=(10, 20, 40, 80, 160), reps=2000):
    for n in ns:
        if _cob(n, reps) >= objetivo:
            return n
    return None`,
      tests: py`
import numpy as np
from scipy import stats

def _cob(n, reps=2000):
    x = np.random.default_rng(0).lognormal(0, 1, (reps, n))
    m, ee = x.mean(axis=1), x.std(axis=1, ddof=1) / np.sqrt(n)
    q = stats.t.ppf(0.975, n - 1)
    return float(np.mean((m - q * ee <= np.exp(0.5)) & (np.exp(0.5) <= m + q * ee)))

def test_n():
    "Primer n que alcanza el objetivo"
    f = t.get("n_minimo", "function")
    n = f()
    assert n in (20, 40, 80, 160) and _cob(n) >= 0.93
    assert f(objetivo=0.999) is None
`,
    },
    lab: { lab: "estadistica", tab: "intervalos", label: "Intervalos de confianza" },
    review: "Repasa: la cobertura y α son promesas que dependen de supuestos; simular con el valor real conocido lo comprueba; Welch por defecto.",
    xp: 100,
    coins: 15,
  },
];
