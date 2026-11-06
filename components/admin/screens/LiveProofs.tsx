"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { notifyPayChange } from "../lib";
import { Banner, Btn, Card, CardTitle, Pill, Table, Td, Th, inputCls } from "../ui";

type Proof = {
  id: string;
  memberNo: string;
  name: string;
  amount: string;
  period: string;
  paidOn: string;
  bankRef: string;
  note: string;
  documentId: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  daysWaiting: number;
  decidedBy: string;
  decidedAt: string;
  reason: string;
  receiptNo: string;
};

/**
 * Member Platform brief §6: "Verification queue (Treasurer only): pending proofs … approve or reject
 * in one tap." Approve records the contribution and emails the receipt; Reject emails the member
 * the reason (Email L). Check each proof against the bank statement before approving.
 */
export function ProofsCard() {
  const toast = useToast();
  const [pending, setPending] = useState<Proof[] | null>(null);
  const [decided, setDecided] = useState<Proof[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/proofs")
      .then((r) => r.json())
      .then((d: { ok?: boolean; pending?: Proof[]; decided?: Proof[]; error?: string }) => {
        if (!d.ok) return setErr(d.error || "Could not load the proofs.");
        setPending(d.pending ?? []);
        setDecided(d.decided ?? []);
      })
      .catch(() => setErr("Could not reach the server."));
  }, []);
  useEffect(load, [load]);

  async function open(p: Proof) {
    try {
      const res = await fetch(`/api/admin/documents/${encodeURIComponent(p.documentId)}/link`, { method: "POST" });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !d.ok || !d.url) throw new Error(d.error || "Could not open the file.");
      window.open(d.url, "_blank", "noopener");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not open the file.", "warn");
    }
  }

  async function decide(p: Proof, action: "approve" | "reject") {
    setBusy(p.id);
    try {
      const res = await fetch(`/api/admin/proofs/${encodeURIComponent(p.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject" ? { action, reason } : { action }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; receiptNo?: string; emailed?: boolean };
      if (!res.ok || !d.ok) throw new Error(d.error || `That did not work (error ${res.status}).`);
      toast(
        action === "approve"
          ? `Approved. Receipt ${d.receiptNo} ${d.emailed ? "emailed to the member" : "issued — the email did not go"}.`
          : `Rejected.${d.emailed ? " The member has been emailed the reason." : " The email did not go."}`,
        d.emailed ? undefined : "warn",
      );
      setRejecting(null);
      setReason("");
      load();
      notifyPayChange();
    } catch (e) {
      toast(e instanceof Error ? e.message : "That did not work.", "warn");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle id="proofs" aside={pending ? <Pill tone={pending.length ? "warm" : "green"}>{pending.length ? `${pending.length} waiting` : "None waiting"}</Pill> : null}>
        Proofs of payment to check
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        When a member pays by transfer, they can upload their bank receipt from their account. Press <strong>View receipt</strong>, check the
        money really is in the bank, then press <strong>Approve</strong>: the payment is recorded and the member is emailed their receipt. If
        something is wrong, press <strong>Reject</strong> and say why; the member is emailed the reason.
      </p>
      {err ? <Banner tone="danger">{err}</Banner> : null}
      {pending && pending.length === 0 ? <p className="m-0 text-[14px] text-muted">Nothing waiting. New proofs from members appear here.</p> : null}
      {pending && pending.length > 0 ? (
        <Table minWidth={860}>
          <thead>
            <tr>
              <Th>Member</Th>
              <Th>Amount</Th>
              <Th>For</Th>
              <Th>Paid on</Th>
              <Th>Sent</Th>
              <Th>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {pending.map((p) => (
              <tr key={p.id}>
                <Td>
                  <strong>{p.name}</strong>
                  <span className="block font-mono text-[12.5px] text-muted">{p.memberNo}</span>
                </Td>
                <Td>
                  {p.amount}
                  {p.bankRef ? <span className="block text-[12.5px] text-muted">Ref {p.bankRef}</span> : null}
                  {p.note ? <span className="block max-w-[220px] text-[12.5px] text-muted">“{p.note}”</span> : null}
                </Td>
                <Td>{p.period}</Td>
                <Td>{p.paidOn}</Td>
                <Td>
                  {p.submittedAt}
                  {p.daysWaiting >= 5 ? <span className="block text-[12.5px] font-semibold text-danger">Waiting {p.daysWaiting} days</span> : null}
                </Td>
                <Td>
                  <div className="flex flex-col items-start gap-1.5">
                    <Btn size="sm" onClick={() => void open(p)}>
                      View receipt
                    </Btn>
                    <div className="flex gap-1.5">
                      <Btn size="sm" variant="primary" disabled={busy !== null} onClick={() => void decide(p, "approve")}>
                        {busy === p.id ? "Saving…" : "Approve"}
                      </Btn>
                      <Btn size="sm" disabled={busy !== null} onClick={() => setRejecting(rejecting === p.id ? null : p.id)}>
                        Reject
                      </Btn>
                    </div>
                    {rejecting === p.id ? (
                      <div className="flex w-full flex-col gap-1.5">
                        <input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Why? The member sees this."
                          className={inputCls}
                          aria-label="Reason for rejecting"
                        />
                        <Btn size="sm" variant="primary" disabled={busy !== null || !reason.trim()} onClick={() => void decide(p, "reject")}>
                          Send rejection
                        </Btn>
                      </div>
                    ) : null}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}

      {decided.length ? (
        <details className="rounded-[14px] border border-line p-4">
          <summary className="cursor-pointer text-[14.5px] font-semibold text-forest-800">Recently decided</summary>
          <ul className="mt-3 mb-0 flex list-none flex-col gap-2 p-0 text-[14px]">
            {decided.map((p) => (
              <li key={p.id}>
                <Pill tone={p.status === "approved" ? "green" : "grey"}>{p.status === "approved" ? "Approved" : "Rejected"}</Pill>{" "}
                {p.name} ({p.memberNo}) · {p.amount} for {p.period} · {p.decidedAt} by {p.decidedBy}
                {p.receiptNo ? ` · ${p.receiptNo}` : ""}
                {p.reason ? ` · “${p.reason}”` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
