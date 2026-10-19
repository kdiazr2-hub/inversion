import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
sys.path.insert(0, str(ROOT / "harness"))
os.environ.setdefault("MPLBACKEND", "Agg")

# Warm-up: the first matplotlib figure in a fresh environment builds the font cache, which can
# take longer than the per-mission time limit used by the content tests.
import matplotlib.pyplot as _plt  # noqa: E402

_plt.figure()
_plt.close("all")

# The browser worker imports the heavy packages before starting the run clock (warm_imports);
# do the same here so a cold import does not count against the per-mission time limit.
import pq_harness as _pq  # noqa: E402

_pq.warm_imports(["numpy", "pandas", "scipy.stats", "sklearn.linear_model", "sklearn.compose", "statsmodels.api", "pydantic", "networkx"])


def _export():
    # Always re-export so the tests see the current TypeScript content.
    subprocess.run(["npx", "tsx", "scripts/export-content.ts"], cwd=WEB, check=True, capture_output=True)
    return json.loads((WEB / "content.json").read_text(encoding="utf-8"))


CONTENT = _export()


@pytest.fixture(scope="session")
def content():
    return CONTENT


def pytest_generate_tests(metafunc):
    if "mission" in metafunc.fixturenames:
        missions = CONTENT["missions"]
        metafunc.parametrize("mission", missions, ids=[m["id"] for m in missions])
    if "drill" in metafunc.fixturenames:
        drills = CONTENT["drills"]
        metafunc.parametrize("drill", drills, ids=[f"{d['id']}#{d['seed']}" for d in drills])
