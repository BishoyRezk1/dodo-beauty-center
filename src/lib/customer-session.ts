import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "zina_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function key() {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET missing");
  return crypto.createHmac("sha256", s).update("zina-customer-session-v1").digest();
}
const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

function sign(payload: object) {
  const body = b64(JSON.stringify(payload));
  const sig = b64(crypto.createHmac("sha256", key()).update(body).digest());
  return `${body}.${sig}`;
}

function verify(token: string): { cid: string; exp: number } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", key()).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof p.cid !== "string" || typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    return p;
  } catch {
    return null;
  }
}

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/"
};

export function setCustomerSession(customerId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  cookies().set(COOKIE, sign({ cid: customerId, exp }), { ...cookieOpts, maxAge: MAX_AGE });
}

export function clearCustomerSession() {
  cookies().set(COOKIE, "", { ...cookieOpts, maxAge: 0 });
}

export async function getCustomer() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const p = verify(token);
  if (!p) return null;
  const c = await prisma.customer.findUnique({ where: { id: p.cid } });
  if (!c || c.isBlocked || !c.passwordHash) return null;
  return c;
}
