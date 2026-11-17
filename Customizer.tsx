"use client";

import { useEffect, useMemo, useState } from "react";
import Keychain3D from "./Keychain3D";
import ShapePicker from "./ShapePicker";
import DrawingPad from "./DrawingPad";
import DesignPreview from "./DesignPreview";
import { ColorField, ShapeGlyph } from "./ui";
import { CATEGORIES, SHAPES, SHAPE_MAP } from "@/lib/shapes";
import { FONTS } from "@/lib/fonts";
import {
  getPetDesignById,
  getPetIdsForGroup,
  PET_GROUPS,
  PET_TOTAL_DESIGNS,
  petDesignToKeychain,
  pickRandomPetBatch,
  pickRandomPetId,
} from "@/lib/petDesigns";
import type { PetDesignItem, PetGroup } from "@/lib/petDesigns";
import { DUO_PRESETS } from "@/lib/duoPresets";
import type { DuoPreset } from "@/lib/duoPresets";
import { CHAIN_PRICE, SIZE_INFO, UNIT_PRICE, calcTotal, formatMoney } from "@/lib/pricing";
import { DEFAULT_DESIGN } from "@/lib/types";
import type {
  KeychainDesign,
  SurfaceMaterial,
  SurfacePattern,
} from "@/lib/types";

type StudioSection = "personalizar" | "mascotas" | "duo";
type CustomSubTab = "formas" | "texto" | "colores" | "formitas" | "arte" | "extras";

const SURFACE_COLORS = [
  "#e11d48",
  "#f43f5e",
  "#fb7185",
  "#fbcfe8",
  "#ea580c",
  "#f59e0b",
  "#eab308",
  "#16a34a",
  "#10b981",
  "#14b8a6",
  "#0ea5e9",
  "#2563eb",
  "#1e3a8a",
  "#7c3aed",
  "#a855f7",
  "#d946ef",
  "#18181b",
  "#ffffff",
];

const TEXT_COLORS = [
  "#3b1d0a",
  "#111827",
  "#ffffff",
  "#fef08a",
  "#fbbf24",
  "#e11d48",
  "#fbcfe8",
  "#0ea5e9",
  "#1e3a8a",
  "#10b981",
  "#7c3aed",
  "#ea580c",
];

const MATERIALS: Array<{
  id: SurfaceMaterial;
  name: string;
  desc: string;
  swatch: string;
  defaultText: string;
}> = [
  {
    id: "madera",
    name: "Madera Roble",
    desc: "Ideal para grabar",
    swatch: "linear-gradient(135deg,#e7b97e,#ae7137)",
    defaultText: "#3b1d0a",
  },
  {
    id: "nogal",
    name: "Madera Nogal",
    desc: "Grabado elegante",
    swatch: "linear-gradient(135deg,#7c4d2b,#3d2210)",
    defaultText: "#fef3c7",
  },
  {
    id: "color",
    name: "Color Acrílico",
    desc: "Elige tu color",
    swatch: "linear-gradient(135deg,#f43f5e,#f59e0b,#0ea5e9)",
    defaultText: "#ffffff",
  },
  {
    id: "metal-oro",
    name: "Placa Dorada",
    desc: "Brillo metálico",
    swatch: "linear-gradient(135deg,#fceabb,#d4af37,#b88921)",
    defaultText: "#291805",
  },
  {
    id: "metal-plata",
    name: "Acero Plata",
    desc: "Grabado fino",
    swatch: "linear-gradient(135deg,#f8fafc,#cbd5e1,#94a3b8)",
    defaultText: "#0f172a",
  },
  {
    id: "marmol",
    name: "Mármol Perla",
    desc: "Superficie clara",
    swatch: "linear-gradient(135deg,#ffffff,#e2e8f0)",
    defaultText: "#1e293b",
  },
];

const PATTERNS: Array<{ id: SurfacePattern; label: string }> = [
  { id: "ninguno", label: "Liso" },
  { id: "borde-doble", label: "Marco fino" },
  { id: "costura", label: "Costura" },
  { id: "huellitas", label: "Huellitas" },
  { id: "corazones", label: "Corazones" },
  { id: "estrellitas", label: "Estrellitas" },
  { id: "lunares", label: "Lunares" },
  { id: "destellos", label: "Destellos" },
];

function petCardBackground(item: PetDesignItem): string {
  switch (item.surfaceMaterial) {
    case "madera":
      return "linear-gradient(135deg,#e7b97e,#b8793d)";
    case "nogal":
      return "linear-gradient(135deg,#7c4d2b,#3d2210)";
    case "metal-oro":
      return "linear-gradient(135deg,#fceabb,#d4af37)";
    case "metal-plata":
      return "linear-gradient(135deg,#f8fafc,#cbd5e1)";
    case "marmol":
      return "linear-gradient(135deg,#ffffff,#e2e8f0)";
    default:
      return item.shapeColor;
  }
}

