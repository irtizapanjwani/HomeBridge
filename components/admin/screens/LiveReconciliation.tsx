"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { notifyPayChange } from "../lib";
import { Banner, Btn, Card, CardTitle, Pill, cx, inputCls } from "../ui";

type Cur = "NGN" | "GBP" | "USD";
type Account = {
  currency: Cur;
  recordedTotal: number;
  recordedLabel: string;
  recordedCount: number;
  uploadedTotal: number;
  uploadedLabel: string;
  lineCount: number;
  openCount: number;
  signOff: null | { bankTotal: string; recordedTotal: string; difference: string; differenceValue: number; note: string; by: string; at: string; auto: boolean };
};
type Unmatched = { lineKey: string; currency: Cur; date: string; narration: string; amount: string; amountValue: number; daysOld: number; looksLikeBank: boolean };
type OldProof = { memberNo: string; name: string; amount: string; period: string; daysOld: number };
type Data = { label: string; current: string; accounts: Account[]; unmatched: Unmatched[]; proofs: OldProof[] };

const ACCOUNT_LABEL: Record<Cur, string> = { NGN: "Naira account (UBA)", GBP: "Pound sterling account", USD: "US dollar account" };
const SYM: Record<Cur, string> = { NGN: "₦", GBP: "£", USD: "$" };
const REASONS = ["Bank interest", "Refund or reversal", "Transfer between our accounts"];

/**
 * Member Platform brief §5 "Monthly reconciliation". The site does the check itself: every bank
 * payment from the uploaded statements must be recorded (or set aside as not a contribution), and
 * when they all are the account is signed off automatically. The officer only sees what is left,
 * and deals with each one in one click. Signing off by hand stays available for unusual cases.
 */
