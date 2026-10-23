/** Builds the downloadable files of a portfolio piece: the learner's script and its data files. */
import { DESKTOP_PACKAGES, DESKTOP_PYTHON, DESKTOP_PYTHON_RANGE, desktopPackages, requirementsFor } from "./desktop";

export interface PortfolioPiece {
  title: string;
  kind: string;
  world: string;
  skills: string[];
  date: string;
  notes?: string;
  packages?: string[];
  /** Names of the data files the script reads. */
  files?: string[];
}

/** Kind label and title of the portfolio piece a finished project or advanced challenge produces. */
export function pieceLabels(m: { kind: "lesson" | "project"; title: string; series?: { title: string; of: number }; advanced?: { title: string } }): { kind: string; title: string } {
  if (m.series) return { kind: `Proyecto progresivo · ${m.series.of} etapas`, title: m.series.title };
  if (m.kind === "project") return { kind: "Proyecto", title: m.title };
  return { kind: "Reto avanzado", title: m.advanced?.title ?? m.title };
}

/** File-system friendly name: lower case ASCII, words joined by hyphens. */
export function slug(text: string): string {
  const s = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "proyecto";
}

const comment = (line: string) => (line ? `# ${line}` : "#");

/**
 * The learner's code preceded by a header made only of comments, so the file runs exactly as it
 * did in the game (no docstring is added that could change the module's ``__doc__``).
 */
export function portfolioScript(piece: PortfolioPiece, code: string): string {
  const header = [
    piece.title,
    `${piece.kind} · ${piece.world} · ${piece.date}`,
    `Habilidades: ${piece.skills.join(", ")}`,
  ];
  if (piece.packages?.length) header.push(`Paquetes: ${piece.packages.join(", ")}`);
  const files = piece.files ?? [];
  if (files.length) header.push(`Archivos de datos (en la misma carpeta que este script): ${files.join(", ")}`);
  const notes = (piece.notes ?? "").trim();
  if (notes) header.push("", "Notas:", ...notes.split(/\r?\n/));
  header.push("", "Escrito en Python Quest.");
  const body = code.endsWith("\n") ? code : `${code}\n`;
  return `${header.map(comment).join("\n")}\n\n${body}`;
}

/** Name of the downloaded script. */
export function portfolioFilename(piece: Pick<PortfolioPiece, "title">): string {
  return `${slug(piece.title).replace(/-/g, "_")}.py`;
}

/** One file of a downloaded project, with its path inside the project folder. */
export interface ProjectFile {
  name: string;
  content: string;
}

const GITIGNORE = [".venv/", "__pycache__/", "*.pyc", ".env", ""].join("\n");

/** README of a downloaded project: what it contains and how to run it on a computer. */
export function projectReadme(piece: PortfolioPiece, script: string, code: string): string {
  const mods = desktopPackages(code);
  const files = piece.files ?? [];
  const notes = (piece.notes ?? "").trim();
  const md: string[] = [`# ${piece.title}`, "", `${piece.kind} · ${piece.world} · ${piece.date}. Escrito en Python Quest.`, "", `Habilidades: ${piece.skills.join(", ")}.`];
  if (notes) md.push("", "## Descripción", "", notes);
  md.push("", "## Archivos", "", `- \`${script}\`: el programa.`);
  for (const f of files) md.push(`- \`${f}\`: datos que lee el programa.`);
  if (mods.length) md.push("- `requirements.txt`: los paquetes que necesita, con las versiones exactas.");
  md.push("- `.gitignore`: lo que Git no debe guardar (el entorno virtual, la caché de Python y los archivos `.env`).");

  const install = mods.length ? ["python -m pip install -r requirements.txt"] : [];
  md.push(
    "",
    "## Cómo ejecutarlo en tu ordenador",
    "",
    mods.length
      ? `Necesitas Python ${DESKTOP_PYTHON}: las versiones de los paquetes se han probado con ella (también hay paquetes para Python ${DESKTOP_PYTHON_RANGE}, pero no para la 3.14). Descomprime esta carpeta, abre una terminal dentro de ella y escribe:`
      : `Necesitas Python 3 (se ha probado con Python ${DESKTOP_PYTHON}). Descomprime esta carpeta, abre una terminal dentro de ella y escribe:`,
    "",
    "### Linux y macOS",
    "",
    "```bash",
    "python3 -m venv .venv",
    "source .venv/bin/activate",
    ...install,
    `python ${script}`,
    "```",
    "",
    "### Windows (PowerShell)",
    "",
    "```powershell",
    `py -${DESKTOP_PYTHON} -m venv .venv`,
    ".venv\\Scripts\\Activate.ps1",
    ...install,
    `python ${script}`,
    "```",
    "",
    "Si PowerShell no deja ejecutar `Activate.ps1`, ejecuta una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.",
  );

  const notesDesktop: string[] = [];
  for (const m of mods) {
    const p = DESKTOP_PACKAGES[m]!;
    if (p.game) notesDesktop.push(`- ${p.dist}: en el juego se usa la ${p.game.version}; aquí se fija la ${p.version} porque ${p.game.reason}.`);
  }
  if (mods.includes("matplotlib")) notesDesktop.push("- Los gráficos se abren en una ventana al llegar a `plt.show()`; el programa sigue cuando la cierras.");
  if (/\binput\s*\(/.test(code)) notesDesktop.push("- El programa te pide los datos con `input()`: escríbelos en la terminal y pulsa Intro.");
  if (notesDesktop.length) md.push("", "## Diferencias con el navegador", "", ...notesDesktop);

  md.push(
    "",
    "## Guardarlo con Git",
    "",
    "```bash",
    "git init",
    "git add .",
    `git commit -m "Primera versión: ${piece.title.replace(/"/g, "'")}"`,
    "```",
    "",
  );
  return md.join("\n");
}

/** Every file of a downloaded project, inside a folder named after it. */
export function projectFiles(piece: PortfolioPiece, code: string, data: Record<string, string>): ProjectFile[] {
  const folder = slug(piece.title);
  const script = portfolioFilename(piece);
  const requirements = requirementsFor(code);
  const out: ProjectFile[] = [
    { name: script, content: portfolioScript(piece, code) },
    ...(piece.files ?? []).map((f) => {
      const content = data[f];
      if (content === undefined) throw new Error(`No se encontró el archivo de datos ${f}.`);
      return { name: f, content };
    }),
  ];
  if (requirements) out.push({ name: "requirements.txt", content: requirements });
  out.push({ name: "README.md", content: projectReadme(piece, script, code) }, { name: ".gitignore", content: GITIGNORE });
  return out.map((f) => ({ name: `${folder}/${f.name}`, content: f.content }));
}

/** Name of the downloaded project archive. */
export function projectZipName(piece: Pick<PortfolioPiece, "title">): string {
  return `${slug(piece.title)}.zip`;
}
