import Link from "next/link";
import { CONTACT } from "@/lib/content";

/** Closing band from the redesign: one clear next step on every public page. */
export function JoinCta() {
  return (
    <section className="bg-forest-800 text-cream" aria-labelledby="join-cta">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-[clamp(16px,4vw,28px)] py-14 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-[44em]">
          <h2 id="join-cta" className="m-0 text-[clamp(28px,3.6vw,40px)] leading-tight">
            Abroad and at home, <span className="text-gold">we build together.</span>
          </h2>
          <p className="m-0 mt-3 text-[16.5px] text-[#E6E0C8]">
            Register in about ten minutes on your phone. Officers review within 2 working days and message you on WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex min-h-13 items-center rounded-full bg-gold px-6 font-semibold text-forest-900 no-underline transition hover:-translate-y-px hover:bg-gold-soft hover:text-forest-900"
          >
            Start your registration
          </Link>
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-13 items-center rounded-full border border-cream/70 px-6 font-semibold text-cream no-underline transition hover:bg-cream/10 hover:text-cream"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
