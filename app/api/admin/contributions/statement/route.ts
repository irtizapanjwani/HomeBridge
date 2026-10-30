import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";
import { isCurrency, matchContributionStatement } from "@/lib/contributions";
import { isDbConfigured } from "@/lib/db";

/** Reads a cooperative bank statement and suggests which member each payment in belongs to. Changes nothing. */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  let csv = "";
  let currency: unknown;
  try {
    const b = (await req.json()) as { csv?: unknown; currency?: unknown };
    csv = typeof b.csv === "string" ? b.csv : "";
    currency = b.currency;
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
    await recordAudit({
      action: "contributions.statement_checked",
      actor: await currentOfficer(),
      subject: `${currency} statement`,
      detail: `${result.lines.length} payments read, ${result.lines.filter((l) => l.suggestion).length} matched to members, ${result.lines.filter((l) => l.recordedAs).length} already recorded`,
    }).catch(() => {});
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[admin] could not read the statement:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not read the statement" }, { status: 502 });
  }
}
