import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { runFormsReminders } from "@/lib/forms-reminders";
import { siteUrl } from "@/lib/site-url";

/**
 * Called once a day by Vercel Cron (vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>"
 * when CRON_SECRET is set, so nobody else can trigger a round of emails by guessing the address.
 * Does nothing while reminders are switched off in Settings.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 401 });
  }
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    const result = await runFormsReminders(siteUrl(req));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron] forms reminders failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Reminders failed" }, { status: 502 });
  }
}
