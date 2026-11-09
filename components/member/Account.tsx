"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckIcon, LockIcon } from "@/components/ui/Icons";
import { CONTACT } from "@/lib/content";
import { JOINING_FEE } from "@/lib/settings";
import type { DocMeta } from "@/lib/document-types";
import { Card } from "./bits";
import { ApplicantHero, HelpCard, MemberStats, NextStepCard, NextTimeline, StatusTiles } from "./ApplicantOverview";
import { DocumentsCard, InfoRequestCard } from "./Documents";
import { FormsCard, type FormsView } from "./Forms";
import { ContactEditor, type MembershipView } from "./Membership";
import { ContributionsCard, type ContributionsView } from "./Contributions";
import { GlanceCard, type GlanceView, IdeasCard, type IdeaView, type MotionView, VotesCard } from "./Community";
import { MeetingCard, type MeetingView } from "./Meeting";

export type AccountView = {
  reference: string;
  /** Issued on approval; absent until then. */
  memberNo?: string;
  firstName: string;
  fullName: string;
  status: string;
  supporter: boolean;
  memberType: string;
  chapter: string;
  submittedAt: string;
  email: string;
  whatsapp: string;
  livesIn: string;
  idLabel: string;
  nominees: { name: string; relationship: string; share: number }[];
  payment: { claimed: boolean; verified: boolean; method: string; datePaid: string; reference: string } | null;
  /** The applicant's uploaded ID and proof of address, metadata only. */
  documents: DocMeta[];
  /** Present while an officer is waiting on the applicant (Email B). */
  infoRequest?: { needed: string; by: string };
  /** When the applicant last answered an information request. */
  infoRepliedAt?: string;
  /** The declaration and nominee forms, once the member is admitted. */
  forms?: FormsView;
  /** Membership details and downloads, once admitted. */
  membership?: MembershipView;
  /** Contribution history and share balance, once admitted. */
  contributions?: ContributionsView;
  /** Cooperative-wide totals, votes and ideas, once admitted. */
  glance?: GlanceView;
  motions?: MotionView[];
  /** The next general meeting and the member's reply, while one is coming up. */
  meeting?: MeetingView;
  ideas?: IdeaView[];
  /** What the member can change themselves. */
  contact: { whatsapp: string; address: string; city: string };
};

/** Statuses in which the application is still being decided, so documents can still be added. */
const OPEN = ["Submitted", "In review", "Info requested"];

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}


