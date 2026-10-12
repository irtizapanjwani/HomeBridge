import { WE_ARE, WE_ARE_NOT } from "@/lib/content";
import { Reveal } from "@/components/ui/Reveal";

/** Hand-drawn pen stroke that scribbles through a line of text once it scrolls into view. */
function Strike({ delay, variant }: { delay: number; variant: number }) {
  const paths = [
    "M1 7 C 18 4, 30 9, 50 6 S 82 4, 99 7",
    "M1 6 C 20 8, 36 3, 55 7 S 84 8, 99 5",
    "M1 8 C 14 5, 34 8, 52 5 S 80 9, 99 6",
    "M1 5 C 22 7, 40 4, 58 7 S 86 5, 99 8",
  ];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      className="pointer-events-none absolute top-1/2 -right-1.5 -left-1.5 h-4 w-[calc(100%+12px)] -translate-y-1/2 overflow-visible"
    >
      <path
        d={paths[variant % paths.length]}
        pathLength={1}
        fill="none"
        stroke="#B23A26"
        strokeWidth={2.6}
        strokeLinecap="round"
        className="strike-path"
        style={{ transitionDelay: `${delay}ms` }}
      />
    </svg>
  );
}

export function WhoWeAre() {
  return (
    <section className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,28px)] pt-16 pb-6" aria-labelledby="who-title">
      <p className="eyebrow">Before you read on</p>
      <h2
        id="who-title"
        className="mt-2.5 mb-8 font-display text-[clamp(28px,3.6vw,40px)] font-extrabold tracking-[-0.015em] text-forest-800"
      >
        Let’s be clear about what this is.
      </h2>

      <Reveal className="ticket relative grid overflow-hidden rounded-[28px] border border-line shadow-card md:grid-cols-[1fr_1.05fr]">
        {/* Left stub: what HomeBridge is */}
        <div className="adire relative bg-forest-800 p-7 text-cream sm:p-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded-full bg-gold px-3 py-1 text-xs font-extrabold tracking-[0.14em] text-forest-900 uppercase">
              We are
            </span>
            <span className="h-px flex-1 bg-gold/30" />
          </div>
          <ol className="m-0 flex list-none flex-col gap-5 p-0">
            {WE_ARE.map((t, i) => (
              <li key={t} className="flex items-baseline gap-4">
                <span className="w-7 shrink-0 font-display text-sm font-extrabold text-gold tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-[clamp(19px,2vw,23px)] leading-snug font-semibold">{t}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Perforated tear line with ticket notches */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-10 hidden w-0 -translate-x-[1px] md:block" style={{ left: "48.78%" }}>
          <span className="absolute -top-4 -left-4 h-8 w-8 rounded-full border border-line bg-cream" />
          <span className="absolute inset-y-6 left-0 border-l-2 border-dashed border-line-strong/70" />
          <span className="absolute -bottom-4 -left-4 h-8 w-8 rounded-full border border-line bg-cream" />
        </div>
        <div aria-hidden="true" className="h-0 border-t-2 border-dashed border-line-strong/70 md:hidden" />

        {/* Right side: what it is not, crossed out */}
        <div className="relative bg-paper p-7 pb-28 sm:p-10 sm:pb-28 md:pl-12 lg:pb-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded-full border-2 border-clay px-3 py-0.5 text-xs font-extrabold tracking-[0.14em] text-clay uppercase">
              We are not
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <ul className="m-0 flex list-none flex-col gap-5 p-0">
            {WE_ARE_NOT.map((t, i) => (
              <li key={t} className="flex items-baseline gap-4">
                <span className="w-7 shrink-0 font-display text-sm font-extrabold text-line-strong tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="relative inline-block font-display text-[clamp(19px,2vw,23px)] leading-snug font-semibold text-muted">
                  {t}
                  <Strike delay={350 + i * 220} variant={i} />
                </span>
              </li>
            ))}
          </ul>

          <div
            aria-hidden="true"
            className="stamp pointer-events-none absolute right-5 bottom-5 rotate-[-11deg] rounded-lg border-[3px] border-double border-[#B23A26] px-3 py-1.5 text-center font-display leading-tight font-extrabold tracking-[0.12em] text-[#B23A26] uppercase opacity-85 mix-blend-multiply sm:right-8 sm:bottom-7"
          >
            <span className="block text-[11px]">Not a</span>
            <span className="block text-base">Savings scheme</span>
          </div>
          <p className="sr-only">HomeBridge is not a savings scheme.</p>
        </div>
      </Reveal>

      <p className="mt-5 mb-0 max-w-[46em] text-[15px] text-muted">
        Your money buys <b className="text-forest-800">shares in real businesses</b>. Profit is shared after the yearly
        audit, when there is profit — nothing is guaranteed.
      </p>
    </section>
  );
}
