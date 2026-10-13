import { demandaCsv } from "../datasets";
import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 9 (ruta de series temporales y pronósticos): prever la demanda
// eléctrica a 14 días con validación temporal honesta e intervalos de predicción.

const SERIES = { id: "pronostico-demanda", title: "Proyecto progresivo: el pronóstico de la demanda", of: 4 };
const FILES = { "demanda.csv": demandaCsv() };
const PACKAGES = ["numpy", "pandas", "scikit-learn", "statsmodels", "matplotlib"];

const SPEC: ProjectSpec = {
  requirements: [
    "Tratar la serie como serie: frecuencia diaria explícita, huecos detectados e imputados con marca.",
    "Explorar estacionalidad semanal y la relación (no lineal) con la temperatura.",
    "Apartar los últimos 98 días como prueba y decidir con validación de origen móvil en el entrenamiento.",
    "Comparar líneas base (ingenua, estacional, media móvil) con regresión con calendario y Holt-Winters.",
    "Evaluar una vez en prueba con el mismo protocolo y acompañar los pronósticos de intervalos empíricos con su cobertura.",
  ],
  dataset: "demanda.csv: demanda eléctrica (MWh) y temperatura diarias de 2022 a 2024 en una región ficticia, con tendencia, ciclo semanal, efecto en U de la temperatura, festivos y días sin dato.",
  stages: ["Exploración: frecuencia, huecos y estacionalidad", "Líneas base y validación de origen móvil", "Regresión con calendario y temperatura, y Holt-Winters", "Evaluación final, intervalos e informe"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Ningún modelo ve datos posteriores a su origen de pronóstico (salvo la temperatura, declarada como supuesto).",
    "Todo modelo se compara con la línea base estacional.",
    "Los intervalos de predicción informan de su cobertura real en prueba.",
  ],
  extensions: [
    "Sustituir la temperatura real por un pronóstico con error para medir cuánto empeora el modelo.",
    "SARIMAX de statsmodels con la temperatura como variable exógena.",
    "Términos de Fourier para la estacionalidad anual en lugar de la temperatura.",
  ],
  portfolio: "Pronóstico de demanda eléctrica a 14 días: exploración de estacionalidad, validación de origen móvil, líneas base, regresión con calendario y temperatura, Holt-Winters e intervalos de predicción empíricos con cobertura medida.",
};

const S1 = py`import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

FESTIVOS = ["01-01", "01-06", "05-01", "08-15", "10-12", "11-01", "12-06", "12-08", "12-25"]
H = 14

def cargar(ruta):
    return pd.read_csv(ruta, parse_dates=["fecha"], index_col="fecha").asfreq("D")

def huecos(df):
    return int(df["demanda_mwh"].isna().sum())

def completar(df):
    out = df.copy()
    out["imputado"] = out["demanda_mwh"].isna()
    out["demanda_mwh"] = out["demanda_mwh"].interpolate(method="time")
    return out

def perfil_semanal(df):
    return df["demanda_mwh"].groupby(df.index.dayofweek).mean()

def relacion_temperatura(df):
    curvatura = np.polyfit(df["temperatura"], df["demanda_mwh"], 2)[0]
    return {"pearson": df["temperatura"].corr(df["demanda_mwh"]), "curvatura": curvatura}

datos = completar(cargar("demanda.csv"))
entrenamiento, prueba = datos.iloc[:-98], datos.iloc[-98:]

fig, ax = plt.subplots()
ax.plot(datos.index, datos["demanda_mwh"], linewidth=0.6, label="Diaria")
ax.plot(datos.index, datos["demanda_mwh"].rolling(28).mean(), label="Media móvil 28 días")
ax.set_ylabel("Demanda (MWh)")
ax.set_title("Demanda eléctrica diaria")
ax.legend()`;

const S2 = py`def naive(h, historia, futuro):
    return np.repeat(historia["demanda_mwh"].iloc[-1], h)

def naive_estacional(h, historia, futuro):
    ultima_semana = historia["demanda_mwh"].iloc[-7:].to_numpy()
    return np.tile(ultima_semana, h // 7 + 1)[:h]

def media_movil(h, historia, futuro, ventana=28):
    return np.repeat(historia["demanda_mwh"].iloc[-ventana:].mean(), h)

def backtest(datos, metodo, origenes=6, h=H):
    abs_err, rel_err = [], []
    for k in range(origenes, 0, -1):
        corte = len(datos) - k * h
        historia, futuro = datos.iloc[:corte], datos.iloc[corte:corte + h]
        real = futuro["demanda_mwh"].to_numpy()
        error = np.asarray(metodo(h, historia, futuro)) - real
        abs_err.append(np.abs(error))
        rel_err.append(np.abs(error) / real)
    return {"mae": float(np.mean(np.concatenate(abs_err))), "mape": float(100 * np.mean(np.concatenate(rel_err)))}

resultados = {
    "naive": backtest(entrenamiento, naive),
    "naive_estacional": backtest(entrenamiento, naive_estacional),
    "media_movil": backtest(entrenamiento, media_movil),
}`;

