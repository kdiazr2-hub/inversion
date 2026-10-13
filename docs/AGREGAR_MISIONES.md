# Cómo añadir misiones

1. Elige o crea un archivo en `web/src/content/missions/` (un archivo por bloque temático exporta un array `Mission[]`).
2. Si creas un archivo nuevo, añádelo a `MISSIONS` en `web/src/content/index.ts`, en orden de currículo.
3. Escribe la misión (plantilla abajo).
4. Ejecuta las pruebas de contenido:

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
