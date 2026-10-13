import { useEffect, useRef, useState } from "react";
import { missionById, MISSIONS, WORLDS } from "../content";
import { text, type WorldId } from "../content/types";
import { worldById } from "../content/worlds";
import { EDITOR_THEMES } from "../components/CodeEditor";
import { Markdown } from "../components/Markdown";
import { Avatar, PixelIcon } from "../components/pixel";
import * as A from "../engine/actions";
import { CATALOG, FREE_EFFECTS, FREE_THEMES, itemById, type ItemKind } from "../engine/catalog";
import { certificateId, verifyCertificate } from "../engine/certificates";
import { misconceptionStats, MISCONCEPTIONS, worldProgress } from "../engine/derive";
import { dayKey } from "../engine/state";
import { exportSave, importSave } from "../engine/storage";
import { CONTENT, useGame } from "../engine/store";
import { href } from "../router";
import { AvatarEditor } from "./Onboarding";

export function Review() {
  const { state, summary } = useGame();
  const miscon = misconceptionStats(state, MISSIONS).filter((m) => m.active);
  const upcoming = [...summary.cards].sort((a, b) => a.due.localeCompare(b.due));
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="px-title text-gold text-2xl">Repaso inteligente</h1>
        <p className="text-muted text-sm mt-1">
          Cada misión completada vuelve unos días después. En el repaso resuelves de nuevo el reto desde el código inicial: si lo superas sin pistas, el siguiente repaso se aleja; con pistas, se repite antes; si no lo recuerdas, vuelve mañana.
        </p>
      </div>
      <section className="px-panel p-4">
        <h2 className="font-bold mb-3">Pendientes hoy ({summary.due.length})</h2>
        {summary.due.length ? (
          <ul className="flex flex-col gap-2">
            {summary.due.map((c) => (
              <li key={c.m} className="flex items-center gap-3 bg-night p-3 rounded-[2px]">
                <PixelIcon name="book" size={18} />
                <span className="flex-1 min-w-0">
                  <span className="font-bold block truncate">{missionById[c.m]?.title}</span>
                  <span className="text-xs text-muted">
                    {worldById[missionById[c.m]?.world]?.short} · intervalo actual {c.interval} d · olvidos {c.lapses}
                  </span>
                </span>
                <a className="btn-gold" href={href(`mision/${c.m}/repaso`)}>
                  Repasar
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No hay repasos pendientes. ¡Buen trabajo! Puedes repasar cualquier misión completada desde la lista de abajo.</p>
        )}
      </section>
      {miscon.length > 0 && (
        <section className="px-panel p-4">
          <h2 className="font-bold mb-3">Ideas que conviene reforzar</h2>
          <ul className="flex flex-col gap-3">
            {miscon.map((m) => {
              const probes = MISSIONS.filter((x) => x.quiz.options.some((o) => o.misconception === m.tag));
              return (
                <li key={m.tag} className="text-sm">
                  <div className="font-bold text-ember">{MISCONCEPTIONS[m.tag].title}</div>
                  <p className="text-muted">{MISCONCEPTIONS[m.tag].fix}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {probes.map((p) => (
                      <a key={p.id} className="chip" href={href(`mision/${p.id}${state.missions[p.id]?.done ? "/repaso" : ""}`)}>
                        {p.title}
                      </a>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <section className="px-panel p-4">
        <h2 className="font-bold mb-3">Calendario de repasos</h2>
        {upcoming.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-muted">
                  <th className="p-1">Misión</th>
                  <th className="p-1">Próximo</th>
                  <th className="p-1">Intervalo</th>
                  <th className="p-1">Repasos</th>
                  <th className="p-1" />
                </tr>
              </thead>
              <tbody>
                {upcoming.map((c) => (
                  <tr key={c.m} className="border-t border-line/50">
                    <td className="p-1">{missionById[c.m]?.title}</td>
                    <td className={`p-1 ${c.due <= dayKey() ? "text-ember" : ""}`}>{c.due}</td>
                    <td className="p-1">{c.interval} d</td>
                    <td className="p-1">{c.reps}</td>
                    <td className="p-1">
                      <a className="text-sky underline" href={href(`mision/${c.m}/repaso`)}>
                        Repasar ya
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Completa misiones para que aparezcan aquí.</p>
        )}
      </section>
    </div>
  );
}

const KIND_NAMES: Record<ItemKind, string> = { outfit: "Atuendos", hair: "Peinados", pet: "Mascotas", editorTheme: "Temas del editor", effect: "Efectos", frame: "Marcos" };

export function Inventory() {
  const { state, summary, update, toast } = useGame();
  const [draft, setDraft] = useState(state.profile?.avatar);
  useEffect(() => setDraft(state.profile?.avatar), [state.profile?.avatar]);
  if (!state.profile || !draft) return null;
  const themes = [...FREE_THEMES, ...state.owned.filter((i) => itemById[i]?.kind === "editorTheme")];
  const changed = JSON.stringify(draft) !== JSON.stringify(state.profile.avatar);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="px-title text-gold text-2xl">Inventario y personalización</h1>
          <p className="text-sm text-muted">Las monedas solo compran apariencia. Nunca respuestas, pistas ni evaluaciones.</p>
        </div>
        <span className="font-pixel text-gold text-xl flex items-center gap-2">
          <PixelIcon name="coin" size={20} /> {summary.coins}
        </span>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6 items-start">
        <div className="px-panel p-5 flex flex-col items-center gap-4">
          <div className="bg-night p-4 rounded-[2px]">
            <Avatar avatar={draft} scale={8} animate />
          </div>
          <div className="w-full">
            <AvatarEditor avatar={draft} onChange={setDraft} owned={state.owned} />
          </div>
          <button
            className="btn-gold self-start"
            disabled={!changed}
            onClick={() => {
              update((s) => A.setProfile(s, s.profile!.name, draft));
              toast("Personaje actualizado.", "good");
            }}
          >
            Guardar apariencia
          </button>
          <div className="w-full">
            <div className="label mb-2">Tema del editor</div>
            <div className="flex flex-wrap gap-2">
              {themes.map((t) => (
                <button key={t} className={`chip text-sm px-3 py-1 ${state.settings.editorTheme === t ? "bg-gold text-ink" : ""}`} onClick={() => update((s) => A.setSettings(s, { editorTheme: t }))}>
                  <span className="w-3 h-3 inline-block" style={{ background: EDITOR_THEMES[t]?.keyword }} />
                  {itemById[t]?.name ?? (t === "noche" ? "Noche" : "Alto contraste")}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">Efectos activos: {[...FREE_EFFECTS, ...state.owned.filter((i) => itemById[i]?.kind === "effect")].map((e) => itemById[e]?.name ?? "Chispas").join(", ")}</p>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          {(Object.keys(KIND_NAMES) as ItemKind[]).map((kind) => (
            <section key={kind}>
              <h2 className="px-title text-sm text-sky mb-2">{KIND_NAMES[kind]}</h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {CATALOG.filter((i) => i.kind === kind).map((i) => {
                  const owned = state.owned.includes(i.id);
                  const lockedLevel = i.level && summary.level.level < i.level;
                  return (
                    <li key={i.id} className="px-panel p-3 flex flex-col gap-1">
                      <div className="flex justify-between gap-2">
                        <span className="font-bold">{i.name}</span>
                        <span className="text-gold font-pixel flex items-center gap-1 shrink-0">
                          <PixelIcon name="coin" size={12} /> {i.price}
                        </span>
                      </div>
                      <p className="text-sm text-muted">{i.description}</p>
                      {owned ? (
                        <span className="text-leaf text-sm">✔ En tu inventario</span>
                      ) : (
                        <button
                          className="btn-ghost text-sm self-start mt-1"
                          disabled={Boolean(lockedLevel) || summary.coins < i.price}
                          onClick={() => {
                            const r = A.buy(state, CONTENT, i.id);
                            if (r.ok) {
                              update(() => r.state);
                              toast(`Compraste ${i.name}.`, "good");
                            } else toast(r.reason, "bad");
                          }}
                        >
                          {lockedLevel ? `Nivel ${i.level}` : summary.coins < i.price ? `Faltan ${i.price - summary.coins}` : "Comprar"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Projects() {
  const { state } = useGame();
  const projects = MISSIONS.filter((m) => m.kind === "project");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="px-title text-gold text-2xl">Proyectos integradores</h1>
        <p className="text-muted text-sm">Retos largos que combinan lo aprendido. Cada uno tiene requisitos, datos, etapas con pruebas y criterios de evaluación, y queda en tu portafolio.</p>
      </div>
      <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((p) => {
          const done = state.missions[p.id]?.done;
          return (
            <li key={p.id} className={done ? "px-panel-gold p-4" : "px-panel p-4"}>
              <div className="label">{worldById[p.world].name}</div>
              <h2 className="font-pixel text-lg mt-1">{p.title}</h2>
              <Markdown text={text(p.objective)} className="text-sm text-muted" />
              <div className="label mt-2">Etapas</div>
              <ol className="list-decimal pl-5 text-sm">{p.project!.stages.map((s) => <li key={s}>{s}</li>)}</ol>
              <a className={done ? "btn-ghost mt-3" : "btn-gold mt-3"} href={href(`mision/${p.id}`)}>
                {done ? "Ver proyecto" : "Empezar"}
              </a>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">Hay más proyectos en el temario (dashboard de ventas, detector de anomalías, API de predicciones…). Se añadirán como misiones de tipo «project» en los mundos correspondientes.</p>
    </div>
  );
}

export function Portfolio() {
  const { state, update } = useGame();
  const items = MISSIONS.filter((m) => (m.kind === "project" || m.advanced) && state.missions[m.id]?.done && (m.kind === "project" || state.missions[m.id]?.advancedDone));
  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div>
        <h1 className="px-title text-gold text-2xl">Portafolio</h1>
        <p className="text-muted text-sm">Proyectos terminados y retos avanzados resueltos, con tu código y tus notas. Exporta tu progreso desde Ajustes para conservarlo.</p>
      </div>
      {items.length === 0 && <p className="px-panel p-4 text-muted">Todavía está vacío. Termina un proyecto o un reto avanzado para añadir tu primera pieza.</p>}
      {items.map((m) => {
        const rec = state.missions[m.id]!;
        return (
          <article key={m.id} className="px-panel p-5 flex flex-col gap-3">
            <div className="flex justify-between gap-2 flex-wrap">
              <div>
                <div className="label">{m.kind === "project" ? "Proyecto" : "Reto avanzado"} · {worldById[m.world].short}</div>
                <h2 className="font-pixel text-xl">{m.kind === "project" ? m.title : m.advanced!.title}</h2>
              </div>
              <span className="text-sm text-muted">{dayKey(rec.advancedDone ?? rec.done!)}</span>
            </div>
            {m.project && <p className="text-sm">{m.project.portfolio}</p>}
            <div className="flex flex-wrap gap-2">{m.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div>
            <details>
              <summary className="cursor-pointer text-sky text-sm">Ver mi código</summary>
              <pre className="font-mono text-[12.5px] bg-ink p-3 mt-2 rounded-[2px] overflow-x-auto max-h-96">{(m.kind === "project" ? rec.code : rec.advancedCode) ?? "(no se guardó el código)"}</pre>
            </details>
            <label className="label" htmlFor={`notes-${m.id}`}>
              Descripción y conclusiones (para tu portafolio)
            </label>
            <textarea id={`notes-${m.id}`} className="input min-h-24 text-sm" defaultValue={rec.notes ?? ""} onBlur={(e) => update((s) => A.saveNotes(s, m.id, e.target.value))} placeholder="Qué problema resolviste, qué decisiones tomaste, qué limitaciones tiene…" />
          </article>
        );
      })}
    </div>
  );
}

function CertificateCard({ world }: { world: WorldId }) {
  const { state } = useGame();
  const [id, setId] = useState<string | null>(null);
  const cert = state.certificates[world];
  const w = worldById[world];
  useEffect(() => {
    void certificateId(state, CONTENT, world).then(setId);
  }, [state, world]);
  if (!cert) return null;
  return (
    <article className="px-panel-gold p-6 text-center flex flex-col gap-2" aria-label={`Certificado ${w.certificate.title}`}>
      <div className="font-pixel text-gold">PYTHON QUEST · CERTIFICADO DE RUTA</div>
      <p className="text-sm text-muted">Se certifica que</p>
      <p className="font-pixel text-3xl">{cert.name}</p>
      <p className="text-sm text-muted">completó la ruta</p>
      <p className="text-xl font-bold">{w.certificate.title}</p>
      <p className="text-sm">({w.name})</p>
      <div className="text-sm mt-2">
        <div className="label">Competencias evaluadas</div>
        <ul className="flex flex-wrap justify-center gap-2 mt-1">{w.certificate.competencies.map((c) => <li key={c} className="chip">{c}</li>)}</ul>
      </div>
      <p className="text-sm mt-2">Fecha: {new Date(cert.issuedAt).toLocaleDateString("es", { dateStyle: "long" })}</p>
      <p className="font-mono text-sky select-all">{id ?? "calculando…"}</p>
      <p className="text-xs text-muted mt-2">Certificado interno emitido por Python Quest. No equivale a una acreditación oficial. El identificador se verifica dentro de la aplicación con el progreso guardado.</p>
    </article>
  );
}

export function Certificates() {
  const { state, update, toast } = useGame();
  const [code, setCode] = useState("");
  const [verdict, setVerdict] = useState<string | null>(null);
  const eligible = WORLDS.filter((w) => {
    const p = worldProgress(state, MISSIONS, w.id);
    return p.total > 0 && p.done === p.total;
  });
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="px-title text-gold text-2xl">Certificados</h1>
        <p className="text-muted text-sm">Completa todas las misiones de un mundo para emitir su certificado.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {WORLDS.filter((w) => worldProgress(state, MISSIONS, w.id).total > 0).map((w) => {
          const p = worldProgress(state, MISSIONS, w.id);
          const can = eligible.includes(w);
          return (
            <li key={w.id} className="px-panel p-3 flex items-center gap-3 flex-wrap">
              <span className="flex-1 min-w-0">
                <span className="font-bold">{w.certificate.title}</span>
                <span className="text-xs text-muted block">
                  {w.name} · {p.done}/{p.total} misiones
                </span>
              </span>
              {state.certificates[w.id] ? (
                <span className="text-leaf text-sm">✔ Emitido</span>
              ) : (
                <button
                  className="btn-gold text-sm"
                  disabled={!can}
                  onClick={() => {
                    update((s) => A.issueCertificate(s, CONTENT, w.id));
                    toast("Certificado emitido.", "good");
                  }}
                >
                  {can ? "Emitir certificado" : "Ruta incompleta"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {(Object.keys(state.certificates) as WorldId[]).map((w) => (
        <CertificateCard key={w} world={w} />
      ))}
      <form
        className="px-panel p-4 flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const w = await verifyCertificate(state, CONTENT, code);
          setVerdict(w ? `Válido: «${worldById[w].certificate.title}», emitido a ${state.certificates[w].name}.` : "No coincide con ningún certificado de este progreso.");
        }}
      >
        <label htmlFor="verify" className="font-bold">
          Verificar un identificador
        </label>
        <div className="flex gap-2 flex-wrap">
          <input id="verify" className="input flex-1 font-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="PQ-XXXX-XXXX-XXXX" />
          <button className="btn-sky">Verificar</button>
        </div>
        {verdict && (
          <p className="text-sm" role="status">
            {verdict}
          </p>
        )}
        <p className="text-xs text-muted">La verificación recalcula la huella SHA-256 a partir del progreso guardado en este navegador; por eso solo verifica certificados de esta partida.</p>
      </form>
    </div>
  );
}

export function Settings() {
  const { state, update, replace, reset, toast } = useGame();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pauseFrom, setPauseFrom] = useState(dayKey());
  const [pauseTo, setPauseTo] = useState(dayKey(new Date(Date.now() + 6 * 86_400_000)));
  const s = state.settings;

  const doImport = (txt: string) => {
    const r = importSave(txt, CONTENT);
    if (r.ok && r.state) {
      replace(r.state);
      setImportMsg({ ok: true, lines: ["Progreso importado.", ...r.warnings] });
    } else setImportMsg({ ok: false, lines: r.errors });
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <h1 className="px-title text-gold text-2xl">Ajustes</h1>
      <section className="px-panel p-4 flex flex-col gap-4">
        <h2 className="font-bold">Editor y accesibilidad</h2>
        <label className="flex items-center gap-3 text-sm">
          <span className="w-44">Tamaño de letra del editor</span>
          <input id="font-size" type="range" min={12} max={24} value={s.fontSize} onChange={(e) => update((x) => A.setSettings(x, { fontSize: Number(e.target.value) }))} />
          <span className="tabular-nums">{s.fontSize}px</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input id="reduced-motion" type="checkbox" checked={s.reducedMotion} onChange={(e) => update((x) => A.setSettings(x, { reducedMotion: e.target.checked }))} />
          Reducir animaciones
        </label>
        <label className="flex items-center gap-3 text-sm">
          <span className="w-44">Tiempo máximo de ejecución</span>
          <select id="timeout" className="input w-auto" value={s.timeoutSec} onChange={(e) => update((x) => A.setSettings(x, { timeoutSec: Number(e.target.value) }))}>
            {[5, 10, 15, 30, 60, 120].map((v) => (
              <option key={v} value={v}>
                {v} s
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <span className="w-44">Meta diaria</span>
          <select id="goal" className="input w-auto" value={s.dailyGoalMin} onChange={(e) => update((x) => A.setSettings(x, { dailyGoalMin: Number(e.target.value) }))}>
            {[5, 10, 15, 20, 30, 45, 60].map((v) => (
              <option key={v} value={v}>
                {v} min
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="px-panel p-4 flex flex-col gap-3">
        <h2 className="font-bold">Pausas planificadas</h2>
        <p className="text-sm text-muted">Los días de pausa no rompen tu racha. Úsalos para vacaciones, exámenes o simplemente descansar.</p>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm">
            Desde
            <input id="pause-from" type="date" className="input" value={pauseFrom} onChange={(e) => setPauseFrom(e.target.value)} />
          </label>
          <label className="text-sm">
            Hasta
            <input id="pause-to" type="date" className="input" value={pauseTo} onChange={(e) => setPauseTo(e.target.value)} />
          </label>
          <button
            className="btn-ghost"
            disabled={!pauseFrom || !pauseTo || pauseTo < pauseFrom}
            onClick={() => update((x) => A.setSettings(x, { pauses: [...x.settings.pauses, { from: pauseFrom, to: pauseTo }].slice(-50) }))}
          >
            Añadir pausa
          </button>
        </div>
        {s.pauses.length > 0 && (
          <ul className="text-sm flex flex-col gap-1">
            {s.pauses.map((p, i) => (
              <li key={i} className="flex gap-2 items-center">
                {p.from} → {p.to}
                <button className="text-ember underline text-xs" onClick={() => update((x) => A.setSettings(x, { pauses: x.settings.pauses.filter((_, j) => j !== i) }))}>
                  quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="px-panel p-4 flex flex-col gap-3">
        <h2 className="font-bold">Tu progreso (modo invitado)</h2>
        <p className="text-sm text-muted">Se guarda en este navegador. Para moverlo a otro dispositivo o hacer una copia, expórtalo como JSON y luego impórtalo. Al importar se valida el archivo y se descarta lo incoherente.</p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-sky"
            onClick={() => {
              const json = exportSave(state);
              setExported(json);
              try {
                const blob = new Blob([json], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `python-quest-${dayKey()}.json`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
              } catch {
                /* the text area below still holds the export */
              }
            }}
          >
            Exportar progreso
          </button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
            Importar desde archivo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) doImport(await f.text());
              e.target.value = "";
            }}
          />
        </div>
        {exported && (
          <div>
            <label className="label" htmlFor="export-text">
              Copia de seguridad (si la descarga no empezó, copia este texto)
            </label>
            <textarea id="export-text" readOnly className="input font-mono text-xs h-32" value={exported} onFocus={(e) => e.target.select()} />
            <button
              className="btn-ghost text-sm mt-2"
              onClick={() => {
                navigator.clipboard?.writeText(exported).then(
                  () => toast("Copiado.", "good"),
                  () => toast("No se pudo copiar: selecciona el texto manualmente.", "bad"),
                );
              }}
            >
              Copiar
            </button>
          </div>
        )}
        <details>
          <summary className="cursor-pointer text-sm text-sky">Pegar un progreso exportado</summary>
          <PasteImport onImport={doImport} />
        </details>
        {importMsg && (
          <ul className={`text-sm ${importMsg.ok ? "text-leaf" : "text-ember"}`} role="status">
            {importMsg.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="px-panel p-4 flex flex-col gap-3">
        <h2 className="font-bold">Personaje y evaluación</h2>
        <div className="flex gap-2 flex-wrap">
          <a className="btn-ghost" href={href("crear")}>
            Editar nombre y personaje
          </a>
          <a className="btn-ghost" href={href("evaluacion")}>
            Repetir evaluación inicial
          </a>
        </div>
      </section>

      <section className="px-panel p-4 flex flex-col gap-3">
        <h2 className="font-bold text-ember">Empezar de cero</h2>
        <p className="text-sm text-muted">Borra todo el progreso de este navegador. Exporta antes si quieres conservarlo.</p>
        <button
          className="btn-ember self-start"
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              return;
            }
            reset();
            setConfirmReset(false);
            location.hash = "#/";
          }}
        >
          {confirmReset ? "Pulsa otra vez para borrar todo" : "Borrar progreso"}
        </button>
      </section>
      <p className="text-xs text-muted">Python Quest ejecuta Python con Pyodide (CPython compilado a WebAssembly) dentro de tu navegador. Tu código no se envía a ningún servidor.</p>
      {MISSIONS.length > 0 && <p className="text-xs text-muted">Contenido: {MISSIONS.length} misiones en {new Set(MISSIONS.map((m) => m.world)).size} mundos.</p>}
    </div>
  );
}

function PasteImport({ onImport }: { onImport: (t: string) => void }) {
  const [txt, setTxt] = useState("");
  return (
    <div className="flex flex-col gap-2 mt-2">
      <label htmlFor="paste-import" className="sr-only">
        Texto del progreso exportado
      </label>
      <textarea id="paste-import" className="input font-mono text-xs h-28" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder='{"app": "python-quest", ...}' />
      <button className="btn-ghost self-start" disabled={!txt.trim()} onClick={() => onImport(txt)}>
        Importar texto
      </button>
    </div>
  );
}

