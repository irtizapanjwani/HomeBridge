"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRightIcon, BankIcon, CheckIcon, ChartIcon, FileIcon, LockIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { LogoMark } from "@/components/ui/Logo";
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

        <LevelColumns
          cols="lg:grid-cols-[1.55fr_1fr]"
          panelHeight={JOURNEY_HEIGHT}
          left={[
            view.forms && <FormsCard key="forms" forms={view.forms} />,
            c && (
              <div key="contributions" id="contributions" className="scroll-mt-6">
                <ContributionsCard c={c} />
              </div>
            ),
            view.motions && (
              <div key="votes" id="votes" className="scroll-mt-6">
                <VotesCard motions={view.motions} />
              </div>
            ),
            view.ideas && <IdeasCard key="ideas" ideas={view.ideas} />,
          ]}
          right={[
            view.meeting && <MeetingCard key="meeting" meeting={view.meeting} />,
            view.glance && <GlanceCard key="glance" g={view.glance} />,
            <HelpCard key="help" member />,
            <div key="safety">{safetyCard}</div>,
            <QuickLinks key="quick" hasVotes={Boolean(view.motions)} hasContributions={Boolean(c)} />,
          ]}
          panel={(wide) => <JourneyCard view={view} wide={wide} />}
        />

        <section aria-labelledby="record-h" className="mt-10">
          <p className="eyebrow m-0">Your record</p>
          <h2 id="record-h" className="m-0 mt-1 text-[clamp(24px,3vw,32px)] text-forest-800">
            Details, documents and joining fee
          </h2>
          <LevelColumns
            left={[detailsCard]}
            right={[documentsCard, feeCard]}
            panelHeight={PANEL_HEIGHT}
            panel={(wide) => <SafeRecordPanel wide={wide} />}
          />
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

/**
 * Fills the space under "Your details" so the two columns of the record end level. Dark green with
 * gold, like the hero and footer, with a faint house mark: a calm word on how the record is kept.
 */
