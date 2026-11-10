// Builds everything a signed-in member sees about their own record. Used by the website's /app page
// and by GET /api/member/me for the mobile app, so both always show the same thing.

import "server-only";
import type { AccountView } from "@/components/member/Account";
import { findMemberByRef } from "@/lib/member-auth";
import { listDocumentsFor } from "@/lib/documents";
import { INFO_REQUEST_DAYS } from "@/lib/email";
import { returnByDate } from "@/lib/pdf/pack-forms";
import { certificateNoFor } from "@/lib/pdf/certificate";
import { packMemberOf } from "@/lib/welcome-pack";
import { CURRENCIES, contributionsFor, money, periodLabel, periodOf, SHARES_NOTE, sharesFor } from "@/lib/contributions";
import { holidaysFor } from "@/lib/payment-holidays";
import { proofsFor } from "@/lib/payment-proofs";
import { lagosToday } from "@/lib/payment-reminders";
import { transparency } from "@/lib/transparency";
import { ideasFor, motionsForMember } from "@/lib/votes";
import { meetingForMember } from "@/lib/meetings";

const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const TYPE_LABEL: Record<string, string> = {
  home: "Home member",
  diaspora: "Diaspora member",
  founding: "Founding member",
  professional: "Professional member",
  group: "Group member",
};

const ID_LABEL: Record<string, string> = {
  bvn: "BVN",
  nin: "NIN",
  nrbvn: "Non-Resident BVN",
  passport: "Passport",
};

const PAYMENT_METHOD: Record<string, string> = {
  bank: "Bank transfer",
  card: "Card payment",
};

