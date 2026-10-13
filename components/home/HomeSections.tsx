import Link from "next/link";
import { FAQS, PORTFOLIO_RULES, SAFEGUARDS } from "@/lib/content";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "./SectionHeading";
import { EligibilityCheck } from "./EligibilityCheck";
import { MemberCards } from "./MemberCards";
import { TwoPayments } from "./MoneySplit";
import { ProjectCards } from "./Sections";

const wrap = "mx-auto max-w-[1200px] px-[clamp(16px,4vw,28px)]";

export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mt-7 inline-flex items-center gap-2 font-semibold text-forest-800 no-underline hover:underline">
      {children} <ArrowRightIcon size={18} />
    </Link>
  );
}

export function WhoCanJoinHome() {
  return (
    <section className="border-b border-line">
      <div className={`${wrap} py-16 sm:py-20`}>
        <SectionHeading
          eyebrow="Who can join"
          title="Same share price. Same vote. Anywhere."
          lead="Anyone aged 18 or over, of good character, who passes our identity checks. Choose the membership that fits you — every type buys shares at ₦1,000 and carries one vote."
        />
        <MemberCards />
        <EligibilityCheck ctaHref="/register" />
        <MoreLink href="/join">Fees, rules and how membership works</MoreLink>
      </div>
    </section>
  );
}

