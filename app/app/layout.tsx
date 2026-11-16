import type { Metadata } from "next";
import Link from "next/link";
import { ToastProvider } from "@/components/ui/Toast";
import { Logo } from "@/components/ui/Logo";
import { MobileTabBar } from "@/components/site/MobileTabBar";
import { MemberNav } from "@/components/member/MemberNav";
import { Footer } from "@/components/home/Footer";
import { isDbConfigured } from "@/lib/db";
import { currentMemberRef, findMemberByRef } from "@/lib/member-auth";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

/** Which menu to show: everything for members, Dashboard and Profile for applicants, nothing signed out. */
async function whoIsSignedIn(): Promise<"member" | "applicant" | null> {
  try {
    const ref = isDbConfigured() ? await currentMemberRef() : null;
    const m = ref ? await findMemberByRef(ref) : null;
    return m ? (m.membership ? "member" : "applicant") : null;
  } catch {
    return null;
  }
}

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const who = await whoIsSignedIn();
  return (
    <ToastProvider>
      {/* Paper version of the statement: plain white page, no toasts */}
      <style>{`@media print { @page { margin: 16mm; } body { background: #fff; } body > [role=status][aria-live] { display: none !important; } }`}</style>
      <a
        href="#main"
        className="absolute -top-16 left-3 z-[100] rounded-full bg-gold px-4 py-2.5 font-semibold text-forest-900 no-underline transition-[top] focus:top-3 print:hidden"
      >
        Skip to content
      </a>
      <header className="bg-forest-800 print:hidden">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-[clamp(16px,4vw,28px)] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <Link href="/" className="flex min-h-11 items-center self-start no-underline lg:self-auto" aria-label="HomeBridge home">
            <Logo tone="dark" sub={null} size={40} />
          </Link>
          <MemberNav who={who} />
        </div>
      </header>
      <p className="m-0 border-b border-line bg-cream px-[clamp(16px,4vw,28px)] py-2 text-center text-[14px] text-body print:hidden">
        <strong className="font-semibold text-forest-800">Preview</strong> — share accounts open once the cooperative launches. Any
        contribution figures shown are sample data; your own application details are real.
      </p>
      <main id="main" className="pb-12 print:p-0">
        {children}
      </main>
      {/* The website's own footer on every member-area page; room for the phone tab bar under it. */}
      <div className="print:hidden">
        <Footer />
        <div aria-hidden="true" className="h-14 md:hidden" />
      </div>
      <div className="print:hidden">
        <MobileTabBar />
      </div>
    </ToastProvider>
  );
}
