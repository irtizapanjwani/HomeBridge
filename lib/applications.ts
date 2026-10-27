// Turns stored registrations into the shape the admin Applications screen already renders.
// Server-only: it reaches the database and handles ID numbers.

import "server-only";
import { collections } from "@/lib/members";
import type { MemberDoc } from "@/lib/members";
import type { Application, AppStatus, KycCheck, MemberType, Region, Society } from "@/lib/admin-data";

export const TYPE: Record<string, MemberType> = {
  home: "Home",
  diaspora: "Diaspora",
  founding: "Founding",
  professional: "Professional",
  group: "Group",
};

/** The HomeBridge form stores a short code; the VEKAT form stores the label the client wrote. */
const ID_TYPE: Record<string, KycCheck["idType"]> = {
  bvn: "BVN",
  nin: "NIN",
  nrbvn: "NR-BVN",
  passport: "Passport",
  "nin (national identification number)": "NIN",
  "non-resident bvn": "NR-BVN",
  "international passport": "Passport",
  "uk/eu/other national id or driving licence": "Passport",
};

// Both the date and the time are read in Lagos. Taking the date from toISOString() and the time
// from here would disagree either side of midnight: 23:30 UTC is 00:30 the next day in Lagos.
// Nigeria keeps one offset all year, so neither needs a daylight-saving caveat.
const LAGOS_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** en-CA gives yyyy-mm-dd, which is the shape the rest of the admin screens compare and sort on. */
export const LAGOS_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const idTypeOf = (v: string) => ID_TYPE[v] ?? ID_TYPE[v.trim().toLowerCase()] ?? "NIN";

const STATUS: Record<MemberDoc["status"], AppStatus> = {
  Submitted: "Submitted",
  "In review": "In review",
  "Info requested": "Info requested",
  Approved: "Approved (fee due)",
  Declined: "Refused",
};

export function regionOf(m: MemberDoc): Region {
  if (m.country === "Nigeria") {
    if (m.state === "Edo") return "NG-ED";
    if (m.state === "FCT (Abuja)") return "NG-FC";
    return "NG-OTHER";
  }
  if (m.country === "United Kingdom") return "UK";
  if (m.country === "United States") return "US";
  if (["Ghana", "Kenya", "South Africa"].includes(m.country)) return "AFRICA";
  return "AFRICA";
}

/**
 * The chapter or cohort the applicant chose decides the society they join. The two sites word it
 * differently ("HomeBridge Abuja" and "Abuja FCT"), so match on the place name.
 */
export const societyOf = (m: MemberDoc): Society => (/abuja|fct/i.test(m.chapter) ? "FC" : "ED");

/** "HomeBridge Edo" and "Edo State (Benin City)" both show as "Edo". */
export const chapterOf = (m: MemberDoc) => {
  const c = m.chapter.replace(/^HomeBridge\s+/i, "").trim();
  if (/abuja|fct/i.test(c)) return "AB";
  if (/^edo/i.test(c)) return "ED";
  return c || "None yet";
};

export const routeKindOf = (m: MemberDoc): Application["routeKind"] =>
  m.memberType === "group" ? "group" : m.route === "lives" || m.route === "land" || m.route === "other" || m.route === "none" ? m.route : "other";

export const ROUTE_LABEL: Record<string, string> = {
  lives: "Lives in Edo State or Abuja FCT",
  land: "Owns or holds land or a home in Edo or FCT",
  other: "Another link (sent for Director approval)",
  none: "No link yet — Supporter list",
};

/**
 * The two forms record declarations differently: HomeBridge keeps one flag per declaration, while
 * the VEKAT form keeps the list of statements ticked and whether all of them were.
 */
function goodCharacterOf(m: MemberDoc): boolean {
  const d = m.declarations as unknown;
  if (!d || typeof d !== "object") return false;
  if ("character" in d) return (d as { character?: boolean }).character === true;
  if ("allAccepted" in d) return (d as { allAccepted?: boolean }).allAccepted === true;
  return false;
}

