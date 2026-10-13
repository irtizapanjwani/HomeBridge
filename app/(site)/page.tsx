import { Hero } from "@/components/home/Hero";
import { JoinSection, Leadership, Projects, Trust } from "@/components/home/Sections";
import { HowItWorks } from "@/components/home/HowItWorks";
import { MoneySplit } from "@/components/home/MoneySplit";
import { Portfolio } from "@/components/home/Portfolio";
import { WhoWeAre } from "@/components/home/WhoWeAre";
import { Events } from "@/components/home/Events";
import { Faq } from "@/components/home/Faq";
import { Register } from "@/components/home/Register";
import { InstallBanner } from "@/components/home/InstallBanner";

export default function HomePage() {
  return (
    <>
        <Hero />
        <WhoWeAre />
        <HowItWorks />
        <JoinSection />
        <MoneySplit />
        <Portfolio />
        <Projects />
        <Trust />
        <Leadership />
        <Events />
        <Faq />
        <Register />
        <InstallBanner />
          </>
  );
}
