"use client";

import { useState } from "react";
import { TODAY, type ScreenId } from "@/lib/admin-data";
import { useToast } from "@/components/ui/Toast";
import { DownloadIcon, FileIcon } from "@/components/ui/Icons";
import { useAdmin, type Store } from "../store";
import {
  auditReport,
  contributionsByMember,
  contributionsByPeriod,
  exportReport,
  joiningFeeReport,
  paymentsReport,
  registerReport,
  shareRegister,
  withdrawalsReport,
  type Report,
} from "../exports";
import { printTable } from "../lib";
import { Banner, Btn, Card, CardTitle, Field, PageHeader, inputCls } from "../ui";

type Def = { id: string; build: (s: Store) => Report; needs: ScreenId; text: string; pdf?: boolean };

const DEFS: Def[] = [
  { id: "register", build: (s) => registerReport(s), needs: "register", text: "Every member with type, society, route, shares, % of capital and status. The statutory register.", pdf: true },
  { id: "by-member", build: contributionsByMember, needs: "contributions", text: "Money credited per member, shares issued from it and unallocated credit." },
  { id: "by-period", build: contributionsByPeriod, needs: "contributions", text: "Credited contributions by month, split by UBA, USD and GBP domiciliary accounts." },
  { id: "shares", build: shareRegister, needs: "register", text: "Every share transaction — issues, transfers, withdrawals. Balance = sum of rows.", pdf: true },
  { id: "lines", build: paymentsReport, needs: "contributions", text: "Raw bank lines with FX rate, naira value, match status and who matched them." },
  { id: "fees", build: joiningFeeReport, needs: "fees", text: "Joining fees paid to VEKAT by Stripe and First Bank. Not share capital." },
  { id: "withdrawals", build: withdrawalsReport, needs: "withdrawals", text: "Requests in notice order with payment schedules." },
  { id: "audit", build: auditReport, needs: "audit", text: "Who did what, to which record, before and after." },
];

/** Keep only rows dated in the given year (column index holds an ISO date). */
const inYear = (r: Report, col: number, year: string): Report => ({ ...r, rows: r.rows.filter((row) => String(row[col]).startsWith(year)) });

export function ReportsScreen() {
  const s = useAdmin();
  const toast = useToast();
  const [year, setYear] = useState(TODAY.slice(0, 4));
  const visible = DEFS.filter((d) => s.access(d.needs) !== "none" && (d.needs !== "fees" || s.can("fees.export") || s.can("export.all")));
  const hidden = DEFS.length - visible.length;
  const canAll = s.can("export.all");

  function run(d: Def, kind: "csv" | "xls" | "pdf") {
    const r = d.build(s);
    if (kind === "pdf") {
      const ok = printTable(`HomeBridge Cooperative — ${r.name}`, `Edo and FCT societies · as at ${TODAY} · sample data`, r.columns, r.rows);
      if (!ok) return toast("Your browser blocked the print window. Allow pop-ups for this page, then try again.", "warn");
    } else exportReport(r, kind);
    s.addLog(`Exported ${r.name} (${kind.toUpperCase()})`, `${r.rows.length} rows`, "—", "Downloaded");
  }

  function auditorsPack() {
    const yearEnd = `${year}-12-31`;
    const pack: Report[] = [
      { ...registerReport(s), name: `Member register as at ${TODAY < yearEnd ? TODAY : yearEnd}` },
      inYear(shareRegister(s), 1, year),
      inYear(paymentsReport(s), 1, year),
      contributionsByMember(s),
      (() => {
        const r = contributionsByPeriod(s);
        return { ...r, rows: r.rows.filter((row) => String(row[0]).endsWith(year)) };
      })(),
      inYear(joiningFeeReport(s), 7, year),
      withdrawalsReport(s),
      auditReport(s),
    ];
    const manifest: Report = {
      name: "Auditor's pack contents",
      columns: ["File", "Rows", "Notes"],
      rows: pack.map((r) => [r.name, r.rows.length, "CSV, UTF-8"]).concat([["Prepared", 0, `Year to 31 December ${year} · prepared ${TODAY} by ${s.role.person} · sample data`]]),
    };
    [manifest, ...pack].forEach((r, i) => setTimeout(() => exportReport(r, "csv", `${year}`), i * 300));
    s.addLog("Downloaded auditor's pack", `Year to 31 Dec ${year}`, "—", `${pack.length + 1} CSV files`);
    toast(`Downloading ${pack.length + 1} CSV files for the year to 31 December ${year}. Your browser may ask to allow multiple downloads.`);
  }

  return (
    <>
      <PageHeader title="Reports and exports" subtitle="CSV for spreadsheets, Excel, and print-ready PDF · every figure ties to the bank statements" />

      {hidden ? (
        <Banner tone="lock" title={`${hidden} report${hidden === 1 ? "" : "s"} hidden.`}>
          {s.role.title} sees only the reports for records it can open{s.role.id === "registration" ? " — joining-fee payments, with no access to share accounts" : ""}.
        </Banner>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((d) => {
          const r = d.build(s);
          return (
            <Card key={d.id} className="flex flex-col gap-2.5 p-5">
              <CardTitle aside={<span className="text-[12.5px] text-muted">{r.rows.length} rows</span>}>{r.name}</CardTitle>
              <p className="m-0 text-[14px]">{d.text}</p>
              <p className="m-0 line-clamp-2 text-[12.5px] text-muted">{r.columns.join(" · ")}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <Btn size="sm" variant="primary" onClick={() => run(d, "csv")}>
                  <DownloadIcon size={15} /> CSV
                </Btn>
                <Btn size="sm" onClick={() => run(d, "xls")}>
                  <DownloadIcon size={15} /> Excel
                </Btn>
                {d.pdf ? (
                  <Btn size="sm" onClick={() => run(d, "pdf")}>
                    <FileIcon size={15} /> PDF (print)
                  </Btn>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="flex flex-col gap-3 p-5">
        <CardTitle>Auditor’s pack</CardTitle>
        <p className="m-0 max-w-3xl text-[14px]">
          Everything the ICAN-registered auditor and the Audit Committee need for the financial year to 31 December (15.1): register, share register, bank lines, contributions, joining fees, withdrawals and the audit log —
          one CSV each, plus a contents file.
        </p>
        <div className="flex flex-wrap items-end gap-2.5">
          <Field label="Year to 31 December" className="w-48">
            <select value={year} onChange={(e) => setYear(e.target.value)} className={inputCls}>
              <option>2026</option>
              <option>2025</option>
            </select>
          </Field>
          <Btn variant="primary" reason={canAll ? undefined : "Your role cannot export the full books."} onClick={auditorsPack}>
            <DownloadIcon size={17} /> Download auditor’s pack
          </Btn>
        </div>
      </Card>
    </>
  );
}
