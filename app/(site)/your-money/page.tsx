import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { JoinCta } from "@/components/site/JoinCta";
import { MoneySplit, TwoPayments } from "@/components/home/MoneySplit";
import { SafeguardGates } from "@/components/home/SafeguardGates";
import { FiveChecks, SectionWrap } from "@/components/home/Sections";
import { SectionHeading } from "@/components/home/SectionHeading";

export const metadata: Metadata = {
  title: "Your money",
  description: "Joining fee to VEKAT, shares only to the Society’s own accounts. 75/15/10 use of funds, 40/40/10/10 surplus split, two signatures and spending limits.",
};

const RULES = [
  ["No cash, never a person", "Pay only into the Society’s own accounts, shown on your Pay page. Bank details change only with two admins’ approval."],
  ["Your member number is the reference", "That is how every payment is matched to you. Payments that can’t be matched wait in a suspense queue — nothing is credited until an officer matches it."],
  ["Foreign currency", "Converted to naira at the bank rate on the day received. We record the original amount, currency, rate and naira value."],
  ["Whole shares", "Shares are whole ₦1,000 units. Anything below ₦1,000 is held as credit and added to your next payment."],
];

export default function YourMoneyPage() {
  return (
    <>
      <PageIntro
        eyebrow="Your money"
        title="Two payments. Two places. Never a person."
        lead="Your joining fee pays for registration and identity checks. Your shares go only into the cooperative’s own bank accounts. Your member number is your payment reference, always."
      />
      <SectionWrap tone="paper">
        <TwoPayments />
        <dl className="m-0 mt-10 grid gap-3.5 md:grid-cols-2">
          {RULES.map(([t, d]) => (
            <div key={t} className="rounded-[20px] bg-mist p-5">
              <dt className="font-semibold text-forest-800">{t}</dt>
              <dd className="m-0 mt-1.5 text-[15px] text-body">{d}</dd>
            </div>
          ))}
        </dl>
      </SectionWrap>
      <MoneySplit />
      <SectionWrap id="safeguards" tone="cream">
        <SectionHeading
          eyebrow="How your money is protected"
          title="No single person can move money."
          lead="Every payment out of the Society has to clear every gate, and members can see every project, every month."
        />
        <SafeguardGates />
        <div className="mt-10 max-w-[760px]">
          <FiveChecks />
        </div>
      </SectionWrap>
      <JoinCta />
    </>
  );
}
