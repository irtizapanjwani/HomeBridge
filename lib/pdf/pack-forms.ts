// The three per-member documents of the welcome pack (brief p.4, module 5: "Merge member data into
// the welcome email and pack templates"):
//
//   04 Contribution and Payment Guide   per member (name, number, category)
//   08 Member Declaration Form          per member, pre-filled, sign and return in 14 days
//   09 Nominee (Next of Kin) Form       per member, pre-filled, sign and return in 14 days
//
// The wording is the client's own, from 04_/08_/09_..._TEMPLATE.docx in "1_Templates_for_all_new_
// joiners", reproduced as written with only the bracketed fields filled in. Bank details come from
// lib/settings.ts, so they change in one place once the Treasurer and Chairman confirm them.

import "server-only";

import { CONTACT } from "@/lib/content";
import { DECLARATION_STATEMENTS, PHOTO_CONSENT } from "@/lib/forms-text";
import { FormWriter } from "@/lib/pdf/layout";
import { FOUNDING_BLOCK, JOINING_FEE, MIN_MONTHLY, SOCIETY_ACCOUNTS } from "@/lib/settings";

export type PackMember = {
  fullName: string;
  memberNo: string;
  /** "Home", "Diaspora", "Founding", "Professional" or "Group". */
  category: string;
  /** Lives in Nigeria: decides the minimum and which account. */
  home: boolean;
  chapter: string;
  admittedAt: Date;
  founding: boolean;
  phone: string;
  email: string;
  nominees: { name: string; relationship: string; contact: string; share: number | string }[];
};

/** A declaration signed in the member portal (Phase 2): drawn on the PDF instead of blank lines. */
export type SignedDeclaration = { signature: Uint8Array; signerName: string; signedAt: Date; photoConsent: boolean };

export type NomineeRow = { name: string; relationship: string; phone: string; email: string; address: string; share: number };

/** A nominee form signed in the member portal, with the member's own nominee list and a witness. */
export type SignedNominee = {
  signature: Uint8Array;
  signedAt: Date;
  nominees: NomineeRow[];
  survivorInstruction: string;
  witnessName: string;
  witnessAddress: string;
  witnessSignature: Uint8Array;
};

/** How long a member has to sign and return the forms (Email C: "by [date, 14 days after admission]"). */
export const FORMS_RETURN_DAYS = 14;

const DATE = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "long", year: "numeric" });

export const returnByDate = (admittedAt: Date) =>
  DATE.format(new Date(admittedAt.getTime() + FORMS_RETURN_DAYS * 86_400_000));

const naira = (n: number) => `₦${n.toLocaleString("en-GB")}`;
const minimumFor = (m: PackMember) => (m.home ? naira(MIN_MONTHLY.ngn) : `£${MIN_MONTHLY.gbp}`);

/** The template writes "[Home / Diaspora] member"; founding and other types keep their residence. */
const residence = (m: PackMember) => (m.home ? "Home" : "Diaspora");

// ---------------- 04 Contribution and Payment Guide ----------------

