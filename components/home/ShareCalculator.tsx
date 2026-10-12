"use client";

import { useState } from "react";

const HOME_AMOUNTS = [5000, 10000, 20000, 50000];
const DIASPORA_AMOUNTS = [25, 50, 100, 250];
const SHARE_PRICE_NGN = 1000;
const EXAMPLE_RATE = 2000; // ₦ per £1, illustration only

const fmt = (n: number) => n.toLocaleString("en-GB");

export function ShareCalculator() {
  const [mode, setMode] = useState<"home" | "diaspora">("home");
  const [idx, setIdx] = useState(0);
  const [custom, setCustom] = useState("");

  const isHome = mode === "home";
  const list = isHome ? HOME_AMOUNTS : DIASPORA_AMOUNTS;
  const symbol = isHome ? "₦" : "£";
  const customValue = parseFloat(custom.replace(/,/g, ""));
  const amount = custom && customValue > 0 ? customValue : list[idx];
  const perMonth = Math.floor((isHome ? amount : amount * EXAMPLE_RATE) / SHARE_PRICE_NGN);
  const leftover = isHome ? amount - perMonth * SHARE_PRICE_NGN : 0;

  return (
    <div className="adire flex flex-col gap-4 rounded-[20px] bg-forest-800 p-6 text-cream sm:p-7">
      <h3 className="m-0 font-display text-2xl font-bold">Share calculator</h3>
      <div role="group" aria-label="Where you live" className="flex flex-wrap gap-1.5 self-start rounded-full bg-forest-900 p-1.5">
        {(
          [
            ["home", "I live in Nigeria"],
            ["diaspora", "I live abroad"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              setIdx(0);
              setCustom("");
            }}
            className={`min-h-11 rounded-full px-[18px] text-base font-bold transition ${
              mode === id ? "bg-gold text-forest-900" : "bg-transparent text-cream hover:bg-forest-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="text-base">I want to put in each month:</div>
      <div className="flex flex-wrap gap-2">
        {list.map((v, i) => {
          const active = !custom && i === idx;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setIdx(i);
                setCustom("");
              }}
              className={`min-h-11 rounded-[10px] border-2 px-4 text-base font-bold transition ${
                active ? "border-gold bg-gold text-forest-900" : "border-forest-600 bg-transparent text-cream hover:border-gold"
              }`}
            >
              {symbol}
              {fmt(v)}
            </button>
          );
        })}
        <label className="flex min-h-11 items-center gap-1 rounded-[10px] border-2 border-forest-600 px-3 focus-within:border-gold">
          <span className="font-bold text-gold" aria-hidden="true">
            {symbol}
          </span>
          <span className="sr-only">Other amount in {isHome ? "naira" : "pounds"}</span>
          <input
            inputMode="decimal"
            placeholder="Other"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^\d.,]/g, ""))}
            className="w-20 bg-transparent font-bold text-cream placeholder:text-on-dark/70 focus:outline-none"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3" aria-live="polite">
        <div className="rounded-[14px] bg-forest-900 p-4">
          <div className="text-sm opacity-85">Shares a month</div>
          <div className="font-display text-[32px] font-extrabold text-gold">{fmt(perMonth)}</div>
        </div>
        <div className="rounded-[14px] bg-forest-900 p-4">
          <div className="text-sm opacity-85">Shares in a year</div>
          <div className="font-display text-[32px] font-extrabold text-gold">{fmt(perMonth * 12)}</div>
        </div>
      </div>
      <p className="m-0 text-sm text-on-dark">
        {isHome
          ? `Each share costs ₦1,000.${leftover > 0 ? ` Shares are whole, so ₦${fmt(leftover)} of this would not buy a share.` : ""}`
          : `Example at ₦${fmt(EXAMPLE_RATE)} to £1. Your payment is converted at the rate on the day, so everyone pays the same ₦1,000 per share.`}{" "}
        You still get one vote, however many shares you hold. Shares can be cashed in after 3 years with 6 months’
        notice.
      </p>
    </div>
  );
}
