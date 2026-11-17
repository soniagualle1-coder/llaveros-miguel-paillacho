/**
 * Catálogo de 200 formas para los llaveros.
 * Cada forma es una ruta SVG (espacio 0..100) que también se puede dibujar
 * en un canvas con Path2D, así la galería y el llavero se ven iguales.
 */

export type ShapeDef = {
  id: string;
  name: string;
  category: string;
  d: string;
};

type Pt = [number, number];

const r1 = (n: number) => Math.round(n * 10) / 10;

function polar(cx: number, cy: number, r: number, deg: number): Pt {
  const a = (deg * Math.PI) / 180;
  return [r1(cx + r * Math.cos(a)), r1(cy + r * Math.sin(a))];
}

function pts(list: Pt[]): string {
  return list.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ") + " Z";
}

function poly(cx: number, cy: number, r: number, sides: number, rot = -90): Pt[] {
  return Array.from({ length: sides }, (_, i) => polar(cx, cy, r, rot + (i * 360) / sides));
}

function starPts(cx: number, cy: number, points: number, outer: number, innerRatio = 0.45, rot = -90): Pt[] {
  const list: Pt[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : outer * innerRatio;
    list.push(polar(cx, cy, r, rot + (i * 180) / points));
  }
  return list;
}

function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, steps = 26): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => polar(cx, cy, r, a0 + ((a1 - a0) * i) / steps));
}

function circlePts(cx: number, cy: number, r: number, steps = 36): Pt[] {
  return arcPts(cx, cy, r, -90, 270, steps);
}

function circ(cx: number, cy: number, r: number): string {
  return pts(circlePts(cx, cy, r));
}

function ell(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const list: Pt[] = Array.from({ length: 37 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 36;
    const x = rx * Math.cos(a);
    const y = ry * Math.sin(a);
    return [r1(cx + x * cos - y * sin), r1(cy + x * sin + y * cos)];
  });
  return pts(list);
}

function ring(cx: number, cy: number, rOut: number, rIn: number): string {
  return pts([...circlePts(cx, cy, rOut), ...circlePts(cx, cy, rIn).reverse()]);
}

function hole(cx: number, cy: number, r: number): string {
  return " " + pts(circlePts(cx, cy, r).reverse());
}

function arcRing(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number): string {
  return pts([...arcPts(cx, cy, rOut, a0, a1), ...arcPts(cx, cy, rIn, a1, a0)]);
}

function rrPts(x: number, y: number, w: number, h: number, r: number): Pt[] {
  const rr = Math.min(r, w / 2, h / 2);
  const out: Pt[] = [];
  const corners: Array<[number, number, number, number]> = [
    [x + w - rr, y + rr, -90, 0],
    [x + w - rr, y + h - rr, 0, 90],
    [x + rr, y + h - rr, 90, 180],
    [x + rr, y + rr, 180, 270],
  ];
  for (const [cx, cy, a0, a1] of corners) {
    const seg = arcPts(cx, cy, rr, a0, a1, 6);
    out.push(...seg.slice(0, seg.length - 1));
  }
  return out;
}

function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  return pts(rrPts(x, y, w, h, r));
}

function holeRR(x: number, y: number, w: number, h: number, r: number): string {
  return " " + pts(rrPts(x, y, w, h, r).reverse());
}

function gear(cx: number, cy: number, teeth: number, rOut: number, rRoot: number, rHole = 0): string {
  const list: Pt[] = [];
  const step = 360 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    list.push(polar(cx, cy, rRoot, a));
    list.push(polar(cx, cy, rOut, a + step * 0.16));
    list.push(polar(cx, cy, rOut, a + step * 0.34));
    list.push(polar(cx, cy, rRoot, a + step * 0.5));
  }
  return pts(list) + (rHole > 0 ? hole(cx, cy, rHole) : "");
}

function petals(count: number, dist: number, r: number): string {
  let d = "";
  for (let i = 0; i < count; i++) {
    const [x, y] = polar(50, 50, dist, -90 + (i * 360) / count);
    d += circ(x, y, r);
  }
  return d + circ(50, 50, r * 0.85);
}

function sunRays(count: number, rOuter: number, rInner: number, halfWidth: number): string {
  let d = "";
  for (let i = 0; i < count; i++) {
    const a = -90 + (i * 360) / count;
    d += pts([
      polar(50, 50, rInner, a - halfWidth),
      polar(50, 50, rInner, a + halfWidth),
      polar(50, 50, rOuter, a + halfWidth * 0.55),
      polar(50, 50, rOuter, a - halfWidth * 0.55),
    ]);
  }
  return d + circ(50, 50, rInner * 0.92);
}

function springPath(x0: number, x1: number, cy: number, coils: number, amp: number, thick: number): string {
  const n = coils * 2;
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const x = r1(x0 + ((x1 - x0) * i) / n);
    const even = i % 2 === 0;
    upper.push([x, even ? r1(cy - amp) : r1(cy + amp - thick)]);
    lower.push([x, even ? r1(cy - amp + thick) : r1(cy + amp)]);
  }
  return pts([...upper, ...lower.reverse()]);
}

function stadiumPts(cx: number, cy: number, w: number, r: number): Pt[] {
  const dx = w / 2 - r;
  return [...arcPts(cx + dx, cy, r, -90, 90), ...arcPts(cx - dx, cy, r, 90, 270)];
}

const defs: ShapeDef[] = [];
function def(id: string, name: string, category: string, d: string): void {
  defs.push({ id, name, category, d });
}

/* ------------------------------ Geométricas (20) ----------------------------- */
def("geo-placa-clasica", "Placa clásica", "Geométricas", roundRect(14, 7, 72, 86, 18));
def("geo-escudo", "Escudo grabado", "Geométricas", "M 50 6 L 88 20 L 88 52 C 88 74 70 88 50 95 C 30 88 12 74 12 52 L 12 20 Z");
def("geo-circulo", "Círculo", "Geométricas", circ(50, 50, 45));
def("geo-cuadrado", "Cuadrado", "Geométricas", pts([[12, 12], [88, 12], [88, 88], [12, 88]]));
def("geo-cuadrado-redondo", "Cuadrado redondeado", "Geométricas", roundRect(12, 12, 76, 76, 20));
def("geo-triangulo", "Triángulo", "Geométricas", pts(poly(50, 56, 46, 3)));
def("geo-pentagono", "Pentágono", "Geométricas", pts(poly(50, 53, 46, 5)));
def("geo-hexagono", "Hexágono", "Geométricas", pts(poly(50, 52, 46, 6)));
def("geo-heptagono", "Heptágono", "Geométricas", pts(poly(50, 52, 45, 7)));
def("geo-octagono", "Octágono", "Geométricas", pts(poly(50, 52, 45, 8)));
def("geo-decagono", "Decágono", "Geométricas", pts(poly(50, 52, 45, 10)));
def("geo-dodecagono", "Dodecágono", "Geométricas", pts(poly(50, 52, 45, 12)));
def("geo-rombo", "Rombo", "Geométricas", pts([[50, 5], [90, 50], [50, 95], [10, 50]]));
def("geo-trapecio", "Trapecio", "Geométricas", pts([[26, 14], [74, 14], [92, 86], [8, 86]]));
def("geo-chevron", "Chevrón", "Geométricas", pts([[10, 16], [50, 52], [90, 16], [90, 36], [50, 72], [10, 36]]));
def("geo-flecha", "Flecha", "Geométricas", "M 50 6 L 76 34 L 61 34 L 61 92 L 39 92 L 39 34 L 24 34 Z");
def("geo-cruz", "Cruz", "Geométricas", pts([[40, 8], [60, 8], [60, 40], [92, 40], [92, 60], [60, 60], [60, 92], [40, 92], [40, 60], [8, 60], [8, 40], [40, 40]]));
def("geo-anillo", "Anillo", "Geométricas", ring(50, 50, 44, 26));
def("geo-semicirculo", "Semicírculo", "Geométricas", pts(arcPts(50, 50, 46, 180, 360)));
def("geo-gota", "Gota", "Geométricas", "M 50 5 C 70 30 84 48 84 62 A 34 34 0 1 1 16 62 C 16 48 30 30 50 5 Z");

