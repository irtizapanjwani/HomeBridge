import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { JoinCta } from "@/components/site/JoinCta";
import { FiveChecks, ProjectCards, SectionWrap, Targets } from "@/components/home/Sections";

export const metadata: Metadata = {
  title: "Projects",
  description: "First-cohort projects in Edo and Abuja and their five-check status. No money moves until a project passes all five checks.",
};

export default function ProjectsPage() {
  return (
    <>
      <PageIntro
        eyebrow="First cohort projects"
        title="Real businesses you can visit."
        lead="Being shortlisted now in Edo State and Abuja FCT. No money moves until a project passes all five checks, and members see a report on every project every month."
      />
      <SectionWrap>
        <ProjectCards />
      </SectionWrap>
      <SectionWrap tone="paper">
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <FiveChecks />
          <Targets />
        </div>
      </SectionWrap>
      <JoinCta />
    </>
  );
}
