"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Banner, Btn, Card, CardTitle, Field, Pill, cx, inputCls } from "../ui";

type Agm = { date: string; time: string; place: string; agenda: string; noticeSentAt: string; sent: number; failed: number; of: number };
type Person = { memberNo: string; name: string; group: "home" | "diaspora"; chapter: string };
type Replies = { yes: Person[]; no: Person[]; noReply: Person[]; yesHome: number; yesDiaspora: number };
type Data = { agm: Agm | null; voters: { total: number; home: number; diaspora: number }; replies: Replies | null; earliest: string; noticeDays: number };

const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const STAMP = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const dayLabel = (iso: string) => DAY.format(new Date(`${iso}T12:00:00Z`));

/** Loads the AGM and the voting-member counts once for both cards. */
function useMeetings() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    setErr("");
    fetch("/api/admin/meetings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Data & { ok?: boolean; error?: string }) => (d.ok ? setData(d) : setErr(d.error || "Could not load the meeting details.")))
      .catch(() => setErr("Could not reach the server."));
  }, []);
  useEffect(load, [load]);
  return { data, err, load };
}

export function MeetingCards() {
  const m = useMeetings();
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <AgmCard {...m} />
      <QuorumCard data={m.data} err={m.err} />
    </div>
  );
}

/**
 * Bye-law 16.3: at least 21 days' notice, with the agenda, to every member. Setting the date sends
 * the notice (email S) to every admitted member straight away.
 */
