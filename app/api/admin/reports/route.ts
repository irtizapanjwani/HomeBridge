import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";
import { buildBoardReports } from "@/lib/board-reports";
import { isDbConfigured } from "@/lib/db";

/** The board reports, built from the live database. */
export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, ...(await buildBoardReports()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[admin] board reports failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not build the reports" }, { status: 502 });
  }
}

/** Records an export in the audit log: member data leaving the system is worth a trace. */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { name?: unknown; kind?: unknown; rows?: unknown };
  const name = typeof b.name === "string" ? b.name.slice(0, 80) : "";
  const kind = b.kind === "xls" ? "Excel" : "CSV";
  if (!name) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  await recordAudit({
    action: "report.exported",
    actor: await currentOfficer(),
    subject: "Board reports",
    detail: `${name} (${kind}${typeof b.rows === "number" ? `, ${b.rows} rows` : ""})`,
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
