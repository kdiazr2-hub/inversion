import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 1: un juego de preguntas en Python puro. Empieza con diccionarios
// y funciones, valida un banco de preguntas en JSON, juega partidas reproducibles con puntuación
// por rachas y termina con un sistema de repaso por cajas (Leitner) cuyo ahorro se mide.

const SERIES = { id: "juego-preguntas", title: "Proyecto progresivo: el juego de preguntas del Bosque", of: 4 };

const BANCO: Record<string, unknown>[] = [
  {"id": "py1", "tema": "python", "pregunta": "¿Qué función muestra texto en pantalla?", "opciones": ["input", "print", "len"], "correcta": 1},
  {"id": "py2", "tema": "python", "pregunta": "¿Cuál es el índice del primer elemento de una lista?", "opciones": ["0", "1", "-1"], "correcta": 0},
  {"id": "py3", "tema": "python", "pregunta": "¿Qué tipo tiene el valor 3.0?", "opciones": ["int", "float", "str"], "correcta": 1},
  {"id": "py4", "tema": "python", "pregunta": "¿Qué devuelve len(\"hola\")?", "opciones": ["3", "4", "5"], "correcta": 1},
  {"id": "py5", "tema": "python", "pregunta": "¿Qué estructura guarda pares clave-valor?", "opciones": ["lista", "tupla", "diccionario", "conjunto"], "correcta": 2},
  {"id": "py6", "tema": "python", "pregunta": "¿Qué palabra define una función?", "opciones": ["func", "def", "function"], "correcta": 1},
  {"id": "ma1", "tema": "matemáticas", "pregunta": "¿Cuánto es 2 elevado a 10?", "opciones": ["100", "1024", "512", "20"], "correcta": 1},
  {"id": "ma2", "tema": "matemáticas", "pregunta": "¿Cuál es la raíz cuadrada de 81?", "opciones": ["9", "8", "18"], "correcta": 0},
  {"id": "ma3", "tema": "matemáticas", "pregunta": "¿Cuánto es el 25 % de 80?", "opciones": ["20", "25", "40"], "correcta": 0},
  {"id": "ma4", "tema": "matemáticas", "pregunta": "¿Cuál es la media de 2, 4 y 9?", "opciones": ["4", "5", "6"], "correcta": 1},
  {"id": "ma5", "tema": "matemáticas", "pregunta": "¿Cuántos resultados posibles hay al lanzar dos dados?", "opciones": ["12", "36", "21"], "correcta": 1},
  {"id": "es1", "tema": "estadística", "pregunta": "¿Qué medida no cambia si el dato más alto se multiplica por 100?", "opciones": ["media", "mediana", "rango"], "correcta": 1},
  {"id": "es2", "tema": "estadística", "pregunta": "Si lanzas una moneda justa, ¿cuál es la probabilidad de cara?", "opciones": ["0,25", "0,5", "1"], "correcta": 1},
  {"id": "es3", "tema": "estadística", "pregunta": "¿Qué gráfico muestra la distribución de una variable numérica?", "opciones": ["histograma", "tarta", "mapa"], "correcta": 0},
  {"id": "mal1", "tema": "python", "pregunta": "¿Cuánto es 1 + 1?", "opciones": ["2"], "correcta": 0},
  {"id": "mal2", "tema": "python", "opciones": ["sí", "no"], "correcta": 0},
  {"id": "mal3", "tema": "matemáticas", "pregunta": "¿Cuánto es 3 × 3?", "opciones": ["9", "6"], "correcta": 2},
  {"id": "py1", "tema": "python", "pregunta": "Pregunta repetida", "opciones": ["a", "b"], "correcta": 0},
  {"id": "mal4", "tema": "python", "pregunta": "¿Opciones repetidas?", "opciones": ["Sí", "sí", "no"], "correcta": 0},
];

const FILES = { "banco.json": JSON.stringify(BANCO, null, 2) + "\n" };

const SPEC: ProjectSpec = {
  requirements: [
    "Representar cada pregunta como un diccionario y mostrarla con una función que devuelve texto (no que lo imprime).",
    "Aceptar como respuesta el número de la opción o su texto, sin distinguir mayúsculas ni tildes.",
    "Cargar el banco desde JSON descartando, con un mensaje claro, las preguntas mal formadas.",
    "Jugar partidas reproducibles (semilla) con opciones barajadas y puntuación por rachas.",
    "Repasar con cajas de Leitner y medir cuántos repasos ahorra frente a repasarlo todo.",
  ],
  dataset: "banco.json: 19 preguntas de Python, matemáticas y estadística escritas para el juego; 5 tienen errores a propósito.",
  stages: ["Preguntas, respuestas y corrección", "El banco de preguntas en JSON", "Partidas con semilla, barajado y rachas", "Repaso inteligente con cajas de Leitner"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Ninguna función de cálculo imprime: devuelven valores que otra parte del programa muestra.",
    "Una pregunta mal formada nunca rompe el juego: se descarta y se explica por qué.",
    "Con la misma semilla, la partida es idéntica.",
  ],
  extensions: [
    "Un modo interactivo con input() que use todas las funciones.",
    "Guardar las cajas de Leitner en un archivo JSON para continuar otro día.",
    "Preguntas de respuesta numérica con tolerancia (por ejemplo, 3,14 ≈ π).",
  ],
  portfolio: "Juego de preguntas en Python: banco en JSON validado, corrección tolerante a mayúsculas y tildes, partidas reproducibles con opciones barajadas y puntuación por rachas, y repaso espaciado con cajas de Leitner que reduce los repasos a menos de la mitad.",
};

