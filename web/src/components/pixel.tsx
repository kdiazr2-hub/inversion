// Pixel-art character, pets and badges drawn from tiny character maps onto a canvas.
// No image assets: every sprite is data, so colours can be customised freely.
import { useEffect, useRef } from "react";
import { SKIN_TONES } from "../engine/catalog";
import type { Avatar as AvatarData } from "../engine/state";

type Palette = Record<string, string>;

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

export function drawMap(ctx: CanvasRenderingContext2D, rows: string[], pal: Palette, ox = 0, oy = 0) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === "." || ch === " ") continue;
      const col = pal[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

// 16 × 20 hero. K outline, S skin, s skin shade, E eye, M mouth, O outfit, o outfit shade,
// A accent, B boots/belt, P trousers, W white.
const BODY = [
  "................",
  "................",
  "................",
  "................",
  "....KKKKKKKK....",
  "...KSSSSSSSSK...",
  "...KSSESSESSK...",
  "...KSSSSSSSSK...",
  "....KSSMMSSK....",
  ".....KsssK......",
  "...KKOOOOOOKK...",
  "..KSKOOAAOOKSK..",
  "..KSKOOAAOOKSK..",
  "..KSKOOOOOOKSK..",
  "...KKBBBBBBKK...",
  "....KPPKKPPK....",
  "....KPPKKPPK....",
  "...KBBBKKBBBK...",
  "...KKKKKKKKKK...",
  "................",
];

const HAIR: Record<string, string[]> = {
  corto: ["................", "................", ".....HHHHHH.....", "....HHHHHHHH....", "...HHHHHHHHHH...", "...HHHhhhhHHH...", "...HH......HH..."],
  largo: ["................", "................", ".....HHHHHH.....", "....HHHHHHHH....", "...HHHHHHHHHH...", "..HHHHhhhhHHHH..", "..HH........HH..", "..HH........HH..", "..HH........HH..", "..HH........HH..", "...H........H..."],
  rizado: ["................", "...H.HH..HH.H...", "..HHHHHHHHHHHH..", "..HHHHHHHHHHHH..", "..HHHHHHHHHHHH..", "..HHHhhhhhhHHH..", "..HH........HH..", "..H..........H.."],
  rapado: ["................", "................", "................", "................", "....hhhhhhhh....", "...hh......hh..."],
  coleta: ["................", "................", ".....HHHHHH.....", "....HHHHHHHH.HH.", "...HHHHHHHHHHHH.", "...HHHhhhhHHH.HH", "...HH......HH.HH", ".............HH.", ".............H.."],
  cresta: ["......HHHH......", "......HHHH......", ".....HHHHHH.....", "....hHHHHHHh....", "...hhhHHHHhhh...", "...hh......hh..."],
};

const OUTFIT_OVERLAY: Record<string, { rows?: string[]; offset?: number; colors?: (base: string) => Palette }> = {
  tunica: {},
  capa: {
    rows: ["..CC........CC..", ".CCC........CCC.", ".CCC........CCC.", ".CCC........CCC.", ".CC..........CC.", ".C............C."],
    offset: 10,
  },
  armadura: { colors: () => ({ O: "#8a99b8", o: "#5f6f94", A: "#f2c14e" }), rows: ["...............", "......WW........"], offset: 10 },
  bata: { colors: (b) => ({ O: "#e9eef8", o: "#c9d3e8", A: b }) },
  toga: { colors: () => ({ O: "#2b2f6b", o: "#1d2050", A: "#f2c14e" }), rows: ["....K.AAAA.K....", "....KAAAAAAK...."], offset: 13 },
  "traje-ia": { colors: () => ({ O: "#1a2238", o: "#111829", A: "#5ad1e8" }) },
};

export function drawHero(ctx: CanvasRenderingContext2D, a: AvatarData, ox = 0, oy = 0, frame = 0) {
  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[1];
  const outfit = OUTFIT_OVERLAY[a.outfit] ?? OUTFIT_OVERLAY.tunica;
  const base: Palette = {
    K: "#0b1120",
    S: skin,
    s: shade(skin, -0.12),
    E: "#0b1120",
    M: shade(skin, -0.28),
    O: a.outfitColor,
    o: shade(a.outfitColor, -0.18),
    A: shade(a.outfitColor, 0.25),
    B: "#5a3a22",
    P: "#2f3b55",
    W: "#e9eef8",
    H: a.hairColor,
    h: shade(a.hairColor, 0.12),
    C: shade(a.outfitColor, -0.3),
  };
  const pal = { ...base, ...(outfit.colors?.(a.outfitColor) ?? {}) };
  const bob = frame % 2;
  if (a.outfit === "capa" && outfit.rows) drawMap(ctx, outfit.rows, pal, ox, oy + (outfit.offset ?? 0) + bob);
  drawMap(ctx, BODY, pal, ox, oy + bob);
  if (a.outfit !== "capa" && outfit.rows) drawMap(ctx, outfit.rows, pal, ox, oy + (outfit.offset ?? 0) + bob);
  drawMap(ctx, HAIR[a.hair] ?? HAIR.corto, pal, ox, oy + bob);
  if (a.outfit === "traje-ia") {
    ctx.fillStyle = "#5ad1e8";
    ctx.fillRect(ox + 5, oy + 12 + bob, 1, 1);
    ctx.fillRect(ox + 10, oy + 13 + bob, 1, 1);
  }
}

const PETS: Record<string, { rows: string[]; pal: Palette }> = {
  gato: {
    rows: ["K...K.....", "KK.KK.....", "KWKWK.....", "KWWWK...K.", "KEWEK..KK.", ".KWWKKKK..", ".KWWWWWK..", ".KWKKKWK..", ".KK...KK.."],
    pal: { K: "#0b1120", W: "#d9a066", E: "#6fd672" },
  },
  buho: {
    rows: [".K.....K..", ".KKKKKKK..", "KWWKKKWWK.", "KWEKAKEWK.", "KWWKAKWWK.", ".KBBBBBK..", ".KBbBbBK..", ".KBBBBBK..", "..A...A..."],
    pal: { K: "#3b2a1e", W: "#f2e6c9", E: "#0b1120", A: "#f2c14e", B: "#8a6a4a", b: "#c9a77a" },
  },
  dragon: {
    rows: ["......KK..", ".....KGGK.", "..K.KGEGK.", ".KGKGGGGKK", "KGGGGGGK..", "KGgGGGGK..", ".KGGgGGK..", "..KGKKGK..", "..KK..KK.."],
    pal: { K: "#0b1120", G: "#3f9a54", g: "#f2c14e", E: "#ff7a59" },
  },
  robot: {
    rows: ["....K.....", "...KAK....", ".KKKKKKK..", ".KMEMEMK..", ".KMMMMMK..", "..KKKKK...", ".KMMCMMK..", ".KMMMMMK..", "..K...K..."],
    pal: { K: "#0b1120", M: "#8a99b8", E: "#5ad1e8", A: "#ff7a59", C: "#f2c14e" },
  },
};

export function drawPet(ctx: CanvasRenderingContext2D, pet: string, ox: number, oy: number, frame = 0) {
  const p = PETS[pet];
  if (p) drawMap(ctx, p.rows, p.pal, ox, oy + (frame % 2));
}

/** Character portrait. `scale` is the integer pixel size. */
export function Avatar({ avatar, scale = 4, animate = false, withPet = true, className = "", label }: { avatar: AvatarData; scale?: number; animate?: boolean; withPet?: boolean; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = withPet && avatar.pet ? 28 : 16;
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, 20);
      drawHero(ctx, avatar, 0, 0, frame);
      if (withPet && avatar.pet) drawPet(ctx, avatar.pet, 17, 10, frame + 1);
    };
    draw();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduce) return;
    const id = setInterval(() => {
      frame++;
      draw();
    }, 450);
    return () => clearInterval(id);
  }, [avatar, animate, withPet, w]);
  const frameColor = avatar.frame === "marco-oro" ? "#f2c14e" : avatar.frame === "marco-runas" ? "#a996ff" : null;
  return (
    <canvas
      ref={ref}
      width={w}
      height={20}
      role="img"
      aria-label={label ?? "Tu personaje"}
      className={`pixelated ${className}`}
      style={{ width: w * scale, height: 20 * scale, ...(frameColor ? { boxShadow: `0 0 0 ${scale / 2}px #0b1120, 0 0 0 ${scale}px ${frameColor}` } : {}) }}
    />
  );
}

