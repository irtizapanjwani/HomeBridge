import { PORTFOLIO_NOT, PORTFOLIO_RULES } from "@/lib/content";
import { ChartIcon, XIcon } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "./SectionHeading";

export function Portfolio() {
  return (
    <section id="portfolio" className="border-y border-line bg-paper">
      <div className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,28px)] py-16">
        <SectionHeading
          eyebrow="New · Long-term portfolio"
          title="Steady growth, on expert advice. Never quick bets."
          lead="Alongside our own businesses, members may agree to hold a spread of quoted company shares, Federal Government bonds and treasury bills, and SEC-registered funds. Members approve the investment policy at a general meeting; the Board works within it."
        />

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.5fr]">
          <Reveal className="flex flex-col gap-4 rounded-[24px] bg-forest-800 p-6 text-cream shadow-card sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-forest-900">
              <ChartIcon size={26} />
            </span>
            <h3 className="m-0 font-display text-2xl font-bold">Held for the long term</h3>
            <p className="m-0 text-on-dark">
              Normally for at least 3 years. Dividends, interest and gains are shared with members like any other profit.
            </p>
            <div>
              <p className="m-0 mb-2 text-xs font-extrabold tracking-[0.14em] text-gold uppercase">Never allowed</p>
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {PORTFOLIO_NOT.map((n) => (
                  <li key={n} className="inline-flex items-center gap-1 rounded-full bg-forest-900 px-2.5 py-1 text-[13px] font-semibold">
                    <XIcon size={12} className="text-[#F0A08A]" /> {n}
                  </li>
                ))}
              </ul>
            </div>
            <p className="m-0 mt-auto border-t border-cream/15 pt-4 text-sm text-on-dark">
              No Board member, officer, manager or adviser may earn commission or any personal benefit from portfolio
              dealings.
            </p>
          </Reveal>

          <Reveal delay={100} as="div" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PORTFOLIO_RULES.map((r) => (
              <article key={r.big} className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-cream p-5">
                <span className="font-display text-[26px] leading-tight font-extrabold text-forest-800">{r.big}</span>
                {r.title && <span className="font-semibold text-ink">{r.title}</span>}
                <span className="text-[15px] text-muted">{r.text}</span>
              </article>
            ))}
          </Reveal>
        </div>

        <p className="mt-5 mb-0 max-w-[60em] text-[15px] text-muted">
          The limits shown are proposals in the draft bye-laws, for members to decide. The value of investments can go
          down as well as up, and no return is guaranteed.
        </p>
      </div>
    </section>
  );
}
