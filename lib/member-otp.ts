// Sign-in with a one-time code sent by email (brief Phase 2, member portal: "Login by email with
// one-time code"). Sits alongside the password a member set at registration: either works.
//
// The code is six random digits, valid for ten minutes and for one use. Only an HMAC of it is
// stored (keyed with MEMBER_SESSION_SECRET and bound to the member), so a database copy cannot be
// turned back into a working code. Five wrong tries wipe it, so it cannot be guessed.

import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { isEmailConfigured, sendLoginCode } from "@/lib/email";
import { findMemberByEmail } from "@/lib/member-auth";
import { collections } from "@/lib/members";

const CODE_MINUTES = 10;
const MAX_TRIES = 5;

const hashCode = (reference: string, code: string) =>
  createHmac("sha256", process.env.MEMBER_SESSION_SECRET ?? "").update(`${reference}:${code}`).digest("hex");

/**
 * Emails a fresh code if the address belongs to an account. Says nothing either way to the caller,
 * so the sign-in page cannot be used to find out who has registered.
 */
export async function requestLoginCode(email: string): Promise<void> {
  if (!isEmailConfigured()) throw new Error("RESEND_API_KEY is not set");
  const member = await findMemberByEmail(email);
  if (!member?.email) return;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { members } = await collections();
  await members.updateOne(
    { reference: member.reference },
    { $set: { loginCode: { hash: hashCode(member.reference, code), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000), attempts: 0 } } },
  );
  const sent = await sendLoginCode({
    to: member.email,
    firstName: member.firstName?.trim() || member.fullName.trim().split(/\s+/)[0] || "",
    code,
    minutes: CODE_MINUTES,
  });
  if (!sent.ok) console.error("[member-code] code email not sent:", sent.error);
}

/** Checks a code. Returns the member's reference when it is right, null otherwise. */
export async function verifyLoginCode(email: string, code: string): Promise<string | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const member = await findMemberByEmail(email);
  const lc = member?.loginCode;
  if (!member || !lc) return null;
  const { members } = await collections();
  if (lc.expiresAt.getTime() < Date.now() || lc.attempts >= MAX_TRIES) {
    await members.updateOne({ reference: member.reference }, { $unset: { loginCode: "" } });
    return null;
  }
  const expected = Buffer.from(lc.hash, "hex");
  const given = Buffer.from(hashCode(member.reference, code), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await members.updateOne({ reference: member.reference }, { $inc: { "loginCode.attempts": 1 } });
    return null;
  }
  // Used once: wiped before the session is created.
  await members.updateOne({ reference: member.reference }, { $unset: { loginCode: "" } });
  return member.reference;
}
