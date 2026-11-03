// Proof of payment (Member Platform brief §3: "Upload proof: photo or PDF of a bank transfer
// receipt"; §5 route 4: "the payment shows 'Pending verification' until the Treasurer confirms it
// against the bank statement"; §6: "Verification queue (Treasurer only)").
//
// A member says what they paid and attaches the bank receipt. The file is stored encrypted like an
// ID document. An officer approves it, which records the contribution exactly as a statement line
// would (receipt HBC-CR-…, email, audit), or rejects it with a reason, which emails the member
// (Email L). While a proof is waiting, that month counts as paid for the reminders (brief: "Proof
// uploaded by 23:59 on day 7 counts as on time"); a rejection puts the month back to unpaid.

import "server-only";

import { ObjectId } from "mongodb";

import { recordAudit } from "@/lib/audit";
import { type ContributionCurrency, money, periodLabel, recordContribution } from "@/lib/contributions";
import { getDb } from "@/lib/db";
import { saveDocument } from "@/lib/documents";
import { sendEmail } from "@/lib/email";
import { buttonBlock, renderTemplate } from "@/lib/email-templates";
import { type MemberDoc, collections } from "@/lib/members";

export type ProofStatus = "pending" | "approved" | "rejected";

export type ProofDoc = {
  _id?: ObjectId;
  memberRef: string;
  memberNo: string;
  name: string;
  amount: number;
  currency: ContributionCurrency;
  /** The month it is for, YYYY-MM. */
  period: string;
  /** The date the member says they paid, YYYY-MM-DD. */
  paidOn: string;
  bankRef: string;
  note: string;
  documentId: string;
  status: ProofStatus;
  submittedAt: Date;
  decidedAt?: Date;
  decidedBy?: string;
  reason?: string;
  receiptNo?: string;
};

async function proofs() {
  return (await getDb()).collection<ProofDoc>("payment_proofs");
}

let indexed: Promise<unknown> | null = null;
async function ensureIndexes() {
  indexed ??= (async () => {
    const c = await proofs();
    await Promise.all([c.createIndex({ status: 1, submittedAt: 1 }), c.createIndex({ memberRef: 1, submittedAt: -1 })]);
  })().catch((err) => {
    indexed = null;
    throw err;
  });
  return indexed;
}

export type ProofInput = { amount: number; currency: ContributionCurrency; period: string; paidOn: string; bankRef: string; note: string };

export function proofProblem(i: ProofInput): string | null {
  if (!(i.amount > 0) || i.amount > 1_000_000_000) return "Enter the amount you paid.";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(i.period)) return "Choose the month the payment is for.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.paidOn)) return "Enter the date you paid.";
  const paid = new Date(`${i.paidOn}T12:00:00Z`);
  if (Number.isNaN(paid.getTime())) return "Enter the date you paid.";
  if (paid.getTime() > Date.now() + 86_400_000) return "The payment date is in the future.";
  return null;
}

/** Stores a member's proof and its file. The member comes from their session, never the form. */
export async function submitProof(member: MemberDoc, input: ProofInput, file: { name: string; type: string; data: Uint8Array }) {
  await ensureIndexes();
  if (!member.membership) throw new Error("not a member");
  const documentId = await saveDocument({ ownerRef: member.reference, type: "payment_proof", name: file.name, contentType: file.type, data: file.data });
  const doc: ProofDoc = {
    memberRef: member.reference,
    memberNo: member.membership.memberNo,
    name: member.fullName,
    amount: Math.round(input.amount * 100) / 100,
    currency: input.currency,
    period: input.period,
    paidOn: input.paidOn,
    bankRef: input.bankRef.trim().slice(0, 80),
    note: input.note.trim().slice(0, 500),
    documentId,
    status: "pending",
    submittedAt: new Date(),
  };
  const res = await (await proofs()).insertOne(doc);
  await recordAudit({
    action: "proof.submitted",
    actor: `Member (${member.fullName})`,
    subject: doc.memberNo,
    detail: `Proof of payment: ${money(doc.amount, doc.currency)} for ${periodLabel(doc.period)}, paid ${doc.paidOn}${doc.bankRef ? ` · ref ${doc.bankRef}` : ""}`,
  });
  return String(res.insertedId);
}

/** A member's own proofs, newest first. */
export async function proofsFor(memberRef: string) {
  await ensureIndexes().catch(() => {});
  return (await proofs()).find({ memberRef }).sort({ submittedAt: -1 }).limit(20).toArray();
}

