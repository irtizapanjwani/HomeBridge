// Member statements (Member Platform brief §3 "Statements"; bye-law addendum A10).
//
//   * Monthly e-statement emailed on day 10, for the month before (Email M, PDF attached).
//   * Annual statement for the AGM (Email N, PDF attached), sent when the office clicks.
//   * Any range of months downloadable from the member portal as PDF or CSV.
//
// A statement lists contributions by the month they count for, with a running total per currency.
// Each member gets each monthly statement once, and each annual statement once.

import "server-only";

import { getSetting, setSetting } from "@/lib/app-settings";
import { recordAudit } from "@/lib/audit";
import { CONTACT } from "@/lib/content";
import { type ContributionCurrency, type ContributionDoc, CURRENCIES, contributionsFor, money, periodLabel, periodOf, sharesFor, SHARES_NOTE } from "@/lib/contributions";
import { sendEmail } from "@/lib/email";
import { buttonBlock, renderTemplate } from "@/lib/email-templates";
import { type MemberDoc, collections } from "@/lib/members";
import { FormWriter, MUTED } from "@/lib/pdf/layout";
import { lagosToday } from "@/lib/payment-reminders";

const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

const totalsOf = (list: ContributionDoc[]) =>
  CURRENCIES.map((cur) => [cur, list.filter((c) => c.currency === cur).reduce((t, c) => t + c.amount, 0)] as const)
    .filter(([, t]) => t > 0)
    .map(([cur, t]) => money(t, cur));

const join = (parts: string[]) => (parts.length ? parts.join(" + ") : "Nothing");

export const isPeriod = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** The member's contributions for months from..to (inclusive), plus everything to date. */
export async function statementData(member: MemberDoc, from: string, to: string) {
  const all = (await contributionsFor(member.reference)).sort((a, b) => a.period.localeCompare(b.period) || a.paidAt.getTime() - b.paidAt.getTime());
  const inRange = all.filter((c) => c.period >= from && c.period <= to);
  const toDate = all.filter((c) => c.period <= to);
  return { inRange, toDate };
}

// ---------- PDF and CSV ----------