/* -------------------------- Estrellas y destellos (16) ------------------------ */
const starList: Array<[number, number]> = [
  [3, 0.32],
  [4, 0.3],
  [5, 0.45],
  [6, 0.45],
  [7, 0.45],
  [8, 0.45],
  [9, 0.45],
  [10, 0.45],
  [12, 0.45],
  [16, 0.5],
];
for (const [p, ratio] of starList) {
  def(`estrella-${p}`, `Estrella de ${p} puntas`, "Estrellas y destellos", pts(starPts(50, 52, p, 46, ratio)));
}
for (const p of [4, 6, 8, 12]) {
  def(`destello-${p}`, `Destello de ${p} puntas`, "Estrellas y destellos", pts(starPts(50, 52, p, 48, 0.2)));
}
def("estrella-explosion", "Explosión", "Estrellas y destellos", pts(starPts(50, 52, 16, 48, 0.66)));
def("estrella-irregular", "Estrella irregular", "Estrellas y destellos", pts([[50, 4], [63, 33], [94, 29], [71, 52], [87, 86], [50, 67], [13, 86], [29, 52], [6, 29], [37, 33]]));

/* ------------------------------- Naturaleza (20) ----------------------------- */
def("nat-hoja", "Hoja", "Naturaleza", "M 50 6 C 76 24 86 60 50 94 C 14 60 24 24 50 6 Z");
def("nat-hoja-doble", "Hojas dobles", "Naturaleza", "M 50 94 C 30 70 8 60 6 34 C 30 42 46 62 50 94 Z M 50 94 C 70 70 92 60 94 34 C 70 42 54 62 50 94 Z");
def("nat-trebol", "Trébol", "Naturaleza", circ(50, 34, 20) + circ(30, 60, 20) + circ(70, 60, 20) + " M 47 60 L 53 60 L 55 94 L 45 94 Z");
def("nat-flor-5", "Flor de 5 pétalos", "Naturaleza", petals(5, 27, 13));
def("nat-flor-6", "Flor de 6 pétalos", "Naturaleza", petals(6, 27, 12));
def("nat-flor-8", "Flor de 8 pétalos", "Naturaleza", petals(8, 29, 11));
def("nat-margarita", "Margarita", "Naturaleza", petals(12, 31, 8));
def("nat-girasol", "Girasol", "Naturaleza", petals(16, 31, 8) + hole(50, 50, 13));
def("nat-arbol", "Árbol", "Naturaleza", "M 44 58 L 56 58 L 56 92 L 44 92 Z" + circ(50, 34, 23) + circ(30, 48, 16) + circ(70, 48, 16));
def("nat-cactus", "Cactus", "Naturaleza", roundRect(38, 12, 24, 78, 12) + roundRect(12, 40, 22, 13, 6) + roundRect(12, 40, 13, 34, 6) + roundRect(66, 32, 22, 13, 6) + roundRect(75, 32, 13, 40, 6));
def("nat-copo-6", "Copo de nieve", "Naturaleza", pts(starPts(50, 50, 6, 46, 0.82)) + hole(50, 50, 7));
def("nat-copo-8", "Copo de hielo", "Naturaleza", pts(starPts(50, 50, 8, 46, 0.8)) + hole(50, 50, 7));
def("nat-sol", "Sol", "Naturaleza", sunRays(12, 48, 38, 9));
def("nat-luna-creciente", "Luna creciente", "Naturaleza", pts([...arcPts(50, 50, 42, -56, -304), ...arcPts(64, 50, 36, 74, -74)]));
def("nat-luna-llena", "Luna llena", "Naturaleza", circ(50, 50, 44) + hole(36, 40, 8) + hole(58, 58, 6) + hole(62, 34, 5));
def("nat-gota-agua", "Gota de agua", "Naturaleza", "M 50 5 C 68 28 82 46 82 60 A 32 32 0 1 1 18 60 C 18 46 32 28 50 5 Z" + hole(40, 58, 7));
def("nat-llama", "Llama", "Naturaleza", "M 50 4 C 56 22 76 28 74 50 C 72 72 62 84 50 94 C 38 84 28 72 26 50 C 24 28 44 22 50 4 Z" + hole(50, 68, 12));
def("nat-montanas", "Montañas", "Naturaleza", pts([[4, 90], [32, 30], [48, 56], [66, 22], [96, 90]]) + " M 26 40 L 32 30 L 40 40 Z M 58 32 L 66 22 L 76 34 Z");
def("nat-nube", "Nube", "Naturaleza", circ(34, 56, 20) + circ(58, 48, 24) + circ(78, 58, 18) + "M 14 60 L 86 60 Q 86 78 68 78 L 32 78 Q 14 78 14 60 Z");
def("nat-hongos", "Hongos", "Naturaleza", "M 14 34 A 16 16 0 0 1 46 34 Z M 22 34 L 38 34 L 36 62 L 24 62 Z M 54 22 A 20 20 0 0 1 94 22 Z M 64 22 L 84 22 L 82 54 L 66 54 Z" + hole(24, 28, 3) + hole(74, 16, 4) + hole(64, 14, 2.5));