/** Share money split as one stacked bar, labelled in place (redesign). */
export function SplitBar() {
  const parts = [
    { pct: 75, label: "into approved businesses, in stages", cls: "bg-forest-800 text-cream" },
    { pct: 15, label: "reserve", cls: "bg-gold text-forest-900" },
    { pct: 10, label: "running", cls: "bg-mist text-forest-800" },
  ];
  return (
    <div>
      <div className="flex h-14 overflow-hidden rounded-[14px] text-[13px] font-semibold sm:text-sm" role="img" aria-label="Share money: 75% into approved businesses in stages, 15% reserve, 10% running costs">
        {parts.map((p) => (
          <div key={p.pct} className={`flex min-w-0 items-center px-2 sm:px-3 ${p.cls}`} style={{ width: `${p.pct}%` }}>
            <span className="truncate lg:overflow-visible">
              {p.pct}%<span className="hidden sm:inline"> · {p.label}</span>
            </span>
          </div>
        ))}
      </div>
      <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-[13.5px] text-body sm:hidden">
        {parts.map((p) => (
          <li key={p.pct}>
            <b className="font-semibold text-ink">{p.pct}%</b> {p.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const PROFIT_CARDS = [
  ["40%", "Kept to grow", "At least a quarter of all profit goes to the legal reserve fund; the rest funds new businesses."],
  ["40%", "Shared with members", "As a dividend on shares, after the yearly audit and AGM approval."],
  ["10%", "Education and training", "Enterprise, cooperation and financial literacy for members."],
  ["10%", "Community development", "Given to registered charities as members decide at the AGM."],
] as const;

export function ProfitCards() {
  return (
    <ul className="m-0 grid list-none gap-3.5 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {PROFIT_CARDS.map(([pct, t, d]) => (
        <li
          key={t}
          className="group relative overflow-hidden rounded-[20px] border border-line bg-paper p-5 pb-7 transition duration-300 hover:-translate-y-1.5 hover:border-forest-800 hover:shadow-[0_16px_32px_-14px_rgb(14_44_30/0.35)]"
        >
          {/* soft green wash rising from the bottom on hover */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-0 bg-gradient-to-t from-mist to-transparent transition-[height] duration-500 ease-out group-hover:h-full"
          />
          <span className="relative flex items-baseline justify-between">
            <span className="block origin-left text-[34px] leading-none font-bold text-forest-800 transition duration-300 group-hover:scale-110 group-hover:text-gold-dark">
              {pct}
            </span>
            <span aria-hidden="true" className="flex h-8 w-8 translate-x-2 items-center justify-center rounded-full bg-forest-800 text-gold opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100">
              ₦
            </span>
          </span>
          <b className="relative mt-3 block font-semibold text-ink">{t}</b>
          <span className="relative mt-1 block text-[14px] text-body">{d}</span>
          {/* share-of-profit bar fills to its percentage on hover */}
          <span aria-hidden="true" className="absolute inset-x-5 bottom-4 h-1.5 overflow-hidden rounded-full bg-line/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span
              className="block h-full w-0 rounded-full bg-gold transition-[width] duration-700 ease-out group-hover:w-[var(--pct)]"
              style={{ "--pct": pct } as React.CSSProperties}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MoneyHome() {
  return (
    <section className="border-b border-line bg-paper">
      <div className={`${wrap} py-16 sm:py-20`}>
        <SectionHeading
          eyebrow="Your money"
          title="Two payments. Two places. Never a person."
          lead="Your joining fee pays for registration and identity checks. Your shares go only into the cooperative’s own bank accounts — never into cash, and never into anyone’s personal account. Your member number is your payment reference, always."
        />
        <TwoPayments />
        <h3 className="mt-12 mb-4 font-display text-[24px] font-bold text-forest-800">Where every naira of share money goes</h3>
        <SplitBar />
        <p className="m-0 mt-3 text-[14px] text-muted">
          Within agreed limits, part of the business money may instead go into the long-term investment portfolio. Running
          costs include the audit, the members’ dashboard and the manager’s published fee.
        </p>
        <h3 className="mt-12 mb-4 font-display text-[24px] font-bold text-forest-800">When the businesses make a profit</h3>
        <ProfitCards />
        <MoreLink href="/your-money">Follow your money in detail</MoreLink>
      </div>
    </section>
  );
}

export function PortfolioTiles() {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[420px]:grid-cols-2 lg:grid-cols-3">
      {PORTFOLIO_RULES.map((r) => (
        <li key={r.big} className="rounded-[18px] bg-mist p-5">
          <b className="block text-[24px] leading-tight font-bold text-forest-800">{r.big}</b>
          {r.title && <span className="mt-1 block text-[14px] font-medium text-ink">{r.title}</span>}
          <span className="mt-1 block text-[14px] text-body">{r.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function PortfolioHome() {
  return (
    <section className="border-b border-line">
      <div className={`${wrap} grid gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_1.15fr] lg:items-center`}>
        <div>
          <SectionHeading eyebrow="New · Long-term portfolio" title="Steady growth, on expert advice — never quick bets." />
          <p className="m-0 text-[16.5px] text-body">
            Alongside our own businesses, members may agree to hold a spread of quoted company shares, Federal Government
            bonds and treasury bills, and SEC-registered funds. Members approve the investment policy; the Board works
            within it.
          </p>
          <p className="m-0 mt-4 text-[13.5px] text-muted">
            The limits shown are proposals in the draft bye-laws, for members to decide. The value of investments can go
            down as well as up.
          </p>
          <MoreLink href="/portfolio">How the portfolio works</MoreLink>
        </div>
        <PortfolioTiles />
      </div>
    </section>
  );
}

export function GateGrid() {
  return (
    <ol className="m-0 grid list-none gap-3.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {SAFEGUARDS.map((g, i) => (
        <li key={g.title} className="rounded-[20px] bg-paper p-5 sm:p-6">
          <span className="text-[12px] font-semibold tracking-[0.1em] text-gold-dark uppercase">Gate {i + 1}</span>
          <h3 className="m-0 mt-1.5 font-sans text-[18px] font-semibold text-forest-800">{g.title}</h3>
          <p className="m-0 mt-1.5 text-[14.5px] text-body">
            {g.title === "Spending limits"
              ? "Manager ₦2m · Chairman + Treasurer ₦20m · full Board above · members vote over ₦50m."
              : g.text}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function GatesHome() {
  return (
    <section className="border-b border-line bg-cream">
      <div className={`${wrap} py-16 sm:py-20`}>
        <SectionHeading eyebrow="How your money is protected" title="No single person can move money." />
        <GateGrid />
        <MoreLink href="/your-money#safeguards">See how a payment clears every gate</MoreLink>
      </div>
    </section>
  );
}

export function ProjectsHome() {
  return (
    <section className="border-b border-line">
      <div className={`${wrap} py-16 sm:py-20`}>
        <SectionHeading
          eyebrow="First cohort projects"
          title="Real businesses you can visit."
          lead="Being shortlisted now in Edo and Abuja. No money moves until a project passes all five checks."
        />
        <ProjectCards />
        <MoreLink href="/projects">Projects and the five checks</MoreLink>
      </div>
    </section>
  );
}

export function BoardCard() {
  const seats = [
    ["Chairman", "bg-forest-800 text-cream"],
    ["3 home members", "bg-mist text-forest-800"],
    ["3 diaspora members", "bg-mist text-forest-800"],
    ["1 independent accountant", "bg-mist text-forest-800"],
    ["1 VEKAT seat, non-voting", "bg-cream text-forest-800"],
  ];
  return (
    <div className="rounded-[24px] border border-line bg-paper p-6 sm:p-7">
      <h3 className="m-0 font-display text-[24px] font-bold text-forest-800">The Board of 9</h3>
      <ul className="m-0 mt-4 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3">
        {seats.map(([s, c]) => (
          <li key={s} className={`rounded-[12px] px-3 py-2.5 text-[14px] font-medium ${c}`}>
            {s}
          </li>
        ))}
      </ul>
      <p className="m-0 mt-4 text-[14.5px] text-body">
        3-year terms, one-third retiring each year. A separate Audit Committee of 3 non-Board members checks the books and
        reports straight to members.
      </p>
    </div>
  );
}

export function ChairCard() {
  return (
    <div className="flex flex-col gap-3 rounded-[24px] bg-cream p-6 sm:p-7">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-forest-800 font-display text-xl font-bold text-gold">
          VE
        </span>
        <div>
          <b className="block text-[18px] font-semibold text-forest-800">Victor Evbuomwan</b>
          <span className="text-[14.5px] text-body">Founding Chairman and Initiator</span>
        </div>
      </div>
      <p className="m-0 text-[14.5px] text-body">
        Chairs the founding Board until the first AGM, where members vote to confirm him or elect another Chairman. As he
        also leads VEKAT Group, he never votes on VEKAT’s appointment, fees or contract.
      </p>
      <Link href="/documents" className="self-start text-[14.5px] font-semibold">
        Read the draft bye-laws
      </Link>
    </div>
  );
}

export function GovernanceHome() {
  return (
    <section className="border-b border-line bg-paper">
      <div className={`${wrap} py-16 sm:py-20`}>
        <SectionHeading eyebrow="Governance" title="Members decide. The Board leads. The manager works." />
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <BoardCard />
          <ChairCard />
        </div>
        <MoreLink href="/governance">Governance in full</MoreLink>
      </div>
    </section>
  );
}

const HOME_FAQ = [
  "Is this an investment with guaranteed returns?",
  "Can I get my money back?",
  "Does more money give me more votes?",
  "What happens to my shares if I die?",
  "What if I stop paying?",
  "I am not in Edo or Abuja. Can I join?",
];

export function FaqHome() {
  const items = HOME_FAQ.map((q) => FAQS.find(([fq]) => fq === q)).filter(Boolean) as unknown as [string, string][];
  return (
    <section className="border-b border-line">
      <div className={`${wrap} py-16 sm:py-20`}>
        <SectionHeading title="Questions people ask" />
        <Reveal as="div" className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {items.map(([q, a]) => (
            <article key={q} className="rounded-[20px] border border-line bg-paper p-5">
              <h3 className="m-0 font-sans text-[16.5px] font-semibold text-forest-800">{q}</h3>
              <p className="m-0 mt-2 text-[14.5px] text-body">{a}</p>
            </article>
          ))}
        </Reveal>
        <MoreLink href="/faq">All questions</MoreLink>
      </div>
    </section>
  );
}
