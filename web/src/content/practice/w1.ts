// Practice drills for World 1 (Python fundamentals).
import { py, type Drill, type DrillVariant } from "../types";
import { callText, fnTests, lit, NOMBRES, PALABRAS, PRODUCTOS, CIUDADES, programTests, requireSyntax, eq, show, type Case } from "./kit";

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

export const DRILLS_W1: Drill[] = [
  {
    id: "g-entrada",
    mission: "py-input",
    title: "Leer datos y responder",
    skills: ["entrada", "conversion"],
    difficulty: 1,
    hints: ["input() siempre devuelve texto: conviértelo con int() o float() antes de operar.", "Usa un f-string para el mensaje y copia el texto del enunciado tal cual, con sus espacios y signos."],
    make(r): DrillVariant {
      const kind = r.pick(["edad", "compra", "temperatura"] as const);
      if (kind === "edad") {
        const k = r.int(2, 15);
        const caso = () => {
          const nombre = r.pick(NOMBRES);
          const edad = r.int(8, 70);
          return { stdin: [nombre, String(edad)], lines: [`Hola, ${nombre}. Dentro de ${k} años tendrás ${edad + k}.`] };
        };
        const cs = [caso(), caso(), caso(), caso()];
        return {
          prompt: [
            `Escribe un programa que pida un **nombre** y una **edad** (en ese orden) y muestre cuántos años tendrá esa persona dentro de ${k} años.`,
            "",
            `Con las entradas \`${cs[0].stdin[0]}\` y \`${cs[0].stdin[1]}\` debe mostrar exactamente:`,
            "",
            "```",
            cs[0].lines[0],
            "```",
          ],
          starter: py`nombre = input("Nombre: ")
edad = input("Edad: ")
# Muestra el mensaje
`,
          solution: py`nombre = input("Nombre: ")
edad = int(input("Edad: "))
print(f"Hola, {nombre}. Dentro de ${k} años tendrás {edad + ${k}}.")
`,
          tests: programTests(cs),
          stdin: cs[0].stdin,
        };
      }
      if (kind === "compra") {
        const caso = () => {
          const producto = r.pick(PRODUCTOS);
          const cents = r.int(50, 1999);
          const unidades = r.int(1, 12);
          return { stdin: [producto, (cents / 100).toFixed(2), String(unidades)], lines: [`${unidades} x ${producto} = ${((cents * unidades) / 100).toFixed(2)} €`] };
        };
        const cs = [caso(), caso(), caso(), caso()];
        return {
          prompt: [
            "Escribe un programa que pida un **producto**, su **precio** por unidad y el número de **unidades** (en ese orden) y muestre el total con dos decimales.",
            "",
            `Con las entradas \`${cs[0].stdin.join("`, `")}\` debe mostrar exactamente:`,
            "",
            "```",
            cs[0].lines[0],
            "```",
          ],
          starter: py`producto = input("Producto: ")
precio = input("Precio: ")
unidades = input("Unidades: ")
# Calcula y muestra el total
`,
          solution: py`producto = input("Producto: ")
precio = float(input("Precio: "))
unidades = int(input("Unidades: "))
total = precio * unidades
print(f"{unidades} x {producto} = {total:.2f} €")
`,
          tests: programTests(cs),
          stdin: cs[0].stdin,
        };
      }
      const caso = () => {
        const ciudad = r.pick(CIUDADES);
        const c = r.int(-150, 400) / 10;
        return { stdin: [ciudad, String(c)], lines: [`En ${ciudad} hace ${((c * 9) / 5 + 32).toFixed(1)} °F`] };
      };
      const cs = [caso(), caso(), caso(), caso()];
      return {
        prompt: [
          "Escribe un programa que pida una **ciudad** y una **temperatura en grados Celsius** (puede tener decimales) y la muestre en grados Fahrenheit con un decimal. La fórmula es F = C · 9/5 + 32.",
          "",
          `Con las entradas \`${cs[0].stdin[0]}\` y \`${cs[0].stdin[1]}\` debe mostrar exactamente:`,
          "",
          "```",
          cs[0].lines[0],
          "```",
        ],
        starter: py`ciudad = input("Ciudad: ")
celsius = input("Temperatura (°C): ")
# Convierte y muestra
`,
        solution: py`ciudad = input("Ciudad: ")
celsius = float(input("Temperatura (°C): "))
fahrenheit = celsius * 9 / 5 + 32
print(f"En {ciudad} hace {fahrenheit:.1f} °F")
`,
        tests: programTests(cs),
        stdin: cs[0].stdin,
      };
    },
  },
  {
    id: "g-operadores",
    mission: "py-aritmetica",
    title: "De palabras a operaciones",
    skills: ["operadores"],
    difficulty: 1,
    hints: ["Traduce la frase por partes: primero lo que va dentro («la suma de…»), después lo de fuera («el doble de…»).", "// es la división entera, % el resto y ** la potencia. Usa paréntesis para fijar el orden."],
    make(r) {
      const ops = [
        { text: "el doble de la suma de `x` e `y`", f: (x: number, y: number) => 2 * (x + y), code: "2 * (x + y)" },
        { text: "el cuadrado de `x` menos `y`", f: (x: number, y: number) => x ** 2 - y, code: "x ** 2 - y" },
        { text: "el cociente entero de `x` entre `y` más el resto de esa misma división", f: (x: number, y: number) => Math.floor(x / y) + (x % y), code: "x // y + x % y" },
        { text: "la media de `x` e `y`", f: (x: number, y: number) => (x + y) / 2, code: "(x + y) / 2" },
        { text: "el valor absoluto de la diferencia entre `x` e `y`", f: (x: number, y: number) => Math.abs(x - y), code: "abs(x - y)" },
        { text: "el triple de `x` menos el doble de `y`, todo dividido entre 2", f: (x: number, y: number) => (3 * x - 2 * y) / 2, code: "(3 * x - 2 * y) / 2" },
        { text: "`x` elevado a `y`, menos 1", f: (x: number, y: number) => x ** y - 1, code: "x ** y - 1", small: true },
        { text: "cuántas veces cabe `y` entero en `x`, multiplicado por `y`", f: (x: number, y: number) => Math.floor(x / y) * y, code: "(x // y) * y" },
      ];
      const op = r.pick(ops);
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const x = op.small ? r.int(2, 6) : r.int(2, 60);
        const y = op.small ? r.int(1, 4) : r.int(1, 9);
        return { args: [x, y], expected: op.f(x, y) };
      });
      const ex = cases[0];
      return {
        prompt: [`Escribe la función \`calcula(x, y)\` que devuelva ${op.text}.`, "", `Por ejemplo, \`${callText("calcula", ex.args)}\` devuelve \`${lit(ex.expected)}\`.`],
        starter: py`def calcula(x, y):
    pass
`,
        solution: py`def calcula(x, y):
    return ${op.code}
`,
        tests: fnTests("calcula", cases),
      };
    },
  },
  {
    id: "g-conversion",
    mission: "py-conversion",
    title: "Precios escritos como texto",
    skills: ["tipos", "conversion"],
    difficulty: 2,
    hints: ["Recorre la lista y convierte cada texto en número con float() antes de sumarlo.", "Antes de convertir, limpia el texto: replace() cambia la coma por punto y quita símbolos; strip() quita espacios."],
    make(r) {
      const formats = [
        { text: "con punto decimal, como `\"12.50\"`", fmt: (c: number) => (c / 100).toFixed(2), clean: "texto" },
        { text: "con coma decimal, como `\"12,50\"`", fmt: (c: number) => (c / 100).toFixed(2).replace(".", ","), clean: 'texto.replace(",", ".")' },
        { text: "con el símbolo del euro al final, como `\"12.50 €\"`", fmt: (c: number) => `${(c / 100).toFixed(2)} €`, clean: 'texto.replace("€", "").strip()' },
        { text: "con el símbolo del dólar delante, como `\"$12.50\"`", fmt: (c: number) => `$${(c / 100).toFixed(2)}`, clean: 'texto.replace("$", "")' },
      ];
      const f = r.pick(formats);
      const cases: Case[] = Array.from({ length: 5 }, (_, i) => {
        const cents = Array.from({ length: i === 4 ? 1 : r.int(2, 5) }, () => r.int(5, 4999));
        return { args: [cents.map(f.fmt)], expected: cents.reduce((a, b) => a + b, 0) / 100 };
      });
      const ex = cases[0];
      return {
        prompt: [
          `Un archivo de ventas guarda los precios como texto ${f.text}. Escribe \`total(precios)\` que reciba una lista de esos textos y devuelva la suma como número.`,
          "",
          `Por ejemplo, \`${callText("total", ex.args)}\` devuelve ${eq(ex.expected as number)}.`,
        ],
        starter: py`def total(precios):
    suma = 0
    return suma
`,
        solution: py`def total(precios):
    suma = 0
    for texto in precios:
        suma += float(${f.clean})
    return suma
`,
        tests: fnTests("total", cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-cadenas",
    mission: "py-strings",
    title: "Transformar texto",
    skills: ["cadenas"],
    difficulty: 2,
    hints: ["split() separa un texto en palabras y \" \".join(lista) las vuelve a unir.", "Las cadenas tienen métodos útiles: upper(), lower(), capitalize(), replace() y count()."],
    make(r) {
      const ops = [
        { text: "cada palabra con la primera letra en mayúscula y el resto en minúscula", f: (s: string) => s.split(" ").map((w) => cap(w.toLowerCase())).join(" "), code: 'return " ".join(p.capitalize() for p in texto.split())' },
        { text: "las mismas palabras en orden inverso", f: (s: string) => s.split(" ").reverse().join(" "), code: 'return " ".join(reversed(texto.split()))' },
        { text: "las iniciales de cada palabra, en mayúscula y sin espacios", f: (s: string) => s.split(" ").map((w) => w[0].toUpperCase()).join(""), code: 'return "".join(p[0].upper() for p in texto.split())' },
        { text: "el texto en minúsculas con guiones bajos en lugar de espacios", f: (s: string) => s.toLowerCase().split(" ").join("_"), code: 'return texto.lower().replace(" ", "_")' },
        { text: "cuántas vocales tiene (a, e, i, o, u, en mayúscula o minúscula)", f: (s: string) => [...s.toLowerCase()].filter((c) => "aeiou".includes(c)).length, code: 'return sum(1 for c in texto.lower() if c in "aeiou")' },
        { text: "la palabra más larga (si hay empate, la primera)", f: (s: string) => s.split(" ").reduce((a, b) => (b.length > a.length ? b : a)), code: "return max(texto.split(), key=len)" },
      ];
      const op = r.pick(ops);
      const phrase = () => r.sample(PALABRAS, r.int(3, 5)).map((w) => (r.next() < 0.3 ? w.toUpperCase() : r.next() < 0.3 ? cap(w) : w)).join(" ");
      const cases: Case[] = Array.from({ length: 5 }, () => {
        const s = phrase();
        return { args: [s], expected: op.f(s) };
      });
      return {
        prompt: [`Escribe \`transforma(texto)\` que devuelva ${op.text}. Las palabras están separadas por un espacio.`, "", `Por ejemplo, \`${callText("transforma", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def transforma(texto):
    pass
`,
        solution: py`def transforma(texto):
    ${op.code}
`,
        tests: fnTests("transforma", cases),
      };
    },
  },
  {
    id: "g-logica",
    mission: "py-logica",
    title: "Reglas con and, or y not",
    skills: ["operadores", "booleanos"],
    difficulty: 2,
    hints: ["Escribe la regla con and, or y not y pon paréntesis donde la frase agrupa ideas.", "Devuelve directamente la expresión: return edad >= 18 and ... ya es True o False."],
    make(r) {
      const k = r.int(12, 18);
      const rules = [
        { text: `tiene al menos ${k} años **y** además tiene entrada **o** es socio`, f: (e: number, en: boolean, so: boolean) => e >= k && (en || so), code: `edad >= ${k} and (entrada or socio)` },
        { text: `es socio, **o** bien tiene al menos ${k} años **y** entrada`, f: (e: number, en: boolean, so: boolean) => so || (e >= k && en), code: `socio or (edad >= ${k} and entrada)` },
        { text: `tiene entrada **y**, además, tiene al menos ${k} años **o** es socio`, f: (e: number, en: boolean, so: boolean) => en && (e >= k || so), code: `entrada and (edad >= ${k} or socio)` },
        { text: `tiene entrada, **no** es socio y tiene menos de ${k} años (es la zona infantil para no socios)`, f: (e: number, en: boolean, so: boolean) => en && !so && e < k, code: `entrada and not socio and edad < ${k}` },
      ];
      const rule = r.pick(rules);
      const combos: [number, boolean, boolean][] = [];
      for (const e of [k - 1, k, k + r.int(1, 30)]) for (const en of [true, false]) for (const so of [true, false]) combos.push([e, en, so]);
      const ordered = r.shuffle(combos);
      const cases = ordered.map(([e, en, so]) => ({ args: [e, en, so], expected: rule.f(e, en, so) }));
      return {
        prompt: [`Escribe \`puede_entrar(edad, entrada, socio)\` (\`entrada\` y \`socio\` son \`True\` o \`False\`) que devuelva \`True\` si la persona ${rule.text}, y \`False\` en otro caso.`, "", `Por ejemplo, \`${callText("puede_entrar", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def puede_entrar(edad, entrada, socio):
    return False
`,
        solution: py`def puede_entrar(edad, entrada, socio):
    return ${rule.code}
`,
        tests: fnTests("puede_entrar", cases),
      };
    },
  },
  {
    id: "g-condicionales",
    mission: "py-if",
    title: "Clasificar con if, elif y else",
    skills: ["condicionales"],
    difficulty: 2,
    hints: ["Ordena las condiciones de un extremo al otro: con elif, solo se ejecuta la primera que se cumple.", "Mira bien los límites: «menos de» es <, «hasta» es <=."],
    make(r) {
      const kind = r.pick(["nota", "temperatura", "velocidad"] as const);
      let text: string;
      let f: (x: number) => string;
      let code: string;
      let values: number[];
      if (kind === "nota") {
        const b = r.pick([6.5, 7]);
        const c = r.pick([8.5, 9]);
        text = `una nota de 0 a 10: \`"suspenso"\` si es menor que 5, \`"aprobado"\` si es menor que ${b}, \`"notable"\` si es menor que ${c} y \`"sobresaliente"\` en otro caso`;
        f = (x) => (x < 5 ? "suspenso" : x < b ? "aprobado" : x < c ? "notable" : "sobresaliente");
        code = `if x < 5:\n        return "suspenso"\n    elif x < ${b}:\n        return "aprobado"\n    elif x < ${c}:\n        return "notable"\n    else:\n        return "sobresaliente"`;
        values = [5, b, c, 4.9, r.int(0, 40) / 10, r.int(50, 100) / 10, 10];
      } else if (kind === "temperatura") {
        const t1 = r.int(-2, 4);
        const t2 = t1 + r.int(8, 12);
        const t3 = t2 + r.int(8, 10);
        text = `una temperatura en °C: \`"helada"\` si es menor que ${t1}, \`"fresco"\` si es menor que ${t2}, \`"agradable"\` si es como mucho ${t3} y \`"calor"\` si pasa de ${t3}`;
        f = (x) => (x < t1 ? "helada" : x < t2 ? "fresco" : x <= t3 ? "agradable" : "calor");
        code = `if x < ${t1}:\n        return "helada"\n    elif x < ${t2}:\n        return "fresco"\n    elif x <= ${t3}:\n        return "agradable"\n    else:\n        return "calor"`;
        values = [t1, t2, t3, t3 + 1, t1 - 3, r.int(t1, t3), t3 + r.int(2, 15)];
      } else {
        const L = r.pick([30, 50, 80, 90, 120]);
        const m = r.pick([10, 20, 30]);
        text = `una velocidad en km/h en una vía limitada a ${L}: \`"correcto"\` si no supera ${L}, \`"multa leve"\` si no supera ${L + m} y \`"multa grave"\` si va más rápido`;
        f = (x) => (x <= L ? "correcto" : x <= L + m ? "multa leve" : "multa grave");
        code = `if x <= ${L}:\n        return "correcto"\n    elif x <= ${L + m}:\n        return "multa leve"\n    else:\n        return "multa grave"`;
        values = [L, L + 1, L + m, L + m + 1, r.int(0, L), L + m + r.int(5, 60)];
      }
      const cases = r.shuffle(values).map((x) => ({ args: [x], expected: f(x) }));
      return {
        prompt: [`Escribe \`clasifica(x)\` que reciba ${text}.`, "", `Por ejemplo, \`${callText("clasifica", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def clasifica(x):
    pass
`,
        solution: py`def clasifica(x):
    ${code}
`,
        tests: fnTests("clasifica", cases),
      };
    },
  },
  {
    id: "g-bucle-for",
    mission: "py-for",
    title: "Acumular con for",
    skills: ["bucles"],
    difficulty: 2,
    hints: ["Empieza con un acumulador (suma = 0 o contador = 0) antes del bucle y actualízalo dentro.", "range(1, n + 1) recorre 1, 2, …, n: el final de range no se incluye."],
    make(r) {
      const k = r.int(2, 9);
      const d = r.int(0, 9);
      const ops = [
        { text: `la suma de los números de 1 a \`n\` (incluido) que son múltiplos de ${k}`, f: (n: number) => { let s = 0; for (let i = 1; i <= n; i++) if (i % k === 0) s += i; return s; }, code: `total = 0\n    for i in range(1, n + 1):\n        if i % ${k} == 0:\n            total += i\n    return total` },
        { text: "la suma de los cuadrados de los números de 1 a `n` (incluido)", f: (n: number) => { let s = 0; for (let i = 1; i <= n; i++) s += i * i; return s; }, code: "total = 0\n    for i in range(1, n + 1):\n        total += i * i\n    return total" },
        { text: `cuántos números de 1 a \`n\` (incluido) terminan en la cifra ${d}`, f: (n: number) => { let c = 0; for (let i = 1; i <= n; i++) if (i % 10 === d) c++; return c; }, code: `total = 0\n    for i in range(1, n + 1):\n        if i % 10 == ${d}:\n            total += 1\n    return total` },
        { text: `cuántos números de 1 a \`n\` (incluido) **no** son múltiplos de ${k}`, f: (n: number) => { let c = 0; for (let i = 1; i <= n; i++) if (i % k !== 0) c++; return c; }, code: `total = 0\n    for i in range(1, n + 1):\n        if i % ${k} != 0:\n            total += 1\n    return total` },
      ];
      const op = r.pick(ops);
      const cases = [r.int(10, 40), r.int(1, 9), r.int(41, 200), 1, r.int(201, 500)].map((n) => ({ args: [n], expected: op.f(n) }));
      return {
        prompt: [`Escribe \`cuenta(n)\` que devuelva ${op.text}. Usa un bucle \`for\`.`, "", `Por ejemplo, \`${callText("cuenta", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def cuenta(n):
    total = 0
    return total
`,
        solution: py`def cuenta(n):
    ${op.code}
`,
        tests: fnTests("cuenta", cases) + requireSyntax(["For"], "Resuélvelo con un bucle for: es lo que se practica aquí."),
      };
    },
  },
  {
    id: "g-bucle-while",
    mission: "py-while",
    title: "Repetir hasta que se cumpla",
    skills: ["bucles"],
    difficulty: 3,
    hints: ["while repite mientras la condición sea verdadera: escribe la condición de «seguir», no la de parar.", "Lleva un contador de pasos y actualiza la variable dentro del bucle, o el bucle no terminará."],
    make(r) {
      const kind = r.pick(["ahorro", "collatz", "division"] as const);
      if (kind === "ahorro") {
        const p = r.int(2, 9);
        const f = (c: number, obj: number) => { let n = 0; while (c < obj) { c = c * (1 + p / 100); n++; } return n; };
        const cases = Array.from({ length: 5 }, (_, i) => {
          const c = r.int(5, 50) * 100;
          const obj = i === 4 ? c : c * r.int(12, 30) / 10;
          return { args: [c, obj], expected: f(c, obj) };
        });
        return {
          prompt: [`Un ahorro crece un ${p} % cada año (interés compuesto). Escribe \`anios(capital, objetivo)\` que devuelva cuántos años completos hacen falta para que el capital llegue **al menos** al objetivo. Si ya lo alcanza, devuelve 0.`, "", `Por ejemplo, \`${callText("anios", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
          starter: py`def anios(capital, objetivo):
    n = 0
    return n
`,
          solution: py`def anios(capital, objetivo):
    n = 0
    while capital < objetivo:
        capital = capital * (1 + ${p} / 100)
        n += 1
    return n
`,
          tests: fnTests("anios", cases) + requireSyntax(["While"], "Resuélvelo con un bucle while: es lo que se practica aquí."),
        };
      }
      if (kind === "collatz") {
        const f = (n: number) => { let s = 0; while (n !== 1) { n = n % 2 === 0 ? n / 2 : 3 * n + 1; s++; } return s; };
        const cases = [r.int(5, 30), 1, r.int(31, 100), r.int(101, 1000), 2].map((n) => ({ args: [n], expected: f(n) }));
        return {
          prompt: ["Escribe `pasos(n)` que cuente cuántos pasos hacen falta para llegar a 1 aplicando esta regla: si el número es par, se divide entre 2; si es impar, se multiplica por 3 y se suma 1. Con `n = 1` no hace falta ningún paso.", "", `Por ejemplo, \`${callText("pasos", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
          starter: py`def pasos(n):
    contador = 0
    return contador
`,
          solution: py`def pasos(n):
    contador = 0
    while n != 1:
        if n % 2 == 0:
            n = n // 2
        else:
            n = 3 * n + 1
        contador += 1
    return contador
`,
          tests: fnTests("pasos", cases) + requireSyntax(["While"], "Resuélvelo con un bucle while: es lo que se practica aquí."),
        };
      }
      const d = r.int(2, 5);
      const f = (x: number) => { let n = 0; while (x >= 1) { x = x / d; n++; } return n; };
      const cases = [r.int(10, 500), 0.5, r.int(501, 100000), 1, r.int(2, 9)].map((x) => ({ args: [x], expected: f(x) }));
      return {
        prompt: [`Escribe \`divisiones(x)\` que cuente cuántas veces hay que dividir \`x\` entre ${d} para que el resultado sea menor que 1. Si \`x\` ya es menor que 1, devuelve 0.`, "", `Por ejemplo, \`${callText("divisiones", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def divisiones(x):
    n = 0
    return n
`,
        solution: py`def divisiones(x):
    n = 0
    while x >= 1:
        x = x / ${d}
        n += 1
    return n
`,
        tests: fnTests("divisiones", cases) + requireSyntax(["While"], "Resuélvelo con un bucle while: es lo que se practica aquí."),
      };
    },
  },
  {
    id: "g-listas",
    mission: "py-listas",
    title: "Filtrar una lista",
    skills: ["listas"],
    difficulty: 2,
    hints: ["Crea una lista vacía, recorre la original y añade con append() los elementos que cumplen la condición.", "No modifiques la lista que recibes: construye una nueva."],
    make(r) {
      const u = r.int(10, 60);
      const a = r.int(5, 30);
      const b = a + r.int(10, 40);
      const ops = [
        { text: `los números mayores que ${u}`, f: (x: number) => x > u, cond: `x > ${u}` },
        { text: "los números pares", f: (x: number) => x % 2 === 0, cond: "x % 2 == 0" },
        { text: `los números entre ${a} y ${b}, ambos incluidos`, f: (x: number) => x >= a && x <= b, cond: `${a} <= x <= ${b}` },
        { text: `los números que no son múltiplos de 3 y son menores que ${u}`, f: (x: number) => x % 3 !== 0 && x < u, cond: `x % 3 != 0 and x < ${u}` },
      ];
      const op = r.pick(ops);
      const cases = Array.from({ length: 5 }, (_, i) => {
        if (i === 4) return { args: [[]], expected: [] };
        // Each list keeps at least one element, so returning an empty list never passes.
        let xs: number[];
        do xs = Array.from({ length: r.int(5, 10) }, () => r.int(0, 99));
        while (!xs.some(op.f));
        return { args: [xs], expected: xs.filter(op.f) };
      });
      const extra = py`
def test_no_modifica():
    """No modifica la lista original"""
    original = ${lit((cases[0].args[0] as number[]))}
    copia = list(original)
    t.call("filtra", original)
    assert original == copia, "Tu función cambió la lista que recibió. Construye una lista nueva."
`;
      return {
        prompt: [`Escribe \`filtra(numeros)\` que devuelva una **nueva** lista con ${op.text}, en el mismo orden en que aparecen.`, "", `Por ejemplo, \`${callText("filtra", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def filtra(numeros):
    resultado = []
    return resultado
`,
        solution: py`def filtra(numeros):
    resultado = []
    for x in numeros:
        if ${op.cond}:
            resultado.append(x)
    return resultado
`,
        tests: fnTests("filtra", cases, { extra }),
      };
    },
  },
  {
    id: "g-slicing",
    mission: "py-indices",
    title: "Cortar listas con slicing",
    skills: ["listas", "indices"],
    difficulty: 2,
    hints: ["lista[inicio:fin:paso] — el fin no se incluye y los índices negativos cuentan desde el final.", "Ejemplos: lista[:3] son los tres primeros; lista[-2:] los dos últimos; lista[::-1] la lista al revés."],
    make(r) {
      const k = r.int(2, 4);
      const ops = [
        { text: `los ${k} primeros elementos`, f: (xs: string[]) => xs.slice(0, k), code: `lista[:${k}]` },
        { text: `los ${k} últimos elementos`, f: (xs: string[]) => xs.slice(-k), code: `lista[-${k}:]` },
        { text: `todos menos los ${k} primeros`, f: (xs: string[]) => xs.slice(k), code: `lista[${k}:]` },
        { text: "uno de cada dos, empezando por el primero", f: (xs: string[]) => xs.filter((_, i) => i % 2 === 0), code: "lista[::2]" },
        { text: "uno de cada dos, empezando por el segundo", f: (xs: string[]) => xs.filter((_, i) => i % 2 === 1), code: "lista[1::2]" },
        { text: "la lista al revés", f: (xs: string[]) => [...xs].reverse(), code: "lista[::-1]" },
        { text: "todos menos el primero y el último", f: (xs: string[]) => xs.slice(1, -1), code: "lista[1:-1]" },
      ];
      const op = r.pick(ops);
      const cases = Array.from({ length: 5 }, () => {
        const xs = r.sample(PALABRAS, r.int(k + 2, 9));
        return { args: [xs], expected: op.f(xs) };
      });
      return {
        prompt: [`Escribe \`recorta(lista)\` que devuelva ${op.text} de la lista. Hazlo con *slicing* (\`lista[inicio:fin:paso]\`), sin bucles.`, "", `Por ejemplo, \`${callText("recorta", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def recorta(lista):
    pass
`,
        solution: py`def recorta(lista):
    return ${op.code}
`,
        tests: fnTests("recorta", cases) + requireSyntax(["Slice"], "Resuélvelo con slicing (lista[inicio:fin:paso]): es lo que se practica aquí."),
      };
    },
  },
  {
    id: "g-conjuntos",
    mission: "py-tuplas-sets",
    title: "Operaciones con conjuntos",
    skills: ["conjuntos"],
    difficulty: 2,
    hints: ["set(lista) quita los repetidos. Con conjuntos: a & b (en los dos), a - b (en a pero no en b), a ^ b (en uno solo).", "sorted() devuelve una lista ordenada a partir de cualquier colección."],
    make(r) {
      const ops = [
        { text: "los elementos que están en las dos listas", f: (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x)), code: "set(a) & set(b)" },
        { text: "los elementos de `a` que no están en `b`", f: (a: Set<string>, b: Set<string>) => [...a].filter((x) => !b.has(x)), code: "set(a) - set(b)" },
        { text: "los elementos que están en una sola de las dos listas", f: (a: Set<string>, b: Set<string>) => [...a].filter((x) => !b.has(x)).concat([...b].filter((x) => !a.has(x))), code: "set(a) ^ set(b)" },
        { text: "todos los elementos distintos de las dos listas juntas", f: (a: Set<string>, b: Set<string>) => [...new Set([...a, ...b])], code: "set(a) | set(b)" },
      ];
      const op = r.pick(ops);
      const sorted = (xs: string[]) => [...xs].sort();
      const cases = Array.from({ length: 5 }, () => {
        const pool = r.sample(PALABRAS, 9);
        const a = Array.from({ length: r.int(3, 7) }, () => r.pick(pool.slice(0, 6)));
        const b = Array.from({ length: r.int(3, 7) }, () => r.pick(pool.slice(3)));
        return { args: [a, b], expected: sorted(op.f(new Set(a), new Set(b))) };
      });
      return {
        prompt: [`Escribe \`compara(a, b)\` que reciba dos listas (pueden tener repetidos) y devuelva una lista **ordenada alfabéticamente y sin repetidos** con ${op.text}.`, "", `Por ejemplo, \`${callText("compara", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def compara(a, b):
    return []
`,
        solution: py`def compara(a, b):
    return sorted(${op.code})
`,
        tests: fnTests("compara", cases),
      };
    },
  },
  {
    id: "g-diccionarios",
    mission: "py-dicts",
    title: "Contar con diccionarios",
    skills: ["diccionarios"],
    difficulty: 2,
    hints: ["Empieza con un diccionario vacío y, para cada elemento, suma 1 a su clave: d[clave] = d.get(clave, 0) + 1.", "Piensa qué es la clave en cada caso: la palabra, su primera letra o su longitud."],
    make(r) {
      const ops = [
        { text: "cuántas veces aparece cada palabra", key: (w: string) => w, code: "p" },
        { text: "cuántas palabras empiezan por cada letra (la clave es la letra)", key: (w: string) => w[0], code: "p[0]" },
        { text: "cuántas palabras hay de cada longitud (la clave es el número de letras)", key: (w: string) => w.length, code: "len(p)" },
        { text: "cuántas palabras terminan en cada letra (la clave es la última letra)", key: (w: string) => w[w.length - 1], code: "p[-1]" },
      ];
      const op = r.pick(ops);
      const cases = Array.from({ length: 5 }, (_, i) => {
        const pool = r.sample(PALABRAS, 5);
        const ws = i === 4 ? [] : Array.from({ length: r.int(4, 9) }, () => r.pick(pool));
        const d: Record<string, number> = {};
        for (const w of ws) d[String(op.key(w))] = (d[String(op.key(w))] ?? 0) + 1;
        return { args: [ws], expected: d };
      });
      // Dict literal written by hand: the length variant has integer keys.
      const numeric = typeof op.key("ab") === "number";
      const pyDict = (d: Record<string, number>) => `{${Object.entries(d).map(([k, v]) => `${numeric ? k : JSON.stringify(k)}: ${v}`).join(", ")}}`;
      const tests = fnTests("cuenta", cases.map((c) => ({ args: c.args, expected: c.expected, expectedPy: pyDict(c.expected) })));
      return {
        prompt: [`Escribe \`cuenta(palabras)\` que reciba una lista de palabras y devuelva un diccionario con ${op.text}.`, "", `Por ejemplo, \`${callText("cuenta", cases[0].args)}\` devuelve \`${pyDict(cases[0].expected)}\` (el orden de las claves no importa).`],
        starter: py`def cuenta(palabras):
    conteo = {}
    return conteo
`,
        solution: py`def cuenta(palabras):
    conteo = {}
    for p in palabras:
        clave = ${op.code}
        conteo[clave] = conteo.get(clave, 0) + 1
    return conteo
`,
        tests,
      };
    },
  },
  {
    id: "g-parametros",
    mission: "py-funciones",
    title: "Funciones con valores por defecto",
    skills: ["funciones"],
    difficulty: 2,
    hints: ["Un parámetro con valor por defecto se escribe así: def f(x, y=10). Si quien llama no da y, vale 10.", "Los parámetros con valor por defecto van siempre después de los obligatorios."],
    make(r) {
      const kind = r.pick(["descuento", "propina", "saludo"] as const);
      if (kind === "saludo") {
        const saludo = r.pick(["Hola", "Buenos días", "Bienvenida", "Saludos", "Buenas tardes"]);
        const nombre = () => r.pick(NOMBRES);
        const n1 = nombre();
        const cases: Case[] = [
          { args: [n1], expected: `${saludo}, ${n1}!` },
          { args: [nombre()], expected: "" },
          { args: [nombre(), "Hasta luego"], expected: "" },
          { args: [nombre(), "Qué tal"], expected: "" },
        ].map((c) => ({ args: c.args, expected: `${c.args[1] ?? saludo}, ${c.args[0]}!` }));
        return {
          prompt: [`Escribe \`saluda(nombre, saludo="${saludo}")\` que devuelva el texto \`"<saludo>, <nombre>!"\`. Si no se indica el saludo, se usa \`"${saludo}"\`.`, "", `Por ejemplo, \`${callText("saluda", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\` y \`saluda("Ana", "Hasta luego")\` devuelve \`"Hasta luego, Ana!"\`.`],
          starter: py`def saluda(nombre):
    pass
`,
          solution: py`def saluda(nombre, saludo=${lit(saludo)}):
    return f"{saludo}, {nombre}!"
`,
          tests: fnTests("saluda", cases),
        };
      }
      const pct = kind === "descuento" ? r.pick([5, 10, 15, 20, 25, 30]) : r.pick([5, 8, 10, 12, 15, 20]);
      const name = kind === "descuento" ? "precio_final" : "total_cuenta";
      const param = kind === "descuento" ? "descuento" : "propina";
      const f = (x: number, p: number) => (kind === "descuento" ? x * (1 - p / 100) : x * (1 + p / 100));
      const amount = () => r.int(500, 20000) / 100;
      const a0 = amount();
      const cases: Case[] = [
        { args: [a0], expected: f(a0, pct) },
        ...[amount(), amount()].map((x) => ({ args: [x], expected: f(x, pct) })),
        ...[amount(), amount()].map((x) => {
          const p = r.pick([0, 3, 7, 18, 40]);
          return { args: [x, p], expected: f(x, p) };
        }),
      ];
      const what = kind === "descuento" ? `el precio después de aplicarle un descuento del \`${param}\` por ciento` : `el total de la cuenta sumándole una propina del \`${param}\` por ciento`;
      return {
        prompt: [`Escribe \`${name}(importe, ${param}=${pct})\` que devuelva ${what}. Si no se indica, el ${param} es del ${pct} %. No redondees.`, "", `Por ejemplo, \`${callText(name, cases[0].args)}\` devuelve ${eq(cases[0].expected as number)}.`],
        starter: py`def ${name}(importe):
    pass
`,
        solution: py`def ${name}(importe, ${param}=${pct}):
    return importe * (1 ${kind === "descuento" ? "-" : "+"} ${param} / 100)
`,
        tests: fnTests(name, cases, { tol: 1e-9 }),
      };
    },
  },
  {
    id: "g-comprensiones",
    mission: "py-comprension",
    title: "Listas y diccionarios en una línea",
    skills: ["listas", "comprension"],
    difficulty: 3,
    hints: ["Forma de una comprensión: [expresión for elemento in colección if condición].", "Para diccionarios: {clave: valor for elemento in colección}."],
    make(r) {
      const k = r.int(2, 5);
      const L = r.int(3, 5);
      const ops = [
        { text: `una lista con los cuadrados de los múltiplos de ${k} entre 1 y \`n\` (incluido)`, arg: "n", gen: () => r.int(5, 40), f: (n: number) => { const o: number[] = []; for (let i = 1; i <= n; i++) if (i % k === 0) o.push(i * i); return o; }, code: `[i * i for i in range(1, n + 1) if i % ${k} == 0]`, name: "genera" },
        { text: `una lista con las palabras de más de ${L} letras, en mayúsculas`, arg: "palabras", gen: () => r.sample(PALABRAS, r.int(4, 8)), f: (ws: string[]) => ws.filter((w) => w.length > L).map((w) => w.toUpperCase()), code: `[p.upper() for p in palabras if len(p) > ${L}]`, name: "genera" },
        { text: "un diccionario que asocie cada palabra con su número de letras", arg: "palabras", gen: () => r.sample(PALABRAS, r.int(3, 6)), f: (ws: string[]) => Object.fromEntries(ws.map((w) => [w, w.length])), code: "{p: len(p) for p in palabras}", name: "genera" },
        { text: `una lista con el último carácter de cada palabra que tenga al menos ${L} letras`, arg: "palabras", gen: () => r.sample(PALABRAS, r.int(4, 8)), f: (ws: string[]) => ws.filter((w) => w.length >= L).map((w) => w[w.length - 1]), code: `[p[-1] for p in palabras if len(p) >= ${L}]`, name: "genera" },
      ];
      const op = r.pick(ops) as { text: string; arg: string; gen: () => unknown; f: (x: unknown) => unknown; code: string };
      const cases = Array.from({ length: 5 }, () => {
        const x = op.gen();
        return { args: [x], expected: op.f(x) };
      });
      return {
        prompt: [`Escribe \`genera(${op.arg})\` que devuelva ${op.text}. Usa una comprensión.`, "", `Por ejemplo, \`${callText("genera", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def genera(${op.arg}):
    pass
`,
        solution: py`def genera(${op.arg}):
    return ${op.code}
`,
        tests: fnTests("genera", cases) + requireSyntax(["ListComp", "DictComp", "SetComp"], "Resuélvelo con una comprensión ([... for ... in ...]): es lo que se practica aquí."),
      };
    },
  },
  {
    id: "g-excepciones",
    mission: "py-errores",
    title: "Capturar errores con try y except",
    skills: ["errores"],
    difficulty: 2,
    hints: ["Pon la operación que puede fallar dentro de try y la respuesta alternativa en except.", "Captura el error concreto (ValueError, ZeroDivisionError…), no todos los errores a la vez."],
    make(r) {
      const kind = r.pick(["numero", "division"] as const);
      if (kind === "numero") {
        const def = r.pick([0, -1, null]);
        const good = () => String(r.int(-500, 500) / r.pick([1, 10, 4]));
        const bad = () => r.pick(["", "abc", "12,5", "dos", "1.2.3", "--4", "N/A"]);
        const inputs = r.shuffle([good(), bad(), good(), bad(), good(), " 7 "]);
        const cases = inputs.map((s) => {
          const n = Number(s.trim());
          const valid = s.trim() !== "" && /^[-+]?\d*\.?\d+$/.test(s.trim()) && Number.isFinite(n);
          return { args: [s], expected: valid ? n : def };
        });
        return {
          prompt: [`Escribe \`a_numero(texto)\` que convierta el texto en número decimal con \`float()\`. Si el texto no es un número válido, en lugar de fallar debe devolver \`${lit(def)}\`.`, "", `Por ejemplo, \`${callText("a_numero", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
          starter: py`def a_numero(texto):
    return float(texto)
`,
          solution: py`def a_numero(texto):
    try:
        return float(texto)
    except ValueError:
        return ${lit(def)}
`,
          tests: fnTests("a_numero", cases) + requireSyntax(["Try"], "Usa try/except: es lo que se practica aquí."),
        };
      }
      const msg = r.pick(["sin divisor", "no se puede dividir entre cero", "error"]);
      const cases = r.shuffle([
        [r.int(1, 100), r.int(1, 9)],
        [r.int(1, 100), 0],
        [r.int(-50, 50), r.int(2, 8)],
        [0, 0],
        [r.int(1, 100), r.pick([-4, -2, 5])],
      ]).map(([a, b]) => ({ args: [a, b], expected: b === 0 ? msg : a / b }));
      return {
        prompt: [`Escribe \`divide(a, b)\` que devuelva \`a / b\`. Si \`b\` es 0, en lugar de fallar debe devolver el texto \`${lit(msg)}\`.`, "", `Por ejemplo, \`${callText("divide", cases[0].args)}\` devuelve \`${typeof cases[0].expected === "number" ? show(cases[0].expected) : lit(cases[0].expected)}\`.`],
        starter: py`def divide(a, b):
    return a / b
`,
        solution: py`def divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return ${lit(msg)}
`,
        tests: fnTests("divide", cases) + requireSyntax(["Try"], "Usa try/except: es lo que se practica aquí."),
      };
    },
  },
  {
    id: "g-archivos",
    mission: "py-archivos",
    title: "Leer un archivo de texto",
    skills: ["archivos"],
    difficulty: 2,
    hints: ["with open(ruta, encoding=\"utf-8\") as f: abre el archivo y lo cierra solo al terminar.", "Recorrer el archivo con for linea in f: da una línea cada vez, con el salto de línea al final (quítalo con strip())."],
    make(r) {
      const ops = [
        { text: "cuántas líneas contienen la palabra `palabra` (sin distinguir mayúsculas de minúsculas)", arg: true, f: (ls: string[], w: string) => ls.filter((l) => l.toLowerCase().includes(w)).length, code: "total = 0\n        for linea in f:\n            if palabra in linea.lower():\n                total += 1\n    return total" },
        { text: "cuántas palabras tiene el archivo en total", arg: false, f: (ls: string[]) => ls.reduce((s, l) => s + l.split(" ").filter(Boolean).length, 0), code: "total = 0\n        for linea in f:\n            total += len(linea.split())\n    return total" },
        { text: "la línea más larga, sin el salto de línea final (si hay empate, la primera)", arg: false, f: (ls: string[]) => ls.reduce((a, b) => (b.length > a.length ? b : a), ""), code: 'larga = ""\n        for linea in f:\n            linea = linea.rstrip("\\n")\n            if len(linea) > len(larga):\n                larga = linea\n    return larga' },
        { text: "cuántas líneas no están vacías", arg: false, f: (ls: string[]) => ls.filter((l) => l.trim() !== "").length, code: "total = 0\n        for linea in f:\n            if linea.strip():\n                total += 1\n    return total" },
      ];
      const op = r.pick(ops);
      const word = r.pick(PALABRAS);
      const makeLines = () =>
        Array.from({ length: r.int(4, 9) }, () =>
          r.next() < 0.15 ? "" : r.sample(PALABRAS, r.int(2, 6)).map((w) => (r.next() < 0.2 ? w.toUpperCase() : w)).join(" "),
        );
      const files: string[][] = Array.from({ length: 4 }, makeLines);
      // Make sure the searched word appears in the first file at least once.
      if (op.arg && !files[0].some((l) => l.toLowerCase().includes(word))) files[0][0] = `${files[0][0]} ${word.toUpperCase()}`.trim();
      const content = (ls: string[]) => ls.join("\n") + "\n";
      const sig = op.arg ? "ruta, palabra" : "ruta";
      const expect = (ls: string[]) => (op.arg ? op.f(ls, word) : (op.f as (l: string[]) => number | string)(ls));
      const extraCases = files.slice(1).map((ls, i) => ({ name: `otro_${i + 1}.txt`, text: content(ls), expected: expect(ls) }));
      const argText = op.arg ? `, ${lit(word)}` : "";
      const tests = py`
def test_ejemplo():
    """El ejemplo del enunciado"""
    esperado = ${lit(expect(files[0]))}
    r, _ = t.call("analiza", "diario.txt"${argText})
    assert r == esperado, f"Con diario.txt se esperaba {esperado!r}, pero devolviste {r!r}."


def test_otros_archivos():
    """Funciona con otros archivos"""
    for nombre, texto, esperado in ${lit(extraCases.map((c) => [c.name, c.text, c.expected]))}:
        with open(nombre, "w", encoding="utf-8") as f:
            f.write(texto)
        r, _ = t.call("analiza", nombre${argText})
        assert r == esperado, f"Con el archivo {nombre} (contenido: {texto!r}) se esperaba {esperado!r}, pero devolviste {r!r}."
`;
      return {
        prompt: [`El archivo \`diario.txt\` está en la carpeta del programa. Escribe \`analiza(${sig})\` que abra el archivo de la ruta indicada y devuelva ${op.text}.`, "", `Con \`diario.txt\`, \`analiza("diario.txt"${argText})\` devuelve \`${lit(expect(files[0]))}\`. Las pruebas también la usan con otros archivos.`],
        starter: py`def analiza(${sig}):
    with open(ruta, encoding="utf-8") as f:
        pass
`,
        solution: py`def analiza(${sig}):
    with open(ruta, encoding="utf-8") as f:
        ${op.code}
`,
        tests,
        files: { "diario.txt": content(files[0]) },
      };
    },
  },
  {
    id: "g-csv",
    mission: "py-json-csv",
    title: "Sumar una columna de un CSV",
    skills: ["archivos", "csv"],
    difficulty: 3,
    hints: ["csv.DictReader(f) da cada fila como un diccionario cuyas claves son los nombres de las columnas.", "Los valores llegan como texto: convierte el importe con float() antes de sumarlo."],
    make(r) {
      const regiones = r.sample(["norte", "sur", "este", "oeste", "centro"], 3);
      const modo = r.pick(["suma", "cuenta", "media"] as const);
      const makeRows = () =>
        Array.from({ length: r.int(6, 12) }, () => ({ region: r.pick(regiones), producto: r.pick(PRODUCTOS), importe: r.int(100, 9999) / 100 }));
      const csvText = (rows: { region: string; producto: string; importe: number }[]) => "region,producto,importe\n" + rows.map((x) => `${x.region},${x.producto},${x.importe}`).join("\n") + "\n";
      const calc = (rows: { region: string; importe: number }[], reg: string) => {
        const xs = rows.filter((x) => x.region === reg).map((x) => x.importe);
        if (modo === "cuenta") return xs.length;
        const s = xs.reduce((a, b) => a + b, 0);
        if (modo === "suma") return s;
        return xs.length ? s / xs.length : 0;
      };
      const main = makeRows();
      const reg0 = main[0].region;
      const others = Array.from({ length: 3 }, makeRows);
      const what = modo === "suma" ? "la suma de la columna `importe`" : modo === "cuenta" ? "cuántas filas hay" : "la media de la columna `importe` (0 si no hay ninguna fila)";
      const rows = others.map((rs, i) => {
        const reg = r.pick(regiones);
        return [`otro_${i + 1}.csv`, csvText(rs), reg, calc(rs, reg)];
      });
      const tests = py`
def test_ejemplo():
    """El ejemplo del enunciado"""
    esperado = ${lit(calc(main, reg0))}
    r, _ = t.call("resumen", "ventas.csv", ${lit(reg0)})
    assert r is not None and approx(r, esperado, 1e-9), f"Con ventas.csv y la región ${reg0} se esperaba {esperado!r}, pero devolviste {r!r}."


def test_otros_archivos():
    """Funciona con otros archivos y regiones"""
    for nombre, texto, region, esperado in ${lit(rows)}:
        with open(nombre, "w", encoding="utf-8") as f:
            f.write(texto)
        r, _ = t.call("resumen", nombre, region)
        assert r is not None and approx(r, esperado, 1e-9), f"Con {nombre} y la región {region!r} se esperaba {esperado!r}, pero devolviste {r!r}."
`;
      const body =
        modo === "suma"
          ? 'total = 0\n        for fila in csv.DictReader(f):\n            if fila["region"] == region:\n                total += float(fila["importe"])\n    return total'
          : modo === "cuenta"
            ? 'total = 0\n        for fila in csv.DictReader(f):\n            if fila["region"] == region:\n                total += 1\n    return total'
            : 'importes = []\n        for fila in csv.DictReader(f):\n            if fila["region"] == region:\n                importes.append(float(fila["importe"]))\n    if not importes:\n        return 0\n    return sum(importes) / len(importes)';
      return {
        prompt: [`El archivo \`ventas.csv\` tiene las columnas \`region\`, \`producto\` e \`importe\`. Escribe \`resumen(ruta, region)\` que lea el CSV de la ruta indicada y devuelva, para las filas de esa región, ${what}.`, "", `Con \`ventas.csv\`, \`resumen("ventas.csv", ${lit(reg0)})\` devuelve ${eq(calc(main, reg0))}.`],
        starter: py`import csv


def resumen(ruta, region):
    with open(ruta, encoding="utf-8") as f:
        pass
`,
        solution: py`import csv


def resumen(ruta, region):
    with open(ruta, encoding="utf-8") as f:
        ${body}
`,
        tests,
        files: { "ventas.csv": csvText(main) },
      };
    },
  },
];
