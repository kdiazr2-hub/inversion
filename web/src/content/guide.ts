// "Programar en tu ordenador": steps to keep programming outside the browser, per operating system.
import { DESKTOP_PYTHON, DESKTOP_PYTHON_RANGE } from "../engine/desktop";
import type { Text } from "./types";

export type OS = "windows" | "macos" | "linux";

export const OS_NAMES: Record<OS, string> = { windows: "Windows", macos: "macOS", linux: "Linux" };

export interface GuideStep {
  id: string;
  title: string;
  /** Text for every system, shown before the system-specific part. */
  intro?: Text;
  os?: Record<OS, Text>;
  outro?: Text;
}

const PY = DESKTOP_PYTHON;

export const GUIDE: GuideStep[] = [
  {
    id: "python",
    title: "1. Instala Python",
    intro: [
      `Los proyectos del juego fijan versiones de paquetes probadas con **Python ${PY}**. También hay paquetes para Python ${DESKTOP_PYTHON_RANGE}, pero todavía **no para la 3.14**: si instalas una versión más nueva, algunos proyectos no podrán instalar sus paquetes.`,
    ],
    os: {
      windows: [
        "Abre **PowerShell** (búscalo en el menú Inicio) y escribe:",
        "",
        "```powershell",
        `winget install Python.Python.${PY}`,
        "```",
        "",
        `O descarga el instalador de Python ${PY} desde python.org/downloads/windows y, en la primera pantalla, marca **Add python.exe to PATH**.`,
        "",
        "Cierra y vuelve a abrir PowerShell y comprueba la instalación:",
        "",
        "```powershell",
        `py -${PY} --version`,
        "```",
      ],
      macos: [
        `Descarga el instalador de Python ${PY} para macOS desde python.org/downloads/macos, o, si usas Homebrew:`,
        "",
        "```bash",
        `brew install python@${PY}`,
        "```",
        "",
        "Comprueba la instalación en la Terminal:",
        "",
        "```bash",
        `python${PY} --version`,
        "```",
        "",
        "En un Mac con chip de Apple (M1 o posterior), algunos paquetes científicos fijados (scipy) necesitan macOS 12 o posterior.",
      ],
      linux: [
        "Casi todas las distribuciones traen Python. Comprueba la versión:",
        "",
        "```bash",
        "python3 --version",
        "```",
        "",
        `Si es una versión entre la ${DESKTOP_PYTHON_RANGE.replace(" a ", " y la ")}, te sirve. En Debian y Ubuntu instala además el módulo de entornos virtuales:`,
        "",
        "```bash",
        "sudo apt install python3-venv python3-pip",
        "```",
        "",
        `Si tu sistema solo tiene la 3.14 o posterior, instala la ${PY} desde los paquetes de tu distribución (por ejemplo, \`sudo dnf install python${PY}\` en Fedora).`,
      ],
    },
  },
  {
    id: "editor",
    title: "2. Elige un editor",
    intro: [
      "Cualquier editor de texto sirve, pero uno pensado para programar colorea el código, avisa de errores y abre una terminal integrada:",
      "",
      "- **Visual Studio Code** (code.visualstudio.com) con la extensión **Python** de Microsoft: el más usado. Abre la carpeta del proyecto con *Archivo → Abrir carpeta* y la terminal con *Terminal → Nueva terminal*.",
      "- **Thonny** (thonny.org): muy sencillo, pensado para empezar; trae su propio Python.",
      "- **PyCharm Community** (jetbrains.com/pycharm): completo, para proyectos grandes.",
    ],
  },
  {
    id: "terminal",
    title: "3. Abre una terminal",
    os: {
      windows: "Abre **PowerShell** o **Terminal** desde el menú Inicio. Para abrirla directamente en una carpeta, haz clic derecho dentro de ella en el Explorador de archivos y elige *Abrir en Terminal*. Las órdenes `cd`, `ls`, `mkdir`, `cat`, `mv` y `rm` funcionan en PowerShell.",
      macos: "Abre la app **Terminal** (en Aplicaciones → Utilidades, o busca «Terminal» con Cmd + Espacio). Usa `cd` para entrar en la carpeta de tu proyecto; puedes arrastrar la carpeta a la ventana para escribir su ruta.",
      linux: "Abre la terminal de tu escritorio (en GNOME y Ubuntu, Ctrl + Alt + T). Usa `cd` para entrar en la carpeta de tu proyecto.",
    },
    outro: "La misión «La consola del refugio» (Mundo 2) explica las rutas, las órdenes básicas y `sys.argv`.",
  },
  {
    id: "venv",
    title: "4. Crea el proyecto y su entorno virtual",
    intro: "Cada proyecto, en su carpeta y con su propio entorno virtual (`.venv`):",
    os: {
      windows: [
        "```powershell",
        "mkdir mi-proyecto",
        "cd mi-proyecto",
        `py -${PY} -m venv .venv`,
        ".venv\\Scripts\\Activate.ps1",
        "python -m pip install pandas matplotlib",
        "python -m pip freeze > requirements.txt",
        "```",
        "",
        "Si PowerShell no deja ejecutar `Activate.ps1`, ejecuta una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.",
      ],
      macos: [
        "```bash",
        "mkdir mi-proyecto",
        "cd mi-proyecto",
        `python${PY} -m venv .venv`,
        "source .venv/bin/activate",
        "python -m pip install pandas matplotlib",
        "python -m pip freeze > requirements.txt",
        "```",
      ],
      linux: [
        "```bash",
        "mkdir mi-proyecto",
        "cd mi-proyecto",
        "python3 -m venv .venv",
        "source .venv/bin/activate",
        "python -m pip install pandas matplotlib",
        "python -m pip freeze > requirements.txt",
        "```",
      ],
    },
    outro: [
      "Con el entorno activado, el nombre `(.venv)` aparece al principio de la línea y `python` es el del proyecto. `deactivate` lo desactiva. En otro ordenador, el mismo entorno se recrea con `python -m pip install -r requirements.txt`.",
      "",
      "La misión «El almacén de herramientas» (Mundo 2) explica los especificadores de versión y cómo comprobar lo instalado.",
    ],
  },
  {
    id: "ejecutar",
    title: "5. Ejecuta y prueba tu código",
    intro: [
      "Guarda tu programa como `analisis.py` dentro de la carpeta y, con el entorno activado:",
      "",
      "```bash",
      "python analisis.py",
      "python -m pip install pytest",
      "python -m pytest",
      "```",
      "",
      "`pytest` busca los archivos `test_*.py` y ejecuta sus funciones `test_…`, igual que las comprobaciones del juego. Los gráficos de matplotlib se abren en una ventana al llegar a `plt.show()`.",
    ],
  },
  {
    id: "git",
    title: "6. Guarda la historia con Git y súbela a GitHub",
    os: {
      windows: ["```powershell", "winget install --id Git.Git -e", "```", "", "O descárgalo desde git-scm.com. Incluye Git Credential Manager, que abre el navegador para iniciar sesión en GitHub."],
      macos: ["```bash", "xcode-select --install", "```", "", "instala Git con las herramientas de desarrollo de Apple; con Homebrew también vale `brew install git`."],
      linux: ["```bash", "sudo apt install git", "```", "", "(o `sudo dnf install git` en Fedora)."],
    },
    outro: [
      "Una vez por ordenador, dile a Git quién eres; después, en la carpeta del proyecto:",
      "",
      "```bash",
      'git config --global user.name "Tu nombre"',
      'git config --global user.email "tu@correo.example"',
      "git init",
      "git add .",
      'git commit -m "Primera versión"',
      "```",
      "",
      "Para subirlo, crea un repositorio vacío en github.com y sigue las órdenes que te muestra (`git remote add origin …` y `git push -u origin main`). GitHub no acepta tu contraseña en `git push`: usa el inicio de sesión del navegador, un token de acceso personal o una clave SSH.",
      "",
      "Antes del primer commit, crea un `.gitignore` con `.venv/`, `__pycache__/` y `.env`. **Nunca subas contraseñas ni claves**: lo que llega a GitHub queda en la historia aunque después lo borres.",
      "",
      "La misión «El diario del refugio» (Mundo 2) explica cómo identifica Git cada versión.",
    ],
  },
  {
    id: "proyectos",
    title: "7. Llévate tus proyectos del juego",
    intro: [
      "En **Portafolio**, cada proyecto terminado tiene el botón **Descargar proyecto (.zip)**. El archivo trae tu código, sus datos, un `requirements.txt` con las versiones exactas, un `.gitignore` y un `README.md` con las órdenes para ejecutarlo. Descomprímelo, abre una terminal en su carpeta y sigue el README.",
      "",
      "Las pruebas automáticas del juego descargan así cada proyecto (con su solución de referencia), lo descomprimen y lo ejecutan con Python normal, con las mismas versiones que fija su `requirements.txt`.",
    ],
  },
];
