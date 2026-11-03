"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Banner, Btn, Card, CardTitle, Pill, Table, Td, Th, inputCls } from "../ui";

type Cur = "NGN" | "GBP" | "USD";
type Account = {
  currency: Cur;
  recordedTotal: number;
  recordedLabel: string;
  recordedCount: number;
  uploadedTotal: number;
  signOff: null | { bankTotal: string; recordedTotal: string; difference: string; differenceValue: number; note: string; by: string; at: string };
};
type Unmatched = { lineKey: string; currency: Cur; date: string; narration: string; amount: string; daysOld: number };
type OldProof = { memberNo: string; name: string; amount: string; period: string; daysOld: number };
type Data = { label: string; accounts: Account[]; unmatched: Unmatched[]; proofs: OldProof[] };

const ACCOUNT_LABEL: Record<Cur, string> = { NGN: "Naira (UBA)", GBP: "Pound sterling domiciliary", USD: "US dollar domiciliary" };
const SYM: Record<Cur, string> = { NGN: "₦", GBP: "£", USD: "$" };

const lastMonth = () => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
};

/**
 * Member Platform brief §5: "Monthly reconciliation screen: bank balance per account vs total of
 * verified entries, with any difference listed. Unmatched bank lines and unverified proofs older
 * than 5 days are highlighted. Reconciliation is signed off by the Treasurer each month."
 */
