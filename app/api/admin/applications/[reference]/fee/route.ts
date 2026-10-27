import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { confirmFeePayment } from "@/lib/fees";

import { isApplicationReference as isReference } from "@/lib/members";

/**
 * Confirms that the joining fee has been received, and issues the VEKAT receipt number.
 *
 * An officer's action today. When Stripe Checkout is wired up its webhook will confirm card
 * payments instead, through the same function, so both routes produce the same receipt.
 */
export async function POST(req: Request, { params }: { params: Promise<{ reference: string }> }) {
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

  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
  } catch {
    // An empty body is fine: the officer is simply confirming what the record already says.
  }

  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

  try {
    const result = await confirmFeePayment({
      reference,
      actor: await currentOfficer(),
      method: str(body.method, 80),
      transactionRef: str(body.transactionRef, 80),
      payerName: str(body.payerName, 120),
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.code === "not_found" ? 404 : 409 },
      );
    }
    return NextResponse.json({ ok: true, receiptNo: result.receiptNo, emailed: result.emailed });
  } catch (err) {
    // Never returned to the browser: a Mongo error can carry the connection string.
    console.error("[admin] could not confirm the fee:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not confirm the fee" }, { status: 502 });
  }
}
