"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckIcon, CloseIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { JOINING_FEE } from "@/lib/settings";

/** What the server told us about a sent application, and all the confirmation needs to show. */
export type Submission = { reference: string; supporter: boolean; firstName: string; contact: string; fee?: string };

/**
 * What a member sees the moment their application is sent.
 *
 * It replaces a full confirmation page, so it carries everything that page did: the reference,
 * what happens next, and where to go. It never dismisses itself — the reference is not emailed,
 * so a toast that vanished after a few seconds would take the only copy with it.
 */
export function SubmittedToast({ result, onClose }: { result: Submission; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);

  // Moves the keyboard here, so the news is announced and the panel can be dismissed with Escape.
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timer.current);
    };
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.reference);
    } catch {
      // Denied clipboard permission, or an insecure origin. The reference is on screen to read.
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

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
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[200] flex justify-center p-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:justify-end sm:p-0"
    >
      <div className="animate-toast-in flex max-h-[85dvh] w-full max-w-[440px] flex-col overflow-y-auto rounded-[20px] border border-line bg-paper shadow-card">
        <div className="flex items-start gap-3 border-b border-line px-5 pt-5 pb-4">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-mist text-forest-800">
            <CheckIcon size={19} strokeWidth={2.6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[17px] font-semibold text-forest-800">
              {result.supporter ? "You’re on the Supporter list" : "Application submitted"}
            </p>
            <p className="m-0 mt-0.5 text-[14px] text-body">
              {result.firstName ? `Thank you, ${result.firstName}. ` : "Thank you. "}
              {result.supporter
                ? "We’re glad to have you with us."
                : `We’ll keep you posted${result.contact ? ` on ${result.contact}` : ""}.`}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1.5 grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-mist hover:text-ink"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="m-0 text-[13px] text-muted">Your reference</p>
          <div className="mt-1 flex items-center gap-2.5">
            <p className="m-0 min-w-0 flex-1 truncate font-mono text-[20px] font-semibold tracking-wide text-ink">{result.reference}</p>
            <button
              type="button"
              onClick={copy}
              className="min-h-9 shrink-0 rounded-full border border-forest-800 px-3.5 text-[13.5px] font-semibold text-forest-800 transition hover:bg-mist"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="m-0 mt-1.5 text-[13px] text-muted">
            Keep this reference and quote it if you contact us. It is also on your account page.
          </p>
        </div>

        <div className="border-t border-line px-5 py-4">
          <p className="m-0 text-[13px] font-semibold tracking-[0.05em] text-muted uppercase">What happens next</p>
          <ol className="m-0 mt-2.5 flex list-none flex-col gap-2.5 p-0">
            {steps.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-body">
                <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-forest-800 text-[12px] font-semibold text-cream">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
          <Link
            href="/app"
            className="inline-flex min-h-10 items-center rounded-full bg-forest-800 px-4 text-[14px] font-semibold text-cream no-underline hover:bg-forest-900 hover:text-cream"
          >
            Go to your account
          </Link>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-forest-800 px-4 text-[14px] font-semibold text-forest-800 no-underline hover:bg-mist"
          >
            <WhatsAppIcon size={17} /> Share
          </a>
        </div>
      </div>
    </div>
  );
}
