import { NextResponse } from "next/server";

import { isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { createViewToken, findDocumentMeta, isDocumentStorageConfigured } from "@/lib/documents";

/**
 * Hands a signed-in officer a link to one document that works for five minutes (brief p.6:
 * "access through short-lived signed links only"). The link alone is not enough: the route behind
 * it also checks the admin session, so a link copied out of the browser is useless to anyone else.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  if (!isDbConfigured() || !isDocumentStorageConfigured()) {
    return NextResponse.json({ ok: false, error: "Document storage is not configured" }, { status: 503 });
  }

  const { id } = await params;
  try {
    const found = await findDocumentMeta(id);
    if (!found) return NextResponse.json({ ok: false, error: "That document no longer exists" }, { status: 404 });
    const token = createViewToken(id);
    return NextResponse.json({ ok: true, url: `/api/admin/documents/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}` });
  } catch (err) {
    console.error("[admin] could not create a document link:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not open the document" }, { status: 502 });
  }
}
