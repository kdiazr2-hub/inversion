import { sensoresCsv, sensoresEtiquetasCsv } from "../datasets";
import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 5: un detector de anomalías para sensores, de la ingesta de datos
// sucios a la evaluación honesta y el almacenamiento en SQLite.

const SERIES = { id: "detector-anomalias", title: "Proyecto progresivo: el detector de anomalías", of: 4 };
const FILES = { "sensores.csv": sensoresCsv(), "sensores_etiquetas.csv": sensoresEtiquetasCsv() };

const SPEC: ProjectSpec = {
  requirements: [
    "Ingerir datos sucios (lecturas «ERR», duplicados, mensajes desordenados y horas perdidas) documentando cada paso.",
    "Construir una serie horaria regular por sensor, imputando solo huecos cortos y marcando lo imputado.",
    "Comparar detectores globales (z clásico y robusto) con detectores contextuales (perfil horario, sensor atascado).",
    "Elegir el umbral con datos de validación y medir el rendimiento final en un periodo de prueba distinto.",
    "Guardar las anomalías en una base de datos SQLite y generar un resumen con SQL.",
  ],
  dataset: "sensores.csv (lecturas horarias de dos sensores durante 60 días) y sensores_etiquetas.csv (qué lecturas eran anomalías reales, solo para evaluar). Datos sintéticos.",
  stages: ["Ingesta, limpieza y serie regular", "Detectores globales: z clásico y robusto", "Detección contextual: perfil horario y sensor atascado", "Evaluación honesta y almacenamiento"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Ningún parámetro se ajusta mirando el periodo de prueba.",
    "El informe de limpieza permite reproducir cada decisión.",
    "Las anomalías se guardan en SQLite y el resumen sale de una consulta SQL.",
  ],
  extensions: [
    "Isolation Forest de scikit-learn sobre (residuo horario, diferencia con la hora anterior) y comparación con tu detector.",
    "Alertas que exijan dos lecturas anómalas seguidas para reducir falsos positivos.",
    "Panel con matplotlib: serie, anomalías detectadas y anomalías reales por sensor.",
  ],
  portfolio: "Pipeline de detección de anomalías en series temporales de sensores: limpieza documentada, estadística robusta, detección contextual, validación temporal y almacenamiento en SQLite.",
};

const S1 = py`import numpy as np
import pandas as pd

def cargar(ruta):
    df = pd.read_csv(ruta)
    df["fecha_hora"] = pd.to_datetime(df["fecha_hora"])
    df["temperatura"] = pd.to_numeric(df["temperatura"], errors="coerce")
    return df

def limpiar(df):
    errores = int(df["temperatura"].isna().sum())
    sin_err = df.dropna(subset=["temperatura"])
    duplicados = int(sin_err.duplicated(["fecha_hora", "sensor"]).sum())
    limpio = sin_err.drop_duplicates(["fecha_hora", "sensor"]).sort_values(["sensor", "fecha_hora"]).reset_index(drop=True)
    return limpio, {"errores": errores, "duplicados": duplicados, "n": len(limpio)}

def regularizar(df, max_hueco=3):
    partes = []
    for sensor, g in df.groupby("sensor"):
        g = g.set_index("fecha_hora")[["temperatura"]].asfreq("h")
        faltaba = g["temperatura"].isna()
        g["temperatura"] = g["temperatura"].interpolate(method="time", limit=max_hueco, limit_area="inside")
        g["imputado"] = faltaba & g["temperatura"].notna()
        g["sensor"] = sensor
        partes.append(g.reset_index())
    return pd.concat(partes, ignore_index=True)[["fecha_hora", "sensor", "temperatura", "imputado"]]

limpio, informe = limpiar(cargar("sensores.csv"))
serie = regularizar(limpio)`;

const S2 = py`def z_clasico(x):
    x = pd.Series(x, dtype=float)
    return (x - x.mean()) / x.std()

def z_robusto(x):
    x = pd.Series(x, dtype=float)
    mediana = x.median()
    mad = (x - mediana).abs().median()
    return (x - mediana) / (1.4826 * mad)

def detectar_global(serie, umbral=3.5, robusto=True):
    funcion = z_robusto if robusto else z_clasico
    out = serie.copy()
    out["z_global"] = out.groupby("sensor")["temperatura"].transform(funcion)
    out["anomalia_global"] = out["z_global"].abs() > umbral
    return out`;

const S3 = py`def residuo_horario(serie):
    hora = serie["fecha_hora"].dt.hour
    mediana = serie.groupby([serie["sensor"], hora])["temperatura"].transform("median")
    return serie["temperatura"] - mediana

def atascado(serie, horas=4):
    def marcar(x):
        igual = x.diff().eq(0)
        grupo = (~igual).cumsum()
        return x.groupby(grupo).transform("size") >= horas
    return serie.groupby("sensor")["temperatura"].transform(marcar).astype(bool)

def detectar_contextual(serie, umbral=3.5, horas=4):
    out = serie.copy()
    out["residuo"] = residuo_horario(out)
    out["z_contexto"] = out.groupby("sensor")["residuo"].transform(z_robusto)
    out["atascado"] = atascado(out, horas)
    out["anomalia"] = (out["z_contexto"].abs() > umbral) | out["atascado"]
    return out`;

