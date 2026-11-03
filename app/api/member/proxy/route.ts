import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { currentMemberRef, findMemberByRef } from "@/lib/member-auth";
import { cancelProxy, giveProxy } from "@/lib/votes";

/** { motionId, holderNo } gives the member's proxy; { motionId, cancel: true } takes it back. */
export async function POST(req: Request) {
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "Not available just now" }, { status: 503 });
  const ref = await currentMemberRef();
  if (!ref) return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });
  let b: { motionId?: unknown; holderNo?: unknown; cancel?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (typeof b.motionId !== "string") return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  try {
    const member = await findMemberByRef(ref);
    if (!member) return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });
    const r =
      b.cancel === true
        ? await cancelProxy(member, b.motionId)
        : await giveProxy(member, b.motionId, typeof b.holderNo === "string" ? b.holderNo : "");
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: r.error }, { status: 422 });
  } catch {
    return NextResponse.json({ ok: false, error: "That did not work. Please try again." }, { status: 502 });
  }
}