export function Account({ view }: { view: AccountView }) {
  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => setGreeting(greetingFor(new Date().getHours())), []);
  const [signingOut, setSigningOut] = useState(false);
  const [editing, setEditing] = useState(false);

  const steps = view.supporter
    ? [
        "We'll send you news a few times a year, and invitations to open events.",
        "If the membership rules change so you can join, you'll hear from us first.",
      ]
    : [
        `We check your joining fee payment to ${JOINING_FEE.payee} against the bank or card record. It is not a share and is not refundable.`,
        "A membership officer checks your ID and proof of address and reviews your application. We decide within 30 days, and aim for 2 working days.",
        "If you're approved, we email your membership number, certificate and welcome pack.",
        "You become an active member when you buy your first share and your name is on the register.",
      ];
  const open = !view.supporter && OPEN.includes(view.status);

  const signOut = async () => {
    setSigningOut(true);
    await fetch("/api/member/login", { method: "DELETE" }).catch(() => null);
    window.location.href = "/";
  };

  const replyNote = view.infoRepliedAt && view.status === "In review" && (
    <Card className="!border-mist !bg-mist">
      <p className="m-0 flex gap-2.5 text-[15px] text-body">
        <CheckIcon size={18} strokeWidth={2.6} className="mt-0.5 shrink-0 text-forest-700" />
        We received your reply on {view.infoRepliedAt}. An officer will look at it and let you know.
      </p>
    </Card>
  );

  const documentsCard = !view.supporter && (
    <div id="documents" className="scroll-mt-6">
      <DocumentsCard documents={view.documents} canUpload={open} />
    </div>
  );

  const feeCard = view.payment && (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Joining fee</h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13.5px] font-semibold ${
            view.payment.verified ? "bg-mist text-forest-800" : "bg-butter text-gold-ink"
          }`}
        >
          {view.payment.verified && <CheckIcon size={14} strokeWidth={3} />}
          {view.payment.verified ? "Verified" : "Waiting to be checked"}
        </span>
      </div>
      <dl className="mt-3 divide-y divide-line/70">
        {view.payment.datePaid && <Row label="Paid on" value={view.payment.datePaid} />}
        <Row label="How you paid" value={view.payment.method} />
        <Row label="Payment reference" value={view.payment.reference} />
      </dl>
      {!view.payment.verified && (
        <p className="mt-3 mb-0 text-[14px] leading-relaxed text-muted">
          An officer checks your payment against the bank or card record. Until then it shows as unverified — that is normal.
        </p>
      )}
    </Card>
  );

  const detailsCard = (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Your details</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-10 items-center rounded-full bg-mist px-4 text-[14px] font-semibold text-forest-800 hover:bg-forest-100"
          >
            Edit phone or address
          </button>
        )}
      </div>
      <dl className="mt-3 divide-y divide-line/70">
        <Row label="Name" value={view.fullName} />
        <Row label="Email" value={view.email} />
        <Row label="WhatsApp" value={view.whatsapp} />
        <Row label="Address" value={[view.contact.address, view.contact.city].filter(Boolean).join(", ")} />
        <Row label="Lives in" value={view.livesIn} />
        {view.idLabel && <Row label="ID for verification" value={view.idLabel} />}
        {view.nominees.map((n, i) => (
          <Row key={n.name} label={view.nominees.length > 1 ? `Nominee ${i + 1}` : "Nominee"} value={`${n.name} · ${n.relationship} · ${n.share}%`} />
        ))}
      </dl>
      {editing ? (
        <ContactEditor initial={view.contact} onDone={() => setEditing(false)} />
      ) : (
        <p className="mt-3 mb-0 text-[14px] text-muted">
          To change your name, date of birth or email,{" "}
          <a href={CONTACT.whatsapp} target="_blank" rel="noopener" className="font-semibold text-forest-800 underline underline-offset-[3px]">
            message the office
          </a>
          .
        </p>
      )}
    </Card>
  );

  const safetyCard = (
    <Card className="!p-5">
      <p className="m-0 flex gap-2.5 text-[14px] leading-snug text-muted">
        <LockIcon size={18} className="mt-0.5 shrink-0 text-forest-700" />
        <span>
          Nobody from HomeBridge will ever ask you for your password, your BVN or your bank PIN. Pay share money only into the cooperative&apos;s own
          account, never to a private one.
        </span>
      </p>
      <Link
        href="/documents"
        className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-[14.5px] font-semibold text-forest-800 underline underline-offset-[3px]"
      >
        Read the bye-laws, privacy and risk notices
      </Link>
    </Card>
  );

  const hero = (
    <ApplicantHero f={view} greeting={greeting} signingOut={signingOut} signOut={signOut} membership={view.membership} />
  );

  // ---------- Member ----------
  if (view.membership) {
    const c = view.contributions;
    return (
      <div className="mx-auto max-w-[1240px] px-[clamp(16px,4vw,28px)] pt-[clamp(20px,3vw,32px)]">
        {hero}

        <div className="mt-4 grid gap-4">
          <MemberStats
            totals={c?.totals ?? []}
            shares={c?.shares ?? 0}
            meetingDays={view.meeting ? view.meeting.daysLeft : null}
            openVotes={view.motions?.filter((m) => m.status === "open").length ?? 0}
          />
          {view.infoRequest && <InfoRequestCard needed={view.infoRequest.needed} by={view.infoRequest.by} />}
        </div>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.55fr_1fr]">
          <div className="grid gap-4">
            {view.forms && <FormsCard forms={view.forms} />}
            {c && (
              <div id="contributions" className="scroll-mt-6">
                <ContributionsCard c={c} />
              </div>
            )}
            {view.motions && (
              <div id="votes" className="scroll-mt-6">
                <VotesCard motions={view.motions} />
              </div>
            )}
            {view.ideas && <IdeasCard ideas={view.ideas} />}
          </div>
          <aside className="grid content-start gap-4">
            {view.meeting && <MeetingCard meeting={view.meeting} />}
            {view.glance && <GlanceCard g={view.glance} />}
            <HelpCard member />
            {safetyCard}
          </aside>
        </div>

        <section aria-labelledby="record-h" className="mt-10">
          <p className="eyebrow m-0">Your record</p>
          <h2 id="record-h" className="m-0 mt-1 text-[clamp(24px,3vw,32px)] text-forest-800">
            Details, documents and joining fee
          </h2>
          <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
            {detailsCard}
            <div className="grid gap-4">
              {documentsCard}
              {feeCard}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ---------- Applicant or supporter ----------
  return (
    <div className="mx-auto max-w-[1240px] px-[clamp(16px,4vw,28px)] pt-[clamp(20px,3vw,32px)]">
      {hero}

      <div className="mt-4 grid gap-4">
        {view.infoRequest && <InfoRequestCard needed={view.infoRequest.needed} by={view.infoRequest.by} />}
        <NextStepCard f={view} />
        <StatusTiles f={view} />
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="grid gap-4">
          {replyNote}
          {documentsCard}
          {feeCard}
          {detailsCard}
        </div>
        <aside className="grid content-start gap-4">
          <NextTimeline steps={steps} title={view.supporter ? "As a supporter" : "What happens next"} />
          {!view.supporter && (
            <Card className="!border-forest-800 !bg-forest-800 text-cream">
              <h2 className="m-0 font-sans text-[16px] font-semibold text-cream">Shares and statements</h2>
              <p className="mt-2 mb-0 text-[14.5px] leading-relaxed text-on-dark">
                Your share account opens once you are approved and have bought your first share. Contributions, statements and voting all appear
                here then.
              </p>
            </Card>
          )}
          <HelpCard />
          {safetyCard}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[minmax(0,150px)_1fr] sm:gap-4">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="m-0 text-[15px] break-words text-ink">{value || <span className="text-muted">Not given</span>}</dd>
    </div>
  );
}
