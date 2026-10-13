import { py, type Mission } from "../types";

// Mundo 1 · El Bosque de los Algoritmos — parte A: primeros pasos, tipos, operadores, decisiones y bucles.

export const W1_A: Mission[] = [
  {
    id: "py-hola",
    world: "w1",
    zone: "Primeros pasos",
    title: "El primer hechizo: print()",
    kind: "lesson",
    difficulty: 1,
    skills: ["salida"],
    requires: [],
    story: [
      "Llegas al borde del Bosque de los Algoritmos. Un cartel de madera dice: «Solo quien habla con la máquina puede pasar».",
      "La máquina entiende Python. Tu primer hechizo es hacer que la pantalla diga algo.",
    ],
    objective: "Ejecutar tu primer programa y mostrar texto con `print()`.",
    before: ["Ninguno. Esta es la primera misión."],
    intuition: [
      "Python es un lenguaje de programación: una forma precisa de dar instrucciones a un ordenador. Se usa en ciencia de datos, estadística, IA, automatización y desarrollo web porque se lee casi como inglés.",
      "",
      "Un **programa** es una lista de instrucciones que Python ejecuta **de arriba abajo**, una línea cada vez.",
      "",
      "`print()` muestra en la consola lo que pongas entre paréntesis. El texto va entre comillas: a eso se le llama **cadena** (*string*).",
    ],
    formal: "`print(valor1, valor2, ..., sep=' ', end='\\n')` escribe los valores separados por `sep` y termina con `end` (por defecto, un salto de línea).",
    example: {
      code: py`print("Bienvenida al bosque")
print("Nivel", 1)
print("A", "B", "C", sep="-")`,
      lines: [
        "Muestra el texto entre comillas y salta de línea.",
        "Muestra dos valores separados por un espacio: un texto y un número.",
        "Con `sep=\"-\"` los valores se separan con un guion: `A-B-C`.",
      ],
    },
    challenge: [
      "Escribe un programa que muestre exactamente estas dos líneas:",
      "```",
      "Hola, Python!",
      "Mi aventura empieza hoy",
      "```",
    ],
    starter: py`# Escribe tu primer programa debajo de esta línea
`,
    solution: py`print("Hola, Python!")
print("Mi aventura empieza hoy")`,
    tests: py`
def test_saludo():
    "La primera línea es «Hola, Python!»"
    assert len(t.lines) >= 1, "Tu programa no mostró nada. Usa print()."
    assert t.lines[0] == "Hola, Python!", f"La primera línea es {t.lines[0]!r}; debería ser 'Hola, Python!'"

def test_segunda_linea():
    "La segunda línea es «Mi aventura empieza hoy»"
    assert len(t.lines) >= 2, "Falta la segunda línea."
    assert t.lines[1] == "Mi aventura empieza hoy", f"La segunda línea es {t.lines[1]!r}"

def test_usa_print():
    "Usa la función print()"
    assert t.calls("print")
`,
    hints: [
      "Necesitas dos llamadas a `print()`, una por línea.",
      "El texto va entre comillas dobles o simples: `print(\"texto\")`.",
      "Copia el texto con cuidado: mayúsculas, coma y signo de exclamación cuentan.",
    ],
    errors: [
      { error: "NameError: name 'Hola' is not defined", fix: "Olvidaste las comillas. Sin comillas, Python cree que Hola es una variable." },
      { error: "SyntaxError: unterminated string literal", fix: "Abriste comillas y no las cerraste en la misma línea." },
    ],
    quiz: {
      question: "¿En qué orden ejecuta Python las líneas de un programa sencillo?",
      options: [
        { text: "De arriba abajo, una tras otra" },
        { text: "Todas a la vez" },
        { text: "De abajo arriba" },
        { text: "En orden alfabético" },
      ],
      answer: 0,
      explanation: "Python lee y ejecuta las instrucciones en secuencia, de la primera a la última, salvo que una estructura de control (if, for, while, funciones) cambie el flujo.",
    },
    advanced: {
      title: "Cartel con separadores",
      prompt: "Con **una sola** llamada a `print`, muestra `2026|Python|Quest` usando el parámetro `sep`.",
      starter: py`print(2026, "Python", "Quest")`,
      solution: py`print(2026, "Python", "Quest", sep="|")`,
      tests: py`
def test_salida():
    "Muestra 2026|Python|Quest"
    assert t.lines == ["2026|Python|Quest"], f"Salida: {t.lines}"

def test_una_llamada():
    "Usa una sola llamada a print"
    import ast
    n = sum(1 for x in ast.walk(t.tree()) if isinstance(x, ast.Call) and getattr(x.func, "id", "") == "print")
    assert n == 1, f"Usaste {n} llamadas a print"
`,
    },
    review: "Repasa cómo `print` separa valores (`sep`) y cómo termina cada línea (`end`).",
    xp: 30,
    coins: 5,
  },
  {
    id: "py-variables",
    world: "w1",
    zone: "Primeros pasos",
    title: "Cofres con nombre: variables",
    kind: "lesson",
    difficulty: 1,
    skills: ["variables"],
    requires: ["py-hola"],
    story: "En el claro del bosque hay cofres con etiquetas. Cada etiqueta guarda un valor que puedes consultar o cambiar más tarde.",
    objective: "Crear variables, reasignarlas y usarlas en cálculos.",
    before: ["Usar print()"],
    intuition: [
      "Una **variable** es un nombre que apunta a un valor. Se crea con `=`, que en Python significa **asignar**, no «es igual a».",
      "",
      "```python",
      "monedas = 10",
      "monedas = monedas + 5   # ahora vale 15",
      "```",
      "",
      "La segunda línea se lee de derecha a izquierda: calcula `monedas + 5` con el valor actual y guarda el resultado en `monedas`.",
      "",
      "Reglas de nombres: letras, números y `_`, sin empezar por número ni usar espacios. Por convención se escriben en minúsculas con guiones bajos: `vida_maxima`.",
    ],
    example: {
      code: py`heroe = "Ada"
vidas = 3
vidas = vidas - 1
print(heroe, "tiene", vidas, "vidas")`,
      lines: [
        "Guarda el texto \"Ada\" en la variable `heroe`.",
        "Guarda el número 3 en `vidas`.",
        "Calcula `vidas - 1` (2) y lo vuelve a guardar en `vidas`.",
        "Muestra: Ada tiene 2 vidas.",
      ],
    },
    challenge: [
      "Crea la variable `oro` con valor `120` y la variable `precio_espada` con valor `45`.",
      "Compra dos espadas: actualiza `oro` restando el precio de dos espadas.",
      "Finalmente muestra el oro restante con `print(oro)`.",
    ],
    starter: py`oro = 0
precio_espada = 0
# compra dos espadas
print(oro)`,
    solution: py`oro = 120
precio_espada = 45
oro = oro - 2 * precio_espada
print(oro)`,
    tests: py`
def test_precio():
    "precio_espada vale 45"
    assert t.get("precio_espada") == 45

def test_oro_final():
    "Después de comprar dos espadas quedan 30 de oro"
    assert t.get("oro") == 30, f"oro vale {t.get('oro')}"

def test_muestra():
    "Se muestra el oro restante"
    assert t.lines and t.lines[-1] == "30"

def test_calcula_con_variables():
    "El cálculo usa la variable precio_espada, no el número escrito a mano"
    assert "precio_espada" in t.code.split("precio_espada = 45", 1)[-1], "Calcula usando precio_espada"
`,
    hints: [
      "Primero asigna los valores iniciales: `oro = 120`.",
      "Dos espadas cuestan `2 * precio_espada`.",
      "Reasigna: `oro = oro - 2 * precio_espada`.",
    ],
    errors: [
      { error: "Usar == en lugar de =", fix: "`==` compara; `=` asigna. Para guardar un valor usa un solo signo igual." },
      { error: "NameError al usar una variable", fix: "Las variables deben existir antes de usarse: asígnalas en una línea anterior." },
    ],
    quiz: {
      question: "Tras ejecutar `x = 5` y luego `x = x * 2`, ¿cuánto vale x?",
      options: [
        { text: "10" },
        { text: "5, porque x no puede cambiar", misconception: "asignacion-igualdad" },
        { text: "Es un error: x no puede ser igual a x * 2", misconception: "asignacion-igualdad" },
        { text: "25" },
      ],
      answer: 0,
      explanation: "`=` asigna: Python calcula `x * 2` con el valor actual (5) y guarda 10 en x. No es una ecuación matemática.",
    },
    advanced: {
      title: "Intercambio de cofres",
      prompt: "Intercambia los valores de `a` y `b` en una sola línea, sin usar una tercera variable.",
      starter: py`a = "espada"
b = "escudo"
# intercambia aquí
print(a, b)`,
      solution: py`a = "espada"
b = "escudo"
a, b = b, a
print(a, b)`,
      tests: py`
def test_intercambio():
    "a vale 'escudo' y b vale 'espada'"
    assert t.get("a") == "escudo" and t.get("b") == "espada"

def test_sin_temporal():
    "Usa asignación múltiple (a, b = b, a)"
    assert t.uses("Tuple"), "Usa a, b = b, a"
`,
    },
    review: "Repasa la diferencia entre asignar (`=`) y comparar (`==`).",
    xp: 30,
    coins: 5,
  },
  {
    id: "py-tipos",
    world: "w1",
    zone: "Primeros pasos",
    title: "Las cuatro gemas: tipos de datos",
    kind: "lesson",
    difficulty: 1,
    skills: ["tipos"],
    requires: ["py-variables"],
    story: "El guardián del puente solo deja pasar a quien distingue sus cuatro gemas: el entero, el decimal, el texto y la verdad.",
    objective: "Reconocer `int`, `float`, `str` y `bool`, y consultar el tipo con `type()`.",
    before: ["Variables"],
    intuition: [
      "Cada valor tiene un **tipo** que determina qué puedes hacer con él:",
      "",
      "- `int`: enteros como `7` o `-3`.",
      "- `float`: números con decimales como `3.14`. Ojo: se escriben con **punto**.",
      "- `str`: texto entre comillas, como `\"dragón\"`. `\"7\"` es texto, no número.",
      "- `bool`: verdadero o falso, `True` o `False`.",
      "",
      "`type(valor)` te dice el tipo. Saberlo evita errores como sumar texto con números.",
    ],
    example: {
      code: py`edad = 12
altura = 1.52
nombre = "Lin"
es_maga = True
print(type(edad), type(altura), type(nombre), type(es_maga))`,
      lines: ["Un entero (int).", "Un decimal (float).", "Un texto (str).", "Un booleano (bool).", "Muestra los cuatro tipos."],
    },
    challenge: [
      "Crea cuatro variables con estos tipos exactos:",
      "- `nivel`: un `int` con valor 3",
      "- `energia`: un `float` con valor 87.5",
      "- `clase`: un `str` con valor \"exploradora\"",
      "- `tiene_mapa`: un `bool` verdadero",
      "",
      "Después muestra `type(energia)`.",
    ],
    starter: py`nivel = "3"
energia = 87
clase = exploradora
tiene_mapa = "True"
`,
    solution: py`nivel = 3
energia = 87.5
clase = "exploradora"
tiene_mapa = True
print(type(energia))`,
    tests: py`
def test_nivel():
    "nivel es el entero 3"
    v = t.get("nivel")
    assert type(v) is int and v == 3, f"nivel es {v!r} ({type(v).__name__})"

def test_energia():
    "energia es el float 87.5"
    v = t.get("energia")
    assert type(v) is float and v == 87.5, f"energia es {v!r} ({type(v).__name__})"

def test_clase():
    "clase es el texto 'exploradora'"
    assert t.get("clase") == "exploradora"

def test_mapa():
    "tiene_mapa es el booleano True (sin comillas)"
    v = t.get("tiene_mapa")
    assert v is True, f"tiene_mapa es {v!r} ({type(v).__name__}); escribe True sin comillas"

def test_muestra_tipo():
    "Se muestra el tipo de energia"
    assert "<class 'float'>" in t.out
`,
    hints: [
      "Los números van sin comillas; el texto, con comillas.",
      "`\"True\"` con comillas es texto. El booleano es `True` sin comillas y con mayúscula inicial.",
      "Para mostrar el tipo: `print(type(energia))`.",
    ],
    errors: [
      { error: "Escribir 87,5 en lugar de 87.5", fix: "En Python los decimales usan punto. `87,5` crea una tupla de dos números." },
      { error: "Escribir true en minúsculas", fix: "Los booleanos son `True` y `False`, con mayúscula inicial." },
    ],
    quiz: {
      question: "¿Qué tipo tiene el valor \"42\"?",
      options: [
        { text: "str, porque está entre comillas" },
        { text: "int, porque es un número", misconception: "tipos-texto-numero" },
        { text: "float" },
        { text: "bool" },
      ],
      answer: 0,
      explanation: "Las comillas convierten cualquier cosa en texto. \"42\" + 1 da error; int(\"42\") + 1 da 43.",
    },
    advanced: {
      title: "Detector de tipos",
      prompt: "Dada la lista `cosas`, crea `nombres_tipos`: una lista con el nombre del tipo de cada elemento (por ejemplo `'int'`). Pista: `type(x).__name__`.",
      starter: py`cosas = [1, 2.5, "a", True, None]
nombres_tipos = []`,
      solution: py`cosas = [1, 2.5, "a", True, None]
nombres_tipos = [type(x).__name__ for x in cosas]`,
      tests: py`
def test_tipos():
    "Lista de nombres de tipos correcta"
    assert t.get("nombres_tipos") == ["int", "float", "str", "bool", "NoneType"]
`,
    },
    review: "Repasa cuándo un valor es texto aunque parezca número.",
    xp: 30,
    coins: 5,
  },
  {
    id: "py-conversion",
    world: "w1",
    zone: "Primeros pasos",
    title: "Alquimia de tipos: conversión",
    kind: "lesson",
    difficulty: 1,
    skills: ["tipos", "conversion"],
    requires: ["py-tipos"],
    story: "El alquimista del bosque transforma gemas: convierte texto en números y números en texto. Pero no todo se puede transformar.",
    objective: "Convertir entre tipos con `int()`, `float()`, `str()` y `bool()`, y entender cuándo falla una conversión.",
    before: ["Tipos de datos"],
    intuition: [
      "Los datos suelen llegar como texto (de un formulario, de un archivo CSV). Para calcular con ellos hay que **convertirlos**:",
      "",
      "- `int(\"12\")` → `12`",
      "- `float(\"3.5\")` → `3.5`",
      "- `str(99)` → `\"99\"`",
      "- `int(3.9)` → `3` (trunca, no redondea)",
      "",
      "Si el texto no representa un número, falla: `int(\"doce\")` lanza `ValueError`.",
    ],
    example: {
      code: py`texto = "25"
numero = int(texto)
print(numero + 5)
print("Tengo " + str(numero) + " monedas")
print(int(7.99), round(7.99))`,
      lines: [
        "Un número escrito como texto.",
        "Lo convertimos a entero.",
        "Ahora sí se puede sumar: 30.",
        "Para unir texto con `+` convertimos el número a texto.",
        "`int` trunca (7) y `round` redondea (8).",
      ],
    },
    challenge: [
      "Llegan estos datos como texto desde un formulario: `peso = \"68.5\"`, `edad = \"34\"`.",
      "Crea `peso_num` (float) y `edad_num` (int) convirtiéndolos, y calcula `total = peso_num + edad_num`.",
      "Por último crea `mensaje` con el texto `\"Total: 102.5\"` construido a partir de `total`.",
    ],
    starter: py`peso = "68.5"
edad = "34"
total = peso + edad
mensaje = "Total: " + total`,
    solution: py`peso = "68.5"
edad = "34"
peso_num = float(peso)
edad_num = int(edad)
total = peso_num + edad_num
mensaje = "Total: " + str(total)
print(mensaje)`,
    tests: py`
def test_peso():
    "peso_num es el float 68.5"
    v = t.get("peso_num")
    assert type(v) is float and v == 68.5

def test_edad():
    "edad_num es el int 34"
    v = t.get("edad_num")
    assert type(v) is int and v == 34

def test_total():
    "total vale 102.5"
    assert approx(t.get("total"), 102.5)

def test_mensaje():
    "mensaje es 'Total: 102.5'"
    assert t.get("mensaje") == "Total: 102.5"

def test_no_escrito_a_mano():
    "Las conversiones se hacen con float() e int()"
    assert t.calls("float") and t.calls("int")
`,
    hints: [
      "`float(\"68.5\")` convierte texto decimal a número.",
      "Con `+`, texto + texto concatena: `\"68.5\" + \"34\"` da `\"68.534\"`.",
      "Para el mensaje: `\"Total: \" + str(total)` o un f-string `f\"Total: {total}\"`.",
    ],
    errors: [
      { error: "ValueError: invalid literal for int() with base 10: '68.5'", fix: "int() no acepta texto con decimales. Usa float() o int(float(texto))." },
      { error: "TypeError: can only concatenate str (not \"float\") to str", fix: "Convierte el número a texto con str() antes de unirlo con +." },
    ],
    quiz: {
      question: "¿Qué resultado da `\"3\" + \"4\"` en Python?",
      options: [
        { text: "\"34\"" },
        { text: "7", misconception: "tipos-texto-numero" },
        { text: "Un error" },
        { text: "\"7\"", misconception: "tipos-texto-numero" },
      ],
      answer: 0,
      explanation: "Con dos textos, `+` concatena. Para sumar, convierte primero: int(\"3\") + int(\"4\") = 7.",
    },
    advanced: {
      title: "Conversión segura",
      prompt: "Escribe `a_numero(texto)` que devuelva el float del texto, o `None` si no es convertible. Debe aceptar coma decimal (\"2,5\" → 2.5).",
      starter: py`def a_numero(texto):
    return float(texto)`,
      solution: py`def a_numero(texto):
    try:
        return float(texto.replace(",", "."))
    except ValueError:
        return None`,
      tests: py`
def test_validos():
    "Convierte '3', '2.5' y '2,5'"
    f = t.get("a_numero", "function")
    assert f("3") == 3.0 and f("2.5") == 2.5 and f("2,5") == 2.5

def test_invalido():
    "Devuelve None para 'hola'"
    assert t.get("a_numero")("hola") is None
`,
    },
    review: "Repasa por qué `int()` trunca y por qué los datos de archivos suelen llegar como texto.",
    xp: 35,
    coins: 5,
  },
  {
    id: "py-aritmetica",
    world: "w1",
    zone: "Primeros pasos",
    title: "La forja de los números: operadores",
    kind: "lesson",
    difficulty: 1,
    skills: ["operadores"],
    requires: ["py-conversion"],
    story: "En la forja, el herrero reparte lingotes entre aprendices. Necesita saber cuántos recibe cada uno y cuántos sobran.",
    objective: "Usar `+ - * / // % **` y entender la precedencia de operadores.",
    before: ["Variables", "Tipos numéricos"],
    intuition: [
      "Además de los operadores habituales, Python tiene tres muy útiles:",
      "",
      "- `//` división entera: `17 // 5` → `3`",
      "- `%` resto (módulo): `17 % 5` → `2`",
      "- `**` potencia: `2 ** 10` → `1024`",
      "",
      "`/` siempre devuelve un `float`: `10 / 2` → `5.0`.",
      "",
      "La precedencia es la de las matemáticas: primero `**`, luego `* / // %`, y al final `+ -`. Usa paréntesis para dejar clara la intención.",
    ],
    formal: "Para enteros a y b > 0: a = b·(a // b) + (a % b), con 0 ≤ a % b < b.",
    example: {
      code: py`lingotes = 17
aprendices = 5
print(lingotes // aprendices)
print(lingotes % aprendices)
print(2 + 3 * 4, (2 + 3) * 4)`,
      lines: ["Total de lingotes.", "Número de aprendices.", "Cada aprendiz recibe 3.", "Sobran 2.", "La multiplicación va primero: 14 frente a 20."],
    },
    challenge: [
      "Una misión dura `segundos = 7384` segundos.",
      "Calcula `horas`, `minutos` y `segs` (lo que resta) usando `//` y `%`.",
      "Debe cumplirse que `horas*3600 + minutos*60 + segs == segundos`.",
    ],
    starter: py`segundos = 7384
horas = segundos / 3600
minutos = 0
segs = 0`,
    solution: py`segundos = 7384
horas = segundos // 3600
minutos = (segundos % 3600) // 60
segs = segundos % 60
print(horas, minutos, segs)`,
    tests: py`
def test_valores():
    "7384 s = 2 h 3 min 4 s"
    assert (t.get("horas"), t.get("minutos"), t.get("segs")) == (2, 3, 4)

def test_enteros():
    "Las tres variables son enteras"
    for n in ("horas", "minutos", "segs"):
        assert type(t.get(n)) is int, f"{n} es {type(t.get(n)).__name__}; usa // en lugar de /"

def test_general():
    "El cálculo funciona con otros valores (no está escrito a mano)"
    out = t.rerun()
    src = t.code.replace("segundos = 7384", "segundos = 100000")
    ns = {}
    exec(src, ns)
    assert (ns["horas"], ns["minutos"], ns["segs"]) == (27, 46, 40)
`,
    hints: [
      "Las horas completas: `segundos // 3600`.",
      "Los segundos que sobran tras quitar las horas: `segundos % 3600`. De ahí salen los minutos con `// 60`.",
      "Los segundos finales: `segundos % 60`.",
    ],
    errors: [
      { error: "Obtener 2.0511 horas", fix: "`/` da decimales. Para horas completas usa `//`." },
      { error: "Olvidar paréntesis: segundos % 3600 // 60", fix: "`%` y `//` tienen la misma precedencia y se evalúan de izquierda a derecha; aquí funciona, pero los paréntesis aclaran la intención." },
    ],
    quiz: {
      question: "¿Cuánto vale `2 ** 3 ** 2`?",
      options: [{ text: "512" }, { text: "64" }, { text: "36" }, { text: "12" }],
      answer: 0,
      explanation: "La potencia se evalúa de derecha a izquierda: 3 ** 2 = 9 y luego 2 ** 9 = 512.",
    },
    advanced: {
      title: "¿Par o impar?",
      prompt: "Crea `pares`: la lista de números del 1 al 30 divisibles entre 3 **y** pares, usando `%`.",
      starter: py`pares = []`,
      solution: py`pares = [n for n in range(1, 31) if n % 2 == 0 and n % 3 == 0]`,
      tests: py`
def test_lista():
    "Múltiplos de 6 hasta 30"
    assert t.get("pares") == [6, 12, 18, 24, 30]
`,
    },
    review: "Repasa la relación entre `//` y `%` y la precedencia de operadores.",
    xp: 35,
    coins: 5,
  },
  {
    id: "py-strings",
    world: "w1",
    zone: "Primeros pasos",
    title: "Runas de texto: cadenas y f-strings",
    kind: "lesson",
    difficulty: 1,
    skills: ["cadenas"],
    requires: ["py-aritmetica"],
    story: "Las runas del árbol antiguo están escritas en desorden: mayúsculas mezcladas y espacios sobrantes. Tu tarea es limpiarlas.",
    objective: "Usar métodos de cadena (`strip`, `lower`, `upper`, `replace`, `split`) y formatear con f-strings.",
    before: ["Variables", "Tipos"],
    intuition: [
      "Las cadenas tienen **métodos**: funciones que se llaman con un punto. Devuelven una cadena nueva; la original no cambia.",
      "",
      "- `\"  hola \".strip()` → `\"hola\"`",
      "- `\"Hola\".upper()` → `\"HOLA\"`",
      "- `\"a,b,c\".split(\",\")` → `[\"a\", \"b\", \"c\"]`",
      "",
      "Un **f-string** inserta valores dentro del texto: `f\"Nivel {nivel}\"`. Puedes formatear números: `f\"{3.14159:.2f}\"` → `\"3.14\"`.",
    ],
    example: {
      code: py`runa = "   DrAgÓn dE fUeGo  "
limpia = runa.strip().lower()
print(limpia)
print(limpia.title())
precision = 0.91234
print(f"Precisión: {precision:.1%}")`,
      lines: [
        "Texto con espacios y mayúsculas mezcladas.",
        "`strip()` quita los espacios de los extremos y `lower()` pasa a minúsculas.",
        "Muestra: dragón de fuego.",
        "`title()` pone en mayúscula cada palabra.",
        "Un número decimal.",
        "`:.1%` lo muestra como porcentaje con un decimal: 91.2%.",
      ],
    },
    challenge: [
      "Tienes `registro = \"  ana GARCÍA ; maga ; 1250  \"`.",
      "1. Separa por `;` y limpia los espacios de cada parte.",
      "2. Crea `nombre` con formato título (\"Ana García\"), `clase` en minúsculas y `puntos` como int.",
      "3. Crea `ficha = f\"{nombre} ({clase}) – {puntos} pts\"`.",
    ],
    starter: py`registro = "  ana GARCÍA ; maga ; 1250  "
partes = registro.split(",")
nombre = partes[0]
clase = ""
puntos = 0
ficha = ""`,
    solution: py`registro = "  ana GARCÍA ; maga ; 1250  "
partes = [p.strip() for p in registro.split(";")]
nombre = partes[0].title()
clase = partes[1].lower()
puntos = int(partes[2])
ficha = f"{nombre} ({clase}) – {puntos} pts"
print(ficha)`,
    tests: py`
def test_nombre():
    "nombre es 'Ana García'"
    assert t.get("nombre") == "Ana García", f"nombre = {t.get('nombre')!r}"

def test_clase():
    "clase es 'maga'"
    assert t.get("clase") == "maga"

def test_puntos():
    "puntos es el entero 1250"
    assert t.get("puntos") == 1250 and type(t.get("puntos")) is int

def test_ficha():
    "ficha tiene el formato pedido"
    assert t.get("ficha") == "Ana García (maga) – 1250 pts", f"ficha = {t.get('ficha')!r}"
`,
    hints: [
      "El separador es `;`, no `,`: `registro.split(\";\")`.",
      "Cada parte conserva espacios: aplica `.strip()` a cada una.",
      "`\"ana GARCÍA\".title()` → `\"Ana García\"`.",
    ],
    errors: [
      { error: "Llamar al método sin paréntesis: texto.upper", fix: "Sin paréntesis obtienes el método, no el resultado. Escribe `texto.upper()`." },
      { error: "Esperar que texto.strip() cambie la variable", fix: "Las cadenas son inmutables. Guarda el resultado: `texto = texto.strip()`." },
    ],
    quiz: {
      question: "Tras `s = \" hola \"` y `s.strip()`, ¿qué vale s?",
      options: [
        { text: "\" hola \" (sin cambios)" },
        { text: "\"hola\"", misconception: "mutabilidad" },
        { text: "\"HOLA\"" },
        { text: "None" },
      ],
      answer: 0,
      explanation: "Las cadenas son inmutables: strip() devuelve una cadena nueva. Si no la guardas, s sigue igual.",
    },
    advanced: {
      title: "Palíndromos mágicos",
      prompt: "Escribe `es_palindromo(texto)` que ignore mayúsculas, espacios y tildes básicas (á é í ó ú). \"Anita lava la tina\" es palíndromo.",
      starter: py`def es_palindromo(texto):
    return texto == texto[::-1]`,
      solution: py`def es_palindromo(texto):
    tabla = str.maketrans("áéíóú", "aeiou")
    limpio = texto.lower().translate(tabla).replace(" ", "")
    return limpio == limpio[::-1]`,
      tests: py`
def test_casos():
    "Detecta palíndromos con espacios y mayúsculas"
    f = t.get("es_palindromo", "function")
    assert f("Anita lava la tina") and f("Somos o no somos") and not f("Python")

def test_tildes():
    "Ignora tildes"
    assert t.get("es_palindromo")("Sé verla al revés")
`,
    },
    review: "Repasa que los métodos de cadena devuelven cadenas nuevas y cómo formatear números en f-strings.",
    xp: 40,
    coins: 6,
  },
  {
    id: "py-input",
    world: "w1",
    zone: "Primeros pasos",
    title: "El oráculo pregunta: input()",
    kind: "lesson",
    difficulty: 1,
    skills: ["entrada", "conversion"],
    requires: ["py-strings"],
    story: "El oráculo del bosque solo responde si le hablas. Tus programas también pueden preguntar al usuario.",
    objective: "Leer datos con `input()`, convertirlos y responder con un resultado.",
    before: ["Conversión de tipos", "f-strings"],
    intuition: [
      "`input(\"pregunta\")` muestra la pregunta, espera a que el usuario escriba y devuelve **siempre texto**.",
      "",
      "En esta misión la consola simula al usuario: las respuestas se leen de una lista de entradas preparadas. Las pruebas ejecutan tu programa varias veces con entradas distintas para comprobar que funciona en general.",
    ],
    example: {
      code: py`nombre = input("¿Cómo te llamas? ")
edad = int(input("¿Edad? "))
print(f"{nombre}, el año que viene tendrás {edad + 1}")`,
      lines: ["Lee un texto.", "Lee un texto y lo convierte a entero.", "Usa ambos valores en la respuesta."],
      stdin: ["Lin", "12"],
    },
    challenge: [
      "Escribe un conversor de temperaturas: pide grados Celsius con `input()` y muestra la temperatura en Fahrenheit con **un decimal**.",
      "Fórmula: F = C × 9/5 + 32.",
      "Formato exacto de la última línea: `XX.X °F` (por ejemplo `98.6 °F`).",
    ],
    stdin: ["37"],
    starter: py`c = input("Grados Celsius: ")
f = c * 9 / 5 + 32
print(f)`,
    solution: py`c = float(input("Grados Celsius: "))
f = c * 9 / 5 + 32
print(f"{f:.1f} °F")`,
    tests: py`
def test_37():
    "37 °C → 98.6 °F"
    assert t.lines[-1].endswith("98.6 °F"), f"Última línea: {t.lines[-1]!r}"

def test_otras_entradas():
    "Funciona con 0, -40 y 21.5"
    for c, esperado in [("0", "32.0 °F"), ("-40", "-40.0 °F"), ("21.5", "70.7 °F")]:
        salida = t.rerun([c]).strip().splitlines()[-1]
        assert salida.endswith(esperado), f"Con {c} °C mostraste {salida!r}; esperaba {esperado!r}"
`,
    hints: [
      "`input()` devuelve texto: conviértelo con `float()`.",
      "Para un decimal: `f\"{f:.1f} °F\"`.",
      "Prueba mentalmente -40: debe dar -40.0 °F.",
    ],
    errors: [
      { error: "TypeError: can't multiply sequence by non-int of type 'float'", fix: "Estás multiplicando texto. Convierte la entrada con float()." },
      { error: "EOFError: el programa pidió más datos", fix: "Llamas a input() más veces de las necesarias." },
    ],
    quiz: {
      question: "Si el usuario escribe 5, ¿qué devuelve `input()`?",
      options: [
        { text: "El texto \"5\"" },
        { text: "El entero 5", misconception: "tipos-texto-numero" },
        { text: "El float 5.0", misconception: "tipos-texto-numero" },
        { text: "Depende de lo que escriba" },
      ],
      answer: 0,
      explanation: "input() siempre devuelve una cadena. La conversión es responsabilidad del programa.",
    },
    advanced: {
      title: "Calculadora de IMC",
      prompt: "Pide peso (kg) y altura (m) y muestra `IMC: XX.X`. Las pruebas usan varias entradas.",
      stdin: ["70", "1.75"],
      starter: py`peso = input("Peso: ")
altura = input("Altura: ")`,
      solution: py`peso = float(input("Peso: "))
altura = float(input("Altura: "))
print(f"IMC: {peso / altura ** 2:.1f}")`,
      tests: py`
def test_imc():
    "70 kg y 1.75 m → IMC: 22.9"
    assert t.rerun(["70", "1.75"]).strip().splitlines()[-1].endswith("IMC: 22.9")
    assert t.rerun(["50", "1.6"]).strip().splitlines()[-1].endswith("IMC: 19.5")
`,
    },
    review: "Repasa que `input()` devuelve texto y cómo formatear con `:.1f`.",
    xp: 40,
    coins: 6,
  },
  {
    id: "py-logica",
    world: "w1",
    zone: "Decisiones",
    title: "La balanza de la verdad: comparación y lógica",
    kind: "lesson",
    difficulty: 1,
    skills: ["operadores", "booleanos"],
    requires: ["py-input"],
    story: "La puerta del templo se abre solo si se cumplen varias condiciones a la vez. La balanza de la verdad evalúa cada una.",
    objective: "Usar `== != < > <= >=` y combinar condiciones con `and`, `or`, `not`.",
    before: ["Tipos de datos", "Booleanos"],
    intuition: [
      "Una comparación produce un **booleano**: `5 > 3` es `True`.",
      "",
      "- `and`: verdadero si **ambas** lo son.",
      "- `or`: verdadero si **al menos una** lo es.",
      "- `not`: invierte el valor.",
      "",
      "Python permite comparaciones encadenadas como en matemáticas: `0 <= x < 10`.",
    ],
    formal: "Tabla de verdad: A and B es True solo si A=B=True; A or B es False solo si A=B=False.",
    example: {
      code: py`nivel = 7
tiene_llave = False
print(nivel >= 5 and tiene_llave)
print(nivel >= 5 or tiene_llave)
print(1 <= nivel <= 10)`,
      lines: ["Nivel actual.", "No tiene llave.", "False: falta la llave.", "True: basta con el nivel.", "True: comparación encadenada."],
    },
    challenge: [
      "La puerta se abre (`puede_entrar = True`) si el héroe tiene **nivel 5 o más** y además **(tiene la llave o tiene más de 100 monedas)**, y **no** está maldito.",
      "Escribe la función `puede_entrar(nivel, llave, monedas, maldito)` que devuelva ese booleano.",
    ],
    starter: py`def puede_entrar(nivel, llave, monedas, maldito):
    return nivel > 5 and llave or monedas > 100`,
    solution: py`def puede_entrar(nivel, llave, monedas, maldito):
    return nivel >= 5 and (llave or monedas > 100) and not maldito`,
    tests: py`
CASOS = [
    ((5, True, 0, False), True),
    ((4, True, 500, False), False),
    ((9, False, 101, False), True),
    ((9, False, 100, False), False),
    ((9, True, 0, True), False),
    ((5, False, 150, True), False),
]

def test_casos():
    "Responde bien a todas las combinaciones de prueba"
    f = t.get("puede_entrar", "function")
    for args, esperado in CASOS:
        r = f(*args)
        assert r == esperado, f"puede_entrar{args} devolvió {r}; esperaba {esperado}"

def test_booleano():
    "Devuelve un booleano"
    assert isinstance(t.get("puede_entrar")(5, True, 0, False), bool)
`,
    hints: [
      "«5 o más» se escribe `nivel >= 5`.",
      "`and` se evalúa antes que `or`: usa paréntesis para agrupar `(llave or monedas > 100)`.",
      "«No maldito»: `not maldito`.",
    ],
    errors: [
      { error: "Olvidar paréntesis en condiciones mixtas", fix: "`a and b or c` significa `(a and b) or c`. Agrupa lo que quieras evaluar junto." },
      { error: "Escribir `= 5` en una condición", fix: "Para comparar usa `==`." },
    ],
    quiz: {
      question: "¿Qué vale `not (3 > 2 and 2 > 5)`?",
      options: [{ text: "True" }, { text: "False" }, { text: "Error" }, { text: "None" }],
      answer: 0,
      explanation: "3 > 2 es True, 2 > 5 es False; True and False es False; not False es True.",
    },
    advanced: {
      title: "Año bisiesto",
      prompt: "`es_bisiesto(a)`: divisible entre 4, salvo los divisibles entre 100 que no lo sean entre 400.",
      starter: py`def es_bisiesto(a):
    return a % 4 == 0`,
      solution: py`def es_bisiesto(a):
    return a % 4 == 0 and (a % 100 != 0 or a % 400 == 0)`,
      tests: py`
def test_bisiestos():
    "2024, 2000 sí; 1900, 2023 no"
    f = t.get("es_bisiesto", "function")
    assert f(2024) and f(2000) and not f(1900) and not f(2023)
`,
    },
    review: "Repasa la precedencia de `not`, `and` y `or`.",
    xp: 40,
    coins: 6,
  },
  {
    id: "py-if",
    world: "w1",
    zone: "Decisiones",
    title: "La bifurcación: if, elif, else",
    kind: "lesson",
    difficulty: 2,
    skills: ["condicionales"],
    requires: ["py-logica"],
    story: "El camino se divide en tres. Un sabio te asigna un rango según tu puntuación en la prueba del bosque.",
    objective: "Tomar decisiones con `if`, `elif` y `else` usando bloques sangrados.",
    before: ["Comparaciones y lógica"],
    intuition: [
      "Un `if` ejecuta un bloque solo si la condición es verdadera. El bloque se marca con **dos puntos** y **sangría** de 4 espacios.",
      "",
      "```python",
      "if puntos >= 90:",
      "    rango = \"oro\"",
      "elif puntos >= 70:",
      "    rango = \"plata\"",
      "else:",
      "    rango = \"bronce\"",
      "```",
      "",
      "Python prueba las condiciones **en orden** y ejecuta solo la primera que se cumple. Por eso el orden importa.",
    ],
    example: {
      code: py`vida = 25
if vida <= 0:
    print("Fin del juego")
elif vida < 30:
    print("¡Cuidado! Vida baja")
else:
    print("Todo bien")`,
      lines: [
        "La vida del héroe.",
        "Primera condición: ¿sin vida?",
        "Solo se ejecuta si la condición anterior es verdadera.",
        "Si no, prueba esta otra condición.",
        "Se ejecuta: 25 < 30.",
        "Si ninguna se cumple…",
        "…se ejecuta este bloque.",
      ],
    },
    challenge: [
      "Escribe `rango(puntos)` que devuelva:",
      "- `\"leyenda\"` si puntos ≥ 95",
      "- `\"oro\"` si 80 ≤ puntos < 95",
      "- `\"plata\"` si 60 ≤ puntos < 80",
      "- `\"bronce\"` si 0 ≤ puntos < 60",
      "- `\"inválido\"` si puntos es negativo o mayor que 100",
    ],
    starter: py`def rango(puntos):
    if puntos >= 60:
        return "plata"
    elif puntos >= 80:
        return "oro"
    else:
        return "bronce"`,
    solution: py`def rango(puntos):
    if puntos < 0 or puntos > 100:
        return "inválido"
    if puntos >= 95:
        return "leyenda"
    elif puntos >= 80:
        return "oro"
    elif puntos >= 60:
        return "plata"
    else:
        return "bronce"`,
    tests: py`
def test_limites():
    "Respeta los límites exactos (95, 80, 60, 0)"
    f = t.get("rango", "function")
    esperado = {95: "leyenda", 94.9: "oro", 80: "oro", 79: "plata", 60: "plata", 59.5: "bronce", 0: "bronce", 100: "leyenda"}
    for p, r in esperado.items():
        assert f(p) == r, f"rango({p}) devolvió {f(p)!r}; esperaba {r!r}"

def test_invalidos():
    "Detecta valores fuera de 0–100"
    f = t.get("rango")
    assert f(-1) == "inválido" and f(101) == "inválido"
`,
    hints: [
      "Comprueba primero los valores inválidos.",
      "Ordena las condiciones de mayor a menor: si preguntas primero `>= 60`, un 90 entraría ahí.",
      "Con `elif` no necesitas repetir el límite superior: si llegas a `elif puntos >= 80`, ya sabes que es menor que 95.",
    ],
    errors: [
      { error: "IndentationError: expected an indented block", fix: "Después de `if ...:` el bloque debe ir sangrado 4 espacios." },
      { error: "Condiciones en orden incorrecto", fix: "La primera condición verdadera gana. Ordena de la más restrictiva a la menos." },
    ],
    quiz: {
      question: "Con `x = 85`, ¿qué se imprime?\n\nif x > 50: print(\"A\")\nelif x > 80: print(\"B\")\nelse: print(\"C\")",
      options: [{ text: "A" }, { text: "B" }, { text: "A y B" }, { text: "C" }],
      answer: 0,
      explanation: "La primera condición verdadera (x > 50) se ejecuta y el resto de la cadena elif/else se salta.",
    },
    advanced: {
      title: "Piedra, papel o tijera",
      prompt: "`ganador(a, b)` devuelve `\"a\"`, `\"b\"` o `\"empate\"` para jugadas \"piedra\", \"papel\", \"tijera\".",
      starter: py`def ganador(a, b):
    return "empate"`,
      solution: py`def ganador(a, b):
    vence = {"piedra": "tijera", "papel": "piedra", "tijera": "papel"}
    if a == b:
        return "empate"
    return "a" if vence[a] == b else "b"`,
      tests: py`
def test_todas():
    "Las 9 combinaciones"
    f = t.get("ganador", "function")
    assert f("piedra", "tijera") == "a" and f("tijera", "piedra") == "b"
    assert f("papel", "piedra") == "a" and f("piedra", "papel") == "b"
    assert f("tijera", "papel") == "a" and f("papel", "tijera") == "b"
    assert all(f(x, x) == "empate" for x in ("piedra", "papel", "tijera"))
`,
    },
    review: "Repasa que solo se ejecuta la primera rama verdadera de una cadena if/elif/else.",
    xp: 45,
    coins: 7,
  },
  {
    id: "py-for",
    world: "w1",
    zone: "Bucles",
    title: "El sendero que se repite: for y range",
    kind: "lesson",
    difficulty: 2,
    skills: ["bucles"],
    requires: ["py-if"],
    story: "Un sendero mágico se repite una y otra vez. Para cruzarlo, debes contar cada paso y sumar los cristales que encuentras.",
    objective: "Recorrer secuencias con `for`, generar números con `range()` y acumular resultados.",
    before: ["Condicionales", "Variables"],
    intuition: [
      "`for` repite un bloque **una vez por cada elemento** de una secuencia:",
      "",
      "```python",
      "for cristal in [3, 5, 2]:",
      "    print(cristal)",
      "```",
      "",
      "`range(inicio, fin, paso)` genera números **sin incluir `fin`**: `range(1, 5)` → 1, 2, 3, 4.",
      "",
      "Patrón **acumulador**: empieza con un valor neutro (`total = 0`) y actualízalo en cada vuelta.",
    ],
    formal: "Σ_{i=1}^{n} i = n(n+1)/2. Un for con acumulador es la versión computacional de una sumatoria.",
    example: {
      code: py`total = 0
for i in range(1, 6):
    total = total + i
    print("paso", i, "total", total)
print("Suma final:", total)`,
      lines: [
        "El acumulador empieza en 0.",
        "i toma los valores 1, 2, 3, 4, 5 (el 6 no se incluye).",
        "Suma i al total en cada vuelta.",
        "Muestra el progreso.",
        "Fuera del bucle (sin sangría): se ejecuta una sola vez. Suma final: 15.",
      ],
    },
    challenge: [
      "Escribe `suma_cuadrados_pares(n)` que devuelva la suma de los cuadrados de los números **pares** entre 1 y n (incluido n).",
      "Ejemplo: `suma_cuadrados_pares(6)` = 2² + 4² + 6² = 56.",
      "Usa un bucle `for`.",
    ],
    starter: py`def suma_cuadrados_pares(n):
    total = 0
    for i in range(n):
        total = i ** 2
    return total`,
    solution: py`def suma_cuadrados_pares(n):
    total = 0
    for i in range(2, n + 1, 2):
        total += i ** 2
    return total`,
    tests: py`
def test_ejemplo():
    "suma_cuadrados_pares(6) = 56"
    assert t.get("suma_cuadrados_pares", "function")(6) == 56

def test_varios():
    "Funciona para n = 1, 2, 7 y 10"
    f = t.get("suma_cuadrados_pares")
    for n in (1, 2, 7, 10):
        esperado = sum(i * i for i in range(1, n + 1) if i % 2 == 0)
        assert f(n) == esperado, f"Con n={n} devolviste {f(n)}; esperaba {esperado}"

def test_usa_for():
    "Usa un bucle for"
    assert t.uses("For")
`,
    hints: [
      "`range(n)` empieza en 0 y no incluye n. Necesitas llegar hasta n incluido: `range(..., n + 1)`.",
      "Puedes recorrer solo los pares con paso 2: `range(2, n + 1, 2)`, o filtrar con `if i % 2 == 0`.",
      "Acumula con `total += i ** 2`, no `total = i ** 2` (eso sobrescribe).",
    ],
    errors: [
      { error: "Error por uno (off-by-one)", fix: "range(a, b) no incluye b. Si quieres incluir n, usa range(..., n + 1)." },
      { error: "Sobrescribir el acumulador", fix: "`total = x` reemplaza; `total += x` acumula." },
    ],
    quiz: {
      question: "¿Cuántas veces se ejecuta el bloque de `for i in range(3, 10, 3)`?",
      options: [{ text: "3 (i = 3, 6, 9)" }, { text: "2" }, { text: "4", misconception: "indice-cero" }, { text: "7" }],
      answer: 0,
      explanation: "range(3, 10, 3) genera 3, 6, 9; el siguiente sería 12, que supera el límite.",
    },
    advanced: {
      title: "Tabla de multiplicar",
      prompt: "Crea `tabla`: una lista de listas 5×5 donde `tabla[i][j] == (i+1)*(j+1)`, usando bucles anidados.",
      starter: py`tabla = []`,
      solution: py`tabla = []
for i in range(1, 6):
    fila = []
    for j in range(1, 6):
        fila.append(i * j)
    tabla.append(fila)`,
      tests: py`
def test_tabla():
    "Tabla 5x5 correcta"
    tb = t.get("tabla")
    assert len(tb) == 5 and all(tb[i][j] == (i + 1) * (j + 1) for i in range(5) for j in range(5))
`,
    },
    review: "Repasa el patrón acumulador y por qué `range` excluye el límite superior.",
    xp: 45,
    coins: 7,
  },
  {
    id: "py-while",
    world: "w1",
    zone: "Bucles",
    title: "Mientras arda la antorcha: while",
    kind: "lesson",
    difficulty: 2,
    skills: ["bucles"],
    requires: ["py-for"],
    story: "En la cueva, avanzas mientras quede aceite en la antorcha. No sabes cuántos pasos darás: depende de cuánto consumas.",
    objective: "Repetir mientras se cumpla una condición con `while`, y usar `break` y `continue` con cuidado.",
    before: ["Bucles for", "Condiciones"],
    intuition: [
      "`while condición:` repite el bloque **mientras** la condición sea verdadera. Úsalo cuando no sabes de antemano cuántas vueltas habrá.",
      "",
      "Algo dentro del bucle debe acercar la condición a `False`; si no, tienes un **bucle infinito**. Aquí, si tu programa tarda demasiado, Python Quest lo detiene.",
      "",
      "- `break` sale del bucle inmediatamente.",
      "- `continue` salta a la siguiente vuelta.",
    ],
    example: {
      code: py`aceite = 10
pasos = 0
while aceite > 0:
    aceite -= 3
    pasos += 1
print(pasos, "pasos; aceite final:", aceite)`,
      lines: [
        "Aceite inicial.",
        "Contador de pasos.",
        "Repite mientras quede aceite.",
        "Cada paso consume 3: la condición acabará siendo falsa.",
        "Cuenta el paso.",
        "4 pasos; el aceite queda en -2.",
      ],
    },
    challenge: [
      "La conjetura de Collatz: si n es par, divídelo entre 2; si es impar, conviértelo en 3n + 1. Repite hasta llegar a 1.",
      "Escribe `pasos_collatz(n)` que devuelva cuántos pasos hacen falta para llegar a 1. Por ejemplo, `pasos_collatz(6)` = 8 (6→3→10→5→16→8→4→2→1).",
    ],
    starter: py`def pasos_collatz(n):
    pasos = 0
    while n != 1:
        if n % 2 == 0:
            n = n / 2
        pasos += 1
    return pasos`,
    solution: py`def pasos_collatz(n):
    pasos = 0
    while n != 1:
        if n % 2 == 0:
            n = n // 2
        else:
            n = 3 * n + 1
        pasos += 1
    return pasos`,
    tests: py`
def test_ejemplos():
    "Collatz de 1, 6, 7 y 27"
    f = t.get("pasos_collatz", "function")
    for n, p in [(1, 0), (6, 8), (7, 16), (27, 111)]:
        assert f(n) == p, f"pasos_collatz({n}) = {f(n)}; esperaba {p}"

def test_while():
    "Usa while"
    assert t.uses("While")
`,
    hints: [
      "Te falta el caso impar: `n = 3 * n + 1`.",
      "Con `n / 2` obtienes floats; usa `n // 2` para seguir con enteros.",
      "El contador debe aumentar en cada vuelta, sea par o impar.",
    ],
    errors: [
      { error: "El programa nunca termina", fix: "Si n no cambia en alguna rama, la condición nunca se vuelve falsa. Revisa que todas las ramas actualicen n." },
      { error: "Mezclar / y //", fix: "`/` produce floats (8.0). Para seguir con enteros usa `//`." },
    ],
    quiz: {
      question: "¿Cuándo es preferible `while` a `for`?",
      options: [
        { text: "Cuando el número de repeticiones depende de una condición que no conoces de antemano" },
        { text: "Siempre: while es más rápido" },
        { text: "Para recorrer una lista elemento a elemento" },
        { text: "Nunca: while está obsoleto" },
      ],
      answer: 0,
      explanation: "for recorre una secuencia conocida; while repite mientras una condición se cumpla y es natural cuando el final depende de lo que ocurre dentro del bucle.",
    },
    advanced: {
      title: "Adivina el número (búsqueda)",
      prompt: "`adivinar(secreto)` debe encontrar un número entre 1 y 1000 preguntando «¿es mayor?» (comparando con `secreto`) y devolver cuántos intentos usó. Debe usar como máximo 10 intentos (búsqueda binaria).",
      starter: py`def adivinar(secreto):
    intento = 1
    n = 0
    while intento != secreto:
        intento += 1
        n += 1
    return n`,
      solution: py`def adivinar(secreto):
    bajo, alto, n = 1, 1000, 0
    while True:
        n += 1
        medio = (bajo + alto) // 2
        if medio == secreto:
            return n
        if secreto > medio:
            bajo = medio + 1
        else:
            alto = medio - 1`,
      tests: py`
def test_max_10():
    "Encuentra cualquier número con 10 intentos o menos"
    f = t.get("adivinar", "function")
    peor = max(f(s) for s in range(1, 1001))
    assert peor <= 10, f"El peor caso usó {peor} intentos"
`,
    },
    review: "Repasa cómo garantizar que un while termina y la diferencia entre `/` y `//`.",
    xp: 50,
    coins: 8,
  },
];
