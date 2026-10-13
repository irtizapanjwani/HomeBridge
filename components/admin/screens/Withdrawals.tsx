"use client";

import { useState } from "react";
import { TODAY, type Withdrawal } from "@/lib/admin-data";
import { useToast } from "@/components/ui/Toast";
import { addShareTx } from "../actions";
import { useAdmin } from "../store";
import { addMonths, fmtDate, maxIso, naira } from "../lib";
import { Banner, Btn, Card, Empty, Field, KeyVals, PageHeader, Pill, ReadOnly, StatTile, Table, Td, Th, inputCls } from "../ui";

const CHAIR_TREASURER_LIMIT = 20_000_000; // 14.3

export function WithdrawalsScreen() {
  const s = useAdmin();
  const queue = [...s.withdrawals].sort((a, b) => a.noticeDate.localeCompare(b.noticeDate));
  const open = queue.filter((w) => w.status !== "Paid" && w.status !== "Declined");
  const owed = s.withdrawals.flatMap((w) => w.schedule).filter((i) => i.status !== "Paid").reduce((t, i) => t + i.amount, 0);
  const act = s.access("withdrawals") === "act";

  return (
    <>
      <PageHeader title="Withdrawals" subtitle="3 years’ holding + 6 months’ notice · paid in notice order (12.1–12.3)" />
      {!act ? <ReadOnly why={`${s.role.title} can see withdrawal requests. The Board approves them; the Treasurer and Chairman approve payments within the 14.3 limits.`} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Open requests" value={open.length} sub="Paid in order of notice (12.2)" />
        <StatTile label="Scheduled, not yet paid" value={naira(owed)} sub="From the reserve for withdrawals" />
        <StatTile tone="warm" label="Waiting for the Board" value={open.filter((w) => w.status === "Awaiting Board" || w.status === "Notice received").length} sub="Approve, or blocked until eligible" />
      </div>

      {queue.length === 0 ? (
        <Card className="p-5">
          <Empty title="No withdrawal requests.">Members give notice from their dashboard; requests appear here in notice order.</Empty>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {queue.map((w, i) => (
            <Request key={w.id} w={w} position={i + 1} />
          ))}
        </div>
      )}
      <p className="m-0 text-[13px] text-muted">
        Withdrawals are paid at the value in the last audited accounts, never more than the amount paid (12.2). No accounts have been audited yet, so the sample uses the amount paid ({naira(s.settings.sharePrice)} a share). The Board may spread
        payments over up to 12 months (12.3). On a member’s death the value goes to their nominees (10.1) without the 3-year hold.
      </p>
    </>
  );
}

function Request({ w, position }: { w: Withdrawal; position: number }) {
  const s = useAdmin();
  const toast = useToast();
  const [months, setMonths] = useState(String(w.months ?? 6));
  const m = s.member(w.memberNo);
  const first = s.firstShare(w.memberNo);
  const held = s.holdings[w.memberNo] ?? 0;
  const eligible = w.kind === "death" ? w.noticeDate : maxIso(addMonths(first ?? w.noticeDate, 36), addMonths(w.noticeDate, 6));
  const value = w.shares * s.settings.sharePrice;
  const deciding = w.status === "Notice received" || w.status === "Awaiting Board";

  const approveReason = !s.can("board.approve")
    ? "Only the Board approves withdrawals."
    : TODAY < eligible
      ? `Not eligible until ${fmtDate(eligible)}: shares must be held 3 years from the first share (${fmtDate(first)}) and 6 months’ notice given (${fmtDate(w.noticeDate)}) — 12.1.`
      : w.shares > held
        ? `${w.memberNo} holds only ${held} shares.`
        : undefined;

  function approve() {
    const n = Math.min(12, Math.max(1, Number(months) || 1));
    const base = Math.floor(value / n);
    const schedule = Array.from({ length: n }, (_, k) => ({
      due: addMonths(TODAY, k + 1),
      amount: k === n - 1 ? value - base * (n - 1) : base,
      status: "Scheduled" as const,
    }));
    s.setWithdrawals((cur) => cur.map((x) => (x.id === w.id ? { ...x, status: "Approved — paying", months: n, schedule, decidedBy: s.role.person } : x)));
    addShareTx(s, { memberNo: w.memberNo, type: "withdrawal", shares: -w.shares, ngnValue: -value, source: "withdrawal", approvedBy: s.role.person, date: TODAY, note: `${w.id} (${w.kind === "death" ? "10.1" : "12.1"})` });
    s.addLog("Approved withdrawal", w.id, w.status, `Approved — ${w.shares} shares, ${naira(value)} over ${n} month(s)`);
    toast(`${w.id} approved: ${naira(value)} over ${n} month(s). Each payment now needs Treasurer/Chairman approval.`);
  }

  function decline() {
    s.setWithdrawals((cur) => cur.map((x) => (x.id === w.id ? { ...x, status: "Declined", decidedBy: s.role.person } : x)));
    s.addLog("Declined withdrawal", w.id, w.status, "Declined");
    toast(`${w.id} declined.`);
  }

  function setInstalment(k: number, status: "Approved" | "Paid") {
    const sched = w.schedule.map((it, j) => (j === k ? { ...it, status, approvedBy: status === "Approved" ? s.role.person : it.approvedBy } : it));
    const done = sched.every((it) => it.status === "Paid");
    s.setWithdrawals((cur) => cur.map((x) => (x.id === w.id ? { ...x, schedule: sched, status: done ? "Paid" : x.status } : x)));
    s.addLog(status === "Approved" ? "Approved withdrawal payment" : "Recorded withdrawal payment as paid", `${w.id} #${k + 1}`, w.schedule[k].status, `${status} · ${naira(w.schedule[k].amount)}`);
    toast(status === "Approved" ? `Payment ${k + 1} approved (two signatories: one home, one diaspora — 14.2).` : `Payment ${k + 1} recorded as paid.${done ? ` ${w.id} is fully paid.` : ""}`);
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 font-display text-[19px] font-bold text-forest-800">
            {w.id} · {m?.name ?? w.memberNo}
          </h2>
          <p className="m-0 text-[13.5px] text-muted">
            <button type="button" className="font-semibold text-forest-800 hover:underline" onClick={() => s.openProfile(w.memberNo)} disabled={s.access("register") === "none"}>
              {w.memberNo}
            </button>{" "}
            · queue position {position} · {w.kind === "death" ? "Death — paid to nominees (10.1)" : "Member’s notice (12.1)"}
          </p>
        </div>
        <Pill>{w.status}</Pill>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KeyVals
          items={[
            ["Shares", `${w.shares} of ${held + (w.status === "Approved — paying" || w.status === "Paid" ? w.shares : 0)} held · ${naira(value)}`],
            ["First share", fmtDate(first)],
            ["Notice date", fmtDate(w.noticeDate)],
          ]}
        />
        <KeyVals
          items={[
            ["Eligible from", <span key="e" className={TODAY < eligible ? "font-semibold text-[#9A5B0B]" : "font-semibold text-forest-800"}>{fmtDate(eligible)}{TODAY < eligible ? " — not yet" : " — eligible"}</span>],
            ["Pay to", w.payTo ?? "The member’s own bank account"],
            ["Decided by", w.decidedBy ?? "—"],
          ]}
        />
      </div>

      {deciding ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2.5">
            <Field label="Spread over" className="w-44">
              <select value={months} onChange={(e) => setMonths(e.target.value)} className={inputCls}>
                {Array.from({ length: 12 }, (_, k) => (
                  <option key={k + 1} value={k + 1}>
                    {k + 1} month{k ? "s" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Btn variant="primary" reason={approveReason} onClick={approve}>
              Approve withdrawal
            </Btn>
            <Btn variant="ghost" reason={!s.can("board.approve") ? "Only the Board decides withdrawals." : undefined} onClick={decline}>
              Decline
            </Btn>
          </div>
          {TODAY < eligible ? (
            <Banner tone="warn">{`Not eligible until ${fmtDate(eligible)}: shares must be held 3 years from the first share (${fmtDate(first)}) and 6 months’ notice given (${fmtDate(w.noticeDate)}) — 12.1.`}</Banner>
          ) : approveReason ? (
            <p className="m-0 text-[13px] text-muted">{approveReason}</p>
          ) : null}
        </div>
      ) : null}

      {w.schedule.length > 0 ? (
        <Table minWidth={620} label={`Payment schedule ${w.id}`}>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Due</Th>
              <Th right>Amount</Th>
              <Th>Status</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {w.schedule.map((it, k) => (
              <tr key={k}>
                <Td>{k + 1}</Td>
                <Td>{fmtDate(it.due)}</Td>
                <Td right>{naira(it.amount)}</Td>
                <Td>
                  <Pill>{it.status}</Pill>
                  {it.approvedBy ? <span className="ml-2 text-[12px] text-muted">by {it.approvedBy}</span> : null}
                </Td>
                <Td>
                  {it.status === "Scheduled" ? (
                    <Btn
                      size="sm"
                      variant="primary"
                      reason={
                        !s.can("treasurer.pay")
                          ? "Payments are approved by the Treasurer and Chairman (14.3)."
                          : it.amount > CHAIR_TREASURER_LIMIT
                            ? `Over ${naira(CHAIR_TREASURER_LIMIT)} — needs the full Board (14.3).`
                            : undefined
                      }
                      onClick={() => setInstalment(k, "Approved")}
                    >
                      Approve payment
                    </Btn>
                  ) : it.status === "Approved" ? (
                    <Btn size="sm" reason={!s.can("pay.match") ? "The Finance officer records the payment once the bank confirms it." : undefined} onClick={() => setInstalment(k, "Paid")}>
                      Mark paid
                    </Btn>
                  ) : (
                    <span className="text-[13px] text-muted">Paid</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </Card>
  );
}
