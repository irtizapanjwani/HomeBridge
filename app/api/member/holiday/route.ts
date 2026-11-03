import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { currentMemberRef, findMemberByRef } from "@/lib/member-auth";
import { requestHoliday } from "@/lib/payment-holidays";

/** { from, to, reason } — the signed-in member asks for a payment holiday. */
export async function POST(req: Request) {
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "Not available just now" }, { status: 503 });
  const ref = await currentMemberRef();
  if (!ref) return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });
  let b: { from?: unknown; to?: unknown; reason?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  try {
    const member = await findMemberByRef(ref);
    if (!member) return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });
    const r = await requestHoliday(member, str(b.from), str(b.to), str(b.reason));
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: r.error }, { status: 422 });
  } catch {
    return NextResponse.json({ ok: false, error: "We could not send that. Please try again." }, { status: 502 });
  }
}
