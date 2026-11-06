"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { DownloadIcon, FileIcon } from "@/components/ui/Icons";
import { download, notifyPayChange } from "../lib";
import { Banner, Btn, Card, CardTitle, Pill, Table, Td, Th, cx, inputCls } from "../ui";

type Cur = "NGN" | "GBP" | "USD";
type Line = {
  line: number;
  date: string;
  narration: string;
  transactionRef: string;
  amount: number;
  lineKey: string;
  recordedAs?: string;
  suggestion: null | { memberNo: string; name: string; why: string };
  autoRecorded?: boolean;
  autoError?: string;
};
type Recent = { receiptNo: string; memberNo: string; amount: string; period: string; paidAt: string; bankRef: string; source: string; emailed: boolean };

const SAMPLE = `Date,Narration,Reference,Debit,Credit,Balance
30/10/2026,TRF FROM ADAEZE OKAFOR HBC-EDO-26-00008 CONTRIBUTION,UBA2610300001,,5000.00,105000.00
30/10/2026,NIP TRANSFER HBC EDO 26 00002,UBA2610300002,,10000.00,115000.00
30/10/2026,SMS ALERT CHARGES,,25.00,,114975.00
`;

const ACCOUNTS: [Cur, string][] = [
  ["NGN", "Naira account (UBA)"],
  ["GBP", "Pound sterling account"],
  ["USD", "US dollar account"],
];

