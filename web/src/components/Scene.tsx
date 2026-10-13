// Procedural pixel landscapes: one floating island per world theme, drawn at low
// resolution on a canvas and scaled up with crisp pixels. Deterministic per seed.
import { useEffect, useRef } from "react";
import type { SceneTheme } from "../content/types";
import type { Avatar as AvatarData } from "../engine/state";
import { drawHero, drawPet } from "./pixel";

const W = 192;
const H = 96;

interface ThemeColors {
  sky: [string, string, string];
  grass: string;
  grassDark: string;
  dirt: string;
  dirtDark: string;
  accent: string;
  night: boolean;
}

const THEMES: Record<SceneTheme, ThemeColors> = {
  forest: { sky: ["#2a4a8a", "#4f7cc4", "#8fc1e8"], grass: "#4caf50", grassDark: "#2e7d32", dirt: "#8d6e63", dirtDark: "#5d4037", accent: "#f2c14e", night: false },
  mountains: { sky: ["#3b3f7a", "#6a6fb8", "#b8b4e0"], grass: "#7cb342", grassDark: "#4a7a26", dirt: "#7d7d8c", dirtDark: "#4f4f60", accent: "#e9eef8", night: false },
  castle: { sky: ["#4a2f6b", "#a3577a", "#f2a65a"], grass: "#66bb6a", grassDark: "#388e3c", dirt: "#8d6e63", dirtDark: "#5d4037", accent: "#ff7a59", night: false },
  observatory: { sky: ["#070b1a", "#141f4a", "#2c3f8b"], grass: "#3f9a7a", grassDark: "#24644f", dirt: "#5f5a7a", dirtDark: "#3b3654", accent: "#a996ff", night: true },
  city: { sky: ["#1b1440", "#5a2f6b", "#ff8a65"], grass: "#4d7a6b", grassDark: "#2f5247", dirt: "#4f5670", dirtDark: "#2f3550", accent: "#f2c14e", night: false },
  lab: { sky: ["#0c1e2a", "#145a6b", "#3fb8c4"], grass: "#3fa38a", grassDark: "#24705c", dirt: "#56607a", dirtDark: "#343c52", accent: "#5ad1e8", night: false },
  fortress: { sky: ["#120818", "#3a0f3a", "#7a1f4f"], grass: "#4a5a7a", grassDark: "#2f3a52", dirt: "#3b3550", dirtDark: "#241f33", accent: "#ff9fc2", night: true },
  tower: { sky: ["#0f1830", "#1f3a6b", "#4f7cc4"], grass: "#5a8a6b", grassDark: "#365a44", dirt: "#6b6070", dirtDark: "#433b4a", accent: "#f2c14e", night: true },
  multiverse: { sky: ["#0b0620", "#3a1f6b", "#1f6b8a"], grass: "#7a5af2", grassDark: "#4a33a3", dirt: "#3b2f6b", dirtDark: "#241a4a", accent: "#6fd672", night: true },
};

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function rect(ctx: CanvasRenderingContext2D, c: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function island(ctx: CanvasRenderingContext2D, th: ThemeColors, cx: number, top: number, width: number, depth: number, r: () => number) {
  const half = width / 2;
  for (let y = 0; y < depth; y++) {
    const shrink = Math.pow(y / depth, 0.8) * half;
    const jag = Math.floor(r() * 3);
    const x0 = cx - half + shrink + jag;
    const x1 = cx + half - shrink - jag;
    rect(ctx, y < 3 ? th.grass : y < 5 ? th.grassDark : y % 4 === 0 ? th.dirtDark : th.dirt, x0, top + y, Math.max(1, x1 - x0), 1);
  }
  // grass tufts
  for (let x = cx - half + 2; x < cx + half - 2; x += 3 + Math.floor(r() * 4)) rect(ctx, th.grassDark, x, top - 1, 1, 1);
  // hanging roots
  for (let i = 0; i < width / 8; i++) {
    const x = cx - half / 2 + r() * half;
    rect(ctx, th.dirtDark, x, top + depth - 2, 1, 2 + r() * 4);
  }
}

function tree(ctx: CanvasRenderingContext2D, x: number, base: number, h: number) {
  rect(ctx, "#5d4037", x, base - h, 2, h);
  rect(ctx, "#2e7d32", x - 4, base - h - 6, 10, 6);
  rect(ctx, "#43a047", x - 3, base - h - 9, 8, 4);
  rect(ctx, "#66bb6a", x - 1, base - h - 11, 4, 3);
}

function features(ctx: CanvasRenderingContext2D, theme: SceneTheme, th: ThemeColors, cx: number, ground: number, r: () => number) {
  switch (theme) {
    case "forest":
      for (let i = 0; i < 6; i++) tree(ctx, cx - 50 + i * 19 + r() * 6, ground, 5 + r() * 6);
      rect(ctx, "#8d6e63", cx - 6, ground - 8, 1, 8);
      rect(ctx, "#c9a77a", cx - 10, ground - 10, 10, 4);
      break;
    case "mountains":
      for (let i = 0; i < 3; i++) {
        const px = cx - 40 + i * 38;
        const ph = 26 + r() * 14;
        for (let y = 0; y < ph; y++) {
          const w = (y / ph) * 30;
          rect(ctx, y < ph * 0.3 ? "#e9eef8" : y % 5 === 0 ? "#5f5f70" : "#7d7d8c", px - w / 2, ground - ph + y, w, 1);
        }
      }
      break;
    case "castle": {
      const b = ground;
      rect(ctx, "#8a99b8", cx - 22, b - 22, 44, 22);
      for (let x = cx - 22; x < cx + 22; x += 4) rect(ctx, "#8a99b8", x, b - 25, 2, 3);
      for (const tx of [cx - 30, cx + 22]) {
        rect(ctx, "#7a88a8", tx, b - 34, 8, 34);
        rect(ctx, "#3b5bb5", tx - 1, b - 40, 10, 6);
        rect(ctx, "#3b5bb5", tx + 1, b - 44, 6, 4);
        rect(ctx, th.accent, tx + 4, b - 50, 1, 6);
        rect(ctx, th.accent, tx + 5, b - 50, 3, 2);
      }
      rect(ctx, "#3b2a1e", cx - 4, b - 10, 8, 10);
      for (const wx of [cx - 14, cx + 10]) rect(ctx, "#f2c14e", wx, b - 16, 3, 4);
      break;
    }
    case "observatory": {
      rect(ctx, "#cfd8ea", cx - 14, ground - 16, 28, 16);
      for (let y = 0; y < 12; y++) {
        const w = Math.sqrt(1 - (y / 12) ** 2) * 16;
        rect(ctx, y % 3 === 0 ? "#9fb0d0" : "#e9eef8", cx - w, ground - 16 - (12 - y), w * 2, 1);
      }
      rect(ctx, "#2c3f6b", cx - 1, ground - 28, 3, 12);
      for (let i = 0; i < 6; i++) rect(ctx, "#5f6f94", cx + 3 + i, ground - 30 - i, 3, 2);
      rect(ctx, th.accent, cx - 3, ground - 8, 6, 8);
      break;
    }
    case "city":
      for (let i = 0; i < 9; i++) {
        const bw = 8 + Math.floor(r() * 6);
        const bh = 14 + Math.floor(r() * 30);
        const bx = cx - 52 + i * 12;
        rect(ctx, i % 2 ? "#2f3550" : "#3b4260", bx, ground - bh, bw, bh);
        for (let wy = ground - bh + 3; wy < ground - 3; wy += 4)
          for (let wx = bx + 2; wx < bx + bw - 2; wx += 3) if (r() > 0.45) rect(ctx, r() > 0.3 ? th.accent : "#5ad1e8", wx, wy, 1, 2);
      }
      break;
    case "lab":
      rect(ctx, "#cfd8ea", cx - 26, ground - 20, 52, 20);
      rect(ctx, "#9fb0d0", cx - 26, ground - 22, 52, 2);
      for (let x = cx - 22; x < cx + 22; x += 8) rect(ctx, "#5ad1e8", x, ground - 15, 4, 5);
      rect(ctx, "#5f6f94", cx + 16, ground - 38, 2, 16);
      rect(ctx, th.accent, cx + 13, ground - 40, 8, 3);
      for (const fx of [cx - 40, cx + 34]) {
        rect(ctx, "#e9eef8", fx, ground - 8, 6, 8);
        rect(ctx, fx > cx ? "#6fd672" : "#ff9fc2", fx + 1, ground - 5, 4, 4);
      }
      break;
    case "fortress":
      rect(ctx, "#2f2a44", cx - 30, ground - 28, 60, 28);
      for (let x = cx - 30; x < cx + 30; x += 5) rect(ctx, "#2f2a44", x, ground - 31, 3, 3);
      rect(ctx, "#241f33", cx - 8, ground - 46, 16, 18);
      rect(ctx, th.accent, cx - 3, ground - 40, 6, 6);
      rect(ctx, "#ffffff", cx - 1, ground - 38, 2, 2);
      for (let i = 0; i < 5; i++) rect(ctx, "#ff9fc2", cx - 24 + i * 12, ground - 18, 2, 3);
      break;
    case "tower":
      rect(ctx, "#4f5670", cx - 8, ground - 60, 16, 60);
      for (let y = ground - 56; y < ground - 4; y += 8) rect(ctx, th.accent, cx - 2, y, 4, 4);
      rect(ctx, "#2f3550", cx - 12, ground - 66, 24, 6);
      rect(ctx, "#5ad1e8", cx - 1, ground - 74, 2, 8);
      break;
    case "multiverse":
      for (let i = 0; i < 4; i++) {
        const px = cx - 45 + i * 30;
        const col = ["#6fd672", "#f2c14e", "#5ad1e8", "#ff9fc2"][i];
        for (let a = 0; a < 24; a++) {
          const ang = (a / 24) * Math.PI * 2;
          rect(ctx, col, px + Math.cos(ang) * 7, ground - 14 + Math.sin(ang) * 10, 2, 2);
        }
        rect(ctx, "#0b0620", px - 4, ground - 21, 8, 14);
      }
      break;
  }
}

export interface SceneProps {
  theme: SceneTheme;
  seed?: number;
  hero?: AvatarData | null;
  className?: string;
  label: string;
  /** Hero x position from 0 to 1 along the island. */
  heroAt?: number;
}

export function Scene({ theme, seed = 7, hero, className = "", label, heroAt = 0.3 }: SceneProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const th = THEMES[theme];
    let frame = 0;
    let clouds = 0;
    const draw = () => {
      const r = rng(seed * 9973 + theme.length * 31);
      // sky: three bands with dithered seams
      const bands = [0, 30, 58, H];
      for (let b = 0; b < 3; b++) rect(ctx, th.sky[b], 0, bands[b], W, bands[b + 1] - bands[b]);
      // checkerboard dither across each seam (two rows) so bands blend instead of striping
      for (let b = 1; b < 3; b++)
        for (let x = 0; x < W; x++) {
          if ((x + bands[b]) % 2 === 0) rect(ctx, th.sky[b], x, bands[b] - 1, 1, 1);
          if ((x + bands[b]) % 2 === 1) rect(ctx, th.sky[b - 1], x, bands[b], 1, 1);
          if (x % 4 === 0) rect(ctx, th.sky[b], x, bands[b] - 2, 1, 1);
        }
      if (th.night) {
        for (let i = 0; i < 70; i++) rect(ctx, r() > 0.85 ? th.accent : "#e9eef8", r() * W, r() * 50, 1, 1);
        rect(ctx, "#fff4c2", 160, 10, 6, 6);
        rect(ctx, th.sky[0], 162, 10, 4, 4);
      } else {
        rect(ctx, "#fff4c2", 22, 12, 8, 8);
      }
      // drifting clouds
      for (let i = 0; i < 4; i++) {
        const cy = 10 + r() * 30;
        const cw = 14 + r() * 18;
        const cx = ((r() * W + clouds * (0.3 + i * 0.1)) % (W + 40)) - 20;
        const c = th.night ? "#2c3f6b" : "#ffffff";
        rect(ctx, c, cx, cy, cw, 3);
        rect(ctx, c, cx + 3, cy - 2, cw - 6, 2);
      }
      // distant islands
      for (let i = 0; i < 3; i++) {
        const dx = 20 + i * 70 + r() * 20;
        const dy = 38 + r() * 14;
        rect(ctx, th.grassDark, dx, dy, 18, 2);
        rect(ctx, th.dirtDark, dx + 3, dy + 2, 12, 3);
        rect(ctx, th.dirtDark, dx + 6, dy + 5, 6, 2);
      }
      // main island
      const top = 70;
      island(ctx, th, W / 2, top, 150, 24, r);
      features(ctx, theme, th, W / 2 + 18, top, r);
      // waterfall / path detail
      if (theme === "forest" || theme === "castle") {
        for (let y = top + 6; y < H; y++) rect(ctx, y % 3 ? "#8fd3f0" : "#e9f8ff", W / 2 + 46, y, 3, 1);
      }
      if (hero) {
        const hx = Math.round(W / 2 - 75 + 150 * heroAt - 8);
        drawHero(ctx, hero, hx, top - 20, frame);
        if (hero.pet) drawPet(ctx, hero.pet, hx + 16, top - 9, frame + 1);
      }
    };
    draw();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduce-motion");
    if (reduce) return;
    const id = setInterval(() => {
      frame++;
      clouds += 2;
      draw();
    }, 500);
    return () => clearInterval(id);
  }, [theme, seed, hero, heroAt]);
  return <canvas ref={ref} width={W} height={H} role="img" aria-label={label} className={`pixelated w-full h-auto block ${className}`} />;
}
