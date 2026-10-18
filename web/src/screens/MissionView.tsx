// A mission: story → intuition → formal → example → challenge (editor, console, tests)
// → hints → common errors → solution → interpretation → advanced challenge → review advice.
import { useEffect, useMemo, useRef, useState } from "react";
import { loadedWorld, loadWorld, missionById, MISSIONS, previousStage, seriesStages, stageLabel, stageStartCode } from "../content";
import { text, type Mission, type MissionMeta, type WorldId } from "../content/types";
import { worldById } from "../content/worlds";
import { CodeEditor } from "../components/CodeEditor";
import { Markdown } from "../components/Markdown";
import { PixelIcon } from "../components/pixel";
import { OutputPanel, RunnerStatus, useRunner, type PanelResult } from "../components/PythonPanel";
import { Scene } from "../components/Scene";
import * as A from "../engine/actions";
import { isMissionUnlocked, missionReward } from "../engine/derive";
import { CONTENT, useGame } from "../engine/store";
import { python, RunStopped, RunTimeout } from "../python/runner";
import type { RunRequest } from "../python/types";
import { go, href } from "../router";

function Section({ id, title, children, tone = "text-sky" }: { id: string; title: string; children: React.ReactNode; tone?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-28">
      <h2 id={`${id}-h`} className={`px-title text-sm mb-2 ${tone}`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function useExec() {
  const { state } = useGame();
  const [busy, setBusy] = useState(false);
  python.timeoutMs = state.settings.timeoutSec * 1000;
  const exec = async (req: RunRequest): Promise<PanelResult> => {
    setBusy(true);
    try {
      const result = await python.run(req);
      return { result, checked: Boolean(req.tests) };
    } catch (e) {
      if (e instanceof RunTimeout || e instanceof RunStopped) return { failure: e.message };
      return { failure: `No se pudo ejecutar: ${(e as Error).message}. Comprueba tu conexión: Python se descarga la primera vez.` };
    } finally {
      setBusy(false);
    }
  };
  return { exec, busy };
}

function Example({ m }: { m: Mission }) {
  const { state, update } = useGame();
  const [code, setCode] = useState(m.example.code);
  const [out, setOut] = useState<PanelResult>(null);
  const { exec, busy } = useExec();
  const codeLines = m.example.code.split("\n").filter((l) => l.trim());
  return (
    <div className="flex flex-col gap-3">
      <div className="h-auto">
        <CodeEditor value={code} onChange={setCode} label="Editor del ejemplo" theme={state.settings.editorTheme} fontSize={state.settings.fontSize - 1} minHeight={80} onRun={() => run()} />
      </div>
      <div className="flex gap-2 flex-wrap">
        <button className="btn-sky" disabled={busy} onClick={() => run()}>
          ▶ Ejecutar ejemplo
        </button>
        {code !== m.example.code && (
          <button className="btn-ghost" onClick={() => setCode(m.example.code)}>
            Restaurar
          </button>
        )}
      </div>
      {out && (
        <div className="bg-night rounded-[2px]">
          <OutputPanel out={out} />
        </div>
      )}
      <div>
        <div className="label mb-2">Línea a línea</div>
        <ol className="flex flex-col gap-2">
          {codeLines.map((line, i) => (
            <li key={i} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1 sm:gap-3 text-sm">
              <code className="font-mono text-[12.5px] bg-ink px-2 py-1 rounded-[2px] text-sky overflow-x-auto whitespace-pre">{line}</code>
              <span className="text-muted">
                <Markdown text={m.example.lines[i] ?? ""} />
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
  async function run() {
    const r = await exec({ code, stdin: m.example.stdin, files: m.files });
    setOut(r);
    update((s) => A.recordRun(s));
  }
}

function Quiz({ m }: { m: Mission }) {
  const { state, update } = useGame();
  const answers = state.quizzes.filter((q) => q.m === m.id);
  const [choice, setChoice] = useState<number | null>(null);
  const last = answers[answers.length - 1];
  const solved = answers.some((a) => a.ok);
  return (
    <div className="flex flex-col gap-3">
      <div className="font-bold whitespace-pre-line">{m.quiz.question}</div>
      <div role="radiogroup" aria-label="Opciones" className="flex flex-col gap-2">
        {m.quiz.options.map((o, i) => {
          const picked = choice === i;
          const wasWrong = answers.some((a) => a.choice === i && !a.ok);
          const isRight = solved && i === m.quiz.answer;
          return (
            <button
              key={i}
              role="radio"
              aria-checked={picked}
              onClick={() => setChoice(i)}
              disabled={solved}
              className={`text-left p-3 rounded-[2px] border-2 text-sm ${isRight ? "border-leaf bg-leaf/10" : wasWrong ? "border-ember/60 bg-ember/5 line-through decoration-ember/60" : picked ? "border-gold bg-gold/10" : "border-line hover:border-muted"}`}
            >
              {o.text}
            </button>
          );
        })}
      </div>
      {!solved && (
        <button className="btn-gold self-start" disabled={choice === null} onClick={() => choice !== null && update((s) => A.answerQuiz(s, m, choice))}>
          Responder
        </button>
      )}
      {last && (
        <div className={`p-3 rounded-[2px] text-sm ${last.ok ? "bg-leaf/10 text-text" : "bg-ember/10"}`} role="status">
          <strong className={last.ok ? "text-leaf" : "text-ember"}>{last.ok ? "Correcto." : "No es esa."}</strong>{" "}
          {last.ok ? <Markdown text={text(m.quiz.explanation)} className="inline" /> : "Piensa en la explicación de la misión y vuelve a intentarlo. Tu error queda registrado para proponerte repasos."}
          {answers[0]?.ok && last.ok && <span className="block text-gold mt-1">+10 XP por acertar al primer intento</span>}
        </div>
      )}
    </div>
  );
}

function StageBanner({ m }: { m: Mission }) {
  const { state } = useGame();
  const stages = seriesStages(m.series!.id);
  return (
    <nav className="px-panel-gold p-3 flex flex-col gap-2" aria-label="Etapas del proyecto">
      <div className="label">
        Proyecto progresivo · Etapa {m.series!.stage} de {m.series!.of}
      </div>
      <div className="font-pixel text-gold">{m.series!.title}</div>
      <ol className="flex flex-wrap gap-2 text-sm">
        {stages.map((st) => {
          const done = Boolean(state.missions[st.id]?.done);
          const current = st.id === m.id;
          return (
            <li key={st.id}>
              <a
                href={href(`mision/${st.id}`)}
                aria-current={current ? "step" : undefined}
                className={`chip ${current ? "bg-gold text-ink" : done ? "text-leaf" : "text-muted"}`}
              >
                {done ? "✔ " : ""}
                {st.series!.stage}. {stageLabel(st)}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Full missions of a world, loaded on demand. Browsers remember a failed module download for the
 * life of the page, so recovering from one takes a page reload.
 */
function useWorldMissions(world: WorldId | undefined) {
  const [loaded, setLoaded] = useState<{ world?: WorldId; missions?: Record<string, Mission>; error?: string }>({});
  useEffect(() => {
    if (!world || loadedWorld(world)) return;
    let live = true;
    setLoaded({ world });
    loadWorld(world).then(
      (missions) => live && setLoaded({ world, missions }),
      (e: unknown) => live && setLoaded({ world, error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, [world]);
  const ready = world ? loadedWorld(world) : undefined;
  return { missions: ready ?? (loaded.world === world ? loaded.missions : undefined), error: !ready && loaded.world === world ? loaded.error : undefined };
}

export function MissionView({ id, review }: { id: string; review: boolean }) {
  const meta = missionById[id];
  const { state } = useGame();
  const content = useWorldMissions(meta?.world);
  if (!meta) return <p>No existe esa misión. <a className="text-sky underline" href={href("mapa")}>Volver al mapa</a></p>;
  const world = worldById[meta.world];

  if (!isMissionUnlocked(state, CONTENT, meta) && !state.missions[id]?.done)
    return (
      <div className="px-panel p-6 max-w-xl">
        <h1 className="px-title text-xl text-gold flex items-center gap-2">
          <PixelIcon name="lock" size={20} /> Misión bloqueada
        </h1>
        <p className="mt-2">Para abrir «{meta.title}» completa antes:</p>
        <ul className="list-[square] pl-5 mt-2">
          {meta.requires.filter((r) => !state.missions[r]?.done).map((r) => (
            <li key={r}>
              <a className="text-sky underline" href={href(`mision/${r}`)}>
                {missionById[r]?.title}
              </a>
            </li>
          ))}
          {meta.requires.length === 0 && <li>Desbloquea el mundo «{world.name}» desde el mapa.</li>}
        </ul>
      </div>
    );

  if (content.error)
    return (
      <div className="px-panel p-6 max-w-xl flex flex-col gap-3" role="alert">
        <h1 className="px-title text-xl text-ember">No se pudo cargar la misión</h1>
        <p>El contenido de «{world.name}» no se descargó: {content.error}</p>
        <p className="text-sm text-muted">Comprueba tu conexión y recarga la página. Tu progreso está guardado en este navegador.</p>
        <button className="btn-gold self-start" onClick={() => location.reload()}>
          Recargar la página
        </button>
      </div>
    );
  if (!content.missions)
    return (
      <p className="px-panel p-6 max-w-xl text-muted" role="status" data-testid="mission-loading">
        Cargando «{meta.title}»…
      </p>
    );
  const m = content.missions[id];
  if (!m) return <p role="alert">El contenido de la misión {id} no está en el mundo {world.name}.</p>;
  const prevMeta = previousStage(meta);
  return <MissionScreen m={m} meta={meta} prev={prevMeta ? content.missions[prevMeta.id] : undefined} review={review} />;
}

function MissionScreen({ m, meta, prev, review }: { m: Mission; meta: MissionMeta; prev: Mission | undefined; review: boolean }) {
  const id = m.id;
  const { state, update, toast } = useGame();
  const runner = useRunner();
  const rec = state.missions[id];
  const [mode, setMode] = useState<"main" | "advanced">("main");
  // Stage n of a progressive project starts from the learner's code of stage n − 1 (the reference
  // solution in review mode, or if that code was never saved).
  const freshStarter = stageStartCode(m, prev, review || !prev ? undefined : state.missions[prev.id]?.code);
  const initialCode = useMemo(() => (review ? freshStarter : rec?.code ?? freshStarter), [id, review]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirmCarry, setConfirmCarry] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [advCode, setAdvCode] = useState(m.advanced ? rec?.advancedCode ?? m.advanced.starter : "");
  const [out, setOut] = useState<PanelResult>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [reviewHints, setReviewHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [mobileTab, setMobileTab] = useState<"leccion" | "codigo">("leccion");
  const [reviewGraded, setReviewGraded] = useState<null | string>(null);
  const { exec, busy } = useExec();
  const draftTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setCode(initialCode);
    setOut(null);
    setMode("main");
    setShowSolution(false);
    setReviewHints(0);
    setReviewGraded(null);
    if (m.advanced) setAdvCode(state.missions[id]?.advancedCode ?? m.advanced.starter);
  }, [id, review]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void python.boot().catch(() => {});
  }, []);

  const world = worldById[m.world];

  const adv = mode === "advanced" && m.advanced;
  const currentCode = adv ? advCode : code;
  const hintsShown = review ? reviewHints : rec?.done ? m.hints.length : rec?.hints ?? 0;
  const solutionAllowed = review ? false : A.canSeeSolution(state, m);
  const reward = missionReward(meta, state);
  const idx = MISSIONS.findIndex((x) => x.id === m.id);
  const next = MISSIONS.slice(idx + 1).find((x) => x.world === m.world) ?? null;

  const onChange = (v: string) => {
    if (adv) setAdvCode(v);
    else setCode(v);
    if (review) return;
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => update((s) => A.saveDraft(s, m.id, v, Boolean(adv))), 700);
  };

  const run = async (check: boolean) => {
    if (busy) return;
    setMobileTab("codigo");
    const tests = check ? (adv ? m.advanced!.tests : m.tests) : undefined;
    const stdin = adv ? m.advanced!.stdin ?? m.stdin : m.stdin;
    const r = await exec({ code: currentCode, tests, stdin, files: m.files });
    setOut(r);
    if (!r || "failure" in r) {
      if (check) update((s) => A.recordCheck(s, CONTENT, m, { ok: false, passed: 0, total: 0, errorType: "Timeout" }, { advanced: Boolean(adv), review, code: currentCode }));
      return;
    }
    const res = r.result;
    if (!check) {
      update((s) => A.recordRun(s));
      return;
    }
    const passed = res.tests.filter((t) => t.passed).length;
    update((s) => A.recordCheck(s, CONTENT, m, { ok: res.passed, passed, total: res.tests.length, errorType: res.error?.type }, { advanced: Boolean(adv), review, code: currentCode }));
    if (res.passed && review && !reviewGraded) {
      const grade = reviewHints > 0 ? "hard" : "good";
      update((s) => A.recordReview(s, m.id, grade));
      setReviewGraded(grade);
      toast(grade === "good" ? "Repaso superado sin ayuda: el próximo será más tarde." : "Repaso superado con pistas: volverá pronto.", "good");
    } else if (res.passed && adv && !rec?.advancedDone) toast("¡Reto avanzado superado!", "good");
    else if (!res.passed) toast(`${passed} de ${res.tests.length} pruebas superadas. Revisa los mensajes.`, "bad");
  };

  const revealHint = () => {
    const n = Math.min(m.hints.length, hintsShown + 1);
    if (review) setReviewHints(n);
    else update((s) => A.revealHint(s, m.id, n));
  };

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    setConfirmReset(false);
    onChange(adv ? m.advanced!.starter : freshStarter);
    setOut(null);
  };

  const errorLine = out && "result" in out ? out.result.error?.line ?? null : null;
  const running = runner.state === "running" || runner.state === "packages" || busy;

  const startFromReference = () => {
    if (!confirmCarry) {
      setConfirmCarry(true);
      setTimeout(() => setConfirmCarry(false), 3000);
      return;
    }
    setConfirmCarry(false);
    setMode("main");
    onChange(stageStartCode(m, prev));
    setOut(null);
    setMobileTab("codigo");
  };

  const lesson = (
    <div className="flex flex-col gap-7">
      {m.series && <StageBanner m={m} />}
      {m.series && prev && !review && (
        <div className="px-panel p-3 text-sm flex flex-col gap-2" data-testid="stage-carry">
          <p>
            Tu editor empieza con <strong>tu código de la etapa anterior</strong> («{prev.title}») y, debajo, el esqueleto de esta etapa. Las pruebas de esta etapa pueden usar las funciones que ya escribiste.
          </p>
          <div>
            <button className="btn-ghost text-sm" onClick={startFromReference}>
              {confirmCarry ? "Pulsa otra vez: se reemplaza tu código" : "Empezar desde la solución de referencia de la etapa anterior"}
            </button>
          </div>
        </div>
      )}
      <Section id="historia" title="Historia">
        <Markdown text={text(m.story)} className="text-[17px]" />
      </Section>
      <Section id="objetivo" title="Objetivo de aprendizaje" tone="text-gold">
        <Markdown text={text(m.objective)} />
        <div className="label mt-3 mb-1">Antes de empezar deberías conocer</div>
        <ul className="list-[square] pl-5 text-sm text-muted">
          {m.before.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        {m.packages && m.packages.length > 0 && (
          <p className="text-sm text-muted mt-2">
            Esta misión usa <strong className="text-text">{m.packages.join(", ")}</strong>: la primera ejecución descarga los paquetes (puede tardar unos segundos).
          </p>
        )}
      </Section>
      <Section id="intuicion" title="Intuición">
        <Markdown text={text(m.intuition)} />
        {m.lab && (
          <a className="btn-sky mt-3 self-start inline-flex items-center gap-2" href={href(`labs/${m.lab.lab}/${m.lab.tab}`)} data-testid="lab-link">
            <PixelIcon name="dice" size={16} /> Experimenta en el laboratorio: {m.lab.label}
          </a>
        )}
      </Section>
      {m.formal && (
        <Section id="formal" title="Explicación formal" tone="text-violet">
          <div className="border-l-4 border-violet pl-4">
            <Markdown text={text(m.formal)} />
          </div>
        </Section>
      )}
      <Section id="ejemplo" title="Ejemplo ejecutable">
        <Example m={m} />
      </Section>
      <Section id="reto" title={review ? "Repaso: resuelve de nuevo el reto" : "Reto principal"} tone="text-gold">
        <div className="px-panel-gold p-4">
          <Markdown text={text(m.challenge)} />
        </div>
      </Section>
      <Section id="pistas" title="Pistas progresivas">
        <ol className="flex flex-col gap-2">
          {m.hints.slice(0, hintsShown).map((h, i) => (
            <li key={i} className="bg-night p-3 rounded-[2px] text-sm">
              <span className="font-pixel text-gold mr-2">{i + 1}.</span>
              <Markdown text={h} className="inline-block" />
            </li>
          ))}
        </ol>
        {hintsShown < m.hints.length ? (
          <button className="btn-ghost mt-2" onClick={revealHint}>
            Obtener pista {hintsShown + 1} de {m.hints.length}
          </button>
        ) : (
          <p className="text-sm text-muted mt-2">Ya viste todas las pistas.</p>
        )}
        {!rec?.done && !review && hintsShown === 0 && <p className="text-xs text-muted mt-2">Resolver sin pistas da un 25 % más de XP. Pedir ayuda está bien: aprender importa más que el bonus.</p>}
      </Section>
      <Section id="errores" title="Errores frecuentes" tone="text-ember">
        <ul className="flex flex-col gap-2">
          {m.errors.map((e, i) => (
            <li key={i} className="text-sm">
              <code className="font-mono text-ember">{e.error}</code>
              <div className="text-muted">
                <Markdown text={e.fix} />
              </div>
            </li>
          ))}
        </ul>
      </Section>
      {!review && (
        <Section id="solucion" title="Solución de referencia" tone="text-violet">
          {showSolution ? (
            <div>
              <pre className="font-mono text-[13px] bg-ink p-3 rounded-[2px] overflow-x-auto shadow-[inset_0_0_0_2px_#2c3f6b]">{m.solution}</pre>
              <p className="text-sm text-muted mt-2">Hay muchas soluciones correctas. Compárala con la tuya: ¿qué hace distinto y por qué?</p>
            </div>
          ) : solutionAllowed ? (
            <div>
              {!rec?.done && <p className="text-sm text-muted mb-2">Si la abres antes de resolver el reto, la misión dará la mitad de XP y se programará un repaso pronto.</p>}
              <button
                className="btn-ghost"
                onClick={() => {
                  update((s) => A.revealSolution(s, m));
                  setShowSolution(true);
                }}
              >
                Ver la solución
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">Se desbloquea después de intentarlo: comprueba tu código al menos dos veces o usa todas las pistas.</p>
          )}
        </Section>
      )}
      {(rec?.done || review) && (
        <Section id="interpretacion" title="Pregunta de interpretación" tone="text-gold">
          <Quiz m={m} />
        </Section>
      )}
      {rec?.done && m.advanced && !review && (
        <Section id="avanzado" title="Misión opcional avanzada" tone="text-violet">
          <div className="px-panel p-4">
            <div className="font-pixel text-violet mb-1">{m.advanced.title}</div>
            <Markdown text={text(m.advanced.prompt)} />
            {rec.advancedDone ? (
              <p className="text-leaf text-sm mt-2">✔ Completado</p>
            ) : (
              <button
                className="btn-sky mt-3"
                onClick={() => {
                  setMode("advanced");
                  setOut(null);
                  setMobileTab("codigo");
                }}
              >
                Abrir en el editor
              </button>
            )}
          </div>
        </Section>
      )}
      {(rec?.done || review) && (
        <Section id="repaso" title="Recomendación de repaso">
          <Markdown text={text(m.review)} />
        </Section>
      )}
    </div>
  );

  const editor = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1" role="tablist" aria-label="Reto en el editor">
          <button role="tab" aria-selected={mode === "main"} className={`chip ${mode === "main" ? "bg-gold text-ink" : ""}`} onClick={() => (setMode("main"), setOut(null))}>
            {review ? "Repaso" : "Reto principal"}
          </button>
          {m.advanced && rec?.done && !review && (
            <button role="tab" aria-selected={mode === "advanced"} className={`chip ${mode === "advanced" ? "bg-violet text-ink" : ""}`} onClick={() => (setMode("advanced"), setOut(null))}>
              Avanzado
            </button>
          )}
        </div>
        <RunnerStatus />
      </div>
      <div className="px-panel overflow-hidden">
        <CodeEditor
          value={currentCode}
          onChange={onChange}
          onRun={() => run(false)}
          onCheck={() => run(true)}
          label={`Editor de Python: ${m.title}`}
          theme={state.settings.editorTheme}
          fontSize={state.settings.fontSize}
          errorLine={errorLine}
          minHeight={260}
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
        {mode === "main" && hintsShown < m.hints.length && (
          <button
            className="btn-ghost"
            onClick={() => {
              revealHint();
              setMobileTab("leccion");
              setTimeout(() => document.getElementById("pistas")?.scrollIntoView({ behavior: "smooth" }), 50);
            }}
          >
            Obtener pista
          </button>
        )}
        <button
          className="btn-ghost"
          onClick={() => {
            setMobileTab("leccion");
            setTimeout(() => document.getElementById("intuicion")?.scrollIntoView({ behavior: "smooth" }), 50);
          }}
        >
          Ver explicación
        </button>
      </div>
      <div className="bg-night rounded-[2px] shadow-px">
        <OutputPanel out={out} />
      </div>
      {review && reviewGraded && (
        <div className="px-panel-gold p-4">
          <p>Repaso registrado. </p>
          <a className="btn-gold mt-2" href={href("repaso")}>
            Siguiente repaso
          </a>
        </div>
      )}
      {review && !reviewGraded && (
        <button
          className="btn-ghost self-start text-sm"
          onClick={() => {
            update((s) => A.recordReview(s, m.id, "again"));
            setReviewGraded("again");
            toast("Anotado: lo repasaremos mañana.", "info");
          }}
        >
          No lo recuerdo: programar para mañana
        </button>
      )}
      {rec?.done && !review && (
        <div className="px-panel p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-leaf font-pixel">
            <PixelIcon name="check" size={16} /> Misión completada
          </div>
          <ul className="text-sm text-muted">
            {reward.parts.map((p) => (
              <li key={p.label}>
                {p.label}: <span className="text-sky">+{p.xp} XP</span> · <span className="text-gold">+{p.coins}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 flex-wrap mt-1">
            {next ? (
              <button className="btn-gold" onClick={() => go(`mision/${next.id}`)}>
                Siguiente misión →
              </button>
            ) : (
              <a className="btn-gold" href={href(`mundo/${m.world}`)}>
                Volver al mundo
              </a>
            )}
            <a className="btn-ghost" href="#interpretacion" onClick={() => setMobileTab("leccion")}>
              Interpretación
            </a>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="relative px-panel overflow-hidden">
        <Scene theme={world.theme} seed={idx + 3} hero={state.profile?.avatar} heroAt={0.15 + ((idx % 7) / 7) * 0.6} label={`Paisaje de ${world.name}`} />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/80 to-transparent p-4 pt-10">
          <nav className="text-xs text-muted mb-1" aria-label="Ruta">
            <a className="hover:text-text underline" href={href("mapa")}>
              Mapa
            </a>{" "}
            /{" "}
            <a className="hover:text-text underline" href={href(`mundo/${m.world}`)}>
              {world.short}
            </a>{" "}
            / {m.zone}
          </nav>
          <h1 className="font-pixel text-2xl sm:text-3xl text-text drop-shadow">{m.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {review && <span className="chip bg-ember text-ink">Repaso</span>}
            {m.kind === "project" && <span className="chip bg-violet text-ink">Proyecto</span>}
            <span className="chip" title="Dificultad">
              {"★".repeat(m.difficulty)}
              {"☆".repeat(5 - m.difficulty)}
            </span>
            <span className="chip text-sky">{m.xp} XP</span>
            {m.skills.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {m.project && (
        <div className="px-panel p-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="label mb-1">Requisitos</div>
            <ul className="list-[square] pl-5 text-sm">{m.project.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
            <div className="label mt-3 mb-1">Dataset</div>
            <p className="text-sm">{m.project.dataset}</p>
          </div>
          <div>
            <div className="label mb-1">Etapas</div>
            <ol className="list-decimal pl-5 text-sm">{m.project.stages.map((r) => <li key={r}>{r}</li>)}</ol>
            <div className="label mt-3 mb-1">Criterios de evaluación</div>
            <ul className="list-[square] pl-5 text-sm">{m.project.criteria.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
        </div>
      )}

      <div className="lg:hidden grid grid-cols-2 gap-2 sticky z-20 bg-ink py-2" style={{ top: "calc(env(safe-area-inset-top, 0px) + 64px)" }} role="tablist">
        <button role="tab" aria-selected={mobileTab === "leccion"} className={mobileTab === "leccion" ? "btn-gold" : "btn-ghost"} onClick={() => setMobileTab("leccion")}>
          Lección
        </button>
        <button role="tab" aria-selected={mobileTab === "codigo"} className={mobileTab === "codigo" ? "btn-gold" : "btn-ghost"} onClick={() => setMobileTab("codigo")}>
          Código
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-6 items-start">
        <div className={`min-w-0 ${mobileTab === "leccion" ? "" : "hidden lg:block"}`}>{lesson}</div>
        <div className={`min-w-0 lg:sticky lg:top-28 ${mobileTab === "codigo" ? "" : "hidden lg:block"}`}>{editor}</div>
      </div>

      {m.project && rec?.done && (
        <div className="px-panel p-4">
          <div className="label mb-1">Extensiones opcionales</div>
          <ul className="list-[square] pl-5 text-sm">{m.project.extensions.map((r) => <li key={r}>{r}</li>)}</ul>
          <div className="label mt-3 mb-1">Resultado para el portafolio</div>
          <p className="text-sm">{m.project.portfolio}</p>
        </div>
      )}
    </div>
  );
}
