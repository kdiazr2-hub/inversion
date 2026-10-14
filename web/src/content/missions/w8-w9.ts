import { climaCsv } from "../datasets";
import { py, type Mission } from "../types";

// Mundo 8 · La Torre del Ingeniero Python y Mundo 9 · El Multiverso (rutas optativas).

export const W8: Mission[] = [
  {
    id: "eng-config",
    world: "w8",
    zone: "Fundamentos profesionales",
    title: "Los planos de la torre: configuración, logging y estructura de proyecto",
    kind: "lesson",
    difficulty: 3,
    skills: ["ingenieria", "logging", "configuracion"],
    requires: [],
    story: "La torre se construye con planos: dónde va cada pieza, qué parámetros cambian según el entorno y un registro de todo lo que ocurre. Sin planos, nadie sabe por qué se cayó un piso.",
    objective: "Leer configuración desde variables de entorno con valores por defecto y validación, usar `logging` en lugar de `print` y conocer la estructura de un proyecto Python.",
    before: ["Funciones", "Excepciones", "Dataclasses"],
    intuition: [
      "Estructura típica:",
      "```",
      "mi_proyecto/",
      "├── pyproject.toml      # metadatos y dependencias",
      "├── src/mi_paquete/     # código",
      "├── tests/              # pruebas (pytest)",
      "└── README.md",
      "```",
      "Crea un **entorno virtual** (`python -m venv .venv`) por proyecto y fija las dependencias.",
      "",
      "- **Configuración**: lo que cambia entre entornos (URL de la base de datos, nivel de log) va en variables de entorno, con valores por defecto seguros y validación al arrancar.",
      "- **logging**: niveles (DEBUG, INFO, WARNING, ERROR), formato con hora y módulo, y destino configurable. A diferencia de `print`, se puede filtrar y dirigir sin tocar el código.",
    ],
    example: {
      code: py`import io, logging
buffer = io.StringIO()
log = logging.getLogger("torre")
log.setLevel(logging.INFO)
log.addHandler(logging.StreamHandler(buffer))
log.debug("detalle interno")
log.info("piso construido")
print(buffer.getvalue())`,
      lines: ["Módulos.", "Destino de los mensajes (aquí, un texto en memoria).", "Un logger con nombre.", "Nivel mínimo INFO.", "Envía los mensajes al buffer.", "DEBUG queda filtrado…", "…INFO se registra.", "Muestra solo «piso construido»."],
    },
    challenge: [
      "1. Dataclass `Config` con `entorno: str`, `puerto: int`, `nivel_log: str`, `debug: bool`.",
      "2. `cargar_config(env)`: recibe un diccionario (como `os.environ`) y devuelve `Config` con valores por defecto `entorno=\"desarrollo\"`, `puerto=8000`, `nivel_log=\"INFO\"`, `debug=False`. Convierte tipos (`\"true\"/\"1\"` → True). Lanza `ValueError` con un mensaje claro si el puerto no es un entero entre 1 y 65535, si `nivel_log` no es un nivel válido, o si `debug` está activado en `entorno=\"produccion\"`.",
      "3. `crear_logger(nombre, nivel, destino)`: logger con formato `\"%(levelname)s:%(name)s:%(message)s\"` que escribe en el stream `destino` (sin duplicar handlers si se llama dos veces).",
    ],
    starter: py`import logging

class Config:
    pass

def cargar_config(env):
    return Config()

def crear_logger(nombre, nivel, destino):
    print("logger creado")`,
    solution: py`import logging
from dataclasses import dataclass

NIVELES = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}

@dataclass(frozen=True)
class Config:
    entorno: str
    puerto: int
    nivel_log: str
    debug: bool

def cargar_config(env):
    entorno = env.get("ENTORNO", "desarrollo")
    try:
        puerto = int(env.get("PUERTO", "8000"))
    except ValueError:
        raise ValueError("PUERTO debe ser un número entero")
    if not 1 <= puerto <= 65535:
        raise ValueError("PUERTO debe estar entre 1 y 65535")
    nivel = env.get("NIVEL_LOG", "INFO").upper()
    if nivel not in NIVELES:
        raise ValueError(f"NIVEL_LOG inválido: {nivel}")
    debug = env.get("DEBUG", "false").strip().lower() in ("1", "true", "si", "sí", "yes")
    if debug and entorno == "produccion":
        raise ValueError("DEBUG no puede activarse en producción")
    return Config(entorno, puerto, nivel, debug)

def crear_logger(nombre, nivel, destino):
    log = logging.getLogger(nombre)
    log.setLevel(nivel)
    log.propagate = False
    for h in list(log.handlers):
        log.removeHandler(h)
    h = logging.StreamHandler(destino)
    h.setFormatter(logging.Formatter("%(levelname)s:%(name)s:%(message)s"))
    log.addHandler(h)
    return log`,
    tests: py`
import io

def test_defectos():
    "Valores por defecto"
    c = t.get("cargar_config", "function")({})
    assert (c.entorno, c.puerto, c.nivel_log, c.debug) == ("desarrollo", 8000, "INFO", False)

def test_conversion():
    "Conversión de tipos"
    c = t.get("cargar_config")({"PUERTO": "9090", "NIVEL_LOG": "debug", "DEBUG": "true"})
    assert c.puerto == 9090 and c.nivel_log == "DEBUG" and c.debug is True

def test_validacion():
    "Rechaza configuraciones inválidas"
    f = t.get("cargar_config")
    for env in ({"PUERTO": "abc"}, {"PUERTO": "70000"}, {"NIVEL_LOG": "VERBOSO"}, {"ENTORNO": "produccion", "DEBUG": "1"}):
        try:
            f(env)
        except ValueError as e:
            assert str(e)
            continue
        assert False, f"{env} debía fallar"

def test_logger():
    "Logger con formato y nivel, sin duplicar"
    buf = io.StringIO()
    crear = t.get("crear_logger", "function")
    log = crear("torre.prueba", "WARNING", buf)
    log = crear("torre.prueba", "WARNING", buf)
    log.info("no")
    log.warning("grieta")
    assert buf.getvalue() == "WARNING:torre.prueba:grieta\n"
`,
    hints: [
      "Lee con `env.get(\"CLAVE\", \"valor_por_defecto\")` y convierte el tipo.",
      "Valida al cargar: es mejor fallar al arrancar que en mitad de la noche.",
      "Antes de añadir el handler, elimina los existentes para no duplicar mensajes.",
    ],
    errors: [
      { error: "Mensajes de log duplicados", fix: "Cada llamada añade otro handler. Elimina los previos o configura el logging una sola vez." },
      { error: "Usar print para diagnosticar en producción", fix: "No se puede filtrar por nivel ni redirigir. Usa logging." },
    ],
    quiz: {
      question: "¿Por qué validar la configuración al arrancar la aplicación?",
      options: [
        { text: "Para fallar pronto y con un mensaje claro, en vez de con un error confuso horas después" },
        { text: "Porque Python lo exige" },
        { text: "Para que arranque más rápido" },
        { text: "No hace falta validar la configuración" },
      ],
      answer: 0,
      explanation: "Un puerto o una URL mal escritos detectados al inicio ahorran incidentes difíciles de diagnosticar.",
    },
    review: "Repasa configuración por entorno con validación y el uso de logging.",
    xp: 85,
    coins: 12,
  },
  {
    id: "eng-api",
    world: "w8",
    zone: "APIs",
    title: "La ventanilla de la torre: diseñar una API con validación y pruebas",
    kind: "lesson",
    difficulty: 4,
    skills: ["apis", "validacion", "pruebas"],
    requires: ["eng-config"],
    story: "La torre abre una ventanilla para que otras ciudades pidan predicciones. Cada petición debe validarse, responder con códigos claros y estar cubierta por pruebas.",
    objective: "Diseñar los manejadores de una API (rutas, métodos, códigos de estado, validación de entrada, errores en JSON) y probarlos con un cliente de pruebas, como harías con FastAPI.",
    before: ["Configuración", "Excepciones personalizadas", "Dataclasses", "Pruebas"],
    intuition: [
      "Con **FastAPI** (en tu ordenador) defines rutas con decoradores y modelos **Pydantic** para validar la entrada:",
      "",
      "```python",
      "@app.post(\"/prediccion\", status_code=200)",
      "def predecir(datos: Entrada) -> Salida: ...",
      "```",
      "",
      "Conceptos que aplicarás aquí con Python puro (FastAPI y un servidor no funcionan dentro del navegador):",
      "- **Rutas y métodos**: (`GET`, `/salud`), (`POST`, `/prediccion`).",
      "- **Códigos**: 200 correcto, 201 creado, 400/422 entrada inválida, 404 no encontrado, 405 método no permitido, 500 error interno (sin filtrar detalles).",
      "- **Validación**: tipos y rangos antes de llamar al modelo.",
      "- **Pruebas**: un cliente que llama a la app y comprueba estado y cuerpo (como `TestClient` de FastAPI).",
      "",
      "Despliegue (fuera del navegador): contenedor Docker, variables de entorno, integración continua que ejecuta las pruebas en cada cambio.",
    ],
    example: {
      code: py`rutas = {}

def ruta(metodo, camino):
    def registrar(f):
        rutas[(metodo, camino)] = f
        return f
    return registrar

@ruta("GET", "/salud")
def salud(cuerpo):
    return 200, {"estado": "ok"}

print(rutas[("GET", "/salud")](None))`,
      lines: ["Tabla de rutas.", "Un decorador con parámetros, como @app.get de FastAPI…", "…que registra la función…", "…bajo su método y camino.", "Devuelve la función sin cambios.", "Devuelve el decorador.", "Registramos una ruta.", "Función que atiende GET /salud.", "El manejador devuelve (código, cuerpo).", "(200, {'estado': 'ok'})"],
    },
    challenge: [
      "Construye una mini API de predicción de riesgo de baja:",
      "1. `App` con método `ruta(metodo, camino)` (decorador) y `manejar(metodo, camino, cuerpo=None)` que devuelva `(codigo, dict)`: 404 `{\"error\": \"no encontrado\"}` si el camino no existe; 405 si existe con otro método; 500 `{\"error\": \"error interno\"}` ante excepciones no previstas (sin mostrar el detalle).",
      "2. Ruta `GET /salud` → 200 `{\"estado\": \"ok\"}`.",
      "3. Ruta `POST /prediccion` que valide un cuerpo con `antiguedad` (int ≥ 0), `llamadas` (int ≥ 0) y `contrato` (\"mensual\", \"anual\" o \"bianual\"). Si falta o es inválido → 422 `{\"error\": \"validacion\", \"campos\": [lista ordenada de campos con problemas]}`. Si es válido → 200 `{\"riesgo\": p}` con p = 1/(1 + e^(−z)), z = −1 − 0,04·antiguedad + 0,4·llamadas + (1,2 si contrato mensual), redondeado a 3.",
      "4. `app` debe ser la instancia con las rutas registradas.",
    ],
    starter: py`class App:
    def __init__(self):
        self.rutas = {}

    def manejar(self, metodo, camino, cuerpo=None):
        return 200, {}

app = App()`,
    solution: py`import math

class App:
    def __init__(self):
        self.rutas = {}

    def ruta(self, metodo, camino):
        def registrar(f):
            self.rutas[(metodo.upper(), camino)] = f
            return f
        return registrar

    def manejar(self, metodo, camino, cuerpo=None):
        clave = (metodo.upper(), camino)
        if clave not in self.rutas:
            if any(c == camino for _, c in self.rutas):
                return 405, {"error": "método no permitido"}
            return 404, {"error": "no encontrado"}
        try:
            return self.rutas[clave](cuerpo)
        except Exception:
            return 500, {"error": "error interno"}

app = App()

@app.ruta("GET", "/salud")
def salud(_):
    return 200, {"estado": "ok"}

def _validar(c):
    errores = []
    if not isinstance(c, dict):
        return ["antiguedad", "contrato", "llamadas"]
    for campo in ("antiguedad", "llamadas"):
        v = c.get(campo)
        if not isinstance(v, int) or isinstance(v, bool) or v < 0:
            errores.append(campo)
    if c.get("contrato") not in ("mensual", "anual", "bianual"):
        errores.append("contrato")
    return sorted(errores)

@app.ruta("POST", "/prediccion")
def prediccion(cuerpo):
    errores = _validar(cuerpo)
    if errores:
        return 422, {"error": "validacion", "campos": errores}
    z = -1 - 0.04 * cuerpo["antiguedad"] + 0.4 * cuerpo["llamadas"] + (1.2 if cuerpo["contrato"] == "mensual" else 0)
    return 200, {"riesgo": round(1 / (1 + math.exp(-z)), 3)}

print(app.manejar("POST", "/prediccion", {"antiguedad": 3, "llamadas": 4, "contrato": "mensual"}))`,
    tests: py`
def test_salud():
    "GET /salud"
    assert t.get("app").manejar("GET", "/salud") == (200, {"estado": "ok"})

def test_rutas_inexistentes():
    "404 y 405"
    a = t.get("app")
    assert a.manejar("GET", "/nada")[0] == 404
    assert a.manejar("DELETE", "/salud")[0] == 405

def test_prediccion():
    "Predicción válida"
    import math
    cod, cuerpo = t.get("app").manejar("POST", "/prediccion", {"antiguedad": 3, "llamadas": 4, "contrato": "mensual"})
    z = -1 - 0.12 + 1.6 + 1.2
    assert cod == 200 and cuerpo == {"riesgo": round(1 / (1 + math.exp(-z)), 3)}

def test_validacion():
    "422 con campos inválidos"
    a = t.get("app")
    cod, cuerpo = a.manejar("POST", "/prediccion", {"antiguedad": -1, "contrato": "semanal"})
    assert cod == 422 and cuerpo == {"error": "validacion", "campos": ["antiguedad", "contrato", "llamadas"]}
    assert a.manejar("POST", "/prediccion", {"antiguedad": "3", "llamadas": 1, "contrato": "anual"})[0] == 422

def test_error_interno():
    "500 sin filtrar detalles"
    a = t.get("App")()
    @a.ruta("GET", "/roto")
    def roto(_):
        raise KeyError("secreto interno")
    cod, cuerpo = a.manejar("GET", "/roto")
    assert cod == 500 and "secreto" not in str(cuerpo)
`,
    hints: [
      "`ruta` es un decorador con parámetros que guarda la función en `self.rutas[(metodo, camino)]`.",
      "Para distinguir 404 de 405, comprueba si el camino existe con algún otro método.",
      "Valida todos los campos y acumula los errores antes de responder.",
    ],
    errors: [
      { error: "Devolver la traza del error al cliente", fix: "Puede revelar rutas, versiones o datos. Registra el detalle en el log y devuelve un mensaje genérico." },
      { error: "Aceptar \"3\" donde se espera un entero", fix: "Valida tipos explícitamente; Pydantic lo hace por ti en FastAPI." },
    ],
    quiz: {
      question: "Un cliente envía una edad negativa a tu API. ¿Qué código devuelves?",
      options: [{ text: "422 (o 400): la entrada no es válida" }, { text: "500" }, { text: "200 con un riesgo calculado igualmente" }, { text: "404" }],
      answer: 0,
      explanation: "Los 4xx indican un problema de la petición; los 5xx, un fallo del servidor.",
    },
    review: "Repasa rutas, códigos de estado, validación y pruebas de una API.",
    xp: 100,
    coins: 15,
  },
  {
    id: "eng-rendimiento",
    world: "w8",
    zone: "Calidad y rendimiento",
    title: "El ascensor de la torre: medir antes de optimizar",
    kind: "lesson",
    difficulty: 3,
    skills: ["rendimiento", "complejidad", "numpy"],
    requires: ["eng-api"],
    story: "El ascensor de la torre va lento. El ingeniero novato quiere cambiarlo todo; la ingeniera veterana primero mide qué tramo es el lento.",
    objective: "Medir tiempos con `time.perf_counter` y `timeit`, identificar cuellos de botella, y optimizar con mejores estructuras de datos, vectorización y memorización.",
    before: ["Complejidad algorítmica", "NumPy", "Decoradores"],
    packages: ["numpy"],
    intuition: [
      "1. **Mide** con datos realistas (`time.perf_counter`, `timeit`, o perfiladores como `cProfile`).",
      "2. Optimiza **el cuello de botella**, no todo.",
      "3. Primero el **algoritmo y la estructura de datos** (O(n²) → O(n)), luego la **vectorización** (NumPy), luego la **memorización** de cálculos repetidos.",
      "4. **Comprueba** que el resultado sigue siendo correcto (pruebas) y vuelve a medir.",
      "",
      "La optimización prematura complica el código sin beneficio.",
    ],
    example: {
      code: py`import time
datos = list(range(5000))
buscados = list(range(0, 10000, 2))
t0 = time.perf_counter(); r1 = sum(1 for b in buscados if b in datos); t1 = time.perf_counter()
s = set(datos); r2 = sum(1 for b in buscados if b in s); t2 = time.perf_counter()
print(r1 == r2, round(t1 - t0, 3), round(t2 - t1, 4))`,
      lines: ["Medición de tiempos.", "Datos.", "Valores a buscar.", "Buscar en una lista: O(n) por búsqueda.", "Buscar en un conjunto: O(1).", "Mismo resultado, tiempos muy distintos."],
    },
    challenge: [
      "1. `medir(funcion, *args, repeticiones=3)`: devuelve el mejor tiempo (mínimo) en segundos de `repeticiones` ejecuciones.",
      "2. `distancias_lento(puntos)` está en el código inicial (bucles anidados). Escribe `distancias_rapido(puntos)` con NumPy (broadcasting) que devuelva la misma matriz.",
      "3. `ratio`: cuántas veces es más rápida tu versión con 400 puntos aleatorios (semilla 0). Debe ser al menos 3 (en el navegador suele ser mucho mayor).",
      "4. `contar_comunes_rapido(a, b)`: número de elementos de a que están en b, en O(len(a) + len(b)).",
    ],
    starter: py`import math, time
import numpy as np

def distancias_lento(puntos):
    n = len(puntos)
    d = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            d[i][j] = math.dist(puntos[i], puntos[j])
    return d

def medir(funcion, *args, repeticiones=3):
    return 0

def distancias_rapido(puntos):
    return distancias_lento(puntos)

ratio = 1

def contar_comunes_rapido(a, b):
    return sum(1 for x in a if x in b)`,
    solution: py`import math, time
import numpy as np

def distancias_lento(puntos):
    n = len(puntos)
    d = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            d[i][j] = math.dist(puntos[i], puntos[j])
    return d

def medir(funcion, *args, repeticiones=3):
    mejor = float("inf")
    for _ in range(repeticiones):
        t0 = time.perf_counter()
        funcion(*args)
        mejor = min(mejor, time.perf_counter() - t0)
    return mejor

def distancias_rapido(puntos):
    p = np.asarray(puntos, dtype=float)
    return np.sqrt(((p[:, None, :] - p[None, :, :]) ** 2).sum(axis=2))

pts = np.random.default_rng(0).random((400, 2)).tolist()
ratio = medir(distancias_lento, pts, repeticiones=1) / medir(distancias_rapido, pts)

def contar_comunes_rapido(a, b):
    s = set(b)
    return sum(1 for x in a if x in s)

print(round(ratio, 1))`,
    tests: py`
import numpy as np

def test_medir():
    "Mide tiempos"
    import time
    assert 0.009 < t.get("medir", "function")(time.sleep, 0.01, repeticiones=2) < 0.2

def test_equivalencia():
    "Misma matriz que la versión lenta"
    pts = np.random.default_rng(1).random((30, 3)).tolist()
    assert np.allclose(t.get("distancias_rapido", "function")(pts), t.get("distancias_lento")(pts))

def test_ratio():
    "Al menos 3 veces más rápida"
    assert t.get("ratio") > 3

def test_comunes():
    "Conteo rápido"
    import time
    f = t.get("contar_comunes_rapido", "function")
    assert f([1, 2, 3, 4], [2, 4, 9]) == 2
    a, b = list(range(100000)), list(range(50000, 150000))
    t0 = time.time()
    assert f(a, b) == 50000 and time.time() - t0 < 1
`,
    hints: [
      "Usa `time.perf_counter()` antes y después y quédate con el mínimo de varias repeticiones.",
      "Broadcasting: `p[:, None, :] - p[None, :, :]` crea todas las diferencias a la vez.",
      "Convierte b en conjunto una sola vez.",
    ],
    errors: [
      { error: "Medir una sola vez con datos de juguete", fix: "Los tiempos varían; repite y usa tamaños realistas." },
      { error: "Optimizar sin pruebas", fix: "Una versión rápida e incorrecta no sirve. Compara resultados con la versión de referencia." },
    ],
    quiz: {
      question: "Tu programa tarda 10 s: 9,5 s en una consulta y 0,5 s en cálculos. ¿Dónde optimizas primero?",
      options: [{ text: "En la consulta: es el cuello de botella" }, { text: "En los cálculos, porque son más fáciles" }, { text: "En ambos por igual" }, { text: "En ninguno: hay que reescribirlo en otro lenguaje" }],
      answer: 0,
      explanation: "Aunque los cálculos fueran instantáneos, solo ahorrarías 0,5 s (ley de Amdahl).",
    },
    review: "Repasa el ciclo medir → optimizar el cuello de botella → comprobar → volver a medir.",
    xp: 90,
    coins: 13,
  },
];

