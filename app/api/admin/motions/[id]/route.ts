import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isVoteChoicesVisible } from "@/lib/app-settings";
import { isDbConfigured } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";
import { deleteMotion, moveMotion, turnout } from "@/lib/votes";

/** Who has voted and who has not (never how anyone voted). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  const { id } = await params;
  try {
    const t = await turnout(id, { withChoices: await isVoteChoicesVisible(), actor: await currentOfficer() });
    return t ? NextResponse.json({ ok: true, ...t }, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not load who has voted" }, { status: 502 });
  }
}

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
    const r = await moveMotion(id, b.to, await currentOfficer(), siteUrl(req));
    return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 409 });
  } catch {
    return NextResponse.json({ ok: false, error: "That did not work" }, { status: 502 });
  }
}

/** Deletes the motion with its votes and proxies (recorded in the audit log). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  const { id } = await params;
  try {
    const r = await deleteMotion(id, await currentOfficer());
    return r.ok ? NextResponse.json(r) : NextResponse.json(r, { status: 404 });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not delete the motion" }, { status: 502 });
  }
}
