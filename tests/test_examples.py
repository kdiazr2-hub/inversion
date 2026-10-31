"""The line-by-line explanations of each worked example agree with what the example prints.

For every line of an example that prints, each number its explanation mentions must be one of:
- a number the example prints, possibly rounded (``0,34`` for 0.3421; ``86 %`` for 0.859);
- a number written in the example's code (an input, such as ``n = 30`` or ``cv=5``);
- a threshold (``p < 0,05``) or a number from REVIEWED below, read by a person and kept on purpose.
So a claim like "≈ 3,2" next to a print that shows 6.04 fails until the explanation is fixed.
"""

import math
import re

import pq_harness

# Numbers that explain context rather than repeat the output (checked by reading each one).
REVIEWED = {
    "py-indices": {"4"},  # "los cinco laborables (0 a 4)": the indices of the slice
    "w2-recursion": {"0", "2", "6"},  # "2 + 0 + 2 + 6 = 10": the terms of the printed sum
    "w2-entornos": {"10"},  # "'1' de '10'": a digit of the version text being compared
    "pc-calc-3": {"12"},  # "12 cifras significativas": the .12g format
    "pc-calc-4": {"32"},  # "mide 1/32": the width after 5 halvings
    "m-sumatorias": {"10"},  # "Σ_{i=1}^{10}": the upper limit of the sum
    "e-centro": {"50"},  # "48 (no 50)": the wrong answer it warns about
    "d-discretas": {"1"},  # "1 − F(5)": the formula
    "d-normal": {"95"},  # "percentil 95": which percentile is printed
    "s-bootstrap": {"95"},  # "IC percentil del 95 %": the confidence level
    "r-lineal": {"95"},  # "IC 95 %": the confidence level
    "i-potencia": {"80"},  # "80 % de potencia": the power target, passed as 0.8
    "ps-demanda-4": {"80"},  # "intervalo del 80 %": between the 10 % and 90 % quantiles
    "cl-riesgos": {"50"},  # "RRR 50 %": 1 − RR with RR = 0.5 printed
    "pe-ensayo-3": {"33"},  # "33 puntos": the printed difference 0.33 as percentage points
    "px-vinos-3": {"4"},  # "multiplicados por 4, 3, 2 y 1": Holm's factors
    "ml-roc": {"3"},  # "TPR = 3/3 y FPR = 1/3": the counts behind the printed rates
    "ai-red": {"3", "4"},  # "acierta 3 de 4": counted from the two printed arrays
    "pt-texto-3": {"3"},  # "en 2 de 3 documentos": the corpus size
    "mv-vision": {"2"},  # "las columnas 1 y 2": where the printed edge is
    "ps-demanda-1": {"6"},  # "domingo (6)": the weekday index
}

NUMBER = re.compile(r"(?<![\w.,])([<>≤≥]\s*)?([−-]?\d+(?:[.,]\d+)?(?:e[−-]?\d+)?)(\s*%)?(?![\w])")


def _value(token):
    return float(token.replace("−", "-").replace(",", "."))


def _decimals(token):
    token = token.replace(",", ".")
    if "e" in token:
        return 12
    return len(token.split(".")[1]) if "." in token else 0


def _numbers(text):
    return [_value(t) for _, t, _ in NUMBER.findall(text)]


def _matches(value, decimals, candidates):
    step = 0.5 * 10 ** -decimals
    return any(math.isclose(abs(c), abs(value), abs_tol=step * 1.0001) for c in candidates)


def problems(mission):
    ex = mission["example"]
    res = pq_harness.run(ex["code"], "", ex.get("stdin"), mission.get("files"))
    out = _numbers(res["stdout"])
    code = _numbers(ex["code"])
    code_lines = [ln for ln in ex["code"].splitlines() if ln.strip()]
    found = []
    for line, expl in zip(code_lines, ex["lines"]):
        if "print(" not in line:
            continue
        for match in NUMBER.finditer(expl):
            threshold, token, percent = match.groups(default="")
            if threshold or token in REVIEWED.get(mission["id"], set()):
                continue
            v, d = _value(token), _decimals(token)
            ok = _matches(v, d, out) or _matches(v, d, code)
            if expl[match.end():].startswith("…"):  # truncated digits: 1,41421568… for 1.4142156862
                ok = ok or any(math.isclose(math.trunc(abs(c) * 10**d) / 10**d, abs(v)) for c in out)
            if percent:
                ok = ok or _matches(v / 100, d + 2, out) or _matches(v / 100, d + 2, code)
            if not ok:
                found.append(f"{token}{percent.strip()} en «{expl}» no aparece en la salida: {res['stdout'].strip()[:300]!r}")
    return found


def test_explanations_match_output(mission):
    issues = problems(mission)
    assert not issues, "\n".join(issues)
