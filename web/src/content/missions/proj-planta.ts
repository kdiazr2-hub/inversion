import { plantaArchivos } from "../datasets";
import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 5: un pipeline de datos automatizado de verdad. Varias fuentes
// (catálogo, clientes en JSON y un archivo de pedidos por día), validación con cuarentena, un
// almacén SQLite en estrella con upsert, carga incremental con marca de agua, un orquestador con
// dependencias y reintentos, y comprobaciones de calidad que detectan un pico y un cambio de esquema.

const SERIES = { id: "pipeline-datos", title: "Proyecto progresivo: la planta de datos de la Ciudad", of: 4 };

const FILES = plantaArchivos();

const PAQUETES = ["pandas", "sqlite3"];

const SPEC: ProjectSpec = {
  requirements: [
    "Leer cada archivo diario adaptándolo al esquema esperado y avisar de columnas renombradas o nuevas.",
    "Validar cada fila contra reglas y referencias, y enviar las que fallan a una cuarentena con su motivo.",
    "Cargar un almacén SQLite con restricciones, de forma idempotente (upsert) y registrando cada carga.",
    "Orquestar tareas con dependencias, reintentar fallos transitorios y cargar de forma incremental sin saltarse días.",
    "Comprobar la calidad del almacén (integridad, duplicados, frescura, volumen, cuarentena, esquema) y generar alertas.",
  ],
  dataset: "catalogo.csv (8 productos), clientes.json (40 clientes) y pedidos_2025-03-01.csv a pedidos_2025-03-04.csv: pedidos ficticios con un cliente y un producto inexistentes, pedidos reenviados, una cantidad negativa, una fecha imposible, un cambio de esquema el día 3 y un pico de volumen el día 4.",
  stages: ["Extraer y validar con cuarentena", "Almacén en SQLite con carga idempotente", "Orquestación, reintentos y carga incremental", "Calidad, alertas e informe"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Volver a ejecutar el pipeline no duplica datos ni vuelve a cargar lo ya cargado.",
    "Ninguna fila se pierde en silencio: o se carga o queda en cuarentena con un motivo.",
    "Un fallo de la fuente detiene el pipeline sin dejar huecos, y la siguiente ejecución lo recupera.",
  ],
  extensions: [
    "Guardar la cuarentena en una tabla del almacén para revisarla y reprocesarla.",
    "Añadir la columna canal al almacén con una migración (ALTER TABLE) en lugar de descartarla.",
    "Escribir el registro de ejecución con el módulo logging y niveles (INFO, WARNING, ERROR).",
  ],
  portfolio: "Pipeline de datos en Python y SQLite: extracción tolerante a cambios de esquema, validación con cuarentena y motivos, modelo en estrella con restricciones, carga idempotente con upsert, orquestación con orden topológico, reintentos con espera exponencial, marca de agua para cargas incrementales y comprobaciones de calidad con alertas.",
};

const S1 = py`import json

import pandas as pd

ESQUEMA = ["pedido_id", "fecha_hora", "cliente_id", "producto_id", "cantidad"]
ALIAS = {"unidades": "cantidad"}


def leer_pedidos(ruta):
    """Lee un archivo diario y lo lleva al esquema esperado; informa de columnas renombradas o nuevas."""
    crudo = pd.read_csv(ruta, dtype=str)
    renombradas = {c: ALIAS[c] for c in crudo.columns if c in ALIAS}
    df = crudo.rename(columns=renombradas)
    faltan = [c for c in ESQUEMA if c not in df.columns]
    if faltan:
        raise ValueError(f"{ruta}: faltan columnas {faltan}")
    extra = [c for c in df.columns if c not in ESQUEMA]
    return df[ESQUEMA].copy(), {"renombradas": renombradas, "extra": extra}


def cargar_referencias():
    catalogo = pd.read_csv("catalogo.csv")
    with open("clientes.json", encoding="utf-8") as f:
        clientes = pd.DataFrame(json.load(f))
    return catalogo, clientes


def validar(df, catalogo, clientes):
    """Devuelve (válidos, cuarentena): cada fila rechazada lleva el motivo del primer fallo."""
    d = df.copy()
    d["fecha"] = pd.to_datetime(d["fecha_hora"], format="%Y-%m-%d %H:%M", errors="coerce")
    for c in ("pedido_id", "cliente_id", "producto_id", "cantidad"):
        d[c] = pd.to_numeric(d[c], errors="coerce")
    reglas = [
        ("campos numéricos no válidos", d[["pedido_id", "cliente_id", "producto_id", "cantidad"]].isna().any(axis=1)),
        ("fecha imposible", d["fecha"].isna()),
        ("cantidad no positiva", d["cantidad"] <= 0),
        ("producto desconocido", ~d["producto_id"].isin(catalogo["producto_id"])),
        ("cliente desconocido", ~d["cliente_id"].isin(clientes["cliente_id"])),
    ]
    d["motivo"] = None
    for motivo, mascara in reglas:
        d.loc[mascara & d["motivo"].isna(), "motivo"] = motivo
    cuarentena = df.loc[d["motivo"].notna()].assign(motivo=d.loc[d["motivo"].notna(), "motivo"])
    validos = d.loc[d["motivo"].isna(), ["pedido_id", "fecha", "cliente_id", "producto_id", "cantidad"]].astype(
        {"pedido_id": int, "cliente_id": int, "producto_id": int, "cantidad": int})
    return validos.reset_index(drop=True), cuarentena.reset_index(drop=True)


catalogo, clientes = cargar_referencias()
dia1, esquema1 = leer_pedidos("pedidos_2025-03-01.csv")
dia3, esquema3 = leer_pedidos("pedidos_2025-03-03.csv")
validos1, cuarentena1 = validar(dia1, catalogo, clientes)
validos2, cuarentena2 = validar(leer_pedidos("pedidos_2025-03-02.csv")[0], catalogo, clientes)
print(cuarentena1[["pedido_id", "motivo"]].to_string(index=False))
print(cuarentena2[["pedido_id", "motivo"]].to_string(index=False))`;

