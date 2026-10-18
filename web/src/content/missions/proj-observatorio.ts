import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 4: el observatorio de la incertidumbre. Intervalos de confianza
// cuya cobertura real se calcula de forma exacta o se simula, bootstrap con datos asimétricos,
// inferencia bayesiana beta-binomial y un test A/B bayesiano frente al frecuentista, incluido el
// coste de mirar los resultados antes de tiempo. Todo se verifica contra SciPy o fórmulas cerradas.

const SERIES = { id: "observatorio-incertidumbre", title: "Proyecto progresivo: el observatorio de la incertidumbre", of: 4 };

const SPEC: ProjectSpec = {
  requirements: [
    "Implementar los intervalos de Wald, Wilson y exacto (Clopper-Pearson) para una proporción y verificarlos contra SciPy.",
    "Medir la cobertura real de cada intervalo: exacta (sumando la binomial) y por simulación, y comprobar que ambas concuerdan.",
    "Comparar el intervalo t y el bootstrap de percentiles con datos asimétricos.",
    "Calcular posteriores beta-binomiales, intervalos creíbles y la sensibilidad a la priori.",
    "Resolver un test A/B de forma bayesiana (integración y muestreo) y frecuentista, y cuantificar el efecto de mirar los datos repetidamente.",
  ],
  dataset: "Sin archivo de datos: los datos se simulan con numpy.random.default_rng y semilla; el experimento A/B usa recuentos dados (120/1000 frente a 145/1000).",
  stages: ["Intervalos para una proporción y su cobertura real", "La media con datos asimétricos: t frente a bootstrap", "Inferencia bayesiana beta-binomial", "Test A/B bayesiano y el coste de mirar"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Cada intervalo coincide con SciPy (o con una fórmula cerrada) hasta 10⁻¹⁰.",
    "La cobertura simulada es compatible con la exacta según su error estándar Monte Carlo.",
    "P(B > A) por integración coincide con la fórmula cerrada y con el muestreo.",
    "El informe distingue la probabilidad posterior del valor p y no presenta como significativo lo que solo lo es mirando muchas veces.",
  ],
  extensions: [
    "Dibujar con matplotlib la cobertura exacta de Wald y Wilson para p de 0,01 a 0,99 (la curva en dientes de sierra).",
    "Añadir el bootstrap BCa con scipy.stats.bootstrap y medir su cobertura.",
    "Calcular el tamaño muestral necesario para que el test A/B tenga una potencia del 80 %.",
  ],
  portfolio: "Estudio de la incertidumbre estadística: cobertura exacta y simulada de intervalos para proporciones (Wald, Wilson, Clopper-Pearson, Jeffreys), intervalo t frente a bootstrap con datos asimétricos, inferencia beta-binomial con análisis de sensibilidad y test A/B bayesiano frente al frecuentista, incluido el efecto de mirar los resultados antes de tiempo.",
};

const S1 = py`import numpy as np
from scipy import stats


def ic_wald(x, n, conf=0.95):
    z = stats.norm.ppf(1 - (1 - conf) / 2)
    p = x / n
    m = z * np.sqrt(p * (1 - p) / n)
    return float(max(0.0, p - m)), float(min(1.0, p + m))


def ic_wilson(x, n, conf=0.95):
    z = stats.norm.ppf(1 - (1 - conf) / 2)
    p = x / n
    centro = (p + z**2 / (2 * n)) / (1 + z**2 / n)
    m = z * np.sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / (1 + z**2 / n)
    return float(centro - m), float(centro + m)


def ic_exacto(x, n, conf=0.95):
    a = 1 - conf
    bajo = 0.0 if x == 0 else stats.beta.ppf(a / 2, x, n - x + 1)
    alto = 1.0 if x == n else stats.beta.ppf(1 - a / 2, x + 1, n - x)
    return float(bajo), float(alto)


def cobertura_exacta(metodo, p, n, conf=0.95):
    xs = np.arange(n + 1)
    dentro = np.array([lo <= p <= hi for lo, hi in (metodo(x, n, conf) for x in xs)])
    return float(stats.binom.pmf(xs, n, p)[dentro].sum())


def cobertura_simulada(metodo, p, n, reps=4000, semilla=0, conf=0.95):
    rng = np.random.default_rng(semilla)
    xs = rng.binomial(n, p, size=reps)
    limites = {x: metodo(x, n, conf) for x in np.unique(xs)}
    return float(np.mean([limites[x][0] <= p <= limites[x][1] for x in xs]))


METODOS = {"wald": ic_wald, "wilson": ic_wilson, "exacto": ic_exacto}
tabla_cobertura = {
    nombre: {p: cobertura_exacta(metodo, p, 20) for p in (0.05, 0.1, 0.3, 0.5)}
    for nombre, metodo in METODOS.items()
}
simulada = cobertura_simulada(ic_wald, 0.1, 20, semilla=1)`;

const S2 = py`def ic_t(x, conf=0.95):
    x = np.asarray(x, dtype=float)
    n = len(x)
    ee = x.std(ddof=1) / np.sqrt(n)
    t = stats.t.ppf(1 - (1 - conf) / 2, n - 1)
    return float(x.mean() - t * ee), float(x.mean() + t * ee)


def ic_bootstrap(x, B=2000, conf=0.95, semilla=0):
    x = np.asarray(x, dtype=float)
    rng = np.random.default_rng(semilla)
    medias = x[rng.integers(0, len(x), size=(B, len(x)))].mean(axis=1)
    a = (1 - conf) / 2
    return float(np.quantile(medias, a)), float(np.quantile(medias, 1 - a))


def cobertura_media(n, reps=800, B=400, semilla=0, conf=0.95):
    """Cobertura de los IC t y bootstrap para la media de una exponencial (media real 1)."""
    rng = np.random.default_rng(semilla)
    muestras = rng.exponential(1.0, size=(reps, n))
    medias = muestras.mean(axis=1)
    ee = muestras.std(axis=1, ddof=1) / np.sqrt(n)
    t = stats.t.ppf(1 - (1 - conf) / 2, n - 1)
    cubre_t = np.abs(medias - 1.0) <= t * ee
    idx = rng.integers(0, n, size=(reps, B, n))
    remuestras = np.take_along_axis(muestras[:, None, :], idx, axis=2).mean(axis=2)
    a = (1 - conf) / 2
    bajo, alto = np.quantile(remuestras, [a, 1 - a], axis=1)
    cubre_boot = (bajo <= 1.0) & (1.0 <= alto)
    return {"t": float(cubre_t.mean()), "bootstrap": float(cubre_boot.mean()),
            "t_por_encima": float((medias - t * ee > 1.0).mean()),
            "t_por_debajo": float((medias + t * ee < 1.0).mean())}


estudio_media = {n: cobertura_media(n, semilla=n) for n in (10, 40)}`;

