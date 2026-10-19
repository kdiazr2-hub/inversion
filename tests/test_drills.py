"""Every variant of every practice drill is validated, exactly as the gym can show it.

For each (drill, seed): the reference solution passes all tests, the starter code does not, and
the exercise is well formed. Because the worked example in the prompt is always the first test
case, a wrong example also fails here.
"""

import signal

import pq_harness


class Timeout(Exception):
    pass


def _alarm(signum, frame):
    raise Timeout("tiempo agotado (posible bucle infinito)")


def _run(d, code, seconds=5):
    old = signal.signal(signal.SIGALRM, _alarm)
    signal.setitimer(signal.ITIMER_REAL, seconds)
    try:
        return pq_harness.run(code, d["tests"], d.get("stdin"), d.get("files"))
    except Timeout:
        return {"passed": False, "error": {"type": "Timeout"}, "tests": []}
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old)


def _failures(r):
    if r["error"]:
        return f"{r['error']['type']}: {r['error'].get('message', '')}"
    return "; ".join(f"{t['description']}: {t['message']}" for t in r["tests"] if not t["passed"])


def test_solution_passes(drill):
    r = _run(drill, drill["solution"])
    assert r["passed"], _failures(r)
    assert len(r["tests"]) >= 2


def test_starter_fails(drill):
    r = _run(drill, drill["starter"])
    assert not r["passed"], "el código inicial ya supera las pruebas"


def test_structure(drill, content):
    missions = {m["id"]: m for m in content["missions"]}
    assert drill["mission"] in missions, f"misión inexistente: {drill['mission']}"
    assert len(drill["hints"]) >= 2
    assert drill["prompt"].strip() and "TODO" not in drill["prompt"]
    assert "def test_" in drill["tests"]
    for pkg in drill["packages"]:
        assert pkg in {"numpy", "pandas", "scipy", "matplotlib"}, pkg
