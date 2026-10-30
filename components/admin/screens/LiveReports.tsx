"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { DownloadIcon } from "@/components/ui/Icons";
import { download, slug, toCsv, toXls } from "../lib";
import { Banner, Btn, Card, CardTitle, Pill, StatTile, Table, Td, Th, cx } from "../ui";

type Report = { id: string; name: string; description: string; columns: string[]; rows: (string | number)[][]; summary: boolean };
type Data = { asAt: string; stats: { label: string; value: string; sub?: string }[]; reports: Report[] };

const PREVIEW_ROWS = 6;

const cell = (v: string | number) => (typeof v === "number" ? v.toLocaleString("en-GB", { maximumFractionDigits: 2 }) : v);

/**
 * Brief Phase 3: "Board reports: members by chapter and category, pipeline by status, joining fees
 * received, contributions by month and currency; CSV and Excel exports." Built from the live
 * database every time the screen opens or Refresh is clicked.
 */
export function LiveReports() {
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    setLoading(true);
    setErr("");
    fetch("/api/admin/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Data & { ok?: boolean; error?: string }) => (d.ok ? setData(d) : setErr(d.error || "Could not build the reports.")))
      .catch(() => setErr("Could not reach the server."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  function exportOne(r: Report, kind: "csv" | "xls") {
    const date = new Date().toISOString().slice(0, 10);
    const base = `homebridge-${slug(r.name)}-${date}`;
    if (kind === "csv") download(`${base}.csv`, toCsv(r.columns, r.rows));
    else download(`${base}.xls`, toXls(r.columns, r.rows), "application/vnd.ms-excel");
    void fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: r.name, kind, rows: r.rows.length }),
    }).catch(() => {});
  }

  function exportAll() {
    if (!data) return;
    data.reports.forEach((r, i) => setTimeout(() => exportOne(r, "xls"), i * 300));
    toast(`Downloading ${data.reports.length} Excel files. Your browser may ask to allow multiple downloads.`);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="m-0 flex items-center gap-2 font-display text-[22px] font-bold text-forest-800">
            Board reports <Pill tone="green">Live</Pill>
          </h2>
          <p className="m-0 text-[13.5px] text-muted">{data ? `From the live records, as at ${data.asAt} (Lagos time)` : "Building from the live records…"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn disabled={loading} onClick={load}>
            {loading ? "Refreshing…" : "Refresh"}
          </Btn>
          <Btn variant="primary" disabled={!data} onClick={exportAll}>
            <DownloadIcon size={17} /> Download all (Excel)
          </Btn>
        </div>
      </div>
      {err ? <Banner tone="danger">{err}</Banner> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.stats.map((s) => (
              <StatTile key={s.label} label={s.label} value={s.value} sub={s.sub} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {data.reports.map((r) => {
              const expanded = open[r.id] || r.rows.length <= PREVIEW_ROWS;
              const shown = expanded ? r.rows : r.rows.slice(0, PREVIEW_ROWS);
              return (
                <Card key={r.id} className={cx("flex min-w-0 flex-col gap-3 p-5", !r.summary && "xl:col-span-2")}>
                  <CardTitle aside={<span className="text-[12.5px] text-muted">{r.rows.length} rows</span>}>{r.name}</CardTitle>
                  <p className="m-0 text-[14px] text-body">{r.description}</p>
                  {r.rows.length === 0 ? (
                    <p className="m-0 text-[14px] text-muted">Nothing recorded yet.</p>
                  ) : (
                    <Table minWidth={r.summary ? 420 : 1100}>
                      <thead>
                        <tr>
                          {r.columns.map((c) => (
                            <Th key={c}>{c}</Th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map((row, i) => (
                          <tr key={i} className={row[0] === "Total" ? "font-semibold" : undefined}>
                            {row.map((v, j) => (
                              <Td key={j}>{cell(v)}</Td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <Btn size="sm" variant="primary" disabled={!r.rows.length} onClick={() => exportOne(r, "csv")}>
                      <DownloadIcon size={15} /> CSV
                    </Btn>
                    <Btn size="sm" disabled={!r.rows.length} onClick={() => exportOne(r, "xls")}>
                      <DownloadIcon size={15} /> Excel
                    </Btn>
                    {r.rows.length > PREVIEW_ROWS ? (
                      <Btn size="sm" variant="ghost" onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}>
                        {open[r.id] ? "Show fewer" : `Show all ${r.rows.length}`}
                      </Btn>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
