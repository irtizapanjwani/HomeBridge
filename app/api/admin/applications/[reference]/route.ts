import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/admin-auth";
import { deleteApplication } from "@/lib/applications";
import { isDbConfigured } from "@/lib/db";

/** A reference as either site issues it, so a stray path segment never reaches the query. */
const isReference = (v: string) => /^(APP|HB)-[A-Z0-9-]{4,40}$/.test(v);

/**
 * Deletes one registration for good.
 *
 * There is no undo and no copy kept, so this is behind the admin session and the screen asks the
 * officer to type the reference before it is called. A registration holds an ID number, so being
 * able to remove one properly matters; it should not be a soft flag that leaves the number in the
 * database.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
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

  try {
    const deleted = await deleteApplication(reference);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "That registration no longer exists" }, { status: 404 });
    }
    // Deliberately not logged with the applicant's details: the point was to remove them.
    console.info(`[admin] registration ${reference} was deleted`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never returned to the browser: a Mongo error can carry the connection string.
    console.error("[admin] could not delete the registration:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not delete the registration" }, { status: 502 });
  }
}