export function ReconciliationCard() {
  const toast = useToast();
  const [period, setPeriod] = useState(lastMonth());
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [bank, setBank] = useState<Record<Cur, string>>({ NGN: "", GBP: "", USD: "" });
  const [note, setNote] = useState<Record<Cur, string>>({ NGN: "", GBP: "", USD: "" });
  const [busy, setBusy] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    setErr("");
    fetch(`/api/admin/reconciliation?period=${period}`)
      .then((r) => r.json())
      .then((d: Data & { ok?: boolean; error?: string }) => {
        if (!d.ok) return setErr(d.error || "Could not load the reconciliation.");
        setData(d);
        // Start each box at what the uploaded statements showed for the month.
        setBank(Object.fromEntries(d.accounts.map((a) => [a.currency, a.uploadedTotal ? String(a.uploadedTotal) : ""])) as Record<Cur, string>);
      })
      .catch(() => setErr("Could not reach the server."));
  }, [period]);
  useEffect(load, [load]);

  async function post(body: Record<string, unknown>, done: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/reconciliation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || `That did not work (error ${res.status}).`);
      toast(done);
      setDismissing(null);
      setReason("");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "That did not work.", "warn");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle id="reconciliation" aside={data ? <Pill tone={data.accounts.every((a) => a.signOff) ? "green" : "warm"}>{data.accounts.filter((a) => a.signOff).length} of 3 signed off</Pill> : null}>
        Monthly reconciliation
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        For each account, enter the <strong>total money in</strong> for the month from the bank statement. The difference against the
        contributions recorded as received that month is shown, and the Treasurer signs it off. Bank lines uploaded but never recorded, and
        proofs waiting more than 5 days, are listed below.
      </p>
      <label className="flex w-fit flex-col gap-1 text-[13px] font-semibold text-muted">
        Month
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={inputCls} />
      </label>
      {err ? <Banner tone="danger">{err}</Banner> : null}

      {data ? (
        <>
          <Table minWidth={860}>
            <thead>
              <tr>
                <Th>Account</Th>
                <Th>Recorded</Th>
                <Th>Bank money in</Th>
                <Th>Difference</Th>
                <Th>Sign-off</Th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((a) => {
                const entered = Number(bank[a.currency]);
                const diff = bank[a.currency] !== "" && Number.isFinite(entered) ? Math.round((entered - a.recordedTotal) * 100) / 100 : null;
                return (
                  <tr key={a.currency}>
                    <Td>{ACCOUNT_LABEL[a.currency]}</Td>
                    <Td>
                      {a.recordedLabel}
                      <span className="block text-[12.5px] text-muted">
                        {a.recordedCount} payment{a.recordedCount === 1 ? "" : "s"}
                      </span>
                    </Td>
                    <Td>
                      <input
                        value={bank[a.currency]}
                        onChange={(e) => setBank({ ...bank, [a.currency]: e.target.value.replace(/[^\d.]/g, "") })}
                        inputMode="decimal"
                        placeholder={`${SYM[a.currency]}0`}
                        className={inputCls}
                        aria-label={`Bank money in, ${ACCOUNT_LABEL[a.currency]}`}
                      />
                    </Td>
                    <Td>
                      {diff === null ? (
                        "—"
                      ) : (
                        <span className={diff === 0 ? "font-semibold text-forest-800" : "font-semibold text-danger"}>
                          {diff === 0 ? "Balances" : `${diff > 0 ? "+" : "−"}${SYM[a.currency]}${Math.abs(diff).toLocaleString("en-GB")}`}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {a.signOff ? (
                        <span className="block text-[13px]">
                          <Pill tone={a.signOff.differenceValue === 0 ? "green" : "warm"}>Signed off</Pill>
                          <span className="mt-1 block text-muted">
                            {a.signOff.by}, {a.signOff.at} · bank {a.signOff.bankTotal}, difference {a.signOff.difference}
                            {a.signOff.note ? ` · “${a.signOff.note}”` : ""}
                          </span>
                        </span>
                      ) : null}
                      <div className="mt-1 flex flex-col gap-1">
                        <input
                          value={note[a.currency]}
                          onChange={(e) => setNote({ ...note, [a.currency]: e.target.value })}
                          placeholder={diff ? "Explain the difference" : "Note (optional)"}
                          className={inputCls}
                          aria-label={`Sign-off note, ${ACCOUNT_LABEL[a.currency]}`}
                        />
                        <Btn
                          size="sm"
                          variant="primary"
                          disabled={busy || diff === null || (diff !== 0 && !note[a.currency].trim())}
                          onClick={() =>
                            void post(
                              { action: "signoff", period, currency: a.currency, bankTotal: entered, note: note[a.currency] },
                              `${ACCOUNT_LABEL[a.currency]} signed off for ${data.label}.`,
                            )
                          }
                        >
                          {a.signOff ? "Sign off again" : "Sign off"}
                        </Btn>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          <h3 className="m-0 mt-2 text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Bank lines not recorded ({data.unmatched.length})</h3>
          {data.unmatched.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">Every uploaded payment in has been recorded or explained.</p>
          ) : (
            <Table minWidth={760}>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Narration</Th>
                  <Th>Amount</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {data.unmatched.map((l) => (
                  <tr key={l.lineKey}>
                    <Td>
                      {l.date}
                      {l.daysOld > 5 ? <span className="block text-[12.5px] font-semibold text-danger">Unmatched {l.daysOld} days</span> : null}
                    </Td>
                    <Td>
                      <span className="block max-w-[320px] break-words">{l.narration}</span>
                    </Td>
                    <Td>{l.amount}</Td>
                    <Td>
                      {dismissing === l.lineKey ? (
                        <div className="flex flex-col gap-1">
                          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What is it? e.g. bank interest" className={inputCls} aria-label="What the payment is" />
                          <Btn size="sm" variant="primary" disabled={busy || !reason.trim()} onClick={() => void post({ action: "dismiss", lineKey: l.lineKey, reason }, "Marked as not a contribution.")}>
                            Save
                          </Btn>
                        </div>
                      ) : (
                        <Btn size="sm" onClick={() => setDismissing(l.lineKey)}>
                          Not a contribution
                        </Btn>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <p className="m-0 text-[13px] text-muted">To record one of these as a contribution, upload the statement again in Record contributions, or use Record a contribution by hand.</p>

          <h3 className="m-0 mt-2 text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Proofs waiting more than 5 days ({data.proofs.length})</h3>
          {data.proofs.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">None.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[14px]">
              {data.proofs.map((p, i) => (
                <li key={`${p.memberNo}-${i}`} className="text-danger">
                  {p.memberNo} · {p.name} · {p.amount} for {p.period} · waiting {p.daysOld} days
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </Card>
  );
}
