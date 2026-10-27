// Vetting decisions (developer brief, p.4 "Vetting dashboard" and "Admission").
//
// One entry point, decideApplication(), covering the three outcomes an officer can record:
// approve, decline with a reason, or ask for more information. Approving is the only one that
// issues a membership number, so declined applicants and those asked for more information never
// use one up and the sequence has no gaps (brief p.3).
//
// Sending the welcome pack is deliberately not done here. This records the decision; the email and
// the PDFs are the next piece of work and will read the record this writes.

import "server-only";

import type { ClientSession } from "mongodb";

import { getClient } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { type MemberDoc, type MemberStatus, collections, ensureIndexes } from "@/lib/members";
import { formatMemberNo, nextMemberSeq, supportsTransactions } from "@/lib/numbering";
import { reservationFor } from "@/lib/reserved-numbers";
import { zoneFor } from "@/lib/zones";

export type Outcome = "approve" | "decline" | "request-info" | "review";

const STATUS_FOR: Record<Outcome, MemberStatus> = {
  approve: "Approved",
  decline: "Declined",
  "request-info": "Info requested",
  review: "In review",
};

const AUDIT_ACTION: Record<Outcome, string> = {
  approve: "application.approved",
  decline: "application.declined",
  "request-info": "application.info_requested",
  review: "application.in_review",
};

/** Statuses an application can still be moved on from. Once admitted it is settled. */
const DECIDABLE: MemberStatus[] = ["Submitted", "In review", "Info requested"];

export type DecisionInput = {
  reference: string;
  outcome: Outcome;
  /** The officer recording the decision; written to the member record and the audit log. */
  actor: string;
  /** Required for a decline so the applicant can be told why (brief p.4). */
  reason?: string;
};

export type DecisionResult =
  | { ok: true; status: MemberStatus; memberNo?: string }
  | { ok: false; error: string; code: "not_found" | "settled" | "needs_reason" | "supporter" };

/**
 * Records a decision against one application, and on approval issues the next membership number.
 *
 * The number and the member record are written together: on a replica set (any Atlas cluster) in
 * one transaction, so a failure part-way cannot leave a number issued against no member. On a
 * standalone server, which cannot run transactions, it falls back to writing them in sequence and
 * says so in the log — the worst case there is an unused number, never a duplicate one.
 */
export async function decideApplication(input: DecisionInput): Promise<DecisionResult> {
  const { reference, outcome, actor } = input;
  const reason = input.reason?.trim() || undefined;

  if (outcome === "decline" && !reason) {
    return { ok: false, error: "A decline needs a reason", code: "needs_reason" };
  }

  await ensureIndexes().catch(() => {
    // An index that could not be built must not stop an officer working; the unique index on the
    // membership number is the only one that matters here and it is retried on the next write.
  });

  const { members } = await collections();
  const existing = await members.findOne({ reference });
  if (!existing) {
    return { ok: false, error: "That registration no longer exists", code: "not_found" };
  }
  if (existing.supporter) {
    return { ok: false, error: "Supporters are not membership applications", code: "supporter" };
  }
  if (!DECIDABLE.includes(existing.status)) {
    return {
      ok: false,
      error: `This application is already ${existing.status.toLowerCase()}`,
      code: "settled",
    };
  }

  const status = STATUS_FOR[outcome];
  const before = existing.status;

  if (outcome !== "approve") {
    const now = new Date();
    await members.updateOne(
      { reference, status: { $in: DECIDABLE } },
      { $set: { status, decision: { outcome: status, reason, by: actor, at: now }, updatedAt: now } },
    );
    await recordAudit({
      action: AUDIT_ACTION[outcome],
      actor,
      subject: reference,
      detail: reason ? `${status} — ${reason}` : status,
      before,
      after: status,
    });
    return { ok: true, status };
  }

  return approve(existing, actor, reason, before);
}

