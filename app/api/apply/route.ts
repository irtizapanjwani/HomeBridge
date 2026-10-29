import { NextResponse } from "next/server";
import {
  CHAPTERS,
  COUNTRIES,
  GROUP_DOC_OPTIONS,
  ID_OPTIONS,
  MEMBERSHIP_TYPES,
  NIGERIAN_STATES,
  ageOn,
  emptyDraft,
  feeFor,
  firstInvalidStep,
  flowFor,
  validateStep,
  type Draft,
  type MemberType,
  type Nominee,
  type Route,
} from "@/lib/register-data";
import { HEARD_OPTIONS } from "@/lib/content";
import { isEmailConfigured, sendApplicationConfirmation } from "@/lib/email";
import { BANK_METHOD, CARD_METHOD } from "@/lib/payment-methods";
import { RECEIPT_MAX_BASE64, RECEIPT_MAX_BYTES, isReceiptType } from "@/lib/receipt";
import { isDbConfigured } from "@/lib/db";
import { collections, draftToMember, ensureIndexes, makeReference, upsertPerson, type StoredReceipt } from "@/lib/members";
import { issueApplicationRef } from "@/lib/numbering";
import { createMemberSession, hashPassword, isMemberAuthConfigured, passwordProblem } from "@/lib/member-auth";

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | "" => {
  const s = str(v, 80);
  return (list as readonly string[]).includes(s) ? (s as T) : "";
};

const ROUTES: Route[] = ["lives", "land", "other", "none"];
const TYPES = MEMBERSHIP_TYPES.map((t) => t.value) as MemberType[];
const ID_VALUES = [...ID_OPTIONS.nigeria, ...ID_OPTIONS.abroad].map((o) => o.value as string);
const DOC_VALUES = GROUP_DOC_OPTIONS.map((o) => o.value as string);

/**
 * Decodes an uploaded payment receipt, or returns null.
 *
 * Never throws and never fails the application: a receipt that is the wrong type or too large is
 * dropped with a log line, because it can be chased by email while a refused application cannot.
 */
function toReceipt(raw: unknown): StoredReceipt | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const type = str(r.type, 80);
  const data = typeof r.data === "string" ? r.data : "";
  if (!isReceiptType(type) || !data || data.length > RECEIPT_MAX_BASE64) {
    console.warn("[apply] a receipt was dropped: unsupported type or too large");
    return null;
  }
  // Base64 of the wrong thing decodes to something far shorter than it claimed.
  const bytes = Buffer.from(data, "base64");
  if (bytes.length === 0 || bytes.length > RECEIPT_MAX_BYTES) {
    console.warn("[apply] a receipt was dropped: decoded size out of range");
    return null;
  }
  return { name: str(r.name, 120) || "receipt", type, bytes: bytes.length, data: bytes };
}

/**
 * Rebuilds a Draft from untrusted JSON using only known fields, so anything else in the body
 * (for example an ID number) is dropped and never stored, forwarded or logged.
 */
function toDraft(body: Record<string, unknown>): Draft {
  const base = emptyDraft();
  const decl = (body.decl ?? {}) as Record<string, unknown>;
  const nominees = Array.isArray(body.nominees) ? body.nominees.slice(0, 5) : [];
  return {
    ...base,
    contactMethod: body.contactMethod === "email" ? "email" : "phone",
    contact: str(body.contact, 120),
    // Never trimmed or truncated: a password is used exactly as typed.
    password: typeof body.password === "string" ? body.password : "",
    passwordConfirm: typeof body.passwordConfirm === "string" ? body.passwordConfirm : "",
    fullName: str(body.fullName, 120),
    dob: str(body.dob, 10),
    country: oneOf(body.country, COUNTRIES),
    countryOther: str(body.countryOther, 80),
    state: oneOf(body.state, NIGERIAN_STATES),
    city: str(body.city, 80),
    address: str(body.address, 300),
    whatsapp: str(body.whatsapp, 40),
    email: str(body.email, 120),
    occupation: str(body.occupation, 100),
    heard: oneOf(body.heard, HEARD_OPTIONS),
    chapter: oneOf(body.chapter, CHAPTERS),
    memberType: oneOf(body.memberType, TYPES),
    route: oneOf(body.route, ROUTES),
    routeDetail: str(body.routeDetail, 400),
    idChoice: oneOf(body.idChoice, ID_VALUES),
    groupName: str(body.groupName, 160),
    repName: str(body.repName, 120),
    groupDoc: oneOf(body.groupDoc, DOC_VALUES),
    nominees: nominees.map((raw, i): Nominee => {
      const n = (raw ?? {}) as Record<string, unknown>;
      return {
        id: String(i + 1),
        name: str(n.name, 120),
        relationship: str(n.relationship, 60),
        contact: str(n.contact, 120),
        share: str(n.share, 3),
      };
    }),
    paymentMethod: oneOf(body.paymentMethod, [BANK_METHOD, CARD_METHOD]),
    stripeSessionId: str(body.stripeSessionId, 80),
    datePaid: str(body.datePaid, 10),
    paymentReference: str(body.paymentReference, 80),
    payerName: str(body.payerName, 120),
    receiptConfirmed: body.receiptConfirmed === true,
    decl: {
      character: decl.character === true,
      bylaws: decl.bylaws === true,
      risk: decl.risk === true,
      privacy: decl.privacy === true,
    },
    supporterConsent: body.supporterConsent === true,
  };
}

