/**
 * Sets the membership counter so the next number issued is the one you give it.
 *
 * For tidying up before go-live, when a test approval has used a number that a real member should
 * have had. Once real members exist, numbers are never reused (brief p.6) — so this refuses to
 * move the counter backwards past a number that is actually in use.
 *
 *   node scripts/reset-member-sequence.mjs            # show where the counter is
 *   node scripts/reset-member-sequence.mjs 2          # next member becomes 00002
 *
 * Reads MONGODB_URI from the environment or .env.local.
 */

import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

function loadEnv() {
  if (process.env.MONGODB_URI) return;
  try {
    for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env.local; the environment is expected to carry MONGODB_URI.
  }
}

loadEnv();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Add it to .env.local or the environment.");
  process.exit(1);
}

const arg = process.argv[2];
const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "homebridge");
  const counters = db.collection("counters");
  const members = db.collection("members");

  const current = (await counters.findOne({ _id: "member_seq" }))?.value ?? 0;
  const issued = await members
    .find({ "membership.memberNo": { $exists: true } }, { projection: { "membership.memberNo": 1, fullName: 1, _id: 0 } })
    .toArray();

  console.log(`Counter is at ${current}; the next ordinary number would be ${current + 1}.`);
  console.log(
    issued.length
      ? `Numbers in use (${issued.length}):\n  ${issued.map((m) => `${m.membership.memberNo}  ${m.fullName}`).join("\n  ")}`
      : "No membership numbers have been issued.",
  );

  if (arg === undefined) {
    console.log("\nPass the next number you want, e.g. `node scripts/reset-member-sequence.mjs 2`.");
    process.exit(0);
  }

  const next = Number(arg);
  if (!Number.isInteger(next) || next < 1) {
    console.error(`\n"${arg}" is not a whole number of 1 or more.`);
    process.exit(1);
  }

  // Refuse to point the counter at a number a member already holds: two members with the same
  // number is the one failure this whole scheme exists to prevent.
  const clash = issued.find((m) => Number(m.membership.memberNo.slice(-5)) >= next);
  if (clash) {
    console.error(
      `\nRefusing: ${clash.membership.memberNo} (${clash.fullName}) is at or above ${next}, so the ` +
        `next member would reuse a number. Delete that registration first if it was a test.`,
    );
    process.exit(1);
  }

  await counters.updateOne({ _id: "member_seq" }, { $set: { value: next - 1 } }, { upsert: true });
  console.log(`\nDone. The next ordinary membership number will be ${String(next).padStart(5, "0")}.`);
} finally {
  await client.close();
}
