import type {
  EngraveStyle,
  KeychainDesign,
  SmallShape,
  SurfaceMaterial,
  SurfacePattern,
} from "./types";

export const PET_TOTAL_DESIGNS = 10_000;

export type PetGroup =
  | "Todos"
  | "Perros"
  | "Gatos"
  | "Huellas y Placas"
  | "Conejos y Ositos"
  | "Aves y Jardín"
  | "Acuáticos"
  | "Caballos y VIP";

export const PET_GROUPS: PetGroup[] = [
  "Todos",
  "Perros",
  "Gatos",
  "Huellas y Placas",
  "Conejos y Ositos",
  "Aves y Jardín",
  "Acuáticos",
  "Caballos y VIP",
];

type PetSpecies = {
  shapeId: string;
  label: string;
  breedTag: string;
  group: Exclude<PetGroup, "Todos">;
  sampleName: string;
  emoji: string;
};

// 25 siluetas y estilos de mascotas
const PET_SPECIES: PetSpecies[] = [
  { shapeId: "ani-perro", label: "Perrito Fiel", breedTag: "Golden", group: "Perros", sampleName: "Max", emoji: "🐶" },
  { shapeId: "ani-hueso", label: "Huesito Clásico", breedTag: "Collar Dog", group: "Perros", sampleName: "Toby", emoji: "🦴" },
  { shapeId: "ani-perro", label: "Cachorro Alegre", breedTag: "Pug & Frenchie", group: "Perros", sampleName: "Rocky", emoji: "🐕" },
  { shapeId: "ani-zorro", label: "Lomito Husky", breedTag: "Husky & Shiba", group: "Perros", sampleName: "Thor", emoji: "🐺" },
  { shapeId: "ani-hueso", label: "Huesito Guardián", breedTag: "Pastor & Lab", group: "Perros", sampleName: "Bruno", emoji: "🦴" },

  { shapeId: "ani-gato", label: "Gatito Bigotes", breedTag: "Michi Clásico", group: "Gatos", sampleName: "Luna", emoji: "🐱" },
  { shapeId: "ani-gato", label: "Minino Real", breedTag: "Siamés & Persa", group: "Gatos", sampleName: "Mía", emoji: "🐈" },
  { shapeId: "ani-gato", label: "Michi Travieso", breedTag: "Atigrado", group: "Gatos", sampleName: "Simba", emoji: "😺" },

  { shapeId: "ani-huella", label: "Huellita Tierna", breedTag: "Patita Amor", group: "Huellas y Placas", sampleName: "Coco", emoji: "🐾" },
  { shapeId: "sim-corazon", label: "Corazón Mascota", breedTag: "Amor Peludo", group: "Huellas y Placas", sampleName: "Nala", emoji: "💖" },
  { shapeId: "geo-circulo", label: "Medalla Collar", breedTag: "Placa Redonda", group: "Huellas y Placas", sampleName: "Kira", emoji: "🏅" },
  { shapeId: "geo-escudo", label: "Escudo Protector", breedTag: "Placa ID", group: "Huellas y Placas", sampleName: "Zeus", emoji: "🛡️" },
  { shapeId: "geo-placa-clasica", label: "Placa Identidad", breedTag: "Grabado Fino", group: "Huellas y Placas", sampleName: "Lola", emoji: "🏷️" },

  { shapeId: "ani-conejo", label: "Conejito Orejón", breedTag: "Mini Lop", group: "Conejos y Ositos", sampleName: "Copito", emoji: "🐰" },
  { shapeId: "ani-oso", label: "Hámster Peluche", breedTag: "Teddy Pet", group: "Conejos y Ositos", sampleName: "Canela", emoji: "🐹" },
  { shapeId: "ani-panda", label: "Pandita Dulce", breedTag: "Manchitas", group: "Conejos y Ositos", sampleName: "Oreo", emoji: "🐼" },
  { shapeId: "ani-zorro", label: "Zorrito Mimado", breedTag: "Pomerania", group: "Conejos y Ositos", sampleName: "Chispa", emoji: "🦊" },

  { shapeId: "ani-pajaro", label: "Pajarito Cantor", breedTag: "Canario & Loro", group: "Aves y Jardín", sampleName: "Kiwi", emoji: "🐦" },
  { shapeId: "ani-buho", label: "Buhito Sabio", breedTag: "Plumitas", group: "Aves y Jardín", sampleName: "Pipo", emoji: "🦉" },
  { shapeId: "ani-mariposa", label: "Mariposa Collar", breedTag: "Jardín Pet", group: "Aves y Jardín", sampleName: "Bella", emoji: "🦋" },

  { shapeId: "ani-tortuga", label: "Tortuguita Feliz", breedTag: "Caparazón", group: "Acuáticos", sampleName: "Tita", emoji: "🐢" },
  { shapeId: "ani-pez", label: "Pececito Dorado", breedTag: "Betta & Koi", group: "Acuáticos", sampleName: "Nemo", emoji: "🐠" },
  { shapeId: "ani-delfin", label: "Delfín Juguetón", breedTag: "Ola Azul", group: "Acuáticos", sampleName: "Azul", emoji: "🐬" },

  { shapeId: "ani-caballo", label: "Caballito Noble", breedTag: "Corcel", group: "Caballos y VIP", sampleName: "Relámpago", emoji: "🐴" },
  { shapeId: "sim-corona", label: "Corona Príncipe", breedTag: "Mascota VIP", group: "Caballos y VIP", sampleName: "Rey", emoji: "👑" },
];

