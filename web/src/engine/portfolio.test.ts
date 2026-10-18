import { describe, expect, it } from "vitest";
import { portfolioFilename, portfolioScript, slug } from "./portfolio";

const piece = {
  title: "El servicio de la torre",
  kind: "Proyecto progresivo",
  world: "Mundo 8",
  skills: ["pydantic", "despliegue"],
  date: "2026-10-14",
  packages: ["numpy", "scikit-learn"],
  files: ["clientes.csv"],
};

describe("portfolio download", () => {
  it("makes ASCII file names", () => {
    expect(slug("Análisis de reseñas: ¡ya!")).toBe("analisis-de-resenas-ya");
    expect(slug("¿?")).toBe("proyecto");
    expect(portfolioFilename(piece)).toBe("el_servicio_de_la_torre.py");
  });

  it("prefixes the code with a header made only of comments", () => {
    const code = 'print("hola")';
    const out = portfolioScript({ ...piece, notes: 'Uso """comillas"""\n\nsegunda línea' }, code);
    const [header, body] = out.split("\n#\n# Escrito en Python Quest.\n\n");
    expect(body).toBe(`${code}\n`);
    for (const line of header!.split("\n")) expect(line.startsWith("#")).toBe(true);
    expect(header).toContain("# Paquetes: numpy, scikit-learn");
    expect(header).toContain("clientes.csv");
    expect(header).toContain('# Uso """comillas"""\n#\n# segunda línea');
  });

  it("leaves out empty sections", () => {
    const out = portfolioScript({ ...piece, packages: [], files: [], notes: "  " }, "x = 1\n");
    expect(out).not.toContain("Paquetes");
    expect(out).not.toContain("Archivos de datos");
    expect(out).not.toContain("Notas");
    expect(out.endsWith("\n\nx = 1\n")).toBe(true);
  });
});
