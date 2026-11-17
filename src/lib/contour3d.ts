export type Point2 = [number, number];

export type ExtractedShape = {
  /** Contorno exterior en coordenadas normalizadas [-0.5, 0.5] (X derecha, Y arriba), sentido antihorario */
  outer: Point2[];
  /** Agujeros interiores en coordenadas normalizadas [-0.5, 0.5], sentido horario */
  holes: Point2[][];
  area: number;
};

export type ContourResult = {
  shapes: ExtractedShape[];
  /** Punto superior del llavero en coordenadas normalizadas [-0.5, 0.5] para enganchar la argolla 3D */
  ringAnchor: Point2;
  /** Caja envolvente normalizada */
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

function signedAreaScreen(pts: Point2[]): number {
  let sum = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    sum += x0 * y1 - x1 * y0;
  }
  return sum * 0.5;
}

function smoothClosed(pts: Point2[], passes = 2): Point2[] {
  let cur = pts;
  const n = cur.length;
  if (n < 6) return cur;
  for (let p = 0; p < passes; p++) {
    const next: Point2[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const prev = cur[(i - 1 + n) % n];
      const self = cur[i];
      const post = cur[(i + 1) % n];
      next[i] = [
        0.22 * prev[0] + 0.56 * self[0] + 0.22 * post[0],
        0.22 * prev[1] + 0.56 * self[1] + 0.22 * post[1],
      ];
    }
    cur = next;
  }
  return cur;
}

function rdpOpen(pts: Point2[], eps: number): Point2[] {
  if (pts.length <= 2) return pts;
  const [x1, y1] = pts[0];
  const [x2, y2] = pts[pts.length - 1];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  let maxDistSq = -1;
  let splitIdx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    let distSq: number;
    if (lenSq < 1e-9) {
      distSq = (px - x1) * (px - x1) + (py - y1) * (py - y1);
    } else {
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      distSq = (px - projX) * (px - projX) + (py - projY) * (py - projY);
    }
    if (distSq > maxDistSq) {
      maxDistSq = distSq;
      splitIdx = i;
    }
  }

  if (maxDistSq > eps * eps) {
    const left = rdpOpen(pts.slice(0, splitIdx + 1), eps);
    const right = rdpOpen(pts.slice(splitIdx), eps);
    return [...left.slice(0, -1), ...right];
  }
  return [pts[0], pts[pts.length - 1]];
}

function simplifyClosed(pts: Point2[], eps: number): Point2[] {
  if (pts.length <= 6) return pts;
  const half = Math.floor(pts.length / 2);
  const a = rdpOpen(pts.slice(0, half + 1), eps);
  const b = rdpOpen([...pts.slice(half), pts[0]], eps);
  const merged = [...a.slice(0, -1), ...b.slice(0, -1)];
  return merged.length >= 4 ? merged : pts.slice(0, Math.min(pts.length, 8));
}