const S1 = py`PREGUNTAS = [
    {"id": "py1", "tema": "python", "pregunta": "¿Qué función muestra texto en pantalla?", "opciones": ["input", "print", "len"], "correcta": 1},
    {"id": "py2", "tema": "python", "pregunta": "¿Cuál es el índice del primer elemento de una lista?", "opciones": ["0", "1", "-1"], "correcta": 0},
    {"id": "ma1", "tema": "matemáticas", "pregunta": "¿Cuánto es 2 elevado a 10?", "opciones": ["100", "1024", "512", "20"], "correcta": 1},
    {"id": "ma2", "tema": "matemáticas", "pregunta": "¿Cuál es la raíz cuadrada de 81?", "opciones": ["9", "8", "18"], "correcta": 0},
]

TILDES = str.maketrans("áéíóúü", "aeiouu")


def normalizar(texto):
    return " ".join(str(texto).strip().lower().translate(TILDES).split())


def es_correcta(pregunta, respuesta):
    respuesta = normalizar(respuesta)
    if respuesta.isdigit() and 1 <= int(respuesta) <= len(pregunta["opciones"]):
        return int(respuesta) - 1 == pregunta["correcta"]
    return respuesta == normalizar(pregunta["opciones"][pregunta["correcta"]])


def mostrar(pregunta, numero):
    lineas = [f"{numero}. {pregunta['pregunta']}"]
    for i, opcion in enumerate(pregunta["opciones"], start=1):
        lineas.append(f"   {i}) {opcion}")
    return "\n".join(lineas)


print(mostrar(PREGUNTAS[0], 1))
print(es_correcta(PREGUNTAS[0], "2"), es_correcta(PREGUNTAS[0], "  PRINT "), es_correcta(PREGUNTAS[3], "8"))`;

const S2 = py`import json

CAMPOS = ("id", "tema", "pregunta", "opciones", "correcta")


def validar(pregunta):
    problemas = [f"falta el campo {campo}" for campo in CAMPOS if campo not in pregunta]
    if problemas:
        return problemas
    opciones = pregunta["opciones"]
    if not isinstance(opciones, list) or len(opciones) < 2:
        problemas.append("necesita al menos 2 opciones")
    elif len({normalizar(o) for o in opciones}) != len(opciones):
        problemas.append("tiene opciones repetidas")
    correcta = pregunta["correcta"]
    if not isinstance(correcta, int) or not 0 <= correcta < len(opciones):
        problemas.append("la respuesta correcta no es una de las opciones")
    return problemas


def cargar_banco(texto):
    banco, errores, vistos = [], [], set()
    for posicion, pregunta in enumerate(json.loads(texto)):
        problemas = validar(pregunta)
        if not problemas and pregunta["id"] in vistos:
            problemas = ["id repetido"]
        if problemas:
            errores.append(f"pregunta {posicion} ({pregunta.get('id', '?')}): {'; '.join(problemas)}")
        else:
            vistos.add(pregunta["id"])
            banco.append(pregunta)
    return banco, errores


def por_tema(banco):
    conteo = {}
    for pregunta in banco:
        conteo[pregunta["tema"]] = conteo.get(pregunta["tema"], 0) + 1
    return conteo


with open("banco.json", encoding="utf-8") as archivo:
    banco, errores = cargar_banco(archivo.read())`;

const S3 = py`import random


def barajar_opciones(pregunta, rng):
    orden = list(range(len(pregunta["opciones"])))
    rng.shuffle(orden)
    nueva = dict(pregunta)
    nueva["opciones"] = [pregunta["opciones"][i] for i in orden]
    nueva["correcta"] = orden.index(pregunta["correcta"])
    return nueva


def elegir(banco, n, semilla=0, tema=None):
    candidatas = [p for p in banco if tema is None or p["tema"] == tema]
    rng = random.Random(semilla)
    elegidas = rng.sample(candidatas, min(n, len(candidatas)))
    return [barajar_opciones(p, rng) for p in elegidas]


def jugar(preguntas, respuestas):
    puntos, racha, mejor_racha, detalle = 0, 0, 0, []
    for pregunta, respuesta in zip(preguntas, respuestas):
        acierto = es_correcta(pregunta, respuesta)
        if acierto:
            racha += 1
            puntos += 10 + 5 * (racha - 1)
        else:
            racha = 0
        mejor_racha = max(mejor_racha, racha)
        detalle.append({"id": pregunta["id"], "tema": pregunta["tema"], "acierto": acierto})
    return {"aciertos": sum(d["acierto"] for d in detalle), "total": len(detalle), "puntos": puntos, "mejor_racha": mejor_racha, "detalle": detalle}


partida = elegir(banco, 5, semilla=7)
resultado = jugar(partida, [p["opciones"][p["correcta"]] for p in partida[:3]] + ["no lo sé", "1"])`;

const S4 = py`MAX_CAJA = 5


def actualizar_caja(cajas, id_pregunta, acierto):
    actual = cajas.get(id_pregunta, 1)
    cajas[id_pregunta] = min(actual + 1, MAX_CAJA) if acierto else 1
    return cajas[id_pregunta]


def toca_repasar(caja, ronda):
    return ronda % (2 ** (caja - 1)) == 0


def proximas(banco, cajas, ronda):
    return [p for p in banco if toca_repasar(cajas.get(p["id"], 1), ronda)]


def estadisticas(historial):
    por_tema, por_pregunta = {}, {}
    for registro in historial:
        for clave, tabla in ((registro["tema"], por_tema), (registro["id"], por_pregunta)):
            aciertos, total = tabla.get(clave, (0, 0))
            tabla[clave] = (aciertos + registro["acierto"], total + 1)
    tasas = {tema: round(a / t, 3) for tema, (a, t) in por_tema.items()}
    dificiles = [(a / t, pid) for pid, (a, t) in por_pregunta.items() if t >= 2]
    mas_dificil = min(dificiles)[1] if dificiles else None
    return {"acierto_por_tema": tasas, "mas_dificil": mas_dificil, "intentos": len(historial)}


def estudiar(banco, rondas, sabe, semilla=0):
    """Simula a un estudiante: sabe(pregunta, veces_vista, rng) dice si acierta."""
    rng = random.Random(semilla)
    cajas, vistas, historial = {}, {}, []
    for ronda in range(1, rondas + 1):
        for pregunta in proximas(banco, cajas, ronda):
            veces = vistas.get(pregunta["id"], 0)
            acierto = sabe(pregunta, veces, rng)
            vistas[pregunta["id"]] = veces + 1
            actualizar_caja(cajas, pregunta["id"], acierto)
            historial.append({"ronda": ronda, "id": pregunta["id"], "tema": pregunta["tema"], "acierto": acierto})
    return cajas, historial


def aprende_con_la_practica(pregunta, veces, rng):
    return rng.random() < min(0.95, 0.4 + 0.15 * veces)


cajas_finales, historial = estudiar(banco, 20, aprende_con_la_practica, semilla=3)
resumen = estadisticas(historial)
repasos_leitner = len(historial)
repasos_sin_cajas = 20 * len(banco)`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