const fmt = (n: number, c: Cur) => `${{ NGN: "₦", GBP: "£", USD: "$" }[c]}${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
const byName = (why: string) => why.toLowerCase().startsWith("name");

/** A line's state, in the order the officer should look at them. */
const stateOf = (l: Line) => (l.recordedAs ? (l.autoRecorded ? 2 : 3) : l.suggestion ? 0 : 1);

/**
 * Brief Phase 3: "Record contributions by member number (bank statement import, matched on
 * reference); issue receipt HBC-CR-YYMM-NNNNN". Written for an officer who has never seen it: three
 * steps, a plain summary after each upload, and the lines that need them listed first.
 */
export function LiveContributionsCard() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const handRef = useRef<HTMLDetailsElement>(null);
  const [currency, setCurrency] = useState<Cur>("NGN");
  const [lines, setLines] = useState<Line[] | null>(null);
  const [lineCurrency, setLineCurrency] = useState<Cur>("NGN");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);
  const [members, setMembers] = useState<{ memberNo: string; name: string }[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [handOpen, setHandOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [manual, setManual] = useState({ memberNo: "", amount: "", currency: "NGN" as Cur, date: today, bankRef: "", period: "" });

  const load = useCallback(() => {
    fetch("/api/admin/contributions")
      .then((r) => r.json())
      .then((d: { ok?: boolean; members?: typeof members; recent?: Recent[]; error?: string }) => {
        if (!d.ok) return setErr(d.error || "Could not load contributions.");
        setMembers(d.members ?? []);
        setRecent(d.recent ?? []);
      })
      .catch(() => setErr("Could not reach the server."));
  }, []);
  useEffect(load, [load]);

  const nameOf = (no: string) => members.find((m) => m.memberNo === no)?.name ?? "";

  async function read(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr("");
    setLines(null);
    try {
      const res = await fetch("/api/admin/contributions/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: await file.text(), currency, auto }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; lines?: Line[]; autoRecorded?: number };
      if (!res.ok || !d.ok) throw new Error(d.error || `Could not read the statement (error ${res.status}).`);
      setLines(d.lines ?? []);
      setLineCurrency(currency);
      setFileName(file.name);
      if (d.autoRecorded) {
        load();
        notifyPayChange();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read the statement.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function record(body: Record<string, unknown>): Promise<string | null> {
    const res = await fetch("/api/admin/contributions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; receiptNo?: string; emailed?: boolean };
    if (!res.ok || !d.ok) throw new Error(d.error || `Could not record (error ${res.status}).`);
    toast(
      d.emailed ? `Recorded. Receipt ${d.receiptNo} has been emailed to the member.` : `Recorded as ${d.receiptNo}, but the email did not go. See the audit log.`,
      d.emailed ? undefined : "warn",
    );
    load();
    notifyPayChange();
    return d.receiptNo ?? null;
  }

  async function confirm(l: Line) {
    if (!l.suggestion) return;
    setConfirming(l.line);
    try {
      const receiptNo = await record({
        memberNo: l.suggestion.memberNo,
        amount: l.amount,
        currency: lineCurrency,
        date: l.date,
        bankRef: l.transactionRef,
        source: "statement",
        lineKey: l.lineKey,
      });
      setLines((cur) => cur?.map((x) => (x.line === l.line ? { ...x, recordedAs: receiptNo ?? "Recorded" } : x)) ?? null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not record.", "warn");
    } finally {
      setConfirming(null);
    }
  }

  /** Opens "Record by hand" with the bank line's details already filled in. */
  function byHand(l: Line) {
    const iso = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(l.date);
    setManual({
      memberNo: "",
      amount: String(l.amount),
      currency: lineCurrency,
      date: iso ? `${iso[3]}-${iso[2]}-${iso[1]}` : /^\d{4}-\d{2}-\d{2}$/.test(l.date) ? l.date : today,
      bankRef: l.transactionRef || l.narration.slice(0, 60),
      period: "",
    });
    setHandOpen(true);
    setTimeout(() => handRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  async function saveManual() {
    setBusy(true);
    setErr("");
    try {
      await record({ ...manual, amount: Number(manual.amount), source: "manual", period: manual.period || undefined });
      setManual((m) => ({ ...m, memberNo: "", amount: "", bankRef: "", period: "" }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not record.");
    } finally {
      setBusy(false);
    }
  }

  const sorted = lines ? [...lines].sort((a, b) => stateOf(a) - stateOf(b) || a.line - b.line) : null;
  const autoDone = lines?.filter((l) => l.recordedAs && l.autoRecorded).length ?? 0;
  const youRecorded = lines?.filter((l) => l.recordedAs && !l.autoRecorded).length ?? 0;
  const toCheck = lines?.filter((l) => l.suggestion && !l.recordedAs).length ?? 0;
  const unknown = lines?.filter((l) => !l.suggestion && !l.recordedAs).length ?? 0;
  const shownRecent = showAll ? recent : recent.slice(0, 8);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <CardTitle id="live-contributions" aside={<Pill tone="green">Live</Pill>}>
        Record payments from the bank
      </CardTitle>

      <ol className="m-0 grid list-none gap-2 p-0 md:grid-cols-3">
        {[
          ["Get the statement", "Download the account statement from the bank as a CSV file. Excel can save one: File → Save as → CSV."],
          ["Upload it here", "Choose which account it is from, then press Upload statement."],
          ["Check what's left", "Payments with a member's number are recorded and receipts emailed. You only check the rest."],
        ].map(([title, text], i) => (
          <li key={title} className="flex gap-3 rounded-xl bg-mist p-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest-800 text-[13px] font-bold text-paper">{i + 1}</span>
            <span className="text-[13.5px] text-body">
              <strong className="block text-[14.5px] text-ink">{title}</strong>
              {text}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="flex flex-col gap-1 text-[13.5px] font-semibold text-ink">
            Which account is the statement from?
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Cur)} className={cx(inputCls, "min-w-[240px] font-normal")}>
              {ACCOUNTS.map(([c, label]) => (
                <option key={c} value={c}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void read(e.target.files?.[0])} />
          <Btn variant="primary" disabled={busy} onClick={() => fileRef.current?.click()}>
            <FileIcon size={17} /> {busy ? "Reading the statement…" : "Upload statement"}
          </Btn>
        </div>
        <label className="flex items-start gap-2.5 text-[14px] text-ink">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-forest-700" />
          <span>
            <strong>Record payments that include a member&rsquo;s number straight away</strong> (recommended)
            <span className="block text-[13px] text-muted">Untick this if you would rather check every payment yourself before it is recorded.</span>
          </span>
        </label>
        <button
          type="button"
          onClick={() => download("homebridge-statement-example.csv", SAMPLE)}
          className="flex w-fit items-center gap-1.5 text-[13px] font-semibold text-forest-800 underline underline-offset-[3px]"
        >
          <DownloadIcon size={15} /> Not sure what the file looks like? Download an example
        </button>
      </div>

      {err ? <Banner tone="danger">{err}</Banner> : null}

      {sorted ? (
        sorted.length === 0 ? (
          <Banner tone="info">There were no payments in that statement. Check you picked the right file.</Banner>
        ) : (
          <div className="flex flex-col gap-3">
            <h3 className="m-0 text-[16px] font-bold text-ink">
              {fileName}: {sorted.length} payment{sorted.length === 1 ? "" : "s"} in
            </h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <Tile tone="green" n={autoDone + youRecorded} label="Recorded, receipt emailed" />
              <Tile tone={toCheck ? "warm" : "plain"} n={toCheck} label="Need you to check" />
              <Tile tone={unknown ? "warm" : "plain"} n={unknown} label="We couldn't tell who paid" />
            </div>
            {toCheck || unknown ? (
              <p className="m-0 text-[14px] text-body">
                The payments that need you are at the top of the list. Press <strong>Confirm</strong> if the member is right, or{" "}
                <strong>Record by hand</strong> to choose the member yourself. Bank charges and anything that isn&rsquo;t a contribution can be left alone.
              </p>
            ) : (
              <p className="m-0 text-[14px] font-semibold text-forest-800">All done. Every payment in this statement is recorded.</p>
            )}
            <Table minWidth={820} label="Payments in the statement">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>What the bank says</Th>
                  <Th>Amount</Th>
                  <Th>Who paid</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((l) => (
                  <tr key={l.line} className={!l.recordedAs ? "bg-[#FCF8EC]" : undefined}>
                    <Td className="whitespace-nowrap">{l.date}</Td>
                    <Td>
                      <span className="block max-w-[300px] break-words">{l.narration}</span>
                    </Td>
                    <Td className="font-semibold">{fmt(l.amount, lineCurrency)}</Td>
                    <Td>
                      {l.suggestion ? (
                        <span className="block">
                          <strong>{l.suggestion.name}</strong>
                          <span className="block font-mono text-[12.5px] text-muted">{l.suggestion.memberNo}</span>
                          {!l.recordedAs && byName(l.suggestion.why) ? (
                            <span className="block text-[12.5px] font-semibold text-danger">Found by name only. Please check it&rsquo;s the right person.</span>
                          ) : null}
                        </span>
                      ) : l.recordedAs ? null : (
                        <span className="text-[13.5px] text-muted">Not sure. No member number in the bank text.</span>
                      )}
                    </Td>
                    <Td>
                      {l.recordedAs ? (
                        <span className="flex flex-col items-start gap-1">
                          <Pill tone="green">✓ Recorded</Pill>
                          <span className="font-mono text-[12px] text-muted">{l.recordedAs}</span>
                          {l.autoRecorded ? <span className="text-[12px] text-muted">Done automatically</span> : null}
                        </span>
                      ) : (
                        <span className="flex flex-col items-start gap-1.5">
                          {l.suggestion ? (
                            <Btn size="sm" variant="primary" disabled={confirming !== null} onClick={() => void confirm(l)}>
                              {confirming === l.line ? "Recording…" : `Confirm, it's ${l.suggestion.name.split(/\s+/)[0]}`}
                            </Btn>
                          ) : null}
                          <Btn size="sm" onClick={() => byHand(l)}>
                            {l.suggestion ? "Different member" : "Record by hand"}
                          </Btn>
                          {l.autoError ? <span className="max-w-[200px] text-[12px] text-danger">{l.autoError}</span> : null}
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )
      ) : null}

      <details
        ref={handRef}
        open={handOpen}
        onToggle={(e) => setHandOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="rounded-[14px] border border-line p-4"
      >
        <summary className="cursor-pointer text-[14.5px] font-semibold text-forest-800">
          Record a payment by hand <span className="font-normal text-muted">(cash, or a payment the statement could not match)</span>
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-[13.5px] font-semibold text-ink">
            Who paid?
            <select value={manual.memberNo} onChange={(e) => setManual({ ...manual, memberNo: e.target.value })} className={cx(inputCls, "font-normal")}>
              <option value="">Choose a member…</option>
              {members.map((m) => (
                <option key={m.memberNo} value={m.memberNo}>
                  {m.name} · {m.memberNo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13.5px] font-semibold text-ink">
            How much?
            <input
              value={manual.amount}
              onChange={(e) => setManual({ ...manual, amount: e.target.value.replace(/[^\d.]/g, "") })}
              inputMode="decimal"
              placeholder="e.g. 5000"
              className={cx(inputCls, "font-normal")}
            />
          </label>
          <label className="flex flex-col gap-1 text-[13.5px] font-semibold text-ink">
            Currency
            <select value={manual.currency} onChange={(e) => setManual({ ...manual, currency: e.target.value as Cur })} className={cx(inputCls, "font-normal")}>
              <option value="NGN">Naira (₦)</option>
              <option value="GBP">Pounds (£)</option>
              <option value="USD">Dollars ($)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[13.5px] font-semibold text-ink">
            Date received
            <input type="date" max={today} value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} className={cx(inputCls, "font-normal")} />
          </label>
          <label className="flex flex-col gap-1 text-[13.5px] font-semibold text-ink">
            Bank reference <span className="font-normal text-muted">(optional)</span>
            <input value={manual.bankRef} onChange={(e) => setManual({ ...manual, bankRef: e.target.value })} className={cx(inputCls, "font-normal")} />
          </label>
          <label className="flex flex-col gap-1 text-[13.5px] font-semibold text-ink">
            Which month is it for? <span className="font-normal text-muted">(optional)</span>
            <input type="month" value={manual.period} onChange={(e) => setManual({ ...manual, period: e.target.value })} className={cx(inputCls, "font-normal")} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Btn variant="primary" disabled={busy || !manual.memberNo || !manual.amount} onClick={() => void saveManual()}>
            Record and email the receipt
          </Btn>
          {!manual.memberNo || !manual.amount ? <span className="text-[13px] text-muted">Choose who paid and how much.</span> : null}
        </div>
      </details>

      <div className="flex flex-col gap-2">
        <h3 className="m-0 text-[16px] font-bold text-ink">Payments recorded so far</h3>
        {recent.length === 0 ? (
          <p className="m-0 text-[14px] text-muted">None yet. Upload a statement above to start.</p>
        ) : (
          <>
            <Table minWidth={760} label="Payments recorded">
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Amount</Th>
                  <Th>For month</Th>
                  <Th>Received</Th>
                  <Th>Receipt</Th>
                </tr>
              </thead>
              <tbody>
                {shownRecent.map((c) => (
                  <tr key={c.receiptNo}>
                    <Td>
                      <strong className="block">{nameOf(c.memberNo) || c.memberNo}</strong>
                      {nameOf(c.memberNo) ? <span className="block font-mono text-[12.5px] text-muted">{c.memberNo}</span> : null}
                    </Td>
                    <Td className="font-semibold">{c.amount}</Td>
                    <Td>{c.period}</Td>
                    <Td>{c.paidAt}</Td>
                    <Td>
                      <a
                        href={`/api/admin/contributions/${encodeURIComponent(c.receiptNo)}`}
                        target="_blank"
                        rel="noopener"
                        className="text-[13.5px] font-semibold text-forest-800 underline underline-offset-[3px]"
                      >
                        {c.receiptNo}
                      </a>
                      <span className={cx("block text-[12px]", c.emailed ? "text-muted" : "font-semibold text-danger")}>
                        {c.emailed ? "Emailed to member" : "Not emailed"}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {recent.length > 8 ? (
              <button type="button" onClick={() => setShowAll(!showAll)} className="w-fit text-[13.5px] font-semibold text-forest-800 underline underline-offset-[3px]">
                {showAll ? "Show fewer" : `Show all ${recent.length}`}
              </button>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}

function Tile({ n, label, tone }: { n: number; label: string; tone: "green" | "warm" | "plain" }) {
  return (
    <div
      className={cx(
        "rounded-xl border p-3",
        tone === "green" ? "border-[#CFE0D3] bg-mist" : tone === "warm" ? "border-[#EBD38B] bg-[#FCF1D4]" : "border-line bg-paper",
      )}
    >
      <div className="text-[26px] leading-none font-bold text-ink">{n}</div>
      <div className="mt-1 text-[13.5px] text-body">{label}</div>
    </div>
  );
}
