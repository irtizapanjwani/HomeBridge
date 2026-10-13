// Report builders shared by the register, joining-fee and reports screens.
// Each returns plain columns + rows so it can go to CSV, Excel or a print-to-PDF page.

import { ACCOUNT_LABEL, CHAPTERS, TODAY, type Member } from "@/lib/admin-data";
import type { Store } from "./store";
import { download, fmtDate, slug, toCsv, toXls } from "./lib";

export type Report = { name: string; columns: string[]; rows: (string | number)[][] };

export function registerReport(s: Store, members: Member[] = s.members): Report {
  return {
    name: "Member register",
    columns: ["Member no.", "Name", "Type", "Society", "Chapter", "Lives in", "Route", "Shares", "% of capital", "Unallocated credit (NGN)", "Last paid", "Status", "Joined", "Ended", "End reason"],
    rows: members.map((m) => {
      const sh = s.holdings[m.no] ?? 0;
      return [
        m.no,
        m.name,
        m.type,
        m.society === "ED" ? "Edo" : "FCT",
        CHAPTERS[m.chapter] ?? m.chapter,
        m.livesIn,
        m.route,
        sh,
        s.totalShares ? ((sh / s.totalShares) * 100).toFixed(2) + "%" : "0%",
        s.credit(m.no).toFixed(2),
        s.lastPaid(m.no) ?? "",
        m.status,
        m.joinedAt,
        m.endedAt ?? "",
        m.endReason ?? "",
      ];
    }),
  };
}

export function contributionsByMember(s: Store): Report {
  return {
    name: "Contributions by member",
    columns: ["Member no.", "Name", "Payments credited", "Naira value credited", "Shares issued from payments", "Unallocated credit", "Last paid"],
    rows: s.members.map((m) => {
      const ls = s.lines.filter((l) => l.memberNo === m.no && l.matchStatus === "Credited");
      const issued = s.txs.filter((t) => t.memberNo === m.no && t.type === "issue" && t.source !== "hours").reduce((a, t) => a + t.shares, 0);
      return [m.no, m.name, ls.length, ls.reduce((a, l) => a + l.ngnValue, 0).toFixed(2), issued, s.credit(m.no).toFixed(2), s.lastPaid(m.no) ?? ""];
    }),
  };
}

export function contributionsByPeriod(s: Store): Report {
  const by: Record<string, { n: number; ngn: number; uba: number; usd: number; gbp: number }> = {};
  for (const l of s.lines) {
    if (l.matchStatus !== "Credited") continue;
    const k = l.receivedAt.slice(0, 7);
    const r = (by[k] ??= { n: 0, ngn: 0, uba: 0, usd: 0, gbp: 0 });
    r.n++;
    r.ngn += l.ngnValue;
    if (l.account === "UBA") r.uba += l.ngnValue;
    if (l.account === "USD-dom") r.usd += l.amount;
    if (l.account === "GBP-dom") r.gbp += l.amount;
  }
  return {
    name: "Contributions by period",
    columns: ["Month", "Payments credited", "Total naira value", "UBA (NGN)", "USD domiciliary (USD)", "GBP domiciliary (GBP)"],
    rows: Object.keys(by)
      .sort()
      .map((k) => [fmtDate(k), by[k].n, by[k].ngn.toFixed(2), by[k].uba.toFixed(2), by[k].usd.toFixed(2), by[k].gbp.toFixed(2)]),
  };
}

export function shareRegister(s: Store): Report {
  return {
    name: "Share register",
    columns: ["Txn", "Date", "Member no.", "Type", "Shares", "Naira value", "Payment", "Source", "Approved by", "Note"],
    rows: [...s.txs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => [t.id, t.date, t.memberNo, t.type, t.shares, t.ngnValue, t.paymentId ?? "", t.source, t.approvedBy, t.note ?? ""]),
  };
}

export function paymentsReport(s: Store): Report {
  return {
    name: "Bank lines and matching",
    columns: ["Line", "Received", "Account", "Amount", "Currency", "FX rate", "Naira value", "Bank reference", "Match status", "Member no.", "Matched by", "Note"],
    rows: s.lines.map((l) => [l.id, l.receivedAt, ACCOUNT_LABEL[l.account], l.amount, l.currency, l.fxRate, l.ngnValue.toFixed(2), l.bankRef, l.matchStatus, l.memberNo ?? "", l.matchedBy ?? "", l.note ?? ""]),
  };
}

export function joiningFeeReport(s: Store): Report {
  return {
    name: "Joining fees for VEKAT",
    columns: ["Fee id", "Reference", "Name", "Amount", "Currency", "Channel", "Stripe id / receipt", "Paid on", "Status", "Payee"],
    rows: s.fees.map((f) => [f.id, f.ref, f.name, f.amount, f.currency, f.channel === "stripe" ? "Stripe" : "First Bank", f.stripeId ?? f.receipt ?? "", f.paidAt, f.status, s.settings.joiningFeePayee]),
  };
}

export function withdrawalsReport(s: Store): Report {
  return {
    name: "Withdrawals",
    columns: ["Request", "Member no.", "Kind", "Shares", "Notice date", "Status", "Instalments", "Decided by"],
    rows: s.withdrawals.map((w) => [w.id, w.memberNo, w.kind === "death" ? "Death — nominee (10.1)" : "Notice (12.1)", w.shares, w.noticeDate, w.status, w.schedule.map((i) => `${i.due} ${i.amount} ${i.status}`).join(" | "), w.decidedBy ?? ""]),
  };
}

export function auditReport(s: Store): Report {
  return {
    name: "Audit log",
    columns: ["When", "Who", "Role", "Action", "Entity", "Before", "After"],
    rows: s.log.map((l) => [l.at, l.who, l.role, l.action, l.entity, l.before, l.after]),
  };
}

export function exportReport(r: Report, kind: "csv" | "xls", suffix = TODAY) {
  const base = `homebridge-${slug(r.name)}-${suffix}`;
  if (kind === "csv") download(`${base}.csv`, toCsv(r.columns, r.rows));
  else download(`${base}.xls`, toXls(r.columns, r.rows), "application/vnd.ms-excel");
}
