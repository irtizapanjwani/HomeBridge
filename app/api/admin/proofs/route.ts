import { NextResponse } from "next/server";

import { isSignedIn } from "@/lib/admin-auth";
import { money, periodLabel } from "@/lib/contributions";
import { isDbConfigured } from "@/lib/db";
import { type ProofDoc, proofQueue } from "@/lib/payment-proofs";

const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

const view = (p: ProofDoc) => ({
  id: String(p._id),
  memberNo: p.memberNo,
  name: p.name,
  amount: money(p.amount, p.currency),
  period: periodLabel(p.period),
  paidOn: DAY.format(new Date(`${p.paidOn}T12:00:00Z`)),
  bankRef: p.bankRef,
  note: p.note,
  documentId: p.documentId,
  status: p.status,
  submittedAt: DAY.format(p.submittedAt),
  daysWaiting: Math.floor((Date.now() - p.submittedAt.getTime()) / 86_400_000),
  decidedBy: p.decidedBy ?? "",
  decidedAt: p.decidedAt ? DAY.format(p.decidedAt) : "",
  reason: p.reason ?? "",
  receiptNo: p.receiptNo ?? "",
});

/** The Treasurer's queue of proofs of payment. */
export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    const q = await proofQueue();
    return NextResponse.json({ ok: true, pending: q.pending.map(view), decided: q.decided.map(view) });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not load the proofs" }, { status: 502 });
  }
}
