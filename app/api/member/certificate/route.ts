import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { currentMemberRef, findMemberByRef } from "@/lib/member-auth";
import { memberCertificate } from "@/lib/member-pdfs";

/** The signed-in member's own certificate as a PDF. Only ever their own: the member comes from the session. */
export async function GET() {
  if (!isDbConfigured()) return new NextResponse("Not available", { status: 503 });
  const ref = await currentMemberRef();
  if (!ref) return new NextResponse("Please sign in again", { status: 401 });
  try {
    const member = await findMemberByRef(ref);
    const doc = member ? await memberCertificate(member) : null;
    if (!doc) return new NextResponse("Your certificate is issued once your membership is approved.", { status: 404 });
    return new NextResponse(doc.pdf as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[member] certificate failed:", err instanceof Error ? err.message : "unknown error");
    return new NextResponse("Could not create the document just now", { status: 502 });
  }
}
