import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/PageIntro";
import { JoinCta } from "@/components/site/JoinCta";
import { MemberCards } from "@/components/home/MemberCards";
import { EligibilityCheck } from "@/components/home/EligibilityCheck";
import { MembershipExplainer, SectionWrap } from "@/components/home/Sections";
import { SectionHeading } from "@/components/home/SectionHeading";
import { GOOGLE_FORM_URL } from "@/lib/content";

export const metadata: Metadata = {
  title: "Who can join",
  description: "Five member types, one share price and one vote each. Check the residence routes for Edo State and Abuja FCT, or join the Supporter list.",
};

export default function JoinPage() {
  return (
    <>
      <PageIntro
        eyebrow="Who can join"
        title="Same share price. Same vote. Anywhere."
        lead="Anyone aged 18 or over, of good character, who passes our identity checks and meets the residence test. Pay a one-off joining fee once approved, then buy shares at ₦1,000 each, at your own pace."
      />
      <SectionWrap>
        <SectionHeading eyebrow="Five member types" title="Choose the membership that fits you" />
        <MemberCards />
        <div id="eligibility" className="scroll-mt-[calc(var(--header-h)+16px)]">
          <EligibilityCheck />
        </div>
      </SectionWrap>
      <MembershipExplainer />
      <SectionWrap tone="cream">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Supporter list" title="Not eligible yet? Be first in." />
            <p className="m-0 text-body">
              Our first societies are in Edo State and the FCT. If you have no link there yet, join the free Supporter list
              for your state or country. You pay nothing, and we tell you first when a society opens near you.
            </p>
            <Link
              href="/register?route=none"
              className="mt-5 inline-flex min-h-12 items-center rounded-full bg-forest-800 px-6 font-semibold text-cream no-underline hover:bg-forest-900 hover:text-cream"
            >
              Join the Supporter list
            </Link>
          </div>
          <div className="self-start rounded-[20px] border border-line bg-paper p-6">
            <h3 className="m-0 font-display text-[22px] font-bold text-forest-800">Prefer a paper-style form?</h3>
            <p className="m-0 mt-2 text-[15px] text-body">
              Until online registration opens fully, our Google Form is still accepted. Answers are imported into the same
              applications list.
            </p>
            <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-semibold">
              Open the Google Form
            </a>
          </div>
        </div>
      </SectionWrap>
      <JoinCta />
    </>
  );
}