/* -------------------------------- Animales (24) ------------------------------ */
def("ani-gato", "Gato", "Animales", circ(50, 54, 34) + pts([[22, 30], [16, 6], [42, 20]]) + pts([[78, 30], [84, 6], [58, 20]]) + hole(38, 50, 4) + hole(62, 50, 4) + " M 46 64 L 54 64 L 50 69 Z");
def("ani-perro", "Perro", "Animales", circ(50, 50, 30) + ell(22, 46, 12, 20) + ell(78, 46, 12, 20) + ell(50, 66, 14, 10) + hole(40, 44, 4) + hole(60, 44, 4) + ell(50, 60, 5, 4));
def("ani-oso", "Oso", "Animales", circ(50, 54, 30) + circ(24, 28, 12) + circ(76, 28, 12) + ell(50, 66, 16, 12) + hole(40, 48, 4) + hole(60, 48, 4) + ell(50, 62, 5, 4));
def("ani-zorro", "Zorro", "Animales", pts([[50, 92], [10, 44], [26, 18], [50, 36], [74, 18], [90, 44]]) + hole(50, 66, 7));
def("ani-conejo", "Conejo", "Animales", circ(50, 58, 26) + ell(34, 22, 9, 22, -12) + ell(66, 22, 9, 22, 12) + hole(41, 54, 4) + hole(59, 54, 4) + " M 46 68 L 54 68 L 50 73 Z");
def("ani-panda", "Panda", "Animales", circ(50, 54, 34) + circ(24, 26, 12) + circ(76, 26, 12) + hole(38, 48, 5.5) + hole(62, 48, 5.5) + hole(50, 64, 4));
def("ani-pez", "Pez", "Animales", ell(46, 52, 32, 20) + pts([[74, 52], [94, 32], [94, 72]]) + hole(30, 46, 3.5));
def("ani-pajaro", "Pájaro", "Animales", ell(50, 62, 22, 16) + circ(64, 36, 13) + pts([[76, 34], [92, 38], [76, 42]]) + ell(42, 58, 12, 8, -20) + pts([[28, 62], [8, 56], [10, 70]]) + hole(66, 33, 2.5));
def("ani-mariposa", "Mariposa", "Animales", ell(30, 36, 20, 16, -25) + ell(70, 36, 20, 16, 25) + ell(32, 66, 15, 12, 25) + ell(68, 66, 15, 12, -25) + ell(50, 50, 5, 26));
def("ani-abeja", "Abeja", "Animales", ell(50, 60, 16, 22) + ell(34, 34, 12, 8, -30) + ell(66, 34, 12, 8, 30) + circ(50, 32, 8) + pts([[44, 24], [46, 10], [49, 11], [47, 25]]) + pts([[56, 24], [54, 10], [51, 11], [53, 25]]));
def("ani-escarabajo", "Escarabajo", "Animales", circ(50, 56, 26) + circ(50, 24, 12) + pts([[26, 44], [6, 34], [9, 40]]) + pts([[74, 44], [94, 34], [91, 40]]) + pts([[28, 66], [8, 74], [12, 68]]) + pts([[72, 66], [92, 74], [88, 68]]) + hole(50, 56, 6));
def("ani-tortuga", "Tortuga", "Animales", ell(50, 56, 36, 26) + circ(50, 24, 10) + circ(16, 66, 7) + circ(84, 66, 7) + circ(24, 76, 7) + circ(76, 76, 7) + hole(50, 56, 12) + hole(30, 48, 6) + hole(70, 48, 6) + hole(50, 70, 6));
def("ani-pulpo", "Pulpo", "Animales", circ(50, 38, 24) + "M 30 54 C 20 66 22 82 14 90 C 24 88 32 78 34 66 Z M 42 60 C 38 74 40 86 34 94 C 44 90 48 76 48 64 Z M 58 60 C 62 74 60 86 66 94 C 56 90 52 76 52 64 Z M 70 54 C 80 66 78 82 86 90 C 76 88 68 78 66 66 Z" + hole(42, 34, 4) + hole(58, 34, 4));
def("ani-caracol", "Caracol", "Animales", circ(52, 46, 26) + circ(52, 46, 17) + circ(52, 46, 8) + "M 26 62 C 14 74 12 86 20 92 L 44 92 C 36 84 34 72 40 64 Z" + pts([[19, 34], [11, 23], [14, 21], [21, 32]]) + pts([[21, 34], [24, 21], [27, 23], [24, 34]]));
def("ani-delfin", "Delfín", "Animales", "M 20 60 C 30 40 54 32 70 44 C 78 50 84 58 88 60 C 80 62 78 70 70 72 C 56 76 34 76 20 60 Z" + pts([[16, 58], [4, 46], [12, 66]]) + pts([[46, 36], [40, 20], [56, 32]]) + hole(70, 50, 3));
def("ani-ballena", "Ballena", "Animales", "M 14 62 C 24 44 52 38 70 48 C 80 53 86 60 90 62 C 84 64 84 72 76 74 C 60 80 30 78 14 62 Z" + pts([[12, 60], [2, 50], [8, 68]]) + circ(94, 28, 4) + circ(98, 42, 3) + hole(26, 54, 3.5));
def("ani-huella", "Huella de pata", "Animales", ell(50, 68, 20, 16) + ell(24, 36, 9, 12) + ell(42, 24, 9, 13) + ell(60, 24, 9, 13) + ell(76, 36, 9, 12));
def("ani-pluma", "Pluma", "Animales", "M 50 8 C 70 26 76 52 66 76 C 58 88 42 88 34 76 C 24 52 30 26 50 8 Z" + pts([[48, 30], [52, 30], [51, 92], [49, 92]]));
def("ani-buho", "Búho", "Animales", circ(50, 52, 32) + pts([[28, 28], [20, 10], [42, 20]]) + pts([[72, 28], [80, 10], [58, 20]]) + circ(38, 44, 11) + circ(62, 44, 11) + hole(38, 44, 5) + hole(62, 44, 5) + pts([[50, 56], [44, 66], [56, 66]]));
def("ani-rana", "Rana", "Animales", ell(50, 62, 34, 24) + circ(28, 32, 11) + circ(72, 32, 11) + hole(28, 32, 5) + hole(72, 32, 5) + ell(18, 68, 10, 7) + ell(82, 68, 10, 7));
def("ani-serpiente", "Serpiente", "Animales", circ(22, 84, 9) + circ(20, 70, 9) + circ(28, 58, 9) + circ(40, 52, 9) + circ(52, 44, 9) + circ(58, 34, 9) + circ(60, 26, 9) + ell(66, 20, 10, 8) + hole(70, 18, 2) + pts([[74, 22], [82, 24], [74, 26]]));
def("ani-hueso", "Huesito mascota", "Animales", roundRect(20, 36, 60, 28, 10) + circ(18, 36, 14) + circ(18, 64, 14) + circ(82, 36, 14) + circ(82, 64, 14));
def("ani-pinguino", "Pingüino", "Animales", ell(50, 56, 30, 34) + circ(50, 24, 18) + pts([[50, 30], [64, 34], [50, 38]]) + ell(24, 58, 9, 18, 20) + ell(76, 58, 9, 18, -20) + hole(50, 62, 18));
def("ani-caballo", "Caballo", "Animales", "M 68 92 L 76 58 L 56 44 L 64 30 L 70 16 L 60 4 L 52 14 L 46 28 L 38 60 L 32 92 Z" + hole(58, 32, 3) + hole(72, 40, 2.5) + pts([[48, 26], [42, 60], [48, 62], [54, 30]]));

