// Local, inspectable building blocks of language-model applications. No external API:
// the "generator" is extractive (it only copies sentences from retrieved sources), which
// makes the retrieval/grounding/citation pipeline visible without a large model.

export const STOPWORDS = new Set(
  "a al algo como con de del el ella en es esa ese eso esta este esto la las le lo los mas más me mi muy no nos o para pero por que qué se si sí sin sobre su sus también te tu un una uno unos y ya son ser hay cuando cual cuál donde dónde entre hasta desde cada todo todos".split(" "),
);

export const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function wordTokens(text: string, dropStop = false): string[] {
  const toks = normalize(text).match(/[a-z0-9ñ]+/g) ?? [];
  return dropStop ? toks.filter((t) => !STOPWORDS.has(t) && t.length > 1) : toks;
}

/** Byte-pair encoding trained on a corpus: repeatedly merge the most frequent adjacent pair. */
export function trainBpe(corpus: string, merges: number) {
  const words = new Map<string, number>();
  for (const w of normalize(corpus).match(/[a-zñ]+/g) ?? []) words.set(w, (words.get(w) ?? 0) + 1);
  let vocab = [...words.entries()].map(([w, c]) => ({ syms: [...w, "·"], c }));
  const rules: [string, string][] = [];
  for (let m = 0; m < merges; m++) {
    const pairs = new Map<string, number>();
    for (const { syms, c } of vocab) for (let i = 0; i < syms.length - 1; i++) pairs.set(syms[i] + "\u0000" + syms[i + 1], (pairs.get(syms[i] + "\u0000" + syms[i + 1]) ?? 0) + c);
    let best = "";
    let bc = 1;
    for (const [p, c] of pairs) if (c > bc || (c === bc && best && p < best)) [best, bc] = [p, c];
    if (!best) break;
    const [a, b] = best.split("\u0000");
    rules.push([a, b]);
    vocab = vocab.map(({ syms, c }) => {
      const out: string[] = [];
      for (let i = 0; i < syms.length; i++) {
        if (i < syms.length - 1 && syms[i] === a && syms[i + 1] === b) {
          out.push(a + b);
          i++;
        } else out.push(syms[i]);
      }
      return { syms: out, c };
    });
  }
  return rules;
}

export function applyBpe(text: string, rules: [string, string][]): string[] {
  const out: string[] = [];
  for (const w of normalize(text).match(/[a-zñ]+|[^\sa-zñ]/g) ?? []) {
    let syms = /[a-zñ]/.test(w) ? [...w, "·"] : [w];
    for (const [a, b] of rules) {
      const next: string[] = [];
      for (let i = 0; i < syms.length; i++) {
        if (i < syms.length - 1 && syms[i] === a && syms[i + 1] === b) {
          next.push(a + b);
          i++;
        } else next.push(syms[i]);
      }
      syms = next;
    }
    out.push(...syms);
  }
  return out;
}

// ------------------------------------------------------------------ vectors

export interface TfIdf {
  vocab: string[];
  idf: number[];
  vectors: number[][];
  embed: (text: string) => number[];
}

/** Smoothed TF-IDF with L2-normalised vectors (as scikit-learn's TfidfVectorizer defaults). */
export function tfidf(docs: string[]): TfIdf {
  const toks = docs.map((d) => wordTokens(d, true));
  const vocab = [...new Set(toks.flat())].sort();
  const index = new Map(vocab.map((w, i) => [w, i]));
  const n = docs.length;
  const df = vocab.map((w) => toks.filter((t) => t.includes(w)).length);
  const idf = df.map((d) => Math.log((1 + n) / (1 + d)) + 1);
  const embed = (text: string) => {
    const v = new Array(vocab.length).fill(0);
    for (const t of wordTokens(text, true)) {
      const i = index.get(t);
      if (i !== undefined) v[i] += 1;
    }
    for (let i = 0; i < v.length; i++) v[i] *= idf[i];
    const norm = Math.hypot(...v) || 1;
    return v.map((x) => x / norm);
  };
  return { vocab, idf, vectors: docs.map(embed), embed };
}

