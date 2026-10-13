import { MISSIONS, missionsByWorld, WORLDS } from "../content";
import type { World } from "../content/types";
import { worldById } from "../content/worlds";
import { PixelIcon } from "../components/pixel";
import { Scene } from "../components/Scene";
import { isMissionUnlocked, isWorldUnlocked, worldProgress } from "../engine/derive";
import { CONTENT, useGame } from "../engine/store";
import { href } from "../router";

function unlockText(w: World) {
  if (!w.unlock.length) return "Abierto desde el inicio";
  return "Se abre al completar " + w.unlock.map((u) => `el ${Math.round(u.fraction * 100)} % de ${worldById[u.world].name}`).join(" y ");
}

export function WorldMap() {
  const { state } = useGame();
  // The hero stands on the latest unlocked world that still has unfinished missions.
  const here = [...WORLDS].reverse().find((w) => isWorldUnlocked(state, CONTENT, w) && worldProgress(state, MISSIONS, w.id).fraction < 1 && missionsByWorld(w.id).length) ?? WORLDS[0];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="px-title text-gold text-2xl">Mapa de mundos</h1>
        <p className="text-muted">Cada mundo construye sobre el anterior. Los mundos 2 y 4 se abren en paralelo cuando dominas lo básico del Bosque.</p>
      </div>
      <ol className="relative grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {WORLDS.map((w) => {
          const open = isWorldUnlocked(state, CONTENT, w);
          const p = worldProgress(state, MISSIONS, w.id);
          const isHere = w.id === here.id;
          return (
            <li key={w.id} className="min-w-0">
              <a href={href(`mundo/${w.id}`)} className={`block ${open ? "px-panel" : "px-panel opacity-70"} overflow-hidden group`} aria-label={`${w.name}. ${open ? `${p.done} de ${p.total} misiones completadas` : "Bloqueado"}`}>
                <div className="relative">
                  <Scene theme={w.theme} seed={w.order * 5} hero={isHere ? state.profile?.avatar : null} heroAt={0.2} label={w.name} className={open ? "" : "grayscale"} />
                  <span className="absolute top-2 left-2 font-pixel text-ink bg-gold px-2 text-lg">{w.order}</span>
                  {isHere && <span className="absolute top-2 right-2 chip bg-sky text-ink">Estás aquí</span>}
                  {!open && (
                    <span className="absolute inset-0 grid place-items-center bg-ink/40">
                      <PixelIcon name="lock" size={40} title="Bloqueado" />
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-pixel text-lg leading-tight group-hover:text-gold">{w.name}</h2>
                  <p className="text-sm text-muted mt-1">{w.goal}</p>
                  {p.total > 0 ? (
                    <>
                      <div className="bar mt-3">
                        <div className="h-full bg-leaf" style={{ width: `${p.fraction * 100}%` }} />
                      </div>
                      <div className="text-xs text-muted mt-1 tabular-nums">
                        {p.done} / {p.total} misiones
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-violet mt-3">Temario publicado · misiones en preparación</div>
                  )}
                  {!open && <div className="text-xs text-gold mt-2">{unlockText(w)}</div>}
                </div>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function WorldView({ id }: { id: string }) {
  const { state } = useGame();
  const w = worldById[id as World["id"]];
  if (!w) return <p>Ese mundo no existe.</p>;
  const open = isWorldUnlocked(state, CONTENT, w);
  const missions = missionsByWorld(w.id);
  const zones = [...new Set(missions.map((m) => m.zone))];
  const p = worldProgress(state, MISSIONS, w.id);
  return (
    <div className="flex flex-col gap-5">
      <div className="px-panel overflow-hidden relative">
        <Scene theme={w.theme} seed={w.order * 5} hero={state.profile?.avatar} heroAt={0.15 + p.fraction * 0.6} label={w.name} />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink to-transparent p-4 pt-12">
          <div className="label text-gold">Mundo {w.order}</div>
          <h1 className="font-pixel text-2xl sm:text-3xl">{w.name}</h1>
        </div>
      </div>
      <p className="text-lg">{w.goal}</p>
      {!open && (
        <div className="px-panel-gold p-4 flex items-center gap-3">
          <PixelIcon name="lock" size={24} />
          <p>{unlockText(w)}. También puedes abrirlo con la evaluación inicial.</p>
        </div>
      )}
      <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6 items-start">
        <div className="flex flex-col gap-6">
          {zones.length === 0 && <p className="px-panel p-4 text-muted">Las misiones de este mundo están en preparación. Revisa el temario y los laboratorios mientras tanto.</p>}
          {zones.map((z) => (
            <section key={z}>
              <h2 className="px-title text-sm text-sky mb-2">{z}</h2>
              <ol className="flex flex-col gap-2">
                {missions
                  .filter((m) => m.zone === z)
                  .map((m) => {
                    const done = Boolean(state.missions[m.id]?.done);
                    const un = isMissionUnlocked(state, CONTENT, m);
                    return (
                      <li key={m.id}>
                        <a
                          href={href(`mision/${m.id}`)}
                          className={`flex items-center gap-3 p-3 rounded-[2px] border-2 ${done ? "border-leaf/50 bg-leaf/5" : un ? "border-gold/60 bg-panel hover:bg-panel2" : "border-line bg-panel/60 text-muted"}`}
                        >
                          <PixelIcon name={done ? "check" : un ? (m.kind === "project" ? "column" : "star") : "lock"} size={18} />
                          <span className="flex-1 min-w-0">
                            <span className="block font-bold truncate">{m.title}</span>
                            <span className="text-xs text-muted">
                              {"★".repeat(m.difficulty)} · {m.xp} XP {m.kind === "project" ? "· Proyecto" : ""} {state.missions[m.id]?.advancedDone ? "· Avanzado ✔" : ""}
                            </span>
                          </span>
                        </a>
                      </li>
                    );
                  })}
              </ol>
            </section>
          ))}
        </div>
        <aside className="px-panel p-4">
          <h2 className="px-title text-sm text-gold mb-2">Temario del mundo</h2>
          <ul className="list-[square] pl-5 text-sm flex flex-col gap-1">
            {w.syllabus.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <h3 className="label mt-4 mb-1">Certificado de la ruta</h3>
          <p className="text-sm">{w.certificate.title}</p>
          <p className="text-xs text-muted mt-1">Se obtiene al completar todas las misiones del mundo.</p>
        </aside>
      </div>
    </div>
  );
}
