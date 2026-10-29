// Membership numbers (developer brief, p.5–6).
//
//   HBC-ZONE-YY-NNNNN      e.g. HBC-EDO-26-00014
//
// The rules the brief sets, and how they are met here:
//
//   "Each sequence comes from a database sequence or locked counter inside the same transaction
//    that creates the record, so two admins approving at once can never get the same number."
//      -> one atomic findOneAndUpdate on the counters collection, inside a transaction with the
//         write to the member record.
//
//   "The membership sequence runs cooperative-wide and never resets or reuses a number."
//      -> a single counter, not one per zone or per year. The year in the number is taken from the
//         admission date and does not restart the digits.
//
//   "Member 00001 is reserved for Dr Victor Evbuomwan (HBC-UK-26-00001)."
//      -> the counter starts at zero, so the first member approved takes 00001. Approve his
//         record first, or seed the counter with seedMemberSequence() before going live.

import "server-only";

import type { ClientSession } from "mongodb";

import { getClient } from "@/lib/db";
import { collections } from "@/lib/members";
import { RESERVED_SEQS } from "@/lib/reserved-numbers";

export const MEMBER_SEQUENCE = "member_seq";
export const RECEIPT_SEQUENCE = "receipt_seq";
export const APPLICATION_SEQUENCE = "application_seq";

/** Formats the parts into the number the brief specifies. */
export function formatMemberNo(zone: string, admittedAt: Date, seq: number): string {
  const yy = String(admittedAt.getUTCFullYear()).slice(-2);
  return `HBC-${zone}-${yy}-${String(seq).padStart(5, "0")}`;
}

/**
 * Takes the next value from the cooperative-wide sequence.
 *
 * findOneAndUpdate with $inc is atomic in MongoDB: concurrent callers are serialised on the single
 * counter document, so each one gets a distinct value. Pass the session so the increment is part
 * of the caller's transaction and rolls back with it rather than burning a number.
 */
export async function nextMemberSeq(session?: ClientSession): Promise<number> {
  const { counters } = await collections();
  // A reserved position is stepped over rather than handed out, so the number held for someone
  // cannot be given to whoever is approved first. Each pass advances the counter by one, so at
  // most one extra pass per reservation is ever needed.
  for (let attempt = 0; attempt <= RESERVED_SEQS.size; attempt++) {
    const doc = await counters.findOneAndUpdate(
      { _id: MEMBER_SEQUENCE },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: "after", session },
    );
    if (!doc) throw new Error("Could not take the next membership number");
    if (!RESERVED_SEQS.has(doc.value)) return doc.value;
  }
  throw new Error("Could not take the next membership number past the reserved ones");
}

/**
 * HBA-YYMM-NNNN — the application reference (brief p.3 and p.5: "On submit: create applicant,
 * issue application reference HBA-YYMM-NNNN").
 *
 * YYMM is the month the application arrived. NNNN is one running number that never resets, so two
 * applications can never share a reference even across months. It is padded to four digits and
 * simply grows a fifth if the cooperative ever passes 9,999 applications.
 */
export function formatApplicationRef(at: Date, seq: number): string {
  const yy = String(at.getUTCFullYear()).slice(-2);
  const mm = String(at.getUTCMonth() + 1).padStart(2, "0");
  return `HBA-${yy}${mm}-${String(seq).padStart(4, "0")}`;
}

/** Takes the next application number. Its own counter: it never touches the membership sequence. */
export async function nextApplicationSeq(session?: ClientSession): Promise<number> {
  const { counters } = await collections();
  const doc = await counters.findOneAndUpdate(
    { _id: APPLICATION_SEQUENCE },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after", session },
  );
  if (!doc) throw new Error("Could not take the next application reference");
  return doc.value;
}

/**
 * Issues the reference a new applicant is given at registration.
 *
 * This is an application reference, not a membership number. The membership number is issued only
 * when VEKAT approves the application (see lib/decisions.ts), as the brief requires: "Declined
 * applicants, and those asked for more information, never receive a membership number, so the
 * member sequence has no gaps" (p.3).
 *
 * Applicants who registered between mid-October 2026 and this change were given an HBC number at
 * registration instead; they keep it, and approval confirms it rather than issuing a second one.
 */
export async function issueApplicationRef(at: Date = new Date()): Promise<string> {
  return formatApplicationRef(at, await nextApplicationSeq());
}

/** VKT-RCP-YY-NNNNN — the VEKAT joining fee receipt (brief p.5). */
export function formatReceiptNo(confirmedAt: Date, seq: number): string {
  const yy = String(confirmedAt.getUTCFullYear()).slice(-2);
  return `VKT-RCP-${yy}-${String(seq).padStart(5, "0")}`;
}

/**
 * Takes the next receipt number. Its own counter, separate from the membership sequence: the fee
 * is VEKAT's and the membership is the cooperative's, and the brief keeps the two ledgers apart.
 */
export async function nextReceiptSeq(session?: ClientSession): Promise<number> {
  const { counters } = await collections();
  const doc = await counters.findOneAndUpdate(
    { _id: RECEIPT_SEQUENCE },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after", session },
  );
  if (!doc) throw new Error("Could not take the next receipt number");
  return doc.value;
}

/**
 * Sets the sequence so the next number issued is `nextNumber`.
 *
 * For going live against records that already exist — for example if the first few members were
 * admitted by hand before this screen worked. Refuses to move the counter backwards, because that
 * would hand out a number twice.
 */
export async function seedMemberSequence(nextNumber: number): Promise<number> {
  if (!Number.isInteger(nextNumber) || nextNumber < 1) {
    throw new Error("The next membership number must be a whole number of 1 or more");
  }
  const { counters } = await collections();
  const target = nextNumber - 1;
  const current = await counters.findOne({ _id: MEMBER_SEQUENCE });
  if (current && current.value > target) {
    throw new Error(
      `The sequence is already at ${current.value}; moving it back to ${target} would reissue numbers`,
    );
  }
  await counters.updateOne({ _id: MEMBER_SEQUENCE }, { $set: { value: target } }, { upsert: true });
  return nextNumber;
}

/** The last number issued, or 0 if none has been. Read-only; does not advance the sequence. */
export async function currentMemberSeq(): Promise<number> {
  const { counters } = await collections();
  const doc = await counters.findOne({ _id: MEMBER_SEQUENCE });
  return doc?.value ?? 0;
}

/**
 * True when the connection can run multi-document transactions, which needs a replica set.
 * MongoDB Atlas always can, including the free tier; a plain local mongod started standalone
 * cannot. Checked once and remembered.
 */
let transactional: boolean | null = null;
export async function supportsTransactions(): Promise<boolean> {
  if (transactional !== null) return transactional;
  try {
    const client = await getClient();
    const info = await client.db("admin").command({ hello: 1 });
    transactional = Boolean(info.setName || info.msg === "isdbgrid");
  } catch {
    transactional = false;
  }
  return transactional;
}
