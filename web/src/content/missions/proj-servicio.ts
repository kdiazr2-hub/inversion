import { clientesCsv } from "../datasets";
import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto final del Mundo 8: un servicio de predicción completo. Se construye y se prueba en el
// navegador (sin servidor real) y produce los artefactos para desplegarlo con FastAPI y Docker.

const SERIES = { id: "servicio-prediccion", title: "Proyecto progresivo: el servicio de la torre", of: 4 };
const FILES = { "clientes.csv": clientesCsv() };
const PACKAGES = ["numpy", "pandas", "scikit-learn", "pydantic"];

const SPEC: ProjectSpec = {
  requirements: [
    "Entrenar un modelo reproducible y guardarlo con sus metadatos (versión por huella SHA-256, métrica y variables).",
    "Definir el contrato de entrada y salida con Pydantic, rechazando campos desconocidos.",
    "Construir el servicio con rutas de salud, información del modelo, predicción individual y por lotes, configuración desde el entorno y registro estructurado.",
    "Comprobar el servicio con pruebas de humo y generar los artefactos de despliegue: app FastAPI, requirements.txt con versiones fijadas y Dockerfile.",
    "Vigilar el servicio: latencia, errores y deriva de los datos de entrada.",
  ],
  dataset: "clientes.csv: 1200 clientes ficticios de una compañía de telecomunicaciones con contrato, antigüedad, cuota, llamadas a soporte, fibra y baja.",
  stages: ["Modelo reproducible y metadatos", "Contrato de la API con Pydantic", "El servicio: rutas, lotes, configuración y registro", "Pruebas de humo, despliegue y vigilancia"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "El servicio nunca muestra detalles internos en los errores y registra cada petición.",
    "Los artefactos de despliegue son coherentes con el código y con las versiones usadas.",
    "La vigilancia detecta una deriva simulada en los datos de entrada.",
  ],
  extensions: [
    "Ejecutar localmente la app FastAPI generada (uvicorn app:app) y probarla con TestClient o con curl.",
    "Construir la imagen Docker y añadir un flujo de integración continua que ejecute las pruebas de humo.",
    "Añadir autenticación por clave de API leída de una variable de entorno (nunca escrita en el código).",
  ],
  portfolio: "Servicio de predicción de bajas listo para desplegar: modelo versionado, contrato con Pydantic, API con lotes, configuración por entorno, registro estructurado, pruebas de humo, Dockerfile y vigilancia de deriva.",
};

const S1 = py`import hashlib
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

NUMERICAS = ["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]
CATEGORICAS = ["contrato"]

def entrenar(df, semilla=0):
    X, y = df[NUMERICAS + CATEGORICAS], df["baja"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=semilla)
    pre = ColumnTransformer([("num", StandardScaler(), NUMERICAS), ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAS)])
    modelo = make_pipeline(pre, LogisticRegression(max_iter=1000)).fit(X_tr, y_tr)
    auc = roc_auc_score(y_te, modelo.predict_proba(X_te)[:, 1])
    return modelo, {"auc_prueba": float(auc), "n_entrenamiento": int(len(X_tr)), "variables": NUMERICAS + CATEGORICAS}

def guardar(modelo, metricas, ruta_modelo="modelo.joblib", ruta_meta="modelo.json"):
    joblib.dump(modelo, ruta_modelo)
    with open(ruta_modelo, "rb") as fh:
        version = hashlib.sha256(fh.read()).hexdigest()[:12]
    meta = {"version": version, **metricas}
    with open(ruta_meta, "w", encoding="utf-8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
    return meta

def cargar(ruta_modelo="modelo.joblib", ruta_meta="modelo.json"):
    with open(ruta_meta, encoding="utf-8") as fh:
        meta = json.load(fh)
    return joblib.load(ruta_modelo), meta

df = pd.read_csv("clientes.csv")
modelo, metricas = entrenar(df)
meta = guardar(modelo, metricas)`;

const S2 = py`from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, ValidationError

class Cliente(BaseModel):
    model_config = ConfigDict(extra="forbid")
    antiguedad_meses: int = Field(ge=0, le=600)
    cuota_mensual: float = Field(gt=0, le=1000)
    llamadas_soporte: int = Field(ge=0, le=100)
    fibra: bool
    contrato: Literal["mensual", "anual", "bianual"]

class Prediccion(BaseModel):
    probabilidad: float = Field(ge=0, le=1)
    riesgo: Literal["bajo", "medio", "alto"]
    version: str

def nivel(p, cortes=(0.3, 0.6)):
    return "bajo" if p < cortes[0] else "medio" if p < cortes[1] else "alto"

def a_tabla(clientes):
    tabla = pd.DataFrame([c.model_dump() for c in clientes])[NUMERICAS + CATEGORICAS]
    tabla["fibra"] = tabla["fibra"].astype(int)
    return tabla

def predecir(modelo, meta, datos):
    cliente = Cliente.model_validate(datos)
    p = float(modelo.predict_proba(a_tabla([cliente]))[0, 1])
    return Prediccion(probabilidad=round(p, 4), riesgo=nivel(p), version=meta["version"])`;

