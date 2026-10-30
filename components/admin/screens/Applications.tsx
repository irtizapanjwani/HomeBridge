"use client";

import { useRef, useState } from "react";
import { CHAPTERS, PENDING_APP, TODAY, type Application, type AppStatus, type MemberType, type Region } from "@/lib/admin-data";
import type { ImportPreview } from "@/lib/gform-import";
import { useToast } from "@/components/ui/Toast";
import { BinIcon, CheckIcon, DownloadIcon, FileIcon, XIcon } from "@/components/ui/Icons";
import { useAdmin } from "../store";
import { addDays, daysBetween, download, fmtDate, naira, parseCsv, workingDaysBetween } from "../lib";
import { Banner, Btn, Card, CardTitle, Empty, KeyVals, PageHeader, Pill, ReadOnly, Table, Td, Th, cx, inputCls } from "../ui";

type Filter = "pending" | "fee" | "decided" | "all";

const GFORM_SAMPLE = `timestamp,full_name,date_of_birth,country,state_or_region,city,whatsapp,email,membership_type,society,chapter,residence_route,land_location,id_type
2026-10-11 09:14,[Form applicant 1],1990-06-01,United Kingdom,England,Luton,+44 7700 900801,form1@example.com,Diaspora,Edo,UK,Family land in Edo,"Ekpoma, Esan West LGA, Edo",Passport
2026-10-12 18:40,[Form applicant 2],1985-02-17,Nigeria,FCT,Abuja,+234 803 000 0802,form2@example.com,Home,FCT,AB,Lives in FCT,,NIN
`;

let appSeq = 200;

function inList(f: Filter, st: AppStatus) {
  if (f === "all") return true;
  if (f === "pending") return PENDING_APP.includes(st);
  if (f === "fee") return st === "Approved (fee due)" || st === "Fee paid";
  return st === "Active" || st === "Refused" || st === "Supporter";
}

function ageAt(dob: string, at: string) {
  let a = Number(at.slice(0, 4)) - Number(dob.slice(0, 4));
  if (at.slice(5) < dob.slice(5)) a -= 1;
  return a;
}

function checks(a: Application) {
  const age = ageAt(a.dob, a.submittedAt);
  const nomTotal = a.nominees.reduce((t, n) => t + n.percent, 0);
  const list: { label: string; ok: boolean; why: string }[] = [
    { label: `Age 18+ at application (${age}) — 5.1`, ok: age >= 18, why: `Applicant was ${age} at application; members must be 18+ (5.1).` },
    { label: "Good-character declaration — 5.1b", ok: a.goodCharacter, why: "Good-character declaration not made (5.1b)." },
    { label: `Residence route: ${a.route} — 5.2`, ok: a.routeKind !== "none", why: "No residence route — this person belongs on the Supporter list, not membership (5.2)." },
    {
      label: `ID check: ${a.kyc.result}`,
      ok: a.kyc.result === "Pass",
      why: a.kyc.result === "Not started" || a.kyc.result === "Pending" ? "ID check not completed yet." : `ID check result is “${a.kyc.result}” — needs a pass.`,
    },
  ];
  if (a.type === "Group") list.push({ label: "Group representative identified — 5.3", ok: a.kyc.addressOk, why: "Group representative letter or address not confirmed (5.3)." });
  else list.push({ label: `Nominee shares total ${nomTotal}% — 10.1`, ok: nomTotal === 100, why: a.nominees.length ? `Nominee shares total ${nomTotal}% — must be 100% (10.1).` : "No nominee named yet (10.1)." });
  return list;
}

