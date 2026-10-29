import { NextResponse } from "next/server";

import { currentOfficer, isSignedIn } from "@/lib/admin-auth";
import { isWelcomeAutoSend, setWelcomeAutoSend } from "@/lib/app-settings";
import { isDbConfigured } from "@/lib/db";

/** Reads the "send the welcome pack automatically" switch. */
export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, on: await isWelcomeAutoSend() });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read the setting" }, { status: 502 });
  }
}

/** Turns automatic sending on or off. Recorded in the audit log with who changed it. */
export async function POST(req: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  let on: unknown;
  try {
    on = ((await req.json()) as { on?: unknown }).on;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (typeof on !== "boolean") return NextResponse.json({ ok: false, error: "Expected on: true or false" }, { status: 400 });
  try {
    await setWelcomeAutoSend(on, await currentOfficer());
    return NextResponse.json({ ok: true, on });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not save the setting" }, { status: 502 });
  }
}
