// Data, types and validation for the /register membership application.
// Shared by the client form (components/register) and the server route (app/api/apply),
// so both apply the same bye-law rules (5.1 age and character, 5.2 residence route, 10.1 nominees).

import { FOUNDING_BLOCK, JOINING_FEE, MIN_MONTHLY } from "@/lib/settings";

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

export const TITLE_OPTIONS = ["Mr", "Mrs", "Miss", "Ms", "Dr", "Prof", "Chief", "Engr", "Pastor", "Rev", "Other"] as const;

export const SEX_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
] as const;

/** Bye-law 11.2: the monthly minimum by residence, plus the year-one founding block. */
export const SHARE_PLANS = [
  { value: "home-min", label: `Home minimum`, sub: `₦${MIN_MONTHLY.ngn.toLocaleString("en-GB")} a month (${MIN_MONTHLY.ngn / 1000} shares)` },
  { value: "diaspora-min", label: `Diaspora minimum`, sub: `£${MIN_MONTHLY.gbp} a month` },
  { value: "founding", label: "Founding block", sub: `₦${FOUNDING_BLOCK.ngn.toLocaleString("en-GB")} or £${FOUNDING_BLOCK.gbp.toLocaleString("en-GB")}` },
  { value: "other", label: "Another amount", sub: "Tell us on the next step or by WhatsApp" },
] as const;

export const PAYMENT_METHODS = [
  { value: "bank", label: "Bank transfer", sub: `${JOINING_FEE.bankAccount.bank} · ₦${JOINING_FEE.ngn.toLocaleString("en-GB")}` },
  { value: "card", label: "Card payment link", sub: `£${JOINING_FEE.gbp}` },
] as const;

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

export type Declarations = {
  individual: boolean;
  character: boolean;
  bylaws: boolean;
  fee: boolean;
  sharesAccount: boolean;
  risk: boolean;
  privacy: boolean;
  truthful: boolean;
};

/** Everything the applicant enters. */
export type Draft = {
  contactMethod: "phone" | "email";
  contact: string;
  title: string;
  surname: string;
  firstName: string;
  otherNames: string;
  sex: string;
  nationality: string;
  stateOfOrigin: string;
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
  idNumber: string;
  idDocsEmailed: boolean;
  sharePlan: string;
  paymentMethod: string;
  datePaid: string; // yyyy-mm-dd
  paymentReference: string;
  receiptEmailed: boolean;
  groupName: string;
  repName: string;
  groupDoc: string;
  nominees: Nominee[];
  decl: Declarations;
  signature: string;
  supporterConsent: boolean;
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
  title: "",
  surname: "",
  firstName: "",
  otherNames: "",
  sex: "",
  nationality: "",
  stateOfOrigin: "",
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
  idNumber: "",
  idDocsEmailed: false,
  sharePlan: "",
  paymentMethod: "",
  datePaid: "",
  paymentReference: "",
  receiptEmailed: false,
  groupName: "",
  repName: "",
  groupDoc: "",
  nominees: [newNominee("100")],
  decl: {
    individual: false,
    character: false,
    bylaws: false,
    fee: false,
    sharesAccount: false,
    risk: false,
    privacy: false,
    truthful: false,
  },
  signature: "",
  supporterConsent: false,
});

// ---------- Steps ----------

export type StepId = "account" | "about" | "join" | "identity" | "payment" | "nominee" | "review" | "supporter";

export const STEP_LABELS: Record<StepId, string> = {
  account: "Account",
  about: "About you",
  join: "How you join",
  identity: "Identity",
  payment: "Registration fee",
  nominee: "Nominee and agreements",
  review: "Check and send",
  supporter: "Supporter list",
};

const MEMBER_FLOW: StepId[] = ["account", "about", "join", "identity", "payment", "nominee", "review"];
const SUPPORTER_FLOW: StepId[] = ["account", "about", "join", "supporter"];

