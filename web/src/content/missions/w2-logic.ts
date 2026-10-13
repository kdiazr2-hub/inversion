import { py, type Mission } from "../types";

// Mundo 2 · Las Montañas de la Lógica.

export const W2: Mission[] = [
  {
    id: "w2-descomposicion",
    world: "w2",
    zone: "Pensamiento computacional",
    title: "Divide la montaña: descomposición y pseudocódigo",
    kind: "lesson",
    difficulty: 2,
    skills: ["descomposicion", "funciones"],
    requires: [],
    story: "Escalar la montaña de una vez es imposible. Los guías la dividen en tramos: cada tramo tiene un objetivo claro y se comprueba antes de seguir.",
    objective: "Resolver un problema descomponiéndolo en funciones pequeñas, escribiendo primero el pseudocódigo.",
    before: ["Funciones", "Cadenas", "Condicionales"],
    intuition: [
      "Ante un problema complejo:",
      "",
      "1. **Entiende** la entrada, la salida y los casos límite.",
      "2. Escribe el **pseudocódigo**: pasos en lenguaje natural.",
      "3. Convierte cada paso en una **función pequeña** con un nombre que diga qué hace.",
      "4. Prueba cada función por separado; luego combínalas.",
      "",
      "Pseudocódigo de un validador de contraseñas:",
      "```",
      "para cada regla (longitud, mayúscula, dígito, símbolo):",
      "    si no se cumple, anotar el motivo",
      "la contraseña es válida si no hay motivos",
      "```",
    ],
    example: {
      code: py`def tiene_digito(texto):
    return any(c.isdigit() for c in texto)

def tiene_mayuscula(texto):
    return any(c.isupper() for c in texto)

print(tiene_digito("abc1"), tiene_mayuscula("abc"))`,
      lines: ["Una regla, una función.", "`any` devuelve True si algún carácter es dígito.", "Otra regla independiente.", "True si hay alguna mayúscula.", "Cada pieza se prueba sola: True False."],
    },
    challenge: [
      "Escribe `validar(contrasena)` que devuelva la **lista de motivos** por los que no es válida (lista vacía si es válida). Reglas y mensajes exactos:",
      "- `\"longitud\"` si tiene menos de 10 caracteres",
      "- `\"mayuscula\"` si no tiene ninguna mayúscula",
      "- `\"digito\"` si no tiene ningún dígito",
      "- `\"simbolo\"` si no tiene ningún carácter de `!@#$%&*?`",
      "- `\"espacios\"` si contiene espacios",
      "Los motivos deben aparecer en ese orden. Usa al menos tres funciones auxiliares.",
    ],
    starter: py`def validar(contrasena):
    if len(contrasena) < 10:
        return "longitud"
    return []`,
    solution: py`SIMBOLOS = set("!@#$%&*?")

def larga(c):
    return len(c) >= 10

def con_mayuscula(c):
    return any(ch.isupper() for ch in c)

def con_digito(c):
    return any(ch.isdigit() for ch in c)

def con_simbolo(c):
    return any(ch in SIMBOLOS for ch in c)

def validar(contrasena):
    reglas = [
        ("longitud", larga),
        ("mayuscula", con_mayuscula),
        ("digito", con_digito),
        ("simbolo", con_simbolo),
        ("espacios", lambda c: " " not in c),
    ]
    return [motivo for motivo, cumple in reglas if not cumple(contrasena)]`,
    tests: py`
def test_valida():
    "Una contraseña fuerte no tiene motivos"
    assert t.get("validar", "function")("Montaña#2026") == []

def test_motivos():
    "Detecta cada regla en orden"
    v = t.get("validar")
    assert v("abc") == ["longitud", "mayuscula", "digito", "simbolo"], v("abc")
    assert v("abcdefghij1!") == ["mayuscula"]
    assert v("Abc def 123!") == ["espacios"]
    assert v("ABCDEFGHIJK") == ["digito", "simbolo"]

def test_descompuesto():
    "Usa al menos tres funciones auxiliares"
    import ast
    defs = [n for n in ast.walk(t.tree()) if isinstance(n, ast.FunctionDef)]
    assert len(defs) >= 4, f"Solo hay {len(defs)} funciones definidas"
`,
    hints: [
      "Escribe una función por regla que devuelva True si la regla se cumple.",
      "Una lista de pares (motivo, función) te permite recorrer las reglas en orden.",
      "`[m for m, f in reglas if not f(c)]` construye la lista de motivos.",
    ],
    errors: [
      { error: "Devolver solo el primer motivo", fix: "La especificación pide todos los motivos: acumúlalos en una lista." },
      { error: "Una función gigante imposible de probar", fix: "Si una función hace cinco cosas, divídela: cada regla se prueba por separado." },
    ],
    quiz: {
      question: "¿Cuál es la principal ventaja de descomponer un problema en funciones pequeñas?",
      options: [
        { text: "Cada parte se entiende, se prueba y se corrige por separado" },
        { text: "El programa siempre se ejecuta más rápido" },
        { text: "Python lo exige para programas largos" },
        { text: "Se usan menos variables" },
      ],
      answer: 0,
      explanation: "La descomposición reduce la complejidad que tienes que tener en la cabeza a la vez y permite pruebas focalizadas.",
    },
    advanced: {
      title: "Puntuación de fortaleza",
      prompt: "Escribe `fortaleza(c)` que devuelva un entero de 0 a 5: una unidad por cada regla cumplida (usa tu `validar`).",
      starter: py`def fortaleza(c):
    return 0`,
      solution: py`def validar(c):
    reglas = [len(c) >= 10, any(x.isupper() for x in c), any(x.isdigit() for x in c), any(x in "!@#$%&*?" for x in c), " " not in c]
    return [m for m, ok in zip(["longitud", "mayuscula", "digito", "simbolo", "espacios"], reglas) if not ok]

def fortaleza(c):
    return 5 - len(validar(c))`,
      tests: py`
def test_f():
    "Cuenta reglas cumplidas"
    f = t.get("fortaleza", "function")
    assert f("Montaña#2026") == 5 and f("abc") == 1 and f("a b") == 0
`,
    },
    review: "Repasa el ciclo entender → pseudocódigo → funciones pequeñas → pruebas.",
    xp: 60,
    coins: 9,
  },
  {
    id: "w2-recursion",
    world: "w2",
    zone: "Pensamiento computacional",
    title: "El eco de la cueva: recursividad",
    kind: "lesson",
    difficulty: 3,
    skills: ["recursion"],
    requires: ["w2-descomposicion"],
    story: "En la cueva del eco, cada grito provoca otro más pequeño… hasta que el silencio pone fin a la cadena.",
    objective: "Escribir funciones recursivas con caso base y caso recursivo, y reconocer cuándo conviene memorizar resultados.",
    before: ["Funciones", "Listas"],
    intuition: [
      "Una función **recursiva** se llama a sí misma con un problema más pequeño. Necesita:",
      "",
      "- **Caso base**: un problema tan pequeño que se responde directamente (detiene la recursión).",
      "- **Caso recursivo**: reduce el problema y confía en que la llamada resuelve la parte menor.",
      "",
      "```python",
      "def factorial(n):",
      "    if n == 0:          # caso base",
      "        return 1",
      "    return n * factorial(n - 1)",
      "```",
      "",
      "Sin caso base obtienes `RecursionError`. Algunas recursiones repiten cálculos (Fibonacci ingenuo): memorizar resultados con un diccionario o `functools.lru_cache` las vuelve rápidas.",
    ],
    formal: "Inducción: si la función es correcta para el caso base y, suponiendo que lo es para n − 1, también lo es para n, entonces es correcta para todo n ≥ 0.",
    example: {
      code: py`def suma_digitos(n):
    if n < 10:
        return n
    return n % 10 + suma_digitos(n // 10)

print(suma_digitos(2026))`,
      lines: ["Suma los dígitos de n.", "Caso base: un solo dígito.", "Se devuelve tal cual.", "Último dígito + suma de los demás.", "2 + 0 + 2 + 6 = 10."],
    },
    challenge: [
      "Escribe con recursión:",
      "1. `aplanar(lista)`: convierte listas anidadas a cualquier profundidad en una lista plana. `aplanar([1, [2, [3, 4]], 5])` → `[1, 2, 3, 4, 5]`.",
      "2. `caminos(filas, cols)`: número de caminos desde la esquina superior izquierda a la inferior derecha de una cuadrícula moviéndose solo a la derecha o abajo. Debe ser rápido para 16×16 (memoriza).",
    ],
    starter: py`def aplanar(lista):
    plano = []
    for x in lista:
        plano.append(x)
    return plano

def caminos(filas, cols):
    if filas == 1 or cols == 1:
        return 1
    return caminos(filas - 1, cols) + caminos(filas, cols - 1)`,
    solution: py`from functools import lru_cache

def aplanar(lista):
    plano = []
    for x in lista:
        if isinstance(x, list):
            plano.extend(aplanar(x))
        else:
            plano.append(x)
    return plano

@lru_cache(maxsize=None)
def caminos(filas, cols):
    if filas == 1 or cols == 1:
        return 1
    return caminos(filas - 1, cols) + caminos(filas, cols - 1)`,
    tests: py`
def test_aplanar():
    "Aplana a cualquier profundidad"
    f = t.get("aplanar", "function")
    assert f([1, [2, [3, 4]], 5]) == [1, 2, 3, 4, 5]
    assert f([[[[]]], "a", [["b"]]]) == ["a", "b"]

def test_caminos_pequenos():
    "caminos(2, 2) = 2, caminos(3, 3) = 6, caminos(3, 7) = 28"
    f = t.get("caminos", "function")
    assert (f(2, 2), f(3, 3), f(3, 7)) == (2, 6, 28)

def test_caminos_rapido():
    "caminos(16, 16) en menos de un segundo"
    import time
    t0 = time.time()
    assert t.get("caminos")(16, 16) == 155117520
    assert time.time() - t0 < 1, "Demasiado lento: memoriza los resultados"

def test_recursiva():
    "aplanar se llama a sí misma"
    import ast
    fn = next(n for n in ast.walk(t.tree()) if isinstance(n, ast.FunctionDef) and n.name == "aplanar")
    assert any(isinstance(c, ast.Call) and getattr(c.func, "id", "") == "aplanar" for c in ast.walk(fn))
`,
    hints: [
      "En `aplanar`, si el elemento es una lista (`isinstance(x, list)`), extiende el resultado con `aplanar(x)`.",
      "`caminos` ya es correcta pero exponencial: el mismo (f, c) se calcula millones de veces.",
      "Añade `@lru_cache(maxsize=None)` de `functools` encima de `def caminos`.",
    ],
    errors: [
      { error: "RecursionError: maximum recursion depth exceeded", fix: "Falta el caso base o el problema no se hace más pequeño en cada llamada." },
      { error: "Recursión muy lenta", fix: "Si los mismos argumentos se repiten, memoriza los resultados." },
    ],
    quiz: {
      question: "¿Qué ocurre si una función recursiva no tiene caso base alcanzable?",
      options: [
        { text: "Se llama indefinidamente hasta agotar la pila (RecursionError)" },
        { text: "Devuelve None" },
        { text: "Python detecta el problema y lo corrige" },
        { text: "Devuelve 0" },
      ],
      answer: 0,
      explanation: "Cada llamada ocupa memoria en la pila; Python corta la cadena con RecursionError tras unas mil llamadas.",
    },
    advanced: {
      title: "Permutaciones",
      prompt: "Escribe `permutaciones(cadena)` recursiva que devuelva una lista ordenada con todas las permutaciones distintas.",
      starter: py`def permutaciones(cadena):
    return [cadena]`,
      solution: py`def permutaciones(cadena):
    if len(cadena) <= 1:
        return [cadena]
    res = set()
    for i, c in enumerate(cadena):
        for resto in permutaciones(cadena[:i] + cadena[i + 1:]):
            res.add(c + resto)
    return sorted(res)`,
      tests: py`
def test_perm():
    "Permutaciones distintas y ordenadas"
    f = t.get("permutaciones", "function")
    assert f("abc") == ["abc", "acb", "bac", "bca", "cab", "cba"]
    assert f("aab") == ["aab", "aba", "baa"]
`,
    },
    review: "Repasa: caso base, caso recursivo que reduce el problema y memorización cuando se repiten llamadas.",
    xp: 70,
    coins: 10,
  },
  {
    id: "w2-clases",
    world: "w2",
    zone: "Objetos",
    title: "Moldes de criaturas: clases y objetos",
    kind: "lesson",
    difficulty: 3,
    skills: ["poo"],
    requires: ["w2-recursion"],
    story: "Cada criatura de la montaña tiene datos (vida, nivel) y acciones (atacar, curarse). Un molde común evita repetir código para cada una.",
    objective: "Definir clases con `__init__`, atributos, métodos y `__repr__`, y proteger invariantes del objeto.",
    before: ["Funciones", "Diccionarios"],
    intuition: [
      "Una **clase** es un molde; cada **objeto** (instancia) es un ejemplar con sus propios datos.",
      "",
      "```python",
      "class Heroe:",
      "    def __init__(self, nombre, vida=100):",
      "        self.nombre = nombre",
      "        self.vida = vida",
      "",
      "    def recibir_danio(self, cantidad):",
      "        self.vida = max(0, self.vida - cantidad)",
      "```",
      "",
      "- `__init__` inicializa el objeto. `self` es el propio objeto.",
      "- Los **métodos** son funciones que operan sobre el objeto.",
      "- Una **invariante** es una regla que siempre debe cumplirse (la vida nunca es negativa). Los métodos la protegen.",
      "- `__repr__` define cómo se muestra el objeto al depurar.",
    ],
    example: {
      code: py`class Contador:
    def __init__(self):
        self.valor = 0

    def incrementar(self, paso=1):
        self.valor += paso
        return self.valor

c = Contador()
c.incrementar()
print(c.incrementar(5))`,
      lines: ["Define la clase.", "Constructor: se ejecuta al crear el objeto.", "Atributo propio de cada contador.", "Un método con parámetro opcional.", "Modifica el estado del objeto.", "Devuelve el nuevo valor.", "Crea una instancia.", "Valor 1.", "Muestra 6."],
    },
    challenge: [
      "Implementa la clase `Cuenta` (una cuenta de monedas del gremio):",
      "- `Cuenta(titular, saldo=0)`; lanza `ValueError` si el saldo inicial es negativo.",
      "- `depositar(cantidad)` y `retirar(cantidad)`: cantidad > 0; retirar no puede dejar saldo negativo (`ValueError`).",
      "- `transferir(destino, cantidad)`: retira de esta y deposita en `destino` (otra Cuenta). Si falla, ninguna cuenta cambia.",
      "- `historial`: lista de tuplas `(tipo, cantidad)` con `\"deposito\"` o `\"retiro\"`.",
      "- `__repr__` → `Cuenta('Ada', saldo=50)`.",
    ],
    starter: py`class Cuenta:
    def __init__(self, titular, saldo=0):
        self.titular = titular
        self.saldo = saldo

    def depositar(self, cantidad):
        self.saldo += cantidad

    def retirar(self, cantidad):
        self.saldo -= cantidad`,
    solution: py`class Cuenta:
    def __init__(self, titular, saldo=0):
        if saldo < 0:
            raise ValueError("El saldo inicial no puede ser negativo")
        self.titular = titular
        self.saldo = saldo
        self.historial = []

    def depositar(self, cantidad):
        if cantidad <= 0:
            raise ValueError("La cantidad debe ser positiva")
        self.saldo += cantidad
        self.historial.append(("deposito", cantidad))

    def retirar(self, cantidad):
        if cantidad <= 0 or cantidad > self.saldo:
            raise ValueError("Cantidad no válida o saldo insuficiente")
        self.saldo -= cantidad
        self.historial.append(("retiro", cantidad))

    def transferir(self, destino, cantidad):
        self.retirar(cantidad)
        destino.depositar(cantidad)

    def __repr__(self):
        return f"Cuenta({self.titular!r}, saldo={self.saldo})"`,
    tests: py`
def test_basico():
    "Depósitos, retiros e historial"
    C = t.get("Cuenta")
    c = C("Ada", 10)
    c.depositar(50)
    c.retirar(20)
    assert c.saldo == 40 and c.historial == [("deposito", 50), ("retiro", 20)]

def test_invariantes():
    "Rechaza operaciones inválidas sin cambiar el saldo"
    C = t.get("Cuenta")
    for accion in [lambda: C("x", -1), lambda: C("x", 5).retirar(6), lambda: C("x").depositar(0), lambda: C("x", 5).retirar(-2)]:
        try:
            accion()
        except ValueError:
            continue
        assert False, "Una operación inválida no lanzó ValueError"

def test_transferir():
    "Transferencia atómica"
    C = t.get("Cuenta")
    a, b = C("Ada", 30), C("Lin")
    a.transferir(b, 25)
    assert (a.saldo, b.saldo) == (5, 25)
    try:
        a.transferir(b, 100)
    except ValueError:
        pass
    assert (a.saldo, b.saldo) == (5, 25), "Una transferencia fallida cambió los saldos"

def test_repr():
    "__repr__ legible"
    assert repr(t.get("Cuenta")("Ada", 50)) == "Cuenta('Ada', saldo=50)"

def test_independientes():
    "Cada cuenta tiene su propio historial"
    C = t.get("Cuenta")
    a, b = C("a"), C("b")
    a.depositar(1)
    assert b.historial == []
`,
    hints: [
      "Crea `self.historial = []` dentro de `__init__` (no como atributo de clase).",
      "Valida al principio de cada método y lanza ValueError antes de tocar el saldo.",
      "`transferir` puede reutilizar `self.retirar` y `destino.depositar`: si retirar falla, nada cambia.",
    ],
    errors: [
      { error: "TypeError: __init__() missing 1 required positional argument: 'self'", fix: "Olvidaste self como primer parámetro de un método, o llamaste al método sobre la clase en vez de sobre un objeto." },
      { error: "Todas las cuentas comparten historial", fix: "Si defines historial = [] a nivel de clase, es compartido. Créalo en __init__ con self.historial." },
    ],
    quiz: {
      question: "¿Qué representa `self` dentro de un método?",
      options: [
        { text: "El objeto concreto sobre el que se llamó el método" },
        { text: "La clase" },
        { text: "Una palabra reservada sin significado" },
        { text: "El módulo actual" },
      ],
      answer: 0,
      explanation: "Al escribir c.depositar(5), Python ejecuta Cuenta.depositar(c, 5): self es c.",
    },
    advanced: {
      title: "Vector 2D con operadores",
      prompt: "Crea `Vector(x, y)` que soporte `+`, `*` por escalar, `abs()` (norma), `==` y `__repr__` → `Vector(1, 2)`.",
      starter: py`class Vector:
    def __init__(self, x, y):
        self.x, self.y = x, y`,
      solution: py`import math

class Vector:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __add__(self, o):
        return Vector(self.x + o.x, self.y + o.y)

    def __mul__(self, k):
        return Vector(self.x * k, self.y * k)

    def __abs__(self):
        return math.hypot(self.x, self.y)

    def __eq__(self, o):
        return isinstance(o, Vector) and (self.x, self.y) == (o.x, o.y)

    def __repr__(self):
        return f"Vector({self.x}, {self.y})"`,
      tests: py`
def test_v():
    "Operadores"
    V = t.get("Vector")
    assert V(1, 2) + V(3, 4) == V(4, 6) and V(1, 2) * 3 == V(3, 6)
    assert abs(V(3, 4)) == 5 and repr(V(1, 2)) == "Vector(1, 2)"
`,
    },
    review: "Repasa qué es una invariante y cómo los métodos la protegen.",
    xp: 75,
    coins: 11,
  },
  {
    id: "w2-herencia",
    world: "w2",
    zone: "Objetos",
    title: "Linajes de criaturas: herencia y composición",
    kind: "lesson",
    difficulty: 3,
    skills: ["poo"],
    requires: ["w2-clases"],
    story: "Los dragones son criaturas, pero vuelan. Los magos tienen un grimorio, pero no son un grimorio. Saber distinguir «es un» de «tiene un» evita diseños frágiles.",
    objective: "Usar herencia (`class Hija(Padre)`, `super()`) para especializar comportamiento y composición para combinar objetos.",
    before: ["Clases y objetos"],
    intuition: [
      "**Herencia** («es un»): la subclase reutiliza y especializa la clase base.",
      "",
      "```python",
      "class Criatura:",
      "    def sonido(self): return \"...\"",
      "class Dragon(Criatura):",
      "    def sonido(self): return \"¡ROAR!\"   # sobrescribe",
      "```",
      "",
      "`super().__init__(...)` llama al constructor del padre. **Polimorfismo**: código que trabaja con `Criatura` funciona con cualquier subclase.",
      "",
      "**Composición** («tiene un»): un objeto contiene otros. Suele ser más flexible que encadenar herencias.",
    ],
    example: {
      code: py`class Criatura:
    def __init__(self, nombre):
        self.nombre = nombre
    def describir(self):
        return f"{self.nombre} hace {self.sonido()}"
    def sonido(self):
        return "..."

class Lobo(Criatura):
    def sonido(self):
        return "auuu"

print(Lobo("Gris").describir())`,
      lines: ["Clase base.", "Constructor común.", "Guarda el nombre.", "Método común que usa sonido().", "Llama a sonido(), que cada subclase puede cambiar.", "Comportamiento por defecto.", "Devuelve puntos suspensivos.", "Lobo hereda de Criatura.", "Sobrescribe sonido.", "Su propio sonido.", "Gris hace auuu: describir() es heredado, sonido() es del lobo."],
    },
    challenge: [
      "Modela figuras geométricas:",
      "- Clase base `Figura` con método `area()` que lanza `NotImplementedError` y método `describir()` que devuelve `\"<Nombre de la clase> de área X\"` con 2 decimales (usa `type(self).__name__`).",
      "- `Rectangulo(ancho, alto)` y `Circulo(radio)` heredan de Figura e implementan `area()`.",
      "- `Cuadrado(lado)` hereda de `Rectangulo` usando `super().__init__`.",
      "- Composición: `Lienzo` tiene una lista de figuras, método `agregar(figura)` y `area_total()`.",
    ],
    starter: py`class Figura:
    def area(self):
        return 0

class Rectangulo:
    def __init__(self, ancho, alto):
        self.ancho, self.alto = ancho, alto

class Lienzo(list):
    pass`,
    solution: py`import math

class Figura:
    def area(self):
        raise NotImplementedError

    def describir(self):
        return f"{type(self).__name__} de área {self.area():.2f}"

class Rectangulo(Figura):
    def __init__(self, ancho, alto):
        self.ancho, self.alto = ancho, alto

    def area(self):
        return self.ancho * self.alto

class Cuadrado(Rectangulo):
    def __init__(self, lado):
        super().__init__(lado, lado)

class Circulo(Figura):
    def __init__(self, radio):
        self.radio = radio

    def area(self):
        return math.pi * self.radio ** 2

class Lienzo:
    def __init__(self):
        self.figuras = []

    def agregar(self, figura):
        self.figuras.append(figura)

    def area_total(self):
        return sum(f.area() for f in self.figuras)`,
    tests: py`
def test_areas():
    "Áreas y herencia"
    R, C, Q = t.get("Rectangulo"), t.get("Circulo"), t.get("Cuadrado")
    assert R(2, 3).area() == 6 and Q(4).area() == 16 and approx(C(1).area(), math.pi)
    assert issubclass(Q, R) and issubclass(R, t.get("Figura")) and issubclass(C, t.get("Figura"))

def test_describir():
    "describir() es común y polimórfico"
    assert t.get("Cuadrado")(2).describir() == "Cuadrado de área 4.00"
    assert t.get("Circulo")(2).describir() == "Circulo de área 12.57"

def test_abstracta():
    "Figura().area() lanza NotImplementedError"
    try:
        t.get("Figura")().area()
    except NotImplementedError:
        return
    assert False

def test_lienzo():
    "Lienzo compone figuras"
    L = t.get("Lienzo")()
    L.agregar(t.get("Rectangulo")(1, 2))
    L.agregar(t.get("Cuadrado")(3))
    assert L.area_total() == 11
    assert not isinstance(L, t.get("Figura")), "Un lienzo tiene figuras; no es una figura"

def test_super():
    "Cuadrado usa super()"
    assert "super()" in t.code
`,
    hints: [
      "`class Rectangulo(Figura):` declara la herencia.",
      "En Cuadrado: `super().__init__(lado, lado)`.",
      "`Lienzo` no hereda de nada: guarda `self.figuras = []` y suma `f.area()`.",
    ],
    errors: [
      { error: "AttributeError: 'Cuadrado' object has no attribute 'ancho'", fix: "Si la subclase define __init__ debe llamar a super().__init__ para inicializar los atributos del padre." },
      { error: "Heredar para reutilizar algo que no es «es un»", fix: "Si la relación es «tiene un», usa composición (un atributo) en lugar de herencia." },
    ],
    quiz: {
      question: "Un Coche tiene un Motor. ¿Qué relación conviene modelar?",
      options: [
        { text: "Composición: Coche guarda un objeto Motor como atributo" },
        { text: "Herencia: Coche hereda de Motor" },
        { text: "Herencia: Motor hereda de Coche" },
        { text: "Ninguna: deben ser funciones" },
      ],
      answer: 0,
      explanation: "Un coche no «es un» motor. La composición permite cambiar el motor sin rehacer la jerarquía.",
    },
    advanced: {
      title: "Clases abstractas con abc",
      prompt: "Reescribe `Figura` como clase abstracta con `abc.ABC` y `@abstractmethod`, de modo que instanciar `Figura()` lance TypeError. Incluye `Circulo`.",
      starter: py`class Figura:
    def area(self):
        raise NotImplementedError`,
      solution: py`import math
from abc import ABC, abstractmethod

class Figura(ABC):
    @abstractmethod
    def area(self):
        ...

class Circulo(Figura):
    def __init__(self, r):
        self.r = r

    def area(self):
        return math.pi * self.r ** 2`,
      tests: py`
def test_abc():
    "No se puede instanciar Figura"
    try:
        t.get("Figura")()
    except TypeError:
        assert approx(t.get("Circulo")(1).area(), math.pi)
        return
    assert False, "Figura() debería lanzar TypeError"
`,
    },
    review: "Repasa la diferencia entre «es un» (herencia) y «tiene un» (composición).",
    xp: 75,
    coins: 11,
  },
  {
    id: "w2-generadores",
    world: "w2",
    zone: "Iteración avanzada",
    title: "El manantial infinito: iteradores y generadores",
    kind: "lesson",
    difficulty: 3,
    skills: ["generadores"],
    requires: ["w2-herencia"],
    story: "El manantial no entrega toda su agua de golpe: la da gota a gota, cuando la pides. Así puedes procesar ríos enteros con un cubo pequeño.",
    objective: "Crear generadores con `yield`, encadenarlos y entender la evaluación perezosa.",
    before: ["Bucles", "Funciones"],
    intuition: [
      "Un **generador** produce valores de uno en uno con `yield` y se pausa entre ellos. No guarda toda la secuencia en memoria.",
      "",
      "```python",
      "def cuenta_atras(n):",
      "    while n > 0:",
      "        yield n",
      "        n -= 1",
      "```",
      "",
      "`for x in cuenta_atras(3)` recibe 3, 2, 1. Las **expresiones generadoras** `(x * 2 for x in datos)` son comprensiones perezosas.",
      "",
      "Útil para archivos enormes, secuencias infinitas y **tuberías** (pipelines) de procesamiento.",
    ],
    example: {
      code: py`def pares():
    n = 0
    while True:
        yield n
        n += 2

from itertools import islice
print(list(islice(pares(), 5)))`,
      lines: ["Un generador infinito.", "Estado inicial.", "Sin fin: no importa, solo calcula lo que se pide.", "Entrega n y se pausa.", "Al reanudarse, avanza.", "islice toma un número limitado de elementos.", "[0, 2, 4, 6, 8]"],
    },
    challenge: [
      "Construye una tubería de generadores para procesar un registro de sensores (líneas de texto `sensor,valor`):",
      "1. `leer(lineas)`: genera tuplas `(sensor, float(valor))`, saltando líneas mal formadas.",
      "2. `filtrar(registros, minimo, maximo)`: genera solo los registros con valor en [minimo, maximo].",
      "3. `media_movil(valores, k)`: genera la media de cada ventana de k valores consecutivos (usa una ventana con `collections.deque(maxlen=k)`).",
      "Las tres deben ser generadores (usar `yield`).",
    ],
    starter: py`def leer(lineas):
    return [tuple(l.split(",")) for l in lineas]

def filtrar(registros, minimo, maximo):
    return registros

def media_movil(valores, k):
    return []`,
    solution: py`from collections import deque

def leer(lineas):
    for linea in lineas:
        partes = linea.strip().split(",")
        if len(partes) != 2:
            continue
        try:
            yield partes[0], float(partes[1])
        except ValueError:
            continue

def filtrar(registros, minimo, maximo):
    for sensor, valor in registros:
        if minimo <= valor <= maximo:
            yield sensor, valor

def media_movil(valores, k):
    ventana = deque(maxlen=k)
    for v in valores:
        ventana.append(v)
        if len(ventana) == k:
            yield sum(ventana) / k`,
    tests: py`
import types

LINEAS = ["a,10", "b,20", "roto", "a,x", "c,999", "a,30", "b,40"]

def test_leer():
    "leer salta líneas inválidas"
    g = t.get("leer", "function")(LINEAS)
    assert isinstance(g, types.GeneratorType), "leer debe ser un generador (usa yield)"
    assert list(g) == [("a", 10.0), ("b", 20.0), ("c", 999.0), ("a", 30.0), ("b", 40.0)]

def test_tuberia():
    "Tubería completa"
    leer, filtrar, mm = t.get("leer"), t.get("filtrar"), t.get("media_movil")
    vals = (v for _, v in filtrar(leer(LINEAS), 0, 100))
    r = mm(vals, 2)
    assert isinstance(r, types.GeneratorType)
    assert list(r) == [15.0, 25.0, 35.0]

def test_perezoso():
    "Funciona con una fuente infinita"
    import itertools
    infinito = (f"s,{i}" for i in itertools.count())
    primeros = list(itertools.islice(t.get("media_movil")((v for _, v in t.get("leer")(infinito)), 3), 2))
    assert primeros == [1.0, 2.0]
`,
    hints: [
      "Sustituye `return [...]` por un bucle con `yield` dentro.",
      "En `leer`, usa try/except ValueError alrededor de float y `continue` si falla.",
      "`deque(maxlen=k)` descarta automáticamente el elemento más antiguo al añadir uno nuevo.",
    ],
    errors: [
      { error: "Un generador solo se puede recorrer una vez", fix: "Tras consumirlo queda vacío. Vuelve a llamar a la función si necesitas recorrerlo de nuevo." },
      { error: "Convertir todo a lista al principio", fix: "list(generador) carga todo en memoria y no funciona con fuentes infinitas." },
    ],
    quiz: {
      question: "¿Qué devuelve llamar a una función que contiene `yield`?",
      options: [
        { text: "Un objeto generador; el cuerpo no se ejecuta hasta que se le piden valores" },
        { text: "El primer valor producido" },
        { text: "Una lista con todos los valores" },
        { text: "None" },
      ],
      answer: 0,
      explanation: "La función se convierte en una fábrica de generadores. El código corre bajo demanda, al iterar.",
    },
    advanced: {
      title: "Fibonacci infinito y lotes",
      prompt: "Escribe `fibonacci()` (generador infinito: 0, 1, 1, 2, …) y `lotes(iterable, n)` que genere listas de n elementos (la última puede ser más corta).",
      starter: py`def fibonacci():
    pass

def lotes(iterable, n):
    pass`,
      solution: py`def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

def lotes(iterable, n):
    lote = []
    for x in iterable:
        lote.append(x)
        if len(lote) == n:
            yield lote
            lote = []
    if lote:
        yield lote`,
      tests: py`
def test_fib():
    "Fibonacci y lotes"
    import itertools
    assert list(itertools.islice(t.get("fibonacci", "function")(), 8)) == [0, 1, 1, 2, 3, 5, 8, 13]
    assert list(t.get("lotes", "function")(range(7), 3)) == [[0, 1, 2], [3, 4, 5], [6]]
`,
    },
    review: "Repasa la diferencia entre construir una lista y generar valores bajo demanda.",
    xp: 75,
    coins: 11,
  },
  {
    id: "w2-excepciones",
    world: "w2",
    zone: "Iteración avanzada",
    title: "Alarmas a medida: excepciones personalizadas",
    kind: "lesson",
    difficulty: 3,
    skills: ["errores", "poo"],
    requires: ["w2-generadores"],
    story: "En la montaña, una alarma genérica no sirve: el refugio necesita saber si es una avalancha o una tormenta para reaccionar bien.",
    objective: "Definir jerarquías de excepciones propias con información útil y capturarlas por tipo.",
    before: ["Excepciones", "Herencia"],
    intuition: [
      "Una excepción propia es una clase que hereda de `Exception` (o de una más específica):",
      "",
      "```python",
      "class ErrorDatos(Exception):",
      "    pass",
      "",
      "class ValorFueraDeRango(ErrorDatos):",
      "    def __init__(self, campo, valor):",
      "        super().__init__(f\"{campo}={valor} fuera de rango\")",
      "        self.campo, self.valor = campo, valor",
      "```",
      "",
      "Una **jerarquía** permite capturar algo concreto (`ValorFueraDeRango`) o toda la familia (`ErrorDatos`). Los atributos extra ayudan a quien la maneja.",
    ],
    example: {
      code: py`class SinMunicion(Exception):
    pass

def disparar(flechas):
    if flechas == 0:
        raise SinMunicion("No quedan flechas")
    return flechas - 1

try:
    disparar(0)
except SinMunicion as e:
    print("Aviso:", e)`,
      lines: ["Excepción propia.", "No necesita cuerpo.", "Función que la usa.", "Condición de error…", "…la lanza con un mensaje.", "Caso normal.", "Intentamos…", "…disparar sin flechas.", "Capturamos solo ese tipo.", "Aviso: No quedan flechas"],
    },
    challenge: [
      "Crea la jerarquía:",
      "- `ErrorRegistro(Exception)`",
      "- `CampoFaltante(ErrorRegistro)` con atributo `campo`",
      "- `ValorInvalido(ErrorRegistro)` con atributos `campo` y `valor`",
      "Escribe `validar_registro(d)` para diccionarios con `\"nombre\"` (texto no vacío), `\"edad\"` (int 0–120) y `\"email\"` (contiene `@`). Lanza la excepción adecuada en el primer problema (en ese orden de campos) o devuelve True.",
      "Escribe `procesar(registros)` que devuelva `(validos, errores)` donde `errores` es una lista de tuplas `(índice, nombre_de_la_clase_de_error, campo)`.",
    ],
    starter: py`def validar_registro(d):
    if "nombre" not in d:
        raise Exception("falta nombre")
    return True

def procesar(registros):
    return registros, []`,
    solution: py`class ErrorRegistro(Exception):
    pass

class CampoFaltante(ErrorRegistro):
    def __init__(self, campo):
        super().__init__(f"Falta el campo '{campo}'")
        self.campo = campo

class ValorInvalido(ErrorRegistro):
    def __init__(self, campo, valor):
        super().__init__(f"Valor inválido en '{campo}': {valor!r}")
        self.campo, self.valor = campo, valor

def validar_registro(d):
    for campo in ("nombre", "edad", "email"):
        if campo not in d:
            raise CampoFaltante(campo)
    if not isinstance(d["nombre"], str) or not d["nombre"].strip():
        raise ValorInvalido("nombre", d["nombre"])
    if not isinstance(d["edad"], int) or not 0 <= d["edad"] <= 120:
        raise ValorInvalido("edad", d["edad"])
    if "@" not in str(d["email"]):
        raise ValorInvalido("email", d["email"])
    return True

def procesar(registros):
    validos, errores = [], []
    for i, r in enumerate(registros):
        try:
            validar_registro(r)
            validos.append(r)
        except ErrorRegistro as e:
            errores.append((i, type(e).__name__, e.campo))
    return validos, errores`,
    tests: py`
def test_jerarquia():
    "Jerarquía de excepciones"
    E, F, V = t.get("ErrorRegistro"), t.get("CampoFaltante"), t.get("ValorInvalido")
    assert issubclass(E, Exception) and issubclass(F, E) and issubclass(V, E)

def test_validar():
    "Lanza la excepción adecuada con atributos"
    v = t.get("validar_registro", "function")
    assert v({"nombre": "Ada", "edad": 36, "email": "a@b.c"}) is True
    try:
        v({"nombre": "Ada", "email": "x@y"})
    except t.get("CampoFaltante") as e:
        assert e.campo == "edad"
    else:
        assert False, "Debía lanzar CampoFaltante"
    try:
        v({"nombre": "Ada", "edad": 300, "email": "x@y"})
    except t.get("ValorInvalido") as e:
        assert e.campo == "edad" and e.valor == 300
    else:
        assert False, "Debía lanzar ValorInvalido"

def test_procesar():
    "procesar separa válidos y errores"
    R = [{"nombre": "Ada", "edad": 36, "email": "a@b"}, {"nombre": "", "edad": 3, "email": "b@c"}, {"edad": 4}, {"nombre": "Lin", "edad": 20, "email": "sin-arroba"}]
    validos, errores = t.get("procesar", "function")(R)
    assert len(validos) == 1
    assert errores == [(1, "ValorInvalido", "nombre"), (2, "CampoFaltante", "nombre"), (3, "ValorInvalido", "email")], errores
`,
    hints: [
      "Cada clase de error llama a `super().__init__(mensaje)` y guarda sus atributos.",
      "Comprueba primero los campos faltantes en el orden nombre, edad, email.",
      "En `procesar`, captura la clase base `ErrorRegistro` y usa `type(e).__name__`.",
    ],
    errors: [
      { error: "Heredar de BaseException", fix: "Hereda de Exception: BaseException incluye señales como KeyboardInterrupt que no deberías capturar." },
      { error: "Capturar Exception en todos lados", fix: "Una jerarquía propia te permite capturar solo los errores de tu dominio." },
    ],
    quiz: {
      question: "Si `ValorInvalido` hereda de `ErrorRegistro`, ¿qué captura `except ErrorRegistro:`?",
      options: [
        { text: "ErrorRegistro y todas sus subclases, incluida ValorInvalido" },
        { text: "Solo ErrorRegistro exactamente" },
        { text: "Cualquier excepción" },
        { text: "Solo ValorInvalido" },
      ],
      answer: 0,
      explanation: "except compara con isinstance: una subclase es también una instancia de la clase base.",
    },
    review: "Repasa cómo una jerarquía de excepciones permite manejar errores con distinta granularidad.",
    xp: 75,
    coins: 11,
  },
  {
    id: "w2-decoradores",
    world: "w2",
    zone: "Iteración avanzada",
    title: "Runas envolventes: decoradores y context managers",
    kind: "lesson",
    difficulty: 4,
    skills: ["decoradores", "funciones"],
    requires: ["w2-excepciones"],
    story: "Las runas envolventes añaden poderes a cualquier hechizo sin cambiar su texto: miden su duración, cuentan sus usos o recuerdan resultados.",
    objective: "Escribir decoradores con `functools.wraps` y context managers con `with`.",
    before: ["Funciones", "Clases", "Excepciones"],
    intuition: [
      "En Python las funciones son objetos: se pueden pasar y devolver. Un **decorador** recibe una función y devuelve otra que la envuelve:",
      "",
      "```python",
      "def contar(f):",
      "    @functools.wraps(f)",
      "    def envoltura(*args, **kwargs):",
      "        envoltura.llamadas += 1",
      "        return f(*args, **kwargs)",
      "    envoltura.llamadas = 0",
      "    return envoltura",
      "",
      "@contar",
      "def saludar(): ...",
      "```",
      "",
      "Un **context manager** define qué pasa al entrar y salir de un bloque `with`, incluso si hay errores (`__enter__`/`__exit__`, o `contextlib.contextmanager` con `yield`).",
    ],
    example: {
      code: py`import functools

def registrar(f):
    @functools.wraps(f)
    def envoltura(*args):
        r = f(*args)
        print(f"{f.__name__}{args} -> {r}")
        return r
    return envoltura

@registrar
def sumar(a, b):
    return a + b

sumar(2, 3)`,
      lines: ["wraps conserva el nombre y la documentación de la función original.", "El decorador recibe una función.", "Copia metadatos de f.", "La envoltura acepta cualquier argumento.", "Llama a la función original.", "Añade comportamiento: registrar la llamada.", "Devuelve el resultado original.", "Devuelve la envoltura.", "Aplica el decorador.", "Función decorada.", "Suma.", "Muestra: sumar(2, 3) -> 5"],
    },
    challenge: [
      "1. Escribe el decorador `memoizar` que guarde en un diccionario los resultados por argumentos y exponga ese diccionario como atributo `cache` de la función decorada. Usa `functools.wraps`.",
      "2. Escribe el decorador `reintentar(veces)` (decorador con parámetro) que vuelva a llamar a la función si lanza una excepción, hasta `veces` intentos en total, y relance la última.",
      "3. Escribe el context manager `cronometro()` con `contextlib.contextmanager` que entregue un diccionario y, al salir, guarde en él la clave `\"segundos\"` con el tiempo transcurrido.",
    ],
    starter: py`def memoizar(f):
    return f

def reintentar(veces):
    def deco(f):
        return f
    return deco

def cronometro():
    return {}`,
    solution: py`import functools
import time
from contextlib import contextmanager

def memoizar(f):
    cache = {}

    @functools.wraps(f)
    def envoltura(*args):
        if args not in cache:
            cache[args] = f(*args)
        return cache[args]

    envoltura.cache = cache
    return envoltura

def reintentar(veces):
    def deco(f):
        @functools.wraps(f)
        def envoltura(*args, **kwargs):
            ultimo = None
            for _ in range(veces):
                try:
                    return f(*args, **kwargs)
                except Exception as e:
                    ultimo = e
            raise ultimo
        return envoltura
    return deco

@contextmanager
def cronometro():
    datos = {}
    inicio = time.perf_counter()
    try:
        yield datos
    finally:
        datos["segundos"] = time.perf_counter() - inicio`,
    tests: py`
def test_memoizar():
    "memoizar guarda resultados y conserva el nombre"
    m = t.get("memoizar", "function")
    llamadas = []
    @m
    def cuadrado(x):
        "Eleva al cuadrado"
        llamadas.append(x)
        return x * x
    assert cuadrado(4) == 16 and cuadrado(4) == 16 and llamadas == [4]
    assert cuadrado.cache == {(4,): 16}
    assert cuadrado.__name__ == "cuadrado" and cuadrado.__doc__ == "Eleva al cuadrado", "Usa functools.wraps"

def test_reintentar():
    "reintentar vuelve a intentar y relanza"
    r = t.get("reintentar", "function")
    estado = {"n": 0}
    @r(3)
    def fragil():
        estado["n"] += 1
        if estado["n"] < 3:
            raise IOError("fallo")
        return "ok"
    assert fragil() == "ok" and estado["n"] == 3
    @r(2)
    def nunca():
        raise KeyError("x")
    try:
        nunca()
    except KeyError:
        pass
    else:
        assert False, "Debía relanzar KeyError"

def test_cronometro():
    "cronometro mide incluso si hay error"
    import time
    c = t.get("cronometro", "function")
    with c() as d:
        time.sleep(0.05)
    assert d["segundos"] >= 0.04
    try:
        with c() as d2:
            raise ValueError
    except ValueError:
        pass
    assert "segundos" in d2
`,
    hints: [
      "Un decorador devuelve una función nueva (la envoltura) que llama a la original.",
      "Un decorador con parámetro tiene tres niveles: `reintentar(veces)` → `deco(f)` → `envoltura(*args)`.",
      "En el context manager, usa `try: yield datos` y `finally:` para guardar el tiempo aunque haya error.",
    ],
    errors: [
      { error: "La función decorada pierde su __name__", fix: "Aplica @functools.wraps(f) a la envoltura." },
      { error: "TypeError: 'NoneType' object is not callable", fix: "El decorador debe devolver la envoltura (return envoltura)." },
    ],
    quiz: {
      question: "¿A qué equivale escribir `@deco` encima de `def f(): ...`?",
      options: [
        { text: "A f = deco(f)" },
        { text: "A deco = f(deco)" },
        { text: "A llamar a deco cada vez que se define una función" },
        { text: "A heredar f de deco" },
      ],
      answer: 0,
      explanation: "La sintaxis @ es azúcar sintáctico: la función se pasa al decorador y el nombre queda ligado al resultado.",
    },
    review: "Repasa los tres niveles de un decorador con parámetros y el uso de functools.wraps.",
    xp: 85,
    coins: 12,
  },
  {
    id: "w2-regex",
    world: "w2",
    zone: "Texto y algoritmos",
    title: "Runas de búsqueda: expresiones regulares",
    kind: "lesson",
    difficulty: 3,
    skills: ["regex", "cadenas"],
    requires: ["w2-decoradores"],
    story: "Los pergaminos del monasterio mezclan fechas, nombres y códigos. Las runas de búsqueda encuentran patrones en cualquier texto.",
    objective: "Usar el módulo `re` (`search`, `findall`, `sub`, grupos con nombre) para extraer y limpiar información.",
    before: ["Cadenas", "Listas"],
    intuition: [
      "Una **expresión regular** describe un patrón de texto:",
      "",
      "- `\\d` dígito, `\\w` letra/dígito/_, `\\s` espacio, `.` cualquier carácter",
      "- `+` uno o más, `*` cero o más, `?` opcional, `{2,4}` entre 2 y 4",
      "- `[A-Z]` un carácter del rango, `^` inicio, `$` fin",
      "- `( )` grupo; `(?P<nombre>...)` grupo con nombre",
      "",
      "Escribe los patrones como cadenas *raw* `r\"...\"` para que las barras invertidas no se interpreten.",
      "",
      "`re.findall` devuelve todas las coincidencias; `re.sub` reemplaza; `re.fullmatch` valida un texto completo.",
    ],
    example: {
      code: py`import re
texto = "Pedido A-102 el 2025-03-14, pedido B-7 el 2025-04-01"
print(re.findall(r"[A-Z]-\d+", texto))
for m in re.finditer(r"(?P<a>\d{4})-(?P<m>\d{2})-(?P<d>\d{2})", texto):
    print(m["d"], m["m"], m["a"])`,
      lines: ["Importa el módulo.", "Texto con códigos y fechas.", "Códigos: letra mayúscula, guion y dígitos → ['A-102', 'B-7'].", "Recorre las fechas con grupos con nombre…", "…y las reordena como día, mes, año."],
    },
    challenge: [
      "Escribe:",
      "1. `extraer_emails(texto)`: lista de emails en minúsculas, sin repetidos y en orden de aparición.",
      "2. `normalizar_fechas(texto)`: reemplaza fechas `dd/mm/aaaa` por formato ISO `aaaa-mm-dd`.",
      "3. `es_codigo_valido(c)`: True si el código es exactamente 3 letras mayúsculas, un guion y 4 dígitos (ej. `ABC-2025`).",
    ],
    starter: py`import re

def extraer_emails(texto):
    return [p for p in texto.split() if "@" in p]

def normalizar_fechas(texto):
    return texto

def es_codigo_valido(c):
    return "-" in c`,
    solution: py`import re

def extraer_emails(texto):
    vistos = []
    for e in re.findall(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", texto):
        e = e.lower()
        if e not in vistos:
            vistos.append(e)
    return vistos

def normalizar_fechas(texto):
    return re.sub(r"\b(\d{2})/(\d{2})/(\d{4})\b", r"\3-\2-\1", texto)

def es_codigo_valido(c):
    return re.fullmatch(r"[A-Z]{3}-\d{4}", c) is not None`,
    tests: py`
def test_emails():
    "Extrae emails limpios"
    f = t.get("extraer_emails", "function")
    txt = "Escribe a Ana.Lopez@Gremio.org, o a soporte@quest.io. Repite: ana.lopez@gremio.org (no es-email@)."
    assert f(txt) == ["ana.lopez@gremio.org", "soporte@quest.io"], f(txt)

def test_fechas():
    "Convierte dd/mm/aaaa a ISO"
    f = t.get("normalizar_fechas", "function")
    assert f("Del 03/01/2025 al 28/02/2025.") == "Del 2025-01-03 al 2025-02-28."
    assert f("Sin fechas") == "Sin fechas"

def test_codigo():
    "Valida el formato completo"
    f = t.get("es_codigo_valido", "function")
    assert f("ABC-2025") and not f("AB-2025") and not f("ABC-20255") and not f("abc-2025") and not f("xABC-2025")
`,
    hints: [
      "Un email simple: `[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+`.",
      "En `re.sub` los grupos se referencian como `\\1`, `\\2`… en el reemplazo (usa una cadena raw).",
      "`re.fullmatch` exige que todo el texto coincida con el patrón.",
    ],
    errors: [
      { error: "El patrón \\d no funciona", fix: "Usa cadenas raw r\"\\d+\" para que Python no interprete la barra invertida." },
      { error: "re.search encuentra coincidencias parciales", fix: "Para validar un texto completo usa re.fullmatch o ancla con ^ y $." },
    ],
    quiz: {
      question: "¿Qué encuentra `re.findall(r\"\\d+\", \"a12b3\")`?",
      options: [{ text: "['12', '3']" }, { text: "['1', '2', '3']" }, { text: "[12, 3]" }, { text: "['a12b3']" }],
      answer: 0,
      explanation: "\\d+ captura secuencias de uno o más dígitos, como texto.",
    },
    review: "Repasa clases de caracteres, cuantificadores y la diferencia entre search, findall y fullmatch.",
    xp: 70,
    coins: 10,
  },
  {
    id: "w2-complejidad",
    world: "w2",
    zone: "Texto y algoritmos",
    title: "La escalera eficiente: complejidad algorítmica",
    kind: "lesson",
    difficulty: 3,
    skills: ["complejidad", "algoritmos"],
    requires: ["w2-regex"],
    story: "Dos guías buscan un nombre en el registro de 1 000 000 de escaladores. Uno revisa página por página; el otro abre por la mitad. ¿Quién llega antes?",
    objective: "Comparar el coste de algoritmos con la notación O grande, implementar búsqueda binaria y contar operaciones.",
    before: ["Bucles", "Listas", "Funciones"],
    intuition: [
      "La **complejidad** describe cómo crece el trabajo cuando crece la entrada n:",
      "",
      "- **O(1)**: constante (acceder a `lista[i]`, buscar en un dict).",
      "- **O(log n)**: búsqueda binaria; duplicar n añade un paso.",
      "- **O(n)**: recorrer una lista una vez.",
      "- **O(n log n)**: buenos algoritmos de ordenación.",
      "- **O(n²)**: comparar todos con todos.",
      "",
      "La **búsqueda binaria** solo funciona en datos **ordenados**: compara con el elemento central y descarta la mitad en cada paso.",
    ],
    formal: "Con n = 1 000 000, la búsqueda lineal necesita hasta 10⁶ comparaciones; la binaria, como mucho ⌈log₂(n + 1)⌉ = 20.",
    example: {
      code: py`import time
datos = list(range(200_000))
conjunto = set(datos)
t0 = time.perf_counter(); 199_999 in datos; t1 = time.perf_counter()
199_999 in conjunto; t2 = time.perf_counter()
print(f"lista {t1 - t0:.6f} s · set {t2 - t1:.6f} s")`,
      lines: ["Para medir tiempos.", "Una lista grande.", "El mismo contenido en un conjunto.", "Buscar en una lista es O(n): la recorre.", "Buscar en un set es O(1) en promedio.", "Compara los tiempos."],
    },
    challenge: [
      "1. Escribe `busqueda_binaria(lista, objetivo)` que devuelva una tupla `(indice, comparaciones)`; índice = -1 si no está. Cuenta una comparación por cada elemento central examinado.",
      "2. Escribe `hay_duplicados(lista)` en O(n) usando un conjunto (sin ordenar ni comparar todos con todos).",
    ],
    starter: py`def busqueda_binaria(lista, objetivo):
    for i, x in enumerate(lista):
        if x == objetivo:
            return i, i + 1
    return -1, len(lista)

def hay_duplicados(lista):
    for i in range(len(lista)):
        for j in range(len(lista)):
            if i != j and lista[i] == lista[j]:
                return True
    return False`,
    solution: py`def busqueda_binaria(lista, objetivo):
    lo, hi, comparaciones = 0, len(lista) - 1, 0
    while lo <= hi:
        medio = (lo + hi) // 2
        comparaciones += 1
        if lista[medio] == objetivo:
            return medio, comparaciones
        if lista[medio] < objetivo:
            lo = medio + 1
        else:
            hi = medio - 1
    return -1, comparaciones

def hay_duplicados(lista):
    vistos = set()
    for x in lista:
        if x in vistos:
            return True
        vistos.add(x)
    return False`,
    tests: py`
def test_correcta():
    "Encuentra elementos y detecta ausentes"
    f = t.get("busqueda_binaria", "function")
    datos = list(range(0, 2000, 2))
    for objetivo in (0, 2, 998, 1998):
        assert f(datos, objetivo)[0] == objetivo // 2
    assert f(datos, 7)[0] == -1 and f([], 3)[0] == -1

def test_logaritmica():
    "Usa como mucho 20 comparaciones con un millón de elementos"
    f = t.get("busqueda_binaria")
    datos = list(range(1_000_000))
    peor = max(f(datos, x)[1] for x in (0, 1, 499_999, 999_999, 123_457, -5))
    assert peor <= 20, f"Usaste {peor} comparaciones"

def test_duplicados():
    "hay_duplicados correcta y rápida"
    import time
    f = t.get("hay_duplicados", "function")
    assert f([3, 1, 3]) and not f([1, 2, 3]) and not f([])
    grande = list(range(200_000))
    t0 = time.time()
    assert not f(grande)
    assert time.time() - t0 < 1, "Demasiado lento: usa un conjunto"
`,
    hints: [
      "Mantén dos límites `lo` y `hi`; el central es `(lo + hi) // 2`.",
      "Si el central es menor que el objetivo, descarta la mitad izquierda (`lo = medio + 1`); si es mayor, la derecha.",
      "Para duplicados: recorre la lista y comprueba `x in vistos` antes de añadirlo al conjunto.",
    ],
    errors: [
      { error: "Bucle infinito en la búsqueda binaria", fix: "Asegúrate de mover lo a medio + 1 o hi a medio - 1; nunca a medio." },
      { error: "Aplicar búsqueda binaria a datos sin ordenar", fix: "El algoritmo asume orden. Si no lo hay, ordena primero (O(n log n)) o usa otra estructura." },
    ],
    quiz: {
      question: "Si duplicas el tamaño de la entrada, ¿cuánto aumenta aproximadamente el trabajo de un algoritmo O(n²)?",
      options: [{ text: "Se multiplica por 4" }, { text: "Se duplica" }, { text: "Aumenta en un paso" }, { text: "No cambia" }],
      answer: 0,
      explanation: "(2n)² = 4n². Por eso los algoritmos cuadráticos se vuelven impracticables con datos grandes.",
    },
    advanced: {
      title: "Dos sumas en O(n)",
      prompt: "Escribe `dos_suma(nums, objetivo)` que devuelva los índices (i, j), i < j, de dos números que sumen el objetivo, o None. Debe ser O(n) con un diccionario.",
      starter: py`def dos_suma(nums, objetivo):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == objetivo:
                return (i, j)`,
      solution: py`def dos_suma(nums, objetivo):
    vistos = {}
    for j, x in enumerate(nums):
        if objetivo - x in vistos:
            return (vistos[objetivo - x], j)
        vistos.setdefault(x, j)
    return None`,
      tests: py`
def test_ds():
    "Correcta y rápida"
    import time
    f = t.get("dos_suma", "function")
    assert f([2, 7, 11, 15], 9) == (0, 1) and f([1, 2], 10) is None
    big = list(range(100_000))
    t0 = time.time()
    assert f(big, 199_997) == (99_998, 99_999)
    assert time.time() - t0 < 1
`,
    },
    review: "Repasa por qué la búsqueda binaria es O(log n) y cuándo un conjunto convierte O(n²) en O(n).",
    xp: 80,
    coins: 12,
  },
  {
    id: "w2-estructuras",
    world: "w2",
    zone: "Texto y algoritmos",
    title: "Pilas y colas del refugio",
    kind: "lesson",
    difficulty: 3,
    skills: ["estructuras", "algoritmos"],
    requires: ["w2-complejidad"],
    story: "En el refugio, los platos se apilan (el último en llegar es el primero en salir) y los escaladores hacen cola (el primero en llegar es el primero en salir).",
    objective: "Usar pilas (LIFO) y colas (FIFO, `collections.deque`) para resolver problemas clásicos.",
    before: ["Listas", "Bucles", "Funciones"],
    intuition: [
      "- **Pila** (LIFO): `append` para apilar y `pop` para desapilar. Útil para deshacer acciones o comprobar paréntesis.",
      "- **Cola** (FIFO): `deque.append` para encolar y `deque.popleft` para atender. `list.pop(0)` es O(n); `deque.popleft()` es O(1).",
      "",
      "La **búsqueda en anchura** (BFS) usa una cola para explorar un mapa por capas: encuentra el camino más corto en número de pasos.",
    ],
    example: {
      code: py`from collections import deque
cola = deque(["Ada", "Lin"])
cola.append("Eva")
print(cola.popleft(), list(cola))
pila = [1, 2]
pila.append(3)
print(pila.pop(), pila)`,
      lines: ["deque: cola eficiente por ambos extremos.", "Dos personas esperando.", "Llega otra al final.", "Se atiende a la primera: Ada ['Lin', 'Eva'].", "Una pila.", "Se apila el 3.", "Sale el último: 3 [1, 2]."],
    },
    challenge: [
      "1. `balanceado(texto)`: True si los paréntesis `()`, corchetes `[]` y llaves `{}` están correctamente anidados (ignora otros caracteres). Usa una pila.",
      "2. `camino_mas_corto(mapa)`: el mapa es una lista de cadenas con `S` (salida), `E` (meta), `.` (libre) y `#` (roca). Devuelve el número mínimo de pasos (arriba/abajo/izquierda/derecha) de S a E, o -1 si no hay camino. Usa BFS con una cola.",
    ],
    starter: py`def balanceado(texto):
    return texto.count("(") == texto.count(")")

def camino_mas_corto(mapa):
    return -1`,
    solution: py`from collections import deque

def balanceado(texto):
    pares = {")": "(", "]": "[", "}": "{"}
    pila = []
    for c in texto:
        if c in "([{":
            pila.append(c)
        elif c in pares:
            if not pila or pila.pop() != pares[c]:
                return False
    return not pila

def camino_mas_corto(mapa):
    filas, cols = len(mapa), len(mapa[0])
    inicio = next((f, c) for f in range(filas) for c in range(cols) if mapa[f][c] == "S")
    cola = deque([(inicio, 0)])
    vistos = {inicio}
    while cola:
        (f, c), d = cola.popleft()
        if mapa[f][c] == "E":
            return d
        for df, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nf, nc = f + df, c + dc
            if 0 <= nf < filas and 0 <= nc < cols and mapa[nf][nc] != "#" and (nf, nc) not in vistos:
                vistos.add((nf, nc))
                cola.append(((nf, nc), d + 1))
    return -1`,
    tests: py`
def test_balanceado():
    "Detecta anidamiento correcto"
    f = t.get("balanceado", "function")
    assert f("print([1, {2: (3)}])") and f("") and f("sin nada")
    assert not f("(]") and not f("([)]") and not f("((") and not f(")(")

def test_camino():
    "BFS encuentra el camino más corto"
    f = t.get("camino_mas_corto", "function")
    mapa = ["S.#....",
            ".##.##.",
            "...#..E",
            ".#...#."]
    assert f(mapa) == 10, f(mapa)
    assert f(["S#E"]) == -1
    assert f(["SE"]) == 1
`,
    hints: [
      "Pila: al ver un símbolo de apertura, apílalo; al ver uno de cierre, desapila y comprueba que coincide.",
      "Al final la pila debe quedar vacía.",
      "BFS: guarda en la cola (posición, distancia) y un conjunto de visitados para no repetir casillas.",
    ],
    errors: [
      { error: "IndexError al desapilar", fix: "Antes de pop, comprueba que la pila no está vacía (un cierre sin apertura)." },
      { error: "BFS que no termina", fix: "Marca las casillas como visitadas al encolarlas, no al sacarlas." },
    ],
    quiz: {
      question: "¿Por qué BFS encuentra el camino con menos pasos en un mapa sin pesos?",
      options: [
        { text: "Porque explora todas las casillas a distancia d antes que las de distancia d + 1" },
        { text: "Porque siempre va hacia la meta en línea recta" },
        { text: "Porque usa una pila" },
        { text: "Porque prueba los caminos al azar" },
      ],
      answer: 0,
      explanation: "La cola FIFO procesa por capas de distancia, así que la primera vez que llega a la meta lo hace por el camino más corto.",
    },
    review: "Repasa LIFO frente a FIFO y por qué deque es la cola adecuada en Python.",
    xp: 85,
    coins: 12,
  },
  {
    id: "w2-pruebas",
    world: "w2",
    zone: "Calidad del código",
    title: "Los guardianes: escribir pruebas",
    kind: "lesson",
    difficulty: 4,
    skills: ["pruebas", "depuracion"],
    requires: ["w2-estructuras"],
    story: "Los guardianes del paso detectan impostores. Tus pruebas son guardianes: deben dejar pasar el código correcto y atrapar el defectuoso.",
    objective: "Escribir pruebas al estilo pytest (funciones `test_*` con `assert`) que detecten errores reales, incluidos casos límite.",
    before: ["Funciones", "Excepciones"],
    intuition: [
      "Una **prueba automatizada** ejecuta el código con entradas conocidas y comprueba el resultado con `assert`. En pytest basta con funciones cuyo nombre empieza por `test_`.",
      "",
      "Una buena batería de pruebas cubre:",
      "",
      "- el caso típico,",
      "- los **casos límite** (vacío, un elemento, cero, negativos, empates),",
      "- las **entradas inválidas** (¿se lanza la excepción esperada?).",
      "",
      "Para comprobar tus pruebas, aquí las ejecutaremos contra varias implementaciones: una correcta (deben pasar) y varias con errores sutiles (al menos una prueba debe fallar en cada una). Es lo que se llama *mutation testing*.",
      "",
      "En tu ordenador instalarías pytest (`pip install pytest`) y ejecutarías `pytest`.",
    ],
    example: {
      code: py`def mediana(xs):
    s = sorted(xs)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2

def test_impar():
    assert mediana([3, 1, 2]) == 2

def test_par():
    assert mediana([4, 1, 3, 2]) == 2.5

test_impar(); test_par(); print("pruebas superadas")`,
      lines: ["Función a probar.", "Ordena.", "Tamaño.", "Central si n es impar; media de las dos centrales si es par.", "Una prueba: caso impar.", "Comprueba el resultado esperado.", "Otra prueba: caso par.", "Media de 2 y 3.", "Aquí las llamamos a mano; pytest lo haría automáticamente."],
    },
    challenge: [
      "La función a probar es `descuento(precio, porcentaje)`: devuelve el precio con el descuento aplicado, redondeado a 2 decimales, y lanza `ValueError` si el precio es negativo o el porcentaje no está entre 0 y 100.",
      "Escribe **tus propias funciones de prueba** `test_...` (al menos 4) que llamen a `descuento`. No implementes `descuento`: las pruebas del juego la inyectarán.",
      "Tus pruebas deben pasar con la versión correcta y fallar con cada versión defectuosa (que olvida redondear, acepta porcentajes > 100, invierte el cálculo, o no valida precios negativos).",
    ],
    starter: py`# 'descuento' será inyectada por el juego. Escribe pruebas que la usen.

def test_basico():
    assert descuento(100, 10) == 90
`,
    solution: py`def test_basico():
    assert descuento(100, 10) == 90

def test_redondeo():
    assert descuento(19.99, 15) == 16.99

def test_limites():
    assert descuento(50, 0) == 50
    assert descuento(50, 100) == 0

def test_porcentaje_invalido():
    for p in (-1, 101):
        try:
            descuento(10, p)
        except ValueError:
            continue
        assert False, f"porcentaje {p} aceptado"

def test_precio_negativo():
    try:
        descuento(-5, 10)
    except ValueError:
        return
    assert False, "precio negativo aceptado"`,
    tests: py`
def correcta(precio, porcentaje):
    if precio < 0 or not 0 <= porcentaje <= 100:
        raise ValueError
    return round(precio * (1 - porcentaje / 100), 2)

def sin_redondeo(precio, porcentaje):
    if precio < 0 or not 0 <= porcentaje <= 100:
        raise ValueError
    return precio * (1 - porcentaje / 100)

def sin_tope(precio, porcentaje):
    if precio < 0 or porcentaje < 0:
        raise ValueError
    return round(precio * (1 - porcentaje / 100), 2)

def invertida(precio, porcentaje):
    if precio < 0 or not 0 <= porcentaje <= 100:
        raise ValueError
    return round(precio * porcentaje / 100, 2)

def sin_precio(precio, porcentaje):
    if not 0 <= porcentaje <= 100:
        raise ValueError
    return round(precio * (1 - porcentaje / 100), 2)

def _ejecutar(impl):
    pruebas = [f for n, f in t.ns.items() if n.startswith("test_") and callable(f)]
    assert len(pruebas) >= 4, f"Escribe al menos 4 funciones test_ (tienes {len(pruebas)})"
    t.ns["descuento"] = impl
    fallos = []
    for p in pruebas:
        try:
            p()
        except Exception as e:
            fallos.append(p.__name__)
    return fallos

def test_pasan_con_la_correcta():
    "Tus pruebas pasan con la implementación correcta"
    fallos = _ejecutar(correcta)
    assert not fallos, f"Fallan con la versión correcta: {fallos}"

def test_detectan_redondeo():
    "Detectan la versión que no redondea"
    assert _ejecutar(sin_redondeo), "Ninguna prueba detectó la falta de redondeo (prueba un precio con decimales)"

def test_detectan_tope():
    "Detectan la versión que acepta porcentajes > 100"
    assert _ejecutar(sin_tope), "Ninguna prueba detectó porcentajes > 100"

def test_detectan_inversion():
    "Detectan la versión que devuelve el descuento en vez del precio final"
    assert _ejecutar(invertida)

def test_detectan_precio_negativo():
    "Detectan la versión que acepta precios negativos"
    assert _ejecutar(sin_precio), "Ninguna prueba comprobó un precio negativo"
`,
    hints: [
      "Necesitas un caso con decimales donde redondear importe, por ejemplo `descuento(19.99, 15)`.",
      "Para comprobar una excepción: `try: descuento(10, 101)` y `except ValueError: return`, con `assert False` al final.",
      "No olvides los límites 0 % y 100 %, y un precio negativo.",
    ],
    errors: [
      { error: "NameError: name 'descuento' is not defined", fix: "Al pulsar Ejecutar no existe descuento: solo se inyecta al Comprobar. Define temporalmente tu propia versión si quieres probar en local." },
      { error: "Pruebas que nunca fallan", fix: "Una prueba sin assert o con asserts triviales no protege nada. Piensa qué error concreto atrapa cada prueba." },
    ],
    quiz: {
      question: "Si todas tus pruebas pasan, ¿qué puedes afirmar del código?",
      options: [
        { text: "Que se comporta bien en los casos que probaste, no que esté libre de errores" },
        { text: "Que no tiene ningún error" },
        { text: "Que es eficiente" },
        { text: "Que cumple la especificación completa" },
      ],
      answer: 0,
      explanation: "Las pruebas muestran la presencia de errores, nunca su ausencia. Su valor depende de qué casos cubren.",
    },
    review: "Repasa qué casos límite debe cubrir una batería de pruebas.",
    xp: 90,
    coins: 13,
  },
  {
    id: "w2-tipos",
    world: "w2",
    zone: "Calidad del código",
    title: "El mapa legible: type hints, docstrings y dataclasses",
    kind: "lesson",
    difficulty: 3,
    skills: ["tipado", "documentacion"],
    requires: ["w2-pruebas"],
    story: "Un mapa sin leyenda solo lo entiende quien lo dibujó. Las anotaciones de tipo y la documentación son la leyenda de tu código.",
    objective: "Anotar funciones con type hints, documentarlas con docstrings y usar `dataclasses` para datos estructurados.",
    before: ["Funciones", "Clases"],
    intuition: [
      "Las **anotaciones de tipo** indican qué espera y qué devuelve una función:",
      "",
      "```python",
      "def media(valores: list[float]) -> float:",
      "    \"\"\"Devuelve la media aritmética. Lanza ValueError si la lista está vacía.\"\"\"",
      "```",
      "",
      "Python no las comprueba al ejecutar, pero herramientas como **mypy** o tu editor detectan errores antes de ejecutar.",
      "",
      "Una **dataclass** genera `__init__`, `__repr__` y `__eq__` a partir de los campos anotados:",
      "",
      "```python",
      "@dataclass",
      "class Punto:",
      "    x: float",
      "    y: float = 0.0",
      "```",
    ],
    example: {
      code: py`from dataclasses import dataclass, field

@dataclass(order=True)
class Tarea:
    prioridad: int
    nombre: str = field(compare=False)

print(sorted([Tarea(2, "b"), Tarea(1, "a")]))`,
      lines: ["Importa dataclass y field.", "order=True permite comparar y ordenar.", "Define los campos con tipos.", "Se compara por prioridad…", "…pero no por nombre.", "[Tarea(prioridad=1, nombre='a'), Tarea(prioridad=2, nombre='b')]"],
    },
    challenge: [
      "1. Crea la dataclass `Muestra` con campos `id: str`, `valor: float` y `etiquetas: list[str]` (por defecto lista vacía con `field(default_factory=list)`).",
      "2. Escribe `resumen(muestras: list[Muestra]) -> dict[str, float]` que devuelva `{\"n\": ..., \"media\": ..., \"maximo\": ...}` (media y máximo `None` si la lista está vacía) con **anotaciones de tipo** y un **docstring**.",
      "3. Escribe `con_etiqueta(muestras: list[Muestra], etiqueta: str) -> list[str]` que devuelva los ids que tienen la etiqueta, también anotada y documentada.",
    ],
    starter: py`class Muestra:
    pass

def resumen(muestras):
    return {}

def con_etiqueta(muestras, etiqueta):
    return []`,
    solution: py`from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Muestra:
    id: str
    valor: float
    etiquetas: list[str] = field(default_factory=list)

def resumen(muestras: list[Muestra]) -> dict[str, Optional[float]]:
    """Devuelve n, media y máximo de los valores (None si no hay muestras)."""
    if not muestras:
        return {"n": 0, "media": None, "maximo": None}
    valores = [m.valor for m in muestras]
    return {"n": len(valores), "media": sum(valores) / len(valores), "maximo": max(valores)}

def con_etiqueta(muestras: list[Muestra], etiqueta: str) -> list[str]:
    """Ids de las muestras que llevan la etiqueta indicada, en orden."""
    return [m.id for m in muestras if etiqueta in m.etiquetas]`,
    tests: py`
import dataclasses, inspect

def test_dataclass():
    "Muestra es una dataclass con etiquetas independientes"
    M = t.get("Muestra")
    assert dataclasses.is_dataclass(M)
    a, b = M("a", 1.0), M("b", 2.0)
    a.etiquetas.append("x")
    assert b.etiquetas == [], "Usa field(default_factory=list)"
    assert M("a", 1.0) == M("a", 1.0)

def test_resumen():
    "resumen correcto"
    M, r = t.get("Muestra"), t.get("resumen", "function")
    assert r([M("a", 2.0), M("b", 4.0), M("c", 9.0)]) == {"n": 3, "media": 5.0, "maximo": 9.0}
    assert r([]) == {"n": 0, "media": None, "maximo": None}

def test_etiquetas():
    "con_etiqueta filtra"
    M = t.get("Muestra")
    ms = [M("a", 1, ["lab"]), M("b", 2), M("c", 3, ["lab", "x"])]
    assert t.get("con_etiqueta", "function")(ms, "lab") == ["a", "c"]

def test_anotado_y_documentado():
    "Funciones anotadas y documentadas"
    for nombre in ("resumen", "con_etiqueta"):
        f = t.get(nombre)
        sig = inspect.signature(f)
        assert sig.return_annotation is not inspect.Signature.empty, f"{nombre} no anota el tipo de retorno"
        assert all(p.annotation is not inspect.Parameter.empty for p in sig.parameters.values()), f"{nombre} tiene parámetros sin anotar"
        assert (f.__doc__ or "").strip(), f"{nombre} no tiene docstring"
`,
    hints: [
      "`from dataclasses import dataclass, field` y decora la clase con `@dataclass`.",
      "Para una lista por defecto: `etiquetas: list[str] = field(default_factory=list)`.",
      "El docstring es una cadena entre triples comillas justo debajo del `def`.",
    ],
    errors: [
      { error: "ValueError: mutable default <class 'list'> for field etiquetas is not allowed", fix: "Usa field(default_factory=list) en lugar de = []." },
      { error: "Creer que las anotaciones validan los datos", fix: "Python no las comprueba en ejecución. Para validar en tiempo de ejecución se usan bibliotecas como Pydantic." },
    ],
    quiz: {
      question: "¿Qué ocurre al ejecutar `def f(x: int) -> int: return x * 2` con `f(\"ab\")`?",
      options: [
        { text: "Devuelve 'abab': las anotaciones no se comprueban al ejecutar" },
        { text: "Lanza TypeError por el tipo incorrecto" },
        { text: "Devuelve None" },
        { text: "Convierte 'ab' a int" },
      ],
      answer: 0,
      explanation: "Los type hints son información para personas y herramientas estáticas; el intérprete los ignora al ejecutar.",
    },
    review: "Repasa qué aportan los type hints, los docstrings y las dataclasses.",
    xp: 70,
    coins: 10,
  },
];
