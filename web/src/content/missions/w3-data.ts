import { climaCsv, estudiantesCsv, pacientesCsv, ventasCsv } from "../datasets";
import { py, type Mission } from "../types";

// Mundo 3 · El Reino de los Datos: NumPy, pandas, limpieza, agrupación, uniones, fechas, EDA y gráficos.

const CLIENTES = "cliente,nombre,ciudad,segmento\nC1,Ada,Lima,premium\nC2,Lin,Quito,estándar\nC3,Eva,Bogotá,premium\nC4,Tom,Lima,estándar\n";
const PEDIDOS = "pedido,cliente,importe\nP1,C1,120\nP2,C3,80\nP3,C1,45\nP4,C9,60\nP5,C2,30\nP6,C3,95\n";

export const W3: Mission[] = [
  {
    id: "w3-numpy",
    world: "w3",
    zone: "NumPy",
    title: "El cristal multiplicador: arrays de NumPy",
    kind: "lesson",
    difficulty: 2,
    skills: ["numpy", "vectorizacion"],
    requires: [],
    story: "Un cristal del castillo aplica un mismo hechizo a miles de valores a la vez. Se llama NumPy y es la base de casi toda la ciencia de datos en Python.",
    objective: "Crear arrays, operar de forma vectorizada, usar máscaras booleanas y funciones de agregación con `axis`.",
    before: ["Listas", "Bucles", "Funciones"],
    packages: ["numpy"],
    intuition: [
      "Un **array** de NumPy es una tabla de números del mismo tipo. Las operaciones se aplican **elemento a elemento** sin escribir bucles (vectorización), y son mucho más rápidas:",
      "",
      "```python",
      "import numpy as np",
      "precios = np.array([10.0, 12.5, 8.0])",
      "precios * 1.21          # IVA a todos",
      "precios[precios > 9]    # máscara booleana",
      "```",
      "",
      "En arrays 2D, `axis=0` agrega por columnas y `axis=1` por filas. `shape` indica las dimensiones.",
    ],
    example: {
      code: py`import numpy as np
notas = np.array([[7, 8, 6], [9, 5, 8], [4, 6, 5]])
print(notas.shape)
print(notas.mean(axis=1))
print(notas.max(axis=0))
print(notas[notas >= 7])`,
      lines: ["Convención: importar NumPy como np.", "3 estudiantes × 3 exámenes.", "(3, 3)", "Media de cada estudiante (por fila).", "Máximo de cada examen (por columna).", "Todas las notas de 7 o más (array 1D)."],
    },
    challenge: [
      "Tienes las temperaturas de 4 sensores durante 6 horas en un array `lecturas` de forma (4, 6) (ya definido en el código inicial).",
      "Sin bucles `for`, calcula:",
      "- `media_sensor`: media de cada sensor (4 valores).",
      "- `hora_max`: índice de la hora con la temperatura media más alta (entero).",
      "- `estandarizadas`: lecturas estandarizadas por sensor: (x − media del sensor) / desviación típica del sensor (usa `ddof=0`).",
      "- `n_alertas`: cuántas lecturas superan 30 grados.",
    ],
    starter: py`import numpy as np

lecturas = np.array([
    [21.5, 23.0, 26.5, 29.0, 31.5, 28.0],
    [19.0, 20.5, 22.0, 25.5, 27.0, 26.0],
    [24.0, 26.5, 30.5, 33.0, 34.5, 31.0],
    [18.5, 19.0, 21.0, 22.5, 23.5, 22.0],
])

media_sensor = []
for fila in lecturas:
    media_sensor.append(sum(fila) / len(fila))`,
    solution: py`import numpy as np

lecturas = np.array([
    [21.5, 23.0, 26.5, 29.0, 31.5, 28.0],
    [19.0, 20.5, 22.0, 25.5, 27.0, 26.0],
    [24.0, 26.5, 30.5, 33.0, 34.5, 31.0],
    [18.5, 19.0, 21.0, 22.5, 23.5, 22.0],
])

media_sensor = lecturas.mean(axis=1)
hora_max = int(lecturas.mean(axis=0).argmax())
estandarizadas = (lecturas - lecturas.mean(axis=1, keepdims=True)) / lecturas.std(axis=1, keepdims=True)
n_alertas = int((lecturas > 30).sum())
print(media_sensor, hora_max, n_alertas)`,
    tests: py`
import numpy as np

def test_medias():
    "media_sensor es un array con la media de cada fila"
    L = t.get("lecturas")
    m = np.asarray(t.get("media_sensor"))
    assert m.shape == (4,) and np.allclose(m, L.mean(axis=1))

def test_hora():
    "hora_max es la hora de mayor media"
    assert t.get("hora_max") == 4

def test_estandarizadas():
    "Cada fila estandarizada tiene media 0 y DE 1"
    z = np.asarray(t.get("estandarizadas"))
    assert z.shape == (4, 6)
    assert np.allclose(z.mean(axis=1), 0) and np.allclose(z.std(axis=1), 1)

def test_alertas():
    "n_alertas cuenta lecturas > 30"
    assert t.get("n_alertas") == int((t.get("lecturas") > 30).sum()) == 5

def test_sin_bucles():
    "Sin bucles for"
    assert not t.uses("For", "ListComp"), "Usa operaciones vectorizadas en vez de bucles"
`,
    hints: [
      "`lecturas.mean(axis=1)` da la media de cada fila.",
      "`argmax()` devuelve el índice del máximo; aplícalo a la media por columnas.",
      "`keepdims=True` mantiene la forma (4, 1) para que la resta se aplique fila a fila (broadcasting).",
    ],
    errors: [
      { error: "ValueError: operands could not be broadcast together with shapes (4,6) (4,)", fix: "Para restar una media por fila, la media debe tener forma (4, 1): usa keepdims=True o [:, None]." },
      { error: "Confundir axis=0 y axis=1", fix: "axis=0 recorre filas y agrega cada columna; axis=1 agrega cada fila." },
    ],
    quiz: {
      question: "Si `a` tiene forma (100, 3), ¿qué forma tiene `a.mean(axis=0)`?",
      options: [{ text: "(3,)" }, { text: "(100,)" }, { text: "(100, 3)" }, { text: "Un solo número" }],
      answer: 0,
      explanation: "axis=0 colapsa las 100 filas y deja una media por columna.",
    },
    advanced: {
      title: "Distancias entre todos los puntos",
      prompt: "Dado `pts` de forma (n, 2), calcula `D` (n × n) con la distancia euclídea entre cada par, sin bucles (usa broadcasting: `pts[:, None, :] - pts[None, :, :]`).",
      starter: py`import numpy as np
pts = np.array([[0, 0], [3, 4], [6, 8]])
D = None`,
      solution: py`import numpy as np
pts = np.array([[0, 0], [3, 4], [6, 8]])
D = np.sqrt(((pts[:, None, :] - pts[None, :, :]) ** 2).sum(axis=2))`,
      tests: py`
import numpy as np
def test_D():
    "Matriz de distancias"
    assert np.allclose(t.get("D"), [[0, 5, 10], [5, 0, 5], [10, 5, 0]])
`,
    },
    review: "Repasa el significado de axis y el broadcasting de formas.",
    xp: 70,
    coins: 10,
  },
  {
    id: "w3-algebra",
    world: "w3",
    zone: "NumPy",
    title: "Los engranajes del castillo: álgebra lineal",
    kind: "lesson",
    difficulty: 3,
    skills: ["numpy", "algebra-lineal"],
    requires: ["w3-numpy"],
    story: "Los engranajes del castillo transforman movimientos con matrices. Detrás de la regresión, las redes neuronales y PCA hay exactamente estas operaciones.",
    objective: "Usar producto matricial (`@`), traspuesta, sistemas lineales (`np.linalg.solve`) y entender las formas.",
    before: ["Arrays de NumPy", "Vectores y matrices (intuición)"],
    packages: ["numpy"],
    intuition: [
      "- `A * B` multiplica **elemento a elemento**; `A @ B` es el **producto matricial**.",
      "- En `A @ B`, las columnas de A deben igualar las filas de B: (m×n) @ (n×p) → (m×p).",
      "- `A.T` es la traspuesta.",
      "- Un sistema `A x = b` se resuelve con `np.linalg.solve(A, b)`; evita calcular la inversa explícitamente (es más lento y menos estable).",
      "",
      "El **producto escalar** de dos vectores mide cuánto apuntan en la misma dirección; es la base de la similitud del coseno.",
    ],
    formal: "(AB)ᵢⱼ = Σₖ Aᵢₖ Bₖⱼ. Mínimos cuadrados: β̂ = (XᵀX)⁻¹Xᵀy, que se calcula resolviendo (XᵀX)β = Xᵀy.",
    example: {
      code: py`import numpy as np
A = np.array([[2, 1], [1, 3]])
b = np.array([5, 10])
x = np.linalg.solve(A, b)
print(x, A @ x)`,
      lines: ["Importa NumPy.", "Matriz de coeficientes 2×2.", "Términos independientes.", "Resuelve 2x + y = 5, x + 3y = 10.", "x = [1, 3]; comprobación: A @ x = b."],
    },
    challenge: [
      "Una tienda vende tres productos. Conoces las unidades vendidas en tres días (`U`, 3×3) y los ingresos de cada día (`ingresos`). Deduce el precio de cada producto resolviendo el sistema `U @ precios = ingresos` → guarda el resultado en `precios`.",
      "Después ajusta una recta por mínimos cuadrados a los puntos `x`, `y` (ya definidos): construye `X` con una columna de unos y la columna x, y calcula `beta` (intercepto, pendiente) resolviendo las ecuaciones normales con `np.linalg.solve`.",
    ],
    starter: py`import numpy as np

U = np.array([[2, 1, 0], [1, 3, 2], [0, 2, 4]])
ingresos = np.array([25, 78, 96])
precios = np.linalg.inv(U) * ingresos

x = np.array([1, 2, 3, 4, 5])
y = np.array([2.2, 4.1, 6.3, 7.9, 10.1])
beta = None`,
    solution: py`import numpy as np

U = np.array([[2, 1, 0], [1, 3, 2], [0, 2, 4]])
ingresos = np.array([25, 78, 96])
precios = np.linalg.solve(U, ingresos)

x = np.array([1, 2, 3, 4, 5])
y = np.array([2.2, 4.1, 6.3, 7.9, 10.1])
X = np.column_stack([np.ones_like(x, dtype=float), x])
beta = np.linalg.solve(X.T @ X, X.T @ y)
print(precios, beta)`,
    tests: py`
import numpy as np

def test_precios():
    "Precios que reproducen los ingresos"
    p = np.asarray(t.get("precios"), dtype=float)
    assert p.shape == (3,), f"precios tiene forma {p.shape}"
    assert np.allclose(t.get("U") @ p, t.get("ingresos")), "U @ precios no reproduce los ingresos"

def test_beta():
    "beta coincide con mínimos cuadrados"
    b = np.asarray(t.get("beta"), dtype=float)
    ref = np.polyfit(t.get("x"), t.get("y"), 1)[::-1]
    assert b.shape == (2,) and np.allclose(b, ref), f"beta = {b}, esperado {ref}"

def test_usa_solve():
    "Usa np.linalg.solve"
    assert t.calls("solve")
`,
    hints: [
      "`precios = np.linalg.solve(U, ingresos)`; `inv(U) * ingresos` multiplica elemento a elemento, no es un producto matricial.",
      "`X = np.column_stack([np.ones(len(x)), x])` crea la matriz de diseño.",
      "Las ecuaciones normales: `np.linalg.solve(X.T @ X, X.T @ y)`.",
    ],
    errors: [
      { error: "ValueError: matmul: Input operand 1 has a mismatch in its core dimension", fix: "Las dimensiones internas no coinciden. Revisa .shape de ambas matrices." },
      { error: "LinAlgError: Singular matrix", fix: "El sistema no tiene solución única (filas linealmente dependientes)." },
    ],
    quiz: {
      question: "Si A es 3×2 y B es 2×4, ¿qué forma tiene A @ B?",
      options: [{ text: "3×4" }, { text: "2×2" }, { text: "No se puede multiplicar" }, { text: "3×2" }],
      answer: 0,
      explanation: "(3×2)(2×4): las dimensiones internas (2) coinciden y el resultado toma las externas.",
    },
    review: "Repasa la diferencia entre * y @, y por qué se resuelven sistemas en lugar de invertir matrices.",
    xp: 75,
    coins: 11,
  },
  {
    id: "w3-pandas",
    world: "w3",
    zone: "pandas",
    title: "Los registros del rey: Series y DataFrames",
    kind: "lesson",
    difficulty: 2,
    skills: ["pandas"],
    requires: ["w3-algebra"],
    story: "Los registros del rey son tablas con nombre en cada columna. pandas convierte esas tablas en objetos que puedes filtrar, ordenar y resumir.",
    objective: "Crear DataFrames, seleccionar columnas y filas con `loc`/`iloc`, ordenar y crear columnas nuevas.",
    before: ["Diccionarios", "Arrays de NumPy"],
    packages: ["pandas"],
    intuition: [
      "- Una **Series** es una columna con índice.",
      "- Un **DataFrame** es una tabla: columnas con nombre (cada una una Series) y un índice de filas.",
      "",
      "Selección:",
      "- `df[\"col\"]` una columna; `df[[\"a\", \"b\"]]` varias.",
      "- `df.loc[filas, columnas]` por **etiqueta**; `df.iloc[i, j]` por **posición**.",
      "- `df[df[\"edad\"] > 30]` filtra con una condición.",
      "",
      "`df.sort_values(\"col\")`, `df.assign(nueva=...)` o `df[\"nueva\"] = ...` para crear columnas.",
    ],
    example: {
      code: py`import pandas as pd
df = pd.DataFrame({"heroe": ["Ada", "Lin", "Eva"], "nivel": [5, 3, 8], "oro": [120, 80, 300]})
df["oro_por_nivel"] = df["oro"] / df["nivel"]
print(df.sort_values("nivel", ascending=False))
print(df.loc[df["oro"] > 100, ["heroe", "oro"]])`,
      lines: ["Convención: pandas como pd.", "Un DataFrame desde un diccionario de columnas.", "Nueva columna calculada fila a fila (vectorizado).", "Ordena de mayor a menor nivel.", "Filas con más de 100 de oro, solo dos columnas."],
    },
    challenge: [
      "Con el DataFrame `heroes` del código inicial:",
      "1. Crea la columna `poder` = ataque × 2 + defensa.",
      "2. Crea `top` con las 3 filas de mayor `poder`, ordenadas de mayor a menor, con solo las columnas `nombre`, `clase`, `poder` (índice reiniciado con `reset_index(drop=True)`).",
      "3. Crea `magos_fuertes`: lista de nombres de la clase `\"maga\"` con poder ≥ 30.",
    ],
    starter: py`import pandas as pd

heroes = pd.DataFrame({
    "nombre": ["Ada", "Lin", "Eva", "Tom", "Iris", "Max"],
    "clase": ["maga", "guerrera", "maga", "arquero", "maga", "guerrera"],
    "ataque": [12, 15, 9, 11, 14, 8],
    "defensa": [5, 9, 7, 6, 3, 12],
})
top = heroes.head(3)
magos_fuertes = []`,
    solution: py`import pandas as pd

heroes = pd.DataFrame({
    "nombre": ["Ada", "Lin", "Eva", "Tom", "Iris", "Max"],
    "clase": ["maga", "guerrera", "maga", "arquero", "maga", "guerrera"],
    "ataque": [12, 15, 9, 11, 14, 8],
    "defensa": [5, 9, 7, 6, 3, 12],
})
heroes["poder"] = heroes["ataque"] * 2 + heroes["defensa"]
top = heroes.sort_values("poder", ascending=False).head(3)[["nombre", "clase", "poder"]].reset_index(drop=True)
magos_fuertes = heroes.loc[(heroes["clase"] == "maga") & (heroes["poder"] >= 30), "nombre"].tolist()
print(top)
print(magos_fuertes)`,
    tests: py`
def test_poder():
    "Columna poder"
    h = t.get("heroes")
    assert "poder" in h.columns and h["poder"].tolist() == [29, 39, 25, 28, 31, 28]

def test_top():
    "top: 3 filas ordenadas con columnas pedidas"
    top = t.get("top")
    assert list(top.columns) == ["nombre", "clase", "poder"], list(top.columns)
    assert top["nombre"].tolist() == ["Lin", "Iris", "Ada"]
    assert list(top.index) == [0, 1, 2], "Reinicia el índice"

def test_filtro():
    "magas con poder ≥ 30"
    assert t.get("magos_fuertes") == ["Iris"]
`,
    hints: [
      "Las operaciones entre columnas son vectorizadas: `heroes[\"ataque\"] * 2 + heroes[\"defensa\"]`.",
      "Encadena: `sort_values(...).head(3)[[columnas]].reset_index(drop=True)`.",
      "Combina condiciones con `&` y paréntesis: `(heroes[\"clase\"] == \"maga\") & (heroes[\"poder\"] >= 30)`.",
    ],
    errors: [
      { error: "ValueError: The truth value of a Series is ambiguous", fix: "Usa & y | (con paréntesis) en lugar de and/or para combinar condiciones de pandas." },
      { error: "KeyError: 'Nombre'", fix: "Los nombres de columna distinguen mayúsculas. Revisa df.columns." },
    ],
    quiz: {
      question: "¿Qué diferencia hay entre `df.loc[2]` y `df.iloc[2]`?",
      options: [
        { text: "loc busca la fila cuya etiqueta de índice es 2; iloc la tercera fila por posición" },
        { text: "Son equivalentes siempre" },
        { text: "loc es para columnas e iloc para filas" },
        { text: "iloc es más moderno y loc está obsoleto" },
      ],
      answer: 0,
      explanation: "Tras ordenar o filtrar, las etiquetas del índice ya no coinciden con las posiciones; por eso importa la diferencia.",
    },
    review: "Repasa loc frente a iloc y cómo combinar condiciones con & y |.",
    xp: 70,
    coins: 10,
  },
  {
    id: "w3-leer-csv",
    world: "w3",
    zone: "pandas",
    title: "El primer vistazo: importar y explorar un CSV",
    kind: "lesson",
    difficulty: 2,
    skills: ["pandas", "importacion"],
    requires: ["w3-pandas"],
    story: "Llega el libro de ventas de la tienda del reino. Antes de sacar conclusiones, un buen analista mira los datos: tamaño, tipos, faltantes y rarezas.",
    objective: "Importar un CSV con `pd.read_csv`, inspeccionar `shape`, `dtypes`, `head`, `isna().sum()` y `describe`, y calcular columnas derivadas.",
    before: ["DataFrames"],
    packages: ["pandas"],
    files: { "ventas.csv": ventasCsv() },
    intuition: [
      "Rutina mínima al abrir un dataset nuevo:",
      "",
      "1. `df.shape`: filas y columnas.",
      "2. `df.head()` y `df.sample(5)`: ¿se ve como esperabas?",
      "3. `df.dtypes`: ¿los números son números? ¿las fechas son fechas?",
      "4. `df.isna().sum()`: valores faltantes por columna.",
      "5. `df.describe()`: rango y escala; detecta valores imposibles.",
      "6. `df[col].value_counts()`: categorías y errores de escritura.",
      "",
      "`parse_dates=[\"fecha\"]` convierte la columna de fechas al leer.",
    ],
    example: {
      code: py`import pandas as pd
df = pd.read_csv("ventas.csv", parse_dates=["fecha"])
print(df.shape)
print(df.isna().sum())
print(df["region"].value_counts())`,
      lines: ["Importa pandas.", "Lee el CSV interpretando la fecha.", "(filas, columnas)", "Faltantes por columna: hay en unidades.", "Las categorías revelan etiquetas inconsistentes («norte »)."],
    },
    challenge: [
      "Lee `ventas.csv` en `df` (con la fecha como fecha) y calcula:",
      "- `n_filas`: número de filas.",
      "- `faltantes`: diccionario columna → número de faltantes, solo para columnas con al menos uno.",
      "- `regiones_distintas`: número de valores distintos **tal como aparecen** en `region` (incluidas las variantes mal escritas).",
      "- Añade a `df` la columna `ingreso` = unidades × precio.",
      "- `ingreso_total`: suma de `ingreso` (los faltantes no cuentan), redondeada a 2.",
      "- `rango_fechas`: tupla (fecha mínima, fecha máxima) como texto `AAAA-MM-DD`.",
    ],
    starter: py`import pandas as pd

df = pd.read_csv("ventas.csv")
n_filas = len(df.columns)
faltantes = {}
regiones_distintas = 4
ingreso_total = 0
rango_fechas = ("", "")`,
    solution: py`import pandas as pd

df = pd.read_csv("ventas.csv", parse_dates=["fecha"])
n_filas = len(df)
na = df.isna().sum()
faltantes = {col: int(n) for col, n in na.items() if n > 0}
regiones_distintas = df["region"].nunique()
df["ingreso"] = df["unidades"] * df["precio"]
ingreso_total = round(float(df["ingreso"].sum()), 2)
rango_fechas = (df["fecha"].min().strftime("%Y-%m-%d"), df["fecha"].max().strftime("%Y-%m-%d"))
print(n_filas, faltantes, regiones_distintas, ingreso_total, rango_fechas)`,
    tests: py`
import pandas as pd
REF = pd.read_csv("ventas.csv", parse_dates=["fecha"])

def test_lectura():
    "df tiene todas las filas y la fecha como fecha"
    df = t.get("df")
    assert len(df) == len(REF) == t.get("n_filas")
    assert pd.api.types.is_datetime64_any_dtype(df["fecha"]), "Usa parse_dates=['fecha']"

def test_faltantes():
    "Faltantes solo de las columnas con huecos"
    assert t.get("faltantes") == {"unidades": int(REF["unidades"].isna().sum())}

def test_regiones():
    "Cuenta las variantes tal cual"
    assert t.get("regiones_distintas") == REF["region"].nunique() and t.get("regiones_distintas") > 4

def test_ingreso():
    "Columna ingreso y total"
    df = t.get("df")
    assert "ingreso" in df.columns
    assert approx(t.get("ingreso_total"), round(float((REF["unidades"] * REF["precio"]).sum()), 2))

def test_fechas():
    "Rango de fechas"
    assert t.get("rango_fechas") == ("2025-01-01", "2025-04-30")
`,
    hints: [
      "`pd.read_csv(\"ventas.csv\", parse_dates=[\"fecha\"])`.",
      "`df.isna().sum()` devuelve una Series; recórrela con `.items()` y quédate con los valores > 0.",
      "`sum()` de pandas ignora los NaN por defecto. Para formatear fechas: `.strftime(\"%Y-%m-%d\")`.",
    ],
    errors: [
      { error: "La columna fecha es de tipo object", fix: "Sin parse_dates, pandas la lee como texto. Usa parse_dates o pd.to_datetime." },
      { error: "len(df.columns) en lugar de len(df)", fix: "len(df) cuenta filas; df.shape devuelve (filas, columnas)." },
    ],
    quiz: {
      question: "`describe()` muestra que la columna unidades tiene máximo 140 y media 6. ¿Qué haces primero?",
      options: [
        { text: "Investigar ese valor: puede ser un error de captura o un pedido real excepcional" },
        { text: "Borrarlo inmediatamente porque es atípico" },
        { text: "Ignorarlo: la media ya lo compensa" },
        { text: "Sustituirlo por la media" },
      ],
      answer: 0,
      explanation: "Un atípico no es automáticamente un error. Se investiga su origen y se decide con un criterio documentado.",
    },
    review: "Repasa la rutina de inspección: shape, head, dtypes, isna, describe, value_counts.",
    xp: 70,
    coins: 10,
  },
  {
    id: "w3-limpieza",
    world: "w3",
    zone: "Limpieza de datos",
    title: "Purificar el pozo: limpieza de datos",
    kind: "lesson",
    difficulty: 3,
    skills: ["pandas", "limpieza"],
    requires: ["w3-leer-csv"],
    story: "El pozo del castillo está turbio: registros duplicados, nombres de región mal escritos y huecos. Si analizas el agua sin limpiarla, todas las conclusiones saldrán contaminadas.",
    objective: "Normalizar texto, eliminar duplicados, tratar faltantes con un criterio explícito y documentar cuántas filas cambian.",
    before: ["Importar CSV", "DataFrames"],
    packages: ["pandas"],
    files: { "ventas.csv": ventasCsv() },
    intuition: [
      "Limpiar es tomar **decisiones documentadas**, no esconder problemas:",
      "",
      "- **Texto**: `str.strip()`, `str.title()` unifican variantes como «norte » y «Norte».",
      "- **Duplicados**: `drop_duplicates()` elimina filas idénticas. ¿Son errores o pedidos repetidos legítimos? Aquí el número de pedido repetido indica error.",
      "- **Faltantes**: eliminarlos (`dropna`) o imputarlos (`fillna`). Imputar con la media/mediana conserva filas pero reduce la variabilidad artificialmente; elimina solo si los faltantes son pocos y no siguen un patrón.",
      "",
      "Registra siempre cuántas filas había y cuántas quedan.",
    ],
    example: {
      code: py`import pandas as pd
df = pd.DataFrame({"ciudad": [" lima", "Lima", "QUITO "], "v": [1, None, 3]})
df["ciudad"] = df["ciudad"].str.strip().str.title()
print(df["ciudad"].unique())
print(df["v"].fillna(df["v"].median()).tolist())`,
      lines: ["Importa pandas.", "Datos con espacios, mayúsculas mezcladas y un hueco.", "Quita espacios y pone en formato título.", "['Lima' 'Quito']: variantes unificadas.", "Imputa el hueco con la mediana: [1.0, 2.0, 3.0]."],
    },
    challenge: [
      "Escribe `limpiar(df)` que reciba el DataFrame de ventas y devuelva una tupla `(limpio, informe)`:",
      "1. Normaliza `region` (sin espacios extremos, formato título).",
      "2. Elimina filas con el `pedido` duplicado (conserva la primera).",
      "3. Elimina filas con `unidades` faltantes.",
      "4. `informe` es un diccionario: `{\"inicial\": n, \"duplicados\": d, \"sin_unidades\": f, \"final\": m}` con los recuentos en ese orden de pasos.",
      "No modifiques el DataFrame original (trabaja sobre una copia). Llama a la función con el CSV leído y muestra el informe.",
    ],
    starter: py`import pandas as pd

def limpiar(df):
    df = df.dropna()
    return df, {}

ventas = pd.read_csv("ventas.csv")
limpio, informe = limpiar(ventas)
print(informe)`,
    solution: py`import pandas as pd

def limpiar(df):
    df = df.copy()
    informe = {"inicial": len(df)}
    df["region"] = df["region"].str.strip().str.title()
    antes = len(df)
    df = df.drop_duplicates(subset="pedido", keep="first")
    informe["duplicados"] = antes - len(df)
    antes = len(df)
    df = df.dropna(subset=["unidades"])
    informe["sin_unidades"] = antes - len(df)
    informe["final"] = len(df)
    return df.reset_index(drop=True), informe

ventas = pd.read_csv("ventas.csv")
limpio, informe = limpiar(ventas)
print(informe)
print(limpio["region"].value_counts())`,
    tests: py`
import pandas as pd
RAW = pd.read_csv("ventas.csv")

def test_regiones():
    "Regiones normalizadas"
    limpio, _ = t.get("limpiar", "function")(RAW.copy())
    assert sorted(limpio["region"].unique()) == ["Este", "Norte", "Oeste", "Sur"]

def test_sin_duplicados_ni_faltantes():
    "Sin pedidos duplicados ni unidades faltantes"
    limpio, _ = t.get("limpiar")(RAW.copy())
    assert limpio["pedido"].is_unique and limpio["unidades"].notna().all()

def test_informe():
    "Informe con recuentos coherentes"
    _, inf = t.get("limpiar")(RAW.copy())
    dup = int(RAW.duplicated(subset="pedido").sum())
    sin = int(RAW.drop_duplicates(subset="pedido")["unidades"].isna().sum())
    esperado = {"inicial": len(RAW), "duplicados": dup, "sin_unidades": sin, "final": len(RAW) - dup - sin}
    assert inf == esperado, f"{inf} != {esperado}"
    assert dup > 0 and sin > 0

def test_no_modifica():
    "No modifica el original"
    original = RAW.copy()
    t.get("limpiar")(original)
    assert original.equals(RAW), "limpiar cambió el DataFrame recibido: usa df.copy()"
`,
    hints: [
      "Empieza con `df = df.copy()` y guarda `len(df)` antes de cada paso.",
      "`df.drop_duplicates(subset=\"pedido\", keep=\"first\")`.",
      "`df.dropna(subset=[\"unidades\"])` solo mira esa columna.",
    ],
    errors: [
      { error: "SettingWithCopyWarning", fix: "Modificas una vista de otro DataFrame. Trabaja sobre df.copy()." },
      { error: "dropna() sin subset elimina demasiado", fix: "Sin subset, borra filas con cualquier faltante en cualquier columna. Indica la columna." },
    ],
    quiz: {
      question: "Imputar faltantes con la media de la columna…",
      options: [
        { text: "…conserva filas, pero subestima la variabilidad y puede sesgar si los faltantes no son aleatorios" },
        { text: "…es siempre la mejor opción" },
        { text: "…no tiene ningún efecto en los análisis posteriores" },
        { text: "…aumenta la desviación estándar" },
      ],
      answer: 0,
      explanation: "Todos los valores imputados son idénticos a la media: la dispersión baja artificialmente. Si los faltantes dependen de algo (p. ej. pedidos grandes sin registrar), la media también se sesga.",
    },
    review: "Repasa por qué cada paso de limpieza debe registrar cuántas filas afecta.",
    xp: 80,
    coins: 12,
  },
  {
    id: "w3-filtrar",
    world: "w3",
    zone: "Limpieza de datos",
    title: "El tamiz del alquimista: filtrar y transformar",
    kind: "lesson",
    difficulty: 3,
    skills: ["pandas", "transformacion"],
    requires: ["w3-limpieza"],
    story: "El alquimista del castillo estudia un ensayo con 160 pacientes. Necesita separar grupos, calcular cambios y crear categorías antes de cualquier análisis.",
    objective: "Filtrar con condiciones, crear variables derivadas, categorizar con `pd.cut` y aplicar transformaciones por columna.",
    before: ["Limpieza de datos"],
    packages: ["pandas"],
    files: { "pacientes.csv": pacientesCsv() },
    intuition: [
      "- Variables derivadas: `df[\"cambio\"] = df[\"final\"] - df[\"inicial\"]`.",
      "- Categorizar una variable numérica: `pd.cut(df[\"edad\"], bins=[0, 40, 60, 120], labels=[...])`. Ojo: los intervalos son abiertos a la izquierda por defecto, `(40, 60]`.",
      "- Mapear categorías: `df[\"sexo\"].map({\"F\": \"Mujer\", \"M\": \"Hombre\"})`.",
      "- Filtros con varias condiciones: `df.query(\"grupo == 'tratamiento' and edad >= 60\")`.",
      "",
      "Categorizar pierde información: úsalo para describir y comunicar, no para sustituir la variable continua en un modelo sin motivo.",
    ],
    example: {
      code: py`import pandas as pd
df = pd.read_csv("pacientes.csv")
df["cambio"] = df["pas_final"] - df["pas_inicial"]
df["edad_grupo"] = pd.cut(df["edad"], bins=[0, 45, 65, 120], labels=["<=45", "46-65", ">65"])
print(df.groupby("grupo")["cambio"].mean().round(1))
print(df["edad_grupo"].value_counts().sort_index())`,
      lines: ["Importa pandas.", "Datos sintéticos del ensayo.", "Cambio de presión (negativo = baja).", "Categorías de edad (intervalos cerrados por la derecha).", "Cambio medio por grupo.", "Cuántos pacientes hay en cada categoría."],
    },
    challenge: [
      "Con `pacientes.csv`:",
      "1. Crea `df` con la columna `cambio` = pas_final − pas_inicial.",
      "2. Crea `hipertensos`: pacientes con pas_inicial ≥ 140 y pas_final no faltante.",
      "3. Crea `respuesta`: diccionario grupo → proporción de `hipertensos` cuyo cambio es ≤ −10 (redondeada a 3).",
      "4. Crea `por_edad`: DataFrame con el cambio medio (redondeado a 1) por `grupo` (filas) y categoría de edad `<60` / `60+` (columnas), usando `pd.cut` y `pivot_table`.",
    ],
    starter: py`import pandas as pd

df = pd.read_csv("pacientes.csv")
hipertensos = df
respuesta = {}
por_edad = None`,
    solution: py`import pandas as pd

df = pd.read_csv("pacientes.csv")
df["cambio"] = df["pas_final"] - df["pas_inicial"]
hipertensos = df[(df["pas_inicial"] >= 140) & df["pas_final"].notna()]
respuesta = (hipertensos["cambio"] <= -10).groupby(hipertensos["grupo"]).mean().round(3).to_dict()
df["edad_cat"] = pd.cut(df["edad"], bins=[0, 59, 200], labels=["<60", "60+"])
por_edad = df.pivot_table(index="grupo", columns="edad_cat", values="cambio", aggfunc="mean", observed=False).round(1)
print(respuesta)
print(por_edad)`,
    tests: py`
import pandas as pd
R = pd.read_csv("pacientes.csv")
R["cambio"] = R["pas_final"] - R["pas_inicial"]
H = R[(R["pas_inicial"] >= 140) & R["pas_final"].notna()]

def test_hipertensos():
    "Filtro correcto"
    h = t.get("hipertensos")
    assert len(h) == len(H) and h["pas_inicial"].min() >= 140 and h["pas_final"].notna().all()

def test_respuesta():
    "Proporción de respuesta por grupo"
    esperado = {g: round(float((d["cambio"] <= -10).mean()), 3) for g, d in H.groupby("grupo")}
    r = t.get("respuesta")
    assert set(r) == {"control", "tratamiento"}
    assert all(approx(r[g], esperado[g], 1e-3) for g in esperado), f"{r} vs {esperado}"
    assert r["tratamiento"] > r["control"]

def test_por_edad():
    "Tabla grupo × edad"
    p = t.get("por_edad")
    assert list(p.index) == ["control", "tratamiento"]
    assert [str(c) for c in p.columns] == ["<60", "60+"]
    ref = R.assign(e=(R["edad"] >= 60).map({False: "<60", True: "60+"})).groupby(["grupo", "e"])["cambio"].mean().round(1)
    assert approx(p.loc["tratamiento", "60+"], ref[("tratamiento", "60+")], 0.051)
`,
    hints: [
      "Condiciones combinadas: `(df[\"pas_inicial\"] >= 140) & df[\"pas_final\"].notna()`.",
      "La media de una Series booleana es la proporción de True: `(h[\"cambio\"] <= -10).groupby(h[\"grupo\"]).mean()`.",
      "Para «<60» y «60+» con enteros, `bins=[0, 59, 200]` deja 59 en el primer grupo y 60 en el segundo.",
    ],
    errors: [
      { error: "Las categorías de pd.cut no son las esperadas", fix: "Los intervalos son (a, b]: revisa si el límite cae dentro o fuera." },
      { error: "Comparaciones con NaN dan False sin avisar", fix: "Filtra explícitamente los faltantes antes de calcular proporciones." },
    ],
    quiz: {
      question: "La proporción de respuesta es mayor en el grupo tratado de estos datos. ¿Qué puedes concluir ya?",
      options: [
        { text: "Que en esta muestra hay una diferencia; para hablar de efecto hace falta inferencia (incertidumbre) y considerar el diseño" },
        { text: "Que el tratamiento funciona en todos los pacientes", misconception: "correlacion-causalidad" },
        { text: "Que la diferencia es estadísticamente significativa", misconception: "significacion-relevancia" },
        { text: "Nada: los datos descriptivos no sirven" },
      ],
      answer: 0,
      explanation: "Lo descriptivo es el primer paso. Las conclusiones causales requieren un diseño adecuado (p. ej. aleatorización) y medir la incertidumbre (Mundo 4).",
    },
    review: "Repasa pd.cut (intervalos (a, b]) y la media de booleanos como proporción.",
    xp: 80,
    coins: 12,
  },
  {
    id: "w3-agrupar",
    world: "w3",
    zone: "Agregación y uniones",
    title: "El consejo de regiones: agrupar y agregar",
    kind: "lesson",
    difficulty: 3,
    skills: ["pandas", "agrupacion"],
    requires: ["w3-filtrar"],
    story: "Cada región envía su informe al consejo del reino. Para compararlas hay que resumir miles de pedidos en unas pocas cifras por grupo.",
    objective: "Usar `groupby` con varias agregaciones, `pivot_table` y proporciones dentro de grupos.",
    before: ["Filtrar y transformar", "Limpieza"],
    packages: ["pandas"],
    files: { "ventas.csv": ventasCsv() },
    intuition: [
      "**Dividir – aplicar – combinar**: `groupby` separa las filas por categoría, aplica una función a cada grupo y combina los resultados.",
      "",
      "```python",
      "df.groupby(\"region\")[\"ingreso\"].agg([\"count\", \"sum\", \"mean\"])",
      "df.groupby([\"region\", \"producto\"])[\"unidades\"].sum().unstack()",
      "df.pivot_table(index=\"region\", columns=\"producto\", values=\"ingreso\", aggfunc=\"sum\")",
      "```",
      "",
      "`transform` devuelve un resultado del mismo tamaño que el original: útil para calcular la **participación** de cada fila dentro de su grupo.",
    ],
    example: {
      code: py`import pandas as pd
df = pd.DataFrame({"g": ["a", "a", "b"], "v": [10, 30, 20]})
print(df.groupby("g")["v"].agg(["count", "sum", "mean"]))
df["cuota"] = df["v"] / df.groupby("g")["v"].transform("sum")
print(df)`,
      lines: ["Importa pandas.", "Dos grupos.", "Resumen por grupo: a tiene 2 filas, suma 40, media 20.", "Participación de cada fila en el total de su grupo.", "a: 0.25 y 0.75; b: 1.0."],
    },
    challenge: [
      "Con las ventas limpias (el código inicial ya normaliza regiones, quita duplicados y faltantes y crea `ingreso`):",
      "1. `resumen`: DataFrame indexado por `region` con columnas `pedidos` (número de filas), `ingreso` (suma) y `ticket_medio` (ingreso medio por pedido, redondeado a 2), ordenado por ingreso descendente.",
      "2. `tabla`: pivot con regiones en filas, productos en columnas y la suma de unidades (0 donde no haya ventas).",
      "3. `producto_estrella`: diccionario región → producto con más ingresos en esa región.",
    ],
    starter: py`import pandas as pd

df = pd.read_csv("ventas.csv")
df["region"] = df["region"].str.strip().str.title()
df = df.drop_duplicates(subset="pedido").dropna(subset=["unidades"])
df["ingreso"] = df["unidades"] * df["precio"]

resumen = df.groupby("region").sum()
tabla = None
producto_estrella = {}`,
    solution: py`import pandas as pd

df = pd.read_csv("ventas.csv")
df["region"] = df["region"].str.strip().str.title()
df = df.drop_duplicates(subset="pedido").dropna(subset=["unidades"])
df["ingreso"] = df["unidades"] * df["precio"]

resumen = (
    df.groupby("region")
    .agg(pedidos=("pedido", "count"), ingreso=("ingreso", "sum"), ticket_medio=("ingreso", "mean"))
    .round({"ticket_medio": 2})
    .sort_values("ingreso", ascending=False)
)
tabla = df.pivot_table(index="region", columns="producto", values="unidades", aggfunc="sum", fill_value=0)
por_rp = df.groupby(["region", "producto"])["ingreso"].sum()
producto_estrella = {r: grupo.droplevel(0).idxmax() for r, grupo in por_rp.groupby(level=0)}
print(resumen)
print(tabla)
print(producto_estrella)`,
    tests: py`
import pandas as pd
D = pd.read_csv("ventas.csv")
D["region"] = D["region"].str.strip().str.title()
D = D.drop_duplicates(subset="pedido").dropna(subset=["unidades"])
D["ingreso"] = D["unidades"] * D["precio"]

def test_resumen():
    "resumen con pedidos, ingreso y ticket medio"
    r = t.get("resumen")
    assert list(r.columns) == ["pedidos", "ingreso", "ticket_medio"], list(r.columns)
    g = D.groupby("region")["ingreso"]
    assert r["ingreso"].is_monotonic_decreasing, "Ordena por ingreso descendente"
    for reg in r.index:
        assert r.loc[reg, "pedidos"] == g.count()[reg]
        assert approx(r.loc[reg, "ingreso"], g.sum()[reg])
        assert approx(r.loc[reg, "ticket_medio"], round(g.mean()[reg], 2), 1e-4)

def test_tabla():
    "Pivot de unidades"
    tb = t.get("tabla")
    ref = D.pivot_table(index="region", columns="producto", values="unidades", aggfunc="sum", fill_value=0)
    assert tb.shape == (4, 4) and (tb.loc[ref.index, ref.columns].values == ref.values).all()

def test_estrella():
    "Producto estrella por región"
    esperado = D.groupby(["region", "producto"])["ingreso"].sum().unstack().idxmax(axis=1).to_dict()
    assert t.get("producto_estrella") == esperado
`,
    hints: [
      "Agregaciones con nombre: `.agg(pedidos=(\"pedido\", \"count\"), ingreso=(\"ingreso\", \"sum\"), ...)`.",
      "`pivot_table(..., aggfunc=\"sum\", fill_value=0)` rellena las combinaciones sin ventas.",
      "Agrupa por región y producto, suma ingresos y usa `.unstack().idxmax(axis=1)`.",
    ],
    errors: [
      { error: "groupby().sum() suma columnas sin sentido (como el número de pedido)", fix: "Selecciona las columnas a agregar o usa agregaciones con nombre." },
      { error: "MultiIndex difícil de leer", fix: "unstack() o reset_index() convierten el resultado en una tabla plana." },
    ],
    quiz: {
      question: "La región Norte tiene el mayor ingreso total y la región Sur el mayor ticket medio. ¿Qué mide cada uno?",
      options: [
        { text: "El total depende del número de pedidos; el ticket medio, del tamaño típico de cada pedido" },
        { text: "Miden lo mismo con otra escala" },
        { text: "El ticket medio siempre es más importante" },
        { text: "Uno de los dos debe estar mal calculado" },
      ],
      answer: 0,
      explanation: "Totales y promedios responden preguntas distintas. Elegir la métrica depende de la pregunta del negocio.",
    },
    review: "Repasa el patrón dividir-aplicar-combinar y la diferencia entre agg y transform.",
    xp: 85,
    coins: 12,
  },
  {
    id: "w3-unir",
    world: "w3",
    zone: "Agregación y uniones",
    title: "La alianza de los libros: unir tablas",
    kind: "lesson",
    difficulty: 3,
    skills: ["pandas", "uniones"],
    requires: ["w3-agrupar"],
    story: "Los pedidos están en un libro y los clientes en otro. Para saber qué ciudades compran más hay que unirlos… sin perder ni duplicar registros por el camino.",
    objective: "Combinar tablas con `merge` (inner, left, outer), validar la cardinalidad y detectar registros sin pareja.",
    before: ["Agrupar y agregar"],
    packages: ["pandas"],
    files: { "clientes.csv": CLIENTES, "pedidos.csv": PEDIDOS },
    intuition: [
      "`pd.merge(izq, der, on=\"clave\", how=...)`:",
      "",
      "- `inner`: solo las claves presentes en ambas tablas.",
      "- `left`: todas las filas de la izquierda; columnas vacías (NaN) si no hay pareja.",
      "- `outer`: todas las filas de ambas.",
      "",
      "Riesgos: claves que no coinciden (pierdes filas en silencio) y claves repetidas (multiplicas filas). `validate=\"many_to_one\"` comprueba que la tabla derecha tiene claves únicas; `indicator=True` añade la columna `_merge` para auditar.",
    ],
    example: {
      code: py`import pandas as pd
a = pd.DataFrame({"id": [1, 2, 3], "x": ["a", "b", "c"]})
b = pd.DataFrame({"id": [2, 3, 4], "y": [20, 30, 40]})
print(pd.merge(a, b, on="id", how="left", indicator=True))`,
      lines: ["Importa pandas.", "Tabla izquierda con ids 1–3.", "Tabla derecha con ids 2–4.", "Left join: el id 1 queda con y = NaN y _merge = left_only; el 4 no aparece."],
    },
    challenge: [
      "Con `pedidos.csv` y `clientes.csv`:",
      "1. `completo`: left join de pedidos con clientes por `cliente`, validando que cada pedido tenga como mucho un cliente (`validate=\"many_to_one\"`).",
      "2. `huerfanos`: lista de pedidos cuyo cliente no existe.",
      "3. `por_ciudad`: diccionario ciudad → importe total (solo pedidos con cliente conocido).",
      "4. `sin_compras`: lista ordenada de nombres de clientes sin ningún pedido.",
    ],
    starter: py`import pandas as pd

pedidos = pd.read_csv("pedidos.csv")
clientes = pd.read_csv("clientes.csv")
completo = pd.merge(pedidos, clientes, on="cliente")
huerfanos = []
por_ciudad = {}
sin_compras = []`,
    solution: py`import pandas as pd

pedidos = pd.read_csv("pedidos.csv")
clientes = pd.read_csv("clientes.csv")
completo = pd.merge(pedidos, clientes, on="cliente", how="left", validate="many_to_one", indicator=True)
huerfanos = completo.loc[completo["_merge"] == "left_only", "pedido"].tolist()
por_ciudad = completo.dropna(subset=["ciudad"]).groupby("ciudad")["importe"].sum().to_dict()
sin_compras = sorted(clientes.loc[~clientes["cliente"].isin(pedidos["cliente"]), "nombre"])
print(completo)
print(huerfanos, por_ciudad, sin_compras)`,
    tests: py`
def test_completo():
    "Left join conserva todos los pedidos"
    c = t.get("completo")
    assert len(c) == 6 and "ciudad" in c.columns

def test_huerfanos():
    "Detecta el pedido sin cliente"
    assert t.get("huerfanos") == ["P4"]

def test_ciudades():
    "Importe por ciudad"
    assert t.get("por_ciudad") == {"Bogotá": 175, "Lima": 165, "Quito": 30}

def test_sin_compras():
    "Clientes sin pedidos"
    assert t.get("sin_compras") == ["Tom"]

def test_validate():
    "Usa validate en el merge"
    assert "validate" in t.code
`,
    hints: [
      "`pd.merge(pedidos, clientes, on=\"cliente\", how=\"left\", validate=\"many_to_one\", indicator=True)`.",
      "Los huérfanos tienen `_merge == \"left_only\"`.",
      "`~clientes[\"cliente\"].isin(pedidos[\"cliente\"])` selecciona clientes sin pedidos.",
    ],
    errors: [
      { error: "MergeError: Merge keys are not unique in right dataset", fix: "La tabla de clientes tiene claves repetidas: el merge multiplicaría pedidos. Limpia o agrega antes de unir." },
      { error: "Perder filas sin darte cuenta con inner", fix: "Compara len() antes y después, o usa indicator=True para auditar." },
    ],
    quiz: {
      question: "Haces un left join de 1000 pedidos con una tabla de clientes y obtienes 1240 filas. ¿Qué pasó?",
      options: [
        { text: "Algunos clientes aparecen repetidos en la tabla derecha y multiplican filas" },
        { text: "Es normal: los joins siempre añaden filas" },
        { text: "Hay pedidos sin cliente" },
        { text: "pandas tiene un error" },
      ],
      answer: 0,
      explanation: "Un left join nunca debería tener más filas que la izquierda si la clave de la derecha es única. validate='many_to_one' detecta esto.",
    },
    review: "Repasa los tipos de join y cómo auditar una unión con validate e indicator.",
    xp: 80,
    coins: 12,
  },
  {
    id: "w3-fechas",
    world: "w3",
    zone: "Series temporales",
    title: "El reloj del observatorio: fechas y series temporales",
    kind: "lesson",
    difficulty: 3,
    skills: ["pandas", "series-temporales"],
    requires: ["w3-unir"],
    story: "El observatorio registra la temperatura cada día. Para ver estaciones y tendencias, hay que agrupar por mes, suavizar el ruido y comparar periodos.",
    objective: "Usar fechas como índice, `resample`, medias móviles (`rolling`) y atributos de fecha (`.dt.month`, `.dt.dayofweek`).",
    before: ["Agrupar y agregar"],
    packages: ["pandas"],
    files: { "clima.csv": climaCsv() },
    intuition: [
      "Con una columna de fechas convertida (`parse_dates`) y puesta como índice:",
      "",
      "- `serie.resample(\"MS\").mean()`: media por mes (MS = inicio de mes).",
      "- `serie.rolling(7).mean()`: media móvil de 7 días; suaviza el ruido y deja ver la tendencia. Las 6 primeras quedan vacías.",
      "- `df.index.month`, `df[\"fecha\"].dt.dayofweek`: extraer componentes.",
      "",
      "En series temporales el **orden importa**: no mezcles filas al azar y evalúa siempre con datos posteriores a los de ajuste.",
    ],
    example: {
      code: py`import pandas as pd
df = pd.read_csv("clima.csv", parse_dates=["fecha"], index_col="fecha")
mensual = df["temperatura"].resample("MS").mean().round(1)
print(mensual.head(3))
suave = df["temperatura"].rolling(7).mean()
print(suave.iloc[5:8].round(2))`,
      lines: ["Importa pandas.", "La fecha se convierte y pasa a ser el índice.", "Temperatura media de cada mes.", "Los tres primeros meses.", "Media móvil de 7 días.", "Los primeros valores son NaN hasta tener 7 días."],
    },
    challenge: [
      "Con `clima.csv`:",
      "1. `mensual`: Series con la temperatura media por mes (resample \"MS\"), redondeada a 1.",
      "2. `mes_mas_calido`: número de mes (1–12) con mayor media.",
      "3. `lluvia_mensual`: Series con la lluvia total por mes.",
      "4. `dias_lluvia_finde`: proporción de sábados y domingos con lluvia > 0 (redondeada a 3).",
      "5. `max_suavizada`: valor máximo de la media móvil de 7 días de la temperatura (redondeado a 2).",
    ],
    starter: py`import pandas as pd

df = pd.read_csv("clima.csv")
mensual = df["temperatura"].mean()
mes_mas_calido = 0
lluvia_mensual = None
dias_lluvia_finde = 0
max_suavizada = 0`,
    solution: py`import pandas as pd

df = pd.read_csv("clima.csv", parse_dates=["fecha"], index_col="fecha")
mensual = df["temperatura"].resample("MS").mean().round(1)
mes_mas_calido = int(mensual.idxmax().month)
lluvia_mensual = df["lluvia_mm"].resample("MS").sum()
finde = df[df.index.dayofweek >= 5]
dias_lluvia_finde = round(float((finde["lluvia_mm"] > 0).mean()), 3)
max_suavizada = round(float(df["temperatura"].rolling(7).mean().max()), 2)
print(mensual, mes_mas_calido, dias_lluvia_finde, max_suavizada)`,
    tests: py`
import pandas as pd
R = pd.read_csv("clima.csv", parse_dates=["fecha"], index_col="fecha")

def test_mensual():
    "12 medias mensuales"
    m = t.get("mensual")
    assert len(m) == 12
    assert all(approx(a, b, 0.051) for a, b in zip(m.values, R["temperatura"].resample("MS").mean().round(1).values))

def test_mes():
    "Mes más cálido"
    assert t.get("mes_mas_calido") == int(R["temperatura"].resample("MS").mean().idxmax().month)

def test_lluvia():
    "Lluvia mensual"
    l = t.get("lluvia_mensual")
    assert len(l) == 12 and approx(float(l.sum()), float(R["lluvia_mm"].sum()), 1e-6)

def test_finde():
    "Proporción de fines de semana con lluvia"
    f = R[R.index.dayofweek >= 5]
    assert approx(t.get("dias_lluvia_finde"), round(float((f["lluvia_mm"] > 0).mean()), 3), 1e-3)

def test_suavizada():
    "Máximo de la media móvil"
    assert approx(t.get("max_suavizada"), round(float(R["temperatura"].rolling(7).mean().max()), 2), 1e-3)
`,
    hints: [
      "Lee con `parse_dates=[\"fecha\"], index_col=\"fecha\"` para poder usar resample.",
      "`mensual.idxmax()` devuelve la fecha del mes; `.month` su número.",
      "`df.index.dayofweek >= 5` selecciona sábado (5) y domingo (6).",
    ],
    errors: [
      { error: "TypeError: Only valid with DatetimeIndex", fix: "resample necesita fechas en el índice: usa index_col o set_index con una columna datetime." },
      { error: "Confundir rolling con resample", fix: "resample cambia la frecuencia (de días a meses); rolling calcula ventanas móviles manteniendo la frecuencia." },
    ],
    quiz: {
      question: "Para evaluar un pronóstico de temperatura, ¿cómo separarías entrenamiento y prueba?",
      options: [
        { text: "Entrenar con los meses anteriores y probar con los posteriores" },
        { text: "Elegir días al azar para cada conjunto", misconception: "data-leakage" },
        { text: "Usar todos los datos para ambos" },
        { text: "Probar con los primeros meses y entrenar con los últimos" },
      ],
      answer: 0,
      explanation: "Mezclar al azar deja que el modelo «vea el futuro» de días vecinos: es una fuga de información temporal.",
    },
    review: "Repasa la diferencia entre resample y rolling, y por qué el orden temporal importa.",
    xp: 80,
    coins: 12,
  },
  {
    id: "w3-eda",
    world: "w3",
    zone: "Análisis exploratorio",
    title: "La lupa del cartógrafo: EDA y valores atípicos",
    kind: "lesson",
    difficulty: 3,
    skills: ["pandas", "eda", "atipicos"],
    requires: ["w3-fechas"],
    story: "El cartógrafo no dibuja el mapa de memoria: recorre el terreno, mide y anota lo inesperado. El análisis exploratorio es ese recorrido.",
    objective: "Describir distribuciones, relaciones y atípicos con la regla del rango intercuartílico (IQR), sin borrar datos a ciegas.",
    before: ["Agrupar", "Media, mediana y cuartiles (intuición)"],
    packages: ["pandas"],
    files: { "estudiantes.csv": estudiantesCsv(), "ventas.csv": ventasCsv() },
    intuition: [
      "El **análisis exploratorio (EDA)** busca entender los datos antes de modelarlos:",
      "",
      "- **Univariado**: forma de cada variable (centro, dispersión, asimetría, atípicos).",
      "- **Bivariado**: relaciones entre pares (correlación, diferencias por grupo).",
      "- **Calidad**: valores imposibles, faltantes, duplicados.",
      "",
      "Regla de Tukey para atípicos: Q1 − 1,5·IQR y Q3 + 1,5·IQR, con IQR = Q3 − Q1. Marca valores **a investigar**, no valores a borrar.",
      "",
      "La correlación de Pearson (`df.corr()`) mide asociación **lineal**; no implica causalidad.",
    ],
    example: {
      code: py`import pandas as pd
df = pd.read_csv("estudiantes.csv")
print(df[["horas_estudio", "nota_final"]].describe().round(2))
print(df[["horas_estudio", "asistencia", "nota_previa", "nota_final"]].corr().round(2)["nota_final"])
q1, q3 = df["horas_estudio"].quantile([0.25, 0.75])
print("IQR:", round(q3 - q1, 2))`,
      lines: ["Importa pandas.", "Datos de 200 estudiantes ficticios.", "Resumen de dos variables.", "Correlación de cada variable con la nota final.", "Primer y tercer cuartil.", "Rango intercuartílico."],
    },
    challenge: [
      "1. Escribe `atipicos_iqr(serie)` que devuelva un DataFrame con las filas de la serie fuera de [Q1 − 1,5·IQR, Q3 + 1,5·IQR], con columnas `valor` y `lado` (`\"bajo\"` o `\"alto\"`), conservando el índice original.",
      "2. Aplícala a las unidades de `ventas.csv` y guarda el resultado en `at_unidades`.",
      "3. Con `estudiantes.csv`, crea `correlaciones`: Series con la correlación de Pearson de cada variable numérica (excepto `id` y `aprobado`) con `nota_final`, sin incluir la propia nota, ordenada de mayor a menor y redondeada a 3.",
    ],
    starter: py`import pandas as pd

def atipicos_iqr(serie):
    media = serie.mean()
    return serie[serie > 2 * media]

ventas = pd.read_csv("ventas.csv")
at_unidades = atipicos_iqr(ventas["unidades"])
est = pd.read_csv("estudiantes.csv")
correlaciones = est.corr()`,
    solution: py`import pandas as pd

def atipicos_iqr(serie):
    s = serie.dropna()
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    bajo, alto = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    fuera = s[(s < bajo) | (s > alto)]
    return pd.DataFrame({"valor": fuera, "lado": ["bajo" if v < bajo else "alto" for v in fuera]}, index=fuera.index)

ventas = pd.read_csv("ventas.csv")
at_unidades = atipicos_iqr(ventas["unidades"])
est = pd.read_csv("estudiantes.csv")
num = est.drop(columns=["id", "aprobado"])
correlaciones = num.corr()["nota_final"].drop("nota_final").sort_values(ascending=False).round(3)
print(at_unidades)
print(correlaciones)`,
    tests: py`
import pandas as pd

def test_funcion():
    "atipicos_iqr con datos conocidos"
    s = pd.Series([1, 2, 3, 4, 5, 6, 7, 8, 100, -50], index=list("abcdefghij"))
    r = t.get("atipicos_iqr", "function")(s)
    assert list(r.columns) == ["valor", "lado"]
    assert r.to_dict("index") == {"i": {"valor": 100, "lado": "alto"}, "j": {"valor": -50, "lado": "bajo"}}

def test_faltantes():
    "Ignora faltantes"
    s = pd.Series([1, 2, None, 3, 4, 40])
    assert list(t.get("atipicos_iqr")(s)["valor"]) == [40]

def test_ventas():
    "Detecta el pedido de 140 unidades"
    a = t.get("at_unidades")
    assert 140 in set(a["valor"]) and set(a["lado"]) <= {"alto", "bajo"}

def test_correlaciones():
    "Correlaciones con la nota"
    c = t.get("correlaciones")
    est = pd.read_csv("estudiantes.csv")
    ref = est.drop(columns=["id", "aprobado"]).corr()["nota_final"].drop("nota_final").sort_values(ascending=False).round(3)
    assert list(c.index) == list(ref.index) and all(approx(a, b, 1e-3) for a, b in zip(c, ref))
`,
    hints: [
      "`q1, q3 = s.quantile(0.25), s.quantile(0.75)` y `iqr = q3 - q1`.",
      "Filtra con `(s < bajo) | (s > alto)` y construye el DataFrame con `index=fuera.index`.",
      "Para las correlaciones: `corr()[\"nota_final\"].drop(\"nota_final\")`.",
    ],
    errors: [
      { error: "Borrar todos los atípicos automáticamente", fix: "Un atípico puede ser el dato más importante (un fraude, un paciente grave). Investiga antes de excluir y documenta la decisión." },
      { error: "Usar media ± 2 DE con distribuciones asimétricas", fix: "La media y la DE se ven afectadas por los propios atípicos. La regla IQR es más robusta." },
    ],
    quiz: {
      question: "Horas de estudio y nota final tienen correlación 0,6. ¿Qué puedes afirmar?",
      options: [
        { text: "Existe una asociación lineal positiva moderada en estos datos" },
        { text: "Estudiar más causa notas más altas", misconception: "correlacion-causalidad" },
        { text: "El 60 % de la nota se explica por las horas", misconception: "correlacion-causalidad" },
        { text: "No hay relación" },
      ],
      answer: 0,
      explanation: "La correlación no dice nada de causalidad (puede haber motivación, nivel previo…). Además, r = 0,6 implica r² = 0,36, no 0,6.",
    },
    review: "Repasa la regla IQR y por qué un atípico se investiga antes de excluirlo.",
    xp: 85,
    coins: 12,
  },
  {
    id: "w3-graficos",
    world: "w3",
    zone: "Visualización",
    title: "Los estandartes del reino: visualización con Matplotlib",
    kind: "lesson",
    difficulty: 3,
    skills: ["visualizacion", "matplotlib"],
    requires: ["w3-eda"],
    story: "Un estandarte bien diseñado se entiende desde lejos. Un gráfico también: título claro, ejes con nombre y la forma adecuada para cada pregunta.",
    objective: "Crear histogramas, diagramas de dispersión y de cajas con Matplotlib, con títulos, etiquetas y la forma adecuada a la pregunta.",
    before: ["EDA", "DataFrames"],
    packages: ["pandas", "matplotlib"],
    files: { "estudiantes.csv": estudiantesCsv() },
    intuition: [
      "Elige el gráfico por la pregunta:",
      "",
      "- **Distribución** de una variable → histograma o diagrama de cajas.",
      "- **Relación** entre dos numéricas → dispersión.",
      "- **Comparar grupos** → cajas o barras con intervalos.",
      "- **Evolución** en el tiempo → líneas.",
      "",
      "Interfaz orientada a objetos (recomendada):",
      "```python",
      "fig, axes = plt.subplots(1, 2, figsize=(10, 4))",
      "axes[0].hist(datos, bins=20)",
      "axes[0].set(title=\"...\", xlabel=\"...\", ylabel=\"...\")",
      "```",
      "",
      "Un gráfico sin título ni etiquetas obliga al lector a adivinar. Los ejes de barras deben empezar en cero.",
    ],
    example: {
      code: py`import matplotlib.pyplot as plt
import pandas as pd
df = pd.read_csv("estudiantes.csv")
fig, ax = plt.subplots(figsize=(6, 4))
ax.scatter(df["horas_estudio"], df["nota_final"], s=12, alpha=0.6)
ax.set(title="Horas de estudio y nota final", xlabel="Horas por semana", ylabel="Nota (0-10)")`,
      lines: ["Importa la interfaz de gráficos.", "Importa pandas.", "Lee los datos.", "Crea una figura con un eje.", "Diagrama de dispersión con puntos semitransparentes.", "Título y etiquetas: el gráfico aparece debajo de la consola."],
    },
    challenge: [
      "Con `estudiantes.csv`, crea **una figura con 3 paneles** (`plt.subplots(1, 3)`):",
      "1. Histograma de `nota_final` con 20 intervalos.",
      "2. Dispersión de `asistencia` (x) frente a `nota_final` (y).",
      "3. Diagrama de cajas de `nota_final` para aprobados y suspensos (`ax.boxplot([...])` con etiquetas `\"Suspenso\"`, `\"Aprobado\"`).",
      "Cada panel debe tener título y etiquetas en ambos ejes. Guarda la figura en la variable `fig`.",
    ],
    starter: py`import matplotlib.pyplot as plt
import pandas as pd

df = pd.read_csv("estudiantes.csv")
plt.hist(df["nota_final"])`,
    solution: py`import matplotlib.pyplot as plt
import pandas as pd

df = pd.read_csv("estudiantes.csv")
fig, (a1, a2, a3) = plt.subplots(1, 3, figsize=(13, 4))
a1.hist(df["nota_final"], bins=20, color="#3987e5", edgecolor="white")
a1.set(title="Distribución de la nota", xlabel="Nota final", ylabel="Estudiantes")
a2.scatter(df["asistencia"], df["nota_final"], s=10, alpha=0.6)
a2.set(title="Asistencia y nota", xlabel="Asistencia (proporción)", ylabel="Nota final")
a3.boxplot([df.loc[df["aprobado"] == 0, "nota_final"], df.loc[df["aprobado"] == 1, "nota_final"]])
a3.set_xticks([1, 2], ["Suspenso", "Aprobado"])
a3.set(title="Nota por resultado", xlabel="Resultado", ylabel="Nota final")
fig.tight_layout()`,
    tests: py`
def test_figura():
    "Una figura con 3 paneles"
    fig = t.get("fig")
    assert len(fig.axes) == 3, f"La figura tiene {len(fig.axes)} paneles"

def test_etiquetas():
    "Cada panel tiene título y etiquetas"
    for i, ax in enumerate(t.get("fig").axes):
        assert ax.get_title(), f"El panel {i + 1} no tiene título"
        assert ax.get_xlabel() and ax.get_ylabel(), f"El panel {i + 1} no tiene etiquetas en los ejes"

def test_contenido():
    "Histograma de 20 barras, 200 puntos y 2 cajas"
    a1, a2, a3 = t.get("fig").axes
    assert len(a1.patches) == 20, f"El histograma tiene {len(a1.patches)} barras"
    offsets = a2.collections[0].get_offsets() if a2.collections else []
    assert len(offsets) == 200, "El panel 2 debe tener los 200 puntos"
    etiquetas = [x.get_text() for x in a3.get_xticklabels()]
    assert etiquetas == ["Suspenso", "Aprobado"], etiquetas
`,
    hints: [
      "`fig, (a1, a2, a3) = plt.subplots(1, 3, figsize=(13, 4))`.",
      "Usa `ax.set(title=..., xlabel=..., ylabel=...)` en cada panel.",
      "Para las cajas: `a3.boxplot([notas_suspensos, notas_aprobados])` y `a3.set_xticks([1, 2], [\"Suspenso\", \"Aprobado\"])`.",
    ],
    errors: [
      { error: "Gráficos superpuestos en una sola figura", fix: "Con la interfaz plt.* todo va al último eje activo. Usa los objetos ax de subplots." },
      { error: "Barras con el eje y truncado", fix: "En gráficos de barras el eje debe empezar en cero o la comparación visual engaña." },
    ],
    quiz: {
      question: "Quieres mostrar cómo se distribuyen los ingresos (muy asimétricos) de 5000 clientes. ¿Qué gráfico eliges?",
      options: [
        { text: "Un histograma (quizá con escala logarítmica) o un diagrama de cajas" },
        { text: "Un gráfico de tarta" },
        { text: "Un gráfico de líneas con un punto por cliente" },
        { text: "Una barra con la media" },
      ],
      answer: 0,
      explanation: "La pregunta es sobre una distribución: el histograma muestra su forma y la caja resume mediana, cuartiles y atípicos. Una sola media escondería la asimetría.",
    },
    review: "Repasa cómo elegir el tipo de gráfico a partir de la pregunta.",
    xp: 85,
    coins: 12,
  },
  {
    id: "proj-informe-ventas",
    world: "w3",
    zone: "Proyecto del Reino",
    title: "Proyecto: informe de ventas del reino",
    kind: "project",
    difficulty: 4,
    skills: ["pandas", "limpieza", "agrupacion", "visualizacion", "comunicacion"],
    requires: ["w3-graficos"],
    story: [
      "El consejo del reino quiere saber cómo van las ventas de la tienda: qué se vende, dónde, cuándo y si hay algo raro.",
      "Tu informe debe ser reproducible (todo el proceso en código), honesto sobre la limpieza y claro en sus conclusiones.",
    ],
    objective: "Analizar un dataset realista de principio a fin: limpieza documentada, indicadores, patrones temporales, gráficos y hallazgos escritos.",
    before: ["Limpieza", "Agrupación", "Fechas", "Visualización"],
    packages: ["pandas", "matplotlib"],
    files: { "ventas.csv": ventasCsv() },
    intuition: [
      "Un informe de datos responde preguntas concretas con evidencia. Estructura recomendada:",
      "",
      "1. **Datos y limpieza**: qué había, qué se corrigió y por qué.",
      "2. **Indicadores clave**: totales y promedios relevantes.",
      "3. **Patrones**: por categoría y en el tiempo.",
      "4. **Anomalías**: qué destaca y si es un error o algo real.",
      "5. **Hallazgos y limitaciones**: frases claras que no exageren lo que los datos permiten afirmar.",
    ],
    example: {
      code: py`import pandas as pd
df = pd.read_csv("ventas.csv", parse_dates=["fecha"])
df["dia"] = df["fecha"].dt.day_name()
print(df.groupby(df["fecha"].dt.dayofweek >= 5)["unidades"].mean().round(2))`,
      lines: ["Importa pandas.", "Lee las ventas.", "Nombre del día de la semana.", "Unidades medias en días laborables (False) y fines de semana (True)."],
    },
    challenge: [
      "Escribe un análisis que defina estas variables (las pruebas evalúan cada etapa):",
      "1. **Limpieza** → `limpio` (regiones normalizadas, sin pedidos duplicados, sin unidades faltantes, con columna `ingreso`) e `informe_limpieza` (diccionario con `inicial`, `duplicados`, `sin_unidades`, `final`).",
      "2. **Indicadores** → `kpi`: diccionario con `ingreso_total` (redondeado a 2), `pedidos`, `ticket_medio` (2 decimales) y `unidades_mediana`.",
      "3. **Patrones** → `ingreso_mensual`: Series del ingreso por mes (resample \"MS\"); `finde_vs_laborable`: diccionario `{\"laborable\": media de unidades, \"finde\": media de unidades}` redondeado a 2.",
      "4. **Anomalías** → `anomalias`: lista de números de pedido con unidades por encima de Q3 + 3·IQR (atípicos extremos).",
      "5. **Comunicación** → `fig` con al menos 2 paneles titulados y `hallazgos`: lista de al menos 3 frases (cada una de 40 caracteres o más) que mencionen cifras de tu análisis.",
    ],
    starter: py`import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("ventas.csv", parse_dates=["fecha"])

# 1. Limpieza
limpio = df
informe_limpieza = {}

# 2. Indicadores
kpi = {}

# 3. Patrones
ingreso_mensual = None
finde_vs_laborable = {}

# 4. Anomalías
anomalias = []

# 5. Comunicación
fig = None
hallazgos = []`,
    solution: py`import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("ventas.csv", parse_dates=["fecha"])

# 1. Limpieza
limpio = df.copy()
informe_limpieza = {"inicial": len(limpio)}
limpio["region"] = limpio["region"].str.strip().str.title()
n = len(limpio)
limpio = limpio.drop_duplicates(subset="pedido")
informe_limpieza["duplicados"] = n - len(limpio)
n = len(limpio)
limpio = limpio.dropna(subset=["unidades"])
informe_limpieza["sin_unidades"] = n - len(limpio)
informe_limpieza["final"] = len(limpio)
limpio["ingreso"] = limpio["unidades"] * limpio["precio"]

# 2. Indicadores
kpi = {
    "ingreso_total": round(float(limpio["ingreso"].sum()), 2),
    "pedidos": int(len(limpio)),
    "ticket_medio": round(float(limpio["ingreso"].mean()), 2),
    "unidades_mediana": float(limpio["unidades"].median()),
}

# 3. Patrones
ingreso_mensual = limpio.set_index("fecha")["ingreso"].resample("MS").sum()
es_finde = limpio["fecha"].dt.dayofweek >= 5
finde_vs_laborable = {
    "laborable": round(float(limpio.loc[~es_finde, "unidades"].mean()), 2),
    "finde": round(float(limpio.loc[es_finde, "unidades"].mean()), 2),
}

# 4. Anomalías
q1, q3 = limpio["unidades"].quantile([0.25, 0.75])
anomalias = limpio.loc[limpio["unidades"] > q3 + 3 * (q3 - q1), "pedido"].tolist()

# 5. Comunicación
fig, (a1, a2) = plt.subplots(1, 2, figsize=(12, 4))
ingreso_mensual.plot(ax=a1, marker="o")
a1.set(title="Ingreso mensual", xlabel="Mes", ylabel="Ingreso")
limpio.groupby("producto")["ingreso"].sum().sort_values().plot.barh(ax=a2)
a2.set(title="Ingreso por producto", xlabel="Ingreso", ylabel="Producto")
fig.tight_layout()

top = limpio.groupby("producto")["ingreso"].sum().idxmax()
hallazgos = [
    f"Tras limpiar {informe_limpieza['duplicados']} duplicados y {informe_limpieza['sin_unidades']} pedidos sin unidades quedan {kpi['pedidos']} pedidos.",
    f"El ingreso total es {kpi['ingreso_total']} con un ticket medio de {kpi['ticket_medio']} por pedido.",
    f"Los fines de semana se venden {finde_vs_laborable['finde']} unidades por pedido frente a {finde_vs_laborable['laborable']} entre semana.",
    f"{top} es el producto con más ingresos; el pedido {anomalias[0] if anomalias else '-'} es un atípico extremo que conviene verificar.",
]
for h in hallazgos:
    print("-", h)`,
    tests: py`
import pandas as pd
RAW = pd.read_csv("ventas.csv", parse_dates=["fecha"])
C = RAW.copy()
C["region"] = C["region"].str.strip().str.title()
C = C.drop_duplicates(subset="pedido").dropna(subset=["unidades"])
C["ingreso"] = C["unidades"] * C["precio"]

def test_etapa1_limpieza():
    "Etapa 1: limpieza documentada"
    L, inf = t.get("limpio"), t.get("informe_limpieza")
    assert len(L) == len(C) and "ingreso" in L.columns and L["pedido"].is_unique
    assert sorted(L["region"].unique()) == ["Este", "Norte", "Oeste", "Sur"]
    assert inf == {"inicial": len(RAW), "duplicados": int(RAW.duplicated("pedido").sum()), "sin_unidades": len(RAW) - int(RAW.duplicated("pedido").sum()) - len(C), "final": len(C)}

def test_etapa2_kpi():
    "Etapa 2: indicadores"
    k = t.get("kpi")
    assert approx(k["ingreso_total"], round(C["ingreso"].sum(), 2)) and k["pedidos"] == len(C)
    assert approx(k["ticket_medio"], round(C["ingreso"].mean(), 2), 1e-4) and approx(k["unidades_mediana"], C["unidades"].median())

def test_etapa3_patrones():
    "Etapa 3: patrones temporales"
    m = t.get("ingreso_mensual")
    assert len(m) == 4 and approx(float(m.sum()), float(C["ingreso"].sum()))
    f = t.get("finde_vs_laborable")
    e = C["fecha"].dt.dayofweek >= 5
    assert approx(f["finde"], round(C.loc[e, "unidades"].mean(), 2), 1e-4) and approx(f["laborable"], round(C.loc[~e, "unidades"].mean(), 2), 1e-4)
    assert f["finde"] > f["laborable"]

def test_etapa4_anomalias():
    "Etapa 4: atípicos extremos"
    q1, q3 = C["unidades"].quantile([0.25, 0.75])
    assert sorted(t.get("anomalias")) == sorted(C.loc[C["unidades"] > q3 + 3 * (q3 - q1), "pedido"].tolist())
    assert len(t.get("anomalias")) >= 1

def test_etapa5_comunicacion():
    "Etapa 5: gráficos titulados y hallazgos con cifras"
    import re
    fig = t.get("fig")
    assert len(fig.axes) >= 2 and all(ax.get_title() for ax in fig.axes)
    h = t.get("hallazgos")
    assert len(h) >= 3 and all(len(x) >= 40 for x in h), "Escribe al menos 3 hallazgos completos"
    assert sum(bool(re.search(r"\d", x)) for x in h) >= 3, "Los hallazgos deben citar cifras del análisis"
`,
    hints: [
      "Reutiliza tu función de limpieza de la misión «Purificar el pozo».",
      "Para el ingreso mensual pon la fecha como índice: `limpio.set_index(\"fecha\")[\"ingreso\"].resample(\"MS\").sum()`.",
      "Construye los hallazgos con f-strings que usen tus variables: así se actualizan si cambian los datos.",
    ],
    errors: [
      { error: "Hallazgos que exageran", fix: "«Los fines de semana se vende más» describe; «las promociones de fin de semana causan más ventas» es una afirmación causal que estos datos no sostienen." },
      { error: "Cifras escritas a mano en el texto", fix: "Si las calculas en el código, el informe es reproducible y no se desactualiza." },
    ],
    quiz: {
      question: "Los pedidos de fin de semana tienen más unidades. ¿Qué hallazgo es honesto?",
      options: [
        { text: "En estos 120 días, los pedidos de fin de semana tuvieron más unidades de media" },
        { text: "Abrir los fines de semana causa más ventas", misconception: "correlacion-causalidad" },
        { text: "La diferencia se mantendrá siempre en el futuro" },
        { text: "La diferencia es estadísticamente significativa", misconception: "significacion-relevancia" },
      ],
      answer: 0,
      explanation: "Lo descriptivo se acota a los datos observados. Para generalizar haría falta inferencia; para afirmar causas, un diseño adecuado.",
    },
    review: "Repasa la estructura de un informe: datos y limpieza, indicadores, patrones, anomalías, hallazgos y limitaciones.",
    project: {
      requirements: ["Todo el análisis en código reproducible", "Limpieza documentada con recuentos", "Al menos dos gráficos titulados", "Hallazgos que citen cifras calculadas"],
      dataset: "ventas.csv: 120 días de pedidos sintéticos generados por Python Quest (sin datos personales).",
      stages: ["Limpieza documentada", "Indicadores clave", "Patrones por categoría y tiempo", "Detección de anomalías", "Gráficos y hallazgos"],
      criteria: ["Las cinco etapas pasan sus pruebas", "Las cifras del texto proceden del código", "Las conclusiones no exceden lo que muestran los datos"],
      extensions: ["Añadir intervalos de confianza a las medias (Mundo 4)", "Comparar regiones con una prueba estadística", "Exportar el informe a CSV/JSON", "Un dashboard con varias vistas"],
      portfolio: "Informe reproducible de ventas: limpieza documentada, indicadores, estacionalidad semanal, detección de atípicos y visualizaciones.",
    },
    xp: 250,
    coins: 50,
  },
];
