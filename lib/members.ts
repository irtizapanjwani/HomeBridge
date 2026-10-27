// The shared registration store. Both HomeBridge and the VEKAT site write here.
//
// Collections
//   people      one document per human, holding the reference everything else is filed under
//   members     a HomeBridge membership application
//   enquiries   a short registration from the VEKAT site
//
// A person is matched across the two sites by email or phone, so registering on both does not
// create two records: the second submission attaches to the person the first one created.

import { Binary, type Collection, type Db } from "mongodb";
import { getDb } from "@/lib/db";
import type { Declarations, Draft, Nominee } from "@/lib/register-data";

/** Reference alphabet without look-alike characters (0/O, 1/I). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeReference(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `${prefix}-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}

/** Lowercased and trimmed, so "A@B.com " and "a@b.com" are the same person. */
export const normEmail = (v: string) => v.trim().toLowerCase();

/** Digits only, keeping the last 10, so +234 810 583 2602 and 08105832602 match. */
export function normPhone(v: string) {
  const digits = v.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export type PersonDoc = {
  reference: string;
  emails: string[];
  phones: string[];
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MemberStatus = "Submitted" | "In review" | "Info requested" | "Approved" | "Declined";
export type PaymentStatus = "Claimed" | "Verified" | "Not matched";

export type MemberDoc = {
  reference: string;
  personRef: string;
  status: MemberStatus;
  supporter: boolean;

  // The VEKAT form collects these; the HomeBridge form does not, so they are optional.
  title?: string;
  firstName?: string;
  surname?: string;
  otherNames?: string;
  sex?: string;
  nationality?: string;
  stateOfOrigin?: string;
  fullName: string;
  dob: string;

  email: string;
  emailNorm: string;
  whatsapp: string;
  phoneNorm: string;
  contactMethod: string;
  contact: string;

  country: string;
  state: string;
  city: string;
  address: string;

  occupation: string;
  heard: string;
  chapter: string;
  memberType: string;
  route: string;
  routeDetail: string;
  idChoice: string;
  /** VEKAT only: the HomeBridge form asks which ID will be used, never the number. */
  idNumber?: string;
  idDocsEmailed?: boolean;
  sharePlan?: string;

  /** VEKAT only: the HomeBridge flow collects the joining fee after approval, not on the form. */
  payment?: {
    status: PaymentStatus;
    method: string;
    datePaid: string;
    reference: string;
    receiptEmailed: boolean;
    /** Set by an admin when the payment is matched to a bank line or card receipt. */
    verifiedAt: Date | null;
    verifiedBy: string | null;
    amount: string | null;
    /** Set by the payment provider's webhook on the VEKAT site, never by the applicant. */
    provider?: string;
    providerRef?: string;
    eventId?: string;
    /** Whose account the money came from, when a joint or family account paid. */
    payerName?: string;
  };

  /**
   * A payment receipt uploaded on the VEKAT form. The bytes stay on the server: the admin screen
   * only ever learns that one exists, and fetches it through a route behind the admin session.
   */
  receipt?: {
    name: string;
    type: string;
    bytes: number;
    data?: unknown;
    uploadedAt: Date;
  };

  groupName: string;
  repName: string;
  groupDoc: string;
  nominees: { name: string; relationship: string; contact: string; share: number }[];
  declarations: Declarations | { accepted: string[]; allAccepted: boolean } | null;
  signature?: string;

  /** scrypt hash of the password set at registration. Never the password itself. */
  passwordHash?: string;

  /**
   * An outstanding password-reset request. Only the token's hash is stored, so a leaked backup
   * cannot be turned into a working reset link.
   */
  passwordReset?: {
    tokenHash: string;
    expiresAt: Date;
    requestedAt: Date;
  };

  /**
   * Set once, when an officer approves the application, and never changed afterwards (brief p.6:
   * "Numbers are immutable after issue; chapter changes update the members table only"). Its
   * absence is what marks an application as not yet admitted.
   */
  membership?: {
    /** HBC-ZONE-YY-NNNNN. */
    memberNo: string;
    /** The zone code at the time of admission; a later move does not renumber the member. */
    zone: string;
    /** The cooperative-wide sequence value behind the last five digits. */
    seq: number;
    admittedAt: Date;
  };

  /**
   * The officer's identity check (brief p.2: the VEKAT Administrator "review[s] applications,
   * verif[ies] ID, approve[s] or decline[s]"). An application cannot be approved until this says
   * Pass, so the check is a deliberate, recorded act rather than something assumed.
   *
   * This records the officer's conclusion, not the documents: ID numbers and images are never
   * stored here.
   */
  idCheck?: {
    result: "Pass" | "Refer" | "Fail";
    /** Optional note, e.g. which document was seen. Never the document number itself. */
    note?: string;
    by: string;
    at: Date;
  };

  /**
   * The most recent vetting decision. Every decision is also appended to the audit log, which is
   * the permanent record; this is just the current state, for the queue to read quickly.
   */
  decision?: {
    outcome: MemberStatus;
    /** Required for a decline, optional otherwise (brief p.4: "decline (with reason)"). */
    reason?: string;
    /** The officer who decided, as recorded in the audit log. */
    by: string;
    at: Date;
  };

  source: "homebridge" | "vekat";
  submittedAt: Date;
  updatedAt: Date;
};

/**
 * A named counter, used for the cooperative-wide membership sequence. Incremented with a single
 * atomic findOneAndUpdate so two officers approving at the same moment can never read the same
 * value. See lib/numbering.ts.
 */
export type CounterDoc = {
  _id: string;
  value: number;
};

/**
 * Append-only record of everything that matters for the audit trail (brief p.6): every approval,
 * every number issued, every change to account details, every view of an ID document.
 *
 * Nothing in the app ever updates or deletes a row here.
 */
export type AuditDoc = {
  /** What happened, e.g. "application.approved", "member.number_issued". */
  action: string;
  /** The officer's name or account id. */
  actor: string;
  /** What it happened to — an application reference or a membership number. */
  subject: string;
  /** Short human-readable summary shown in the admin audit screen. */
  detail: string;
  /** Status before and after, where the action changed one. */
  before?: string;
  after?: string;
  at: Date;
};

export type EnquiryDoc = {
  reference: string;
  personRef: string;
  fullName: string;
  email: string;
  emailNorm: string;
  phone: string;
  phoneNorm: string;
  country: string;
  memberType: string;
  location: string;
  occupation: string;
  notes: string;
  source: "vekat";
  submittedAt: Date;
};

export async function collections(): Promise<{
  db: Db;
  people: Collection<PersonDoc>;
  members: Collection<MemberDoc>;
  enquiries: Collection<EnquiryDoc>;
  counters: Collection<CounterDoc>;
  auditLog: Collection<AuditDoc>;
}> {
  const db = await getDb();
  return {
    db,
    people: db.collection<PersonDoc>("people"),
    members: db.collection<MemberDoc>("members"),
    enquiries: db.collection<EnquiryDoc>("enquiries"),
    counters: db.collection<CounterDoc>("counters"),
    auditLog: db.collection<AuditDoc>("audit_log"),
  };
}

/**
 * Indexes are created on first write. Mongo ignores a createIndex that already matches, so this is
 * cheap to call repeatedly, and it keeps setup out of a separate migration step the client would
 * have to run.
 */
let indexesReady: Promise<void> | null = null;
export function ensureIndexes() {
  indexesReady ??= (async () => {
    const { people, members, enquiries, auditLog } = await collections();
    await Promise.all([
      // A membership number can only ever belong to one member. Sparse, because an application
      // that has not been approved has no membership block at all.
      members.createIndex({ "membership.memberNo": 1 }, { unique: true, sparse: true }),
      auditLog.createIndex({ at: -1 }),
      auditLog.createIndex({ subject: 1 }),
      people.createIndex({ reference: 1 }, { unique: true }),
      people.createIndex({ emails: 1 }),
      people.createIndex({ phones: 1 }),
      members.createIndex({ reference: 1 }, { unique: true }),
      members.createIndex({ personRef: 1 }),
      members.createIndex({ submittedAt: -1 }),
      members.createIndex({ status: 1 }),
      members.createIndex({ "payment.reference": 1 }),
      // Reset links are looked up by token hash on every click, and sparse keeps the index to the
      // handful of members with a request outstanding rather than every member ever.
      members.createIndex({ "passwordReset.tokenHash": 1 }, { sparse: true }),
      enquiries.createIndex({ reference: 1 }, { unique: true }),
      enquiries.createIndex({ personRef: 1 }),
      enquiries.createIndex({ submittedAt: -1 }),
    ]);
  })().catch((err) => {
    // A failed index must not block a registration, but it should not be retried on every request.
    indexesReady = null;
    throw err;
  });
  return indexesReady;
}

/**
 * Finds the person behind an email or phone, or creates one. Any new address or number is added to
 * the existing record, so the two sites converge on one reference per human.
 */
export async function upsertPerson(input: { name: string; email?: string; phone?: string }): Promise<string> {
  const { people } = await collections();
  const email = input.email ? normEmail(input.email) : "";
  const phone = input.phone ? normPhone(input.phone) : "";

  const or = [
    ...(email ? [{ emails: email }] : []),
    ...(phone && phone.length >= 7 ? [{ phones: phone }] : []),
  ];

  const existing = or.length ? await people.findOne({ $or: or }) : null;
  const now = new Date();

  if (existing) {
    await people.updateOne(
      { reference: existing.reference },
      {
        $addToSet: {
          ...(email ? { emails: email } : {}),
          ...(phone ? { phones: phone } : {}),
        },
        $set: { updatedAt: now, ...(input.name ? { name: input.name } : {}) },
      },
    );
    return existing.reference;
  }

  const reference = makeReference("HB");
  await people.insertOne({
    reference,
    emails: email ? [email] : [],
    phones: phone ? [phone] : [],
    name: input.name,
    createdAt: now,
    updatedAt: now,
  });
  return reference;
}

/** Turns a validated Draft into the stored document. */
/** A receipt that the route has already decoded and checked. */
export type StoredReceipt = { name: string; type: string; bytes: number; data: Buffer };

export function draftToMember(
  d: Draft,
  opts: {
    reference: string;
    personRef: string;
    fullName: string;
    passwordHash: string;
    /** The payment receipt the applicant uploaded, already decoded and checked by the route. */
    receipt?: StoredReceipt | null;
  },
): MemberDoc {
  const supporter = d.route === "none";
  const now = new Date();
  const email = d.email || (d.contactMethod === "email" ? d.contact : "");
  const phone = d.whatsapp || (d.contactMethod === "phone" ? d.contact : "");
  return {
    reference: opts.reference,
    personRef: opts.personRef,
    status: supporter ? "Submitted" : "Submitted",
    supporter,

    fullName: opts.fullName,
    dob: d.dob,

    email,
    emailNorm: email ? normEmail(email) : "",
    whatsapp: d.whatsapp,
    phoneNorm: phone ? normPhone(phone) : "",
    contactMethod: d.contactMethod,
    contact: d.contact,

    country: d.country === "Another country" ? d.countryOther : d.country,
    state: d.state,
    city: d.city,
    address: d.address,

    occupation: d.occupation,
    heard: d.heard,
    chapter: d.chapter,
    memberType: supporter ? "" : d.memberType,
    route: d.route,
    routeDetail: d.routeDetail,

    idChoice: d.idChoice,

    groupName: d.groupName,
    repName: d.repName,
    groupDoc: d.groupDoc,
    nominees:
      supporter || d.memberType === "group"
        ? []
        : d.nominees.map((n: Nominee) => ({
            name: n.name,
            relationship: n.relationship,
            contact: n.contact,
            share: Number(n.share) || 0,
          })),
    declarations: supporter ? null : d.decl,

    // Supporters pay nothing, so they carry no fee record at all.
    ...(supporter
      ? {}
      : {
          payment: {
            // Claimed, never Verified: nothing here has been checked against the money yet. An
            // officer verifies it, or the VEKAT Stripe webhook does when it recognises the payment.
            status: "Claimed" as const,
            method: d.paymentMethod,
            datePaid: d.datePaid,
            reference: d.paymentReference,
            receiptEmailed: d.receiptConfirmed,
            payerName: d.payerName,
            verifiedAt: null,
            verifiedBy: null,
            amount: null,
          },
        }),

    ...(opts.receipt
      ? {
          receipt: {
            name: opts.receipt.name,
            type: opts.receipt.type,
            bytes: opts.receipt.bytes,
            data: new Binary(opts.receipt.data),
            uploadedAt: now,
          },
        }
      : {}),

    passwordHash: opts.passwordHash,

    source: "homebridge",
    submittedAt: now,
    updatedAt: now,
  };
}