export function ApplicationsScreen({ dbConnected = false }: { dbConnected?: boolean }) {
  const s = useAdmin();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = s.ui<Filter>("app.filter", "pending");
  const [selId, setSelId] = s.ui<string>("app.sel", "APP-0141");
  const [query, setQuery] = s.ui<string>("app.query", "");
  const [mode, setMode] = useState<null | "info" | "refuse" | "delete">(null);
  const [deleting, setDeleting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [preview, setPreview] = useState<(ImportPreview & { csv: string; name: string }) | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  const canDecide = s.can("kyc.decide");
  const decideReason = canDecide ? undefined : "Only the KYC officer decides applications.";

  // Matches a name or a reference such as APP-YUJDVY, so an officer holding a receipt or a bank
  // line can find the person without reading down the list.
  const q = query.trim().toLowerCase();
  const matches = (a: Application) =>
    !q || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || (a.memberNo ?? "").toLowerCase().includes(q);

  const list = s.apps
    .filter((a) => inList(filter, a.status) && matches(a))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  // The selected application stays open after a decision moves it to another list.
  const sel = s.apps.find((a) => a.id === selId) ?? list[0];

  const n = (f: Filter) => s.apps.filter((a) => inList(f, a.status)).length;

  const update = (id: string, patch: Partial<Application>) => s.setApps((cur) => cur.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  function select(id: string) {
    setSelId(id);
    setMode(null);
    setReason("");
    setErr("");
  }

  /**
   * Records a decision on the server.
   *
   * The decision and, for an approval, the membership number are written to the database inside
   * one transaction, and the audit log is written with them. Nothing is changed on screen unless
   * that succeeded, so what an officer sees is always what is stored.
   */
  async function decide(a: Application, outcome: "approve" | "decline" | "request-info", why?: string) {
    setDeciding(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(a.id)}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, reason: why }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; memberNo?: string; emailed?: boolean; welcomeSent?: boolean | null };
      if (!res.ok || !data.ok) {
        setErr(data.error || "The decision could not be saved. Nothing was changed.");
        return null;
      }
      return data;
    } catch {
      setErr("We could not reach the server. Nothing was saved.");
      return null;
    } finally {
      setDeciding(false);
    }
  }

  async function approve(a: Application) {
    const saved = await decide(a, "approve");
    if (!saved) return;
    const memberNo = saved.memberNo;
    update(a.id, { status: "Approved (fee due)", memberNo, decidedBy: s.role.person, note: undefined, kyc: { ...a.kyc, reviewer: s.role.person } });
    s.addLog("Approved application", a.id, a.status, `Approved (fee due) · issued ${memberNo}`);
    if (saved.welcomeSent) update(a.id, { welcomeSentAt: "just now" });
    toast(
      saved.welcomeSent
        ? `${a.name} approved. Member number ${memberNo} issued and the welcome pack sent.`
        : saved.welcomeSent === false
          ? `${a.name} approved. Member number ${memberNo} issued, but the welcome pack did not send — use Send welcome pack.`
          : `${a.name} approved. Member number ${memberNo} issued.`,
      saved.welcomeSent === false ? "warn" : undefined,
    );
  }

  async function submitReason(a: Application) {
    const r = reason.trim();
    if (r.length < 5) {
      setErr(mode === "refuse" ? "Please give a reason for refusing — it is recorded and shown to the applicant." : "Please say what you need from the applicant.");
      return;
    }
    // The decision is saved even when the email cannot go, so the officer is told which happened and
    // can contact the applicant another way.
    const notEmailed = " The email to the applicant could not be sent — see the audit log, and contact them directly.";
    if (mode === "info") {
      const saved = await decide(a, "request-info", r);
      if (!saved) return;
      update(a.id, { status: "Info requested", note: r });
      s.addLog("Requested information", a.id, a.status, `Info requested: ${r}`);
      if (saved.emailed === false) toast(`Information request recorded for ${a.name}.${notEmailed}`, "warn");
      else toast(`Information request recorded and emailed to ${a.name}.`);
    } else {
      const saved = await decide(a, "decline", r);
      if (!saved) return;
      update(a.id, { status: "Refused", decisionReason: r, decidedBy: s.role.person });
      s.addLog("Refused application", a.id, a.status, `Refused: ${r}`);
      if (saved.emailed === false) toast(`${a.name} refused. Reason recorded.${notEmailed}`, "warn");
      else toast(`${a.name} refused and emailed. Reason recorded; they may ask the next general meeting to review it (6.2).`);
    }
    setMode(null);
    setReason("");
    setErr("");
  }

  /**
   * Removes the registration from the database for good.
   *
   * Unlike every other action on this screen, this one is not a change of status held in the
   * browser: it reaches the server, and there is no copy to restore from. The screen asks for the
   * reference to be typed first, so it cannot happen on a stray click.
   */
  async function destroy(a: Application) {
    setDeleting(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(a.id)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error || "The registration could not be deleted. Nothing was changed.");
        return;
      }
      // The log keeps the reference, not the person: the point of deleting was to remove them.
      s.addLog("Deleted registration", a.id, a.status, "Deleted permanently");
      s.setApps((cur) => cur.filter((x) => x.id !== a.id));
      setMode(null);
      setReason("");
      toast(`${a.id} deleted permanently.`);
    } catch {
      setErr("We could not reach the server. Nothing was deleted.");
    } finally {
      setDeleting(false);
    }
  }

  function toSupporter(a: Application) {
    update(a.id, { status: "Supporter", decidedBy: s.role.person, decisionReason: "No residence route yet (5.2) — added to the Supporter list." });
    s.addLog("Moved to Supporter list", a.id, a.status, "Supporter (5.2)");
    toast(`${a.name} added to the free Supporter list.`);
  }

  /**
   * Records the officer's identity check on the server.
   *
   * Approval reads the stored result, so this is what lets an application be approved at all:
   * until an officer records a pass, the Approve button stays blocked.
   */
  /** Sends the welcome pack, or sends it again. */
  async function sendWelcome(a: Application) {
    setDeciding(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(a.id)}/welcome-pack`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; sentAt?: string; documents?: string[] };
      if (!res.ok || !data.ok) {
        setErr(data.error || "The welcome pack could not be sent. Nothing was changed.");
        return;
      }
      update(a.id, { welcomeSentAt: "just now" });
      s.addLog(a.welcomeSentAt ? "Resent welcome pack" : "Sent welcome pack", a.id, "—", `${data.documents?.length ?? 0} documents to ${a.email}`);
      toast(`Welcome pack sent to ${a.email} with ${data.documents?.length ?? 0} documents.`);
    } catch {
      setErr("We could not reach the server. Nothing was sent.");
    } finally {
      setDeciding(false);
    }
  }

  /** Confirms the joining fee on the server, which issues the VEKAT receipt number. */
  async function confirmFee(a: Application) {
    setDeciding(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(a.id)}/fee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; receiptNo?: string; emailed?: boolean; welcomeSent?: boolean | null };
      if (!res.ok || !data.ok) {
        setErr(data.error || "The fee could not be confirmed. Nothing was changed.");
        return;
      }
      update(a.id, { status: "Fee paid", receiptNo: data.receiptNo, ...(data.welcomeSent ? { welcomeSentAt: "just now" } : {}) });
      s.addLog("Confirmed joining fee", a.id, a.status, `Fee paid · receipt ${data.receiptNo}`);
      const pack = data.welcomeSent ? " The welcome pack was sent too." : data.welcomeSent === false ? " The welcome pack did not send — use Send welcome pack." : "";
      toast(
        (data.emailed
          ? `Fee confirmed. Receipt ${data.receiptNo} emailed to ${a.email}.`
          : `Fee confirmed and receipt ${data.receiptNo} issued, but the email did not go — check the audit log.`) + pack,
        data.welcomeSent === false || !data.emailed ? "warn" : undefined,
      );
    } catch {
      setErr("We could not reach the server. Nothing was saved.");
    } finally {
      setDeciding(false);
    }
  }

  async function recordIdCheck(a: Application, result: "Pass" | "Refer" | "Fail") {
    setDeciding(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/applications/${encodeURIComponent(a.id)}/id-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error || "The ID check could not be saved. Nothing was changed.");
        return;
      }
      update(a.id, { kyc: { ...a.kyc, result, reviewer: s.role.person } });
      s.addLog("Recorded ID check", a.id, `ID ${a.kyc.result}`, `ID ${result}`);
      toast(`ID check recorded as ${result} for ${a.name}.`);
    } catch {
      setErr("We could not reach the server. Nothing was saved.");
    } finally {
      setDeciding(false);
    }
  }

  function enterRegister(a: Application) {
    if (!a.memberNo) return;
    if (s.member(a.memberNo)) {
      toast(`${a.memberNo} is already on the register.`, "warn");
      return;
    }
    s.setMembers((cur) => [
      ...cur,
      {
        no: a.memberNo!,
        name: a.name,
        type: a.type,
        society: a.society,
        chapter: a.chapter,
        base: a.base,
        livesIn: a.livesIn,
        region: a.region,
        route: a.landLocation ? `${a.route} (${a.landLocation.split(",")[0]})` : a.route,
        phone: a.phone,
        email: a.email,
        status: "Awaiting first share",
        joinedAt: TODAY,
        kyc: a.kyc,
        nominees: a.nominees,
      },
    ]);
    update(a.id, { note: "Entered in the register — becomes Active when the first share is paid (6.4)." });
    s.addLog("Entered in register", a.memberNo, "Fee paid", "Awaiting first share");
    toast(`${a.memberNo} entered in the register. They become Active when the first share is paid (6.4).`);
  }

  /**
   * Reads a Google Form export.
   *
   * Two steps on purpose. The first upload only reports what the server made of the columns,
   * because the real export has not been seen yet and a sheet read wrongly would fill the
   * register with mangled rows. Nothing is written until the officer confirms.
   */
  async function importForm(f: File) {
    const csv = await f.text();
    setDeciding(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/import/google-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; preview?: ImportPreview };
      if (!res.ok || !data.ok || !data.preview) {
        setErr(data.error || "That file could not be read.");
        return;
      }
      setPreview({ csv, name: f.name, ...data.preview });
    } catch {
      setErr("We could not reach the server. Nothing was imported.");
    } finally {
      setDeciding(false);
    }
  }

  /** Writes the rows the preview said could be imported. */
  async function confirmImport() {
    if (!preview) return;
    setDeciding(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/import/google-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: preview.csv, confirm: true }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        result?: { imported: number; skipped: number };
      };
      if (!res.ok || !data.ok || !data.result) {
        setErr(data.error || "The import could not be completed.");
        return;
      }
      s.addLog("Imported Google Form responses", preview.name, "—", `${data.result.imported} applications`);
      toast(
        `Imported ${data.result.imported} applicant(s)${data.result.skipped ? `, ${data.result.skipped} skipped` : ""}. Reload to see them in the queue.`,
      );
      setPreview(null);
    } catch {
      setErr("We could not reach the server. Nothing was imported.");
    } finally {
      setDeciding(false);
    }
  }

  const readOnly = s.access("applications") !== "act";

  return (
    <>
      <PageHeader
        title="Applications"
        subtitle="KYC queue · decide within 30 days, target 2 working days (6.2)"
        live={dbConnected}
        actions={
          <>
            <Btn onClick={() => download("homebridge-google-form-sample.csv", GFORM_SAMPLE)}>
              <DownloadIcon size={17} /> Sample form CSV
            </Btn>
            <Btn variant="primary" reason={decideReason} onClick={() => fileRef.current?.click()}>
              <FileIcon size={17} /> Google Form import (CSV)
            </Btn>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              tabIndex={-1}
              aria-label="Google Form responses CSV"
              data-testid="gform-file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importForm(f);
                e.target.value = "";
              }}
            />
          </>
        }
      />

      {readOnly ? <ReadOnly why={`${s.role.title} can see the queue and decisions; only the KYC officer approves, asks for information or refuses.`} /> : null}

      {preview ? (
        <Card className="flex flex-col gap-3 p-5" aria-label="Google Form import preview">
          <CardTitle>Import preview · {preview.name}</CardTitle>
          {preview.missingFields.length ? (
            <Banner tone="danger" title="This sheet is missing a column we need.">
              No column matched: {preview.missingFields.join(", ")}. Rename the heading in the sheet, or send it over and the importer can be taught that spelling.
            </Banner>
          ) : null}
          <p className="m-0 text-[14px]">
            <b>{preview.importable}</b> to import · <b>{preview.duplicates}</b> already on file ·{" "}
            <b>{preview.problems}</b> that cannot be read
          </p>
          {preview.unmatched.length ? (
            <p className="m-0 text-[13px] text-muted">
              Columns not used: {preview.unmatched.join(", ")}. Check none of these matter before importing.
            </p>
          ) : null}
          {preview.rows.length ? (
            <Table minWidth={760} label="Rows found in the file">
              <thead>
                <tr>
                  <Th>Row</Th>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Born</Th>
                  <Th>Outcome</Th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 25).map((r) => (
                  <tr key={r.line}>
                    <Td className="text-[13px] text-muted">{r.line}</Td>
                    <Td>{r.fullName || <span className="text-muted">—</span>}</Td>
                    <Td className="text-[13.5px]">{r.email || <span className="text-muted">—</span>}</Td>
                    <Td className="text-[13.5px]">{r.phone || <span className="text-muted">—</span>}</Td>
                    <Td className="text-[13.5px]">{r.dob || <span className="text-muted">—</span>}</Td>
                    <Td className="text-[13px]">
                      {r.problem ? (
                        <span className="text-danger">{r.problem}</span>
                      ) : r.duplicateOf ? (
                        <span className="text-muted">Already on file ({r.duplicateOf})</span>
                      ) : (
                        <span className="font-semibold text-forest-800">Will import</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty title="No rows found in that file.">Check it is the responses sheet exported as CSV.</Empty>
          )}
          {preview.rows.length > 25 ? (
            <p className="m-0 text-[13px] text-muted">Showing the first 25 of {preview.rows.length} rows.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Btn
              variant="primary"
              disabled={deciding || preview.importable === 0 || preview.missingFields.length > 0}
              onClick={() => void confirmImport()}
            >
              {deciding ? "Importing…" : `Import ${preview.importable} applicant(s)`}
            </Btn>
            <Btn onClick={() => setPreview(null)}>Cancel</Btn>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" aria-label="Filter applications" className="flex flex-wrap gap-1.5">
        {(
          [
            ["pending", "Waiting for a decision"],
            ["fee", "Approved — fee and first share"],
            ["decided", "Decided"],
            ["all", "All"],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => {
              setFilter(id);
              const first = s.apps.filter((x) => inList(id, x.status)).sort((x, y) => x.submittedAt.localeCompare(y.submittedAt))[0];
              if (first) select(first.id);
            }}
            className={cx(
              "min-h-9 rounded-full border px-3.5 text-[13.5px] font-semibold transition",
              filter === id ? "border-forest-800 bg-forest-800 text-cream" : "border-line bg-paper text-forest-800 hover:bg-mist",
            )}
          >
            {label} <span className={filter === id ? "text-gold-soft" : "text-muted"}>{n(id)}</span>
          </button>
        ))}
      </div>

        <div className="relative min-w-[230px] flex-1 sm:max-w-xs">
          <label htmlFor="app-search" className="sr-only">
            Search applications by name or reference
          </label>
          <input
            id="app-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or APP-XXXXXX"
            className={cx(inputCls, "pr-16")}
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12.5px] font-semibold text-muted hover:text-ink"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {q && list.length ? (
        <p className="m-0 text-[13px] text-muted">
          {list.length} {list.length === 1 ? "match" : "matches"} for “{query.trim()}” in this list.
        </p>
      ) : null}

      {list.length === 0 || !sel ? (
        <Card className="p-5">
          {q ? (
            <Empty title={`Nothing matches “${query.trim()}”.`}>
              Try part of a name, or a reference such as APP-YUJDVY. Searching only looks in the list you are on.
            </Empty>
          ) : (
            <Empty title="Nothing in this list.">New applications arrive from /register or a Google Form import.</Empty>
          )}
        </Card>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
          <Card as="div" className="overflow-hidden">
            <ul className="m-0 list-none p-0" aria-label="Applications">
              {list.map((a, i) => {
                const due = addDays(a.submittedAt, 30);
                const left = daysBetween(TODAY, due);
                const pending = PENDING_APP.includes(a.status);
                return (
                  <li key={a.id} className={i ? "border-t border-line/80" : ""}>
                    <button
                      type="button"
                      onClick={() => select(a.id)}
                      aria-current={a.id === sel.id ? "true" : undefined}
                      className={cx(
                        "flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition",
                        a.id === sel.id ? "bg-mist shadow-[inset_4px_0_0_#17452F]" : "hover:bg-[#FBF8EE]",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{a.name}</span>
                        <span className="block text-[13px] text-muted">
                          {a.type} · {CHAPTERS[a.chapter]} · {a.id}
                          {a.source === "gform" ? " · Google Form" : ""}
                        </span>
                        <span className="block text-[12.5px] text-muted">
                          Submitted {fmtDate(a.submittedAt, true)}
                          {a.submittedTime ? ` at ${a.submittedTime}` : ""}
                        </span>
                        {pending ? (
                          <span className={cx("block text-[12.5px]", left < 7 ? "font-semibold text-danger" : "text-muted")}>
                            {left >= 0 ? `Decide by ${fmtDate(due, true)} (${left} days)` : `Overdue since ${fmtDate(due, true)}`}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <Pill>{a.status}</Pill>
                        {a.duplicates?.length ? <Pill tone="red">Possible duplicate</Pill> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Detail
            a={sel}
            mode={mode}
            setMode={(m) => {
              setMode(m);
              setReason("");
              setErr("");
            }}
            reason={reason}
            setReason={setReason}
            err={err}
            decideReason={decideReason}
            onApprove={approve}
            onSubmitReason={submitReason}
            onSupporter={toSupporter}
            onIdCheck={recordIdCheck}
            onConfirmFee={confirmFee}
            onSendWelcome={sendWelcome}
            onRegister={enterRegister}
            onDelete={destroy}
            deleting={deleting}
            deciding={deciding}
            canDecide={canDecide}
          />
        </div>
      )}
    </>
  );
}

function Detail({
  a,
  mode,
  setMode,
  reason,
  setReason,
  err,
  decideReason,
  onApprove,
  onSubmitReason,
  onSupporter,
  onIdCheck,
  onConfirmFee,
  onSendWelcome,
  onRegister,
  onDelete,
  deleting,
  deciding,
  canDecide,
}: {
  a: Application;
  mode: null | "info" | "refuse" | "delete";
  setMode: (m: null | "info" | "refuse" | "delete") => void;
  reason: string;
  setReason: (v: string) => void;
  err: string;
  decideReason?: string;
  onApprove: (a: Application) => void | Promise<void>;
  onSubmitReason: (a: Application) => void | Promise<void>;
  onSupporter: (a: Application) => void;
  onIdCheck: (a: Application, result: "Pass" | "Refer" | "Fail") => void | Promise<void>;
  onConfirmFee: (a: Application) => void | Promise<void>;
  onSendWelcome: (a: Application) => void | Promise<void>;
  onRegister: (a: Application) => void;
  onDelete: (a: Application) => void;
  deleting: boolean;
  deciding: boolean;
  canDecide: boolean;
}) {
  const s = useAdmin();
  const list = checks(a);
  const failing = list.find((c) => !c.ok);
  const pending = PENDING_APP.includes(a.status);
  const due = addDays(a.submittedAt, 30);
  const worked = workingDaysBetween(a.submittedAt, TODAY);
  const nomTotal = a.nominees.reduce((t, n) => t + n.percent, 0);
  const fee = a.base === "home" ? naira(s.settings.joiningFeeNgn) : `£${s.settings.joiningFeeGbp}`;

  return (
    <Card className="flex flex-col gap-4 p-5" aria-label="Applicant detail">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 font-display text-[22px] font-bold text-forest-800">{a.name}</h2>
          <p className="m-0 text-[14px] text-muted">
            {a.id} · {a.type} · {a.society === "ED" ? "Edo society" : "FCT society"} · {CHAPTERS[a.chapter]} · source {a.source === "gform" ? "Google Form (gform)" : "website"}
          </p>
        </div>
        <Pill>{a.status}</Pill>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Applicant</h3>
          <KeyVals
            items={[
              ["Lives in", a.livesIn],
              ["Residence route", a.route],
              ["Land / home", a.landLocation ?? "—"],
              ["Submitted", `${fmtDate(a.submittedAt)}${a.submittedTime ? ` at ${a.submittedTime} (Lagos)` : ""}`],
              ["Decide by", pending ? `${fmtDate(due)} · ${worked} working day${worked === 1 ? "" : "s"} so far (target 2)` : "—"],
              ["Nominees", a.type === "Group" ? "Not applicable (group)" : a.nominees.length ? `${a.nominees.length} named · total ${nomTotal}%` : "None yet"],
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">ID check (provider result)</h3>
          <KeyVals
            items={[
              ["ID type", a.kyc.idType],
              ["Provider", a.kyc.provider === "—" ? "Not started" : `${a.kyc.provider} · ref ${a.kyc.providerRef}`],
              ["Liveness", a.kyc.liveness],
              ["Document match", a.kyc.docMatch],
              ["Address", a.kyc.addressOk ? "Confirmed" : "Not confirmed"],
              ["Result", <Pill key="r">{a.kyc.result}</Pill>],
            ]}
          />
          <p className="m-0 text-[12px] text-muted">Raw BVN, NIN and passport numbers are never shown or stored here.</p>
        </div>
      </div>

      <ul className="m-0 grid list-none gap-1.5 rounded-[14px] bg-[#FBF8EE] p-3.5 text-[14px]">
        {list.map((c) => (
          <li key={c.label} className="flex items-start gap-2">
            {c.ok ? <CheckIcon size={17} className="mt-0.5 shrink-0 text-forest-800" /> : <XIcon size={17} className="mt-0.5 shrink-0 text-danger" />}
            <span className={c.ok ? "" : "font-semibold text-danger"}>{c.label}</span>
          </li>
        ))}
      </ul>

      {a.duplicates?.length ? (
        <Banner tone="warn" title="Possible duplicate:">
          This looks like the same person as{" "}
          {a.duplicates.map((d, i) => (
            <span key={d.id}>
              {i > 0 ? "; " : ""}
              <strong>{d.name}</strong> ({d.id}, {d.status.toLowerCase()} — {d.why.join(", ")})
            </span>
          ))}
          . Check before approving: one person may hold only one membership.
        </Banner>
      ) : null}

      <IdDocuments a={a} />

      <Receipt a={a} />

      {a.note ? (
        <Banner tone="warn" title="Note:">
          {a.note}
        </Banner>
      ) : null}
      {a.decisionReason ? (
        <Banner tone={a.status === "Refused" ? "danger" : "info"} title="Decision:">
          {a.decisionReason} {a.decidedBy ? `— ${a.decidedBy}` : ""}
          {a.status === "Refused" ? " The applicant may ask the next general meeting to review the refusal (6.2)." : ""}
        </Banner>
      ) : null}

      {a.memberNo && a.status !== "Refused" ? (
        <div className="flex flex-col gap-2 rounded-[12px] bg-forest-800 px-4 py-3 text-cream">
          <p className="m-0 flex flex-wrap items-center gap-2 text-[14px]">
            <CheckIcon size={18} className="text-gold" /> Member number issued: <b className="font-display tracking-wide text-gold">{a.memberNo}</b>
            <span className="text-[12.5px] text-[#C9D3CC]">— the payment reference for life</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {/^HBC-/.test(a.memberNo) ? (
              <a
                href={`/api/admin/members/${encodeURIComponent(a.memberNo)}/certificate`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-[10px] border border-[#C9D3CC]/40 px-3 py-1.5 text-[13px] font-semibold text-cream hover:bg-white/10"
              >
                <DownloadIcon size={16} /> Membership certificate (PDF)
              </a>
            ) : null}
            {a.receiptNo ? (
              <a
                href={`/api/admin/applications/${encodeURIComponent(a.id)}/fee-receipt`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-[10px] border border-[#C9D3CC]/40 px-3 py-1.5 text-[13px] font-semibold text-cream hover:bg-white/10"
              >
                <DownloadIcon size={16} /> Fee receipt {a.receiptNo}
              </a>
            ) : null}
            <button
              type="button"
              disabled={deciding}
              onClick={() => onSendWelcome(a)}
              className="inline-flex w-fit items-center gap-2 rounded-[10px] bg-gold px-3 py-1.5 text-[13px] font-semibold text-ink hover:brightness-95 disabled:opacity-60"
            >
              {deciding ? "Sending…" : a.welcomeSentAt ? "Resend welcome pack" : "Send welcome pack"}
            </button>
          </div>
          {a.welcomeSentAt ? (
            <p className="m-0 text-[12.5px] text-[#C9D3CC]">Welcome pack sent {a.welcomeSentAt} to {a.email}.</p>
          ) : null}
        </div>
      ) : null}

      {pending ? (
        <>
          <div className="flex flex-wrap gap-2">
            {a.routeKind === "none" ? (
              <Btn variant="primary" reason={decideReason} onClick={() => onSupporter(a)}>
                Move to Supporter list
              </Btn>
            ) : (
              <Btn
                variant="primary"
                reason={decideReason ?? (failing ? `Cannot approve: ${failing.why}` : undefined)}
                disabled={deciding}
                onClick={() => onApprove(a)}>
                {deciding ? "Saving…" : "Approve"}
              </Btn>
            )}
            {a.kyc.result !== "Pass" ? (
              <Btn variant="primary" reason={decideReason} disabled={deciding} onClick={() => onIdCheck(a, "Pass")}>
                {deciding ? "Saving…" : "ID checked — passed"}
              </Btn>
            ) : null}
            {a.kyc.result !== "Fail" ? (
              <Btn reason={decideReason} disabled={deciding} onClick={() => onIdCheck(a, "Fail")}>
                ID check failed
              </Btn>
            ) : null}
            <Btn reason={decideReason} aria-pressed={mode === "info"} onClick={() => setMode(mode === "info" ? null : "info")}>
              Ask for info
            </Btn>
            <Btn variant="danger" reason={decideReason} aria-pressed={mode === "refuse"} onClick={() => setMode(mode === "refuse" ? null : "refuse")}>
              Refuse
            </Btn>
          </div>
          {failing && !decideReason && a.routeKind !== "none" ? <p className="m-0 -mt-1 text-[13px] text-danger">Approve is blocked: {failing.why}</p> : null}
          {mode && mode !== "delete" ? (
            <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-[#FBF8EE] p-3.5">
              <label htmlFor="kyc-reason" className="text-[14px] font-semibold text-ink">
                {mode === "info" ? "What do you need from the applicant?" : "Reason for refusing (recorded and sent to the applicant)"}
              </label>
              <textarea
                id="kyc-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-invalid={Boolean(err)}
                aria-describedby={err ? "kyc-reason-err" : undefined}
                className={`${inputCls} h-auto! w-full py-2.5`}
              />
              {err ? (
                <p id="kyc-reason-err" className="m-0 text-[13px] font-semibold text-danger" role="alert">
                  {err}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Btn variant={mode === "info" ? "primary" : "danger"} disabled={deciding} onClick={() => onSubmitReason(a)}>
                  {deciding ? "Saving…" : mode === "info" ? "Send request" : "Confirm refusal"}
                </Btn>
                <Btn variant="ghost" onClick={() => setMode(null)}>
                  Cancel
                </Btn>
              </div>
            </div>
          ) : null}
        </>
      ) : a.status === "Approved (fee due)" ? (
        <div className="flex flex-col gap-2">
          <Banner tone="info" title="Waiting for the joining fee.">
            {fee} to {s.settings.joiningFeePayee} by Stripe or First Bank. Not share capital. Track it under Joining fees.
          </Banner>
          <Btn variant="primary" reason={decideReason} disabled={deciding} onClick={() => onConfirmFee(a)}>
            {deciding ? "Saving…" : "Confirm fee received"}
          </Btn>
        </div>
      ) : a.status === "Fee paid" ? (
        <div className="flex flex-col gap-2">
          {a.receiptNo && !a.memberNo ? (
            <a
              href={`/api/admin/applications/${encodeURIComponent(a.id)}/fee-receipt`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-[10px] border border-line px-3 py-1.5 text-[13px] font-semibold text-forest-800 hover:bg-mint/40"
            >
              <DownloadIcon size={16} /> Fee receipt {a.receiptNo}
            </a>
          ) : null}
          <p className="m-0 text-[14px] text-muted">
            Fee paid. Under 6.4 the person becomes a member once they are entered in the register and their first share is paid.
          </p>
          <div>
            <Btn variant="primary" reason={decideReason ?? (a.memberNo && s.member(a.memberNo) ? "Already entered in the register." : undefined)} onClick={() => onRegister(a)}>
              Enter in register
            </Btn>
          </div>
        </div>
      ) : null}

      {/* Available whatever the status: a test entry or a duplicate needs removing just as much as
          a decided one, and a registration holds an ID number worth not keeping by accident. */}
      <div className="mt-1 border-t border-line pt-3.5">
        {mode === "delete" ? (
          <div className="flex flex-col gap-2 rounded-[14px] border border-danger bg-[#FDF3F0] p-3.5">
            <p className="m-0 text-[14px] font-semibold text-danger">Delete this registration permanently?</p>
            <p className="m-0 text-[13.5px]">
              Everything held for {a.name} goes, including their ID number, their nominees and any receipt they uploaded.
              There is no undo and no copy kept.
            </p>
            {err ? (
              <p className="m-0 text-[13px] font-semibold text-danger" role="alert">
                {err}
              </p>
            ) : null}
            <div className="mt-0.5 flex flex-wrap gap-2">
              <Btn variant="danger" reason={deleting ? "Deleting…" : undefined} onClick={() => onDelete(a)}>
                {deleting ? "Deleting…" : "Yes, delete"}
              </Btn>
              <Btn variant="ghost" onClick={() => setMode(null)}>
                No, keep it
              </Btn>
            </div>
          </div>
        ) : (
          <Btn
            variant="danger"
            size="sm"
            reason={canDecide ? undefined : "Only the KYC officer can delete a registration."}
            onClick={() => setMode("delete")}
          >
            <BinIcon size={16} />
            Delete registration
          </Btn>
        )}
      </div>
    </Card>
  );
}

/**
 * The applicant's ID, proof of address and replies to information requests (brief p.4: the vetting
 * queue has an "ID viewer").
 *
 * Nothing is loaded until the officer clicks View. That asks the server for a link valid for five
 * minutes, and opening it records the view in the audit log before the file is shown (brief p.6).
 */
function IdDocuments({ a }: { a: Application }) {
  const toast = useToast();
  const [opening, setOpening] = useState<string | null>(null);
  const docs = a.documents ?? [];
  const hasId = docs.some((d) => d.type === "id");
  const hasAddress = docs.some((d) => d.type === "address");

  async function view(id: string) {
    // Opened before the request so the browser treats it as the click's own window, not a pop-up.
    const tab = window.open("about:blank", "_blank");
    setOpening(id);
    try {
      const res = await fetch(`/api/admin/documents/${encodeURIComponent(id)}/link`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      // The status code makes a failure diagnosable from a screenshot; the server log has the detail.
      if (!res.ok || !data.ok || !data.url) throw new Error(`${data.error || "Could not open the document"} (error ${res.status}).`);
      if (tab) tab.location.href = data.url;
      else window.location.href = data.url;
    } catch (err) {
      tab?.close();
      toast(err instanceof Error ? err.message : "Could not open the document.", "warn");
    } finally {
      setOpening(null);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-line p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Documents and signed forms</h3>
        <span className="text-[12.5px] text-muted">Every view is recorded in the audit log</span>
      </div>

      {a.memberNo ? (
        <p className="m-0 text-[13.5px]">
          <strong>Membership forms:</strong> declaration {a.forms?.declarationAt ? `signed ${a.forms.declarationAt}` : "not signed yet"} · nominee
          form {a.forms?.nomineeAt ? `signed ${a.forms.nomineeAt}` : "not signed yet"}
        </p>
      ) : null}

      {a.infoResponse ? (
        <div className="rounded-[10px] bg-mist px-3 py-2.5 text-[13.5px]">
          <strong>Applicant replied {a.infoResponse.at}:</strong> {a.infoResponse.message || "(no message — file attached)"}
        </div>
      ) : null}

      {docs.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
              <span className="min-w-0">
                <strong>{d.label}</strong> · {d.name} · {prettyBytes(d.bytes)}
                <span className="block text-[12.5px] text-muted">Uploaded {d.uploadedAt}</span>
              </span>
              <Btn size="sm" disabled={opening === d.id} onClick={() => void view(d.id)}>
                <FileIcon size={16} />
                {opening === d.id ? "Opening…" : "View"}
              </Btn>
            </li>
          ))}
        </ul>
      ) : null}

      {!hasId || !hasAddress ? (
        <p className="m-0 text-[13px] text-danger">
          Not yet uploaded: {[!hasId && "ID document", !hasAddress && "proof of address"].filter(Boolean).join(" and ")}. The applicant can add
          {!hasId && !hasAddress ? " them" : " it"} from their account.
        </p>
      ) : null}
    </div>
  );
}

/** How big a receipt is, for the officer deciding whether to open it on a slow connection. */
const prettyBytes = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`);

