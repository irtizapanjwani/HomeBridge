// Settings the office changes from the admin screen, kept in the database so they apply at once
// without a redeploy. Every change is written to the audit log.

import "server-only";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";

type SettingDoc = { _id: string; value: unknown; updatedAt: Date; updatedBy: string };

async function settings() {
  return (await getDb()).collection<SettingDoc>("settings");
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const doc = await (await settings()).findOne({ _id: key });
  return doc ? (doc.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown, actor: string, detail: string, before?: string, after?: string) {
  await (await settings()).updateOne(
    { _id: key },
    { $set: { value, updatedAt: new Date(), updatedBy: actor } },
    { upsert: true },
  );
  await recordAudit({ action: "settings.changed", actor, subject: key, detail, before, after });
}

// ---------- Welcome pack ----------

const WELCOME_AUTO_SEND = "welcome_pack_auto_send";

/**
 * Whether the welcome pack goes out by itself (brief acceptance criterion: "The welcome email and
 * pack arrive within 5 minutes of approval"). Off until the office switches it on, so testing with
 * real records never emails a real applicant by surprise.
 */
export const isWelcomeAutoSend = () => getSetting(WELCOME_AUTO_SEND, false);

export async function setWelcomeAutoSend(on: boolean, actor: string) {
  const before = await isWelcomeAutoSend();
  await setSetting(
    WELCOME_AUTO_SEND,
    on,
    actor,
    on ? "Welcome pack now sends automatically" : "Welcome pack now sent by hand",
    before ? "Automatic" : "By hand",
    on ? "Automatic" : "By hand",
  );
}
