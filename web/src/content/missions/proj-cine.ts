import { peliculasCsv, valoracionesCsv } from "../datasets";
import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 9: un recomendador de películas sobre valoraciones sintéticas
// generadas con un modelo de factores latentes. Líneas base honestas, vecinos sobre residuos,
// factorización ALS elegida en validación y, al final, la lección incómoda: predecir bien las notas
// no basta para recomendar bien. Se miden precisión, cobertura y sesgo de popularidad.

const SERIES = { id: "recomendador-peliculas", title: "Proyecto progresivo: el recomendador de películas", of: 4 };

const FILES = { "peliculas.csv": peliculasCsv(), "valoraciones.csv": valoracionesCsv() };

const SPEC: ProjectSpec = {
  requirements: [
    "Separar entrenamiento y prueba respetando el tiempo: para cada usuario, sus valoraciones más recientes se reservan.",
    "Medir cada modelo contra líneas base sencillas (media global, media amortiguada, sesgos) con el RMSE.",
    "Implementar vecinos por película sobre residuos y una factorización matricial por mínimos cuadrados alternos (ALS).",
    "Elegir hiperparámetros solo con una validación sacada del entrenamiento.",
    "Evaluar el ranking (precisión y exhaustividad en 10, cobertura, popularidad) y resolver el arranque en frío.",
  ],
  dataset: "peliculas.csv (120 películas inventadas con género y año) y valoraciones.csv (8530 notas de 1 a 5 de 300 usuarios ficticios en 2023-2024), generadas con un modelo de factores latentes y popularidad de cola larga.",
  stages: ["Partición temporal y líneas base", "Vecinos por película sobre los residuos", "Factorización matricial con ALS", "Ranking, popularidad, arranque en frío y explicaciones"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Ningún hiperparámetro se elige mirando la prueba.",
    "Cada paso de ALS coincide con la solución de una regresión ridge.",
    "El informe compara RMSE y métricas de ranking y explica por qué no ordenan igual los modelos.",
  ],
  extensions: [
    "Añadir los sesgos al ALS en lugar de factorizar los residuos de un modelo fijo.",
    "Medir la diversidad de cada lista (géneros distintos) y la novedad (inversa de la popularidad).",
    "Comparar con un recomendador basado en contenido que use solo el género.",
  ],
  portfolio: "Recomendador de películas en NumPy y pandas: partición temporal, líneas base con media amortiguada y sesgos regularizados, vecinos por película con similitud contraída, factorización ALS vectorizada y elegida en validación, métricas de ranking frente a popularidad, un modelo híbrido, arranque en frío y explicaciones.",
};

const S1 = py`import numpy as np
import pandas as pd

peliculas = pd.read_csv("peliculas.csv")
valoraciones = pd.read_csv("valoraciones.csv", parse_dates=["fecha"])


def dividir_temporal(df, fraccion=0.2):
    """Para cada usuario, sus valoraciones más recientes van a prueba (al menos una)."""
    df = df.sort_values(["usuario", "fecha", "pelicula"]).reset_index(drop=True)
    posicion = df.groupby("usuario").cumcount()
    total = df.groupby("usuario")["pelicula"].transform("size")
    en_prueba = posicion >= total - np.maximum(1, np.ceil(fraccion * total)).astype(int)
    return df[~en_prueba].reset_index(drop=True), df[en_prueba].reset_index(drop=True)


def rmse(reales, predichas):
    reales, predichas = np.asarray(reales, dtype=float), np.asarray(predichas, dtype=float)
    return float(np.sqrt(np.mean((reales - predichas) ** 2)))


def media_amortiguada(train, k=10):
    mu = train["nota"].mean()
    g = train.groupby("pelicula")["nota"].agg(["sum", "count"])
    return (g["sum"] + k * mu) / (g["count"] + k)


def ajustar_sesgos(train, lam=5.0, iteraciones=10):
    mu = train["nota"].mean()
    bu = pd.Series(0.0, index=np.sort(train["usuario"].unique()))
    bi = pd.Series(0.0, index=np.sort(train["pelicula"].unique()))
    for _ in range(iteraciones):
        resto = train["nota"] - mu - bu.reindex(train["usuario"]).to_numpy()
        g = resto.groupby(train["pelicula"])
        bi = g.sum() / (g.count() + lam)
        resto = train["nota"] - mu - bi.reindex(train["pelicula"]).to_numpy()
        g = resto.groupby(train["usuario"])
        bu = g.sum() / (g.count() + lam)
    return mu, bu, bi


def predecir_sesgos(modelo, df):
    mu, bu, bi = modelo
    return mu + bu.reindex(df["usuario"]).fillna(0).to_numpy() + bi.reindex(df["pelicula"]).fillna(0).to_numpy()


train, test = dividir_temporal(valoraciones)
sesgos = ajustar_sesgos(train)
mu = train["nota"].mean()
lineas_base = {
    "media_global": rmse(test["nota"], np.full(len(test), mu)),
    "media_pelicula": rmse(test["nota"], media_amortiguada(train).reindex(test["pelicula"]).fillna(mu)),
    "sesgos": rmse(test["nota"], predecir_sesgos(sesgos, test)),
}
print({k: round(v, 4) for k, v in lineas_base.items()})`;

const S2 = py`USUARIOS = np.sort(valoraciones["usuario"].unique())
PELICULAS = peliculas["pelicula"].to_numpy()
fila_de = {u: k for k, u in enumerate(USUARIOS)}
columna_de = {p: k for k, p in enumerate(PELICULAS)}


def matriz_residuos(train, modelo):
    """Usuarios × películas con nota − (μ + b_u + b_i) y NaN donde no hay valoración."""
    R = np.full((len(USUARIOS), len(PELICULAS)), np.nan)
    R[train["usuario"].map(fila_de), train["pelicula"].map(columna_de)] = train["nota"] - predecir_sesgos(modelo, train)
    return R


def similitud_items(R, contraccion=10):
    """Coseno entre columnas de residuos sobre los usuarios comunes, contraído hacia 0 si hay pocos."""
    vistos = ~np.isnan(R)
    X = np.nan_to_num(R)
    producto = X.T @ X
    normas = np.sqrt((X**2).T @ vistos * ((X**2).T @ vistos).T)
    comunes = vistos.T.astype(float) @ vistos.astype(float)
    with np.errstate(invalid="ignore", divide="ignore"):
        S = np.where(normas > 0, producto / normas, 0.0)
    S *= np.where(comunes > 0, comunes / np.maximum(comunes + contraccion, 1e-12), 0.0)
    np.fill_diagonal(S, 0.0)
    return S


def predecir_knn(R, S, modelo, df, k=20):
    base = predecir_sesgos(modelo, df)
    predicciones = []
    for b, u, p in zip(base, df["usuario"].map(fila_de), df["pelicula"].map(columna_de)):
        vistos = np.flatnonzero(~np.isnan(R[u]))
        vecinos = vistos[np.argsort(-S[p, vistos], kind="stable")[:k]]
        pesos = S[p, vecinos]
        positivos = pesos > 0
        if positivos.any():
            b += (pesos[positivos] @ R[u, vecinos[positivos]]) / pesos[positivos].sum()
        predicciones.append(min(5.0, max(1.0, b)))
    return np.array(predicciones)


R_train = matriz_residuos(train, sesgos)
S_items = similitud_items(R_train)
pred_knn = predecir_knn(R_train, S_items, sesgos, test)
rmse_knn = rmse(test["nota"], pred_knn)
mas_parecidas = {
    titulo: peliculas["titulo"].iloc[np.argsort(-S_items[columna_de[pid]])[:3]].tolist()
    for pid, titulo in zip(peliculas["pelicula"].head(3), peliculas["titulo"].head(3))
}`;