const S2 = py`import sqlite3

TABLAS = """
CREATE TABLE IF NOT EXISTS productos (producto_id INTEGER PRIMARY KEY, nombre TEXT, categoria TEXT, precio REAL);
CREATE TABLE IF NOT EXISTS clientes (cliente_id INTEGER PRIMARY KEY, nombre TEXT, ciudad TEXT, alta TEXT);
CREATE TABLE IF NOT EXISTS pedidos (
    pedido_id INTEGER PRIMARY KEY, fecha TEXT NOT NULL, cliente_id INTEGER NOT NULL REFERENCES clientes,
    producto_id INTEGER NOT NULL REFERENCES productos, cantidad INTEGER NOT NULL CHECK (cantidad > 0), importe REAL NOT NULL);
CREATE TABLE IF NOT EXISTS cargas (archivo TEXT PRIMARY KEY, validos INTEGER, cuarentena INTEGER, nuevos INTEGER);
"""


def crear_almacen(ruta=":memory:"):
    con = sqlite3.connect(ruta)
    con.executescript(TABLAS)
    return con


def cargar_dimensiones(con, catalogo, clientes):
    con.executemany("INSERT INTO productos VALUES (?, ?, ?, ?) ON CONFLICT(producto_id) DO UPDATE SET nombre = excluded.nombre, categoria = excluded.categoria, precio = excluded.precio",
                    catalogo[["producto_id", "nombre", "categoria", "precio"]].itertuples(index=False, name=None))
    con.executemany("INSERT INTO clientes VALUES (?, ?, ?, ?) ON CONFLICT(cliente_id) DO UPDATE SET nombre = excluded.nombre, ciudad = excluded.ciudad, alta = excluded.alta",
                    clientes[["cliente_id", "nombre", "ciudad", "alta"]].itertuples(index=False, name=None))
    con.commit()


def cargar_pedidos(con, archivo, validos, cuarentena):
    """Upsert idempotente: un pedido reenviado no se duplica; el importe usa el precio del catálogo."""
    precios = dict(con.execute("SELECT producto_id, precio FROM productos"))
    filas = [(int(p), f.strftime("%Y-%m-%d %H:%M"), int(c), int(pr), int(q), round(q * precios[pr], 2))
             for p, f, c, pr, q in validos[["pedido_id", "fecha", "cliente_id", "producto_id", "cantidad"]].itertuples(index=False, name=None)]
    antes = con.execute("SELECT COUNT(*) FROM pedidos").fetchone()[0]
    con.executemany("INSERT INTO pedidos VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(pedido_id) DO UPDATE SET fecha = excluded.fecha, cliente_id = excluded.cliente_id, producto_id = excluded.producto_id, cantidad = excluded.cantidad, importe = excluded.importe", filas)
    nuevos = con.execute("SELECT COUNT(*) FROM pedidos").fetchone()[0] - antes
    con.execute("INSERT INTO cargas VALUES (?, ?, ?, ?) ON CONFLICT(archivo) DO UPDATE SET validos = excluded.validos, cuarentena = excluded.cuarentena, nuevos = excluded.nuevos",
                (archivo, len(validos), len(cuarentena), nuevos))
    con.commit()
    return nuevos


almacen = crear_almacen()
cargar_dimensiones(almacen, catalogo, clientes)
nuevos = [cargar_pedidos(almacen, "pedidos_2025-03-01.csv", validos1, cuarentena1),
          cargar_pedidos(almacen, "pedidos_2025-03-02.csv", validos2, cuarentena2),
          cargar_pedidos(almacen, "pedidos_2025-03-02.csv", validos2, cuarentena2)]
total_pedidos = almacen.execute("SELECT COUNT(*) FROM pedidos").fetchone()[0]`;

const S3 = py`import os
import re
import time


def orden_topologico(tareas):
    """Orden de ejecución de un grafo {tarea: [dependencias]} (Kahn); ValueError si hay un ciclo."""
    pendientes = {t: set(deps) for t, deps in tareas.items()}
    for deps in pendientes.values():
        desconocidas = deps - pendientes.keys()
        if desconocidas:
            raise ValueError(f"dependencias desconocidas: {sorted(desconocidas)}")
    orden = []
    listas = sorted(t for t, deps in pendientes.items() if not deps)
    while listas:
        t = listas.pop(0)
        orden.append(t)
        for otra, deps in pendientes.items():
            if t in deps:
                deps.discard(t)
                if not deps and otra not in orden and otra not in listas:
                    listas.append(otra)
        listas.sort()
    if len(orden) != len(tareas):
        raise ValueError(f"ciclo entre: {sorted(set(tareas) - set(orden))}")
    return orden


def con_reintentos(funcion, intentos=3, espera=0.0, registro=None):
    def envoltura(*args, **kwargs):
        for intento in range(1, intentos + 1):
            try:
                return funcion(*args, **kwargs)
            except (OSError, ConnectionError) as e:
                if registro is not None:
                    registro.append(f"intento {intento} de {funcion.__name__} fallido: {e}")
                if intento == intentos:
                    raise
                time.sleep(espera * 2 ** (intento - 1))
    return envoltura


def marca_de_agua(con):
    fila = con.execute("SELECT MAX(archivo) FROM cargas").fetchone()[0]
    return fila


def archivos_pendientes(con, carpeta="."):
    ultimo = marca_de_agua(con) or ""
    return sorted(f for f in os.listdir(carpeta) if re.fullmatch(r"pedidos_\d{4}-\d{2}-\d{2}\.csv", f) and f > ultimo)


class FuenteInestable:
    """Simula un servidor que falla las primeras veces que se le pide un archivo."""

    def __init__(self, fallos):
        self.fallos = dict(fallos)

    def leer(self, archivo):
        if self.fallos.get(archivo, 0) > 0:
            self.fallos[archivo] -= 1
            raise ConnectionError(f"{archivo} no disponible")
        return leer_pedidos(archivo)


def ejecutar_pipeline(con, fuente, intentos=3):
    registro, resultados = [], {}
    leer = con_reintentos(fuente.leer, intentos=intentos, registro=registro)
    for archivo in archivos_pendientes(con):
        estado = {}

        def extraer():
            estado["df"], estado["esquema"] = leer(archivo)

        def validar_tarea():
            estado["validos"], estado["cuarentena"] = validar(estado["df"], catalogo, clientes)

        def cargar():
            estado["nuevos"] = cargar_pedidos(con, archivo, estado["validos"], estado["cuarentena"])

        tareas = {"extraer": ([], extraer), "validar": (["extraer"], validar_tarea), "cargar": (["validar"], cargar)}
        try:
            for nombre in orden_topologico({k: v[0] for k, v in tareas.items()}):
                tareas[nombre][1]()
                registro.append(f"{archivo}: {nombre} correcto")
        except (OSError, ConnectionError, ValueError) as e:
            registro.append(f"{archivo}: detenido ({e})")
            resultados[archivo] = {"estado": "fallido"}
            break  # los siguientes días esperan: la marca de agua no debe saltarse un hueco
        resultados[archivo] = {"estado": "cargado", "nuevos": estado["nuevos"], "cuarentena": len(estado["cuarentena"]), "esquema": estado["esquema"]}
    return resultados, registro


planta = crear_almacen()
cargar_dimensiones(planta, catalogo, clientes)
fuente = FuenteInestable({"pedidos_2025-03-03.csv": 2, "pedidos_2025-03-04.csv": 5})
primera, registro_1 = ejecutar_pipeline(planta, fuente)
segunda, registro_2 = ejecutar_pipeline(planta, fuente)
tercera, registro_3 = ejecutar_pipeline(planta, fuente)`;

