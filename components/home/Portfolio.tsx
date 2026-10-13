import { PORTFOLIO_NOT } from "@/lib/content";
import { ChartIcon, XIcon } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";
import { PortfolioTiles } from "./HomeSections";

const CLAUSES = [
  ["Who decides", "Members approve a written Investment Policy at a general meeting: the aims, the kinds of investment allowed, the limits and the level of risk. The Board decides individual investments within it. Anything outside the policy needs a general meeting."],
  ["Advice first", "No investment is bought or sold without prior written advice from an independent adviser, fund manager or stockbroker registered with the SEC. The adviser must not be connected with any Board member or VEKAT unless members approve."],
  ["What it can hold", "Shares listed on the Nigerian Exchange or another recognised exchange, Federal Government bonds and treasury bills, and SEC-registered unit trusts or mutual funds."],
  ["Safekeeping", "Held in the Society’s own name through a CSCS account and an SEC-registered stockbroker or custodian — never in the name of a person, Board member or the manager."],
  ["Reporting", "Value and holdings reported to members every quarter on the dashboard, reviewed by the Audit Committee, and shown in the audited accounts."],
  ["Income", "Dividends, interest and gains are part of the Society’s net surplus and shared like any other profit."],
];

/** Bye-law 13A in plain words (the /portfolio page). */
export function PortfolioDetail() {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.5fr]">
        <Reveal className="flex flex-col gap-4 rounded-[24px] bg-forest-800 p-6 text-cream sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-forest-900">
            <ChartIcon size={26} />
          </span>
          <h2 className="m-0 text-[26px]">Held for the long term</h2>
          <p className="m-0 text-[#E6E0C8]">
            Normally for at least 3 years. The aim is steady long-term growth and income for members, not quick profit.
          </p>
          <div>
            <p className="m-0 mb-2 text-[12px] font-semibold tracking-[0.14em] text-gold uppercase">Never allowed</p>
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {PORTFOLIO_NOT.map((n) => (
                <li key={n} className="inline-flex items-center gap-1 rounded-full bg-forest-900 px-2.5 py-1 text-[13px] font-medium">
                  <XIcon size={12} className="text-[#F0A08A]" /> {n}
                </li>
              ))}
            </ul>
          </div>
          <p className="m-0 mt-auto border-t border-cream/15 pt-4 text-[14px] text-[#E6E0C8]">
            No Board member, officer, manager or adviser may earn commission or any personal benefit from portfolio
            dealings.
          </p>
        </Reveal>
        <PortfolioTiles />
      </div>

      <h2 className="mt-14 mb-5 text-[clamp(26px,3vw,34px)] text-forest-800">Clause 13A in plain words</h2>
      <dl className="m-0 grid gap-3.5 md:grid-cols-2">
        {CLAUSES.map(([t, d]) => (
          <div key={t} className="rounded-[20px] border border-line bg-paper p-5">
            <dt className="font-semibold text-forest-800">{t}</dt>
            <dd className="m-0 mt-1.5 text-[15px] text-body">{d}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 mb-0 max-w-[60em] text-[14.5px] text-muted">
        The limits shown are proposals in the draft bye-laws, for members to decide. The value of investments can go down
        as well as up, and no return is guaranteed. The portfolio starts only after members approve the investment policy.
      </p>
    </>
  );
}
