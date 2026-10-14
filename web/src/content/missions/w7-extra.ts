import { py, type Mission } from "../types";

// Mundo 7: diferenciación automática, el mecanismo de atención de los transformers y equidad.
// Todo se ejecuta localmente (sin GPU ni APIs): son las ideas que hay dentro de PyTorch y de los LLM.

export const W7_EXTRA: Mission[] = [
  {
    id: "ai-autograd",
    world: "w7",
    zone: "Redes neuronales",
    title: "El escriba de las derivadas: diferenciación automática desde cero",
    kind: "lesson",
    difficulty: 4,
    skills: ["autograd", "derivadas", "redes-neuronales", "verificacion"],
    requires: ["ai-red", "m-derivadas"],
    story: "En la fortaleza, nadie calcula derivadas a mano: un escriba invisible apunta cada operación y, al final, recorre el camino al revés aplicando la regla de la cadena. Así funcionan PyTorch y TensorFlow. Vas a construir ese escriba.",
    objective: "Implementar un valor escalar que registra el grafo de operaciones y calcula gradientes con retropropagación (modo inverso), verificarlo con diferencias finitas y usarlo para entrenar un modelo.",
    before: ["Derivadas y regla de la cadena", "Retropropagación en una red (ai-red)", "Clases y métodos especiales (__add__, __mul__)"],
    intuition: [
      "Cada operación (suma, producto, tanh…) crea un nodo nuevo que recuerda **de qué nodos viene** y **cómo propagar el gradiente** hacia ellos (su derivada local).",
      "",
      "`backward()` hace dos cosas:",
      "",
      "1. Ordena los nodos topológicamente (cada nodo después de los que lo producen).",
      "2. Pone el gradiente de la salida a 1 y recorre el orden **al revés**, aplicando la regla de la cadena: grad(hijo) += derivada local × grad(padre).",
      "",
      "Se usa **+=** porque si una variable se usa varias veces (x·x + x), sus contribuciones se **suman**.",
      "",
      "En PyTorch es lo mismo con tensores: `y.backward()` llena `x.grad`. Aquí no hay GPU ni bibliotecas: solo Python, para ver que no hay magia.",
    ],
    formal: [
      "Si z = f(x, y) y L depende de z: ∂L/∂x += ∂L/∂z · ∂z/∂x.",
      "",
      "Derivadas locales: (x + y)′ = 1, 1 · (x·y)′ = y, x · (xⁿ)′ = n·xⁿ⁻¹ · tanh′(x) = 1 − tanh²(x).",
    ],
    example: {
      code: py`class Nodo:
    def __init__(self, valor):
        self.valor, self.grad = valor, 0.0
x, y = Nodo(3.0), Nodo(4.0)
z = Nodo(x.valor * y.valor)
z.grad = 1.0
x.grad += y.valor * z.grad
y.grad += x.valor * z.grad
print(z.valor, x.grad, y.grad)`,
      lines: [
        "Un nodo mínimo.",
        "Al crearlo…",
        "…guarda su valor y su gradiente (empieza en 0).",
        "Dos entradas.",
        "z = x·y.",
        "Gradiente de la salida respecto a sí misma: 1.",
        "∂z/∂x = y = 4.",
        "∂z/∂y = x = 3.",
        "12.0 4.0 3.0: exactamente las derivadas parciales.",
      ],
    },
    challenge: [
      "El código inicial trae la clase `Valor` con la suma ya implementada como modelo. Completa:",
      "1. `__mul__` (y `__rmul__`): producto con su retropropagación.",
      "2. `__pow__(self, n)` para exponente numérico (int o float).",
      "3. `tanh()`.",
      "4. `backward()`: orden topológico, gradiente 1 en la salida y propagación en orden inverso.",
      "5. `entrenar(xs, ys, pasos=200, lr=0.05)`: ajusta y ≈ w·x + b con el error cuadrático medio usando `Valor` (empieza en w = b = 0, pon los gradientes a 0 antes de cada `backward`) y devuelve (w, b) como floats.",
    ],
    starter: py`import math

class Valor:
    def __init__(self, dato, hijos=()):
        self.dato = float(dato)
        self.grad = 0.0
        self._hijos = hijos
        self._retro = lambda: None

    def __add__(self, otro):
        otro = otro if isinstance(otro, Valor) else Valor(otro)
        out = Valor(self.dato + otro.dato, (self, otro))
        def _retro():
            self.grad += out.grad
            otro.grad += out.grad
        out._retro = _retro
        return out

    __radd__ = __add__

    def __neg__(self):
        return self * -1

    def __sub__(self, otro):
        return self + (-otro)

    def __mul__(self, otro):
        otro = otro if isinstance(otro, Valor) else Valor(otro)
        return Valor(self.dato * otro.dato, (self, otro))

    __rmul__ = __mul__

    def __pow__(self, n):
        return Valor(self.dato ** n, (self,))

    def tanh(self):
        return Valor(math.tanh(self.dato), (self,))

    def backward(self):
        self.grad = 1.0

def entrenar(xs, ys, pasos=200, lr=0.05):
    return 0.0, 0.0`,
    solution: py`import math

class Valor:
    def __init__(self, dato, hijos=()):
        self.dato = float(dato)
        self.grad = 0.0
        self._hijos = hijos
        self._retro = lambda: None

    def __add__(self, otro):
        otro = otro if isinstance(otro, Valor) else Valor(otro)
        out = Valor(self.dato + otro.dato, (self, otro))
        def _retro():
            self.grad += out.grad
            otro.grad += out.grad
        out._retro = _retro
        return out

    __radd__ = __add__

    def __neg__(self):
        return self * -1

    def __sub__(self, otro):
        return self + (-otro)

    def __mul__(self, otro):
        otro = otro if isinstance(otro, Valor) else Valor(otro)
        out = Valor(self.dato * otro.dato, (self, otro))
        def _retro():
            self.grad += otro.dato * out.grad
            otro.grad += self.dato * out.grad
        out._retro = _retro
        return out

    __rmul__ = __mul__

    def __pow__(self, n):
        out = Valor(self.dato ** n, (self,))
        def _retro():
            self.grad += n * self.dato ** (n - 1) * out.grad
        out._retro = _retro
        return out

    def tanh(self):
        th = math.tanh(self.dato)
        out = Valor(th, (self,))
        def _retro():
            self.grad += (1 - th ** 2) * out.grad
        out._retro = _retro
        return out

    def backward(self):
        orden, vistos = [], set()
        def visitar(v):
            if id(v) not in vistos:
                vistos.add(id(v))
                for h in v._hijos:
                    visitar(h)
                orden.append(v)
        visitar(self)
        self.grad = 1.0
        for v in reversed(orden):
            v._retro()

def entrenar(xs, ys, pasos=200, lr=0.05):
    w, b = Valor(0.0), Valor(0.0)
    for _ in range(pasos):
        perdida = sum(((w * x + b) - y) ** 2 for x, y in zip(xs, ys)) * (1 / len(xs))
        w.grad = b.grad = 0.0
        perdida.backward()
        w.dato -= lr * w.grad
        b.dato -= lr * b.grad
    return w.dato, b.dato`,
    tests: py`
def _num(f, xs, i, h=1e-6):
    a = list(xs); b = list(xs)
    a[i] += h; b[i] -= h
    return (f(*a) - f(*b)) / (2 * h)

def test_producto_y_regla_cadena():
    "Gradientes = diferencias finitas"
    V = t.get("Valor")
    f = lambda a, b, c: math.tanh(a * b + c) ** 2 * a
    vals = [0.7, -1.3, 0.4]
    a, b, c = (V(v) for v in vals)
    out = (a * b + c).tanh() ** 2 * a
    out.backward()
    assert approx(out.dato, f(*vals))
    for i, v in enumerate((a, b, c)):
        assert abs(v.grad - _num(f, vals, i)) < 1e-6, f"Gradiente {i}: {v.grad} frente a {_num(f, vals, i)}"

def test_acumulacion():
    "Una variable usada varias veces suma sus contribuciones"
    V = t.get("Valor")
    x = V(3.0)
    y = x * x + x
    y.backward()
    assert approx(x.grad, 7.0)
    z = V(2.0)
    w = (z * 3 - z) ** 3
    w.backward()
    assert approx(z.grad, 3 * (2 * 2.0) ** 2 * 2)

def test_potencias():
    "Exponentes enteros y reales"
    V = t.get("Valor")
    x = V(4.0)
    y = x ** 0.5 + x ** -1
    y.backward()
    assert approx(y.dato, 2.25) and approx(x.grad, 0.5 / 2 - 1 / 16)

def test_entrenar():
    "Aprende y = 2x + 1"
    xs = [-1.0, 0.0, 1.0, 2.0, 3.0]
    w, b = t.get("entrenar", "function")(xs, [2 * x + 1 for x in xs], 400, 0.05)
    assert abs(w - 2) < 1e-3 and abs(b - 1) < 1e-3, (w, b)
`,
    hints: [
      "Copia el patrón de `__add__`: crea `out`, define `_retro` con la derivada local multiplicada por `out.grad` y asígnala a `out._retro`.",
      "backward: una función recursiva `visitar(v)` que visita primero los hijos y después añade `v` a la lista; luego recorre `reversed(orden)` llamando a `_retro`.",
      "entrenar: en cada paso construye la pérdida con `Valor`, pon `w.grad = b.grad = 0.0`, llama a `backward()` y actualiza `w.dato` y `b.dato`.",
    ],
    errors: [
      { error: "Usar = en lugar de += en los gradientes", fix: "Si una variable aparece dos veces, la segunda contribución borraría la primera." },
      { error: "No poner los gradientes a cero entre pasos", fix: "Se acumularían los de todas las iteraciones (en PyTorch: optimizer.zero_grad())." },
      { error: "Llamar a `_retro` en orden directo", fix: "El gradiente de un nodo debe estar completo antes de propagarlo: por eso se recorre el orden topológico al revés." },
    ],
    quiz: {
      question: "¿Por qué los marcos de deep learning usan el modo inverso (retropropagación) y no diferencias finitas para calcular gradientes?",
      options: [
        { text: "Porque con una sola pasada hacia atrás obtienen el gradiente exacto respecto a millones de parámetros; las diferencias finitas necesitarían una evaluación por parámetro y además son aproximadas" },
        { text: "Porque las diferencias finitas no funcionan con funciones continuas" },
        { text: "Porque la retropropagación no necesita la regla de la cadena" },
        { text: "Porque las diferencias finitas solo sirven para regresión lineal" },
      ],
      answer: 0,
      explanation: "El modo inverso cuesta lo mismo que unas pocas evaluaciones de la función, sea cual sea el número de parámetros. Las diferencias finitas se usan para verificar gradientes, como en las pruebas de esta misión.",
    },
    advanced: {
      title: "Una neurona que aprende OR",
      prompt: "Escribe `neurona_or(pasos=300, lr=0.5)`: con `Valor`, entrena p = tanh(w1·x1 + w2·x2 + b) sobre las cuatro combinaciones de OR (objetivo −1 para 0 y +1 para 1) con pérdida cuadrática media, empezando en w1 = 0.1, w2 = −0.1, b = 0. Devuelve la lista de predicciones finales (floats) en el orden (0,0), (0,1), (1,0), (1,1).",
      starter: py`def neurona_or(pasos=300, lr=0.5):
    return [0.0, 0.0, 0.0, 0.0]`,
      solution: py`import math

class Valor:
    def __init__(self, dato, hijos=()):
        self.dato, self.grad, self._hijos, self._retro = float(dato), 0.0, hijos, lambda: None
    def __add__(self, o):
        o = o if isinstance(o, Valor) else Valor(o)
        out = Valor(self.dato + o.dato, (self, o))
        def r():
            self.grad += out.grad; o.grad += out.grad
        out._retro = r
        return out
    __radd__ = __add__
    def __mul__(self, o):
        o = o if isinstance(o, Valor) else Valor(o)
        out = Valor(self.dato * o.dato, (self, o))
        def r():
            self.grad += o.dato * out.grad; o.grad += self.dato * out.grad
        out._retro = r
        return out
    __rmul__ = __mul__
    def __sub__(self, o):
        return self + (o * -1 if isinstance(o, Valor) else -o)
    def __pow__(self, n):
        out = Valor(self.dato ** n, (self,))
        def r():
            self.grad += n * self.dato ** (n - 1) * out.grad
        out._retro = r
        return out
    def tanh(self):
        th = math.tanh(self.dato); out = Valor(th, (self,))
        def r():
            self.grad += (1 - th ** 2) * out.grad
        out._retro = r
        return out
    def backward(self):
        orden, vistos = [], set()
        def visitar(v):
            if id(v) not in vistos:
                vistos.add(id(v))
                for h in v._hijos:
                    visitar(h)
                orden.append(v)
        visitar(self)
        self.grad = 1.0
        for v in reversed(orden):
            v._retro()

def neurona_or(pasos=300, lr=0.5):
    datos = [((0, 0), -1), ((0, 1), 1), ((1, 0), 1), ((1, 1), 1)]
    w1, w2, b = Valor(0.1), Valor(-0.1), Valor(0.0)
    for _ in range(pasos):
        perdida = sum(((w1 * x1 + w2 * x2 + b).tanh() - y) ** 2 for (x1, x2), y in datos) * 0.25
        for p in (w1, w2, b):
            p.grad = 0.0
        perdida.backward()
        for p in (w1, w2, b):
            p.dato -= lr * p.grad
    return [(w1 * x1 + w2 * x2 + b).tanh().dato for (x1, x2), _ in datos]`,
      tests: py`
def test_or():
    "Separa OR"
    p = t.get("neurona_or", "function")()
    assert p[0] < -0.8 and min(p[1:]) > 0.8, p
`,
    },
    lab: { lab: "matematicas", tab: "gradiente", label: "Descenso de gradiente" },
    review: "Repasa: cada nodo guarda su derivada local; backward = orden topológico al revés + regla de la cadena; += para acumular; gradientes a cero entre pasos.",
    xp: 110,
    coins: 16,
  },
  {
    id: "ai-atencion",
    world: "w7",
    zone: "Lenguaje",
    title: "La sala de las miradas: el mecanismo de atención de los transformers",
    kind: "lesson",
    difficulty: 4,
    skills: ["transformers", "atencion", "numpy", "algebra-lineal"],
    requires: ["ai-embeddings", "m-matrices"],
    story: "En la sala de las miradas, cada palabra observa a todas las demás y decide a cuáles prestar atención para entender su sentido. Es el corazón de los transformers y de los modelos de lenguaje grandes.",
    objective: "Implementar la atención de producto escalar escalado con una softmax estable, la máscara causal y la atención de varias cabezas, y comprobar sus propiedades.",
    before: ["Embeddings (ai-embeddings)", "Producto de matrices (m-matrices)", "Softmax"],
    packages: ["numpy"],
    intuition: [
      "Cada token tiene tres vectores: una **consulta** (Q: ¿qué busco?), una **clave** (K: ¿qué ofrezco?) y un **valor** (V: ¿qué información llevo?).",
      "",
      "- La afinidad entre el token i y el j es el producto escalar Qᵢ·Kⱼ, dividido entre √d para que no crezca con la dimensión.",
      "- La **softmax** de cada fila convierte afinidades en **pesos** positivos que suman 1.",
      "- La salida de i es la media de los valores V ponderada por esos pesos.",
      "",
      "Un modelo que **genera** texto no puede mirar el futuro: la **máscara causal** pone −∞ a las afinidades con tokens posteriores (peso 0).",
      "",
      "Con **varias cabezas**, la dimensión se reparte en trozos y cada cabeza atiende a cosas distintas; luego se concatenan y se mezclan con una proyección.",
      "",
      "La softmax se calcula restando el máximo de cada fila: e^(x − m) no desborda y da el mismo resultado.",
    ],
    formal: "Atención(Q, K, V) = softmax(QKᵀ/√d + M)·V, con M = 0 donde se permite mirar y −∞ donde no. softmax(x)ᵢ = e^(xᵢ − max x)/Σⱼ e^(xⱼ − max x)",
    example: {
      code: py`import numpy as np
Q = np.array([[1.0, 0.0], [0.0, 1.0]])
K = np.array([[1.0, 0.0], [1.0, 1.0]])
pun = Q @ K.T / np.sqrt(2)
pesos = np.exp(pun) / np.exp(pun).sum(axis=1, keepdims=True)
print(pesos.round(3))`,
      lines: [
        "NumPy.",
        "Consultas de dos tokens.",
        "Claves de los dos tokens.",
        "Afinidades escaladas por √d.",
        "Softmax por filas.",
        "Cada fila suma 1: cuánto mira cada token a cada uno.",
      ],
    },
    challenge: [
      "1. `softmax(x, eje=-1)`: softmax estable (resta el máximo a lo largo del eje).",
      "2. `mascara_causal(n)`: matriz booleana n × n, True donde la posición i puede mirar a j (j ≤ i).",
      "3. `atencion(Q, K, V, mascara=None)`: tupla (salida, pesos). Donde la máscara sea False, la afinidad pasa a −∞ antes de la softmax.",
      "4. `multi_cabeza(X, Wq, Wk, Wv, Wo, cabezas, causal=False)`: proyecta X con Wq, Wk y Wv (d_modelo × d_modelo), divide las columnas en `cabezas` bloques iguales, aplica `atencion` a cada uno, concatena las salidas y multiplica por Wo.",
    ],
    starter: py`import numpy as np

def softmax(x, eje=-1):
    return np.exp(x) / np.exp(x).sum()

def mascara_causal(n):
    return np.ones((n, n), dtype=bool)

def atencion(Q, K, V, mascara=None):
    pesos = softmax(Q @ K.T)
    return pesos @ V, pesos

def multi_cabeza(X, Wq, Wk, Wv, Wo, cabezas, causal=False):
    return X`,
    solution: py`import numpy as np

def softmax(x, eje=-1):
    x = np.asarray(x, dtype=float)
    e = np.exp(x - x.max(axis=eje, keepdims=True))
    return e / e.sum(axis=eje, keepdims=True)

def mascara_causal(n):
    return np.tril(np.ones((n, n), dtype=bool))

def atencion(Q, K, V, mascara=None):
    puntuaciones = Q @ K.T / np.sqrt(Q.shape[-1])
    if mascara is not None:
        puntuaciones = np.where(mascara, puntuaciones, -np.inf)
    pesos = softmax(puntuaciones, eje=-1)
    return pesos @ V, pesos

def multi_cabeza(X, Wq, Wk, Wv, Wo, cabezas, causal=False):
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    dh = Q.shape[1] // cabezas
    mascara = mascara_causal(len(X)) if causal else None
    salidas = [atencion(Q[:, i * dh:(i + 1) * dh], K[:, i * dh:(i + 1) * dh], V[:, i * dh:(i + 1) * dh], mascara)[0] for i in range(cabezas)]
    return np.concatenate(salidas, axis=1) @ Wo`,
    tests: py`
import numpy as np

def test_softmax():
    "Estable y normalizada"
    s = t.get("softmax", "function")
    x = np.array([[1000.0, 1001.0, 1002.0], [0.0, 0.0, 0.0]])
    r = s(x)
    assert np.all(np.isfinite(r)) and np.allclose(r.sum(axis=1), 1)
    assert np.allclose(r[0], s(np.array([0.0, 1.0, 2.0]))) and np.allclose(r[1], 1 / 3)
    assert np.allclose(s(x, eje=0).sum(axis=0), 1)

def test_atencion():
    "Pesos por filas y media ponderada de V"
    rng = np.random.default_rng(0)
    Q, K, V = rng.normal(size=(5, 4)), rng.normal(size=(5, 4)), rng.normal(size=(5, 3))
    out, w = t.get("atencion", "function")(Q, K, V)
    p = np.exp(Q @ K.T / 2); p /= p.sum(axis=1, keepdims=True)
    assert np.allclose(w, p) and np.allclose(out, p @ V) and out.shape == (5, 3)

def test_mascara_causal():
    "No se mira al futuro"
    m = t.get("mascara_causal", "function")(4)
    assert m.dtype == bool and m[2, 1] and m[2, 2] and not m[1, 2] and m.sum() == 10
    rng = np.random.default_rng(1)
    Q, K, V = rng.normal(size=(6, 4)), rng.normal(size=(6, 4)), rng.normal(size=(6, 2))
    out, w = t.get("atencion", "function")(Q, K, V, t.get("mascara_causal", "function")(6))
    assert np.allclose(np.triu(w, 1), 0)
    K2, V2 = K.copy(), V.copy()
    K2[4:], V2[4:] = rng.normal(size=(2, 4)), rng.normal(size=(2, 2))
    out2, _ = t.get("atencion", "function")(Q, K2, V2, t.get("mascara_causal", "function")(6))
    assert np.allclose(out[:4], out2[:4]), "Cambiar tokens futuros no debe alterar las salidas anteriores"

def test_multi_cabeza():
    "Varias cabezas = atención por bloques concatenada"
    rng = np.random.default_rng(2)
    X = rng.normal(size=(5, 8))
    W = [rng.normal(size=(8, 8)) / 3 for _ in range(4)]
    out = t.get("multi_cabeza", "function")(X, *W, 2)
    Q, K, V = X @ W[0], X @ W[1], X @ W[2]
    def att(q, k, v):
        p = np.exp(q @ k.T / 2); p /= p.sum(axis=1, keepdims=True); return p @ v
    ref = np.concatenate([att(Q[:, :4], K[:, :4], V[:, :4]), att(Q[:, 4:], K[:, 4:], V[:, 4:])], axis=1) @ W[3]
    assert out.shape == (5, 8) and np.allclose(out, ref)
    perm = rng.permutation(5)
    assert np.allclose(t.get("multi_cabeza", "function")(X[perm], *W, 2), out[perm]), "Sin máscara, permutar los tokens permuta las salidas"
`,
    hints: [
      "softmax: `e = np.exp(x - x.max(axis=eje, keepdims=True))` y divide entre `e.sum(axis=eje, keepdims=True)`.",
      "Máscara causal: `np.tril(np.ones((n, n), dtype=bool))`. En la atención: `np.where(mascara, puntuaciones, -np.inf)`.",
      "Varias cabezas: dh = d_modelo // cabezas; la cabeza i usa las columnas `i*dh:(i+1)*dh` de Q, K y V.",
    ],
    errors: [
      { error: "Calcular la softmax sobre toda la matriz", fix: "Cada fila (cada token que mira) debe sumar 1 por separado: usa axis=-1 y keepdims." },
      { error: "Olvidar dividir por √d", fix: "Con dimensiones grandes los productos escalares crecen, la softmax se satura y los gradientes se anulan." },
      { error: "Aplicar la máscara poniendo 0 en las afinidades", fix: "e⁰ = 1: seguiría habiendo peso. Hay que poner −∞ para que el peso sea exactamente 0." },
    ],
    quiz: {
      question: "Sin codificación de posición, ¿qué le pasa a la atención si se reordenan las palabras de una frase?",
      options: [
        { text: "Las salidas se reordenan igual pero no cambian: la atención por sí sola no sabe el orden, por eso los transformers añaden información posicional" },
        { text: "El modelo detecta el cambio de orden automáticamente gracias a la softmax" },
        { text: "Las salidas cambian de forma impredecible" },
        { text: "La atención deja de funcionar" },
      ],
      answer: 0,
      explanation: "La atención sin máscara es equivariante a permutaciones (lo comprueba la última prueba). «El perro muerde al hombre» y «el hombre muerde al perro» serían indistinguibles sin codificar posiciones.",
    },
    review: "Repasa: Q, K, V; softmax(QKᵀ/√d) por filas; −∞ para enmascarar; varias cabezas = atención por bloques concatenada.",
    xp: 110,
    coins: 16,
  },
  {
    id: "ai-equidad",
    world: "w7",
    zone: "Aplicaciones",
    title: "La balanza de la justicia: sesgos y métricas de equidad",
    kind: "lesson",
    difficulty: 4,
    skills: ["equidad", "uso-responsable", "metricas", "evaluacion"],
    requires: ["ai-seguridad", "ml-metricas"],
    story: "El banco del reino usa un modelo para conceder préstamos. Funciona bien en promedio… pero los vecinos de un barrio se quejan de que casi nunca les aprueban nada. Te piden auditar el modelo.",
    objective: "Medir el comportamiento de un clasificador por grupos (tasa de aprobación, TPR, FPR, precisión), calcular métricas de equidad y ver los compromisos al ajustar umbrales por grupo.",
    before: ["Matriz de confusión y TPR/FPR (ml-metricas)", "Uso responsable (ai-seguridad)", "pandas"],
    packages: ["numpy", "pandas"],
    intuition: [
      "Un modelo puede ser exacto en promedio y tratar peor a un grupo. Se audita **desglosando las métricas por grupo**:",
      "",
      "- **Tasa de selección**: P(aprobar). Su diferencia entre grupos es la **diferencia de paridad demográfica**.",
      "- **TPR** (tasa de verdaderos positivos): de los que sí devolverían el préstamo, a cuántos se aprueba. Su diferencia es la de **igualdad de oportunidades**.",
      "- **FPR** y **precisión** por grupo.",
      "",
      "Si los grupos tienen **tasas base distintas** (porcentaje real de positivos), es matemáticamente imposible igualar a la vez todas las métricas (salvo con un modelo perfecto). Elegir cuál priorizar es una decisión **ética y legal**, no técnica.",
      "",
      "Ajustar un **umbral por grupo** puede igualar la TPR, pero cambia otras métricas. Además, usar el grupo para decidir puede estar prohibido; las alternativas incluyen mejorar los datos del grupo peor representado.",
    ],
    formal: "TPR_g = P(ŷ = 1 | y = 1, G = g) · Paridad: |P(ŷ = 1 | A) − P(ŷ = 1 | B)| · Igualdad de oportunidades: |TPR_A − TPR_B|",
    example: {
      code: py`import numpy as np
y = np.array([1, 1, 0, 0, 1, 1, 0, 0])
pred = np.array([1, 1, 0, 0, 1, 0, 0, 0])
grupo = np.array(["A"] * 4 + ["B"] * 4)
for g in ["A", "B"]:
    m = grupo == g
    print(g, pred[m].mean(), pred[m & (y == 1)].mean())`,
      lines: [
        "NumPy.",
        "Quién devolvería el préstamo (1) y quién no.",
        "Decisión del modelo.",
        "A qué grupo pertenece cada persona.",
        "Para cada grupo…",
        "…seleccionamos sus filas…",
        "…y mostramos su tasa de aprobación y su TPR: A 0,5 y 1,0; B 0,25 y 0,5.",
      ],
    },
    challenge: [
      "El código inicial simula 4000 solicitudes con `grupo` (A o B), `y` (devolvería el préstamo) y `puntuacion` del modelo; el grupo B está peor representado en los datos con los que se construyó la puntuación.",
      "1. `tasas_por_grupo(y, pred, grupo)`: DataFrame indexado por grupo con `n`, `tasa_base` (media de y), `seleccion`, `tpr`, `fpr` y `precision`.",
      "2. `pred = puntuacion >= 0.5` y `tabla = tasas_por_grupo(y, pred, grupo)`.",
      "3. `paridad` = |selección A − selección B| e `igualdad_oportunidades` = |TPR A − TPR B|.",
      "4. `umbral_para_tpr(puntuacion, y, objetivo=0.8)`: el **mayor** umbral de la rejilla `np.round(np.arange(0.05, 0.96, 0.01), 2)` cuya TPR es ≥ objetivo.",
      "5. `umbrales`: diccionario grupo → umbral para TPR 0,8 en ese grupo; `pred_ajustada` y `tabla_ajustada` con esos umbrales.",
    ],
    starter: py`import numpy as np
import pandas as pd

rng = np.random.default_rng(7)
n = 4000
grupo = np.where(rng.random(n) < 0.7, "A", "B")
y = (rng.random(n) < np.where(grupo == "A", 0.6, 0.45)).astype(int)
ruido = np.where(grupo == "A", 0.18, 0.28)
puntuacion = np.clip(0.5 + (y - 0.5) * 0.35 - np.where(grupo == "B", 0.08, 0) + rng.normal(0, ruido), 0, 1)

def tasas_por_grupo(y, pred, grupo):
    return pd.DataFrame()

pred = puntuacion >= 0.5
tabla = tasas_por_grupo(y, pred, grupo)
paridad = igualdad_oportunidades = 0

def umbral_para_tpr(puntuacion, y, objetivo=0.8):
    return 0.5

umbrales = {}
pred_ajustada = pred
tabla_ajustada = tabla`,
    solution: py`import numpy as np
import pandas as pd

rng = np.random.default_rng(7)
n = 4000
grupo = np.where(rng.random(n) < 0.7, "A", "B")
y = (rng.random(n) < np.where(grupo == "A", 0.6, 0.45)).astype(int)
ruido = np.where(grupo == "A", 0.18, 0.28)
puntuacion = np.clip(0.5 + (y - 0.5) * 0.35 - np.where(grupo == "B", 0.08, 0) + rng.normal(0, ruido), 0, 1)

def tasas_por_grupo(y, pred, grupo):
    y, pred, grupo = np.asarray(y), np.asarray(pred).astype(bool), np.asarray(grupo)
    filas = {}
    for g in np.unique(grupo):
        m = grupo == g
        yg, pg = y[m], pred[m]
        filas[g] = {
            "n": int(m.sum()),
            "tasa_base": yg.mean(),
            "seleccion": pg.mean(),
            "tpr": pg[yg == 1].mean(),
            "fpr": pg[yg == 0].mean(),
            "precision": yg[pg].mean() if pg.any() else float("nan"),
        }
    return pd.DataFrame(filas).T

pred = puntuacion >= 0.5
tabla = tasas_por_grupo(y, pred, grupo)
paridad = abs(tabla.loc["A", "seleccion"] - tabla.loc["B", "seleccion"])
igualdad_oportunidades = abs(tabla.loc["A", "tpr"] - tabla.loc["B", "tpr"])

def umbral_para_tpr(puntuacion, y, objetivo=0.8):
    positivos = np.asarray(puntuacion)[np.asarray(y) == 1]
    validos = [u for u in np.round(np.arange(0.05, 0.96, 0.01), 2) if (positivos >= u).mean() >= objetivo]
    return float(max(validos))

umbrales = {g: umbral_para_tpr(puntuacion[grupo == g], y[grupo == g]) for g in ("A", "B")}
pred_ajustada = puntuacion >= np.where(grupo == "A", umbrales["A"], umbrales["B"])
tabla_ajustada = tasas_por_grupo(y, pred_ajustada, grupo)`,
    tests: py`
import numpy as np

def test_tasas():
    "Métricas por grupo"
    f = t.get("tasas_por_grupo", "function")
    y = np.array([1, 1, 0, 0, 1, 1, 0, 0])
    p = np.array([1, 1, 0, 0, 1, 0, 1, 0])
    g = np.array(["A"] * 4 + ["B"] * 4)
    tb = f(y, p, g)
    assert list(tb.index) == ["A", "B"]
    assert approx(tb.loc["B", "seleccion"], 0.5) and approx(tb.loc["B", "tpr"], 0.5) and approx(tb.loc["B", "fpr"], 0.5)
    assert approx(tb.loc["B", "precision"], 0.5) and approx(tb.loc["A", "tasa_base"], 0.5) and tb.loc["A", "n"] == 4

def test_auditoria():
    "Diferencias entre grupos con el umbral único"
    tb = t.get("tabla")
    assert tb.loc["B", "tpr"] < tb.loc["A", "tpr"] - 0.1, "El grupo B recibe menos aprobaciones merecidas"
    assert approx(t.get("paridad"), abs(tb.loc["A", "seleccion"] - tb.loc["B", "seleccion"]))
    assert approx(t.get("igualdad_oportunidades"), abs(tb.loc["A", "tpr"] - tb.loc["B", "tpr"]))

def test_umbral():
    "Mayor umbral con TPR suficiente"
    f = t.get("umbral_para_tpr", "function")
    s = np.array([0.9, 0.8, 0.7, 0.6, 0.3])
    y = np.array([1, 1, 1, 1, 0])
    assert approx(f(s, y, 0.75), 0.7) and approx(f(s, y, 1.0), 0.6)

def test_ajuste():
    "Umbrales por grupo igualan la TPR, con costes"
    u = t.get("umbrales")
    ta = t.get("tabla_ajustada")
    assert u["B"] < u["A"]
    assert abs(ta.loc["A", "tpr"] - ta.loc["B", "tpr"]) < 0.03 and min(ta["tpr"]) >= 0.8
    assert ta.loc["B", "fpr"] > t.get("tabla").loc["B", "fpr"], "Igualar la TPR sube los falsos positivos de B"
`,
    hints: [
      "Para cada grupo g: `m = grupo == g`; la TPR es la media de las predicciones entre los y = 1 de ese grupo; la precisión, la media de y entre los aprobados.",
      "umbral_para_tpr: la TPR con umbral u es `(puntuacion[y == 1] >= u).mean()`. Filtra los umbrales válidos y quédate con el mayor.",
      "pred_ajustada: `puntuacion >= np.where(grupo == \"A\", umbrales[\"A\"], umbrales[\"B\"])`.",
    ],
    errors: [
      { error: "Auditar solo la exactitud global", fix: "Una exactitud alta puede esconder un grupo pequeño con errores mucho mayores." },
      { error: "Quitar la variable del grupo y dar el sesgo por resuelto", fix: "Otras variables (barrio, apellido…) pueden actuar como sustitutas del grupo." },
    ],
    quiz: {
      question: "Los grupos tienen tasas base distintas (59 % y 45 %). ¿Se pueden igualar a la vez la tasa de selección, la TPR y la precisión?",
      options: [
        { text: "En general no: con tasas base distintas, las métricas de equidad entran en conflicto y hay que decidir cuál priorizar según el contexto" },
        { text: "Sí, siempre que el modelo tenga suficiente exactitud" },
        { text: "Sí: basta con eliminar la variable grupo del modelo" },
        { text: "No importa: si el modelo es estadísticamente significativo es justo", misconception: "prediccion-vs-significacion" },
      ],
      answer: 0,
      explanation: "Es un resultado conocido (Kleinberg y otros, Chouldechova): salvo predicción perfecta o tasas base iguales, no se pueden cumplir a la vez calibración e igualdad de errores entre grupos. La elección depende de los daños de cada tipo de error y de la ley aplicable.",
    },
    review: "Repasa: desglosar por grupo; paridad demográfica frente a igualdad de oportunidades; umbrales por grupo y sus costes; la elección es ética y legal.",
    xp: 100,
    coins: 15,
  },
];