const S4 = py`def comprobaciones(con, esquemas, hoy="2025-03-04"):
    """Comprobaciones de calidad del almacén; cada una con nombre, si pasa y un detalle."""
    def una(nombre, sql):
        return con.execute(sql).fetchone()[0]

    por_dia = [n for _, n in con.execute("SELECT substr(fecha, 1, 10), COUNT(*) FROM pedidos GROUP BY 1 ORDER BY 1")] or [0]
    huerfanos = una("integridad", "SELECT COUNT(*) FROM pedidos p LEFT JOIN clientes c USING (cliente_id) LEFT JOIN productos r USING (producto_id) WHERE c.cliente_id IS NULL OR r.producto_id IS NULL")
    duplicados = una("duplicados", "SELECT COUNT(*) - COUNT(DISTINCT pedido_id) FROM pedidos")
    ultimo = una("frescura", "SELECT MAX(fecha) FROM pedidos")
    media_previa = sum(por_dia[:-1]) / max(1, len(por_dia) - 1)
    ratio = por_dia[-1] / media_previa if por_dia[:-1] else 1.0
    cuarentena = una("cuarentena", "SELECT COALESCE(1.0 * SUM(cuarentena) / SUM(validos + cuarentena), 0) FROM cargas")
    cambios = {a: e for a, e in esquemas.items() if e["renombradas"] or e["extra"]}
    return [
        {"nombre": "integridad referencial", "ok": huerfanos == 0, "detalle": f"{huerfanos} pedidos sin cliente o producto"},
        {"nombre": "sin duplicados", "ok": duplicados == 0, "detalle": f"{duplicados} duplicados"},
        {"nombre": "frescura", "ok": ultimo is not None and ultimo[:10] >= hoy, "detalle": f"último pedido {ultimo}"},
        {"nombre": "volumen del último día", "ok": 0.5 <= ratio <= 1.5, "detalle": f"{por_dia[-1]} pedidos, {ratio:.1f} veces la media anterior"},
        {"nombre": "tasa de cuarentena", "ok": cuarentena <= 0.05, "detalle": f"{cuarentena:.1%} de las filas"},
        {"nombre": "esquema estable", "ok": not cambios, "detalle": "; ".join(f"{a}: {e['renombradas'] or ''} {e['extra'] or ''}".strip() for a, e in cambios.items()) or "sin cambios"},
    ]


def informe_ventas(con):
    return con.execute("""
        SELECT substr(p.fecha, 1, 10) AS dia, r.categoria, COUNT(*) AS pedidos, ROUND(SUM(p.importe), 2) AS ingresos
        FROM pedidos p JOIN productos r USING (producto_id)
        GROUP BY dia, r.categoria ORDER BY dia, ingresos DESC""").fetchall()


esquemas = {a: r["esquema"] for a, r in {**primera, **segunda, **tercera}.items() if r["estado"] == "cargado"}
calidad = comprobaciones(planta, esquemas)
alertas = [c for c in calidad if not c["ok"]]
ventas = informe_ventas(planta)
for c in calidad:
    print(("OK    " if c["ok"] else "ALERTA"), c["nombre"], "-", c["detalle"])`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

