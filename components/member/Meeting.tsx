"use client";

import { useState } from "react";
import { Card, btnPrimary, btnSecondary } from "./bits";

export type MeetingView = { when: string; place: string; agenda: string[]; daysLeft: number; answer: "yes" | "no" | null };

/**
 * The next general meeting, from the AGM notice (bye-law 16.3), and the member's reply. Saying
 * whether they will come lets the office see early whether the meeting will be quorate (16.5).
 */
export function MeetingCard({ meeting }: { meeting: MeetingView }) {
  const [answer, setAnswer] = useState(meeting.answer);
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  const [err, setErr] = useState("");

  async function reply(a: "yes" | "no") {
    setBusy(a);
    setErr("");
    try {
      const res = await fetch("/api/member/agm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer: a }) });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || "Your reply could not be saved. Please try again.");
      setAnswer(a);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Your reply could not be saved. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const soon = meeting.daysLeft === 0 ? "Today" : meeting.daysLeft === 1 ? "Tomorrow" : `In ${meeting.daysLeft} days`;

  return (
    <Card id="meeting" className="scroll-mt-6">
      <div className="flex items-start gap-4">
        {/* Calendar-style date tile, read from the meeting date text */}
        {(() => {
          const d = /(\d{1,2})\s+([A-Za-z]+)/.exec(meeting.when);
          return d ? (
            <div aria-hidden="true" className="flex w-16 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-paper text-center shadow-card">
              <span className="bg-forest-800 py-1 text-[11px] font-semibold tracking-[0.1em] text-gold-soft uppercase">{d[2].slice(0, 3)}</span>
              <span className="py-1.5 font-display text-[28px] leading-none font-bold text-forest-800">{d[1]}</span>
            </div>
          ) : null;
        })()}
        <div className="min-w-0">
          <p className="eyebrow m-0">Next meeting · {soon}</p>
          <h2 className="m-0 mt-1 font-sans text-[18px] font-semibold text-ink">Annual General Meeting</h2>
          <p className="m-0 mt-1 text-[14.5px] text-body">
            {meeting.when}
            <span className="block text-muted">{meeting.place}</span>
          </p>
        </div>
      </div>

      {meeting.agenda.length ? (
        <>
          <p className="m-0 mt-4 text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Agenda</p>
          <ol className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
            {meeting.agenda.map((a, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-xl bg-cream px-3 py-2 text-[14.5px] text-ink">
                <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-forest-800 text-[12px] font-semibold text-cream">
                  {i + 1}
                </span>
                {a}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <div className="mt-4 border-t border-line pt-4">
        {answer ? (
          <p className="m-0 text-[15px] text-ink" aria-live="polite">
            {answer === "yes" ? (
              <>
                <strong>Thank you. You said you will attend.</strong> We look forward to seeing you.
              </>
            ) : (
              <>
                <strong>Thank you for letting us know you can&rsquo;t attend.</strong> You can still vote online on any motion in the Votes section,
                or give your proxy to another member there.
              </>
            )}
          </p>
        ) : (
          <p className="m-0 text-[15px] font-semibold text-ink">Will you attend?</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2.5">
          <button type="button" disabled={busy !== null} aria-pressed={answer === "yes"} onClick={() => void reply("yes")} className={answer === "yes" ? btnPrimary : btnSecondary}>
            {busy === "yes" ? "Saving…" : answer === "yes" ? "✓ I will attend" : "I will attend"}
          </button>
          <button type="button" disabled={busy !== null} aria-pressed={answer === "no"} onClick={() => void reply("no")} className={answer === "no" ? btnPrimary : btnSecondary}>
            {busy === "no" ? "Saving…" : answer === "no" ? "✓ I can’t attend" : "I can’t attend"}
          </button>
        </div>
        {answer ? <p className="m-0 mt-2 text-[13px] text-muted">You can change your answer at any time before the meeting.</p> : null}
        {err ? (
          <p className="m-0 mt-2 text-[14px] text-danger" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