/** The officer queue: pending first (oldest first), then the latest decisions. */
export async function proofQueue() {
  await ensureIndexes().catch(() => {});
  const c = await proofs();
  const [pending, decided] = await Promise.all([
    c.find({ status: "pending" }).sort({ submittedAt: 1 }).toArray(),
    c.find({ status: { $ne: "pending" } }).sort({ decidedAt: -1 }).limit(20).toArray(),
  ]);
  return { pending, decided };
}

/** Members with a proof still waiting for `period`, by member number: those months count as paid for reminders. */
export async function pendingProofMembers(period: string): Promise<Set<string>> {
  const rows = await (await proofs()).find({ status: "pending", period }, { projection: { memberNo: 1 } }).toArray();
  return new Set(rows.map((r) => r.memberNo));
}

/** Pending proofs older than `days`, for the reconciliation screen. */
export async function stalePendingProofs(days = 5) {
  return (await proofs())
    .find({ status: "pending", submittedAt: { $lt: new Date(Date.now() - days * 86_400_000) } })
    .sort({ submittedAt: 1 })
    .toArray();
}

type Decision = { ok: true; receiptNo?: string; emailed?: boolean } | { ok: false; error: string; status: number };

/** Approves a proof: records the contribution (receipt, email, audit) and closes the proof. */
export async function approveProof(id: string, actor: string): Promise<Decision> {
  if (!ObjectId.isValid(id)) return { ok: false, error: "Not found", status: 404 };
  const c = await proofs();
  // Claimed first, so two officers clicking at once cannot record it twice.
  const claimed = await c.findOneAndUpdate({ _id: new ObjectId(id), status: "pending" }, { $set: { status: "approved", decidedAt: new Date(), decidedBy: actor } });
  if (!claimed) return { ok: false, error: "This proof has already been dealt with.", status: 409 };
  const recorded = await recordContribution(
    {
      memberNo: claimed.memberNo,
      amount: claimed.amount,
      currency: claimed.currency,
      date: claimed.paidOn,
      bankRef: claimed.bankRef || `Proof of payment`,
      period: claimed.period,
      source: "proof",
    },
    actor,
  ).catch((err) => ({ ok: false as const, error: err instanceof Error ? err.message : "unknown error", status: 502 }));
  if (!recorded.ok) {
    await c.updateOne({ _id: claimed._id }, { $set: { status: "pending" }, $unset: { decidedAt: "", decidedBy: "" } });
    return { ok: false, error: recorded.error, status: recorded.status };
  }
  await c.updateOne({ _id: claimed._id }, { $set: { receiptNo: recorded.receiptNo } });
  await recordAudit({
    action: "proof.approved",
    actor,
    subject: claimed.memberNo,
    detail: `Proof of payment approved: ${money(claimed.amount, claimed.currency)} for ${periodLabel(claimed.period)} → ${recorded.receiptNo}`,
  });
  return { ok: true, receiptNo: recorded.receiptNo, emailed: recorded.emailed };
}

/** Rejects a proof with a reason, and tells the member (Email L). */
export async function rejectProof(id: string, reason: string, actor: string, site: string): Promise<Decision> {
  if (!ObjectId.isValid(id)) return { ok: false, error: "Not found", status: 404 };
  const why = reason.trim().slice(0, 500);
  if (!why) return { ok: false, error: "Say why, so the member knows what to fix.", status: 422 };
  const c = await proofs();
  const claimed = await c.findOneAndUpdate(
    { _id: new ObjectId(id), status: "pending" },
    { $set: { status: "rejected", decidedAt: new Date(), decidedBy: actor, reason: why } },
  );
  if (!claimed) return { ok: false, error: "This proof has already been dealt with.", status: 409 };

  const { members } = await collections();
  const m = await members.findOne({ reference: claimed.memberRef });
  let emailed = false;
  if (m?.email?.trim()) {
    const portal = `${site.replace(/\/+$/, "")}/app`;
    const email = await renderTemplate(
      "L",
      {
        FirstName: m.firstName?.trim() || m.fullName.trim().split(/\s+/)[0] || "there",
        MemberNo: claimed.memberNo,
        Amount: money(claimed.amount, claimed.currency),
        Month: periodLabel(claimed.period),
        Reason: why,
        PortalLink: portal,
      },
      { BUTTON: buttonBlock("See your contributions", portal) },
    );
    emailed = (await sendEmail({ to: m.email, ...email })).ok;
  }
  await recordAudit({
    action: "proof.rejected",
    actor,
    subject: claimed.memberNo,
    detail: `Proof of payment rejected (${money(claimed.amount, claimed.currency)} for ${periodLabel(claimed.period)}): ${why}${emailed ? " · member emailed" : " · email not sent"}`,
  });
  return { ok: true, emailed };
}
