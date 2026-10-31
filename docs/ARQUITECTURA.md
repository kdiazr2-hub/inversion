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
- **Paquetes**: `loadPackagesFromImports` descarga numpy, pandas, scipy, scikit-learn, statsmodels, matplotlib o sqlite3 la primera vez que se importan. `seaborn` no está en la distribución de Pyodide: el juego incluye su rueda oficial en `web/public/wheels` (lista en `src/python/wheels.ts`) y el worker la instala con micropip desde el propio sitio, sin PyPI; así funciona sin conexión una vez descargada y con una versión fija. El validador de Pyodide y el entorno de pytest usan la misma versión.

## Carga y modo sin conexión

- **Catálogo y contenido por mundo.** `web/src/content/full.ts` reúne las 223 misiones completas; solo lo importan los scripts y las pruebas. La aplicación importa `content/index.ts`, que expone el catálogo (`catalog.generated.ts`, generado por `npm run catalog`). El catálogo tiene lo que necesitan el mapa, el progreso, los repasos, los logros y el portafolio: título, mundo, zona, requisitos, recompensas, habilidades, número de pistas, ideas erróneas que sondea el cuestionario y nombres de archivos. La historia, la teoría, el código, las pruebas y los datos de cada misión se descargan con su mundo al abrir una de sus misiones (`load.ts`, un fragmento por archivo de misiones). `catalog.test.ts` comprueba que el catálogo coincide con las misiones y que cada mundo carga exactamente las suyas.
- **Editor bajo demanda.** CodeMirror (unos 400 KB) se descarga la primera vez que aparece un editor; mientras tanto se muestra el código sin editar.
- **Tamaños medidos** con `npm run build` (sin comprimir / gzip): antes, un único archivo de 2315 / 729 KB; ahora, lo que carga la primera visita suma 542 / 148 KB (aplicación 172 / 56, bibliotecas 204 / 60, catálogo 166 / 31). Abrir un mundo descarga entre 99 y 533 KB sin comprimir (33 a 174 KB gzip); el mayor es el mundo 4, con 72 misiones.
- **Errores visibles.** Si falla la descarga de un mundo, la misión muestra el error y un botón para recargar (el navegador recuerda durante la vida de la página un módulo que no pudo descargar, así que reintentar sin recargar no funciona). Un límite de errores (`ErrorBoundary`) muestra el fallo de cualquier pantalla en lugar de una página en blanco.
- **Service worker** (`web/sw/service-worker.js`; solo en la compilación de producción). La compilación le antepone la lista de archivos JS y CSS de esa versión, que guarda al instalarse. La página se pide primero a la red y la copia solo se usa sin conexión, así que una versión nueva se recibe en cuanto hay red; al activarse una versión nueva se borra la caché de la anterior. Pyodide y sus paquetes (URL con versión, que no cambian) se guardan la primera vez que se piden y después se sirven desde la caché. El worker de Python que arranca en la primera visita es anterior al service worker, así que Pyodide queda guardado a partir de la siguiente carga. Sin conexión solo funciona lo que ya se descargó: las misiones de los mundos abiertos y los paquetes ya usados. `e2e/offline.spec.ts` lo comprueba sin conexión y sin ninguna otra fuente de Pyodide que la caché; las demás pruebas de Playwright desactivan el service worker.

## Gimnasio de práctica

