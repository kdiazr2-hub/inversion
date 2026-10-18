import { py, type Mission } from "../types";

// Mundo 4 · Zona 3 (probabilidad), Zona 4 (distribuciones) y Zona 5 (muestreo).

export const W4_B: Mission[] = [
  {
    id: "p-reglas",
    lab: { lab: "estadistica", tab: "monedas", label: "Monedas y dados" },
    world: "w4",
    zone: "Probabilidad",
    title: "Los dados del destino: espacio muestral y reglas",
    kind: "lesson",
    difficulty: 2,
    skills: ["probabilidad"],
    requires: ["e-cajas"],
    story: "En la taberna del imperio se apuesta con dos dados. Los jugadores intuyen probabilidades; tú las calcularás enumerando todos los resultados posibles.",
    objective: "Definir espacio muestral y eventos, y aplicar las reglas de complemento, suma y producto, comprobándolas por enumeración.",
    before: ["Conjuntos", "Comprensiones", "Fracciones"],
    intuition: [
      "- **Experimento aleatorio**: proceso con resultado incierto (lanzar dos dados).",
      "- **Espacio muestral** Ω: todos los resultados posibles (36 pares).",
      "- **Evento**: subconjunto de Ω («la suma es 7»).",
      "- Si todos los resultados son equiprobables: P(A) = |A| / |Ω|.",
      "",
      "Reglas:",
      "- **Complemento**: P(no A) = 1 − P(A).",
      "- **Suma**: P(A o B) = P(A) + P(B) − P(A y B) (no cuentes dos veces la intersección).",
      "- **Producto** (independientes): P(A y B) = P(A)·P(B).",
      "",
      "`itertools.product` genera el espacio muestral; `fractions.Fraction` da probabilidades exactas.",
    ],
    formal: "Axiomas de Kolmogórov: P(A) ≥ 0, P(Ω) = 1 y P(A ∪ B) = P(A) + P(B) si A ∩ B = ∅. Todo lo demás se deduce de ellos.",
    example: {
      code: py`from itertools import product
from fractions import Fraction
omega = list(product(range(1, 7), repeat=2))
siete = [r for r in omega if sum(r) == 7]
print(len(omega), Fraction(len(siete), len(omega)))`,
      lines: ["Producto cartesiano.", "Fracciones exactas.", "Los 36 pares (dado 1, dado 2).", "El evento «suman 7».", "36 1/6"],
    },
    challenge: [
      "Con el espacio de dos dados, escribe `prob(evento)` que reciba una función `evento(d1, d2) -> bool` y devuelva la probabilidad como `Fraction`. Úsala para definir:",
      "- `p_doble`: P(los dos dados iguales)",
      "- `p_al_menos_un_6`: P(al menos un 6), calculada **también** como `1 - P(ningún 6)` en `p_al_menos_un_6_comp` (deben coincidir)",
      "- `p_suma_par_o_mayor_9`: P(suma par **o** suma > 9)",
      "- `regla_suma_ok`: True si P(A ∪ B) = P(A) + P(B) − P(A ∩ B) para A = suma par y B = suma > 9",
    ],
    starter: py`from fractions import Fraction

def prob(evento):
    return Fraction(1, 2)

p_doble = 0
p_al_menos_un_6 = 0
p_al_menos_un_6_comp = 0
p_suma_par_o_mayor_9 = 0
regla_suma_ok = False`,
    solution: py`from fractions import Fraction
from itertools import product

OMEGA = list(product(range(1, 7), repeat=2))

def prob(evento):
    return Fraction(sum(1 for d1, d2 in OMEGA if evento(d1, d2)), len(OMEGA))

p_doble = prob(lambda a, b: a == b)
p_al_menos_un_6 = prob(lambda a, b: a == 6 or b == 6)
p_al_menos_un_6_comp = 1 - prob(lambda a, b: a != 6 and b != 6)
par = lambda a, b: (a + b) % 2 == 0
mayor9 = lambda a, b: a + b > 9
p_suma_par_o_mayor_9 = prob(lambda a, b: par(a, b) or mayor9(a, b))
regla_suma_ok = p_suma_par_o_mayor_9 == prob(par) + prob(mayor9) - prob(lambda a, b: par(a, b) and mayor9(a, b))
print(p_doble, p_al_menos_un_6, p_suma_par_o_mayor_9, regla_suma_ok)`,
    tests: py`
from fractions import Fraction

def test_prob():
    "prob devuelve fracciones exactas"
    p = t.get("prob", "function")
    assert p(lambda a, b: a + b == 7) == Fraction(1, 6) and p(lambda a, b: True) == 1

def test_valores():
    "Probabilidades pedidas"
    assert t.get("p_doble") == Fraction(1, 6)
    assert t.get("p_al_menos_un_6") == Fraction(11, 36) == t.get("p_al_menos_un_6_comp")
    assert t.get("p_suma_par_o_mayor_9") == Fraction(5, 9)
    assert t.get("regla_suma_ok") is True
`,
    hints: [
      "Genera Ω con `product(range(1, 7), repeat=2)` y cuenta cuántos pares cumplen el evento.",
      "Devuelve `Fraction(favorables, 36)`.",
      "Las funciones lambda permiten pasar eventos: `prob(lambda a, b: a == b)`.",
    ],
    errors: [
      { error: "Sumar P(A) + P(B) con eventos que se solapan", fix: "Resta la intersección o contarás dos veces los resultados comunes." },
      { error: "Suponer que todas las sumas son equiprobables", fix: "La suma 7 tiene 6 combinaciones; la suma 2, solo una." },
    ],
    quiz: {
      question: "¿Cuál es la probabilidad de obtener al menos una cara en 3 lanzamientos de una moneda justa?",
      options: [{ text: "7/8" }, { text: "3/8" }, { text: "1/2" }, { text: "3/2" }],
      answer: 0,
      explanation: "Complemento: P(ninguna cara) = (1/2)³ = 1/8, así que P(al menos una) = 1 − 1/8.",
    },
    review: "Repasa la regla del complemento y la de la suma con intersección.",
    xp: 60,
    coins: 9,
  },
  {
    id: "p-condicional",
    world: "w4",
    zone: "Probabilidad",
    title: "El registro del sanatorio: probabilidad condicional e independencia",
    kind: "lesson",
    difficulty: 3,
    skills: ["probabilidad", "condicional", "contingencia"],
    requires: ["p-reglas"],
    story: "El registro del sanatorio cruza hábitos y enfermedades. Para saber si un hábito se asocia con una enfermedad, hay que comparar probabilidades **dentro** de cada grupo.",
    objective: "Calcular probabilidades conjuntas, marginales y condicionales desde una tabla de contingencia y comprobar independencia.",
    before: ["Reglas de probabilidad", "Diccionarios"],
    intuition: [
      "- **P(A | B)** = P(A y B) / P(B): probabilidad de A **sabiendo** que ocurrió B. Restringe el universo a B.",
      "- En una tabla de contingencia: conjunta = celda / total; marginal = fila o columna / total; condicional = celda / total de su fila (o columna).",
      "- **Independencia**: P(A | B) = P(A), equivalente a P(A y B) = P(A)·P(B).",
      "",
      "Ojo: P(A | B) ≠ P(B | A). La probabilidad de que un fumador enferme no es la probabilidad de que un enfermo fume.",
    ],
    formal: "Regla del producto general: P(A ∩ B) = P(A | B)·P(B) = P(B | A)·P(A).",
    example: {
      code: py`tabla = {("fuma", "enfermo"): 30, ("fuma", "sano"): 70, ("no fuma", "enfermo"): 20, ("no fuma", "sano"): 380}
total = sum(tabla.values())
p_enf = (tabla[("fuma", "enfermo")] + tabla[("no fuma", "enfermo")]) / total
p_enf_dado_fuma = tabla[("fuma", "enfermo")] / (tabla[("fuma", "enfermo")] + tabla[("fuma", "sano")])
print(p_enf, p_enf_dado_fuma)`,
      lines: ["Tabla 2×2 de conteos (datos ficticios).", "500 personas.", "P(enfermo) = 50/500 = 0,1.", "P(enfermo | fuma) = 30/100.", "0.1 0.3: enfermar es más frecuente entre fumadores en estos datos."],
    },
    challenge: [
      "La tabla `conteos` (filas = exposición, columnas = resultado) está definida como diccionario de diccionarios. Escribe:",
      "1. `conjunta(t, fila, col)`, `marginal_fila(t, fila)`, `marginal_col(t, col)`.",
      "2. `condicional(t, col, dado_fila)` = P(col | fila).",
      "3. `independientes(t, tol=0.01)`: True si para todas las celdas |P(fila y col) − P(fila)·P(col)| < tol.",
      "4. `riesgo_relativo(t, expuesto, no_expuesto, evento)` = P(evento | expuesto) / P(evento | no expuesto).",
    ],
    starter: py`conteos = {
    "ejercicio": {"lesion": 18, "sin_lesion": 182},
    "sedentario": {"lesion": 42, "sin_lesion": 158},
}

def conjunta(t, fila, col):
    return t[fila][col]

def marginal_fila(t, fila):
    return 0.5

def marginal_col(t, col):
    return 0.5

def condicional(t, col, dado_fila):
    return conjunta(t, dado_fila, col)

def independientes(t, tol=0.01):
    return True

def riesgo_relativo(t, expuesto, no_expuesto, evento):
    return 1`,
    solution: py`conteos = {
    "ejercicio": {"lesion": 18, "sin_lesion": 182},
    "sedentario": {"lesion": 42, "sin_lesion": 158},
}

def _total(t):
    return sum(sum(f.values()) for f in t.values())

def conjunta(t, fila, col):
    return t[fila][col] / _total(t)

def marginal_fila(t, fila):
    return sum(t[fila].values()) / _total(t)

def marginal_col(t, col):
    return sum(f[col] for f in t.values()) / _total(t)

def condicional(t, col, dado_fila):
    return t[dado_fila][col] / sum(t[dado_fila].values())

def independientes(t, tol=0.01):
    return all(abs(conjunta(t, f, c) - marginal_fila(t, f) * marginal_col(t, c)) < tol for f in t for c in t[f])

def riesgo_relativo(t, expuesto, no_expuesto, evento):
    return condicional(t, evento, expuesto) / condicional(t, evento, no_expuesto)

print(condicional(conteos, "lesion", "sedentario"), riesgo_relativo(conteos, "sedentario", "ejercicio", "lesion"))`,
    tests: py`
def test_probs():
    "Conjunta, marginales y condicional"
    T = t.get("conteos")
    assert approx(t.get("conjunta", "function")(T, "ejercicio", "lesion"), 18 / 400)
    assert approx(t.get("marginal_fila", "function")(T, "sedentario"), 0.5)
    assert approx(t.get("marginal_col", "function")(T, "lesion"), 60 / 400)
    assert approx(t.get("condicional", "function")(T, "lesion", "sedentario"), 42 / 200)

def test_independencia():
    "Detecta dependencia e independencia"
    f = t.get("independientes", "function")
    assert f(t.get("conteos")) is False
    assert f({"a": {"x": 10, "y": 30}, "b": {"x": 20, "y": 60}}) is True

def test_rr():
    "Riesgo relativo"
    assert approx(t.get("riesgo_relativo", "function")(t.get("conteos"), "sedentario", "ejercicio", "lesion"), (42 / 200) / (18 / 200))
`,
    hints: [
      "El total es la suma de todas las celdas: `sum(sum(f.values()) for f in t.values())`.",
      "Condicional por fila: celda / suma de su fila.",
      "Independencia: compara cada conjunta con el producto de sus marginales.",
    ],
    errors: [
      { error: "Confundir P(A | B) con P(B | A)", fix: "Pregunta siempre: ¿qué grupo estoy tomando como universo? El condicionante va en el denominador." },
      { error: "Dividir la celda entre el total al calcular una condicional", fix: "Eso da la conjunta. La condicional divide entre el total del grupo condicionante." },
    ],
    quiz: {
      question: "El 90 % de los conductores accidentados llevaba cinturón. ¿Significa que el cinturón aumenta los accidentes?",
      options: [
        { text: "No: eso es P(cinturón | accidente). Habría que comparar P(accidente | cinturón) con P(accidente | sin cinturón), y casi todos llevan cinturón" },
        { text: "Sí, el 90 % es mucho", misconception: "base-rate" },
        { text: "Sí, porque la diferencia es estadísticamente significativa", misconception: "significacion-relevancia" },
        { text: "No se puede calcular nada con porcentajes" },
      ],
      answer: 0,
      explanation: "Si el 95 % de todos los conductores usa cinturón, que el 90 % de los accidentados lo use sugiere justo lo contrario. Hay que condicionar en el sentido correcto.",
    },
    review: "Repasa por qué P(A | B) y P(B | A) son distintas y cómo comprobar independencia.",
    xp: 70,
    coins: 10,
  },
  {
    id: "p-conteo",
    world: "w4",
    zone: "Probabilidad",
    title: "El tesoro de las combinaciones: principios de conteo",
    kind: "lesson",
    difficulty: 3,
    skills: ["conteo", "combinatoria"],
    requires: ["p-condicional"],
    story: "La cámara del tesoro tiene una cerradura de 4 runas distintas elegidas entre 10. ¿Cuántos intentos haría un ladrón? Contar bien es calcular probabilidades exactas.",
    objective: "Aplicar el principio multiplicativo, permutaciones y combinaciones (con y sin repetición) y resolver problemas clásicos como el del cumpleaños.",
    before: ["Reglas de probabilidad", "Funciones"],
    intuition: [
      "- **Principio multiplicativo**: si una elección tiene a opciones y otra b, juntas tienen a·b.",
      "- **Permutaciones** (importa el orden, sin repetición): P(n, k) = n! / (n − k)!",
      "- **Combinaciones** (no importa el orden): C(n, k) = n! / (k!(n − k)!)",
      "- Con repetición y orden: nᵏ.",
      "",
      "Pregunta clave: **¿importa el orden? ¿se puede repetir?**",
      "",
      "`math.perm`, `math.comb` y `math.factorial` hacen los cálculos.",
    ],
    formal: "Problema del cumpleaños: P(alguna coincidencia entre k personas) = 1 − Πᵢ₌₀^{k−1} (365 − i)/365.",
    example: {
      code: py`import math
print(math.perm(10, 4), math.comb(10, 4), 10 ** 4)
p = math.comb(5, 3) * math.comb(5, 2) / math.comb(10, 5)
print(round(p, 4))`,
      lines: ["Funciones de conteo.", "Códigos de 4 runas distintas ordenadas: 5040; grupos sin orden: 210; con repetición: 10000.", "Elegir 5 de 10 (5 rojas y 5 azules) y obtener exactamente 3 rojas.", "0.3968 (es una probabilidad hipergeométrica)."],
    },
    challenge: [
      "1. `cumpleanos(k)`: probabilidad de que al menos dos de k personas compartan cumpleaños (365 días equiprobables).",
      "2. `minimo_para(prob)`: menor k con `cumpleanos(k) >= prob`.",
      "3. `loteria(n, k, aciertos)`: probabilidad de acertar exactamente `aciertos` números al elegir k de n (el sorteo también extrae k).",
      "4. `anagramas(palabra)`: número de anagramas distintos (permutaciones con repetición: n! / Π(repeticiones!)).",
    ],
    starter: py`import math

def cumpleanos(k):
    return k / 365

def minimo_para(prob):
    return 0

def loteria(n, k, aciertos):
    return 1 / math.comb(n, k)

def anagramas(palabra):
    return math.factorial(len(palabra))`,
    solution: py`import math
from collections import Counter

def cumpleanos(k):
    p_distintos = 1.0
    for i in range(k):
        p_distintos *= (365 - i) / 365
    return 1 - p_distintos

def minimo_para(prob):
    k = 1
    while cumpleanos(k) < prob:
        k += 1
    return k

def loteria(n, k, aciertos):
    return math.comb(k, aciertos) * math.comb(n - k, k - aciertos) / math.comb(n, k)

def anagramas(palabra):
    total = math.factorial(len(palabra))
    for rep in Counter(palabra).values():
        total //= math.factorial(rep)
    return total`,
    tests: py`
from scipy import stats

def test_cumple():
    "Problema del cumpleaños"
    f = t.get("cumpleanos", "function")
    assert approx(f(23), 0.5072972343239857) and f(1) == 0 and approx(f(366), 1)
    assert t.get("minimo_para", "function")(0.5) == 23 and t.get("minimo_para")(0.99) == 57

def test_loteria():
    "Coincide con la hipergeométrica"
    f = t.get("loteria", "function")
    assert approx(f(49, 6, 6), 1 / 13983816)
    assert approx(f(49, 6, 3), stats.hypergeom.pmf(3, 49, 6, 6))

def test_anagramas():
    "Permutaciones con repetición"
    f = t.get("anagramas", "function")
    assert f("dado") == 12 and f("estadistica") == 2494800 and f("abc") == 6
`,
    hints: [
      "Cumpleaños: calcula la probabilidad de que **todos** sean distintos multiplicando (365 − i)/365 y usa el complemento.",
      "Lotería: elige `aciertos` de los k ganadores y el resto de los n − k no ganadores; divide entre C(n, k).",
      "Anagramas: n! dividido entre el factorial de las repeticiones de cada letra.",
    ],
    errors: [
      { error: "Usar permutaciones cuando el orden no importa", fix: "En un sorteo, {3, 7, 12} es la misma combinación en cualquier orden: usa combinaciones." },
      { error: "Desbordamiento con factoriales enormes", fix: "math.comb trabaja con enteros grandes sin problema; evita convertir a float antes de tiempo." },
    ],
    quiz: {
      question: "¿Cuántos comités distintos de 3 personas se pueden formar con 8 candidatas?",
      options: [{ text: "56" }, { text: "336" }, { text: "512" }, { text: "24" }],
      answer: 0,
      explanation: "No importa el orden: C(8, 3) = 56. 336 serían cargos distintos (presidenta, secretaria, tesorera).",
    },
    review: "Repasa las dos preguntas del conteo: ¿importa el orden? ¿hay repetición?",
    xp: 65,
    coins: 10,
  },
  {
    id: "p-bayes",
    lab: { lab: "estadistica", tab: "diagnostico", label: "Pruebas diagnósticas" },
    world: "w4",
    zone: "Probabilidad",
    title: "El oráculo de Bayes: probabilidad total y actualización",
    kind: "lesson",
    difficulty: 3,
    skills: ["bayes", "diagnostico"],
    requires: ["p-conteo"],
    story: "Una prueba mágica detecta la maldición del dragón en el 99 % de los malditos y da falsa alarma solo en el 2 % de los sanos. Un aldeano da positivo. ¿Está maldito? El oráculo responde: «depende de cuántos malditos haya».",
    objective: "Aplicar el teorema de la probabilidad total y el de Bayes, interpretando la importancia de la probabilidad previa (prevalencia).",
    before: ["Probabilidad condicional"],
    intuition: [
      "**Teorema de Bayes**: invierte una condicional.",
      "",
      "P(M | +) = P(+ | M)·P(M) / P(+)",
      "",
      "con P(+) por **probabilidad total**: P(+) = P(+ | M)·P(M) + P(+ | no M)·P(no M).",
      "",
      "Con prevalencia 1 en 1000, sensibilidad 99 % y falsos positivos 2 %, de 100 000 personas: 99 malditos dan positivo y ~1998 sanos también. P(M | +) ≈ 99 / 2097 ≈ 4,7 %.",
      "",
      "Las **frecuencias naturales** (contar personas) hacen el razonamiento mucho más intuitivo que las fórmulas.",
    ],
    formal: "Forma de odds: odds posteriores = odds previas × razón de verosimilitud, con RV+ = sensibilidad / (1 − especificidad).",
    example: {
      code: py`prev, sens, fp = 0.001, 0.99, 0.02
p_pos = sens * prev + fp * (1 - prev)
print(round(sens * prev / p_pos, 4))
n = 100_000
print(round(n * prev * sens), round(n * (1 - prev) * fp))`,
      lines: ["Prevalencia, sensibilidad y tasa de falsos positivos.", "Probabilidad total de dar positivo.", "P(maldito | +) ≈ 0,0472.", "Imaginemos 100 000 personas…", "…99 verdaderos positivos frente a 1998 falsos positivos."],
    },
    challenge: [
      "1. `posterior(previa, sens, espec)`: P(enfermo | positivo).",
      "2. `posterior_negativo(previa, sens, espec)`: P(enfermo | negativo).",
      "3. `actualizar_varias(previa, sens, espec, resultados)`: aplica Bayes secuencialmente a una lista de resultados `\"+\"`/`\"-\"` (suponiendo pruebas condicionalmente independientes); la posterior de cada paso es la previa del siguiente. Devuelve la lista de posteriores.",
      "4. `frecuencias_naturales(previa, sens, espec, n=10000)`: diccionario con `vp`, `fp`, `fn`, `vn` (enteros redondeados).",
    ],
    starter: py`def posterior(previa, sens, espec):
    return sens

def posterior_negativo(previa, sens, espec):
    return 1 - espec

def actualizar_varias(previa, sens, espec, resultados):
    return [previa for _ in resultados]

def frecuencias_naturales(previa, sens, espec, n=10000):
    return {}`,
    solution: py`def posterior(previa, sens, espec):
    p_pos = sens * previa + (1 - espec) * (1 - previa)
    return sens * previa / p_pos

def posterior_negativo(previa, sens, espec):
    p_neg = (1 - sens) * previa + espec * (1 - previa)
    return (1 - sens) * previa / p_neg

def actualizar_varias(previa, sens, espec, resultados):
    salida = []
    p = previa
    for r in resultados:
        p = posterior(p, sens, espec) if r == "+" else posterior_negativo(p, sens, espec)
        salida.append(p)
    return salida

def frecuencias_naturales(previa, sens, espec, n=10000):
    enfermos = n * previa
    sanos = n - enfermos
    return {"vp": round(enfermos * sens), "fn": round(enfermos * (1 - sens)), "fp": round(sanos * (1 - espec)), "vn": round(sanos * espec)}`,
    tests: py`
def test_posterior():
    "Bayes con positivo y negativo"
    assert approx(t.get("posterior", "function")(0.001, 0.99, 0.98), 0.0472103, 1e-5)
    assert approx(t.get("posterior")(0.5, 0.9, 0.9), 0.9)
    assert approx(t.get("posterior_negativo", "function")(0.2, 0.9, 0.8), 0.02 / (0.02 + 0.64))

def test_secuencial():
    "Actualización secuencial"
    r = t.get("actualizar_varias", "function")(0.01, 0.9, 0.95, ["+", "+", "-"])
    p1 = 0.009 / (0.009 + 0.0495)
    assert len(r) == 3 and approx(r[0], p1, 1e-9) and r[1] > r[0] and r[2] < r[1]

def test_frecuencias():
    "Frecuencias naturales suman n"
    f = t.get("frecuencias_naturales", "function")(0.01, 0.9, 0.95)
    assert f == {"vp": 90, "fn": 10, "fp": 495, "vn": 9405}, f
`,
    hints: [
      "Denominador: probabilidad total de un positivo = sens·previa + (1 − espec)·(1 − previa).",
      "Para un negativo usa (1 − sens) en el numerador y la probabilidad total de un negativo abajo.",
      "En la secuencia, reasigna `p = posterior(p, ...)` en cada paso.",
    ],
    errors: [
      { error: "Responder la sensibilidad como si fuera P(enfermo | +)", fix: "La sensibilidad es P(+ | enfermo). Para invertirla necesitas la prevalencia." },
      { error: "Aplicar dos veces la misma prueba como si fueran independientes", fix: "Si los errores de la prueba se repiten en la misma persona, la independencia condicional no se cumple." },
    ],
    quiz: {
      question: "Una prueba tiene 99 % de sensibilidad y 99 % de especificidad. La enfermedad afecta a 1 de cada 10 000 personas. Si das positivo, ¿cuál es aproximadamente la probabilidad de estar enfermo?",
      options: [
        { text: "Alrededor del 1 %" },
        { text: "99 %", misconception: "base-rate" },
        { text: "50 %" },
        { text: "No se puede calcular" },
      ],
      answer: 0,
      explanation: "En 1 000 000 de personas: 99 verdaderos positivos y 9 999 falsos positivos. 99 / 10 098 ≈ 1 %.",
    },
    advanced: {
      title: "¿Cuántas pruebas positivas hacen falta?",
      prompt: "Escribe `pruebas_necesarias(previa, sens, espec, umbral)`: número mínimo de positivos consecutivos (pruebas independientes) para que la posterior supere el umbral.",
      starter: py`def pruebas_necesarias(previa, sens, espec, umbral):
    return 1`,
      solution: py`def pruebas_necesarias(previa, sens, espec, umbral):
    p, n = previa, 0
    while p <= umbral:
        p = sens * p / (sens * p + (1 - espec) * (1 - p))
        n += 1
    return n`,
      tests: py`
def test_pn():
    "Número de positivos"
    f = t.get("pruebas_necesarias", "function")
    assert f(0.001, 0.99, 0.98, 0.95) == 3 and f(0.5, 0.9, 0.9, 0.8) == 1
`,
    },
    review: "Repasa por qué la prevalencia determina el valor predictivo de una prueba.",
    xp: 75,
    coins: 11,
  },
  {
    id: "p-variables-aleatorias",
    world: "w4",
    zone: "Probabilidad",
    title: "La ruleta del alquimista: variables aleatorias, esperanza y varianza",
    kind: "lesson",
    difficulty: 3,
    skills: ["variables-aleatorias", "esperanza"],
    requires: ["p-bayes"],
    story: "El alquimista ofrece un juego: pagas 5 monedas y ganas según una ruleta. ¿Conviene jugar? La esperanza matemática responde qué pasa a la larga; la varianza, cuánto riesgo corres.",
    objective: "Trabajar con variables aleatorias discretas: función de masa, función de distribución acumulada, esperanza, varianza, covarianza y correlación.",
    before: ["Probabilidad", "Sumatorias"],
    packages: ["numpy"],
    intuition: [
      "Una **variable aleatoria** asigna un número a cada resultado (la ganancia en una apuesta).",
      "",
      "- **Función de masa** p(x) = P(X = x) (discretas). En continuas, la **densidad** f(x): las probabilidades son áreas.",
      "- **Función de distribución acumulada** F(x) = P(X ≤ x).",
      "- **Esperanza** E[X] = Σ x·p(x): el promedio a largo plazo.",
      "- **Varianza** Var(X) = E[(X − μ)²] = E[X²] − μ².",
      "- **Covarianza** Cov(X, Y) = E[(X − μX)(Y − μY)]; la **correlación** la normaliza: Cov / (σX σY).",
      "",
      "Propiedades útiles: E[aX + b] = aE[X] + b; Var(aX + b) = a²Var(X); E[X + Y] = E[X] + E[Y] siempre; Var(X + Y) = Var(X) + Var(Y) solo si no están correlacionadas.",
    ],
    formal: "Var(X + Y) = Var(X) + Var(Y) + 2·Cov(X, Y).",
    example: {
      code: py`valores = [0, 5, 20]
probs = [0.6, 0.3, 0.1]
E = sum(x * p for x, p in zip(valores, probs))
V = sum((x - E) ** 2 * p for x, p in zip(valores, probs))
print(E, round(V, 2), E - 5)`,
      lines: ["Premios posibles.", "Sus probabilidades (suman 1).", "Esperanza: 0 + 1,5 + 2 = 3,5.", "Varianza.", "Con 5 de entrada, la ganancia esperada es −1,5 por partida."],
    },
    challenge: [
      "Representa una variable discreta como diccionario valor → probabilidad.",
      "1. `validar(dist)`: lanza `ValueError` si alguna probabilidad es negativa o no suman 1 (tolerancia 1e-9).",
      "2. `esperanza(dist)`, `varianza(dist)` y `acumulada(dist, x)` = P(X ≤ x).",
      "3. `transformar(dist, a, b)`: distribución de aX + b.",
      "4. `cov_conjunta(conj)`: covarianza a partir de una distribución conjunta `{(x, y): p}`.",
      "5. `simular(dist, n, semilla)`: media de n extracciones con `numpy.random.default_rng(semilla).choice`.",
    ],
    starter: py`def validar(dist):
    pass

def esperanza(dist):
    return sum(dist) / len(dist)

def varianza(dist):
    return 0

def acumulada(dist, x):
    return 0

def transformar(dist, a, b):
    return dist

def cov_conjunta(conj):
    return 0

def simular(dist, n, semilla):
    return 0`,
    solution: py`import numpy as np

def validar(dist):
    if any(p < 0 for p in dist.values()) or abs(sum(dist.values()) - 1) > 1e-9:
        raise ValueError("No es una distribución de probabilidad válida")

def esperanza(dist):
    validar(dist)
    return sum(x * p for x, p in dist.items())

def varianza(dist):
    mu = esperanza(dist)
    return sum((x - mu) ** 2 * p for x, p in dist.items())

def acumulada(dist, x):
    return sum(p for v, p in dist.items() if v <= x)

def transformar(dist, a, b):
    nueva = {}
    for x, p in dist.items():
        nueva[a * x + b] = nueva.get(a * x + b, 0) + p
    return nueva

def cov_conjunta(conj):
    ex = sum(x * p for (x, y), p in conj.items())
    ey = sum(y * p for (x, y), p in conj.items())
    return sum((x - ex) * (y - ey) * p for (x, y), p in conj.items())

def simular(dist, n, semilla):
    rng = np.random.default_rng(semilla)
    valores = list(dist)
    return float(rng.choice(valores, size=n, p=[dist[v] for v in valores]).mean())`,
    tests: py`
D = {0: 0.6, 5: 0.3, 20: 0.1}

def test_validar():
    "Detecta distribuciones inválidas"
    v = t.get("validar", "function")
    v(D)
    for mala in ({1: 0.5, 2: 0.6}, {1: -0.1, 2: 1.1}):
        try:
            v(mala)
        except ValueError:
            continue
        assert False, f"{mala} no es válida"

def test_momentos():
    "Esperanza, varianza y acumulada"
    assert approx(t.get("esperanza", "function")(D), 3.5) and approx(t.get("varianza", "function")(D), 0.6 * 12.25 + 0.3 * 2.25 + 0.1 * 272.25)
    assert approx(t.get("acumulada", "function")(D, 5), 0.9) and t.get("acumulada")(D, -1) == 0

def test_transformar():
    "Propiedades de aX + b"
    T = t.get("transformar", "function")(D, 2, -5)
    E, V = t.get("esperanza"), t.get("varianza")
    assert approx(E(T), 2 * E(D) - 5) and approx(V(T), 4 * V(D))

def test_cov():
    "Covarianza conjunta"
    conj = {(0, 0): 0.4, (1, 1): 0.4, (0, 1): 0.1, (1, 0): 0.1}
    assert approx(t.get("cov_conjunta", "function")(conj), 0.15)
    indep = {(x, y): px * py for x, px in {0: 0.3, 1: 0.7}.items() for y, py in {0: 0.5, 2: 0.5}.items()}
    assert approx(t.get("cov_conjunta")(indep), 0)

def test_simular():
    "La media simulada se acerca a la esperanza (LGN)"
    m = t.get("simular", "function")(D, 200000, 1)
    assert abs(m - 3.5) < 0.05
`,
    hints: [
      "Recorre `dist.items()` para obtener pares (valor, probabilidad).",
      "Al transformar, valores distintos pueden coincidir tras aX + b si a = 0: acumula probabilidades.",
      "`rng.choice(valores, size=n, p=probabilidades)` extrae con las probabilidades dadas.",
    ],
    errors: [
      { error: "Calcular la media de los valores posibles sin ponderar", fix: "La esperanza pondera cada valor por su probabilidad." },
      { error: "Sumar varianzas de variables correlacionadas", fix: "Var(X + Y) incluye 2·Cov(X, Y)." },
    ],
    quiz: {
      question: "Un juego tiene esperanza de ganancia positiva. ¿Garantiza que ganarás en una sola partida?",
      options: [
        { text: "No: la esperanza describe el promedio a largo plazo; una partida puede salir muy distinta" },
        { text: "Sí, siempre se gana la esperanza" },
        { text: "Sí, si la varianza es positiva" },
        { text: "Solo si juegas exactamente una vez" },
      ],
      answer: 0,
      explanation: "La ley de los grandes números habla de promedios de muchas repeticiones. La varianza mide cuánto puede desviarse cada resultado.",
    },
    review: "Repasa esperanza y varianza como promedios ponderados y la ley de la varianza de una suma.",
    xp: 75,
    coins: 11,
  },
  {
    id: "p-lgn-tcl",
    lab: { lab: "estadistica", tab: "tcl", label: "Teorema central del límite" },
    world: "w4",
    zone: "Probabilidad",
    title: "Las mil tiradas: ley de los grandes números y teorema central del límite",
    kind: "lesson",
    difficulty: 3,
    skills: ["simulacion", "tcl", "lgn"],
    requires: ["p-variables-aleatorias"],
    story: "Un jugador lanza un dado mil veces y el oráculo predice la media con una precisión asombrosa… aunque no sepa nada de cada tirada individual.",
    objective: "Comprobar por simulación la ley de los grandes números y el teorema central del límite, y comparar resultados teóricos con observados.",
    before: ["Variables aleatorias", "NumPy"],
    packages: ["numpy"],
    intuition: [
      "- **Ley de los grandes números (LGN)**: la media de n observaciones independientes converge a la esperanza cuando n crece. No dice nada de una tirada concreta, ni que «toque» compensar rachas.",
      "- **Teorema central del límite (TCL)**: la distribución de la media de n observaciones independientes con varianza finita se aproxima a una normal con media μ y desviación σ/√n, **sea cual sea** la forma de la población, si n es suficientemente grande.",
      "",
      "Lo que se vuelve normal es la **media muestral**, no los datos. Con poblaciones muy asimétricas hace falta un n mayor. Puedes verlo en el Laboratorio estadístico → «Teorema central del límite».",
    ],
    formal: "Si X₁…Xₙ son iid con media μ y varianza σ² < ∞: √n(X̄ₙ − μ)/σ → N(0, 1) en distribución.",
    example: {
      code: py`import numpy as np
rng = np.random.default_rng(42)
tiradas = rng.integers(1, 7, size=100_000)
for n in (10, 100, 10_000, 100_000):
    print(n, round(tiradas[:n].mean(), 4))`,
      lines: ["NumPy.", "Semilla para reproducir.", "Cien mil tiradas de un dado justo (E = 3,5).", "Medias acumuladas para distintos n…", "…se acercan a 3,5 al crecer n."],
    },
    challenge: [
      "Con `rng = np.random.default_rng(semilla)`:",
      "1. `medias_muestrales(n, repeticiones, semilla)`: array con la media de `repeticiones` muestras de tamaño n de una **exponencial con media 2** (`rng.exponential(2, size=(repeticiones, n))`).",
      "2. `comparar_tcl(n, repeticiones, semilla)`: diccionario con `media_obs`, `de_obs` (DE de las medias, ddof=1), `de_teorica` = 2/√n y `prop_1_96` = proporción de medias dentro de μ ± 1,96·σ/√n.",
      "3. `asimetria_medias(n, repeticiones, semilla)`: asimetría (`scipy.stats.skew`) de las medias. Debe disminuir al aumentar n.",
    ],
    starter: py`import numpy as np

def medias_muestrales(n, repeticiones, semilla):
    rng = np.random.default_rng(semilla)
    return rng.exponential(2, size=repeticiones)

def comparar_tcl(n, repeticiones, semilla):
    return {}

def asimetria_medias(n, repeticiones, semilla):
    return 0`,
    solution: py`import numpy as np
from scipy import stats

def medias_muestrales(n, repeticiones, semilla):
    rng = np.random.default_rng(semilla)
    return rng.exponential(2, size=(repeticiones, n)).mean(axis=1)

def comparar_tcl(n, repeticiones, semilla):
    m = medias_muestrales(n, repeticiones, semilla)
    se = 2 / np.sqrt(n)
    return {
        "media_obs": float(m.mean()),
        "de_obs": float(m.std(ddof=1)),
        "de_teorica": float(se),
        "prop_1_96": float(np.mean(np.abs(m - 2) <= 1.96 * se)),
    }

def asimetria_medias(n, repeticiones, semilla):
    return float(stats.skew(medias_muestrales(n, repeticiones, semilla)))

print(comparar_tcl(50, 20000, 1))`,
    tests: py`
import numpy as np

def test_medias():
    "Forma y media de las medias"
    m = t.get("medias_muestrales", "function")(30, 5000, 2)
    assert np.shape(m) == (5000,) and abs(np.mean(m) - 2) < 0.03

def test_tcl():
    "La DE de las medias ≈ σ/√n y ~95 % dentro de ±1,96 EE con n grande"
    r = t.get("comparar_tcl", "function")(100, 20000, 3)
    assert abs(r["de_obs"] - r["de_teorica"]) / r["de_teorica"] < 0.03
    assert abs(r["prop_1_96"] - 0.95) < 0.01

def test_asimetria():
    "La asimetría de las medias disminuye con n"
    f = t.get("asimetria_medias", "function")
    a2, a50 = f(2, 20000, 4), f(50, 20000, 4)
    assert a2 > 1 and a50 < 0.5 and a50 < a2
`,
    hints: [
      "Genera una matriz (repeticiones × n) y promedia por filas: `.mean(axis=1)`.",
      "La exponencial con media 2 tiene σ = 2, así que el EE teórico es 2/√n.",
      "`np.mean(np.abs(m - 2) <= 1.96 * se)` calcula la proporción dentro del intervalo.",
    ],
    errors: [
      { error: "Pensar que los datos se vuelven normales con n grande", fix: "La población sigue siendo exponencial. Lo que se aproxima a la normal es la distribución de la media." },
      { error: "Falacia del jugador: «tras muchas caras, toca cruz»", fix: "La LGN no compensa rachas: diluye su efecto al promediar con muchas tiradas nuevas." },
    ],
    quiz: {
      question: "Has visto 8 caras seguidas con una moneda justa. ¿Probabilidad de cara en la siguiente?",
      options: [{ text: "1/2" }, { text: "Menos de 1/2: toca compensar" }, { text: "Más de 1/2: hay racha" }, { text: "1/256" }],
      answer: 0,
      explanation: "Los lanzamientos son independientes. La LGN no implica compensación a corto plazo.",
    },
    review: "Repasa qué se vuelve normal según el TCL y qué no promete la LGN.",
    xp: 75,
    coins: 11,
  },
  {
    id: "d-discretas",
    lab: { lab: "estadistica", tab: "distribuciones", label: "Distribuciones" },
    world: "w4",
    zone: "Distribuciones",
    title: "Los gremios de los conteos: Bernoulli, binomial, geométrica, Poisson e hipergeométrica",
    kind: "lesson",
    difficulty: 3,
    skills: ["distribuciones", "binomial", "poisson"],
    requires: ["p-lgn-tcl"],
    story: "Cinco gremios cuentan cosas distintas: éxitos en ensayos, intentos hasta acertar, llegadas por hora, piezas defectuosas en un lote… Cada uno tiene su distribución, y confundirlas lleva a errores.",
    objective: "Calcular probabilidades con las distribuciones discretas principales (a mano y con `scipy.stats`) y elegir la adecuada para cada situación.",
    before: ["Conteo", "Variables aleatorias"],
    packages: ["scipy"],
    intuition: [
      "- **Bernoulli(p)**: un ensayo éxito/fracaso. Media p, varianza p(1 − p).",
      "- **Binomial(n, p)**: nº de éxitos en n ensayos **independientes** con la misma p. Media np, varianza np(1 − p).",
      "- **Geométrica(p)**: nº de ensayos hasta el primer éxito. Media 1/p.",
      "- **Poisson(λ)**: conteo de eventos en un intervalo con tasa constante e independientes. Media = varianza = λ. Aproxima la binomial con n grande y p pequeña (λ = np).",
      "- **Hipergeométrica(N, K, n)**: éxitos al extraer n **sin reemplazo** de N con K éxitos. Si n es pequeño frente a N, se parece a la binomial.",
      "",
      "En SciPy: `stats.binom.pmf(k, n, p)`, `.cdf`, `.sf` (= 1 − cdf), `.mean()`, `.var()`.",
      "",
      "Puedes ver y comparar todas en el Laboratorio estadístico → «Distribuciones».",
    ],
    formal: "Binomial: P(X = k) = C(n,k)pᵏ(1−p)ⁿ⁻ᵏ. Poisson: P(X = k) = e^(−λ)λᵏ/k!. Geométrica: P(X = k) = (1−p)^(k−1)p.",
    example: {
      code: py`from scipy import stats
print(round(stats.binom.pmf(3, 10, 0.2), 4))
print(round(stats.binom.sf(5, 10, 0.2), 5))
print(round(stats.poisson.pmf(0, 2.5), 4), stats.poisson(2.5).mean())`,
      lines: ["Distribuciones de SciPy.", "P(exactamente 3 éxitos en 10 con p = 0,2) = 0,2013.", "P(más de 5) = sf(5) = 1 − F(5) = 0,00637.", "P(0 llegadas con λ = 2,5) = 0,0821; media 2,5."],
    },
    challenge: [
      "1. `binom_pmf(k, n, p)` y `poisson_pmf(k, lam)` **a mano** (con `math.comb`, `math.exp`, `math.factorial`).",
      "2. `binom_al_menos(k, n, p)`: P(X ≥ k) usando tu pmf.",
      "3. `aproximacion_poisson(n, p, kmax)`: máxima diferencia absoluta entre la binomial y la Poisson(np) para k = 0…kmax.",
      "4. `elegir_distribucion(caso)`: devuelve `\"binomial\"`, `\"poisson\"`, `\"geometrica\"` o `\"hipergeometrica\"` para estos códigos de caso:",
      "   - `\"exitos_n_ensayos\"`, `\"eventos_por_intervalo\"`, `\"ensayos_hasta_exito\"`, `\"sin_reemplazo_lote\"`.",
    ],
    starter: py`import math

def binom_pmf(k, n, p):
    return p ** k

def poisson_pmf(k, lam):
    return lam / (k + 1)

def binom_al_menos(k, n, p):
    return 1 - binom_pmf(k, n, p)

def aproximacion_poisson(n, p, kmax):
    return 0

def elegir_distribucion(caso):
    return "binomial"`,
    solution: py`import math

def binom_pmf(k, n, p):
    if k < 0 or k > n:
        return 0.0
    return math.comb(n, k) * p ** k * (1 - p) ** (n - k)

def poisson_pmf(k, lam):
    return math.exp(-lam) * lam ** k / math.factorial(k)

def binom_al_menos(k, n, p):
    return sum(binom_pmf(i, n, p) for i in range(k, n + 1))

def aproximacion_poisson(n, p, kmax):
    lam = n * p
    return max(abs(binom_pmf(k, n, p) - poisson_pmf(k, lam)) for k in range(kmax + 1))

def elegir_distribucion(caso):
    return {
        "exitos_n_ensayos": "binomial",
        "eventos_por_intervalo": "poisson",
        "ensayos_hasta_exito": "geometrica",
        "sin_reemplazo_lote": "hipergeometrica",
    }[caso]`,
    tests: py`
from scipy import stats

def test_pmfs():
    "PMF a mano igual que SciPy"
    b, p = t.get("binom_pmf", "function"), t.get("poisson_pmf", "function")
    for k in range(0, 11):
        assert approx(b(k, 10, 0.3), stats.binom.pmf(k, 10, 0.3), 1e-10)
        assert approx(p(k, 3.2), stats.poisson.pmf(k, 3.2), 1e-10)
    assert b(11, 10, 0.3) == 0

def test_al_menos():
    "P(X ≥ k)"
    assert approx(t.get("binom_al_menos", "function")(7, 20, 0.25), stats.binom.sf(6, 20, 0.25), 1e-10)

def test_aproximacion():
    "La Poisson aproxima mejor con n grande y p pequeña"
    f = t.get("aproximacion_poisson", "function")
    assert f(1000, 0.003, 15) < 0.001 < f(10, 0.3, 10)

def test_elegir():
    "Elige la distribución adecuada"
    f = t.get("elegir_distribucion", "function")
    assert [f(c) for c in ("exitos_n_ensayos", "eventos_por_intervalo", "ensayos_hasta_exito", "sin_reemplazo_lote")] == ["binomial", "poisson", "geometrica", "hipergeometrica"]
`,
    hints: [
      "Binomial: `math.comb(n, k) * p**k * (1 - p)**(n - k)`.",
      "Poisson: `math.exp(-lam) * lam**k / math.factorial(k)`.",
      "P(X ≥ k) es la suma de la pmf desde k hasta n.",
    ],
    errors: [
      { error: "Usar binomial con extracciones sin reemplazo de un lote pequeño", fix: "Si la probabilidad cambia tras cada extracción, corresponde la hipergeométrica." },
      { error: "Confundir sf(k) con P(X ≥ k)", fix: "En discretas, sf(k) = P(X > k). P(X ≥ k) = sf(k − 1)." },
    ],
    quiz: {
      question: "Un hospital recibe de media 3,2 ingresos por hora. ¿Qué distribución modela el número de ingresos en una hora?",
      options: [
        { text: "Poisson con λ = 3,2, si los ingresos son independientes y la tasa constante" },
        { text: "Normal con media 3,2", misconception: "normalidad-universal" },
        { text: "Binomial con n = 3,2" },
        { text: "Uniforme entre 0 y 6,4" },
      ],
      answer: 0,
      explanation: "Es un conteo de eventos en un intervalo. Si hay picos (horas punta) o dependencia, puede haber sobredispersión y convendría un modelo más flexible.",
    },
    review: "Repasa qué cuenta cada distribución discreta y sus supuestos.",
    xp: 80,
    coins: 12,
  },
  {
    id: "d-normal",
    lab: { lab: "estadistica", tab: "distribuciones", label: "Distribuciones" },
    world: "w4",
    zone: "Distribuciones",
    title: "La campana del observatorio: la distribución normal",
    kind: "lesson",
    difficulty: 3,
    skills: ["distribuciones", "normal"],
    requires: ["d-discretas"],
    story: "La campana del observatorio suena con una forma perfecta. Muchas mediciones se parecen a ella… pero no todas, y saber cuándo usarla es parte del oficio.",
    objective: "Calcular probabilidades y cuantiles con la normal, estandarizar, aplicar la regla 68-95-99,7 y evaluar si unos datos son aproximadamente normales.",
    before: ["Puntuaciones z", "Variables aleatorias continuas"],
    packages: ["scipy", "numpy"],
    intuition: [
      "La **normal** N(μ, σ) es simétrica, unimodal y queda definida por su media y su desviación.",
      "",
      "- Estandarizar: Z = (X − μ)/σ ~ N(0, 1).",
      "- Regla empírica: ≈68 % a ±1σ, ≈95 % a ±1,96σ (≈±2σ), ≈99,7 % a ±3σ.",
      "- `stats.norm.cdf(x, mu, sigma)`: P(X ≤ x). `stats.norm.ppf(q, mu, sigma)`: el valor con probabilidad acumulada q (inversa).",
      "",
      "Aparece como aproximación de sumas y medias (TCL), errores de medición y muchas medidas biológicas. **No la supongas sin mirar**: ingresos, tiempos y conteos raramente son normales. Para evaluarla: histograma, gráfico Q-Q y, con cautela, pruebas como Shapiro-Wilk (con n grande detectan desviaciones irrelevantes; con n pequeño no detectan casi nada).",
    ],
    formal: "f(x) = 1/(σ√(2π)) · exp(−(x − μ)²/(2σ²)). Si X ~ N(μ, σ²) entonces aX + b ~ N(aμ + b, a²σ²).",
    example: {
      code: py`from scipy import stats
estaturas = stats.norm(170, 8)
print(round(estaturas.cdf(180) - estaturas.cdf(160), 4))
print(round(estaturas.ppf(0.95), 2))
print(round(stats.norm.cdf(1.96) - stats.norm.cdf(-1.96), 4))`,
      lines: ["SciPy.", "Una normal de media 170 cm y DE 8 cm (ilustrativa).", "P(160 < X < 180) = 0,7887.", "Percentil 95: 183,16 cm.", "El 95 % central de una normal estándar está entre ±1,96."],
    },
    challenge: [
      "1. `prob_intervalo(a, b, mu, sigma)`: P(a < X < b).",
      "2. `percentil(q, mu, sigma)`: valor x con P(X ≤ x) = q.",
      "3. `regla_empirica(mu, sigma)`: lista con las probabilidades exactas a ±1, ±2 y ±3 σ (redondeadas a 4).",
      "4. `parece_normal(x)`: True si |asimetría| < 0.5, |curtosis en exceso| < 1 **y** la proporción de datos a ±1,96 DE de la media está entre 0.92 y 0.98. Evalúalo con los datos simulados que se te dan.",
    ],
    starter: py`from scipy import stats

def prob_intervalo(a, b, mu, sigma):
    return (b - a) / sigma

def percentil(q, mu, sigma):
    return mu + q * sigma

def regla_empirica(mu, sigma):
    return [0.68, 0.95, 0.997]

def parece_normal(x):
    return True`,
    solution: py`import numpy as np
from scipy import stats

def prob_intervalo(a, b, mu, sigma):
    return stats.norm.cdf(b, mu, sigma) - stats.norm.cdf(a, mu, sigma)

def percentil(q, mu, sigma):
    return stats.norm.ppf(q, mu, sigma)

def regla_empirica(mu, sigma):
    return [round(prob_intervalo(mu - k * sigma, mu + k * sigma, mu, sigma), 4) for k in (1, 2, 3)]

def parece_normal(x):
    x = np.asarray(x, dtype=float)
    m, s = x.mean(), x.std(ddof=1)
    dentro = np.mean(np.abs(x - m) <= 1.96 * s)
    return bool(abs(stats.skew(x)) < 0.5 and abs(stats.kurtosis(x)) < 1 and 0.92 <= dentro <= 0.98)

rng = np.random.default_rng(0)
print(parece_normal(rng.normal(0, 1, 1000)), parece_normal(rng.exponential(1, 1000)))`,
    tests: py`
import numpy as np
from scipy import stats

def test_prob():
    "Probabilidades e inversa"
    assert approx(t.get("prob_intervalo", "function")(160, 180, 170, 8), 0.7887004526662893, 1e-9)
    assert approx(t.get("percentil", "function")(0.975, 0, 1), 1.959963984540054, 1e-9)

def test_regla():
    "Regla 68-95-99,7"
    assert t.get("regla_empirica", "function")(50, 10) == [0.6827, 0.9545, 0.9973]

def test_normalidad():
    "Distingue normal de asimétrica y de colas pesadas"
    rng = np.random.default_rng(5)
    f = t.get("parece_normal", "function")
    assert f(rng.normal(10, 2, 2000)) is True
    assert f(rng.exponential(1, 2000)) is False
    assert f(rng.standard_t(2, 2000)) is False
`,
    hints: [
      "P(a < X < b) = F(b) − F(a) con `stats.norm.cdf(x, mu, sigma)`.",
      "La inversa de la acumulada es `stats.norm.ppf`.",
      "Para `parece_normal` combina `stats.skew`, `stats.kurtosis` y la proporción dentro de ±1,96 DE.",
    ],
    errors: [
      { error: "Usar la varianza como segundo parámetro de stats.norm", fix: "SciPy usa la desviación estándar (scale), no la varianza." },
      { error: "Confiar ciegamente en una prueba de normalidad", fix: "Con n grande, Shapiro-Wilk rechaza por desviaciones mínimas; con n pequeño apenas tiene potencia. Combina con gráficos." },
    ],
    quiz: {
      question: "Los tiempos de respuesta de un servidor tienen media 200 ms y DE 150 ms. ¿Es razonable suponer normalidad para calcular P(tiempo < 0)?",
      options: [
        { text: "No: los tiempos no pueden ser negativos y suelen ser asimétricos; la normal daría P(X < 0) ≈ 9 %, un absurdo" },
        { text: "Sí, la normal sirve para cualquier medida", misconception: "normalidad-universal" },
        { text: "Sí, porque la media es mayor que la DE" },
        { text: "Solo si n > 30", misconception: "normalidad-universal" },
      ],
      answer: 0,
      explanation: "Con media cercana a la DE y variable positiva, una lognormal o gamma describe mejor los datos. «n > 30» habla de la media muestral, no de los datos.",
    },
    review: "Repasa cdf, ppf, la regla empírica y cómo evaluar la normalidad sin suponerla.",
    xp: 80,
    coins: 12,
  },
  {
    id: "d-continuas",
    lab: { lab: "estadistica", tab: "distribuciones", label: "Distribuciones" },
    world: "w4",
    zone: "Distribuciones",
    title: "Los tiempos del reloj de arena: exponencial, uniforme, gamma, beta y lognormal",
    kind: "lesson",
    difficulty: 4,
    skills: ["distribuciones", "continuas"],
    requires: ["d-normal"],
    story: "Los relojes de arena del observatorio miden esperas, proporciones y cantidades que solo pueden ser positivas. Para cada fenómeno hay una forma adecuada.",
    objective: "Usar las distribuciones uniforme, exponencial, gamma, beta y lognormal: parámetros de SciPy, media y varianza, propiedad de pérdida de memoria y ajuste por máxima verosimilitud.",
    before: ["Distribución normal", "Variables aleatorias"],
    packages: ["scipy", "numpy"],
    intuition: [
      "- **Uniforme(a, b)**: todos los valores igual de probables. Media (a+b)/2, varianza (b−a)²/12.",
      "- **Exponencial(λ)**: tiempo hasta un evento con tasa constante. Media 1/λ. **Sin memoria**: P(X > s + t | X > s) = P(X > t).",
      "- **Gamma(k, θ)**: suma de k exponenciales; variables positivas asimétricas. Media kθ, varianza kθ².",
      "- **Beta(α, β)**: valores en [0, 1] (proporciones). Media α/(α+β).",
      "- **Lognormal**: ln X es normal. Positiva y asimétrica (ingresos, concentraciones).",
      "",
      "Ojo con la parametrización de SciPy: `stats.expon(scale=1/λ)`, `stats.gamma(a=k, scale=θ)`, `stats.lognorm(s=σ, scale=exp(μ))`, `stats.uniform(loc=a, scale=b−a)`.",
      "",
      "`dist.fit(datos)` estima parámetros por máxima verosimilitud.",
    ],
    formal: "Exponencial: F(x) = 1 − e^(−λx). Lognormal: E[X] = e^(μ + σ²/2).",
    example: {
      code: py`from scipy import stats
espera = stats.expon(scale=10)
print(round(espera.sf(15), 4))
print(round(espera.sf(25) / espera.sf(10), 4))
print(stats.gamma(a=3, scale=2).mean(), stats.beta(2, 8).mean())`,
      lines: ["SciPy.", "Esperas con media 10 minutos (λ = 0,1).", "P(esperar más de 15) = 0,2231.", "P(> 25 | ya esperó 10) = P(> 15): sin memoria.", "Gamma k=3, θ=2 tiene media 6; Beta(2, 8), media 0,2."],
    },
    challenge: [
      "1. `sin_memoria(media, s, tt)`: devuelve la tupla (P(X > s + tt | X > s), P(X > tt)) para una exponencial con esa media.",
      "2. `momentos(nombre, params)`: (media, varianza) usando SciPy para: `\"uniforme\"` (a, b), `\"exponencial\"` (λ), `\"gamma\"` (k, θ), `\"beta\"` (α, β), `\"lognormal\"` (μ, σ del logaritmo).",
      "3. `ajustar_lognormal(datos)`: (μ, σ) estimados como la media y la DE poblacional (ddof=0) de ln(datos) — estimadores de máxima verosimilitud.",
      "4. `prob_mayor(nombre, params, x)`: P(X > x) con la distribución indicada.",
    ],
    starter: py`from scipy import stats

def sin_memoria(media, s, tt):
    return (0, 0)

def momentos(nombre, params):
    return (0, 0)

def ajustar_lognormal(datos):
    return (0, 1)

def prob_mayor(nombre, params, x):
    return 0.5`,
    solution: py`import numpy as np
from scipy import stats

def _dist(nombre, p):
    if nombre == "uniforme":
        return stats.uniform(loc=p[0], scale=p[1] - p[0])
    if nombre == "exponencial":
        return stats.expon(scale=1 / p[0])
    if nombre == "gamma":
        return stats.gamma(a=p[0], scale=p[1])
    if nombre == "beta":
        return stats.beta(p[0], p[1])
    if nombre == "lognormal":
        return stats.lognorm(s=p[1], scale=np.exp(p[0]))
    raise ValueError(nombre)

def sin_memoria(media, s, tt):
    d = stats.expon(scale=media)
    return (d.sf(s + tt) / d.sf(s), d.sf(tt))

def momentos(nombre, params):
    d = _dist(nombre, params)
    return (float(d.mean()), float(d.var()))

def ajustar_lognormal(datos):
    l = np.log(np.asarray(datos, dtype=float))
    return (float(l.mean()), float(l.std(ddof=0)))

def prob_mayor(nombre, params, x):
    return float(_dist(nombre, params).sf(x))`,
    tests: py`
import numpy as np

def test_memoria():
    "Propiedad de pérdida de memoria"
    a, b = t.get("sin_memoria", "function")(10, 7, 4)
    assert approx(a, b, 1e-12) and approx(b, math.exp(-0.4), 1e-12)

def test_momentos():
    "Medias y varianzas teóricas"
    m = t.get("momentos", "function")
    assert all(approx(x, y) for x, y in zip(m("uniforme", (2, 8)), (5, 3)))
    assert all(approx(x, y) for x, y in zip(m("exponencial", (0.5,)), (2, 4)))
    assert all(approx(x, y) for x, y in zip(m("gamma", (3, 2)), (6, 12)))
    assert all(approx(x, y) for x, y in zip(m("beta", (2, 8)), (0.2, 16 / 1100)))
    mu, s = 1.0, 0.5
    assert approx(m("lognormal", (mu, s))[0], math.exp(mu + s * s / 2))

def test_ajuste():
    "Ajuste de máxima verosimilitud"
    rng = np.random.default_rng(9)
    datos = rng.lognormal(2, 0.4, 20000)
    mu, s = t.get("ajustar_lognormal", "function")(datos)
    assert abs(mu - 2) < 0.02 and abs(s - 0.4) < 0.02

def test_cola():
    "Probabilidad de cola"
    assert approx(t.get("prob_mayor", "function")("exponencial", (0.1,), 15), math.exp(-1.5))
`,
    hints: [
      "Crea la distribución congelada con la parametrización de SciPy y usa `.mean()`, `.var()` y `.sf(x)`.",
      "Exponencial con tasa λ: `stats.expon(scale=1/λ)`.",
      "Lognormal: `stats.lognorm(s=σ, scale=np.exp(μ))`.",
    ],
    errors: [
      { error: "Pasar la tasa λ como scale de la exponencial", fix: "En SciPy, scale = 1/λ (la media)." },
      { error: "Modelar una proporción con una normal", fix: "Una proporción vive en [0, 1]: la beta es una opción natural." },
    ],
    quiz: {
      question: "Quieres modelar el porcentaje de acierto de jugadores (entre 0 y 1). ¿Qué distribución encaja mejor como punto de partida?",
      options: [{ text: "Beta" }, { text: "Poisson" }, { text: "Exponencial" }, { text: "Normal sin restricciones", misconception: "normalidad-universal" }],
      answer: 0,
      explanation: "La beta tiene soporte en [0, 1] y forma flexible según α y β.",
    },
    review: "Repasa qué fenómeno modela cada distribución continua y su parametrización en SciPy.",
    xp: 85,
    coins: 12,
  },
  {
    id: "d-muestrales",
    lab: { lab: "estadistica", tab: "tcl", label: "Teorema central del límite" },
    world: "w4",
    zone: "Distribuciones",
    title: "Las distribuciones de los jueces: t de Student, chi-cuadrado y F",
    kind: "lesson",
    difficulty: 4,
    skills: ["distribuciones", "t-student", "chi-cuadrado"],
    requires: ["d-continuas"],
    story: "Tres jueces evalúan las pruebas del imperio: el juez t compara medias con pocos datos, el juez χ² cuenta discrepancias y el juez F compara variabilidades. Conocer sus distribuciones es entender sus veredictos.",
    objective: "Entender de dónde salen las distribuciones t, χ² y F, obtener valores críticos y probabilidades de cola con SciPy y comprobar su origen por simulación.",
    before: ["Distribución normal", "Varianza muestral"],
    packages: ["scipy", "numpy"],
    intuition: [
      "- **χ²(k)**: suma de k normales estándar al cuadrado. Mide discrepancias al cuadrado (pruebas de independencia, bondad de ajuste). (n−1)s²/σ² ~ χ²(n−1) con datos normales.",
      "- **t de Student(ν)**: Z / √(χ²/ν). Aparece al sustituir σ por s: (x̄ − μ)/(s/√n) ~ t(n−1). Colas más pesadas que la normal, sobre todo con pocos grados de libertad.",
      "- **F(d₁, d₂)**: cociente de dos χ² divididas por sus grados de libertad. Compara varianzas; base del ANOVA.",
      "",
      "Valores críticos: `stats.t.ppf(0.975, gl)`, `stats.chi2.ppf(0.95, gl)`, `stats.f.ppf(0.95, d1, d2)`.",
    ],
    formal: "Si Z ~ N(0,1) y V ~ χ²(ν) independientes: T = Z/√(V/ν) ~ t(ν). Cuando ν → ∞, t(ν) → N(0, 1).",
    example: {
      code: py`from scipy import stats
for gl in (2, 5, 30, 1000):
    print(gl, round(stats.t.ppf(0.975, gl), 3))
print(round(stats.chi2.ppf(0.95, 1), 3), round(stats.f.ppf(0.95, 2, 30), 3))`,
      lines: ["SciPy.", "Valores críticos bilaterales al 95 % para varios grados de libertad…", "…4,303; 2,571; 2,042; 1,962: se acercan a 1,96.", "χ²(1) crítico 3,841 y F(2, 30) crítico 3,316."],
    },
    challenge: [
      "1. `critico_t(conf, gl)`: valor crítico bilateral t para el nivel de confianza `conf`.",
      "2. `cola_t(t_obs, gl)`: P(|T| ≥ |t_obs|) (bilateral).",
      "3. `simular_t(n, repeticiones, semilla)`: simula `repeticiones` muestras normales N(0, 1) de tamaño n, calcula para cada una t = x̄ / (s/√n) y devuelve la proporción con |t| > `critico_t(0.95, n-1)`. Debe ser ≈ 0.05.",
      "4. `simular_chi2(n, sigma, repeticiones, semilla)`: array con (n−1)s²/σ² para muestras normales; su media debe ser ≈ n − 1.",
      "5. `cola_f(f_obs, d1, d2)`: P(F ≥ f_obs).",
    ],
    starter: py`from scipy import stats
import numpy as np

def critico_t(conf, gl):
    return 1.96

def cola_t(t_obs, gl):
    return 0.05

def simular_t(n, repeticiones, semilla):
    return 0

def simular_chi2(n, sigma, repeticiones, semilla):
    return np.zeros(repeticiones)

def cola_f(f_obs, d1, d2):
    return 0.05`,
    solution: py`from scipy import stats
import numpy as np

def critico_t(conf, gl):
    return stats.t.ppf(1 - (1 - conf) / 2, gl)

def cola_t(t_obs, gl):
    return 2 * stats.t.sf(abs(t_obs), gl)

def simular_t(n, repeticiones, semilla):
    rng = np.random.default_rng(semilla)
    m = rng.normal(0, 1, size=(repeticiones, n))
    tt = m.mean(axis=1) / (m.std(axis=1, ddof=1) / np.sqrt(n))
    return float(np.mean(np.abs(tt) > critico_t(0.95, n - 1)))

def simular_chi2(n, sigma, repeticiones, semilla):
    rng = np.random.default_rng(semilla)
    m = rng.normal(0, sigma, size=(repeticiones, n))
    return (n - 1) * m.var(axis=1, ddof=1) / sigma ** 2

def cola_f(f_obs, d1, d2):
    return float(stats.f.sf(f_obs, d1, d2))`,
    tests: py`
import numpy as np
from scipy import stats

def test_criticos():
    "Valores críticos y colas"
    assert approx(t.get("critico_t", "function")(0.95, 10), 2.2281388519649385, 1e-9)
    assert approx(t.get("critico_t")(0.99, 5), stats.t.ppf(0.995, 5), 1e-9)
    assert approx(t.get("cola_t", "function")(-2.228138851964938, 10), 0.05, 1e-6)
    assert approx(t.get("cola_f", "function")(3.316, 2, 30), stats.f.sf(3.316, 2, 30))

def test_sim_t():
    "Con t de Student la tasa de rechazo es ≈ 5 % incluso con n = 5"
    p = t.get("simular_t", "function")(5, 40000, 1)
    assert abs(p - 0.05) < 0.005, f"Proporción {p}"

def test_sim_chi2():
    "(n−1)s²/σ² ~ χ²(n−1)"
    v = np.asarray(t.get("simular_chi2", "function")(8, 3, 40000, 2))
    assert abs(v.mean() - 7) < 0.1 and abs(v.var() - 14) < 0.6
`,
    hints: [
      "Bilateral al 95 %: deja 2,5 % en cada cola → `stats.t.ppf(0.975, gl)`.",
      "La cola bilateral es `2 * stats.t.sf(abs(t_obs), gl)`.",
      "Para simular, genera una matriz (repeticiones × n) y calcula medias y DE por filas.",
    ],
    errors: [
      { error: "Usar 1,96 con n = 5", fix: "Con σ estimada y pocos datos, el valor crítico correcto es t(4) = 2,776. Usar 1,96 da intervalos demasiado estrechos." },
      { error: "Duplicar mal la cola", fix: "Para una prueba bilateral, el valor p es el doble de la cola de |t|." },
    ],
    quiz: {
      question: "¿Por qué con muestras pequeñas se usa t en lugar de la normal para la media?",
      options: [
        { text: "Porque al estimar σ con s se añade incertidumbre, y la t tiene colas más pesadas que la reflejan" },
        { text: "Porque los datos pequeños nunca son normales" },
        { text: "Porque la t es más fácil de calcular" },
        { text: "Porque con n pequeño la media no tiene distribución" },
      ],
      answer: 0,
      explanation: "s varía de muestra en muestra; la t incorpora esa variabilidad adicional. Con n grande, t y normal casi coinciden.",
    },
    review: "Repasa el origen de t, χ² y F y cuándo aparecen.",
    xp: 85,
    coins: 12,
  },
  {
    id: "s-muestreo",
    world: "w4",
    zone: "Muestreo",
    title: "Los emisarios del censo: diseños de muestreo y sesgo",
    kind: "lesson",
    difficulty: 3,
    skills: ["muestreo", "sesgo"],
    requires: ["d-muestrales"],
    story: "El emperador envía emisarios a medir el sentir del pueblo. Uno pregunta solo en la plaza del mercado; otro sortea casas en cada provincia. Sus resultados no se parecen.",
    objective: "Implementar muestreo aleatorio simple, estratificado, sistemático y por conglomerados, y demostrar por simulación el sesgo de una muestra de conveniencia.",
    before: ["Población y muestra", "pandas", "NumPy"],
    packages: ["numpy", "pandas"],
    intuition: [
      "- **Aleatorio simple**: cada subconjunto de tamaño n tiene la misma probabilidad.",
      "- **Estratificado**: se divide la población en estratos homogéneos (provincias) y se muestrea en cada uno; mejora la precisión y garantiza representación.",
      "- **Sistemático**: se elige un inicio al azar y luego cada k-ésimo elemento. Peligroso si la lista tiene periodicidad.",
      "- **Por conglomerados**: se sortean grupos enteros (escuelas) y se observa a todos sus miembros; barato, pero menos preciso si los grupos se parecen por dentro.",
      "- **Conveniencia**: quien está a mano. Suele producir **sesgo de selección**: el error no se reduce aumentando n.",
      "",
      "El **error de muestreo** (azar) disminuye con n; el **sesgo** (sistemático) no.",
    ],
    example: {
      code: py`import numpy as np
rng = np.random.default_rng(0)
poblacion = np.arange(1, 1001)
simple = rng.choice(poblacion, size=10, replace=False)
k = len(poblacion) // 10
inicio = rng.integers(0, k)
print(sorted(simple), poblacion[inicio::k][:10])`,
      lines: ["NumPy.", "Semilla.", "Población de 1000 identificadores.", "Muestra aleatoria simple de 10, sin reemplazo.", "Salto del muestreo sistemático.", "Inicio aleatorio dentro del primer salto.", "Muestra simple y sistemática."],
    },
    challenge: [
      "La población `pob` (DataFrame) tiene columnas `id`, `provincia` (4 provincias de tamaños distintos), `urbano` (0/1) e `ingreso`. La plaza del mercado solo atrae a gente urbana.",
      "1. `simple(pob, n, semilla)`: muestra aleatoria simple (usa `pob.sample(n, random_state=semilla)`).",
      "2. `estratificada(pob, n, semilla)`: asigna a cada provincia un tamaño proporcional a su peso (redondeando; ajusta el último estrato para que el total sea n) y muestrea en cada una.",
      "3. `sistematica(pob, n, semilla)`: inicio aleatorio y cada k = len(pob) // n.",
      "4. `sesgo_conveniencia(pob, n, repeticiones)`: media del error (media muestral − media poblacional del ingreso) en `repeticiones` muestras de n personas **urbanas**; y la misma cantidad para muestras simples. Devuelve tupla (sesgo_conveniencia, sesgo_simple).",
    ],
    starter: py`import numpy as np
import pandas as pd

rng = np.random.default_rng(11)
prov = rng.choice(["Norte", "Sur", "Este", "Oeste"], size=20000, p=[0.4, 0.3, 0.2, 0.1])
urbano = (rng.random(20000) < 0.55).astype(int)
ingreso = rng.lognormal(7 + 0.35 * urbano + (prov == "Norte") * 0.1, 0.5)
pob = pd.DataFrame({"id": np.arange(20000), "provincia": prov, "urbano": urbano, "ingreso": ingreso})

def simple(pob, n, semilla):
    return pob.head(n)

def estratificada(pob, n, semilla):
    return pob.head(n)

def sistematica(pob, n, semilla):
    return pob.iloc[::len(pob) // n]

def sesgo_conveniencia(pob, n, repeticiones):
    return (0, 0)`,
    solution: py`import numpy as np
import pandas as pd

rng = np.random.default_rng(11)
prov = rng.choice(["Norte", "Sur", "Este", "Oeste"], size=20000, p=[0.4, 0.3, 0.2, 0.1])
urbano = (rng.random(20000) < 0.55).astype(int)
ingreso = rng.lognormal(7 + 0.35 * urbano + (prov == "Norte") * 0.1, 0.5)
pob = pd.DataFrame({"id": np.arange(20000), "provincia": prov, "urbano": urbano, "ingreso": ingreso})

def simple(pob, n, semilla):
    return pob.sample(n, random_state=semilla)

def estratificada(pob, n, semilla):
    pesos = pob["provincia"].value_counts(normalize=True).sort_index()
    tam = (pesos * n).round().astype(int)
    tam.iloc[-1] = n - tam.iloc[:-1].sum()
    partes = [pob[pob["provincia"] == p].sample(k, random_state=semilla) for p, k in tam.items()]
    return pd.concat(partes)

def sistematica(pob, n, semilla):
    k = len(pob) // n
    inicio = np.random.default_rng(semilla).integers(0, k)
    return pob.iloc[inicio::k].head(n)

def sesgo_conveniencia(pob, n, repeticiones):
    mu = pob["ingreso"].mean()
    urb = pob[pob["urbano"] == 1]
    conv = np.mean([urb.sample(n, random_state=i)["ingreso"].mean() - mu for i in range(repeticiones)])
    sim = np.mean([pob.sample(n, random_state=i)["ingreso"].mean() - mu for i in range(repeticiones)])
    return (float(conv), float(sim))

print(sesgo_conveniencia(pob, 200, 200))`,
    tests: py`
import numpy as np

def test_simple():
    "Muestra simple sin repetidos"
    m = t.get("simple", "function")(t.get("pob"), 500, 1)
    assert len(m) == 500 and m["id"].is_unique

def test_estratificada():
    "Proporciones de provincia respetadas"
    pob = t.get("pob")
    m = t.get("estratificada", "function")(pob, 400, 2)
    assert len(m) == 400 and m["id"].is_unique
    esperado = (pob["provincia"].value_counts(normalize=True) * 400).round()
    obs = m["provincia"].value_counts()
    assert all(abs(obs[p] - esperado[p]) <= 1 for p in esperado.index)

def test_sistematica():
    "Salto constante"
    m = t.get("sistematica", "function")(t.get("pob"), 100, 3)
    d = np.diff(m.index.to_numpy())
    assert len(m) == 100 and (d == 200).all()

def test_sesgo():
    "La conveniencia está sesgada; la simple no"
    conv, sim = t.get("sesgo_conveniencia", "function")(t.get("pob"), 200, 150)
    mu = t.get("pob")["ingreso"].mean()
    assert conv > 0.1 * mu and abs(sim) < 0.02 * mu
`,
    hints: [
      "`pob.sample(n, random_state=semilla)` hace un muestreo simple sin reemplazo.",
      "En la estratificada: pesos con `value_counts(normalize=True)`, tamaños con `(pesos * n).round()` y ajuste del último.",
      "Para el sesgo, compara medias muestrales con la media de toda la población en muchas repeticiones.",
    ],
    errors: [
      { error: "Pensar que una muestra grande de conveniencia es representativa", fix: "Aumentar n reduce el error aleatorio, no el sesgo de selección." },
      { error: "Estratos que no suman n", fix: "Al redondear tamaños por estrato, ajusta uno para que el total sea exacto." },
    ],
    quiz: {
      question: "Una encuesta online con 100 000 respuestas voluntarias frente a una aleatoria de 1 000. ¿Cuál es más fiable para estimar la opinión de todo el país?",
      options: [
        { text: "Normalmente la aleatoria de 1 000: la voluntaria tiene sesgo de autoselección que el tamaño no corrige" },
        { text: "La de 100 000, porque es más grande" },
        { text: "Son equivalentes" },
        { text: "Ninguna puede decir nada" },
      ],
      answer: 0,
      explanation: "El tamaño reduce la varianza, no el sesgo. Quien responde voluntariamente suele diferir de quien no lo hace.",
    },
    review: "Repasa los diseños de muestreo y la diferencia entre error aleatorio y sesgo.",
    xp: 80,
    coins: 12,
  },
  {
    id: "s-error-estandar",
    lab: { lab: "estadistica", tab: "tcl", label: "Teorema central del límite" },
    world: "w4",
    zone: "Muestreo",
    title: "La niebla de la estimación: distribución muestral y error estándar",
    kind: "lesson",
    difficulty: 3,
    skills: ["error-estandar", "distribucion-muestral"],
    requires: ["s-muestreo"],
    story: "Cada emisario vuelve con una estimación distinta. Si enviaras mil emisarios, sus estimaciones formarían una nube: su anchura es el error estándar.",
    objective: "Construir la distribución muestral de la media y de una proporción, calcular el error estándar y distinguirlo de la desviación estándar.",
    before: ["Muestreo", "TCL", "Dispersión"],
    packages: ["numpy"],
    intuition: [
      "Si repitieras el muestreo muchas veces, cada muestra daría un estadístico distinto. Su distribución es la **distribución muestral**.",
      "",
      "- **Desviación estándar (DE)**: dispersión de los **datos individuales**. No disminuye con n.",
      "- **Error estándar (EE)**: dispersión de un **estimador** entre muestras. Para la media: EE = σ/√n (estimado con s/√n). Para una proporción: √(p(1−p)/n).",
      "",
      "Para reducir el EE a la mitad hay que **cuadruplicar** n. El EE solo mide error aleatorio: no corrige sesgos.",
    ],
    formal: "Var(X̄) = σ²/n para observaciones independientes. Con muestreo sin reemplazo de una población finita N: multiplicar por (N − n)/(N − 1).",
    example: {
      code: py`import numpy as np
rng = np.random.default_rng(1)
pob = rng.normal(100, 15, 1_000_000)
for n in (25, 100, 400):
    medias = [rng.choice(pob, n).mean() for _ in range(2000)]
    print(n, round(np.std(medias), 2), round(15 / np.sqrt(n), 2))`,
      lines: ["NumPy.", "Semilla.", "Población de 1 millón con σ = 15.", "Para tres tamaños de muestra…", "…2000 medias muestrales…", "…su DE (EE observado) coincide con 15/√n: 3, 1,5, 0,75."],
    },
    challenge: [
      "1. `ee_media(muestra)`: error estándar de la media (s/√n con ddof=1).",
      "2. `ee_proporcion(exitos, n)`: √(p̂(1 − p̂)/n).",
      "3. `n_para_ee(sigma, ee_objetivo)`: menor n entero con σ/√n ≤ objetivo.",
      "4. `distribucion_muestral(pob, n, repeticiones, semilla)`: array de medias de muestras con reemplazo.",
      "5. `de_y_ee(muestra)`: diccionario `{\"de\": ..., \"ee\": ...}`. Las pruebas comprobarán que, si duplicas la muestra, la DE apenas cambia pero el EE se divide por ≈ √2.",
    ],
    starter: py`import numpy as np

def ee_media(muestra):
    return np.std(muestra)

def ee_proporcion(exitos, n):
    return exitos / n

def n_para_ee(sigma, ee_objetivo):
    return int(sigma / ee_objetivo)

def distribucion_muestral(pob, n, repeticiones, semilla):
    return np.array([np.mean(pob)])

def de_y_ee(muestra):
    return {"de": 0, "ee": 0}`,
    solution: py`import math
import numpy as np

def ee_media(muestra):
    m = np.asarray(muestra, dtype=float)
    return m.std(ddof=1) / np.sqrt(len(m))

def ee_proporcion(exitos, n):
    p = exitos / n
    return math.sqrt(p * (1 - p) / n)

def n_para_ee(sigma, ee_objetivo):
    return math.ceil((sigma / ee_objetivo) ** 2)

def distribucion_muestral(pob, n, repeticiones, semilla):
    rng = np.random.default_rng(semilla)
    return rng.choice(np.asarray(pob), size=(repeticiones, n), replace=True).mean(axis=1)

def de_y_ee(muestra):
    m = np.asarray(muestra, dtype=float)
    return {"de": float(m.std(ddof=1)), "ee": float(ee_media(m))}`,
    tests: py`
import numpy as np

def test_ee():
    "Errores estándar"
    x = [12, 15, 9, 14, 10, 16, 13, 11]
    assert approx(t.get("ee_media", "function")(x), np.std(x, ddof=1) / np.sqrt(8))
    assert approx(t.get("ee_proporcion", "function")(30, 120), math.sqrt(0.25 * 0.75 / 120))

def test_n():
    "Tamaño para un EE objetivo"
    f = t.get("n_para_ee", "function")
    assert f(15, 1.5) == 100 and f(15, 1.4) == 115 and f(10, 10) == 1

def test_distribucion():
    "La DE de las medias ≈ σ/√n"
    rng = np.random.default_rng(0)
    pob = rng.exponential(5, 100000)
    m = t.get("distribucion_muestral", "function")(pob, 64, 5000, 1)
    assert np.shape(m) == (5000,)
    assert abs(np.std(m) - pob.std() / 8) / (pob.std() / 8) < 0.05

def test_de_vs_ee():
    "DE estable, EE cae con n"
    rng = np.random.default_rng(2)
    x = rng.normal(0, 4, 400)
    a = t.get("de_y_ee", "function")(x)
    b = t.get("de_y_ee")(np.concatenate([x, x]))
    assert abs(a["de"] - b["de"]) < 0.02 and abs(a["ee"] / b["ee"] - math.sqrt(2)) < 0.01
`,
    hints: [
      "EE de la media: `np.std(x, ddof=1) / np.sqrt(len(x))`.",
      "Despeja n de σ/√n ≤ EE: n ≥ (σ/EE)². Redondea hacia arriba con `math.ceil`.",
      "Para la distribución muestral, `rng.choice(pob, size=(repeticiones, n))` y media por filas.",
    ],
    errors: [
      { error: "Usar la DE como si fuera el EE en un gráfico de medias", fix: "Las barras de error deben indicar qué representan: DE (variabilidad de los datos) o EE/IC (incertidumbre de la media)." },
      { error: "Esperar que el EE corrija una muestra sesgada", fix: "El EE solo cuantifica el error aleatorio." },
    ],
    quiz: {
      question: "Un artículo informa «media 120 (± 4)». Sin más contexto, ¿qué falta saber?",
      options: [
        { text: "Si ± 4 es la desviación estándar, el error estándar o la mitad de un intervalo de confianza" },
        { text: "Nada, siempre es la desviación estándar", misconception: "de-vs-ee" },
        { text: "Nada, siempre es el error estándar", misconception: "de-vs-ee" },
        { text: "Solo el tamaño de la población" },
      ],
      answer: 0,
      explanation: "Con n = 100, una DE de 4 implica EE = 0,4. Confundirlos cambia por completo la interpretación.",
    },
    review: "Repasa la diferencia entre DE (datos) y EE (estimación) y la ley de la raíz de n.",
    xp: 80,
    coins: 12,
  },
  {
    id: "s-bootstrap",
    lab: { lab: "estadistica", tab: "bootstrap", label: "Bootstrap" },
    world: "w4",
    zone: "Muestreo",
    title: "El espejo multiplicador: bootstrap y remuestreo",
    kind: "lesson",
    difficulty: 4,
    skills: ["bootstrap", "remuestreo"],
    requires: ["s-error-estandar"],
    story: "El espejo del observatorio multiplica tu única muestra en miles de muestras posibles. Así puedes medir la incertidumbre de cualquier estadístico, incluso sin fórmula.",
    objective: "Estimar error estándar e intervalos de confianza percentil por bootstrap para estadísticos sin fórmula sencilla (mediana, diferencia de medianas, razón).",
    before: ["Error estándar", "Cuantiles"],
    packages: ["numpy", "scipy"],
    intuition: [
      "**Bootstrap**: remuestrear **con reemplazo** n observaciones de tu propia muestra, calcular el estadístico y repetir B veces. La dispersión de esos B valores aproxima la distribución muestral.",
      "",
      "- EE bootstrap = DE de los B estadísticos.",
      "- IC percentil al 95 %: percentiles 2,5 y 97,5 de los B estadísticos.",
      "",
      "Supone que la muestra representa a la población y que las observaciones son independientes. Funciona mal con n muy pequeño, con estadísticos extremos (máximo) y con datos dependientes (series temporales) sin adaptarlo. Pruébalo en el Laboratorio estadístico → «Bootstrap».",
    ],
    example: {
      code: py`import numpy as np
rng = np.random.default_rng(0)
x = np.array([12, 15, 9, 22, 14, 13, 41, 16, 11, 18])
boot = [np.median(rng.choice(x, len(x))) for _ in range(5000)]
print(np.median(x), np.round(np.percentile(boot, [2.5, 97.5]), 1))`,
      lines: ["NumPy.", "Semilla.", "Diez tiempos con un valor extremo.", "5000 medianas de remuestras con reemplazo.", "Mediana 14,5 e IC percentil del 95 %."],
    },
    challenge: [
      "1. `bootstrap(x, estadistico, B, semilla)`: array con B valores del estadístico sobre remuestras con reemplazo.",
      "2. `ic_percentil(x, estadistico, B=4000, conf=0.95, semilla=0)`: tupla (inferior, superior).",
      "3. `ee_bootstrap(x, estadistico, B=4000, semilla=0)`: DE (ddof=1) de los valores bootstrap.",
      "4. `ic_diferencia_medianas(a, b, B=4000, semilla=0)`: IC percentil al 95 % de mediana(a) − mediana(b), remuestreando **cada grupo por separado**.",
    ],
    starter: py`import numpy as np

def bootstrap(x, estadistico, B, semilla):
    return np.array([estadistico(x)] * B)

def ic_percentil(x, estadistico, B=4000, conf=0.95, semilla=0):
    return (0, 0)

def ee_bootstrap(x, estadistico, B=4000, semilla=0):
    return 0

def ic_diferencia_medianas(a, b, B=4000, semilla=0):
    return (0, 0)`,
    solution: py`import numpy as np

def bootstrap(x, estadistico, B, semilla):
    rng = np.random.default_rng(semilla)
    x = np.asarray(x)
    return np.array([estadistico(rng.choice(x, size=len(x), replace=True)) for _ in range(B)])

def ic_percentil(x, estadistico, B=4000, conf=0.95, semilla=0):
    v = bootstrap(x, estadistico, B, semilla)
    a = (1 - conf) / 2
    return tuple(np.percentile(v, [100 * a, 100 * (1 - a)]))

def ee_bootstrap(x, estadistico, B=4000, semilla=0):
    return float(np.std(bootstrap(x, estadistico, B, semilla), ddof=1))

def ic_diferencia_medianas(a, b, B=4000, semilla=0):
    rng = np.random.default_rng(semilla)
    a, b = np.asarray(a), np.asarray(b)
    d = [np.median(rng.choice(a, len(a))) - np.median(rng.choice(b, len(b))) for _ in range(B)]
    return tuple(np.percentile(d, [2.5, 97.5]))`,
    tests: py`
import numpy as np
from scipy import stats

def test_bootstrap():
    "Remuestras con reemplazo"
    v = t.get("bootstrap", "function")([1, 2, 3, 4, 5], np.mean, 1000, 1)
    assert len(v) == 1000 and v.min() >= 1 and v.max() <= 5 and v.std() > 0

def test_ee_media():
    "El EE bootstrap de la media se acerca a s/√n"
    rng = np.random.default_rng(4)
    x = rng.normal(50, 10, 200)
    ee = t.get("ee_bootstrap", "function")(x, np.mean, 4000, 1)
    assert abs(ee - x.std(ddof=1) / np.sqrt(200)) < 0.05

def test_ic():
    "Similar al IC percentil de scipy.stats.bootstrap"
    rng = np.random.default_rng(6)
    x = rng.lognormal(3, 0.6, 120)
    lo, hi = t.get("ic_percentil", "function")(x, np.median, 4000, 0.95, 2)
    ref = stats.bootstrap((x,), np.median, n_resamples=4000, method="percentile", random_state=3).confidence_interval
    assert lo < np.median(x) < hi
    assert abs(lo - ref.low) < 0.08 * np.median(x) and abs(hi - ref.high) < 0.08 * np.median(x)

def test_diferencia():
    "IC de diferencia de medianas"
    rng = np.random.default_rng(8)
    a, b = rng.normal(60, 8, 80), rng.normal(50, 8, 80)
    lo, hi = t.get("ic_diferencia_medianas", "function")(a, b, 3000, 1)
    assert 0 < lo < 10 < hi < 20
`,
    hints: [
      "`rng.choice(x, size=len(x), replace=True)` crea una remuestra.",
      "Para el IC percentil al 95 %: `np.percentile(valores, [2.5, 97.5])`.",
      "En la diferencia, remuestrea a y b por separado en cada iteración.",
    ],
    errors: [
      { error: "Remuestrear sin reemplazo", fix: "Sin reemplazo obtienes siempre la misma muestra reordenada y el estadístico no varía." },
      { error: "Mezclar los dos grupos al remuestrear una diferencia", fix: "Remuestrea cada grupo por separado para respetar el diseño." },
    ],
    quiz: {
      question: "¿Qué supuesto clave hace el bootstrap?",
      options: [
        { text: "Que la muestra representa razonablemente a la población y las observaciones son independientes" },
        { text: "Que los datos son normales", misconception: "normalidad-universal" },
        { text: "Que n es mayor que 1000" },
        { text: "Ninguno: siempre funciona" },
      ],
      answer: 0,
      explanation: "El bootstrap evita supuestos de forma, pero no puede inventar información ausente en la muestra ni corregir sesgos de selección.",
    },
    review: "Repasa el procedimiento bootstrap y sus limitaciones.",
    xp: 85,
    coins: 12,
  },
];
