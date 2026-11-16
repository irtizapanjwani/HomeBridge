import Link from "next/link";
import { CheckIcon, PeopleIcon } from "@/components/ui/Icons";
import { Card } from "./bits";
import { type MotionView, VotesCard } from "./Community";
import { MeetingCard, type MeetingView } from "./Meeting";
import { GreenPanel, PageHeading, PortalPage } from "./PortalPage";

const RULES = [
  { t: "21 days' notice", d: "Every member is told about a general meeting at least 21 days before it." },
  { t: "One member, one vote", d: "However many shares you hold, your vote counts the same as everyone else's." },
  { t: "Can't come? Give your proxy", d: "Name another member to vote for you. One member can hold up to 5 proxies." },
  { t: "Results for everyone", d: "When a vote closes, the totals for, against and abstaining appear here." },
];

/** Meetings and votes for an admitted member: the next AGM, its agenda and reply, and every motion. */
export function MeetingsPage({ meeting, motions }: { meeting: MeetingView | null; motions: MotionView[] }) {
  const open = motions.filter((m) => m.status === "open");
  const answer = meeting?.answer;

  return (
    <PortalPage>
      <PageHeading
        eyebrow="Meetings"
        title="Meetings and votes"
        lead="The next general meeting, what is on the agenda, and every vote you can take part in. Your say shapes how HomeBridge is run."
      />

      <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-[1fr_1.15fr]">
        <GreenPanel className="flex flex-col">
          {meeting ? (
            <>
              <p className="m-0 text-[12px] font-bold tracking-[0.14em] text-gold uppercase">Next general meeting</p>
              <p className="m-0 mt-3 font-display leading-none font-bold text-cream">
                <span className="text-[clamp(56px,8vw,88px)]">{Math.max(0, meeting.daysLeft)}</span>
                <span className="ml-2 text-[clamp(20px,2.4vw,26px)] text-gold">{meeting.daysLeft === 1 ? "day to go" : "days to go"}</span>
              </p>
              <p className="m-0 mt-4 text-[17px] font-semibold text-cream">{meeting.when}</p>
              <p className="m-0 mt-1 text-[15px] text-on-dark">{meeting.place}</p>
              <dl className="m-0 mt-6 grid grid-cols-2 gap-3">
                {[
                  { k: "On the agenda", v: `${meeting.agenda.length} ${meeting.agenda.length === 1 ? "item" : "items"}` },
                  { k: "Open votes", v: open.length ? `${open.length} waiting` : "None just now" },
                ].map((f) => (
                  <div key={f.k} className="rounded-[14px] bg-forest-900/40 px-4 py-3 ring-1 ring-cream/10">
                    <dt className="text-[12.5px] text-on-dark">{f.k}</dt>
                    <dd className="m-0 mt-0.5 text-[17px] font-semibold text-cream">{f.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto pt-6">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${
                    answer === "yes" ? "bg-gold text-forest-900" : answer === "no" ? "bg-cream/15 text-cream" : "bg-gold/15 text-gold ring-1 ring-gold/40"
                  }`}
                >
                  {answer === "yes" ? (
                    <>
                      <CheckIcon size={15} strokeWidth={3} /> You said you will attend
                    </>
                  ) : answer === "no" ? (
                    "You said you can't attend"
                  ) : (
                    "Please tell us if you can come"
                  )}
                </span>
              </div>
            </>
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/40">
                <PeopleIcon size={22} />
              </span>
              <h2 className="m-0 mt-4 text-[clamp(24px,3vw,30px)] text-cream">No meeting called yet</h2>
              <p className="m-0 mt-2 text-[15.5px] leading-relaxed text-on-dark">
                When the Board calls the next general meeting, its date, place and agenda appear here, and we email you at least 21 days before.
              </p>
            </>
          )}
        </GreenPanel>
        {meeting ? <MeetingCard meeting={meeting} popup={false} /> : <RulesCard />}
      </div>

      <section aria-labelledby="votes-h" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow m-0">Votes</p>
            <h2 id="votes-h" className="m-0 mt-1 text-[clamp(24px,3vw,32px)] text-forest-800">
              {open.length ? `${open.length} open ${open.length === 1 ? "vote" : "votes"} waiting for you` : "Your votes"}
            </h2>
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          {motions.length ? (
            <VotesCard motions={motions} />
          ) : (
            <Card>
              <h3 className="m-0 font-sans text-[18px] font-semibold text-ink">Nothing to vote on right now</h3>
              <p className="mt-1 mb-0 text-[15px] text-body">When the Board puts a motion to members, it appears here and on your dashboard, and we let you know by email.</p>
            </Card>
          )}
          {meeting ? <RulesStrip /> : <IdeasNudge />}
        </div>
      </section>
    </PortalPage>
  );
}

function RulesCard() {
  return (
    <Card className="flex flex-col">
      <h2 className="m-0 font-sans text-[18px] font-semibold text-ink">How meetings work</h2>
      <ol className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
        {RULES.map((r, i) => (
          <li key={r.t} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-800 text-[13px] font-bold text-gold">{i + 1}</span>
            <div>
              <p className="m-0 text-[15px] font-semibold text-ink">{r.t}</p>
              <p className="m-0 mt-0.5 text-[14px] text-body">{r.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/documents" className="mt-auto pt-4 text-[14.5px] font-semibold">
        Read the bye-laws
      </Link>
    </Card>
  );
}

/** The same four points as RulesCard, laid out across the page under the votes. */
function RulesStrip() {
  return (
    <section aria-labelledby="rules-h" className="rounded-[22px] border border-line bg-paper p-[clamp(18px,3vw,28px)]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="rules-h" className="m-0 font-sans text-[18px] font-semibold text-ink">
          How meetings work
        </h2>
        <Link href="/documents" className="text-[14.5px] font-semibold">
          Read the bye-laws
        </Link>
      </div>
      <ol className="m-0 mt-4 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {RULES.map((r, i) => (
          <li key={r.t} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-800 text-[13px] font-bold text-gold">{i + 1}</span>
            <div>
              <p className="m-0 text-[15px] font-semibold text-ink">{r.t}</p>
              <p className="m-0 mt-0.5 text-[14px] text-body">{r.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function IdeasNudge() {
  return (
    <Card className="!border-butter !bg-butter/60">
      <h3 className="m-0 font-sans text-[17px] font-semibold text-ink">Something you want the Board to discuss?</h3>
      <p className="mt-1 mb-0 text-[14.5px] text-body">Send it as an idea. Every idea is read, and the best ones go on the next agenda.</p>
      <Link href="/app/projects#ideas" className="mt-3 inline-flex min-h-10 items-center text-[14.5px] font-semibold">
        Share an idea
      </Link>
    </Card>
  );
}