const S3 = py`def paso_als(R, fijos, lam):
    """Resuelve, para cada fila de R, la regresión ridge de sus residuos observados sobre los factores fijos."""
    vistos = ~np.isnan(R)
    X = np.nan_to_num(R)
    f = fijos.shape[1]
    A = np.einsum("uj,jk,jl->ukl", vistos.astype(float), fijos, fijos) + lam * np.eye(f)
    b = X @ fijos
    return np.linalg.solve(A, b[..., None])[..., 0]


def als(R, rango=5, lam=5.0, iteraciones=10, semilla=0):
    rng = np.random.default_rng(semilla)
    Q = rng.normal(0, 0.1, size=(R.shape[1], rango))
    for _ in range(iteraciones):
        P = paso_als(R, Q, lam)
        Q = paso_als(R.T, P, lam)
    return P, Q


def predecir_mf(P, Q, modelo, df):
    u = df["usuario"].map(fila_de).to_numpy()
    i = df["pelicula"].map(columna_de).to_numpy()
    return np.clip(predecir_sesgos(modelo, df) + np.einsum("nk,nk->n", P[u], Q[i]), 1, 5)


# La rejilla se elige con una validación sacada del entrenamiento: la prueba solo se usa al final.
sub_train, validacion = dividir_temporal(train, 0.2)
sesgos_sub = ajustar_sesgos(sub_train)
R_sub = matriz_residuos(sub_train, sesgos_sub)
rejilla = {}
for rango in (3, 6):
    for lam in (2.0, 5.0, 10.0):
        P, Q = als(R_sub, rango, lam, iteraciones=10)
        rejilla[(rango, lam)] = rmse(validacion["nota"], predecir_mf(P, Q, sesgos_sub, validacion))
mejor_rango, mejor_lam = min(rejilla, key=rejilla.get)
P, Q = als(R_train, mejor_rango, mejor_lam, iteraciones=10)
rmse_mf = rmse(test["nota"], predecir_mf(P, Q, sesgos, test))
comparacion_rmse = {**lineas_base, "knn": rmse_knn, "factorizacion": rmse_mf}
print({k: round(v, 4) for k, v in comparacion_rmse.items()}, (mejor_rango, mejor_lam))`;

const S4 = py`def matriz_puntuaciones(P, Q, modelo):
    """Nota predicha para cada usuario × película: μ + b_u + b_i + p_u·q_i."""
    mu, bu, bi = modelo
    return mu + bu.reindex(USUARIOS).fillna(0).to_numpy()[:, None] + bi.reindex(PELICULAS).fillna(0).to_numpy()[None, :] + P @ Q.T


def popularidad(df):
    return df.groupby("pelicula").size().reindex(PELICULAS).fillna(0).to_numpy()


def top_n(puntos, vistos, n=10):
    puntos = np.array(puntos, dtype=float)
    puntos[list(vistos)] = -np.inf
    return [int(j) for j in np.argsort(-puntos, kind="stable")[:n]]


def evaluar_ranking(puntos, train, test, n=10, umbral=4):
    """precisión@n, exhaustividad@n, cobertura del catálogo y popularidad media de lo recomendado."""
    vistos_por = train.groupby("usuario")["pelicula"].agg(lambda s: {columna_de[p] for p in s}).to_dict()
    gustan = test[test["nota"] >= umbral].groupby("usuario")["pelicula"].agg(lambda s: {columna_de[p] for p in s}).to_dict()
    vistas = popularidad(train)
    precision, exhaustividad, recomendadas, pop = [], [], set(), []
    for usuario, relevantes in gustan.items():
        lista = top_n(puntos[fila_de[usuario]], vistos_por.get(usuario, set()), n)
        aciertos = len(set(lista) & relevantes)
        precision.append(aciertos / n)
        exhaustividad.append(aciertos / len(relevantes))
        recomendadas.update(lista)
        pop.append(vistas[lista].mean())
    return {"precision": float(np.mean(precision)), "exhaustividad": float(np.mean(exhaustividad)),
            "cobertura": len(recomendadas) / len(PELICULAS), "popularidad_media": float(np.mean(pop))}


def hibrido(puntos_mf, conteo, beta):
    return puntos_mf + beta * np.log1p(conteo)[None, :]


# β se elige en validación con un modelo entrenado en sub_train; la prueba solo se mira al final.
P_sub, Q_sub = als(R_sub, mejor_rango, mejor_lam, iteraciones=10)
puntos_sub = matriz_puntuaciones(P_sub, Q_sub, sesgos_sub)
validacion_beta = {beta: evaluar_ranking(hibrido(puntos_sub, popularidad(sub_train), beta), sub_train, validacion)["precision"] for beta in (0.0, 0.5, 1.0, 2.0, 5.0)}
mejor_beta = max(validacion_beta, key=validacion_beta.get)

conteo = popularidad(train)
puntos_mf = matriz_puntuaciones(P, Q, sesgos)
ranking = {
    "popularidad": evaluar_ranking(np.tile(conteo.astype(float), (len(USUARIOS), 1)), train, test),
    "factorizacion": evaluar_ranking(puntos_mf, train, test),
    "hibrido": evaluar_ranking(hibrido(puntos_mf, conteo, mejor_beta), train, test),
}


def usuario_nuevo(notas, modelo, Q, lam, n=10):
    """Arranque en frío: factores de un usuario nuevo a partir de unas pocas notas {película: nota}."""
    mu, _, bi = modelo
    cols = [columna_de[p] for p in notas]
    residuos = np.array(list(notas.values()), dtype=float) - mu - bi.reindex(list(notas)).fillna(0).to_numpy()
    p = np.linalg.solve(Q[cols].T @ Q[cols] + lam * np.eye(Q.shape[1]), Q[cols].T @ residuos)
    puntos = mu + bi.reindex(PELICULAS).fillna(0).to_numpy() + Q @ p
    return [int(PELICULAS[j]) for j in top_n(puntos, set(cols), n)]


def explicar(pelicula, vistas):
    """La película ya vista más parecida a la recomendada en el espacio de factores (coseno)."""
    q = Q[columna_de[pelicula]]
    cosenos = {v: q @ Q[columna_de[v]] / (np.linalg.norm(q) * np.linalg.norm(Q[columna_de[v]])) for v in vistas if v != pelicula}
    return max(cosenos, key=cosenos.get)


titulos = peliculas.set_index("pelicula")
ciencia_ficcion = peliculas.loc[peliculas["genero"] == "ciencia ficción", "pelicula"].head(4).tolist()
nuevo = usuario_nuevo({p: 5 for p in ciencia_ficcion}, sesgos, Q, mejor_lam)
generos_nuevo = titulos.loc[nuevo, "genero"].value_counts().to_dict()
porque = {titulos.loc[p, "titulo"]: titulos.loc[explicar(p, ciencia_ficcion), "titulo"] for p in nuevo[:3]}
for nombre, m in ranking.items():
    print(f"{nombre:13s} precisión@10 {m['precision']:.3f} · exhaustividad@10 {m['exhaustividad']:.3f} · cobertura {m['cobertura']:.0%}")`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

