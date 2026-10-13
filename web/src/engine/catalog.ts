// Cosmetic shop. Coins buy looks, pets, editor themes and effects — never answers,
// hints, skipped evaluations or XP.

export type ItemKind = "outfit" | "hair" | "pet" | "editorTheme" | "effect" | "frame";

export interface ShopItem {
  id: string;
  kind: ItemKind;
  name: string;
  price: number;
  description: string;
  /** Minimum character level to buy (cosmetic gating, never content gating). */
  level?: number;
}

export const FREE_OUTFITS = ["tunica", "capa"];
export const FREE_HAIR = ["corto", "largo", "rizado", "rapado"];
export const FREE_THEMES = ["noche", "contraste"];
export const FREE_EFFECTS = ["chispas"];

export const CATALOG: ShopItem[] = [
  { id: "armadura", kind: "outfit", name: "Armadura de datos", price: 60, description: "Placas metálicas con runas de bits." },
  { id: "bata", kind: "outfit", name: "Bata de laboratorio", price: 80, description: "Para quien vive entre experimentos.", level: 3 },
  { id: "toga", kind: "outfit", name: "Toga de estadística", price: 120, description: "Bordada con la campana de Gauss.", level: 5 },
  { id: "traje-ia", kind: "outfit", name: "Traje de red neuronal", price: 180, description: "Brilla al propagar gradientes.", level: 8 },
  { id: "coleta", kind: "hair", name: "Coleta de aventurera", price: 25, description: "Práctica para el bosque." },
  { id: "cresta", kind: "hair", name: "Cresta eléctrica", price: 40, description: "Carga estática incluida." },
  { id: "gato", kind: "pet", name: "Gato de Schrödinger", price: 50, description: "Está y no está a tu lado." },
  { id: "buho", kind: "pet", name: "Búho bayesiano", price: 90, description: "Actualiza sus creencias con cada misión.", level: 4 },
  { id: "dragon", kind: "pet", name: "Dragón de Python", price: 150, description: "Escupe fuego y f-strings.", level: 6 },
  { id: "robot", kind: "pet", name: "Robot de gradiente", price: 200, description: "Desciende sin parar hacia el mínimo.", level: 9 },
  { id: "bosque", kind: "editorTheme", name: "Tema Bosque", price: 30, description: "Verdes suaves para el editor." },
  { id: "atardecer", kind: "editorTheme", name: "Tema Atardecer", price: 45, description: "Cálido, como la ciudad al caer el sol." },
  { id: "confeti", kind: "effect", name: "Confeti pixelado", price: 35, description: "Celebración al completar misiones." },
  { id: "estrellas", kind: "effect", name: "Lluvia de estrellas", price: 55, description: "Un cielo entero cuando subes de nivel." },
  { id: "marco-oro", kind: "frame", name: "Marco dorado", price: 70, description: "Para el retrato del personaje." },
  { id: "marco-runas", kind: "frame", name: "Marco de runas", price: 110, description: "Las runas brillan con tu racha.", level: 5 },
];

export const itemById: Record<string, ShopItem> = Object.fromEntries(CATALOG.map((i) => [i.id, i]));

export const SKIN_TONES = ["#f7d7c4", "#eebb99", "#d39b72", "#a8714a", "#7a4e2d", "#4f311c"];
export const HAIR_COLORS = ["#3b2a1e", "#0f0f14", "#c9862b", "#e6d27a", "#b8452a", "#7c8bd9", "#e9eef8"];
export const OUTFIT_COLORS = ["#3b82c4", "#3f9a54", "#b8452a", "#7b5cc4", "#c9921f", "#2f3b55"];
