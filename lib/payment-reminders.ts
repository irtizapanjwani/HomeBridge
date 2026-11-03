// Automatic monthly payment reminders and arrears (Member Platform brief §4, "Day-7 arrears flag
// and alerts"; bye-law addendum A2, A6 and A7).
//
// A daily job (app/api/cron/payment-reminders) checks every admitted member against this month's
// minimum contribution (₦5,000 or £25, lib/settings.ts) and sends, once each:
//
//   day 1   Email G  "your contribution is due, pay by the 7th"
//   day 5   Email H  friendly reminder
//   day 7   Email I  "today is the last day"
//   day 8   Email F  overdue notice, plus Email K if this makes 2, 3 or 6 months in a row
//   day 15  Email J  second overdue notice; the office list asks for a call
//
// From day 8, the office also gets one daily list of everyone overdue (brief: "daily arrears digest
// to Administrator and Treasurer"). Nothing is stored as a "flag": overdue is worked out from the
// contributions ledger each time, so it clears the moment a payment is recorded.
//
// A member's first cycle is the month after the one they were admitted in, so nobody admitted on
// the 20th is told on the 21st that they are overdue. The job runs at 07:00 UTC (08:00 Lagos), so
// nothing goes out between 21:00 and 07:00.

import "server-only";

import { getSetting, setSetting } from "@/lib/app-settings";
import { recordAudit } from "@/lib/audit";
import { type ContributionCurrency, allContributions, periodLabel, periodOf } from "@/lib/contributions";
import { officeRecipients, sendEmail } from "@/lib/email";
import { type TemplateKey, buttonBlock, renderTemplate } from "@/lib/email-templates";
import { type MemberDoc, collections } from "@/lib/members";
import { meetsMinimum, minimumFor, monthsBetween } from "@/lib/missed-payments";
import { pendingProofMembers } from "@/lib/payment-proofs";

export type Stage = "due" | "day5" | "day7" | "overdue" | "day15";

const STAGES: { stage: Stage; day: number; template: TemplateKey; label: string }[] = [
  { stage: "due", day: 1, template: "G", label: "Due (day 1)" },
  { stage: "day5", day: 5, template: "H", label: "Reminder (day 5)" },
  { stage: "day7", day: 7, template: "I", label: "Last day (day 7)" },
  { stage: "overdue", day: 8, template: "F", label: "Overdue (day 8)" },
  { stage: "day15", day: 15, template: "J", label: "Second notice (day 15)" },
];

/** Months in a row unpaid that get the formal notice (addendum A7), with what it says happens next. */
const ARREARS_STEPS: Record<number, string> = {
  2: "Your zonal coordinator will be in touch to see how we can help.",
  3: "Under the proposed contribution rules, voting rights and eligibility for loans or new projects may be suspended until the arrears are cleared.",
  6: "Under the proposed contribution rules, your account will be referred to the Governing Board, which may consider suspension or exit under the bye-laws. Shares you already hold remain yours.",
};

// ---------- The switch ----------

const AUTO_KEY = "payment_reminders_auto";
const DIGEST_KEY = "payment_digest_last";

/** Off until the office switches it on, so testing never emails a real member by surprise. */
export const isPaymentRemindersAuto = () => getSetting(AUTO_KEY, false);

export async function setPaymentRemindersAuto(on: boolean, actor: string) {
  const before = await isPaymentRemindersAuto();
  await setSetting(
    AUTO_KEY,
    on,
    actor,
    on ? "Payment reminders now send automatically" : "Payment reminders switched off",
    before ? "Automatic" : "Off",
    on ? "Automatic" : "Off",
  );
}

/**
 * Testing only: forgets which payment emails went out this month, so a test can be run again from
 * day 1. Logged. Contributions themselves are never touched.
 */
export async function clearThisMonth(actor: string) {
  const { period } = lagosToday();
  const { members } = await collections();
  const res = await members.updateMany(
    { [`paymentCycle.${period}`]: { $exists: true } },
    { $unset: { [`paymentCycle.${period}`]: "", [`contributionReminders.${period}`]: "" } },
  );
  await recordAudit({
    action: "settings.payment_reminders_reset",
    actor,
    subject: periodLabel(period),
    detail: `Payment-email history for ${periodLabel(period)} cleared for ${res.modifiedCount} member${res.modifiedCount === 1 ? "" : "s"} (testing)`,
  }).catch(() => {});
  return res.modifiedCount;
}

// ---------- Dates ----------

