import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";
import { isDbConfigured } from "@/lib/db";
import { matchStatement } from "@/lib/statement-match";

/** A statement export is text; a year of daily lines is well under this. */
const MAX_CSV = 2 * 1024 * 1024;

/**
 * Reads an uploaded bank statement (CSV) and suggests which line pays which applicant's joining fee.
 * Changes nothing: each suggestion is confirmed separately by the officer.
 */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });

  let csv = "";
  try {
    const body = (await req.json()) as { csv?: unknown };
    csv = typeof body.csv === "string" ? body.csv : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (!csv.trim()) return NextResponse.json({ ok: false, error: "The file is empty" }, { status: 422 });
  if (csv.length > MAX_CSV) return NextResponse.json({ ok: false, error: "That file is too large" }, { status: 413 });

  try {
    const result = await matchStatement(csv);
    if (result.missing.length) {
      return NextResponse.json(
        { ok: false, error: `The statement needs ${result.missing.join(" and ")}. Export it from the bank as CSV with headers.` },
        { status: 422 },
      );
    }
    const suggested = result.lines.filter((l) => l.suggestion).length;
    await recordAudit({
      action: "fees.statement_checked",
      actor: await currentOfficer(),
      subject: "Bank statement",
      detail: `${result.lines.length} credit lines read, ${suggested} matched to applicants`,
    }).catch(() => {});
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[admin] could not read the statement:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not read the statement" }, { status: 502 });
  }
}
