"use client";

import { useState } from "react";
import { MOTIONS, TODAY, type Motion, type Proxy, type Vote } from "@/lib/admin-data";
import { useToast } from "@/components/ui/Toast";
import { useAdmin } from "../store";
import { addDays, fmtDate } from "../lib";
import { Banner, Btn, Card, CardTitle, Empty, Field, PageHeader, Pill, ReadOnly, Table, Td, Th, cx, inputCls } from "../ui";

let pxSeq = 50;

/** Works out which proxies count: appointer and holder must be voting members; a holder's proxies beyond the limit don't count (16.4). */
export function useProxyValidity() {
  const s = useAdmin();
  const perHolder: Record<string, number> = {};
  const out = [...s.proxies]
    .sort((a, b) => a.givenAt.localeCompare(b.givenAt))
    .map((p) => {
      const ap = s.member(p.appointer);
      const ho = s.member(p.holder);
      let problem: string | null = null;
      if (!ap || !s.canVote(ap)) problem = `Appointer cannot vote (${ap?.status ?? "not a member"})`;
      else if (!ho || !s.canVote(ho)) problem = `Holder cannot vote (${ho?.status ?? "not a member"})`;
      else {
        perHolder[p.holder] = (perHolder[p.holder] ?? 0) + 1;
        if (perHolder[p.holder] > s.settings.maxProxies) problem = `Over the limit — proxy no. ${perHolder[p.holder]} for this holder (max ${s.settings.maxProxies})`;
      }
      return { ...p, problem };
    });
  return out;
}

