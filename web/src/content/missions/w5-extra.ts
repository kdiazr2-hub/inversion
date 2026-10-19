import { py, type Mission } from "../types";

// Mundo 5 · más lecciones de la Ciudad de los Datos Reales: SQL analítico, diseño de bases de
// datos, scraping responsable, datos anidados y calidad de datos. Sin red: los sitios web y las
// respuestas se simulan con archivos locales.

const VENTAS = py`VENTAS = [
    ("Ana", "norte", "2025-01", 120.0), ("Ana", "norte", "2025-02", 90.0), ("Ana", "norte", "2025-03", 150.0),
    ("Bruno", "norte", "2025-01", 200.0), ("Bruno", "norte", "2025-03", 80.0),
    ("Carla", "sur", "2025-01", 60.0), ("Carla", "sur", "2025-02", 130.0), ("Carla", "sur", "2025-03", 110.0),
    ("Dario", "sur", "2025-02", 300.0),
    ("Elena", "sur", "2025-01", 70.0), ("Elena", "sur", "2025-02", 70.0), ("Elena", "sur", "2025-03", 150.0),
]


def crear_bd(filas):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE ventas (vendedor TEXT, region TEXT, mes TEXT, importe REAL)")
    con.executemany("INSERT INTO ventas VALUES (?, ?, ?, ?)", filas)
    return con`;

const ROBOTS = `User-agent: *
Disallow: /privado/
Crawl-delay: 2

User-agent: CopiaTodoBot
Disallow: /
`;

const SITIO: Record<string, string> = {
  "catalogo.html": `<html><head><title>Tienda</title></head><body>
<h1>Catálogo</h1>
<table id="productos">
<tr><th>Nombre</th><th>Precio</th><th>Stock</th></tr>
<tr class="producto"><td>Linterna</td><td>12,50 €</td><td>8</td></tr>
<tr class="producto"><td>Brújula</td><td>8,90 €</td><td>0</td></tr>
<tr class="anuncio"><td colspan="3">¡Oferta de la semana!</td></tr>
<tr class="producto"><td>Mapa antiguo</td><td>1.250,00 €</td><td>1</td></tr>
</table>
<a rel="next" href="catalogo_2.html">Siguiente</a>
</body></html>
`,
  "catalogo_2.html": `<html><body>
<table id="productos">
<tr><th>Nombre</th><th>Precio</th><th>Stock</th></tr>
<tr class="producto"><td>Cuerda (20 m)</td><td>15,00 €</td><td>12</td></tr>
<tr class="producto"><td>Cantimplora</td><td>9,99 €</td><td>3</td></tr>
</table>
<a rel="next" href="privado/ofertas.html">Siguiente</a>
</body></html>
`,
  "privado_ofertas.html": `<html><body><table><tr class="producto"><td>Secreto</td><td>1,00 €</td><td>99</td></tr></table></body></html>
`,
};

const LEER_SITIO = py`# Sin red: el sitio se simula con archivos locales (ruta en la web -> archivo).
ARCHIVOS = {"catalogo.html": "catalogo.html", "catalogo_2.html": "catalogo_2.html", "privado/ofertas.html": "privado_ofertas.html"}
SITIO = {}
for ruta, archivo in ARCHIVOS.items():
    with open(archivo, encoding="utf-8") as f:
        SITIO[ruta] = f.read()
with open("robots.txt", encoding="utf-8") as f:
    ROBOTS = f.read()
BASE = "https://tienda.ejemplo/"`;

const PEDIDOS_JSON = JSON.stringify(
  [
    { id: 101, fecha: "2025-03-01", cliente: { id: 7, nombre: "Ada", ciudad: "Lima" }, lineas: [{ producto: "pan", cantidad: 2, precio: 1.2 }, { producto: "queso", cantidad: 1, precio: 6.5 }] },
    { id: 102, fecha: "2025-03-01", cliente: { id: 9, nombre: "Lin", ciudad: "Quito" }, lineas: [{ producto: "café", cantidad: 3, precio: 4.0 }] },
    { id: 103, fecha: "2025-03-02", cliente: { id: 7, nombre: "Ada", ciudad: "Lima" }, lineas: [] },
    { id: 104, fecha: "2025-03-02", cliente: { id: 12, nombre: "Eva", ciudad: null }, lineas: [{ producto: "pan", cantidad: 5, precio: 1.2 }, { producto: "aceite", cantidad: 1, precio: 9.75 }] },
  ],
  null,
  1,
);

const REGISTROS_CSV = `id,fecha,cliente,categoria,importe
1,2025-04-01,C01,libros,25.50
2,2025-04-01,C02,juegos,40
3,2025-04-02,C99,libros,12.00
3,2025-04-02,C01,musica,8.75
4,2025-13-02,C03,libros,19.90
5,2025-04-03,C02,ropa,30
6,2025-04-03,C03,juegos,-5
7,2025-04-04,,libros,14
8,2025-04-04,C01,musica,abc
9,2025-04-05,C03,musica,22.10
`;

