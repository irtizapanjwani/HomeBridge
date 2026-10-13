import type { Metadata } from "next";
import { PageIntro } from "@/components/site/PageIntro";
import { SectionWrap } from "@/components/home/Sections";
import { CONTACT, GOOGLE_FORM_URL } from "@/lib/content";
import { MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Contact",
  description: "WhatsApp, email and our head office in Benin City, Edo State.",
};

export default function ContactPage() {
  const card = "flex flex-col gap-2 rounded-[20px] border border-line bg-paper p-6";
  return (
    <>
      <PageIntro eyebrow="Contact" title="Talk to a person" lead="We usually reply on WhatsApp within one working day." />
      <SectionWrap>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={`${card} bg-forest-800 text-cream no-underline hover:text-cream`}>
            <WhatsAppIcon size={26} className="text-gold" />
            <b className="mt-1 text-lg font-semibold">WhatsApp</b>
            <span>{CONTACT.phoneIntl}</span>
            <span className="mt-auto pt-2 font-semibold text-gold">Start a chat</span>
          </a>
          <a href={`mailto:${CONTACT.email}`} className={`${card} no-underline`}>
            <MailIcon size={26} className="text-gold-dark" />
            <b className="mt-1 text-lg font-semibold text-forest-800">Email</b>
            <span className="break-all text-body">{CONTACT.email}</span>
          </a>
          <a href={CONTACT.phoneHref} className={`${card} no-underline`}>
            <PhoneIcon size={26} className="text-gold-dark" />
            <b className="mt-1 text-lg font-semibold text-forest-800">Phone</b>
            <span className="text-body">{CONTACT.phoneDisplay}</span>
          </a>
          <div className={card}>
            <PinIcon size={26} className="text-gold-dark" />
            <b className="mt-1 text-lg font-semibold text-forest-800">Head office</b>
            <span className="text-body">
              {CONTACT.address[0]} {CONTACT.address[1]}
            </span>
          </div>
        </div>
        <div className="mt-8 rounded-[20px] bg-cream p-6">
          <b className="font-semibold text-forest-800">Applying on paper?</b>{" "}
          <span className="text-body">
            Until online registration opens fully, you can still use our{" "}
            <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer">
              Google Form
            </a>
            . Never send money with a form — fees are only requested after approval.
          </span>
        </div>
      </SectionWrap>
    </>
  );
}
