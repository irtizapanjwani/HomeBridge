"use client";

import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "./SectionHeading";

// Validated categorical palette (dataviz validator: all checks pass on #FFFDF6).
// Gold is < 3:1 against the surface, so every value is also shown as a text label.
const C = { green: "#2E7D50", gold: "#D9A93A", clay: "#B4532F", blue: "#2F7FB8" };

const SPLIT = [
  { key: "biz", pct: 75, color: C.green, label: "Into businesses", note: "Released in stages, as milestones are met" },
  { key: "res", pct: 15, color: C.gold, label: "Reserve", note: "For withdrawals and emergencies" },
  { key: "run", pct: 10, color: C.clay, label: "Running costs", note: "Audit, members’ dashboard and the manager’s published fee" },
] as const;

const PROFIT = [
  { key: "share", pct: 40, color: C.green, label: "Shared with members", note: "As a dividend on shares, after the yearly audit and AGM approval" },
  { key: "grow", pct: 40, color: C.gold, label: "Kept to grow", note: "At least a quarter of all profit goes to the legal reserve fund; the rest funds new businesses" },
  { key: "train", pct: 10, color: C.clay, label: "Education and training", note: "Enterprise, cooperation and financial literacy" },
  { key: "comm", pct: 10, color: C.blue, label: "Community development", note: "Given to registered charities as members decide" },
] as const;

const AMOUNTS = [5000, 20000, 100000, 1000000];
const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-GB");
const short = (n: number) => (n >= 1_000_000 ? `₦${n / 1_000_000}m` : `₦${(n / 1000).toLocaleString("en-GB")}k`);

