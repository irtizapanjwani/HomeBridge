import { ToastProvider } from "@/components/ui/Toast";
import { SiteHeader } from "@/components/home/SiteHeader";
import { Hero } from "@/components/home/Hero";
import { JoinSection, Leadership, Projects, Trust } from "@/components/home/Sections";
import { HowItWorks } from "@/components/home/HowItWorks";
import { MoneySplit } from "@/components/home/MoneySplit";
import { WhoWeAre } from "@/components/home/WhoWeAre";
import { Events } from "@/components/home/Events";
import { Faq } from "@/components/home/Faq";
import { Register } from "@/components/home/Register";
import { InstallBanner } from "@/components/home/InstallBanner";
import { Footer } from "@/components/home/Footer";

export default function HomePage() {
  return (
    <ToastProvider>
      <a
        href="#main"
        className="absolute -top-16 left-3 z-[100] rounded-full bg-gold px-4 py-2.5 font-bold text-forest-900 no-underline transition-[top] focus:top-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <WhoWeAre />
        <HowItWorks />
        <JoinSection />
        <MoneySplit />
        <Projects />
        <Trust />
        <Leadership />
        <Events />
        <Faq />
        <Register />
        <InstallBanner />
      </main>
      <Footer />
    </ToastProvider>
  );
}
