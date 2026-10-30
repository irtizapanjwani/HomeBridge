import { NextResponse } from "next/server";

import { recordAudit } from "@/lib/audit";
import { isDbConfigured } from "@/lib/db";
import { currentMemberRef, findMemberByRef } from "@/lib/member-auth";
import { collections, normPhone } from "@/lib/members";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * A member updates their own contact details (brief Phase 2: "update contact details"). Phone,
 * WhatsApp, address and town only: their name, date of birth and email are what VEKAT verified, so
 * those change through the office. Every change is logged with what it was before.
 */
export async function POST(req: Request) {
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "Not available just now" }, { status: 503 });
  const ref = await currentMemberRef();
  if (!ref) return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const whatsapp = str(body.whatsapp, 40);
  const address = str(body.address, 300);
  const city = str(body.city, 80);
  if (normPhone(whatsapp).length < 7) return NextResponse.json({ ok: false, error: "Enter a phone or WhatsApp number we can reach you on." }, { status: 422 });
  if (address.length < 5) return NextResponse.json({ ok: false, error: "Enter your home address." }, { status: 422 });
  if (city.length < 2) return NextResponse.json({ ok: false, error: "Enter your town or city." }, { status: 422 });

  try {
    const m = await findMemberByRef(ref);
    if (!m) return NextResponse.json({ ok: false, error: "Please sign in again" }, { status: 401 });
    const before = { whatsapp: m.whatsapp || m.contact, address: m.address, city: m.city };
    const changed = (Object.keys(before) as (keyof typeof before)[]).filter((k) => (before[k] ?? "") !== { whatsapp, address, city }[k]);
    if (!changed.length) return NextResponse.json({ ok: true, changed: 0 });

    const { members } = await collections();
    await members.updateOne(
      { reference: ref },
      { $set: { whatsapp, phoneNorm: normPhone(whatsapp), address, city, updatedAt: new Date() } },
    );
    const label = { whatsapp: "phone", address: "address", city: "town" } as const;
    await recordAudit({
      action: "member.contact_updated",
      actor: `Member (${m.fullName})`,
      subject: m.membership?.memberNo ?? ref,
      detail: `Updated ${changed.map((k) => label[k]).join(", ")} from the member portal`,
      before: changed.map((k) => `${label[k]}: ${before[k] || "—"}`).join(" · "),
      after: changed.map((k) => `${label[k]}: ${{ whatsapp, address, city }[k]}`).join(" · "),
    }).catch(() => {});
    return NextResponse.json({ ok: true, changed: changed.length });
  } catch (err) {
    console.error("[member] contact update failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "We could not save your details. Please try again." }, { status: 502 });
  }
}
