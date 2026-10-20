// Data, types and validation for the /register membership application.
// Shared by the client form (components/register) and the server route (app/api/apply),
// so both apply the same bye-law rules (5.1 age and character, 5.2 residence route, 10.1 nominees).

import { FOUNDING_BLOCK, JOINING_FEE, MIN_MONTHLY } from "@/lib/settings";
import { BANK_METHOD, CARD_METHOD } from "@/lib/payment-methods";

/** Long enough to be worth hashing. Length beats punctuation rules. */
export const MIN_PASSWORD_LENGTH = 10;

/** All 36 states plus the Federal Capital Territory. */
export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
  "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

export const OTHER_COUNTRY = "Another country";

/** Where most members live. Anything else goes under "Another country" with a free-text name. */
export const COUNTRIES = [
  "Nigeria", "United Kingdom", "United States", "Canada", "Ireland", "Germany", "Netherlands", "Italy",
  "France", "Spain", "Belgium", "United Arab Emirates", "Saudi Arabia", "Qatar", "South Africa", "Ghana",
  "Kenya", "Australia", OTHER_COUNTRY,
] as const;

const EURO_COUNTRIES = ["Ireland", "Germany", "Netherlands", "Italy", "France", "Spain", "Belgium"];

export const CHAPTERS = ["HomeBridge Edo", "HomeBridge Abuja", "HomeBridge UK", "None yet"] as const;

export const MEMBERSHIP_TYPES = [
  {
    value: "home",
    label: "Home member",
    sub: "Living in Nigeria",
    more: `For people who live in Nigeria. Monthly shares from ₦${MIN_MONTHLY.ngn.toLocaleString("en-GB")}.`,
  },
  {
    value: "diaspora",
    label: "Diaspora member",
    sub: "Living abroad",
    more: `For people who live outside Nigeria. Monthly shares from £${MIN_MONTHLY.gbp}.`,
  },
  {
    value: "founding",
    label: "Founding member",
    sub: `£${FOUNDING_BLOCK.gbp.toLocaleString("en-GB")} / ₦2m block, year one`,
    more: `For people who join in the first 12 months and take a founding block of at least £${FOUNDING_BLOCK.gbp.toLocaleString("en-GB")} or ₦${FOUNDING_BLOCK.ngn.toLocaleString("en-GB")}. Same rights and one vote, like everyone else.`,
  },
  {
    value: "professional",
    label: "Professional member",
    sub: "Pay up to half in skills",
    more: "Up to half of your monthly contribution can be paid in professional hours, at a rate the Board approves.",
  },
  {
    value: "group",
    label: "Group member",
    sub: "Union, church, mosque, business",
    more: "A registered union, cooperative, religious body, association or business joins through one named representative.",
  },
] as const;

export type MemberType = (typeof MEMBERSHIP_TYPES)[number]["value"];
export type Route = "lives" | "land" | "other" | "none";

export const ID_OPTIONS = {
  nigeria: [
    { value: "bvn", label: "BVN", sub: "Bank Verification Number" },
    { value: "nin", label: "NIN", sub: "National Identification Number" },
  ],
  abroad: [
    { value: "nrbvn", label: "Non-Resident BVN", sub: "For Nigerians banking from abroad" },
    { value: "passport", label: "Passport", sub: "Nigerian or other passport" },
  ],
} as const;

export const GROUP_DOC_OPTIONS = [
  { value: "cac", label: "CAC certificate", sub: "Corporate Affairs Commission" },
  { value: "regcert", label: "Another registration certificate", sub: "For example a cooperative, union or religious body" },
] as const;

export type Nominee = { id: string; name: string; relationship: string; contact: string; share: string };

export type Declarations = { character: boolean; bylaws: boolean; risk: boolean; privacy: boolean };

