import { MONEY_STEPS } from "@/lib/content";

function BridgeArt() {
  // Decorative: an arch linking diaspora cities to home, echoing the logo.
  return (
    <svg
      viewBox="0 0 1200 170"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[110px] w-full sm:h-[170px]"
    >
      <defs>
        <linearGradient id="arch" x1="0" x2="1">
          <stop offset="0" stopColor="#C9A227" stopOpacity=".15" />
          <stop offset=".5" stopColor="#C9A227" stopOpacity=".7" />
          <stop offset="1" stopColor="#C9A227" stopOpacity=".15" />
        </linearGradient>
      </defs>
      <path d="M-20 165 C 300 10, 900 10, 1220 165" fill="none" stroke="url(#arch)" strokeWidth="3" />
      <path
        d="M-20 165 C 300 10, 900 10, 1220 165"
        fill="none"
        stroke="#F7F0DA"
        strokeOpacity=".35"
        strokeWidth="2"
        strokeDasharray="2 14"
        strokeLinecap="round"
        className="motion-safe:animate-[dash_6s_linear_infinite]"
      />
      {[160, 330, 500, 700, 870, 1040].map((x) => (
        <line key={x} x1={x} x2={x} y1={x < 600 ? 160 - (x / 600) * 95 : 160 - ((1200 - x) / 600) * 95} y2="170" stroke="#C9A227" strokeOpacity=".18" strokeWidth="2" />
      ))}
      <style>{`@keyframes dash { to { stroke-dashoffset: -160; } }`}</style>
    </svg>
  );
}

export function Hero() {
  return (
    <section id="top" className="adire relative overflow-hidden bg-forest-800 text-cream">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full bg-gold/10 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-[clamp(16px,4vw,28px)] pt-16 pb-36 sm:pt-20 sm:pb-44 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="inline-flex flex-wrap items-center gap-2.5 self-start rounded-full bg-forest-900 px-3.5 py-2 text-[15px] font-semibold ring-1 ring-gold/30">
            <span className="text-gold">New</span>
            <span>First cohort: Edo State and Abuja FCT · open to Africans everywhere</span>
          </div>
          <h1 className="m-0 font-display text-[clamp(38px,6vw,68px)] leading-[1.02] font-extrabold tracking-[-0.02em]">
            Own real businesses at home — <span className="text-gold">from wherever you live.</span>
          </h1>
          <p className="m-0 max-w-[34em] text-xl text-[#E6E0C8]">
            HomeBridge is a cooperative. Africans abroad and people in Nigeria buy shares, own businesses together, and
            vote as equals.
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0" aria-label="What members do">
            {[
              ["Own", "shares in real businesses"],
              ["Vote", "one member, one vote"],
              ["See", "every naira, every month"],
            ].map(([word, hint]) => (
              <li
                key={word}
                title={hint}
                className="rounded-[10px] bg-gold px-[18px] py-2.5 text-lg font-bold text-forest-900 shadow-[0_4px_0_#8A6D10]"
              >
                {word}
                <span className="sr-only"> — {hint}</span>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex flex-wrap gap-3">
            <a
              href="#register"
              className="inline-flex min-h-14 items-center rounded-full bg-cream px-7 text-lg font-bold text-forest-800 no-underline transition hover:-translate-y-px hover:bg-white"
            >
              Register your interest
            </a>
            <a
              href="#events"
              className="inline-flex min-h-14 items-center rounded-full border-2 border-cream px-6 text-lg font-bold text-cream no-underline transition hover:-translate-y-px hover:bg-cream/10 hover:text-cream"
            >
              Online launch &amp; events
            </a>
          </div>
          <p className="m-0 text-[19px] text-gold italic">“Abroad and at home, we build together.”</p>
        </div>

        <div className="relative">
          <div aria-hidden="true" className="absolute -inset-3 rotate-2 rounded-[28px] bg-gold/25" />
          <div className="relative flex flex-col gap-[18px] rounded-[22px] bg-paper p-6 text-ink shadow-card sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 font-display text-[22px] font-bold text-forest-800">Where your money goes</h2>
              <span className="shrink-0 rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-forest-800">One way only</span>
            </div>
            <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
              {MONEY_STEPS.map((s, i) => (
                <li key={s.title} className="relative flex items-center gap-3.5 rounded-[14px] bg-cream px-4 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-800 font-bold text-cream">
                    {i + 1}
                  </span>
                  <span>
                    <b>{s.title}</b> {s.text}
                  </span>
                </li>
              ))}
            </ol>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              {[
                ["£10", "or ₦10,000 to join, once"],
                ["₦1,000", "per share, for everyone"],
                ["1", "member, one vote"],
              ].map(([big, small]) => (
                <div key={big} className="rounded-xl border border-line px-1.5 py-3">
                  <div className="font-display text-[clamp(18px,2.2vw,22px)] font-extrabold text-forest-800">{big}</div>
                  <div className="text-[13px] leading-snug text-muted sm:text-sm">{small}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <BridgeArt />
      <div className="absolute inset-x-0 bottom-3 mx-auto flex max-w-[1200px] justify-between px-[clamp(16px,4vw,28px)] text-[11px] font-bold tracking-[0.14em] text-gold/80 uppercase sm:text-xs">
        <span>London · Houston · Dubai</span>
        <span>Benin City · Abuja</span>
      </div>
    </section>
  );
}
