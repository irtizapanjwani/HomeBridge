// Board reports (brief Phase 3: "members by chapter and category, pipeline by status, joining fees
// received, contributions by month and currency; CSV and Excel exports").
//
// Built from the live database each time they are opened, so they always agree with the
// applications, joining-fee and contributions screens. Joining fees (VEKAT's) and contributions
// (the cooperative's) stay in separate reports, as the two ledgers do.

import "server-only";

import { type ContributionCurrency, allContributions, periodLabel, periodOf } from "@/lib/contributions";
import { collections } from "@/lib/members";
import { JOINING_FEE } from "@/lib/settings";
import { categoryOf } from "@/lib/welcome-pack";

export type Report = { id: string; name: string; description: string; columns: string[]; rows: (string | number)[][]; summary: boolean };

export type BoardReports = {
  asAt: string;
  stats: { label: string; value: string; sub?: string }[];
  reports: Report[];
};

const CATEGORIES = ["Home", "Diaspora", "Founding", "Professional", "Group"];
const STATUSES = ["Submitted", "In review", "Info requested", "Approved", "Declined"] as const;
const ORIGINS = [
  ["homebridge", "HomeBridge registration"],
  ["vekat", "VEKAT form"],
  ["gform", "Google Form import"],
] as const;

const DATE = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });
const AS_AT = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmtN = (n: number) => `₦${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
const fmtG = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtU = (n: number) => `$${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const chapterName = (c: string) => (c && c !== "None yet" ? c : "No chapter yet");

export async function buildBoardReports(): Promise<BoardReports> {
  const { members } = await collections();
  const [all, contributions] = await Promise.all([
    members
      .find(
        {},
        {
          projection: {
            reference: 1, fullName: 1, email: 1, whatsapp: 1, country: 1, city: 1, chapter: 1, memberType: 1, status: 1,
            supporter: 1, source: 1, createdAt: 1, membership: 1, payment: 1, forms: 1,
          },
        },
      )
      .toArray(),
    allContributions(),
  ]);

  const applicants = all.filter((m) => !m.supporter);
  const admitted = applicants.filter((m) => m.membership).sort((a, b) => a.membership!.seq - b.membership!.seq);

  // ---- 1. Members by chapter and category ----
  const byChapter = new Map<string, Record<string, number>>();
  for (const m of admitted) {
    const ch = chapterName(m.chapter);
    const row = byChapter.get(ch) ?? {};
    const cat = categoryOf(m);
    row[cat] = (row[cat] ?? 0) + 1;
    byChapter.set(ch, row);
  }
  const usedCats = CATEGORIES.filter((c) => admitted.some((m) => categoryOf(m) === c));
  const cats = usedCats.length ? usedCats : ["Home", "Diaspora"];
  const chapterRows = [...byChapter.keys()].sort().map((ch) => {
    const r = byChapter.get(ch)!;
    return [ch, ...cats.map((c) => r[c] ?? 0), cats.reduce((a, c) => a + (r[c] ?? 0), 0)];
  });
  const chapterTotal = ["Total", ...cats.map((c) => admitted.filter((m) => categoryOf(m) === c).length), admitted.length];

  // ---- 2. Applications by status ----
  const originOf = (m: (typeof all)[number]) => (m.source === "vekat" ? "vekat" : m.source === "gform" ? "gform" : "homebridge");
  const statusRows: (string | number)[][] = STATUSES.map((st) => {
    const these = applicants.filter((m) => m.status === st);
    return [st, ...ORIGINS.map(([o]) => these.filter((m) => originOf(m) === o).length), these.length];
  });
  statusRows.push(["Total", ...ORIGINS.map(([o]) => applicants.filter((m) => originOf(m) === o).length), applicants.length]);
  const supporters = all.filter((m) => m.supporter).length;

  // ---- 3. Joining fees received ----
  const feePaid = applicants.filter((m) => m.payment?.receiptNo && m.payment.verifiedAt);
  const feeAmount = (m: (typeof all)[number]) => (m.country === "Nigeria" ? { ngn: JOINING_FEE.ngn, gbp: 0 } : { ngn: 0, gbp: JOINING_FEE.gbp });
  const feesByMonth = new Map<string, { n: number; ngn: number; gbp: number }>();
  for (const m of feePaid) {
    const k = periodOf(new Date(m.payment!.verifiedAt!));
    const r = feesByMonth.get(k) ?? { n: 0, ngn: 0, gbp: 0 };
    const a = feeAmount(m);
    r.n++;
    r.ngn += a.ngn;
    r.gbp += a.gbp;
    feesByMonth.set(k, r);
  }
  const feeTotals = [...feesByMonth.values()].reduce((t, r) => ({ n: t.n + r.n, ngn: t.ngn + r.ngn, gbp: t.gbp + r.gbp }), { n: 0, ngn: 0, gbp: 0 });
  const feeRows: (string | number)[][] = [...feesByMonth.keys()].sort().map((k) => {
    const r = feesByMonth.get(k)!;
    return [periodLabel(k), r.n, r.ngn, r.gbp];
  });
  if (feeRows.length) feeRows.push(["Total", feeTotals.n, feeTotals.ngn, feeTotals.gbp]);
  const feesAwaiting = applicants.filter((m) => m.membership && !m.payment?.receiptNo).length;

  // ---- 4. Contributions by month and currency ----
  const byMonth = new Map<string, { n: number; members: Set<string> } & Record<ContributionCurrency, number>>();
  const totals = { NGN: 0, GBP: 0, USD: 0 } as Record<ContributionCurrency, number>;
  for (const c of contributions) {
    const r = byMonth.get(c.period) ?? { n: 0, members: new Set<string>(), NGN: 0, GBP: 0, USD: 0 };
    r.n++;
    r.members.add(c.memberNo);
    r[c.currency] += c.amount;
    totals[c.currency] += c.amount;
    byMonth.set(c.period, r);
  }
  const contribRows: (string | number)[][] = [...byMonth.keys()].sort().map((k) => {
    const r = byMonth.get(k)!;
    return [periodLabel(k), r.n, r.members.size, r2(r.NGN), r2(r.GBP), r2(r.USD)];
  });
  if (contribRows.length) {
    contribRows.push(["Total", contributions.length, new Set(contributions.map((c) => c.memberNo)).size, r2(totals.NGN), r2(totals.GBP), r2(totals.USD)]);
  }

  // ---- 5. Member register (detail) ----
  const perMember = new Map<string, { NGN: number; GBP: number; USD: number; last?: Date }>();
  for (const c of contributions) {
    const t = perMember.get(c.memberNo) ?? { NGN: 0, GBP: 0, USD: 0 };
    t[c.currency] += c.amount;
    if (!t.last || c.paidAt > t.last) t.last = c.paidAt;
    perMember.set(c.memberNo, t);
  }
  const registerRows = admitted.map((m) => {
    const no = m.membership!.memberNo;
    const t = perMember.get(no);
    return [
      no,
      m.fullName,
      categoryOf(m),
      chapterName(m.chapter),
      m.country,
      m.city ?? "",
      m.email,
      m.whatsapp ?? "",
      DATE.format(m.membership!.admittedAt),
      m.payment?.receiptNo ?? "Not confirmed",
      m.forms?.declaration ? DATE.format(m.forms.declaration.signedAt) : "No",
      m.forms?.nominee ? DATE.format(m.forms.nominee.signedAt) : "No",
      r2(t?.NGN ?? 0),
      r2(t?.GBP ?? 0),
      r2(t?.USD ?? 0),
      t?.last ? DATE.format(t.last) : "",
    ];
  });

  // ---- 6. Contribution receipts (detail) ----
  const nameOf = new Map(admitted.map((m) => [m.membership!.memberNo, m.fullName]));
  const receiptRows = [...contributions]
    .sort((a, b) => a.confirmedAt.getTime() - b.confirmedAt.getTime())
    .map((c) => [c.receiptNo, c.memberNo, nameOf.get(c.memberNo) ?? "", c.amount, c.currency, periodLabel(c.period), DATE.format(c.paidAt), c.bankRef, c.source === "statement" ? "Bank statement" : "By hand", c.confirmedBy]);

  const pending = applicants.filter((m) => ["Submitted", "In review", "Info requested"].includes(m.status)).length;
  const contribSummary = [totals.NGN ? fmtN(totals.NGN) : "", totals.GBP ? fmtG(totals.GBP) : "", totals.USD ? fmtU(totals.USD) : ""].filter(Boolean).join(" + ") || "₦0";

  return {
    asAt: AS_AT.format(new Date()),
    stats: [
      { label: "Admitted members", value: String(admitted.length), sub: `${chapterRows.length} chapter${chapterRows.length === 1 ? "" : "s"}` },
      { label: "Applications in progress", value: String(pending), sub: `${applicants.length} applications in total` },
      {
        label: "Joining fees received",
        value: [feeTotals.ngn ? fmtN(feeTotals.ngn) : "", feeTotals.gbp ? fmtG(feeTotals.gbp) : ""].filter(Boolean).join(" + ") || "₦0",
        sub: `${feeTotals.n} confirmed${feesAwaiting ? ` · ${feesAwaiting} admitted member${feesAwaiting === 1 ? "" : "s"} not yet confirmed` : ""}`,
      },
      { label: "Contributions recorded", value: contribSummary, sub: `${contributions.length} payment${contributions.length === 1 ? "" : "s"}` },
    ],
    reports: [
      {
        id: "members-by-chapter",
        name: "Members by chapter and category",
        description: "Admitted members (with a membership number), counted by chapter and membership category.",
        columns: ["Chapter", ...cats, "Total"],
        rows: chapterRows.length ? [...chapterRows, chapterTotal] : [],
        summary: true,
      },
      {
        id: "pipeline",
        name: "Applications by status",
        description: `Every membership application by where it stands, split by the form it came from.${supporters ? ` Supporters (not members) are left out: ${supporters}.` : ""}`,
        columns: ["Status", ...ORIGINS.map(([, l]) => l), "Total"],
        rows: statusRows,
        summary: true,
      },
      {
        id: "joining-fees",
        name: "Joining fees received",
        description: "Confirmed joining fees by the month they were confirmed. These are VEKAT's fees, not the cooperative's share capital.",
        columns: ["Month", "Fees confirmed", "Naira (NGN)", "Pounds (GBP)"],
        rows: feeRows,
        summary: true,
      },
      {
        id: "contributions-by-month",
        name: "Contributions by month and currency",
        description: "Recorded contributions by the month they count for, in the currency received.",
        columns: ["Month", "Payments", "Members paying", "Naira (NGN)", "Pounds (GBP)", "Dollars (USD)"],
        rows: contribRows,
        summary: true,
      },
      {
        id: "member-register",
        name: "Member register",
        description: "One row per admitted member: category, chapter, contact, fee receipt, forms returned and contributions to date.",
        columns: [
          "Member no.", "Name", "Category", "Chapter", "Country", "City", "Email", "Phone", "Admitted", "Joining fee receipt",
          "Declaration signed", "Nominee form signed", "Contributions NGN", "Contributions GBP", "Contributions USD", "Last paid",
        ],
        rows: registerRows,
        summary: false,
      },
      {
        id: "contribution-receipts",
        name: "Contribution receipts",
        description: "Every contribution recorded, with its HBC-CR receipt number, in the order confirmed.",
        columns: ["Receipt", "Member no.", "Name", "Amount", "Currency", "For month", "Received", "Bank reference", "Recorded from", "Confirmed by"],
        rows: receiptRows,
        summary: false,
      },
    ],
  };
}
