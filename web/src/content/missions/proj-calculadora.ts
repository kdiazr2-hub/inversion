import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 2: una calculadora científica en Python puro. El analizador de
// expresiones se escribe a mano (sin eval), las funciones matemáticas se implementan con series y
// el método de Newton y se comparan con el módulo math, y la etapa final usa la calculadora para
// derivar, integrar y resolver ecuaciones numéricamente.

const SERIES = { id: "calculadora-cientifica", title: "Proyecto progresivo: la calculadora de las Montañas", of: 4 };

const SPEC: ProjectSpec = {
  requirements: [
    "Evaluar expresiones con +, −, ×, ÷, potencias y paréntesis respetando la precedencia, sin usar eval.",
    "Distinguir los errores del usuario (expresión mal escrita, división entre cero) de los fallos del programa con una excepción propia.",
    "Implementar raíz cuadrada, exponencial, logaritmo, seno y coseno sin el módulo math y comprobar su precisión contra él.",
    "Mantener una sesión con variables, `ans`, historial y deshacer.",
    "Derivar, integrar y resolver ecuaciones escritas por el usuario, midiendo el error y el orden de convergencia.",
  ],
  dataset: "Sin archivo de datos: las entradas son expresiones escritas por el usuario; las pruebas comparan con eval de Python y con el módulo math.",
  stages: ["Analizador de expresiones", "Funciones matemáticas hechas a mano", "Sesión con variables, historial y deshacer", "Análisis numérico: derivadas, integrales y raíces"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Ninguna expresión del usuario se evalúa con eval.",
    "Las funciones propias coinciden con math con un error relativo menor que 10⁻¹².",
    "Simpson alcanza orden 4 y la bisección usa exactamente ⌈log₂((b − a)/tol)⌉ iteraciones.",
  ],
  extensions: [
    "Añadir funciones de dos argumentos (máximo, logaritmo en base b) y separar argumentos con comas.",
    "Construir un árbol sintáctico en lugar de evaluar directamente, y derivar expresiones de forma simbólica.",
    "Representar con matplotlib una función escrita por el usuario y marcar sus raíces.",
  ],
  portfolio: "Calculadora científica en Python puro: analizador descendente recursivo con precedencia y errores propios, funciones trascendentes por series y Newton verificadas contra math, sesión con variables y deshacer, y análisis numérico (diferencias centrales, Simpson de orden 4, bisección y Newton).",
};

const S1 = py`class ErrorCalculo(ValueError):
    """Error del usuario al escribir una expresión (no un fallo del programa)."""

    def __init__(self, mensaje, posicion=None):
        super().__init__(mensaje)
        self.posicion = posicion


OPERADORES = "+-*/^()"
CONSTANTES = {}
FUNCIONES = {}


def tokenizar(texto):
    tokens = []
    i = 0
    while i < len(texto):
        c = texto[i]
        if c.isspace():
            i += 1
        elif c.isdigit() or c == ".":
            j = i
            while j < len(texto) and (texto[j].isdigit() or texto[j] == "."):
                j += 1
            try:
                tokens.append(float(texto[i:j]))
            except ValueError:
                raise ErrorCalculo(f"número mal escrito: {texto[i:j]}", i) from None
            i = j
        elif c.isalpha() or c == "_":
            j = i
            while j < len(texto) and (texto[j].isalnum() or texto[j] == "_"):
                j += 1
            tokens.append(texto[i:j])
            i = j
        elif c in OPERADORES:
            tokens.append(c)
            i += 1
        else:
            raise ErrorCalculo(f"carácter no válido: {c!r}", i)
    return tokens


class _Analizador:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def ver(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def tomar(self):
        tok = self.ver()
        self.pos += 1
        return tok

    def esperar(self, simbolo):
        if self.ver() != simbolo:
            raise ErrorCalculo(f"se esperaba {simbolo!r}")
        self.pos += 1

    def expresion(self):
        valor = self.termino()
        while self.ver() in ("+", "-"):
            if self.tomar() == "+":
                valor += self.termino()
            else:
                valor -= self.termino()
        return valor

    def termino(self):
        valor = self.factor()
        while self.ver() in ("*", "/"):
            op = self.tomar()
            derecho = self.factor()
            if op == "*":
                valor *= derecho
            elif derecho == 0:
                raise ErrorCalculo("división entre cero")
            else:
                valor /= derecho
        return valor

    def factor(self):
        if self.ver() == "-":
            self.tomar()
            return -self.factor()
        if self.ver() == "+":
            self.tomar()
            return self.factor()
        return self.potencia()

    def potencia(self):
        base = self.atomo()
        if self.ver() == "^":
            self.tomar()
            exponente = self.factor()
            try:
                resultado = base ** exponente
            except (OverflowError, ZeroDivisionError) as e:
                raise ErrorCalculo(f"potencia no válida: {e}") from None
            if isinstance(resultado, complex):
                raise ErrorCalculo("la potencia no tiene resultado real")
            return resultado
        return base

    def atomo(self):
        tok = self.tomar()
        if isinstance(tok, float):
            return tok
        if tok == "(":
            valor = self.expresion()
            self.esperar(")")
            return valor
        if isinstance(tok, str) and (tok[0].isalpha() or tok[0] == "_"):
            if self.ver() == "(":
                if tok not in FUNCIONES:
                    raise ErrorCalculo(f"función desconocida: {tok}")
                self.tomar()
                argumento = self.expresion()
                self.esperar(")")
                return FUNCIONES[tok](argumento)
            if tok in self.variables:
                return self.variables[tok]
            if tok in CONSTANTES:
                return CONSTANTES[tok]
            raise ErrorCalculo(f"nombre desconocido: {tok}")
        if tok is None:
            raise ErrorCalculo("la expresión termina antes de tiempo")
        raise ErrorCalculo(f"símbolo inesperado: {tok!r}")


def evaluar(texto, variables=None):
    tokens = tokenizar(texto)
    if not tokens:
        raise ErrorCalculo("expresión vacía")
    analizador = _Analizador(tokens, variables or {})
    valor = analizador.expresion()
    if analizador.pos != len(tokens):
        raise ErrorCalculo(f"sobra {tokens[analizador.pos]!r}")
    return float(valor)`;

