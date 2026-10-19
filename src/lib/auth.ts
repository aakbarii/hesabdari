import { getSessionSecret } from "./session-secret";

export const SESSION_COOKIE = "hesabdari_session";
const SESSION_DAYS = 30;

const getSecret = getSessionSecret;

function bytesToBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(str, "base64url"));
  }
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(userId: string): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ userId, exp }))
  );
  const key = await getHmacKey(getSecret());
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return `${payload}.${bytesToBase64Url(new Uint8Array(sig))}`;
}

export async function verifySession(token: string): Promise<string | null> {
  try {
    if (token.length > 4096) return null;
    const dot = token.lastIndexOf(".");
    if (dot <= 0) return null;

    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const key = await getHmacKey(getSecret());

    const sigBytes = Uint8Array.from(base64UrlToBytes(sig));
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payload)
    );
    if (!valid) return null;

    const data = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payload))
    ) as { userId?: string; exp?: number };
    if (typeof data.userId !== "string" || !data.userId ||
      typeof data.exp !== "number" || !Number.isFinite(data.exp) || data.exp <= Date.now()) return null;
    return data.userId;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};
