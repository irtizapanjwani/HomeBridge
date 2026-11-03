// Payment holidays (Member Platform brief §2 "request a payment holiday", §6 "Payment holiday
// requests: approve or decline, with start and end month"; bye-law addendum A9: "up to [3] months
// in any 12 months. If approved by the Treasurer, no arrears accrue for those months and no flag is
// raised").
//
// A member asks from their account for one or more months, this month or later, with a reason. An
// officer approves or declines it, and the member is emailed (O or P). Approved months are treated
// as settled everywhere the site checks payments: no reminders, no overdue notice, no
// months-in-a-row count, not listed as missed, and not counted as "behind" on the members' page.

import "server-only";

import { ObjectId } from "mongodb";

import { recordAudit } from "@/lib/audit";
import { periodLabel } from "@/lib/contributions";
import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buttonBlock, renderTemplate } from "@/lib/email-templates";
import { type MemberDoc, collections } from "@/lib/members";

/** The most months a member may be on holiday in any 12 months (addendum A9, board to confirm). */
export const MAX_HOLIDAY_MONTHS = 3;

export type HolidayStatus = "pending" | "approved" | "declined";

type HolidayDoc = {
  _id?: ObjectId;
  memberRef: string;
  memberNo: string;
  name: string;
  from: string; // YYYY-MM
  to: string; // YYYY-MM
  months: string[];
  reason: string;
  status: HolidayStatus;
  submittedAt: Date;
  decidedAt?: Date;
  decidedBy?: string;
  note?: string;
};

async function holidays() {
  return (await getDb()).collection<HolidayDoc>("payment_holidays");
}

const isPeriod = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

function monthsFromTo(from: string, to: string) {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while ((y < ty || (y === ty && m <= tm)) && out.length < 24) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

const monthIndex = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return y * 12 + m;
};

const rangeLabel = (from: string, to: string) => (from === to ? periodLabel(from) : `${periodLabel(from)} to ${periodLabel(to)}`);

function thisPeriod() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

/**
 * Whether these months would take the member over the limit: approved and waiting months that fall
 * in any 12-month window together with the new ones.
 */
async function overLimit(memberRef: string, months: string[]) {
  const existing = await (await holidays()).find({ memberRef, status: { $in: ["approved", "pending"] } }).toArray();
  const all = [...new Set([...existing.flatMap((h) => h.months), ...months])].map(monthIndex).sort((a, b) => a - b);
  for (const start of all) if (all.filter((i) => i >= start && i < start + 12).length > MAX_HOLIDAY_MONTHS) return true;
  return false;
}

export async function requestHoliday(member: MemberDoc, from: string, to: string, reason: string) {
  if (!member.membership) return { ok: false as const, error: "Only members can ask for a payment holiday." };
  if (!isPeriod(from) || !isPeriod(to) || from > to) return { ok: false as const, error: "Choose the first and last month." };
  if (from < thisPeriod()) return { ok: false as const, error: "A payment holiday can start this month at the earliest." };
  const why = reason.trim().slice(0, 1000);
  if (why.length < 5) return { ok: false as const, error: "Tell us briefly why you need it." };
  const months = monthsFromTo(from, to);
  if (months.length > MAX_HOLIDAY_MONTHS) return { ok: false as const, error: `A payment holiday can be up to ${MAX_HOLIDAY_MONTHS} months.` };
  if (await overLimit(member.reference, months)) {
    return { ok: false as const, error: `That would be more than ${MAX_HOLIDAY_MONTHS} months of holiday in 12 months.` };
  }
  const c = await holidays();
  if (await c.findOne({ memberRef: member.reference, status: "pending" })) {
    return { ok: false as const, error: "You already have a request waiting. Please wait for the answer." };
  }
  await c.insertOne({
    memberRef: member.reference,
    memberNo: member.membership.memberNo,
    name: member.fullName,
    from,
    to,
    months,
    reason: why,
    status: "pending",
    submittedAt: new Date(),
  });
  await recordAudit({ action: "holiday.requested", actor: `Member (${member.fullName})`, subject: member.membership.memberNo, detail: `Payment holiday asked for ${rangeLabel(from, to)}: ${why}` });
  return { ok: true as const };
}

const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

const view = (h: HolidayDoc) => ({
  id: String(h._id),
  memberNo: h.memberNo,
  name: h.name,
  months: rangeLabel(h.from, h.to),
  count: h.months.length,
  reason: h.reason,
  status: h.status,
  submittedAt: DAY.format(h.submittedAt),
  decidedAt: h.decidedAt ? DAY.format(h.decidedAt) : "",
  decidedBy: h.decidedBy ?? "",
  note: h.note ?? "",
});

export async function holidaysFor(memberRef: string) {
  return (await (await holidays()).find({ memberRef }).sort({ submittedAt: -1 }).limit(10).toArray()).map(view);
}

export async function holidayQueue() {
  const c = await holidays();
  const [pending, decided] = await Promise.all([
    c.find({ status: "pending" }).sort({ submittedAt: 1 }).toArray(),
    c.find({ status: { $ne: "pending" } }).sort({ decidedAt: -1 }).limit(20).toArray(),
  ]);
  return { pending: pending.map(view), decided: decided.map(view) };
}

/** Approved holiday months, by member number. Everything that checks payments uses this. */
export async function holidayMonths(): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  const rows = await (await holidays()).find({ status: "approved" }, { projection: { memberNo: 1, months: 1 } }).toArray();
  for (const r of rows) {
    const set = out.get(r.memberNo) ?? new Set<string>();
    r.months.forEach((m) => set.add(m));
    out.set(r.memberNo, set);
  }
  return out;
}

export async function decideHoliday(id: string, approve: boolean, note: string, actor: string, site: string) {
  if (!ObjectId.isValid(id)) return { ok: false as const, error: "Not found", status: 404 };
  const why = note.trim().slice(0, 500);
  if (!approve && !why) return { ok: false as const, error: "Say why, so the member understands.", status: 422 };
  const c = await holidays();
  const h = await c.findOneAndUpdate(
    { _id: new ObjectId(id), status: "pending" },
    { $set: { status: approve ? "approved" : "declined", decidedAt: new Date(), decidedBy: actor, note: why } },
  );
  if (!h) return { ok: false as const, error: "This request has already been answered.", status: 409 };

  const { members } = await collections();
  const m = await members.findOne({ reference: h.memberRef });
  let emailed = false;
  if (m?.email?.trim()) {
    const portal = `${site.replace(/\/+$/, "")}/app`;
    const email = await renderTemplate(
      approve ? "O" : "P",
      {
        FirstName: m.firstName?.trim() || m.fullName.trim().split(/\s+/)[0] || "there",
        MemberNo: h.memberNo,
        Months: rangeLabel(h.from, h.to),
        Note: why,
        PortalLink: portal,
      },
      { BUTTON: buttonBlock("Open your account", portal) },
    );
    emailed = (await sendEmail({ to: m.email, ...email })).ok;
  }
  await recordAudit({
    action: approve ? "holiday.approved" : "holiday.declined",
    actor,
    subject: h.memberNo,
    detail: `Payment holiday ${approve ? "approved" : "declined"} for ${rangeLabel(h.from, h.to)}${why ? `: ${why}` : ""}${emailed ? " · member emailed" : " · email not sent"}`,
    before: "Waiting",
    after: approve ? "Approved" : "Declined",
  });
  return { ok: true as const, emailed };
}
