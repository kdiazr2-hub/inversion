import { mensajesCsv } from "../datasets";
import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 7: un clasificador de mensajes de clientes, desde la limpieza
// del texto hasta un modelo que sabe cuándo no responder.

const SERIES = { id: "clasificador-texto", title: "Proyecto progresivo: el clasificador de mensajes", of: 4 };
const FILES = { "mensajes.csv": mensajesCsv() };
const PACKAGES = ["numpy", "pandas", "scikit-learn"];

const SPEC: ProjectSpec = {
  requirements: [
    "Normalizar y tokenizar el texto en español (minúsculas, tildes, puntuación, palabras vacías, números).",
    "Construir el vocabulario solo con el entrenamiento y verificar la bolsa de palabras contra scikit-learn.",
    "Implementar Naive Bayes multinomial a mano y comprobar que coincide con MultinomialNB.",
    "Comparar modelos con validación cruzada y F1 macro (las clases están desequilibradas).",
    "Evaluar una sola vez en prueba, explicar el modelo con sus palabras clave y abstenerse cuando no está seguro.",
  ],
  dataset: "mensajes.csv: 900 mensajes ficticios de clientes etiquetados como envío, facturación, producto defectuoso o cuenta, con mensajes vagos, mensajes con dos temas y un 3 % de etiquetas erróneas.",
  stages: ["Limpieza, tokenización y bolsa de palabras", "Naive Bayes a mano", "TF-IDF, regresión logística y desbalance", "Evaluación, palabras clave, abstención y ficha"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Nada se aprende del conjunto de prueba (ni el vocabulario ni el umbral).",
    "Las métricas tienen en cuenta el desbalance (F1 macro, recall por clase).",
    "La ficha explica cuándo el sistema deriva un mensaje a una persona.",
  ],
  extensions: [
    "Bigramas (pares de palabras) y comparación de rendimiento.",
    "Calibración de probabilidades (CalibratedClassifierCV) antes de fijar el umbral.",
    "Comparar con embeddings de frases y un clasificador sobre ellos.",
  ],
  portfolio: "Clasificador de texto en español: normalización, bolsa de palabras verificada, Naive Bayes implementado a mano, TF-IDF con regresión logística, F1 macro con clases desequilibradas, palabras clave interpretables y abstención con umbral elegido sin usar la prueba.",
};

const S1 = py`import re
import unicodedata
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.model_selection import train_test_split

VACIAS = {"el", "la", "los", "las", "un", "una", "de", "del", "y", "a", "en", "que", "me", "mi", "mis", "no", "con",
          "por", "se", "lo", "al", "es", "para", "ha", "han", "hola", "gracias", "saludo", "buenos", "dias", "buenas", "tardes", "favor"}

def normalizar(texto):
    texto = unicodedata.normalize("NFD", texto.lower())
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    texto = re.sub(r"[^a-z0-9ñ ]", " ", texto)
    return re.sub(r"\s+", " ", texto).strip()

def tokenizar(texto):
    return [w for w in normalizar(texto).split() if w not in VACIAS and not w.isdigit()]

def vocabulario(textos, min_df=2):
    df_tokens = {}
    for texto in textos:
        for w in set(tokenizar(texto)):
            df_tokens[w] = df_tokens.get(w, 0) + 1
    return sorted(w for w, n in df_tokens.items() if n >= min_df)

def bolsa(textos, vocab):
    indice = {w: j for j, w in enumerate(vocab)}
    X = np.zeros((len(textos), len(vocab)), dtype=int)
    for i, texto in enumerate(textos):
        for w in tokenizar(texto):
            if w in indice:
                X[i, indice[w]] += 1
    return X

df = pd.read_csv("mensajes.csv")
X_tr, X_te, y_tr, y_te = train_test_split(df["texto"], df["categoria"], test_size=0.25, stratify=df["categoria"], random_state=0)
vocab = vocabulario(X_tr)
ref = CountVectorizer(analyzer=tokenizar, vocabulary=vocab).fit_transform(X_tr).toarray()
coincide_sklearn = bool((bolsa(X_tr, vocab) == ref).all())`;

const S2 = py`from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

def entrenar_nb(X, y, alfa=1.0):
    y = np.asarray(y)
    clases = np.unique(y)
    log_prior = np.log(np.array([np.mean(y == c) for c in clases]))
    conteos = np.array([X[y == c].sum(axis=0) for c in clases]) + alfa
    log_verosimilitud = np.log(conteos / conteos.sum(axis=1, keepdims=True))
    return {"clases": clases, "log_prior": log_prior, "log_verosimilitud": log_verosimilitud}

def log_posterior(modelo, X):
    return X @ modelo["log_verosimilitud"].T + modelo["log_prior"]

def predecir_nb(modelo, X):
    return modelo["clases"][np.argmax(log_posterior(modelo, X), axis=1)]

Xb_tr, Xb_te = bolsa(X_tr, vocab), bolsa(X_te, vocab)
nb = entrenar_nb(Xb_tr, y_tr)
_skl = MultinomialNB(alpha=1.0).fit(Xb_tr, y_tr)
iguales = bool((predecir_nb(nb, Xb_tr) == _skl.predict(Xb_tr)).all() and np.allclose(log_posterior(nb, Xb_tr), _skl.predict_joint_log_proba(Xb_tr)))
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
f1_nb_cv = cross_val_score(make_pipeline(CountVectorizer(analyzer=tokenizar, min_df=2), MultinomialNB()), X_tr, y_tr, cv=skf, scoring="f1_macro").mean()`;

