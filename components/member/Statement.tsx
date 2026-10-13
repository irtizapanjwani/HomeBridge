"use client";

import { useMemo, useState } from "react";
import { DownloadIcon } from "@/components/ui/Icons";
import {
  CONTRIBUTIONS,
  MEMBER,
  SAMPLE_AS_OF,
  formatDate,
  formatMoney,
  formatNaira,
  parseDate,
  totals,
} from "@/lib/member-data";
import { Card, SamplePill } from "./bits";

type Period = "year" | "all";

/** "Your contributions" table, with a period filter and a print-friendly statement. */
export function Statement() {
  const [period, setPeriod] = useState<Period>("year");
  const year = parseDate(SAMPLE_AS_OF).y;

  const rows = useMemo(
    () => (period === "year" ? CONTRIBUTIONS.filter((c) => parseDate(c.date).y === year) : CONTRIBUTIONS),
    [period, year],
  );
  const t = totals(rows);
  const oldest = rows.at(-1)?.date;
  const periodLabel =
    period === "year" ? `1 Jan ${year} – ${formatDate(SAMPLE_AS_OF)}` : `${oldest ? formatDate(oldest) : formatDate(MEMBER.joined)} – ${formatDate(SAMPLE_AS_OF)}`;

  return (
    <Card id="statements" className="scroll-mt-6 print:rounded-none print:border-0 print:p-0">
      {/* Statement header, only on paper */}
      <div className="mb-6 hidden border-b-2 border-forest-800 pb-4 print:block">
        <p className="m-0 font-display text-[22px] font-bold text-forest-800">HomeBridge Cooperative — member statement</p>
        <p className="m-0 mt-1 text-[13px]">{MEMBER.society}</p>
        <dl className="m-0 mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
          <div><dt className="inline font-semibold">Member: </dt><dd className="inline m-0">{MEMBER.name} · {MEMBER.number}</dd></div>
          <div><dt className="inline font-semibold">Period: </dt><dd className="inline m-0">{periodLabel}</dd></div>
          <div><dt className="inline font-semibold">Membership: </dt><dd className="inline m-0">{MEMBER.typeLabel} · {MEMBER.chapter}</dd></div>
          <div><dt className="inline font-semibold">Produced: </dt><dd className="inline m-0">{formatDate(SAMPLE_AS_OF)} · SAMPLE DATA — not a real statement</dd></div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 className="m-0 text-[clamp(22px,2.4vw,26px)] text-forest-800">Your contributions</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 print:hidden">
          <div role="group" aria-label="Period" className="inline-flex rounded-full border border-line bg-page p-1">
            {(
              [
                ["year", "This year"],
                ["all", "All time"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={`min-h-11 rounded-full px-4 text-[14px] font-semibold transition-colors ${
                  period === value ? "bg-forest-800 text-cream" : "text-forest-800 hover:bg-mist"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-forest-800 underline underline-offset-[3px] hover:text-forest-900"
          >
            <DownloadIcon size={18} />
            Download statement (PDF)
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 mb-0 text-muted">No payments in this period yet.</p>
      ) : (
        <>
          {/* Table on tablets, desktop and paper */}
          <table className="mt-5 hidden w-full border-collapse text-[15px] md:table print:table print:text-[12px]">
            <caption className="sr-only">Your contributions, {periodLabel}</caption>
            <thead>
              <tr className="border-b border-line text-left text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">
                <th scope="col" className="py-3 pr-3 font-semibold">Date</th>
                <th scope="col" className="py-3 pr-3 font-semibold">Type</th>
                <th scope="col" className="py-3 pr-3 font-semibold">Account</th>
                <th scope="col" className="py-3 pr-3 text-right font-semibold">Paid</th>
                <th scope="col" className="py-3 pr-3 text-right font-semibold">Naira</th>
                <th scope="col" className="py-3 text-right font-semibold">Shares</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-line/70">
                  <td className="py-3.5 pr-3 whitespace-nowrap">{formatDate(c.date)}</td>
                  <td className="py-3.5 pr-3">{c.kind === "shares" ? "Shares" : "Joining fee"}</td>
                  <td className="py-3.5 pr-3">{c.account}</td>
                  <td className="py-3.5 pr-3 text-right tabular-nums">{formatMoney(c.currency, c.amount)}</td>
                  <td className="py-3.5 pr-3 text-right tabular-nums">
                    {c.naira === null ? <span aria-label="none">—</span> : formatNaira(c.naira)}
                  </td>
                  <td className="py-3.5 text-right tabular-nums">
                    {c.shares === null ? <span className="text-muted">not a share</span> : <strong className="text-ink">{c.shares}</strong>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-ink">
                <th scope="row" colSpan={3} className="py-3.5 pr-3 text-left font-semibold">
                  Total shares bought
                </th>
                <td className="py-3.5 pr-3 text-right tabular-nums">{[...t.byCurrency.entries()].map(([c, a]) => formatMoney(c, a)).join(" + ") || "—"}</td>
                <td className="py-3.5 pr-3 text-right tabular-nums">{formatNaira(t.naira)}</td>
                <td className="py-3.5 text-right tabular-nums">{t.shares}</td>
              </tr>
            </tfoot>
          </table>

          {/* Stacked cards on phones */}
          <ul className="m-0 mt-5 grid list-none gap-3 p-0 md:hidden print:hidden">
            {rows.map((c) => (
              <li key={c.id} className="rounded-2xl border border-line bg-page p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-ink">{c.kind === "shares" ? "Shares" : "Joining fee"}</span>
                  <span className="font-semibold text-ink tabular-nums">{formatMoney(c.currency, c.amount)}</span>
                </div>
                <p className="m-0 mt-0.5 text-[14px] text-muted">
                  {formatDate(c.date)} · {c.account}
                </p>
                <dl className="m-0 mt-2 grid grid-cols-2 gap-2 text-[14px]">
                  <div>
                    <dt className="text-muted">Naira</dt>
                    <dd className="m-0 font-medium text-ink">{c.naira === null ? "—" : formatNaira(c.naira)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Shares</dt>
                    <dd className="m-0 font-medium text-ink">{c.shares === null ? "not a share" : c.shares}</dd>
                  </div>
                </dl>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-3 rounded-2xl bg-mist p-4 text-[15px]">
              <span className="font-semibold text-forest-800">Total shares bought</span>
              <span className="text-right font-semibold text-ink">
                {t.shares} shares · {formatNaira(t.naira)}
              </span>
            </li>
          </ul>
        </>
      )}

      <p className="m-0 mt-4 text-[14px] text-muted">
        Foreign currency converts at the bank rate on the day received. Amounts under ₦1,000 are carried to your next payment.
      </p>
      {t.joiningFees.length > 0 && (
        <p className="m-0 mt-2 hidden text-[12px] print:block">
          The joining fee is paid to the cooperative&rsquo;s appointed manager and does not buy shares, so it is not included in the totals.
        </p>
      )}
      <p className="m-0 mt-3 print:hidden">
        <SamplePill />
      </p>
    </Card>
  );
}
