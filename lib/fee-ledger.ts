// The joining-fee ledger for the Joining fees screen: one row per applicant who owes or has paid
// the one-off fee to VEKAT Group Ltd (bye-laws 6.3, 12.4). Built from the live member records, so
// it always agrees with the Applications screen and the receipts that went out.

import "server-only";

import { collections } from "@/lib/members";
import { JOINING_FEE } from "@/lib/settings";

export type FeeStatus = "Confirmed" | "Payment reported" | "Not paid yet";

export type FeeRow = {
  reference: string;
  memberNo: string;
  name: string;
  email: string;
  form: string;
  amount: string;
  currency: "NGN" | "GBP";
  value: number;
  method: string;
  paidOn: string;
  receiptNo: string;
  confirmedOn: string;
  confirmedBy: string;
  status: FeeStatus;
};

const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });
const FORM: Record<string, string> = { vekat: "VEKAT form", gform: "Google Form import" };

export async function joiningFeeLedger() {
  const { members } = await collections();
  // Everyone who is not a supporter and not refused: approved members owe the fee; anyone who has
  // reported or been confirmed as paying is shown too, even before approval.
  const docs = await members
    .find(
      {
        supporter: false,
        status: { $ne: "Declined" },
        $or: [
          { "membership.memberNo": { $exists: true } },
          { "payment.receiptNo": { $exists: true } },
          { "payment.datePaid": { $nin: [null, ""] } },
          { "receipt.name": { $exists: true } },
        ],
      },
      { projection: { reference: 1, fullName: 1, email: 1, country: 1, source: 1, membership: 1, payment: 1, submittedAt: 1, "receipt.name": 1 } },
    )
    .sort({ submittedAt: -1 })
    .toArray();

  const rows: FeeRow[] = docs.map((m) => {
    const home = m.country === "Nigeria";
    const currency = home ? ("NGN" as const) : ("GBP" as const);
    const value = home ? JOINING_FEE.ngn : JOINING_FEE.gbp;
    const p = m.payment;
    // "Reported" = the applicant said they paid (date, their bank reference or an uploaded receipt)
    // but nobody has matched it to the bank yet.
    const status: FeeStatus = p?.receiptNo ? "Confirmed" : p?.datePaid || p?.reference || m.receipt ? "Payment reported" : "Not paid yet";
    return {
      reference: m.reference,
      memberNo: m.membership?.memberNo ?? "",
      name: m.fullName,
      email: m.email ?? "",
      form: FORM[m.source ?? ""] ?? "HomeBridge registration",
      amount: home ? `₦${value.toLocaleString("en-GB")}` : `£${value.toFixed(2)}`,
      currency,
      value,
      method: p?.method || (home ? "Bank transfer" : "Bank transfer or card"),
      paidOn: p?.datePaid ?? "",
      receiptNo: p?.receiptNo ?? "",
      confirmedOn: p?.verifiedAt ? DAY.format(p.verifiedAt) : "",
      confirmedBy: p?.verifiedBy ?? "",
      status,
    };
  });

  const confirmed = rows.filter((r) => r.status === "Confirmed");
  const sum = (c: "NGN" | "GBP") => confirmed.filter((r) => r.currency === c).reduce((t, r) => t + r.value, 0);
  return {
    rows,
    totals: {
      confirmed: confirmed.length,
      ngn: sum("NGN"),
      gbp: sum("GBP"),
      reported: rows.filter((r) => r.status === "Payment reported").length,
      unpaid: rows.filter((r) => r.status === "Not paid yet").length,
    },
  };
}
