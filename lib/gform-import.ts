// Importing the applicants who used the Google Form (brief p.7, acceptance criterion 6: "All
// existing Google Form applicants are imported with application references").
//
// Registration moved to the website, but the people who applied before that are in a Google
// Sheet rather than the database, which would leave the cooperative with two registers.
//
// The client has not supplied the export yet, so columns are matched by header name against a
// list of likely spellings rather than by position. A sheet whose headers read "Full name",
// "full_name" or "Name of applicant" all work, and a column that cannot be matched is reported
// rather than silently dropped. Checking the preview against the real sheet is still worth doing
// the first time.

import "server-only";

import { recordAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import {
  type MemberDoc,
  collections,
  ensureIndexes,
  makeReference,
  normEmail,
  normPhone,
  upsertPerson,
} from "@/lib/members";

/** Header spellings accepted for each field, compared with punctuation and case removed. */
const COLUMNS: Record<string, string[]> = {
  timestamp: ["timestamp", "time", "date", "submitted", "submittedat", "datesubmitted"],
  fullName: ["fullname", "name", "nameofapplicant", "applicantname", "surnameandfirstname"],
  dob: ["dateofbirth", "dob", "birthdate", "datedeborn"],
  country: ["country", "countryofresidence", "countryyouliveing", "countryyouliveiin", "countryyoulivein"],
  state: ["stateorregion", "state", "region", "stateofresidence", "homestate", "stateoforigin"],
  city: ["city", "town", "cityortown"],
  phone: ["whatsapp", "phone", "phonenumber", "mobile", "mobilenumber", "whatsappnumber", "telephone"],
  email: ["email", "emailaddress", "mail", "emailforreceipts"],
  memberType: ["membershiptype", "type", "category", "membershipcategory", "memberype", "membertype"],
  chapter: ["chapter", "zone", "zonechapter", "homecohort", "cohort"],
  route: ["residenceroute", "route", "connectiontoedo", "eligibility", "eligibilityroute"],
  routeDetail: ["landlocation", "landorhome", "details", "routedetail", "locationofland"],
  idChoice: ["idtype", "id", "identification", "identitydocument", "meansofid"],
  occupation: ["occupation", "job", "profession"],
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

export type ColumnMap = Partial<Record<keyof typeof COLUMNS, number>>;

/** Works out which column holds which field, and which headers were not recognised. */
export function mapColumns(headers: string[]): { map: ColumnMap; unmatched: string[] } {
  const map: ColumnMap = {};
  const used = new Set<number>();
  for (const [field, aliases] of Object.entries(COLUMNS)) {
    const i = headers.findIndex((h, idx) => !used.has(idx) && aliases.includes(norm(h)));
    if (i !== -1) {
      map[field as keyof typeof COLUMNS] = i;
      used.add(i);
    }
  }
  const unmatched = headers.filter((h, i) => h.trim() && !used.has(i));
  return { map, unmatched };
}

/** Google Forms dates arrive in several shapes; anything unrecognised is left for a human. */
function toIsoDate(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  // d/m/Y and m/d/Y cannot be told apart below the 13th, so the day-first reading is used:
  // it matches both Nigeria and the UK, where the members are.
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const [, a, b, y] = m;
    const year = y.length === 2 ? `20${y}` : y;
    const day = Number(a);
    const month = Number(b);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

const MEMBER_TYPE: Record<string, string> = {
  home: "home",
  diaspora: "diaspora",
  founding: "founding",
  professional: "professional",
  group: "group",
};

function toMemberType(raw: string, country: string): string {
  const v = norm(raw);
  for (const [key, value] of Object.entries(MEMBER_TYPE)) if (v.includes(key)) return value;
  return /nigeria/i.test(country) ? "home" : "diaspora";
}

export type ParsedRow = {
  /** 1-based row number in the sheet, counting the header, so an officer can find it. */
  line: number;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  country: string;
  state: string;
  memberType: string;
  /** Why this row cannot be imported, if it cannot. */
  problem?: string;
  /** The reference of the existing record this duplicates. */
  duplicateOf?: string;
};

export type ImportPreview = {
  headers: string[];
  unmatched: string[];
  missingFields: string[];
  rows: ParsedRow[];
  importable: number;
  duplicates: number;
  problems: number;
};

/** The fields an import cannot do without. */
const REQUIRED: (keyof typeof COLUMNS)[] = ["fullName"];

/**
 * Reads the sheet and says what would happen, without writing anything.
 *
 * Always run before importing: the column names are a guess until the real export is seen, and a
 * preview that looks wrong is much cheaper than a register full of mangled rows.
 */
export async function previewImport(csv: string): Promise<ImportPreview> {
  const table = parseCsv(csv);
  if (table.length === 0) {
    return { headers: [], unmatched: [], missingFields: [...REQUIRED], rows: [], importable: 0, duplicates: 0, problems: 0 };
  }

  const headers = table[0];
  const { map, unmatched } = mapColumns(headers);
  const missingFields = REQUIRED.filter((f) => map[f] === undefined);

  const { members } = await collections();
  const rows: ParsedRow[] = [];
  const seenEmail = new Set<string>();
  const seenPhone = new Set<string>();

  const at = (r: string[], field: keyof typeof COLUMNS) => {
    const i = map[field];
    return i === undefined ? "" : (r[i] ?? "").trim();
  };

  for (let i = 1; i < table.length; i++) {
    const r = table[i];
    if (r.every((c) => !c.trim())) continue;

    const fullName = at(r, "fullName");
    const email = at(r, "email");
    const phone = at(r, "phone");
    const country = at(r, "country");
    const row: ParsedRow = {
      line: i + 1,
      fullName,
      email,
      phone,
      dob: toIsoDate(at(r, "dob")),
      country,
      state: at(r, "state"),
      memberType: toMemberType(at(r, "memberType"), country),
    };

    if (!fullName) {
      row.problem = "No name";
    } else if (!email && !phone) {
      row.problem = "No email or phone, so this person cannot be contacted or matched";
    } else {
      const emailKey = email ? normEmail(email) : "";
      const phoneKey = phone ? normPhone(phone) : "";
      if ((emailKey && seenEmail.has(emailKey)) || (phoneKey && seenPhone.has(phoneKey))) {
        row.duplicateOf = "another row in this file";
      } else {
        const existing = await members.findOne(
          {
            $or: [
              ...(emailKey ? [{ emailNorm: emailKey }] : []),
              ...(phoneKey ? [{ phoneNorm: phoneKey }] : []),
            ],
          },
          { projection: { reference: 1 } },
        );
        if (existing) row.duplicateOf = existing.reference;
      }
      if (emailKey) seenEmail.add(emailKey);
      if (phoneKey) seenPhone.add(phoneKey);
    }

    rows.push(row);
  }

  return {
    headers,
    unmatched,
    missingFields,
    rows,
    importable: rows.filter((r) => !r.problem && !r.duplicateOf).length,
    duplicates: rows.filter((r) => r.duplicateOf).length,
    problems: rows.filter((r) => r.problem).length,
  };
}

export type ImportResult = {
  imported: number;
  skipped: number;
  references: string[];
};

/**
 * Writes the importable rows as applications, each with its own reference.
 *
 * Imported rows land as Submitted, exactly like a form applicant: they still go through vetting,
 * and nobody gets a membership number from a spreadsheet. No email is sent — these people applied
 * some time ago and a sudden acknowledgement would confuse them.
 */
export async function runImport(csv: string, actor: string): Promise<ImportResult> {
  const preview = await previewImport(csv);
  if (preview.missingFields.length) {
    throw new Error(`The sheet has no column for: ${preview.missingFields.join(", ")}`);
  }

  await ensureIndexes().catch(() => {});
  const { members } = await collections();
  const now = new Date();
  const references: string[] = [];

  for (const row of preview.rows) {
    if (row.problem || row.duplicateOf) continue;

    const reference = makeReference("APP");
    const personRef = await upsertPerson({ name: row.fullName, email: row.email, phone: row.phone });

    const doc: MemberDoc = {
      reference,
      personRef,
      status: "Submitted",
      supporter: false,
      fullName: row.fullName,
      dob: row.dob,
      email: row.email,
      emailNorm: row.email ? normEmail(row.email) : "",
      whatsapp: row.phone,
      phoneNorm: row.phone ? normPhone(row.phone) : "",
      contactMethod: row.email ? "email" : "phone",
      contact: row.email || row.phone,
      country: row.country,
      state: row.state,
      city: "",
      address: "",
      occupation: "",
      heard: "",
      chapter: "",
      memberType: row.memberType,
      route: "",
      routeDetail: "",
      idChoice: "",
      groupName: "",
      repName: "",
      groupDoc: "",
      nominees: [],
      declarations: null,
      source: "gform",
      submittedAt: now,
      updatedAt: now,
    };
    await members.insertOne(doc);
    references.push(reference);
  }

  await recordAudit({
    action: "applications.imported",
    actor,
    subject: `Google Form import`,
    detail: `${references.length} applicants imported, ${preview.duplicates} already on file, ${preview.problems} could not be read`,
  }).catch(() => {});

  return {
    imported: references.length,
    skipped: preview.duplicates + preview.problems,
    references,
  };
}
