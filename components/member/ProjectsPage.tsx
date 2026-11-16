import Link from "next/link";
import { ProjectArt } from "@/components/home/ProjectArt";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { FIVE_CHECKS, PROJECTS } from "@/lib/content";
import { Card } from "./bits";
import { IdeasCard, type IdeaView } from "./Community";
import { GreenPanel, PageHeading, PortalPage } from "./PortalPage";

const SPLIT = [
  { pct: 75, label: "Into approved businesses", sub: "Released in stages, as each one hits its milestones", cls: "bg-gold" },
  { pct: 15, label: "Withdrawal reserve", sub: "Pays members who give notice to withdraw", cls: "bg-gold-soft" },
  { pct: 10, label: "Running costs", sub: "The most that can go on running the cooperative", cls: "bg-cream/70" },
];

/** The cooperative's projects for an admitted member: where the money goes, each project's checks, and ideas. */
export function ProjectsPage({ ideas }: { ideas: IdeaView[] }) {
  return (
    <PortalPage>
      <PageHeading
        eyebrow="Projects"
        title="Where your money goes"
        lead="The first businesses being shortlisted in Edo State and Abuja FCT. No money moves until a project passes all five checks, and you will get a report on each one every month."
        aside={
          <Link href="/app/meetings" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-forest-800 px-5 text-[15px] font-semibold text-forest-800 no-underline hover:bg-mist">
            Vote on projects <ArrowRightIcon size={16} />
          </Link>
        }
      />

      {/* How every 100 is used */}
      <GreenPanel className="mt-6">
        <p className="m-0 text-[12px] font-bold tracking-[0.14em] text-gold uppercase">Of every ₦100 or £100 you put in</p>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-forest-900/60" role="img" aria-label="75 into businesses, 15 to the withdrawal reserve, 10 to running costs">
          {SPLIT.map((s) => (
            <span key={s.label} className={s.cls} style={{ width: `${s.pct}%` }} />
          ))}
        </div>
        <dl className="m-0 mt-5 grid gap-5 sm:grid-cols-3">
          {SPLIT.map((s) => (
            <div key={s.label} className="flex gap-3">
              <span aria-hidden="true" className={`mt-2 h-3 w-3 shrink-0 rounded-full ${s.cls}`} />
              <div>
                <dt className="font-display text-[clamp(26px,3vw,34px)] leading-none font-bold text-cream">{s.pct}</dt>
                <dd className="m-0 mt-1.5 text-[15px] font-semibold text-cream">{s.label}</dd>
                <dd className="m-0 mt-0.5 text-[13.5px] text-on-dark">{s.sub}</dd>
              </div>
            </div>
          ))}
        </dl>
      </GreenPanel>

      {/* The projects */}
      <section aria-labelledby="proj-h" className="mt-10">
        <p className="eyebrow m-0">First cohort</p>
        <h2 id="proj-h" className="m-0 mt-1 text-[clamp(24px,3vw,32px)] text-forest-800">
          The businesses being shortlisted
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((p) => {
            const passed = 0; // the Board records the checks; none have passed yet
            return (
              <article key={p.title} className="group flex flex-col overflow-hidden rounded-[22px] border border-line bg-paper transition hover:-translate-y-0.5 hover:shadow-card">
                <div className="relative h-[170px] overflow-hidden bg-mist">
                  <ProjectArt kind={p.art} />
                  <span className="absolute top-3 left-3 rounded-full bg-paper/95 px-3 py-1 text-[12.5px] font-semibold text-forest-800 shadow-sm">Shortlisting</span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <span className="text-[13px] text-muted">{p.place}</span>
                  <h3 className="m-0 font-display text-[22px] font-bold text-forest-800">{p.title}</h3>
                  <p className="m-0 text-[15px] text-body">{p.text}</p>
                  <div className="mt-auto pt-3">
                    <div className="mb-1.5 flex justify-between text-[13px] font-semibold text-ink">
                      <span>Five checks</span>
                      <span>
                        {passed} of 5 passed
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1" aria-hidden="true">
                      {[0, 1, 2, 3, 4].map((n) => (
                        <span key={n} className={`h-1.5 rounded-full ${n < passed ? "bg-forest-800" : "bg-line"}`} />
                      ))}
                    </div>
                    <p className="m-0 mt-3 rounded-xl bg-page px-3 py-2 text-[13px] text-muted">Monthly reports start here once the project is approved.</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Both end level: the idea box grows to match the checks. */}
      <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <h2 className="m-0 font-sans text-[18px] font-semibold text-ink">Five checks before any money moves</h2>
          <p className="mt-1 mb-0 text-[14.5px] text-body">The Board signs off each one. Until all five pass, a project gets nothing.</p>
          <ol className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
            {FIVE_CHECKS.map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-forest-800">
                  <span className="text-[13px] font-bold">{i + 1}</span>
                </span>
                <p className="m-0 text-[15px] text-body">
                  <span className="font-semibold text-ink">{t}</span> — {d}
                </p>
              </li>
            ))}
          </ol>
        </Card>
        <div id="ideas" className="flex scroll-mt-6 flex-col [&>*]:flex-1">
          <IdeasCard ideas={ideas} />
        </div>
      </div>
    </PortalPage>
  );
}
