import { useState } from "react";
import { py } from "../content/types";
import { CodeEditor } from "../components/CodeEditor";
import { Avatar } from "../components/pixel";
import { OutputPanel, RunnerStatus, type PanelResult } from "../components/PythonPanel";
import { Scene } from "../components/Scene";
import * as A from "../engine/actions";
import { FREE_HAIR, FREE_OUTFITS, HAIR_COLORS, itemById, OUTFIT_COLORS, SKIN_TONES } from "../engine/catalog";
import { DEFAULT_AVATAR, type Avatar as AvatarData } from "../engine/state";
import { useGame } from "../engine/store";
import { python } from "../python/runner";
import { go, href } from "../router";

export function Welcome() {
  return (
    <div className="flex flex-col gap-8 items-center text-center">
      <div className="w-full px-panel overflow-hidden">
        <Scene theme="forest" seed={11} hero={DEFAULT_AVATAR} heroAt={0.25} label="Una isla flotante con bosque: el comienzo de la aventura" />
      </div>
      <div className="max-w-2xl">
        <h1 className="font-pixel text-4xl sm:text-6xl leading-none">
          <span className="text-gold">PYTHON</span> <span className="text-sky">QUEST</span>
        </h1>
        <p className="text-xl mt-4 text-text">Un RPG en el que aprendes Python, estadística, ciencia de datos e inteligencia artificial escribiendo código de verdad.</p>
        <p className="text-muted mt-3">
          Nueve mundos, misiones con pruebas automáticas, laboratorios interactivos y proyectos para tu portafolio. Python se ejecuta en tu navegador: no hace falta instalar nada ni crear una cuenta.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <a className="btn-gold text-lg px-6 py-3" href={href("crear")}>
          Crear mi personaje
        </a>
        <a className="btn-ghost text-lg px-6 py-3" href={href("ajustes")}>
          Importar progreso
        </a>
      </div>
      <ul className="grid sm:grid-cols-3 gap-4 text-left w-full max-w-4xl">
        {[
          ["Código real", "Cada misión tiene un editor y pruebas que evalúan lo que hace tu programa, no si escribiste un texto exacto."],
          ["Comprensión antes que velocidad", "Intuición, fórmula, ejemplo, reto e interpretación. Los repasos espaciados vuelven a lo que más te cuesta."],
          ["Tu progreso es tuyo", "Se guarda en este navegador y puedes exportarlo e importarlo como archivo JSON."],
        ].map(([t, d]) => (
          <li key={t} className="px-panel p-4">
            <div className="font-pixel text-gold">{t}</div>
            <p className="text-sm text-muted mt-1">{d}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Swatches({ colors, value, onChange, label }: { colors: string[]; value: string; onChange: (c: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={`w-8 h-8 rounded-[2px] ${value === c ? "shadow-pxgold" : "shadow-px"}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function Options({ options, value, onChange, label, names }: { options: string[]; value: string; onChange: (v: string) => void; label: string; names?: Record<string, string> }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} role="radio" aria-checked={value === o} onClick={() => onChange(o)} className={`chip text-sm py-1 px-3 ${value === o ? "bg-gold text-ink" : ""}`}>
          {names?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

export function AvatarEditor({ avatar, onChange, owned }: { avatar: AvatarData; onChange: (a: AvatarData) => void; owned: string[] }) {
  const outfits = [...FREE_OUTFITS, ...owned.filter((id) => itemById[id]?.kind === "outfit")];
  const hairs = [...FREE_HAIR, ...owned.filter((id) => itemById[id]?.kind === "hair")];
  const pets = owned.filter((id) => itemById[id]?.kind === "pet");
  const frames = owned.filter((id) => itemById[id]?.kind === "frame");
  const names: Record<string, string> = { tunica: "Túnica", capa: "Capa", corto: "Corto", largo: "Largo", rizado: "Rizado", rapado: "Rapado", ...Object.fromEntries(owned.map((id) => [id, itemById[id]?.name ?? id])) };
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="label mb-2">Tono de piel</div>
        <Swatches colors={SKIN_TONES} value={SKIN_TONES[avatar.skin]} onChange={(c) => onChange({ ...avatar, skin: SKIN_TONES.indexOf(c) })} label="Tono de piel" />
      </div>
      <div>
        <div className="label mb-2">Peinado</div>
        <Options options={hairs} value={avatar.hair} onChange={(hair) => onChange({ ...avatar, hair })} label="Peinado" names={names} />
      </div>
      <div>
        <div className="label mb-2">Color de pelo</div>
        <Swatches colors={HAIR_COLORS} value={avatar.hairColor} onChange={(hairColor) => onChange({ ...avatar, hairColor })} label="Color de pelo" />
      </div>
      <div>
        <div className="label mb-2">Atuendo</div>
        <Options options={outfits} value={avatar.outfit} onChange={(outfit) => onChange({ ...avatar, outfit })} label="Atuendo" names={names} />
      </div>
      <div>
        <div className="label mb-2">Color del atuendo</div>
        <Swatches colors={OUTFIT_COLORS} value={avatar.outfitColor} onChange={(outfitColor) => onChange({ ...avatar, outfitColor })} label="Color del atuendo" />
      </div>
      {pets.length > 0 && (
        <div>
          <div className="label mb-2">Mascota</div>
          <Options options={["ninguna", ...pets]} value={avatar.pet ?? "ninguna"} onChange={(p) => onChange({ ...avatar, pet: p === "ninguna" ? null : p })} label="Mascota" names={{ ...names, ninguna: "Ninguna" }} />
        </div>
      )}
      {frames.length > 0 && (
        <div>
          <div className="label mb-2">Marco</div>
          <Options options={["ninguno", ...frames]} value={avatar.frame ?? "ninguno"} onChange={(p) => onChange({ ...avatar, frame: p === "ninguno" ? null : p })} label="Marco" names={{ ...names, ninguno: "Ninguno" }} />
        </div>
      )}
    </div>
  );
}

export function CharacterCreate() {
  const { state, update } = useGame();
  const [name, setName] = useState(state.profile?.name ?? "");
  const [avatar, setAvatar] = useState<AvatarData>(state.profile?.avatar ?? DEFAULT_AVATAR);
  const valid = name.trim().length > 0;
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6 items-start">
      <div className="px-panel p-6 flex flex-col items-center gap-4">
        <h1 className="px-title text-gold text-xl">Tu personaje</h1>
        <div className="bg-night p-4 rounded-[2px] animate-bob">
          <Avatar avatar={avatar} scale={9} animate label={`Vista previa del personaje de ${name || "la aventurera"}`} />
        </div>
        <p className="text-sm text-muted text-center">Ganarás monedas para desbloquear atuendos, mascotas y temas. Tu personaje cambia contigo.</p>
      </div>
      <form
        className="px-panel p-6 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          const first = !state.profile;
          update((s) => A.setProfile(s, name, avatar));
          go(first ? "evaluacion" : "");
        }}
      >
        <div>
          <label htmlFor="hero-name" className="label block mb-2">
            Nombre (aparecerá en tus certificados)
          </label>
          <input id="hero-name" className="input text-lg" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Por ejemplo: Ada" autoComplete="nickname" />
        </div>
        <AvatarEditor avatar={avatar} onChange={setAvatar} owned={state.owned} />
        <button className="btn-gold text-lg self-start" disabled={!valid}>
          {state.profile ? "Guardar cambios" : "Comenzar la aventura"}
        </button>
      </form>
    </div>
  );
}

const PLACEMENT = [
  {
    title: "Filtrar con listas",
    prompt: "Escribe `pares(numeros)` que devuelva una lista con los números pares, en el mismo orden.",
    starter: py`def pares(numeros):
    pass`,
    tests: py`
def test_pares():
    "pares([1, 2, 3, 4, 10, 7]) == [2, 4, 10]"
    f = t.get("pares", "function")
    assert f([1, 2, 3, 4, 10, 7]) == [2, 4, 10]
    assert f([]) == [] and f([1, 3]) == []
`,
  },
  {
    title: "Contar con diccionarios",
    prompt: "Escribe `contar(texto)` que devuelva un diccionario con cuántas veces aparece cada palabra (en minúsculas).",
    starter: py`def contar(texto):
    pass`,
    tests: py`
def test_contar():
    "contar('El gato y el perro') cuenta 'el' dos veces"
    f = t.get("contar", "function")
    assert f("El gato y el perro") == {"el": 2, "gato": 1, "y": 1, "perro": 1}
    assert f("") == {}
`,
  },
  {
    title: "Funciones y errores",
    prompt: "Escribe `media(valores)` que devuelva la media aritmética y lance `ValueError` si la lista está vacía.",
    starter: py`def media(valores):
    pass`,
    tests: py`
def test_media():
    "media([2, 4, 9]) == 5"
    f = t.get("media", "function")
    assert approx(f([2, 4, 9]), 5) and approx(f([1.5]), 1.5)

def test_vacia():
    "media([]) lanza ValueError"
    try:
        t.get("media")([])
    except ValueError:
        return
    assert False, "No lanzó ValueError"
`,
  },
];

export function Placement() {
  const { state, update, toast } = useGame();
  const [i, setI] = useState(0);
  const [codes, setCodes] = useState(PLACEMENT.map((p) => p.starter));
  const [passed, setPassed] = useState<boolean[]>(PLACEMENT.map(() => false));
  const [out, setOut] = useState<PanelResult>(null);
  const [busy, setBusy] = useState(false);
  const done = passed.every(Boolean);
  const task = PLACEMENT[i];

  const check = async () => {
    setBusy(true);
    try {
      const result = await python.run({ code: codes[i], tests: task.tests });
      setOut({ result, checked: true });
      update((s) => A.recordRun(s));
      if (result.passed) setPassed((p) => p.map((x, j) => (j === i ? true : x)));
    } catch (e) {
      setOut({ failure: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const finish = (skip: boolean) => {
    if (skip) {
      update((s) => A.setPlacement(s, []));
      go("mapa");
      return;
    }
    update((s) => A.setPlacement(s, ["w2", "w3", "w4"]));
    toast("Evaluación superada: se abrieron las Montañas, el Reino de los Datos y el Imperio de la Estadística.", "good");
    go("mapa");
  };

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div>
        <h1 className="px-title text-gold text-2xl">Evaluación inicial (opcional)</h1>
        <p className="text-muted mt-1">
          Si ya programas en Python, resuelve estos tres retos para abrir los mundos 2, 3 y 4 sin completar antes el Bosque. Si estás empezando, sáltala: el Bosque te enseña todo desde cero.
          {state.placement && " Ya hiciste esta evaluación; puedes repetirla."}
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {PLACEMENT.map((p, j) => (
          <button key={p.title} className={`chip text-sm py-1 px-3 ${j === i ? "bg-gold text-ink" : passed[j] ? "bg-leaf text-ink" : ""}`} onClick={() => (setI(j), setOut(null))}>
            {passed[j] ? "✔ " : ""}
            {j + 1}. {p.title}
          </button>
        ))}
      </div>
      <div className="px-panel p-4">
        <p>
          {task.prompt.split("`").map((part, k) => (k % 2 ? <code key={k} className="font-mono text-sky">{part}</code> : part))}
        </p>
      </div>
      <div className="px-panel overflow-hidden">
        <CodeEditor key={i} value={codes[i]} onChange={(v) => setCodes((c) => c.map((x, j) => (j === i ? v : x)))} onCheck={check} onRun={check} label={`Reto de evaluación ${i + 1}`} theme={state.settings.editorTheme} fontSize={state.settings.fontSize} minHeight={160} />
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <button className="btn-leaf" onClick={check} disabled={busy}>
          ✔ Comprobar
        </button>
        <RunnerStatus />
      </div>
      <div className="bg-night rounded-[2px]">
        <OutputPanel out={out} emptyText="Pulsa Comprobar para ejecutar las pruebas." />
      </div>
      <div className="flex gap-3 flex-wrap">
        <button className="btn-gold" disabled={!done} onClick={() => finish(false)}>
          Terminar evaluación
        </button>
        <button className="btn-ghost" onClick={() => finish(true)}>
          Saltar y empezar desde cero
        </button>
      </div>
    </div>
  );
}
