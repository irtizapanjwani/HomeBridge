import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { isEmailConfigured, sendPasswordReset } from "@/lib/email";
import { findMemberByEmail, isMemberAuthConfigured } from "@/lib/member-auth";
import { createResetToken } from "@/lib/password-reset";

/**
 * A few requests per address per window. Reset emails cost us nothing to send but land in someone
 * else's inbox, so an unlimited endpoint is a way to pester a member you do not like.
 */
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

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

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/**
 * Starts a password reset.
 *
 * The reply is the same whether or not the address belongs to a member. Saying "no account with
 * that email" would turn this into a way to find out who has registered, and the membership list
 * is not public.
 */
export async function POST(req: Request) {
  if (!isMemberAuthConfigured() || !isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Sign-in is not configured" }, { status: 503 });
  }
  if (!isEmailConfigured()) {
    // Worth saying plainly: without email there is no way to deliver the link, and a cheerful
    // "check your inbox" would send the member looking for something that will never arrive.
    console.error("[forgot] RESEND_API_KEY is not set — no reset email could be sent.");
    return NextResponse.json(
      { ok: false, error: "We cannot send reset emails just now. Please contact us and we will help." },
      { status: 503 },
    );
  }

  let email = "";
  try {
    const body = (await req.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: "Enter the email address you registered with." }, { status: 422 });
  }
  if (tooMany(email.toLowerCase())) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const member = await findMemberByEmail(email);
    // A record with no password was registered before sign-in existed; there is nothing to reset.
    if (member?.passwordHash) {
      const token = await createResetToken(member.reference);
      const origin = new URL(req.url).origin;
      const sent = await sendPasswordReset({
        to: member.email,
        firstName: member.fullName.trim().split(/\s+/)[0] ?? "",
        url: `${origin}/reset?token=${encodeURIComponent(token)}`,
      });
      // Logged without the address, and never returned: the caller must not learn the difference.
      if (!sent.ok) console.error("[forgot] reset email not sent:", sent.error);
    }
  } catch (err) {
    console.error("[forgot] could not start the reset:", err instanceof Error ? err.message : "unknown error");
  }

  return NextResponse.json({ ok: true });
}
