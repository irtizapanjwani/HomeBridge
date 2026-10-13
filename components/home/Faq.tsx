"use client";

import { useState } from "react";
import { FAQS } from "@/lib/content";

export function Faq() {
  const [open, setOpen] = useState(-1);

  return (
    <section id="faq">
      <div className="mx-auto max-w-[880px] px-[clamp(16px,4vw,28px)] py-14 sm:py-16">
        <div className="flex flex-col gap-2.5">
          {FAQS.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <div
                key={q}
                className={`rounded-[16px] border bg-paper transition-colors ${isOpen ? "border-forest-800" : "border-line"}`}
              >
                <h3 className="m-0">
                  <button
                    type="button"
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex min-h-14 w-full items-center justify-between gap-4 bg-transparent px-[18px] py-3.5 text-left text-[16.5px] font-semibold text-forest-800"
                  >
                    <span>{q}</span>
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xl leading-none transition ${
                        isOpen ? "rotate-45 bg-forest-800 text-cream" : "bg-mist"
                      }`}
                    >
                      +
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-a-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden" inert={!isOpen}>
                    <p className="m-0 px-[18px] pb-[18px] text-[15.5px] text-body">{a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
