import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { currentMemberRef, findMemberByRef } from "@/lib/member-auth";
import { castVote, isChoice } from "@/lib/votes";

/** { motionId, choice } — the signed-in member's one vote on an open motion. */
export async function POST(req: Request) {
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "Not available just now" }, { status: 503 });
  const ref = await currentMemberRef();
  if (!ref) return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });
  let b: { motionId?: unknown; choice?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (typeof b.motionId !== "string" || !isChoice(b.choice)) return NextResponse.json({ ok: false, error: "Choose For, Against or Abstain" }, { status: 422 });
  try {
    const member = await findMemberByRef(ref);
    if (!member) return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });
    const r = await castVote(member, b.motionId, b.choice);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Your vote could not be saved. Please try again." }, { status: 502 });
  }
}
