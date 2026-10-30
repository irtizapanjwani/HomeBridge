import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isCurrency, money, periodLabel, recentContributions, recordContribution } from "@/lib/contributions";
import { isDbConfigured } from "@/lib/db";
import { collections } from "@/lib/members";

const DATE = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

/** Recent contributions, and the admitted members to record against. */
export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    const [recent, admitted] = await Promise.all([
      recentContributions(50),
      (await collections()).members
        .find({ "membership.memberNo": { $exists: true } }, { projection: { fullName: 1, "membership.memberNo": 1 } })
        .sort({ "membership.seq": 1 })
        .toArray(),
    ]);
    return NextResponse.json({
      ok: true,
      members: admitted.map((m) => ({ memberNo: m.membership!.memberNo, name: m.fullName })),
      recent: recent.map((c) => ({
        receiptNo: c.receiptNo,
        memberNo: c.memberNo,
        amount: money(c.amount, c.currency),
        period: periodLabel(c.period),
        paidAt: DATE.format(c.paidAt),
        bankRef: c.bankRef,
        source: c.source,
        emailed: Boolean(c.emailedAt),
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not load contributions" }, { status: 502 });
  }
}

/** Records one contribution: confirms a statement line, or a manual entry. */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (!isCurrency(b.currency)) return NextResponse.json({ ok: false, error: "Choose NGN, GBP or USD" }, { status: 422 });
  try {
    const result = await recordContribution(
      {
        memberNo: typeof b.memberNo === "string" ? b.memberNo : "",
        amount: Number(b.amount),
        currency: b.currency,
        date: typeof b.date === "string" ? b.date : "",
        bankRef: typeof b.bankRef === "string" ? b.bankRef : "",
        period: typeof b.period === "string" ? b.period : undefined,
        source: b.source === "statement" ? "statement" : "manual",
        lineKey: typeof b.lineKey === "string" && /^[a-f0-9]{64}$/.test(b.lineKey) ? b.lineKey : undefined,
      },
      await currentOfficer(),
    );
    return result.ok
      ? NextResponse.json({ ok: true, receiptNo: result.receiptNo, emailed: result.emailed })
      : NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  } catch (err) {
    console.error("[admin] could not record a contribution:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not record the contribution" }, { status: 502 });
  }
}