const S4 = py`import sqlite3

def evaluar(pred, real):
    pred, real = np.asarray(pred, dtype=bool), np.asarray(real, dtype=bool)
    vp = int((pred & real).sum())
    fp = int((pred & ~real).sum())
    fn = int((~pred & real).sum())
    precision = vp / (vp + fp) if vp + fp else 0.0
    recall = vp / (vp + fn) if vp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"precision": precision, "recall": recall, "f1": f1}

def unir_etiquetas(serie, ruta):
    et = pd.read_csv(ruta)
    et["fecha_hora"] = pd.to_datetime(et["fecha_hora"])
    out = serie.merge(et, on=["fecha_hora", "sensor"], how="left")
    out["real"] = out["anomalia"].fillna(0).astype(bool)
    return out.drop(columns="anomalia")

def elegir_umbral(datos, umbrales=(2.5, 3.0, 3.5, 4.0, 5.0), dias_validacion=30):
    corte = datos["fecha_hora"].min() + pd.Timedelta(days=dias_validacion)
    validacion = datos["fecha_hora"] < corte
    f1s = [evaluar(detectar_contextual(datos, u)["anomalia"][validacion], datos["real"][validacion])["f1"] for u in umbrales]
    mejor = umbrales[int(np.argmax(f1s))]
    final = detectar_contextual(datos, mejor)
    return {
        "umbral": mejor,
        "f1_validacion": max(f1s),
        "f1_prueba": evaluar(final["anomalia"][~validacion], datos["real"][~validacion])["f1"],
    }

def guardar(detectado, ruta):
    con = sqlite3.connect(ruta)
    con.execute("DROP TABLE IF EXISTS anomalias")
    con.execute("CREATE TABLE anomalias (fecha_hora TEXT, sensor TEXT, temperatura REAL)")
    filas = detectado.loc[detectado["anomalia"], ["fecha_hora", "sensor", "temperatura"]]
    con.executemany("INSERT INTO anomalias VALUES (?, ?, ?)", [(str(f), s, float(v)) for f, s, v in filas.itertuples(index=False)])
    con.commit()
    resumen = con.execute("SELECT sensor, COUNT(*) FROM anomalias GROUP BY sensor ORDER BY sensor").fetchall()
    con.close()
    return resumen

datos = unir_etiquetas(serie, "sensores_etiquetas.csv")
comparacion = {
    "global": evaluar(detectar_global(datos)["anomalia_global"], datos["real"])["f1"],
    "contextual": evaluar(detectar_contextual(datos)["anomalia"], datos["real"])["f1"],
}
seleccion = elegir_umbral(datos)
resumen = guardar(detectar_contextual(datos, seleccion["umbral"]), "anomalias.db")`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

// Reference cleaning used by the tests of every stage (independent of the learner's code).
const REF = py`
import numpy as np
import pandas as pd

def _ref_serie():
    df = pd.read_csv("sensores.csv")
    df["fecha_hora"] = pd.to_datetime(df.fecha_hora)
    df["temperatura"] = pd.to_numeric(df.temperatura, errors="coerce")
    df = df.dropna(subset=["temperatura"]).drop_duplicates(["fecha_hora", "sensor"])
    partes = []
    for s, g in df.groupby("sensor"):
        g = g.set_index("fecha_hora")[["temperatura"]].sort_index().asfreq("h")
        falta = g.temperatura.isna()
        g["temperatura"] = g.temperatura.interpolate(method="time", limit=3, limit_area="inside")
        g["imputado"] = falta & g.temperatura.notna()
        g["sensor"] = s
        partes.append(g.reset_index())
    return pd.concat(partes, ignore_index=True)
`;

