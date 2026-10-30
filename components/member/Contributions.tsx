"use client";

import { useState } from "react";
import { DownloadIcon } from "@/components/ui/Icons";
import { Card } from "./bits";

export type ContributionsView = {
  items: { receiptNo: string; period: string; amount: string; paidAt: string }[];
  totals: string[];
  shares: number;
  note: string;
};

/** Brief Phase 2 member portal: "contribution history and share balance". */
export function ContributionsCard({ c }: { c: ContributionsView }) {
  const [all, setAll] = useState(false);
  const shown = all ? c.items : c.items.slice(0, 6);
  return (
    <Card>
      <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Your contributions</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-mist/70 px-4 py-3">
          <p className="m-0 text-[13px] text-muted">Total contributed</p>
          <p className="m-0 mt-0.5 text-[20px] font-semibold text-forest-800">{c.totals.length ? c.totals.join(" + ") : "Nothing yet"}</p>
        </div>
        <div className="rounded-xl bg-mist/70 px-4 py-3">
          <p className="m-0 text-[13px] text-muted">Share balance</p>
          <p className="m-0 mt-0.5 text-[20px] font-semibold text-forest-800">{c.shares.toLocaleString("en-GB")} shares</p>
        </div>
      </div>
      <p className="mt-2 mb-0 text-[13px] text-muted">{c.note}</p>

      {c.items.length ? (
        <ul className="mt-4 mb-0 flex list-none flex-col divide-y divide-line/70 p-0">
          {shown.map((i) => (
            <li key={i.receiptNo} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <span className="block text-[15px] font-semibold text-ink">
                  {i.amount} <span className="font-normal text-muted">for {i.period}</span>
                </span>
                <span className="block text-[13px] text-muted">
                  Received {i.paidAt} · {i.receiptNo}
                </span>
              </span>
              <a
                href={`/api/member/contributions/${encodeURIComponent(i.receiptNo)}`}
                target="_blank"
                rel="noopener"
                className="inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold text-forest-800 underline underline-offset-[3px]"
              >
                <DownloadIcon size={16} /> Receipt
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 mb-0 text-[15px] text-body">
          No contributions recorded yet. Pay into the cooperative&rsquo;s account using your membership number as the reference — your Contribution
          and Payment Guide has the details. Each payment appears here with its receipt once it clears.
        </p>
      )}
      {c.items.length > 6 ? (
        <button type="button" onClick={() => setAll(!all)} className="mt-2 text-[14px] font-semibold text-forest-800 underline underline-offset-[3px]">
          {all ? "Show fewer" : `Show all ${c.items.length}`}
        </button>
      ) : null}
    </Card>
  );
}
