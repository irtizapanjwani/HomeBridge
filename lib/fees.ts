// Confirming the joining fee (brief p.3–4, module 2).
//
// The fee is VEKAT's, not the cooperative's: "Joining fees belong to VEKAT and contributions
// belong to the cooperative. The system must keep the two money flows in separate ledgers and
// never mix them" (p.2). So the receipt is a VEKAT receipt, numbered from its own sequence.
//
// Confirmation is an officer's act today. When Stripe Checkout is wired up, its webhook will call
// this same function instead for card payments, so both routes issue the same kind of receipt
// from the same sequence.

import "server-only";

import { recordAudit } from "@/lib/audit";
import { collections } from "@/lib/members";
import { formatReceiptNo, nextReceiptSeq } from "@/lib/numbering";

export type ConfirmFeeInput = {
  reference: string;
  actor: string;
  /** How it was paid, as it should read on the receipt. */
  method?: string;
  /** The bank or card reference the payment can be traced by. */
  transactionRef?: string;
  /** Who the money actually came from, when it was not the applicant's own account. */
  payerName?: string;
};

export type ConfirmFeeResult =
  | { ok: true; receiptNo: string }
  | { ok: false; error: string; code: "not_found" | "already" };

/**
 * Marks the joining fee as received and issues the VEKAT receipt number.
 *
 * Guarded so a second confirmation cannot issue a second receipt for the same payment: the update
 * only matches a record that has no receipt number yet.
 */
export async function confirmFeePayment(input: ConfirmFeeInput): Promise<ConfirmFeeResult> {
  const { reference, actor } = input;
  const { members } = await collections();

  const member = await members.findOne({ reference });
  if (!member) {
    return { ok: false, error: "That registration no longer exists", code: "not_found" };
  }
  if (member.payment?.receiptNo) {
    return {
      ok: false,
      error: `The fee is already confirmed, receipt ${member.payment.receiptNo}`,
      code: "already",
    };
  }

  const confirmedAt = new Date();
  const receiptNo = formatReceiptNo(confirmedAt, await nextReceiptSeq());

  const res = await members.updateOne(
    { reference, "payment.receiptNo": { $exists: false } },
    {
      $set: {
        "payment.status": "Verified" as const,
        "payment.receiptNo": receiptNo,
        "payment.verifiedAt": confirmedAt,
        "payment.verifiedBy": actor,
        ...(input.method ? { "payment.method": input.method } : {}),
        ...(input.transactionRef ? { "payment.reference": input.transactionRef } : {}),
        ...(input.payerName ? { "payment.payerName": input.payerName } : {}),
        updatedAt: confirmedAt,
      },
    },
  );
  if (res.matchedCount === 0) {
    return { ok: false, error: "The fee was just confirmed by someone else", code: "already" };
  }

  await recordAudit({
    action: "fee.confirmed",
    actor,
    subject: reference,
    detail: `Joining fee confirmed — receipt ${receiptNo}${input.transactionRef ? ` · ref ${input.transactionRef}` : ""}`,
    before: member.payment?.status ?? "Not recorded",
    after: "Verified",
  });

  return { ok: true, receiptNo };
}
