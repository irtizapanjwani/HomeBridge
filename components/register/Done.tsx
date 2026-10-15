"use client";

import { useEffect, type RefObject } from "react";
import Link from "next/link";
import { CheckIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { JOINING_FEE } from "@/lib/settings";

export type Submission = { reference: string; supporter: boolean; firstName: string; contact: string; fee?: string };

export function DoneScreen({ result, headingRef, onNew }: { result: Submission; headingRef: RefObject<HTMLHeadingElement | null>; onNew: () => void }) {
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [headingRef]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareText = result.supporter
    ? `I’ve joined the HomeBridge Cooperative Supporter list. Africans abroad and at home, building together: ${origin}/`
    : `I’ve just applied to join HomeBridge Cooperative: member-owned businesses at home, one member, one vote. Have a look: ${origin}/`;

  const steps = result.supporter
    ? [
        "We’ll send you news a few times a year, and invitations to open events.",
        "If the membership rules change so you can join, you’ll hear from us first.",
        "You can leave the list at any time. Just message us.",
      ]
    : [
        "A membership officer reviews your application. We decide within 30 days, and aim for 2 working days.",
        `If you’re approved, we send you a link to pay the joining fee (${result.fee ?? `£${JOINING_FEE.gbp} abroad or ₦${JOINING_FEE.ngn.toLocaleString("en-GB")} in Nigeria`}) to ${JOINING_FEE.payee}. It is not a share and is not refundable.`,
        "You’ll complete the secure ID check with our verification partner once your account opens.",
        "You become a member when the fee is paid, you buy your first share and your name is on the register.",
      ];

  return (
    <section aria-labelledby="done-title" className="mx-auto max-w-[720px] rounded-[24px] border border-line bg-paper px-5 py-8 sm:px-10 sm:py-11">
      <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-mist text-forest-800">
        <CheckIcon size={28} strokeWidth={2.6} />
      </span>
      <h1 id="done-title" ref={headingRef} tabIndex={-1} className="mt-5 text-[30px] text-forest-800 outline-none sm:text-[38px]">
        {result.supporter ? "You’re on the Supporter list" : "Application submitted"}
      </h1>
      <p className="mt-2 text-[16px] text-body">
        {result.firstName ? `Thank you, ${result.firstName}. ` : "Thank you. "}
        {result.supporter
          ? "We’re glad to have you with us."
          : `We’ll keep you posted${result.contact ? ` on ${result.contact}` : ""}.`}
      </p>

      <dl className="mt-6 grid gap-3 rounded-[20px] border border-line bg-page p-4 sm:grid-cols-2 sm:p-5">
        <div>
          <dt className="text-[13.5px] text-muted">Your reference</dt>
          <dd className="mt-0.5 font-mono text-[20px] font-semibold tracking-wide text-ink">{result.reference}</dd>
        </div>
        <div>
          <dt className="text-[13.5px] text-muted">Status</dt>
          <dd className="mt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-[14px] font-semibold text-forest-800">
              <span aria-hidden="true" className="size-2 rounded-full bg-gold" />
              {result.supporter ? "Supporter" : "Submitted"}
            </span>
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[13.5px] text-muted">Keep this reference. Quote it if you contact us.</p>

      <h2 className="mt-8 text-[22px] text-forest-900">What happens next</h2>
      <ol className="mt-3 space-y-3">
        {steps.map((t, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-body">
            <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-forest-800 text-[13px] font-semibold text-cream">
              {i + 1}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-7">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-forest-800 px-6 font-semibold text-cream no-underline hover:bg-forest-900 hover:text-cream"
        >
          <WhatsAppIcon size={20} /> Share on WhatsApp
        </a>
        <Link
          href="/app"
          className="inline-flex min-h-12 items-center rounded-full border border-forest-800 px-6 font-semibold text-forest-800 no-underline hover:bg-mist"
        >
          Go to your account
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-full px-6 font-semibold text-forest-800 underline underline-offset-[3px] hover:bg-mist"
        >
          Back to the home page
        </Link>
      </div>
      <p className="mt-6 text-[14px] text-muted">
        Applying for someone else too?{" "}
        <button type="button" onClick={onNew} className="min-h-11 font-medium text-forest-800 underline underline-offset-[3px]">
          Start a new application
        </button>
      </p>
    </section>
  );
}