const date = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v)
    ? new Date(`${v}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : v;

/** The account view for one member reference, or null if there is no such record. */
export async function buildAccountView(ref: string): Promise<AccountView | null> {
  const m = await findMemberByRef(ref);
  if (!m) return null;

  // A failure to read documents must not take the whole account page down with it.
  const documents = (await listDocumentsFor([m.reference]).catch(() => new Map())).get(m.reference) ?? [];

  // Contribution history and share balance (brief Phase 2 member portal). Never takes the page down.
  const contribs = m.membership ? await contributionsFor(m.reference).catch(() => []) : [];
  const proofs = m.membership ? await proofsFor(m.reference).catch(() => []) : [];
  const holidays = m.membership ? await holidaysFor(m.reference).catch(() => []) : [];
  // Each of these is optional: a failure leaves its card out rather than taking the page down.
  const [glance, motions, ideas, meeting] = m.membership
    ? await Promise.all([
        transparency().catch(() => undefined),
        motionsForMember(m.membership.memberNo).catch(() => undefined),
        ideasFor(m.reference).catch(() => undefined),
        meetingForMember(m.membership.memberNo).catch(() => null),
      ])
    : [undefined, undefined, undefined, null];
  const SHORT = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });

  const view: AccountView = {
    reference: m.reference,
    ...(m.membership ? { memberNo: m.membership.memberNo } : {}),
    firstName: m.firstName || m.fullName.trim().split(/\s+/)[0] || "",
    fullName: [m.title, m.fullName].filter(Boolean).join(" ").trim(),
    status: m.status,
    supporter: m.supporter,
    memberType: TYPE_LABEL[m.memberType] ?? "",
    chapter: m.chapter,
    submittedAt: m.submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    email: m.email,
    whatsapp: m.whatsapp || m.contact,
    livesIn: [m.city, m.country === "Nigeria" ? m.state : "", m.country].filter(Boolean).join(", "),
    idLabel: ID_LABEL[m.idChoice] ?? "",
    nominees: m.nominees.map((n) => ({ name: n.name, relationship: n.relationship, share: n.share })),
    documents,
    // What the officer asked for, shown while the request is open (Email B says the same).
    ...(m.status === "Info requested" && m.decision
      ? {
          infoRequest: {
            needed: m.decision.reason ?? "",
            by: LONG_DATE.format(new Date(m.decision.at.getTime() + INFO_REQUEST_DAYS * 86_400_000)),
          },
        }
      : {}),
    ...(m.infoResponse ? { infoRepliedAt: LONG_DATE.format(m.infoResponse.at) } : {}),
    ...(m.membership
      ? {
          contributions: {
            items: contribs.map((c) => ({
              receiptNo: c.receiptNo,
              period: periodLabel(c.period),
              amount: money(c.amount, c.currency),
              paidAt: SHORT.format(c.paidAt),
            })),
            totals: CURRENCIES.map((cur) => [cur, contribs.filter((c) => c.currency === cur).reduce((t, c) => t + c.amount, 0)] as const)
              .filter(([, t]) => t > 0)
              .map(([cur, t]) => money(t, cur)),
            shares: Math.round(contribs.reduce((t, c) => t + (sharesFor(c.amount, c.currency) ?? 0), 0) * 100) / 100,
            note: SHARES_NOTE,
            currency: m.country === "Nigeria" ? ("NGN" as const) : ("GBP" as const),
            proofs: proofs.map((p) => ({
              id: String(p._id),
              amount: money(p.amount, p.currency),
              period: periodLabel(p.period),
              status: p.status,
              sentAt: SHORT.format(p.submittedAt),
              reason: p.reason ?? "",
              receiptNo: p.receiptNo ?? "",
            })),
            thisMonth: lagosToday().period,
            firstMonth: periodOf(m.membership.admittedAt),
            holidays: holidays.map((h) => ({ id: h.id, months: h.months, status: h.status, note: h.note })),
          },
        }
      : {}),
    contact: { whatsapp: m.whatsapp || m.contact, address: m.address ?? "", city: m.city ?? "" },
    ...(glance ? { glance } : {}),
    ...(motions ? { motions } : {}),
    ...(meeting ? { meeting } : {}),
    ...(ideas ? { ideas } : {}),
    ...(packMemberOf(m)
      ? {
          membership: {
            memberNo: packMemberOf(m)!.memberNo,
            certificateNo: certificateNoFor(packMemberOf(m)!.memberNo),
            category: packMemberOf(m)!.category,
            chapter: packMemberOf(m)!.chapter,
            admittedAt: LONG_DATE.format(packMemberOf(m)!.admittedAt),
            ...(m.payment?.receiptNo ? { receiptNo: m.payment.receiptNo } : {}),
          },
        }
      : {}),
    ...(m.membership
      ? {
          forms: {
            dueBy: returnByDate(m.membership.admittedAt),
            memberName: m.fullName,
            ...(m.forms?.declaration
              ? { declaration: { signedAt: LONG_DATE.format(m.forms.declaration.signedAt), documentId: m.forms.declaration.documentId } }
              : {}),
            ...(m.forms?.nominee
              ? { nominee: { signedAt: LONG_DATE.format(m.forms.nominee.signedAt), documentId: m.forms.nominee.documentId } }
              : {}),
            // The last signed list if there is one, otherwise the nominees given at registration.
            nomineeDefaults: m.forms?.nominee
              ? m.forms.nominee.nominees.map((n) => ({ ...n, share: String(n.share) }))
              : m.nominees
                  .filter((n) => n.name.trim())
                  .map((n) => ({
                    name: n.name,
                    relationship: n.relationship,
                    phone: n.contact.includes("@") ? "" : n.contact,
                    email: n.contact.includes("@") ? n.contact : "",
                    address: "",
                    share: String(n.share),
                  })),
          },
        }
      : {}),
    payment: m.payment
      ? {
          claimed: m.payment.status === "Claimed",
          verified: m.payment.status === "Verified",
          method: PAYMENT_METHOD[m.payment.method] ?? m.payment.method,
          datePaid: date(m.payment.datePaid),
          reference: m.payment.reference,
        }
      : null,
  };

  return view;
}
