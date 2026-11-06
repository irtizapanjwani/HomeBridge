"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { notifyPayChange } from "../lib";
import { Banner, Btn, Card, CardTitle, Pill, Table, Td, Th, inputCls } from "../ui";

type Holiday = {
  id: string;
  memberNo: string;
  name: string;
  months: string;
  count: number;
  reason: string;
  status: "pending" | "approved" | "declined";
  submittedAt: string;
  decidedAt: string;
  decidedBy: string;
  note: string;
};

/**
 * Member Platform brief §6: "Payment holiday requests: approve or decline, with start and end
 * month." Approved months get no reminders, no overdue notice and are not counted as missed.
 */
export function HolidaysCard() {
  const toast = useToast();
  const [pending, setPending] = useState<Holiday[] | null>(null);
  const [decided, setDecided] = useState<Holiday[]>([]);
  const [err, setErr] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/holidays")
      .then((r) => r.json())
      .then((d: { ok?: boolean; pending?: Holiday[]; decided?: Holiday[]; error?: string }) => {
        if (!d.ok) return setErr(d.error || "Could not load the requests.");
        setPending(d.pending ?? []);
        setDecided(d.decided ?? []);
      })
      .catch(() => setErr("Could not reach the server."));
  }, []);
  useEffect(load, [load]);

  async function decide(h: Holiday, approve: boolean) {
    setBusy(h.id);
    try {
      const res = await fetch(`/api/admin/holidays/${h.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve, note: note[h.id] ?? "" }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; emailed?: boolean };
      if (!res.ok || !d.ok) throw new Error(d.error || "That did not work.");
      toast(`${approve ? "Approved" : "Declined"}.${d.emailed ? " The member has been emailed." : " The email did not go."}`, d.emailed ? undefined : "warn");
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
      <CardTitle id="holidays" aside={pending ? <Pill tone={pending.length ? "warm" : "green"}>{pending.length ? `${pending.length} waiting` : "None waiting"}</Pill> : null}>
        Payment holiday requests
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        A member can ask to pause their payments for up to 3 months in a year. If you <strong>Approve</strong>, they get no reminders for
        those months and are not counted as behind. To <strong>Decline</strong>, write a short reason in the box first. The member is emailed
        your answer either way.
      </p>
      {err ? <Banner tone="danger">{err}</Banner> : null}
      {pending && pending.length === 0 ? <p className="m-0 text-[14px] text-muted">Nothing waiting. New requests from members appear here.</p> : null}
      {pending && pending.length > 0 ? (
        <Table minWidth={760}>
          <thead>
            <tr>
              <Th>Member</Th>
              <Th>Months</Th>
              <Th>Reason</Th>
              <Th>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {pending.map((h) => (
              <tr key={h.id}>
                <Td>
                  <strong>{h.name}</strong>
                  <span className="block font-mono text-[12.5px] text-muted">{h.memberNo}</span>
                  <span className="block text-[12.5px] text-muted">Asked {h.submittedAt}</span>
                </Td>
                <Td>
                  {h.months}
                  <span className="block text-[12.5px] text-muted">
                    {h.count} month{h.count === 1 ? "" : "s"}
                  </span>
                </Td>
                <Td>
                  <span className="block max-w-[280px] whitespace-pre-line">{h.reason}</span>
                </Td>
                <Td>
                  <div className="flex flex-col gap-1.5">
                    <input
                      value={note[h.id] ?? ""}
                      onChange={(e) => setNote({ ...note, [h.id]: e.target.value })}
                      placeholder="Message to the member (needed to decline)"
                      className={inputCls}
                      aria-label="Note to the member"
                    />
                    <div className="flex gap-1.5">
                      <Btn size="sm" variant="primary" disabled={busy !== null} onClick={() => void decide(h, true)}>
                        Approve
                      </Btn>
                      <Btn size="sm" disabled={busy !== null || !(note[h.id] ?? "").trim()} onClick={() => void decide(h, false)}>
                        Decline
                      </Btn>
                    </div>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
      {decided.length ? (
        <details className="rounded-[14px] border border-line p-4">
          <summary className="cursor-pointer text-[14.5px] font-semibold text-forest-800">Recently answered</summary>
          <ul className="mt-3 mb-0 flex list-none flex-col gap-2 p-0 text-[14px]">
            {decided.map((h) => (
              <li key={h.id}>
                <Pill tone={h.status === "approved" ? "green" : "grey"}>{h.status === "approved" ? "Approved" : "Declined"}</Pill> {h.name} ({h.memberNo}) ·{" "}
                {h.months} · {h.decidedAt} by {h.decidedBy}
                {h.note ? ` · “${h.note}”` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
