import {
  FIVE_CHECKS,
  GOVERNANCE,
  LEADERS,
  MEMBER_TYPES,
  PROFIT_SPLIT,
  PROJECTS,
  SAFEGUARDS,
  SIMPLE_RULES,
  TARGETS,
  WHAT_YOU_GET,
} from "@/lib/content";
import { PeopleIcon } from "@/components/ui/Icons";
import { CountUp, Reveal } from "@/components/ui/Reveal";
import { ProjectArt } from "./ProjectArt";
import { SectionHeading } from "./SectionHeading";
import { ShareCalculator } from "./ShareCalculator";

const wrap = "mx-auto max-w-[1200px] px-[clamp(16px,4vw,28px)]";
const card = "rounded-[18px] border border-line bg-paper";

export function JoinSection() {
  return (
    <section id="join" className="border-y border-line bg-paper">
      <div className={`${wrap} py-16`}>
        <SectionHeading
          eyebrow="Who can join and what it costs"
          title="Same share price. Same vote. Anywhere."
          lead="Anyone aged 18 or over can join. Pay a one-off joining fee, then buy shares at ₦1,000 each, at your own pace."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {MEMBER_TYPES.map((m, i) => (
            <Reveal
              key={m.name}
              delay={i * 60}
              className={`relative flex flex-col gap-2 rounded-2xl bg-cream p-5 ${
                m.featured ? "border-2 border-gold shadow-[0_8px_24px_rgb(201_162_39/0.18)]" : "border border-line"
              }`}
            >
              {m.featured && (
                <span className="absolute -top-3 left-5 rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold tracking-wide text-forest-900 uppercase">
                  First 12 months
                </span>
              )}
              <h3 className="m-0 text-xl font-bold text-forest-800">{m.name}</h3>
              <p className="m-0 text-[15px] text-muted">{m.who}</p>
              <p className="m-0 mt-auto pt-2 text-base">
                <b>{m.price[0]}</b>
                {m.price[1]}
                <br />
                {m.extra[0]}
                <b>{m.extra[1]}</b>
                {m.extra[2]}
              </p>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          <ShareCalculator />
          <div className="flex flex-col gap-3.5">
            <h3 className="m-0 font-display text-2xl font-bold text-forest-800">Simple rules</h3>
            <ul className="m-0 flex flex-col gap-2 pl-[22px] marker:text-gold-dark">
              {SIMPLE_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <h3 className="m-0 mt-2 font-display text-2xl font-bold text-forest-800">What you get</h3>
            <ul className="m-0 flex flex-col gap-2 pl-[22px] marker:text-gold-dark">
              {WHAT_YOU_GET.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="m-0 rounded-xl border-l-4 border-gold bg-butter px-4 py-3.5 text-base">
              <b>What you do not get:</b> a guaranteed return. Profits depend on how the businesses perform.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function MoneySplit() {
  const segments = [
    { w: 75, cls: "bg-forest-800 text-cream justify-start pl-4", label: "75% businesses", short: "75%" },
    { w: 15, cls: "bg-gold text-forest-900 justify-center", label: "15%", short: "15%" },
    { w: 10, cls: "bg-[#8FA89A] text-forest-900 justify-center", label: "10%", short: "10%" },
  ];
  return (
    <section className={`${wrap} py-16`} aria-labelledby="money-split">
      <SectionHeading id="money-split" eyebrow="Where the money goes" title="Three-quarters goes into businesses" />
      <div
        role="img"
        aria-label="75% into businesses, 15% reserve, 10% running costs"
        className="flex h-14 overflow-hidden rounded-[14px] text-base font-bold shadow-[inset_0_0_0_1px_rgb(0_0_0/0.04)]"
      >
        {segments.map((s) => (
          <div key={s.w} className={`flex items-center ${s.cls}`} style={{ width: `${s.w}%` }}>
            <span className="hidden sm:inline">{s.label}</span>
            <span className="sm:hidden">{s.short}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-muted">
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-forest-800" /> <b className="text-forest-800">75%</b> into businesses, in stages</span>
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-gold" /> <b className="text-gold-dark">15%</b> reserve</span>
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-[#8FA89A]" /> <b className="text-ink">10%</b> running costs (includes VEKAT’s published 2% fee)</span>
      </div>

      <h3 className="mt-10 mb-4 font-display text-2xl font-bold text-forest-800">And when the businesses make a profit</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROFIT_SPLIT.map((p, i) => (
          <Reveal key={i} delay={i * 60} className={`${card} rounded-2xl p-5`}>
            <div className="font-display text-[32px] font-extrabold text-forest-800">{p.pct}</div>
            <div className="text-base">{p.text}</div>
          </Reveal>
        ))}
      </div>
      <p className="mt-[18px] mb-0 text-[15px] text-muted">
        Joining fees are kept separate from share money and used only for registration, identity checks and member
        services. Foreign currency is changed to naira only when a business needs it.
      </p>
    </section>
  );
}

export function Projects() {
  return (
    <section id="projects" className="border-y border-line bg-paper">
      <div className={`${wrap} py-16`}>
        <SectionHeading
          eyebrow="First cohort projects"
          title="Real businesses you can visit"
          lead="We start in Edo State and Abuja FCT at the same time. Projects are being shortlisted now and must pass five checks before any money moves."
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((p, i) => (
            <Reveal
              as="article"
              key={p.title}
              delay={i * 80}
              className="group flex flex-col overflow-hidden rounded-[18px] border border-line bg-cream transition hover:-translate-y-1 hover:shadow-card"
            >
              <div className="h-[180px] overflow-hidden">
                <ProjectArt kind={p.art} />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <div className="flex flex-wrap gap-2 text-[13px] font-bold">
                  <span className="rounded-full bg-forest-800 px-2.5 py-0.5 text-cream">{p.place}</span>
                  <span className="rounded-full bg-butter px-2.5 py-0.5 text-gold-ink">Stage: shortlisting</span>
                </div>
                <h3 className="m-0 text-[21px] font-bold text-forest-800">{p.title}</h3>
                <p className="m-0 text-base text-muted">{p.text}</p>
                <div className="mt-auto pt-3">
                  <div className="mb-1.5 flex justify-between text-[13px] font-semibold text-muted">
                    <span>Five checks</span>
                    <span>0 of 5 passed</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((n) => (
                      <span key={n} className="h-1.5 rounded-full bg-sand" />
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
          <div>
            <h3 className="m-0 mb-4 font-display text-2xl font-bold text-forest-800">Five checks before any money moves</h3>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {FIVE_CHECKS.map(([t, d], i) => (
                <li key={t} className="flex gap-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-gold font-display font-extrabold text-gold-dark">
                    {i + 1}
                  </span>
                  <span>
                    <b>{t}</b> — {d}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3.5 mb-0 text-[15px] text-muted">Projects over ₦50m also need a members’ vote.</p>
          </div>
          <div className="adire rounded-[20px] bg-forest-800 p-6 text-cream sm:p-7">
            <h3 className="m-0 mb-4 font-display text-[22px] font-bold">First 18 months: our targets</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
              {TARGETS.map((t) => (
                <div key={t.label}>
                  <CountUp value={t.value} className="block font-display text-[28px] font-extrabold text-gold" />
                  <div className="text-[15px]">{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Trust() {
  return (
    <section id="trust" className={`${wrap} py-16`}>
      <SectionHeading
        eyebrow="How your money is protected"
        title="No single person can move money"
        lead="And members can see every project, every month."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SAFEGUARDS.map((s, i) => (
          <Reveal key={s.title} delay={(i % 3) * 60} className="flex gap-3.5 rounded-2xl border border-line bg-paper p-5">
            <span className="font-display text-[28px] leading-none font-extrabold text-gold">{i + 1}</span>
            <div>
              <b className="text-forest-800">{s.title}</b>
              <div className="text-base text-muted">{s.text}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <h3 className="mt-10 mb-4 font-display text-2xl font-bold text-forest-800">Who decides what</h3>
      {/* Table on larger screens */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-paper md:block">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="bg-forest-800 text-left text-cream">
              <th scope="col" className="px-4 py-3.5">Who</th>
              <th scope="col" className="px-4 py-3.5">Made up of</th>
              <th scope="col" className="px-4 py-3.5">Job</th>
            </tr>
          </thead>
          <tbody>
            {GOVERNANCE.map((g) => (
              <tr key={g.who} className="border-t border-line align-top even:bg-cream/50">
                <th scope="row" className="px-4 py-3.5 text-left font-bold text-forest-800">{g.who}</th>
                <td className="px-4 py-3.5">{g.made}</td>
                <td className="px-4 py-3.5">{g.job}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Stacked cards on phones */}
      <dl className="m-0 flex flex-col gap-3 md:hidden">
        {GOVERNANCE.map((g) => (
          <div key={g.who} className="rounded-2xl border border-line bg-paper p-4">
            <dt className="mb-2 font-bold text-forest-800">{g.who}</dt>
            <dd className="m-0 text-base"><span className="font-semibold text-muted">Made up of: </span>{g.made}</dd>
            <dd className="m-0 mt-1 text-base"><span className="font-semibold text-muted">Job: </span>{g.job}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function Leadership() {
  return (
    <section className="border-y border-line bg-paper" aria-labelledby="leaders">
      <div className={`${wrap} py-16`}>
        <SectionHeading id="leaders" eyebrow="Leadership" title="Who leads HomeBridge" />
        <div className="grid gap-5 md:grid-cols-3">
          {LEADERS.map((l, i) => (
            <Reveal key={l.name} delay={i * 80} className="flex flex-col gap-2.5 rounded-[18px] border border-line bg-cream p-6">
              {l.kind === "person" && (
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-forest-700 to-forest-900 font-display text-2xl font-extrabold text-gold ring-4 ring-gold/30">
                  {l.initials}
                </div>
              )}
              {l.kind === "org" && (
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-forest-800 text-lg font-extrabold text-gold">
                  {l.initials}
                </div>
              )}
              {l.kind === "members" && (
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gold text-forest-900">
                  <PeopleIcon size={36} />
                </div>
              )}
              <h3 className="m-0 text-[21px] font-bold text-forest-800">{l.name}</h3>
              <p className="m-0 text-[15px] font-bold text-gold-ink">{l.role}</p>
              <p className="m-0 text-base text-muted">{l.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
