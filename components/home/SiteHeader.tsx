"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGES, NAV } from "@/lib/content";
import { LogoMark } from "@/components/ui/Logo";
import { CloseIcon, MenuIcon } from "@/components/ui/Icons";

export function SiteHeader() {
  const [lang, setLang] = useState("en");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Section links scroll to sit exactly under the sticky header (its bar plus 1px border),
  // so no strip of the previous section peeks through. Measured, so it tracks font/zoom changes.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const apply = () =>
      document.documentElement.style.setProperty("--header-h", `${Math.ceil(bar.getBoundingClientRect().height) + 1}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth >= 1100 && setOpen(false);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <div className="bg-forest-900 px-4 py-2 text-center text-sm text-cream">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <span>
            Membership opens only after registration and legal sign-off. No guaranteed returns. Not a savings or deposit
            scheme.
          </span>
          <span className="inline-flex items-center gap-2">
            <label htmlFor="lang" className="opacity-85">
              Language
            </label>
            <select
              id="lang"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="rounded-md border border-forest-600 bg-forest-800 px-2 py-0.5 text-sm text-cream"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </span>
        </div>
      </div>
      {lang !== "en" && (
        <div role="status" className="flex flex-wrap items-center justify-center gap-3 bg-gold px-4 py-2 text-center text-[15px] font-semibold text-forest-900">
          That language is coming in a later phase. The site is shown in English for now.
          <button
            type="button"
            onClick={() => setLang("en")}
            className="rounded-full border-2 border-forest-900 px-3 py-0.5 text-sm font-bold"
          >
            OK
          </button>
        </div>
      )}

      <header
        className={`sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur transition-shadow ${
          scrolled ? "shadow-[0_6px_20px_rgb(14_44_30/0.08)]" : ""
        }`}
      >
        <div ref={barRef} className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-[clamp(16px,4vw,28px)] py-3.5">
          <a href="#top" className="flex min-w-0 items-center gap-3 text-forest-800 no-underline">
            <LogoMark />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-display text-[21px] font-extrabold">HomeBridge</span>
              <span className="truncate text-[13px] text-muted">Cooperative · a VEKAT Group initiative</span>
            </span>
          </a>

          <nav aria-label="Main" className="hidden items-center gap-6 text-base font-semibold min-[1100px]:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="no-underline hover:underline">
                {n.label}
              </a>
            ))}
            <a
              href="#register"
              className="rounded-full bg-forest-800 px-[18px] py-3 text-cream no-underline transition hover:-translate-y-px hover:bg-forest-900 hover:text-cream"
            >
              Register interest
            </a>
          </nav>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-cream text-forest-800 min-[1100px]:hidden"
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {open && (
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className="flex flex-col gap-1 border-t border-line px-[clamp(16px,4vw,28px)] pt-2 pb-5 font-semibold min-[1100px]:hidden"
          >
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line/60 py-3 no-underline">
                {n.mobile}
              </a>
            ))}
            <a
              href="#register"
              onClick={() => setOpen(false)}
              className="mt-3 rounded-full bg-forest-800 px-[18px] py-3.5 text-center text-cream no-underline hover:text-cream"
            >
              Register interest
            </a>
          </nav>
        )}
      </header>
    </>
  );
}
