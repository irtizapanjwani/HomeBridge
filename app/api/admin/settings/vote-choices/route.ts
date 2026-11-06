import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isVoteChoicesVisible, setVoteChoicesVisible } from "@/lib/app-settings";
import { isDbConfigured } from "@/lib/db";

export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  return NextResponse.json({ ok: true, on: await isVoteChoicesVisible() });
}

export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  const b = (await req.json().catch(() => null)) as { on?: unknown } | null;
  if (typeof b?.on !== "boolean") return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  await setVoteChoicesVisible(b.on, await currentOfficer());
  return NextResponse.json({ ok: true, on: b.on });
}