const S2 = py`PI = 3.141592653589793


def raiz(x, tol=1e-15):
    if x < 0:
        raise ErrorCalculo("raíz de un número negativo")
    if x == 0:
        return 0.0
    y = x if x >= 1 else 1.0
    while True:
        nuevo = (y + x / y) / 2
        if abs(nuevo - y) <= tol * nuevo:
            return nuevo
        y = nuevo


def exp_serie(x):
    # e^x = (e^(x/2^k))^(2^k): con |x/2^k| < 0.5 la serie converge en pocos términos.
    k = 0
    while abs(x) > 0.5:
        x /= 2
        k += 1
    suma, termino, n = 1.0, 1.0, 0
    while abs(termino) > 1e-17 * abs(suma):
        n += 1
        termino *= x / n
        suma += termino
    for _ in range(k):
        suma *= suma
    return suma


def _atanh_serie(z):
    # atanh(z) = z + z³/3 + z⁵/5 + …  (|z| < 1)
    suma, potencia, n = 0.0, z, 1
    while abs(potencia / n) > 1e-18:
        suma += potencia / n
        potencia *= z * z
        n += 2
    return suma


LN2 = 2 * _atanh_serie(1 / 3)


def ln(x):
    if x <= 0:
        raise ErrorCalculo("logaritmo de un número no positivo")
    k = 0
    while x > 2:
        x /= 2
        k += 1
    while x < 1:
        x *= 2
        k -= 1
    return k * LN2 + 2 * _atanh_serie((x - 1) / (x + 1))


def seno(x):
    x = x % (2 * PI)
    if x > PI:
        x -= 2 * PI
    suma, termino, n = x, x, 1
    while abs(termino) > 1e-18:
        termino *= -x * x / ((n + 1) * (n + 2))
        suma += termino
        n += 2
    return suma


def coseno(x):
    return seno(x + PI / 2)


FUNCIONES.update({"raiz": raiz, "exp": exp_serie, "ln": ln, "sen": seno, "cos": coseno})
CONSTANTES.update({"pi": PI, "e": exp_serie(1.0)})`;

const S3 = py`import math


def formatear(valor, cifras=12):
    if math.isinf(valor) or math.isnan(valor):
        return str(valor)
    if valor == int(valor) and abs(valor) < 1e15:
        return str(int(valor))
    return f"{valor:.{cifras}g}"


class Calculadora:
    def __init__(self):
        self.variables = {}
        self.historial = []

    def ejecutar(self, linea):
        try:
            nombre, expresion = None, linea
            if "=" in linea:
                nombre, expresion = (parte.strip() for parte in linea.split("=", 1))
                if not nombre.isidentifier():
                    raise ErrorCalculo(f"nombre de variable no válido: {nombre!r}")
                if nombre in FUNCIONES or nombre in CONSTANTES or nombre == "ans":
                    raise ErrorCalculo(f"{nombre} es un nombre reservado")
            valor = evaluar(expresion, self.variables)
        except ErrorCalculo as e:
            entrada = {"entrada": linea, "ok": False, "error": str(e)}
        else:
            self.variables["ans"] = valor
            if nombre:
                self.variables[nombre] = valor
            entrada = {"entrada": linea, "ok": True, "valor": valor, "texto": formatear(valor)}
        self.historial.append(entrada)
        return entrada

    def deshacer(self):
        """Quita la última línea correcta y recalcula las variables desde el principio."""
        for i in range(len(self.historial) - 1, -1, -1):
            if self.historial[i]["ok"]:
                lineas = [h["entrada"] for h in self.historial[:i] + self.historial[i + 1:]]
                self.variables, self.historial = {}, []
                for linea in lineas:
                    self.ejecutar(linea)
                return True
        return False


sesion = Calculadora()
for linea in ["r = 2", "area = pi*r^2", "area / r", "x = 1/0", "2 = 3", "ln(ans)"]:
    sesion.ejecutar(linea)`;

const S4 = py`def funcion_de(expresion, variable="x"):
    tokenizar(expresion)  # detecta caracteres no válidos antes de usarla
    def f(valor):
        return evaluar(expresion, {variable: valor})
    return f


def derivada(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)


def simpson(f, a, b, n=100):
    if n % 2:
        raise ValueError("Simpson necesita un número par de subintervalos")
    h = (b - a) / n
    suma = f(a) + f(b)
    for i in range(1, n):
        suma += (4 if i % 2 else 2) * f(a + i * h)
    return suma * h / 3


def biseccion(f, a, b, tol=1e-12):
    fa, fb = f(a), f(b)
    if fa * fb > 0:
        raise ValueError("f(a) y f(b) deben tener signos distintos")
    iteraciones = 0
    while b - a > tol:
        m = (a + b) / 2
        fm = f(m)
        iteraciones += 1
        if fm == 0:
            return m, iteraciones
        if fa * fm < 0:
            b, fb = m, fm
        else:
            a, fa = m, fm
    return (a + b) / 2, iteraciones


def newton(f, x0, tol=1e-12, max_iter=50):
    x = x0
    for i in range(1, max_iter + 1):
        pendiente = derivada(f, x)
        if pendiente == 0:
            raise ValueError("derivada nula: Newton no puede continuar")
        paso = f(x) / pendiente
        x -= paso
        if abs(paso) < tol:
            return x, i
    raise ValueError("Newton no convergió")


def orden_simpson(f, a, b, exacto, n=8):
    e1 = abs(simpson(f, a, b, n) - exacto)
    e2 = abs(simpson(f, a, b, 2 * n) - exacto)
    return math.log2(e1 / e2)


seno_x = funcion_de("sen(x)")
r_bis, it_bis = biseccion(funcion_de("x^2 - 2"), 0, 2)
r_newton, it_newton = newton(funcion_de("x^2 - 2"), 1)
dottie, _ = newton(funcion_de("cos(x) - x"), 1)
informe = {
    "derivada_seno_en_0": derivada(seno_x, 0),
    "integral_seno": simpson(seno_x, 0, PI),
    "orden_simpson": orden_simpson(seno_x, 0, PI, 2.0),
    "raiz2_biseccion": r_bis,
    "iteraciones_biseccion": it_bis,
    "raiz2_newton": r_newton,
    "iteraciones_newton": it_newton,
    "dottie": dottie,
}`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

