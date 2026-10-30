"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { DownloadIcon, FileIcon } from "@/components/ui/Icons";
import { download } from "../lib";
import { Banner, Btn, Card, CardTitle, Pill, Table, Td, Th, cx, inputCls } from "../ui";

type Cur = "NGN" | "GBP" | "USD";
type Line = {
  line: number;
  date: string;
  narration: string;
  transactionRef: string;
  amount: number;
  lineKey: string;
  recordedAs?: string;
  suggestion: null | { memberNo: string; name: string; why: string };
};
type Recent = { receiptNo: string; memberNo: string; amount: string; period: string; paidAt: string; bankRef: string; source: string; emailed: boolean };

const SAMPLE = `Date,Narration,Reference,Debit,Credit,Balance
30/10/2026,TRF FROM ADAEZE OKAFOR HBC-EDO-26-00008 CONTRIBUTION,UBA2610300001,,5000.00,105000.00
30/10/2026,NIP TRANSFER HBC EDO 26 00002,UBA2610300002,,10000.00,115000.00
30/10/2026,SMS ALERT CHARGES,,25.00,,114975.00
`;

const ACCOUNTS: [Cur, string][] = [
  ["NGN", "Naira (UBA)"],
  ["GBP", "Pound sterling domiciliary"],
  ["USD", "US dollar domiciliary"],
];

