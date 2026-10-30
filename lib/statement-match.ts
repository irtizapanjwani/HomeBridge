// Matches a bank statement against applicants whose joining fee is not yet confirmed.
//
// Brief p.3-4 (Joining fee payment): "Bank transfer option: applicant quotes application reference;
// admin uploads a statement CSV and the system suggests matches for one-click confirmation."
//
// Nothing is confirmed here. This only reads the statement and suggests; the officer confirms each
// match, which goes through the same confirmFeePayment() as the button on the application, so the
// receipt number, the receipt email and the audit entry are exactly the same.

import "server-only";

import { parseCsv } from "@/lib/csv";
import { collections } from "@/lib/members";
import { JOINING_FEE } from "@/lib/settings";

/** Header spellings banks use, compared with punctuation and case removed. */
const COLUMNS = {
  date: ["date", "transactiondate", "transdate", "valuedate", "postingdate", "txndate", "bookingdate"],
  narration: ["narration", "description", "details", "transactiondetails", "remarks", "memo", "particulars", "narrative"],
  reference: ["reference", "ref", "transactionref", "transactionreference", "referencenumber", "refno"],
  credit: ["credit", "creditamount", "credits", "deposit", "deposits", "amountin", "moneyin", "cr", "lodgement", "lodgements"],
  amount: ["amount", "transactionamount", "amountngn"],
} as const;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const flat = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

