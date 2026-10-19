# Arquitectura de Python Quest

## Decisiones principales

| Decisión | Motivo |
|---|---|
| **Aplicación web estática** (React + TypeScript + Vite + Tailwind) | Funciona sin servidor ni cuenta; se publica en cualquier hosting estático. |
| **Pyodide en un Web Worker** | Ejecución real de CPython en el navegador sin aislar código en un servidor. El worker se puede terminar para detener bucles infinitos sin congelar la interfaz. |
| **Un único harness Python** (`harness/pq_harness.py`) | El mismo código ejecuta y evalúa las misiones en el navegador (Pyodide) y en CI (pytest con CPython). Lo que se valida en CI es exactamente lo que corre el alumno. |
| **Contenido como datos tipados** (`web/src/content`) | Añadir misiones no requiere tocar el motor. TypeScript comprueba la forma; pytest comprueba que cada misión es resoluble. |
| **Estado = hechos; todo lo demás derivado** | El progreso guarda eventos (misión completada, pistas, intentos, repasos, compras). XP, monedas, nivel, rachas, calendario de repasos, dominio y logros se calculan. Así no hay cifras «decorativas» y editar el archivo para darse XP exige fabricar eventos coherentes. |
| **CodeMirror 6** | Editor ligero y accesible (resaltado, numeración, indentación, atajos). Monaco pesa varios MB más. |
| **Gráficos SVG propios** | Los laboratorios necesitan pocas formas (líneas, barras, puntos, bandas) con hover y vista de tabla; una biblioteca de gráficos completa no compensaba su peso. |

## Flujo de ejecución de código

```
Editor (CodeMirror) ──► python.run({code, tests, stdin, files})          src/python/runner.ts
                         │  arranca el worker si hace falta, inicia el reloj de tiempo límite
                         ▼
                  Web Worker (src/python/worker.ts)
                         │  importScripts(pyodide.js) · carga paquetes detectados en los imports
                         ▼
                  pq_harness.run(code, tests, stdin, files)                harness/pq_harness.py
                         │  directorio temporal con los archivos de la misión
                         │  compile + exec con stdout capturado e input() simulado
                         │  errores traducidos (tipo, línea, explicación en español)
                         │  pruebas test_* con acceso al programa mediante `t`
                         │  figuras de matplotlib como PNG en base64
                         ▼
                  resultado JSON ──► consola, pruebas, figuras, recompensas
```

- **Tiempo límite** (configurable, 15 s por defecto): empieza cuando los paquetes ya están descargados **e importados**. El worker importa antes los módulos científicos que el código usa (`pq_harness.warm_imports`): en Pyodide, importar pandas y scikit-learn la primera vez cuesta unos 6 s, que no deben contar como un posible bucle infinito. Si se supera, o el alumno pulsa «Detener», se termina el worker y se arranca otro.
- **Módulo `__main__`**: el programa del alumno se ejecuta como un módulo real registrado como `__main__` mientras corren él y sus pruebas, de modo que las bibliotecas que resuelven nombres a través de `sys.modules` (Pydantic, `typing.get_type_hints`, `pickle`) encuentran sus clases y anotaciones.
- **Aislamiento**: el código del alumno corre en el navegador del propio alumno, en un worker sin acceso al DOM. No hay ejecución en servidor. Si en el futuro se añade un backend de ejecución, debe ir en contenedores efímeros sin red, con límites de CPU, memoria y tiempo, separados del servidor principal.
- **Paquetes**: `loadPackagesFromImports` descarga numpy, pandas, scipy, scikit-learn, statsmodels, matplotlib o sqlite3 la primera vez que se importan. `seaborn` se instala con micropip (no está en la distribución de Pyodide).

## Carga y modo sin conexión

