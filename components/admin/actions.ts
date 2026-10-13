// Ledger actions shared by several screens. Each one checks the bye-law rules first,
// then updates the store and writes an audit entry. Returns a message for the toast.

import { TODAY, type BankLine, type ShareTx } from "@/lib/admin-data";
import type { Store } from "./store";
import { naira, nairaAuto } from "./lib";

let txSeq = 9000;
const nextTx = () => `ST-${txSeq++}`;

type Result = { ok: boolean; msg: string };

/** After money is credited: dormant/reminder members become active again (9.3); first share activates (6.4). */
function afterCredit(s: Store, memberNo: string, newShares: number) {
  const m = s.member(memberNo);
  if (!m) return;
  const hadShares = (s.holdings[memberNo] ?? 0) > 0;
  let next = m.status;
  if (m.status === "Reminder sent" || m.status === "Dormant") next = "Active";
  if (m.status === "Awaiting first share" && (hadShares || newShares > 0)) next = "Active";
  if (next !== m.status) {
    s.setMembers((cur) => cur.map((x) => (x.no === memberNo ? { ...x, status: next } : x)));
    s.addLog("Member status changed", memberNo, m.status, `${next}${m.status === "Awaiting first share" ? " (6.4: fee paid + first share + register)" : " (contribution received, 9.3)"}`);
    if (m.status === "Awaiting first share") s.setApps((cur) => cur.map((a) => (a.memberNo === memberNo ? { ...a, status: "Active" } : a)));
  }
}

/** Confirm a matched bank line: issue whole shares and carry the remainder as unallocated credit. */
export function confirmLine(s: Store, line: BankLine): Result {
  if (!line.memberNo) return { ok: false, msg: "Match this line to a member first." };
  const m = s.member(line.memberNo);
  if (!m) return { ok: false, msg: `${line.memberNo} is not on the register yet. Enter the member in the register first (6.4).` };
  if (m.status === "Withdrawn" || m.status === "Deceased")
    return { ok: false, msg: `${m.no} is ${m.status.toLowerCase()} — shares cannot be issued. Return the money to the payer.` };
  const price = s.settings.sharePrice;
  const credit = s.credit(m.no);
  const available = line.ngnValue + credit;
  const shares = Math.floor(available / price);
  const remainder = Math.round((available - shares * price) * 100) / 100;
  const check = s.checkIssue(m.no, shares);
  if (!check.ok) return { ok: false, msg: check.reason! };

  s.setLines((cur) => cur.map((l) => (l.id === line.id ? { ...l, matchStatus: "Credited", matchedBy: l.matchedBy ?? s.role.person } : l)));
  if (shares > 0) {
    const tx: ShareTx = { id: nextTx(), memberNo: m.no, type: "issue", shares, ngnValue: shares * price, paymentId: line.id, source: "payment", approvedBy: s.role.person, date: TODAY };
    s.setTxs((cur) => [...cur, tx]);
  }
  afterCredit(s, m.no, shares);
  s.addLog(
    "Confirmed payment and issued shares",
    `${line.id} · ${m.no}`,
    line.matchStatus,
    `Credited · ${shares} share${shares === 1 ? "" : "s"} at ${naira(price)} · unallocated credit ${nairaAuto(remainder)}`,
  );
  return {
    ok: true,
    msg: `${nairaAuto(line.ngnValue)} credited to ${m.no}: ${shares} share${shares === 1 ? "" : "s"} issued, ${nairaAuto(remainder)} carried as unallocated credit.`,
  };
}

/** Issue shares to a member from their unallocated credit (Finance officer). */
export function issueFromCredit(s: Store, memberNo: string, shares: number): Result {
  const price = s.settings.sharePrice;
  if (!Number.isInteger(shares) || shares < 1) return { ok: false, msg: "Shares are whole units (11.1). Enter a whole number of 1 or more." };
  const credit = s.credit(memberNo);
  const check = s.checkIssue(memberNo, shares);
  if (!check.ok) return { ok: false, msg: check.reason! };
  if (shares * price > credit)
    return { ok: false, msg: `Not enough matched money: ${shares} shares cost ${naira(shares * price)}, but this member has ${nairaAuto(credit)} of unallocated credit. Nothing is issued without money received.` };
  s.setTxs((cur) => [...cur, { id: nextTx(), memberNo, type: "issue", shares, ngnValue: shares * price, source: "credit", approvedBy: s.role.person, date: TODAY, note: "Issued from unallocated credit" }]);
  afterCredit(s, memberNo, shares);
  s.addLog("Issued shares from unallocated credit", memberNo, `${check.held} shares · credit ${nairaAuto(credit)}`, `${check.after} shares (${(check.pctAfter * 100).toFixed(2)}%) · credit ${nairaAuto(credit - shares * price)}`);
  return { ok: true, msg: `${shares} shares issued to ${memberNo}. Holding is now ${(check.pctAfter * 100).toFixed(2)}% of share capital.` };
}

export function addShareTx(s: Store, tx: Omit<ShareTx, "id">) {
  s.setTxs((cur) => [...cur, { ...tx, id: nextTx() }]);
}
