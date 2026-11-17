import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const STATUSES = ["pendiente", "en producción", "listo", "entregado"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthorized(req)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return Response.json({ error: "Pedido inválido" }, { status: 400 });
    }
    const body = (await req.json()) as { status?: string };
    const status = String(body.status ?? "");
    if (!STATUSES.includes(status)) {
      return Response.json({ error: "Estado inválido" }, { status: 400 });
    }
    await db.update(orders).set({ status }).where(eq(orders.id, orderId));
    return Response.json({ ok: true, status });
  } catch {
    return Response.json({ error: "No se pudo actualizar el pedido" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthorized(req)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return Response.json({ error: "Pedido inválido" }, { status: 400 });
    }
    await db.delete(orders).where(eq(orders.id, orderId));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "No se pudo eliminar el pedido" }, { status: 500 });
  }
}
