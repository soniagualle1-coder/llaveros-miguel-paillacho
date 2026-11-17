export type SmallShape = {
  id: string;
  color: string;
};

export type SurfaceMaterial =
  | "madera"
  | "nogal"
  | "color"
  | "metal-oro"
  | "metal-plata"
  | "marmol";

export type EngraveStyle = "grabado" | "color";

export type SurfacePattern =
  | "ninguno"
  | "huellitas"
  | "corazones"
  | "estrellitas"
  | "lunares"
  | "borde-doble"
  | "costura"
  | "destellos";

export type KeychainBaseMode = "superficie" | "nombre" | "placa";

export type OrderKind = "individual" | "mascota" | "duo";

export type PaymentMethod = "pichincha" | "deuna" | "debito";

export type KeychainDesign = {
  base: KeychainBaseMode;
  surfaceMaterial: SurfaceMaterial;
  engraveStyle: EngraveStyle;
  pattern: SurfacePattern;
  text: string;
  backText: string;
  font: string;
  textColor: string;
  textScale: number;
  shapeId: string | null;
  shapeColor: string;
  nameOutline: boolean;
  smallShapes: SmallShape[];
  image: string;
  drawing: string;
  size: "S" | "M" | "L";
  chain: boolean;
  orderKind?: OrderKind;
  petDesignId?: number | null;
  petDesignTitle?: string;
  duoName?: string;
  duoPartner?: Omit<KeychainDesign, "duoPartner"> | null;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pichincha: "Depósito / Transf. Banco Pichincha",
  deuna: "Deuna (Banco Pichincha)",
  debito: "Tarjeta de Débito",
};

export const DEFAULT_DESIGN: KeychainDesign = {
  base: "superficie",
  surfaceMaterial: "madera",
  engraveStyle: "grabado",
  pattern: "ninguno",
  text: "Miguel",
  backText: "",
  font: "Poppins",
  textColor: "#3b1f0b",
  textScale: 1,
  shapeId: "geo-placa-clasica",
  shapeColor: "#e11d48",
  nameOutline: true,
  smallShapes: [{ id: "sim-corazon", color: "#e11d48" }],
  image: "",
  drawing: "",
  size: "M",
  chain: false,
  orderKind: "individual",
  petDesignId: null,
  petDesignTitle: "",
  duoName: "",
  duoPartner: null,
  paymentMethod: "pichincha",
  paymentReference: "",
};

export function normalizeDesign(raw: Partial<KeychainDesign> | null | undefined): KeychainDesign {
  const src = raw && typeof raw === "object" ? raw : {};
  const rawBase = src.base;
  const base: KeychainBaseMode =
    rawBase === "nombre" ? "nombre" : "superficie";

  const validMaterials: SurfaceMaterial[] = [
    "madera",
    "nogal",
    "color",
    "metal-oro",
    "metal-plata",
    "marmol",
  ];
  const surfaceMaterial: SurfaceMaterial = validMaterials.includes(src.surfaceMaterial as SurfaceMaterial)
    ? (src.surfaceMaterial as SurfaceMaterial)
    : "madera";

  const engraveStyle: EngraveStyle = src.engraveStyle === "color" ? "color" : "grabado";

  const validPatterns: SurfacePattern[] = [
    "ninguno",
    "huellitas",
    "corazones",
    "estrellitas",
    "lunares",
    "borde-doble",
    "costura",
    "destellos",
  ];
  const pattern: SurfacePattern = validPatterns.includes(src.pattern as SurfacePattern)
    ? (src.pattern as SurfacePattern)
    : "ninguno";

  const size: "S" | "M" | "L" = src.size === "S" || src.size === "M" || src.size === "L" ? src.size : "M";

  const smallShapes: SmallShape[] = Array.isArray(src.smallShapes)
    ? src.smallShapes
        .slice(0, 8)
        .filter((s) => s && typeof s === "object" && typeof s.id === "string")
        .map((s) => ({
          id: s.id === "geo-corazon" ? "sim-corazon" : String(s.id),
          color: typeof s.color === "string" && s.color ? s.color : "#f59e0b",
        }))
    : [];

  let duoPartner: Omit<KeychainDesign, "duoPartner"> | null = null;
  if (src.duoPartner && typeof src.duoPartner === "object") {
    const partnerNormalized = normalizeDesign({ ...src.duoPartner, duoPartner: null });
    const { duoPartner: _unused, ...rest } = partnerNormalized;
    void _unused;
    duoPartner = rest;
  }

  const validPayments: PaymentMethod[] = ["pichincha", "deuna", "debito"];
  const paymentMethod: PaymentMethod = validPayments.includes(src.paymentMethod as PaymentMethod)
    ? (src.paymentMethod as PaymentMethod)
    : "pichincha";

  return {
    base,
    surfaceMaterial,
    engraveStyle,
    pattern,
    text: typeof src.text === "string" ? src.text.slice(0, 40) : "",
    backText: typeof src.backText === "string" ? src.backText.slice(0, 60) : "",
    font: typeof src.font === "string" && src.font ? src.font : "Poppins",
    textColor: typeof src.textColor === "string" && src.textColor ? src.textColor : "#3b1f0b",
    textScale:
      typeof src.textScale === "number" && Number.isFinite(src.textScale)
        ? Math.max(0.5, Math.min(1.6, src.textScale))
        : 1,
    shapeId: src.shapeId === null ? null : typeof src.shapeId === "string" ? src.shapeId : "geo-placa-clasica",
    shapeColor: typeof src.shapeColor === "string" && src.shapeColor ? src.shapeColor : "#e11d48",
    nameOutline: typeof src.nameOutline === "boolean" ? src.nameOutline : true,
    smallShapes,
    image: typeof src.image === "string" ? src.image : "",
    drawing: typeof src.drawing === "string" ? src.drawing : "",
    size,
    chain: Boolean(src.chain),
    orderKind:
      src.orderKind === "duo" || src.orderKind === "mascota" || src.orderKind === "individual"
        ? src.orderKind
        : duoPartner
          ? "duo"
          : "individual",
    petDesignId: typeof src.petDesignId === "number" ? src.petDesignId : null,
    petDesignTitle: typeof src.petDesignTitle === "string" ? src.petDesignTitle.slice(0, 120) : "",
    duoName: typeof src.duoName === "string" ? src.duoName.slice(0, 80) : "",
    duoPartner,
    paymentMethod,
    paymentReference: typeof src.paymentReference === "string" ? src.paymentReference.slice(0, 80) : "",
  };
}
