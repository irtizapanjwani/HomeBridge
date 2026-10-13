import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { JoinCta } from "@/components/site/JoinCta";
import { LaunchAndEvents } from "@/components/home/Events";
import { SectionWrap } from "@/components/home/Sections";

export const metadata: Metadata = {
  title: "Events",
  description: "The online launch, chapter meetings in Benin City and Abuja, the UK webinar and the first Annual General Meeting.",
};

export default function EventsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Events"
        title="Meet us online and in person"
        lead="Launches, chapter meetings and AGMs. Members get at least 21 days’ notice of every general meeting by email, WhatsApp and the member portal."
      />
      <SectionWrap>
        <div className="max-w-[760px]">
          <LaunchAndEvents />
        </div>
      </SectionWrap>
      <JoinCta />
    </>
  );
}