- **Ejercicio = generador.** Cada ejercicio (`web/src/content/practice/w1.ts`…`w9.ts`) tiene una función `make(r)` que recibe un generador pseudoaleatorio con semilla (mulberry32) y devuelve un ejercicio concreto: enunciado, código inicial, solución de referencia, pruebas y, si hace falta, entradas y archivos. La semilla combina el identificador del ejercicio y el número de variante, así que la misma variante es siempre el mismo ejercicio.
- **Solo variantes validadas.** El gimnasio ofrece las semillas 1 a 40 (`DRILL_VARIANTS`). `scripts/export-content.ts` exporta las 40 de cada ejercicio; `tests/test_drills.py` comprueba en CPython que la solución pasa y el código inicial no, y `scripts/validate-pyodide.mjs` ejecuta todas las soluciones en Pyodide. Los valores esperados se calculan en TypeScript y se escriben en las pruebas; el ejemplo del enunciado es siempre el primer caso, de modo que un ejemplo mal calculado rompe la validación. Varios ejercicios de estadística comparan además con `statistics` (mediana, varianza, correlación, regresión) o `NormalDist`.
- **Pruebas que enseñan.** Las pruebas llaman a la función con copias de los argumentos, prueban casos ocultos además del ejemplo (escribir el resultado a mano no pasa) y detectan errores típicos con mensajes concretos: devolver con `print` en lugar de `return`, modificar la lista recibida, no usar la herramienta que se practica (bucle, slicing, comprensión, `try`, recursión, `yield`, `re`) o usar la función de biblioteca cuando se practica la fórmula.
- **Estado y recompensas.** Solo se guarda cada variante resuelta (`drills` en el estado: ejercicio, semilla, fecha, pistas, si se vio la solución y, en un repaso, la misión repasada). Se derivan 5 XP y 1 moneda por la primera resolución de cada variante sin ver la solución, con un máximo de 50 XP al día; repetir una variante ya resuelta no paga. Un ejercicio se abre al completar su misión.
- **Repaso con variantes nuevas.** En la pantalla de repaso, una misión con ejercicios ofrece «Ejercicio nuevo»: una variante sin resolver del ejercicio menos practicado. Al superarla se registra el repaso de la misión (bien sin pistas, difícil con pistas; durante un repaso no se ofrece la solución) y paga el XP de repaso, no el del gimnasio.
- **Sesión rápida.** Cinco ejercicios desbloqueados: primero los de misiones con repaso pendiente, los menos practicados y los de misiones que necesitaron ayuda; dos seguidos no comparten habilidad cuando hay alternativa.
- **Carga.** El catálogo incluye los datos de cada ejercicio para la lista y los repasos; los generadores (unos 178 KB sin comprimir) se descargan al abrir un ejercicio.

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
- El portafolio muestra un proyecto progresivo una sola vez, cuando todas sus etapas están completas, y permite descargar el código como `.py` (`engine/portfolio.ts`: cabecera solo de comentarios con título, habilidades, paquetes, archivos y notas, seguida del código sin cambios), cada archivo de datos de la misión o el proyecto entero como `.zip` (`projectFiles` y `engine/zip.ts`, un escritor ZIP sin compresión con nombres UTF-8).
- El `.zip` incluye un `requirements.txt` con las versiones de `engine/desktop.ts`: los paquetes que importa el código (detectados en sus `import`) y los que esos paquetes importan, fijados a las versiones con las que CI prueba el contenido en CPython (`requirements-dev.txt` y Python 3.13; `desktop.test.ts` comprueba que coinciden). Solo matplotlib difiere del juego (3.9.4 frente a la 3.8.4 de Pyodide, que no publica paquetes para Python 3.13), y el README lo dice. Para esas versiones hay paquetes en PyPI para Python 3.10 a 3.13 en Windows de 64 bits, macOS (Intel, y Apple Silicon desde macOS 12) y Linux x86-64, comprobado con `pip download --only-binary=:all:`; no para Python 3.14.
- `tests/test_export.py` ejecuta `scripts/export-projects.ts`, que exporta cada pieza posible del portafolio desde su solución de referencia, y comprueba cada archivo (CRC, contenido, versiones de `requirements.txt` iguales a las instaladas) y que el programa descomprimido se ejecuta sin errores con CPython desde su carpeta.
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
| Variante nueva del gimnasio sin ver la solución | +5 (máximo 50 al día) | +1 |
| Logro | — | +20 |

La solución de referencia solo se desbloquea tras dos comprobaciones o todas las pistas. Las monedas compran apariencia; nunca pistas, respuestas ni evaluaciones.

## Ejemplos verificados

`tests/test_examples.py` ejecuta el ejemplo de cada misión y comprueba que cada número que la explicación de una línea con `print` menciona está en la salida (con el redondeo con que se escribe: `0,34` para 0.3421, `86 %` para 0.859, `1,41421568…` truncado), en el propio código del ejemplo (un dato de entrada) o es un umbral (`p < 0,05`). Los números de contexto que no repiten la salida («IC 95 %», «2 + 0 + 2 + 6 = 10») están en la lista `REVIEWED`, cada uno con el motivo. La primera pasada encontró seis explicaciones que no coincidían con lo que imprimía el ejemplo; se corrigieron. La comprobación no lee las afirmaciones en palabras («la pendiente sale negativa») ni las líneas sin `print`.

## Accesibilidad

- `e2e/a11y.spec.ts` audita con axe-core (reglas WCAG 2.0–2.2 A y AA) 18 pantallas con progreso, en escritorio y móvil, y comprueba que axe analizó contenido real (incluido el contraste). También comprueba que ninguna pantalla se sale de 320 px de ancho, que el editor se abandona con Esc y Tab (Tab sangra dentro del editor; el editor lo explica con `aria-describedby` y un aviso visible al enfocarlo) y que el laboratorio de regresión, que se manejaba con clics en el gráfico, admite añadir y quitar puntos con el teclado.
- Una rejilla sin plantilla de columnas tiene una sola columna que puede encogerse (`index.css`): sin ello, un título largo con `truncate` ensanchaba la columna implícita y la página se salía de las pantallas estrechas.
- Lo automático no sustituye a una prueba con lectores de pantalla reales (NVDA, VoiceOver), que no se ha hecho.

