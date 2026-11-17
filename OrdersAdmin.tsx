"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import DesignPreview from "./DesignPreview";
import { SHAPE_MAP } from "@/lib/shapes";
import { SIZE_INFO, formatMoney } from "@/lib/pricing";
import { normalizeDesign } from "@/lib/types";
import type { KeychainDesign } from "@/lib/types";

const TOKEN_STORAGE_KEY = "mp_llaveros_owner_token_v2";
const STATUSES = ["pendiente", "en producción", "listo", "entregado"] as const;

type OrderRow = {
  id: number;
  customerName: string;
  contact: string;
  address: string;
  quantity: number;
  unitPrice: number;
  extrasTotal: number;
  total: number;
  design: Partial<KeychainDesign>;
  image: string;
  drawing: string;
  message: string;
  status: string;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-900 border-amber-200",
  "en producción": "bg-sky-100 text-sky-900 border-sky-200",
  listo: "bg-indigo-100 text-indigo-900 border-indigo-200",
  entregado: "bg-emerald-100 text-emerald-900 border-emerald-200",
};

const MATERIAL_LABELS: Record<string, string> = {
  madera: "Madera Roble",
  nogal: "Madera Nogal",
  color: "Color Acrílico",
  "metal-oro": "Placa Dorada",
  "metal-plata": "Acero Plata",
  marmol: "Mármol Perla",
};

function readStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  } catch {
    try {
      return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }
}

function writeStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* ignorar en iframes con almacenamiento restringido */
  }
  try {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* ignorar */
  }
}

function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignorar */
  }
  try {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignorar */
  }
}

