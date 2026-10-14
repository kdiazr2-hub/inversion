// React binding for the engine: holds the SaveState, persists it, derives the summary
// and turns state changes into celebrations (mission complete, level up, achievements).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MISSIONS, WORLDS } from "../content";
import { recordUnlocks, summarize, type Content, type Summary } from "./derive";
import { newSave, type SaveState } from "./state";
import { loadSave, persist } from "./storage";

export const CONTENT: Content = { missions: MISSIONS, worlds: WORLDS };

export type Celebration =
  | { kind: "mission"; missionId: string; xp: number; coins: number }
  | { kind: "level"; level: number }
  | { kind: "achievement"; id: string; title: string };

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "good" | "bad";
}

interface Store {
  state: SaveState;
  summary: Summary;
  update: (fn: (s: SaveState) => SaveState) => void;
  replace: (s: SaveState) => void;
  reset: () => void;
  saved: boolean;
  celebrations: Celebration[];
  dismissCelebration: () => void;
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
}

const Ctx = createContext<Store | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => loadSave(CONTENT), []);
  const [state, setState] = useState<SaveState>(() => recordUnlocks(initial.state, CONTENT));
  const [saved, setSaved] = useState(true);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const summary = useMemo(() => summarize(state, CONTENT), [state]);
  const prev = useRef<{ summary: Summary; state: SaveState }>({ summary, state });

  const toast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  useEffect(() => {
    if (initial.warning) toast(initial.warning, "bad");
  }, [initial.warning, toast]);

  // Persist (lightly debounced) and detect what changed.
  useEffect(() => {
    const ok = persist(state);
    setSaved(ok);
    const before = prev.current;
    const found: Celebration[] = [];
    for (const m of MISSIONS) {
      if (state.missions[m.id]?.done && !before.state.missions[m.id]?.done) {
        found.push({ kind: "mission", missionId: m.id, xp: summary.xp - before.summary.xp, coins: summary.coinsEarned - before.summary.coinsEarned });
      }
    }
    if (summary.level.level > before.summary.level.level) found.push({ kind: "level", level: summary.level.level });
    const had = new Set(before.summary.achievements.map((a) => a.id));
    for (const a of summary.achievements) if (!had.has(a.id)) found.push({ kind: "achievement", id: a.id, title: a.title });
    if (found.length) setCelebrations((c) => [...c, ...found]);
    prev.current = { summary, state };
  }, [state, summary]);

  const update = useCallback((fn: (s: SaveState) => SaveState) => setState((s) => recordUnlocks(fn(s), CONTENT)), []);
  const replace = useCallback((imported: SaveState) => {
    const s = recordUnlocks(imported, CONTENT);
    // An import is not a celebration: reset the baseline first.
    prev.current = { state: s, summary: summarize(s, CONTENT) };
    setState(s);
  }, []);
  const reset = useCallback(() => replace(newSave()), [replace]);
  const dismissCelebration = useCallback(() => setCelebrations((c) => c.slice(1)), []);

  const value = useMemo(
    () => ({ state, summary, update, replace, reset, saved, celebrations, dismissCelebration, toasts, toast }),
    [state, summary, update, replace, reset, saved, celebrations, dismissCelebration, toasts, toast],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useGame fuera de GameProvider");
  return s;
}
