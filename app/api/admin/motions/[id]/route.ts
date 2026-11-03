import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { moveMotion } from "@/lib/votes";

/** { to: "open" } opens voting; { to: "closed" } closes it and fixes the result. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  const { id } = await params;
  let b: { to?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (b.to !== "open" && b.to !== "closed") return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  try {
    const r = await moveMotion(id, b.to, await currentOfficer());
    return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 409 });
  } catch {
    return NextResponse.json({ ok: false, error: "That did not work" }, { status: 502 });
  }
}
