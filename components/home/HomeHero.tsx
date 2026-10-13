import Link from "next/link";

const STEPS = [
  {
    title: "Register and verify",
    text: "BVN or NIN at home · Non-Resident BVN or passport abroad, plus a selfie.",
  },
  {
    title: "Pay the one-off joining fee",
    text: "£10 abroad or ₦10,000 at home — by card or transfer, once you are approved.",
  },
  {
    title: "Buy shares at your own pace",
    text: "₦1,000 a share for everyone. From ₦5,000 or £25 a month.",
  },
];

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
      <path
        d="M-20 165 C 300 10, 900 10, 1220 165"
        fill="none"
        stroke="url(#arch)"
        strokeWidth="3"
      />
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
        <line
          key={x}
          x1={x}
          x2={x}
          y1={x < 600 ? 160 - (x / 600) * 95 : 160 - ((1200 - x) / 600) * 95}
          y2="170"
          stroke="#C9A227"
          strokeOpacity=".18"
          strokeWidth="2"
        />
      ))}
      <style>{`@keyframes dash { to { stroke-dashoffset: -160; } }`}</style>
    </svg>
  );
}

/** Phones: the client's mobile screen — light hero, short promise, price card. */
function MobileHero() {
  return (
    <section className="border-b border-line bg-cream sm:hidden">
      <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
        <span className="self-start rounded-full bg-paper px-3 py-1.5 text-[12.5px] font-semibold text-forest-800">
          Edo · Abuja · open to Africans everywhere
        </span>
        <h1 className="m-0 text-[38px] leading-[1.06] text-forest-800">
          Own real businesses at home — from wherever you live.
        </h1>
        <p className="m-0 text-[16px] text-body">
          Join as an equal. ₦1,000 a share. One member, one vote.
        </p>
        <div className="mt-1 flex flex-col gap-3">
          <Link
            href="/register"
            className="inline-flex min-h-13 items-center justify-center rounded-full bg-forest-800 px-6 font-semibold text-cream no-underline hover:bg-forest-900 hover:text-cream"
          >
            Start your registration
          </Link>
          <Link
            href="/join#eligibility"
            className="inline-flex min-h-13 items-center justify-center rounded-full border border-forest-800 px-6 font-semibold text-forest-800 no-underline"
          >
            Check if you can join
          </Link>
        </div>
        <dl className="m-0 mt-2 rounded-[20px] bg-paper px-5 py-1">
          {[
            ["Join", "once, after approval", "£10 · ₦10,000"],
            ["Shares", "monthly, from", "£25 · ₦5,000"],
          ].map(([t, sub, v], i) => (
            <div
              key={t}
              className={`flex items-center justify-between gap-3 py-4 ${i ? "border-t border-line" : ""}`}
            >
              <dt>
                <b className="block font-semibold text-forest-800">{t}</b>
                <span className="text-sm text-body">{sub}</span>
              </dt>
              <dd className="m-0 text-lg font-bold whitespace-nowrap text-ink">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function HomeHero() {
  return (
    <>
      <MobileHero />
      <section
        id="top"
        className="adire relative hidden overflow-hidden bg-forest-800 text-cream sm:block"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full bg-gold/10 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-[clamp(16px,4vw,28px)] pt-12 pb-36 sm:pt-20 sm:pb-44 lg:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-6">
            <span className="inline-flex flex-wrap items-center gap-2.5 self-start rounded-full bg-forest-900 px-3.5 py-2 text-[13.5px] font-medium ring-1 ring-gold/30">
              <span className="font-semibold text-gold">First cohort</span>
              <span>Edo State and Abuja FCT · open to Africans everywhere</span>
            </span>
            <h1 className="m-0 text-[clamp(38px,6vw,66px)] leading-[1.04]">
              Own real businesses at home —{" "}
              <span className="text-gold">from wherever you live.</span>
            </h1>
            <p className="m-0 max-w-[34em] text-[clamp(16.5px,1.6vw,19px)] text-[#E6E0C8]">
              HomeBridge is a member-owned cooperative. Africans abroad and
              people across Nigeria join as equals, pool share capital, and own
              productive businesses together — one member, one vote.
            </p>
            <ul
              className="m-0 flex list-none flex-wrap gap-2.5 p-0"
              aria-label="What members do"
            >
              {[
                ["Own", "shares in real businesses"],
                ["Vote", "one member, one vote"],
                ["See", "every naira, every month"],
              ].map(([word, hint]) => (
                <li
                  key={word}
                  title={hint}
                  className="rounded-[10px] bg-gold px-[18px] py-2.5 text-lg font-semibold text-forest-900 shadow-[0_4px_0_#8A6D10]"
                >
                  {word}
                  <span className="sr-only"> — {hint}</span>
                </li>
              ))}
            </ul>
            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/register"
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-cream px-7 text-[17px] font-semibold text-forest-800 no-underline transition hover:-translate-y-px hover:bg-white"
              >
                Start your registration
              </Link>
              <Link
                href="/join#eligibility"
                className="inline-flex min-h-14 items-center justify-center rounded-full border-2 border-cream px-6 text-[17px] font-semibold text-cream no-underline transition hover:-translate-y-px hover:bg-cream/10 hover:text-cream"
              >
                Check if you can join
              </Link>
            </div>
            <p className="m-0 font-display text-[19px] text-gold italic">
              “Abroad and at home, we build together.”
            </p>
          </div>

          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-3 rotate-2 rounded-[28px] bg-gold/25"
            />
            <div className="relative flex flex-col gap-[18px] rounded-[22px] bg-paper p-6 text-ink shadow-card sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="m-0 text-[22px] text-forest-800">
                  Joining takes three steps
                </h2>
                <span className="shrink-0 rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-forest-800">
                  About 10 min
                </span>
              </div>
              <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
                {STEPS.map((s, i) => (
                  <li
                    key={s.title}
                    className="flex items-start gap-3.5 rounded-[14px] bg-cream px-4 py-3.5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-800 font-semibold text-cream">
                      {i + 1}
                    </span>
                    <span>
                      <b className="block font-semibold text-forest-800">
                        {s.title}
                      </b>
                      <span className="text-[14.5px] text-body">{s.text}</span>
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
                  <div
                    key={big}
                    className="rounded-xl border border-line px-1.5 py-3"
                  >
                    <div className="text-[clamp(18px,2.2vw,22px)] font-bold text-forest-800">
                      {big}
                    </div>
                    <div className="text-[12.5px] leading-snug text-muted sm:text-[13px]">
                      {small}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <BridgeArt />
        <div className="absolute inset-x-0 bottom-3 mx-auto flex max-w-[1200px] justify-between px-[clamp(16px,4vw,28px)] text-[11px] font-semibold tracking-[0.14em] text-gold/80 uppercase sm:text-xs">
          <span>London · Houston · Dubai</span>
          <span>Benin City · Abuja</span>
        </div>
      </section>
    </>
  );
}
