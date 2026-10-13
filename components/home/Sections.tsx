import Link from "next/link";
import { FIVE_CHECKS, GOVERNANCE, JOIN_STEPS, PROJECTS, SIMPLE_RULES, TARGETS, WHAT_YOU_GET } from "@/lib/content";
import { CountUp, Reveal } from "@/components/ui/Reveal";
import { ProjectArt } from "./ProjectArt";
import { SectionHeading } from "./SectionHeading";
import { ShareCalculator } from "./ShareCalculator";

const wrap = "mx-auto max-w-[1200px] px-[clamp(16px,4vw,28px)]";

/** "How membership works": the explainer the share calculator sits behind (bye-law 4.2). */
export function MembershipExplainer() {
  return (
    <section id="how-membership-works" className="border-b border-line bg-paper">
      <div className={`${wrap} py-16 sm:py-20`}>
        <SectionHeading
          eyebrow="How membership works"
          title="From application to your first share"
          lead="You become a member when your joining fee is paid, you have bought at least one share, and your name is on the register of members."
        />
        <ol className="m-0 grid list-none gap-3.5 p-0 sm:grid-cols-2 lg:grid-cols-5">
          {JOIN_STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2 rounded-[20px] bg-mist p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-800 text-sm font-semibold text-cream">{i + 1}</span>
              <b className="font-semibold text-forest-800">{s.title}</b>
              <span className="text-[14px] text-body">{s.text}</span>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-2">
          <ShareCalculator />
          <div className="flex flex-col gap-4">
            <h3 className="m-0 font-display text-[24px] font-bold text-forest-800">Simple rules</h3>
            <ul className="m-0 flex list-disc flex-col gap-2 pl-[22px] text-[15.5px] marker:text-gold-dark">
              {SIMPLE_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <h3 className="m-0 mt-2 font-display text-[24px] font-bold text-forest-800">What you get</h3>
            <ul className="m-0 flex list-disc flex-col gap-2 pl-[22px] text-[15.5px] marker:text-gold-dark">
              {WHAT_YOU_GET.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="m-0 rounded-[14px] border-l-4 border-gold bg-cream px-4 py-3.5 text-[15px]">
              <b className="font-semibold">What you do not get:</b> a guaranteed return. Profits depend on how the businesses
              perform.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProjectCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {PROJECTS.map((p, i) => (
        <Reveal
          as="article"
          key={p.title}
          delay={i * 80}
          className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-paper"
        >
          <div className="h-[170px] overflow-hidden bg-mist">
            <ProjectArt kind={p.art} />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-5">
            <span className="text-[13px] text-muted">{p.place} · Shortlisting</span>
            <h3 className="m-0 font-display text-[22px] font-bold text-forest-800">{p.title}</h3>
            <p className="m-0 text-[15px] text-body">{p.text}</p>
            <div className="mt-auto pt-3">
              <div className="mb-1.5 flex justify-between text-[13px] font-semibold text-ink">
                <span>Five checks</span>
                <span>0 of 5 passed</span>
              </div>
              <div className="grid grid-cols-5 gap-1" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((n) => (
                  <span key={n} className="h-1.5 rounded-full bg-line" />
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function FiveChecks() {
  return (
    <div>
      <h3 className="m-0 mb-4 font-display text-[24px] font-bold text-forest-800">Five checks before any money moves</h3>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {FIVE_CHECKS.map(([t, d], i) => (
          <li key={t} className="flex gap-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-gold text-sm font-semibold text-gold-dark">
              {i + 1}
            </span>
            <span className="text-[15.5px]">
              <b className="font-semibold text-ink">{t}</b> — {d}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3.5 mb-0 text-[14.5px] text-muted">Projects over ₦50m also need a members’ vote at a general meeting.</p>
    </div>
  );
}

export function Targets() {
  return (
    <div className="rounded-[24px] bg-forest-800 p-6 text-cream sm:p-7">
      <h3 className="m-0 mb-5 font-display text-[22px] font-bold">First 18 months: our targets</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
        {TARGETS.map((t) => (
          <div key={t.label}>
            <CountUp value={t.value} className="block text-[28px] font-bold text-gold" />
            <div className="text-[14.5px] text-[#E6E0C8]">{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GovernanceTable() {
  return (
    <>
      {/* Table on larger screens */}
      <div className="hidden overflow-hidden rounded-[20px] border border-line bg-paper md:block">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr className="bg-forest-800 text-left text-cream">
              <th scope="col" className="px-4 py-3.5 font-semibold">Who</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">Made up of</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">Job</th>
            </tr>
          </thead>
          <tbody>
            {GOVERNANCE.map((g) => (
              <tr key={g.who} className="border-t border-line align-top even:bg-page">
                <th scope="row" className="px-4 py-3.5 text-left font-semibold text-forest-800">{g.who}</th>
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
          <div key={g.who} className="rounded-[16px] border border-line bg-paper p-4">
            <dt className="mb-2 font-semibold text-forest-800">{g.who}</dt>
            <dd className="m-0 text-[15px]"><span className="font-medium text-muted">Made up of: </span>{g.made}</dd>
            <dd className="m-0 mt-1 text-[15px]"><span className="font-medium text-muted">Job: </span>{g.job}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export function SectionWrap({ id, tone = "page", children }: { id?: string; tone?: "page" | "paper" | "cream"; children: React.ReactNode }) {
  const bg = tone === "paper" ? "bg-paper" : tone === "cream" ? "bg-cream" : "";
  return (
    <section id={id} className={`border-b border-line ${bg}`}>
      <div className={`${wrap} py-16 sm:py-20`}>{children}</div>
    </section>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold">
      {children}
    </Link>
  );
}