/**
 * Receives membership applications from /register and stores them in the shared database
 * (see lib/members.ts). The VEKAT site writes to the same database, so one person has one
 * reference across both.
 *
 * Applications carry an ID number: it is stored, never logged, and never returned to the browser.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const draft = toDraft(body);
  const receipt = toReceipt(body.receipt);
  const today = new Date();
  const flow = flowFor(draft);
  const bad = firstInvalidStep(draft, today);
  if (bad !== -1) {
    const step = flow[bad];
    return NextResponse.json(
      { ok: false, error: "Some answers need checking", step, fields: Object.keys(validateStep(step, draft, today)) },
      { status: 422 },
    );
  }
  // Belt and braces for bye-law 5.1(a): computed here, not trusted from the browser.
  if (!(ageOn(draft.dob, today) >= 18)) {
    return NextResponse.json({ ok: false, error: "Applicants must be 18 or older", step: "about" }, { status: 422 });
  }

  const supporter = draft.route === "none";
  const fullName = draft.fullName;

  const badPassword = passwordProblem(draft.password);
  if (badPassword) {
    return NextResponse.json({ ok: false, error: badPassword, step: "account", fields: ["password"] }, { status: 422 });
  }
  if (!isMemberAuthConfigured()) {
    console.error("[apply] MEMBER_SESSION_SECRET is not set — members could not sign in.");
    return NextResponse.json({ ok: false, error: "Registration is not configured" }, { status: 503 });
  }

  if (!isDbConfigured()) {
    console.error("[apply] MONGODB_URI is not set — the application was not stored.");
    return NextResponse.json({ ok: false, error: "Registration storage is not configured" }, { status: 503 });
  }

  try {
    await ensureIndexes();
    const personRef = await upsertPerson({
      name: fullName,
      email: draft.email || (draft.contactMethod === "email" ? draft.contact : ""),
      phone: draft.whatsapp || (draft.contactMethod === "phone" ? draft.contact : ""),
    });

    const { members } = await collections();
    // An applicant gets an application reference (HBA-YYMM-NNNN) here. Their membership number is
    // issued only when VEKAT approves them (lib/decisions.ts), so declined applicants never use one
    // up. Supporters are not members and never get either.
    const reference = supporter ? makeReference("SUP") : await issueApplicationRef(today);
    const passwordHash = await hashPassword(draft.password);
    await members.insertOne(draftToMember(draft, { reference, personRef, fullName, passwordHash, receipt }));

    // Signed in straight away, so they land in their account rather than a sign-in form.
    await createMemberSession(reference);

    // Sent only after the record is safely stored, and a mail failure never fails the
    // application: the applicant has their reference on screen either way, and the error is
    // logged so it can be chased. The address is never logged with the error.
    const to = draft.email || (draft.contactMethod === "email" ? draft.contact : "");
    if (isEmailConfigured() && to) {
      const sent = await sendApplicationConfirmation({
        to,
        firstName: fullName.trim().split(/\s+/)[0] ?? "",
        reference,
        supporter,
        fee: supporter ? undefined : feeFor(draft).fee,
        paymentMethod: draft.paymentMethod,
        paymentReference: draft.paymentReference,
      });
      if (!sent.ok) console.error("[apply] confirmation email not sent:", sent.error);
    } else if (!isEmailConfigured()) {
      console.warn("[apply] RESEND_API_KEY is not set — no confirmation email was sent.");
    }

    return NextResponse.json({ ok: true, reference, status: supporter ? "Supporter" : "Submitted" });
  } catch (err) {
    // Never let the error text out: a Mongo error can carry the connection string.
    console.error("[apply] could not store the application:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not store application" }, { status: 502 });
  }
}
