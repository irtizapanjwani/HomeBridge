import Link from "next/link";
import { ArrowRightIcon, LockIcon } from "@/components/ui/Icons";
import { LogoMark } from "@/components/ui/Logo";

/** The page frame every member-area page shares: same width and padding as the dashboard. */
export function PortalPage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1240px] px-[clamp(16px,4vw,28px)] pt-[clamp(20px,3vw,32px)]">{children}</div>;
}

/** Page title block: a gold eyebrow, a big serif title and one plain line under it. */
export function PageHeading({ eyebrow, title, lead, aside }: { eyebrow: string; title: string; lead: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-[720px]">
        <p className="eyebrow m-0">{eyebrow}</p>
        <h1 className="m-0 mt-1 text-[clamp(30px,4.4vw,44px)] leading-[1.1] text-forest-800">{title}</h1>
        <p className="mt-3 mb-0 text-[16.5px] leading-relaxed text-body">{lead}</p>
      </div>
      {aside}
    </div>
  );
}

/** Dark green feature panel with a gold top line and a faint house mark, as on the dashboard. */
export function GreenPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden rounded-[22px] bg-forest-800 p-[clamp(18px,3vw,28px)] text-cream ${className}`}>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold via-gold-soft to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-14 rotate-[-10deg] opacity-[0.07]">
        <LogoMark size={230} />
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

/** Shown when an applicant opens a page that is for members only. */
export function MembersOnly({ what }: { what: string }) {
  return (
    <PortalPage>
      <GreenPanel className="mx-auto mt-6 max-w-[640px] text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/40">
          <LockIcon size={22} />
        </span>
        <h1 className="m-0 mt-4 text-[clamp(26px,3.4vw,34px)] text-cream">{what} open once you are a member</h1>
        <p className="mx-auto mt-3 mb-0 max-w-[460px] text-[16px] leading-relaxed text-on-dark">
          We will email you as soon as your application is approved. Until then you can follow your application on your dashboard.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-gold px-6 text-[15.5px] font-semibold text-forest-900 no-underline hover:bg-gold-soft hover:text-forest-900"
        >
          Back to my dashboard <ArrowRightIcon size={16} />
        </Link>
      </GreenPanel>
    </PortalPage>
  );
}
