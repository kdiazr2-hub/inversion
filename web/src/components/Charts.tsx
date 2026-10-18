// Small SVG chart kit for the dashboard and the labs. Dark-surface categorical palette
// validated with the dataviz validator against #141f3a (adjacent CVD ΔE ≥ 8.4, contrast ≥ 3:1).
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500"];
export const GRID = "#24345a";
export const AXIS = "#a3b3d4";
export const SURFACE = "#141f3a";

export function useWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth || fallback);
    const ro = new ResizeObserver(() => setW(el.clientWidth || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, w] as const;
}

export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!isFinite(min) || !isFinite(max)) return [];
  if (min === max) return [min];
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const start = Math.ceil(min / step - 1e-9) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 1e-6; v += step) out.push(Math.round(v / step) * step + 0);
  return out;
}

export const fmt = (v: number, digits = 2) => {
  if (!isFinite(v)) return "—";
  if (Object.is(v, -0) || Math.abs(v) < 1e-12) v = 0;
  const a = Math.abs(v);
  if (a >= 10000) return (v / 1000).toLocaleString("es", { maximumFractionDigits: 1 }) + " mil";
  return v.toLocaleString("es", { maximumFractionDigits: a >= 100 ? 0 : digits });
};

const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
/** Tick label for a log₁₀ axis: only whole exponents are labelled (10³, 10⁻⁵…). */
export const pow10Tick = (v: number) => (Math.abs(v - Math.round(v)) < 1e-6 ? `10${String(Math.round(v)).replace(/./g, (c) => SUP[c] ?? c)}` : "");
/** Tick label for an axis of whole numbers (iterations, degrees, k): fractional ticks stay blank. */
export const intTick = (v: number) => (Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : "");

export interface Pt {
  x: number;
  y: number;
}

export interface Series {
  name: string;
  color: string;
  points: Pt[];
  kind?: "line" | "dots" | "area" | "step";
  dashed?: boolean;
}

export interface BarDatum {
  x0: number;
  x1: number;
  y: number;
  color?: string;
  label?: string;
}

export interface XYProps {
  height?: number;
  x: [number, number];
  y: [number, number];
  xLabel?: string;
  yLabel?: string;
  series?: Series[];
  bars?: BarDatum[];
  vlines?: { x: number; label?: string; color?: string }[];
  bands?: { x0: number; x1: number; color: string; label?: string }[];
  segments?: { x0: number; y0: number; x1: number; y1: number; color: string; width?: number }[];
  /** × markers drawn above everything else (e.g. centroids, optima). */
  markers?: { x: number; y: number; color: string }[];
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  ariaLabel: string;
  onPlotClick?: (p: Pt) => void;
  children?: ReactNode;
}

