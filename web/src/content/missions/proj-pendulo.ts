import { penduloCsv } from "../datasets";
import { py, type Mission, type ProjectSpec } from "../types";

// Proyecto progresivo del Mundo 9: una aplicación científica que integra estadística y
// visualización. Mide la gravedad con un péndulo: incertidumbres de tipo A y B, ajuste por mínimos
// cuadrados ponderados con χ², propagación analítica y por Monte Carlo, un error sistemático real
// (la amplitud) y, al final, una aplicación con configuración, línea de órdenes y exportación.

const SERIES = { id: "aplicacion-cientifica", title: "Proyecto progresivo: el laboratorio del péndulo", of: 4 };

const FILES = { "pendulo.csv": penduloCsv() };

const SPEC: ProjectSpec = {
  requirements: [
    "Expresar cada medida con su incertidumbre típica, combinando la estadística (tipo A) y la del instrumento (tipo B).",
    "Ajustar una ley física por mínimos cuadrados ponderados y juzgar el ajuste con χ².",
    "Propagar incertidumbres de forma analítica y por Monte Carlo, y comprobar que coinciden.",
    "Detectar un error sistemático, corregirlo con un modelo físico y comprobar la compatibilidad de los resultados.",
    "Empaquetar el análisis en una aplicación configurable por línea de órdenes que exporta datos, informe y figura.",
  ],
  dataset: "pendulo.csv: tiempos de 10 oscilaciones medidos con cronómetro (5 repeticiones) para 7 longitudes en dos series: A con amplitud de 5° y B con 35°. Datos sintéticos generados con g = 9,80 m/s², un error de reacción humano de 0,08 s y la dependencia real del periodo con la amplitud.",
  stages: ["Medidas e incertidumbres", "Ajuste ponderado de T² frente a L", "Propagación y error sistemático", "La aplicación: configuración, línea de órdenes y exportación"],
  criteria: [
    "Las pruebas automáticas de cada etapa pasan.",
    "Cada resultado se presenta como valor ± incertidumbre con las cifras adecuadas.",
    "El ajuste propio coincide con scipy.optimize.curve_fit con absolute_sigma=True.",
    "La aplicación funciona desde la línea de órdenes, falla con un mensaje claro y deja archivos reproducibles.",
  ],
  extensions: [
    "Incluir la incertidumbre de la longitud en el ajuste con el método de la varianza efectiva.",
    "Estimar la amplitud a partir de los datos (ajustando el factor de corrección) en lugar de darla.",
    "Escalar las incertidumbres por √(χ²/gl) cuando χ²/gl > 1 y comparar resultados.",
  ],
  portfolio: "Aplicación científica en Python para medir g con un péndulo: incertidumbres de tipo A y B, mínimos cuadrados ponderados con χ² verificados contra SciPy, propagación analítica y por Monte Carlo, corrección de un error sistemático de amplitud contrastada con la integral elíptica exacta, y una herramienta de línea de órdenes que exporta JSON, un informe en Markdown y la figura con barras de error y residuos.",
};

const S1 = py`import math

import numpy as np
import pandas as pd

RESOLUCION_CRONOMETRO = 0.01  # s
RESOLUCION_CINTA = 0.001  # m
OSCILACIONES = 10


def incertidumbre_resolucion(resolucion):
    """Tipo B: distribución rectangular de anchura igual a la resolución."""
    return resolucion / math.sqrt(12)


def resumir_periodos(df):
    """Periodo medio por serie y longitud con su incertidumbre típica combinada (tipos A y B)."""
    filas = []
    for (serie, longitud), g in df.groupby(["serie", "longitud_m"]):
        periodos = g["t10_s"] / OSCILACIONES
        u_a = periodos.std(ddof=1) / math.sqrt(len(periodos))
        u_b = incertidumbre_resolucion(RESOLUCION_CRONOMETRO) / OSCILACIONES
        filas.append({"serie": serie, "longitud_m": longitud, "amplitud_grados": g["amplitud_grados"].iloc[0],
                      "T": periodos.mean(), "u_T": math.hypot(u_a, u_b), "u_A": u_a, "u_B": u_b,
                      "u_L": incertidumbre_resolucion(RESOLUCION_CINTA), "n": len(periodos)})
    return pd.DataFrame(filas)


def redondear_medida(valor, u, cifras=2):
    """«valor ± u» con la incertidumbre a «cifras» cifras significativas y el valor al mismo decimal."""
    if u <= 0:
        raise ValueError("la incertidumbre debe ser positiva")
    decimales = cifras - 1 - math.floor(math.log10(u))
    u_red = round(u, decimales)
    if u_red >= 10 ** (cifras - decimales):  # 0.0995 → 0.10: una cifra de más
        decimales -= 1
        u_red = round(u, decimales)
    formato = f"{{:.{max(decimales, 0)}f}}"
    return f"{formato.format(round(valor, decimales))} ± {formato.format(u_red)}"


medidas = pd.read_csv("pendulo.csv")
periodos = resumir_periodos(medidas)
ejemplo = redondear_medida(periodos["T"].iloc[0], periodos["u_T"].iloc[0])
print(periodos.round(4).to_string(index=False))`;

const S2 = py`from scipy import stats


def ajuste_ponderado(x, y, u_y):
    """Recta y = a + b·x por mínimos cuadrados ponderados (pesos 1/u²) con incertidumbres y χ²."""
    x, y, w = np.asarray(x, float), np.asarray(y, float), 1 / np.asarray(u_y, float) ** 2
    S, Sx, Sy, Sxx, Sxy = w.sum(), (w * x).sum(), (w * y).sum(), (w * x * x).sum(), (w * x * y).sum()
    D = S * Sxx - Sx**2
    a, b = (Sxx * Sy - Sx * Sxy) / D, (S * Sxy - Sx * Sy) / D
    chi2 = float((w * (y - a - b * x) ** 2).sum())
    return {"a": a, "b": b, "u_a": math.sqrt(Sxx / D), "u_b": math.sqrt(S / D), "chi2": chi2, "gl": len(x) - 2,
            "residuos_normalizados": (y - a - b * x) * np.sqrt(w)}


def g_desde_pendiente(b, u_b):
    g = 4 * math.pi**2 / b
    return g, g * u_b / b


def medir_g(tabla):
    T2 = tabla["T"] ** 2
    u_T2 = 2 * tabla["T"] * tabla["u_T"]
    ajuste = ajuste_ponderado(tabla["longitud_m"], T2, u_T2)
    g, u_g = g_desde_pendiente(ajuste["b"], ajuste["u_b"])
    return {**ajuste, "g": g, "u_g": u_g, "chi2_reducido": ajuste["chi2"] / ajuste["gl"], "p_chi2": float(stats.chi2.sf(ajuste["chi2"], ajuste["gl"]))}


serie_a = periodos[periodos["serie"] == "A"].reset_index(drop=True)
resultado_a = medir_g(serie_a)
print("g =", redondear_medida(resultado_a["g"], resultado_a["u_g"]), "m/s²; χ²/gl =", round(resultado_a["chi2_reducido"], 2))`;

