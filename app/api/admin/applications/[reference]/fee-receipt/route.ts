import { NextResponse } from "next/server";

import { isSignedIn } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";
import { isDbConfigured } from "@/lib/db";
import { collections } from "@/lib/members";
import { buildReceipt } from "@/lib/pdf/receipt";
import { JOINING_FEE } from "@/lib/settings";

/** A reference as either site issues it, so a stray path segment never reaches the query. */
const isReference = (v: string) => /^(APP|HB)-[A-Z0-9-]{4,40}$/.test(v);

const CATEGORY: Record<string, string> = {
  home: "Home",
  diaspora: "Diaspora",
  founding: "Founding",
  professional: "Professional",
  group: "Group",
};

/**
 * The VEKAT joining fee receipt as a PDF.
 *
 * Only exists once the fee has been confirmed, because the receipt number is issued at that
 * moment. Like the certificate, it is built from the record each time rather than stored: every
 * field comes from the record and none of them change after confirmation.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  }

  const { reference } = await params;
  if (!isReference(reference)) {
    return NextResponse.json({ ok: false, error: "Invalid reference" }, { status: 400 });
  }

  try {
    const { members } = await collections();
    const member = await members.findOne({ reference });
    if (!member) {
      return NextResponse.json({ ok: false, error: "That registration no longer exists" }, { status: 404 });
    }
    const receiptNo = member.payment?.receiptNo;
    if (!receiptNo) {
      return NextResponse.json(
        { ok: false, error: "No receipt yet — the joining fee has not been confirmed" },
        { status: 409 },
      );
    }

    // Home members pay in naira, everyone else in pounds (brief p.3). The amounts are settings.
    const home = member.country === "Nigeria";
    const pdf = await buildReceipt({
      receiptNo,
      fullName: member.fullName,
      applicationRef: member.reference,
      memberNo: member.membership?.memberNo,
      category: CATEGORY[member.memberType] ?? (home ? "Home" : "Diaspora"),
      amount: home ? JOINING_FEE.ngn : JOINING_FEE.gbp,
      currency: home ? "NGN" : "GBP",
      method: member.payment?.method || "Not recorded",
      transactionRef: member.payment?.reference,
      receivedAt: member.payment?.verifiedAt ?? member.updatedAt ?? member.submittedAt,
      payee: JOINING_FEE.payee,
      payeeRole: JOINING_FEE.payeeRole,
    });

    await recordAudit({
      action: "fee.receipt_issued",
      actor: "VEKAT admin (shared login)",
      subject: reference,
      detail: `Receipt ${receiptNo} generated for ${member.fullName}`,
    }).catch(() => {
      // The officer still gets their document if the log write fails.
    });

    return new NextResponse(pdf as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${receiptNo}.pdf"`,
        // Holds personal and payment details: never cached by a proxy or a shared browser.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    // Never returned to the browser: a Mongo error can carry the connection string.
    console.error("[admin] could not build the receipt:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not build the receipt" }, { status: 502 });
  }
}
