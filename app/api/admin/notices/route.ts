import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { chapters, parseAudience, previewCount, recentBroadcasts, sendBroadcast } from "@/lib/broadcast";
import { isDbConfigured } from "@/lib/db";

/** The chapters to choose from, and the notices already sent. */
export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    const [zones, recent] = await Promise.all([chapters(), recentBroadcasts()]);
    return NextResponse.json({ ok: true, zones, recent });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not load notices" }, { status: 502 });
  }
}

/** { audience, preview: true } counts who would get it; { audience, subject, message } sends it. */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  let b: { audience?: unknown; preview?: unknown; subject?: unknown; message?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const audience = parseAudience(b.audience);
  if (!audience) return NextResponse.json({ ok: false, error: "Choose who gets it" }, { status: 422 });
  try {
    if (b.preview === true) return NextResponse.json({ ok: true, ...(await previewCount(audience)) });
    const r = await sendBroadcast(audience, typeof b.subject === "string" ? b.subject : "", typeof b.message === "string" ? b.message : "", await currentOfficer());
    return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 422 });
  } catch (err) {
    console.error("[admin] notice:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "That did not work" }, { status: 502 });
  }
}
