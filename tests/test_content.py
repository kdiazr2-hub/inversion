"""Every mission must be solvable, non-trivial and well formed.

For each mission: the reference solution passes all tests, the starter code does
not, the worked example runs, and the optional advanced challenge behaves the same.
"""

import re
import signal

import pq_harness

VALID_WORLDS = {f"w{i}" for i in range(1, 10)}


class Timeout(Exception):
    pass


def _alarm(signum, frame):
    raise Timeout("tiempo agotado (posible bucle infinito)")


def _run(m, code, tests, seconds=5, stdin=None):
    # Starter code may loop forever on purpose (e.g. a while that never ends); the browser
    # kills the worker, here an interval timer interrupts the run.
    old = signal.signal(signal.SIGALRM, _alarm)
    signal.setitimer(signal.ITIMER_REAL, seconds)
    try:
        return pq_harness.run(code, tests, m.get("stdin") if stdin is None else stdin, m.get("files"))
    except Timeout:
        return {"passed": False, "error": {"type": "Timeout"}, "tests": [], "stdout": ""}
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old)


def _report(res):
    lines = [f"error={res['error']}"]
    lines += [f"  {'✔' if t['passed'] else '✘'} {t['name']}: {t['message']}" for t in res["tests"]]
    lines.append("stdout:\n" + res["stdout"][-2000:])
    return "\n".join(lines)


def test_solution_passes(mission):
    res = _run(mission, mission["solution"], mission["tests"])
    assert res["passed"], _report(res)


def test_starter_fails(mission):
    res = _run(mission, mission["starter"], mission["tests"])
    assert not res["passed"], "El código inicial ya pasa todas las pruebas: la misión no enseña nada."


def test_example_runs(mission):
    res = _run(mission, mission["example"]["code"], "", stdin=mission["example"].get("stdin"))
    assert res["error"] is None, f"El ejemplo falla: {res['error']}"


def test_example_explained_line_by_line(mission):
    code_lines = [ln for ln in mission["example"]["code"].splitlines() if ln.strip()]
    assert len(mission["example"]["lines"]) == len(code_lines), (
        f"{len(code_lines)} líneas de código, {len(mission['example']['lines'])} explicaciones"
    )


def test_advanced(mission):
    adv = mission.get("advanced")
    if not adv:
        return
    good = _run(mission, adv["solution"], adv["tests"], stdin=adv.get("stdin"))
    assert good["passed"], _report(good)
    bad = _run(mission, adv["starter"], adv["tests"], stdin=adv.get("stdin"))
    assert not bad["passed"], "El reto avanzado ya está resuelto en su código inicial."


def test_structure(mission):
    m = mission
    assert m["world"] in VALID_WORLDS
    assert re.fullmatch(r"[a-z0-9-]+", m["id"])
    for field in ("title", "story", "objective", "intuition", "challenge", "review"):
        assert m[field].strip(), f"Falta {field}"
    assert len(m["hints"]) >= 2, "Al menos dos pistas progresivas"
    assert m["errors"], "Al menos un error frecuente explicado"
    assert m["before"], "Conceptos previos"
    q = m["quiz"]
    assert len(q["options"]) >= 3 and 0 <= q["answer"] < len(q["options"])
    assert "misconception" not in q["options"][q["answer"]], "La respuesta correcta no puede marcar un error conceptual"
    assert "def test_" in m["tests"]
    assert m["xp"] > 0 and m["coins"] >= 0
    if m["kind"] == "project":
        p = m["project"]
        for key in ("requirements", "stages", "criteria", "extensions"):
            assert p[key], f"El proyecto necesita {key}"


def test_catalog(content):
    ms = content["missions"]
    ids = [m["id"] for m in ms]
    assert len(ids) == len(set(ids)), "IDs duplicados"
    known = set(ids)
    pos = {mid: i for i, mid in enumerate(ids)}
    for m in ms:
        for r in m["requires"]:
            assert r in known, f"{m['id']} requiere {r}, que no existe"
            assert pos[r] < pos[m["id"]], f"{m['id']} requiere {r}, que aparece después"
    solutions = [m["solution"].strip() for m in ms]
    assert len(solutions) == len(set(solutions)), "Hay misiones duplicadas"


def _stage(content, series_id, n):
    return next(m for m in content["missions"] if (m.get("series") or {}).get("id") == series_id and m["series"]["stage"] == n)


def test_series_stage(mission, content):
    """A stage continues the previous one: carried code + new skeleton must not pass yet,
    the reference solution builds on the previous one and still passes the earlier tests."""
    s = mission.get("series")
    if not s:
        return
    assert mission["kind"] == "project", "Las etapas son misiones de tipo proyecto"
    if s["stage"] == 1:
        return
    prev = _stage(content, s["id"], s["stage"] - 1)
    assert prev["id"] in mission["requires"], "Cada etapa requiere la anterior"
    assert mission["solution"].startswith(prev["solution"].rstrip()), "La solución debe ampliar la de la etapa anterior"
    carried = prev["solution"].rstrip() + "\n\n" + mission["starter"]
    res = _run(mission, carried, mission["tests"], seconds=20)
    assert not res["passed"], "El código heredado más el esqueleto ya pasa: la etapa no exige nada nuevo"
    still = _run(prev, mission["solution"], prev["tests"], seconds=20)
    assert still["passed"], "La solución de esta etapa rompe las pruebas de la anterior:\n" + _report(still)


def test_series_catalog(content):
    series = {}
    for m in content["missions"]:
        if m.get("series"):
            series.setdefault(m["series"]["id"], []).append(m)
    for sid, stages in series.items():
        nums = sorted(m["series"]["stage"] for m in stages)
        assert nums == list(range(1, len(stages) + 1)), f"{sid}: etapas {nums}"
        assert {m["series"]["of"] for m in stages} == {len(stages)}, f"{sid}: total de etapas incoherente"
        assert len({m["series"]["title"] for m in stages}) == 1 and len({m["world"] for m in stages}) == 1


def test_lab_link(mission, content):
    lab = mission.get("lab")
    if not lab:
        return
    assert lab["tab"] in content["labs"][lab["lab"]], f"El simulador {lab['lab']}/{lab['tab']} no existe"
