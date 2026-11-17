import type { ReactNode } from "react";

export function SectionCard({
  step,
  title,
  hint,
  children,
}: {
  step?: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        {step !== undefined && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-500 text-sm font-extrabold text-white shadow">
            {step}
          </span>
        )}
        <div>
          <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <span className="whitespace-nowrap text-slate-600">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-12 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-0.5"
        aria-label={label}
      />
      <span className="ml-auto font-mono text-[11px] uppercase text-slate-400">{value}</span>
    </label>
  );
}

export function OptionButton({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 px-3 py-2 text-sm font-bold transition ${
        active
          ? "border-amber-500 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50/50"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function ShapeGlyph({ d, size = 34 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="shrink-0">
      <path d={d} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
