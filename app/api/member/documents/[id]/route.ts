import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { findDocumentMeta, readDocument } from "@/lib/documents";
import { currentMemberRef } from "@/lib/member-auth";

/**
 * Lets a member download a copy of a form they signed online. Only their own, and only signed
 * forms: ID documents are not served back to members (brief p.6: no ID images sent back out).
 */
const OWN_DOWNLOADABLE = new Set(["declaration", "nominee_form"]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDbConfigured()) return new NextResponse("Not available", { status: 503 });
  const ref = await currentMemberRef();
  if (!ref) return new NextResponse("Please sign in again", { status: 401 });

  const { id } = await params;
  try {
    const found = await findDocumentMeta(id);
    if (!found || found.ownerRef !== ref || !OWN_DOWNLOADABLE.has(found.meta.type)) {
      return new NextResponse("Not found", { status: 404 });
    }
    const doc = await readDocument(id);
    if (!doc) return new NextResponse("Not found", { status: 404 });
    const safeName = doc.meta.name.replace(/[^\w.\- ()]+/g, "_").slice(0, 100) || "form.pdf";
    return new NextResponse(new Uint8Array(doc.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Could not open the form", { status: 502 });
  }
}
