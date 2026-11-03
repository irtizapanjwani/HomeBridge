// Monthly reconciliation (Member Platform brief §5 "Reconciliation"; addendum A10).
//
//   * For each of the cooperative's accounts (naira, pound, dollar) and a month: the money in that
//     the bank statement shows, against the contributions recorded as received that month, with
//     the difference.
//   * Bank lines that were uploaded but never recorded as a contribution, and proofs of payment
//     still waiting, highlighted once they are more than 5 days old.
//   * The Treasurer signs each account off for the month; the sign-off is kept and logged.
//
// Bank lines are remembered from every contributions statement upload, so an unmatched line does not
// vanish just because nobody confirmed it at the time. A line that is not a contribution at all
// (bank interest, a refund) can be marked as such, with a reason.

import "server-only";

import { recordAudit } from "@/lib/audit";
import { type ContributionCurrency, CURRENCIES, allContributions, money, periodLabel, periodOf } from "@/lib/contributions";
import { getDb } from "@/lib/db";
import { stalePendingProofs } from "@/lib/payment-proofs";
import { parseStatementDate } from "@/lib/statement-match";

type BankLineDoc = {
  _id: string; // the lineKey
  currency: ContributionCurrency;
  date: string;
  paidAt: Date | null;
  narration: string;
  amount: number;
  firstSeen: Date;
  dismissed?: { reason: string; by: string; at: Date };
};

type SignOffDoc = {
  _id: string; // period:currency
  period: string;
  currency: ContributionCurrency;
  bankTotal: number;
  recordedTotal: number;
  difference: number;
  note: string;
  signedBy: string;
  signedAt: Date;
};

const db = async () => {
  const d = await getDb();
  return { lines: d.collection<BankLineDoc>("bank_lines"), signoffs: d.collection<SignOffDoc>("reconciliations") };
};

/** Remembers every payment-in line from a contributions statement upload. Never overwrites a dismissal. */
export async function saveBankLines(lines: { lineKey: string; date: string; narration: string; amount: number }[], currency: ContributionCurrency) {
  if (!lines.length) return;
  const { lines: c } = await db();
  const now = new Date();
  await c.bulkWrite(
    lines.map((l) => ({
      updateOne: {
        filter: { _id: l.lineKey },
        update: {
          $setOnInsert: { currency, date: l.date, paidAt: parseStatementDate(l.date), narration: l.narration.slice(0, 200), amount: l.amount, firstSeen: now },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });
const days = (d: Date) => Math.floor((Date.now() - d.getTime()) / 86_400_000);

export async function reconciliationFor(period: string) {
  const { lines, signoffs } = await db();
  const contribs = await allContributions();
  const recordedKeys = new Set(contribs.map((c) => c.lineKey).filter(Boolean) as string[]);

  const accounts = await Promise.all(
    CURRENCIES.map(async (currency) => {
      const received = contribs.filter((c) => c.currency === currency && periodOf(c.paidAt) === period);
      const recordedTotal = Math.round(received.reduce((t, c) => t + c.amount, 0) * 100) / 100;
      const uploaded = await lines.find({ currency, paidAt: { $ne: null } }).toArray();
      const statementTotal = Math.round(uploaded.filter((l) => l.paidAt && periodOf(l.paidAt) === period).reduce((t, l) => t + l.amount, 0) * 100) / 100;
      const signed = await signoffs.findOne({ _id: `${period}:${currency}` });
      return {
        currency,
        recordedTotal,
        recordedLabel: money(recordedTotal, currency),
        recordedCount: received.length,
        /** Money in from statements uploaded for this account and month, as a starting point. */
        uploadedTotal: statementTotal,
        signOff: signed
          ? {
              bankTotal: money(signed.bankTotal, currency),
              recordedTotal: money(signed.recordedTotal, currency),
              difference: money(signed.difference, currency),
              differenceValue: signed.difference,
              note: signed.note,
              by: signed.signedBy,
              at: DAY.format(signed.signedAt),
            }
          : null,
      };
    }),
  );

  const unmatched = (await lines.find({ dismissed: { $exists: false } }).sort({ firstSeen: 1 }).toArray())
    .filter((l) => !recordedKeys.has(l._id))
    .map((l) => ({ lineKey: l._id, currency: l.currency, date: l.date, narration: l.narration, amount: money(l.amount, l.currency), daysOld: days(l.firstSeen) }));

  const proofs = (await stalePendingProofs(5)).map((p) => ({
    memberNo: p.memberNo,
    name: p.name,
    amount: money(p.amount, p.currency),
    period: periodLabel(p.period),
    daysOld: days(p.submittedAt),
  }));

  return { period, label: periodLabel(period), accounts, unmatched, proofs };
}

export async function signOff(period: string, currency: ContributionCurrency, bankTotal: number, note: string, actor: string) {
  const { signoffs } = await db();
  const contribs = await allContributions();
  const recordedTotal = Math.round(contribs.filter((c) => c.currency === currency && periodOf(c.paidAt) === period).reduce((t, c) => t + c.amount, 0) * 100) / 100;
  const difference = Math.round((bankTotal - recordedTotal) * 100) / 100;
  const doc: SignOffDoc = {
    _id: `${period}:${currency}`,
    period,
    currency,
    bankTotal,
    recordedTotal,
    difference,
    note: note.trim().slice(0, 500),
    signedBy: actor,
    signedAt: new Date(),
  };
  const before = await signoffs.findOne({ _id: doc._id });
  await signoffs.replaceOne({ _id: doc._id }, doc, { upsert: true });
  await recordAudit({
    action: "reconciliation.signed_off",
    actor,
    subject: `${currency} ${periodLabel(period)}`,
    detail: `Bank ${money(bankTotal, currency)} · recorded ${money(recordedTotal, currency)} · difference ${money(difference, currency)}${doc.note ? ` · ${doc.note}` : ""}`,
    before: before ? `Signed off by ${before.signedBy}` : "Not signed off",
    after: "Signed off",
  });
  return doc;
}

/** Marks an uploaded bank line as not a contribution (interest, a refund, a transfer between accounts). */
export async function dismissLine(lineKey: string, reason: string, actor: string) {
  const why = reason.trim().slice(0, 300);
  if (!why) return { ok: false as const, error: "Say what the payment is." };
  const { lines } = await db();
  const res = await lines.findOneAndUpdate({ _id: lineKey, dismissed: { $exists: false } }, { $set: { dismissed: { reason: why, by: actor, at: new Date() } } });
  if (!res) return { ok: false as const, error: "That line is already dealt with." };
  await recordAudit({
    action: "reconciliation.line_dismissed",
    actor,
    subject: `${res.currency} bank line ${res.date}`,
    detail: `${money(res.amount, res.currency)} · ${res.narration} — marked as not a contribution: ${why}`,
  });
  return { ok: true as const };
}
