"use client";

import { Fragment, useRef, useState } from "react";
import { ACCOUNT_CURRENCY, ACCOUNT_LABEL, RATES, TODAY, type AccountId, type BankLine, type Cur } from "@/lib/admin-data";
import { useToast } from "@/components/ui/Toast";
import { DownloadIcon, FileIcon } from "@/components/ui/Icons";
import { confirmLine } from "../actions";
import { useAdmin } from "../store";
import { download, fmtDate, money, naira, nairaAuto, normRef, num, parseCsv } from "../lib";
import { Banner, Btn, Card, Empty, Field, PageHeader, Pill, ReadOnly, StatTile, Table, Td, Th, cx, inputCls } from "../ui";

type Filter = "action" | "Suspense" | "Matched — to confirm" | "Credited" | "Returned" | "all";

const SAMPLE_CSV = `date,amount,currency,reference,account,fx_rate
${TODAY},5000,NGN,HB-ED-ED-000012,UBA,
${TODAY},25,GBP,HB-ED-UK-000045,GBP-dom,2041.5
${TODAY},40,USD,HB-FC-US-000027,USD-dom,1509
${TODAY},15000,NGN,TRANSFER FROM IYABO,UBA,
${TODAY},10,GBP,HB ED UK 000003,GBP-dom,2041.5
`;

let lineSeq = 3000;

