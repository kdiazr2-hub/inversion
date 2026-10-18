import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 4: un simulador de probabilidades en Python puro. Cada etapa
// compara un cálculo exacto con una simulación y cuantifica el error de la simulación.

const SERIES = { id: "simulador-probabilidades", title: "Proyecto progresivo: el casino del Imperio", of: 4 };

const SPEC: ProjectSpec = {
  requirements: [
    "Calcular cada probabilidad de forma exacta (enumeración, combinatoria o álgebra) y por simulación.",
    "Acompañar toda simulación de su error estándar Monte Carlo y comprobar que la diferencia con el valor exacto es compatible con él.",
    "Usar generadores con semilla para que los resultados sean reproducibles.",
    "Modelar un juego de tablero como una cadena de Markov y calcular su duración esperada.",
  ],
  dataset: "Sin archivo de datos: los datos se generan con simulaciones reproducibles (random.Random con semilla).",
  stages: ["Probabilidad exacta frente a simulación", "Paradojas: cumpleaños y Monty Hall", "La suma de dados: convolución, LGN y TCL", "El juego de la oca: cadenas de Markov"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Las probabilidades exactas se representan con fracciones cuando es posible.",
    "Cada estimación por simulación se informa con su error estándar.",
    "El valor esperado de la duración del juego se calcula exactamente y se valida con simulación.",
  ],
  extensions: [
    "Visualizar con matplotlib la distribución exacta de la suma frente a la simulada.",
    "Probabilidad de ruina del jugador (gambler's ruin) con cadena de Markov y con simulación.",
    "Comparar el número de simulaciones necesario para un error dado con la fórmula n ≈ p(1 − p)/EE².",
  ],
  portfolio: "Simulador de probabilidades en Python: enumeración exacta con fracciones, Monte Carlo con error estándar, convolución de distribuciones, aproximación normal y cadenas de Markov para un juego de tablero.",
};

const S1 = py`import itertools
import math
import random
from fractions import Fraction

def espacio_dados(n, caras=6):
    return list(itertools.product(range(1, caras + 1), repeat=n))

def prob_exacta(evento, espacio):
    return Fraction(sum(1 for w in espacio if evento(w)), len(espacio))

def simular(evento, generador, n, semilla=0):
    rng = random.Random(semilla)
    return sum(1 for _ in range(n) if evento(generador(rng))) / n

def error_mc(p, n):
    return math.sqrt(p * (1 - p) / n)

def dos_dados(rng):
    return (rng.randint(1, 6), rng.randint(1, 6))

suma7 = lambda w: sum(w) == 7
p7 = prob_exacta(suma7, espacio_dados(2))
estudio = []
for n in (100, 1000, 10000):
    est = simular(suma7, dos_dados, n, semilla=1)
    estudio.append({"n": n, "estimacion": est, "error": abs(est - float(p7)), "ee": error_mc(float(p7), n)})`;

const S2 = py`def cumple_exacto(k, dias=365):
    p_distintos = 1.0
    for i in range(k):
        p_distintos *= (dias - i) / dias
    return 1 - p_distintos

def cumple_simulado(k, n, semilla=0, dias=365):
    rng = random.Random(semilla)
    exitos = 0
    for _ in range(n):
        fechas = [rng.randrange(dias) for _ in range(k)]
        exitos += len(set(fechas)) < k
    return exitos / n

def minimo_grupo(p=0.5):
    k = 1
    while cumple_exacto(k) < p:
        k += 1
    return k

def monty_enumerado():
    gana = {"quedarse": Fraction(0), "cambiar": Fraction(0)}
    for coche in range(3):
        for eleccion in range(3):
            abribles = [d for d in range(3) if d != coche and d != eleccion]
            for abierta in abribles:
                peso = Fraction(1, 3) * Fraction(1, 3) * Fraction(1, len(abribles))
                otra = next(d for d in range(3) if d not in (eleccion, abierta))
                gana["quedarse"] += peso * (eleccion == coche)
                gana["cambiar"] += peso * (otra == coche)
    return gana

def monty_simulado(cambiar, n, semilla=0):
    rng = random.Random(semilla)
    ganadas = 0
    for _ in range(n):
        coche, eleccion = rng.randrange(3), rng.randrange(3)
        abierta = rng.choice([d for d in range(3) if d != coche and d != eleccion])
        if cambiar:
            eleccion = next(d for d in range(3) if d not in (eleccion, abierta))
        ganadas += eleccion == coche
    return ganadas / n`;