export const PROJ_PREGUNTAS: Mission[] = [
  {
    id: "pj-quiz-1",
    world: "w1",
    zone: "Proyecto del Bosque",
    title: "El juego de preguntas del Bosque · 1: preguntas, respuestas y corrección",
    kind: "project",
    difficulty: 2,
    skills: ["diccionarios", "funciones", "cadenas", "condicionales"],
    requires: ["py-funciones"],
    series: { ...SERIES, stage: 1 },
    files: FILES,
    story: "Los guardas del Bosque examinan a los aprendices con preguntas en voz alta y siempre discuten si «Print», «print » o «2» valen como respuesta. Quieren un juego que corrija igual para todos.",
    objective: "Representar preguntas como diccionarios, mostrarlas con una función que devuelve texto y corregir respuestas por número de opción o por texto, sin distinguir mayúsculas, tildes ni espacios.",
    before: ["Diccionarios y listas", "Funciones con return", "Métodos de cadenas"],
    intuition: [
      "Una pregunta tiene varias partes: el enunciado, las opciones, cuál es la correcta y su tema. Un **diccionario** las agrupa con nombres claros: `pregunta[\"opciones\"]`.",
      "",
      "Para comparar respuestas escritas por personas hay que **normalizarlas**: quitar espacios sobrantes, pasar a minúsculas y quitar tildes. `\"  PRINT \"` y `\"print\"` deben valer igual.",
      "",
      "El jugador puede contestar con el **número** de la opción (empezando en 1, como lo ve) o con su **texto**. Cuidado: si las opciones son números, «9» puede ser la opción 9 o el texto «9». Regla: un número entre 1 y la cantidad de opciones es un número de opción; cualquier otra cosa se compara como texto.",
      "",
      "`mostrar` **devuelve** el texto en lugar de imprimirlo: así se puede probar, guardar o mostrar en otra interfaz.",
    ],
    formal: "Correcta si (r es un número k con 1 ≤ k ≤ nº de opciones y k − 1 = índice correcto) o (normalizar(r) = normalizar(opción correcta))",
    example: {
      code: py`pregunta = {"pregunta": "¿2 + 2?", "opciones": ["3", "4"], "correcta": 1}
respuesta = "  4 "
texto_correcto = pregunta["opciones"][pregunta["correcta"]]
print(respuesta.strip() == texto_correcto)
print("ÁRBOL".lower().translate(str.maketrans("áéíóú", "aeiou")))`,
      lines: [
        "Una pregunta como diccionario: opciones en una lista y el índice de la correcta.",
        "Lo que escribe el jugador, con espacios.",
        "El texto de la opción correcta: se indexa la lista con el índice guardado.",
        "True: strip() quita los espacios de los extremos.",
        "«arbol»: minúsculas y tildes fuera con una tabla de traducción.",
      ],
    },
    challenge: [
      "1. `normalizar(texto)`: sin espacios en los extremos, en minúsculas, sin tildes (á é í ó ú ü) y con los espacios interiores repetidos reducidos a uno.",
      "2. `es_correcta(pregunta, respuesta)`: `True` si la respuesta es el número de la opción correcta (contando desde 1) o su texto, según la regla de la intuición.",
      "3. `mostrar(pregunta, numero)`: devuelve (sin imprimir) el texto `\"{numero}. {enunciado}\"` y una línea `\"   {i}) {opción}\"` por opción, unidas con saltos de línea.",
      "4. `PREGUNTAS`: deja las cuatro preguntas del código inicial.",
    ],
    starter: py`PREGUNTAS = [
    {"id": "py1", "tema": "python", "pregunta": "¿Qué función muestra texto en pantalla?", "opciones": ["input", "print", "len"], "correcta": 1},
    {"id": "py2", "tema": "python", "pregunta": "¿Cuál es el índice del primer elemento de una lista?", "opciones": ["0", "1", "-1"], "correcta": 0},
    {"id": "ma1", "tema": "matemáticas", "pregunta": "¿Cuánto es 2 elevado a 10?", "opciones": ["100", "1024", "512", "20"], "correcta": 1},
    {"id": "ma2", "tema": "matemáticas", "pregunta": "¿Cuál es la raíz cuadrada de 81?", "opciones": ["9", "8", "18"], "correcta": 0},
]

TILDES = str.maketrans("áéíóúü", "aeiouu")


def normalizar(texto):
    return texto


def es_correcta(pregunta, respuesta):
    return False


def mostrar(pregunta, numero):
    return ""


print(mostrar(PREGUNTAS[0], 1))
print(es_correcta(PREGUNTAS[0], "2"), es_correcta(PREGUNTAS[0], "  PRINT "), es_correcta(PREGUNTAS[3], "8"))`,
    solution: SOL1,
    tests: py`
def test_normalizar():
    "Mayúsculas, tildes y espacios"
    n = t.get("normalizar", "function")
    assert n("  Árbol   GRANDE ") == "arbol grande"
    assert n("Pingüino") == "pinguino" and n("print") == "print" and n("") == ""

def test_es_correcta():
    "Número de opción o texto"
    ok = t.get("es_correcta", "function")
    q = {"pregunta": "¿Qué función muestra texto?", "opciones": ["input", "print", "len"], "correcta": 1}
    assert ok(q, "2") and ok(q, " 2 ") and ok(q, "print") and ok(q, "  PRINT ")
    assert not ok(q, "1") and not ok(q, "input") and not ok(q, "") and not ok(q, "prin")
    numeros = {"pregunta": "¿Raíz de 81?", "opciones": ["9", "8", "18"], "correcta": 0}
    assert ok(numeros, "9"), "«9» no es un número de opción (solo hay 3): se compara como texto"
    assert ok(numeros, "1") and not ok(numeros, "18") and not ok(numeros, "3")
    tilde = {"pregunta": "¿Tema?", "opciones": ["Matemáticas", "Arte"], "correcta": 0}
    assert ok(tilde, "matematicas") and ok(tilde, "MATEMÁTICAS")

def test_mostrar():
    "Devuelve el texto sin imprimirlo"
    q = {"pregunta": "¿2 + 2?", "opciones": ["3", "4"], "correcta": 1}
    texto, impreso = t.call("mostrar", q, 7)
    assert impreso == "", "mostrar debe devolver el texto con return, no imprimirlo"
    assert texto == "7. ¿2 + 2?\n   1) 3\n   2) 4"

def test_preguntas():
    "Las cuatro preguntas iniciales"
    ps = t.get("PREGUNTAS", list)
    assert [p["id"] for p in ps] == ["py1", "py2", "ma1", "ma2"]
    assert t.lines[-1] == "True True False"
`,
    hints: [
      "normalizar: encadena `str(texto).strip().lower().translate(TILDES)` y usa `\" \".join(...split())` para dejar un solo espacio entre palabras.",
      "es_correcta: normaliza la respuesta; si `respuesta.isdigit()` y está entre 1 y `len(pregunta[\"opciones\"])`, compara `int(respuesta) - 1` con `pregunta[\"correcta\"]`; si no, compara textos normalizados.",
      "mostrar: construye una lista de líneas con `enumerate(pregunta[\"opciones\"], start=1)` y únelas con `\"\\n\".join(lineas)`.",
    ],
    errors: [
      { error: "Comparar int(respuesta) con el índice correcto sin restar 1", fix: "El jugador cuenta desde 1 y las listas desde 0: la opción 2 es el índice 1." },
      { error: "Interpretar cualquier número como número de opción", fix: "Si la opción correcta es el texto «9» y solo hay 3 opciones, «9» es una respuesta de texto." },
      { error: "Imprimir dentro de mostrar", fix: "Devuelve la cadena: quien llama decide si la imprime, la guarda o la compara en una prueba." },
    ],
    quiz: {
      question: "¿Por qué mostrar(pregunta, n) debería devolver el texto en lugar de imprimirlo?",
      options: [
        { text: "Porque así el resultado se puede comprobar, guardar o mostrar de otras formas; imprimir solo lo enseña en pantalla" },
        { text: "Porque print es más lento que return" },
        { text: "Da igual: print y return hacen lo mismo dentro de una función", misconception: "print-vs-return" },
        { text: "Porque las funciones no pueden usar print" },
      ],
      answer: 0,
      explanation: "print muestra un texto y la función devuelve None; return entrega el valor a quien llama. Las pruebas, una interfaz web o un archivo necesitan el valor.",
    },
    project: SPEC,
    review: "Repasa: diccionarios para datos con partes; normalizar antes de comparar; índices desde 0 frente a opciones desde 1; return en vez de print.",
    xp: 90,
    coins: 14,
  },
  {
    id: "pj-quiz-2",
    world: "w1",
    zone: "Proyecto del Bosque",
    title: "El juego de preguntas del Bosque · 2: el banco de preguntas en JSON",
    kind: "project",
    difficulty: 2,
    skills: ["json", "archivos", "errores", "diccionarios"],
    requires: ["pj-quiz-1", "py-json-csv"],
    series: { ...SERIES, stage: 2 },
    files: FILES,
    story: "Los guardas han escrito 19 preguntas en un archivo JSON. Unas cuantas tienen errores: una sin enunciado, otra con una sola opción, un id repetido… El juego debe cargar las buenas y explicar qué falla en las demás, sin detenerse.",
    objective: "Leer un banco de preguntas en JSON, validar cada pregunta con una lista de problemas y separar las válidas de los errores con mensajes que digan qué pregunta falla y por qué.",
    before: ["Etapa 1", "JSON", "Leer archivos con with open"],
    intuition: [
      "Los datos que escribe una persona **siempre** acaban teniendo errores. Un buen programa no se rompe con el primero: valida cada elemento, se queda con los buenos y explica los malos.",
      "",
      "`validar(pregunta)` devuelve una **lista de problemas**: vacía si todo está bien. Así una pregunta puede tener varios problemas y el mensaje los menciona todos.",
      "",
      "Algunas comprobaciones dependen de otras: si falta el campo `opciones`, no tiene sentido mirar cuántas hay. Por eso primero se comprueba que estén todos los campos.",
      "",
      "Otras comprobaciones necesitan ver **todo el banco**: un id repetido solo se detecta recordando los ids ya vistos (un conjunto).",
    ],
    formal: "válida ⇔ tiene id, tema, pregunta, opciones y correcta ∧ ≥ 2 opciones distintas (normalizadas) ∧ 0 ≤ correcta < nº de opciones ∧ id no repetido",
    example: {
      code: py`import json
texto = '[{"id": "a", "opciones": ["x"]}, {"id": "b"}]'
for posicion, item in enumerate(json.loads(texto)):
    faltan = [c for c in ("id", "opciones") if c not in item]
    print(posicion, item["id"], faltan or "completa")`,
      lines: [
        "El módulo json de la biblioteca estándar.",
        "Un JSON con dos elementos; el segundo no tiene opciones.",
        "json.loads convierte el texto en una lista de diccionarios; enumerate da la posición.",
        "Los campos que faltan, con una lista por comprensión.",
        "0 a completa · 1 b ['opciones'].",
      ],
    },
    challenge: [
      "1. `CAMPOS = (\"id\", \"tema\", \"pregunta\", \"opciones\", \"correcta\")`.",
      "2. `validar(pregunta)`: lista de problemas. Si faltan campos, devuelve solo `\"falta el campo X\"` por cada uno. Si no: `\"necesita al menos 2 opciones\"`, `\"tiene opciones repetidas\"` (comparando con `normalizar`) y `\"la respuesta correcta no es una de las opciones\"`.",
      "3. `cargar_banco(texto)`: devuelve `(banco, errores)`. Una pregunta válida cuyo id ya apareció tiene el problema `\"id repetido\"`. Cada error es `\"pregunta {posición} ({id o ?}): {problemas separados por '; '}\"`.",
      "4. `por_tema(banco)`: diccionario tema → número de preguntas.",
      "5. Carga `banco.json` (con `encoding=\"utf-8\"`) en `banco` y `errores`.",
    ],
    starter: py`import json

CAMPOS = ("id", "tema", "pregunta", "opciones", "correcta")


def validar(pregunta):
    return []


def cargar_banco(texto):
    return [], []


def por_tema(banco):
    return {}


banco, errores = [], []`,
    solution: SOL2,
    tests: py`
import json

def test_validar():
    "Problemas de cada pregunta"
    v = t.get("validar", "function")
    buena = {"id": "x", "tema": "t", "pregunta": "¿?", "opciones": ["a", "b"], "correcta": 1}
    assert v(buena) == []
    assert v({"id": "x", "tema": "t"}) == ["falta el campo pregunta", "falta el campo opciones", "falta el campo correcta"]
    assert v({**buena, "opciones": ["a"], "correcta": 0}) == ["necesita al menos 2 opciones"]
    assert v({**buena, "opciones": ["Sí", "si ", "no"]}) == ["tiene opciones repetidas"]
    assert v({**buena, "correcta": 2}) == ["la respuesta correcta no es una de las opciones"]
    assert v({**buena, "correcta": -1}) == ["la respuesta correcta no es una de las opciones"]
    assert v({**buena, "opciones": ["a", "A"], "correcta": 5}) == ["tiene opciones repetidas", "la respuesta correcta no es una de las opciones"]

def test_cargar_banco():
    "Las buenas se quedan; las malas se explican"
    cb = t.get("cargar_banco", "function")
    texto = json.dumps([
        {"id": "a", "tema": "t", "pregunta": "¿?", "opciones": ["1", "2"], "correcta": 0},
        {"id": "a", "tema": "t", "pregunta": "¿otra?", "opciones": ["1", "2"], "correcta": 1},
        {"tema": "t", "pregunta": "¿?", "opciones": ["1", "2"], "correcta": 0},
    ])
    banco, errores = cb(texto)
    assert [p["pregunta"] for p in banco] == ["¿?"]
    assert errores == ["pregunta 1 (a): id repetido", "pregunta 2 (?): falta el campo id"]

def test_banco_del_bosque():
    "El archivo de los guardas"
    banco, errores = t.get("banco", list), t.get("errores", list)
    assert len(banco) == 14 and len(errores) == 5
    assert len({p["id"] for p in banco}) == 14
    assert errores[0].startswith("pregunta 14 (mal1)") and "id repetido" in errores[3]
    assert t.get("por_tema", "function")(banco) == {"python": 6, "matemáticas": 5, "estadística": 3}
`,
    hints: [
      "validar: `problemas = [f\"falta el campo {c}\" for c in CAMPOS if c not in pregunta]`; si la lista no está vacía, devuélvela ya.",
      "Opciones repetidas: compara `len({normalizar(o) for o in opciones})` con `len(opciones)`.",
      "cargar_banco: recorre `enumerate(json.loads(texto))`, guarda los ids válidos en un `set` y usa `pregunta.get(\"id\", \"?\")` para el mensaje.",
    ],
    errors: [
      { error: "Lanzar una excepción en la primera pregunta mala", fix: "Acumula los problemas y sigue: el resto del banco es útil." },
      { error: "Comprobar len(pregunta[\"opciones\"]) sin saber si existe la clave", fix: "Primero comprueba los campos; si falta alguno, KeyError rompería la validación." },
    ],
    quiz: {
      question: "¿Por qué validar devuelve una lista de problemas en lugar de True o False?",
      options: [
        { text: "Porque una pregunta puede tener varios problemas y el autor necesita saber cuáles para corregirlos" },
        { text: "Porque las listas ocupan menos memoria que los booleanos" },
        { text: "Porque Python no permite devolver True o False desde una función" },
        { text: "Porque así la validación es más rápida" },
      ],
      answer: 0,
      explanation: "Una lista vacía significa «válida» y una con elementos explica cada fallo. «Es inválida» no ayuda a corregir el archivo; «falta el campo pregunta» sí.",
    },
    project: SPEC,
    review: "Repasa: json.loads; validar acumulando problemas; comprobar campos antes de usarlos; un conjunto para detectar repetidos.",
    xp: 100,
    coins: 15,
  },
  {
    id: "pj-quiz-3",
    world: "w1",
    zone: "Proyecto del Bosque",
    title: "El juego de preguntas del Bosque · 3: partidas con semilla, opciones barajadas y rachas",
    kind: "project",
    difficulty: 3,
    skills: ["modulos", "listas", "diccionarios", "bucles"],
    requires: ["pj-quiz-2"],
    series: { ...SERIES, stage: 3 },
    files: FILES,
    story: "Los aprendices ya se saben de memoria que «print» es siempre la segunda opción. El juego debe elegir preguntas al azar y barajar sus opciones, pero los guardas quieren poder repetir una partida exacta para revisar una reclamación.",
    objective: "Elegir preguntas al azar de forma reproducible, barajar las opciones sin perder cuál es la correcta y puntuar una partida con bonificación por rachas.",
    before: ["Etapas 1 y 2", "Módulo random", "Bucles con zip"],
    intuition: [
      "`random.Random(semilla)` crea un generador propio: con la misma semilla produce la misma secuencia. Así una partida «aleatoria» se puede **reproducir** exactamente.",
      "",
      "Barajar las opciones tiene una trampa: el índice de la correcta cambia. La solución es barajar una lista de **posiciones** `[0, 1, 2]` y buscar dónde quedó la posición correcta con `orden.index(...)`.",
      "",
      "Barajar no debe estropear el banco: se crea **una pregunta nueva** (`dict(pregunta)`) en lugar de modificar la original, que podría usarse en otra partida.",
      "",
      "Puntuación: cada acierto da 10 puntos más 5 por cada acierto seguido anterior (racha); un fallo reinicia la racha.",
    ],
    formal: "puntos = Σ aciertos (10 + 5·(racha − 1)) · racha = nº de aciertos consecutivos hasta la pregunta actual",
    example: {
      code: py`import random
rng = random.Random(42)
orden = [0, 1, 2]
rng.shuffle(orden)
print(orden, orden.index(1))`,
      lines: [
        "El módulo random.",
        "Un generador con semilla: siempre produce la misma secuencia.",
        "Las posiciones originales de tres opciones.",
        "shuffle las desordena en el sitio.",
        "El nuevo orden y dónde quedó la opción que antes estaba en la posición 1.",
      ],
    },
    challenge: [
      "1. `barajar_opciones(pregunta, rng)`: devuelve una **copia** con las opciones en el orden de `rng.shuffle(list(range(k)))` y el nuevo índice `correcta`. No modifica la original.",
      "2. `elegir(banco, n, semilla=0, tema=None)`: con `rng = random.Random(semilla)`, filtra por tema (si se indica), toma `rng.sample(candidatas, min(n, len(candidatas)))` y baraja las opciones de cada una con el mismo `rng`, en orden.",
      "3. `jugar(preguntas, respuestas)`: corrige con `es_correcta` y devuelve `aciertos`, `total`, `puntos`, `mejor_racha` y `detalle` (lista de `{\"id\", \"tema\", \"acierto\"}`).",
      "4. `partida = elegir(banco, 5, semilla=7)` y `resultado`: jugar esa partida respondiendo bien las tres primeras (con su texto) y después `\"no lo sé\"` y `\"1\"`.",
    ],
    starter: py`import random


def barajar_opciones(pregunta, rng):
    return pregunta


def elegir(banco, n, semilla=0, tema=None):
    return []


def jugar(preguntas, respuestas):
    return {"aciertos": 0, "total": 0, "puntos": 0, "mejor_racha": 0, "detalle": []}


partida = elegir(banco, 5, semilla=7)
resultado = jugar(partida, [p["opciones"][p["correcta"]] for p in partida[:3]] + ["no lo sé", "1"])`,
    solution: SOL3,
    tests: py`
import random

def test_barajar():
    "Barajar sin perder la respuesta correcta"
    bo = t.get("barajar_opciones", "function")
    q = {"id": "x", "tema": "t", "pregunta": "¿?", "opciones": ["a", "b", "c", "d"], "correcta": 2}
    copia = dict(q, opciones=list(q["opciones"]))
    for semilla in range(20):
        nueva = bo(q, random.Random(semilla))
        assert nueva["opciones"][nueva["correcta"]] == "c" and sorted(nueva["opciones"]) == ["a", "b", "c", "d"]
    assert q == copia, "barajar_opciones no debe modificar la pregunta original"
    orden = [0, 1, 2, 3]
    random.Random(5).shuffle(orden)
    assert bo(q, random.Random(5))["opciones"] == [q["opciones"][i] for i in orden]

def test_elegir():
    "Reproducible, filtrado por tema y sin repetir"
    el, banco = t.get("elegir", "function"), t.get("banco", list)
    a, b = el(banco, 5, semilla=3), el(banco, 5, semilla=3)
    assert a == b and len({p["id"] for p in a}) == 5
    assert el(banco, 5, semilla=4) != a
    rng = random.Random(3)
    esperadas = rng.sample(banco, 5)
    assert [p["id"] for p in a] == [p["id"] for p in esperadas]
    est = el(banco, 10, semilla=1, tema="estadística")
    assert len(est) == 3 and all(p["tema"] == "estadística" for p in est)

def test_jugar():
    "Puntuación por rachas"
    j = t.get("jugar", "function")
    qs = [{"id": f"q{i}", "tema": "t", "pregunta": "¿?", "opciones": ["sí", "no"], "correcta": 0} for i in range(6)]
    r = j(qs, ["sí", "1", "no", "SÍ", "sí", "1"])
    assert (r["aciertos"], r["total"], r["mejor_racha"]) == (5, 6, 3)
    assert r["puntos"] == 10 + 15 + 0 + 10 + 15 + 20
    assert [d["acierto"] for d in r["detalle"]] == [True, True, False, True, True, True]
    assert j([], [])["puntos"] == 0

def test_partida_de_ejemplo():
    "La partida reproducible"
    r = t.get("resultado", dict)
    assert (r["aciertos"], r["total"], r["puntos"], r["mejor_racha"]) == (4, 5, 55, 3)
`,
    hints: [
      "barajar_opciones: `orden = list(range(len(pregunta[\"opciones\"])))`, `rng.shuffle(orden)`, `nueva = dict(pregunta)`, las opciones como `[pregunta[\"opciones\"][i] for i in orden]` y `nueva[\"correcta\"] = orden.index(pregunta[\"correcta\"])`.",
      "elegir: crea un único `rng` y úsalo primero en `sample` y luego en cada barajado; si creas otro generador, la partida dejará de coincidir.",
      "jugar: recorre `zip(preguntas, respuestas)`; con un acierto `racha += 1` y `puntos += 10 + 5 * (racha - 1)`; con un fallo `racha = 0`.",
    ],
    errors: [
      { error: "Barajar las opciones y dejar el mismo índice correcta", fix: "La correcta cambia de sitio: baraja posiciones y busca con orden.index(correcta)." },
      { error: "Modificar la pregunta del banco al barajarla", fix: "dict(pregunta) crea una copia; asigna a la copia una lista nueva de opciones." },
      { error: "Usar random.shuffle sin semilla", fix: "No podrías repetir una partida; usa random.Random(semilla) y pásalo a las funciones." },
    ],
    quiz: {
      question: "Haces copia = dict(pregunta) y luego copia[\"opciones\"].append(\"otra\"). ¿Qué le pasa a pregunta[\"opciones\"]?",
      options: [
        { text: "También cambia: dict() hace una copia superficial y ambas comparten la misma lista" },
        { text: "No cambia: dict() copia todo el contenido" },
        { text: "Python lanza un error porque la lista está en dos diccionarios" },
        { text: "Solo cambia si las opciones son números" },
      ],
      answer: 0,
      explanation: "La copia es superficial: el diccionario nuevo apunta a la misma lista. Por eso barajar_opciones asigna una lista nueva en lugar de modificar la existente.",
    },
    project: SPEC,
    review: "Repasa: random.Random(semilla) para reproducir; barajar posiciones; copias superficiales; acumular con rachas.",
    xp: 110,
    coins: 16,
  },
  {
    id: "pj-quiz-4",
    world: "w1",
    zone: "Proyecto del Bosque",
    title: "El juego de preguntas del Bosque · 4: repaso inteligente con cajas de Leitner",
    kind: "project",
    difficulty: 3,
    skills: ["diccionarios", "funciones", "bucles", "simulacion"],
    requires: ["pj-quiz-3"],
    series: { ...SERIES, stage: 4 },
    files: FILES,
    story: "Repasar las 14 preguntas cada día aburre a los aprendices. La bibliotecaria del Bosque propone el método de las cajas: lo que aciertas sube de caja y se repasa menos; lo que fallas vuelve a la primera. ¿Cuánto trabajo ahorra?",
    objective: "Implementar el sistema de cajas de Leitner, simular a un estudiante que aprende con la práctica y medir cuántos repasos ahorra y qué temas cuestan más.",
    before: ["Etapas 1 a 3", "Diccionarios como contadores", "Funciones que reciben funciones"],
    intuition: [
      "**Cajas de Leitner:** cada pregunta está en una caja del 1 al 5. Si la aciertas, sube una caja (como mucho a la 5); si la fallas, vuelve a la 1.",
      "",
      "La caja k se repasa cada 2^(k−1) rondas: la 1 siempre, la 2 cada 2, la 3 cada 4, la 4 cada 8 y la 5 cada 16. Lo que ya sabes aparece cada vez menos.",
      "",
      "Para medir el método se **simula** a un estudiante: una función decide si acierta, con una probabilidad que crece cada vez que ve la pregunta. Pasar esa función como argumento permite probar estudiantes distintos con el mismo código.",
      "",
      "Un estudiante que acierta siempre repasa cada pregunta solo en las rondas 1, 2, 4, 8 y 16: 5 veces en 20 rondas en lugar de 20. Lo que más se repasa es justo lo que cuesta.",
    ],
    formal: "caja ← min(caja + 1, 5) si acierta, 1 si falla · se repasa en la ronda r si r mod 2^(caja − 1) = 0",
    example: {
      code: py`for caja in range(1, 6):
    rondas = [r for r in range(1, 21) if r % (2 ** (caja - 1)) == 0]
    print(caja, len(rondas), rondas[:5])`,
      lines: [
        "Para cada caja…",
        "…las rondas de 1 a 20 en las que toca repasarla.",
        "La caja 1 se repasa 20 veces; la 2, 10; la 3, 5; la 4, 2; la 5, una (ronda 16).",
      ],
    },
    challenge: [
      "1. `actualizar_caja(cajas, id_pregunta, acierto)`: las preguntas sin caja están en la 1; sube (máximo `MAX_CAJA = 5`) o vuelve a 1. Devuelve la caja nueva.",
      "2. `toca_repasar(caja, ronda)` y `proximas(banco, cajas, ronda)`: las preguntas del banco que tocan en esa ronda.",
      "3. `estadisticas(historial)`: con registros `{\"id\", \"tema\", \"acierto\", …}` devuelve `acierto_por_tema` (redondeado a 3 decimales), `mas_dificil` (id con menor tasa de acierto entre las que tienen al menos 2 intentos; con empate, el id menor; `None` si no hay) e `intentos`.",
      "4. `estudiar(banco, rondas, sabe, semilla=0)`: para cada ronda de 1 a `rondas`, repasa las `proximas`; `sabe(pregunta, veces_vista, rng)` decide el acierto (`rng = random.Random(semilla)`). Devuelve `(cajas, historial)` con registros `{\"ronda\", \"id\", \"tema\", \"acierto\"}`.",
      "5. `aprende_con_la_practica`: acierta con probabilidad min(0,95; 0,4 + 0,15·veces). `cajas_finales, historial = estudiar(banco, 20, aprende_con_la_practica, semilla=3)`, `resumen = estadisticas(historial)`, `repasos_leitner = len(historial)` y `repasos_sin_cajas = 20 * len(banco)`.",
    ],
    starter: py`MAX_CAJA = 5


def actualizar_caja(cajas, id_pregunta, acierto):
    return 1


def toca_repasar(caja, ronda):
    return True


def proximas(banco, cajas, ronda):
    return list(banco)


def estadisticas(historial):
    return {"acierto_por_tema": {}, "mas_dificil": None, "intentos": 0}


def estudiar(banco, rondas, sabe, semilla=0):
    return {}, []


def aprende_con_la_practica(pregunta, veces, rng):
    return rng.random() < min(0.95, 0.4 + 0.15 * veces)


cajas_finales, historial = estudiar(banco, 20, aprende_con_la_practica, semilla=3)
resumen = estadisticas(historial)
repasos_leitner = len(historial)
repasos_sin_cajas = 20 * len(banco)`,
    solution: SOL4,
    tests: py`
def test_cajas():
    "Subir, tope y volver a la primera"
    ac = t.get("actualizar_caja", "function")
    cajas = {}
    assert [ac(cajas, "a", True) for _ in range(6)] == [2, 3, 4, 5, 5, 5]
    assert ac(cajas, "a", False) == 1 and cajas == {"a": 1}
    tr = t.get("toca_repasar", "function")
    assert [r for r in range(1, 17) if tr(3, r)] == [4, 8, 12, 16]
    assert all(tr(1, r) for r in range(1, 10))
    pr = t.get("proximas", "function")
    banco = [{"id": "a"}, {"id": "b"}]
    assert pr(banco, {"a": 2}, 3) == [{"id": "b"}] and pr(banco, {"a": 2}, 4) == banco

def test_estadisticas():
    "Acierto por tema y pregunta más difícil"
    es = t.get("estadisticas", "function")
    h = [
        {"id": "a", "tema": "x", "acierto": True}, {"id": "a", "tema": "x", "acierto": False},
        {"id": "b", "tema": "x", "acierto": False}, {"id": "b", "tema": "x", "acierto": False},
        {"id": "c", "tema": "y", "acierto": False},
    ]
    r = es(h)
    assert r == {"acierto_por_tema": {"x": 0.25, "y": 0.0}, "mas_dificil": "b", "intentos": 5}
    assert es([])["mas_dificil"] is None

def test_estudiantes_extremos():
    "Quien siempre acierta repasa 5 veces cada pregunta en 20 rondas"
    est, banco = t.get("estudiar", "function"), t.get("banco", list)
    cajas, h = est(banco, 20, lambda p, v, rng: True)
    assert len(h) == 5 * len(banco) and set(cajas.values()) == {5}
    assert sorted({r["ronda"] for r in h}) == [1, 2, 4, 8, 16]
    cajas, h = est(banco, 20, lambda p, v, rng: False)
    assert len(h) == 20 * len(banco) and set(cajas.values()) == {1}

def test_simulacion():
    "Leitner ahorra más de la mitad de los repasos"
    r, h = t.get("resumen", dict), t.get("historial", list)
    assert t.get("repasos_leitner") == len(h) == r["intentos"]
    assert t.get("repasos_sin_cajas") == 280 and t.get("repasos_leitner") < 140
    assert set(r["acierto_por_tema"]) == {"python", "matemáticas", "estadística"}
    est, banco = t.get("estudiar", "function"), t.get("banco", list)
    assert est(banco, 20, t.get("aprende_con_la_practica"), semilla=3)[1] == h, "Con la misma semilla, la misma simulación"
`,
    hints: [
      "actualizar_caja: `actual = cajas.get(id_pregunta, 1)` y después `min(actual + 1, MAX_CAJA)` si acierta o `1` si falla.",
      "estadisticas: acumula `(aciertos, total)` en dos diccionarios, por tema y por id; para la más difícil, `min` de tuplas `(tasa, id)` resuelve los empates por id.",
      "estudiar: guarda en `vistas` cuántas veces se ha visto cada pregunta para pasárselo a `sabe` antes de incrementarlo.",
    ],
    errors: [
      { error: "Usar ronda % caja == 0", fix: "Las cajas se espacian de forma exponencial: cada 2^(caja − 1) rondas." },
      { error: "Calcular la tasa por tema con historial de una sola pregunta", fix: "Acumula aciertos y totales por tema; divide al final." },
    ],
    quiz: {
      question: "En la simulación, Leitner hace muchos menos repasos que repasar todo cada ronda. ¿Qué preguntas se llevan la mayoría de los repasos?",
      options: [
        { text: "Las que se fallan: vuelven a la caja 1 y se repasan cada ronda hasta que se aciertan varias veces seguidas" },
        { text: "Las que se aciertan siempre, porque suben de caja" },
        { text: "Todas por igual: Leitner reparte los repasos de forma uniforme" },
        { text: "Las del tema con más preguntas" },
      ],
      answer: 0,
      explanation: "Una pregunta acertada siempre solo aparece 5 veces en 20 rondas; una fallada, cada ronda. El esfuerzo se concentra donde hace falta: es la idea del repaso espaciado de Python Quest.",
    },
    project: SPEC,
    review: "Repasa: cajas que suben o vuelven a 1; repaso cada 2^(k − 1) rondas; simular pasando funciones; medir el ahorro.",
    xp: 120,
    coins: 18,
  },
];