function buildAuthHeaders(token: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra ?? {}) };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export default function OrdersAdmin() {
  const [authState, setAuthState] = useState<"checking" | "locked" | "unlocked">("checking");
  const tokenRef = useRef<string>("");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [panelNotice, setPanelNotice] = useState("");
  const [filter, setFilter] = useState<string>("todos");
  const [query, setQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Verificar al entrar si ya existe sesión activa de dueño (sin parpadeos ni cierres)
  useEffect(() => {
    let alive = true;
    const stored = readStoredToken();
    tokenRef.current = stored;

    (async () => {
      try {
        const res = await fetch("/api/admin/login", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: buildAuthHeaders(stored),
        });
        if (!alive) return;
        if (res.ok) {
          const data = (await res.json()) as {
            authenticated?: boolean;
            orders?: OrderRow[];
            dbWarning?: string;
          };
          if (data.authenticated) {
            setOrders(Array.isArray(data.orders) ? data.orders : []);
            setPanelNotice(data.dbWarning || "");
            setAuthState("unlocked");
            return;
          }
        }
        setAuthState("locked");
      } catch {
        if (alive) setAuthState("locked");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Recargar pedidos SIN cerrar jamás la sesión ante fallos temporales
  const refreshOrders = useCallback(async (silent = false) => {
    if (!silent) {
      setRefreshing(true);
      setPanelNotice("");
    }
    try {
      const res = await fetch("/api/orders", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: buildAuthHeaders(tokenRef.current),
      });
      if (!res.ok) {
        if (!silent) {
          setPanelNotice("No se pudo actualizar en este momento. Pulsa Actualizar nuevamente.");
        }
        return;
      }
      const data = (await res.json()) as { orders?: OrderRow[] };
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
        setPanelNotice("");
      }
    } catch {
      if (!silent) {
        setPanelNotice("Conexión lenta. Tus pedidos siguen seguros; pulsa Actualizar.");
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  // Actualización silenciosa cada 15s para recibir nuevos pedidos en vivo (jamás cierra el panel)
  useEffect(() => {
    if (authState !== "unlocked") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshOrders(true);
      }
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [authState, refreshOrders]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = password.trim();
    if (!cleaned) {
      setLoginError("Escribe la contraseña de dueños para ingresar.");
      return;
    }
    setVerifying(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: cleaned }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        orders?: OrderRow[];
        error?: string;
        dbWarning?: string;
      };
      if (!res.ok || !data.ok) {
        setLoginError(data.error || "Contraseña incorrecta.");
        return;
      }
      const newToken = data.token || "";
      tokenRef.current = newToken;
      if (newToken) writeStoredToken(newToken);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setPanelNotice(data.dbWarning || "");
      setPassword("");
      setAuthState("unlocked");
    } catch {
      setLoginError("Error de conexión al verificar la contraseña. Inténtalo de nuevo.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleLogout() {
    tokenRef.current = "";
    clearStoredToken();
    setOrders([]);
    setPassword("");
    setLoginError("");
    setPanelNotice("");
    setAuthState("locked");
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignorar */
    }
  }

  async function changeStatus(id: number, status: string) {
    const prevOrders = orders;
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: buildAuthHeaders(tokenRef.current, { "Content-Type": "application/json" }),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setOrders(prevOrders);
        setPanelNotice("No se pudo guardar el cambio de estado. Intenta de nuevo.");
      }
    } catch {
      setOrders(prevOrders);
      setPanelNotice("No se pudo guardar el cambio de estado.");
    }
  }

  async function deleteOrder(id: number) {
    setConfirmDeleteId(null);
    const prevOrders = orders;
    setOrders((list) => list.filter((o) => o.id !== id));
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: buildAuthHeaders(tokenRef.current),
      });
      if (!res.ok) {
        setOrders(prevOrders);
        setPanelNotice("No se pudo eliminar el pedido.");
      }
    } catch {
      setOrders(prevOrders);
      setPanelNotice("No se pudo eliminar el pedido.");
    }
  }

  /* -------------------------- Estado inicial breve -------------------------- */
  if (authState === "checking") {
    return (
      <section className="grid min-h-[calc(100dvh-56px)] place-items-center px-4 py-12">
        <div className="rounded-3xl border border-stone-200 bg-white px-8 py-7 text-center shadow-sm">
          <p className="text-sm font-extrabold text-stone-700">Verificando acceso de dueños…</p>
        </div>
      </section>
    );
  }

  /* ------------------------ Pantalla de contraseña -------------------------- */
  if (authState === "locked") {
    return (
      <section className="grid min-h-[calc(100dvh-56px)] place-items-center bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50/40 px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-7 shadow-xl sm:p-8">
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-2xl shadow-inner">
              🔐
            </div>
            <h1 className="mt-3 text-2xl font-black text-stone-900">Acceso para dueños</h1>
            <p className="mt-1.5 text-sm text-stone-500">
              Apartado exclusivo de la empresa. Ingresa la contraseña para ver quién está pidiendo
              llaveros, sus diseños, fotos y mensajes.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-3.5" noValidate>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="owner-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError("");
                }}
                placeholder="Escribe la contraseña"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                className="w-full rounded-xl border-2 border-stone-300 bg-stone-50 py-3 pl-4 pr-20 text-base font-bold text-stone-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg bg-stone-200/80 px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-300"
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>

            {loginError && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-bold text-red-700"
              >
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full rounded-full bg-amber-500 px-5 py-3.5 text-base font-black text-white shadow-md transition hover:bg-amber-600 active:scale-[0.99] disabled:opacity-60"
            >
              {verifying ? "Verificando contraseña…" : "Entrar al panel de pedidos"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/"
              className="text-xs font-bold text-stone-500 underline-offset-4 hover:text-amber-700 hover:underline"
            >
              ← Volver al personalizador 3D
            </Link>
          </div>
        </div>
      </section>
    );
  }

  /* --------------------- Panel privado de los dueños ------------------------ */
  const filtered = orders.filter((o) => {
    const okStatus = filter === "todos" || o.status === filter;
    const q = query.trim().toLowerCase();
    const okQuery =
      !q ||
      o.customerName.toLowerCase().includes(q) ||
      o.contact.toLowerCase().includes(q) ||
      o.message.toLowerCase().includes(q) ||
      String(o.id).includes(q);
    return okStatus && okQuery;
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0) / 100;
  const totalKeychains = orders.reduce((sum, o) => sum + (Number(o.quantity) || 1), 0);
  const pendingCount = orders.filter((o) => o.status === "pendiente").length;

  return (
    <section className="mx-auto min-h-[calc(100dvh-56px)] w-full max-w-6xl px-4 py-6 sm:px-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-black text-emerald-800">
            ● Sesión de dueño activa
          </span>
          <h1 className="mt-1 text-2xl font-black text-stone-900 sm:text-3xl">
            Panel de Pedidos · Llaveros
          </h1>
          <p className="text-xs text-stone-500 sm:text-sm">
            Aquí llegan todos los pedidos, mensajes, fotos, dibujos, mascotas y dúos. Se actualiza automáticamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-xs font-bold text-stone-700 hover:border-amber-400"
          >
            ← Personalizador
          </Link>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void refreshOrders(false)}
            className="rounded-full border-2 border-amber-400 bg-amber-50 px-4 py-2 text-xs font-extrabold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
          >
            {refreshing ? "Actualizando…" : "🔄 Actualizar"}
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-full border-2 border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600 transition hover:border-red-300 hover:text-red-600"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {panelNotice && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
          {panelNotice}
        </div>
      )}

      {/* Métricas rápidas */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">Pedidos</p>
          <p className="mt-1 text-2xl font-black text-stone-900 sm:text-3xl">{orders.length}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">Pendientes</p>
          <p className="mt-1 text-2xl font-black text-amber-600 sm:text-3xl">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
            Llaveros pedidos
          </p>
          <p className="mt-1 text-2xl font-black text-sky-700 sm:text-3xl">{totalKeychains}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">Total ventas</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 sm:text-3xl">
            {formatMoney(totalRevenue)}
          </p>
        </div>
      </div>

      {/* Buscador y filtros */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre del cliente, teléfono, mensaje o # de pedido..."
          className="min-w-[220px] flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-500"
        />
        <div className="flex flex-wrap gap-1.5">
          {["todos", ...STATUSES].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-extrabold capitalize transition ${
                filter === s
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-amber-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de pedidos */}
      {filtered.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-sm">
          <p className="text-base font-bold text-stone-500">
            {orders.length === 0
              ? "Aún no han llegado pedidos. Cuando un cliente haga un pedido aparecerá aquí al instante."
              : `No hay pedidos que coincidan con el filtro “${filter}”.`}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {filtered.map((o) => {
            const d = normalizeDesign({
              ...(o.design ?? {}),
              image: o.design?.image || o.image || "",
              drawing: o.design?.drawing || o.drawing || "",
            });
            const partner = d.duoPartner ? normalizeDesign(d.duoPartner) : null;
            const shapeName =
              d.base === "nombre"
                ? "Solo Nombre recortado"
                : SHAPE_MAP[d.shapeId || "geo-placa-clasica"]?.name ?? d.shapeId ?? "Placa clásica";
            const partnerShapeName = partner
              ? partner.base === "nombre"
                ? "Solo Nombre recortado"
                : SHAPE_MAP[partner.shapeId || "geo-placa-clasica"]?.name ?? "Placa clásica"
              : "";

            return (
              <article
                key={o.id}
                className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div
                  className={`grid gap-4 ${
                    partner ? "md:grid-cols-[240px_1fr]" : "sm:grid-cols-[155px_1fr]"
                  }`}
                >
                  {/* Miniatura(s) fiel(es) del diseño */}
                  {partner ? (
                    <div className="grid grid-cols-2 gap-2 self-start">
                      <div>
                        <DesignPreview design={d} />
                        <p className="mt-1 text-center text-[10px] font-bold text-stone-500">
                          Llavero #1
                        </p>
                      </div>
                      <div>
                        <DesignPreview design={partner} />
                        <p className="mt-1 text-center text-[10px] font-bold text-stone-500">
                          Llavero #2
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-36 self-start sm:w-full">
                      <DesignPreview design={d} />
                    </div>
                  )}

                  {/* Detalles del cliente y del pedido */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-black text-white">
                        Pedido #{o.id}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-0.5 text-xs font-extrabold capitalize ${
                          STATUS_STYLES[o.status] ?? "border-stone-200 bg-stone-100 text-stone-700"
                        }`}
                      >
                        {o.status}
                      </span>
                      {partner ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-extrabold text-rose-800">
                          💞 Dúo: {d.duoName || "Personalizado"}
                        </span>
                      ) : d.orderKind === "mascota" && d.petDesignId ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-900">
                          🐾 {d.petDesignTitle || `Mascota #${d.petDesignId}`}
                        </span>
                      ) : (
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-700">
                          {d.base === "nombre" ? "🔤 Nombre como llavero" : "🪵 Superficie grabada"}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-stone-400">
                        {new Date(o.createdAt).toLocaleString("es-EC")}
                      </span>
                    </div>

                    {/* Datos de quién pide */}
                    <div className="rounded-2xl bg-stone-50 p-3">
                      <p className="text-base font-black text-stone-900">👤 {o.customerName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-700 sm:text-sm">
                        <span>
                          <span className="font-bold">Contacto:</span> {o.contact}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(o.contact).catch(() => {});
                            setCopiedId(o.id);
                            setTimeout(() => setCopiedId(null), 1500);
                          }}
                          className="rounded-md border border-stone-300 bg-white px-2 py-0.5 text-[11px] font-bold text-stone-600 hover:border-amber-400"
                        >
                          {copiedId === o.id ? "✓ Copiado" : "Copiar"}
                        </button>
                        {o.address && (
                          <span>
                            <span className="font-bold">Dirección:</span> {o.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Especificaciones de fabricación */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-700">
                      <span>
                        <span className="font-bold">Cantidad:</span> {o.quantity}{" "}
                        {o.quantity === 1 ? "llavero" : "llaveros"}
                      </span>
                      <span>
                        <span className="font-bold">Forma:</span> {shapeName}
                      </span>
                      {d.base !== "nombre" && (
                        <span>
                          <span className="font-bold">Superficie:</span>{" "}
                          {MATERIAL_LABELS[d.surfaceMaterial] ?? d.surfaceMaterial}
                        </span>
                      )}
                      <span>
                        <span className="font-bold">Texto:</span> “{d.text || "—"}” ({d.font})
                      </span>
                      {d.backText && (
                        <span>
                          <span className="font-bold">Atrás:</span> “{d.backText}”
                        </span>
                      )}
                      <span>
                        <span className="font-bold">Tamaño:</span>{" "}
                        {SIZE_INFO[d.size]?.label ?? d.size} ({SIZE_INFO[d.size]?.cm ?? 7} cm)
                      </span>
                      <span>
                        <span className="font-bold">Formitas:</span> {d.smallShapes.length}
                      </span>
                      <span>
                        <span className="font-bold">Cadenita:</span> {d.chain ? "Sí (+$1.00)" : "No"}
                      </span>
                      <span className="text-sm font-black text-amber-700">
                        Total: {formatMoney((Number(o.total) || 0) / 100)}
                      </span>
                    </div>

                    {partner && (
                      <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2 text-xs text-stone-700">
                        <span className="font-bold text-rose-800">Llavero #2 del Dúo:</span>{" "}
                        {partnerShapeName} · Texto: “{partner.text || "—"}” ({partner.font}) ·
                        Tamaño {SIZE_INFO[partner.size]?.cm ?? 7} cm
                      </div>
                    )}

                    {/* Mensaje del cliente */}
                    {o.message && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                        <span className="font-extrabold">💬 Mensaje del cliente:</span> {o.message}
                      </div>
                    )}

                    {/* Descarga rápida si subió foto o dibujo */}
                    {(d.image || d.drawing || partner?.image) && (
                      <div className="flex flex-wrap gap-2">
                        {d.image && (
                          <a
                            href={d.image}
                            download={`pedido-${o.id}-foto.jpg`}
                            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:border-amber-400"
                          >
                            ⬇ Descargar foto cliente
                          </a>
                        )}
                        {partner?.image && (
                          <a
                            href={partner.image}
                            download={`pedido-${o.id}-foto-duo2.jpg`}
                            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:border-amber-400"
                          >
                            ⬇ Descargar foto #2
                          </a>
                        )}
                        {d.drawing && (
                          <a
                            href={d.drawing}
                            download={`pedido-${o.id}-dibujo.png`}
                            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:border-amber-400"
                          >
                            ⬇ Descargar dibujo cliente
                          </a>
                        )}
                      </div>
                    )}

                    {/* Acciones: estado y eliminación en 2 toques */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <label className="text-xs font-bold text-stone-500">
                        Estado:
                        <select
                          value={o.status}
                          onChange={(e) => void changeStatus(o.id, e.target.value)}
                          className="ml-2 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-extrabold text-stone-800 outline-none focus:border-amber-500"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>

                      {confirmDeleteId === o.id ? (
                        <div className="ml-auto flex items-center gap-1.5">
                          <span className="text-xs font-bold text-red-600">¿Eliminar?</span>
                          <button
                            type="button"
                            onClick={() => void deleteOrder(o.id)}
                            className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-red-700"
                          >
                            Sí, borrar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-600"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(o.id)}
                          className="ml-auto rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-500 transition hover:border-red-300 hover:text-red-600"
                        >
                          🗑 Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