function pointInPoly(pt: Point2, poly: Point2[]): boolean {
  const [px, py] = pt;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Extrae contornos cerrados exactos (Marching Squares sin auto-intersecciones)
 * a partir de los datos RGBA de un canvas cuadrado de tamaño N×N.
 */
export function extractContoursFromRgba(
  rgba: Uint8ClampedArray,
  size: number,
  alphaThreshold = 115,
): ContourResult {
  const N = size;
  const grid = new Uint8Array(N * N);
  const border = 3;

  for (let y = border; y < N - border; y++) {
    const rowOff = y * N;
    for (let x = border; x < N - border; x++) {
      const a = rgba[(rowOff + x) * 4 + 3];
      if (a >= alphaThreshold) grid[rowOff + x] = 1;
    }
  }

  const stride = 2 * N + 1;
  const nextEdge = new Map<number, number>();

  const addSeg = (x0: number, y0: number, x1: number, y1: number) => {
    nextEdge.set(y0 * stride + x0, y1 * stride + x1);
  };

  for (let y = 0; y < N - 1; y++) {
    const r0 = y * N;
    const r1 = (y + 1) * N;
    for (let x = 0; x < N - 1; x++) {
      const code =
        (grid[r0 + x] << 3) |
        (grid[r0 + x + 1] << 2) |
        (grid[r1 + x + 1] << 1) |
        grid[r1 + x];
      if (code === 0 || code === 15) continue;

      const tx = 2 * x + 1;
      const ty = 2 * y;
      const rx = 2 * x + 2;
      const ry = 2 * y + 1;
      const bx = 2 * x + 1;
      const by = 2 * y + 2;
      const lx = 2 * x;
      const ly = 2 * y + 1;

      switch (code) {
        case 1:
          addSeg(lx, ly, bx, by);
          break;
        case 2:
          addSeg(bx, by, rx, ry);
          break;
        case 3:
          addSeg(lx, ly, rx, ry);
          break;
        case 4:
          addSeg(rx, ry, tx, ty);
          break;
        case 5:
          addSeg(lx, ly, tx, ty);
          addSeg(rx, ry, bx, by);
          break;
        case 6:
          addSeg(bx, by, tx, ty);
          break;
        case 7:
          addSeg(lx, ly, tx, ty);
          break;
        case 8:
          addSeg(tx, ty, lx, ly);
          break;
        case 9:
          addSeg(tx, ty, bx, by);
          break;
        case 10:
          addSeg(tx, ty, rx, ry);
          addSeg(bx, by, lx, ly);
          break;
        case 11:
          addSeg(tx, ty, rx, ry);
          break;
        case 12:
          addSeg(rx, ry, lx, ly);
          break;
        case 13:
          addSeg(rx, ry, bx, by);
          break;
        case 14:
          addSeg(bx, by, lx, ly);
          break;
      }
    }
  }

  const outersScreen: Array<{ pts: Point2[]; area: number; holes: Point2[][] }> = [];
  const holesScreen: Array<{ pts: Point2[]; area: number }> = [];

  const visited = new Set<number>();
  for (const startKey of nextEdge.keys()) {
    if (visited.has(startKey)) continue;
    const raw: Point2[] = [];
    let cur: number | undefined = startKey;
    let safety = 0;
    while (cur !== undefined && !visited.has(cur) && safety < N * N * 2) {
      visited.add(cur);
      safety++;
      const ix = cur % stride;
      const iy = (cur - ix) / stride;
      raw.push([ix * 0.5, iy * 0.5]);
      cur = nextEdge.get(cur);
    }
    if (raw.length < 6) continue;

    const rawArea = signedAreaScreen(raw);
    if (Math.abs(rawArea) < 9) continue; // descarta ruido minúsculo

    const smoothed = smoothClosed(raw, 2);
    const simplified = simplifyClosed(smoothed, 0.42);
    const area = signedAreaScreen(simplified);
    if (Math.abs(area) < 7 || simplified.length < 4) continue;

    if (area > 0) {
      outersScreen.push({ pts: simplified, area, holes: [] });
    } else {
      holesScreen.push({ pts: simplified, area: Math.abs(area) });
    }
  }

  // Ordenar exteriores de menor a mayor área para asignar cada agujero al exterior más cercano que lo contiene
  outersScreen.sort((a, b) => a.area - b.area);

  for (const h of holesScreen) {
    // Evitar agujeros demasiado grandes o diminutos que rompan paredes muy finas
    if (h.area < 10) continue;
    const probe = h.pts[0];
    for (const outer of outersScreen) {
      if (outer.area > h.area * 1.15 && pointInPoly(probe, outer.pts)) {
        outer.holes.push(h.pts);
        break;
      }
    }
  }

  const toWorld = (pts: Point2[]): Point2[] => {
    // Invertir orden para compensar el cambio Y_world = 0.5 - y/N
    const out: Point2[] = new Array(pts.length);
    for (let i = 0; i < pts.length; i++) {
      const [sx, sy] = pts[pts.length - 1 - i];
      out[i] = [sx / N - 0.5, 0.5 - sy / N];
    }
    return out;
  };

  let minX = 0.5;
  let maxX = -0.5;
  let minY = 0.5;
  let maxY = -0.5;
  let topPoint: Point2 = [0, 0.38];

  const shapes: ExtractedShape[] = outersScreen.map((o) => {
    const outer = toWorld(o.pts);
    for (const [wx, wy] of outer) {
      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (wy < minY) minY = wy;
      if (wy > maxY) {
        maxY = wy;
        topPoint = [wx, wy];
      }
    }
    return {
      outer,
      holes: o.holes.map(toWorld),
      area: o.area / (N * N),
    };
  });

  // Buscar promedio X cerca del punto más alto para centrar bien la argolla
  if (shapes.length > 0) {
    let sumX = 0;
    let cnt = 0;
    const band = 0.025;
    for (const s of shapes) {
      for (const [wx, wy] of s.outer) {
        if (wy >= maxY - band) {
          sumX += wx;
          cnt++;
        }
      }
    }
    if (cnt > 0) {
      topPoint = [sumX / cnt, maxY];
    }
  } else {
    minX = -0.35;
    maxX = 0.35;
    minY = -0.4;
    maxY = 0.4;
  }

  return {
    shapes,
    ringAnchor: topPoint,
    bounds: { minX, maxX, minY, maxY },
  };
}
