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
  myVoteByProxy: string | null;
  result: null | { For: number; Against: number; Abstain: number; outcome: string };
  closedAt: string;
  proxyGivenTo: string | null;
  proxiesHeld: { memberNo: string; name: string; voted: string | null }[];
};

const CHOICE_LIST = ["For", "Against", "Abstain"];

/**
 * One member, one vote, on motions the office has opened, with proxies (bye-law 16.4): a member can
 * name another member to vote for them, and a holder votes for up to five others. Results appear
 * once a vote closes.
 */
export function VotesCard({ motions }: { motions: MotionView[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const [holder, setHolder] = useState<Record<string, string>>({});

  async function post(url: string, body: Record<string, unknown>, key: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    setErr((e) => ({ ...e, [key]: "" }));
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || "That did not work.");
      window.location.reload();
    } catch (e) {
      setErr((x) => ({ ...x, [key]: e instanceof Error ? e.message : "That did not work." }));
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
          {motions.map((m) => (
            <li key={m.id} className="rounded-xl border border-line p-4">
              <p className="m-0 text-[15.5px] font-semibold text-ink">{m.title}</p>
              {m.details ? <p className="mt-1 mb-0 text-[14.5px] whitespace-pre-line text-body">{m.details}</p> : null}

              {m.status === "open" ? (
                <>
                  {m.myVote ? (
                    <p className="mt-3 mb-0 text-[14.5px] font-semibold text-forest-800">
                      {m.myVoteByProxy ? `Your proxy (${m.myVoteByProxy}) voted for you: ${m.myVote}.` : `You voted: ${m.myVote}. Thank you.`}
                    </p>
                  ) : m.proxyGivenTo ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[14.5px] text-body">
                      <span>
                        Your proxy is with <strong>{m.proxyGivenTo}</strong>, who will vote for you.
                      </span>
                      <button
                        type="button"
                        disabled={busy !== null}
                        className="text-[14px] font-semibold text-forest-800 underline underline-offset-[3px]"
                        onClick={() => void post("/api/member/proxy", { motionId: m.id, cancel: true }, m.id, "Cancel your proxy and vote yourself instead?")}
                      >
                        Cancel my proxy
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {CHOICE_LIST.map((c) => (
                          <button
                            key={c}
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void post("/api/member/vote", { motionId: m.id, choice: c }, m.id, `Vote “${c}” on “${m.title}”? You cannot change it afterwards.`)}
                            className={c === "For" ? btnPrimary : btnSecondary}
                          >
                            {busy === m.id ? "Saving…" : c}
                          </button>
                        ))}
                      </div>
                      <details className="mt-3">
                        <summary className="cursor-pointer text-[14px] font-semibold text-forest-800">Can&rsquo;t vote? Give your proxy to another member</summary>
                        <div className="mt-2 flex flex-wrap items-end gap-2">
                          <label className="flex flex-col gap-1 text-[13.5px] font-medium text-muted">
                            Their membership number
                            <input
                              value={holder[m.id] ?? ""}
                              onChange={(e) => setHolder({ ...holder, [m.id]: e.target.value })}
                              placeholder="HBC-EDO-26-00002"
                              className="min-h-11 rounded-xl border border-line bg-white px-3 text-[15px] text-ink"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={busy !== null || !(holder[m.id] ?? "").trim()}
                            className={btnSecondary}
                            onClick={() =>
                              void post("/api/member/proxy", { motionId: m.id, holderNo: holder[m.id] }, m.id, `Let ${holder[m.id]} vote for you on “${m.title}”?`)
                            }
                          >
                            Give proxy
                          </button>
                        </div>
                      </details>
                    </>
                  )}

                  {m.proxiesHeld.length ? (
                    <div className="mt-4 rounded-xl bg-mist/50 p-3">
                      <p className="m-0 text-[14px] font-semibold text-forest-800">You hold {m.proxiesHeld.length} proxy vote{m.proxiesHeld.length === 1 ? "" : "s"}</p>
                      <ul className="mt-2 mb-0 flex list-none flex-col gap-2 p-0">
                        {m.proxiesHeld.map((p) => {
                          const key = `${m.id}:${p.memberNo}`;
                          return (
                            <li key={p.memberNo} className="text-[14.5px]">
                              <span className="block text-ink">
                                For {p.name} ({p.memberNo}){p.voted ? `: voted ${p.voted}` : ""}
                              </span>
                              {!p.voted ? (
                                <div className="mt-1.5 flex flex-wrap gap-2">
                                  {CHOICE_LIST.map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      disabled={busy !== null}
                                      className={btnSecondary}
                                      onClick={() =>
                                        void post(
                                          "/api/member/vote",
                                          { motionId: m.id, choice: c, forMemberNo: p.memberNo },
                                          key,
                                          `Vote “${c}” for ${p.name} (${p.memberNo})? It cannot be changed.`,
                                        )
                                      }
                                    >
                                      {busy === key ? "Saving…" : c}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                              {err[key] ? <p className="mt-1 mb-0 text-[14px] text-danger">{err[key]}</p> : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : m.result ? (
                <p className="mt-3 mb-0 text-[14.5px] text-body">
                  <strong>{m.result.outcome}</strong> · For {m.result.For} · Against {m.result.Against} · Abstain {m.result.Abstain}
                  {m.closedAt ? ` · closed ${m.closedAt}` : ""}
                  {m.myVote ? ` · your vote: ${m.myVote}${m.myVoteByProxy ? " (by proxy)" : ""}` : ""}
                </p>
              ) : null}
              {err[m.id] ? <p className="mt-2 mb-0 text-[14px] text-danger">{err[m.id]}</p> : null}
            </li>
          ))}
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
