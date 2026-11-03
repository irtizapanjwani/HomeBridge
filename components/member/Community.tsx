"use client";

import { useState } from "react";
import { Card, btnPrimary, btnSecondary } from "./bits";

export type GlanceView = {
  funds: string[];
  members: number;
  percentUpToDate: number | null;
  zones: { zone: string; members: number; percentUpToDate: number | null }[];
  asOf: string;
};

/** Member Platform brief §3 "Transparency page": totals only, no names or amounts of any member. */
export function GlanceCard({ g }: { g: GlanceView }) {
  return (
    <Card>
      <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">HomeBridge at a glance</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-mist/70 px-4 py-3">
          <p className="m-0 text-[13px] text-muted">Funds held</p>
          <p className="m-0 mt-0.5 text-[17px] font-semibold text-forest-800">{g.funds.length ? g.funds.join(" + ") : "Nothing yet"}</p>
        </div>
        <div className="rounded-xl bg-mist/70 px-4 py-3">
          <p className="m-0 text-[13px] text-muted">Members</p>
          <p className="m-0 mt-0.5 text-[17px] font-semibold text-forest-800">{g.members.toLocaleString("en-GB")}</p>
        </div>
        <div className="rounded-xl bg-mist/70 px-4 py-3">
          <p className="m-0 text-[13px] text-muted">Up to date this month</p>
          <p className="m-0 mt-0.5 text-[17px] font-semibold text-forest-800">{g.percentUpToDate === null ? "—" : `${g.percentUpToDate}%`}</p>
        </div>
      </div>
      {g.zones.length ? (
        <ul className="mt-4 mb-0 flex list-none flex-col divide-y divide-line/70 p-0 text-[14.5px]">
          {g.zones.map((z) => (
            <li key={z.zone} className="flex justify-between gap-3 py-2">
              <span className="text-ink">{z.zone}</span>
              <span className="text-muted">
                {z.members} member{z.members === 1 ? "" : "s"}
                {z.percentUpToDate === null ? "" : ` · ${z.percentUpToDate}% up to date`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 mb-0 text-[13px] text-muted">As of {g.asOf}. No member&rsquo;s name or payments are ever shown here.</p>
    </Card>
  );
}

export type MotionView = {
  id: string;
  title: string;
  details: string;
  status: "open" | "closed";
  myVote: string | null;
  result: null | { For: number; Against: number; Abstain: number; outcome: string };
  closedAt: string;
};

/** One member, one vote, on motions the office has opened. Results appear once a vote closes. */
export function VotesCard({ motions }: { motions: MotionView[] }) {
  const [voted, setVoted] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});

  async function vote(m: MotionView, choice: string) {
    if (!window.confirm(`Vote “${choice}” on “${m.title}”? You cannot change your vote afterwards.`)) return;
    setBusy(m.id);
    setErr((e) => ({ ...e, [m.id]: "" }));
    try {
      const res = await fetch("/api/member/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motionId: m.id, choice }) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || "Your vote could not be saved.");
      setVoted((v) => ({ ...v, [m.id]: choice }));
    } catch (e) {
      setErr((x) => ({ ...x, [m.id]: e instanceof Error ? e.message : "Your vote could not be saved." }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Votes</h2>
      {motions.length === 0 ? (
        <p className="mt-3 mb-0 text-[15px] text-body">There is nothing to vote on just now. When the board opens a vote, it appears here.</p>
      ) : (
        <ul className="mt-3 mb-0 flex list-none flex-col gap-4 p-0">
          {motions.map((m) => {
            const mine = voted[m.id] ?? m.myVote;
            return (
              <li key={m.id} className="rounded-xl border border-line p-4">
                <p className="m-0 text-[15.5px] font-semibold text-ink">{m.title}</p>
                {m.details ? <p className="mt-1 mb-0 text-[14.5px] whitespace-pre-line text-body">{m.details}</p> : null}
                {m.status === "open" ? (
                  mine ? (
                    <p className="mt-3 mb-0 text-[14.5px] font-semibold text-forest-800">You voted: {mine}. Thank you.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["For", "Against", "Abstain"].map((c) => (
                        <button key={c} type="button" disabled={busy !== null} onClick={() => void vote(m, c)} className={c === "For" ? btnPrimary : btnSecondary}>
                          {busy === m.id ? "Saving…" : c}
                        </button>
                      ))}
                    </div>
                  )
                ) : m.result ? (
                  <p className="mt-3 mb-0 text-[14.5px] text-body">
                    <strong>{m.result.outcome}</strong> · For {m.result.For} · Against {m.result.Against} · Abstain {m.result.Abstain}
                    {m.closedAt ? ` · closed ${m.closedAt}` : ""}
                    {mine ? ` · you voted ${mine}` : ""}
                  </p>
                ) : null}
                {err[m.id] ? <p className="mt-2 mb-0 text-[14px] text-danger">{err[m.id]}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export type IdeaView = { id: string; text: string; at: string; status: string; reply: string };

/** Members send ideas to the board; the office marks each one and may reply. */
export function IdeasCard({ ideas }: { ideas: IdeaView[] }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/member/ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || "Your idea could not be sent.");
      setMsg({ ok: true, text: "Thank you. Your idea has gone to the office and the board." });
      setText("");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Your idea could not be sent." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Share an idea</h2>
      <p className="mt-2 mb-0 text-[14.5px] text-body">A project, an improvement, a question for the board. Every idea is read.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={4}
        className="mt-3 w-full rounded-xl border border-line bg-white p-3 text-[15px] text-ink"
        aria-label="Your idea"
      />
      {msg ? <p className={`mt-2 mb-0 text-[14px] ${msg.ok ? "text-forest-800" : "text-danger"}`}>{msg.text}</p> : null}
      <button type="button" disabled={busy || text.trim().length < 5} onClick={() => void send()} className={`${btnPrimary} mt-3`}>
        {busy ? "Sending…" : "Send idea"}
      </button>
      {ideas.length ? (
        <ul className="mt-5 mb-0 flex list-none flex-col gap-3 p-0">
          {ideas.map((i) => (
            <li key={i.id} className="rounded-xl bg-mist/50 p-3 text-[14.5px]">
              <p className="m-0 whitespace-pre-line text-ink">{i.text}</p>
              <p className="mt-1 mb-0 text-[13px] text-muted">
                Sent {i.at} · {i.status}
              </p>
              {i.reply ? <p className="mt-1 mb-0 text-[14px] text-forest-800">Reply: {i.reply}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
