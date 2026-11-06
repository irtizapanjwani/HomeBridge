import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { runPaymentReminders } from "@/lib/payment-reminders";
import { siteUrl } from "@/lib/site-url";
import { runMonthlyStatements } from "@/lib/statements";
import { autoSignOff } from "@/lib/reconciliation";

/**
 * Called once a day by Vercel Cron (vercel.json), 07:00 UTC = 08:00 Lagos. Vercel sends
 * "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set, so nobody else can trigger a round
 * of emails. Also sends the monthly statements from day 10. Each part does nothing while its switch
 * is off in Settings.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 401 });
  }
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    const site = siteUrl(req);
    const reminders = await runPaymentReminders(site);
    const statements = await runMonthlyStatements(site).catch((err) => {
      console.error("[cron] statements failed:", err instanceof Error ? err.message : "unknown error");
      return null;
    });
    // Month-end check: sign off last month's accounts whose bank payments are all recorded.
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - 1);
    const reconciled = await autoSignOff(d.toISOString().slice(0, 7)).catch(() => null);
    return NextResponse.json({ ok: true, reminders, statements, reconciled });
  } catch (err) {
    console.error("[cron] payment reminders failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Reminders failed" }, { status: 502 });
  }
}
