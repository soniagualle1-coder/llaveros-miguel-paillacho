"use client";

import { useEffect, useRef, useState } from "react";
import { TEX_H, TEX_W } from "@/lib/drawDesign";

type Props = {
  value: string;
  onChange: (dataUrl: string) => void;
};

const QUICK_INKS = ["#1e293b", "#e11d48", "#f59e0b", "#16a34a", "#0284c7", "#7c3aed", "#ffffff"];

export default function DrawingPad({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const lastExported = useRef("");
  const [color, setColor] = useState("#1e293b");
  const [brush, setBrush] = useState(10);
  const [eraser, setEraser] = useState(false);

  useEffect(() => {
    if (value === lastExported.current) return;
    lastExported.current = value;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!value) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = value;
  }, [value]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * canvas.width,
      y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * canvas.height,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    drawing.current = true;
    last.current = pos(e);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, (eraser ? brush * 1.8 : brush) / 2, 0, Math.PI * 2);
    ctx.fillStyle = eraser ? "rgba(0,0,0,1)" : color;
    ctx.fill();
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !last.current) return;
    const p = pos(e);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = eraser ? brush * 1.8 : brush;
    ctx.strokeStyle = color;
    ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    lastExported.current = url;
    onChange(url);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lastExported.current = "";
    onChange("");
  };

  return (
    <div className="space-y-3">
      <div className="relative mx-auto max-w-[290px] overflow-hidden rounded-2xl border-2 border-dashed border-amber-400 bg-[#e9c894] shadow-inner">
        <canvas
          ref={canvasRef}
          width={TEX_W}
          height={TEX_H}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          className="block h-auto w-full cursor-crosshair touch-none"
          style={{ aspectRatio: `${TEX_W} / ${TEX_H}` }}
        />
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-900/65 px-3 py-0.5 text-[10px] font-bold text-white">
          Dibuja aquí · se refleja en el 3D
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {QUICK_INKS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setColor(c);
              setEraser(false);
            }}
            className={`h-7 w-7 rounded-full border-2 transition ${
              !eraser && color === c ? "scale-110 border-amber-500 ring-2 ring-amber-300" : "border-stone-300"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => {
            setColor(e.target.value);
            setEraser(false);
          }}
          aria-label="Color de pincel personalizado"
          className="h-7 w-9 cursor-pointer rounded border border-stone-300 bg-white p-0.5"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600">
          <span>Pincel</span>
          <input
            type="range"
            min={3}
            max={34}
            value={brush}
            onChange={(e) => setBrush(Number(e.target.value))}
            className="flex-1 accent-amber-500"
          />
          <span className="w-5 text-right">{brush}</span>
        </label>
        <button
          type="button"
          onClick={() => setEraser((v) => !v)}
          className={`rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition ${
            eraser ? "border-amber-500 bg-amber-50 text-amber-900" : "border-stone-200 bg-white text-stone-600"
          }`}
        >
          🧽 Borrar
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-xl border-2 border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 hover:border-red-300 hover:text-red-600"
        >
          🗑 Limpiar
        </button>
      </div>
    </div>
  );
}
