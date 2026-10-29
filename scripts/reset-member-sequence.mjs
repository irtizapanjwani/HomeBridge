/**
 * Sets a counter so the next number issued is the one you give it.
 *
 * For tidying up before go-live, when a test record has used a number a real member should have
 * had. Once real members exist, numbers are never reused (brief p.6) — so this refuses to move a
 * counter back past a number that is actually in use.
 *
 *   node scripts/reset-member-sequence.mjs                  # show the counters and what is in use
 *   node scripts/reset-member-sequence.mjs 2                # next membership number becomes 00002
 *   node scripts/reset-member-sequence.mjs receipt 1        # next receipt number becomes 00001
 *   node scripts/reset-member-sequence.mjs application 1    # next application ref becomes HBA-YYMM-0001
 *
 * Delete the test registration in the admin first: this only moves counters, it does not remove
 * anybody. Reads MONGODB_URI from the environment or a .env file.
 */

import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

/** The env files Next.js itself would read, in the order it reads them. */
const ENV_FILES = [".env.local", ".env.development.local", ".env.development", ".env"];

function loadEnv() {
  if (process.env.MONGODB_URI) return [];
  const read = [];
  for (const name of ENV_FILES) {
    try {
      const text = readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
      read.push(name);
      for (const line of text.split("\n")) {
        const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    } catch {
      // Not present; try the next one.
    }
  }
  return read;
}

const envFilesFound = loadEnv();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set, so this script cannot reach the database.\n");
  console.error(
    envFilesFound.length
      ? `Looked in ${envFilesFound.join(", ")} but found no MONGODB_URI there.`
      : `Looked for ${ENV_FILES.join(", ")} next to the project and found none.`,
  );
  console.error(
    "\nIf the site runs on Vercel, copy the value from Settings > Environment Variables, then:\n" +
      '  PowerShell:  $env:MONGODB_URI="..."; node scripts/reset-member-sequence.mjs\n' +
      '  bash:        MONGODB_URI="..." node scripts/reset-member-sequence.mjs\n' +
      "\nThe string holds the database password: keep it out of commits and chat.",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const which = ["receipt", "member", "application"].includes(args[0]) ? args.shift() : "member";
const arg = args[0];

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "homebridge");
  const counters = db.collection("counters");
  const members = db.collection("members");

  const at = async (id) => (await counters.findOne({ _id: id }))?.value ?? 0;
  const memberSeq = await at("member_seq");
  const receiptSeq = await at("receipt_seq");
  const applicationSeq = await at("application_seq");

  const issued = await members
    .find(
      { "membership.memberNo": { $exists: true } },
      { projection: { "membership.memberNo": 1, "membership.seq": 1, fullName: 1, _id: 0 } },
    )
    .toArray();
  const receipts = await members
    .find(
      { "payment.receiptNo": { $exists: true } },
      { projection: { "payment.receiptNo": 1, fullName: 1, _id: 0 } },
    )
    .toArray();
  const applications = await members
    .find({ reference: /^HBA-/ }, { projection: { reference: 1, fullName: 1, _id: 0 } })
    .toArray();

  console.log(`Membership counter: ${memberSeq} — next ordinary number would be ${memberSeq + 1}.`);
  console.log(
    issued.length
      ? `  in use:\n    ${issued.map((m) => `${m.membership.memberNo}  ${m.fullName}`).join("\n    ")}`
      : "  none issued.",
  );
  console.log(`Receipt counter: ${receiptSeq} — next receipt would be ${receiptSeq + 1}.`);
  console.log(
    receipts.length
      ? `  in use:\n    ${receipts.map((m) => `${m.payment.receiptNo}  ${m.fullName}`).join("\n    ")}`
      : "  none issued.",
  );
  console.log(`Application counter: ${applicationSeq} — next application ref would end ${String(applicationSeq + 1).padStart(4, "0")}.`);
  console.log(
    applications.length
      ? `  in use:\n    ${applications.map((m) => `${m.reference}  ${m.fullName}`).join("\n    ")}`
      : "  none issued.",
  );

  if (arg === undefined) {
    console.log("\nPass the next number you want, e.g. `node scripts/reset-member-sequence.mjs 2`");
    console.log("or, for receipts, `node scripts/reset-member-sequence.mjs receipt 1`,");
    console.log("or, for application refs, `node scripts/reset-member-sequence.mjs application 1`.");
    process.exit(0);
  }

  const next = Number(arg);
  if (!Number.isInteger(next) || next < 1) {
    console.error(`\n"${arg}" is not a whole number of 1 or more.`);
    process.exit(1);
  }

  // Refuse to point a counter at a number something already holds: two records with the same
  // number is the one failure this whole scheme exists to prevent.
  // The running number is always the part after the last dash, whatever its width.
  const digitsOf = (s) => Number(String(s).split("-").pop());
  const clash =
    which === "member"
      ? issued.find((m) => digitsOf(m.membership.memberNo) >= next)
      : which === "receipt"
        ? receipts.find((m) => digitsOf(m.payment.receiptNo) >= next)
        : applications.find((m) => digitsOf(m.reference) >= next);
  if (clash) {
    const held =
      which === "member" ? clash.membership.memberNo : which === "receipt" ? clash.payment.receiptNo : clash.reference;
    console.error(
      `\nRefusing: ${held} (${clash.fullName}) is at or above ${next}, so the next one would ` +
        `reuse a number. Delete that registration in the admin first if it was a test.`,
    );
    process.exit(1);
  }

  const id = { member: "member_seq", receipt: "receipt_seq", application: "application_seq" }[which];
  await counters.updateOne({ _id: id }, { $set: { value: next - 1 } }, { upsert: true });
  const shown = String(next).padStart(which === "application" ? 4 : 5, "0");
  console.log(`\nDone. The next ${which === "member" ? "membership number" : which === "receipt" ? "receipt number" : "application reference"} will end ${shown}.`);
} finally {
  await client.close();
}