type PetPalette = {
  name: string;
  surfaceMaterial: SurfaceMaterial;
  shapeColor: string;
  textColor: string;
  accentColor: string;
  engraveStyle: EngraveStyle;
};

// 20 paletas de color y materiales
const PET_PALETTES: PetPalette[] = [
  { name: "Roble Artesanal", surfaceMaterial: "madera", shapeColor: "#c98d4e", textColor: "#3b1d0a", accentColor: "#b91c1c", engraveStyle: "grabado" },
  { name: "Nogal Imperial", surfaceMaterial: "nogal", shapeColor: "#5c381e", textColor: "#fef3c7", accentColor: "#f59e0b", engraveStyle: "grabado" },
  { name: "Medalla Dorada", surfaceMaterial: "metal-oro", shapeColor: "#d4af37", textColor: "#291805", accentColor: "#7c2d12", engraveStyle: "grabado" },
  { name: "Acero Plateado", surfaceMaterial: "metal-plata", shapeColor: "#cbd5e1", textColor: "#0f172a", accentColor: "#0284c7", engraveStyle: "grabado" },
  { name: "Mármol Perla", surfaceMaterial: "marmol", shapeColor: "#f8fafc", textColor: "#1e293b", accentColor: "#d97706", engraveStyle: "grabado" },
  { name: "Fresa Cremosa", surfaceMaterial: "color", shapeColor: "#f43f5e", textColor: "#ffffff", accentColor: "#fde047", engraveStyle: "color" },
  { name: "Cielo Despejado", surfaceMaterial: "color", shapeColor: "#0ea5e9", textColor: "#ffffff", accentColor: "#fef08a", engraveStyle: "color" },
  { name: "Menta Dulce", surfaceMaterial: "color", shapeColor: "#10b981", textColor: "#ffffff", accentColor: "#fef9c3", engraveStyle: "color" },
  { name: "Sol Radiante", surfaceMaterial: "color", shapeColor: "#f59e0b", textColor: "#1c1917", accentColor: "#ffffff", engraveStyle: "color" },
  { name: "Lavanda Suave", surfaceMaterial: "color", shapeColor: "#8b5cf6", textColor: "#ffffff", accentColor: "#fbcfe8", engraveStyle: "color" },
  { name: "Collar Rojo", surfaceMaterial: "color", shapeColor: "#dc2626", textColor: "#ffffff", accentColor: "#fde68a", engraveStyle: "color" },
  { name: "Rosa Algodón", surfaceMaterial: "color", shapeColor: "#fbcfe8", textColor: "#831843", accentColor: "#db2777", engraveStyle: "color" },
  { name: "Turquesa Caribe", surfaceMaterial: "color", shapeColor: "#14b8a6", textColor: "#ffffff", accentColor: "#fef08a", engraveStyle: "color" },
  { name: "Azul Marino", surfaceMaterial: "color", shapeColor: "#1e3a8a", textColor: "#fef08a", accentColor: "#38bdf8", engraveStyle: "color" },
  { name: "Coral Alegre", surfaceMaterial: "color", shapeColor: "#fb7185", textColor: "#ffffff", accentColor: "#fffbeb", engraveStyle: "color" },
  { name: "Naranja Mandarina", surfaceMaterial: "color", shapeColor: "#ea580c", textColor: "#ffffff", accentColor: "#fef08a", engraveStyle: "color" },
  { name: "Verde Bosque", surfaceMaterial: "color", shapeColor: "#15803d", textColor: "#fef9c3", accentColor: "#86efac", engraveStyle: "color" },
  { name: "Negro Gala", surfaceMaterial: "color", shapeColor: "#18181b", textColor: "#fbbf24", accentColor: "#f43f5e", engraveStyle: "color" },
  { name: "Celeste Bebé", surfaceMaterial: "color", shapeColor: "#bae6fd", textColor: "#0c4a6e", accentColor: "#0284c7", engraveStyle: "color" },
  { name: "Fucsia Vibrante", surfaceMaterial: "color", shapeColor: "#d946ef", textColor: "#ffffff", accentColor: "#fde047", engraveStyle: "color" },
];

