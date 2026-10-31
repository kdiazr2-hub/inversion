import { useState } from "react";
import { missionById, MISSIONS, WORLDS } from "../content";
import { text } from "../content/types";
import { worldById } from "../content/worlds";
import { Markdown } from "../components/Markdown";
import { PixelIcon } from "../components/pixel";
import { Scene } from "../components/Scene";
import { isMissionUnlocked, isWorldUnlocked, misconceptionStats, MISCONCEPTIONS, recommendNext, worldProgress } from "../engine/derive";
import { needsBackupReminder, readBackupInfo, recordBackup, snoozeReminder } from "../engine/backup";
import { dayKey } from "../engine/state";
import { exportSave } from "../engine/storage";
import { CONTENT, useGame } from "../engine/store";
import { href } from "../router";

/** A deterministic "quest of the day": the same unlocked, unfinished mission all day. */
function dailyQuest(state: ReturnType<typeof useGame>["state"]) {
  const pool = MISSIONS.filter((m) => !state.missions[m.id]?.done && isMissionUnlocked(state, CONTENT, m));
  if (!pool.length) return null;
  const k = dayKey();
  let h = 0;
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  // Prefer the first missions of the queue so the quest is reachable today.
  return pool[h % Math.min(pool.length, 3)];
}

/** Reminds the learner to save a copy once there is progress worth keeping and none is recent. */
function BackupReminder() {
  const { state } = useGame();
  const [info, setInfo] = useState(readBackupInfo);
  if (!needsBackupReminder(state, info)) return null;
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([exportSave(state)], { type: "application/json" }));
    a.download = `python-quest-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setInfo(recordBackup());
  };
  return (
    <div className="px-panel-gold p-4 flex flex-col sm:flex-row sm:items-center gap-3" role="region" aria-label="Copia de seguridad" data-testid="backup-reminder">
      <p className="flex-1 text-sm">
        {info.at ? `Tu última copia es del ${new Date(info.at).toLocaleDateString("es")}.` : "Todavía no has guardado ninguna copia de tu progreso."} Tu progreso vive solo en este navegador: si se borran sus datos, se pierde. Descarga una copia o activa la copia automática en <a className="text-sky underline" href={href("ajustes")}>Ajustes</a>.
      </p>
      <div className="flex gap-2 shrink-0">
        <button className="btn-gold text-sm" onClick={download}>
          Descargar copia
        </button>
        <button className="btn-ghost text-sm" onClick={() => setInfo(snoozeReminder())}>
          En otro momento
        </button>
      </div>
    </div>
  );
}

export function Home() {
  const { state, summary } = useGame();
  const next = recommendNext(state, CONTENT);
  const quest = dailyQuest(state);
  const today = state.activity[dayKey()] ?? { ms: 0, runs: 0, done: 0 };
  const minutes = Math.floor(today.ms / 60000);
  const goal = state.settings.dailyGoalMin;
  const miscon = misconceptionStats(state, MISSIONS).filter((m) => m.active).slice(0, 3);
  const nextWorld = next ? worldById[next.mission.world] : WORLDS[0];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Panel principal</h1>
      <BackupReminder />
      <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
        <div className="px-panel overflow-hidden flex flex-col">
          <Scene theme={nextWorld.theme} seed={4} hero={state.profile?.avatar} heroAt={0.2} label={`Tu personaje en ${nextWorld.name}`} />
          <div className="p-5 flex flex-col gap-2">
            {next ? (
              <>
                <div className="label">{next.kind === "review" ? "Repaso pendiente" : "Próxima misión recomendada"}</div>
                <h2 className="font-pixel text-2xl text-text">{next.mission.title}</h2>
                <p className="text-muted text-sm">
                  {nextWorld.name} · {next.mission.zone}
                </p>
                <Markdown text={text(next.mission.objective)} className="text-sm" />
                <div className="flex gap-2 flex-wrap mt-2">
                  <a className="btn-gold" href={href(`mision/${next.mission.id}${next.kind === "review" ? "/repaso" : ""}`)}>
                    {next.kind === "review" ? "Repasar ahora" : "Continuar aventura"}
                  </a>
                  <a className="btn-ghost" href={href("mapa")}>
                    Ver el mapa
                  </a>
                </div>
              </>
            ) : (
              <p>Completaste todas las misiones disponibles. Explora los laboratorios y los proyectos.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="px-panel p-4">
            <h2 className="px-title text-sm text-gold mb-3">Tu progreso</h2>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-night p-2 rounded-[2px]">
                <dt className="label">Nivel</dt>
                <dd className="font-pixel text-2xl text-gold tabular-nums">{summary.level.level}</dd>
              </div>
              <div className="bg-night p-2 rounded-[2px]">
                <dt className="label">Racha</dt>
                <dd className="font-pixel text-2xl text-ember tabular-nums">{summary.streak.current}</dd>
              </div>
              <div className="bg-night p-2 rounded-[2px]">
                <dt className="label">Misiones</dt>
                <dd className="font-pixel text-2xl text-sky tabular-nums">
                  {summary.completed}
                  <span className="text-sm text-muted">/{summary.total}</span>
                </dd>
              </div>
            </dl>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted">
                <span>Meta de hoy</span>
                <span className="tabular-nums">
                  {minutes} / {goal} min
                </span>
              </div>
              <div className="bar mt-1">
                <div className="h-full bg-leaf" style={{ width: `${Math.min(100, (minutes / goal) * 100)}%` }} />
              </div>
              <p className="text-xs text-muted mt-1">
                {summary.streak.freezes > 0 ? `Tienes ${summary.streak.freezes} día(s) de descanso guardados: tu racha sobrevive a un día sin estudiar.` : "Cada 7 días de racha ganas un día de descanso."}
              </p>
            </div>
          </div>

          {quest && (
            <div className="px-panel-gold p-4">
              <h2 className="px-title text-sm text-gold">Misión del día</h2>
              <p className="font-bold mt-1">{quest.title}</p>
              <p className="text-sm text-muted">{worldById[quest.world].short} · {quest.zone}</p>
              <a className="btn-gold mt-3" href={href(`mision/${quest.id}`)}>
                Aceptar misión
              </a>
            </div>
          )}

          <div className="px-panel p-4">
            <h2 className="px-title text-sm text-sky mb-2">Repasos</h2>
            {summary.due.length ? (
              <>
                <p className="text-sm">
                  Tienes <strong className="text-gold">{summary.due.length}</strong> repaso(s) pendiente(s). Volver a resolver un reto unos días después fija lo aprendido.
                </p>
                <a className="btn-sky mt-2" href={href("repaso")}>
                  Ir a repasos
                </a>
              </>
            ) : (
              <p className="text-sm text-muted">{summary.cards.length ? "No tienes repasos pendientes hoy." : "Cuando completes misiones, aparecerán aquí sus repasos."}</p>
            )}
          </div>
        </div>
      </div>

      {miscon.length > 0 && (
        <div className="px-panel p-4">
          <h2 className="px-title text-sm text-ember mb-2">Ideas para reforzar</h2>
          <ul className="grid md:grid-cols-3 gap-3">
            {miscon.map((m) => {
              const probe = MISSIONS.find((x) => x.probes.includes(m.tag) && state.missions[x.id]?.done);
              return (
                <li key={m.tag} className="bg-night p-3 rounded-[2px] text-sm">
                  <div className="font-bold">{MISCONCEPTIONS[m.tag].title}</div>
                  <p className="text-muted mt-1">{MISCONCEPTIONS[m.tag].fix}</p>
                  {probe && (
                    <a className="text-sky underline text-xs mt-2 inline-block" href={href(`mision/${probe.id}#interpretacion`)}>
                      Volver a «{probe.title}»
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <h2 className="px-title text-sm text-sky mb-3">Mundos</h2>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WORLDS.map((w) => {
            const p = worldProgress(state, MISSIONS, w.id);
            const open = isWorldUnlocked(state, CONTENT, w);
            return (
              <li key={w.id}>
                <a href={href(`mundo/${w.id}`)} className="px-panel p-3 flex items-center gap-3 hover:brightness-110">
                  <span className={`font-pixel text-xl w-8 text-center ${open ? "text-gold" : "text-muted"}`}>{w.order}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold truncate">{w.name}</span>
                    <span className="bar block mt-1">
                      <span className="block h-full bg-leaf" style={{ width: `${p.fraction * 100}%` }} />
                    </span>
                    <span className="text-xs text-muted tabular-nums">
                      {p.total ? `${p.done}/${p.total} misiones` : "En preparación"}
                    </span>
                  </span>
                  {!open && <PixelIcon name="lock" size={16} title="Bloqueado" />}
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      {summary.achievements.length > 0 && (
        <div className="px-panel p-4">
          <h2 className="px-title text-sm text-gold mb-2">Logros</h2>
          <ul className="flex flex-wrap gap-2">
            {summary.achievements.map((a) => (
              <li key={a.id} className="chip text-sm py-1 px-2 text-text" title={a.description}>
                <PixelIcon name={a.icon} size={14} /> {a.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      {missionById["py-hola"] && !state.missions["py-hola"]?.done && summary.completed === 0 && (
        <p className="text-sm text-muted">Consejo: en cada misión, Ctrl/Cmd + Enter ejecuta tu código y Mayús + Ctrl/Cmd + Enter lo comprueba.</p>
      )}
    </div>
  );
}
