# Python Quest

Un videojuego RPG para aprender **Python, matemáticas, probabilidad, estadística, ciencia de datos, machine learning e inteligencia artificial** escribiendo código real.

- 9 mundos, **119 misiones** (6 de ellas proyectos integradores) con historia, intuición, explicación formal, ejemplo ejecutable explicado línea a línea, reto con pruebas automáticas, pistas progresivas, errores frecuentes, solución de referencia, pregunta de interpretación, reto avanzado opcional y recomendación de repaso.
- **Python real en el navegador** con [Pyodide](https://pyodide.org) (CPython compilado a WebAssembly) dentro de un Web Worker: numpy, pandas, scipy, statsmodels, scikit-learn, matplotlib y sqlite3. Sin servidor y sin cuenta.
- Gamificación: XP, niveles, monedas, tienda de cosméticos (nunca respuestas), logros, rachas con días de descanso y pausas, personaje pixel-art personalizable y mascotas.
- Repaso espaciado (tipo SM-2), detección de errores conceptuales (p. ej. «el valor p es la probabilidad de H₀»), dominio estimado por habilidad.
- Laboratorios interactivos: estadístico (11 simuladores), datos (pandas sobre datasets sintéticos), machine learning (k-NN, logística y árboles en vivo), IA (tokenización, búsqueda semántica, mini RAG con citas) y consola libre de Python.
- Progreso local con exportación/importación JSON validada, certificados internos verificables y portafolio.

> Los certificados los emite Python Quest y **no** equivalen a acreditaciones oficiales. Los datasets son sintéticos; los ejercicios clínicos son educativos y no constituyen recomendaciones médicas.

---

## Requisitos

- Node.js 20 o superior (probado con Node 22) y npm.
- Para ejecutar las pruebas de contenido: Python 3.11+ (probado con 3.13).
- Un navegador moderno. La primera vez que ejecutas código, el navegador descarga Pyodide (~10 MB) desde `cdn.jsdelivr.net`; los paquetes científicos se descargan al importarlos por primera vez.

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
| Unitarias (TypeScript) | `cd web && npm test` | Motor del juego (XP, niveles, rachas, repasos, logros, importación, certificados), biblioteca estadística comparada con SciPy/statsmodels/scikit-learn, modelos del laboratorio de ML y funciones del laboratorio de IA |
| Tipos | `cd web && npm run typecheck` | TypeScript estricto |
| Contenido (Python) | ver abajo | Para **cada misión**: la solución pasa todas las pruebas, el código inicial no, el ejemplo se ejecuta, cada línea del ejemplo tiene explicación, el reto avanzado se comporta igual, y la estructura del catálogo es coherente |
| Extremo a extremo | `cd web && npm run build && npx playwright test` | Navegador real (Chromium, escritorio y móvil): crear personaje, resolver una misión con Pyodide, errores legibles, recompensas, persistencia tras recargar, bucles infinitos detenidos, laboratorios, y todas las misiones de Python puro resueltas en Pyodide |

Pruebas de contenido con las mismas versiones de bibliotecas que trae Pyodide 0.28.3:

```bash
python3 -m venv .venv-pyodide-like
.venv-pyodide-like/bin/pip install -r requirements-dev.txt
.venv-pyodide-like/bin/python -m pytest -q
```

(`tests/conftest.py` exporta primero el contenido TypeScript a `web/content.json` con `npx tsx`.)

## Estructura

```
harness/pq_harness.py      Motor de ejecución y pruebas de misiones (Pyodide y CPython)
tests/                     pytest: harness y validación de las 119 misiones
web/
  src/content/             Mundos, misiones (un archivo por bloque), datasets sintéticos
  src/engine/              Estado, reglas de juego derivadas, persistencia, certificados
  src/python/              Worker de Pyodide y fachada con tiempo límite
  src/stats/               Estadística numérica para los laboratorios (verificada con SciPy)
  src/labs/                Laboratorios estadístico, de datos, ML, IA y consola
  src/screens/             Pantallas (inicio, mapa, misión, repaso, progreso, inventario…)
  src/components/          Editor CodeMirror, consola, gráficos SVG, pixel art, escenas
  e2e/                     Pruebas Playwright
docs/                      Arquitectura y guía para añadir misiones
```

Más detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) y [docs/AGREGAR_MISIONES.md](docs/AGREGAR_MISIONES.md).

## Licencias y datos

- Los datasets (`ventas.csv`, `pacientes.csv`, `estudiantes.csv`, `clima.csv`, `clientes.csv`) se generan de forma determinista en `web/src/content/datasets.ts`; no contienen personas reales.
- El conjunto de datos de cálculos renales de la misión sobre la paradoja de Simpson reproduce las cifras publicadas por Charig et al. (BMJ, 1986).
- El cuarteto de Anscombe procede de Anscombe (1973).
