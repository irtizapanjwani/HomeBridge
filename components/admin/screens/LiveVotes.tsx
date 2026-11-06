"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Banner, Btn, Card, CardTitle, Pill, Table, Td, Th, inputCls } from "../ui";

type Motion = {
  id: string;
  title: string;
  details: string;
  status: "draft" | "open" | "closed";
  createdBy: string;
  createdAt: string;
  openedAt: string;
  closedAt: string;
  counts: { For: number; Against: number; Abstain: number };
  total: number;
  byProxy: number;
  result: string;
};

const STATUS_PILL = { draft: ["grey", "Not open yet"], open: ["warm", "Voting open"], closed: ["green", "Closed"] } as const;

/**
 * Online voting: one member, one vote. Write a motion, open it (every member sees it in their
 * account), then close it to fix the result. A closed vote cannot be reopened.
 */
export function OnlineVotesCard() {
  const toast = useToast();
  const [motions, setMotions] = useState<Motion[] | null>(null);
  const [eligible, setEligible] = useState(0);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showChoices, setShowChoices] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/admin/settings/vote-choices")
      .then((r) => r.json())
      .then((d: { ok?: boolean; on?: boolean }) => setShowChoices(d.ok ? Boolean(d.on) : false))
      .catch(() => setShowChoices(false));
  }, []);
  async function remove(m: { id: string; title: string; status: string; total: number }) {
    const warning =
      m.status === "draft"
        ? `Delete the draft “${m.title}”? No member has seen it yet.`
        : `Delete “${m.title}” and all ${m.total} vote${m.total === 1 ? "" : "s"} cast on it? ${m.status === "open" ? "Voting is still open: members will no longer see it." : "Its result will be gone."} This cannot be undone. The totals are kept in the audit log.`;
    if (!window.confirm(warning)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/motions/${m.id}`, { method: "DELETE" });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || `That did not work (error ${res.status}).`);
      if (openId === m.id) setOpenId(null);
      toast("Vote deleted.");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "That did not work.", "warn");
    } finally {
      setBusy(false);
    }
  }

  async function flipChoices() {
    const next = !showChoices;
    if (
      next &&
      !window.confirm(
        "Show officers how each member voted? The brief keeps votes secret (only totals), so switch this on only if the Board has agreed. Every look is recorded in the audit log.",
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings/vote-choices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: next }) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || `That did not work (error ${res.status}).`);
      setShowChoices(next);
      toast(next ? "Each member\u2019s choice now shows under “Who has voted”." : "Choices are secret again: only totals are shown.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "That did not work.", "warn");
    } finally {
      setBusy(false);
    }
  }

  const load = useCallback(() => {
    fetch("/api/admin/motions")
      .then((r) => r.json())
      .then((d: { ok?: boolean; motions?: Motion[]; eligible?: number; error?: string }) => {
        if (!d.ok) return setErr(d.error || "Could not load the votes.");
        setMotions(d.motions ?? []);
        setEligible(d.eligible ?? 0);
      })
      .catch(() => setErr("Could not reach the server."));
  }, []);
  useEffect(load, [load]);

  async function call(url: string, body: Record<string, unknown>, done: string) {
    setBusy(true);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; emailed?: { sent: number; failed: number; of: number } | null };
      if (!res.ok || !d.ok) throw new Error(d.error || `That did not work (error ${res.status}).`);
      const e = d.emailed;
      toast(
        e ? `${done} ${e.sent} of ${e.of} member${e.of === 1 ? "" : "s"} emailed${e.failed ? ` — ${e.failed} failed, see the audit log` : ""}.` : done,
        e?.failed ? "warn" : undefined,
      );
      load();
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : "That did not work.", "warn");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-5 p-5">
      <CardTitle id="online-votes" aside={<Pill tone="green">Live</Pill>}>
        Votes
      </CardTitle>
      <div className="flex flex-col gap-2">
        <p className="m-0 text-[15px] text-body">Ask members to vote on a decision. Each vote goes through three steps:</p>
        <ol className="m-0 grid list-none gap-2 p-0 md:grid-cols-3">
          {[
            ["Write it", "Save the question as a draft. Members can't see it yet."],
            ["Open voting", "Every member is emailed and can vote For, Against or Abstain, once."],
            ["End voting", "The result is fixed and every member can see it."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3 rounded-xl border border-line bg-mist p-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest-800 text-[13px] font-bold text-paper">{i + 1}</span>
              <span className="min-w-0 text-[13.5px] text-body">
                <strong className="block text-[14.5px] text-ink">{t}</strong>
                {d}
              </span>
            </li>
          ))}
        </ol>
      </div>
      {err ? <Banner tone="danger">{err}</Banner> : null}

      <section aria-labelledby="new-vote" className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <h3 id="new-vote" className="m-0 text-[16px] font-bold text-ink">
          Start a new vote
        </h3>
        <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
          What are members voting on?
          <input
            id="vote-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Approve the 2027 operating budget"
            className={`${inputCls} font-normal`}
          />
        </label>
        <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
          <span>
            Explain it to members <span className="font-normal text-muted">(optional)</span>
          </span>
          <textarea
            id="vote-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder="Anything members should read before they vote"
            className={`${inputCls} min-h-[88px] py-2 font-normal`}
          />
        </label>
        <div>
          <Btn
            variant="primary"
            disabled={busy || !title.trim()}
            onClick={async () => {
              if (await call("/api/admin/motions", { title, details }, "Saved as a draft. Click “Open voting” when members should vote.")) {
                setTitle("");
                setDetails("");
              }
            }}
          >
            Save as draft
          </Btn>
        </div>
      </section>

      <section aria-labelledby="your-votes" className="flex flex-col gap-3">
        <h3 id="your-votes" className="m-0 text-[16px] font-bold text-ink">
          Your votes
        </h3>
        {!motions ? (
          <p className="m-0 text-[14px] text-muted">Loading…</p>
        ) : motions.length === 0 ? (
          <p className="m-0 text-[14px] text-muted">No votes yet. Start one above.</p>
        ) : (
          motions.map((m) => (
            <VoteBox
              key={m.id}
              m={m}
              eligible={eligible}
              busy={busy}
              showChoices={Boolean(showChoices)}
              expanded={openId === m.id}
              onToggle={() => setOpenId(openId === m.id ? null : m.id)}
              onOpen={() => {
                if (window.confirm(`Open voting on “${m.title}”?\n\nEvery member will be emailed and can vote straight away.`))
                  void call(`/api/admin/motions/${m.id}`, { to: "open" }, "Voting is open.");
              }}
              onClose={() => {
                if (window.confirm(`End voting on “${m.title}”?\n\nThe result is then final and every member can see it. Voting cannot be reopened.`))
                  void call(`/api/admin/motions/${m.id}`, { to: "closed" }, "Voting has ended. Members can now see the result.");
              }}
              onDelete={() => void remove(m)}
            />
          ))
        )}
      </section>

      <section aria-labelledby="vote-privacy" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-mist px-4 py-3">
        <p className="m-0 min-w-0 flex-1 text-[14px] text-body">
          <strong id="vote-privacy" className="text-ink">
            Privacy:{" "}
          </strong>
          {showChoices === null
            ? "…"
            : showChoices
              ? "officers can see each member's choice under “Who has voted”. Every look is recorded in the audit log."
              : "each member's choice is secret. Officers see the totals and who has voted, not how."}
        </p>
        <Btn size="sm" disabled={busy || showChoices === null} onClick={() => void flipChoices()}>
          {showChoices ? "Hide choices again" : "Show each member's choice"}
        </Btn>
      </section>
    </Card>
  );
}

const STATUS_LABEL = {
  draft: ["grey", "Draft"],
  open: ["warm", "Voting open"],
  closed: ["green", "Voting ended"],
} as const;

const RESULT_TEXT: Record<string, string> = {
  Passed: "Passed: more members voted For than Against.",
  "Not passed": "Not passed: more members voted Against than For.",
  Tied: "Tied: the same number voted For and Against.",
  "No votes cast": "No votes were cast.",
};

/** One vote, laid out so an officer can read its state at a glance. */
function VoteBox({
  m,
  eligible,
  busy,
  showChoices,
  expanded,
  onToggle,
  onOpen,
  onClose,
  onDelete,
}: {
  m: Motion;
  eligible: number;
  busy: boolean;
  showChoices: boolean;
  expanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const pct = eligible ? Math.min(100, Math.round((m.total / eligible) * 100)) : 0;
  const tiles = [
    ["For", m.counts.For, "border-forest-800 text-forest-800"],
    ["Against", m.counts.Against, "border-danger text-danger"],
    ["Abstain", m.counts.Abstain, "border-line text-muted"],
  ] as const;
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="m-0 text-[17px] font-bold text-ink">{m.title}</h4>
          <p className="m-0 text-[12.5px] text-muted">
            Created {m.createdAt}
            {m.openedAt ? ` · opened ${m.openedAt}` : ""}
            {m.closedAt ? ` · ended ${m.closedAt}` : ""}
          </p>
        </div>
        <Pill tone={STATUS_LABEL[m.status][0]}>{STATUS_LABEL[m.status][1]}</Pill>
      </div>
      {m.details ? <p className="m-0 text-[14px] whitespace-pre-line text-body">{m.details}</p> : null}

      {m.status === "draft" ? (
        <p className="m-0 rounded-xl bg-mist px-3 py-2 text-[14px] text-body">Members can&rsquo;t see this yet. Open voting when you are ready.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {tiles.map(([label, n, cls]) => (
              <div key={label} className={`rounded-xl border-2 bg-paper px-3 py-2 text-center ${cls}`}>
                <span className="block text-[26px] leading-tight font-bold tabular-nums">{n}</span>
                <span className="block text-[13px] font-semibold">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <div className="h-2.5 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Members who have voted">
              <div className="h-full rounded-full bg-forest-800" style={{ width: `${pct}%` }} />
            </div>
            <p className="m-0 text-[13px] text-muted">
              <strong className="text-ink">
                {m.total} of {eligible} members
              </strong>{" "}
              have voted ({pct}%){m.byProxy ? ` · ${m.byProxy} through a proxy` : ""}
            </p>
          </div>
          {m.status === "closed" ? (
            <p className="m-0 rounded-xl border border-line bg-mist px-3 py-2 text-[14.5px] text-ink">
              <strong>Result: </strong>
              {RESULT_TEXT[m.result] ?? m.result}
            </p>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {m.status === "draft" ? (
          <Btn variant="primary" disabled={busy} onClick={onOpen}>
            Open voting and email members
          </Btn>
        ) : m.status === "open" ? (
          <Btn variant="primary" disabled={busy} onClick={onClose}>
            End voting and show the result
          </Btn>
        ) : null}
        {m.status !== "draft" ? (
          <Btn aria-expanded={expanded} onClick={onToggle}>
            {expanded ? "Hide who has voted" : "Who has voted"}
          </Btn>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="ml-auto text-[13.5px] font-semibold text-danger underline underline-offset-[3px] disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {expanded ? (
        <div className="rounded-xl border border-line bg-mist p-3">
          <Turnout key={String(showChoices)} id={m.id} />
        </div>
      ) : null}
    </article>
  );
}

type Idea = { id: string; memberNo: string; name: string; chapter: string; text: string; at: string; status: "new" | "seen" | "planned" | "not_now"; reply: string };

const IDEA_OPTIONS: [Idea["status"], string][] = [
  ["new", "New"],
  ["seen", "Seen by the office"],
  ["planned", "Planned"],
  ["not_now", "Not for now"],
];

/** Ideas members send from their account. Mark each one and, if useful, reply: the member sees both. */
export function MemberIdeasCard() {
  const toast = useToast();
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<Record<string, { status: Idea["status"]; reply: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/ideas")
      .then((r) => r.json())
      .then((d: { ok?: boolean; ideas?: Idea[]; error?: string }) => {
        if (!d.ok) return setErr(d.error || "Could not load the ideas.");
        setIdeas(d.ideas ?? []);
        setEdit(Object.fromEntries((d.ideas ?? []).map((i) => [i.id, { status: i.status, reply: i.reply }])));
      })
      .catch(() => setErr("Could not reach the server."));
  }, []);
  useEffect(load, [load]);

  async function save(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/ideas/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit[id]) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || "Could not save.");
      toast("Saved. The member sees it in their account.");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save.", "warn");
    } finally {
      setBusy(null);
    }
  }

  const fresh = ideas?.filter((i) => i.status === "new").length ?? 0;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle id="member-ideas" aside={ideas ? <Pill tone={fresh ? "warm" : "green"}>{fresh ? `${fresh} new` : "Up to date"}</Pill> : null}>
        Member ideas
      </CardTitle>
      {err ? <Banner tone="danger">{err}</Banner> : null}
      {ideas && ideas.length === 0 ? <p className="m-0 text-[14px] text-muted">No ideas yet. Members send them from their account.</p> : null}
      {ideas && ideas.length ? (
        <Table minWidth={820}>
          <thead>
            <tr>
              <Th>Idea</Th>
              <Th>From</Th>
              <Th>Status and reply</Th>
            </tr>
          </thead>
          <tbody>
            {ideas.map((i) => (
              <tr key={i.id}>
                <Td>
                  <span className="block max-w-[380px] whitespace-pre-line">{i.text}</span>
                  <span className="block text-[12.5px] text-muted">{i.at}</span>
                </Td>
                <Td>
                  {i.name}
                  <span className="block text-[12.5px] text-muted">
                    {i.memberNo} · {i.chapter}
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-col gap-1.5">
                    <select
                      value={edit[i.id]?.status ?? i.status}
                      onChange={(e) => setEdit({ ...edit, [i.id]: { ...(edit[i.id] ?? { reply: i.reply }), status: e.target.value as Idea["status"] } })}
                      className={inputCls}
                      aria-label="Status"
                    >
                      {IDEA_OPTIONS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <input
                      value={edit[i.id]?.reply ?? i.reply}
                      onChange={(e) => setEdit({ ...edit, [i.id]: { ...(edit[i.id] ?? { status: i.status }), reply: e.target.value } })}
                      placeholder="Reply to the member (optional)"
                      className={inputCls}
                      aria-label="Reply"
                    />
                    <Btn size="sm" variant="primary" disabled={busy !== null} onClick={() => void save(i.id)}>
                      {busy === i.id ? "Saving…" : "Save"}
                    </Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </Card>
  );
}

type TurnoutData = {
  voted: { memberNo: string; name: string; at: string; byProxy: string; choice: "For" | "Against" | "Abstain" | null }[];
  notVoted: { memberNo: string; name: string; chapter: string }[];
  showChoices: boolean;
};
const CHOICE_TONE = { For: "green", Against: "red", Abstain: "grey" } as const;

/** Who has voted and who has not. Never how anyone voted (bye-law: secret ballot; only totals are shown). */
function Turnout({ id }: { id: string }) {
  const [data, setData] = useState<TurnoutData | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch(`/api/admin/motions/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: TurnoutData & { ok?: boolean; error?: string }) => (d.ok ? setData(d) : setErr(d.error || "Could not load who has voted.")))
      .catch(() => setErr("Could not reach the server."));
  }, [id]);
  if (err) return <p className="m-0 text-[13.5px] text-danger">{err}</p>;
  if (!data) return <p className="m-0 text-[13.5px] text-muted">Loading…</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <p className="m-0 mb-2 text-[14px] font-bold text-ink">Has voted ({data.voted.length})</p>
          {data.voted.length ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {data.voted.map((v) => (
                <li key={v.memberNo} className="flex items-center justify-between gap-2 rounded-lg bg-paper px-3 py-2">
                  <span className="min-w-0 text-[14px]">
                    <strong className="block text-ink">{v.name || v.memberNo}</strong>
                    <span className="block text-[12px] text-muted">
                      {v.memberNo} · {v.at}
                      {v.byProxy ? ` · voted for them by ${v.byProxy}` : ""}
                    </span>
                  </span>
                  {v.choice ? <Pill tone={CHOICE_TONE[v.choice]}>{v.choice}</Pill> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[14px] text-muted">Nobody has voted yet.</p>
          )}
        </div>
        <div className="min-w-0">
          <p className="m-0 mb-2 text-[14px] font-bold text-ink">Still to vote ({data.notVoted.length})</p>
          {data.notVoted.length ? (
            <ul className="m-0 flex max-h-72 list-none flex-col gap-1.5 overflow-y-auto p-0">
              {data.notVoted.map((v) => (
                <li key={v.memberNo} className="rounded-lg bg-paper px-3 py-2 text-[14px]">
                  <span className="block text-ink">{v.name}</span>
                  <span className="block text-[12px] text-muted">
                    {v.memberNo}
                    {v.chapter ? ` · ${v.chapter}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[14px] text-muted">Every member has voted.</p>
          )}
        </div>
      </div>
      <p className="m-0 text-[12.5px] text-muted">
        {data.showChoices
          ? "Each member's choice is shown because Privacy is switched on below. Opening this list is recorded in the audit log."
          : "Choices are secret, so only who has voted is shown. The Privacy switch below can show each choice, if the Board agrees."}
      </p>
    </div>
  );
}
