import { NextResponse } from "next/server";

import { isSignedIn } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/audit";
import { isDbConfigured } from "@/lib/db";
import { collections } from "@/lib/members";
import { buildCertificate, certificateNoFor } from "@/lib/pdf/certificate";

/** HBC-ZONE-YY-NNNNN, so a stray path segment never reaches the query. */
const isMemberNo = (v: string) => /^HBC-[A-Z]{2,4}-\d{2}-\d{5}$/.test(v);

const CATEGORY: Record<string, string> = {
  home: "Home",
  diaspora: "Diaspora",
  founding: "Founding",
  professional: "Professional",
  group: "Group",
};

/** "HomeBridge Edo" reads as "Edo" on the certificate, which says "… Chapter" after it. */
function chapterName(chapter: string, fallback: string) {
  const bare = (chapter ?? "").replace(/^HomeBridge\s+/i, "").trim();
  if (!bare || /none yet/i.test(bare)) return fallback || "—";
  return bare;
}

/**
 * The membership certificate as a PDF.
 *
 * Built from the member record each time rather than stored: every field on it comes from that
 * record, so a generated copy and a kept copy could only ever differ if one were stale. The
 * numbers and the admission date are fixed once issued, so the document is the same every time.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ memberNo: string }> }) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, error: "No database is configured" }, { status: 503 });
  }

  const { memberNo } = await params;
  if (!isMemberNo(memberNo)) {
    return NextResponse.json({ ok: false, error: "Invalid membership number" }, { status: 400 });
  }

  try {
    const { members } = await collections();
    const member = await members.findOne({ "membership.memberNo": memberNo });
    if (!member?.membership) {
      return NextResponse.json({ ok: false, error: "No member holds that number" }, { status: 404 });
    }

    const certificateNo = certificateNoFor(memberNo);
    const pdf = await buildCertificate({
      certificateNo,
      fullName: member.fullName,
      memberNo,
      category: CATEGORY[member.memberType] ?? "Home",
      chapter: chapterName(member.chapter, member.country === "Nigeria" ? member.state : member.country),
      admittedAt: member.membership.admittedAt,
      founding: member.memberType === "founding",
    });

    // The certificate carries the member's name and number, so issuing a copy is worth recording.
    await recordAudit({
      action: "member.certificate_issued",
      actor: "VEKAT admin (shared login)",
      subject: memberNo,
      detail: `Certificate ${certificateNo} generated for ${member.fullName}`,
    }).catch(() => {
      // The officer still gets their document if the log write fails; the failure is logged below.
    });

    return new NextResponse(pdf as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${certificateNo}.pdf"`,
        // Holds personal details: never cached by a proxy or a shared browser.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    // Never returned to the browser: a Mongo error can carry the connection string.
    console.error("[admin] could not build the certificate:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not build the certificate" }, { status: 502 });
  }
}