async function approve(
  member: MemberDoc,
  actor: string,
  reason: string | undefined,
  before: MemberStatus,
): Promise<DecisionResult> {
  const { members } = await collections();
  const zone = zoneFor({ country: member.country, countryOther: undefined, state: member.state });
  const admittedAt = new Date();

  // A number held for this person is issued exactly as reserved, and does not touch the counter;
  // the counter steps over reserved positions for everyone else.
  const reserved = reservationFor(member.reference);

  const write = async (session?: ClientSession): Promise<string> => {
    const seq = reserved ? reserved.seq : await nextMemberSeq(session);
    const memberNo = reserved ? reserved.memberNo : formatMemberNo(zone, admittedAt, seq);

    // Guarded on the status so a second approval arriving at the same moment matches nothing and
    // we can tell the caller rather than issuing a second number for the same person.
    const res = await members.updateOne(
      { reference: member.reference, status: { $in: DECIDABLE } },
      {
        $set: {
          status: "Approved" as MemberStatus,
          membership: { memberNo, zone: reserved ? zoneOf(reserved.memberNo) : zone, seq, admittedAt },
          decision: { outcome: "Approved" as MemberStatus, reason, by: actor, at: admittedAt },
          updatedAt: admittedAt,
        },
      },
      { session },
    );
    if (res.matchedCount === 0) throw new AlreadyDecided();

    await recordAudit(
      {
        action: AUDIT_ACTION.approve,
        actor,
        subject: member.reference,
        detail: `Approved — issued ${memberNo}`,
        before,
        after: "Approved",
      },
      session,
    );
    await recordAudit(
      {
        action: "member.number_issued",
        actor,
        subject: memberNo,
        detail: `Membership number ${memberNo} issued to ${member.fullName} (${member.reference})`,
      },
      session,
    );
    return memberNo;
  };

  try {
    const memberNo = (await supportsTransactions())
      ? await inTransaction(write)
      : await withoutTransaction(write);
    return { ok: true, status: "Approved", memberNo };
  } catch (err) {
    if (err instanceof AlreadyDecided) {
      return { ok: false, error: "This application was just decided by someone else", code: "settled" };
    }
    throw err;
  }
}

async function inTransaction(write: (session: ClientSession) => Promise<string>): Promise<string> {
  const client = await getClient();
  const session = client.startSession();
  try {
    return await session.withTransaction(() => write(session));
  } finally {
    await session.endSession();
  }
}

async function withoutTransaction(write: () => Promise<string>): Promise<string> {
  console.warn(
    "[decisions] this MongoDB deployment cannot run transactions; the number and the member " +
      "record are written in sequence. Use a replica set (any Atlas cluster) in production.",
  );
  return write();
}

/** The zone segment of an already-formatted number, e.g. "UK" from HBC-UK-26-00001. */
function zoneOf(memberNo: string): string {
  return memberNo.split("-")[1] ?? "";
}

class AlreadyDecided extends Error {}

export type IdCheckResult = "Pass" | "Refer" | "Fail";

export type IdCheckInput = {
  reference: string;
  result: IdCheckResult;
  actor: string;
  note?: string;
};

export type IdCheckOutcome =
  | { ok: true; result: IdCheckResult }
  | { ok: false; error: string; code: "not_found" | "settled" };

/**
 * Records an officer's identity check against an application.
 *
 * Kept separate from the decision itself: verifying who someone is and deciding whether to admit
 * them are two acts by two different standards, and the brief's checklist treats them that way.
 * Approval reads the stored result, so an application can only be approved once an officer has
 * actually recorded a pass.
 *
 * Only the conclusion is stored. The ID number and any document image stay where they are.
 */
export async function recordIdCheck(input: IdCheckInput): Promise<IdCheckOutcome> {
  const { reference, result, actor } = input;
  const note = input.note?.trim().slice(0, 300) || undefined;

  const { members } = await collections();
  const existing = await members.findOne({ reference });
  if (!existing) {
    return { ok: false, error: "That registration no longer exists", code: "not_found" };
  }
  if (!DECIDABLE.includes(existing.status)) {
    return {
      ok: false,
      error: `This application is already ${existing.status.toLowerCase()}`,
      code: "settled",
    };
  }

  const at = new Date();
  await members.updateOne(
    { reference, status: { $in: DECIDABLE } },
    { $set: { idCheck: { result, note, by: actor, at }, updatedAt: at } },
  );

  await recordAudit({
    action: "application.id_checked",
    actor,
    subject: reference,
    detail: note ? `ID check recorded as ${result} — ${note}` : `ID check recorded as ${result}`,
    before: existing.idCheck?.result ?? "Not started",
    after: result,
  });

  return { ok: true, result };
}
