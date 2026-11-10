import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import {
  clearMemberSession,
  createMemberSession,
  findMemberByEmail,
  isMemberAuthConfigured,
  verifyPassword,
} from "@/lib/member-auth";

/** A small limit on wrong guesses per address, so a password cannot be tried thousands of times. */
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 10;

function tooMany(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.until < now) {
    attempts.set(key, { count: 1, until: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: Request) {
  if (!isMemberAuthConfigured() || !isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Sign-in is not configured" }, { status: 503 });
  }

  let email = "";
  let password = "";
  try {
    const body = (await req.json()) as { email?: unknown; password?: unknown };
    email = typeof body.email === "string" ? body.email.trim() : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Enter your email address and password" }, { status: 400 });
  }
  if (tooMany(email.toLowerCase())) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  try {
    const member = await findMemberByEmail(email);
    // The same answer whether the address is unknown or the password is wrong, so this page cannot
    // be used to find out who has registered.
    const ok = member?.passwordHash ? await verifyPassword(password, member.passwordHash) : false;
    if (!ok || !member) {
      return NextResponse.json({ ok: false, error: "Those details don't match an account." }, { status: 401 });
    }
    attempts.delete(email.toLowerCase());
    await createMemberSession(member.reference);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[member-login] failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not sign you in just now" }, { status: 502 });
  }
}

export async function DELETE() {
  await clearMemberSession();
  return NextResponse.json({ ok: true });
}
