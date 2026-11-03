import { NextResponse } from "next/server";

import { isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { holidayQueue } from "@/lib/payment-holidays";

export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, ...(await holidayQueue()) });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not load the requests" }, { status: 502 });
  }
}
