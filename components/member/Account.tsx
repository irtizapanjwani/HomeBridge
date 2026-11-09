"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckIcon, LockIcon } from "@/components/ui/Icons";
import { CONTACT } from "@/lib/content";
import { JOINING_FEE } from "@/lib/settings";
import type { DocMeta } from "@/lib/document-types";
import { Card, textLink } from "./bits";
import { ApplicantHero, HelpCard, NextStepCard, NextTimeline, StatusTiles } from "./ApplicantOverview";
import { DocumentsCard, InfoRequestCard } from "./Documents";
import { FormsCard, type FormsView } from "./Forms";
import { ContactEditor, MembershipCard, type MembershipView } from "./Membership";
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

  return (
    <div className="mx-auto max-w-[1240px] px-[clamp(16px,4vw,28px)] pt-[clamp(24px,4vw,40px)]">
      <ApplicantHero
        f={view}
        greeting={greeting}
        signingOut={signingOut}
        signOut={async () => {
          setSigningOut(true);
          await fetch("/api/member/login", { method: "DELETE" }).catch(() => null);
          window.location.href = "/";
        }}
      />

      {!view.membership && (
        <div className="mt-5 grid gap-5">
          {view.infoRequest && <InfoRequestCard needed={view.infoRequest.needed} by={view.infoRequest.by} />}
          <NextStepCard f={view} />
          <StatusTiles f={view} />
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="grid gap-5">
          {view.membership && <MembershipCard m={view.membership} />}
          {view.membership && view.infoRequest && <InfoRequestCard needed={view.infoRequest.needed} by={view.infoRequest.by} />}
          {view.forms && <FormsCard forms={view.forms} />}
          {view.contributions && <ContributionsCard c={view.contributions} />}
          {view.meeting && <MeetingCard meeting={view.meeting} />}
          {view.motions && <VotesCard motions={view.motions} />}
          {view.ideas && <IdeasCard ideas={view.ideas} />}

          {view.infoRepliedAt && view.status === "In review" && (
            <Card className="!bg-mist !border-mist">
              <p className="m-0 flex gap-2.5 text-[15px] text-body">
                <CheckIcon size={18} strokeWidth={2.6} className="mt-0.5 shrink-0 text-forest-700" />
                We received your reply on {view.infoRepliedAt}. An officer will look at it and let you know.
              </p>
            </Card>
          )}

          {!view.supporter && (
            <div id="documents" className="scroll-mt-6">
              <DocumentsCard documents={view.documents} canUpload={open} />
            </div>
          )}

          {view.payment && (
            <Card>
              <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Joining fee</h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${
                    view.payment.verified ? "bg-mist text-forest-800" : "bg-butter text-gold-ink"
                  }`}
                >
                  {view.payment.verified && <CheckIcon size={15} strokeWidth={3} />}
                  {view.payment.verified ? "Verified" : "Waiting to be checked"}
                </span>
                {view.payment.datePaid && <span className="text-[14.5px] text-muted">Paid {view.payment.datePaid}</span>}
              </div>
              <dl className="mt-4 divide-y divide-line/70">
                <Row label="How you paid" value={view.payment.method} />
                <Row label="Your payment reference" value={view.payment.reference} />
              </dl>
              {!view.payment.verified && (
                <p className="mt-4 mb-0 text-[14.5px] leading-relaxed text-muted">
                  An officer checks your payment against the bank or card record. Until then it shows as unverified — that is normal.
                </p>
              )}
            </Card>
          )}

          <Card>
            <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Your details</h2>
            <dl className="mt-3 divide-y divide-line/70">
              <Row label="Name" value={view.fullName} />
              <Row label="Email" value={view.email} />
              <Row label="WhatsApp" value={view.whatsapp} />
              <Row label="Address" value={[view.contact.address, view.contact.city].filter(Boolean).join(", ")} />
              <Row label="Lives in" value={view.livesIn} />
              {view.idLabel && <Row label="ID for verification" value={view.idLabel} />}
            </dl>
            {view.nominees.length > 0 && (
              <>
                <h3 className="mt-6 mb-1 font-sans text-[15px] font-semibold text-forest-800">Your nominees</h3>
                <dl className="divide-y divide-line/70">
                  {view.nominees.map((n) => (
                    <Row key={n.name} label={n.name} value={`${n.relationship} · ${n.share}%`} />
                  ))}
                </dl>
              </>
            )}
            {editing ? (
              <ContactEditor initial={view.contact} onDone={() => setEditing(false)} />
            ) : (
              <p className="mt-4 mb-0 text-[14.5px] text-muted">
                <button type="button" onClick={() => setEditing(true)} className={textLink}>
                  Update your phone or address
                </button>
                . To change your name, date of birth or email,{" "}
                <a href={CONTACT.whatsapp} target="_blank" rel="noopener" className={textLink}>
                  message the office
                </a>
                .
              </p>
            )}
          </Card>

        </div>

        <aside className="grid content-start gap-5">
          {view.glance && <GlanceCard g={view.glance} />}
          {!view.membership && <NextTimeline steps={steps} title={view.supporter ? "As a supporter" : "What happens next"} />}
          {!view.membership && !view.supporter && <Card className="!border-forest-800 !bg-forest-800 text-cream">
            <h2 className="m-0 font-sans text-[16px] font-semibold text-cream">Shares and statements</h2>
            <p className="mt-2 mb-0 text-[14.5px] leading-relaxed text-[#D6DED8]">
              Your share account opens once you are approved and have bought your first share. Contributions, statements and voting all
              appear here then.
            </p>
          </Card>}

          <HelpCard />

          <Card>
            <p className="m-0 flex gap-2.5 text-[14px] leading-snug text-muted">
              <LockIcon size={18} className="mt-0.5 shrink-0 text-forest-700" />
              <span>
                Nobody from HomeBridge will ever ask you for your password, your BVN or your bank PIN. Pay share money only into the
                cooperative&apos;s own account, never to a private one.
              </span>
            </p>
          </Card>

          <Card>
            <h2 className="m-0 font-sans text-[16px] font-semibold text-ink">Read the rules</h2>
            <p className="mt-2 mb-0 text-[14.5px] text-body">
              <Link href="/documents" className={textLink}>
                Bye-laws, privacy notice and risk notice
              </Link>
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="m-0 text-[15px] break-words text-ink">{value || <span className="text-muted">Not given</span>}</dd>
    </div>
  );
}
