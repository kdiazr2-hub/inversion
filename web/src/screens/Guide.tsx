// "Programar en tu ordenador": how to install Python, use a terminal, virtual environments and Git,
// with the commands of the learner's operating system.
import { useState } from "react";
import { missionById } from "../content";
import { GUIDE, OS_NAMES, type OS } from "../content/guide";
import { text } from "../content/types";
import { Markdown } from "../components/Markdown";
import { href } from "../router";

const KEY = "pq-guia-sistema";
const ZONE_MISSIONS = ["w2-terminal", "w2-entornos", "w2-git"];

function detectOS(): OS {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "windows" || saved === "macos" || saved === "linux") return saved;
  } catch {
    // Storage may be unavailable (private mode); fall back to the browser's platform.
  }
  const ua = navigator.userAgent;
  if (/Mac OS X|Macintosh/.test(ua) && !/iPhone|iPad/.test(ua)) return "macos";
  if (/Linux|X11/.test(ua) && !/Android/.test(ua)) return "linux";
  return "windows";
}

export function Guide() {
  const [os, setOs] = useState<OS>(detectOS);
  const choose = (o: OS) => {
    setOs(o);
    try {
      localStorage.setItem(KEY, o);
    } catch {
      // Not remembering the choice is harmless.
    }
  };
  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <h1 className="px-title text-gold text-2xl">Programar en tu ordenador</h1>
        <p className="text-muted text-sm">Todo lo que necesitas para seguir fuera del navegador: Python, un editor, la terminal, entornos virtuales y Git.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Sistema operativo">
        <span className="label mr-1">Tu sistema</span>
        {(Object.keys(OS_NAMES) as OS[]).map((o) => (
          <button key={o} role="tab" aria-selected={os === o} className={`chip ${os === o ? "bg-gold text-ink" : ""}`} onClick={() => choose(o)}>
            {OS_NAMES[o]}
          </button>
        ))}
      </div>
      {GUIDE.map((step) => (
        <section key={step.id} className="px-panel p-5" aria-labelledby={`guia-${step.id}`}>
          <h2 id={`guia-${step.id}`} className="font-pixel text-xl mb-2">
            {step.title}
          </h2>
          {step.intro && <Markdown text={text(step.intro)} />}
          {step.os && <Markdown text={text(step.os[os])} />}
          {step.outro && <Markdown text={text(step.outro)} />}
        </section>
      ))}
      <section className="px-panel p-5">
        <h2 className="font-pixel text-xl mb-2">Practícalo en el juego</h2>
        <p className="text-sm text-muted mb-3">La zona «Fuera del navegador» del Mundo 2 enseña lo que hay detrás de estas órdenes.</p>
        <ul className="flex flex-col gap-2">
          {ZONE_MISSIONS.map((id) => (
            <li key={id}>
              <a className="text-sky underline" href={href(`mision/${id}`)}>
                {missionById[id]?.title ?? id}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