const S3 = py`import warnings
from sklearn.linear_model import LinearRegression
from statsmodels.tsa.holtwinters import ExponentialSmoothing

def caracteristicas(df):
    X = pd.DataFrame(index=df.index)
    X["t"] = (df.index - datos.index[0]).days
    for k in range(6):
        X[f"d{k}"] = (df.index.dayofweek == k).astype(int)
    X["temp_c"] = (df["temperatura"] - 17) ** 2
    X["festivo"] = df.index.strftime("%m-%d").isin(FESTIVOS).astype(int)
    return X

def regresion(h, historia, futuro):
    modelo = LinearRegression().fit(caracteristicas(historia), historia["demanda_mwh"])
    return modelo.predict(caracteristicas(futuro))

def holt_winters(h, historia, futuro):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        ajuste = ExponentialSmoothing(historia["demanda_mwh"].to_numpy(), trend="add", seasonal="add", seasonal_periods=7).fit()
    return ajuste.forecast(h)

resultados["regresion"] = backtest(entrenamiento, regresion)
resultados["holt_winters"] = backtest(entrenamiento, holt_winters)
mejor = min(resultados, key=lambda k: resultados[k]["mae"])
METODOS = {"naive": naive, "naive_estacional": naive_estacional, "media_movil": media_movil, "regresion": regresion, "holt_winters": holt_winters}`;

const S4 = py`def residuos_validacion(datos, metodo, origenes=6, h=H):
    res = []
    for k in range(origenes, 0, -1):
        corte = len(datos) - k * h
        historia, futuro = datos.iloc[:corte], datos.iloc[corte:corte + h]
        res.append(futuro["demanda_mwh"].to_numpy() - np.asarray(metodo(h, historia, futuro)))
    return np.concatenate(res)

def con_intervalo(h, historia, futuro, metodo, residuos, nivel=0.8):
    pred = np.asarray(metodo(h, historia, futuro))
    q_inf, q_sup = np.quantile(residuos, [(1 - nivel) / 2, (1 + nivel) / 2])
    return pd.DataFrame({"pred": pred, "inf": pred + q_inf, "sup": pred + q_sup}, index=futuro.index)

residuos = residuos_validacion(entrenamiento, METODOS[mejor])
final = {nombre: backtest(datos, METODOS[nombre], origenes=7) for nombre in (mejor, "naive_estacional")}
dentro = []
for k in range(7, 0, -1):
    corte = len(datos) - k * H
    historia, futuro = datos.iloc[:corte], datos.iloc[corte:corte + H]
    tabla = con_intervalo(H, historia, futuro, METODOS[mejor], residuos)
    dentro.extend(((futuro["demanda_mwh"] >= tabla["inf"]) & (futuro["demanda_mwh"] <= tabla["sup"])).tolist())
cobertura = float(np.mean(dentro))

fig2, ax2 = plt.subplots()
ax2.fill_between(tabla.index, tabla["inf"], tabla["sup"], alpha=0.3, label="Intervalo 80 %")
ax2.plot(tabla.index, tabla["pred"], label="Pronóstico")
ax2.plot(futuro.index, futuro["demanda_mwh"], "o", label="Real")
ax2.set_title("Último pronóstico a 14 días")
ax2.legend()

informe = {
    "modelo": mejor,
    "horizonte_dias": H,
    "mae_validacion": resultados[mejor]["mae"],
    "mae_prueba": final[mejor]["mae"],
    "mae_base_prueba": final["naive_estacional"]["mae"],
    "mejora_sobre_base": 100 * (1 - final[mejor]["mae"] / final["naive_estacional"]["mae"]),
    "cobertura_80": cobertura,
    "limitaciones": [
        "El modelo usa la temperatura real de los días pronosticados: en producción habría que usar un pronóstico de temperatura, con su error.",
        "Datos sintéticos de una región ficticia; festivos fijos, sin festivos móviles ni eventos excepcionales.",
        "Los intervalos suponen que los errores futuros se parecen a los de validación.",
    ],
}`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

const REF = py`
import numpy as np
import pandas as pd

def _datos():
    df = pd.read_csv("demanda.csv", parse_dates=["fecha"], index_col="fecha").asfreq("D")
    df["imputado"] = df.demanda_mwh.isna()
    df["demanda_mwh"] = df.demanda_mwh.interpolate(method="time")
    return df

def _bt(datos, f, origenes=6, h=14):
    e = []
    for k in range(origenes, 0, -1):
        c = len(datos) - k * h
        e.append(np.abs(np.asarray(f(h, datos.iloc[:c], datos.iloc[c:c + h])) - datos.demanda_mwh.iloc[c:c + h].to_numpy()))
    return float(np.mean(np.concatenate(e)))
`;

