"use client";

import { useMemo } from "react";
import { REGIONS, TODAY, type MemberStatus, type MemberType } from "@/lib/admin-data";
import { useToast } from "@/components/ui/Toast";
import { SearchIcon } from "@/components/ui/Icons";
import { dormancyStatus, useAdmin } from "../store";
import { exportReport, registerReport } from "../exports";
import { fmtDate, naira, num } from "../lib";
import { Btn, Card, Empty, Field, PageHeader, Pill, StatTile, Table, Td, Th, inputCls } from "../ui";

const TYPES: MemberType[] = ["Home", "Diaspora", "Founding", "Professional", "Group"];
const STATUSES: MemberStatus[] = ["Active", "Reminder sent", "Dormant", "Suspended", "Awaiting first share", "Withdrawn", "Deceased"];

export function RegisterScreen() {
  const s = useAdmin();
  const toast = useToast();
  const [q, setQ] = s.ui("reg.q", "");
  const [type, setType] = s.ui("reg.type", "all");
  const [society, setSociety] = s.ui("reg.society", "all");
  const [region, setRegion] = s.ui("reg.region", "all");
  const [status, setStatus] = s.ui("reg.status", "all");

  const month = TODAY.slice(0, 7);
  const active = s.members.filter((m) => m.status === "Active" || m.status === "Reminder sent");
  const monthLines = s.lines.filter((l) => l.receivedAt.startsWith(month) && l.matchStatus !== "Returned");
  const byAcc = (a: string) => monthLines.filter((l) => l.account === a).reduce((t, l) => t + l.ngnValue, 0);
  const suspense = s.lines.filter((l) => l.matchStatus === "Suspense");
  const capital = s.txs.reduce((t, x) => t + x.ngnValue, 0);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/\s+/g, "");
    return s.members.filter((m) => {
      if (type !== "all" && m.type !== type) return false;
      if (society !== "all" && m.society !== society) return false;
      if (region !== "all" && m.region !== region) return false;
      if (status !== "all" && m.status !== status) return false;
      if (needle) {
        const hay = `${m.no}${m.name}${m.phone}${m.email}`.toLowerCase().replace(/\s+/g, "");
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [s.members, q, type, society, region, status]);

  const cap = s.settings.capPct / 100;

  function runDormancy() {
    const changes = s.members.map((m) => ({ m, next: dormancyStatus(m, s.lastPaid(m.no)) })).filter((c) => c.next !== c.m.status);
    s.setMembers((cur) =>
      cur.map((m) => {
        const c = changes.find((x) => x.m.no === m.no);
        return c ? { ...m, status: c.next } : m;
      }),
    );
    changes.forEach((c) => s.addLog("Dormancy check changed status", c.m.no, c.m.status, c.next));
    toast(changes.length ? `Dormancy check: ${changes.length} status change(s) logged.` : "Dormancy check: every status already matches the 9.3 rule.");
  }

  return (
    <>
      <PageHeader
        title="Member register"
        subtitle="Statutory register of members · Edo and FCT societies"
        actions={
          <>
            <Btn
              onClick={() => {
                exportReport(registerReport(s, rows), "csv");
                s.addLog("Exported member register (CSV)", `${rows.length} rows`, "—", "Downloaded");
              }}
            >
              Export CSV
            </Btn>
            <Btn
              variant="primary"
              onClick={() => {
                s.go("applications");
                toast("New members join through an approved application (6.4) — opened Applications.");
              }}
              reason={s.access("applications") === "none" ? "Your role cannot open Applications." : undefined}
            >
              Add member
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active members"
          value={num(active.length)}
          sub={`Home ${active.filter((m) => m.base === "home" && m.type !== "Group").length} · Diaspora ${active.filter((m) => m.base === "diaspora").length} · Groups ${active.filter((m) => m.type === "Group").length}`}
        />
        <StatTile label="Share capital" value={naira(capital)} sub={`${num(s.totalShares)} shares of ${naira(s.settings.sharePrice)}`} />
        <StatTile label="This month in" value={naira(Math.round(monthLines.reduce((t, l) => t + l.ngnValue, 0)))} sub={`UBA ${naira(byAcc("UBA"))} · USD dom ${naira(Math.round(byAcc("USD-dom")))} · GBP dom ${naira(Math.round(byAcc("GBP-dom")))}`} />
        <StatTile tone="warm" label="Unmatched payments" value={suspense.length} sub={`In suspense — not credited · ${naira(Math.round(suspense.reduce((t, l) => t + l.ngnValue, 0)))}`} />
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr_1.15fr_0.9fr]">
          <Field label="Search" className="sm:col-span-2 lg:col-span-1">
            <span className="relative">
              <SearchIcon size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, member number, phone" className={`${inputCls} w-full pl-9`} type="search" />
            </span>
          </Field>
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              <option value="all">All types</option>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Society">
            <select value={society} onChange={(e) => setSociety(e.target.value)} className={inputCls}>
              <option value="all">Edo and FCT</option>
              <option value="ED">Edo</option>
              <option value="FC">FCT</option>
            </select>
          </Field>
          <Field label="Country / state">
            <select value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls}>
              <option value="all">Anywhere</option>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="all">All</option>
              {STATUSES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-5">
          {rows.length === 0 ? (
            <Empty title="No members match these filters.">Clear the search or choose “All” to see the full register.</Empty>
          ) : (
            <Table minWidth={960} label="Member register">
              <thead>
                <tr>
                  <Th>Member no.</Th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Lives in</Th>
                  <Th>Route</Th>
                  <Th right>Shares</Th>
                  <Th right>% of capital</Th>
                  <Th>Last paid</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const sh = s.holdings[m.no] ?? 0;
                  const share = s.totalShares ? sh / s.totalShares : 0;
                  return (
                    <tr key={m.no} onClick={() => s.openProfile(m.no)} className="cursor-pointer transition hover:bg-[#FBF8EE]">
                      <Td>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            s.openProfile(m.no);
                          }}
                          className="font-semibold whitespace-nowrap text-forest-800 hover:underline"
                          aria-label={`Open profile ${m.no} ${m.name}`}
                        >
                          {m.no}
                        </button>
                      </Td>
                      <Td className="whitespace-nowrap">{m.name}</Td>
                      <Td>{m.type}</Td>
                      <Td className="whitespace-nowrap">{m.livesIn}</Td>
                      <Td className="whitespace-nowrap" >
                        <span title={m.route}>{m.route.replace(/\s\([A-Z][^)]*\)$/, "")}</span>
                      </Td>
                      <Td right>{num(sh)}</Td>
                      <Td right>
                        <span className={share >= cap * 0.9 ? "font-semibold text-[#9A5B0B]" : undefined} title={share >= cap * 0.9 ? "Within 10% of the 20% cap" : undefined}>
                          {(share * 100).toFixed(1)}%
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap">{fmtDate(s.lastPaid(m.no), true)}</Td>
                      <Td>
                        <Pill>{m.status}</Pill>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 text-[13px] text-muted lg:flex-row lg:items-center lg:justify-between">
          <p className="m-0 max-w-3xl">
            No member may hold more than {s.settings.capPct}% of share capital (11.3) — new share issues that would cross it are blocked; figures in amber are within 2 points of the cap.
            Dormant (9.3): no contribution for 12 months → reminder; a further 3 months → dormant, no vote until they pay again.
          </p>
          <Btn size="sm" variant="ghost" onClick={runDormancy} reason={!s.can("pay.match") ? "Only the Finance officer runs the dormancy check." : undefined}>
            Run dormancy check (9.3)
          </Btn>
        </div>
      </Card>
    </>
  );
}
