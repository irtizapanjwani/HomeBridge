import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { decideApplication, type Outcome } from "@/lib/decisions";

import { isApplicationReference as isReference } from "@/lib/members";

const OUTCOMES: Outcome[] = ["approve", "decline", "request-info", "review"];

const STATUS_FOR_CODE: Record<string, number> = {
  not_found: 404,
  settled: 409,
  needs_reason: 422,
  supporter: 409,
};

/**
 * Records a vetting decision and, on approval, issues the membership number.
 *
 * Behind the admin session. The officer is taken from that session rather than the request body,
 * so the audit log cannot be told who to blame.
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

  const outcome = OUTCOMES.find((o) => o === body.outcome);
  if (!outcome) {
    return NextResponse.json({ ok: false, error: "Unknown decision" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : undefined;

  try {
    const result = await decideApplication({
      reference,
      outcome,
      reason,
      actor: await currentOfficer(),
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: STATUS_FOR_CODE[result.code] ?? 400 });
    }
    return NextResponse.json({ ok: true, status: result.status, memberNo: result.memberNo, emailed: result.emailed });
  } catch (err) {
    // Never returned to the browser: a Mongo error can carry the connection string.
    console.error("[admin] could not record the decision:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not record the decision" }, { status: 502 });
  }
}
