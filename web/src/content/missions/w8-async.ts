import { py, type Mission } from "../types";

// Mundo 8 · programación asíncrona por dentro. El bucle de eventos de asyncio necesita en Pyodide una
// función del navegador (WebAssembly JSPI) que no todos tienen; por eso el alumno construye su propio
// bucle de eventos sobre corrutinas reales, con un reloj simulado, y la lección muestra el código
// equivalente con asyncio para Python normal.

const ESPERAR = py`class Esperar:
    """Awaitable: suspende la corrutina durante segundos de reloj simulado."""

    def __init__(self, segundos):
        self.segundos = segundos

    def __await__(self):
        yield self.segundos`;

export const W8_ASYNC: Mission[] = [
  {
    id: "eng-async",
    world: "w8",
    zone: "APIs",
    title: "Las campanas de la torre: programación asíncrona por dentro",
    kind: "lesson",
    difficulty: 4,
    skills: ["asincronia", "corrutinas", "concurrencia"],
    requires: ["eng-api"],
    story: "El campanero de la torre atiende a muchos mensajeros a la vez sin correr: mientras uno espera respuesta, él atiende al siguiente. Así funciona un programa asíncrono: no hace varias cosas a la vez, sino que no se queda parado mientras espera.",
    objective: "Entender `async def`, `await` y el bucle de eventos: escribir corrutinas que esperan, ejecutar varias de forma concurrente con un bucle de eventos propio y comprobar que el tiempo total es el de la más lenta, no la suma.",
    before: ["Funciones y clases", "Generadores", "Colas de prioridad (heapq)"],
    intuition: [
      "Muchos programas pasan la mayor parte del tiempo **esperando**: una respuesta de red, una base de datos, un disco. La programación asíncrona aprovecha esas esperas: mientras una tarea espera, otra avanza. Es **concurrencia** (intercalar tareas), no paralelismo (varios núcleos a la vez).",
      "",
      "- `async def f():` define una **corrutina**: llamar a `f()` no la ejecuta, devuelve un objeto que se puede reanudar.",
      "- `await algo` **suspende** la corrutina hasta que `algo` esté listo y devuelve el control al bucle de eventos.",
      "- El **bucle de eventos** guarda las corrutinas pendientes y reanuda cada una cuando lo que esperaba termina. Las reanuda con `corrutina.send(None)`; cuando una acaba, lanza `StopIteration` con el valor devuelto en `.value`.",
      "",
      "En Python normal se usa `asyncio`:",
      "",
      "```python",
      "import asyncio",
      "",
      "async def descargar(nombre, segundos):",
      "    await asyncio.sleep(segundos)",
      "    return f\"{nombre}: listo\"",
      "",
      "async def main():",
      "    return await asyncio.gather(descargar(\"a\", 3), descargar(\"b\", 1), descargar(\"c\", 2))",
      "",
      "print(asyncio.run(main()))   # tarda unos 3 s, no 6",
      "```",
      "",
      "En el navegador, el bucle de eventos de asyncio necesita una función de WebAssembly (JSPI) que no todos los navegadores tienen. Por eso aquí construyes tu propio bucle con un **reloj simulado**: es la misma idea que asyncio usa por dentro y no hay que esperar segundos reales.",
    ],
    example: {
      code: py`class Esperar:
    def __await__(self):
        yield 2
async def tarea():
    await Esperar()
    return "hecho"
c = tarea()
print(type(c).__name__, c.send(None))
try:
    c.send(None)
except StopIteration as fin:
    print(fin.value)`,
      lines: [
        "Un objeto que se puede esperar con await…",
        "…porque su __await__ es un generador…",
        "…que entrega al bucle de eventos los segundos que hay que esperar.",
        "Una corrutina.",
        "Se suspende aquí: el 2 sale hacia quien la está ejecutando.",
        "Cuando la reanudan, termina y devuelve un valor.",
        "Llamar a la corrutina no la ejecuta: crea el objeto.",
        "coroutine 2: la primera reanudación avanza hasta el await y entrega el 2.",
        "Reanudarla otra vez…",
        "…hace que termine,…",
        "…y Python lanza StopIteration…",
        "…con el valor devuelto: hecho.",
      ],
    },
    challenge: [
      "`Esperar(segundos)` (ya escrita) suspende una corrutina durante ese tiempo de reloj simulado.",
      "",
      "1. `descargar(nombre, segundos)`: corrutina que espera `segundos` y devuelve `\"<nombre>: listo\"`.",
      "2. `en_dos_pasos(nombre, conectar, transferir)`: corrutina que espera `conectar` segundos, después espera a `descargar(nombre, transferir)` y devuelve su resultado en mayúsculas.",
      "3. `ejecutar(corrutinas)`: un bucle de eventos. Devuelve `(resultados, tiempo_total, orden)`: los resultados en el orden de la lista, el instante en que terminó la última y los índices en el orden en que terminaron. Todas empiezan en el instante 0; reanuda siempre la que antes deba despertar (si empatan, la de menor índice) usando una cola de prioridad con `heapq`.",
    ],
    starter: py`import heapq

${ESPERAR}


async def descargar(nombre, segundos):
    pass


async def en_dos_pasos(nombre, conectar, transferir):
    pass


def ejecutar(corrutinas):
    return [], 0, []
`,
    solution: py`import heapq

${ESPERAR}


async def descargar(nombre, segundos):
    await Esperar(segundos)
    return f"{nombre}: listo"


async def en_dos_pasos(nombre, conectar, transferir):
    await Esperar(conectar)
    datos = await descargar(nombre, transferir)
    return datos.upper()


def ejecutar(corrutinas):
    reloj = 0
    cola = [(0, i, c) for i, c in enumerate(corrutinas)]
    heapq.heapify(cola)
    resultados = [None] * len(corrutinas)
    orden = []
    while cola:
        reloj, i, c = heapq.heappop(cola)
        try:
            espera = c.send(None)
        except StopIteration as fin:
            resultados[i] = fin.value
            orden.append(i)
        else:
            heapq.heappush(cola, (reloj + espera, i, c))
    return resultados, reloj, orden


print(ejecutar([descargar("a", 3), descargar("b", 1), descargar("c", 2)]))
`,
    tests: py`
import inspect


def test_corrutinas():
    "descargar y en_dos_pasos son corrutinas"
    for nombre in ("descargar", "en_dos_pasos"):
        assert inspect.iscoroutinefunction(t.get(nombre, "function")), f"{nombre} debe definirse con async def."


def test_concurrencia():
    "Tres descargas a la vez tardan lo que la más lenta"
    d = t.get("descargar")
    resultados, total, orden = t.get("ejecutar", "function")([d("a", 3), d("b", 1), d("c", 2)])
    assert resultados == ["a: listo", "b: listo", "c: listo"], f"Resultados: {resultados}"
    assert total == 3, f"Con esperas de 3, 1 y 2 s en paralelo el total es 3, no {total}."
    assert orden == [1, 2, 0], f"Terminan primero b, luego c y por último a: [1, 2, 0], no {orden}."


def test_await_anidado():
    "Una corrutina que espera a otra"
    ejecutar, d, dos = t.get("ejecutar"), t.get("descargar"), t.get("en_dos_pasos")
    resultados, total, orden = ejecutar([dos("x", 1, 4), d("y", 2)])
    assert resultados == ["X: LISTO", "y: listo"] and total == 5 and orden == [1, 0], f"Obtuviste {resultados}, {total}, {orden}."


def test_empates_y_vacio():
    "Empates por índice y lista vacía"
    ejecutar, d = t.get("ejecutar"), t.get("descargar")
    assert ejecutar([]) == ([], 0, []), "Sin corrutinas, el resultado es ([], 0, [])."
    _, total, orden = ejecutar([d("p", 2), d("q", 2), d("r", 0)])
    assert total == 2 and orden == [2, 0, 1], f"Con empate gana el índice menor: se esperaba [2, 0, 1], no {orden}."


def test_secuencial_frente_a_concurrente():
    "Una tras otra sí suman"
    ejecutar, d = t.get("ejecutar"), t.get("descargar")

    async def una_tras_otra():
        a = await d("a", 3)
        b = await d("b", 1)
        return [a, b]

    resultados, total, _ = ejecutar([una_tras_otra()])
    assert resultados == [["a: listo", "b: listo"]] and total == 4, f"Esperar una y luego otra dentro de la misma corrutina tarda 3 + 1 = 4, no {total}."
`,
    hints: [
      "Una corrutina se escribe como una función normal con `async def` y `await Esperar(segundos)` donde haya que esperar.",
      "En el bucle, cada elemento de la cola es `(instante, índice, corrutina)`: saca el más pequeño con `heapq.heappop` y reanúdalo con `c.send(None)`.",
      "Si `send` devuelve un número, la corrutina quiere esperar: vuelve a meterla con `instante + espera`. Si lanza `StopIteration`, terminó: su resultado está en `fin.value`.",
    ],
    errors: [
      { error: "RuntimeWarning: coroutine '…' was never awaited", fix: "Llamar a una corrutina solo crea el objeto: hay que esperarla con await o entregarla a un bucle de eventos." },
      { error: "El tiempo total es la suma de las esperas", fix: "Estás ejecutando las corrutinas una detrás de otra. El bucle debe intercalar: reanuda siempre la que antes despierta." },
      { error: "TypeError: '<' not supported between instances of 'coroutine' and 'coroutine'", fix: "Si dos entradas de la cola empatan en instante, heapq compara el siguiente campo: incluye el índice antes de la corrutina." },
    ],
    quiz: {
      question: "Un programa hace 100 consultas a una API que tarda 1 s en responder cada una. ¿Cuánto puede ganar haciéndolas de forma asíncrona?",
      options: [
        { text: "Mucho: las esperas se solapan y el total se acerca a 1 s más el tiempo de procesar las respuestas (si la API acepta tantas a la vez)" },
        { text: "Nada: async hace que el procesador vaya más rápido" },
        { text: "Lo mismo que usar 100 núcleos para cálculos pesados" },
      ],
      answer: 0,
      explanation: "La asincronía ayuda cuando el tiempo se va en esperas (E/S). Para cálculos pesados en CPU no sirve: ahí hace falta paralelismo real (procesos).",
    },
    review: "Explica qué hace await, qué es el bucle de eventos y por qué tres esperas concurrentes de 3, 1 y 2 s tardan 3 s.",
    xp: 100,
    coins: 14,
  },
];