/** Bye-law 5.2: with no link to Edo or the FCT the applicant joins the Supporter list instead. */
export const flowFor = (d: Pick<Draft, "route">): StepId[] => (d.route === "none" ? SUPPORTER_FLOW : MEMBER_FLOW);

// ---------- Helpers ----------

export const livesInNigeria = (d: Pick<Draft, "country">) => d.country === "Nigeria";

/** First name, any other names, then surname — the order the register of members uses. */
export const fullNameOf = (d: Pick<Draft, "firstName" | "otherNames" | "surname">) =>
  [d.firstName.trim(), d.otherNames.trim(), d.surname.trim()].filter(Boolean).join(" ");

export const sharePlanLabel = (v: string) => {
  const p = SHARE_PLANS.find((s) => s.value === v);
  return p ? `${p.label} — ${p.sub}` : "";
};

export const paymentMethodLabel = (v: string) => {
  const m = PAYMENT_METHODS.find((p) => p.value === v);
  return m ? `${m.label} (${m.sub})` : "";
};

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
      break;
    }
    case "about": {
      need(e, "title", (TITLE_OPTIONS as readonly string[]).includes(d.title), "Choose a title.");
      need(e, "firstName", d.firstName.trim().length >= 2, "Enter your first name.");
      need(e, "surname", d.surname.trim().length >= 2, "Enter your surname.");
      need(e, "sex", d.sex === "Male" || d.sex === "Female", "Choose an option.");
      need(e, "nationality", d.nationality.trim().length >= 2, "Enter your nationality.");
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
      if (d.route !== "none") {
        need(e, "sharePlan", SHARE_PLANS.some((p) => p.value === d.sharePlan), "Choose how much you plan to contribute.");
      }
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
      need(e, "idNumber", d.idNumber.trim().length >= 6, "Enter the ID number.");
      need(e, "idDocsEmailed", d.idDocsEmailed, "Please confirm you have sent, or will send, your ID and proof of address.");
      break;
    }
    case "payment": {
      need(e, "paymentMethod", PAYMENT_METHODS.some((p) => p.value === d.paymentMethod), "Choose how you paid.");
      need(e, "datePaid", d.datePaid !== "", "Enter the date you paid.");
      need(e, "paymentReference", d.paymentReference.trim().length >= 3, "Enter the payment reference or transaction ID.");
      need(e, "receiptEmailed", d.receiptEmailed, "Please confirm you have emailed your receipt.");
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
      need(e, "decl-individual", d.decl.individual, "Please confirm you are applying as an individual and are 18 or older.");
      need(e, "decl-character", d.decl.character, "Please confirm the good-character declaration.");
      need(e, "decl-bylaws", d.decl.bylaws, "Please confirm you accept the bye-laws.");
      need(e, "decl-fee", d.decl.fee, "Please confirm you understand the registration fee.");
      need(e, "decl-sharesAccount", d.decl.sharesAccount, "Please confirm where share money is paid.");
      need(e, "decl-risk", d.decl.risk, "Please confirm you understand the risk notice.");
      need(e, "decl-privacy", d.decl.privacy, "Please confirm you have read the privacy notice.");
      need(e, "decl-truthful", d.decl.truthful, "Please confirm your answers are true and complete.");
      break;
    }
    case "supporter": {
      need(e, "supporterConsent", d.supporterConsent, "Please confirm we may contact you.");
      break;
    }
    case "review": {
      const name = fullNameOf(d).toLowerCase().replace(/\s+/g, " ");
      const signed = d.signature.trim().toLowerCase().replace(/\s+/g, " ");
      need(e, "signature", signed !== "", "Type your full name to sign.");
      need(e, "signature", signed === "" || signed === name, "Your signature needs to match your full name exactly.");
      break;
    }
  }
  return e;
}

/** Index of the first step in the flow that does not pass, or -1 when everything is valid. */
export function firstInvalidStep(d: Draft, today: Date = new Date()): number {
  const flow = flowFor(d);
  return flow.findIndex((s) => Object.keys(validateStep(s, d, today)).length > 0);
}