export const PROJ_SENSORES: Mission[] = [
  {
    id: "pa-sensores-1",
    world: "w5",
    zone: "Proyecto de la Ciudad",
    title: "El detector de anomalías · 1: ingesta, limpieza y serie regular",
    kind: "project",
    difficulty: 3,
    skills: ["limpieza-datos", "series-temporales", "pandas", "etl"],
    requires: ["db-etl"],
    series: { ...SERIES, stage: 1 },
    story: "Los sensores de temperatura de la ciudad mandan una lectura por hora… cuando funcionan. Algunos mensajes llegan repetidos o desordenados, otros dicen «ERR» y algunos se pierden. Antes de buscar anomalías hay que tener una serie limpia y regular.",
    objective: "Leer datos de sensores con fechas y valores erróneos, limpiarlos con un informe de lo que se hizo y construir una serie horaria regular por sensor que impute solo los huecos cortos.",
    before: ["ETL (db-etl)", "Fechas con pandas", "groupby"],
    packages: ["numpy", "pandas"],
    files: FILES,
    intuition: [
      "Los datos de sensores rara vez llegan perfectos:",
      "",
      "- Lecturas «ERR»: se convierten a faltantes con `pd.to_numeric(..., errors=\"coerce\")`.",
      "- Mensajes duplicados (misma hora y sensor): se queda uno.",
      "- Mensajes desordenados: se ordena por sensor y hora.",
      "- Horas perdidas: con `asfreq(\"h\")` cada sensor tiene una fila por hora; los huecos aparecen como NaN.",
      "",
      "¿Rellenar los huecos? Solo si son **cortos**: interpolar 2 horas de temperatura es razonable; inventar un día entero no. Y siempre **marcando** lo imputado, para no confundir un dato inventado con uno medido.",
    ],
    formal: "Interpolación lineal en el tiempo: x(t) = x(t₀) + (t − t₀)·(x(t₁) − x(t₀))/(t₁ − t₀) para t₀ < t < t₁.",
    example: {
      code: py`import pandas as pd
df = pd.read_csv("sensores.csv")
print(df.head(3))
print((df["temperatura"] == "ERR").sum(), df.duplicated().sum())
fechas = pd.to_datetime(df["fecha_hora"])
print(fechas.is_monotonic_increasing)`,
      lines: [
        "pandas.",
        "Lecturas tal como llegan.",
        "Primeras filas: fecha, sensor y temperatura (texto, porque hay «ERR»).",
        "Cuántas lecturas erróneas y cuántos mensajes duplicados.",
        "Convertimos el texto a fechas.",
        "False: hay mensajes fuera de orden.",
      ],
    },
    challenge: [
      "1. `cargar(ruta)`: DataFrame con `fecha_hora` como fecha y `temperatura` numérica («ERR» → NaN).",
      "2. `limpiar(df)`: tupla (limpio, informe). Quita las lecturas sin temperatura y los duplicados de (fecha_hora, sensor), ordena por sensor y hora y reinicia el índice. `informe` = {\"errores\", \"duplicados\", \"n\"} (duplicados contados tras quitar los errores).",
      "3. `regularizar(df, max_hueco=3)`: para cada sensor, una fila por hora entre su primera y su última lectura (`asfreq(\"h\")`), temperatura interpolada en el tiempo con `limit=max_hueco` y `limit_area=\"inside\"`, y columna booleana `imputado`. Devuelve un DataFrame con columnas `fecha_hora`, `sensor`, `temperatura`, `imputado`.",
      "4. `limpio, informe = limpiar(cargar(\"sensores.csv\"))` y `serie = regularizar(limpio)`.",
    ],
    starter: py`import numpy as np
import pandas as pd

def cargar(ruta):
    return pd.read_csv(ruta)

def limpiar(df):
    return df, {}

def regularizar(df, max_hueco=3):
    return df

limpio, informe = limpiar(cargar("sensores.csv"))
serie = regularizar(limpio)`,
    solution: SOL1,
    tests: `${REF}
def test_cargar():
    "Tipos correctos"
    df = t.get("cargar", "function")("sensores.csv")
    assert pd.api.types.is_datetime64_any_dtype(df["fecha_hora"]) and pd.api.types.is_float_dtype(df["temperatura"])
    assert df["temperatura"].isna().sum() == 15

def test_limpiar():
    "Errores, duplicados y orden"
    limpio, inf = t.get("limpiar", "function")(t.get("cargar", "function")("sensores.csv"))
    assert inf["errores"] == 15 and inf["duplicados"] == 16 and inf["n"] == len(limpio)
    assert not limpio.duplicated(["fecha_hora", "sensor"]).any() and limpio["temperatura"].notna().all()
    for _, g in limpio.groupby("sensor"):
        assert g["fecha_hora"].is_monotonic_increasing
    assert list(limpio.index) == list(range(len(limpio)))

def test_regularizar():
    "Serie horaria con huecos cortos imputados"
    s = t.get("serie")
    ref = _ref_serie()
    assert list(s.columns) == ["fecha_hora", "sensor", "temperatura", "imputado"]
    assert len(s) == len(ref) == 2879
    m = s.merge(ref, on=["fecha_hora", "sensor"], suffixes=("", "_ref"))
    assert len(m) == len(ref)
    assert np.allclose(m.temperatura, m.temperatura_ref, equal_nan=True) and (m.imputado == m.imputado_ref).all()

def test_huecos_largos():
    "Los huecos largos no se inventan"
    f = t.get("regularizar", "function")
    df = pd.DataFrame({"fecha_hora": pd.to_datetime(["2025-01-01 00:00", "2025-01-01 01:00", "2025-01-01 07:00", "2025-01-01 08:00"]), "sensor": "X", "temperatura": [1.0, 2.0, 8.0, 9.0]})
    r = f(df, max_hueco=2)
    assert len(r) == 9 and r.imputado.sum() == 2 and r.temperatura.isna().sum() == 3
`,
    hints: [
      "cargar: `pd.to_datetime` para la fecha y `pd.to_numeric(..., errors=\"coerce\")` para la temperatura.",
      "limpiar: `dropna(subset=[\"temperatura\"])`, después `duplicated([\"fecha_hora\", \"sensor\"]).sum()` y `drop_duplicates([...])`, y `sort_values([\"sensor\", \"fecha_hora\"]).reset_index(drop=True)`.",
      "regularizar: para cada sensor, `g.set_index(\"fecha_hora\")[[\"temperatura\"]].asfreq(\"h\")`; guarda qué faltaba **antes** de interpolar y concatena las partes con `pd.concat`.",
    ],
    errors: [
      { error: "Interpolar sin límite", fix: "Rellenarías días enteros con una recta: luego el detector juzgaría datos inventados." },
      { error: "Quitar duplicados antes de convertir «ERR»", fix: "Un mensaje «ERR» y uno válido de la misma hora no son duplicados exactos; decide el orden de los pasos y documéntalo." },
      { error: "No marcar lo imputado", fix: "Un valor interpolado nunca será anómalo: si no lo marcas, inflará el rendimiento del detector." },
    ],
    quiz: {
      question: "Un sensor pierde 10 horas seguidas de datos. ¿Qué es lo más adecuado?",
      options: [
        { text: "Dejar esas horas como faltantes (marcadas) y no evaluar anomalías en ellas" },
        { text: "Interpolar las 10 horas: la temperatura cambia lentamente" },
        { text: "Rellenarlas con la media del sensor" },
        { text: "Borrar todo el día de ese sensor" },
      ],
      answer: 0,
      explanation: "En 10 horas la temperatura recorre buena parte de su ciclo diario: una interpolación inventaría el perfil. Lo honesto es dejarlo como faltante y que el resto del pipeline lo sepa.",
    },
    project: SPEC,
    review: "Repasa: coerce para lecturas erróneas, duplicados por clave, asfreq para la rejilla horaria, interpolar solo huecos cortos y marcar lo imputado.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pa-sensores-2",
    world: "w5",
    zone: "Proyecto de la Ciudad",
    title: "El detector de anomalías · 2: detectores globales, clásicos y robustos",
    kind: "project",
    difficulty: 3,
    skills: ["deteccion-anomalias", "estadistica-robusta", "pandas"],
    requires: ["pa-sensores-1", "e-dispersion"],
    series: { ...SERIES, stage: 2 },
    story: "Primer intento: marcar como anómala cualquier lectura muy alejada de lo habitual para ese sensor. ¿Pero qué es «lo habitual» cuando los propios atípicos estropean la media?",
    objective: "Implementar las puntuaciones z clásica y robusta, entender el enmascaramiento y aplicar un detector global por sensor.",
    before: ["Etapa 1", "Mediana y MAD (e-dispersion)", "groupby + transform"],
    packages: ["numpy", "pandas"],
    files: FILES,
    intuition: [
      "La **puntuación z** mide cuántas desviaciones típicas se aleja un valor de la media. Pero media y desviación típica son **sensibles a los atípicos**: unos pocos valores extremos inflan la desviación y hacen que los demás atípicos parezcan normales. Es el **enmascaramiento**.",
      "",
      "La **z robusta** usa la mediana y la MAD (mediana de las desviaciones absolutas), que apenas se mueven con algunos atípicos. Multiplicar la MAD por 1,4826 la hace comparable con la desviación típica en datos normales. Un umbral habitual es 3,5.",
      "",
      "Se calcula **por sensor**: cada uno tiene su propio nivel. `groupby(\"sensor\")[...].transform(funcion)` aplica la función a cada grupo y devuelve una columna alineada con el DataFrame.",
    ],
    formal: "z = (x − x̄)/s · z_robusta = (x − mediana)/(1,4826·MAD), MAD = mediana(|xᵢ − mediana|)",
    example: {
      code: py`import numpy as np
x = np.array([20.0, 21, 19, 20, 22, 21, 20, 60, 61, 62])
z = (x - x.mean()) / x.std(ddof=1)
mad = np.median(np.abs(x - np.median(x)))
zr = (x - np.median(x)) / (1.4826 * mad)
print(z.round(1)[-3:], zr.round(1)[-3:])`,
      lines: [
        "NumPy.",
        "Siete lecturas normales y tres atípicas.",
        "z clásica: los atípicos inflan la desviación típica…",
        "MAD: mediana de las distancias a la mediana.",
        "z robusta.",
        "…y la z clásica de los atípicos se queda en ~1,5, mientras la robusta pasa de 20.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `z_clasico(x)`: Serie de puntuaciones z (desviación típica muestral).",
      "2. `z_robusto(x)`: Serie de puntuaciones z robustas (mediana y 1,4826·MAD).",
      "3. `detectar_global(serie, umbral=3.5, robusto=True)`: copia de la serie con `z_global` (calculada **por sensor** con la función elegida) y `anomalia_global` (|z| > umbral).",
    ],
    starter: py`def z_clasico(x):
    return x

def z_robusto(x):
    return x

def detectar_global(serie, umbral=3.5, robusto=True):
    return serie`,
    solution: SOL2,
    tests: `${REF}
def test_z():
    "Puntuaciones z"
    x = pd.Series([20.0, 21, 19, 20, 22, 21, 20, 60, 61, 62])
    zc = t.get("z_clasico", "function")(x)
    zr = t.get("z_robusto", "function")(x)
    assert np.allclose(zc, (x - x.mean()) / x.std())
    mad = (x - x.median()).abs().median()
    assert np.allclose(zr, (x - x.median()) / (1.4826 * mad))

def test_enmascaramiento():
    "La z robusta no se deja enmascarar"
    x = pd.Series([20.0, 21, 19, 20, 22, 21, 20, 60, 61, 62])
    assert (t.get("z_clasico", "function")(x).abs() > 3.5).sum() == 0
    assert (t.get("z_robusto", "function")(x).abs() > 3.5).sum() == 3

def test_por_sensor():
    "Cada sensor con su propia escala"
    f = t.get("detectar_global", "function")
    df = pd.DataFrame({"sensor": ["A"] * 6 + ["B"] * 6, "temperatura": [10, 11, 10, 12, 11, 30, 100, 101, 100, 102, 101, 100.5], "fecha_hora": pd.date_range("2025-01-01", periods=12, freq="h")})
    r = f(df)
    assert list(r["anomalia_global"]) == [False] * 5 + [True] + [False] * 6
    assert "anomalia_global" not in df.columns, "Trabaja sobre una copia"

def test_en_la_serie():
    "Aplicado a la serie del proyecto"
    r = t.get("detectar_global", "function")(t.get("serie"))
    assert len(r) == 2879 and r["anomalia_global"].dtype == bool
`,
    hints: [
      "z_robusto: `mediana = x.median()`, `mad = (x - mediana).abs().median()`.",
      "Por sensor: `out.groupby(\"sensor\")[\"temperatura\"].transform(funcion)` devuelve una Serie del mismo largo que `out`.",
      "Convierte la entrada con `pd.Series(x, dtype=float)` para aceptar listas y arrays.",
    ],
    errors: [
      { error: "Calcular la z con todos los sensores juntos", fix: "Un sensor más cálido parecería anómalo entero. La referencia es cada sensor." },
      { error: "Olvidar el 1,4826", fix: "Sin él, la MAD es menor que la desviación típica y el umbral 3,5 marca demasiados puntos." },
    ],
    quiz: {
      question: "Con el detector global robusto, la mayoría de las anomalías reales de los sensores pasan desapercibidas. ¿Por qué?",
      options: [
        { text: "Porque el ciclo día-noche hace que la temperatura normal ya varíe mucho: un pico nocturno puede quedar dentro del rango global de ese sensor" },
        { text: "Porque la z robusta está mal definida" },
        { text: "Porque hay demasiados pocos datos para calcular una mediana" },
        { text: "Porque las anomalías no existen: son ruido" },
      ],
      answer: 0,
      explanation: "Un detector global compara cada lectura con todas las del sensor. Si la variación normal (día frente a noche) es grande, las anomalías se esconden en ella. La etapa 3 compara cada lectura con lo normal **para esa hora**.",
    },
    project: SPEC,
    review: "Repasa: enmascaramiento; mediana y MAD·1,4826; calcula por grupo con transform.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pa-sensores-3",
    world: "w5",
    zone: "Proyecto de la Ciudad",
    title: "El detector de anomalías · 3: contexto horario y sensores atascados",
    kind: "project",
    difficulty: 4,
    skills: ["deteccion-anomalias", "series-temporales", "estadistica-robusta"],
    requires: ["pa-sensores-2"],
    series: { ...SERIES, stage: 3 },
    story: "Los ingenieros te cuentan dos cosas: 25 grados a mediodía es normal, pero a las tres de la madrugada es sospechoso; y a veces un sensor se queda «congelado» repitiendo el mismo valor durante horas.",
    objective: "Comparar cada lectura con lo normal para su hora (residuo respecto al perfil horario), detectar rachas de valores repetidos y combinar ambos detectores.",
    before: ["Etapas 1 y 2", "groupby con varias claves", "Rachas con diff y cumsum"],
    packages: ["numpy", "pandas"],
    files: FILES,
    intuition: [
      "Una anomalía **contextual** es un valor normal en general pero raro en su contexto. Aquí el contexto es la **hora del día**: se calcula la mediana de cada sensor para cada hora (su perfil diario) y se mira el **residuo** = lectura − mediana de esa hora. Sobre los residuos sí funciona la z robusta.",
      "",
      "Un **sensor atascado** repite exactamente el mismo valor. Ninguna z lo detecta (el valor es normal); hay que buscar **rachas**: `diff() == 0` marca repeticiones y `cumsum()` sobre los cambios da un identificador de racha; con `transform(\"size\")` se conoce su longitud.",
      "",
      "El detector final marca una lectura si su residuo es extremo **o** si pertenece a una racha larga.",
    ],
    formal: "residuoₜ = xₜ − mediana{x_s : hora(s) = hora(t), mismo sensor}. Anomalía = |z_robusta(residuo)| > u ∨ racha ≥ h.",
    example: {
      code: py`import pandas as pd
x = pd.Series([5.0, 5.2, 7.1, 7.1, 7.1, 7.1, 6.0])
igual = x.diff().eq(0)
racha = (~igual).cumsum()
print(list(racha))
print(list(x.groupby(racha).transform("size")))`,
      lines: [
        "pandas.",
        "Una serie con cuatro lecturas iguales seguidas.",
        "True donde el valor repite el anterior.",
        "Cada vez que el valor cambia empieza una racha nueva: [1, 2, 3, 3, 3, 3, 4].",
        "Identificadores de racha.",
        "Longitud de la racha de cada lectura: [1, 1, 4, 4, 4, 4, 1].",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `residuo_horario(serie)`: Serie con temperatura − mediana de su sensor a esa hora del día.",
      "2. `atascado(serie, horas=4)`: Serie booleana, True en las lecturas que pertenecen a una racha de al menos `horas` valores idénticos seguidos del mismo sensor.",
      "3. `detectar_contextual(serie, umbral=3.5, horas=4)`: copia con `residuo`, `z_contexto` (z robusta del residuo por sensor), `atascado` y `anomalia` (|z_contexto| > umbral o atascado).",
    ],
    starter: py`def residuo_horario(serie):
    return serie["temperatura"] - serie["temperatura"].median()

def atascado(serie, horas=4):
    return serie["temperatura"] == 0

def detectar_contextual(serie, umbral=3.5, horas=4):
    return serie`,
    solution: SOL3,
    tests: `${REF}
def _mini():
    horas = pd.date_range("2025-01-01", periods=72, freq="h")
    temp = [20 + 5 * np.sin((h.hour - 9) / 24 * 2 * np.pi) + 0.1 * (i % 3) for i, h in enumerate(horas)]
    temp[51] = 24.9
    temp[60:66] = [18.37] * 6
    return pd.DataFrame({"fecha_hora": horas, "sensor": "A", "temperatura": temp})

def test_residuo():
    "Residuo respecto a la mediana de la hora"
    s = t.get("serie")
    r = t.get("residuo_horario", "function")(s)
    ref = s.temperatura - s.groupby([s.sensor, s.fecha_hora.dt.hour]).temperatura.transform("median")
    assert np.allclose(r, ref, equal_nan=True)

def test_atascado():
    "Rachas de valores repetidos"
    m = _mini()
    a = t.get("atascado", "function")(m, 4)
    assert list(np.flatnonzero(a)) == list(range(60, 66))
    assert t.get("atascado", "function")(m, 7).sum() == 0

def test_contextual():
    "Detecta lo raro para su hora, aunque sea normal en el día"
    m = _mini()
    r = t.get("detectar_contextual", "function")(m)
    assert r.loc[51, "anomalia"], "24,9 a las 3 de la madrugada es anómalo"
    assert r.loc[60:65, "anomalia"].all() and r.loc[60:65, "atascado"].all()
    assert r["anomalia"].sum() <= 8
    g = t.get("detectar_global", "function")(m)
    assert not g.loc[51, "anomalia_global"], "El detector global no lo ve"
    assert {"residuo", "z_contexto", "atascado", "anomalia"} <= set(r.columns)
`,
    hints: [
      "residuo: `hora = serie[\"fecha_hora\"].dt.hour` y `serie.groupby([serie[\"sensor\"], hora])[\"temperatura\"].transform(\"median\")`.",
      "atascado: dentro de cada sensor, `igual = x.diff().eq(0)`, `grupo = (~igual).cumsum()` y `x.groupby(grupo).transform(\"size\") >= horas`.",
      "detectar_contextual: reutiliza `z_robusto` de la etapa 2 sobre la columna `residuo`, agrupando por sensor.",
    ],
    errors: [
      { error: "Usar la media horaria en vez de la mediana", fix: "Las propias anomalías desplazarían el perfil de su hora." },
      { error: "Buscar rachas sin separar por sensor", fix: "El final de un sensor y el principio de otro podrían formar una racha falsa." },
    ],
    quiz: {
      question: "Un sensor marca 18,37 °C seis horas seguidas, un valor perfectamente normal. ¿Por qué marcarlo como anomalía?",
      options: [
        { text: "Porque una temperatura real fluctúa: seis lecturas idénticas con dos decimales indican un fallo del sensor, no una medida" },
        { text: "Porque cualquier valor repetido es un atípico estadístico" },
        { text: "No debe marcarse: el valor está dentro del rango normal" },
        { text: "Porque su z robusta es mayor que 3,5" },
      ],
      answer: 0,
      explanation: "Las anomalías no siempre son valores extremos: también son patrones imposibles (variación nula). Por eso los detectores combinan reglas estadísticas y conocimiento del dominio.",
    },
    project: SPEC,
    review: "Repasa: anomalías contextuales; perfil horario con mediana; rachas con diff + cumsum + transform(size).",
    xp: 130,
    coins: 20,
  },
  {
    id: "pa-sensores-4",
    world: "w5",
    zone: "Proyecto de la Ciudad",
    title: "El detector de anomalías · 4: evaluación honesta y almacenamiento en SQLite",
    kind: "project",
    difficulty: 4,
    skills: ["evaluacion", "validacion-temporal", "sql", "deteccion-anomalias"],
    requires: ["pa-sensores-3", "db-sql"],
    series: { ...SERIES, stage: 4 },
    story: "El ayuntamiento tiene un registro de las averías reales. Quiere saber cuánto acierta tu detector, con qué umbral, y que las alertas queden guardadas en una base de datos que el equipo de mantenimiento pueda consultar.",
    objective: "Evaluar detectores con precisión, recall y F1; elegir el umbral con un periodo de validación y medirlo en un periodo de prueba posterior; guardar las anomalías en SQLite y resumirlas con SQL.",
    before: ["Etapas 1 a 3", "Precisión, recall y F1", "SQL con sqlite3 (db-sql)"],
    packages: ["numpy", "pandas"],
    files: FILES,
    intuition: [
      "Las anomalías son **raras**: un detector que nunca alerta acierta el 97 % de las lecturas. Por eso se mide la **precisión** (de las alertas, cuántas eran reales), el **recall** (de las anomalías reales, cuántas se detectaron) y su media armónica, **F1**.",
      "",
      "Elegir el umbral mirando todos los datos y presentar ese mismo F1 es optimista. Con series temporales se separa por tiempo: **validación** (primeros 30 días) para elegir, **prueba** (últimos 30) para informar. Así se simula lo que pasará con datos futuros.",
      "",
      "Por último, el resultado debe ser **útil**: una tabla en SQLite que otros consultan con SQL.",
    ],
    formal: "Precisión = VP/(VP + FP) · Recall = VP/(VP + FN) · F1 = 2·P·R/(P + R)",
    example: {
      code: py`import sqlite3
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE alertas (sensor TEXT, valor REAL)")
con.executemany("INSERT INTO alertas VALUES (?, ?)", [("S1", 30.2), ("S1", 5.0), ("S2", 41.0)])
print(con.execute("SELECT sensor, COUNT(*) FROM alertas GROUP BY sensor").fetchall())`,
      lines: [
        "SQLite viene con Python.",
        "Base de datos en memoria.",
        "Una tabla de alertas.",
        "Inserción con parámetros (?), nunca formateando el texto de la consulta.",
        "[('S1', 2), ('S2', 1)]: un resumen con SQL.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `evaluar(pred, real)`: diccionario con `precision`, `recall` y `f1` (0 cuando el denominador es 0).",
      "2. `unir_etiquetas(serie, ruta)`: la serie con una columna booleana `real` leída de `sensores_etiquetas.csv` (unión por fecha_hora y sensor).",
      "3. `elegir_umbral(datos, umbrales=(2.5, 3.0, 3.5, 4.0, 5.0), dias_validacion=30)`: elige el umbral del detector contextual con mayor F1 en los primeros 30 días (el primero en caso de empate) y devuelve {\"umbral\", \"f1_validacion\", \"f1_prueba\"} (F1 en el resto).",
      "4. `guardar(detectado, ruta)`: crea (o recrea) la tabla `anomalias(fecha_hora TEXT, sensor TEXT, temperatura REAL)` con las filas marcadas en `anomalia` y devuelve el resultado de `SELECT sensor, COUNT(*) FROM anomalias GROUP BY sensor ORDER BY sensor`.",
      "5. `datos = unir_etiquetas(serie, \"sensores_etiquetas.csv\")`, `comparacion` = {\"global\": F1 del detector global, \"contextual\": F1 del contextual} sobre todos los datos, `seleccion = elegir_umbral(datos)` y `resumen = guardar(detectar_contextual(datos, seleccion[\"umbral\"]), \"anomalias.db\")`.",
    ],
    starter: py`import sqlite3

def evaluar(pred, real):
    return {"precision": 0, "recall": 0, "f1": 0}

def unir_etiquetas(serie, ruta):
    return serie

def elegir_umbral(datos, umbrales=(2.5, 3.0, 3.5, 4.0, 5.0), dias_validacion=30):
    return {"umbral": umbrales[0], "f1_validacion": 0, "f1_prueba": 0}

def guardar(detectado, ruta):
    return []

datos = unir_etiquetas(serie, "sensores_etiquetas.csv")
comparacion = {}
seleccion = elegir_umbral(datos)
resumen = guardar(datos, "anomalias.db")`,
    solution: SOL4,
    tests: `${REF}
import sqlite3

def test_evaluar():
    "Métricas y casos sin alertas"
    f = t.get("evaluar", "function")
    r = f([True, True, False, False, True], [True, False, False, True, True])
    assert approx(r["precision"], 2 / 3) and approx(r["recall"], 2 / 3) and approx(r["f1"], 2 / 3)
    z = f([False] * 4, [True, False, False, False])
    assert z["precision"] == 0 and z["recall"] == 0 and z["f1"] == 0

def test_etiquetas():
    "Unión con las etiquetas"
    d = t.get("datos")
    assert len(d) == 2879 and d["real"].dtype == bool and d["real"].sum() == 71

def test_comparacion():
    "El contexto importa"
    c = t.get("comparacion")
    assert c["contextual"] > 0.85 and c["contextual"] > c["global"] + 0.5, c

def test_umbral_sin_fuga():
    "Umbral elegido en validación, medido en prueba"
    s = t.get("seleccion")
    d = t.get("datos")
    corte = d.fecha_hora.min() + pd.Timedelta(days=30)
    val = d.fecha_hora < corte
    ev = t.get("evaluar", "function")
    det = t.get("detectar_contextual", "function")
    f1v = {u: ev(det(d, u)["anomalia"][val], d["real"][val])["f1"] for u in (2.5, 3.0, 3.5, 4.0, 5.0)}
    mejor = max(f1v, key=lambda u: (f1v[u], -u))
    assert s["umbral"] == mejor and approx(s["f1_validacion"], f1v[mejor])
    assert approx(s["f1_prueba"], ev(det(d, mejor)["anomalia"][~val], d["real"][~val])["f1"])

def test_sqlite():
    "Tabla de anomalías y resumen SQL"
    r = t.get("resumen")
    con = sqlite3.connect("anomalias.db")
    filas = con.execute("SELECT sensor, COUNT(*) FROM anomalias GROUP BY sensor ORDER BY sensor").fetchall()
    cols = [c[1] for c in con.execute("PRAGMA table_info(anomalias)")]
    con.close()
    assert [tuple(x) for x in r] == filas and cols == ["fecha_hora", "sensor", "temperatura"]
    det = t.get("detectar_contextual", "function")(t.get("datos"), t.get("seleccion")["umbral"])
    assert sum(n for _, n in filas) == int(det["anomalia"].sum())
    t.get("guardar", "function")(det, "anomalias.db")
    con = sqlite3.connect("anomalias.db")
    assert con.execute("SELECT COUNT(*) FROM anomalias").fetchone()[0] == int(det["anomalia"].sum()), "Guardar dos veces no debe duplicar filas"
    con.close()
`,
    hints: [
      "evaluar: convierte a arrays booleanos y cuenta VP = (pred & real).sum(), FP = (pred & ~real).sum(), FN = (~pred & real).sum().",
      "elegir_umbral: `validacion = datos[\"fecha_hora\"] < inicio + pd.Timedelta(days=30)`; calcula el F1 de cada umbral solo en validación y usa `np.argmax` (devuelve el primero en los empates).",
      "guardar: `DROP TABLE IF EXISTS` antes de crearla y `executemany` con parámetros. Convierte las fechas a texto con `str`.",
    ],
    errors: [
      { error: "Medir la exactitud", fix: "Con un 2,5 % de anomalías, «nunca alertar» tiene un 97,5 % de exactitud y es inútil." },
      { error: "Elegir el umbral con todos los datos", fix: "El F1 resultante es optimista: has usado el periodo de prueba para decidir." },
      { error: "Formatear valores dentro del texto SQL", fix: "Usa parámetros (?): evita errores de comillas e inyección SQL." },
    ],
    quiz: {
      question: "El detector contextual tiene precisión 0,90 y recall 0,99. ¿Qué significa para el equipo de mantenimiento?",
      options: [
        { text: "Casi todas las averías generan alerta, y alrededor de 1 de cada 10 alertas resulta ser una falsa alarma" },
        { text: "El 90 % de las lecturas son correctas" },
        { text: "El detector se equivoca en el 10 % de las horas", misconception: "accuracy-desbalance" },
        { text: "Hay un 99 % de probabilidad de que cada alerta sea una avería real", misconception: "sens-espec" },
      ],
      answer: 0,
      explanation: "La precisión se refiere a las alertas emitidas; el recall, a las anomalías reales. Ninguna de las dos es la exactitud global, y el recall no es la probabilidad de que una alerta sea cierta (eso es la precisión).",
    },
    project: SPEC,
    review: "Repasa: precisión, recall y F1 con clases raras; validación temporal sin fuga; SQLite con parámetros.",
    xp: 150,
    coins: 24,
  },
];
