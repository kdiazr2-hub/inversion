import { py, type Mission } from "../types";

// Mundo 4 · Zona 1 (matemáticas fundamentales) y Zona 2 (estadística descriptiva).

export const W4_A: Mission[] = [
  {
    id: "m-porcentajes",
    world: "w4",
    zone: "Matemáticas fundamentales",
    title: "La balanza del mercader: porcentajes y proporciones",
    kind: "lesson",
    difficulty: 1,
    skills: ["porcentajes", "proporciones"],
    requires: [],
    story: "Un mercader anuncia: «¡El precio subió un 50 % y luego bajó un 50 %, así que está igual!». El observatorio te encarga desmontar esta y otras trampas numéricas.",
    objective: "Calcular porcentajes, cambios relativos, puntos porcentuales y razones sin caer en errores frecuentes.",
    before: ["Operadores aritméticos", "Funciones"],
    intuition: [
      "- Un **porcentaje** es una fracción de 100: 25 % = 0,25.",
      "- **Cambio relativo** = (nuevo − antiguo) / antiguo. Subir un 50 % y bajar un 50 % no se compensan: 100 → 150 → 75.",
      "- **Puntos porcentuales** (pp) comparan porcentajes: pasar del 10 % al 15 % es +5 pp, pero +50 % relativo.",
      "- Una **razón** compara dos cantidades (3:1); una **proporción** es una parte del total (3/4).",
      "",
      "Siempre pregunta: ¿porcentaje **de qué**? La base del cálculo cambia la conclusión.",
    ],
    formal: "Cambio relativo = (x₁ − x₀)/x₀. Cambios sucesivos se multiplican: (1 + r₁)(1 + r₂) − 1.",
    example: {
      code: py`antes, despues = 80, 92
cambio = (despues - antes) / antes
print(f"Cambio: {cambio:.1%}")
tasa_a, tasa_b = 0.10, 0.15
print(f"{(tasa_b - tasa_a) * 100:.0f} pp, {(tasa_b - tasa_a) / tasa_a:.0%} relativo")`,
      lines: ["Valores inicial y final.", "Cambio relativo: 0,15.", "Cambio: 15.0%", "Dos tasas.", "5 pp, 50% relativo: la misma diferencia contada de dos maneras."],
    },
    challenge: [
      "Escribe estas funciones:",
      "1. `cambio_relativo(antes, despues)`: cambio relativo (lanza `ValueError` si antes es 0).",
      "2. `encadenar(cambios)`: cambio total tras aplicar una lista de cambios relativos sucesivos (ej. `[0.5, -0.5]` → −0.25).",
      "3. `diferencia_pp(p1, p2)`: diferencia en puntos porcentuales entre dos proporciones (ej. 0.10 y 0.15 → 5.0).",
      "4. `reparto(total, pesos)`: reparte `total` proporcionalmente a una lista de pesos, devolviendo una lista de cantidades.",
    ],
    starter: py`def cambio_relativo(antes, despues):
    return despues - antes

def encadenar(cambios):
    return sum(cambios)

def diferencia_pp(p1, p2):
    return (p2 - p1) / p1

def reparto(total, pesos):
    return [total / len(pesos)] * len(pesos)`,
    solution: py`import math

def cambio_relativo(antes, despues):
    if antes == 0:
        raise ValueError("El valor inicial no puede ser 0")
    return (despues - antes) / antes

def encadenar(cambios):
    return math.prod(1 + c for c in cambios) - 1

def diferencia_pp(p1, p2):
    return (p2 - p1) * 100

def reparto(total, pesos):
    s = sum(pesos)
    return [total * p / s for p in pesos]`,
    tests: py`
def test_relativo():
    "Cambio relativo y caso base 0"
    f = t.get("cambio_relativo", "function")
    assert approx(f(80, 92), 0.15) and approx(f(200, 150), -0.25)
    try:
        f(0, 5)
    except ValueError:
        return
    assert False, "Con antes = 0 debe lanzar ValueError"

def test_encadenar():
    "Los cambios se multiplican, no se suman"
    f = t.get("encadenar", "function")
    assert approx(f([0.5, -0.5]), -0.25) and approx(f([0.1, 0.1]), 0.21) and approx(f([]), 0)

def test_pp():
    "Puntos porcentuales"
    assert approx(t.get("diferencia_pp", "function")(0.10, 0.15), 5.0)

def test_reparto():
    "Reparto proporcional"
    r = t.get("reparto", "function")(900, [1, 2, 6])
    assert all(approx(a, b) for a, b in zip(r, [100, 200, 600])) and approx(sum(r), 900)
`,
    hints: [
      "Cambio relativo: divide la diferencia entre el valor **inicial**.",
      "Encadenar: multiplica los factores (1 + c) y resta 1 al final. `math.prod` ayuda.",
      "Puntos porcentuales: diferencia absoluta de proporciones × 100.",
    ],
    errors: [
      { error: "Sumar cambios porcentuales sucesivos", fix: "+10 % y +10 % dan +21 %, no +20 %: los cambios se aplican sobre bases distintas." },
      { error: "Confundir pp con %", fix: "De 2 % a 4 % son +2 pp, pero el riesgo se ha duplicado (+100 %)." },
    ],
    quiz: {
      question: "El desempleo pasa del 8 % al 10 %. ¿Qué afirmación es correcta?",
      options: [
        { text: "Subió 2 puntos porcentuales, un 25 % en términos relativos" },
        { text: "Subió un 2 %" },
        { text: "Subió un 20 %" },
        { text: "Subió 25 puntos porcentuales" },
      ],
      answer: 0,
      explanation: "10 − 8 = 2 pp; (10 − 8)/8 = 25 % de aumento relativo.",
    },
    advanced: {
      title: "Tasa media de crecimiento",
      prompt: "Escribe `tasa_media(cambios)`: la tasa constante que, aplicada n veces, produce el mismo cambio total (media geométrica de los factores menos 1).",
      starter: py`def tasa_media(cambios):
    return sum(cambios) / len(cambios)`,
      solution: py`import math

def tasa_media(cambios):
    return math.prod(1 + c for c in cambios) ** (1 / len(cambios)) - 1`,
      tests: py`
def test_tm():
    "Media geométrica de factores"
    f = t.get("tasa_media", "function")
    assert approx(f([0.5, -0.5]), (0.75 ** 0.5) - 1) and approx(f([0.1, 0.1]), 0.1)
`,
    },
    review: "Repasa: cambios relativos se encadenan multiplicando; pp ≠ %.",
    xp: 45,
    coins: 7,
  },
  {
    id: "m-logaritmos",
    world: "w4",
    zone: "Matemáticas fundamentales",
    title: "La escalera de las potencias: exponentes y logaritmos",
    kind: "lesson",
    difficulty: 2,
    skills: ["logaritmos", "crecimiento"],
    requires: ["m-porcentajes"],
    story: "Una colonia de hongos mágicos se duplica cada 3 días. ¿Cuándo cubrirá el bosque? Las potencias describen el crecimiento; los logaritmos responden «¿cuánto tiempo?».",
    objective: "Usar potencias, raíces y logaritmos para modelar crecimiento compuesto, tiempos de duplicación y escalas logarítmicas.",
    before: ["Porcentajes", "Funciones"],
    intuition: [
      "- Potencia: bⁿ = b·b·…·b. Raíz: ⁿ√x = x^(1/n).",
      "- **Logaritmo**: log_b(x) es el exponente al que hay que elevar b para obtener x. log₂(8) = 3.",
      "- Propiedades: log(ab) = log a + log b; log(aⁿ) = n·log a. Convierte multiplicaciones en sumas.",
      "- Crecimiento compuesto: x(t) = x₀(1 + r)ᵗ. Tiempo para multiplicar por k: t = log(k) / log(1 + r).",
      "",
      "En datos, el logaritmo **comprime** valores muy asimétricos (ingresos, concentraciones) y convierte crecimientos exponenciales en rectas.",
    ],
    formal: "log_b(x) = ln(x)/ln(b). Duplicación con tasa r: t₂ = ln 2 / ln(1 + r) ≈ 0,693/r para r pequeño (regla del 70).",
    example: {
      code: py`import math
capital, tasa = 1000, 0.05
print(round(capital * (1 + tasa) ** 10, 2))
print(round(math.log(2) / math.log(1 + tasa), 2))
print(math.log10(1000), math.log2(8), round(math.log(math.e), 3))`,
      lines: ["Módulo math.", "1000 al 5 % anual.", "Tras 10 años: 1628.89.", "Años para duplicar: 14.21.", "Logaritmos en base 10, 2 y natural: 3.0 3.0 1.0."],
    },
    challenge: [
      "1. `valor_futuro(x0, r, t)`: x0·(1 + r)ᵗ.",
      "2. `tiempo_para(x0, objetivo, r)`: tiempo (puede ser decimal) para pasar de x0 a objetivo con tasa r.",
      "3. `tasa_implicita(x0, x1, t)`: tasa r constante que lleva de x0 a x1 en t periodos.",
      "4. `ordenes_magnitud(valores)`: lista con el piso de log10 de cada valor positivo (ej. 4500 → 3).",
    ],
    starter: py`def valor_futuro(x0, r, t):
    return x0 * (1 + r * t)

def tiempo_para(x0, objetivo, r):
    return (objetivo - x0) / (x0 * r)

def tasa_implicita(x0, x1, t):
    return (x1 - x0) / x0 / t

def ordenes_magnitud(valores):
    return [len(str(v)) for v in valores]`,
    solution: py`import math

def valor_futuro(x0, r, t):
    return x0 * (1 + r) ** t

def tiempo_para(x0, objetivo, r):
    return math.log(objetivo / x0) / math.log(1 + r)

def tasa_implicita(x0, x1, t):
    return (x1 / x0) ** (1 / t) - 1

def ordenes_magnitud(valores):
    return [math.floor(math.log10(v)) for v in valores]`,
    tests: py`
def test_vf():
    "Crecimiento compuesto"
    assert approx(t.get("valor_futuro", "function")(1000, 0.05, 10), 1628.894626777442)

def test_tiempo():
    "Tiempo de duplicación y de triplicación"
    f = t.get("tiempo_para", "function")
    assert approx(f(1, 2, 0.05), 14.206699082890463) and approx(f(10, 30, 0.1), math.log(3) / math.log(1.1))

def test_tasa():
    "Tasa implícita (inversa de valor_futuro)"
    f = t.get("tasa_implicita", "function")
    assert approx(f(100, 121, 2), 0.1)
    vf = t.get("valor_futuro")
    assert approx(vf(50, f(50, 80, 7), 7), 80)

def test_ordenes():
    "Órdenes de magnitud"
    assert t.get("ordenes_magnitud", "function")([4500, 0.03, 1, 999, 1000]) == [3, -2, 0, 2, 3]
`,
    hints: [
      "Crecimiento compuesto: `(1 + r) ** t`, no `1 + r * t`.",
      "Despeja t en x0(1 + r)ᵗ = objetivo aplicando logaritmos a ambos lados.",
      "`math.floor(math.log10(v))` da el orden de magnitud (también para valores menores que 1).",
    ],
    errors: [
      { error: "ValueError: math domain error", fix: "El logaritmo solo está definido para números positivos." },
      { error: "Crecimiento lineal en vez de compuesto", fix: "En interés compuesto el crecimiento se aplica sobre lo acumulado: se multiplica, no se suma." },
    ],
    quiz: {
      question: "En un gráfico con eje y logarítmico, una serie forma una recta ascendente. ¿Qué significa?",
      options: [
        { text: "Crece a una tasa porcentual aproximadamente constante (crecimiento exponencial)" },
        { text: "Crece en la misma cantidad absoluta cada periodo" },
        { text: "No está creciendo" },
        { text: "Crece cada vez más despacio" },
      ],
      answer: 0,
      explanation: "log(x₀(1+r)ᵗ) = log x₀ + t·log(1+r): una recta en t cuya pendiente es log(1+r).",
    },
    review: "Repasa cómo despejar el tiempo con logaritmos y por qué la escala log convierte exponenciales en rectas.",
    xp: 55,
    coins: 8,
  },
  {
    id: "m-sumatorias",
    world: "w4",
    zone: "Matemáticas fundamentales",
    title: "Los símbolos antiguos: notación sigma, conjuntos e intervalos",
    kind: "lesson",
    difficulty: 2,
    skills: ["notacion", "sumatorias"],
    requires: ["m-logaritmos"],
    story: "En los muros del observatorio hay fórmulas con Σ, Π, ∈ y [a, b). Para leer los libros de estadística, primero hay que descifrar los símbolos.",
    objective: "Traducir notación matemática (Σ, Π, conjuntos, intervalos) a código Python y viceversa.",
    before: ["Bucles", "Conjuntos de Python", "Funciones"],
    intuition: [
      "- **Σᵢ₌₁ⁿ xᵢ** = x₁ + x₂ + … + xₙ → `sum(x)`.",
      "- **Πᵢ₌₁ⁿ xᵢ** = x₁ · x₂ · … · xₙ → `math.prod(x)`.",
      "- **x̄ = (1/n) Σ xᵢ** es la media; **Σ (xᵢ − x̄)²** la suma de cuadrados.",
      "- **A ∪ B**, **A ∩ B**, **A \\ B**, **x ∈ A** → `|`, `&`, `-`, `in`.",
      "- Intervalos: **[a, b]** incluye ambos extremos; **(a, b)** ninguno; **[a, b)** incluye a pero no b.",
      "",
      "Leer una fórmula es traducirla paso a paso: ¿qué índice recorre? ¿qué se suma o multiplica?",
    ],
    formal: "Linealidad: Σ(a·xᵢ + b) = a·Σxᵢ + n·b. Por eso Σ(xᵢ − x̄) = 0 siempre.",
    example: {
      code: py`import math
x = [2, 4, 9]
n = len(x)
media = sum(x) / n
print(media, sum(xi - media for xi in x), math.prod(x))
print(sum(i ** 2 for i in range(1, 11)))`,
      lines: ["Para el producto.", "Datos x₁, x₂, x₃.", "n = 3.", "x̄ = (1/n)Σxᵢ = 5.", "Σ(xᵢ − x̄) = 0 y Πxᵢ = 72.", "Σ_{i=1}^{10} i² = 385."],
    },
    challenge: [
      "Traduce estas fórmulas:",
      "1. `suma_cuadrados(x)` = Σ (xᵢ − x̄)²",
      "2. `media_ponderada(x, w)` = Σ wᵢxᵢ / Σ wᵢ",
      "3. `media_geometrica(x)` = (Π xᵢ)^(1/n) — calcúlala con logaritmos para evitar desbordamientos: exp((1/n) Σ ln xᵢ)",
      "4. `en_intervalo(v, a, b, cerrado_izq, cerrado_der)`: True si v pertenece al intervalo con los extremos indicados.",
      "5. `jaccard(A, B)` = |A ∩ B| / |A ∪ B| para conjuntos (0 si ambos vacíos).",
    ],
    starter: py`def suma_cuadrados(x):
    return sum(v ** 2 for v in x)

def media_ponderada(x, w):
    return sum(x) / len(x)

def media_geometrica(x):
    return sum(x) / len(x)

def en_intervalo(v, a, b, cerrado_izq, cerrado_der):
    return a <= v <= b

def jaccard(A, B):
    return len(A & B)`,
    solution: py`import math

def suma_cuadrados(x):
    m = sum(x) / len(x)
    return sum((v - m) ** 2 for v in x)

def media_ponderada(x, w):
    return sum(wi * xi for xi, wi in zip(x, w)) / sum(w)

def media_geometrica(x):
    return math.exp(sum(math.log(v) for v in x) / len(x))

def en_intervalo(v, a, b, cerrado_izq, cerrado_der):
    izq = a <= v if cerrado_izq else a < v
    der = v <= b if cerrado_der else v < b
    return izq and der

def jaccard(A, B):
    union = A | B
    return len(A & B) / len(union) if union else 0`,
    tests: py`
def test_sc():
    "Suma de cuadrados centrada"
    assert approx(t.get("suma_cuadrados", "function")([2, 4, 4, 4, 5, 5, 7, 9]), 32)

def test_ponderada():
    "Media ponderada"
    assert approx(t.get("media_ponderada", "function")([7, 9, 5], [0.2, 0.5, 0.3]), 7.4)

def test_geometrica():
    "Media geométrica, también con muchos valores grandes"
    f = t.get("media_geometrica", "function")
    assert approx(f([1, 3, 9]), 3) and approx(f([1e300] * 5), 1e300, 1e-9)

def test_intervalos():
    "Extremos abiertos y cerrados"
    f = t.get("en_intervalo", "function")
    assert f(1, 1, 2, True, False) and not f(2, 1, 2, True, False) and not f(1, 1, 2, False, True) and f(2, 1, 2, False, True)

def test_jaccard():
    "Índice de Jaccard"
    f = t.get("jaccard", "function")
    assert approx(f({1, 2, 3}, {2, 3, 4}), 0.5) and f(set(), set()) == 0
`,
    hints: [
      "Primero calcula la media y después suma los cuadrados de las desviaciones.",
      "`zip(x, w)` recorre valores y pesos a la vez.",
      "Para la geométrica: `math.exp(sum(math.log(v) for v in x) / len(x))`.",
    ],
    errors: [
      { error: "OverflowError o inf al multiplicar muchos números", fix: "Trabaja en escala logarítmica: el producto se convierte en una suma." },
      { error: "Olvidar centrar en la media", fix: "Σxᵢ² y Σ(xᵢ − x̄)² son cantidades distintas." },
    ],
    quiz: {
      question: "¿Cuánto vale siempre Σᵢ (xᵢ − x̄)?",
      options: [{ text: "0" }, { text: "n·x̄" }, { text: "La varianza" }, { text: "Depende de los datos" }],
      answer: 0,
      explanation: "Σxᵢ − n·x̄ = n·x̄ − n·x̄ = 0. Por eso la varianza usa cuadrados: las desviaciones con signo se cancelan.",
    },
    review: "Repasa cómo traducir Σ, Π e intervalos a código.",
    xp: 55,
    coins: 8,
  },
  {
    id: "m-derivadas",
    lab: { lab: "matematicas", tab: "funciones", label: "Funciones y derivadas" },
    world: "w4",
    zone: "Matemáticas fundamentales",
    title: "La pendiente de la colina: funciones, límites y derivadas",
    kind: "lesson",
    difficulty: 3,
    skills: ["funciones-matematicas", "derivadas", "optimizacion"],
    requires: ["m-sumatorias"],
    story: "Para bajar de la colina en la niebla, el guía tantea el suelo y da un paso hacia donde baja más. Así entrenan los modelos de machine learning: siguiendo la pendiente.",
    objective: "Aproximar derivadas con diferencias finitas, entender el límite como aproximación y minimizar una función con descenso de gradiente.",
    before: ["Funciones", "Potencias"],
    intuition: [
      "La **derivada** f′(x) es la pendiente de f en x: cuánto cambia f por cada unidad de cambio en x, **en el límite** de cambios muy pequeños:",
      "",
      "f′(x) ≈ (f(x + h) − f(x − h)) / (2h)   con h pequeño (diferencia central).",
      "",
      "- f′(x) > 0: f sube; f′(x) < 0: baja; f′(x) = 0: posible mínimo o máximo.",
      "- **Descenso de gradiente**: repetir x ← x − α·f′(x). α es la tasa de aprendizaje: si es muy grande, salta y diverge; si es muy pequeña, avanza despacio.",
    ],
    formal: "f′(x) = lim_{h→0} (f(x + h) − f(x))/h. Para f(x) = xⁿ, f′(x) = n·xⁿ⁻¹. El error de la diferencia central es O(h²).",
    example: {
      code: py`def f(x):
    return (x - 3) ** 2 + 1

h = 1e-5
for x in (0, 3, 5):
    print(x, round((f(x + h) - f(x - h)) / (2 * h), 4))`,
      lines: ["Una parábola con mínimo en x = 3.", "Su valor.", "Paso pequeño.", "Pendiente numérica en tres puntos…", "…−6 (baja), 0 (mínimo) y 4 (sube)."],
    },
    challenge: [
      "1. `derivada(f, x, h=1e-5)`: derivada numérica con diferencia central.",
      "2. `descenso(f, x0, alfa, pasos)`: aplica descenso de gradiente usando `derivada` y devuelve la lista de x visitados (incluido x0, longitud pasos + 1).",
      "3. Usa `descenso` para encontrar el mínimo de g(x) = x⁴ − 3x³ + 2 empezando en x0 = 4 con alfa = 0.01 y 500 pasos; guarda el último x en `minimo_g` (el mínimo exacto es 2.25).",
    ],
    starter: py`def derivada(f, x, h=1e-5):
    return (f(x + h) - f(x)) / 1

def descenso(f, x0, alfa, pasos):
    return [x0]

def g(x):
    return x ** 4 - 3 * x ** 3 + 2

minimo_g = 0`,
    solution: py`def derivada(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)

def descenso(f, x0, alfa, pasos):
    xs = [x0]
    for _ in range(pasos):
        xs.append(xs[-1] - alfa * derivada(f, xs[-1]))
    return xs

def g(x):
    return x ** 4 - 3 * x ** 3 + 2

minimo_g = descenso(g, 4, 0.01, 500)[-1]
print(minimo_g)`,
    tests: py`
def test_derivada():
    "Derivadas conocidas"
    d = t.get("derivada", "function")
    assert approx(d(lambda x: x ** 3, 2), 12, 1e-6) and approx(d(math.sin, 0), 1, 1e-6) and approx(d(math.exp, 1), math.e, 1e-6)

def test_descenso():
    "Descenso sobre una parábola"
    xs = t.get("descenso", "function")(lambda x: (x - 3) ** 2, 0, 0.1, 100)
    assert len(xs) == 101 and xs[0] == 0 and abs(xs[-1] - 3) < 1e-6

def test_minimo():
    "Mínimo de g"
    assert abs(t.get("minimo_g") - 2.25) < 1e-3

def test_diverge():
    "Con alfa demasiado grande, el descenso se aleja"
    xs = t.get("descenso")(lambda x: x ** 2, 1, 1.1, 20)
    assert abs(xs[-1]) > abs(xs[0]), "Con alfa = 1.1 sobre x² el método debería divergir"
`,
    hints: [
      "Diferencia central: `(f(x + h) - f(x - h)) / (2 * h)`.",
      "En cada paso: `nuevo = actual - alfa * derivada(f, actual)`.",
      "Guarda todos los x en una lista empezando por x0.",
    ],
    errors: [
      { error: "h demasiado pequeño (1e-15)", fix: "Los errores de redondeo dominan. Valores como 1e-5 equilibran aproximación y precisión." },
      { error: "El descenso diverge", fix: "Reduce la tasa de aprendizaje alfa." },
    ],
    quiz: {
      question: "En el descenso de gradiente, ¿por qué se resta α·f′(x) en lugar de sumarlo?",
      options: [
        { text: "Porque la derivada apunta hacia donde la función crece; para minimizar vamos en sentido contrario" },
        { text: "Por convención, daría igual sumar" },
        { text: "Porque la derivada siempre es negativa" },
        { text: "Para que alfa sea positiva" },
      ],
      answer: 0,
      explanation: "Si f′(x) > 0, aumentar x aumenta f; restando nos movemos hacia valores menores de f.",
    },
    review: "Repasa la derivada como pendiente y el papel de la tasa de aprendizaje.",
    xp: 70,
    coins: 10,
  },
  {
    id: "m-vectores",
    lab: { lab: "matematicas", tab: "matrices", label: "Transformaciones lineales" },
    world: "w4",
    zone: "Matemáticas fundamentales",
    title: "Las flechas del astrolabio: vectores y matrices a mano",
    kind: "lesson",
    difficulty: 3,
    skills: ["algebra-lineal", "vectores"],
    requires: ["m-derivadas"],
    story: "El astrolabio representa direcciones como flechas y transformaciones como tablas. Antes de delegar en NumPy, constrúyelo con tus manos para entender qué calcula.",
    objective: "Implementar producto escalar, norma, similitud del coseno y producto de matrices con listas, y relacionarlos con datos.",
    before: ["Listas", "Sumatorias", "Comprensiones"],
    intuition: [
      "- Un **vector** es una lista ordenada de números: un punto o una dirección. Una fila de datos es un vector.",
      "- **Producto escalar**: a·b = Σ aᵢbᵢ.",
      "- **Norma**: ‖a‖ = √(a·a), la longitud.",
      "- **Coseno**: (a·b)/(‖a‖‖b‖) ∈ [−1, 1]: 1 = misma dirección, 0 = perpendiculares. Es la base de la búsqueda semántica.",
      "- **Producto de matrices**: (AB)ᵢⱼ = Σₖ Aᵢₖ·Bₖⱼ (fila de A por columna de B).",
    ],
    formal: "Desigualdad de Cauchy-Schwarz: |a·b| ≤ ‖a‖‖b‖, por eso el coseno está entre −1 y 1. La correlación de Pearson es el coseno de los vectores centrados.",
    example: {
      code: py`a, b = [1, 2, 2], [2, 0, 1]
punto = sum(x * y for x, y in zip(a, b))
norma_a = sum(x * x for x in a) ** 0.5
print(punto, norma_a)`,
      lines: ["Dos vectores de 3 componentes.", "a·b = 2 + 0 + 2 = 4.", "‖a‖ = √9 = 3.", "4 3.0"],
    },
    challenge: [
      "Sin NumPy, escribe:",
      "1. `punto(a, b)` (lanza `ValueError` si las longitudes difieren).",
      "2. `norma(a)`.",
      "3. `coseno(a, b)`.",
      "4. `matmul(A, B)` para matrices como listas de filas (lanza `ValueError` si las dimensiones no encajan).",
      "5. `correlacion(x, y)`: Pearson calculado como el coseno de los vectores centrados (resta su media).",
    ],
    starter: py`def punto(a, b):
    return sum(a) * sum(b)

def norma(a):
    return sum(a)

def coseno(a, b):
    return 0

def matmul(A, B):
    return A

def correlacion(x, y):
    return 0`,
    solution: py`def punto(a, b):
    if len(a) != len(b):
        raise ValueError("Longitudes distintas")
    return sum(x * y for x, y in zip(a, b))

def norma(a):
    return punto(a, a) ** 0.5

def coseno(a, b):
    return punto(a, b) / (norma(a) * norma(b))

def matmul(A, B):
    if len(A[0]) != len(B):
        raise ValueError("Dimensiones incompatibles")
    columnas = list(zip(*B))
    return [[punto(fila, col) for col in columnas] for fila in A]

def correlacion(x, y):
    mx, my = sum(x) / len(x), sum(y) / len(y)
    return coseno([v - mx for v in x], [v - my for v in y])`,
    tests: py`
def test_punto_norma():
    "Producto escalar y norma"
    assert t.get("punto", "function")([1, 2, 2], [2, 0, 1]) == 4 and approx(t.get("norma", "function")([3, 4]), 5)
    try:
        t.get("punto")([1], [1, 2])
    except ValueError:
        pass
    else:
        assert False, "Longitudes distintas deben lanzar ValueError"

def test_coseno():
    "Coseno"
    c = t.get("coseno", "function")
    assert approx(c([1, 0], [0, 5]), 0) and approx(c([1, 1], [2, 2]), 1) and approx(c([1, 0], [-3, 0]), -1)

def test_matmul():
    "Producto de matrices"
    m = t.get("matmul", "function")
    assert m([[1, 2], [3, 4]], [[5, 6], [7, 8]]) == [[19, 22], [43, 50]]
    assert m([[1, 2, 3]], [[1], [0], [2]]) == [[7]]
    try:
        m([[1, 2]], [[1, 2]])
    except ValueError:
        pass
    else:
        assert False

def test_correlacion():
    "Pearson como coseno centrado"
    import statistics
    x, y = [1, 2, 3, 4, 5, 6], [2, 1, 4, 3, 7, 8]
    assert approx(t.get("correlacion", "function")(x, y), statistics.correlation(x, y))
`,
    hints: [
      "`sum(x * y for x, y in zip(a, b))`.",
      "Las columnas de B son `zip(*B)`.",
      "Correlación: resta la media a cada vector y llama a tu `coseno`.",
    ],
    errors: [
      { error: "zip corta en silencio vectores de distinta longitud", fix: "Comprueba las longitudes antes: zip no avisa." },
      { error: "Confundir producto de matrices con producto elemento a elemento", fix: "En (AB)ᵢⱼ se suma sobre k la fila i de A por la columna j de B." },
    ],
    quiz: {
      question: "Dos documentos tienen similitud del coseno 0 entre sus vectores de palabras (no negativos). ¿Qué significa?",
      options: [
        { text: "No comparten ninguna palabra con peso" },
        { text: "Son idénticos" },
        { text: "Son opuestos" },
        { text: "Uno es el doble de largo que el otro" },
      ],
      answer: 0,
      explanation: "Con vectores no negativos, el coseno es 0 solo si el producto escalar es 0: ninguna dimensión coincide.",
    },
    review: "Repasa producto escalar, norma y coseno, y su relación con la correlación.",
    xp: 70,
    coins: 10,
  },
  {
    id: "e-variables",
    world: "w4",
    zone: "Estadística descriptiva",
    title: "El censo del imperio: población, muestra y tipos de variables",
    kind: "lesson",
    difficulty: 2,
    skills: ["tipos-variables", "frecuencias"],
    requires: ["m-vectores"],
    story: "El emperador quiere conocer a su pueblo, pero no puede preguntar a todos. Antes de calcular nada, el estadístico real define a quién se refiere cada cifra y qué tipo de dato mide.",
    objective: "Distinguir población/muestra y parámetro/estadístico, clasificar variables por tipo y escala, y construir tablas de frecuencias.",
    before: ["Diccionarios", "Listas"],
    intuition: [
      "- **Población**: todos los individuos de interés. **Muestra**: el subconjunto observado.",
      "- **Parámetro**: resumen de la población (μ, σ, p); suele ser desconocido. **Estadístico**: resumen de la muestra (x̄, s, p̂) que lo estima.",
      "",
      "Tipos de variables y escalas de medida:",
      "- **Cualitativa nominal**: categorías sin orden (color, grupo sanguíneo).",
      "- **Cualitativa ordinal**: categorías con orden (nivel educativo, escala Likert).",
      "- **Cuantitativa discreta**: conteos (hijos, visitas).",
      "- **Cuantitativa continua**: medidas (peso, tiempo). De **intervalo** (temperatura en °C, sin cero absoluto) o de **razón** (peso, con cero real: «el doble» tiene sentido).",
      "",
      "El tipo de variable determina qué resúmenes y gráficos tienen sentido: la media de una variable nominal no significa nada.",
    ],
    example: {
      code: py`from collections import Counter
respuestas = ["bajo", "alto", "medio", "medio", "alto", "medio"]
orden = ["bajo", "medio", "alto"]
conteo = Counter(respuestas)
acum = 0
for nivel in orden:
    acum += conteo[nivel]
    print(nivel, conteo[nivel], round(conteo[nivel] / len(respuestas), 2), acum)`,
      lines: ["Contador de frecuencias.", "Una variable ordinal.", "Su orden natural (no alfabético).", "Frecuencias absolutas.", "Frecuencia acumulada.", "Recorre las categorías en orden…", "…acumula…", "…y muestra absoluta, relativa y acumulada."],
    },
    challenge: [
      "1. `tabla_frecuencias(datos, orden=None)`: lista de tuplas `(categoria, absoluta, relativa, acumulada_relativa)`; si se da `orden`, úsalo; si no, ordena las categorías de mayor a menor frecuencia (empates alfabéticos). Relativas redondeadas a 4.",
      "2. `clasificar(descripcion)`: recibe un diccionario con claves `numerica` (bool), `orden` (bool), `conteo` (bool) y `cero_absoluto` (bool), y devuelve uno de: `\"nominal\"`, `\"ordinal\"`, `\"discreta\"`, `\"continua-intervalo\"`, `\"continua-razon\"`.",
    ],
    starter: py`def tabla_frecuencias(datos, orden=None):
    return []

def clasificar(descripcion):
    return "nominal"`,
    solution: py`from collections import Counter

def tabla_frecuencias(datos, orden=None):
    n = len(datos)
    c = Counter(datos)
    categorias = orden if orden is not None else sorted(c, key=lambda k: (-c[k], k))
    tabla, acum = [], 0
    for cat in categorias:
        acum += c[cat]
        tabla.append((cat, c[cat], round(c[cat] / n, 4), round(acum / n, 4)))
    return tabla

def clasificar(d):
    if not d["numerica"]:
        return "ordinal" if d["orden"] else "nominal"
    if d["conteo"]:
        return "discreta"
    return "continua-razon" if d["cero_absoluto"] else "continua-intervalo"`,
    tests: py`
def test_tabla_orden():
    "Con orden explícito"
    r = t.get("tabla_frecuencias", "function")(["b", "a", "c", "a", "a", "c"], orden=["a", "b", "c"])
    assert r == [("a", 3, 0.5, 0.5), ("b", 1, 0.1667, 0.6667), ("c", 2, 0.3333, 1.0)], r

def test_tabla_frecuencia():
    "Sin orden: por frecuencia descendente y empates alfabéticos"
    r = t.get("tabla_frecuencias")(["x", "y", "z", "y", "x", "w"])
    assert [c for c, *_ in r] == ["x", "y", "w", "z"] and r[-1][3] == 1.0

def test_clasificar():
    "Clasifica tipos de variable"
    f = t.get("clasificar", "function")
    base = {"numerica": False, "orden": False, "conteo": False, "cero_absoluto": False}
    assert f(base) == "nominal"
    assert f({**base, "orden": True}) == "ordinal"
    assert f({**base, "numerica": True, "conteo": True}) == "discreta"
    assert f({**base, "numerica": True}) == "continua-intervalo"
    assert f({**base, "numerica": True, "cero_absoluto": True}) == "continua-razon"
`,
    hints: [
      "`Counter(datos)` cuenta; `sorted(c, key=lambda k: (-c[k], k))` ordena por frecuencia y luego alfabéticamente.",
      "La acumulada se suma en el orden de la tabla.",
      "En `clasificar`, decide primero si es numérica; luego conteo; luego el cero absoluto.",
    ],
    errors: [
      { error: "Ordenar una variable ordinal alfabéticamente", fix: "«alto, bajo, medio» rompe el orden natural. Usa el orden explícito." },
      { error: "Calcular la media de códigos numéricos de categorías", fix: "Si 1 = rojo y 2 = azul, la media 1,5 no significa nada." },
    ],
    quiz: {
      question: "Una encuesta a 500 votantes da 42 % de intención de voto. ¿Qué es ese 42 %?",
      options: [
        { text: "Un estadístico (p̂) que estima el parámetro p de la población" },
        { text: "El parámetro de la población" },
        { text: "Una variable ordinal" },
        { text: "La probabilidad exacta de que gane" },
      ],
      answer: 0,
      explanation: "Se calcula con la muestra; el valor real en la población (p) es desconocido y se estima con incertidumbre.",
    },
    review: "Repasa población/muestra, parámetro/estadístico y las escalas de medida.",
    xp: 55,
    coins: 8,
  },
  {
    id: "e-centro",
    world: "w4",
    zone: "Estadística descriptiva",
    title: "El corazón de los datos: media, mediana y moda",
    kind: "lesson",
    difficulty: 2,
    skills: ["tendencia-central"],
    requires: ["e-variables"],
    story: "En la aldea, nueve campesinos ganan 10 monedas y el barón 910. «¡El ingreso medio es 100!», proclama el barón. El estadístico del imperio sabe que esa cifra engaña.",
    objective: "Calcular media, mediana, moda, media ponderada, geométrica y armónica a mano, elegir la adecuada y compararlas con `statistics`.",
    before: ["Sumatorias", "Tipos de variables"],
    intuition: [
      "- **Media** x̄ = Σxᵢ/n: el punto de equilibrio. Sensible a valores extremos.",
      "- **Mediana**: el valor central de los datos ordenados (media de los dos centrales si n es par). Robusta.",
      "- **Moda**: el valor más frecuente. La única con sentido en variables nominales.",
      "- **Media ponderada**: cuando cada valor pesa distinto (créditos de asignaturas).",
      "- **Media geométrica**: para tasas multiplicativas (crecimientos).",
      "- **Media armónica**: para promediar razones con numerador fijo (velocidades sobre la misma distancia).",
      "",
      "Con distribuciones **asimétricas**, informa de la mediana (y de la media si interesa el total).",
    ],
    formal: "x̄ minimiza Σ(xᵢ − c)²; la mediana minimiza Σ|xᵢ − c|. Para positivos: armónica ≤ geométrica ≤ aritmética.",
    example: {
      code: py`import statistics as st
ingresos = [10] * 9 + [910]
print(st.mean(ingresos), st.median(ingresos), st.mode(ingresos))
velocidades = [60, 40]
print(round(st.harmonic_mean(velocidades), 2))`,
      lines: ["Módulo de estadística de la biblioteca estándar.", "Nueve ingresos de 10 y uno de 910.", "Media 100, mediana 10, moda 10: la media no representa a nadie.", "Ida a 60 km/h y vuelta a 40 km/h por la misma distancia.", "Velocidad media real: 48 (no 50)."],
    },
    challenge: [
      "Sin usar `statistics` ni NumPy, implementa:",
      "1. `media(x)`, `mediana(x)` (n par e impar) y `modas(x)` (lista ordenada con todos los valores de máxima frecuencia).",
      "2. `media_armonica(x)`.",
      "3. `resumen_centro(x)`: diccionario con `media`, `mediana`, `modas` y `asimetria` = `\"derecha\"` si media > mediana + 0,1·DE (poblacional), `\"izquierda\"` si media < mediana − 0,1·DE, si no `\"aprox. simetrica\"`.",
    ],
    starter: py`def media(x):
    return sum(x) / len(x)

def mediana(x):
    return x[len(x) // 2]

def modas(x):
    return [max(x)]

def media_armonica(x):
    return sum(x) / len(x)

def resumen_centro(x):
    return {}`,
    solution: py`from collections import Counter

def media(x):
    return sum(x) / len(x)

def mediana(x):
    s = sorted(x)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2

def modas(x):
    c = Counter(x)
    top = max(c.values())
    return sorted(v for v, k in c.items() if k == top)

def media_armonica(x):
    return len(x) / sum(1 / v for v in x)

def resumen_centro(x):
    m, me = media(x), mediana(x)
    de = (sum((v - m) ** 2 for v in x) / len(x)) ** 0.5
    if m > me + 0.1 * de:
        forma = "derecha"
    elif m < me - 0.1 * de:
        forma = "izquierda"
    else:
        forma = "aprox. simetrica"
    return {"media": m, "mediana": me, "modas": modas(x), "asimetria": forma}`,
    tests: py`
import statistics as st

def test_media_mediana():
    "Media y mediana (par e impar, sin ordenar)"
    assert approx(t.get("media", "function")([3, 1, 2]), 2)
    me = t.get("mediana", "function")
    assert me([5, 1, 3]) == 3 and me([4, 1, 3, 2]) == 2.5 and me([7]) == 7

def test_no_usa_statistics():
    "Implementado a mano"
    assert "statistics" not in t.code and "numpy" not in t.code

def test_modas():
    "Todas las modas, ordenadas"
    f = t.get("modas", "function")
    assert f([1, 2, 2, 3, 3]) == [2, 3] and f(["b", "a", "b"]) == ["b"]

def test_armonica():
    "Media armónica"
    assert approx(t.get("media_armonica", "function")([60, 40]), 48)

def test_resumen():
    "Detecta asimetría"
    r = t.get("resumen_centro", "function")
    assert r([10] * 9 + [910])["asimetria"] == "derecha"
    assert r([1, 2, 3, 4, 5])["asimetria"] == "aprox. simetrica"
    assert r([1, 50, 51, 52, 53])["asimetria"] == "izquierda"
    datos = [2, 4, 4, 5, 9]
    out = r(datos)
    assert approx(out["media"], st.mean(datos)) and out["mediana"] == st.median(datos) and out["modas"] == [4]
`,
    hints: [
      "Para la mediana, ordena primero: `s = sorted(x)`.",
      "Con `Counter`, la frecuencia máxima es `max(c.values())`.",
      "Armónica: n / Σ(1/xᵢ).",
    ],
    errors: [
      { error: "Mediana sin ordenar", fix: "La mediana es el valor central de los datos **ordenados**." },
      { error: "Informar solo la media con datos asimétricos", fix: "Ingresos, tiempos de espera o precios de vivienda suelen ser asimétricos: la mediana describe mejor el caso típico." },
    ],
    quiz: {
      question: "Los tiempos de espera en urgencias tienen media 95 min y mediana 40 min. ¿Qué describe mejor la espera típica?",
      options: [
        { text: "La mediana: la mitad de los pacientes espera 40 min o menos; unos pocos casos muy largos inflan la media" },
        { text: "La media, porque usa todos los datos", misconception: "media-vs-mediana" },
        { text: "Ninguna: hay un error en los datos" },
        { text: "La media de ambas: 67,5 min" },
      ],
      answer: 0,
      explanation: "Media muy por encima de la mediana indica asimetría a la derecha. Para gestionar recursos totales la media también es útil, pero no describe el caso típico.",
    },
    advanced: {
      title: "Media recortada",
      prompt: "Escribe `media_recortada(x, prop)` que elimine la proporción `prop` de valores en cada extremo (redondeando hacia abajo el número de valores) y promedie el resto. Compara con scipy.stats.trim_mean.",
      starter: py`def media_recortada(x, prop):
    return sum(x) / len(x)`,
      solution: py`def media_recortada(x, prop):
    s = sorted(x)
    k = int(len(s) * prop)
    centro = s[k:len(s) - k]
    return sum(centro) / len(centro)`,
      tests: py`
def test_mr():
    "Coincide con scipy.stats.trim_mean"
    from scipy import stats
    x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]
    assert approx(t.get("media_recortada", "function")(x, 0.1), stats.trim_mean(x, 0.1))
`,
    },
    review: "Repasa cuándo usar media, mediana o moda, y qué revela su diferencia.",
    xp: 65,
    coins: 10,
  },
  {
    id: "e-dispersion",
    world: "w4",
    zone: "Estadística descriptiva",
    title: "La anchura del río: varianza, desviación y dispersión",
    kind: "lesson",
    difficulty: 3,
    skills: ["dispersion", "varianza"],
    requires: ["e-centro"],
    story: "Dos ríos tienen la misma profundidad media, pero uno es tranquilo y el otro tiene pozas traicioneras. La media no basta: hay que medir la dispersión.",
    objective: "Calcular rango, varianza y desviación estándar poblacional y muestral, IQR, desviación absoluta mediana (MAD) y coeficiente de variación, entendiendo cuándo usar cada una.",
    before: ["Media y mediana", "Sumatorias"],
    intuition: [
      "- **Rango** = máx − mín: depende solo de dos valores.",
      "- **Varianza** = media de las desviaciones al cuadrado. **Poblacional**: divide entre N. **Muestral**: divide entre **n − 1** (corrección de Bessel), porque al estimar la media con la propia muestra las desviaciones quedan un poco pequeñas.",
      "- **Desviación estándar** = √varianza, en las mismas unidades que los datos.",
      "- **IQR** = Q3 − Q1: anchura del 50 % central. Robusto.",
      "- **MAD** = mediana(|xᵢ − mediana|): la versión robusta de la DE (×1,4826 para estimar σ con datos normales).",
      "- **CV** = s / x̄: dispersión relativa. Solo tiene sentido con variables de razón positivas (no con °C).",
    ],
    formal: "σ² = (1/N) Σ(xᵢ − μ)²;  s² = (1/(n − 1)) Σ(xᵢ − x̄)².  E[s²] = σ² (insesgado), mientras que el estimador con 1/n subestima σ² por un factor (n − 1)/n.",
    example: {
      code: py`import numpy as np
x = np.array([2, 4, 4, 4, 5, 5, 7, 9])
print(x.var(ddof=0), x.std(ddof=0))
print(round(x.var(ddof=1), 4), round(x.std(ddof=1), 4))
q1, q3 = np.percentile(x, [25, 75])
print(q3 - q1)`,
      lines: ["NumPy.", "Ocho observaciones (media 5).", "Poblacional: varianza 4, DE 2.", "Muestral (ddof=1): 4.5714 y 2.1381.", "Cuartiles.", "IQR = 1.5"],
    },
    challenge: [
      "Sin NumPy, implementa:",
      "1. `varianza(x, muestral=True)` y `desviacion(x, muestral=True)`.",
      "2. `mad(x, escalada=False)`: desviación absoluta mediana; si `escalada`, multiplica por 1.4826.",
      "3. `cv(x)`: coeficiente de variación con la DE muestral; lanza `ValueError` si algún valor es ≤ 0.",
      "4. `comparar_dispersion(x)`: diccionario con `de` (muestral) y `mad_escalada` redondeados a 3, y `robusta_mas_pequena` = True si la MAD escalada es menor que la DE (indicio de atípicos).",
    ],
    starter: py`def varianza(x, muestral=True):
    m = sum(x) / len(x)
    return sum((v - m) ** 2 for v in x) / len(x)

def desviacion(x, muestral=True):
    return varianza(x)

def mad(x, escalada=False):
    return 0

def cv(x):
    return 0

def comparar_dispersion(x):
    return {}`,
    solution: py`def _mediana(x):
    s = sorted(x)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2

def varianza(x, muestral=True):
    n = len(x)
    m = sum(x) / n
    return sum((v - m) ** 2 for v in x) / (n - 1 if muestral else n)

def desviacion(x, muestral=True):
    return varianza(x, muestral) ** 0.5

def mad(x, escalada=False):
    me = _mediana(x)
    valor = _mediana([abs(v - me) for v in x])
    return valor * 1.4826 if escalada else valor

def cv(x):
    if any(v <= 0 for v in x):
        raise ValueError("El CV requiere valores positivos en escala de razón")
    return desviacion(x) / (sum(x) / len(x))

def comparar_dispersion(x):
    de, m = desviacion(x), mad(x, escalada=True)
    return {"de": round(de, 3), "mad_escalada": round(m, 3), "robusta_mas_pequena": m < de}`,
    tests: py`
import numpy as np
from scipy import stats

X = [2, 4, 4, 4, 5, 5, 7, 9]

def test_varianzas():
    "Poblacional y muestral"
    v = t.get("varianza", "function")
    assert approx(v(X, muestral=False), 4) and approx(v(X), np.var(X, ddof=1))
    assert approx(t.get("desviacion", "function")(X), np.std(X, ddof=1))

def test_mad():
    "MAD como scipy"
    f = t.get("mad", "function")
    assert approx(f(X), stats.median_abs_deviation(X)) and approx(f(X, True), stats.median_abs_deviation(X, scale="normal"), 1e-3)

def test_cv():
    "CV y validación"
    f = t.get("cv", "function")
    assert approx(f(X), np.std(X, ddof=1) / np.mean(X))
    try:
        f([1, 0, 2])
    except ValueError:
        return
    assert False

def test_comparar():
    "Detecta atípicos por la diferencia DE vs MAD"
    f = t.get("comparar_dispersion", "function")
    assert f([10, 11, 9, 10, 12, 11, 10, 95])["robusta_mas_pequena"] is True
    r = f(X)
    assert r["de"] == round(float(np.std(X, ddof=1)), 3)
`,
    hints: [
      "Divide entre `n - 1` si `muestral` y entre `n` si no.",
      "MAD: mediana de las distancias absolutas a la mediana.",
      "Reutiliza tus funciones: `desviacion` llama a `varianza`.",
    ],
    errors: [
      { error: "Usar la varianza poblacional para estimar a partir de una muestra", fix: "Con una muestra, divide entre n − 1 (ddof=1 en NumPy; pandas ya lo hace por defecto)." },
      { error: "Calcular CV de temperaturas en °C", fix: "Sin cero absoluto el cociente no tiene sentido (y la media puede ser 0 o negativa)." },
    ],
    quiz: {
      question: "Calculas la varianza de una **muestra** para estimar la de la población. ¿Entre qué divides la suma de cuadrados?",
      options: [
        { text: "n − 1, para que el estimador no subestime en promedio la varianza poblacional" },
        { text: "n, porque es el número de datos", misconception: "varianza-muestral" },
        { text: "n + 1" },
        { text: "Da exactamente igual" },
      ],
      answer: 0,
      explanation: "Las desviaciones se miden respecto a x̄, que se ajusta a la propia muestra; dividir entre n − 1 compensa esa pérdida de un grado de libertad.",
    },
    advanced: {
      title: "Bessel por simulación",
      prompt: "Simula 20 000 muestras de tamaño 5 de una normal con σ² = 4 (semilla 1, `numpy.random.default_rng`). Guarda en `media_n` y `media_n1` el promedio de las varianzas calculadas con ddof=0 y ddof=1.",
      starter: py`import numpy as np
media_n = 0
media_n1 = 0`,
      solution: py`import numpy as np
rng = np.random.default_rng(1)
m = rng.normal(0, 2, size=(20000, 5))
media_n = m.var(axis=1, ddof=0).mean()
media_n1 = m.var(axis=1, ddof=1).mean()
print(media_n, media_n1)`,
      tests: py`
def test_bessel():
    "ddof=0 subestima (≈3,2); ddof=1 acierta (≈4)"
    assert abs(t.get("media_n") - 3.2) < 0.15 and abs(t.get("media_n1") - 4) < 0.15
`,
    },
    review: "Repasa la diferencia entre varianza poblacional y muestral, y las medidas robustas (IQR, MAD).",
    xp: 70,
    coins: 10,
  },
  {
    id: "e-posicion",
    world: "w4",
    zone: "Estadística descriptiva",
    title: "Las torres de vigilancia: cuantiles, percentiles y puntuaciones z",
    kind: "lesson",
    difficulty: 3,
    skills: ["cuantiles", "puntuaciones-z"],
    requires: ["e-dispersion"],
    story: "Un arquero obtiene 88 puntos en una prueba y 410 en otra. ¿En cuál destacó más? Las torres de vigilancia comparan posiciones relativas, no números brutos.",
    objective: "Calcular cuantiles, percentiles, deciles, el resumen de cinco números y puntuaciones z, e interpretarlos.",
    before: ["Dispersión", "Mediana"],
    intuition: [
      "- El **percentil p** es el valor que deja por debajo aproximadamente el p % de los datos. Q1 = P25, mediana = P50, Q3 = P75; los **deciles** son P10, P20…",
      "- Hay varias definiciones para interpolar entre datos; NumPy usa por defecto la interpolación lineal (tipo 7).",
      "- **Resumen de cinco números**: mínimo, Q1, mediana, Q3, máximo (la base del diagrama de cajas).",
      "- **Puntuación z** = (x − x̄) / s: a cuántas desviaciones estándar está x de la media. Permite comparar escalas distintas.",
      "",
      "z = 2 es «poco habitual» solo si la distribución es aproximadamente normal; con asimetría fuerte, los percentiles son más fiables.",
    ],
    formal: "Cuantil tipo 7: posición h = (n − 1)·p (base 0); Q(p) = x₍⌊h⌋₎ + (h − ⌊h⌋)(x₍⌊h⌋+1₎ − x₍⌊h⌋₎).",
    example: {
      code: py`import numpy as np
notas = np.array([55, 61, 64, 70, 72, 75, 78, 81, 88, 96])
print(np.percentile(notas, [25, 50, 75]))
z = (82 - notas.mean()) / notas.std(ddof=1)
print(round(z, 2))`,
      lines: ["NumPy.", "Diez notas ordenadas.", "Q1, mediana y Q3 con interpolación lineal.", "Puntuación z de un 82.", "0,64: el 82 está 0,64 desviaciones típicas por encima de la media."],
    },
    challenge: [
      "Sin NumPy:",
      "1. `cuantil(x, p)` con interpolación lineal (tipo 7, como NumPy).",
      "2. `cinco_numeros(x)`: tupla (mín, Q1, mediana, Q3, máx).",
      "3. `puntuaciones_z(x)`: lista de z usando la DE muestral.",
      "4. `rango_percentil(x, valor)`: porcentaje de datos estrictamente menores que `valor` más la mitad de los iguales (redondeado a 1).",
      "5. `comparar(x1, a, x2, b)`: devuelve 1 o 2 según en qué prueba (datos x1 con resultado a, o x2 con resultado b) la puntuación z es mayor.",
    ],
    starter: py`def cuantil(x, p):
    s = sorted(x)
    return s[int(p * len(s))]

def cinco_numeros(x):
    return (min(x), 0, 0, 0, max(x))

def puntuaciones_z(x):
    return x

def rango_percentil(x, valor):
    return 50

def comparar(x1, a, x2, b):
    return 1 if a > b else 2`,
    solution: py`def cuantil(x, p):
    s = sorted(x)
    h = (len(s) - 1) * p
    lo = int(h)
    hi = min(lo + 1, len(s) - 1)
    return s[lo] + (h - lo) * (s[hi] - s[lo])

def cinco_numeros(x):
    return (min(x), cuantil(x, 0.25), cuantil(x, 0.5), cuantil(x, 0.75), max(x))

def _media_de(x):
    n = len(x)
    m = sum(x) / n
    return m, (sum((v - m) ** 2 for v in x) / (n - 1)) ** 0.5

def puntuaciones_z(x):
    m, s = _media_de(x)
    return [(v - m) / s for v in x]

def rango_percentil(x, valor):
    menores = sum(v < valor for v in x)
    iguales = sum(v == valor for v in x)
    return round(100 * (menores + 0.5 * iguales) / len(x), 1)

def comparar(x1, a, x2, b):
    m1, s1 = _media_de(x1)
    m2, s2 = _media_de(x2)
    return 1 if (a - m1) / s1 > (b - m2) / s2 else 2`,
    tests: py`
import numpy as np
from scipy import stats

def test_cuantil():
    "Igual que np.percentile"
    f = t.get("cuantil", "function")
    x = [7, 1, 3, 10, 4, 6, 2]
    for p in (0, 0.1, 0.25, 0.5, 0.9, 1):
        assert approx(f(x, p), np.percentile(x, p * 100)), f"p = {p}"

def test_cinco():
    "Resumen de cinco números"
    x = [55, 61, 64, 70, 72, 75, 78, 81, 88, 96]
    r = t.get("cinco_numeros", "function")(x)
    assert all(approx(a, b) for a, b in zip(r, [55, *np.percentile(x, [25, 50, 75]), 96]))

def test_z():
    "Puntuaciones z como scipy.stats.zscore(ddof=1)"
    x = [3, 8, 10, 15, 4]
    assert np.allclose(t.get("puntuaciones_z", "function")(x), stats.zscore(x, ddof=1))

def test_rango():
    "Rango percentil como scipy (kind='mean')"
    x = [1, 2, 2, 3, 4, 5, 6, 7, 8, 9]
    for v in (2, 5.5, 9):
        assert approx(t.get("rango_percentil", "function")(x, v), round(stats.percentileofscore(x, v, kind="mean"), 1))

def test_comparar():
    "Compara posiciones relativas"
    pruebaA = [60, 70, 75, 80, 85, 90]
    pruebaB = [300, 350, 380, 400, 420, 450]
    assert t.get("comparar", "function")(pruebaA, 88, pruebaB, 410) == 1
    assert t.get("comparar")(pruebaA, 76, pruebaB, 440) == 2
`,
    hints: [
      "Posición h = (n − 1)·p sobre los datos ordenados; interpola entre s[⌊h⌋] y el siguiente.",
      "Cuidado con p = 1: el índice siguiente no existe (usa `min(lo + 1, n - 1)`).",
      "z = (x − media)/DE muestral.",
    ],
    errors: [
      { error: "Percentiles distintos a los de otro programa", fix: "Existen al menos nueve definiciones de cuantil. Indica cuál usas; con muestras grandes las diferencias son mínimas." },
      { error: "Interpretar |z| > 2 como raro con datos muy asimétricos", fix: "La regla 68-95-99,7 solo vale con normalidad aproximada." },
    ],
    quiz: {
      question: "Un niño está en el percentil 90 de altura para su edad. ¿Qué significa?",
      options: [
        { text: "Mide más que aproximadamente el 90 % de los niños de referencia de su edad" },
        { text: "Mide un 90 % más que la media" },
        { text: "Tiene un 90 % de probabilidad de ser alto de adulto" },
        { text: "Está 90 cm por encima de la mediana" },
      ],
      answer: 0,
      explanation: "El percentil indica posición relativa dentro de la distribución de referencia, no una cantidad ni una probabilidad futura.",
    },
    review: "Repasa cómo se interpolan los cuantiles y cuándo la puntuación z es interpretable.",
    xp: 70,
    coins: 10,
  },
  {
    id: "e-forma",
    world: "w4",
    zone: "Estadística descriptiva",
    title: "La silueta de la montaña: asimetría, curtosis y atípicos",
    kind: "lesson",
    difficulty: 3,
    skills: ["forma", "atipicos"],
    requires: ["e-posicion"],
    story: "Desde lejos, cada montaña tiene una silueta: simétrica, inclinada, con dos picos o con laderas muy largas. La forma de una distribución cuenta tanto como su centro.",
    objective: "Calcular asimetría y curtosis, detectar multimodalidad y atípicos, y elegir resúmenes según la forma.",
    before: ["Cuantiles", "Dispersión"],
    packages: ["numpy", "scipy"],
    intuition: [
      "- **Asimetría** (skewness): > 0 cola larga a la derecha (ingresos); < 0 cola a la izquierda (edad al fallecer en países ricos); ≈ 0 simétrica.",
      "- **Curtosis** (exceso): mide el peso de las colas respecto a la normal (que tiene exceso 0). Positiva: más valores extremos de los que esperarías con una normal.",
      "- **Multimodalidad**: varios picos sugieren grupos mezclados (p. ej. alturas de niños y adultos juntos). Resúmenes como la media pueden caer donde no hay nadie.",
      "- **Atípicos**: regla de Tukey (1,5·IQR) o |z| robusta con la MAD.",
      "",
      "Antes de resumir, **mira el histograma**. Los números de forma son estimaciones ruidosas con n pequeño.",
    ],
    formal: "g₁ = m₃/m₂^{3/2}, g₂ = m₄/m₂² − 3, con mₖ = (1/n)Σ(xᵢ − x̄)ᵏ (momentos centrales; estimadores sesgados, como scipy por defecto).",
    example: {
      code: py`import numpy as np
from scipy import stats
rng = np.random.default_rng(0)
ingresos = rng.lognormal(10, 0.8, 5000)
print(round(stats.skew(ingresos), 2), round(stats.kurtosis(ingresos), 2))
print(round(np.mean(ingresos)), round(np.median(ingresos)))`,
      lines: ["NumPy.", "Funciones estadísticas de SciPy.", "Generador con semilla.", "Ingresos simulados (lognormal, muy asimétrica).", "Asimetría y exceso de curtosis claramente positivos.", "La media supera con creces a la mediana."],
    },
    challenge: [
      "1. `asimetria(x)` y `curtosis_exceso(x)` con las fórmulas de momentos (deben coincidir con `scipy.stats.skew` y `scipy.stats.kurtosis`).",
      "2. `atipicos_robustos(x, umbral=3.5)`: valores con |0.6745·(x − mediana)/MAD| > umbral (puntuación z modificada de Iglewicz-Hoaglin), en el orden original.",
      "3. `describir_forma(x)`: diccionario con `asimetria` y `curtosis` redondeadas a 2, y `etiqueta` = \"simétrica\" si |asimetría| < 0.5, \"asimétrica derecha\" si ≥ 0.5, \"asimétrica izquierda\" si ≤ −0.5.",
    ],
    starter: py`def asimetria(x):
    return 0

def curtosis_exceso(x):
    return 0

def atipicos_robustos(x, umbral=3.5):
    return []

def describir_forma(x):
    return {}`,
    solution: py`def _momento(x, k):
    m = sum(x) / len(x)
    return sum((v - m) ** k for v in x) / len(x)

def asimetria(x):
    return _momento(x, 3) / _momento(x, 2) ** 1.5

def curtosis_exceso(x):
    return _momento(x, 4) / _momento(x, 2) ** 2 - 3

def _mediana(x):
    s = sorted(x)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2

def atipicos_robustos(x, umbral=3.5):
    me = _mediana(x)
    mad = _mediana([abs(v - me) for v in x])
    if mad == 0:
        return []
    return [v for v in x if abs(0.6745 * (v - me) / mad) > umbral]

def describir_forma(x):
    g1, g2 = asimetria(x), curtosis_exceso(x)
    if g1 >= 0.5:
        etiqueta = "asimétrica derecha"
    elif g1 <= -0.5:
        etiqueta = "asimétrica izquierda"
    else:
        etiqueta = "simétrica"
    return {"asimetria": round(g1, 2), "curtosis": round(g2, 2), "etiqueta": etiqueta}`,
    tests: py`
import numpy as np
from scipy import stats
rng = np.random.default_rng(3)
L = list(rng.lognormal(0, 0.7, 400))
N = list(rng.normal(50, 5, 400))

def test_momentos():
    "Coinciden con scipy"
    for datos in (L, N, [1, 2, 3, 10]):
        assert approx(t.get("asimetria", "function")(datos), stats.skew(datos), 1e-9)
        assert approx(t.get("curtosis_exceso", "function")(datos), stats.kurtosis(datos), 1e-9)

def test_atipicos():
    "z robusta modificada"
    x = [10, 11, 12, 11, 10, 12, 11, 40, -15]
    assert t.get("atipicos_robustos", "function")(x) == [40, -15]

def test_forma():
    "Etiquetas de forma"
    f = t.get("describir_forma", "function")
    assert f(L)["etiqueta"] == "asimétrica derecha" and f(N)["etiqueta"] == "simétrica"
    assert f([-v for v in L])["etiqueta"] == "asimétrica izquierda"
`,
    hints: [
      "Escribe una función auxiliar para el momento central de orden k: (1/n)Σ(xᵢ − x̄)ᵏ.",
      "Asimetría = m₃ / m₂^1,5; curtosis en exceso = m₄ / m₂² − 3.",
      "Si la MAD es 0 (más de la mitad de valores iguales), la z modificada no está definida: devuelve lista vacía.",
    ],
    errors: [
      { error: "Curtosis 3 para datos normales", fix: "Hay curtosis «a secas» (normal = 3) y en exceso (normal = 0). scipy.stats.kurtosis devuelve el exceso por defecto." },
      { error: "Concluir normalidad solo porque la asimetría es ≈ 0", fix: "Una distribución bimodal simétrica tiene asimetría 0 y no es normal. Mira el histograma." },
    ],
    quiz: {
      question: "Un histograma muestra dos picos claros. ¿Qué haces antes de informar la media?",
      options: [
        { text: "Buscar si hay dos grupos mezclados y describirlos por separado" },
        { text: "Informar la media: resume bien cualquier distribución", misconception: "normalidad-universal" },
        { text: "Eliminar uno de los picos" },
        { text: "Aplicar logaritmos para que sea normal" },
      ],
      answer: 0,
      explanation: "La media de una mezcla puede caer entre los picos, donde casi no hay observaciones. La bimodalidad suele indicar subpoblaciones.",
    },
    review: "Repasa qué miden asimetría y curtosis y por qué hay que mirar el histograma.",
    xp: 75,
    coins: 11,
  },
  {
    id: "e-cajas",
    world: "w4",
    zone: "Estadística descriptiva",
    title: "El tapiz de las cajas: interpretar diagramas de caja y dispersión",
    kind: "lesson",
    difficulty: 3,
    skills: ["visualizacion", "interpretacion"],
    requires: ["e-forma"],
    story: "En el gran salón cuelgan tapices con cajas, bigotes y nubes de puntos. Los consejeros discuten qué significan. Tú construirás uno y lo leerás con precisión.",
    objective: "Calcular los elementos de un diagrama de cajas (cajas, bigotes de Tukey, atípicos) y producir una interpretación escrita de grupos comparados.",
    before: ["Cuantiles", "Atípicos", "Matplotlib"],
    packages: ["numpy", "matplotlib"],
    intuition: [
      "Un **diagrama de cajas** muestra:",
      "",
      "- la **caja**: de Q1 a Q3 (el 50 % central), con una línea en la mediana;",
      "- los **bigotes**: hasta el dato más extremo que no supera 1,5·IQR desde la caja;",
      "- los **puntos**: observaciones más allá de los bigotes.",
      "",
      "Al comparar grupos, mira medianas (centro), alturas de caja (dispersión), asimetría (posición de la mediana dentro de la caja) y atípicos. Una caja no muestra bimodalidad ni el tamaño de cada grupo: acompáñala de n o de los puntos.",
      "",
      "Un **diagrama de dispersión** muestra la relación entre dos variables: dirección, forma (¿lineal?), fuerza y puntos inusuales.",
    ],
    example: {
      code: py`import numpy as np
import matplotlib.pyplot as plt
rng = np.random.default_rng(2)
a, b = rng.normal(50, 5, 60), rng.normal(56, 9, 60)
fig, ax = plt.subplots()
ax.boxplot([a, b])
ax.set_xticks([1, 2], ["A", "B"])
ax.set(title="Comparación de grupos", ylabel="Puntuación")`,
      lines: ["NumPy.", "Matplotlib.", "Semilla.", "Dos grupos: B más alto y más disperso.", "Figura y eje.", "Diagrama de cajas de ambos.", "Etiquetas de los grupos.", "Título y eje."],
    },
    challenge: [
      "1. `elementos_caja(x)`: diccionario con `q1`, `mediana`, `q3`, `bigote_inf`, `bigote_sup` (el dato más extremo dentro de [Q1 − 1,5·IQR, Q3 + 1,5·IQR]) y `atipicos` (lista ordenada). Usa cuantiles con interpolación lineal (`numpy.percentile`).",
      "2. `comparar_grupos(grupos)`: recibe un diccionario nombre → lista y devuelve un texto de interpretación con: el grupo de mayor mediana, el de mayor IQR y cuántos atípicos tiene cada grupo. Debe mencionar esos nombres y números.",
      "3. Dibuja `fig` con el diagrama de cajas de los grupos de `datos` (definidos en el código inicial), con título y etiqueta en el eje y.",
    ],
    starter: py`import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(7)
datos = {
    "Norte": list(rng.normal(52, 6, 80)) + [85],
    "Sur": list(rng.normal(58, 12, 80)),
    "Este": list(rng.normal(49, 4, 80)) + [20, 75],
}

def elementos_caja(x):
    return {}

def comparar_grupos(grupos):
    return ""

fig = None`,
    solution: py`import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(7)
datos = {
    "Norte": list(rng.normal(52, 6, 80)) + [85],
    "Sur": list(rng.normal(58, 12, 80)),
    "Este": list(rng.normal(49, 4, 80)) + [20, 75],
}

def elementos_caja(x):
    x = np.asarray(x, dtype=float)
    q1, me, q3 = np.percentile(x, [25, 50, 75])
    iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    dentro = x[(x >= lo) & (x <= hi)]
    return {
        "q1": q1, "mediana": me, "q3": q3,
        "bigote_inf": dentro.min(), "bigote_sup": dentro.max(),
        "atipicos": sorted(x[(x < lo) | (x > hi)].tolist()),
    }

def comparar_grupos(grupos):
    el = {k: elementos_caja(v) for k, v in grupos.items()}
    mayor_med = max(el, key=lambda k: el[k]["mediana"])
    mayor_iqr = max(el, key=lambda k: el[k]["q3"] - el[k]["q1"])
    partes = [f"{k}: {len(e['atipicos'])} atípicos" for k, e in el.items()]
    return (f"{mayor_med} tiene la mediana más alta ({el[mayor_med]['mediana']:.1f}). "
            f"{mayor_iqr} es el más disperso (IQR {el[mayor_iqr]['q3'] - el[mayor_iqr]['q1']:.1f}). "
            + "; ".join(partes) + ".")

fig, ax = plt.subplots()
ax.boxplot(list(datos.values()))
ax.set_xticks(range(1, len(datos) + 1), list(datos))
ax.set(title="Puntuación por región", ylabel="Puntuación")
print(comparar_grupos(datos))`,
    tests: py`
import numpy as np

def test_elementos():
    "Elementos de la caja"
    x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 30]
    e = t.get("elementos_caja", "function")(x)
    q1, me, q3 = np.percentile(x, [25, 50, 75])
    assert approx(e["q1"], q1) and approx(e["mediana"], me) and approx(e["q3"], q3)
    assert e["bigote_inf"] == 1 and e["bigote_sup"] == 9 and e["atipicos"] == [30]

def test_comparar():
    "La interpretación nombra al grupo correcto"
    d = t.get("datos")
    txt = t.get("comparar_grupos", "function")(d)
    meds = {k: np.median(v) for k, v in d.items()}
    iqrs = {k: np.subtract(*np.percentile(v, [75, 25])) for k, v in d.items()}
    assert max(meds, key=meds.get) in txt.split(".")[0], "La primera frase debe nombrar al grupo de mayor mediana"
    assert max(iqrs, key=iqrs.get) in txt
    for k in d:
        n_at = len(t.get("elementos_caja")(d[k])["atipicos"])
        assert f"{k}: {n_at}" in txt, f"Menciona los atípicos de {k} como '{k}: {n_at}'"

def test_figura():
    "Figura con cajas, título y eje"
    fig = t.get("fig")
    ax = fig.axes[0]
    assert ax.get_title() and ax.get_ylabel()
    assert [l.get_text() for l in ax.get_xticklabels()] == list(t.get("datos"))
`,
    hints: [
      "`np.percentile(x, [25, 50, 75])` da Q1, mediana y Q3.",
      "Los bigotes son el mínimo y el máximo de los datos que quedan dentro de los límites.",
      "Construye el texto con f-strings: así siempre coincide con los cálculos.",
    ],
    errors: [
      { error: "Bigotes dibujados hasta los límites teóricos", fix: "Los bigotes llegan al dato más extremo dentro de los límites, no al límite mismo." },
      { error: "Comparar cajas sin mirar n", fix: "Una caja de 5 datos y otra de 500 parecen igual de fiables. Indica el tamaño de cada grupo." },
    ],
    quiz: {
      question: "En un diagrama de cajas, la mediana está muy cerca de Q1 y el bigote superior es largo. ¿Qué indica?",
      options: [
        { text: "Asimetría a la derecha" },
        { text: "Asimetría a la izquierda" },
        { text: "Distribución normal" },
        { text: "Que hay un error en el gráfico" },
      ],
      answer: 0,
      explanation: "Los valores se concentran abajo y se estiran hacia arriba: cola derecha larga.",
    },
    review: "Repasa qué representa cada elemento del diagrama de cajas y qué no puede mostrar.",
    xp: 75,
    coins: 11,
  },
];