/**
 * The payment receipt the applicant uploaded on the VEKAT form.
 *
 * The bytes are never in this page: the image is loaded from an admin-only route when the officer
 * asks for it, so a queue of 300 applications does not carry 300 screenshots with it.
 */
function Receipt({ a }: { a: Application }) {
  const [open, setOpen] = useState(false);

  if (!a.receipt) {
    return (
      <div className="rounded-[14px] border border-dashed border-line p-3.5">
        <p className="m-0 text-[13.5px] text-muted">
          No payment receipt uploaded.
          {a.payerName ? ` Paid from an account in the name of ${a.payerName}.` : ""}
        </p>
      </div>
    );
  }

  const src = `/api/admin/applications/${encodeURIComponent(a.id)}/receipt`;
  const isImage = a.receipt.type.startsWith("image/");

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-line p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Payment receipt</h3>
        <span className="text-[12.5px] text-muted">
          {a.receipt.name} · {prettyBytes(a.receipt.bytes)}
        </span>
      </div>

      {a.payerName ? (
        <p className="m-0 text-[13.5px]">
          Paid from an account in the name of <strong>{a.payerName}</strong>, not the applicant&rsquo;s own.
        </p>
      ) : null}

      {isImage && open ? (
        /* eslint-disable-next-line @next/next/no-img-element -- a private, admin-only byte stream, not an optimisable asset */
        <img src={src} alt={`Payment receipt for ${a.name}`} className="max-h-[420px] w-full rounded-[10px] border border-line object-contain" />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {isImage ? (
          <Btn onClick={() => setOpen((v) => !v)}>{open ? "Hide receipt" : "Show receipt"}</Btn>
        ) : null}
        <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 text-[13.5px] font-semibold text-forest-800 transition hover:bg-mist">
          <FileIcon size={16} />
          Open in a new tab
        </a>
      </div>
    </div>
  );
}
