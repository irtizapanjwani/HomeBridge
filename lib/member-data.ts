// SAMPLE DATA for one example member. There are no real member accounts yet: in the live system this
// comes from the member's own record and the matched bank statement lines. Everything here is
// illustrative — naira values use EXAMPLE_RATES, not real bank rates.

import { EXAMPLE_RATES, MIN_MONTHLY, SHARE_PRICE_NGN, type Currency } from "@/lib/settings";

export type MemberType = "diaspora" | "home";

export type Contribution = {
  id: string;
  /** ISO date (yyyy-mm-dd) the money was received */
  date: string;
  kind: "shares" | "joining-fee";
  /** Where it was paid */
  account: string;
  currency: Currency;
  amount: number;
  /** Naira credited at the bank rate on the day (shares only) */
  naira: number | null;
  shares: number | null;
  /** Naira left over (under one share) carried to the next payment */
  carried: number;
  status: "Matched" | "Pending";
};

export const MEMBER = {
  number: "HB-ED-UK-000045",
  name: "[Member name]",
  type: "diaspora" as MemberType,
  typeLabel: "Diaspora member",
  chapter: "HomeBridge UK",
  society: "HomeBridge Cooperative Society Ltd (Edo State)",
  city: "Manchester, UK",
  route: "Family land, Edo",
  identityCheck: "Passed",
  nominees: [{ name: "[Nominee name]", relationship: "[Relationship]", share: 100 }],
  joined: "2026-08-14",
  homeCurrency: "GBP" as Currency,
  email: "[member email]",
};

/** "Today" for the sample, so the figures stay coherent. The live system uses the real date. */
export const SAMPLE_AS_OF = "2026-10-13";

/** Short account names for statements. */
export const ACCOUNT_SHORT: Record<Currency, string> = {
  NGN: "Naira account",
  USD: "USD domiciliary",
  GBP: "GBP domiciliary",
};

function shareLine(id: string, date: string, currency: Currency, amount: number, prevCarried = 0): Contribution {
  const naira = Math.round(amount * EXAMPLE_RATES[currency]);
  const total = naira + prevCarried;
  const shares = Math.floor(total / SHARE_PRICE_NGN);
  return {
    id,
    date,
    kind: "shares",
    account: ACCOUNT_SHORT[currency],
    currency,
    amount,
    naira,
    shares,
    carried: total - shares * SHARE_PRICE_NGN,
    status: "Matched",
  };
}

const sep = shareLine("c2", "2026-09-02", "GBP", 25);
const oct = shareLine("c3", "2026-10-02", "GBP", 25, sep.carried);

/** Newest first. */
export const CONTRIBUTIONS: Contribution[] = [
  oct,
  sep,
  {
    id: "c1",
    date: "2026-08-14",
    kind: "joining-fee",
    account: "Stripe · VEKAT",
    currency: "GBP",
    amount: 10,
    naira: null,
    shares: null,
    carried: 0,
    status: "Matched",
  },
];

export const JOINING_FEE_PAID = {
  date: "2026-08-14",
  currency: "GBP" as Currency,
  amount: 10,
  method: "Card via Stripe",
};

/* ---------- formatting ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Parse yyyy-mm-dd without time-zone surprises. */
export function parseDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}
export const formatDate = (iso: string) => {
  const { y, m, d } = parseDate(iso);
  return `${d} ${MONTHS[m]} ${y}`;
};
export const formatDayMonth = (iso: string) => {
  const { m, d } = parseDate(iso);
  return `${d} ${MONTHS[m]}`;
};
export const formatMonthYear = (y: number, m: number) => `${MONTHS[m]} ${y}`;
export const monthName = (m: number) => MONTHS_LONG[m];

export const CURRENCY_SYMBOL: Record<Currency, string> = { NGN: "₦", USD: "$", GBP: "£" };