export const cosine = (a: number[], b: number[]) => {
  let s = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? s / Math.sqrt(na * nb) : 0;
};

/** First two principal components by power iteration with deflation. */
export function pca2(X: number[][]): number[][] {
  const n = X.length;
  const d = X[0]?.length ?? 0;
  const mean = new Array(d).fill(0);
  X.forEach((r) => r.forEach((v, j) => (mean[j] += v / n)));
  const C = X.map((r) => r.map((v, j) => v - mean[j]));
  const comps: number[][] = [];
  for (let c = 0; c < 2; c++) {
    let v = new Array(d).fill(0).map((_, j) => Math.sin(j + 1 + c));
    for (let it = 0; it < 100; it++) {
      const Xv = C.map((r) => r.reduce((s, x, j) => s + x * v[j], 0));
      const w = new Array(d).fill(0);
      C.forEach((r, i) => r.forEach((x, j) => (w[j] += x * Xv[i])));
      for (const p of comps) {
        const dot = w.reduce((s, x, j) => s + x * p[j], 0);
        for (let j = 0; j < d; j++) w[j] -= dot * p[j];
      }
      const norm = Math.hypot(...w) || 1;
      v = w.map((x) => x / norm);
    }
    comps.push(v);
  }
  return C.map((r) => comps.map((p) => r.reduce((s, x, j) => s + x * p[j], 0)));
}

// ------------------------------------------------------------------ retrieval-augmented answering

export interface Doc {
  id: string;
  title: string;
  text: string;
}

export interface Hit {
  doc: Doc;
  score: number;
}

