import { NextRequest } from "next/server";
import { buildClearAdminCookieHeader } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return Response.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": buildClearAdminCookieHeader(req),
        "Cache-Control": "no-store",
      },
    },
  );
}
