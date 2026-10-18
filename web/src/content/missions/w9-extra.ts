import { py, type Mission } from "../types";

// Mundo 9 · rutas optativas: análisis de redes, bioinformática y estadística bayesiana avanzada.

export const W9_EXTRA: Mission[] = [
  {
    id: "mv-redes",
    world: "w9",
    zone: "Análisis de redes",
    title: "La telaraña del multiverso: grafos, caminos, centralidad y comunidades",
    kind: "lesson",
    difficulty: 3,
    skills: ["grafos", "networkx", "algoritmos", "verificacion"],
    requires: ["w2-estructuras"],
    story: "Los mensajeros del multiverso viajan entre ciudades conectadas por portales. El consejo quiere saber qué ciudades son imprescindibles, cuántos saltos separan a dos de ellas y qué grupos de ciudades forman alianzas.",
    objective: "Representar una red como lista de adyacencia y como grafo de networkx, calcular distancias con BFS propio verificado, medir grado e intermediación y detectar comunidades.",
    before: ["Diccionarios y colas (w2-estructuras)", "Recorridos en anchura", "Funciones"],
    packages: ["networkx"],
    intuition: [
      "Un **grafo** son nodos unidos por aristas. Se guarda como **lista de adyacencia**: cada nodo con sus vecinos.",
      "",
      "- **BFS** (búsqueda en anchura) explora por capas desde un origen con una cola: da el número mínimo de saltos a cada nodo.",
      "- **Grado**: número de vecinos. Mide popularidad local.",
      "- **Intermediación** (betweenness): proporción de caminos más cortos entre otros pares que pasan por el nodo. Un nodo con poco grado puede ser un **puente** imprescindible entre dos grupos.",
      "- **Comunidades**: grupos con muchas conexiones dentro y pocas hacia fuera. El algoritmo voraz de modularidad las agrupa.",
      "",
      "networkx implementa todo esto; programar el BFS y comparar con `nx.single_source_shortest_path_length` es la verificación.",
    ],
    formal: "Intermediación: C_B(v) = Σ_{s≠v≠t} σ_st(v)/σ_st (normalizada), con σ_st el número de caminos mínimos de s a t y σ_st(v) los que pasan por v.",
    example: {
      code: py`import networkx as nx
G = nx.Graph([("A", "B"), ("B", "C"), ("C", "D"), ("B", "D")])
print(dict(G.degree()))
print(nx.shortest_path(G, "A", "D"))
print(nx.betweenness_centrality(G))`,
      lines: [
        "networkx.",
        "Un grafo a partir de una lista de aristas.",
        "Grado de cada nodo: B tiene 3 vecinos.",
        "Camino más corto de A a D: A → B → D.",
        "B intercepta los caminos de A con los demás: intermediación 0,67.",
      ],
    },
    challenge: [
      "El código inicial define `ARISTAS`: dos grupos de ciudades unidos por un único puente.",
      "1. `adyacencia(aristas)`: diccionario nodo → conjunto de vecinos (grafo no dirigido).",
      "2. `bfs(ady, origen)`: diccionario nodo → número mínimo de saltos desde el origen (solo nodos alcanzables), con `collections.deque`.",
      "3. `G = nx.Graph(ARISTAS)` y `coincide`: True si `bfs` desde \"Ápice\" es igual a `nx.single_source_shortest_path_length(G, \"Ápice\")`.",
      "4. `mas_conectada`: la ciudad de mayor grado (desempate alfabético) y `puente`: la de mayor intermediación.",
      "5. `comunidades`: lista ordenada de listas ordenadas con las comunidades de `nx.community.greedy_modularity_communities(G)`.",
    ],
    starter: py`from collections import deque
import networkx as nx

ARISTAS = [
    ("Ápice", "Brasa"), ("Ápice", "Cima"), ("Brasa", "Cima"), ("Brasa", "Duna"), ("Cima", "Duna"), ("Duna", "Eco"),
    ("Ápice", "Duna"), ("Eco", "Faro"),
    ("Faro", "Gema"), ("Faro", "Hiedra"), ("Gema", "Hiedra"), ("Gema", "Isla"), ("Hiedra", "Isla"), ("Isla", "Jade"), ("Gema", "Jade"),
]

def adyacencia(aristas):
    return {}

def bfs(ady, origen):
    return {origen: 0}

G = nx.Graph(ARISTAS)
coincide = False
mas_conectada = puente = None
comunidades = []`,
    solution: py`from collections import deque
import networkx as nx

ARISTAS = [
    ("Ápice", "Brasa"), ("Ápice", "Cima"), ("Brasa", "Cima"), ("Brasa", "Duna"), ("Cima", "Duna"), ("Duna", "Eco"),
    ("Ápice", "Duna"), ("Eco", "Faro"),
    ("Faro", "Gema"), ("Faro", "Hiedra"), ("Gema", "Hiedra"), ("Gema", "Isla"), ("Hiedra", "Isla"), ("Isla", "Jade"), ("Gema", "Jade"),
]

def adyacencia(aristas):
    ady = {}
    for a, b in aristas:
        ady.setdefault(a, set()).add(b)
        ady.setdefault(b, set()).add(a)
    return ady

def bfs(ady, origen):
    dist = {origen: 0}
    cola = deque([origen])
    while cola:
        nodo = cola.popleft()
        for vecino in ady.get(nodo, ()):
            if vecino not in dist:
                dist[vecino] = dist[nodo] + 1
                cola.append(vecino)
    return dist

G = nx.Graph(ARISTAS)
coincide = bfs(adyacencia(ARISTAS), "Ápice") == dict(nx.single_source_shortest_path_length(G, "Ápice"))
grados = dict(G.degree())
mas_conectada = min(grados, key=lambda n: (-grados[n], n))
intermediacion = nx.betweenness_centrality(G)
puente = max(intermediacion, key=intermediacion.get)
comunidades = sorted(sorted(c) for c in nx.community.greedy_modularity_communities(G))`,
    tests: py`
import networkx as nx

def test_adyacencia():
    "No dirigido y sin duplicados"
    a = t.get("adyacencia", "function")([("x", "y"), ("y", "z"), ("x", "y")])
    assert a == {"x": {"y"}, "y": {"x", "z"}, "z": {"y"}}

def test_bfs():
    "Distancias mínimas, solo nodos alcanzables"
    f = t.get("bfs", "function")
    ady = {"a": {"b", "c"}, "b": {"a", "d"}, "c": {"a", "d"}, "d": {"b", "c", "e"}, "e": {"d"}, "z": set()}
    assert f(ady, "a") == {"a": 0, "b": 1, "c": 1, "d": 2, "e": 3}
    rng_g = nx.gnm_random_graph(40, 70, seed=3)
    ady2 = {n: set(rng_g.neighbors(n)) for n in rng_g.nodes}
    assert f(ady2, 0) == dict(nx.single_source_shortest_path_length(rng_g, 0))
    assert t.get("coincide") is True

def test_centralidad():
    "El puente tiene poco grado pero mucha intermediación"
    G = nx.Graph(t.get("ARISTAS"))
    g = dict(G.degree())
    assert t.get("mas_conectada") == min(g, key=lambda n: (-g[n], n))
    b = nx.betweenness_centrality(G)
    assert t.get("puente") == max(b, key=b.get) and t.get("puente") in ("Eco", "Faro")
    assert g[t.get("puente")] <= 3

def test_comunidades():
    "Las alianzas quedan separadas por el puente"
    c = t.get("comunidades")
    assert c == sorted(sorted(x) for x in nx.community.greedy_modularity_communities(nx.Graph(t.get("ARISTAS"))))
    assert all(x == sorted(x) for x in c) and len(c) >= 2
    donde = {nodo: i for i, grupo in enumerate(c) for nodo in grupo}
    assert donde["Ápice"] != donde["Jade"] and donde["Ápice"] == donde["Duna"] and donde["Jade"] == donde["Gema"]
`,
    hints: [
      "adyacencia: `ady.setdefault(a, set()).add(b)` y lo mismo al revés.",
      "BFS: empieza con `dist = {origen: 0}` y una `deque([origen])`; al sacar un nodo, añade los vecinos que aún no estén en `dist` con distancia + 1.",
      "Desempate alfabético: `min(grados, key=lambda n: (-grados[n], n))`.",
    ],
    errors: [
      { error: "Usar una lista como cola con pop(0)", fix: "Cada pop(0) mueve toda la lista (O(n)). `deque.popleft()` es O(1)." },
      { error: "Marcar como visitado al sacar de la cola en vez de al meter", fix: "Un nodo podría entrar varias veces en la cola y su distancia no sería la mínima." },
    ],
    quiz: {
      question: "La ciudad «Eco» tiene solo 2 vecinos pero la intermediación más alta (empatada con «Faro»). ¿Qué significa?",
      options: [
        { text: "Que es un puente: muchos caminos más cortos entre los dos grupos pasan por ella, y si cae, la red se parte" },
        { text: "Que es la ciudad menos importante porque tiene pocos vecinos" },
        { text: "Que hay un error: la intermediación debería ser proporcional al grado" },
        { text: "Que pertenece a las dos comunidades a la vez" },
      ],
      answer: 0,
      explanation: "Grado e intermediación miden cosas distintas: popularidad local frente a control del flujo. Los puentes con poco grado son puntos críticos (en redes eléctricas, de transporte o de contagio).",
    },
    review: "Repasa: lista de adyacencia; BFS con deque; grado frente a intermediación; comunidades por modularidad.",
    xp: 90,
    coins: 13,
  },
  {
    id: "mv-bioinformatica",
    world: "w9",
    zone: "Bioinformática",
    title: "El códice de la vida: secuencias de ADN con Python",
    kind: "lesson",
    difficulty: 2,
    skills: ["bioinformatica", "cadenas", "diccionarios", "algoritmos"],
    requires: ["py-dicts", "py-strings"],
    story: "En el archivo del multiverso se guardan los códices de la vida: cadenas de cuatro letras. Los biólogos te piden herramientas para leerlas: proporción de G y C, hebra complementaria, motivos, mutaciones y traducción a proteínas.",
    objective: "Manipular secuencias de ADN con cadenas y diccionarios: contenido GC, complementaria inversa, k-meros, búsqueda de motivos, distancia de Hamming y traducción con el código genético.",
    before: ["Cadenas (py-strings)", "Diccionarios (py-dicts)", "Bucles"],
    intuition: [
      "El ADN es una cadena con las letras **A, C, G, T**. Cada A se empareja con T y cada C con G en la hebra opuesta, que se lee en sentido contrario: la **complementaria inversa**.",
      "",
      "- **Contenido GC**: porcentaje de G y C; varía entre especies y regiones del genoma.",
      "- **k-meros**: subcadenas de longitud k; contarlas es la base de muchos algoritmos de ensamblaje.",
      "- **Motivos**: posiciones donde aparece una subcadena (pueden solaparse).",
      "- **Distancia de Hamming**: número de posiciones distintas entre dos secuencias de igual longitud (mutaciones puntuales).",
      "- **Traducción**: cada triplete (codón) codifica un aminoácido; tres codones significan «parar». El código genético cabe en una tabla de 64 entradas.",
      "",
      "Todo con cadenas y diccionarios de Python: sin bibliotecas especializadas (Biopython hace lo mismo a gran escala).",
    ],
    formal: "GC = 100·(#G + #C)/longitud · Hamming(s, t) = #{i : sᵢ ≠ tᵢ} · Codón = 3 bases → 1 aminoácido (64 codones, 20 aminoácidos + 3 de parada).",
    example: {
      code: py`adn = "ATGCGCTA"
pares = {"A": "T", "T": "A", "C": "G", "G": "C"}
print("".join(pares[b] for b in reversed(adn)))
print([adn[i:i + 3] for i in range(0, len(adn) - 2, 3)])`,
      lines: [
        "Una secuencia corta.",
        "Reglas de emparejamiento.",
        "Complementaria inversa: TAGCGCAT.",
        "Codones en el marco de lectura 0: ['ATG', 'CGC'].",
      ],
    },
    challenge: [
      "El código inicial construye `CODIGO`: diccionario codón (ADN) → aminoácido de una letra, con \"*\" para las paradas.",
      "1. `validar(seq)`: devuelve la secuencia en mayúsculas o lanza `ValueError` si contiene letras distintas de A, C, G, T.",
      "2. `contenido_gc(seq)`: porcentaje de G y C (float).",
      "3. `complementaria_inversa(seq)`.",
      "4. `contar_kmeros(seq, k)`: diccionario k-mero → número de apariciones (ventana deslizante).",
      "5. `buscar_motivo(seq, motivo)`: lista de posiciones (empezando en 1, solapadas incluidas).",
      "6. `hamming(a, b)` (`ValueError` si las longitudes difieren) y `traducir(seq)`: proteína leyendo desde el principio y deteniéndose en el primer codón de parada (acepta ARN: U se trata como T).",
    ],
    starter: py`BASES = "TCAG"
AMINO = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG"
CODIGO = {a + b + c: AMINO[16 * i + 4 * j + k] for i, a in enumerate(BASES) for j, b in enumerate(BASES) for k, c in enumerate(BASES)}

def validar(seq):
    return seq

def contenido_gc(seq):
    return 0.0

def complementaria_inversa(seq):
    return seq[::-1]

def contar_kmeros(seq, k):
    return {}

def buscar_motivo(seq, motivo):
    return []

def hamming(a, b):
    return 0

def traducir(seq):
    return ""`,
    solution: py`BASES = "TCAG"
AMINO = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG"
CODIGO = {a + b + c: AMINO[16 * i + 4 * j + k] for i, a in enumerate(BASES) for j, b in enumerate(BASES) for k, c in enumerate(BASES)}
PARES = {"A": "T", "T": "A", "C": "G", "G": "C"}

def validar(seq):
    seq = seq.upper()
    if set(seq) - set("ACGT"):
        raise ValueError("Solo se admiten A, C, G y T")
    return seq

def contenido_gc(seq):
    seq = validar(seq)
    return 100 * (seq.count("G") + seq.count("C")) / len(seq)

def complementaria_inversa(seq):
    return "".join(PARES[b] for b in reversed(validar(seq)))

def contar_kmeros(seq, k):
    cuentas = {}
    for i in range(len(seq) - k + 1):
        km = seq[i:i + k]
        cuentas[km] = cuentas.get(km, 0) + 1
    return cuentas

def buscar_motivo(seq, motivo):
    return [i + 1 for i in range(len(seq) - len(motivo) + 1) if seq[i:i + len(motivo)] == motivo]

def hamming(a, b):
    if len(a) != len(b):
        raise ValueError("Las secuencias deben tener la misma longitud")
    return sum(x != y for x, y in zip(a, b))

def traducir(seq):
    seq = validar(seq.upper().replace("U", "T"))
    proteina = []
    for i in range(0, len(seq) - 2, 3):
        aa = CODIGO[seq[i:i + 3]]
        if aa == "*":
            break
        proteina.append(aa)
    return "".join(proteina)`,
    tests: py`
def test_gc():
    "Contenido GC (ejemplo de Rosalind)"
    s = "CCACCCTCGTGGTATGGCTAGGCATTCAGGAACCGGAGAACGCTTCAGACCAGCCCGGACTGGGAACCTGCGGGCAGTAGGTGGAAT"
    assert abs(t.get("contenido_gc", "function")(s) - 60.919540) < 1e-5
    assert t.get("contenido_gc", "function")("gcat") == 50.0

def test_validar():
    "Solo ACGT"
    v = t.get("validar", "function")
    assert v("acgt") == "ACGT"
    for mala in ("ACGU", "ACGTN", "hola"):
        try:
            v(mala)
        except ValueError:
            continue
        assert False, f"{mala} debería lanzar ValueError"

def test_complementaria():
    "Complementaria inversa"
    f = t.get("complementaria_inversa", "function")
    assert f("AAAACCCGGT") == "ACCGGGTTTT" and f(f("GATTACA")) == "GATTACA"

def test_kmeros_motivos():
    "Ventanas solapadas"
    assert t.get("contar_kmeros", "function")("AAAT", 2) == {"AA": 2, "AT": 1}
    assert t.get("buscar_motivo", "function")("GATATATGCATATACTT", "ATAT") == [2, 4, 10]

def test_hamming():
    "Mutaciones puntuales"
    assert t.get("hamming", "function")("GAGCCTACTAACGGGAT", "CATCGTAATGACGGCCT") == 7
    try:
        t.get("hamming", "function")("AC", "A")
    except ValueError:
        return
    assert False

def test_traducir():
    "Código genético (ejemplo de Rosalind)"
    f = t.get("traducir", "function")
    assert f("AUGGCCAUGGCGCCCAGAACUGAGAUCAAUAGUACCCGUAUUAACGGGUGA") == "MAMAPRTEINSTRING"
    assert f("ATGTAAGGG") == "M"
`,
    hints: [
      "validar: `set(seq) - set(\"ACGT\")` no vacío significa que hay letras no válidas.",
      "Complementaria: recorre `reversed(seq)` y sustituye cada base con un diccionario.",
      "Traducir: recorre en saltos de 3 con `range(0, len(seq) - 2, 3)` y para con `break` al encontrar \"*\".",
    ],
    errors: [
      { error: "Usar str.find o str.count para los motivos", fix: "No encuentran apariciones solapadas: «ATATAT» contiene «ATAT» dos veces." },
      { error: "Invertir sin complementar (o al revés)", fix: "La otra hebra es complementaria y antiparalela: hacen falta las dos operaciones." },
    ],
    quiz: {
      question: "Dos secuencias de genes de 1000 bases tienen distancia de Hamming 12. ¿Qué puedes decir?",
      options: [
        { text: "Que difieren en 12 posiciones (≈ 1,2 %) suponiendo que están alineadas y sin inserciones ni deleciones" },
        { text: "Que sus proteínas difieren exactamente en 12 aminoácidos" },
        { text: "Que una de ellas tiene 12 bases más" },
        { text: "Que pertenecen a especies distintas" },
      ],
      answer: 0,
      explanation: "Hamming solo cuenta sustituciones en secuencias de igual longitud. Varias mutaciones pueden caer en el mismo codón o ser sinónimas (no cambian el aminoácido). Con inserciones o deleciones hace falta alineamiento (distancia de edición).",
    },
    review: "Repasa: validar entradas; complementaria inversa; ventanas deslizantes para k-meros y motivos; Hamming; traducción por codones.",
    xp: 70,
    coins: 10,
  },
  {
    id: "mv-bayes-jerarquico",
    world: "w9",
    zone: "Estadística bayesiana avanzada",
    title: "El consejo de los hospitales: Bayes empírico y contracción",
    kind: "lesson",
    difficulty: 5,
    skills: ["estadistica-bayesiana", "modelos-jerarquicos", "simulacion", "estimacion"],
    requires: ["b-beta-binomial", "ec-simulacion"],
    story: "El consejo de sanidad publica la tasa de complicaciones de 30 hospitales. Uno pequeño, con 2 complicaciones en 8 operaciones, aparece como el peor del reino. ¿Es justo? Con tan pocos datos, su tasa cruda es poco fiable: la estadística jerárquica lo corrige.",
    objective: "Estimar una distribución previa Beta a partir de todos los hospitales (Bayes empírico), calcular las medias e intervalos posteriores de cada uno, medir la contracción hacia la media y comprobar con la simulación que reduce el error.",
    before: ["Modelo Beta-Binomial (b-beta-binomial)", "Simulación Monte Carlo (ec-simulacion)", "Método de los momentos"],
    packages: ["numpy", "scipy"],
    intuition: [
      "Cada hospital tiene su tasa verdadera θᵢ, pero las tasas se parecen entre sí: provienen de una distribución común, una Beta(α, β). Es un **modelo jerárquico**.",
      "",
      "**Bayes empírico**: estimamos α y β con todos los hospitales y usamos esa Beta como previa de cada uno. La posterior de cada hospital es Beta(α + kᵢ, β + nᵢ − kᵢ) y su media es un promedio ponderado entre su tasa cruda y la media global.",
      "",
      "- Hospitales con **pocos casos** se **contraen** mucho hacia la media (su tasa cruda es muy ruidosa).",
      "- Hospitales con **muchos casos** apenas se mueven.",
      "",
      "Para estimar α y β por **momentos**: la varianza de las tasas crudas mezcla la variación real entre hospitales y el ruido binomial (p̄(1 − p̄)/nᵢ). Restando el ruido queda la variación real; con media y varianza se despejan α y β.",
      "",
      "Como en la simulación conocemos las tasas verdaderas, podemos **comprobar** que las estimaciones contraídas se equivocan menos (es el fenómeno de Stein). Ojo: la garantía es **en promedio**. En una muestra concreta la contracción puede perder (la del código inicial es uno de esos casos); por eso se repite la simulación muchas veces.",
    ],
    formal: [
      "θᵢ ~ Beta(α, β), kᵢ | θᵢ ~ Binomial(nᵢ, θᵢ) ⇒ θᵢ | kᵢ ~ Beta(α + kᵢ, β + nᵢ − kᵢ)",
      "",
      "E[θᵢ | kᵢ] = wᵢ·m + (1 − wᵢ)·kᵢ/nᵢ, con m = α/(α + β) y peso de la previa wᵢ = (α + β)/(α + β + nᵢ)",
      "",
      "Momentos de la Beta: α + β = m(1 − m)/v − 1, α = m·(α + β).",
    ],
    example: {
      code: py`a, b = 6, 54
k, n = 2, 8
media_post = (a + k) / (a + b + n)
peso_previa = (a + b) / (a + b + n)
print(round(k / n, 3), round(media_post, 3), round(peso_previa, 3))`,
      lines: [
        "Previa Beta(6, 54): media 0,10, equivale a 60 casos.",
        "Un hospital con 2 complicaciones en 8 operaciones.",
        "Media posterior.",
        "Peso de la previa en la estimación.",
        "Tasa cruda 0,25, posterior 0,118: con 8 casos, la previa pesa el 88 %.",
      ],
    },
    challenge: [
      "El código inicial simula 30 hospitales: `theta` (tasas verdaderas, desconocidas en la práctica), `n` (operaciones) y `k` (complicaciones).",
      "1. `crudas = k / n`.",
      "2. `beta_por_momentos(m, v)`: tupla (α, β) con media m y varianza v (`ValueError` si v ≤ 0 o v ≥ m(1 − m)).",
      "3. `ajustar_previa(k, n)`: m = Σk/Σn; v = varianza de las tasas crudas (ddof = 0) menos la media de m(1 − m)/nᵢ, con un mínimo de 1e-6; devuelve (α, β).",
      "4. `posterior(k, n, a, b)`: diccionario con `media`, `inf` y `sup` (cuantiles 2,5 % y 97,5 % de la Beta posterior con `stats.beta.ppf`) y `peso_previa`, como arrays.",
      "5. `a, b = ajustar_previa(k, n)`, `post = posterior(k, n, a, b)`, `ecm_crudas` y `ecm_posteriores` (error cuadrático medio frente a `theta` en esta muestra) y `cobertura` (proporción de θ verdaderos dentro de su intervalo).",
      "6. `simular_ecm(reps=500, semilla=0)`: repite `reps` veces la simulación del código inicial (con un generador `np.random.default_rng(semilla)` y, en cada repetición, θ, n y k en ese orden) y devuelve {\"crudas\", \"posteriores\", \"prop_gana\"}: los ECM medios y la proporción de repeticiones en que la contracción gana. Y `resumen = simular_ecm()`.",
    ],
    starter: py`import numpy as np
from scipy import stats

rng = np.random.default_rng(11)
theta = rng.beta(8, 72, size=30)
n = rng.integers(8, 400, size=30)
k = rng.binomial(n, theta)

crudas = k / n

def beta_por_momentos(m, v):
    return 1.0, 1.0

def ajustar_previa(k, n):
    return 1.0, 1.0

def posterior(k, n, a, b):
    return {}

a, b = ajustar_previa(k, n)
post = posterior(k, n, a, b)
ecm_crudas = ecm_posteriores = cobertura = 0

def simular_ecm(reps=500, semilla=0):
    return {"crudas": 0, "posteriores": 0, "prop_gana": 0}

resumen = simular_ecm()`,
    solution: py`import numpy as np
from scipy import stats

rng = np.random.default_rng(11)
theta = rng.beta(8, 72, size=30)
n = rng.integers(8, 400, size=30)
k = rng.binomial(n, theta)

crudas = k / n

def beta_por_momentos(m, v):
    if v <= 0 or v >= m * (1 - m):
        raise ValueError("La varianza debe estar entre 0 y m(1 − m)")
    s = m * (1 - m) / v - 1
    return m * s, (1 - m) * s

def ajustar_previa(k, n):
    k, n = np.asarray(k), np.asarray(n)
    m = k.sum() / n.sum()
    v = np.var(k / n) - np.mean(m * (1 - m) / n)
    return beta_por_momentos(m, max(v, 1e-6))

def posterior(k, n, a, b):
    k, n = np.asarray(k), np.asarray(n)
    a_post, b_post = a + k, b + n - k
    return {
        "media": a_post / (a_post + b_post),
        "inf": stats.beta.ppf(0.025, a_post, b_post),
        "sup": stats.beta.ppf(0.975, a_post, b_post),
        "peso_previa": (a + b) / (a + b + n),
    }

a, b = ajustar_previa(k, n)
post = posterior(k, n, a, b)
ecm_crudas = np.mean((crudas - theta) ** 2)
ecm_posteriores = np.mean((post["media"] - theta) ** 2)
cobertura = np.mean((post["inf"] <= theta) & (theta <= post["sup"]))

def simular_ecm(reps=500, semilla=0):
    rng = np.random.default_rng(semilla)
    ecm_c, ecm_p = [], []
    for _ in range(reps):
        th = rng.beta(8, 72, size=30)
        nn = rng.integers(8, 400, size=30)
        kk = rng.binomial(nn, th)
        aa, bb = ajustar_previa(kk, nn)
        ecm_c.append(np.mean((kk / nn - th) ** 2))
        ecm_p.append(np.mean(((aa + kk) / (aa + bb + nn) - th) ** 2))
    ecm_c, ecm_p = np.array(ecm_c), np.array(ecm_p)
    return {"crudas": ecm_c.mean(), "posteriores": ecm_p.mean(), "prop_gana": np.mean(ecm_p < ecm_c)}

resumen = simular_ecm()`,
    tests: py`
import numpy as np
from scipy import stats

def test_momentos():
    "Método de los momentos"
    f = t.get("beta_por_momentos", "function")
    a, b = f(0.2, 0.0016)
    assert approx(a / (a + b), 0.2) and approx(stats.beta.var(a, b), 0.0016)
    for v in (0, 0.2 * 0.8):
        try:
            f(0.2, v)
        except ValueError:
            continue
        assert False

def test_previa():
    "Varianza real = varianza observada − ruido binomial"
    k, n = t.get("k"), t.get("n")
    m = k.sum() / n.sum()
    v = max(np.var(k / n) - np.mean(m * (1 - m) / n), 1e-6)
    a, b = t.get("ajustar_previa", "function")(k, n)
    assert approx(a / (a + b), m) and approx(stats.beta.var(a, b), v, 1e-6)

def test_posterior():
    "Beta posterior conjugada"
    p = t.get("posterior", "function")(np.array([2, 30]), np.array([8, 300]), 6.0, 54.0)
    assert np.allclose(p["media"], [8 / 68, 36 / 360]) and np.allclose(p["peso_previa"], [60 / 68, 60 / 360])
    assert np.allclose(p["inf"], stats.beta.ppf(0.025, [8, 36], [60, 324]))

def test_contraccion():
    "Los hospitales pequeños se mueven más hacia la media"
    n, w = t.get("n"), t.get("post")["peso_previa"]
    assert w[np.argmin(n)] > w[np.argmax(n)]
    crudas, media = t.get("crudas"), t.get("post")["media"]
    m = t.get("k").sum() / n.sum()
    assert np.all(np.abs(media - m) <= np.abs(crudas - m) + 1e-12), "Cada media posterior está entre su tasa cruda y la media global"

def test_muestra():
    "Errores en la muestra simulada"
    assert approx(t.get("ecm_crudas"), np.mean((t.get("crudas") - t.get("theta")) ** 2))
    assert approx(t.get("ecm_posteriores"), np.mean((t.get("post")["media"] - t.get("theta")) ** 2))
    assert 0.7 <= t.get("cobertura") <= 1

def test_simulacion():
    "En promedio, la contracción reduce el error"
    r = t.get("simular_ecm", "function")(200, 3)
    rng = np.random.default_rng(3)
    th = rng.beta(8, 72, size=30); nn = rng.integers(8, 400, size=30); kk = rng.binomial(nn, th)
    assert r["crudas"] > 0 and r["posteriores"] < 0.7 * r["crudas"] and r["prop_gana"] > 0.8
    res = t.get("resumen")
    assert res["posteriores"] < res["crudas"] and 0.8 < res["prop_gana"] < 1
`,
    hints: [
      "Momentos: s = m(1 − m)/v − 1 = α + β; α = m·s, β = (1 − m)·s.",
      "ajustar_previa: `np.var(k / n) - np.mean(m * (1 - m) / n)`; si sale negativa (poca variación real), usa 1e-6.",
      "posterior: con arrays de NumPy, `a + k` y `b + n - k` se calculan para todos los hospitales a la vez; `stats.beta.ppf` también acepta arrays.",
      "simular_ecm: dentro del bucle genera `th = rng.beta(8, 72, size=30)`, `nn = rng.integers(8, 400, size=30)` y `kk = rng.binomial(nn, th)`, usa `ajustar_previa` y calcula solo la media posterior (a + k)/(a + b + n): los cuantiles de la Beta no hacen falta y son lentos en el navegador.",
    ],
    errors: [
      { error: "Ordenar hospitales por su tasa cruda", fix: "Los extremos de la clasificación los ocupan los hospitales pequeños por puro azar. Usa las posteriores (y sus intervalos)." },
      { error: "Usar la varianza de las tasas crudas como varianza real entre hospitales", fix: "Incluye el ruido binomial: sobrestimarías la heterogeneidad y contraerías demasiado poco." },
    ],
    quiz: {
      question: "Un hospital con 2 complicaciones en 8 operaciones (25 %) pasa a una media posterior del 12 % (con la previa del ejemplo). ¿Es manipular los datos?",
      options: [
        { text: "No: con 8 casos el 25 % es muy incierto; la posterior combina sus datos con lo que se sabe de hospitales similares y se equivoca menos en promedio" },
        { text: "Sí: la tasa verdadera del hospital es exactamente el 25 %", misconception: "ic-interpretacion" },
        { text: "Sí: Bayes siempre da el resultado que quiere quien elige la previa" },
        { text: "No, porque el valor p del hospital es mayor que 0,05", misconception: "p-valor" },
      ],
      answer: 0,
      explanation: "La previa se estima con los datos de todos los hospitales (no se inventa) y la simulación muestra que el error cuadrático baja. Con más operaciones, los datos propios del hospital pesarían más.",
    },
    lab: { lab: "estadistica", tab: "bayes", label: "Actualización bayesiana" },
    review: "Repasa: modelo jerárquico Beta-Binomial; previa por momentos descontando el ruido binomial; contracción según n; validación por simulación.",
    xp: 110,
    coins: 16,
  },
];