const fmt = (n: number, c: Cur) => `${{ NGN: "₦", GBP: "£", USD: "$" }[c]}${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;

/**
 * Brief Phase 3: "Record contributions by member number (bank statement import, matched on
 * reference); issue receipt HBC-CR-YYMM-NNNNN". Saved to the database; each recorded contribution
 * issues its receipt and emails it to the member.
 */
export function LiveContributionsCard() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [currency, setCurrency] = useState<Cur>("NGN");
  const [lines, setLines] = useState<Line[] | null>(null);
  const [lineCurrency, setLineCurrency] = useState<Cur>("NGN");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState<number | null>(null);
  const [members, setMembers] = useState<{ memberNo: string; name: string }[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const [manual, setManual] = useState({ memberNo: "", amount: "", currency: "NGN" as Cur, date: today, bankRef: "", period: "" });

  const load = useCallback(() => {
    fetch("/api/admin/contributions")
      .then((r) => r.json())
      .then((d: { ok?: boolean; members?: typeof members; recent?: Recent[]; error?: string }) => {
        if (!d.ok) return setErr(d.error || "Could not load contributions.");
        setMembers(d.members ?? []);
        setRecent(d.recent ?? []);
      })
      .catch(() => setErr("Could not reach the server."));
  }, []);
  useEffect(load, [load]);

  async function read(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr("");
    setLines(null);
    try {
      const res = await fetch("/api/admin/contributions/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: await file.text(), currency }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; lines?: Line[] };
      if (!res.ok || !d.ok) throw new Error(d.error || `Could not read the statement (error ${res.status}).`);
      setLines(d.lines ?? []);
      setLineCurrency(currency);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read the statement.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function record(body: Record<string, unknown>): Promise<string | null> {
    const res = await fetch("/api/admin/contributions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; receiptNo?: string; emailed?: boolean };
    if (!res.ok || !d.ok) throw new Error(d.error || `Could not record (error ${res.status}).`);
    toast(`Recorded. Receipt ${d.receiptNo} ${d.emailed ? "emailed to the member" : "issued — the email did not go, see the audit log"}.`, d.emailed ? undefined : "warn");
    load();
    return d.receiptNo ?? null;
  }

  async function confirm(l: Line) {
    if (!l.suggestion) return;
    setConfirming(l.line);
    try {
      const receiptNo = await record({
        memberNo: l.suggestion.memberNo,
        amount: l.amount,
        currency: lineCurrency,
        date: l.date,
        bankRef: l.transactionRef,
        source: "statement",
        lineKey: l.lineKey,
      });
      setLines((cur) => cur?.map((x) => (x.line === l.line ? { ...x, recordedAs: receiptNo ?? "Recorded" } : x)) ?? null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not record.", "warn");
    } finally {
      setConfirming(null);
    }
  }

  async function saveManual() {
    setBusy(true);
    setErr("");
    try {
      await record({ ...manual, amount: Number(manual.amount), source: "manual", period: manual.period || undefined });
      setManual((m) => ({ ...m, memberNo: "", amount: "", bankRef: "", period: "" }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not record.");
    } finally {
      setBusy(false);
    }
  }

  const matched = lines?.filter((l) => l.suggestion && !l.recordedAs).length ?? 0;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <CardTitle id="live-contributions" aside={<Pill tone="green">Live</Pill>}>
        Record contributions
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        Upload a statement from one of the cooperative&rsquo;s accounts. Payments are matched to members by the membership number quoted in the
        narration. <strong>Confirm</strong> records the contribution, issues receipt <code>HBC-CR-…</code> and emails it to the member. The same
        bank line can never be recorded twice.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          Account
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Cur)} className={cx(inputCls, "min-w-[230px]")}>
            {ACCOUNTS.map(([c, label]) => (
              <option key={c} value={c}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void read(e.target.files?.[0])} />
        <Btn variant="primary" disabled={busy} onClick={() => fileRef.current?.click()}>
          <FileIcon size={17} /> {busy ? "Reading…" : "Upload statement (CSV)"}
        </Btn>
        <Btn onClick={() => download("homebridge-contributions-sample.csv", SAMPLE)}>
          <DownloadIcon size={17} /> Sample statement
        </Btn>
      </div>
      {err ? <Banner tone="danger">{err}</Banner> : null}

      {lines ? (
        lines.length === 0 ? (
          <Banner tone="info">No payments in were found in that statement.</Banner>
        ) : (
          <>
            <p className="m-0 text-[13.5px] text-muted">
              {lines.length} payment{lines.length === 1 ? "" : "s"} in · {matched} ready to confirm · {lines.filter((l) => l.recordedAs).length} already
              recorded
            </p>
            <Table minWidth={820}>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Narration</Th>
                  <Th>Amount</Th>
                  <Th>Member</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.line}>
                    <Td>{l.date}</Td>
                    <Td>
                      <span className="block max-w-[300px] break-words">{l.narration}</span>
                    </Td>
                    <Td>{fmt(l.amount, lineCurrency)}</Td>
                    <Td>
                      {l.suggestion ? (
                        <span className="block">
                          <strong>{l.suggestion.name}</strong> · {l.suggestion.memberNo}
                          <span className={cx("block text-[12.5px]", l.suggestion.why.startsWith("name") ? "font-semibold text-danger" : "text-muted")}>
                            Matched on {l.suggestion.why}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted">No member number found — record it by hand below if it is a contribution</span>
                      )}
                    </Td>
                    <Td>
                      {l.recordedAs ? (
                        <Pill tone="green">{l.recordedAs}</Pill>
                      ) : l.suggestion ? (
                        <Btn size="sm" variant="primary" disabled={confirming !== null} onClick={() => void confirm(l)}>
                          {confirming === l.line ? "Recording…" : "Confirm"}
                        </Btn>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )
      ) : null}

      <details className="rounded-[14px] border border-line p-4">
        <summary className="cursor-pointer text-[14.5px] font-semibold text-forest-800">Record a contribution by hand</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            Member
            <select value={manual.memberNo} onChange={(e) => setManual({ ...manual, memberNo: e.target.value })} className={inputCls}>
              <option value="">Choose a member…</option>
              {members.map((m) => (
                <option key={m.memberNo} value={m.memberNo}>
                  {m.memberNo} · {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            Amount
            <input value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            Currency
            <select value={manual.currency} onChange={(e) => setManual({ ...manual, currency: e.target.value as Cur })} className={inputCls}>
              {ACCOUNTS.map(([c, label]) => (
                <option key={c} value={c}>
                  {c} · {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            Date received
            <input type="date" max={today} value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            Bank reference
            <input value={manual.bankRef} onChange={(e) => setManual({ ...manual, bankRef: e.target.value })} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            Counts for month (optional)
            <input type="month" value={manual.period} onChange={(e) => setManual({ ...manual, period: e.target.value })} className={inputCls} />
          </label>
        </div>
        <div className="mt-3">
          <Btn variant="primary" disabled={busy || !manual.memberNo || !manual.amount} onClick={() => void saveManual()}>
            Record contribution
          </Btn>
        </div>
      </details>

      <div className="flex flex-col gap-2">
        <h3 className="m-0 text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Recently recorded</h3>
        {recent.length === 0 ? (
          <p className="m-0 text-[14px] text-muted">No contributions recorded yet.</p>
        ) : (
          <Table minWidth={760}>
            <thead>
              <tr>
                <Th>Receipt</Th>
                <Th>Member</Th>
                <Th>Amount</Th>
                <Th>For</Th>
                <Th>Received</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.receiptNo}>
                  <Td>
                    <span className="font-mono text-[13px]">{c.receiptNo}</span>
                  </Td>
                  <Td>{c.memberNo}</Td>
                  <Td>{c.amount}</Td>
                  <Td>{c.period}</Td>
                  <Td>{c.paidAt}</Td>
                  <Td>
                    <a
                      href={`/api/admin/contributions/${encodeURIComponent(c.receiptNo)}`}
                      target="_blank"
                      rel="noopener"
                      className="text-[13px] font-semibold text-forest-800 underline underline-offset-[3px]"
                    >
                      Receipt PDF
                    </a>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </Card>
  );
}
