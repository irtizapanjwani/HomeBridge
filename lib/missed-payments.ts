// Missed-payment flags (brief Phase 3: "flag missed months against the minimum; optional reminder
// emails").
//
// Bye-law 11.2 sets a minimum monthly contribution (₦5,000 or £25, a setting). For a chosen month,
// every admitted member is checked against what has been recorded for that month in the
// contributions ledger. A member is counted from the month they were admitted. Nothing here changes
// money: it only reads the ledger, and sends Email F when an officer asks.

import "server-only";

import { recordAudit } from "@/lib/audit";
import { type ContributionCurrency, allContributions, money, periodLabel, periodOf } from "@/lib/contributions";
import { sendEmail } from "@/lib/email";
import { buttonBlock, renderTemplate } from "@/lib/email-templates";
import { type MemberDoc, collections } from "@/lib/members";
import { MIN_MONTHLY } from "@/lib/settings";

export const isPeriod = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** The current month in Nigeria, where the society keeps its books. */
export function currentPeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

/** Every month from `from` to `to`, inclusive, as YYYY-MM. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Nigeria-based members pay the naira minimum; everyone else the pound minimum (bye-law 11.2). */
export const homeCurrency = (country: string): "NGN" | "GBP" => (country === "Nigeria" ? "NGN" : "GBP");
export const minimumFor = (country: string) => (homeCurrency(country) === "NGN" ? money(MIN_MONTHLY.ngn, "NGN") : money(MIN_MONTHLY.gbp, "GBP"));

type Totals = Partial<Record<ContributionCurrency, number>>;

/**
 * Whether a month's payments meet the minimum. A naira total of ₦5,000 or a pound total of £25
 * meets it whichever the member's usual currency. The Board has not set a dollar minimum yet, so
 * any dollar payment counts as meeting it until it does.
 */
export function meetsMinimum(t: Totals): boolean {
  return (t.NGN ?? 0) >= MIN_MONTHLY.ngn || (t.GBP ?? 0) >= MIN_MONTHLY.gbp || (t.USD ?? 0) > 0;
}

const describe = (t: Totals) =>
  (Object.entries(t) as [ContributionCurrency, number][])
    .filter(([, v]) => v > 0)
    .map(([c, v]) => money(v, c))
    .join(" + ");

export type MissedRow = {
  memberNo: string;
  reference: string;
  name: string;
  email: string;
  chapter: string;
  minimum: string;
  /** "Not paid" or "Below minimum". */
  state: "Not paid" | "Below minimum";
  /** What was received for the month, e.g. "₦2,000", or "". */
  paid: string;
  /** Months from admission to the chosen month that are short, including it. */
  monthsShort: number;
  shortMonths: string[];
  lastPaid: string;
  remindedAt: string | null;
};

export type MissedResult = {
  period: string;
  label: string;
  checked: number;
  paidCount: number;
  rows: MissedRow[];
};

const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

/** Members short for `period`, with how many months they are behind in total. */
export async function missedPayments(period: string): Promise<MissedResult> {
  const { members } = await collections();
  const admitted = await members
    .find(
      { "membership.memberNo": { $exists: true }, "membership.admittedAt": { $lt: monthEnd(period) } },
      { projection: { reference: 1, fullName: 1, email: 1, country: 1, chapter: 1, membership: 1, contributionReminders: 1 } },
    )
    .sort({ "membership.seq": 1 })
    .toArray();

  // member → period → currency → total
  const ledger = new Map<string, Map<string, Totals>>();
  const lastPaid = new Map<string, Date>();
  for (const c of await allContributions()) {
    const byPeriod = ledger.get(c.memberNo) ?? new Map<string, Totals>();
    ledger.set(c.memberNo, byPeriod);
    const t = byPeriod.get(c.period) ?? {};
    t[c.currency] = (t[c.currency] ?? 0) + c.amount;
    byPeriod.set(c.period, t);
    const prev = lastPaid.get(c.memberNo);
    if (!prev || c.paidAt > prev) lastPaid.set(c.memberNo, c.paidAt);
  }

  const rows: MissedRow[] = [];
  let paidCount = 0;
  for (const m of admitted) {
    const no = m.membership!.memberNo;
    const byPeriod = ledger.get(no) ?? new Map<string, Totals>();
    const thisMonth = byPeriod.get(period) ?? {};
    if (meetsMinimum(thisMonth)) {
      paidCount++;
      continue;
    }
    const short = monthsBetween(periodOf(m.membership!.admittedAt), period).filter((p) => !meetsMinimum(byPeriod.get(p) ?? {}));
    const paid = describe(thisMonth);
    const reminded = m.contributionReminders?.[period];
    rows.push({
      memberNo: no,
      reference: m.reference,
      name: m.fullName,
      email: m.email,
      chapter: m.chapter,
      minimum: minimumFor(m.country),
      state: paid ? "Below minimum" : "Not paid",
      paid,
      monthsShort: short.length,
      shortMonths: short.map(periodLabel),
      lastPaid: lastPaid.has(no) ? DAY.format(lastPaid.get(no)!) : "",
      remindedAt: reminded ? DAY.format(reminded) : null,
    });
  }
  return { period, label: periodLabel(period), checked: admitted.length, paidCount, rows };
}