export function toApplication(m: MemberDoc): Application {
  return {
    id: m.reference,
    name: [m.title, m.fullName].filter(Boolean).join(" ").trim() || m.fullName,
    type: TYPE[m.memberType] ?? "Home",
    society: societyOf(m),
    chapter: chapterOf(m),
    base: m.country === "Nigeria" ? "home" : "diaspora",
    livesIn: [m.city, m.country === "Nigeria" ? m.state : "", m.country].filter(Boolean).join(", "),
    region: regionOf(m),
    routeKind: routeKindOf(m),
    route: ROUTE_LABEL[m.route] ?? m.route ?? "",
    landLocation: m.routeDetail || undefined,
    dob: m.dob,
    goodCharacter: goodCharacterOf(m),
    submittedAt: LAGOS_DATE.format(m.submittedAt),
    submittedTime: LAGOS_TIME.format(m.submittedAt),
    status: m.supporter ? "Supporter" : (STATUS[m.status] ?? "Submitted"),
    source: m.source === "gform" ? "gform" : "web",
    // `source` on the admin type only knows "web" and "gform"; which site it came from is in the note.
    phone: m.whatsapp || m.contact,
    email: m.email,
    // The ID number itself never leaves the server: the screen shows the type and the check result.
    kyc: {
      idType: idTypeOf(m.idChoice),
      provider: "Manual check",
      // Only VEKAT registrations carry a number; a HomeBridge one is checked later with a provider.
      providerRef: m.idNumber ? `On file · ends ${m.idNumber.trim().slice(-4)}` : "Checked at verification",
      liveness: "Not required",
      docMatch: "Pending",
      addressOk: false,
      // An officer's recorded check wins. Without one, the applicant saying they have sent their
      // documents only means the check is waiting to be done, never that it passed.
      result: m.idCheck?.result ?? (m.idDocsEmailed ? "Pending" : "Not started"),
    },
    nominees: m.nominees.map((n) => ({ name: n.name, relationship: n.relationship, percent: n.share })),
    // Issued on approval and never changed afterwards; absent until then.
    ...(m.membership ? { memberNo: m.membership.memberNo } : {}),
    ...(m.decision ? { decidedBy: m.decision.by } : {}),
    ...(m.decision?.reason ? { decisionReason: m.decision.reason } : {}),
    ...(m.receipt ? { receipt: { name: m.receipt.name, type: m.receipt.type, bytes: m.receipt.bytes } } : {}),
    ...(m.payment?.payerName ? { payerName: m.payment.payerName } : {}),
    ...(m.payment?.receiptNo ? { receiptNo: m.payment.receiptNo } : {}),
    ...(m.welcomePack ? { welcomeSentAt: `${LAGOS_DATE.format(m.welcomePack.sentAt)}, ${LAGOS_TIME.format(m.welcomePack.sentAt)}` } : {}),
    note: [
      m.source === "vekat" ? "Registered on vekat.org." : m.source === "gform" ? "Imported from the Google Form." : "",
      m.payment?.status === "Verified"
        ? `Fee verified automatically by ${m.payment.provider ?? "the provider"}${m.payment.amount ? ` — ${m.payment.amount}` : ""}.`
        : m.payment?.status === "Claimed"
          ? `Fee claimed paid — ref ${m.payment.reference || "none given"}, not yet verified.`
          : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined,
  };
}

/** Newest first. The screen filters and sorts further in the browser. */
export async function listApplications(limit = 500): Promise<Application[]> {
  const { members } = await collections();
  // The receipt's bytes are left behind: a few hundred registrations with screenshots attached
  // would otherwise be megabytes of base64 in the admin page's HTML. Its name and size still come
  // through, which is all the screen needs to offer a link.
  const docs = await members
    .find({}, { projection: { "receipt.data": 0 } })
    .sort({ submittedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toApplication);
}

/** The stored receipt for one registration, bytes included. Admin routes only. */
export async function findReceipt(reference: string) {
  const { members } = await collections();
  const doc = await members.findOne({ reference }, { projection: { receipt: 1 } });
  const r = doc?.receipt;
  if (!r || !r.data) return null;
  // The driver returns BSON Binary; .buffer holds the bytes.
  const data = r.data as { buffer?: Uint8Array } | Uint8Array;
  const bytes = data instanceof Uint8Array ? data : data.buffer;
  if (!bytes) return null;
  return { name: r.name, type: r.type, bytes };
}

/** Removes one registration for good. Returns false when there was nothing to remove. */
/**
 * Removes a registration for good, and the person behind it when nothing else refers to them.
 *
 * The people collection is shared with the VEKAT site, so a person is only removed once they hold
 * no other registration and no enquiry: otherwise deleting one test record would cut the link
 * under a real one. Deleting the registration alone would leave the person's name, email and
 * phone behind with nothing pointing at them, which is not what "delete" should mean.
 */
export async function deleteApplication(reference: string) {
  const { members, enquiries, people } = await collections();
  const doc = await members.findOne({ reference }, { projection: { personRef: 1 } });
  if (!doc) return false;

  const res = await members.deleteOne({ reference });
  if (res.deletedCount !== 1) return false;

  if (doc.personRef) {
    const [stillMember, stillEnquiry] = await Promise.all([
      members.countDocuments({ personRef: doc.personRef }, { limit: 1 }),
      enquiries.countDocuments({ personRef: doc.personRef }, { limit: 1 }),
    ]);
    if (stillMember === 0 && stillEnquiry === 0) {
      await people.deleteOne({ reference: doc.personRef });
    }
  }
  return true;
}
