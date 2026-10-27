import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/admin-auth";
import { findReceipt } from "@/lib/applications";
import { isDbConfigured } from "@/lib/db";

import { isApplicationReference as isReference } from "@/lib/members";

/** Only what a receipt may be, so a stored type cannot turn into something the browser executes. */
const SERVABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);

/**
 * Serves the payment receipt an applicant uploaded on the VEKAT form.
 *
 * Behind the admin session: a receipt shows a bank account and a name, so it must not be reachable
 * by anyone who guesses a reference.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
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
    const receipt = await findReceipt(reference);
    if (!receipt) {
      return NextResponse.json({ ok: false, error: "No receipt was uploaded" }, { status: 404 });
    }

    const type = SERVABLE.has(receipt.type) ? receipt.type : "application/octet-stream";
    // The stored name came from the applicant's device, so quotes and newlines are stripped before
    // it goes into a header.
    const safeName = receipt.name.replace(/[^\w.\- ]+/g, "_").slice(0, 100) || "receipt";

    return new NextResponse(new Uint8Array(receipt.bytes), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(receipt.bytes.byteLength),
        // Shown in the page when the browser can, downloaded when it cannot.
        "Content-Disposition": `inline; filename="${safeName}"`,
        // A sandbox, in case a crafted file is ever served: no scripts, no outbound requests.
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
        // Personal data: never cached by a proxy, and gone from the browser on sign-out.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[admin] could not read the receipt:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not read the receipt" }, { status: 502 });
  }
}
