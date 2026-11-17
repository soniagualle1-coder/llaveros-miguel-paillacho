"use client";

import { useEffect, useRef } from "react";
import { drawDesign, prepareDesignFont, TEX_H, TEX_W } from "@/lib/drawDesign";
import { normalizeDesign } from "@/lib/types";
import type { KeychainDesign } from "@/lib/types";

type Props = {
  design: Partial<KeychainDesign> | null | undefined;
  back?: boolean;
  className?: string;
};

export default function DesignPreview({ design, back = false, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const safe = normalizeDesign(design);

    // Dibujo instantáneo sin esperar fuentes externas
    try {
      drawDesign(ctx, safe, { back });
    } catch {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const load = (src: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });

    Promise.all([
      prepareDesignFont(safe),
      back ? Promise.resolve(null) : load(safe.image),
      back ? Promise.resolve(null) : load(safe.drawing),
    ]).then(([, image, drawing]) => {
      if (!alive) return;
      try {
        drawDesign(ctx, safe, { image, drawing, back });
      } catch {
        /* nunca romper la vista */
      }
    });

    return () => {
      alive = false;
    };
  }, [design, back]);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-stone-100 p-1.5 shadow-inner ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={TEX_W}
        height={TEX_H}
        className="block h-auto w-full"
        style={{ aspectRatio: `${TEX_W} / ${TEX_H}` }}
      />
    </div>
  );
}