export function ReconciliationCard() {
  const toast = useToast();
  // Opens on this month, which is the one whose statement is usually being uploaded.
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Data | null>(null);
  const [members, setMembers] = useState<{ memberNo: string; name: string }[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const [bank, setBank] = useState<Record<Cur, string>>({ NGN: "", GBP: "", USD: "" });
  const [note, setNote] = useState<Record<Cur, string>>({ NGN: "", GBP: "", USD: "" });

  const load = useCallback(() => {
    setErr("");
    fetch(`/api/admin/reconciliation?period=${period}`)
      .then((r) => r.json())
      .then((d: Data & { ok?: boolean; error?: string }) => {
        if (!d.ok) return setErr(d.error || "Could not load the month-end check.");
        setData(d);
        setBank(Object.fromEntries(d.accounts.map((a) => [a.currency, a.uploadedTotal ? String(a.uploadedTotal) : ""])) as Record<Cur, string>);
      })
      .catch(() => setErr("Could not reach the server."));
  }, [period]);
  useEffect(load, [load]);
  useEffect(() => {
    fetch("/api/admin/contributions")
      .then((r) => r.json())
      .then((d: { ok?: boolean; members?: { memberNo: string; name: string }[] }) => d.ok && setMembers(d.members ?? []))
      .catch(() => {});
  }, []);

  async function call(url: string, body: Record<string, unknown>, done: string, key: string) {
    setBusy(key);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; receiptNo?: string; emailed?: boolean };
      if (!res.ok || !d.ok) throw new Error(d.error || `That did not work (error ${res.status}).`);
      toast(d.receiptNo ? `Recorded. Receipt ${d.receiptNo}${d.emailed ? " emailed to the member" : ""}.` : done);
      load();
      notifyPayChange();
    } catch (e) {
      toast(e instanceof Error ? e.message : "That did not work.", "warn");
    } finally {
      setBusy(null);
    }
  }

  const record = (l: Unmatched) =>
    call(
      "/api/admin/contributions",
      { memberNo: pick[l.lineKey], amount: l.amountValue, currency: l.currency, date: l.date, bankRef: l.narration.slice(0, 120), source: "statement", lineKey: l.lineKey },
      "Recorded.",
      l.lineKey,
    );
  const setAside = (l: Unmatched, reason: string) =>
    call("/api/admin/reconciliation", { action: "dismiss", lineKey: l.lineKey, reason }, "Set aside as not a contribution.", l.lineKey);

  const over = data ? period < data.current : true;
  const open = data?.unmatched ?? [];
  const used = data?.accounts.filter((a) => a.lineCount > 0) ?? [];
  const allGood = data && used.length > 0 && used.every((a) => a.signOff) && open.length === 0;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <CardTitle id="reconciliation" aside={allGood ? <Pill tone="green">All checked</Pill> : open.length ? <Pill tone="warm">{open.length} to sort</Pill> : null}>
        Month-end check
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        The site checks this for you. Every payment in the bank statements you upload must be recorded. When they all are, the account is{" "}
        <strong>signed off automatically</strong> once the month ends. You only need to act if a payment below couldn&rsquo;t be matched.
      </p>
      <label className="flex w-fit flex-col gap-1 text-[13.5px] font-semibold text-ink">
        Month
        <input type="month" value={period} max={data?.current} onChange={(e) => e.target.value && setPeriod(e.target.value)} className={cx(inputCls, "font-normal")} />
      </label>
      {err ? <Banner tone="danger">{err}</Banner> : null}

      {data ? (
        <>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {data.accounts.map((a) => {
              const state = a.signOff ? "signed" : a.lineCount === 0 ? "none" : a.openCount ? "open" : over ? "ready" : "running";
              return (
                <li
                  key={a.currency}
                  className={cx(
                    "flex flex-col gap-1 rounded-xl border p-3.5",
                    state === "signed" ? "border-[#CFE0D3] bg-mist" : state === "open" ? "border-[#EBD38B] bg-[#FCF1D4]" : "border-line bg-paper",
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <strong className="text-[15px] text-ink">{ACCOUNT_LABEL[a.currency]}</strong>
                    {state === "signed" ? (
                      <Pill tone="green">✓ Signed off{a.signOff?.auto ? " automatically" : ""}</Pill>
                    ) : state === "open" ? (
                      <Pill tone="warm">{a.openCount} to sort</Pill>
                    ) : null}
                  </span>
                  <span className="text-[14px] text-body">
                    {state === "none" ? (
                      <>No bank statement uploaded for {data.label}. Upload it at the top of the page and the check runs by itself.</>
                    ) : state === "open" ? (
                      <>
                        {a.lineCount - a.openCount} of {a.lineCount} bank payments are recorded. Sort the {a.openCount === 1 ? "one" : a.openCount} below and
                        it signs off by itself.
                      </>
                    ) : state === "running" ? (
                      <>All {a.lineCount} bank payments so far are recorded. It signs off automatically when {data.label} ends.</>
                    ) : state === "ready" ? (
                      <>All {a.lineCount} bank payments are recorded. Signing off…</>
                    ) : (
                      <>
                        {a.signOff!.note || `Bank ${a.signOff!.bankTotal}, recorded ${a.signOff!.recordedTotal}.`}{" "}
                        <span className="text-muted">
                          {a.uploadedLabel} came in · {a.signOff!.by}, {a.signOff!.at}
                        </span>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {open.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-[16px] font-bold text-ink">
                Payments to sort ({open.length})
              </h3>
              <p className="m-0 text-[13.5px] text-muted">
                The bank received these but we couldn&rsquo;t tell who paid. Pick the member and press Record (they get their receipt), or set it
                aside if it isn&rsquo;t a contribution.
              </p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {open.map((l) => (
                  <li key={l.lineKey} className="flex flex-col gap-2.5 rounded-xl border border-line p-3.5">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <strong className="text-[16px] text-ink">{l.amount}</strong>
                      <span className="text-[13.5px] text-muted">{l.date}</span>
                      {l.daysOld > 5 ? <span className="text-[12.5px] font-semibold text-danger">Waiting {l.daysOld} days</span> : null}
                    </span>
                    <span className="text-[14px] break-words text-body">&ldquo;{l.narration}&rdquo;</span>
                    {l.looksLikeBank ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-mist px-3 py-2 text-[13.5px]">
                        This looks like bank interest or a refund, not a member paying in.
                        <Btn size="sm" variant="primary" disabled={busy !== null} onClick={() => void setAside(l, "Bank interest or refund")}>
                          Yes, set it aside
                        </Btn>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={pick[l.lineKey] ?? ""}
                        onChange={(e) => setPick({ ...pick, [l.lineKey]: e.target.value })}
                        className={cx(inputCls, "min-w-[240px] flex-1 sm:max-w-sm")}
                        aria-label="Who paid"
                      >
                        <option value="">Who paid? Choose a member…</option>
                        {members.map((m) => (
                          <option key={m.memberNo} value={m.memberNo}>
                            {m.name} · {m.memberNo}
                          </option>
                        ))}
                      </select>
                      <Btn variant="primary" size="sm" disabled={busy !== null || !pick[l.lineKey]} onClick={() => void record(l)}>
                        {busy === l.lineKey ? "Saving…" : "Record"}
                      </Btn>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                      Not a contribution?
                      {REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          disabled={busy !== null}
                          onClick={() => void setAside(l, r)}
                          className="rounded-full border border-line px-2.5 py-1 font-semibold text-forest-800 hover:bg-mist disabled:opacity-50"
                        >
                          {r}
                        </button>
                      ))}
                      <input
                        value={other[l.lineKey] ?? ""}
                        onChange={(e) => setOther({ ...other, [l.lineKey]: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && (other[l.lineKey] ?? "").trim() && void setAside(l, other[l.lineKey])}
                        placeholder="Something else? Type and press Enter"
                        className={cx(inputCls, "h-8 min-w-[220px] text-[13px]")}
                        aria-label="What the payment is"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : data.accounts.some((a) => a.lineCount > 0) ? (
            <p className="m-0 text-[14px] font-semibold text-forest-800">Nothing to sort. Every bank payment is recorded.</p>
          ) : null}

          {data.proofs.length ? (
            <Banner tone="warn" title={`${data.proofs.length} proof${data.proofs.length === 1 ? " has" : "s have"} been waiting more than 5 days.`}>
              {data.proofs.map((p) => `${p.name} (${p.amount} for ${p.period})`).join(", ")}. Check them in &ldquo;Proofs of payment to check&rdquo; above.
            </Banner>
          ) : null}

          <details className="rounded-[14px] border border-line p-4">
            <summary className="cursor-pointer text-[14px] font-semibold text-forest-800">
              Sign off by hand <span className="font-normal text-muted">(only if the bank total differs for a reason you know)</span>
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {data.accounts.map((a) => {
                const entered = Number(bank[a.currency]);
                const diff = bank[a.currency] !== "" && Number.isFinite(entered) ? Math.round((entered - a.recordedTotal) * 100) / 100 : null;
                return (
                  <div key={a.currency} className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
                      {ACCOUNT_LABEL[a.currency]}: money in from the bank
                      <input
                        value={bank[a.currency]}
                        onChange={(e) => setBank({ ...bank, [a.currency]: e.target.value.replace(/[^\d.]/g, "") })}
                        inputMode="decimal"
                        placeholder={`${SYM[a.currency]}0`}
                        className={cx(inputCls, "w-44 font-normal")}
                      />
                    </label>
                    <span className="pb-2 text-[13px] text-muted">
                      Recorded {a.recordedLabel}
                      {diff !== null ? (diff === 0 ? " · balances" : ` · difference ${diff > 0 ? "+" : "−"}${SYM[a.currency]}${Math.abs(diff).toLocaleString("en-GB")}`) : ""}
                    </span>
                    <input
                      value={note[a.currency]}
                      onChange={(e) => setNote({ ...note, [a.currency]: e.target.value })}
                      placeholder={diff ? "Why is there a difference?" : "Note (optional)"}
                      className={cx(inputCls, "min-w-[200px] flex-1")}
                      aria-label={`Note, ${ACCOUNT_LABEL[a.currency]}`}
                    />
                    <Btn
                      size="sm"
                      disabled={busy !== null || diff === null || (diff !== 0 && !note[a.currency].trim())}
                      onClick={() =>
                        void call(
                          "/api/admin/reconciliation",
                          { action: "signoff", period, currency: a.currency, bankTotal: entered, note: note[a.currency] },
                          `${ACCOUNT_LABEL[a.currency]} signed off for ${data.label}.`,
                          `sign-${a.currency}`,
                        )
                      }
                    >
                      Sign off
                    </Btn>
                  </div>
                );
              })}
            </div>
          </details>
        </>
      ) : null}
    </Card>
  );
}
