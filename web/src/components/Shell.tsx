// App chrome: HUD (character, level, XP, coins, streak), navigation, toasts, celebrations.
import { useEffect, useState, type ReactNode } from "react";
import { missionById } from "../content";
import { useGame } from "../engine/store";
import { href } from "../router";
import { Avatar, PixelIcon } from "./pixel";

const NAV: { path: string; label: string; icon: string; main?: boolean }[] = [
  { path: "", label: "Inicio", icon: "star", main: true },
  { path: "mapa", label: "Mapa", icon: "tower", main: true },
  { path: "gimnasio", label: "Gimnasio", icon: "flame", main: true },
  { path: "repaso", label: "Repaso", icon: "book", main: true },
  { path: "labs", label: "Laboratorios", icon: "dice" },
  { path: "proyectos", label: "Proyectos", icon: "column" },
  { path: "progreso", label: "Progreso", icon: "chart" },
  { path: "inventario", label: "Inventario", icon: "coin" },
  { path: "portafolio", label: "Portafolio", icon: "table" },
  { path: "certificados", label: "Certificados", icon: "scale" },
  { path: "ajustes", label: "Ajustes", icon: "gear" },
];

function Hud() {
  const { state, summary } = useGame();
  const lv = summary.level;
  const pct = Math.round((lv.intoLevel / lv.levelSpan) * 100);
  return (
    <div className="flex items-center gap-3 min-w-0">
      {state.profile && (
        <a href={href("inventario")} className="shrink-0 bg-night p-1 rounded-[2px] shadow-px" aria-label="Personaje e inventario">
          <Avatar avatar={state.profile.avatar} scale={2} withPet={false} />
        </a>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-pixel text-gold text-sm">Nv. {lv.level}</span>
          <span className="text-xs text-muted truncate">{state.profile?.name}</span>
        </div>
        <div className="bar w-28 sm:w-40 mt-1" role="progressbar" aria-valuemin={0} aria-valuemax={lv.levelSpan} aria-valuenow={lv.intoLevel} aria-label={`Experiencia: ${lv.intoLevel} de ${lv.levelSpan} para el nivel ${lv.level + 1}`}>
          <div className="h-full bg-sky" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[11px] text-muted mt-0.5 tabular-nums">
          {lv.intoLevel} / {lv.levelSpan} XP
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="flex items-center gap-1 font-pixel text-gold tabular-nums" title="Monedas">
          <PixelIcon name="coin" size={16} title="Monedas" /> {summary.coins}
        </span>
        <span className="flex items-center gap-1 font-pixel text-ember tabular-nums" title={`Racha: ${summary.streak.current} días · descansos disponibles: ${summary.streak.freezes}`}>
          <PixelIcon name="flame" size={16} title="Racha" /> {summary.streak.current}
        </span>
      </div>
    </div>
  );
}

function Toasts() {
  const { toasts } = useGame();
  return (
    <div className="fixed z-50 left-1/2 -translate-x-1/2 bottom-24 lg:bottom-6 flex flex-col gap-2 w-[min(92vw,420px)]" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`px-panel px-4 py-3 text-sm animate-pop ${t.tone === "good" ? "text-leaf" : t.tone === "bad" ? "text-ember" : "text-text"}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Confetti() {
  const { state } = useGame();
  const fancy = state.owned.includes("confeti") || state.owned.includes("estrellas");
  const n = fancy ? 60 : 24;
  const colors = ["#f2c14e", "#5ad1e8", "#6fd672", "#ff7a59", "#a996ff", "#ff9fc2"];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-40" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: `${(i * 37) % 100}%`,
            top: 0,
            width: 6,
            height: 6,
            background: colors[i % colors.length],
            animation: `pq-confetti ${1.6 + (i % 7) * 0.2}s ${(i % 10) * 0.05}s ease-in forwards`,
            ["--dx" as string]: `${((i * 53) % 120) - 60}px`,
          }}
        />
      ))}
    </div>
  );
}

function CelebrationModal() {
  const { celebrations, dismissCelebration, state } = useGame();
  const c = celebrations[0];
  useEffect(() => {
    if (!c) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissCelebration();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [c, dismissCelebration]);
  if (!c) return null;
  let title = "";
  let body: ReactNode = null;
  if (c.kind === "mission") {
    const m = missionById[c.missionId];
    title = m?.kind === "project" ? "¡Proyecto completado!" : "¡Misión completada!";
    body = (
      <>
        <p className="text-lg">{m?.title}</p>
        <div className="flex justify-center gap-6 mt-4 font-pixel text-xl">
          <span className="text-sky">+{c.xp} XP</span>
          <span className="text-gold flex items-center gap-1">
            <PixelIcon name="coin" size={18} /> +{c.coins}
          </span>
        </div>
        <p className="text-sm text-muted mt-3">Responde la pregunta de interpretación y prueba el reto avanzado para ganar más.</p>
      </>
    );
  } else if (c.kind === "level") {
    title = `¡Nivel ${c.level}!`;
    body = <p>Tu personaje se hace más fuerte. Revisa la tienda: hay objetos nuevos para tu nivel.</p>;
  } else {
    title = "¡Logro desbloqueado!";
    body = (
      <p className="text-lg">
        {c.title} <span className="text-gold">(+20 monedas)</span>
      </p>
    );
  }
  return (
    <>
      {!state.settings.reducedMotion && <Confetti />}
      <div className="fixed inset-0 z-50 bg-ink/80 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
        <div className="px-panel-gold p-6 max-w-sm w-full text-center animate-pop">
          {state.profile && (
            <div className="flex justify-center mb-3 animate-bob">
              <Avatar avatar={state.profile.avatar} scale={5} animate />
            </div>
          )}
          <h2 id="celebration-title" className="px-title text-gold text-2xl">
            {title}
          </h2>
          <div className="mt-2">{body}</div>
          <button className="btn-gold mt-5 w-full" onClick={dismissCelebration} autoFocus>
            Continuar
          </button>
        </div>
      </div>
    </>
  );
}

/** Counts active learning time while the tab is visible and the learner interacted recently. */
function useActiveTime() {
  const { update } = useGame();
  useEffect(() => {
    let lastInput = Date.now();
    const mark = () => (lastInput = Date.now());
    const evs = ["keydown", "pointerdown", "scroll", "input"] as const;
    evs.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    let pending = 0;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === "visible" && now - lastInput < 90_000) pending += now - last;
      last = now;
      if (pending >= 30_000) {
        const ms = pending;
        pending = 0;
        import("../engine/actions").then((A) => update((s) => A.addTime(s, ms)));
      }
    }, 5000);
    return () => {
      clearInterval(id);
      evs.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [update]);
}

export function Shell({ route, children }: { route: string; children: ReactNode }) {
  const { saved, state, summary } = useGame();
  const [more, setMore] = useState(false);
  useActiveTime();
  useEffect(() => setMore(false), [route]);
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", state.settings.reducedMotion);
  }, [state.settings.reducedMotion]);
  const active = (p: string) => (p === "" ? route === "" : route === p || route.startsWith(p + "/"));
  return (
    <div className="min-h-full flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-gold focus:text-ink">
        Saltar al contenido
      </a>
      <header className="sticky z-30 bg-ink/95 backdrop-blur border-b-2 border-line" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-4">
          <a href={href("")} className="font-pixel text-lg leading-none shrink-0 hidden sm:block">
            <span className="text-gold">PYTHON</span> <span className="text-sky">QUEST</span>
          </a>
          <div className="flex-1 min-w-0">{state.profile && <Hud />}</div>
          {!saved && (
            <span className="chip text-ember" title="No se pudo guardar en este navegador. Exporta tu progreso desde Ajustes.">
              Sin guardar
            </span>
          )}
        </div>
        {state.profile && (
          <nav className="hidden lg:block border-t-2 border-line/60" aria-label="Principal">
            <ul className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
              {NAV.map((n) => (
                <li key={n.path}>
                  <a
                    href={href(n.path)}
                    aria-current={active(n.path) ? "page" : undefined}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-bold whitespace-nowrap border-b-4 ${active(n.path) ? "border-gold text-gold" : "border-transparent text-muted hover:text-text"}`}
                  >
                    <PixelIcon name={n.icon} size={14} />
                    {n.label}
                    {n.path === "repaso" && summary.due.length > 0 && <span className="chip bg-ember text-ink">{summary.due.length}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main id="main" className="flex-1 w-full max-w-6xl mx-auto px-4 pt-5 pb-28 lg:pb-12">
        {children}
      </main>
      {state.profile && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-night border-t-2 border-line" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} aria-label="Principal">
          {more && (
            <ul className="grid grid-cols-3 gap-2 p-3 border-b-2 border-line">
              {NAV.filter((n) => !n.main).map((n) => (
                <li key={n.path}>
                  <a href={href(n.path)} className={`flex flex-col items-center gap-1 p-2 text-xs font-bold ${active(n.path) ? "text-gold" : "text-muted"}`}>
                    <PixelIcon name={n.icon} size={18} />
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <ul className="grid grid-cols-5">
            {NAV.filter((n) => n.main).map((n) => (
              <li key={n.path}>
                <a href={href(n.path)} aria-current={active(n.path) ? "page" : undefined} className={`relative flex flex-col items-center gap-1 py-2 text-[11px] font-bold ${active(n.path) ? "text-gold" : "text-muted"}`}>
                  <PixelIcon name={n.icon} size={18} />
                  {n.label}
                  {n.path === "repaso" && summary.due.length > 0 && <span className="absolute top-1 right-[22%] w-2 h-2 bg-ember" />}
                </a>
              </li>
            ))}
            <li>
              <button onClick={() => setMore((m) => !m)} aria-expanded={more} className={`w-full flex flex-col items-center gap-1 py-2 text-[11px] font-bold ${more ? "text-gold" : "text-muted"}`}>
                <PixelIcon name="gear" size={18} />
                Más
              </button>
            </li>
          </ul>
        </nav>
      )}
      <Toasts />
      <CelebrationModal />
    </div>
  );
}
