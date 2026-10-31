// Every mission with its full content. Only scripts and tests import this file: the app reads
// the catalog (index.ts) and loads each world's missions on demand (load.ts).
import type { Mission } from "./types";
import { W1_A } from "./missions/w1-basics-a";
import { W1_B } from "./missions/w1-basics-b";
import { W2 } from "./missions/w2-logic";
import { W2_ENTORNO } from "./missions/w2-entorno";
import { PROJ_CALCULADORA } from "./missions/proj-calculadora";
import { PROJ_GASTOS } from "./missions/proj-gastos";
import { PROJ_PREGUNTAS } from "./missions/proj-preguntas";
import { PROJ_OBSERVATORIO } from "./missions/proj-observatorio";
import { PROJ_EXPLORADOR } from "./missions/proj-explorador";
import { PROJ_ARBOLES } from "./missions/proj-arboles";
import { PROJ_CINE } from "./missions/proj-cine";
import { PROJ_PLANTA } from "./missions/proj-planta";
import { PROJ_ORACULO } from "./missions/proj-oraculo";
import { PROJ_PENDULO } from "./missions/proj-pendulo";
import { W3 } from "./missions/w3-data";
import { W3_EXTRA } from "./missions/w3-extra";
import { W4_A } from "./missions/w4-math-desc";
import { W4_MATH } from "./missions/w4-math-extra";
import { W4_B } from "./missions/w4-prob";
import { W4_C } from "./missions/w4-inference";
import { W4_COMP } from "./missions/w4-computational";
import { PROJ_ENSAYO } from "./missions/proj-ensayo";
import { PROJ_PROBABILIDADES } from "./missions/proj-probabilidades";
import { W6 } from "./missions/w6-ml";
import { W6_EXTRA } from "./missions/w6-ml-extra";
import { W6_EVAL } from "./missions/w6-ml-eval";
import { PROJ_VIVIENDAS } from "./missions/proj-viviendas";
import { W7 } from "./missions/w7-ai";
import { W7_EXTRA } from "./missions/w7-extra";
import { PROJ_TEXTO } from "./missions/proj-texto";
import { W5 } from "./missions/w5-data-eng";
import { W5_EXTRA } from "./missions/w5-extra";
import { PROJ_SENSORES } from "./missions/proj-sensores";
import { W8, W9 } from "./missions/w8-w9";
import { W8_EXTRA } from "./missions/w8-extra";
import { W8_ASYNC } from "./missions/w8-async";
import { PROJ_SERVICIO } from "./missions/proj-servicio";
import { PROJ_DEMANDA } from "./missions/proj-demanda";
import { W9_EXTRA } from "./missions/w9-extra";
import { W9_VISION_AGENTES } from "./missions/w9-vision-agentes";

/** Every mission in curriculum order. New mission files only need to be added here (then run `npm run catalog`). */
export const MISSIONS: Mission[] = [...W1_A, ...W1_B, ...PROJ_PREGUNTAS, ...W2, ...W2_ENTORNO, ...PROJ_CALCULADORA, ...W3.filter((m) => m.kind !== "project"), ...W3_EXTRA, ...W3.filter((m) => m.kind === "project"), ...PROJ_GASTOS, ...W4_A, ...W4_MATH, ...W4_B, ...W4_C.filter((m) => m.kind !== "project"), ...W4_COMP, ...W4_C.filter((m) => m.kind === "project"), ...PROJ_ENSAYO, ...PROJ_PROBABILIDADES, ...PROJ_OBSERVATORIO, ...PROJ_EXPLORADOR, ...PROJ_ARBOLES, ...W5.filter((m) => m.kind !== "project"), ...W5_EXTRA, ...W5.filter((m) => m.kind === "project"), ...PROJ_SENSORES, ...PROJ_PLANTA, ...W6.filter((m) => m.kind !== "project"), ...W6_EXTRA, ...W6_EVAL, ...W6.filter((m) => m.kind === "project"), ...PROJ_VIVIENDAS, ...W7, ...W7_EXTRA, ...PROJ_TEXTO, ...PROJ_ORACULO, ...W8, ...W8_EXTRA, ...W8_ASYNC, ...PROJ_SERVICIO, ...W9, ...W9_EXTRA, ...W9_VISION_AGENTES, ...PROJ_DEMANDA, ...PROJ_CINE, ...PROJ_PENDULO];
