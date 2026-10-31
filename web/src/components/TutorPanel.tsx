// "Pregunta al tutor": optional hints from Claude with the learner's own API key (see tutor.ts).
import { useRef, useState } from "react";
import { Markdown } from "./Markdown";
import type { PanelResult } from "./PythonPanel";
import { href } from "../router";
import { askTutor, tutorKey, type TutorContext, type TutorError, type TutorTurn } from "../tutor";

/** What the last run reported, in a few lines the tutor can reason about. */
export function describeResult(out: PanelResult): string | undefined {
  if (!out) return undefined;
  if ("failure" in out) return out.failure;
  const r = out.result;
  const lines: string[] = [];
  if (r.error) lines.push(`Error: ${r.error.type}: ${r.error.message}${r.error.line ? ` (línea ${r.error.line})` : ""}`);
  const failed = r.tests.filter((t) => !t.passed);
  if (out.checked) lines.push(failed.length ? `Comprobaciones fallidas (${failed.length} de ${r.tests.length}):` : `Todas las comprobaciones pasan (${r.tests.length}).`);
  for (const t of failed.slice(0, 5)) lines.push(`- ${t.description}: ${t.message}`);
  if (r.stdout.trim()) lines.push(`Salida (final):\n${r.stdout.trim().slice(-800)}`);
  return lines.join("\n") || undefined;
}

export function TutorPanel({ context }: { context: () => TutorContext }) {
  const [turns, setTurns] = useState<TutorTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const hasKey = Boolean(tutorKey());

  if (!hasKey)
    return (
      <p className="text-sm text-muted" data-testid="tutor">
        ¿Quieres un tutor que te dé pistas? Puedes activarlo en <a className="text-sky underline" href={href("ajustes")}>Ajustes</a> con tu propia clave de la API de Anthropic.
      </p>
    );

  const ask = async () => {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setError(null);
    setAnswer("");
    abort.current = new AbortController();
    try {
      const text = await askTutor(context(), turns, q, (d) => setAnswer((a) => a + d), abort.current.signal);
      setTurns((t) => [...t, { role: "user", text: q }, { role: "assistant", text }]);
      setAnswer("");
      setQuestion("");
    } catch (e) {
      setError((e as TutorError).message ?? String(e));
    } finally {
      setAsking(false);
    }
  };

  return (
    <details className="px-panel p-4" data-testid="tutor">
      <summary className="cursor-pointer font-bold text-violet">Pregunta al tutor</summary>
      <div className="flex flex-col gap-3 mt-3">
        <p className="text-xs text-muted">El tutor da pistas, no la solución. Recibe el enunciado, tu código y el último resultado; se usa tu clave de Anthropic y cada pregunta cuesta según su tarifa.</p>
        {turns.length > 0 && (
          <ol className="flex flex-col gap-2" aria-label="Conversación con el tutor">
            {turns.map((t, i) => (
              <li key={i} className={t.role === "user" ? "text-sm text-sky" : "bg-ink p-3 rounded-[2px]"}>
                {t.role === "user" ? `Tú: ${t.text}` : <Markdown text={t.text} />}
              </li>
            ))}
          </ol>
        )}
        {asking && (
          <div className="bg-ink p-3 rounded-[2px]" aria-live="polite" data-testid="tutor-answer">
            {answer ? <Markdown text={answer} /> : <span className="text-muted text-sm">El tutor está pensando…</span>}
          </div>
        )}
        {error && (
          <p className="text-sm text-ember" role="alert">
            {error}
          </p>
        )}
        <label className="text-sm flex flex-col gap-1">
          Tu pregunta
          <textarea className="input min-h-16" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} placeholder="Por ejemplo: ¿por qué me sale TypeError en la línea 4?" />
        </label>
        <div className="flex gap-2">
          {asking ? (
            <button className="btn-ember" onClick={() => abort.current?.abort()}>
              Detener
            </button>
          ) : (
            <button className="btn-sky" disabled={!question.trim()} onClick={() => void ask()}>
              Preguntar
            </button>
          )}
          {turns.length > 0 && !asking && (
            <button className="btn-ghost" onClick={() => setTurns([])}>
              Empezar de nuevo
            </button>
          )}
        </div>
      </div>
    </details>
  );
}