/* --------------------------------- Comida (18) ------------------------------- */
def("com-pizza", "Porción de pizza", "Comida", pts([[50, 8], [92, 84], [8, 84]]) + hole(32, 62, 7) + hole(68, 62, 7) + hole(50, 40, 6));
def("com-donut", "Donut", "Comida", ring(50, 52, 44, 22) + hole(30, 34, 4) + hole(70, 34, 4) + hole(50, 78, 5) + hole(22, 60, 4));
def("com-cupcake", "Cupcake", "Comida", pts([[24, 52], [76, 52], [68, 92], [32, 92]]) + "M 22 52 A 28 26 0 0 1 78 52 Z" + circ(50, 20, 7));
def("com-cono-helado", "Cono de helado", "Comida", pts([[36, 46], [64, 46], [50, 92]]) + circ(42, 38, 15) + circ(60, 38, 15) + circ(50, 26, 14));
def("com-cereza", "Cerezas", "Comida", circ(34, 68, 16) + circ(68, 72, 14) + pts([[42, 56], [46, 56], [58, 26], [54, 26]]) + pts([[62, 60], [66, 60], [60, 28], [56, 28]]));
def("com-manzana", "Manzana", "Comida", "M 50 26 C 40 14 20 18 16 40 C 12 62 28 88 50 88 C 72 88 88 62 84 40 C 80 18 60 14 50 26 Z" + "M 48 26 L 52 26 L 52 12 L 48 12 Z" + ell(66, 22, 12, 6, -25));
def("com-fresa", "Fresa", "Comida", "M 50 92 C 20 92 12 62 24 44 C 32 34 44 30 50 30 C 56 30 68 34 76 44 C 88 62 80 92 50 92 Z" + pts([[24, 36], [50, 24], [76, 36], [68, 30], [50, 18], [32, 30]]) + hole(38, 56, 3) + hole(56, 48, 3) + hole(62, 68, 3) + hole(42, 74, 3));
def("com-platano", "Plátano", "Comida", arcRing(50, 58, 40, 25, 35, 145));
def("com-zanahoria", "Zanahoria", "Comida", pts([[50, 20], [72, 88], [28, 88]]) + pts([[48, 24], [40, 6], [52, 16]]) + pts([[52, 24], [64, 8], [58, 20]]) + hole(56, 60, 3) + hole(44, 72, 3));
def("com-pan", "Pan", "Comida", "M 14 44 A 36 30 0 0 1 86 44 L 86 76 A 12 12 0 0 1 74 88 L 26 88 A 12 12 0 0 1 14 76 Z" + pts([[28, 32], [34, 44], [38, 42], [32, 30]]) + pts([[46, 30], [52, 42], [56, 40], [50, 28]]) + pts([[64, 32], [70, 44], [74, 42], [68, 30]]));
def("com-galletita", "Galleta", "Comida", circ(50, 52, 42) + hole(34, 38, 6) + hole(62, 36, 6) + hole(50, 58, 6) + hole(38, 70, 6) + hole(64, 68, 6) + hole(50, 30, 5));
def("com-huevo", "Huevo frito", "Comida", "M 50 14 C 66 14 76 34 78 50 C 80 68 66 84 50 84 C 34 84 20 68 22 50 C 24 34 34 14 50 14 Z" + circ(50, 50, 20));
def("com-palta", "Palta", "Comida", "M 50 8 C 70 8 82 34 82 56 C 82 78 68 92 50 92 C 32 92 18 78 18 56 C 18 34 30 8 50 8 Z" + hole(50, 58, 14));
def("com-sandia", "Sandía", "Comida", pts([...arcPts(50, 62, 44, 0, 180), [50, 8]]) + hole(38, 74, 4) + hole(62, 74, 4) + hole(50, 84, 4));
def("com-taco", "Taco", "Comida", arcRing(50, 58, 40, 26, 20, 160) + hole(50, 66, 6));
def("com-hamburguesa", "Hamburguesa", "Comida", "M 16 42 A 34 26 0 0 1 84 42 Z" + roundRect(12, 48, 76, 13, 6) + roundRect(16, 64, 68, 16, 8));
def("com-perro-caliente", "Perro caliente", "Comida", roundRect(14, 36, 72, 32, 16) + hole(50, 52, 12));
def("com-croissant", "Croissant", "Comida", arcRing(50, 60, 40, 24, 200, 340) + pts([[26, 42], [18, 26], [34, 34]]) + pts([[74, 42], [82, 26], [66, 34]]));

/* -------------------------------- Deportes (16) ------------------------------ */
def("dep-futbol", "Balón de fútbol", "Deportes", circ(50, 50, 44) + hole(50, 22, 9) + hole(28, 42, 8) + hole(72, 42, 8) + hole(36, 74, 8) + hole(64, 74, 8));
def("dep-basquet", "Balón de baloncesto", "Deportes", circ(50, 50, 44) + pts([[5, 46], [95, 46], [95, 54], [5, 54]]) + pts([[46, 5], [54, 5], [54, 95], [46, 95]]) + ring(50, 50, 34, 27));
def("dep-americano", "Balón americano", "Deportes", ell(50, 50, 44, 26) + pts([[30, 44], [70, 44], [70, 56], [30, 56]]) + pts([[46, 28], [54, 28], [54, 72], [46, 72]]) + pts([[32, 44], [38, 44], [38, 50], [32, 50]]) + pts([[62, 44], [68, 44], [68, 50], [62, 50]]) + pts([[40, 52], [46, 52], [46, 58], [40, 58]]) + pts([[54, 52], [60, 52], [60, 58], [54, 58]]));
def("dep-tenis", "Pelota de tenis", "Deportes", circ(50, 50, 44) + arcRing(50, 50, 44, 40, 150, 210) + arcRing(50, 50, 44, 40, 320, 380));
def("dep-trofeo", "Trofeo", "Deportes", "M 28 12 L 72 12 L 68 42 C 68 54 58 62 50 62 C 42 62 32 54 32 42 Z" + arcRing(26, 30, 14, 9, 90, 270) + arcRing(74, 30, 14, 9, -90, 90) + pts([[46, 62], [54, 62], [56, 74], [44, 74]]) + roundRect(34, 74, 32, 10, 3) + roundRect(28, 84, 44, 8, 3));
def("dep-medalla", "Medalla", "Deportes", pts([[38, 6], [50, 26], [62, 6], [70, 10], [56, 32], [44, 32], [30, 10]]) + circ(50, 62, 26) + pts(starPts(50, 62, 5, 16, 0.45).reverse()));
def("dep-silbato", "Silbato", "Deportes", circ(38, 56, 26) + "M 56 44 L 90 44 A 10 10 0 0 1 90 64 L 56 64 Z" + hole(30, 48, 7) + circ(66, 54, 5));
def("dep-mancuerna", "Mancuerna", "Deportes", roundRect(12, 38, 16, 24, 5) + roundRect(72, 38, 16, 24, 5) + pts([[28, 46], [72, 46], [72, 54], [28, 54]]));
def("dep-patineta", "Patineta", "Deportes", "M 12 58 C 30 50 70 50 88 58 L 86 66 C 68 60 32 60 14 66 Z" + circ(28, 74, 8) + circ(72, 74, 8) + pts([[40, 46], [46, 46], [42, 30], [36, 30]]));
def("dep-surf", "Tabla de surf", "Deportes", "M 50 8 C 70 24 74 56 62 82 C 54 94 46 94 38 82 C 26 56 30 24 50 8 Z" + pts([[44, 88], [56, 88], [52, 96], [48, 96]]));
def("dep-pingpong", "Raqueta de ping pong", "Deportes", circ(48, 38, 30) + pts([[40, 62], [56, 62], [60, 94], [36, 94]]) + hole(48, 38, 20));
def("dep-boxeo", "Guante de boxeo", "Deportes", "M 26 30 C 26 16 44 10 58 16 C 74 23 82 38 80 54 C 78 70 66 82 52 82 C 36 82 26 68 26 52 Z" + roundRect(52, 78, 26, 16, 7) + hole(60, 56, 5));
def("dep-cronometro", "Cronómetro", "Deportes", circ(50, 56, 32) + pts([[44, 18], [56, 18], [53, 26], [47, 26]]) + pts([[46, 56], [54, 56], [52, 34], [48, 34]]) + hole(50, 56, 24));
def("dep-casco", "Casco", "Deportes", "M 14 60 A 36 36 0 0 1 86 60 Z" + roundRect(8, 56, 84, 12, 6) + pts([[50, 18], [56, 18], [56, 30], [50, 30]]));
def("dep-voleibol", "Balón de voleibol", "Deportes", circ(50, 50, 44) + arcRing(50, 50, 44, 40, 60, 120) + arcRing(50, 50, 44, 40, 180, 240) + arcRing(50, 50, 44, 40, 300, 360));
def("dep-rugby", "Balón de rugby", "Deportes", ell(50, 50, 44, 27) + pts([[30, 44], [70, 44], [70, 56], [30, 56]]) + pts([[24, 48], [30, 48], [30, 52], [24, 52]]) + pts([[70, 48], [76, 48], [76, 52], [70, 52]]));

