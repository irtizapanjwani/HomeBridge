import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/PageIntro";
import { JoinCta } from "@/components/site/JoinCta";
import { SectionWrap } from "@/components/home/Sections";
import { SectionHeading } from "@/components/home/SectionHeading";
import { CONTACT } from "@/lib/content";
import { GlobeIcon, LockIcon } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Chapters",
  description: "HomeBridge Edo, HomeBridge Abuja and HomeBridge UK, with more chapters by country to come. Chapters recruit and support members and never hold money.",
};

const CHAPTERS = [
  { name: "HomeBridge Edo", where: "Benin City, Edo State", text: "Members’ meetings, project visits and onboarding help for the Edo society.", status: "Active" },
  { name: "HomeBridge Abuja", where: "Abuja, FCT", text: "Members’ meetings, project visits and onboarding help for the FCT society.", status: "Active" },
  { name: "HomeBridge UK", where: "Online and UK cities", text: "Webinars and support for members across the United Kingdom and Europe.", status: "Active" },
];

const NEXT = ["United States", "Canada", "Ireland", "Germany", "UAE", "South Africa", "Ghana", "Other Nigerian states"];

export default function ChaptersPage() {
  return (
    <>
      <PageIntro
        eyebrow="Chapters"
        title="Find your people, at home and abroad"
        lead="Chapters recruit and support members and find skills and projects. They are not branches of the Society, hold no money and cannot make decisions for it (bye-law 3.2)."
      />
      <SectionWrap>
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
          {CHAPTERS.map((c) => (
            <li key={c.name} className="flex flex-col gap-2 rounded-[20px] border border-line bg-paper p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist text-forest-800">
                <GlobeIcon size={22} />
              </span>
              <h2 className="m-0 mt-1 text-[24px] text-forest-800">{c.name}</h2>
              <span className="text-[14px] text-muted">{c.where}</span>
              <p className="m-0 text-[15px] text-body">{c.text}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full bg-cream px-2.5 py-0.5 text-[12.5px] font-semibold text-clay">
                <LockIcon size={12} /> No access to money
              </span>
            </li>
          ))}
        </ul>
      </SectionWrap>
      <SectionWrap tone="paper">
        <SectionHeading
          eyebrow="Coming next"
          title="Future chapters, by country"
          lead="New chapters open where enough members and supporters gather. Join the Supporter list for your country and help start one."
        />
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {NEXT.map((n) => (
            <li key={n} className="rounded-full border border-line bg-page px-3.5 py-1.5 text-[14.5px] font-medium text-ink">
              {n}
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/register?route=none"
            className="inline-flex min-h-12 items-center rounded-full bg-forest-800 px-6 font-semibold text-cream no-underline hover:bg-forest-900 hover:text-cream"
          >
            Join the Supporter list
          </Link>
          <a
            href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Starting a HomeBridge chapter")}`}
            className="inline-flex min-h-12 items-center rounded-full border border-forest-800 px-6 font-semibold text-forest-800 no-underline"
          >
            Help start a chapter
          </a>
        </div>
      </SectionWrap>
      <JoinCta />
    </>
  );
}
