"use client";

import { useRef, useState } from "react";
import { CHAPTERS, PENDING_APP, TODAY, type Application, type AppStatus, type MemberType, type Region } from "@/lib/admin-data";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon, DownloadIcon, FileIcon, XIcon } from "@/components/ui/Icons";
import { useAdmin } from "../store";
import { addDays, daysBetween, download, fmtDate, naira, parseCsv, workingDaysBetween } from "../lib";
import { Banner, Btn, Card, CardTitle, Empty, KeyVals, PageHeader, Pill, ReadOnly, cx, inputCls } from "../ui";

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

export function ApplicationsScreen() {
  const s = useAdmin();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = s.ui<Filter>("app.filter", "pending");
  const [selId, setSelId] = s.ui<string>("app.sel", "APP-0141");
  const [mode, setMode] = useState<null | "info" | "refuse">(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  const canDecide = s.can("kyc.decide");
  const decideReason = canDecide ? undefined : "Only the KYC officer decides applications.";

  const list = s.apps.filter((a) => inList(filter, a.status)).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
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

  function approve(a: Application) {
    const seq = String(s.nextSeq()).padStart(6, "0");
    const memberNo = `HB-${a.society}-${a.chapter}-${seq}`;
    update(a.id, { status: "Approved (fee due)", memberNo, decidedBy: s.role.person, note: undefined, kyc: { ...a.kyc, reviewer: s.role.person } });
    s.addLog("Approved application", a.id, a.status, `Approved (fee due) · issued ${memberNo}`);
    toast(`${a.name} approved. Member number ${memberNo} issued — joining-fee link sent.`);
  }

  function submitReason(a: Application) {
    const r = reason.trim();
    if (r.length < 5) {
      setErr(mode === "refuse" ? "Please give a reason for refusing — it is recorded and shown to the applicant." : "Please say what you need from the applicant.");
      return;
    }
    if (mode === "info") {
      update(a.id, { status: "Info requested", note: r });
      s.addLog("Requested information", a.id, a.status, `Info requested: ${r}`);
      toast(`Information request sent to ${a.name} by WhatsApp and email.`);
    } else {
      update(a.id, { status: "Refused", decisionReason: r, decidedBy: s.role.person });
      s.addLog("Refused application", a.id, a.status, `Refused: ${r}`);
      toast(`${a.name} refused. Reason recorded; they may ask the next general meeting to review it (6.2).`);
    }
    setMode(null);
    setReason("");
    setErr("");
  }

  function toSupporter(a: Application) {
    update(a.id, { status: "Supporter", decidedBy: s.role.person, decisionReason: "No residence route yet (5.2) — added to the Supporter list." });
    s.addLog("Moved to Supporter list", a.id, a.status, "Supporter (5.2)");
    toast(`${a.name} added to the free Supporter list.`);
  }

  function sendIdLink(a: Application) {
    update(a.id, { status: "In review", kyc: { ...a.kyc, result: "Pending", liveness: "Pending", docMatch: "Pending" } });
    s.addLog("Sent ID-check link", a.id, `${a.status} · ID ${a.kyc.result}`, "In review · ID check pending");
    toast(`ID-check link sent to ${a.name}. The provider result will appear here.`);
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

  async function importForm(f: File) {
    const rows = parseCsv(await f.text());
    if (rows.length && /timestamp|name/i.test(rows[0].join(","))) rows.shift();
    const added: Application[] = [];
    let skipped = 0;
    const errors: string[] = [];
    rows.forEach((r, i) => {
      const [ts, name, dob, country, state, city, phone, email, typeRaw, societyRaw, chapterRaw, routeRaw, land, idType] = r;
      if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(dob ?? "")) {
        errors.push(`Row ${i + 2}: needs a name and a date of birth (YYYY-MM-DD).`);
        return;
      }
      if ([...s.apps, ...added].some((a) => a.name === name && a.phone === phone)) {
        skipped++;
        return;
      }
      const nigeria = /nigeria/i.test(country ?? "");
      const region: Region = nigeria ? (/edo/i.test(state) ? "NG-ED" : /fct|abuja/i.test(state) ? "NG-FC" : "NG-OTHER") : /^(united kingdom|uk|england|scotland|wales|northern ireland)$/i.test(country ?? "") ? "UK" : /^(united states|usa|us)$/i.test(country ?? "") ? "US" : "AFRICA";
      const society = /fct|fc|abuja/i.test(societyRaw ?? "") ? "FC" : "ED";
      const chapter = (chapterRaw ?? "").toUpperCase() in CHAPTERS ? (chapterRaw ?? "").toUpperCase() : { "NG-ED": "ED", "NG-FC": "AB", "NG-OTHER": "LA", UK: "UK", US: "US", AFRICA: "GH" }[region];
      const route = routeRaw || "Not given";
      const routeKind: Application["routeKind"] = /none/i.test(route) ? "none" : /group/i.test(route) ? "group" : /land/i.test(route) ? "land" : /home/i.test(route) ? "home" : /lives/i.test(route) ? "lives" : "other";
      const types: MemberType[] = ["Home", "Diaspora", "Founding", "Professional", "Group"];
      const type = types.find((t) => t.toLowerCase() === (typeRaw ?? "").toLowerCase()) ?? (nigeria ? "Home" : "Diaspora");
      const id = (["BVN", "NIN", "NR-BVN", "Passport"] as const).find((x) => x.toLowerCase() === (idType ?? "").toLowerCase()) ?? (nigeria ? "NIN" : "Passport");
      added.push({
        id: `APP-${String(appSeq++).padStart(4, "0")}`,
        name,
        type,
        society,
        chapter,
        base: nigeria ? "home" : "diaspora",
        livesIn: [city, nigeria ? state : country].filter(Boolean).join(", "),
        region,
        routeKind,
        route,
        landLocation: land || undefined,
        dob,
        goodCharacter: false,
        submittedAt: /^\d{4}-\d{2}-\d{2}/.test(ts ?? "") ? ts.slice(0, 10) : TODAY,
        status: routeKind === "none" ? "Supporter" : "Submitted",
        source: "gform",
        phone: phone ?? "",
        email: email ?? "",
        kyc: { idType: id, provider: "—", providerRef: "—", liveness: "Pending", docMatch: "Pending", addressOk: false, result: "Not started" },
        nominees: [],
        note: "Imported from the Google Form — ID check, nominees and declarations still to collect.",
      });
    });
    s.setApps((cur) => [...cur, ...added]);
    s.addLog("Imported Google Form responses", f.name, "—", `${added.length} applications (source = gform) · ${skipped} duplicates skipped · ${errors.length} errors`);
    if (added[0]) {
      setFilter("pending");
      select(added[0].id);
    }
    toast(`Imported ${added.length} Google Form response(s)${skipped ? `, ${skipped} duplicate(s) skipped` : ""}${errors.length ? `, ${errors.length} row(s) with errors` : ""}.`, errors.length ? "warn" : "info");
  }

  const readOnly = s.access("applications") !== "act";

  return (
    <>
      <PageHeader
        title="Applications"
        subtitle="KYC queue · decide within 30 days, target 2 working days (6.2)"
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

      {list.length === 0 || !sel ? (
        <Card className="p-5">
          <Empty title="Nothing in this list.">New applications arrive from /register or a Google Form import.</Empty>
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
                        {pending ? (
                          <span className={cx("block text-[12.5px]", left < 7 ? "font-semibold text-danger" : "text-muted")}>
                            {left >= 0 ? `Decide by ${fmtDate(due, true)} (${left} days)` : `Overdue since ${fmtDate(due, true)}`}
                          </span>
                        ) : null}
                      </span>
                      <Pill>{a.status}</Pill>
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
            onIdLink={sendIdLink}
            onRegister={enterRegister}
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
  onIdLink,
  onRegister,
}: {
  a: Application;
  mode: null | "info" | "refuse";
  setMode: (m: null | "info" | "refuse") => void;
  reason: string;
  setReason: (v: string) => void;
  err: string;
  decideReason?: string;
  onApprove: (a: Application) => void;
  onSubmitReason: (a: Application) => void;
  onSupporter: (a: Application) => void;
  onIdLink: (a: Application) => void;
  onRegister: (a: Application) => void;
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
              ["Submitted", fmtDate(a.submittedAt)],
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
        <p className="m-0 flex flex-wrap items-center gap-2 rounded-[12px] bg-forest-800 px-4 py-3 text-[14px] text-cream">
          <CheckIcon size={18} className="text-gold" /> Member number issued: <b className="font-display tracking-wide text-gold">{a.memberNo}</b>
          <span className="text-[12.5px] text-[#C9D3CC]">— the payment reference for life</span>
        </p>
      ) : null}

      {pending ? (
        <>
          <div className="flex flex-wrap gap-2">
            {a.routeKind === "none" ? (
              <Btn variant="primary" reason={decideReason} onClick={() => onSupporter(a)}>
                Move to Supporter list
              </Btn>
            ) : (
              <Btn variant="primary" reason={decideReason ?? (failing ? `Cannot approve: ${failing.why}` : undefined)} onClick={() => onApprove(a)}>
                Approve
              </Btn>
            )}
            {a.kyc.result === "Not started" ? (
              <Btn reason={decideReason} onClick={() => onIdLink(a)}>
                Send ID-check link
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
          {mode ? (
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
                <Btn variant={mode === "info" ? "primary" : "danger"} onClick={() => onSubmitReason(a)}>
                  {mode === "info" ? "Send request" : "Confirm refusal"}
                </Btn>
                <Btn variant="ghost" onClick={() => setMode(null)}>
                  Cancel
                </Btn>
              </div>
            </div>
          ) : null}
        </>
      ) : a.status === "Approved (fee due)" ? (
        <Banner tone="info" title="Waiting for the joining fee.">
          {fee} to {s.settings.joiningFeePayee} by Stripe or First Bank. Not share capital. Track it under Joining fees.
        </Banner>
      ) : a.status === "Fee paid" ? (
        <div className="flex flex-col gap-2">
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
    </Card>
  );
}