/* --------------------------------- Música (10) ------------------------------- */
def("mus-nota", "Nota musical", "Música", ell(36, 76, 16, 11, -20) + pts([[49, 76], [49, 20], [75, 26], [75, 38], [58, 32], [58, 76]]));
def("mus-notas", "Notas dobles", "Música", ell(30, 74, 14, 10, -20) + ell(66, 66, 14, 10, -20) + pts([[42, 74], [48, 74], [52, 24], [46, 24]]) + pts([[78, 66], [84, 66], [80, 20], [74, 20]]) + pts([[46, 24], [74, 20], [76, 30], [48, 34]]));
def("mus-guitarra", "Guitarra", "Música", circ(38, 66, 22) + circ(56, 48, 18) + pts([[52, 34], [62, 26], [84, 12], [78, 20]]) + roundRect(72, 8, 16, 14, 4) + hole(38, 66, 8));
def("mus-auriculares", "Auriculares", "Música", arcRing(50, 46, 40, 34, 180, 360) + roundRect(8, 44, 16, 26, 7) + roundRect(76, 44, 16, 26, 7));
def("mus-microfono", "Micrófono", "Música", ell(50, 26, 14, 18) + arcRing(50, 46, 26, 22, 180, 360) + pts([[47, 46], [53, 46], [53, 72], [47, 72]]) + roundRect(38, 72, 24, 8, 4) + hole(44, 22, 2.5) + hole(56, 22, 2.5) + hole(50, 30, 2.5));
def("mus-parlante", "Parlante", "Música", roundRect(16, 8, 68, 84, 10) + circ(50, 34, 14) + circ(50, 34, 6) + circ(50, 70, 10));
def("mus-tambor", "Tambor", "Música", roundRect(12, 24, 76, 12, 6) + pts([[20, 36], [80, 36], [72, 84], [28, 84]]) + pts([[30, 40], [34, 40], [28, 82], [24, 82]]) + pts([[70, 40], [66, 40], [72, 82], [76, 82]]));
def("mus-piano", "Teclas de piano", "Música", roundRect(12, 22, 76, 56, 6) + holeRR(22, 22, 8, 34, 3) + holeRR(38, 22, 8, 34, 3) + holeRR(58, 22, 8, 34, 3) + holeRR(70, 22, 8, 34, 3));
def("mus-vinilo", "Disco de vinilo", "Música", ring(50, 50, 44, 17) + hole(50, 50, 4));
def("mus-trompeta", "Trompeta", "Música", pts([[20, 60], [60, 54], [60, 66], [20, 72]]) + "M 60 50 L 78 42 L 92 50 L 92 74 L 78 82 L 60 74 Z" + pts([[30, 58], [30, 68], [26, 68], [26, 58]]) + circ(66, 58, 5));

/* ------------------------------- Transporte (12) ----------------------------- */
def("trans-carro", "Carro", "Transporte", "M 12 62 L 18 44 C 22 36 30 34 36 34 L 62 34 C 68 34 76 38 80 46 L 86 62 L 86 74 L 12 74 Z" + circ(28, 74, 9) + circ(70, 74, 9) + hole(28, 74, 4) + hole(70, 74, 4) + hole(50, 48, 8));
def("trans-camion", "Camión", "Transporte", pts([[8, 60], [8, 34], [52, 34], [52, 60]]) + pts([[52, 44], [68, 44], [84, 56], [84, 60], [52, 60]]) + circ(24, 68, 9) + circ(44, 68, 9) + circ(70, 68, 9) + hole(24, 68, 4) + hole(44, 68, 4) + hole(70, 68, 4));
def("trans-bus", "Autobús", "Transporte", roundRect(12, 22, 76, 54, 8) + holeRR(20, 30, 16, 18, 3) + holeRR(42, 30, 16, 18, 3) + holeRR(64, 30, 16, 18, 3) + circ(30, 80, 8) + circ(70, 80, 8) + hole(30, 80, 3) + hole(70, 80, 3));
def("trans-avion", "Avión", "Transporte", "M 50 6 C 58 8 62 20 62 34 L 86 54 L 86 62 L 62 54 L 62 72 L 74 82 L 74 88 L 50 84 L 26 88 L 26 82 L 38 72 L 38 54 L 14 62 L 14 54 L 38 34 C 38 20 42 8 50 6 Z" + hole(50, 26, 5));
def("trans-helicoptero", "Helicóptero", "Transporte", ell(46, 56, 28, 18) + pts([[68, 56], [92, 62], [92, 70], [68, 64]]) + pts([[66, 48], [70, 34], [76, 34], [74, 48]]) + pts([[10, 40], [90, 40], [90, 44], [10, 44]]) + circ(36, 52, 8) + hole(36, 52, 5) + pts([[16, 66], [8, 78], [14, 80], [22, 68]]));
def("trans-cohete", "Cohete", "Transporte", "M 50 6 C 66 20 70 44 66 66 L 34 66 C 30 44 34 20 50 6 Z" + pts([[34, 60], [20, 78], [36, 72]]) + pts([[66, 60], [80, 78], [64, 72]]) + circ(50, 36, 9) + hole(50, 36, 6) + "M 40 68 L 60 68 L 54 88 L 46 88 Z");
def("trans-barco", "Barco de vela", "Transporte", pts([[8, 76], [92, 76], [82, 90], [18, 90]]) + pts([[50, 10], [50, 72], [16, 72]]) + pts([[52, 20], [52, 72], [84, 72]]));
def("trans-tren", "Tren", "Transporte", roundRect(14, 30, 44, 34, 6) + roundRect(58, 40, 30, 24, 5) + circ(26, 70, 8) + circ(46, 70, 8) + circ(68, 70, 8) + circ(84, 70, 8) + hole(26, 70, 3) + hole(46, 70, 3) + hole(68, 70, 3) + hole(84, 70, 3) + circ(80, 30, 7) + circ(90, 24, 5) + hole(30, 44, 8));
def("trans-moto", "Motocicleta", "Transporte", circ(26, 70, 14) + circ(76, 70, 14) + hole(26, 70, 5) + hole(76, 70, 5) + pts([[26, 70], [44, 52], [60, 52], [52, 70]]) + pts([[60, 52], [70, 44], [78, 44], [72, 56]]) + ell(48, 46, 10, 5));
def("trans-bici", "Bicicleta", "Transporte", circ(24, 68, 18) + circ(76, 68, 18) + hole(24, 68, 4) + hole(76, 68, 4) + pts([[22, 66], [26, 66], [44, 44], [40, 44]]) + pts([[40, 44], [44, 44], [64, 42], [60, 42]]) + pts([[62, 42], [66, 42], [76, 64], [72, 64]]) + pts([[44, 44], [48, 44], [38, 24], [34, 24]]) + pts([[30, 24], [42, 24], [42, 30], [30, 30]]) + pts([[24, 66], [28, 66], [46, 26], [42, 26]]));
def("trans-taxi", "Taxi", "Transporte", "M 12 62 L 18 44 C 22 36 30 34 36 34 L 62 34 C 68 34 76 38 80 46 L 86 62 L 86 74 L 12 74 Z" + roundRect(40, 22, 20, 10, 3) + circ(28, 74, 9) + circ(70, 74, 9) + hole(28, 74, 4) + hole(70, 74, 4) + hole(50, 48, 8));
def("trans-globo", "Globo aerostático", "Transporte", "M 50 8 C 72 8 88 28 88 48 C 88 66 70 78 50 78 C 30 78 12 66 12 48 C 12 28 28 8 50 8 Z" + pts([[50, 12], [56, 34], [44, 34]]) + pts([[44, 40], [56, 40], [54, 78], [46, 78]]) + roundRect(38, 78, 24, 14, 4));