const S3 = py`PRIORES = {"uniforme": (1.0, 1.0), "jeffreys": (0.5, 0.5), "escéptica": (2.0, 18.0)}


def posterior(x, n, a=1.0, b=1.0):
    return a + x, b + n - x


def resumen_posterior(x, n, a=1.0, b=1.0, conf=0.95, umbral=0.5):
    pa, pb = posterior(x, n, a, b)
    dist = stats.beta(pa, pb)
    cola = (1 - conf) / 2
    return {
        "a": pa,
        "b": pb,
        "media": pa / (pa + pb),
        "intervalo": (float(dist.ppf(cola)), float(dist.ppf(1 - cola))),
        "prob_mayor_umbral": float(dist.sf(umbral)),
    }


def ic_jeffreys(x, n, conf=0.95):
    return resumen_posterior(x, n, 0.5, 0.5, conf)["intervalo"]


def media_por_muestreo(x, n, a=1.0, b=1.0, m=20000, semilla=0):
    pa, pb = posterior(x, n, a, b)
    muestras = np.random.default_rng(semilla).beta(pa, pb, size=m)
    return float(muestras.mean()), float(muestras.std(ddof=1) / np.sqrt(m))


sensibilidad = {nombre: resumen_posterior(3, 10, a, b, umbral=0.2) for nombre, (a, b) in PRIORES.items()}
cobertura_jeffreys = {p: cobertura_exacta(ic_jeffreys, p, 20) for p in (0.05, 0.1, 0.3, 0.5)}`;

const S4 = py`from scipy import integrate


def prob_b_mejor(xa, na, xb, nb, a=1.0, b=1.0):
    """P(p_B > p_A | datos) integrando: ∫ f_B(p) · F_A(p) dp."""
    A = stats.beta(*posterior(xa, na, a, b))
    B = stats.beta(*posterior(xb, nb, a, b))
    valor, _ = integrate.quad(lambda p: B.pdf(p) * A.cdf(p), 0, 1, limit=200)
    return float(valor)


def ab_por_muestreo(xa, na, xb, nb, m=200000, semilla=0, a=1.0, b=1.0):
    rng = np.random.default_rng(semilla)
    pa = rng.beta(*posterior(xa, na, a, b), size=m)
    pb = rng.beta(*posterior(xb, nb, a, b), size=m)
    return {
        "prob_b_mejor": float(np.mean(pb > pa)),
        "perdida_esperada_b": float(np.mean(np.maximum(pa - pb, 0))),
        "mejora_relativa": (float(np.quantile(pb / pa - 1, 0.025)), float(np.quantile(pb / pa - 1, 0.975))),
    }


def prueba_z(xa, na, xb, nb):
    p = (xa + xb) / (na + nb)
    ee = np.sqrt(p * (1 - p) * (1 / na + 1 / nb))
    z = (xb / nb - xa / na) / ee
    return float(z), float(2 * stats.norm.sf(abs(z)))


def falsos_positivos_mirando(reps=2000, n_max=1000, cada=100, p=0.1, semilla=0):
    """Pruebas A/A: proporción de experimentos declarados «significativos» (p < 0.05)."""
    rng = np.random.default_rng(semilla)
    a = rng.random((reps, n_max)) < p
    b = rng.random((reps, n_max)) < p
    cortes = np.arange(cada, n_max + 1, cada)
    xa, xb = a.cumsum(axis=1)[:, cortes - 1], b.cumsum(axis=1)[:, cortes - 1]
    pooled = (xa + xb) / (2 * cortes)
    ee = np.sqrt(pooled * (1 - pooled) * 2 / cortes)
    with np.errstate(divide="ignore", invalid="ignore"):
        z = np.where(ee > 0, (xb - xa) / cortes / ee, 0.0)
    significativo = 2 * stats.norm.sf(np.abs(z)) < 0.05
    return {"al_final": float(significativo[:, -1].mean()), "mirando": float(significativo.any(axis=1).mean())}


experimento = {"xa": 120, "na": 1000, "xb": 145, "nb": 1000}
decision = {
    "prob_b_mejor": prob_b_mejor(**experimento),
    "muestreo": ab_por_muestreo(**experimento),
    "prueba_z": prueba_z(**experimento),
    "mirar": falsos_positivos_mirando(),
}`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

const PAQUETES = ["numpy", "scipy"];

