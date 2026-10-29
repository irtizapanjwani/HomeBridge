"use client";

import { type JoiningFee } from "@/lib/admin-data";
import { useToast } from "@/components/ui/Toast";
import { DownloadIcon } from "@/components/ui/Icons";
import { useAdmin } from "../store";
import { exportReport, joiningFeeReport } from "../exports";
import { fmtDate, money, naira } from "../lib";
import { Banner, Btn, Card, Empty, Field, PageHeader, Pill, StatTile, Table, Td, Th, cx, inputCls } from "../ui";
import { StatementMatchCard } from "./StatementMatch";

export function JoiningFeesScreen() {
  const s = useAdmin();
  const toast = useToast();
  const [channel, setChannel] = s.ui("fees.channel", "all");
  const [status, setStatus] = s.ui("fees.status", "all");

  const rows = s.fees
    .filter((f) => channel === "all" || f.channel === channel)
    .filter((f) => status === "all" || f.status === status)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  const counted = s.fees.filter((f) => f.status !== "Receipt uploaded");
  const totals = (["NGN", "GBP", "USD", "EUR"] as const).map((c) => [c, counted.filter((f) => f.currency === c).reduce((t, f) => t + f.amount, 0)] as const).filter(([, v]) => v > 0);
  const toMatch = s.fees.filter((f) => f.status === "Receipt uploaded");

  const exportReason = !s.can("fees.export") ? "Your role cannot export joining-fee payments." : undefined;
  const matchReason = !s.can("fees.match") ? "Only the Finance officer matches First Bank receipts to the statement." : undefined;

  function exportFees(kind: "csv" | "xls") {
    exportReport(joiningFeeReport(s), kind);
    s.addLog(`Exported joining-fee report for VEKAT (${kind.toUpperCase()})`, `${s.fees.length} rows`, "—", "Downloaded");
  }

  function match(f: JoiningFee) {
    s.setFees((cur) => cur.map((x) => (x.id === f.id ? { ...x, status: "Matched to First Bank", matchedBy: s.role.person } : x)));
    s.addLog("Matched joining-fee receipt to First Bank statement", `${f.id} · ${f.ref}`, "Receipt uploaded", "Matched to First Bank");
    const app = s.apps.find((a) => a.memberNo === f.ref && a.status === "Approved (fee due)");
    if (app) {
      s.setApps((cur) => cur.map((a) => (a.id === app.id ? { ...a, status: "Fee paid" } : a)));
      s.addLog("Application status changed", app.id, "Approved (fee due)", "Fee paid");
    }
    toast(`${money(f.amount, f.currency)} matched for ${f.ref}.${app ? ` ${app.id} is now Fee paid.` : ""}`);
  }

  return (
    <>
      <PageHeader
        title="Joining fees (VEKAT)"
        subtitle={`Paid to ${s.settings.joiningFeePayee} · not share capital · never refunded (6.3, 12.4)`}
        actions={
          <>
            <Btn reason={exportReason} onClick={() => exportFees("xls")}>
              <DownloadIcon size={17} /> Excel
            </Btn>
            <Btn variant="primary" reason={exportReason} onClick={() => exportFees("csv")}>
              <DownloadIcon size={17} /> Export joining-fee report
            </Btn>
          </>
        }
      />

      <StatementMatchCard />

      <Banner tone="info" title="Two payees, never mixed.">
        The one-off joining fee ({naira(s.settings.joiningFeeNgn)} or £{s.settings.joiningFeeGbp}) is VEKAT’s charge for registration, ID checks and onboarding. It goes to{" "}
        {s.settings.joiningFeePayee}’s Stripe account (GBP, USD, EUR) or First Bank naira account — never into the Society’s accounts, never counted as shares and never refunded.
        {s.access("fees") !== "act" ? ` ${s.role.title} can view and export this list but not change it.` : ""}
      </Banner>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Fees received" value={counted.length} sub="Stripe paid + First Bank matched" />
        <StatTile label="Received by currency" value={totals.length ? money(totals[0][1], totals[0][0]) : "—"} sub={totals.slice(1).map(([c, v]) => money(v, c)).join(" · ") || "No other currencies"} />
        <StatTile tone="warm" label="Receipts to match" value={toMatch.length} sub="First Bank transfers — finance matches to statement" />
        <StatTile label="Payee (a setting)" value={<span className="text-[22px]">{s.settings.joiningFeePayee}</span>} sub="Changed only with two-admin approval" />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap gap-3">
          <Field label="Channel" className="w-52">
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputCls}>
              <option value="all">Stripe and First Bank</option>
              <option value="stripe">Stripe (GBP, USD, EUR)</option>
              <option value="firstbank">First Bank (NGN)</option>
            </select>
          </Field>
          <Field label="Status" className="w-52">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="all">All</option>
              <option>Paid — Stripe</option>
              <option>Receipt uploaded</option>
              <option>Matched to First Bank</option>
            </select>
          </Field>
        </div>
        <div className="mt-5">
          {rows.length === 0 ? (
            <Empty title="No joining-fee payments match these filters." />
          ) : (
            <Table minWidth={900} label="Joining-fee payments">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Name</Th>
                  <Th>Channel</Th>
                  <Th right>Amount</Th>
                  <Th>Paid on</Th>
                  <Th>Stripe id / receipt</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id}>
                    <Td className="font-semibold whitespace-nowrap text-forest-800">{f.ref}</Td>
                    <Td className="whitespace-nowrap">{f.name}</Td>
                    <Td className="whitespace-nowrap">{f.channel === "stripe" ? "Stripe" : "First Bank"}</Td>
                    <Td right>{money(f.amount, f.currency)}</Td>
                    <Td className="whitespace-nowrap">{fmtDate(f.paidAt, true)}</Td>
                    <Td className={cx("text-[13px] text-muted", "max-w-[180px] truncate")}>{f.stripeId ?? f.receipt}</Td>
                    <Td>
                      <Pill>{f.status}</Pill>
                    </Td>
                    <Td>
                      {f.status === "Receipt uploaded" ? (
                        <Btn size="sm" variant="gold" reason={matchReason} onClick={() => match(f)}>
                          Match to statement
                        </Btn>
                      ) : (
                        <span className="text-[13px] text-muted">{f.matchedBy}</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
        <p className="m-0 mt-4 text-[13px] text-muted">
          VEKAT reports the number and total of joining fees to the Board every quarter and in the annual report (6.3). Stripe payments are confirmed by webhook; First Bank payments by receipt upload and statement match.
        </p>
      </Card>
    </>
  );
}
