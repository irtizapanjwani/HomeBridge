"use client";

import { useState } from "react";
import { CheckIcon, ClipboardIcon, FileIcon, IdIcon, BankIcon, WhatsAppIcon, ArrowRightIcon } from "@/components/ui/Icons";
import { CONTACT } from "@/lib/content";
import type { DocMeta } from "@/lib/document-types";
import { Card } from "./bits";

// The top of the account page while someone is still an applicant: a welcome banner with a progress
// tracker, one clear "next step", and three status tiles. Same colours and fonts as the rest of the site.

export type ApplicantFacts = {
  reference: string;
  memberNo?: string;
  firstName: string;
  status: string;
  supporter: boolean;
  memberType: string;
  chapter: string;
  submittedAt: string;
  documents: DocMeta[];
  payment: { claimed: boolean; verified: boolean; method: string; datePaid: string; reference: string } | null;
  infoRequest?: { needed: string; by: string };
};

type StageState = "done" | "current" | "todo" | "stopped";
type Stage = { label: string; detail: string; state: StageState };

/** Where the application is, worked out from what we already know. */
export function stagesFor(f: ApplicantFacts): Stage[] {
  const hasId = f.documents.some((d) => d.type === "id");
  const hasAddress = f.documents.some((d) => d.type === "address");
  const docsDone = hasId && hasAddress;
  const feeDone = !!f.payment?.verified;
  const approved = f.status === "Approved" || !!f.memberNo;
  const declined = f.status === "Declined";

  const raw: { label: string; detail: string; done: boolean }[] = [
    { label: "Application sent", detail: f.submittedAt, done: true },
    {
      label: "Joining fee",
      detail: feeDone ? "Verified" : f.payment?.claimed ? "Being checked" : "Not paid yet",
      done: feeDone,
    },
    {
      label: "ID and address",
      detail: docsDone ? "Received" : hasId || hasAddress ? "1 of 2 received" : "Not sent yet",
      done: docsDone,
    },
    {
      label: "Officer decision",
      detail: approved ? "Approved" : declined ? "Not approved" : f.status === "Info requested" ? "Needs your reply" : "Usually 2 working days",
      done: approved,
    },
    { label: "Membership number", detail: f.memberNo ?? "Sent by email", done: !!f.memberNo },
  ];

  let currentSet = false;
  return raw.map((s, i) => {
    if (s.done) return { label: s.label, detail: s.detail, state: "done" };
    if (declined && i === 3) return { label: s.label, detail: s.detail, state: "stopped" };
    if (!currentSet && !declined) {
      currentSet = true;
      return { label: s.label, detail: s.detail, state: "current" };
    }
    return { label: s.label, detail: s.detail, state: "todo" };
  });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard blocked: the number is still selectable */
        }
      }}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-cream/30 px-3 text-[13px] font-semibold text-cream transition-colors hover:bg-cream/10"
      aria-label={copied ? "Copied" : `Copy ${value}`}
    >
      {copied ? <CheckIcon size={14} strokeWidth={3} /> : <ClipboardIcon size={14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const PILL: Record<string, string> = {
  Approved: "bg-gold text-forest-900",
  Declined: "bg-[#fdf6f3] text-danger",
};

/** Dark welcome banner: greeting, reference, status and (for applicants) the progress tracker. */
export function ApplicantHero({
  f,
  greeting,
  signOut,
  signingOut,
}: {
  f: ApplicantFacts;
  greeting: string;
  signOut: () => void;
  signingOut: boolean;
}) {
  const stages = f.supporter || f.memberNo ? null : stagesFor(f);
  const doneCount = stages?.filter((s) => s.state === "done").length ?? 0;
  const statusLabel = f.supporter ? "On the Supporter list" : f.status;
  const number = f.memberNo ?? f.reference;

  return (
    <section
      aria-labelledby="welcome-h"
      className="relative overflow-hidden rounded-[28px] bg-forest-800 px-[clamp(20px,4vw,40px)] pt-[clamp(22px,4vw,36px)] pb-[clamp(22px,4vw,32px)] text-cream"
    >
      {/* Soft gold glow in the corner, purely decorative */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-gold/15 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-[13px] font-semibold tracking-[0.08em] text-gold-soft uppercase">
            {f.memberNo ? "Member account" : f.supporter ? "Supporter" : "Membership application"}
          </p>
          <h1 id="welcome-h" className="mt-2 mb-0 text-[clamp(30px,4.5vw,46px)] leading-tight text-cream">
            {greeting}
            {f.firstName ? `, ${f.firstName}` : ""}
          </h1>
          <p className="mt-2 mb-0 text-[15px] text-on-dark">
            {[f.memberType, f.chapter].filter(Boolean).join(" · ") || "HomeBridge Cooperative"}
          </p>
        </div>
        <button
          type="button"
          disabled={signingOut}
          onClick={signOut}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-cream/40 px-5 text-[15px] font-semibold text-cream transition-colors hover:bg-cream/10 disabled:opacity-60"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-forest-900/60 py-2 pr-2 pl-4">
          <span className="text-[13px] text-on-dark">{f.memberNo ? "Membership number" : "Application reference"}</span>
          <span className="font-mono text-[17px] font-semibold tracking-wide text-cream select-all">{number}</span>
          <CopyButton value={number} />
        </div>
        <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${PILL[f.status] ?? "bg-butter text-gold-ink"}`}>
          {statusLabel}
        </span>
      </div>

      {stages && (
        <div className="relative mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="m-0 text-[14px] font-semibold text-cream">Your progress</p>
            <p className="m-0 text-[13px] text-on-dark">
              {doneCount} of {stages.length} done
            </p>
          </div>
          {/* Overall bar */}
          <div className="h-1.5 overflow-hidden rounded-full bg-cream/15" aria-hidden="true">
            <div className="h-full rounded-full bg-gold transition-[width]" style={{ width: `${(doneCount / stages.length) * 100}%` }} />
          </div>
          <ol className="m-0 mt-5 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-5 sm:gap-2">
            {stages.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
                <span
                  aria-hidden="true"
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
                    s.state === "done"
                      ? "bg-gold text-forest-900"
                      : s.state === "current"
                        ? "bg-cream text-forest-900 ring-4 ring-gold/40"
                        : s.state === "stopped"
                          ? "bg-[#fdf6f3] text-danger"
                          : "border border-cream/30 text-on-dark"
                  }`}
                >
                  {s.state === "done" ? <CheckIcon size={15} strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className={`m-0 text-[14px] font-semibold ${s.state === "todo" ? "text-on-dark" : "text-cream"}`}>
                    {s.label}
                    <span className="sr-only">
                      {s.state === "done" ? " (done)" : s.state === "current" ? " (in progress)" : s.state === "stopped" ? " (stopped)" : " (to come)"}
                    </span>
                  </p>
                  <p className={`m-0 text-[13px] ${s.state === "current" ? "text-gold-soft" : "text-on-dark"}`}>{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

/** One clear sentence about what the applicant should do now, with a button when there is something to do. */
export function NextStepCard({ f }: { f: ApplicantFacts }) {
  if (f.supporter || f.memberNo || f.infoRequest) return null;
  const hasId = f.documents.some((d) => d.type === "id");
  const hasAddress = f.documents.some((d) => d.type === "address");
  const open = ["Submitted", "In review", "Info requested"].includes(f.status);

  let title: string;
  let text: string;
  let action: { label: string; href: string; external?: boolean } | null = null;
  let tone: "act" | "wait" | "stop" = "wait";

  if (f.status === "Declined") {
    tone = "stop";
    title = "We couldn’t approve your application";
    text = "We have emailed you the reason. You can ask the next general meeting to review the decision, or message the office with any questions.";
    action = { label: "Message the office", href: CONTACT.whatsapp, external: true };
  } else if (open && (!hasId || !hasAddress)) {
    tone = "act";
    const what = !hasId && !hasAddress ? "your ID and proof of address" : !hasId ? "a photo of your ID" : "your proof of address";
    title = `Upload ${what}`;
    text = "We can’t start checking your application until we have both documents. A clear phone photo is fine.";
    action = { label: "Upload now", href: "#documents" };
  } else if (!f.payment) {
    tone = "act";
    title = "Pay your joining fee";
    text = "We haven’t got a record of your joining fee yet. Message the office and we’ll send you the payment details.";
    action = { label: "Message the office", href: CONTACT.whatsapp, external: true };
  } else if (!f.payment.verified) {
    title = "Nothing for you to do right now";
    text = "We’re checking your joining fee against the bank or card record, and an officer is reviewing your documents. We aim to decide within 2 working days.";
  } else {
    title = "Nothing for you to do right now";
    text = "Your fee is verified and your documents are in. A membership officer is making the decision — we aim for 2 working days, and always within 30.";
  }

  const toneClass =
    tone === "act" ? "!border-gold/70 !bg-butter/50" : tone === "stop" ? "!border-danger/30 !bg-[#fdf6f3]" : "!bg-mist !border-mist";

  return (
    <Card className={`flex flex-wrap items-center gap-x-6 gap-y-4 ${toneClass}`}>
      <span
        aria-hidden="true"
        className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tone === "act" ? "bg-gold text-forest-900" : tone === "stop" ? "bg-paper text-danger" : "bg-forest-800 text-cream"}`}
      >
        {tone === "wait" ? <CheckIcon size={22} strokeWidth={2.6} /> : tone === "act" ? <ArrowRightIcon size={22} /> : <FileIcon size={22} />}
      </span>
      <div className="min-w-0 flex-1 basis-[260px]">
        <p className="m-0 text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Your next step</p>
        <h2 className="mt-1 mb-0 font-sans text-[19px] font-semibold text-ink">{title}</h2>
        <p className="mt-1.5 mb-0 text-[15px] leading-relaxed text-body">{text}</p>
      </div>
      {action && (
        <a
          href={action.href}
          {...(action.external ? { target: "_blank", rel: "noopener" } : {})}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-forest-800 px-6 text-[15px] font-semibold text-cream no-underline hover:bg-forest-900 hover:text-cream"
        >
          {action.external && <WhatsAppIcon size={18} />}
          {action.label}
        </a>
      )}
    </Card>
  );
}

/** Three small at-a-glance tiles under the banner. */
export function StatusTiles({ f }: { f: ApplicantFacts }) {
  if (f.supporter || f.memberNo) return null;
  const docs = ["id", "address"].filter((t) => f.documents.some((d) => d.type === t)).length;
  const tiles = [
    {
      icon: <FileIcon size={20} />,
      label: "Application",
      value: f.status,
      sub: `Sent ${f.submittedAt}`,
      good: f.status === "Approved",
    },
    {
      icon: <BankIcon size={20} />,
      label: "Joining fee",
      value: f.payment?.verified ? "Verified" : f.payment?.claimed ? "Being checked" : "Not paid yet",
      sub: f.payment ? [f.payment.method, f.payment.datePaid].filter(Boolean).join(" · ") : "No payment recorded",
      good: !!f.payment?.verified,
    },
    {
      icon: <IdIcon size={20} />,
      label: "Documents",
      value: `${docs} of 2 received`,
      sub: docs === 2 ? "ID and proof of address" : docs === 1 ? "One still needed" : "ID and proof of address needed",
      good: docs === 2,
    },
  ];
  return (
    <ul className="m-0 hidden list-none gap-4 p-0 sm:grid sm:grid-cols-3">
      {tiles.map((t) => (
        <li key={t.label} className="flex items-start gap-3.5 rounded-[22px] border border-line bg-paper p-5">
          <span
            aria-hidden="true"
            className={`grid size-10 shrink-0 place-items-center rounded-xl ${t.good ? "bg-mist text-forest-800" : "bg-butter text-gold-ink"}`}
          >
            {t.icon}
          </span>
          <div className="min-w-0">
            <p className="m-0 text-[13px] text-muted">{t.label}</p>
            <p className="m-0 mt-0.5 flex items-center gap-1.5 text-[17px] font-semibold text-ink">
              {t.good && <CheckIcon size={16} strokeWidth={3} className="text-forest-700" />}
              {t.value}
            </p>
            <p className="m-0 mt-0.5 truncate text-[13px] text-muted">{t.sub}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** "What happens next" as a vertical timeline for the side column. */
export function NextTimeline({ steps, title = "What happens next" }: { steps: string[]; title?: string }) {
  return (
    <Card>
      <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">{title}</h2>
      <ol className="m-0 mt-5 list-none p-0">
        {steps.map((t, i) => (
          <li key={t} className="relative flex gap-4 pb-5 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden="true" className="absolute top-8 bottom-0 left-[15px] w-0.5 bg-line" />}
            <span
              aria-hidden="true"
              className="relative grid size-8 shrink-0 place-items-center rounded-full bg-forest-800 text-[13px] font-semibold text-cream"
            >
              {i + 1}
            </span>
            <p className="m-0 pt-1 text-[14.5px] leading-relaxed text-body">{t}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Small help card with the office's WhatsApp and email. */
export function HelpCard() {
  return (
    <Card className="!bg-cream">
      <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Need help?</h2>
      <p className="mt-2 mb-4 text-[14.5px] leading-relaxed text-body">Questions about your application? Message the membership office.</p>
      <div className="flex flex-col gap-2.5">
        <a
          href={CONTACT.whatsapp}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-forest-800 px-5 text-[15px] font-semibold text-cream no-underline hover:bg-forest-900 hover:text-cream"
        >
          <WhatsAppIcon size={18} /> WhatsApp the office
        </a>
        <a href={`mailto:${CONTACT.email}`} className="text-center text-[14px] font-semibold break-all text-forest-800 underline underline-offset-[3px]">
          {CONTACT.email}
        </a>
      </div>
    </Card>
  );
}
