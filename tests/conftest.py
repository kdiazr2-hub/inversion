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
