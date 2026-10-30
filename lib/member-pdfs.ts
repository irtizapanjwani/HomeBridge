// The member's own copies of their certificate and joining fee receipt, for the member portal
// (brief Phase 2: "view membership details, certificate, receipts"). Built from the record each
// time, exactly as the welcome pack builds them, so the two can never differ.

import "server-only";

import type { MemberDoc } from "@/lib/members";
import { buildCertificate, certificateNoFor } from "@/lib/pdf/certificate";
import { buildReceipt } from "@/lib/pdf/receipt";
import { JOINING_FEE } from "@/lib/settings";
import { packMemberOf } from "@/lib/welcome-pack";

export async function memberCertificate(m: MemberDoc): Promise<{ filename: string; pdf: Uint8Array } | null> {
  const pack = packMemberOf(m);
  if (!pack) return null;
  const certificateNo = certificateNoFor(pack.memberNo);
  const pdf = await buildCertificate({
    certificateNo,
    fullName: m.fullName,
    memberNo: pack.memberNo,
    category: pack.category,
    chapter: pack.chapter,
    admittedAt: pack.admittedAt,
    founding: pack.founding,
  });
  return { filename: `${certificateNo}.pdf`, pdf };
}

export async function memberReceipt(m: MemberDoc): Promise<{ filename: string; pdf: Uint8Array } | null> {
  const receiptNo = m.payment?.receiptNo;
  if (!receiptNo) return null;
  const home = m.country === "Nigeria";
  const pdf = await buildReceipt({
    receiptNo,
    fullName: m.fullName,
    applicationRef: m.reference,
    memberNo: m.membership?.memberNo,
    category: packMemberOf(m)?.category ?? (home ? "Home" : "Diaspora"),
    amount: home ? JOINING_FEE.ngn : JOINING_FEE.gbp,
    currency: home ? "NGN" : "GBP",
    method: m.payment?.method || "Not recorded",
    transactionRef: m.payment?.reference,
    receivedAt: m.payment?.verifiedAt ?? m.updatedAt ?? m.submittedAt,
    payee: JOINING_FEE.payee,
    payeeRole: JOINING_FEE.payeeRole,
  });
  return { filename: `${receiptNo}.pdf`, pdf };
}
