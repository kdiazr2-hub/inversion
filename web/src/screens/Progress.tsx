// Learning statistics. Every number is computed from the stored history; nothing decorative.
import { missionById, MISSIONS, WORLDS } from "../content";
import { ChartCard, fmt, HBars, SERIES, XYChart } from "../components/Charts";
import { PixelIcon } from "../components/pixel";
import { ACHIEVEMENTS, missionReward, misconceptionStats, MISCONCEPTIONS, skillMastery, worldProgress } from "../engine/derive";
import { dayKey } from "../engine/state";
import { useGame } from "../engine/store";
import { href } from "../router";

const DAY = 86_400_000;

export function Progress() {
  const { state, summary } = useGame();
  const totalMs = Object.values(state.activity).reduce((s, a) => s + a.ms, 0);
  const checks = state.attempts.filter((a) => !a.review);
  const passRate = checks.length ? checks.filter((a) => a.ok).length / checks.length : NaN;
  const firstQuiz = new Map<string, boolean>();
  for (const q of state.quizzes) if (!firstQuiz.has(q.m)) firstQuiz.set(q.m, q.ok);
  const quizAcc = firstQuiz.size ? [...firstQuiz.values()].filter(Boolean).length / firstQuiz.size : NaN;
  const doneMissions = MISSIONS.filter((m) => state.missions[m.id]?.done);
  const attemptsToPass = doneMissions.length ? doneMissions.reduce((s, m) => s + state.attempts.filter((a) => a.m === m.id && !a.adv && !a.review && a.at <= state.missions[m.id]!.done!).length, 0) / doneMissions.length : NaN;

  // Cumulative XP by completion date (mission rewards credited on the completion day, reviews on their day).
  const events: { day: string; xp: number }[] = [];
  for (const m of doneMissions) events.push({ day: dayKey(state.missions[m.id]!.done!), xp: missionReward(m, state).xp });
  for (const r of state.reviews) if (r.grade !== "again") events.push({ day: dayKey(r.at), xp: 10 });
  events.sort((a, b) => a.day.localeCompare(b.day));
  const byDay = new Map<string, number>();
  for (const e of events) byDay.set(e.day, (byDay.get(e.day) ?? 0) + e.xp);
  let acc = 0;
  const dayNum = (d: string) => Math.round(Date.parse(d + "T12:00:00") / DAY);
  const cumulative = [...byDay.entries()].map(([d, xp]) => ({ x: dayNum(d), y: (acc += xp), d }));

  // Last 14 days of active minutes.
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13 + i)));
  const minutes = days.map((d) => Math.round((state.activity[d]?.ms ?? 0) / 60000));
  const maxMin = Math.max(state.settings.dailyGoalMin, ...minutes);

  const mastery = skillMastery(state, MISSIONS)
    .filter((s) => s.evidence > 0)
    .sort((a, b) => b.value - a.value);
  const miscon = misconceptionStats(state, MISSIONS);
  const errorsByType = new Map<string, number>();
  for (const a of state.attempts) if (a.err) errorsByType.set(a.err, (errorsByType.get(a.err) ?? 0) + 1);
  const projects = MISSIONS.filter((m) => m.kind === "project");

  const tiles = [
    { label: "Nivel", value: String(summary.level.level), sub: `${summary.xp} XP en total` },
    { label: "Misiones completadas", value: `${summary.completed}`, sub: `de ${summary.total}` },
    { label: "Tiempo de aprendizaje", value: totalMs >= 3_600_000 ? `${fmt(totalMs / 3_600_000, 1)} h` : `${Math.round(totalMs / 60000)} min`, sub: "tiempo activo con la app visible" },
    { label: "Racha", value: `${summary.streak.current} d`, sub: `mejor: ${summary.streak.best} d · descansos: ${summary.streak.freezes}` },
    { label: "Comprobaciones superadas", value: isNaN(passRate) ? "—" : `${Math.round(passRate * 100)} %`, sub: `${checks.length} comprobaciones` },
    { label: "Interpretación al primer intento", value: isNaN(quizAcc) ? "—" : `${Math.round(quizAcc * 100)} %`, sub: `${firstQuiz.size} preguntas respondidas` },
    { label: "Intentos por misión superada", value: isNaN(attemptsToPass) ? "—" : fmt(attemptsToPass, 1), sub: "comprobaciones hasta superarla" },
    { label: "Repasos superados", value: String(state.reviews.filter((r) => r.grade !== "again").length), sub: `${summary.due.length} pendientes hoy` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="px-title text-gold text-2xl">Estadísticas de progreso</h1>
        <p className="text-muted text-sm">Calculadas a partir de tu historial guardado en este navegador.</p>
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="px-panel p-3">
            <dt className="text-xs text-muted">{t.label}</dt>
            <dd className="text-2xl font-bold tabular-nums mt-1">{t.value}</dd>
            <dd className="text-xs text-muted">{t.sub}</dd>
          </div>
        ))}
      </dl>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Experiencia acumulada" subtitle="XP de cada misión en su fecha de completado, más repasos superados" table={{ head: ["Día", "XP acumulada"], rows: cumulative.map((c) => [c.d, c.y]) }}>
          {cumulative.length ? (
            <XYChart
              ariaLabel="Línea de experiencia acumulada por día"
              x={[cumulative[0].x - 1, cumulative[cumulative.length - 1].x + 1]}
              y={[0, Math.max(10, acc * 1.1)]}
              series={[{ name: "XP acumulada", color: SERIES[0], points: cumulative, kind: "area" }]}
              formatX={(v) => (Number.isInteger(v) ? new Date(v * DAY).toLocaleDateString("es", { day: "numeric", month: "short" }) : "")}
              formatY={(v) => fmt(v, 0)}
              height={220}
            />
          ) : (
            <p className="text-sm text-muted py-8 text-center">Completa tu primera misión para ver la curva.</p>
          )}
        </ChartCard>
        <ChartCard title="Minutos activos, últimos 14 días" subtitle={`La línea marca tu meta diaria (${state.settings.dailyGoalMin} min)`} table={{ head: ["Día", "Minutos"], rows: days.map((d, i) => [d, minutes[i]]) }}>
          <XYChart
            ariaLabel="Columnas de minutos activos por día"
            x={[-0.5, 13.5]}
            y={[0, maxMin * 1.15 || 10]}
            bars={days.map((d, i) => ({ x0: i - 0.4, x1: i + 0.4, y: minutes[i], color: SERIES[2], label: `${d}: ${minutes[i]} min` }))}
            segments={[{ x0: -0.5, x1: 13.5, y0: state.settings.dailyGoalMin, y1: state.settings.dailyGoalMin, color: "#e9eef8", width: 1 }]}
            formatX={(v) => (Number.isInteger(v) && v >= 0 && v < 14 ? `${Number(days[v].slice(8))}/${Number(days[v].slice(5, 7))}` : "")}
            formatY={(v) => fmt(v, 0)}
            height={220}
          />
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Progreso por mundo" subtitle="Misiones completadas sobre las disponibles" table={{ head: ["Mundo", "Completadas", "Total"], rows: WORLDS.map((w) => { const p = worldProgress(state, MISSIONS, w.id); return [w.short, p.done, p.total]; }) }}>
          <HBars
            ariaLabel="Progreso por mundo"
            max={1}
            format={(v) => `${Math.round(v * 100)} %`}
            data={WORLDS.filter((w) => worldProgress(state, MISSIONS, w.id).total > 0).map((w) => ({ label: `${w.order}. ${w.short}`, value: worldProgress(state, MISSIONS, w.id).fraction, color: SERIES[0] }))}
          />
        </ChartCard>
        <ChartCard title="Dominio estimado por habilidad" subtitle="Solo habilidades con evidencia" table={{ head: ["Habilidad", "Dominio", "Misiones", "Evidencias"], rows: mastery.map((s) => [s.skill, `${Math.round(s.value * 100)} %`, s.missions, s.evidence]) }}>
          {mastery.length ? (
            <HBars ariaLabel="Dominio por habilidad" max={1} format={(v) => `${Math.round(v * 100)} %`} data={mastery.slice(0, 12).map((s) => ({ label: s.skill, value: s.value, color: s.value >= 0.8 ? SERIES[2] : s.value >= 0.5 ? SERIES[0] : SERIES[3] }))} />
          ) : (
            <p className="text-sm text-muted">Aún no hay evidencia suficiente.</p>
          )}
          <p className="text-xs text-muted mt-3">
            El dominio es una aproximación basada en lo que observamos: resolver sin ayuda, usar pistas o la solución, el resultado de los repasos y el tiempo transcurrido desde el último. No es una medición perfecta de lo que sabes.
          </p>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="px-panel p-4">
          <h2 className="font-bold mb-2">Temas por repasar</h2>
          {summary.due.length ? (
            <ul className="flex flex-col gap-1 text-sm">
              {summary.due.slice(0, 8).map((c) => (
                <li key={c.m}>
                  <a className="text-sky underline" href={href(`mision/${c.m}/repaso`)}>
                    {missionById[c.m]?.title}
                  </a>{" "}
                  <span className="text-muted">· programado {c.due}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nada pendiente hoy.</p>
          )}
        </div>
        <div className="px-panel p-4">
          <h2 className="font-bold mb-2">Errores conceptuales detectados</h2>
          {miscon.length ? (
            <ul className="flex flex-col gap-2 text-sm">
              {miscon.map((m) => (
                <li key={m.tag}>
                  <span className={m.active ? "text-ember" : "text-leaf"}>{m.active ? "● activo" : "✔ corregido"}</span> {MISCONCEPTIONS[m.tag].title} <span className="text-muted">({m.count})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Ninguno registrado en las preguntas de interpretación.</p>
          )}
        </div>
        <div className="px-panel p-4">
          <h2 className="font-bold mb-2">Errores de Python más frecuentes</h2>
          {errorsByType.size ? (
            <HBars ariaLabel="Errores de Python por tipo" data={[...errorsByType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ label: k, value: v, color: SERIES[1] }))} format={(v) => String(v)} />
          ) : (
            <p className="text-sm text-muted">Sin errores registrados.</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="px-panel p-4">
          <h2 className="font-bold mb-2">Logros</h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {ACHIEVEMENTS.map((a) => {
              const got = summary.achievements.some((x) => x.id === a.id);
              return (
                <li key={a.id} className={`flex gap-2 items-start p-2 rounded-[2px] ${got ? "bg-gold/10" : "opacity-60"}`}>
                  <PixelIcon name={got ? a.icon : "lock"} size={18} />
                  <span className="text-sm">
                    <span className="font-bold block">{a.title}</span>
                    <span className="text-muted">{a.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="px-panel p-4">
          <h2 className="font-bold mb-2">Proyectos y evaluaciones</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {projects.map((p) => (
              <li key={p.id} className="flex justify-between gap-2">
                <a className="text-sky underline" href={href(`mision/${p.id}`)}>
                  {p.title}
                </a>
                <span className={state.missions[p.id]?.done ? "text-leaf" : "text-muted"}>{state.missions[p.id]?.done ? "Terminado" : "Pendiente"}</span>
              </li>
            ))}
            {state.placement && <li className="text-muted">Evaluación inicial: {state.placement.worlds.length ? "superada" : "omitida"} ({dayKey(state.placement.at)})</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
