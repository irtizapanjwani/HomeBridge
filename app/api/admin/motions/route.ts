import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { createMotion, listMotionsForAdmin } from "@/lib/votes";

export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, motions: await listMotionsForAdmin() });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not load the votes" }, { status: 502 });
  }
}

/** { title, details } writes a new motion, not yet open. */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  let b: { title?: unknown; details?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  try {
    const r = await createMotion(typeof b.title === "string" ? b.title : "", typeof b.details === "string" ? b.details : "", await currentOfficer());
    return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 422 });
  } catch {
    return NextResponse.json({ ok: false, error: "That did not work" }, { status: 502 });
  }
}