const PAQUETES = ["numpy", "pandas"];

export const PROJ_CINE: Mission[] = [
  {
    id: "pr-cine-1",
    world: "w9",
    zone: "Sistemas de recomendación",
    title: "El recomendador de películas · 1: partición temporal y líneas base",
    kind: "project",
    difficulty: 3,
    skills: ["recomendacion", "validacion-temporal", "linea-base", "regularizacion"],
    requires: ["mv-recomendador"],
    series: { ...SERIES, stage: 1 },
    packages: PAQUETES,
    files: FILES,
    story: "El cine del Multiverso quiere recomendar películas a sus 300 socios. Antes de cualquier modelo sofisticado, la directora pide saber cuánto se equivoca la estrategia más tonta: si un modelo complejo no la mejora, no vale la pena.",
    objective: "Separar las valoraciones respetando el tiempo y medir con el RMSE tres líneas base: la media global, la media de cada película amortiguada y un modelo de sesgos de usuario y película regularizados.",
    before: ["Recomendadores por similitud", "Regularización", "groupby en pandas"],
    intuition: [
      "Un recomendador se usa **hacia delante**: con lo que el socio ha valorado hasta hoy, predecir lo siguiente. Por eso la prueba se hace con las valoraciones **más recientes** de cada socio, no con una muestra al azar que mezclaría pasado y futuro.",
      "",
      "Las **líneas base** ponen el listón: la media global (3,8 para todo), la media de cada película y un modelo de **sesgos**: nota ≈ μ + b_usuario + b_película (hay socios generosos y películas mejores).",
      "",
      "Una película con 2 notas de 5 no es mejor que una con 200 notas de media 4,6. La **media amortiguada** (k notas «imaginarias» iguales a la media global) y la **regularización** de los sesgos (λ) protegen de las medias con pocos datos.",
      "",
      "Los sesgos se ajustan **alternando**: con los de usuario fijos, cada sesgo de película es la media de sus residuos contraída por λ; luego al revés.",
    ],
    formal: "RMSE = √(Σ(r − r̂)²/n) · media amortiguada_i = (Σ r_ui + k·μ)/(n_i + k) · b_i = Σ_u (r_ui − μ − b_u)/(λ + n_i) · b_u = Σ_i (r_ui − μ − b_i)/(λ + n_u)",
    example: {
      code: py`import numpy as np
notas = np.array([5, 5])
mu, k = 3.8, 10
print(notas.mean(), round((notas.sum() + k * mu) / (len(notas) + k), 3))`,
      lines: [
        "NumPy.",
        "Una película con solo dos notas, ambas de 5.",
        "Media global y amortiguación.",
        "Media cruda 5,0 frente a amortiguada 4,0: con pocas notas manda la media global.",
      ],
    },
    challenge: [
      "1. Lee `peliculas.csv` y `valoraciones.csv` (con `parse_dates=[\"fecha\"]`).",
      "2. `dividir_temporal(df, fraccion=0.2)`: ordena por usuario, fecha y película; para cada usuario, sus últimas max(1, ⌈fraccion·n⌉) valoraciones van a prueba. Devuelve `(train, test)` con índices reiniciados.",
      "3. `rmse(reales, predichas)`, `media_amortiguada(train, k=10)` (Serie por película) y `ajustar_sesgos(train, lam=5.0, iteraciones=10)` → `(mu, bu, bi)` (Series indexadas por usuario y por película, empezando con sesgos de usuario 0 y actualizando primero las películas).",
      "4. `predecir_sesgos(modelo, df)`: μ + b_u + b_i (0 para lo desconocido).",
      "5. `train, test`, `sesgos`, `mu` y `lineas_base` con el RMSE en prueba de `media_global`, `media_pelicula` y `sesgos`. Imprímelo redondeado.",
    ],
    starter: py`import numpy as np
import pandas as pd

peliculas = pd.read_csv("peliculas.csv")
valoraciones = pd.read_csv("valoraciones.csv", parse_dates=["fecha"])


def dividir_temporal(df, fraccion=0.2):
    return df, df.iloc[0:0]


def rmse(reales, predichas):
    return 0.0


def media_amortiguada(train, k=10):
    return pd.Series(dtype=float)


def ajustar_sesgos(train, lam=5.0, iteraciones=10):
    return 0.0, pd.Series(dtype=float), pd.Series(dtype=float)


def predecir_sesgos(modelo, df):
    return np.zeros(len(df))


train, test = dividir_temporal(valoraciones)
sesgos = ajustar_sesgos(train)
mu = 0.0
lineas_base = {}
print(lineas_base)`,
    solution: SOL1,
    tests: py`
import math
import numpy as np
import pandas as pd

def test_particion():
    "Lo más reciente de cada usuario va a prueba"
    tr, te, v = t.get("train", pd.DataFrame), t.get("test", pd.DataFrame), t.get("valoraciones", pd.DataFrame)
    assert len(tr) + len(te) == len(v) == 8530
    claves = lambda d: set(zip(d["usuario"], d["pelicula"]))
    assert not claves(tr) & claves(te) and claves(tr) | claves(te) == claves(v)
    n = v.groupby("usuario").size()
    esperado = n.map(lambda k: max(1, math.ceil(0.2 * k)))
    assert (te.groupby("usuario").size().reindex(n.index) == esperado).all()
    assert (te.groupby("usuario")["fecha"].min() >= tr.groupby("usuario")["fecha"].max()).all()

def test_medidas():
    "RMSE y media amortiguada"
    r, ma = t.get("rmse", "function"), t.get("media_amortiguada", "function")
    assert abs(r([1, 2, 3], [1, 2, 5]) - math.sqrt(4 / 3)) < 1e-12
    tr = t.get("train", pd.DataFrame)
    p = tr["pelicula"].iloc[0]
    notas = tr.loc[tr["pelicula"] == p, "nota"]
    assert abs(ma(tr, 0)[p] - notas.mean()) < 1e-12
    assert abs(ma(tr, 10)[p] - (notas.sum() + 10 * tr["nota"].mean()) / (len(notas) + 10)) < 1e-12

def test_sesgos():
    "Sesgos regularizados en su punto fijo"
    aj, tr = t.get("ajustar_sesgos", "function"), t.get("train", pd.DataFrame)
    mu, bu, bi = aj(tr, lam=5.0, iteraciones=60)
    resto = tr["nota"] - mu - bu.reindex(tr["usuario"]).to_numpy()
    g = resto.groupby(tr["pelicula"])
    assert np.allclose(bi.sort_index(), (g.sum() / (g.count() + 5.0)).sort_index(), atol=1e-6)
    _, bu_grande, bi_grande = aj(tr, lam=1e6)
    assert bi_grande.abs().max() < 1e-3 and bu_grande.abs().max() < 1e-3, "Con λ enorme los sesgos tienden a 0"

def test_lineas_base():
    "Cada línea base mejora la anterior"
    lb = t.get("lineas_base", dict)
    assert set(lb) == {"media_global", "media_pelicula", "sesgos"}
    assert lb["sesgos"] < lb["media_pelicula"] < lb["media_global"] and lb["sesgos"] < 0.86
    te, mu = t.get("test", pd.DataFrame), t.get("mu")
    assert abs(lb["media_global"] - np.sqrt(((te["nota"] - mu) ** 2).mean())) < 1e-12
`,
    hints: [
      "dividir_temporal: tras ordenar, `posicion = df.groupby(\"usuario\").cumcount()` y `total = df.groupby(\"usuario\")[\"pelicula\"].transform(\"size\")`; van a prueba las filas con `posicion >= total - max(1, ceil(fraccion * total))`.",
      "ajustar_sesgos: `resto = train[\"nota\"] - mu - bu.reindex(train[\"usuario\"]).to_numpy()` y `g = resto.groupby(train[\"pelicula\"])`; `bi = g.sum() / (g.count() + lam)`. Después lo mismo para los usuarios.",
      "predecir_sesgos: `bu.reindex(df[\"usuario\"]).fillna(0).to_numpy()`.",
    ],
    errors: [
      { error: "Partir al azar sin mirar las fechas", fix: "Se usarían valoraciones futuras para predecir el pasado: el error en prueba saldría optimista." },
      { error: "Usar la media cruda de películas con pocas notas", fix: "Dos notas de 5 no prueban nada: amortigua hacia la media global." },
      { error: "Elegir k o λ mirando el RMSE de prueba", fix: "Fíjalos o elígelos con una validación; la prueba es para el informe final." },
    ],
    quiz: {
      question: "Un modelo nuevo obtiene un RMSE de 0,85 y la línea base de sesgos 0,84. ¿Qué concluyes?",
      options: [
        { text: "Que el modelo nuevo no aporta nada frente a una línea base sencilla: no compensa su complejidad" },
        { text: "Que el modelo es bueno, porque un RMSE de 0,85 sobre una escala de 1 a 5 es pequeño" },
        { text: "Que las dos son iguales de buenas y conviene usar la más compleja" },
        { text: "Nada: el RMSE no sirve para comparar modelos" },
      ],
      answer: 0,
      explanation: "Un número solo tiene sentido comparado. Las líneas base dicen cuánto se consigue sin esfuerzo; un modelo debe superarlas con claridad.",
    },
    project: SPEC,
    review: "Repasa: partición temporal por usuario; RMSE; media amortiguada; sesgos regularizados ajustados por turnos.",
    xp: 140,
    coins: 20,
  },
  {
    id: "pr-cine-2",
    world: "w9",
    zone: "Sistemas de recomendación",
    title: "El recomendador de películas · 2: vecinos por película sobre los residuos",
    kind: "project",
    difficulty: 4,
    skills: ["recomendacion", "similitud", "vectorizacion", "evaluacion"],
    requires: ["pr-cine-1"],
    series: { ...SERIES, stage: 2 },
    packages: PAQUETES,
    files: FILES,
    story: "Los sesgos saben que un socio es generoso, pero no que adora la ciencia ficción. La directora propone una idea clásica: si te gustó una película, te gustarán sus «vecinas», las que otros valoran de forma parecida.",
    objective: "Construir la matriz de residuos (nota menos sesgos), calcular la similitud del coseno entre películas sobre los usuarios comunes, contraerla cuando hay pocos, y predecir con los k vecinos más parecidos que el socio ya ha visto.",
    before: ["Etapa 1", "Similitud del coseno", "NumPy con NaN"],
    intuition: [
      "Trabajar con **residuos** (nota − μ − b_u − b_i) quita lo que ya explican los sesgos: lo que queda es el gusto particular. Dos películas son vecinas si los socios se desvían de lo esperado en la misma dirección.",
      "",
      "El **coseno** se calcula solo con los socios que vieron **las dos** películas. Si son pocos, la similitud es poco fiable: se **contrae** multiplicándola por n/(n + c).",
      "",
      "Para predecir la nota de un socio en una película: los sesgos más la media ponderada de sus residuos en las k películas vistas más parecidas (solo con pesos positivos).",
      "",
      "Todo se puede hacer con matrices: si X tiene los residuos (0 donde falta) y V indica qué hay, Xᵀ·X da los productos sobre usuarios comunes y Vᵀ·V cuántos usuarios comunes hay.",
    ],
    formal: "sim(i, j) = Σ_u x_ui x_uj / √(Σ_{u: j visto} x_ui² · Σ_{u: i visto} x_uj²) · n_ij/(n_ij + c) · r̂_ui = μ + b_u + b_i + Σ_{j ∈ N_k(i; u)} sim(i, j)·x_uj / Σ sim(i, j)",
    example: {
      code: py`import numpy as np
X = np.array([[1.0, 0.8, np.nan], [-1.0, -0.6, 0.5], [np.nan, 0.2, -0.4]])
V = ~np.isnan(X)
print(V.astype(int).T @ V.astype(int))`,
      lines: [
        "NumPy.",
        "Residuos de 3 usuarios en 3 películas; NaN donde no hay nota.",
        "Qué celdas tienen valor.",
        "Usuarios comunes de cada par de películas: la diagonal cuenta los de cada una.",
      ],
    },
    challenge: [
      "1. `USUARIOS`, `PELICULAS`, `fila_de` y `columna_de` (diccionarios id → posición).",
      "2. `matriz_residuos(train, modelo)`: usuarios × películas con nota − predicción de sesgos y NaN en el resto.",
      "3. `similitud_items(R, contraccion=10)`: la fórmula con usuarios comunes, contraída por n/(n + c) (0 si no hay comunes) y con la diagonal a 0.",
      "4. `predecir_knn(R, S, modelo, df, k=20)`: para cada fila de df, sesgos + media ponderada de los residuos del usuario en sus k películas vistas más similares (solo pesos > 0), recortada a [1, 5].",
      "5. `R_train`, `S_items`, `pred_knn`, `rmse_knn` y `mas_parecidas`: para las 3 primeras películas, los títulos de sus 3 más similares.",
    ],
    starter: py`USUARIOS = np.sort(valoraciones["usuario"].unique())
PELICULAS = peliculas["pelicula"].to_numpy()
fila_de = {u: k for k, u in enumerate(USUARIOS)}
columna_de = {p: k for k, p in enumerate(PELICULAS)}


def matriz_residuos(train, modelo):
    return np.full((len(USUARIOS), len(PELICULAS)), np.nan)


def similitud_items(R, contraccion=10):
    return np.zeros((R.shape[1], R.shape[1]))


def predecir_knn(R, S, modelo, df, k=20):
    return predecir_sesgos(modelo, df)


R_train = matriz_residuos(train, sesgos)
S_items = similitud_items(R_train)
pred_knn = predecir_knn(R_train, S_items, sesgos, test)
rmse_knn = rmse(test["nota"], pred_knn)
mas_parecidas = {}`,
    solution: SOL2,
    tests: py`
import numpy as np
import pandas as pd

def test_residuos():
    "Matriz de residuos"
    R, tr = t.get("R_train"), t.get("train", pd.DataFrame)
    assert R.shape == (300, 120) and (~np.isnan(R)).sum() == len(tr)
    fila = tr.iloc[5]
    u, i = t.get("fila_de")[fila["usuario"]], t.get("columna_de")[fila["pelicula"]]
    pred = t.get("predecir_sesgos")(t.get("sesgos"), tr.iloc[5:6])[0]
    assert abs(R[u, i] - (fila["nota"] - pred)) < 1e-12

def test_similitud():
    "Coseno sobre usuarios comunes, contraído"
    S, R = t.get("S_items"), t.get("R_train")
    assert np.allclose(S, S.T) and np.allclose(np.diag(S), 0)
    for i, j in ((0, 5), (3, 40), (17, 99)):
        m = ~np.isnan(R[:, i]) & ~np.isnan(R[:, j])
        assert m.sum() > 0, "La matriz de residuos está vacía: complétala antes de calcular similitudes"
        a, b = R[m, i], R[m, j]
        esperado = (a @ b) / np.sqrt((a @ a) * (b @ b)) * m.sum() / (m.sum() + 10)
        assert abs(S[i, j] - esperado) < 1e-12, (i, j)
    sin = t.get("similitud_items", "function")(R, contraccion=0)
    assert np.abs(sin).max() <= 1 + 1e-12

def test_knn():
    "Los vecinos mejoran a los sesgos"
    p, lb = t.get("pred_knn"), t.get("lineas_base", dict)
    assert p.min() >= 1 and p.max() <= 5 and len(p) == len(t.get("test"))
    assert t.get("rmse_knn") < lb["sesgos"] - 0.03

def test_generos():
    "Sin saber los géneros, los vecinos los descubren"
    S, pel = t.get("S_items"), t.get("peliculas", pd.DataFrame)
    g = pel["genero"].to_numpy()
    acuerdo = np.mean([np.mean(g[np.argsort(-S[j])[:5]] == g[j]) for j in range(120)])
    assert acuerdo > 0.4, f"Solo el {acuerdo:.0%} de los vecinos comparte género (al azar sería ≈ 17 %)"
    mp = t.get("mas_parecidas", dict)
    assert len(mp) == 3 and all(len(v) == 3 for v in mp.values())
`,
    hints: [
      "similitud_items: `V = ~np.isnan(R)`, `X = np.nan_to_num(R)`; numerador `X.T @ X`; las normas cruzadas son `(X**2).T @ V` multiplicado elemento a elemento por su traspuesta; los comunes, `V.T.astype(float) @ V.astype(float)`.",
      "predecir_knn: para cada (usuario u, película p), `vistos = np.flatnonzero(~np.isnan(R[u]))` y `vecinos = vistos[np.argsort(-S[p, vistos])[:k]]`.",
      "Recorre `zip(base, df[\"usuario\"].map(fila_de), df[\"pelicula\"].map(columna_de))` y usa `np.clip` o `min`/`max` para el recorte.",
    ],
    errors: [
      { error: "Calcular el coseno con todos los usuarios, rellenando con 0", fix: "Un 0 rellenado parece una opinión neutra: usa solo los usuarios que vieron las dos películas." },
      { error: "Dar el mismo peso a una similitud basada en 2 usuarios que en 200", fix: "Contráela con n/(n + c)." },
      { error: "Usar las notas en lugar de los residuos", fix: "La similitud reflejaría que las dos películas son buenas, no que gustan a las mismas personas." },
    ],
    quiz: {
      question: "Los vecinos más parecidos comparten género el 61 % de las veces, y el modelo nunca vio los géneros. ¿Qué indica?",
      options: [
        { text: "Que los patrones de valoración contienen la información del género: los socios se desvían igual en películas del mismo tipo" },
        { text: "Que hay una fuga de datos: el género estaba en la matriz", misconception: "data-leakage" },
        { text: "Que el 61 % de las predicciones son correctas" },
        { text: "Que la similitud del coseno siempre agrupa por género" },
      ],
      answer: 0,
      explanation: "El filtrado colaborativo descubre estructura latente a partir del comportamiento. Comprobarlo con una variable que el modelo no usó es una buena validación.",
    },
    project: SPEC,
    review: "Repasa: residuos tras los sesgos; coseno con usuarios comunes; contracción; vecinos vistos por el usuario.",
    xp: 150,
    coins: 22,
  },
  {
    id: "pr-cine-3",
    world: "w9",
    zone: "Sistemas de recomendación",
    title: "El recomendador de películas · 3: factorización matricial con ALS",
    kind: "project",
    difficulty: 4,
    skills: ["recomendacion", "algebra-lineal", "regularizacion", "hiperparametros"],
    requires: ["pr-cine-2", "ml-regularizacion"],
    series: { ...SERIES, stage: 3 },
    packages: PAQUETES,
    files: FILES,
    story: "Los vecinos funcionan, pero el cine quiere algo más compacto: describir a cada socio y a cada película con unos pocos números, gustos latentes, y que su producto prediga la nota.",
    objective: "Factorizar la matriz de residuos con mínimos cuadrados alternos regularizados, vectorizando los pasos, verificar que cada paso es una regresión ridge y elegir el rango y λ con una validación sacada del entrenamiento.",
    before: ["Etapas 1 y 2", "Regresión ridge", "Validación y sobreajuste"],
    intuition: [
      "La **factorización matricial** aproxima el residuo del socio u en la película i por p_u · q_i, con vectores de unas pocas dimensiones (el **rango**).",
      "",
      "Con las películas fijas, cada socio es una **regresión ridge**: sus residuos observados frente a los vectores de las películas que vio. Con los socios fijos, cada película es otra. **ALS** alterna ambos pasos.",
      "",
      "Resolver 300 sistemas pequeños en un bucle es lento; NumPy los resuelve **todos a la vez**: `np.einsum` construye las matrices QᵀQ de cada usuario (solo con lo que vio) y `np.linalg.solve` admite pilas de sistemas.",
      "",
      "Rango y λ se eligen con **validación**: se aparta lo más reciente del propio entrenamiento. Con λ pequeño el modelo memoriza; con λ grande, los factores se anulan y vuelves a los sesgos.",
    ],
    formal: "min Σ_(u,i) observados (x_ui − p_u·q_i)² + λ(Σ‖p_u‖² + Σ‖q_i‖²) · p_u = (Q_uᵀQ_u + λI)⁻¹ Q_uᵀ x_u",
    example: {
      code: py`import numpy as np
Q = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
x = np.array([1.0, -1.0, 0.0])
lam = 0.5
print(np.linalg.solve(Q.T @ Q + lam * np.eye(2), Q.T @ x))`,
      lines: [
        "NumPy.",
        "Vectores de tres películas en 2 dimensiones.",
        "Residuos de un socio en esas películas.",
        "Regularización.",
        "Los gustos del socio, la solución ridge: [ 0.667 −0.667] (NumPy imprime más decimales).",
      ],
    },
    challenge: [
      "1. `paso_als(R, fijos, lam)`: para cada fila de R, la solución ridge (sin intercepto) de sus valores observados sobre las filas correspondientes de `fijos`, todas a la vez.",
      "2. `als(R, rango=5, lam=5.0, iteraciones=10, semilla=0)`: Q inicial `default_rng(semilla).normal(0, 0.1, (n_peliculas, rango))`; en cada iteración, P con Q fijo y luego Q con P fijo (usando Rᵀ). Devuelve `(P, Q)`.",
      "3. `predecir_mf(P, Q, modelo, df)`: sesgos + p_u·q_i, recortado a [1, 5].",
      "4. Validación: `sub_train, validacion = dividir_temporal(train, 0.2)`, `sesgos_sub`, `R_sub`; `rejilla` con el RMSE de validación para rango ∈ {3, 6} y λ ∈ {2, 5, 10} (10 iteraciones); `mejor_rango, mejor_lam` el mínimo.",
      "5. Reentrena con `R_train` y la mejor configuración: `P, Q`, `rmse_mf` y `comparacion_rmse` (las líneas base más `knn` y `factorizacion`).",
    ],
    starter: py`def paso_als(R, fijos, lam):
    return np.zeros((R.shape[0], fijos.shape[1]))


def als(R, rango=5, lam=5.0, iteraciones=10, semilla=0):
    return np.zeros((R.shape[0], rango)), np.zeros((R.shape[1], rango))


def predecir_mf(P, Q, modelo, df):
    return predecir_sesgos(modelo, df)


sub_train, validacion = dividir_temporal(train, 0.2)
sesgos_sub = ajustar_sesgos(sub_train)
R_sub = matriz_residuos(sub_train, sesgos_sub)
rejilla = {}
mejor_rango, mejor_lam = 5, 5.0
P, Q = als(R_train, mejor_rango, mejor_lam)
rmse_mf = rmse(test["nota"], predecir_mf(P, Q, sesgos, test))
comparacion_rmse = {}`,
    solution: SOL3,
    tests: py`
import numpy as np
import pandas as pd

def test_paso_als_es_ridge():
    "Cada fila es una regresión ridge"
    pa = t.get("paso_als", "function")
    R = t.get("R_train")
    Q = np.random.default_rng(3).normal(0, 0.5, size=(120, 4))
    P = pa(R, Q, 7.0)
    for u in (0, 11, 250):
        m = ~np.isnan(R[u])
        A = np.vstack([Q[m], np.sqrt(7.0) * np.eye(4)])
        b = np.concatenate([R[u, m], np.zeros(4)])
        ref = np.linalg.lstsq(A, b, rcond=None)[0]
        assert np.allclose(P[u], ref, atol=1e-10), u
    assert pa(R.T, P, 7.0).shape == (120, 4)

def test_als():
    "ALS reproducible que mejora las líneas base"
    a = t.get("als", "function")
    R = t.get("R_train")
    P1, Q1 = a(R, 3, 5.0, iteraciones=3, semilla=1)
    P2, Q2 = a(R, 3, 5.0, iteraciones=3, semilla=1)
    assert P1.shape == (300, 3) and Q1.shape == (120, 3) and np.array_equal(P1, P2)
    lb = t.get("lineas_base", dict)
    assert t.get("rmse_mf") < lb["sesgos"] - 0.03
    pr = t.get("predecir_mf")(t.get("P"), t.get("Q"), t.get("sesgos"), t.get("test"))
    assert pr.min() >= 1 and pr.max() <= 5

def test_validacion():
    "La configuración sale de la validación, no de la prueba"
    rej = t.get("rejilla", dict)
    assert set(rej) == {(r, l) for r in (3, 6) for l in (2.0, 5.0, 10.0)}
    assert (t.get("mejor_rango"), t.get("mejor_lam")) == min(rej, key=rej.get)
    tr, va = t.get("train", pd.DataFrame), t.get("validacion", pd.DataFrame)
    assert set(zip(va["usuario"], va["pelicula"])) <= set(zip(tr["usuario"], tr["pelicula"]))
    assert rej[(6, 2.0)] > rej[(6, 5.0)], "Con poca regularización el modelo sobreajusta"
    c = t.get("comparacion_rmse", dict)
    assert list(c) == ["media_global", "media_pelicula", "sesgos", "knn", "factorizacion"]
`,
    hints: [
      "paso_als: `V = ~np.isnan(R)`, `X = np.nan_to_num(R)`; `A = np.einsum(\"uj,jk,jl->ukl\", V.astype(float), fijos, fijos) + lam * np.eye(f)` y `b = X @ fijos`.",
      "`np.linalg.solve(A, b[..., None])[..., 0]` resuelve la pila de sistemas f × f de una vez.",
      "En la rejilla, entrena con `R_sub` y mide con `validacion` usando `sesgos_sub`; la prueba solo se usa con la configuración ya elegida.",
    ],
    errors: [
      { error: "Elegir rango y λ con el RMSE de prueba", fix: "La prueba dejaría de medir el rendimiento futuro. Usa una validación sacada del entrenamiento." },
      { error: "Rellenar con 0 los residuos que faltan y factorizar la matriz completa", fix: "El modelo aprendería a predecir 0 donde no hay nota. Cada ridge usa solo lo observado." },
      { error: "Resolver un sistema por usuario en un bucle de Python", fix: "Funciona, pero es mucho más lento: construye la pila de matrices con einsum y resuelve de una vez." },
    ],
    quiz: {
      question: "Con λ = 10 el RMSE de validación es casi igual al de la línea base de sesgos. ¿Por qué?",
      options: [
        { text: "Porque una penalización tan fuerte encoge los factores casi a cero, y p_u·q_i ≈ 0 deja solo los sesgos" },
        { text: "Porque con λ grande el modelo sobreajusta", misconception: "sobreajuste" },
        { text: "Porque ALS no ha convergido" },
        { text: "Porque el rango es demasiado alto" },
      ],
      answer: 0,
      explanation: "λ grande produce infraajuste: los factores no compensan su penalización. λ pequeño produce sobreajuste. La validación encuentra el punto intermedio.",
    },
    project: SPEC,
    review: "Repasa: ALS alterna regresiones ridge; vectorizar con einsum y solve; rango y λ en validación; infraajuste y sobreajuste.",
    xp: 160,
    coins: 24,
  },
  {
    id: "pr-cine-4",
    world: "w9",
    zone: "Sistemas de recomendación",
    title: "El recomendador de películas · 4: ranking, popularidad, arranque en frío y explicaciones",
    kind: "project",
    difficulty: 4,
    skills: ["recomendacion", "metricas", "evaluacion", "sesgo"],
    requires: ["pr-cine-3", "ml-metricas"],
    series: { ...SERIES, stage: 4 },
    packages: PAQUETES,
    files: FILES,
    story: "La factorización predice las notas mejor que nadie. Pero el cine no muestra notas: muestra una lista de 10 películas. La pregunta cambia: ¿cuántas de esas 10 le gustarán al socio? Y los socios nuevos, sin historial, también quieren recomendaciones… y saber por qué se las hacen.",
    objective: "Evaluar listas de 10 recomendaciones con precisión, exhaustividad, cobertura y popularidad media; comparar con recomendar lo más popular; elegir en validación un híbrido; recomendar a un socio nuevo con pocas notas y explicar cada recomendación.",
    before: ["Etapas 1 a 3", "Precisión y exhaustividad", "Sesgo de selección"],
    intuition: [
      "**Precisión@10**: de las 10 recomendadas, cuántas valoró el socio con 4 o más en prueba. **Exhaustividad@10**: de las que le gustaron en prueba, cuántas estaban en la lista. **Cobertura**: qué parte del catálogo llega a recomendarse.",
      "",
      "La sorpresa: recomendar **lo más popular** acierta más que la factorización, que predecía mejor las notas. No es un error: los socios ven sobre todo lo popular, así que lo que aparece en su prueba también lo es. El RMSE mide notas de películas **ya vistas**; el ranking, **qué se verá**.",
      "",
      "Un **híbrido** suma a la nota predicha β·log(1 + popularidad). β se elige en validación. Mejora la precisión, pero vuelve a concentrarse en lo popular: hay que decidir el equilibrio entre acierto, cobertura y descubrimiento.",
      "",
      "**Arranque en frío:** un socio nuevo no tiene vector p. Con unas pocas notas se resuelve su ridge con las Q ya aprendidas («fold-in»). **Explicación:** «porque te gustó X», la película vista más parecida en el espacio de factores.",
    ],
    formal: "precisión@n = |L ∩ G|/n · exhaustividad@n = |L ∩ G|/|G| · cobertura = |∪ L_u| / nº de películas · híbrido = r̂ + β·log(1 + n_i) · fold-in: p = (QₛᵀQₛ + λI)⁻¹Qₛᵀ(r − μ − b)",
    example: {
      code: py`import numpy as np
puntos = np.array([4.1, 3.2, 4.8, 2.0, 4.5])
vistas = {2}
puntos[list(vistas)] = -np.inf
print(np.argsort(-puntos, kind="stable")[:3])`,
      lines: [
        "NumPy.",
        "Nota predicha de 5 películas para un socio.",
        "Ya vio la película 2.",
        "Lo visto no se recomienda: puntuación −∞.",
        "[4 0 1]: las 3 mejores no vistas, de mayor a menor.",
      ],
    },
    challenge: [
      "1. `matriz_puntuaciones(P, Q, modelo)` (usuarios × películas: μ + b_u + b_i + p_u·q_i), `popularidad(df)` (nº de valoraciones por película, en el orden de `PELICULAS`) y `top_n(puntos, vistos, n=10)` (posiciones de las n mejores no vistas).",
      "2. `evaluar_ranking(puntos, train, test, n=10, umbral=4)`: para cada usuario con alguna nota ≥ umbral en prueba, su lista excluyendo lo visto en train; devuelve las medias de `precision` y `exhaustividad`, la `cobertura` y la `popularidad_media` (popularidad en train de lo recomendado).",
      "3. `hibrido(puntos_mf, conteo, beta)`. Elige `mejor_beta` en {0, 0,5, 1, 2, 5} maximizando la precisión en validación (`validacion_beta`) con un ALS entrenado en `R_sub` y la mejor configuración.",
      "4. `ranking` con las métricas en prueba de `popularidad`, `factorizacion` e `hibrido`. Imprímelas.",
      "5. `usuario_nuevo(notas, modelo, Q, lam, n=10)` (fold-in) y `explicar(pelicula, vistas)`. `nuevo`: recomendaciones para un socio que da un 5 a las 4 primeras películas de ciencia ficción; `generos_nuevo` y `porque` (título recomendado → título visto que lo explica, para las 3 primeras).",
    ],
    starter: py`def matriz_puntuaciones(P, Q, modelo):
    return np.zeros((len(USUARIOS), len(PELICULAS)))


def popularidad(df):
    return np.zeros(len(PELICULAS))


def top_n(puntos, vistos, n=10):
    return []


def evaluar_ranking(puntos, train, test, n=10, umbral=4):
    return {"precision": 0.0, "exhaustividad": 0.0, "cobertura": 0.0, "popularidad_media": 0.0}


def hibrido(puntos_mf, conteo, beta):
    return puntos_mf


validacion_beta = {}
mejor_beta = 0.0
ranking = {}


def usuario_nuevo(notas, modelo, Q, lam, n=10):
    return []


def explicar(pelicula, vistas):
    return vistas[0]


nuevo = []
generos_nuevo = {}
porque = {}`,
    solution: SOL4,
    tests: py`
import numpy as np
import pandas as pd

def test_top_n_y_metricas():
    "Listas sin lo visto y métricas en un ejemplo"
    tn = t.get("top_n", "function")
    assert tn([4.1, 3.2, 4.8, 2.0, 4.5], {2}, 3) == [4, 0, 1]
    pun = np.array([4.1, 3.2, 4.8, 2.0, 4.5])
    tn(pun, {0, 1}, 2)
    assert pun[0] == 4.1, "top_n no debe modificar las puntuaciones que recibe"
    pop = t.get("popularidad", "function")(t.get("train"))
    assert pop.sum() == len(t.get("train")) and len(pop) == 120

def test_evaluar_ranking():
    "Precisión, exhaustividad, cobertura y popularidad"
    ev, tr, te = t.get("evaluar_ranking", "function"), t.get("train", pd.DataFrame), t.get("test", pd.DataFrame)
    perfecto = np.zeros((300, 120))
    gustan = te[te["nota"] >= 4]
    perfecto[gustan["usuario"].map(t.get("fila_de")), gustan["pelicula"].map(t.get("columna_de"))] = 10
    m = ev(perfecto, tr, te, n=1)
    assert m["precision"] == 1.0, "Un oráculo que pone primero lo que gustará acierta siempre"
    r = t.get("ranking", dict)
    assert set(r) == {"popularidad", "factorizacion", "hibrido"}
    assert all(set(v) == {"precision", "exhaustividad", "cobertura", "popularidad_media"} for v in r.values())

def test_conclusiones():
    "Lo popular acierta; la factorización cubre; el híbrido equilibra"
    r = t.get("ranking", dict)
    assert r["popularidad"]["precision"] > r["factorizacion"]["precision"]
    assert r["factorizacion"]["cobertura"] > 1.5 * r["popularidad"]["cobertura"]
    assert r["factorizacion"]["popularidad_media"] < r["popularidad"]["popularidad_media"]
    vb = t.get("validacion_beta", dict)
    assert set(vb) == {0.0, 0.5, 1.0, 2.0, 5.0} and t.get("mejor_beta") == max(vb, key=vb.get)
    assert r["hibrido"]["precision"] > r["popularidad"]["precision"] and r["hibrido"]["cobertura"] > r["popularidad"]["cobertura"]

def test_arranque_en_frio():
    "Un socio nuevo de ciencia ficción"
    nuevo, cf = t.get("nuevo", list), t.get("ciencia_ficcion", list)
    assert len(nuevo) == 10 and not set(nuevo) & set(cf)
    g = t.get("generos_nuevo", dict)
    assert max(g, key=g.get) == "ciencia ficción" and g["ciencia ficción"] >= 5
    titulos = set(t.get("peliculas")[t.get("peliculas")["pelicula"].isin(cf)]["titulo"])
    assert len(t.get("porque", dict)) == 3 and set(t.get("porque").values()) <= titulos
    assert t.get("explicar", "function")(cf[0], cf) != cf[0]
`,
    hints: [
      "top_n: copia con `np.array(puntos, dtype=float)`, pon `-np.inf` en `list(vistos)` y usa `np.argsort(-puntos, kind=\"stable\")[:n]`.",
      "evaluar_ranking: prepara con `groupby(\"usuario\")[\"pelicula\"].agg(lambda s: {columna_de[p] for p in s})` los conjuntos de vistas (train) y de gustadas (test, nota ≥ umbral).",
      "La popularidad como recomendador es `np.tile(conteo.astype(float), (len(USUARIOS), 1))`: la misma puntuación para todos los usuarios.",
    ],
    errors: [
      { error: "Concluir que el mejor RMSE da las mejores recomendaciones", fix: "Son tareas distintas: mide el ranking con métricas de ranking." },
      { error: "Recomendar películas ya vistas", fix: "Excluye lo visto en train antes de ordenar." },
      { error: "Mirar solo la precisión", fix: "Un recomendador que solo propone éxitos acierta, pero nunca descubre nada: mide también la cobertura y la popularidad." },
    ],
    quiz: {
      question: "La factorización tiene mejor RMSE, pero «lo más popular» tiene mejor precisión@10. ¿Qué explica la paradoja?",
      options: [
        { text: "Lo que los socios ven depende mucho de la popularidad, así que la prueba premia lo popular; el RMSE solo mide notas de películas ya vistas, no qué elegirán ver" },
        { text: "La factorización está mal implementada" },
        { text: "La precisión@10 no es una métrica válida para recomendadores" },
        { text: "Las películas populares son objetivamente mejores" },
      ],
      answer: 0,
      explanation: "Los datos observados no son una muestra al azar de todas las parejas socio-película: hay sesgo de selección. Por eso se miden varias métricas y se decide el equilibrio entre acierto y descubrimiento.",
    },
    project: SPEC,
    review: "Repasa: precisión y exhaustividad en n; cobertura; sesgo de popularidad; híbrido elegido en validación; fold-in para usuarios nuevos; explicaciones.",
    xp: 170,
    coins: 26,
  },
];
