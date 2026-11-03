import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isCurrency } from "@/lib/contributions";
import { isDbConfigured } from "@/lib/db";
import { dismissLine, reconciliationFor, signOff } from "@/lib/reconciliation";

const isPeriod = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** ?period=YYYY-MM: each account's recorded total and sign-off, unmatched bank lines, old proofs. */
export async function GET(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  const period = new URL(req.url).searchParams.get("period");
  if (!isPeriod(period)) return NextResponse.json({ ok: false, error: "Choose a month" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await reconciliationFor(period)) });
  } catch (err) {
    console.error("[admin] reconciliation:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not load the reconciliation" }, { status: 502 });
  }
}

/** { action: "signoff", period, currency, bankTotal, note } or { action: "dismiss", lineKey, reason }. */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  let b: { action?: unknown; period?: unknown; currency?: unknown; bankTotal?: unknown; note?: unknown; lineKey?: unknown; reason?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  try {
    const actor = await currentOfficer();
    if (b.action === "signoff") {
      if (!isPeriod(b.period) || !isCurrency(b.currency)) return NextResponse.json({ ok: false, error: "Choose a month and an account" }, { status: 422 });
      const total = typeof b.bankTotal === "number" ? b.bankTotal : NaN;
      if (!(total >= 0) || total > 1e12) return NextResponse.json({ ok: false, error: "Enter the bank's total money in for the month" }, { status: 422 });
      await signOff(b.period, b.currency, Math.round(total * 100) / 100, typeof b.note === "string" ? b.note : "", actor);
      return NextResponse.json({ ok: true });
    }
    if (b.action === "dismiss" && typeof b.lineKey === "string") {
      const r = await dismissLine(b.lineKey, typeof b.reason === "string" ? b.reason : "", actor);
      return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: r.error }, { status: 422 });
    }
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[admin] reconciliation:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "That did not work" }, { status: 502 });
  }
}
