// Tiny hash router: #/ruta/param. Hash routing works from any static host and from file servers.
import { useEffect, useState } from "react";

export type Route = { path: string; parts: string[] };

const parse = (): Route => {
  const raw = location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean).map(decodeURIComponent);
  return { path: parts[0] ?? "", parts };
};

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const go = (path: string) => {
  location.hash = "#/" + path.replace(/^\/+/, "");
};

export const href = (path: string) => "#/" + path.replace(/^\/+/, "");
