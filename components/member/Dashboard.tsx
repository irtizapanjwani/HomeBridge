"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { CheckIcon } from "@/components/ui/Icons";
import { CONTACT, PROJECTS } from "@/lib/content";
import {
  MEMBER,
  SAMPLE_AS_OF,
  contributionStatus,
  formatByCurrency,
  formatDate,
  formatMoney,
  formatNaira,
  monthsOnTrack,
  paidInYear,
  parseDate,
  totals,
  withdrawalEligibility,
} from "@/lib/member-data";
import { Card, SamplePill, btnPrimary, btnSecondary, textLink } from "./bits";
import { Statement } from "./Statement";
import { ProxyDialog } from "./ProxyDialog";

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Dashboard() {
  const toast = useToast();
  // Worked out after mount so the server and browser render the same first frame.
  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => setGreeting(greetingFor(new Date().getHours())), []);

  const all = totals();
  const year = parseDate(SAMPLE_AS_OF).y;
  const thisYear = paidInYear(year);
  const track = monthsOnTrack();
  const status = contributionStatus();
  const withdraw = withdrawalEligibility();
  const withdrawReason = `You can give notice from ${withdraw.label} — shares must be held 3 years.`;

  return (
    <div className="mx-auto max-w-[1240px] px-[clamp(16px,4vw,28px)] pt-[clamp(24px,4vw,40px)] print:max-w-none print:p-0">
      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 print:hidden">
        <div className="min-w-0">
          <p className="m-0 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[14px] text-muted">
            <span>Member {MEMBER.number}</span>
            <span aria-hidden="true">·</span>
            <span>{MEMBER.typeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{MEMBER.chapter}</span>
            <span aria-hidden="true">·</span>
            <SamplePill />
          </p>
          <h1 className="m-0 mt-2 text-[clamp(30px,4.4vw,44px)] leading-[1.1] text-forest-800">
            {greeting}, {MEMBER.name}
          </h1>
        </div>
        <Link href="/app/pay" className={`${btnPrimary} min-h-12 px-7 text-[16px]`}>
          Buy shares
        </Link>
      </div>

      {/* Bye-law 9.3: a gentle note after 12 months without a share payment */}
      {status.state !== "active" && (
        <div role="status" className="mt-6 rounded-[18px] border border-gold/60 bg-butter px-5 py-4 text-[15px] text-ink print:hidden">
          <strong className="font-semibold">
            {status.state === "dormant" ? "Your membership is dormant for now." : "We haven’t received a share payment for a while."}
          </strong>{" "}
          Your last one was on {formatDate(status.lastDate)}.{" "}
          {status.state === "dormant"
            ? "Voting is paused until contributions resume — any payment brings it straight back (bye-law 9.3)."
            : "After 15 months without one, a membership can be treated as dormant, with no vote until payments resume (bye-law 9.3)."}{" "}
          <Link href="/app/pay" className="font-semibold">
            Buy shares
          </Link>
        </div>
      )}

      {/* Tiles */}
      <ul className="m-0 mt-7 grid list-none grid-cols-1 gap-4 p-0 min-[480px]:grid-cols-2 lg:grid-cols-4 print:hidden">
        <li className="rounded-[22px] bg-forest-800 p-6 text-cream">
          <p className="m-0 text-[15px] text-on-dark">Shares held</p>
          <p className="m-0 mt-1 font-sans text-[44px] leading-none font-bold text-gold tabular-nums">{all.shares}</p>
          <p className="m-0 mt-2 text-[14.5px] text-on-dark">Paid value {formatNaira(all.naira)}</p>
        </li>
        <li className="rounded-[22px] border border-line bg-paper p-6">
          <p className="m-0 text-[15px] text-muted">Paid this year</p>
          <p className="m-0 mt-1 text-[38px] leading-tight font-bold text-forest-800">{formatByCurrency(thisYear.byCurrency)}</p>
          <p className="m-0 mt-1 text-[14px]">
            {track.met} of {track.due} {track.due === 1 ? "month" : "months"} on track (min {formatMoney(track.min.currency, track.min.amount, false)})
          </p>
        </li>
        <li className="rounded-[22px] border border-line bg-paper p-6">
          <p className="m-0 text-[15px] text-muted">Your vote</p>
          <p className="m-0 mt-1 text-[38px] leading-tight font-bold text-forest-800">{status.state === "dormant" ? "Paused" : "Active"}</p>
          <p className="m-0 mt-1 text-[14.5px]">One member, one vote</p>
        </li>
        <li className="rounded-[22px] border border-line bg-paper p-6">
          <p className="m-0 text-[15px] text-muted">Can withdraw from</p>
          <p className="m-0 mt-1 text-[38px] leading-tight font-bold text-forest-800">{withdraw.label}</p>
          <p className="m-0 mt-1 text-[14px]">3 years after first share · 6 months&rsquo; notice</p>
        </li>
      </ul>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] print:mt-0 print:block">
        {/* Main column */}
        <div className="grid min-w-0 content-start gap-6">
          <Statement />

          <Card id="projects" className="scroll-mt-6 print:hidden">
            <h2 className="m-0 text-[clamp(22px,2.4vw,26px)] text-forest-800">Projects you own a share of</h2>
            <p className="m-0 mt-1.5 text-[15px] text-muted">
              Every member owns a share of every project the Society approves. Each one must pass five checks first.
            </p>
            <ul className="m-0 mt-5 grid list-none gap-3 p-0">
              {PROJECTS.map((p) => (
                <li key={p.title} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl bg-cream/70 px-4 py-3.5">
                  <span className="min-w-0">
                    <strong className="font-semibold text-ink">{p.title}</strong>
                    <span className="text-body"> · {p.place}</span>
                  </span>
                  <span className="text-[14px] text-muted">Shortlisting · 0 of 5 checks</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`${textLink} mt-3`}
              onClick={() => toast("The first monthly report is published after the first project is approved.")}
            >
              Read this month&rsquo;s report
            </button>
          </Card>
        </div>

        {/* Side column */}
        <div className="grid min-w-0 content-start gap-6 print:hidden">
          <section id="meetings" aria-labelledby="meet-h" className="scroll-mt-6 rounded-[22px] bg-cream p-[clamp(18px,3vw,24px)]">
            <p className="eyebrow">Next meeting</p>
            <h2 id="meet-h" className="m-0 mt-2 text-[22px] text-forest-800">
              First Annual General Meeting
            </h2>
            <p className="m-0 mt-1.5 text-[15px] text-body">Date to be announced · online and in person · 21 days&rsquo; notice</p>
            <p className="m-0 mt-3 text-[14.5px]">
              Confirm the Chairman, elect the Board and Audit Committee, approve the investment policy.
            </p>
            <p className="m-0 mt-3 rounded-xl bg-paper/70 px-3.5 py-2.5 text-[14px] text-body">
              We&rsquo;ll send the date at least 21 days ahead. You can add it to your calendar then.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ProxyDialog />
            </div>
          </section>

          <Card as="section" aria-labelledby="port-h" className="p-6!">
            <h2 id="port-h" className="eyebrow">
              Investment portfolio
            </h2>
            <p className="m-0 mt-3 text-[15px]">
              Starts once members approve the investment policy at a general meeting. Holdings and value will show here every quarter.
            </p>
          </Card>

          <Card as="section" id="profile" aria-labelledby="det-h" className="scroll-mt-6 p-6!">
            <h2 id="det-h" className="eyebrow">
              Your details
            </h2>
            <dl className="m-0 mt-3 grid gap-2.5 text-[15px]">
              <div className="flex justify-between gap-4">
                <dt>Identity check</dt>
                <dd className="m-0 inline-flex items-center gap-1.5 font-semibold text-forest-800">
                  <CheckIcon size={16} />
                  {MEMBER.identityCheck}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Membership route</dt>
                <dd className="m-0 text-right font-semibold text-forest-800">{MEMBER.route}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Nominees</dt>
                <dd className="m-0 font-semibold text-forest-800">
                  {MEMBER.nominees.length} · {MEMBER.nominees.reduce((s, n) => s + n.share, 0)}%
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Withdrawal</dt>
                <dd className="m-0 text-right font-semibold text-forest-800">
                  {withdraw.eligible ? "You can give notice" : `Eligible from ${withdraw.label}`}
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-line pt-4">
              <button type="button" disabled={!withdraw.eligible} aria-describedby="withdraw-why" className={`${btnSecondary} w-full`}>
                Request withdrawal
              </button>
              <p id="withdraw-why" className="m-0 mt-2 text-[13.5px] text-muted">
                {withdraw.eligible
                  ? "Withdrawal needs 6 months’ written notice and is paid at the last audited value (bye-law 12)."
                  : withdrawReason}
              </p>
            </div>
            <ul className="m-0 mt-3 list-none p-0">
              <li>
                <button
                  type="button"
                  className={textLink}
                  onClick={() => toast("Changing details and nominees opens with member accounts (preview).")}
                >
                  Update details or nominees
                </button>
              </li>
              <li>
                <a
                  className="inline-flex min-h-11 items-center text-[14.5px]"
                  href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(`Data request — member ${MEMBER.number}`)}`}
                >
                  Data protection: see, correct or download your data
                </a>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