const S3 = py`import io
import logging
import time

def config_desde_entorno(env):
    return {"max_lote": int(env.get("MAX_LOTE", "100")), "nivel_log": env.get("NIVEL_LOG", "INFO").upper()}

class Servicio:
    def __init__(self, modelo, meta, config, registro=None):
        self.modelo, self.meta, self.config = modelo, meta, config
        self.registro = registro if registro is not None else io.StringIO()
        self.log = logging.getLogger(f"servicio-{id(self)}")
        self.log.handlers.clear()
        manejador = logging.StreamHandler(self.registro)
        manejador.setFormatter(logging.Formatter("%(message)s"))
        self.log.addHandler(manejador)
        self.log.setLevel(config["nivel_log"])
        self.log.propagate = False
        self.peticiones = []
        self.entradas = []
        self.rutas = {
            ("GET", "/salud"): self.salud,
            ("GET", "/modelo"): self.info_modelo,
            ("POST", "/prediccion"): self.prediccion,
            ("POST", "/lote"): self.lote,
        }

    def manejar(self, metodo, ruta, cuerpo=None):
        inicio = time.perf_counter()
        codigo, respuesta = self._despachar(metodo.upper(), ruta, cuerpo)
        ms = (time.perf_counter() - inicio) * 1000
        self.peticiones.append({"metodo": metodo.upper(), "ruta": ruta, "codigo": codigo, "ms": ms})
        self.log.info(json.dumps({"metodo": metodo.upper(), "ruta": ruta, "codigo": codigo, "ms": round(ms, 2)}))
        return codigo, respuesta

    def _despachar(self, metodo, ruta, cuerpo):
        if (metodo, ruta) not in self.rutas:
            if any(r == ruta for _, r in self.rutas):
                return 405, {"error": "método no permitido"}
            return 404, {"error": "no encontrado"}
        try:
            return self.rutas[(metodo, ruta)](cuerpo)
        except ValidationError as e:
            return 422, {"error": "validacion", "campos": sorted({str(err["loc"][0]) for err in e.errors() if err["loc"]})}
        except Exception as e:
            self.log.error(json.dumps({"error": type(e).__name__, "ruta": ruta}))
            return 500, {"error": "error interno"}

    def salud(self, _):
        return 200, {"estado": "ok", "version": self.meta["version"]}

    def info_modelo(self, _):
        return 200, {k: self.meta[k] for k in ("version", "auc_prueba", "variables")}

    def prediccion(self, cuerpo):
        resultado = predecir(self.modelo, self.meta, cuerpo)
        self.entradas.append(Cliente.model_validate(cuerpo).model_dump())
        return 200, resultado.model_dump()

    def lote(self, cuerpo):
        if not isinstance(cuerpo, list):
            return 422, {"error": "validacion", "campos": ["lote"]}
        if len(cuerpo) > self.config["max_lote"]:
            return 413, {"error": "lote demasiado grande", "maximo": self.config["max_lote"]}
        clientes, invalidos = [], []
        for i, datos in enumerate(cuerpo):
            try:
                clientes.append(Cliente.model_validate(datos))
            except ValidationError:
                invalidos.append(i)
        if invalidos:
            return 422, {"error": "validacion", "indices": invalidos}
        if not clientes:
            return 200, {"resultados": []}
        probs = self.modelo.predict_proba(a_tabla(clientes))[:, 1]
        self.entradas.extend(c.model_dump() for c in clientes)
        return 200, {"resultados": [Prediccion(probabilidad=round(float(p), 4), riesgo=nivel(p), version=self.meta["version"]).model_dump() for p in probs]}

servicio = Servicio(*cargar(), config_desde_entorno({"MAX_LOTE": "50"}))`;

const S4 = py`import sys
import sklearn

def pruebas_humo(servicio):
    valido = {"antiguedad_meses": 3, "cuota_mensual": 80.0, "llamadas_soporte": 4, "fibra": True, "contrato": "mensual"}
    casos = [
        ("salud", "GET", "/salud", None, 200),
        ("modelo", "GET", "/modelo", None, 200),
        ("prediccion valida", "POST", "/prediccion", valido, 200),
        ("prediccion invalida", "POST", "/prediccion", dict(valido, contrato="semanal"), 422),
        ("campo desconocido", "POST", "/prediccion", dict(valido, es_admin=True), 422),
        ("lote", "POST", "/lote", [valido, valido], 200),
        ("lote demasiado grande", "POST", "/lote", [valido] * (servicio.config["max_lote"] + 1), 413),
        ("ruta inexistente", "GET", "/nada", None, 404),
    ]
    return [{"nombre": n, "ok": servicio.manejar(m, r, c)[0] == esperado} for n, m, r, c, esperado in casos]

def requirements_txt():
    import pydantic
    fijadas = {"numpy": np.__version__, "pandas": pd.__version__, "scikit-learn": sklearn.__version__, "joblib": joblib.__version__, "pydantic": pydantic.VERSION}
    lineas = [f"{nombre}=={version}" for nombre, version in fijadas.items()]
    return "\n".join(lineas + ["fastapi>=0.110", "uvicorn>=0.29"]) + "\n"

def dockerfile():
    v = sys.version_info
    return "\n".join([
        f"FROM python:{v.major}.{v.minor}-slim",
        "WORKDIR /app",
        "COPY requirements.txt .",
        "RUN pip install --no-cache-dir -r requirements.txt",
        "COPY app.py modelo.joblib modelo.json ./",
        "RUN useradd --create-home servicio",
        "USER servicio",
        "EXPOSE 8000",
        'HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen(\'http://localhost:8000/salud\')"',
        'CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]',
    ]) + "\n"

APP_FASTAPI = '''import json
import os
from typing import List, Literal

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

NUMERICAS = ["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]
CATEGORICAS = ["contrato"]
MAX_LOTE = int(os.environ.get("MAX_LOTE", "100"))
modelo = joblib.load("modelo.joblib")
with open("modelo.json", encoding="utf-8") as fh:
    meta = json.load(fh)

class Cliente(BaseModel):
    model_config = ConfigDict(extra="forbid")
    antiguedad_meses: int = Field(ge=0, le=600)
    cuota_mensual: float = Field(gt=0, le=1000)
    llamadas_soporte: int = Field(ge=0, le=100)
    fibra: bool
    contrato: Literal["mensual", "anual", "bianual"]

class Prediccion(BaseModel):
    probabilidad: float
    riesgo: Literal["bajo", "medio", "alto"]
    version: str

def nivel(p):
    return "bajo" if p < 0.3 else "medio" if p < 0.6 else "alto"

def predecir_tabla(clientes):
    tabla = pd.DataFrame([c.model_dump() for c in clientes])[NUMERICAS + CATEGORICAS]
    tabla["fibra"] = tabla["fibra"].astype(int)
    probs = modelo.predict_proba(tabla)[:, 1]
    return [Prediccion(probabilidad=round(float(p), 4), riesgo=nivel(p), version=meta["version"]) for p in probs]

app = FastAPI(title="Servicio de predicción de bajas")

@app.get("/salud")
def salud():
    return {"estado": "ok", "version": meta["version"]}

@app.get("/modelo")
def info_modelo():
    return {k: meta[k] for k in ("version", "auc_prueba", "variables")}

@app.post("/prediccion", response_model=Prediccion)
def prediccion(cliente: Cliente):
    return predecir_tabla([cliente])[0]

@app.post("/lote", response_model=List[Prediccion])
def lote(clientes: List[Cliente]):
    if len(clientes) > MAX_LOTE:
        raise HTTPException(status_code=413, detail="lote demasiado grande")
    return predecir_tabla(clientes) if clientes else []
'''

def psi(referencia, actual, bins=10):
    referencia, actual = np.asarray(referencia, dtype=float), np.asarray(actual, dtype=float)
    cortes = np.unique(np.quantile(referencia, np.linspace(0, 1, bins + 1)))
    cortes[0], cortes[-1] = -np.inf, np.inf
    r = np.clip(np.histogram(referencia, cortes)[0] / len(referencia), 1e-6, None)
    a = np.clip(np.histogram(actual, cortes)[0] / len(actual), 1e-6, None)
    return float(np.sum((a - r) * np.log(a / r)))

def simular_trafico(servicio, df, n=80, semilla=0, inflacion=1.0):
    muestra = df.sample(n, random_state=semilla)
    for _, fila in muestra.iterrows():
        servicio.manejar("POST", "/prediccion", {
            "antiguedad_meses": int(fila.antiguedad_meses),
            "cuota_mensual": round(float(fila.cuota_mensual) * inflacion, 2),
            "llamadas_soporte": int(fila.llamadas_soporte),
            "fibra": bool(fila.fibra),
            "contrato": fila.contrato,
        })

def informe_vigilancia(servicio, referencia):
    ms = np.array([p["ms"] for p in servicio.peticiones])
    codigos = np.array([p["codigo"] for p in servicio.peticiones])
    entradas = pd.DataFrame(servicio.entradas)
    return {
        "peticiones": len(servicio.peticiones),
        "latencia_p95_ms": float(np.percentile(ms, 95)),
        "tasa_error_5xx": float(np.mean(codigos >= 500)),
        "psi_cuota": psi(referencia["cuota_mensual"], entradas["cuota_mensual"]) if len(entradas) >= 30 else None,
    }

humo = pruebas_humo(servicio)
todo_ok = all(c["ok"] for c in humo)
normal = Servicio(*cargar(), config_desde_entorno({}))
simular_trafico(normal, df, semilla=1)
con_deriva = Servicio(*cargar(), config_desde_entorno({}))
simular_trafico(con_deriva, df, semilla=1, inflacion=1.3)
vigilancia = {"normal": informe_vigilancia(normal, df), "deriva": informe_vigilancia(con_deriva, df)}`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

