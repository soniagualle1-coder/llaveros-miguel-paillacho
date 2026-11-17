import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import {
  buildAdminCookieHeader,
  isAdminAuthorized,
  issueAdminToken,
  verifyAdminPassword,
} from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return Response.json(
      { ok: false, authenticated: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const rows = await db.select().from(orders).orderBy(desc(orders.id));
    return Response.json(
      { ok: true, authenticated: true, orders: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Mantiene la sesión activa incluso si hay un error puntual de lectura
    return Response.json(
      { ok: true, authenticated: true, orders: [], dbWarning: "Reintenta cargar los pedidos en unos segundos." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(req: NextRequest) {
  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return Response.json(
      { ok: false, error: "Formato de solicitud inválido." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!verifyAdminPassword(password)) {
    return Response.json(
      { ok: false, error: "Contraseña incorrecta. Revisa que esté bien escrita sin espacios." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const token = issueAdminToken();
  let rows: (typeof orders.$inferSelect)[] = [];
  let dbWarning = "";
  try {
    rows = await db.select().from(orders).orderBy(desc(orders.id));
  } catch {
    dbWarning = "Sesión iniciada. Pulsa Actualizar para recargar los pedidos.";
  }

  return Response.json(
    { ok: true, authenticated: true, token, orders: rows, dbWarning: dbWarning || undefined },
    {
      status: 200,
      headers: {
        "Set-Cookie": buildAdminCookieHeader(token, req),
        "Cache-Control": "no-store",
      },
    },
  );
}
