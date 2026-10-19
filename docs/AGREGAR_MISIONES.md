# Cómo añadir misiones

1. Elige o crea un archivo en `web/src/content/missions/` (un archivo por bloque temático exporta un array `Mission[]`).
2. Si creas un archivo nuevo, añádelo a `MISSIONS` en `web/src/content/full.ts`, en orden de currículo. Las etapas de un proyecto progresivo deben estar en el mismo mundo.
3. Escribe la misión (plantilla abajo).
4. Regenera el catálogo con `cd web && npm run catalog` (`npm run dev` lo hace al arrancar). La aplicación lee de `catalog.generated.ts` el mapa, las recompensas y los requisitos, y descarga el contenido completo de cada mundo al abrir una de sus misiones. Si olvidas este paso, `npm test` falla.
5. Ejecuta las pruebas de contenido:

```bash
.venv-pyodide-like/bin/python -m pytest -q -k mi-nueva-mision
```

Las pruebas fallarán si la solución no pasa, si el código inicial ya pasa, si el ejemplo no se ejecuta, si el número de explicaciones no coincide con las líneas del ejemplo, o si falta algún campo pedagógico.

## Plantilla

```ts
import { py, type Mission } from "../types";

export const MIS_MISIONES: Mission[] = [
  {
    id: "zona-tema",                 // minúsculas, números y guiones; único
    world: "w4",                     // w1 … w9
    zone: "Inferencia",              // agrupa misiones en el mapa del mundo
    title: "Título evocador: concepto",
    kind: "lesson",                  // o "project" (añade el campo project)
    difficulty: 3,                   // 1–5
    skills: ["pruebas-hipotesis"],   // etiquetas para dominio y logros
    requires: ["mision-anterior"],   // misiones que deben completarse antes
    story: "Una situación del mundo del juego que plantea el problema.",
    objective: "Qué sabrá hacer el alumno al terminar.",
    before: ["Conceptos previos"],
    packages: ["scipy"],             // si importa paquetes de Pyodide (informativo)
    files: { "datos.csv": "a,b\n1,2\n" }, // archivos disponibles en la carpeta de trabajo
    intuition: ["Párrafos en markdown ligero:", "", "- listas, **negrita**, `código`, bloques ```"],
    formal: "Fórmula o definición precisa (opcional).",
    example: {
      code: py`print(1 + 1)`,
      lines: ["Una explicación por cada línea no vacía del ejemplo."],
    },
    challenge: ["Enunciado del reto con nombres exactos de funciones y variables."],
    starter: py`# código inicial que NO pasa las pruebas`,
    solution: py`# solución de referencia que pasa todas las pruebas`,
    tests: py`
def test_comportamiento():
    "Descripción que verá el alumno"
    f = t.get("mi_funcion", "function")
    assert f(2) == 4, "Mensaje que ayuda a corregir"
`,
    hints: ["Pista suave", "Pista más concreta", "Casi la solución"],
    errors: [{ error: "Error típico", fix: "Cómo evitarlo" }],
    quiz: {
      question: "Pregunta de interpretación",
      options: [
        { text: "Correcta" },
        { text: "Incorrecta que revela un error conceptual", misconception: "p-valor" },
        { text: "Otra incorrecta" },
      ],
      answer: 0,
      explanation: "Por qué la correcta lo es.",
    },
    advanced: { title: "…", prompt: "…", starter: py`…`, solution: py`…`, tests: py`…` }, // opcional
    lab: { lab: "estadistica", tab: "intervalos", label: "Intervalos de confianza" },  // opcional: pestañas en content/labs.ts
    review: "Qué repasar más adelante.",
    xp: 80,
    coins: 12,
  },
];
```

### Consejos

- Usa la etiqueta `py` para el código: conserva literalmente las barras invertidas (`"\n"` sigue siendo `\n` en Python). No uses `${` ni comillas invertidas dentro del código.
- Las pruebas deben evaluar **comportamiento** con varias entradas, no la coincidencia exacta de un texto (salvo que el reto sea imprimir).
- Calcula los valores esperados dentro de la prueba a partir de los datos cuando sea posible (por ejemplo con pandas o SciPy), en lugar de escribir cifras a mano.
- Los errores conceptuales disponibles están en `Misconception` (`web/src/content/types.ts`) y su explicación en `MISCONCEPTIONS` (`web/src/engine/derive.ts`).
- Para un mundo nuevo, añade su definición en `web/src/content/worlds.ts` (nombre, tema visual, temario, condición de desbloqueo y certificado).
- Los datasets sintéticos compartidos están en `web/src/content/datasets.ts`; también aparecen en el Laboratorio de datos.

## Proyectos progresivos

Un proyecto por etapas es una serie de misiones de tipo `"project"` con el campo `series` (ver `content/missions/proj-ensayo.ts`):

```ts
const SERIES = { id: "mi-proyecto", title: "Proyecto progresivo: …", of: 3 };
const S1 = py`…código de la etapa 1…`;
const S2 = py`…solo lo nuevo de la etapa 2…`;
const SOL2 = `${S1}\n\n${S2}`;          // la solución de cada etapa amplía la anterior

{ id: "mp-1", kind: "project", series: { ...SERIES, stage: 1 }, solution: S1, starter: py`…`, … },
{ id: "mp-2", kind: "project", series: { ...SERIES, stage: 2 }, requires: ["mp-1"], solution: SOL2,
  starter: py`…esqueleto solo de lo nuevo…`, … },
```

- El `starter` de la etapa *n* > 1 contiene **solo** lo nuevo: la interfaz lo coloca debajo del código que el alumno escribió en la etapa anterior.
- Las pruebas de una etapa pueden usar lo definido en las anteriores (`t.get("datos")`…). Calcula los valores esperados de forma independiente dentro de la prueba.
- pytest exige: etapas consecutivas con el mismo título y mundo, que cada etapa requiera la anterior, que la solución empiece por la de la etapa previa, que «código heredado + esqueleto» no pase todavía y que la nueva solución siga pasando las pruebas de la etapa anterior.

## Validar en Pyodide

Además de pytest (CPython), conviene ejecutar las misiones nuevas en el intérprete real del navegador, que también avisa si alguna tarda más de 5 s:

```bash
cd web
PYODIDE_DIST=/ruta/a/pyodide node scripts/validate-pyodide.mjs mi-nueva-mision
```
