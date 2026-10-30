import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { isMemberAuthConfigured } from "@/lib/member-auth";
import { requestLoginCode } from "@/lib/member-otp";

const sent = new Map<string, { count: number; until: number }>();

/** At most five codes per address per 15 minutes, so the inbox cannot be flooded. */
function tooMany(key: string) {
  const now = Date.now();
  const e = sent.get(key);
  if (!e || e.until < now) {
    sent.set(key, { count: 1, until: now + 15 * 60_000 });
    return false;
  }
  e.count += 1;
  return e.count > 5;
}

/** Emails a one-time sign-in code. Always answers the same way, whether or not the address exists. */
export async function POST(req: Request) {
  if (!isMemberAuthConfigured() || !isDbConfigured() || !isEmailConfigured()) {
    return NextResponse.json({ ok: false, error: "Sign-in by code is not available just now. Use your password." }, { status: 503 });
  }
  let email = "";
  try {
    const body = (await req.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter the email address you registered with." }, { status: 422 });
  }
  if (tooMany(email.toLowerCase())) {
    return NextResponse.json({ ok: false, error: "Too many codes requested. Please wait a few minutes." }, { status: 429 });
  }
  try {
    await requestLoginCode(email);
  } catch (err) {
    console.error("[member-code] could not issue a code:", err instanceof Error ? err.message : "unknown error");
  }
  return NextResponse.json({ ok: true });
}
