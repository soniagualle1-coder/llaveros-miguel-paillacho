import { SHAPE_MAP } from "./shapes";
import { loadFont } from "./fonts";
import { normalizeDesign } from "./types";
import type { KeychainDesign, SurfacePattern } from "./types";

export const TEX_W = 720;
export const TEX_H = 720;
export const MASK_SIZE = 184;

function rnd(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0,
    ];
  }
  if (clean.length >= 6) {
    return [
      parseInt(clean.slice(0, 2), 16) || 0,
      parseInt(clean.slice(2, 4), 16) || 0,
      parseInt(clean.slice(4, 6), 16) || 0,
    ];
  }
  return [225, 29, 72];
}

function shadeHex(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const adjust = (c: number) =>
    factor >= 0 ? Math.round(c + (255 - c) * factor) : Math.round(c * (1 + factor));
  const toH = (c: number) => clamp(adjust(c), 0, 255).toString(16).padStart(2, "0");
  return `#${toH(r)}${toH(g)}${toH(b)}`;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getActiveShapePath(design: KeychainDesign): string {
  const id = design.shapeId || "geo-placa-clasica";
  const found = SHAPE_MAP[id] || SHAPE_MAP["geo-placa-clasica"];
  return found.d;
}

/** Formas con agujero central grande que se ven geniales perforadas en 3D */
const KEEP_TRUE_HOLES = new Set([
  "geo-anillo",
  "com-donut",
  "mus-vinilo",
  "mus-auriculares",
  "sim-llave",
  "sim-candado",
  "sim-lupa",
  "sim-infinito",
  "mec-engranaje-8",
  "mec-engranaje-12",
  "mec-engranaje-16",
  "mec-engranaje-20",
  "mec-tuerca",
  "mec-tuerca-mariposa",
  "mec-arandela",
  "mec-arandela-presion",
  "mec-brida",
  "mec-acoplamiento",
  "mec-bobina",
  "mec-plato-3-garras",
  "mec-rodamiento",
  "mec-eslabon",
  "mec-pinon",
  "nat-girasol",
  "dep-pingpong",
]);

type NameLayout = {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  centerX: number;
  centerY: number;
  strokeWidth: number;
  lugX: number;
  lugY: number;
  lugR: number;
  photoCircle: { cx: number; cy: number; r: number } | null;
  charmSpots: Array<{ id: string; color: string; cx: number; cy: number; size: number }>;
  bridges: Array<{ x0: number; y0: number; x1: number; y1: number; h: number }>;
};

function computeNameOnlyLayout(
  ctx: CanvasRenderingContext2D,
  design: KeychainDesign,
  W: number,
  H: number,
): NameLayout {
  const raw = design.text.trim() || "Tu Nombre";
  const words = raw.split(/\s+/).filter(Boolean);
  let lines: string[] = [raw];
  if (raw.length > 12 && words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
  }

  const hasPhoto = Boolean(design.image);
  const smalls = design.smallShapes.filter((s) => SHAPE_MAP[s.id]).slice(0, 6);

  const availW = W * (hasPhoto ? 0.62 : 0.78);
  const maxFont = W * (lines.length > 1 ? 0.17 : 0.22) * clamp(design.textScale, 0.7, 1.35);
  const minFont = W * 0.085;

  let fontSize = Math.round(maxFont);
  for (let step = 0; step < 18; step++) {
    ctx.font = `800 ${fontSize}px "${design.font}", "Poppins", sans-serif`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 10);
    if (widest <= availW || fontSize <= minFont) break;
    fontSize = Math.max(Math.round(minFont), Math.round(fontSize * 0.91));
  }

  ctx.font = `800 ${fontSize}px "${design.font}", "Poppins", sans-serif`;
  const lineWidths = lines.map((l) => Math.max(fontSize * 0.65, ctx.measureText(l).width));
  const maxLineW = Math.max(...lineWidths);
  const lineHeight = fontSize * 1.05;
  const centerX = hasPhoto ? W * 0.57 : W * 0.5;
  const centerY = smalls.length > 0 ? H * 0.5 : H * 0.52;
  // Contorno ajustado que sigue cada letra para que salga SOLO el nombre recortado en 3D
  const strokeWidth = Math.max(W * 0.042, fontSize * (design.nameOutline ? 0.34 : 0.2));

  const bridges: Array<{ x0: number; y0: number; x1: number; y1: number; h: number }> = [];
  const totalBlockH = (lines.length - 1) * lineHeight;
  lines.forEach((_line, idx) => {
    const lw = lineWidths[idx];
    const ly = centerY - totalBlockH / 2 + idx * lineHeight;
    // Unión fina a media altura para mantener las letras unidas respetando el perfil de cada letra
    bridges.push({
      x0: centerX - lw * 0.44,
      y0: ly + fontSize * 0.08,
      x1: centerX + lw * 0.44,
      y1: ly + fontSize * 0.08,
      h: fontSize * (design.nameOutline ? 0.28 : 0.2),
    });
  });

  // Puente vertical si hay 2 líneas
  if (lines.length > 1) {
    const minW = Math.min(...lineWidths) * 0.55;
    bridges.push({
      x0: centerX - minW * 0.5,
      y0: centerY,
      x1: centerX + minW * 0.5,
      y1: centerY,
      h: lineHeight * 0.85,
    });
  }

  let photoCircle: { cx: number; cy: number; r: number } | null = null;
  if (hasPhoto) {
    const r = W * 0.115;
    const cx = clamp(centerX - maxLineW / 2 - r * 0.92, r + W * 0.06, W * 0.24);
    const cy = centerY;
    photoCircle = { cx, cy, r };
    bridges.push({
      x0: cx + r * 0.5,
      y0: cy,
      x1: centerX - maxLineW * 0.38,
      y1: cy,
      h: r * 0.72,
    });
  }

  // Formitas pequeñas soldadas al borde inferior del nombre si el usuario las elige
  const charmSpots: Array<{ id: string; color: string; cx: number; cy: number; size: number }> = [];
  if (smalls.length > 0) {
    const size = W * 0.082;
    const gap = Math.min(W * 0.095, Math.max(size * 0.95, (maxLineW * 0.85) / Math.max(1, smalls.length)));
    const span = (smalls.length - 1) * gap;
    const bottomLineY = centerY + totalBlockH / 2;
    const cy = bottomLineY + fontSize * 0.52;
    smalls.forEach((s, i) => {
      const cx = centerX - span / 2 + i * gap;
      charmSpots.push({ id: s.id, color: s.color, cx, cy, size });
    });
  }

  const topLineY = centerY - totalBlockH / 2;
  const lugR = W * 0.044;
  // Argolla lateral izquierda estilo llavero real de nombre recortado (si no lleva foto)
  const lugX = hasPhoto
    ? centerX
    : clamp(centerX - maxLineW * 0.5 - lugR * 0.95, lugR + W * 0.045, centerX - W * 0.1);
  const lugY = hasPhoto
    ? clamp(topLineY - fontSize * 0.5, lugR + W * 0.055, H * 0.42)
    : topLineY;

  return {
    lines,
    fontSize,
    lineHeight,
    centerX,
    centerY,
    strokeWidth,
    lugX,
    lugY,
    lugR,
    photoCircle,
    charmSpots,
    bridges,
  };
}

