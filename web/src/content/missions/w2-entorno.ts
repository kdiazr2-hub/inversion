import { py, type Mission } from "../types";

// Mundo 2 · Fuera del navegador: lo necesario para seguir programando en tu propio ordenador.
// Todo se ejecuta de verdad en Pyodide: la terminal trabaja sobre su sistema de archivos (en memoria),
// las versiones se leen de los paquetes realmente instalados y los identificadores de Git son los
// mismos que calcula git (comprobados con git 2.43).

const TERMINAL_BASE = py`import contextlib
import io
import os
import runpy
import shlex
import shutil
import sys
from pathlib import Path


class Terminal:
    """Terminal mínima que trabaja con archivos reales dentro de la carpeta raiz."""

    def __init__(self, raiz):
        self.raiz = Path(raiz).resolve()
        self.actual = self.raiz

    def mostrar(self, ruta):
        """La ruta tal como la ve el usuario: '/' es la raíz de esta terminal."""
        relativa = ruta.relative_to(self.raiz).as_posix()
        return "/" if relativa == "." else "/" + relativa

    def ejecutar(self, linea):
        partes = shlex.split(linea)
        if not partes:
            return ""
        orden, argumentos = partes[0], partes[1:]
        metodo = getattr(self, "orden_" + orden, None)
        if metodo is None:
            return f"{orden}: orden no encontrada"
        return metodo(argumentos)

    def orden_pwd(self, args):
        return self.mostrar(self.actual)

    def orden_ls(self, args):
        carpeta = self.ruta(args[0]) if args else self.actual
        if not carpeta.is_dir():
            return f"ls: no existe la carpeta: {args[0]}"
        nombres = [p.name + "/" if p.is_dir() else p.name for p in carpeta.iterdir()]
        return "\n".join(sorted(nombres))

    def orden_cat(self, args):
        archivo = self.ruta(args[0])
        if not archivo.is_file():
            return f"cat: no existe el archivo: {args[0]}"
        return archivo.read_text(encoding="utf-8").rstrip("\n")

    def orden_mv(self, args):
        origen, destino = self.ruta(args[0]), self.ruta(args[1])
        if not origen.exists():
            return f"mv: no existe: {args[0]}"
        shutil.move(origen, destino)
        return ""

    def orden_rm(self, args):
        recursivo = "-r" in args
        salida = []
        for nombre in [a for a in args if a != "-r"]:
            objetivo = self.ruta(nombre)
            if objetivo == self.raiz:
                salida.append("rm: no se puede borrar la raíz")
            elif objetivo.is_dir():
                if recursivo:
                    shutil.rmtree(objetivo)
                else:
                    salida.append(f"rm: {nombre} es una carpeta (usa rm -r)")
            elif objetivo.exists():
                objetivo.unlink()
            else:
                salida.append(f"rm: no existe: {nombre}")
        return "\n".join(salida)
`;

const REQUISITOS = `# Dependencias del analizador del refugio
numpy==2.2.5
pandas>=2.0,<3        # la versión 3 cambia la API
Scikit_Learn~=1.7.0
matplotlib!=3.9.0,>=3.8

requests>=2.31
`;

const PYPROJECT = `[project]
name = "analizador-refugio"
version = "0.3.0"
requires-python = ">=3.11"
dependencies = [
    "numpy>=2.0",
    "pandas>=2.2,<3",
]

[project.optional-dependencies]
pruebas = ["pytest>=8"]
`;

