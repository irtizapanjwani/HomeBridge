import { FOUR_PARTS, PROJECTS } from "@/lib/content";
import { BankIcon, BuildingIcon, ChartIcon, GlobeIcon, LockIcon, PeopleIcon } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "./SectionHeading";

const [MEMBERS, COOP, VEKAT, CHAPTERS] = FOUR_PARTS;

/** Gold pipe with coins travelling along it — the only route money takes. */
function MoneyPipe({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-2 lg:py-0" aria-hidden="true">
      {/* vertical on phones, horizontal from lg */}
      <div className="relative flex h-16 w-1.5 items-center justify-center lg:h-1.5 lg:w-full">
        <div className="absolute inset-0 overflow-hidden rounded-full bg-gold/35">
          {[0, 1, 2].map((i) => (
            <span key={i} className="flow-dot" style={{ animationDelay: `${i * 0.6}s` }} />
          ))}
        </div>
        <svg viewBox="0 0 12 12" className="absolute -bottom-2 h-3 w-3 rotate-90 text-gold-dark lg:bottom-auto lg:-right-2 lg:rotate-0">
          <path d="M2 1l8 5-8 5z" fill="currentColor" />
        </svg>
        <span className="absolute left-5 rounded-full bg-gold px-2.5 py-0.5 text-xs font-extrabold tracking-wide whitespace-nowrap text-forest-900 uppercase lg:-top-9 lg:left-1/2 lg:-translate-x-1/2">
          {label}
        </span>
      </div>
    </div>
  );
}

/** Dashed tether from a support role up to the money path: work flows, money doesn't. */
function WorkTether({ label }: { label: string }) {
  return (
    <div className="hidden h-16 items-stretch justify-center lg:flex" aria-hidden="true">
      <div className="relative border-l-2 border-dashed border-line-strong">
        <span className="absolute top-1/2 left-3 flex -translate-y-1/2 items-center gap-1 text-xs font-bold whitespace-nowrap text-muted">
          <LockIcon size={13} /> {label}
        </span>
      </div>
    </div>
  );
}

