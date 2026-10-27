import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { previewImport, runImport } from "@/lib/gform-import";

/** A spreadsheet of applicants, not a data dump: well above any real export, well below a DoS. */
const MAX_CSV_BYTES = 2_000_000;

/**
 * Reads a Google Form export.
 *
 * With `confirm: false` (the default) it only reports what it found, so an officer can check the
 * columns were understood before anything is written. With `confirm: true` it writes the rows it
 * can, skipping anyone already on file.
 */
export async function POST(req: Request) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) {
    return NextResponse.json({ ok: false, error: "The file is empty" }, { status: 400 });
  }
  if (csv.length > MAX_CSV_BYTES) {
    return NextResponse.json({ ok: false, error: "That file is too large to import in one go" }, { status: 413 });
  }

  try {
    if (body.confirm !== true) {
      const preview = await previewImport(csv);
      return NextResponse.json({ ok: true, preview });
    }
    const result = await runImport(csv, await currentOfficer());
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    // A missing column is the officer's problem to fix and is safe to show; anything else may
    // carry connection details, so only the generic message goes back.
    const expected = message.startsWith("The sheet has no column for");
    if (!expected) console.error("[admin] Google Form import failed:", message);
    return NextResponse.json(
      { ok: false, error: expected ? message : "The import could not be completed" },
      { status: expected ? 422 : 502 },
    );
  }
}
