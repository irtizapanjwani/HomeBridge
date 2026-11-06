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
      <p className="eyebrow m-0">Next meeting · {soon}</p>
      <h2 className="m-0 mt-1.5 font-sans text-[19px] font-semibold text-ink">Annual General Meeting</h2>
      <p className="m-0 mt-2 text-[15.5px] text-ink">
        <strong>{meeting.when}</strong>
        <span className="block text-body">{meeting.place}</span>
      </p>

      {meeting.agenda.length ? (
        <>
          <p className="m-0 mt-4 text-[14px] font-semibold text-ink">Agenda</p>
          <ol className="m-0 mt-1 pl-5 text-[15px] leading-relaxed text-body">
            {meeting.agenda.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </>
      ) : null}

      <div className="mt-5 rounded-xl bg-paper p-4">
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
