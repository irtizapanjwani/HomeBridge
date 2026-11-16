"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRightIcon, CheckIcon, DownloadIcon, FileIcon } from "@/components/ui/Icons";
import { Card } from "./bits";
import type { ContributionsView } from "./Contributions";
import { GreenPanel, PageHeading, PortalPage } from "./PortalPage";

type Cur = "NGN" | "GBP" | "USD";
const SYM: Record<Cur, string> = { NGN: "₦", GBP: "£", USD: "$" };
const fmt = (n: number, c: Cur) => `${SYM[c]}${n.toLocaleString("en-GB", { minimumFractionDigits: c === "NGN" ? 0 : 2, maximumFractionDigits: 2 })}`;
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const monthLabel = (key: string) => MONTH.format(new Date(`${key}-15T12:00:00Z`));
const SHORT_MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const shortMonth = (key: string) => SHORT_MONTH.format(new Date(`${key}-15T12:00:00Z`));

/** Every month from `from` to `to` (YYYY-MM), newest first. */
function monthsBetween(from: string, to: string) {
  const out: string[] = [];
  let [y, m] = to.split("-").map(Number);
  const [fy, fm] = from.split("-").map(Number);
  while ((y > fy || (y === fy && m >= fm)) && out.length < 240) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    if (--m < 1) {
      m = 12;
      y--;
    }
  }
  return out;
}

const PROOF = {
  pending: { label: "Waiting for the Treasurer", cls: "bg-butter text-gold-ink" },
  approved: { label: "Accepted", cls: "bg-mist text-forest-800" },
  rejected: { label: "Not accepted", cls: "bg-[#FBEBEB] text-danger" },
} as const;
const HOLIDAY = {
  pending: { label: "Waiting for an answer", cls: "bg-butter text-gold-ink" },
  approved: { label: "Approved", cls: "bg-mist text-forest-800" },
  declined: { label: "Not approved", cls: "bg-[#FBEBEB] text-danger" },
} as const;

const select =
  "block min-h-11 w-full rounded-xl border border-line-strong/70 bg-page px-3 text-[15px] text-ink focus:border-forest-800 focus:outline-none";

