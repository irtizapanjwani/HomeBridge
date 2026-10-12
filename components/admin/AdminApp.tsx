"use client";

import { useMemo, useState } from "react";
import {
  APPLICANTS,
  APPROVALS,
  LOG,
  MEMBERS_FOR_MATCHING,
  PAYMENTS,
  REPORTS,
  ROLES,
  type Applicant,
  type Approval,
  type KycStatus,
  type LogEntry,
  type Payment,
  type RoleId,
} from "@/lib/admin-data";
import { BankIcon, CheckIcon, ClipboardIcon, DownloadIcon, IdIcon, LogIcon, MenuIcon, SearchIcon, ShieldIcon } from "@/components/ui/Icons";
import { LogoMark } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/Toast";

type Tab = "kyc" | "pay" | "appr" | "rep" | "log";

const TAB_DEFS: { id: Tab; label: string; heading: string; Icon: typeof IdIcon }[] = [
  { id: "kyc", label: "KYC queue", heading: "Identity checks to review", Icon: IdIcon },
  { id: "pay", label: "Payment matching", heading: "Match bank payments", Icon: BankIcon },
  { id: "appr", label: "Approvals", heading: "Waiting for a second approver", Icon: ShieldIcon },
  { id: "rep", label: "Reports", heading: "Reports and exports", Icon: ClipboardIcon },
  { id: "log", label: "Audit log", heading: "Audit log", Icon: LogIcon },
];

const statusTone: Record<KycStatus, string> = {
  "Needs review": "bg-butter text-gold-ink",
  "Info requested": "bg-butter text-gold-ink",
  Passed: "bg-forest-100 text-forest-800",
  Approved: "bg-forest-800 text-cream",
  Declined: "bg-[#F6DED8] text-danger",
};

const chapterCode = { Edo: "EDO", Abuja: "ABJ", UK: "UK" } as const;

const btn = {
  primary: "min-h-11 rounded-[10px] bg-forest-800 px-4 font-bold text-cream transition hover:bg-forest-900 disabled:cursor-not-allowed disabled:opacity-45",
  outline: "min-h-11 rounded-[10px] border border-forest-800 bg-white px-4 font-bold text-forest-800 transition hover:bg-forest-100 disabled:cursor-not-allowed disabled:opacity-45",
  danger: "min-h-11 rounded-[10px] border border-danger bg-white px-4 font-bold text-danger transition hover:bg-[#F6DED8] disabled:cursor-not-allowed disabled:opacity-45",
};

