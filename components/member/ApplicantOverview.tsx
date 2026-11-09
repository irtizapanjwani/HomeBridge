"use client";

import { useState } from "react";
import { CheckIcon, ClipboardIcon, DownloadIcon, FileIcon, IdIcon, BankIcon, WhatsAppIcon, ArrowRightIcon } from "@/components/ui/Icons";
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

function CopyButton({ value, light }: { value: string; light?: boolean }) {
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
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors ${light ? "bg-forest-800 text-cream hover:bg-forest-900" : "border border-cream/30 text-cream hover:bg-cream/10"}`}
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

/** Welcome banner in the landing-page style: cream background, serif greeting with a gold accent,
 * and a card on the right — the membership card for members, the progress steps for applicants. */
export function ApplicantHero({
  f,
  greeting,
  signOut,
  signingOut,
  membership,
}: {
  f: ApplicantFacts;
  greeting: string;
  signOut: () => void;
  signingOut: boolean;
  membership?: { category: string; chapter: string; admittedAt: string; certificateNo: string; receiptNo?: string };
}) {
  const stages = f.supporter || f.memberNo ? null : stagesFor(f);
  const doneCount = stages?.filter((s) => s.state === "done").length ?? 0;
  const statusLabel = f.supporter ? "On the Supporter list" : f.status;
  const number = f.memberNo ?? f.reference;
  const subtitle = f.memberNo
    ? "Here’s your membership at a glance — contributions, meetings and votes are all below."
    : f.supporter
      ? "Thank you for supporting HomeBridge. We’ll keep you posted."
      : "Here’s where your application is, and what happens next.";

  return (
    <section aria-labelledby="welcome-h" className="relative overflow-hidden rounded-[28px] border border-line bg-cream">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -right-40 size-[480px] rounded-full bg-gold/10 blur-3xl" />
      <div className="relative grid items-center gap-8 p-[clamp(20px,4vw,44px)] lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        {/* Left: greeting */}
        <div className="flex min-w-0 flex-col gap-4">
          <span className="inline-flex flex-wrap items-center gap-2 self-start rounded-full bg-paper px-3.5 py-1.5 text-[13px] font-medium text-forest-800 ring-1 ring-line">
            <span className="font-semibold text-gold-dark">{f.memberNo ? "Member" : f.supporter ? "Supporter" : "Applicant"}</span>
            {[f.memberType, f.chapter].filter(Boolean).join(" · ") || "HomeBridge Cooperative"}
          </span>
          <h1 id="welcome-h" className="m-0 text-[clamp(32px,4.6vw,52px)] leading-[1.06] text-forest-800">
            {greeting}
            {f.firstName ? (
              <>
                , <span className="text-gold-dark">{f.firstName}.</span>
              </>
            ) : (
              "."
            )}
          </h1>
          <p className="m-0 max-w-[32em] text-[clamp(15.5px,1.4vw,17px)] text-body">{subtitle}</p>

          {!f.memberNo && (
            <div className="flex flex-wrap items-center gap-2.5 self-start rounded-2xl bg-paper py-1.5 pr-1.5 pl-4 ring-1 ring-line">
              <span className="text-[13px] text-muted">Reference</span>
              <span className="font-mono text-[16px] font-semibold tracking-wide text-forest-800 select-all">{number}</span>
              <CopyButton value={number} light />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${PILL[f.status] ?? "bg-butter text-gold-ink"}`}>
              {statusLabel}
            </span>
            <button
              type="button"
              disabled={signingOut}
              onClick={signOut}
              className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-forest-800 px-5 text-[15px] font-semibold text-forest-800 transition hover:-translate-y-px hover:bg-paper disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>

        {/* Right: membership card, or the progress steps */}
        {f.memberNo && membership ? (
          <div className="relative">
            <div aria-hidden="true" className="absolute -inset-3 rotate-2 rounded-[28px] bg-gold/25" />
            <div className="relative flex flex-col gap-4 rounded-[22px] bg-forest-800 p-6 text-cream shadow-card sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <p className="m-0 flex items-center gap-2 text-[12.5px] font-semibold tracking-[0.08em] text-gold-soft uppercase">
                  <CheckIcon size={15} strokeWidth={3} /> Membership card
                </p>
                <CopyButton value={number} />
              </div>
              <div>
                <p className="m-0 font-mono text-[clamp(22px,3vw,30px)] font-bold tracking-wide text-cream select-all">{number}</p>
                <p className="m-0 mt-1 text-[13px] text-on-dark">Quote it on every payment, form and enquiry.</p>
              </div>
              <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-cream/15 pt-4">
                {[
                  ["Category", `${membership.category} member`],
                  ["Chapter", membership.chapter],
                  ["Admitted", membership.admittedAt],
                  ["Certificate", membership.certificateNo],
                ].map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-[12.5px] text-on-dark">{k}</dt>
                    <dd className="m-0 text-[14.5px] font-semibold break-words text-cream">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/api/member/certificate"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gold px-4 text-[14px] font-semibold text-forest-900 no-underline hover:bg-gold-soft"
                >
                  <DownloadIcon size={16} /> Certificate
                </a>
                {membership.receiptNo ? (
                  <a
                    href="/api/member/receipt"
                    target="_blank"
                    rel="noopener"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cream/35 px-4 text-[14px] font-semibold text-cream no-underline hover:bg-cream/10 hover:text-cream"
                  >
                    <DownloadIcon size={16} /> Joining fee receipt
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ) : stages ? (
          <div className="relative">
            <div aria-hidden="true" className="absolute -inset-3 rotate-2 rounded-[28px] bg-gold/25" />
            <div className="relative flex flex-col gap-3 rounded-[22px] bg-paper p-5 text-ink shadow-card sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="m-0 font-display text-[21px] text-forest-800">Your progress</h2>
                <span className="shrink-0 rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-forest-800">
                  {doneCount} of {stages.length} done
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <div className="h-full rounded-full bg-gold" style={{ width: `${(doneCount / stages.length) * 100}%` }} />
              </div>
              <ol className="m-0 flex list-none flex-col gap-2 p-0">
                {stages.map((s, i) => (
                  <li
                    key={s.label}
                    className={`flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 ${
                      s.state === "current" ? "bg-butter ring-1 ring-gold/50" : s.state === "stopped" ? "bg-[#fdf6f3]" : "bg-cream"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
                        s.state === "done"
                          ? "bg-forest-800 text-cream"
                          : s.state === "current"
                            ? "bg-gold text-forest-900"
                            : s.state === "stopped"
                              ? "bg-danger text-paper"
                              : "border border-line-strong/60 text-muted"
                      }`}
                    >
                      {s.state === "done" ? <CheckIcon size={15} strokeWidth={3} /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`m-0 text-[14.5px] font-semibold ${s.state === "todo" ? "text-muted" : "text-forest-800"}`}>
                        {s.label}
                        <span className="sr-only">
                          {s.state === "done" ? " (done)" : s.state === "current" ? " (in progress)" : s.state === "stopped" ? " (stopped)" : " (to come)"}
                        </span>
                      </p>
                    </div>
                    <span className={`shrink-0 text-right text-[13px] ${s.state === "current" ? "font-semibold text-gold-ink" : "text-muted"}`}>{s.detail}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Four headline numbers for members, in the landing page's stat-box style. */
export function MemberStats({
  totals,
  shares,
  meetingDays,
  openVotes,
}: {
  totals: string[];
  shares: number;
  meetingDays: number | null;
  openVotes: number;
}) {
  const stats = [
    { value: totals.length ? totals.join(" + ") : "£0", label: "Total contributed", href: "#contributions" },
    { value: shares.toLocaleString("en-GB"), label: shares === 1 ? "Share owned" : "Shares owned", href: "#contributions" },
    {
      value: meetingDays === null ? "—" : meetingDays === 0 ? "Today" : `${meetingDays} days`,
      label: meetingDays === null ? "No meeting called" : "Until the next meeting",
      href: "#meeting",
    },
    { value: String(openVotes), label: openVotes === 1 ? "Vote open now" : "Votes open now", href: "#votes" },
  ];
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4 lg:gap-4">
      {stats.map((s) => (
        <li key={s.label}>
          <a
            href={s.href}
            className="flex h-full flex-col gap-1 rounded-[20px] border border-line bg-paper px-5 py-4 text-ink no-underline shadow-card transition hover:-translate-y-px hover:border-line-strong/60"
          >
            <span className="font-display text-[clamp(22px,2.4vw,30px)] leading-tight font-bold break-words text-gold-dark">{s.value}</span>
            <span className="text-[13.5px] text-muted">{s.label}</span>
          </a>
        </li>
      ))}
    </ul>
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
export function HelpCard({ member = false }: { member?: boolean }) {
  return (
    <Card className="!bg-cream">
      <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Need help?</h2>
      <p className="mt-2 mb-4 text-[14.5px] leading-relaxed text-body">{member ? "Questions about payments, forms or meetings? Message the office." : "Questions about your application? Message the membership office."}</p>
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
