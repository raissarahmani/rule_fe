import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "__Secure-rule-session";
export const LOGIN_COOKIE = "__Secure-rule-login";
export function loginCookie(state: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(state)) throw new Error("Invalid login state");
  return `${LOGIN_COOKIE}-${state}`;
}
const CHUNK_SIZE = 3500;
const MAX_CHUNKS = 6;

export type CookieReader = { get(name: string): { value: string } | undefined };
type CookieWriter = CookieReader & {
  set(name: string, value: string, options: {
    httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; maxAge: number;
  }): unknown;
};

function key(secret: string) {
  if (secret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return createHash("sha256").update(secret).digest();
}

export function seal(data: unknown, purpose: string, secret: string, maxAge: number) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from(purpose));
  const plaintext = JSON.stringify({ expiresAt: Date.now() + maxAge * 1000, data });
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function unseal<T>(value: string, purpose: string, secret: string): T | null {
  try {
    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(secret), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(purpose));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const plaintext = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
    const result = JSON.parse(plaintext.toString("utf8"));
    if (typeof result.expiresAt !== "number" || result.expiresAt <= Date.now()) return null;
    return result.data as T;
  } catch {
    return null;
  }
}

export function readEncryptedCookie<T>(cookies: CookieReader, name: string, secret: string) {
  let value = cookies.get(name)?.value || "";
  if (!value) return null;
  for (let chunk = 1; chunk < MAX_CHUNKS; chunk++) value += cookies.get(`${name}.${chunk}`)?.value || "";
  return unseal<T>(value, name, secret);
}

export function clearCookie(cookies: CookieWriter, name: string) {
  for (let chunk = 0; chunk < MAX_CHUNKS; chunk++) {
    cookies.set(chunk ? `${name}.${chunk}` : name, "", {
      httpOnly: true, secure: true, sameSite: "lax", path: "/rule", maxAge: 0,
    });
  }
}

export function writeEncryptedCookie(cookies: CookieWriter, name: string, data: unknown, secret: string, maxAge: number) {
  const value = seal(data, name, secret, maxAge);
  if (value.length > CHUNK_SIZE * MAX_CHUNKS) throw new Error("OIDC session exceeds the supported cookie size");
  clearCookie(cookies, name);
  for (let offset = 0, chunk = 0; offset < value.length; offset += CHUNK_SIZE, chunk++) {
    cookies.set(chunk ? `${name}.${chunk}` : name, value.slice(offset, offset + CHUNK_SIZE), {
      httpOnly: true, secure: true, sameSite: "lax", path: "/rule", maxAge,
    });
  }
}