function nowStamp() {
  return "Today " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const htmlCell = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function AdminApp() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("kyc");
  const [role, setRole] = useState<RoleId>("kyc");
  const [navOpen, setNavOpen] = useState(false);

  const [applicants, setApplicants] = useState<Applicant[]>(APPLICANTS);
  const [selectedId, setSelectedId] = useState(APPLICANTS[0].id);
  const [reason, setReason] = useState("");
  const [pendingAction, setPendingAction] = useState<null | "info" | "decline">(null);
  const [nextSeq, setNextSeq] = useState(124);

  const [payments, setPayments] = useState<Payment[]>(PAYMENTS);
  const [manualFor, setManualFor] = useState<string | null>(null);
  const [manualPick, setManualPick] = useState(MEMBERS_FOR_MATCHING[0].no);

  const [approvals, setApprovals] = useState<Approval[]>(APPROVALS);
  const [log, setLog] = useState<LogEntry[]>(LOG);
  const [logQuery, setLogQuery] = useState("");

  const roleDef = ROLES.find((r) => r.id === role)!;
  const canAct = roleDef.canAct;
  const actor = roleDef.label.replace(" (read-only)", "");

  const addLog = (what: string) => setLog((cur) => [{ when: nowStamp(), who: actor, what }, ...cur]);
  const guard = () => {
    if (!canAct) toast(`${roleDef.label} access is read-only.`, "warn");
    return canAct;
  };

  const counts: Record<Tab, string> = {
    kyc: String(applicants.filter((a) => a.status === "Needs review" || a.status === "Info requested" || a.status === "Passed").length),
    pay: String(payments.filter((p) => p.status === "Unconfirmed").length),
    appr: String(approvals.length),
    rep: "",
    log: "",
  };

  const selected = applicants.find((a) => a.id === selectedId) ?? applicants[0];
  const heading = TAB_DEFS.find((t) => t.id === tab)!.heading;

  /* ---------- KYC actions ---------- */
  function updateApplicant(id: string, patch: Partial<Applicant>) {
    setApplicants((cur) => cur.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }
  function approve(a: Applicant) {
    if (!guard()) return;
    const memberNo = `HB-${chapterCode[a.chapter]}-${String(nextSeq).padStart(6, "0")}`;
    setNextSeq((n) => n + 1);
    updateApplicant(a.id, { status: "Approved", memberNo, note: undefined });
    addLog(`Approved ${a.name} (${a.check}) — issued ${memberNo}`);
    toast(`${a.name} approved. Member number ${memberNo} issued.`);
  }
  function confirmReasonAction(a: Applicant) {
    if (!guard() || !pendingAction) return;
    if (reason.trim().length < 5) {
      toast("Please give a short reason — it is logged.", "warn");
      return;
    }
    if (pendingAction === "info") {
      updateApplicant(a.id, { status: "Info requested", note: reason.trim() });
      addLog(`Requested info from ${a.name}: ${reason.trim()}`);
      toast(`Info request sent to ${a.name} on WhatsApp.`);
    } else {
      updateApplicant(a.id, { status: "Declined", note: reason.trim() });
      addLog(`Declined ${a.name}: ${reason.trim()}`);
      toast(`${a.name} declined. Reason logged.`);
    }
    setPendingAction(null);
    setReason("");
  }

  /* ---------- Payment actions ---------- */
  function confirmPayment(p: Payment) {
    if (!guard()) return;
    setPayments((cur) => cur.map((x) => (x.id === p.id ? { ...x, status: "Confirmed" } : x)));
    addLog(`Confirmed ${p.amount} ${p.type.toLowerCase()} from ${p.ref}`);
    toast(`${p.amount} confirmed against ${p.match}.`);
  }
  function saveManualMatch(p: Payment) {
    if (!guard()) return;
    const m = MEMBERS_FOR_MATCHING.find((x) => x.no === manualPick)!;
    setPayments((cur) =>
      cur.map((x) => (x.id === p.id ? { ...x, match: `${m.name} (${m.no})`, type: "Shares", ref: `${x.ref} → ${m.no}` } : x)),
    );
    addLog(`Manually matched ${p.amount} (${p.ref}) to ${m.no}`);
    setManualFor(null);
    toast(`Matched to ${m.no}. Confirm to post it to the ledger.`);
  }

  /* ---------- Approval actions ---------- */
  function decide(a: Approval, ok: boolean) {
    if (!guard()) return;
    if (a.maker === actor) {
      toast("You prepared this item. A second person must approve it.", "warn");
      return;
    }
    if (a.kind === "cashout" && ok && role !== "board") {
      toast("Cash-out requests go to the board. Switch to a board member to approve.", "warn");
      return;
    }
    setApprovals((cur) => cur.filter((x) => x.id !== a.id));
    addLog(`${ok ? "Approved (second signer)" : "Returned to maker"}: ${a.what}`);
    toast(ok ? "Approved as second signer." : `Returned to ${a.maker}.`);
  }

  /* ---------- Reports ---------- */
  function exportReport(r: (typeof REPORTS)[number], kind: "csv" | "xls") {
    const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (kind === "csv") {
      const body = [r.columns, ...r.rows].map((row) => row.map(csvCell).join(",")).join("\n");
      download(`homebridge-${slug}.csv`, "﻿" + body, "text/csv;charset=utf-8");
    } else {
      const rows = [r.columns, ...r.rows]
        .map((row, i) => `<tr>${row.map((c) => (i ? `<td>${htmlCell(c)}</td>` : `<th>${htmlCell(c)}</th>`)).join("")}</tr>`)
        .join("");
      download(
        `homebridge-${slug}.xls`,
        `<html><head><meta charset="utf-8"></head><body><table border="1">${rows}</table></body></html>`,
        "application/vnd.ms-excel",
      );
    }
    addLog(`Exported “${r.name}” (${kind.toUpperCase()})`);
  }

  const filteredLog = useMemo(() => {
    const q = logQuery.trim().toLowerCase();
    return q ? log.filter((l) => `${l.when} ${l.who} ${l.what}`.toLowerCase().includes(q)) : log;
  }, [log, logQuery]);

  /* ---------- Layout ---------- */
  const sidebar = (
    <>
      <div className="flex items-center gap-2.5 px-2">
        <LogoMark size={34} />
        <div className="font-display text-xl font-extrabold text-cream">HomeBridge Admin</div>
      </div>
      <label className="mt-3 flex flex-col gap-1 px-2 text-[13px] text-[#A9B5AD]">
        Signed in as · 2FA on
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as RoleId);
            setPendingAction(null);
          }}
          className="min-h-10 rounded-lg border border-forest-600 bg-forest-800 px-2 text-sm font-semibold text-cream"
        >
          {ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <nav aria-label="Admin sections" className="mt-3 flex flex-col gap-1">
        {TAB_DEFS.map(({ id, label, Icon }) => {
          const on = tab === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => {
                setTab(id);
                setNavOpen(false);
              }}
              className={`flex min-h-11 items-center justify-between gap-2 rounded-[10px] px-3 text-left text-[15px] transition ${
                on ? "bg-forest-800 font-bold text-cream" : "font-semibold text-[#E6E0C8] hover:bg-forest-800/50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={18} className={on ? "text-gold" : "text-[#A9B5AD]"} />
                {label}
              </span>
              {counts[id] && counts[id] !== "0" && (
                <span className={`rounded-full px-2 text-[13px] ${on ? "bg-gold text-forest-900" : "text-[#A9B5AD]"}`}>{counts[id]}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto px-2 pt-6 text-[13px] text-[#A9B5AD]">
        Roles: super-admin · finance · KYC officer · chapter lead · board (read-only + approvals) · auditor (read-only)
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-admin-bg text-base text-ink">
      {/* Desktop sidebar */}
      <aside className="adire sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col overflow-y-auto bg-forest-900 px-3.5 py-5 lg:flex">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" onClick={() => setNavOpen(false)} className="absolute inset-0 bg-forest-950/60" />
          <aside className="adire relative flex h-full w-[min(84vw,300px)] flex-col overflow-y-auto bg-forest-900 px-3.5 py-5">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Open admin menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-forest-800"
          >
            <MenuIcon size={22} />
          </button>
          <span className="font-display text-lg font-extrabold text-forest-800">HomeBridge Admin</span>
          <span className="ml-auto truncate text-sm text-muted">{roleDef.label}</span>
        </header>

        <main className="flex min-w-0 flex-col gap-[18px] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <h1 className="m-0 font-display text-[clamp(24px,3vw,30px)] font-bold text-forest-800">{heading}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {!canAct && <span className="rounded-md bg-[#ECE7D6] px-2 py-0.5 text-xs font-bold text-muted">Read-only</span>}
              <span className="rounded-md bg-[#E9DFBF] px-2 py-0.5 text-xs text-muted">Sample data</span>
            </div>
          </div>

          {tab === "kyc" && (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <ul className="m-0 list-none overflow-hidden rounded-[14px] border border-line bg-white p-0">
                {applicants.map((a, i) => (
                  <li key={a.id} className={i ? "border-t border-[#EDE4C6]" : ""}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(a.id);
                        setPendingAction(null);
                        setReason("");
                      }}
                      aria-current={a.id === selected.id ? "true" : undefined}
                      className={`flex w-full items-center justify-between gap-2.5 px-4 py-3.5 text-left transition ${
                        a.id === selected.id ? "bg-forest-100 shadow-[inset_4px_0_0_#17452F]" : "hover:bg-cream"
                      }`}
                    >
                      <span className="min-w-0">
                        <b>{a.name}</b>
                        <br />
                        <span className="text-sm text-muted">
                          {a.memberType} · {a.chapter} · {a.check}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-bold ${statusTone[a.status]}`}>{a.status}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <section aria-label="Applicant detail" className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-[18px]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <b className="text-lg text-forest-800">
                    Applicant: {selected.name} · {selected.memberType} · HomeBridge {selected.chapter}
                  </b>
                  <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold ${statusTone[selected.status]}`}>{selected.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {selected.docs.map((d) => (
                    <div
                      key={d}
                      className="flex h-[90px] flex-col items-center justify-center gap-1 rounded-[10px] bg-[#E9DFBF] px-1 text-center text-[13px] text-muted"
                    >
                      <IdIcon size={22} className="text-forest-600" />
                      {d}
                    </div>
                  ))}
                </div>
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt>Liveness:</dt>
                  <dd className="m-0 font-bold text-forest-800">{selected.liveness}</dd>
                  <dt>Document match:</dt>
                  <dd className="m-0 font-bold text-forest-800">{selected.docMatch}</dd>
                  <dt>Membership route:</dt>
                  <dd className={`m-0 font-bold ${selected.routeOk ? "text-forest-800" : "text-gold-dark"}`}>{selected.route}</dd>
                </dl>
                {selected.note && (
                  <p className="m-0 rounded-lg bg-butter px-3 py-2 text-sm">
                    <b>Note:</b> {selected.note}
                  </p>
                )}
                {selected.memberNo ? (
                  <p className="m-0 flex items-center gap-2 rounded-lg bg-forest-800 px-3 py-2.5 text-sm text-cream">
                    <CheckIcon size={18} className="text-gold" /> Member number issued:{" "}
                    <b className="font-display tracking-wide text-gold">{selected.memberNo}</b>
                  </p>
                ) : selected.status === "Declined" ? null : (
                  <>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button type="button" disabled={!canAct} onClick={() => approve(selected)} className={btn.primary}>
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={!canAct}
                        onClick={() => setPendingAction(pendingAction === "info" ? null : "info")}
                        aria-pressed={pendingAction === "info"}
                        className={btn.outline}
                      >
                        Ask for info
                      </button>
                      <button
                        type="button"
                        disabled={!canAct}
                        onClick={() => setPendingAction(pendingAction === "decline" ? null : "decline")}
                        aria-pressed={pendingAction === "decline"}
                        className={btn.danger}
                      >
                        Decline
                      </button>
                    </div>
                    {pendingAction && (
                      <div className="flex flex-col gap-2 rounded-[10px] border border-line bg-cream p-3">
                        <label htmlFor="kyc-reason" className="text-sm font-semibold">
                          {pendingAction === "info" ? "What do you need from the applicant?" : "Reason for declining"}
                        </label>
                        <textarea
                          id="kyc-reason"
                          rows={2}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="w-full rounded-lg border border-line-strong bg-white p-2.5 text-[15px] focus:border-forest-800 focus:outline-none"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => confirmReasonAction(selected)} className={pendingAction === "info" ? btn.primary : btn.danger}>
                            {pendingAction === "info" ? "Send request" : "Confirm decline"}
                          </button>
                          <button type="button" onClick={() => setPendingAction(null)} className={btn.outline}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <span className="text-[13px] text-muted">
                  Reasons are logged. On approval a member number is issued (e.g. HB-UK-000045).
                </span>
              </section>
            </div>
          )}

          {tab === "pay" && (
            <>
              <div className="hidden overflow-hidden rounded-[14px] border border-line bg-white md:block">
                <table className="w-full border-collapse text-[15px]">
                  <thead>
                    <tr className="bg-forest-800 text-left text-cream">
                      {["Bank credit", "Reference", "Matched to", "Type", "Action"].map((h) => (
                        <th key={h} scope="col" className="px-3.5 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <PaymentRow key={p.id} p={p} canAct={canAct} manualFor={manualFor} manualPick={manualPick} setManualPick={setManualPick} onManual={setManualFor} onSave={saveManualMatch} onConfirm={confirmPayment} layout="table" />
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
                {payments.map((p) => (
                  <PaymentRow key={p.id} p={p} canAct={canAct} manualFor={manualFor} manualPick={manualPick} setManualPick={setManualPick} onManual={setManualFor} onSave={saveManualMatch} onConfirm={confirmPayment} layout="card" />
                ))}
              </ul>
              <p className="m-0 text-sm text-muted">Auto-matched by member number. Joining fees and shares are separate ledger items.</p>
            </>
          )}

          {tab === "appr" && (
            <div className="flex flex-col gap-3">
              {approvals.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-line-strong bg-white px-6 py-10 text-center">
                  <CheckIcon size={32} className="text-forest-800" />
                  <b className="text-forest-800">Nothing waiting for a second approver.</b>
                </div>
              )}
              {approvals.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-line bg-white px-[18px] py-4">
                  <span className="min-w-0">
                    <b className="text-forest-800">{a.what}</b>
                    <br />
                    <span className="text-sm text-muted">Prepared by {a.maker} · needs a second person to approve</span>
                  </span>
                  <span className="flex gap-2">
                    <button type="button" disabled={!canAct} onClick={() => decide(a, true)} className={btn.primary}>
                      Approve
                    </button>
                    <button type="button" disabled={!canAct} onClick={() => decide(a, false)} className={btn.outline}>
                      Return
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === "rep" && (
            <>
              <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {REPORTS.map((r) => (
                  <div key={r.name} className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-white p-4">
                    <b className="text-forest-800">{r.name}</b>
                    <span className="text-[13px] text-muted">{r.columns.join(" · ")}</span>
                    <span className="mt-auto flex gap-2">
                      {(["csv", "xls"] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => exportReport(r, k)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-forest-800 bg-white px-3 font-bold text-forest-800 hover:bg-forest-100"
                        >
                          <DownloadIcon size={16} />
                          {k === "csv" ? "CSV" : "Excel"}
                        </button>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="rounded-[14px] border border-[#E8D493] bg-butter px-4 py-3.5 text-[15px]">
                <b>Shareholding check:</b> no member is near the 20% limit. Members above 15% are flagged here
                automatically.
              </div>
            </>
          )}

          {tab === "log" && (
            <>
              <label className="flex min-h-11 max-w-md items-center gap-2 rounded-[10px] border border-line-strong bg-white px-3 focus-within:border-forest-800">
                <SearchIcon size={18} className="text-muted" />
                <span className="sr-only">Search the audit log</span>
                <input
                  value={logQuery}
                  onChange={(e) => setLogQuery(e.target.value)}
                  placeholder="Search by person, member number or action"
                  className="min-w-0 flex-1 bg-transparent py-2 focus:outline-none"
                />
              </label>
              <ol className="m-0 list-none overflow-hidden rounded-[14px] border border-line bg-white p-0">
                {filteredLog.length === 0 && <li className="px-4 py-6 text-center text-muted">No entries match “{logQuery}”.</li>}
                {filteredLog.map((l, i) => (
                  <li key={i} className={`grid gap-x-4 gap-y-0.5 px-4 py-3 text-[15px] sm:grid-cols-[150px_150px_1fr] ${i ? "border-t border-[#EDE4C6]" : ""}`}>
                    <span className="text-muted">{l.when}</span>
                    <b>{l.who}</b>
                    <span>{l.what}</span>
                  </li>
                ))}
              </ol>
              <p className="m-0 text-sm text-muted">Every change is recorded (who, what, when) and kept for at least 7 years.</p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function PaymentRow({
  p,
  canAct,
  manualFor,
  manualPick,
  setManualPick,
  onManual,
  onSave,
  onConfirm,
  layout,
}: {
  p: Payment;
  canAct: boolean;
  manualFor: string | null;
  manualPick: string;
  setManualPick: (v: string) => void;
  onManual: (id: string | null) => void;
  onSave: (p: Payment) => void;
  onConfirm: (p: Payment) => void;
  layout: "table" | "card";
}) {
  const action =
    p.status === "Confirmed" ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-100 px-2.5 py-1 text-[13px] font-bold text-forest-800">
        <CheckIcon size={14} /> Confirmed
      </span>
    ) : manualFor === p.id ? (
      <span className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`m-${p.id}-${layout}`}>
          Member to match
        </label>
        <select
          id={`m-${p.id}-${layout}`}
          value={manualPick}
          onChange={(e) => setManualPick(e.target.value)}
          className="min-h-10 rounded-lg border border-line-strong bg-white px-2 text-sm"
        >
          {MEMBERS_FOR_MATCHING.map((m) => (
            <option key={m.no} value={m.no}>
              {m.no} · {m.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onSave(p)} className="min-h-10 rounded-lg bg-forest-800 px-3 text-sm font-bold text-cream">
          Save
        </button>
        <button type="button" onClick={() => onManual(null)} className="min-h-10 px-2 text-sm font-semibold text-muted underline">
          Cancel
        </button>
      </span>
    ) : p.match ? (
      <button
        type="button"
        disabled={!canAct}
        onClick={() => onConfirm(p)}
        className="min-h-10 rounded-lg border border-forest-800 bg-white px-3.5 font-bold text-forest-800 hover:bg-forest-100 disabled:opacity-45"
      >
        Confirm
      </button>
    ) : (
      <button
        type="button"
        disabled={!canAct}
        onClick={() => onManual(p.id)}
        className="min-h-10 rounded-lg border border-gold-dark bg-butter px-3.5 font-bold text-gold-ink hover:bg-[#F5E2A8] disabled:opacity-45"
      >
        Match manually
      </button>
    );

  const matched = p.match ?? <span className="font-semibold text-danger">Not matched</span>;

  if (layout === "table") {
    return (
      <tr className="border-t border-[#EDE4C6] align-middle">
        <td className="px-3.5 py-3">
          <b>{p.amount}</b>
          <br />
          <span className="text-[13px] text-muted">{p.account}</span>
        </td>
        <td className="px-3.5 py-3">{p.ref}</td>
        <td className="px-3.5 py-3">{matched}</td>
        <td className="px-3.5 py-3">{p.type}</td>
        <td className="px-3.5 py-3">{action}</td>
      </tr>
    );
  }
  return (
    <li className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-4 text-[15px]">
      <div className="flex items-baseline justify-between gap-2">
        <b className="text-lg">{p.amount}</b>
        <span className="text-[13px] text-muted">{p.account}</span>
      </div>
      <div>
        <span className="text-muted">Reference: </span>
        {p.ref}
      </div>
      <div>
        <span className="text-muted">Matched to: </span>
        {matched}
      </div>
      <div>
        <span className="text-muted">Type: </span>
        {p.type}
      </div>
      <div className="pt-1">{action}</div>
    </li>
  );
}
