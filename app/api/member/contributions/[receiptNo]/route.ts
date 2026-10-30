import { NextResponse } from "next/server";

import { findContribution, receiptPdfFor } from "@/lib/contributions";
import { isDbConfigured } from "@/lib/db";
import { currentMemberRef, findMemberByRef } from "@/lib/member-auth";

/** A member's own contribution receipt. Only theirs: the receipt must belong to the signed-in member. */
export async function GET(_req: Request, { params }: { params: Promise<{ receiptNo: string }> }) {
  if (!isDbConfigured()) return new NextResponse("Not available", { status: 503 });
  const ref = await currentMemberRef();
  if (!ref) return new NextResponse("Please sign in again", { status: 401 });
  const { receiptNo } = await params;
  try {
    const c = /^HBC-CR-\d{4}-\d{5,}$/.test(receiptNo) ? await findContribution(receiptNo) : null;
    const member = c && c.memberRef === ref ? await findMemberByRef(ref) : null;
    if (!c || !member) return new NextResponse("Not found", { status: 404 });
    return new NextResponse((await receiptPdfFor(member, c)) as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${receiptNo}.pdf"`, "Cache-Control": "private, no-store" },
    });
  } catch {
    return new NextResponse("Could not create the receipt", { status: 502 });
  }
}
