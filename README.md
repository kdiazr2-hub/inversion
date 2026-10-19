# Python Quest

Un videojuego RPG para aprender **Python, matemáticas, probabilidad, estadística, ciencia de datos, machine learning e inteligencia artificial** escribiendo código real.

- 9 mundos, **207 misiones** con historia, intuición, explicación formal, ejemplo ejecutable explicado línea a línea, reto con pruebas automáticas, pistas progresivas, errores frecuentes, solución de referencia, pregunta de interpretación, reto avanzado opcional y recomendación de repaso.
- **17 proyectos progresivos de 4 etapas**: juego de preguntas (banco JSON validado, partidas con semilla y repaso con cajas de Leitner), calculadora científica (analizador de expresiones sin eval, funciones por series y Newton verificadas contra math, derivadas, Simpson y raíces), simulador de probabilidades, observatorio de la incertidumbre (cobertura exacta de intervalos, t frente a bootstrap, Bayes beta-binomial y test A/B), analizador de gastos (extracto bancario con formato español, categorías, pagos recurrentes, atípicos y presupuesto), planta de datos (pipeline automatizado con validación y cuarentena, almacén SQLite con upsert, orquestador con reintentos, carga incremental y alertas de calidad), explorador de datos públicos (conjunto Wine de UCI: verificación de su documentación, ANOVA con Holm y PCA hecho a mano), estudio de correlación y regresión (inventario forestal: limpieza, ley de potencias en log-log, influencia, confusión por especie, validación cruzada y predicción en metros), ensayo clínico, detector de anomalías, tasador de viviendas, clasificador de texto, oráculo del manual (asistente RAG con BM25 a mano, evaluación con recall@k y MRR, fusión de rankings, citas, abstención calibrada y filtro de inyecciones), servicio de predicción (modelo versionado, validación con pydantic, manejador HTTP probado, Dockerfile, app FastAPI y vigilancia de deriva) pronóstico de demanda y recomendador de películas (líneas base, vecinos, factorización ALS, métricas de ranking frente a popularidad y arranque en frío) y laboratorio del péndulo, una aplicación científica (incertidumbres, ajuste ponderado con χ², propagación por Monte Carlo, corrección de un sistemático y una herramienta de línea de órdenes que exporta JSON, Markdown y la figura). Cada etapa es una misión con sus pruebas y empieza con el código que escribiste en la anterior. Además, 6 proyectos integradores de una etapa.
- **Gimnasio de práctica**: 41 ejercicios cortos (fundamentos, recursión, clases, generadores, expresiones regulares, NumPy, pandas, porcentajes, estadística descriptiva, probabilidad, distribuciones, intervalos, correlación, regresión y medidas clínicas), cada uno con **40 variantes** que cambian los datos, la regla o la redacción. Se abren al completar la misión del concepto, hay sesiones rápidas que mezclan temas y los repasos pendientes pueden hacerse con una variante nueva en lugar de repetir la misma misión. Las 1640 variantes se validan en CI: la solución de referencia pasa, el código inicial no y el ejemplo del enunciado es uno de los casos de prueba.
- El **Imperio de las Matemáticas y la Estadística** tiene 12 zonas y 72 misiones, incluida la zona de **estadística computacional**: cada técnica se implementa a mano y se verifica contra SciPy/statsmodels.
- **Python real en el navegador** con [Pyodide](https://pyodide.org) (CPython compilado a WebAssembly) dentro de un Web Worker: numpy, pandas, scipy, statsmodels, scikit-learn, matplotlib y sqlite3. Sin servidor y sin cuenta.
- Rutas de IA (diferenciación automática, atención de los transformers, equidad), ingeniería (Pydantic, arquitectura en capas) y optativas del Multiverso (redes, bioinformática, Bayes jerárquico, finanzas, optimización, recomendadores, series temporales).
- Gamificación: XP, niveles, monedas, tienda de cosméticos (nunca respuestas), logros, rachas con días de descanso y pausas, personaje pixel-art personalizable y mascotas.
- Repaso espaciado (tipo SM-2), detección de errores conceptuales (p. ej. «el valor p es la probabilidad de H₀»), dominio estimado por habilidad.
- Laboratorios interactivos: estadístico (11 simuladores), **matemático** (derivadas, descenso de gradiente, transformaciones lineales, integración numérica), datos (pandas sobre datasets sintéticos), machine learning (fronteras de clasificación, sobreajuste en regresión polinómica, k-means paso a paso, PCA), IA (tokenización, búsqueda semántica, mini RAG con citas) y consola libre de Python. 49 misiones enlazan con el simulador de su concepto.
- Progreso local con exportación/importación JSON validada, certificados internos verificables y portafolio (cada pieza se descarga como script `.py` con sus archivos de datos).

> Los certificados los emite Python Quest y **no** equivalen a acreditaciones oficiales. Los datasets son sintéticos; los ejercicios clínicos son educativos y no constituyen recomendaciones médicas.

---

## Requisitos

- Node.js 20 o superior (probado con Node 22) y npm.
- Para ejecutar las pruebas de contenido: Python 3.11+ (probado con 3.13).
- Un navegador moderno. La primera vez que ejecutas código, el navegador descarga Pyodide (~10 MB) desde `cdn.jsdelivr.net`; los paquetes científicos se descargan al importarlos por primera vez.
- En la versión publicada, un service worker guarda el juego, Pyodide y cada paquete usado, de modo que lo que ya abriste funciona sin conexión (Ajustes → «Jugar sin conexión» muestra lo guardado y permite borrarlo).

## Instalar y ejecutar

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

Compilación de producción (genera `web/dist/`, que puede servirse desde cualquier hosting estático, incluido GitHub Pages):

```bash
cd web
npm run build
npm run preview      # http://localhost:4173
```

Para usar una copia propia de Pyodide (por ejemplo, sin acceso a internet), sirve su carpeta `full/` y define la URL al compilar:

```bash
VITE_PYODIDE_URL=/ruta/a/pyodide/full/ npm run build
```

### Publicar en GitHub Pages

El flujo `.github/workflows/pages.yml` compila y publica `web/dist` en cada push a `main`. Actívalo en **Settings → Pages → Source: GitHub Actions**.

## Pruebas

| Qué | Comando | Qué comprueba |
|---|---|---|
| Unitarias (TypeScript) | `cd web && npm test` | Catálogo de misiones al día y carga de cada mundo completa; ejercicios del gimnasio (semillas reproducibles, variantes distintas) y sus recompensas; motor del juego (XP, niveles, rachas, repasos, logros, importación, certificados), biblioteca estadística y métodos numéricos de los laboratorios comparados con NumPy/SciPy/statsmodels/scikit-learn, modelos del laboratorio de ML y funciones del laboratorio de IA |
| Tipos | `cd web && npm run typecheck` | TypeScript estricto |
| Contenido (CPython) | ver abajo | Para **cada variante de cada ejercicio del gimnasio**, la solución pasa y el código inicial no. Para **cada misión**: la solución pasa todas las pruebas, el código inicial no, el ejemplo se ejecuta, cada línea del ejemplo tiene explicación, el reto avanzado se comporta igual; en los proyectos progresivos, el código heredado más el esqueleto aún no pasa y la solución no rompe la etapa anterior; los enlaces a simuladores existen |
| Contenido (Pyodide) | `cd web && PYODIDE_DIST=… node scripts/validate-pyodide.mjs` | Las mismas soluciones, ejemplos, retos avanzados y variantes del gimnasio en el intérprete real del navegador (WebAssembly), avisando de las ejecuciones de más de 5 s |
| Extremo a extremo | `cd web && npm run build && npx playwright test` | Navegador real (Chromium, escritorio y móvil): crear personaje, resolver una misión con Pyodide, errores legibles, recompensas, persistencia tras recargar, bucles infinitos detenidos, laboratorios, todas las misiones de Python puro resueltas en la interfaz y, con `PYODIDE_DIST`, todas las misiones y el recorrido de un proyecto progresivo; descarga del portafolio; el inicio no descarga misiones y cada mundo se carga al abrirlo; error visible si falla esa descarga; una misión ya abierta funciona sin conexión; el gimnasio (practicar una variante, XP una sola vez, repaso con variante nueva) |

Pruebas de contenido con las mismas versiones de bibliotecas que trae Pyodide 0.28.3:

```bash
python3 -m venv .venv-pyodide-like
.venv-pyodide-like/bin/pip install -r requirements-dev.txt
.venv-pyodide-like/bin/python -m pytest -q
```

(`tests/conftest.py` exporta primero el contenido TypeScript a `web/content.json` con `npx tsx`.)

### Validar en Pyodide real

Descarga la distribución completa de Pyodide 0.28.3 (incluye las ruedas de numpy, pandas, scipy, scikit-learn, statsmodels y matplotlib compiladas para WebAssembly) y apunta `PYODIDE_DIST` a la carpeta extraída:

```bash
curl -LO https://github.com/pyodide/pyodide/releases/download/0.28.3/pyodide-0.28.3.tar.bz2
tar -xjf pyodide-0.28.3.tar.bz2 --exclude='*-tests.tar'
cd web
PYODIDE_DIST=$PWD/../pyodide node scripts/validate-pyodide.mjs          # todas las misiones (o pasa ids)
PYODIDE_DIST=$PWD/../pyodide npx playwright test --project=desktop     # interfaz con todas las misiones
```

## Estructura

```
harness/pq_harness.py      Motor de ejecución y pruebas de misiones (Pyodide y CPython)
tests/                     pytest: harness y validación de las 207 misiones
web/
  src/content/             Mundos, misiones (un archivo por bloque o proyecto), datasets sintéticos, pestañas de laboratorio
                           (full.ts: todas las misiones; catalog.generated.ts: catálogo ligero; load.ts: carga por mundo)
                           practice/: ejercicios del gimnasio con generador de variantes
  sw/                      Service worker (la compilación le añade la lista de archivos de esa versión)
  scripts/                 Catálogo de misiones, exportación del contenido y validación en Pyodide
  src/engine/              Estado, reglas de juego derivadas, persistencia, certificados
  src/python/              Worker de Pyodide y fachada con tiempo límite
  src/stats/               Estadística numérica para los laboratorios (verificada con SciPy)
  src/labs/                Laboratorios estadístico, matemático, de datos, ML, IA y consola (numeric.ts: métodos verificados)
  src/screens/             Pantallas (inicio, mapa, misión, repaso, progreso, inventario…)
  src/components/          Editor CodeMirror, consola, gráficos SVG, pixel art, escenas
  e2e/                     Pruebas Playwright
docs/                      Arquitectura y guía para añadir misiones
```

Más detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) y [docs/AGREGAR_MISIONES.md](docs/AGREGAR_MISIONES.md).

