// Writes the downloadable project (.zip) of every portfolio piece, built from the reference
// solutions, so tests/test_export.py can unzip each one and run it with CPython like a learner would.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MISSIONS } from "../src/content/full";
import { worldById } from "../src/content/worlds";
import { pieceLabels, portfolioFilename, projectFiles, slug } from "../src/engine/portfolio";
import { zip } from "../src/engine/zip";

const out = process.argv[2];
if (!out) throw new Error("Uso: tsx scripts/export-projects.ts <carpeta de salida>");
mkdirSync(out, { recursive: true });

const index = [];
for (const m of MISSIONS) {
  const project = m.kind === "project" && (!m.series || m.series.stage === m.series.of);
  if (!project && !m.advanced) continue;
  const { kind, title } = pieceLabels(m);
  const files = m.files ?? {};
  const piece = { title, kind, world: worldById[m.world].short, skills: m.skills, date: "2026-01-01", packages: m.packages, files: Object.keys(files) };
  const code = project ? m.solution : m.advanced!.solution;
  const entries = projectFiles(piece, code, files).map((f) => ({ name: f.name, data: f.content }));
  const file = `${m.id}.zip`;
  writeFileSync(join(out, file), zip(entries, new Date(2026, 0, 1)));
  index.push({ id: m.id, zip: file, folder: slug(title), script: portfolioFilename(piece), stdin: (project ? m.stdin : m.advanced!.stdin) ?? [] });
}
writeFileSync(join(out, "index.json"), JSON.stringify(index, null, 1));
console.log(`${index.length} proyectos exportados en ${out}`);