const S3 = py`from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import cross_val_predict

CLASES = ["envio", "facturacion", "defecto", "cuenta"]

modelos = {
    "nb": make_pipeline(CountVectorizer(analyzer=tokenizar, min_df=2), MultinomialNB()),
    "logistica": make_pipeline(TfidfVectorizer(analyzer=tokenizar, min_df=2), LogisticRegression(max_iter=1000)),
    "logistica_balanceada": make_pipeline(TfidfVectorizer(analyzer=tokenizar, min_df=2), LogisticRegression(max_iter=1000, class_weight="balanced")),
}
resultados_cv = {n: cross_val_score(m, X_tr, y_tr, cv=skf, scoring="f1_macro").mean() for n, m in modelos.items()}
mejor_nombre = max(resultados_cv, key=resultados_cv.get)
pred_cv = cross_val_predict(modelos[mejor_nombre], X_tr, y_tr, cv=skf)
matriz = confusion_matrix(y_tr, pred_cv, labels=CLASES)
recall_por_clase = {c: matriz[i, i] / matriz[i].sum() for i, c in enumerate(CLASES)}`;

const S4 = py`from sklearn.metrics import classification_report, f1_score

modelo_final = modelos[mejor_nombre].fit(X_tr, y_tr)
pred_te = modelo_final.predict(X_te)
informe_prueba = classification_report(y_te, pred_te, output_dict=True, zero_division=0)
f1_prueba = f1_score(y_te, pred_te, average="macro")

def palabras_clave(pipe, k=5):
    vectorizador, clf = pipe[0], pipe[-1]
    nombres = vectorizador.get_feature_names_out()
    pesos = clf.coef_ if hasattr(clf, "coef_") else clf.feature_log_prob_
    return {c: list(nombres[np.argsort(pesos[i])[::-1][:k]]) for i, c in enumerate(clf.classes_)}

def con_abstencion(pipe, textos, umbral=0.6):
    proba = pipe.predict_proba(textos)
    etiquetas = pipe.classes_[np.argmax(proba, axis=1)]
    return [e if p >= umbral else "revisar" for e, p in zip(etiquetas, proba.max(axis=1))]

def curva(etiquetas, reales, proba_max, umbrales):
    etiquetas, reales = np.asarray(etiquetas), np.asarray(reales)
    filas = []
    for u in umbrales:
        acepta = proba_max >= u
        filas.append({"umbral": u, "cobertura": acepta.mean(), "exactitud": (etiquetas[acepta] == reales[acepta]).mean() if acepta.any() else float("nan")})
    return filas

UMBRALES = [0.4, 0.5, 0.6, 0.7, 0.8]
_proba_cv = cross_val_predict(modelos[mejor_nombre], X_tr, y_tr, cv=skf, method="predict_proba")
_clases = np.unique(y_tr)
curva_cv = curva(_clases[_proba_cv.argmax(axis=1)], y_tr, _proba_cv.max(axis=1), UMBRALES)
umbral = next(f["umbral"] for f in curva_cv if f["exactitud"] >= 0.95)
_proba_te = modelo_final.predict_proba(X_te)
curva_prueba = curva(modelo_final.classes_[_proba_te.argmax(axis=1)], y_te, _proba_te.max(axis=1), [umbral])[0]
ficha = {
    "modelo": mejor_nombre,
    "f1_cv": resultados_cv[mejor_nombre],
    "f1_prueba": f1_prueba,
    "umbral": umbral,
    "cobertura_prueba": curva_prueba["cobertura"],
    "exactitud_aceptados_prueba": curva_prueba["exactitud"],
    "palabras_clave": palabras_clave(modelo_final),
    "limitaciones": [
        "Mensajes sintéticos generados con plantillas: el lenguaje real es mucho más variado.",
        "Solo español y cuatro categorías; un mensaje con dos temas recibe una sola etiqueta.",
        "Las probabilidades no están calibradas: el umbral se eligió con validación cruzada y debe revisarse con datos reales.",
    ],
}`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

// Independent reference shared by the tests of every stage.
const REF = py`
import re
import unicodedata
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold

_VACIAS = {"el", "la", "los", "las", "un", "una", "de", "del", "y", "a", "en", "que", "me", "mi", "mis", "no", "con",
           "por", "se", "lo", "al", "es", "para", "ha", "han", "hola", "gracias", "saludo", "buenos", "dias", "buenas", "tardes", "favor"}

def _tok(texto):
    t = unicodedata.normalize("NFD", texto.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"\s+", " ", re.sub(r"[^a-z0-9ñ ]", " ", t)).strip()
    return [w for w in t.split() if w not in _VACIAS and not w.isdigit()]

def _split():
    df = pd.read_csv("mensajes.csv")
    return train_test_split(df.texto, df.categoria, test_size=0.25, stratify=df.categoria, random_state=0)

_SKF = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
`;