export function ContributionsScreen() {
  const s = useAdmin();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = s.ui<Filter>("pay.filter", "action");
  const [account, setAccount] = s.ui("pay.account", "all");
  const [result, setResult] = s.ui<null | { file: string; added: number; auto: number; suspense: number; dupes: number; errors: string[] }>("pay.import", null);
  const [manualFor, setManualFor] = useState<string | null>(null);
  const [pick, setPick] = useState("");

  const act = s.access("contributions") === "act";
  const canMatch = s.can("pay.match");
  const matchReason = canMatch ? undefined : "Only the Finance officer matches and confirms payments.";
  const byRef = new Map(s.members.map((m) => [normRef(m.no), m.no]));

  const count = (st: BankLine["matchStatus"]) => s.lines.filter((l) => l.matchStatus === st).length;
  const shown = s.lines
    .filter((l) => (filter === "all" ? true : filter === "action" ? l.matchStatus === "Suspense" || l.matchStatus === "Matched — to confirm" : l.matchStatus === filter))
    .filter((l) => account === "all" || l.account === account)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt) || b.id.localeCompare(a.id));

  const month = TODAY.slice(0, 7);
  const creditedMonth = s.lines.filter((l) => l.matchStatus === "Credited" && l.receivedAt.startsWith(month)).reduce((t, l) => t + l.ngnValue, 0);
  const unallocated = s.members.reduce((t, m) => t + s.credit(m.no), 0);
  const suspenseValue = s.lines.filter((l) => l.matchStatus === "Suspense").reduce((t, l) => t + l.ngnValue, 0);

  async function onFile(f: File) {
    const text = await f.text();
    const rows = parseCsv(text);
    if (rows.length && /date/i.test(rows[0][0])) rows.shift();
    const errors: string[] = [];
    const added: BankLine[] = [];
    let dupes = 0;
    rows.forEach((r, i) => {
      const [date, amountRaw, currencyRaw, reference, accountRaw, fxRaw] = r;
      const line = i + 2;
      const amount = Number(String(amountRaw ?? "").replace(/[,₦£$\s]/g, ""));
      const currency = (currencyRaw ?? "").toUpperCase() as Cur;
      const acc = (["UBA", "USD-dom", "GBP-dom"] as AccountId[]).find((a) => a.toLowerCase() === (accountRaw ?? "").toLowerCase());
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return errors.push(`Line ${line}: date must be YYYY-MM-DD.`);
      if (!(amount > 0)) return errors.push(`Line ${line}: amount must be a positive number.`);
      if (!acc) return errors.push(`Line ${line}: account must be UBA, USD-dom or GBP-dom.`);
      if (ACCOUNT_CURRENCY[acc] !== currency) return errors.push(`Line ${line}: ${currency || "blank currency"} cannot arrive in the ${acc} account.`);
      if (!reference) return errors.push(`Line ${line}: reference is empty.`);
      const fx = currency === "NGN" ? 1 : Number(fxRaw) > 0 ? Number(fxRaw) : RATES[currency];
      const dup = [...s.lines, ...added].some((l) => l.receivedAt === date && l.amount === amount && l.account === acc && l.bankRef === reference);
      if (dup) {
        dupes++;
        return;
      }
      const hit = byRef.get(normRef(reference)) ?? null;
      added.push({
        id: `BL-${lineSeq++}`,
        receivedAt: date,
        account: acc,
        amount,
        currency,
        fxRate: fx,
        ngnValue: Math.round(amount * fx * 100) / 100,
        bankRef: reference,
        matchStatus: hit ? "Matched — to confirm" : "Suspense",
        memberNo: hit,
        matchedBy: hit ? "auto" : undefined,
        source: "import",
        note: currency !== "NGN" && !(Number(fxRaw) > 0) ? "No bank rate in file — example rate used; check against the statement" : undefined,
      });
    });
    s.setLines((cur) => [...cur, ...added]);
    const auto = added.filter((l) => l.memberNo).length;
    s.addLog("Imported bank statement", f.name, "—", `${added.length} lines · ${auto} auto-matched · ${added.length - auto} to suspense · ${dupes} duplicates skipped · ${errors.length} errors`);
    setResult({ file: f.name, added: added.length, auto, suspense: added.length - auto, dupes, errors });
    setFilter("action");
    toast(`Imported ${added.length} line(s): ${auto} auto-matched, ${added.length - auto} to suspense.`);
  }

  function rerunAuto() {
    const hits = s.lines.filter((l) => l.matchStatus === "Suspense" && byRef.has(normRef(l.bankRef)));
    if (!hits.length) {
      toast("No suspense line has a reference that matches a member number on the register.", "warn");
      return;
    }
    s.setLines((cur) => cur.map((l) => (hits.some((h) => h.id === l.id) ? { ...l, matchStatus: "Matched — to confirm", memberNo: byRef.get(normRef(l.bankRef))!, matchedBy: "auto" } : l)));
    hits.forEach((h) => s.addLog("Auto-matched bank line", h.id, "Suspense", `Matched — to confirm · ${byRef.get(normRef(h.bankRef))}`));
    toast(`${hits.length} line(s) auto-matched. Confirm each one to credit it.`);
  }

  function confirm(l: BankLine) {
    const r = confirmLine(s, l);
    toast(r.msg, r.ok ? "info" : "warn");
  }

  function saveManual(l: BankLine) {
    const m = s.member(pick);
    if (!m) {
      toast("Choose the member this payment belongs to.", "warn");
      return;
    }
    s.setLines((cur) => cur.map((x) => (x.id === l.id ? { ...x, matchStatus: "Matched — to confirm", memberNo: m.no, matchedBy: s.role.person } : x)));
    s.addLog("Manually matched bank line", `${l.id} (${l.bankRef})`, "Suspense", `Matched — to confirm · ${m.no}`);
    setManualFor(null);
    toast(`Matched to ${m.no}. Confirm it to issue shares — nothing is credited until then.`);
  }

  function unmatch(l: BankLine) {
    s.setLines((cur) => cur.map((x) => (x.id === l.id ? { ...x, matchStatus: "Suspense", memberNo: null, matchedBy: undefined } : x)));
    s.addLog("Returned bank line to suspense", l.id, `Matched — to confirm · ${l.memberNo}`, "Suspense");
    toast(`${l.id} moved back to suspense.`);
  }

  function returnToPayer(l: BankLine) {
    s.setLines((cur) => cur.map((x) => (x.id === l.id ? { ...x, matchStatus: "Returned", note: "Returned to payer — not a share contribution" } : x)));
    s.addLog("Marked bank line for return to payer", l.id, "Suspense", "Returned");
    toast(`${l.id} marked for return to the payer.`);
  }

  const importReason = !s.can("pay.import") ? "Only the Finance officer imports bank statements." : undefined;
  const members = s.members.filter((m) => m.status !== "Withdrawn" && m.status !== "Deceased");

  const tabs: [Filter, string, number | null][] = [
    ["action", "Needs action", count("Suspense") + count("Matched — to confirm")],
    ["Suspense", "Suspense", count("Suspense")],
    ["Matched — to confirm", "To confirm", count("Matched — to confirm")],
    ["Credited", "Credited", count("Credited")],
    ["Returned", "Returned", count("Returned")],
    ["all", "All lines", s.lines.length],
  ];

  return (
    <>
      <PageHeader
        title="Contributions"
        subtitle="Payments and reconciliation · UBA, USD and GBP domiciliary accounts"
        actions={
          <>
            <Btn onClick={() => download("homebridge-sample-statement.csv", SAMPLE_CSV)}>
              <DownloadIcon size={17} /> Sample CSV
            </Btn>
            <Btn variant="primary" reason={importReason} onClick={() => fileRef.current?.click()}>
              <FileIcon size={17} /> Import statement (CSV)
            </Btn>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              tabIndex={-1}
              aria-label="Bank statement CSV file"
              data-testid="statement-file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
          </>
        }
      />

      {!act ? <ReadOnly why={`${s.role.title} can see every bank line but cannot import, match or confirm. That is the Finance officer’s job.`} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile tone="warm" label="In suspense" value={count("Suspense")} sub={`${nairaAuto(suspenseValue)} — not credited to anyone`} />
        <StatTile label="Matched — to confirm" value={count("Matched — to confirm")} sub="Auto or manual match, waiting for an officer" />
        <StatTile label="Credited this month" value={naira(Math.round(creditedMonth))} sub="Turned into shares at ₦1,000 each" />
        <StatTile label="Unallocated credit" value={nairaAuto(Math.round(unallocated))} sub="Remainders below one share, held per member" />
      </div>

      {result ? (
        <Banner tone={result.errors.length ? "warn" : "info"} title={`Imported ${result.file}:`}>
          {result.added} new line(s) — {result.auto} auto-matched on member number, {result.suspense} to suspense, {result.dupes} duplicate(s) skipped.
          {result.errors.length ? (
            <ul className="m-0 mt-1 list-disc pl-5">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
          <button type="button" className="ml-2 font-semibold underline" onClick={() => setResult(null)}>
            Dismiss
          </button>
        </Banner>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div role="tablist" aria-label="Filter bank lines" className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {tabs.map(([id, label, n]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
                className={cx(
                  "min-h-9 rounded-full border px-3.5 text-[13.5px] font-semibold transition",
                  filter === id ? "border-forest-800 bg-forest-800 text-cream" : "border-line bg-paper text-forest-800 hover:bg-mist",
                )}
              >
                {label}
                {n !== null ? <span className={cx("ml-1.5", filter === id ? "text-gold-soft" : "text-muted")}>{n}</span> : null}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <select value={account} onChange={(e) => setAccount(e.target.value)} className={`${inputCls} w-52`} aria-label="Account">
                <option value="all">All accounts</option>
                {(Object.keys(ACCOUNT_LABEL) as AccountId[]).map((a) => (
                  <option key={a} value={a}>
                    {ACCOUNT_LABEL[a]}
                  </option>
                ))}
            </select>
            <Btn reason={matchReason} onClick={rerunAuto}>
              Re-run auto-match
            </Btn>
          </div>
        </div>

        <div className="mt-5">
          {shown.length === 0 ? (
            <Empty title={filter === "action" ? "Nothing waiting. Every bank line is matched and credited." : "No bank lines here."}>
              Import a statement to add new lines. Lines whose reference is a member number are matched automatically.
            </Empty>
          ) : (
            <Table minWidth={1040} label="Bank lines">
              <thead>
                <tr>
                  <Th>Received</Th>
                  <Th>Account</Th>
                  <Th right>Amount</Th>
                  <Th right>FX rate</Th>
                  <Th right>Naira value</Th>
                  <Th>Reference</Th>
                  <Th>Match</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => {
                  const m = s.member(l.memberNo);
                  const preview = l.memberNo ? Math.floor((l.ngnValue + s.credit(l.memberNo)) / s.settings.sharePrice) : 0;
                  return (
                    <Fragment key={l.id}>
                      <tr>
                        <Td className="whitespace-nowrap">
                          {fmtDate(l.receivedAt, true)}
                          <div className="text-[12px] text-muted">{l.id}</div>
                        </Td>
                        <Td className="whitespace-nowrap">{l.account}</Td>
                        <Td right className="font-semibold">
                          {money(l.amount, l.currency)}
                        </Td>
                        <Td right>{l.fxRate === 1 ? "—" : num(l.fxRate)}</Td>
                        <Td right>{nairaAuto(l.ngnValue)}</Td>
                        <Td className="max-w-[200px] break-words">{l.bankRef}</Td>
                        <Td>
                          <div className="flex flex-col items-start gap-1">
                            <Pill>{l.matchStatus}</Pill>
                            {m ? (
                              <button type="button" onClick={() => s.openProfile(m.no)} className="text-left text-[12.5px] font-semibold text-forest-800 hover:underline">
                                {m.no} · {m.name}
                              </button>
                            ) : l.memberNo ? (
                              <span className="text-[12.5px] text-muted">{l.memberNo}</span>
                            ) : null}
                            {l.matchedBy && l.matchStatus !== "Credited" ? <span className="text-[12px] text-muted">by {l.matchedBy}</span> : null}
                            {l.note ? <span className="max-w-[220px] text-[12px] text-muted">{l.note}</span> : null}
                          </div>
                        </Td>
                        <Td>
                          {l.matchStatus === "Matched — to confirm" ? (
                            <div className="flex flex-wrap gap-1.5">
                              <Btn size="sm" variant="primary" reason={matchReason} onClick={() => confirm(l)} title={`Issues ${preview} share(s)`}>
                                Confirm
                              </Btn>
                              <Btn size="sm" variant="ghost" reason={matchReason} onClick={() => unmatch(l)}>
                                Unmatch
                              </Btn>
                            </div>
                          ) : l.matchStatus === "Suspense" ? (
                            <div className="flex flex-wrap gap-1.5">
                              <Btn
                                size="sm"
                                variant="gold"
                                reason={matchReason}
                                aria-expanded={manualFor === l.id}
                                onClick={() => {
                                  setManualFor(manualFor === l.id ? null : l.id);
                                  setPick("");
                                }}
                              >
                                Match manually
                              </Btn>
                              <Btn size="sm" variant="ghost" reason={matchReason} onClick={() => returnToPayer(l)}>
                                Return
                              </Btn>
                            </div>
                          ) : (
                            <span className="text-[13px] text-muted">{l.matchStatus === "Credited" ? "Posted to ledger" : "No action"}</span>
                          )}
                        </Td>
                      </tr>
                      {manualFor === l.id ? (
                        <tr>
                          <td colSpan={8} className="border-b border-line/80 bg-[#FBF8EE] px-3 py-3">
                            <div className="flex flex-wrap items-end gap-2.5">
                              <Field label={`Match ${money(l.amount, l.currency)} (“${l.bankRef}”) to`} className="min-w-[260px] flex-1 sm:max-w-md">
                                <select value={pick} onChange={(e) => setPick(e.target.value)} className={inputCls} aria-label="Member to match">
                                  <option value="">Choose a member…</option>
                                  {members.map((mm) => (
                                    <option key={mm.no} value={mm.no}>
                                      {mm.no} · {mm.name}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Btn variant="primary" onClick={() => saveManual(l)}>
                                Save match
                              </Btn>
                              <Btn variant="ghost" onClick={() => setManualFor(null)}>
                                Cancel
                              </Btn>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>

        <ul className="m-0 mt-4 flex list-disc flex-col gap-1 pl-5 text-[13px] text-muted">
          <li>Foreign currency converts to naira at the bank rate on the day received (11.2); original amount, currency, rate and naira value are all kept.</li>
          <li>Confirming issues whole {naira(s.settings.sharePrice)} shares; any remainder is held as unallocated credit and added to the next payment.</li>
          <li>Unmatched payments stay in suspense — nothing is credited to a member until an officer matches and confirms it. Issues that would cross the {s.settings.capPct}% cap are blocked.</li>
        </ul>
      </Card>
    </>
  );
}
