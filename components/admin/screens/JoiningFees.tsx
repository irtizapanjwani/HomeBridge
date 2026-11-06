"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { DownloadIcon } from "@/components/ui/Icons";
import { download, toCsv, toXls } from "../lib";
import { Banner, Btn, Card, Empty, Field, PageHeader, Pill, StatTile, Table, Td, Th, inputCls } from "../ui";
import { StatementMatchCard } from "./StatementMatch";

type FeeRow = {
  reference: string;
  memberNo: string;
  name: string;
  email: string;
  form: string;
  amount: string;
  currency: "NGN" | "GBP";
  value: number;
  method: string;
  paidOn: string;
  receiptNo: string;
  confirmedOn: string;
  confirmedBy: string;
  status: "Confirmed" | "Payment reported" | "Not paid yet";
};
type Ledger = { rows: FeeRow[]; totals: { confirmed: number; ngn: number; gbp: number; reported: number; unpaid: number } };

const TONE = { Confirmed: "green", "Payment reported": "warm", "Not paid yet": "grey" } as const;

/**
 * The one-off joining fee (₦10,000 or £10) paid to VEKAT Group Ltd. Everything on this screen is
 * read from the live member records: the statement matcher at the top, then every fee owed or paid.
 */
export function JoiningFeesScreen() {
  const toast = useToast();
  const [data, setData] = useState<Ledger | null>(null);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr("");
    fetch("/api/admin/fees/ledger", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Ledger & { ok?: boolean; error?: string }) => (d.ok ? setData(d) : setErr(d.error || "Could not load the joining fees.")))
      .catch(() => setErr("Could not reach the server."));
  }, []);
  useEffect(load, [load]);

  const needle = q.trim().toLowerCase();
  const rows = (data?.rows ?? [])
    .filter((r) => status === "all" || r.status === status)
    .filter((r) => !needle || [r.name, r.reference, r.memberNo, r.email, r.receiptNo].some((v) => v.toLowerCase().includes(needle)));

  function exportFees(kind: "csv" | "xls") {
    if (!data) return;
    const columns = ["Application ref", "Member no.", "Name", "Email", "Form", "Amount", "Method", "Paid on (as reported)", "Receipt", "Confirmed on", "Confirmed by", "Status"];
    const body = data.rows.map((r) => [r.reference, r.memberNo, r.name, r.email, r.form, r.amount, r.method, r.paidOn, r.receiptNo, r.confirmedOn, r.confirmedBy, r.status]);
    const date = new Date().toISOString().slice(0, 10);
    if (kind === "csv") download(`homebridge-joining-fees-${date}.csv`, toCsv(columns, body));
    else download(`homebridge-joining-fees-${date}.xls`, toXls(columns, body), "application/vnd.ms-excel");
  }

  async function confirm(r: FeeRow) {
    if (!window.confirm(`Confirm that ${r.name} has paid the ${r.amount} joining fee?\n\nA receipt is issued and emailed to them straight away.`)) return;
    setBusy(r.reference);
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(r.reference)}/fee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; receiptNo?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || `That did not work (error ${res.status}).`);
      toast(`Fee confirmed${d.receiptNo ? `: receipt ${d.receiptNo}` : ""}, emailed to ${r.name}.`);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "That did not work.", "warn");
    } finally {
      setBusy(null);
    }
  }

  const t = data?.totals;
  const received = t ? [t.ngn ? `₦${t.ngn.toLocaleString("en-GB")}` : "", t.gbp ? `£${t.gbp.toFixed(2)}` : ""].filter(Boolean).join(" + ") || "₦0" : "…";

  return (
    <>
      <PageHeader
        title="Joining fees (VEKAT)"
        subtitle="Paid to VEKAT Group Ltd · not share capital · never refunded (6.3, 12.4)"
        live
        actions={
          <>
            <Btn disabled={!data} onClick={() => exportFees("xls")}>
              <DownloadIcon size={17} /> Excel
            </Btn>
            <Btn variant="primary" disabled={!data} onClick={() => exportFees("csv")}>
              <DownloadIcon size={17} /> Export (CSV)
            </Btn>
          </>
        }
      />

      <StatementMatchCard />

      <Banner tone="info" title="Two payees, never mixed.">
        The one-off joining fee (₦10,000 or £10) is VEKAT&rsquo;s charge for registration, ID checks and onboarding. It is paid to VEKAT Group Ltd, never into
        the cooperative&rsquo;s accounts, never counted as shares and never refunded.
      </Banner>

      {err ? <Banner tone="danger">{err}</Banner> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Fees confirmed" value={t ? t.confirmed : "…"} sub="Receipt issued and emailed" />
        <StatTile label="Received" value={received} sub="From confirmed fees" />
        <StatTile tone="warm" label="Reported, to check" value={t ? t.reported : "…"} sub="Applicant says they paid; match it to the bank" />
        <StatTile label="Not paid yet" value={t ? t.unpaid : "…"} sub="Approved members still owing the fee" />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Show" className="w-56">
            <select id="fees-status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="all">Everyone</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Payment reported">Reported, to check</option>
              <option value="Not paid yet">Not paid yet</option>
            </select>
          </Field>
          <Field label="Search" className="min-w-[220px] flex-1">
            <input id="fees-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, HBA-, HBC- or receipt number" className={inputCls} />
          </Field>
        </div>
        <div className="mt-5">
          {!data ? (
            <p className="m-0 text-[14px] text-muted">Loading…</p>
          ) : rows.length === 0 ? (
            <Empty title={data.rows.length ? "Nobody matches these filters." : "No joining fees yet. Approved members appear here."} />
          ) : (
            <Table minWidth={900} label="Joining fees">
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Amount</Th>
                  <Th>Paid</Th>
                  <Th>Receipt</Th>
                  <Th>Status</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.reference}>
                    <Td>
                      <strong className="block">{r.name}</strong>
                      <span className="block font-mono text-[12px] text-muted">{[r.memberNo, r.reference].filter(Boolean).join(" · ")}</span>
                      <span className="block text-[12px] text-muted">{r.form}</span>
                    </Td>
                    <Td>{r.amount}</Td>
                    <Td>
                      {r.paidOn || <span className="text-muted">—</span>}
                      <span className="block text-[12px] text-muted">{r.method}</span>
                    </Td>
                    <Td>
                      {r.receiptNo ? (
                        <>
                          <span className="font-mono text-[12.5px]">{r.receiptNo}</span>
                          <span className="block text-[12px] text-muted">
                            {r.confirmedOn}
                            {r.confirmedBy ? ` · ${r.confirmedBy}` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                    <Td>
                      <Pill tone={TONE[r.status]}>{r.status === "Payment reported" ? "Reported" : r.status}</Pill>
                    </Td>
                    <Td>
                      {r.receiptNo ? (
                        <a
                          href={`/api/admin/applications/${encodeURIComponent(r.reference)}/fee-receipt`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] font-semibold text-forest-800 underline underline-offset-[3px]"
                        >
                          Receipt PDF
                        </a>
                      ) : r.memberNo ? (
                        <Btn size="sm" disabled={busy !== null} onClick={() => void confirm(r)}>
                          {busy === r.reference ? "Confirming…" : "Confirm fee received"}
                        </Btn>
                      ) : (
                        <span className="text-[12px] text-muted">Approve first</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Card>
    </>
  );
}
