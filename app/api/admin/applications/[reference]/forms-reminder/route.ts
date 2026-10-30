import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { sendReminderNow } from "@/lib/forms-reminders";
import { isApplicationReference as isReference } from "@/lib/members";
import { siteUrl } from "@/lib/site-url";

/** An officer sends Email E (forms reminder) to one member straight away. */
export async function POST(req: Request, { params }: { params: Promise<{ reference: string }> }) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  if (!isEmailConfigured()) return NextResponse.json({ ok: false, error: "No email service is configured" }, { status: 503 });
  const { reference } = await params;
  if (!isReference(reference)) return NextResponse.json({ ok: false, error: "Invalid reference" }, { status: 400 });
  try {
    const result = await sendReminderNow(reference, await currentOfficer(), siteUrl(req));
    return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not send the reminder" }, { status: 502 });
  }
}
