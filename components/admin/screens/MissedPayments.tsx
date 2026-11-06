"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { DownloadIcon } from "@/components/ui/Icons";
import { download, notifyPayChange, toCsv } from "../lib";
import { Banner, Btn, Card, CardTitle, Pill, Table, Td, Th, cx, inputCls } from "../ui";

type Row = {
  memberNo: string;
  name: string;
  email: string;
  chapter: string;
  minimum: string;
  state: "Not paid" | "Below minimum";
  paid: string;
  monthsShort: number;
  shortMonths: string[];
  lastPaid: string;
  remindedAt: string | null;
};
type Data = { period: string; current: string; label: string; checked: number; paidCount: number; rows: Row[] };

/**
 * Brief Phase 3: "flag missed months against the minimum; optional reminder emails". Reads the live
 * contributions ledger for one month; reminders (Email F) go only when an officer clicks.
 */
export function MissedPaymentsCard() {
  const toast = useToast();
  const [period, setPeriod] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [auto, setAuto] = useState<{ on: boolean; cronReady: boolean } | null>(null);

  const loadAuto = useCallback(() => {
    fetch("/api/admin/settings/payment-reminders")
      .then((r) => r.json())
      .then((d: { ok?: boolean; on?: boolean; cronReady?: boolean }) => d.ok && setAuto({ on: Boolean(d.on), cronReady: Boolean(d.cronReady) }))
      .catch(() => {});
  }, []);
  useEffect(loadAuto, [loadAuto]);

  async function switchAuto(on: boolean) {
    if (
      !window.confirm(
        on
          ? "Switch on automatic reminders?\n\nFrom tomorrow morning, every member who hasn't paid this month gets reminder emails on day 1, 5, 7, 8 and 15. Real members will be emailed."
          : "Switch off automatic reminders? Members will only be reminded when you press a button here.",
      )
    )
      return;
    setBusy("auto");
    try {
      const res = await fetch("/api/admin/settings/payment-reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on }) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || "That did not work.");
      toast(on ? "Automatic reminders are on." : "Automatic reminders are off.");
      loadAuto();
    } catch (e) {
      toast(e instanceof Error ? e.message : "That did not work.", "warn");
    } finally {
      setBusy(null);
    }
  }

  const load = useCallback((p: string) => {
    setErr("");
    fetch(`/api/admin/contributions/missed${p ? `?period=${p}` : ""}`)
      .then((r) => r.json())
      .then((d: Data & { ok?: boolean; error?: string }) => {
        if (!d.ok) return setErr(d.error || "Could not check payments.");
        setData(d);
        setPeriod(d.period);
      })
      .catch(() => setErr("Could not reach the server."));
  }, []);
  useEffect(() => load(""), [load]);

  async function remind(target: { memberNos: string[] } | { all: true }, key: string) {
    if ("all" in target && !window.confirm(`Email every member who is short for ${data?.label} and has not been reminded yet?`)) return;
    setBusy(key);
    try {
      const res = await fetch("/api/admin/contributions/missed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, ...target }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; sent?: number; failed?: number; skipped?: number; errors?: string[] };
      if (!res.ok || !d.ok) throw new Error(d.error || `Could not send (error ${res.status}).`);
      const parts = [`${d.sent} reminder${d.sent === 1 ? "" : "s"} emailed`];
      if (d.failed) parts.push(`${d.failed} failed — see the audit log`);
      if (d.skipped) parts.push(`${d.skipped} skipped (already paid)`);
      toast(parts.join(" · "), d.failed ? "warn" : undefined);
      load(period);
      notifyPayChange();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not send.", "warn");
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    if (!data) return;
    download(
      `homebridge-missed-payments-${data.period}.csv`,
      toCsv(
        ["Member no.", "Name", "Email", "Chapter", "Minimum", "Status", "Received this month", "Months short", "Which months", "Last paid", "Reminded"],
        data.rows.map((r) => [r.memberNo, r.name, r.email, r.chapter, r.minimum, r.state, r.paid, r.monthsShort, r.shortMonths.join("; "), r.lastPaid, r.remindedAt ?? ""]),
      ),
    );
  }

  const unreminded = data?.rows.filter((r) => !r.remindedAt).length ?? 0;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <CardTitle id="missed-payments" aside={<Pill tone="green">Live</Pill>}>
        Who hasn&rsquo;t paid
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        Members who haven&rsquo;t paid at least the monthly minimum (₦5,000 or £25) for the month you pick. A member drops off this list as
        soon as their payment is recorded.
      </p>

      {auto ? (
        <div className={cx("flex flex-col gap-2 rounded-xl border p-3.5 sm:flex-row sm:items-center", auto.on ? "border-[#CFE0D3] bg-mist" : "border-line bg-paper")}>
          <div className="flex-1 text-[14px] text-body">
            <strong className="block text-[15px] text-ink">Automatic reminders: {auto.on ? "ON" : "OFF"}</strong>
            {auto.on ? (
              <>
                Every morning at 8:00 (Lagos), members who haven&rsquo;t paid are emailed automatically: on day 1 (payment due), day 5 (reminder),
                day 7 (last day), day 8 (overdue) and day 15 (second notice). Each email goes once, and stops as soon as they pay. You don&rsquo;t
                need to press anything.
              </>
            ) : (
              <>
                Nobody is reminded unless you press a button below. Switch it on and members who haven&rsquo;t paid are emailed automatically on
                day 1, 5, 7, 8 and 15 of each month until they pay.
              </>
            )}
            {auto.on && !auto.cronReady ? (
              <span className="mt-1 block font-semibold text-danger">
                The daily job can&rsquo;t run yet: CRON_SECRET is missing in Vercel&rsquo;s settings, so no automatic emails will go. Add it, then
                redeploy.
              </span>
            ) : null}
          </div>
          <Btn variant={auto.on ? "outline" : "primary"} disabled={busy !== null} onClick={() => void switchAuto(!auto.on)}>
            {busy === "auto" ? "Saving…" : auto.on ? "Switch off" : "Switch on"}
          </Btn>
        </div>
      ) : null}


      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          Month
          <input
            type="month"
            value={period}
            max={data?.current}
            onChange={(e) => {
              setPeriod(e.target.value);
              if (e.target.value) load(e.target.value);
            }}
            className={cx(inputCls, "min-w-[200px]")}
          />
        </label>
        <Btn variant="primary" disabled={!data || unreminded === 0 || busy !== null} onClick={() => void remind({ all: true }, "all")}>
          {busy === "all" ? "Sending…" : `Remind everyone not reminded yet, now (${unreminded})`}
        </Btn>
        <Btn disabled={!data || data.rows.length === 0} onClick={exportCsv}>
          <DownloadIcon size={17} /> Export list (CSV)
        </Btn>
      </div>
      {err ? <Banner tone="danger">{err}</Banner> : null}

      {!data ? (
        <p className="m-0 text-[14px] text-muted">Checking…</p>
      ) : (
        <>
          <p className="m-0 text-[13.5px] text-muted">
            {data.label}: {data.checked} member{data.checked === 1 ? "" : "s"} checked · {data.paidCount} paid the minimum ·{" "}
            <strong className="text-danger">{data.rows.length} short</strong>
            {data.period === data.current ? " · this month is not over yet" : ""}
          </p>
          {data.rows.length === 0 ? (
            <Banner tone="info">{data.checked ? `Everyone has paid the minimum for ${data.label}.` : `No members were admitted by ${data.label}.`}</Banner>
          ) : (
            <Table minWidth={900}>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Status</Th>
                  <Th>Minimum</Th>
                  <Th>Months short</Th>
                  <Th>Last paid</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.memberNo}>
                    <Td>
                      <strong className="block">{r.name}</strong>
                      <span className="block font-mono text-[12.5px] text-muted">{r.memberNo}</span>
                    </Td>
                    <Td>
                      <Pill tone={r.state === "Not paid" ? "red" : "warm"}>{r.state}</Pill>
                      {r.paid ? <span className="mt-1 block text-[12.5px] text-muted">Received {r.paid}</span> : null}
                    </Td>
                    <Td>{r.minimum}</Td>
                    <Td>
                      <span title={r.shortMonths.join(", ")}>
                        {r.monthsShort} month{r.monthsShort === 1 ? "" : "s"}
                      </span>
                      {r.monthsShort > 1 ? <span className="block text-[12.5px] text-muted">{r.shortMonths.slice(0, 3).join(", ")}{r.monthsShort > 3 ? "…" : ""}</span> : null}
                    </Td>
                    <Td>{r.lastPaid || <span className="text-muted">Never</span>}</Td>
                    <Td>
                      {r.remindedAt ? <span className="mb-1 block text-[12.5px] text-muted">Overdue reminder sent {r.remindedAt}</span> : null}
                      <Btn size="sm" variant={r.remindedAt ? "outline" : "primary"} disabled={busy !== null || !r.email} onClick={() => void remind({ memberNos: [r.memberNo] }, r.memberNo)}>
                        {busy === r.memberNo ? "Sending…" : r.remindedAt ? "Remind again" : "Send reminder"}
                      </Btn>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </Card>
  );
}
