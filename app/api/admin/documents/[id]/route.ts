import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";
import { isDbConfigured } from "@/lib/db";
import { DOC_LABEL, isDocContentType } from "@/lib/document-types";
import { findDocumentMeta, readDocument, verifyViewToken } from "@/lib/documents";

/**
 * Serves one applicant document to a signed-in officer holding a fresh signed link.
 *
 * Brief p.6: "Audit log of every view of an ID document". The view is written to the audit log
 * before a single byte is served, and if that write fails nothing is served: a view that cannot be
 * recorded does not happen.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSignedIn())) {
    return new NextResponse("Not signed in", { status: 401 });
  }
  if (!isDbConfigured()) {
    return new NextResponse("No database is configured", { status: 503 });
  }

  const { id } = await params;
  const token = new URL(req.url).searchParams.get("t") ?? "";
  if (!verifyViewToken(id, token)) {
    return new NextResponse("This link has expired. Close this tab and click View again in the admin.", { status: 403 });
  }

  try {
    const found = await findDocumentMeta(id);
    if (!found) return new NextResponse("That document no longer exists", { status: 404 });

    await recordAudit({
      action: "document.viewed",
      actor: await currentOfficer(),
      subject: found.ownerRef,
      detail: `Viewed ${DOC_LABEL[found.meta.type].toLowerCase()} (${found.meta.name})`,
    });

    const doc = await readDocument(id);
    if (!doc) return new NextResponse("That document no longer exists", { status: 404 });

    const type = isDocContentType(doc.meta.contentType) ? doc.meta.contentType : "application/octet-stream";
    const safeName = doc.meta.name.replace(/[^\w.\- ()]+/g, "_").slice(0, 100) || "document";
    return new NextResponse(new Uint8Array(doc.bytes), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(doc.bytes.byteLength),
        "Content-Disposition": `inline; filename="${safeName}"`,
        // Only images and PDFs are ever stored. Images get a full sandbox: no scripts, no outbound
        // requests. A sandbox stops the browser's own PDF viewer from opening, so a PDF is instead
        // kept from being framed by any other site.
        "Content-Security-Policy":
          type === "application/pdf"
            ? "frame-ancestors 'self'"
            : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
        // Identity documents: never cached anywhere, and not offered to search engines.
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (err) {
    console.error("[admin] could not serve a document:", err instanceof Error ? err.message : "unknown error");
    return new NextResponse("Could not open the document", { status: 502 });
  }
}
