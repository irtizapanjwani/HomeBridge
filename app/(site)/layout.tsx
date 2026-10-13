import { ToastProvider } from "@/components/ui/Toast";
import { SiteHeader } from "@/components/home/SiteHeader";
import { Footer } from "@/components/home/Footer";
import { MobileTabBar } from "@/components/site/MobileTabBar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <a
        href="#main"
        className="absolute -top-16 left-3 z-[100] rounded-full bg-gold px-4 py-2.5 font-semibold text-forest-900 no-underline transition-[top] focus:top-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <Footer />
      {/* room for the phone tab bar */}
      <div aria-hidden="true" className="h-14 md:hidden" />
      <MobileTabBar />
    </ToastProvider>
  );
}