// Small 8×8 icons for HUD and achievements.
const ICONS: Record<string, { rows: string[]; pal: Palette }> = {
  coin: { rows: ["..KKKK..", ".KYYYYK.", "KYYWYYYK", "KYWYYYOK", "KYYYYYOK", "KYYYYOOK", ".KOOOOK.", "..KKKK.."], pal: { K: "#0b1120", Y: "#f2c14e", O: "#c9921f", W: "#fff4c2" } },
  flame: { rows: ["...R....", "..RR.R..", "..RYRR..", ".RYYYR..", ".RYWYRR.", "RYYWWYR.", "RYYWWYR.", ".RRRRR.."], pal: { R: "#ff7a59", Y: "#f2c14e", W: "#fff4c2" } },
  star: { rows: ["...YY...", "...YY...", "YYYYYYYY", ".YYWYYY.", "..YYYY..", ".YYYYYY.", ".YY..YY.", "YY....YY"], pal: { Y: "#f2c14e", W: "#fff4c2" } },
  heart: { rows: [".RR.RR..", "RWRRRRR.", "RRRRRRR.", "RRRRRRR.", ".RRRRR..", "..RRR...", "...R....", "........"], pal: { R: "#ff7a59", W: "#ffd0c2" } },
  book: { rows: ["KKKKKKK.", "KBBBBBK.", "KBWWWBK.", "KBBBBBK.", "KBWWWBK.", "KBBBBBK.", "KKKKKKK.", "........"], pal: { K: "#0b1120", B: "#5ad1e8", W: "#e9eef8" } },
  spark: { rows: ["...Y....", "...Y....", ".Y.Y.Y..", "..YWY...", "YYWWWYY.", "..YWY...", ".Y.Y.Y..", "...Y...."], pal: { Y: "#5ad1e8", W: "#ffffff" } },
  loop: { rows: ["..GGGG..", ".G....G.", "G......G", "G....GGG", "G.....G.", ".G......", "..GGGG..", "........"], pal: { G: "#6fd672" } },
  bug: { rows: ["K.....K.", ".K...K..", "..RRR...", "KRRKRRK.", ".RRKRR..", "KRRKRRK.", ".RRRRR..", "K..R..K."], pal: { K: "#e9eef8", R: "#ff7a59" } },
  table: { rows: ["KKKKKKKK", "KSSKSSSK", "KKKKKKKK", "KWWKWWWK", "KKKKKKKK", "KWWKWWWK", "KKKKKKKK", "........"], pal: { K: "#5ad1e8", S: "#2c3f6b", W: "#e9eef8" } },
  dice: { rows: ["KKKKKKK.", "KWWWWWK.", "KWBWWWK.", "KWWBWWK.", "KWWWBWK.", "KWWWWWK.", "KKKKKKK.", "........"], pal: { K: "#0b1120", W: "#e9eef8", B: "#ff7a59" } },
  scale: { rows: ["...Y....", "YYYYYYY.", "Y..Y..Y.", "Y..Y..Y.", "YY.Y.YY.", "...Y....", "..YYY...", ".YYYYY.."], pal: { Y: "#f2c14e" } },
  column: { rows: ["VVVVVVV.", ".V.V.V..", ".V.V.V..", ".V.V.V..", ".V.V.V..", ".V.V.V..", "VVVVVVV.", "........"], pal: { V: "#a996ff" } },
  chart: { rows: ["K.......", "K....GG.", "K....GG.", "K.SS.GG.", "K.SS.GG.", "KYSS.GG.", "KKKKKKKK", "........"], pal: { K: "#e9eef8", G: "#6fd672", S: "#5ad1e8", Y: "#f2c14e" } },
  gear: { rows: ["..K.K...", ".KKKKK..", "KKWWWKK.", ".KW.WK..", "KKWWWKK.", ".KKKKK..", "..K.K...", "........"], pal: { K: "#8a99b8", W: "#5ad1e8" } },
  brain: { rows: [".RRRRR..", "RRWRRWR.", "RWRRWRR.", "RRRWRRR.", "RWRRRWR.", ".RRRRR..", "...RR...", "...RR..."], pal: { R: "#ff9fc2", W: "#ffd0e0" } },
  tower: { rows: ["K.K.K...", "KKKKK...", ".KYK....", ".KKK....", ".KYK....", ".KKK....", "KKKKK...", "........"], pal: { K: "#a996ff", Y: "#f2c14e" } },
  lock: { rows: ["..KKK...", ".K...K..", ".K...K..", "KKKKKKK.", "KYYYYYK.", "KYYKYYK.", "KYYYYYK.", "KKKKKKK."], pal: { K: "#a3b3d4", Y: "#2c3f6b" } },
  check: { rows: [".......G", "......GG", ".....GG.", "G...GG..", "GG.GG...", ".GGG....", "..G.....", "........"], pal: { G: "#6fd672" } },
};

export function PixelIcon({ name, size = 16, className = "", title }: { name: string; size?: number; className?: string; title?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    const icon = ICONS[name];
    if (!ctx || !icon) return;
    ctx.clearRect(0, 0, 8, 8);
    drawMap(ctx, icon.rows, icon.pal);
  }, [name]);
  return (
    <canvas
      ref={ref}
      width={8}
      height={8}
      className={`pixelated inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
