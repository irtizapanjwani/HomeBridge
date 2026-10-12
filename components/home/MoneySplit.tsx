"use client";

import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "./SectionHeading";

// Validated categorical palette (dataviz validator: all checks pass on #FFFDF6).
// Gold is < 3:1 against the surface, so every value is also shown as a text label.
const C = { green: "#2E7D50", gold: "#D9A93A", clay: "#B4532F", blue: "#2F7FB8" };

const SPLIT = [
  { key: "biz", pct: 75, color: C.green, label: "Into businesses", note: "Released in stages, as milestones are met" },
  { key: "res", pct: 15, color: C.gold, label: "Reserve", note: "Held back, not spent on projects" },
  { key: "run", pct: 10, color: C.clay, label: "Running costs", note: "Includes VEKAT’s published 2% fee" },
] as const;

const PROFIT = [
  { key: "share", pct: 40, color: C.green, label: "Shared with members", note: "Paid after the yearly audit" },
  { key: "grow", pct: 40, color: C.gold, label: "Kept to grow", note: "At least a quarter of all profit goes to the legal reserve fund" },
  { key: "train", pct: 10, color: C.clay, label: "Member training", note: "Training for members" },
  { key: "comm", pct: 10, color: C.blue, label: "Community work", note: "Community work" },
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
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label="Yearly profit: 40% shared with members, 40% kept to grow, 10% member training, 10% community work">
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

export function MoneySplit() {
  const [amount, setAmount] = useState(AMOUNTS[1]);
  const [activeSplit, setActiveSplit] = useState<string | null>(null);
  const [activeProfit, setActiveProfit] = useState<string | null>(null);

  return (
    <section className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,28px)] py-16" aria-labelledby="money-split">
      <SectionHeading
        id="money-split"
        eyebrow="Where the money goes"
        title="Follow your money"
        lead="Three-quarters of share money goes into businesses. Pick an amount and see where every naira lands."
      />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        {/* Share money split */}
        <Reveal className="rounded-[24px] border border-line bg-paper p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="m-0 font-display text-xl font-bold text-forest-800">If you put in</h3>
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
        Joining fees are kept separate from share money and used only for registration, identity checks and member
        services. Foreign currency is changed to naira only when a business needs it.
      </p>
    </section>
  );
}
