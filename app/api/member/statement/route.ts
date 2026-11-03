import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { currentMemberRef, findMemberByRef } from "@/lib/member-auth";
import { buildStatementCsv, buildStatementPdf, isPeriod } from "@/lib/statements";

/** The signed-in member's own statement for ?from=YYYY-MM&to=YYYY-MM, as PDF or CSV (brief §3: "Any date range can be downloaded"). */
export async function GET(req: Request) {
  if (!isDbConfigured()) return new NextResponse("Not available", { status: 503 });
  const ref = await currentMemberRef();
  if (!ref) return new NextResponse("Please sign in again", { status: 401 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const format = url.searchParams.get("format") === "csv" ? "csv" : "pdf";
  if (!isPeriod(from) || !isPeriod(to) || from > to) return new NextResponse("Choose a valid range of months", { status: 400 });
  try {
    const member = await findMemberByRef(ref);
    if (!member?.membership) return new NextResponse("Not found", { status: 404 });
    const name = `HomeBridge statement ${member.membership.memberNo} ${from}${from === to ? "" : ` to ${to}`}`;
    if (format === "csv") {
      return new NextResponse(await buildStatementCsv(member, from, to), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"`, "Cache-Control": "private, no-store" },
      });
    }
    return new NextResponse((await buildStatementPdf(member, from, to)) as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}.pdf"`, "Cache-Control": "private, no-store" },
    });
  } catch {
    return new NextResponse("Could not create the statement", { status: 502 });
  }
}