const VALIDO = `{"antiguedad_meses": 3, "cuota_mensual": 80.0, "llamadas_soporte": 4, "fibra": True, "contrato": "mensual"}`;

export const PROJ_SERVICIO: Mission[] = [
  {
    id: "pd-servicio-1",
    world: "w8",
    zone: "Proyecto de la Torre",
    title: "El servicio de la torre · 1: un modelo reproducible con sus metadatos",
    kind: "project",
    difficulty: 3,
    skills: ["mlops", "reproducibilidad", "pipelines", "persistencia"],
    requires: ["eng-arquitectura", "ml-mlops"],
    series: { ...SERIES, stage: 1 },
    story: "La torre va a ofrecer al multiverso un servicio que predice qué clientes se darán de baja. Antes de abrir la ventanilla, el modelo debe poder reconstruirse igual, identificarse sin ambigüedad y llevar consigo su documentación.",
    objective: "Entrenar un pipeline reproducible, guardarlo con joblib junto a un archivo de metadatos (versión por huella SHA-256, métrica y variables) y volver a cargarlo.",
    before: ["MLOps: persistencia y huella (ml-mlops)", "Pipelines y ColumnTransformer", "JSON"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "Un modelo en producción necesita más que el objeto entrenado:",
      "",
      "- **Reproducibilidad**: entrenar dos veces con los mismos datos y la misma semilla da el mismo modelo.",
      "- **Pipeline completo**: preprocesado y modelo juntos, para que el servicio reciba datos crudos.",
      "- **Metadatos**: un `modelo.json` al lado del `modelo.joblib` con la versión (huella del archivo), la métrica de evaluación, el tamaño del entrenamiento y las variables esperadas. El servicio los mostrará en `/modelo` y en cada predicción.",
      "",
      "Así, ante una predicción extraña, se puede saber exactamente qué modelo la produjo.",
    ],
    formal: "versión = SHA-256(bytes de modelo.joblib)[:12]. Mismo código + mismos datos + misma semilla ⇒ mismas predicciones.",
    example: {
      code: py`import json
meta = {"version": "a1b2c3d4e5f6", "auc_prueba": 0.81, "variables": ["antiguedad_meses", "contrato"]}
texto = json.dumps(meta, ensure_ascii=False, indent=2)
print(texto)
print(json.loads(texto) == meta)`,
      lines: [
        "Módulo JSON de la biblioteca estándar.",
        "Metadatos de un modelo.",
        "Se convierten a texto legible (ensure_ascii=False conserva las tildes).",
        "Así quedaría modelo.json.",
        "True: el viaje de ida y vuelta conserva todo.",
      ],
    },
    challenge: [
      "El código inicial define `NUMERICAS` y `CATEGORICAS`. Escribe:",
      "1. `entrenar(df, semilla=0)`: división 75/25 estratificada con `random_state=semilla`, pipeline (`StandardScaler` para numéricas, `OneHotEncoder(handle_unknown=\"ignore\")` para el contrato, `LogisticRegression(max_iter=1000)`) y tupla (modelo, métricas) con `auc_prueba`, `n_entrenamiento` y `variables`.",
      "2. `guardar(modelo, metricas, ruta_modelo=\"modelo.joblib\", ruta_meta=\"modelo.json\")`: guarda el modelo, calcula `version` (12 primeros caracteres del SHA-256 del archivo) y escribe y devuelve los metadatos (versión + métricas).",
      "3. `cargar(ruta_modelo=..., ruta_meta=...)`: tupla (modelo, metadatos).",
      "4. `df`, `modelo, metricas = entrenar(df)` y `meta = guardar(modelo, metricas)`.",
    ],
    starter: py`import hashlib
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

NUMERICAS = ["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra"]
CATEGORICAS = ["contrato"]

def entrenar(df, semilla=0):
    return None, {}

def guardar(modelo, metricas, ruta_modelo="modelo.joblib", ruta_meta="modelo.json"):
    return {}

def cargar(ruta_modelo="modelo.joblib", ruta_meta="modelo.json"):
    return None, {}

df = pd.read_csv("clientes.csv")
modelo, metricas = entrenar(df)
meta = guardar(modelo, metricas)`,
    solution: SOL1,
    tests: py`
import hashlib
import json
import os
import numpy as np
import pandas as pd

def test_entrenar_reproducible():
    "Mismos datos y semilla, mismo modelo"
    df = pd.read_csv("clientes.csv")
    m1, met1 = t.get("entrenar", "function")(df)
    m2, _ = t.get("entrenar", "function")(df)
    X = df[["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra", "contrato"]].head(50)
    assert np.allclose(m1.predict_proba(X), m2.predict_proba(X))
    assert 0.65 < met1["auc_prueba"] < 0.95 and met1["n_entrenamiento"] == 900
    assert met1["variables"] == ["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra", "contrato"]
    assert len(m1.steps) == 2, "Guarda el pipeline completo"

def test_guardar_y_cargar():
    "Archivos, versión verificable y carga"
    meta = t.get("meta")
    assert os.path.exists("modelo.joblib") and os.path.exists("modelo.json")
    with open("modelo.joblib", "rb") as fh:
        assert meta["version"] == hashlib.sha256(fh.read()).hexdigest()[:12]
    with open("modelo.json", encoding="utf-8") as fh:
        assert json.load(fh) == meta
    m, meta2 = t.get("cargar", "function")()
    X = pd.read_csv("clientes.csv")[meta["variables"]].head(5)
    assert meta2 == meta and np.allclose(m.predict_proba(X), t.get("modelo").predict_proba(X))
`,
    hints: [
      "entrenar: igual que en ml-mlops, con un `ColumnTransformer` para tratar el contrato con OneHotEncoder.",
      "guardar: `joblib.dump`, después abre el archivo en modo \"rb\" para la huella y escribe el JSON con `json.dump(meta, fh, ensure_ascii=False, indent=2)`.",
      "Convierte la AUC a `float` y el tamaño a `int`: los tipos de NumPy no siempre se pueden guardar en JSON.",
    ],
    errors: [
      { error: "No fijar la semilla de la división", fix: "Cada entrenamiento tendría otros datos de prueba y otra métrica: imposible reproducir." },
      { error: "Guardar números de NumPy en JSON", fix: "json.dump falla con np.float64 en algunas versiones: convierte con float() e int()." },
    ],
    quiz: {
      question: "¿Por qué guardar la versión del modelo y devolverla en cada predicción?",
      options: [
        { text: "Para poder rastrear qué modelo exacto produjo cada respuesta cuando se investigue un error o se compare con otro modelo" },
        { text: "Porque mejora la exactitud del modelo" },
        { text: "Porque scikit-learn lo exige para cargar el archivo" },
        { text: "Para que el modelo no se pueda copiar" },
      ],
      answer: 0,
      explanation: "En producción conviven y se suceden versiones. Sin identificador no hay forma de auditar ni de reproducir una decisión pasada.",
    },
    project: SPEC,
    review: "Repasa: pipeline completo, semilla fija, joblib + metadatos JSON, versión por huella.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pd-servicio-2",
    world: "w8",
    zone: "Proyecto de la Torre",
    title: "El servicio de la torre · 2: el contrato de la API con Pydantic",
    kind: "project",
    difficulty: 3,
    skills: ["pydantic", "validacion", "apis"],
    requires: ["pd-servicio-1", "eng-pydantic"],
    series: { ...SERIES, stage: 2 },
    story: "Antes de abrir la ventanilla hay que escribir el contrato: qué datos acepta el servicio, con qué límites, y qué responde exactamente.",
    objective: "Definir con Pydantic el modelo de entrada (cliente) y el de salida (predicción), y una función de predicción que valide, prediga y devuelva una respuesta tipada.",
    before: ["Etapa 1", "Validación con Pydantic (eng-pydantic)"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "El **contrato** de una API es la promesa sobre lo que entra y lo que sale. Con Pydantic se escribe como código:",
      "",
      "- `Cliente`: los campos que necesita el modelo, con límites razonables y `extra=\"forbid\"`.",
      "- `Prediccion`: probabilidad, nivel de riesgo y versión del modelo.",
      "",
      "La función `predecir` valida la entrada (si no es válida, Pydantic lanza `ValidationError`, que el servicio convertirá en un 422), la convierte en la tabla que espera el pipeline y devuelve una `Prediccion`.",
      "",
      "Los niveles de riesgo (bajo < 0,3 ≤ medio < 0,6 ≤ alto) traducen la probabilidad a algo accionable; los cortes son una decisión de negocio que debe documentarse.",
    ],
    formal: "predecir: dict → Cliente (validado) → DataFrame[variables] → p = modelo.predict_proba(...)[0, 1] → Prediccion(p, nivel(p), versión)",
    example: {
      code: py`from pydantic import BaseModel
class Salida(BaseModel):
    probabilidad: float
    version: str
s = Salida(probabilidad=0.4271, version="abc")
print(s.model_dump())`,
      lines: ["Pydantic.", "Un modelo de salida.", "Probabilidad.", "Versión.", "Se construye con valores tipados.", "model_dump() da el diccionario que se enviará como JSON."],
    },
    challenge: [
      "Añade a tu código:",
      "1. `Cliente(BaseModel)` con `extra=\"forbid\"`: `antiguedad_meses` (entero 0–600), `cuota_mensual` (número > 0 y ≤ 1000), `llamadas_soporte` (entero 0–100), `fibra` (bool) y `contrato` (\"mensual\", \"anual\" o \"bianual\").",
      "2. `Prediccion(BaseModel)`: `probabilidad` (0–1), `riesgo` (\"bajo\", \"medio\", \"alto\") y `version` (texto).",
      "3. `nivel(p, cortes=(0.3, 0.6))` y `a_tabla(clientes)`: DataFrame con las columnas `NUMERICAS + CATEGORICAS` y `fibra` como entero.",
      "4. `predecir(modelo, meta, datos)`: valida `datos` con `Cliente`, predice y devuelve una `Prediccion` con la probabilidad redondeada a 4 decimales.",
    ],
    starter: py`from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, ValidationError

class Cliente(BaseModel):
    pass

class Prediccion(BaseModel):
    pass

def nivel(p, cortes=(0.3, 0.6)):
    return "medio"

def a_tabla(clientes):
    return pd.DataFrame()

def predecir(modelo, meta, datos):
    return None`,
    solution: SOL2,
    tests: `
import pandas as pd
from pydantic import ValidationError

VALIDO = ${VALIDO}

def test_cliente():
    "Contrato de entrada"
    C = t.get("Cliente")
    assert C.model_validate(VALIDO).fibra is True
    for campo, valor in {"antiguedad_meses": -1, "cuota_mensual": 0, "llamadas_soporte": 101, "contrato": "semanal"}.items():
        try:
            C.model_validate(dict(VALIDO, **{campo: valor}))
        except ValidationError:
            continue
        assert False, f"{campo}={valor!r} debería ser rechazado"
    try:
        C.model_validate(dict(VALIDO, es_admin=True))
    except ValidationError:
        return
    assert False, "Los campos desconocidos deben rechazarse"

def test_nivel():
    "Niveles de riesgo"
    n = t.get("nivel", "function")
    assert [n(0.1), n(0.3), n(0.59), n(0.6), n(0.95)] == ["bajo", "medio", "medio", "alto", "alto"]

def test_predecir():
    "Predicción tipada y coherente con el modelo"
    m, meta = t.get("modelo"), t.get("meta")
    r = t.get("predecir", "function")(m, meta, VALIDO)
    fila = pd.DataFrame([dict(VALIDO, fibra=1)])[["antiguedad_meses", "cuota_mensual", "llamadas_soporte", "fibra", "contrato"]]
    p = m.predict_proba(fila)[0, 1]
    assert r.__class__.__name__ == "Prediccion" and r.version == meta["version"]
    assert abs(r.probabilidad - round(p, 4)) < 1e-12 and r.riesgo == t.get("nivel", "function")(p)
    try:
        t.get("predecir", "function")(m, meta, dict(VALIDO, cuota_mensual="mucha"))
    except ValidationError:
        return
    assert False, "Una entrada inválida debe lanzar ValidationError"
`,
    hints: [
      "Usa `Field(ge=..., le=...)`, `Field(gt=0, le=1000)` y `Literal[...]` como en eng-pydantic, y `model_config = ConfigDict(extra=\"forbid\")`.",
      "a_tabla: `pd.DataFrame([c.model_dump() for c in clientes])[NUMERICAS + CATEGORICAS]` y convierte `fibra` con `astype(int)`.",
      "predecir: `Cliente.model_validate(datos)`; no captures el error aquí: lo convertirá en 422 el servicio.",
    ],
    errors: [
      { error: "Pasar al modelo el diccionario tal cual llega", fix: "El pipeline espera un DataFrame con las columnas en el orden de entrenamiento." },
      { error: "Capturar ValidationError y devolver None", fix: "Ocultarías el motivo del error: deja que el servicio lo traduzca a una respuesta 422 con los campos." },
    ],
    quiz: {
      question: "Un cliente envía `\"fibra\": \"sí\"`. ¿Qué debe pasar?",
      options: [
        { text: "La validación lo rechaza con un error que indica el campo `fibra`, y el servicio responde 422" },
        { text: "El servicio debe adivinar que significa True" },
        { text: "El modelo debe predecir igualmente con el valor por defecto" },
        { text: "El servicio debe responder 500" },
      ],
      answer: 0,
      explanation: "El contrato define qué es válido. Adivinar significados o usar valores por defecto silenciosos produce predicciones sobre datos que nadie envió. Un 500 indicaría un fallo del servidor, no del cliente.",
    },
    project: SPEC,
    review: "Repasa: contrato de entrada y salida con Pydantic; validar antes de predecir; la tabla con las columnas del entrenamiento.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pd-servicio-3",
    world: "w8",
    zone: "Proyecto de la Torre",
    title: "El servicio de la torre · 3: rutas, lotes, configuración y registro",
    kind: "project",
    difficulty: 4,
    skills: ["apis", "logging", "configuracion", "diseno-software"],
    requires: ["pd-servicio-2", "eng-config"],
    series: { ...SERIES, stage: 3 },
    story: "La ventanilla abre. Debe atender peticiones individuales y lotes, no aceptar lotes gigantes, no revelar nunca sus secretos al fallar y dejar constancia de cada visita.",
    objective: "Construir el servicio: despacho de rutas con 404/405/422/413/500, predicción por lotes, configuración desde variables de entorno y registro estructurado (JSON por línea) con latencia.",
    before: ["Etapas 1 y 2", "API con rutas (eng-api)", "Configuración y logging (eng-config)"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "El servicio reúne lo aprendido en la Torre:",
      "",
      "- **Rutas**: GET `/salud` (¿estás vivo?), GET `/modelo` (qué modelo sirves), POST `/prediccion` y POST `/lote`.",
      "- **Códigos HTTP**: 404 ruta inexistente, 405 método incorrecto, 422 datos inválidos (con los campos o índices problemáticos), 413 lote demasiado grande, 500 error interno **sin detalles** para el cliente (pero registrado).",
      "- **Configuración** desde el entorno (`MAX_LOTE`, `NIVEL_LOG`) con valores por defecto: el mismo código sirve en desarrollo y en producción.",
      "- **Registro estructurado**: una línea JSON por petición (método, ruta, código, milisegundos). Se puede buscar, contar y graficar.",
      "- **Lotes**: validar todos los elementos y predecir con una sola llamada al modelo (más eficiente que uno a uno).",
      "",
      "El servicio guarda también las entradas aceptadas: la etapa 4 las usará para vigilar la deriva.",
    ],
    formal: "manejar(método, ruta, cuerpo) → (código, respuesta) · registro: {\"metodo\", \"ruta\", \"codigo\", \"ms\"} por petición",
    example: {
      code: py`import io, json, logging
destino = io.StringIO()
log = logging.getLogger("ejemplo")
log.addHandler(logging.StreamHandler(destino))
log.setLevel("INFO")
log.info(json.dumps({"ruta": "/salud", "codigo": 200}))
print(json.loads(destino.getvalue()))`,
      lines: [
        "Módulos para un registro en memoria.",
        "Un «archivo» en memoria donde escribir.",
        "Un logger con nombre.",
        "Que escriba en ese destino.",
        "Que registre desde el nivel INFO.",
        "Una línea JSON por evento.",
        "Se puede leer de vuelta como datos: {'ruta': '/salud', 'codigo': 200}.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `config_desde_entorno(env)`: diccionario con `max_lote` (int, por defecto 100) y `nivel_log` (mayúsculas, por defecto \"INFO\") leídos de `MAX_LOTE` y `NIVEL_LOG`.",
      "2. `Servicio(modelo, meta, config, registro=None)` con `manejar(metodo, ruta, cuerpo=None)` que devuelva (código, respuesta), añada a `self.peticiones` un diccionario con `metodo`, `ruta`, `codigo` y `ms`, y escriba esa misma información como una línea JSON en el registro (un `StringIO`).",
      "3. Rutas: `/salud` → 200 {estado, version}; `/modelo` → 200 {version, auc_prueba, variables}; `/prediccion` → 200 con la predicción (422 {error, campos} si no valida); `/lote` → lista de clientes: 413 {error, maximo} si supera `max_lote`, 422 {error, indices} si alguno no valida, 200 {resultados} si no. Errores inesperados → 500 {\"error\": \"error interno\"}.",
      "4. `self.entradas`: lista con los clientes aceptados (diccionarios). Y `servicio = Servicio(*cargar(), config_desde_entorno({\"MAX_LOTE\": \"50\"}))`.",
    ],
    starter: py`import io
import logging
import time

def config_desde_entorno(env):
    return {}

class Servicio:
    def __init__(self, modelo, meta, config, registro=None):
        self.peticiones = []
        self.entradas = []

    def manejar(self, metodo, ruta, cuerpo=None):
        return 404, {"error": "no encontrado"}

servicio = Servicio(*cargar(), config_desde_entorno({"MAX_LOTE": "50"}))`,
    solution: SOL3,
    tests: `
import json

VALIDO = ${VALIDO}

def _nuevo(env=None):
    m, meta = t.get("cargar", "function")()
    return t.get("Servicio")(m, meta, t.get("config_desde_entorno", "function")(env or {}))

def test_config():
    "Configuración desde el entorno"
    f = t.get("config_desde_entorno", "function")
    assert f({}) == {"max_lote": 100, "nivel_log": "INFO"}
    assert f({"MAX_LOTE": "5", "NIVEL_LOG": "debug"}) == {"max_lote": 5, "nivel_log": "DEBUG"}

def test_rutas():
    "Códigos y respuestas"
    s = _nuevo({"MAX_LOTE": "3"})
    meta = t.get("meta")
    assert s.manejar("GET", "/salud") == (200, {"estado": "ok", "version": meta["version"]})
    c, r = s.manejar("GET", "/modelo")
    assert c == 200 and r["version"] == meta["version"] and r["variables"] == meta["variables"]
    c, r = s.manejar("POST", "/prediccion", VALIDO)
    assert c == 200 and set(r) == {"probabilidad", "riesgo", "version"}
    assert s.manejar("POST", "/prediccion", dict(VALIDO, cuota_mensual=-1, contrato="x")) == (422, {"error": "validacion", "campos": ["contrato", "cuota_mensual"]})
    assert s.manejar("GET", "/nada")[0] == 404 and s.manejar("GET", "/prediccion")[0] == 405
    assert s.manejar("post", "/prediccion", VALIDO)[0] == 200, "El método no distingue mayúsculas"

def test_lotes():
    "Lotes: tamaño, validación y coherencia"
    s = _nuevo({"MAX_LOTE": "3"})
    assert s.manejar("POST", "/lote", [VALIDO] * 4) == (413, {"error": "lote demasiado grande", "maximo": 3})
    assert s.manejar("POST", "/lote", [VALIDO, dict(VALIDO, fibra="tal vez"), VALIDO]) == (422, {"error": "validacion", "indices": [1]})
    otro = dict(VALIDO, contrato="bianual", antiguedad_meses=40)
    c, r = s.manejar("POST", "/lote", [VALIDO, otro])
    assert c == 200 and [x["probabilidad"] for x in r["resultados"]] == [s.manejar("POST", "/prediccion", d)[1]["probabilidad"] for d in (VALIDO, otro)]
    assert s.manejar("POST", "/lote", []) == (200, {"resultados": []})

def test_errores_internos():
    "500 sin detalles"
    s = _nuevo()
    s.modelo = None
    c, r = s.manejar("POST", "/prediccion", VALIDO)
    assert c == 500 and r == {"error": "error interno"}

def test_registro():
    "Una línea JSON por petición y entradas guardadas"
    s = _nuevo()
    s.manejar("GET", "/salud")
    s.manejar("POST", "/prediccion", VALIDO)
    s.manejar("GET", "/nada")
    lineas = [json.loads(l) for l in s.registro.getvalue().strip().splitlines()]
    assert [(l["ruta"], l["codigo"]) for l in lineas] == [("/salud", 200), ("/prediccion", 200), ("/nada", 404)]
    assert all(l["ms"] >= 0 for l in lineas) and len(s.peticiones) == 3
    assert s.entradas == [dict(VALIDO)]
    assert t.get("servicio").config["max_lote"] == 50
`,
    hints: [
      "Guarda las rutas en un diccionario {(método, ruta): función}; el 405 aparece cuando la ruta existe con otro método.",
      "Captura `ValidationError` para el 422 (los campos están en `err[\"loc\"][0]`) y `Exception` para el 500, registrando el tipo de error pero sin devolverlo.",
      "Logger: un nombre distinto por servicio (`f\"servicio-{id(self)}\"`), un `StreamHandler(self.registro)` con formato `%(message)s` y `propagate = False`.",
    ],
    errors: [
      { error: "Devolver el mensaje de la excepción al cliente", fix: "Puede revelar rutas, versiones o datos internos. Al cliente, «error interno»; el detalle, al registro." },
      { error: "Predecir los lotes elemento a elemento", fix: "Funciona, pero cada llamada al modelo tiene un coste fijo: una sola llamada con la tabla completa es mucho más rápida." },
      { error: "Escribir el registro como texto libre", fix: "Las líneas JSON se pueden filtrar y agregar automáticamente (errores por ruta, latencias…)." },
    ],
    quiz: {
      question: "Un lote de 3 clientes tiene uno inválido. ¿Qué diseño es más razonable?",
      options: [
        { text: "Responder 422 indicando los índices inválidos, para que el cliente los corrija; o, si se documenta, procesar los válidos y marcar los inválidos" },
        { text: "Responder 200 con predicciones inventadas para el inválido" },
        { text: "Responder 500" },
        { text: "Ignorar el inválido sin decir nada" },
      ],
      answer: 0,
      explanation: "Lo importante es que el comportamiento sea explícito y esté documentado. Silenciar errores o inventar valores lleva a decisiones basadas en datos que no existen.",
    },
    project: SPEC,
    review: "Repasa: códigos 404/405/413/422/500; configuración por entorno; registro JSON por petición; lotes con una sola predicción.",
    xp: 140,
    coins: 21,
  },
  {
    id: "pd-servicio-4",
    world: "w8",
    zone: "Proyecto de la Torre",
    title: "El servicio de la torre · 4: pruebas de humo, despliegue y vigilancia",
    kind: "project",
    difficulty: 5,
    skills: ["despliegue", "docker", "pruebas", "mlops", "deriva-datos"],
    requires: ["pd-servicio-3"],
    series: { ...SERIES, stage: 4 },
    story: "Último piso: el servicio sale de la torre. Hay que comprobar que todo responde, empaquetarlo para que funcione igual en cualquier máquina y vigilarlo cuando ya esté en marcha.",
    objective: "Escribir pruebas de humo, generar los artefactos de despliegue (requirements.txt con versiones fijadas, Dockerfile y la app equivalente en FastAPI) y vigilar latencia, errores y deriva de los datos con tráfico simulado.",
    before: ["Etapas 1 a 3", "Deriva de datos y PSI (ml-mlops)", "Variables de entorno"],
    packages: PACKAGES,
    files: FILES,
    intuition: [
      "**Pruebas de humo**: comprobaciones rápidas de que lo esencial funciona tras desplegar (salud, una predicción válida, una inválida, un lote, una ruta inexistente). Se ejecutan en la integración continua y después de cada despliegue.",
      "",
      "**Artefactos de despliegue**:",
      "",
      "- `requirements.txt` con las **versiones exactas** con las que se entrenó y probó el modelo: con otra versión de scikit-learn, el archivo joblib podría no cargar o predecir distinto.",
      "- `Dockerfile`: una imagen ligera, sin caché de pip, con un **usuario sin privilegios**, puerto expuesto, comprobación de salud y el comando de arranque.",
      "- `app.py` con FastAPI: el mismo contrato y las mismas rutas. FastAPI usa Pydantic para validar y genera la documentación automática en `/docs`.",
      "",
      "En el navegador no se puede levantar un servidor ni construir una imagen: aquí se genera y se comprueba el código; ejecutarlo localmente es la primera extensión del proyecto.",
      "",
      "**Vigilancia**: latencia p95, tasa de errores 5xx y deriva de las entradas (PSI de la cuota frente a los datos de entrenamiento).",
    ],
    formal: "p95 = percentil 95 de la latencia · PSI = Σ (aₖ − rₖ)·ln(aₖ/rₖ) (> 0,2 suele considerarse un cambio importante)",
    example: {
      code: py`import sklearn
import sys
print(f"scikit-learn=={sklearn.__version__}")
print(f"FROM python:{sys.version_info.major}.{sys.version_info.minor}-slim")`,
      lines: [
        "La biblioteca con la que se entrenó el modelo.",
        "Información del intérprete.",
        "Línea de requirements.txt con la versión exacta instalada.",
        "Imagen base de Docker con la misma versión de Python.",
      ],
    },
    challenge: [
      "Añade a tu código:",
      "1. `pruebas_humo(servicio)`: lista de diccionarios {nombre, ok} para: salud (200), modelo (200), predicción válida (200), predicción inválida (422), campo desconocido (422), lote de 2 (200), lote mayor que `max_lote` (413) y ruta inexistente (404). `humo` y `todo_ok`.",
      "2. `requirements_txt()`: líneas `numpy==…`, `pandas==…`, `scikit-learn==…`, `joblib==…` y `pydantic==…` con las versiones **instaladas** (`__version__`, `pydantic.VERSION`), más `fastapi>=0.110` y `uvicorn>=0.29`.",
      "3. `dockerfile()`: texto con `FROM python:<versión actual>-slim`, `COPY requirements.txt`, `RUN pip install --no-cache-dir -r requirements.txt`, la copia de `app.py`, `modelo.joblib` y `modelo.json`, un usuario sin privilegios (`USER`), `EXPOSE 8000`, `HEALTHCHECK` y `CMD [\"uvicorn\", \"app:app\", ...]`.",
      "4. `APP_FASTAPI`: el código de `app.py` con FastAPI (carga del modelo y los metadatos, `Cliente`, `Prediccion` y las rutas GET /salud, GET /modelo, POST /prediccion y POST /lote con el 413).",
      "5. `psi(referencia, actual, bins=10)`, `simular_trafico(servicio, df, n=80, semilla=0, inflacion=1.0)` (envía n clientes de la muestra con la cuota multiplicada por `inflacion`) e `informe_vigilancia(servicio, referencia)`: {peticiones, latencia_p95_ms, tasa_error_5xx, psi_cuota (None con menos de 30 entradas)}.",
      "6. `vigilancia = {\"normal\": …, \"deriva\": …}` con dos servicios nuevos: tráfico normal y tráfico con la cuota inflada un 30 % (semilla 1 en ambos).",
    ],
    starter: py`import sys
import sklearn

def pruebas_humo(servicio):
    return []

def requirements_txt():
    return ""

def dockerfile():
    return ""

APP_FASTAPI = ""

def psi(referencia, actual, bins=10):
    return 0.0

def simular_trafico(servicio, df, n=80, semilla=0, inflacion=1.0):
    pass

def informe_vigilancia(servicio, referencia):
    return {}

humo = pruebas_humo(servicio)
todo_ok = False
vigilancia = {}`,
    solution: SOL4,
    tests: py`
import ast
import sys
import numpy as np

def test_humo():
    "Pruebas de humo completas"
    h = t.get("humo")
    assert len(h) == 8 and all(c["ok"] for c in h) and t.get("todo_ok") is True
    roto = t.get("Servicio")(*t.get("cargar", "function")(), t.get("config_desde_entorno", "function")({}))
    roto.modelo = None
    r = t.get("pruebas_humo", "function")(roto)
    assert not all(c["ok"] for c in r), "Las pruebas de humo deben detectar un servicio roto"

def test_requirements():
    "Versiones exactas de lo instalado"
    import numpy, pandas, sklearn, joblib, pydantic
    lineas = t.get("requirements_txt", "function")().strip().splitlines()
    for linea in (f"numpy=={numpy.__version__}", f"pandas=={pandas.__version__}", f"scikit-learn=={sklearn.__version__}", f"joblib=={joblib.__version__}", f"pydantic=={pydantic.VERSION}"):
        assert linea in lineas, f"Falta {linea}"
    assert any(l.startswith("fastapi") for l in lineas) and any(l.startswith("uvicorn") for l in lineas)

def test_dockerfile():
    "Imagen ligera, sin privilegios y con comprobación de salud"
    d = t.get("dockerfile", "function")()
    lineas = d.strip().splitlines()
    assert lineas[0] == f"FROM python:{sys.version_info.major}.{sys.version_info.minor}-slim"
    for fragmento in ("COPY requirements.txt", "RUN pip install --no-cache-dir -r requirements.txt", "modelo.joblib", "modelo.json", "EXPOSE 8000", "HEALTHCHECK"):
        assert fragmento in d, f"Falta {fragmento}"
    assert any(l.startswith("USER ") and "root" not in l for l in lineas), "Ejecuta con un usuario sin privilegios"
    assert lineas[-1].startswith('CMD ["uvicorn", "app:app"')
    assert d.index("COPY requirements.txt") < d.index("RUN pip install") < d.index("app.py"), "Instala dependencias antes de copiar el código (caché de capas)"

def test_app_fastapi():
    "Código FastAPI válido con las cuatro rutas"
    codigo = t.get("APP_FASTAPI")
    arbol = ast.parse(codigo)
    rutas = set()
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.FunctionDef):
            for dec in nodo.decorator_list:
                if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and dec.args:
                    rutas.add((dec.func.attr, dec.args[0].value))
    assert {("get", "/salud"), ("get", "/modelo"), ("post", "/prediccion"), ("post", "/lote")} <= rutas, rutas
    assert "FastAPI(" in codigo and "joblib.load" in codigo and "413" in codigo and 'extra="forbid"' in codigo

def test_vigilancia():
    "Latencia, errores y deriva"
    v = t.get("vigilancia")
    assert v["normal"]["peticiones"] == 80 and v["normal"]["tasa_error_5xx"] == 0 and v["normal"]["latencia_p95_ms"] > 0
    assert v["normal"]["psi_cuota"] < 0.15 and v["deriva"]["psi_cuota"] > 0.2, (v["normal"]["psi_cuota"], v["deriva"]["psi_cuota"])
    f = t.get("psi", "function")
    ref = np.random.default_rng(0).normal(size=3000)
    assert f(ref, ref) < 1e-9 and f(ref, ref + 1) > 0.5
    s = t.get("Servicio")(*t.get("cargar", "function")(), t.get("config_desde_entorno", "function")({}))
    s.manejar("GET", "/salud")
    assert t.get("informe_vigilancia", "function")(s, t.get("df"))["psi_cuota"] is None
`,
    hints: [
      "pruebas_humo: una lista de casos (nombre, método, ruta, cuerpo, código esperado) y compara `servicio.manejar(...)[0]` con lo esperado.",
      "Versiones: `np.__version__`, `pd.__version__`, `sklearn.__version__`, `joblib.__version__` y `pydantic.VERSION`. Python: `sys.version_info.major` y `.minor`.",
      "APP_FASTAPI es un texto (triple comilla) con el código: rutas con `@app.get(\"/salud\")`, `@app.post(\"/prediccion\", response_model=Prediccion)` y un `HTTPException(status_code=413, ...)` en el lote.",
    ],
    errors: [
      { error: "requirements.txt sin versiones", fix: "Dentro de un año se instalarían otras versiones y el modelo podría no cargar o predecir distinto." },
      { error: "Ejecutar el contenedor como root", fix: "Si alguien explota el servicio, tendría privilegios máximos dentro del contenedor. Crea un usuario y usa USER." },
      { error: "Copiar todo el proyecto antes de instalar dependencias", fix: "Cualquier cambio de código invalidaría la capa de pip y cada construcción reinstalaría todo." },
      { error: "Escribir claves o contraseñas en el Dockerfile o en el código", fix: "Pásalas como variables de entorno o secretos del sistema de despliegue; nunca en el repositorio." },
    ],
    quiz: {
      question: "Tras desplegar, el PSI de la cuota pasa de 0,02 a 0,35 en una semana, pero no hay errores 5xx y la latencia es normal. ¿Qué haces?",
      options: [
        { text: "Investigar el cambio (¿subida de precios?, ¿error en la fuente?) y revisar el rendimiento del modelo cuando lleguen las bajas reales; el servicio funciona, pero quizá el modelo ya no" },
        { text: "Nada: si no hay errores, todo va bien" },
        { text: "Reiniciar el contenedor" },
        { text: "Subir el umbral del PSI hasta que deje de avisar" },
      ],
      answer: 0,
      explanation: "La salud técnica (latencia, errores) y la salud del modelo son cosas distintas. La deriva no rompe nada visible: el servicio sigue respondiendo con predicciones posiblemente peores. Por eso se vigila aparte.",
    },
    project: SPEC,
    review: "Repasa: pruebas de humo; versiones fijadas; Dockerfile sin root y con caché de capas; misma API en FastAPI; vigilar latencia, errores y deriva.",
    xp: 170,
    coins: 26,
  },
];
