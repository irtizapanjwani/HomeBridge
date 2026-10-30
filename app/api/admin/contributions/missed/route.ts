import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { currentPeriod, isPeriod, missedPayments, sendMissedReminders } from "@/lib/missed-payments";
import { siteUrl } from "@/lib/site-url";

/** Members short of the minimum monthly contribution for a month (default: this month). */
export async function GET(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  const asked = new URL(req.url).searchParams.get("period");
  const now = currentPeriod();
  const period = isPeriod(asked) && asked <= now ? asked : now;
  try {
    return NextResponse.json({ ok: true, current: now, ...(await missedPayments(period)) });
  } catch (err) {
    console.error("[admin] missed payments failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not check payments" }, { status: 502 });
  }
}

/** Sends Email F to chosen members, or to everyone short for the month not yet reminded. */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  if (!isEmailConfigured()) return NextResponse.json({ ok: false, error: "No email service is configured" }, { status: 503 });
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (!isPeriod(b.period) || b.period > currentPeriod()) return NextResponse.json({ ok: false, error: "Choose a month" }, { status: 422 });
  const memberNos = Array.isArray(b.memberNos) ? b.memberNos.filter((x): x is string => typeof x === "string").slice(0, 500) : [];
  if (b.all !== true && memberNos.length === 0) return NextResponse.json({ ok: false, error: "Choose who to remind" }, { status: 422 });
  try {
    const run = await sendMissedReminders(b.period, b.all === true ? { all: true } : { memberNos }, await currentOfficer(), siteUrl(req));
    return NextResponse.json({ ok: true, ...run });
  } catch (err) {
    console.error("[admin] missed reminders failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not send the reminders" }, { status: 502 });
  }
}
