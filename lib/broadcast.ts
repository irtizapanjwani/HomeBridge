// Notices to members (Member Platform brief §6: "Broadcast: send a notice to all members, a zone,
// or members in arrears, by WhatsApp, SMS and email").
//
// Email only for now; WhatsApp and SMS join once those services are connected. The officer writes a
// subject and a message, chooses who gets it, sees how many people that is, and sends. The message
// follows the same simple formatting as the email templates (blank line = new paragraph, **bold**,
// "- " lists, {{FirstName}} and {{MemberNo}}), and is wrapped in template Q, which the office can
// edit. Every notice is kept, with who sent it, to whom, and how many went.

import "server-only";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { sendEmailBatch } from "@/lib/email";
import { getTemplate, renderEmail } from "@/lib/email-templates";
import { collections } from "@/lib/members";
import { currentPeriod, missedPayments } from "@/lib/missed-payments";

export type Audience = { kind: "all" } | { kind: "zone"; zone: string } | { kind: "behind" };

export function parseAudience(v: unknown): Audience | null {
  if (!v || typeof v !== "object") return null;
  const a = v as { kind?: unknown; zone?: unknown };
  if (a.kind === "all" || a.kind === "behind") return { kind: a.kind };
  if (a.kind === "zone" && typeof a.zone === "string" && a.zone.trim()) return { kind: "zone", zone: a.zone.trim() };
  return null;
}

const audienceLabel = (a: Audience) => (a.kind === "all" ? "All members" : a.kind === "zone" ? `Chapter: ${a.zone}` : "Members behind on this month's contribution");

type BroadcastDoc = { subject: string; message: string; audience: string; recipients: number; sent: number; failed: number; by: string; at: Date };

async function log() {
  return (await getDb()).collection<BroadcastDoc>("broadcasts");
}

/** Who a notice would go to: admitted members with an email address. */
async function recipients(a: Audience) {
  const { members } = await collections();
  const admitted = await members
    .find({ "membership.memberNo": { $exists: true } }, { projection: { fullName: 1, firstName: 1, email: 1, chapter: 1, membership: 1 } })
    .toArray();
  let list = admitted.filter((m) => m.email?.trim());
  if (a.kind === "zone") list = list.filter((m) => (m.chapter || "") === a.zone);
  if (a.kind === "behind") {
    const behind = new Set((await missedPayments(currentPeriod())).rows.map((r) => r.memberNo));
    list = list.filter((m) => behind.has(m.membership!.memberNo));
  }
  return { list, withoutEmail: admitted.length - admitted.filter((m) => m.email?.trim()).length };
}

/** The chapters members belong to, for the "one chapter" choice. */
export async function chapters() {
  const { members } = await collections();
  const list = (await members.distinct("chapter", { "membership.memberNo": { $exists: true } })) as string[];
  return list.filter(Boolean).sort();
}

export async function previewCount(a: Audience) {
  const { list } = await recipients(a);
  return { count: list.length, label: audienceLabel(a) };
}

export async function sendBroadcast(a: Audience, subject: string, message: string, actor: string) {
  const subj = subject.trim().slice(0, 200);
  const msg = message.replace(/\r\n/g, "\n").trim().slice(0, 10_000);
  if (!subj) return { ok: false as const, error: "Write a subject." };
  if (msg.length < 5) return { ok: false as const, error: "Write the message." };
  const { list } = await recipients(a);
  if (!list.length) return { ok: false as const, error: "Nobody matches that choice." };

  // The office's wrapper (template Q) with the officer's subject and message dropped in.
  const wrapper = await getTemplate("Q");
  const template = { subject: wrapper.subject.replace(/\{\{\s*Subject\s*\}\}/g, subj), body: wrapper.body.replace(/\{\{\s*Message\s*\}\}/g, msg) };
  const emails = list.map((m) => ({
    to: m.email,
    ...renderEmail(template, { FirstName: m.firstName?.trim() || m.fullName.trim().split(/\s+/)[0] || "Member", MemberNo: m.membership!.memberNo }),
  }));
  const result = await sendEmailBatch(emails);

  await (await log()).insertOne({ subject: subj, message: msg, audience: audienceLabel(a), recipients: list.length, sent: result.sent, failed: result.failed, by: actor, at: new Date() });
  await recordAudit({
    action: "notice.sent",
    actor,
    subject: subj,
    detail: `Notice to ${audienceLabel(a)}: ${result.sent} of ${list.length} sent by email${result.failed ? `, ${result.failed} failed (${result.errors[0] ?? ""})` : ""}`,
  });
  return { ok: true as const, recipients: list.length, ...result };
}

const DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export async function recentBroadcasts() {
  return (await (await log()).find({}).sort({ at: -1 }).limit(20).toArray()).map((b) => ({
    id: String((b as { _id?: unknown })._id),
    subject: b.subject,
    audience: b.audience,
    recipients: b.recipients,
    sent: b.sent,
    failed: b.failed,
    by: b.by,
    at: DAY.format(b.at),
  }));
}
