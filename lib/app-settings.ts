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

// New key (Nov 2026): an earlier "off" saved while testing no longer applies, so it starts automatic.
const WELCOME_AUTO_SEND = "welcome_pack_auto_send_v2";

/**
 * Whether the welcome pack goes out by itself (brief acceptance criterion: "The welcome email and
 * pack arrive within 5 minutes of approval"). On unless the office switches it off.
 */
export const isWelcomeAutoSend = () => getSetting(WELCOME_AUTO_SEND, true);

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

// ---------- How each member voted ----------

const VOTE_CHOICES_VISIBLE = "vote_choices_visible";

/**
 * Whether officers can see how each member voted. Off by default: the brief keeps the ballot secret
 * ("only totals are shown"). The Board decides whether to switch it on; every change and every look
 * at individual choices is recorded in the audit log.
 */
export const isVoteChoicesVisible = () => getSetting(VOTE_CHOICES_VISIBLE, false);

export async function setVoteChoicesVisible(on: boolean, actor: string) {
  const before = await isVoteChoicesVisible();
  await setSetting(
    VOTE_CHOICES_VISIBLE,
    on,
    actor,
    on ? "Officers can now see how each member voted" : "Votes are secret again: officers see totals only",
    before ? "Shown" : "Secret",
    on ? "Shown" : "Secret",
  );
}