## Datos de la persona: copia, opiniones y tutor

- **Copia del progreso** (`engine/backup.ts`, `backupFile.ts`): `navigator.storage.persist()` al crear el perfil; el recordatorio aparece con 3 o más misiones completadas y ninguna copia en 7 días, y se puede posponer una semana (su estado vive en otra clave de `localStorage`, fuera de la partida). La copia automática usa la File System Access API: el archivo elegido se guarda en IndexedDB y se reescribe 4 s después del último cambio si el navegador da permiso de escritura; en una sesión nueva el navegador puede pedirlo otra vez con un clic. La prueba de extremo a extremo sustituye el diálogo «guardar como» (que Playwright no puede contestar) por un archivo del sistema de archivos privado del origen, que es un `FileSystemFileHandle` real.
- **Opiniones** (`SaveState.feedback`, `engine/feedback.ts`): campo opcional de la partida, validado al importar; el CSV añade los datos que la partida ya tenía (comprobaciones, pistas, solución vista).
- **Archivos propios en la consola**: se leen como texto UTF-8 (máximo 5 MB cada uno y 20 MB en total), se rechazan los que contienen bytes nulos y se avisa si hay caracteres que no son UTF-8. Se escriben junto al programa en cada ejecución y no se guardan.
- **Tutor** (`tutor.ts`, `components/TutorPanel.tsx`): `@anthropic-ai/sdk` se carga solo al preguntar (trozo propio). Modelo `claude-opus-5-5`, esfuerzo `medium`, respuesta en streaming y `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`): si un clasificador de seguridad rechaza la petición, la API la repite en su modelo de respaldo; si aun así se rechaza, se muestra un aviso. Se envían el enunciado, el código actual, el resumen del último resultado y la conversación de esa misión; la solución de referencia no se envía. La clave va en `localStorage` y la petición sale directamente del navegador a `api.anthropic.com` (`dangerouslyAllowBrowser`, que añade la cabecera `anthropic-dangerous-direct-browser-access`): el aviso de la biblioteca protege claves incluidas en el código de un sitio, y aquí la clave es de la propia persona y no sale de su navegador salvo hacia Anthropic. Se comprobó que la API real acepta la petición previa CORS desde otro origen y responde 401 a una clave falsa; con una clave real no se ha probado.

## Límites conocidos de la versión actual

- **Modo invitado** únicamente: el progreso vive en el navegador. La exportación JSON (o la copia automática a un archivo) permite moverlo; no hay cuentas ni sincronización entre dispositivos, que necesitarían un servidor.
- **Solo en español**: la interfaz y las 223 misiones están escritas en español; no hay traducción. Un atacante puede fabricar un JSON con eventos falsos coherentes; sin servidor no hay forma de impedirlo. Los certificados lo indican.
- **PyTorch, TensorFlow, FastAPI y peticiones HTTP** no funcionan en el navegador: las misiones afectadas usan NumPy y simulaciones locales, y muestran el código equivalente como referencia.
- Los hilos no funcionan en Pyodide, y el bucle de eventos de `asyncio` (`asyncio.run`) necesita una función de WebAssembly (JSPI) que no todos los navegadores tienen. La misión de programación asíncrona usa corrutinas reales sobre un bucle de eventos escrito por el alumno con reloj simulado y muestra el código equivalente con `asyncio`.
- La integración continua (`.github/workflows/ci.yml`) tiene tres trabajos: `web` (tipos, pruebas unitarias y compilación), `contenido` (todas las misiones con CPython en las mismas versiones que trae Pyodide 0.28.3) y `pyodide`, que descarga una vez la distribución completa de Pyodide (unos 350 MB, guardada en caché), ejecuta `scripts/validate-pyodide.mjs` y después todas las pruebas de Playwright (en Ubuntu 24.04: Playwright 1.56 no instala Chromium en Ubuntu 26.04, que es ya `ubuntu-latest`) en Chromium con `PYODIDE_DIST`, incluidas todas las misiones resueltas en la interfaz. Si fallan, las trazas de Playwright quedan como artefacto `playwright-trazas`.

## Cómo ampliarlo

- **Backend opcional** (FastAPI + SQLAlchemy + PostgreSQL): cuentas, sincronización del progreso, verificación de certificados en servidor y registro de eventos firmado. El esquema `SaveState` y las funciones de `derive.ts` pueden reutilizarse (las reglas son puras).
- **Ejecución en servidor** para paquetes no disponibles en Pyodide: contenedores efímeros sin red, con cuotas, usando el mismo `pq_harness.py`.
- **Más contenido**: ver [AGREGAR_MISIONES.md](AGREGAR_MISIONES.md).
