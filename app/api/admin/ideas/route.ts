import { NextResponse } from "next/server";

import { isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { listIdeasForAdmin } from "@/lib/votes";

export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, ideas: await listIdeasForAdmin() });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not load the ideas" }, { status: 502 });
  }
}