export const PROJ_CALCULADORA: Mission[] = [
  {
    id: "pc-calc-1",
    world: "w2",
    zone: "Proyecto de las Montañas",
    title: "La calculadora de las Montañas · 1: un analizador de expresiones sin eval",
    kind: "project",
    difficulty: 4,
    skills: ["recursion", "poo", "errores", "descomposicion"],
    requires: ["w2-excepciones"],
    series: { ...SERIES, stage: 1 },
    story: "El gremio de cartógrafos de las Montañas necesita una calculadora para sus mediciones. El último aprendiz usó eval y un cliente escribió una orden que borró los archivos del gremio. La nueva regla: la calculadora entiende solo aritmética, y la entiende porque tú le enseñas.",
    objective: "Dividir el texto en tokens y evaluarlo con un analizador descendente recursivo que respete la precedencia y la asociatividad, informando de los errores con una excepción propia.",
    before: ["Recursión", "Clases", "Excepciones propias"],
    intuition: [
      "Evaluar `2 + 3 * 4` exige saber que `*` va antes que `+`. La técnica clásica es escribir **una función por nivel de precedencia**, de menor a mayor, y que cada una llame a la del nivel siguiente:",
      "",
      "- `expresion` suma y resta **términos**;",
      "- `termino` multiplica y divide **factores**;",
      "- `factor` trata el signo menos delante (−x);",
      "- `potencia` trata `^`, que agrupa por la derecha: 2^3^2 = 2^(3^2) = 512;",
      "- `atomo` es un número, una variable o una expresión entre paréntesis… que vuelve a llamar a `expresion`. Ahí está la recursión.",
      "",
      "Antes hay que **tokenizar**: convertir `\"3.5*(x+2)\"` en `[3.5, \"*\", \"(\", \"x\", \"+\", 2.0, \")\"]`.",
      "",
      "Los errores del usuario (falta un paréntesis, divide entre cero) no son fallos del programa: se señalan con una excepción propia, `ErrorCalculo`, que la interfaz puede mostrar sin detenerse.",
    ],
    formal: "expresion → termino (('+' | '−') termino)* · termino → factor (('×' | '÷') factor)* · factor → ('−' | '+') factor | potencia · potencia → atomo ('^' factor)? · atomo → número | nombre | nombre '(' expresion ')' | '(' expresion ')'",
    example: {
      code: py`def suma_de_productos(tokens):
    total, producto = 0, tokens[0]
    for i in range(1, len(tokens), 2):
        if tokens[i] == "*":
            producto *= tokens[i + 1]
        else:
            total, producto = total + producto, tokens[i + 1]
    return total + producto

print(suma_de_productos([2, "+", 3, "*", 4]))`,
      lines: [
        "Versión mínima con solo + y ×, sin paréntesis.",
        "Acumula la suma de los productos ya cerrados y el producto en curso.",
        "Recorre los operadores (posiciones impares).",
        "Si el operador es ×…",
        "…amplía el producto en curso.",
        "Si es +…",
        "…cierra el producto: se suma al total y empieza otro.",
        "Al final se suma el último producto.",
        "14: el 3 × 4 se agrupa antes de sumar el 2.",
      ],
    },
    challenge: [
      "1. `tokenizar(texto)`: lista de tokens. Números (`3`, `0.25`) como `float`; nombres (letras, cifras y `_`, empezando por letra o `_`) como `str`; los símbolos `+ - * / ^ ( )` como `str`. Ignora los espacios. Un carácter no válido o un número como `1..2` lanzan `ErrorCalculo` con `posicion` = índice del carácter.",
      "2. Completa los métodos de `_Analizador` siguiendo la gramática de la explicación formal. `^` agrupa por la derecha y admite exponentes negativos (`2^-1`); `-2^2` vale −4.",
      "3. En `atomo`, un nombre seguido de `(` es una llamada a una función de `FUNCIONES`; si no, se busca primero en `variables` y después en `CONSTANTES`. Lo desconocido lanza `ErrorCalculo`.",
      "4. Lanza `ErrorCalculo` (nunca otra excepción) ante: expresión vacía o incompleta, paréntesis sin cerrar o sobrantes, símbolos que sobran (`3 4`, `2**3`), división entre cero y potencias sin resultado real (`(-8)^(1/3)`).",
      "5. `evaluar(texto, variables=None)` devuelve un `float`. No uses `eval`.",
    ],
    starter: py`class ErrorCalculo(ValueError):
    """Error del usuario al escribir una expresión (no un fallo del programa)."""

    def __init__(self, mensaje, posicion=None):
        super().__init__(mensaje)
        self.posicion = posicion


OPERADORES = "+-*/^()"
CONSTANTES = {}
FUNCIONES = {}


def tokenizar(texto):
    tokens = []
    # Recorre el texto con un índice i: números, nombres, operadores, espacios y errores.
    return tokens


class _Analizador:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def ver(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def tomar(self):
        tok = self.ver()
        self.pos += 1
        return tok

    def esperar(self, simbolo):
        if self.ver() != simbolo:
            raise ErrorCalculo(f"se esperaba {simbolo!r}")
        self.pos += 1

    def expresion(self):
        return 0.0

    def termino(self):
        return 0.0

    def factor(self):
        return 0.0

    def potencia(self):
        return 0.0

    def atomo(self):
        return 0.0


def evaluar(texto, variables=None):
    tokens = tokenizar(texto)
    if not tokens:
        raise ErrorCalculo("expresión vacía")
    analizador = _Analizador(tokens, variables or {})
    valor = analizador.expresion()
    if analizador.pos != len(tokens):
        raise ErrorCalculo(f"sobra {tokens[analizador.pos]!r}")
    return float(valor)`,
    solution: SOL1,
    tests: py`
def test_tokenizar():
    "Tokens, espacios y posición de los errores"
    tok = t.get("tokenizar", "function")
    E = t.get("ErrorCalculo")
    assert issubclass(E, ValueError), "ErrorCalculo debe heredar de ValueError"
    assert tok("3.5*(x+2)") == [3.5, "*", "(", "x", "+", 2.0, ")"]
    assert tok("  ") == [] and tok("sen(pi)") == ["sen", "(", "pi", ")"] and tok("_a1^2") == ["_a1", "^", 2.0]
    assert all(isinstance(x, float) for x in tok("1 22 0.5") )
    for texto, posicion in (("2 $ 3", 2), ("1..2", 0), ("x = 1", 2)):
        try:
            tok(texto)
        except E as e:
            assert e.posicion == posicion, f"{texto!r}: posicion {e.posicion}, se esperaba {posicion}"
        else:
            raise AssertionError(f"{texto!r} debería lanzar ErrorCalculo")

def test_precedencia():
    "Mismo resultado que Python en precedencia, asociatividad y signos"
    ev = t.get("evaluar", "function")
    casos = ["1+2*3", "(1+2)*3", "2^3^2", "-2^2", "2^-1", "10/4", "1-2-3", "8/2/2", "2*(3+4)*5", "--3", "-(1+2)*-3", "3.5*2", "(((7)))", "2^0.5", "1/3+1/3", "2^-2^2"]
    for e in casos:
        esperado = float(eval(e.replace("^", "**")))
        obtenido = ev(e)
        assert isinstance(obtenido, float) and abs(obtenido - esperado) < 1e-12, f"{e} = {obtenido}, se esperaba {esperado}"

def test_errores():
    "Los errores del usuario se señalan siempre con ErrorCalculo"
    ev = t.get("evaluar", "function")
    E = t.get("ErrorCalculo")
    for e in ["2+", "(1", "1)", "2**3", "3 4", "", "   ", "1/0", "x+1", "f(2)", "(-8)^(1/3)", "*2", "()", "2^"]:
        try:
            ev(e)
        except E:
            pass
        except Exception as otra:
            raise AssertionError(f"{e!r} lanzó {type(otra).__name__}: usa ErrorCalculo para los errores del usuario")
        else:
            raise AssertionError(f"{e!r} debería lanzar ErrorCalculo")

def test_nombres():
    "Variables, constantes y funciones registradas"
    ev = t.get("evaluar", "function")
    assert ev("2*x+y", {"x": 3, "y": 1}) == 7.0
    C, F = t.get("CONSTANTES", dict), t.get("FUNCIONES", dict)
    C["k_prueba"] = 10.0
    F["doble_prueba"] = lambda v: 2 * v
    try:
        assert ev("doble_prueba(k_prueba + 1)") == 22.0
        assert ev("k_prueba", {"k_prueba": 1.0}) == 1.0, "Las variables tienen prioridad sobre las constantes"
    finally:
        del C["k_prueba"], F["doble_prueba"]

def test_sin_eval():
    "La calculadora no usa eval ni exec"
    assert not t.calls("eval") and not t.calls("exec")
`,
    hints: [
      "tokenizar: con un `while i < len(texto)`, si `texto[i]` es cifra o punto avanza `j` mientras lo sea y convierte `texto[i:j]` con `float` (captura su `ValueError` para lanzar `ErrorCalculo`).",
      "expresion: `valor = self.termino()` y, mientras `self.ver()` sea `+` o `-`, toma el operador y suma o resta `self.termino()`. `termino` es igual con `*`, `/` y `factor`.",
      "potencia: `base = self.atomo()`; si viene `^`, el exponente es `self.factor()` (no `self.potencia()` a secas), así `2^-1` y `2^3^2` salen bien. Si `base ** exponente` es `complex`, lanza `ErrorCalculo`.",
    ],
    errors: [
      { error: "Evaluar 2^3^2 como (2^3)^2 = 64", fix: "La potencia agrupa por la derecha: el exponente se analiza llamando de nuevo a factor, que a su vez llega a potencia." },
      { error: "Que 1/0 lance ZeroDivisionError", fix: "Comprueba el divisor y lanza ErrorCalculo: la interfaz solo sabe mostrar los errores del usuario." },
      { error: "Aceptar «3 4» como 3", fix: "Al terminar, el analizador debe haber consumido todos los tokens; si sobra alguno, es un error." },
    ],
    quiz: {
      question: "¿Por qué no basta con evaluar(texto) = eval(texto.replace('^', '**'))?",
      options: [
        { text: "Porque eval ejecuta cualquier código Python que escriba el usuario (por ejemplo, borrar archivos) y sus errores no son mensajes para el usuario" },
        { text: "Porque eval es más lento que un analizador escrito a mano" },
        { text: "Porque eval no respeta la precedencia de los operadores" },
        { text: "No hay ningún problema: eval es la forma recomendada de hacer una calculadora" },
      ],
      answer: 0,
      explanation: "eval interpreta Python completo, no aritmética: `__import__('os')…` es una expresión válida. Un analizador propio acepta solo la gramática que defines y produce errores comprensibles.",
    },
    project: SPEC,
    review: "Repasa: una función por nivel de precedencia; la recursión aparece en los paréntesis; los errores del usuario, con una excepción propia.",
    xp: 130,
    coins: 18,
  },
  {
    id: "pc-calc-2",
    world: "w2",
    zone: "Proyecto de las Montañas",
    title: "La calculadora de las Montañas · 2: raíces, exponenciales, logaritmos y senos hechos a mano",
    kind: "project",
    difficulty: 4,
    skills: ["algoritmos", "complejidad", "pruebas"],
    requires: ["pc-calc-1"],
    series: { ...SERIES, stage: 2 },
    story: "Los cartógrafos miden ángulos y pendientes: la calculadora necesita √, eˣ, ln, seno y coseno. El gremio no se fía de una caja negra: quiere ver cómo se calcula cada función y una prueba de que coincide con la biblioteca estándar.",
    objective: "Implementar funciones trascendentes con el método de Newton y series de Taylor, reduciendo el argumento para que converjan rápido, y verificar su precisión contra el módulo math.",
    before: ["Etapa 1", "Bucles while con criterio de parada", "Sumatorias (opcional: Mundo 4)"],
    intuition: [
      "**Raíz cuadrada (Newton/Herón):** si y es una aproximación de √x, la media de y y x/y es mejor. Cada paso duplica las cifras correctas; se para cuando el cambio relativo es menor que la precisión de un float.",
      "",
      "**Exponencial:** eˣ = 1 + x + x²/2! + x³/3! + … converge siempre, pero para x = 30 haría falta sumar muchos términos enormes. Truco: eˣ = (e^(x/2ᵏ))^(2ᵏ). Se divide x entre 2 hasta que |x| ≤ 0,5, se suma la serie (pocos términos) y se eleva al cuadrado k veces.",
      "",
      "**Logaritmo:** se escribe x = m·2ᵏ con 1 ≤ m < 2, así ln x = k·ln 2 + ln m, y ln m = 2·atanh((m − 1)/(m + 1)), una serie que converge rápido porque (m − 1)/(m + 1) < 1/3.",
      "",
      "**Seno:** se lleva x al intervalo [−π, π] (el seno es periódico) y se suma la serie x − x³/3! + x⁵/5! − …, calculando cada término a partir del anterior. cos x = sen(x + π/2).",
      "",
      "Cada término se obtiene del anterior multiplicando, nunca con potencias y factoriales desde cero: es más rápido y evita desbordamientos.",
    ],
    formal: "y ← (y + x/y)/2 · eˣ = Σ xⁿ/n! · ln x = k·ln 2 + 2·Σ z^(2j+1)/(2j+1), z = (m − 1)/(m + 1) · sen x = Σ (−1)ʲ x^(2j+1)/(2j+1)!",
    example: {
      code: py`x = 2.0
y = x
for paso in range(6):
    y = (y + x / y) / 2
    print(paso + 1, y)`,
      lines: [
        "Queremos √2.",
        "Primera aproximación: el propio x.",
        "Seis pasos de Newton.",
        "La media de y y x/y.",
        "1,5 → 1,41666… → 1,41421568… → 1,4142135623746… → 1,414213562373095: las cifras correctas se duplican en cada paso.",
      ],
    },
    challenge: [
      "1. `raiz(x, tol=1e-15)` con Newton; `raiz(0)` = 0 y un x negativo lanza `ErrorCalculo`.",
      "2. `exp_serie(x)` con la reducción eˣ = (e^(x/2ᵏ))^(2ᵏ) y la serie de Taylor.",
      "3. `ln(x)` con la reducción a [1, 2) y la serie de atanh (calcula `LN2` con la misma serie: ln 2 = 2·atanh(1/3)); x ≤ 0 lanza `ErrorCalculo`.",
      "4. `seno(x)` reduciendo a [−π, π] y `coseno(x)` = sen(x + π/2). Usa `PI = 3.141592653589793`.",
      "5. Registra las funciones en `FUNCIONES` con los nombres `raiz`, `exp`, `ln`, `sen` y `cos`, y las constantes `pi` y `e` (= `exp_serie(1.0)`) en `CONSTANTES`.",
      "6. No uses `math.sqrt`, `math.exp`, `math.log`, `math.sin`, `math.cos` ni `**` con exponente 0,5: las pruebas comparan tus funciones con ellas.",
    ],
    starter: py`PI = 3.141592653589793


def raiz(x, tol=1e-15):
    return 0.0


def exp_serie(x):
    return 0.0


def _atanh_serie(z):
    return 0.0


LN2 = 2 * _atanh_serie(1 / 3)


def ln(x):
    return 0.0


def seno(x):
    return 0.0


def coseno(x):
    return 0.0


FUNCIONES.update({"raiz": raiz, "exp": exp_serie, "ln": ln, "sen": seno, "cos": coseno})
CONSTANTES.update({"pi": PI, "e": exp_serie(1.0)})`,
    solution: SOL2,
    tests: py`
import math
import random

rng = random.Random(42)

def relativo(a, b):
    return abs(a - b) / max(1.0, abs(b))

def test_raiz():
    "Newton coincide con math.sqrt"
    r = t.get("raiz", "function")
    E = t.get("ErrorCalculo")
    xs = [rng.uniform(0, 1e6) for _ in range(300)] + [rng.uniform(0, 1) for _ in range(300)] + [1e-12, 2.0, 1e20, 0.25]
    peor = max(abs(r(x) - math.sqrt(x)) / math.sqrt(x) for x in xs)
    assert peor < 1e-12, f"error relativo máximo {peor:.2e}"
    assert r(0) == 0
    try:
        r(-1)
    except E:
        pass
    else:
        raise AssertionError("raiz(-1) debe lanzar ErrorCalculo")

def test_exp_ln():
    "Exponencial y logaritmo coinciden con math"
    ex, lg = t.get("exp_serie", "function"), t.get("ln", "function")
    E = t.get("ErrorCalculo")
    xs = [rng.uniform(-30, 30) for _ in range(500)] + [0.0, 1.0, -1.0]
    peor = max(abs(ex(x) - math.exp(x)) / math.exp(x) for x in xs)
    assert peor < 1e-12, f"exp: error relativo máximo {peor:.2e}"
    ys = [rng.uniform(1e-6, 1e6) for _ in range(500)] + [1.0, 2.0, 0.5, 1e-300, 1e300]
    peor = max(relativo(lg(y), math.log(y)) for y in ys)
    assert peor < 1e-12, f"ln: error máximo {peor:.2e}"
    assert abs(t.get("LN2") - math.log(2)) < 1e-15
    for malo in (0, -1):
        try:
            lg(malo)
        except E:
            pass
        else:
            raise AssertionError(f"ln({malo}) debe lanzar ErrorCalculo")

def test_seno_coseno():
    "Seno y coseno coinciden con math en [−50, 50]"
    s, c = t.get("seno", "function"), t.get("coseno", "function")
    xs = [rng.uniform(-50, 50) for _ in range(500)] + [0.0, math.pi, -math.pi / 2]
    assert max(abs(s(x) - math.sin(x)) for x in xs) < 1e-12
    assert max(abs(c(x) - math.cos(x)) for x in xs) < 1e-12

def test_en_la_calculadora():
    "Las funciones y constantes funcionan en las expresiones"
    ev = t.get("evaluar", "function")
    assert abs(ev("2*sen(pi/6) + raiz(16) + ln(e^2)") - 7) < 1e-12
    assert abs(ev("exp(ln(5))") - 5) < 1e-12 and abs(ev("cos(0)") - 1) < 1e-12
    assert abs(t.get("CONSTANTES")["e"] - math.e) < 1e-14 and t.get("CONSTANTES")["pi"] == math.pi

def test_hecho_a_mano():
    "Sin las funciones de math"
    for nombre in ("sqrt", "exp", "log", "sin", "cos"):
        assert not t.calls(nombre), f"No llames a math.{nombre}: impleméntala tú"
`,
    hints: [
      "raiz: empieza en `y = x if x >= 1 else 1.0` y repite `nuevo = (y + x / y) / 2` hasta que `abs(nuevo - y) <= tol * nuevo`.",
      "exp_serie: `while abs(x) > 0.5: x /= 2; k += 1`; suma términos con `termino *= x / n` hasta que sea despreciable frente a la suma; luego `suma *= suma` k veces.",
      "seno: `x = x % (2 * PI)` y, si queda por encima de PI, réstale 2·PI. Cada término nuevo es el anterior por `-x * x / ((n + 1) * (n + 2))`.",
    ],
    errors: [
      { error: "Sumar la serie de eˣ sin reducir x", fix: "Para x = 30 los términos crecen hasta ~10¹² antes de decrecer y se pierde precisión; con la reducción bastan unos 15 términos." },
      { error: "Calcular cada término con x**n / factorial(n)", fix: "Desborda para n grande y repite trabajo: obtén cada término multiplicando el anterior." },
      { error: "Parar la serie tras un número fijo de términos", fix: "El número necesario depende de x: para cuando el término sea despreciable frente a la suma." },
    ],
    quiz: {
      question: "Newton para √2 da 1,5; 1,4167; 1,414216; 1,41421356237… ¿Qué ocurre con el error en cada paso?",
      options: [
        { text: "Se eleva aproximadamente al cuadrado: el número de cifras correctas se duplica (convergencia cuadrática)" },
        { text: "Se divide entre 2 en cada paso, como en la bisección" },
        { text: "Disminuye de forma lineal: una cifra correcta más por paso" },
        { text: "No disminuye: Newton solo funciona con suerte" },
      ],
      answer: 0,
      explanation: "Errores: 0,086; 0,0025; 2·10⁻⁶; 1,6·10⁻¹². Cada uno es del orden del cuadrado del anterior: por eso bastan 5 o 6 pasos para la precisión completa de un float.",
    },
    lab: { lab: "matematicas", tab: "funciones", label: "Funciones y derivadas" },
    project: SPEC,
    review: "Repasa: Newton duplica cifras; reduce el argumento antes de sumar una serie; cada término a partir del anterior; verifica contra una referencia.",
    xp: 140,
    coins: 20,
  },
  {
    id: "pc-calc-3",
    world: "w2",
    zone: "Proyecto de las Montañas",
    title: "La calculadora de las Montañas · 3: sesión con variables, historial y deshacer",
    kind: "project",
    difficulty: 3,
    skills: ["poo", "errores", "estructuras"],
    requires: ["pc-calc-2"],
    series: { ...SERIES, stage: 3 },
    story: "En el campo, los cartógrafos encadenan cálculos: guardan un radio, calculan un área, la dividen… y a veces se equivocan. La calculadora debe recordar, avisar sin romperse y permitir deshacer.",
    objective: "Diseñar una clase que mantenga el estado de una sesión (variables, último resultado, historial), capture los errores del usuario y reconstruya el estado al deshacer.",
    before: ["Etapas 1 y 2", "Clases", "try / except / else"],
    intuition: [
      "Una **sesión** tiene estado: las variables definidas y lo que ya se ha calculado. Una clase lo encapsula: `ejecutar(linea)` es la única puerta de entrada.",
      "",
      "Cada línea es una expresión (`area / r`) o una asignación (`r = 2`). Si la evaluación falla con `ErrorCalculo`, el estado **no cambia** y el historial guarda el mensaje: `try` / `except` / `else` separa los dos caminos.",
      "",
      "**Deshacer** bien es más sutil de lo que parece: si deshaces `a = 10` hay que restaurar el valor anterior de `a`, y si otras variables dependían de ella… La solución robusta es **volver a ejecutar** el historial sin la línea deshecha: el estado se deriva del historial.",
      "",
      "Mostrar un número también es una decisión: 0.1 + 0.2 es 0.30000000000000004 en binario; con 12 cifras significativas se muestra 0.3, y un 2.0 se muestra como 2.",
    ],
    formal: "estado = f(historial): deshacer = reconstruir el estado ejecutando de nuevo historial − {última línea correcta}",
    example: {
      code: py`try:
    valor = 1 / 0
except ZeroDivisionError as e:
    print("error:", e)
else:
    print("valor:", valor)
print(f"{0.1 + 0.2:.12g}", f"{2/3:.12g}")`,
      lines: [
        "El bloque que puede fallar.",
        "Falla: división entre cero.",
        "Camino del error.",
        "Se informa sin detener el programa.",
        "else solo se ejecuta si no hubo excepción.",
        "Aquí no llega.",
        "Formato con 12 cifras significativas: 0.3 y 0.666666666667.",
      ],
    },
    challenge: [
      "1. `formatear(valor, cifras=12)`: enteros sin decimales (`2`, `-3`) si |valor| < 10¹⁵; si no, `f\"{valor:.{cifras}g}\"`; `inf` y `nan` con `str`.",
      "2. Clase `Calculadora` con `variables` (dict) e `historial` (lista).",
      "3. `ejecutar(linea)`: si contiene `=`, la parte izquierda es el nombre (identificador válido y que no sea `ans`, una función ni una constante). Devuelve y añade al historial `{\"entrada\", \"ok\": True, \"valor\", \"texto\"}` o `{\"entrada\", \"ok\": False, \"error\"}`. Si va bien, guarda el resultado en `ans` (y en la variable). Un error no cambia `variables`.",
      "4. `deshacer()`: quita la última línea correcta y reconstruye `variables` e `historial` ejecutando de nuevo las demás; devuelve `True`, o `False` si no hay nada que deshacer.",
      "5. `sesion`: una `Calculadora` que ha ejecutado `r = 2`, `area = pi*r^2`, `area / r`, `x = 1/0`, `2 = 3` y `ln(ans)`.",
    ],
    starter: py`import math


def formatear(valor, cifras=12):
    return str(valor)


class Calculadora:
    def __init__(self):
        self.variables = {}
        self.historial = []

    def ejecutar(self, linea):
        return {}

    def deshacer(self):
        return False


sesion = Calculadora()
for linea in ["r = 2", "area = pi*r^2", "area / r", "x = 1/0", "2 = 3", "ln(ans)"]:
    sesion.ejecutar(linea)`,
    solution: SOL3,
    tests: py`
import math

def test_formatear():
    "Números legibles"
    f = t.get("formatear", "function")
    assert [f(2.0), f(-3.0), f(0.1 + 0.2), f(1 / 3), f(1e20), f(float("inf"))] == ["2", "-3", "0.3", "0.333333333333", "1e+20", "inf"]
    assert f(2 / 3, cifras=3) == "0.667"

def test_sesion():
    "Asignaciones, ans y errores que no cambian el estado"
    C = t.get("Calculadora")
    c = C()
    r = c.ejecutar("r = 2")
    assert r == {"entrada": "r = 2", "ok": True, "valor": 2.0, "texto": "2"}
    assert abs(c.ejecutar("pi*r^2")["valor"] - math.pi * 4) < 1e-12
    assert abs(c.variables["ans"] - math.pi * 4) < 1e-12
    antes = dict(c.variables)
    for malo in ("y = 1/0", "2 = 3", "ans = 1", "sen = 2", "pi = 3", "z = q + 1"):
        res = c.ejecutar(malo)
        assert res["ok"] is False and res["error"] and set(res) == {"entrada", "ok", "error"}, malo
    assert c.variables == antes, "Un error no debe cambiar las variables"
    assert len(c.historial) == 8 and c.historial[0] == r

def test_deshacer():
    "Deshacer reconstruye el estado"
    c = t.get("Calculadora")()
    for linea in ("a = 1", "b = a + 1", "1/0", "a = 10"):
        c.ejecutar(linea)
    assert c.deshacer() is True
    assert c.variables == {"a": 1.0, "b": 2.0, "ans": 2.0} and len(c.historial) == 3
    assert c.deshacer() and c.deshacer() and c.variables == {}
    assert c.deshacer() is False

def test_sesion_de_ejemplo():
    "La sesión del gremio"
    s = t.get("sesion")
    assert [h["ok"] for h in s.historial] == [True, True, True, False, False, True]
    assert abs(s.variables["area"] - 4 * math.pi) < 1e-12 and "x" not in s.variables
    assert abs(s.variables["ans"] - math.log(2 * math.pi)) < 1e-12
`,
    hints: [
      "ejecutar: divide con `linea.split(\"=\", 1)` y `strip()`; valida con `nombre.isidentifier()` y con `nombre in FUNCIONES or nombre in CONSTANTES or nombre == \"ans\"`.",
      "Usa `try:` para evaluar, `except ErrorCalculo as e:` para el error y `else:` para actualizar `ans` y la variable: así un error nunca toca el estado.",
      "deshacer: busca desde el final el último registro con `ok`, guarda las entradas de los demás, vacía `variables` e `historial` y vuelve a llamar a `ejecutar` con cada entrada.",
    ],
    errors: [
      { error: "Guardar la variable antes de saber si la expresión es válida", fix: "Actualiza el estado solo en el bloque else, cuando la evaluación ya ha terminado bien." },
      { error: "Deshacer borrando solo la variable asignada", fix: "Pierdes su valor anterior y el de ans. Reconstruir el estado desde el historial es más simple y siempre correcto." },
    ],
    quiz: {
      question: "Tras «a = 1», «b = a + 1» y «a = 10», deshaces la última línea. ¿Cuánto vale b?",
      options: [
        { text: "2: b se calculó con a = 1, y deshacer solo quita «a = 10»" },
        { text: "11: b se recalcula siempre con el valor actual de a" },
        { text: "b deja de existir porque dependía de a" },
        { text: "Depende del orden en que Python guarde el diccionario" },
      ],
      answer: 0,
      explanation: "Las variables guardan valores, no fórmulas: b = 2 desde que se calculó. Al reconstruir sin «a = 10», a vuelve a 1 y b sigue siendo 2.",
    },
    project: SPEC,
    review: "Repasa: el estado vive en un objeto; try/except/else para no corromperlo; el estado como función del historial.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pc-calc-4",
    world: "w2",
    zone: "Proyecto de las Montañas",
    title: "La calculadora de las Montañas · 4: derivadas, integrales y raíces de lo que escribe el usuario",
    kind: "project",
    difficulty: 4,
    skills: ["derivadas", "integrales", "algoritmos", "pruebas"],
    requires: ["pc-calc-3"],
    series: { ...SERIES, stage: 4 },
    story: "Última petición del gremio: «¿Dónde cruza el río la cota cero? ¿Cuánta tierra hay bajo esta curva? ¿Qué pendiente tiene aquí?». El cartógrafo escribe la función como texto; la calculadora responde con números y con su margen de error.",
    objective: "Convertir una expresión en una función de Python y aplicarle diferencias centrales, la regla de Simpson, la bisección y el método de Newton, midiendo el error y el orden de convergencia.",
    before: ["Etapas 1 a 3", "Derivadas e integrales (Mundo 4)", "Clausuras: funciones que devuelven funciones"],
    intuition: [
      "`funcion_de(\"x^2 - 2\")` devuelve una **función** f(x) que evalúa el texto con x como variable: una clausura que recuerda la expresión.",
      "",
      "**Derivada:** (f(x + h) − f(x − h)) / 2h tiene un error proporcional a h² (diferencias centrales). Con h = 10⁻⁵ el error para sen en 0 ronda 10⁻¹¹.",
      "",
      "**Integral (Simpson):** aproxima la curva por parábolas cada dos subintervalos. Su error es proporcional a h⁴: duplicar n divide el error entre 16, es decir, **orden 4**, que puedes medir como log₂(error(n)/error(2n)). Con n = 100, ∫₀^π sen x dx = 2 sale con un error de 10⁻⁸.",
      "",
      "**Raíces:** la **bisección** parte un intervalo con cambio de signo por la mitad; es lenta pero segura: con [0, 2] y tolerancia 10⁻¹² necesita exactamente ⌈log₂(2/10⁻¹²)⌉ = 41 pasos. **Newton** sigue la recta tangente; converge cuadráticamente (√2 en 6 pasos desde 1), pero puede fallar si la derivada se anula o si no hay raíz.",
    ],
    formal: "f'(x) ≈ (f(x + h) − f(x − h))/2h, error O(h²) · Simpson: (h/3)[f₀ + 4f₁ + 2f₂ + … + 4fₙ₋₁ + fₙ], error O(h⁴) · bisección: ⌈log₂((b − a)/tol)⌉ pasos · Newton: xₖ₊₁ = xₖ − f(xₖ)/f'(xₖ)",
    example: {
      code: py`def cuadrado_menos_dos(x):
    return x * x - 2

a, b = 1.0, 2.0
for paso in range(5):
    m = (a + b) / 2
    if cuadrado_menos_dos(a) * cuadrado_menos_dos(m) <= 0:
        b = m
    else:
        a = m
    print(paso + 1, a, b)`,
      lines: [
        "La función cuya raíz buscamos (√2).",
        "Devuelve x² − 2.",
        "f(1) < 0 < f(2): hay una raíz en medio.",
        "Cinco pasos de bisección.",
        "Punto medio.",
        "Si el signo cambia entre a y m, la raíz está en [a, m]…",
        "…y b pasa a ser m.",
        "Si no, está en [m, b]…",
        "…y a pasa a ser m.",
        "El intervalo se reduce a la mitad en cada paso: tras 5 pasos mide 1/32.",
      ],
    },
    challenge: [
      "1. `funcion_de(expresion, variable=\"x\")`: comprueba la expresión con `tokenizar` (los caracteres no válidos fallan ya) y devuelve `f(valor)` que la evalúa con `{variable: valor}`.",
      "2. `derivada(f, x, h=1e-5)` por diferencias centrales.",
      "3. `simpson(f, a, b, n=100)`: regla de Simpson compuesta; un n impar lanza `ValueError`.",
      "4. `biseccion(f, a, b, tol=1e-12)`: devuelve `(raiz, iteraciones)`; si f(a) y f(b) tienen el mismo signo, `ValueError`. Repite mientras `b - a > tol`.",
      "5. `newton(f, x0, tol=1e-12, max_iter=50)`: devuelve `(raiz, iteraciones)` usando tu `derivada`; para cuando el paso sea menor que `tol`. Derivada nula o falta de convergencia: `ValueError`.",
      "6. `orden_simpson(f, a, b, exacto, n=8)`: log₂ del cociente entre los errores con n y 2n.",
      "7. `informe` con `derivada_seno_en_0`, `integral_seno` (de 0 a PI), `orden_simpson` (seno en [0, PI], exacto 2), `raiz2_biseccion` e `iteraciones_biseccion` (x^2 − 2 en [0, 2]), `raiz2_newton` e `iteraciones_newton` (desde 1) y `dottie` (raíz de cos(x) − x desde 1).",
    ],
    starter: py`def funcion_de(expresion, variable="x"):
    def f(valor):
        return 0.0
    return f


def derivada(f, x, h=1e-5):
    return 0.0


def simpson(f, a, b, n=100):
    return 0.0


def biseccion(f, a, b, tol=1e-12):
    return 0.0, 0


def newton(f, x0, tol=1e-12, max_iter=50):
    return x0, 0


def orden_simpson(f, a, b, exacto, n=8):
    return 0.0


informe = {}`,
    solution: SOL4,
    tests: py`
import math

def test_funcion_de():
    "Del texto a una función"
    fd = t.get("funcion_de", "function")
    E = t.get("ErrorCalculo")
    assert fd("x^2 + 1")(3) == 10.0 and fd("t*2", "t")(4) == 8.0
    assert abs(fd("sen(x)")(1.0) - math.sin(1.0)) < 1e-12
    try:
        fd("2 $ x")
    except E:
        pass
    else:
        raise AssertionError("funcion_de debe rechazar los caracteres no válidos al crear la función")

def test_derivada():
    "Diferencias centrales"
    d, fd = t.get("derivada", "function"), t.get("funcion_de", "function")
    assert abs(d(lambda x: x ** 3, 2.0) - 12) < 1e-6
    assert abs(d(fd("sen(x)"), 1.0) - math.cos(1.0)) < 1e-9
    # Para x³ el error de las diferencias centrales es exactamente h²: 3,0001 con h = 0,01.
    assert abs(d(lambda x: x ** 3, 1.0, h=1e-2) - 3.0001) < 1e-9

def test_simpson():
    "Simpson: exacto en cúbicas, orden 4"
    s = t.get("simpson", "function")
    assert abs(s(lambda x: x ** 3 - x, 0, 1, n=2) - (-0.25)) < 1e-12, "Simpson integra exactamente los polinomios de grado 3"
    assert abs(s(lambda x: math.exp(-x * x), 0, 1) - 0.7468241328124271) < 1e-9
    try:
        s(math.sin, 0, 1, n=3)
    except ValueError:
        pass
    else:
        raise AssertionError("Un n impar debe lanzar ValueError")
    o = t.get("orden_simpson", "function")(math.exp, 0, 1, math.e - 1)
    assert 3.9 < o < 4.1, o

def test_raices():
    "Bisección y Newton"
    b, nw = t.get("biseccion", "function"), t.get("newton", "function")
    f = lambda x: x * x - 2
    r, it = b(f, 0, 2)
    assert abs(r - math.sqrt(2)) < 1e-11 and it == math.ceil(math.log2(2 / 1e-12)), (r, it)
    r, it = b(f, 1, 2, tol=1e-6)
    assert it == math.ceil(math.log2(1 / 1e-6))
    for malo in (lambda: b(f, 2, 3), lambda: nw(lambda x: x * x + 1, 0.0), lambda: nw(lambda x: x * x + 1, 1.0)):
        try:
            malo()
        except ValueError:
            pass
        else:
            raise AssertionError("Sin cambio de signo, con derivada nula o sin raíz real: ValueError")
    r, it = nw(f, 1.0)
    assert abs(r - math.sqrt(2)) < 1e-12 and it <= 8

def test_informe():
    "El informe del gremio"
    inf = t.get("informe", dict)
    assert abs(inf["derivada_seno_en_0"] - 1) < 1e-9
    assert abs(inf["integral_seno"] - 2) < 1e-7
    assert 3.9 < inf["orden_simpson"] < 4.1
    assert abs(inf["raiz2_biseccion"] - math.sqrt(2)) < 1e-11 and inf["iteraciones_biseccion"] == 41
    assert abs(inf["raiz2_newton"] - math.sqrt(2)) < 1e-12 and inf["iteraciones_newton"] <= 8
    x = inf["dottie"]
    assert abs(math.cos(x) - x) < 1e-12
`,
    hints: [
      "funcion_de: llama a `tokenizar(expresion)` al principio y define dentro `def f(valor): return evaluar(expresion, {variable: valor})`.",
      "simpson: `h = (b - a) / n`; suma f(a) + f(b) y, para i de 1 a n − 1, `(4 if i % 2 else 2) * f(a + i * h)`; multiplica por h / 3.",
      "newton: en cada paso `paso = f(x) / derivada(f, x)`, `x -= paso`; si `abs(paso) < tol` devuelve `(x, i)`. Si se agotan las iteraciones, `raise ValueError(...)`.",
    ],
    errors: [
      { error: "Usar una h muy pequeña (10⁻¹⁵) para «más precisión»", fix: "f(x + h) − f(x − h) pierde casi todas las cifras por cancelación: el error de redondeo crece como ε/h. h ≈ 10⁻⁵ equilibra truncamiento y redondeo." },
      { error: "Aplicar Simpson con n impar", fix: "La regla agrupa los subintervalos de dos en dos: n debe ser par." },
      { error: "Confiar en Newton sin límite de iteraciones", fix: "Si no hay raíz (x² + 1) o la tangente es horizontal, no converge: limita las iteraciones y avisa." },
    ],
    quiz: {
      question: "Con Simpson, ∫₀^π sen x dx da un error de 2,7·10⁻⁴ con n = 8. ¿Qué error esperas con n = 16?",
      options: [
        { text: "Unas 16 veces menor (≈ 1,7·10⁻⁵), porque el error es proporcional a h⁴" },
        { text: "La mitad, porque hay el doble de puntos" },
        { text: "Unas 4 veces menor, como la regla del trapecio" },
        { text: "El mismo: el error de Simpson no depende de n" },
      ],
      answer: 0,
      explanation: "Error ∝ h⁴: al dividir h entre 2 el error se divide entre 2⁴ = 16. La prueba orden_simpson lo mide: log₂(error(n)/error(2n)) ≈ 4.",
    },
    lab: { lab: "matematicas", tab: "integrales", label: "Integración numérica" },
    project: SPEC,
    review: "Repasa: diferencias centrales O(h²); Simpson O(h⁴) y n par; bisección segura, Newton rápido pero con condiciones.",
    xp: 160,
    coins: 24,
  },
];