export const W2_ENTORNO: Mission[] = [
  {
    id: "w2-terminal",
    world: "w2",
    zone: "Fuera del navegador",
    title: "La consola del refugio: la terminal, las rutas y los archivos",
    kind: "lesson",
    difficulty: 3,
    skills: ["terminal", "rutas", "archivos"],
    requires: ["w2-clases", "py-archivos"],
    story: "En el refugio hay una consola antigua: no tiene botones, solo una línea donde escribir órdenes. Quien la domina mueve, crea y ejecuta lo que quiera sin tocar el ratón. Para entenderla de verdad vas a construir la tuya.",
    objective: "Entender qué hace una terminal: la carpeta de trabajo, las rutas absolutas y relativas (`.`, `..`, `~`), las órdenes básicas y cómo un programa recibe sus argumentos en `sys.argv`; y construir una terminal que trabaja con archivos reales.",
    before: ["Clases y métodos", "Leer y escribir archivos", "Listas y cadenas"],
    intuition: [
      "Fuera del navegador, los programas de Python se ejecutan desde una **terminal** (también llamada consola o línea de órdenes): una ventana donde escribes órdenes de texto que un programa, el *shell*, interpreta. En Linux y macOS suele ser `bash` o `zsh`; en Windows, **PowerShell**.",
      "",
      "La terminal siempre está **en una carpeta**, la *carpeta de trabajo*. Las rutas se escriben de dos formas:",
      "",
      "- **Absolutas**: empiezan en la raíz (`/home/ana/proyecto` en Linux y macOS; `C:\\Users\\ana\\proyecto` en Windows).",
      "- **Relativas**: parten de la carpeta de trabajo (`datos/ventas.csv`). `.` es la carpeta actual, `..` la carpeta de arriba y `~` tu carpeta personal.",
      "",
      "Las órdenes que más usarás (PowerShell acepta los mismos nombres para casi todas):",
      "",
      "- `pwd`: muestra la carpeta de trabajo. `ls`: lista su contenido. `cd carpeta`: entra en ella; `cd ..` sube un nivel.",
      "- `mkdir carpeta` crea una carpeta; `mkdir -p a/b/c` crea también las intermedias (en PowerShell `mkdir` ya las crea).",
      "- `cat archivo` muestra un archivo; `echo texto > archivo` lo escribe y `>>` añade al final.",
      "- `mv origen destino` mueve o renombra; `rm archivo` borra (`rm -r` borra una carpeta entera; en PowerShell, `Remove-Item -Recurse carpeta`). **No hay papelera**: lo borrado no se recupera.",
      "",
      "Para ejecutar un programa: `python analisis.py ventas.csv --resumen`. Python guarda las palabras de la orden en la lista `sys.argv`: `['analisis.py', 'ventas.csv', '--resumen']`. Si un argumento tiene espacios, va entre comillas: `\"mis datos.csv\"`. El módulo `shlex` separa una línea exactamente como lo hace el shell.",
      "",
      "Las rutas relativas que use el programa (`open(\"ventas.csv\")`) se buscan en la **carpeta de trabajo de la terminal**, no en la carpeta donde está el `.py`. Es la causa del famoso `FileNotFoundError` al ejecutar un script desde otra carpeta.",
      "",
      "En el navegador no hay una terminal del sistema, pero Pyodide tiene un sistema de archivos de verdad (en memoria): tu terminal creará, moverá y borrará archivos reales con `pathlib` y `shutil`, y ejecutará scripts de verdad con `runpy`.",
      "",
      "Para instalar Python y abrir una terminal en tu ordenador, consulta la guía **En tu ordenador** (en el menú **Más**).",
    ],
    example: {
      code: py`import shlex
from pathlib import Path
Path("notas").mkdir()
Path("notas/hoy.txt").write_text("regar el huerto\n", encoding="utf-8")
print(sorted(p.name for p in Path(".").iterdir()))
print(Path("notas/../notas/hoy.txt").resolve().name)
print(shlex.split('python contar.py "mis datos.csv" --rapido'))`,
      lines: [
        "shlex separa una línea de órdenes como el shell.",
        "pathlib representa rutas como objetos.",
        "Crea la carpeta notas dentro de la carpeta de trabajo (como mkdir notas).",
        "Escribe un archivo dentro de ella (como echo regar el huerto > notas/hoy.txt).",
        "['notas']: lista la carpeta actual (como ls).",
        "hoy.txt: resolve() convierte la ruta en absoluta y elimina el '..'.",
        "['python', 'contar.py', 'mis datos.csv', '--rapido']: las comillas mantienen junto lo que tiene espacios.",
      ],
    },
    challenge: [
      "La clase `Terminal(raiz)` ya trae `ejecutar` (separa la línea con `shlex` y llama al método `orden_<nombre>`), `mostrar` y las órdenes `pwd`, `ls`, `cat`, `mv` y `rm`. `self.actual` es la carpeta de trabajo. Para esta terminal, `/` es su carpeta `raiz` y **ninguna ruta puede salir de ella**.",
      "",
      "1. `ruta(texto)`: la ruta (`Path`) a la que se refiere `texto`. Si empieza por `/`, parte de la raíz; si no, de la carpeta actual. `~` y `~/…` también parten de la raíz. Ignora `.` y las barras repetidas; `..` sube un nivel, pero nunca por encima de la raíz.",
      "2. `orden_cd(args)`: sin argumentos vuelve a la raíz; si la ruta no es una carpeta devuelve `\"cd: no existe la carpeta: <arg>\"` y no se mueve. Si todo va bien devuelve `\"\"`.",
      "3. `orden_mkdir(args)`: crea cada carpeta indicada; con `-p` crea también las intermedias y no se queja si ya existe. Por cada carpeta que no pueda crear, una línea `\"mkdir: no se puede crear: <arg>\"`.",
      "4. `orden_echo(args)`: devuelve las palabras unidas por un espacio. Si aparece `>` o `>>` (separado por espacios), escribe el texto y un salto de línea en el archivo que sigue (`>` lo sustituye, `>>` añade) y devuelve `\"\"`.",
      "5. `orden_python(args)`: ejecuta el script con `runpy.run_path(..., run_name=\"__main__\")`, con `sys.argv` igual a `[script, *argumentos]` y desde la carpeta actual de la terminal (`os.chdir`). Devuelve lo que imprima, sin el salto de línea final. Al terminar, deja `sys.argv` y la carpeta de trabajo de Python como estaban. Si el script no existe: `\"python: no existe el archivo: <arg>\"`.",
    ],
    starter: py`${TERMINAL_BASE}
    def ruta(self, texto):
        return self.actual / texto

    def orden_cd(self, args):
        return ""

    def orden_mkdir(self, args):
        return ""

    def orden_echo(self, args):
        return ""

    def orden_python(self, args):
        return ""
`,
    solution: py`${TERMINAL_BASE}
    def ruta(self, texto):
        if texto == "~" or texto.startswith("~/"):
            texto = texto[1:] or "/"
        partes = [] if texto.startswith("/") else list(self.actual.relative_to(self.raiz).parts)
        for parte in texto.split("/"):
            if parte in ("", "."):
                continue
            if parte == "..":
                if partes:
                    partes.pop()
            else:
                partes.append(parte)
        return self.raiz.joinpath(*partes)

    def orden_cd(self, args):
        destino = self.ruta(args[0]) if args else self.raiz
        if not destino.is_dir():
            return f"cd: no existe la carpeta: {args[0]}"
        self.actual = destino
        return ""

    def orden_mkdir(self, args):
        padres = "-p" in args
        salida = []
        for nombre in [a for a in args if a != "-p"]:
            try:
                self.ruta(nombre).mkdir(parents=padres, exist_ok=padres)
            except (FileExistsError, FileNotFoundError):
                salida.append(f"mkdir: no se puede crear: {nombre}")
        return "\n".join(salida)

    def orden_echo(self, args):
        for simbolo, modo in ((">>", "a"), (">", "w")):
            if simbolo in args:
                i = args.index(simbolo)
                with open(self.ruta(args[i + 1]), modo, encoding="utf-8") as archivo:
                    archivo.write(" ".join(args[:i]) + "\n")
                return ""
        return " ".join(args)

    def orden_python(self, args):
        if not args:
            return "python: indica el archivo .py que quieres ejecutar"
        script = self.ruta(args[0])
        if not script.is_file():
            return f"python: no existe el archivo: {args[0]}"
        argv, carpeta = sys.argv, os.getcwd()
        salida = io.StringIO()
        sys.argv = [args[0], *args[1:]]
        os.chdir(self.actual)
        try:
            with contextlib.redirect_stdout(salida):
                runpy.run_path(str(script), run_name="__main__")
        except SystemExit:
            pass
        finally:
            sys.argv = argv
            os.chdir(carpeta)
        return salida.getvalue().rstrip("\n")


consola = Terminal(".")
for orden in ["mkdir -p proyecto/datos", "cd proyecto", "echo uno dos tres > datos/notas.txt", "ls", "pwd", "cat datos/notas.txt"]:
    print(f"$ {orden}")
    salida = consola.ejecutar(orden)
    if salida:
        print(salida)
`,
    tests: py`
import os
import sys
import tempfile
from pathlib import Path

SCRIPT = '''import sys
from pathlib import Path

archivo = sys.argv[1]
palabras = Path(archivo).read_text(encoding="utf-8").split()
print(f"{archivo}: {len(palabras)} palabras")
print("argumentos:", sys.argv[1:])
if __name__ == "__main__":
    print("ejecutado como programa")
'''


def _terminal():
    raiz = Path(tempfile.mkdtemp(dir=".")).resolve()
    terminal = t.get("Terminal", type)(raiz)
    # Antes de escribir nada, comprueba que ninguna ruta sale de la carpeta de prueba.
    for texto, esperado in (("/", raiz), ("..", raiz), ("/x/../y", raiz / "y")):
        obtenido = terminal.ruta(texto)
        assert obtenido == esperado, f"ruta({texto!r}) debe ser {esperado}, no {obtenido}: ninguna ruta puede salir de la raíz."
    return terminal, raiz


def test_rutas():
    "Rutas absolutas y relativas, con ., .. y ~"
    terminal, raiz = _terminal()
    (raiz / "datos" / "2024").mkdir(parents=True)
    terminal.actual = raiz / "datos"
    casos = {
        "2024": raiz / "datos" / "2024",
        "./2024/../2024/": raiz / "datos" / "2024",
        "..": raiz,
        "../informes/final.txt": raiz / "informes" / "final.txt",
        "/datos//2024": raiz / "datos" / "2024",
        "~": raiz,
        "~/datos": raiz / "datos",
        "../../../..": raiz,
    }
    for texto, esperado in casos.items():
        obtenido = terminal.ruta(texto)
        assert obtenido == esperado, f"Desde /datos, ruta({texto!r}) debería ser {terminal.mostrar(esperado)}, no {obtenido}."


def test_cd_y_pwd():
    "cd cambia de carpeta y pwd la muestra"
    terminal, raiz = _terminal()
    (raiz / "datos" / "2024").mkdir(parents=True)
    (raiz / "LEEME.txt").write_text("hola\n", encoding="utf-8")
    pasos = [
        ("cd datos/2024", "", "/datos/2024"),
        ("cd ..", "", "/datos"),
        ("cd /datos/2024", "", "/datos/2024"),
        ("cd", "", "/"),
        ("cd fantasma", "cd: no existe la carpeta: fantasma", "/"),
        ("cd LEEME.txt", "cd: no existe la carpeta: LEEME.txt", "/"),
        ("cd ~/datos", "", "/datos"),
    ]
    for orden, salida, carpeta in pasos:
        obtenida = terminal.ejecutar(orden)
        assert obtenida == salida, f"{orden!r} debería devolver {salida!r}, no {obtenida!r}."
        actual = terminal.ejecutar("pwd")
        assert actual == carpeta, f"Tras {orden!r}, pwd debería ser {carpeta}, no {actual}."


def test_mkdir():
    "mkdir crea carpetas y, con -p, también las intermedias"
    terminal, raiz = _terminal()
    assert terminal.ejecutar("mkdir informes") == "" and (raiz / "informes").is_dir(), "mkdir informes debe crear la carpeta."
    assert terminal.ejecutar("mkdir informes") == "mkdir: no se puede crear: informes", "Crear una carpeta que ya existe es un error."
    salida = terminal.ejecutar("mkdir a/b/c")
    assert salida == "mkdir: no se puede crear: a/b/c" and not (raiz / "a").exists(), "Sin -p, mkdir no crea las carpetas intermedias."
    assert terminal.ejecutar("mkdir -p a/b/c") == "" and (raiz / "a" / "b" / "c").is_dir(), "mkdir -p a/b/c crea a, a/b y a/b/c."
    assert terminal.ejecutar("mkdir -p a/b/c") == "", "Con -p, que la carpeta ya exista no es un error."
    salida = terminal.ejecutar('mkdir "mis fotos" musica')
    assert salida == "" and (raiz / "mis fotos").is_dir() and (raiz / "musica").is_dir(), "mkdir admite varias carpetas y nombres entre comillas."


def test_echo_y_redireccion():
    "echo escribe texto; > crea o sustituye un archivo y >> añade"
    terminal, raiz = _terminal()
    salida = terminal.ejecutar('echo hola   "dos  espacios"')
    assert salida == "hola dos  espacios", f"echo une las palabras con un espacio y respeta lo que va entre comillas: {salida!r}"
    assert terminal.ejecutar("echo primera línea > nota.txt") == "", "Con > no se muestra nada: el texto va al archivo."
    assert (raiz / "nota.txt").read_text(encoding="utf-8") == "primera línea\n", "El archivo debe contener el texto y un salto de línea."
    terminal.ejecutar("echo segunda >> nota.txt")
    assert terminal.ejecutar("cat nota.txt") == "primera línea\nsegunda", ">> añade al final del archivo."
    terminal.ejecutar("echo nueva > nota.txt")
    assert terminal.ejecutar("cat nota.txt") == "nueva", "> sustituye el contenido anterior."


def test_python():
    "python ejecuta un script con sus argumentos desde la carpeta actual"
    terminal, raiz = _terminal()
    (raiz / "proyecto" / "datos").mkdir(parents=True)
    (raiz / "proyecto" / "contar.py").write_text(SCRIPT, encoding="utf-8")
    (raiz / "proyecto" / "datos" / "notas.txt").write_text("uno dos\ntres\n", encoding="utf-8")
    terminal.ejecutar("cd proyecto")
    argv, carpeta = list(sys.argv), os.getcwd()
    salida = terminal.ejecutar('python contar.py datos/notas.txt "dos palabras"')
    esperado = "datos/notas.txt: 3 palabras\nargumentos: ['datos/notas.txt', 'dos palabras']\nejecutado como programa"
    assert salida == esperado, f"Se esperaba:\n{esperado}\n\nSalida obtenida:\n{salida}"
    assert sys.argv == argv and os.getcwd() == carpeta, "Al terminar, deja sys.argv y la carpeta de trabajo como estaban."
    assert terminal.ejecutar("python falta.py") == "python: no existe el archivo: falta.py"


def test_ls_mv_rm():
    "ls, mv y rm trabajan con archivos reales"
    terminal, raiz = _terminal()
    terminal.ejecutar("mkdir -p datos/viejos")
    terminal.ejecutar("echo 1,2 > datos/a.csv")
    assert terminal.ejecutar("ls datos") == "a.csv\nviejos/", "ls datos debe mostrar a.csv y la carpeta viejos/."
    assert terminal.ejecutar("mv datos/a.csv datos/viejos") == "" and (raiz / "datos" / "viejos" / "a.csv").is_file()
    assert terminal.ejecutar("rm datos/viejos") == "rm: datos/viejos es una carpeta (usa rm -r)"
    assert terminal.ejecutar("rm -r datos/viejos") == "" and terminal.ejecutar("ls datos") == ""
    assert terminal.ejecutar("nano notas.txt") == "nano: orden no encontrada"


def test_no_sale_de_la_raiz():
    "Ninguna orden escapa de la carpeta raíz"
    terminal, raiz = _terminal()
    terminal.ejecutar("cd ../../..")
    assert terminal.ejecutar("pwd") == "/", "Desde la raíz, cd .. se queda en la raíz."
    terminal.ejecutar("echo dentro > ../../fuera.txt")
    assert (raiz / "fuera.txt").is_file(), "Desde la raíz, ../../fuera.txt es /fuera.txt de la terminal: debe quedar dentro de ella."
`,
    hints: [
      "En `ruta`, trabaja con una lista de partes: empieza vacía si el texto empieza por `/` o con `list(self.actual.relative_to(self.raiz).parts)` si no. Recorre `texto.split(\"/\")`: salta `\"\"` y `\".\"`, haz `pop()` con `\"..\"` (si la lista no está vacía) y añade el resto. Al final, `self.raiz.joinpath(*partes)`.",
      "`mkdir(parents=padres, exist_ok=padres)` hace todo el trabajo; captura `FileExistsError` y `FileNotFoundError` para escribir el mensaje.",
      "En `orden_python`, guarda `sys.argv` y `os.getcwd()` antes de cambiarlos y restáuralos en un `finally`; captura lo que imprime el script con `contextlib.redirect_stdout(io.StringIO())`.",
    ],
    errors: [
      { error: "FileNotFoundError al ejecutar un script desde otra carpeta", fix: "Las rutas relativas se buscan desde la carpeta de trabajo de la terminal. Entra con cd en la carpeta del proyecto o usa rutas relativas al script: Path(__file__).parent / \"datos.csv\"." },
      { error: "ruta('/datos') devuelve /datos del ordenador entero", fix: "Path(a) / \"/datos\" descarta a porque /datos es absoluta. Construye la ruta por partes desde self.raiz." },
      { error: "IndexError: list index out of range con sys.argv[1]", fix: "El programa se ejecutó sin argumentos. Comprueba len(sys.argv) o usa argparse, que explica qué falta." },
    ],
    quiz: {
      question: "Estás en /home/ana y ejecutas `python proyecto/analisis.py ventas.csv`. El programa hace `open(sys.argv[1])`. ¿Dónde busca Python ventas.csv?",
      options: [
        { text: "En /home/ana, la carpeta de trabajo de la terminal" },
        { text: "En /home/ana/proyecto, donde está analisis.py" },
        { text: "En la carpeta donde está instalado Python" },
      ],
      answer: 0,
      explanation: "Las rutas relativas se resuelven desde la carpeta de trabajo, no desde la ubicación del script. Para leer un archivo junto al script, usa Path(__file__).parent / \"ventas.csv\".",
    },
    review: "Explica la diferencia entre una ruta absoluta y una relativa, qué significan ., .. y ~, y qué contiene sys.argv al ejecutar `python a.py b c`.",
    xp: 90,
    coins: 13,
  },
  {
    id: "w2-entornos",
    world: "w2",
    zone: "Fuera del navegador",
    title: "El almacén de herramientas: pip, versiones y entornos virtuales",
    kind: "lesson",
    difficulty: 3,
    skills: ["dependencias", "entornos-virtuales", "versiones"],
    requires: ["w2-terminal"],
    story: "El almacén del refugio guarda herramientas de muchos herreros, cada una con su versión. Un proyecto que funcionaba ayer se rompe hoy si alguien cambia una herramienta sin avisar. Por eso cada proyecto tiene su propio estante y una lista exacta de lo que necesita.",
    objective: "Entender qué son pip, PyPI y un entorno virtual; leer `requirements.txt` y `pyproject.toml`; comprobar si las versiones instaladas cumplen los requisitos y ordenar versiones correctamente.",
    before: ["La terminal", "Diccionarios y listas", "Cadenas"],
    packages: ["packaging"],
    intuition: [
      "Un **paquete** es código que otra persona publicó para que lo reutilices. Casi todos están en **PyPI** (pypi.org) y se instalan con **pip**. El nombre del paquete no siempre coincide con el del `import`: se instala `scikit-learn` y se importa `sklearn`.",
      "",
      "Un **entorno virtual** es una carpeta (normalmente `.venv`) con su propio Python y sus propios paquetes. Cada proyecto tiene el suyo: así un proyecto puede usar pandas 2 y otro uno antiguo sin pisarse.",
      "",
      "```bash",
      "# Linux y macOS",
      "python3 -m venv .venv",
      "source .venv/bin/activate",
      "",
      "# Windows (PowerShell)",
      "py -m venv .venv",
      ".venv\\Scripts\\Activate.ps1",
      "",
      "# Con el entorno activado, en cualquier sistema",
      "python -m pip install pandas==2.3.1",
      "python -m pip freeze > requirements.txt",
      "python -m pip install -r requirements.txt",
      "deactivate",
      "```",
      "",
      "Si PowerShell no deja ejecutar `Activate.ps1`, permite los scripts locales para tu usuario con `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.",
      "",
      "Las dependencias se apuntan en `requirements.txt` (una por línea) o en la sección `dependencies` de `pyproject.toml`. Cada una lleva un **especificador de versión**:",
      "",
      "- `==2.2.5` exactamente esa; `>=2.0,<3` desde la 2.0 hasta antes de la 3; `!=3.9.0` cualquiera menos esa.",
      "- `~=1.7.0` es la **versión compatible**: `>=1.7.0` y `<1.8`.",
      "",
      "Las versiones **no se ordenan como texto**: `\"1.10\" < \"1.9\"` es `True` para Python, pero la 1.10 es posterior. La biblioteca `packaging` (la que usa pip) las compara bien y entiende versiones previas como `1.10.0rc1`.",
      "",
      "pip trata igual `Scikit_Learn`, `scikit-learn` y `scikit.learn`: normaliza los nombres con `canonicalize_name`.",
      "",
      "En el navegador, Pyodide trae paquetes compilados para WebAssembly y su propio instalador, `micropip`; el juego los instala por ti. Las versiones que ves con `importlib.metadata.version` son las reales de este entorno.",
    ],
    example: {
      code: py`from importlib import metadata
from packaging.specifiers import SpecifierSet
from packaging.version import Version
print(sorted(["1.10", "1.9", "1.2"]))
print(sorted(["1.10", "1.9", "1.2"], key=Version))
compatible = SpecifierSet("~=1.7.0")
print(compatible.contains("1.7.4"), compatible.contains("1.8.0"))
print(metadata.version("packaging"))`,
      lines: [
        "importlib.metadata lee los paquetes instalados en este entorno.",
        "SpecifierSet representa condiciones como >=2.0,<3.",
        "Version entiende el formato de las versiones de Python.",
        "['1.10', '1.2', '1.9']: como texto, '1' de '10' va antes que '2'.",
        "['1.2', '1.9', '1.10']: comparadas como versiones, en el orden correcto.",
        "~=1.7.0 significa >=1.7.0 y <1.8.",
        "True False: la 1.7.4 es compatible; la 1.8.0, no.",
        "La versión de packaging instalada aquí (la de Pyodide).",
      ],
    },
    challenge: [
      "`REQUISITOS` y `PYPROJECT` contienen los archivos `requirements.txt` y `pyproject.toml` del proyecto.",
      "",
      "1. `leer_requisitos(texto)`: lista de `Requirement` (de `packaging.requirements`), uno por línea, sin líneas vacías ni comentarios (lo que va desde `#`).",
      "2. `dependencias(texto)`: lista de `Requirement` de la lista `dependencies` de la sección `[project]`, leída con `tomllib.loads`.",
      "3. `version_instalada(nombre)`: la versión instalada de verdad (`importlib.metadata.version`) o `None` si no está instalado.",
      "4. `comprobar(requisitos, instaladas=None)`: diccionario con el nombre normalizado de cada requisito (`canonicalize_name`) y `\"ok\"`, `\"falta\"` o `\"<versión> no cumple <especificador>\"` (con `str(req.specifier)`). `instaladas` es un diccionario nombre → versión; si es `None`, usa las versiones reales.",
      "5. `congelar(instaladas)`: el texto de `pip freeze`: una línea `nombre==versión` por paquete, con el nombre normalizado, ordenadas por nombre y terminadas en salto de línea.",
      "6. `ordenar_versiones(versiones)`: las mismas cadenas ordenadas como versiones.",
    ],
    starter: py`import tomllib
from importlib import metadata
from pathlib import Path

from packaging.requirements import Requirement
from packaging.utils import canonicalize_name
from packaging.version import Version

REQUISITOS = Path("requirements.txt").read_text(encoding="utf-8")
PYPROJECT = Path("pyproject.toml").read_text(encoding="utf-8")


def leer_requisitos(texto):
    return []


def dependencias(texto):
    return []


def version_instalada(nombre):
    return None


def comprobar(requisitos, instaladas=None):
    return {}


def congelar(instaladas):
    return ""


def ordenar_versiones(versiones):
    return sorted(versiones)
`,
    solution: py`import tomllib
from importlib import metadata
from pathlib import Path

from packaging.requirements import Requirement
from packaging.utils import canonicalize_name
from packaging.version import Version

REQUISITOS = Path("requirements.txt").read_text(encoding="utf-8")
PYPROJECT = Path("pyproject.toml").read_text(encoding="utf-8")


def leer_requisitos(texto):
    requisitos = []
    for linea in texto.splitlines():
        linea = linea.split("#", 1)[0].strip()
        if linea:
            requisitos.append(Requirement(linea))
    return requisitos


def dependencias(texto):
    proyecto = tomllib.loads(texto)["project"]
    return [Requirement(d) for d in proyecto.get("dependencies", [])]


def version_instalada(nombre):
    try:
        return metadata.version(nombre)
    except metadata.PackageNotFoundError:
        return None


def comprobar(requisitos, instaladas=None):
    informe = {}
    for req in requisitos:
        nombre = canonicalize_name(req.name)
        version = version_instalada(nombre) if instaladas is None else instaladas.get(nombre)
        if version is None:
            informe[nombre] = "falta"
        elif req.specifier.contains(version, prereleases=True):
            informe[nombre] = "ok"
        else:
            informe[nombre] = f"{version} no cumple {req.specifier}"
    return informe


def congelar(instaladas):
    lineas = sorted(f"{canonicalize_name(n)}=={v}" for n, v in instaladas.items())
    return "".join(linea + "\n" for linea in lineas)


def ordenar_versiones(versiones):
    return sorted(versiones, key=Version)


instaladas = {"numpy": "2.2.5", "pandas": "3.0.1", "scikit-learn": "1.7.2", "matplotlib": "3.9.0"}
for nombre, resultado in comprobar(leer_requisitos(REQUISITOS), instaladas).items():
    print(f"{nombre:14} {resultado}")
print([str(d) for d in dependencias(PYPROJECT)])
print(comprobar(leer_requisitos("packaging>=20")))
`,
    tests: py`
from packaging.requirements import Requirement


def test_leer_requisitos():
    "Lee requirements.txt sin comentarios ni líneas vacías"
    reqs = t.get("leer_requisitos", "function")(t.get("REQUISITOS"))
    assert all(isinstance(r, Requirement) for r in reqs), "Devuelve objetos Requirement de packaging.requirements."
    nombres = [r.name for r in reqs]
    assert nombres == ["numpy", "pandas", "Scikit_Learn", "matplotlib", "requests"], f"Nombres leídos: {nombres}"
    assert reqs[1].specifier.contains("2.3.1") and not reqs[1].specifier.contains("3.0"), "pandas>=2.0,<3 admite la 2.3.1 pero no la 3.0."


def test_pyproject():
    "Lee las dependencias de pyproject.toml"
    deps = t.get("dependencias", "function")(t.get("PYPROJECT"))
    assert all(isinstance(d, Requirement) for d in deps), "Devuelve objetos Requirement."
    assert [d.name for d in deps] == ["numpy", "pandas"], f"Dependencias de [project]: {[d.name for d in deps]}"
    assert not deps[1].specifier.contains("3.0"), "pandas>=2.2,<3 no admite la 3.0."
    assert t.calls("loads") or t.calls("load"), "Lee el TOML con tomllib."


def test_comprobar():
    "Compara cada requisito con las versiones instaladas"
    leer, comprobar = t.get("leer_requisitos"), t.get("comprobar", "function")
    reqs = leer(t.get("REQUISITOS"))
    instaladas = {"numpy": "2.2.5", "pandas": "3.0.1", "scikit-learn": "1.7.2", "matplotlib": "3.9.0"}
    informe = comprobar(reqs, instaladas)
    esperado = {
        "numpy": "ok",
        "pandas": f"3.0.1 no cumple {reqs[1].specifier}",
        "scikit-learn": "ok",
        "matplotlib": f"3.9.0 no cumple {reqs[3].specifier}",
        "requests": "falta",
    }
    for nombre, valor in esperado.items():
        assert informe.get(nombre) == valor, f"{nombre}: se esperaba {valor!r}, no {informe.get(nombre)!r}."
    assert set(informe) == set(esperado), f"Claves del informe (nombres normalizados): {sorted(informe)}"
    previa = comprobar(leer("numpy>=2.3"), {"numpy": "2.3.0rc1"})
    assert previa == {"numpy": "2.3.0rc1 no cumple >=2.3"}, f"Una versión previa (rc1) es anterior a la final: {previa}"
    instalada_previa = comprobar(leer("numpy>=2.0"), {"numpy": "2.3.0rc1"})
    assert instalada_previa == {"numpy": "ok"}, f"Si lo instalado es una versión previa que cumple, es ok (prereleases=True): {instalada_previa}"


def test_entorno_real():
    "Sin diccionario, consulta los paquetes instalados de verdad"
    import packaging

    version = t.get("version_instalada", "function")
    assert version("packaging") == packaging.__version__, f"version_instalada('packaging') debería ser {packaging.__version__}."
    assert version("pq-paquete-inexistente") is None, "Si el paquete no está instalado, devuelve None."
    informe = t.get("comprobar")(t.get("leer_requisitos")("packaging>=20\npq-paquete-inexistente==1.0\n"))
    assert informe == {"packaging": "ok", "pq-paquete-inexistente": "falta"}, f"Informe del entorno real: {informe}"


def test_congelar():
    "Escribe la lista como pip freeze"
    texto = t.get("congelar", "function")({"pandas": "2.3.1", "Scikit_Learn": "1.7.0", "numpy": "2.2.5"})
    assert texto == "numpy==2.2.5\npandas==2.3.1\nscikit-learn==1.7.0\n", f"Obtenido:\n{texto}"


def test_ordenar_versiones():
    "Ordena versiones como versiones, no como texto"
    ordenadas = t.get("ordenar_versiones", "function")(["1.10.0", "1.9.2", "2.0", "1.10.0rc1", "1.9.10"])
    assert ordenadas == ["1.9.2", "1.9.10", "1.10.0rc1", "1.10.0", "2.0"], f"Obtenido: {ordenadas}"
`,
    files: { "requirements.txt": REQUISITOS, "pyproject.toml": PYPROJECT },
    hints: [
      "Para quitar el comentario de una línea: `linea.split(\"#\", 1)[0].strip()`; si queda vacía, sáltala.",
      "`tomllib.loads(texto)[\"project\"][\"dependencies\"]` es una lista de cadenas; conviértelas con `Requirement(cadena)`.",
      "`req.specifier.contains(version, prereleases=True)` dice si una versión cumple el requisito, también si es una versión previa como 2.3.0rc1; `metadata.version` lanza `metadata.PackageNotFoundError` si el paquete no existe.",
    ],
    errors: [
      { error: "packaging.requirements.InvalidRequirement: Expected end or semicolon", fix: "La línea todavía tiene el comentario (# …) o espacios: quítalos antes de crear el Requirement." },
      { error: "ModuleNotFoundError: No module named 'sklearn' después de instalarlo", fix: "Lo instalaste en otro entorno. Activa el entorno del proyecto y usa python -m pip, que instala para ese mismo Python." },
      { error: "\"1.10\" queda antes que \"1.9\"", fix: "Estás ordenando texto. Usa sorted(versiones, key=Version)." },
    ],
    quiz: {
      question: "¿Por qué no se sube la carpeta .venv al repositorio del proyecto?",
      options: [
        { text: "Porque se recrea con requirements.txt y depende del sistema y de la carpeta donde se creó" },
        { text: "Porque contiene tus contraseñas" },
        { text: "Porque Git no puede guardar carpetas" },
      ],
      answer: 0,
      explanation: "Un entorno virtual incluye rutas absolutas y binarios de tu sistema: en otro ordenador no sirve. Se comparte la lista de dependencias (requirements.txt o pyproject.toml) y cada persona crea su entorno con ella.",
    },
    review: "Explica para qué sirve un entorno virtual, qué significan ==, >=,<3 y ~=, y por qué '1.10' < '1.9' es True como texto.",
    xp: 85,
    coins: 12,
  },
  {
    id: "w2-git",
    world: "w2",
    zone: "Fuera del navegador",
    title: "El diario del refugio: Git por dentro",
    kind: "lesson",
    difficulty: 4,
    skills: ["git", "control-de-versiones", "hashing"],
    requires: ["w2-entornos"],
    story: "El diario del refugio no se puede falsificar: cada página lleva un sello calculado a partir de su contenido y del sello de la página anterior. Cambiar una coma en una página antigua rompería todos los sellos siguientes. Así guarda Git la historia de tu código.",
    objective: "Entender el flujo de trabajo de Git (área de trabajo, preparación y repositorio; ramas y remotos) y cómo identifica cada versión: calcular los mismos identificadores que calcula git para archivos, carpetas y commits, y detectar qué archivos cambiaron.",
    before: ["Diccionarios", "Bytes y codificación de texto", "Funciones"],
    intuition: [
      "**Git** guarda la historia de un proyecto como una serie de **commits**: fotografías completas de los archivos, cada una con un mensaje, un autor, una fecha y un enlace al commit anterior (su *padre*).",
      "",
      "Trabajas en tres sitios: la **carpeta de trabajo** (tus archivos), el **área de preparación** (lo que entrará en el próximo commit) y el **repositorio** (la historia, en la carpeta oculta `.git`).",
      "",
      "```bash",
      "git config --global user.name \"Tu nombre\"     # una sola vez",
      "git config --global user.email \"tu@correo.example\"",
      "git init                      # empieza un repositorio en la carpeta actual",
      "git status                    # qué archivos son nuevos o cambiaron",
      "git add analisis.py           # prepara el archivo",
      "git commit -m \"Calcula la media\"",
      "git log --oneline             # la historia",
      "git diff                      # qué líneas cambiaron y aún no están preparadas",
      "git switch -c limpieza        # crea una rama y pasa a ella",
      "git remote add origin https://github.com/usuario/proyecto.git",
      "git push -u origin main       # sube la rama main a GitHub",
      "```",
      "",
      "Un archivo `.gitignore` lista lo que **nunca** debe entrar al repositorio: `.venv/`, `__pycache__/`, datos privados y, sobre todo, archivos con credenciales como `.env`. Lo que se sube a GitHub queda en la historia aunque después lo borres.",
      "",
      "**Por dentro**, Git guarda objetos y los nombra con el **SHA-1 de su contenido** (por defecto; los repositorios nuevos pueden elegir SHA-256):",
      "",
      "- un **blob** es el contenido de un archivo;",
      "- un **árbol** (*tree*) es una carpeta: la lista ordenada de nombres con el identificador de cada blob;",
      "- un **commit** apunta a un árbol, a su padre y lleva autor, fecha y mensaje.",
      "",
      "Mismo contenido, mismo identificador; un solo byte distinto, identificador distinto. Y como cada commit incluye el identificador de su padre, cambiar el pasado cambia todos los identificadores posteriores.",
    ],
    formal: [
      "identificador = SHA-1( tipo + \" \" + tamaño en bytes + \"\\0\" + contenido )",
      "",
      "Entrada de un árbol para un archivo normal: `100644 nombre\\0` seguido de los 20 bytes del identificador del blob. Las entradas van ordenadas por nombre (comparando bytes: las mayúsculas van antes que las minúsculas).",
      "",
      "Contenido de un commit (cada línea termina en `\\n`): `tree <árbol>`, `parent <padre>` (si lo hay), `author <autor> <instante> +0000`, `committer <autor> <instante> +0000`, una línea vacía y el mensaje.",
    ],
    example: {
      code: py`import difflib
antes = ["print('Hola, mundo')\n"]
despues = ["print('Hola, refugio')\n", "print('Adiós')\n"]
for linea in difflib.unified_diff(antes, despues, "a/main.py", "b/main.py"):
    print(linea, end="")`,
      lines: [
        "difflib compara secuencias de líneas.",
        "La versión confirmada de main.py.",
        "La versión de la carpeta de trabajo: una línea cambia y otra es nueva.",
        "unified_diff produce el mismo formato que git diff: --- y +++ nombran los archivos y @@ -1 +1,2 @@ indica qué líneas cambian.",
        "Las líneas con - desaparecen y las que llevan + aparecen.",
      ],
    },
    challenge: [
      "Los contenidos son `bytes` (un texto se convierte con `.encode(\"utf-8\")`). Las pruebas comparan tus resultados con los que calcula git de verdad.",
      "",
      "1. `hash_objeto(tipo, contenido)`: el SHA-1 en hexadecimal de la cabecera `\"<tipo> <tamaño>\\0\"` (codificada) seguida del contenido. El tamaño es el número de **bytes**.",
      "2. `hash_blob(contenido)`: el identificador del objeto `blob`.",
      "3. `hash_arbol(archivos)`: `archivos` es un diccionario nombre → contenido de una carpeta sin subcarpetas. Para cada nombre, en orden de bytes: `b\"100644 \"`, el nombre codificado, `b\"\\0\"` y los 20 bytes del identificador del blob (`bytes.fromhex`). Devuelve el identificador del objeto `tree` formado por todas las entradas.",
      "4. `hash_commit(arbol, padre, autor, instante, mensaje)`: el identificador del objeto `commit` con el formato de arriba; `padre` es `None` en el primer commit; la zona horaria es siempre `+0000`.",
      "5. `estado(trabajo, confirmado)`: compara dos diccionarios nombre → contenido (la carpeta de trabajo y el último commit) por el identificador de cada archivo, como `git status`. Devuelve `{\"nuevos\": [...], \"modificados\": [...], \"eliminados\": [...]}` con listas ordenadas.",
    ],
    starter: py`import hashlib


def hash_objeto(tipo, contenido):
    return ""


def hash_blob(contenido):
    return ""


def hash_arbol(archivos):
    return ""


def hash_commit(arbol, padre, autor, instante, mensaje):
    return ""


def estado(trabajo, confirmado):
    return {"nuevos": [], "modificados": [], "eliminados": []}
`,
    solution: py`import hashlib


def hash_objeto(tipo, contenido):
    cabecera = f"{tipo} {len(contenido)}\0".encode()
    return hashlib.sha1(cabecera + contenido).hexdigest()


def hash_blob(contenido):
    return hash_objeto("blob", contenido)


def hash_arbol(archivos):
    cuerpo = b""
    for nombre in sorted(archivos, key=lambda n: n.encode()):
        cuerpo += b"100644 " + nombre.encode() + b"\0" + bytes.fromhex(hash_blob(archivos[nombre]))
    return hash_objeto("tree", cuerpo)


def hash_commit(arbol, padre, autor, instante, mensaje):
    lineas = [f"tree {arbol}"]
    if padre:
        lineas.append(f"parent {padre}")
    lineas.append(f"author {autor} {instante} +0000")
    lineas.append(f"committer {autor} {instante} +0000")
    texto = "\n".join(lineas) + "\n\n" + mensaje + "\n"
    return hash_objeto("commit", texto.encode())


def estado(trabajo, confirmado):
    return {
        "nuevos": sorted(n for n in trabajo if n not in confirmado),
        "modificados": sorted(n for n in trabajo if n in confirmado and hash_blob(trabajo[n]) != hash_blob(confirmado[n])),
        "eliminados": sorted(n for n in confirmado if n not in trabajo),
    }


v1 = {"main.py": b"print('Hola')\n", "LEEME.md": b"Diario\n"}
arbol = hash_arbol(v1)
primero = hash_commit(arbol, None, "Ada Lovelace <ada@refugio.example>", 1700000000, "Primer diario")
print("árbol ", arbol)
print("commit", primero)
print(estado({"main.py": b"print('Hola, refugio')\n", "datos.csv": b"1,2\n"}, v1))
`,
    tests: py`
AUTORA = "Ada Lovelace <ada@refugio.example>"
V1 = {
    "main.py": 'print("Hola, mundo")\n'.encode(),
    "LEEME.md": "Diario del refugio\n".encode(),
    "datos.csv": "año,lluvia\n2024,812\n".encode(),
}
V2 = dict(V1, **{"main.py": 'print("Hola, refugio")\n'.encode()})


def test_blob():
    "Los blobs tienen el mismo identificador que en git"
    h = t.get("hash_blob", "function")
    assert h(b"") == "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391", f"El archivo vacío es e69de29… en git, no {h(b'')!r}."
    assert h(b"hola\n") == "5c1b14949828006ed75a3e8858957f86a2f7e2eb", f"'hola\\n' es 5c1b149… en git, no {h(b'hola' + bytes([10]))!r}."
    assert h(V1["main.py"]) == "b1d94eb56342c46a3b1867a7a56a1a803573abf3"
    assert h(V1["datos.csv"]) == "ab307b1bd6379c3377d7b9045167f03bfd79a05f", "datos.csv tiene una ñ: el tamaño de la cabecera se mide en bytes, no en caracteres."


def test_objeto():
    "hash_objeto sirve para cualquier tipo"
    h = t.get("hash_objeto", "function")
    assert h("blob", b"hola\n") == "5c1b14949828006ed75a3e8858957f86a2f7e2eb"
    assert h("tree", b"") == "4b825dc642cb6eb9a060e54bf8d69288fbee4904", "El árbol vacío de git es 4b825dc…"


def test_arbol():
    "El árbol de una carpeta coincide con git write-tree"
    h = t.get("hash_arbol", "function")
    assert h(V1) == "9942a3eaa9c7e7b61604b62354d97ed008f467f1", f"Árbol de la versión 1: {h(V1)}"
    assert h(dict(reversed(list(V1.items())))) == h(V1), "El orden del diccionario no importa: ordena las entradas por nombre."
    assert h(V2) == "7238e8dd46a6be311afc3cab95023e4c083b1dba", "Al cambiar main.py cambia el árbol."


def test_commits():
    "Los commits encadenados coinciden con git commit-tree"
    commit = t.get("hash_commit", "function")
    primero = commit("9942a3eaa9c7e7b61604b62354d97ed008f467f1", None, AUTORA, 1700000000, "Primer diario")
    assert primero == "c18facdda4ded8e023287aec2b5dd8ad9eca6642", f"Primer commit: {primero}"
    segundo = commit("7238e8dd46a6be311afc3cab95023e4c083b1dba", primero, AUTORA, 1700003600, "Saludo al refugio")
    assert segundo == "07676c12d26e06a96d2c4a3e982d63eb9484cdd2", f"Segundo commit (con padre): {segundo}"
    otro = commit("9942a3eaa9c7e7b61604b62354d97ed008f467f1", None, AUTORA, 1700000000, "Primer diario.")
    assert otro != primero, "Cambiar el mensaje cambia el identificador."


def test_estado():
    "Detecta archivos nuevos, modificados y eliminados"
    estado = t.get("estado", "function")
    trabajo = {"main.py": V2["main.py"], "LEEME.md": V1["LEEME.md"], "notas.txt": b"x\n", "a.py": b"\n"}
    assert estado(trabajo, V1) == {"nuevos": ["a.py", "notas.txt"], "modificados": ["main.py"], "eliminados": ["datos.csv"]}
    assert estado(V1, dict(V1)) == {"nuevos": [], "modificados": [], "eliminados": []}, "Sin cambios, las tres listas están vacías."
`,
    hints: [
      "La cabecera es `f\"{tipo} {len(contenido)}\\0\".encode()` y el identificador, `hashlib.sha1(cabecera + contenido).hexdigest()`.",
      "En el árbol, recorre `sorted(archivos, key=lambda n: n.encode())` y ve sumando `b\"100644 \" + nombre.encode() + b\"\\0\" + bytes.fromhex(hash_blob(contenido))`.",
      "El texto del commit es `\"\\n\".join(lineas) + \"\\n\\n\" + mensaje + \"\\n\"`; añade la línea `parent` solo si hay padre.",
    ],
    errors: [
      { error: "El identificador no coincide en archivos con tildes o ñ", fix: "len() de un texto cuenta caracteres; git cuenta bytes. Calcula el tamaño sobre el contenido ya codificado." },
      { error: "TypeError: can't concat str to bytes", fix: "Codifica la cabecera con .encode() antes de unirla al contenido, que ya es bytes." },
      { error: "fatal: not a git repository", fix: "Estás fuera de la carpeta del repositorio: entra en ella con cd o crea uno con git init." },
    ],
    quiz: {
      question: "Cambias una letra de un archivo y haces commit. ¿Qué identificadores nuevos aparecen?",
      options: [
        { text: "El del blob de ese archivo, el del árbol que lo contiene y el del commit" },
        { text: "Solo el del archivo cambiado" },
        { text: "Ninguno: Git solo guarda la diferencia" },
      ],
      answer: 0,
      explanation: "El blob cambia porque cambia su contenido; el árbol, porque incluye el identificador del blob; el commit, porque incluye el del árbol. Los demás archivos conservan sus blobs: Git no los duplica.",
    },
    review: "Explica qué guardan un blob, un árbol y un commit, por qué no se puede cambiar un commit antiguo sin que se note y qué debe ir en .gitignore.",
    xp: 100,
    coins: 14,
  },
];
