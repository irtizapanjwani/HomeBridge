"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
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
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/motions")
      .then((r) => r.json())
      .then((d: { ok?: boolean; motions?: Motion[]; error?: string }) => (d.ok ? setMotions(d.motions ?? []) : setErr(d.error || "Could not load the votes.")))
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
    <Card className="flex flex-col gap-3 p-5">
      <CardTitle id="online-votes" aside={<Pill tone="green">Live</Pill>}>
        Online votes
      </CardTitle>
      <p className="m-0 text-[14px] text-body">
        Write a motion, then <strong>Open</strong> it: every member is emailed straight away, sees it in their account and can vote For, Against or Abstain, once.{" "}
        <strong>Close</strong> it to fix the result, which members then see. Members can give their proxy to another member, who can hold up to
        five (bye-law 16.4). Only totals are shown, never who voted which way.
      </p>
      {err ? <Banner tone="danger">{err}</Banner> : null}
      <div className="grid gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Motion, e.g. Approve the 2027 operating budget" className={inputCls} aria-label="Motion title" />
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder="Details members should read before voting (optional)"
          className={`${inputCls} py-2`}
          aria-label="Motion details"
        />
        <div>
          <Btn
            variant="primary"
            disabled={busy || !title.trim()}
            onClick={async () => {
              if (await call("/api/admin/motions", { title, details }, "Motion saved. Open it when members should vote.")) {
                setTitle("");
                setDetails("");
              }
            }}
          >
            Save motion
          </Btn>
        </div>
      </div>

      {motions && motions.length ? (
        <Table minWidth={760}>
          <thead>
            <tr>
              <Th>Motion</Th>
              <Th>Status</Th>
              <Th>Votes</Th>
              <Th>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {motions.map((m) => (
              <Fragment key={m.id}>
              <tr>
                <Td>
                  <strong>{m.title}</strong>
                  <span className="block text-[12.5px] text-muted">
                    Written {m.createdAt} by {m.createdBy}
                    {m.openedAt ? ` · opened ${m.openedAt}` : ""}
                    {m.closedAt ? ` · closed ${m.closedAt}` : ""}
                  </span>
                </Td>
                <Td>
                  <Pill tone={STATUS_PILL[m.status][0]}>{STATUS_PILL[m.status][1]}</Pill>
                  {m.result ? <span className="mt-1 block font-semibold">{m.result}</span> : null}
                </Td>
                <Td>
                  {m.total} vote{m.total === 1 ? "" : "s"}
                  <span className="block text-[12.5px] text-muted">
                    For {m.counts.For} · Against {m.counts.Against} · Abstain {m.counts.Abstain}
                    {m.byProxy ? ` · ${m.byProxy} by proxy` : ""}
                  </span>
                  {m.status !== "draft" ? (
                    <button
                      type="button"
                      onClick={() => setOpenId(openId === m.id ? null : m.id)}
                      aria-expanded={openId === m.id}
                      className="mt-1 text-[13px] font-semibold text-forest-800 underline underline-offset-[3px]"
                    >
                      {openId === m.id ? "Hide who voted" : "See who voted"}
                    </button>
                  ) : null}
                </Td>
                <Td>
                  {m.status === "draft" ? (
                    <Btn
                      size="sm"
                      variant="primary"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Open voting on “${m.title}” to every member now? Every member will be emailed that the vote is open.`)) void call(`/api/admin/motions/${m.id}`, { to: "open" }, "Voting is open.");
                      }}
                    >
                      Open
                    </Btn>
                  ) : m.status === "open" ? (
                    <Btn
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Close voting on “${m.title}”? The result is then fixed and cannot be reopened.`))
                          void call(`/api/admin/motions/${m.id}`, { to: "closed" }, "Voting closed. Members can now see the result.");
                      }}
                    >
                      Close
                    </Btn>
                  ) : null}
                </Td>
              </tr>
              {openId === m.id ? (
                <tr>
                  <td colSpan={4} className="border-b border-line bg-mist px-4 py-3">
                    <Turnout id={m.id} />
                  </td>
                </tr>
              ) : null}
              </Fragment>
            ))}
          </tbody>
        </Table>
      ) : motions ? (
        <p className="m-0 text-[14px] text-muted">No motions yet.</p>
      ) : null}
    </Card>
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

type TurnoutData = { voted: { memberNo: string; name: string; at: string; byProxy: string }[]; notVoted: { memberNo: string; name: string; chapter: string }[] };

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
    <div className="grid gap-4 md:grid-cols-2">
      <div className="min-w-0">
        <p className="m-0 mb-1 text-[13px] font-semibold text-ink">Voted ({data.voted.length})</p>
        {data.voted.length ? (
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13.5px]">
            {data.voted.map((v) => (
              <li key={v.memberNo}>
                <strong>{v.name || v.memberNo}</strong> <span className="font-mono text-[12px] text-muted">{v.memberNo}</span>
                <span className="block text-[12.5px] text-muted">
                  {v.at}
                  {v.byProxy ? ` · cast by proxy holder ${v.byProxy}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[13.5px] text-muted">Nobody has voted yet.</p>
        )}
      </div>
      <div className="min-w-0">
        <p className="m-0 mb-1 text-[13px] font-semibold text-ink">Not voted yet ({data.notVoted.length})</p>
        {data.notVoted.length ? (
          <ul className="m-0 flex max-h-64 list-none flex-col gap-1 overflow-y-auto p-0 text-[13.5px]">
            {data.notVoted.map((v) => (
              <li key={v.memberNo}>
                {v.name} <span className="font-mono text-[12px] text-muted">{v.memberNo}</span>
                {v.chapter ? <span className="text-[12.5px] text-muted"> · {v.chapter}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[13.5px] text-muted">Every member has voted.</p>
        )}
      </div>
      <p className="m-0 text-[12.5px] text-muted md:col-span-2">This shows who took part, never how anyone voted. Only the totals are shown, to keep the ballot secret.</p>
    </div>
  );
}