export function formatMoney(currency: Currency, amount: number, decimals = currency !== "NGN") {
  const n = amount.toLocaleString("en-GB", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
  return `${CURRENCY_SYMBOL[currency]}${n}`;
}
export const formatNaira = (n: number) => formatMoney("NGN", n, false);

/* ---------- rules, worked out from the data ---------- */

const monthIndex = (iso: string) => {
  const { y, m } = parseDate(iso);
  return y * 12 + m;
};

export function shareLines(list: Contribution[] = CONTRIBUTIONS) {
  return list.filter((c) => c.kind === "shares");
}

export function totals(list: Contribution[] = CONTRIBUTIONS) {
  const lines = shareLines(list);
  const byCurrency = new Map<Currency, number>();
  for (const c of lines) byCurrency.set(c.currency, (byCurrency.get(c.currency) ?? 0) + c.amount);
  return {
    shares: lines.reduce((s, c) => s + (c.shares ?? 0), 0),
    naira: lines.reduce((s, c) => s + (c.naira ?? 0), 0),
    byCurrency,
    joiningFees: list.filter((c) => c.kind === "joining-fee"),
  };
}

/** "£50" or "£50 + ₦5,000" when a member has paid in more than one currency. */
export function formatByCurrency(map: Map<Currency, number>) {
  if (map.size === 0) return formatMoney(MEMBER.homeCurrency, 0, false);
  return [...map.entries()].map(([c, a]) => formatMoney(c, a, !Number.isInteger(a))).join(" + ");
}

/** Bye-law 11.2: monthly minimum for this member, in their own currency. */
export function monthlyMinimum(type: MemberType = MEMBER.type) {
  return type === "diaspora"
    ? { currency: "GBP" as Currency, amount: MIN_MONTHLY.gbp }
    : { currency: "NGN" as Currency, amount: MIN_MONTHLY.ngn };
}

/** Value of a payment in the minimum's currency (foreign currency via the naira value). */
function inMinimumCurrency(c: Contribution, minCurrency: Currency) {
  if (c.currency === minCurrency) return c.amount;
  return (c.naira ?? 0) / EXAMPLE_RATES[minCurrency];
}

/**
 * Months on track this year: every month from the first share payment (or January) up to the
 * current month. The current month only counts once the minimum is met, since it is not over yet.
 */
export function monthsOnTrack(asOf = SAMPLE_AS_OF, list: Contribution[] = CONTRIBUTIONS) {
  const lines = shareLines(list);
  const min = monthlyMinimum();
  const now = monthIndex(asOf);
  const yearStart = parseDate(asOf).y * 12;
  if (lines.length === 0) return { met: 0, due: 0, min };
  const first = Math.min(...lines.map((c) => monthIndex(c.date)));
  let met = 0;
  let due = 0;
  for (let mi = Math.max(first, yearStart); mi <= now; mi++) {
    const paid = lines.filter((c) => monthIndex(c.date) === mi).reduce((s, c) => s + inMinimumCurrency(c, min.currency), 0);
    const ok = paid >= min.amount;
    if (mi < now || ok) due++;
    if (ok) met++;
  }
  return { met, due, min };
}

export function paidInYear(year: number, list: Contribution[] = CONTRIBUTIONS) {
  return totals(list.filter((c) => parseDate(c.date).y === year));
}

/** Whole months between two ISO dates (a to b). */
function monthsBetween(a: string, b: string) {
  const A = parseDate(a);
  const B = parseDate(b);
  let months = (B.y - A.y) * 12 + (B.m - A.m);
  if (B.d < A.d) months--;
  return months;
}

/**
 * Bye-law 9.3: no share contribution for 12 months → written reminder; after a further 3 months the
 * member may be treated as dormant (no vote) until contributions resume.
 */
export function contributionStatus(asOf = SAMPLE_AS_OF, list: Contribution[] = CONTRIBUTIONS) {
  const lines = shareLines(list);
  const last = lines.map((c) => c.date).sort().at(-1) ?? MEMBER.joined;
  const months = monthsBetween(last, asOf);
  const state: "active" | "reminder" | "dormant" = months >= 15 ? "dormant" : months >= 12 ? "reminder" : "active";
  return { state, monthsSince: months, lastDate: last };
}

/** Bye-law 12.1: shares can be withdrawn after 3 years, with 6 months' written notice. */
export function withdrawalEligibility(asOf = SAMPLE_AS_OF, list: Contribution[] = CONTRIBUTIONS) {
  const first = shareLines(list).map((c) => c.date).sort()[0];
  if (!first) return { from: null as null | { y: number; m: number }, label: "3 years after your first share", eligible: false };
  const { y, m } = parseDate(first);
  const from = { y: y + 3, m };
  const now = parseDate(asOf);
  const eligible = now.y * 12 + now.m >= from.y * 12 + from.m;
  return { from, label: formatMonthYear(from.y, from.m), eligible };
}

/* ---------- buying shares ---------- */

export const AMOUNT_CHIPS: Record<Currency, number[]> = {
  NGN: [5_000, 10_000, 20_000, 50_000],
  USD: [30, 60, 120, 300],
  GBP: [25, 50, 100, 250],
};

/** Example conversion: whole shares at ₦1,000; the rest is held as unallocated credit. */
export function illustrate(currency: Currency, amount: number) {
  const naira = Math.round(amount * EXAMPLE_RATES[currency]);
  const shares = Math.floor(naira / SHARE_PRICE_NGN);
  const credit = naira - shares * SHARE_PRICE_NGN;
  const min = monthlyMinimum();
  const minNaira = min.amount * EXAMPLE_RATES[min.currency];
  return { naira, shares, credit, belowMinimum: amount > 0 && naira < minNaira, min };
}

export const MEMBER_NUMBER_PATTERN = /^HB-[A-Z]{2}-[A-Z]{2}-\d{6}$/;