function NoMoneyBadge({ label = "No access to money" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-clay/30 bg-[#F6DED8] px-2.5 py-0.5 text-xs font-bold text-clay">
      <LockIcon size={13} /> {label}
    </span>
  );
}

const num = "font-display text-sm font-extrabold tabular-nums";

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,28px)] py-16">
      <SectionHeading
        eyebrow="How it works"
        title="Four parts. Each has one job."
        lead="Share money moves one way: from members into the cooperative’s own bank accounts, then into the businesses. VEKAT and the chapters never hold it."
      />

      <Reveal className="grid grid-cols-1 lg:grid-cols-[1fr_96px_1.15fr_96px_1fr] lg:items-stretch">
        {/* 01 Members */}
        <article className="flex flex-col gap-3 rounded-[22px] border border-line bg-paper p-6 shadow-card">
          <div className="flex items-center justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-100 text-forest-800">
              <PeopleIcon size={26} />
            </span>
            <span className={`${num} text-gold-dark`}>01</span>
          </div>
          <h3 className="m-0 font-display text-xl font-bold text-forest-800">{MEMBERS.title}</h3>
          <p className="m-0 text-base text-muted">{MEMBERS.text}</p>
          <span className="mt-auto text-sm font-semibold text-forest-700">At home and abroad · one vote each</span>
        </article>

        <MoneyPipe label="Shares" />

        {/* 02 The cooperative — the hub */}
        <article className="adire relative flex flex-col gap-3 rounded-[22px] bg-forest-800 p-6 text-cream shadow-card ring-4 ring-gold/40">
          <div className="flex items-center justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-forest-900">
              <BankIcon size={26} />
            </span>
            <span className={`${num} text-gold`}>02</span>
          </div>
          <h3 className="m-0 font-display text-xl font-bold">{COOP.title}</h3>
          <p className="m-0 text-base text-on-dark">{COOP.text}</p>
          <span className="mt-auto inline-flex items-center gap-2 self-start rounded-lg bg-forest-900 px-3 py-1.5 text-sm font-bold text-gold">
            Your money sits only here
          </span>
        </article>

        <MoneyPipe label="In stages" />

        {/* Destination: the businesses */}
        <article className="flex flex-col gap-3 rounded-[22px] border-2 border-gold bg-butter p-6">
          <div className="flex items-center justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper text-gold-dark">
              <BuildingIcon size={26} />
            </span>
            <span className="text-xs font-extrabold tracking-[0.14em] text-gold-ink uppercase">Where it ends up</span>
          </div>
          <h3 className="m-0 font-display text-xl font-bold text-forest-800">Named businesses</h3>
          <p className="m-0 text-base text-[#5b4a12]">Paid as milestones are met. A local operator runs each one.</p>
          <ul className="m-0 mt-auto flex list-none flex-wrap gap-1.5 p-0">
            {PROJECTS.map((p) => (
              <li key={p.title} className="rounded-full bg-paper px-2.5 py-0.5 text-[13px] font-semibold text-forest-800">
                {p.title.split(" and ")[0]}
              </li>
            ))}
          </ul>
        </article>

        {/* Row 2: dashed tethers (desktop only) */}
        <WorkTether label="brings people in" />
        <div className="hidden lg:block" />
        <WorkTether label="runs the work" />
        <div className="hidden lg:block" />
        <div className="hidden lg:block" />

        {/* Phones: divider before the support roles */}
        <div className="my-8 flex items-center gap-3 lg:hidden">
          <span className="h-px flex-1 border-t-2 border-dashed border-line-strong" />
          <span className="text-xs font-extrabold tracking-[0.14em] text-muted uppercase">Behind the scenes</span>
          <span className="h-px flex-1 border-t-2 border-dashed border-line-strong" />
        </div>

        {/* 04 Chapters (under members) */}
        <article className="flex flex-col gap-3 rounded-[22px] border-2 border-dashed border-line-strong bg-paper/60 p-6">
          <div className="flex items-center justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream text-forest-700">
              <GlobeIcon size={26} />
            </span>
            <span className={`${num} text-line-strong`}>04</span>
          </div>
          <h3 className="m-0 font-display text-xl font-bold text-forest-800">{CHAPTERS.title}</h3>
          <p className="m-0 text-base text-muted">{CHAPTERS.text.replace(" No access to money.", "")}</p>
          <NoMoneyBadge />
        </article>

        <div className="h-4 lg:h-auto" />

        {/* 03 VEKAT (under the cooperative) */}
        <article className="flex flex-col gap-3 rounded-[22px] border-2 border-dashed border-line-strong bg-paper/60 p-6">
          <div className="flex items-center justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream text-forest-700">
              <ChartIcon size={26} />
            </span>
            <span className={`${num} text-line-strong`}>03</span>
          </div>
          <h3 className="m-0 font-display text-xl font-bold text-forest-800">{VEKAT.title}</h3>
          <p className="m-0 text-base text-muted">{VEKAT.text.replace(" Never holds share money.", "")}</p>
          <NoMoneyBadge label="Never holds share money" />
        </article>

        <div className="hidden lg:block" />

        {/* Key */}
        <div className="mt-6 flex flex-col justify-center gap-3 rounded-[22px] p-2 text-sm text-muted lg:mt-0 lg:p-6">
          <span className="flex items-center gap-3">
            <span className="h-1.5 w-10 rounded-full bg-gold" /> Share money — one way only
          </span>
          <span className="flex items-center gap-3">
            <span className="w-10 border-t-2 border-dashed border-line-strong" /> Work only — never money
          </span>
          <span className="flex items-center gap-3">
            <LockIcon size={16} className="ml-3 mr-3 text-clay" /> Two signatures on every payment
          </span>
        </div>
      </Reveal>
    </section>
  );
}
