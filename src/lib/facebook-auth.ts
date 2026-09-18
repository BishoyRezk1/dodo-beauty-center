import crypto from "crypto";

const COOKIE_NAME = "fb_review_session";
const SESSION_TTL_MS = 60 * 60 * 1000; // ساعة واحدة، تكفي للتسجيل وكتابة التقييم

function getSigningSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return secret;
}

export function buildFacebookAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.FACEBOOK_CLIENT_ID || "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "public_profile",
    response_type: "code"
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForAccessToken(code: string, redirectUri: string): Promise<string> {
  const clientId = process.env.FACEBOOK_CLIENT_ID || "";
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || "";
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code
  });
  const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error?.message || "فشل تسجيل الدخول بالفيسبوك");
  }
  return data.access_token as string;
}

export async function getFacebookProfile(accessToken: string): Promise<{ id: string; name: string }> {
  const params = new URLSearchParams({ fields: "id,name", access_token: accessToken });
  const res = await fetch(`https://graph.facebook.com/me?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error("تعذر جلب بيانات حساب الفيسبوك");
  }
  return { id: data.id as string, name: (data.name as string) || "عميل فيسبوك" };
}

export function createSessionToken(fbId: string, name: string): string {
  const payload = JSON.stringify({ id: fbId, name, exp: Date.now() + SESSION_TTL_MS });
  const encoded = Buffer.from(payload, "utf-8").toString("base64url");
  const sig = crypto.createHmac("sha256", getSigningSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): { id: string; name: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", getSigningSecret()).update(encoded).digest("base64url");
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return { id: payload.id, name: payload.name };
  } catch {
    return null;
  }
}

export const FB_COOKIE_NAME = COOKIE_NAME;
export const FB_SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;