/* ------------------------------- Tecnología (10) ----------------------------- */
def("tec-celular", "Smartphone", "Tecnología", roundRect(30, 6, 40, 88, 8) + holeRR(35, 18, 30, 60, 3) + pts([[46, 12], [54, 12], [54, 14], [46, 14]]) + circ(50, 86, 4));
def("tec-laptop", "Laptop", "Tecnología", roundRect(22, 14, 56, 40, 4) + holeRR(27, 19, 46, 30, 2) + pts([[14, 54], [86, 54], [90, 66], [10, 66]]));
def("tec-monitor", "Monitor", "Tecnología", roundRect(12, 12, 76, 52, 6) + holeRR(18, 18, 64, 40, 3) + pts([[44, 64], [56, 64], [58, 82], [42, 82]]) + roundRect(30, 82, 40, 8, 3));
def("tec-teclado", "Teclado", "Tecnología", roundRect(8, 28, 84, 44, 6) + holeRR(14, 34, 10, 8, 2) + holeRR(28, 34, 10, 8, 2) + holeRR(42, 34, 10, 8, 2) + holeRR(56, 34, 10, 8, 2) + holeRR(70, 34, 10, 8, 2) + holeRR(22, 48, 56, 16, 3));
def("tec-mouse", "Mouse", "Tecnología", "M 50 12 C 68 12 80 30 80 52 C 80 74 66 88 50 88 C 34 88 20 74 20 52 C 20 30 32 12 50 12 Z" + pts([[47, 14], [53, 14], [52, 40], [48, 40]]));
def("tec-camara", "Cámara", "Tecnología", roundRect(10, 26, 80, 52, 8) + pts([[34, 26], [40, 14], [60, 14], [66, 26]]) + circ(50, 52, 18) + hole(50, 52, 12) + circ(74, 36, 4));
def("tec-control", "Control de videojuegos", "Tecnología", "M 22 30 C 14 30 8 42 8 56 C 8 74 18 88 32 88 C 42 88 46 80 50 74 C 54 80 58 88 68 88 C 82 88 92 74 92 56 C 92 42 86 30 78 30 Z" + circ(30, 52, 6) + hole(30, 52, 2.5) + circ(70, 52, 6) + hole(70, 52, 2.5) + pts([[60, 46], [66, 46], [63, 40]]) + pts([[60, 58], [66, 58], [63, 64]]));
def("tec-robot", "Cabeza de robot", "Tecnología", roundRect(24, 24, 52, 48, 10) + holeRR(32, 34, 14, 12, 4) + holeRR(54, 34, 14, 12, 4) + pts([[46, 58], [54, 58], [52, 66], [48, 66]]) + pts([[48, 24], [52, 24], [51, 12], [49, 12]]) + circ(50, 8, 4) + roundRect(16, 40, 8, 16, 4) + roundRect(76, 40, 8, 16, 4));
def("tec-chip", "Chip", "Tecnología", roundRect(26, 26, 48, 48, 6) + hole(50, 50, 12) + pts([[34, 26], [39, 26], [39, 16], [34, 16]]) + pts([[46, 26], [51, 26], [51, 16], [46, 16]]) + pts([[58, 26], [63, 26], [63, 16], [58, 16]]) + pts([[34, 74], [39, 74], [39, 84], [34, 84]]) + pts([[46, 74], [51, 74], [51, 84], [46, 84]]) + pts([[58, 74], [63, 74], [63, 84], [58, 84]]) + pts([[26, 34], [26, 39], [16, 39], [16, 34]]) + pts([[26, 46], [26, 51], [16, 51], [16, 46]]) + pts([[26, 58], [26, 63], [16, 63], [16, 58]]) + pts([[74, 34], [74, 39], [84, 39], [84, 34]]) + pts([[74, 46], [74, 51], [84, 51], [84, 46]]) + pts([[74, 58], [74, 63], [84, 63], [84, 58]]));
def("tec-enchufe", "Enchufe", "Tecnología", roundRect(26, 40, 48, 44, 8) + pts([[36, 40], [42, 40], [42, 20], [36, 20]]) + pts([[58, 40], [64, 40], [64, 20], [58, 20]]) + circ(50, 74, 6));