export const PROJ_PLANTA: Mission[] = [
  {
    id: "pip-planta-1",
    world: "w5",
    zone: "Proyecto de la Ciudad",
    title: "La planta de datos de la Ciudad · 1: extraer y validar con cuarentena",
    kind: "project",
    difficulty: 3,
    skills: ["etl", "limpieza", "validacion", "pandas"],
    requires: ["db-etl"],
    series: { ...SERIES, stage: 1 },
    packages: PAQUETES,
    files: FILES,
    story: "La tienda de la Ciudad envía cada noche un archivo con los pedidos del día. A veces trae clientes que no existen, cantidades negativas o un 31 de febrero, y el día 3 su programa cambió el nombre de una columna sin avisar. La planta de datos debe aceptar lo bueno, apartar lo malo explicando por qué y no romperse con los cambios.",
    objective: "Leer cada archivo de pedidos adaptándolo al esquema esperado (con alias para columnas renombradas), validar cada fila con reglas ordenadas y contra el catálogo y los clientes, y separar las válidas de la cuarentena con el motivo del primer fallo.",
    before: ["Pipeline ETL (Mundo 5)", "pandas: tipos y fechas", "JSON"],
    intuition: [
      "Un pipeline recibe datos que **no controla**. La primera barrera es el **esquema**: qué columnas deben llegar. Si una cambia de nombre (`unidades` en lugar de `cantidad`), un diccionario de **alias** la traduce y el cambio se anota para avisar. Si falta una columna imprescindible, mejor un error claro que datos corruptos.",
      "",
      "Leer todo como texto (`dtype=str`) y convertir después con `errors=\"coerce\"` evita que un valor raro tumbe la lectura: lo que no se puede convertir queda como NaN y una regla lo detecta.",
      "",
      "Las **reglas** se aplican en orden y cada fila rechazada guarda el **primer** motivo. Una fila nunca desaparece en silencio: o es válida o va a **cuarentena**, donde alguien puede revisarla.",
      "",
      "Algunas reglas miran otras fuentes: un pedido de un cliente que no está en `clientes.json` no se puede cargar sin romper la integridad.",
    ],
    formal: "fila válida ⇔ campos numéricos ∧ fecha real ∧ cantidad > 0 ∧ producto ∈ catálogo ∧ cliente ∈ clientes · |válidas| + |cuarentena| = |entrada|",
    example: {
      code: py`import pandas as pd
d = pd.DataFrame({"fecha": ["2025-03-01 10:00", "2025-02-31 09:00"], "cantidad": ["2", "x"]})
d["f"] = pd.to_datetime(d["fecha"], format="%Y-%m-%d %H:%M", errors="coerce")
d["q"] = pd.to_numeric(d["cantidad"], errors="coerce")
print(d[["f", "q"]].isna().to_dict("list"))`,
      lines: [
        "pandas.",
        "Dos filas, la segunda con una fecha imposible y una cantidad que no es un número.",
        "errors=\"coerce\": lo que no es una fecha válida se convierte en NaT en lugar de lanzar un error.",
        "Lo mismo con los números: «x» pasa a NaN.",
        "{'f': [False, True], 'q': [False, True]}: la segunda fila queda marcada para la cuarentena.",
      ],
    },
    challenge: [
      "1. `ESQUEMA = [\"pedido_id\", \"fecha_hora\", \"cliente_id\", \"producto_id\", \"cantidad\"]` y `ALIAS = {\"unidades\": \"cantidad\"}`.",
      "2. `leer_pedidos(ruta)`: lee con `dtype=str`, renombra con los alias, lanza `ValueError` si falta alguna columna del esquema y devuelve `(df_con_solo_el_esquema, {\"renombradas\": {...}, \"extra\": [...]})`.",
      "3. `cargar_referencias()`: `(catalogo, clientes)` desde `catalogo.csv` y `clientes.json`.",
      "4. `validar(df, catalogo, clientes)`: `(validos, cuarentena)`. Reglas en este orden: «campos numéricos no válidos», «fecha imposible» (formato `%Y-%m-%d %H:%M`), «cantidad no positiva», «producto desconocido», «cliente desconocido». `validos` tiene `pedido_id`, `fecha` (datetime), `cliente_id`, `producto_id` y `cantidad` como enteros; `cuarentena`, las columnas originales más `motivo`.",
      "5. `catalogo, clientes`, `dia1, esquema1` y `dia3, esquema3` (archivos del 1 y del 3 de marzo), `validos1, cuarentena1` y `validos2, cuarentena2` (días 1 y 2). Imprime las cuarentenas.",
    ],
    starter: py`import json

import pandas as pd

ESQUEMA = ["pedido_id", "fecha_hora", "cliente_id", "producto_id", "cantidad"]
ALIAS = {"unidades": "cantidad"}


def leer_pedidos(ruta):
    return pd.read_csv(ruta, dtype=str), {"renombradas": {}, "extra": []}


def cargar_referencias():
    return pd.DataFrame(), pd.DataFrame()


def validar(df, catalogo, clientes):
    return df, df.iloc[0:0]


catalogo, clientes = cargar_referencias()
dia1, esquema1 = leer_pedidos("pedidos_2025-03-01.csv")
dia3, esquema3 = leer_pedidos("pedidos_2025-03-03.csv")
validos1, cuarentena1 = validar(dia1, catalogo, clientes)
validos2, cuarentena2 = validar(leer_pedidos("pedidos_2025-03-02.csv")[0], catalogo, clientes)`,
    solution: SOL1,
    tests: py`
import pandas as pd

def test_esquema():
    "Alias, columnas extra y columnas que faltan"
    e1, e3, d3 = t.get("esquema1", dict), t.get("esquema3", dict), t.get("dia3", pd.DataFrame)
    assert e1 == {"renombradas": {}, "extra": []}
    assert e3 == {"renombradas": {"unidades": "cantidad"}, "extra": ["canal"]}
    assert list(d3.columns) == ["pedido_id", "fecha_hora", "cliente_id", "producto_id", "cantidad"]
    with open("roto.csv", "w") as f:
        f.write("pedido_id,fecha_hora,cliente_id\n1,2025-03-01 10:00,100\n")
    try:
        t.get("leer_pedidos", "function")("roto.csv")
    except ValueError as e:
        assert "producto_id" in str(e)
    else:
        raise AssertionError("Si falta una columna del esquema, leer_pedidos debe lanzar ValueError")

def test_referencias():
    "Catálogo y clientes"
    cat, cli = t.get("catalogo", pd.DataFrame), t.get("clientes", pd.DataFrame)
    assert len(cat) == 8 and len(cli) == 40 and {"cliente_id", "ciudad"} <= set(cli.columns)

def test_cuarentena():
    "Cada fila rechazada con su motivo"
    c1, c2 = t.get("cuarentena1", pd.DataFrame), t.get("cuarentena2", pd.DataFrame)
    assert dict(zip(c1["pedido_id"], c1["motivo"])) == {"5035": "cliente desconocido", "5036": "producto desconocido"}
    assert dict(zip(c2["pedido_id"], c2["motivo"])) == {"5075": "cantidad no positiva", "5076": "fecha imposible"}
    v1, v2 = t.get("validos1", pd.DataFrame), t.get("validos2", pd.DataFrame)
    assert len(v1) + len(c1) == len(t.get("dia1")) == 37 and len(v2) == 43
    assert list(v1.columns) == ["pedido_id", "fecha", "cliente_id", "producto_id", "cantidad"]
    assert str(v1["fecha"].dtype).startswith("datetime64") and v1["cantidad"].dtype.kind == "i"

def test_orden_de_reglas():
    "El primer fallo es el motivo"
    va = t.get("validar", "function")
    df = pd.DataFrame({"pedido_id": ["1", "2", "3"], "fecha_hora": ["2025-02-30 10:00", "2025-03-01 10:00", "2025-03-01 10:00"],
                       "cliente_id": ["100", "100", "999"], "producto_id": ["1", "1", "42"], "cantidad": ["0", "dos", "1"]})
    v, c = va(df, t.get("catalogo"), t.get("clientes"))
    assert len(v) == 0 and c["motivo"].tolist() == ["fecha imposible", "campos numéricos no válidos", "producto desconocido"]
    assert "cantidad" in c.columns and c["cantidad"].tolist() == ["0", "dos", "1"], "La cuarentena conserva los valores originales"
`,
    hints: [
      "leer_pedidos: `renombradas = {c: ALIAS[c] for c in crudo.columns if c in ALIAS}`; las extra son las columnas que no están en `ESQUEMA` tras renombrar.",
      "validar: convierte en una copia con `pd.to_datetime(..., errors=\"coerce\")` y `pd.to_numeric(..., errors=\"coerce\")`; recorre una lista de `(motivo, mascara)` y asigna el motivo solo donde aún está vacío.",
      "La cuarentena sale del DataFrame original (`df.loc[mascara]`) para conservar el texto tal como llegó.",
    ],
    errors: [
      { error: "Borrar las filas malas sin guardarlas", fix: "Nadie sabrá qué se perdió ni podrá corregirlo: guárdalas en una cuarentena con el motivo." },
      { error: "Dejar que pandas adivine los tipos", fix: "Una sola celda rara puede convertir una columna entera en texto o lanzar un error: lee como texto y convierte tú." },
      { error: "Fallar sin explicación cuando cambia una columna", fix: "Traduce los cambios conocidos con alias y lanza un error claro con lo que falta." },
    ],
    quiz: {
      question: "El día 3 la columna cantidad llega como unidades. ¿Cuál es la mejor reacción del pipeline?",
      options: [
        { text: "Traducirla con un alias conocido, seguir y dejar constancia del cambio para que alguien lo revise" },
        { text: "Ignorar la columna y cargar los pedidos con cantidad 0" },
        { text: "Detener el pipeline para siempre hasta que alguien cambie el código" },
        { text: "Cargarla como una columna nueva y dejar cantidad vacía" },
      ],
      answer: 0,
      explanation: "Un cambio conocido y equivalente se traduce, pero se registra: un cambio de esquema suele anunciar otros. Uno desconocido debe fallar con un mensaje claro.",
    },
    project: SPEC,
    review: "Repasa: esquema esperado y alias; leer como texto y convertir con coerce; reglas ordenadas; cuarentena con motivo.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pip-planta-2",
    world: "w5",
    zone: "Proyecto de la Ciudad",
    title: "La planta de datos de la Ciudad · 2: almacén en SQLite con carga idempotente",
    kind: "project",
    difficulty: 3,
    skills: ["sql", "bases-de-datos", "etl", "reproducibilidad"],
    requires: ["pip-planta-1", "db-joins"],
    series: { ...SERIES, stage: 2 },
    packages: PAQUETES,
    files: FILES,
    story: "El archivo del día 2 trae, además de sus pedidos, cinco del día 1 reenviados por error. Y a veces el operador ejecuta la carga dos veces. El almacén debe quedar exactamente igual: ni un pedido duplicado.",
    objective: "Diseñar un almacén en estrella (productos, clientes, pedidos) con claves y restricciones, cargar las dimensiones y los pedidos con upsert (INSERT … ON CONFLICT DO UPDATE), calcular el importe con el precio del catálogo y registrar cada carga.",
    before: ["Etapa 1", "SQL y uniones", "Claves primarias"],
    intuition: [
      "Un **modelo en estrella** separa los **hechos** (cada pedido) de las **dimensiones** (qué producto, qué cliente). Los hechos guardan solo identificadores y medidas; los nombres y categorías viven una sola vez en las dimensiones.",
      "",
      "La **clave primaria** `pedido_id` y el **upsert** (`INSERT … ON CONFLICT(pedido_id) DO UPDATE`) hacen la carga **idempotente**: cargar dos veces lo mismo deja el mismo resultado, y un pedido reenviado actualiza al existente en lugar de duplicarlo.",
      "",
      "Las **restricciones** (`NOT NULL`, `CHECK (cantidad > 0)`) son la última barrera: aunque la validación tuviera un fallo, la base de datos rechaza lo imposible.",
      "",
      "Una tabla **cargas** registra qué archivo se cargó, cuántas filas válidas y en cuarentena tenía y cuántos pedidos nuevos aportó: es la memoria del pipeline.",
    ],
    formal: "idempotente ⇔ cargar(cargar(B, x), x) = cargar(B, x) · importe = cantidad × precio del catálogo",
    example: {
      code: py`import sqlite3
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, valor INTEGER)")
for _ in range(2):
    con.executemany("INSERT INTO t VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET valor = excluded.valor", [(1, 10), (2, 20)])
print(con.execute("SELECT COUNT(*), SUM(valor) FROM t").fetchone())`,
      lines: [
        "SQLite de la biblioteca estándar.",
        "Una base de datos en memoria.",
        "Una tabla con clave primaria.",
        "Se carga dos veces lo mismo…",
        "…con upsert: si el id ya existe, se actualiza (excluded es la fila que se intentaba insertar).",
        "(2, 30): dos filas, no cuatro.",
      ],
    },
    challenge: [
      "1. `TABLAS`: script SQL con `productos`, `clientes`, `pedidos` (pedido_id INTEGER PRIMARY KEY; fecha, cliente_id, producto_id, cantidad e importe NOT NULL; `CHECK (cantidad > 0)`) y `cargas` (archivo TEXT PRIMARY KEY, validos, cuarentena, nuevos).",
      "2. `crear_almacen(ruta=\":memory:\")` y `cargar_dimensiones(con, catalogo, clientes)` con upsert.",
      "3. `cargar_pedidos(con, archivo, validos, cuarentena)`: upsert de los pedidos (fecha como texto `%Y-%m-%d %H:%M`, importe = cantidad × precio, redondeado a 2), registro en `cargas` (también con upsert) y devuelve los pedidos nuevos.",
      "4. `almacen`, sus dimensiones, `nuevos` (cargando el día 1, el día 2 y otra vez el día 2) y `total_pedidos`.",
    ],
    starter: py`import sqlite3

TABLAS = ""


def crear_almacen(ruta=":memory:"):
    return sqlite3.connect(ruta)


def cargar_dimensiones(con, catalogo, clientes):
    pass


def cargar_pedidos(con, archivo, validos, cuarentena):
    return 0


almacen = crear_almacen()
cargar_dimensiones(almacen, catalogo, clientes)
nuevos = []
total_pedidos = 0`,
    solution: SOL2,
    tests: py`
import sqlite3

def test_tablas_y_restricciones():
    "Modelo en estrella con restricciones"
    con = t.get("almacen")
    tablas = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    assert {"productos", "clientes", "pedidos", "cargas"} <= tablas
    assert con.execute("SELECT COUNT(*) FROM productos").fetchone()[0] == 8 and con.execute("SELECT COUNT(*) FROM clientes").fetchone()[0] == 40
    otra = t.get("crear_almacen", "function")()
    try:
        otra.execute("INSERT INTO pedidos VALUES (1, '2025-03-01 10:00', 100, 1, -3, 1.0)")
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("La tabla pedidos debe rechazar cantidades no positivas (CHECK)")

def test_idempotencia():
    "Ni reenvíos ni recargas duplican"
    assert t.get("nuevos", list) == [35, 38, 0] and t.get("total_pedidos") == 73
    con = t.get("almacen")
    assert con.execute("SELECT archivo, validos, cuarentena, nuevos FROM cargas ORDER BY archivo").fetchall() == [
        ("pedidos_2025-03-01.csv", 35, 2, 35), ("pedidos_2025-03-02.csv", 43, 2, 0)], "La recarga del día 2 actualiza su registro"

def test_importe():
    "Importe con el precio del catálogo"
    con = t.get("almacen")
    malos = con.execute("SELECT COUNT(*) FROM pedidos p JOIN productos r USING (producto_id) WHERE ABS(p.importe - ROUND(p.cantidad * r.precio, 2)) > 1e-9").fetchone()[0]
    assert malos == 0
    v = t.get("validos1").copy()
    v.loc[0, "cantidad"] = 4
    t.get("cargar_pedidos", "function")(con, "prueba.csv", v.iloc[:1], v.iloc[0:0])
    q, imp = con.execute("SELECT cantidad, importe FROM pedidos WHERE pedido_id = ?", (int(v.loc[0, "pedido_id"]),)).fetchone()
    assert q == 4, "Un pedido que ya existe se actualiza (upsert)"
    con.execute("DELETE FROM cargas WHERE archivo = 'prueba.csv'")
`,
    hints: [
      "crear_almacen: `con = sqlite3.connect(ruta)` y `con.executescript(TABLAS)`.",
      "cargar_pedidos: `precios = dict(con.execute(\"SELECT producto_id, precio FROM productos\"))`; cuenta las filas antes y después del `executemany` para saber cuántas son nuevas.",
      "En el upsert, `excluded.columna` es el valor de la fila que se intentaba insertar.",
    ],
    errors: [
      { error: "Usar INSERT sin manejar los conflictos", fix: "Un pedido reenviado haría fallar la carga (o duplicaría filas sin clave primaria). Usa upsert." },
      { error: "Calcular el importe con un precio que viene en el archivo de pedidos", fix: "El precio oficial es el del catálogo: tomarlo de la dimensión evita incoherencias." },
      { error: "Construir el SQL pegando valores en el texto", fix: "Usa parámetros (?): es más seguro y evita problemas con comillas." },
    ],
    quiz: {
      question: "¿Por qué es importante que la carga sea idempotente?",
      options: [
        { text: "Porque los pipelines se reintentan y se vuelven a ejecutar; si cargar dos veces duplica datos, cada reintento corrompe el almacén" },
        { text: "Porque así la carga es más rápida" },
        { text: "Porque SQLite no permite cargar dos veces el mismo archivo" },
        { text: "No es importante si el operador tiene cuidado" },
      ],
      answer: 0,
      explanation: "Fallos de red, reprocesos y ejecuciones manuales son inevitables. La idempotencia convierte un reintento en algo seguro.",
    },
    project: SPEC,
    review: "Repasa: hechos y dimensiones; clave primaria y upsert; restricciones como última barrera; registro de cargas.",
    xp: 130,
    coins: 20,
  },
  {
    id: "pip-planta-3",
    world: "w5",
    zone: "Proyecto de la Ciudad",
    title: "La planta de datos de la Ciudad · 3: orquestación, reintentos y carga incremental",
    kind: "project",
    difficulty: 4,
    skills: ["automatizacion", "etl", "grafos", "errores"],
    requires: ["pip-planta-2", "db-apis"],
    series: { ...SERIES, stage: 3 },
    packages: PAQUETES,
    files: FILES,
    story: "El servidor de la tienda falla a menudo: el archivo del día 3 tarda dos intentos en llegar y el del día 4 no responde en toda la noche. La planta debe reintentar, no saltarse ningún día y, a la noche siguiente, cargar solo lo que falta.",
    objective: "Ordenar tareas con dependencias (orden topológico con detección de ciclos), reintentar los fallos transitorios con espera exponencial, decidir qué archivos faltan con una marca de agua y ejecutar el pipeline varias veces hasta tenerlo todo.",
    before: ["Etapas 1 y 2", "Reintentos (Mundo 5)", "Grafos y dependencias"],
    intuition: [
      "Un pipeline es un **grafo de tareas**: validar depende de extraer y cargar depende de validar. El **orden topológico** (algoritmo de Kahn) ejecuta cada tarea cuando sus dependencias han terminado; si hay un **ciclo**, no existe orden posible y hay que avisar.",
      "",
      "Los fallos **transitorios** (el servidor no responde) se **reintentan** con una espera que crece (exponencial). Los **permanentes** (un archivo con columnas que faltan) no se arreglan reintentando.",
      "",
      "La **marca de agua** es el último archivo cargado (la tabla cargas lo sabe). La siguiente ejecución procesa solo los posteriores: **carga incremental**.",
      "",
      "Si un día falla, el pipeline **se detiene** ahí: cargar el día 5 sin el día 4 movería la marca de agua y el día 4 se perdería para siempre.",
    ],
    formal: "Kahn: repetir {tomar una tarea sin dependencias pendientes; quitarla de las demás} · espera_k = espera·2^(k − 1) · pendientes = {archivos > marca de agua}",
    example: {
      code: py`deps = {"cargar": ["validar"], "validar": ["extraer"], "extraer": [], "informe": ["cargar"]}
orden, listas = [], [t for t, d in deps.items() if not d]
while listas:
    t = listas.pop(0)
    orden.append(t)
    listas += [o for o, d in deps.items() if t in d and all(x in orden for x in d)]
print(orden)`,
      lines: [
        "Cada tarea con sus dependencias.",
        "Empiezan las que no dependen de nada.",
        "Mientras quede alguna lista…",
        "…se toma…",
        "…se ejecuta (aquí, se anota)…",
        "…y se liberan las que ya tienen todas sus dependencias hechas.",
        "['extraer', 'validar', 'cargar', 'informe'].",
      ],
    },
    challenge: [
      "1. `orden_topologico(tareas)`: con `{tarea: [dependencias]}`, la lista en orden (con empates, orden alfabético); `ValueError` si hay dependencias desconocidas o un ciclo.",
      "2. `con_reintentos(funcion, intentos=3, espera=0.0, registro=None)`: reintenta ante `OSError` o `ConnectionError`, anotando cada fallo en `registro` (`\"intento k de nombre fallido: …\"`), espera `espera·2^(k−1)` y relanza tras el último.",
      "3. `marca_de_agua(con)` (el archivo más reciente de `cargas`) y `archivos_pendientes(con, carpeta=\".\")` (archivos `pedidos_AAAA-MM-DD.csv` posteriores, ordenados).",
      "4. `FuenteInestable(fallos)` con `leer(archivo)`: falla con `ConnectionError` las veces indicadas y después llama a `leer_pedidos`.",
      "5. `ejecutar_pipeline(con, fuente, intentos=3)`: para cada archivo pendiente, ejecuta extraer → validar → cargar en orden topológico; si algo falla, anota, marca el archivo como `fallido` y **se detiene**. Devuelve `(resultados, registro)`. Con un almacén nuevo y `FuenteInestable({\"pedidos_2025-03-03.csv\": 2, \"pedidos_2025-03-04.csv\": 5})`, ejecuta tres veces: `primera, registro_1`, `segunda, registro_2`, `tercera, registro_3`.",
    ],
    starter: py`import os
import re
import time


def orden_topologico(tareas):
    return list(tareas)


def con_reintentos(funcion, intentos=3, espera=0.0, registro=None):
    return funcion


def marca_de_agua(con):
    return None


def archivos_pendientes(con, carpeta="."):
    return []


class FuenteInestable:
    def __init__(self, fallos):
        self.fallos = dict(fallos)

    def leer(self, archivo):
        return leer_pedidos(archivo)


def ejecutar_pipeline(con, fuente, intentos=3):
    return {}, []


planta = crear_almacen()
cargar_dimensiones(planta, catalogo, clientes)
fuente = FuenteInestable({"pedidos_2025-03-03.csv": 2, "pedidos_2025-03-04.csv": 5})
primera, registro_1 = ejecutar_pipeline(planta, fuente)
segunda, registro_2 = ejecutar_pipeline(planta, fuente)
tercera, registro_3 = ejecutar_pipeline(planta, fuente)`,
    solution: SOL3,
    tests: py`
def test_orden_topologico():
    "Dependencias, empates y ciclos"
    ot = t.get("orden_topologico", "function")
    assert ot({"c": ["a", "b"], "a": [], "b": ["a"], "d": ["c"]}) == ["a", "b", "c", "d"]
    assert ot({"x": [], "b": [], "a": []}) == ["a", "b", "x"]
    for malo in ({"a": ["b"], "b": ["a"]}, {"a": ["z"]}):
        try:
            ot(malo)
        except ValueError:
            pass
        else:
            raise AssertionError(f"{malo} debe lanzar ValueError")

def test_reintentos():
    "Reintentar lo transitorio y rendirse a tiempo"
    cr = t.get("con_reintentos", "function")
    llamadas = []
    def caprichosa():
        llamadas.append(1)
        if len(llamadas) < 3:
            raise ConnectionError("todavía no")
        return "ok"
    registro = []
    assert cr(caprichosa, intentos=3, registro=registro)() == "ok" and len(registro) == 2
    assert registro[0].startswith("intento 1 de caprichosa fallido")
    def siempre():
        raise ConnectionError("caído")
    try:
        cr(siempre, intentos=2)()
    except ConnectionError:
        pass
    else:
        raise AssertionError("Tras el último intento hay que relanzar el error")

def test_ejecuciones():
    "Sin huecos y recuperando lo pendiente"
    p, s, te = t.get("primera", dict), t.get("segunda", dict), t.get("tercera", dict)
    assert [r["estado"] for r in p.values()] == ["cargado", "cargado", "cargado", "fallido"]
    assert list(s) == ["pedidos_2025-03-04.csv"] and s["pedidos_2025-03-04.csv"]["estado"] == "cargado"
    assert te == {} and t.get("archivos_pendientes")(t.get("planta")) == []
    assert p["pedidos_2025-03-03.csv"]["esquema"]["renombradas"] == {"unidades": "cantidad"}
    r1 = t.get("registro_1", list)
    assert sum("pedidos_2025-03-03.csv no disponible" in l for l in r1) == 2 and any("detenido" in l for l in r1)
    con = t.get("planta")
    assert t.get("marca_de_agua")(con) == "pedidos_2025-03-04.csv"
    assert con.execute("SELECT COUNT(*) FROM pedidos").fetchone()[0] == 35 + 38 + 33 + 70
`,
    hints: [
      "orden_topologico: copia las dependencias en conjuntos; repite tomar la primera de `listas` (ordenadas), añadirla al orden y descartarla de las dependencias de las demás. Si al final faltan tareas, hay un ciclo.",
      "con_reintentos: devuelve una función interna con un `for intento in range(1, intentos + 1)` y un `try/except (OSError, ConnectionError)`; en el último intento, `raise`.",
      "ejecutar_pipeline: guarda en un diccionario `estado` lo que producen las tareas; usa `break` tras el primer fallo para no saltarse días.",
    ],
    errors: [
      { error: "Seguir con el día 5 cuando falla el día 4", fix: "La marca de agua avanzaría y el día 4 no se cargaría nunca: detente y recupéralo en la siguiente ejecución." },
      { error: "Reintentar cualquier excepción", fix: "Un error de datos se repetirá idéntico: reintenta solo lo transitorio (red, disco)." },
      { error: "Reintentar sin esperar", fix: "Un servidor caído necesita tiempo: la espera exponencial evita martillearlo." },
    ],
    quiz: {
      question: "El archivo del día 4 falla tres veces seguidas. ¿Qué debe hacer el pipeline?",
      options: [
        { text: "Anotar el fallo, detenerse sin mover la marca de agua y dejar que la siguiente ejecución lo intente de nuevo" },
        { text: "Marcar el día 4 como cargado para no bloquear los siguientes" },
        { text: "Reintentar indefinidamente hasta que funcione" },
        { text: "Borrar los datos de los días anteriores para empezar de cero" },
      ],
      answer: 0,
      explanation: "Detenerse sin huecos y registrar el fallo deja el sistema en un estado coherente y recuperable: la segunda ejecución carga el día 4.",
    },
    project: SPEC,
    review: "Repasa: grafo de tareas y orden topológico; reintentos con espera exponencial solo para lo transitorio; marca de agua; detenerse sin huecos.",
    xp: 150,
    coins: 22,
  },
  {
    id: "pip-planta-4",
    world: "w5",
    zone: "Proyecto de la Ciudad",
    title: "La planta de datos de la Ciudad · 4: calidad, alertas e informe",
    kind: "project",
    difficulty: 3,
    skills: ["sql", "verificacion", "automatizacion", "comunicacion"],
    requires: ["pip-planta-3"],
    series: { ...SERIES, stage: 4 },
    packages: PAQUETES,
    files: FILES,
    story: "Los datos ya fluyen solos. La pregunta del ayuntamiento ahora es otra: «¿Cómo sabemos que están bien?». El día 4 llegaron el doble de pedidos de lo normal y la tienda cambió su software sin avisar. Alguien debería enterarse antes de que salga el informe.",
    objective: "Programar comprobaciones de calidad sobre el almacén (integridad referencial, duplicados, frescura, volumen frente a la media, tasa de cuarentena y estabilidad del esquema), convertir las que fallan en alertas y generar el informe de ventas por día y categoría con SQL.",
    before: ["Etapas 1 a 3", "LEFT JOIN y agregaciones", "Atípicos"],
    intuition: [
      "Que un pipeline termine sin errores no significa que los datos estén bien. Las **comprobaciones de calidad** responden preguntas concretas:",
      "",
      "- **Integridad:** ¿todos los pedidos apuntan a un cliente y un producto existentes? (un `LEFT JOIN` sin pareja);",
      "- **Duplicados**, **frescura** (¿el último dato es de hoy?) y **volumen** (¿el último día se parece a los anteriores?);",
      "- **Cuarentena:** ¿qué parte de las filas se rechaza? Una subida brusca suele indicar un problema en origen;",
      "- **Esquema:** ¿ha cambiado algo en los archivos?",
      "",
      "Una comprobación que falla es una **alerta**, no necesariamente un error: el pico del día 4 puede ser una promoción real. Lo importante es que alguien lo sepa **antes** de publicar el informe.",
    ],
    formal: "huérfanos = |pedidos ⟕ clientes ⟕ productos sin pareja| · volumen: 0,5 ≤ n_hoy / media(n_anteriores) ≤ 1,5 · cuarentena ≤ 5 %",
    example: {
      code: py`import sqlite3
con = sqlite3.connect(":memory:")
con.executescript("CREATE TABLE c (id INTEGER); CREATE TABLE p (id INTEGER, cid INTEGER); INSERT INTO c VALUES (1); INSERT INTO p VALUES (10, 1), (11, 7);")
print(con.execute("SELECT p.id FROM p LEFT JOIN c ON p.cid = c.id WHERE c.id IS NULL").fetchall())`,
      lines: [
        "SQLite.",
        "En memoria.",
        "Un cliente (1) y dos pedidos, uno de ellos de un cliente 7 que no existe.",
        "[(11,)]: el LEFT JOIN conserva todos los pedidos y deja NULL donde no hay cliente; así aparecen los huérfanos.",
      ],
    },
    challenge: [
      "1. `comprobaciones(con, esquemas, hoy=\"2025-03-04\")`: lista de diccionarios `{\"nombre\", \"ok\", \"detalle\"}` para «integridad referencial», «sin duplicados», «frescura», «volumen del último día» (entre 0,5 y 1,5 veces la media de los días anteriores), «tasa de cuarentena» (≤ 5 %) y «esquema estable» (ningún archivo con columnas renombradas o extra).",
      "2. `informe_ventas(con)`: con SQL, filas `(dia, categoria, pedidos, ingresos)` ordenadas por día y por ingresos descendentes.",
      "3. `esquemas` (archivo → esquema de los cargados en las tres ejecuciones), `calidad`, `alertas` (las que fallan) y `ventas`. Imprime cada comprobación.",
    ],
    starter: py`def comprobaciones(con, esquemas, hoy="2025-03-04"):
    return []


def informe_ventas(con):
    return []


esquemas = {}
calidad = comprobaciones(planta, esquemas)
alertas = []
ventas = informe_ventas(planta)`,
    solution: SOL4,
    tests: py`
def test_comprobaciones():
    "Seis comprobaciones con detalle"
    c = t.get("calidad", list)
    assert [x["nombre"] for x in c] == ["integridad referencial", "sin duplicados", "frescura", "volumen del último día", "tasa de cuarentena", "esquema estable"]
    assert all(set(x) == {"nombre", "ok", "detalle"} and x["detalle"] for x in c)
    assert {a["nombre"] for a in t.get("alertas", list)} == {"volumen del último día", "esquema estable"}
    volumen = [x for x in c if x["nombre"] == "volumen del último día"][0]
    assert "70 pedidos" in volumen["detalle"]
    assert not [x for x in t.get("comprobaciones")(t.get("planta"), t.get("esquemas"), hoy="2025-03-05") if x["nombre"] == "frescura"][0]["ok"]

def test_detecta_huerfanos():
    "La integridad se comprueba con un LEFT JOIN"
    con = t.get("crear_almacen", "function")()
    t.get("cargar_dimensiones")(con, t.get("catalogo"), t.get("clientes"))
    con.execute("INSERT INTO pedidos VALUES (1, '2025-03-04 10:00', 999, 1, 1, 12.5)")
    r = t.get("comprobaciones", "function")(con, {})
    integridad = [x for x in r if x["nombre"] == "integridad referencial"][0]
    assert not integridad["ok"] and "1 pedidos" in integridad["detalle"]

def test_informe():
    "Ventas por día y categoría"
    v, con = t.get("ventas", list), t.get("planta")
    assert len(v) == 16 and v[0][0] == "2025-03-01"
    assert abs(sum(f[3] for f in v) - con.execute("SELECT SUM(importe) FROM pedidos").fetchone()[0]) < 0.01
    assert sum(f[2] for f in v) == 176
    for dia in {f[0] for f in v}:
        ingresos = [f[3] for f in v if f[0] == dia]
        assert ingresos == sorted(ingresos, reverse=True)
`,
    hints: [
      "Integridad: `SELECT COUNT(*) FROM pedidos p LEFT JOIN clientes c USING (cliente_id) LEFT JOIN productos r USING (producto_id) WHERE c.cliente_id IS NULL OR r.producto_id IS NULL`.",
      "Volumen: obtén los pedidos por día con `GROUP BY substr(fecha, 1, 10)` y compara el último con la media de los anteriores.",
      "esquemas: une los tres diccionarios de resultados y quédate con el `esquema` de los que tienen `estado` «cargado».",
    ],
    errors: [
      { error: "Dar por buenos los datos porque el pipeline no falló", fix: "Un pipeline puede cargar sin errores datos incoherentes: comprueba la calidad explícitamente." },
      { error: "Convertir cada alerta en un fallo que detiene todo", fix: "Algunas alertas son hechos reales (una promoción): informa y deja que una persona decida." },
      { error: "Comprobar la integridad con INNER JOIN", fix: "Un INNER JOIN descarta justamente las filas huérfanas que buscas: usa LEFT JOIN y mira los NULL." },
    ],
    quiz: {
      question: "La comprobación de volumen avisa: el día 4 tiene 2 veces los pedidos habituales. ¿Qué haces?",
      options: [
        { text: "Revisar la causa antes de publicar el informe: puede ser una promoción real o un problema (por ejemplo, un reenvío masivo)" },
        { text: "Borrar la mitad de los pedidos del día 4 para que se parezca a los demás" },
        { text: "Ignorar la alerta porque el pipeline terminó sin errores" },
        { text: "Detener el pipeline hasta que el volumen vuelva a ser normal" },
      ],
      answer: 0,
      explanation: "Una alerta pide atención humana. Los datos no se manipulan para que encajen; se investiga y se documenta.",
    },
    project: SPEC,
    review: "Repasa: integridad con LEFT JOIN; duplicados, frescura y volumen; tasa de cuarentena; deriva de esquema; alertas antes del informe.",
    xp: 130,
    coins: 20,
  },
];