export function MeetingsScreen() {
  const s = useAdmin();
  const toast = useToast();
  const manage = s.can("meetings.manage");
  const manageReason = manage ? undefined : "Only the Board manages meetings, proxies and vote records.";

  const voters = s.members.filter((m) => s.canVote(m));
  const home = voters.filter((m) => m.base === "home").length;
  const diaspora = voters.length - home;
  const required = Math.min(Math.ceil(voters.length * 0.2), 50);
  const each = Math.ceil(required * 0.25);
  const [pHome, setPHome] = s.ui("mtg.home", "0");
  const [pDia, setPDia] = s.ui("mtg.dia", "0");
  const h = Math.max(0, Number(pHome) || 0);
  const d = Math.max(0, Number(pDia) || 0);
  const quorumProblems = [
    h + d < required ? `needs ${required} present (has ${h + d})` : null,
    h < each ? `needs at least ${each} home member${each === 1 ? "" : "s"}` : null,
    d < each ? `needs at least ${each} diaspora member${each === 1 ? "" : "s"}` : null,
    h > home ? `only ${home} home members can vote` : null,
    d > diaspora ? `only ${diaspora} diaspora members can vote` : null,
  ].filter(Boolean);

  const [date, setDate] = useState(s.meetingDate ?? "");
  const earliest = addDays(TODAY, 21);

  function setMeeting() {
    if (!date) return toast("Choose a date for the AGM.", "warn");
    if (date < earliest) return toast(`At least 21 days’ notice is needed (16.3). The earliest date is ${fmtDate(earliest)}.`, "warn");
    s.addLog("Set AGM date and sent notice", "First AGM", s.meetingDate ?? "TBA", `${date} · notice with agenda by email and WhatsApp`);
    s.setMeetingDate(date);
    toast(`First AGM set for ${fmtDate(date)}. Notice and agenda sent (21 days, 16.3).`);
  }

  const proxies = useProxyValidity();
  const holders = Object.entries(
    proxies.reduce<Record<string, number>>((acc, p) => {
      acc[p.holder] = (acc[p.holder] ?? 0) + 1;
      return acc;
    }, {}),
  );

  return (
    <>
      <PageHeader title="Meetings and votes" subtitle="One member, one vote (7a) · up to five proxies per holder (16.4)" />
      {!manage ? <ReadOnly why={`${s.role.title} can see meetings, quorum, proxies and votes. The Board records them.`} /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="flex flex-col gap-3 p-5">
          <CardTitle aside={<Pill tone={s.meetingDate ? "green" : "warm"}>{s.meetingDate ? "Notice sent" : "Date TBA"}</Pill>}>First Annual General Meeting</CardTitle>
          <p className="m-0 text-[14px] text-muted">
            {s.meetingDate
              ? `Set for ${fmtDate(s.meetingDate)}. Notice with the agenda went out today — at least 21 days ahead (16.3).`
              : "Date to be announced. Notice with the agenda goes to every member by email and WhatsApp at least 21 days before (16.3); bye-law changes need the proposed wording in the notice (23.1)."}
          </p>
          <div className="flex flex-wrap items-end gap-2.5">
            <Field label="AGM date" className="w-56">
              <input type="date" value={date} min={earliest} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </Field>
            <Btn variant="primary" reason={manageReason} onClick={setMeeting}>
              {s.meetingDate ? "Move date" : "Set date and send notice"}
            </Btn>
          </div>
          <p className="m-0 text-[12.5px] text-muted">Earliest date with 21 days’ notice: {fmtDate(earliest)}</p>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <CardTitle aside={<Pill tone={quorumProblems.length ? "red" : "green"}>{quorumProblems.length ? "Not quorate" : "Quorate"}</Pill>}>Quorum calculator (16.5)</CardTitle>
          <p className="m-0 text-[14px] text-muted">
            {voters.length} members can vote now ({home} home · {diaspora} diaspora; dormant and suspended members cannot). Quorum is the lesser of 20% of members or 50 ={" "}
            <b className="text-ink">{required}</b>, including at least a quarter from each group = <b className="text-ink">{each} home and {each} diaspora</b>.
          </p>
          <div className="flex flex-wrap items-end gap-2.5">
            <Field label="Home members present" className="w-52">
              <input inputMode="numeric" value={pHome} onChange={(e) => setPHome(e.target.value.replace(/\D/g, ""))} className={inputCls} />
            </Field>
            <Field label="Diaspora members present" className="w-52">
              <input inputMode="numeric" value={pDia} onChange={(e) => setPDia(e.target.value.replace(/\D/g, ""))} className={inputCls} />
            </Field>
          </div>
          <p className={cx("m-0 text-[14px] font-semibold", quorumProblems.length ? "text-danger" : "text-forest-800")} aria-live="polite">
            {quorumProblems.length ? `Not quorate: ${quorumProblems.join("; ")}. If there is no quorum the meeting adjourns for 7 days.` : "Quorate — the meeting can proceed."}
          </p>
        </Card>
      </div>

      <ProxiesCard proxies={proxies} holders={holders} manageReason={manageReason} />

      <Card className="flex flex-col gap-4 p-5">
        <CardTitle aside={<span className="text-[13px] text-muted">Sample test-run votes</span>}>Motions</CardTitle>
        {s.meetingDate ? null : <Banner tone="info">Voting opens with the notice. The votes below are a test run on sample data to show the counting rules.</Banner>}
        {MOTIONS.map((motion) => (
          <MotionRow key={motion.id} motion={motion} votes={s.votes.filter((v) => v.motionId === motion.id)} proxies={proxies} manageReason={manageReason} />
        ))}
      </Card>
    </>
  );
}


function ProxiesCard({ proxies, holders, manageReason }: { proxies: (Proxy & { problem: string | null })[]; holders: [string, number][]; manageReason?: string }) {
  const s = useAdmin();
  const toast = useToast();
  const [ap, setAp] = useState("");
  const [ho, setHo] = useState("");
  const voters = s.members.filter((m) => s.canVote(m));
  const violations = proxies.filter((p) => p.problem);

  function add() {
    if (!ap || !ho) return toast("Choose who appoints and who holds the proxy.", "warn");
    if (ap === ho) return toast("A member cannot appoint themselves as proxy.", "warn");
    if (s.proxies.some((p) => p.appointer === ap)) return toast(`${ap} has already appointed a proxy. Remove it first.`, "warn");
    const valid = proxies.filter((p) => p.holder === ho && !p.problem).length;
    if (valid >= s.settings.maxProxies) return toast(`${ho} already holds ${valid} proxies — the maximum is ${s.settings.maxProxies} (16.4).`, "warn");
    s.setProxies((cur) => [...cur, { id: `PX-${pxSeq++}`, appointer: ap, holder: ho, givenAt: TODAY }]);
    s.addLog("Recorded proxy appointment", `${ap} → ${ho}`, "—", "Valid");
    toast(`Proxy recorded: ${ap} appoints ${ho}.`);
    setAp("");
    setHo("");
  }

  function remove(p: Proxy) {
    s.setProxies((cur) => cur.filter((x) => x.id !== p.id));
    s.addLog("Removed proxy appointment", `${p.appointer} → ${p.holder}`, "Recorded", "Removed");
    toast("Proxy removed.");
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <CardTitle aside={violations.length ? <Pill tone="red">{`${violations.length} not counted`}</Pill> : <Pill tone="green">All valid</Pill>}>Proxies</CardTitle>
      <div className="flex flex-wrap gap-2 text-[13px]">
        {holders.map(([no, n]) => (
          <span key={no} className={cx("rounded-full px-3 py-1 font-semibold", n > s.settings.maxProxies ? "bg-[#F6DED8] text-danger" : "bg-mist text-forest-800")}>
            {s.member(no)?.name ?? no} holds {n}
            {n > s.settings.maxProxies ? ` — over the limit of ${s.settings.maxProxies}` : ""}
          </span>
        ))}
      </div>
      {proxies.length === 0 ? (
        <Empty title="No proxies appointed." />
      ) : (
        <Table minWidth={720} label="Proxy appointments">
          <thead>
            <tr>
              <Th>Appointer</Th>
              <Th>Proxy holder</Th>
              <Th>Given</Th>
              <Th>Counts?</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {proxies.map((p) => (
              <tr key={p.id}>
                <Td>
                  {s.member(p.appointer)?.name} <span className="text-[12.5px] text-muted">{p.appointer}</span>
                </Td>
                <Td>
                  {s.member(p.holder)?.name} <span className="text-[12.5px] text-muted">{p.holder}</span>
                </Td>
                <Td className="whitespace-nowrap">{fmtDate(p.givenAt, true)}</Td>
                <Td>{p.problem ? <span className="text-[13px] font-semibold text-danger">{p.problem}</span> : <Pill tone="green">Valid</Pill>}</Td>
                <Td>
                  <Btn size="sm" variant="ghost" reason={manageReason} onClick={() => remove(p)}>
                    Remove
                  </Btn>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <div className="flex flex-wrap items-end gap-2.5 border-t border-line/80 pt-4">
        <Field label="Appointer" className="min-w-[220px] flex-1 sm:max-w-xs">
          <select value={ap} onChange={(e) => setAp(e.target.value)} className={inputCls}>
            <option value="">Choose a voting member…</option>
            {voters.map((m) => (
              <option key={m.no} value={m.no}>
                {m.no} · {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Proxy holder" className="min-w-[220px] flex-1 sm:max-w-xs">
          <select value={ho} onChange={(e) => setHo(e.target.value)} className={inputCls}>
            <option value="">Choose a voting member…</option>
            {voters.map((m) => (
              <option key={m.no} value={m.no}>
                {m.no} · {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Btn variant="primary" reason={manageReason} onClick={add}>
          Record proxy
        </Btn>
      </div>
    </Card>
  );
}

function MotionRow({ motion, votes, proxies, manageReason }: { motion: Motion; votes: Vote[]; proxies: (Proxy & { problem: string | null })[]; manageReason?: string }) {
  const s = useAdmin();
  const toast = useToast();
  const [who, setWho] = useState("");
  const [choice, setChoice] = useState<Vote["choice"]>("For");
  const [channel, setChannel] = useState<Vote["channel"]>("Online");
  const voters = s.members.filter((m) => s.canVote(m));

  const f = votes.filter((v) => v.choice === "For").length;
  const a = votes.filter((v) => v.choice === "Against").length;
  const ab = votes.filter((v) => v.choice === "Abstain").length;
  const cast = f + a;
  const share = cast ? f / cast : 0;
  const need = motion.kind === "bylaw" ? 2 / 3 : 0.5;
  const passes = motion.kind === "bylaw" ? share >= need : share > need;

  function record() {
    const m = s.member(who);
    if (!m) return toast("Choose the member voting.", "warn");
    if (!s.canVote(m)) return toast(`${m.no} cannot vote (${m.status}).`, "warn");
    if (votes.some((v) => v.memberNo === m.no)) return toast(`${m.no} has already voted on this motion — one member, one vote (7a).`, "warn");
    let proxyHolder: string | undefined;
    if (channel === "By proxy") {
      const p = proxies.find((x) => x.appointer === m.no && !x.problem);
      if (!p) return toast(`${m.no} has no valid proxy on record, so a proxy vote cannot be counted (16.4).`, "warn");
      proxyHolder = p.holder;
    }
    s.setVotes((cur) => [...cur, { motionId: motion.id, memberNo: m.no, choice, channel, proxyHolder }]);
    s.addLog("Recorded vote", `${motion.id} · ${m.no}`, "—", `${choice} (${channel}${proxyHolder ? ` via ${proxyHolder}` : ""})`);
    toast(`Vote recorded for ${m.no}: ${choice}.`);
    setWho("");
  }

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-line/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <b className="font-semibold text-ink">{motion.title}</b>
          <div className="text-[13px] text-muted">
            {motion.id} · {motion.kind === "bylaw" ? "Bye-law change — needs two-thirds of votes cast (16.6, 23.1)" : "Ordinary resolution — simple majority"} · clause {motion.clause}
          </div>
        </div>
        <Pill tone={cast === 0 ? "grey" : passes ? "green" : "red"}>{cast === 0 ? "No votes yet" : passes ? "Would pass" : "Would fail"}</Pill>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px]">
        <span>
          For <b>{f}</b>
        </span>
        <span>
          Against <b>{a}</b>
        </span>
        <span>
          Abstain <b>{ab}</b>
        </span>
        <span className="text-muted">
          {cast ? `${(share * 100).toFixed(1)}% for of ${cast} cast · needs ${motion.kind === "bylaw" ? "≥ 66.7%" : "> 50%"}` : "Abstentions are not counted as votes cast"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#EFEADA]" aria-hidden="true">
        <div className={cx("h-full", passes ? "bg-forest-800" : "bg-gold")} style={{ width: `${share * 100}%` }} />
      </div>
      <div className="flex flex-wrap items-end gap-2.5">
        <Field label="Member" className="min-w-[220px] flex-1 sm:max-w-xs">
          <select value={who} onChange={(e) => setWho(e.target.value)} className={inputCls} aria-label={`Member voting on ${motion.id}`}>
            <option value="">Choose a voting member…</option>
            {voters.map((m) => (
              <option key={m.no} value={m.no}>
                {m.no} · {m.name}
                {votes.some((v) => v.memberNo === m.no) ? " (voted)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vote" className="w-32">
          <select value={choice} onChange={(e) => setChoice(e.target.value as Vote["choice"])} className={inputCls}>
            <option>For</option>
            <option>Against</option>
            <option>Abstain</option>
          </select>
        </Field>
        <Field label="How" className="w-36">
          <select value={channel} onChange={(e) => setChannel(e.target.value as Vote["channel"])} className={inputCls}>
            <option>Online</option>
            <option>In person</option>
            <option>By proxy</option>
          </select>
        </Field>
        <Btn reason={manageReason} onClick={record}>
          Record vote
        </Btn>
      </div>
    </div>
  );
}
