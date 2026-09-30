/**
 * Session token: base64url(payload JSON) + "." + hex(HMAC-SHA256 signature)
 *
 * Dùng Web Crypto API (crypto.subtle) thay vì thư viện JWT vì nó chạy được
 * cả ở Node (Server Actions) lẫn Edge runtime (middleware.ts), không cần
 * thêm dependency.
 */

export type SessionPayload = {
  userId: string;
  email: string;
  displayName: string;
  issuedAt: number;
};

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(
  payload: SessionPayload,
  secret: string
): Promise<string> {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const encodedPayload = base64UrlEncode(payloadBytes);
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload)
  );
  return `${encodedPayload}.${toHex(signature)}`;
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<SessionPayload | null> {
  const [encodedPayload, signatureHex] = token.split(".");
  if (!encodedPayload || !signatureHex) return null;

  const key = await hmacKey(secret);
  const expectedSignature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload)
  );
  if (toHex(expectedSignature) !== signatureHex) return null;

  try {
    const json = new TextDecoder().decode(base64UrlDecode(encodedPayload));
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = "abms_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 giờ
