"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/ui/Icons";
import { btnPrimary, btnSecondary } from "./bits";
import type { MotionView } from "./Community";

/** Fired when the vote popup is closed, so the meeting popup can open after it instead of on top. */
export const VOTE_POPUP_DONE = "hb-vote-popup-done";

const CHOICES = ["For", "Against", "Abstain"] as const;

/** Open votes the member hasn't acted on: not voted, and no proxy given. */
export function waitingVotes(motions: MotionView[] | undefined) {
  return (motions ?? []).filter((m) => m.status === "open" && !m.myVote && !m.proxyGivenTo);
}

/**
 * Opens every time the dashboard loads while there is an open vote the member hasn't acted on.
 * X, "Later", Esc or a click outside closes it until the next visit to the dashboard. It stops once
 * they vote or give their proxy, or when the vote closes.
 */
export function VotePopup({ motions }: { motions: MotionView[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const waiting = waitingVotes(motions);
  const m = waiting[0];
  const [choice, setChoice] = useState<string | null>(null);
  const [proxyOpen, setProxyOpen] = useState(false);
  const [holder, setHolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!m) return;
    // A short pause lets the dashboard paint first, so the popup doesn't feel like a page error.
    const t = setTimeout(() => ref.current?.showModal(), 400);
    return () => clearTimeout(t);
  }, [m]);

  if (!m) return null;

  const close = () => {
    ref.current?.close();
    window.dispatchEvent(new Event(VOTE_POPUP_DONE));
  };

  async function send(url: string, body: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || "That did not work. Please try again.");
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not work. Please try again.");
      setBusy(false);
    }
  }

  const more = waiting.length - 1;

  return (
    <dialog
      ref={ref}
      aria-labelledby="vote-popup-h"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="m-auto max-h-[92dvh] w-[min(92vw,540px)] overflow-y-auto rounded-[26px] border border-line bg-paper p-0 text-body shadow-card backdrop:bg-forest-950/60 backdrop:backdrop-blur-[2px]"
    >
      <div aria-hidden="true" className="h-1 bg-gradient-to-r from-gold via-gold-soft to-transparent" />
      <div className="relative p-6 sm:p-7">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-full text-forest-800 hover:bg-mist"
        >
          <CloseIcon size={20} />
        </button>

        <p className="eyebrow m-0 pr-10">Your vote is needed{more > 0 ? ` · ${more + 1} open votes` : ""}</p>
        <h2 id="vote-popup-h" className="m-0 mt-1 pr-10 font-sans text-[19px] leading-snug font-semibold text-ink">
          {m.title}
        </h2>
        {m.details ? <p className="mt-2 mb-0 max-h-[30dvh] overflow-y-auto text-[14.5px] whitespace-pre-line text-body">{m.details}</p> : null}

        {!proxyOpen ? (
          <>
            <div role="radiogroup" aria-label="Your vote" className="mt-5 grid gap-2 sm:grid-cols-3">
              {CHOICES.map((c) => {
                const on = choice === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={busy}
                    onClick={() => setChoice(c)}
                    className={`min-h-12 rounded-2xl border-2 px-4 text-[15.5px] font-semibold transition-colors ${
                      on ? "border-forest-800 bg-forest-800 text-cream" : "border-line bg-white text-forest-800 hover:border-forest-800"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <p className="m-0 mt-3 text-[13px] text-muted">Your choice is private. A vote can&rsquo;t be changed once cast.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={!choice || busy}
                onClick={() => choice && void send("/api/member/vote", { motionId: m.id, choice })}
                className={btnPrimary}
              >
                {busy ? "Saving your vote…" : choice ? `Cast my vote: ${choice}` : "Choose For, Against or Abstain"}
              </button>
              <button type="button" onClick={close} className={btnSecondary}>
                Later
              </button>
            </div>
            <button
              type="button"
              onClick={() => setProxyOpen(true)}
              className="mt-3 min-h-11 bg-transparent p-0 text-[14px] font-semibold text-forest-800 underline underline-offset-[3px]"
            >
              Can&rsquo;t vote? Give your proxy to another member
            </button>
          </>
        ) : (
          <div className="mt-5">
            <p className="m-0 text-[14.5px] text-body">
              Another member can vote for you. They must be a HomeBridge member, and no one may hold more than 5 proxies.
            </p>
            <label className="mt-3 flex flex-col gap-1 text-[13.5px] font-medium text-muted">
              Their membership number
              <input
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                placeholder="HBC-EDO-26-00002"
                className="min-h-11 rounded-xl border border-line bg-white px-3 text-[15px] text-ink"
              />
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={!holder.trim() || busy}
                onClick={() => void send("/api/member/proxy", { motionId: m.id, holderNo: holder.trim() })}
                className={btnPrimary}
              >
                {busy ? "Saving…" : "Give my proxy"}
              </button>
              <button type="button" disabled={busy} onClick={() => setProxyOpen(false)} className={btnSecondary}>
                Back to voting
              </button>
            </div>
          </div>
        )}

        {err ? (
          <p className="m-0 mt-3 text-[14px] text-danger" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </dialog>
  );
}
