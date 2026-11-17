import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { UNIT_PRICE, CHAIN_PRICE } from "@/lib/pricing";
import { normalizeDesign } from "@/lib/types";
import type { KeychainDesign } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return Response.json(
      { error: "Contraseña o sesión no autorizada" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const rows = await db.select().from(orders).orderBy(desc(orders.id));
    return Response.json(
      { ok: true, orders: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "No se pudieron cargar los pedidos temporalmente" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      customerName?: string;
      contact?: string;
      address?: string;
      quantity?: number;
      message?: string;
      design?: Partial<KeychainDesign>;
    };

    const customerName = String(body.customerName ?? "").trim().slice(0, 120);
    const contact = String(body.contact ?? "").trim().slice(0, 120);
    const address = String(body.address ?? "").trim().slice(0, 240);
    const message = String(body.message ?? "").trim().slice(0, 1000);

    if (customerName.length < 2) {
      return Response.json({ error: "Escribe tu nombre completo" }, { status: 400 });
    }
    if (contact.length < 5) {
      return Response.json({ error: "Escribe un teléfono, WhatsApp o correo válido" }, { status: 400 });
    }

    const design = normalizeDesign(body.design);
    design.image = design.image.slice(0, 3_500_000);
    design.drawing = design.drawing.slice(0, 3_500_000);
    if (design.duoPartner) {
      design.duoPartner = {
        ...design.duoPartner,
        image: design.duoPartner.image.slice(0, 3_500_000),
        drawing: design.duoPartner.drawing.slice(0, 3_500_000),
      };
    }

    const isDuo = design.orderKind === "duo" && Boolean(design.duoPartner);
    const rawQty = Math.max(1, Math.min(100, Math.floor(Number(body.quantity) || (isDuo ? 2 : 1))));
    const quantity = isDuo ? Math.max(2, rawQty % 2 === 0 ? rawQty : rawQty + 1) : rawQty;

    const unitPriceCents = Math.round(UNIT_PRICE * 100);
    const extrasTotal = design.chain ? Math.round(CHAIN_PRICE * 100) : 0;
    const total = quantity * unitPriceCents + extrasTotal;

    const [row] = await db
      .insert(orders)
      .values({
        customerName,
        contact,
        address,
        quantity,
        unitPrice: unitPriceCents,
        extrasTotal,
        total,
        design,
        image: design.image,
        drawing: design.drawing,
        message,
        status: "pendiente",
      })
      .returning({ id: orders.id });

    return Response.json({ ok: true, id: row.id, quantity, total });
  } catch {
    return Response.json({ error: "No se pudo registrar el pedido" }, { status: 500 });
  }
}