/* -------------------------------- Símbolos (12) ------------------------------ */
def("sim-corazon", "Corazón", "Símbolos", "M 50 88 C 20 66 8 48 8 34 C 8 18 20 10 32 10 C 41 10 47 16 50 22 C 53 16 59 10 68 10 C 80 10 92 18 92 34 C 92 48 80 66 50 88 Z");
def("sim-sonrisa", "Carita feliz", "Símbolos", circ(50, 50, 44) + hole(34, 40, 6) + hole(66, 40, 6) + arcRing(50, 50, 34, 27, 30, 150));
def("sim-corona", "Corona", "Símbolos", pts([[10, 78], [10, 26], [28, 46], [50, 18], [72, 46], [90, 26], [90, 78]]) + hole(30, 66, 5) + hole(50, 66, 5) + hole(70, 66, 5));
def("sim-llave", "Llave", "Símbolos", ring(34, 34, 22, 10) + pts([[38, 44], [46, 38], [82, 74], [74, 80]]) + pts([[62, 62], [74, 50], [82, 58], [70, 70]]) + pts([[70, 70], [82, 58], [88, 64], [76, 76]]));
def("sim-candado", "Candado", "Símbolos", arcRing(50, 34, 22, 15, 180, 360) + roundRect(24, 40, 52, 46, 8) + hole(50, 62, 8) + pts([[47, 62], [53, 62], [52, 74], [48, 74]]));
def("sim-bombilla", "Bombilla", "Símbolos", circ(50, 38, 24) + pts([[40, 56], [60, 56], [58, 72], [42, 72]]) + pts([[42, 74], [58, 74], [57, 82], [43, 82]]) + pts([[43, 84], [57, 84], [56, 92], [44, 92]]) + hole(50, 36, 9));
def("sim-lupa", "Lupa", "Símbolos", ring(42, 42, 30, 20) + pts([[62, 62], [86, 86], [78, 94], [54, 70]]));
def("sim-reloj", "Reloj", "Símbolos", circ(50, 50, 42) + hole(50, 50, 34) + pts([[48, 50], [52, 50], [52, 26], [48, 26]]) + pts([[48, 50], [52, 50], [64, 54], [64, 58]]));
def("sim-infinito", "Infinito", "Símbolos", ring(34, 50, 18, 10) + ring(66, 50, 18, 10));
def("sim-marcapaginas", "Marcapáginas", "Símbolos", pts([[30, 8], [70, 8], [70, 92], [50, 76], [30, 92]]) + hole(50, 34, 8));
def("sim-paz", "Paz", "Símbolos", circ(50, 50, 44) + pts([[48, 6], [52, 6], [52, 94], [48, 94]]) + pts([[50, 50], [20, 74], [16, 70], [46, 48]]) + pts([[50, 50], [80, 74], [84, 70], [54, 48]]));
def("sim-yinyang", "Yin yang", "Símbolos", circ(50, 50, 44) + arcRing(50, 28, 22, 15, 180, 360) + arcRing(50, 72, 22, 15, 0, 180) + hole(50, 22, 7) + hole(50, 78, 7));

/* -------------------------------- Fantasía (12) ------------------------------ */
def("fan-unicornio", "Unicornio", "Fantasía", "M 26 90 C 20 60 26 34 46 26 L 42 4 L 54 16 L 62 2 L 68 18 C 80 26 86 42 82 58 L 78 90 Z" + hole(64, 46, 3.5) + pts([[74, 30], [88, 22], [84, 40]]) + pts([[50, 40], [44, 62], [52, 60]]));
def("fan-castillo", "Castillo", "Fantasía", pts([[12, 90], [12, 40], [24, 40], [24, 28], [36, 28], [36, 40], [64, 40], [64, 28], [76, 28], [76, 40], [88, 40], [88, 90]]) + pts([[42, 90], [42, 58], [58, 58], [58, 90]]) + hole(50, 74, 7));
def("fan-sombrero-mago", "Sombrero de mago", "Fantasía", "M 50 6 C 56 30 74 52 88 58 L 12 58 C 26 52 44 30 50 6 Z" + "M 6 58 L 94 58 L 94 68 C 94 74 88 78 82 78 L 18 78 C 12 78 6 74 6 68 Z" + circ(66, 20, 4) + circ(78, 34, 3) + circ(60, 38, 2.5));
def("fan-pocion", "Poción", "Fantasía", "M 34 34 L 34 22 L 66 22 L 66 34 C 78 44 84 58 84 70 C 84 84 70 92 50 92 C 30 92 16 84 16 70 C 16 58 22 44 34 34 Z" + roundRect(36, 12, 28, 12, 4) + hole(50, 66, 10));
def("fan-varita", "Varita mágica", "Fantasía", pts([[46, 92], [54, 92], [70, 30], [62, 28]]) + pts([[64, 22], [76, 10], [82, 16], [70, 28]]) + circ(66, 14, 6));
def("fan-fantasma", "Fantasma", "Fantasía", "M 24 84 L 24 44 A 26 26 0 0 1 76 44 L 76 84 L 66 76 L 58 84 L 50 76 L 42 84 L 34 76 Z" + hole(40, 46, 4.5) + hole(60, 46, 4.5));
def("fan-alien", "Alien", "Fantasía", "M 50 8 C 72 8 86 28 86 50 C 86 74 70 90 50 90 C 30 90 14 74 14 50 C 14 28 28 8 50 8 Z" + ell(36, 46, 9, 12, -18) + ell(64, 46, 9, 12, 18) + hole(36, 46, 3) + hole(64, 46, 3));
def("fan-dragon", "Dragón", "Fantasía", "M 20 88 L 22 56 C 24 40 34 28 48 24 L 44 10 L 54 20 L 62 12 L 66 26 C 78 32 84 46 82 60 L 78 88 Z" + pts([[70, 40], [94, 30], [88, 52]]) + hole(58, 40, 3.5) + pts([[46, 60], [40, 74], [50, 70]]));
def("fan-diamante", "Diamante", "Fantasía", pts([[50, 6], [82, 34], [50, 94], [18, 34]]) + pts([[18, 34], [82, 34], [74, 26], [26, 26]]));
def("fan-alas", "Alas de hada", "Fantasía", "M 50 90 L 50 40 C 40 20 20 14 8 22 C 16 36 22 52 26 66 C 34 62 44 66 50 76 Z M 50 40 C 60 20 80 14 92 22 C 84 36 78 52 74 66 C 66 62 56 66 50 76 Z");
def("fan-estrella-fugaz", "Estrella fugaz", "Fantasía", pts(starPts(64, 36, 5, 26, 0.45)) + pts([[24, 76], [50, 58], [54, 62], [28, 80]]));
def("fan-calavera", "Calavera", "Fantasía", "M 50 6 C 72 6 86 22 86 42 C 86 56 78 64 74 70 L 74 82 L 26 82 L 26 70 C 22 64 14 56 14 42 C 14 22 28 6 50 6 Z" + hole(38, 40, 7) + hole(62, 40, 7) + hole(50, 58, 5) + pts([[44, 82], [44, 92], [48, 92], [48, 82]]) + pts([[52, 82], [52, 92], [56, 92], [56, 82]]));

