"""Python Quest mission harness.

One file, two homes: it runs inside Pyodide (the browser worker writes it to the
virtual file system and imports it) and under CPython in pytest, where it checks
that every mission's reference solution passes and its starter code does not.

Public entry point: ``run(code, tests="", stdin=None, files=None)`` returns a
JSON-serialisable dict with the program output, a friendly error (if any),
per-test results and any matplotlib figures as base64 PNGs.
"""

from __future__ import annotations

import ast
import base64
import builtins
import contextlib
import importlib
import io
import math
import os
import shutil
import sys
import tempfile
import traceback

USER_FILENAME = "<tu código>"
MAX_OUTPUT_CHARS = 200_000

FRIENDLY = {
    "SyntaxError": "Python no entiende la forma en que está escrita esta línea. Revisa paréntesis, comillas y los dos puntos (:) al final de if, for, def y while.",
    "IndentationError": "La sangría (los espacios al inicio de la línea) no es correcta. Dentro de un bloque usa siempre 4 espacios.",
    "TabError": "Mezclaste tabuladores y espacios para sangrar. Usa solo espacios.",
    "NameError": "Usas un nombre que Python no conoce. ¿Escribiste bien la variable o la función? ¿La definiste antes de usarla?",
    "TypeError": "Combinaste tipos que no encajan (por ejemplo texto + número) o llamaste una función con argumentos incorrectos.",
    "ValueError": "El tipo es correcto pero el valor no sirve (por ejemplo int('hola')).",
    "ZeroDivisionError": "Intentaste dividir entre cero.",
    "IndexError": "Pediste una posición que no existe en la lista. Recuerda que los índices empiezan en 0 y el último es len(lista) - 1.",
    "KeyError": "Esa clave no existe en el diccionario. Usa .get(clave) o comprueba con 'in' antes de leerla.",
    "AttributeError": "Ese objeto no tiene el atributo o método que pediste. Revisa el nombre y el tipo del objeto.",
    "ModuleNotFoundError": "Ese módulo no está disponible. En el navegador solo existen la biblioteca estándar y los paquetes científicos de Pyodide.",
    "ImportError": "No se pudo importar lo que pediste del módulo. Revisa el nombre.",
    "RecursionError": "La función se llamó a sí misma demasiadas veces. ¿Falta el caso base?",
    "FileNotFoundError": "No existe un archivo con ese nombre en la carpeta de la misión.",
    "UnboundLocalError": "Usas una variable local antes de asignarle un valor dentro de la función.",
    "OverflowError": "El número es demasiado grande para esta operación.",
    "StopIteration": "El iterador ya no tiene más elementos.",
    "KeyboardInterrupt": "La ejecución se detuvo.",
}


class InputExhausted(Exception):
    """Raised when the program asks for more input() than the mission provides."""


class TestContext:
    """The student's program as seen by tests (exposed to them as the global ``t``)."""

    def __init__(self, code, compiled, ns, out, stdin, figures_fn):
        self.code = code
        self._compiled = compiled
        self.ns = ns
        self.out = out
        self.lines = [ln.rstrip() for ln in out.splitlines()]
        self._stdin = list(stdin or [])
        self._figures_fn = figures_fn

    # -- reading the student's program ---------------------------------
    def has(self, name):
        return name in self.ns

    def get(self, name, kind=None):
        assert name in self.ns, f"No encuentro `{name}`. Asegúrate de definirlo con ese nombre exacto."
        value = self.ns[name]
        if kind == "function":
            assert callable(value), f"`{name}` existe pero no es una función."
        elif kind is not None:
            assert isinstance(value, kind), (
                f"`{name}` debería ser de tipo {getattr(kind, '__name__', kind)}, pero es {type(value).__name__}."
            )
        return value

    def call(self, name, *args, **kwargs):
        """Call a student function and return (result, printed_text)."""
        fn = self.get(name, "function")
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            result = fn(*args, **kwargs)
        return result, buf.getvalue()

    def rerun(self, stdin=None):
        """Run the whole program again with other input() values; returns its stdout."""
        ns = {"__name__": "__main__"}
        out, err = _execute(self._compiled, ns, stdin or [])
        if err is not None:
            raise AssertionError(f"Con las entradas {stdin!r} tu programa lanzó {err['type']}: {err['message']}")
        return out

    # -- static checks ---------------------------------------------------
    def tree(self):
        return ast.parse(self.code)

    def uses(self, *node_names):
        """True if the program contains any AST node of these types (e.g. 'For', 'While', 'ListComp')."""
        wanted = set(node_names)
        return any(type(n).__name__ in wanted for n in ast.walk(self.tree()))

    def calls(self, func_name):
        """True if the program calls ``func_name`` (bare name or attribute)."""
        for n in ast.walk(self.tree()):
            if isinstance(n, ast.Call):
                f = n.func
                if isinstance(f, ast.Name) and f.id == func_name:
                    return True
                if isinstance(f, ast.Attribute) and f.attr == func_name:
                    return True
        return False

    def figures(self):
        return self._figures_fn()


def approx(a, b, tol=1e-6):
    """Relative-or-absolute float comparison usable in tests."""
    try:
        return math.isclose(float(a), float(b), rel_tol=tol, abs_tol=tol)
    except (TypeError, ValueError):
        return False


def _make_input(feed, out):
    queue = list(feed)

    def fake_input(prompt=""):
        if prompt:
            out.write(str(prompt))
        if not queue:
            raise InputExhausted("El programa pidió más datos con input() de los que la misión proporciona.")
        value = str(queue.pop(0))
        out.write(value + "\n")
        return value

    return fake_input


