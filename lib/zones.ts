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

export type ZoneInput = {
  country: string;
  countryOther?: string;
  state: string;
};

/**
 * Works out the zone code for a member. Nigeria-resident members are zoned by state, everyone else
 * by country. Returns UNKNOWN_ZONE rather than throwing, so an approval is never blocked by a
 * country missing from the table.
 */
export function zoneFor({ country, countryOther, state }: ZoneInput): string {
  if (country === "Nigeria") return STATE_ZONES[state] ?? UNKNOWN_ZONE;
  const named = COUNTRY_ZONES[country];
  if (named) return named;
  // "Another country" with free text: match the typed name against the table before giving up.
  const typed = (countryOther ?? "").trim().toLowerCase();
  if (typed) {
    const hit = Object.entries(COUNTRY_ZONES).find(([name]) => name.toLowerCase() === typed);
    if (hit) return hit[1];
  }
  return UNKNOWN_ZONE;
}
