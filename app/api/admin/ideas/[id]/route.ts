import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { IDEA_STATUSES, type IdeaStatus, updateIdea } from "@/lib/votes";

/** { status, reply } marks a member's idea and optionally replies; the member sees both. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  const { id } = await params;
  let b: { status?: unknown; reply?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (!IDEA_STATUSES.includes(b.status as IdeaStatus)) return NextResponse.json({ ok: false, error: "Unknown status" }, { status: 400 });
  try {
    const r = await updateIdea(id, b.status as IdeaStatus, typeof b.reply === "string" ? b.reply : "", await currentOfficer());
    return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 404 });
  } catch {
    return NextResponse.json({ ok: false, error: "That did not work" }, { status: 502 });
  }
}
