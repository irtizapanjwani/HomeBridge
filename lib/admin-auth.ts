// Sign-in for /admin.
//
// One shared password (ADMIN_PASSWORD) held in the environment, exchanged for a signed, httpOnly
// session cookie. That is enough to stop the page being open to anyone with the URL, which is what
// it was before. It is NOT enough on its own for a system holding ID numbers: before real members
// use this, give each officer their own account with 2FA, so the audit log can name who did what.

import { cookies } from "next/headers";

export const SESSION_COOKIE = "hb_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8; // a working day

const enc = new TextEncoder();

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("ADMIN_PASSWORD is not set");
  return enc.encode(value);
}

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function sign(payload: string) {
  const key = await crypto.subtle.importKey("raw", secret(), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

/** Compares without leaking where two strings differ. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const isAuthConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

export function checkPassword(given: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  return safeEqual(given, expected);
}

export async function createSession() {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expires}`;
  const token = `${payload}.${await sign(payload)}`;
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** True when the request carries a session this server signed, and it has not expired. */
export async function isSignedIn() {
  if (!isAuthConfigured()) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const at = token.lastIndexOf(".");
  if (at < 1) return false;
  const payload = token.slice(0, at);
  const given = token.slice(at + 1);
  try {
    if (!safeEqual(given, await sign(payload))) return false;
  } catch {
    return false;
  }
  const expires = Number(payload.split(".")[1]);
  return Number.isFinite(expires) && expires > Date.now();
}
