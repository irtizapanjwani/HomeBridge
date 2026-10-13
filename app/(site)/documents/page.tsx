import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { JoinCta } from "@/components/site/JoinCta";
import { NewsAndDocs } from "@/components/home/Events";
import { SectionWrap } from "@/components/home/Sections";

export const metadata: Metadata = {
  title: "Documents",
  description: "The HomeBridge cooperative model, draft bye-laws, registration form, privacy notice, annual reports and audited accounts.",
};

export default function DocumentsPage() {
  return (
    <>
      <PageIntro
        eyebrow="News and documents"
        title="Read it for yourself"
        lead="Every member has the right to see the bye-laws, the register of members, minutes of general meetings and the audited accounts (bye-law 7.1)."
      />
      <SectionWrap>
        <div className="max-w-[760px]">
          <NewsAndDocs />
        </div>
      </SectionWrap>
      <JoinCta />
    </>
  );
}