export function search(docs: Doc[], query: string, k = 3): Hit[] {
  const model = tfidf(docs.map((d) => `${d.title}. ${d.text}`));
  const q = model.embed(query);
  return docs
    .map((doc, i) => ({ doc, score: cosine(q, model.vectors[i]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export interface Answer {
  answer: string;
  citations: { n: number; id: string; title: string; sentence: string }[];
  abstained: boolean;
  context: string;
}

/**
 * Extractive answer: pick the sentences from the retrieved documents that share the most
 * content words with the question, cite each one, and abstain below a similarity threshold.
 */
export function answer(docs: Doc[], query: string, k = 3, threshold = 0.12): Answer {
  const hits = search(docs, query, k);
  const context = hits.map((h, i) => `[${i + 1}] ${h.doc.title}: ${h.doc.text}`).join("\n");
  if (!hits.length || hits[0].score < threshold) {
    return { answer: "No encuentro información suficiente en los documentos para responder. Prefiero no inventarla.", citations: [], abstained: true, context };
  }
  const qwords = new Set(wordTokens(query, true));
  const scored: { s: number; sentence: string; hit: number }[] = [];
  hits.forEach((h, i) => {
    if (h.score < threshold) return;
    for (const sentence of h.doc.text.split(/(?<=[.!?])\s+/)) {
      const w = wordTokens(sentence, true);
      const overlap = w.filter((t) => qwords.has(t)).length;
      if (overlap) scored.push({ s: overlap / Math.sqrt(w.length + 1) + h.score, sentence, hit: i });
    }
  });
  scored.sort((a, b) => b.s - a.s);
  const chosen = scored.slice(0, 2);
  if (!chosen.length) return { answer: "Los documentos recuperados no contienen una frase que responda a la pregunta.", citations: [], abstained: true, context };
  const citations = chosen.map((c, i) => ({ n: i + 1, id: hits[c.hit].doc.id, title: hits[c.hit].doc.title, sentence: c.sentence }));
  return { answer: citations.map((c) => `${c.sentence} [${c.n}]`).join(" "), citations, abstained: false, context };
}

/** Fraction of answer content words that appear in the cited sources (a crude groundedness check). */
export function groundedness(answerText: string, sources: string[]): number {
  const a = wordTokens(answerText.replace(/\[\d+\]/g, ""), true);
  if (!a.length) return 1;
  const src = new Set(sources.flatMap((s) => wordTokens(s, true)));
  return a.filter((w) => src.has(w)).length / a.length;
}

// ------------------------------------------------------------------ safety

const PII: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.]+/g, "[EMAIL]"],
  [/\b\d{8}[A-HJ-NP-TV-Z]\b/g, "[DNI]"],
  [/(?:\+\d{1,3}[ -]?)?\b(?:\d[ -]?){8,11}\d\b/g, "[TELÉFONO]"],
  [/\b(?:\d{4}[ -]?){3}\d{4}\b/g, "[TARJETA]"],
];

export function redact(text: string) {
  let out = text;
  let found = 0;
  for (const [re, tag] of PII)
    out = out.replace(re, () => {
      found++;
      return tag;
    });
  return { text: out, found };
}

const INJECTION = [/ignora (todas )?(las )?instrucciones/i, /ignore (all )?(previous )?instructions/i, /olvida (lo|todo) (anterior|que)/i, /revela (tu|el) (prompt|sistema)/i, /act[uú]a como/i, /system prompt/i];

export const looksLikeInjection = (text: string) => INJECTION.some((re) => re.test(text));

export const KNOWLEDGE: Doc[] = [
  { id: "d1", title: "Valor p", text: "El valor p es la probabilidad de obtener un resultado tan extremo o más que el observado si la hipótesis nula fuera cierta. No es la probabilidad de que la hipótesis nula sea verdadera. Un valor p pequeño indica que los datos son poco compatibles con la hipótesis nula." },
  { id: "d2", title: "Intervalo de confianza", text: "Un intervalo de confianza del 95 % se construye con un procedimiento que, repetido muchas veces, cubre el parámetro verdadero en el 95 % de los casos. Su anchura depende de la variabilidad y del tamaño muestral." },
  { id: "d3", title: "Sobreajuste", text: "Un modelo sobreajustado memoriza el ruido del conjunto de entrenamiento y generaliza mal a datos nuevos. Se detecta comparando el error de entrenamiento con el error de validación. La regularización y la validación cruzada ayudan a evitarlo." },
  { id: "d4", title: "Fuga de datos", text: "La fuga de datos ocurre cuando información del conjunto de prueba o del futuro se usa al entrenar. Por ejemplo, escalar todos los datos antes de dividirlos. Produce métricas optimistas que no se repiten en producción." },
  { id: "d5", title: "Embeddings", text: "Un embedding representa un texto como un vector numérico. Textos con significado parecido quedan cerca. La similitud del coseno mide el ángulo entre dos vectores y se usa en la búsqueda semántica." },
  { id: "d6", title: "RAG", text: "La generación aumentada por recuperación busca primero fragmentos relevantes en una colección de documentos y después pide al modelo que responda usando solo esos fragmentos. Citar las fuentes permite verificar la respuesta y reduce las alucinaciones." },
  { id: "d7", title: "Alucinaciones", text: "Un modelo de lenguaje puede producir afirmaciones fluidas pero falsas, llamadas alucinaciones. Para mitigarlas se exige citar fuentes, se permite responder que no se sabe y se evalúan las respuestas contra los documentos." },
  { id: "d8", title: "Sensibilidad y especificidad", text: "La sensibilidad es la proporción de enfermos con prueba positiva. La especificidad es la proporción de sanos con prueba negativa. El valor predictivo positivo depende además de la prevalencia." },
  { id: "d9", title: "Python Quest", text: "Python Quest ejecuta Python en el navegador con Pyodide. El progreso se guarda en el almacenamiento local y se puede exportar como archivo JSON." },
];
