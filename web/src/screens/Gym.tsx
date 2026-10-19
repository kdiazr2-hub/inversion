// Practice gym: short exercises with many variants for the concepts of completed missions.
// The list and the session use the catalog; the exercise generators load with this screen.
import { useEffect, useMemo, useState } from "react";
import { DRILLS, drillMetaById, loadPractice, missionById, WORLDS } from "../content";
import { text, type Drill, type DrillMeta } from "../content/types";
import { CodeEditor } from "../components/CodeEditor";
import { Markdown } from "../components/Markdown";
import { PixelIcon } from "../components/pixel";
import { OutputPanel, RunnerStatus, useExec, useRunner, type PanelResult } from "../components/PythonPanel";
import * as A from "../engine/actions";
import { buildSession, drillStats, DRILL_DAILY_XP_CAP, DRILL_XP, isDrillUnlocked, pickSeed } from "../engine/derive";
import { CONTENT, useGame } from "../engine/store";
import { python } from "../python/runner";
import { go, href } from "../router";

type Practice = Awaited<ReturnType<typeof loadPractice>>;

/** Route to a fresh variant of a drill, keeping the rest of a session or the review it answers. */
const drillPath = (id: string, seed: number, tail = "") => `practica/${id}/${seed}${tail}`;

export function Gym() {
  const { state, summary } = useGame();
  const unlocked = DRILLS.filter((d) => isDrillUnlocked(state, d));
  const startSession = () => {
    const ids = buildSession(state, CONTENT, DRILLS, 5);
    if (!ids.length) return;
    const [first, ...rest] = ids;
    go(drillPath(first, pickSeed(state, first), rest.length ? `/sesion/${rest.join(",")}` : ""));
  };
  const p = summary.practice;
  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="px-title text-gold text-2xl">Gimnasio</h1>
        <p className="text-muted text-sm mt-1">
          Ejercicios cortos para practicar lo que ya aprendiste en las misiones. Cada uno tiene 40 variantes con otros datos, otras reglas u otra redacción, así que repetirlo no es repetir la misma respuesta. Todas las variantes se comprueban automáticamente: la solución de referencia pasa sus pruebas y el código inicial no.
        </p>
      </div>
      <section className="px-panel p-4 flex flex-col gap-3" aria-labelledby="sesion-h">
        <h2 id="sesion-h" className="font-bold">Sesión rápida</h2>
        <p className="text-sm text-muted">Cinco ejercicios mezclados: primero los de misiones con repaso pendiente y los que menos has practicado, alternando temas para que cada idea se fije mejor.</p>
        <div className="flex flex-wrap gap-3 items-center">
          <button className="btn-gold" onClick={startSession} disabled={!unlocked.length} data-testid="gym-session">
            Empezar sesión
          </button>
          <span className="text-sm" data-testid="gym-xp">
            Hoy: {p.xpToday} de {DRILL_DAILY_XP_CAP} XP del gimnasio ({DRILL_XP} XP por cada variante nueva resuelta sin ver la solución)
          </span>
        </div>
        {!unlocked.length && (
          <p className="text-sm">
            Todavía no hay ejercicios disponibles: cada uno se abre al completar su misión. <a className="text-sky underline" href={href("mapa")}>Ir al mapa</a>
          </p>
        )}
      </section>
      {WORLDS.map((w) => {
        const list = DRILLS.filter((d) => d.world === w.id);
        if (!list.length) return null;
        return (
          <section key={w.id} aria-labelledby={`gym-${w.id}`} className="flex flex-col gap-3">
            <h2 id={`gym-${w.id}`} className="px-title text-sky text-sm">
              {w.name}
            </h2>
            <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {list.map((d) => (
                <DrillCard key={d.id} d={d} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function DrillCard({ d }: { d: DrillMeta }) {
  const { state } = useGame();
  const open = isDrillUnlocked(state, d);
  const st = drillStats(state, d.id);
  const mission = missionById[d.mission];
  return (
    <li className={`px-panel p-3 flex flex-col gap-2 ${open ? "" : "opacity-70"}`} data-testid="drill-card">
      <div className="flex items-center gap-2">
        <PixelIcon name={open ? "flame" : "lock"} size={16} />
        <h3 className="font-bold flex-1">{d.title}</h3>
        <span className="text-xs text-muted" aria-label={`Dificultad ${d.difficulty} de 5`}>
          {"★".repeat(d.difficulty)}
        </span>
      </div>
      <p className="text-xs text-muted">
        Practica «{mission?.title}»{d.packages?.length ? ` · usa ${d.packages.join(", ")}` : ""}
      </p>
      {open ? (
        <div className="flex items-center gap-2 justify-between">
          <span className="text-xs">{st.solved} de 40 variantes resueltas</span>
          <button className="btn-sky text-sm" onClick={() => go(drillPath(d.id, pickSeed(state, d.id)))}>
            Practicar
          </button>
        </div>
      ) : (
        <p className="text-xs">
          Se abre al completar <a className="text-sky underline" href={href(`mision/${d.mission}`)}>{mission?.title}</a>.
        </p>
      )}
    </li>
  );
}

/** Loads the drill generators once; a failed download is shown with a reload button. */
function usePractice() {
  const [mod, setMod] = useState<Practice | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadPractice().then(
      (m) => live && setMod(m),
      (e: unknown) => live && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      live = false;
    };
  }, []);
  return { mod, error };
}

export function DrillView({ id, seed, mode, extra }: { id: string; seed: number; mode?: string; extra?: string }) {
  const { state } = useGame();
  const meta = drillMetaById[id];
  const { mod, error } = usePractice();
  const review = mode === "repaso" && extra ? extra : undefined;
  const session = mode === "sesion" && extra ? extra.split(",").filter((x) => drillMetaById[x]) : [];
  if (!meta) return <p>No existe ese ejercicio. <a className="text-sky underline" href={href("gimnasio")}>Volver al gimnasio</a></p>;
  if (!isDrillUnlocked(state, meta))
    return (
      <div className="px-panel p-6 max-w-xl">
        <h1 className="px-title text-xl text-gold flex items-center gap-2">
          <PixelIcon name="lock" size={20} /> Ejercicio bloqueado
        </h1>
        <p className="mt-2">
          Se abre al completar la misión <a className="text-sky underline" href={href(`mision/${meta.mission}`)}>{missionById[meta.mission]?.title}</a>.
        </p>
      </div>
    );
  if (error)
    return (
      <div className="px-panel p-6 max-w-xl flex flex-col gap-3" role="alert">
        <h1 className="px-title text-xl text-ember">No se pudo cargar el gimnasio</h1>
        <p>{error}</p>
        <p className="text-sm text-muted">Comprueba tu conexión y recarga la página. Tu progreso está guardado en este navegador.</p>
        <button className="btn-gold self-start" onClick={() => location.reload()}>
          Recargar la página
        </button>
      </div>
    );
  if (!mod)
    return (
      <p className="px-panel p-6 max-w-xl text-muted" role="status">
        Preparando el ejercicio…
      </p>
    );
  const drill = mod.drillById[id];
  if (!Number.isInteger(seed) || seed < 1 || seed > mod.DRILL_VARIANTS)
    return (
      <p role="alert">
        Esa variante no existe. <button className="text-sky underline" onClick={() => go(drillPath(id, pickSeed(state, id)))}>Abrir otra variante</button>
      </p>
    );
  return <DrillScreen drill={drill} meta={meta} seed={seed} variants={mod.DRILL_VARIANTS} variant={mod.drillVariant(drill, seed)} review={review} session={session} />;
}

function DrillScreen({
  drill,
  meta,
  seed,
  variants,
  variant,
  review,
  session,
}: {
  drill: Drill;
  meta: DrillMeta;
  seed: number;
  variants: number;
  variant: ReturnType<Practice["drillVariant"]>;
  review?: string;
  session: string[];
}) {
  const { state, update, toast, summary } = useGame();
  const runner = useRunner();
  const { exec, busy } = useExec();
  const [code, setCode] = useState(variant.starter);
  const [out, setOut] = useState<PanelResult>(null);
  const [hints, setHints] = useState(0);
  const [failedChecks, setFailedChecks] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [solved, setSolved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const before = useMemo(() => drillStats(state, drill.id).seeds.has(seed), []); // eslint-disable-line react-hooks/exhaustive-deps
  const mission = missionById[meta.mission];
  const solutionAllowed = !review && (failedChecks >= 2 || hints >= drill.hints.length);

  useEffect(() => {
    void python.boot().catch(() => {});
  }, []);

  const run = async (check: boolean) => {
    if (busy) return;
    const r = await exec({ code, tests: check ? variant.tests : undefined, stdin: variant.stdin, files: variant.files });
    setOut(r);
    if (!r || "failure" in r) return;
    if (!check) {
      update((s) => A.recordRun(s));
      return;
    }
    if (!r.result.passed) {
      setFailedChecks((n) => n + 1);
      const passed = r.result.tests.filter((t) => t.passed).length;
      toast(`${passed} de ${r.result.tests.length} pruebas superadas. Revisa los mensajes.`, "bad");
      return;
    }
    if (solved) return;
    setSolved(true);
    const capped = summary.practice.capReached;
    update((s) => A.recordDrill(s, drill.id, seed, { hints, sol: showSolution, review }));
    if (review) toast(hints ? "Repaso superado con pistas: volverá pronto." : "Repaso superado sin ayuda: el próximo será más tarde.", "good");
    else if (showSolution) toast("Superado tras ver la solución: no suma XP, pero cuenta como práctica.", "info");
    else if (before) toast("Ya habías resuelto esta variante: prueba otra para sumar XP.", "info");
    else if (capped) toast(`Hoy ya sumaste ${DRILL_DAILY_XP_CAP} XP en el gimnasio: sigue practicando, mañana vuelve a contar.`, "info");
    else toast(`¡Ejercicio superado! +${DRILL_XP} XP`, "good");
  };

  const next = () => {
    if (session.length) {
      const [first, ...rest] = session;
      go(drillPath(first, pickSeed(state, first), rest.length ? `/sesion/${rest.join(",")}` : ""));
    } else go(drillPath(drill.id, pickSeed(state, drill.id)));
  };

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    setConfirmReset(false);
    setCode(variant.starter);
    setOut(null);
  };

  const running = runner.state === "running" || runner.state === "packages" || busy;
  const errorLine = out && "result" in out ? out.result.error?.line ?? null : null;

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="flex flex-col gap-4 min-w-0">
        <div>
          <div className="label">
            <a className="underline" href={href("gimnasio")}>
              Gimnasio
            </a>{" "}
            · {review ? "Repaso" : session.length ? `Sesión · quedan ${session.length}` : "Práctica"} · variante {seed} de {variants}
          </div>
          <h1 className="px-title text-gold text-xl mt-1">{drill.title}</h1>
          <p className="text-xs text-muted mt-1">
            Practica «<a className="underline" href={href(`mision/${meta.mission}`)}>{mission?.title}</a>» · {"★".repeat(drill.difficulty)}
            {drill.packages?.length ? ` · usa ${drill.packages.join(", ")} (se descarga la primera vez)` : ""}
          </p>
        </div>
        <section className="px-panel p-4" aria-label="Enunciado" data-testid="drill-prompt">
          <Markdown text={text(variant.prompt)} />
          {variant.files && <p className="text-xs text-muted mt-3">Archivos disponibles en la carpeta del programa: {Object.keys(variant.files).join(", ")}.</p>}
        </section>
        <section className="px-panel p-4 flex flex-col gap-2" aria-labelledby="pistas-h">
          <h2 id="pistas-h" className="font-bold text-sm">
            Pistas ({hints} de {drill.hints.length})
          </h2>
          {drill.hints.slice(0, hints).map((h, i) => (
            <Markdown key={i} text={h} className="text-sm" />
          ))}
          {hints < drill.hints.length && !solved && (
            <button className="btn-ghost self-start text-sm" onClick={() => setHints((n) => n + 1)}>
              Ver una pista
            </button>
          )}
          {!review && !solved && (
            <p className="text-xs text-muted">
              {solutionAllowed ? "" : "La solución se desbloquea después de comprobar dos veces o de ver todas las pistas. "}
              Pedir pistas no quita XP aquí; ver la solución sí.
            </p>
          )}
          {solutionAllowed && !showSolution && !solved && (
            <button className="btn-ghost self-start text-sm" onClick={() => setShowSolution(true)}>
              Ver la solución de referencia
            </button>
          )}
          {(showSolution || (solved && !review)) && (
            <pre className="font-mono text-[12.5px] bg-ink p-3 rounded-[2px] overflow-x-auto" data-testid="drill-solution">
              {variant.solution}
            </pre>
          )}
        </section>
      </div>
      <div className="flex flex-col gap-3 min-w-0 lg:sticky lg:top-28">
        <div className="flex justify-end">
          <RunnerStatus />
        </div>
        <div className="px-panel overflow-hidden">
          <CodeEditor
            value={code}
            onChange={setCode}
            onRun={() => run(false)}
            onCheck={() => run(true)}
            label={`Editor de Python: ${drill.title}`}
            theme={state.settings.editorTheme}
            fontSize={state.settings.fontSize}
            errorLine={errorLine}
            minHeight={220}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {running ? (
            <button className="btn-ember" onClick={() => python.stop()}>
              ■ Detener
            </button>
          ) : (
            <button className="btn-sky" onClick={() => run(false)} title="Ctrl/Cmd + Enter">
              ▶ Ejecutar
            </button>
          )}
          <button className="btn-leaf" disabled={running} onClick={() => run(true)} title="Mayús + Ctrl/Cmd + Enter" data-testid="check">
            ✔ Comprobar
          </button>
          <button className="btn-ghost" onClick={reset}>
            {confirmReset ? "¿Seguro? Pulsa otra vez" : "↺ Reiniciar"}
          </button>
        </div>
        <div className="bg-night rounded-[2px] shadow-px">
          <OutputPanel out={out} />
        </div>
        {solved && (
          <div className="px-panel-gold p-4 flex flex-col gap-2" data-testid="drill-solved">
            <p className="font-bold">{review ? "Repaso registrado." : "¡Superado!"}</p>
            <div className="flex flex-wrap gap-2">
              {review ? (
                <a className="btn-gold" href={href("repaso")}>
                  Volver a los repasos
                </a>
              ) : (
                <button className="btn-gold" onClick={next}>
                  {session.length ? "Siguiente ejercicio" : "Otra variante"}
                </button>
              )}
              <a className="btn-ghost" href={href("gimnasio")}>
                Volver al gimnasio
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