/** Everything the applicant enters. Never holds an ID number or a file. */
export type Draft = {
  contactMethod: "phone" | "email";
  contact: string;
  /** Set at registration so the member can sign in. Never stored or sent back in plain text. */
  password: string;
  passwordConfirm: string;
  fullName: string;
  dob: string; // yyyy-mm-dd
  country: string;
  countryOther: string;
  state: string;
  city: string;
  address: string;
  whatsapp: string;
  email: string;
  occupation: string;
  heard: string;
  chapter: string;
  memberType: MemberType | "";
  route: Route | "";
  routeDetail: string;
  idChoice: string;
  groupName: string;
  repName: string;
  groupDoc: string;
  nominees: Nominee[];
  decl: Declarations;
  supporterConsent: boolean;

  /** How the joining fee was paid, and what the applicant can tell us about it. */
  paymentMethod: string;
  /** Set by the site when Stripe confirms a card payment; proof the member cannot type. */
  stripeSessionId: string;
  datePaid: string;
  paymentReference: string;
  /** Whose account the money came from, when a joint or family account paid. */
  payerName: string;
  receiptConfirmed: boolean;
};

export const newNominee = (share = ""): Nominee => ({
  id: Math.random().toString(36).slice(2, 9),
  name: "",
  relationship: "",
  contact: "",
  share,
});

export const emptyDraft = (): Draft => ({
  contactMethod: "phone",
  contact: "",
  password: "",
  passwordConfirm: "",
  fullName: "",
  dob: "",
  country: "",
  countryOther: "",
  state: "",
  city: "",
  address: "",
  whatsapp: "",
  email: "",
  occupation: "",
  heard: "",
  chapter: "",
  memberType: "",
  route: "",
  routeDetail: "",
  idChoice: "",
  groupName: "",
  repName: "",
  groupDoc: "",
  nominees: [newNominee("100")],
  decl: { character: false, bylaws: false, risk: false, privacy: false },
  supporterConsent: false,
  paymentMethod: "",
  stripeSessionId: "",
  datePaid: "",
  paymentReference: "",
  payerName: "",
  receiptConfirmed: false,
});

// ---------- Steps ----------

export type StepId = "account" | "about" | "join" | "identity" | "nominee" | "fee" | "review" | "supporter";

export const STEP_LABELS: Record<StepId, string> = {
  account: "Account",
  about: "About you",
  join: "How you join",
  identity: "Identity",
  nominee: "Nominee and agreements",
  fee: "Joining fee",
  review: "Check and send",
  supporter: "Supporter list",
};

const MEMBER_FLOW: StepId[] = ["account", "about", "join", "identity", "nominee", "fee", "review"];
const SUPPORTER_FLOW: StepId[] = ["account", "about", "join", "supporter"];

/** Bye-law 5.2: with no link to Edo or the FCT the applicant joins the Supporter list instead. */
export const flowFor = (d: Pick<Draft, "route">): StepId[] => (d.route === "none" ? SUPPORTER_FLOW : MEMBER_FLOW);

// ---------- Helpers ----------

export const livesInNigeria = (d: Pick<Draft, "country">) => d.country === "Nigeria";

export const countryName = (d: Pick<Draft, "country" | "countryOther">) =>
  d.country === OTHER_COUNTRY ? d.countryOther.trim() || "Another country" : d.country;

export const idOptionsFor = (d: Pick<Draft, "country">) => (livesInNigeria(d) ? ID_OPTIONS.nigeria : ID_OPTIONS.abroad);

/** Joining fee by residence (bye-law 6.3): ₦10,000 in Nigeria, £10 abroad or the equivalent. */
export function feeFor(d: Pick<Draft, "country">): { fee: string; note: string | null } {
  if (!d.country) return { fee: `£${JOINING_FEE.gbp} / ₦${JOINING_FEE.ngn.toLocaleString("en-GB")}`, note: "£ abroad, ₦ in Nigeria" };
  if (livesInNigeria(d)) return { fee: `₦${JOINING_FEE.ngn.toLocaleString("en-GB")}`, note: null };
  if (d.country === "United Kingdom") return { fee: `£${JOINING_FEE.gbp}`, note: null };
  if (d.country === "United States") return { fee: `£${JOINING_FEE.gbp}`, note: "or the equivalent in US dollars" };
  if (d.country === "Canada") return { fee: `£${JOINING_FEE.gbp}`, note: "or the equivalent in your currency" };
  if (EURO_COUNTRIES.includes(d.country)) return { fee: `£${JOINING_FEE.gbp}`, note: "or the equivalent in euros" };
  return { fee: `£${JOINING_FEE.gbp}`, note: "or the equivalent in your currency" };
}

