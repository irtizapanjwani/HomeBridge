"use client";

import { CheckIcon } from "@/components/ui/Icons";
import { FOUNDING_BLOCK } from "@/lib/settings";
import { STEP_LABELS, feeFor, livesInNigeria, monthlyFor, typeLabel, type Draft, type StepId } from "@/lib/register-data";

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`h-1.5 overflow-hidden rounded-full bg-mist ${className}`}>
      <div className="h-full rounded-full bg-gold transition-[width] duration-300" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

/** "Your application" card: done steps can be revisited, upcoming ones cannot be skipped to. */
export function StepList({ flow, current, reached, onJump }: { flow: StepId[]; current: number; reached: number; onJump: (i: number) => void }) {
  return (
    <div className="rounded-[24px] border border-line bg-paper p-5">
      <p className="eyebrow px-2">Your application</p>
      <ol className="mt-4 space-y-1">
        {flow.map((s, i) => {
          const isCurrent = i === current;
          const isDone = !isCurrent && i < reached;
          const canJump = !isCurrent && i <= reached;
          const marker = (
            <span
              aria-hidden="true"
              className={`grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${
                isDone ? "bg-forest-800 text-cream" : isCurrent ? "bg-forest-800 text-cream" : "border border-line-strong/70 text-muted"
              }`}
            >
              {isDone ? <CheckIcon size={14} strokeWidth={3} /> : i + 1}
            </span>
          );
          const label = (
            <span className={`text-[15px] leading-snug ${isCurrent ? "font-semibold text-forest-800" : isDone ? "text-ink" : "text-muted"}`}>
              {STEP_LABELS[s]}
              <span className="sr-only">{isCurrent ? " (current step)" : isDone ? " (done)" : canJump ? " (started)" : " (not started)"}</span>
            </span>
          );
          const cls = `flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-2 text-left ${isCurrent ? "bg-mist" : ""}`;
          return (
            <li key={s}>
              {canJump ? (
                <button type="button" onClick={() => onJump(i)} className={`${cls} hover:bg-page`}>
                  {marker}
                  {label}
                </button>
              ) : (
                <div className={cls} aria-current={isCurrent ? "step" : undefined}>
                  {marker}
                  {label}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <ProgressBar value={(current + 1) / flow.length} className="mx-2 mt-5" />
      <p className="mt-2.5 px-2 text-[13.5px] text-muted">
        Step {current + 1} of {flow.length} · about 10 minutes
      </p>
    </div>
  );
}

function Item({ label, value, note, big }: { label: string; value: string; note?: string | null; big?: "serif" | "gold" }) {
  return (
    <div>
      <dt className="text-[14px] text-on-dark">{label}</dt>
      <dd
        className={`mt-0.5 ${
          big === "serif" ? "font-display text-[22px] font-bold text-cream" : big === "gold" ? "text-[22px] font-semibold text-gold" : "text-[18px] font-semibold text-cream"
        }`}
      >
        {value}
        {note && <span className="block text-[13px] font-normal text-on-dark">{note}</span>}
      </dd>
    </div>
  );
}

export function ChoicesCard({ draft }: { draft: Draft }) {
  const supporter = draft.route === "none";
  const fee = feeFor(draft);
  const nigeria = livesInNigeria(draft);
  const block = !draft.country
    ? `£${FOUNDING_BLOCK.gbp.toLocaleString("en-GB")} / ₦${FOUNDING_BLOCK.ngn.toLocaleString("en-GB")}`
    : nigeria
      ? `₦${FOUNDING_BLOCK.ngn.toLocaleString("en-GB")}`
      : `£${FOUNDING_BLOCK.gbp.toLocaleString("en-GB")}`;
  return (
    <div className="rounded-[24px] bg-forest-800 px-5 py-6 text-cream" aria-live="polite">
      <p className="text-[12.5px] font-semibold tracking-[0.14em] text-gold uppercase">Your choices</p>
      <dl className="mt-3 space-y-3.5">
        {supporter ? (
          <>
            <Item label="You are joining" value="Supporter list" big="serif" />
            <Item label="Cost" value="Nothing" big="gold" note="Supporters don’t pay a fee or buy shares." />
          </>
        ) : (
          <>
            <Item label="Membership" value={typeLabel(draft.memberType) || "Not chosen yet"} big="serif" />
            {draft.memberType === "founding" && <Item label="Founding block, year one" value={`from ${block}`} />}
            <Item label="Joining fee, paid with this form" value={fee.fee} note={fee.note} big="gold" />
            <Item label={draft.memberType === "founding" ? "Then monthly shares from" : "Monthly shares from"} value={monthlyFor(draft)} />
          </>
        )}
      </dl>
    </div>
  );
}

export function PayNothingNote({ supporter }: { supporter: boolean }) {
  return (
    <div className="rounded-[20px] border border-line bg-paper px-5 py-4">
      <p className="text-[15px] font-semibold text-forest-800">
        {supporter ? "You pay nothing today." : "You buy no shares today."}
      </p>
      <p className="mt-1 text-[14px] leading-relaxed text-body">
        {supporter
          ? "The Supporter list is free. You can leave it at any time."
          : "Only the joining fee is paid with this form. It is not a share and is not refundable. Share money is paid later, into the cooperative’s own account."}
      </p>
    </div>
  );
}
