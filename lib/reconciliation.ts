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
  /** Signed off by the site itself because every bank payment that month was accounted for. */
  auto?: boolean;
};

/** Who an automatic sign-off is recorded as. */
const AUTO_ACTOR = "Automatic check";

/** Words in a bank line that usually mean it is not a member's contribution. */
const NOT_CONTRIBUTION = /\b(INTEREST|INT\.?\s*CR|REVERSAL|REVERSED|REFUND|CHARGES?\s+REV)/i;

/** The month in Lagos, YYYY-MM. Only months that are over can be signed off. */
const thisPeriod = () => periodOf(new Date());

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

/**
 * The check an officer used to do by hand: for a month that is over, an account whose uploaded bank
 * payments are every one recorded (or set aside as not a contribution) is signed off automatically.
 * If a new statement later adds a payment nobody has recorded, the automatic sign-off is withdrawn
 * until it is dealt with. A sign-off made by an officer is never touched.
 */
export async function autoSignOff(period: string) {
  if (period >= thisPeriod()) return 0;
  const { lines, signoffs } = await db();
  const contribs = await allContributions();
  const recordedKeys = new Set(contribs.map((c) => c.lineKey).filter(Boolean) as string[]);
  let signed = 0;
  for (const currency of CURRENCIES) {
    const month = (await lines.find({ currency, paidAt: { $ne: null } }).toArray()).filter((l) => l.paidAt && periodOf(l.paidAt) === period);
    const existing = await signoffs.findOne({ _id: `${period}:${currency}` });
    if (existing && !existing.auto) continue;
    const open = month.filter((l) => !l.dismissed && !recordedKeys.has(l._id));
    if (!month.length || open.length) {
      if (existing?.auto) {
        await signoffs.deleteOne({ _id: existing._id });
        await recordAudit({
          action: "reconciliation.auto_withdrawn",
          actor: AUTO_ACTOR,
          subject: `${currency} ${periodLabel(period)}`,
          detail: `Automatic sign-off withdrawn: ${open.length} bank payment${open.length === 1 ? "" : "s"} not recorded yet`,
        }).catch(() => {});
      }
      continue;
    }
    if (existing?.auto) continue;
    const bankTotal = Math.round(month.reduce((t, l) => t + l.amount, 0) * 100) / 100;
    const recordedTotal = Math.round(contribs.filter((c) => c.currency === currency && periodOf(c.paidAt) === period).reduce((t, c) => t + c.amount, 0) * 100) / 100;
    const setAside = month.filter((l) => l.dismissed).length;
    const doc: SignOffDoc = {
        _id: `${period}:${currency}`,
        period,
        currency,
        bankTotal,
        recordedTotal,
        difference: 0,
        note: `All ${month.length} bank payment${month.length === 1 ? "" : "s"} accounted for${setAside ? ` (${setAside} set aside as not a contribution)` : ""}.`,
        signedBy: AUTO_ACTOR,
        signedAt: new Date(),
        auto: true,
      };
    await signoffs.replaceOne({ _id: doc._id }, doc, { upsert: true });
    await recordAudit({
      action: "reconciliation.signed_off",
      actor: AUTO_ACTOR,
      subject: `${currency} ${periodLabel(period)}`,
      detail: `Signed off automatically: every one of ${month.length} bank payments (${money(bankTotal, currency)}) is recorded or set aside`,
      before: "Not signed off",
      after: "Signed off",
    }).catch(() => {});
    signed++;
  }
  return signed;
}

export async function reconciliationFor(period: string) {
  await autoSignOff(period).catch(() => 0);
  const { lines, signoffs } = await db();
  const contribs = await allContributions();
  const recordedKeys = new Set(contribs.map((c) => c.lineKey).filter(Boolean) as string[]);

  const accounts = await Promise.all(
    CURRENCIES.map(async (currency) => {
      const received = contribs.filter((c) => c.currency === currency && periodOf(c.paidAt) === period);
      const recordedTotal = Math.round(received.reduce((t, c) => t + c.amount, 0) * 100) / 100;
      const uploaded = await lines.find({ currency, paidAt: { $ne: null } }).toArray();
      const month = uploaded.filter((l) => l.paidAt && periodOf(l.paidAt) === period);
      const statementTotal = Math.round(month.reduce((t, l) => t + l.amount, 0) * 100) / 100;
      const open = month.filter((l) => !l.dismissed && !recordedKeys.has(l._id)).length;
      const signed = await signoffs.findOne({ _id: `${period}:${currency}` });
      return {
        currency,
        recordedTotal,
        recordedLabel: money(recordedTotal, currency),
        recordedCount: received.length,
        /** Money in from statements uploaded for this account and month, as a starting point. */
        uploadedTotal: statementTotal,
        uploadedLabel: money(statementTotal, currency),
        /** Bank payments uploaded for the month, and how many are still not recorded. */
        lineCount: month.length,
        openCount: open,
        signOff: signed
          ? {
              bankTotal: money(signed.bankTotal, currency),
              recordedTotal: money(signed.recordedTotal, currency),
              difference: money(signed.difference, currency),
              differenceValue: signed.difference,
              note: signed.note,
              by: signed.signedBy,
              at: DAY.format(signed.signedAt),
              auto: Boolean(signed.auto),
            }
          : null,
      };
    }),
  );

  const unmatched = (await lines.find({ dismissed: { $exists: false } }).sort({ firstSeen: 1 }).toArray())
    .filter((l) => !recordedKeys.has(l._id))
    .map((l) => ({
      lineKey: l._id,
      currency: l.currency,
      date: l.date,
      narration: l.narration,
      amount: money(l.amount, l.currency),
      amountValue: l.amount,
      daysOld: days(l.firstSeen),
      /** Looks like interest or a refund rather than a member paying in. */
      looksLikeBank: NOT_CONTRIBUTION.test(l.narration),
    }));

  const proofs = (await stalePendingProofs(5)).map((p) => ({
    memberNo: p.memberNo,
    name: p.name,
    amount: money(p.amount, p.currency),
    period: periodLabel(p.period),
    daysOld: days(p.submittedAt),
  }));

  return { period, label: periodLabel(period), current: thisPeriod(), accounts, unmatched, proofs };
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
