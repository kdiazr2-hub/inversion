import { ventasCsv } from "../datasets";
import { py, type Mission } from "../types";

// Mundo 5 · La Ciudad de los Datos Reales: SQL, APIs, credenciales y ETL.
// Sin red en el navegador: las respuestas de API se simulan con archivos JSON.

const PAGINAS = {
  "api_pagina_1.json": JSON.stringify({ datos: [{ id: 1, ciudad: "Lima", temp: 19.5 }, { id: 2, ciudad: "Quito", temp: 14.2 }], siguiente: "api_pagina_2.json" }),
  "api_pagina_2.json": JSON.stringify({ datos: [{ id: 3, ciudad: "Bogotá", temp: 15.8 }, { id: 4, ciudad: "La Paz", temp: null }], siguiente: "api_pagina_3.json" }),
  "api_pagina_3.json": JSON.stringify({ datos: [{ id: 5, ciudad: "Santiago", temp: 21.1 }], siguiente: null }),
};

export const W5: Mission[] = [
  {
    id: "db-sql",
    world: "w5",
    zone: "Bases de datos",
    title: "Los archivos del ayuntamiento: SQL con SQLite",
    kind: "lesson",
    difficulty: 3,
    skills: ["sql", "bases-de-datos"],
    requires: [],
    story: "El ayuntamiento guarda sus registros en una base de datos relacional. Para consultarla hay que hablar su idioma: SQL.",
    objective: "Crear tablas, insertar datos con parámetros y consultar con SELECT, WHERE, ORDER BY, GROUP BY y HAVING usando `sqlite3`.",
    before: ["Listas y tuplas", "Agrupar en pandas"],
    packages: ["sqlite3"],
    intuition: [
      "Una **base de datos relacional** guarda tablas con filas y columnas, y relaciones entre tablas mediante claves.",
      "",
      "```sql",
      "SELECT ciudad, COUNT(*) AS n, AVG(importe) AS media",
      "FROM pedidos",
      "WHERE importe > 10",
      "GROUP BY ciudad",
      "HAVING COUNT(*) >= 2",
      "ORDER BY media DESC;",
      "```",
      "",
      "Orden lógico: FROM → WHERE (filtra filas) → GROUP BY → HAVING (filtra grupos) → SELECT → ORDER BY.",
      "",
      "En Python: `sqlite3.connect(\":memory:\")` crea una base en memoria. **Nunca** construyas SQL concatenando texto del usuario: usa parámetros `?` para evitar **inyección SQL**.",
    ],
    example: {
      code: py`import sqlite3
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE heroes (nombre TEXT, nivel INTEGER)")
con.executemany("INSERT INTO heroes VALUES (?, ?)", [("Ada", 5), ("Lin", 3), ("Eva", 8)])
print(con.execute("SELECT nombre FROM heroes WHERE nivel > ? ORDER BY nivel DESC", (4,)).fetchall())`,
      lines: ["Módulo de SQLite.", "Base de datos en memoria.", "Crea una tabla.", "Inserta varias filas con parámetros.", "Consulta con un parámetro: [('Eva',), ('Ada',)]."],
    },
    challenge: [
      "1. `crear_bd(filas)`: crea en memoria la tabla `pedidos(id INTEGER PRIMARY KEY, ciudad TEXT, producto TEXT, importe REAL)`, inserta las filas (tuplas ciudad, producto, importe) con parámetros y devuelve la conexión.",
      "2. `por_ciudad(con, minimo)`: lista de tuplas (ciudad, n, total) de las ciudades con al menos `minimo` pedidos, ordenada por total descendente (total redondeado a 2 con `ROUND`).",
      "3. `buscar_producto(con, texto)`: pedidos cuyo producto contiene `texto` (con `LIKE` y parámetro), devolviendo lista de ids. Debe ser inmune a inyección: `buscar_producto(con, \"x' OR '1'='1\")` devuelve [].",
    ],
    starter: py`import sqlite3

FILAS = [("Lima", "poción", 12.5), ("Quito", "espada", 85.0), ("Lima", "mapa", 20.0), ("Lima", "poción", 12.5), ("Bogotá", "escudo", 60.0), ("Quito", "poción", 12.5)]

def crear_bd(filas):
    con = sqlite3.connect(":memory:")
    return con

def por_ciudad(con, minimo):
    return []

def buscar_producto(con, texto):
    return [r[0] for r in con.execute("SELECT id FROM pedidos WHERE producto LIKE '%" + texto + "%'")]`,
    solution: py`import sqlite3

FILAS = [("Lima", "poción", 12.5), ("Quito", "espada", 85.0), ("Lima", "mapa", 20.0), ("Lima", "poción", 12.5), ("Bogotá", "escudo", 60.0), ("Quito", "poción", 12.5)]

def crear_bd(filas):
    con = sqlite3.connect(":memory:")
    con.execute("CREATE TABLE pedidos (id INTEGER PRIMARY KEY, ciudad TEXT, producto TEXT, importe REAL)")
    con.executemany("INSERT INTO pedidos (ciudad, producto, importe) VALUES (?, ?, ?)", filas)
    con.commit()
    return con

def por_ciudad(con, minimo):
    sql = """SELECT ciudad, COUNT(*) AS n, ROUND(SUM(importe), 2) AS total
             FROM pedidos GROUP BY ciudad HAVING COUNT(*) >= ? ORDER BY total DESC"""
    return con.execute(sql, (minimo,)).fetchall()

def buscar_producto(con, texto):
    return [r[0] for r in con.execute("SELECT id FROM pedidos WHERE producto LIKE ? ORDER BY id", (f"%{texto}%",))]

con = crear_bd(FILAS)
print(por_ciudad(con, 2), buscar_producto(con, "poc"))`,
    tests: py`
def test_crear():
    "Tabla creada con las filas"
    con = t.get("crear_bd", "function")(t.get("FILAS"))
    assert con.execute("SELECT COUNT(*) FROM pedidos").fetchone()[0] == 6
    cols = [r[1] for r in con.execute("PRAGMA table_info(pedidos)")]
    assert cols == ["id", "ciudad", "producto", "importe"]

def test_agregacion():
    "GROUP BY con HAVING"
    con = t.get("crear_bd")(t.get("FILAS"))
    assert t.get("por_ciudad", "function")(con, 2) == [("Quito", 2, 97.5), ("Lima", 3, 45.0)]
    assert len(t.get("por_ciudad")(con, 1)) == 3

def test_inyeccion():
    "Consulta parametrizada"
    con = t.get("crear_bd")(t.get("FILAS"))
    f = t.get("buscar_producto", "function")
    assert f(con, "poci") == [1, 4, 6]
    assert f(con, "x' OR '1'='1") == []
`,
    hints: [
      "`con.executemany(\"INSERT INTO pedidos (ciudad, producto, importe) VALUES (?, ?, ?)\", filas)`.",
      "HAVING filtra grupos después de GROUP BY: `HAVING COUNT(*) >= ?`.",
      "Para LIKE con parámetro, construye el patrón en Python: `(f\"%{texto}%\",)`.",
    ],
    errors: [
      { error: "Concatenar texto del usuario en el SQL", fix: "Permite inyección SQL. Usa siempre parámetros ?." },
      { error: "Usar WHERE para filtrar agregados", fix: "WHERE filtra filas antes de agrupar; para condiciones sobre agregados usa HAVING." },
    ],
    quiz: {
      question: "¿Qué diferencia hay entre WHERE y HAVING?",
      options: [
        { text: "WHERE filtra filas antes de agrupar; HAVING filtra grupos después de agregar" },
        { text: "Son sinónimos" },
        { text: "HAVING es más rápido" },
        { text: "WHERE solo funciona con números" },
      ],
      answer: 0,
      explanation: "Por eso «HAVING COUNT(*) > 2» es válido y «WHERE COUNT(*) > 2» no.",
    },
    review: "Repasa el orden lógico de una consulta SQL y las consultas parametrizadas.",
    xp: 85,
    coins: 12,
  },
  {
    id: "db-joins",
    world: "w5",
    zone: "Bases de datos",
    title: "Los puentes de la ciudad: JOIN, subconsultas y pandas",
    kind: "lesson",
    difficulty: 4,
    skills: ["sql", "uniones"],
    requires: ["db-sql"],
    story: "La ciudad tiene un registro de clientes y otro de pedidos. Los puentes entre ellos —los JOIN— permiten responder preguntas que ninguna tabla responde sola.",
    objective: "Combinar tablas con INNER y LEFT JOIN, usar subconsultas y llevar resultados a pandas con `read_sql_query`.",
    before: ["SQL básico", "Uniones en pandas"],
    packages: ["sqlite3", "pandas"],
    intuition: [
      "- `INNER JOIN`: filas con pareja en ambas tablas.",
      "- `LEFT JOIN`: todas las de la izquierda; columnas de la derecha a NULL si no hay pareja.",
      "- **Subconsulta**: una consulta dentro de otra, p. ej. `WHERE importe > (SELECT AVG(importe) FROM pedidos)`.",
      "- `pd.read_sql_query(sql, con, params=...)` devuelve un DataFrame.",
      "",
      "Igual que en pandas: vigila que la clave sea única en la tabla de dimensiones o multiplicarás filas.",
    ],
    example: {
      code: py`import sqlite3
con = sqlite3.connect(":memory:")
con.executescript("CREATE TABLE a(id, x); CREATE TABLE b(id, y); INSERT INTO a VALUES (1,'p'),(2,'q'); INSERT INTO b VALUES (2,'z');")
print(con.execute("SELECT a.id, x, y FROM a LEFT JOIN b ON a.id = b.id").fetchall())`,
      lines: ["SQLite.", "Base en memoria.", "Dos tablas pequeñas con un script.", "LEFT JOIN: [(1, 'p', None), (2, 'q', 'z')]."],
    },
    challenge: [
      "La función `preparar()` del código inicial crea las tablas `clientes(id, nombre, ciudad)` y `pedidos(id, cliente_id, importe)`.",
      "1. `gasto_por_cliente(con)`: DataFrame (con `pd.read_sql_query`) con columnas `nombre`, `pedidos`, `gasto` de **todos** los clientes (0 si no compraron), ordenado por gasto descendente y nombre.",
      "2. `pedidos_sobre_media(con)`: lista de ids de pedidos con importe mayor que la media de todos los pedidos (subconsulta), ordenada.",
      "3. `ciudades_sin_ventas(con)`: lista ordenada de ciudades donde ningún cliente ha comprado.",
    ],
    starter: py`import sqlite3
import pandas as pd

def preparar():
    con = sqlite3.connect(":memory:")
    con.executescript("""
    CREATE TABLE clientes (id INTEGER PRIMARY KEY, nombre TEXT, ciudad TEXT);
    CREATE TABLE pedidos (id INTEGER PRIMARY KEY, cliente_id INTEGER, importe REAL);
    INSERT INTO clientes VALUES (1, 'Ada', 'Lima'), (2, 'Lin', 'Quito'), (3, 'Eva', 'Lima'), (4, 'Tom', 'Cusco');
    INSERT INTO pedidos VALUES (10, 1, 120), (11, 3, 80), (12, 1, 45), (13, 2, 30), (14, 3, 95);
    """)
    return con

def gasto_por_cliente(con):
    return pd.read_sql_query("SELECT * FROM pedidos", con)

def pedidos_sobre_media(con):
    return []

def ciudades_sin_ventas(con):
    return []`,
    solution: py`import sqlite3
import pandas as pd

def preparar():
    con = sqlite3.connect(":memory:")
    con.executescript("""
    CREATE TABLE clientes (id INTEGER PRIMARY KEY, nombre TEXT, ciudad TEXT);
    CREATE TABLE pedidos (id INTEGER PRIMARY KEY, cliente_id INTEGER, importe REAL);
    INSERT INTO clientes VALUES (1, 'Ada', 'Lima'), (2, 'Lin', 'Quito'), (3, 'Eva', 'Lima'), (4, 'Tom', 'Cusco');
    INSERT INTO pedidos VALUES (10, 1, 120), (11, 3, 80), (12, 1, 45), (13, 2, 30), (14, 3, 95);
    """)
    return con

def gasto_por_cliente(con):
    sql = """SELECT c.nombre, COUNT(p.id) AS pedidos, COALESCE(SUM(p.importe), 0) AS gasto
             FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id
             GROUP BY c.id ORDER BY gasto DESC, c.nombre"""
    return pd.read_sql_query(sql, con)

def pedidos_sobre_media(con):
    sql = "SELECT id FROM pedidos WHERE importe > (SELECT AVG(importe) FROM pedidos) ORDER BY id"
    return [r[0] for r in con.execute(sql)]

def ciudades_sin_ventas(con):
    sql = """SELECT DISTINCT ciudad FROM clientes WHERE ciudad NOT IN (
               SELECT c.ciudad FROM clientes c JOIN pedidos p ON p.cliente_id = c.id) ORDER BY ciudad"""
    return [r[0] for r in con.execute(sql)]

con = preparar()
print(gasto_por_cliente(con))`,
    tests: py`
def test_gasto():
    "LEFT JOIN conserva clientes sin compras"
    con = t.get("preparar", "function")()
    df = t.get("gasto_por_cliente", "function")(con)
    assert list(df.columns) == ["nombre", "pedidos", "gasto"]
    assert df["nombre"].tolist() == ["Eva", "Ada", "Lin", "Tom"]
    assert df.set_index("nombre")["gasto"].to_dict() == {"Ada": 165, "Eva": 175, "Lin": 30, "Tom": 0}

def test_orden():
    "Ordenado por gasto"
    df = t.get("gasto_por_cliente")(t.get("preparar")())
    assert df["gasto"].is_monotonic_decreasing and df.iloc[-1]["pedidos"] == 0

def test_subconsultas():
    "Subconsultas"
    con = t.get("preparar")()
    assert t.get("pedidos_sobre_media", "function")(con) == [10, 11, 14]
    assert t.get("ciudades_sin_ventas", "function")(con) == ["Cusco"]
`,
    hints: [
      "`LEFT JOIN pedidos p ON p.cliente_id = c.id` y `COALESCE(SUM(p.importe), 0)`.",
      "`COUNT(p.id)` cuenta solo los pedidos no nulos (0 para clientes sin compras).",
      "Para las ciudades: `NOT IN (subconsulta de ciudades con pedidos)`.",
    ],
    errors: [
      { error: "COUNT(*) da 1 para clientes sin pedidos", fix: "COUNT(*) cuenta la fila del LEFT JOIN. Usa COUNT(p.id)." },
      { error: "NOT IN con NULL en la subconsulta", fix: "Si la subconsulta devuelve NULL, NOT IN no devuelve nada. Filtra los NULL o usa NOT EXISTS." },
    ],
    quiz: {
      question: "Para listar todos los clientes con su gasto, incluidos los que no compraron, ¿qué JOIN usas?",
      options: [{ text: "LEFT JOIN desde clientes" }, { text: "INNER JOIN" }, { text: "Ninguno, basta con WHERE" }, { text: "CROSS JOIN" }],
      answer: 0,
      explanation: "INNER JOIN descartaría a los clientes sin pedidos.",
    },
    review: "Repasa INNER frente a LEFT JOIN, COUNT de columnas y subconsultas.",
    xp: 90,
    coins: 13,
  },
  {
    id: "db-apis",
    world: "w5",
    zone: "APIs y automatización",
    title: "Los mensajeros de la ciudad: APIs REST, JSON, paginación y credenciales",
    kind: "lesson",
    difficulty: 4,
    skills: ["apis", "json", "errores", "seguridad"],
    requires: ["db-joins"],
    story: "Los mensajeros traen datos de otras ciudades en páginas sucesivas. A veces se pierden o llegan incompletos. Tu sistema debe pedirlas todas, tolerar fallos y nunca revelar la llave del archivo.",
    objective: "Consumir una API paginada (simulada con archivos), validar respuestas JSON, reintentar ante errores transitorios y gestionar credenciales con variables de entorno.",
    before: ["JSON", "Excepciones", "Decoradores (reintentos)"],
    files: PAGINAS,
    intuition: [
      "Una **API REST** expone recursos por URL con métodos HTTP (GET, POST…) y suele responder JSON. En tu ordenador usarías `requests.get(url, params=..., headers=..., timeout=10)`.",
      "",
      "Buenas prácticas:",
      "- **Paginación**: seguir el enlace `siguiente` hasta que sea nulo.",
      "- **Errores**: comprobar el código de estado; reintentar con espera creciente los errores transitorios (429, 503), no los permanentes (404).",
      "- **Validar** el esquema de lo recibido: los campos pueden faltar o venir nulos.",
      "- **Credenciales** en variables de entorno (`os.environ.get(\"API_TOKEN\")`), nunca en el código ni en el repositorio.",
      "- **Web scraping**: solo cuando esté permitido (términos de uso, robots.txt), con moderación y sin datos personales.",
      "",
      "En el navegador no hay red: aquí cada «página» es un archivo y un «cliente» simulado puede fallar.",
    ],
    example: {
      code: py`import json, os
pagina = json.load(open("api_pagina_1.json", encoding="utf-8"))
print(len(pagina["datos"]), pagina["siguiente"])
token = os.environ.get("API_TOKEN", "")
print({"Authorization": f"Bearer {token}"} if token else "Sin token configurado")`,
      lines: ["Módulos.", "Carga la primera página.", "2 registros y el nombre de la siguiente página.", "La credencial se lee del entorno.", "Si no hay token, no se inventa uno."],
    },
    challenge: [
      "1. `obtener_todo(cliente, primera)`: llama a `cliente(nombre)` (que devuelve un diccionario con `datos` y `siguiente`) siguiendo la paginación y devuelve la lista completa de registros.",
      "2. `con_reintentos(funcion, intentos=3)`: devuelve una función que reintenta si se lanza `ConnectionError` (hasta `intentos` veces) y relanza el último error.",
      "3. `validar(registro)`: True si tiene `id` (int), `ciudad` (str no vacío) y `temp` (número, no nulo).",
      "4. `cabeceras()`: diccionario con `Authorization: Bearer <token>` leyendo `API_TOKEN` del entorno; lanza `RuntimeError` si no está definida. No escribas ningún token en el código.",
      "5. `limpios`: registros válidos obtenidos con un cliente que lee los archivos `api_pagina_N.json`.",
    ],
    starter: py`import json, os

def leer_pagina(nombre):
    with open(nombre, encoding="utf-8") as f:
        return json.load(f)

def obtener_todo(cliente, primera):
    return cliente(primera)["datos"]

def con_reintentos(funcion, intentos=3):
    return funcion

def validar(registro):
    return True

def cabeceras():
    return {"Authorization": "Bearer 12345-secreto"}

limpios = []`,
    solution: py`import json, os

def leer_pagina(nombre):
    with open(nombre, encoding="utf-8") as f:
        return json.load(f)

def obtener_todo(cliente, primera):
    registros, pagina = [], primera
    while pagina:
        respuesta = cliente(pagina)
        registros.extend(respuesta["datos"])
        pagina = respuesta.get("siguiente")
    return registros

def con_reintentos(funcion, intentos=3):
    def envoltura(*args, **kwargs):
        ultimo = None
        for _ in range(intentos):
            try:
                return funcion(*args, **kwargs)
            except ConnectionError as e:
                ultimo = e
        raise ultimo
    return envoltura

def validar(registro):
    return (isinstance(registro.get("id"), int) and isinstance(registro.get("ciudad"), str) and bool(registro["ciudad"].strip())
            and isinstance(registro.get("temp"), (int, float)) and not isinstance(registro.get("temp"), bool))

def cabeceras():
    token = os.environ.get("API_TOKEN")
    if not token:
        raise RuntimeError("Define la variable de entorno API_TOKEN")
    return {"Authorization": f"Bearer {token}"}

limpios = [r for r in obtener_todo(con_reintentos(leer_pagina), "api_pagina_1.json") if validar(r)]
print(limpios)`,
    tests: py`
import os

def test_paginacion():
    "Recorre todas las páginas"
    r = t.get("obtener_todo", "function")(t.get("leer_pagina"), "api_pagina_1.json")
    assert [x["id"] for x in r] == [1, 2, 3, 4, 5]

def test_reintentos():
    "Reintenta errores de conexión"
    estado = {"n": 0}
    def inestable(nombre):
        estado["n"] += 1
        if estado["n"] % 2:
            raise ConnectionError("caída")
        return t.get("leer_pagina")(nombre)
    r = t.get("obtener_todo")(t.get("con_reintentos", "function")(inestable, 3), "api_pagina_1.json")
    assert len(r) == 5
    def siempre(nombre):
        raise ConnectionError("no")
    try:
        t.get("con_reintentos")(siempre, 2)("x")
    except ConnectionError:
        pass
    else:
        assert False

def test_validar():
    "Valida esquema"
    v = t.get("validar", "function")
    assert v({"id": 1, "ciudad": "Lima", "temp": 19.5}) and not v({"id": 4, "ciudad": "La Paz", "temp": None}) and not v({"id": "7", "ciudad": "X", "temp": 1})
    assert [r["id"] for r in t.get("limpios")] == [1, 2, 3, 5]

def test_credenciales():
    "Lee el token del entorno y no lo escribe en el código"
    os.environ.pop("API_TOKEN", None)
    try:
        t.get("cabeceras", "function")()
    except RuntimeError:
        pass
    else:
        assert False, "Sin API_TOKEN debe lanzar RuntimeError"
    os.environ["API_TOKEN"] = "prueba-123"
    assert t.get("cabeceras")() == {"Authorization": "Bearer prueba-123"}
    os.environ.pop("API_TOKEN")
    assert "secreto" not in t.code and "Bearer 1" not in t.code
`,
    hints: [
      "Un bucle `while pagina:` que acumula `datos` y actualiza `pagina = respuesta.get(\"siguiente\")`.",
      "El reintento es un decorador sencillo que captura `ConnectionError`.",
      "`os.environ.get(\"API_TOKEN\")` devuelve None si no existe.",
    ],
    errors: [
      { error: "Subir una clave API a un repositorio", fix: "Revócala de inmediato. Guarda las credenciales en variables de entorno o gestores de secretos." },
      { error: "Reintentar indefinidamente", fix: "Limita los reintentos y espera entre ellos (backoff); no reintentes errores permanentes como 404." },
    ],
    quiz: {
      question: "¿Dónde debe guardarse el token de una API en un proyecto?",
      options: [
        { text: "En una variable de entorno o un gestor de secretos, fuera del código y del repositorio" },
        { text: "En una constante al principio del script" },
        { text: "En un comentario para no olvidarlo" },
        { text: "En el README" },
      ],
      answer: 0,
      explanation: "Lo que se escribe en el código acaba en el historial de versiones y puede filtrarse.",
    },
    review: "Repasa paginación, reintentos, validación de esquema y gestión de credenciales.",
    xp: 90,
    coins: 13,
  },
  {
    id: "db-etl",
    world: "w5",
    zone: "APIs y automatización",
    title: "La fábrica de la ciudad: un pipeline ETL reproducible",
    kind: "project",
    difficulty: 4,
    skills: ["etl", "sql", "pandas", "automatizacion"],
    requires: ["db-apis"],
    story: [
      "Cada noche, la fábrica de la ciudad recibe el archivo de ventas, lo limpia, lo guarda en el almacén y produce un informe. Si la fábrica se ejecuta dos veces, el almacén no debe duplicar datos.",
    ],
    objective: "Construir un pipeline ETL: extraer un CSV, transformarlo con validaciones, cargarlo en SQLite de forma idempotente y generar un informe con SQL.",
    before: ["Limpieza de datos", "SQL", "Funciones"],
    packages: ["pandas", "sqlite3"],
    files: { "ventas.csv": ventasCsv() },
    intuition: [
      "**ETL** = Extraer → Transformar → Cargar. (**ELT** carga primero los datos crudos y transforma dentro del almacén.)",
      "",
      "Un buen pipeline es:",
      "- **Modular**: una función por etapa, fáciles de probar.",
      "- **Validado**: comprueba esquema y reglas y registra lo descartado.",
      "- **Idempotente**: ejecutarlo dos veces deja el mismo resultado (usa claves primarias e `INSERT OR REPLACE`, o borra y recarga la partición).",
      "- **Observable**: registra cuántas filas entran, se descartan y se cargan.",
    ],
    example: {
      code: py`import sqlite3
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, v REAL)")
for _ in range(2):
    con.executemany("INSERT OR REPLACE INTO t VALUES (?, ?)", [(1, 9.5), (2, 3.0)])
print(con.execute("SELECT COUNT(*) FROM t").fetchone())`,
      lines: ["SQLite.", "Base en memoria.", "Tabla con clave primaria.", "Se carga dos veces…", "…con INSERT OR REPLACE.", "(2,): la carga es idempotente."],
    },
    challenge: [
      "Implementa las etapas (las pruebas evalúan cada una):",
      "1. **Extraer** → `extraer(ruta)`: DataFrame leído del CSV.",
      "2. **Transformar** → `transformar(df)`: tupla (limpio, log). Normaliza `region` (strip + title), elimina pedidos duplicados y filas sin unidades, crea `ingreso` = unidades × precio, convierte `unidades` a int. `log` = `{\"entrada\", \"duplicados\", \"sin_unidades\", \"salida\"}`.",
      "3. **Cargar** → `cargar(con, df)`: crea si no existe `ventas(pedido INTEGER PRIMARY KEY, fecha TEXT, region TEXT, producto TEXT, unidades INTEGER, precio REAL, ingreso REAL)` e inserta con `INSERT OR REPLACE`. Devuelve el número de filas en la tabla.",
      "4. **Informe** → `informe(con)`: lista de tuplas (region, pedidos, ingreso_total redondeado a 2) ordenada por ingreso descendente, con SQL.",
      "5. **Orquestar** → `ejecutar(ruta, con)`: corre todo y devuelve `{\"log\": ..., \"filas_tabla\": ..., \"informe\": ...}`. Ejecutarlo dos veces debe dejar la tabla igual.",
    ],
    starter: py`import sqlite3
import pandas as pd

def extraer(ruta):
    return pd.read_csv(ruta)

def transformar(df):
    return df, {}

def cargar(con, df):
    df.to_sql("ventas", con, if_exists="append")
    return 0

def informe(con):
    return []

def ejecutar(ruta, con):
    return {}`,
    solution: py`import sqlite3
import pandas as pd

def extraer(ruta):
    return pd.read_csv(ruta)

def transformar(df):
    df = df.copy()
    log = {"entrada": len(df)}
    df["region"] = df["region"].str.strip().str.title()
    n = len(df)
    df = df.drop_duplicates(subset="pedido")
    log["duplicados"] = n - len(df)
    n = len(df)
    df = df.dropna(subset=["unidades"])
    log["sin_unidades"] = n - len(df)
    df["unidades"] = df["unidades"].astype(int)
    df["ingreso"] = df["unidades"] * df["precio"]
    log["salida"] = len(df)
    return df, log

def cargar(con, df):
    con.execute("""CREATE TABLE IF NOT EXISTS ventas (pedido INTEGER PRIMARY KEY, fecha TEXT, region TEXT,
                   producto TEXT, unidades INTEGER, precio REAL, ingreso REAL)""")
    filas = df[["pedido", "fecha", "region", "producto", "unidades", "precio", "ingreso"]].itertuples(index=False, name=None)
    con.executemany("INSERT OR REPLACE INTO ventas VALUES (?, ?, ?, ?, ?, ?, ?)", [tuple(f) for f in filas])
    con.commit()
    return con.execute("SELECT COUNT(*) FROM ventas").fetchone()[0]

def informe(con):
    sql = "SELECT region, COUNT(*), ROUND(SUM(ingreso), 2) AS total FROM ventas GROUP BY region ORDER BY total DESC"
    return con.execute(sql).fetchall()

def ejecutar(ruta, con):
    limpio, log = transformar(extraer(ruta))
    filas = cargar(con, limpio)
    return {"log": log, "filas_tabla": filas, "informe": informe(con)}

con = sqlite3.connect(":memory:")
r1 = ejecutar("ventas.csv", con)
r2 = ejecutar("ventas.csv", con)
print(r1["log"], r1["filas_tabla"], r2["filas_tabla"])
print(r1["informe"])`,
    tests: py`
import sqlite3
import pandas as pd
RAW = pd.read_csv("ventas.csv")

def test_etapa1_extraer():
    "Etapa 1: extraer"
    assert len(t.get("extraer", "function")("ventas.csv")) == len(RAW)

def test_etapa2_transformar():
    "Etapa 2: transformar con registro"
    limpio, log = t.get("transformar", "function")(RAW.copy())
    dup = int(RAW.duplicated("pedido").sum())
    assert log["entrada"] == len(RAW) and log["duplicados"] == dup and log["salida"] == len(limpio)
    assert log["entrada"] - log["duplicados"] - log["sin_unidades"] == log["salida"]
    assert limpio["pedido"].is_unique and limpio["unidades"].dtype.kind == "i" and "ingreso" in limpio

def test_etapa3_cargar_idempotente():
    "Etapa 3: carga idempotente"
    con = sqlite3.connect(":memory:")
    limpio, log = t.get("transformar")(RAW.copy())
    n1 = t.get("cargar", "function")(con, limpio)
    n2 = t.get("cargar")(con, limpio)
    assert n1 == n2 == log["salida"]

def test_etapa4_informe():
    "Etapa 4: informe SQL"
    con = sqlite3.connect(":memory:")
    limpio, _ = t.get("transformar")(RAW.copy())
    t.get("cargar")(con, limpio)
    inf = t.get("informe", "function")(con)
    assert len(inf) == 4 and [r[0] for r in inf] == limpio.groupby("region")["ingreso"].sum().sort_values(ascending=False).index.tolist()
    assert approx(sum(r[2] for r in inf), limpio["ingreso"].sum(), 1e-6)

def test_etapa5_orquestar():
    "Etapa 5: ejecución completa repetible"
    con = sqlite3.connect(":memory:")
    a = t.get("ejecutar", "function")("ventas.csv", con)
    b = t.get("ejecutar")("ventas.csv", con)
    assert a["filas_tabla"] == b["filas_tabla"] and a["informe"] == b["informe"]
`,
    hints: [
      "Reutiliza tu limpieza del Mundo 3 y añade el registro de cuántas filas descarta cada paso.",
      "`INSERT OR REPLACE` con la clave primaria `pedido` evita duplicar al recargar.",
      "La orquestación solo encadena las funciones.",
    ],
    errors: [
      { error: "to_sql(if_exists=\"append\") duplica en cada ejecución", fix: "Usa clave primaria + INSERT OR REPLACE, o borra la partición antes de cargar." },
      { error: "Transformaciones sin registro", fix: "Si no sabes cuántas filas descartaste, no puedes detectar un problema en los datos de origen." },
    ],
    quiz: {
      question: "¿Qué significa que un pipeline sea idempotente?",
      options: [
        { text: "Que ejecutarlo varias veces con la misma entrada produce el mismo estado final" },
        { text: "Que se ejecuta solo una vez" },
        { text: "Que no tiene errores" },
        { text: "Que es muy rápido" },
      ],
      answer: 0,
      explanation: "Permite reintentar sin miedo a duplicar o corromper datos.",
    },
    review: "Repasa las etapas ETL, el registro de transformaciones y la carga idempotente.",
    project: {
      requirements: ["Una función por etapa", "Registro de filas en cada transformación", "Carga idempotente con clave primaria", "Informe generado con SQL"],
      dataset: "ventas.csv: pedidos sintéticos de Python Quest con duplicados y faltantes.",
      stages: ["Extraer", "Transformar", "Cargar", "Informe", "Orquestar"],
      criteria: ["Las cinco etapas pasan sus pruebas", "Ejecutar dos veces no duplica datos", "El registro cuadra entrada − descartes = salida"],
      extensions: ["Programar la ejecución diaria", "Registrar el log en una tabla de auditoría", "Validar el esquema con reglas declarativas", "Cargar en PostgreSQL fuera del navegador"],
      portfolio: "Pipeline ETL reproducible: extracción de CSV, limpieza con registro, carga idempotente en SQLite e informe SQL.",
    },
    xp: 250,
    coins: 50,
  },
];
