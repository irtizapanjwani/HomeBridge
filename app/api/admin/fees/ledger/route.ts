import { NextResponse } from "next/server";

import { isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { joiningFeeLedger } from "@/lib/fee-ledger";

/** Every joining fee owed or paid, from the live member records. */
export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, ...(await joiningFeeLedger()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[admin] fee ledger failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not load the joining fees" }, { status: 502 });
  }
}