/** The first moment after the month, so members admitted during it are included. */
function monthEnd(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)); // month index m is the next month
}

// ---------- Email F ----------

async function sendOne(m: MemberDoc, period: string, site: string, paid: string) {
  if (!m.email?.trim()) return { ok: false as const, error: "the member has no email address" };
  const portal = `${site.replace(/\/+$/, "")}/app`;
  const email = await renderTemplate(
    "F",
    {
      FirstName: m.firstName?.trim() || m.fullName.trim().split(/\s+/)[0] || "there",
      MemberNo: m.membership!.memberNo,
      Month: periodLabel(period),
      Minimum: minimumFor(m.country),
      PaidNote: paid ? `So far we have received ${paid} for that month.` : "",
      PortalLink: portal,
    },
    { BUTTON: buttonBlock("See your contributions", portal) },
  );
  const sent = await sendEmail({ to: m.email, ...email });
  return sent.ok ? { ok: true as const } : { ok: false as const, error: sent.error };
}

export type ReminderRun = { sent: number; failed: number; skipped: number; errors: string[] };

/**
 * Emails the members named (or, with `all`, everyone short for the month who has not already been
 * reminded about it). Each member is re-checked against the ledger first, so someone who paid since
 * the screen loaded is not chased.
 */
export async function sendMissedReminders(
  period: string,
  target: { memberNos: string[] } | { all: true },
  actor: string,
  site: string,
): Promise<ReminderRun> {
  const current = await missedPayments(period);
  const short = new Map(current.rows.map((r) => [r.memberNo, r]));
  const wanted =
    "all" in target ? current.rows.filter((r) => !r.remindedAt).map((r) => r.memberNo) : target.memberNos.map((n) => n.trim().toUpperCase());

  const { members } = await collections();
  const run: ReminderRun = { sent: 0, failed: 0, skipped: 0, errors: [] };
  for (const no of wanted) {
    const row = short.get(no);
    if (!row) {
      run.skipped++;
      continue;
    }
    const m = await members.findOne({ "membership.memberNo": no });
    if (!m?.membership) {
      run.skipped++;
      continue;
    }
    const result = await sendOne(m, period, site, row.paid).catch((err) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : "unknown error",
    }));
    if (result.ok) {
      run.sent++;
      await members.updateOne({ reference: m.reference }, { $set: { [`contributionReminders.${period}`]: new Date() } });
    } else {
      run.failed++;
      run.errors.push(`${no}: ${result.error}`);
    }
    await recordAudit({
      action: result.ok ? "email.contribution_reminder_sent" : "email.contribution_reminder_failed",
      actor,
      subject: no,
      detail: result.ok
        ? `Missed contribution reminder for ${periodLabel(period)} sent to ${m.email}${row.paid ? ` (received ${row.paid})` : ""}`
        : `Missed contribution reminder for ${periodLabel(period)} could not be sent: ${result.error}`,
    }).catch(() => {});
  }
  return run;
}
