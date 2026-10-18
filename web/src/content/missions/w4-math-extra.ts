import { py, type Mission } from "../types";

// Mundo 4 · Zona 1 (matemáticas fundamentales): álgebra y ecuaciones, funciones, álgebra lineal
// con NumPy e integrales. Conectan la aritmética con la estadística y el machine learning.

export const W4_MATH: Mission[] = [
  {
    id: "m-ecuaciones",
    world: "w4",
    zone: "Matemáticas fundamentales",
    title: "La balanza del alquimista: álgebra, ecuaciones y bisección",
    kind: "lesson",
    difficulty: 2,
    skills: ["algebra", "ecuaciones", "metodos-numericos"],
    requires: ["m-logaritmos"],
    story: "El alquimista mezcla dos pociones y necesita saber cuánto poner de cada una. Algunas de sus ecuaciones se resuelven despejando; otras no tienen fórmula y hay que acorralar la solución paso a paso.",
    objective: "Despejar ecuaciones lineales, resolver cuadráticas y sistemas 2×2, y encontrar raíces numéricamente con el método de bisección.",
    before: ["Operadores aritméticos", "Funciones", "Excepciones"],
    intuition: [
      "Una ecuación es una **balanza**: si haces lo mismo a los dos lados, sigue equilibrada. Despejar x en 3x + 4 = 19 es restar 4 a ambos lados (3x = 15) y dividir entre 3 (x = 5).",
      "",
      "- **Cuadrática** ax² + bx + c = 0: el **discriminante** Δ = b² − 4ac dice cuántas soluciones reales hay (dos si Δ > 0, una si Δ = 0, ninguna si Δ < 0).",
      "- **Sistema 2×2**: dos rectas que se cortan en un punto. Si son paralelas (determinante 0) no hay solución única.",
      "- **Sin fórmula** (por ejemplo x³ − x − 2 = 0, o la tasa de interés implícita de un préstamo): si f(a) y f(b) tienen signos distintos, entre a y b hay una raíz. La **bisección** mira el punto medio, se queda con la mitad donde sigue el cambio de signo y repite. Cada paso divide el error a la mitad.",
      "",
      "Muchos estimadores estadísticos (máxima verosimilitud, la TIR de una inversión) se calculan así: resolviendo numéricamente una ecuación.",
    ],
    formal: [
      "a·x + b = c ⇒ x = (c − b)/a (a ≠ 0) · ax² + bx + c = 0 ⇒ x = (−b ± √Δ)/(2a)",
      "",
      "Cramer: x = (c₁b₂ − b₁c₂)/D, y = (a₁c₂ − c₁a₂)/D con D = a₁b₂ − b₁a₂.",
      "",
      "Bisección: tras n pasos el intervalo mide (b − a)/2ⁿ, y la raíz está dentro.",
    ],
    example: {
      code: py`a, b, c = 1, -3, 2
delta = b ** 2 - 4 * a * c
r1 = (-b + delta ** 0.5) / (2 * a)
r2 = (-b - delta ** 0.5) / (2 * a)
print(delta, r1, r2)
print(r1 ** 2 - 3 * r1 + 2)`,
      lines: [
        "Coeficientes de x² − 3x + 2 = 0.",
        "Discriminante: 9 − 8 = 1 (positivo: dos raíces).",
        "Raíz con +√Δ: (3 + 1)/2 = 2.",
        "Raíz con −√Δ: (3 − 1)/2 = 1.",
        "Muestra 1 2.0 1.0.",
        "Comprobación: sustituir la raíz da 0.0. Verificar es parte del cálculo.",
      ],
    },
    challenge: [
      "Escribe estas funciones:",
      "1. `resolver_lineal(a, b, c)`: la x que cumple a·x + b = c (lanza `ValueError` si a es 0).",
      "2. `raices_cuadratica(a, b, c)`: lista **ordenada** de raíces reales de ax² + bx + c = 0 (vacía si Δ < 0, un solo elemento si Δ = 0; `ValueError` si a es 0).",
      "3. `sistema_2x2(a1, b1, c1, a2, b2, c2)`: tupla (x, y) que resuelve a1·x + b1·y = c1 y a2·x + b2·y = c2 por Cramer (`ValueError` si el determinante es 0).",
      "4. `biseccion(f, a, b, tol=1e-8)`: raíz de f en [a, b] por bisección. Lanza `ValueError` si f(a) y f(b) tienen el mismo signo. Devuelve el punto medio cuando el intervalo mida menos que `tol` (si f vale 0 exactamente en un punto, devuélvelo).",
    ],
    starter: py`def resolver_lineal(a, b, c):
    return c / a - b

def raices_cuadratica(a, b, c):
    delta = b ** 2 - 4 * a * c
    return [(-b + delta ** 0.5) / 2 * a, (-b - delta ** 0.5) / 2 * a]

def sistema_2x2(a1, b1, c1, a2, b2, c2):
    return (c1 / a1, c2 / b2)

def biseccion(f, a, b, tol=1e-8):
    return (a + b) / 2`,
    solution: py`def resolver_lineal(a, b, c):
    if a == 0:
        raise ValueError("Con a = 0 la ecuación no tiene solución única")
    return (c - b) / a

def raices_cuadratica(a, b, c):
    if a == 0:
        raise ValueError("No es cuadrática si a = 0")
    delta = b ** 2 - 4 * a * c
    if delta < 0:
        return []
    if delta == 0:
        return [-b / (2 * a)]
    r = delta ** 0.5
    return sorted([(-b - r) / (2 * a), (-b + r) / (2 * a)])

def sistema_2x2(a1, b1, c1, a2, b2, c2):
    d = a1 * b2 - b1 * a2
    if d == 0:
        raise ValueError("Determinante 0: rectas paralelas o coincidentes")
    return ((c1 * b2 - b1 * c2) / d, (a1 * c2 - c1 * a2) / d)

def biseccion(f, a, b, tol=1e-8):
    fa, fb = f(a), f(b)
    if fa == 0:
        return a
    if fb == 0:
        return b
    if fa * fb > 0:
        raise ValueError("f(a) y f(b) deben tener signos distintos")
    while b - a >= tol:
        m = (a + b) / 2
        fm = f(m)
        if fm == 0:
            return m
        if fa * fm < 0:
            b, fb = m, fm
        else:
            a, fa = m, fm
    return (a + b) / 2`,
    tests: py`
def _lanza(f, *args):
    try:
        f(*args)
    except ValueError:
        return True
    return False

def test_lineal():
    "Despeje de a·x + b = c"
    f = t.get("resolver_lineal", "function")
    assert approx(f(3, 4, 19), 5) and approx(f(-2, 1, 7), -3) and approx(f(0.5, 0, 2), 4)
    assert _lanza(f, 0, 1, 2), "Con a = 0 debe lanzar ValueError"

def test_cuadratica():
    "Dos, una o ninguna raíz real, ordenadas"
    f = t.get("raices_cuadratica", "function")
    for (a, b, c), esperado in [((1, -3, 2), [1, 2]), ((2, -4, -6), [-1, 3]), ((1, 2, 1), [-1]), ((1, 0, 1), []), ((-1, 0, 4), [-2, 2])]:
        r = f(a, b, c)
        assert len(r) == len(esperado) and all(approx(x, y) for x, y in zip(r, esperado)), f"{a}x² + {b}x + {c}: {r}"
    assert _lanza(f, 0, 1, 1)

def test_sistema():
    "Cramer y caso singular"
    f = t.get("sistema_2x2", "function")
    x, y = f(2, 1, 5, 1, -1, 1)
    assert approx(x, 2) and approx(y, 1)
    x, y = f(3, 2, 7, -1, 4, 0)
    assert approx(3 * x + 2 * y, 7) and approx(-x + 4 * y, 0)
    assert _lanza(f, 1, 2, 3, 2, 4, 6), "Rectas coincidentes: determinante 0"

def test_biseccion():
    "Raíces sin fórmula"
    f = t.get("biseccion", "function")
    r = f(lambda x: x ** 3 - x - 2, 1, 2)
    assert abs(r - 1.5213797068045676) < 1e-7, r
    r = f(lambda x: math.cos(x) - x, 0, 1, 1e-10)
    assert abs(math.cos(r) - r) < 1e-9
    assert approx(f(lambda x: x - 1, 1, 3), 1)
    assert _lanza(f, lambda x: x * x + 1, -1, 1), "Sin cambio de signo debe lanzar ValueError"
`,
    hints: [
      "Lineal: resta b a los dos lados y divide entre a.",
      "Cuadrática: calcula Δ primero y distingue los tres casos; ordena con `sorted`. Cuidado con los paréntesis: se divide entre (2 * a).",
      "Bisección: guarda f(a); en cada vuelta calcula el punto medio m y conserva la mitad en la que f cambia de signo (f(a)·f(m) < 0 → la raíz está a la izquierda).",
    ],
    errors: [
      { error: "Escribir `/ 2 * a` en vez de `/ (2 * a)`", fix: "La división y la multiplicación se evalúan de izquierda a derecha: x / 2 * a es (x / 2) · a." },
      { error: "Usar la fórmula cuadrática con Δ < 0", fix: "En Python, (−1) ** 0.5 da un número complejo, no un error: comprueba el signo de Δ antes." },
      { error: "Bisección sin cambio de signo", fix: "Si f(a) y f(b) tienen el mismo signo puede haber 0 o 2 raíces dentro: el método no garantiza nada." },
    ],
    quiz: {
      question: "Aplicas bisección en [0, 1] durante 20 pasos a una función continua con f(0) < 0 < f(1). ¿Qué puedes garantizar?",
      options: [
        { text: "Que la raíz encontrada está a menos de 1/2²⁰ ≈ 10⁻⁶ de una raíz real de f en [0, 1]" },
        { text: "Que es la única raíz de f en [0, 1]" },
        { text: "Que f vale exactamente 0 en el punto devuelto" },
        { text: "Nada: la bisección es un método aproximado sin garantías" },
      ],
      answer: 0,
      explanation: "Cada paso conserva un intervalo con cambio de signo y lo parte por la mitad: tras n pasos mide (b − a)/2ⁿ y contiene una raíz. Puede haber más raíces en [0, 1] y f no tiene por qué valer 0 exactamente en el punto medio.",
    },
    advanced: {
      title: "Newton-Raphson",
      prompt: "Escribe `newton(f, df, x0, tol=1e-12, max_iter=50)` que devuelva la tupla (raiz, iteraciones) aplicando x ← x − f(x)/f′(x) hasta que |f(x)| < tol. Lanza `RuntimeError` si no converge en `max_iter` pasos o si la derivada se anula. Newton converge mucho más rápido que la bisección cerca de la raíz, pero puede fallar lejos de ella.",
      starter: py`def newton(f, df, x0, tol=1e-12, max_iter=50):
    return x0, 0`,
      solution: py`def newton(f, df, x0, tol=1e-12, max_iter=50):
    x = x0
    for i in range(max_iter + 1):
        fx = f(x)
        if abs(fx) < tol:
            return x, i
        d = df(x)
        if d == 0:
            raise RuntimeError("Derivada nula")
        x = x - fx / d
    raise RuntimeError("No converge")`,
      tests: py`
def test_newton():
    "Raíz de 2 en pocos pasos y fallo controlado"
    f = t.get("newton", "function")
    r, n = f(lambda x: x * x - 2, lambda x: 2 * x, 1.0)
    assert abs(r - 2 ** 0.5) < 1e-10 and n <= 7, (r, n)
    try:
        f(lambda x: x * x + 1, lambda x: 2 * x, 0.5)
    except RuntimeError:
        return
    assert False, "x² + 1 no tiene raíces reales: debe lanzar RuntimeError"
`,
    },
    lab: { lab: "matematicas", tab: "funciones", label: "Funciones y derivadas" },
    review: "Repasa: Δ decide el número de raíces; determinante 0 ⇒ sin solución única; bisección: cambio de signo y error (b − a)/2ⁿ.",
    xp: 60,
    coins: 9,
  },
  {
    id: "m-funciones",
    world: "w4",
    zone: "Matemáticas fundamentales",
    title: "El observatorio de curvas: funciones, composición, inversas y gráficas",
    kind: "lesson",
    difficulty: 2,
    skills: ["funciones", "visualizacion", "matplotlib"],
    requires: ["m-ecuaciones"],
    story: "Los astrónomos del observatorio describen cada fenómeno con una curva. Te piden herramientas para encadenar curvas, invertirlas y dibujarlas sin perder la precisión.",
    objective: "Tratar funciones como objetos: componerlas, tabularlas, comprobar su monotonía, invertirlas numéricamente y representarlas con matplotlib.",
    before: ["Funciones de Python", "Bisección (misión anterior)", "Logaritmos y exponenciales"],
    packages: ["matplotlib"],
    intuition: [
      "Una **función** asigna a cada entrada de su **dominio** una única salida. En Python las funciones son valores: se pueden pasar como argumento y devolver.",
      "",
      "- **Composición** (f ∘ g)(x) = f(g(x)): primero g, después f. El orden importa.",
      "- **Inversa**: si f es estrictamente creciente, para cada y hay un único x con f(x) = y. La exponencial y el logaritmo son inversas, igual que la **sigmoide** σ(x) = 1/(1 + e⁻ˣ) y el **logit** log(p/(1 − p)), que conectan probabilidades con la regresión logística.",
      "- La gráfica de una inversa es la de f **reflejada en la recta y = x**.",
      "- Una gráfica dibuja una **tabla de puntos** unidos: con pocos puntos se pierden detalles.",
    ],
    formal: "f: A → B. f⁻¹(y) = x ⇔ f(x) = y. Si f es estrictamente monótona y continua en [a, b], la inversa existe en [f(a), f(b)].",
    example: {
      code: py`import math
def cuadrado(x):
    return x * x
def mas_uno(x):
    return x + 1
print(cuadrado(mas_uno(3)), mas_uno(cuadrado(3)))
sigma = lambda x: 1 / (1 + math.exp(-x))
logit = lambda p: math.log(p / (1 - p))
print(round(logit(sigma(1.7)), 10))`,
      lines: [
        "Módulo de matemáticas.",
        "Una función que eleva al cuadrado…",
        "…y devuelve x².",
        "Otra que suma uno…",
        "…y devuelve x + 1.",
        "(3 + 1)² = 16 frente a 3² + 1 = 10: componer no es conmutativo.",
        "La sigmoide convierte cualquier número en una probabilidad entre 0 y 1.",
        "El logit hace el camino inverso.",
        "logit(σ(1,7)) devuelve 1.7: son inversas.",
      ],
    },
    challenge: [
      "1. `componer(f, g)`: devuelve una **función** que calcula f(g(x)).",
      "2. `tabla(f, a, b, n)`: lista de n tuplas (x, f(x)) con x equiespaciados de a a b, ambos incluidos (n ≥ 2).",
      "3. `es_creciente(f, a, b, n=200)`: True si los valores de f en la tabla de n puntos son estrictamente crecientes.",
      "4. `inversa_numerica(f, y, a, b, tol=1e-10)`: el x de [a, b] con f(x) = y para una f creciente, por bisección sobre f(x) − y (`ValueError` si y no está entre f(a) y f(b)).",
      "5. `fig`: figura de matplotlib con **un** eje que muestre eˣ en [−2, 2], ln x en [0,1; 7,4] y la recta y = x, con leyenda (tres líneas con etiqueta) y título.",
    ],
    starter: py`import math
import matplotlib.pyplot as plt

def componer(f, g):
    return g(f)

def tabla(f, a, b, n):
    return [(x, f(x)) for x in range(a, b)]

def es_creciente(f, a, b, n=200):
    return f(b) > f(a)

def inversa_numerica(f, y, a, b, tol=1e-10):
    return y

fig, ax = plt.subplots()`,
    solution: py`import math
import matplotlib.pyplot as plt

def componer(f, g):
    return lambda x: f(g(x))

def tabla(f, a, b, n):
    paso = (b - a) / (n - 1)
    return [(a + i * paso, f(a + i * paso)) for i in range(n)]

def es_creciente(f, a, b, n=200):
    ys = [y for _, y in tabla(f, a, b, n)]
    return all(y2 > y1 for y1, y2 in zip(ys, ys[1:]))

def inversa_numerica(f, y, a, b, tol=1e-10):
    lo, hi = f(a) - y, f(b) - y
    if lo > 0 or hi < 0:
        raise ValueError("y no está entre f(a) y f(b)")
    while b - a > tol:
        m = (a + b) / 2
        if f(m) - y < 0:
            a = m
        else:
            b = m
    return (a + b) / 2

fig, ax = plt.subplots()
xs = [x for x, _ in tabla(math.exp, -2, 2, 200)]
ax.plot(xs, [math.exp(x) for x in xs], label="exp(x)")
zs = [x for x, _ in tabla(math.log, 0.1, 7.4, 200)]
ax.plot(zs, [math.log(z) for z in zs], label="ln(x)")
ax.plot([-2, 7.4], [-2, 7.4], linestyle="--", label="y = x")
ax.set_title("Una función y su inversa son simétricas respecto a y = x")
ax.legend()`,
    tests: py`
def test_componer():
    "f(g(x)), en ese orden"
    c = t.get("componer", "function")
    h = c(lambda x: x * x, lambda x: x + 1)
    assert callable(h), "componer debe devolver una función"
    assert h(3) == 16 and h(-1) == 0

def test_tabla():
    "Puntos equiespaciados con extremos"
    tb = t.get("tabla", "function")(lambda x: 2 * x, 0, 1, 5)
    assert len(tb) == 5
    assert all(approx(x, e) and approx(y, 2 * e) for (x, y), e in zip(tb, [0, 0.25, 0.5, 0.75, 1]))

def test_monotonia():
    "Creciente estricta"
    f = t.get("es_creciente", "function")
    assert f(math.exp, -3, 3) and f(lambda x: x ** 3, -2, 2)
    assert not f(lambda x: x * x, -1, 1) and not f(lambda x: 5, 0, 1)
    assert not f(lambda x: math.sin(10 * x), 0, 1), "Revisa todos los puntos, no solo los extremos"

def test_inversa():
    "Inversas numéricas"
    inv = t.get("inversa_numerica", "function")
    sigma = lambda x: 1 / (1 + math.exp(-x))
    assert approx(inv(sigma, 0.8, -10, 10), math.log(0.8 / 0.2), 1e-8)
    assert approx(inv(math.exp, 5, 0, 3), math.log(5), 1e-8)
    try:
        inv(math.exp, 100, 0, 3)
    except ValueError:
        return
    assert False, "y fuera de [f(a), f(b)] debe lanzar ValueError"

def test_figura():
    "Tres curvas con leyenda y título"
    fig = t.get("fig")
    assert len(fig.axes) == 1, "Usa un solo eje"
    ax = fig.axes[0]
    lineas = [l for l in ax.get_lines() if not l.get_label().startswith("_")]
    assert len(lineas) >= 3, "Faltan curvas con etiqueta"
    assert ax.get_legend() is not None and ax.get_title()
    assert any(approx(max(l.get_ydata()), math.exp(2), 1e-3) for l in lineas), "La exponencial debe llegar a e² en x = 2"
    assert any(approx(min(l.get_ydata()), math.log(0.1), 1e-3) for l in lineas), "El logaritmo debe empezar en ln(0,1)"
`,
    hints: [
      "componer: devuelve `lambda x: f(g(x))`, sin llamar a nada todavía.",
      "tabla: el paso es (b − a)/(n − 1); usa `range(n)`, no `range(a, b)` (que solo da enteros).",
      "inversa: es la bisección de la misión anterior aplicada a f(x) − y.",
    ],
    errors: [
      { error: "Usar `range` con decimales", fix: "`range` solo admite enteros: genera los x con a + i·paso." },
      { error: "Comprobar la monotonía solo en los extremos", fix: "sen(10x) puede valer más al final que al principio y aun así subir y bajar en medio." },
      { error: "Invertir el orden de la composición", fix: "f ∘ g aplica primero g. (x + 1)² ≠ x² + 1." },
    ],
    quiz: {
      question: "En la regresión logística, el modelo calcula logit(p) = β₀ + β₁x. ¿Cómo se obtiene la probabilidad p para un x dado?",
      options: [
        { text: "Aplicando la sigmoide (la inversa del logit) a β₀ + β₁x" },
        { text: "p = β₀ + β₁x directamente" },
        { text: "p = log(β₀ + β₁x)" },
        { text: "Elevando al cuadrado β₀ + β₁x" },
      ],
      answer: 0,
      explanation: "El logit lleva probabilidades (0, 1) a toda la recta real; su inversa, la sigmoide, devuelve el valor lineal al intervalo (0, 1). β₀ + β₁x directamente podría ser negativo o mayor que 1.",
    },
    lab: { lab: "matematicas", tab: "funciones", label: "Funciones y derivadas" },
    review: "Repasa: f ∘ g aplica g primero; la inversa refleja la gráfica en y = x; sigmoide y logit son inversas.",
    xp: 60,
    coins: 9,
  },
  {
    id: "m-matrices",
    world: "w4",
    zone: "Matemáticas fundamentales",
    title: "La matriz del oráculo: sistemas, determinantes y autovectores con NumPy",
    kind: "lesson",
    difficulty: 3,
    skills: ["algebra-lineal", "numpy", "regresion"],
    requires: ["m-vectores"],
    story: "El oráculo responde con matrices. Para entenderlo tienes que saber qué hace una matriz con el espacio, cuándo un sistema tiene solución y en qué dirección se estiran los datos.",
    objective: "Resolver sistemas lineales, interpretar el determinante como factor de área, obtener los coeficientes de una regresión con las ecuaciones normales y encontrar la dirección principal de unos datos.",
    before: ["Vectores y producto matricial a mano (misión anterior)", "Arrays de NumPy"],
    packages: ["numpy"],
    intuition: [
      "Una matriz es una **transformación**: A @ v mueve el vector v. Sus columnas dicen adónde van los ejes.",
      "",
      "- El **determinante** es el factor por el que se multiplica el área (o el volumen). Si es 0, la matriz aplasta el espacio y A·x = b no tiene solución única.",
      "- Para resolver A·x = b usa `np.linalg.solve`, no la inversa: es más rápido y más preciso.",
      "- La **regresión lineal** es un sistema: los coeficientes β cumplen las **ecuaciones normales** (XᵀX)β = Xᵀy.",
      "- Los **autovectores** de una matriz de covarianza son las direcciones en que los datos varían más (PCA); los **autovalores**, cuánta varianza hay en cada una.",
    ],
    formal: [
      "det [[a, b], [c, d]] = ad − bc · Área(A·P) = |det A| · Área(P)",
      "",
      "β̂ = (XᵀX)⁻¹Xᵀy (se calcula resolviendo el sistema, no invirtiendo) · Σv = λv",
    ],
    example: {
      code: py`import numpy as np
A = np.array([[2.0, 1.0], [1.0, 3.0]])
b = np.array([5.0, 10.0])
x = np.linalg.solve(A, b)
print(x, A @ x)
print(round(np.linalg.det(A), 6))
valores, vectores = np.linalg.eigh(A)
print(valores.round(4))`,
      lines: [
        "NumPy.",
        "El sistema 2x + y = 5, x + 3y = 10 en forma matricial.",
        "El lado derecho.",
        "Resuelve A·x = b sin calcular la inversa.",
        "[1. 3.] y la comprobación A·x = [5. 10.].",
        "Determinante 5: el área se multiplica por 5.",
        "eigh: autovalores y autovectores de una matriz simétrica (como una covarianza).",
        "[1.382 3.618]: el mayor indica la dirección de máximo estiramiento.",
      ],
    },
    challenge: [
      "1. `resolver(A, b)`: solución de A·x = b con `np.linalg.solve`. Si |det A| < 1e-12 lanza `ValueError`.",
      "2. `area_poligono(vertices)`: área de un polígono dado como lista de puntos (x, y) en orden, con la fórmula del zapato: ½·|Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)|.",
      "3. `area_transformada(A, vertices)`: área del polígono después de aplicar A a cada vértice (usa `area_poligono`).",
      "4. `minimos_cuadrados(X, y)`: coeficientes [β₀, β₁, …] de la regresión con intercepto resolviendo las ecuaciones normales (añade una columna de unos a X).",
      "5. `direccion_principal(datos)`: autovector **unitario** de `np.cov(datos, rowvar=False)` con el mayor autovalor, con la primera componente ≥ 0.",
    ],
    starter: py`import numpy as np

def resolver(A, b):
    return np.linalg.inv(A) * b

def area_poligono(vertices):
    return 0.0

def area_transformada(A, vertices):
    return area_poligono(vertices)

def minimos_cuadrados(X, y):
    return np.zeros(2)

def direccion_principal(datos):
    return np.array([1.0, 0.0])`,
    solution: py`import numpy as np

def resolver(A, b):
    A = np.asarray(A, dtype=float)
    if abs(np.linalg.det(A)) < 1e-12:
        raise ValueError("Matriz singular: el sistema no tiene solución única")
    return np.linalg.solve(A, np.asarray(b, dtype=float))

def area_poligono(vertices):
    s = 0.0
    n = len(vertices)
    for i in range(n):
        x1, y1 = vertices[i]
        x2, y2 = vertices[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2

def area_transformada(A, vertices):
    A = np.asarray(A, dtype=float)
    return area_poligono([tuple(A @ np.asarray(v, dtype=float)) for v in vertices])

def minimos_cuadrados(X, y):
    X = np.asarray(X, dtype=float)
    if X.ndim == 1:
        X = X[:, None]
    Xd = np.column_stack([np.ones(len(X)), X])
    return np.linalg.solve(Xd.T @ Xd, Xd.T @ np.asarray(y, dtype=float))

def direccion_principal(datos):
    valores, vectores = np.linalg.eigh(np.cov(datos, rowvar=False))
    v = vectores[:, np.argmax(valores)]
    v = v / np.linalg.norm(v)
    return -v if v[0] < 0 else v`,
    tests: py`
import numpy as np

def test_resolver():
    "Sistemas y matriz singular"
    f = t.get("resolver", "function")
    x = f([[2, 1], [1, 3]], [5, 10])
    assert np.allclose(x, [1, 3])
    A = np.array([[4.0, -2, 1], [3, 6, -4], [2, 1, 8]])
    b = np.array([12.0, -25, 32])
    assert np.allclose(np.array(A) @ f(A, b), b)
    try:
        f([[1, 2], [2, 4]], [1, 2])
    except ValueError:
        return
    assert False, "Una matriz singular debe lanzar ValueError"

def test_area():
    "Fórmula del zapato y |det|"
    ap = t.get("area_poligono", "function")
    assert approx(ap([(0, 0), (1, 0), (1, 1), (0, 1)]), 1)
    assert approx(ap([(0, 0), (4, 0), (0, 3)]), 6)
    at = t.get("area_transformada", "function")
    tri = [(0, 0), (4, 0), (1, 3)]
    for A in ([[2, 0], [0, 3]], [[1, 1], [0, 1]], [[0.5, -1.5], [2, 1]], [[1, 2], [2, 4]]):
        assert approx(at(A, tri), abs(np.linalg.det(A)) * ap(tri), 1e-9), A

def test_minimos_cuadrados():
    "Ecuaciones normales = lstsq"
    rng = np.random.default_rng(3)
    X = rng.normal(size=(50, 3))
    y = 1.5 + X @ np.array([2.0, -1.0, 0.5]) + rng.normal(scale=0.3, size=50)
    beta = t.get("minimos_cuadrados", "function")(X, y)
    ref = np.linalg.lstsq(np.column_stack([np.ones(50), X]), y, rcond=None)[0]
    assert np.allclose(beta, ref), (beta, ref)

def test_direccion():
    "Primera componente principal"
    rng = np.random.default_rng(0)
    z = rng.normal(size=(400, 2)) * [3.0, 0.5]
    giro = np.array([[np.cos(0.6), -np.sin(0.6)], [np.sin(0.6), np.cos(0.6)]])
    datos = z @ giro.T
    v = t.get("direccion_principal", "function")(datos)
    centrados = datos - datos.mean(axis=0)
    ref = np.linalg.svd(centrados, full_matrices=False)[2][0]
    ref = -ref if ref[0] < 0 else ref
    assert approx(np.linalg.norm(v), 1) and v[0] >= 0
    assert np.allclose(v, ref, atol=1e-8), (v, ref)
`,
    hints: [
      "resolver: comprueba `np.linalg.det(A)` antes de llamar a `np.linalg.solve(A, b)`.",
      "Zapato: recorre i y usa el vértice siguiente con `(i + 1) % n` para cerrar el polígono.",
      "Mínimos cuadrados: `Xd = np.column_stack([np.ones(len(X)), X])` y resuelve `Xd.T @ Xd` frente a `Xd.T @ y`. Dirección principal: `np.linalg.eigh` devuelve los autovalores en orden creciente y los autovectores en las **columnas**.",
    ],
    errors: [
      { error: "Multiplicar con * en vez de @", fix: "`A * b` multiplica elemento a elemento; el producto de matrices es `A @ b`." },
      { error: "Invertir la matriz para resolver", fix: "`np.linalg.solve` es más estable: la inversa amplifica los errores de redondeo cuando la matriz está mal condicionada." },
      { error: "Tomar una fila de `vectores` en lugar de una columna", fix: "En `eigh`, el autovector i es `vectores[:, i]`." },
    ],
    quiz: {
      question: "Al calcular una regresión con dos predictoras casi idénticas (correlación 0,9999), ¿qué pasa con XᵀX?",
      options: [
        { text: "Su determinante es casi 0: el sistema está mal condicionado y los coeficientes se vuelven muy inestables" },
        { text: "Nada: el método de mínimos cuadrados siempre da coeficientes precisos" },
        { text: "El R² baja necesariamente a 0" },
        { text: "Los autovalores de XᵀX se vuelven negativos" },
      ],
      answer: 0,
      explanation: "Con colinealidad casi perfecta las columnas de X apuntan casi en la misma dirección: XᵀX está cerca de ser singular y pequeños cambios en los datos cambian mucho los β (multicolinealidad). Las predicciones pueden seguir siendo buenas; lo inestable es la interpretación de cada coeficiente. XᵀX es semidefinida positiva: sus autovalores nunca son negativos.",
    },
    advanced: {
      title: "El método de la potencia",
      prompt: "Escribe `potencia(A, iteraciones=500)` que estime el autovalor de mayor valor absoluto de A multiplicando repetidamente un vector inicial de unos por A y normalizándolo. Devuelve el cociente de Rayleigh vᵀAv / vᵀv. Es la idea detrás del PageRank de Google.",
      starter: py`import numpy as np

def potencia(A, iteraciones=500):
    return float(np.trace(A))`,
      solution: py`import numpy as np

def potencia(A, iteraciones=500):
    A = np.asarray(A, dtype=float)
    v = np.ones(A.shape[0])
    for _ in range(iteraciones):
        w = A @ v
        v = w / np.linalg.norm(w)
    return float(v @ A @ v / (v @ v))`,
      tests: py`
import numpy as np

def test_potencia():
    "Autovalor dominante"
    f = t.get("potencia", "function")
    for A in ([[2, 1], [1, 3]], [[4, 1, 0], [1, 3, 1], [0, 1, 2]], [[6, 2], [2, 3]]):
        ref = max(np.linalg.eigvalsh(A), key=abs)
        assert approx(f(A), ref, 1e-8), (A, f(A), ref)
`,
    },
    lab: { lab: "matematicas", tab: "matrices", label: "Transformaciones lineales" },
    review: "Repasa: det = factor de área; resolver con solve; (XᵀX)β = Xᵀy; autovectores de la covarianza = componentes principales.",
    xp: 75,
    coins: 11,
  },
  {
    id: "m-integrales",
    world: "w4",
    zone: "Matemáticas fundamentales",
    title: "El área del valle: integrales, densidades y probabilidad",
    kind: "lesson",
    difficulty: 3,
    skills: ["integrales", "metodos-numericos", "probabilidad"],
    requires: ["m-derivadas"],
    story: "En el valle del observatorio, la lluvia se acumula según una curva. Para saber cuánta agua cae entre dos horas hay que medir el área bajo esa curva; y resulta que las probabilidades se miden igual.",
    objective: "Aproximar integrales con trapecios y Simpson, medir cómo baja el error al refinar, y calcular probabilidades como áreas bajo una densidad.",
    before: ["Funciones y derivadas", "Sumatorias", "Distribución normal (intuición)"],
    packages: ["scipy"],
    intuition: [
      "La **integral** ∫ₐᵇ f(x) dx es el área bajo la curva entre a y b. La idea para calcularla: partir [a, b] en n trozos y sumar figuras sencillas.",
      "",
      "- **Trapecios**: une los puntos con rectas. Error ∝ 1/n²: con el doble de trozos, el error se divide por ~4.",
      "- **Simpson**: une cada tres puntos con una parábola. Error ∝ 1/n⁴: el doble de trozos lo divide por ~16. Necesita un número **par** de trozos.",
      "",
      "En estadística, una **densidad** f(x) cumple que el área total es 1 y que P(a ≤ X ≤ b) = ∫ₐᵇ f(x) dx. La «regla del 68-95-99,7» de la normal son tres áreas.",
      "",
      "El **orden** de un método se puede medir: si al duplicar n el error se divide por 2ᵖ, el orden es p = log₂(error₁/error₂).",
    ],
    formal: [
      "Trapecios: T = h·[f(x₀)/2 + f(x₁) + … + f(xₙ₋₁) + f(xₙ)/2], h = (b − a)/n",
      "",
      "Simpson: S = (h/3)·[f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + … + 4f(xₙ₋₁) + f(xₙ)], n par",
      "",
      "Densidad normal: φ(x) = exp(−(x − μ)²/(2σ²)) / (σ√(2π))",
    ],
    example: {
      code: py`import math
f = lambda x: x ** 2
n = 4
h = (3 - 0) / n
puntos = [f(0 + i * h) for i in range(n + 1)]
area = h * (puntos[0] / 2 + sum(puntos[1:-1]) + puntos[-1] / 2)
print(area, "frente al valor exacto", 3 ** 3 / 3)`,
      lines: [
        "Módulo de matemáticas.",
        "La función a integrar: x².",
        "Cuatro trozos.",
        "Ancho de cada trozo: 0,75.",
        "Valores de f en los 5 extremos de los trozos.",
        "Regla de los trapecios: los extremos cuentan la mitad.",
        "9.140625 frente al valor exacto 9.0: sobreestima porque la curva es convexa.",
      ],
    },
    challenge: [
      "1. `trapecios(f, a, b, n)`: regla de los trapecios con n trozos.",
      "2. `simpson(f, a, b, n)`: regla de Simpson (lanza `ValueError` si n es impar).",
      "3. `prob_normal(a, b, mu=0, sigma=1, n=1000)`: P(a ≤ X ≤ b) para X ~ N(μ, σ²) integrando la densidad con Simpson.",
      "4. `orden(metodo, f, a, b, exacto, n=10)`: orden estimado p = log₂(error con n / error con 2n), donde `metodo` es una de tus funciones.",
    ],
    starter: py`import math

def trapecios(f, a, b, n):
    h = (b - a) / n
    return h * sum(f(a + i * h) for i in range(n))

def simpson(f, a, b, n):
    return trapecios(f, a, b, n)

def prob_normal(a, b, mu=0, sigma=1, n=1000):
    return 0.5

def orden(metodo, f, a, b, exacto, n=10):
    return 1`,
    solution: py`import math

def trapecios(f, a, b, n):
    h = (b - a) / n
    interior = sum(f(a + i * h) for i in range(1, n))
    return h * ((f(a) + f(b)) / 2 + interior)

def simpson(f, a, b, n):
    if n % 2:
        raise ValueError("Simpson necesita un número par de trozos")
    h = (b - a) / n
    s = f(a) + f(b)
    for i in range(1, n):
        s += (4 if i % 2 else 2) * f(a + i * h)
    return s * h / 3

def prob_normal(a, b, mu=0, sigma=1, n=1000):
    densidad = lambda x: math.exp(-((x - mu) ** 2) / (2 * sigma ** 2)) / (sigma * math.sqrt(2 * math.pi))
    return simpson(densidad, a, b, n)

def orden(metodo, f, a, b, exacto, n=10):
    e1 = abs(metodo(f, a, b, n) - exacto)
    e2 = abs(metodo(f, a, b, 2 * n) - exacto)
    return math.log2(e1 / e2)`,
    tests: py`
from scipy import integrate, stats

def test_trapecios():
    "Coincide con scipy.integrate.trapezoid"
    f = t.get("trapecios", "function")
    import numpy as np
    xs = np.linspace(0, 2, 11)
    assert approx(f(lambda x: math.exp(-x * x), 0, 2, 10), integrate.trapezoid(np.exp(-xs ** 2), x=xs), 1e-12)
    assert approx(f(lambda x: 3 * x + 1, 0, 4, 1), 28), "Exacta para rectas"

def test_simpson():
    "Coincide con scipy.integrate.simpson y es exacta para cúbicas"
    f = t.get("simpson", "function")
    import numpy as np
    xs = np.linspace(0, 2, 11)
    assert approx(f(lambda x: math.exp(-x * x), 0, 2, 10), integrate.simpson(np.exp(-xs ** 2), x=xs), 1e-12)
    assert approx(f(lambda x: x ** 3 - x, -1, 2, 2), integrate.quad(lambda x: x ** 3 - x, -1, 2)[0], 1e-12)
    try:
        f(math.sin, 0, 1, 3)
    except ValueError:
        return
    assert False, "n impar debe lanzar ValueError"

def test_probabilidades():
    "Áreas bajo la normal = probabilidades"
    p = t.get("prob_normal", "function")
    for k in (1, 2, 3):
        assert approx(p(-k, k), stats.norm.cdf(k) - stats.norm.cdf(-k), 1e-9)
    assert approx(p(100, 130, mu=110, sigma=15), stats.norm.cdf(130, 110, 15) - stats.norm.cdf(100, 110, 15), 1e-9)

def test_orden():
    "Órdenes 2 y 4"
    o = t.get("orden", "function")
    tr = t.get("trapecios", "function")
    si = t.get("simpson", "function")
    exacto = integrate.quad(math.exp, 0, 1)[0]
    assert abs(o(tr, math.exp, 0, 1, exacto) - 2) < 0.05
    assert abs(o(si, math.exp, 0, 1, exacto) - 4) < 0.1
`,
    hints: [
      "Trapecios: los extremos f(a) y f(b) cuentan la mitad; los puntos interiores van de i = 1 a n − 1.",
      "Simpson: pesos 1, 4, 2, 4, …, 2, 4, 1 multiplicados por h/3.",
      "prob_normal: escribe la densidad como una lambda que use mu y sigma, e intégrala con tu `simpson`.",
    ],
    errors: [
      { error: "Sumar solo rectángulos izquierdos", fix: "Ignorar f(b) da un método de orden 1: mucho más lento que los trapecios." },
      { error: "Simpson con n impar", fix: "Las parábolas usan pares de trozos: con n impar sobra uno." },
      { error: "Pensar que la densidad es una probabilidad", fix: "f(x) puede ser mayor que 1 (una normal con σ = 0,1 vale ~4 en su centro): la probabilidad es el área, no la altura." },
    ],
    quiz: {
      question: "La densidad de una normal con μ = 0 y σ = 0,1 vale aproximadamente 3,99 en x = 0. ¿Qué significa?",
      options: [
        { text: "Nada contradictorio: una densidad no es una probabilidad; P(X = 0) es 0 y las probabilidades son áreas" },
        { text: "Que hay un error: las probabilidades no pueden superar 1", misconception: "normalidad-universal" },
        { text: "Que P(X = 0) = 3,99 %" },
        { text: "Que la variable vale 0 casi siempre" },
      ],
      answer: 0,
      explanation: "La densidad mide probabilidad por unidad de x. Con σ pequeña la masa se concentra y la altura crece, pero el área total sigue siendo 1. Para una variable continua, cualquier valor exacto tiene probabilidad 0.",
    },
    advanced: {
      title: "Monte Carlo",
      prompt: "Escribe `montecarlo(f, a, b, n, semilla=0)` que estime ∫ₐᵇ f con n puntos uniformes de `random.Random(semilla)` y devuelva (estimación, error estándar), donde el error estándar es (b − a)·s/√n con s la desviación típica muestral de los f(xᵢ). Comprobarás que el error baja como 1/√n.",
      starter: py`import random

def montecarlo(f, a, b, n, semilla=0):
    return (b - a) * f((a + b) / 2), 0.0`,
      solution: py`import random
import statistics

def montecarlo(f, a, b, n, semilla=0):
    r = random.Random(semilla)
    ys = [f(a + (b - a) * r.random()) for _ in range(n)]
    return (b - a) * statistics.fmean(ys), (b - a) * statistics.stdev(ys) / n ** 0.5`,
      tests: py`
def test_mc():
    "Estimación compatible con el valor exacto y error ∝ 1/√n"
    f = t.get("montecarlo", "function")
    est, se = f(math.sin, 0, math.pi, 20000, 1)
    assert abs(est - 2) < 4 * se and 0 < se < 0.02
    _, se1 = f(math.sin, 0, math.pi, 1000, 2)
    _, se4 = f(math.sin, 0, math.pi, 4000, 2)
    assert 1.6 < se1 / se4 < 2.4, "Con 4 veces más puntos el error estándar se divide por ~2"
`,
    },
    lab: { lab: "matematicas", tab: "integrales", label: "Integración numérica" },
    review: "Repasa: trapecios ∝ 1/n², Simpson ∝ 1/n⁴ (n par); P(a ≤ X ≤ b) es un área; una densidad puede ser > 1.",
    xp: 75,
    coins: 11,
  },
];