- **Catálogo y contenido por mundo.** `web/src/content/full.ts` reúne las 207 misiones completas; solo lo importan los scripts y las pruebas. La aplicación importa `content/index.ts`, que expone el catálogo (`catalog.generated.ts`, generado por `npm run catalog`). El catálogo tiene lo que necesitan el mapa, el progreso, los repasos, los logros y el portafolio: título, mundo, zona, requisitos, recompensas, habilidades, número de pistas, ideas erróneas que sondea el cuestionario y nombres de archivos. La historia, la teoría, el código, las pruebas y los datos de cada misión se descargan con su mundo al abrir una de sus misiones (`load.ts`, un fragmento por archivo de misiones). `catalog.test.ts` comprueba que el catálogo coincide con las misiones y que cada mundo carga exactamente las suyas.
- **Editor bajo demanda.** CodeMirror (unos 400 KB) se descarga la primera vez que aparece un editor; mientras tanto se muestra el código sin editar.
- **Tamaños medidos** con `npm run build` (sin comprimir / gzip): antes, un único archivo de 2315 / 729 KB; ahora, lo que carga la primera visita suma 542 / 148 KB (aplicación 172 / 56, bibliotecas 204 / 60, catálogo 166 / 31). Abrir un mundo descarga entre 99 y 533 KB sin comprimir (33 a 174 KB gzip); el mayor es el mundo 4, con 72 misiones.
- **Errores visibles.** Si falla la descarga de un mundo, la misión muestra el error y un botón para recargar (el navegador recuerda durante la vida de la página un módulo que no pudo descargar, así que reintentar sin recargar no funciona). Un límite de errores (`ErrorBoundary`) muestra el fallo de cualquier pantalla en lugar de una página en blanco.
- **Service worker** (`web/sw/service-worker.js`; solo en la compilación de producción). La compilación le antepone la lista de archivos JS y CSS de esa versión, que guarda al instalarse. La página se pide primero a la red y la copia solo se usa sin conexión, así que una versión nueva se recibe en cuanto hay red; al activarse una versión nueva se borra la caché de la anterior. Pyodide y sus paquetes (URL con versión, que no cambian) se guardan la primera vez que se piden y después se sirven desde la caché. El worker de Python que arranca en la primera visita es anterior al service worker, así que Pyodide queda guardado a partir de la siguiente carga. Sin conexión solo funciona lo que ya se descargó: las misiones de los mundos abiertos y los paquetes ya usados. `e2e/offline.spec.ts` lo comprueba sin conexión y sin ninguna otra fuente de Pyodide que la caché; las demás pruebas de Playwright desactivan el service worker.

## Pruebas de una misión

Las pruebas son funciones `test_*` escritas en Python. Reciben el programa del alumno a través de la variable global `t` (`TestContext`):

| Atributo / método | Uso |
|---|---|
| `t.get(nombre, tipo)` | Valor definido por el alumno (con mensaje claro si falta o tiene otro tipo) |
| `t.call(nombre, *args)` | Llama a una función y devuelve `(resultado, salida_impresa)` |
| `t.rerun(stdin)` | Vuelve a ejecutar el programa completo con otras entradas de `input()` |
| `t.out`, `t.lines` | Salida estándar |
| `t.uses("For", ...)`, `t.calls("print")`, `t.tree()`, `t.code` | Comprobaciones estáticas sobre el código |
| `t.figures()` | Figuras generadas |
| `approx(a, b, tol)` | Comparación de decimales |

Las pruebas comprueban **comportamiento** (resultados con varias entradas, efectos sobre archivos, propiedades estadísticas) y solo recurren a la salida exacta cuando el reto es precisamente imprimir.

## Proyectos progresivos y enlaces a laboratorios

- `Mission.series = { id, title, stage, of }` convierte una misión de tipo proyecto en la etapa *n* de una serie. El editor de la etapa *n* > 1 empieza con el código que el alumno escribió en la etapa anterior seguido del esqueleto nuevo (`stageStartCode`); también puede partir de la solución de referencia de la etapa anterior. Las pruebas de una etapa pueden usar las funciones de las anteriores.
- En el contenido, la solución de la etapa *n* es la de la etapa *n* − 1 más el código nuevo. pytest comprueba que el código heredado más el esqueleto todavía no pasa y que la solución no rompe las pruebas de la etapa anterior.
- El portafolio muestra un proyecto progresivo una sola vez, cuando todas sus etapas están completas, y permite descargar el código como `.py` (`engine/portfolio.ts`: cabecera solo de comentarios con título, habilidades, paquetes, archivos y notas, seguida del código sin cambios) y cada archivo de datos de la misión.
- `Mission.lab = { lab, tab, label }` muestra en la lección un botón al simulador correspondiente (`#/labs/<lab>/<pestaña>`). Las pestañas existentes están en `content/labs.ts` y pytest valida cada enlace.

