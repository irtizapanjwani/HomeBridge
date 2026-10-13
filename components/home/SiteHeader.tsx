"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LANGUAGES, NAV, NAV_MORE, RISK_NOTICE } from "@/lib/content";
import { Logo } from "@/components/ui/Logo";
import { CloseIcon, MenuIcon } from "@/components/ui/Icons";

export function SiteHeader() {
  const pathname = usePathname();
  const [lang, setLang] = useState("en");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // In-page links scroll to sit exactly under the sticky header. Measured, so it tracks font/zoom changes.
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
    const onResize = () => window.innerWidth >= 1180 && setOpen(false);
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

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <div className="bg-forest-900 px-4 py-2 text-center text-[13px] text-cream">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          <span className="hidden sm:inline">{RISK_NOTICE}</span>
          <span className="sm:hidden">Not a savings scheme · no guaranteed returns</span>
          <span className="hidden items-center gap-2 md:inline-flex">
            <label htmlFor="lang" className="opacity-80">
              Language
            </label>
            <select
              id="lang"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="rounded-md border border-forest-600 bg-forest-800 px-2 py-0.5 text-[13px] text-cream"
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
        <div role="status" className="flex flex-wrap items-center justify-center gap-3 bg-gold px-4 py-2 text-center text-sm font-semibold text-forest-900">
          That language is coming in a later phase. The site is shown in English for now.
          <button type="button" onClick={() => setLang("en")} className="rounded-full border-2 border-forest-900 px-3 py-0.5 text-sm font-bold">
            OK
          </button>
        </div>
      )}

      <header
        className={`sticky top-0 z-50 border-b border-line bg-page/95 backdrop-blur transition-shadow ${
          scrolled ? "shadow-[0_6px_20px_rgb(14_44_30/0.06)]" : ""
        }`}
      >
        <div ref={barRef} className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-[clamp(16px,4vw,28px)] py-3">
          <Link href="/" aria-label="HomeBridge Cooperative — home" className="min-w-0 no-underline">
            <Logo />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-5 text-[14.5px] font-medium min-[1180px]:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={`no-underline transition hover:text-forest-800 ${
                  isActive(n.href) ? "text-forest-800 underline decoration-gold decoration-2 underline-offset-[6px]" : "text-ink"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/app"
              className="hidden min-h-11 items-center rounded-full border border-forest-800 px-4 text-[14.5px] font-semibold text-forest-800 no-underline transition hover:bg-forest-800 hover:text-cream sm:inline-flex"
            >
              Member sign in
            </Link>
            <Link
              href="/register"
              className="hidden min-h-11 items-center rounded-full bg-forest-800 px-4 text-[14.5px] font-semibold text-cream no-underline transition hover:bg-forest-900 hover:text-cream sm:inline-flex"
            >
              Join HomeBridge
            </Link>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-paper text-forest-800 min-[1180px]:hidden"
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {open && (
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className="max-h-[calc(100dvh-120px)] overflow-y-auto border-t border-line px-[clamp(16px,4vw,28px)] pt-2 pb-5 min-[1180px]:hidden"
          >
            <ul className="m-0 grid list-none gap-x-6 p-0 sm:grid-cols-2">
              {[...NAV, ...NAV_MORE].map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={isActive(n.href) ? "page" : undefined}
                    className={`block border-b border-line/70 py-3 font-medium no-underline ${isActive(n.href) ? "text-forest-800" : "text-ink"}`}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2.5 sm:hidden">
              <Link href="/register" className="rounded-full bg-forest-800 px-5 py-3.5 text-center font-semibold text-cream no-underline hover:text-cream">
                Join HomeBridge
              </Link>
              <Link href="/app" className="rounded-full border border-forest-800 px-5 py-3.5 text-center font-semibold text-forest-800 no-underline">
                Member sign in
              </Link>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
