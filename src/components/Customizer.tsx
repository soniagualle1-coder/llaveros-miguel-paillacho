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
  PaymentMethod,
  SurfaceMaterial,
  SurfacePattern,
} from "@/lib/types";

type StudioSection = "personalizar" | "mascotas" | "duo";
type CustomSubTab = "formas" | "texto" | "colores" | "formitas" | "arte" | "extras";

const SURFACE_COLORS = [
  "#e11d48", "#f43f5e", "#fb7185", "#fbcfe8", "#ea580c", "#f59e0b",
  "#eab308", "#16a34a", "#10b981", "#14b8a6", "#0ea5e9", "#2563eb",
  "#1e3a8a", "#7c3aed", "#a855f7", "#d946ef", "#18181b", "#ffffff",
];

const TEXT_COLORS = [
  "#3b1d0a", "#111827", "#ffffff", "#fef08a", "#fbbf24", "#e11d48",
  "#fbcfe8", "#0ea5e9", "#1e3a8a", "#10b981", "#7c3aed", "#ea580c",
];

const MATERIALS: Array<{
  id: SurfaceMaterial;
  name: string;
  desc: string;
  swatch: string;
  defaultText: string;
}> = [
  { id: "madera", name: "Madera Roble", desc: "Ideal para grabar", swatch: "linear-gradient(135deg,#e7b97e,#ae7137)", defaultText: "#3b1d0a" },
  { id: "nogal", name: "Madera Nogal", desc: "Grabado elegante", swatch: "linear-gradient(135deg,#7c4d2b,#3d2210)", defaultText: "#fef3c7" },
  { id: "color", name: "Color Acrílico", desc: "Elige tu color", swatch: "linear-gradient(135deg,#f43f5e,#f59e0b,#0ea5e9)", defaultText: "#ffffff" },
  { id: "metal-oro", name: "Placa Dorada", desc: "Brillo metálico", swatch: "linear-gradient(135deg,#fceabb,#d4af37,#b88921)", defaultText: "#291805" },
  { id: "metal-plata", name: "Acero Plata", desc: "Grabado fino", swatch: "linear-gradient(135deg,#f8fafc,#cbd5e1,#94a3b8)", defaultText: "#0f172a" },
  { id: "marmol", name: "Mármol Perla", desc: "Superficie clara", swatch: "linear-gradient(135deg,#ffffff,#e2e8f0)", defaultText: "#1e293b" },
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
    case "madera": return "linear-gradient(135deg,#e7b97e,#b8793d)";
    case "nogal": return "linear-gradient(135deg,#7c4d2b,#3d2210)";
    case "metal-oro": return "linear-gradient(135deg,#fceabb,#d4af37)";
    case "metal-plata": return "linear-gradient(135deg,#f8fafc,#cbd5e1)";
    case "marmol": return "linear-gradient(135deg,#ffffff,#e2e8f0)";
    default: return item.shapeColor;
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
  const [section, setSection] = useState<StudioSection>("personalizar");
  const [subTab, setSubTab] = useState<CustomSubTab>("texto");
  const [design, setDesign] = useState<KeychainDesign>(DEFAULT_DESIGN);
  const [quantity, setQuantity] = useState(1);

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
  const [duoSets, setDuoSets] = useState<number>(1);

  const [shapeQuery, setShapeQuery] = useState("");
  const [shapeCategory, setShapeCategory] = useState("Todas");
  const [smallColor, setSmallColor] = useState("#e11d48");
  const [smallCategory, setSmallCategory] = useState("Todas");
  const [pickerTarget, setPickerTarget] = useState<"single" | "duo" | null>(null);
  const [flipSignal, setFlipSignal] = useState<{ side: "front" | "back"; seq: number } | null>(null);

  const [message, setMessage] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const [form, setForm] = useState({ customerName: "", contact: "", address: "" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pichincha");
  const [paymentReference, setPaymentReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash.toLowerCase();
      if (h === "#mascotas") activatePetSection();
      else if (h === "#duo") { setSection("duo"); setDuoFocus("both"); }
      else if (h === "#personalizar") setSection("personalizar");
    };
    const onCustomNav = (e: Event) => {
      const detail = (e as CustomEvent<StudioSection>).detail;
      if (detail === "mascotas") activatePetSection();
      else if (detail === "duo") { setSection("duo"); setDuoFocus("both"); }
      else if (detail === "personalizar") setSection("personalizar");
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
    applyPetId(pickRandomPetId(petGroup, selectedPetId));
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
    const colorPairs: Array<[string, string, string, string]> = [
      ["#e11d48", "#ffffff", "#0ea5e9", "#ffffff"],
      ["#18181b", "#fbbf24", "#be185d", "#fef08a"],
      ["#7c3aed", "#ffffff", "#10b981", "#ffffff"],
      ["#f59e0b", "#1c1917", "#1e3a8a", "#fef08a"],
    ];
    const s1 = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const s2 = Math.random() < 0.45 ? s1 : SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const font = FONTS[Math.floor(Math.random() * FONTS.length)];
    const [bg1, tx1, bg2, tx2] = colorPairs[Math.floor(Math.random() * colorPairs.length)];
    setDuoLabel(`Dúo ${s1.name} & ${s2.name}`);
    setDuoFirst((prev) => ({
      ...prev, base: "superficie", surfaceMaterial: "color", engraveStyle: "color",
      shapeId: s1.id, shapeColor: bg1, textColor: tx1, font, text: prev.text.trim() || "Tú", chain: duoChain,
    }));
    setDuoSecond((prev) => ({
      ...prev, base: "superficie", surfaceMaterial: "color", engraveStyle: "color",
      shapeId: s2.id, shapeColor: bg2, textColor: tx2, font, text: prev.text.trim() || "Yo", chain: duoChain,
    }));
    setDuoFocus("both");
  }
  const patchSingle = (values: Partial<KeychainDesign>) => setDesign((d) => ({ ...d, ...values }));
  const selectShapeSingle = (shapeId: string) => {
    setDesign((d) => ({ ...d, base: "superficie", shapeId }));
    setFlipSignal((f) => ({ side: "front", seq: (f?.seq ?? 0) + 1 }));
  };

  const activeDuo = duoSlot === 1 ? duoFirst : duoSecond;
  const patchActiveDuo = (values: Partial<KeychainDesign>) => {
    if (duoSlot === 1) setDuoFirst((d) => ({ ...d, ...values }));
    else setDuoSecond((d) => ({ ...d, ...values }));
  };

  const syncDuoStyleToOther = () => {
    const src = duoSlot === 1 ? duoFirst : duoSecond;
    const copy: Partial<KeychainDesign> = {
      base: src.base, surfaceMaterial: src.surfaceMaterial, engraveStyle: src.engraveStyle,
      pattern: src.pattern, font: src.font, shapeId: src.shapeId, shapeColor: src.shapeColor,
      textColor: src.textColor, nameOutline: src.nameOutline, size: src.size,
    };
    if (duoSlot === 1) setDuoSecond((d) => ({ ...d, ...copy }));
    else setDuoFirst((d) => ({ ...d, ...copy }));
  };

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
  const isDuo = section === "duo";
  const effectiveKeychainCount = isDuo ? duoSets * 2 : quantity;
  const effectiveChain = isDuo ? duoChain : design.chain;
  const totalPrice = calcTotal(effectiveKeychainCount, effectiveChain);

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
          paymentMethod,
          paymentReference: paymentReference.trim(),
        };
      } else {
        payloadDesign = {
          ...design,
          orderKind: section === "mascotas" ? "mascota" : design.orderKind === "mascota" ? "mascota" : "individual",
          duoPartner: null,
          paymentMethod,
          paymentReference: paymentReference.trim(),
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
    setPaymentReference("");
  }

  const currentShapeInfo = design.shapeId ? SHAPE_MAP[design.shapeId] : SHAPE_MAP["geo-placa-clasica"];
  const currentDuoShape = activeDuo.shapeId ? SHAPE_MAP[activeDuo.shapeId] : SHAPE_MAP["geo-placa-clasica"];
  return (
    <div className="flex h-[calc(100dvh-56px)] w-full flex-col overflow-hidden bg-stone-50 md:grid md:grid-cols-2">
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

      <div className="flex min-h-0 flex-1 flex-col bg-white md:h-full">
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
              Personalizar
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
              Mascotas <span className="hidden sm:inline">10,000</span>
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
              Crear Dúo
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-4 sm:px-5">
          {section === "personalizar" && (
            <div className="space-y-4">
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
                  <p className="text-xs font-black text-stone-900 sm:text-sm">Superficie para Grabar</p>
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
                  <p className="text-xs font-black text-stone-900 sm:text-sm">Nombre como Llavero</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
                    Sale SOLO tu nombre recortado en 3D como llavero (sin placa)
                  </p>
                </button>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {(
                  [
                    ["texto", "Nombre y 40 Letras"],
                    ["formas", "200 Formas"],
                    ["colores", "Colores y Superficie"],
                    ["formitas", "Formitas"],
                    ["arte", "Foto y Dibujo"],
                    ["extras", "Tamaño y Mensaje"],
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
                      className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base font-bold text-stone-900 outline-none focus:border-amber-500"
                    />

                    {design.base === "nombre" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => patchSingle({ nameOutline: false })}
                          className={`flex-1 rounded-xl border-2 px-3 py-2 text-xs font-extrabold ${
                            !design.nameOutline ? "border-amber-500 bg-amber-50 text-amber-950" : "border-stone-200 bg-white text-stone-600"
                          }`}
                        >
                          Solo letras puras (1 color)
                        </button>
                        <button
                          type="button"
                          onClick={() => patchSingle({ nameOutline: true })}
                          className={`flex-1 rounded-xl border-2 px-3 py-2 text-xs font-extrabold ${
                            design.nameOutline ? "border-amber-500 bg-amber-50 text-amber-950" : "border-stone-200 bg-white text-stone-600"
                          }`}
                        >
                          Nombre con borde de color
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => patchSingle({ engraveStyle: "grabado" })}
                          className={`rounded-xl border-2 px-3 py-2 text-xs font-extrabold ${
                            design.engraveStyle === "grabado" ? "border-amber-500 bg-amber-50 text-amber-950" : "border-stone-200 bg-white text-stone-600"
                          }`}
                        >
                          Grabado en superficie
                        </button>
                        <button
                          type="button"
                          onClick={() => patchSingle({ engraveStyle: "color" })}
                          className={`rounded-xl border-2 px-3 py-2 text-xs font-extrabold ${
                            design.engraveStyle === "color" ? "border-amber-500 bg-amber-50 text-amber-950" : "border-stone-200 bg-white text-stone-600"
                          }`}
                        >
                          Letras en relieve a color
                        </button>
                      </div>
                    )}

                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      <ColorField label="Color de letra" value={design.textColor} onChange={(v) => patchSingle({ textColor: v })} />
                      <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600">
                        <span>Tamaño</span>
                        <input
                          type="range"
                          min={0.65}
                          max={1.4}
                          step={0.05}
                          value={design.textScale}
                          onChange={(e) => patchSingle({ textScale: Number(e.target.value) })}
                          className="flex-1 accent-amber-500"
                        />
                        <span className="w-9 text-right text-stone-500">{Math.round(design.textScale * 100)}%</span>
                      </label>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => patchSingle({ textColor: c })}
                          className={`h-7 w-7 rounded-full border-2 ${
                            design.textColor.toLowerCase() === c ? "scale-110 border-amber-500 ring-2 ring-amber-300" : "border-stone-300"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    {design.base === "nombre" && design.nameOutline && (
                      <div className="mt-3">
                        <ColorField label="Color del borde" value={design.shapeColor} onChange={(v) => patchSingle({ shapeColor: v })} />
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={design.backText}
                        maxLength={40}
                        onChange={(e) => patchSingle({ backText: e.target.value })}
                        placeholder="Grabado atrás (opcional: fecha, teléfono, frase)"
                        className="min-w-[180px] flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setFlipSignal((f) => ({ side: "back", seq: (f?.seq ?? 0) + 1 }))}
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700"
                      >
                        Ver atrás 3D
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-stone-600">
                      40 Tipos de letra · Seleccionada: <span className="text-amber-700">{design.font}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {FONTS.map((font) => (
                        <button
                          key={font}
                          type="button"
                          onClick={() => patchSingle({ font })}
                          className={`rounded-xl border-2 px-2.5 py-2 text-left transition ${
                            design.font === font ? "border-amber-500 bg-amber-50 text-amber-950 shadow-sm" : "border-stone-200 bg-white text-stone-700"
                          }`}
                        >
                          <span style={{ fontFamily: `"${font}", sans-serif` }} className="block truncate text-base leading-snug">
                            {design.text.trim() || "Miguel"}
                          </span>
                          <span className="block truncate text-[10px] font-semibold text-stone-400">{font}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {subTab === "formas" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-sm">
                      <ShapeGlyph d={currentShapeInfo.d} size={28} />
                    </span>
                    <div>
                      <p className="text-xs font-black text-stone-900">Forma 3D actual: {currentShapeInfo.name}</p>
                      <p className="text-[11px] text-stone-600">Elige entre {SHAPES.length} formas (incluye 30 de mecanizado)</p>
                    </div>
                  </div>

                  <input
                    type="search"
                    value={shapeQuery}
                    onChange={(e) => setShapeQuery(e.target.value)}
                    placeholder="Buscar entre 200 formas (corazón, engranaje, gato, hueso...)"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-amber-500"
                  />

                  <div className="flex flex-wrap gap-1.5">
                    {["Todas", ...CATEGORIES].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setShapeCategory(cat)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          shapeCategory === cat ? "border-amber-500 bg-amber-500 text-white" : "border-stone-200 bg-stone-50 text-stone-600"
                        }`}
                      >
                        {cat}{cat === "Mecanizado" ? " (30)" : ""}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                    {filteredShapes.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectShapeSingle(s.id)}
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 ${
                          design.base !== "nombre" && design.shapeId === s.id
                            ? "border-amber-500 bg-amber-50 text-amber-700 shadow-sm"
                            : "border-stone-200 bg-white text-stone-600 hover:border-amber-400"
                        }`}
                      >
                        <ShapeGlyph d={s.d} size={32} />
                        <span className="w-full truncate text-center text-[10px] font-bold text-stone-600">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {subTab === "colores" && (
                <div className="space-y-4">
                  {design.base !== "nombre" && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {MATERIALS.map((m) => (
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
                          className={`flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left ${
                            design.surfaceMaterial === m.id ? "border-amber-500 bg-amber-50 shadow-sm" : "border-stone-200 bg-white"
                          }`}
                        >
                          <span className="h-9 w-9 shrink-0 rounded-xl border border-black/10" style={{ background: m.swatch }} />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-extrabold text-stone-900">{m.name}</span>
                            <span className="block truncate text-[10px] text-stone-500">{m.desc}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                    <ColorField
                      label="Color del llavero"
                      value={design.shapeColor}
                      onChange={(v) =>
                        patchSingle(
                          design.base === "nombre" ? { shapeColor: v, nameOutline: true } : { surfaceMaterial: "color", shapeColor: v },
                        )
                      }
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {SURFACE_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            patchSingle(
                              design.base === "nombre"
                                ? { shapeColor: c, nameOutline: true }
                                : { surfaceMaterial: "color", shapeColor: c },
                            )
                          }
                          className="h-8 w-8 rounded-full border-2 border-white shadow"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {design.base !== "nombre" && (
                    <div className="flex flex-wrap gap-2">
                      {PATTERNS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => patchSingle({ pattern: p.id })}
                          className={`rounded-xl border-2 px-3 py-1.5 text-xs font-bold ${
                            design.pattern === p.id ? "border-amber-500 bg-amber-50 text-amber-900" : "border-stone-200 bg-white text-stone-600"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {subTab === "formitas" && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600">Agrega hasta 8 formitas pequeñas ({design.smallShapes.length}/8).</p>
                  {design.smallShapes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
                      {design.smallShapes.map((s, i) => (
                        <span key={`${s.id}-${i}`} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white py-1 pl-1.5 pr-2 text-xs font-bold">
                          <span className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ backgroundColor: s.color }}>
                            <ShapeGlyph d={SHAPE_MAP[s.id]?.d ?? ""} size={14} />
                          </span>
                          <span>{SHAPE_MAP[s.id]?.name ?? s.id}</span>
                          <button
                            type="button"
                            onClick={() => patchSingle({ smallShapes: design.smallShapes.filter((_, idx) => idx !== i) })}
                            className="rounded-full bg-stone-100 px-1.5 text-stone-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ColorField label="Color formita" value={smallColor} onChange={setSmallColor} />
                    <select
                      value={smallCategory}
                      onChange={(e) => setSmallCategory(e.target.value)}
                      className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold"
                    >
                      {["Todas", ...CATEGORIES].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid max-h-80 grid-cols-6 gap-1.5 overflow-y-auto rounded-2xl bg-stone-50 p-2 sm:grid-cols-8">
                    {filteredSmallShapes.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setDesign((d) =>
                            d.smallShapes.length >= 8 ? d : { ...d, smallShapes: [...d.smallShapes, { id: s.id, color: smallColor }] },
                          )
                        }
                        className="grid aspect-square place-items-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:border-amber-400"
                      >
                        <ShapeGlyph d={s.d} size={24} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {subTab === "arte" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                    <h3 className="text-sm font-extrabold text-stone-900">Pon tu propia imagen o foto</h3>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) readAndCropPhoto(file, (url) => patchSingle({ image: url }));
                        e.target.value = "";
                      }}
                      className="mt-3 block w-full cursor-pointer rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
                    />
                    {design.image && (
                      <div className="mt-3 flex items-center gap-3">
                        <img src={design.image} alt="Tu foto" className="h-16 w-16 rounded-full border-2 border-amber-400 object-cover" />
                        <button type="button" onClick={() => patchSingle({ image: "" })} className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600">
                          Quitar imagen
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                    <h3 className="mb-2 text-sm font-extrabold text-stone-900">Dibuja lo que quieras</h3>
                    <DrawingPad value={design.drawing} onChange={(v) => patchSingle({ drawing: v })} />
                  </div>
                </div>
              )}

              {subTab === "extras" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {(["S", "M", "L"] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => patchSingle({ size: sz })}
                        className={`rounded-2xl border-2 p-3 text-center ${
                          design.size === sz ? "border-amber-500 bg-amber-50 text-amber-950 shadow-sm" : "border-stone-200 bg-white text-stone-600"
                        }`}
                      >
                        <span className="block text-sm font-black">{SIZE_INFO[sz].label}</span>
                        <span className="block text-xs text-stone-500">{SIZE_INFO[sz].cm} cm</span>
                      </button>
                    ))}
                  </div>
                  <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 ${design.chain ? "border-amber-500 bg-amber-50" : "border-stone-200 bg-white"}`}>
                    <input type="checkbox" checked={design.chain} onChange={(e) => patchSingle({ chain: e.target.checked })} className="h-5 w-5 accent-amber-500" />
                    <span className="text-sm font-extrabold text-stone-900">Agregar cadenita (+{formatMoney(CHAIN_PRICE)})</span>
                  </label>
                  <textarea
                    value={message}
                    maxLength={600}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Mensaje de lo que deseas agregar a tu llavero..."
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm"
                  />
                </div>
              )}
            </div>
          )}
          {section === "mascotas" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50/70 to-white p-4 shadow-sm">
                <span className="inline-block rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                  10,000 diseños para mascotas
                </span>
                <h2 className="mt-1 text-base font-black text-stone-900">
                  {currentPet.emoji} {currentPet.code} · {currentPet.title}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={triggerRandomPet} className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-white shadow">
                    ¡Diseño Aleatorio! (1 de 10,000)
                  </button>
                  <button type="button" onClick={shufflePetGrid} className="rounded-xl border-2 border-amber-300 bg-white px-3.5 py-2.5 text-xs font-extrabold text-amber-900">
                    12 al azar
                  </button>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => applyPetId(selectedPetId <= 1 ? PET_TOTAL_DESIGNS : selectedPetId - 1)} className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold">
                    ← Ant.
                  </button>
                  <button type="button" onClick={() => applyPetId(selectedPetId >= PET_TOTAL_DESIGNS ? 1 : selectedPetId + 1)} className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold">
                    Sig. →
                  </button>
                  <form onSubmit={(e) => { e.preventDefault(); applyPetId(Number(petJumpInput) || 1); }} className="ml-auto flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-stone-500">Diseño #</span>
                    <input type="number" min={1} max={PET_TOTAL_DESIGNS} value={petJumpInput} onChange={(e) => setPetJumpInput(e.target.value)} className="w-20 rounded-lg border border-stone-300 bg-white px-2 py-1 text-center text-xs font-bold" />
                    <button type="submit" className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-bold text-white">Ir</button>
                  </form>
                </div>
              </div>

              <div className="grid gap-2.5 rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 sm:grid-cols-2">
                <label className="block text-xs font-bold text-stone-700">
                  Nombre de tu mascota
                  <input
                    type="text"
                    value={petName}
                    maxLength={22}
                    onChange={(e) => {
                      setPetName(e.target.value);
                      patchSingle({ text: e.target.value.trim() || currentPet.sampleName });
                    }}
                    placeholder={`Ej: ${currentPet.sampleName}`}
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-bold"
                  />
                </label>
                <label className="block text-xs font-bold text-stone-700">
                  Teléfono grabado atrás
                  <input
                    type="text"
                    value={petPhone}
                    maxLength={22}
                    onChange={(e) => {
                      setPetPhone(e.target.value);
                      patchSingle({ backText: e.target.value.trim() ? `Tel: ${e.target.value.trim()}` : "Mascota amada" });
                    }}
                    placeholder="099 123 4567"
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PET_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => { setPetGroup(g); setPetPage(1); setRandomPetBatch(pickRandomPetBatch(g, PET_PAGE_SIZE)); }}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${petGroup === g ? "border-amber-500 bg-amber-500 text-white" : "border-stone-200 bg-stone-50 text-stone-600"}`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {visiblePets.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyPetId(item.id)}
                    className={`flex flex-col rounded-2xl border-2 p-2.5 text-left ${selectedPetId === item.id ? "border-amber-500 bg-amber-50/80 shadow-md" : "border-stone-200 bg-white"}`}
                  >
                    <div className="flex w-full items-center justify-between text-[10px] font-extrabold text-stone-500">
                      <span>{item.code}</span>
                      <span>{item.emoji}</span>
                    </div>
                    <div className="my-1.5 grid h-16 w-full place-items-center rounded-xl bg-stone-50">
                      <div className="grid h-13 w-13 place-items-center rounded-2xl" style={{ background: petCardBackground(item), color: item.textColor }}>
                        <ShapeGlyph d={SHAPE_MAP[item.shapeId]?.d ?? ""} size={34} />
                      </div>
                    </div>
                    <span className="w-full truncate text-xs font-extrabold text-stone-900">{petName.trim() || item.sampleName}</span>
                    <span className="w-full truncate text-[10px] text-stone-500">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {section === "duo" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-black text-stone-900">Dúo: {duoLabel}</h2>
                  <button type="button" onClick={triggerRandomDuo} className="rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-black text-white">
                    Dúo Aleatorio
                  </button>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1.5">
                  {DUO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyDuoPreset(preset)}
                      className={`shrink-0 rounded-xl border-2 px-3 py-2 text-left ${duoLabel === preset.name ? "border-rose-500 bg-white" : "border-stone-200 bg-white/75"}`}
                    >
                      <span className="block text-xs font-extrabold">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setDuoSlot(1)} className={`flex-1 rounded-xl border-2 px-3 py-2 text-xs font-black ${duoSlot === 1 ? "border-amber-500 bg-amber-50" : "border-stone-200"}`}>
                  Llavero 1: {duoFirst.text.trim() || "Sin nombre"}
                </button>
                <button type="button" onClick={() => setDuoSlot(2)} className={`flex-1 rounded-xl border-2 px-3 py-2 text-xs font-black ${duoSlot === 2 ? "border-amber-500 bg-amber-50" : "border-stone-200"}`}>
                  Llavero 2: {duoSecond.text.trim() || "Sin nombre"}
                </button>
                <button type="button" onClick={syncDuoStyleToOther} className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold">
                  Igualar
                </button>
              </div>

              <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input
                    type="text"
                    value={activeDuo.text}
                    maxLength={24}
                    onChange={(e) => patchActiveDuo({ text: e.target.value })}
                    placeholder={`Nombre Llavero #${duoSlot}`}
                    className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-bold"
                  />
                  <select
                    value={activeDuo.font}
                    onChange={(e) => patchActiveDuo({ font: e.target.value })}
                    className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold"
                  >
                    {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                {activeDuo.base !== "nombre" && (
                  <button type="button" onClick={() => setPickerTarget("duo")} className="flex items-center gap-2 rounded-xl border-2 border-dashed border-amber-400 bg-white px-3.5 py-2 text-xs font-black">
                    <ShapeGlyph d={currentDuoShape.d} size={24} />
                    <span>Forma #{duoSlot}: {currentDuoShape.name}</span>
                  </button>
                )}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <ColorField label="Color llavero" value={activeDuo.shapeColor} onChange={(v) => patchActiveDuo({ surfaceMaterial: "color", shapeColor: v })} />
                  <ColorField label="Color letras" value={activeDuo.textColor} onChange={(v) => patchActiveDuo({ textColor: v })} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-stone-200 bg-stone-50/95 px-3.5 py-2.5 sm:px-5 sm:py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center rounded-full border border-stone-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => (isDuo ? setDuoSets((n) => Math.max(1, n - 1)) : setQuantity((q) => Math.max(1, q - 1)))}
                  className="grid h-7 w-7 place-items-center rounded-full text-sm font-black"
                >
                  −
                </button>
                <span className="min-w-[2.2rem] px-1 text-center text-xs font-black">
                  {isDuo ? `${duoSets} dúo` : quantity}
                </span>
                <button
                  type="button"
                  onClick={() => (isDuo ? setDuoSets((n) => Math.min(25, n + 1)) : setQuantity((q) => Math.min(50, q + 1)))}
                  className="grid h-7 w-7 place-items-center rounded-full text-sm font-black"
                >
                  +
                </button>
              </div>
              <div className="leading-tight">
                <p className="text-[11px] font-semibold text-stone-500">
                  {effectiveKeychainCount} × {formatMoney(UNIT_PRICE)}
                </p>
                <p className="text-lg font-black text-stone-950">{formatMoney(totalPrice)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setCreatedOrderId(null); setOrderError(""); setOrderOpen(true); }}
              className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-black text-white shadow-md hover:bg-amber-600"
            >
              Hacer Pedido
            </button>
          </div>
        </div>
      </div>

      <ShapePicker
        open={pickerTarget !== null}
        title="Elige entre las 200 formas"
        selectedId={pickerTarget === "duo" ? activeDuo.shapeId : design.shapeId}
        onClose={() => setPickerTarget(null)}
        onSelect={(id) => {
          if (pickerTarget === "duo") patchActiveDuo({ base: "superficie", shapeId: id });
          else selectShapeSingle(id);
        }}
      />
      {orderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-3 backdrop-blur-sm">
          <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            {createdOrderId !== null ? (
              <div className="py-4 text-center">
                <h2 className="mt-3 text-2xl font-black text-stone-900">¡Pedido #{createdOrderId} enviado!</h2>
                <p className="mt-2 text-sm text-stone-600">
                  Tu diseño personalizado y forma de pago ya llegaron al panel de los dueños.
                </p>
                <button type="button" onClick={finishAndCreateAnother} className="mt-6 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-black text-white">
                  Seguir diseñando
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-stone-900">Confirmar tu pedido</h2>
                    <p className="text-xs text-stone-500">Total a pagar: {formatMoney(totalPrice)}</p>
                  </div>
                  <button type="button" onClick={() => setOrderOpen(false)} className="rounded-full bg-stone-100 px-3.5 py-1.5 text-xs font-bold text-stone-600">
                    Cerrar
                  </button>
                </div>

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
                    <p><span className="font-bold">Cantidad:</span> {effectiveKeychainCount} {effectiveKeychainCount === 1 ? "llavero" : "llaveros"}</p>
                    <p className="pt-1 text-base font-black text-amber-600">Total: {formatMoney(totalPrice)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-stone-700">
                    Tu nombre completo *
                    <input type="text" value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} placeholder="Ej: Ana Torres" className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-normal" />
                  </label>
                  <label className="block text-xs font-bold text-stone-700">
                    WhatsApp / Teléfono / Correo *
                    <input type="text" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} placeholder="Ej: 099 123 4567" className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-normal" />
                  </label>
                  <label className="block text-xs font-bold text-stone-700 sm:col-span-2">
                    Dirección de entrega (opcional)
                    <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Ciudad, sector y referencia" className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm font-normal" />
                  </label>
                  <label className="block text-xs font-bold text-stone-700 sm:col-span-2">
                    Mensaje adicional (opcional)
                    <textarea value={message} maxLength={600} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Detalles especiales..." className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal" />
                  </label>
                </div>

                {/* Selección de Depósito Banco Pichincha, Deuna o Tarjeta de Débito */}
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-900">
                    Elige tu forma de pago *
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(
                      [
                        ["pichincha", "Banco Pichincha"],
                        ["deuna", "Deuna"],
                        ["debito", "Tarjeta Débito"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPaymentMethod(id)}
                        className={`rounded-xl border-2 px-2.5 py-2 text-xs font-extrabold transition ${
                          paymentMethod === id
                            ? "border-emerald-600 bg-white text-emerald-950 shadow-sm"
                            : "border-emerald-200/80 bg-white/60 text-stone-600 hover:border-emerald-400"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2.5 rounded-xl bg-white p-2.5 text-xs text-stone-700">
                    {paymentMethod === "pichincha" && (
                      <p>
                        <span className="font-bold text-stone-900">Depósito o Transferencia Banco Pichincha:</span>{" "}
                        Cuenta de Ahorros #<strong>[ESCRIBE TU CUENTA]</strong> a nombre de{" "}
                        <strong>Miguel Paillacho</strong>.
                      </p>
                    )}
                    {paymentMethod === "deuna" && (
                      <p>
                        <span className="font-bold text-stone-900">Pago rápido con Deuna:</span>{" "}
                        Transfiere al número <strong>[ESCRIBE TU CELULAR]</strong> (Miguel Paillacho).
                      </p>
                    )}
                    {paymentMethod === "debito" && (
                      <p>
                        <span className="font-bold text-stone-900">Tarjeta de Débito:</span>{" "}
                        Te enviaremos el enlace de pago seguro o cobro contra entrega al confirmar tu pedido.
                      </p>
                    )}
                  </div>

                  {(paymentMethod === "pichincha" || paymentMethod === "deuna") && (
                    <input
                      type="text"
                      value={paymentReference}
                      maxLength={80}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Número de comprobante o nombre quien deposita (opcional)"
                      className="mt-2 w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-600"
                    />
                  )}
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
                  {submitting ? "Enviando pedido..." : `Enviar pedido · ${formatMoney(totalPrice)}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
