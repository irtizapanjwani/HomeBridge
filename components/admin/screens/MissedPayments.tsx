"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { DownloadIcon } from "@/components/ui/Icons";
import { download, toCsv } from "../lib";
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
        Missed payments
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        Members who have not paid the minimum monthly contribution (₦5,000 or £25, bye-law 11.2) for the month chosen, from the contributions
        recorded above. Each member is counted from the month they were admitted. Reminders are optional and go only when you click.
      </p>

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
          {busy === "all" ? "Sending…" : `Email reminders to all not yet reminded (${unreminded})`}
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
                      {r.remindedAt ? <span className="mb-1 block text-[12.5px] text-muted">Reminded {r.remindedAt}</span> : null}
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