## Motor del juego (`web/src/engine`)

- `state.ts`: esquema `SaveState` con **zod** (validación al cargar e importar).
- `derive.ts`: funciones puras para recompensas, niveles (curva 50·L·(L−1)), rachas (un día de descanso por cada 7 activos, máximo 2; pausas declaradas no cuentan; el día en curso no rompe la racha), repaso espaciado (SM-2 simplificado reconstruido desde el historial), errores conceptuales (desde las respuestas de interpretación), dominio por habilidad, desbloqueo de mundos y misiones, logros y recomendación de la siguiente acción.
- `actions.ts`: transiciones puras (comprobar, pista, solución, interpretación, repaso, compra, ajustes, certificado).
- `storage.ts`: `localStorage`, exportación/importación y **saneamiento**: se descartan misiones desconocidas, fechas futuras, repasos incoherentes, compras que las monedas ganadas no cubren y certificados de rutas incompletas.
- `certificates.ts`: identificador `PQ-XXXX-XXXX-XXXX` = primeros 48 bits del SHA-256 de (nombre, ruta, fecha, registro de cada misión de la ruta). El certificado guarda la lista de misiones de la ruta **en el momento de emitirse**, de modo que añadir contenido después no lo invalida. La verificación lo recalcula con el progreso guardado.
- Añadir contenido tampoco debe quitar nada ya ganado: un mundo con alguna misión completada sigue desbloqueado aunque baje su fracción de desbloqueo, y los logros que dependían de «todas las misiones de X» se definen sobre misiones concretas.

### Reglas de recompensa

| Evento | XP | Monedas |
|---|---|---|
| Misión completada | XP de la misión (la mitad si se vio la solución antes) | monedas de la misión |
| Sin pistas ni solución | +25 % | +2 |
| Reto avanzado | +50 % | +½ |
| Interpretación correcta al primer intento | +10 | +1 |
| Repaso superado | +10 | +2 |
| Logro | — | +20 |

La solución de referencia solo se desbloquea tras dos comprobaciones o todas las pistas. Las monedas compran apariencia; nunca pistas, respuestas ni evaluaciones.

## Límites conocidos de la versión actual

- **Modo invitado** únicamente: el progreso vive en el navegador. La exportación JSON permite moverlo. Un atacante puede fabricar un JSON con eventos falsos coherentes; sin servidor no hay forma de impedirlo. Los certificados lo indican.
- **PyTorch, TensorFlow, FastAPI y peticiones HTTP** no funcionan en el navegador: las misiones afectadas usan NumPy y simulaciones locales, y muestran el código equivalente como referencia.
- `asyncio` y los hilos tienen soporte limitado en Pyodide; las misiones de ingeniería evitan depender de ellos.
- La integración continua (`.github/workflows/ci.yml`) tiene tres trabajos: `web` (tipos, pruebas unitarias y compilación), `contenido` (todas las misiones con CPython en las mismas versiones que trae Pyodide 0.28.3) y `pyodide`, que descarga una vez la distribución completa de Pyodide (unos 350 MB, guardada en caché), ejecuta `scripts/validate-pyodide.mjs` y después todas las pruebas de Playwright en Chromium con `PYODIDE_DIST`, incluidas todas las misiones resueltas en la interfaz. Si fallan, las trazas de Playwright quedan como artefacto `playwright-trazas`.

## Cómo ampliarlo

- **Backend opcional** (FastAPI + SQLAlchemy + PostgreSQL): cuentas, sincronización del progreso, verificación de certificados en servidor y registro de eventos firmado. El esquema `SaveState` y las funciones de `derive.ts` pueden reutilizarse (las reglas son puras).
- **Ejecución en servidor** para paquetes no disponibles en Pyodide: contenedores efímeros sin red, con cuotas, usando el mismo `pq_harness.py`.
- **Más contenido**: ver [AGREGAR_MISIONES.md](AGREGAR_MISIONES.md).
