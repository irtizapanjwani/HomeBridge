// Password reset for members.
//
// The link we email contains a long random token. Only its SHA-256 hash is stored, so a leaked
// database backup cannot be used to take over accounts: an attacker holding the hash still cannot
// produce the token the link needs.
//
// A token is good for one use and one hour. Using it, or asking for another, retires the old one.

import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { collections } from "@/lib/members";

/** Long enough that guessing is hopeless; url-safe so it survives being pasted out of an email. */
const TOKEN_BYTES = 32;

export const RESET_TTL_MS = 60 * 60 * 1000;

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Shaped like the token we issue, so a stray path segment never reaches the database. */
export const looksLikeToken = (v: string) => /^[A-Za-z0-9_-]{40,90}$/.test(v);

/**
 * Issues a reset token for a member and stores its hash against their record.
 *
 * Returns the raw token, which exists only in the email we are about to send: it is never logged
 * and never stored.
 */
export async function createResetToken(reference: string): Promise<string> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const { members } = await collections();
  await members.updateOne(
    { reference },
    {
      // A new request replaces any token still outstanding, so a forwarded older email is dead.
      $set: {
        passwordReset: {
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
          requestedAt: new Date(),
        },
      },
    },
  );
  return token;
}

/** The member a live token belongs to, or null when it is unknown, used or expired. */
export async function memberForResetToken(token: string) {
  if (!looksLikeToken(token)) return null;
  const { members } = await collections();
  const hash = sha256(token);
  const member = await members.findOne({ "passwordReset.tokenHash": hash });
  if (!member?.passwordReset) return null;

  // Compared without leaking where two hashes differ, in case the query ever becomes a scan.
  const stored = Buffer.from(member.passwordReset.tokenHash, "hex");
  const given = Buffer.from(hash, "hex");
  if (stored.length !== given.length || !timingSafeEqual(stored, given)) return null;

  if (member.passwordReset.expiresAt.getTime() <= Date.now()) return null;
  return member;
}

/**
 * Sets a new password and retires the token in one write.
 *
 * Both happen together on purpose: a password changed without clearing the token would leave a
 * working reset link in an inbox, and a second person reading that inbox could change it again.
 */
export async function completeReset(reference: string, passwordHash: string) {
  const { members } = await collections();
  const res = await members.updateOne(
    { reference },
    { $set: { passwordHash, updatedAt: new Date() }, $unset: { passwordReset: "" } },
  );
  return res.matchedCount === 1;
}