export async function buildPaymentGuide(m: PackMember): Promise<Uint8Array> {
  const w = await FormWriter.create({
    title: `Contribution and Payment Guide — ${m.memberNo}`,
    subject: `Contribution and payment guide for ${m.fullName}`,
    footerEmail: CONTACT.email,
  });
  const f = w.fonts;

  w.header("Contribution and Payment Guide");
  w.keyValues([
    ["Member", m.fullName],
    ["Membership No.", m.memberNo],
    ["Category", `${residence(m)} member`],
    ["Your minimum", `${minimumFor(m)} per month`],
  ]);
  w.paragraph(
    "Your monthly contribution buys shares in your name. Pay it into the cooperative account for your currency, always using your membership number as the reference.",
  );

  w.heading("How much");
  w.table(
    ["Category", "Minimum per month", "Founding block (optional)"],
    [
      ["Home member (Nigeria)", naira(MIN_MONTHLY.ngn), naira(FOUNDING_BLOCK.ngn)],
      ["Diaspora member", `£${MIN_MONTHLY.gbp} (or USD equivalent)`, `£${FOUNDING_BLOCK.gbp.toLocaleString("en-GB")}`],
    ],
    [0.4, 0.3, 0.3],
  );
  w.paragraph("You may pay more than the minimum at any time.");

  w.heading("Where to pay");
  const account = (c: keyof typeof SOCIETY_ACCOUNTS) => {
    const a = SOCIETY_ACCOUNTS[c];
    return [a.bank, a.accountName, [`Account no. ${a.accountNumber}`, a.extra ? `${a.extra.label} ${a.extra.value}` : ""].filter(Boolean).join("\n"), m.memberNo];
  };
  w.table(
    ["Currency", "Bank", "Account name", "Account details", "Reference"],
    [
      ["Naira (NGN)", ...account("NGN")],
      ["Sterling (GBP)", ...account("GBP")],
      ["US Dollar (USD)", ...account("USD")],
    ],
    [0.15, 0.2, 0.2, 0.25, 0.2],
    { size: 8.5 },
  );
  w.paragraph("Diaspora members may pay into the GBP or USD account. Home members pay into the Naira account.");

  w.heading("How to pay");
  w.list(
    [
      "Set up a monthly standing order or transfer to the account above.",
      `Enter your membership number as the payment reference, exactly as shown: ${m.memberNo}.`,
      "Keep your bank confirmation. HomeBridge emails a contribution receipt (HBC-CR-…) once the funds clear.",
    ],
    { numbered: true },
  );

  w.heading("Keep your money safe");
  w.list([
    "Pay only into the HomeBridge Cooperative accounts listed above. HomeBridge never uses personal accounts.",
    `The joining fee was paid to ${JOINING_FEE.payee}; contributions are never paid to VEKAT.`,
    "Account details only change by written notice signed by both the Chairman and the Treasurer. Never act on a change sent only by WhatsApp or text.",
    `If anyone asks you to pay elsewhere, do not pay. Contact ${CONTACT.email} at once.`,
  ]);

  w.heading("Questions about a payment");
  w.paragraph(`Email ${CONTACT.email} with your membership number, the amount, the date and your bank reference.`, { font: f.poppins });

  return w.finish();
}

// ---------------- 08 Member Declaration Form ----------------

export async function buildDeclarationForm(m: PackMember, signed?: SignedDeclaration): Promise<Uint8Array> {
  const w = await FormWriter.create({
    title: `Member Declaration Form — ${m.memberNo}`,
    subject: `Member declaration form for ${m.fullName}`,
    footerEmail: CONTACT.email,
  });

  w.header("Member Declaration Form");
  w.paragraph(
    signed
      ? `Signed online in the HomeBridge member portal on ${DATE.format(signed.signedAt)}.`
      : `Please sign and return by ${returnByDate(m.admittedAt)}, by email to ${CONTACT.email} or through the member portal.`,
  );

  w.heading("Member details");
  w.keyValues([
    ["Full name", m.fullName],
    ["Membership number", m.memberNo],
    ["Category", `${residence(m)}   ·   Founding member: ${m.founding ? "Yes" : "No"}`],
    ["Chapter", m.chapter],
    ["Date admitted", DATE.format(m.admittedAt)],
  ]);

  w.heading("Declaration");
  w.paragraph("I declare that:");
  w.list(DECLARATION_STATEMENTS, { numbered: true });

  w.heading("Optional consent");
  w.checkbox(PHOTO_CONSENT, signed?.photoConsent ?? false);

  w.ensure(2 * 30 + 64); // the heading travels with its signature block
  w.heading("Signature");
  if (signed) {
    await w.signedLines([
      { label: "Signature", image: signed.signature },
      { label: "Name", text: signed.signerName },
      { label: "Date", text: DATE.format(signed.signedAt) },
    ]);
  } else {
    w.signLines(["Signature", "Date"]);
  }

  w.heading("For office use");
  w.table(
    ["Received on", "Checked by", "Register updated"],
    [[signed ? `${DATE.format(signed.signedAt)} (online)` : "", "", "Yes  /  No"]],
    [0.34, 0.33, 0.33],
    { minRowHeight: 30 },
  );

  return w.finish();
}

