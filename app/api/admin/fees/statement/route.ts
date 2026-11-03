import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";
import { isDbConfigured } from "@/lib/db";
import { autoConfirmExact } from "@/lib/fees";
import { siteUrl } from "@/lib/site-url";
import { matchStatement } from "@/lib/statement-match";
import { maybeAutoSendWelcome } from "@/lib/welcome-pack";

/** A statement export is text; a year of daily lines is well under this. */
const MAX_CSV = 2 * 1024 * 1024;

/**
 * Reads an uploaded bank statement (CSV) and matches each line to an applicant's joining fee. With
 * auto: true (the screen's default), lines quoting the applicant's own application reference for
 * exactly the right amount are confirmed straight away; every other match is only suggested.
 */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });

  let csv = "";
  let auto = false;
  try {
    const body = (await req.json()) as { csv?: unknown; auto?: unknown };
    csv = typeof body.csv === "string" ? body.csv : "";
    auto = body.auto === true;
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
    const officer = await currentOfficer();
    const site = siteUrl(req);
    const autoConfirmed = auto
      ? await autoConfirmExact(result.lines, `${officer} (automatic match)`, (ref) => maybeAutoSendWelcome(ref, officer, site))
      : 0;
    await recordAudit({
      action: "fees.statement_checked",
      actor: officer,
      subject: "Bank statement",
      detail: `${result.lines.length} credit lines read, ${suggested} matched to applicants${auto ? `, ${autoConfirmed} confirmed automatically` : ""}`,
    }).catch(() => {});
    return NextResponse.json({ ok: true, ...result, autoConfirmed });
  } catch (err) {
    console.error("[admin] could not read the statement:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not read the statement" }, { status: 502 });
  }
}
