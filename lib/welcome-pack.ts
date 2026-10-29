// The welcome pack (brief p.4, module 5).
//
//   "Merge member data into the welcome email and pack templates (as in the HomeBridge Welcome
//    Pack doc). Send from info@homebridgecooperative.org with PDFs attached and a link to the member portal.
//    Log send time; allow admin resend."
//
// The wording is email C from the client's own set (10_Email_Set_A-E.docx) with the bracketed
// fields filled in. The sender address is not hard-coded: it comes from EMAIL_FROM, because the
// address written in the client's documents is not the domain the cooperative actually holds.

import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { isWelcomeAutoSend } from "@/lib/app-settings";
import { recordAudit } from "@/lib/audit";
import { sendEmail, type Attachment, type SendResult } from "@/lib/email";
import { buttonBlock, detailsTable, renderTemplate } from "@/lib/email-templates";
import { type MemberDoc, collections } from "@/lib/members";
import { buildCertificate, certificateNoFor } from "@/lib/pdf/certificate";
import { buildDeclarationForm, buildNomineeForm, buildPaymentGuide, returnByDate, type PackMember } from "@/lib/pdf/pack-forms";
import { buildReceipt } from "@/lib/pdf/receipt";
import { JOINING_FEE, MIN_MONTHLY } from "@/lib/settings";

const PACK_DIR = path.join(process.cwd(), "assets", "pack");

/**
 * The documents that are the same for every member, sent as they are. The three per-member forms
 * (payment guide, declaration, nominee form) are generated for each member in lib/pdf/pack-forms.ts.
 * The bye-laws are not here: the client's own pack notes they stay a draft until the AGM adopts them.
 */
const STANDARD_DOCUMENTS: { file: string; filename: string }[] = [
  { file: "03_Member_Handbook.pdf", filename: "HomeBridge Member Handbook.pdf" },
  { file: "05_Investment_Risk_Statement.pdf", filename: "HomeBridge Investment Risk Statement.pdf" },
  { file: "06_Privacy_Notice.pdf", filename: "HomeBridge Privacy Notice.pdf" },
  { file: "07_Governance_and_Contacts.pdf", filename: "HomeBridge Governance and Contacts.pdf" },
];

/** Pack items not sent yet: the bye-laws go out once the AGM adopts them. */
export const PACK_ITEMS_PENDING = ["Bye-laws"];

let standardCache: Promise<Attachment[]> | null = null;
function standardDocuments(): Promise<Attachment[]> {
  standardCache ??= Promise.all(
    STANDARD_DOCUMENTS.map(async ({ file, filename }) => ({
      filename,
      content: await readFile(path.join(PACK_DIR, file)),
    })),
  ).catch((err) => {
    standardCache = null;
    throw err;
  });
  return standardCache;
}

const CATEGORY: Record<string, string> = {
  home: "Home",
  diaspora: "Diaspora",
  founding: "Founding",
  professional: "Professional",
  group: "Group",
};

const DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "long",
  year: "numeric",
});


/** "HomeBridge Edo" reads as "Edo" where the sentence already says "chapter". */
function chapterName(member: MemberDoc) {
  const bare = (member.chapter ?? "").replace(/^HomeBridge\s+/i, "").trim();
  if (!bare || /none yet/i.test(bare)) return member.country === "Nigeria" ? member.state : member.country;
  return bare;
}

export type WelcomePackResult =
  | { ok: true; sentAt: Date; attachments: string[] }
  | { ok: false; error: string; code: "not_found" | "not_admitted" | "send_failed" };

/**
 * Builds and sends the welcome pack for one admitted member.
 *
 * Only possible once a membership number exists: the certificate carries it, and the email is the
 * message that tells the member what it is. The send is recorded on the member record and in the
 * audit log, and calling this again resends — which is what the brief asks for.
 */
