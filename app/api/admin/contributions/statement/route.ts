import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";
import { autoRecordExact, isCurrency, matchContributionStatement } from "@/lib/contributions";
import { isDbConfigured } from "@/lib/db";
import { saveBankLines } from "@/lib/reconciliation";

/**
 * Reads a cooperative bank statement and matches each payment in to a member. With auto: true (the
 * screen's default), payments quoting exactly one membership number are recorded and receipted
 * straight away; everything else is only suggested, for an officer to confirm.
 */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  let csv = "";
  let currency: unknown;
  let auto = false;
  try {
    const b = (await req.json()) as { csv?: unknown; currency?: unknown; auto?: unknown };
    csv = typeof b.csv === "string" ? b.csv : "";
    currency = b.currency;
    auto = b.auto === true;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (!isCurrency(currency)) return NextResponse.json({ ok: false, error: "Choose which account the statement is for" }, { status: 422 });
  if (!csv.trim()) return NextResponse.json({ ok: false, error: "The file is empty" }, { status: 422 });
  if (csv.length > 2 * 1024 * 1024) return NextResponse.json({ ok: false, error: "That file is too large" }, { status: 413 });
  try {
    const result = await matchContributionStatement(csv, currency);
    if (result.missing.length) {
      return NextResponse.json({ ok: false, error: `The statement needs ${result.missing.join(" and ")}. Export it as CSV with headers.` }, { status: 422 });
    }
    const officer = await currentOfficer();
    // Remembered for the reconciliation screen, so an unmatched line is not lost.
    await saveBankLines(result.lines, currency).catch((err) =>
      console.error("[admin] could not keep the bank lines:", err instanceof Error ? err.message : "unknown error"),
    );
    const already = result.lines.filter((l) => l.recordedAs).length;
    const autoRecorded = auto ? await autoRecordExact(result.lines, currency, `${officer} (automatic match)`) : 0;
    await recordAudit({
      action: "contributions.statement_checked",
      actor: officer,
      subject: `${currency} statement`,
      detail: `${result.lines.length} payments read, ${result.lines.filter((l) => l.suggestion).length} matched to members, ${already} already recorded${auto ? `, ${autoRecorded} recorded automatically` : ""}`,
    }).catch(() => {});
    return NextResponse.json({ ok: true, ...result, autoRecorded });
  } catch (err) {
    console.error("[admin] could not read the statement:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not read the statement" }, { status: 502 });
  }
}