function money(raw: string): number {
  const n = Number(raw.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export type StatementLine = {
  line: number;
  date: string;
  narration: string;
  /** What to store as the transaction reference on the receipt. */
  transactionRef: string;
  amount: number;
  suggestion: null | {
    reference: string;
    name: string;
    /** Why this applicant: "application reference", "their payment reference", "name and amount". */
    why: string[];
    expectedAmount: number;
    amountMatches: boolean;
  };
};

export type StatementResult = { lines: StatementLine[]; missing: string[]; skippedDebits: number };

/**
 * Bank exports often start with a few lines of account details before the real header, so the
 * header is the first row (of the first 15) that has a date column and an amount or credit column.
 */
function findHeader(rows: string[][]): { at: number; col: Record<keyof typeof COLUMNS, number> } | null {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = rows[i].map(norm);
    const pick = (names: readonly string[]) => cells.findIndex((c) => names.includes(c));
    const col = {
      date: pick(COLUMNS.date),
      narration: pick(COLUMNS.narration),
      reference: pick(COLUMNS.reference),
      credit: pick(COLUMNS.credit),
      amount: pick(COLUMNS.amount),
    };
    if (col.date !== -1 && (col.credit !== -1 || col.amount !== -1)) return { at: i, col };
  }
  return null;
}

/** An applicant whose fee is still unconfirmed, as the matcher needs them. */
export type Waiting = { reference: string; fullName: string; country: string; paymentRef: string };

export async function matchStatement(csv: string): Promise<StatementResult> {
  // Everyone still waiting for their fee to be confirmed.
  const { members } = await collections();
  const waiting = await members
    .find(
      { supporter: false, status: { $ne: "Declined" }, "payment.receiptNo": { $exists: false } },
      { projection: { reference: 1, fullName: 1, country: 1, "payment.reference": 1 } },
    )
    .toArray();
  return matchLines(
    csv,
    waiting.map((m) => ({ reference: m.reference, fullName: m.fullName, country: m.country, paymentRef: m.payment?.reference ?? "" })),
  );
}

/** The matching itself, with no database: reads the statement and pairs lines with applicants. */
export function matchLines(csv: string, waiting: Waiting[]): StatementResult {
  const rows = parseCsv(csv).filter((r) => r.some((c) => c.trim()));
  const header = findHeader(rows);
  if (!header) {
    return { lines: [], missing: ["a Date column", "a Credit or Amount column"], skippedDebits: 0 };
  }
  const { at, col } = header;

  const candidates = waiting.map((m) => ({
    reference: m.reference,
    name: m.fullName,
    refKey: flat(m.reference),
    payKey: flat(m.paymentRef),
    nameWords: m.fullName
      .toUpperCase()
      .replace(/[^A-Z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !["MRS", "MISS", "DR", "PASTOR", "CHIEF", "ENGR", "PROF"].includes(w)),
    expected: m.country === "Nigeria" ? JOINING_FEE.ngn : JOINING_FEE.gbp,
  }));

  const lines: StatementLine[] = [];
  let skippedDebits = 0;
  rows.slice(at + 1).forEach((r, i) => {
    const cell = (c: number) => (c === -1 ? "" : (r[c] ?? "").trim());
    const amount = col.credit !== -1 ? money(cell(col.credit)) : money(cell(col.amount));
    if (!(amount > 0)) {
      skippedDebits++;
      return;
    }
    const narration = [cell(col.narration), cell(col.reference)].filter(Boolean).join(" · ");
    const text = flat(narration);
    const words = new Set(narration.toUpperCase().replace(/[^A-Z\s]/g, " ").split(/\s+/));

    let best: StatementLine["suggestion"] = null;
    let bestScore = 0;
    for (const c of candidates) {
      const why: string[] = [];
      let score = 0;
      if (c.refKey.length >= 6 && text.includes(c.refKey)) {
        why.push("application reference");
        score += 3;
      }
      if (c.payKey.length >= 5 && text.includes(c.payKey)) {
        why.push("their payment reference");
        score += 3;
      }
      const nameHit = c.nameWords.length >= 2 && c.nameWords.every((w) => words.has(w));
      const amountMatches = Math.abs(amount - c.expected) < 0.005;
      if (nameHit && amountMatches && !why.length) {
        why.push("name and amount");
        score += 2;
      }
      if (score > bestScore) {
        bestScore = score;
        best = { reference: c.reference, name: c.name, why, expectedAmount: c.expected, amountMatches };
      }
    }

    lines.push({
      line: at + 2 + i,
      date: cell(col.date),
      narration: narration || "(no narration)",
      transactionRef: (cell(col.reference) || narration).slice(0, 80),
      amount,
      suggestion: best,
    });
  });

  return { lines, missing: [], skippedDebits };
}

// ---------- Shared reader ----------

/** One payment in from a statement, before any matching. */
export type CreditLine = { line: number; date: string; narration: string; transactionRef: string; amount: number };

/**
 * Reads the payments in (credits) from a bank statement export, with no matching. Used by the
 * contributions import, which matches on membership numbers rather than application references.
 */
export function readCredits(csv: string): { lines: CreditLine[]; missing: string[]; skippedDebits: number } {
  const rows = parseCsv(csv).filter((r) => r.some((c) => c.trim()));
  const header = findHeader(rows);
  if (!header) return { lines: [], missing: ["a Date column", "a Credit or Amount column"], skippedDebits: 0 };
  const { at, col } = header;
  const lines: CreditLine[] = [];
  let skippedDebits = 0;
  rows.slice(at + 1).forEach((r, i) => {
    const cell = (c: number) => (c === -1 ? "" : (r[c] ?? "").trim());
    const amount = col.credit !== -1 ? money(cell(col.credit)) : money(cell(col.amount));
    if (!(amount > 0)) {
      skippedDebits++;
      return;
    }
    const narration = [cell(col.narration), cell(col.reference)].filter(Boolean).join(" · ");
    lines.push({
      line: at + 2 + i,
      date: cell(col.date),
      narration: narration || "(no narration)",
      transactionRef: (cell(col.reference) || narration).slice(0, 80),
      amount,
    });
  });
  return { lines, missing: [], skippedDebits };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Reads a statement date: 29/10/2026 and 29-10-2026 (day first, as Nigerian and UK banks print
 * them), 2026-10-29, or 29 Oct 2026. Midday UTC, so the date never shifts across a time zone.
 */
export function parseStatementDate(raw: string): Date | null {
  const s = raw.trim();
  let y: number, m: number, d: number;
  let r: RegExpExecArray | null;
  if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) [y, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(s))) [d, m, y] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = /^(\d{1,2})[\s-]+([A-Za-z]{3})[A-Za-z]*[\s,-]+(\d{2,4})/.exec(s))) {
    d = Number(r[1]);
    m = MONTHS.indexOf(r[2].toLowerCase()) + 1;
    y = Number(r[3]);
  } else return null;
  if (y < 100) y += 2000;
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return date.getUTCMonth() === m - 1 ? date : null;
}