type PetEdition = {
  title: string;
  font: string;
  pattern: SurfacePattern;
  charmIds: string[];
};

// 20 ediciones de tipografía + patrón + adornos (25 × 20 × 20 = 10,000 diseños únicos)
const PET_EDITIONS: PetEdition[] = [
  { title: "Edición Huellitas", font: "Fredoka", pattern: "huellitas", charmIds: ["ani-huella", "ani-huella"] },
  { title: "Edición Amor Fiel", font: "Pacifico", pattern: "corazones", charmIds: ["sim-corazon"] },
  { title: "Edición Estelar", font: "Poppins", pattern: "estrellitas", charmIds: ["estrella-5", "estrella-5"] },
  { title: "Edición Clásica", font: "Montserrat", pattern: "borde-doble", charmIds: ["ani-huella"] },
  { title: "Edición Lunares", font: "Quicksand", pattern: "lunares", charmIds: ["sim-corazon", "ani-huella"] },
  { title: "Edición Costura", font: "Comfortaa", pattern: "costura", charmIds: ["ani-hueso"] },
  { title: "Edición Brillante", font: "Righteous", pattern: "destellos", charmIds: ["destello-4", "sim-corazon", "destello-4"] },
  { title: "Edición Realeza", font: "Cinzel", pattern: "borde-doble", charmIds: ["sim-corona"] },
  { title: "Edición Traviesa", font: "Bangers", pattern: "huellitas", charmIds: ["ani-hueso", "estrella-5"] },
  { title: "Edición Ternura", font: "Dancing Script", pattern: "corazones", charmIds: ["sim-corazon", "nat-flor-5", "sim-corazon"] },
  { title: "Edición Aventura", font: "Bebas Neue", pattern: "costura", charmIds: ["nat-montanas", "ani-huella"] },
  { title: "Edición Suerte", font: "Lobster", pattern: "lunares", charmIds: ["nat-trebol"] },
  { title: "Edición Campeón", font: "Russo One", pattern: "estrellitas", charmIds: ["dep-trofeo"] },
  { title: "Edición Primavera", font: "Satisfy", pattern: "destellos", charmIds: ["nat-flor-6", "nat-flor-6"] },
  { title: "Edición Sonrisa", font: "Indie Flower", pattern: "lunares", charmIds: ["sim-sonrisa", "ani-huella"] },
  { title: "Edición Diamante", font: "Playfair Display", pattern: "borde-doble", charmIds: ["fan-diamante"] },
  { title: "Edición Nocturna", font: "Josefin Sans", pattern: "estrellitas", charmIds: ["nat-luna-creciente", "estrella-5"] },
  { title: "Edición Soleada", font: "Caveat", pattern: "huellitas", charmIds: ["nat-sol"] },
  { title: "Edición Dulzura", font: "Nunito", pattern: "corazones", charmIds: ["ani-huella", "sim-corazon", "ani-huella"] },
  { title: "Edición Urbana", font: "Kanit", pattern: "ninguno", charmIds: ["ani-hueso", "ani-huella"] },
];

export type PetDesignItem = {
  id: number; // 1 .. 10000
  code: string; // #0001 .. #10000
  title: string;
  subtitle: string;
  group: Exclude<PetGroup, "Todos">;
  emoji: string;
  shapeId: string;
  surfaceMaterial: SurfaceMaterial;
  engraveStyle: EngraveStyle;
  pattern: SurfacePattern;
  shapeColor: string;
  textColor: string;
  accentColor: string;
  font: string;
  sampleName: string;
  smallShapes: SmallShape[];
};

