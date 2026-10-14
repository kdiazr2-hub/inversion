import { py, type Mission } from "../types";

// Mundo 8: validación de datos con Pydantic y arquitectura en capas con inyección de dependencias.

export const W8_EXTRA: Mission[] = [
  {
    id: "eng-pydantic",
    world: "w8",
    zone: "APIs",
    title: "El sello de la torre: validación de datos con Pydantic",
    kind: "lesson",
    difficulty: 3,
    skills: ["pydantic", "validacion", "tipado", "seguridad"],
    requires: ["eng-api"],
    story: "La ventanilla de la torre recibe solicitudes de todo el multiverso, y algunas llegan con campos de más, números negativos o contratos imposibles. El sello de Pydantic decide qué entra, convierte lo convertible y explica por qué rechaza lo demás.",
    objective: "Declarar modelos de datos con tipos y restricciones, añadir reglas entre campos, rechazar campos desconocidos y obtener errores legibles al validar diccionarios y JSON.",
    before: ["API con validación manual (eng-api)", "Anotaciones de tipo", "Excepciones"],
    packages: ["pydantic"],
    intuition: [
      "En la misión de la API validaste a mano campo a campo. **Pydantic** lo hace declarando un modelo: cada atributo con su **tipo** y sus **restricciones**. FastAPI lo usa para validar automáticamente todas las peticiones.",
      "",
      "- `Field(ge=0, le=600)`, `Field(gt=0)`, `Field(pattern=...)` imponen límites.",
      "- `Literal[\"mensual\", \"anual\"]` restringe a unos valores concretos.",
      "- Pydantic **convierte** cuando es seguro (\"12\" → 12) y falla cuando no (\"doce\").",
      "- `@field_validator` normaliza o comprueba un campo; `@model_validator(mode=\"after\")` comprueba reglas **entre** campos.",
      "- `model_config = ConfigDict(extra=\"forbid\")` rechaza campos desconocidos: evita que alguien cuele `es_admin=True` en una petición (**asignación masiva**).",
      "",
      "Si algo falla, `ValidationError.errors()` da una lista con la ubicación (`loc`) y el motivo de **cada** error, no solo del primero.",
    ],
    formal: "Validar = parsear + comprobar: entrada no fiable (dict, JSON) → objeto con tipos garantizados, o lista completa de errores.",
    example: {
      code: py`from pydantic import BaseModel, Field, ValidationError
class Punto(BaseModel):
    x: int = Field(ge=0)
    y: int = 0
print(Punto(x="3"))
try:
    Punto(x=-1, y="a")
except ValidationError as e:
    print([err["loc"][0] for err in e.errors()])`,
      lines: [
        "Importamos lo necesario.",
        "Un modelo de datos.",
        "x: entero no negativo.",
        "y: entero con valor por defecto.",
        "x=3 y=0: el texto \"3\" se convierte en entero.",
        "Intentamos crear un punto inválido…",
        "…con dos errores a la vez.",
        "Si falla la validación…",
        "…obtenemos todos los campos con problemas: ['x', 'y'].",
      ],
    },
    challenge: [
      "1. `Solicitud(BaseModel)` con `extra=\"forbid\"` y los campos: `cliente_id` (texto con el patrón `^C\\d{4}$`), `antiguedad` (entero de 0 a 600), `cuota` (número > 0), `contrato` (\"mensual\", \"anual\" o \"bianual\") y `email` (texto opcional, por defecto `None`).",
      "2. Un `field_validator` para `email` que lo pase a minúsculas sin espacios y lance `ValueError` si no contiene \"@\".",
      "3. Un `model_validator(mode=\"after\")` que rechace un contrato \"bianual\" con antigüedad menor que 24.",
      "4. `validar(datos)`: tupla (solicitud, []) si es válida o (None, errores) con la lista **ordenada** de los nombres de los campos con problemas (usa \"(modelo)\" para los errores de la regla entre campos).",
      "5. `desde_json(texto)`: igual que `validar` pero recibiendo un texto JSON (`model_validate_json`).",
    ],
    starter: py`from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

class Solicitud(BaseModel):
    cliente_id: str
    antiguedad: int
    cuota: float
    contrato: str
    email: Optional[str] = None

def validar(datos):
    return Solicitud(**datos), []

def desde_json(texto):
    return None, []`,
    solution: py`from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

class Solicitud(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cliente_id: str = Field(pattern=r"^C\d{4}$")
    antiguedad: int = Field(ge=0, le=600)
    cuota: float = Field(gt=0)
    contrato: Literal["mensual", "anual", "bianual"]
    email: Optional[str] = None

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, v):
        if v is None:
            return v
        v = v.strip().lower()
        if "@" not in v:
            raise ValueError("el email debe contener @")
        return v

    @model_validator(mode="after")
    def regla_bianual(self):
        if self.contrato == "bianual" and self.antiguedad < 24:
            raise ValueError("un contrato bianual exige al menos 24 meses de antigüedad")
        return self

def _errores(e):
    return sorted(str(err["loc"][0]) if err["loc"] else "(modelo)" for err in e.errors())

def validar(datos):
    try:
        return Solicitud.model_validate(datos), []
    except ValidationError as e:
        return None, _errores(e)

def desde_json(texto):
    try:
        return Solicitud.model_validate_json(texto), []
    except ValidationError as e:
        return None, _errores(e)`,
    tests: py`
BUENA = {"cliente_id": "C0042", "antiguedad": 30, "cuota": 59.9, "contrato": "bianual", "email": "  Ana@Reino.ES "}

def test_valida():
    "Datos correctos, conversión y normalización"
    s, err = t.get("validar", "function")(dict(BUENA, antiguedad="30"))
    assert err == [] and s.antiguedad == 30 and s.email == "ana@reino.es"
    s2, _ = t.get("validar", "function")({k: v for k, v in BUENA.items() if k != "email"})
    assert s2.email is None

def test_restricciones():
    "Cada campo con su regla"
    v = t.get("validar", "function")
    casos = {"cliente_id": "42", "antiguedad": -1, "cuota": 0, "contrato": "semanal", "email": "sin-arroba"}
    for campo, valor in casos.items():
        s, err = v(dict(BUENA, **{campo: valor}))
        assert s is None and err == [campo], (campo, err)
    s, err = v({"cliente_id": "X1", "antiguedad": 1000, "cuota": -5, "contrato": "anual"})
    assert err == ["antiguedad", "cliente_id", "cuota"], "Deben aparecer todos los errores, ordenados"

def test_regla_entre_campos():
    "Bianual con poca antigüedad"
    s, err = t.get("validar", "function")(dict(BUENA, antiguedad=12))
    assert s is None and err == ["(modelo)"]

def test_extra_prohibido():
    "Sin asignación masiva"
    s, err = t.get("validar", "function")(dict(BUENA, es_admin=True))
    assert s is None and err == ["es_admin"]

def test_json():
    "Desde JSON y vuelta"
    import json
    s, err = t.get("desde_json", "function")(json.dumps(BUENA))
    assert err == [] and json.loads(s.model_dump_json())["cliente_id"] == "C0042"
    assert t.get("desde_json", "function")('{"cliente_id": "C0001"}')[1] == ["antiguedad", "contrato", "cuota"]
`,
    hints: [
      "Restricciones: `cliente_id: str = Field(pattern=r\"^C\\d{4}$\")`, `antiguedad: int = Field(ge=0, le=600)`, `cuota: float = Field(gt=0)`, `contrato: Literal[...]`.",
      "Los validadores de campo llevan `@field_validator(\"email\")` y `@classmethod`; el de modelo, `@model_validator(mode=\"after\")` y devuelve `self`.",
      "En `ValidationError.errors()`, cada error tiene `loc`: una tupla vacía para los errores del modelo completo.",
    ],
    errors: [
      { error: "Aceptar campos extra en silencio", fix: "Un cliente podría enviar `es_admin: true`. Con `extra=\"forbid\"` se rechaza." },
      { error: "Validar solo el primer error", fix: "Devolver todos los errores a la vez ahorra idas y vueltas a quien usa la API." },
      { error: "Confiar en que los tipos de Python se comprueban solos", fix: "Las anotaciones no se verifican en ejecución: hace falta una herramienta como Pydantic (o comprobaciones manuales)." },
    ],
    quiz: {
      question: "Una petición envía `\"antiguedad\": \"30\"` (texto). Pydantic la acepta como 30. ¿Es un problema?",
      options: [
        { text: "No en este caso: la conversión es segura y explícita; si se quiere rechazar cualquier conversión, existe el modo estricto (strict=True)" },
        { text: "Sí: Pydantic debería rechazar siempre los textos" },
        { text: "Sí: significa que Pydantic no valida los tipos" },
        { text: "No importa porque las anotaciones de tipo ya lo garantizan" },
      ],
      answer: 0,
      explanation: "Pydantic convierte por defecto cuando no hay pérdida de información (\"30\" → 30) y falla en lo demás (\"treinta\"). Si el contrato de la API exige el tipo exacto, se activa el modo estricto.",
    },
    review: "Repasa: Field con límites, Literal, field_validator, model_validator, extra=\"forbid\" y errores completos con loc.",
    xp: 90,
    coins: 13,
  },
  {
    id: "eng-arquitectura",
    world: "w8",
    zone: "Calidad y rendimiento",
    title: "Los pisos de la torre: arquitectura en capas, inyección de dependencias y dobles de prueba",
    kind: "lesson",
    difficulty: 4,
    skills: ["arquitectura", "pruebas", "sql", "diseno-software"],
    requires: ["eng-pydantic", "db-sql"],
    story: "La torre ha crecido sin planos: la lógica de negocio llama directamente a la base de datos, al reloj y al servicio de correo, y nadie se atreve a tocarla porque no se puede probar. Vas a reconstruirla por pisos.",
    objective: "Separar la lógica de negocio del almacenamiento y de los servicios externos, inyectar las dependencias y probar el mismo servicio con un repositorio en memoria, uno en SQLite y dobles de prueba.",
    before: ["Clases", "SQL con sqlite3 (db-sql)", "Pruebas automáticas (w2-pruebas)"],
    intuition: [
      "Una arquitectura en **capas** separa responsabilidades:",
      "",
      "- **Dominio**: los datos y las reglas (un `Pedido` con importe positivo).",
      "- **Repositorio**: cómo se guarda (en memoria, SQLite, PostgreSQL…). Todos ofrecen los mismos métodos.",
      "- **Servicio**: los casos de uso (crear un pedido, calcular el total de un cliente). No sabe qué repositorio usa.",
      "",
      "**Inyección de dependencias**: el servicio recibe el repositorio, el reloj y el notificador en su constructor en lugar de crearlos. Así, en las pruebas se le pasan **dobles**: un reloj fijo (resultados reproducibles) y un notificador «espía» que registra a quién habría avisado, sin enviar nada.",
      "",
      "Las **pruebas de contrato** ejecutan las mismas comprobaciones con cada repositorio: si las dos implementaciones pasan, son intercambiables.",
    ],
    formal: "Dependencias hacia dentro: Servicio → interfaz Repositorio ← (RepositorioMemoria | RepositorioSQLite). El dominio no importa nada de la infraestructura.",
    example: {
      code: py`from datetime import datetime
class RelojFijo:
    def ahora(self):
        return datetime(2025, 1, 15, 10, 30)
class Saludo:
    def __init__(self, reloj):
        self.reloj = reloj
    def mensaje(self):
        return "Buenos días" if self.reloj.ahora().hour < 12 else "Buenas tardes"
print(Saludo(RelojFijo()).mensaje())`,
      lines: [
        "Fechas de la biblioteca estándar.",
        "Un reloj de mentira para las pruebas…",
        "…con el mismo método que tendría el real…",
        "…que siempre devuelve la misma hora.",
        "Una clase que depende de la hora.",
        "Recibe el reloj en lugar de llamar a datetime.now()…",
        "…y lo guarda.",
        "Su lógica…",
        "…usa el reloj inyectado.",
        "Buenos días: el resultado es reproducible en cualquier momento.",
      ],
    },
    challenge: [
      "1. `@dataclass Pedido` con `id`, `cliente`, `importe` y `fecha` (texto ISO).",
      "2. `RepositorioMemoria` y `RepositorioSQLite(ruta=\":memory:\")` con los métodos `guardar(pedido)`, `obtener(id)` (None si no existe) y `por_cliente(cliente)` (lista ordenada por id). La versión SQLite crea la tabla `pedidos` y usa consultas con parámetros.",
      "3. `ServicioPedidos(repo, reloj, notificador, umbral_aviso=1000)` con `crear(cliente, importe)`: lanza `ValueError` si el importe no es positivo; asigna ids consecutivos desde 1; fecha = `reloj.ahora().isoformat()`; guarda el pedido; si el importe supera el umbral, llama a `notificador.avisar(cliente, importe)`; devuelve el pedido. Y `total(cliente)`.",
      "4. `RelojFijo` (método `ahora()` con una fecha fija) y `NotificadorEspia` (guarda en `self.avisos` una lista de tuplas (cliente, importe)).",
    ],
    starter: py`import sqlite3
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Pedido:
    id: int
    cliente: str
    importe: float
    fecha: str

class RepositorioMemoria:
    def guardar(self, pedido):
        pass

class RepositorioSQLite:
    def __init__(self, ruta=":memory:"):
        self.con = sqlite3.connect(ruta)

class ServicioPedidos:
    def __init__(self, repo, reloj, notificador, umbral_aviso=1000):
        self.repo = repo

    def crear(self, cliente, importe):
        return Pedido(0, cliente, importe, str(datetime.now()))

class RelojFijo:
    pass

class NotificadorEspia:
    pass`,
    solution: py`import sqlite3
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Pedido:
    id: int
    cliente: str
    importe: float
    fecha: str

class RepositorioMemoria:
    def __init__(self):
        self._datos = {}

    def guardar(self, pedido):
        self._datos[pedido.id] = pedido

    def obtener(self, id):
        return self._datos.get(id)

    def por_cliente(self, cliente):
        return sorted((p for p in self._datos.values() if p.cliente == cliente), key=lambda p: p.id)

class RepositorioSQLite:
    def __init__(self, ruta=":memory:"):
        self.con = sqlite3.connect(ruta)
        self.con.execute("CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY, cliente TEXT, importe REAL, fecha TEXT)")

    def guardar(self, pedido):
        self.con.execute("INSERT OR REPLACE INTO pedidos VALUES (?, ?, ?, ?)", (pedido.id, pedido.cliente, pedido.importe, pedido.fecha))
        self.con.commit()

    def obtener(self, id):
        fila = self.con.execute("SELECT id, cliente, importe, fecha FROM pedidos WHERE id = ?", (id,)).fetchone()
        return Pedido(*fila) if fila else None

    def por_cliente(self, cliente):
        filas = self.con.execute("SELECT id, cliente, importe, fecha FROM pedidos WHERE cliente = ? ORDER BY id", (cliente,)).fetchall()
        return [Pedido(*f) for f in filas]

class ServicioPedidos:
    def __init__(self, repo, reloj, notificador, umbral_aviso=1000):
        self.repo, self.reloj, self.notificador, self.umbral = repo, reloj, notificador, umbral_aviso
        self._siguiente = 1

    def crear(self, cliente, importe):
        if importe <= 0:
            raise ValueError("El importe debe ser positivo")
        pedido = Pedido(self._siguiente, cliente, float(importe), self.reloj.ahora().isoformat())
        self._siguiente += 1
        self.repo.guardar(pedido)
        if importe > self.umbral:
            self.notificador.avisar(cliente, importe)
        return pedido

    def total(self, cliente):
        return sum(p.importe for p in self.repo.por_cliente(cliente))

class RelojFijo:
    def __init__(self, momento=datetime(2025, 3, 1, 9, 0)):
        self.momento = momento

    def ahora(self):
        return self.momento

class NotificadorEspia:
    def __init__(self):
        self.avisos = []

    def avisar(self, cliente, importe):
        self.avisos.append((cliente, importe))`,
    tests: py`
from datetime import datetime

def _servicio(repo):
    S = t.get("ServicioPedidos")
    reloj = t.get("RelojFijo")()
    espia = t.get("NotificadorEspia")()
    return S(repo, reloj, espia), reloj, espia

def _contrato(repo):
    s, reloj, espia = _servicio(repo)
    p1 = s.crear("ana", 120)
    p2 = s.crear("luis", 1500)
    p3 = s.crear("ana", 30.5)
    assert (p1.id, p2.id, p3.id) == (1, 2, 3)
    assert p1.fecha == reloj.ahora().isoformat()
    assert repo.obtener(2).cliente == "luis" and repo.obtener(99) is None
    assert [p.id for p in repo.por_cliente("ana")] == [1, 3]
    assert approx(s.total("ana"), 150.5) and s.total("nadie") == 0
    assert espia.avisos == [("luis", 1500)]
    try:
        s.crear("ana", 0)
    except ValueError:
        return
    assert False, "Un importe no positivo debe lanzar ValueError"

def test_memoria():
    "El servicio con el repositorio en memoria"
    _contrato(t.get("RepositorioMemoria")())

def test_sqlite():
    "El mismo contrato con SQLite"
    repo = t.get("RepositorioSQLite")()
    _contrato(repo)
    assert repo.con.execute("SELECT COUNT(*) FROM pedidos").fetchone()[0] == 3

def test_dobles():
    "Reloj fijo y espía"
    r = t.get("RelojFijo")()
    assert isinstance(r.ahora(), datetime) and r.ahora() == r.ahora()
    e = t.get("NotificadorEspia")()
    e.avisar("x", 5)
    assert e.avisos == [("x", 5)]

def test_inyeccion():
    "El servicio usa lo que se le inyecta"
    class Reloj2:
        def ahora(self):
            return datetime(2030, 1, 1)
    s = t.get("ServicioPedidos")(t.get("RepositorioMemoria")(), Reloj2(), t.get("NotificadorEspia")(), umbral_aviso=10)
    p = s.crear("eva", 50)
    assert p.fecha.startswith("2030-01-01") and s.notificador.avisos == [("eva", 50)]
    assert "datetime.now" not in t.code, "No llames al reloj del sistema: inyéctalo"
`,
    hints: [
      "Los dos repositorios deben tener exactamente los mismos métodos; en SQLite, `INSERT OR REPLACE` con `?` y `SELECT ... WHERE cliente = ? ORDER BY id`.",
      "El servicio guarda en atributos lo que recibe y nunca crea él mismo el repositorio, el reloj ni el notificador.",
      "Convierte las filas de SQLite en `Pedido(*fila)`.",
    ],
    errors: [
      { error: "Llamar a datetime.now() dentro del servicio", fix: "Los resultados dependerían de cuándo se ejecuta la prueba. Inyecta un reloj." },
      { error: "Que el servicio construya su propia conexión a la base de datos", fix: "Quedaría atado a SQLite y sería imposible probarlo con otro repositorio." },
      { error: "Probar el notificador enviando correos de verdad", fix: "Un espía registra las llamadas: la prueba es rápida, reproducible y no molesta a nadie." },
    ],
    quiz: {
      question: "¿Qué ganas al inyectar el repositorio en el servicio en lugar de crearlo dentro?",
      options: [
        { text: "Puedes cambiar el almacenamiento (memoria, SQLite, PostgreSQL) y probar la lógica sin una base de datos real, sin tocar el servicio" },
        { text: "El código se ejecuta más rápido en producción" },
        { text: "Ya no hacen falta pruebas" },
        { text: "Python lo exige para usar clases" },
      ],
      answer: 0,
      explanation: "La inyección de dependencias desacopla la lógica de negocio de los detalles de infraestructura. El resultado: piezas intercambiables y pruebas rápidas y deterministas.",
    },
    review: "Repasa: capas (dominio, repositorio, servicio); inyectar reloj y servicios externos; dobles de prueba; pruebas de contrato para implementaciones intercambiables.",
    xp: 100,
    coins: 15,
  },
];
