import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { JoinCta } from "@/components/site/JoinCta";
import { Faq } from "@/components/home/Faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Plain answers about joining, fees, shares, votes, withdrawals, nominees and how your money is protected.",
};

export default function FaqPage() {
  return (
    <>
      <PageIntro eyebrow="FAQ" title="Questions people ask" lead="Plain answers. Can’t find yours? Message us on WhatsApp." />
      <Faq />
      <JoinCta />
    </>
  );
}