## Licencias y datos

- Los datasets (`ventas.csv`, `pacientes.csv`, `estudiantes.csv`, `clima.csv`, `clientes.csv`, `ensayo.csv`, `sensores.csv`, `viviendas.csv`, `mensajes.csv`, `demanda.csv`, `gastos.csv`, `peliculas.csv`, `valoraciones.csv`, `arboles.csv`, `pendulo.csv`) se generan de forma determinista en `web/src/content/datasets.ts`; no contienen personas reales.
- El conjunto de datos de cálculos renales de la misión sobre la paradoja de Simpson reproduce las cifras publicadas por Charig et al. (BMJ, 1986).
- El cuarteto de Anscombe procede de Anscombe (1973).
- El banco de preguntas del juego (`banco.json`), el manual del oráculo (`doc_*.md`, `preguntas*.json`) y los archivos de la planta de datos (`catalogo.csv`, `clientes.json`, `pedidos_*.csv`) son inventados para Python Quest.
- El explorador de datos públicos usa el conjunto **Wine** del repositorio UCI (Forina et al., PARVUS) tal como lo incluye scikit-learn (`load_wine`), sin descargas. Su documentación pide citar el repositorio (Lichman, 2013); consulta las condiciones de uso vigentes en la página del repositorio UCI antes de redistribuirlo.