function Waffle({ active, setActive }: { active: string | null; setActive: (k: string | null) => void }) {
  // 100 cells, one per percent, filled column-major so each share reads as a block.
  const cells: { key: string; color: string }[] = [];
  SPLIT.forEach((s) => {
    for (let i = 0; i < s.pct; i++) cells.push({ key: s.key, color: s.color });
  });
  return (
    <div
      className="grid aspect-square w-full max-w-[300px] grid-flow-col grid-cols-10 grid-rows-10 gap-[3px]"
      role="img"
      aria-label="Of every 100 naira: 75 into businesses, 15 to the reserve, 10 to running costs"
      onMouseLeave={() => setActive(null)}
    >
      {cells.map((c, i) => (
        <span
          key={i}
          onMouseEnter={() => setActive(c.key)}
          className="waffle-cell rounded-[4px]"
          style={
            {
              background: c.color,
              opacity: active && active !== c.key ? 0.18 : 1,
              "--d": `${i * 8}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Donut({ active, setActive }: { active: string | null; setActive: (k: string | null) => void }) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const gap = 3; // surface gap between segments
  let offset = 0;
  const focus = PROFIT.find((p) => p.key === active);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label="Yearly profit: 40% shared with members, 40% kept to grow, 10% education and training, 10% community development">
        {PROFIT.map((p) => {
          const len = (p.pct / 100) * circ;
          const seg = (
            <circle
              key={p.key}
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth={active === p.key ? 26 : 22}
              strokeDasharray={`${len - gap} ${circ - len + gap}`}
              strokeDashoffset={-offset}
              onMouseEnter={() => setActive(p.key)}
              onMouseLeave={() => setActive(null)}
              className="donut-seg cursor-pointer transition-[stroke-width,opacity] duration-200"
              style={{ opacity: active && active !== p.key ? 0.25 : 1 }}
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
        <span className="font-display text-[40px] leading-none font-extrabold text-forest-800">{focus ? `${focus.pct}%` : "100%"}</span>
        <span className="mt-1 text-sm leading-tight font-semibold text-muted">{focus ? focus.label : "of yearly profit, after the audit"}</span>
      </div>
    </div>
  );
}

const PAYEES = [
  {
    key: "fee",
    when: "Once · after approval",
    title: "Joining fee",
    amount: "£10 or ₦10,000",
    to: "Paid to VEKAT Group Ltd",
    text: "The cooperative’s appointed manager, which runs registration and identity checks. Not a share, not refundable.",
    ways: ["Card · Apple Pay · Google Pay (Stripe)", "First Bank transfer (naira)"],
    tone: "border-clay/40 bg-[#FBEDE7]",
    chip: "bg-clay text-cream",
  },
  {
    key: "shares",
    when: "Monthly · whenever you like",
    title: "Shares",
    amount: "₦1,000 per share",
    to: "Paid to HomeBridge Cooperative Society Ltd",
    text: "Only into the cooperative’s own bank accounts. Every outgoing payment needs two signatures.",
    ways: ["UBA naira account", "US dollar domiciliary", "Pound sterling domiciliary"],
    tone: "border-forest-800/30 bg-forest-100",
    chip: "bg-forest-800 text-cream",
  },
] as const;

function TwoPayments() {
  return (
    <Reveal className="mb-6 grid gap-4 md:grid-cols-2">
      {PAYEES.map((p, i) => (
        <article key={p.key} className={`flex flex-col gap-2 rounded-[22px] border-2 p-5 sm:p-6 ${p.tone}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold tracking-[0.12em] uppercase ${p.chip}`}>
              Payment {i + 1} · {p.title}
            </span>
            <span className="text-sm font-semibold text-muted">{p.when}</span>
          </div>
          <div className="font-display text-[clamp(24px,2.6vw,30px)] leading-tight font-extrabold text-forest-800">{p.amount}</div>
          <div className="font-bold text-ink">{p.to}</div>
          <p className="m-0 text-[15px] text-muted">{p.text}</p>
          <ul className="m-0 mt-auto flex list-none flex-wrap gap-1.5 p-0 pt-1">
            {p.ways.map((w) => (
              <li key={w} className="rounded-full bg-paper px-2.5 py-0.5 text-[13px] font-semibold text-forest-800">
                {w}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </Reveal>
  );
}

export function MoneySplit() {
  const [amount, setAmount] = useState(AMOUNTS[1]);
  const [activeSplit, setActiveSplit] = useState<string | null>(null);
  const [activeProfit, setActiveProfit] = useState<string | null>(null);

  return (
    <section id="your-money" className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,28px)] py-16" aria-labelledby="money-split">
      <SectionHeading
        id="money-split"
        eyebrow="Where the money goes"
        title="Follow your money"
        lead="Two payments, two places, never a person. Your member number is always your payment reference."
      />

      <TwoPayments />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        {/* Share money split */}
        <Reveal className="rounded-[24px] border border-line bg-paper p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="m-0 font-display text-xl font-bold text-forest-800">If you buy shares worth</h3>
            <div role="group" aria-label="Amount" className="flex flex-wrap gap-1.5 rounded-full bg-cream p-1">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={amount === a}
                  onClick={() => setAmount(a)}
                  className={`min-h-10 rounded-full px-3.5 text-sm font-bold transition ${
                    amount === a ? "bg-forest-800 text-cream" : "text-forest-800 hover:bg-paper"
                  }`}
                >
                  {short(a)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid items-center gap-7 sm:grid-cols-[minmax(0,300px)_1fr]">
            <Waffle active={activeSplit} setActive={setActiveSplit} />
            <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-live="polite">
              {SPLIT.map((s) => (
                <li
                  key={s.key}
                  onMouseEnter={() => setActiveSplit(s.key)}
                  onMouseLeave={() => setActiveSplit(null)}
                  className={`rounded-2xl border p-3.5 transition ${activeSplit === s.key ? "border-forest-800 bg-cream" : "border-line"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-[4px]" style={{ background: s.color }} aria-hidden="true" />
                    <span className="font-semibold text-ink">{s.label}</span>
                    <span className="ml-auto text-sm font-bold text-muted tabular-nums">{s.pct}%</span>
                  </div>
                  <div className="mt-1 pl-6 font-display text-[26px] leading-tight font-extrabold text-forest-800 tabular-nums">
                    {naira((amount * s.pct) / 100)}
                  </div>
                  <div className="pl-6 text-[13px] text-muted">{s.note}</div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-5 mb-0 text-[13px] text-muted">Each square is 1% of share money.</p>
        </Reveal>

        {/* Profit split */}
        <Reveal delay={120} className="adire flex flex-col rounded-[24px] bg-forest-800 p-6 text-cream shadow-card sm:p-8">
          <h3 className="m-0 font-display text-xl font-bold">And when the businesses make a profit</h3>
          <p className="m-0 mt-1 text-sm text-on-dark">Tap or hover a slice to see where it goes.</p>
          <div className="mt-5 rounded-[20px] bg-paper p-5">
            <Donut active={activeProfit} setActive={setActiveProfit} />
          </div>
          <ul className="m-0 mt-5 grid list-none gap-2 p-0 sm:grid-cols-2">
            {PROFIT.map((p) => (
              <li
                key={p.key}
                onMouseEnter={() => setActiveProfit(p.key)}
                onMouseLeave={() => setActiveProfit(null)}
                className={`rounded-xl px-3 py-2.5 transition ${activeProfit === p.key ? "bg-forest-900" : "bg-forest-900/40"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-[3px] ring-2 ring-cream/30" style={{ background: p.color }} aria-hidden="true" />
                  <b className="text-sm">{p.pct}%</b>
                  <span className="text-sm">{p.label}</span>
                </div>
                <div className="mt-0.5 pl-5 text-[12px] leading-snug text-on-dark">{p.note}</div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      <p className="mt-5 mb-0 max-w-[60em] text-[15px] text-muted">
        Within agreed limits, part of the money for businesses may instead go into the{" "}
        <a href="#portfolio" className="font-semibold">long-term portfolio</a>. Foreign currency is converted to naira at
        the bank rate on the day it is received.
      </p>
    </section>
  );
}