const S3 = py`def convolucionar(p, q):
    r = {}
    for a, pa in p.items():
        for b, qb in q.items():
            r[a + b] = r.get(a + b, 0) + pa * qb
    return r

def pmf_suma(n_dados, caras=6):
    dado = {c: Fraction(1, caras) for c in range(1, caras + 1)}
    pmf = {0: Fraction(1)}
    for _ in range(n_dados):
        pmf = convolucionar(pmf, dado)
    return pmf

def media_varianza(pmf):
    m = sum(x * p for x, p in pmf.items())
    v = sum((x - m) ** 2 * p for x, p in pmf.items())
    return m, v

def prob_intervalo(pmf, a, b):
    return sum(p for x, p in pmf.items() if a <= x <= b)

def aprox_normal(n_dados, a, b, caras=6):
    m = n_dados * (caras + 1) / 2
    s = math.sqrt(n_dados * (caras ** 2 - 1) / 12)
    phi = lambda z: 0.5 * (1 + math.erf(z / math.sqrt(2)))
    return phi((b + 0.5 - m) / s) - phi((a - 0.5 - m) / s)

def empirica(n_dados, n, semilla=0, caras=6):
    rng = random.Random(semilla)
    cuentas = {}
    for _ in range(n):
        s = sum(rng.randint(1, caras) for _ in range(n_dados))
        cuentas[s] = cuentas.get(s, 0) + 1
    return {s: c / n for s, c in cuentas.items()}

def distancia_vt(p, q):
    claves = set(p) | set(q)
    return 0.5 * sum(abs(float(p.get(k, 0)) - float(q.get(k, 0))) for k in claves)`;

const S4 = py`SALTOS = {3: 11, 6: 17, 9: 2, 14: 4, 19: 7}
FINAL = 20

def matriz_transicion(final=FINAL, saltos=SALTOS, caras=6):
    n = final + 1
    P = [[0.0] * n for _ in range(n)]
    P[final][final] = 1.0
    for i in range(final):
        for d in range(1, caras + 1):
            j = i + d if i + d <= final else i
            j = saltos.get(j, j)
            P[i][j] += 1 / caras
    return P

def paso(dist, P):
    n = len(P)
    return [sum(dist[i] * P[i][j] for i in range(n)) for j in range(n)]

def distribucion_tras(P, k):
    dist = [1.0] + [0.0] * (len(P) - 1)
    for _ in range(k):
        dist = paso(dist, P)
    return dist

def duracion_esperada(P, tol=1e-12, max_turnos=100000):
    dist = [1.0] + [0.0] * (len(P) - 1)
    esperanza, k = 0.0, 0
    while k < max_turnos:
        sigue = 1 - dist[-1]
        if sigue < tol:
            break
        esperanza += sigue
        dist = paso(dist, P)
        k += 1
    return esperanza

def simular_partida(rng, final=FINAL, saltos=SALTOS, caras=6):
    pos, turnos = 0, 0
    while pos != final:
        d = rng.randint(1, caras)
        if pos + d <= final:
            pos = saltos.get(pos + d, pos + d)
        turnos += 1
    return turnos

def duracion_simulada(n, semilla=0):
    rng = random.Random(semilla)
    turnos = [simular_partida(rng) for _ in range(n)]
    m = sum(turnos) / n
    s = math.sqrt(sum((t - m) ** 2 for t in turnos) / (n - 1))
    return m, s / math.sqrt(n)

P = matriz_transicion()
exacta = duracion_esperada(P)
media_sim, ee_sim = duracion_simulada(5000, semilla=3)
informe = {
    "duracion_exacta": exacta,
    "duracion_simulada": media_sim,
    "ee": ee_sim,
    "compatible": abs(media_sim - exacta) < 3 * ee_sim,
    "prob_terminar_en_10": distribucion_tras(P, 10)[-1],
}`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

