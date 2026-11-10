import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { currentMemberRef, isMemberAuthConfigured } from "@/lib/member-auth";
import { buildAccountView } from "@/lib/member-view";

// One member's own record, so never cached anywhere.
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store, private" };

/**
 * Everything the signed-in member sees on their dashboard, as JSON — the same data the website's
 * /app page shows. The mobile app calls this with "Authorization: Bearer <token>" for Home,
 * My account, Contribute and Vote. Applicants get their application; members also get
 * membership, contributions, votes, the next meeting and the at-a-glance figures.
 */
export async function GET() {
  if (!isMemberAuthConfigured() || !isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "Sign-in is not configured" }, { status: 503, headers: NO_STORE });
  }
  const ref = await currentMemberRef();
  if (!ref) return NextResponse.json({ ok: false, error: "Please sign in" }, { status: 401, headers: NO_STORE });

  try {
    const account = await buildAccountView(ref);
    if (!account) return NextResponse.json({ ok: false, error: "Please sign in" }, { status: 401, headers: NO_STORE });
    return NextResponse.json({ ok: true, account }, { headers: NO_STORE });
  } catch (err) {
    console.error("[member-me] failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not load your account just now" }, { status: 502, headers: NO_STORE });
  }
}
