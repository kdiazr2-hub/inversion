import { estudiantesCsv, pacientesCsv } from "../datasets";
import { py, type Mission } from "../types";

// Mundo 4 · Zonas 6–10: inferencia, regresión, Bayes, diseño y causalidad, estadística clínica + proyecto.

export const W4_C: Mission[] = [
  {
    id: "i-estimadores",
    world: "w4",
    zone: "Inferencia",
    title: "Los cartógrafos del parámetro: estimadores y máxima verosimilitud",
    kind: "lesson",
    difficulty: 4,
    skills: ["estimacion", "sesgo", "maxima-verosimilitud"],
    requires: ["s-bootstrap"],
    story: "Tres cartógrafos estiman la altura de una montaña invisible. Uno siempre se queda corto, otro acierta en promedio pero varía mucho, y el tercero mejora al acumular mediciones. ¿Cuál contratarías?",
    objective: "Evaluar estimadores por sesgo, varianza, error cuadrático medio y consistencia, y obtener estimadores de máxima verosimilitud.",
    before: ["Distribución muestral", "Varianza muestral", "Derivadas"],
    packages: ["numpy", "scipy"],
    intuition: [
      "Un **estimador** es una regla para calcular un parámetro a partir de la muestra (x̄ para μ).",
      "",
      "- **Sesgo** = E[θ̂] − θ: error sistemático.",
      "- **Varianza**: cuánto cambia θ̂ entre muestras. Un estimador **eficiente** tiene poca varianza.",
      "- **ECM** = sesgo² + varianza: a veces conviene un poco de sesgo si reduce mucho la varianza.",
      "- **Consistencia**: θ̂ se concentra en θ cuando n crece.",
      "",
      "**Máxima verosimilitud (MV)**: elige el valor del parámetro que hace más probables los datos observados. Para una Poisson, λ̂ = x̄; para una exponencial, λ̂ = 1/x̄; para una Bernoulli, p̂ = proporción de éxitos.",
    ],
    formal: "L(θ) = Πᵢ f(xᵢ; θ); θ̂_MV = argmax_θ Σᵢ log f(xᵢ; θ). En la Poisson: d/dλ [Σxᵢ log λ − nλ] = 0 ⇒ λ̂ = x̄.",
    example: {
      code: py`import numpy as np
from scipy import optimize, stats
x = np.array([2, 4, 3, 0, 5, 3, 1, 4])
neg_log_vero = lambda lam: -stats.poisson.logpmf(x, lam).sum()
res = optimize.minimize_scalar(neg_log_vero, bounds=(0.01, 20), method="bounded")
print(round(res.x, 4), x.mean())`,
      lines: ["NumPy.", "Optimización y distribuciones.", "Conteos observados.", "Menos log-verosimilitud de una Poisson con parámetro λ.", "Minimizarla equivale a maximizar la verosimilitud.", "La solución numérica coincide con la media: 2,75."],
    },
    challenge: [
      "1. `evaluar(estimador, theta, generar, n, repeticiones, semilla)`: genera `repeticiones` muestras con `generar(rng, n)`, aplica el estimador y devuelve `{\"sesgo\", \"varianza\", \"ecm\"}`.",
      "2. Usa `evaluar` para comparar la varianza con ddof=0 y ddof=1 en muestras normales N(0, 2) de tamaño 5: guarda los resultados en `var_n` y `var_n1` (θ = 4).",
      "3. `mv_exponencial(x)`: estimador MV de la tasa λ de una exponencial, obtenido **numéricamente** minimizando la menos log-verosimilitud con `scipy.optimize.minimize_scalar` (método `\"bounded\"`, límites (1e-6, 100)). Debe coincidir con 1/x̄.",
    ],
    starter: py`import numpy as np
from scipy import optimize, stats

def evaluar(estimador, theta, generar, n, repeticiones, semilla):
    return {"sesgo": 0, "varianza": 0, "ecm": 0}

var_n = {}
var_n1 = {}

def mv_exponencial(x):
    return np.mean(x)`,
    solution: py`import numpy as np
from scipy import optimize, stats

def evaluar(estimador, theta, generar, n, repeticiones, semilla):
    rng = np.random.default_rng(semilla)
    est = np.array([estimador(generar(rng, n)) for _ in range(repeticiones)])
    sesgo = est.mean() - theta
    varianza = est.var()
    return {"sesgo": float(sesgo), "varianza": float(varianza), "ecm": float(sesgo ** 2 + varianza)}

normal = lambda rng, n: rng.normal(0, 2, n)
var_n = evaluar(lambda x: x.var(ddof=0), 4, normal, 5, 20000, 1)
var_n1 = evaluar(lambda x: x.var(ddof=1), 4, normal, 5, 20000, 1)

def mv_exponencial(x):
    x = np.asarray(x, dtype=float)
    nll = lambda lam: -stats.expon.logpdf(x, scale=1 / lam).sum()
    return optimize.minimize_scalar(nll, bounds=(1e-6, 100), method="bounded").x

print(var_n, var_n1)`,
    tests: py`
import numpy as np

def test_evaluar():
    "La media muestral es insesgada"
    r = t.get("evaluar", "function")(np.mean, 10, lambda rng, n: rng.normal(10, 3, n), 25, 5000, 2)
    assert abs(r["sesgo"]) < 0.05 and abs(r["varianza"] - 9 / 25) < 0.03 and approx(r["ecm"], r["sesgo"] ** 2 + r["varianza"])

def test_bessel():
    "ddof=0 sesgado (≈ −0,8) y ddof=1 insesgado"
    a, b = t.get("var_n"), t.get("var_n1")
    assert -0.95 < a["sesgo"] < -0.65 and abs(b["sesgo"]) < 0.12
    assert a["ecm"] < b["ecm"], "Curiosidad: con n = 5 el estimador sesgado tiene menor ECM"

def test_mv():
    "MV numérico = 1 / media"
    x = np.random.default_rng(3).exponential(0.5, 300)
    assert approx(t.get("mv_exponencial", "function")(x), 1 / x.mean(), 1e-4)
    assert "minimize_scalar" in t.code
`,
    hints: [
      "Guarda los valores estimados en un array y calcula su media y su varianza.",
      "El generador recibe `rng` y `n`: `lambda rng, n: rng.normal(0, 2, n)`.",
      "La exponencial con tasa λ en SciPy: `stats.expon.logpdf(x, scale=1/lam)`.",
    ],
    errors: [
      { error: "Pensar que «insesgado» significa «mejor»", fix: "Importa el ECM. Un estimador con algo de sesgo y mucha menos varianza puede ser preferible (regularización)." },
      { error: "La optimización devuelve un extremo del intervalo", fix: "Revisa los límites y el signo: hay que minimizar la menos log-verosimilitud." },
    ],
    quiz: {
      question: "Un estimador es insesgado pero con varianza enorme. ¿Qué significa en la práctica?",
      options: [
        { text: "Acierta en promedio sobre muchas muestras, pero en tu única muestra puede estar muy lejos" },
        { text: "Siempre da el valor exacto" },
        { text: "Es el mejor estimador posible" },
        { text: "Está mal calculado" },
      ],
      answer: 0,
      explanation: "La ausencia de sesgo es una propiedad de largo plazo. La precisión en una muestra depende de la varianza.",
    },
    review: "Repasa sesgo, varianza, ECM y la idea de máxima verosimilitud.",
    xp: 90,
    coins: 13,
  },
  {
    id: "i-intervalos",
    world: "w4",
    zone: "Inferencia",
    title: "La red del pescador: intervalos de confianza",
    kind: "lesson",
    difficulty: 4,
    skills: ["intervalos-confianza", "tamano-muestral"],
    requires: ["i-estimadores"],
    story: "Un pescador lanza su red al lago donde nada el parámetro. Una red bien construida lo atrapa el 95 % de las veces… pero en cada lanzamiento concreto, o lo atrapa o no.",
    objective: "Calcular intervalos de confianza para medias y proporciones, el margen de error y el tamaño muestral necesario, e interpretarlos correctamente.",
    before: ["Error estándar", "Distribución t"],
    packages: ["numpy", "scipy", "statsmodels"],
    intuition: [
      "Un **intervalo de confianza (IC)** al 95 % se construye con un procedimiento que, repetido con muchas muestras, contiene el parámetro verdadero el 95 % de las veces.",
      "",
      "- Media: x̄ ± t₀.₉₇₅,ₙ₋₁ · s/√n.",
      "- Proporción: el intervalo de **Wald** p̂ ± 1,96·√(p̂(1−p̂)/n) falla con n pequeño o p extrema; el de **Wilson** se comporta mucho mejor.",
      "- **Margen de error** = la mitad de la anchura.",
      "- Tamaño muestral para una proporción con margen E: n = z²·p(1−p)/E² (con p = 0,5 en el peor caso).",
      "",
      "Interpretación correcta: «estimamos μ en 12,3 (IC 95 %: 11,1 a 13,5)». **Incorrecta**: «hay un 95 % de probabilidad de que μ esté entre 11,1 y 13,5». Ese intervalo concreto lo contiene o no; el 95 % describe el método. Míralo en el Laboratorio estadístico → «Intervalos de confianza».",
    ],
    formal: "IC₁₋α(μ) = x̄ ± t_{1−α/2, n−1}·s/√n. Wilson: (p̂ + z²/2n ± z√(p̂(1−p̂)/n + z²/4n²)) / (1 + z²/n).",
    example: {
      code: py`import numpy as np
from scipy import stats
x = np.array([12.1, 13.4, 11.8, 12.9, 13.1, 12.4, 11.6, 12.8])
ic = stats.t.interval(0.95, len(x) - 1, loc=x.mean(), scale=stats.sem(x))
print(round(x.mean(), 2), np.round(ic, 2))`,
      lines: ["NumPy.", "SciPy.", "Ocho mediciones.", "IC t al 95 % (stats.sem = s/√n).", "Media 12,51 e intervalo."],
    },
    challenge: [
      "1. `ic_media(x, conf=0.95)`: tupla (inferior, superior) con la t de Student, calculada a mano (media, s/√n y `stats.t.ppf`).",
      "2. `ic_wald(k, n, conf=0.95)` y `ic_wilson(k, n, conf=0.95)` a mano.",
      "3. `cobertura(metodo, p, n, repeticiones, semilla)`: proporción de intervalos (de `ic_wald` o `ic_wilson`) que contienen p al simular k ~ Binomial(n, p).",
      "4. `n_para_margen(margen, conf=0.95, p=0.5)`: tamaño mínimo para una proporción.",
    ],
    starter: py`import math
import numpy as np
from scipy import stats

def ic_media(x, conf=0.95):
    m = np.mean(x)
    return (m - 1.96, m + 1.96)

def ic_wald(k, n, conf=0.95):
    return (0, 1)

def ic_wilson(k, n, conf=0.95):
    return (0, 1)

def cobertura(metodo, p, n, repeticiones, semilla):
    return 0.95

def n_para_margen(margen, conf=0.95, p=0.5):
    return 100`,
    solution: py`import math
import numpy as np
from scipy import stats

def ic_media(x, conf=0.95):
    x = np.asarray(x, dtype=float)
    n = len(x)
    ee = x.std(ddof=1) / math.sqrt(n)
    q = stats.t.ppf(1 - (1 - conf) / 2, n - 1)
    return (x.mean() - q * ee, x.mean() + q * ee)

def ic_wald(k, n, conf=0.95):
    z = stats.norm.ppf(1 - (1 - conf) / 2)
    p = k / n
    h = z * math.sqrt(p * (1 - p) / n)
    return (p - h, p + h)

def ic_wilson(k, n, conf=0.95):
    z = stats.norm.ppf(1 - (1 - conf) / 2)
    p = k / n
    den = 1 + z * z / n
    centro = (p + z * z / (2 * n)) / den
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return (centro - h, centro + h)

def cobertura(metodo, p, n, repeticiones, semilla):
    rng = np.random.default_rng(semilla)
    ks = rng.binomial(n, p, repeticiones)
    return float(np.mean([lo <= p <= hi for lo, hi in (metodo(k, n) for k in ks)]))

def n_para_margen(margen, conf=0.95, p=0.5):
    z = stats.norm.ppf(1 - (1 - conf) / 2)
    return math.ceil(z * z * p * (1 - p) / margen ** 2)`,
    tests: py`
import numpy as np
from scipy import stats
from statsmodels.stats.proportion import proportion_confint

def test_media():
    "IC t igual que scipy"
    x = [12.1, 13.4, 11.8, 12.9, 13.1, 12.4, 11.6, 12.8]
    ref = stats.t.interval(0.95, 7, loc=np.mean(x), scale=stats.sem(x))
    r = t.get("ic_media", "function")(x)
    assert approx(r[0], ref[0], 1e-9) and approx(r[1], ref[1], 1e-9)

def test_proporciones():
    "Wald y Wilson como statsmodels"
    for k, n in ((5, 40), (18, 50), (0, 20)):
        for nombre, met in (("ic_wald", "normal"), ("ic_wilson", "wilson")):
            r = t.get(nombre, "function")(k, n)
            ref = proportion_confint(k, n, method=met)
            assert approx(r[0], ref[0], 1e-6) and approx(r[1], ref[1], 1e-6), f"{nombre}({k}, {n})"

def test_cobertura():
    "Wald falla con p extrema y n pequeño; Wilson se acerca al 95 %"
    c = t.get("cobertura", "function")
    w = c(t.get("ic_wald"), 0.05, 30, 4000, 1)
    s = c(t.get("ic_wilson"), 0.05, 30, 4000, 1)
    assert w < 0.85 and s > 0.92

def test_n():
    "Tamaño muestral"
    f = t.get("n_para_margen", "function")
    assert f(0.03) == 1068 and f(0.05) == 385 and f(0.05, p=0.1) == 139
`,
    hints: [
      "Media: `q = stats.t.ppf(1 - (1 - conf)/2, n - 1)` y EE = s/√n.",
      "Wilson: implementa la fórmula de la explicación formal paso a paso (centro y semiancho).",
      "Para la cobertura, genera k con `rng.binomial(n, p, repeticiones)` y cuenta cuántos intervalos contienen p.",
    ],
    errors: [
      { error: "Interpretar el IC como probabilidad sobre el parámetro", fix: "El 95 % es una propiedad del procedimiento a largo plazo. Para afirmaciones probabilísticas sobre μ se necesita un enfoque bayesiano." },
      { error: "Usar Wald con pocos datos o proporciones cercanas a 0 o 1", fix: "Puede dar límites negativos o de anchura cero (con k = 0). Usa Wilson." },
    ],
    quiz: {
      question: "Calculas un IC 95 % para la media: (11,1; 13,5). ¿Qué afirmación es correcta?",
      options: [
        { text: "Si repitiéramos el estudio muchas veces, el 95 % de los intervalos construidos así contendrían la media verdadera" },
        { text: "Hay un 95 % de probabilidad de que la media verdadera esté entre 11,1 y 13,5", misconception: "ic-interpretacion" },
        { text: "El 95 % de los datos están entre 11,1 y 13,5", misconception: "de-vs-ee" },
        { text: "La media muestral tiene un 95 % de probabilidad de estar en el intervalo" },
      ],
      answer: 0,
      explanation: "El parámetro es fijo; lo aleatorio es el intervalo. Y el IC habla de la media, no de dónde caen los datos individuales.",
    },
    review: "Repasa la interpretación frecuentista del IC y por qué Wilson supera a Wald.",
    xp: 95,
    coins: 14,
  },
  {
    id: "i-pruebas",
    world: "w4",
    zone: "Inferencia",
    title: "El tribunal de la hipótesis nula: pruebas de hipótesis y valor p",
    kind: "lesson",
    difficulty: 4,
    skills: ["pruebas-hipotesis", "valor-p"],
    requires: ["i-intervalos"],
    story: "En el tribunal del imperio, la hipótesis nula es inocente hasta que los datos aporten evidencia suficiente. Pero «no culpable» no es lo mismo que «inocente demostrado».",
    objective: "Plantear H₀ y H₁, calcular un estadístico de prueba y su valor p (bilateral y unilateral), decidir con un nivel α y redactar conclusiones correctas.",
    before: ["Intervalos de confianza", "Distribución t"],
    packages: ["numpy", "scipy"],
    intuition: [
      "1. **Pregunta** → H₀ (no hay efecto, μ = μ₀) y H₁ (μ ≠ μ₀, o μ > μ₀ si la dirección se fijó **antes** de ver los datos).",
      "2. **Estadístico**: cuántos errores estándar se aleja la estimación de lo que predice H₀: t = (x̄ − μ₀)/(s/√n).",
      "3. **Distribución bajo H₀**: t de Student con n − 1 gl (si los supuestos se cumplen).",
      "4. **Valor p**: probabilidad, **suponiendo H₀ cierta**, de obtener un estadístico al menos tan extremo como el observado.",
      "5. **Decisión** con α (p. ej. 0,05): si p < α se rechaza H₀.",
      "",
      "El valor p **no** es la probabilidad de que H₀ sea cierta, ni la probabilidad de que el resultado se deba al azar, ni mide el tamaño del efecto. «No rechazar H₀» no prueba que H₀ sea verdadera. Informa siempre la estimación y su IC.",
    ],
    formal: "p = P(|T| ≥ |t_obs| | H₀) = 2·(1 − F_{t,n−1}(|t_obs|)) en la prueba bilateral. Rechazar con p < α ⇔ μ₀ queda fuera del IC (1 − α).",
    example: {
      code: py`import numpy as np
from scipy import stats
x = np.array([5.1, 4.9, 6.2, 5.8, 6.0, 5.5, 5.3])
res = stats.ttest_1samp(x, 5)
print(round(res.statistic, 3), round(res.pvalue, 4))
print(np.round(res.confidence_interval(0.95), 3))`,
      lines: ["NumPy.", "SciPy.", "Siete mediciones; ¿difiere la media de 5?", "Prueba t de una muestra frente a μ₀ = 5.", "t = 2,998; p = 0,0241.", "IC 95 %: no contiene 5, coherente con p < 0,05."],
    },
    challenge: [
      "1. `prueba_t(x, mu0, alternativa=\"dos-colas\")` **a mano** (t, gl y valor p con `stats.t.sf`), con alternativas `\"dos-colas\"`, `\"mayor\"` y `\"menor\"`. Devuelve diccionario `{\"t\", \"gl\", \"p\"}`.",
      "2. `decidir(p, alfa=0.05)`: `\"rechazar H0\"` o `\"no rechazar H0\"`.",
      "3. `conclusion(x, mu0, alfa=0.05)`: texto con la media, el IC 95 % (dos decimales), el valor p (tres decimales) y la decisión. **No** debe contener las expresiones «probabilidad de que H0», «H0 es verdadera», «demuestra» ni «aceptamos H0».",
    ],
    starter: py`import numpy as np
from scipy import stats

def prueba_t(x, mu0, alternativa="dos-colas"):
    t = np.mean(x) - mu0
    return {"t": t, "gl": len(x), "p": 0.05}

def decidir(p, alfa=0.05):
    return "aceptamos H0"

def conclusion(x, mu0, alfa=0.05):
    return "Hay un 95 % de probabilidad de que H0 sea falsa."`,
    solution: py`import numpy as np
from scipy import stats

def prueba_t(x, mu0, alternativa="dos-colas"):
    x = np.asarray(x, dtype=float)
    n = len(x)
    t = (x.mean() - mu0) / (x.std(ddof=1) / np.sqrt(n))
    gl = n - 1
    if alternativa == "dos-colas":
        p = 2 * stats.t.sf(abs(t), gl)
    elif alternativa == "mayor":
        p = stats.t.sf(t, gl)
    elif alternativa == "menor":
        p = stats.t.cdf(t, gl)
    else:
        raise ValueError(alternativa)
    return {"t": float(t), "gl": gl, "p": float(p)}

def decidir(p, alfa=0.05):
    return "rechazar H0" if p < alfa else "no rechazar H0"

def conclusion(x, mu0, alfa=0.05):
    x = np.asarray(x, dtype=float)
    r = prueba_t(x, mu0)
    lo, hi = stats.t.interval(0.95, len(x) - 1, loc=x.mean(), scale=stats.sem(x))
    texto = (f"Media estimada {x.mean():.2f} (IC 95 %: {lo:.2f} a {hi:.2f}); "
             f"frente a μ0 = {mu0}, t({r['gl']}) = {r['t']:.2f}, p = {r['p']:.3f}. ")
    if r["p"] < alfa:
        texto += f"Con α = {alfa} se rechaza H0: los datos son poco compatibles con una media de {mu0}."
    else:
        texto += f"Con α = {alfa} no se rechaza H0: los datos no aportan evidencia suficiente de una diferencia, lo que no demuestra que no exista."
    return texto`,
    tests: py`
import numpy as np
from scipy import stats

X = [5.1, 4.9, 6.2, 5.8, 6.0, 5.5, 5.3]

def test_dos_colas():
    "Igual que scipy.stats.ttest_1samp"
    r = t.get("prueba_t", "function")(X, 5)
    ref = stats.ttest_1samp(X, 5)
    assert approx(r["t"], ref.statistic, 1e-9) and approx(r["p"], ref.pvalue, 1e-9) and r["gl"] == 6

def test_unilaterales():
    "Alternativas unilaterales"
    f = t.get("prueba_t")
    assert approx(f(X, 5, "mayor")["p"], stats.ttest_1samp(X, 5, alternative="greater").pvalue, 1e-9)
    assert approx(f(X, 5, "menor")["p"], stats.ttest_1samp(X, 5, alternative="less").pvalue, 1e-9)

def test_decidir():
    "Lenguaje de decisión"
    d = t.get("decidir", "function")
    assert d(0.01) == "rechazar H0" and d(0.2) == "no rechazar H0" and d(0.05) == "no rechazar H0"

def test_conclusion():
    "Conclusión correcta, con cifras y sin errores de interpretación"
    c = t.get("conclusion", "function")(X, 5).lower()
    for prohibido in ("probabilidad de que h0", "h0 es verdadera", "aceptamos h0"):
        assert prohibido not in c, f"Evita: '{prohibido}'"
    assert "ic 95" in c and f"{np.mean(X):.2f}" in c and "0.024" in c and "rechaza" in c
    c2 = t.get("conclusion")(X, 5.5).lower()
    assert "no se rechaza" in c2
`,
    hints: [
      "t = (x̄ − μ₀)/(s/√n) con s de ddof=1; gl = n − 1.",
      "Bilateral: `2 * stats.t.sf(abs(t), gl)`; «mayor»: `stats.t.sf(t, gl)`; «menor»: `stats.t.cdf(t, gl)`.",
      "En la conclusión, incluye estimación, IC, estadístico, p y una frase que no confunda «no rechazar» con «demostrar».",
    ],
    errors: [
      { error: "Elegir la prueba unilateral después de ver los datos", fix: "Eso duplica en la práctica la tasa de falsos positivos. La dirección se fija antes de recoger datos y con justificación." },
      { error: "Concluir «no hay efecto» porque p > 0,05", fix: "Puede faltar potencia. Mira el IC: si es ancho, los datos son compatibles con efectos grandes." },
    ],
    quiz: {
      question: "Obtienes p = 0,03. ¿Cuál es la interpretación correcta?",
      options: [
        { text: "Si H₀ fuera cierta, obtener un resultado tan extremo o más ocurriría aproximadamente un 3 % de las veces" },
        { text: "Hay un 3 % de probabilidad de que H₀ sea cierta", misconception: "p-valor" },
        { text: "Hay un 97 % de probabilidad de que el efecto sea real", misconception: "p-valor" },
        { text: "El efecto es grande", misconception: "significacion-relevancia" },
      ],
      answer: 0,
      explanation: "El valor p se calcula suponiendo H₀. No da la probabilidad de las hipótesis ni el tamaño del efecto.",
    },
    review: "Repasa qué es y qué no es un valor p, y por qué hay que informar estimaciones e intervalos.",
    xp: 100,
    coins: 15,
  },
  {
    id: "i-dos-grupos",
    world: "w4",
    zone: "Inferencia",
    title: "El duelo de los grupos: t de Welch, t pareada y tamaño del efecto",
    kind: "lesson",
    difficulty: 4,
    skills: ["pruebas-hipotesis", "tamano-efecto", "comparacion-grupos"],
    requires: ["i-pruebas"],
    story: "El sanatorio compara un nuevo tónico con el tratamiento habitual. No basta saber si hay diferencia: hay que saber cuánta, con qué incertidumbre y si importa en la práctica.",
    objective: "Comparar dos grupos con la prueba t de Welch (independientes) y la t pareada, calcular el IC de la diferencia y el tamaño del efecto (d de Cohen).",
    before: ["Pruebas de hipótesis", "Intervalos de confianza"],
    packages: ["pandas", "scipy"],
    files: { "pacientes.csv": pacientesCsv() },
    intuition: [
      "- **Grupos independientes** (personas distintas): prueba t de **Welch**, que no supone varianzas iguales (preferible por defecto a la t de Student clásica).",
      "- **Datos pareados** (antes/después en la misma persona): la t **pareada** analiza las diferencias individuales; elimina la variabilidad entre personas.",
      "- **Tamaño del efecto**: la d de Cohen = diferencia de medias / DE combinada. Referencias orientativas (0,2 pequeño; 0,5 medio; 0,8 grande) que deben interpretarse según el contexto.",
      "",
      "Informe mínimo: diferencia estimada, IC 95 %, valor p y tamaño del efecto. Supuestos: independencia entre observaciones, y normalidad aproximada de las medias (razonable con n moderado si no hay atípicos extremos).",
    ],
    formal: "Welch: t = (x̄₁ − x̄₂)/√(s₁²/n₁ + s₂²/n₂), gl de Welch–Satterthwaite. d = (x̄₁ − x̄₂)/s_p con s_p = √(((n₁−1)s₁² + (n₂−1)s₂²)/(n₁+n₂−2)).",
    example: {
      code: py`from scipy import stats
antes = [148, 152, 139, 160, 155, 147]
despues = [140, 149, 136, 151, 150, 141]
print(stats.ttest_rel(antes, despues))
print(stats.ttest_ind(antes, despues, equal_var=False).pvalue)`,
      lines: ["SciPy.", "Presión de 6 personas antes…", "…y después (las mismas personas).", "La t pareada detecta el descenso consistente (p ≈ 0,003).", "Tratarlos como grupos independientes ignora el emparejamiento y pierde potencia (p ≈ 0,18)."],
    },
    challenge: [
      "Con `pacientes.csv` (quita filas sin `pas_final`):",
      "1. `welch(a, b)`: diccionario `{\"diferencia\", \"t\", \"gl\", \"p\", \"ic\"}` para la media de a − b, **a mano** (gl de Welch–Satterthwaite).",
      "2. `cohen_d(a, b)` con la DE combinada.",
      "3. `cambio_trat` y `cambio_ctrl`: arrays con pas_final − pas_inicial de cada grupo; `resultado = welch(cambio_trat, cambio_ctrl)` y `d = cohen_d(cambio_trat, cambio_ctrl)`.",
      "4. `pareada_trat`: valor p de la prueba t pareada (scipy) entre pas_inicial y pas_final del grupo tratamiento.",
    ],
    starter: py`import numpy as np
import pandas as pd
from scipy import stats

df = pd.read_csv("pacientes.csv")

def welch(a, b):
    return {"diferencia": np.mean(a) - np.mean(b), "t": 0, "gl": 0, "p": 1, "ic": (0, 0)}

def cohen_d(a, b):
    return np.mean(a) - np.mean(b)

cambio_trat = np.array([])
cambio_ctrl = np.array([])
resultado = {}
d = 0
pareada_trat = 1`,
    solution: py`import numpy as np
import pandas as pd
from scipy import stats

df = pd.read_csv("pacientes.csv").dropna(subset=["pas_final"])

def welch(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    va, vb = a.var(ddof=1) / len(a), b.var(ddof=1) / len(b)
    se = np.sqrt(va + vb)
    dif = a.mean() - b.mean()
    t = dif / se
    gl = (va + vb) ** 2 / (va ** 2 / (len(a) - 1) + vb ** 2 / (len(b) - 1))
    q = stats.t.ppf(0.975, gl)
    return {"diferencia": float(dif), "t": float(t), "gl": float(gl), "p": float(2 * stats.t.sf(abs(t), gl)), "ic": (float(dif - q * se), float(dif + q * se))}

def cohen_d(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    sp = np.sqrt(((len(a) - 1) * a.var(ddof=1) + (len(b) - 1) * b.var(ddof=1)) / (len(a) + len(b) - 2))
    return float((a.mean() - b.mean()) / sp)

cambio = df["pas_final"] - df["pas_inicial"]
cambio_trat = cambio[df["grupo"] == "tratamiento"].to_numpy()
cambio_ctrl = cambio[df["grupo"] == "control"].to_numpy()
resultado = welch(cambio_trat, cambio_ctrl)
d = cohen_d(cambio_trat, cambio_ctrl)
trat = df[df["grupo"] == "tratamiento"]
pareada_trat = stats.ttest_rel(trat["pas_inicial"], trat["pas_final"]).pvalue
print(resultado, round(d, 2), pareada_trat)`,
    tests: py`
import numpy as np
from scipy import stats

def test_welch():
    "Welch a mano igual que scipy"
    a = [5.1, 4.9, 6.2, 5.8, 6.0, 5.5, 5.3]
    b = [4.1, 4.5, 5.0, 4.8, 4.2, 4.9]
    r = t.get("welch", "function")(a, b)
    ref = stats.ttest_ind(a, b, equal_var=False)
    assert approx(r["t"], ref.statistic, 1e-9) and approx(r["p"], ref.pvalue, 1e-9) and approx(r["gl"], ref.df, 1e-9)
    ci = ref.confidence_interval()
    assert approx(r["ic"][0], ci.low, 1e-9) and approx(r["ic"][1], ci.high, 1e-9)

def test_cohen():
    "d de Cohen"
    assert approx(t.get("cohen_d", "function")([2, 4, 6], [1, 3, 5]), 0.5)

def test_aplicado():
    "Análisis del ensayo sintético"
    ct, cc = np.asarray(t.get("cambio_trat")), np.asarray(t.get("cambio_ctrl"))
    import pandas as pd
    n_validos = int(pd.read_csv("pacientes.csv")["pas_final"].notna().sum())
    assert len(ct) + len(cc) == n_validos
    assert not np.isnan(ct).any() and not np.isnan(cc).any(), "Quita las filas sin pas_final"
    r = t.get("resultado")
    assert r["diferencia"] < 0 and r["p"] < 0.001 and r["ic"][1] < 0
    assert t.get("d") < -0.5
    assert t.get("pareada_trat") < 1e-6
`,
    hints: [
      "Varianzas de la media: s²/n en cada grupo; EE de la diferencia = √(suma).",
      "gl de Welch: (va + vb)² / (va²/(na − 1) + vb²/(nb − 1)).",
      "Elimina primero las filas sin `pas_final` con `dropna(subset=[\"pas_final\"])`.",
    ],
    errors: [
      { error: "Usar una prueba de grupos independientes con datos pareados", fix: "Se pierde potencia y se ignora la estructura. Si son las mismas unidades medidas dos veces, usa la pareada." },
      { error: "Informar solo el valor p", fix: "Añade la diferencia, su IC y el tamaño del efecto: el lector necesita saber cuánto." },
    ],
    quiz: {
      question: "Con 50 000 pacientes por grupo, una diferencia de 0,3 mmHg da p < 0,001. ¿Qué concluyes?",
      options: [
        { text: "Hay evidencia de una diferencia, pero de 0,3 mmHg: probablemente irrelevante clínicamente" },
        { text: "El tratamiento tiene un efecto clínico importante", misconception: "significacion-relevancia" },
        { text: "El estudio está mal hecho" },
        { text: "El valor p mide la importancia del efecto", misconception: "p-valor" },
      ],
      answer: 0,
      explanation: "Con n enorme, efectos minúsculos son «significativos». La relevancia se juzga con el tamaño del efecto, su IC y el contexto clínico.",
    },
    review: "Repasa cuándo usar Welch o t pareada y cómo informar el tamaño del efecto.",
    xp: 100,
    coins: 15,
  },
  {
    id: "i-chi2-anova",
    world: "w4",
    zone: "Inferencia",
    title: "El consejo de los muchos: chi-cuadrado y ANOVA",
    kind: "lesson",
    difficulty: 4,
    skills: ["chi-cuadrado", "anova", "tamano-efecto"],
    requires: ["i-dos-grupos"],
    story: "El consejo debe decidir si la región influye en la preferencia de pociones y si tres escuelas de magia obtienen resultados distintos. Comparar de dos en dos llevaría a falsas alarmas.",
    objective: "Aplicar la prueba chi-cuadrado de independencia y de bondad de ajuste, el ANOVA de un factor, y sus tamaños de efecto (V de Cramér, η²).",
    before: ["Pruebas de hipótesis", "Probabilidad condicional", "Distribuciones χ² y F"],
    packages: ["numpy", "scipy"],
    intuition: [
      "- **χ² de independencia**: compara los conteos observados de una tabla con los **esperados** si las variables fueran independientes (fila·columna/total). χ² = Σ(O − E)²/E. Requiere conteos esperados no muy pequeños (≥ 5 como regla práctica); si no, prueba exacta de Fisher.",
      "- **χ² de bondad de ajuste**: ¿siguen los conteos una distribución teórica (dado justo)?",
      "- **ANOVA de un factor**: ¿difieren las medias de 3 o más grupos? Compara la variabilidad **entre** grupos con la variabilidad **dentro** de ellos (F). Supone independencia, normalidad aproximada y varianzas parecidas (si no, ANOVA de Welch o Kruskal-Wallis).",
      "",
      "Tamaños de efecto: **V de Cramér** = √(χ²/(n·(min(f, c) − 1))); **η²** = SC_entre / SC_total.",
    ],
    formal: "Eᵢⱼ = (fila_i · columna_j)/n; gl = (f−1)(c−1). F = [SC_entre/(k−1)] / [SC_dentro/(N−k)].",
    example: {
      code: py`import numpy as np
from scipy import stats
tabla = np.array([[30, 10], [20, 40]])
chi2, p, gl, esperados = stats.chi2_contingency(tabla, correction=False)
print(round(chi2, 2), round(p, 5), gl)
print(esperados)`,
      lines: ["NumPy.", "SciPy.", "Tabla 2×2 de conteos.", "Prueba sin corrección de continuidad.", "χ² = 16,67; p < 0,001; 1 gl.", "Conteos esperados bajo independencia."],
    },
    challenge: [
      "1. `chi2_indep(tabla)`: a mano, diccionario `{\"chi2\", \"gl\", \"p\", \"esperados\", \"v_cramer\"}` (sin corrección de continuidad).",
      "2. `bondad_ajuste(observados, probs)`: (χ², p) para comprobar si los conteos siguen las probabilidades dadas.",
      "3. `anova(*grupos)`: a mano, diccionario `{\"F\", \"p\", \"eta2\"}`.",
    ],
    starter: py`import numpy as np
from scipy import stats

def chi2_indep(tabla):
    return {"chi2": 0, "gl": 1, "p": 1, "esperados": None, "v_cramer": 0}

def bondad_ajuste(observados, probs):
    return (0, 1)

def anova(*grupos):
    return {"F": 0, "p": 1, "eta2": 0}`,
    solution: py`import numpy as np
from scipy import stats

def chi2_indep(tabla):
    O = np.asarray(tabla, dtype=float)
    n = O.sum()
    E = np.outer(O.sum(axis=1), O.sum(axis=0)) / n
    chi2 = ((O - E) ** 2 / E).sum()
    gl = (O.shape[0] - 1) * (O.shape[1] - 1)
    v = np.sqrt(chi2 / (n * (min(O.shape) - 1)))
    return {"chi2": float(chi2), "gl": gl, "p": float(stats.chi2.sf(chi2, gl)), "esperados": E, "v_cramer": float(v)}

def bondad_ajuste(observados, probs):
    O = np.asarray(observados, dtype=float)
    E = O.sum() * np.asarray(probs, dtype=float)
    chi2 = ((O - E) ** 2 / E).sum()
    return (float(chi2), float(stats.chi2.sf(chi2, len(O) - 1)))

def anova(*grupos):
    gs = [np.asarray(g, dtype=float) for g in grupos]
    todos = np.concatenate(gs)
    gran = todos.mean()
    sc_entre = sum(len(g) * (g.mean() - gran) ** 2 for g in gs)
    sc_dentro = sum(((g - g.mean()) ** 2).sum() for g in gs)
    k, N = len(gs), len(todos)
    F = (sc_entre / (k - 1)) / (sc_dentro / (N - k))
    return {"F": float(F), "p": float(stats.f.sf(F, k - 1, N - k)), "eta2": float(sc_entre / (sc_entre + sc_dentro))}`,
    tests: py`
import numpy as np
from scipy import stats

def test_chi2():
    "Igual que scipy.stats.chi2_contingency"
    tabla = [[30, 10, 15], [20, 40, 25]]
    r = t.get("chi2_indep", "function")(tabla)
    c, p, gl, E = stats.chi2_contingency(tabla, correction=False)
    assert approx(r["chi2"], c, 1e-9) and approx(r["p"], p, 1e-9) and r["gl"] == gl and np.allclose(r["esperados"], E)
    assert approx(r["v_cramer"], stats.contingency.association(tabla, method="cramer"), 1e-9)

def test_bondad():
    "Bondad de ajuste"
    obs = [18, 22, 16, 25, 30, 9]
    r = t.get("bondad_ajuste", "function")(obs, [1 / 6] * 6)
    ref = stats.chisquare(obs)
    assert approx(r[0], ref.statistic, 1e-9) and approx(r[1], ref.pvalue, 1e-9)

def test_anova():
    "ANOVA igual que scipy.stats.f_oneway y η² correcta"
    a, b, c = [23, 25, 21, 27, 24], [30, 28, 33, 31, 29], [22, 26, 24, 23, 25]
    r = t.get("anova", "function")(a, b, c)
    ref = stats.f_oneway(a, b, c)
    assert approx(r["F"], ref.statistic, 1e-9) and approx(r["p"], ref.pvalue, 1e-9)
    assert 0 < r["eta2"] < 1 and approx(r["eta2"], 0.7409, 1e-3)
`,
    hints: [
      "Esperados: `np.outer(totales_fila, totales_columna) / n`.",
      "ANOVA: SC_entre = Σ nᵢ(x̄ᵢ − x̄)²; SC_dentro = Σ Σ (x − x̄ᵢ)².",
      "p-valores con `stats.chi2.sf` y `stats.f.sf`.",
    ],
    errors: [
      { error: "Aplicar χ² a porcentajes en vez de conteos", fix: "La prueba necesita frecuencias absolutas: con porcentajes el resultado depende de una escala arbitraria." },
      { error: "Hacer muchas pruebas t por pares en vez de un ANOVA", fix: "Cada prueba añade probabilidad de falso positivo. Usa ANOVA y luego comparaciones corregidas (Tukey, Holm)." },
    ],
    quiz: {
      question: "Un ANOVA da p < 0,001 con tres grupos. ¿Qué sabes?",
      options: [
        { text: "Que hay evidencia de que no todas las medias son iguales, pero no cuáles difieren ni cuánto" },
        { text: "Que los tres grupos son distintos entre sí" },
        { text: "Que el efecto es grande", misconception: "significacion-relevancia" },
        { text: "Que la hipótesis nula tiene probabilidad 0,001", misconception: "p-valor" },
      ],
      answer: 0,
      explanation: "El ANOVA contrasta la igualdad global. Para saber qué pares difieren hacen falta comparaciones post hoc corregidas; para cuánto, tamaños de efecto e intervalos.",
    },
    review: "Repasa la lógica observados frente a esperados y la de variabilidad entre frente a dentro.",
    xp: 100,
    coins: 15,
  },
  {
    id: "i-no-parametricas",
    world: "w4",
    zone: "Inferencia",
    title: "Los jueces de rangos: pruebas no paramétricas y elección de la prueba",
    kind: "lesson",
    difficulty: 4,
    skills: ["no-parametricas", "eleccion-prueba", "supuestos"],
    requires: ["i-chi2-anova"],
    story: "Algunos datos no se dejan medir con la vara de la normal: escalas ordinales, colas larguísimas, muestras diminutas. Los jueces de rangos comparan órdenes en lugar de valores.",
    objective: "Usar Mann-Whitney, Wilcoxon y Kruskal-Wallis, y construir un procedimiento que elija la prueba según la pregunta, el diseño y los supuestos.",
    before: ["Pruebas t", "ANOVA", "Rangos (Spearman)"],
    packages: ["scipy", "numpy"],
    intuition: [
      "Las pruebas **basadas en rangos** sustituyen los valores por su posición ordenada; son robustas a atípicos y no suponen normalidad.",
      "",
      "| Diseño | Paramétrica | No paramétrica |",
      "- 2 grupos independientes: t de Welch ↔ **Mann-Whitney U**",
      "- 2 medidas pareadas: t pareada ↔ **Wilcoxon de rangos con signo**",
      "- ≥ 3 grupos independientes: ANOVA ↔ **Kruskal-Wallis**",
      "- 2 variables categóricas: χ² (o **Fisher exacta** si los esperados son pequeños)",
      "",
      "No son «libres de supuestos»: siguen exigiendo independencia, y Mann-Whitney compara distribuciones (si las formas difieren, no compara solo medianas). Antes de elegir: **¿cuál es la pregunta, qué diseño, qué tipo de variable y qué supuestos son plausibles?**",
    ],
    example: {
      code: py`from scipy import stats
a = [3, 4, 2, 5, 4, 3, 30]
b = [6, 7, 5, 8, 9, 7, 6]
print(round(stats.mannwhitneyu(a, b).pvalue, 4))
print(round(stats.ttest_ind(a, b, equal_var=False).pvalue, 4))`,
      lines: ["SciPy.", "Grupo con un atípico extremo.", "Otro grupo.", "Mann-Whitney detecta que b tiende a ser mayor (p ≈ 0,03).", "La t de Welch se confunde por el atípico (p ≈ 0,9)."],
    },
    challenge: [
      "1. `elegir_prueba(diseno, tipo, normal_aprox, esperados_min=None)` que devuelva el nombre de la prueba:",
      "   - `diseno`: `\"dos-independientes\"`, `\"dos-pareadas\"`, `\"varios-independientes\"`, `\"dos-categoricas\"`",
      "   - `tipo`: `\"continua\"`, `\"ordinal\"` o `\"categorica\"`; `normal_aprox`: bool",
      "   - Nombres: `\"t-welch\"`, `\"mann-whitney\"`, `\"t-pareada\"`, `\"wilcoxon\"`, `\"anova\"`, `\"kruskal-wallis\"`, `\"chi-cuadrado\"`, `\"fisher\"` (fisher si `esperados_min` < 5).",
      "   - Las variables ordinales nunca usan pruebas paramétricas.",
      "2. `comparar(a, b, pareado=False)`: aplica la prueba no paramétrica correspondiente con SciPy y devuelve `(nombre, p)`.",
      "3. `kruskal_p(*grupos)`: valor p de Kruskal-Wallis.",
    ],
    starter: py`from scipy import stats

def elegir_prueba(diseno, tipo, normal_aprox, esperados_min=None):
    return "t-welch"

def comparar(a, b, pareado=False):
    return ("t", stats.ttest_ind(a, b).pvalue)

def kruskal_p(*grupos):
    return 1`,
    solution: py`from scipy import stats

def elegir_prueba(diseno, tipo, normal_aprox, esperados_min=None):
    if diseno == "dos-categoricas" or tipo == "categorica":
        return "fisher" if esperados_min is not None and esperados_min < 5 else "chi-cuadrado"
    parametrica = tipo == "continua" and normal_aprox
    if diseno == "dos-independientes":
        return "t-welch" if parametrica else "mann-whitney"
    if diseno == "dos-pareadas":
        return "t-pareada" if parametrica else "wilcoxon"
    if diseno == "varios-independientes":
        return "anova" if parametrica else "kruskal-wallis"
    raise ValueError(diseno)

def comparar(a, b, pareado=False):
    if pareado:
        return ("wilcoxon", float(stats.wilcoxon(a, b).pvalue))
    return ("mann-whitney", float(stats.mannwhitneyu(a, b, alternative="two-sided").pvalue))

def kruskal_p(*grupos):
    return float(stats.kruskal(*grupos).pvalue)`,
    tests: py`
from scipy import stats

def test_elegir():
    "Elige la prueba según diseño y supuestos"
    f = t.get("elegir_prueba", "function")
    assert f("dos-independientes", "continua", True) == "t-welch"
    assert f("dos-independientes", "continua", False) == "mann-whitney"
    assert f("dos-independientes", "ordinal", True) == "mann-whitney"
    assert f("dos-pareadas", "continua", True) == "t-pareada"
    assert f("dos-pareadas", "ordinal", False) == "wilcoxon"
    assert f("varios-independientes", "continua", True) == "anova"
    assert f("varios-independientes", "continua", False) == "kruskal-wallis"
    assert f("dos-categoricas", "categorica", False, esperados_min=12) == "chi-cuadrado"
    assert f("dos-categoricas", "categorica", False, esperados_min=2.5) == "fisher"

def test_comparar():
    "Pruebas no paramétricas con SciPy"
    a, b = [3, 4, 2, 5, 4, 3, 30], [6, 7, 5, 8, 9, 7, 6]
    nombre, p = t.get("comparar", "function")(a, b)
    assert nombre == "mann-whitney" and approx(p, stats.mannwhitneyu(a, b, alternative="two-sided").pvalue)
    x, y = [10, 12, 9, 14, 11, 13, 15, 12], [9, 11, 9, 12, 10, 11, 12, 10]
    nombre, p = t.get("comparar")(x, y, pareado=True)
    assert nombre == "wilcoxon" and approx(p, stats.wilcoxon(x, y).pvalue)

def test_kruskal():
    "Kruskal-Wallis"
    g = ([1, 2, 3, 4], [3, 4, 5, 6], [7, 8, 9, 10])
    assert approx(t.get("kruskal_p", "function")(*g), stats.kruskal(*g).pvalue)
`,
    hints: [
      "Trata primero el caso categórico; después decide si es paramétrico (`continua` y `normal_aprox`).",
      "Mann-Whitney: `stats.mannwhitneyu(a, b, alternative=\"two-sided\")`; Wilcoxon: `stats.wilcoxon(a, b)`.",
      "Kruskal-Wallis: `stats.kruskal(*grupos)`.",
    ],
    errors: [
      { error: "Elegir la prueba según qué valor p sale menor", fix: "Eso infla los falsos positivos (p-hacking). La prueba se decide antes, por diseño y supuestos." },
      { error: "Decir que Mann-Whitney compara medianas siempre", fix: "Solo si las distribuciones tienen la misma forma; en general contrasta si una tiende a dar valores mayores que la otra." },
    ],
    quiz: {
      question: "Tienes satisfacción (escala 1–5) de los mismos 40 clientes antes y después de un cambio. ¿Qué prueba usarías?",
      options: [
        { text: "Wilcoxon de rangos con signo: datos pareados y ordinales" },
        { text: "t de Welch", misconception: "supuestos" },
        { text: "Mann-Whitney U", misconception: "supuestos" },
        { text: "Chi-cuadrado de bondad de ajuste" },
      ],
      answer: 0,
      explanation: "Las mismas personas medidas dos veces → pareadas; escala ordinal → rangos.",
    },
    review: "Repasa la tabla de decisión: diseño, tipo de variable y supuestos.",
    xp: 95,
    coins: 14,
  },
  {
    id: "i-potencia",
    world: "w4",
    zone: "Inferencia",
    title: "Los centinelas del error: tipo I, tipo II, potencia y comparaciones múltiples",
    kind: "lesson",
    difficulty: 4,
    skills: ["potencia", "errores-tipo", "comparaciones-multiples"],
    requires: ["i-no-parametricas"],
    story: "Los centinelas pueden dar falsas alarmas (error tipo I) o dejar pasar al enemigo (error tipo II). Diseñar bien la guardia es decidir cuántos centinelas poner antes de la batalla.",
    objective: "Verificar por simulación la tasa de error tipo I, estimar la potencia, calcular el tamaño muestral y corregir comparaciones múltiples (Bonferroni y Holm).",
    before: ["Pruebas de hipótesis", "Tamaño del efecto", "Simulación"],
    packages: ["numpy", "scipy", "statsmodels"],
    intuition: [
      "- **Error tipo I** (α): rechazar H₀ siendo cierta. Si el procedimiento es correcto, ocurre en una proporción α de los estudios sin efecto.",
      "- **Error tipo II** (β): no rechazar H₀ habiendo efecto. **Potencia** = 1 − β.",
      "- La potencia crece con el tamaño del efecto, con n y con α, y baja con la variabilidad.",
      "- El **tamaño muestral** se calcula **antes** del estudio para una potencia objetivo (p. ej. 80 %) y un efecto mínimo relevante.",
      "- **Comparaciones múltiples**: con m pruebas independientes a α = 0,05, P(algún falso positivo) = 1 − 0,95ᵐ. **Bonferroni** usa α/m; **Holm** es menos conservador y controla igual el error familiar.",
      "",
      "Experimenta en el Laboratorio estadístico → «Errores y potencia».",
    ],
    formal: "Con dos grupos y aproximación normal: n por grupo ≈ 2(z₁₋α/₂ + z₁₋β)²/d².",
    example: {
      code: py`from statsmodels.stats.power import TTestIndPower
import math
print(math.ceil(TTestIndPower().solve_power(effect_size=0.5, power=0.8, alpha=0.05)))
print(round(TTestIndPower().power(effect_size=0.5, nobs1=30, alpha=0.05), 3))
print(round(1 - 0.95 ** 20, 3))`,
      lines: ["Cálculos de potencia de statsmodels.", "Redondeo.", "n por grupo para d = 0,5 con 80 % de potencia: 64.", "Potencia con 30 por grupo: 0,478.", "Con 20 pruebas sin efecto, P(al menos un falso positivo) = 0,642."],
    },
    challenge: [
      "1. `tasa_rechazo(efecto, n, alfa, repeticiones, semilla)`: simula dos grupos normales (DE 1) de tamaño n con diferencia de medias `efecto`, aplica la t de Welch y devuelve la proporción de rechazos. Con efecto 0 estima el error tipo I; con efecto > 0, la potencia.",
      "2. `n_necesario(d, potencia=0.8, alfa=0.05)`: n por grupo (redondeado hacia arriba) con `TTestIndPower().solve_power`.",
      "3. `prob_algun_falso_positivo(m, alfa=0.05)`.",
      "4. `holm(pvalores, alfa=0.05)`: lista de booleanos (rechazar o no) con el procedimiento de Holm implementado **a mano**, en el orden original.",
    ],
    starter: py`import numpy as np
from scipy import stats
from statsmodels.stats.power import TTestIndPower

def tasa_rechazo(efecto, n, alfa, repeticiones, semilla):
    return alfa

def n_necesario(d, potencia=0.8, alfa=0.05):
    return 30

def prob_algun_falso_positivo(m, alfa=0.05):
    return alfa * m

def holm(pvalores, alfa=0.05):
    return [p < alfa for p in pvalores]`,
    solution: py`import math
import numpy as np
from scipy import stats
from statsmodels.stats.power import TTestIndPower

def tasa_rechazo(efecto, n, alfa, repeticiones, semilla):
    rng = np.random.default_rng(semilla)
    a = rng.normal(efecto, 1, size=(repeticiones, n))
    b = rng.normal(0, 1, size=(repeticiones, n))
    p = stats.ttest_ind(a, b, axis=1, equal_var=False).pvalue
    return float(np.mean(p < alfa))

def n_necesario(d, potencia=0.8, alfa=0.05):
    return math.ceil(TTestIndPower().solve_power(effect_size=d, power=potencia, alpha=alfa))

def prob_algun_falso_positivo(m, alfa=0.05):
    return 1 - (1 - alfa) ** m

def holm(pvalores, alfa=0.05):
    m = len(pvalores)
    orden = sorted(range(m), key=lambda i: pvalores[i])
    rechazo = [False] * m
    for paso, i in enumerate(orden):
        if pvalores[i] <= alfa / (m - paso):
            rechazo[i] = True
        else:
            break
    return rechazo`,
    tests: py`
from statsmodels.stats.multitest import multipletests

def test_tipo1():
    "Sin efecto, la tasa de rechazo ≈ α"
    r = t.get("tasa_rechazo", "function")(0, 20, 0.05, 20000, 1)
    assert abs(r - 0.05) < 0.006, f"Tasa {r}"

def test_potencia():
    "Con d = 0,5 y n = 64, potencia ≈ 0,8"
    r = t.get("tasa_rechazo")(0.5, 64, 0.05, 6000, 2)
    assert abs(r - 0.8) < 0.03

def test_n():
    "Tamaño muestral"
    f = t.get("n_necesario", "function")
    assert f(0.5) == 64 and f(0.2) == 394 and f(0.8, 0.9) == 34

def test_multiples():
    "Falsos positivos y Holm"
    assert approx(t.get("prob_algun_falso_positivo", "function")(20), 1 - 0.95 ** 20)
    h = t.get("holm", "function")
    for ps in ([0.01, 0.04, 0.03, 0.2], [0.001, 0.012, 0.014, 0.049, 0.3], [0.2, 0.3]):
        assert h(ps) == list(multipletests(ps, method="holm")[0]), ps
`,
    hints: [
      "`stats.ttest_ind(a, b, axis=1, equal_var=False)` hace todas las pruebas de una vez si a y b son matrices.",
      "Holm: ordena los p de menor a mayor y compara el k-ésimo (desde 0) con α/(m − k); detente en el primer fallo.",
      "`math.ceil` para redondear el tamaño muestral hacia arriba.",
    ],
    errors: [
      { error: "Calcular la potencia después del estudio con el efecto observado", fix: "La «potencia observada» es una función del valor p y no añade información. La potencia se planifica antes." },
      { error: "Probar muchas hipótesis y publicar solo las significativas", fix: "Garantiza falsos positivos. Preregistra, corrige por multiplicidad e informa de todas las pruebas." },
    ],
    quiz: {
      question: "Un estudio con poca potencia encuentra p = 0,04. ¿Qué cautela es especialmente importante?",
      options: [
        { text: "Que el efecto estimado probablemente esté exagerado y el resultado tenga menos probabilidad de replicarse" },
        { text: "Ninguna: p < 0,05 confirma el efecto", misconception: "p-valor" },
        { text: "Que el error tipo I es mayor que α" },
        { text: "Que debería haberse usado una prueba unilateral" },
      ],
      answer: 0,
      explanation: "Con poca potencia, solo superan el umbral las estimaciones que por azar salieron grandes (sesgo de magnitud). La replicación suele dar efectos menores.",
    },
    review: "Repasa α, β, potencia, cómo planificar n y por qué corregir comparaciones múltiples.",
    xp: 100,
    coins: 15,
  },
  {
    id: "r-correlacion",
    world: "w4",
    zone: "Correlación y regresión",
    title: "Los hilos invisibles: correlación, atípicos y causalidad",
    kind: "lesson",
    difficulty: 3,
    skills: ["correlacion", "causalidad"],
    requires: ["i-potencia"],
    story: "En la ciudad, las ventas de helados y los ahogamientos suben juntos. ¿Los helados causan ahogamientos? Los hilos invisibles que unen variables a veces pasan por una tercera: el verano.",
    objective: "Calcular Pearson y Spearman con su valor p, ver cómo los atípicos y las relaciones no lineales los engañan, y reconocer correlaciones espurias por confusión.",
    before: ["Covarianza", "Pruebas de hipótesis", "Rangos"],
    packages: ["numpy", "scipy"],
    intuition: [
      "- **Pearson (r)**: fuerza de la relación **lineal** entre −1 y 1. Sensible a atípicos.",
      "- **Spearman (ρ)**: Pearson sobre rangos; mide relaciones **monótonas** y es robusto.",
      "- r ≈ 0 no implica independencia: una parábola perfecta puede tener r = 0.",
      "- El **cuarteto de Anscombe**: cuatro conjuntos con la misma r (0,816) y formas totalmente distintas. **Grafica siempre.**",
      "- **Correlación no implica causalidad**: puede haber una variable de **confusión** (temperatura → helados y baños), causalidad inversa, selección o simple azar.",
      "",
      "Pruébalo en el Laboratorio estadístico → «Regresión y correlación» (botón de atípico influyente).",
    ],
    formal: "r = Σ(xᵢ − x̄)(yᵢ − ȳ) / √(Σ(xᵢ − x̄)² Σ(yᵢ − ȳ)²). Prueba: t = r√(n − 2)/√(1 − r²) con n − 2 gl.",
    example: {
      code: py`import numpy as np
from scipy import stats
x = np.linspace(-3, 3, 50)
y = x ** 2
print(round(stats.pearsonr(x, y)[0], 3), round(stats.spearmanr(x, y)[0], 3))`,
      lines: ["NumPy.", "SciPy.", "x simétrico.", "Relación perfecta pero en forma de U.", "Ambos coeficientes ≈ 0: no detectan relaciones no monótonas."],
    },
    challenge: [
      "1. `pearson_p(x, y)`: (r, p) **a mano** con la fórmula de la t (gl = n − 2).",
      "2. `efecto_atipico(x, y, x_at, y_at)`: diccionario con `pearson_sin`, `pearson_con`, `spearman_sin`, `spearman_con` al añadir un punto atípico.",
      "3. `anscombe_r`: lista con las cuatro correlaciones de Pearson del cuarteto (definido en el código inicial), redondeadas a 3.",
      "4. `parcial(x, y, z)`: correlación parcial de x e y controlando por z: correlación entre los residuos de regresar x sobre z y y sobre z (usa `np.polyfit`). Con los datos `helados`, `banos`, `temperatura` del código inicial debe ser pequeña aunque la correlación bruta sea alta.",
    ],
    starter: py`import numpy as np
from scipy import stats

ANSCOMBE = {
    "I": ([10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]),
    "II": ([10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]),
    "III": ([10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73]),
    "IV": ([8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8], [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89]),
}
rng = np.random.default_rng(4)
temperatura = rng.uniform(10, 35, 200)
helados = 20 + 3 * temperatura + rng.normal(0, 8, 200)
banos = 5 + 2 * temperatura + rng.normal(0, 6, 200)

def pearson_p(x, y):
    return (0, 1)

def efecto_atipico(x, y, x_at, y_at):
    return {}

anscombe_r = []

def parcial(x, y, z):
    return np.corrcoef(x, y)[0, 1]`,
    solution: py`import numpy as np
from scipy import stats

ANSCOMBE = {
    "I": ([10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]),
    "II": ([10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]),
    "III": ([10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5], [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73]),
    "IV": ([8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8], [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89]),
}
rng = np.random.default_rng(4)
temperatura = rng.uniform(10, 35, 200)
helados = 20 + 3 * temperatura + rng.normal(0, 8, 200)
banos = 5 + 2 * temperatura + rng.normal(0, 6, 200)

def pearson_p(x, y):
    x, y = np.asarray(x, float), np.asarray(y, float)
    dx, dy = x - x.mean(), y - y.mean()
    r = (dx * dy).sum() / np.sqrt((dx ** 2).sum() * (dy ** 2).sum())
    n = len(x)
    t = r * np.sqrt(n - 2) / np.sqrt(1 - r ** 2)
    return (float(r), float(2 * stats.t.sf(abs(t), n - 2)))

def efecto_atipico(x, y, x_at, y_at):
    x2, y2 = list(x) + [x_at], list(y) + [y_at]
    return {
        "pearson_sin": stats.pearsonr(x, y)[0], "pearson_con": stats.pearsonr(x2, y2)[0],
        "spearman_sin": stats.spearmanr(x, y)[0], "spearman_con": stats.spearmanr(x2, y2)[0],
    }

anscombe_r = [round(float(stats.pearsonr(x, y)[0]), 3) for x, y in ANSCOMBE.values()]

def _residuos(a, z):
    b1, b0 = np.polyfit(z, a, 1)
    return np.asarray(a) - (b0 + b1 * np.asarray(z))

def parcial(x, y, z):
    return float(np.corrcoef(_residuos(x, z), _residuos(y, z))[0, 1])

print(anscombe_r, np.corrcoef(helados, banos)[0, 1], parcial(helados, banos, temperatura))`,
    tests: py`
import numpy as np
from scipy import stats

def test_pearson():
    "Pearson y su valor p como scipy"
    x, y = [1, 2, 3, 4, 5, 6, 7, 8], [1, 3, 2, 5, 4, 7, 6, 9]
    r, p = t.get("pearson_p", "function")(x, y)
    ref = stats.pearsonr(x, y)
    assert approx(r, ref[0], 1e-9) and approx(p, ref[1], 1e-9)

def test_atipico():
    "Un atípico hunde Pearson más que Spearman"
    x = list(range(1, 21))
    y = [v + (v % 3) for v in x]
    e = t.get("efecto_atipico", "function")(x, y, 25, -40)
    caida_p = e["pearson_sin"] - e["pearson_con"]
    caida_s = e["spearman_sin"] - e["spearman_con"]
    assert caida_p > 0.5 and caida_s < caida_p

def test_anscombe():
    "Misma correlación, formas distintas"
    assert t.get("anscombe_r") == [0.816, 0.816, 0.816, 0.817]

def test_parcial():
    "La correlación desaparece al controlar la temperatura"
    h, b, tt = t.get("helados"), t.get("banos"), t.get("temperatura")
    assert np.corrcoef(h, b)[0, 1] > 0.7
    assert abs(t.get("parcial", "function")(h, b, tt)) < 0.15
`,
    hints: [
      "Calcula r con desviaciones centradas y luego t = r√(n − 2)/√(1 − r²).",
      "Para el atípico, añade el punto a copias de las listas y compara coeficientes.",
      "Correlación parcial: residuos de x ~ z y de y ~ z con `np.polyfit(z, a, 1)`; luego su correlación.",
    ],
    errors: [
      { error: "Afirmar causalidad a partir de una correlación", fix: "Busca explicaciones alternativas: confusión, causalidad inversa, selección, azar. Para causalidad hacen falta diseño (experimentos) o supuestos explícitos." },
      { error: "Concluir «no hay relación» con r ≈ 0", fix: "r solo mide lo lineal. Mira el diagrama de dispersión." },
    ],
    quiz: {
      question: "En los países con más consumo de chocolate hay más premios Nobel per cápita (r ≈ 0,8). ¿Qué concluyes?",
      options: [
        { text: "Que hay asociación a nivel de países, probablemente explicada por factores como la riqueza; no permite concluir que el chocolate cause premios" },
        { text: "Comer chocolate aumenta la probabilidad de ganar un Nobel", misconception: "correlacion-causalidad" },
        { text: "Ganar un Nobel hace comer más chocolate", misconception: "correlacion-causalidad" },
        { text: "La correlación es falsa porque es demasiado alta" },
      ],
      answer: 0,
      explanation: "Es una correlación ecológica (entre países) con un evidente factor de confusión (riqueza, inversión en investigación).",
    },
    review: "Repasa por qué r solo mide lo lineal, cómo influyen los atípicos y qué es una variable de confusión.",
    xp: 90,
    coins: 13,
  },
  {
    id: "r-lineal",
    world: "w4",
    zone: "Correlación y regresión",
    title: "La recta del astrónomo: regresión lineal simple y múltiple",
    kind: "lesson",
    difficulty: 4,
    skills: ["regresion", "statsmodels", "interpretacion"],
    requires: ["r-correlacion"],
    story: "El astrónomo quiere predecir la nota final de los aprendices a partir de sus horas de estudio, asistencia y nota previa. Una recta (o un plano) puede ayudar… si se interpreta con cuidado.",
    objective: "Ajustar regresiones lineales con statsmodels, interpretar coeficientes, IC, R² y R² ajustado, distinguir intervalos de confianza y de predicción, e inspeccionar residuos y multicolinealidad.",
    before: ["Correlación", "Intervalos de confianza", "Álgebra lineal"],
    packages: ["pandas", "statsmodels", "numpy"],
    files: { "estudiantes.csv": estudiantesCsv() },
    intuition: [
      "Modelo: y = β₀ + β₁x₁ + … + βₖxₖ + ε. Los coeficientes se estiman por **mínimos cuadrados**.",
      "",
      "- βⱼ: cambio medio de y por unidad de xⱼ **manteniendo constantes las demás** variables del modelo (asociación ajustada, no efecto causal).",
      "- Variables categóricas: se codifican como indicadoras (`C(grupo)` en la fórmula); el coeficiente compara con la categoría de referencia. Las **interacciones** (`x1:x2`) permiten que el efecto de una variable dependa de otra.",
      "- **R²**: proporción de la varianza de y explicada. **R² ajustado** penaliza añadir variables inútiles.",
      "- **IC de la media** (para el promedio de y dado x) es más estrecho que el **intervalo de predicción** (para un individuo nuevo).",
      "- Supuestos: linealidad, independencia, varianza constante de los residuos (si no, **heterocedasticidad**), residuos aproximadamente normales para inferencias con n pequeño, y sin **multicolinealidad** severa (VIF alto).",
      "",
      "Con statsmodels: `smf.ols(\"nota_final ~ horas_estudio + asistencia\", data=df).fit()`.",
    ],
    formal: "β̂ = (XᵀX)⁻¹Xᵀy;  R² = 1 − SC_res/SC_tot;  R²_aj = 1 − (1 − R²)(n − 1)/(n − p − 1);  VIFⱼ = 1/(1 − R²ⱼ).",
    example: {
      code: py`import pandas as pd
import statsmodels.formula.api as smf
df = pd.read_csv("estudiantes.csv")
m = smf.ols("nota_final ~ horas_estudio", data=df).fit()
print(m.params.round(3))
print(round(m.rsquared, 3), m.conf_int().loc["horas_estudio"].round(3).tolist())`,
      lines: ["pandas.", "Interfaz de fórmulas de statsmodels.", "Datos de 200 estudiantes.", "Regresión simple de la nota sobre las horas.", "Intercepto y pendiente (≈ 0,3 puntos por hora).", "R² e IC 95 % de la pendiente."],
    },
    challenge: [
      "Con `estudiantes.csv`:",
      "1. `simple`: modelo `nota_final ~ horas_estudio`; `multiple`: `nota_final ~ horas_estudio + asistencia + nota_previa`.",
      "2. `coef_horas`: diccionario `{\"simple\": β, \"multiple\": β}` del coeficiente de horas en cada modelo (redondeados a 3).",
      "3. `ic_asistencia`: tupla con el IC 95 % del coeficiente de asistencia en el modelo múltiple.",
      "4. `prediccion`: para un estudiante con 8 horas, asistencia 0,9 y nota previa 7, diccionario con `media`, `ic_media` (tupla) e `ip` (intervalo de predicción, tupla), usando `get_prediction(...).summary_frame(alpha=0.05)`.",
      "5. `vif`: diccionario variable → VIF de las tres explicativas (usa `variance_inflation_factor` sobre la matriz con constante).",
      "6. `residuos_ok`: True si la media de los residuos del múltiple es ≈ 0 (|media| < 1e-8) y no hay residuos estandarizados con |valor| > 4.",
    ],
    starter: py`import pandas as pd
import statsmodels.formula.api as smf

df = pd.read_csv("estudiantes.csv")
simple = None
multiple = None
coef_horas = {}
ic_asistencia = (0, 0)
prediccion = {}
vif = {}
residuos_ok = False`,
    solution: py`import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
from statsmodels.stats.outliers_influence import variance_inflation_factor

df = pd.read_csv("estudiantes.csv")
simple = smf.ols("nota_final ~ horas_estudio", data=df).fit()
multiple = smf.ols("nota_final ~ horas_estudio + asistencia + nota_previa", data=df).fit()
coef_horas = {"simple": round(simple.params["horas_estudio"], 3), "multiple": round(multiple.params["horas_estudio"], 3)}
ic_asistencia = tuple(multiple.conf_int().loc["asistencia"])
nuevo = pd.DataFrame({"horas_estudio": [8], "asistencia": [0.9], "nota_previa": [7]})
sf = multiple.get_prediction(nuevo).summary_frame(alpha=0.05)
prediccion = {
    "media": float(sf["mean"].iloc[0]),
    "ic_media": (float(sf["mean_ci_lower"].iloc[0]), float(sf["mean_ci_upper"].iloc[0])),
    "ip": (float(sf["obs_ci_lower"].iloc[0]), float(sf["obs_ci_upper"].iloc[0])),
}
X = sm.add_constant(df[["horas_estudio", "asistencia", "nota_previa"]])
vif = {c: float(variance_inflation_factor(X.values, i)) for i, c in enumerate(X.columns) if c != "const"}
estand = multiple.get_influence().resid_studentized_internal
residuos_ok = bool(abs(multiple.resid.mean()) < 1e-8 and np.all(np.abs(estand) <= 4))
print(multiple.summary())`,
    tests: py`
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
D = pd.read_csv("estudiantes.csv")
M = smf.ols("nota_final ~ horas_estudio + asistencia + nota_previa", data=D).fit()

def test_modelos():
    "Modelos ajustados"
    assert set(t.get("multiple").params.index) == {"Intercept", "horas_estudio", "asistencia", "nota_previa"}
    assert approx(t.get("multiple").rsquared, M.rsquared)
    assert t.get("multiple").rsquared_adj > t.get("simple").rsquared_adj

def test_coeficientes():
    "Coeficiente de horas e IC de asistencia"
    c = t.get("coef_horas")
    assert approx(c["multiple"], round(M.params["horas_estudio"], 3)) and abs(c["multiple"] - 0.35) < 0.05
    lo, hi = t.get("ic_asistencia")
    ref = M.conf_int().loc["asistencia"]
    assert approx(lo, ref[0]) and approx(hi, ref[1]) and lo > 0

def test_prediccion():
    "El intervalo de predicción es más ancho que el de la media"
    p = t.get("prediccion")
    assert p["ic_media"][0] < p["media"] < p["ic_media"][1]
    assert p["ip"][0] < p["ic_media"][0] and p["ip"][1] > p["ic_media"][1]

def test_vif_residuos():
    "VIF y residuos"
    v = t.get("vif")
    assert set(v) == {"horas_estudio", "asistencia", "nota_previa"} and all(1 <= x < 2 for x in v.values())
    assert t.get("residuos_ok") is True
`,
    hints: [
      "`smf.ols(\"y ~ x1 + x2\", data=df).fit()`; los coeficientes están en `.params` y los IC en `.conf_int()`.",
      "`modelo.get_prediction(nuevo_df).summary_frame(alpha=0.05)` tiene `mean_ci_*` (media) y `obs_ci_*` (predicción).",
      "VIF: `variance_inflation_factor(X.values, i)` con X = `sm.add_constant(df[cols])`.",
    ],
    errors: [
      { error: "Interpretar un coeficiente como efecto causal", fix: "Es una asociación ajustada por las variables incluidas. Puede haber confusión por variables no medidas." },
      { error: "Usar el IC de la media para predecir a una persona", fix: "Para un individuo nuevo, usa el intervalo de predicción: incluye la variabilidad individual." },
    ],
    quiz: {
      question: "El coeficiente de horas baja de 0,45 (modelo simple) a 0,35 (múltiple). ¿Por qué puede ocurrir?",
      options: [
        { text: "Parte de la asociación simple se debía a otras variables correlacionadas con las horas (p. ej. asistencia)" },
        { text: "El modelo múltiple está mal ajustado" },
        { text: "Las horas tienen ahora menos varianza" },
        { text: "Porque R² baja al añadir variables" },
      ],
      answer: 0,
      explanation: "El coeficiente ajustado mide la asociación «manteniendo constantes» las demás variables; si éstas se relacionan con las horas, el valor cambia.",
    },
    review: "Repasa la interpretación de coeficientes ajustados y la diferencia entre IC de la media e intervalo de predicción.",
    xp: 110,
    coins: 16,
  },
  {
    id: "r-logistica",
    world: "w4",
    zone: "Correlación y regresión",
    title: "La moneda cargada: regresión logística y odds ratios",
    kind: "lesson",
    difficulty: 4,
    skills: ["regresion-logistica", "odds", "glm"],
    requires: ["r-lineal"],
    story: "No todos los resultados son números: aprobar o suspender, enfermar o no. La regresión logística modela cómo cambian las probabilidades… a través de una moneda cargada llamada odds.",
    objective: "Ajustar una regresión logística, interpretar coeficientes como odds ratios con IC, obtener probabilidades predichas y entender el modelo como un GLM.",
    before: ["Regresión lineal", "Probabilidad", "Logaritmos"],
    packages: ["pandas", "statsmodels", "numpy"],
    files: { "estudiantes.csv": estudiantesCsv() },
    intuition: [
      "Para un resultado binario modelamos la probabilidad p con el **logit**: log(p/(1 − p)) = β₀ + β₁x₁ + …",
      "",
      "- **Odds** = p/(1 − p). p = 0,75 → odds 3 (tres a uno).",
      "- e^β₁ es el **odds ratio** (OR): cuánto se multiplican las odds por cada unidad de x₁, manteniendo el resto constante.",
      "- OR ≠ riesgo relativo: cuando el resultado es frecuente, el OR exagera el RR.",
      "- Probabilidad predicha: p = 1/(1 + e^(−η)).",
      "",
      "Es un **modelo lineal generalizado** (GLM) con distribución binomial y enlace logit. Se estima por máxima verosimilitud. Pocas observaciones del resultado por variable (< 10) dan estimaciones inestables.",
    ],
    formal: "P(Y = 1 | x) = 1 / (1 + exp(−xᵀβ)). IC del OR: exp(β̂ ± 1,96·EE(β̂)).",
    example: {
      code: py`import numpy as np
p = 0.2
odds = p / (1 - p)
nuevo = odds * 2
print(round(odds, 3), round(nuevo / (1 + nuevo), 3))`,
      lines: ["NumPy.", "Probabilidad inicial 20 %.", "Odds 0,25.", "Un OR de 2 duplica las odds…", "…y la probabilidad pasa de 0,2 a 0,333 (no al doble)."],
    },
    challenge: [
      "Con `estudiantes.csv` (variable respuesta `aprobado`):",
      "1. `modelo`: `smf.logit(\"aprobado ~ horas_estudio + asistencia\", data=df).fit(disp=0)`.",
      "2. `odds_ratios`: DataFrame con columnas `OR`, `inf`, `sup` (IC 95 % exponenciado) para `horas_estudio` y `asistencia` (sin el intercepto).",
      "3. `prob_pred`: probabilidad predicha de aprobar con 2 horas y asistencia 0,6, y con 10 horas y asistencia 0,95 (lista de dos valores).",
      "4. `prob_manual(b0, b1, b2, x1, x2)`: probabilidad con la función logística a mano; debe coincidir con `modelo.predict`.",
      "5. `or_horas_texto`: frase que interprete el OR de horas mencionando que multiplica las **odds** (no la probabilidad) e incluyendo el IC con dos decimales.",
    ],
    starter: py`import numpy as np
import pandas as pd
import statsmodels.formula.api as smf

df = pd.read_csv("estudiantes.csv")
modelo = None
odds_ratios = None
prob_pred = []

def prob_manual(b0, b1, b2, x1, x2):
    return b0 + b1 * x1 + b2 * x2

or_horas_texto = ""`,
    solution: py`import numpy as np
import pandas as pd
import statsmodels.formula.api as smf

df = pd.read_csv("estudiantes.csv")
modelo = smf.logit("aprobado ~ horas_estudio + asistencia", data=df).fit(disp=0)
ci = modelo.conf_int()
odds_ratios = pd.DataFrame({"OR": np.exp(modelo.params), "inf": np.exp(ci[0]), "sup": np.exp(ci[1])}).drop(index="Intercept")
nuevos = pd.DataFrame({"horas_estudio": [2, 10], "asistencia": [0.6, 0.95]})
prob_pred = modelo.predict(nuevos).tolist()

def prob_manual(b0, b1, b2, x1, x2):
    eta = b0 + b1 * x1 + b2 * x2
    return 1 / (1 + np.exp(-eta))

o = odds_ratios.loc["horas_estudio"]
or_horas_texto = (f"Cada hora adicional de estudio multiplica las odds de aprobar por {o['OR']:.2f} "
                  f"(IC 95 %: {o['inf']:.2f} a {o['sup']:.2f}), manteniendo constante la asistencia.")
print(odds_ratios.round(2))
print(prob_pred)
print(or_horas_texto)`,
    tests: py`
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
D = pd.read_csv("estudiantes.csv")
M = smf.logit("aprobado ~ horas_estudio + asistencia", data=D).fit(disp=0)

def test_or():
    "Odds ratios e IC"
    o = t.get("odds_ratios")
    assert list(o.index) == ["horas_estudio", "asistencia"] and list(o.columns) == ["OR", "inf", "sup"]
    assert approx(o.loc["horas_estudio", "OR"], np.exp(M.params["horas_estudio"]))
    assert approx(o.loc["asistencia", "sup"], np.exp(M.conf_int().loc["asistencia", 1]))
    assert o.loc["horas_estudio", "inf"] > 1

def test_prob():
    "Probabilidades predichas"
    p = t.get("prob_pred")
    assert len(p) == 2 and 0 < p[0] < p[1] < 1

def test_manual():
    "Logística a mano"
    b = M.params
    v = t.get("prob_manual", "function")(b["Intercept"], b["horas_estudio"], b["asistencia"], 5, 0.8)
    ref = M.predict(pd.DataFrame({"horas_estudio": [5], "asistencia": [0.8]})).iloc[0]
    assert approx(v, ref, 1e-9)

def test_texto():
    "Interpretación correcta del OR"
    s = t.get("or_horas_texto").lower()
    o = np.exp(M.conf_int().loc["horas_estudio"])
    assert "odds" in s and f"{o[0]:.2f}" in s and f"{o[1]:.2f}" in s
    assert "probabilidad" not in s.split("odds")[0], "El OR multiplica las odds, no la probabilidad"
`,
    hints: [
      "Los OR son `np.exp(modelo.params)` y sus IC `np.exp(modelo.conf_int())`.",
      "`modelo.predict(DataFrame)` devuelve probabilidades.",
      "Logística: 1/(1 + e^(−η)) con η = b0 + b1·x1 + b2·x2.",
    ],
    errors: [
      { error: "Decir que un OR de 2 duplica la probabilidad", fix: "Duplica las odds. La probabilidad cambia menos, sobre todo si ya era alta." },
      { error: "PerfectSeparationError o coeficientes enormes", fix: "Una variable separa perfectamente los grupos o hay muy pocos eventos. Revisa los datos o usa regularización." },
    ],
    quiz: {
      question: "Un estudio de casos y controles informa OR = 3 para un factor. ¿Qué expresa?",
      options: [
        { text: "Las odds de exposición son el triple en los casos que en los controles (≈ odds del resultado en expuestos frente a no expuestos)" },
        { text: "El factor triplica la probabilidad de enfermar", misconception: "sens-espec" },
        { text: "El factor causa la enfermedad", misconception: "correlacion-causalidad" },
        { text: "El 30 % de los expuestos enferma" },
      ],
      answer: 0,
      explanation: "El OR compara odds, no probabilidades, y por sí solo no prueba causalidad. Se aproxima al RR solo si el resultado es raro.",
    },
    review: "Repasa la diferencia entre odds y probabilidad y cómo se interpreta un odds ratio.",
    xp: 105,
    coins: 15,
  },
  {
    id: "b-beta-binomial",
    world: "w4",
    zone: "Estadística bayesiana",
    title: "El búho que actualiza: inferencia bayesiana conjugada",
    kind: "lesson",
    difficulty: 4,
    skills: ["bayesiana", "intervalo-creible"],
    requires: ["r-logistica"],
    story: "El búho bayesiano no olvida lo que sabía: combina su creencia previa con cada nueva observación y actualiza. Tras ver los datos, puede decir «hay un 92 % de probabilidad de que p supere 0,5».",
    objective: "Aplicar el modelo beta-binomial: previa, verosimilitud y posterior; intervalos creíbles, probabilidades posteriores, predicción posterior y sensibilidad a la previa.",
    before: ["Teorema de Bayes", "Distribución beta", "Intervalos de confianza"],
    packages: ["scipy", "numpy"],
    intuition: [
      "En el enfoque bayesiano el parámetro p es incierto y se describe con una distribución.",
      "",
      "- **Previa** Beta(α, β): lo que crees antes de los datos. Beta(1, 1) es plana; Beta(2, 2) débilmente informativa; Beta(30, 70) muy informativa (centrada en 0,3).",
      "- **Verosimilitud**: k éxitos en n ensayos (binomial).",
      "- **Posterior**: Beta(α + k, β + n − k). Previa y posterior de la misma familia: **conjugadas**.",
      "- **Intervalo creíble** 95 %: percentiles 2,5 y 97,5 de la posterior. Aquí sí: «dados la previa y los datos, P(p ∈ intervalo) = 0,95».",
      "- **Predicción posterior**: P(siguiente éxito) = (α + k)/(α + β + n).",
      "",
      "Con muchos datos, la posterior apenas depende de previas razonables. Con pocos, la previa importa: **justifícala y analiza la sensibilidad**. Experimenta en el Laboratorio estadístico → «Actualización bayesiana».",
    ],
    formal: "p(θ | datos) ∝ p(datos | θ)·p(θ). Beta(α, β)·θᵏ(1−θ)ⁿ⁻ᵏ ∝ θ^{α+k−1}(1−θ)^{β+n−k−1}.",
    example: {
      code: py`from scipy import stats
a, b, k, n = 2, 2, 14, 20
post = stats.beta(a + k, b + n - k)
print(round(post.mean(), 3), [round(v, 3) for v in post.ppf([0.025, 0.975])])
print(round(post.sf(0.5), 3))`,
      lines: ["SciPy.", "Previa Beta(2, 2) y 14 éxitos de 20.", "Posterior Beta(16, 8).", "Media posterior 0,667 e intervalo creíble 95 %.", "P(p > 0,5 | datos) ≈ 0,95."],
    },
    challenge: [
      "1. `posterior(a, b, k, n)`: tupla (α', β').",
      "2. `resumen_posterior(a, b, k, n)`: diccionario con `media`, `creible` (tupla 95 %), `p_mayor_05` = P(p > 0,5 | datos) y `pred_siguiente`.",
      "3. `sensibilidad(k, n, previas)`: lista de medias posteriores para una lista de previas (a, b).",
      "4. `actualizar_en_lotes(a, b, lotes)`: aplica la actualización lote a lote (cada lote es (k, n)) y devuelve la posterior final; debe coincidir con actualizar de una vez con todos los datos.",
    ],
    starter: py`from scipy import stats

def posterior(a, b, k, n):
    return (a, b)

def resumen_posterior(a, b, k, n):
    return {}

def sensibilidad(k, n, previas):
    return []

def actualizar_en_lotes(a, b, lotes):
    return (a, b)`,
    solution: py`from scipy import stats

def posterior(a, b, k, n):
    return (a + k, b + n - k)

def resumen_posterior(a, b, k, n):
    a2, b2 = posterior(a, b, k, n)
    d = stats.beta(a2, b2)
    return {
        "media": float(d.mean()),
        "creible": (float(d.ppf(0.025)), float(d.ppf(0.975))),
        "p_mayor_05": float(d.sf(0.5)),
        "pred_siguiente": a2 / (a2 + b2),
    }

def sensibilidad(k, n, previas):
    return [resumen_posterior(a, b, k, n)["media"] for a, b in previas]

def actualizar_en_lotes(a, b, lotes):
    for k, n in lotes:
        a, b = posterior(a, b, k, n)
    return (a, b)`,
    tests: py`
from scipy import stats

def test_posterior():
    "Conjugación"
    assert t.get("posterior", "function")(2, 2, 14, 20) == (16, 8)

def test_resumen():
    "Resumen posterior"
    r = t.get("resumen_posterior", "function")(2, 2, 14, 20)
    assert approx(r["media"], 16 / 24) and approx(r["pred_siguiente"], 16 / 24)
    assert approx(r["creible"][0], stats.beta(16, 8).ppf(0.025)) and approx(r["p_mayor_05"], stats.beta(16, 8).sf(0.5))

def test_sensibilidad():
    "Con pocos datos la previa importa; con muchos, menos"
    f = t.get("sensibilidad", "function")
    previas = [(1, 1), (30, 70)]
    poco = f(7, 10, previas)
    mucho = f(700, 1000, previas)
    assert abs(poco[0] - poco[1]) > 0.3 and abs(mucho[0] - mucho[1]) < 0.05

def test_lotes():
    "Actualizar por lotes = actualizar de una vez"
    assert t.get("actualizar_en_lotes", "function")(1, 1, [(3, 5), (6, 10), (0, 4)]) == (10, 11) == t.get("posterior")(1, 1, 9, 19)
`,
    hints: [
      "Posterior: suma k a α y n − k a β.",
      "Con `stats.beta(a2, b2)` tienes `.mean()`, `.ppf([0.025, 0.975])` y `.sf(0.5)`.",
      "La predicción del siguiente éxito es la media posterior.",
    ],
    errors: [
      { error: "Elegir la previa después de ver los datos para obtener el resultado deseado", fix: "La previa se justifica con conocimiento previo, se declara antes y se acompaña de un análisis de sensibilidad." },
      { error: "Llamar «intervalo de confianza» al creíble", fix: "Son conceptos distintos: el creíble es una afirmación de probabilidad sobre el parámetro condicionada a la previa y los datos." },
    ],
    quiz: {
      question: "¿Qué permite afirmar un intervalo creíble del 95 % que un intervalo de confianza no permite?",
      options: [
        { text: "Que, dados la previa y los datos, hay un 95 % de probabilidad de que el parámetro esté en el intervalo" },
        { text: "Nada: son lo mismo con otro nombre", misconception: "ic-vs-creible" },
        { text: "Que el 95 % de los datos caen dentro", misconception: "de-vs-ee" },
        { text: "Que el resultado se replicará el 95 % de las veces" },
      ],
      answer: 0,
      explanation: "El creíble describe la incertidumbre sobre el parámetro (a costa de especificar una previa); el IC describe la fiabilidad del procedimiento.",
    },
    review: "Repasa la actualización beta-binomial y la interpretación del intervalo creíble.",
    xp: 100,
    coins: 15,
  },
  {
    id: "b-mcmc",
    world: "w4",
    zone: "Estadística bayesiana",
    title: "Los caminantes de Markov: Monte Carlo y MCMC",
    kind: "lesson",
    difficulty: 5,
    skills: ["bayesiana", "monte-carlo", "mcmc"],
    requires: ["b-beta-binomial"],
    story: "Cuando la posterior no tiene fórmula, los caminantes de Markov la exploran a pasos: proponen un lugar cercano y deciden si moverse según lo plausible que sea. Tras muchos pasos, su recorrido dibuja la posterior.",
    objective: "Estimar integrales y probabilidades por Monte Carlo y programar un muestreador de Metropolis que reproduzca una posterior conocida.",
    before: ["Inferencia bayesiana conjugada", "Simulación", "Logaritmos"],
    packages: ["numpy", "scipy"],
    intuition: [
      "- **Monte Carlo**: aproximar una cantidad con muestras aleatorias. E[g(X)] ≈ (1/N) Σ g(xᵢ). El error baja como 1/√N.",
      "- **MCMC (Metropolis)**: para muestrear de una posterior conocida salvo una constante:",
      "  1. Desde θ, propone θ* = θ + ruido.",
      "  2. Acepta con probabilidad min(1, post(θ*)/post(θ)) (se trabaja con logaritmos).",
      "  3. Si rechaza, repite θ.",
      "",
      "Las primeras iteraciones (**calentamiento**) se descartan. La cadena está autocorrelacionada: necesitas muchas iteraciones y comprobar la convergencia (varias cadenas, trazas). En la práctica se usan librerías como PyMC o Stan, que fuera del navegador implementan algoritmos más eficientes (HMC/NUTS).",
    ],
    formal: "Metropolis con propuesta simétrica deja invariante la distribución objetivo π: la condición de balance detallado π(θ)q(θ*|θ)α = π(θ*)q(θ|θ*)α' se cumple con α = min(1, π(θ*)/π(θ)).",
    example: {
      code: py`import numpy as np
rng = np.random.default_rng(0)
u = rng.random((100_000, 2))
dentro = (u ** 2).sum(axis=1) <= 1
print(4 * dentro.mean())`,
      lines: ["NumPy.", "Semilla.", "Puntos uniformes en el cuadrado unidad.", "¿Caen dentro del cuarto de círculo?", "4 × proporción ≈ π."],
    },
    challenge: [
      "1. `mc_esperanza(g, muestreador, n, semilla)`: aproxima E[g(X)] con n muestras de `muestreador(rng, n)`; devuelve (estimación, error estándar).",
      "2. `log_posterior(theta, k, n, a=1, b=1)`: log-posterior beta-binomial sin normalizar; −∞ si θ fuera de (0, 1).",
      "3. `metropolis(logpost, inicio, pasos, escala, semilla)`: devuelve (array de muestras, tasa de aceptación).",
      "4. Con k = 14, n = 20 y previa plana, ejecuta 20 000 pasos (escala 0.1, semilla 1), descarta los 2 000 primeros y guarda la media de la cadena en `media_mcmc` (la exacta es 15/22).",
    ],
    starter: py`import numpy as np

def mc_esperanza(g, muestreador, n, semilla):
    return (0, 0)

def log_posterior(theta, k, n, a=1, b=1):
    return 0

def metropolis(logpost, inicio, pasos, escala, semilla):
    return np.array([inicio]), 0

media_mcmc = 0`,
    solution: py`import numpy as np

def mc_esperanza(g, muestreador, n, semilla):
    rng = np.random.default_rng(semilla)
    v = g(muestreador(rng, n))
    return (float(v.mean()), float(v.std(ddof=1) / np.sqrt(n)))

def log_posterior(theta, k, n, a=1, b=1):
    if not 0 < theta < 1:
        return -np.inf
    return (a - 1 + k) * np.log(theta) + (b - 1 + n - k) * np.log(1 - theta)

def metropolis(logpost, inicio, pasos, escala, semilla):
    rng = np.random.default_rng(semilla)
    actual, lp = inicio, logpost(inicio)
    muestras = np.empty(pasos)
    aceptados = 0
    for i in range(pasos):
        prop = actual + rng.normal(0, escala)
        lp_prop = logpost(prop)
        if np.log(rng.random()) < lp_prop - lp:
            actual, lp = prop, lp_prop
            aceptados += 1
        muestras[i] = actual
    return muestras, aceptados / pasos

cadena, tasa = metropolis(lambda th: log_posterior(th, 14, 20), 0.5, 20000, 0.1, 1)
media_mcmc = float(cadena[2000:].mean())
print(media_mcmc, 15 / 22, tasa)`,
    tests: py`
import numpy as np
from scipy import stats

def test_mc():
    "Monte Carlo de E[X²] con X ~ N(0, 1)"
    est, ee = t.get("mc_esperanza", "function")(lambda x: x ** 2, lambda rng, n: rng.normal(0, 1, n), 200000, 3)
    assert abs(est - 1) < 4 * ee and ee < 0.01

def test_logpost():
    "Log-posterior"
    f = t.get("log_posterior", "function")
    assert f(1.2, 3, 5) == -np.inf and f(0, 3, 5) == -np.inf
    assert approx(f(0.3, 3, 5) - f(0.6, 3, 5), stats.beta(4, 3).logpdf(0.3) - stats.beta(4, 3).logpdf(0.6), 1e-9)

def test_metropolis():
    "La cadena reproduce la posterior Beta(15, 7)"
    m = t.get("media_mcmc")
    assert abs(m - 15 / 22) < 0.01
    cadena, tasa = t.get("metropolis", "function")(lambda th: t.get("log_posterior")(th, 14, 20), 0.5, 20000, 0.1, 2)
    assert 0.2 < tasa < 0.9 and abs(np.std(cadena[2000:]) - stats.beta(15, 7).std()) < 0.01
`,
    hints: [
      "Evalúa g sobre todas las muestras a la vez y devuelve la media y la DE/√n.",
      "Log-posterior: (a − 1 + k)·log θ + (b − 1 + n − k)·log(1 − θ).",
      "Acepta si `log(u) < lp_prop - lp_actual` con u uniforme.",
    ],
    errors: [
      { error: "Comparar posteriores sin logaritmos", fix: "Con muchos datos las probabilidades son diminutas y se redondean a 0. Trabaja en escala logarítmica." },
      { error: "No guardar el valor actual cuando se rechaza", fix: "Si se rechaza la propuesta, la cadena repite el valor actual: eso también es una muestra." },
    ],
    quiz: {
      question: "Tu cadena de MCMC acepta el 99 % de las propuestas. ¿Qué indica?",
      options: [
        { text: "Que los pasos son demasiado pequeños: la cadena se mueve despacio y explora mal" },
        { text: "Que la cadena es perfecta" },
        { text: "Que la posterior es uniforme" },
        { text: "Que hay un error en la previa" },
      ],
      answer: 0,
      explanation: "Pasos minúsculos casi siempre se aceptan pero avanzan poco (alta autocorrelación). Pasos enormes se rechazan casi siempre. Se busca un punto intermedio.",
    },
    review: "Repasa la idea de Monte Carlo y los pasos del algoritmo de Metropolis.",
    xp: 120,
    coins: 18,
  },
  {
    id: "c-simpson",
    world: "w4",
    zone: "Diseño experimental y causalidad",
    title: "La paradoja del puente: confusión y paradoja de Simpson",
    kind: "lesson",
    difficulty: 4,
    skills: ["causalidad", "confusion", "estratificacion"],
    requires: ["b-mcmc"],
    story: "Dos curanderos tratan cálculos renales. Uno tiene mejor tasa de éxito en piedras pequeñas y también en grandes… pero peor en el total. ¿Cómo es posible? El puente entre los datos y las conclusiones tiene trampas.",
    objective: "Detectar la paradoja de Simpson, identificar variables de confusión, comparar tasas estratificadas y estandarizar para ajustar.",
    before: ["Probabilidad condicional", "Agrupar en pandas"],
    packages: ["pandas"],
    intuition: [
      "La **paradoja de Simpson** ocurre cuando una tendencia aparece en cada subgrupo pero se invierte al combinarlos. La causa: una **variable de confusión** que se relaciona con el tratamiento y con el resultado.",
      "",
      "En el ejemplo clásico de cálculos renales: el tratamiento A se usaba más en piedras grandes (más difíciles). A gana en cada estrato, pero su total parece peor porque atendió casos más graves.",
      "",
      "- **Confusor**: causa común del tratamiento y del resultado → hay que ajustar por él.",
      "- **Mediador**: está en el camino causal (tratamiento → mediador → resultado) → ajustar por él elimina parte del efecto que quieres medir.",
      "- **Colisionador**: efecto común de ambos → ajustar por él **crea** asociaciones falsas.",
      "",
      "Qué ajustar depende del **diagrama causal**, no solo de los datos. La **estandarización** calcula la tasa que tendría cada tratamiento con una misma distribución de gravedad.",
    ],
    formal: "Tasa estandarizada de A = Σ_estratos w_s · tasa_{A,s}, con w_s = proporción del estrato s en la población de referencia.",
    example: {
      code: py`import pandas as pd
d = pd.DataFrame({"trat": ["A", "A", "B", "B"], "piedra": ["peq", "gran", "peq", "gran"], "exitos": [81, 192, 234, 55], "total": [87, 263, 270, 80]})
d["tasa"] = d["exitos"] / d["total"]
print(d)
print((d.groupby("trat")["exitos"].sum() / d.groupby("trat")["total"].sum()).round(3))`,
      lines: ["pandas.", "Datos clásicos (Charig et al., 1986).", "Tasa de éxito por estrato.", "A gana en piedras pequeñas (0,93 > 0,87) y grandes (0,73 > 0,69)…", "…pero pierde en el total (0,78 < 0,83)."],
    },
    challenge: [
      "Con el DataFrame `d` del ejemplo (en el código inicial):",
      "1. `tasas_estrato`: DataFrame (filas = piedra, columnas = trat) con la tasa de éxito.",
      "2. `tasas_brutas`: diccionario trat → tasa total.",
      "3. `es_simpson`: True si A gana en todos los estratos pero pierde en el total.",
      "4. `estandarizar(d, referencia)`: tasa estandarizada de cada tratamiento usando como pesos la distribución de piedras de la población de referencia (`\"total\"` = todos los pacientes juntos). Devuelve diccionario trat → tasa.",
      "5. `rol_variable(causa_trat, causa_res, efecto_trat, efecto_res)`: devuelve `\"confusor\"`, `\"mediador\"` o `\"colisionador\"` según los booleanos: confusor si causa tratamiento y resultado; mediador si es efecto del tratamiento y causa del resultado; colisionador si es efecto del tratamiento y del resultado.",
    ],
    starter: py`import pandas as pd

d = pd.DataFrame({"trat": ["A", "A", "B", "B"], "piedra": ["peq", "gran", "peq", "gran"], "exitos": [81, 192, 234, 55], "total": [87, 263, 270, 80]})
tasas_estrato = None
tasas_brutas = {}
es_simpson = False

def estandarizar(d, referencia="total"):
    return {}

def rol_variable(causa_trat, causa_res, efecto_trat, efecto_res):
    return "confusor"`,
    solution: py`import pandas as pd

d = pd.DataFrame({"trat": ["A", "A", "B", "B"], "piedra": ["peq", "gran", "peq", "gran"], "exitos": [81, 192, 234, 55], "total": [87, 263, 270, 80]})
d["tasa"] = d["exitos"] / d["total"]
tasas_estrato = d.pivot(index="piedra", columns="trat", values="tasa")
g = d.groupby("trat")[["exitos", "total"]].sum()
tasas_brutas = (g["exitos"] / g["total"]).to_dict()
es_simpson = bool((tasas_estrato["A"] > tasas_estrato["B"]).all() and tasas_brutas["A"] < tasas_brutas["B"])

def estandarizar(d, referencia="total"):
    pesos = d.groupby("piedra")["total"].sum()
    pesos = pesos / pesos.sum()
    tasas = d.assign(tasa=d["exitos"] / d["total"]).pivot(index="piedra", columns="trat", values="tasa")
    return {trat: float((tasas[trat] * pesos).sum()) for trat in tasas.columns}

def rol_variable(causa_trat, causa_res, efecto_trat, efecto_res):
    if efecto_trat and efecto_res:
        return "colisionador"
    if efecto_trat and causa_res:
        return "mediador"
    if causa_trat and causa_res:
        return "confusor"
    raise ValueError("Combinación no contemplada")

print(tasas_estrato.round(3), tasas_brutas, es_simpson, estandarizar(d))`,
    tests: py`
def test_tasas():
    "Tasas por estrato y brutas"
    te = t.get("tasas_estrato")
    assert approx(te.loc["peq", "A"], 81 / 87) and approx(te.loc["gran", "B"], 55 / 80)
    tb = t.get("tasas_brutas")
    assert approx(tb["A"], 273 / 350) and approx(tb["B"], 289 / 350)

def test_simpson():
    "Detecta la paradoja"
    assert t.get("es_simpson") is True

def test_estandarizada():
    "Tras estandarizar, A supera a B"
    e = t.get("estandarizar", "function")(t.get("d"))
    w_peq, w_gran = 357 / 700, 343 / 700
    assert approx(e["A"], w_peq * 81 / 87 + w_gran * 192 / 263) and e["A"] > e["B"]

def test_roles():
    "Confusor, mediador y colisionador"
    f = t.get("rol_variable", "function")
    assert f(True, True, False, False) == "confusor"
    assert f(False, True, True, False) == "mediador"
    assert f(False, False, True, True) == "colisionador"
`,
    hints: [
      "`d.pivot(index=\"piedra\", columns=\"trat\", values=\"tasa\")` da la tabla de tasas.",
      "La tasa bruta suma éxitos y totales por tratamiento antes de dividir.",
      "Pesos de referencia: totales por tipo de piedra (ambos tratamientos) divididos entre el total general.",
    ],
    errors: [
      { error: "Ajustar por todo lo disponible", fix: "Ajustar por un mediador o un colisionador sesga la estimación. Decide con un diagrama causal." },
      { error: "Promediar tasas de estratos sin ponderar", fix: "La estandarización pondera por una distribución de referencia común." },
    ],
    quiz: {
      question: "Un fármaco parece aumentar la mortalidad en el análisis bruto, pero se daba sobre todo a pacientes más graves. ¿Qué haces?",
      options: [
        { text: "Ajustar o estratificar por la gravedad previa (confusor) y, mejor aún, buscar evidencia de ensayos aleatorizados" },
        { text: "Concluir que el fármaco es dañino", misconception: "correlacion-causalidad" },
        { text: "Ajustar por la mortalidad" },
        { text: "Ignorar la gravedad porque no es el tratamiento" },
      ],
      answer: 0,
      explanation: "La gravedad influye en recibir el fármaco y en morir: es un confusor. La aleatorización rompe ese vínculo.",
    },
    review: "Repasa confusor, mediador y colisionador, y cómo la estratificación revela la paradoja de Simpson.",
    xp: 100,
    coins: 15,
  },
  {
    id: "c-experimentos",
    world: "w4",
    zone: "Diseño experimental y causalidad",
    title: "El sorteo del gran experimento: aleatorización, permutaciones y diferencias en diferencias",
    kind: "lesson",
    difficulty: 4,
    skills: ["experimentos", "aleatorizacion", "causalidad"],
    requires: ["c-simpson"],
    story: "El emperador quiere saber si un nuevo método de entrenamiento funciona. El sabio propone sortear a quién se aplica: el azar equilibra lo que conoces… y lo que no.",
    objective: "Entender por qué la aleatorización permite inferencias causales, hacer una prueba de permutación y estimar un efecto con diferencias en diferencias.",
    before: ["Confusión", "Pruebas de hipótesis", "Simulación"],
    packages: ["numpy", "pandas"],
    intuition: [
      "- **Aleatorizar** la asignación hace que, en promedio, los grupos sean comparables en **todas** las variables, medidas o no. Las diferencias en el resultado pueden atribuirse al tratamiento (con incertidumbre).",
      "- **Grupo control**: recibe la alternativa (placebo, tratamiento habitual). El **cegamiento** evita que las expectativas influyan.",
      "- **Bloqueo**: aleatorizar dentro de grupos homogéneos (edad, centro) mejora la precisión. **Diseño factorial**: varios factores a la vez.",
      "- **Prueba de permutación**: si el tratamiento no tuviera efecto, las etiquetas serían intercambiables. Se comparan la diferencia observada con las diferencias al barajar etiquetas.",
      "- Sin aleatorización (**cuasiexperimentos**): **diferencias en diferencias** compara el cambio antes/después de un grupo tratado con el de un grupo control, suponiendo **tendencias paralelas** en ausencia de tratamiento.",
      "",
      "**Validez interna**: ¿el efecto es real en el estudio? **Validez externa**: ¿se generaliza a otras poblaciones?",
    ],
    formal: "DiD = (ȳ_T,después − ȳ_T,antes) − (ȳ_C,después − ȳ_C,antes). Valor p de permutación ≈ (#{|dif_perm| ≥ |dif_obs|} + 1)/(B + 1).",
    example: {
      code: py`import numpy as np
rng = np.random.default_rng(0)
edad = rng.normal(45, 12, 200)
asignacion = rng.permutation(np.repeat([0, 1], 100))
print(round(edad[asignacion == 1].mean(), 1), round(edad[asignacion == 0].mean(), 1))`,
      lines: ["NumPy.", "Semilla.", "Edad de 200 participantes.", "Sorteo: 100 a cada grupo.", "Las edades medias de ambos grupos quedan parecidas sin haberlo forzado."],
    },
    challenge: [
      "1. `aleatorizar(n, semilla)`: array de 0/1 con n/2 de cada (permuta con `default_rng(semilla)`).",
      "2. `balance(covariable, asignacion)`: diferencia de medias estandarizada = (media₁ − media₀)/DE combinada (raíz de la media de las dos varianzas, ddof=1).",
      "3. `permutacion(a, b, B, semilla)`: valor p bilateral de la diferencia de medias con B permutaciones, usando (conteo + 1)/(B + 1).",
      "4. `did(df)`: estimador de diferencias en diferencias a partir de un DataFrame con columnas `grupo` (\"T\"/\"C\"), `periodo` (\"antes\"/\"despues\") y `y`.",
    ],
    starter: py`import numpy as np
import pandas as pd

def aleatorizar(n, semilla):
    return np.array([i % 2 for i in range(n)])

def balance(covariable, asignacion):
    return 0

def permutacion(a, b, B, semilla):
    return 0.05

def did(df):
    return 0`,
    solution: py`import numpy as np
import pandas as pd

def aleatorizar(n, semilla):
    return np.random.default_rng(semilla).permutation(np.repeat([0, 1], n // 2))

def balance(covariable, asignacion):
    x, g = np.asarray(covariable, float), np.asarray(asignacion)
    a, b = x[g == 1], x[g == 0]
    sp = np.sqrt((a.var(ddof=1) + b.var(ddof=1)) / 2)
    return float((a.mean() - b.mean()) / sp)

def permutacion(a, b, B, semilla):
    rng = np.random.default_rng(semilla)
    a, b = np.asarray(a, float), np.asarray(b, float)
    obs = abs(a.mean() - b.mean())
    todos = np.concatenate([a, b])
    cuenta = 0
    for _ in range(B):
        p = rng.permutation(todos)
        if abs(p[:len(a)].mean() - p[len(a):].mean()) >= obs:
            cuenta += 1
    return (cuenta + 1) / (B + 1)

def did(df):
    m = df.groupby(["grupo", "periodo"])["y"].mean()
    return float((m["T", "despues"] - m["T", "antes"]) - (m["C", "despues"] - m["C", "antes"]))`,
    tests: py`
import numpy as np
import pandas as pd
from scipy import stats

def test_aleatorizar():
    "Mitad y mitad, reproducible"
    a = t.get("aleatorizar", "function")(100, 1)
    assert a.sum() == 50 and len(a) == 100 and (a == t.get("aleatorizar")(100, 1)).all()

def test_balance():
    "La aleatorización equilibra covariables"
    rng = np.random.default_rng(7)
    edad = rng.normal(50, 10, 400)
    smd = abs(t.get("balance", "function")(edad, t.get("aleatorizar")(400, 3)))
    sesgado = abs(t.get("balance")(edad, (edad > 50).astype(int)))
    assert smd < 0.3 and sesgado > 1

def test_permutacion():
    "Valor p de permutación similar al de scipy"
    rng = np.random.default_rng(2)
    a, b = rng.normal(1, 1, 30), rng.normal(0.2, 1, 30)
    p = t.get("permutacion", "function")(a, b, 4000, 1)
    ref = stats.permutation_test((a, b), lambda x, y: np.mean(x) - np.mean(y), n_resamples=4000, random_state=1).pvalue
    assert abs(p - ref) < 0.01

def test_did():
    "Diferencias en diferencias"
    df = pd.DataFrame({"grupo": ["T", "T", "C", "C"] * 2, "periodo": ["antes", "despues"] * 4, "y": [10, 18, 9, 12, 12, 20, 11, 14]})
    assert approx(t.get("did", "function")(df), 5.0)
`,
    hints: [
      "`rng.permutation(np.repeat([0, 1], n // 2))` sortea la asignación.",
      "En la permutación, baraja el vector conjunto y separa los primeros len(a) como grupo «a».",
      "Para DiD, agrupa por grupo y periodo y toma las cuatro medias.",
    ],
    errors: [
      { error: "Asignar según el criterio del investigador", fix: "Cualquier regla no aleatoria puede introducir confusión (se asigna a quien parece más prometedor)." },
      { error: "Usar DiD sin comprobar tendencias previas", fix: "Si los grupos ya evolucionaban distinto antes del tratamiento, el supuesto de tendencias paralelas falla." },
    ],
    quiz: {
      question: "¿Qué garantiza la aleatorización en un ensayo?",
      options: [
        { text: "Que, en promedio, los grupos sean comparables en variables medidas y no medidas" },
        { text: "Que los grupos sean idénticos en cada variable" },
        { text: "Que los resultados se generalicen a cualquier población" },
        { text: "Que no haga falta analizar la incertidumbre" },
      ],
      answer: 0,
      explanation: "El azar equilibra en promedio, no exactamente; por eso sigue habiendo incertidumbre. Y la validez externa depende de quién participa.",
    },
    review: "Repasa por qué aleatorizar permite inferencia causal y cuándo usar diferencias en diferencias.",
    xp: 100,
    coins: 15,
  },
  {
    id: "cl-riesgos",
    world: "w4",
    zone: "Estadística clínica",
    title: "El libro de las proporciones clínicas: RR, OR, RAR y NNT",
    kind: "lesson",
    difficulty: 4,
    skills: ["clinica", "riesgo-relativo", "odds-ratio", "nnt"],
    requires: ["c-experimentos"],
    story: "Un ensayo (sintético) compara un tónico con placebo para prevenir la fiebre de las montañas. El titular dice «reduce el riesgo un 50 %». ¿Cuánto beneficio supone para cada paciente?",
    objective: "Calcular riesgo absoluto, riesgo relativo, odds ratio, diferencia de riesgos, reducción relativa y absoluta y NNT/NNH, con intervalos de confianza.",
    before: ["Probabilidad condicional", "Odds", "Intervalos de confianza"],
    packages: ["numpy", "scipy", "statsmodels"],
    intuition: [
      "Tabla 2×2: a = eventos en tratados, b = sin evento en tratados, c = eventos en control, d = sin evento en control.",
      "",
      "- Riesgo en tratados R₁ = a/(a+b); en control R₀ = c/(c+d).",
      "- **Diferencia de riesgos** (RD) = R₁ − R₀; la **reducción absoluta** RAR = R₀ − R₁.",
      "- **Riesgo relativo** RR = R₁/R₀; **reducción relativa** RRR = 1 − RR.",
      "- **Odds ratio** OR = (a·d)/(b·c).",
      "- **NNT** = 1/RAR: pacientes a tratar para evitar un evento. Si el tratamiento aumenta el riesgo, **NNH** = 1/|RD|.",
      "",
      "Un 50 % de reducción relativa puede ser de 2 % a 1 % (NNT 100) o de 40 % a 20 % (NNT 5). **Informa siempre riesgos absolutos.** Ejercicio educativo: no es una recomendación clínica.",
    ],
    formal: "IC 95 % del RR: exp(ln RR ± 1,96·√(1/a − 1/(a+b) + 1/c − 1/(c+d))). OR: exp(ln OR ± 1,96·√(1/a + 1/b + 1/c + 1/d)). RD: RD ± 1,96·√(R₁(1−R₁)/n₁ + R₀(1−R₀)/n₀).",
    example: {
      code: py`a, b, c, d = 15, 85, 30, 70
r1, r0 = a / (a + b), c / (c + d)
print(r1, r0, round(r1 / r0, 2), round(r0 - r1, 2), round(1 / (r0 - r1), 1))`,
      lines: ["Tratados: 15 eventos de 100; control: 30 de 100.", "Riesgos 0,15 y 0,30.", "RR 0,5 (RRR 50 %), RAR 0,15, NNT ≈ 6,7: tratar a ~7 personas evita un evento."],
    },
    challenge: [
      "Escribe `medidas(a, b, c, d)` que devuelva un diccionario con:",
      "`r1`, `r0`, `rd`, `rar`, `rr`, `rrr`, `or`, `nnt` (1/RAR si RAR > 0, si no `None`), `nnh` (1/|RD| si RD > 0, si no `None`), `ic_rr` (tupla), `ic_or` (tupla) e `ic_rd` (tupla), con los métodos de la explicación formal.",
      "Después escribe `resumen_clinico(a, b, c, d)`: frase con el riesgo en cada grupo (porcentaje con un decimal), la RAR en puntos porcentuales, el NNT redondeado hacia arriba y el RR con su IC. Debe incluir la palabra «absoluta».",
    ],
    starter: py`import math

def medidas(a, b, c, d):
    return {"rr": a / c}

def resumen_clinico(a, b, c, d):
    return "Reduce el riesgo un 50 %."`,
    solution: py`import math

Z = 1.959963984540054

def medidas(a, b, c, d):
    n1, n0 = a + b, c + d
    r1, r0 = a / n1, c / n0
    rd, rr, odds = r1 - r0, r1 / r0, (a * d) / (b * c)
    se_lrr = math.sqrt(1 / a - 1 / n1 + 1 / c - 1 / n0)
    se_lor = math.sqrt(1 / a + 1 / b + 1 / c + 1 / d)
    se_rd = math.sqrt(r1 * (1 - r1) / n1 + r0 * (1 - r0) / n0)
    return {
        "r1": r1, "r0": r0, "rd": rd, "rar": -rd, "rr": rr, "rrr": 1 - rr, "or": odds,
        "nnt": 1 / -rd if rd < 0 else None,
        "nnh": 1 / rd if rd > 0 else None,
        "ic_rr": (math.exp(math.log(rr) - Z * se_lrr), math.exp(math.log(rr) + Z * se_lrr)),
        "ic_or": (math.exp(math.log(odds) - Z * se_lor), math.exp(math.log(odds) + Z * se_lor)),
        "ic_rd": (rd - Z * se_rd, rd + Z * se_rd),
    }

def resumen_clinico(a, b, c, d):
    m = medidas(a, b, c, d)
    texto = (f"Riesgo con tratamiento {100 * m['r1']:.1f} % frente a {100 * m['r0']:.1f} % con control: "
             f"reducción absoluta de {100 * m['rar']:.1f} puntos porcentuales")
    if m["nnt"]:
        texto += f" (NNT {math.ceil(m['nnt'])})"
    texto += f"; RR {m['rr']:.2f} (IC 95 %: {m['ic_rr'][0]:.2f} a {m['ic_rr'][1]:.2f})."
    return texto`,
    tests: py`
import numpy as np
import statsmodels.api as sm

def test_medidas():
    "Medidas y sus IC frente a statsmodels"
    m = t.get("medidas", "function")(15, 85, 30, 70)
    tb = sm.stats.Table2x2(np.array([[15, 85], [30, 70]]))
    assert approx(m["rr"], 0.5) and approx(m["rrr"], 0.5) and approx(m["rar"], 0.15) and approx(m["or"], tb.oddsratio)
    assert approx(m["ic_rr"][0], tb.riskratio_confint()[0], 1e-6) and approx(m["ic_or"][1], tb.oddsratio_confint()[1], 1e-6)
    assert approx(m["nnt"], 1 / 0.15) and m["nnh"] is None
    assert approx(m["ic_rd"][0], -0.15 - 1.959963984540054 * math.sqrt(0.15 * 0.85 / 100 + 0.3 * 0.7 / 100), 1e-9)

def test_dano():
    "Si el tratamiento aumenta el riesgo, NNH"
    m = t.get("medidas")(20, 80, 10, 90)
    assert m["nnt"] is None and approx(m["nnh"], 10)

def test_resumen():
    "Resumen con riesgos absolutos"
    s = t.get("resumen_clinico", "function")(15, 85, 30, 70)
    assert "15.0 %" in s and "30.0 %" in s and "absoluta" in s and "NNT 7" in s and "0.50" in s
    s2 = t.get("resumen_clinico")(2, 98, 4, 96)
    assert "2.0 %" in s2 and "NNT 50" in s2
`,
    hints: [
      "RR = R₁/R₀ y OR = (a·d)/(b·c).",
      "IC del RR en escala logarítmica: calcula el error estándar de ln(RR) y exponencia los extremos.",
      "NNT = 1/RAR solo si el tratamiento reduce el riesgo; redondea hacia arriba al comunicarlo.",
    ],
    errors: [
      { error: "Comunicar solo la reducción relativa", fix: "Sin el riesgo basal, «−50 %» no dice cuánto beneficio hay. Añade riesgos absolutos y NNT." },
      { error: "Tratar el OR como un RR con eventos frecuentes", fix: "Con eventos comunes, el OR se aleja del RR (exagera el efecto)." },
    ],
    quiz: {
      question: "Un fármaco reduce los infartos del 2 % al 1 % en 5 años. ¿Qué afirmación es más informativa?",
      options: [
        { text: "Reducción absoluta de 1 punto porcentual: hay que tratar a 100 personas 5 años para evitar un infarto" },
        { text: "Reduce los infartos un 50 %", misconception: "significacion-relevancia" },
        { text: "Evita el 50 % de los infartos de cada paciente" },
        { text: "El 99 % de los tratados no tendrá un infarto gracias al fármaco" },
      ],
      answer: 0,
      explanation: "La RRR (50 %) es cierta pero engañosa sin el contexto absoluto. El NNT ayuda a valorar costes, efectos adversos y preferencias.",
    },
    review: "Repasa RR, OR, RAR y NNT y por qué comunicar riesgos absolutos.",
    xp: 105,
    coins: 15,
  },
  {
    id: "cl-diagnostico",
    world: "w4",
    zone: "Estadística clínica",
    title: "La prueba del oráculo: sensibilidad, especificidad, valores predictivos y ROC",
    kind: "lesson",
    difficulty: 4,
    skills: ["clinica", "diagnostico", "roc"],
    requires: ["cl-riesgos"],
    story: "El oráculo ha creado un marcador numérico para detectar la fiebre de las montañas. ¿A partir de qué valor decimos «positivo»? Cada umbral cambia los aciertos y los errores.",
    objective: "Calcular sensibilidad, especificidad, VPP, VPN y razones de verosimilitud con IC, construir una curva ROC, calcular el AUC y elegir un umbral.",
    before: ["Teorema de Bayes", "Intervalos de Wilson"],
    packages: ["numpy", "scikit-learn", "statsmodels"],
    intuition: [
      "Con un marcador continuo, cada **umbral** define positivos y negativos:",
      "",
      "- **Sensibilidad** = VP/(VP + FN): proporción de enfermos detectados.",
      "- **Especificidad** = VN/(VN + FP): proporción de sanos correctamente negativos.",
      "- **VPP** = VP/(VP + FP) y **VPN** = VN/(VN + FN): dependen de la **prevalencia**.",
      "- **RV+** = sens/(1 − espec), **RV−** = (1 − sens)/espec: no dependen de la prevalencia.",
      "- **Curva ROC**: sensibilidad frente a 1 − especificidad para todos los umbrales. **AUC**: probabilidad de que un enfermo al azar tenga un marcador mayor que un sano al azar.",
      "- **Índice de Youden** J = sens + espec − 1: un criterio para elegir umbral cuando FP y FN cuestan parecido.",
      "",
      "Practica con el Laboratorio estadístico → «Pruebas diagnósticas» y «Curva ROC». Ejercicio educativo con datos sintéticos.",
    ],
    formal: "AUC = U/(n₁·n₀), donde U es el estadístico de Mann-Whitney de los enfermos frente a los sanos (contando empates como 1/2).",
    example: {
      code: py`import numpy as np
from sklearn.metrics import roc_auc_score
y = np.array([0, 0, 1, 1, 0, 1, 1, 0])
marcador = np.array([0.1, 0.4, 0.35, 0.8, 0.2, 0.9, 0.5, 0.5])
print(roc_auc_score(y, marcador))`,
      lines: ["NumPy.", "Métrica AUC de scikit-learn.", "Diagnóstico real (1 = enfermo).", "Valor del marcador.", "AUC = 0,84375."],
    },
    challenge: [
      "1. `tabla_umbral(y, marcador, umbral)`: diccionario `{\"vp\", \"fp\", \"vn\", \"fn\"}` considerando positivo si marcador ≥ umbral.",
      "2. `rendimiento(vp, fp, vn, fn)`: diccionario con `sens`, `espec`, `vpp`, `vpn`, `rv_pos`, `rv_neg`, e `ic_sens` e `ic_espec` (Wilson 95 %).",
      "3. `vpp_con_prevalencia(sens, espec, prev)`: VPP para otra prevalencia.",
      "4. `auc_mann_whitney(y, marcador)`: AUC a mano comparando todos los pares enfermo–sano (empates = 0,5).",
      "5. `mejor_umbral(y, marcador)`: el umbral (entre los valores observados) que maximiza el índice de Youden; en empate, el menor.",
    ],
    starter: py`import numpy as np

def tabla_umbral(y, marcador, umbral):
    return {"vp": 0, "fp": 0, "vn": 0, "fn": 0}

def rendimiento(vp, fp, vn, fn):
    return {}

def vpp_con_prevalencia(sens, espec, prev):
    return sens

def auc_mann_whitney(y, marcador):
    return 0.5

def mejor_umbral(y, marcador):
    return float(np.median(marcador))`,
    solution: py`import numpy as np
from statsmodels.stats.proportion import proportion_confint

def tabla_umbral(y, marcador, umbral):
    y, m = np.asarray(y), np.asarray(marcador)
    pos = m >= umbral
    return {"vp": int((pos & (y == 1)).sum()), "fp": int((pos & (y == 0)).sum()),
            "vn": int((~pos & (y == 0)).sum()), "fn": int((~pos & (y == 1)).sum())}

def rendimiento(vp, fp, vn, fn):
    sens, espec = vp / (vp + fn), vn / (vn + fp)
    return {
        "sens": sens, "espec": espec,
        "vpp": vp / (vp + fp), "vpn": vn / (vn + fn),
        "rv_pos": sens / (1 - espec) if espec < 1 else float("inf"),
        "rv_neg": (1 - sens) / espec,
        "ic_sens": proportion_confint(vp, vp + fn, method="wilson"),
        "ic_espec": proportion_confint(vn, vn + fp, method="wilson"),
    }

def vpp_con_prevalencia(sens, espec, prev):
    return sens * prev / (sens * prev + (1 - espec) * (1 - prev))

def auc_mann_whitney(y, marcador):
    y, m = np.asarray(y), np.asarray(marcador, float)
    e, s = m[y == 1], m[y == 0]
    comp = (e[:, None] > s[None, :]).sum() + 0.5 * (e[:, None] == s[None, :]).sum()
    return float(comp / (len(e) * len(s)))

def mejor_umbral(y, marcador):
    mejor, mejor_j = None, -np.inf
    for u in sorted(set(np.asarray(marcador, float))):
        tb = tabla_umbral(y, marcador, u)
        r = rendimiento(tb["vp"], tb["fp"], tb["vn"], tb["fn"]) if tb["vp"] + tb["fp"] > 0 and tb["vn"] + tb["fn"] > 0 else None
        if r is None:
            continue
        j = r["sens"] + r["espec"] - 1
        if j > mejor_j:
            mejor, mejor_j = u, j
    return float(mejor)`,
    tests: py`
import numpy as np
from sklearn.metrics import roc_auc_score, roc_curve

rng = np.random.default_rng(10)
Y = np.r_[np.zeros(300, int), np.ones(100, int)]
M = np.r_[rng.normal(0, 1, 300), rng.normal(1.5, 1, 100)]

def test_tabla_rendimiento():
    "Tabla y medidas"
    tb = t.get("tabla_umbral", "function")(Y, M, 0.8)
    assert sum(tb.values()) == 400 and tb["vp"] + tb["fn"] == 100
    r = t.get("rendimiento", "function")(90, 495, 9405, 10)
    assert approx(r["sens"], 0.9) and approx(r["espec"], 0.95) and approx(r["vpp"], 90 / 585) and approx(r["rv_pos"], 18)
    assert r["ic_sens"][0] < 0.9 < r["ic_sens"][1]

def test_prevalencia():
    "El VPP cae con la prevalencia"
    f = t.get("vpp_con_prevalencia", "function")
    assert f(0.9, 0.95, 0.01) < 0.2 < 0.6 < f(0.9, 0.95, 0.1)

def test_auc():
    "AUC igual que scikit-learn"
    assert approx(t.get("auc_mann_whitney", "function")([0, 0, 1, 1, 0, 1, 1, 0], [0.1, 0.4, 0.35, 0.8, 0.2, 0.9, 0.5, 0.5]), 0.84375)
    assert approx(t.get("auc_mann_whitney")(Y, M), roc_auc_score(Y, M))

def test_youden():
    "Umbral de Youden"
    fpr, tpr, thr = roc_curve(Y, M)
    j = tpr - fpr
    assert approx(t.get("mejor_umbral", "function")(Y, M), thr[np.argmax(j)])
`,
    hints: [
      "Positivo = `marcador >= umbral`; combina con `y == 1` / `y == 0` para contar VP, FP, VN, FN.",
      "Para el AUC compara cada enfermo con cada sano usando broadcasting: `e[:, None] > s[None, :]`.",
      "Recorre los valores observados como umbrales y quédate con el de mayor sens + espec − 1.",
    ],
    errors: [
      { error: "Usar el VPP de un estudio con otra prevalencia", fix: "El VPP depende de la prevalencia de la población donde se aplica la prueba. Recalcúlalo con Bayes." },
      { error: "Elegir el umbral con los mismos datos con que se informa el rendimiento", fix: "El rendimiento quedará sobreestimado. Valida el umbral en datos independientes." },
    ],
    quiz: {
      question: "Una prueba con 95 % de especificidad se aplica a una población donde la enfermedad es muy rara. ¿Qué ocurre con los positivos?",
      options: [
        { text: "Muchos serán falsos positivos: el VPP será bajo aunque la especificidad sea alta" },
        { text: "El 95 % de los positivos estarán enfermos", misconception: "sens-espec" },
        { text: "La sensibilidad bajará" },
        { text: "Nada cambia: la especificidad garantiza el VPP", misconception: "base-rate" },
      ],
      answer: 0,
      explanation: "Con prevalencia baja, el 5 % de falsos positivos de una gran masa de sanos supera a los verdaderos positivos.",
    },
    review: "Repasa qué medidas dependen de la prevalencia y qué representa el AUC.",
    xp: 110,
    coins: 16,
  },
  {
    id: "cl-supervivencia",
    world: "w4",
    zone: "Estadística clínica",
    title: "El reloj de la vida: análisis de supervivencia, Kaplan-Meier y log-rank",
    kind: "lesson",
    difficulty: 5,
    skills: ["clinica", "supervivencia", "censura"],
    requires: ["cl-diagnostico"],
    story: "No todos los pacientes del estudio llegaron al final: algunos se mudaron, otros seguían bien cuando el estudio terminó. Ignorarlos o contarlos como sanos sesgaría todo. El reloj de la vida sabe tratarlos.",
    objective: "Estimar curvas de supervivencia con Kaplan-Meier teniendo en cuenta la censura, obtener la mediana de supervivencia, comparar grupos con log-rank y estimar un hazard ratio con Cox.",
    before: ["Probabilidad condicional", "Pruebas de hipótesis"],
    packages: ["numpy", "statsmodels"],
    intuition: [
      "En supervivencia el resultado es **tiempo hasta un evento**. Para algunos sujetos solo sabemos que el evento no había ocurrido al final de su seguimiento: están **censurados**.",
      "",
      "- **Kaplan-Meier**: en cada tiempo con eventos, S(t) se multiplica por (1 − eventos/en riesgo). Los censurados cuentan en riesgo hasta que salen.",
      "- **Mediana de supervivencia**: primer tiempo en que S(t) ≤ 0,5 (puede no alcanzarse).",
      "- **Prueba log-rank**: compara curvas de supervivencia de grupos (eventos observados frente a esperados en cada tiempo).",
      "- **Modelo de Cox**: estima el **hazard ratio** (HR): cuánto se multiplica el riesgo instantáneo, ajustando por covariables; supone riesgos proporcionales.",
      "",
      "Supuesto clave: censura **no informativa** (quien abandona no lo hace por estar peor). Visualízalo en el Laboratorio estadístico → «Kaplan-Meier». Datos sintéticos con fines educativos.",
    ],
    formal: "Ŝ(t) = Π_{tᵢ ≤ t} (1 − dᵢ/nᵢ). Varianza de Greenwood: Ŝ(t)² Σ dᵢ/(nᵢ(nᵢ − dᵢ)).",
    example: {
      code: py`from statsmodels.duration.survfunc import SurvfuncRight
tiempos = [3, 5, 5, 8, 10, 12]
evento = [1, 0, 1, 1, 0, 1]
sf = SurvfuncRight(tiempos, evento)
print(sf.surv_times, sf.surv_prob.round(3))`,
      lines: ["Kaplan-Meier de statsmodels.", "Tiempos de seguimiento (meses).", "1 = evento, 0 = censurado.", "Ajusta la curva.", "Tiempos con evento y supervivencia estimada: 0,833; 0,667; 0,444; 0."],
    },
    challenge: [
      "1. `kaplan_meier(tiempos, evento)`: lista de tuplas `(t, en_riesgo, eventos, S)` **solo en los tiempos con algún evento**, calculada a mano.",
      "2. `mediana_supervivencia(tiempos, evento)`: primer tiempo con S ≤ 0,5, o `None`.",
      "3. Con los datos simulados del código inicial (`t_ctrl`, `e_ctrl`, `t_trat`, `e_trat`): `p_logrank` con `survdiff` de statsmodels.",
      "4. `hr_cox`: hazard ratio del tratamiento estimado con `PHReg` de statsmodels (exp del coeficiente).",
    ],
    starter: py`import numpy as np
from statsmodels.duration.survfunc import survdiff
from statsmodels.duration.hazard_regression import PHReg

rng = np.random.default_rng(21)
def simular(tasa, n):
    t = rng.exponential(1 / tasa, n)
    c = rng.uniform(0, 30, n)
    return np.minimum(t, c), (t <= c).astype(int)
t_ctrl, e_ctrl = simular(0.10, 120)
t_trat, e_trat = simular(0.06, 120)

def kaplan_meier(tiempos, evento):
    return []

def mediana_supervivencia(tiempos, evento):
    return None

p_logrank = 1
hr_cox = 1`,
    solution: py`import numpy as np
from statsmodels.duration.survfunc import survdiff
from statsmodels.duration.hazard_regression import PHReg

rng = np.random.default_rng(21)
def simular(tasa, n):
    t = rng.exponential(1 / tasa, n)
    c = rng.uniform(0, 30, n)
    return np.minimum(t, c), (t <= c).astype(int)
t_ctrl, e_ctrl = simular(0.10, 120)
t_trat, e_trat = simular(0.06, 120)

def kaplan_meier(tiempos, evento):
    t, e = np.asarray(tiempos, float), np.asarray(evento)
    s, salida = 1.0, []
    for u in np.unique(t):
        en_riesgo = int((t >= u).sum())
        d = int(((t == u) & (e == 1)).sum())
        if d:
            s *= 1 - d / en_riesgo
            salida.append((float(u), en_riesgo, d, s))
    return salida

def mediana_supervivencia(tiempos, evento):
    for t, _, _, s in kaplan_meier(tiempos, evento):
        if s <= 0.5:
            return t
    return None

tiempos = np.r_[t_ctrl, t_trat]
eventos = np.r_[e_ctrl, e_trat]
grupo = np.r_[np.zeros(len(t_ctrl)), np.ones(len(t_trat))]
p_logrank = float(survdiff(tiempos, eventos, grupo)[1])
cox = PHReg(tiempos, grupo[:, None], status=eventos).fit()
hr_cox = float(np.exp(cox.params[0]))
print(mediana_supervivencia(t_ctrl, e_ctrl), mediana_supervivencia(t_trat, e_trat), p_logrank, hr_cox)`,
    tests: py`
import numpy as np
from statsmodels.duration.survfunc import SurvfuncRight

def test_km():
    "KM a mano igual que statsmodels"
    tt, ee = [3, 5, 5, 8, 10, 12], [1, 0, 1, 1, 0, 1]
    km = t.get("kaplan_meier", "function")(tt, ee)
    sf = SurvfuncRight(tt, ee)
    assert [k[0] for k in km] == list(sf.surv_times) and np.allclose([k[3] for k in km], sf.surv_prob)
    assert km[1][1] == 5 and km[1][2] == 1

def test_km_simulado():
    "Coincide también con datos simulados"
    tc, ec = t.get("t_ctrl"), t.get("e_ctrl")
    km = t.get("kaplan_meier")(tc, ec)
    sf = SurvfuncRight(tc, ec)
    assert np.allclose([k[3] for k in km], sf.surv_prob)

def test_mediana():
    "Mediana de supervivencia"
    f = t.get("mediana_supervivencia", "function")
    assert f([3, 5, 5, 8, 10, 12], [1, 0, 1, 1, 0, 1]) == 8
    assert f([5, 6, 7], [0, 0, 1]) == 7
    assert f([5, 6, 7, 8], [1, 0, 0, 0]) is None

def test_comparacion():
    "Log-rank y Cox"
    assert t.get("p_logrank") < 0.05
    assert 0.4 < t.get("hr_cox") < 0.85
`,
    hints: [
      "En cada tiempo único: en riesgo = cuántos tienen tiempo ≥ u; eventos = cuántos tienen tiempo == u y evento 1.",
      "Solo multiplica S cuando hay eventos.",
      "`survdiff(tiempos, eventos, grupo)` devuelve (χ², p); `PHReg(tiempos, X, status=eventos).fit()`.",
    ],
    errors: [
      { error: "Eliminar a los censurados", fix: "Perderías información de que sobrevivieron al menos hasta su censura y sesgarías la curva hacia abajo." },
      { error: "Calcular la proporción de supervivientes al final como si nadie estuviera censurado", fix: "Los censurados no son supervivientes ni fallecidos: su seguimiento terminó. KM los trata correctamente." },
    ],
    quiz: {
      question: "Un paciente abandona el estudio a los 6 meses sin haber tenido el evento. ¿Cómo lo trata Kaplan-Meier?",
      options: [
        { text: "Cuenta en riesgo hasta los 6 meses y después deja de contar, sin registrarse como evento" },
        { text: "Como un evento a los 6 meses" },
        { text: "Se elimina del análisis" },
        { text: "Como superviviente hasta el final del estudio" },
      ],
      answer: 0,
      explanation: "Es una observación censurada por la derecha: aporta información hasta su salida.",
    },
    review: "Repasa la censura, el cálculo de Kaplan-Meier y qué mide el hazard ratio.",
    xp: 120,
    coins: 18,
  },
  {
    id: "cl-metaanalisis",
    world: "w4",
    zone: "Estadística clínica",
    title: "El concilio de los estudios: metaanálisis, heterogeneidad y forest plot",
    kind: "lesson",
    difficulty: 5,
    skills: ["clinica", "metaanalisis", "heterogeneidad"],
    requires: ["cl-supervivencia"],
    story: "Cinco estudios sobre el mismo tónico dan resultados distintos: unos favorables, otros no. El concilio debe combinarlos con justicia: dar más peso a los más precisos y medir cuánto discrepan.",
    objective: "Combinar estudios con un metaanálisis de efectos fijos y aleatorios (DerSimonian-Laird), cuantificar la heterogeneidad (Q, I², τ²) y dibujar un forest plot.",
    before: ["Odds ratio", "Intervalos de confianza", "Error estándar"],
    packages: ["numpy", "scipy", "statsmodels", "matplotlib"],
    intuition: [
      "- Cada estudio aporta un efecto (p. ej. log OR) y su varianza.",
      "- **Efectos fijos**: supone un único efecto verdadero; pondera por precisión: wᵢ = 1/vᵢ.",
      "- **Heterogeneidad**: Q = Σwᵢ(yᵢ − ȳ)²; **I²** = max(0, (Q − gl)/Q): proporción de la variabilidad debida a diferencias reales entre estudios.",
      "- **Efectos aleatorios**: los efectos verdaderos varían entre estudios con varianza τ²; pesos wᵢ* = 1/(vᵢ + τ²). Da IC más anchos.",
      "- **Forest plot**: cada estudio con su IC y el efecto combinado como rombo.",
      "",
      "Un metaanálisis combina estudios, no corrige sus sesgos: evalúa el **riesgo de sesgo** de cada uno y el **sesgo de publicación**.",
    ],
    formal: "τ²_DL = max(0, (Q − (k − 1)) / (Σwᵢ − Σwᵢ²/Σwᵢ)). Efecto combinado ȳ = Σwᵢyᵢ/Σwᵢ con EE = 1/√Σwᵢ.",
    example: {
      code: py`import numpy as np
efectos = np.array([-0.3, -0.1, -0.5, 0.05])
varianzas = np.array([0.04, 0.02, 0.09, 0.03])
w = 1 / varianzas
print(round((w * efectos).sum() / w.sum(), 4), round(1 / np.sqrt(w.sum()), 4))`,
      lines: ["NumPy.", "log OR de cuatro estudios.", "Sus varianzas.", "Pesos inversos a la varianza.", "Efecto combinado (fijos) −0,1372 y su EE."],
    },
    challenge: [
      "1. `meta(efectos, varianzas)`: diccionario con `fijo`, `ee_fijo`, `q`, `i2`, `tau2`, `aleatorio`, `ee_aleatorio` e `ic_aleatorio` (95 %), calculado a mano (DerSimonian-Laird).",
      "2. `log_or(a, b, c, d)`: (log OR, varianza) de una tabla 2×2.",
      "3. Con la lista `estudios` del código inicial (tablas 2×2), calcula `resultado = meta(...)` sobre los log OR y `or_combinado` = exp del efecto aleatorio.",
      "4. `fig`: forest plot con un punto e IC por estudio y el efecto combinado, eje x en escala logarítmica (`ax.set_xscale(\"log\")`), una línea vertical en OR = 1 y título.",
    ],
    starter: py`import numpy as np
import matplotlib.pyplot as plt

estudios = [
    ("Ana 2019", 12, 88, 20, 80),
    ("Ben 2020", 30, 170, 42, 158),
    ("Cora 2021", 5, 45, 9, 41),
    ("Dax 2022", 40, 260, 44, 256),
    ("Eli 2023", 8, 92, 18, 82),
]

def meta(efectos, varianzas):
    return {}

def log_or(a, b, c, d):
    return (0, 1)

resultado = {}
or_combinado = 1
fig = None`,
    solution: py`import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

estudios = [
    ("Ana 2019", 12, 88, 20, 80),
    ("Ben 2020", 30, 170, 42, 158),
    ("Cora 2021", 5, 45, 9, 41),
    ("Dax 2022", 40, 260, 44, 256),
    ("Eli 2023", 8, 92, 18, 82),
]

def meta(efectos, varianzas):
    y, v = np.asarray(efectos, float), np.asarray(varianzas, float)
    w = 1 / v
    fijo = (w * y).sum() / w.sum()
    q = (w * (y - fijo) ** 2).sum()
    gl = len(y) - 1
    i2 = max(0.0, (q - gl) / q) if q > 0 else 0.0
    tau2 = max(0.0, (q - gl) / (w.sum() - (w ** 2).sum() / w.sum()))
    w2 = 1 / (v + tau2)
    alea = (w2 * y).sum() / w2.sum()
    ee2 = 1 / np.sqrt(w2.sum())
    z = stats.norm.ppf(0.975)
    return {"fijo": float(fijo), "ee_fijo": float(1 / np.sqrt(w.sum())), "q": float(q), "i2": float(i2), "tau2": float(tau2),
            "aleatorio": float(alea), "ee_aleatorio": float(ee2), "ic_aleatorio": (float(alea - z * ee2), float(alea + z * ee2))}

def log_or(a, b, c, d):
    return (float(np.log(a * d / (b * c))), 1 / a + 1 / b + 1 / c + 1 / d)

ys, vs = zip(*(log_or(a, b, c, d) for _, a, b, c, d in estudios))
resultado = meta(ys, vs)
or_combinado = float(np.exp(resultado["aleatorio"]))

fig, ax = plt.subplots(figsize=(7, 4))
for i, ((nombre, *_), y, v) in enumerate(zip(estudios, ys, vs)):
    lo, hi = np.exp(y - 1.96 * np.sqrt(v)), np.exp(y + 1.96 * np.sqrt(v))
    ax.plot([lo, hi], [i, i], color="#3987e5")
    ax.plot(np.exp(y), i, "s", color="#3987e5")
lo, hi = np.exp(resultado["ic_aleatorio"])
ax.plot([lo, hi], [len(estudios)] * 2, color="#d95926", lw=3)
ax.plot(or_combinado, len(estudios), "D", color="#d95926")
ax.axvline(1, color="gray", lw=1)
ax.set_xscale("log")
ax.set_yticks(range(len(estudios) + 1), [e[0] for e in estudios] + ["Combinado (aleatorios)"])
ax.set(title="Forest plot: odds ratio por estudio", xlabel="Odds ratio (escala log)")
ax.invert_yaxis()
print(resultado, or_combinado)`,
    tests: py`
import numpy as np
from statsmodels.stats.meta_analysis import combine_effects

def test_meta():
    "Efectos fijos, aleatorios y heterogeneidad como statsmodels"
    y, v = np.array([-0.3, -0.1, -0.5, 0.05]), np.array([0.04, 0.02, 0.09, 0.03])
    r = t.get("meta", "function")(y, v)
    ref = combine_effects(y, v, method_re="dl")
    assert approx(r["fijo"], ref.mean_effect_fe, 1e-9) and approx(r["aleatorio"], ref.mean_effect_re, 1e-9)
    assert approx(r["q"], ref.q, 1e-9) and approx(r["i2"], ref.i2, 1e-9) and approx(r["tau2"], ref.tau2, 1e-9)

def test_log_or():
    "log OR y su varianza"
    lo, v = t.get("log_or", "function")(12, 88, 20, 80)
    assert approx(lo, np.log(12 * 80 / (88 * 20))) and approx(v, 1 / 12 + 1 / 88 + 1 / 20 + 1 / 80)

def test_aplicado():
    "Combinación de los cinco estudios"
    assert 0.5 < t.get("or_combinado") < 1
    lo, hi = t.get("resultado")["ic_aleatorio"]
    assert lo < hi

def test_forest():
    "Forest plot en escala log con referencia en 1"
    ax = t.get("fig").axes[0]
    assert ax.get_xscale() == "log" and ax.get_title()
    assert len(ax.get_yticklabels()) == 6
`,
    hints: [
      "Pesos de efectos fijos: 1/varianza. Q mide la dispersión ponderada respecto al efecto fijo.",
      "τ² de DerSimonian-Laird: (Q − gl) / (Σw − Σw²/Σw), truncado en 0.",
      "En el forest plot, dibuja cada IC con `ax.plot([lo, hi], [i, i])` y usa `ax.set_xscale(\"log\")`.",
    ],
    errors: [
      { error: "Promediar los OR directamente", fix: "Combina en escala log y ponderando por precisión; después exponencia." },
      { error: "Combinar estudios muy heterogéneos sin explorar por qué", fix: "Un I² alto pide investigar fuentes de heterogeneidad (población, dosis, calidad) antes de confiar en un único número." },
    ],
    quiz: {
      question: "Un metaanálisis tiene I² = 85 %. ¿Qué indica?",
      options: [
        { text: "Que la mayor parte de la variabilidad entre estudios refleja diferencias reales en los efectos, no solo azar" },
        { text: "Que el efecto combinado es del 85 %" },
        { text: "Que el 85 % de los estudios son significativos" },
        { text: "Que el metaanálisis es muy fiable" },
      ],
      answer: 0,
      explanation: "Una heterogeneidad alta cuestiona que exista un único efecto común; conviene un modelo de efectos aleatorios y explorar sus causas.",
    },
    review: "Repasa la ponderación por precisión, Q, I² y τ².",
    xp: 120,
    coins: 18,
  },
  {
    id: "proj-estudio-estadistico",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "Proyecto: estudio estadístico de un ensayo clínico sintético",
    kind: "project",
    difficulty: 5,
    skills: ["inferencia", "regresion-logistica", "clinica", "comunicacion", "supuestos"],
    requires: ["cl-metaanalisis"],
    story: [
      "El consejo médico del imperio te entrega los datos de un ensayo sintético con 160 pacientes: presión arterial antes y después, y aparición de un evento. Quiere un informe estadístico completo, reproducible y honesto.",
      "Es el gran examen del Imperio: pregunta, datos, métodos justificados, estimaciones con incertidumbre, supuestos y limitaciones.",
    ],
    objective: "Realizar un estudio estadístico de principio a fin y generar un informe reproducible con conclusiones fundamentadas. Datos sintéticos: no es una recomendación clínica.",
    before: ["Pruebas para dos grupos", "Riesgos clínicos", "Regresión logística", "Supuestos"],
    packages: ["pandas", "numpy", "scipy", "statsmodels"],
    files: { "pacientes.csv": pacientesCsv() },
    intuition: [
      "Un estudio estadístico serio sigue este orden:",
      "",
      "1. **Pregunta** investigable y **población**, **muestra** y **variables** (tipo y papel).",
      "2. **Calidad** de los datos (faltantes, valores imposibles).",
      "3. **Descriptiva** por grupo.",
      "4. **Supuestos** y **elección** justificada del método.",
      "5. **Estimaciones** con IC; **pruebas** cuando correspondan; **tamaños del efecto**.",
      "6. **Modelo** ajustado si aporta (con sus supuestos).",
      "7. **Limitaciones** y **conclusiones** que no excedan la evidencia.",
      "",
      "Todo debe salir del código: así el informe es reproducible.",
    ],
    example: {
      code: py`import pandas as pd
df = pd.read_csv("pacientes.csv")
print(df.groupby("grupo")[["edad", "pas_inicial"]].mean().round(1))`,
      lines: ["pandas.", "Datos del ensayo sintético.", "Comparación basal de edad y presión: con aleatorización deberían ser parecidas."],
    },
    challenge: [
      "Define estas variables (las pruebas evalúan cada etapa):",
      "1. **Planteamiento** → `pregunta` (texto que mencione «presión» y «tratamiento»), `variables`: diccionario con al menos `\"cambio\"`, `\"grupo\"`, `\"evento\"`, `\"edad\"` → su tipo (`\"continua\"`, `\"nominal\"`, `\"binaria\"`, `\"discreta\"`).",
      "2. **Calidad y descriptiva** → `faltantes` (diccionario columna → nº de faltantes > 0); `df` sin faltantes en `pas_final` y con columna `cambio`; `descriptiva`: DataFrame indexado por grupo con columnas `n`, `media_cambio`, `de_cambio`.",
      "3. **Supuestos** → `ratio_varianzas` (mayor/menor varianza del cambio entre grupos) y `metodo` = `\"t-welch\"` o `\"mann-whitney\"` según tu justificación (con n ≈ 80 por grupo y sin atípicos extremos, Welch es razonable).",
      "4. **Inferencia** → `diferencia` (media trat − control del cambio), `ic_diferencia` (tupla), `p_valor`, `d_cohen`; `rr_evento` y `ic_rr_evento` (tratamiento frente a control).",
      "5. **Modelo** → `or_ajustado`: OR del tratamiento para el evento en una regresión logística ajustada por edad y fumador (`evento ~ C(grupo, Treatment('control')) + edad + fumador`), y su `ic_or_ajustado`.",
      "6. **Informe** → `limitaciones` (lista de ≥ 3 frases) y `conclusiones` (texto con la diferencia, su IC, el valor p, el RR y la palabra «sintético»; sin «demuestra» ni «probabilidad de que H0»).",
    ],
    starter: py`import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.formula.api as smf

df = pd.read_csv("pacientes.csv")

# 1. Planteamiento
pregunta = ""
variables = {}

# 2. Calidad y descriptiva
faltantes = {}
descriptiva = None

# 3. Supuestos
ratio_varianzas = 1
metodo = ""

# 4. Inferencia
diferencia = 0
ic_diferencia = (0, 0)
p_valor = 1
d_cohen = 0
rr_evento = 1
ic_rr_evento = (0, 0)

# 5. Modelo
or_ajustado = 1
ic_or_ajustado = (0, 0)

# 6. Informe
limitaciones = []
conclusiones = ""`,
    solution: py`import math
import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.formula.api as smf

df = pd.read_csv("pacientes.csv")

# 1. Planteamiento
pregunta = ("En adultos del ensayo sintético, ¿el tratamiento reduce la presión arterial sistólica "
            "más que el control y disminuye el riesgo del evento?")
variables = {"cambio": "continua", "grupo": "nominal", "evento": "binaria", "edad": "discreta", "fumador": "binaria"}

# 2. Calidad y descriptiva
na = df.isna().sum()
faltantes = {c: int(n) for c, n in na.items() if n > 0}
df = df.dropna(subset=["pas_final"]).copy()
df["cambio"] = df["pas_final"] - df["pas_inicial"]
descriptiva = df.groupby("grupo")["cambio"].agg(n="count", media_cambio="mean", de_cambio="std")

# 3. Supuestos
v = df.groupby("grupo")["cambio"].var()
ratio_varianzas = float(v.max() / v.min())
metodo = "t-welch"

# 4. Inferencia
trat = df.loc[df["grupo"] == "tratamiento", "cambio"]
ctrl = df.loc[df["grupo"] == "control", "cambio"]
w = stats.ttest_ind(trat, ctrl, equal_var=False)
diferencia = float(trat.mean() - ctrl.mean())
ci = w.confidence_interval()
ic_diferencia = (float(ci.low), float(ci.high))
p_valor = float(w.pvalue)
sp = math.sqrt(((len(trat) - 1) * trat.var() + (len(ctrl) - 1) * ctrl.var()) / (len(trat) + len(ctrl) - 2))
d_cohen = diferencia / sp
datos = pd.read_csv("pacientes.csv")
a = int(((datos["grupo"] == "tratamiento") & (datos["evento"] == 1)).sum())
n1 = int((datos["grupo"] == "tratamiento").sum())
c = int(((datos["grupo"] == "control") & (datos["evento"] == 1)).sum())
n0 = int((datos["grupo"] == "control").sum())
rr_evento = (a / n1) / (c / n0)
se = math.sqrt(1 / a - 1 / n1 + 1 / c - 1 / n0)
ic_rr_evento = (math.exp(math.log(rr_evento) - 1.96 * se), math.exp(math.log(rr_evento) + 1.96 * se))

# 5. Modelo
logit = smf.logit("evento ~ C(grupo, Treatment('control')) + edad + fumador", data=datos).fit(disp=0)
nombre = [p for p in logit.params.index if "tratamiento" in p][0]
or_ajustado = float(np.exp(logit.params[nombre]))
ic_or_ajustado = tuple(float(x) for x in np.exp(logit.conf_int().loc[nombre]))

# 6. Informe
limitaciones = [
    "Los datos son sintéticos y no permiten conclusiones clínicas reales.",
    "La asignación fue alternada, no aleatorizada con ocultamiento, lo que podría introducir sesgo de selección.",
    f"Se excluyeron {faltantes.get('pas_final', 0)} pacientes sin presión final (análisis de casos completos).",
    "El evento es poco frecuente, por lo que las estimaciones de riesgo tienen intervalos amplios.",
]
conclusiones = (
    f"En este ensayo sintético, la diferencia del cambio medio de presión (tratamiento − control) fue {diferencia:.1f} mmHg "
    f"(IC 95 %: {ic_diferencia[0]:.1f} a {ic_diferencia[1]:.1f}; p = {p_valor:.3g}; d = {d_cohen:.2f}). "
    f"El riesgo del evento fue RR = {rr_evento:.2f} (IC 95 %: {ic_rr_evento[0]:.2f} a {ic_rr_evento[1]:.2f}); "
    f"el OR ajustado por edad y tabaquismo fue {or_ajustado:.2f}. Los resultados son compatibles con un beneficio, "
    "con la incertidumbre que indican los intervalos."
)
print(descriptiva.round(2))
print(conclusiones)`,
    tests: py`
import math
import numpy as np
import pandas as pd
from scipy import stats
RAW = pd.read_csv("pacientes.csv")
D = RAW.dropna(subset=["pas_final"]).assign(cambio=lambda x: x["pas_final"] - x["pas_inicial"])
T, C = D.loc[D.grupo == "tratamiento", "cambio"], D.loc[D.grupo == "control", "cambio"]

def test_etapa1_planteamiento():
    "Etapa 1: pregunta y variables"
    p = t.get("pregunta").lower()
    assert "presión" in p and "tratamiento" in p and p.strip().endswith("?")
    v = t.get("variables")
    assert v["cambio"] == "continua" and v["grupo"] == "nominal" and v["evento"] == "binaria" and v["edad"] in ("discreta", "continua")

def test_etapa2_calidad():
    "Etapa 2: faltantes y descriptiva"
    assert t.get("faltantes") == {"pas_final": int(RAW["pas_final"].isna().sum())}
    d = t.get("descriptiva")
    assert list(d.columns) == ["n", "media_cambio", "de_cambio"]
    assert approx(d.loc["tratamiento", "media_cambio"], T.mean()) and d.loc["control", "n"] == len(C)

def test_etapa3_supuestos():
    "Etapa 3: supuestos y método"
    v = D.groupby("grupo")["cambio"].var()
    assert approx(t.get("ratio_varianzas"), v.max() / v.min()) and t.get("metodo") in ("t-welch", "mann-whitney")

def test_etapa4_inferencia():
    "Etapa 4: diferencia, IC, p, d, RR"
    w = stats.ttest_ind(T, C, equal_var=False)
    assert approx(t.get("diferencia"), T.mean() - C.mean()) and approx(t.get("p_valor"), w.pvalue, 1e-6)
    assert approx(t.get("ic_diferencia")[0], w.confidence_interval().low, 1e-6)
    assert t.get("d_cohen") < -0.5
    a = ((RAW.grupo == "tratamiento") & (RAW.evento == 1)).sum(); c = ((RAW.grupo == "control") & (RAW.evento == 1)).sum()
    assert approx(t.get("rr_evento"), (a / 80) / (c / 80)) and t.get("ic_rr_evento")[0] < t.get("rr_evento") < t.get("ic_rr_evento")[1]

def test_etapa5_modelo():
    "Etapa 5: OR ajustado"
    o, (lo, hi) = t.get("or_ajustado"), t.get("ic_or_ajustado")
    assert 0 < lo < o < hi and o < 1

def test_etapa6_informe():
    "Etapa 6: limitaciones y conclusiones fundamentadas"
    lim = t.get("limitaciones")
    assert len(lim) >= 3 and all(len(x) > 30 for x in lim)
    c = t.get("conclusiones").lower()
    assert "sintético" in c and "ic 95" in c and "rr" in c
    assert "demuestra" not in c and "probabilidad de que h0" not in c
    assert f"{t.get('diferencia'):.1f}".replace("-", "") in c
`,
    hints: [
      "Reutiliza tus funciones de las misiones de dos grupos, riesgos y regresión logística.",
      "El RR del evento se calcula con todos los pacientes (el evento no tiene faltantes).",
      "En la fórmula de statsmodels, `C(grupo, Treatment('control'))` fija control como referencia.",
    ],
    errors: [
      { error: "Elegir el método después de ver qué valor p sale mejor", fix: "Justifica el método por diseño y supuestos antes de mirar resultados." },
      { error: "Conclusiones que extrapolan a pacientes reales", fix: "Los datos son sintéticos: las conclusiones se limitan a este ejercicio." },
    ],
    quiz: {
      question: "El análisis da p < 0,001 y d = −0,9 en datos sintéticos con asignación alternada. ¿Qué limitación es más relevante para la causalidad?",
      options: [
        { text: "La asignación alternada no oculta la secuencia y podría permitir sesgo de selección" },
        { text: "El valor p es demasiado pequeño" },
        { text: "La d de Cohen es negativa" },
        { text: "No hay ninguna: p < 0,001 demuestra el efecto", misconception: "p-valor" },
      ],
      answer: 0,
      explanation: "La validez causal depende del diseño. Un valor p pequeño no compensa un posible sesgo de selección.",
    },
    review: "Repasa la secuencia completa: pregunta, datos, supuestos, estimaciones con incertidumbre, limitaciones y conclusiones.",
    project: {
      requirements: ["Pregunta investigable y variables definidas", "Análisis reproducible en código", "Estimaciones con IC, valor p y tamaño del efecto", "Modelo ajustado con interpretación", "Limitaciones explícitas"],
      dataset: "pacientes.csv: 160 pacientes sintéticos (Python Quest), asignación alternada a control o tratamiento.",
      stages: ["Planteamiento", "Calidad y descriptiva", "Supuestos y elección del método", "Inferencia", "Modelo ajustado", "Informe y limitaciones"],
      criteria: ["Las seis etapas pasan sus pruebas", "Las cifras del informe proceden del código", "Las conclusiones no exceden la evidencia ni confunden valor p con probabilidad de H0"],
      extensions: ["Análisis de sensibilidad imputando los faltantes", "Interacción tratamiento × edad", "Curvas de supervivencia si se añade tiempo al evento", "Potencia para detectar un RR de 0,7"],
      portfolio: "Informe estadístico reproducible de un ensayo sintético: descriptiva, t de Welch con IC y d de Cohen, riesgo relativo, regresión logística ajustada y limitaciones.",
    },
    xp: 400,
    coins: 80,
  },
];
