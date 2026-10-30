// Monthly contributions (brief Phase 3: "Record contributions by member number (bank statement
// import, matched on reference); issue receipt HBC-CR-YYMM-NNNNN").
//
// Contributions are the cooperative's money and are kept apart from joining fees, which are VEKAT's
// (brief p.2: "keep the two money flows in separate ledgers"): their own collection, their own
// receipt sequence. Each one is recorded once: a bank line carries a key made from its details, and
// the database refuses a second contribution with the same key, so importing the same statement
// twice cannot credit anyone twice.

import "server-only";

import { createHash } from "node:crypto";
import type { ObjectId } from "mongodb";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { sendContributionReceipt } from "@/lib/email";
import { type MemberDoc, collections } from "@/lib/members";
import { buildContributionReceipt } from "@/lib/pdf/contribution-receipt";
import { SHARE_PRICE_NGN } from "@/lib/settings";
import { parseStatementDate, readCredits } from "@/lib/statement-match";

export const CURRENCIES = ["NGN", "GBP", "USD"] as const;
export type ContributionCurrency = (typeof CURRENCIES)[number];
export const isCurrency = (v: unknown): v is ContributionCurrency => typeof v === "string" && (CURRENCIES as readonly string[]).includes(v);

export type ContributionDoc = {
  _id?: ObjectId;
  /** HBC-CR-YYMM-NNNNN. */
  receiptNo: string;
  memberNo: string;
  memberRef: string;
  amount: number;
  currency: ContributionCurrency;
  /** The month it counts for, YYYY-MM. Normally the month it was received. */
  period: string;
  paidAt: Date;
  bankRef: string;
  source: "statement" | "manual";
  /** Identifies the bank line, so the same line can never be recorded twice. Absent for manual entries. */
  lineKey?: string;
  confirmedBy: string;
  confirmedAt: Date;
  emailedAt?: Date;
};

const CONTRIBUTION_SEQUENCE = "contribution_seq";

async function contributions() {
  return (await getDb()).collection<ContributionDoc>("contributions");
}

let indexed: Promise<unknown> | null = null;
async function ensureContributionIndexes() {
  indexed ??= (async () => {
    const c = await contributions();
    await Promise.all([
      c.createIndex({ receiptNo: 1 }, { unique: true }),
      c.createIndex({ lineKey: 1 }, { unique: true, partialFilterExpression: { lineKey: { $type: "string" } } }),
      c.createIndex({ memberNo: 1, period: 1 }),
      c.createIndex({ paidAt: -1 }),
    ]);
  })().catch((err) => {
    indexed = null;
    throw err;
  });
  return indexed;
}

/** HBC-CR-YYMM-NNNNN: YYMM is the month it was confirmed; NNNNN one running number that never resets. */
export function formatContributionReceipt(at: Date, seq: number): string {
  const yy = String(at.getUTCFullYear()).slice(-2);
  const mm = String(at.getUTCMonth() + 1).padStart(2, "0");
  return `HBC-CR-${yy}${mm}-${String(seq).padStart(5, "0")}`;
}

async function nextContributionSeq(): Promise<number> {
  const { counters } = await collections();
  const doc = await counters.findOneAndUpdate({ _id: CONTRIBUTION_SEQUENCE }, { $inc: { value: 1 } }, { upsert: true, returnDocument: "after" });
  if (!doc) throw new Error("Could not take the next contribution receipt number");
  return doc.value;
}

/** Shares a contribution buys at the naira share price (bye-law 11.1). Other currencies: see sharesNote. */
export const sharesFor = (amount: number, currency: ContributionCurrency) =>
  currency === "NGN" ? Math.round((amount / SHARE_PRICE_NGN) * 100) / 100 : null;

export const SHARES_NOTE =
  "Naira contributions buy shares at ₦1,000 each. Pound and dollar contributions are converted to shares at the rate the Board sets.";

export const periodOf = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

const PERIOD_LABEL = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
export const periodLabel = (p: string) => PERIOD_LABEL.format(new Date(`${p}-15T12:00:00Z`));

