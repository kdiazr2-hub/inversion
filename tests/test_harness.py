import pq_harness


def test_runs_and_captures_output():
    r = pq_harness.run('print("hola")\nx = 2')
    assert r["stdout"] == "hola\n" and r["error"] is None


def test_friendly_syntax_error_has_line():
    r = pq_harness.run("x = 1\nif x > 0\n    print(x)")
    assert r["error"]["type"] == "SyntaxError" and r["error"]["line"] == 2
    assert "dos puntos" in r["error"]["hint"]


def test_runtime_error_line_points_to_student_code():
    r = pq_harness.run("a = [1, 2]\nprint(a[5])")
    assert r["error"]["type"] == "IndexError" and r["error"]["line"] == 2


def test_tests_receive_context_and_report_messages():
    tests = 'def test_ok():\n    "x es 3"\n    assert t.get("x") == 3\n\ndef test_bad():\n    assert t.get("x") == 4, "x no es 4"\n'
    r = pq_harness.run("x = 3", tests)
    assert [tt["passed"] for tt in r["tests"]] == [True, False]
    assert r["tests"][0]["description"] == "x es 3"
    assert r["tests"][1]["message"] == "x no es 4"
    assert r["passed"] is False


def test_tests_not_run_when_program_crashes():
    r = pq_harness.run("1/0", "def test_a():\n    assert True\n")
    assert r["error"]["type"] == "ZeroDivisionError" and r["tests"] == [] and not r["passed"]


def test_input_feed_and_rerun():
    code = "n = int(input('n: '))\nprint(n * 2)"
    tests = "def test_rerun():\n    assert t.rerun(['21']).strip().endswith('42')\n"
    r = pq_harness.run(code, tests, stdin=["5"])
    assert r["stdout"].endswith("10\n") and r["passed"]


def test_input_exhausted_is_reported():
    r = pq_harness.run("input()\ninput()", stdin=["a"])
    assert r["error"]["type"] == "EOFError"


def test_files_are_available_and_isolated():
    r = pq_harness.run("print(open('datos.txt').read())", files={"datos.txt": "abc"})
    assert r["stdout"] == "abc\n"
    r2 = pq_harness.run("import os\nprint(os.path.exists('datos.txt'))")
    assert r2["stdout"] == "False\n"


def test_matplotlib_figures_are_returned():
    code = "import matplotlib.pyplot as plt\nplt.plot([1, 2, 3])"
    r = pq_harness.run(code)
    assert len(r["figures"]) == 1 and len(r["figures"][0]) > 100


def test_static_checks():
    tests = "def test_for():\n    assert t.uses('For') and t.calls('print')\n"
    assert pq_harness.run("for i in range(2):\n    print(i)", tests)["passed"]
    assert not pq_harness.run("print(0)\nprint(1)", tests)["passed"]


def test_broken_test_module_is_reported_not_raised():
    r = pq_harness.run("x = 1", "import paquete_inexistente\n\ndef test_x():\n    assert True\n")
    assert r["error"] is None and not r["passed"]
    assert r["tests"][0]["name"] == "preparar_pruebas" and "No es un fallo de tu código" in r["tests"][0]["message"]


def test_warm_imports_only_heavy_packages():
    import sys
    done = pq_harness.warm_imports(["numpy", "os", "json", "numpy.linalg", "paquete_inexistente", "scipy.no_existe"])
    assert done == ["numpy", "numpy.linalg"]
    assert "numpy.linalg" in sys.modules


def test_program_runs_as_main_module():
    # pydantic, typing.get_type_hints and pickle look the learner's names up in sys.modules["__main__"].
    import sys
    code = (
        "from typing import Literal\n"
        "from pydantic import BaseModel\n"
        "import pickle\n"
        "class M(BaseModel):\n"
        "    tipo: Literal['a', 'b']\n"
        "class Caja:\n"
        "    pass\n"
        "copia = pickle.loads(pickle.dumps(Caja()))\n"
        "print(M(tipo='a').tipo, type(copia).__name__, __name__)\n"
    )
    tests = "def test_m():\n    assert t.get('M')(tipo='b').tipo == 'b'\n"
    before = sys.modules.get("__main__")
    r = pq_harness.run(code, tests)
    assert r["error"] is None, r["error"]
    assert r["stdout"] == "a Caja __main__\n" and r["passed"]
    assert sys.modules.get("__main__") is before, "The host's __main__ must be restored"
