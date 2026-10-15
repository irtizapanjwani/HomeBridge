"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckIcon, LockIcon } from "@/components/ui/Icons";
import { CONTACT } from "@/lib/content";
import { JOINING_FEE } from "@/lib/settings";
import { Card, btnSecondary, textLink } from "./bits";

export type AccountView = {
  reference: string;
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
};

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const STATUS_TONE: Record<string, string> = {
  Submitted: "bg-butter text-gold-ink",
  "In review": "bg-butter text-gold-ink",
  "Info requested": "bg-butter text-gold-ink",
  Approved: "bg-mist text-forest-800",
  Declined: "bg-[#fdf6f3] text-danger",
};

export function Account({ view }: { view: AccountView }) {
  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => setGreeting(greetingFor(new Date().getHours())), []);
  const [signingOut, setSigningOut] = useState(false);

  const steps = view.supporter
    ? [
        "We'll send you news a few times a year, and invitations to open events.",
        "If the membership rules change so you can join, you'll hear from us first.",
      ]
    : [
        "A membership officer reviews your application. We decide within 30 days, and aim for 2 working days.",
        `If you're approved, we send you a link to pay the joining fee to ${JOINING_FEE.payee}. It is not a share and is not refundable.`,
        "You'll complete the secure ID check with our verification partner once your account opens.",
        "You become a member when the fee is paid, you buy your first share and your name is on the register.",
      ];

  return (
    <div className="mx-auto max-w-[1240px] px-[clamp(16px,4vw,28px)] pt-[clamp(24px,4vw,40px)]">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] text-muted">
            <span>
              Reference <span className="font-mono font-semibold text-forest-800">{view.reference}</span>
            </span>
            {view.memberType && <span>· {view.memberType}</span>}
            {view.chapter && <span>· {view.chapter}</span>}
          </p>
          <h1 className="mt-1.5 mb-0 text-[clamp(28px,4vw,40px)] text-forest-800">
            {greeting}
            {view.firstName ? `, ${view.firstName}` : ""}
          </h1>
        </div>
        <button
          type="button"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            await fetch("/api/member/login", { method: "DELETE" }).catch(() => null);
            window.location.href = "/";
          }}
          className={btnSecondary}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-5">
          <Card>
            <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Your application</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${STATUS_TONE[view.status] ?? "bg-mist text-forest-800"}`}>
                {view.supporter ? "On the Supporter list" : view.status}
              </span>
              <span className="text-[14.5px] text-muted">Sent {view.submittedAt}</span>
            </div>

            <h3 className="mt-7 mb-3 font-sans text-[15px] font-semibold text-forest-800">What happens next</h3>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {steps.map((t, i) => (
                <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-body">
                  <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-forest-800 text-[13px] font-semibold text-cream">
                    {i + 1}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </Card>

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
              <Row label="Lives in" value={view.livesIn} />
              {view.idLabel && <Row label="ID for verification" value={view.idLabel} />}
            </dl>
            <p className="mt-4 mb-0 text-[14.5px] text-muted">
              Something wrong?{" "}
              <a href={CONTACT.whatsapp} target="_blank" rel="noopener" className={textLink}>
                Message the office
              </a>{" "}
              and we will correct it.
            </p>
          </Card>

          {view.nominees.length > 0 && (
            <Card>
              <h2 className="m-0 font-sans text-[17px] font-semibold text-ink">Your nominees</h2>
              <dl className="mt-3 divide-y divide-line/70">
                {view.nominees.map((n) => (
                  <Row key={n.name} label={n.name} value={`${n.relationship} · ${n.share}%`} />
                ))}
              </dl>
            </Card>
          )}
        </div>

        <aside className="grid content-start gap-5">
          <Card className="bg-forest-800 text-cream">
            <h2 className="m-0 font-sans text-[16px] font-semibold text-cream">Shares and statements</h2>
            <p className="mt-2 mb-0 text-[14.5px] leading-relaxed text-[#D6DED8]">
              Your share account opens once you are approved and have bought your first share. Contributions, statements and voting all
              appear here then.
            </p>
          </Card>

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