const S3 = py`def g_de_una_medida(L, T):
    return 4 * math.pi**2 * L / T**2


def propagacion_analitica(L, u_L, T, u_T):
    """u_g/g = √((u_L/L)² + (2·u_T/T)²): derivadas parciales de g = 4π²L/T²."""
    g = g_de_una_medida(L, T)
    return g, g * math.hypot(u_L / L, 2 * u_T / T)


def propagacion_monte_carlo(L, u_L, T, u_T, n=200_000, semilla=0):
    rng = np.random.default_rng(semilla)
    muestras = g_de_una_medida(rng.normal(L, u_L, n), rng.normal(T, u_T, n))
    return float(muestras.mean()), float(muestras.std(ddof=1))


def factor_amplitud(grados):
    """Periodo a amplitud θ dividido por el de oscilaciones pequeñas (serie de T(θ) hasta θ⁴)."""
    th = math.radians(grados)
    return 1 + th**2 / 16 + 11 * th**4 / 3072


def corregir_amplitud(tabla):
    tabla = tabla.copy()
    f = tabla["amplitud_grados"].map(factor_amplitud)
    tabla["T"] = tabla["T"] / f
    tabla["u_T"] = tabla["u_T"] / f
    return tabla


def compatibles(g1, u1, g2, u2, k=2):
    return abs(g1 - g2) / math.hypot(u1, u2) < k


fila = serie_a.iloc[-1]
analitica = propagacion_analitica(fila["longitud_m"], fila["u_L"], fila["T"], fila["u_T"])
monte_carlo = propagacion_monte_carlo(fila["longitud_m"], fila["u_L"], fila["T"], fila["u_T"])
serie_b = periodos[periodos["serie"] == "B"].reset_index(drop=True)
resultado_b = medir_g(serie_b)
resultado_b_corregido = medir_g(corregir_amplitud(serie_b))
comparaciones = {
    "A_y_B": compatibles(resultado_a["g"], resultado_a["u_g"], resultado_b["g"], resultado_b["u_g"]),
    "A_y_B_corregida": compatibles(resultado_a["g"], resultado_a["u_g"], resultado_b_corregido["g"], resultado_b_corregido["u_g"]),
}`;

const S4 = py`import argparse
import json
import os
from dataclasses import asdict, dataclass

import matplotlib.pyplot as plt


@dataclass
class Configuracion:
    archivo: str = "pendulo.csv"
    serie: str = "A"
    corregir_amplitud: bool = False
    salida: str = "resultados"


def analizar(config):
    tabla = resumir_periodos(pd.read_csv(config.archivo))
    tabla = tabla[tabla["serie"] == config.serie].reset_index(drop=True)
    if tabla.empty:
        raise ValueError(f"no hay datos de la serie {config.serie!r}")
    if config.corregir_amplitud:
        tabla = corregir_amplitud(tabla)
    r = medir_g(tabla)
    return {"config": asdict(config), "tabla": tabla, "ajuste": r, "texto_g": redondear_medida(r["g"], r["u_g"])}


def dibujar(resultados):
    tabla, r = resultados["tabla"], resultados["ajuste"]
    T2, u_T2 = tabla["T"] ** 2, 2 * tabla["T"] * tabla["u_T"]
    fig, (arriba, abajo) = plt.subplots(2, 1, figsize=(6, 6), sharex=True, gridspec_kw={"height_ratios": [3, 1]})
    arriba.errorbar(tabla["longitud_m"], T2, yerr=u_T2, fmt="o", capsize=3, label="medidas")
    x = np.linspace(0, tabla["longitud_m"].max() * 1.05, 50)
    arriba.plot(x, r["a"] + r["b"] * x, label=f"ajuste: g = {resultados['texto_g']} m/s²")
    arriba.set_ylabel("T² (s²)")
    arriba.set_title(f"Péndulo, serie {resultados['config']['serie']}")
    arriba.legend()
    abajo.axhline(0, color="gray", linewidth=1)
    abajo.plot(tabla["longitud_m"], r["residuos_normalizados"], "o")
    abajo.set_xlabel("Longitud (m)")
    abajo.set_ylabel("residuo / u")
    fig.tight_layout()
    return fig


def tabla_markdown(tabla):
    lineas = ["| L (m) | T (s) |", "|---|---|"]
    for _, f in tabla.iterrows():
        lineas.append(f"| {f['longitud_m']:.3f} | {redondear_medida(f['T'], f['u_T'])} |")
    return "\n".join(lineas)


def exportar(resultados, carpeta):
    os.makedirs(carpeta, exist_ok=True)
    r = resultados["ajuste"]
    resumen = {"config": resultados["config"], "g": r["g"], "u_g": r["u_g"], "texto_g": resultados["texto_g"],
               "chi2_reducido": r["chi2_reducido"], "p_chi2": r["p_chi2"], "puntos": len(resultados["tabla"])}
    with open(os.path.join(carpeta, "resultados.json"), "w", encoding="utf-8") as f:
        json.dump(resumen, f, ensure_ascii=False, indent=2)
    informe = "\n".join([
        f"# Medida de g, serie {resultados['config']['serie']}",
        "",
        f"g = {resultados['texto_g']} m/s² (χ²/gl = {r['chi2_reducido']:.2f}, p = {r['p_chi2']:.2f}).",
        "Corrección de amplitud: " + ("sí" if resultados["config"]["corregir_amplitud"] else "no") + ".",
        "",
        tabla_markdown(resultados["tabla"]),
        "",
        "![Ajuste](figura.png)",
    ])
    with open(os.path.join(carpeta, "informe.md"), "w", encoding="utf-8") as f:
        f.write(informe + "\n")
    fig = dibujar(resultados)
    fig.savefig(os.path.join(carpeta, "figura.png"), dpi=100)
    plt.close(fig)
    return sorted(os.listdir(carpeta))


def main(argv=None):
    parser = argparse.ArgumentParser(description="Mide g con un péndulo a partir de un CSV de tiempos.")
    parser.add_argument("--archivo", default="pendulo.csv")
    parser.add_argument("--serie", default="A")
    parser.add_argument("--corregir-amplitud", action="store_true")
    parser.add_argument("--salida", default="resultados")
    args = parser.parse_args(argv)
    config = Configuracion(args.archivo, args.serie, args.corregir_amplitud, args.salida)
    try:
        resultados = analizar(config)
    except (ValueError, FileNotFoundError) as e:
        print(f"Error: {e}")
        return 1
    archivos = exportar(resultados, config.salida)
    print(f"Serie {config.serie}: g = {resultados['texto_g']} m/s² → {', '.join(archivos)}")
    return 0


codigos = [main(["--serie", "A", "--salida", "salida_A"]), main(["--serie", "B", "--corregir-amplitud", "--salida", "salida_B"]), main(["--serie", "Z"])]`;