// ---------------- 09 Nominee (Next of Kin) Form ----------------

export async function buildNomineeForm(m: PackMember, signed?: SignedNominee): Promise<Uint8Array> {
  const w = await FormWriter.create({
    title: `Nominee (Next of Kin) Form — ${m.memberNo}`,
    subject: `Nominee form for ${m.fullName}`,
    footerEmail: CONTACT.email,
  });

  w.header("Nominee (Next of Kin) Form");
  w.paragraph(
    signed
      ? `Signed online in the HomeBridge member portal on ${DATE.format(signed.signedAt)}. You can change your nominees at any time by submitting a new form; the latest signed form replaces earlier ones.`
      : `Name the person or people who should receive your shares and any balance due if you die. Please sign and return by ${returnByDate(m.admittedAt)}. You can change your nominees at any time by submitting a new form; the latest signed form replaces earlier ones.`,
  );

  w.heading("Member details");
  w.keyValues([
    ["Full name", m.fullName],
    ["Membership number", m.memberNo],
    ["Phone and email", [m.phone, m.email].filter(Boolean).join("  ·  ")],
  ]);

  w.heading("Nominees");
  w.paragraph(
    "In the event of my death, I nominate the person(s) below to receive my shares and any sums due to me from HomeBridge Cooperative, subject to the Bye-laws and applicable law.",
  );
  // Pre-filled with the nominees given at registration, so the member checks rather than rewrites.
  // A contact is filed under Email or Phone by its shape. Spare rows are left for additions.
  const rows = signed
    ? signed.nominees.map((n) => [n.name, n.relationship, n.phone, n.email, n.address, String(n.share)])
    : m.nominees
        .filter((n) => n.name.trim())
        .map((n) => {
          const isEmail = n.contact.includes("@");
          return [n.name, n.relationship, isEmail ? "" : n.contact, isEmail ? n.contact : "", "", String(n.share ?? "")];
        });
  while (!signed && rows.length < 4) rows.push(["", "", "", "", "", ""]);
  w.table(["Full name", "Relationship", "Phone", "Email", "Address", "Share (%)"], rows, [0.2, 0.14, 0.16, 0.2, 0.2, 0.1], {
    size: 8.5,
    minRowHeight: 30,
  });
  if (!signed && m.nominees.some((n) => n.name.trim())) {
    w.paragraph("We have filled in the nominees you gave when you applied. Please correct anything that has changed, and add addresses, before signing.", {
      size: 9.5,
    });
  }
  w.paragraph(
    `Shares must total 100%. If a nominee dies before me, their share is divided equally among the remaining nominees unless I state otherwise here: ${
      signed ? signed.survivorInstruction.trim() || "(no other instruction)" : "______________________________________________"
    }`,
  );

  w.ensure(5 * 30 + 90); // the heading travels with its signature block
  w.heading("Signatures");
  if (signed) {
    await w.signedLines([
      { label: "Member signature", image: signed.signature },
      { label: "Date", text: DATE.format(signed.signedAt) },
      { label: "Witness name", text: signed.witnessName },
      { label: "Witness signature", image: signed.witnessSignature },
      { label: "Witness address", text: signed.witnessAddress },
    ]);
  } else {
    w.signLines(["Member signature", "Date", "Witness name", "Witness signature", "Witness address"]);
  }
  w.paragraph("The witness must be 18 or over and must not be a nominee.", { size: 9.5 });

  w.heading("For office use");
  w.table(
    ["Received on", "Shares total 100%", "Register updated"],
    [[signed ? `${DATE.format(signed.signedAt)} (online)` : "", signed ? "Yes" : "Yes  /  No", "Yes  /  No"]],
    [0.34, 0.33, 0.33],
    { minRowHeight: 30 },
  );

  return w.finish();
}
