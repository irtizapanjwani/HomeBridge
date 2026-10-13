import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { JoinCta } from "@/components/site/JoinCta";
import { PortfolioDetail } from "@/components/home/Portfolio";
import { SectionWrap } from "@/components/home/Sections";

export const metadata: Metadata = {
  title: "Investment portfolio",
  description: "Clause 13A in plain words: limits, independent advice, safekeeping in the Society’s name and quarterly reporting.",
};

export default function PortfolioPage() {
  return (
    <>
      <PageIntro
        eyebrow="New · Long-term portfolio"
        title="Steady growth, on expert advice — never quick bets."
        lead="Alongside our own businesses, members may agree to hold a spread of quoted company shares, Federal Government bonds and treasury bills, and SEC-registered funds. Members approve the investment policy; the Board works within it."
      />
      <SectionWrap>
        <PortfolioDetail />
      </SectionWrap>
      <JoinCta />
    </>
  );
}
