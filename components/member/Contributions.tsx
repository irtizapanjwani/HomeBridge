"use client";

import { useState } from "react";
import { DownloadIcon } from "@/components/ui/Icons";
import { Card, btnPrimary, btnSecondary, textLink } from "./bits";

export type ContributionsView = {
  items: { receiptNo: string; period: string; amount: string; paidAt: string }[];
  totals: string[];
  shares: number;
  note: string;
  /** The member's usual currency, to start the proof form with. */
  currency: "NGN" | "GBP" | "USD";
  /** Proofs of payment the member has sent, newest first. */
  proofs: { id: string; amount: string; period: string; status: "pending" | "approved" | "rejected"; sentAt: string; reason: string; receiptNo: string }[];
  /** This month (YYYY-MM) and the month the member joined (YYYY-MM), for the statement picker. */
  thisMonth: string;
  firstMonth: string;
  /** Payment holiday requests, newest first. */
  holidays: { id: string; months: string; status: "pending" | "approved" | "declined"; note: string }[];
};

const PROOF_LABEL = { pending: "Waiting for the Treasurer", approved: "Accepted", rejected: "Not accepted" } as const;
const PROOF_TONE = { pending: "bg-butter text-gold-ink", approved: "bg-mist text-forest-800", rejected: "bg-[#fdf6f3] text-danger" } as const;

const field = "min-h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] text-ink";
const label = "flex flex-col gap-1 text-[13.5px] font-medium text-muted";

