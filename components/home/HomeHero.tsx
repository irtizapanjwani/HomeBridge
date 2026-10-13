import Link from "next/link";

const STEPS = [
  { title: "Register and verify", text: "BVN or NIN at home · Non-Resident BVN or passport abroad, plus a selfie." },
  { title: "Pay the one-off joining fee", text: "£10 abroad or ₦10,000 at home — by card or transfer, once you are approved." },
  { title: "Buy shares at your own pace", text: "₦1,000 a share for everyone. From ₦5,000 or £25 a month." },
];

export function HomeHero() {
  return (
    <section id="top" className="border-b border-line bg-cream">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-[clamp(16px,4vw,28px)] pt-10 pb-12 sm:pt-16 sm:pb-16 lg:grid-cols-[1.35fr_1fr] lg:gap-14 lg:pt-20 lg:pb-20">
        <div className="flex flex-col gap-5">
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-paper px-3.5 py-1.5 text-[12.5px] font-semibold text-forest-800 sm:text-[13px]">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-gold" />
            First cohort: Edo State and Abuja FCT · open to Africans everywhere
          </span>
          <h1 className="m-0 text-[clamp(38px,6vw,64px)] leading-[1.06] text-forest-800">
            Own real businesses at home — from wherever you live.
          </h1>
          <p className="m-0 max-w-[34em] text-[clamp(16.5px,1.6vw,19px)] text-body">
            HomeBridge is a member-owned cooperative. Africans abroad and people across Nigeria join as equals, pool share
            capital, and own productive businesses together — one member, one vote.
          </p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/register"
              className="inline-flex min-h-13 items-center justify-center rounded-full bg-forest-800 px-6 font-semibold text-cream no-underline transition hover:-translate-y-px hover:bg-forest-900 hover:text-cream"
            >
              Start your registration
            </Link>
            <Link
              href="/join#eligibility"
              className="inline-flex min-h-13 items-center justify-center rounded-full border border-forest-800 px-6 font-semibold text-forest-800 no-underline transition hover:-translate-y-px hover:bg-paper"
            >
              Check if you can join
            </Link>
          </div>
          <p className="m-0 font-display text-[17px] text-muted italic">Abroad and at home, we build together.</p>
        </div>

        {/* Phones: compact price card (redesign mobile screen) */}
        <dl className="m-0 rounded-[20px] border border-line bg-paper px-5 py-1 sm:hidden">
          {[
            ["Join", "once, after approval", "£10 · ₦10,000"],
            ["Shares", "monthly, from", "£25 · ₦5,000"],
          ].map(([t, s, v], i) => (
            <div key={t} className={`flex items-center justify-between gap-3 py-4 ${i ? "border-t border-line" : ""}`}>
              <dt>
                <b className="block font-semibold text-forest-800">{t}</b>
                <span className="text-sm text-muted">{s}</span>
              </dt>
              <dd className="m-0 text-lg font-bold whitespace-nowrap text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Tablet and up: three steps card */}
        <div className="hidden rounded-[24px] border border-line bg-paper p-6 sm:block sm:p-7">
          <p className="eyebrow">Joining takes three steps</p>
          <ol className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3.5 rounded-[16px] bg-mist px-4 py-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-800 text-sm font-semibold text-cream">
                  {i + 1}
                </span>
                <span>
                  <b className="block font-semibold text-forest-800">{s.title}</b>
                  <span className="text-[14.5px] text-body">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-[13px]">
            <div>
              <b className="block font-semibold text-forest-800">Abroad</b>
              <span className="text-muted">UK · Europe · Americas · Gulf · Africa</span>
            </div>
            <div className="text-right">
              <b className="block font-semibold text-forest-800">At home</b>
              <span className="text-muted">Edo · Abuja FCT · all states next</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PromiseStrip() {
  return (
    <section className="bg-forest-800 text-cream" aria-label="What members do">
      <ul className="mx-auto m-0 grid max-w-[1200px] list-none gap-7 px-[clamp(16px,4vw,28px)] py-11 sm:grid-cols-3 sm:gap-8">
        {[
          ["Own", "Shares in real businesses — food processing, health services, property, solar."],
          ["Vote", "One member, one vote, however many shares you hold. Online or in person."],
          ["See", "Every naira in and out, every project, every month on your dashboard."],
        ].map(([w, t]) => (
          <li key={w}>
            <h2 className="m-0 text-[30px] text-gold">{w}</h2>
            <p className="m-0 mt-2 text-[15.5px] text-[#E6E0C8]">{t}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