export const PROJ_PROBABILIDADES: Mission[] = [
  {
    id: "pp-casino-1",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El casino del Imperio · 1: probabilidad exacta frente a simulación",
    kind: "project",
    difficulty: 2,
    skills: ["probabilidad", "simulacion", "combinatoria"],
    requires: ["p-lgn-tcl"],
    series: { ...SERIES, stage: 1 },
    story: "El casino del Imperio quiere un simulador para comprobar sus juegos antes de abrirlos. La regla de la casa: ninguna probabilidad simulada se acepta sin compararla con la exacta, y ninguna simulación sin su margen de error.",
    objective: "Calcular probabilidades exactas enumerando el espacio muestral, estimarlas por simulación con semilla y cuantificar el error Monte Carlo.",
    before: ["Reglas de probabilidad", "Ley de los grandes números", "itertools y fractions"],
    intuition: [
      "Si todos los resultados son **igual de probables**, P(A) = casos favorables / casos posibles. `itertools.product` enumera todos los resultados de varios dados y `Fraction` guarda el resultado exacto (1/6, no 0,1666…).",
      "",
      "Una **simulación** repite el experimento n veces y cuenta la frecuencia. Por la ley de los grandes números se acerca a la probabilidad, pero con un error aleatorio: su **error estándar** es √(p(1 − p)/n). Multiplicar n por 100 solo divide el error por 10.",
      "",
      "Usar una **semilla** hace la simulación reproducible: la misma semilla, los mismos números.",
    ],
    formal: "P(A) = |A| / |Ω| (resultados equiprobables) · p̂ = (1/n) Σ 1{Xᵢ ∈ A} · EE(p̂) = √(p(1 − p)/n)",
    example: {
      code: py`import itertools
from fractions import Fraction
espacio = list(itertools.product(range(1, 7), repeat=2))
favorables = [w for w in espacio if sum(w) == 7]
print(len(espacio), len(favorables), Fraction(len(favorables), len(espacio)))`,
      lines: [
        "Producto cartesiano para enumerar resultados.",
        "Fracciones exactas.",
        "Los 36 resultados de dos dados.",
        "Los que suman 7.",
        "36, 6 y la probabilidad exacta 1/6.",
      ],
    },
    challenge: [
      "1. `espacio_dados(n, caras=6)`: lista de tuplas con todos los resultados de n dados.",
      "2. `prob_exacta(evento, espacio)`: `Fraction` de resultados de `espacio` que cumplen `evento` (una función que recibe un resultado).",
      "3. `simular(evento, generador, n, semilla=0)`: frecuencia relativa del evento en n repeticiones; `generador(rng)` produce un resultado con un `random.Random(semilla)` creado una vez.",
      "4. `error_mc(p, n)`: √(p(1 − p)/n).",
      "5. `dos_dados(rng)`, `p7` (probabilidad exacta de sumar 7 con dos dados) y `estudio`: lista de diccionarios con `n`, `estimacion`, `error` (|estimación − p7|) y `ee` para n = 100, 1000 y 10 000 (semilla 1).",
    ],
    starter: py`import itertools
import math
import random
from fractions import Fraction

def espacio_dados(n, caras=6):
    return []

def prob_exacta(evento, espacio):
    return 0

def simular(evento, generador, n, semilla=0):
    return 0

def error_mc(p, n):
    return 0

def dos_dados(rng):
    return (rng.randint(1, 6), rng.randint(1, 6))

p7 = 0
estudio = []`,
    solution: SOL1,
    tests: py`
from fractions import Fraction
import random

def test_espacio():
    "Enumeración completa"
    e = t.get("espacio_dados", "function")
    assert len(e(2)) == 36 and len(e(3)) == 216 and len(e(2, caras=4)) == 16
    assert (1, 6) in e(2) and (6, 1) in e(2) and len(set(e(3))) == 216

def test_exacta():
    "Fracciones exactas"
    pe = t.get("prob_exacta", "function")
    e = t.get("espacio_dados", "function")
    assert pe(lambda w: sum(w) == 7, e(2)) == Fraction(1, 6)
    assert pe(lambda w: 6 in w, e(2)) == Fraction(11, 36)
    assert pe(lambda w: sum(w) >= 11, e(3)) == Fraction(1, 2) and pe(lambda w: sum(w) >= 10, e(3)) == Fraction(5, 8)
    assert isinstance(pe(lambda w: True, e(1)), Fraction)

def test_simulacion():
    "Reproducible y compatible con el valor exacto"
    s = t.get("simular", "function")
    gen = lambda r: (r.randint(1, 6), r.randint(1, 6))
    a = s(lambda w: sum(w) == 7, gen, 20000, semilla=5)
    assert a == s(lambda w: sum(w) == 7, gen, 20000, semilla=5)
    assert abs(a - 1 / 6) < 4 * (1 / 6 * 5 / 6 / 20000) ** 0.5
    rng = random.Random(9)
    ref = sum(1 for _ in range(500) if sum((rng.randint(1, 6), rng.randint(1, 6))) == 7) / 500
    assert s(lambda w: sum(w) == 7, gen, 500, semilla=9) == ref, "Crea un único random.Random(semilla) y úsalo en todas las repeticiones"

def test_estudio():
    "El error se comporta como 1/√n"
    est = t.get("estudio")
    assert [e["n"] for e in est] == [100, 1000, 10000] and t.get("p7") == Fraction(1, 6)
    for e in est:
        assert approx(e["ee"], (1 / 6 * 5 / 6 / e["n"]) ** 0.5) and approx(e["error"], abs(e["estimacion"] - 1 / 6))
        assert e["error"] < 4 * e["ee"]
    assert approx(est[0]["ee"] / est[2]["ee"], 10)
`,
    hints: [
      "`itertools.product(range(1, caras + 1), repeat=n)` genera todas las tuplas.",
      "prob_exacta: cuenta con `sum(1 for w in espacio if evento(w))` y divide con `Fraction(favorables, total)`.",
      "simular: crea `rng = random.Random(semilla)` **fuera** del bucle y llama a `generador(rng)` en cada repetición.",
    ],
    errors: [
      { error: "Dividir con / y obtener 0.1666…", fix: "Para resultados exactos usa `Fraction`; convierte a float solo para comparar con simulaciones." },
      { error: "Crear un generador nuevo con la misma semilla en cada repetición", fix: "Todas las repeticiones darían el mismo resultado: la frecuencia sería 0 o 1." },
    ],
    quiz: {
      question: "Con 100 tiradas obtienes una frecuencia de 0,21 para «sumar 7» (exacta 1/6 ≈ 0,167). ¿Es sospechoso?",
      options: [
        { text: "No: el error estándar con n = 100 es ≈ 0,037 y la diferencia es de unos 1,2 errores estándar" },
        { text: "Sí: los dados deben estar trucados porque 0,21 ≠ 0,167", misconception: "p-valor" },
        { text: "Sí: con 100 tiradas la frecuencia debería ser exactamente 1/6" },
        { text: "No se puede saber nada sin un millón de tiradas" },
      ],
      answer: 0,
      explanation: "√(0,167·0,833/100) ≈ 0,037. Una diferencia de 0,043 es perfectamente habitual. Juzgar una simulación (o unos datos) exige compararla con su variabilidad esperada.",
    },
    lab: { lab: "estadistica", tab: "monedas", label: "Monedas y dados" },
    project: SPEC,
    review: "Repasa: P = favorables/posibles con Fraction; simulación con semilla; EE = √(p(1 − p)/n).",
    xp: 110,
    coins: 16,
  },
  {
    id: "pp-casino-2",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El casino del Imperio · 2: paradojas del cumpleaños y de Monty Hall",
    kind: "project",
    difficulty: 3,
    skills: ["probabilidad", "probabilidad-condicional", "simulacion"],
    requires: ["pp-casino-1", "p-condicional"],
    series: { ...SERIES, stage: 2 },
    story: "Dos apuestas del casino desconciertan a los clientes: «en una sala con 23 personas, apuesto a que dos cumplen años el mismo día» y «elige una puerta; abro otra sin premio; ¿cambias?». La intuición falla; el cálculo y la simulación no.",
    objective: "Resolver las paradojas del cumpleaños y de Monty Hall de forma exacta (producto de probabilidades y enumeración ponderada) y validar ambas con simulación.",
    before: ["Etapa 1", "Probabilidad del complementario", "Probabilidad condicional"],
    intuition: [
      "**Cumpleaños**: es más fácil calcular el complementario, «todos distintos»: 365/365 · 364/365 · … El número de **parejas** crece como k(k − 1)/2: con 23 personas hay 253 parejas, y basta que una coincida. Con 23 la probabilidad ya supera el 50 %.",
      "",
      "**Monty Hall**: el presentador sabe dónde está el coche y nunca lo abre. Si al principio elegiste mal (2/3 de las veces), la puerta que queda es el coche. Por eso cambiar gana 2/3.",
      "",
      "La **enumeración ponderada** recorre todos los casos (coche, elección, puerta abierta) con su probabilidad: cuando el presentador puede elegir entre dos puertas, cada una pesa 1/2. Es la forma rigurosa de no dejarse engañar.",
    ],
    formal: "P(coincidencia) = 1 − Πᵢ₌₀^{k−1} (365 − i)/365 · Monty: P(ganar | cambiar) = P(elección inicial errónea) = 2/3",
    example: {
      code: py`p = 1.0
for i in range(23):
    p *= (365 - i) / 365
print(round(1 - p, 4))`,
      lines: ["Probabilidad de que todos sean distintos.", "Para cada persona nueva…", "…su fecha debe evitar las i anteriores.", "0.5073: con 23 personas, más probable que no haya coincidencia… al revés."],
    },
    challenge: [
      "Añade a tu código:",
      "1. `cumple_exacto(k, dias=365)` y `cumple_simulado(k, n, semilla=0, dias=365)` (frecuencia de grupos de k con alguna fecha repetida).",
      "2. `minimo_grupo(p=0.5)`: el menor k con probabilidad exacta de coincidencia ≥ p.",
      "3. `monty_enumerado()`: diccionario {\"quedarse\": Fraction, \"cambiar\": Fraction} enumerando coche, elección y puerta abierta con sus pesos.",
      "4. `monty_simulado(cambiar, n, semilla=0)`: proporción de victorias simuladas.",
    ],
    starter: py`def cumple_exacto(k, dias=365):
    return k / dias

def cumple_simulado(k, n, semilla=0, dias=365):
    return 0

def minimo_grupo(p=0.5):
    return 183

def monty_enumerado():
    return {"quedarse": Fraction(1, 2), "cambiar": Fraction(1, 2)}

def monty_simulado(cambiar, n, semilla=0):
    return 0.5`,
    solution: SOL2,
    tests: py`
from fractions import Fraction
import math

def test_cumple():
    "Fórmula exacta y simulación"
    ce = t.get("cumple_exacto", "function")
    assert approx(ce(23), 1 - math.perm(365, 23) / 365 ** 23, 1e-12)
    assert ce(1) == 0 and approx(ce(366), 1) and approx(ce(10, dias=12), 1 - math.perm(12, 10) / 12 ** 10)
    cs = t.get("cumple_simulado", "function")
    p, n = ce(30), 4000
    assert abs(cs(30, n, semilla=2) - p) < 4 * (p * (1 - p) / n) ** 0.5

def test_minimo():
    "23 personas para superar el 50 %"
    m = t.get("minimo_grupo", "function")
    assert m() == 23 and m(0.99) == 57

def test_monty():
    "Cambiar gana 2/3"
    e = t.get("monty_enumerado", "function")()
    assert e == {"quedarse": Fraction(1, 3), "cambiar": Fraction(2, 3)}
    ms = t.get("monty_simulado", "function")
    assert abs(ms(True, 6000, 1) - 2 / 3) < 4 * (2 / 9 / 6000) ** 0.5
    assert abs(ms(False, 6000, 1) - 1 / 3) < 4 * (2 / 9 / 6000) ** 0.5

def test_etapa_anterior():
    "La etapa 1 sigue funcionando"
    assert t.get("p7") == Fraction(1, 6)
`,
    hints: [
      "cumple_exacto: multiplica (dias − i)/dias para i = 0 … k − 1 y resta de 1.",
      "Simulación del cumpleaños: genera k fechas con `rng.randrange(dias)` y hay coincidencia si `len(set(fechas)) < k`.",
      "Monty enumerado: tres bucles (coche, elección, puerta abierta entre las que no son ni coche ni elección); el peso es 1/3 · 1/3 · 1/(número de puertas que puede abrir).",
    ],
    errors: [
      { error: "Pensar que tras abrir una puerta quedan dos opciones al 50 %", fix: "El presentador no abre al azar: su elección depende de dónde está el coche, y eso transmite información." },
      { error: "Dar el mismo peso a todos los casos de la enumeración", fix: "Cuando el presentador puede elegir entre dos puertas, cada opción tiene la mitad de probabilidad." },
    ],
    quiz: {
      question: "Si el presentador abriera una puerta **al azar** (pudiendo mostrar el coche) y por casualidad sale una cabra, ¿cuánto gana cambiar?",
      options: [
        { text: "1/2: sin el conocimiento del presentador, la puerta abierta no aporta la misma información" },
        { text: "2/3, igual que en el juego original" },
        { text: "1/3" },
        { text: "Depende de la puerta que eligió el concursante" },
      ],
      answer: 0,
      explanation: "Condicionando a que el presentador (al azar) mostró una cabra, las dos puertas cerradas quedan igual de probables. La paradoja original depende de que el presentador sabe y evita el coche: la información está en el proceso que genera los datos.",
    },
    project: SPEC,
    review: "Repasa: complementario para «al menos uno»; enumeración ponderada; el proceso que genera la información importa.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pp-casino-3",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El casino del Imperio · 3: la suma de los dados, convolución, LGN y TCL",
    kind: "project",
    difficulty: 3,
    skills: ["distribuciones", "variables-aleatorias", "teorema-central-limite"],
    requires: ["pp-casino-2", "p-variables-aleatorias"],
    series: { ...SERIES, stage: 3 },
    story: "El casino lanza un juego nuevo: se apuesta a la suma de 10 dados. Para fijar los premios necesita la distribución exacta de la suma… y saber si la campana de Gauss es una buena aproximación.",
    objective: "Obtener la distribución exacta de la suma de dados por convolución, su media y varianza, compararla con la aproximación normal (TCL) y con una simulación mediante la distancia de variación total.",
    before: ["Etapas 1 y 2", "Variables aleatorias discretas", "Teorema central del límite"],
    intuition: [
      "La distribución de la suma de dos variables independientes es la **convolución** de sus distribuciones: P(S = s) = Σ P(X = a)·P(Y = s − a). Repetirla da la suma de n dados de forma exacta sin enumerar 6ⁿ resultados.",
      "",
      "La **media** y la **varianza** de una suma de independientes se suman: un dado tiene media 3,5 y varianza 35/12.",
      "",
      "El **TCL** dice que la suma se parece a una normal con esa media y varianza. Como la suma es discreta, se usa la **corrección por continuidad**: P(a ≤ S ≤ b) ≈ Φ((b + 0,5 − μ)/σ) − Φ((a − 0,5 − μ)/σ).",
      "",
      "La **distancia de variación total** mide cuánto difieren dos distribuciones: ½ Σ |p(x) − q(x)|. Es la mayor diferencia posible en la probabilidad de cualquier evento.",
    ],
    formal: "P(S = s) = Σₐ P(X = a)·P(Y = s − a) · E[S] = n·(c + 1)/2 · Var[S] = n·(c² − 1)/12 · VT(p, q) = ½ Σₓ |p(x) − q(x)|",
    example: {
      code: py`dado = {c: 1 / 6 for c in range(1, 7)}
suma = {}
for a, pa in dado.items():
    for b, pb in dado.items():
        suma[a + b] = suma.get(a + b, 0) + pa * pb
print(round(suma[7], 4), round(sum(suma.values()), 6))`,
      lines: ["Distribución de un dado.", "Acumularemos la de la suma.", "Para cada valor del primer dado…", "…y del segundo…", "…sumamos la probabilidad conjunta a su total.", "P(7) = 0,1667 y las probabilidades suman 1."],
    },
    challenge: [
      "Añade a tu código:",
      "1. `convolucionar(p, q)`: distribución (diccionario valor → probabilidad) de la suma de dos variables independientes.",
      "2. `pmf_suma(n_dados, caras=6)`: distribución exacta de la suma (con `Fraction`).",
      "3. `media_varianza(pmf)`: tupla (media, varianza).",
      "4. `prob_intervalo(pmf, a, b)`: P(a ≤ S ≤ b).",
      "5. `aprox_normal(n_dados, a, b, caras=6)`: la misma probabilidad con la normal del TCL y corrección por continuidad (usa `math.erf`).",
      "6. `empirica(n_dados, n, semilla=0, caras=6)`: frecuencias simuladas de la suma, y `distancia_vt(p, q)`.",
    ],
    starter: py`def convolucionar(p, q):
    return p

def pmf_suma(n_dados, caras=6):
    return {}

def media_varianza(pmf):
    return 0, 0

def prob_intervalo(pmf, a, b):
    return 0

def aprox_normal(n_dados, a, b, caras=6):
    return 0

def empirica(n_dados, n, semilla=0, caras=6):
    return {}

def distancia_vt(p, q):
    return 0`,
    solution: SOL3,
    tests: py`
from fractions import Fraction
import itertools

def test_convolucion():
    "Convolución exacta"
    c = t.get("convolucionar", "function")
    r = c({0: Fraction(1, 2), 1: Fraction(1, 2)}, {0: Fraction(1, 2), 1: Fraction(1, 2)})
    assert r == {0: Fraction(1, 4), 1: Fraction(1, 2), 2: Fraction(1, 4)}

def test_pmf():
    "Coincide con la enumeración completa"
    pmf = t.get("pmf_suma", "function")(3)
    cuentas = {}
    for w in itertools.product(range(1, 7), repeat=3):
        cuentas[sum(w)] = cuentas.get(sum(w), 0) + 1
    assert pmf == {s: Fraction(c, 216) for s, c in cuentas.items()}
    assert sum(t.get("pmf_suma", "function")(10).values()) == 1

def test_momentos():
    "Media y varianza se suman"
    m, v = t.get("media_varianza", "function")(t.get("pmf_suma", "function")(10))
    assert m == 35 and v == Fraction(350, 12)

def test_tcl():
    "La normal aproxima bien con 10 dados"
    pmf = t.get("pmf_suma", "function")(10)
    exacta = float(t.get("prob_intervalo", "function")(pmf, 30, 40))
    aprox = t.get("aprox_normal", "function")(10, 30, 40)
    assert abs(exacta - aprox) < 0.005, (exacta, aprox)
    assert abs(float(t.get("prob_intervalo", "function")(t.get("pmf_suma", "function")(1), 1, 2)) - 1 / 3) < 1e-12

def test_simulacion():
    "La empírica converge a la exacta"
    emp = t.get("empirica", "function")
    vt = t.get("distancia_vt", "function")
    pmf = t.get("pmf_suma", "function")(3)
    d1, d2 = vt(pmf, emp(3, 500, 1)), vt(pmf, emp(3, 20000, 1))
    assert d2 < d1 and d2 < 0.03
    assert approx(vt({1: 0.5, 2: 0.5}, {2: 0.5, 3: 0.5}), 0.5) and vt(pmf, pmf) == 0
`,
    hints: [
      "convolucionar: dos bucles sobre los elementos de p y q; acumula `pa * qb` en la clave `a + b`.",
      "pmf_suma: empieza con {0: Fraction(1)} (suma de cero dados) y convoluciona n veces con el dado.",
      "aprox_normal: μ = n(c + 1)/2, σ = √(n(c² − 1)/12) y Φ(z) = ½(1 + erf(z/√2)).",
    ],
    errors: [
      { error: "Olvidar la corrección por continuidad", fix: "Una variable discreta pone su probabilidad en enteros: el intervalo continuo equivalente va de a − 0,5 a b + 0,5." },
      { error: "Sumar desviaciones típicas", fix: "Lo que se suma (para independientes) son las varianzas." },
    ],
    quiz: {
      question: "La suma de 10 dados se aproxima muy bien con una normal. ¿Y el producto de 10 dados?",
      options: [
        { text: "No: el TCL habla de sumas; el producto es muy asimétrico (su logaritmo sí es una suma y tiende a normal)" },
        { text: "Sí: el TCL garantiza la normalidad de cualquier combinación de variables", misconception: "normalidad-universal" },
        { text: "Sí, si se usa la corrección por continuidad" },
        { text: "Solo si los dados están trucados" },
      ],
      answer: 0,
      explanation: "El TCL se aplica a sumas (y medias) de variables independientes con varianza finita. Un producto de variables positivas es exp(Σ log Xᵢ): tiende a una lognormal, muy asimétrica.",
    },
    lab: { lab: "estadistica", tab: "tcl", label: "Teorema central del límite" },
    project: SPEC,
    review: "Repasa: convolución para sumas de independientes; las varianzas se suman; TCL con corrección por continuidad; distancia de variación total.",
    xp: 130,
    coins: 20,
  },
  {
    id: "pp-casino-4",
    world: "w4",
    zone: "Proyecto del Imperio",
    title: "El casino del Imperio · 4: el juego de la oca como cadena de Markov",
    kind: "project",
    difficulty: 4,
    skills: ["cadenas-markov", "algebra-lineal", "simulacion", "esperanza"],
    requires: ["pp-casino-3", "m-matrices"],
    series: { ...SERIES, stage: 4 },
    story: "La atracción estrella del casino es un tablero de 20 casillas con escaleras y serpientes. Los clientes preguntan cuánto dura una partida. Puedes simularlo… o calcularlo exactamente, porque el tablero no tiene memoria.",
    objective: "Construir la matriz de transición de un juego de tablero, propagar la distribución de la posición, calcular la duración esperada y validarla con simulación.",
    before: ["Etapas 1 a 3", "Matrices (m-matrices)", "Esperanza"],
    intuition: [
      "Una **cadena de Markov** es un sistema cuyo próximo estado depende solo del actual. En el tablero, el estado es la casilla; la **matriz de transición** P[i][j] es la probabilidad de pasar de i a j en un turno (tirada del dado + escaleras/serpientes).",
      "",
      "Si dist es la distribución de la posición ahora, la del turno siguiente es dist·P (cada casilla reparte su probabilidad según su fila). Repetirlo k veces da dónde estará el jugador tras k turnos.",
      "",
      "La casilla final es **absorbente** (P[final][final] = 1). La duración esperada es E[T] = Σₖ P(T > k): la suma de las probabilidades de seguir jugando tras cada turno.",
      "",
      "Regla del tablero: si la tirada se pasa de la casilla final, el jugador no se mueve.",
    ],
    formal: "distₖ₊₁ = distₖ · P · P(T ≤ k) = distₖ[final] · E[T] = Σₖ₌₀^∞ (1 − distₖ[final])",
    example: {
      code: py`P = [[0.5, 0.5, 0.0], [0.0, 0.5, 0.5], [0.0, 0.0, 1.0]]
dist = [1.0, 0.0, 0.0]
for k in range(3):
    dist = [sum(dist[i] * P[i][j] for i in range(3)) for j in range(3)]
    print(k + 1, [round(x, 3) for x in dist])`,
      lines: [
        "Tres estados: avanzar con probabilidad 1/2; el último es absorbente.",
        "Empezamos en el estado 0 con certeza.",
        "Tres turnos.",
        "Nueva distribución: cada estado j recibe lo que le envía cada i.",
        "La probabilidad se va acumulando en el estado absorbente.",
      ],
    },
    challenge: [
      "Añade a tu código (el tablero tiene `FINAL = 20` y `SALTOS = {3: 11, 6: 17, 9: 2, 14: 4, 19: 7}`; si una tirada se pasa de 20, no se mueve):",
      "1. `matriz_transicion(final=FINAL, saltos=SALTOS, caras=6)`: lista de listas (final + 1) × (final + 1) con filas que suman 1.",
      "2. `paso(dist, P)` y `distribucion_tras(P, k)` (empezando en la casilla 0).",
      "3. `duracion_esperada(P, tol=1e-12)`: E[T] = Σ P(T > k) hasta que la probabilidad de seguir sea menor que `tol`.",
      "4. `simular_partida(rng, …)`: número de turnos de una partida simulada, y `duracion_simulada(n, semilla=0)`: tupla (media, error estándar).",
      "5. `P`, `exacta`, `media_sim, ee_sim = duracion_simulada(5000, semilla=3)` e `informe` con `duracion_exacta`, `duracion_simulada`, `ee`, `compatible` (|diferencia| < 3·EE) y `prob_terminar_en_10`.",
    ],
    starter: py`SALTOS = {3: 11, 6: 17, 9: 2, 14: 4, 19: 7}
FINAL = 20

def matriz_transicion(final=FINAL, saltos=SALTOS, caras=6):
    return []

def paso(dist, P):
    return dist

def distribucion_tras(P, k):
    return []

def duracion_esperada(P, tol=1e-12, max_turnos=100000):
    return 0

def simular_partida(rng, final=FINAL, saltos=SALTOS, caras=6):
    return 0

def duracion_simulada(n, semilla=0):
    return 0, 0

P = matriz_transicion()
exacta = 0
media_sim, ee_sim = 0, 0
informe = {}`,
    solution: SOL4,
    tests: py`
import random

SALTOS = {3: 11, 6: 17, 9: 2, 14: 4, 19: 7}

def _ref_P():
    P = [[0.0] * 21 for _ in range(21)]
    P[20][20] = 1.0
    for i in range(20):
        for d in range(1, 7):
            j = i + d if i + d <= 20 else i
            P[i][SALTOS.get(j, j)] += 1 / 6
    return P

def _ref_esperanza():
    # Sistema lineal (I − Q) t = 1 resuelto por eliminación de Gauss: otro método independiente.
    P = _ref_P()
    n = 20
    A = [[(1.0 if i == j else 0.0) - P[i][j] for j in range(n)] + [1.0] for i in range(n)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(A[r][c]))
        A[c], A[piv] = A[piv], A[c]
        for r in range(n):
            if r != c:
                f = A[r][c] / A[c][c]
                A[r] = [a - f * b for a, b in zip(A[r], A[c])]
    return A[0][n] / A[0][0]

def test_matriz():
    "Matriz de transición"
    P = t.get("matriz_transicion", "function")()
    ref = _ref_P()
    assert len(P) == 21 and all(abs(sum(f) - 1) < 1e-12 for f in P)
    assert all(abs(P[i][j] - ref[i][j]) < 1e-12 for i in range(21) for j in range(21))

def test_distribucion():
    "Propagación de la distribución"
    P = t.get("P")
    d = t.get("distribucion_tras", "function")(P, 1)
    assert abs(d[11] - 1 / 6) < 1e-12 and abs(d[17] - 1 / 6) < 1e-12 and d[3] == 0 and d[6] == 0
    assert abs(sum(t.get("distribucion_tras", "function")(P, 25)) - 1) < 1e-9

def test_esperanza():
    "Coincide con resolver (I − Q)t = 1"
    assert abs(t.get("exacta") - _ref_esperanza()) < 1e-8, (t.get("exacta"), _ref_esperanza())
    assert abs(t.get("duracion_esperada", "function")([[0.5, 0.5], [0.0, 1.0]]) - 2) < 1e-9

def test_simulacion():
    "Simulación compatible con el valor exacto"
    turnos = t.get("simular_partida", "function")(random.Random(1))
    assert isinstance(turnos, int) and turnos >= 3
    inf = t.get("informe")
    assert inf["compatible"] is True and abs(inf["duracion_simulada"] - inf["duracion_exacta"]) < 3 * inf["ee"]
    assert abs(inf["prob_terminar_en_10"] - t.get("distribucion_tras", "function")(t.get("P"), 10)[-1]) < 1e-12
    assert 0 < inf["ee"] < 0.3
`,
    hints: [
      "Matriz: para cada casilla i < final y cada cara d, destino j = i + d (o i si se pasa) y después `saltos.get(j, j)`; suma 1/caras a P[i][j].",
      "paso: el elemento j de la nueva distribución es Σᵢ dist[i]·P[i][j].",
      "duracion_esperada: acumula (1 − dist[final]) en cada turno antes de dar el paso.",
    ],
    errors: [
      { error: "Aplicar el salto antes de comprobar si la tirada se pasa", fix: "Primero se mueve (o no) y después se aplica la escalera o serpiente de la casilla de llegada." },
      { error: "Estimar la duración con pocas partidas sin error estándar", fix: "La duración es muy variable: informa siempre la media con su EE." },
    ],
    quiz: {
      question: "¿Por qué el tablero puede modelarse como una cadena de Markov?",
      options: [
        { text: "Porque la probabilidad del siguiente movimiento depende solo de la casilla actual, no de cómo se llegó a ella" },
        { text: "Porque las tiradas siguen una distribución normal", misconception: "normalidad-universal" },
        { text: "Porque el juego siempre termina en el mismo número de turnos" },
        { text: "Porque todas las casillas tienen la misma probabilidad" },
      ],
      answer: 0,
      explanation: "La propiedad de Markov es la falta de memoria: el futuro depende del presente, no del pasado. Gracias a ella, toda la dinámica cabe en una matriz y se pueden calcular probabilidades y esperanzas exactas.",
    },
    project: SPEC,
    review: "Repasa: matriz de transición con filas que suman 1; dist·P; estados absorbentes; E[T] = Σ P(T > k); validar con simulación y EE.",
    xp: 150,
    coins: 23,
  },
];