export const PROJ_TEXTO: Mission[] = [
  {
    id: "pt-texto-1",
    world: "w7",
    zone: "Proyecto de la Fortaleza",
    title: "El clasificador de mensajes · 1: limpieza, tokenización y bolsa de palabras",
    kind: "project",
    difficulty: 3,
    skills: ["nlp", "tokenizacion", "limpieza-texto", "verificacion"],
    requires: ["ai-tokens", "ml-metricas"],
    series: { ...SERIES, stage: 1 },
    story: "La tienda del reino recibe cientos de mensajes al día y cada uno acaba en el departamento equivocado. Te piden un clasificador automático. Antes de cualquier modelo, el texto tiene que convertirse en números.",
    objective: "Normalizar y tokenizar texto en español, construir un vocabulario con el entrenamiento y representar cada mensaje como una bolsa de palabras verificada contra scikit-learn.",
    before: ["Tokenización (ai-tokens)", "Expresiones regulares", "Arrays de NumPy"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "Un modelo no lee: cuenta. La **bolsa de palabras** representa cada mensaje como un vector con cuántas veces aparece cada palabra del vocabulario, sin importar el orden.",
      "",
      "Antes hay que **normalizar**: «ENVÍO», «envio» y «envío!!!» deben ser la misma palabra. Se pasa a minúsculas, se quitan las tildes (descomponiendo con Unicode NFD y eliminando las marcas), se sustituye la puntuación por espacios y se descartan **palabras vacías** (el, de, que…) y números (el número de pedido no dice nada de la categoría).",
      "",
      "El **vocabulario** se construye **solo con el entrenamiento** y se queda con las palabras que aparecen en al menos 2 mensajes: las rarísimas no generalizan. Usar también la prueba sería una fuga de información.",
    ],
    formal: "x_d = (c(w₁, d), …, c(w_V, d)), con c(w, d) el número de veces que la palabra w aparece en el documento d y V el tamaño del vocabulario.",
    example: {
      code: py`import unicodedata
texto = "¡El ENVÍO llegó tarde!"
t = unicodedata.normalize("NFD", texto.lower())
sin_tildes = "".join(c for c in t if unicodedata.category(c) != "Mn")
print(sin_tildes)`,
      lines: [
        "Base de datos Unicode de Python.",
        "Un mensaje con mayúsculas, tildes y signos.",
        "NFD separa cada letra de su tilde (é → e + ´).",
        "Quitamos las marcas diacríticas (categoría «Mn»).",
        "¡el envio llego tarde!: falta quitar la puntuación.",
      ],
    },
    challenge: [
      "El código inicial define las palabras vacías `VACIAS`. Escribe:",
      "1. `normalizar(texto)`: minúsculas, sin tildes, cualquier carácter que no sea a-z, 0-9, ñ o espacio → espacio, y espacios repetidos reducidos a uno (sin espacios al principio ni al final).",
      "2. `tokenizar(texto)`: palabras de `normalizar(texto)` que no estén en `VACIAS` ni sean números.",
      "3. `X_tr, X_te, y_tr, y_te`: `train_test_split` de `texto` y `categoria` con 25 % de prueba, estratificado y `random_state=0`.",
      "4. `vocabulario(textos, min_df=2)`: lista ordenada de palabras que aparecen en al menos `min_df` textos distintos; `vocab = vocabulario(X_tr)`.",
      "5. `bolsa(textos, vocab)`: matriz de NumPy (textos × vocabulario) con los recuentos.",
      "6. `coincide_sklearn`: True si tu bolsa de `X_tr` es igual a `CountVectorizer(analyzer=tokenizar, vocabulary=vocab).fit_transform(X_tr).toarray()`.",
    ],
    starter: py`import re
import unicodedata
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.model_selection import train_test_split

VACIAS = {"el", "la", "los", "las", "un", "una", "de", "del", "y", "a", "en", "que", "me", "mi", "mis", "no", "con",
          "por", "se", "lo", "al", "es", "para", "ha", "han", "hola", "gracias", "saludo", "buenos", "dias", "buenas", "tardes", "favor"}

def normalizar(texto):
    return texto.lower()

def tokenizar(texto):
    return normalizar(texto).split()

def vocabulario(textos, min_df=2):
    return []

def bolsa(textos, vocab):
    return np.zeros((len(textos), len(vocab)))

df = pd.read_csv("mensajes.csv")
X_tr, X_te, y_tr, y_te = df["texto"], df["texto"], df["categoria"], df["categoria"]
vocab = vocabulario(X_tr)
coincide_sklearn = False`,
    solution: SOL1,
    tests: `${REF}
def test_normalizar():
    "Minúsculas, tildes, puntuación y espacios"
    n = t.get("normalizar", "function")
    assert n("¡El ENVÍO   llegó tarde!!!") == "el envio llego tarde"
    assert n("Contraseña: ¿olvidada?") == "contrasena olvidada", "NFD también separa la ñ en n + virgulilla"
    assert n("  e-mail  ") == "e mail"

def test_tokenizar():
    "Sin palabras vacías ni números"
    assert t.get("tokenizar", "function")("Hola. Mi pedido 1234 no ha llegado. Gracias") == ["pedido", "llegado"]

def test_division():
    "Estratificada y con semilla"
    X_tr, X_te, y_tr, y_te = _split()
    assert list(t.get("X_tr").index) == list(X_tr.index) and len(t.get("X_te")) == 225

def test_vocabulario():
    "Frecuencia documental mínima, solo del entrenamiento"
    X_tr, X_te, _, _ = _split()
    cuentas = {}
    for tx in X_tr:
        for w in set(_tok(tx)):
            cuentas[w] = cuentas.get(w, 0) + 1
    ref = sorted(w for w, c in cuentas.items() if c >= 2)
    assert t.get("vocab") == ref
    assert t.get("vocabulario", "function")(["a b", "b c", "b"], min_df=2) == ["b"]

def test_bolsa():
    "Recuentos verificados con CountVectorizer"
    b = t.get("bolsa", "function")(["envío envío roto", "nada que ver"], ["envio", "roto"])
    assert b.tolist() == [[2, 1], [0, 0]]
    assert t.get("coincide_sklearn") is True
`,
    hints: [
      "Tildes: `unicodedata.normalize(\"NFD\", texto.lower())` y quédate con los caracteres cuya `unicodedata.category(c)` no sea \"Mn\". Ojo: NFD también separa la ñ en n + virgulilla, así que «contraseña» queda «contrasena» (es lo que esperan las pruebas).",
      "Puntuación: `re.sub(r\"[^a-z0-9ñ ]\", \" \", texto)` y después `re.sub(r\"\\s+\", \" \", texto).strip()`.",
      "Vocabulario: cuenta en cuántos textos aparece cada palabra usando `set(tokenizar(texto))` para no contar repeticiones dentro del mismo texto.",
    ],
    errors: [
      { error: "Construir el vocabulario con todos los mensajes", fix: "Las palabras que solo aparecen en la prueba no deben influir en el modelo: es una fuga." },
      { error: "Contar frecuencia total en lugar de documental", fix: "Una palabra repetida diez veces en un solo mensaje sigue siendo rara: min_df cuenta mensajes." },
    ],
    quiz: {
      question: "La bolsa de palabras trata igual «el envío no llegó y el producto está bien» que «el producto no llegó y el envío está bien». ¿Por qué se usa entonces?",
      options: [
        { text: "Porque para clasificar por tema basta con saber qué palabras aparecen; el orden importa más en tareas como la traducción o el sentimiento con negaciones" },
        { text: "Porque el orden de las palabras nunca aporta información" },
        { text: "Porque scikit-learn no permite otra representación" },
        { text: "Porque así el modelo entiende el significado de las frases", misconception: "alucinacion" },
      ],
      answer: 0,
      explanation: "La bolsa de palabras pierde el orden y es una simplificación fuerte, pero para decidir el departamento las palabras clave (envío, factura, contraseña…) suelen bastar. Los modelos que necesitan contexto usan n-gramas, embeddings o transformers.",
    },
    project: SPEC,
    review: "Repasa: normalizar (NFD, puntuación, vacías), vocabulario solo con entrenamiento y min_df documental, bolsa de palabras verificada.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pt-texto-2",
    world: "w7",
    zone: "Proyecto de la Fortaleza",
    title: "El clasificador de mensajes · 2: Naive Bayes a mano",
    kind: "project",
    difficulty: 4,
    skills: ["naive-bayes", "probabilidad", "nlp", "verificacion"],
    requires: ["pt-texto-1", "p-bayes"],
    series: { ...SERIES, stage: 2 },
    story: "El primer clasificador del reino es el más antiguo: el teorema de Bayes aplicado a palabras. Vas a programarlo con tus propias manos y a comprobar que piensa exactamente igual que el de scikit-learn.",
    objective: "Implementar Naive Bayes multinomial con suavizado de Laplace en el espacio logarítmico, verificarlo contra MultinomialNB y medir su F1 macro con validación cruzada.",
    before: ["Etapa 1", "Teorema de Bayes (p-bayes)", "Logaritmos"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "Bayes: P(clase | palabras) ∝ P(clase) · P(palabras | clase). Naive Bayes supone (ingenuamente) que las palabras son independientes dada la clase, así que P(palabras | clase) es un producto de probabilidades de cada palabra.",
      "",
      "- **Prior**: proporción de mensajes de cada clase.",
      "- **Verosimilitud** de la palabra w en la clase c: (recuento de w en c + α) / (total de palabras de c + α·V). El **suavizado de Laplace** (α = 1) evita que una palabra nunca vista en una clase la haga imposible.",
      "- Se trabaja con **logaritmos**: el producto de cientos de probabilidades pequeñas se redondearía a 0; la suma de logaritmos no.",
      "",
      "Con la matriz X (mensajes × palabras), la log-posterior (sin normalizar) de todas las clases es X @ log_verosimilitudᵀ + log_prior: una multiplicación de matrices.",
    ],
    formal: "log P(c | d) = log P(c) + Σ_w x_{d,w}·log θ_{c,w} + const, θ_{c,w} = (N_{c,w} + α)/(N_c + αV)",
    example: {
      code: py`import numpy as np
X = np.array([[2, 0], [1, 0], [0, 3]])
y = np.array(["envio", "envio", "cuenta"])
conteos = np.array([X[y == c].sum(axis=0) for c in ["cuenta", "envio"]]) + 1
print(conteos)
print(np.log(conteos / conteos.sum(axis=1, keepdims=True)).round(3))`,
      lines: [
        "NumPy.",
        "Tres mensajes y dos palabras (por ejemplo «paquete» y «clave»).",
        "Sus clases.",
        "Recuento de cada palabra por clase, más 1 (Laplace).",
        "[[1 4] [4 1]]: «cuenta» nunca usó la palabra 1, pero no queda en 0.",
        "Log-probabilidades de cada palabra en cada clase (cada fila suma 1 en escala normal).",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `entrenar_nb(X, y, alfa=1.0)`: diccionario con `clases` (`np.unique(y)`), `log_prior` y `log_verosimilitud` (clases × vocabulario).",
      "2. `log_posterior(modelo, X)` y `predecir_nb(modelo, X)`.",
      "3. `Xb_tr`, `Xb_te` (bolsas con tu vocabulario), `nb = entrenar_nb(Xb_tr, y_tr)` e `iguales`: True si tus predicciones en entrenamiento coinciden con `MultinomialNB(alpha=1.0)` y tu log-posterior con su `predict_joint_log_proba`.",
      "4. `skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)` y `f1_nb_cv`: F1 macro medio de validación cruzada de `make_pipeline(CountVectorizer(analyzer=tokenizar, min_df=2), MultinomialNB())` en el entrenamiento.",
    ],
    starter: py`from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

def entrenar_nb(X, y, alfa=1.0):
    return {}

def log_posterior(modelo, X):
    return None

def predecir_nb(modelo, X):
    return None

Xb_tr, Xb_te = None, None
nb = None
iguales = False
skf = None
f1_nb_cv = 0`,
    solution: SOL2,
    tests: `${REF}
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.model_selection import cross_val_score
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

def test_nb_en_datos_nuevos():
    "Igual que MultinomialNB con otros datos y otro alfa"
    rng = np.random.default_rng(0)
    X = rng.poisson(1.0, size=(60, 12))
    y = rng.choice(["a", "b", "c"], size=60)
    f = t.get("entrenar_nb", "function")
    for alfa in (1.0, 0.3):
        m = f(X, y, alfa)
        ref = MultinomialNB(alpha=alfa).fit(X, y)
        assert np.allclose(m["log_prior"], ref.class_log_prior_) and np.allclose(m["log_verosimilitud"], ref.feature_log_prob_)
        assert np.allclose(t.get("log_posterior", "function")(m, X), ref.predict_joint_log_proba(X))
        assert (t.get("predecir_nb", "function")(m, X) == ref.predict(X)).all()

def test_verificacion():
    "Verificado en los mensajes"
    assert t.get("iguales") is True and t.get("Xb_te").shape[1] == len(t.get("vocab"))

def test_f1_cv():
    "Validación cruzada en el entrenamiento"
    X_tr, _, y_tr, _ = _split()
    ref = cross_val_score(make_pipeline(CountVectorizer(analyzer=_tok, min_df=2), MultinomialNB()), X_tr, y_tr, cv=_SKF, scoring="f1_macro").mean()
    assert approx(t.get("f1_nb_cv"), ref, 1e-9) and 0.75 < ref < 0.95
`,
    hints: [
      "Prior: `np.log([np.mean(y == c) for c in clases])`. Recuentos: `X[y == c].sum(axis=0)` para cada clase, más `alfa`.",
      "Verosimilitud: divide cada fila de recuentos por su suma (`keepdims=True`) y toma el logaritmo.",
      "Predicción: `clases[np.argmax(log_posterior(modelo, X), axis=1)]`.",
    ],
    errors: [
      { error: "Multiplicar probabilidades en lugar de sumar logaritmos", fix: "Con mensajes largos el producto se redondea a 0 y todas las clases empatan." },
      { error: "Olvidar el suavizado", fix: "Una sola palabra no vista en una clase pondría su probabilidad a 0 sin importar el resto del mensaje." },
    ],
    quiz: {
      question: "Naive Bayes supone que las palabras son independientes dada la clase, lo que es falso («cuenta» y «bancaria» van juntas). ¿Qué consecuencia tiene?",
      options: [
        { text: "Sus probabilidades suelen ser exageradas (demasiado cercanas a 0 o 1), aunque la clase elegida a menudo es correcta" },
        { text: "El modelo deja de funcionar por completo" },
        { text: "Sus predicciones son siempre peores que el azar" },
        { text: "Ninguna: la suposición es correcta para el lenguaje" },
      ],
      answer: 0,
      explanation: "Al contar como independientes palabras que van juntas, la evidencia se cuenta varias veces y las probabilidades se vuelven extremas. Para clasificar basta con que el orden de las clases sea bueno; para decidir con umbrales conviene un modelo mejor calibrado.",
    },
    project: SPEC,
    review: "Repasa: P(c|d) ∝ P(c)·Π θ_{c,w}^{x_w}; Laplace; logaritmos; verificar contra MultinomialNB.",
    xp: 130,
    coins: 20,
  },
  {
    id: "pt-texto-3",
    world: "w7",
    zone: "Proyecto de la Fortaleza",
    title: "El clasificador de mensajes · 3: TF-IDF, regresión logística y desbalance",
    kind: "project",
    difficulty: 4,
    skills: ["nlp", "tf-idf", "clasificacion", "desbalance", "validacion-cruzada"],
    requires: ["pt-texto-2"],
    series: { ...SERIES, stage: 3 },
    story: "Naive Bayes funciona, pero el reino quiere saber si un modelo discriminativo lo hace mejor, y si las cuentas bloqueadas (la clase más pequeña) se están quedando sin atender.",
    objective: "Comparar Naive Bayes con regresión logística sobre TF-IDF, con y sin pesos de clase, mediante validación cruzada con F1 macro, y analizar la matriz de confusión y el recall por clase.",
    before: ["Etapas 1 y 2", "Regresión logística", "Precisión, recall y F1 (ml-metricas)"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "**TF-IDF** pondera cada palabra por su frecuencia en el mensaje (TF) y por lo rara que es en el corpus (IDF): «pedido» aparece en todas las clases y pesa poco; «contraseña» es muy específica y pesa mucho.",
      "",
      "La **regresión logística** aprende un peso por palabra y clase sin suponer independencia: suele ganar a Naive Bayes cuando hay suficientes datos.",
      "",
      "Las clases están **desequilibradas** (cuenta es el 15 %). La exactitud favorece a la clase mayoritaria; el **F1 macro** promedia el F1 de cada clase, así que una clase pequeña mal atendida baja la nota. `class_weight=\"balanced\"` da más peso a los errores en clases pequeñas.",
      "",
      "La **matriz de confusión** con predicciones de validación cruzada (`cross_val_predict`) muestra **qué** se confunde con qué, sin tocar la prueba.",
    ],
    formal: "tfidf(w, d) = tf(w, d)·log((1 + N)/(1 + df(w))) + 1 (normalizado por documento) · F1 macro = (1/K) Σₖ F1ₖ",
    example: {
      code: py`from sklearn.feature_extraction.text import TfidfVectorizer
docs = ["pedido roto", "pedido tarde", "contraseña olvidada"]
v = TfidfVectorizer().fit(docs)
print(dict(zip(v.get_feature_names_out(), v.idf_.round(2))))`,
      lines: [
        "Vectorizador TF-IDF de scikit-learn.",
        "Tres mensajes mínimos.",
        "Aprende el vocabulario y la IDF.",
        "«pedido» (en 2 de 3 documentos) tiene IDF 1,29; las palabras únicas, 1,69.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `CLASES = [\"envio\", \"facturacion\", \"defecto\", \"cuenta\"]` y `modelos`: diccionario con `\"nb\"` (CountVectorizer + MultinomialNB), `\"logistica\"` (`TfidfVectorizer(analyzer=tokenizar, min_df=2)` + `LogisticRegression(max_iter=1000)`) y `\"logistica_balanceada\"` (igual con `class_weight=\"balanced\"`).",
      "2. `resultados_cv`: F1 macro medio de validación cruzada (`skf`) de cada modelo en el entrenamiento, y `mejor_nombre` (el de mayor valor).",
      "3. `pred_cv`: `cross_val_predict` del mejor modelo, `matriz`: `confusion_matrix(y_tr, pred_cv, labels=CLASES)` y `recall_por_clase`: diccionario clase → recall.",
    ],
    starter: py`from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import cross_val_predict

CLASES = ["envio", "facturacion", "defecto", "cuenta"]
modelos = {}
resultados_cv = {}
mejor_nombre = None
pred_cv = None
matriz = None
recall_por_clase = {}`,
    solution: SOL3,
    tests: `${REF}
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import cross_val_predict, cross_val_score
from sklearn.pipeline import make_pipeline

def test_modelos():
    "Tres modelos comparables"
    m = t.get("modelos")
    assert set(m) == {"nb", "logistica", "logistica_balanceada"}
    assert m["logistica_balanceada"][-1].class_weight == "balanced" and m["logistica"][-1].class_weight is None
    assert m["logistica"][0].__class__.__name__ == "TfidfVectorizer"

def test_validacion_cruzada():
    "F1 macro con los mismos pliegues"
    X_tr, _, y_tr, _ = _split()
    r = t.get("resultados_cv")
    ref = cross_val_score(make_pipeline(TfidfVectorizer(analyzer=_tok, min_df=2), LogisticRegression(max_iter=1000)), X_tr, y_tr, cv=_SKF, scoring="f1_macro").mean()
    assert approx(r["logistica"], ref, 1e-6)
    assert t.get("mejor_nombre") == max(r, key=r.get)
    assert max(r["logistica"], r["logistica_balanceada"]) > r["nb"]

def test_confusion():
    "Matriz y recall por clase sin tocar la prueba"
    X_tr, _, y_tr, _ = _split()
    m = t.get("matriz")
    assert m.shape == (4, 4) and m.sum() == len(X_tr)
    ref = confusion_matrix(y_tr, cross_val_predict(t.get("modelos")[t.get("mejor_nombre")], X_tr, y_tr, cv=_SKF), labels=["envio", "facturacion", "defecto", "cuenta"])
    assert (m == ref).all()
    rc = t.get("recall_por_clase")
    assert approx(rc["cuenta"], m[3, 3] / m[3].sum()) and set(rc) == {"envio", "facturacion", "defecto", "cuenta"}
`,
    hints: [
      "Construye cada pipeline con `make_pipeline(vectorizador, clasificador)`; reutiliza tu `tokenizar` como `analyzer`.",
      "`max(resultados_cv, key=resultados_cv.get)` devuelve la clave con mayor valor.",
      "Recall de la clase i: `matriz[i, i] / matriz[i].sum()` (fila = clase real).",
    ],
    errors: [
      { error: "Evaluar con exactitud", fix: "Con clases desequilibradas, un modelo que ignore «cuenta» puede tener buena exactitud. Usa F1 macro y mira el recall por clase." },
      { error: "Ajustar el vectorizador fuera del pipeline", fix: "El IDF y el vocabulario se aprenderían con los datos de validación de cada pliegue: fuga." },
    ],
    quiz: {
      question: "El modelo balanceado sube el recall de «cuenta» pero baja algo la precisión de esa clase. ¿Qué está pasando?",
      options: [
        { text: "Al dar más peso a la clase pequeña, el modelo la predice más a menudo: detecta más casos reales pero también se equivoca más asignándola" },
        { text: "Es un error de scikit-learn: el balanceo debería mejorar todas las métricas" },
        { text: "Que la clase «cuenta» tiene etiquetas erróneas" },
        { text: "Que el modelo ha sobreajustado la clase grande", misconception: "sobreajuste" },
      ],
      answer: 0,
      explanation: "El balanceo desplaza la frontera hacia las clases pequeñas: es un compromiso entre recall y precisión. Cuál conviene depende del coste de cada error (¿es peor no atender una cuenta bloqueada o derivar un mensaje de más?).",
    },
    project: SPEC,
    review: "Repasa: TF-IDF; logística frente a NB; F1 macro y recall por clase; class_weight; cross_val_predict para la matriz de confusión.",
    xp: 130,
    coins: 20,
  },
  {
    id: "pt-texto-4",
    world: "w7",
    zone: "Proyecto de la Fortaleza",
    title: "El clasificador de mensajes · 4: evaluación, palabras clave, abstención y ficha",
    kind: "project",
    difficulty: 5,
    skills: ["evaluacion", "interpretabilidad", "abstencion", "uso-responsable"],
    requires: ["pt-texto-3", "ai-seguridad"],
    series: { ...SERIES, stage: 4 },
    story: "El clasificador va a enrutar mensajes reales. El responsable de atención al cliente pone dos condiciones: que se pueda ver en qué se fija, y que cuando dude no se invente una categoría, sino que pase el mensaje a una persona.",
    objective: "Evaluar una única vez en prueba, extraer las palabras clave de cada clase, implementar la abstención con un umbral elegido en validación cruzada y documentar el sistema en una ficha.",
    before: ["Etapas 1 a 3", "Probabilidades de clasificación", "Alucinaciones y uso responsable (ai-seguridad)"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "**Interpretabilidad**: en un modelo lineal sobre palabras, los coeficientes más altos de cada clase son sus palabras clave. Si aparecen palabras sin sentido para la clase, hay un problema en los datos.",
      "",
      "**Abstención**: si la probabilidad máxima es baja, el sistema responde «revisar» y una persona decide. Se gana exactitud en lo que se acepta a costa de **cobertura** (cuántos mensajes se clasifican solos).",
      "",
      "El umbral es una decisión: elegirlo mirando la prueba sería fuga. Se elige con probabilidades de validación cruzada en el entrenamiento (aquí: el menor umbral con exactitud ≥ 95 % entre los aceptados) y luego se informa cómo se comporta en prueba, que puede ser algo peor: por eso se mide.",
      "",
      "Igual que un asistente de IA que dice «no lo sé» en lugar de inventar, un clasificador que se abstiene es más útil y más honesto.",
    ],
    formal: "Aceptar si maxₖ P(k | d) ≥ u. Cobertura(u) = P(aceptar); exactitud(u) = P(acierto | aceptar).",
    example: {
      code: py`import numpy as np
proba = np.array([[0.9, 0.1], [0.55, 0.45], [0.2, 0.8]])
clases = np.array(["envio", "cuenta"])
etiquetas = clases[proba.argmax(axis=1)]
print([e if p >= 0.6 else "revisar" for e, p in zip(etiquetas, proba.max(axis=1))])`,
      lines: [
        "NumPy.",
        "Probabilidades de tres mensajes para dos clases.",
        "Nombres de las clases.",
        "La clase más probable de cada mensaje.",
        "['envio', 'revisar', 'cuenta']: el segundo es demasiado dudoso.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `modelo_final`: el mejor modelo entrenado con todo el entrenamiento; `pred_te`, `informe_prueba` (`classification_report(..., output_dict=True, zero_division=0)`) y `f1_prueba` (F1 macro).",
      "2. `palabras_clave(pipe, k=5)`: diccionario clase → las k palabras con mayor peso (`coef_` si existe, si no `feature_log_prob_`).",
      "3. `con_abstencion(pipe, textos, umbral=0.6)`: lista de etiquetas o \"revisar\".",
      "4. `curva(etiquetas, reales, proba_max, umbrales)`: lista de diccionarios con `umbral`, `cobertura` y `exactitud` (de los aceptados).",
      "5. `UMBRALES = [0.4, 0.5, 0.6, 0.7, 0.8]`, `curva_cv` (con `cross_val_predict(..., method=\"predict_proba\")` en el entrenamiento), `umbral`: el primero con exactitud ≥ 0,95, y `curva_prueba`: la fila de ese umbral en prueba.",
      "6. `ficha` con `modelo`, `f1_cv`, `f1_prueba`, `umbral`, `cobertura_prueba`, `exactitud_aceptados_prueba`, `palabras_clave` y `limitaciones` (al menos 3).",
    ],
    starter: py`from sklearn.metrics import classification_report, f1_score

modelo_final = None
pred_te = None
informe_prueba = {}
f1_prueba = 0

def palabras_clave(pipe, k=5):
    return {}

def con_abstencion(pipe, textos, umbral=0.6):
    return list(pipe.predict(textos))

def curva(etiquetas, reales, proba_max, umbrales):
    return []

UMBRALES = [0.4, 0.5, 0.6, 0.7, 0.8]
curva_cv = []
umbral = 0.5
curva_prueba = {}
ficha = {}`,
    solution: SOL4,
    tests: `${REF}
from sklearn.metrics import f1_score
from sklearn.model_selection import cross_val_predict

def test_evaluacion():
    "Una evaluación en prueba"
    _, X_te, _, y_te = _split()
    m = t.get("modelo_final")
    assert m is t.get("modelos")[t.get("mejor_nombre")]
    assert (t.get("pred_te") == m.predict(X_te)).all()
    assert approx(t.get("f1_prueba"), f1_score(y_te, m.predict(X_te), average="macro"))
    assert approx(t.get("informe_prueba")["macro avg"]["f1-score"], t.get("f1_prueba"))

def test_palabras_clave():
    "Palabras clave con sentido"
    pk = t.get("palabras_clave", "function")(t.get("modelo_final"), 8)
    assert set(pk) == {"envio", "facturacion", "defecto", "cuenta"} and all(len(v) == 8 for v in pk.values())
    assert any(w in pk["cuenta"] for w in ("cuenta", "contrasena", "contraseña", "sesion", "correo", "clave", "perfil", "usuario"))
    assert any(w in pk["defecto"] for w in ("roto", "defectuoso", "danado", "dañado", "rotas", "grieta", "piezas", "producto", "estropeado"))

def test_abstencion():
    "Etiqueta o revisar"
    m = t.get("modelo_final")
    _, X_te, _, _ = _split()
    r = t.get("con_abstencion", "function")(m, X_te, 0.6)
    p = m.predict_proba(X_te).max(axis=1)
    assert len(r) == len(X_te) and sum(x == "revisar" for x in r) == int((p < 0.6).sum())
    assert all(x == "revisar" for x in t.get("con_abstencion", "function")(m, X_te[:5], 1.01))

def test_curva_y_umbral():
    "Umbral elegido sin mirar la prueba"
    X_tr, X_te, y_tr, y_te = _split()
    m = t.get("modelos")[t.get("mejor_nombre")]
    proba = cross_val_predict(m, X_tr, y_tr, cv=_SKF, method="predict_proba")
    clases = np.unique(y_tr)
    et, pm = clases[proba.argmax(axis=1)], proba.max(axis=1)
    cv = t.get("curva_cv")
    assert [f["umbral"] for f in cv] == [0.4, 0.5, 0.6, 0.7, 0.8]
    for f in cv:
        acepta = pm >= f["umbral"]
        assert approx(f["cobertura"], acepta.mean()) and approx(f["exactitud"], (et[acepta] == y_tr.to_numpy()[acepta]).mean())
    u = t.get("umbral")
    assert u == next(f["umbral"] for f in cv if f["exactitud"] >= 0.95)
    assert cv[0]["cobertura"] >= cv[-1]["cobertura"]

def test_ficha():
    "Ficha con cifras calculadas"
    f = t.get("ficha", dict)
    assert f["modelo"] == t.get("mejor_nombre") and approx(f["f1_prueba"], t.get("f1_prueba"))
    assert approx(f["cobertura_prueba"], t.get("curva_prueba")["cobertura"]) and f["umbral"] == t.get("umbral")
    assert 0.5 < f["cobertura_prueba"] < 1 and f["exactitud_aceptados_prueba"] > t.get("informe_prueba")["accuracy"]
    assert len(f["limitaciones"]) >= 3
`,
    hints: [
      "Palabras clave: `pipe[0].get_feature_names_out()` da los nombres; para cada clase i, `np.argsort(pesos[i])[::-1][:k]` son los índices de mayor peso.",
      "Abstención: `proba = pipe.predict_proba(textos)`; la etiqueta es `pipe.classes_[proba.argmax(axis=1)]` y la confianza `proba.max(axis=1)`.",
      "Umbral: `next(f[\"umbral\"] for f in curva_cv if f[\"exactitud\"] >= 0.95)`.",
    ],
    errors: [
      { error: "Elegir el umbral con la curva de prueba", fix: "El resultado en prueba dejaría de ser una estimación honesta: elige con validación cruzada." },
      { error: "Confundir probabilidad con certeza", fix: "Las probabilidades de un clasificador no calibrado pueden ser demasiado altas o bajas: por eso el umbral se valida empíricamente." },
    ],
    quiz: {
      question: "Con umbral 0,6 el sistema clasifica solo el 80 % de los mensajes, pero acierta más en ellos. ¿Es un buen diseño?",
      options: [
        { text: "Sí, si derivar el 20 % dudoso a una persona cuesta menos que los errores evitados: es una decisión de negocio, no solo estadística" },
        { text: "No: un buen modelo debe clasificar siempre todos los mensajes" },
        { text: "No: abstenerse es lo mismo que equivocarse", misconception: "alucinacion" },
        { text: "Sí: la exactitud en los aceptados es la exactitud del sistema completo" },
      ],
      answer: 0,
      explanation: "La abstención intercambia cobertura por fiabilidad. La exactitud entre los aceptados no es la del sistema completo (los mensajes derivados también hay que atenderlos). Como en un asistente de IA, decir «no estoy seguro» es preferible a inventar.",
    },
    project: SPEC,
    review: "Repasa: una evaluación en prueba; palabras clave = coeficientes; abstención con umbral elegido en validación cruzada; cobertura frente a exactitud.",
    xp: 160,
    coins: 25,
  },
];
