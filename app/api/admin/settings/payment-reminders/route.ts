import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { clearThisMonth, isPaymentRemindersAuto, lagosToday, runPaymentReminders, setPaymentRemindersAuto } from "@/lib/payment-reminders";
import { siteUrl } from "@/lib/site-url";

/** Reads the automatic payment-reminders switch, and today's day in Lagos. */
export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, on: await isPaymentRemindersAuto(), today: lagosToday() });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read the setting" }, { status: 502 });
  }
}

/**
 * { on: boolean } flips the switch.
 * { run: true } sends whatever is due today.
 * { run: true, testDay: N } runs as if today were day N of this month (testing).
 * { clear: true } forgets this month's sent emails so a test can start again (testing).
 */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  let body: { on?: unknown; run?: unknown; testDay?: unknown; clear?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  try {
    const actor = await currentOfficer();
    if (body.clear === true) return NextResponse.json({ ok: true, cleared: await clearThisMonth(actor) });
    if (body.run === true) {
      const testDay = typeof body.testDay === "number" && body.testDay >= 1 && body.testDay <= 28 ? body.testDay : undefined;
      const result = await runPaymentReminders(siteUrl(req), { force: true, actor, testDay });
      return NextResponse.json({ ok: true, ...result });
    }
    if (typeof body.on !== "boolean") return NextResponse.json({ ok: false, error: "Expected on: true or false" }, { status: 400 });
    await setPaymentRemindersAuto(body.on, actor);
    return NextResponse.json({ ok: true, on: body.on });
  } catch (err) {
    console.error("[admin] payment reminders:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "That did not work" }, { status: 502 });
  }
}
