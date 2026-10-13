import { HomeHero, PromiseStrip } from "@/components/home/HomeHero";
import {
  FaqHome,
  GatesHome,
  GovernanceHome,
  MoneyHome,
  PortfolioHome,
  ProjectsHome,
  WhoCanJoinHome,
} from "@/components/home/HomeSections";
import { EventsHome } from "@/components/home/Events";
import { InstallBanner } from "@/components/home/InstallBanner";
import { JoinCta } from "@/components/site/JoinCta";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <PromiseStrip />
      <WhoCanJoinHome />
      <MoneyHome />
      <PortfolioHome />
      <GatesHome />
      <ProjectsHome />
      <GovernanceHome />
      <EventsHome />
      <FaqHome />
      <JoinCta />
      <InstallBanner />
    </>
  );
}