/** Today in Lagos, where the society keeps its books: the month (YYYY-MM), the day, and the date. */
export function lagosToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { period: `${get("year")}-${get("month")}`, day: Number(get("day")), date: `${get("year")}-${get("month")}-${get("day")}` };
}

/** The latest stage that has been reached by `day`, or null before day 1 (never). */
export function stageFor(day: number): (typeof STAGES)[number] | null {
  return [...STAGES].reverse().find((s) => day >= s.day) ?? null;
}

/** The month after `period`. */
function nextPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

const dueByLabel = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${period}-07T12:00:00Z`));

const joinList = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

type Totals = Partial<Record<ContributionCurrency, number>>;

const describe = (t: Totals) =>
  (Object.entries(t) as [ContributionCurrency, number][])
    .filter(([, v]) => v > 0)
    .map(([c, v]) => ({ NGN: "₦", GBP: "£", USD: "$" })[c] + v.toLocaleString("en-GB", { maximumFractionDigits: 2 }))
    .join(" + ");

// ---------- Sending one member ----------

async function sendStage(m: MemberDoc, template: TemplateKey, period: string, paid: string, site: string) {
  if (!m.email?.trim()) return { ok: false as const, error: "the member has no email address" };
  const portal = `${site.replace(/\/+$/, "")}/app`;
  const email = await renderTemplate(
    template,
    {
      FirstName: m.firstName?.trim() || m.fullName.trim().split(/\s+/)[0] || "there",
      MemberNo: m.membership!.memberNo,
      Month: periodLabel(period),
      Minimum: minimumFor(m.country),
      DueBy: dueByLabel(period),
      PaidNote: paid ? `So far we have received ${paid} for that month.` : "",
      PortalLink: portal,
    },
    { BUTTON: buttonBlock("See your contributions", portal) },
  );
  const sent = await sendEmail({ to: m.email, ...email });
  return sent.ok ? { ok: true as const } : { ok: false as const, error: sent.error };
}

async function sendArrears(m: MemberDoc, months: string[], site: string) {
  if (!m.email?.trim()) return { ok: false as const, error: "the member has no email address" };
  const portal = `${site.replace(/\/+$/, "")}/app`;
  const email = await renderTemplate(
    "K",
    {
      FirstName: m.firstName?.trim() || m.fullName.trim().split(/\s+/)[0] || "there",
      MemberNo: m.membership!.memberNo,
      MonthsBehind: String(months.length),
      ShortMonths: joinList(months.map(periodLabel)),
      Consequence: ARREARS_STEPS[months.length] ?? "",
      PortalLink: portal,
    },
    { BUTTON: buttonBlock("See your contributions", portal) },
  );
  const sent = await sendEmail({ to: m.email, ...email });
  return sent.ok ? { ok: true as const } : { ok: false as const, error: sent.error };
}

// ---------- The daily run ----------

export type OverdueRow = { memberNo: string; name: string; chapter: string; email: string; paid: string; monthsInRow: number; callNeeded: boolean };

export type PaymentRunResult = {
  skipped: "off" | null;
  period: string;
  day: number;
  stage: string | null;
  checked: number;
  upToDate: number;
  sent: number;
  failed: number;
  arrearsNotices: number;
  overdue: number;
  digest: "sent" | "none_overdue" | "already_today" | "no_address" | "failed" | "not_yet";
};

export type RunOptions = {
  /** For the office's buttons: run even when the switch is off. Every other rule still applies. */
  force?: boolean;
  actor?: string;
  /**
   * Testing only (the admin "run as if today were day N" button): pretend it is day N of this
   * month, count members admitted this month too, and always send the office list.
   */
  testDay?: number;
};

export async function runPaymentReminders(site: string, opts: RunOptions = {}): Promise<PaymentRunResult> {
  const today = lagosToday();
  const testing = typeof opts.testDay === "number";
  const period = today.period;
  const day = testing ? Math.min(Math.max(Math.round(opts.testDay!), 1), 28) : today.day;
  const stage = stageFor(day);
  const base: PaymentRunResult = {
    skipped: null,
    period,
    day,
    stage: stage?.label ?? null,
    checked: 0,
    upToDate: 0,
    sent: 0,
    failed: 0,
    arrearsNotices: 0,
    overdue: 0,
    digest: "not_yet",
  };
  if (!opts.force && !(await isPaymentRemindersAuto())) return { ...base, skipped: "off" };
  if (!stage) return base;

  const actor = opts.actor ?? "Automatic payment reminders";
  const { members } = await collections();
  const admitted = await members
    .find({ "membership.memberNo": { $exists: true } }, { projection: { receipt: 0, loginCode: 0 } })
    .sort({ "membership.seq": 1 })
    .toArray();

  // member → period → currency → total
  const ledger = new Map<string, Map<string, Totals>>();
  for (const c of await allContributions()) {
    const byPeriod = ledger.get(c.memberNo) ?? new Map<string, Totals>();
    ledger.set(c.memberNo, byPeriod);
    const t = byPeriod.get(c.period) ?? {};
    t[c.currency] = (t[c.currency] ?? 0) + c.amount;
    byPeriod.set(c.period, t);
  }

  // A proof of payment waiting for the Treasurer counts as paid for the month (brief §3).
  const waitingProof = await pendingProofMembers(period).catch(() => new Set<string>());

  const overdueRows: OverdueRow[] = [];
  for (const m of admitted) {
    const no = m.membership!.memberNo;
    const admittedIn = periodOf(m.membership!.admittedAt);
    const firstCycle = testing ? admittedIn : nextPeriod(admittedIn);
    if (firstCycle > period) continue; // admitted this month: their first cycle is next month
    base.checked++;

    const byPeriod = ledger.get(no) ?? new Map<string, Totals>();
    const thisMonth = byPeriod.get(period) ?? {};
    if (meetsMinimum(thisMonth) || waitingProof.has(no)) {
      base.upToDate++;
      continue;
    }
    const paid = describe(thisMonth);

    // Months in a row without the minimum, ending with this one.
    const months = monthsBetween(firstCycle, period);
    let inRow = 0;
    for (let i = months.length - 1; i >= 0 && !meetsMinimum(byPeriod.get(months[i]) ?? {}); i--) inRow++;
    const shortRun = months.slice(months.length - inRow);

    if (day >= 8) {
      overdueRows.push({ memberNo: no, name: m.fullName, chapter: m.chapter, email: m.email, paid, monthsInRow: inRow, callNeeded: day >= 15 });
    }

    // Send this stage once. If runs were missed, only the latest stage goes (and the earlier ones
    // are marked as passed), so nobody gets two reminders on the same morning.
    const sentStages = m.paymentCycle?.[period] ?? {};
    if (!sentStages[stage.stage]) {
      const field = `paymentCycle.${period}.${stage.stage}`;
      const passed = STAGES.filter((s) => s.day <= stage.day && !sentStages[s.stage]).map((s) => [`paymentCycle.${period}.${s.stage}`, new Date()]);
      const claim = await members.updateOne({ reference: m.reference, [field]: { $exists: false } }, { $set: Object.fromEntries(passed) });
      if (claim.matchedCount > 0) {
        const result = await sendStage(m, stage.template, period, paid, site).catch((err) => ({
          ok: false as const,
          error: err instanceof Error ? err.message : "unknown error",
        }));
        if (result.ok) {
          base.sent++;
          // The Missed payments screen shows the overdue notice as "reminded".
          if (stage.stage === "overdue" || stage.stage === "day15") {
            await members.updateOne(
              { reference: m.reference, [`contributionReminders.${period}`]: { $exists: false } },
              { $set: { [`contributionReminders.${period}`]: new Date() } },
            );
          }
        } else {
          base.failed++;
          await members.updateOne({ reference: m.reference }, { $unset: { [field]: "" } }); // tomorrow tries again
        }
        await recordAudit({
          action: result.ok ? "email.payment_reminder_sent" : "email.payment_reminder_failed",
          actor,
          subject: no,
          detail: result.ok
            ? `${stage.label} payment email (${stage.template}) for ${periodLabel(period)} sent to ${m.email}${paid ? ` (received ${paid})` : ""}`
            : `${stage.label} payment email for ${periodLabel(period)} could not be sent: ${result.error}`,
        }).catch(() => {});
      }
    }

    // The formal notice at 2, 3 and 6 months in a row, sent with the day-8 notice, once a month.
    if (day >= 8 && ARREARS_STEPS[inRow] && !sentStages.arrears) {
      const field = `paymentCycle.${period}.arrears`;
      const claim = await members.updateOne({ reference: m.reference, [field]: { $exists: false } }, { $set: { [field]: new Date() } });
      if (claim.matchedCount > 0) {
        const result = await sendArrears(m, shortRun, site).catch((err) => ({ ok: false as const, error: err instanceof Error ? err.message : "unknown error" }));
        if (result.ok) base.arrearsNotices++;
        else await members.updateOne({ reference: m.reference }, { $unset: { [field]: "" } });
        await recordAudit({
          action: result.ok ? "email.arrears_notice_sent" : "email.arrears_notice_failed",
          actor,
          subject: no,
          detail: result.ok
            ? `${inRow}-months-in-a-row notice (K) sent to ${m.email}`
            : `${inRow}-months-in-a-row notice could not be sent: ${result.error}`,
        }).catch(() => {});
      }
    }
  }
  base.overdue = overdueRows.length;

  // One office list a day from day 8 on.
  if (day >= 8) base.digest = await sendDigest(period, day, today.date, overdueRows, testing, actor);
  return base;
}

// ---------- The office's daily list ----------

const escHtml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function sendDigest(period: string, day: number, date: string, rows: OverdueRow[], testing: boolean, actor: string): Promise<PaymentRunResult["digest"]> {
  if (!rows.length) return "none_overdue";
  const to = officeRecipients();
  if (!to.length) return "no_address";
  if (!testing && (await getSetting<string | null>(DIGEST_KEY, null)) === date) return "already_today";
  if (!testing) await setSetting(DIGEST_KEY, date, actor, `Daily overdue list for ${date}`);

  const month = periodLabel(period);
  const calls = rows.filter((r) => r.callNeeded);
  const subject = `HomeBridge overdue contributions, ${month}: ${rows.length} member${rows.length === 1 ? "" : "s"}${testing ? " (test run)" : ""}`;
  const line = (r: OverdueRow) =>
    `${r.memberNo} · ${r.name} · ${r.chapter} · ${r.paid ? `received ${r.paid}` : "nothing received"} · ${r.monthsInRow} month${r.monthsInRow === 1 ? "" : "s"} in a row${r.callNeeded ? " · PLEASE CALL" : ""}`;
  const text = [
    `Day ${day} of ${month}. These members have not paid the minimum contribution for the month:`,
    "",
    ...rows.map(line),
    "",
    calls.length ? `${calls.length} of them have passed day 15: please ask their zonal coordinator to call them.` : "",
    "Each member has been emailed automatically. The list clears itself as payments are recorded.",
  ]
    .filter((l, i, a) => l || a[i - 1])
    .join("\n");
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F3F1EA;font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif;color:#1D201C;line-height:1.5">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;background:#FFFDF7;border-radius:12px;border:1px solid #E2DED2">
    <tr><td style="padding:24px">
      <p style="margin:0 0 14px">Day ${day} of <strong>${escHtml(month)}</strong>. These members have not paid the minimum contribution for the month:</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;margin:0 0 16px">
        <tr style="text-align:left;color:#6B6A61"><th style="padding:6px">Member</th><th style="padding:6px">Name</th><th style="padding:6px">Chapter</th><th style="padding:6px">Received</th><th style="padding:6px">In a row</th><th style="padding:6px"></th></tr>
        ${rows
          .map(
            (r) =>
              `<tr style="border-top:1px solid #ECE6D3"><td style="padding:6px;font-family:monospace">${escHtml(r.memberNo)}</td><td style="padding:6px">${escHtml(r.name)}</td><td style="padding:6px">${escHtml(r.chapter)}</td><td style="padding:6px">${escHtml(r.paid || "Nothing")}</td><td style="padding:6px">${r.monthsInRow}</td><td style="padding:6px;color:#B42318;font-weight:600">${r.callNeeded ? "Please call" : ""}</td></tr>`,
          )
          .join("")}
      </table>
      ${calls.length ? `<p style="margin:0 0 12px"><strong>${calls.length}</strong> of them have passed day 15: please ask their zonal coordinator to call them.</p>` : ""}
      <p style="margin:0;font-size:13px;color:#6B6A61">Each member has been emailed automatically. The list clears itself as payments are recorded.</p>
    </td></tr>
  </table>
</body></html>`;

  let ok = true;
  for (const addr of to) {
    const sent = await sendEmail({ to: addr, subject, text, html });
    if (!sent.ok) ok = false;
  }
  await recordAudit({
    action: ok ? "email.overdue_digest_sent" : "email.overdue_digest_failed",
    actor,
    subject: `Overdue list ${month}`,
    detail: `${rows.length} overdue member${rows.length === 1 ? "" : "s"} listed for ${to.join(", ")}${testing ? " (test run)" : ""}`,
  }).catch(() => {});
  return ok ? "sent" : "failed";
}
