import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { replyToAgm } from "@/lib/meetings";
import { currentMemberRef, findMemberByRef } from "@/lib/member-auth";

/** { answer: "yes" | "no" } — the signed-in member says whether they will attend the AGM. */
export async function POST(req: Request) {
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "Not available just now" }, { status: 503 });
  const ref = await currentMemberRef();
  if (!ref) return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { answer?: unknown } | null;
  if (b?.answer !== "yes" && b?.answer !== "no") return NextResponse.json({ ok: false, error: "Choose whether you will attend" }, { status: 422 });
  try {
    const member = await findMemberByRef(ref);
    if (!member) return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });
    const r = await replyToAgm(member, b.answer);
    return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 409 });
  } catch {
    return NextResponse.json({ ok: false, error: "Your reply could not be saved. Please try again." }, { status: 502 });
  }
}
