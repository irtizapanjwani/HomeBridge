import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/PageIntro";
import { JoinCta } from "@/components/site/JoinCta";
import { BoardCard, ChairCard } from "@/components/home/HomeSections";
import { GovernanceTable, SectionWrap } from "@/components/home/Sections";
import { SectionHeading } from "@/components/home/SectionHeading";

export const metadata: Metadata = {
  title: "Governance",
  description: "Board of 9, Founding Chairman, Audit Committee, conflicts of interest and the manager’s contract. Members decide; the Board leads; the manager works.",
};

const SAFEGUARDS = [
  {
    title: "Audit Committee",
    clause: "Bye-law 19",
    text: "Three members who are not on the Board — at least one from home and one from the diaspora — elected by the AGM. They can inspect every book and record at any time and report straight to members.",
  },
  {
    title: "Conflicts of interest",
    clause: "Bye-law 18",
    text: "Anyone with a personal interest declares it, leaves the discussion and does not vote. Declarations are minuted and listed in the annual report. Deals with linked people need an independent valuation.",
  },
  {
    title: "The manager’s contract",
    clause: "Bye-law 20",
    text: "VEKAT Group Ltd is paid under a written contract agreed by the Board members without a conflict, led by the independent member, and confirmed by the AGM. Members review it at least every 3 years.",
  },
  {
    title: "Openness",
    clause: "Bye-law 20.6",
    text: "Every fee and payment to VEKAT — and the number and total of joining fees it received — is published in full in the annual report.",
  },
  {
    title: "General meetings",
    clause: "Bye-law 16",
    text: "AGM within 4 months of year end, 21 days’ notice, vote online or in person, up to 5 proxies per member. Quorum: a fifth of members or 50, with at least a quarter each from home and diaspora.",
  },
  {
    title: "Big decisions",
    clause: "Bye-laws 16.6, 23",
    text: "Changing the bye-laws, expelling a member, removing a Board member or dissolving the Society needs a two-thirds majority.",
  },
];

export default function GovernancePage() {
  return (
    <>
      <PageIntro
        eyebrow="Governance"
        title="Members decide. The Board leads. The manager works."
        lead="One member, one vote, however many shares you hold. The Board is elected by members, an independent Audit Committee checks the books, and VEKAT works under a contract members can end."
      />
      <SectionWrap>
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <BoardCard />
          <ChairCard />
        </div>
      </SectionWrap>
      <SectionWrap tone="paper">
        <SectionHeading eyebrow="Who decides what" title="Everyone has one job" />
        <GovernanceTable />
      </SectionWrap>
      <SectionWrap>
        <SectionHeading eyebrow="Checks and balances" title="Built into the bye-laws" />
        <ul className="m-0 grid list-none gap-3.5 p-0 md:grid-cols-2 lg:grid-cols-3">
          {SAFEGUARDS.map((s) => (
            <li key={s.title} className="rounded-[20px] border border-line bg-paper p-5">
              <span className="text-[12px] font-semibold tracking-[0.1em] text-gold-dark uppercase">{s.clause}</span>
              <h3 className="m-0 mt-1.5 font-sans text-[17px] font-semibold text-forest-800">{s.title}</h3>
              <p className="m-0 mt-1.5 text-[14.5px] text-body">{s.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 mb-0 text-[15px]">
          The full rules are in the <Link href="/documents">draft bye-laws</Link>, published after legal review.
        </p>
      </SectionWrap>
      <JoinCta />
    </>
  );
}