const SOL1 = S1;
const SOL2 = `${SOL1}\n\n${S2}`;
const SOL3 = `${SOL2}\n\n${S3}`;
const SOL4 = `${SOL3}\n\n${S4}`;

export const PROJ_PENDULO: Mission[] = [
  {
    id: "pl-pendulo-1",
    world: "w9",
    zone: "Aplicaciones científicas",
    title: "El laboratorio del péndulo · 1: medidas e incertidumbres",
    kind: "project",
    difficulty: 3,
    skills: ["error-estandar", "estadistica-descriptiva", "estimacion", "pandas"],
    requires: ["s-error-estandar"],
    series: { ...SERIES, stage: 1 },
    packages: ["numpy", "pandas"],
    files: FILES,
    story: "La academia del Multiverso tiene un péndulo, una cinta métrica y un cronómetro. Su reto: medir la gravedad. El primer paso no es la fórmula: es saber cuánto se puede confiar en cada tiempo y cada longitud.",
    objective: "Calcular el periodo medio de cada serie y longitud con su incertidumbre típica, combinando la dispersión de las repeticiones (tipo A) con la resolución del instrumento (tipo B), y presentar los resultados con las cifras significativas adecuadas.",
    before: ["Error estándar de la media", "groupby en pandas", "Formato de números"],
    intuition: [
      "Se cronometran **10 oscilaciones** y se divide entre 10: el error de reacción al pulsar el cronómetro (unas décimas) se reparte entre 10 periodos.",
      "",
      "**Tipo A:** de las repeticiones, la desviación típica de la media, s/√n. **Tipo B:** de lo que se sabe del instrumento; si solo se conoce su resolución Δ, se supone una distribución rectangular y u = Δ/√12. Ambas se combinan en **cuadratura**: u = √(u_A² + u_B²).",
      "",
      "Un resultado se comunica como **valor ± incertidumbre**, con la incertidumbre a 2 cifras significativas y el valor redondeado a la misma posición decimal: 0,8992 ± 0,0043 s, no 0,899187 ± 0,00430511 s.",
      "",
      "Cuidado con el redondeo que añade una cifra: 0,0995 a 2 cifras es 0,10, y entonces el valor va a 2 decimales.",
    ],
    formal: "u_A = s/√n · u_B = Δ/√12 · u = √(u_A² + u_B²) · T = t₁₀/10, u(T) = u(t₁₀)/10",
    example: {
      code: py`import math
tiempos = [8.99, 9.07, 8.93, 8.87, 9.10]
periodos = [t / 10 for t in tiempos]
media = sum(periodos) / len(periodos)
s = math.sqrt(sum((p - media) ** 2 for p in periodos) / (len(periodos) - 1))
print(round(media, 4), round(s / math.sqrt(len(periodos)), 4), round(0.01 / math.sqrt(12) / 10, 5))`,
      lines: [
        "Módulo math.",
        "Cinco medidas de 10 oscilaciones (s).",
        "Periodo de cada medida.",
        "Periodo medio.",
        "Desviación típica de las repeticiones.",
        "0,8992 s, u_A ≈ 0,0043 s y u_B ≈ 0,00029 s: aquí domina la reacción humana, no el cronómetro.",
      ],
    },
    challenge: [
      "1. `RESOLUCION_CRONOMETRO = 0.01`, `RESOLUCION_CINTA = 0.001`, `OSCILACIONES = 10` e `incertidumbre_resolucion(resolucion)` (Δ/√12).",
      "2. `resumir_periodos(df)`: por serie y longitud, DataFrame con `serie`, `longitud_m`, `amplitud_grados`, `T` (media de t10/10), `u_T` (combinada), `u_A`, `u_B` (de la resolución del cronómetro, dividida entre 10), `u_L` (de la cinta) y `n`.",
      "3. `redondear_medida(valor, u, cifras=2)`: texto `\"valor ± u\"` con u a `cifras` cifras significativas (corrigiendo el caso 0,0995 → 0,10) y el valor al mismo decimal; `ValueError` si u ≤ 0.",
      "4. `medidas`, `periodos` y `ejemplo` (la primera fila redondeada). Imprime la tabla.",
    ],
    starter: py`import math

import numpy as np
import pandas as pd

RESOLUCION_CRONOMETRO = 0.01  # s
RESOLUCION_CINTA = 0.001  # m
OSCILACIONES = 10


def incertidumbre_resolucion(resolucion):
    return 0.0


def resumir_periodos(df):
    return pd.DataFrame()


def redondear_medida(valor, u, cifras=2):
    return f"{valor} ± {u}"


medidas = pd.read_csv("pendulo.csv")
periodos = resumir_periodos(medidas)
ejemplo = ""`,
    solution: SOL1,
    tests: py`
import math
import pandas as pd

def test_tipo_b():
    "Distribución rectangular"
    f = t.get("incertidumbre_resolucion", "function")
    assert abs(f(0.01) - 0.01 / math.sqrt(12)) < 1e-15

def test_periodos():
    "Media e incertidumbre combinada por grupo"
    p, m = t.get("periodos", pd.DataFrame), t.get("medidas", pd.DataFrame)
    assert len(p) == 14 and set(p["serie"]) == {"A", "B"}
    g = m[(m["serie"] == "B") & (m["longitud_m"] == p.loc[p["serie"] == "B", "longitud_m"].iloc[3])]["t10_s"] / 10
    fila = p[(p["serie"] == "B")].iloc[3]
    u_a = g.std(ddof=1) / math.sqrt(len(g))
    u_b = 0.01 / math.sqrt(12) / 10
    assert abs(fila["T"] - g.mean()) < 1e-12 and abs(fila["u_A"] - u_a) < 1e-12 and abs(fila["u_T"] - math.hypot(u_a, u_b)) < 1e-12
    assert abs(fila["u_L"] - 0.001 / math.sqrt(12)) < 1e-15 and fila["n"] == 5 and fila["amplitud_grados"] == 35

def test_redondeo():
    "Valor ± incertidumbre con cifras coherentes"
    r = t.get("redondear_medida", "function")
    assert r(9.81234, 0.0456) == "9.812 ± 0.046"
    assert r(9.8, 0.0995) == "9.80 ± 0.10"
    assert r(123.456, 1.234) == "123.5 ± 1.2"
    assert r(0.012345, 0.00067) == "0.01235 ± 0.00067"
    assert r(1234.7, 15) == "1235 ± 15"
    assert r(9.81234, 0.0456, cifras=1) == "9.81 ± 0.05"
    try:
        r(1.0, 0)
    except ValueError:
        pass
    else:
        raise AssertionError("Una incertidumbre nula o negativa debe lanzar ValueError")
    assert t.get("ejemplo") == r(t.get("periodos")["T"].iloc[0], t.get("periodos")["u_T"].iloc[0])
`,
    hints: [
      "resumir_periodos: recorre `df.groupby([\"serie\", \"longitud_m\"])`; `periodos = g[\"t10_s\"] / OSCILACIONES` y `u_a = periodos.std(ddof=1) / math.sqrt(len(periodos))`.",
      "redondear_medida: los decimales son `cifras - 1 - math.floor(math.log10(u))`; si `round(u, decimales)` llega a `10 ** (cifras - decimales)`, quita un decimal.",
      "El formato con decimales variables: `formato = f\"{{:.{max(decimales, 0)}f}}\"` y `formato.format(round(valor, decimales))`.",
    ],
    errors: [
      { error: "Dar como incertidumbre la desviación típica de las repeticiones", fix: "Eso describe una medida individual; la de la media es s/√n." },
      { error: "Sumar las incertidumbres en lugar de combinarlas en cuadratura", fix: "Si las fuentes son independientes, se suman las varianzas: u = √(u_A² + u_B²)." },
      { error: "Escribir todas las cifras que da el ordenador", fix: "Las cifras más allá de la incertidumbre no significan nada: redondea u a 2 cifras y el valor al mismo decimal." },
    ],
    quiz: {
      question: "El cronómetro tiene resolución 0,01 s, pero la incertidumbre del periodo sale 0,004 s. ¿Qué la domina?",
      options: [
        { text: "La variación de las repeticiones (sobre todo el tiempo de reacción al pulsar), que es mucho mayor que la resolución del cronómetro" },
        { text: "La resolución del cronómetro, porque es la única fuente de error de un instrumento digital" },
        { text: "Ninguna: un cronómetro digital no tiene incertidumbre" },
        { text: "La longitud del péndulo" },
      ],
      answer: 0,
      explanation: "u_B ≈ 0,0003 s frente a u_A ≈ 0,004 s. Mejorar el cronómetro no serviría; cronometrar más oscilaciones o más repeticiones, sí.",
    },
    project: SPEC,
    review: "Repasa: tipo A (s/√n) y tipo B (Δ/√12); combinación en cuadratura; valor ± incertidumbre con cifras coherentes.",
    xp: 120,
    coins: 18,
  },
  {
    id: "pl-pendulo-2",
    world: "w9",
    zone: "Aplicaciones científicas",
    title: "El laboratorio del péndulo · 2: ajuste ponderado de T² frente a L",
    kind: "project",
    difficulty: 4,
    skills: ["regresion", "verificacion", "scipy", "estimacion"],
    requires: ["pl-pendulo-1", "r-lineal"],
    series: { ...SERIES, stage: 2 },
    packages: ["numpy", "pandas", "scipy"],
    files: FILES,
    story: "Con oscilaciones pequeñas, T = 2π√(L/g): elevado al cuadrado, T² = (4π²/g)·L es una recta. La pendiente da g. Pero no todos los puntos son igual de precisos, y la academia quiere saber además si la recta describe bien los datos.",
    objective: "Ajustar T² frente a L por mínimos cuadrados ponderados con fórmulas cerradas, obtener g y su incertidumbre desde la pendiente, calcular χ² y su p-valor y verificarlo todo contra scipy.optimize.curve_fit.",
    before: ["Etapa 1", "Regresión lineal", "Distribución χ²"],
    intuition: [
      "**Linealizar** convierte una ley en una recta: con y = T² y x = L, la pendiente es b = 4π²/g y la ordenada debería ser 0.",
      "",
      "Al transformar, también se transforma la incertidumbre: u(T²) = 2T·u(T). Los puntos más precisos deben pesar más: **pesos w = 1/u²**.",
      "",
      "Las fórmulas cerradas del ajuste ponderado usan cinco sumas (S, Sx, Sy, Sxx, Sxy). La incertidumbre de la pendiente sale de ellas, y la de g de propagar g = 4π²/b: u_g = g·u_b/b.",
      "",
      "**χ²** = Σ ((y − ŷ)/u)² compara los residuos con lo que se esperaba por las incertidumbres. Con un buen modelo y buenas incertidumbres, χ²/gl ≈ 1. Mucho mayor: el modelo falla o las incertidumbres están subestimadas. Mucho menor: probablemente están sobrestimadas.",
    ],
    formal: "D = S·Sxx − Sx² · b = (S·Sxy − Sx·Sy)/D · u_b = √(S/D) · a = (Sxx·Sy − Sx·Sxy)/D · u_a = √(Sxx/D) · χ² = Σ wᵢ(yᵢ − a − bxᵢ)², gl = n − 2",
    example: {
      code: py`import math
L, T = 1.0, 2.0108
print(round(4 * math.pi ** 2 * L / T ** 2, 3), round(2 * T * 0.0035, 4))`,
      lines: [
        "Módulo math.",
        "Una longitud y su periodo medido.",
        "g ≈ 9,764 m/s² con una sola medida, y u(T²) = 2T·u(T) ≈ 0,0141 s² si u(T) = 0,0035 s.",
      ],
    },
    challenge: [
      "1. `ajuste_ponderado(x, y, u_y)`: diccionario con `a`, `b`, `u_a`, `u_b`, `chi2`, `gl` y `residuos_normalizados` ((y − ŷ)/u).",
      "2. `g_desde_pendiente(b, u_b)`: `(g, u_g)`.",
      "3. `medir_g(tabla)`: ajusta T² frente a `longitud_m` con u(T²) = 2T·u_T y devuelve el ajuste más `g`, `u_g`, `chi2_reducido` y `p_chi2` (`stats.chi2.sf`).",
      "4. `serie_a` (filas de la serie A de `periodos`) y `resultado_a`. Imprime g redondeado y χ²/gl.",
    ],
    starter: py`from scipy import stats


def ajuste_ponderado(x, y, u_y):
    return {"a": 0.0, "b": 1.0, "u_a": 0.0, "u_b": 0.0, "chi2": 0.0, "gl": 0, "residuos_normalizados": np.zeros(len(x))}


def g_desde_pendiente(b, u_b):
    return 0.0, 0.0


def medir_g(tabla):
    return {}


serie_a = periodos[periodos["serie"] == "A"].reset_index(drop=True)
resultado_a = medir_g(serie_a)`,
    solution: SOL2,
    tests: py`
import math
import numpy as np
import pandas as pd
from scipy import stats
from scipy.optimize import curve_fit

def test_contra_curve_fit():
    "Igual que curve_fit con absolute_sigma=True"
    aj = t.get("ajuste_ponderado", "function")
    rng = np.random.default_rng(2)
    x = np.linspace(0, 5, 12)
    u = rng.uniform(0.1, 0.5, 12)
    y = 1.5 + 0.7 * x + rng.normal(0, u)
    r = aj(x, y, u)
    p, c = curve_fit(lambda x, a, b: a + b * x, x, y, sigma=u, absolute_sigma=True)
    assert np.allclose([r["a"], r["b"]], p) and np.allclose([r["u_a"], r["u_b"]], np.sqrt(np.diag(c)))
    assert abs(r["chi2"] - (((y - p[0] - p[1] * x) / u) ** 2).sum()) < 1e-9 and r["gl"] == 10
    assert np.allclose(r["residuos_normalizados"], (y - p[0] - p[1] * x) / u)

def test_g():
    "g desde la pendiente"
    gp = t.get("g_desde_pendiente", "function")
    g, u = gp(4.0, 0.02)
    assert abs(g - math.pi ** 2) < 1e-12 and abs(u - math.pi ** 2 * 0.005) < 1e-12

def test_serie_a():
    "La medida de la serie A"
    r, s = t.get("resultado_a", dict), t.get("serie_a", pd.DataFrame)
    assert len(s) == 7 and set(s["serie"]) == {"A"}
    T2, u = s["T"] ** 2, 2 * s["T"] * s["u_T"]
    p, _ = curve_fit(lambda x, a, b: a + b * x, s["longitud_m"], T2, sigma=u, absolute_sigma=True)
    # curve_fit es iterativo: coincide con la fórmula cerrada hasta su tolerancia (≈ 1e-8 relativo).
    assert abs(r["b"] - p[1]) < 1e-6 * p[1] and abs(r["g"] - 4 * math.pi ** 2 / p[1]) < 1e-6 * r["g"]
    assert abs(r["g"] - 9.80) < 3 * r["u_g"], "Los datos se generaron con g = 9,80 m/s²"
    assert abs(r["a"]) < 2 * r["u_a"], "La ordenada debe ser compatible con 0"
    assert abs(r["p_chi2"] - stats.chi2.sf(r["chi2"], 5)) < 1e-12 and abs(r["chi2_reducido"] - r["chi2"] / 5) < 1e-12
`,
    hints: [
      "ajuste_ponderado: `w = 1 / u_y ** 2`; `S, Sx, Sy, Sxx, Sxy = w.sum(), (w * x).sum(), (w * y).sum(), (w * x * x).sum(), (w * x * y).sum()` y `D = S * Sxx - Sx ** 2`.",
      "medir_g: `T2 = tabla[\"T\"] ** 2` y `u_T2 = 2 * tabla[\"T\"] * tabla[\"u_T\"]`; luego `g_desde_pendiente(ajuste[\"b\"], ajuste[\"u_b\"])`.",
      "p de χ²: `stats.chi2.sf(chi2, gl)` es la probabilidad de un χ² igual o mayor si el modelo y las incertidumbres son correctos.",
    ],
    errors: [
      { error: "Ajustar T frente a L con una recta", fix: "T ∝ √L no es lineal en L: linealiza con T² o ajusta la raíz." },
      { error: "Olvidar transformar la incertidumbre al elevar al cuadrado", fix: "u(T²) = 2T·u(T): los puntos de T grande tienen más incertidumbre absoluta en T²." },
      { error: "Usar curve_fit sin absolute_sigma=True", fix: "Sin él, SciPy reescala las incertidumbres para que χ²/gl = 1 y las tuyas dejan de contar." },
    ],
    quiz: {
      question: "El ajuste de la serie A da χ²/gl = 0,22 (p = 0,95). ¿Qué indica?",
      options: [
        { text: "Que los residuos son menores de lo esperado por las incertidumbres: el modelo es compatible con los datos, y las incertidumbres podrían estar algo sobrestimadas (con 5 repeticiones, u_A es poco precisa)" },
        { text: "Que el ajuste es perfecto y g es exacta" },
        { text: "Que la recta no describe los datos" },
        { text: "Que hay un 95 % de probabilidad de que el modelo sea correcto", misconception: "p-valor" },
      ],
      answer: 0,
      explanation: "χ²/gl lejos de 1 por abajo no indica un ajuste «mejor»; señala incertidumbres grandes o pocos grados de libertad. El p-valor no es la probabilidad de que el modelo sea cierto.",
    },
    lab: { lab: "estadistica", tab: "regresion", label: "Regresión y correlación" },
    project: SPEC,
    review: "Repasa: linealizar; pesos 1/u²; fórmulas del ajuste ponderado; propagar a g; χ² y χ²/gl.",
    xp: 140,
    coins: 20,
  },
  {
    id: "pl-pendulo-3",
    world: "w9",
    zone: "Aplicaciones científicas",
    title: "El laboratorio del péndulo · 3: propagación y un error sistemático",
    kind: "project",
    difficulty: 4,
    skills: ["monte-carlo", "simulacion", "verificacion", "estimacion"],
    requires: ["pl-pendulo-2", "ec-simulacion"],
    series: { ...SERIES, stage: 3 },
    packages: ["numpy", "pandas", "scipy"],
    files: FILES,
    story: "Un segundo grupo repitió el experimento soltando el péndulo desde 35°, «para que se viera mejor». Su g sale 9,29 m/s², muy lejos de la del primer grupo, con incertidumbres pequeñas. ¿Mala suerte o algo físico?",
    objective: "Propagar la incertidumbre de g de forma analítica y por Monte Carlo, comprobar que coinciden, cuantificar con un test de compatibilidad la discrepancia entre las dos series y corregir el error sistemático de la amplitud con la serie del periodo.",
    before: ["Etapas 1 y 2", "Simulación Monte Carlo", "Derivadas parciales (Mundo 4)"],
    intuition: [
      "**Propagación analítica:** para g = 4π²L/T², las incertidumbres relativas se combinan así: u_g/g = √((u_L/L)² + (2·u_T/T)²). El 2 viene del exponente de T.",
      "",
      "**Monte Carlo:** simula muchas L y T con sus incertidumbres, calcula g para cada pareja y mira la dispersión. No necesita derivadas y sirve para fórmulas complicadas; si las incertidumbres son pequeñas, coincide con la analítica.",
      "",
      "Dos resultados son **compatibles** si su diferencia es pequeña comparada con √(u₁² + u₂²). Con 35° la diferencia es de unas 11 veces esa cantidad: no es azar, es un **error sistemático**.",
      "",
      "T = 2π√(L/g) solo vale para oscilaciones pequeñas. El periodo exacto crece con la amplitud θ: T(θ) = T₀·(1 + θ²/16 + 11θ⁴/3072 + …). Con 35°, un 2,4 % más. Dividir por ese factor corrige la serie B, y entonces ambas series coinciden.",
      "",
      "Un sistemático **no se reduce** repitiendo medidas: hay que entender su causa.",
    ],
    formal: "u_g/g = √((u_L/L)² + (2u_T/T)²) · compatibles ⇔ |g₁ − g₂| / √(u₁² + u₂²) < 2 · T(θ)/T₀ = (2/π)·K(sen²(θ/2)) ≈ 1 + θ²/16 + 11θ⁴/3072",
    example: {
      code: py`import math
for grados in (5, 15, 35, 60):
    th = math.radians(grados)
    print(grados, round(1 + th ** 2 / 16 + 11 * th ** 4 / 3072, 5))`,
      lines: [
        "Módulo math.",
        "Varias amplitudes.",
        "En radianes.",
        "Factor del periodo: 1,00048 a 5°, 1,00430 a 15°, 1,02382 a 35° y 1,07285 a 60°.",
      ],
    },
    challenge: [
      "1. `g_de_una_medida(L, T)`, `propagacion_analitica(L, u_L, T, u_T)` → `(g, u_g)` y `propagacion_monte_carlo(L, u_L, T, u_T, n=200_000, semilla=0)` → `(media, desviación)` con `rng.normal` para L y luego para T.",
      "2. `factor_amplitud(grados)` (serie hasta θ⁴) y `corregir_amplitud(tabla)`: copia con `T` y `u_T` divididos por el factor de su amplitud.",
      "3. `compatibles(g1, u1, g2, u2, k=2)`.",
      "4. `fila` (última de `serie_a`), `analitica`, `monte_carlo`, `serie_b`, `resultado_b`, `resultado_b_corregido` y `comparaciones` con `A_y_B` y `A_y_B_corregida`.",
    ],
    starter: py`def g_de_una_medida(L, T):
    return 0.0


def propagacion_analitica(L, u_L, T, u_T):
    return 0.0, 0.0


def propagacion_monte_carlo(L, u_L, T, u_T, n=200_000, semilla=0):
    return 0.0, 0.0


def factor_amplitud(grados):
    return 1.0


def corregir_amplitud(tabla):
    return tabla


def compatibles(g1, u1, g2, u2, k=2):
    return True


fila = serie_a.iloc[-1]
analitica = propagacion_analitica(fila["longitud_m"], fila["u_L"], fila["T"], fila["u_T"])
monte_carlo = propagacion_monte_carlo(fila["longitud_m"], fila["u_L"], fila["T"], fila["u_T"])
serie_b = periodos[periodos["serie"] == "B"].reset_index(drop=True)
resultado_b = medir_g(serie_b)
resultado_b_corregido = medir_g(corregir_amplitud(serie_b))
comparaciones = {}`,
    solution: SOL3,
    tests: py`
import math
import numpy as np
import pandas as pd
from scipy.special import ellipk

def test_propagacion():
    "Analítica y Monte Carlo coinciden"
    pa, pm = t.get("propagacion_analitica", "function"), t.get("propagacion_monte_carlo", "function")
    g, u = pa(1.0, 0.002, 2.0, 0.004)
    assert abs(g - math.pi ** 2) < 1e-12 and abs(u - g * math.hypot(0.002, 0.004)) < 1e-12
    media, de = pm(1.0, 0.002, 2.0, 0.004, n=100_000, semilla=3)
    rng = np.random.default_rng(3)
    ref = 4 * math.pi ** 2 * rng.normal(1.0, 0.002, 100_000) / rng.normal(2.0, 0.004, 100_000) ** 2
    assert abs(media - ref.mean()) < 1e-9 and abs(de - ref.std(ddof=1)) < 1e-9
    an, mc = t.get("analitica"), t.get("monte_carlo")
    assert abs(an[1] - mc[1]) / an[1] < 0.02 and abs(an[0] - mc[0]) < 0.01

def test_factor():
    "La serie coincide con la integral elíptica exacta"
    f = t.get("factor_amplitud", "function")
    for grados in (5, 20, 35):
        exacto = 2 / math.pi * ellipk(math.sin(math.radians(grados) / 2) ** 2)
        assert abs(f(grados) - exacto) < 1e-4, grados
    assert f(0) == 1.0
    c = t.get("corregir_amplitud", "function")(t.get("serie_b", pd.DataFrame))
    assert np.allclose(c["T"], t.get("serie_b")["T"] / f(35)) and t.get("serie_b")["T"].iloc[0] > c["T"].iloc[0]

def test_sistematico():
    "Sin corregir, incompatibles; corregidas, compatibles"
    a, b, bc = t.get("resultado_a", dict), t.get("resultado_b", dict), t.get("resultado_b_corregido", dict)
    assert (a["g"] - b["g"]) / math.hypot(a["u_g"], b["u_g"]) > 5
    assert t.get("comparaciones", dict) == {"A_y_B": False, "A_y_B_corregida": True}
    assert abs(bc["g"] - 9.80) < 3 * bc["u_g"]
    co = t.get("compatibles", "function")
    assert co(1.0, 0.1, 1.15, 0.1) and not co(1.0, 0.1, 1.3, 0.1) and co(1.0, 0.1, 1.3, 0.1, k=3)
`,
    hints: [
      "propagacion_analitica: `g * math.hypot(u_L / L, 2 * u_T / T)`.",
      "Monte Carlo: `rng = np.random.default_rng(semilla)`; `g_de_una_medida(rng.normal(L, u_L, n), rng.normal(T, u_T, n))` y `std(ddof=1)`.",
      "corregir_amplitud: `f = tabla[\"amplitud_grados\"].map(factor_amplitud)` y divide `T` y `u_T` por f en una copia.",
    ],
    errors: [
      { error: "Promediar las dos series porque «más datos es mejor»", fix: "Si son incompatibles, promediarlas esconde un sistemático. Primero explica la diferencia." },
      { error: "Pensar que repetir más medidas a 35° arregla el resultado", fix: "Más repeticiones reducen el error aleatorio, no el sistemático: g seguiría desviada, con una incertidumbre aún menor." },
      { error: "Olvidar el 2 de T² al propagar", fix: "La incertidumbre relativa de T² es el doble que la de T." },
    ],
    quiz: {
      question: "La serie B da g = 9,29 ± 0,03 y la serie A 9,76 ± 0,03. ¿Qué conclusión es correcta?",
      options: [
        { text: "Los resultados son incompatibles: la diferencia es de unas 11 incertidumbres combinadas; hay un sistemático en una serie (aquí, la amplitud grande)" },
        { text: "La media 9,53 ± 0,02 es la mejor estimación" },
        { text: "Con incertidumbres tan pequeñas, ambas son correctas" },
        { text: "La serie B tiene más mérito porque su incertidumbre es menor" },
      ],
      answer: 0,
      explanation: "Una incertidumbre pequeña habla de la dispersión, no del sesgo. La compatibilidad compara diferencias con incertidumbres; si falla, se busca la causa física.",
    },
    project: SPEC,
    review: "Repasa: propagación con derivadas y con Monte Carlo; compatibilidad; error sistemático frente a aleatorio; corrección de la amplitud.",
    xp: 150,
    coins: 22,
  },
  {
    id: "pl-pendulo-4",
    world: "w9",
    zone: "Aplicaciones científicas",
    title: "El laboratorio del péndulo · 4: la aplicación, con línea de órdenes y exportación",
    kind: "project",
    difficulty: 4,
    skills: ["arquitectura", "visualizacion", "reproducibilidad", "comunicacion"],
    requires: ["pl-pendulo-3", "eng-arquitectura"],
    series: { ...SERIES, stage: 4 },
    packages: ["numpy", "pandas", "scipy", "matplotlib"],
    files: FILES,
    story: "Otros laboratorios quieren usar tu análisis con sus propios datos. Copiar un cuaderno no sirve: necesitan una herramienta. «Le paso el archivo y la serie, me devuelve g y me deja un informe con la figura», pide el director.",
    objective: "Convertir el análisis en una aplicación: una configuración explícita, una función que analiza, otra que dibuja (barras de error y residuos normalizados), otra que exporta JSON, un informe en Markdown y la figura, y un punto de entrada de línea de órdenes que devuelve un código de salida.",
    before: ["Etapas 1 a 3", "Arquitectura en capas", "matplotlib"],
    intuition: [
      "Una aplicación separa **qué se pide** (la configuración), **qué se calcula** (analizar), **cómo se muestra** (dibujar, informe) y **cómo se usa** (la línea de órdenes). Cada parte se prueba por separado.",
      "",
      "Una `dataclass` hace la configuración explícita y se guarda tal cual en el JSON de resultados: cualquiera puede repetir el análisis con los mismos parámetros. Eso es **reproducibilidad**.",
      "",
      "La figura científica muestra los datos **con sus barras de error**, el ajuste y, debajo, los **residuos normalizados** (residuo/u): si el modelo es bueno, rondan entre −2 y 2 sin patrón.",
      "",
      "`argparse` convierte `--serie B --corregir-amplitud` en parámetros. Un programa de línea de órdenes **no se rompe** ante una entrada imposible: informa y devuelve un código distinto de 0.",
    ],
    formal: "configuración → analizar → (dibujar, exportar) · código de salida: 0 = correcto, 1 = error de entrada",
    example: {
      code: py`import argparse
from dataclasses import asdict, dataclass

@dataclass
class Config:
    serie: str = "A"
    corregir: bool = False

parser = argparse.ArgumentParser()
parser.add_argument("--serie", default="A")
parser.add_argument("--corregir", action="store_true")
args = parser.parse_args(["--serie", "B", "--corregir"])
print(asdict(Config(args.serie, args.corregir)))`,
      lines: [
        "Para leer argumentos de la línea de órdenes.",
        "Para declarar la configuración.",
        "Decorador que genera __init__, __repr__ y comparación.",
        "La configuración con sus valores por defecto.",
        "Un campo de texto.",
        "Un interruptor.",
        "El analizador de argumentos.",
        "Un argumento con valor.",
        "Un interruptor: presente = True.",
        "Se le pasa una lista para probarlo sin consola.",
        "{'serie': 'B', 'corregir': True}: la configuración como diccionario, lista para guardarse en JSON.",
      ],
    },
    challenge: [
      "1. `Configuracion` (dataclass): `archivo=\"pendulo.csv\"`, `serie=\"A\"`, `corregir_amplitud=False`, `salida=\"resultados\"`.",
      "2. `analizar(config)`: lee, resume, filtra la serie (`ValueError` si no hay datos), corrige si se pide y devuelve `{\"config\": asdict(config), \"tabla\", \"ajuste\", \"texto_g\"}`.",
      "3. `dibujar(resultados)`: dos paneles (3:1, eje x compartido): T² con barras de error, la recta y una leyenda con g; debajo, los residuos normalizados y una línea en 0. Ejes con unidades.",
      "4. `tabla_markdown(tabla)` y `exportar(resultados, carpeta)`: crea la carpeta y escribe `resultados.json` (config, g, u_g, texto_g, chi2_reducido, p_chi2, puntos), `informe.md` (título, g, corrección, tabla e imagen) y `figura.png`; devuelve la lista ordenada de archivos.",
      "5. `main(argv=None)` con `argparse` (`--archivo`, `--serie`, `--corregir-amplitud`, `--salida`): analiza, exporta e imprime un resumen; ante `ValueError` o `FileNotFoundError` imprime el error y devuelve 1. `codigos`: las salidas de tres ejecuciones: serie A en `salida_A`, serie B corregida en `salida_B` y serie `Z`.",
    ],
    starter: py`import argparse
import json
import os
from dataclasses import asdict, dataclass

import matplotlib.pyplot as plt


@dataclass
class Configuracion:
    archivo: str = "pendulo.csv"
    serie: str = "A"
    corregir_amplitud: bool = False
    salida: str = "resultados"


def analizar(config):
    return {}


def dibujar(resultados):
    return plt.figure()


def tabla_markdown(tabla):
    return ""


def exportar(resultados, carpeta):
    return []


def main(argv=None):
    return 0


codigos = [main(["--serie", "A", "--salida", "salida_A"]), main(["--serie", "B", "--corregir-amplitud", "--salida", "salida_B"]), main(["--serie", "Z"])]`,
    solution: SOL4,
    tests: py`
import json
import os
import numpy as np

def test_configuracion_y_analisis():
    "Configuración explícita y errores claros"
    C, an = t.get("Configuracion"), t.get("analizar", "function")
    c = C()
    assert (c.archivo, c.serie, c.corregir_amplitud, c.salida) == ("pendulo.csv", "A", False, "resultados")
    r = an(C(serie="B", corregir_amplitud=True))
    assert r["config"]["corregir_amplitud"] is True and len(r["tabla"]) == 7
    assert abs(r["ajuste"]["g"] - t.get("resultado_b_corregido")["g"]) < 1e-12
    for malo in (C(serie="Z"), C(archivo="no_existe.csv")):
        try:
            an(malo)
        except (ValueError, FileNotFoundError):
            pass
        else:
            raise AssertionError("analizar debe fallar con una serie o un archivo inexistentes")

def test_linea_de_ordenes():
    "Códigos de salida y resumen"
    assert t.get("codigos", list) == [0, 0, 1]
    assert "Serie A: g =" in t.out and "Error:" in t.out

def test_archivos():
    "JSON, Markdown y figura"
    for carpeta in ("salida_A", "salida_B"):
        assert sorted(os.listdir(carpeta)) == ["figura.png", "informe.md", "resultados.json"]
        assert os.path.getsize(os.path.join(carpeta, "figura.png")) > 5000
    datos = json.load(open("salida_A/resultados.json", encoding="utf-8"))
    assert abs(datos["g"] - t.get("resultado_a")["g"]) < 1e-12 and datos["config"]["serie"] == "A" and datos["puntos"] == 7
    md = open("salida_B/informe.md", encoding="utf-8").read()
    filas = [l for l in md.splitlines() if l.startswith("| ")]
    assert len(filas) == 8 and "Corrección de amplitud: sí" in md and "![Ajuste](figura.png)" in md
    assert t.get("redondear_medida")(t.get("resultado_b_corregido")["g"], t.get("resultado_b_corregido")["u_g"]) in md

def test_figura():
    "Barras de error y residuos normalizados"
    fig = t.get("dibujar", "function")(t.get("analizar")(t.get("Configuracion")()))
    arriba, abajo = fig.axes
    assert len(arriba.containers) >= 1 and arriba.get_legend() is not None and "s" in arriba.get_ylabel()
    assert abajo.get_xlabel() and abajo.get_ylabel() and len(abajo.lines) >= 2
    res = abajo.lines[-1].get_ydata()
    assert np.allclose(res, t.get("resultado_a")["residuos_normalizados"])
`,
    hints: [
      "analizar: `tabla = resumir_periodos(pd.read_csv(config.archivo))`, filtra con `tabla[\"serie\"] == config.serie` y, si `tabla.empty`, `raise ValueError(...)`.",
      "dibujar: `plt.subplots(2, 1, sharex=True, gridspec_kw={\"height_ratios\": [3, 1]})`; `arriba.errorbar(x, T2, yerr=u_T2, fmt=\"o\", capsize=3)`.",
      "main: `args = parser.parse_args(argv)`; envuelve `analizar` en `try/except (ValueError, FileNotFoundError)` y devuelve 1; si todo va bien, `exportar` y devuelve 0.",
    ],
    errors: [
      { error: "Mezclar el cálculo con los print y los gráficos", fix: "Separa analizar (devuelve datos) de dibujar y exportar: así cada parte se prueba y se reutiliza." },
      { error: "Dejar que una entrada imposible termine con un traceback", fix: "Captura los errores esperables, informa con una frase y devuelve un código de salida distinto de 0." },
      { error: "No guardar la configuración con los resultados", fix: "Sin ella nadie sabe qué serie ni qué corrección se usó: guárdala en el JSON." },
    ],
    quiz: {
      question: "¿Por qué main devuelve un código (0 o 1) en lugar de solo imprimir el error?",
      options: [
        { text: "Porque otros programas (scripts, integración continua) leen el código de salida para saber si algo falló sin interpretar el texto" },
        { text: "Porque print no funciona dentro de main" },
        { text: "Porque Python exige que main devuelva un número" },
        { text: "Para que el programa sea más rápido" },
      ],
      answer: 0,
      explanation: "El texto es para las personas; el código de salida, para las máquinas. Una herramienta científica suele encadenarse con otras.",
    },
    project: SPEC,
    review: "Repasa: configuración con dataclass; analizar, dibujar y exportar por separado; barras de error y residuos normalizados; argparse y códigos de salida.",
    xp: 170,
    coins: 26,
  },
];
