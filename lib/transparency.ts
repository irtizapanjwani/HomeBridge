// The members' transparency page (Member Platform brief §3: "Total funds held by currency, number
// of active members, percentage of members up to date this month, and a breakdown by zone. No
// individual names or amounts appear here.").

import "server-only";

import { type ContributionCurrency, CURRENCIES, allContributions, money, periodOf } from "@/lib/contributions";
import { collections } from "@/lib/members";
import { meetsMinimum } from "@/lib/missed-payments";
import { holidayMonths } from "@/lib/payment-holidays";
import { pendingProofMembers } from "@/lib/payment-proofs";
import { lagosToday } from "@/lib/payment-reminders";

type Totals = Partial<Record<ContributionCurrency, number>>;

export type Transparency = {
  funds: string[];
  members: number;
  /** Members whose first monthly cycle has started, and of those, how many are paid this month. */
  dueThisMonth: number;
  upToDate: number;
  percentUpToDate: number | null;
  zones: { zone: string; members: number; percentUpToDate: number | null }[];
  asOf: string;
};

export async function transparency(): Promise<Transparency> {
  const { period, date } = lagosToday();
  const { members } = await collections();
  const admitted = await members.find({ "membership.memberNo": { $exists: true } }, { projection: { chapter: 1, membership: 1 } }).toArray();
  const contribs = await allContributions();
  const waiting = await pendingProofMembers(period).catch(() => new Set<string>());
  const onHoliday = await holidayMonths().catch(() => new Map<string, Set<string>>());

  const funds = CURRENCIES.map((c) => [c, contribs.filter((x) => x.currency === c).reduce((t, x) => t + x.amount, 0)] as const)
    .filter(([, t]) => t > 0)
    .map(([c, t]) => money(t, c));

  const thisMonth = new Map<string, Totals>();
  for (const c of contribs.filter((x) => x.period === period)) {
    const t = thisMonth.get(c.memberNo) ?? {};
    t[c.currency] = (t[c.currency] ?? 0) + c.amount;
    thisMonth.set(c.memberNo, t);
  }

  const zones = new Map<string, { members: number; due: number; paid: number }>();
  let due = 0;
  let paid = 0;
  for (const m of admitted) {
    const no = m.membership!.memberNo;
    const z = zones.get(m.chapter || "Other") ?? { members: 0, due: 0, paid: 0 };
    z.members++;
    // Members start paying the month after they are admitted; a month on holiday is not due.
    if (periodOf(m.membership!.admittedAt) < period && !onHoliday.get(no)?.has(period)) {
      z.due++;
      due++;
      if (meetsMinimum(thisMonth.get(no) ?? {}) || waiting.has(no)) {
        z.paid++;
        paid++;
      }
    }
    zones.set(m.chapter || "Other", z);
  }
  const pct = (p: number, d: number) => (d ? Math.round((p / d) * 100) : null);

  return {
    funds,
    members: admitted.length,
    dueThisMonth: due,
    upToDate: paid,
    percentUpToDate: pct(paid, due),
    zones: [...zones.entries()]
      .sort((a, b) => b[1].members - a[1].members || a[0].localeCompare(b[0]))
      .map(([zone, z]) => ({ zone, members: z.members, percentUpToDate: pct(z.paid, z.due) })),
    asOf: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)),
  };
}
