import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { createMemberSession, isMemberAuthConfigured } from "@/lib/member-auth";
import { verifyLoginCode } from "@/lib/member-otp";

const tries = new Map<string, { count: number; until: number }>();

function tooMany(key: string) {
  const now = Date.now();
  const e = tries.get(key);
  if (!e || e.until < now) {
    tries.set(key, { count: 1, until: now + 15 * 60_000 });
    return false;
  }
  e.count += 1;
  return e.count > 10;
}

/** Signs a member in with the code from their email. */
export async function POST(req: Request) {
  if (!isMemberAuthConfigured() || !isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Sign-in is not configured" }, { status: 503 });
  }
  let email = "";
  let code = "";
  try {
    const body = (await req.json()) as { email?: unknown; code?: unknown };
    email = typeof body.email === "string" ? body.email.trim() : "";
    code = typeof body.code === "string" ? body.code.replace(/\s/g, "") : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (tooMany(email.toLowerCase())) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Ask for a new code in a few minutes." }, { status: 429 });
  }
  try {
    const reference = await verifyLoginCode(email, code);
    if (!reference) {
      return NextResponse.json({ ok: false, error: "That code is not right or has expired. Ask for a new one." }, { status: 401 });
    }
    await createMemberSession(reference);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[member-code] verify failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not sign you in just now" }, { status: 502 });
  }
}
