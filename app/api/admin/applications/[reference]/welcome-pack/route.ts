import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { siteUrl } from "@/lib/site-url";
import { sendWelcomePack } from "@/lib/welcome-pack";

import { isApplicationReference as isReference } from "@/lib/members";

/**
 * Sends the welcome pack to an admitted member, or sends it again.
 *
 * Deliberately an action an officer takes rather than something approval fires on its own. The
 * brief wants it automatic, and the send itself is ready for that — but it posts real documents to
 * a real person, so it stays on a button until the client's sending domain and the three
 * outstanding per-member forms are settled. Calling sendWelcomePack from the approval is then a
 * one-line change.
 */
export async function POST(req: Request, { params }: { params: Promise<{ reference: string }> }) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "No email service is configured — set RESEND_API_KEY" },
      { status: 503 },
    );
  }

  const { reference } = await params;
  if (!isReference(reference)) {
    return NextResponse.json({ ok: false, error: "Invalid reference" }, { status: 400 });
  }

  try {
    const result = await sendWelcomePack(reference, await currentOfficer(), siteUrl(req));
    if (!result.ok) {
      const status = result.code === "not_found" ? 404 : result.code === "not_admitted" ? 409 : 502;
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }
    return NextResponse.json({
      ok: true,
      sentAt: result.sentAt.toISOString(),
      documents: result.attachments,
    });
  } catch (err) {
    // Never returned to the browser: a Mongo or provider error can carry credentials.
    console.error("[admin] could not send the welcome pack:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not send the welcome pack" }, { status: 502 });
  }
}
