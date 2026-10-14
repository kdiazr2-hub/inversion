/** Builds the downloadable files of a portfolio piece: the learner's script and its data files. */

export interface PortfolioPiece {
  title: string;
  kind: string;
  world: string;
  skills: string[];
  date: string;
  notes?: string;
  packages?: string[];
  files?: Record<string, string>;
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
  const files = Object.keys(piece.files ?? {});
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
