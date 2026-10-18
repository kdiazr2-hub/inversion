import { lazy, Suspense, useEffect } from "react";
import { Shell } from "./components/Shell";
import { useGame } from "./engine/store";
import { LabsHub } from "./labs/LabsHub";
import { go, href, useRoute } from "./router";
import { Home } from "./screens/Home";
import { MissionView } from "./screens/MissionView";
import { Certificates, Inventory, Portfolio, Projects, Review, Settings } from "./screens/Misc";
import { CharacterCreate, Placement, Welcome } from "./screens/Onboarding";
import { Progress } from "./screens/Progress";
import { WorldMap, WorldView } from "./screens/WorldMap";

const Playground = lazy(() => import("./labs/Playground").then((m) => ({ default: m.Playground })));
const StatsLab = lazy(() => import("./labs/StatsLab").then((m) => ({ default: m.StatsLab })));
const DataLab = lazy(() => import("./labs/DataLab").then((m) => ({ default: m.DataLab })));
const MathLab = lazy(() => import("./labs/MathLab").then((m) => ({ default: m.MathLab })));
const MLLab = lazy(() => import("./labs/MLLab").then((m) => ({ default: m.MLLab })));
const AILab = lazy(() => import("./labs/AILab").then((m) => ({ default: m.AILab })));

function NotFound() {
  return (
    <div className="px-panel p-6 max-w-lg">
      <h1 className="px-title text-gold text-xl">Camino perdido</h1>
      <p className="mt-2">Esta página no existe.</p>
      <a className="btn-gold mt-4" href={href("")}>
        Volver al inicio
      </a>
    </div>
  );
}

function Loading() {
  return <p className="text-muted">Cargando…</p>;
}

export function App() {
  const { state } = useGame();
  const { path, parts } = useRoute();
  const hasProfile = Boolean(state.profile);
  const open = ["", "crear", "ajustes"];
  useEffect(() => {
    if (!hasProfile && !open.includes(path)) go("");
  }, [hasProfile, path]); // eslint-disable-line react-hooks/exhaustive-deps

  let page;
  if (!hasProfile && path === "") page = <Welcome />;
  else if (!hasProfile && !open.includes(path)) page = <Welcome />;
  else
    switch (path) {
      case "":
        page = <Home />;
        break;
      case "crear":
        page = <CharacterCreate />;
        break;
      case "evaluacion":
        page = <Placement />;
        break;
      case "mapa":
        page = <WorldMap />;
        break;
      case "mundo":
        page = <WorldView id={parts[1] ?? ""} />;
        break;
      case "mision":
        page = <MissionView key={parts.slice(1, 3).join("/")} id={parts[1] ?? ""} review={parts[2] === "repaso"} />;
        break;
      case "repaso":
        page = <Review />;
        break;
      case "labs":
        page = {
          estadistica: <StatsLab key={parts[2]} initial={parts[2]} />,
          matematicas: <MathLab key={parts[2]} initial={parts[2]} />,
          datos: <DataLab />,
          ml: <MLLab key={parts[2]} initial={parts[2]} />,
          ia: <AILab />,
          python: <Playground />,
        }[parts[1] ?? ""] ?? <LabsHub />;
        break;
      case "proyectos":
        page = <Projects />;
        break;
      case "portafolio":
        page = <Portfolio />;
        break;
      case "certificados":
        page = <Certificates />;
        break;
      case "inventario":
        page = <Inventory />;
        break;
      case "progreso":
        page = <Progress />;
        break;
      case "ajustes":
        page = <Settings />;
        break;
      default:
        page = <NotFound />;
    }
  return (
    <Shell route={parts.join("/")}>
      <Suspense fallback={<Loading />}>{page}</Suspense>
    </Shell>
  );
}
