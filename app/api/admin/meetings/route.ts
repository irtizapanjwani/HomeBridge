import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { NOTICE_DAYS, agmReplies, cancelAgm, earliestAgmDate, getAgm, setAgm, voterCounts } from "@/lib/meetings";
import { siteUrl } from "@/lib/site-url";

/** The AGM as set, plus the numbers the quorum calculator needs. */
export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    const [agm, voters, replies] = await Promise.all([getAgm(), voterCounts(), agmReplies()]);
    return NextResponse.json({ ok: true, agm, voters, replies, earliest: earliestAgmDate(), noticeDays: NOTICE_DAYS }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[admin] meetings failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not load the meeting details" }, { status: 502 });
  }
}

/** Sets (or moves) the AGM and emails the notice to every member. */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  if (!isEmailConfigured()) return NextResponse.json({ ok: false, error: "No email service is configured" }, { status: 503 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  try {
    const r = await setAgm({ date: str(b.date), time: str(b.time), place: str(b.place), agenda: str(b.agenda) }, await currentOfficer(), siteUrl(req));
    return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 422 });
  } catch (err) {
    console.error("[admin] set AGM failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not set the meeting" }, { status: 502 });
  }
}

/** Cancels the AGM: { tellMembers: boolean, reason?: string }. */
export async function DELETE(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  const b = ((await req.json().catch(() => null)) ?? {}) as { tellMembers?: unknown; reason?: unknown };
  try {
    const r = await cancelAgm({ tellMembers: b.tellMembers === true, reason: typeof b.reason === "string" ? b.reason : "" }, await currentOfficer(), siteUrl(req));
    return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 422 });
  } catch (err) {
    console.error("[admin] cancel AGM failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not cancel the meeting" }, { status: 502 });
  }
}
