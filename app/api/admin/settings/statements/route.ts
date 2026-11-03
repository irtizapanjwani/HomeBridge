import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { clearStatementHistory, isMonthlyStatementsAuto, runMonthlyStatements, sendAnnualStatements, setMonthlyStatementsAuto } from "@/lib/statements";
import { siteUrl } from "@/lib/site-url";

export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, on: await isMonthlyStatementsAuto() });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read the setting" }, { status: 502 });
  }
}

/**
 * { on: boolean } flips the monthly switch. { monthly: true } sends last month's statements now.
 * { annual: YYYY } sends that year's annual statements. { clear: true } forgets what was sent (testing).
 */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  let body: { on?: unknown; monthly?: unknown; annual?: unknown; clear?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  try {
    const actor = await currentOfficer();
    if (body.clear === true) return NextResponse.json({ ok: true, cleared: await clearStatementHistory(actor) });
    if (body.monthly === true) return NextResponse.json({ ok: true, ...(await runMonthlyStatements(siteUrl(req), { force: true, actor })) });
    if (typeof body.annual === "number" && body.annual >= 2026 && body.annual <= 2100) {
      return NextResponse.json({ ok: true, ...(await sendAnnualStatements(body.annual, siteUrl(req), actor)) });
    }
    if (typeof body.on !== "boolean") return NextResponse.json({ ok: false, error: "Expected on: true or false" }, { status: 400 });
    await setMonthlyStatementsAuto(body.on, actor);
    return NextResponse.json({ ok: true, on: body.on });
  } catch (err) {
    console.error("[admin] statements:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "That did not work" }, { status: 502 });
  }
}