export async function sendWelcomePack(
  reference: string,
  actor: string,
  /** The site's address, e.g. https://www.homebridgecooperative.org, for the member portal link. */
  site: string,
): Promise<WelcomePackResult> {
  const { members } = await collections();
  const member = await members.findOne({ reference });
  if (!member) return { ok: false, error: "That registration no longer exists", code: "not_found" };
  if (!member.membership) {
    return { ok: false, error: "This applicant has not been admitted yet", code: "not_admitted" };
  }

  const memberNo = member.membership.memberNo;
  const home = member.country === "Nigeria";
  const minimum = home
    ? `₦${MIN_MONTHLY.ngn.toLocaleString("en-GB")}`
    : `£${MIN_MONTHLY.gbp.toLocaleString("en-GB")}`;
  const category = CATEGORY[member.memberType] ?? (home ? "Home" : "Diaspora");
  const firstName = member.firstName?.trim() || member.fullName.split(/\s+/)[0];

  const packMember: PackMember = {
    fullName: member.fullName,
    memberNo,
    category,
    home,
    chapter: chapterName(member),
    admittedAt: member.membership.admittedAt,
    founding: member.memberType === "founding",
    phone: member.whatsapp || member.contact,
    email: member.email,
    nominees: member.nominees.map((n) => ({ name: n.name, relationship: n.relationship, contact: n.contact, share: n.share })),
  };
  const [handbook, risk, privacy, governance] = await standardDocuments();
  const [guide, declaration, nominee] = await Promise.all([
    buildPaymentGuide(packMember),
    buildDeclarationForm(packMember),
    buildNomineeForm(packMember),
  ]);

  // In the order Email C lists its enclosures.
  const attachments: Attachment[] = [
    handbook,
    { filename: `Contribution and Payment Guide ${memberNo}.pdf`, content: guide },
    risk,
    privacy,
    governance,
    { filename: `Member Declaration Form ${memberNo}.pdf`, content: declaration },
    { filename: `Nominee Form ${memberNo}.pdf`, content: nominee },
  ];

  const certificateNo = certificateNoFor(memberNo);
  attachments.unshift({
    filename: `Membership Certificate ${certificateNo}.pdf`,
    content: await buildCertificate({
      certificateNo,
      fullName: member.fullName,
      memberNo,
      category,
      chapter: chapterName(member),
      admittedAt: member.membership.admittedAt,
      founding: member.memberType === "founding",
    }),
  });

  // Only if the fee has been confirmed: an unissued receipt number has nothing to print.
  if (member.payment?.receiptNo) {
    attachments.splice(1, 0, {
      filename: `Joining Fee Receipt ${member.payment.receiptNo}.pdf`,
      content: await buildReceipt({
        receiptNo: member.payment.receiptNo,
        fullName: member.fullName,
        applicationRef: member.reference,
        memberNo,
        category,
        amount: home ? JOINING_FEE.ngn : JOINING_FEE.gbp,
        currency: home ? "NGN" : "GBP",
        method: member.payment.method || "Not recorded",
        transactionRef: member.payment.reference,
        receivedAt: member.payment.verifiedAt ?? member.updatedAt,
        payee: JOINING_FEE.payee,
        payeeRole: JOINING_FEE.payeeRole,
      }),
    });
  }

  // Brief p.4: the welcome email goes out "with PDFs attached and a link to the member portal".
  const base = site.replace(/\/+$/, "");
  const portal = `${base}/app`;
  // Applicants imported from the Google Form never set a password, so they are sent to set one
  // first; everyone who registered on the site signs in with the password they chose then.
  const hasPassword = Boolean(member.passwordHash);
  const portalStep = hasPassword
    ? "Sign in to the member portal with the email and password you registered with."
    : `Open the member portal. The first time, choose "Forgotten your password?" and enter ${member.email} to set your password.`;

  const admitted = DATE.format(member.membership.admittedAt);
  // Email C. The wording is the office's (Settings → Email templates); the member's details are
  // filled in here.
  const email = await renderTemplate(
    "C",
    {
      FirstName: firstName,
      FullName: member.fullName,
      MemberNo: memberNo,
      Category: category,
      Chapter: chapterName(member),
      DateAdmitted: admitted,
      ReceiptNo: member.payment?.receiptNo ?? "",
      Minimum: minimum,
      ReturnBy: returnByDate(member.membership.admittedAt),
      PortalStep: portalStep,
      PortalLink: portal,
      Manager: JOINING_FEE.payee,
    },
    {
      DETAILS: detailsTable([
        ["Member name", member.fullName],
        ["Membership number", memberNo],
        ["Membership category", `${category} member`],
        ["Zone / Chapter", chapterName(member)],
        ["Date admitted", admitted],
        ...(member.payment?.receiptNo ? ([["Joining fee receipt", member.payment.receiptNo]] as [string, string][]) : []),
      ]),
      BUTTON: buttonBlock("Open the member portal", portal),
    },
  );

  const sent = await sendEmail({ to: member.email, ...email, attachments });
  if (!sent.ok) {
    await recordAudit({
      action: "welcome_pack.failed",
      actor,
      subject: memberNo,
      detail: `Welcome pack could not be sent to ${member.email}: ${sent.error}`,
    }).catch(() => {});
    return { ok: false, error: sent.error, code: "send_failed" };
  }

  const sentAt = new Date();
  const resend = Boolean(member.welcomePack?.sentAt);
  await members.updateOne(
    { reference },
    {
      $set: {
        welcomePack: {
          sentAt,
          to: member.email,
          by: actor,
          messageId: sent.id,
          documents: attachments.map((a) => a.filename),
        },
        updatedAt: sentAt,
      },
    },
  );

  await recordAudit({
    action: resend ? "welcome_pack.resent" : "welcome_pack.sent",
    actor,
    subject: memberNo,
    detail: `Welcome pack ${resend ? "resent" : "sent"} to ${member.email} with ${attachments.length} documents`,
  }).catch(() => {});

  return { ok: true, sentAt, attachments: attachments.map((a) => a.filename) };
}

/**
 * Sends the welcome pack by itself once a member is both approved and has a confirmed fee, if the
 * office has switched automatic sending on (Settings). Called after each of those two events, so
 * it fires on whichever comes second — the brief's "within 5 minutes of approval".
 *
 * Returns true when it sent, false when it tried and the send failed, and null when there was
 * nothing to do (switched off, not yet ready, or already sent).
 */
export async function maybeAutoSendWelcome(reference: string, actor: string, site: string): Promise<boolean | null> {
  if (!(await isWelcomeAutoSend())) return null;
  const { members } = await collections();
  // Claimed in one atomic write: if an approval and a fee confirmation land together, only one of
  // them matches, so the member never gets the pack twice.
  const claim = await members.updateOne(
    {
      reference,
      "membership.memberNo": { $exists: true },
      "payment.receiptNo": { $exists: true },
      welcomePack: { $exists: false },
      welcomeAutoClaim: { $exists: false },
    },
    { $set: { welcomeAutoClaim: new Date() } },
  );
  if (claim.matchedCount === 0) return null;

  const result = await sendWelcomePack(reference, `${actor} (automatic)`, site).catch(() => null);
  // Released whether it worked or not: on success welcomePack now stops any repeat, and on failure
  // an officer can send it by hand or the next trigger can try again.
  await members.updateOne({ reference }, { $unset: { welcomeAutoClaim: "" } });
  return Boolean(result?.ok);
}
