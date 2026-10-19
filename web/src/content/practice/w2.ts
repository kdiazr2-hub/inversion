// Practice drills for World 2 (computational thinking and Python beyond the basics).
import { py, type Drill } from "../types";
import { callText, fnTests, lit, NOMBRES, PALABRAS, show, type Case } from "./kit";

/** Test that the function `name` calls itself somewhere in its body. */
const recursiveTest = (name: string) => py`
def test_recursiva():
    """La función se llama a sí misma"""
    import ast
    defs = [n for n in ast.walk(t.tree()) if isinstance(n, ast.FunctionDef) and n.name == ${lit(name)}]
    assert defs, "No encuentro la función ${name}."
    llamadas = [c for c in ast.walk(defs[0]) if isinstance(c, ast.Call) and isinstance(c.func, ast.Name) and c.func.id == ${lit(name)}]
    assert llamadas, "${name} no se llama a sí misma: aquí se practica la recursividad (sin bucles)."
`;

type Nested = (number | Nested)[];

export const DRILLS_W2: Drill[] = [
  {
    id: "g-recursion",
    mission: "w2-recursion",
    title: "Pensar en recursivo",
    skills: ["recursion"],
    difficulty: 3,
    hints: ["Toda función recursiva necesita un caso base que se resuelve sin llamarse a sí misma.", "En el caso general, resuelve un problema más pequeño con una llamada recursiva y combina su resultado."],
    make(r) {
      const kind = r.pick(["digitos", "potencia", "anidada", "aplana", "palindromo"] as const);
      if (kind === "digitos") {
        const f = (n: number): number => (n < 10 ? n : (n % 10) + f(Math.floor(n / 10)));
        const cases = [r.int(100, 99999), r.int(0, 9), r.int(10, 99), r.int(100000, 9999999), 0].map((n) => ({ args: [n], expected: f(n) }));
        return {
          prompt: ["Escribe la función **recursiva** `suma_digitos(n)` que devuelva la suma de las cifras de un entero `n ≥ 0`. Pista de partida: las cifras de `n` son la última (`n % 10`) y las de `n // 10`.", "", `Por ejemplo, \`${callText("suma_digitos", cases[0].args)}\` devuelve \`${cases[0].expected}\`.`],
          starter: py`def suma_digitos(n):
    pass
`,
          solution: py`def suma_digitos(n):
    if n < 10:
        return n
    return n % 10 + suma_digitos(n // 10)
`,
          tests: fnTests("suma_digitos", cases) + recursiveTest("suma_digitos"),
        };
      }
      if (kind === "potencia") {
        const cases = Array.from({ length: 5 }, (_, i) => {
          const b = r.int(2, 9);
          const e = i === 3 ? 0 : r.int(1, 12);
          return { args: [b, e], expected: b ** e };
        });
        return {
          prompt: ["Escribe la función **recursiva** `potencia(base, exponente)` que calcule `base` elevado a `exponente` (un entero ≥ 0) sin usar `**` ni `pow`: `base⁰ = 1` y `baseⁿ = base · baseⁿ⁻¹`.", "", `Por ejemplo, \`${callText("potencia", cases[0].args)}\` devuelve \`${cases[0].expected}\`.`],
          starter: py`def potencia(base, exponente):
    pass
`,
          solution: py`def potencia(base, exponente):
    if exponente == 0:
        return 1
    return base * potencia(base, exponente - 1)
`,
          tests:
            fnTests("potencia", cases) +
            recursiveTest("potencia") +
            py`
def test_sin_potencia():
    """No usa ** ni pow"""
    import ast
    assert not any(isinstance(n, ast.BinOp) and isinstance(n.op, ast.Pow) for n in ast.walk(t.tree())), "No uses **: construye la potencia multiplicando."
    assert not t.calls("pow"), "No uses pow(): construye la potencia multiplicando."
`,
        };
      }
      const nested = (depth: number): Nested => Array.from({ length: r.int(1, 4) }, () => (depth > 0 && r.next() < 0.35 ? nested(depth - 1) : r.int(0, 9)));
      if (kind === "anidada") {
        const x = r.int(0, 9);
        const count = (xs: Nested): number => xs.reduce<number>((s, v) => s + (Array.isArray(v) ? count(v) : v === x ? 1 : 0), 0);
        const cases = Array.from({ length: 5 }, (_, i) => {
          const xs = i === 4 ? [] : nested(3);
          return { args: [xs], expected: count(xs) };
        });
        return {
          prompt: [`Una lista puede contener números y otras listas, a cualquier profundidad. Escribe la función **recursiva** \`cuenta(lista)\` que devuelva cuántas veces aparece el número ${x} en total.`, "", `Por ejemplo, \`${callText("cuenta", cases[0].args)}\` devuelve \`${cases[0].expected}\`.`],
          starter: py`def cuenta(lista):
    pass
`,
          solution: py`def cuenta(lista):
    total = 0
    for elemento in lista:
        if isinstance(elemento, list):
            total += cuenta(elemento)
        elif elemento == ${x}:
            total += 1
    return total
`,
          tests: fnTests("cuenta", cases) + recursiveTest("cuenta"),
        };
      }
      if (kind === "aplana") {
        const flat = (xs: Nested): number[] => xs.flatMap((v) => (Array.isArray(v) ? flat(v) : [v]));
        const cases = Array.from({ length: 5 }, (_, i) => {
          const xs = i === 4 ? [[], [[]]] : nested(3);
          return { args: [xs], expected: flat(xs as Nested) };
        });
        return {
          prompt: ["Una lista puede contener números y otras listas, a cualquier profundidad. Escribe la función **recursiva** `aplana(lista)` que devuelva una lista con todos los números en el orden en que aparecen, sin listas dentro.", "", `Por ejemplo, \`${callText("aplana", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
          starter: py`def aplana(lista):
    pass
`,
          solution: py`def aplana(lista):
    resultado = []
    for elemento in lista:
        if isinstance(elemento, list):
            resultado.extend(aplana(elemento))
        else:
            resultado.append(elemento)
    return resultado
`,
          tests: fnTests("aplana", cases) + recursiveTest("aplana"),
        };
      }
      const pal = (w: string) => w + [...w].reverse().join("").slice(r.int(0, 1));
      const words = [pal(r.pick(PALABRAS)), r.pick(PALABRAS), pal(r.pick(PALABRAS)), "a", "", r.pick(PALABRAS) + "x"];
      const isPal = (s: string) => s === [...s].reverse().join("");
      const cases = r.shuffle(words).map((w) => ({ args: [w], expected: isPal(w) }));
      return {
        prompt: ["Escribe la función **recursiva** `es_palindromo(texto)` que devuelva `True` si el texto se lee igual al derecho y al revés. Caso base: un texto de 0 o 1 letras lo es; si no, la primera y la última letra deben coincidir y el interior debe serlo también.", "", `Por ejemplo, \`${callText("es_palindromo", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def es_palindromo(texto):
    pass
`,
        solution: py`def es_palindromo(texto):
    if len(texto) <= 1:
        return True
    if texto[0] != texto[-1]:
        return False
    return es_palindromo(texto[1:-1])
`,
        tests: fnTests("es_palindromo", cases) + recursiveTest("es_palindromo"),
      };
    },
  },
  {
    id: "g-clases",
    mission: "w2-clases",
    title: "Diseñar una clase",
    skills: ["poo"],
    difficulty: 3,
    hints: ["__init__ guarda los datos de cada objeto en self (self.saldo = saldo).", "Los métodos reciben self como primer parámetro y leen o cambian sus atributos."],
    make(r) {
      const kind = r.pick(["cuenta", "rectangulo"] as const);
      if (kind === "cuenta") {
        const fee = r.pick([0, 0.5, 1, 2]);
        const titular = r.pick(NOMBRES);
        const inicial = r.int(0, 50) * 10;
        // A random sequence of operations and the expected outcome of each one.
        let saldo = inicial;
        const ops: [string, number, string | number][] = [];
        for (let i = 0; i < 7; i++) {
          const op = r.next() < 0.5 ? "depositar" : "retirar";
          const x = r.int(1, 30) * 5;
          if (op === "depositar") {
            saldo += x;
            ops.push([op, x, saldo]);
          } else if (saldo >= x + fee) {
            saldo -= x + fee;
            ops.push([op, x, saldo]);
          } else ops.push([op, x, "error"]);
        }
        const feeText = fee ? ` Cada retirada cobra además una comisión de ${fee} €.` : "";
        return {
          prompt: [
            "Escribe la clase `Cuenta` con:",
            "",
            `- \`Cuenta(titular, saldo=0)\`: guarda el titular y el saldo inicial en los atributos \`titular\` y \`saldo\`.`,
            "- `depositar(cantidad)`: suma la cantidad al saldo.",
            `- \`retirar(cantidad)\`: resta la cantidad del saldo.${feeText} Si no hay saldo suficiente${fee ? " para la cantidad más la comisión" : ""}, lanza \`ValueError\` y deja el saldo como estaba.`,
            "",
            `Por ejemplo, con \`c = Cuenta(${lit(titular)}, ${inicial})\` y \`c.depositar(50)\`, \`c.saldo\` vale \`${inicial + 50}\`.`,
          ],
          starter: py`class Cuenta:
    def __init__(self, titular, saldo=0):
        pass
`,
          solution: py`class Cuenta:
    def __init__(self, titular, saldo=0):
        self.titular = titular
        self.saldo = saldo

    def depositar(self, cantidad):
        self.saldo += cantidad

    def retirar(self, cantidad):
        total = cantidad + ${fee}
        if total > self.saldo:
            raise ValueError("Saldo insuficiente")
        self.saldo -= total
`,
          tests: py`
def _nueva(*args):
    Cuenta = t.get("Cuenta")
    return Cuenta(*args)


def test_ejemplo():
    """El ejemplo del enunciado"""
    c = _nueva(${lit(titular)}, ${inicial})
    assert getattr(c, "titular", None) == ${lit(titular)}, "Guarda el titular en el atributo titular."
    assert approx(getattr(c, "saldo", None), ${inicial}), "Guarda el saldo inicial en el atributo saldo."
    c.depositar(50)
    assert approx(c.saldo, ${inicial + 50}), f"Tras depositar 50 el saldo debería ser ${inicial + 50}, pero es {c.saldo!r}."


def test_saldo_por_defecto():
    """Sin saldo inicial, empieza en 0"""
    c = _nueva("Ana")
    assert approx(getattr(c, "saldo", None), 0), "Si no se indica el saldo, debe empezar en 0."


def test_operaciones():
    """Una secuencia de depósitos y retiradas"""
    c = _nueva(${lit(titular)}, ${inicial})
    for op, x, esperado in ${lit(ops)}:
        if esperado == "error":
            antes = c.saldo
            try:
                getattr(c, op)(x)
            except ValueError:
                pass
            else:
                raise AssertionError(f"Retirar {x} con saldo {antes} debería lanzar ValueError.")
            assert approx(c.saldo, antes), f"Una retirada rechazada no debe cambiar el saldo (era {antes}, ahora {c.saldo})."
        else:
            getattr(c, op)(x)
            assert approx(c.saldo, esperado), f"Tras {op}({x}) el saldo debería ser {esperado}, pero es {c.saldo!r}."
`,
        };
      }
      const cases = Array.from({ length: 4 }, () => [r.int(1, 20), r.int(1, 20)]);
      cases.push([7, 7]);
      const factor = r.pick([2, 3, 0.5, 1.5]);
      const [w0, h0] = cases[0];
      return {
        prompt: [
          "Escribe la clase `Rectangulo` con:",
          "",
          "- `Rectangulo(ancho, alto)`: guarda las medidas en los atributos `ancho` y `alto`.",
          "- `area()` y `perimetro()`: devuelven el área y el perímetro.",
          "- `es_cuadrado()`: devuelve `True` si ancho y alto son iguales.",
          `- \`escalar(factor)\`: multiplica ancho y alto por el factor (cambia el objeto; no devuelve nada).`,
          "",
          `Por ejemplo, \`Rectangulo(${w0}, ${h0}).area()\` devuelve \`${w0 * h0}\` y, después de \`escalar(${factor})\`, el área pasa a ser \`${show(w0 * factor * h0 * factor)}\`.`,
        ],
        starter: py`class Rectangulo:
    def __init__(self, ancho, alto):
        self.ancho = ancho
        self.alto = alto
`,
        solution: py`class Rectangulo:
    def __init__(self, ancho, alto):
        self.ancho = ancho
        self.alto = alto

    def area(self):
        return self.ancho * self.alto

    def perimetro(self):
        return 2 * (self.ancho + self.alto)

    def es_cuadrado(self):
        return self.ancho == self.alto

    def escalar(self, factor):
        self.ancho *= factor
        self.alto *= factor
`,
        tests: py`
def test_ejemplo():
    """El ejemplo del enunciado"""
    R = t.get("Rectangulo")
    rect = R(${w0}, ${h0})
    assert rect.area() == ${w0 * h0}, f"Rectangulo(${w0}, ${h0}).area() debería ser ${w0 * h0}."
    rect.escalar(${factor})
    assert approx(rect.area(), ${w0 * factor * h0 * factor}), f"Tras escalar(${factor}) el área debería ser ${w0 * factor * h0 * factor}, pero es {rect.area()!r}."


def test_medidas():
    """Área, perímetro y cuadrado con otras medidas"""
    R = t.get("Rectangulo")
    for ancho, alto in ${lit(cases)}:
        rect = R(ancho, alto)
        assert rect.area() == ancho * alto, f"El área de {ancho}×{alto} es {ancho * alto}, no {rect.area()!r}."
        assert rect.perimetro() == 2 * (ancho + alto), f"El perímetro de {ancho}×{alto} es {2 * (ancho + alto)}, no {rect.perimetro()!r}."
        assert rect.es_cuadrado() == (ancho == alto), f"es_cuadrado() de {ancho}×{alto} debería ser {ancho == alto}."


def test_escalar_cambia_el_objeto():
    """escalar cambia las medidas del propio objeto"""
    R = t.get("Rectangulo")
    rect = R(4, 6)
    devuelto = rect.escalar(${factor})
    assert approx(rect.ancho, 4 * ${factor}) and approx(rect.alto, 6 * ${factor}), "escalar debe multiplicar ancho y alto del objeto."
    assert devuelto is None, "escalar cambia el objeto y no devuelve nada."
`,
      };
    },
  },
  {
    id: "g-generadores",
    mission: "w2-generadores",
    title: "Generar valores con yield",
    skills: ["generadores"],
    difficulty: 3,
    hints: ["Una función con yield devuelve un generador: produce un valor cada vez que se le pide.", "Escribe el bucle que recorre los valores y, en lugar de guardarlos en una lista, haz yield de cada uno."],
    make(r) {
      const kind = r.pick(["multiplos", "fibonacci", "cuenta_atras", "cuadrados"] as const);
      let name: string;
      let sig: string;
      let text: string;
      let body: string;
      let cases: Case[];
      if (kind === "multiplos") {
        name = "multiplos";
        sig = "k, limite";
        text = "los múltiplos positivos de `k` que no pasan de `limite` (k, 2k, 3k…)";
        body = "x = k\n    while x <= limite:\n        yield x\n        x += k";
        const f = (k: number, l: number) => Array.from({ length: Math.floor(l / k) }, (_, i) => k * (i + 1));
        cases = Array.from({ length: 5 }, (_, i) => {
          const k = r.int(2, 9);
          const l = i === 4 ? k - 1 : r.int(10, 80);
          return { args: [k, l], expected: f(k, l) };
        });
      } else if (kind === "fibonacci") {
        name = "fibonacci";
        sig = "limite";
        text = "los números de Fibonacci (0, 1, 1, 2, 3, 5…) que no pasan de `limite`";
        body = "a, b = 0, 1\n    while a <= limite:\n        yield a\n        a, b = b, a + b";
        const f = (l: number) => { const o: number[] = []; let a = 0, b = 1; while (a <= l) { o.push(a); [a, b] = [b, a + b]; } return o; };
        cases = [r.int(20, 200), 0, 1, r.int(201, 5000), r.int(2, 19)].map((l) => ({ args: [l], expected: f(l) }));
      } else if (kind === "cuenta_atras") {
        name = "cuenta_atras";
        sig = "n, paso";
        text = "una cuenta atrás desde `n` restando `paso` cada vez, mientras el número sea mayor que 0";
        body = "while n > 0:\n        yield n\n        n -= paso";
        const f = (n: number, p: number) => { const o: number[] = []; while (n > 0) { o.push(n); n -= p; } return o; };
        cases = Array.from({ length: 5 }, (_, i) => {
          const n = i === 4 ? 0 : r.int(5, 40);
          const p = r.int(1, 6);
          return { args: [n, p], expected: f(n, p) };
        });
      } else {
        const m = r.int(2, 5);
        name = "cuadrados";
        sig = "n";
        text = `los cuadrados de los números de 1 a \`n\` que **no** son múltiplos de ${m}`;
        body = `for i in range(1, n + 1):\n        if i % ${m} != 0:\n            yield i * i`;
        const f = (n: number) => { const o: number[] = []; for (let i = 1; i <= n; i++) if (i % m !== 0) o.push(i * i); return o; };
        cases = [r.int(6, 20), 1, r.int(21, 40), 0, m].map((n) => ({ args: [n], expected: f(n) }));
      }
      return {
        prompt: [`Escribe la función generadora \`${name}(${sig})\` que produzca, uno a uno con \`yield\`, ${text}.`, "", `Por ejemplo, \`list(${callText(name, cases[0].args)})\` es \`${lit(cases[0].expected)}\`.`],
        starter: py`def ${name}(${sig}):
    pass
`,
        solution: py`def ${name}(${sig}):
    ${body}
`,
        tests: py`
import inspect


def _valores(args):
    gen = t.get(${lit(name)}, "function")
    assert inspect.isgeneratorfunction(gen), "${name} debe ser una función generadora: usa yield en lugar de return."
    return list(gen(*args))


def test_ejemplo():
    """El ejemplo del enunciado"""
    args, esperado = ${lit(cases[0].args)}, ${lit(cases[0].expected)}
    r = _valores(args)
    assert r == esperado, f"list(${name}(*{args!r})) debería ser {esperado!r}, pero es {r!r}."


def test_otros_datos():
    """Funciona con otros datos"""
    for args, esperado in ${lit(cases.slice(1).map((c) => [c.args, c.expected]))}:
        r = _valores(args)
        assert r == esperado, f"list(${name}(*{args!r})) debería ser {esperado!r}, pero es {r!r}."
`,
      };
    },
  },
  {
    id: "g-regex",
    mission: "w2-regex",
    title: "Encontrar patrones con re",
    skills: ["regex", "cadenas"],
    difficulty: 3,
    hints: ["re.findall(patron, texto) devuelve una lista con todos los fragmentos que encajan.", "Escribe el patrón con r\"...\" y usa \\d para cifras, \\w para letras y cifras, {n} para repetir y + para «una o más»."],
    make(r) {
      const kind = r.pick(["fechas", "correos", "etiquetas", "codigos"] as const);
      const filler = () => r.sample(PALABRAS, r.int(1, 3)).join(" ");
      let decoys: string[];
      let text: string;
      let pattern: string;
      const pad = (n: number) => String(n).padStart(2, "0");
      const gen = {
        fechas: () => `${pad(r.int(1, 28))}/${pad(r.int(1, 12))}/${r.int(1990, 2030)}`,
        correos: () => `${r.pick(PALABRAS)}${r.int(1, 99)}@${r.pick(["correo", "mail", "gremio", "reino"])}.${r.pick(["com", "es", "org"])}`,
        etiquetas: () => `#${r.pick(PALABRAS)}${r.next() < 0.4 ? r.int(1, 9) : ""}`,
        codigos: () => `${String.fromCharCode(65 + r.int(0, 25))}${String.fromCharCode(65 + r.int(0, 25))}-${r.int(1000, 9999)}`,
      };
      if (kind === "fechas") {
        text = "las fechas con formato `dd/mm/aaaa` (dos cifras, dos cifras y cuatro cifras)";
        pattern = String.raw`\d{2}/\d{2}/\d{4}`;
        decoys = ["1/2/2020", "12-05-2021", "2023"];
      } else if (kind === "correos") {
        text = "las direcciones de correo (letras o cifras, `@`, un dominio, un punto y una terminación)";
        pattern = String.raw`\w+@\w+\.\w+`;
        decoys = ["arroba@", "@gremio", "punto.com"];
      } else if (kind === "etiquetas") {
        text = "las etiquetas: una almohadilla `#` seguida de letras o cifras";
        pattern = String.raw`#\w+`;
        decoys = ["# suelta", "100%"];
      } else {
        text = "los códigos formados por dos letras mayúsculas, un guion y cuatro cifras (como `AB-1234`)";
        pattern = String.raw`[A-Z]{2}-\d{4}`;
        decoys = ["ab-1234", "ABC-12", "A-1234"];
      }
      const build = () => {
        const found = Array.from({ length: r.int(0, 3) }, gen[kind]);
        const parts = r.shuffle([...found.map((x) => ({ x, real: true })), ...r.sample(decoys, r.int(1, decoys.length)).map((x) => ({ x, real: false }))]);
        return { text: parts.map((p) => `${filler()} ${p.x}`).join(" ") + ` ${filler()}.`, found: parts.filter((p) => p.real).map((p) => p.x) };
      };
      const cases = Array.from({ length: 5 }, () => {
        const b = build();
        return { args: [b.text], expected: b.found };
      });
      // The first case must contain at least one match so the example teaches something.
      if ((cases[0].expected as string[]).length === 0) {
        const x = gen[kind]();
        cases[0] = { args: [`${filler()} ${x} ${cases[0].args[0]}`], expected: [x] };
      }
      return {
        prompt: [`Escribe \`extrae(texto)\` que devuelva, con una expresión regular, una lista con ${text}, en el orden en que aparecen.`, "", `Por ejemplo, \`${callText("extrae", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`import re


def extrae(texto):
    return []
`,
        solution: py`import re


def extrae(texto):
    return re.findall(r"${pattern}", texto)
`,
        tests:
          fnTests("extrae", cases) +
          py`
def test_usa_re():
    """Usa el módulo re"""
    assert any(t.calls(f) for f in ("findall", "finditer", "search", "match", "fullmatch")), "Resuélvelo con el módulo re (por ejemplo re.findall): es lo que se practica aquí."
`,
      };
    },
  },
  {
    id: "g-pila",
    mission: "w2-estructuras",
    title: "Paréntesis equilibrados con una pila",
    skills: ["estructuras", "algoritmos"],
    difficulty: 3,
    hints: ["Recorre el texto: cada símbolo de apertura se apila (append) y cada cierre debe coincidir con el último apilado (pop).", "Al final la pila tiene que quedar vacía. Un cierre con la pila vacía ya es un error."],
    make(r) {
      const sets = [
        { pairs: [["(", ")"]], text: "paréntesis `()`" },
        { pairs: [["(", ")"], ["[", "]"]], text: "paréntesis `()` y corchetes `[]`" },
        { pairs: [["(", ")"], ["[", "]"], ["{", "}"]], text: "paréntesis `()`, corchetes `[]` y llaves `{}`" },
      ];
      const set = r.pick(sets);
      const opens = set.pairs.map((p) => p[0]);
      const closeOf: Record<string, string> = Object.fromEntries(set.pairs.map(([a, b]) => [b, a]));
      const balanced = (s: string) => {
        const st: string[] = [];
        for (const c of s) {
          if (opens.includes(c)) st.push(c);
          else if (c in closeOf) {
            if (st.pop() !== closeOf[c]) return false;
          }
        }
        return st.length === 0;
      };
      const good = (depth: number): string =>
        Array.from({ length: r.int(1, 3) }, () => {
          const [a, b] = r.pick(set.pairs);
          const inner = depth > 0 && r.next() < 0.6 ? good(depth - 1) : r.pick(["x", "1", "a+b", ""]);
          return `${a}${inner}${b}`;
        }).join(r.pick(["", " ", "*"]));
      const breakIt = (s: string) => {
        const i = r.int(0, s.length - 1);
        const choice = r.int(0, 2);
        if (choice === 0) return s.slice(0, i) + s.slice(i + 1);
        if (choice === 1) return s + r.pick(set.pairs)[1];
        return r.pick(set.pairs)[1] + s;
      };
      const strings = [good(2), breakIt(good(2)), good(3), breakIt(good(1)), "", r.pick(set.pairs).slice().reverse().join("")];
      const cases = r.shuffle(strings).map((s) => ({ args: [s], expected: balanced(s) }));
      const pyOpens = lit(opens.join(""));
      const pyPairs = `{${set.pairs.map(([a, b]) => `${lit(b)}: ${lit(a)}`).join(", ")}}`;
      return {
        prompt: [`Escribe \`equilibrado(texto)\` que devuelva \`True\` si los ${set.text} del texto están bien emparejados y anidados, y \`False\` si no. Los demás caracteres se ignoran. Usa una lista como pila.`, "", `Por ejemplo, \`${callText("equilibrado", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`],
        starter: py`def equilibrado(texto):
    pila = []
    return True
`,
        solution: py`def equilibrado(texto):
    pila = []
    pareja = ${pyPairs}
    for c in texto:
        if c in ${pyOpens}:
            pila.append(c)
        elif c in pareja:
            if not pila or pila.pop() != pareja[c]:
                return False
    return not pila
`,
        tests: fnTests("equilibrado", cases),
      };
    },
  },
];