export function monthlyFor(d: Pick<Draft, "country">): string {
  if (!d.country) return `£${MIN_MONTHLY.gbp} / ₦${MIN_MONTHLY.ngn.toLocaleString("en-GB")}`;
  return livesInNigeria(d) ? `₦${MIN_MONTHLY.ngn.toLocaleString("en-GB")}` : `£${MIN_MONTHLY.gbp}`;
}

export const typeLabel = (v: string) => MEMBERSHIP_TYPES.find((t) => t.value === v)?.label ?? "";

/** Whole years between a yyyy-mm-dd birth date and today. NaN if the date is not valid. */
export function ageOn(dob: string, today: Date): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return NaN;
  const y = +m[1], mo = +m[2], d = +m[3];
  const birth = new Date(Date.UTC(y, mo - 1, d));
  if (birth.getUTCFullYear() !== y || birth.getUTCMonth() !== mo - 1 || birth.getUTCDate() !== d) return NaN;
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age--;
  return age;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Accepts local or international numbers with spaces, dashes or brackets: 10 to 15 digits. */
export function isPhone(v: string) {
  const s = v.trim().replace(/[\s\-().]/g, "");
  return /^\+?\d{10,15}$/.test(s);
}

export const nomineeTotal = (list: Nominee[]) =>
  list.reduce((sum, n) => sum + (/^\d{1,3}$/.test(n.share.trim()) ? Number(n.share.trim()) : 0), 0);

// ---------- Validation ----------

export type Errors = Record<string, string>;

const need = (e: Errors, key: string, ok: boolean, msg: string) => {
  if (!ok && !e[key]) e[key] = msg;
};

