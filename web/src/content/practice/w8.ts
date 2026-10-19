// Practice drills for World 8 (Python engineering): configuration, validation, performance and
// testable design with injected dependencies.
import { py, type Drill } from "../types";
import { callText, fnTests, lit, NOMBRES, PALABRAS, type Case } from "./kit";

export const DRILLS_W8: Drill[] = [
  {
    id: "g-config",
    mission: "eng-config",
    title: "Configuración desde variables de entorno",
    skills: ["configuracion", "tipos"],
    difficulty: 3,
    hints: ["Para cada clave de los valores por defecto, construye el nombre de la variable de entorno y mira si está en el diccionario.", "Convierte el texto al tipo del valor por defecto: isinstance(defecto, bool) va antes que int, porque True también es un int en Python."],
    make(r) {
      const prefix = r.pick(["APP_", "PQ_", "SERVICIO_"]);
      const truthy = r.pick([["1", "true", "si"], ["1", "true", "yes", "on"], ["true", "si", "s"]]);
      type V = number | string | boolean;
      const pool: [string, () => V, (v: V) => string][] = [
        ["puerto", () => r.pick([8000, 8080, 5000]), () => String(r.int(1000, 9999))],
        ["depurar", () => r.pick([true, false]), () => r.pick([...truthy.map((x) => (r.next() < 0.5 ? x.toUpperCase() : x)), "0", "false", "no"])],
        ["tiempo_limite", () => r.pick([2.5, 0.5, 7.5]), () => String(r.int(1, 99) / 4)],
        ["nombre", () => r.pick(["torre", "gremio", "faro"]), () => r.pick(PALABRAS)],
        ["reintentos", () => r.pick([3, 5]), () => String(r.int(0, 9))],
        ["cache", () => r.pick([true, false]), () => r.pick([...truthy, "0", "FALSE", "nada"])],
      ];
      const conv = (def: V, s: string): V => (typeof def === "boolean" ? truthy.includes(s.toLowerCase()) : typeof def === "number" ? Number(s) : s);
      const cases: Case[] = [];
      for (let c = 0; c < 5; c++) {
        const keys = r.sample(pool, r.int(3, 5));
        const defaults = Object.fromEntries(keys.map(([k, d]) => [k, d()]));
        const env: Record<string, string> = { PATH: "/usr/bin", [`OTRO_${keys[0][0].toUpperCase()}`]: "ignorar" };
        for (const [k, , gen] of keys) if (r.next() < 0.6 || c === 0) env[prefix + k.toUpperCase()] = gen(defaults[k]);
        const out = Object.fromEntries(Object.entries(defaults).map(([k, d]) => [k, prefix + k.toUpperCase() in env ? conv(d, env[prefix + k.toUpperCase()]) : d]));
        cases.push({ args: [defaults, env], expected: out });
      }
      // Integer and float defaults must keep their Python type: write the literals by hand.
      const pyVal = (k: string, v: V) => (typeof v === "number" && !["puerto", "reintentos"].includes(k) ? (Number.isInteger(v) ? `${v}.0` : String(v)) : lit(v));
      const pyDict = (d: Record<string, V>) => `{${Object.entries(d).map(([k, v]) => `${lit(k)}: ${pyVal(k, v)}`).join(", ")}}`;
      const typed = cases.map((c) => ({ args: [], argsPy: `[${pyDict(c.args[0] as Record<string, V>)}, ${lit(c.args[1])}]`, expected: c.expected, expectedPy: pyDict(c.expected as Record<string, V>) }));
      return {
        prompt: [
          `Escribe \`cargar_config(defecto, entorno)\` que devuelva un diccionario nuevo con las mismas claves que \`defecto\`. Si en \`entorno\` existe la variable \`${prefix}\` + la clave en mayúsculas (por ejemplo \`${prefix}PUERTO\`), su texto sustituye al valor por defecto, convertido a su tipo:`,
          "",
          `- \`bool\`: verdadero si el texto, en minúsculas, es uno de ${truthy.map((x) => `\`"${x}"\``).join(", ")}; falso en cualquier otro caso.`,
          "- `int` y `float`: con `int()` y `float()`.",
          "- `str`: tal cual.",
          "",
          `Por ejemplo, \`cargar_config(${pyDict(cases[0].args[0] as Record<string, V>)}, ${lit(cases[0].args[1])})\` devuelve \`${pyDict(cases[0].expected as Record<string, V>)}\`.`,
        ],
        starter: py`def cargar_config(defecto, entorno):
    return dict(defecto)
`,
        solution: py`def cargar_config(defecto, entorno):
    config = {}
    for clave, valor in defecto.items():
        texto = entorno.get(${lit(prefix)} + clave.upper())
        if texto is None:
            config[clave] = valor
        elif isinstance(valor, bool):
            config[clave] = texto.lower() in ${lit(truthy)}
        elif isinstance(valor, int):
            config[clave] = int(texto)
        elif isinstance(valor, float):
            config[clave] = float(texto)
        else:
            config[clave] = texto
    return config
`,
        tests:
          fnTests("cargar_config", typed) +
          py`
def test_tipos():
    """Cada valor conserva el tipo de su valor por defecto"""
    import copy
    for args in [${typed.map((t) => t.argsPy).join(", ")}]:
        r, _ = t.call("cargar_config", *copy.deepcopy(args))
        for clave, valor in args[0].items():
            assert type(r[clave]) is type(valor), f"{clave} debería ser {type(valor).__name__}, pero es {type(r[clave]).__name__} ({r[clave]!r})."


def test_no_modifica():
    """No modifica los valores por defecto"""
    defecto = {"puerto": 8000, "depurar": False}
    t.call("cargar_config", defecto, {${lit(prefix + "PUERTO")}: "9000"})
    assert defecto == {"puerto": 8000, "depurar": False}, "cargar_config cambió el diccionario de valores por defecto: crea uno nuevo."
`,
      };
    },
  },
  {
    id: "g-validar-peticion",
    mission: "eng-api",
    title: "Validar una petición",
    skills: ["validacion", "apis"],
    difficulty: 3,
    hints: ["Recorre los campos en el orden del esquema y, para cada uno, comprueba primero si falta, después el tipo y después el rango o el formato.", "Cada campo produce como mucho un error: en cuanto encuentres uno, pasa al siguiente campo."],
    make(r) {
      const maxQ = r.pick([10, 20, 50]);
      const maxAge = r.pick([99, 120]);
      type F = { campo: string; tipo: "str" | "int"; check: (v: string | number) => boolean; regla: string; gen: () => string | number; bad: () => string | number };
      const fields: F[] = [
        { campo: "nombre", tipo: "str", check: (v) => String(v).trim().length > 0, regla: "no puede estar vacío", gen: () => r.pick(NOMBRES), bad: () => r.pick(["", "   "]) },
        { campo: "edad", tipo: "int", check: (v) => (v as number) >= 0 && (v as number) <= maxAge, regla: `entre 0 y ${maxAge}`, gen: () => r.int(0, maxAge), bad: () => r.pick([-1, maxAge + 1, 500]) },
        { campo: "email", tipo: "str", check: (v) => { const s = String(v); const i = s.indexOf("@"); return i > 0 && s.indexOf(".", i) > i + 1 && !s.endsWith("."); }, regla: "con una @ y un punto después", gen: () => `${r.pick(PALABRAS)}@${r.pick(["gremio", "reino"])}.es`, bad: () => r.pick(["sin-arroba.es", "@x.es", "a@b"]) },
        { campo: "cantidad", tipo: "int", check: (v) => (v as number) >= 1 && (v as number) <= maxQ, regla: `entre 1 y ${maxQ}`, gen: () => r.int(1, maxQ), bad: () => r.pick([0, maxQ + 1, -3]) },
      ];
      const schema = r.sample(fields, 3);
      const make = () => {
        const req: Record<string, string | number> = {};
        const errors: string[] = [];
        for (const f of schema) {
          const roll = r.next();
          if (roll < 0.15) errors.push(`${f.campo}: falta`);
          else if (roll < 0.3) {
            req[f.campo] = f.tipo === "int" ? r.pick(["7", "doce"]) : r.int(1, 99);
            errors.push(`${f.campo}: tipo incorrecto`);
          } else if (roll < 0.5) {
            req[f.campo] = f.bad();
            errors.push(`${f.campo}: ${f.campo === "email" ? "formato inválido" : f.campo === "nombre" ? "vacío" : "fuera de rango"}`);
          } else req[f.campo] = f.gen();
        }
        if (r.next() < 0.3) req.extra = "se ignora";
        return { req, errors };
      };
      const cases: Case[] = [];
      while (cases.length < 5) {
        const m = make();
        if (cases.length === 0 && m.errors.length === 0) continue;
        cases.push({ args: [m.req], expected: m.errors });
      }
      cases.push({ args: [Object.fromEntries(schema.map((f) => [f.campo, f.gen()]))], expected: [] });
      const rules = schema.map((f) => `- \`${f.campo}\`: ${f.tipo === "int" ? "entero" : "texto"}, ${f.regla}.`);
      const checks: Record<string, string> = {
        nombre: 'if not valor.strip():\n            errores.append("nombre: vacío")',
        edad: `if not 0 <= valor <= ${maxAge}:\n            errores.append("edad: fuera de rango")`,
        email: 'arroba = valor.find("@")\n        punto = valor.find(".", arroba)\n        if arroba <= 0 or punto <= arroba + 1 or valor.endswith("."):\n            errores.append("email: formato inválido")',
        cantidad: `if not 1 <= valor <= ${maxQ}:\n            errores.append("cantidad: fuera de rango")`,
      };
      return {
        prompt: [
          "Escribe `validar(peticion)` que compruebe un diccionario recibido por una API con este esquema, en este orden:",
          "",
          ...rules,
          "",
          "Devuelve una lista de errores, como mucho uno por campo y en el orden del esquema: `\"campo: falta\"` si no está, `\"campo: tipo incorrecto\"` si el tipo no es el pedido, y si no, `\"nombre: vacío\"`, `\"campo: fuera de rango\"` o `\"email: formato inválido\"` según la regla. Las claves que no están en el esquema se ignoran. Una petición correcta devuelve `[]`.",
          "",
          `Por ejemplo, \`${callText("validar", cases[0].args)}\` devuelve \`${lit(cases[0].expected)}\`.`,
        ],
        starter: py`def validar(peticion):
    errores = []
    return errores
`,
        solution: py`ESQUEMA = ${lit(schema.map((f) => [f.campo, f.tipo]))}


def validar(peticion):
    errores = []
    for campo, tipo in ESQUEMA:
        if campo not in peticion:
            errores.append(f"{campo}: falta")
            continue
        valor = peticion[campo]
        if (tipo == "int" and (type(valor) is not int)) or (tipo == "str" and not isinstance(valor, str)):
            errores.append(f"{campo}: tipo incorrecto")
            continue
${schema.map((f, i) => `        ${i === 0 ? "if" : "elif"} campo == ${lit(f.campo)}:\n            ${checks[f.campo].replace(/\n/g, "\n    ")}`).join("\n")}
    return errores
`,
        tests: fnTests("validar", cases),
      };
    },
  },
  {
    id: "g-memoizacion",
    mission: "eng-rendimiento",
    title: "Memoización: no calcular dos veces",
    skills: ["rendimiento", "recursion"],
    difficulty: 3,
    hints: ["La recursión directa repite los mismos subproblemas una y otra vez: con n = 300 no terminaría nunca.", "Guarda cada resultado en un diccionario (o usa @functools.lru_cache) o calcula de abajo arriba con una lista."],
    make(r) {
      const steps = r.pick([[1, 2], [1, 3], [1, 2, 3], [2, 3], [1, 4], [1, 2, 5]]);
      const MOD = 1_000_000_007;
      const ways = (n: number) => {
        const w = Array(n + 1).fill(0);
        w[0] = 1;
        for (let i = 1; i <= n; i++) for (const s of steps) if (i >= s) w[i] = (w[i] + w[i - s]) % MOD;
        return w[n];
      };
      const cases: Case[] = [r.int(4, 9), 0, r.int(10, 30), 300, r.int(100, 250)].map((n) => ({ args: [n], expected: ways(n) }));
      return {
        prompt: [`Para subir una escalera de \`n\` escalones puedes dar pasos de ${steps.join(", ")} escalones. Escribe \`formas(n)\` que devuelva de cuántas formas distintas (en orden) se puede subir, **módulo 1 000 000 007**. Con \`n = 0\` hay una forma: no moverse. Tiene que ser rápida con \`n = 300\`.`, "", `Por ejemplo, \`${callText("formas", cases[0].args)}\` devuelve \`${cases[0].expected}\`.`],
        starter: py`def formas(n):
    pass
`,
        solution: py`MOD = 1_000_000_007


def formas(n):
    w = [0] * (n + 1)
    w[0] = 1
    for i in range(1, n + 1):
        for paso in ${lit(steps)}:
            if i >= paso:
                w[i] = (w[i] + w[i - paso]) % MOD
    return w[n]
`,
        tests: fnTests("formas", cases),
      };
    },
  },
  {
    id: "g-dobles",
    mission: "eng-arquitectura",
    title: "Inyectar dependencias para poder probar",
    skills: ["arquitectura", "pruebas"],
    difficulty: 3,
    hints: ["No envíes nada directamente: llama a la función enviar que te pasan. Así las pruebas pueden pasar una función falsa que solo anota las llamadas.", "Recorre los usuarios, filtra los que cumplen la regla y llama a enviar(email, mensaje) con el texto exacto."],
    make(r) {
      const k = r.int(7, 30);
      const kinds = [
        { rule: "estén activos", f: (u: U) => u.activo, cond: 'u["activo"]', msg: (u: U) => `Hola, ${u.nombre}: tu cuenta está activa.`, tpl: 'f"Hola, {u[\'nombre\']}: tu cuenta está activa."' },
        { rule: "tengan saldo negativo", f: (u: U) => u.saldo < 0, cond: 'u["saldo"] < 0', msg: (u: U) => `Hola, ${u.nombre}: tu saldo es ${u.saldo} €.`, tpl: 'f"Hola, {u[\'nombre\']}: tu saldo es {u[\'saldo\']} €."' },
        { rule: `lleven más de ${k} días sin entrar y estén activos`, f: (u: U) => u.dias > k && u.activo, cond: `u["dias"] > ${k} and u["activo"]`, msg: (u: U) => `Hola, ${u.nombre}: te echamos de menos (${u.dias} días).`, tpl: 'f"Hola, {u[\'nombre\']}: te echamos de menos ({u[\'dias\']} días)."' },
      ];
      type U = { nombre: string; email: string; activo: boolean; saldo: number; dias: number };
      const kd = r.pick(kinds);
      const users = (): U[] => r.sample(NOMBRES.filter((n) => /^[A-Za-z]+$/.test(n)), r.int(3, 7)).map((nombre) => ({ nombre, email: `${nombre.toLowerCase()}@gremio.es`, activo: r.next() < 0.6, saldo: r.int(-50, 120), dias: r.int(0, 60) }));
      const sets: U[][] = [];
      while (sets.length < 4) {
        const us = users();
        if (sets.length === 0 && !us.some(kd.f)) continue;
        sets.push(us);
      }
      const expected = sets.map((us) => us.filter(kd.f).map((u) => [u.email, kd.msg(u)]));
      return {
        prompt: [
          `Escribe \`notificar(usuarios, enviar)\` que mande un mensaje a los usuarios que ${kd.rule}, llamando a \`enviar(email, mensaje)\` una vez por usuario y en el orden de la lista, y que devuelva cuántos mensajes envió. \`enviar\` se recibe como parámetro: en producción enviaría un correo; en las pruebas, una función falsa anota las llamadas.`,
          "",
          `El mensaje de cada usuario es, por ejemplo: \`${lit(expected[0][0][1])}\`.`,
        ],
        starter: py`def notificar(usuarios, enviar):
    return 0
`,
        solution: py`def notificar(usuarios, enviar):
    enviados = 0
    for u in usuarios:
        if ${kd.cond}:
            enviar(u["email"], ${kd.tpl})
            enviados += 1
    return enviados
`,
        tests: py`
def _probar(usuarios, esperado):
    llamadas = []

    def enviar_falso(email, mensaje):
        llamadas.append([email, mensaje])

    n, _ = t.call("notificar", usuarios, enviar_falso)
    assert llamadas == esperado, f"Se esperaban las llamadas {esperado}, pero se hicieron {llamadas}."
    assert n == len(esperado), f"Debería devolver {len(esperado)} (mensajes enviados), pero devolvió {n!r}."


def test_ejemplo():
    """Envía a quien corresponde, con el texto exacto"""
    _probar(${lit(sets[0])}, ${lit(expected[0])})


def test_otros_usuarios():
    """Funciona con otros usuarios"""
    for usuarios, esperado in ${lit(sets.slice(1).map((s, i) => [s, expected[i + 1]]))}:
        _probar(usuarios, esperado)


def test_sin_efectos():
    """No envía nada por su cuenta"""
    assert not any(t.calls(f) for f in ("SMTP", "sendmail", "send_message", "urlopen")), "Usa solo la función enviar que recibes: así el código se puede probar sin enviar correos de verdad."
`,
      };
    },
  },
  {
    id: "g-reintentos",
    mission: "eng-arquitectura",
    title: "Reintentos con espera exponencial",
    skills: ["robustez", "pruebas"],
    difficulty: 4,
    hints: ["Un bucle de intentos: try llama a la operación y devuelve su resultado; except anota el error y espera antes del siguiente intento.", `La espera del intento k (empezando en 0) es espera · factorᵏ, y después del último intento no se espera: se relanza el error con raise.`],
    make(r) {
      const factor = r.pick([2, 3]);
      const retryOnly = r.pick(["ConnectionError", "TimeoutError", "OSError"]);
      const plan = (fails: number, intentos: number, espera: number) => {
        const sleeps: number[] = [];
        for (let k = 0; k < Math.min(fails, intentos - 1); k++) sleeps.push(espera * factor ** k);
        return { ok: fails < intentos, sleeps };
      };
      const cases = Array.from({ length: 5 }, (_, i) => {
        const intentos = r.int(2, 5);
        const espera = r.pick([0.5, 1, 2]);
        const fails = i === 0 ? r.int(1, intentos - 1) : i === 1 ? intentos + r.int(0, 2) : r.int(0, intentos);
        return { fails, intentos, espera, ...plan(fails, intentos, espera) };
      });
      const ex = cases[0];
      return {
        prompt: [
          `Escribe \`con_reintentos(operacion, intentos, espera, dormir)\`: llama a \`operacion()\` hasta \`intentos\` veces. Si lanza \`${retryOnly}\`, espera \`espera · ${factor}ᵏ\` segundos (k = 0, 1, 2…) llamando a \`dormir(segundos)\` y vuelve a intentarlo; si lanza otro tipo de error, no reintenta: deja que se propague. Devuelve el resultado del primer intento que funcione; si fallan todos, relanza el último \`${retryOnly}\` (sin esperar después del último intento).`,
          "",
          `\`dormir\` se recibe como parámetro (en producción, \`time.sleep\`) para que las pruebas no esperen de verdad. Por ejemplo, con \`intentos=${ex.intentos}\`, \`espera=${ex.espera}\` y una operación que falla ${ex.fails} ${ex.fails === 1 ? "vez" : "veces"} antes de funcionar, se llama a \`dormir\` con \`${lit(ex.sleeps)}\`.`,
        ],
        starter: py`def con_reintentos(operacion, intentos, espera, dormir):
    return operacion()
`,
        solution: py`def con_reintentos(operacion, intentos, espera, dormir):
    for k in range(intentos):
        try:
            return operacion()
        except ${retryOnly}:
            if k == intentos - 1:
                raise
            dormir(espera * ${factor} ** k)
`,
        tests: py`
def _operacion(fallos, error=${retryOnly}):
    estado = {"llamadas": 0}

    def op():
        estado["llamadas"] += 1
        if estado["llamadas"] <= fallos:
            raise error("fallo simulado")
        return "hecho"

    return op, estado


def _caso(fallos, intentos, espera, ok, esperas):
    op, estado = _operacion(fallos)
    dormidas = []
    f = t.get("con_reintentos", "function")
    try:
        r = f(op, intentos, espera, dormidas.append)
    except ${retryOnly}:
        assert not ok, f"Con {fallos} fallos e intentos={intentos} debería funcionar al final, pero se relanzó el error."
    else:
        assert ok, f"Con {fallos} fallos e intentos={intentos} todos los intentos fallan: hay que relanzar el último ${retryOnly}."
        assert r == "hecho", f"Debería devolver el resultado de la operación, no {r!r}."
    assert all(approx(a, b) for a, b in zip(dormidas, esperas)) and len(dormidas) == len(esperas), f"Con {fallos} fallos, intentos={intentos} y espera={espera} se esperaban las esperas {esperas}, pero hubo {dormidas}."
    assert estado["llamadas"] == min(fallos + 1, intentos), f"La operación debería llamarse {min(fallos + 1, intentos)} veces, no {estado['llamadas']}."


def test_ejemplo():
    """El ejemplo del enunciado"""
    _caso(${ex.fails}, ${ex.intentos}, ${ex.espera}, ${lit(ex.ok)}, ${lit(ex.sleeps)})


def test_otros_casos():
    """Funciona con otros fallos e intentos"""
    for fallos, intentos, espera, ok, esperas in ${lit(cases.slice(1).map((c) => [c.fails, c.intentos, c.espera, c.ok, c.sleeps]))}:
        _caso(fallos, intentos, espera, ok, esperas)


def test_otros_errores():
    """Los demás errores no se reintentan"""
    op, estado = _operacion(1, ValueError)
    dormidas = []
    try:
        t.get("con_reintentos")(op, 3, 1, dormidas.append)
    except ValueError:
        pass
    else:
        raise AssertionError("Un ValueError no debe reintentarse: deja que se propague.")
    assert estado["llamadas"] == 1 and dormidas == [], "Ante un error que no se reintenta, no hay que volver a llamar ni esperar."
`,
      };
    },
  },
];
