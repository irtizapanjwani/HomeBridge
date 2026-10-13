"use client";

import { useState } from "react";
import { ROUTE_OPTIONS } from "@/lib/content";
import { CheckIcon } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";

type Route = (typeof ROUTE_OPTIONS)[number]["value"];

const RESULT: Record<Route, { tone: string; title: string; text: string; cta: string }> = {
  lives: {
    tone: "bg-forest-800 text-cream",
    title: "You can join.",
    text: "You meet the residence test. Register your interest and we will invite you as soon as membership opens.",
    cta: "Register your interest",
  },
  land: {
    tone: "bg-forest-800 text-cream",
    title: "You can join, through your family’s land or home.",
    text: "Wherever you live. We will ask where the land or home is and whose name it is in.",
    cta: "Register your interest",
  },
  other: {
    tone: "bg-butter text-ink",
    title: "Probably — the Director of Cooperatives decides.",
    text: "Tell us about your link when you register. We send it for the Director’s written approval.",
    cta: "Register and explain your link",
  },
  none: {
    tone: "bg-cream text-ink ring-1 ring-line",
    title: "Not yet — but join the free Supporter list.",
    text: "We will open more states and countries. Supporters are told first, and pay nothing.",
    cta: "Join the Supporter list",
  },
};

export function EligibilityCheck() {
  const [route, setRoute] = useState<Route | null>(null);
  const r = route ? RESULT[route] : null;

  return (
    <Reveal className="mt-10 grid gap-6 rounded-[24px] border border-line bg-cream p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr]">
      <div id="eligibility">
        <p className="eyebrow">Can I join today?</p>
        <h3 className="mt-2 mb-3 font-display text-[clamp(24px,2.8vw,32px)] leading-tight font-extrabold text-forest-800">
          Wherever you live, there is a way in.
        </h3>
        <p className="m-0 text-muted">
          Our first two societies are registered in Edo State and the Federal Capital Territory. You can join either one
          if you live there, or if you or your family own or hold land or a home there.
        </p>
      </div>

      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-2 font-bold text-forest-800">Which describes you?</legend>
        {ROUTE_OPTIONS.map((o) => {
          const on = route === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => setRoute(o.value)}
              className={`flex min-h-12 items-center gap-3 rounded-[14px] border-2 px-4 py-2.5 text-left text-base font-semibold transition ${
                on ? "border-forest-800 bg-paper text-forest-800" : "border-line bg-paper/60 hover:border-forest-700"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  on ? "border-forest-800 bg-forest-800 text-cream" : "border-line-strong"
                }`}
              >
                {on && <CheckIcon size={12} />}
              </span>
              {o.label}
            </button>
          );
        })}

        <div aria-live="polite">
          {r && (
            <div className={`mt-2 flex flex-col gap-2 rounded-[16px] p-4 sm:p-5 ${r.tone}`}>
              <b className="font-display text-lg">{r.title}</b>
              <span className="text-[15px] opacity-90">{r.text}</span>
              <a
                href={`#register`}
                data-route={route ?? undefined}
                onClick={() => {
                  if (route) window.dispatchEvent(new CustomEvent("hb:route", { detail: route }));
                }}
                className={`mt-1 inline-flex min-h-11 items-center self-start rounded-full px-5 font-bold no-underline transition hover:-translate-y-px ${
                  r.tone.includes("forest") ? "bg-gold text-forest-900" : "bg-forest-800 text-cream hover:text-cream"
                }`}
              >
                {r.cta}
              </a>
            </div>
          )}
        </div>
      </fieldset>
    </Reveal>
  );
}
