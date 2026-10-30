import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isDbConfigured } from "@/lib/db";
import { isRemindersAuto, runFormsReminders, setRemindersAuto } from "@/lib/forms-reminders";
import { siteUrl } from "@/lib/site-url";

/** Reads the automatic forms-reminders switch. */
export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, on: await isRemindersAuto() });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read the setting" }, { status: 502 });
  }
}

/** { on: boolean } flips the switch; { run: true } sends every reminder that is due right now. */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  let body: { on?: unknown; run?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  try {
    if (body.run === true) {
      const result = await runFormsReminders(siteUrl(req), { force: true, actor: await currentOfficer() });
      return NextResponse.json({ ok: true, ...result });
    }
    if (typeof body.on !== "boolean") return NextResponse.json({ ok: false, error: "Expected on: true or false" }, { status: 400 });
    await setRemindersAuto(body.on, await currentOfficer());
    return NextResponse.json({ ok: true, on: body.on });
  } catch {
    return NextResponse.json({ ok: false, error: "That did not work" }, { status: 502 });
  }
}