function drawNameSilhouetteSolid(ctx: CanvasRenderingContext2D, layout: NameLayout, font: string, fill: string): void {
  const W = ctx.canvas.width;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = fill;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Puentes suaves entre letras
  for (const b of layout.bridges) {
    ctx.lineWidth = b.h;
    ctx.beginPath();
    ctx.moveTo(b.x0, b.y0);
    ctx.lineTo(b.x1, b.y1);
    ctx.stroke();
  }

  // Conexión limpia hacia la argolla del nombre
  ctx.lineWidth = layout.lugR * 1.25;
  ctx.beginPath();
  ctx.moveTo(layout.lugX, layout.lugY);
  ctx.lineTo(
    layout.photoCircle ? layout.lugX : Math.min(layout.centerX, layout.lugX + layout.lugR * 2.1),
    layout.centerY,
  );
  ctx.stroke();

  // Contorno redondeado que abraza exactamente cada letra del nombre
  ctx.font = `800 ${layout.fontSize}px "${font}", "Poppins", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = layout.strokeWidth;
  const totalH = (layout.lines.length - 1) * layout.lineHeight;
  layout.lines.forEach((line, idx) => {
    const ly = layout.centerY - totalH / 2 + idx * layout.lineHeight;
    ctx.strokeText(line, layout.centerX, ly);
    ctx.fillText(line, layout.centerX, ly);
  });

  // Medallón de foto soldado si subió foto
  if (layout.photoCircle) {
    ctx.beginPath();
    ctx.arc(layout.photoCircle.cx, layout.photoCircle.cy, layout.photoCircle.r + W * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }

  // Formitas pequeñas soldadas al nombre
  for (const c of layout.charmSpots) {
    const sh = SHAPE_MAP[c.id];
    if (!sh) continue;
    // Unión al nombre
    ctx.lineWidth = c.size * 0.48;
    ctx.beginPath();
    ctx.moveTo(c.cx, c.cy);
    ctx.lineTo(c.cx, c.cy - layout.fontSize * 0.34);
    ctx.stroke();
    // Contorno del dije
    ctx.beginPath();
    ctx.arc(c.cx, c.cy, c.size * 0.56, 0, Math.PI * 2);
    ctx.fill();
  }

  // Orejita superior para la argolla
  ctx.beginPath();
  ctx.arc(layout.lugX, layout.lugY, layout.lugR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

type SurfaceGeom = {
  cx: number;
  cy: number;
  shapeSize: number;
  pathD: string;
  keepHoles: boolean;
  lugX: number;
  lugY: number;
  lugR: number;
};

const shapeTopCache = new Map<string, number>();

function measureShapeTopNormalized(shapeId: string, pathD: string): number {
  const cached = shapeTopCache.get(shapeId);
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") return 0.08;
  try {
    const c = document.createElement("canvas");
    c.width = 100;
    c.height = 100;
    const g = c.getContext("2d");
    if (!g) return 0.08;
    const p = new Path2D(pathD);
    g.fillStyle = "#000";
    g.strokeStyle = "#000";
    g.lineJoin = "round";
    g.lineCap = "round";
    g.lineWidth = 5;
    g.stroke(p);
    g.fill(p);
    const data = g.getImageData(0, 0, 100, 100).data;
    for (let y = 0; y < 100; y++) {
      // Prioriza la franja central X=32..68 para colocar la argolla arriba al centro
      for (let x = 32; x <= 68; x++) {
        if (data[(y * 100 + x) * 4 + 3] > 100) {
          const val = y / 100;
          shapeTopCache.set(shapeId, val);
          return val;
        }
      }
    }
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 100; x++) {
        if (data[(y * 100 + x) * 4 + 3] > 100) {
          const val = y / 100;
          shapeTopCache.set(shapeId, val);
          return val;
        }
      }
    }
  } catch {
    /* fallback */
  }
  shapeTopCache.set(shapeId, 0.1);
  return 0.1;
}

function computeSurfaceGeom(design: KeychainDesign, W: number, H: number): SurfaceGeom {
  const shapeId = design.shapeId && SHAPE_MAP[design.shapeId] ? design.shapeId : "geo-placa-clasica";
  const pathD = getActiveShapePath(design);
  const shapeSize = W * 0.78;
  const cx = W * 0.5;
  const cy = H * 0.535;
  const topNorm = measureShapeTopNormalized(shapeId, pathD);
  const shapeTopPx = cy - shapeSize * 0.5 + topNorm * shapeSize;
  const lugR = W * 0.048;
  const lugX = cx;
  const lugY = clamp(shapeTopPx - lugR * 0.42, lugR + W * 0.045, H * 0.4);
  return {
    cx,
    cy,
    shapeSize,
    pathD,
    keepHoles: KEEP_TRUE_HOLES.has(shapeId),
    lugX,
    lugY,
    lugR,
  };
}

function drawSurfaceSilhouetteSolid(ctx: CanvasRenderingContext2D, sg: SurfaceGeom, fill: string): void {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = fill;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  try {
    const p = new Path2D(sg.pathD);
    ctx.save();
    ctx.translate(sg.cx, sg.cy);
    const s = sg.shapeSize / 100;
    ctx.scale(s, s);
    ctx.translate(-50, -50);
    // Halo de corte suave para que formas con piezas cercanas (huella, nube, bici) queden unidas en 3D
    ctx.lineWidth = sg.keepHoles ? 3.5 : 8.5;
    ctx.stroke(p);
    ctx.fill(p, sg.keepHoles ? "evenodd" : "nonzero");
    ctx.restore();
  } catch {
    ctx.beginPath();
    ctx.arc(sg.cx, sg.cy, sg.shapeSize * 0.44, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cuello de unión + orejita superior para la argolla metálica
  ctx.lineWidth = sg.lugR * 1.4;
  ctx.beginPath();
  ctx.moveTo(sg.lugX, sg.lugY);
  ctx.lineTo(sg.lugX, Math.min(sg.cy, sg.lugY + sg.shapeSize * 0.24));
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(sg.lugX, sg.lugY, sg.lugR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function punchLugHole(ctx: CanvasRenderingContext2D, lugX: number, lugY: number, lugR: number): void {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(lugX, lugY, lugR * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMetallicEyelet(ctx: CanvasRenderingContext2D, lugX: number, lugY: number, lugR: number): void {
  ctx.save();
  const ringR = lugR * 0.78;
  const g = ctx.createRadialGradient(
    lugX - ringR * 0.3,
    lugY - ringR * 0.3,
    ringR * 0.1,
    lugX,
    lugY,
    ringR,
  );
  g.addColorStop(0, "#fff4c2");
  g.addColorStop(0.55, "#e0b84c");
  g.addColorStop(1, "#8f6b18");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(lugX, lugY, ringR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  punchLugHole(ctx, lugX, lugY, lugR);
}

/** Dibuja la máscara binaria exacta que Three.js extruye en 3D. */
export function drawSilhouetteMask(
  ctx: CanvasRenderingContext2D,
  rawDesign: KeychainDesign,
): { lugXNorm: number; lugYNorm: number } {
  const design = normalizeDesign(rawDesign);
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (design.base === "nombre") {
    const layout = computeNameOnlyLayout(ctx, design, W, H);
    drawNameSilhouetteSolid(ctx, layout, design.font, "#ffffff");
    punchLugHole(ctx, layout.lugX, layout.lugY, layout.lugR);
    return {
      lugXNorm: layout.lugX / W - 0.5,
      lugYNorm: 0.5 - layout.lugY / H,
    };
  }

  const sg = computeSurfaceGeom(design, W, H);
  drawSurfaceSilhouetteSolid(ctx, sg, "#ffffff");
  punchLugHole(ctx, sg.lugX, sg.lugY, sg.lugR);
  return {
    lugXNorm: sg.lugX / W - 0.5,
    lugYNorm: 0.5 - sg.lugY / H,
  };
}

/** Clave que cambia SOLO cuando la geometría 3D necesita reconstruirse */
export function getSilhouetteKey(rawDesign: KeychainDesign): string {
  const d = normalizeDesign(rawDesign);
  if (d.base === "nombre") {
    const charms = d.smallShapes.map((s) => s.id).join(",");
    return `nombre|${d.text.trim() || "Tu Nombre"}|${d.font}|${d.textScale.toFixed(2)}|${d.nameOutline ? 1 : 0}|${d.image ? 1 : 0}|${charms}`;
  }
  return `superficie|${d.shapeId || "geo-placa-clasica"}`;
}

/** Propiedades físicas del canto 3D según el material elegido */
export function getEdgeAppearance(rawDesign: KeychainDesign): {
  color: string;
  roughness: number;
  metalness: number;
} {
  const d = normalizeDesign(rawDesign);
  if (d.base === "nombre") {
    const baseHex = d.nameOutline ? d.shapeColor : d.textColor;
    return { color: shadeHex(baseHex, -0.22), roughness: 0.35, metalness: 0.12 };
  }
  switch (d.surfaceMaterial) {
    case "madera":
      return { color: "#6d3f1a", roughness: 0.82, metalness: 0.04 };
    case "nogal":
      return { color: "#361d0b", roughness: 0.8, metalness: 0.05 };
    case "metal-oro":
      return { color: "#b88e28", roughness: 0.25, metalness: 0.88 };
    case "metal-plata":
      return { color: "#94a3b8", roughness: 0.25, metalness: 0.88 };
    case "marmol":
      return { color: "#cbd5e1", roughness: 0.4, metalness: 0.08 };
    case "color":
    default:
      return { color: shadeHex(d.shapeColor, -0.24), roughness: 0.34, metalness: 0.08 };
  }
}

function paintSurfaceMaterial(ctx: CanvasRenderingContext2D, design: KeychainDesign, W: number, H: number): void {
  const mat = design.surfaceMaterial;

  if (mat === "madera" || mat === "nogal") {
    const g = ctx.createLinearGradient(0, 0, W * 0.5, H);
    if (mat === "madera") {
      g.addColorStop(0, "#e7b97e");
      g.addColorStop(0.5, "#cf9455");
      g.addColorStop(1, "#ae7137");
    } else {
      g.addColorStop(0, "#7c4d2b");
      g.addColorStop(0.5, "#5a351c");
      g.addColorStop(1, "#3d2210");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 75; i++) {
      const yy = (i / 75) * H + Math.sin(i * 1.6) * 4;
      ctx.strokeStyle =
        mat === "madera"
          ? `rgba(88, 46, 14, ${0.04 + rnd(i + 5) * 0.075})`
          : `rgba(25, 11, 4, ${0.08 + rnd(i + 5) * 0.12})`;
      ctx.lineWidth = 1 + rnd(i) * 2.2;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.bezierCurveTo(W * 0.3, yy + 8, W * 0.65, yy - 8, W, yy + 3);
      ctx.stroke();
    }
    return;
  }

  if (mat === "metal-oro" || mat === "metal-plata") {
    const g = ctx.createLinearGradient(0, 0, W, H);
    if (mat === "metal-oro") {
      g.addColorStop(0, "#fceabb");
      g.addColorStop(0.35, "#e5bd52");
      g.addColorStop(0.68, "#f7df94");
      g.addColorStop(1, "#b88921");
    } else {
      g.addColorStop(0, "#f8fafc");
      g.addColorStop(0.35, "#cbd5e1");
      g.addColorStop(0.68, "#f1f5f9");
      g.addColorStop(1, "#94a3b8");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Cepillado metálico fino
    for (let i = 0; i < 90; i++) {
      const yy = (i / 90) * H;
      ctx.strokeStyle = i % 2 === 0 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.045)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(W, yy);
      ctx.stroke();
    }
    return;
  }

  if (mat === "marmol") {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.5, "#f4f6f9");
    g.addColorStop(1, "#e5eaf0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 14; i++) {
      const y0 = rnd(i * 3) * H;
      ctx.strokeStyle = i % 4 === 0 ? "rgba(212,175,55,0.22)" : "rgba(100,116,139,0.14)";
      ctx.lineWidth = 1 + rnd(i * 9) * 3;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.bezierCurveTo(
        W * 0.33,
        y0 + (rnd(i + 1) - 0.5) * 140,
        W * 0.66,
        y0 + (rnd(i + 2) - 0.5) * 140,
        W,
        y0 + (rnd(i + 3) - 0.5) * 120,
      );
      ctx.stroke();
    }
    return;
  }

  // Acrílico / color personalizado
  const base = design.shapeColor || "#e11d48";
  const g = ctx.createLinearGradient(W * 0.15, H * 0.08, W * 0.85, H * 0.92);
  g.addColorStop(0, shadeHex(base, 0.18));
  g.addColorStop(0.52, base);
  g.addColorStop(1, shadeHex(base, -0.18));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Detalle sutil de la propia figura para dar relieve visual (ojos de gatito, pétalos, etc.)
  const shapeId = design.shapeId || "geo-placa-clasica";
  if (shapeId !== "geo-placa-clasica" && !KEEP_TRUE_HOLES.has(shapeId)) {
    try {
      const sg = computeSurfaceGeom(design, W, H);
      const p = new Path2D(sg.pathD);
      ctx.save();
      ctx.translate(sg.cx, sg.cy);
      const s = sg.shapeSize / 100;
      ctx.scale(s, s);
      ctx.translate(-50, -50);
      ctx.fillStyle = shadeHex(base, -0.08);
      ctx.fill(p, "evenodd");
      ctx.restore();
    } catch {
      /* ignore */
    }
  }
}

function drawMiniShape(
  ctx: CanvasRenderingContext2D,
  d: string,
  cx: number,
  cy: number,
  size: number,
  color: string,
  alpha = 1,
): void {
  try {
    const p = new Path2D(d);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    const s = size / 100;
    ctx.scale(s, s);
    ctx.translate(-50, -50);
    ctx.fillStyle = color;
    ctx.fill(p, "evenodd");
    ctx.restore();
  } catch {
    /* ignore */
  }
}

function drawSurfacePattern(
  ctx: CanvasRenderingContext2D,
  pattern: SurfacePattern,
  design: KeychainDesign,
  sg: SurfaceGeom,
  W: number,
  H: number,
): void {
  if (!pattern || pattern === "ninguno") return;
  const isDark =
    design.surfaceMaterial === "nogal" ||
    (design.surfaceMaterial === "color" && luminance(design.shapeColor) < 0.42);
  const tint = isDark ? "rgba(255,255,255,0.16)" : "rgba(30,20,10,0.11)";

  if (pattern === "borde-doble" || pattern === "costura") {
    try {
      const p = new Path2D(sg.pathD);
      ctx.save();
      ctx.translate(sg.cx, sg.cy);
      const s = (sg.shapeSize * 0.9) / 100;
      ctx.scale(s, s);
      ctx.translate(-50, -50);
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.34)" : "rgba(60,30,10,0.28)";
      ctx.lineWidth = pattern === "costura" ? 1.8 : 2.2;
      if (pattern === "costura") ctx.setLineDash([4.5, 3.8]);
      ctx.stroke(p);
      ctx.restore();
    } catch {
      /* ignore */
    }
    return;
  }

  if (pattern === "lunares") {
    ctx.save();
    ctx.fillStyle = tint;
    const step = W * 0.1;
    for (let y = step * 0.7; y < H; y += step) {
      const row = Math.round(y / step);
      for (let x = step * 0.6; x < W; x += step) {
        const xx = x + (row % 2 === 0 ? 0 : step * 0.5);
        ctx.beginPath();
        ctx.arc(xx, y, W * 0.014, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  const iconId =
    pattern === "huellitas"
      ? "ani-huella"
      : pattern === "corazones"
        ? "sim-corazon"
        : pattern === "estrellitas"
          ? "estrella-5"
          : "destello-4";
  const iconD = SHAPE_MAP[iconId]?.d;
  if (!iconD) return;

  const step = W * 0.135;
  for (let y = step * 0.8; y < H; y += step) {
    const row = Math.round(y / step);
    for (let x = step * 0.7; x < W; x += step) {
      const xx = x + (row % 2 === 0 ? 0 : step * 0.5);
      // Dejar un poco más despejado el centro para que el nombre resalte perfecto
      const distCenter = Math.hypot(xx - sg.cx, y - sg.cy);
      if (distCenter < W * 0.16) continue;
      drawMiniShape(ctx, iconD, xx, y, W * 0.045, isDark ? "#ffffff" : "#2c1810", isDark ? 0.16 : 0.11);
    }
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && cur) {
        out.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) out.push(cur);
  }
  return out.length ? out : [text];
}

function drawFramedPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  r: number,
  W: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const ratio = Math.max((r * 2) / Math.max(1, img.width), (r * 2) / Math.max(1, img.height));
  const iw = img.width * ratio;
  const ih = img.height * ratio;
  ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#f8e29c";
  ctx.lineWidth = Math.max(3, W * 0.011);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = Math.max(1.5, W * 0.004);
  ctx.beginPath();
  ctx.arc(cx, cy, r + W * 0.006, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export type DrawOptions = {
  image?: HTMLImageElement | null;
  drawing?: HTMLImageElement | null;
  back?: boolean;
};

export function drawDesign(
  ctx: CanvasRenderingContext2D,
  rawDesign: KeychainDesign,
  options: DrawOptions = {},
): void {
  const design = normalizeDesign(rawDesign);
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);

  /* ==================== MODO 1: SOLO NOMBRE (LLAVERO DE NOMBRE) ==================== */
  if (design.base === "nombre") {
    const layout = computeNameOnlyLayout(ctx, design, W, H);
    const contourColor = design.nameOutline ? design.shapeColor : shadeHex(design.textColor, -0.2);

    // Base recortada que sigue ÚNICAMENTE la silueta del nombre
    drawNameSilhouetteSolid(ctx, layout, design.font, contourColor);

    if (options.back) {
      // Sutil sombreado en el reverso del nombre recortado
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, shadeHex(contourColor, 0.1));
      bg.addColorStop(1, shadeHex(contourColor, -0.15));
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      if (design.backText.trim()) {
        ctx.save();
        ctx.translate(layout.centerX, layout.centerY);
        ctx.scale(-1, 1);
        ctx.fillStyle = luminance(contourColor) > 0.5 ? "rgba(15,23,42,0.82)" : "rgba(255,255,255,0.9)";
        ctx.font = `700 ${Math.round(W * 0.044)}px "Poppins", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(design.backText.trim(), 0, 0);
        ctx.restore();
      }
      ctx.restore();
      drawMetallicEyelet(ctx, layout.lugX, layout.lugY, layout.lugR);
      return;
    }

    // Dibujo libre recortado dentro de la silueta del nombre si el cliente dibujó algo
    if (options.drawing) {
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = 0.85;
      ctx.drawImage(options.drawing, 0, 0, W, H);
      ctx.restore();
    }

    // Brillo biselado suave del contorno
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    const sheen = ctx.createLinearGradient(0, H * 0.25, 0, H * 0.78);
    sheen.addColorStop(0, "rgba(255,255,255,0.16)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(0,0,0,0.16)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Letras 3D en relieve del nombre
    ctx.save();
    ctx.font = `800 ${layout.fontSize}px "${design.font}", "Poppins", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const totalH = (layout.lines.length - 1) * layout.lineHeight;

    layout.lines.forEach((line, idx) => {
      const ly = layout.centerY - totalH / 2 + idx * layout.lineHeight;
      // Sombra de relieve 3D
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.fillText(line, layout.centerX + W * 0.005, ly + W * 0.008);

      if (!design.nameOutline) {
        ctx.strokeStyle = design.textColor;
        ctx.lineWidth = layout.fontSize * 0.1;
        ctx.strokeText(line, layout.centerX, ly);
      } else {
        // Filete fino de contraste para máxima nitidez
        ctx.strokeStyle = luminance(design.textColor) > 0.6 ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.28)";
        ctx.lineWidth = Math.max(2, W * 0.006);
        ctx.strokeText(line, layout.centerX, ly);
      }

      // Relleno principal de las letras
      ctx.fillStyle = design.textColor;
      ctx.fillText(line, layout.centerX, ly);

      // Luz superior de relieve
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillText(line, layout.centerX - W * 0.002, ly - W * 0.003);
      ctx.fillStyle = design.textColor;
      ctx.globalAlpha = 0.86;
      ctx.fillText(line, layout.centerX, ly);
      ctx.globalAlpha = 1;
    });
    ctx.restore();

    // Foto en medallón soldado si el usuario subió su imagen
    if (layout.photoCircle && options.image) {
      drawFramedPhoto(ctx, options.image, layout.photoCircle.cx, layout.photoCircle.cy, layout.photoCircle.r, W);
    }

    // Formitas pequeñas soldadas al nombre
    for (const c of layout.charmSpots) {
      const sh = SHAPE_MAP[c.id];
      if (sh) drawMiniShape(ctx, sh.d, c.cx, c.cy, c.size * 0.86, c.color);
    }

    drawMetallicEyelet(ctx, layout.lugX, layout.lugY, layout.lugR);
    return;
  }

  /* ==================== MODO 2: SUPERFICIE PARA GRABAR EL NOMBRE ==================== */
  const sg = computeSurfaceGeom(design, W, H);

  // 1. Pintar máscara exacta de la forma elegida
  drawSurfaceSilhouetteSolid(ctx, sg, "#ffffff");

  // 2. Todo el material, patrón, foto, dibujo y nombre grabado queda recortado a ESA FORMA
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";

  paintSurfaceMaterial(ctx, design, W, H);

  if (options.back) {
    const isDarkBack =
      design.surfaceMaterial === "nogal" ||
      (design.surfaceMaterial === "color" && luminance(design.shapeColor) < 0.42);
    const backInk = isDarkBack ? "rgba(255,248,230,0.88)" : "rgba(48,24,8,0.75)";
    const subInk = isDarkBack ? "rgba(255,248,230,0.58)" : "rgba(48,24,8,0.48)";

    ctx.save();
    ctx.translate(sg.cx, sg.cy);
    ctx.scale(-1, 1);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const customBack = design.backText.trim();
    if (customBack) {
      ctx.font = `700 ${Math.round(W * 0.052)}px "Poppins", sans-serif`;
      ctx.fillStyle = backInk;
      const bLines = wrapLines(ctx, customBack, sg.shapeSize * 0.66).slice(0, 2);
      bLines.forEach((bl, idx) => {
        ctx.fillText(bl, 0, -W * 0.02 + idx * W * 0.062);
      });
      ctx.font = `500 ${Math.round(W * 0.026)}px "Poppins", sans-serif`;
      ctx.fillStyle = subInk;
      ctx.fillText("Llaveros Miguel Paillacho", 0, W * 0.125);
    } else {
      ctx.font = `700 ${Math.round(W * 0.035)}px "Poppins", sans-serif`;
      ctx.fillStyle = backInk;
      ctx.fillText("GRABADO PERSONALIZADO", 0, -W * 0.02);
      ctx.font = `500 ${Math.round(W * 0.026)}px "Poppins", sans-serif`;
      ctx.fillStyle = subInk;
      ctx.fillText("Miguel Paillacho · $2.50", 0, W * 0.045);
    }
    ctx.restore();
    ctx.restore();
    drawMetallicEyelet(ctx, sg.lugX, sg.lugY, sg.lugR);
    return;
  }

  // Patrón decorativo de superficie
  drawSurfacePattern(ctx, design.pattern, design, sg, W, H);

  // Borde sutil de acabado láser sobre la forma elegida
  try {
    const p = new Path2D(sg.pathD);
    ctx.save();
    ctx.translate(sg.cx, sg.cy);
    const s = sg.shapeSize / 100;
    ctx.scale(s, s);
    ctx.translate(-50, -50);
    ctx.strokeStyle =
      design.surfaceMaterial === "madera" || design.surfaceMaterial === "nogal"
        ? "rgba(55, 25, 6, 0.35)"
        : "rgba(0, 0, 0, 0.14)";
    ctx.lineWidth = 2.4;
    ctx.stroke(p);
    ctx.restore();
  } catch {
    /* ignore */
  }

  // Capa de dibujo libre del cliente
  if (options.drawing) {
    ctx.save();
    ctx.globalAlpha = 0.94;
    ctx.drawImage(options.drawing, sg.cx - sg.shapeSize * 0.48, sg.cy - sg.shapeSize * 0.48, sg.shapeSize * 0.96, sg.shapeSize * 0.96);
    ctx.restore();
  }

  const hasImage = Boolean(options.image);
  const smalls = design.smallShapes.filter((s) => SHAPE_MAP[s.id]).slice(0, 8);
  const isCompactHorizontal = design.shapeId === "ani-hueso" || design.shapeId === "trans-carro" || design.shapeId === "dep-patineta";
  const isRingShape = design.shapeId === "geo-anillo" || design.shapeId === "com-donut" || design.shapeId === "mec-arandela";

  // Imagen del cliente sobre la superficie
  if (hasImage && options.image) {
    const r = W * (isCompactHorizontal ? 0.085 : 0.13);
    const photoY = isCompactHorizontal ? sg.cy : sg.cy - sg.shapeSize * 0.17;
    const photoX = isCompactHorizontal ? sg.cx - sg.shapeSize * 0.22 : sg.cx;
    drawFramedPhoto(ctx, options.image, photoX, photoY, r, W);
  }

  // Nombre o iniciales GRABADOS en la superficie
  const rawText = design.text.trim();
  const isPlaceholder = rawText.length === 0;
  const displayText = isPlaceholder ? "Tu nombre" : rawText;
  const maxTextW = sg.shapeSize * (isCompactHorizontal && hasImage ? 0.42 : isCompactHorizontal ? 0.68 : 0.68);
  let fontSize = Math.round(
    W * (isCompactHorizontal ? 0.095 : hasImage ? 0.1 : 0.125) * clamp(design.textScale, 0.6, 1.5),
  );

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let lines: string[] = [displayText];
  for (let i = 0; i < 10; i++) {
    ctx.font = `700 ${fontSize}px "${design.font}", "Poppins", sans-serif`;
    lines = wrapLines(ctx, displayText, maxTextW);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1);
    if (widest <= maxTextW && lines.length <= 3) break;
    fontSize = Math.max(Math.round(W * 0.045), Math.round(fontSize * 0.87));
  }

  const lineHeight = fontSize * 1.1;
  const textX = isCompactHorizontal && hasImage ? sg.cx + sg.shapeSize * 0.1 : sg.cx;
  const textY = isRingShape
    ? sg.cy + sg.shapeSize * 0.31
    : isCompactHorizontal
      ? sg.cy
      : hasImage
        ? sg.cy + sg.shapeSize * 0.11
        : smalls.length > 0
          ? sg.cy - sg.shapeSize * 0.02
          : sg.cy + sg.shapeSize * 0.01;
  const startY = textY - ((lines.length - 1) * lineHeight) / 2;

  ctx.font = `700 ${fontSize}px "${design.font}", "Poppins", sans-serif`;
  lines.forEach((line, i) => {
    const ly = startY + i * lineHeight;
    if (isPlaceholder) {
      ctx.fillStyle = "rgba(60, 35, 15, 0.36)";
      ctx.fillText(line, textX, ly);
      return;
    }

    if (design.engraveStyle === "grabado") {
      // Efecto real de grabado láser/bajo relieve sobre la superficie
      ctx.fillStyle = "rgba(255, 245, 225, 0.42)";
      ctx.fillText(line, textX + W * 0.0028, ly + W * 0.0038);
      ctx.fillStyle = "rgba(20, 8, 0, 0.48)";
      ctx.fillText(line, textX - W * 0.0028, ly - W * 0.0034);
      ctx.fillStyle = design.textColor;
      ctx.fillText(line, textX, ly);
    } else {
      // Letras en relieve de color con sombra nítida
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillText(line, textX + W * 0.004, ly + W * 0.006);
      ctx.strokeStyle = luminance(design.textColor) > 0.65 ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.25)";
      ctx.lineWidth = Math.max(2, W * 0.005);
      ctx.lineJoin = "round";
      ctx.strokeText(line, textX, ly);
      ctx.fillStyle = design.textColor;
      ctx.fillText(line, textX, ly);
    }
  });

  // Formitas pequeñas decorativas en la superficie
  if (smalls.length > 0 && !isCompactHorizontal) {
    const cSize = W * 0.062;
    const gap = Math.min(W * 0.082, (sg.shapeSize * 0.56) / smalls.length);
    const total = (smalls.length - 1) * gap;
    const cy = hasImage ? sg.cy + sg.shapeSize * 0.27 : sg.cy + sg.shapeSize * 0.2;
    smalls.forEach((s, i) => {
      const sh = SHAPE_MAP[s.id];
      if (!sh) return;
      const cx = sg.cx - total / 2 + i * gap;
      drawMiniShape(ctx, sh.d, cx + 1.5, cy + 2, cSize, "rgba(0,0,0,0.22)");
      drawMiniShape(ctx, sh.d, cx, cy, cSize, s.color);
    });
  } else if (smalls.length > 0 && isCompactHorizontal && !hasImage) {
    // En formas horizontales (huesito), poner 1 formita en cada extremo
    const leftSh = SHAPE_MAP[smalls[0].id];
    if (leftSh) {
      drawMiniShape(ctx, leftSh.d, sg.cx - sg.shapeSize * 0.33, sg.cy, W * 0.065, smalls[0].color);
    }
    const rightItem = smalls[1] || smalls[0];
    const rightSh = SHAPE_MAP[rightItem.id];
    if (rightSh) {
      drawMiniShape(ctx, rightSh.d, sg.cx + sg.shapeSize * 0.33, sg.cy, W * 0.065, rightItem.color);
    }
  }

  ctx.restore();

  // Arandela metálica superior perforada
  drawMetallicEyelet(ctx, sg.lugX, sg.lugY, sg.lugR);
}

/** Carga la fuente seleccionada sin bloquear jamás el renderizado inmediato. */
export function prepareDesignFont(design: KeychainDesign): Promise<void> {
  return Promise.race([
    loadFont(design.font, 700),
    new Promise<void>((resolve) => setTimeout(resolve, 900)),
  ]);
}