export const W9: Mission[] = [
  {
    id: "mv-finanzas",
    world: "w9",
    zone: "Finanzas cuantitativas",
    title: "El mercado del multiverso: rentabilidad, volatilidad y riesgo",
    kind: "lesson",
    difficulty: 3,
    skills: ["finanzas", "series-temporales", "numpy"],
    requires: [],
    story: "En el mercado del multiverso, dos fondos prometen lo mismo. Uno sube despacio; el otro da saltos vertiginosos. ¿Cómo medir rentabilidad y riesgo con honestidad?",
    objective: "Calcular rentabilidades simples y logarítmicas, rentabilidad anualizada, volatilidad, máxima caída (drawdown) y ratio de Sharpe a partir de precios.",
    before: ["Logaritmos y crecimiento", "Desviación estándar", "NumPy"],
    packages: ["numpy"],
    intuition: [
      "- **Rentabilidad simple** rₜ = Pₜ/Pₜ₋₁ − 1. **Logarítmica** ln(Pₜ/Pₜ₋₁): se suman en el tiempo.",
      "- **Anualizar**: con rentabilidades diarias y 252 días hábiles, (1 + r_total)^(252/n) − 1.",
      "- **Volatilidad** anual ≈ DE de las rentabilidades diarias × √252.",
      "- **Máxima caída**: peor descenso desde un máximo previo.",
      "- **Sharpe** = (rentabilidad anual − tasa libre de riesgo) / volatilidad anual.",
      "",
      "Rentabilidades pasadas no garantizan las futuras; los datos de esta misión son simulados.",
    ],
    formal: "Drawdownₜ = Pₜ / maxₛ≤ₜ Pₛ − 1; MDD = minₜ Drawdownₜ.",
    example: {
      code: py`import numpy as np
precios = np.array([100, 110, 99, 120])
r = precios[1:] / precios[:-1] - 1
print(r.round(3), round(precios[-1] / precios[0] - 1, 3))`,
      lines: ["NumPy.", "Cuatro precios.", "Rentabilidades diarias: 10 %, −10 %, 21,2 %.", "Rentabilidad total 20 %."],
    },
    challenge: [
      "Con `precios` (simulados en el código inicial, 2 años de días hábiles):",
      "1. `rentabilidades(p)`: rentabilidades simples (array).",
      "2. `anualizada(p, dias=252)` y `volatilidad(p, dias=252)` (DE muestral × √dias).",
      "3. `max_drawdown(p)`: valor negativo de la peor caída.",
      "4. `sharpe(p, rf=0.02)`.",
      "5. `resumen`: diccionario con esas cuatro métricas para `precios`.",
    ],
    starter: py`import numpy as np

rng = np.random.default_rng(12)
precios = 100 * np.exp(np.cumsum(rng.normal(0.0004, 0.012, 504)))

def rentabilidades(p):
    return np.diff(p)

def anualizada(p, dias=252):
    return 0

def volatilidad(p, dias=252):
    return 0

def max_drawdown(p):
    return 0

def sharpe(p, rf=0.02):
    return 0

resumen = {}`,
    solution: py`import numpy as np

rng = np.random.default_rng(12)
precios = 100 * np.exp(np.cumsum(rng.normal(0.0004, 0.012, 504)))

def rentabilidades(p):
    p = np.asarray(p, float)
    return p[1:] / p[:-1] - 1

def anualizada(p, dias=252):
    p = np.asarray(p, float)
    n = len(p) - 1
    return float((p[-1] / p[0]) ** (dias / n) - 1)

def volatilidad(p, dias=252):
    return float(rentabilidades(p).std(ddof=1) * np.sqrt(dias))

def max_drawdown(p):
    p = np.asarray(p, float)
    return float((p / np.maximum.accumulate(p) - 1).min())

def sharpe(p, rf=0.02):
    return (anualizada(p) - rf) / volatilidad(p)

resumen = {"anualizada": anualizada(precios), "volatilidad": volatilidad(precios), "max_drawdown": max_drawdown(precios), "sharpe": sharpe(precios)}
print({k: round(v, 3) for k, v in resumen.items()})`,
    tests: py`
import numpy as np

def test_basicas():
    "Rentabilidades y anualización"
    p = [100, 110, 99, 120]
    assert np.allclose(t.get("rentabilidades", "function")(p), [0.1, -0.1, 120 / 99 - 1])
    assert approx(t.get("anualizada", "function")([100, 121], dias=1), 0.21)
    assert approx(t.get("anualizada")([100, 121], dias=2), 1.21 ** 2 - 1)
    assert approx(t.get("anualizada")([100, 110, 121], dias=2), 0.21)

def test_drawdown():
    "Máxima caída"
    assert approx(t.get("max_drawdown", "function")([100, 120, 90, 130, 104]), -0.25)

def test_resumen():
    "Resumen coherente"
    r = t.get("resumen")
    p = t.get("precios")
    assert approx(r["volatilidad"], np.std(p[1:] / p[:-1] - 1, ddof=1) * np.sqrt(252))
    assert r["max_drawdown"] < 0 and 0.1 < r["volatilidad"] < 0.3
    assert approx(r["sharpe"], (r["anualizada"] - 0.02) / r["volatilidad"])
`,
    hints: [
      "`p[1:] / p[:-1] - 1` da las rentabilidades simples.",
      "`np.maximum.accumulate(p)` es el máximo previo en cada momento.",
      "Con n rentabilidades, anualiza con el exponente dias/n.",
    ],
    errors: [
      { error: "Promediar rentabilidades simples para obtener la del periodo", fix: "+10 % y −10 % no dan 0 %. Compón multiplicando o usa rentabilidades logarítmicas." },
      { error: "Anualizar la volatilidad multiplicando por 252", fix: "La varianza escala con el tiempo; la DE, con su raíz: × √252." },
    ],
    quiz: {
      question: "Un fondo tuvo Sharpe 2 en los últimos 2 años simulados. ¿Qué puedes concluir sobre el futuro?",
      options: [
        { text: "Poco: es un dato histórico ruidoso; no garantiza resultados futuros" },
        { text: "Que seguirá rindiendo lo mismo" },
        { text: "Que no tiene riesgo" },
        { text: "Que es mejor que cualquier otro fondo" },
      ],
      answer: 0,
      explanation: "Con 2 años de datos, la incertidumbre de estas métricas es grande y las condiciones del mercado cambian.",
    },
    review: "Repasa rentabilidad compuesta, volatilidad anualizada, drawdown y Sharpe.",
    xp: 90,
    coins: 13,
  },
  {
    id: "mv-pronosticos",
    world: "w9",
    zone: "Series temporales y pronósticos",
    title: "El oráculo del clima: pronósticos de referencia y validación temporal",
    kind: "lesson",
    difficulty: 4,
    skills: ["series-temporales", "pronostico", "evaluacion"],
    requires: ["mv-finanzas"],
    story: "El oráculo del clima presume de pronósticos complejos. El aprendiz propone algo humilde: «¿y si mañana hace la misma temperatura que hoy?». Sorprendentemente, cuesta batirlo.",
    objective: "Construir pronósticos de referencia (ingenuo, estacional, media móvil, tendencia lineal) y compararlos con validación temporal (backtesting) sin mirar el futuro.",
    before: ["Fechas y series temporales", "Métricas de error", "Fuga de datos temporal"],
    packages: ["pandas", "numpy"],
    files: { "clima.csv": climaCsv() },
    intuition: [
      "- **Ingenuo**: ŷₜ₊₁ = yₜ.",
      "- **Media móvil**: media de los últimos k valores.",
      "- **Estacional ingenuo**: el valor de hace una estación (7 días, 12 meses…).",
      "- **Backtesting con origen móvil**: para cada día de la prueba, ajustar solo con el pasado y predecir el siguiente. Nunca usar datos posteriores al momento de la predicción.",
      "",
      "Un modelo sofisticado debe superar a estas referencias; si no, no aporta. En tu ordenador, statsmodels (ARIMA, ETS) o Prophet amplían las opciones.",
    ],
    example: {
      code: py`import pandas as pd
serie = pd.Series([10, 12, 11, 13, 14, 13])
ingenuo = serie.shift(1)
movil = serie.rolling(3).mean().shift(1)
print(pd.DataFrame({"real": serie, "ingenuo": ingenuo, "movil3": movil.round(2)}))`,
      lines: ["pandas.", "Una serie corta.", "Pronóstico ingenuo: el valor de ayer.", "Media de los 3 días anteriores (shift evita usar el día que se predice).", "Tabla comparativa."],
    },
    challenge: [
      "Con la temperatura diaria de `clima.csv`, usando los últimos 60 días como prueba:",
      "1. `pronosticos(serie, k=7)`: DataFrame con columnas `ingenuo`, `movil` (media de los k días anteriores) y `tendencia` (para cada día t, recta ajustada con `np.polyfit` a los 30 días previos y evaluada en t), todas sin usar el valor del día t.",
      "2. `mae_prueba`: diccionario modelo → MAE en los últimos 60 días.",
      "3. `mejor`: nombre del modelo con menor MAE.",
      "4. `sin_fuga`: True si cambiar el último valor de la serie no altera ningún pronóstico de los días anteriores (compruébalo).",
    ],
    starter: py`import numpy as np
import pandas as pd

serie = pd.read_csv("clima.csv", parse_dates=["fecha"], index_col="fecha")["temperatura"]

def pronosticos(serie, k=7):
    return pd.DataFrame({"ingenuo": serie, "movil": serie.rolling(k).mean(), "tendencia": serie})

mae_prueba = {}
mejor = ""
sin_fuga = False`,
    solution: py`import numpy as np
import pandas as pd

serie = pd.read_csv("clima.csv", parse_dates=["fecha"], index_col="fecha")["temperatura"]

def pronosticos(serie, k=7):
    valores = serie.to_numpy()
    tendencia = np.full(len(valores), np.nan)
    for t in range(30, len(valores)):
        x = np.arange(t - 30, t)
        b1, b0 = np.polyfit(x, valores[t - 30:t], 1)
        tendencia[t] = b0 + b1 * t
    return pd.DataFrame({
        "ingenuo": serie.shift(1),
        "movil": serie.rolling(k).mean().shift(1),
        "tendencia": pd.Series(tendencia, index=serie.index),
    })

p = pronosticos(serie)
prueba = serie.index[-60:]
mae_prueba = {m: float((p.loc[prueba, m] - serie.loc[prueba]).abs().mean()) for m in p.columns}
mejor = min(mae_prueba, key=mae_prueba.get)

alterada = serie.copy()
alterada.iloc[-1] += 100
sin_fuga = bool(pronosticos(alterada).iloc[:-1].equals(p.iloc[:-1]))
print(mae_prueba, mejor, sin_fuga)`,
    tests: py`
import numpy as np
import pandas as pd

def test_pronosticos():
    "Pronósticos sin mirar el día que se predice"
    s = pd.Series([10.0, 12, 11, 13, 14, 13, 15, 16, 15, 17] * 5)
    p = t.get("pronosticos", "function")(s, k=3)
    assert list(p.columns) == ["ingenuo", "movil", "tendencia"]
    assert p["ingenuo"].iloc[5] == s.iloc[4] and approx(p["movil"].iloc[5], s.iloc[2:5].mean())
    assert np.isnan(p["tendencia"].iloc[29]) and not np.isnan(p["tendencia"].iloc[30])

def test_mae():
    "Comparación en prueba"
    m = t.get("mae_prueba")
    assert set(m) == {"ingenuo", "movil", "tendencia"} and all(0 < v < 10 for v in m.values())
    assert t.get("mejor") == min(m, key=m.get)

def test_fuga():
    "Sin fuga temporal"
    assert t.get("sin_fuga") is True
`,
    hints: [
      "`serie.shift(1)` desplaza un día: el pronóstico de hoy es el valor de ayer.",
      "Para la media móvil, calcula `rolling(k).mean()` y desplázala un día.",
      "Para la tendencia, recorre t y ajusta `np.polyfit` con los 30 valores anteriores a t.",
    ],
    errors: [
      { error: "Media móvil centrada o sin shift", fix: "Incluir el día que se predice (o los siguientes) es fuga de información." },
      { error: "Barajar los datos para validar", fix: "En series temporales, la prueba siempre es posterior al entrenamiento." },
    ],
    quiz: {
      question: "Tu modelo complejo tiene MAE 2,1 y el pronóstico ingenuo 1,9. ¿Qué concluyes?",
      options: [
        { text: "Que el modelo complejo no aporta sobre la referencia más simple; hay que revisarlo o descartarlo" },
        { text: "Que el modelo complejo es mejor por ser más sofisticado" },
        { text: "Que el MAE no sirve" },
        { text: "Que hay que usar los dos" },
      ],
      answer: 0,
      explanation: "Las referencias simples existen para evitar la complejidad inútil.",
    },
    review: "Repasa los pronósticos de referencia y la validación temporal sin fuga.",
    xp: 100,
    coins: 15,
  },
  {
    id: "mv-optimizacion",
    world: "w9",
    zone: "Optimización y simulación",
    title: "La forja de los recursos: programación lineal",
    kind: "lesson",
    difficulty: 4,
    skills: ["optimizacion", "scipy"],
    requires: ["mv-pronosticos"],
    story: "La forja fabrica espadas y escudos con hierro y horas de trabajo limitados. ¿Cuántos de cada uno maximizan el beneficio? La programación lineal responde con exactitud.",
    objective: "Formular un problema de optimización (variables, objetivo, restricciones) y resolverlo con `scipy.optimize.linprog`, interpretando la solución y las restricciones activas.",
    before: ["Álgebra básica", "Funciones", "NumPy"],
    packages: ["scipy", "numpy"],
    intuition: [
      "Un problema de **programación lineal**:",
      "",
      "- **Variables de decisión**: x₁ espadas, x₂ escudos.",
      "- **Objetivo** lineal: maximizar 40x₁ + 30x₂.",
      "- **Restricciones** lineales: 3x₁ + 2x₂ ≤ 120 (hierro), x₁ + 2x₂ ≤ 80 (horas), x ≥ 0.",
      "",
      "`linprog` **minimiza**: para maximizar, cambia el signo del objetivo. Las restricciones van como `A_ub @ x <= b_ub`.",
      "",
      "Una restricción **activa** (sin holgura) limita la solución: conseguir más de ese recurso aumentaría el beneficio. Si necesitas unidades enteras, usa `integrality` (programación entera).",
    ],
    example: {
      code: py`from scipy.optimize import linprog
res = linprog(c=[-40, -30], A_ub=[[3, 2], [1, 2]], b_ub=[120, 80], bounds=[(0, None), (0, None)])
print(res.x.round(2), round(-res.fun, 2))`,
      lines: ["Resolutor de programación lineal.", "Maximizar 40x₁ + 30x₂ ⇔ minimizar −40x₁ − 30x₂ con las dos restricciones.", "x = [20, 30] y beneficio 1700."],
    },
    challenge: [
      "La forja produce espadas, escudos y arcos. Beneficio: 40, 30 y 25. Recursos: hierro 3, 2 y 1 por unidad (máx. 150); horas 1, 2 y 1 (máx. 100); madera 0, 1 y 3 (máx. 90). Además deben fabricarse al menos 10 escudos.",
      "1. `resolver()`: devuelve `(cantidades, beneficio)` con `linprog` (variables continuas).",
      "2. `holguras()`: diccionario recurso → holgura (recurso disponible − usado) en la solución.",
      "3. `activas`: lista ordenada de recursos con holgura ≈ 0 (|h| < 1e-6).",
      "4. `resolver_entero()`: igual pero con unidades enteras (`integrality=[1, 1, 1]`).",
    ],
    starter: py`import numpy as np
from scipy.optimize import linprog

def resolver():
    return np.zeros(3), 0

def holguras():
    return {}

activas = []

def resolver_entero():
    return np.zeros(3), 0`,
    solution: py`import numpy as np
from scipy.optimize import linprog

BENEFICIO = np.array([40, 30, 25])
A = np.array([[3, 2, 1], [1, 2, 1], [0, 1, 3]])
B = np.array([150, 100, 90])
RECURSOS = ["hierro", "horas", "madera"]
LIMITES = [(0, None), (10, None), (0, None)]

def resolver(entero=False):
    res = linprog(-BENEFICIO, A_ub=A, b_ub=B, bounds=LIMITES, integrality=[1, 1, 1] if entero else None)
    return res.x, float(-res.fun)

def holguras():
    x, _ = resolver()
    usado = A @ x
    return {r: float(b - u) for r, b, u in zip(RECURSOS, B, usado)}

activas = sorted(r for r, h in holguras().items() if abs(h) < 1e-6)

def resolver_entero():
    return resolver(entero=True)

print(resolver(), holguras(), activas, resolver_entero())`,
    tests: py`
import numpy as np
from scipy.optimize import linprog

def test_continuo():
    "Solución óptima continua"
    x, b = t.get("resolver", "function")()
    ref = linprog([-40, -30, -25], A_ub=[[3, 2, 1], [1, 2, 1], [0, 1, 3]], b_ub=[150, 100, 90], bounds=[(0, None), (10, None), (0, None)])
    assert approx(b, -ref.fun, 1e-6) and x[1] >= 10 - 1e-9

def test_holguras():
    "Holguras y restricciones activas"
    h = t.get("holguras", "function")()
    assert set(h) == {"hierro", "horas", "madera"} and all(v >= -1e-6 for v in h.values())
    assert t.get("activas") == sorted(k for k, v in h.items() if abs(v) < 1e-6) and len(t.get("activas")) >= 2

def test_entero():
    "Solución entera"
    x, b = t.get("resolver_entero", "function")()
    assert np.allclose(x, np.round(x)) and b <= t.get("resolver")()[1] + 1e-9
`,
    hints: [
      "Pasa el objetivo con signo cambiado a `linprog` y vuelve a cambiar el signo de `res.fun`.",
      "El mínimo de 10 escudos va en `bounds=[(0, None), (10, None), (0, None)]`.",
      "Holgura = b − A @ x.",
    ],
    errors: [
      { error: "Olvidar cambiar el signo para maximizar", fix: "linprog minimiza: obtendrías la peor producción (cero)." },
      { error: "Redondear la solución continua para obtener enteros", fix: "Puede ser infactible o subóptima. Usa integrality." },
    ],
    quiz: {
      question: "La restricción de horas está activa en el óptimo. ¿Qué significa?",
      options: [
        { text: "Se usan todas las horas; disponer de más permitiría aumentar el beneficio" },
        { text: "Sobran horas" },
        { text: "Las horas no influyen en la solución" },
        { text: "El problema no tiene solución" },
      ],
      answer: 0,
      explanation: "Una restricción activa es un cuello de botella; su precio sombra indica cuánto ganarías con una unidad más.",
    },
    review: "Repasa la formulación (variables, objetivo, restricciones) y la interpretación de holguras.",
    xp: 95,
    coins: 14,
  },
  {
    id: "mv-recomendador",
    world: "w9",
    zone: "Sistemas de recomendación",
    title: "El bibliotecario del multiverso: un sistema de recomendación",
    kind: "lesson",
    difficulty: 4,
    skills: ["recomendacion", "similitud", "evaluacion"],
    requires: ["mv-optimizacion"],
    story: "El bibliotecario del multiverso recuerda qué libros leyó cada viajero. Con eso sugiere el siguiente… sin leer la mente de nadie, solo comparando gustos.",
    objective: "Construir un recomendador por filtrado colaborativo basado en ítems (similitud del coseno), compararlo con la popularidad y evaluarlo ocultando valoraciones (precisión@k).",
    before: ["Vectores y coseno", "pandas", "Evaluación fuera de muestra"],
    packages: ["numpy", "pandas"],
    intuition: [
      "- **Popularidad**: recomendar lo más valorado por todos. Simple y sorprendentemente fuerte; ignora gustos individuales.",
      "- **Filtrado colaborativo por ítems**: dos ítems son similares si los mismos usuarios los valoran parecido (coseno entre columnas de la matriz usuario × ítem). Puntuación de un ítem no visto = suma de similitudes con lo que el usuario ya valoró.",
      "- **Evaluación**: ocultar algunas interacciones de cada usuario, recomendar y medir cuántas de las ocultas aparecen entre las k primeras (precisión@k).",
      "",
      "Riesgos: arranque en frío (usuarios o ítems nuevos), burbujas de filtro y sesgo de popularidad.",
    ],
    example: {
      code: py`import numpy as np
R = np.array([[5, 4, 0], [4, 5, 0], [0, 1, 5]])
norm = np.linalg.norm(R, axis=0)
sim = (R.T @ R) / np.outer(norm, norm)
print(sim.round(2))`,
      lines: ["NumPy.", "3 usuarios × 3 películas (0 = sin valorar).", "Norma de cada columna.", "Coseno entre columnas (ítems).", "Las películas 0 y 1 son muy similares; la 2 se parece poco."],
    },
    challenge: [
      "La matriz `R` (usuarios × ítems, 0 = no visto) se genera en el código inicial con dos grupos de gustos.",
      "1. `similitud_items(R)`: matriz de coseno entre columnas (0 en la diagonal).",
      "2. `recomendar(R, usuario, k)`: los k ítems no vistos por el usuario con mayor puntuación (Σ similitud × valoración del usuario), ordenados.",
      "3. `popularidad(R, usuario, k)`: los k ítems no vistos con más valoraciones positivas en total.",
      "4. `evaluar(funcion, R, k, semilla)`: para cada usuario, oculta 1 ítem valorado al azar (`default_rng(semilla)`), recomienda con la matriz modificada y devuelve la proporción de usuarios cuyo ítem oculto está en sus k recomendaciones.",
      "5. `comparacion`: diccionario `{\"colaborativo\": ..., \"popularidad\": ...}` con `evaluar` (k = 3, semilla 0).",
    ],
    starter: py`import numpy as np

rng = np.random.default_rng(5)
n_u, n_i = 60, 20
grupo = rng.integers(0, 2, n_u)
R = np.zeros((n_u, n_i))
for u in range(n_u):
    preferidos = range(0, 10) if grupo[u] == 0 else range(10, 20)
    vistos = rng.choice(list(preferidos), 5, replace=False)
    R[u, vistos] = rng.integers(4, 6, 5)
    otro = rng.integers(0, n_i)
    R[u, otro] = max(R[u, otro], rng.integers(1, 3))

def similitud_items(R):
    return np.eye(R.shape[1])

def recomendar(R, usuario, k):
    return list(range(k))

def popularidad(R, usuario, k):
    return list(range(k))

def evaluar(funcion, R, k, semilla):
    return 0

comparacion = {}`,
    solution: py`import numpy as np

rng = np.random.default_rng(5)
n_u, n_i = 60, 20
grupo = rng.integers(0, 2, n_u)
R = np.zeros((n_u, n_i))
for u in range(n_u):
    preferidos = range(0, 10) if grupo[u] == 0 else range(10, 20)
    vistos = rng.choice(list(preferidos), 5, replace=False)
    R[u, vistos] = rng.integers(4, 6, 5)
    otro = rng.integers(0, n_i)
    R[u, otro] = max(R[u, otro], rng.integers(1, 3))

def similitud_items(R):
    norm = np.linalg.norm(R, axis=0)
    norm[norm == 0] = 1
    S = (R.T @ R) / np.outer(norm, norm)
    np.fill_diagonal(S, 0)
    return S

def recomendar(R, usuario, k):
    S = similitud_items(R)
    puntos = S @ R[usuario]
    candidatos = [i for i in np.argsort(-puntos, kind="stable") if R[usuario, i] == 0]
    return [int(i) for i in candidatos[:k]]

def popularidad(R, usuario, k):
    conteo = (R >= 4).sum(axis=0)
    candidatos = [i for i in np.argsort(-conteo, kind="stable") if R[usuario, i] == 0]
    return [int(i) for i in candidatos[:k]]

def evaluar(funcion, R, k, semilla):
    rng = np.random.default_rng(semilla)
    aciertos = 0
    for u in range(R.shape[0]):
        valorados = np.flatnonzero(R[u] >= 4)
        oculto = rng.choice(valorados)
        R2 = R.copy()
        R2[u, oculto] = 0
        aciertos += oculto in funcion(R2, u, k)
    return aciertos / R.shape[0]

comparacion = {"colaborativo": evaluar(recomendar, R, 3, 0), "popularidad": evaluar(popularidad, R, 3, 0)}
print(comparacion)`,
    tests: py`
import numpy as np

def test_similitud():
    "Coseno entre ítems"
    S = t.get("similitud_items", "function")(np.array([[5, 4, 0], [4, 5, 0], [0, 1, 5]], float))
    assert S.shape == (3, 3) and np.allclose(np.diag(S), 0) and S[0, 1] > 0.9 and S[0, 2] < 0.2 and np.allclose(S, S.T)

def test_recomendar():
    "Recomienda ítems no vistos"
    R = t.get("R")
    rec = t.get("recomendar", "function")(R, 0, 3)
    assert len(rec) == 3 and all(R[0, i] == 0 for i in rec)
    pop = t.get("popularidad", "function")(R, 0, 3)
    assert len(pop) == 3 and all(R[0, i] == 0 for i in pop)

def test_comparacion():
    "El colaborativo supera a la popularidad con gustos segmentados"
    c = t.get("comparacion")
    assert c["colaborativo"] > c["popularidad"] + 0.2 and c["colaborativo"] >= 0.45
`,
    hints: [
      "Coseno entre columnas: `(R.T @ R) / np.outer(norma, norma)` y `np.fill_diagonal(S, 0)`.",
      "Puntuación de cada ítem para un usuario: `S @ R[usuario]`.",
      "Al evaluar, copia la matriz antes de ocultar una valoración.",
    ],
    errors: [
      { error: "Recomendar ítems que el usuario ya vio", fix: "Filtra los ítems con valoración > 0 antes de elegir los k mejores." },
      { error: "Evaluar con las mismas valoraciones usadas para recomendar", fix: "Oculta interacciones y comprueba si el sistema las recupera." },
    ],
    quiz: {
      question: "¿Qué problema tiene un recomendador basado solo en popularidad?",
      options: [
        { text: "Ignora los gustos de cada persona y refuerza lo que ya es popular" },
        { text: "No se puede calcular" },
        { text: "Siempre es peor que el azar" },
        { text: "Necesita GPU" },
      ],
      answer: 0,
      explanation: "Es una buena referencia, pero tiende a concentrar la atención en pocos ítems (sesgo de popularidad).",
    },
    review: "Repasa similitud entre ítems, la referencia de popularidad y la evaluación ocultando interacciones.",
    xp: 100,
    coins: 15,
  },
];