export function XYChart({ height = 260, x, y, xLabel, yLabel, series = [], bars = [], vlines = [], bands = [], segments = [], markers = [], formatX = (v) => fmt(v), formatY = (v) => fmt(v), ariaLabel, onPlotClick }: XYProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ px: number; py: number; lines: string[] } | null>(null);
  const m = { l: 48, r: 14, t: 12, b: xLabel ? 42 : 28 };
  const iw = Math.max(10, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const sx = (v: number) => m.l + ((v - x[0]) / (x[1] - x[0] || 1)) * iw;
  const sy = (v: number) => m.t + ih - ((v - y[0]) / (y[1] - y[0] || 1)) * ih;
  const invX = (px: number) => x[0] + ((px - m.l) / iw) * (x[1] - x[0]);
  const invY = (py: number) => y[0] + ((m.t + ih - py) / ih) * (y[1] - y[0]);
  const xt = niceTicks(x[0], x[1], Math.max(3, Math.floor(iw / 80)));
  const yt = niceTicks(y[0], y[1], 5);
  const clampY = (v: number) => Math.max(y[0], Math.min(y[1], v));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (px < m.l || px > m.l + iw) return setHover(null);
    const vx = invX(px);
    const lines: string[] = [];
    for (const b of bars) if (vx >= b.x0 && vx < b.x1) lines.push(b.label ?? `[${formatX(b.x0)}, ${formatX(b.x1)}): ${formatY(b.y)}`);
    for (const s of series) {
      if (!s.points.length) continue;
      let best = s.points[0];
      let bd = Infinity;
      for (const p of s.points) {
        const d = s.kind === "dots" ? Math.hypot(sx(p.x) - px, sy(p.y) - py) : Math.abs(sx(p.x) - px);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      if (s.kind !== "dots" || bd < 18) lines.push(`${s.name}: ${formatX(best.x)} → ${formatY(best.y)}`);
    }
    setHover(lines.length ? { px, py, lines: lines.slice(0, 5) } : null);
  };

  const path = (s: Series) => {
    const pts = s.points.filter((p) => isFinite(p.y));
    if (s.kind === "step") {
      let d = "";
      pts.forEach((p, i) => {
        d += i === 0 ? `M${sx(p.x)},${sy(clampY(p.y))}` : `H${sx(p.x)}V${sy(clampY(p.y))}`;
      });
      return d;
    }
    return pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(clampY(p.y)).toFixed(1)}`).join("");
  };

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          if (!onPlotClick) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;
          if (px >= m.l && px <= m.l + iw && py >= m.t && py <= m.t + ih) onPlotClick({ x: invX(px), y: invY(py) });
        }}
        className={onPlotClick ? "cursor-crosshair" : ""}
      >
        {bands.map((b, i) => (
          <rect key={i} x={sx(b.x0)} y={m.t} width={Math.max(0, sx(b.x1) - sx(b.x0))} height={ih} fill={b.color} />
        ))}
        {yt.map((t) => (
          <g key={`y${t}`}>
            <line x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} stroke={GRID} strokeWidth={1} />
            <text x={m.l - 6} y={sy(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS}>
              {formatY(t)}
            </text>
          </g>
        ))}
        {xt.map((t) => (
          <text key={`x${t}`} x={sx(t)} y={m.t + ih + 16} textAnchor="middle" fontSize={11} fill={AXIS}>
            {formatX(t)}
          </text>
        ))}
        {xLabel && (
          <text x={m.l + iw / 2} y={height - 6} textAnchor="middle" fontSize={12} fill={AXIS}>
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text x={12} y={m.t + ih / 2} textAnchor="middle" fontSize={12} fill={AXIS} transform={`rotate(-90 12 ${m.t + ih / 2})`}>
            {yLabel}
          </text>
        )}
        {bars.map((b, i) => {
          const x0 = sx(b.x0) + 1;
          const w = Math.max(1, sx(b.x1) - sx(b.x0) - 2);
          const top = sy(clampY(b.y));
          const base = sy(Math.max(y[0], 0));
          const h = Math.max(0, base - top);
          const r = Math.min(4, w / 2, h);
          return <path key={i} d={`M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + w - r}Q${x0 + w},${top} ${x0 + w},${top + r}V${base}Z`} fill={b.color ?? SERIES[0]} />;
        })}
        {segments.map((s, i) => (
          <line key={i} x1={sx(s.x0)} y1={sy(s.y0)} x2={sx(s.x1)} y2={sy(s.y1)} stroke={s.color} strokeWidth={s.width ?? 2} strokeLinecap="round" />
        ))}
        {series.map((s) =>
          s.kind === "dots" ? (
            <g key={s.name}>
              {s.points.map((p, i) => (
                <circle key={i} cx={sx(p.x)} cy={sy(clampY(p.y))} r={4.5} fill={s.color} stroke={SURFACE} strokeWidth={2} />
              ))}
            </g>
          ) : (
            <g key={s.name}>
              {s.kind === "area" && s.points.length > 1 && (
                <path d={`${path(s)}L${sx(s.points[s.points.length - 1].x)},${sy(Math.max(y[0], 0))}L${sx(s.points[0].x)},${sy(Math.max(y[0], 0))}Z`} fill={s.color} opacity={0.12} />
              )}
              <path d={path(s)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "5 4" : undefined} />
              {s.kind === "area" && s.points.length > 0 && s.points.length < 3 && (
                <circle cx={sx(s.points[s.points.length - 1].x)} cy={sy(clampY(s.points[s.points.length - 1].y))} r={4.5} fill={s.color} stroke={SURFACE} strokeWidth={2} />
              )}
            </g>
          ),
        )}
        {markers.map((mk, i) => {
          const cx = sx(mk.x);
          const cy = sy(clampY(mk.y));
          const d = `M${cx - 7},${cy - 7}L${cx + 7},${cy + 7}M${cx + 7},${cy - 7}L${cx - 7},${cy + 7}`;
          return (
            <g key={`mk${i}`}>
              <path d={d} stroke={SURFACE} strokeWidth={7} strokeLinecap="round" />
              <path d={d} stroke={mk.color} strokeWidth={3.5} strokeLinecap="round" />
            </g>
          );
        })}
        {vlines.map((v, i) => (
          <g key={i}>
            <line x1={sx(v.x)} x2={sx(v.x)} y1={m.t} y2={m.t + ih} stroke={v.color ?? "#e9eef8"} strokeWidth={1.5} />
            {v.label && (
              <text x={sx(v.x) + 4} y={m.t + 10 + i * 13} fontSize={11} fill="#e9eef8">
                {v.label}
              </text>
            )}
          </g>
        ))}
        <line x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} stroke={AXIS} strokeWidth={1} />
        {hover && <line x1={hover.px} x2={hover.px} y1={m.t} y2={m.t + ih} stroke={AXIS} strokeWidth={1} opacity={0.5} pointerEvents="none" />}
      </svg>
      {hover && (
        <div className="absolute pointer-events-none bg-ink border-2 border-line rounded-[2px] px-2 py-1 text-xs whitespace-nowrap z-10" style={{ left: Math.min(hover.px + 12, width - 180), top: Math.max(0, hover.py - 30) }}>
          {hover.lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden>
            <line x1="1" x2="17" y1="4" y2="4" stroke={i.color} strokeWidth="3" strokeDasharray={i.dashed ? "4 3" : undefined} strokeLinecap="round" />
          </svg>
          {i.name}
        </li>
      ))}
    </ul>
  );
}

/** Horizontal bars for categories (labels left, value at the tip). */
export function HBars({ data, max, format = (v) => fmt(v), ariaLabel }: { data: { label: string; value: number; color?: string; note?: string }[]; max?: number; format?: (v: number) => string; ariaLabel: string }) {
  const top = max ?? Math.max(1e-9, ...data.map((d) => d.value));
  return (
    <ul className="flex flex-col gap-2" aria-label={ariaLabel}>
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] gap-2 items-center text-sm" title={d.note}>
          <span className="truncate text-muted">{d.label}</span>
          <span className="flex items-center gap-2 min-w-0">
            <span className="h-3 rounded-r-[4px] block" style={{ width: `${Math.max(0, Math.min(100, (d.value / top) * 100))}%`, minWidth: d.value > 0 ? 3 : 0, background: d.color ?? SERIES[0] }} />
            <span className="tabular-nums text-text text-xs shrink-0">{format(d.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Chart card with title, subtitle and a toggle to an accessible data table. */
export function ChartCard({ title, subtitle, table, children, legend }: { title: string; subtitle?: string; table?: { head: string[]; rows: (string | number)[][] }; children: ReactNode; legend?: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  useEffect(() => setAsTable(false), [title]);
  return (
    <figure className="px-panel p-4 min-w-0">
      <div className="flex items-start justify-between gap-2 mb-2">
        <figcaption>
          <div className="font-bold">{title}</div>
          {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
        </figcaption>
        {table && (
          <button className="chip shrink-0" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
            {asTable ? "Ver gráfico" : "Ver tabla"}
          </button>
        )}
      </div>
      {legend && <div className="mb-2">{legend}</div>}
      {asTable && table ? (
        <div className="overflow-x-auto max-h-72">
          <table className="text-sm w-full tabular-nums">
            <thead>
              <tr>
                {table.head.map((h) => (
                  <th key={h} className="text-left text-muted font-bold p-1 border-b border-line">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className="p-1 border-b border-line/40">
                      {typeof c === "number" ? fmt(c, 4) : c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
  );
}