/** Brief Phase 2 member portal: "contribution history and share balance"; Member Platform brief §3: proof upload and statements. */
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

      {c.proofs.length ? (
        <div className="mt-5">
          <h3 className="m-0 font-sans text-[15px] font-semibold text-forest-800">Payments you told us about</h3>
          <ul className="mt-2 mb-0 flex list-none flex-col gap-2 p-0">
            {c.proofs.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 text-[14.5px] text-body">
                <span className={`inline-flex rounded-full px-3 py-1 text-[13px] font-semibold ${PROOF_TONE[p.status]}`}>{PROOF_LABEL[p.status]}</span>
                <span>
                  {p.amount} for {p.period} · sent {p.sentAt}
                  {p.receiptNo ? ` · ${p.receiptNo}` : ""}
                </span>
                {p.reason ? <span className="block w-full text-[13.5px] text-danger">Reason: {p.reason}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ProofForm currency={c.currency} thisMonth={c.thisMonth} />
      <HolidayForm thisMonth={c.thisMonth} holidays={c.holidays} />
      <StatementDownload firstMonth={c.firstMonth} thisMonth={c.thisMonth} />
    </Card>
  );
}

function ProofForm({ currency, thisMonth }: { currency: ContributionsView["currency"]; thisMonth: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ amount: "", currency: currency as string, period: thisMonth, paidOn: today, bankRef: "", note: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    if (!file) return setMsg({ ok: false, text: "Attach a photo or PDF of the bank receipt." });
    setBusy(true);
    setMsg(null);
    try {
      const body = new FormData();
      Object.entries(f).forEach(([k, v]) => body.append(k, v));
      body.append("file", file);
      const res = await fetch("/api/member/payment-proof", { method: "POST", body });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || "We could not send that. Please try again.");
      setMsg({ ok: true, text: "Thank you. The Treasurer will check it against the bank statement, and you will get a receipt by email." });
      setTimeout(() => window.location.reload(), 1800);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "We could not send that." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mt-5 rounded-xl border border-line p-4">
      <summary className="cursor-pointer text-[15px] font-semibold text-forest-800">I have paid — send proof</summary>
      <p className="mt-2 mb-3 text-[14px] text-body">
        Paid by bank transfer and it is not showing yet? Send a photo or PDF of your bank receipt. Sent by the 7th, it counts as on time.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Amount paid
          <input value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" className={field} />
        </label>
        <label className={label}>
          Currency
          <select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} className={field}>
            <option value="NGN">Naira (₦)</option>
            <option value="GBP">Pounds (£)</option>
            <option value="USD">Dollars ($)</option>
          </select>
        </label>
        <label className={label}>
          For the month of
          <input type="month" value={f.period} max={thisMonth} onChange={(e) => setF({ ...f, period: e.target.value })} className={field} />
        </label>
        <label className={label}>
          Date you paid
          <input type="date" value={f.paidOn} max={today} onChange={(e) => setF({ ...f, paidOn: e.target.value })} className={field} />
        </label>
        <label className={label}>
          Bank reference (optional)
          <input value={f.bankRef} onChange={(e) => setF({ ...f, bankRef: e.target.value })} className={field} />
        </label>
        <label className={label}>
          Bank receipt (photo or PDF)
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-[14px]" />
        </label>
      </div>
      <label className={`${label} mt-3`}>
        Anything we should know (optional)
        <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={500} className={field} />
      </label>
      {msg ? <p className={`mt-3 mb-0 text-[14px] ${msg.ok ? "text-forest-800" : "text-danger"}`}>{msg.text}</p> : null}
      <button type="button" disabled={busy || !f.amount} onClick={() => void send()} className={`${btnPrimary} mt-3`}>
        {busy ? "Sending…" : "Send proof"}
      </button>
    </details>
  );
}

function StatementDownload({ firstMonth, thisMonth }: { firstMonth: string; thisMonth: string }) {
  const [from, setFrom] = useState(firstMonth);
  const [to, setTo] = useState(thisMonth);
  const href = (format: "pdf" | "csv") => `/api/member/statement?from=${from}&to=${to}&format=${format}`;
  return (
    <div className="mt-5 rounded-xl bg-mist/50 p-4">
      <h3 className="m-0 font-sans text-[15px] font-semibold text-forest-800">Download a statement</h3>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className={label}>
          From
          <input type="month" value={from} min={firstMonth} max={to} onChange={(e) => setFrom(e.target.value)} className={field} />
        </label>
        <label className={label}>
          To
          <input type="month" value={to} min={from} max={thisMonth} onChange={(e) => setTo(e.target.value)} className={field} />
        </label>
        <a href={href("pdf")} target="_blank" rel="noopener" className={btnSecondary}>
          <DownloadIcon size={16} /> PDF
        </a>
        <a href={href("csv")} className={textLink}>
          CSV
        </a>
      </div>
    </div>
  );
}

const HOLIDAY_LABEL = { pending: "Waiting for the Treasurer", approved: "Approved", declined: "Not approved" } as const;

function HolidayForm({ thisMonth, holidays }: { thisMonth: string; holidays: ContributionsView["holidays"] }) {
  const [from, setFrom] = useState(thisMonth);
  const [to, setTo] = useState(thisMonth);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const waiting = holidays.some((h) => h.status === "pending");

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/member/holiday", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from, to, reason }) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || "We could not send that.");
      setMsg({ ok: true, text: "Sent. The Treasurer will reply by email." });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "We could not send that." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mt-3 rounded-xl border border-line p-4">
      <summary className="cursor-pointer text-[15px] font-semibold text-forest-800">Ask for a payment holiday</summary>
      <p className="mt-2 mb-3 text-[14px] text-body">
        Going through a hard time? You can ask to pause your contributions for up to 3 months in any 12. If the Treasurer approves, you will
        not be chased for those months.
      </p>
      {holidays.length ? (
        <ul className="mt-0 mb-3 flex list-none flex-col gap-1.5 p-0 text-[14.5px]">
          {holidays.map((h) => (
            <li key={h.id}>
              <strong>{HOLIDAY_LABEL[h.status]}</strong> · {h.months}
              {h.note ? <span className="block text-[13.5px] text-muted">{h.note}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {waiting ? (
        <p className="m-0 text-[14px] text-muted">You have a request waiting. You will hear back by email.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className={label}>
              From
              <input type="month" value={from} min={thisMonth} onChange={(e) => setFrom(e.target.value)} className={field} />
            </label>
            <label className={label}>
              To
              <input type="month" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={field} />
            </label>
          </div>
          <label className={`${label} mt-3`}>
            Why do you need it?
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} className="w-full rounded-xl border border-line bg-white p-3 text-[15px] text-ink" />
          </label>
          {msg ? <p className={`mt-3 mb-0 text-[14px] ${msg.ok ? "text-forest-800" : "text-danger"}`}>{msg.text}</p> : null}
          <button type="button" disabled={busy || reason.trim().length < 5} onClick={() => void send()} className={`${btnPrimary} mt-3`}>
            {busy ? "Sending…" : "Send request"}
          </button>
        </>
      )}
    </details>
  );
}
