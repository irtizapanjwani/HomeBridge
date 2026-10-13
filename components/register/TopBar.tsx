import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { CheckIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { CONTACT } from "@/lib/content";

const PREVIEW = "Preview — membership opens after registration and legal sign-off";

/** Minimal header for the application: no site navigation to pull people away mid-form. */
export function RegisterTopBar({ saved }: { saved: boolean }) {
  return (
    <header className="border-b border-line bg-paper">
      <a
        href="#main"
        className="absolute -top-16 left-3 z-[100] rounded-full bg-gold px-4 py-2.5 font-semibold text-forest-900 no-underline transition-[top] focus:top-3"
      >
        Skip to content
      </a>
      <div className="mx-auto flex min-h-[68px] w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link href="/" className="no-underline" aria-label="HomeBridge Cooperative home">
          <Logo size={38} sub={null} />
        </Link>
        <p className="hidden rounded-full border border-gold/40 bg-butter px-3.5 py-1.5 text-[13px] font-medium text-gold-ink xl:block">
          {PREVIEW}
        </p>
        <p className="flex items-center gap-2 text-[14px] text-body">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-[13px] max-[359px]:hidden sm:text-[14px]">
              <CheckIcon size={16} strokeWidth={2.6} className="text-forest-700" />
              Saved<span className="hidden sm:inline"> automatically</span>
              <span aria-hidden="true">·</span>
            </span>
          )}
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold underline underline-offset-[3px]"
          >
            <WhatsAppIcon size={18} className="sm:hidden" />
            <span className="sm:hidden">Help</span>
            <span className="hidden sm:inline">Need help? WhatsApp us</span>
          </a>
        </p>
      </div>
      <p className="border-t border-gold/30 bg-butter px-4 py-2 text-center text-[13px] leading-snug font-medium text-gold-ink xl:hidden">{PREVIEW}</p>
    </header>
  );
}
