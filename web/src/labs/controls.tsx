import { useId, type ReactNode } from "react";

export function Slider({ label, value, min, max, step = 1, onChange, format = (v) => String(v) }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label htmlFor={id} className="flex justify-between text-sm gap-2">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums font-bold">{format(value)}</span>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#f2c14e]" />
    </div>
  );
}

export function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="bg-night p-3 rounded-[2px] min-w-0">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-xl font-bold tabular-nums break-words">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  );
}

export function LabLayout({ controls, children, explain }: { controls: ReactNode; children: ReactNode; explain: ReactNode }) {
  return (
    <div className="grid lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] gap-5 items-start">
      <div className="px-panel p-4 flex flex-col gap-4">{controls}</div>
      <div className="flex flex-col gap-4 min-w-0">
        {children}
        <div className="px-panel p-4 text-sm leading-relaxed">{explain}</div>
      </div>
    </div>
  );
}