function readAndCropPhoto(file: File, onDone: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 420;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const ratio = Math.max(size / Math.max(1, img.width), size / Math.max(1, img.height));
      const w = img.width * ratio;
      const h = img.height * ratio;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      onDone(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

const PET_PAGE_SIZE = 12;

export default function Customizer() {
  // Sección principal activa
  const [section, setSection] = useState<StudioSection>("personalizar");
  const [subTab, setSubTab] = useState<CustomSubTab>("texto");

  // Diseño individual / mascota
  const [design, setDesign] = useState<KeychainDesign>(DEFAULT_DESIGN);
  const [quantity, setQuantity] = useState(1);

  // Estado de Mascotas (10,000 diseños)
  const [petGroup, setPetGroup] = useState<PetGroup>("Todos");
  const [petBrowseMode, setPetBrowseMode] = useState<"aleatorio" | "catalogo">("aleatorio");
  const [selectedPetId, setSelectedPetId] = useState<number>(1);
  const [petName, setPetName] = useState("");
  const [petPhone, setPetPhone] = useState("");
  const [petJumpInput, setPetJumpInput] = useState("1");
  const [petPage, setPetPage] = useState(1);
  const [randomPetBatch, setRandomPetBatch] = useState<PetDesignItem[]>(() =>
    Array.from({ length: 12 }, (_, i) => getPetDesignById(1 + i * 811)),
  );

  // Estado de Crear tu Dúo Favorito (2 llaveros simultáneos)
  const [duoFirst, setDuoFirst] = useState<KeychainDesign>(() => ({
    ...DUO_PRESETS[0].first,
    duoPartner: null,
  }));
  const [duoSecond, setDuoSecond] = useState<KeychainDesign>(() => ({
    ...DUO_PRESETS[0].second,
    duoPartner: null,
  }));
  const [duoLabel, setDuoLabel] = useState<string>(DUO_PRESETS[0].name);
  const [duoSlot, setDuoSlot] = useState<1 | 2>(1);
  const [duoFocus, setDuoFocus] = useState<"both" | "first" | "second">("both");
  const [duoChain, setDuoChain] = useState<boolean>(true);
  const [duoSets, setDuoSets] = useState<number>(1); // 1 dúo = 2 llaveros

  // Filtros de formas y formitas
  const [shapeQuery, setShapeQuery] = useState("");
  const [shapeCategory, setShapeCategory] = useState("Todas");
  const [smallColor, setSmallColor] = useState("#e11d48");
  const [smallCategory, setSmallCategory] = useState("Todas");
  const [pickerTarget, setPickerTarget] = useState<"single" | "duo" | null>(null);

  // Señal de giro para mostrar el reverso 3D
  const [flipSignal, setFlipSignal] = useState<{ side: "front" | "back"; seq: number } | null>(null);

  // Pedido y mensaje
  const [message, setMessage] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const [form, setForm] = useState({ customerName: "", contact: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  // Sincronización con los botones de la barra superior (#personalizar, #mascotas, #duo)
  useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash.toLowerCase();
      if (h === "#mascotas") {
        activatePetSection();
      } else if (h === "#duo") {
        setSection("duo");
        setDuoFocus("both");
      } else if (h === "#personalizar") {
        setSection("personalizar");
      }
    };
    const onCustomNav = (e: Event) => {
      const detail = (e as CustomEvent<StudioSection>).detail;
      if (detail === "mascotas") activatePetSection();
      else if (detail === "duo") {
        setSection("duo");
        setDuoFocus("both");
      } else if (detail === "personalizar") {
        setSection("personalizar");
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    window.addEventListener("mp-studio-section", onCustomNav);
    return () => {
      window.removeEventListener("hashchange", applyHash);
      window.removeEventListener("mp-studio-section", onCustomNav);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function activatePetSection() {
    setSection("mascotas");
    setDesign((prev) => {
      if (prev.orderKind === "mascota" && prev.petDesignId) return prev;
      const item = getPetDesignById(selectedPetId);
      return petDesignToKeychain(item, {
        petName,
        ownerPhone: petPhone,
        size: prev.size,
        chain: prev.chain,
        existingImage: prev.image,
      });
    });
  }

  function applyPetId(id: number, nextName = petName, nextPhone = petPhone) {
    const safeId = Math.max(1, Math.min(PET_TOTAL_DESIGNS, Math.floor(id) || 1));
    const item = getPetDesignById(safeId);
    setSelectedPetId(safeId);
    setPetJumpInput(String(safeId));
    setDesign((prev) =>
      petDesignToKeychain(item, {
        petName: nextName,
        ownerPhone: nextPhone,
        size: prev.size,
        chain: prev.chain,
        existingImage: prev.image,
      }),
    );
    setFlipSignal((f) => ({ side: "front", seq: (f?.seq ?? 0) + 1 }));
  }

  function triggerRandomPet() {
    const nextId = pickRandomPetId(petGroup, selectedPetId);
    applyPetId(nextId);
  }

  function shufflePetGrid() {
    const batch = pickRandomPetBatch(petGroup, PET_PAGE_SIZE);
    setRandomPetBatch(batch);
    setPetBrowseMode("aleatorio");
    if (batch[0]) applyPetId(batch[0].id);
  }

  function applyDuoPreset(preset: DuoPreset) {
    setDuoLabel(preset.name);
    setDuoFirst({ ...preset.first, chain: duoChain, duoPartner: null });
    setDuoSecond({ ...preset.second, chain: duoChain, duoPartner: null });
    setDuoFocus("both");
    setFlipSignal((f) => ({ side: "front", seq: (f?.seq ?? 0) + 1 }));
  }

  function triggerRandomDuo() {
    // Genera un dúo creativo al azar combinando las 200 formas, colores y letras
    const colorPairs: Array<[string, string, string, string]> = [
      ["#e11d48", "#ffffff", "#0ea5e9", "#ffffff"],
      ["#18181b", "#fbbf24", "#be185d", "#fef08a"],
      ["#7c3aed", "#ffffff", "#10b981", "#ffffff"],
      ["#f59e0b", "#1c1917", "#1e3a8a", "#fef08a"],
      ["#ec4899", "#ffffff", "#14b8a6", "#ffffff"],
      ["#dc2626", "#fde047", "#2563eb", "#fde047"],
    ];
    const s1 = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const s2 = Math.random() < 0.45 ? s1 : SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const font = FONTS[Math.floor(Math.random() * FONTS.length)];
    const [bg1, tx1, bg2, tx2] = colorPairs[Math.floor(Math.random() * colorPairs.length)];
    const isNameOnly = Math.random() < 0.22;
    const isWood = !isNameOnly && Math.random() < 0.25;

    setDuoLabel(`Dúo ${s1.name} & ${s2.name}`);
    setDuoFirst((prev) => ({
      ...prev,
      base: isNameOnly ? "nombre" : "superficie",
      surfaceMaterial: isWood ? "madera" : "color",
      engraveStyle: isWood ? "grabado" : "color",
      shapeId: s1.id,
      shapeColor: bg1,
      textColor: isWood ? "#3b1d0a" : tx1,
      font,
      text: prev.text.trim() || "Tú",
      chain: duoChain,
    }));
    setDuoSecond((prev) => ({
      ...prev,
      base: isNameOnly ? "nombre" : "superficie",
      surfaceMaterial: isWood ? "nogal" : "color",
      engraveStyle: isWood ? "grabado" : "color",
      shapeId: s2.id,
      shapeColor: bg2,
      textColor: isWood ? "#fef3c7" : tx2,
      font,
      text: prev.text.trim() || "Yo",
      chain: duoChain,
    }));
    setDuoFocus("both");
  }

  // Helpers de edición para Personalizar
  const patchSingle = (values: Partial<KeychainDesign>) =>
    setDesign((d) => ({ ...d, ...values }));

  const selectShapeSingle = (shapeId: string) => {
    // Cambia inmediatamente a modo superficie con la nueva forma 3D para que el usuario la vea al instante
    setDesign((d) => ({
      ...d,
      base: "superficie",
      shapeId,
    }));
    setFlipSignal((f) => ({ side: "front", seq: (f?.seq ?? 0) + 1 }));
  };

  // Helpers de edición para Dúo
  const activeDuo = duoSlot === 1 ? duoFirst : duoSecond;
  const patchActiveDuo = (values: Partial<KeychainDesign>) => {
    if (duoSlot === 1) setDuoFirst((d) => ({ ...d, ...values }));
    else setDuoSecond((d) => ({ ...d, ...values }));
  };

  const syncDuoStyleToOther = () => {
    const src = duoSlot === 1 ? duoFirst : duoSecond;
    const copy: Partial<KeychainDesign> = {
      base: src.base,
      surfaceMaterial: src.surfaceMaterial,
      engraveStyle: src.engraveStyle,
      pattern: src.pattern,
      font: src.font,
      shapeId: src.shapeId,
      shapeColor: src.shapeColor,
      textColor: src.textColor,
      nameOutline: src.nameOutline,
      size: src.size,
    };
    if (duoSlot === 1) setDuoSecond((d) => ({ ...d, ...copy }));
    else setDuoFirst((d) => ({ ...d, ...copy }));
  };

  // Listas filtradas
  const filteredShapes = useMemo(() => {
    const q = shapeQuery.trim().toLowerCase();
    return SHAPES.filter((s) => {
      const okCat = shapeCategory === "Todas" || s.category === shapeCategory;
      const okQ = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [shapeQuery, shapeCategory]);

  const filteredSmallShapes = useMemo(
    () => SHAPES.filter((s) => smallCategory === "Todas" || s.category === smallCategory),
    [smallCategory],
  );

  const petGroupIds = useMemo(() => getPetIdsForGroup(petGroup), [petGroup]);
  const totalPetPages = Math.max(1, Math.ceil(petGroupIds.length / PET_PAGE_SIZE));
  const safePetPage = Math.min(petPage, totalPetPages);

  const visiblePets = useMemo(() => {
    if (petBrowseMode === "aleatorio") return randomPetBatch;
    const start = (safePetPage - 1) * PET_PAGE_SIZE;
    return petGroupIds.slice(start, start + PET_PAGE_SIZE).map((id) => getPetDesignById(id));
  }, [petBrowseMode, randomPetBatch, petGroupIds, safePetPage]);

  const currentPet = useMemo(() => getPetDesignById(selectedPetId), [selectedPetId]);

  // Cálculo de precio ($2.50 cada llavero siempre)
  const isDuo = section === "duo";
  const effectiveKeychainCount = isDuo ? duoSets * 2 : quantity;
  const effectiveChain = isDuo ? duoChain : design.chain;
  const totalPrice = calcTotal(effectiveKeychainCount, effectiveChain);

  // Diseño que se muestra en el visor 3D (mitad izquierda permanente)
  const livePrimary3D: KeychainDesign = useMemo(
    () => (isDuo ? { ...duoFirst, chain: duoChain, orderKind: "duo" } : design),
    [isDuo, duoFirst, duoChain, design],
  );
  const livePartner3D: KeychainDesign | null = useMemo(
    () => (isDuo ? { ...duoSecond, chain: duoChain, orderKind: "duo" } : null),
    [isDuo, duoSecond, duoChain],
  );

  async function submitOrder() {
    setSubmitting(true);
    setOrderError("");
    try {
      let payloadDesign: KeychainDesign;
      if (isDuo) {
        const { duoPartner: _unused, ...cleanPartner } = duoSecond;
        void _unused;
        payloadDesign = {
          ...duoFirst,
          chain: duoChain,
          orderKind: "duo",
          duoName: duoLabel || "Dúo Personalizado",
          duoPartner: { ...cleanPartner, chain: duoChain, orderKind: "duo" },
        };
      } else {
        payloadDesign = {
          ...design,
          orderKind: section === "mascotas" ? "mascota" : design.orderKind === "mascota" ? "mascota" : "individual",
          duoPartner: null,
        };
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          contact: form.contact.trim(),
          address: form.address.trim(),
          quantity: effectiveKeychainCount,
          message: message.trim(),
          design: payloadDesign,
        }),
      });
      const data = (await res.json()) as { id?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo registrar el pedido");
      setCreatedOrderId(data.id ?? null);
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : "Ocurrió un error al enviar tu pedido");
    } finally {
      setSubmitting(false);
    }
  }

  function finishAndCreateAnother() {
    setCreatedOrderId(null);
    setOrderError("");
    setOrderOpen(false);
    setMessage("");
  }

  const currentShapeInfo = design.shapeId ? SHAPE_MAP[design.shapeId] : SHAPE_MAP["geo-placa-clasica"];
  const currentDuoShape = activeDuo.shapeId ? SHAPE_MAP[activeDuo.shapeId] : SHAPE_MAP["geo-placa-clasica"];

  return (
    <div className="flex h-[calc(100dvh-56px)] w-full flex-col overflow-hidden bg-stone-50 md:grid md:grid-cols-2">
      {/* ========================================================================
          MITAD IZQUIERDA (50% EXACTO SIEMPRE VISIBLE): ESCENARIO 3D EN VIVO
      ======================================================================== */}
      <aside className="relative h-[44dvh] w-full shrink-0 border-b border-amber-900/10 md:h-full md:border-b-0 md:border-r">
        <Keychain3D
          design={livePrimary3D}
          partnerDesign={livePartner3D}
          duoFocus={duoFocus}
          onDuoFocusChange={setDuoFocus}
          flipSignal={flipSignal}
          priceLabel={formatMoney(totalPrice)}
          onOrderClick={() => {
            setCreatedOrderId(null);
            setOrderError("");
            setOrderOpen(true);
          }}
        />
      </aside>

      {/* ========================================================================
          MITAD DERECHA (50% EXACTO): DISEÑOS, FORMAS, COLORES, 10,000 MASCOTAS Y DÚO
      ======================================================================== */}
      <div className="flex min-h-0 flex-1 flex-col bg-white md:h-full">
        {/* Pestañas principales fijas arriba */}
        <div className="shrink-0 border-b border-stone-200 bg-white px-3 pt-2.5 pb-2 sm:px-5">
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setSection("personalizar")}
              className={`rounded-xl px-2 py-2 text-xs font-extrabold transition sm:text-sm ${
                section === "personalizar"
                  ? "bg-white text-stone-950 shadow-sm ring-1 ring-amber-400/60"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              ✨ Personalizar
            </button>
            <button
              type="button"
              onClick={activatePetSection}
              className={`rounded-xl px-2 py-2 text-xs font-extrabold transition sm:text-sm ${
                section === "mascotas"
                  ? "bg-white text-stone-950 shadow-sm ring-1 ring-amber-400/60"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              🐾 Mascotas <span className="hidden sm:inline">10,000</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSection("duo");
                setDuoFocus("both");
              }}
              className={`rounded-xl px-2 py-2 text-xs font-extrabold transition sm:text-sm ${
                section === "duo"
                  ? "bg-white text-stone-950 shadow-sm ring-1 ring-amber-400/60"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              💞 Crear Dúo
            </button>
          </div>
        </div>

        {/* Contenido desplazable de diseños y colores */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-4 sm:px-5">
          {/* ====================================================================
              SECCIÓN 1: PERSONALIZAR LLAVERO (SOLO NOMBRE O SUPERFICIE GRABADA)
          ==================================================================== */}
          {section === "personalizar" && (
            <div className="space-y-4">
              {/* Selector claro de los 2 tipos de llavero pedidos */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    patchSingle({
                      base: "superficie",
                      orderKind: "individual",
                      petDesignId: null,
                      shapeId: design.shapeId || "geo-placa-clasica",
                    });
                    setFlipSignal((f) => ({ side: "front", seq: (f?.seq ?? 0) + 1 }));
                  }}
                  className={`rounded-2xl border-2 p-3 text-left transition ${
                    design.base !== "nombre"
                      ? "border-amber-500 bg-amber-50/80 shadow-sm"
                      : "border-stone-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">🪵</span>
                    {design.base !== "nombre" && (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-black text-stone-900 sm:text-sm">
                    Superficie para Grabar
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
                    Placa o cualquiera de las 200 formas con tu nombre grabado
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    patchSingle({
                      base: "nombre",
                      orderKind: "individual",
                      petDesignId: null,
                      text: design.text.trim() || "Miguel",
                      textColor: design.textColor === "#3b1f0b" ? "#ffffff" : design.textColor,
                      shapeColor: design.shapeColor || "#18181b",
                      smallShapes: [],
                    });
                    setFlipSignal((f) => ({ side: "front", seq: (f?.seq ?? 0) + 1 }));
                  }}
                  className={`rounded-2xl border-2 p-3 text-left transition ${
                    design.base === "nombre"
                      ? "border-amber-500 bg-amber-50/80 shadow-sm"
                      : "border-stone-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">🔤</span>
                    {design.base === "nombre" && (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-black text-stone-900 sm:text-sm">
                    Nombre como Llavero
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
                    Sale SOLO tu nombre recortado en 3D como llavero (sin placa)
                  </p>
                </button>
              </div>

              {/* Sub-navegación rápida de herramientas */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {(
                  [
                    ["texto", "🔤 Nombre y 40 Letras"],
                    ["formas", "⭐ 200 Formas"],
                    ["colores", "🎨 Colores y Superficie"],
                    ["formitas", "✨ Formitas"],
                    ["arte", "📸 Foto y Dibujo"],
                    ["extras", "📏 Tamaño y Mensaje"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSubTab(id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                      subTab === id
                        ? "border-stone-900 bg-stone-900 text-white shadow-sm"
                        : "border-stone-200 bg-stone-50 text-stone-700 hover:border-amber-400 hover:bg-amber-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* SUB-TAB: NOMBRE Y 40 TIPOS DE LETRA */}
              {subTab === "texto" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                    <label className="block text-xs font-extrabold uppercase tracking-wide text-stone-600">
                      {design.base === "nombre"
                        ? "Escribe el nombre o inicial que será tu llavero 3D"
                        : "Nombre o inicial para grabar en la superficie"}
                    </label>
                    <input
                      type="text"
                      value={design.text}
                      maxLength={28}
                      onChange={(e) => patchSingle({ text: e.target.value })}
                      placeholder="Ej: Miguel, Sofía, M.P, Mi Amor..."
                      className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base font-bold text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />

                    {design.base === "nombre" ? (
                      <div className="mt-3 space-y-2.5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => patchSingle({ nameOutline: false })}
                            className={`flex-1 rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition ${
                              !design.nameOutline
                                ? "border-amber-500 bg-amber-50 text-amber-950"
                                : "border-stone-200 bg-white text-stone-600"
                            }`}
                          >
                            Solo letras puras (1 color)
                          </button>
                          <button
                            type="button"
                            onClick={() => patchSingle({ nameOutline: true })}
                            className={`flex-1 rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition ${
                              design.nameOutline
                                ? "border-amber-500 bg-amber-50 text-amber-950"
                                : "border-stone-200 bg-white text-stone-600"
                            }`}
                          >
                            Nombre con borde de color
                          </button>
                        </div>
                        {design.smallShapes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => patchSingle({ smallShapes: [] })}
                            className="text-xs font-bold text-amber-700 underline hover:text-amber-900"
                          >
                            Dejar únicamente el nombre (quitar formitas adheridas)
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => patchSingle({ engraveStyle: "grabado" })}
                          className={`rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition ${
                            design.engraveStyle === "grabado"
                              ? "border-amber-500 bg-amber-50 text-amber-950"
                              : "border-stone-200 bg-white text-stone-600"
                          }`}
                        >
                          🔥 Grabado en superficie
                        </button>
                        <button
                          type="button"
                          onClick={() => patchSingle({ engraveStyle: "color" })}
                          className={`rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition ${
                            design.engraveStyle === "color"
                              ? "border-amber-500 bg-amber-50 text-amber-950"
                              : "border-stone-200 bg-white text-stone-600"
                          }`}
                        >
                          🎨 Letras en relieve a color
                        </button>
                      </div>
                    )}

                    {/* Color de letra + tamaño */}
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      <ColorField
                        label="Color de letra"
                        value={design.textColor}
                        onChange={(v) => patchSingle({ textColor: v })}
                      />
                      <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600">
                        <span>Tamaño letra</span>
                        <input
                          type="range"
                          min={0.65}
                          max={1.4}
                          step={0.05}
                          value={design.textScale}
                          onChange={(e) => patchSingle({ textScale: Number(e.target.value) })}
                          className="flex-1 accent-amber-500"
                        />
                        <span className="w-9 text-right text-stone-500">
                          {Math.round(design.textScale * 100)}%
                        </span>
                      </label>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          title={`Letra ${c}`}
                          onClick={() => patchSingle({ textColor: c })}
                          className={`h-7 w-7 rounded-full border-2 transition ${
                            design.textColor.toLowerCase() === c
                              ? "scale-110 border-amber-500 ring-2 ring-amber-300"
                              : "border-stone-300"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    {design.base === "nombre" && design.nameOutline && (
                      <div className="mt-3">
                        <ColorField
                          label="Color del borde del nombre"
                          value={design.shapeColor}
                          onChange={(v) => patchSingle({ shapeColor: v })}
                        />
                      </div>
                    )}

                    {/* Grabado opcional en la parte de atrás */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={design.backText}
                        maxLength={40}
                        onChange={(e) => patchSingle({ backText: e.target.value })}
                        placeholder="Grabado atrás (opcional: fecha, teléfono, frase)"
                        className="min-w-[180px] flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFlipSignal((f) => ({ side: "back", seq: (f?.seq ?? 0) + 1 }))
                        }
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:border-amber-400"
                      >
                        Ver atrás 3D
                      </button>
                    </div>
                  </div>

                  {/* 40 tipos de letra */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-extrabold uppercase tracking-wide text-stone-600">
                        40 Tipos de letra · Seleccionada:{" "}
                        <span className="text-amber-700">{design.font}</span>
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {FONTS.map((font) => {
                        const active = design.font === font;
                        return (
                          <button
                            key={font}
                            type="button"
                            onClick={() => patchSingle({ font })}
                            className={`rounded-xl border-2 px-2.5 py-2 text-left transition ${
                              active
                                ? "border-amber-500 bg-amber-50 text-amber-950 shadow-sm"
                                : "border-stone-200 bg-white text-stone-700 hover:border-amber-300"
                            }`}
                          >
                            <span
                              style={{ fontFamily: `"${font}", sans-serif` }}
                              className="block truncate text-base leading-snug"
                            >
                              {design.text.trim() || "Miguel"}
                            </span>
                            <span className="block truncate text-[10px] font-semibold text-stone-400">
                              {font}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB: CATÁLOGO DIRECTO DE 200 FORMAS (INCLUYE 30 DE MECANIZADO) */}
              {subTab === "formas" && (
                <div className="space-y-3">
                  <div className="space-y-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-sm">
                        <ShapeGlyph d={currentShapeInfo.d} size={28} />
                      </span>
                      <div>
                        <p className="text-xs font-black text-stone-900">
                          Forma 3D actual: {currentShapeInfo.name}
                        </p>
                        <p className="text-[11px] text-stone-600">
                          Toca cualquier figura y el llavero 3D cambia de forma al instante ({SHAPES.length} formas, 30 de mecanizado)
                        </p>
                      </div>
                    </div>
                    {/* Selector rápido de superficie y color sin salir de Formas */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          patchSingle({
                            base: "superficie",
                            surfaceMaterial: "madera",
                            engraveStyle: "grabado",
                            textColor: "#3b1d0a",
                          })
                        }
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          design.surfaceMaterial === "madera"
                            ? "border-amber-700 bg-amber-700 text-white"
                            : "border-stone-300 bg-white text-stone-700"
                        }`}
                      >
                        🪵 Madera
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          patchSingle({
                            base: "superficie",
                            surfaceMaterial: "metal-oro",
                            engraveStyle: "grabado",
                            textColor: "#291805",
                          })
                        }
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          design.surfaceMaterial === "metal-oro"
                            ? "border-amber-600 bg-amber-400 text-stone-950"
                            : "border-stone-300 bg-white text-stone-700"
                        }`}
                      >
                        🥇 Dorado
                      </button>
                      {["#e11d48", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#18181b"].map(
                        (c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() =>
                              patchSingle({
                                base: "superficie",
                                surfaceMaterial: "color",
                                engraveStyle: "color",
                                shapeColor: c,
                                textColor: c === "#f59e0b" ? "#1c1917" : "#ffffff",
                              })
                            }
                            className={`h-6 w-6 rounded-full border-2 transition ${
                              design.surfaceMaterial === "color" && design.shapeColor === c
                                ? "scale-110 border-stone-950 ring-2 ring-amber-400"
                                : "border-white shadow-sm"
                            }`}
                            style={{ backgroundColor: c }}
                            title={`Color ${c}`}
                          />
                        ),
                      )}
                    </div>
                  </div>

                  <input
                    type="search"
                    value={shapeQuery}
                    onChange={(e) => setShapeQuery(e.target.value)}
                    placeholder="Buscar entre 200 formas (corazón, engranaje, gato, hueso, estrella, calibrador...)"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />

                  <div className="flex flex-wrap gap-1.5">
                    {["Todas", ...CATEGORIES].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setShapeCategory(cat)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                          shapeCategory === cat
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-stone-200 bg-stone-50 text-stone-600 hover:border-amber-300"
                        }`}
                      >
                        {cat}
                        {cat === "Mecanizado" ? " (30)" : ""}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                    {filteredShapes.map((s) => {
                      const active = design.base !== "nombre" && design.shapeId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => selectShapeSingle(s.id)}
                          title={`${s.name} · ${s.category}`}
                          className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 transition ${
                            active
                              ? "border-amber-500 bg-amber-50 text-amber-700 shadow-sm"
                              : "border-stone-200 bg-white text-stone-600 hover:border-amber-400 hover:bg-amber-50/40 hover:text-amber-600"
                          }`}
                        >
                          <ShapeGlyph d={s.d} size={32} />
                          <span className="w-full truncate text-center text-[10px] font-bold leading-tight text-stone-600">
                            {s.name}
                          </span>
                        </button>
                      );
                    })}
                    {filteredShapes.length === 0 && (
                      <p className="col-span-full py-8 text-center text-sm text-stone-400">
                        No hay formas que coincidan con “{shapeQuery}”.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB: COLORES, SUPERFICIE DE GRABADO Y PATRONES */}
              {subTab === "colores" && (
                <div className="space-y-4">
                  {design.base !== "nombre" && (
                    <div>
                      <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-stone-600">
                        Superficie para grabar tu nombre
                      </h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {MATERIALS.map((m) => {
                          const active = design.surfaceMaterial === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() =>
                                patchSingle({
                                  surfaceMaterial: m.id,
                                  engraveStyle: m.id === "color" ? "color" : "grabado",
                                  textColor: m.defaultText,
                                })
                              }
                              className={`flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition ${
                                active
                                  ? "border-amber-500 bg-amber-50 shadow-sm"
                                  : "border-stone-200 bg-white hover:border-amber-300"
                              }`}
                            >
                              <span
                                className="h-9 w-9 shrink-0 rounded-xl border border-black/10 shadow-inner"
                                style={{ background: m.swatch }}
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-extrabold text-stone-900">
                                  {m.name}
                                </span>
                                <span className="block truncate text-[10px] text-stone-500">
                                  {m.desc}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                    <h3 className="mb-2.5 text-xs font-extrabold uppercase tracking-wide text-stone-600">
                      {design.base === "nombre"
                        ? "Color del borde / base del nombre"
                        : "Color del llavero (cambia al instante en 3D)"}
                    </h3>
                    <ColorField
                      label="Color del llavero"
                      value={design.shapeColor}
                      onChange={(v) =>
                        patchSingle(
                          design.base === "nombre"
                            ? { shapeColor: v, nameOutline: true }
                            : { surfaceMaterial: "color", shapeColor: v },
                        )
                      }
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {SURFACE_COLORS.map((c) => {
                        const active =
                          (design.base === "nombre" || design.surfaceMaterial === "color") &&
                          design.shapeColor.toLowerCase() === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() =>
                              patchSingle(
                                design.base === "nombre"
                                  ? { shapeColor: c, nameOutline: true }
                                  : {
                                      surfaceMaterial: "color",
                                      shapeColor: c,
                                      textColor:
                                        c === "#ffffff" || c === "#fbcfe8" || c === "#eab308"
                                          ? "#111827"
                                          : design.textColor === "#3b1d0a"
                                            ? "#ffffff"
                                            : design.textColor,
                                    },
                              )
                            }
                            className={`h-8 w-8 rounded-full border-2 transition ${
                              active
                                ? "scale-110 border-stone-900 ring-2 ring-amber-400"
                                : "border-white shadow"
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                    <h3 className="mb-2.5 text-xs font-extrabold uppercase tracking-wide text-stone-600">
                      Color de las letras
                    </h3>
                    <ColorField
                      label="Color de letras"
                      value={design.textColor}
                      onChange={(v) => patchSingle({ textColor: v })}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => patchSingle({ textColor: c })}
                          className={`h-8 w-8 rounded-full border-2 transition ${
                            design.textColor.toLowerCase() === c
                              ? "scale-110 border-amber-500 ring-2 ring-amber-300"
                              : "border-stone-300"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {design.base !== "nombre" && (
                    <div>
                      <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-stone-600">
                        Textura / Grabado decorativo de fondo
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {PATTERNS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => patchSingle({ pattern: p.id })}
                            className={`rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition ${
                              design.pattern === p.id
                                ? "border-amber-500 bg-amber-50 text-amber-900"
                                : "border-stone-200 bg-white text-stone-600 hover:border-amber-300"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB: FORMITAS PEQUEÑAS */}
              {subTab === "formitas" && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600">
                    Agrega hasta 8 formitas pequeñas con el color que prefieras ({design.smallShapes.length}/8 puestas).
                  </p>

                  {design.smallShapes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
                      {design.smallShapes.map((s, i) => (
                        <span
                          key={`${s.id}-${i}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white py-1 pl-1.5 pr-2 text-xs font-bold text-stone-700 shadow-sm"
                        >
                          <span
                            className="grid h-6 w-6 place-items-center rounded-full text-white"
                            style={{ backgroundColor: s.color }}
                          >
                            <ShapeGlyph d={SHAPE_MAP[s.id]?.d ?? ""} size={14} />
                          </span>
                          <span>{SHAPE_MAP[s.id]?.name ?? s.id}</span>
                          <button
                            type="button"
                            onClick={() =>
                              patchSingle({
                                smallShapes: design.smallShapes.filter((_, idx) => idx !== i),
                              })
                            }
                            className="rounded-full bg-stone-100 px-1.5 text-stone-500 hover:bg-red-100 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => patchSingle({ smallShapes: [] })}
                        className="ml-auto text-xs font-bold text-red-600 hover:underline"
                      >
                        Quitar todas
                      </button>
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <ColorField
                      label="Color formita"
                      value={smallColor}
                      onChange={setSmallColor}
                    />
                    <select
                      value={smallCategory}
                      onChange={(e) => setSmallCategory(e.target.value)}
                      className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700"
                    >
                      {["Todas", ...CATEGORIES].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid max-h-80 grid-cols-6 gap-1.5 overflow-y-auto rounded-2xl bg-stone-50 p-2 sm:grid-cols-8">
                    {filteredSmallShapes.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        title={`Agregar ${s.name}`}
                        onClick={() =>
                          setDesign((d) =>
                            d.smallShapes.length >= 8
                              ? d
                              : {
                                  ...d,
                                  smallShapes: [...d.smallShapes, { id: s.id, color: smallColor }],
                                },
                          )
                        }
                        className="grid aspect-square place-items-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:border-amber-400 hover:text-amber-600"
                      >
                        <ShapeGlyph d={s.d} size={24} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB: FOTO DEL CLIENTE Y DIBUJO LIBRE */}
              {subTab === "arte" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                    <h3 className="text-sm font-extrabold text-stone-900">
                      📸 Pon tu propia imagen o foto
                    </h3>
                    <p className="mt-0.5 text-xs text-stone-500">
                      Sube una foto tuya, de tu pareja o de tu mascota y se verá en el llavero 3D.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) readAndCropPhoto(file, (url) => patchSingle({ image: url }));
                        e.target.value = "";
                      }}
                      className="mt-3 block w-full cursor-pointer rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-xs file:font-extrabold file:text-white"
                    />
                    {design.image && (
                      <div className="mt-3 flex items-center gap-3">
                        <img
                          src={design.image}
                          alt="Tu foto en el llavero"
                          className="h-16 w-16 rounded-full border-2 border-amber-400 object-cover shadow"
                        />
                        <button
                          type="button"
                          onClick={() => patchSingle({ image: "" })}
                          className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          Quitar imagen
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                    <h3 className="mb-1 text-sm font-extrabold text-stone-900">
                      ✏️ Dibuja lo que quieras en tu llavero
                    </h3>
                    <p className="mb-3 text-xs text-stone-500">
                      Tu dibujo se aplica en vivo sobre el llavero 3D.
                    </p>
                    <DrawingPad
                      value={design.drawing}
                      onChange={(v) => patchSingle({ drawing: v })}
                    />
                  </div>
                </div>
              )}

              {/* SUB-TAB: TAMAÑO, CADENITA Y MENSAJE */}
              {subTab === "extras" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-stone-600">
                      Tamaño del llavero (todos a {formatMoney(UNIT_PRICE)})
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(["S", "M", "L"] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => patchSingle({ size: sz })}
                          className={`rounded-2xl border-2 p-3 text-center transition ${
                            design.size === sz
                              ? "border-amber-500 bg-amber-50 text-amber-950 shadow-sm"
                              : "border-stone-200 bg-white text-stone-600 hover:border-amber-300"
                          }`}
                        >
                          <span className="block text-sm font-black">{SIZE_INFO[sz].label}</span>
                          <span className="block text-xs text-stone-500">{SIZE_INFO[sz].cm} cm</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 transition ${
                      design.chain ? "border-amber-500 bg-amber-50" : "border-stone-200 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={design.chain}
                      onChange={(e) => patchSingle({ chain: e.target.checked })}
                      className="h-5 w-5 accent-amber-500"
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-extrabold text-stone-900">
                        🔗 Agregar cadenita para llevar dos llaveros
                      </span>
                      <span className="block text-xs text-stone-500">
                        Cadenita metálica con doble aro (+{formatMoney(CHAIN_PRICE)})
                      </span>
                    </span>
                  </label>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wide text-stone-600">
                      💬 Mensaje de lo que deseas agregar a tu llavero
                    </label>
                    <textarea
                      value={message}
                      maxLength={600}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder="Escribe cualquier detalle especial, accesorio, dedicatoria o indicación para tu pedido..."
                      className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====================================================================
              SECCIÓN 2: 10,000 DISEÑOS DISPONIBLES PARA MASCOTAS + ALEATORIO
          ==================================================================== */}
          {section === "mascotas" && (
            <div className="space-y-4">
              {/* Banner y botón Aleatorio entre los 10,000 diseños */}
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50/70 to-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="inline-block rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      10,000 diseños para mascotas
                    </span>
                    <h2 className="mt-1 text-base font-black text-stone-900 sm:text-lg">
                      {currentPet.emoji} {currentPet.code} · {currentPet.title}
                    </h2>
                    <p className="text-xs text-stone-600">{currentPet.subtitle}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={triggerRandomPet}
                    className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white shadow transition hover:bg-amber-600 active:scale-[0.98]"
                  >
                    🎲 ¡Diseño Aleatorio! (1 de 10,000)
                  </button>
                  <button
                    type="button"
                    onClick={shufflePetGrid}
                    className="rounded-xl border-2 border-amber-300 bg-white px-3.5 py-2.5 text-xs font-extrabold text-amber-900 transition hover:bg-amber-100"
                  >
                    🔀 12 al azar
                  </button>
                </div>

                {/* Ir directamente a cualquier número del 1 al 10,000 */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      applyPetId(selectedPetId <= 1 ? PET_TOTAL_DESIGNS : selectedPetId - 1)
                    }
                    className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:border-amber-400"
                  >
                    ◀ Ant.
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyPetId(selectedPetId >= PET_TOTAL_DESIGNS ? 1 : selectedPetId + 1)
                    }
                    className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:border-amber-400"
                  >
                    Sig. ▶
                  </button>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      applyPetId(Number(petJumpInput) || 1);
                    }}
                    className="ml-auto flex items-center gap-1.5"
                  >
                    <span className="text-[11px] font-bold text-stone-500">Diseño #</span>
                    <input
                      type="number"
                      min={1}
                      max={PET_TOTAL_DESIGNS}
                      value={petJumpInput}
                      onChange={(e) => setPetJumpInput(e.target.value)}
                      className="w-20 rounded-lg border border-stone-300 bg-white px-2 py-1 text-center text-xs font-bold outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-stone-700"
                    >
                      Ir
                    </button>
                  </form>
                </div>
              </div>

              {/* Datos de tu mascota (nombre al frente + teléfono atrás + foto) */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-stone-700">
                    🐾 Nombre de tu mascota
                    <input
                      type="text"
                      value={petName}
                      maxLength={22}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPetName(val);
                        patchSingle({ text: val.trim() || currentPet.sampleName });
                      }}
                      placeholder={`Ej: ${currentPet.sampleName}`}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-amber-500"
                    />
                  </label>
                  <label className="block text-xs font-bold text-stone-700">
                    📞 Teléfono grabado atrás
                    <div className="mt-1 flex gap-1.5">
                      <input
                        type="text"
                        value={petPhone}
                        maxLength={22}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPetPhone(val);
                          patchSingle({ backText: val.trim() ? `Tel: ${val.trim()}` : "Mascota amada" });
                        }}
                        placeholder="099 123 4567"
                        className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFlipSignal((f) => ({ side: "back", seq: (f?.seq ?? 0) + 1 }))
                        }
                        title="Girar llavero y ver teléfono atrás"
                        className="shrink-0 rounded-xl border border-stone-300 bg-white px-2.5 py-2 text-xs font-bold text-stone-700 hover:border-amber-400"
                      >
                        Atrás
                      </button>
                    </div>
                  </label>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <label className="cursor-pointer rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:border-amber-400">
                    📷 {design.image ? "Cambiar foto de mascota" : "Subir foto de tu mascota"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) readAndCropPhoto(file, (url) => patchSingle({ image: url }));
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {design.image && (
                    <button
                      type="button"
                      onClick={() => patchSingle({ image: "" })}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Quitar foto
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSection("personalizar");
                      setSubTab("colores");
                    }}
                    className="ml-auto text-xs font-extrabold text-amber-700 hover:underline"
                  >
                    🎨 Ajustar colores / dibujar →
                  </button>
                </div>
              </div>

              {/* Filtros por tipo de mascota */}
              <div className="flex flex-wrap gap-1.5">
                {PET_GROUPS.map((g) => {
                  const count = getPetIdsForGroup(g).length;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setPetGroup(g);
                        setPetPage(1);
                        const batch = pickRandomPetBatch(g, PET_PAGE_SIZE);
                        setRandomPetBatch(batch);
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                        petGroup === g
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "border-stone-200 bg-stone-50 text-stone-600 hover:border-amber-300"
                      }`}
                    >
                      {g} ({count.toLocaleString("en-US")})
                    </button>
                  );
                })}
              </div>

              {/* Alternar entre muestra aleatoria y catálogo numerado 1..10,000 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPetBrowseMode("aleatorio")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      petBrowseMode === "aleatorio"
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    🎲 Selección aleatoria
                  </button>
                  <button
                    type="button"
                    onClick={() => setPetBrowseMode("catalogo")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      petBrowseMode === "catalogo"
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    📖 Catálogo ({petGroupIds.length.toLocaleString("en-US")})
                  </button>
                </div>

                {petBrowseMode === "catalogo" && (
                  <div className="flex items-center gap-1 text-xs font-bold text-stone-600">
                    <button
                      type="button"
                      disabled={safePetPage <= 1}
                      onClick={() => setPetPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-stone-300 px-2 py-1 disabled:opacity-40"
                    >
                      ◀
                    </button>
                    <span>
                      Pág. {safePetPage}/{totalPetPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePetPage >= totalPetPages}
                      onClick={() => setPetPage((p) => Math.min(totalPetPages, p + 1))}
                      className="rounded-lg border border-stone-300 px-2 py-1 disabled:opacity-40"
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>

              {/* Cuadrícula visual de diseños de mascotas */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {visiblePets.map((item) => {
                  const active = selectedPetId === item.id;
                  const shapeD = SHAPE_MAP[item.shapeId]?.d ?? "";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => applyPetId(item.id)}
                      className={`group flex flex-col rounded-2xl border-2 p-2.5 text-left transition ${
                        active
                          ? "border-amber-500 bg-amber-50/80 shadow-md"
                          : "border-stone-200 bg-white hover:border-amber-400 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between text-[10px] font-extrabold text-stone-500">
                        <span>{item.code}</span>
                        <span>{item.emoji}</span>
                      </div>
                      <div className="relative my-1.5 grid h-16 w-full place-items-center rounded-xl bg-stone-50">
                        <div
                          className="grid h-13 w-13 place-items-center rounded-2xl shadow-sm transition group-hover:scale-105"
                          style={{ background: petCardBackground(item), color: item.textColor }}
                        >
                          <ShapeGlyph d={shapeD} size={34} />
                        </div>
                        <span
                          className="absolute right-2 bottom-1.5 h-3.5 w-3.5 rounded-full border border-white shadow"
                          style={{ backgroundColor: item.accentColor }}
                        />
                      </div>
                      <span className="w-full truncate text-xs font-extrabold text-stone-900">
                        {petName.trim() || item.sampleName}
                      </span>
                      <span className="w-full truncate text-[10px] text-stone-500">
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ====================================================================
              SECCIÓN 3: CREAR TU DÚO FAVORITO (2 LLAVEROS PERSONALIZADOS EN 3D)
          ==================================================================== */}
          {section === "duo" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-amber-50/60 to-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="inline-block rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      Sección Dúo · 2 llaveros × $2.50
                    </span>
                    <h2 className="mt-1 text-base font-black text-stone-900 sm:text-lg">
                      💞 Crea tu Dúo Favorito: {duoLabel}
                    </h2>
                    <p className="text-xs text-stone-600">
                      Para parejas, mejores amigos, familia o mascota y dueño. Personaliza cada llavero por separado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={triggerRandomDuo}
                    className="rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-black text-white shadow transition hover:bg-rose-600"
                  >
                    🎲 Dúo Aleatorio
                  </button>
                </div>

                {/* Plantillas rápidas de Dúo */}
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1.5">
                  {DUO_PRESETS.map((preset) => {
                    const active = duoLabel === preset.name;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyDuoPreset(preset)}
                        className={`shrink-0 rounded-xl border-2 px-3 py-2 text-left transition ${
                          active
                            ? "border-rose-500 bg-white shadow-sm"
                            : "border-stone-200/80 bg-white/75 hover:border-rose-300"
                        }`}
                      >
                        <span className="block text-xs font-extrabold text-stone-900">
                          {preset.emoji} {preset.name}
                        </span>
                        <span className="block text-[10px] text-stone-500">{preset.tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de cuál de los 2 llaveros del dúo se está editando */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDuoSlot(1)}
                  className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-xs font-black transition ${
                    duoSlot === 1
                      ? "border-amber-500 bg-amber-50 text-amber-950 shadow-sm"
                      : "border-stone-200 bg-white text-stone-600 hover:border-amber-300"
                  }`}
                >
                  1️⃣ Llavero 1: “{duoFirst.text.trim() || "Sin nombre"}”
                </button>
                <button
                  type="button"
                  onClick={() => setDuoSlot(2)}
                  className={`flex-1 rounded-xl border-2 px-3 py-2.5 text-xs font-black transition ${
                    duoSlot === 2
                      ? "border-amber-500 bg-amber-50 text-amber-950 shadow-sm"
                      : "border-stone-200 bg-white text-stone-600 hover:border-amber-300"
                  }`}
                >
                  2️⃣ Llavero 2: “{duoSecond.text.trim() || "Sin nombre"}”
                </button>
                <button
                  type="button"
                  onClick={syncDuoStyleToOther}
                  title="Copiar forma, material y letra al otro llavero"
                  className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-xs font-bold text-stone-700 hover:border-amber-400"
                >
                  ↔ Igualar
                </button>
              </div>

              {/* Editor completo del llavero activo del Dúo */}
              <div className="space-y-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => patchActiveDuo({ base: "superficie" })}
                    className={`rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition ${
                      activeDuo.base !== "nombre"
                        ? "border-amber-500 bg-amber-50 text-amber-950"
                        : "border-stone-200 bg-white text-stone-600"
                    }`}
                  >
                    🪵 Superficie para Grabar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      patchActiveDuo({
                        base: "nombre",
                        text: activeDuo.text.trim() || (duoSlot === 1 ? "Tú" : "Yo"),
                      })
                    }
                    className={`rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition ${
                      activeDuo.base === "nombre"
                        ? "border-amber-500 bg-amber-50 text-amber-950"
                        : "border-stone-200 bg-white text-stone-600"
                    }`}
                  >
                    🔤 Solo Nombre como Llavero
                  </button>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-stone-700">
                    Nombre / Inicial (Llavero #{duoSlot})
                    <input
                      type="text"
                      value={activeDuo.text}
                      maxLength={24}
                      onChange={(e) => patchActiveDuo({ text: e.target.value })}
                      placeholder={duoSlot === 1 ? "Nombre 1" : "Nombre 2"}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-amber-500"
                    />
                  </label>
                  <label className="block text-xs font-bold text-stone-700">
                    Tipo de letra (40 estilos)
                    <select
                      value={activeDuo.font}
                      onChange={(e) => patchActiveDuo({ font: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500"
                    >
                      {FONTS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {activeDuo.base !== "nombre" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerTarget("duo")}
                      className="flex items-center gap-2.5 rounded-xl border-2 border-dashed border-amber-400 bg-white px-3.5 py-2 text-left transition hover:bg-amber-50"
                    >
                      <span className="text-amber-600">
                        <ShapeGlyph d={currentDuoShape.d} size={26} />
                      </span>
                      <span>
                        <span className="block text-xs font-black text-stone-900">
                          Forma #{duoSlot}: {currentDuoShape.name}
                        </span>
                        <span className="block text-[10px] text-amber-700">
                          Cambiar entre 200 formas
                        </span>
                      </span>
                    </button>

                    <select
                      value={activeDuo.surfaceMaterial}
                      onChange={(e) => {
                        const mat = e.target.value as SurfaceMaterial;
                        const info = MATERIALS.find((m) => m.id === mat);
                        patchActiveDuo({
                          surfaceMaterial: mat,
                          engraveStyle: mat === "color" ? "color" : "grabado",
                          textColor: info ? info.defaultText : activeDuo.textColor,
                        });
                      }}
                      className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs font-bold text-stone-700"
                    >
                      {MATERIALS.map((m) => (
                        <option key={m.id} value={m.id}>
                          Superficie: {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <ColorField
                    label={activeDuo.base === "nombre" ? "Color borde" : "Color llavero"}
                    value={activeDuo.shapeColor}
                    onChange={(v) =>
                      patchActiveDuo(
                        activeDuo.base === "nombre"
                          ? { shapeColor: v, nameOutline: true }
                          : { surfaceMaterial: "color", shapeColor: v },
                      )
                    }
                  />
                  <ColorField
                    label="Color letras"
                    value={activeDuo.textColor}
                    onChange={(v) => patchActiveDuo({ textColor: v })}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:border-amber-400">
                    📸 {activeDuo.image ? `Cambiar foto #${duoSlot}` : `Poner foto en #${duoSlot}`}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) readAndCropPhoto(file, (url) => patchActiveDuo({ image: url }));
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {activeDuo.image && (
                    <button
                      type="button"
                      onClick={() => patchActiveDuo({ image: "" })}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Quitar foto
                    </button>
                  )}

                  <div className="ml-auto flex items-center gap-1">
                    {(["S", "M", "L"] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => patchActiveDuo({ size: sz })}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                          activeDuo.size === sz
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-stone-300 bg-white text-stone-600"
                        }`}
                      >
                        {SIZE_INFO[sz].cm}cm
                      </button>
                    ))}
                  </div>
                </div>

                <details className="group rounded-xl border border-stone-200 bg-white p-2.5">
                  <summary className="cursor-pointer list-none text-xs font-bold text-stone-700">
                    ✏️ Dibujar o grabar reverso en Llavero #{duoSlot}
                    <span className="float-right text-amber-600 group-open:rotate-45">＋</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <input
                      type="text"
                      value={activeDuo.backText}
                      maxLength={40}
                      onChange={(e) => patchActiveDuo({ backText: e.target.value })}
                      placeholder={`Texto grabado atrás del llavero #${duoSlot}`}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs outline-none focus:border-amber-500"
                    />
                    <DrawingPad
                      value={activeDuo.drawing}
                      onChange={(v) => patchActiveDuo({ drawing: v })}
                    />
                  </div>
                </details>
              </div>

              {/* Cadenita de unión para los 2 llaveros + mensaje */}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition ${
                  duoChain ? "border-amber-500 bg-amber-50" : "border-stone-200 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={duoChain}
                  onChange={(e) => setDuoChain(e.target.checked)}
                  className="h-5 w-5 accent-amber-500"
                />
                <span className="flex-1 text-xs">
                  <span className="block font-extrabold text-stone-900">
                    🔗 Cadenita para llevar los dos llaveros unidos (+{formatMoney(CHAIN_PRICE)})
                  </span>
                  <span className="text-stone-500">Se muestra uniendo tu dúo en la vista 3D</span>
                </span>
              </label>

              <textarea
                value={message}
                maxLength={600}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="💬 Mensaje para los dueños sobre tu Dúo (opcional)..."
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>

        {/* Barra inferior fija de precio ($2.50 c/u) y botón de pedido */}
        <div className="shrink-0 border-t border-stone-200 bg-stone-50/95 px-3.5 py-2.5 sm:px-5 sm:py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {/* Control compacto de cantidad */}
              <div className="flex items-center rounded-full border border-stone-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() =>
                    isDuo
                      ? setDuoSets((n) => Math.max(1, n - 1))
                      : setQuantity((q) => Math.max(1, q - 1))
                  }
                  className="grid h-7 w-7 place-items-center rounded-full text-sm font-black text-stone-700 hover:bg-amber-50"
                  aria-label="Reducir cantidad"
                >
                  −
                </button>
                <span className="min-w-[2.2rem] px-1 text-center text-xs font-black text-stone-900">
                  {isDuo ? `${duoSets} dúo` : quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    isDuo
                      ? setDuoSets((n) => Math.min(25, n + 1))
                      : setQuantity((q) => Math.min(50, q + 1))
                  }
                  className="grid h-7 w-7 place-items-center rounded-full text-sm font-black text-stone-700 hover:bg-amber-50"
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>

              <div className="leading-tight">
                <p className="text-[11px] font-semibold text-stone-500">
                  {effectiveKeychainCount} × {formatMoney(UNIT_PRICE)}
                  {effectiveChain ? ` + cadena ${formatMoney(CHAIN_PRICE)}` : ""}
                </p>
                <p className="text-lg font-black text-stone-950 sm:text-xl">
                  {formatMoney(totalPrice)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreatedOrderId(null);
                setOrderError("");
                setOrderOpen(true);
              }}
              className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-black text-white shadow-md transition hover:bg-amber-600 active:scale-95 sm:px-6"
            >
              🛒 Hacer Pedido
            </button>
          </div>
        </div>
      </div>

      {/* Modal de selección de 200 formas (usado en Dúo) */}
      <ShapePicker
        open={pickerTarget !== null}
        title="Elige entre las 200 formas (incluye 30 de mecanizado)"
        selectedId={pickerTarget === "duo" ? activeDuo.shapeId : design.shapeId}
        onClose={() => setPickerTarget(null)}
        onSelect={(id) => {
          if (pickerTarget === "duo") {
            patchActiveDuo({ base: "superficie", shapeId: id });
          } else {
            selectShapeSingle(id);
          }
        }}
      />

      {/* Modal de confirmación y envío del pedido */}
      {orderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-3 backdrop-blur-sm">
          <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            {createdOrderId !== null ? (
              <div className="py-4 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl">
                  ✅
                </div>
                <h2 className="mt-3 text-2xl font-black text-stone-900">
                  ¡Pedido #{createdOrderId} enviado!
                </h2>
                <p className="mt-2 text-sm text-stone-600">
                  Tu diseño personalizado ya llegó al apartado privado de los dueños. Muy pronto te
                  contactaremos para entregarte {isDuo ? "tu dúo de llaveros" : "tu llavero"}.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={finishAndCreateAnother}
                    className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-black text-white shadow hover:bg-amber-600"
                  >
                    Seguir diseñando
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-stone-900 sm:text-2xl">
                      Confirmar tu pedido
                    </h2>
                    <p className="text-xs text-stone-500">
                      Todos los llaveros a {formatMoney(UNIT_PRICE)} · Diseño guardado en alta calidad
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrderOpen(false)}
                    className="rounded-full bg-stone-100 px-3.5 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-200"
                  >
                    Cerrar ✕
                  </button>
                </div>

                {/* Vista previa de 1 llavero o los 2 llaveros del Dúo */}
                <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-3.5">
                  {isDuo ? (
                    <div className="grid w-44 shrink-0 grid-cols-2 gap-2">
                      <DesignPreview design={duoFirst} />
                      <DesignPreview design={duoSecond} />
                    </div>
                  ) : (
                    <div className="w-28 shrink-0">
                      <DesignPreview design={design} />
                    </div>
                  )}
                  <div className="min-w-[180px] flex-1 space-y-1 text-xs text-stone-700">
                    {isDuo ? (
                      <>
                        <p className="font-black text-rose-600">💞 Dúo: {duoLabel}</p>
                        <p>
                          <span className="font-bold">#1:</span> {duoFirst.text || "—"} (
                          {duoFirst.base === "nombre"
                            ? "Solo nombre"
                            : SHAPE_MAP[duoFirst.shapeId || "geo-placa-clasica"]?.name}
                          )
                        </p>
                        <p>
                          <span className="font-bold">#2:</span> {duoSecond.text || "—"} (
                          {duoSecond.base === "nombre"
                            ? "Solo nombre"
                            : SHAPE_MAP[duoSecond.shapeId || "geo-placa-clasica"]?.name}
                          )
                        </p>
                      </>
                    ) : (
                      <>
                        {section === "mascotas" && (
                          <p className="font-black text-amber-700">
                            🐾 Mascota {currentPet.code} · {currentPet.title}
                          </p>
                        )}
                        <p>
                          <span className="font-bold">Modo:</span>{" "}
                          {design.base === "nombre"
                            ? "Solo nombre como llavero"
                            : `Superficie grabada (${currentShapeInfo.name})`}
                        </p>
                        <p>
                          <span className="font-bold">Texto:</span> {design.text.trim() || "—"} ·{" "}
                          {design.font}
                        </p>
                        {design.backText.trim() && (
                          <p>
                            <span className="font-bold">Reverso:</span> {design.backText}
                          </p>
                        )}
                      </>
                    )}
                    <p>
                      <span className="font-bold">Cantidad:</span> {effectiveKeychainCount}{" "}
                      {effectiveKeychainCount === 1 ? "llavero" : "llaveros"}
                      {effectiveChain ? " + cadenita" : ""}
                    </p>
                    <p className="pt-1 text-base font-black text-amber-600">
                      Total: {formatMoney(totalPrice)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-stone-700">
                    Tu nombre completo *
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                      placeholder="Ej: Ana Torres"
                      className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-amber-500"
                    />
                  </label>
                  <label className="block text-xs font-bold text-stone-700">
                    WhatsApp / Teléfono / Correo *
                    <input
                      type="text"
                      value={form.contact}
                      onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                      placeholder="Ej: 099 123 4567"
                      className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-amber-500"
                    />
                  </label>
                  <label className="block text-xs font-bold text-stone-700 sm:col-span-2">
                    Dirección de entrega (opcional)
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="Ciudad, sector y referencia"
                      className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-amber-500"
                    />
                  </label>
                  <label className="block text-xs font-bold text-stone-700 sm:col-span-2">
                    Mensaje de lo que deseas en tu llavero (opcional)
                    <textarea
                      value={message}
                      maxLength={600}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={2}
                      placeholder="Ej: deseo cadenita por llevar dos llaveros, letra brillante, envoltura de regalo..."
                      className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal outline-none focus:border-amber-500"
                    />
                  </label>
                </div>

                {orderError && (
                  <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                    {orderError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={submitting}
                  onClick={submitOrder}
                  className="mt-4 w-full rounded-full bg-amber-500 px-6 py-3.5 text-base font-black text-white shadow-lg transition hover:bg-amber-600 disabled:opacity-60"
                >
                  {submitting
                    ? "Enviando pedido..."
                    : `Enviar pedido · ${formatMoney(totalPrice)}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