export const PROJ_DEMANDA: Mission[] = [
  {
    id: "ps-demanda-1",
    world: "w9",
    zone: "Series temporales y pronósticos",
    title: "El pronóstico de la demanda · 1: frecuencia, huecos y estacionalidad",
    kind: "project",
    difficulty: 3,
    skills: ["series-temporales", "pandas", "eda", "correlacion"],
    requires: ["mv-pronosticos"],
    series: { ...SERIES, stage: 1 },
    story: "La compañía eléctrica del multiverso necesita prever la demanda de las próximas dos semanas para decidir cuántas centrales encender. Te dan tres años de datos diarios. Antes de pronosticar, hay que entender la serie.",
    objective: "Cargar una serie diaria con frecuencia explícita, detectar e imputar huecos, describir el ciclo semanal y descubrir una relación no lineal con la temperatura.",
    before: ["Pronósticos de referencia (mv-pronosticos)", "Fechas con pandas", "Correlación"],
    packages: ["numpy", "pandas", "matplotlib"],
    files: FILES,
    intuition: [
      "Una serie temporal tiene **orden** y **frecuencia**. `asfreq(\"D\")` crea una fila por día: los días sin dato aparecen como NaN en vez de desaparecer, y así se ven los huecos. Se imputan interpolando en el tiempo y se marcan.",
      "",
      "Patrones típicos de la demanda: **tendencia** (crece lentamente), **ciclo semanal** (fines de semana más bajos), **festivos** y **temperatura**: se consume más con frío (calefacción) y con calor (aire acondicionado). La relación tiene forma de **U**.",
      "",
      "Por eso la correlación de Pearson entre temperatura y demanda engaña: solo mide la parte **lineal**. Como hay más días fríos que calurosos, sale negativa y sugiere «más calor, menos demanda», cuando la relación real es una U. Un ajuste cuadrático con curvatura positiva la revela.",
      "",
      "Desde ahora se separan los **últimos 98 días** como prueba (7 periodos de 14 días).",
    ],
    formal: "demandaₜ ≈ tendencia(t) + semana(t) + β·(Tₜ − 17)² + festivoₜ + εₜ",
    example: {
      code: py`import pandas as pd
df = pd.read_csv("demanda.csv", parse_dates=["fecha"], index_col="fecha")
print(len(df), df.index.min().date(), df.index.max().date())
print(df["demanda_mwh"].isna().sum())
print(df.groupby(df.index.dayofweek)["demanda_mwh"].mean().round(0).tolist())`,
      lines: [
        "pandas.",
        "Fechas como índice.",
        "1096 días, de 2022-01-01 a 2024-12-31.",
        "Días sin demanda registrada.",
        "Demanda media de lunes (0) a domingo (6): el fin de semana baja.",
      ],
    },
    challenge: [
      "El código inicial define `FESTIVOS` (mes-día) y `H = 14`. Escribe:",
      "1. `cargar(ruta)`: DataFrame con `fecha` como índice de fechas y frecuencia diaria (`asfreq(\"D\")`).",
      "2. `huecos(df)`: número de días sin demanda.",
      "3. `completar(df)`: copia con la columna booleana `imputado` y la demanda interpolada en el tiempo (`interpolate(method=\"time\")`).",
      "4. `perfil_semanal(df)`: demanda media por día de la semana (índice 0 = lunes … 6 = domingo).",
      "5. `relacion_temperatura(df)`: diccionario con `pearson` (correlación lineal temperatura-demanda) y `curvatura` (coeficiente cuadrático de `np.polyfit(temperatura, demanda, 2)`).",
      "6. `datos = completar(cargar(\"demanda.csv\"))`, `entrenamiento` (todo menos los últimos 98 días) y `prueba` (los últimos 98); y `fig`: la serie diaria con su media móvil de 28 días.",
    ],
    starter: py`import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

FESTIVOS = ["01-01", "01-06", "05-01", "08-15", "10-12", "11-01", "12-06", "12-08", "12-25"]
H = 14

def cargar(ruta):
    return pd.read_csv(ruta)

def huecos(df):
    return 0

def completar(df):
    return df.dropna()

def perfil_semanal(df):
    return None

def relacion_temperatura(df):
    return {}

datos = completar(cargar("demanda.csv"))
entrenamiento, prueba = datos, datos
fig, ax = plt.subplots()`,
    solution: SOL1,
    tests: `${REF}
def test_carga_y_huecos():
    "Frecuencia diaria y huecos visibles"
    df = t.get("cargar", "function")("demanda.csv")
    assert isinstance(df.index, pd.DatetimeIndex) and df.index.freqstr == "D" and len(df) == 1096
    assert t.get("huecos", "function")(df) == int(df.demanda_mwh.isna().sum()) > 0

def test_completar():
    "Imputación en el tiempo, marcada"
    ref = _datos()
    d = t.get("datos")
    assert d.demanda_mwh.notna().all() and np.allclose(d.demanda_mwh, ref.demanda_mwh)
    assert (d.imputado == ref.imputado).all() and d.imputado.sum() > 0

def test_perfil():
    "Fines de semana más bajos"
    p = t.get("perfil_semanal", "function")(t.get("datos"))
    assert list(p.index) == list(range(7))
    assert p[6] < p[5] < p[:5].min(), "Domingo < sábado < laborables"

def test_temperatura():
    "Relación en U: Pearson negativo y moderado, curvatura positiva"
    d = _datos()
    r = t.get("relacion_temperatura", "function")(d)
    assert approx(r["pearson"], d.temperatura.corr(d.demanda_mwh)) and -0.5 < r["pearson"] < 0
    assert approx(r["curvatura"], np.polyfit(d.temperatura, d.demanda_mwh, 2)[0]) and r["curvatura"] > 0.5

def test_division():
    "Los últimos 98 días son la prueba"
    assert len(t.get("prueba")) == 98 and t.get("entrenamiento").index.max() < t.get("prueba").index.min()
    assert len(t.get("fig").axes[0].get_lines()) == 2
`,
    hints: [
      "cargar: `pd.read_csv(ruta, parse_dates=[\"fecha\"], index_col=\"fecha\").asfreq(\"D\")`.",
      "completar: guarda `isna()` antes de interpolar.",
      "perfil: `df[\"demanda_mwh\"].groupby(df.index.dayofweek).mean()`.",
    ],
    errors: [
      { error: "Eliminar los días sin dato", fix: "La serie dejaría de ser regular: «la semana anterior» ya no estaría 7 filas atrás." },
      { error: "Concluir que la temperatura no influye porque Pearson es bajo", fix: "Pearson mide relación lineal. Una U fuerte puede tener correlación casi nula." },
    ],
    quiz: {
      question: "La correlación de Pearson entre temperatura y demanda es −0,33, pero el ajuste cuadrático tiene una curvatura positiva clara. ¿Qué concluyes?",
      options: [
        { text: "Que la relación no es lineal (en U): la demanda sube con el frío y con el calor, y Pearson la resume mal porque hay más días fríos" },
        { text: "Que a más temperatura siempre hay menos demanda" },
        { text: "Que la temperatura apenas influye porque |r| es menor que 0,5" },
        { text: "Que la correlación demuestra que el frío causa el consumo", misconception: "correlacion-causalidad" },
      ],
      answer: 0,
      explanation: "Pearson resume con una recta: si la relación es una U y los datos se concentran en una rama, la recta tendrá la pendiente de esa rama. Siempre conviene mirar el diagrama de dispersión y probar formas no lineales.",
    },
    project: SPEC,
    review: "Repasa: asfreq para ver huecos; imputar y marcar; perfil semanal; Pearson solo capta lo lineal.",
    xp: 120,
    coins: 18,
  },
  {
    id: "ps-demanda-2",
    world: "w9",
    zone: "Series temporales y pronósticos",
    title: "El pronóstico de la demanda · 2: líneas base y validación de origen móvil",
    kind: "project",
    difficulty: 3,
    skills: ["series-temporales", "validacion-temporal", "linea-base", "metricas"],
    requires: ["ps-demanda-1"],
    series: { ...SERIES, stage: 2 },
    story: "Antes de construir modelos sofisticados, el jefe de operaciones pregunta: «¿cuánto nos equivocaríamos repitiendo la semana pasada?». Esa es la vara de medir.",
    objective: "Programar pronósticos de referencia (ingenuo, ingenuo estacional y media móvil) y evaluarlos con validación de origen móvil a 14 días con MAE y MAPE.",
    before: ["Etapa 1", "Validación cruzada", "MAE"],
    packages: ["numpy", "pandas", "matplotlib"],
    files: FILES,
    intuition: [
      "En series temporales **no se baraja**: el modelo solo puede usar el pasado. La **validación de origen móvil** simula lo que pasará en producción: se elige un origen, se entrena con todo lo anterior, se pronostican los 14 días siguientes y se compara; después se mueve el origen 14 días y se repite.",
      "",
      "Líneas base:",
      "",
      "- **Ingenuo**: mañana igual que hoy.",
      "- **Ingenuo estacional**: cada día igual que el mismo día de la semana pasada.",
      "- **Media móvil**: la media de los últimos 28 días para todos los días.",
      "",
      "**MAE** (en MWh) y **MAPE** (en %, fácil de comunicar). Todas las funciones de pronóstico tienen la misma forma `metodo(h, historia, futuro)`; `futuro` solo se usa para variables conocidas de antemano (como el calendario), nunca su demanda.",
    ],
    formal: "Origen k: entrenar con y₁…y_{n−kh}, pronosticar y_{n−kh+1}…y_{n−kh+h}. MAE = media |ŷ − y| · MAPE = 100·media |ŷ − y|/y",
    example: {
      code: py`import numpy as np
historia = np.array([700, 710, 705, 690, 650, 600, 640, 702, 715])
print(np.tile(historia[-7:], 2)[:10])
print(np.repeat(historia[-1], 3))`,
      lines: [
        "NumPy.",
        "Nueve días de demanda.",
        "Ingenuo estacional a 10 días: repite la última semana.",
        "Ingenuo a 3 días: repite el último valor.",
      ],
    },
    challenge: [
      "Añade a tu código (cada método recibe `h`, `historia` y `futuro` y devuelve h pronósticos):",
      "1. `naive`, `naive_estacional` y `media_movil` (ventana 28).",
      "2. `backtest(datos, metodo, origenes=6, h=H)`: diccionario con `mae` y `mape` (en %) acumulando los errores de los `origenes` últimos bloques de h días de `datos`, del más antiguo al más reciente.",
      "3. `resultados`: diccionario nombre → resultado del backtest de cada línea base sobre `entrenamiento`.",
    ],
    starter: py`def naive(h, historia, futuro):
    return np.zeros(h)

def naive_estacional(h, historia, futuro):
    return np.zeros(h)

def media_movil(h, historia, futuro, ventana=28):
    return np.zeros(h)

def backtest(datos, metodo, origenes=6, h=H):
    return {"mae": 0, "mape": 0}

resultados = {}`,
    solution: SOL2,
    tests: `${REF}
def test_metodos():
    "Pronósticos de referencia"
    d = _datos()
    hist = d.iloc[:100]
    assert np.allclose(t.get("naive", "function")(5, hist, None), d.demanda_mwh.iloc[99])
    est = t.get("naive_estacional", "function")(10, hist, None)
    assert len(est) == 10 and np.allclose(est[:7], d.demanda_mwh.iloc[93:100]) and np.allclose(est[7:], d.demanda_mwh.iloc[93:96])
    assert np.allclose(t.get("media_movil", "function")(3, hist, None), d.demanda_mwh.iloc[72:100].mean())

def test_backtest():
    "Origen móvil sin mirar el futuro"
    d = _datos()
    bt = t.get("backtest", "function")
    ref = _bt(d.iloc[:-98], t.get("naive_estacional", "function"))
    r = bt(d.iloc[:-98], t.get("naive_estacional", "function"))
    assert approx(r["mae"], ref) and r["mape"] > 0
    fuga = lambda h, historia, futuro: futuro["demanda_mwh"].to_numpy()
    assert bt(d, fuga)["mae"] == 0, "El método «tramposo» tiene error 0: el backtest compara con el futuro correcto"
    assert approx(bt(d, t.get("naive", "function"), origenes=2, h=7)["mae"], _bt(d, t.get("naive", "function"), 2, 7))

def test_resultados():
    "Las tres líneas base en el entrenamiento"
    r = t.get("resultados")
    assert set(r) >= {"naive", "naive_estacional", "media_movil"}
    assert r["naive_estacional"]["mae"] < r["naive"]["mae"], "Repetir la semana pasada mejora a repetir ayer"
`,
    hints: [
      "naive_estacional: `np.tile(ultima_semana, h // 7 + 1)[:h]`.",
      "backtest: para k = origenes … 1, el corte es `len(datos) - k * h`; historia = filas anteriores, futuro = las h siguientes.",
      "Acumula los errores absolutos de todos los orígenes y haz la media al final.",
    ],
    errors: [
      { error: "Usar validación cruzada con barajado", fix: "Entrenaría con el futuro para predecir el pasado: errores irrealmente bajos." },
      { error: "Usar la demanda de `futuro` dentro del método", fix: "Es exactamente lo que no se sabe al pronosticar. Solo el calendario (y supuestos declarados) puede venir de `futuro`." },
    ],
    quiz: {
      question: "El ingenuo estacional tiene un MAPE de alrededor del 5,5 %. ¿Para qué sirve si es tan simple?",
      options: [
        { text: "Es la referencia: cualquier modelo que no lo mejore claramente no merece su complejidad" },
        { text: "Para nada: hay que empezar directamente con el modelo más complejo" },
        { text: "Demuestra que la demanda no se puede predecir" },
        { text: "Sirve como modelo final porque nunca sobreajusta", misconception: "sobreajuste" },
      ],
      answer: 0,
      explanation: "En pronósticos, las líneas base estacionales son sorprendentemente difíciles de batir. Medir contra ellas evita celebrar modelos que no aportan nada.",
    },
    project: SPEC,
    review: "Repasa: no barajar; origen móvil; misma firma para todos los métodos; MAE y MAPE; la línea base estacional es la vara de medir.",
    xp: 120,
    coins: 18,
  },
  {
    id: "ps-demanda-3",
    world: "w9",
    zone: "Series temporales y pronósticos",
    title: "El pronóstico de la demanda · 3: regresión con calendario y temperatura, y Holt-Winters",
    kind: "project",
    difficulty: 4,
    skills: ["series-temporales", "regresion", "suavizado-exponencial", "ingenieria-variables"],
    requires: ["ps-demanda-2", "r-lineal"],
    series: { ...SERIES, stage: 3 },
    story: "Dos escuelas de pronóstico compiten: los que modelan la serie consigo misma (Holt-Winters) y los que explican la demanda con sus causas (calendario y temperatura). El backtest decidirá.",
    objective: "Construir variables de calendario y temperatura para una regresión, ajustar Holt-Winters con estacionalidad semanal y compararlos con las líneas base mediante el mismo backtest.",
    before: ["Etapas 1 y 2", "Regresión lineal", "Variables ficticias (dummies)"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "**Regresión con calendario**: tendencia (días desde el inicio), una variable 0/1 por día de la semana (el domingo es la referencia), festivo y (T − 17)² para la U de la temperatura. El modelo aprende cuánto aporta cada cosa.",
      "",
      "**Supuesto importante**: para pronosticar con la temperatura hay que conocerla. Aquí usamos la temperatura real de los días futuros, como si tuviéramos un pronóstico meteorológico perfecto. Es optimista y hay que declararlo (la extensión del proyecto propone medir cuánto empeora con un pronóstico con error).",
      "",
      "**Holt-Winters** (suavizado exponencial) actualiza nivel, tendencia y estacionalidad semanal dando más peso a los datos recientes. No usa la temperatura: se adapta pero no anticipa una ola de frío.",
    ],
    formal: "ŷₜ = β₀ + β₁t + Σ_d γ_d·1{día = d} + δ·festivoₜ + θ·(Tₜ − 17)² · Holt-Winters aditivo: ŷ_{t+h} = ℓₜ + h·bₜ + s_{t+h−m}",
    example: {
      code: py`import pandas as pd
fechas = pd.date_range("2024-12-23", periods=4, freq="D")
print(list(fechas.dayofweek))
print(list(fechas.strftime("%m-%d").isin(["12-25"]).astype(int)))
print(list((fechas - pd.Timestamp("2022-01-01")).days))`,
      lines: [
        "pandas.",
        "Cuatro días alrededor de Navidad.",
        "Día de la semana: lunes = 0.",
        "Festivo: solo el 25.",
        "Tendencia: días desde el inicio de la serie.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `caracteristicas(df)`: DataFrame con `t` (días desde `datos.index[0]`), `d0`…`d5` (lunes a sábado, 0/1), `temp_c` = (temperatura − 17)² y `festivo` (0/1 según `FESTIVOS`).",
      "2. `regresion(h, historia, futuro)`: `LinearRegression` entrenada con las características y la demanda de `historia`, que predice las de `futuro`.",
      "3. `holt_winters(h, historia, futuro)`: `ExponentialSmoothing(..., trend=\"add\", seasonal=\"add\", seasonal_periods=7).fit().forecast(h)` sobre la demanda de `historia` (como array).",
      "4. Añade sus backtests a `resultados`, `mejor` (el de menor MAE) y `METODOS` (nombre → función, para los cinco métodos).",
    ],
    starter: py`import warnings
from sklearn.linear_model import LinearRegression
from statsmodels.tsa.holtwinters import ExponentialSmoothing

def caracteristicas(df):
    return pd.DataFrame(index=df.index)

def regresion(h, historia, futuro):
    return np.zeros(h)

def holt_winters(h, historia, futuro):
    return np.zeros(h)

mejor = None
METODOS = {}`,
    solution: SOL3,
    tests: `${REF}
from sklearn.linear_model import LinearRegression

def test_caracteristicas():
    "Calendario y temperatura"
    d = _datos()
    X = t.get("caracteristicas", "function")(d.iloc[-10:])
    assert list(X.columns) == ["t", "d0", "d1", "d2", "d3", "d4", "d5", "temp_c", "festivo"]
    assert X.t.iloc[0] == len(d) - 10 and X.festivo.loc["2024-12-25"] == 1 and X.festivo.loc["2024-12-24"] == 0
    assert (X[["d0", "d1", "d2", "d3", "d4", "d5"]].sum(axis=1) == (d.index[-10:].dayofweek < 6)).all()
    assert np.allclose(X.temp_c, (d.temperatura.iloc[-10:] - 17) ** 2)

def test_modelos():
    "Regresión y Holt-Winters en el backtest"
    r = t.get("resultados")
    d = _datos()
    assert approx(r["regresion"]["mae"], _bt(d.iloc[:-98], t.get("regresion", "function")), 1e-6)
    assert r["regresion"]["mae"] < r["holt_winters"]["mae"] < r["naive_estacional"]["mae"]
    assert t.get("mejor") == min(r, key=lambda k: r[k]["mae"]) == "regresion"
    assert set(t.get("METODOS")) == set(r)

def test_holt_winters():
    "Pronóstico de 14 días"
    d = _datos()
    p = t.get("holt_winters", "function")(14, d.iloc[:500], d.iloc[500:514])
    assert len(p) == 14 and np.all(np.isfinite(p))
`,
    hints: [
      "t: `(df.index - datos.index[0]).days`. Días: `(df.index.dayofweek == k).astype(int)` para k = 0…5.",
      "Festivo: `df.index.strftime(\"%m-%d\").isin(FESTIVOS).astype(int)`.",
      "Holt-Winters puede emitir avisos de convergencia: envuélvelo en `warnings.catch_warnings()` con `simplefilter(\"ignore\")`.",
    ],
    errors: [
      { error: "Incluir los siete días de la semana además del intercepto", fix: "Las siete dummies suman siempre 1: colinealidad perfecta con el intercepto. Deja una como referencia." },
      { error: "Calcular `t` desde el inicio de cada historia", fix: "La tendencia del futuro quedaría mal alineada: usa un origen común (el primer día de los datos)." },
    ],
    quiz: {
      question: "La regresión gana claramente gracias a la temperatura. ¿Qué precaución es imprescindible antes de usarla en producción?",
      options: [
        { text: "Comprobar el rendimiento usando pronósticos de temperatura (con error) en lugar de la temperatura observada" },
        { text: "Ninguna: si gana en el backtest, ganará siempre" },
        { text: "Quitar la tendencia para evitar sobreajuste", misconception: "sobreajuste" },
        { text: "Sustituir el MAE por el R²" },
      ],
      answer: 0,
      explanation: "El backtest usó información que no existirá en el momento de pronosticar (la temperatura real futura). Es una fuga de información disfrazada de supuesto: hay que reevaluar con las variables disponibles de verdad.",
    },
    project: SPEC,
    review: "Repasa: dummies con categoría de referencia; (T − 17)² para la U; Holt-Winters; el mismo backtest para todos; declarar los supuestos sobre variables futuras.",
    xp: 140,
    coins: 21,
  },
  {
    id: "ps-demanda-4",
    world: "w9",
    zone: "Series temporales y pronósticos",
    title: "El pronóstico de la demanda · 4: evaluación final, intervalos e informe",
    kind: "project",
    difficulty: 4,
    skills: ["series-temporales", "intervalos-prediccion", "evaluacion", "comunicacion"],
    requires: ["ps-demanda-3"],
    series: { ...SERIES, stage: 4 },
    story: "El jefe de operaciones no quiere un número, quiere un rango: «¿cuánto puede llegar a pedir la red el jueves que viene?». Y quiere saber si ese rango es fiable.",
    objective: "Evaluar el mejor modelo y la línea base en los 98 días de prueba con el mismo protocolo, construir intervalos de predicción empíricos con los errores de validación, medir su cobertura y redactar el informe.",
    before: ["Etapas 1 a 3", "Cuantiles", "Intervalos (diferencia entre confianza y predicción)"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "La evaluación final repite el backtest, ahora sobre los **98 días de prueba** (7 orígenes de 14 días), para el modelo elegido y para la línea base estacional.",
      "",
      "Un **intervalo de predicción** acota dónde caerá la demanda real de un día concreto (no la media). Una forma sencilla y honesta: tomar los **errores de validación** (real − pronóstico) del modelo y sumar al pronóstico sus cuantiles del 10 % y del 90 %. Así el intervalo del 80 % refleja errores que el modelo cometió de verdad.",
      "",
      "La **cobertura** en prueba (proporción de días reales dentro del intervalo) dice si el intervalo es fiable: debería rondar el 80 %. Si es mucho menor, los errores futuros son mayores que los de validación.",
    ],
    formal: "Intervalo 80 %: [ŷ + q₀,₁₀(e), ŷ + q₀,₉₀(e)], con e los residuos de validación. Cobertura = (1/n) Σ 1{yₜ ∈ intervaloₜ}",
    example: {
      code: py`import numpy as np
residuos = np.array([-12.0, 5.0, -3.0, 20.0, -8.0, 1.0, 9.0, -15.0, 4.0, 2.0])
pred = 700.0
q10, q90 = np.quantile(residuos, [0.1, 0.9])
print(round(pred + q10, 1), round(pred + q90, 1))`,
      lines: [
        "NumPy.",
        "Errores (real − pronóstico) de validación.",
        "Un pronóstico puntual.",
        "Cuantiles del 10 % y del 90 % de los errores.",
        "Intervalo del 80 %: de 687,7 a 710,1 MWh.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `residuos_validacion(datos, metodo, origenes=6, h=H)`: array con los errores real − pronóstico de todos los orígenes; `residuos` para el método `mejor` en `entrenamiento`.",
      "2. `con_intervalo(h, historia, futuro, metodo, residuos, nivel=0.8)`: DataFrame indexado por las fechas de `futuro` con `pred`, `inf` y `sup`.",
      "3. `final`: backtest en `datos` con 7 orígenes (los 98 días de prueba) para `mejor` y `\"naive_estacional\"`.",
      "4. `cobertura`: proporción de días de esos 7 bloques cuya demanda real cae dentro del intervalo del 80 %.",
      "5. `fig2`: el último pronóstico con su banda (`fill_between`) y los valores reales; e `informe` con `modelo`, `horizonte_dias`, `mae_validacion`, `mae_prueba`, `mae_base_prueba`, `mejora_sobre_base` (%), `cobertura_80` y `limitaciones` (al menos 3).",
    ],
    starter: py`def residuos_validacion(datos, metodo, origenes=6, h=H):
    return np.zeros(1)

def con_intervalo(h, historia, futuro, metodo, residuos, nivel=0.8):
    return pd.DataFrame()

residuos = None
final = {}
cobertura = 0
fig2, ax2 = plt.subplots()
informe = {}`,
    solution: SOL4,
    tests: `${REF}
def test_residuos():
    "Errores de validación del mejor modelo"
    d = _datos()
    r = t.get("residuos")
    f = t.get("METODOS")[t.get("mejor")]
    assert len(r) == 6 * 14
    c = len(d) - 98 - 6 * 14
    assert approx(r[0], d.demanda_mwh.iloc[c] - f(14, d.iloc[:c], d.iloc[c:c + 14])[0])

def test_intervalo():
    "Cuantiles empíricos"
    d = _datos()
    tb = t.get("con_intervalo", "function")(14, d.iloc[:-14], d.iloc[-14:], t.get("naive_estacional", "function"), np.arange(-10, 11), 0.8)
    assert list(tb.columns) == ["pred", "inf", "sup"] and (tb.index == d.index[-14:]).all()
    assert np.allclose(tb.sup - tb.pred, 8) and np.allclose(tb.pred - tb.inf, 8)

def test_evaluacion_final():
    "Prueba con el mismo protocolo"
    d = _datos()
    f = t.get("final")
    assert approx(f[t.get("mejor")]["mae"], _bt(d, t.get("METODOS")[t.get("mejor")], 7), 1e-6)
    assert approx(f["naive_estacional"]["mae"], _bt(d, t.get("naive_estacional", "function"), 7))
    assert 0.6 < t.get("cobertura") < 0.95, t.get("cobertura")

def test_informe():
    "Informe con cifras calculadas"
    inf = t.get("informe", dict)
    assert inf["modelo"] == t.get("mejor") and inf["horizonte_dias"] == 14
    assert approx(inf["mae_prueba"], t.get("final")[t.get("mejor")]["mae"])
    assert approx(inf["mejora_sobre_base"], 100 * (1 - inf["mae_prueba"] / inf["mae_base_prueba"])) and inf["mejora_sobre_base"] > 30
    assert approx(inf["cobertura_80"], t.get("cobertura")) and len(inf["limitaciones"]) >= 3
    assert len(t.get("fig2").axes[0].collections) >= 1
`,
    hints: [
      "residuos_validacion: igual que el backtest, pero guardando `real - pronóstico` en lugar del valor absoluto.",
      "con_intervalo: `np.quantile(residuos, [(1 - nivel) / 2, (1 + nivel) / 2])` y súmalos a la predicción.",
      "Cobertura: para cada uno de los 7 bloques de prueba compara la demanda real con `inf` y `sup` y acumula los True/False.",
    ],
    errors: [
      { error: "Usar el intervalo de confianza de la media como intervalo de predicción", fix: "El IC de la media es mucho más estrecho: no incluye la variabilidad de cada día." },
      { error: "Calcular los cuantiles con los errores de prueba", fix: "Entonces la cobertura en prueba sería del 80 % por construcción: no estarías midiendo nada." },
    ],
    quiz: {
      question: "Los intervalos del 80 % cubren el 70 % de los días de prueba. ¿Qué indica?",
      options: [
        { text: "Que los errores en prueba son algo mayores que en validación: los intervalos son algo optimistas y conviene ensancharlos o revisarlos" },
        { text: "Que hay un 70 % de probabilidad de que el modelo sea correcto", misconception: "ic-interpretacion" },
        { text: "Que el modelo es inútil" },
        { text: "Nada: la cobertura de un intervalo no se puede comprobar" },
      ],
      answer: 0,
      explanation: "Un intervalo de predicción hace una promesa comprobable: el 80 % de los valores reales deberían caer dentro. Medir la cobertura en datos nuevos es la forma de saber si cumple.",
    },
    project: SPEC,
    review: "Repasa: evaluar en prueba con el mismo protocolo; intervalos de predicción con residuos de validación; medir la cobertura; declarar supuestos.",
    xp: 160,
    coins: 25,
  },
];
