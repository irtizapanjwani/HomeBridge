import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { JoinCta } from "@/components/site/JoinCta";
import { WhoWeAre } from "@/components/home/WhoWeAre";
import { HowItWorks } from "@/components/home/HowItWorks";

export const metadata: Metadata = {
  title: "How it works",
  description: "Members own the Society, the Society owns businesses, VEKAT runs the work and chapters bring people in. Share money moves one way only.",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro
        eyebrow="How it works"
        title="Members → the Society → real businesses"
        lead="HomeBridge is a registered cooperative. Members buy shares, the Society owns businesses run by local operators, VEKAT Group manages the work under a contract members review, and chapters at home and abroad bring people in."
      />
      <WhoWeAre />
      <HowItWorks />
      <JoinCta />
    </>
  );
}
