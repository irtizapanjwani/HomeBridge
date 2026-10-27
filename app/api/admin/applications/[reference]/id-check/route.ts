import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { recordIdCheck, type IdCheckResult } from "@/lib/decisions";

import { isApplicationReference as isReference } from "@/lib/members";

const RESULTS: IdCheckResult[] = ["Pass", "Refer", "Fail"];

/**
 * Records the officer's identity check for one application.
 *
 * Behind the admin session, and the officer is taken from that session rather than the body, so
 * the audit log cannot be told who to credit.
 */
export async function POST(req: Request, { params }: { params: Promise<{ reference: string }> }) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  }

  const { reference } = await params;
  if (!isReference(reference)) {
    return NextResponse.json({ ok: false, error: "Invalid reference" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const result = RESULTS.find((r) => r === body.result);
  if (!result) {
    return NextResponse.json({ ok: false, error: "Unknown ID check result" }, { status: 400 });
  }

  try {
    const outcome = await recordIdCheck({
      reference,
      result,
      note: typeof body.note === "string" ? body.note : undefined,
      actor: await currentOfficer(),
    });
    if (!outcome.ok) {
      return NextResponse.json(
        { ok: false, error: outcome.error },
        { status: outcome.code === "not_found" ? 404 : 409 },
      );
    }
    return NextResponse.json({ ok: true, result: outcome.result });
  } catch (err) {
    // Never returned to the browser: a Mongo error can carry the connection string.
    console.error("[admin] could not record the ID check:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not record the ID check" }, { status: 502 });
  }
}
