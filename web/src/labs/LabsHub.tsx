import { PixelIcon } from "../components/pixel";
import { href } from "../router";

export const LABS = [
  { id: "estadistica", title: "Laboratorio estadístico", icon: "dice", desc: "Monedas y dados, teorema central del límite, intervalos de confianza, errores tipo I y II, potencia, bootstrap, regresión, correlación, Bayes, ROC y Kaplan-Meier." },
  { id: "datos", title: "Laboratorio de datos", icon: "table", desc: "Explora conjuntos de datos sintéticos con pandas: filtra, agrupa y grafica con código real." },
  { id: "ml", title: "Laboratorio de machine learning", icon: "gear", desc: "Entrena k-NN y regresión logística sobre puntos que tú colocas; observa sobreajuste y la diferencia entre entrenamiento y prueba." },
  { id: "ia", title: "Laboratorio de IA", icon: "brain", desc: "Tokenización, embeddings, búsqueda semántica y un mini RAG local que cita sus fuentes." },
  { id: "python", title: "Consola libre de Python", icon: "spark", desc: "Escribe y ejecuta cualquier programa, con numpy, pandas, scipy y matplotlib." },
];

export function LabsHub() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="px-title text-gold text-2xl">Laboratorios</h1>
        <p className="text-muted text-sm">Experimenta sin miedo a equivocarte. Todo lo que ves se calcula en el momento a partir de los parámetros que eliges.</p>
      </div>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LABS.map((l) => (
          <li key={l.id}>
            <a href={href(`labs/${l.id}`)} className="px-panel p-4 flex flex-col gap-2 h-full hover:brightness-110">
              <PixelIcon name={l.icon} size={28} />
              <span className="font-pixel text-lg">{l.title}</span>
              <span className="text-sm text-muted">{l.desc}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
