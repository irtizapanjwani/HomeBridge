"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { DownloadIcon, FileIcon } from "@/components/ui/Icons";
import { download, naira } from "../lib";
import { Banner, Btn, Card, CardTitle, Pill, Table, Td, Th } from "../ui";

type Line = {
  line: number;
  date: string;
  narration: string;
  transactionRef: string;
  amount: number;
  suggestion: null | { reference: string; name: string; why: string[]; expectedAmount: number; amountMatches: boolean };
};

/** The layout the matcher reads. Real exports with extra columns or a few header lines work too. */
const SAMPLE = `Date,Narration,Reference,Debit,Credit,Balance
29/10/2026,TRF FROM ADAEZE OKAFOR HBA-2610-0004 HOMEBRIDGE FEE,FBN2610290012,,10000.00,250000.00
29/10/2026,NIP TRANSFER CHIDI OKAFOR,FBN2610290013,,10000.00,260000.00
29/10/2026,BANK CHARGES,,52.50,,259947.50
`;

/**
 * Brief p.3-4: "admin uploads a statement CSV and the system suggests matches for one-click
 * confirmation". Each Confirm goes through the same fee confirmation as the application screen, so
 * it issues the VKT receipt, emails it, logs it, and may send the welcome pack if that is automatic.
 */
export function StatementMatchCard() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<Record<number, string>>({});
  const [confirming, setConfirming] = useState<number | null>(null);

  async function read(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr("");
    setLines(null);
    setDone({});
    try {
      const res = await fetch("/api/admin/fees/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: await file.text() }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; lines?: Line[]; skippedDebits?: number };
      if (!res.ok || !d.ok) throw new Error(d.error || `Could not read the statement (error ${res.status}).`);
      setLines(d.lines ?? []);
      setSkipped(d.skippedDebits ?? 0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read the statement.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirm(l: Line) {
    if (!l.suggestion) return;
    setConfirming(l.line);
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(l.suggestion.reference)}/fee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionRef: l.transactionRef }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; receiptNo?: string; welcomeSent?: boolean | null };
      if (!res.ok || !d.ok) throw new Error(d.error || `Could not confirm (error ${res.status}).`);
      setDone((cur) => ({ ...cur, [l.line]: d.receiptNo ?? "Confirmed" }));
      toast(`Fee confirmed for ${l.suggestion.name}. Receipt ${d.receiptNo} issued.${d.welcomeSent ? " Welcome pack sent." : ""}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not confirm.", "warn");
    } finally {
      setConfirming(null);
    }
  }

  const matched = lines?.filter((l) => l.suggestion).length ?? 0;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle id="statement-match" aside={lines ? <Pill tone={matched ? "green" : "grey"}>{`${matched} of ${lines.length} matched`}</Pill> : null}>
        Match a bank statement
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        Export the VEKAT First Bank statement as CSV and upload it. Each payment in is matched to an applicant by their application reference,
        the payment reference they gave, or their name and the fee amount. Nothing is confirmed until you click <em>Confirm</em>.
      </p>
      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void read(e.target.files?.[0])} />
        <Btn variant="primary" disabled={busy} onClick={() => fileRef.current?.click()}>
          <FileIcon size={17} /> {busy ? "Reading…" : "Upload statement (CSV)"}
        </Btn>
        <Btn onClick={() => download("homebridge-statement-sample.csv", SAMPLE)}>
          <DownloadIcon size={17} /> Sample statement
        </Btn>
      </div>
      {err ? <Banner tone="danger">{err}</Banner> : null}

      {lines ? (
        lines.length === 0 ? (
          <Banner tone="info">No payments in were found in that statement{skipped ? ` (${skipped} debit lines skipped)` : ""}.</Banner>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Narration</Th>
                <Th>Amount</Th>
                <Th>Suggested applicant</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.line}>
                  <Td>{l.date}</Td>
                  <Td>
                    <span className="block max-w-[320px] break-words">{l.narration}</span>
                  </Td>
                  <Td>{naira(l.amount)}</Td>
                  <Td>
                    {l.suggestion ? (
                      <span className="block">
                        <strong>{l.suggestion.name}</strong> · {l.suggestion.reference}
                        <span className="block text-[12.5px] text-muted">Matched on {l.suggestion.why.join(" and ")}</span>
                        {!l.suggestion.amountMatches ? (
                          <span className="block text-[12.5px] font-semibold text-danger">
                            Amount differs from the fee ({naira(l.suggestion.expectedAmount)}) — check before confirming
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-muted">No match — confirm by hand on the application if it is a joining fee</span>
                    )}
                  </Td>
                  <Td>
                    {done[l.line] ? (
                      <Pill tone="green">{`Receipt ${done[l.line]}`}</Pill>
                    ) : l.suggestion ? (
                      <Btn size="sm" variant="primary" disabled={confirming !== null} onClick={() => void confirm(l)}>
                        {confirming === l.line ? "Confirming…" : "Confirm"}
                      </Btn>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )
      ) : null}
    </Card>
  );
}
