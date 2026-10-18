// Simulator tabs of each lab. Missions link to them (Mission.lab) and the content tests check
// that every link points to an existing tab.
import type { LabId } from "./types";

export const LAB_TABS: Record<LabId, { id: string; label: string }[]> = {
  estadistica: [
    { id: "monedas", label: "Monedas y dados" },
    { id: "tcl", label: "Teorema central del límite" },
    { id: "distribuciones", label: "Distribuciones" },
    { id: "intervalos", label: "Intervalos de confianza" },
    { id: "potencia", label: "Errores y potencia" },
    { id: "bootstrap", label: "Bootstrap" },
    { id: "regresion", label: "Regresión y correlación" },
    { id: "bayes", label: "Actualización bayesiana" },
    { id: "diagnostico", label: "Pruebas diagnósticas" },
    { id: "roc", label: "Curva ROC" },
    { id: "km", label: "Kaplan-Meier" },
  ],
  matematicas: [
    { id: "funciones", label: "Funciones y derivadas" },
    { id: "gradiente", label: "Descenso de gradiente" },
    { id: "matrices", label: "Transformaciones lineales" },
    { id: "integrales", label: "Integración numérica" },
  ],
  ml: [
    { id: "clasificacion", label: "Fronteras de clasificación" },
    { id: "polinomios", label: "Sobreajuste en regresión" },
    { id: "kmeans", label: "K-means paso a paso" },
    { id: "pca", label: "PCA" },
  ],
};

export const labTabLabel = (lab: LabId, id: string) => LAB_TABS[lab].find((t) => t.id === id)?.label ?? id;
