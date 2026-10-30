// The contribution receipt, HBC-CR-YYMM-NNNNN (brief p.5 reference rules; the Contribution and
// Payment Guide promises "HomeBridge emails a contribution receipt (HBC-CR-…) once the funds clear").
//
// Issued by the cooperative itself, not VEKAT: contributions are member funds and never pass
// through the manager (brief p.2). The client has not supplied a template for this one, so it
// follows the house style of the pack documents.

import "server-only";

import { CONTACT } from "@/lib/content";
import { FormWriter, MUTED } from "@/lib/pdf/layout";
import { SOCIETY_ACCOUNTS } from "@/lib/settings";

export type ContributionReceiptInput = {
  receiptNo: string;
  fullName: string;
  memberNo: string;
  amount: number;
  currency: "NGN" | "GBP" | "USD";
  /** e.g. "November 2026". */
  period: string;
  paidAt: Date;
  bankRef: string;
  /** Shares bought, for naira; null where the Board's rate applies. */
  shares: number | null;
};

const DATE = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "long", year: "numeric" });

export async function buildContributionReceipt(r: ContributionReceiptInput): Promise<Uint8Array> {
  const w = await FormWriter.create({
    title: `Contribution receipt ${r.receiptNo}`,
    subject: `Contribution receipt for ${r.fullName}`,
    footerEmail: CONTACT.email,
  });
  const sym = { NGN: "₦", GBP: "£", USD: "$" }[r.currency];
  const amount = `${sym}${r.amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  w.header("Contribution Receipt");
  w.paragraph(`Receipt No. ${r.receiptNo}`, { font: w.fonts.poppinsSemi, size: 12 });
  w.keyValues([
    ["Received from", r.fullName],
    ["Membership number", r.memberNo],
    ["Amount", amount],
    ["Contribution for", r.period],
    ["Shares", r.shares !== null ? `${r.shares.toLocaleString("en-GB")} shares at ₦1,000 each` : "Converted to shares at the rate set by the Board"],
    ["Paid into", `${SOCIETY_ACCOUNTS[r.currency].accountName} · ${SOCIETY_ACCOUNTS[r.currency].label}`],
    ["Bank reference", r.bankRef || "—"],
    ["Date received", DATE.format(r.paidAt)],
  ]);
  w.paragraph(
    "This contribution is held as shares in your name in HomeBridge Cooperative. It is separate from the one-off joining fee, which was paid to the cooperative’s appointed manager.",
    { size: 10, color: MUTED },
  );
  w.paragraph(
    "HomeBridge only ever takes contributions into its own accounts, never a personal account. If anyone asks you to pay elsewhere, do not pay and contact us at once.",
    { size: 10, color: MUTED },
  );
  w.paragraph(`Issued by HomeBridge Cooperative · ${CONTACT.email}`, { size: 10 });
  return w.finish();
}
