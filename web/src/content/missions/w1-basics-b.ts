import { py, type Mission } from "../types";

// Mundo 1 · parte B: colecciones, funciones, errores, módulos y archivos + proyecto.

export const W1_B: Mission[] = [
  {
    id: "py-listas",
    world: "w1",
    zone: "Colecciones",
    title: "La mochila del explorador: listas",
    kind: "lesson",
    difficulty: 2,
    skills: ["listas"],
    requires: ["py-while"],
    story: "Tu mochila guarda objetos en orden. Puedes añadir, quitar, contar y recorrer lo que llevas.",
    objective: "Crear listas, modificarlas con `append`, `remove`, `pop` y usar `len`, `sum`, `min`, `max`, `sorted`.",
    before: ["Bucles for", "Variables"],
    intuition: [
      "Una **lista** guarda varios valores en orden: `mochila = [\"cuerda\", \"mapa\", \"poción\"]`.",
      "",
      "- `mochila.append(x)` añade al final.",
      "- `mochila.remove(x)` quita la primera aparición de x.",
      "- `mochila.pop()` quita y devuelve el último.",
      "- `len(lista)`, `sum(lista)`, `min`, `max` resumen la lista.",
      "- `sorted(lista)` devuelve una copia ordenada; `lista.sort()` ordena la original.",
      "",
      "Las listas son **mutables**: los métodos las cambian en su sitio.",
    ],
    example: {
      code: py`pesos = [2.5, 0.4, 1.2]
pesos.append(3.0)
print(len(pesos), sum(pesos))
print(sorted(pesos, reverse=True))
pesos.remove(0.4)
print(pesos)`,
      lines: ["Una lista de pesos en kg.", "Añade 3.0 al final.", "4 elementos que suman 7.1.", "Copia ordenada de mayor a menor.", "Quita el 0.4.", "La lista original ya no lo tiene."],
    },
    challenge: [
      "Escribe `resumen(puntos)` que reciba una lista de números y devuelva una **tupla** `(cantidad, total, media, maximo)`.",
      "Si la lista está vacía, devuelve `(0, 0, None, None)`.",
      "No uses `statistics`: calcula la media con `sum` y `len`.",
    ],
    starter: py`def resumen(puntos):
    total = 0
    for p in puntos:
        total = total + 1
    return total`,
    solution: py`def resumen(puntos):
    if not puntos:
        return (0, 0, None, None)
    return (len(puntos), sum(puntos), sum(puntos) / len(puntos), max(puntos))`,
    tests: py`
def test_basico():
    "resumen([3, 9, 6]) == (3, 18, 6.0, 9)"
    r = t.get("resumen", "function")([3, 9, 6])
    assert r == (3, 18, 6.0, 9), f"Devolviste {r!r}"

def test_vacia():
    "Lista vacía → (0, 0, None, None)"
    assert t.get("resumen")([]) == (0, 0, None, None)

def test_no_modifica():
    "No modifica la lista recibida"
    datos = [5, 1, 4]
    t.get("resumen")(datos)
    assert datos == [5, 1, 4], "Tu función cambió la lista original"

def test_decimales():
    "Funciona con decimales"
    r = t.get("resumen")([0.5, 1.5])
    assert r[0] == 2 and approx(r[1], 2.0) and approx(r[2], 1.0) and r[3] == 1.5
`,
    hints: [
      "`len`, `sum` y `max` ya existen: no necesitas un bucle.",
      "Una lista vacía es «falsa»: `if not puntos:` detecta ese caso.",
      "Devuelve varios valores separados por comas entre paréntesis: `return (a, b, c, d)`.",
    ],
    errors: [
      { error: "ZeroDivisionError con la lista vacía", fix: "Comprueba el caso vacío antes de dividir entre len(puntos)." },
      { error: "Usar lista.sort() y devolver su resultado", fix: "`sort()` ordena en su sitio y devuelve None. Usa `sorted(lista)` si quieres una copia." },
    ],
    quiz: {
      question: "Si `a = [1, 2]` y luego `b = a` y `b.append(3)`, ¿qué vale `a`?",
      options: [
        { text: "[1, 2, 3]" },
        { text: "[1, 2]", misconception: "mutabilidad" },
        { text: "Error" },
        { text: "[3]" },
      ],
      answer: 0,
      explanation: "`b = a` no copia la lista: ambos nombres apuntan al mismo objeto. Para una copia usa `a.copy()` o `list(a)`.",
    },
    advanced: {
      title: "Eliminar duplicados conservando el orden",
      prompt: "Escribe `unicos(lista)` que devuelva una lista nueva sin repetidos, manteniendo el orden de primera aparición.",
      starter: py`def unicos(lista):
    return list(set(lista))`,
      solution: py`def unicos(lista):
    vistos = []
    for x in lista:
        if x not in vistos:
            vistos.append(x)
    return vistos`,
      tests: py`
def test_orden():
    "Conserva el orden de aparición"
    assert t.get("unicos", "function")([3, 1, 3, 2, 1]) == [3, 1, 2]
    assert t.get("unicos")(["b", "a", "b"]) == ["b", "a"]
`,
    },
    review: "Repasa que las listas son mutables y la diferencia entre `sorted()` y `.sort()`.",
    xp: 50,
    coins: 8,
  },
  {
    id: "py-indices",
    world: "w1",
    zone: "Colecciones",
    title: "Coordenadas del mapa: índices y slicing",
    kind: "lesson",
    difficulty: 2,
    skills: ["listas", "indices"],
    requires: ["py-listas"],
    story: "El mapa del tesoro es una fila de casillas. Para encontrar el cofre necesitas contar posiciones con precisión.",
    objective: "Acceder a elementos con índices positivos y negativos, y extraer porciones con slicing `[inicio:fin:paso]`.",
    before: ["Listas", "range()"],
    intuition: [
      "Los índices empiezan en **0**. En `l = [\"a\", \"b\", \"c\", \"d\"]`:",
      "",
      "- `l[0]` → `\"a\"`, `l[3]` → `\"d\"`",
      "- `l[-1]` → `\"d\"` (el último), `l[-2]` → `\"c\"`",
      "",
      "El **slicing** `l[inicio:fin]` incluye `inicio` y **excluye** `fin`, como `range`:",
      "",
      "- `l[1:3]` → `[\"b\", \"c\"]`",
      "- `l[:2]` → los dos primeros; `l[2:]` → desde el tercero",
      "- `l[::2]` → uno sí, uno no; `l[::-1]` → invertida",
      "",
      "Funciona igual con cadenas: `\"python\"[1:4]` → `\"yth\"`.",
    ],
    example: {
      code: py`dias = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]
print(dias[0], dias[-1])
print(dias[:5])
print(dias[5:])
print(dias[::-1][:3])`,
      lines: ["Siete días, índices 0 a 6.", "Primero y último: lun dom.", "Los cinco laborables (0 a 4).", "Fin de semana (5 en adelante).", "Invierte la lista y toma los tres primeros: dom sáb vie."],
    },
    challenge: [
      "Dada una lista de lecturas de temperatura, escribe `analizar(lecturas)` que devuelva un diccionario con:",
      "- `\"primera\"`: la primera lectura",
      "- `\"ultima\"`: la última",
      "- `\"ultimas3\"`: lista con las tres últimas (o menos si no hay tres)",
      "- `\"pares\"`: lecturas en posiciones pares (0, 2, 4…)",
      "- `\"invertida\"`: la lista al revés",
      "Usa slicing; no modifiques la lista original.",
    ],
    starter: py`def analizar(lecturas):
    return {
        "primera": lecturas[1],
        "ultima": lecturas[len(lecturas)],
        "ultimas3": lecturas[3:],
        "pares": lecturas,
        "invertida": lecturas.reverse(),
    }`,
    solution: py`def analizar(lecturas):
    return {
        "primera": lecturas[0],
        "ultima": lecturas[-1],
        "ultimas3": lecturas[-3:],
        "pares": lecturas[::2],
        "invertida": lecturas[::-1],
    }`,
    tests: py`
def test_valores():
    "Analiza [18, 21, 19, 25, 23, 20]"
    datos = [18, 21, 19, 25, 23, 20]
    r = t.get("analizar", "function")(datos)
    assert r["primera"] == 18, f"primera = {r['primera']}"
    assert r["ultima"] == 20, f"ultima = {r['ultima']}"
    assert r["ultimas3"] == [25, 23, 20], f"ultimas3 = {r['ultimas3']}"
    assert r["pares"] == [18, 19, 23], f"pares = {r['pares']}"
    assert r["invertida"] == [20, 23, 25, 19, 21, 18], f"invertida = {r['invertida']}"

def test_cortas():
    "Funciona con listas de 1 y 2 elementos"
    r = t.get("analizar")([7, 9])
    assert r["ultimas3"] == [7, 9] and r["pares"] == [7]
    r = t.get("analizar")([5])
    assert r["primera"] == r["ultima"] == 5

def test_no_modifica():
    "No modifica la lista original"
    datos = [1, 2, 3]
    t.get("analizar")(datos)
    assert datos == [1, 2, 3], "Usaste un método que cambia la lista (¿reverse?)"
`,
    hints: [
      "El primer elemento es el índice 0 y el último el -1.",
      "`lecturas[-3:]` toma los tres últimos y no falla si hay menos.",
      "`reverse()` cambia la lista y devuelve None; `[::-1]` crea una copia invertida.",
    ],
    errors: [
      { error: "IndexError: list index out of range", fix: "El último índice válido es len(lista) - 1, no len(lista)." },
      { error: "Obtener None al invertir", fix: "`lista.reverse()` devuelve None. Usa `lista[::-1]`." },
    ],
    quiz: {
      question: "Con `l = [10, 20, 30, 40, 50]`, ¿qué devuelve `l[1:4]`?",
      options: [
        { text: "[20, 30, 40]" },
        { text: "[10, 20, 30, 40]", misconception: "indice-cero" },
        { text: "[20, 30, 40, 50]", misconception: "indice-cero" },
        { text: "[10, 20, 30]" },
      ],
      answer: 0,
      explanation: "El índice 1 es el segundo elemento (20) y el corte se detiene antes del índice 4 (50 no se incluye).",
    },
    advanced: {
      title: "Ventanas móviles",
      prompt: "Escribe `medias_moviles(xs, k)` que devuelva la media de cada ventana de k elementos consecutivos. Para `[1, 2, 3, 4]` y k=2: `[1.5, 2.5, 3.5]`.",
      starter: py`def medias_moviles(xs, k):
    return []`,
      solution: py`def medias_moviles(xs, k):
    return [sum(xs[i:i + k]) / k for i in range(len(xs) - k + 1)]`,
      tests: py`
def test_mm():
    "Medias móviles correctas"
    f = t.get("medias_moviles", "function")
    assert f([1, 2, 3, 4], 2) == [1.5, 2.5, 3.5]
    assert f([3, 3, 9], 3) == [5.0]
    assert f([1, 2], 3) == []
`,
    },
    review: "Repasa que los índices empiezan en 0 y que el final de un corte no se incluye.",
    xp: 50,
    coins: 8,
  },
  {
    id: "py-tuplas-sets",
    world: "w1",
    zone: "Colecciones",
    title: "Gemas fijas y únicas: tuplas y conjuntos",
    kind: "lesson",
    difficulty: 2,
    skills: ["tuplas", "conjuntos"],
    requires: ["py-indices"],
    story: "Algunas gemas no cambian nunca (sus coordenadas). Otras colecciones solo admiten piezas únicas, sin repetidos.",
    objective: "Usar tuplas para datos inmutables y conjuntos para eliminar duplicados y hacer operaciones de conjuntos.",
    before: ["Listas", "Índices"],
    intuition: [
      "Una **tupla** es como una lista pero **inmutable**: `punto = (3, 4)`. Sirve para datos que van juntos y no deben cambiar, y para devolver varios valores. Se desempaqueta: `x, y = punto`.",
      "",
      "Un **conjunto** (`set`) guarda elementos **únicos y sin orden**: `{\"rojo\", \"azul\"}`. Es muy rápido para preguntar `x in conjunto` y permite operaciones matemáticas:",
      "",
      "- `a | b` unión · `a & b` intersección · `a - b` diferencia · `a ^ b` diferencia simétrica",
    ],
    formal: "Para conjuntos finitos: |A ∪ B| = |A| + |B| − |A ∩ B|.",
    example: {
      code: py`coordenada = (40.4, -3.7)
lat, lon = coordenada
print(lat, lon)
a = {"python", "sql", "excel"}
b = {"python", "r", "sql"}
print(sorted(a & b), sorted(a | b), sorted(a - b))`,
      lines: ["Tupla con latitud y longitud.", "Desempaquetado en dos variables.", "Muestra 40.4 -3.7.", "Habilidades de la persona A.", "Habilidades de la persona B.", "Comunes, todas y solo de A (ordenadas para mostrarlas)."],
    },
    challenge: [
      "Dos gremios tienen listas de miembros (con repeticiones por errores de registro).",
      "Escribe `comparar(g1, g2)` que devuelva una tupla `(ambos, solo_g1, total_unicos)` donde:",
      "- `ambos` es una lista **ordenada** de los nombres que están en los dos gremios",
      "- `solo_g1` es una lista **ordenada** de los que solo están en g1",
      "- `total_unicos` es el número de personas distintas entre ambos gremios",
    ],
    starter: py`def comparar(g1, g2):
    ambos = []
    for x in g1:
        if x in g2:
            ambos.append(x)
    return ambos`,
    solution: py`def comparar(g1, g2):
    s1, s2 = set(g1), set(g2)
    return (sorted(s1 & s2), sorted(s1 - s2), len(s1 | s2))`,
    tests: py`
def test_comparar():
    "Calcula intersección, diferencia y total"
    g1 = ["ana", "luis", "ana", "eva", "tomás"]
    g2 = ["eva", "rosa", "luis", "luis"]
    r = t.get("comparar", "function")(g1, g2)
    assert isinstance(r, tuple) and len(r) == 3, "Devuelve una tupla de 3 elementos"
    assert r[0] == ["eva", "luis"], f"ambos = {r[0]}"
    assert r[1] == ["ana", "tomás"], f"solo_g1 = {r[1]}"
    assert r[2] == 5, f"total_unicos = {r[2]}"

def test_vacios():
    "Funciona con gremios vacíos"
    assert t.get("comparar")([], ["x"]) == ([], [], 1)
`,
    hints: [
      "Convierte cada lista en conjunto con `set(...)`: los repetidos desaparecen.",
      "`&` es la intersección, `-` la diferencia y `|` la unión.",
      "Los conjuntos no tienen orden: usa `sorted(...)` para obtener una lista ordenada.",
    ],
    errors: [
      { error: "TypeError: 'tuple' object does not support item assignment", fix: "Las tuplas no se pueden modificar. Crea una tupla nueva o usa una lista." },
      { error: "Esperar que un set conserve el orden", fix: "Los conjuntos no tienen orden garantizado. Ordena con sorted() al mostrarlos." },
    ],
    quiz: {
      question: "¿Qué devuelve `len({1, 2, 2, 3, 3, 3})`?",
      options: [{ text: "3" }, { text: "6" }, { text: "4" }, { text: "Error" }],
      answer: 0,
      explanation: "Un conjunto solo guarda valores distintos: {1, 2, 3}.",
    },
    advanced: {
      title: "Índice de Jaccard",
      prompt: "La similitud de Jaccard entre dos conjuntos es |A ∩ B| / |A ∪ B|. Escribe `jaccard(a, b)` para dos listas (0 si ambas están vacías).",
      starter: py`def jaccard(a, b):
    return 0`,
      solution: py`def jaccard(a, b):
    sa, sb = set(a), set(b)
    union = sa | sb
    return len(sa & sb) / len(union) if union else 0`,
      tests: py`
def test_j():
    "Jaccard correcto"
    f = t.get("jaccard", "function")
    assert approx(f(["a", "b", "c"], ["b", "c", "d"]), 0.5)
    assert f([], []) == 0 and f(["x"], ["x", "x"]) == 1
`,
    },
    review: "Repasa cuándo conviene una tupla (datos fijos) y cuándo un conjunto (pertenencia y unicidad).",
    xp: 50,
    coins: 8,
  },
  {
    id: "py-dicts",
    world: "w1",
    zone: "Colecciones",
    title: "El libro de hechizos: diccionarios",
    kind: "lesson",
    difficulty: 2,
    skills: ["diccionarios"],
    requires: ["py-tuplas-sets"],
    story: "El libro de hechizos asocia cada nombre con su poder. Buscar por nombre es instantáneo.",
    objective: "Crear, leer, actualizar y recorrer diccionarios; contar frecuencias.",
    before: ["Listas", "Bucles"],
    intuition: [
      "Un **diccionario** asocia **claves** con **valores**: `precios = {\"poción\": 12, \"mapa\": 20}`.",
      "",
      "- Leer: `precios[\"mapa\"]` (error si no existe) o `precios.get(\"escudo\", 0)` (valor por defecto).",
      "- Escribir: `precios[\"escudo\"] = 60`.",
      "- Recorrer: `for clave, valor in precios.items():`",
      "- Preguntar: `\"mapa\" in precios`.",
      "",
      "Patrón muy común en análisis de datos: **contar frecuencias** con `conteo[x] = conteo.get(x, 0) + 1`.",
    ],
    example: {
      code: py`inventario = {"poción": 3, "flecha": 20}
inventario["poción"] += 2
inventario["mapa"] = 1
for objeto, cantidad in inventario.items():
    print(objeto, cantidad)
print(inventario.get("escudo", 0))`,
      lines: ["Diccionario objeto → cantidad.", "Suma 2 pociones (ahora 5).", "Añade una clave nueva.", "Recorre pares clave-valor…", "…y los muestra.", "Clave inexistente con valor por defecto: 0."],
    },
    challenge: [
      "Escribe `frecuencias(palabras)` que reciba una lista de palabras y devuelva un diccionario palabra → número de apariciones, **ignorando mayúsculas**.",
      "Después escribe `mas_comun(palabras)` que devuelva la palabra más frecuente (en minúsculas). En caso de empate, la que aparece primero en la lista.",
    ],
    starter: py`def frecuencias(palabras):
    conteo = {}
    for p in palabras:
        conteo[p] = 1
    return conteo

def mas_comun(palabras):
    return palabras[0]`,
    solution: py`def frecuencias(palabras):
    conteo = {}
    for p in palabras:
        p = p.lower()
        conteo[p] = conteo.get(p, 0) + 1
    return conteo

def mas_comun(palabras):
    conteo = frecuencias(palabras)
    mejor = None
    for p in palabras:
        p = p.lower()
        if mejor is None or conteo[p] > conteo[mejor]:
            mejor = p
    return mejor`,
    tests: py`
def test_frecuencias():
    "Cuenta ignorando mayúsculas"
    f = t.get("frecuencias", "function")
    assert f(["Sol", "luna", "sol", "SOL", "luna", "mar"]) == {"sol": 3, "luna": 2, "mar": 1}
    assert f([]) == {}

def test_mas_comun():
    "Devuelve la más frecuente"
    m = t.get("mas_comun", "function")
    assert m(["b", "a", "B", "c"]) == "b"

def test_empate():
    "En empate gana la que aparece primero"
    assert t.get("mas_comun")(["gato", "perro", "perro", "gato"]) == "gato"
`,
    hints: [
      "Convierte cada palabra con `.lower()` antes de contarla.",
      "`conteo.get(p, 0) + 1` evita el KeyError la primera vez que ves una palabra.",
      "Para el empate, recorre la lista original en orden y quédate con la primera que tenga la cuenta máxima.",
    ],
    errors: [
      { error: "KeyError: 'sol'", fix: "Leíste una clave que aún no existe. Usa .get(clave, 0) o comprueba con `in`." },
      { error: "Contar 'Sol' y 'sol' por separado", fix: "Normaliza con .lower() antes de usar la palabra como clave." },
    ],
    quiz: {
      question: "¿Qué puede ser una clave de diccionario?",
      options: [
        { text: "Valores inmutables como cadenas, números o tuplas" },
        { text: "Cualquier valor, incluidas listas", misconception: "mutabilidad" },
        { text: "Solo cadenas de texto" },
        { text: "Solo números enteros" },
      ],
      answer: 0,
      explanation: "Las claves deben ser «hashables» (inmutables). Una lista puede cambiar, así que no sirve como clave; una tupla sí.",
    },
    advanced: {
      title: "Agrupar por categoría",
      prompt: "Escribe `agrupar(ventas)` que reciba tuplas `(producto, categoria, importe)` y devuelva un diccionario categoría → importe total.",
      starter: py`def agrupar(ventas):
    return {}`,
      solution: py`def agrupar(ventas):
    tot = {}
    for _, cat, imp in ventas:
        tot[cat] = tot.get(cat, 0) + imp
    return tot`,
      tests: py`
def test_agrupar():
    "Totales por categoría"
    v = [("arco", "armas", 30), ("poción", "magia", 5), ("espada", "armas", 50)]
    assert t.get("agrupar", "function")(v) == {"armas": 80, "magia": 5}
`,
    },
    review: "Repasa el patrón de conteo con `.get(clave, 0) + 1`.",
    xp: 55,
    coins: 8,
  },
  {
    id: "py-funciones",
    world: "w1",
    zone: "Funciones",
    title: "Forjar hechizos propios: funciones",
    kind: "lesson",
    difficulty: 2,
    skills: ["funciones"],
    requires: ["py-dicts"],
    story: "Repetir el mismo hechizo línea a línea cansa. Los magos sabios lo encapsulan en una función con nombre.",
    objective: "Definir funciones con parámetros y valores de retorno, y distinguir `return` de `print`.",
    before: ["Variables", "Condicionales", "Bucles"],
    intuition: [
      "Una **función** agrupa código reutilizable bajo un nombre:",
      "",
      "```python",
      "def area_rectangulo(base, altura):",
      "    return base * altura",
      "```",
      "",
      "- Los **parámetros** (`base`, `altura`) reciben valores al llamarla: `area_rectangulo(3, 4)`.",
      "- `return` **devuelve** un valor al código que la llamó y termina la función.",
      "- `print` solo **muestra** texto; una función sin `return` devuelve `None`.",
      "",
      "Funciones pequeñas con un propósito claro hacen los programas fáciles de probar.",
    ],
    example: {
      code: py`def descuento(precio, porcentaje=10):
    return precio * (1 - porcentaje / 100)

total = descuento(80) + descuento(50, 20)
print(total)`,
      lines: ["Define la función con un parámetro con valor por defecto.", "Devuelve el precio rebajado.", "Llama dos veces: 72.0 + 40.0.", "Muestra 112.0."],
    },
    challenge: [
      "Escribe estas funciones:",
      "1. `es_primo(n)`: devuelve `True` si n es primo (n ≥ 2 sin divisores entre 2 y √n).",
      "2. `primos_hasta(n)`: devuelve la lista de primos ≤ n **usando** `es_primo`.",
      "Las funciones deben **devolver** valores, no imprimirlos.",
    ],
    starter: py`def es_primo(n):
    for d in range(2, n):
        if n % d == 0:
            print("no es primo")
    print("es primo")

def primos_hasta(n):
    pass`,
    solution: py`def es_primo(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True

def primos_hasta(n):
    return [k for k in range(2, n + 1) if es_primo(k)]`,
    tests: py`
def test_es_primo():
    "Detecta primos y no primos (incluidos 0, 1 y 2)"
    f = t.get("es_primo", "function")
    for n, esperado in [(0, False), (1, False), (2, True), (9, False), (13, True), (97, True), (91, False)]:
        r, salida = t.call("es_primo", n)
        assert r is esperado, f"es_primo({n}) devolvió {r!r}; esperaba {esperado}"

def test_devuelve_no_imprime():
    "es_primo devuelve un valor en lugar de imprimirlo"
    r, salida = t.call("es_primo", 7)
    assert salida == "", "es_primo imprime texto: usa return"

def test_primos_hasta():
    "primos_hasta(30)"
    assert t.get("primos_hasta", "function")(30) == [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]

def test_rapido():
    "es_primo es eficiente (solo hasta √n)"
    import time
    t0 = time.time()
    assert t.get("es_primo")(1_000_000_007)
    assert time.time() - t0 < 2, "Comprueba divisores solo hasta la raíz cuadrada"
`,
    hints: [
      "Usa `return False` en cuanto encuentres un divisor; si terminas el bucle, `return True`.",
      "Basta con probar divisores d mientras `d * d <= n`.",
      "`primos_hasta` puede recorrer `range(2, n + 1)` y llamar a `es_primo` en cada número.",
    ],
    errors: [
      { error: "La función devuelve None", fix: "Si solo usas print, la función no devuelve nada. Añade return con el valor." },
      { error: "Programa lento con números grandes", fix: "No hace falta probar hasta n: si n tiene un divisor mayor que √n, también tiene uno menor." },
    ],
    quiz: {
      question: "¿Qué valor guarda `r` tras `def f(x): print(x * 2)` y `r = f(5)`?",
      options: [
        { text: "None" },
        { text: "10", misconception: "print-vs-return" },
        { text: "\"10\"", misconception: "print-vs-return" },
        { text: "Error" },
      ],
      answer: 0,
      explanation: "La función muestra 10 en la consola pero no tiene return, así que devuelve None.",
    },
    advanced: {
      title: "Máximo común divisor (Euclides)",
      prompt: "Escribe `mcd(a, b)` con el algoritmo de Euclides: mientras b ≠ 0, (a, b) = (b, a % b).",
      starter: py`def mcd(a, b):
    return min(a, b)`,
      solution: py`def mcd(a, b):
    while b:
        a, b = b, a % b
    return a`,
      tests: py`
def test_mcd():
    "mcd correcto"
    f = t.get("mcd", "function")
    assert f(48, 18) == 6 and f(17, 5) == 1 and f(10, 0) == 10
`,
    },
    review: "Repasa la diferencia entre devolver (`return`) y mostrar (`print`).",
    xp: 60,
    coins: 9,
  },
  {
    id: "py-ambito",
    world: "w1",
    zone: "Funciones",
    title: "Fronteras mágicas: ámbito y argumentos",
    kind: "lesson",
    difficulty: 3,
    skills: ["funciones", "ambito"],
    requires: ["py-funciones"],
    story: "Cada torre del bosque tiene su propio territorio. Lo que pasa dentro de una función se queda dentro… casi siempre.",
    objective: "Entender variables locales y globales, argumentos por nombre, valores por defecto y la trampa de los valores por defecto mutables.",
    before: ["Funciones", "Listas"],
    intuition: [
      "Las variables creadas dentro de una función son **locales**: nacen al llamarla y desaparecen al terminar. Una función puede **leer** variables globales, pero si les asigna un valor crea una local nueva.",
      "",
      "La forma limpia de comunicar datos: **entrar por parámetros y salir por return**.",
      "",
      "Argumentos por nombre: `crear(nombre=\"Ada\", nivel=3)`.",
      "",
      "**Trampa clásica:** `def f(x, lista=[])` comparte la misma lista entre llamadas, porque el valor por defecto se crea una sola vez. Usa `lista=None` y crea la lista dentro.",
    ],
    example: {
      code: py`nivel = 1

def subir(nivel):
    nivel = nivel + 1
    return nivel

print(subir(nivel), nivel)`,
      lines: ["Variable global.", "El parámetro nivel es local: tapa a la global.", "Cambia solo la copia local.", "Devuelve 2.", "Muestra 2 1: la global no cambió."],
    },
    challenge: [
      "Esta función tiene el error del valor por defecto mutable:",
      "```python",
      "def registrar(evento, historial=[]):",
      "    historial.append(evento)",
      "    return historial",
      "```",
      "Corrígela para que cada llamada sin historial empiece con una lista vacía nueva, pero si se pasa un historial se añada a él.",
      "Además, escribe `crear_heroe(nombre, clase=\"exploradora\", nivel=1)` que devuelva un diccionario con esas tres claves.",
    ],
    starter: py`def registrar(evento, historial=[]):
    historial.append(evento)
    return historial

def crear_heroe(nombre, clase, nivel):
    pass`,
    solution: py`def registrar(evento, historial=None):
    if historial is None:
        historial = []
    historial.append(evento)
    return historial

def crear_heroe(nombre, clase="exploradora", nivel=1):
    return {"nombre": nombre, "clase": clase, "nivel": nivel}`,
    tests: py`
def test_independientes():
    "Dos llamadas sin historial no comparten lista"
    f = t.get("registrar", "function")
    a = f("inicio")
    b = f("otro")
    assert a == ["inicio"] and b == ["otro"], f"Obtuviste {a} y {b}: la lista se comparte"

def test_con_historial():
    "Si se pasa un historial, se añade a él"
    h = ["a"]
    r = t.get("registrar")("b", h)
    assert r is h and h == ["a", "b"]

def test_heroe_defectos():
    "crear_heroe usa valores por defecto"
    assert t.get("crear_heroe", "function")("Ada") == {"nombre": "Ada", "clase": "exploradora", "nivel": 1}

def test_heroe_por_nombre():
    "Acepta argumentos por nombre"
    assert t.get("crear_heroe")("Lin", nivel=4) == {"nombre": "Lin", "clase": "exploradora", "nivel": 4}
`,
    hints: [
      "Usa `historial=None` como valor por defecto.",
      "Dentro: `if historial is None: historial = []`.",
      "Para los valores por defecto de crear_heroe escribe `clase=\"exploradora\", nivel=1` en la definición.",
    ],
    errors: [
      { error: "UnboundLocalError: local variable referenced before assignment", fix: "Asignas a una variable dentro de la función que también lees antes. Pásala como parámetro y devuélvela." },
      { error: "La lista por defecto «recuerda» llamadas anteriores", fix: "Nunca uses [] o {} como valor por defecto; usa None." },
    ],
    quiz: {
      question: "¿Qué muestra este código?\n\nx = 5\ndef f():\n    x = 10\nf()\nprint(x)",
      options: [{ text: "5" }, { text: "10", misconception: "mutabilidad" }, { text: "Error" }, { text: "None" }],
      answer: 0,
      explanation: "La asignación dentro de f crea una variable local x. La global no cambia.",
    },
    advanced: {
      title: "Funciones con *args y **kwargs",
      prompt: "Escribe `resumen(*numeros, redondeo=2)` que devuelva la media redondeada a `redondeo` decimales, o None si no hay números.",
      starter: py`def resumen(numeros):
    return sum(numeros) / len(numeros)`,
      solution: py`def resumen(*numeros, redondeo=2):
    if not numeros:
        return None
    return round(sum(numeros) / len(numeros), redondeo)`,
      tests: py`
def test_args():
    "Acepta número variable de argumentos"
    f = t.get("resumen", "function")
    assert f(1, 2, 2) == 1.67 and f(1, 2, 2, redondeo=0) == 2 and f() is None
`,
    },
    review: "Repasa por qué no se usan listas como valores por defecto.",
    xp: 60,
    coins: 9,
  },
  {
    id: "py-comprension",
    world: "w1",
    zone: "Funciones",
    title: "Hechizos de una línea: comprensiones",
    kind: "lesson",
    difficulty: 3,
    skills: ["listas", "comprension"],
    requires: ["py-ambito"],
    story: "Los magos veteranos transforman colecciones enteras con un solo gesto: las comprensiones.",
    objective: "Crear listas, diccionarios y conjuntos con comprensiones, con transformación y filtro.",
    before: ["Bucles for", "Listas", "Diccionarios"],
    intuition: [
      "Una **comprensión de lista** construye una lista a partir de otra en una sola expresión:",
      "",
      "```python",
      "cuadrados = [x ** 2 for x in range(5)]          # [0, 1, 4, 9, 16]",
      "pares = [x for x in datos if x % 2 == 0]         # filtra",
      "```",
      "",
      "Se lee: «x al cuadrado **para cada** x en range(5)». También existen para diccionarios `{k: v for ...}` y conjuntos `{x for ...}`.",
      "",
      "Úsalas cuando la transformación sea simple; si necesitas varias líneas de lógica, un bucle normal es más legible.",
    ],
    example: {
      code: py`notas = {"ana": 8.5, "luis": 4.0, "eva": 6.5}
aprobados = [n for n, v in notas.items() if v >= 5]
en_porcentaje = {n: v * 10 for n, v in notas.items()}
print(aprobados)
print(en_porcentaje)`,
      lines: ["Notas por estudiante.", "Nombres con nota ≥ 5.", "Diccionario con las notas en escala 0–100.", "['ana', 'eva']", "{'ana': 85.0, 'luis': 40.0, 'eva': 65.0}"],
    },
    challenge: [
      "Con una lista de registros `(nombre, edad, ciudad)`:",
      "1. `mayores(registros)`: nombres de quienes tienen 18 años o más, en el orden original.",
      "2. `por_ciudad(registros)`: diccionario ciudad → lista de nombres.",
      "3. `edades_normalizadas(registros)`: lista de edades escaladas a [0, 1] con (edad − mín) / (máx − mín).",
      "Usa comprensiones en 1 y 3.",
    ],
    starter: py`def mayores(registros):
    return [r for r in registros]

def por_ciudad(registros):
    return {}

def edades_normalizadas(registros):
    return []`,
    solution: py`def mayores(registros):
    return [n for n, e, c in registros if e >= 18]

def por_ciudad(registros):
    grupos = {}
    for n, e, c in registros:
        grupos.setdefault(c, []).append(n)
    return grupos

def edades_normalizadas(registros):
    edades = [e for _, e, _ in registros]
    lo, hi = min(edades), max(edades)
    return [(e - lo) / (hi - lo) for e in edades]`,
    tests: py`
R = [("Ana", 17, "Lima"), ("Luis", 30, "Quito"), ("Eva", 18, "Lima"), ("Tom", 50, "Cusco")]

def test_mayores():
    "Filtra mayores de edad"
    assert t.get("mayores", "function")(R) == ["Luis", "Eva", "Tom"]

def test_por_ciudad():
    "Agrupa por ciudad"
    assert t.get("por_ciudad", "function")(R) == {"Lima": ["Ana", "Eva"], "Quito": ["Luis"], "Cusco": ["Tom"]}

def test_normalizar():
    "Escala min-max"
    r = t.get("edades_normalizadas", "function")(R)
    esperado = [0.0, 13 / 33, 1 / 33, 1.0]
    assert all(approx(a, b) for a, b in zip(r, esperado)) and len(r) == 4, f"Obtuviste {r}"

def test_usa_comprension():
    "Usa comprensiones de lista"
    assert t.uses("ListComp")
`,
    hints: [
      "Desempaqueta la tupla dentro de la comprensión: `for n, e, c in registros`.",
      "Para agrupar, `diccionario.setdefault(clave, []).append(valor)` crea la lista si no existe.",
      "Calcula mín y máx una sola vez antes de la comprensión.",
    ],
    errors: [
      { error: "Comprensiones ilegibles de varias condiciones", fix: "Si no cabe cómodamente en una línea, usa un bucle normal." },
      { error: "ZeroDivisionError al normalizar", fix: "Si todas las edades son iguales, máx − mín es 0. Decide qué devolver en ese caso." },
    ],
    quiz: {
      question: "¿Qué produce `[c.upper() for c in \"ab\" if c != \"b\"]`?",
      options: [{ text: "['A']" }, { text: "['A', 'B']" }, { text: "'A'" }, { text: "['a']" }],
      answer: 0,
      explanation: "Recorre 'a' y 'b', filtra la 'b' y transforma la 'a' en mayúscula.",
    },
    advanced: {
      title: "Matriz traspuesta",
      prompt: "Escribe `traspuesta(m)` con una comprensión anidada. `traspuesta([[1, 2, 3], [4, 5, 6]])` → `[[1, 4], [2, 5], [3, 6]]`.",
      starter: py`def traspuesta(m):
    return m`,
      solution: py`def traspuesta(m):
    return [[fila[j] for fila in m] for j in range(len(m[0]))]`,
      tests: py`
def test_t():
    "Traspuesta correcta"
    assert t.get("traspuesta", "function")([[1, 2, 3], [4, 5, 6]]) == [[1, 4], [2, 5], [3, 6]]
`,
    },
    review: "Repasa la estructura [expresión for elemento in colección if condición].",
    xp: 60,
    coins: 9,
  },
  {
    id: "py-errores",
    world: "w1",
    zone: "Errores y módulos",
    title: "Escudos contra el caos: excepciones",
    kind: "lesson",
    difficulty: 3,
    skills: ["errores"],
    requires: ["py-comprension"],
    story: "Los datos del mundo real llegan rotos: textos donde esperabas números, divisiones entre cero, archivos que no existen. Un buen programa no se derrumba.",
    objective: "Capturar excepciones con `try/except/else/finally`, lanzar errores con `raise` y validar entradas.",
    before: ["Funciones", "Conversión de tipos"],
    intuition: [
      "Cuando algo falla, Python lanza una **excepción** (`ValueError`, `ZeroDivisionError`…). Si nadie la captura, el programa se detiene.",
      "",
      "```python",
      "try:",
      "    edad = int(texto)",
      "except ValueError:",
      "    edad = None",
      "```",
      "",
      "- Captura solo los errores que **esperas** y sabes manejar; un `except:` desnudo esconde fallos reales.",
      "- `raise ValueError(\"mensaje\")` lanza un error propio cuando una entrada no es válida.",
      "- `finally` se ejecuta siempre (útil para cerrar recursos).",
    ],
    example: {
      code: py`def dividir(a, b):
    try:
        resultado = a / b
    except ZeroDivisionError:
        return float("inf")
    else:
        return round(resultado, 2)

print(dividir(7, 2), dividir(1, 0))`,
      lines: ["Define una división segura.", "Intenta…", "…la operación que puede fallar.", "Si b es 0…", "…devuelve infinito en lugar de detenerse.", "Si no hubo error…", "…devuelve el resultado redondeado.", "Muestra 3.5 inf."],
    },
    challenge: [
      "Escribe `limpiar_edades(textos)` que reciba una lista de textos y devuelva una tupla `(validas, errores)`:",
      "- `validas`: lista de edades enteras entre 0 y 120",
      "- `errores`: número de textos que no son enteros o están fuera de rango",
      "Además escribe `edad_segura(texto)` que devuelva el entero o **lance** `ValueError` con un mensaje si no es válido (no numérico o fuera de 0–120). `limpiar_edades` debe usar `edad_segura`.",
    ],
    starter: py`def edad_segura(texto):
    return int(texto)

def limpiar_edades(textos):
    validas = [edad_segura(x) for x in textos]
    return validas, 0`,
    solution: py`def edad_segura(texto):
    try:
        edad = int(texto.strip())
    except ValueError:
        raise ValueError(f"'{texto}' no es un número entero")
    if not 0 <= edad <= 120:
        raise ValueError(f"{edad} está fuera del rango 0-120")
    return edad

def limpiar_edades(textos):
    validas, errores = [], 0
    for x in textos:
        try:
            validas.append(edad_segura(x))
        except ValueError:
            errores += 1
    return validas, errores`,
    tests: py`
def test_limpiar():
    "Separa edades válidas y cuenta errores"
    r = t.get("limpiar_edades", "function")(["34", " 7 ", "abc", "-3", "130", "120", "4.5"])
    assert r == ([34, 7, 120], 4), f"Obtuviste {r}"

def test_raise():
    "edad_segura lanza ValueError con mensaje"
    f = t.get("edad_segura", "function")
    for malo in ["hola", "200", "-1"]:
        try:
            f(malo)
        except ValueError as e:
            assert str(e), "El ValueError debería llevar un mensaje"
        else:
            assert False, f"edad_segura({malo!r}) no lanzó ValueError"

def test_valida():
    "edad_segura devuelve el entero"
    assert t.get("edad_segura")("42") == 42
`,
    hints: [
      "En `edad_segura`, envuelve `int(...)` en try/except ValueError y relanza con `raise ValueError(\"...\")`.",
      "Comprueba el rango con `0 <= edad <= 120` después de convertir.",
      "En `limpiar_edades`, llama a `edad_segura` dentro de un try y suma 1 a errores en el except.",
    ],
    errors: [
      { error: "except: sin tipo", fix: "Captura excepciones concretas. Un except genérico oculta errores de programación como NameError." },
      { error: "Devolver un texto de error en lugar de lanzar", fix: "Si la función devuelve a veces un número y a veces un mensaje, quien la llama no puede distinguirlos. Lanza una excepción." },
    ],
    quiz: {
      question: "¿Cuándo se ejecuta el bloque `else` de un `try`?",
      options: [
        { text: "Solo si el bloque try terminó sin excepciones" },
        { text: "Siempre, como finally" },
        { text: "Solo si hubo una excepción" },
        { text: "Nunca, es opcional y se ignora" },
      ],
      answer: 0,
      explanation: "else corre si no hubo excepción; finally corre en todos los casos.",
    },
    advanced: {
      title: "Reintentos",
      prompt: "Escribe `con_reintentos(funcion, intentos)` que llame a `funcion()` hasta que no lance excepción y devuelva su resultado. Si falla en todos los intentos, relanza la última excepción.",
      starter: py`def con_reintentos(funcion, intentos):
    return funcion()`,
      solution: py`def con_reintentos(funcion, intentos):
    ultimo = None
    for _ in range(intentos):
        try:
            return funcion()
        except Exception as e:
            ultimo = e
    raise ultimo`,
      tests: py`
def test_reintentos():
    "Reintenta y relanza"
    f = t.get("con_reintentos", "function")
    estado = {"n": 0}
    def inestable():
        estado["n"] += 1
        if estado["n"] < 3:
            raise ConnectionError("caído")
        return "ok"
    assert f(inestable, 5) == "ok" and estado["n"] == 3
    def siempre_falla():
        raise TimeoutError("nunca")
    try:
        f(siempre_falla, 2)
    except TimeoutError:
        return
    assert False, "Debía relanzar TimeoutError"
`,
    },
    review: "Repasa cuándo capturar una excepción y cuándo lanzarla.",
    xp: 65,
    coins: 10,
  },
  {
    id: "py-modulos",
    world: "w1",
    zone: "Errores y módulos",
    title: "La biblioteca del gremio: módulos",
    kind: "lesson",
    difficulty: 2,
    skills: ["modulos"],
    requires: ["py-errores"],
    story: "No hace falta inventar cada hechizo: la biblioteca del gremio guarda miles listos para usar.",
    objective: "Importar módulos de la biblioteca estándar (`math`, `random`, `statistics`, `collections`) y usar semillas para resultados reproducibles.",
    before: ["Funciones"],
    intuition: [
      "Un **módulo** es un archivo de Python con funciones reutilizables. Se importa con `import`:",
      "",
      "- `import math` → `math.sqrt(16)`, `math.pi`, `math.log(x)`",
      "- `from statistics import mean, median`",
      "- `import random` → `random.randint(1, 6)`, `random.choice(lista)`",
      "- `from collections import Counter` → cuenta frecuencias",
      "",
      "Los números aleatorios del ordenador son **pseudoaleatorios**: con `random.seed(42)` obtienes la misma secuencia cada vez, lo que hace los experimentos **reproducibles**.",
    ],
    example: {
      code: py`import math
import random
from collections import Counter

random.seed(7)
tiradas = [random.randint(1, 6) for _ in range(12)]
print(tiradas)
print(Counter(tiradas).most_common(2))
print(math.sqrt(2), math.comb(5, 2))`,
      lines: ["Funciones matemáticas.", "Números pseudoaleatorios.", "Contador de frecuencias.", "Fija la semilla: el resultado se repite.", "Doce tiradas de dado.", "Las muestra.", "Las dos caras más frecuentes y sus cuentas.", "Raíz de 2 y combinaciones C(5, 2) = 10."],
    },
    challenge: [
      "Escribe `simular_dados(n, semilla)` que:",
      "1. Fije la semilla con `random.seed(semilla)`.",
      "2. Lance **dos** dados n veces y sume cada par.",
      "3. Devuelva un diccionario suma → proporción de veces (redondeada a 3 decimales), con las claves de 2 a 12 en orden.",
      "Con la misma semilla debe dar siempre el mismo resultado.",
    ],
    starter: py`import random

def simular_dados(n, semilla):
    resultados = {}
    for _ in range(n):
        s = random.randint(1, 12)
        resultados[s] = resultados.get(s, 0) + 1
    return resultados`,
    solution: py`import random
from collections import Counter

def simular_dados(n, semilla):
    random.seed(semilla)
    sumas = Counter(random.randint(1, 6) + random.randint(1, 6) for _ in range(n))
    return {s: round(sumas[s] / n, 3) for s in range(2, 13)}`,
    tests: py`
def test_reproducible():
    "Misma semilla, mismo resultado"
    f = t.get("simular_dados", "function")
    assert f(500, 1) == f(500, 1)

def test_claves():
    "Claves de 2 a 12"
    assert list(t.get("simular_dados")(100, 3).keys()) == list(range(2, 13))

def test_proporciones():
    "Las proporciones suman ≈ 1 y se parecen a las teóricas con n grande"
    r = t.get("simular_dados")(60000, 11)
    assert abs(sum(r.values()) - 1) < 0.01
    assert abs(r[7] - 6 / 36) < 0.01, f"P(7) = {r[7]}; la teórica es 0.167"
    assert abs(r[2] - 1 / 36) < 0.006, "La suma 2 debería salir ~1/36 de las veces"
`,
    hints: [
      "Dos dados no son lo mismo que un número entre 2 y 12: `randint(1, 6) + randint(1, 6)`.",
      "Llama a `random.seed(semilla)` al principio de la función.",
      "Recorre `range(2, 13)` para construir el diccionario en orden, dividiendo cada cuenta entre n.",
    ],
    errors: [
      { error: "NameError: name 'random' is not defined", fix: "Falta `import random` al principio del programa." },
      { error: "Usar randint(2, 12)", fix: "Eso da a todas las sumas la misma probabilidad. Con dos dados, el 7 es seis veces más probable que el 2." },
    ],
    quiz: {
      question: "¿Por qué fijar una semilla en una simulación?",
      options: [
        { text: "Para que otra persona pueda reproducir exactamente los mismos resultados" },
        { text: "Para que los resultados sean más aleatorios" },
        { text: "Para que la simulación sea más rápida" },
        { text: "Para eliminar el error de muestreo" },
      ],
      answer: 0,
      explanation: "La semilla determina la secuencia pseudoaleatoria. No cambia la variabilidad del experimento, solo lo hace reproducible.",
    },
    advanced: {
      title: "Estimar π con Monte Carlo",
      prompt: "Escribe `estimar_pi(n, semilla)`: lanza n puntos uniformes en el cuadrado [0,1]², cuenta los que caen dentro del cuarto de círculo (x² + y² ≤ 1) y devuelve 4 × proporción.",
      starter: py`def estimar_pi(n, semilla):
    return 3`,
      solution: py`import random

def estimar_pi(n, semilla):
    random.seed(semilla)
    dentro = sum(1 for _ in range(n) if random.random() ** 2 + random.random() ** 2 <= 1)
    return 4 * dentro / n`,
      tests: py`
def test_pi():
    "Se acerca a π con n grande"
    v = t.get("estimar_pi", "function")(200000, 5)
    assert abs(v - math.pi) < 0.02, f"Obtuviste {v}"
`,
    },
    review: "Repasa cómo importar módulos y por qué las semillas hacen reproducible una simulación.",
    xp: 60,
    coins: 9,
  },
  {
    id: "py-archivos",
    world: "w1",
    zone: "Archivos y formatos",
    title: "Pergaminos: leer y escribir archivos",
    kind: "lesson",
    difficulty: 3,
    skills: ["archivos"],
    requires: ["py-modulos"],
    story: "El archivero del bosque guarda los registros de cada expedición en pergaminos de texto. Tu tarea es leerlos y escribir un resumen.",
    objective: "Leer y escribir archivos de texto con `open` y `with`, procesando línea a línea.",
    before: ["Cadenas", "Bucles", "Excepciones"],
    intuition: [
      "`open(nombre, modo)` abre un archivo: `\"r\"` leer, `\"w\"` escribir (borra el contenido), `\"a\"` añadir.",
      "",
      "Usa siempre `with`: cierra el archivo aunque haya un error.",
      "",
      "```python",
      "with open(\"notas.txt\", encoding=\"utf-8\") as f:",
      "    for linea in f:",
      "        print(linea.strip())",
      "```",
      "",
      "Cada línea incluye el salto `\\n` al final: `strip()` lo quita. Indica `encoding=\"utf-8\"` para tildes y eñes.",
      "",
      "En esta misión el archivo `expediciones.txt` ya existe en la carpeta de trabajo.",
    ],
    example: {
      code: py`with open("saludo.txt", "w", encoding="utf-8") as f:
    f.write("Hola\n")
    f.write("Bosque\n")
with open("saludo.txt", encoding="utf-8") as f:
    lineas = [l.strip() for l in f]
print(lineas)`,
      lines: ["Abre para escribir (crea el archivo).", "Escribe una línea con su salto.", "Escribe otra.", "Abre para leer.", "Lee todas las líneas sin el salto final.", "['Hola', 'Bosque']"],
    },
    challenge: [
      "El archivo `expediciones.txt` tiene líneas `explorador;distancia_km` (algunas líneas están vacías o mal formadas).",
      "Escribe `resumir(entrada, salida)` que:",
      "1. Lea el archivo `entrada` y sume la distancia por explorador (ignora líneas vacías o inválidas).",
      "2. Escriba en `salida` una línea `explorador: total km` por explorador, ordenados de mayor a menor distancia, con un decimal.",
      "3. Devuelva el número de líneas inválidas ignoradas.",
      "Llama al final a `resumir(\"expediciones.txt\", \"resumen.txt\")` y muestra el contenido de `resumen.txt`.",
    ],
    files: {
      "expediciones.txt": "ana;12.5\nluis;8\n\nana;7.25\neva;20\nluis;tres\nsin_separador\neva;1.5\n",
    },
    starter: py`def resumir(entrada, salida):
    f = open(entrada)
    texto = f.read()
    print(texto)
    return 0

resumir("expediciones.txt", "resumen.txt")`,
    solution: py`def resumir(entrada, salida):
    totales, invalidas = {}, 0
    with open(entrada, encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if not linea:
                continue
            partes = linea.split(";")
            try:
                nombre, km = partes[0], float(partes[1])
            except (IndexError, ValueError):
                invalidas += 1
                continue
            totales[nombre] = totales.get(nombre, 0) + km
    with open(salida, "w", encoding="utf-8") as f:
        for nombre, km in sorted(totales.items(), key=lambda p: p[1], reverse=True):
            f.write(f"{nombre}: {km:.1f} km\n")
    return invalidas

n = resumir("expediciones.txt", "resumen.txt")
print(open("resumen.txt", encoding="utf-8").read())
print("Inválidas:", n)`,
    tests: py`
def test_resumen():
    "resumen.txt tiene los totales ordenados"
    import os
    t.get("resumir", "function")("expediciones.txt", "r2.txt")
    lineas = open("r2.txt", encoding="utf-8").read().strip().splitlines()
    assert lineas == ["eva: 21.5 km", "ana: 19.8 km", "luis: 8.0 km"], f"Contenido: {lineas}"

def test_invalidas():
    "Cuenta 2 líneas inválidas (las vacías no cuentan)"
    assert t.get("resumir")("expediciones.txt", "r3.txt") == 2

def test_otro_archivo():
    "Funciona con otro archivo"
    with open("otra.txt", "w", encoding="utf-8") as f:
        f.write("zoe;1\nzoe;2\nmax;10\n")
    assert t.get("resumir")("otra.txt", "r4.txt") == 0
    assert open("r4.txt", encoding="utf-8").read().splitlines() == ["max: 10.0 km", "zoe: 3.0 km"]
`,
    hints: [
      "Recorre el archivo con `for linea in f:` dentro de un `with`, y haz `linea.strip()`.",
      "`partes = linea.split(\";\")`: si falta el `;`, `partes[1]` lanza IndexError; si no es número, `float` lanza ValueError.",
      "Ordena con `sorted(totales.items(), key=lambda p: p[1], reverse=True)` y escribe con `f\"{nombre}: {km:.1f} km\\n\"`.",
    ],
    errors: [
      { error: "FileNotFoundError", fix: "Revisa el nombre exacto del archivo. En el navegador solo existen los archivos de la misión y los que tú crees." },
      { error: "Las líneas salen con '\\n' pegado", fix: "Cada línea leída termina en salto de línea: usa .strip()." },
    ],
    quiz: {
      question: "¿Qué hace abrir un archivo existente con modo \"w\"?",
      options: [
        { text: "Borra su contenido y empieza a escribir desde cero" },
        { text: "Añade al final del contenido actual" },
        { text: "Lo abre solo para lectura" },
        { text: "Lanza un error porque ya existe" },
      ],
      answer: 0,
      explanation: "\"w\" trunca el archivo. Para añadir sin borrar usa \"a\".",
    },
    advanced: {
      title: "Contar palabras de un texto",
      prompt: "Escribe `top_palabras(nombre, n)` que lea un archivo y devuelva las n palabras más frecuentes (minúsculas, solo letras) como lista de tuplas (palabra, cuenta). Prueba con `expediciones.txt` o crea tu archivo.",
      starter: py`def top_palabras(nombre, n):
    return []`,
      solution: py`import re
from collections import Counter

def top_palabras(nombre, n):
    with open(nombre, encoding="utf-8") as f:
        palabras = re.findall(r"[a-záéíóúñü]+", f.read().lower())
    return Counter(palabras).most_common(n)`,
      tests: py`
def test_top():
    "Palabras más frecuentes"
    with open("t.txt", "w", encoding="utf-8") as f:
        f.write("El sol y el mar. EL SOL brilla.")
    assert t.get("top_palabras", "function")("t.txt", 2) == [("el", 3), ("sol", 2)]
`,
    },
    review: "Repasa por qué usar `with` y los modos r, w y a.",
    xp: 70,
    coins: 10,
  },
  {
    id: "py-json-csv",
    world: "w1",
    zone: "Archivos y formatos",
    title: "Idiomas de los datos: JSON y CSV",
    kind: "lesson",
    difficulty: 3,
    skills: ["archivos", "json", "csv"],
    requires: ["py-archivos"],
    story: "Los mercaderes de la ciudad envían tablas (CSV) y los sabios de la torre, estructuras anidadas (JSON). Debes hablar ambos idiomas.",
    objective: "Leer CSV con `csv.DictReader`, convertir tipos, y leer/escribir JSON con el módulo `json`.",
    before: ["Archivos", "Diccionarios", "Conversión de tipos"],
    intuition: [
      "**CSV**: una tabla en texto, una fila por línea y columnas separadas por comas. `csv.DictReader` convierte cada fila en un diccionario con los nombres de columna como claves. Todo llega como **texto**: convierte los números.",
      "",
      "**JSON**: el formato de intercambio de la web. Sus objetos y listas se corresponden con diccionarios y listas de Python:",
      "",
      "- `json.loads(texto)` / `json.dumps(objeto)` para textos",
      "- `json.load(f)` / `json.dump(objeto, f)` para archivos",
    ],
    example: {
      code: py`import csv, json, io

texto = "nombre,nivel\nAda,3\nLin,5\n"
filas = list(csv.DictReader(io.StringIO(texto)))
print(filas[0])
datos = {"heroes": [{"nombre": f["nombre"], "nivel": int(f["nivel"])} for f in filas]}
print(json.dumps(datos, ensure_ascii=False))`,
      lines: ["Importa los módulos (io permite leer un texto como si fuera archivo).", "Un CSV pequeño en una cadena.", "Cada fila es un diccionario.", "{'nombre': 'Ada', 'nivel': '3'}: el nivel es texto.", "Construye una estructura con niveles enteros.", "La serializa como JSON."],
    },
    challenge: [
      "El archivo `tienda.csv` tiene columnas `producto,categoria,precio,stock`.",
      "Escribe `catalogo(nombre_csv, nombre_json)` que:",
      "1. Lea el CSV, convierta precio a float y stock a int.",
      "2. Construya `{\"categorias\": {categoria: [productos ordenados alfabéticamente]}, \"valor_stock\": suma de precio×stock redondeada a 2}`.",
      "3. Guarde esa estructura en `nombre_json` y la devuelva.",
    ],
    files: {
      "tienda.csv": "producto,categoria,precio,stock\nespada,armas,85.0,3\npoción,consumibles,12.5,40\narco,armas,60.0,2\nmapa,herramientas,20.0,10\nantídoto,consumibles,8.25,12\n",
    },
    starter: py`import csv, json

def catalogo(nombre_csv, nombre_json):
    with open(nombre_csv, encoding="utf-8") as f:
        filas = list(csv.reader(f))
    return {"categorias": {}, "valor_stock": 0}`,
    solution: py`import csv, json

def catalogo(nombre_csv, nombre_json):
    categorias, valor = {}, 0.0
    with open(nombre_csv, encoding="utf-8", newline="") as f:
        for fila in csv.DictReader(f):
            precio, stock = float(fila["precio"]), int(fila["stock"])
            categorias.setdefault(fila["categoria"], []).append(fila["producto"])
            valor += precio * stock
    resultado = {
        "categorias": {c: sorted(p) for c, p in categorias.items()},
        "valor_stock": round(valor, 2),
    }
    with open(nombre_json, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
    return resultado`,
    tests: py`
def test_estructura():
    "Agrupa y calcula el valor del stock"
    r = t.get("catalogo", "function")("tienda.csv", "cat.json")
    assert r["categorias"] == {"armas": ["arco", "espada"], "consumibles": ["antídoto", "poción"], "herramientas": ["mapa"]}, r["categorias"]
    assert approx(r["valor_stock"], 1174.0), f"valor_stock = {r['valor_stock']}"

def test_json_guardado():
    "El JSON guardado se puede volver a leer y coincide"
    import json
    r = t.get("catalogo")("tienda.csv", "cat2.json")
    with open("cat2.json", encoding="utf-8") as f:
        assert json.load(f) == r
`,
    hints: [
      "`csv.DictReader(f)` da diccionarios: `fila[\"precio\"]` es texto, conviértelo con float().",
      "Acumula con `categorias.setdefault(cat, []).append(producto)` y ordena al final.",
      "Guarda con `json.dump(resultado, f, ensure_ascii=False)`.",
    ],
    errors: [
      { error: "TypeError: can't multiply sequence by non-int of type 'str'", fix: "Los valores del CSV son texto. Convierte precio y stock antes de multiplicar." },
      { error: "TypeError: Object of type set is not JSON serializable", fix: "JSON no tiene conjuntos: conviértelos en listas." },
    ],
    quiz: {
      question: "Al leer un CSV con csv.DictReader, ¿de qué tipo es el valor de una columna numérica?",
      options: [
        { text: "str: hay que convertirlo" },
        { text: "int o float, según el número", misconception: "tipos-texto-numero" },
        { text: "Depende del sistema operativo" },
        { text: "bytes" },
      ],
      answer: 0,
      explanation: "El módulo csv no interpreta tipos: todo es texto. pandas, en cambio, sí intenta inferirlos.",
    },
    advanced: {
      title: "Aplanar JSON anidado",
      prompt: "Escribe `aplanar(d)` que convierta `{\"a\": 1, \"b\": {\"c\": 2, \"d\": {\"e\": 3}}}` en `{\"a\": 1, \"b.c\": 2, \"b.d.e\": 3}` (recursivamente).",
      starter: py`def aplanar(d):
    return d`,
      solution: py`def aplanar(d, prefijo=""):
    plano = {}
    for k, v in d.items():
        clave = f"{prefijo}{k}"
        if isinstance(v, dict):
            plano.update(aplanar(v, clave + "."))
        else:
            plano[clave] = v
    return plano`,
      tests: py`
def test_aplanar():
    "Aplana diccionarios anidados"
    assert t.get("aplanar", "function")({"a": 1, "b": {"c": 2, "d": {"e": 3}}}) == {"a": 1, "b.c": 2, "b.d.e": 3}
`,
    },
    review: "Repasa que CSV llega como texto y la correspondencia entre JSON y estructuras de Python.",
    xp: 70,
    coins: 10,
  },
  {
    id: "proj-inventario",
    world: "w1",
    zone: "Proyecto del Bosque",
    title: "Proyecto: sistema de inventario del gremio",
    kind: "project",
    difficulty: 3,
    skills: ["funciones", "diccionarios", "errores", "json"],
    requires: ["py-json-csv"],
    story: [
      "El gremio de exploradores necesita un sistema para controlar su almacén: qué hay, cuánto vale, qué se agota y qué movimientos se hicieron.",
      "Será tu primer programa completo: varias funciones que colaboran, validación de entradas y persistencia en JSON.",
    ],
    objective: "Diseñar e implementar un pequeño sistema con funciones, diccionarios, validación con excepciones y guardado en JSON.",
    before: ["Funciones", "Diccionarios", "Excepciones", "JSON"],
    intuition: [
      "Un programa más grande se construye **descomponiendo** el problema en funciones pequeñas que se pueden probar por separado.",
      "",
      "Representaremos el inventario como un diccionario `nombre → {\"precio\": float, \"cantidad\": int}`. Cada operación es una función que recibe el inventario y lo modifica o consulta. Las entradas inválidas se rechazan con `ValueError`, nunca se aceptan en silencio.",
    ],
    example: {
      code: py`inventario = {}
inventario["cuerda"] = {"precio": 4.5, "cantidad": 10}
inventario["cuerda"]["cantidad"] -= 3
print(inventario)`,
      lines: ["Inventario vacío.", "Un artículo con su precio y cantidad.", "Salida de 3 unidades.", "{'cuerda': {'precio': 4.5, 'cantidad': 7}}"],
    },
    challenge: [
      "Implementa estas funciones (las pruebas evalúan cada etapa):",
      "1. `agregar(inv, nombre, precio, cantidad)`: añade el artículo o suma la cantidad si ya existe (actualizando el precio). Lanza `ValueError` si precio ≤ 0 o cantidad ≤ 0.",
      "2. `retirar(inv, nombre, cantidad)`: resta unidades. Lanza `KeyError` si no existe y `ValueError` si no hay suficientes. Si queda en 0, elimina el artículo.",
      "3. `valor_total(inv)`: suma de precio × cantidad, redondeada a 2 decimales.",
      "4. `bajo_stock(inv, minimo)`: lista ordenada de nombres con cantidad < minimo.",
      "5. `guardar(inv, archivo)` y `cargar(archivo)`: persistencia en JSON; `cargar` de un archivo inexistente devuelve `{}`.",
    ],
    starter: py`import json

def agregar(inv, nombre, precio, cantidad):
    inv[nombre] = {"precio": precio, "cantidad": cantidad}

def retirar(inv, nombre, cantidad):
    inv[nombre]["cantidad"] -= cantidad

def valor_total(inv):
    return 0

def bajo_stock(inv, minimo):
    return []

def guardar(inv, archivo):
    pass

def cargar(archivo):
    return {}`,
    solution: py`import json

def agregar(inv, nombre, precio, cantidad):
    if precio <= 0 or cantidad <= 0:
        raise ValueError("precio y cantidad deben ser positivos")
    if nombre in inv:
        inv[nombre]["cantidad"] += cantidad
        inv[nombre]["precio"] = precio
    else:
        inv[nombre] = {"precio": float(precio), "cantidad": int(cantidad)}

def retirar(inv, nombre, cantidad):
    if nombre not in inv:
        raise KeyError(nombre)
    if cantidad <= 0 or cantidad > inv[nombre]["cantidad"]:
        raise ValueError("cantidad no disponible")
    inv[nombre]["cantidad"] -= cantidad
    if inv[nombre]["cantidad"] == 0:
        del inv[nombre]

def valor_total(inv):
    return round(sum(a["precio"] * a["cantidad"] for a in inv.values()), 2)

def bajo_stock(inv, minimo):
    return sorted(n for n, a in inv.items() if a["cantidad"] < minimo)

def guardar(inv, archivo):
    with open(archivo, "w", encoding="utf-8") as f:
        json.dump(inv, f, ensure_ascii=False)

def cargar(archivo):
    try:
        with open(archivo, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}`,
    tests: py`
def nuevo():
    inv = {}
    t.get("agregar", "function")(inv, "cuerda", 4.5, 10)
    t.get("agregar")(inv, "antorcha", 2.0, 3)
    return inv

def test_etapa1_agregar():
    "Etapa 1: agregar suma cantidades y valida"
    inv = nuevo()
    t.get("agregar")(inv, "cuerda", 5.0, 2)
    assert inv["cuerda"] == {"precio": 5.0, "cantidad": 12}, inv["cuerda"]
    for args in [("x", 0, 1), ("x", 1, 0), ("x", -2, 3)]:
        try:
            t.get("agregar")(inv, *args)
        except ValueError:
            continue
        assert False, f"agregar{args} debía lanzar ValueError"

def test_etapa2_retirar():
    "Etapa 2: retirar valida y elimina al llegar a 0"
    inv = nuevo()
    r = t.get("retirar", "function")
    r(inv, "antorcha", 3)
    assert "antorcha" not in inv
    try:
        r(inv, "cuerda", 99)
    except ValueError:
        pass
    else:
        assert False, "Retirar más de lo disponible debía lanzar ValueError"
    try:
        r(inv, "dragón", 1)
    except KeyError:
        pass
    else:
        assert False, "Retirar un artículo inexistente debía lanzar KeyError"
    assert inv["cuerda"]["cantidad"] == 10, "Un intento fallido no debe cambiar el inventario"

def test_etapa3_valor():
    "Etapa 3: valor total"
    assert t.get("valor_total", "function")(nuevo()) == 51.0

def test_etapa4_bajo_stock():
    "Etapa 4: artículos con poco stock"
    assert t.get("bajo_stock", "function")(nuevo(), 5) == ["antorcha"]

def test_etapa5_persistencia():
    "Etapa 5: guardar y cargar en JSON"
    inv = nuevo()
    t.get("guardar", "function")(inv, "inv.json")
    assert t.get("cargar", "function")("inv.json") == inv
    assert t.get("cargar")("no_existe.json") == {}
`,
    hints: [
      "Valida al principio de cada función y lanza la excepción antes de modificar nada.",
      "En `retirar`, comprueba primero que el artículo existe (`if nombre not in inv: raise KeyError(nombre)`).",
      "Para `cargar`, captura `FileNotFoundError` y devuelve `{}`.",
    ],
    errors: [
      { error: "Modificar el inventario antes de validar", fix: "Si validas después de restar, un error deja el inventario en un estado incorrecto. Valida primero." },
      { error: "Las claves numéricas cambian al cargar JSON", fix: "JSON solo admite claves de texto. Aquí los nombres ya son texto, pero tenlo presente." },
    ],
    quiz: {
      question: "¿Por qué `retirar` lanza una excepción en vez de devolver False cuando no hay stock suficiente?",
      options: [
        { text: "Porque así el error no puede pasar desapercibido: quien llama debe manejarlo explícitamente" },
        { text: "Porque las funciones no pueden devolver booleanos" },
        { text: "Porque las excepciones son más rápidas" },
        { text: "No hay diferencia, es una cuestión de estilo" },
      ],
      answer: 0,
      explanation: "Un False devuelto puede ignorarse sin querer; una excepción detiene el flujo hasta que alguien decida qué hacer.",
    },
    review: "Repasa cómo descomponer un problema en funciones pequeñas que se prueban por separado.",
    project: {
      requirements: ["Funciones independientes para cada operación", "Validación con excepciones", "Persistencia en JSON", "Sin variables globales mutables"],
      dataset: "Inventario creado por el propio programa (sin datos externos).",
      stages: ["Agregar artículos con validación", "Retirar unidades de forma segura", "Calcular el valor del inventario", "Detectar bajo stock", "Guardar y cargar en JSON"],
      criteria: ["Las cinco etapas pasan sus pruebas", "Un intento inválido no modifica el inventario", "El JSON guardado se puede volver a cargar sin pérdidas"],
      extensions: ["Registrar un historial de movimientos con fecha", "Exportar un informe CSV", "Añadir categorías y valor por categoría", "Una interfaz de texto con input()"],
      portfolio: "Sistema de inventario en Python con validación de entradas, pruebas por etapas y persistencia en JSON.",
    },
    xp: 200,
    coins: 40,
  },
];
