"use client";

import { useEffect, useRef, useState } from "react";
import { CONTACT } from "@/lib/content";
import { ArrowUpIcon, CloseIcon } from "@/components/ui/Icons";
import { LogoMark } from "@/components/ui/Logo";

function PrivacyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="privacy-title"
      className="m-auto w-[min(92vw,640px)] rounded-[20px] border-0 bg-paper p-0 text-ink shadow-card backdrop:bg-forest-950/60"
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2 id="privacy-title" className="m-0 font-display text-2xl font-bold text-forest-800">
            Privacy notice (summary)
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl border border-line">
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto px-6 py-5 text-base">
          <p className="m-0">
            Personal data is handled under the <b>Nigeria Data Protection Act 2023</b> and <b>UK GDPR</b>.
          </p>
          <p className="m-0">
            <b>What we collect now:</b> the details you give when you register interest — name, country, city, phone or
            WhatsApp number, optional email, the member type you are interested in, and how you heard about us.
          </p>
          <p className="m-0">
            <b>Why:</b> only to contact you about HomeBridge membership and events. We do not sell your data.
          </p>
          <p className="m-0">
            <b>Your rights:</b> you can ask to see, correct or delete your details at any time by emailing{" "}
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
          </p>
          <p className="m-0 rounded-xl bg-butter px-4 py-3 text-[15px]">
            The full privacy notice, including identity-check data for members, will be published here after legal
            review and before membership opens.
          </p>
        </div>
      </div>
    </dialog>
  );
}

export function Footer() {
  const [privacy, setPrivacy] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onHash = () => window.location.hash === "#privacy" && setPrivacy(true);
    const onScroll = () => setShowTop(window.scrollY > 900);
    onHash();
    onScroll();
    window.addEventListener("hashchange", onHash);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const closePrivacy = () => {
    setPrivacy(false);
    if (window.location.hash === "#privacy") history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  const link = "text-[#E6E0C8] hover:text-gold";

  return (
    <footer className="adire bg-forest-900 text-[#E6E0C8]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-7 px-[clamp(16px,4vw,28px)] pt-12 pb-7">
        <div className="grid gap-7 text-base sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-3">
              <LogoMark size={36} />
              <span className="font-display text-[22px] font-extrabold text-cream">HomeBridge Cooperative</span>
            </span>
            <span>A VEKAT Group initiative</span>
            <span className="text-gold italic">Abroad and at home, we build together.</span>
          </div>
          <div className="flex flex-col gap-2">
            <b className="text-cream">Head office</b>
            <span>4 Eregbowa Street, off Trinity Road, Ugbor Quarters, Benin City, Edo State</span>
            <a href={`mailto:${CONTACT.email}`} className={link}>
              {CONTACT.email}
            </a>
            <a href={CONTACT.phoneHref} className={link}>
              {CONTACT.phoneDisplay}
            </a>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-2">
            <b className="text-cream">Explore</b>
            <a href="#how" className={link}>How it works</a>
            <a href="#join" className={link}>Who can join</a>
            <a href="#projects" className={link}>Projects</a>
            <a href="#trust" className={link}>How your money is protected</a>
            <a href="#faq" className={link}>FAQ</a>
          </nav>
          <div className="flex flex-col gap-2">
            <b className="text-cream">Chapters</b>
            <span>HomeBridge Edo</span>
            <span>HomeBridge Abuja</span>
            <span>HomeBridge UK</span>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); setPrivacy(true); }} className={link}>
              Privacy notice
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-[#2D4D3C] pt-5 text-sm text-[#C9C3AA]">
          <p className="m-0">
            <b className="text-cream">Important:</b> HomeBridge offers shares to verified members only. There are no
            guaranteed returns — profits depend on how the businesses perform. HomeBridge is not a savings, deposit or
            loan scheme and does not take deposits from the public. Membership opens only after cooperative
            registration and legal sign-off. Shares can be withdrawn after 3 years with 6 months’ written notice. The one-off joining fee is paid to VEKAT Group Ltd, the appointed manager; share money goes only to the cooperative’s own accounts.
          </p>
          <p className="m-0">
            Charity work is kept separate from the cooperative. Personal data is handled under the Nigeria Data
            Protection Act 2023 and UK GDPR.
          </p>
          <p className="m-0">© {new Date().getFullYear()} HomeBridge Cooperative · a VEKAT Group initiative</p>
        </div>
      </div>

      <PrivacyDialog open={privacy} onClose={closePrivacy} />

      <a
        href="#top"
        aria-label="Back to top"
        className={`fixed right-4 bottom-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-forest-800 text-gold shadow-card transition hover:bg-forest-900 hover:text-gold ${
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <ArrowUpIcon size={22} />
      </a>
    </footer>
  );
}
