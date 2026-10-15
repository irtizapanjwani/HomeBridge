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
  firstInvalidStep,
  flowFor,
  validateStep,
  type Draft,
  type MemberType,
  type Nominee,
  type Route,
} from "@/lib/register-data";
import { HEARD_OPTIONS } from "@/lib/content";

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

/** Reference alphabet without look-alike characters (0/O, 1/I). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeReference(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `${prefix}-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}

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
 * Receives membership applications from /register (preview).
 * Set APPLY_WEBHOOK_URL (e.g. a Zapier/Make hook, Google Apps Script or CRM endpoint) to forward
 * each application as JSON. Without it, applications are only written to the server log.
 *
 * Applications carry an ID number, so before this handles real members: send it only over HTTPS to a
 * destination with access control, and keep it out of any general-purpose log.
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
  const reference = makeReference(supporter ? "SUP" : "APP");
  const { decl, nominees, ...rest } = draft;
  const entry = {
    reference,
    status: supporter ? "Supporter" : "Submitted",
    ...rest,
    memberType: supporter ? "" : rest.memberType,
    nominees: supporter || draft.memberType === "group" ? [] : nominees.map(({ id: _id, ...n }) => ({ ...n, share: Number(n.share) })),
    declarations: supporter ? null : decl,
    preview: true,
    receivedAt: today.toISOString(),
  };

  const hook = process.env.APPLY_WEBHOOK_URL;
  if (hook) {
    const res = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => null);
    if (!res || !res.ok) {
      return NextResponse.json({ ok: false, error: "Could not store application" }, { status: 502 });
    }
  } else {
    const { idNumber: _idNumber, ...safe } = entry;
    console.info("[apply]", JSON.stringify({ ...safe, idNumber: "[not logged]" }));
  }

  return NextResponse.json({ ok: true, reference, status: entry.status });
}