function SafeRecordPanel({ wide = false }: { wide?: boolean }) {
  const points = [
    "Your ID and documents are stored encrypted.",
    "Only the membership office sees them, to check who you are.",
    "They are never shown to other members.",
  ];
  return (
    <section
      aria-labelledby="safe-h"
      className={`relative flex flex-1 flex-col overflow-hidden rounded-[22px] bg-forest-800 p-[clamp(18px,2.6vw,24px)] text-cream ${
        wide ? "lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:items-center lg:gap-x-10" : ""
      }`}
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold via-gold-soft to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-14 rotate-[-10deg] opacity-[0.08]">
        <LogoMark size={230} />
      </div>
      <div className={wide ? "lg:row-span-2" : ""}>
        <p className="m-0 inline-flex items-center gap-2 text-[12px] font-bold tracking-[0.14em] text-gold uppercase">
          <LockIcon size={15} /> Your record is safe with us
        </p>
        <h2 id="safe-h" className="m-0 mt-2 text-[clamp(20px,2.2vw,24px)] text-cream">
          Kept private, kept secure
        </h2>
      </div>
      <ul className={`relative m-0 mt-3 flex list-none flex-col gap-2.5 p-0 ${wide ? "lg:mt-0" : ""}`}>
        {points.map((t) => (
          <li key={t} className="flex items-start gap-3 text-[15px] leading-snug text-on-dark">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/40">
              <CheckIcon size={13} strokeWidth={3} />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** About the panel's own height in a column, with the gap above it. */
const PANEL_HEIGHT = 205;

/**
 * Two columns that always end level. The panel goes under whichever column is shorter (measured in the
 * browser, so it follows the real number of documents and notes) and stretches to fill the gap; the
 * last card of the other column stretches too, to absorb any small difference. One column on phones.
 */
function LevelColumns({
  left,
  right,
  panel,
  panelHeight,
  cols = "lg:grid-cols-2",
}: {
  left: React.ReactNode[];
  right: React.ReactNode[];
  panel: (wide: boolean) => React.ReactNode;
  /** The panel's own height in a column, with the gap above it. */
  panelHeight: number;
  /** The two columns' widths on wide screens. */
  cols?: string;
}) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  // "below" = the columns are close in height, so the panel runs across the bottom of both instead.
  const [side, setSide] = useState<"left" | "right" | "below">("left");

  // useLayoutEffect so the panel moves before the page is painted; skipped on the server.
  const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
  useIsoLayoutEffect(() => {
    const measure = () => {
      // Each card's own height, not its stretched one: switch stretching off just while reading.
      const natural = (el: HTMLDivElement | null) =>
        el
          ? [...el.children]
              .filter((c) => !(c as HTMLElement).dataset.panel)
              .reduce((h, c) => {
                const box = c as HTMLElement;
                const inner = (box.firstElementChild ?? box) as HTMLElement;
                const before = [box.style.flex, inner.style.flex];
                box.style.flex = inner.style.flex = "none";
                const height = inner.getBoundingClientRect().height;
                [box.style.flex, inner.style.flex] = before;
                return h + height;
              }, 0)
          : 0;
      const l = natural(leftRef.current);
      const r = natural(rightRef.current);
      // Whichever leaves less empty space: the panel in the shorter column, or across the bottom.
      const gap = Math.abs(l - r);
      setSide(Math.abs(gap - panelHeight) < gap ? (l < r ? "left" : "right") : "below");
    };
    measure();
    const ro = new ResizeObserver(measure);
    [leftRef.current, rightRef.current].forEach((el) => el && [...el.children].forEach((c) => ro.observe(c.firstElementChild ?? c)));
    return () => ro.disconnect();
  }, [panelHeight]);

  const column = (items: React.ReactNode[], withPanel: boolean, ref: React.RefObject<HTMLDivElement | null>) => {
    const shown = items.filter(Boolean);
    return (
      <div ref={ref} className="flex flex-col gap-4">
        {shown.map((item, i) => (
          <div
            key={i}
            className={!withPanel && i === shown.length - 1 ? "flex flex-1 flex-col [&>*]:flex-1 [&>div>*]:h-full" : ""}
          >
            {item}
          </div>
        ))}
        {withPanel && (
          <div data-panel="1" className="flex flex-1 flex-col">
            {panel(false)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`mt-4 grid gap-4 ${cols}`}>
      {column(left, side === "left", leftRef)}
      {column(right, side === "right", rightRef)}
      {side === "below" && <div className="flex lg:col-span-2">{panel(true)}</div>}
    </div>
  );
}

/**
 * The member's own milestones, from application to the next meeting, on a dark green card. The steps
 * spread out to fill whatever height the column has spare, so the two columns always end level and
 * the space looks intended. The first step not yet reached is marked "Next".
 */
/** About the journey card's own height in a column, with the gap above it. */
const JOURNEY_HEIGHT = 440;

function JourneyCard({ view, wide = false }: { view: AccountView; wide?: boolean }) {
  const items = view.contributions?.items ?? [];
  const formsDone = Boolean(view.forms?.declaration && view.forms?.nominee);
  const steps: { title: string; detail: string; done: boolean }[] = [
    { title: "Applied", detail: view.submittedAt, done: true },
    {
      title: "Approved as a member",
      detail: view.membership ? `${view.membership.admittedAt} · ${view.membership.memberNo}` : "",
      done: Boolean(view.membership),
    },
    {
      title: "Membership forms signed",
      detail: formsDone ? "Declaration and nominee form" : view.forms ? `Please sign by ${view.forms.dueBy}` : "",
      done: formsDone,
    },
    {
      title: "First contribution",
      detail: items.length ? `${items[items.length - 1].period} · ${items.length} so far` : "Your first monthly payment",
      done: items.length > 0,
    },
    view.meeting
      ? { title: "Next general meeting", detail: view.meeting.when, done: false }
      : { title: "Have your say", detail: "Vote on motions and share your ideas", done: false },
  ];
  const next = steps.findIndex((st) => !st.done);

  return (
    <section
      aria-labelledby="journey-h"
      className="relative flex flex-1 flex-col overflow-hidden rounded-[22px] bg-forest-800 p-[clamp(18px,2.6vw,24px)] text-cream"
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold via-gold-soft to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -bottom-14 rotate-[-10deg] opacity-[0.07]">
        <LogoMark size={220} />
      </div>
      <p className="m-0 text-[12px] font-bold tracking-[0.14em] text-gold uppercase">Your HomeBridge journey</p>
      <h2 id="journey-h" className="m-0 mt-2 text-[clamp(20px,2.2vw,24px)] text-cream">
        How far you&apos;ve come
      </h2>
      <ol
        className={`relative m-0 mt-5 flex flex-1 list-none flex-col justify-between gap-4 p-0 ${
          wide ? "lg:grid lg:grid-cols-5 lg:gap-5" : ""
        }`}
      >
        {/* the line that joins the dots: down the side, or across the top on the wide layout */}
        <span
          aria-hidden="true"
          className={`absolute top-3 bottom-3 left-[11px] w-px bg-gradient-to-b from-gold/70 via-gold/30 to-cream/15 ${
            wide ? "lg:top-[11px] lg:right-6 lg:bottom-auto lg:left-3 lg:h-px lg:w-auto lg:bg-gradient-to-r" : ""
          }`}
        />
        {steps.map((st, i) => (
          <li key={st.title} className={`relative flex items-start gap-3 ${wide ? "lg:flex-col lg:gap-2.5" : ""}`}>
            <span
              className={`relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                st.done
                  ? "bg-gold text-forest-900"
                  : i === next
                    ? "bg-forest-800 text-gold ring-2 ring-gold"
                    : "bg-forest-800 ring-1 ring-cream/30"
              }`}
            >
              {st.done ? <CheckIcon size={13} strokeWidth={3} /> : i === next ? <span className="h-2 w-2 rounded-full bg-gold" /> : null}
            </span>
            <div className="min-w-0">
              <p className={`m-0 text-[15px] font-semibold ${st.done ? "text-cream" : i === next ? "text-gold" : "text-on-dark"}`}>
                {st.title}
                {i === next && (
                  <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 align-middle text-[11px] font-bold tracking-wide text-gold uppercase">
                    Next
                  </span>
                )}
              </p>
              {st.detail && <p className="m-0 mt-0.5 text-[13.5px] text-on-dark/80">{st.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Big friendly shortcuts at the foot of the right-hand column. The tiles grow with the card, so the
 * card can fill whatever space the column has left and the two columns still end level.
 */
function QuickLinks({ hasVotes, hasContributions }: { hasVotes: boolean; hasContributions: boolean }) {
  const tiles = [
    ...(hasContributions ? [{ href: "#contributions", label: "Pay or send proof", sub: "Your contributions", Icon: BankIcon }] : []),
    ...(hasContributions ? [{ href: "#contributions", label: "Get a statement", sub: "PDF or spreadsheet", Icon: ChartIcon }] : []),
    ...(hasVotes ? [{ href: "#votes", label: "Have your say", sub: "Open votes", Icon: CheckIcon }] : []),
    { href: "#documents", label: "Your documents", sub: "Forms and receipts", Icon: FileIcon },
  ].slice(0, 4);
  return (
    <section aria-labelledby="quick-h" className="flex flex-col rounded-[22px] border border-line bg-paper p-[clamp(18px,2.6vw,24px)]">
      <div className="flex items-center justify-between gap-3">
        <h2 id="quick-h" className="m-0 font-sans text-[17px] font-semibold text-ink">
          Quick links
        </h2>
        <a
          href={CONTACT.whatsapp}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-forest-800 no-underline hover:underline"
        >
          <WhatsAppIcon size={16} /> Ask the office
        </a>
      </div>
      <div className="mt-3 grid flex-1 auto-rows-fr grid-cols-2 gap-3">
        {tiles.map(({ href, label, sub, Icon }) => (
          <a
            key={label}
            href={href}
            className="group flex min-h-[92px] flex-col justify-between rounded-[16px] bg-mist/60 p-3.5 text-forest-800 no-underline ring-1 ring-forest-800/5 transition hover:-translate-y-0.5 hover:bg-mist hover:shadow-card"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper text-forest-800 shadow-sm">
              <Icon size={18} />
            </span>
            <span>
              <span className="flex items-center gap-1 text-[14.5px] font-semibold text-ink">
                {label}
                <ArrowRightIcon size={14} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </span>
              <span className="block text-[12.5px] text-muted">{sub}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
