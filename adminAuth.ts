import crypto from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "mp_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export function getAdminPassword(): string {
  const envVal = process.env.ADMIN_PASSWORD;
  if (envVal && envVal.trim().length > 0) {
    return envVal.trim();
  }
  return "miguelpaillacho";
}

function getSigningKey(): Buffer {
  return crypto
    .createHash("sha256")
    .update(`llaveros-mp-owner-session-v2:${getAdminPassword()}`)
    .digest();
}

function safeEqualStrings(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a, "utf8").digest();
  const hb = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function verifyAdminPassword(candidate: string): boolean {
  if (typeof candidate !== "string") return false;
  const cleaned = candidate.trim();
  if (!cleaned) return false;
  const expected = getAdminPassword();
  if (safeEqualStrings(cleaned, expected)) return true;
  // Tolera mayúscula inicial automática de teclados móviles si la clave es en minúsculas
  if (expected === expected.toLowerCase() && safeEqualStrings(cleaned.toLowerCase(), expected)) {
    return true;
  }
  return false;
}

export function issueAdminToken(): string {
  const exp = String(Date.now() + SESSION_TTL_MS);
  const nonce = crypto.randomBytes(12).toString("hex");
  const payload = `${exp}.${nonce}`;
  const sig = crypto.createHmac("sha256", getSigningKey()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return false;
  const [expStr, nonce, providedSig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  if (!nonce || nonce.length < 8 || !providedSig || providedSig.length !== 64) return false;

  const payload = `${expStr}.${nonce}`;
  const expectedSig = crypto.createHmac("sha256", getSigningKey()).update(payload).digest("hex");
  return safeEqualStrings(providedSig, expectedSig);
}

export function isAdminAuthorized(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (verifyAdminToken(cookieToken)) return true;

  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (verifyAdminToken(bearer)) return true;
  }

  const headerToken = req.headers.get("x-admin-token");
  if (verifyAdminToken(headerToken)) return true;

  const legacyKey = req.headers.get("x-admin-key");
  if (legacyKey && verifyAdminPassword(legacyKey)) return true;

  return false;
}

export function buildAdminCookieHeader(token: string, req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
  const isHttps = proto === "https";
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  if (isHttps) {
    return `${ADMIN_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None`;
  }
  return `${ADMIN_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
}

export function buildClearAdminCookieHeader(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
  const isHttps = proto === "https";
  if (isHttps) {
    return `${ADMIN_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`;
  }
  return `${ADMIN_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}
