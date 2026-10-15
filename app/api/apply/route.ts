import { NextResponse } from "next/server";
import {
  CHAPTERS,
  COUNTRIES,
  GROUP_DOC_OPTIONS,
  ID_OPTIONS,
  MEMBERSHIP_TYPES,
  NIGERIAN_STATES,
  PAYMENT_METHODS,
  SHARE_PLANS,
  TITLE_OPTIONS,
  ageOn,
  emptyDraft,
  fullNameOf,
  firstInvalidStep,
  flowFor,
  validateStep,
  type Draft,
  type MemberType,
  type Nominee,
  type Route,
} from "@/lib/register-data";
import { HEARD_OPTIONS } from "@/lib/content";
import { isDbConfigured } from "@/lib/db";
import { collections, draftToMember, ensureIndexes, makeReference, upsertPerson } from "@/lib/members";

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | "" => {
  const s = str(v, 80);
  return (list as readonly string[]).includes(s) ? (s as T) : "";
};

const ROUTES: Route[] = ["lives", "land", "other", "none"];
const TYPES = MEMBERSHIP_TYPES.map((t) => t.value) as MemberType[];
const ID_VALUES = [...ID_OPTIONS.nigeria, ...ID_OPTIONS.abroad].map((o) => o.value as string);
const DOC_VALUES = GROUP_DOC_OPTIONS.map((o) => o.value as string);
const SHARE_PLAN_VALUES = SHARE_PLANS.map((o) => o.value as string);
const PAYMENT_METHOD_VALUES = PAYMENT_METHODS.map((o) => o.value as string);

/**
 * Rebuilds a Draft from untrusted JSON using only known fields, so anything else in the body
 * is dropped and never stored, forwarded or logged.
 */
function toDraft(body: Record<string, unknown>): Draft {
  const base = emptyDraft();
  const decl = (body.decl ?? {}) as Record<string, unknown>;
  const nominees = Array.isArray(body.nominees) ? body.nominees.slice(0, 5) : [];
  return {
    ...base,
    contactMethod: body.contactMethod === "email" ? "email" : "phone",
    contact: str(body.contact, 120),
    title: oneOf(body.title, TITLE_OPTIONS),
    surname: str(body.surname, 80),
    firstName: str(body.firstName, 80),
    otherNames: str(body.otherNames, 80),
    sex: body.sex === "Male" || body.sex === "Female" ? body.sex : "",
    nationality: str(body.nationality, 60),
    stateOfOrigin: str(body.stateOfOrigin, 80),
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
    idNumber: str(body.idNumber, 40),
    idDocsEmailed: body.idDocsEmailed === true,
    sharePlan: oneOf(body.sharePlan, SHARE_PLAN_VALUES),
    paymentMethod: oneOf(body.paymentMethod, PAYMENT_METHOD_VALUES),
    datePaid: str(body.datePaid, 10),
    paymentReference: str(body.paymentReference, 80),
    receiptEmailed: body.receiptEmailed === true,
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
    decl: {
      individual: decl.individual === true,
      character: decl.character === true,
      bylaws: decl.bylaws === true,
      fee: decl.fee === true,
      sharesAccount: decl.sharesAccount === true,
      risk: decl.risk === true,
      privacy: decl.privacy === true,
      truthful: decl.truthful === true,
    },
    signature: str(body.signature, 120),
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
  const fullName = fullNameOf(draft);

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
    const reference = makeReference(supporter ? "SUP" : "APP");
    await members.insertOne(draftToMember(draft, { reference, personRef, fullName }));

    return NextResponse.json({ ok: true, reference, status: supporter ? "Supporter" : "Submitted" });
  } catch (err) {
    // Never let the error text out: a Mongo error can carry the connection string.
    console.error("[apply] could not store the application:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ ok: false, error: "Could not store application" }, { status: 502 });
  }
}
