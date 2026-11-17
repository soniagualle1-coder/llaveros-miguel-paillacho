"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, SHAPES } from "@/lib/shapes";
import { ShapeGlyph } from "./ui";

type Props = {
  open: boolean;
  title: string;
  selectedId?: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
};

export default function ShapePicker({ open, title, selectedId, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("Todas");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SHAPES.filter((s) => {
      const okCat = category === "Todas" || s.category === category;
      const okQuery = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
      return okCat && okQuery;
    });
  }, [query, category]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">
              {SHAPES.length} formas disponibles · {filtered.length} mostradas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
          >
            Cerrar ✕
          </button>
        </div>

        <div className="space-y-3 border-b border-slate-200 px-5 py-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar forma... (estrella, engranaje, gato, corazón)"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
          />
          <div className="flex flex-wrap gap-2">
            {["Todas", ...CATEGORIES].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                  category === c
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-4 gap-2 overflow-y-auto p-4 sm:grid-cols-6 md:grid-cols-8">
          {filtered.map((s) => {
            const active = s.id === selectedId;
            return (
              <button
                key={s.id}
                type="button"
                title={`${s.name} · ${s.category}`}
                onClick={() => {
                  onSelect(s.id);
                  onClose();
                }}
                className={`group flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 p-1 transition ${
                  active
                    ? "border-amber-500 bg-amber-50"
                    : "border-slate-100 bg-white hover:border-amber-300 hover:bg-amber-50/60"
                }`}
              >
                <span className={active ? "text-amber-600" : "text-slate-500 group-hover:text-amber-500"}>
                  <ShapeGlyph d={s.d} size={34} />
                </span>
                <span className="w-full truncate text-center text-[9px] font-semibold text-slate-500">
                  {s.name}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-slate-400">
              No encontramos formas con “{query}”.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
