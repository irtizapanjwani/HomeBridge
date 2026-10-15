// Sign-in for members: the password they set when they registered.
//
// Passwords are hashed with scrypt and a per-password salt, so the stored value cannot be reversed
// and two people with the same password have different hashes. The plain password is never stored,
// never logged, and never sent back to the browser.

import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { collections, normEmail } from "@/lib/members";

const scrypt = promisify(scryptCb) as (p: string | Buffer, s: string | Buffer, k: number) => Promise<Buffer>;

const KEY_LENGTH = 64;
export const SESSION_COOKIE = "hb_member";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // a month

export const MIN_PASSWORD_LENGTH = 10;

/** Stored as scrypt$<salt hex>$<hash hex>, so the format can change later without guessing. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** A password long enough to be worth hashing. Length beats punctuation rules. */
export function passwordProblem(password: string): string | null {
  if (password.trim().length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters. A few words together is easiest to remember.`;
  }
  if (password.length > 200) return "That password is too long.";
  return null;
}

// ---------- Session ----------

const enc = new TextEncoder();

function secret() {
  const value = process.env.MEMBER_SESSION_SECRET;
  if (!value) throw new Error("MEMBER_SESSION_SECRET is not set");
  return enc.encode(value);
}

const b64url = (bytes: ArrayBuffer) =>
  Buffer.from(new Uint8Array(bytes)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sign(payload: string) {
  const key = await crypto.subtle.importKey("raw", secret(), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const isMemberAuthConfigured = () => Boolean(process.env.MEMBER_SESSION_SECRET);

export async function createMemberSession(reference: string) {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${reference}.${expires}`;
  const store = await cookies();
  store.set(SESSION_COOKIE, `${payload}.${await sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearMemberSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in member's reference, or null. */
export async function currentMemberRef(): Promise<string | null> {
  if (!isMemberAuthConfigured()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const at = token.lastIndexOf(".");
  if (at < 1) return null;
  const payload = token.slice(0, at);
  try {
    if (!safeEqual(token.slice(at + 1), await sign(payload))) return null;
  } catch {
    return null;
  }
  const [reference, expiresRaw] = payload.split(".");
  const expires = Number(expiresRaw);
  if (!reference || !Number.isFinite(expires) || expires <= Date.now()) return null;
  return reference;
}

/** Looks up a member by the email they registered with. */
export async function findMemberByEmail(email: string) {
  const { members } = await collections();
  return members.findOne({ emailNorm: normEmail(email) }, { sort: { submittedAt: -1 } });
}

export async function findMemberByRef(reference: string) {
  const { members } = await collections();
  return members.findOne({ reference });
}
