"""The projects learners download (.zip) run outside the game.

Every portfolio piece is exported from its reference solution; each archive must be a valid ZIP
with the script, its data, README and .gitignore, its requirements.txt must pin exactly the
versions installed here (the ones CI tests with), and the unzipped script must run with this
CPython from its own folder, as the README tells the learner to do.
"""

import json
import os
import subprocess
import sys
import zipfile
from importlib import metadata

import pytest

from conftest import WEB


@pytest.fixture(scope="module")
def exported(tmp_path_factory):
    out = tmp_path_factory.mktemp("proyectos")
    subprocess.run(["npx", "tsx", "scripts/export-projects.ts", str(out)], cwd=WEB, check=True, capture_output=True)
    return out, json.loads((out / "index.json").read_text(encoding="utf-8"))


def test_every_piece_is_exported(exported, content):
    _, index = exported
    ids = {p["id"] for p in index}
    for m in content["missions"]:
        series = m.get("series")
        final = m["kind"] == "project" and (not series or series["stage"] == series["of"])
        if final or m.get("advanced"):
            assert m["id"] in ids, f"{m['id']} no se exporta"


def test_archives_run_outside_the_game(exported, tmp_path):
    out, index = exported
    env = dict(os.environ, MPLBACKEND="Agg", PYTHONIOENCODING="utf-8")
    failures = []
    for piece in index:
        with zipfile.ZipFile(out / piece["zip"]) as z:
            assert z.testzip() is None, f"{piece['zip']}: CRC incorrecto"
            names = z.namelist()
            folder = piece["folder"]
            assert all(n.startswith(folder + "/") for n in names), names
            for required in (piece["script"], "README.md", ".gitignore"):
                assert f"{folder}/{required}" in names, f"{piece['zip']} no contiene {required}"
            reqs = z.read(f"{folder}/requirements.txt").decode() if f"{folder}/requirements.txt" in names else ""
            dest = tmp_path / piece["id"]
            z.extractall(dest)
        for line in reqs.splitlines():
            name, version = line.split("==")
            assert metadata.version(name) == version, f"{piece['id']}: requirements.txt fija {line}, pero aquí hay {metadata.version(name)}"
        stdin = "".join(f"{x}\n" for x in piece["stdin"])
        r = subprocess.run(
            [sys.executable, piece["script"]],
            cwd=dest / piece["folder"],
            input=stdin,
            capture_output=True,
            text=True,
            encoding="utf-8",
            env=env,
            timeout=180,
        )
        if r.returncode != 0:
            failures.append(f"{piece['id']}: código {r.returncode}\n{r.stderr[-1500:]}")
    assert not failures, "\n\n".join(failures)
