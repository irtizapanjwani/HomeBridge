import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { approveProof, rejectProof } from "@/lib/payment-proofs";
import { siteUrl } from "@/lib/site-url";

/** { action: "approve" } records the contribution; { action: "reject", reason } tells the member why. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  const { id } = await params;
  let body: { action?: unknown; reason?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  try {
    const actor = await currentOfficer();
    const result =
      body.action === "approve"
        ? await approveProof(id, actor)
        : body.action === "reject"
          ? await rejectProof(id, typeof body.reason === "string" ? body.reason : "", actor, siteUrl(req))
          : { ok: false as const, error: "Unknown action", status: 400 };
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin] proof decision failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "That did not work" }, { status: 502 });
  }
}
