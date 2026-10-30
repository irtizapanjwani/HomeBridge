import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/db";
import { isDocumentStorageConfigured } from "@/lib/documents";
import { currentMemberRef } from "@/lib/member-auth";
import { signNomineeForm } from "@/lib/member-forms";

/** A signed-in, admitted member signs their nominee (next of kin) form online. */
export async function POST(req: Request) {
  if (!isDbConfigured() || !isDocumentStorageConfigured()) {
    return NextResponse.json({ ok: false, error: "Signing is not available just now. Please try again later." }, { status: 503 });
  }
  const ref = await currentMemberRef();
  if (!ref) return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  try {
    const result = await signNomineeForm(ref, body);
    return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  } catch (err) {
    console.error("[forms] nominee form failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "We could not save your form. Please try again." }, { status: 502 });
  }
}
