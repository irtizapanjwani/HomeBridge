// Zone codes for the membership number (developer brief, p.5–6).
//
// "ZONE comes from a maintained lookup table: Nigerian state codes plus FCT, and country codes for
// diaspora chapters." A home member takes the code of their state; a diaspora member takes the code
// of the country they live in.
//
// The client has not yet signed off the full list (it is one of the brief's open questions), so
// these are the obvious codes: three letters for Nigerian states, the usual two-letter country
// codes abroad. Changing an entry here changes only the numbers issued from that point on —
// numbers already issued are immutable and are never recalculated.

/** Nigerian states and FCT, keyed by the exact labels the registration form stores. */
export const STATE_ZONES: Record<string, string> = {
  Abia: "ABI",
  Adamawa: "ADA",
  "Akwa Ibom": "AKW",
  Anambra: "ANA",
  Bauchi: "BAU",
  Bayelsa: "BAY",
  Benue: "BEN",
  Borno: "BOR",
  "Cross River": "CRO",
  Delta: "DEL",
  Ebonyi: "EBO",
  Edo: "EDO",
  Ekiti: "EKI",
  Enugu: "ENU",
  "FCT (Abuja)": "FCT",
  Gombe: "GOM",
  Imo: "IMO",
  Jigawa: "JIG",
  Kaduna: "KAD",
  Kano: "KAN",
  Katsina: "KAT",
  Kebbi: "KEB",
  Kogi: "KOG",
  Kwara: "KWA",
  Lagos: "LAG",
  Nasarawa: "NAS",
  Niger: "NIG",
  Ogun: "OGU",
  Ondo: "OND",
  Osun: "OSU",
  Oyo: "OYO",
  Plateau: "PLA",
  Rivers: "RIV",
  Sokoto: "SOK",
  Taraba: "TAR",
  Yobe: "YOB",
  Zamfara: "ZAM",
};

/** Countries the registration form offers, for diaspora members. */
export const COUNTRY_ZONES: Record<string, string> = {
  Nigeria: "NG",
  "United Kingdom": "UK",
  "United States": "US",
  Canada: "CA",
  Ireland: "IE",
  Germany: "DE",
  Netherlands: "NL",
  Italy: "IT",
  France: "FR",
  Spain: "ES",
  Belgium: "BE",
  "United Arab Emirates": "AE",
  "Saudi Arabia": "SA",
  Qatar: "QA",
  "South Africa": "ZA",
  Ghana: "GH",
  Kenya: "KE",
  Australia: "AU",
};

/**
 * Used when a member picked "Another country" and typed a name that is not in the table above.
 * The number stays valid and unique; an officer can see at a glance which records need a proper
 * code once the client confirms the full list.
 */
export const UNKNOWN_ZONE = "INT";

/**
 * The chapters the registration form offers today, mapped to their codes.
 *
 * The zone is the member's *chapter*, not where they happen to live: "ZONE — the member's chapter"
 * (welcome pack), and "if a member later moves chapter, keep their original number and update the
 * zone in the register only". Someone living in Ekiti who joined the Edo chapter is EDO.
 *
 * Chapters are matched loosely, so "HomeBridge Edo" and "Edo State (Benin City)" both give EDO and
 * a renamed chapter keeps working.
 */
const CHAPTER_PATTERNS: { test: RegExp; zone: string }[] = [
  { test: /abuja|fct/i, zone: "FCT" },
  { test: /\bedo\b|benin city/i, zone: "EDO" },
  { test: /united kingdom|\buk\b|britain/i, zone: "UK" },
];

/** True when a member has not picked a chapter yet, so their zone falls back to where they live. */
const NO_CHAPTER = /^\s*$|none yet/i;

export type ZoneInput = {
  /** The member's chapter, e.g. "HomeBridge Edo". Takes precedence over country and state. */
  chapter?: string;
  country: string;
  countryOther?: string;
  state: string;
};

/**
 * Works out the zone code for a member.
 *
 * The chapter decides it. Only when a member has no chapter yet does this fall back to where they
 * live — by state inside Nigeria, by country abroad — so a number can still be issued rather than
 * the approval being blocked. Returns UNKNOWN_ZONE rather than throwing for anything unrecognised.
 */
export function zoneFor({ chapter, country, countryOther, state }: ZoneInput): string {
  const named = (chapter ?? "").trim();
  if (named && !NO_CHAPTER.test(named)) {
    const hit = CHAPTER_PATTERNS.find((c) => c.test.test(named));
    if (hit) return hit.zone;
    // A chapter the patterns do not know yet: try it as a state or country name before giving up,
    // so adding "HomeBridge Lagos" works without a code change.
    const bare = named.replace(/^homebridge\s+/i, "").trim();
    const asState = Object.entries(STATE_ZONES).find(([s]) => s.toLowerCase() === bare.toLowerCase());
    if (asState) return asState[1];
    const asCountry = Object.entries(COUNTRY_ZONES).find(([c]) => c.toLowerCase() === bare.toLowerCase());
    if (asCountry) return asCountry[1];
  }

  if (country === "Nigeria") return STATE_ZONES[state] ?? UNKNOWN_ZONE;
  const byCountry = COUNTRY_ZONES[country];
  if (byCountry) return byCountry;
  // "Another country" with free text: match the typed name against the table before giving up.
  const typed = (countryOther ?? "").trim().toLowerCase();
  if (typed) {
    const hit = Object.entries(COUNTRY_ZONES).find(([name]) => name.toLowerCase() === typed);
    if (hit) return hit[1];
  }
  return UNKNOWN_ZONE;
}
