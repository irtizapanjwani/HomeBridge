import { NextResponse } from "next/server";

import { isSignedIn } from "@/lib/admin-auth";
import { findContribution, receiptPdfFor } from "@/lib/contributions";
import { isDbConfigured } from "@/lib/db";
import { collections } from "@/lib/members";

/** A contribution receipt as a PDF, for officers. */
export async function GET(_req: Request, { params }: { params: Promise<{ receiptNo: string }> }) {
  if (!(await isSignedIn())) return new NextResponse("Not signed in", { status: 401 });
  if (!isDbConfigured()) return new NextResponse("No database is configured", { status: 503 });
  const { receiptNo } = await params;
  if (!/^HBC-CR-\d{4}-\d{5,}$/.test(receiptNo)) return new NextResponse("Invalid receipt number", { status: 400 });
  try {
    const c = await findContribution(receiptNo);
    const member = c ? await (await collections()).members.findOne({ reference: c.memberRef }) : null;
    if (!c || !member) return new NextResponse("Not found", { status: 404 });
    return new NextResponse((await receiptPdfFor(member, c)) as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${receiptNo}.pdf"`, "Cache-Control": "private, no-store" },
    });
  } catch {
    return new NextResponse("Could not create the receipt", { status: 502 });
  }
}
