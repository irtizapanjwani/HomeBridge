import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { decideHoliday } from "@/lib/payment-holidays";
import { siteUrl } from "@/lib/site-url";

/** { approve: boolean, note } answers a payment holiday request and emails the member. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  const { id } = await params;
  let b: { approve?: unknown; note?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (typeof b.approve !== "boolean") return NextResponse.json({ ok: false, error: "Approve or decline" }, { status: 400 });
  try {
    const r = await decideHoliday(id, b.approve, typeof b.note === "string" ? b.note : "", await currentOfficer(), siteUrl(req));
    return r.ok ? NextResponse.json(r) : NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  } catch {
    return NextResponse.json({ ok: false, error: "That did not work" }, { status: 502 });
  }
}