/**
 * Biyección exacta de 1..10000 a las 25×20×20 = 10,000 combinaciones únicas.
 * 3797 es coprimo con 10000 (no divisible por 2 ni por 5), por lo que jamás se repite un diseño.
 */
export function getPetDesignById(rawId: number): PetDesignItem {
  const id = Math.max(1, Math.min(PET_TOTAL_DESIGNS, Math.floor(rawId) || 1));
  const k = ((id - 1) * 3797 + 1423) % PET_TOTAL_DESIGNS;
  const speciesIdx = k % PET_SPECIES.length; // 0..24
  const paletteIdx = Math.floor(k / 25) % PET_PALETTES.length; // 0..19
  const editionIdx = Math.floor(k / 500) % PET_EDITIONS.length; // 0..19

  const sp = PET_SPECIES[speciesIdx];
  const pal = PET_PALETTES[paletteIdx];
  const ed = PET_EDITIONS[editionIdx];

  const code = `#${String(id).padStart(4, "0")}`;
  const smallShapes: SmallShape[] = ed.charmIds.map((cid, idx) => ({
    id: cid,
    color: idx % 2 === 0 ? pal.accentColor : pal.textColor,
  }));

  return {
    id,
    code,
    title: `${sp.label} · ${pal.name}`,
    subtitle: `${ed.title} · ${sp.breedTag}`,
    group: sp.group,
    emoji: sp.emoji,
    shapeId: sp.shapeId,
    surfaceMaterial: pal.surfaceMaterial,
    engraveStyle: pal.engraveStyle,
    pattern: ed.pattern,
    shapeColor: pal.shapeColor,
    textColor: pal.textColor,
    accentColor: pal.accentColor,
    font: ed.font,
    sampleName: sp.sampleName,
    smallShapes,
  };
}

const groupCache = new Map<PetGroup, number[]>();

export function getPetIdsForGroup(group: PetGroup): number[] {
  const hit = groupCache.get(group);
  if (hit) return hit;
  const list: number[] = [];
  for (let id = 1; id <= PET_TOTAL_DESIGNS; id++) {
    if (group === "Todos" || getPetDesignById(id).group === group) {
      list.push(id);
    }
  }
  groupCache.set(group, list);
  return list;
}

export function pickRandomPetId(group: PetGroup = "Todos", excludeId?: number): number {
  const ids = getPetIdsForGroup(group);
  if (ids.length === 0) return 1;
  if (ids.length === 1) return ids[0];
  let chosen = ids[Math.floor(Math.random() * ids.length)];
  if (chosen === excludeId) {
    chosen = ids[(ids.indexOf(chosen) + 1 + Math.floor(Math.random() * (ids.length - 1))) % ids.length];
  }
  return chosen;
}

export function pickRandomPetBatch(group: PetGroup = "Todos", count = 12): PetDesignItem[] {
  const ids = getPetIdsForGroup(group);
  const picked = new Set<number>();
  const target = Math.min(count, ids.length);
  let guard = 0;
  while (picked.size < target && guard < target * 10) {
    guard++;
    picked.add(ids[Math.floor(Math.random() * ids.length)]);
  }
  return Array.from(picked).map((id) => getPetDesignById(id));
}

export function petDesignToKeychain(
  item: PetDesignItem,
  opts: {
    petName?: string;
    ownerPhone?: string;
    size?: "S" | "M" | "L";
    chain?: boolean;
    existingImage?: string;
  } = {},
): KeychainDesign {
  const cleanName = (opts.petName ?? "").trim();
  const cleanPhone = (opts.ownerPhone ?? "").trim();
  return {
    base: "superficie",
    surfaceMaterial: item.surfaceMaterial,
    engraveStyle: item.engraveStyle,
    pattern: item.pattern,
    text: cleanName || item.sampleName,
    backText: cleanPhone ? `Tel: ${cleanPhone}` : "Mascota amada",
    font: item.font,
    textColor: item.textColor,
    textScale: 1,
    shapeId: item.shapeId,
    shapeColor: item.shapeColor,
    nameOutline: true,
    smallShapes: item.smallShapes,
    image: opts.existingImage ?? "",
    drawing: "",
    size: opts.size ?? "M",
    chain: opts.chain ?? false,
    orderKind: "mascota",
    petDesignId: item.id,
    petDesignTitle: `${item.code} ${item.title}`,
    duoName: "",
    duoPartner: null,
  };
}