export const PROJ_OBSERVATORIO: Mission[] = [
  {
    id: "po-obs-1",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El observatorio de la incertidumbre · 1: intervalos para una proporción y su cobertura real",
    kind: "project",
    difficulty: 3,
    skills: ["intervalos-confianza", "simulacion", "distribuciones"],
    requires: ["i-intervalos"],
    series: { ...SERIES, stage: 1 },
    packages: PAQUETES,
    story: "El observatorio del Imperio publica cada semana la proporción de noches despejadas con «un intervalo de confianza del 95 %». Un astrónomo desconfía: con 20 noches y pocas despejadas, ¿de verdad acierta el 95 % de las veces? Vas a comprobarlo sin fe: calculando la cobertura.",
    objective: "Programar tres intervalos para una proporción, verificarlos contra SciPy y calcular su cobertura real de forma exacta (sumando la binomial) y por simulación.",
    before: ["Intervalos de confianza", "Distribución binomial", "Simulación con semilla"],
    intuition: [
      "Un IC al 95 % es una **promesa sobre el método**: si repitieras el estudio muchas veces, el 95 % de los intervalos contendrían el valor real. Esa promesa se puede **comprobar**.",
      "",
      "Con una proporción, el número de éxitos x solo puede valer 0, 1, …, n. Para un p real dado, la cobertura es la suma de P(X = x) sobre los x cuyo intervalo contiene p: un cálculo **exacto**, sin simulación.",
      "",
      "- **Wald** (p̂ ± z·√(p̂(1 − p̂)/n)) es el de los libros, pero con n pequeño o p cerca de 0 se queda muy corto: con x = 0 ¡el intervalo es [0, 0]!",
      "- **Wilson** invierte la prueba z y se comporta mucho mejor.",
      "- **Exacto** (Clopper-Pearson) usa cuantiles de la distribución beta y garantiza una cobertura de **al menos** el 95 %, a costa de ser más ancho.",
    ],
    formal: "Wald: p̂ ± z√(p̂(1 − p̂)/n) · Wilson: [p̂ + z²/2n ± z√(p̂(1 − p̂)/n + z²/4n²)] / (1 + z²/n) · Exacto: [Beta⁻¹(α/2; x, n − x + 1), Beta⁻¹(1 − α/2; x + 1, n − x)] · Cobertura(p) = Σₓ P(X = x | n, p)·1{p ∈ IC(x)}",
    example: {
      code: py`from scipy import stats
n, p = 20, 0.05
for x in range(4):
    print(x, round(stats.binom.pmf(x, n, p), 4))`,
      lines: [
        "La distribución binomial de SciPy.",
        "20 noches; la probabilidad real de noche despejada es 0,05.",
        "Los resultados posibles más probables.",
        "P(X = 0) ≈ 0,358: en más de un tercio de los estudios no habría ninguna noche despejada… y Wald daría el intervalo [0, 0].",
      ],
    },
    challenge: [
      "1. `ic_wald(x, n, conf=0.95)`, `ic_wilson(x, n, conf=0.95)` e `ic_exacto(x, n, conf=0.95)`: tuplas `(bajo, alto)` de `float`. Wald se recorta a [0, 1]; el exacto vale 0 abajo si x = 0 y 1 arriba si x = n. z = `stats.norm.ppf(1 - (1 - conf) / 2)`.",
      "2. `cobertura_exacta(metodo, p, n, conf=0.95)`: suma de `stats.binom.pmf(x, n, p)` para los x de 0 a n cuyo intervalo contiene p (extremos incluidos).",
      "3. `cobertura_simulada(metodo, p, n, reps=4000, semilla=0, conf=0.95)`: `rng = np.random.default_rng(semilla)`, `xs = rng.binomial(n, p, size=reps)` y proporción de intervalos que contienen p.",
      "4. `METODOS` (`\"wald\"`, `\"wilson\"`, `\"exacto\"`), `tabla_cobertura`: para cada método, un diccionario {p: cobertura exacta con n = 20} para p = 0.05, 0.1, 0.3 y 0.5; y `simulada`: cobertura simulada de Wald con p = 0.1, n = 20 y semilla 1.",
    ],
    starter: py`import numpy as np
from scipy import stats


def ic_wald(x, n, conf=0.95):
    return 0.0, 1.0


def ic_wilson(x, n, conf=0.95):
    return 0.0, 1.0


def ic_exacto(x, n, conf=0.95):
    return 0.0, 1.0


def cobertura_exacta(metodo, p, n, conf=0.95):
    return 0.0


def cobertura_simulada(metodo, p, n, reps=4000, semilla=0, conf=0.95):
    return 0.0


METODOS = {"wald": ic_wald, "wilson": ic_wilson, "exacto": ic_exacto}
tabla_cobertura = {}
simulada = 0.0`,
    solution: SOL1,
    tests: py`
import numpy as np
from scipy import stats

CASOS = [(7, 20), (0, 20), (20, 20), (1, 30), (45, 100), (3, 8)]

def test_contra_scipy():
    "Wilson y exacto coinciden con scipy.stats.binomtest"
    wi, ex = t.get("ic_wilson", "function"), t.get("ic_exacto", "function")
    for x, n in CASOS:
        r = stats.binomtest(x, n)
        for propio, metodo in ((wi, "wilson"), (ex, "exact")):
            ref = r.proportion_ci(confidence_level=0.95, method=metodo)
            lo, hi = propio(x, n)
            assert abs(lo - ref.low) < 1e-10 and abs(hi - ref.high) < 1e-10, f"{metodo} con x={x}, n={n}: {(lo, hi)} frente a {(ref.low, ref.high)}"
    lo99, hi99 = ex(7, 20, 0.99)
    lo95, hi95 = ex(7, 20)
    assert lo99 < lo95 and hi99 > hi95, "Más confianza, intervalo más ancho"

def test_wald():
    "Wald con su fórmula y recortado a [0, 1]"
    wa = t.get("ic_wald", "function")
    z = stats.norm.ppf(0.975)
    for x, n in CASOS:
        p = x / n
        m = z * np.sqrt(p * (1 - p) / n)
        lo, hi = wa(x, n)
        assert isinstance(lo, float) and isinstance(hi, float)
        assert abs(lo - max(0, p - m)) < 1e-12 and abs(hi - min(1, p + m)) < 1e-12
    assert wa(0, 20) == (0.0, 0.0)

def test_cobertura_exacta():
    "Cobertura exacta: suma de la binomial"
    ce = t.get("cobertura_exacta", "function")
    for nombre in ("ic_wald", "ic_wilson", "ic_exacto"):
        metodo = t.get(nombre, "function")
        for p in (0.05, 0.3):
            esperado = sum(stats.binom.pmf(x, 20, p) for x in range(21) if metodo(x, 20)[0] <= p <= metodo(x, 20)[1])
            assert abs(ce(metodo, p, 20) - esperado) < 1e-12, nombre
    tabla = t.get("tabla_cobertura", dict)
    assert set(tabla) == {"wald", "wilson", "exacto"} and all(set(v) == {0.05, 0.1, 0.3, 0.5} for v in tabla.values())
    assert tabla["wald"][0.05] < 0.7, "Wald se queda muy por debajo del 95 % con p = 0,05 y n = 20"
    assert all(c >= 0.95 for c in tabla["exacto"].values()), "Clopper-Pearson garantiza al menos el 95 %"

def test_cobertura_simulada():
    "La simulación concuerda con el cálculo exacto"
    cs, ce, wa = t.get("cobertura_simulada", "function"), t.get("cobertura_exacta", "function"), t.get("ic_wald", "function")
    rng = np.random.default_rng(1)
    xs = rng.binomial(20, 0.1, size=4000)
    esperada = np.mean([wa(int(x), 20)[0] <= 0.1 <= wa(int(x), 20)[1] for x in xs])
    assert abs(t.get("simulada") - esperada) < 1e-12, "Usa np.random.default_rng(semilla) y rng.binomial(n, p, size=reps)"
    exacta = ce(wa, 0.1, 20)
    assert abs(t.get("simulada") - exacta) < 4 * np.sqrt(exacta * (1 - exacta) / 4000)
`,
    hints: [
      "Wilson: `centro = (p + z**2 / (2 * n)) / (1 + z**2 / n)` y `margen = z * np.sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / (1 + z**2 / n)`.",
      "Exacto: `stats.beta.ppf(a / 2, x, n - x + 1)` abajo y `stats.beta.ppf(1 - a / 2, x + 1, n - x)` arriba, con a = 1 − conf; trata x = 0 y x = n aparte.",
      "cobertura_exacta: `xs = np.arange(n + 1)`, una máscara con `lo <= p <= hi` para cada x y `stats.binom.pmf(xs, n, p)[mascara].sum()`.",
    ],
    errors: [
      { error: "Creer que un IC al 95 % siempre cubre el 95 %", fix: "Es una cobertura nominal: con proporciones, la real depende de n y de p y puede ser mucho menor (Wald) o mayor (exacto)." },
      { error: "Simular la cobertura sin compararla con nada", fix: "Con proporciones puedes calcularla exactamente; la simulación sirve para validar tu código y para los casos sin fórmula." },
    ],
    quiz: {
      question: "Con n = 20, ¿qué significa que el intervalo de Wald tenga una cobertura del 64 % cuando p = 0,05?",
      options: [
        { text: "Que, si se repitiera el estudio muchas veces con p = 0,05, solo el 64 % de los intervalos de Wald contendrían 0,05" },
        { text: "Que hay un 64 % de probabilidad de que p esté dentro del intervalo que ya hemos calculado", misconception: "ic-interpretacion" },
        { text: "Que el 64 % de las noches estarán despejadas" },
        { text: "Que el intervalo de Wald es correcto el 95 % de las veces, pero mide el 64 % de la distribución" },
      ],
      answer: 0,
      explanation: "La cobertura es una propiedad del procedimiento a lo largo de repeticiones. Con p = 0,05 y n = 20, X = 0 ocurre el 36 % de las veces y entonces Wald da [0, 0], que no contiene 0,05: casi toda la pérdida de cobertura viene de ahí.",
    },
    lab: { lab: "estadistica", tab: "intervalos", label: "Intervalos de confianza" },
    project: SPEC,
    review: "Repasa: la cobertura es del método; Wald falla con n pequeño o p extremo; Wilson y el exacto la corrigen; cobertura exacta = suma de la binomial.",
    xp: 130,
    coins: 18,
  },
  {
    id: "po-obs-2",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El observatorio de la incertidumbre · 2: la media con datos asimétricos, t frente a bootstrap",
    kind: "project",
    difficulty: 4,
    skills: ["intervalos-confianza", "bootstrap", "simulacion"],
    requires: ["po-obs-1", "s-bootstrap"],
    series: { ...SERIES, stage: 2 },
    packages: PAQUETES,
    story: "El observatorio también mide el tiempo entre destellos de una estrella variable. Los tiempos son muy asimétricos: muchos cortos y algunos larguísimos. Un becario propone el bootstrap «porque no supone nada». ¿Cubre mejor que el intervalo t?",
    objective: "Programar el intervalo t y el bootstrap de percentiles, y medir por simulación su cobertura para la media de una distribución exponencial con muestras de 10 y 40 datos.",
    before: ["Etapa 1", "Bootstrap", "Distribución t"],
    intuition: [
      "El **intervalo t** supone que la media muestral es aproximadamente normal. Con datos muy asimétricos y n pequeño no lo es del todo.",
      "",
      "El **bootstrap de percentiles** remuestrea los datos con reemplazo, calcula la media de cada remuestra y toma los percentiles 2,5 y 97,5. No supone normalidad, pero sí que la muestra representa bien a la población: con 10 datos de una exponencial casi nunca aparecen los valores grandes, y el intervalo sale **demasiado estrecho**.",
      "",
      "Con la exponencial, la media y la desviación muestrales suben y bajan juntas: cuando la muestra sale baja, el intervalo es bajo **y** estrecho. Por eso casi todos los fallos son intervalos que quedan **por debajo** de la media real.",
      "",
      "Medirlo exige simular muchos estudios: una matriz `reps × n` de muestras y, para el bootstrap, otra `reps × B × n` de índices. Vectorizado con NumPy, sin bucles en Python.",
    ],
    formal: "IC t: x̄ ± t₁₋α/₂,ₙ₋₁ · s/√n · Bootstrap de percentiles: [q_{α/2}, q_{1−α/2}] de las medias de B remuestras con reemplazo",
    example: {
      code: py`import numpy as np
rng = np.random.default_rng(0)
x = rng.exponential(1.0, size=10)
medias = x[rng.integers(0, 10, size=(1000, 10))].mean(axis=1)
print(round(x.mean(), 3), np.round(np.quantile(medias, [0.025, 0.975]), 3))`,
      lines: [
        "NumPy.",
        "Generador con semilla.",
        "Diez datos de una exponencial de media 1.",
        "Mil remuestras de tamaño 10 de una vez: una matriz de índices aleatorios y la media por filas.",
        "La media de la muestra y el intervalo bootstrap de percentiles.",
      ],
    },
    challenge: [
      "1. `ic_t(x, conf=0.95)`: x̄ ± t·s/√n con `stats.t.ppf` (s con `ddof=1`).",
      "2. `ic_bootstrap(x, B=2000, conf=0.95, semilla=0)`: `rng = np.random.default_rng(semilla)`, `medias = x[rng.integers(0, len(x), size=(B, len(x)))].mean(axis=1)` y los cuantiles con `np.quantile`.",
      "3. `cobertura_media(n, reps=800, B=400, semilla=0, conf=0.95)`: con `rng = np.random.default_rng(semilla)`, genera **primero** `muestras = rng.exponential(1.0, size=(reps, n))` (media real 1). Devuelve un diccionario con la cobertura de `\"t\"` y de `\"bootstrap\"` (B remuestras por estudio, sin bucles en Python), y `\"t_por_encima\"` / `\"t_por_debajo\"`: proporción de intervalos t que quedan enteros por encima o por debajo de 1.",
      "4. `estudio_media`: `{n: cobertura_media(n, semilla=n)}` para n = 10 y 40.",
    ],
    starter: py`def ic_t(x, conf=0.95):
    return 0.0, 0.0


def ic_bootstrap(x, B=2000, conf=0.95, semilla=0):
    return 0.0, 0.0


def cobertura_media(n, reps=800, B=400, semilla=0, conf=0.95):
    return {"t": 0.0, "bootstrap": 0.0, "t_por_encima": 0.0, "t_por_debajo": 0.0}


estudio_media = {}`,
    solution: SOL2,
    tests: py`
import numpy as np
from scipy import stats

def test_ic_t():
    "El intervalo t coincide con scipy.stats.t.interval"
    it = t.get("ic_t", "function")
    x = np.random.default_rng(3).exponential(2.0, size=30)
    ref = stats.t.interval(0.95, len(x) - 1, loc=x.mean(), scale=stats.sem(x))
    lo, hi = it(x)
    assert isinstance(lo, float) and abs(lo - ref[0]) < 1e-10 and abs(hi - ref[1]) < 1e-10
    lo, hi = it([1.0, 2.0, 3.0], conf=0.9)
    ref = stats.t.interval(0.9, 2, loc=2.0, scale=stats.sem([1.0, 2.0, 3.0]))
    assert abs(lo - ref[0]) < 1e-10 and abs(hi - ref[1]) < 1e-10

def test_ic_bootstrap():
    "Bootstrap de percentiles reproducible"
    ib = t.get("ic_bootstrap", "function")
    x = np.array([1.0, 2.0, 3.0, 4.0, 10.0])
    rng = np.random.default_rng(5)
    medias = x[rng.integers(0, 5, size=(2000, 5))].mean(axis=1)
    ref = np.quantile(medias, [0.025, 0.975])
    lo, hi = ib(list(x), semilla=5)
    assert isinstance(lo, float) and abs(lo - ref[0]) < 1e-12 and abs(hi - ref[1]) < 1e-12
    ancho_90 = np.subtract(*ib(x, conf=0.9)[::-1])
    assert ancho_90 < hi - lo

def test_cobertura_t_reproducible():
    "La cobertura t sale de las muestras indicadas"
    cm = t.get("cobertura_media", "function")
    res = cm(10, reps=300, B=50, semilla=7)
    rng = np.random.default_rng(7)
    m = rng.exponential(1.0, size=(300, 10))
    media, ee = m.mean(axis=1), m.std(axis=1, ddof=1) / np.sqrt(10)
    tq = stats.t.ppf(0.975, 9)
    assert abs(res["t"] - np.mean(np.abs(media - 1) <= tq * ee)) < 1e-12
    assert abs(res["t_por_debajo"] - np.mean(media + tq * ee < 1)) < 1e-12
    assert abs(res["t"] + res["t_por_encima"] + res["t_por_debajo"] - 1) < 1e-12

def test_conclusiones():
    "Con n = 10 el bootstrap cubre menos que t, y los fallos son asimétricos"
    e = t.get("estudio_media", dict)
    assert set(e) == {10, 40}
    diez, cuarenta = e[10], e[40]
    assert 0.85 < diez["t"] < 0.95 and diez["bootstrap"] < diez["t"], diez
    assert diez["t_por_debajo"] > 5 * diez["t_por_encima"], "Casi todos los fallos quedan por debajo de la media real"
    assert cuarenta["t"] > 0.9 and cuarenta["bootstrap"] > diez["bootstrap"], cuarenta
`,
    hints: [
      "cobertura_media: `medias = muestras.mean(axis=1)` y `ee = muestras.std(axis=1, ddof=1) / np.sqrt(n)`; el intervalo t cubre si `np.abs(medias - 1) <= t * ee`.",
      "Para el bootstrap vectorizado: `idx = rng.integers(0, n, size=(reps, B, n))` y `np.take_along_axis(muestras[:, None, :], idx, axis=2).mean(axis=2)` da una matriz reps × B de medias.",
      "`np.quantile(remuestras, [a, 1 - a], axis=1)` devuelve los dos límites de cada estudio a la vez.",
    ],
    errors: [
      { error: "Pensar que el bootstrap «no supone nada» y por eso siempre es mejor", fix: "Supone que la muestra se parece a la población; con pocos datos asimétricos subestima la variabilidad." },
      { error: "Generar el bootstrap antes que las muestras", fix: "Respeta el orden de las llamadas al generador: si no, tus resultados no serán reproducibles ni comparables." },
    ],
    quiz: {
      question: "Un estudio con 10 tiempos da el IC t al 95 % [0,62; 1,48]. ¿Qué afirmación es correcta?",
      options: [
        { text: "El método produce intervalos que contienen la media real en torno al 91 % de las veces con estos datos asimétricos, algo menos que el 95 % nominal" },
        { text: "La media real está en [0,62; 1,48] con probabilidad 0,95", misconception: "ic-interpretacion" },
        { text: "El 95 % de los tiempos individuales están entre 0,62 y 1,48", misconception: "de-vs-ee" },
        { text: "Como los datos no son normales, el intervalo t no tiene ninguna validez", misconception: "normalidad-universal" },
      ],
      answer: 0,
      explanation: "La confianza es del procedimiento, no de un intervalo concreto; tu simulación mide que con n = 10 cubre ≈ 0,91. Habla de la media, no de los datos individuales, y la falta de normalidad lo degrada sin anularlo.",
    },
    lab: { lab: "estadistica", tab: "bootstrap", label: "Bootstrap" },
    project: SPEC,
    review: "Repasa: el intervalo t y el bootstrap con pocos datos asimétricos; la cobertura se mide simulando; los fallos pueden ser asimétricos.",
    xp: 140,
    coins: 20,
  },
  {
    id: "po-obs-3",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El observatorio de la incertidumbre · 3: inferencia bayesiana beta-binomial",
    kind: "project",
    difficulty: 3,
    skills: ["bayesiana", "intervalo-creible", "intervalos-confianza"],
    requires: ["po-obs-2", "b-beta-binomial"],
    series: { ...SERIES, stage: 3 },
    packages: PAQUETES,
    story: "Un nuevo telescopio detecta 3 cometas en 10 noches de prueba. La directora pregunta lo que de verdad le interesa: «¿qué probabilidad hay de que la tasa supere el 20 %?». Esa pregunta tiene respuesta bayesiana… si declaras tu información previa y compruebas cuánto influye.",
    objective: "Calcular posteriores beta-binomiales, intervalos creíbles y probabilidades posteriores, analizar la sensibilidad a la priori y medir la cobertura frecuentista del intervalo de Jeffreys con la función de la etapa 1.",
    before: ["Etapas 1 y 2", "Actualización bayesiana beta-binomial", "Distribución beta"],
    intuition: [
      "Con una priori Beta(a, b) y x éxitos en n ensayos, la posteriori es **Beta(a + x, b + n − x)**: la priori actúa como a éxitos y b fracasos «imaginarios».",
      "",
      "De la posteriori salen respuestas directas: la **media** (a + x)/(a + b + n), un **intervalo creíble** con sus cuantiles 2,5 % y 97,5 %, y **P(p > 0,2 | datos)**.",
      "",
      "Distintas prioris dan distintas respuestas con pocos datos: hay que **mostrar la sensibilidad**. La uniforme Beta(1, 1), la de Jeffreys Beta(½, ½) y una escéptica Beta(2, 18) (equivale a haber visto 2 cometas en 20 noches).",
      "",
      "El intervalo creíble de **Jeffreys** también es un buen intervalo de confianza: con la función `cobertura_exacta` de la etapa 1 puedes medir su cobertura frecuentista.",
      "",
      "Comprobación independiente: con la priori uniforme, P(Beta(x + 1, n − x + 1) > u) = P(Binomial(n + 1, u) ≤ x).",
    ],
    formal: "p | x ~ Beta(a + x, b + n − x) · E[p | x] = (a + x)/(a + b + n) · IC creíble: [F⁻¹(α/2), F⁻¹(1 − α/2)] de la Beta posterior",
    example: {
      code: py`from scipy import stats
post = stats.beta(1 + 3, 1 + 7)
print(round(post.mean(), 3), [round(q, 3) for q in post.ppf([0.025, 0.975])], round(post.sf(0.2), 3))`,
      lines: [
        "Distribuciones de SciPy.",
        "Priori uniforme y 3 éxitos en 10 ensayos: posteriori Beta(4, 8).",
        "Media 0,333, intervalo creíble [0,109; 0,610] y P(p > 0,2 | datos) = 0,839.",
      ],
    },
    challenge: [
      "1. `PRIORES`: `{\"uniforme\": (1.0, 1.0), \"jeffreys\": (0.5, 0.5), \"escéptica\": (2.0, 18.0)}`.",
      "2. `posterior(x, n, a=1.0, b=1.0)`: tupla con los parámetros de la Beta posterior.",
      "3. `resumen_posterior(x, n, a=1.0, b=1.0, conf=0.95, umbral=0.5)`: diccionario con `a`, `b` (posteriores), `media`, `intervalo` (tupla de cuantiles) y `prob_mayor_umbral`.",
      "4. `ic_jeffreys(x, n, conf=0.95)`: el intervalo creíble con la priori de Jeffreys.",
      "5. `media_por_muestreo(x, n, a=1.0, b=1.0, m=20000, semilla=0)`: media de m muestras de la posterior con `np.random.default_rng(semilla).beta(...)` y su error estándar Monte Carlo.",
      "6. `sensibilidad`: `{nombre: resumen_posterior(3, 10, a, b, umbral=0.2)}` para cada priori; `cobertura_jeffreys`: cobertura exacta de `ic_jeffreys` con n = 20 para p = 0.05, 0.1, 0.3 y 0.5.",
    ],
    starter: py`PRIORES = {"uniforme": (1.0, 1.0), "jeffreys": (0.5, 0.5), "escéptica": (2.0, 18.0)}


def posterior(x, n, a=1.0, b=1.0):
    return a, b


def resumen_posterior(x, n, a=1.0, b=1.0, conf=0.95, umbral=0.5):
    return {}


def ic_jeffreys(x, n, conf=0.95):
    return 0.0, 1.0


def media_por_muestreo(x, n, a=1.0, b=1.0, m=20000, semilla=0):
    return 0.0, 0.0


sensibilidad = {}
cobertura_jeffreys = {}`,
    solution: SOL3,
    tests: py`
import numpy as np
from scipy import stats

def test_posterior():
    "Conjugación beta-binomial"
    po = t.get("posterior", "function")
    assert tuple(po(3, 10)) == (4.0, 8.0) and tuple(po(3, 10, 0.5, 0.5)) == (3.5, 7.5) and tuple(po(0, 5, 2, 18)) == (2, 23)

def test_resumen():
    "Media, intervalo creíble y probabilidad posterior"
    rp = t.get("resumen_posterior", "function")
    r = rp(3, 10, umbral=0.2)
    assert r["a"] == 4 and r["b"] == 8 and abs(r["media"] - 1 / 3) < 1e-12
    lo, hi = r["intervalo"]
    assert abs(lo - stats.beta.ppf(0.025, 4, 8)) < 1e-12 and abs(hi - stats.beta.ppf(0.975, 4, 8)) < 1e-12
    # Identidad beta-binomial: P(Beta(x + 1, n − x + 1) > u) = P(Bin(n + 1, u) ≤ x)
    assert abs(r["prob_mayor_umbral"] - stats.binom.cdf(3, 11, 0.2)) < 1e-12
    r90 = rp(3, 10, conf=0.9)
    assert r90["intervalo"][1] - r90["intervalo"][0] < hi - lo

def test_sensibilidad():
    "La priori pesa con pocos datos"
    s = t.get("sensibilidad", dict)
    assert set(s) == {"uniforme", "jeffreys", "escéptica"}
    assert abs(s["escéptica"]["media"] - 5 / 30) < 1e-12 and abs(s["jeffreys"]["media"] - 3.5 / 11) < 1e-12
    assert s["uniforme"]["prob_mayor_umbral"] > s["jeffreys"]["prob_mayor_umbral"] > 0.5 > s["escéptica"]["prob_mayor_umbral"]
    ancho = {k: v["intervalo"][1] - v["intervalo"][0] for k, v in s.items()}
    assert ancho["escéptica"] < ancho["uniforme"]

def test_muestreo():
    "El muestreo de la posterior concuerda con la media exacta"
    mm = t.get("media_por_muestreo", "function")
    media, ee = mm(3, 10)
    sd = np.sqrt(4 * 8 / (12 ** 2 * 13))
    assert abs(ee - sd / np.sqrt(20000)) < 0.05 * sd / np.sqrt(20000)
    assert abs(media - 1 / 3) < 4 * ee
    assert abs(media - np.random.default_rng(0).beta(4, 8, size=20000).mean()) < 1e-12

def test_jeffreys():
    "El intervalo de Jeffreys y su cobertura frecuentista"
    ij = t.get("ic_jeffreys", "function")
    lo, hi = ij(7, 20)
    assert abs(lo - stats.beta.ppf(0.025, 7.5, 13.5)) < 1e-12 and abs(hi - stats.beta.ppf(0.975, 7.5, 13.5)) < 1e-12
    cj = t.get("cobertura_jeffreys", dict)
    ce = t.get("cobertura_exacta", "function")
    assert set(cj) == {0.05, 0.1, 0.3, 0.5}
    for p, c in cj.items():
        assert abs(c - ce(ij, p, 20)) < 1e-12 and 0.93 < c < 0.99, (p, c)
`,
    hints: [
      "posterior: `return a + x, b + n - x`.",
      "resumen_posterior: `dist = stats.beta(pa, pb)`; el intervalo es `dist.ppf(cola)` y `dist.ppf(1 - cola)`; la probabilidad, `dist.sf(umbral)` (1 − cdf).",
      "cobertura_jeffreys: reutiliza `cobertura_exacta(ic_jeffreys, p, 20)` de la etapa 1.",
    ],
    errors: [
      { error: "Informar una sola posterior con pocos datos", fix: "Con 10 ensayos la priori pesa: muestra al menos dos o tres y explica cuál usas y por qué." },
      { error: "Confundir P(p > 0,2 | datos) con un valor p", fix: "La primera es la probabilidad de la hipótesis dados los datos (bayesiana); el valor p es la probabilidad de datos tan extremos si la hipótesis nula fuera cierta." },
    ],
    quiz: {
      question: "Con la priori uniforme, el intervalo creíble al 95 % para la tasa de cometas es [0,109; 0,610]. ¿Qué puedes decir?",
      options: [
        { text: "Dada la priori y los datos, la probabilidad de que la tasa esté entre 0,109 y 0,610 es 0,95" },
        { text: "Lo mismo que un intervalo de confianza: el 95 % de los intervalos calculados así contendrían la tasa", misconception: "ic-vs-creible" },
        { text: "Que el 95 % de las noches habrá entre 0,109 y 0,610 cometas" },
        { text: "Nada: un intervalo bayesiano depende de la priori y por tanto es arbitrario" },
      ],
      answer: 0,
      explanation: "El intervalo creíble es un enunciado de probabilidad sobre el parámetro, condicionado a la priori y los datos. Su cobertura frecuentista es otra cuestión: para Jeffreys la has medido y ronda el 95 %.",
    },
    lab: { lab: "estadistica", tab: "bayes", label: "Actualización bayesiana" },
    project: SPEC,
    review: "Repasa: Beta(a + x, b + n − x); media, intervalo creíble y P(p > u | datos); sensibilidad a la priori; Jeffreys también cubre bien.",
    xp: 130,
    coins: 18,
  },
  {
    id: "po-obs-4",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El observatorio de la incertidumbre · 4: test A/B bayesiano y el coste de mirar",
    kind: "project",
    difficulty: 4,
    skills: ["bayesiana", "pruebas-hipotesis", "errores-tipo", "simulacion"],
    requires: ["po-obs-3", "i-potencia"],
    series: { ...SERIES, stage: 4 },
    packages: PAQUETES,
    story: "El observatorio prueba un nuevo formulario de solicitud de horas de telescopio: el antiguo (A) obtuvo 120 solicitudes completas de 1000 visitas; el nuevo (B), 145 de 1000. El comité quiere decidir hoy… y uno de sus miembros admite que lleva una semana mirando el valor p cada mañana.",
    objective: "Calcular P(p_B > p_A | datos) por integración y por muestreo, la pérdida esperada y el intervalo de la mejora relativa; compararlo con la prueba z; y medir por simulación cuánto aumentan los falsos positivos al mirar los datos repetidamente.",
    before: ["Etapas 1 a 3", "Comparación de dos proporciones", "Errores de tipo I y potencia"],
    intuition: [
      "Con prioris uniformes, cada tasa tiene su posteriori beta. **P(p_B > p_A | datos)** = ∫ f_B(p)·F_A(p) dp: para cada valor posible de p_B, la probabilidad de que p_A quede por debajo. Se puede integrar numéricamente o estimar muestreando de las dos posterioris.",
      "",
      "La **pérdida esperada** de elegir B, E[max(p_A − p_B, 0)], cuantifica cuánto perderías si te equivocas: una buena regla de decisión no mira solo la probabilidad.",
      "",
      "En este experimento P(B > A) ≈ 0,95 y, sin embargo, la prueba z bilateral da p ≈ 0,099. No se contradicen: responden preguntas distintas (con prioris planas, P(B > A) se parece a 1 − p unilateral).",
      "",
      "**Mirar** el valor p cada día y parar en cuanto baja de 0,05 cambia el procedimiento: aunque no haya ninguna diferencia (pruebas A/A), la probabilidad de declarar un ganador se dispara. Lo mides simulando miles de experimentos A/A con 10 miradas.",
    ],
    formal: "P(p_B > p_A | datos) = ∫₀¹ f_B(p) F_A(p) dp · Pérdida(B) = E[max(p_A − p_B, 0)] · z = (p̂_B − p̂_A)/√(p̄(1 − p̄)(1/n_A + 1/n_B))",
    example: {
      code: py`import numpy as np
rng = np.random.default_rng(0)
pa = rng.beta(1 + 120, 1 + 880, size=100000)
pb = rng.beta(1 + 145, 1 + 855, size=100000)
print(round(np.mean(pb > pa), 3), round(np.mean(np.maximum(pa - pb, 0)), 5))`,
      lines: [
        "NumPy.",
        "Generador con semilla.",
        "Muestras de la posteriori de A: Beta(121, 881).",
        "Muestras de la posteriori de B: Beta(146, 856).",
        "P(B > A) ≈ 0,95 y la pérdida esperada de elegir B, unas tres diezmilésimas de tasa.",
      ],
    },
    challenge: [
      "1. `prob_b_mejor(xa, na, xb, nb, a=1.0, b=1.0)`: P(p_B > p_A | datos) integrando con `scipy.integrate.quad` la función `B.pdf(p) * A.cdf(p)` entre 0 y 1 (usa `posterior` de la etapa 3).",
      "2. `ab_por_muestreo(xa, na, xb, nb, m=200000, semilla=0, a=1.0, b=1.0)`: con un generador, muestrea **primero** m valores de la posterior de A y después m de la de B. Devuelve `prob_b_mejor`, `perdida_esperada_b` (media de max(p_A − p_B, 0)) y `mejora_relativa` (cuantiles 2,5 % y 97,5 % de p_B/p_A − 1).",
      "3. `prueba_z(xa, na, xb, nb)`: `(z, p_bilateral)` con la proporción combinada.",
      "4. `falsos_positivos_mirando(reps=2000, n_max=1000, cada=100, p=0.1, semilla=0)`: simula reps pruebas A/A (dos grupos con la misma tasa p) y aplica la prueba z con los datos acumulados cada `cada` observaciones. Devuelve la proporción de experimentos significativos (p < 0,05) `al_final` (solo con n_max) y `mirando` (en cualquiera de las miradas). Sin bucles sobre los experimentos: usa `cumsum`.",
      "5. `experimento = {\"xa\": 120, \"na\": 1000, \"xb\": 145, \"nb\": 1000}` y `decision` con `prob_b_mejor`, `muestreo`, `prueba_z` y `mirar` (los resultados de las cuatro funciones).",
    ],
    starter: py`from scipy import integrate


def prob_b_mejor(xa, na, xb, nb, a=1.0, b=1.0):
    return 0.5


def ab_por_muestreo(xa, na, xb, nb, m=200000, semilla=0, a=1.0, b=1.0):
    return {"prob_b_mejor": 0.5, "perdida_esperada_b": 0.0, "mejora_relativa": (0.0, 0.0)}


def prueba_z(xa, na, xb, nb):
    return 0.0, 1.0


def falsos_positivos_mirando(reps=2000, n_max=1000, cada=100, p=0.1, semilla=0):
    return {"al_final": 0.0, "mirando": 0.0}


experimento = {"xa": 120, "na": 1000, "xb": 145, "nb": 1000}
decision = {}`,
    solution: SOL4,
    tests: py`
import numpy as np
from scipy import stats
from scipy.special import betaln

def miller(xa, na, xb, nb):
    # Fórmula cerrada para prioris uniformes (Evan Miller), independiente de la integración.
    aA, bA, aB, bB = 1 + xa, 1 + na - xa, 1 + xb, 1 + nb - xb
    i = np.arange(aB)
    return float(np.sum(np.exp(betaln(aA + i, bA + bB) - np.log(bB + i) - betaln(1 + i, bB) - betaln(aA, bA))))

def test_prob_b_mejor():
    "La integración coincide con la fórmula cerrada"
    pb = t.get("prob_b_mejor", "function")
    for caso in ((120, 1000, 145, 1000), (3, 10, 7, 12), (0, 5, 1, 5), (30, 200, 18, 150)):
        assert abs(pb(*caso) - miller(*caso)) < 1e-8, caso
    assert abs(pb(50, 100, 50, 100) - 0.5) < 1e-8

def test_muestreo():
    "Muestreo reproducible y compatible con la integración"
    ab = t.get("ab_por_muestreo", "function")
    r = ab(120, 1000, 145, 1000, m=50000, semilla=3)
    rng = np.random.default_rng(3)
    pa = rng.beta(121, 881, size=50000)
    pb = rng.beta(146, 856, size=50000)
    assert abs(r["prob_b_mejor"] - np.mean(pb > pa)) < 1e-12
    assert abs(r["perdida_esperada_b"] - np.mean(np.maximum(pa - pb, 0))) < 1e-12
    lo, hi = r["mejora_relativa"]
    assert abs(lo - np.quantile(pb / pa - 1, 0.025)) < 1e-12 and abs(hi - np.quantile(pb / pa - 1, 0.975)) < 1e-12
    assert abs(r["prob_b_mejor"] - miller(120, 1000, 145, 1000)) < 4 * np.sqrt(0.05 * 0.95 / 50000)

def test_prueba_z():
    "La prueba z coincide con la ji cuadrado sin corrección"
    pz = t.get("prueba_z", "function")
    z, p = pz(120, 1000, 145, 1000)
    chi2, p_chi, _, _ = stats.chi2_contingency([[120, 880], [145, 855]], correction=False)
    assert abs(z ** 2 - chi2) < 1e-9 and abs(p - p_chi) < 1e-12 and z > 0
    assert pz(145, 1000, 120, 1000)[0] < 0

def test_mirar():
    "Mirar muchas veces dispara los falsos positivos"
    fm = t.get("falsos_positivos_mirando", "function")
    r = fm(reps=1500, semilla=11)
    assert 0.025 < r["al_final"] < 0.075, r
    assert 0.14 < r["mirando"] < 0.27 and r["mirando"] > 2.5 * r["al_final"], r
    una = fm(reps=1500, cada=1000, semilla=11)
    assert abs(una["mirando"] - una["al_final"]) < 1e-12, "Con una sola mirada ambos coinciden"

def test_decision():
    "El informe del comité"
    d = t.get("decision", dict)
    assert abs(d["prob_b_mejor"] - miller(120, 1000, 145, 1000)) < 1e-8
    assert 0.94 < d["muestreo"]["prob_b_mejor"] < 0.96 and d["muestreo"]["perdida_esperada_b"] < 0.001
    assert 0.09 < d["prueba_z"][1] < 0.11
    assert d["mirar"]["mirando"] > 2.5 * d["mirar"]["al_final"]
`,
    hints: [
      "prob_b_mejor: `A = stats.beta(*posterior(xa, na, a, b))`, igual con B, e `integrate.quad(lambda p: B.pdf(p) * A.cdf(p), 0, 1)`.",
      "falsos_positivos_mirando: `a = rng.random((reps, n_max)) < p` (y lo mismo para b); `cortes = np.arange(cada, n_max + 1, cada)` y `a.cumsum(axis=1)[:, cortes - 1]` dan los éxitos acumulados en cada mirada.",
      "Si en una mirada ambos grupos tienen 0 éxitos, el error estándar es 0: usa `np.where(ee > 0, ..., 0.0)` dentro de `np.errstate(divide=\"ignore\", invalid=\"ignore\")`.",
    ],
    errors: [
      { error: "Leer P(B > A) = 0,95 como «hay un 95 % de probabilidad de que la diferencia sea significativa»", fix: "Es la probabilidad posterior de que B sea mejor, dada la priori y los datos. La significación es una propiedad de un procedimiento frecuentista." },
      { error: "Parar el experimento la primera vez que p < 0,05", fix: "Con 10 miradas, la tasa de falsos positivos pasa del 5 % a cerca del 20 %. Fija el tamaño antes o usa métodos secuenciales diseñados para mirar." },
      { error: "Decidir solo con la probabilidad", fix: "Mira también la pérdida esperada y el intervalo de la mejora: una probabilidad alta de una mejora minúscula puede no compensar el cambio." },
    ],
    quiz: {
      question: "El análisis da P(B > A | datos) = 0,95 y la prueba z bilateral p = 0,099. ¿Qué conclusión es correcta?",
      options: [
        { text: "Responden preguntas distintas: con prioris planas es probable que B sea algo mejor, pero la evidencia no alcanza el umbral bilateral habitual; la decisión debe considerar también la pérdida esperada" },
        { text: "Hay una contradicción: uno de los dos cálculos está mal" },
        { text: "p = 0,099 significa que hay un 9,9 % de probabilidad de que A y B sean iguales", misconception: "p-valor" },
        { text: "Como p > 0,05, queda demostrado que B no es mejor que A", misconception: "significacion-relevancia" },
      ],
      answer: 0,
      explanation: "P(B > A | datos) es una probabilidad sobre el parámetro; el valor p, sobre los datos si H₀ fuera cierta. No significativo no demuestra igualdad.",
    },
    lab: { lab: "estadistica", tab: "potencia", label: "Errores y potencia" },
    project: SPEC,
    review: "Repasa: P(B > A) = ∫ f_B F_A; pérdida esperada; el valor p no es P(H₀); mirar repetidamente infla el error de tipo I.",
    xp: 160,
    coins: 24,
  },
];
