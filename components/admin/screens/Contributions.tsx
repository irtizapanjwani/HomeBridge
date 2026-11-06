"use client";

import { useCallback, useEffect, useState } from "react";
import { PAY_CHANGED } from "../lib";
import { Card, PageHeader, cx } from "../ui";
import { LiveContributionsCard } from "./LiveContributions";
import { MissedPaymentsCard } from "./MissedPayments";
import { ProofsCard } from "./LiveProofs";
import { HolidaysCard } from "./LiveHolidays";
import { ReconciliationCard } from "./LiveReconciliation";

/**
 * Contributions: the monthly money members pay into the cooperative's own accounts. Everything on
 * this page is live. The box at the top says what is waiting for the officer and jumps to it.
 */
export function ContributionsScreen() {
  return (
    <>
      <PageHeader
        title="Contributions"
        subtitle="The monthly payments members make into HomeBridge's bank accounts. Record them here and each member is emailed a receipt."
        live
      />
      <WaitingBox />
      <LiveContributionsCard />
      <ProofsCard />
      <HolidaysCard />
      <MissedPaymentsCard />
      <ReconciliationCard />
    </>
  );
}

type Todo = { key: string; n: number; text: string; target: string; urgent: boolean };

const lastMonth = () => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
};

const get = <T,>(url: string) =>
  fetch(url, { cache: "no-store" })
    .then((r) => r.json() as Promise<T & { ok?: boolean }>)
    .then((d) => (d.ok ? d : null))
    .catch(() => null);

/** "What needs me?" in one glance, each line a button to the card that deals with it. */
function WaitingBox() {
  const [todos, setTodos] = useState<Todo[] | null>(null);

  const load = useCallback(() => {
    void Promise.all([
      get<{ pending?: unknown[] }>("/api/admin/proofs"),
      get<{ pending?: unknown[] }>("/api/admin/holidays"),
      get<{ rows?: unknown[]; label?: string }>("/api/admin/contributions/missed"),
      get<{ label?: string; accounts?: { signOff: unknown; recordedCount: number; uploadedTotal: number }[]; unmatched?: unknown[] }>(
        `/api/admin/reconciliation?period=${lastMonth()}`,
      ),
    ]).then(([proofs, holidays, missed, rec]) => {
      const p = proofs?.pending?.length ?? 0;
      const h = holidays?.pending?.length ?? 0;
      const m = missed?.rows?.length ?? 0;
      const u = rec?.unmatched?.length ?? 0;
      setTodos([
        { key: "proofs", n: p, text: `proof${p === 1 ? "" : "s"} of payment to check`, target: "proofs", urgent: true },
        { key: "holidays", n: h, text: `payment holiday request${h === 1 ? "" : "s"} to answer`, target: "holidays", urgent: true },
        { key: "unmatched", n: u, text: `bank payment${u === 1 ? "" : "s"} we couldn't match to a member`, target: "reconciliation", urgent: true },
        { key: "missed", n: m, text: `member${m === 1 ? " hasn't" : "s haven't"} paid for ${missed?.label ?? "this month"} yet`, target: "missed-payments", urgent: false },
      ]);
    });
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(PAY_CHANGED, load);
    return () => window.removeEventListener(PAY_CHANGED, load);
  }, [load]);

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const open = todos?.filter((t) => t.n > 0) ?? [];
  const jobs = open.filter((t) => t.urgent);

  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="m-0 font-display text-[19px] font-bold text-forest-800">
        {!todos ? "Checking what's waiting…" : jobs.length ? "Waiting for you" : "You're up to date"}
      </h2>
      {todos && open.length === 0 ? <p className="m-0 text-[14.5px] text-body">Nothing needs you right now. Upload a new bank statement when one comes in.</p> : null}
      {open.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {open.map((t) => (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => go(t.target)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition hover:border-forest-800",
                  t.urgent ? "border-[#EBD38B] bg-[#FCF1D4]" : "border-line bg-paper",
                )}
              >
                <span
                  className={cx(
                    "grid h-8 min-w-8 shrink-0 place-items-center rounded-full px-2 text-[14px] font-bold",
                    t.urgent ? "bg-[#5C4508] text-paper" : "bg-mist text-forest-800",
                  )}
                >
                  {t.n}
                </span>
                <span className="flex-1 text-[14.5px] text-ink">{t.text}</span>
                <span className="text-[13.5px] font-semibold whitespace-nowrap text-forest-800">Go there ↓</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