/* ------------------------------- Mecanizado (30) ----------------------------- */
def("mec-engranaje-8", "Engranaje 8 dientes", "Mecanizado", gear(50, 50, 8, 46, 36, 12));
def("mec-engranaje-12", "Engranaje 12 dientes", "Mecanizado", gear(50, 50, 12, 46, 37, 13));
def("mec-engranaje-16", "Engranaje 16 dientes", "Mecanizado", gear(50, 50, 16, 46, 38, 14));
def("mec-engranaje-20", "Engranaje 20 dientes", "Mecanizado", gear(50, 50, 20, 46, 39, 15));
def("mec-tuerca", "Tuerca hexagonal", "Mecanizado", pts(poly(50, 52, 44, 6)) + hole(50, 52, 20));
def("mec-perno", "Perno hexagonal", "Mecanizado", pts(poly(50, 22, 24, 6)) + pts([[42, 40], [58, 40], [58, 88], [42, 88]]) + pts([[42, 60], [58, 60], [58, 66], [42, 66]]) + hole(50, 22, 9));
def("mec-tuerca-mariposa", "Tuerca de mariposa", "Mecanizado", pts(poly(50, 50, 22, 6)) + ell(16, 50, 14, 9) + ell(84, 50, 14, 9) + hole(50, 50, 9));
def("mec-arandela", "Arandela plana", "Mecanizado", ring(50, 50, 42, 24));
def("mec-arandela-presion", "Arandela de presión", "Mecanizado", arcRing(50, 52, 42, 26, 300, 600));
def("mec-allen", "Llave Allen", "Mecanizado", pts([[30, 8], [44, 8], [44, 62], [76, 88], [68, 98], [30, 68]]));
def("mec-espanola", "Llave española", "Mecanizado", pts([[16, 40], [32, 40], [78, 86], [66, 94]]) + arcRing(20, 30, 20, 11, 255, 555));
def("mec-stilson", "Llave stilson", "Mecanizado", pts([[18, 30], [34, 30], [76, 84], [64, 94]]) + arcRing(16, 26, 20, 12, 200, 560) + roundRect(58, 60, 14, 14, 4));
def("mec-brida", "Brida", "Mecanizado", ring(50, 50, 44, 16) + hole(50, 50, 10) + hole(30, 30, 6) + hole(70, 30, 6) + hole(30, 70, 6) + hole(70, 70, 6));
def("mec-acoplamiento", "Acoplamiento", "Mecanizado", roundRect(24, 16, 52, 68, 8) + holeRR(32, 24, 36, 52, 6) + hole(50, 30, 4) + hole(50, 70, 4));
def("mec-piston", "Pistón", "Mecanizado", pts([[34, 10], [66, 10], [66, 34], [34, 34]]) + pts([[36, 34], [64, 34], [60, 78], [40, 78]]) + hole(50, 22, 7));
def("mec-arbol-levas", "Árbol de levas", "Mecanizado", pts([[46, 8], [54, 8], [54, 92], [46, 92]]) + ell(70, 26, 16, 12) + ell(28, 50, 14, 11) + ell(72, 74, 15, 11));
def("mec-valvula", "Válvula", "Mecanizado", pts([[46, 8], [54, 8], [54, 56], [46, 56]]) + pts([[28, 56], [72, 56], [72, 70], [28, 70]]) + pts([[32, 70], [68, 70], [60, 86], [40, 86]]));
def("mec-resorte", "Resorte", "Mecanizado", springPath(20, 80, 50, 4, 12, 5) + pts([[14, 40], [86, 40], [86, 48], [14, 48]]) + pts([[14, 56], [86, 56], [86, 64], [14, 64]]));
def("mec-bobina", "Bobina de hilo", "Mecanizado", ring(50, 52, 40, 14) + hole(50, 52, 8) + ring(50, 52, 30, 26));
def("mec-broca", "Broca", "Mecanizado", pts([[42, 8], [58, 8], [58, 56], [42, 56]]) + pts([[42, 56], [58, 56], [54, 78], [50, 92], [46, 78]]) + pts([[44, 60], [44, 74], [48, 72], [48, 60]]) + pts([[56, 60], [56, 74], [52, 72], [52, 60]]));
def("mec-fresa", "Fresa", "Mecanizado", roundRect(38, 8, 24, 30, 4) + pts([[38, 38], [62, 38], [62, 76], [38, 76]]) + pts([[38, 44], [34, 76], [44, 76], [44, 44]]) + pts([[62, 44], [66, 76], [56, 76], [56, 44]]) + hole(50, 20, 6));
def("mec-machuelo", "Machuelo", "Mecanizado", pts([[34, 8], [66, 8], [66, 16], [34, 16]]) + pts([[44, 16], [56, 16], [56, 40], [44, 40]]) + pts([[42, 40], [58, 40], [58, 78], [42, 78]]) + pts([[42, 52], [58, 52], [58, 58], [42, 58]]) + pts([[42, 66], [58, 66], [58, 72], [42, 72]]));
def("mec-husillo", "Husillo CNC", "Mecanizado", pts([[30, 20], [70, 20], [70, 80], [30, 80]]) + pts([[30, 30], [70, 30], [70, 36], [30, 36]]) + pts([[30, 46], [70, 46], [70, 52], [30, 52]]) + pts([[30, 62], [70, 62], [70, 68], [30, 68]]) + pts([[30, 78], [70, 78], [70, 84], [30, 84]]));
def("mec-plato-3-garras", "Plato de 3 garras", "Mecanizado", circ(50, 50, 44) + hole(50, 50, 12) + hole(50, 22, 8) + hole(24, 66, 8) + hole(76, 66, 8));
def("mec-calibrador", "Calibrador", "Mecanizado", pts([[20, 20], [28, 20], [28, 60], [20, 60]]) + pts([[20, 30], [80, 30], [80, 38], [20, 38]]) + pts([[72, 20], [88, 20], [88, 66], [72, 66]]) + roundRect(66, 66, 22, 20, 4));
def("mec-micrometro", "Micrómetro", "Mecanizado", pts([[16, 40], [84, 40], [84, 52], [16, 52]]) + roundRect(16, 28, 22, 36, 5) + roundRect(58, 30, 20, 26, 4) + pts([[84, 44], [94, 40], [94, 52], [84, 48]]));
def("mec-rodamiento", "Rodamiento", "Mecanizado", circ(50, 50, 44) + hole(50, 50, 18) + hole(50, 19, 6) + hole(24, 31, 6) + hole(24, 69, 6) + hole(50, 81, 6) + hole(76, 69, 6) + hole(76, 31, 6) + hole(34, 24, 6) + hole(66, 76, 6));
def("mec-eslabon", "Eslabón de cadena", "Mecanizado", pts([...stadiumPts(50, 50, 34, 26), ...stadiumPts(50, 50, 22, 20).reverse()]));
def("mec-remache", "Remache", "Mecanizado", "M 22 44 A 28 22 0 0 1 78 44 Z" + pts([[38, 44], [62, 44], [58, 84], [42, 84]]) + hole(50, 66, 6));
def("mec-pinon", "Piñón", "Mecanizado", gear(50, 50, 12, 46, 37, 16) + hole(50, 30, 5) + hole(28, 58, 5) + hole(72, 58, 5));

export const SHAPES: ShapeDef[] = defs;

export const CATEGORIES: string[] = SHAPES.reduce<string[]>((acc, s) => {
  if (!acc.includes(s.category)) acc.push(s.category);
  return acc;
}, []);

export const SHAPE_MAP: Record<string, ShapeDef> = SHAPES.reduce<Record<string, ShapeDef>>((acc, s) => {
  acc[s.id] = s;
  return acc;
}, {});