export function StatementsPage({ c, memberNo }: { c: ContributionsView; memberNo: string }) {
  const items = c.items;
  const years = useMemo(() => [...new Set(items.map((i) => (i.key ?? "").slice(0, 4)).filter(Boolean))].sort().reverse(), [items]);
  const [year, setYear] = useState<string>("all");
  const shown = year === "all" ? items : items.filter((i) => i.key?.startsWith(year));

  const months = monthsBetween(c.firstMonth, c.thisMonth);
  const [from, setFrom] = useState(months[Math.min(months.length - 1, 11)] ?? c.firstMonth);
  const [to, setTo] = useState(c.thisMonth);
  const [lo, hi] = from <= to ? [from, to] : [to, from];
  const link = (format: "pdf" | "csv") => `/api/member/statement?from=${lo}&to=${hi}&format=${format}`;
  const thisYear = c.thisMonth.slice(0, 4);
  const quickAll = [
    { label: "This year", from: [`${thisYear}-01`, c.firstMonth].sort().reverse()[0], to: c.thisMonth },
    { label: "Last 12 months", from: months[Math.min(months.length - 1, 11)] ?? c.firstMonth, to: c.thisMonth },
    { label: "Since I joined", from: c.firstMonth, to: c.thisMonth },
  ];
  // Two buttons can cover the same months (e.g. for a new member); show each range once.
  const quick = quickAll.filter((q, i) => quickAll.findIndex((x) => x.from === q.from && x.to === q.to) === i);

  // Totals by year, per currency, for the "year" lines in the history.
  const yearTotal = (y: string) => {
    const t: Partial<Record<Cur, number>> = {};
    for (const i of items) if (i.key?.startsWith(y) && i.currency && typeof i.value === "number") t[i.currency] = (t[i.currency] ?? 0) + i.value;
    return (Object.entries(t) as [Cur, number][]).map(([cur, n]) => fmt(n, cur)).join(" + ");
  };

  const last = items[0];
  const pendingProofs = c.proofs.filter((p) => p.status === "pending").length;

  return (
    <PortalPage>
      <PageHeading
        eyebrow="Statements"
        title="Your money, month by month"
        lead="Every contribution we have recorded for you, with a receipt for each one and a statement you can download whenever you need it."
        aside={
          <Link href="/app#contributions" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest-800 px-5 text-[15px] font-semibold text-cream no-underline hover:bg-forest-900 hover:text-cream">
            Send proof of a payment <ArrowRightIcon size={16} />
          </Link>
        }
      />

      {/* At a glance */}
      <GreenPanel className="mt-6">
        <p className="m-0 text-[12px] font-bold tracking-[0.14em] text-gold uppercase">Member {memberNo}</p>
        <dl className="m-0 mt-3 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "Total contributed", v: c.totals.length ? c.totals.join(" + ") : "Nothing yet" },
            { k: "Shares held", v: c.shares.toLocaleString("en-GB") },
            { k: "Payments recorded", v: String(items.length) },
            { k: "Last payment", v: last ? `${last.period}` : "None yet", sub: last ? `Received ${last.paidAt}` : "" },
          ].map((s) => (
            <div key={s.k} className="min-w-0">
              <dt className="text-[13px] text-on-dark">{s.k}</dt>
              <dd className="m-0 mt-1 font-display text-[clamp(22px,2.6vw,30px)] leading-tight font-bold break-words text-cream">{s.v}</dd>
              {s.sub ? <dd className="m-0 mt-0.5 text-[13px] text-on-dark">{s.sub}</dd> : null}
            </div>
          ))}
        </dl>
        <p className="m-0 mt-5 max-w-[760px] text-[13.5px] text-on-dark">{c.note}</p>
      </GreenPanel>

      {/* Both columns end level: the history and the last card on the right stretch to the same line. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* History */}
        <Card className="flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 font-sans text-[18px] font-semibold text-ink">Payment history</h2>
            {years.length > 1 && (
              <div role="tablist" aria-label="Show year" className="flex flex-wrap gap-1.5">
                {["all", ...years].map((y) => (
                  <button
                    key={y}
                    type="button"
                    role="tab"
                    aria-selected={year === y}
                    onClick={() => setYear(y)}
                    className={`min-h-9 rounded-full px-3.5 text-[14px] font-semibold transition-colors ${
                      year === y ? "bg-forest-800 text-cream" : "bg-mist/70 text-forest-800 hover:bg-mist"
                    }`}
                  >
                    {y === "all" ? "All" : y}
                  </button>
                ))}
              </div>
            )}
          </div>

          {shown.length ? (
            <ul className="m-0 mt-4 list-none p-0">
              {shown.map((i, n) => {
                const y = i.key?.slice(0, 4) ?? "";
                const newYear = n === 0 || shown[n - 1].key?.slice(0, 4) !== y;
                return (
                  <li key={i.receiptNo}>
                    {newYear && y ? (
                      <div className="mt-2 flex items-baseline justify-between gap-3 border-b border-line pb-2 first:mt-0">
                        <span className="font-display text-[20px] font-bold text-forest-800">{y}</span>
                        <span className="text-[13.5px] text-muted">
                          Total <span className="font-semibold text-ink">{yearTotal(y)}</span>
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-3 border-b border-line/60 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-forest-800">
                        <CheckIcon size={15} strokeWidth={3} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-[15.5px] text-ink">
                          <span className="font-semibold">{i.amount}</span> for {i.period}
                        </p>
                        <p className="m-0 text-[13px] text-muted">
                          Received {i.paidAt} · {i.receiptNo}
                        </p>
                      </div>
                      <a
                        href={`/api/member/contributions/${encodeURIComponent(i.receiptNo)}`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-forest-800 no-underline hover:bg-mist"
                      >
                        <DownloadIcon size={16} /> <span className="hidden sm:inline">Receipt</span>
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-4 rounded-[16px] bg-mist/50 p-6 text-center">
              <p className="m-0 font-semibold text-ink">No payments recorded yet</p>
              <p className="mt-1 mb-0 text-[14.5px] text-body">
                Your first monthly contribution will show here with its receipt. Paid already?{" "}
                <Link href="/app#contributions" className="font-semibold">
                  Send us the proof
                </Link>
                .
              </p>
            </div>
          )}
          <p className="m-0 mt-auto pt-5 text-[13px] text-muted">
            A payment shows here once the Treasurer has matched it to the bank. That usually takes 1 to 3 working days.
          </p>
        </Card>

        <div className="flex flex-col gap-4 [&>:last-child]:flex-1">
          {/* Download */}
          <Card>
            <h2 className="m-0 font-sans text-[18px] font-semibold text-ink">Download a statement</h2>
            <p className="mt-1 mb-0 text-[14.5px] text-body">For your bank, your records, or a visa application.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {quick.map((q) => {
                const on = lo === q.from && hi === q.to;
                return (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => {
                      setFrom(q.from);
                      setTo(q.to);
                    }}
                    className={`min-h-9 rounded-full border px-3.5 text-[13.5px] font-semibold transition-colors ${
                      on ? "border-forest-800 bg-forest-800 text-cream" : "border-line bg-paper text-forest-800 hover:border-forest-800"
                    }`}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-[13.5px] font-semibold text-ink">
                From
                <select value={from} onChange={(e) => setFrom(e.target.value)} className={select}>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {shortMonth(m)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[13.5px] font-semibold text-ink">
                To
                <select value={to} onChange={(e) => setTo(e.target.value)} className={select}>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {shortMonth(m)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <a
                href={link("pdf")}
                target="_blank"
                rel="noopener"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest-800 text-[15px] font-semibold text-cream no-underline hover:bg-forest-900 hover:text-cream"
              >
                <FileIcon size={17} /> PDF
              </a>
              <a
                href={link("csv")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-forest-800 text-[15px] font-semibold text-forest-800 no-underline hover:bg-mist"
              >
                <DownloadIcon size={17} /> Spreadsheet
              </a>
            </div>
            <p className="mt-2 mb-0 text-[12.5px] text-muted">
              {monthLabel(lo)}
              {lo === hi ? "" : ` to ${monthLabel(hi)}`}
            </p>
          </Card>

          {/* Proofs */}
          <Card className="flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 font-sans text-[18px] font-semibold text-ink">Proofs you sent</h2>
              {pendingProofs ? <span className="rounded-full bg-butter px-2.5 py-0.5 text-[12.5px] font-semibold text-gold-ink">{pendingProofs} waiting</span> : null}
            </div>
            {c.proofs.length ? (
              <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
                {c.proofs.slice(0, 5).map((p) => (
                  <li key={p.id} className="rounded-xl bg-page px-3.5 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[14.5px] text-ink">
                        <span className="font-semibold">{p.amount}</span> for {p.period}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${PROOF[p.status].cls}`}>{PROOF[p.status].label}</span>
                    </div>
                    <p className="m-0 mt-0.5 text-[12.5px] text-muted">
                      Sent {p.sentAt}
                      {p.reason ? ` · ${p.reason}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 mb-0 text-[14.5px] text-body">Paid by bank transfer and it is not showing yet? Send us the receipt and we will record it.</p>
            )}
            <Link href="/app#contributions" className="mt-auto inline-flex min-h-10 items-center gap-1.5 self-start pt-3 text-[14.5px] font-semibold">
              Send proof <ArrowRightIcon size={15} />
            </Link>
          </Card>

          {c.holidays.length ? (
            <Card>
              <h2 className="m-0 font-sans text-[18px] font-semibold text-ink">Payment holidays</h2>
              <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
                {c.holidays.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-page px-3.5 py-2.5">
                    <span className="text-[14.5px] text-ink">{h.months}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${HOLIDAY[h.status].cls}`}>{HOLIDAY[h.status].label}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </PortalPage>
  );
}
