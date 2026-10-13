"use client";

import { useState } from "react";
import { ACCOUNT_LABEL, CHAPTERS, RATES, SOCIETIES_BY_CODE, TODAY, type HoursClaim, type Transfer } from "@/lib/admin-data";
import { useToast } from "@/components/ui/Toast";
import { addShareTx, issueFromCredit } from "../actions";
import { useAdmin } from "../store";
import { fmtDate, money, naira, nairaAuto, num } from "../lib";
import { Banner, Btn, Card, CardTitle, Drawer, Empty, Field, KeyVals, Pill, Table, Td, Th, inputCls } from "../ui";

export function MemberProfile() {
  const s = useAdmin();
  const m = s.member(s.profileNo);
  const close = () => s.openProfile(null);
  if (!m) return null;

  const sh = s.holdings[m.no] ?? 0;
  const share = s.totalShares ? sh / s.totalShares : 0;
  const credit = s.credit(m.no);
  const txs = s.txs.filter((t) => t.memberNo === m.no).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const lines = s.lines.filter((l) => l.memberNo === m.no).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const nomineeTotal = m.nominees.reduce((t, n) => t + n.percent, 0);
  const transfers = s.transfers.filter((t) => t.from === m.no || t.to === m.no);
  const hours = s.hours.filter((h) => h.memberNo === m.no);
  const readOnly = s.access("register") !== "act";
  let running = 0;

  return (
    <Drawer open onClose={close} title={`${m.name} · ${m.no}`} wide>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 text-[14px] text-muted">
          <Pill>{m.status}</Pill>
          <span>
            {m.type} member · {SOCIETIES_BY_CODE[m.society]} · {CHAPTERS[m.chapter] ?? m.chapter}
          </span>
        </div>

        {readOnly ? (
          <Banner tone="lock" title="Read-only.">
            {s.role.title} can read this profile and ledger but not change it.
          </Banner>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Shares", num(sh)],
            ["% of capital", `${(share * 100).toFixed(2)}%`],
            ["Unallocated credit", nairaAuto(credit)],
            ["Last paid", fmtDate(s.lastPaid(m.no))],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[14px] border border-line/80 bg-paper px-4 py-3">
              <div className="text-[12.5px] text-muted">{k}</div>
              <div className="font-display text-[20px] font-bold text-forest-800">{v}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col gap-3 p-5">
            <CardTitle>Member details</CardTitle>
            <KeyVals
              items={[
                ["Lives in", m.livesIn],
                ["Residence route", m.route],
                ["Phone", m.phone],
                ["Email", m.email],
                ["Joined", fmtDate(m.joinedAt)],
                ...(m.groupRep ? ([["Group representative", m.groupRep]] as [string, string][]) : []),
                ...(m.endedAt ? ([["Ended", `${fmtDate(m.endedAt)} — ${m.endReason}`]] as [string, string][]) : []),
                ...(m.endedAt ? ([["Liability ends", `${fmtDate(addYears(m.endedAt, 2))} (9.4)`]] as [string, string][]) : []),
              ]}
            />
          </Card>
          <Card className="flex flex-col gap-3 p-5">
            <CardTitle>KYC result</CardTitle>
            <KeyVals
              items={[
                ["ID type", m.kyc.idType],
                ["Provider", `${m.kyc.provider} · ref ${m.kyc.providerRef}`],
                ["Liveness", m.kyc.liveness],
                ["Document match", m.kyc.docMatch],
                ["Address", m.kyc.addressOk ? "Confirmed" : "Not confirmed"],
                ["Result", <Pill key="r">{m.kyc.result}</Pill>],
                ["Reviewer", m.kyc.reviewer ?? "—"],
              ]}
            />
            <p className="m-0 text-[12.5px] text-muted">Only the provider reference and result are stored — never the raw BVN, NIN or passport number.</p>
          </Card>
        </div>

        <Card className="flex flex-col gap-3 p-5">
          <CardTitle aside={m.type !== "Group" ? <Pill tone={nomineeTotal === 100 ? "green" : "red"}>{`Total ${nomineeTotal}%`}</Pill> : undefined}>Nominees (10.1)</CardTitle>
          {m.type === "Group" ? (
            <p className="m-0 text-[14px] text-muted">Group member — represented by {m.groupRep}. Nominees do not apply to groups.</p>
          ) : m.nominees.length === 0 ? (
            <Empty title="No nominees named." />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[14px]">
              {m.nominees.map((n, i) => (
                <li key={i} className="flex justify-between gap-3 border-b border-line/70 pb-1.5 last:border-0">
                  <span>
                    {n.name} · <span className="text-muted">{n.relationship}</span>
                  </span>
                  <b className="font-semibold">{n.percent}%</b>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <IssueShares memberNo={m.no} />
        {transfers.length > 0 && <TransfersCard items={transfers} />}
        {(hours.length > 0 || m.type === "Professional") && <HoursCard memberNo={m.no} items={hours} base={m.base} />}

        <Card className="flex flex-col gap-3 p-5">
          <CardTitle aside={<span className="text-[13px] text-muted">Balance = sum of rows</span>}>Share transactions</CardTitle>
          {txs.length === 0 ? (
            <Empty title="No shares yet.">The member becomes active when their first share is paid (6.4).</Empty>
          ) : (
            <Table minWidth={640} label="Share transactions">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th right>Shares</Th>
                  <Th right>Naira</Th>
                  <Th>From</Th>
                  <Th>Approved by</Th>
                  <Th right>Balance</Th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => {
                  running += t.shares;
                  return (
                    <tr key={t.id}>
                      <Td className="whitespace-nowrap">{fmtDate(t.date)}</Td>
                      <Td>{t.type.replace("_", " ")}</Td>
                      <Td right className={t.shares < 0 ? "text-danger" : undefined}>
                        {t.shares > 0 ? "+" : ""}
                        {num(t.shares)}
                      </Td>
                      <Td right>{naira(t.ngnValue)}</Td>
                      <Td className="text-[13px] text-muted">{t.paymentId ?? t.note ?? t.source}</Td>
                      <Td className="text-[13px]">{t.approvedBy}</Td>
                      <Td right className="font-semibold">
                        {num(running)}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <CardTitle>Payments</CardTitle>
          {lines.length === 0 ? (
            <Empty title="No payments matched to this member." />
          ) : (
            <Table minWidth={680} label="Payments">
              <thead>
                <tr>
                  <Th>Received</Th>
                  <Th>Account</Th>
                  <Th right>Amount</Th>
                  <Th right>FX rate</Th>
                  <Th right>Naira value</Th>
                  <Th>Line</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id}>
                    <Td className="whitespace-nowrap">{fmtDate(l.receivedAt)}</Td>
                    <Td className="whitespace-nowrap">{ACCOUNT_LABEL[l.account]}</Td>
                    <Td right>{money(l.amount, l.currency)}</Td>
                    <Td right>{l.fxRate === 1 ? "—" : num(l.fxRate)}</Td>
                    <Td right>{nairaAuto(l.ngnValue)}</Td>
                    <Td className="text-[13px] text-muted">{l.id}</Td>
                    <Td>
                      <Pill>{l.matchStatus}</Pill>
                      {l.note ? <div className="mt-1 max-w-[220px] text-[12px] text-muted">{l.note}</div> : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </Drawer>
  );
}

function addYears(iso: string, y: number) {
  return `${Number(iso.slice(0, 4)) + y}${iso.slice(4)}`;
}

function IssueShares({ memberNo }: { memberNo: string }) {
  const s = useAdmin();
  const toast = useToast();
  const price = s.settings.sharePrice;
  const credit = s.credit(memberNo);
  const m = s.member(memberNo)!;
  const [n, setN] = useState(String(Math.max(1, Math.floor(credit / price))));
  const shares = Math.floor(Number(n));
  const valid = Number.isInteger(Number(n)) && shares >= 1;
  const check = valid ? s.checkIssue(memberNo, shares) : null;
  const ended = m.status === "Withdrawn" || m.status === "Deceased";

  const reason = !s.can("shares.issue")
    ? "Only the Finance officer issues shares."
    : ended
      ? `Membership has ended (${m.status.toLowerCase()}).`
      : !valid
        ? "Enter a whole number of shares (11.1)."
        : check && !check.ok
          ? "Blocked by the 20% cap (11.3) — see the explanation below."
          : shares * price > credit
            ? `Needs ${naira(shares * price)} of matched money; this member has ${nairaAuto(credit)} unallocated.`
            : undefined;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle>Issue shares</CardTitle>
      <p className="m-0 text-[14px] text-muted">
        Shares are issued in whole {naira(price)} units from money already matched to this member. Unallocated credit: <b className="text-ink">{nairaAuto(credit)}</b>.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Shares to issue" className="w-40">
          <input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/[^\d]/g, ""))} className={inputCls} />
        </Field>
        <Btn
          variant="primary"
          reason={reason}
          onClick={() => {
            const r = issueFromCredit(s, memberNo, shares);
            toast(r.msg, r.ok ? "info" : "warn");
          }}
        >
          Issue shares
        </Btn>
      </div>
      {check ? (
        check.ok ? (
          <p className="m-0 text-[13.5px] text-muted">
            After this issue: {num(check.after)} of {num(check.total)} shares = <b className="text-forest-800">{(check.pctAfter * 100).toFixed(2)}%</b> of share capital (limit {s.settings.capPct}%).
          </p>
        ) : (
          <Banner tone="danger" title="Issue blocked.">
            {check.reason}
          </Banner>
        )
      ) : null}
    </Card>
  );
}

function TransfersCard({ items }: { items: Transfer[] }) {
  const s = useAdmin();
  const toast = useToast();

  function decide(t: Transfer, ok: boolean) {
    if (!ok) {
      s.setTransfers((cur) => cur.map((x) => (x.id === t.id ? { ...x, status: "Declined", decidedBy: s.role.person } : x)));
      s.addLog("Declined share transfer", t.id, "Awaiting Board", "Declined");
      toast(`Transfer ${t.id} declined.`);
      return;
    }
    s.setTransfers((cur) => cur.map((x) => (x.id === t.id ? { ...x, status: "Approved", decidedBy: s.role.person } : x)));
    addShareTx(s, { memberNo: t.from, type: "transfer_out", shares: -t.shares, ngnValue: -t.shares * s.settings.sharePrice, source: "transfer", approvedBy: s.role.person, date: TODAY, note: `To ${t.to} (11.5)` });
    addShareTx(s, { memberNo: t.to, type: "transfer_in", shares: t.shares, ngnValue: t.shares * s.settings.sharePrice, source: "transfer", approvedBy: s.role.person, date: TODAY, note: `From ${t.from} (11.5)` });
    s.addLog("Approved share transfer", t.id, "Awaiting Board", `${t.shares} shares ${t.from} → ${t.to}`);
    toast(`Transfer approved: ${t.shares} shares ${t.from} → ${t.to}.`);
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle>Share transfers (11.5)</CardTitle>
      {items.map((t) => {
        const to = s.member(t.to);
        const fromHeld = s.holdings[t.from] ?? 0;
        // A transfer moves shares between members: the recipient's share of the same total changes.
        const toAfter = (s.holdings[t.to] ?? 0) + t.shares;
        const toPct = s.totalShares ? toAfter / s.totalShares : 0;
        const reason =
          t.status !== "Awaiting Board"
            ? undefined
            : !s.can("board.approve")
              ? "Only the Board approves transfers (11.5)."
              : !to || !["Active", "Reminder sent", "Dormant", "Awaiting first share"].includes(to.status)
                ? "Transfers go only to a member or an approved applicant (11.5)."
                : fromHeld < t.shares
                  ? `${t.from} holds only ${fromHeld} shares.`
                  : toPct > s.settings.capPct / 100 && !to.isCooperative
                    ? `Would take ${t.to} to ${(toPct * 100).toFixed(2)}% of share capital — over the ${s.settings.capPct}% cap (11.3).`
                    : undefined;
        return (
          <div key={t.id} className="flex flex-col gap-3 rounded-[14px] border border-line/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-[14px]">
              <b className="font-semibold text-ink">
                {t.shares} shares · {t.from} → {t.to}
              </b>
              <div className="text-muted">
                {t.id} · requested {fmtDate(t.requestedAt)} · recipient after transfer {(toPct * 100).toFixed(2)}%
                {t.decidedBy ? ` · ${t.status.toLowerCase()} by ${t.decidedBy}` : ""}
              </div>
            </div>
            {t.status === "Awaiting Board" ? (
              <div className="flex shrink-0 gap-2">
                <Btn size="sm" variant="primary" reason={reason} onClick={() => decide(t, true)}>
                  Approve transfer
                </Btn>
                <Btn size="sm" reason={!s.can("board.approve") ? "Only the Board decides transfers." : undefined} onClick={() => decide(t, false)}>
                  Decline
                </Btn>
              </div>
            ) : (
              <Pill>{t.status}</Pill>
            )}
          </div>
        );
      })}
    </Card>
  );
}

function HoursCard({ memberNo, items, base }: { memberNo: string; items: HoursClaim[]; base: "home" | "diaspora" }) {
  const s = useAdmin();
  const toast = useToast();
  const monthly = base === "home" ? s.settings.minMonthlyNgn : s.settings.minMonthlyGbp * RATES.GBP;
  const limit = monthly / 2;

  function decide(h: HoursClaim, ok: boolean) {
    s.setHours((cur) => cur.map((x) => (x.id === h.id ? { ...x, status: ok ? "Approved" : "Declined", decidedBy: s.role.person } : x)));
    if (ok) {
      const value = h.hours * h.rate;
      const shares = Math.floor(value / s.settings.sharePrice);
      addShareTx(s, { memberNo, type: "issue", shares, ngnValue: shares * s.settings.sharePrice, source: "hours", approvedBy: s.role.person, date: TODAY, note: `Professional hours ${h.id} (11.4)` });
      s.addLog("Approved professional-hours valuation", h.id, "Awaiting Board", `${h.hours} h × ${naira(h.rate)} = ${naira(value)} → ${shares} shares`);
      toast(`${h.id} approved: ${shares} shares recorded.`);
    } else {
      s.addLog("Declined professional-hours valuation", h.id, "Awaiting Board", "Declined");
      toast(`${h.id} declined.`);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle>Professional hours (11.4)</CardTitle>
      <p className="m-0 text-[13.5px] text-muted">
        Up to half the monthly contribution may be paid in hours at the Board-approved rate. Limit for this member: {naira(Math.round(limit))} a month
        {base === "diaspora" ? ` (half of £${s.settings.minMonthlyGbp} at the example rate)` : ""}.
      </p>
      {items.length === 0 ? <Empty title="No hours claims." /> : null}
      {items.map((h) => {
        const value = h.hours * h.rate;
        const over = value > limit;
        const reason = !s.can("board.approve") ? "Only the Board approves professional-hours valuations." : over ? `${naira(value)} is more than half the monthly contribution (${naira(Math.round(limit))}).` : undefined;
        return (
          <div key={h.id} className="flex flex-col gap-3 rounded-[14px] border border-line/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-[14px]">
              <b className="font-semibold text-ink">
                {h.hours} hours × {naira(h.rate)} = {naira(value)}
              </b>
              <div className="text-muted">
                {h.id} · {fmtDate(h.month)} · {h.work}
              </div>
              {over && h.status === "Awaiting Board" ? <div className="mt-1 text-[13px] font-semibold text-danger">Over the 50% limit — cannot be approved as claimed.</div> : null}
            </div>
            {h.status === "Awaiting Board" ? (
              <div className="flex shrink-0 gap-2">
                <Btn size="sm" variant="primary" reason={reason} onClick={() => decide(h, true)}>
                  Approve
                </Btn>
                <Btn size="sm" reason={!s.can("board.approve") ? "Only the Board decides hours claims." : undefined} onClick={() => decide(h, false)}>
                  Decline
                </Btn>
              </div>
            ) : (
              <Pill>{h.status}</Pill>
            )}
          </div>
        );
      })}
    </Card>
  );
}
