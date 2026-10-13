"use client";

import { useMemo } from "react";
import { SearchIcon, DownloadIcon } from "@/components/ui/Icons";
import { useAdmin } from "../store";
import { auditReport, exportReport } from "../exports";
import { Btn, Card, Empty, Field, PageHeader, Table, Td, Th, inputCls } from "../ui";

export function AuditLogScreen() {
  const s = useAdmin();
  const [q, setQ] = s.ui("log.q", "");
  const [who, setWho] = s.ui("log.role", "all");
  const roles = Array.from(new Set(s.log.map((l) => l.role)));

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return s.log.filter(
      (l) => (who === "all" || l.role === who) && (!needle || `${l.at} ${l.who} ${l.role} ${l.action} ${l.entity} ${l.before} ${l.after}`.toLowerCase().includes(needle)),
    );
  }, [s.log, q, who]);

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Append-only · every admin action · kept at least 7 years"
        actions={
          <Btn
            onClick={() => {
              const r = auditReport(s);
              exportReport({ ...r, rows: rows.map((l) => [l.at, l.who, l.role, l.action, l.entity, l.before, l.after]) }, "csv");
              s.addLog("Exported audit log (CSV)", `${rows.length} entries`, "—", "Downloaded");
            }}
          >
            <DownloadIcon size={17} /> Export CSV
          </Btn>
        }
      />
      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Field label="Search">
            <span className="relative">
              <SearchIcon size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by person, member number or action" className={`${inputCls} w-full pl-9`} />
            </span>
          </Field>
          <Field label="Role">
            <select value={who} onChange={(e) => setWho(e.target.value)} className={inputCls}>
              <option value="all">Everyone</option>
              {roles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
        <p className="m-0 mt-3 text-[13px] text-muted" aria-live="polite">
          {rows.length} of {s.log.length} entries
        </p>
        <div className="mt-3">
          {rows.length === 0 ? (
            <Empty title={`No entries match “${q}”.`}>Try a member number such as HB-ED-UK-000045, a person, or a word like “approved”.</Empty>
          ) : (
            <Table minWidth={980} label="Audit log entries">
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Who</Th>
                  <Th>Action</Th>
                  <Th>Entity</Th>
                  <Th>Before → after</Th>
                </tr>
              </thead>
              <tbody data-testid="audit-rows">
                {rows.map((l) => (
                  <tr key={l.id}>
                    <Td className="text-[13.5px] whitespace-nowrap text-muted">{l.at}</Td>
                    <Td className="whitespace-nowrap">
                      <b className="font-semibold text-ink">{l.who}</b>
                      <div className="text-[12.5px] text-muted">{l.role}</div>
                    </Td>
                    <Td className="max-w-[220px]">{l.action}</Td>
                    <Td className="max-w-[200px] text-[13.5px] break-words">{l.entity}</Td>
                    <Td className="max-w-[340px] text-[13.5px]">
                      <span className="text-muted">{l.before}</span> <span aria-label="changed to">→</span> <span className="font-medium text-ink">{l.after}</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Card>
    </>
  );
}