/** Errors for one step, in field order (the form focuses the first one). Keys match field ids. */
export function validateStep(step: StepId, d: Draft, today: Date = new Date()): Errors {
  const e: Errors = {};
  switch (step) {
    case "account": {
      if (d.contactMethod === "phone") {
        need(e, "contact", d.contact.trim() !== "", "Enter your phone number.");
        need(e, "contact", isPhone(d.contact), "Enter a full phone number, for example 0810 583 2602 or +44 7700 900123.");
      } else {
        need(e, "contact", d.contact.trim() !== "", "Enter your email address.");
        need(e, "contact", isEmail(d.contact), "Enter an email address like name@example.com.");
      }
      need(e, "password", d.password.trim().length >= MIN_PASSWORD_LENGTH, `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      need(e, "passwordConfirm", d.passwordConfirm !== "" , "Type your password again.");
      need(e, "passwordConfirm", d.password === "" || d.passwordConfirm === "" || d.password === d.passwordConfirm, "The two passwords don't match.");
      break;
    }
    case "about": {
      need(e, "fullName", d.fullName.trim().length >= 3 && /\s/.test(d.fullName.trim()), "Enter your full name, first and last.");
      const age = ageOn(d.dob, today);
      need(e, "dob", d.dob !== "", "Enter your date of birth.");
      need(e, "dob", !Number.isNaN(age) && age < 120, "Enter a real date of birth.");
      need(e, "dob", !(age < 18), "You need to be 18 or older to join (bye-law 5.1). You are welcome to apply on or after your 18th birthday.");
      need(e, "country", d.country !== "", "Choose the country you live in.");
      if (d.country === OTHER_COUNTRY) need(e, "countryOther", d.countryOther.trim().length >= 2, "Tell us which country you live in.");
      if (livesInNigeria(d)) need(e, "state", (NIGERIAN_STATES as readonly string[]).includes(d.state), "Choose your state.");
      need(e, "city", d.city.trim().length >= 2, "Enter your town or city.");
      need(e, "address", d.address.trim().length >= 6, "Enter your home address.");
      need(e, "whatsapp", d.whatsapp.trim() !== "", "Enter your WhatsApp number.");
      need(e, "whatsapp", isPhone(d.whatsapp), "Enter a full WhatsApp number, with the country code if you live abroad.");
      const emailRequired = d.contactMethod === "phone";
      if (emailRequired || d.email.trim()) need(e, "email", isEmail(d.email), emailRequired ? "Enter your email address." : "Enter an email address like name@example.com.");
      need(e, "occupation", d.occupation.trim().length >= 2, "Tell us your occupation, or say if you are retired or a student.");
      need(e, "heard", d.heard !== "", "Tell us how you heard about HomeBridge.");
      need(e, "chapter", d.chapter !== "", "Choose a chapter, or “None yet”.");
      break;
    }
    case "join": {
      if (d.route !== "none") need(e, "memberType", d.memberType !== "", "Choose a membership type.");
      need(e, "route", d.route !== "", "Choose your link to Edo State or Abuja FCT.");
      if (d.route === "land") need(e, "routeDetail", d.routeDetail.trim().length >= 6, "Tell us where the land or home is, and whose name it is in.");
      if (d.route === "other") need(e, "routeDetail", d.routeDetail.trim().length >= 6, "Tell us about your link to Edo or the FCT.");
      break;
    }
    case "identity": {
      if (d.memberType === "group") {
        need(e, "groupName", d.groupName.trim().length >= 2, "Enter the group’s registered name.");
        need(e, "repName", d.repName.trim().length >= 3, "Enter the representative’s full name.");
        need(e, "groupDoc", GROUP_DOC_OPTIONS.some((o) => o.value === d.groupDoc), "Choose the group’s registration document.");
      }
      need(
        e,
        "idChoice",
        idOptionsFor(d).some((o) => o.value === d.idChoice),
        d.memberType === "group" ? "Choose which ID the representative will use." : "Choose which ID you will use.",
      );
      break;
    }
    case "nominee": {
      if (d.memberType !== "group") {
        d.nominees.forEach((n, i) => {
          need(e, `nominee-${i}-name`, n.name.trim().length >= 3, `Enter nominee ${i + 1}’s full name.`);
          need(e, `nominee-${i}-relationship`, n.relationship.trim().length >= 2, `Enter how nominee ${i + 1} is related to you.`);
          need(e, `nominee-${i}-contact`, isPhone(n.contact) || isEmail(n.contact), `Enter a phone number or email for nominee ${i + 1}.`);
          const s = n.share.trim();
          need(e, `nominee-${i}-share`, /^\d{1,3}$/.test(s) && +s >= 1 && +s <= 100, "Enter a whole number from 1 to 100.");
        });
        need(e, "nomineeTotal", nomineeTotal(d.nominees) === 100, `Shares must add up to exactly 100%. They add up to ${nomineeTotal(d.nominees)}%.`);
      }
      need(e, "decl-character", d.decl.character, "Please confirm the good-character declaration.");
      need(e, "decl-bylaws", d.decl.bylaws, "Please confirm you accept the bye-laws.");
      need(e, "decl-risk", d.decl.risk, "Please confirm you understand the risk notice.");
      need(e, "decl-privacy", d.decl.privacy, "Please confirm you have read the privacy notice.");
      break;
    }
    case "supporter": {
      need(e, "supporterConsent", d.supporterConsent, "Please confirm we may contact you.");
      break;
    }
    case "fee": {
      need(e, "paymentMethod", d.paymentMethod === BANK_METHOD || d.paymentMethod === CARD_METHOD, "Choose how you are paying the joining fee.");
      // The date and reference are optional: a receipt can be uploaded instead, or sent within
      // seven days. They are still checked when given, so a half-typed date is not stored as fact.
      if (d.datePaid) need(e, "datePaid", /^\d{4}-\d{2}-\d{2}$/.test(d.datePaid) && d.datePaid <= today.toISOString().slice(0, 10), "Enter the date you paid. It cannot be in the future.");
      if (d.paymentReference) need(e, "paymentReference", d.paymentReference.trim().length >= 3, "Enter at least 3 characters, or leave it blank.");
      break;
    }
    case "review":
      break;
  }
  return e;
}

/** Index of the first step in the flow that does not pass, or -1 when everything is valid. */
export function firstInvalidStep(d: Draft, today: Date = new Date()): number {
  const flow = flowFor(d);
  return flow.findIndex((s) => Object.keys(validateStep(s, d, today)).length > 0);
}