export async function buildStatementPdf(member: MemberDoc, from: string, to: string, title = "Member Statement"): Promise<Uint8Array> {
  const { inRange, toDate } = await statementData(member, from, to);
  const range = from === to ? periodLabel(from) : `${periodLabel(from)} to ${periodLabel(to)}`;
  const w = await FormWriter.create({
    title: `${title} ${member.membership?.memberNo ?? ""} ${range}`.trim(),
    subject: `HomeBridge statement for ${member.fullName}`,
    footerEmail: CONTACT.email,
  });
  w.header(title);
  w.keyValues([
    ["Member", member.fullName],
    ["Membership number", member.membership?.memberNo ?? ""],
    ["Chapter", member.chapter],
    ["Period", range],
    ["Issued", DAY.format(new Date())],
  ]);

  w.heading("Contributions in this period");
  if (inRange.length) {
    const running: Partial<Record<ContributionCurrency, number>> = {};
    // Running totals start from everything before the period.
    for (const c of toDate.filter((x) => x.period < from)) running[c.currency] = (running[c.currency] ?? 0) + c.amount;
    w.table(
      ["Month", "Received", "Amount", "Receipt", "Running total"],
      inRange.map((c) => {
        running[c.currency] = (running[c.currency] ?? 0) + c.amount;
        return [periodLabel(c.period), DAY.format(c.paidAt), money(c.amount, c.currency), c.receiptNo, money(running[c.currency]!, c.currency)];
      }),
      [0.2, 0.18, 0.17, 0.27, 0.18],
    );
  } else {
    w.paragraph("No contributions were recorded for this period.", { color: MUTED });
  }

  const shares = Math.round(toDate.reduce((t, c) => t + (sharesFor(c.amount, c.currency) ?? 0), 0) * 100) / 100;
  w.heading("Summary");
  w.keyValues([
    ["Received in this period", join(totalsOf(inRange))],
    ["Total contributed to date", join(totalsOf(toDate))],
    ["Shares (naira contributions)", `${shares.toLocaleString("en-GB")} shares`],
  ]);
  w.paragraph(SHARES_NOTE, { size: 9.5, color: MUTED });
  w.paragraph("If anything on this statement looks wrong, reply to the email it came with or contact the office, quoting your membership number.", {
    size: 9.5,
    color: MUTED,
  });
  w.paragraph(`Issued by HomeBridge Cooperative · ${CONTACT.email}`, { size: 9.5 });
  return w.finish();
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function buildStatementCsv(member: MemberDoc, from: string, to: string): Promise<string> {
  const { inRange } = await statementData(member, from, to);
  const rows = [
    ["Month", "Date received", "Amount", "Currency", "Receipt", "Bank reference"],
    ...inRange.map((c) => [c.period, c.paidAt.toISOString().slice(0, 10), c.amount.toFixed(2), c.currency, c.receiptNo, c.bankRef]),
  ];
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// ---------- Sending ----------

const MONTHLY_KEY = "monthly_statements_auto";

/** Off until the office switches it on. */
export const isMonthlyStatementsAuto = () => getSetting(MONTHLY_KEY, false);

export async function setMonthlyStatementsAuto(on: boolean, actor: string) {
  const before = await isMonthlyStatementsAuto();
  await setSetting(MONTHLY_KEY, on, actor, on ? "Monthly statements now send automatically" : "Monthly statements switched off", before ? "Automatic" : "Off", on ? "Automatic" : "Off");
}

function previousPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

async function sendOne(m: MemberDoc, kind: "monthly" | "annual", from: string, to: string, site: string) {
  if (!m.email?.trim()) return { ok: false as const, error: "the member has no email address" };
  const portal = `${site.replace(/\/+$/, "")}/app`;
  const { inRange, toDate } = await statementData(m, from, to);
  const pdf = await buildStatementPdf(m, from, to, kind === "annual" ? "Annual Statement" : "Member Statement");
  const year = from.slice(0, 4);
  const email = await renderTemplate(
    kind === "annual" ? "N" : "M",
    {
      FirstName: m.firstName?.trim() || m.fullName.trim().split(/\s+/)[0] || "there",
      MemberNo: m.membership!.memberNo,
      Month: periodLabel(from),
      MonthTotal: join(totalsOf(inRange)),
      Year: year,
      YearTotal: join(totalsOf(inRange)),
      TotalToDate: join(totalsOf(toDate)),
      PortalLink: portal,
    },
    { BUTTON: buttonBlock("See your contributions", portal) },
  );
  const filename = kind === "annual" ? `HomeBridge annual statement ${year} ${m.membership!.memberNo}.pdf` : `HomeBridge statement ${from} ${m.membership!.memberNo}.pdf`;
  const sent = await sendEmail({ to: m.email, ...email, attachments: [{ filename, content: pdf }] });
  return sent.ok ? { ok: true as const } : { ok: false as const, error: sent.error };
}

export type StatementRun = { skipped: "off" | "not_yet" | null; period: string; sent: number; failed: number; alreadySent: number };

/**
 * Sends each member their statement for one period, once. `key` is what marks it as sent on the
 * member record (YYYY-MM for a monthly statement, annual-YYYY for the year).
 */
async function sendBatch(kind: "monthly" | "annual", key: string, from: string, to: string, site: string, actor: string): Promise<StatementRun> {
  const { members } = await collections();
  const admitted = await members.find({ "membership.memberNo": { $exists: true } }, { projection: { receipt: 0, loginCode: 0 } }).sort({ "membership.seq": 1 }).toArray();
  const run: StatementRun = { skipped: null, period: key, sent: 0, failed: 0, alreadySent: 0 };
  for (const m of admitted) {
    if (periodOf(m.membership!.admittedAt) > to) continue; // not a member yet in that period
    const field = `statementsSent.${key}`;
    const claim = await members.updateOne({ reference: m.reference, [field]: { $exists: false } }, { $set: { [field]: new Date() } });
    if (claim.matchedCount === 0) {
      run.alreadySent++;
      continue;
    }
    const result = await sendOne(m, kind, from, to, site).catch((err) => ({ ok: false as const, error: err instanceof Error ? err.message : "unknown error" }));
    if (result.ok) run.sent++;
    else {
      run.failed++;
      await members.updateOne({ reference: m.reference }, { $unset: { [field]: "" } });
    }
    await recordAudit({
      action: result.ok ? "email.statement_sent" : "email.statement_failed",
      actor,
      subject: m.membership!.memberNo,
      detail: result.ok
        ? `${kind === "annual" ? "Annual" : "Monthly"} statement (${key}) sent to ${m.email}`
        : `${kind === "annual" ? "Annual" : "Monthly"} statement (${key}) could not be sent: ${result.error}`,
    }).catch(() => {});
  }
  return run;
}

/**
 * The daily check: from day 10, each member gets last month's statement once. `force` (the office's
 * button) sends last month's now, whatever the day and the switch.
 */
export async function runMonthlyStatements(site: string, opts: { force?: boolean; actor?: string } = {}): Promise<StatementRun> {
  const today = lagosToday();
  const period = previousPeriod(today.period);
  if (!opts.force && !(await isMonthlyStatementsAuto())) return { skipped: "off", period, sent: 0, failed: 0, alreadySent: 0 };
  if (!opts.force && today.day < 10) return { skipped: "not_yet", period, sent: 0, failed: 0, alreadySent: 0 };
  return sendBatch("monthly", period, period, period, site, opts.actor ?? "Automatic statements");
}

/** The annual statement for one year, sent by the office before the AGM. */
export async function sendAnnualStatements(year: number, site: string, actor: string): Promise<StatementRun> {
  return sendBatch("annual", `annual-${year}`, `${year}-01`, `${year}-12`, site, actor);
}

/** Testing only: forgets that last month's statement and this year's annual went, so they can be sent again. */
export async function clearStatementHistory(actor: string) {
  const today = lagosToday();
  const keys = [previousPeriod(today.period), `annual-${today.period.slice(0, 4)}`];
  const { members } = await collections();
  const res = await members.updateMany({}, { $unset: Object.fromEntries(keys.map((k) => [`statementsSent.${k}`, ""])) });
  await recordAudit({ action: "settings.statements_reset", actor, subject: keys.join(", "), detail: `Statement history cleared for testing (${res.modifiedCount} members)` }).catch(() => {});
  return res.modifiedCount;
}
