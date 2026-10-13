import { HomeHero } from "@/components/home/HomeHero";
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