const flat = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function lineKeyOf(l: { currency: string; date: string; amount: number; transactionRef: string; narration: string }) {
  return createHash("sha256").update([l.currency, l.date, l.amount.toFixed(2), flat(l.transactionRef), flat(l.narration)].join("|")).digest("hex");
}

// ---------- Matching a statement ----------

export type ContributionLine = {
  line: number;
  date: string;
  narration: string;
  transactionRef: string;
  amount: number;
  lineKey: string;
  /** Set when this exact line has already been recorded. */
  recordedAs?: string;
  suggestion: null | { memberNo: string; name: string; why: string };
};

/**
 * Suggests which member each payment in belongs to. Members are told to quote their membership
 * number as the reference (Contribution and Payment Guide), so that is what is matched, ignoring
 * spaces and dashes. A full-name match is offered too, marked as such, for people who forgot.
 */
export async function matchContributionStatement(csv: string, currency: ContributionCurrency) {
  await ensureContributionIndexes();
  const read = readCredits(csv);
  if (read.missing.length) return { lines: [] as ContributionLine[], missing: read.missing, skippedDebits: 0 };

  const { members } = await collections();
  const admitted = await members
    .find({ "membership.memberNo": { $exists: true } }, { projection: { fullName: 1, "membership.memberNo": 1 } })
    .toArray();
  const candidates = admitted.map((m) => ({
    memberNo: m.membership!.memberNo,
    name: m.fullName,
    key: flat(m.membership!.memberNo),
    words: m.fullName
      .toUpperCase()
      .replace(/[^A-Z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !["MRS", "MISS", "DR", "PASTOR", "CHIEF", "ENGR", "PROF"].includes(w)),
  }));

  const lines: ContributionLine[] = read.lines.map((l) => {
    const text = flat(l.narration);
    const words = new Set(l.narration.toUpperCase().replace(/[^A-Z\s]/g, " ").split(/\s+/));
    const byNumber = candidates.find((c) => text.includes(c.key));
    const byName = byNumber ? undefined : candidates.find((c) => c.words.length >= 2 && c.words.every((w) => words.has(w)));
    const hit = byNumber ?? byName;
    return {
      ...l,
      lineKey: lineKeyOf({ ...l, currency }),
      suggestion: hit ? { memberNo: hit.memberNo, name: hit.name, why: byNumber ? "membership number" : "name only — check before confirming" } : null,
    };
  });

  const already = await (await contributions())
    .find({ lineKey: { $in: lines.map((l) => l.lineKey) } }, { projection: { lineKey: 1, receiptNo: 1 } })
    .toArray();
  const done = new Map(already.map((c) => [c.lineKey, c.receiptNo]));
  for (const l of lines) if (done.has(l.lineKey)) l.recordedAs = done.get(l.lineKey);

  return { lines, missing: [] as string[], skippedDebits: read.skippedDebits };
}

// ---------- Recording one ----------

export type RecordInput = {
  memberNo: string;
  amount: number;
  currency: ContributionCurrency;
  /** As printed on the statement, or YYYY-MM-DD from the manual form. */
  date: string;
  bankRef: string;
  /** Optional: the month it counts for, if not the month received (e.g. paying ahead). */
  period?: string;
  source: "statement" | "manual";
  lineKey?: string;
};

export type RecordResult = { ok: true; receiptNo: string; emailed: boolean } | { ok: false; error: string; status: number };

export async function recordContribution(input: RecordInput, actor: string): Promise<RecordResult> {
  await ensureContributionIndexes();
  if (!(input.amount > 0) || input.amount > 1_000_000_000) return { ok: false, error: "Enter an amount above zero.", status: 422 };
  const paidAt = parseStatementDate(input.date);
  if (!paidAt) return { ok: false, error: "That date could not be read.", status: 422 };
  if (paidAt.getTime() > Date.now() + 86_400_000) return { ok: false, error: "The date is in the future.", status: 422 };
  const period = input.period && /^\d{4}-(0[1-9]|1[0-2])$/.test(input.period) ? input.period : periodOf(paidAt);

  const { members } = await collections();
  const member = await members.findOne({ "membership.memberNo": input.memberNo.trim().toUpperCase() });
  if (!member?.membership) return { ok: false, error: "No member holds that number.", status: 404 };

  const c = await contributions();
  if (input.lineKey) {
    const dup = await c.findOne({ lineKey: input.lineKey });
    if (dup) return { ok: false, error: `That payment is already recorded as ${dup.receiptNo}.`, status: 409 };
  }

  const confirmedAt = new Date();
  const receiptNo = formatContributionReceipt(confirmedAt, await nextContributionSeq());
  const doc: ContributionDoc = {
    receiptNo,
    memberNo: member.membership.memberNo,
    memberRef: member.reference,
    amount: Math.round(input.amount * 100) / 100,
    currency: input.currency,
    period,
    paidAt,
    bankRef: input.bankRef.trim().slice(0, 120),
    source: input.source,
    ...(input.lineKey ? { lineKey: input.lineKey } : {}),
    confirmedBy: actor,
    confirmedAt,
  };
  try {
    await c.insertOne(doc);
  } catch (err) {
    // Two officers confirming the same line at once: the unique key lets only one through.
    if ((err as { code?: number }).code === 11000) return { ok: false, error: "That payment was just recorded by someone else.", status: 409 };
    throw err;
  }

  await recordAudit({
    action: "contribution.recorded",
    actor,
    subject: member.membership.memberNo,
    detail: `${receiptNo} · ${money(doc.amount, doc.currency)} for ${periodLabel(period)}${doc.bankRef ? ` · ref ${doc.bankRef}` : ""}`,
  });

  const emailed = await emailReceipt(member, doc);
  return { ok: true, receiptNo, emailed };
}

export function money(amount: number, currency: ContributionCurrency) {
  const sym = { NGN: "₦", GBP: "£", USD: "$" }[currency];
  return `${sym}${amount.toLocaleString("en-GB", { minimumFractionDigits: currency === "NGN" ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function receiptPdfFor(member: MemberDoc, c: ContributionDoc) {
  return buildContributionReceipt({
    receiptNo: c.receiptNo,
    fullName: member.fullName,
    memberNo: c.memberNo,
    amount: c.amount,
    currency: c.currency,
    period: periodLabel(c.period),
    paidAt: c.paidAt,
    bankRef: c.bankRef,
    shares: sharesFor(c.amount, c.currency),
  });
}

async function emailReceipt(member: MemberDoc, c: ContributionDoc): Promise<boolean> {
  if (!member.email?.trim()) return false;
  try {
    const pdf = await receiptPdfFor(member, c);
    const sent = await sendContributionReceipt({
      to: member.email,
      firstName: member.firstName?.trim() || member.fullName.trim().split(/\s+/)[0] || "",
      receiptNo: c.receiptNo,
      amount: money(c.amount, c.currency),
      period: periodLabel(c.period),
      memberNo: c.memberNo,
      receipt: { filename: `Contribution receipt ${c.receiptNo}.pdf`, content: pdf },
    });
    await recordAudit({
      action: sent.ok ? "contribution.receipt_emailed" : "contribution.receipt_email_failed",
      actor: "HomeBridge platform",
      subject: c.memberNo,
      detail: sent.ok ? `Receipt ${c.receiptNo} emailed to ${member.email}` : `Receipt ${c.receiptNo} could not be emailed: ${sent.error}`,
    }).catch(() => {});
    if (sent.ok) await (await contributions()).updateOne({ receiptNo: c.receiptNo }, { $set: { emailedAt: new Date() } });
    return sent.ok;
  } catch (err) {
    console.error("[contributions] receipt email failed:", err instanceof Error ? err.message : "unknown error");
    return false;
  }
}

// ---------- Reading ----------

export async function contributionsFor(memberRef: string) {
  await ensureContributionIndexes().catch(() => {});
  return (await contributions()).find({ memberRef }).sort({ paidAt: -1 }).toArray();
}

export async function findContribution(receiptNo: string) {
  return (await contributions()).findOne({ receiptNo });
}

export async function recentContributions(limit = 50) {
  await ensureContributionIndexes().catch(() => {});
  return (await contributions()).find({}).sort({ confirmedAt: -1 }).limit(limit).toArray();
}

/** Every contribution, for reports and missed-month checks. */
export async function allContributions() {
  return (await contributions()).find({}).toArray();
}