def _friendly_error(exc, tb_obj=None):
    etype = type(exc).__name__
    line = None
    if isinstance(exc, SyntaxError) and exc.filename == USER_FILENAME:
        line = exc.lineno
    else:
        for frame in traceback.extract_tb(tb_obj or exc.__traceback__):
            if frame.filename == USER_FILENAME:
                line = frame.lineno
    if isinstance(exc, InputExhausted):
        etype, hint = "EOFError", str(exc)
    else:
        hint = FRIENDLY.get(etype, "Ocurrió un error inesperado. Lee el mensaje y revisa la línea indicada.")
    message = exc.msg if isinstance(exc, SyntaxError) else str(exc)
    return {"type": etype, "message": message, "line": line, "hint": hint}


def _execute(compiled, ns, stdin):
    out = io.StringIO()
    ns["input"] = _make_input(stdin, out)
    err = None
    try:
        with contextlib.redirect_stdout(out):
            exec(compiled, ns)
    except SystemExit:
        pass
    except BaseException as exc:  # noqa: BLE001 - we report every student error
        if isinstance(exc, KeyboardInterrupt):
            raise
        err = _friendly_error(exc)
    text = out.getvalue()
    if len(text) > MAX_OUTPUT_CHARS:
        text = text[:MAX_OUTPUT_CHARS] + "\n… (salida recortada)"
    return text, err


def _collect_figures():
    if "matplotlib.pyplot" not in sys.modules:
        return []
    plt = sys.modules["matplotlib.pyplot"]
    images = []
    for num in plt.get_fignums():
        fig = plt.figure(num)
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=90, bbox_inches="tight")
        images.append(base64.b64encode(buf.getvalue()).decode("ascii"))
    return images


def _close_figures():
    if "matplotlib.pyplot" in sys.modules:
        sys.modules["matplotlib.pyplot"].close("all")


# Scientific packages take seconds to import the first time (pandas ≈ 3 s, scikit-learn ≈ 3 s
# in Pyodide). Importing them before the run lets the infinite-loop clock measure only the
# learner's code.
HEAVY_PACKAGES = ("numpy", "pandas", "scipy", "sklearn", "statsmodels", "matplotlib", "seaborn")


def warm_imports(names):
    """Import the heavy scientific modules among ``names``; returns those now imported.

    Errors are ignored here: the learner's own import will raise them with a friendly message.
    """
    os.environ.setdefault("MPLBACKEND", "Agg")
    done = []
    for name in names:
        if name.split(".")[0] not in HEAVY_PACKAGES:
            continue
        try:
            importlib.import_module(name)
            done.append(name)
        except Exception:  # noqa: BLE001
            pass
    return done


def run(code, tests="", stdin=None, files=None):
    """Execute student ``code``; if ``tests`` is given, run its ``test_*`` functions."""
    os.environ.setdefault("MPLBACKEND", "Agg")
    stdin = list(stdin or [])
    prev_cwd = os.getcwd()
    workdir = tempfile.mkdtemp(prefix="pq_")
    result = {"stdout": "", "error": None, "tests": [], "figures": [], "passed": False}
    try:
        os.chdir(workdir)
        for name, content in (files or {}).items():
            with open(name, "w", encoding="utf-8") as fh:
                fh.write(content)
        _close_figures()
        try:
            compiled = compile(code, USER_FILENAME, "exec")
        except SyntaxError as exc:
            result["error"] = _friendly_error(exc)
            return result

        ns = {"__name__": "__main__"}
        out, err = _execute(compiled, ns, stdin)
        result["stdout"], result["error"] = out, err

        if tests and err is None:
            ctx = TestContext(code, compiled, ns, out, stdin, _collect_figures)
            # Tests see the student's program through the global `t` (a TestContext).
            test_ns = {"approx": approx, "math": math, "t": ctx}
            try:
                exec(compile(tests, "<pruebas>", "exec"), test_ns)
            except Exception as exc:  # noqa: BLE001
                # The test module itself failed (typically a package that could not be downloaded):
                # report it as a failed check that is clearly not the student's fault.
                result["tests"].append({
                    "name": "preparar_pruebas",
                    "description": "Preparar las pruebas",
                    "passed": False,
                    "message": (
                        f"Las pruebas no pudieron cargarse ({type(exc).__name__}: {exc}). "
                        "No es un fallo de tu código: suele ocurrir cuando un paquete no se pudo descargar. "
                        "Comprueba tu conexión y vuelve a comprobar."
                    ),
                })
                test_ns = {}
            for name, fn in list(test_ns.items()):
                if not (name.startswith("test_") and callable(fn)):
                    continue
                desc = (fn.__doc__ or name[5:].replace("_", " ")).strip()
                entry = {"name": name, "description": desc, "passed": False, "message": ""}
                try:
                    with contextlib.redirect_stdout(io.StringIO()):
                        fn()
                    entry["passed"] = True
                except AssertionError as exc:
                    entry["message"] = str(exc) or "La comprobación no se cumplió."
                except Exception as exc:  # noqa: BLE001
                    info = _friendly_error(exc)
                    entry["message"] = f"Tu código lanzó {info['type']}: {info['message']}"
                result["tests"].append(entry)
            result["passed"] = bool(result["tests"]) and all(t["passed"] for t in result["tests"])
        result["figures"] = _collect_figures()
        return result
    finally:
        _close_figures()
        os.chdir(prev_cwd)
        shutil.rmtree(workdir, ignore_errors=True)