function AgmCard({ data, err, load }: { data: Data | null; err: string; load: () => void }) {
  const toast = useToast();
  const agm = data?.agm ?? null;
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("11:00");
  const [place, setPlace] = useState("");
  const [agenda, setAgenda] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [tell, setTell] = useState(true);
  const [reason, setReason] = useState("");
  const showForm = !agm || editing;

  async function cancel() {
    if (!agm || !data) return;
    if (!window.confirm(tell ? `Cancel the AGM and email all ${data.voters.total} members that it is cancelled?` : "Cancel the AGM without emailing members?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/meetings", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tellMembers: tell, reason }) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; sent?: number; failed?: number; of?: number };
      if (!res.ok || !d.ok) throw new Error(d.error || `That did not work (error ${res.status}).`);
      toast(
        tell ? `Meeting cancelled. ${d.sent} of ${d.of} members emailed${d.failed ? `, ${d.failed} failed` : ""}.` : "Meeting cancelled. Members were not emailed.",
        d.failed ? "warn" : undefined,
      );
      setCancelling(false);
      setReason("");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "That did not work.", "warn");
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    if (agm) {
      setDate(agm.date);
      setTime(agm.time || "11:00");
      setPlace(agm.place);
      setAgenda(agm.agenda);
    }
    setEditing(true);
  }

  async function send() {
    if (!data) return;
    if (!date || !place.trim() || !agenda.trim()) return toast("Fill in the date, the place and the agenda.", "warn");
    if (date < data.earliest) return toast(`At least ${data.noticeDays} days' notice is needed. The earliest date is ${dayLabel(data.earliest)}.`, "warn");
    const verb = agm ? "Move the AGM and email the new notice" : "Set the AGM and email the notice";
    if (!window.confirm(`${verb} to all ${data.voters.total} members now?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, place, agenda }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; agm?: Agm };
      if (!res.ok || !d.ok || !d.agm) throw new Error(d.error || `That did not work (error ${res.status}).`);
      toast(`AGM set for ${dayLabel(d.agm.date)}. Notice emailed to ${d.agm.sent} of ${d.agm.of} members${d.agm.failed ? `, ${d.agm.failed} failed` : ""}.`, d.agm.failed ? "warn" : undefined);
      setEditing(false);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "That did not work.", "warn");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle aside={<Pill tone={agm ? "green" : "warm"}>{agm ? "Notice sent" : "Date not set"}</Pill>}>Annual General Meeting</CardTitle>
      <p className="m-0 text-[14px] text-body">
        Set the date, place and agenda. Every member is emailed the notice straight away. The date must be at least 21 days ahead (bye-law 16.3).
      </p>
      {err ? <Banner tone="danger">{err}</Banner> : null}
      {!data ? (
        <p className="m-0 text-[14px] text-muted">Loading…</p>
      ) : (
        <>
          {agm && !editing ? (
            <div className="flex flex-col gap-2 rounded-xl border border-line bg-mist p-4 text-[14px]">
              <p className="m-0">
                <strong>{dayLabel(agm.date)}</strong>
                {agm.time ? `, ${agm.time}` : ""} · {agm.place}
              </p>
              <ol className="m-0 pl-5 text-body">
                {agm.agenda
                  .split("\n")
                  .map((l) => l.replace(/^\s*(\d+[.)]|[-*])\s*/, "").trim())
                  .filter(Boolean)
                  .map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
              </ol>
              <p className="m-0 text-[12.5px] text-muted">
                Notice emailed {STAMP.format(new Date(agm.noticeSentAt))} to {agm.sent} of {agm.of} members
                {agm.failed ? ` (${agm.failed} failed, see the audit log)` : ""}.
              </p>
              {data.replies ? <RepliesPanel r={data.replies} voters={data.voters} /> : null}
              <div className="flex flex-wrap gap-2">
                <Btn size="sm" onClick={startEdit}>
                  Move the meeting
                </Btn>
                <Btn size="sm" variant="ghost" onClick={() => setCancelling(!cancelling)}>
                  Cancel the meeting
                </Btn>
              </div>
              {cancelling ? (
                <div className="flex flex-col gap-2.5 rounded-xl border border-[#E9B9AD] bg-[#F9E7E2] p-3.5">
                  <strong className="text-[14.5px] text-danger">Cancel this meeting?</strong>
                  <label className="flex items-start gap-2 text-[14px] text-ink">
                    <input type="checkbox" checked={tell} onChange={(e) => setTell(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-forest-700" />
                    <span>
                      Email all members that it is cancelled
                      <span className="block text-[12.5px] text-muted">They were sent the notice, so it is best to tell them.</span>
                    </span>
                  </label>
                  {tell ? (
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason (optional), e.g. venue not available"
                      className={inputCls}
                      aria-label="Reason for cancelling"
                    />
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Btn size="sm" variant="primary" disabled={busy} onClick={() => void cancel()}>
                      {busy ? "Cancelling…" : "Yes, cancel the meeting"}
                    </Btn>
                    <Btn size="sm" variant="ghost" disabled={busy} onClick={() => setCancelling(false)}>
                      Keep it
                    </Btn>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {showForm ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-2.5">
                <Field label="Date" className="w-48">
                  <input id="agm-date" type="date" value={date} min={data.earliest} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Time (Lagos)" className="w-32">
                  <input id="agm-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Place" className="min-w-[220px] flex-1">
                  <input id="agm-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Benin City and online" className={inputCls} />
                </Field>
              </div>
              <Field label="Agenda (one item per line)">
                <textarea
                  id="agm-agenda"
                  rows={5}
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  placeholder={"Welcome and apologies\nAdopt the bye-laws\nElect the Board\nApprove the 2027 budget"}
                  className={cx(inputCls, "min-h-[120px] py-2")}
                />
              </Field>
              <p className="m-0 text-[12.5px] text-muted">Earliest date with 21 days&rsquo; notice: {dayLabel(data.earliest)}</p>
              <div className="flex flex-wrap gap-2">
                <Btn variant="primary" disabled={busy} onClick={() => void send()}>
                  {busy ? "Sending…" : agm ? "Move and email the new notice" : "Set date and email the notice"}
                </Btn>
                {agm ? (
                  <Btn variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
                    Cancel
                  </Btn>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}

/**
 * Bye-law 16.5: quorum is the lesser of 20% of voting members or 50, with at least a quarter from
 * each of the home and diaspora groups. The member numbers are live; the officer types who is present.
 */
function QuorumCard({ data, err }: { data: Data | null; err: string }) {
  const [pHome, setPHome] = useState("0");
  const [pDia, setPDia] = useState("0");
  const v = data?.voters ?? { total: 0, home: 0, diaspora: 0 };
  const required = Math.min(Math.ceil(v.total * 0.2), 50);
  const each = Math.ceil(required * 0.25);
  const h = Math.max(0, Number(pHome) || 0);
  const d = Math.max(0, Number(pDia) || 0);
  const problems = [
    h + d < required ? `needs ${required} present (has ${h + d})` : null,
    h < each ? `needs at least ${each} home member${each === 1 ? "" : "s"}` : null,
    d < each ? `needs at least ${each} diaspora member${each === 1 ? "" : "s"}` : null,
    h > v.home ? `only ${v.home} home members can vote` : null,
    d > v.diaspora ? `only ${v.diaspora} diaspora members can vote` : null,
  ].filter(Boolean);

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle aside={data ? <Pill tone={problems.length ? "red" : "green"}>{problems.length ? "Not quorate" : "Quorate"}</Pill> : null}>
        Quorum check on the day
      </CardTitle>
      <p className="m-0 text-[14px] text-body">At the meeting, type how many members are present. It tells you straight away if the meeting can go ahead (bye-law 16.5).</p>
      {err ? <Banner tone="danger">{err}</Banner> : null}
      {!data ? (
        <p className="m-0 text-[14px] text-muted">Loading…</p>
      ) : (
        <>
          <p className="m-0 text-[14px] text-muted">
            {v.total} members can vote ({v.home} home · {v.diaspora} diaspora). Quorum is the lesser of 20% of members or 50 ={" "}
            <b className="text-ink">{required}</b>, including at least a quarter from each group ={" "}
            <b className="text-ink">
              {each} home and {each} diaspora
            </b>
            .
          </p>
          <div className="flex flex-wrap items-end gap-2.5">
            <Field label="Home members present" className="w-52">
              <input id="q-home" inputMode="numeric" value={pHome} onChange={(e) => setPHome(e.target.value.replace(/\D/g, ""))} className={inputCls} />
            </Field>
            <Field label="Diaspora members present" className="w-52">
              <input id="q-dia" inputMode="numeric" value={pDia} onChange={(e) => setPDia(e.target.value.replace(/\D/g, ""))} className={inputCls} />
            </Field>
          </div>
          <p className={cx("m-0 text-[14px] font-semibold", problems.length ? "text-danger" : "text-forest-800")} aria-live="polite">
            {problems.length ? `Not quorate: ${problems.join("; ")}. Without a quorum the meeting adjourns for 7 days.` : "Quorate: the meeting can go ahead."}
          </p>
        </>
      )}
    </Card>
  );
}

/** Members' answers to "Will you attend?", and whether the meeting looks like it will be quorate. */
function RepliesPanel({ r, voters }: { r: Replies; voters: Data["voters"] }) {
  const [open, setOpen] = useState(false);
  const required = Math.min(Math.ceil(voters.total * 0.2), 50);
  const each = Math.ceil(required * 0.25);
  const likely = r.yes.length >= required && r.yesHome >= each && r.yesDiaspora >= each;
  const tiles = [
    ["Coming", r.yes.length, "border-forest-800 text-forest-800"],
    ["Can't come", r.no.length, "border-danger text-danger"],
    ["No reply yet", r.noReply.length, "border-line text-muted"],
  ] as const;
  const list = (title: string, people: Person[]) => (
    <div className="min-w-0">
      <p className="m-0 mb-1 text-[13px] font-bold text-ink">
        {title} ({people.length})
      </p>
      {people.length ? (
        <ul className="m-0 flex max-h-56 list-none flex-col gap-1 overflow-y-auto p-0 text-[13px]">
          {people.map((p) => (
            <li key={p.memberNo} className="rounded-md bg-paper px-2 py-1">
              <span className="block text-ink">{p.name}</span>
              <span className="block text-[11.5px] text-muted">
                {p.memberNo} · {p.group === "home" ? "Home" : "Diaspora"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[13px] text-muted">Nobody.</p>
      )}
    </div>
  );
  return (
    <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
      <p className="m-0 text-[14px] font-semibold text-ink">Members&rsquo; replies</p>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map(([label, n, cls]) => (
          <div key={label} className={`rounded-xl border-2 bg-paper px-2 py-1.5 text-center ${cls}`}>
            <span className="block text-[22px] leading-tight font-bold tabular-nums">{n}</span>
            <span className="block text-[12.5px] font-semibold">{label}</span>
          </div>
        ))}
      </div>
      <p className={cx("m-0 text-[13.5px]", likely ? "text-forest-800" : "text-body")}>
        {likely ? "On these replies the meeting should be quorate" : "Not enough replies yet for a quorum"}: {r.yes.length} coming ({r.yesHome} home, {r.yesDiaspora} diaspora); needs{" "}
        {required} ({each} home and {each} diaspora).
      </p>
      <div>
        <Btn size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Hide names" : "See names"}
        </Btn>
      </div>
      {open ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {list("Coming", r.yes)}
          {list("Can't come", r.no)}
          {list("No reply yet", r.noReply)}
        </div>
      ) : null}
    </div>
  );
}

