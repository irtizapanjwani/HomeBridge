import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { runPaymentReminders } from "@/lib/payment-reminders";
import { siteUrl } from "@/lib/site-url";

/**
 * Called once a day by Vercel Cron (vercel.json), 07:00 UTC = 08:00 Lagos. Vercel sends
 * "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set, so nobody else can trigger a round
 * of emails. Does nothing while payment reminders are switched off in Settings.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 401 });
  }
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    const result = await runPaymentReminders(siteUrl(req));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron] payment reminders failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Reminders failed" }, { status: 502 });
  }
}