export const W5_EXTRA: Mission[] = [
  {
    id: "db-ventanas",
    world: "w5",
    zone: "Bases de datos",
    title: "Las torres de vigía: CTE y funciones de ventana",
    kind: "lesson",
    difficulty: 4,
    skills: ["sql", "analitica"],
    requires: ["db-joins"],
    story: "Desde las torres de vigía se ve toda la ciudad sin perder de vista cada calle. Las funciones de ventana de SQL hacen lo mismo: calculan sobre un grupo de filas sin colapsarlas en una sola.",
    objective: "Escribir consultas con `WITH` (CTE) y funciones de ventana: `RANK`, `ROW_NUMBER`, `SUM(...) OVER` y `LAG`, con `PARTITION BY` y `ORDER BY`.",
    before: ["SELECT, WHERE y GROUP BY", "JOIN"],
    packages: ["sqlite3"],
    intuition: [
      "`GROUP BY` **colapsa** cada grupo en una fila. Una **función de ventana** calcula sobre un grupo de filas pero **conserva cada fila**:",
      "",
      "```sql",
      "SELECT vendedor, mes, importe,",
      "       SUM(importe) OVER (PARTITION BY vendedor ORDER BY mes) AS acumulado",
      "FROM ventas",
      "```",
      "",
      "- `PARTITION BY` decide el grupo (como GROUP BY, pero sin colapsar); `ORDER BY` dentro de `OVER` fija el orden de las filas en la ventana.",
      "- `ROW_NUMBER()` numera 1, 2, 3…; `RANK()` da el mismo puesto a los empates y **salta** (1, 1, 3); `DENSE_RANK()` no salta (1, 1, 2).",
      "- `LAG(x)` trae el valor de la **fila anterior** de la ventana; `LEAD(x)`, el de la siguiente. Ojo: es la fila anterior, no «el mes anterior»: si falta un mes, la comparación salta un hueco.",
      "- Una **CTE** (`WITH nombre AS (SELECT …)`) es una consulta con nombre que la siguiente usa como si fuera una tabla. Hace legibles las consultas por pasos.",
    ],
    example: {
      code: py`import sqlite3
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE notas (alumno TEXT, nota REAL)")
con.executemany("INSERT INTO notas VALUES (?, ?)", [("Ada", 8.5), ("Lin", 6.0), ("Eva", 9.1), ("Max", 6.0)])
for fila in con.execute("SELECT alumno, nota, RANK() OVER (ORDER BY nota DESC) AS puesto FROM notas"):
    print(fila)`,
      lines: [
        "Módulo de SQLite.",
        "Base de datos en memoria.",
        "Una tabla de notas.",
        "Cuatro alumnos; Lin y Max empatan con 6.0.",
        "RANK sobre toda la tabla, de mayor a menor nota.",
        "Muestra ('Eva', 9.1, 1), ('Ada', 8.5, 2), ('Lin', 6.0, 3) y ('Max', 6.0, 3): los empates comparten puesto.",
      ],
    },
    challenge: [
      "La tabla `ventas(vendedor, region, mes, importe)` tiene una fila por vendedor y mes (no todos venden todos los meses).",
      "",
      "1. `ranking_por_region(con)`: con una CTE que sume el importe por región y vendedor, devuelve tuplas `(region, vendedor, total, puesto)` donde `puesto` es el `RANK()` del vendedor dentro de su región por total descendente. Ordena por región, puesto y vendedor.",
      "2. `acumulado(con, vendedor)`: tuplas `(mes, importe, acumulado)` de ese vendedor por mes, con el total acumulado hasta ese mes.",
      "3. `variacion(con)`: tuplas `(vendedor, mes, cambio)` con la diferencia entre el importe de cada fila y el de la fila anterior del mismo vendedor (`None` en su primera fila), ordenadas por vendedor y mes.",
    ],
    starter: py`import sqlite3

${VENTAS}


def ranking_por_region(con):
    return []


def acumulado(con, vendedor):
    return []


def variacion(con):
    return []
`,
    solution: py`import sqlite3

${VENTAS}


def ranking_por_region(con):
    sql = """
    WITH totales AS (
        SELECT region, vendedor, SUM(importe) AS total
        FROM ventas GROUP BY region, vendedor
    )
    SELECT region, vendedor, total,
           RANK() OVER (PARTITION BY region ORDER BY total DESC) AS puesto
    FROM totales
    ORDER BY region, puesto, vendedor
    """
    return con.execute(sql).fetchall()


def acumulado(con, vendedor):
    sql = """
    SELECT mes, importe, SUM(importe) OVER (ORDER BY mes) AS acumulado
    FROM ventas WHERE vendedor = ? ORDER BY mes
    """
    return con.execute(sql, (vendedor,)).fetchall()


def variacion(con):
    sql = """
    SELECT vendedor, mes,
           importe - LAG(importe) OVER (PARTITION BY vendedor ORDER BY mes) AS cambio
    FROM ventas ORDER BY vendedor, mes
    """
    return con.execute(sql).fetchall()


con = crear_bd(VENTAS)
print(ranking_por_region(con))
print(acumulado(con, "Elena"))
`,
    tests: py`
from itertools import groupby


def _con():
    return t.get("crear_bd", "function")(t.get("VENTAS"))


def test_ranking():
    "RANK por región con empates"
    r = t.get("ranking_por_region", "function")(_con())
    assert r == [("norte", "Ana", 360.0, 1), ("norte", "Bruno", 280.0, 2), ("sur", "Carla", 300.0, 1), ("sur", "Dario", 300.0, 1), ("sur", "Elena", 290.0, 3)], f"Obtuviste {r}. Recuerda: RANK repite el puesto en los empates y después salta."


def test_ranking_otros_datos():
    "El ranking funciona con otros datos"
    filas = [("X", "a", "2025-01", 5.0), ("Y", "a", "2025-01", 9.0), ("Y", "a", "2025-02", 1.0), ("Z", "b", "2025-01", 4.0)]
    r = t.get("ranking_por_region")(t.get("crear_bd")(filas))
    assert r == [("a", "Y", 10.0, 1), ("a", "X", 5.0, 2), ("b", "Z", 4.0, 1)], f"Con otros datos obtuviste {r}."


def test_acumulado():
    "Total acumulado por mes"
    f = t.get("acumulado", "function")
    con = _con()
    for vendedor in ("Ana", "Elena", "Dario"):
        filas = sorted([v for v in t.get("VENTAS") if v[0] == vendedor], key=lambda v: v[2])
        esperado, suma = [], 0.0
        for v in filas:
            suma += v[3]
            esperado.append((v[2], v[3], suma))
        r = f(con, vendedor)
        assert r == esperado, f"acumulado(con, {vendedor!r}) debería ser {esperado}, pero es {r}."


def test_variacion():
    "LAG por vendedor"
    r = t.get("variacion", "function")(_con())
    esperado = []
    for vendedor, grupo in groupby(sorted(t.get("VENTAS"), key=lambda v: (v[0], v[2])), key=lambda v: v[0]):
        anterior = None
        for v in grupo:
            esperado.append((vendedor, v[2], None if anterior is None else v[3] - anterior))
            anterior = v[3]
    assert r == esperado, f"Se esperaba {esperado}, pero obtuviste {r}."


def test_usa_ventanas():
    "Usa funciones de ventana"
    codigo = t.code.upper()
    assert "OVER" in codigo and "RANK" in codigo and "LAG" in codigo, "Resuélvelo con funciones de ventana (RANK, SUM ... OVER, LAG)."
    assert "WITH" in codigo, "Usa una CTE (WITH ... AS) para el total por vendedor."
`,
    hints: [
      "Primero la CTE: `WITH totales AS (SELECT region, vendedor, SUM(importe) AS total FROM ventas GROUP BY region, vendedor)`; después `SELECT … RANK() OVER (PARTITION BY region ORDER BY total DESC) … FROM totales`.",
      "Acumulado: `SUM(importe) OVER (ORDER BY mes)` con `WHERE vendedor = ?`.",
      "Variación: `importe - LAG(importe) OVER (PARTITION BY vendedor ORDER BY mes)`; restar a NULL da NULL, que Python recibe como None.",
    ],
    errors: [
      { error: "misuse of window function / no such function", fix: "Las funciones de ventana necesitan `OVER (...)` justo detrás. Están disponibles desde SQLite 3.25." },
      { error: "Usar GROUP BY en lugar de una ventana", fix: "GROUP BY deja una fila por grupo; si necesitas conservar cada fila (acumulados, ranking, fila anterior), usa OVER." },
      { error: "Suponer que LAG trae «el mes anterior»", fix: "Trae la fila anterior de la ventana. Bruno no vendió en febrero: su cambio de marzo se calcula contra enero." },
    ],
    quiz: {
      question: "Tres vendedores empatan en el primer puesto de su región. ¿Qué puesto da RANK() al siguiente?",
      options: [{ text: "4: RANK salta los puestos ocupados por los empates" }, { text: "2: RANK nunca deja huecos" }, { text: "1: todos comparten puesto" }, { text: "Depende de ROW_NUMBER" }],
      answer: 0,
      explanation: "RANK da 1, 1, 1 y después 4. DENSE_RANK daría 2. ROW_NUMBER no admite empates: numera 1, 2, 3, 4 en un orden arbitrario entre los empatados.",
    },
    review: "Escribe de memoria una consulta con PARTITION BY y explica la diferencia entre RANK, DENSE_RANK y ROW_NUMBER.",
    xp: 95,
    coins: 13,
  },
  {
    id: "db-diseno",
    world: "w5",
    zone: "Bases de datos",
    title: "Los cimientos de la biblioteca: claves, restricciones y transacciones",
    kind: "lesson",
    difficulty: 4,
    skills: ["sql", "bases-de-datos", "integridad"],
    requires: ["db-sql"],
    story: "La biblioteca municipal quiere un catálogo que no admita disparates: libros de autores inexistentes, años imposibles o registros a medias. La base de datos puede proteger esas reglas por sí misma.",
    objective: "Diseñar tablas con claves primarias y foráneas, restricciones `NOT NULL`, `UNIQUE` y `CHECK`, y agrupar operaciones en transacciones que se aplican enteras o no se aplican.",
    before: ["SQL con SQLite", "Excepciones"],
    packages: ["sqlite3"],
    intuition: [
      "Un buen diseño guarda **cada dato una sola vez** (normalización): los autores en una tabla y los libros en otra que apunta al autor por su id. Así, corregir un nombre se hace en un solo sitio.",
      "",
      "- **Clave primaria** (`PRIMARY KEY`): identifica cada fila.",
      "- **Clave foránea** (`REFERENCES autores(id)`): un libro solo puede apuntar a un autor que exista. En SQLite hay que activarlas en cada conexión con `PRAGMA foreign_keys = ON`.",
      "- `NOT NULL`, `UNIQUE` y `CHECK (anio BETWEEN 1400 AND 2100)` rechazan datos imposibles con un `sqlite3.IntegrityError`.",
      "",
      "Una **transacción** agrupa operaciones: o se aplican todas o ninguna. En Python, `with con:` hace `commit` si el bloque termina bien y `rollback` si lanza una excepción.",
      "",
      "Cuidado: `sqlite3` abre la transacción automáticamente con el primer `INSERT`/`UPDATE`. Si no haces `commit` de lo anterior, un `rollback` posterior también lo deshace.",
    ],
    example: {
      code: py`import sqlite3
c = sqlite3.connect(":memory:")
c.execute("CREATE TABLE cuentas (titular TEXT PRIMARY KEY, saldo REAL CHECK (saldo >= 0))")
c.executemany("INSERT INTO cuentas VALUES (?, ?)", [("Ada", 100), ("Lin", 20)])
c.commit()
try:
    with c:
        c.execute("UPDATE cuentas SET saldo = saldo + 50 WHERE titular = 'Lin'")
        c.execute("UPDATE cuentas SET saldo = saldo - 500 WHERE titular = 'Ada'")
except sqlite3.IntegrityError as e:
    print("Transacción deshecha:", e)
print(c.execute("SELECT * FROM cuentas ORDER BY titular").fetchall())`,
      lines: [
        "Módulo de SQLite.",
        "Base de datos en memoria.",
        "El saldo nunca puede ser negativo (CHECK).",
        "Dos cuentas iniciales.",
        "Confirma esos datos: sin commit, un rollback posterior también los borraría.",
        "Intentamos una operación de dos pasos…",
        "…dentro de una transacción.",
        "Primer paso: Lin recibe 50.",
        "Segundo paso: Ada quedaría en −400 y el CHECK lo rechaza.",
        "La excepción deshace la transacción entera…",
        "…y se informa: «Transacción deshecha: CHECK constraint failed: saldo >= 0».",
        "[('Ada', 100.0), ('Lin', 20.0)]: Lin tampoco recibió sus 50.",
      ],
    },
    challenge: [
      "1. `crear_esquema()`: devuelve una conexión en memoria con las claves foráneas activadas y dos tablas:",
      "   - `autores(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL UNIQUE)`",
      "   - `libros(id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, autor_id INTEGER NOT NULL REFERENCES autores(id), anio INTEGER CHECK (anio BETWEEN 1400 AND 2100), UNIQUE (titulo, autor_id))`",
      "2. `registrar_libro(con, titulo, autor, anio)`: en **una** transacción, crea el autor si no existe e inserta el libro. Devuelve `True` si todo fue bien; si alguna restricción falla, devuelve `False` y **no deja nada a medias** (tampoco el autor nuevo).",
      "3. `libros_de(con, autor)`: lista de títulos de ese autor ordenada por año y título.",
    ],
    starter: py`import sqlite3


def crear_esquema():
    con = sqlite3.connect(":memory:")
    return con


def registrar_libro(con, titulo, autor, anio):
    return False


def libros_de(con, autor):
    return []
`,
    solution: py`import sqlite3


def crear_esquema():
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript("""
    CREATE TABLE autores (
        id INTEGER PRIMARY KEY,
        nombre TEXT NOT NULL UNIQUE
    );
    CREATE TABLE libros (
        id INTEGER PRIMARY KEY,
        titulo TEXT NOT NULL,
        autor_id INTEGER NOT NULL REFERENCES autores(id),
        anio INTEGER CHECK (anio BETWEEN 1400 AND 2100),
        UNIQUE (titulo, autor_id)
    );
    """)
    return con


def registrar_libro(con, titulo, autor, anio):
    try:
        with con:
            con.execute("INSERT OR IGNORE INTO autores (nombre) VALUES (?)", (autor,))
            autor_id = con.execute("SELECT id FROM autores WHERE nombre = ?", (autor,)).fetchone()[0]
            con.execute("INSERT INTO libros (titulo, autor_id, anio) VALUES (?, ?, ?)", (titulo, autor_id, anio))
        return True
    except sqlite3.IntegrityError:
        return False


def libros_de(con, autor):
    sql = """SELECT l.titulo FROM libros l JOIN autores a ON a.id = l.autor_id
             WHERE a.nombre = ? ORDER BY l.anio, l.titulo"""
    return [fila[0] for fila in con.execute(sql, (autor,))]


con = crear_esquema()
print(registrar_libro(con, "Rayuela", "Julio Cortázar", 1963), registrar_libro(con, "Ficciones", "Jorge Luis Borges", 3000))
print(libros_de(con, "Julio Cortázar"))
`,
    tests: py`
import sqlite3


def test_esquema():
    "Tablas, columnas y claves foráneas activas"
    con = t.get("crear_esquema", "function")()
    cols = {tabla: [c[1] for c in con.execute(f"PRAGMA table_info({tabla})")] for tabla in ("autores", "libros")}
    assert cols == {"autores": ["id", "nombre"], "libros": ["id", "titulo", "autor_id", "anio"]}, f"Columnas: {cols}"
    assert con.execute("PRAGMA foreign_keys").fetchone()[0] == 1, "Activa las claves foráneas con PRAGMA foreign_keys = ON."
    try:
        con.execute("INSERT INTO libros (titulo, autor_id, anio) VALUES ('x', 99, 2000)")
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("Un libro con un autor inexistente debería rechazarse (REFERENCES autores(id)).")


def test_restricciones():
    "CHECK, UNIQUE y NOT NULL"
    con = t.get("crear_esquema")()
    con.execute("INSERT INTO autores (nombre) VALUES ('A')")
    for sql, motivo in [
        ("INSERT INTO autores (nombre) VALUES ('A')", "nombre de autor repetido (UNIQUE)"),
        ("INSERT INTO autores (nombre) VALUES (NULL)", "autor sin nombre (NOT NULL)"),
        ("INSERT INTO libros (titulo, autor_id, anio) VALUES ('t', 1, 1200)", "año fuera de rango (CHECK)"),
        ("INSERT INTO libros (titulo, autor_id, anio) VALUES (NULL, 1, 2000)", "libro sin título (NOT NULL)"),
    ]:
        try:
            con.execute(sql)
        except sqlite3.IntegrityError:
            continue
        raise AssertionError(f"Debería rechazarse: {motivo}.")


def test_registrar():
    "Registrar libros y consultar"
    con = t.get("crear_esquema")()
    reg = t.get("registrar_libro", "function")
    assert reg(con, "Rayuela", "Julio Cortázar", 1963) is True
    assert reg(con, "Bestiario", "Julio Cortázar", 1951) is True
    assert reg(con, "Rayuela", "Julio Cortázar", 1963) is False, "El mismo título del mismo autor debería rechazarse."
    assert con.execute("SELECT COUNT(*) FROM autores").fetchone()[0] == 1, "El autor no debe duplicarse."
    assert t.get("libros_de", "function")(con, "Julio Cortázar") == ["Bestiario", "Rayuela"]
    assert t.get("libros_de")(con, "Nadie") == []


def test_todo_o_nada():
    "Si falla, no queda nada a medias"
    con = t.get("crear_esquema")()
    reg = t.get("registrar_libro")
    assert reg(con, "Ficciones", "Jorge Luis Borges", 3000) is False
    autores = con.execute("SELECT COUNT(*) FROM autores").fetchone()[0]
    assert autores == 0, "Al fallar el libro, el autor nuevo también debe deshacerse: usa una sola transacción (with con:)."
    assert reg(con, "Ficciones", "Jorge Luis Borges", 1944) is True
    assert reg(con, "El Aleph", "Jorge Luis Borges", 1949) is True
    assert t.get("libros_de")(con, "Jorge Luis Borges") == ["Ficciones", "El Aleph"]
`,
    hints: [
      "En `crear_esquema`, ejecuta `PRAGMA foreign_keys = ON` y crea las tablas con `executescript`.",
      "En `registrar_libro`: `INSERT OR IGNORE INTO autores` (no falla si ya existe), busca su id y luego inserta el libro, todo dentro de `with con:`.",
      "Envuelve el `with con:` en `try/except sqlite3.IntegrityError` para devolver False: la transacción ya se habrá deshecho.",
    ],
    errors: [
      { error: "El libro con autor inexistente se inserta sin error", fix: "En SQLite las claves foráneas vienen desactivadas: `PRAGMA foreign_keys = ON` en cada conexión." },
      { error: "Queda un autor sin libros tras un error", fix: "Inserta autor y libro en la misma transacción (`with con:`) para que un fallo deshaga los dos." },
      { error: "Un rollback borra datos que creías guardados", fix: "Haz `commit` (o usa `with con:`) tras cada operación que deba quedar: lo no confirmado se deshace con el siguiente rollback." },
    ],
    quiz: {
      question: "Una transferencia resta dinero de una cuenta y lo suma en otra. ¿Por qué deben ir en la misma transacción?",
      options: [
        { text: "Para que, si un paso falla, no quede el dinero restado en una cuenta y sin sumar en la otra" },
        { text: "Porque las transacciones hacen las consultas más rápidas" },
        { text: "Porque SQLite no permite dos UPDATE seguidos" },
      ],
      answer: 0,
      explanation: "Atomicidad: la transacción se aplica entera o no se aplica. Es la A de ACID.",
    },
    review: "Diseña de memoria dos tablas relacionadas con su clave foránea y explica qué hace `with con:` cuando hay una excepción.",
    xp: 95,
    coins: 13,
  },
  {
    id: "db-scraping",
    world: "w5",
    zone: "APIs y automatización",
    title: "El cartógrafo educado: web scraping responsable",
    kind: "lesson",
    difficulty: 4,
    skills: ["scraping", "html", "etica-datos"],
    requires: ["db-apis"],
    story: "Una tienda publica su catálogo en páginas web pero no ofrece API. Un cartógrafo educado pide permiso antes de entrar, no corre por los pasillos y solo copia lo que puede usar.",
    objective: "Leer `robots.txt` con `urllib.robotparser`, extraer datos de una tabla HTML con `html.parser`, seguir la paginación respetando las zonas prohibidas y limpiar los valores extraídos.",
    before: ["Clases", "Cadenas y conversión"],
    intuition: [
      "**Antes de rastrear** un sitio: busca si tiene API o datos descargables, lee sus condiciones de uso y su `robots.txt`, identifica tu programa con un agente propio y no satures el servidor (respeta `Crawl-delay` con `time.sleep`). Los datos personales tienen además protección legal.",
      "",
      "`robots.txt` dice qué rutas puede visitar cada agente:",
      "",
      "```",
      "User-agent: *",
      "Disallow: /privado/",
      "Crawl-delay: 2",
      "```",
      "",
      "`urllib.robotparser.RobotFileParser` lo interpreta: `rp.parse(lineas)` y después `rp.can_fetch(agente, url)` y `rp.crawl_delay(agente)`.",
      "",
      "Para extraer datos del HTML, `html.parser.HTMLParser` llama a tus métodos `handle_starttag`, `handle_data` y `handle_endtag` mientras recorre el documento. Bibliotecas como BeautifulSoup hacen lo mismo con menos código, pero la idea es la misma: localizar las etiquetas por su nombre y atributos.",
      "",
      "En el navegador no hay red: el sitio se simula con archivos locales.",
    ],
    example: {
      code: py`from html.parser import HTMLParser
class Enlaces(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.hrefs.append(dict(attrs).get("href"))
e = Enlaces()
e.feed('<p>Ver <a href="mapa.html">mapa</a> y <a href="rutas.html">rutas</a></p>')
print(e.hrefs)`,
      lines: [
        "El analizador de HTML de la biblioteca estándar.",
        "Una subclase que reunirá los enlaces.",
        "Constructor…",
        "…que inicializa el analizador base…",
        "…y una lista vacía de enlaces.",
        "Se llama con cada etiqueta de apertura y sus atributos (lista de pares).",
        "Solo interesan los enlaces <a>…",
        "…de los que guardamos el atributo href.",
        "Creamos el analizador.",
        "feed recorre el HTML y va llamando a los métodos.",
        "['mapa.html', 'rutas.html']",
      ],
    },
    challenge: [
      "El sitio simulado está en los archivos `catalogo.html`, `catalogo_2.html` y `privado_ofertas.html` (que en la web sería `privado/ofertas.html`), y su `robots.txt`. El código inicial ya los carga en `SITIO` (ruta → HTML) y `ROBOTS`.",
      "",
      "1. `permitido(robots_texto, ruta, agente=\"PythonQuestBot\")`: `True` si el agente puede visitar `BASE + ruta` según el robots.txt.",
      "2. `extraer_productos(html)`: devuelve `(productos, siguiente)`. `productos` es una lista de diccionarios `{\"nombre\", \"precio\", \"stock\"}` con las filas `<tr class=\"producto\">` (precio como número: `\"1.250,00 €\"` → `1250.0`; stock como entero). `siguiente` es el `href` del enlace `<a rel=\"next\">`, o `None`.",
      "3. `rastrear(sitio, robots_texto, inicio=\"catalogo.html\")`: sigue los enlaces «siguiente» desde `inicio` mientras la página esté permitida y no se haya visitado ya. Devuelve `(productos, visitadas)`.",
    ],
    starter: py`from html.parser import HTMLParser
from urllib.robotparser import RobotFileParser

${LEER_SITIO}


def permitido(robots_texto, ruta, agente="PythonQuestBot"):
    return True


def extraer_productos(html):
    return [], None


def rastrear(sitio, robots_texto, inicio="catalogo.html"):
    return [], []
`,
    solution: py`from html.parser import HTMLParser
from urllib.robotparser import RobotFileParser

${LEER_SITIO}


def permitido(robots_texto, ruta, agente="PythonQuestBot"):
    rp = RobotFileParser()
    rp.parse(robots_texto.splitlines())
    return rp.can_fetch(agente, BASE + ruta)


def a_numero(precio):
    return float(precio.replace("€", "").replace(".", "").replace(",", ".").strip())


class LectorProductos(HTMLParser):
    def __init__(self):
        super().__init__()
        self.productos = []
        self.siguiente = None
        self._fila = None
        self._celda = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "tr" and attrs.get("class") == "producto":
            self._fila = []
        elif tag == "td" and self._fila is not None:
            self._celda = ""
        elif tag == "a" and attrs.get("rel") == "next":
            self.siguiente = attrs.get("href")

    def handle_data(self, data):
        if self._celda is not None:
            self._celda += data

    def handle_endtag(self, tag):
        if tag == "td" and self._celda is not None:
            self._fila.append(self._celda.strip())
            self._celda = None
        elif tag == "tr" and self._fila is not None:
            nombre, precio, stock = self._fila
            self.productos.append({"nombre": nombre, "precio": a_numero(precio), "stock": int(stock)})
            self._fila = None


def extraer_productos(html):
    lector = LectorProductos()
    lector.feed(html)
    return lector.productos, lector.siguiente


def rastrear(sitio, robots_texto, inicio="catalogo.html"):
    productos, visitadas = [], []
    pagina = inicio
    while pagina is not None and pagina not in visitadas and permitido(robots_texto, pagina):
        visitadas.append(pagina)
        nuevos, pagina = extraer_productos(sitio[pagina])
        productos.extend(nuevos)
    return productos, visitadas


productos, visitadas = rastrear(SITIO, ROBOTS)
print(visitadas, len(productos))
`,
    tests: py`
def test_robots():
    "Respeta robots.txt"
    f = t.get("permitido", "function")
    robots = t.get("ROBOTS")
    assert f(robots, "catalogo.html") is True
    assert f(robots, "privado/ofertas.html") is False, "robots.txt prohíbe /privado/ a todos los agentes."
    assert f(robots, "catalogo.html", "CopiaTodoBot") is False, "CopiaTodoBot tiene prohibido todo el sitio."
    assert f("User-agent: *\nDisallow:\n", "privado/x.html") is True, "Un Disallow vacío no prohíbe nada."


def test_extraer():
    "Extrae y limpia los productos"
    productos, siguiente = t.get("extraer_productos", "function")(t.get("SITIO")["catalogo.html"])
    assert siguiente == "catalogo_2.html", f"El enlace siguiente debería ser 'catalogo_2.html', no {siguiente!r}."
    assert productos == [
        {"nombre": "Linterna", "precio": 12.5, "stock": 8},
        {"nombre": "Brújula", "precio": 8.9, "stock": 0},
        {"nombre": "Mapa antiguo", "precio": 1250.0, "stock": 1},
    ], f"Obtuviste {productos}. Ignora la fila del anuncio y convierte '1.250,00 €' en 1250.0."


def test_extraer_otro_html():
    "Funciona con otro HTML"
    html = '<table><tr class="producto"><td> Faro </td><td>3,05 €</td><td>4</td></tr></table>'
    productos, siguiente = t.get("extraer_productos")(html)
    assert productos == [{"nombre": "Faro", "precio": 3.05, "stock": 4}] and siguiente is None, f"Obtuviste {productos}, {siguiente}."


def test_rastrear():
    "Sigue la paginación sin entrar en zonas prohibidas"
    productos, visitadas = t.get("rastrear", "function")(t.get("SITIO"), t.get("ROBOTS"))
    assert visitadas == ["catalogo.html", "catalogo_2.html"], f"Visitadas: {visitadas}. La página privada no debe visitarse."
    assert [p["nombre"] for p in productos] == ["Linterna", "Brújula", "Mapa antiguo", "Cuerda (20 m)", "Cantimplora"]
    assert approx(sum(p["precio"] * p["stock"] for p in productos), 1559.97)


def test_sin_bucles_infinitos():
    "No vuelve a visitar una página"
    sitio = {"a.html": '<a rel="next" href="b.html">s</a>', "b.html": '<a rel="next" href="a.html">s</a>'}
    _, visitadas = t.get("rastrear")(sitio, "User-agent: *\nDisallow:\n", "a.html")
    assert visitadas == ["a.html", "b.html"], f"Con enlaces en círculo se esperaba ['a.html', 'b.html'], no {visitadas}."
`,
    files: { "robots.txt": ROBOTS, ...SITIO },
    hints: [
      "`rp = RobotFileParser(); rp.parse(robots_texto.splitlines()); rp.can_fetch(agente, BASE + ruta)`.",
      "En el analizador, recuerda si estás dentro de una fila de producto (`_fila`) y de una celda (`_celda`); acumula el texto en `handle_data` y guarda la fila al cerrar `</tr>`.",
      "Para el precio: quita «€», quita el punto de los miles y cambia la coma decimal por punto, en ese orden.",
    ],
    errors: [
      { error: "ValueError: could not convert string to float: '1.250,00'", fix: "En el formato español el punto separa miles y la coma los decimales: quita el punto y cambia la coma por punto." },
      { error: "El rastreador entra en /privado/", fix: "Comprueba `permitido` antes de visitar cada página, no solo la primera." },
      { error: "Bucle infinito al rastrear", fix: "Guarda las páginas visitadas y no vuelvas a una que ya está en la lista." },
    ],
    quiz: {
      question: "Un sitio no prohíbe nada en su robots.txt. ¿Puedes descargar todas sus páginas lo más rápido posible?",
      options: [
        { text: "No: hay que respetar sus condiciones de uso, no saturar el servidor y cumplir la ley de datos personales" },
        { text: "Sí: si robots.txt no lo prohíbe, todo está permitido" },
        { text: "Sí, siempre que uses un agente con nombre" },
      ],
      answer: 0,
      explanation: "robots.txt es una convención técnica, no un permiso legal. Busca primero una API o datos descargables y rastrea despacio.",
    },
    review: "Explica qué revisarías antes de rastrear un sitio y cómo localizas una tabla en el HTML.",
    xp: 95,
    coins: 13,
  },
  {
    id: "db-json-anidado",
    world: "w5",
    zone: "APIs y automatización",
    title: "Las cajas dentro de cajas: JSON anidado a tablas",
    kind: "lesson",
    difficulty: 3,
    skills: ["json", "pandas", "transformacion"],
    requires: ["db-apis"],
    story: "Los pedidos llegan de la API como cajas dentro de cajas: cada pedido trae su cliente y una lista de líneas. Para analizarlos hay que desempaquetarlos en tablas.",
    objective: "Aplanar JSON anidado con `pd.json_normalize` (objetos anidados y listas con `record_path` y `meta`), unir las tablas resultantes y tratar listas vacías y valores nulos.",
    before: ["JSON", "pandas: uniones y agrupaciones"],
    packages: ["pandas"],
    intuition: [
      "Un registro JSON anidado puede tener **objetos dentro** (el cliente de un pedido) y **listas dentro** (sus líneas). Una tabla tiene una sola fila por cosa, así que hay dos tablas naturales:",
      "",
      "- **pedidos**: una fila por pedido; los objetos anidados se convierten en columnas `cliente_id`, `cliente_nombre`… (`pd.json_normalize(datos, sep=\"_\")`).",
      "- **líneas**: una fila por línea; `pd.json_normalize(datos, record_path=\"lineas\", meta=[\"id\"])` repite el id del pedido en cada línea para poder unirlas después.",
      "",
      "Dos trampas: un pedido sin líneas **desaparece** de la tabla de líneas (y de un INNER JOIN), y un campo nulo en el JSON llega como `None`/NaN.",
    ],
    example: {
      code: py`import pandas as pd
r = pd.json_normalize([{"a": 1, "b": {"c": 2, "d": [3, 4]}}])
print(list(r.columns))`,
      lines: ["pandas.", "Un registro con un objeto anidado (b) que contiene una lista (d).", "['a', 'b.c', 'b.d']: los objetos se aplanan con punto; la lista queda tal cual en una celda."],
    },
    challenge: [
      "`pedidos.json` tiene una lista de pedidos con `id`, `fecha`, `cliente` (`id`, `nombre`, `ciudad`) y `lineas` (`producto`, `cantidad`, `precio`).",
      "",
      "1. `aplanar_pedidos(datos)`: DataFrame con exactamente las columnas `id`, `fecha`, `cliente_id`, `cliente_nombre`, `cliente_ciudad`, una fila por pedido.",
      "2. `lineas(datos)`: DataFrame con las columnas `pedido_id`, `producto`, `cantidad`, `precio`, `importe` (= cantidad · precio), una fila por línea.",
      "3. `total_por_ciudad(datos)`: diccionario ciudad → importe total redondeado a 2 decimales. Los pedidos sin líneas cuentan 0 y los clientes sin ciudad van a `\"desconocida\"`.",
    ],
    starter: py`import json
import pandas as pd

with open("pedidos.json", encoding="utf-8") as f:
    PEDIDOS = json.load(f)


def aplanar_pedidos(datos):
    return pd.DataFrame()


def lineas(datos):
    return pd.DataFrame()


def total_por_ciudad(datos):
    return {}
`,
    solution: py`import json
import pandas as pd

with open("pedidos.json", encoding="utf-8") as f:
    PEDIDOS = json.load(f)


def aplanar_pedidos(datos):
    df = pd.json_normalize(datos, sep="_")
    return df[["id", "fecha", "cliente_id", "cliente_nombre", "cliente_ciudad"]]


def lineas(datos):
    df = pd.json_normalize(datos, record_path="lineas", meta=["id"])
    df = df.rename(columns={"id": "pedido_id"})
    df["importe"] = df["cantidad"] * df["precio"]
    return df[["pedido_id", "producto", "cantidad", "precio", "importe"]]


def total_por_ciudad(datos):
    unidos = aplanar_pedidos(datos).merge(lineas(datos), left_on="id", right_on="pedido_id", how="left")
    unidos["cliente_ciudad"] = unidos["cliente_ciudad"].fillna("desconocida")
    unidos["importe"] = unidos["importe"].fillna(0)
    return unidos.groupby("cliente_ciudad")["importe"].sum().round(2).to_dict()


print(total_por_ciudad(PEDIDOS))
`,
    tests: py`
def test_pedidos():
    "Una fila por pedido con el cliente en columnas"
    df = t.get("aplanar_pedidos", "function")(t.get("PEDIDOS"))
    assert list(df.columns) == ["id", "fecha", "cliente_id", "cliente_nombre", "cliente_ciudad"], f"Columnas: {list(df.columns)}"
    assert len(df) == 4 and list(df["cliente_id"]) == [7, 9, 7, 12]


def test_lineas():
    "Una fila por línea con su pedido"
    df = t.get("lineas", "function")(t.get("PEDIDOS"))
    assert list(df.columns) == ["pedido_id", "producto", "cantidad", "precio", "importe"], f"Columnas: {list(df.columns)}"
    assert [int(x) for x in df["pedido_id"]] == [101, 101, 102, 104, 104], "El pedido 103 no tiene líneas: no aparece aquí."
    assert [round(x, 2) for x in df["importe"]] == [2.4, 6.5, 12.0, 6.0, 9.75]


def test_totales():
    "Totales por ciudad con pedidos vacíos y ciudades nulas"
    r = t.get("total_por_ciudad", "function")(t.get("PEDIDOS"))
    assert {str(k): round(float(v), 2) for k, v in r.items()} == {"Lima": 8.9, "Quito": 12.0, "desconocida": 15.75}, f"Obtuviste {r}."


def test_otros_datos():
    "Funciona con otros pedidos"
    datos = [
        {"id": 1, "fecha": "2025-01-01", "cliente": {"id": 1, "nombre": "A", "ciudad": "Cusco"}, "lineas": [{"producto": "x", "cantidad": 4, "precio": 2.5}]},
        {"id": 2, "fecha": "2025-01-02", "cliente": {"id": 2, "nombre": "B", "ciudad": "Cusco"}, "lineas": []},
    ]
    r = t.get("total_por_ciudad")(datos)
    assert {str(k): round(float(v), 2) for k, v in r.items()} == {"Cusco": 10.0}, f"Obtuviste {r}."
`,
    files: { "pedidos.json": PEDIDOS_JSON },
    hints: [
      "`pd.json_normalize(datos, sep=\"_\")` convierte `cliente.nombre` en la columna `cliente_nombre`.",
      "`pd.json_normalize(datos, record_path=\"lineas\", meta=[\"id\"])` da una fila por línea con el id del pedido; renómbralo a `pedido_id`.",
      "Une pedidos con líneas con `how=\"left\"` para no perder los pedidos sin líneas, y rellena con `fillna`.",
    ],
    errors: [
      { error: "KeyError: 'cliente_nombre'", fix: "Por defecto json_normalize usa punto (`cliente.nombre`); pasa `sep=\"_\"`." },
      { error: "Falta una ciudad en el total", fix: "Un INNER JOIN pierde los pedidos sin líneas y groupby descarta las claves nulas: usa how=\"left\" y fillna." },
    ],
    quiz: {
      question: "¿Por qué no basta con una sola tabla para pedidos con varias líneas?",
      options: [
        { text: "Porque cada pedido tiene un número variable de líneas: una fila por pedido no puede guardarlas sin repetir o anidar" },
        { text: "Porque pandas no admite más de cinco columnas" },
        { text: "Porque JSON no se puede convertir a tablas" },
      ],
      answer: 0,
      explanation: "Lo natural son dos tablas, pedidos y líneas, relacionadas por el id del pedido: lo mismo que en una base de datos normalizada.",
    },
    review: "Explica qué hacen record_path y meta en json_normalize y qué le pasa a un pedido sin líneas.",
    xp: 85,
    coins: 12,
  },
  {
    id: "db-calidad",
    world: "w5",
    zone: "APIs y automatización",
    title: "El inspector de la aduana: validar datos antes de cargarlos",
    kind: "lesson",
    difficulty: 3,
    skills: ["calidad-datos", "pandas", "validacion"],
    requires: ["db-apis"],
    story: "Ningún cargamento entra en la ciudad sin pasar por la aduana. Con los datos pasa lo mismo: antes de cargarlos se comprueban, y lo que no cumple las reglas va a cuarentena con su motivo.",
    objective: "Expresar reglas de calidad (unicidad, formato de fecha, integridad referencial, categorías permitidas, rangos), aplicarlas fila a fila, separar los registros válidos de la cuarentena e informar de cuántos fallan cada regla.",
    before: ["pandas: filtrar", "Conjuntos"],
    packages: ["pandas"],
    intuition: [
      "Un dato malo que entra en la base de datos contamina todos los informes que lo usan. Las reglas habituales:",
      "",
      "- **Unicidad**: el identificador no se repite.",
      "- **Formato**: la fecha existe (`2025-13-02` no), el importe es un número.",
      "- **Rango**: el importe no es negativo.",
      "- **Dominio**: la categoría está en la lista permitida.",
      "- **Integridad referencial**: el cliente existe.",
      "",
      "Para comprobar sin que el programa falle, lee todo como texto (`dtype=str`) y convierte con `errors=\"coerce\"`: lo que no se puede convertir queda como `NaT`/`NaN` y se detecta con `isna()`.",
      "",
      "Las filas inválidas no se borran en silencio: van a una **cuarentena** con el motivo, para corregirlas en origen.",
    ],
    example: {
      code: py`import pandas as pd
s = pd.Series(["2025-02-30", "2025-02-28", "28/02/2025"])
print(pd.to_datetime(s, format="%Y-%m-%d", errors="coerce").tolist())
print(pd.to_numeric(pd.Series(["3,5", "4.2", ""]), errors="coerce").tolist())`,
      lines: [
        "pandas.",
        "Tres fechas: una que no existe, una válida y una en otro formato.",
        "[NaT, Timestamp('2025-02-28 00:00:00'), NaT]: solo la válida con el formato exigido se convierte.",
        "[nan, 4.2, nan]: «3,5» (coma decimal) y el texto vacío no son números.",
      ],
    },
    challenge: [
      "`registros.csv` se lee con `dtype=str` y `keep_default_na=False` (todo como texto, los vacíos como \"\"). Las reglas, en este orden, están en `REGLAS`: `\"id duplicado\"` (el id aparece más de una vez: se marcan todas sus filas), `\"fecha inválida\"` (no es una fecha `AAAA-MM-DD` real), `\"cliente desconocido\"` (no está en `CLIENTES`), `\"categoría inválida\"` (no está en `CATEGORIAS`) e `\"importe inválido\"` (no es un número o es negativo).",
      "",
      "1. `problemas(df, clientes, categorias)`: lista de tuplas `(fila, regla)` —`fila` es el índice del DataFrame—, recorriendo las filas en orden y, para cada fila, las reglas en el orden de `REGLAS`.",
      "2. `separar(df, clientes, categorias)`: `(validas, cuarentena)`, dos DataFrames con las filas sin problemas y con algún problema.",
      "3. `informe(df, clientes, categorias)`: diccionario regla → número de filas que la incumplen, con todas las reglas aunque sea 0.",
    ],
    starter: py`import pandas as pd

DF = pd.read_csv("registros.csv", dtype=str, keep_default_na=False)
CLIENTES = {"C01", "C02", "C03"}
CATEGORIAS = {"libros", "juegos", "musica"}
REGLAS = ["id duplicado", "fecha inválida", "cliente desconocido", "categoría inválida", "importe inválido"]


def problemas(df, clientes, categorias):
    return []


def separar(df, clientes, categorias):
    return df, df.iloc[0:0]


def informe(df, clientes, categorias):
    return {}
`,
    solution: py`import pandas as pd

DF = pd.read_csv("registros.csv", dtype=str, keep_default_na=False)
CLIENTES = {"C01", "C02", "C03"}
CATEGORIAS = {"libros", "juegos", "musica"}
REGLAS = ["id duplicado", "fecha inválida", "cliente desconocido", "categoría inválida", "importe inválido"]


def problemas(df, clientes, categorias):
    fechas = pd.to_datetime(df["fecha"], format="%Y-%m-%d", errors="coerce")
    importes = pd.to_numeric(df["importe"], errors="coerce")
    duplicado = df["id"].duplicated(keep=False)
    salida = []
    for i in df.index:
        incumple = {
            "id duplicado": duplicado[i],
            "fecha inválida": pd.isna(fechas[i]),
            "cliente desconocido": df.at[i, "cliente"] not in clientes,
            "categoría inválida": df.at[i, "categoria"] not in categorias,
            "importe inválido": pd.isna(importes[i]) or importes[i] < 0,
        }
        for regla in REGLAS:
            if incumple[regla]:
                salida.append((i, regla))
    return salida


def separar(df, clientes, categorias):
    malas = sorted({fila for fila, _ in problemas(df, clientes, categorias)})
    return df.drop(index=malas), df.loc[malas]


def informe(df, clientes, categorias):
    conteo = {regla: 0 for regla in REGLAS}
    for _, regla in problemas(df, clientes, categorias):
        conteo[regla] += 1
    return conteo


validas, cuarentena = separar(DF, CLIENTES, CATEGORIAS)
print(len(validas), "válidas;", len(cuarentena), "en cuarentena")
print(informe(DF, CLIENTES, CATEGORIAS))
`,
    tests: py`
import io
import pandas as pd


def _args():
    return t.get("DF"), t.get("CLIENTES"), t.get("CATEGORIAS")


def test_problemas():
    "Detecta cada regla en su fila"
    r = t.get("problemas", "function")(*_args())
    esperado = [(2, "id duplicado"), (2, "cliente desconocido"), (3, "id duplicado"), (4, "fecha inválida"), (5, "categoría inválida"), (6, "importe inválido"), (7, "cliente desconocido"), (8, "importe inválido")]
    assert [(int(f), g) for f, g in r] == esperado, f"Se esperaba {esperado}, pero obtuviste {r}."


def test_separar():
    "Separa válidas y cuarentena sin perder filas"
    validas, cuarentena = t.get("separar", "function")(*_args())
    assert list(validas["id"]) == ["1", "2", "9"], f"Válidas: {list(validas['id'])}"
    assert list(cuarentena.index) == [2, 3, 4, 5, 6, 7, 8], f"Cuarentena: {list(cuarentena.index)}"
    assert len(validas) + len(cuarentena) == len(t.get("DF"))


def test_informe():
    "Cuenta todas las reglas"
    r = t.get("informe", "function")(*_args())
    assert r == {"id duplicado": 2, "fecha inválida": 1, "cliente desconocido": 2, "categoría inválida": 1, "importe inválido": 2}, f"Obtuviste {r}."


def test_datos_limpios():
    "Con datos limpios no hay problemas"
    df = pd.read_csv(io.StringIO("id,fecha,cliente,categoria,importe\n1,2024-02-29,C01,libros,0\n2,2025-12-31,C02,juegos,7.5\n"), dtype=str, keep_default_na=False)
    assert t.get("problemas")(df, {"C01", "C02"}, {"libros", "juegos"}) == [], "2024-02-29 existe (año bisiesto) y un importe 0 es válido."
    informe = t.get("informe")(df, {"C01", "C02"}, {"libros", "juegos"})
    assert set(informe) == set(t.get("REGLAS")) and sum(informe.values()) == 0, f"El informe debería tener todas las reglas a 0: {informe}"
`,
    files: { "registros.csv": REGISTROS_CSV },
    hints: [
      "Convierte una vez fuera del bucle: `pd.to_datetime(df[\"fecha\"], format=\"%Y-%m-%d\", errors=\"coerce\")` y `pd.to_numeric(df[\"importe\"], errors=\"coerce\")`.",
      "`df[\"id\"].duplicated(keep=False)` marca todas las filas de un id repetido, no solo las segundas.",
      "Para separar, reúne los índices con problemas y usa `df.drop(index=...)` y `df.loc[...]`.",
    ],
    errors: [
      { error: "Solo se marca la segunda fila de un id repetido", fix: "duplicated() por defecto deja la primera como válida; para marcar todas usa keep=False." },
      { error: "ValueError al convertir la fecha", fix: "Con errors=\"coerce\" lo inválido queda como NaT en vez de lanzar una excepción." },
      { error: "Un cliente vacío pasa la validación", fix: "Lee con keep_default_na=False para que el vacío sea \"\" y compruébalo contra el conjunto de clientes." },
    ],
    quiz: {
      question: "Un importe negativo llega en un registro. ¿Qué es mejor?",
      options: [
        { text: "Enviarlo a cuarentena con su motivo y corregirlo en origen" },
        { text: "Cambiarlo por su valor absoluto sin avisar" },
        { text: "Borrarlo en silencio" },
      ],
      answer: 0,
      explanation: "Corregir o borrar sin dejar rastro oculta el problema y puede cambiar los resultados; la cuarentena deja constancia y permite arreglar la causa.",
    },
    review: "Enumera cinco tipos de reglas de calidad y cómo comprobarías cada una con pandas.",
    xp: 85,
    coins: 12,
  },
];
